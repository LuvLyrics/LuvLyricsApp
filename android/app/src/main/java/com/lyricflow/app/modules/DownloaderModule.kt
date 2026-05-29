package com.lyricflow.app.modules

import android.content.Context
import androidx.work.*
import com.lyricflow.app.workers.DownloadWorker
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.collect

class DownloaderModule : Module() {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    override fun definition() = ModuleDefinition {
        Name("Downloader")

        Events("onDownloadProgress")

        AsyncFunction("enqueue") { id: String, audioUrl: String, coverUrl: String?, songDir: String, lyrics: String?, safDir: String? ->
            val context = appContext.reactContext ?: throw Exception("React context not available")
            val workManager = WorkManager.getInstance(context)

            val inputData = workDataOf(
                "id" to id,
                "audioUrl" to audioUrl,
                "coverUrl" to coverUrl,
                "songDir" to songDir,
                "lyrics" to lyrics,
                "safDir" to safDir
            )

            // Keep only 2 concurrent downloads active (configured by WorkManager queue, but tags help identify)
            val workRequest = OneTimeWorkRequestBuilder<DownloadWorker>()
                .setInputData(inputData)
                .addTag(id)
                .build()

            workManager.enqueueUniqueWork(id, ExistingWorkPolicy.REPLACE, workRequest)

            // Start observing the specific worker status flow
            scope.launch {
                workManager.getWorkInfoByIdFlow(workRequest.id).collect { workInfo ->
                    if (workInfo != null) {
                        val progress = workInfo.progress.getFloat("progress", 0.0f)
                        val status = workInfo.progress.getString("status") ?: when (workInfo.state) {
                            WorkInfo.State.ENQUEUED -> "enqueued"
                            WorkInfo.State.RUNNING -> "running"
                            WorkInfo.State.SUCCEEDED -> "succeeded"
                            WorkInfo.State.FAILED -> "failed"
                            WorkInfo.State.CANCELLED -> "cancelled"
                            else -> "unknown"
                        }

                        val audioUri = if (workInfo.state == WorkInfo.State.SUCCEEDED) {
                            workInfo.outputData.getString("audioUri")
                        } else null

                        val coverUri = if (workInfo.state == WorkInfo.State.SUCCEEDED) {
                            workInfo.outputData.getString("coverUri")
                        } else null

                        sendEvent("onDownloadProgress", mapOf(
                            "id" to id,
                            "progress" to progress,
                            "status" to status,
                            "audioUri" to audioUri,
                            "coverUri" to coverUri
                        ))

                        if (workInfo.state.isFinished) {
                            this.cancel() // Stop collecting flow once the worker completes
                        }
                    }
                }
            }

            workRequest.id.toString()
        }

        Function("cancel") { id: String ->
            val context = appContext.reactContext ?: return@Function
            WorkManager.getInstance(context).cancelUniqueWork(id)
        }
    }
}
