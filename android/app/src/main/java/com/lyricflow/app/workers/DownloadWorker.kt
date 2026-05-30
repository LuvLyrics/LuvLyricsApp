package com.lyricflow.app.workers

import android.content.Context
import android.net.Uri
import android.provider.DocumentsContract
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.TimeUnit

class DownloadWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    companion object {
        private val httpClient = OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(120, TimeUnit.SECONDS)
            .followRedirects(true)
            .followSslRedirects(true)
            .build()
    }

    override suspend fun doWork(): Result {
        val id = inputData.getString("id")
            ?: return Result.failure(workDataOf("error" to "Missing id"))
        val audioUrl = inputData.getString("audioUrl")
            ?: return Result.failure(workDataOf("id" to id, "error" to "Missing audioUrl"))
        val coverUrl = inputData.getString("coverUrl")
        val rawSongDir = inputData.getString("songDir")
            ?: return Result.failure(workDataOf("id" to id, "error" to "Missing songDir"))
        val lyrics = inputData.getString("lyrics")
        val safDir = inputData.getString("safDir")

        // expo-file-system returns file:// URIs; File() needs a plain filesystem path
        val songDirPath = Uri.parse(rawSongDir).path ?: rawSongDir
        val songDir = File(songDirPath)

        if (!songDir.exists() && !songDir.mkdirs()) {
            return Result.failure(workDataOf(
                "id" to id,
                "error" to "Could not create song directory: $songDirPath"
            ))
        }

        return try {
            ProgressBus.post(ProgressEvent(id, 0.05f, "running"))

            // 1. Download audio
            val audioFile = File(songDir, "audio.mp3")
            downloadFile(id, audioUrl, audioFile, progressStart = 0.1f, progressRange = 0.7f)

            // 2. Download cover (best-effort)
            var finalCoverUri: String? = null
            if (!coverUrl.isNullOrEmpty()) {
                val coverFile = File(songDir, "cover.jpg")
                try {
                    downloadImage(coverUrl, coverFile)
                    finalCoverUri = "file://${coverFile.absolutePath}"
                } catch (e: Exception) {
                    Log.w("DownloadWorker", "Cover download failed for $coverUrl: ${e.message}")
                }
            }

            // 3. Write lyrics (best-effort)
            if (!lyrics.isNullOrEmpty()) {
                try {
                    File(songDir, "lyrics.lrc").writeText(lyrics)
                } catch (_: Exception) {}
            }

            // 4. SAF export (optional, falls back to internal storage)
            // Internal storage path needs file:// prefix; SAF returns a content:// URI as-is
            var finalAudioUri = "file://${audioFile.absolutePath}"
            if (!safDir.isNullOrEmpty()) {
                ProgressBus.post(ProgressEvent(id, 0.95f, "exporting"))
                try {
                    finalAudioUri = copyToSaf(applicationContext, audioFile, safDir, id, "audio/mpeg")
                } catch (_: Exception) {}
            }

            ProgressBus.post(ProgressEvent(id, 1.0f, "succeeded", audioUri = finalAudioUri, coverUri = finalCoverUri))
            Result.success(workDataOf(
                "id" to id,
                "audioUri" to finalAudioUri,
                "coverUri" to finalCoverUri,
                "status" to "succeeded"
            ))

        } catch (e: Exception) {
            try { songDir.deleteRecursively() } catch (_: Exception) {}
            ProgressBus.post(ProgressEvent(id, 0.0f, "failed", error = e.message ?: "Unknown error"))
            Result.failure(workDataOf(
                "id" to id,
                "status" to "failed",
                "error" to (e.message ?: "Unknown error")
            ))
        }
    }

    private suspend fun downloadFile(
        id: String,
        url: String,
        outputFile: File,
        progressStart: Float,
        progressRange: Float
    ) = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url(url)
            .header("User-Agent", "Mozilla/5.0 (Linux; Android 12; SM-M315F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36")
            .header("Accept", "audio/*, */*")
            .header("Accept-Language", "en-US,en;q=0.9")
            .header("Referer", "https://www.jiosaavn.com/")
            .build()

        httpClient.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                throw Exception("HTTP ${response.code} downloading ${url.take(120)}")
            }
            val body = response.body
                ?: throw Exception("Empty response body from ${url.take(120)}")

            // contentLength is -1 when the CDN uses chunked transfer encoding (common for Saavn).
            // We handle both cases: real percentage when known, time-based incremental when unknown.
            val contentLength = body.contentLength()
            var bytesRead = 0L
            var lastEmitMs = 0L
            var fakeProgress = progressStart

            FileOutputStream(outputFile).use { out ->
                body.byteStream().use { input ->
                    val buffer = ByteArray(16384)
                    var count: Int
                    while (input.read(buffer).also { count = it } != -1) {
                        out.write(buffer, 0, count)
                        bytesRead += count

                        val now = System.currentTimeMillis()
                        if (now - lastEmitMs >= 150) {
                            lastEmitMs = now
                            val progress = if (contentLength > 0) {
                                progressStart + (bytesRead.toFloat() / contentLength) * progressRange
                            } else {
                                // Unknown total size: increment ~2.5% every 150 ms, cap at 90% of range
                                fakeProgress = minOf(fakeProgress + 0.025f, progressStart + progressRange * 0.9f)
                                fakeProgress
                            }
                            ProgressBus.post(ProgressEvent(id, progress, "running"))
                        }
                    }
                }
            }
        }
    }

    /**
     * Lightweight image download without audio-specific headers.
     * Some CDNs reject image requests that carry audio Accept headers or Saavn Referers.
     */
    private suspend fun downloadImage(url: String, outputFile: File) = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url(url)
            .header("User-Agent", "Mozilla/5.0 (Linux; Android 12; SM-M315F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36")
            .header("Accept", "image/avif,image/webp,image/apng,image/*,*/*;q=0.8")
            .build()

        httpClient.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                throw Exception("HTTP ${response.code} downloading image ${url.take(120)}")
            }
            val body = response.body
                ?: throw Exception("Empty image response from ${url.take(120)}")
            FileOutputStream(outputFile).use { out ->
                body.byteStream().use { input ->
                    input.copyTo(out)
                }
            }
        }
    }

    private fun copyToSaf(
        context: Context,
        sourceFile: File,
        safDirUriStr: String,
        filename: String,
        mimeType: String
    ): String {
        val contentResolver = context.contentResolver
        val safDirUri = Uri.parse(safDirUriStr)
        val parentId = DocumentsContract.getTreeDocumentId(safDirUri)
        val parentDocUri = DocumentsContract.buildDocumentUriUsingTree(safDirUri, parentId)
        val fileUri = DocumentsContract.createDocument(contentResolver, parentDocUri, mimeType, filename)
            ?: throw Exception("Failed to create SAF document in $safDirUriStr")

        contentResolver.openInputStream(Uri.fromFile(sourceFile))?.use { input ->
            contentResolver.openOutputStream(fileUri)?.use { output ->
                input.copyTo(output)
            }
        }
        return fileUri.toString()
    }
}
