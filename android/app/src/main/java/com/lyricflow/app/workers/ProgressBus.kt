package com.lyricflow.app.workers

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

data class ProgressEvent(
    val id: String,
    val progress: Float,
    val status: String,
    val audioUri: String? = null,
    val coverUri: String? = null,
    val error: String? = null
)

object ProgressBus {
    private val _events = MutableSharedFlow<ProgressEvent>(extraBufferCapacity = 128)
    val events: SharedFlow<ProgressEvent> = _events.asSharedFlow()

    fun post(event: ProgressEvent) {
        _events.tryEmit(event)
    }
}
