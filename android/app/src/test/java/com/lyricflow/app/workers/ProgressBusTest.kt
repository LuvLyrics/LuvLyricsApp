package com.lyricflow.app.workers

import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeoutOrNull
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ProgressBusTest {

    @Test
    fun `post emits event to collector`() = runBlocking {
        val event = ProgressEvent(
            id = "song-123",
            progress = 0.5f,
            status = "running",
            audioUri = null,
            coverUri = null,
            error = null
        )

        // Start collecting before posting
        val collected = withTimeoutOrNull(1000L) {
            val job = kotlinx.coroutines.async {
                ProgressBus.events.first()
            }
            kotlinx.coroutines.delay(50) // let collector register
            ProgressBus.post(event)
            job.await()
        }

        assertNotNull("Event should be collected within timeout", collected)
        assertEquals("song-123", collected!!.id)
        assertEquals(0.5f, collected.progress, 0.001f)
        assertEquals("running", collected.status)
    }

    @Test
    fun `multiple events preserve order`() = runBlocking {
        val events = mutableListOf<ProgressEvent>()

        val job = kotlinx.coroutines.async {
            ProgressBus.events.collect { events.add(it) }
        }

        kotlinx.coroutines.delay(50)

        ProgressBus.post(ProgressEvent("1", 0.1f, "running"))
        ProgressBus.post(ProgressEvent("2", 0.5f, "running"))
        ProgressBus.post(ProgressEvent("3", 1.0f, "succeeded"))

        kotlinx.coroutines.delay(100)
        job.cancel()

        assertTrue("Should collect at least 3 events", events.size >= 3)
        val ids = events.map { it.id }
        assertTrue("First event should be '1'", ids.indexOf("1") >= 0)
        assertTrue("Second event should be '2'", ids.indexOf("2") > ids.indexOf("1"))
        assertTrue("Third event should be '3'", ids.indexOf("3") > ids.indexOf("2"))
    }

    @Test
    fun `event with all fields populated`() = runBlocking {
        val event = ProgressEvent(
            id = "complete-song",
            progress = 1.0f,
            status = "succeeded",
            audioUri = "file:///music/complete-song/audio.mp3",
            coverUri = "file:///music/complete-song/cover.jpg",
            error = null
        )

        val collected = withTimeoutOrNull(1000L) {
            val job = kotlinx.coroutines.async {
                ProgressBus.events.first()
            }
            kotlinx.coroutines.delay(50)
            ProgressBus.post(event)
            job.await()
        }

        assertNotNull(collected)
        assertEquals("file:///music/complete-song/audio.mp3", collected!!.audioUri)
        assertEquals("file:///music/complete-song/cover.jpg", collected.coverUri)
        assertEquals("succeeded", collected.status)
    }
}
