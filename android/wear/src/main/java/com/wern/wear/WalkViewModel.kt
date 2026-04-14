package com.wern.wear

import android.app.Application
import android.content.Context
import android.content.SharedPreferences
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.net.Uri
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import com.google.android.gms.wearable.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.util.Timer
import java.util.TimerTask

data class WalkState(
    val isWalking: Boolean = false,
    val stepCount: Int = 0,
    val dailyGoal: Int = 10000,
    val activeCause: Int = 1,
    val elapsedSeconds: Int = 0,
    val isPhoneConnected: Boolean = false,
    val litties: Int = 0
) {
    val progress: Float get() = if (dailyGoal > 0) (stepCount.toFloat() / dailyGoal).coerceAtMost(1f) else 0f
    val km: Float get() = stepCount * 0.00075f
    val kcal: Int get() = (stepCount * 0.05).toInt()
    val littiesCalc: Int get() = if (litties > 0) litties else stepCount / 100

    val causeName: String get() = when (activeCause) {
        1 -> "Forest"; 2 -> "Water"; 3 -> "Food"; 4 -> "Women"; 5 -> "Kids"; else -> "Forest"
    }
    val causeColor: Long get() = when (activeCause) {
        1 -> 0xFF22C55E; 2 -> 0xFF0E7490; 3 -> 0xFFF59E0B; 4 -> 0xFFEC4899; 5 -> 0xFF003B4C; else -> 0xFF22C55E
    }
    val elapsedFormatted: String get() {
        val h = elapsedSeconds / 3600; val m = (elapsedSeconds % 3600) / 60; val s = elapsedSeconds % 60
        return if (h > 0) String.format("%d:%02d:%02d", h, m, s) else String.format("%02d:%02d", m, s)
    }
}

class WalkViewModel(application: Application) : AndroidViewModel(application) {
    companion object { const val TAG = "WERNWear" }

    private val _state = MutableStateFlow(WalkState())
    val state: StateFlow<WalkState> = _state.asStateFlow()

    private val sensorManager = application.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private var stepSensor: Sensor? = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
    private var initialStepCount: Int? = null
    private var sessionStartSteps: Int = 0
    private var timer: Timer? = null
    private val prefs: SharedPreferences = application.getSharedPreferences("wern_wear", Context.MODE_PRIVATE)
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val app = application

    // Listen for phone data changes via SharedPreferences
    private val prefsListener = SharedPreferences.OnSharedPreferenceChangeListener { sp, key ->
        when (key) {
            "dailyGoal" -> _state.value = _state.value.copy(dailyGoal = sp.getInt("dailyGoal", 10000))
            "activeCause" -> _state.value = _state.value.copy(activeCause = sp.getInt("activeCause", 1))
            "isPhoneConnected" -> _state.value = _state.value.copy(isPhoneConnected = sp.getBoolean("isPhoneConnected", false))
            "litties" -> _state.value = _state.value.copy(litties = sp.getInt("litties", 0))
            "isWalking" -> {
                val phoneWalking = sp.getBoolean("isWalking", false)
                if (phoneWalking && !_state.value.isWalking) startWalking()
                else if (!phoneWalking && _state.value.isWalking) stopWalking()
            }
        }
    }

    private val stepListener = object : SensorEventListener {
        override fun onSensorChanged(event: SensorEvent) {
            val totalDeviceSteps = event.values[0].toInt()
            if (initialStepCount == null) initialStepCount = totalDeviceSteps
            val newSteps = totalDeviceSteps - (initialStepCount ?: totalDeviceSteps)
            val totalSteps = sessionStartSteps + newSteps
            _state.update { it.copy(stepCount = totalSteps) }
            prefs.edit().putInt("stepCount", totalSteps).apply()
        }
        override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
    }

    init {
        loadState()
        prefs.registerOnSharedPreferenceChangeListener(prefsListener)
        checkPhoneConnection()
    }

    fun startWalking() {
        if (_state.value.isWalking) return
        sessionStartSteps = _state.value.stepCount
        initialStepCount = null
        _state.value = _state.value.copy(isWalking = true, elapsedSeconds = 0)

        stepSensor?.let {
            sensorManager.registerListener(stepListener, it, SensorManager.SENSOR_DELAY_UI)
        }

        timer = Timer().apply {
            scheduleAtFixedRate(object : TimerTask() {
                override fun run() {
                    _state.update { it.copy(elapsedSeconds = it.elapsedSeconds + 1) }
                    if (_state.value.elapsedSeconds % 5 == 0) syncToPhone()
                }
            }, 1000, 1000)
        }
        saveState()
        syncToPhone()
    }

    fun stopWalking() {
        if (!_state.value.isWalking) return
        _state.value = _state.value.copy(isWalking = false)
        sensorManager.unregisterListener(stepListener)
        timer?.cancel()
        timer = null
        saveState()
        syncToPhone()
    }

    fun pairWithCode(code: String) {
        scope.launch {
            try {
                val nodes = com.google.android.gms.tasks.Tasks.await(
                    Wearable.getNodeClient(app).connectedNodes
                )
                if (nodes.isNotEmpty()) {
                    com.google.android.gms.tasks.Tasks.await(
                        Wearable.getMessageClient(app).sendMessage(
                            nodes.first().id, "/wern/pair", code.toByteArray()
                        )
                    )
                    Log.d(TAG, "Pairing code sent to phone: $code")
                    // Wait for phone to validate and send confirmation back
                    // WearDataService.onMessageReceived will set isPhoneConnected=true
                    // Poll SharedPreferences for up to 10 seconds
                    for (i in 1..20) {
                        delay(500)
                        if (prefs.getBoolean("isPhoneConnected", false)) {
                            _state.update { it.copy(isPhoneConnected = true) }
                            Log.d(TAG, "Phone confirmed pairing")
                            return@launch
                        }
                    }
                    // Timeout - phone didn't confirm
                    Log.d(TAG, "Pairing timeout - no confirmation from phone")
                } else {
                    Log.d(TAG, "No phone found for pairing")
                    delay(1500)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Pairing failed: ${e.message}")
            }
        }
    }

    fun selectCause(id: Int) {
        _state.value = _state.value.copy(activeCause = id)
        saveState()
        syncToPhone()
    }

    private fun syncToPhone() {
        scope.launch {
            try {
                val putDataReq = PutDataMapRequest.create("/wern/sync").apply {
                    dataMap.putInt("stepCount", _state.value.stepCount)
                    dataMap.putBoolean("isWalking", _state.value.isWalking)
                    dataMap.putInt("activeCause", _state.value.activeCause)
                    dataMap.putString("source", "watch")
                    dataMap.putLong("timestamp", System.currentTimeMillis())
                }.asPutDataRequest().setUrgent()

                com.google.android.gms.tasks.Tasks.await(Wearable.getDataClient(app).putDataItem(putDataReq))
            } catch (e: Exception) {
                Log.e(TAG, "Sync to phone failed: ${e.message}")
            }
        }
    }

    private fun checkPhoneConnection() {
        scope.launch {
            try {
                val nodes = com.google.android.gms.tasks.Tasks.await(
                    Wearable.getNodeClient(app).connectedNodes
                )
                val connected = nodes.isNotEmpty()
                _state.value = _state.value.copy(isPhoneConnected = connected)
                prefs.edit().putBoolean("isPhoneConnected", connected).apply()
            } catch (e: Exception) {
                // Not connected
            }
        }
    }

    private fun saveState() {
        prefs.edit()
            .putInt("activeCause", _state.value.activeCause)
            .putInt("dailyGoal", _state.value.dailyGoal)
            .putInt("stepCount", _state.value.stepCount)
            .putBoolean("isWalking", _state.value.isWalking)
            .apply()
    }

    private fun loadState() {
        val cause = prefs.getInt("activeCause", 1)
        val goal = prefs.getInt("dailyGoal", 10000)
        val steps = prefs.getInt("stepCount", 0)
        val connected = prefs.getBoolean("isPhoneConnected", false)
        val litties = prefs.getInt("litties", 0)
        _state.value = _state.value.copy(
            activeCause = cause, dailyGoal = goal, stepCount = steps,
            isPhoneConnected = connected, litties = litties
        )
    }

    override fun onCleared() {
        super.onCleared()
        sensorManager.unregisterListener(stepListener)
        timer?.cancel()
        prefs.unregisterOnSharedPreferenceChangeListener(prefsListener)
        scope.cancel()
    }
}
