package com.lyricflow.app.workers

import android.content.Context
import android.net.Uri
import android.provider.DocumentsContract
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

class DownloadWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val id = inputData.getString("id") ?: return Result.failure()
        val audioUrl = inputData.getString("audioUrl") ?: return Result.failure()
        val coverUrl = inputData.getString("coverUrl")
        val songDirStr = inputData.getString("songDir") ?: return Result.failure()
        val lyrics = inputData.getString("lyrics")
        val safDir = inputData.getString("safDir")

        val songDir = File(songDirStr)
        if (!songDir.exists()) {
            songDir.mkdirs()
        }

        try {
            // 1. Download Audio
            val audioFile = File(songDir, "audio.mp3")
            downloadFile(audioUrl, audioFile, 0.1f, 0.7f)

            // 2. Download Cover if provided
            var finalCoverUri: String? = null
            if (!coverUrl.isNullOrEmpty()) {
                val coverFile = File(songDir, "cover.jpg")
                try {
                    downloadFile(coverUrl, coverFile, 0.8f, 0.1f)
                    finalCoverUri = coverFile.absolutePath
                } catch (_: Exception) {}
            }

            // 3. Write Lyrics if provided
            if (!lyrics.isNullOrEmpty()) {
                val lyricsFile = File(songDir, "lyrics.lrc")
                try {
                    lyricsFile.writeText(lyrics)
                } catch (_: Exception) {}
            }

            // 4. SAF Export if configured
            var finalAudioUri = audioFile.absolutePath
            if (!safDir.isNullOrEmpty()) {
                setProgress(workDataOf("progress" to 0.95f, "status" to "exporting"))
                try {
                    val safUri = copyToSaf(applicationContext, audioFile, safDir, id, "audio/mpeg")
                    finalAudioUri = safUri
                } catch (e: Exception) {
                    // Fallback to internal if SAF fails
                }
            }

            setProgress(workDataOf("progress" to 1.0f, "status" to "succeeded"))
            
            val outputData = workDataOf(
                "id" to id,
                "audioUri" to finalAudioUri,
                "coverUri" to finalCoverUri,
                "status" to "succeeded"
            )
            return Result.success(outputData)

        } catch (e: Exception) {
            // Clean up directory on failure
            try {
                songDir.deleteRecursively()
            } catch (_: Exception) {}
            
            setProgress(workDataOf("progress" to 0.0f, "status" to "failed"))
            return Result.failure(workDataOf("id" to id, "status" to "failed", "error" to e.message))
        }
    }

    private suspend fun downloadFile(urlStr: String, outputFile: File, progressStart: Float, progressRange: Float) {
        withContext(Dispatchers.IO) {
            val url = URL(urlStr)
            val conn = url.openConnection() as HttpURLConnection
            conn.connectTimeout = 15000
            conn.readTimeout = 15000
            conn.connect()

            if (conn.responseCode !in 200..299) {
                throw Exception("Server returned code ${conn.responseCode}")
            }

            val fileLength = conn.contentLength
            conn.inputStream.use { input ->
                FileOutputStream(outputFile).use { output ->
                    val data = ByteArray(8192)
                    var total: Long = 0
                    var count: Int
                    while (input.read(data).also { count = it } != -1) {
                        total += count
                        output.write(data, 0, count)
                        if (fileLength > 0) {
                            val progress = progressStart + (total.toFloat() / fileLength.toFloat()) * progressRange
                            setProgress(workDataOf("progress" to progress, "status" to "running"))
                        }
                    }
                }
            }
        }
    }

    private fun copyToSaf(context: Context, sourceFile: File, safDirUriStr: String, filename: String, mimeType: String): String {
        val contentResolver = context.contentResolver
        val safDirUri = Uri.parse(safDirUriStr)

        val parentId = DocumentsContract.getTreeDocumentId(safDirUri)
        val parentDocUri = DocumentsContract.buildDocumentUriUsingTree(safDirUri, parentId)
        val fileUri = DocumentsContract.createDocument(
            contentResolver,
            parentDocUri,
            mimeType,
            filename
        ) ?: throw Exception("Failed to create SAF document")

        contentResolver.openInputStream(Uri.fromFile(sourceFile)).use { input ->
            contentResolver.openOutputStream(fileUri).use { output ->
                if (input != null && output != null) {
                    input.copyTo(output)
                }
            }
        }
        return fileUri.toString()
    }
}
