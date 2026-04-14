package com.wern.wear

import android.content.Context
import android.util.Log
import com.google.android.gms.wearable.*

/**
 * Listens for data from the phone app and updates local SharedPreferences.
 * The WalkViewModel reads from SharedPreferences on next launch.
 *
 * Data paths:
 * /wern/sync  - Bidirectional state (steps, goal, cause, walking, litties)
 * /wern/pair  - Pairing code validation
 * /wern/command - Start/stop walk commands
 */
class WearDataService : WearableListenerService() {

    companion object {
        const val TAG = "WERNWearData"
        const val SYNC_PATH = "/wern/sync"
        const val PAIR_PATH = "/wern/pair"
        const val COMMAND_PATH = "/wern/command"
    }

    override fun onDataChanged(dataEvents: DataEventBuffer) {
        val prefs = getSharedPreferences("wern_wear", Context.MODE_PRIVATE)

        dataEvents.forEach { event ->
            if (event.type == DataEvent.TYPE_CHANGED) {
                val path = event.dataItem.uri.path ?: return@forEach
                val dataMap = DataMapItem.fromDataItem(event.dataItem).dataMap

                when (path) {
                    SYNC_PATH -> {
                        Log.d(TAG, "Received sync from phone")
                        prefs.edit().apply {
                            if (dataMap.containsKey("dailyGoal")) {
                                putInt("dailyGoal", dataMap.getInt("dailyGoal"))
                            }
                            if (dataMap.containsKey("activeCause")) {
                                putInt("activeCause", dataMap.getInt("activeCause"))
                            }
                            if (dataMap.containsKey("stepCount")) {
                                // Take the higher step count (don't lose local steps)
                                val phoneSteps = dataMap.getInt("stepCount")
                                val localSteps = prefs.getInt("stepCount", 0)
                                putInt("stepCount", maxOf(phoneSteps, localSteps))
                            }
                            if (dataMap.containsKey("isWalking")) {
                                putBoolean("isWalking", dataMap.getBoolean("isWalking"))
                            }
                            if (dataMap.containsKey("litties")) {
                                putInt("litties", dataMap.getInt("litties"))
                            }
                            if (dataMap.containsKey("paired") && dataMap.getBoolean("paired")) {
                                putBoolean("isPhoneConnected", true)
                            }
                            if (dataMap.containsKey("disconnect") && dataMap.getBoolean("disconnect")) {
                                putBoolean("isPhoneConnected", false)
                            }
                            apply()
                        }
                    }
                }
            }
        }
    }

    override fun onMessageReceived(messageEvent: MessageEvent) {
        val prefs = getSharedPreferences("wern_wear", Context.MODE_PRIVATE)

        when (messageEvent.path) {
            PAIR_PATH -> {
                // Phone confirmed pairing
                val code = String(messageEvent.data)
                Log.d(TAG, "Pairing confirmed with code: $code")
                prefs.edit().putBoolean("isPhoneConnected", true).apply()
            }
            COMMAND_PATH -> {
                val command = String(messageEvent.data)
                Log.d(TAG, "Received command: $command")
                when (command) {
                    "start" -> prefs.edit().putBoolean("isWalking", true).apply()
                    "stop" -> prefs.edit().putBoolean("isWalking", false).apply()
                }
            }
        }
    }

    override fun onCapabilityChanged(capabilityInfo: CapabilityInfo) {
        val prefs = getSharedPreferences("wern_wear", Context.MODE_PRIVATE)
        val phoneConnected = capabilityInfo.nodes.any { it.isNearby }
        prefs.edit().putBoolean("isPhoneConnected", phoneConnected).apply()
        Log.d(TAG, "Phone capability changed: connected=$phoneConnected")
    }
}
