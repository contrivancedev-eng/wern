package com.wern.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat

class StepCounterService : Service(), SensorEventListener {

    companion object {
        private const val TAG = "StepCounterService"
        private const val CHANNEL_ID = "step_counter_channel"
        private const val NOTIFICATION_ID = 1001

        var isRunning = false
        var currentSteps = 0
        var goalSteps = 10000
        var sessionStartSteps = 0
        var initialStepCount = -1 // First sensor reading

        fun startService(context: Context, initialSteps: Int, goal: Int) {
            currentSteps = initialSteps
            goalSteps = goal
            sessionStartSteps = initialSteps
            initialStepCount = -1 // Reset for new session

            val intent = Intent(context, StepCounterService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stopService(context: Context) {
            val intent = Intent(context, StepCounterService::class.java)
            context.stopService(intent)
        }

        fun updateSteps(steps: Int) {
            currentSteps = steps
        }
    }

    private var sensorManager: SensorManager? = null
    private var stepSensor: Sensor? = null

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Service created")

        createNotificationChannel()

        // Get step counter sensor
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        stepSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)

        if (stepSensor == null) {
            Log.e(TAG, "Step counter sensor not available")
            // Try step detector as fallback
            stepSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "Service started with steps: $currentSteps, goal: $goalSteps")
        isRunning = true

        // Start foreground with notification
        startForeground(NOTIFICATION_ID, createNotification())

        // Register sensor listener
        stepSensor?.let { sensor ->
            sensorManager?.registerListener(
                this,
                sensor,
                SensorManager.SENSOR_DELAY_UI
            )
            Log.d(TAG, "Step sensor registered: ${sensor.name}")
        }

        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "Service destroyed")
        isRunning = false
        sensorManager?.unregisterListener(this)
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onSensorChanged(event: SensorEvent?) {
        event?.let {
            if (it.sensor.type == Sensor.TYPE_STEP_COUNTER) {
                val totalDeviceSteps = it.values[0].toInt()

                // First reading - set baseline
                if (initialStepCount < 0) {
                    initialStepCount = totalDeviceSteps
                    Log.d(TAG, "Initial step count set: $initialStepCount")
                    return
                }

                // Calculate session steps
                val sessionSteps = totalDeviceSteps - initialStepCount
                val newTotalSteps = sessionStartSteps + sessionSteps

                if (newTotalSteps > currentSteps) {
                    currentSteps = newTotalSteps
                    updateNotification()
                    Log.d(TAG, "Steps updated: $currentSteps (session: $sessionSteps)")
                }
            } else if (it.sensor.type == Sensor.TYPE_STEP_DETECTOR) {
                // Step detector fires once per step
                currentSteps++
                updateNotification()
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Step Counter",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows your step count while walking"
                setShowBadge(false)
                enableVibration(false)
                setSound(null, null)
            }

            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        val progress = minOf((currentSteps * 100) / goalSteps, 100)

        // Intent to open app when notification is tapped
        val intent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🚶 ${String.format("%,d", currentSteps)} steps")
            .setContentText("$progress% of ${String.format("%,d", goalSteps)} goal")
            .setSmallIcon(android.R.drawable.ic_menu_directions)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(pendingIntent)
            .build()
    }

    private fun updateNotification() {
        val notificationManager = getSystemService(NotificationManager::class.java)
        notificationManager.notify(NOTIFICATION_ID, createNotification())
    }
}
