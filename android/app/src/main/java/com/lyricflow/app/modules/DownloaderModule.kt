package com.lyricflow.app.modules

import androidx.work.*
import com.lyricflow.app.workers.DownloadWorker
import com.lyricflow.app.workers.ProgressBus
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.filter

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

            val workRequest = OneTimeWorkRequestBuilder<DownloadWorker>()
                .setInputData(inputData)
                .addTag(id)
                .build()

            workManager.enqueueUniqueWork(id, ExistingWorkPolicy.REPLACE, workRequest)

            // ProgressBus delivers real-time updates directly from the worker thread,
            // bypassing WorkManager's database-backed flow which batches/coalesces updates.
            scope.launch {
                ProgressBus.events
                    .filter { it.id == id }
                    .collect { event ->
                        sendEvent("onDownloadProgress", mapOf(
                            "id" to event.id,
                            "progress" to event.progress,
                            "status" to event.status,
                            "audioUri" to event.audioUri,
                            "coverUri" to event.coverUri,
                            "error" to event.error
                        ))
                        if (event.status == "succeeded" || event.status == "failed" || event.status == "cancelled") {
                            this.cancel()
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
