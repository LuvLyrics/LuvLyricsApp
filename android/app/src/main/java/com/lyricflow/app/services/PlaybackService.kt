package com.lyricflow.app.services

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import com.lyricflow.app.modules.PlayerBridge

private const val TAG = "LyrFlow"
private const val CHANNEL_ID = "lyricflow_playback"
private const val NOTIFICATION_ID = 1

class PlaybackService : android.app.Service() {
    private lateinit var exoPlayer: ExoPlayer

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "PlaybackService.onCreate() start")

        // Create notification channel (required Android 8+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Music Playback",
                NotificationManager.IMPORTANCE_LOW
            )
            getSystemService(NotificationManager::class.java)
                .createNotificationChannel(channel)
        }

        // Call startForeground() immediately so Android doesn't kill us
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("LuvLyrics")
            .setContentText("Playing music")
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setSilent(true)
            .build()
        startForeground(NOTIFICATION_ID, notification)

        exoPlayer = ExoPlayer.Builder(this).build()
        exoPlayer.repeatMode = Player.REPEAT_MODE_OFF
        PlayerBridge.setPlayer(exoPlayer, this)
        Log.d(TAG, "PlaybackService.onCreate() done — player registered")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        Log.d(TAG, "PlaybackService.onDestroy()")
        PlayerBridge.clearPlayer()
        exoPlayer.release()
        super.onDestroy()
    }
}
