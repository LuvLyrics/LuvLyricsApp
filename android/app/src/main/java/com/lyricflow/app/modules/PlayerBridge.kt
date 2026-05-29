package com.lyricflow.app.modules

import android.content.Context
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import java.lang.ref.WeakReference

object PlayerBridge {
    private var activePlayerRef = WeakReference<ExoPlayer>(null)
    private var activeServiceRef = WeakReference<Context>(null)

    var onStatusUpdate: ((position: Double, duration: Double, isPlaying: Boolean, isBuffering: Boolean, didJustFinish: Boolean) -> Unit)? = null
    var onRemoteCommand: ((command: String) -> Unit)? = null

    private val playerListener = object : Player.Listener {
        override fun onPlaybackStateChanged(playbackState: Int) {
            emitStatus(playbackState == Player.STATE_ENDED)
        }

        override fun onIsPlayingChanged(isPlaying: Boolean) {
            emitStatus()
        }
    }

    fun setPlayer(player: ExoPlayer, context: Context) {
        activePlayerRef = WeakReference(player)
        activeServiceRef = WeakReference(context)
        player.addListener(playerListener)
        startProgressPoller()
    }

    fun clearPlayer() {
        activePlayerRef.get()?.removeListener(playerListener)
        activePlayerRef.clear()
        activeServiceRef.clear()
    }

    fun getPlayer(): ExoPlayer? = activePlayerRef.get()

    fun emitStatus(didJustFinish: Boolean = false) {
        val player = activePlayerRef.get() ?: return
        val isPlaying = player.isPlaying
        val isBuffering = player.playbackState == Player.STATE_BUFFERING
        val finished = didJustFinish || player.playbackState == Player.STATE_ENDED

        val position = player.currentPosition.toDouble() / 1000.0
        val duration = player.duration.toDouble() / 1000.0

        onStatusUpdate?.invoke(
            position,
            if (duration < 0) 0.0 else duration,
            isPlaying,
            isBuffering,
            finished
        )
    }

    private var pollerRunning = false
    private fun startProgressPoller() {
        if (pollerRunning) return
        pollerRunning = true
        Thread {
            while (pollerRunning) {
                val player = activePlayerRef.get()
                if (player == null) {
                    pollerRunning = false
                    break
                }
                if (player.isPlaying) {
                    emitStatus()
                }
                try {
                    Thread.sleep(250)
                } catch (e: InterruptedException) {
                    break
                }
            }
        }.apply { isDaemon = true; start() }
    }
}
