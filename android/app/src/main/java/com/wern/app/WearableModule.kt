package com.wern.app

import android.net.Uri
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.wearable.*
import com.google.android.gms.tasks.Tasks
import kotlinx.coroutines.*

class WearableModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext),
    DataClient.OnDataChangedListener,
    MessageClient.OnMessageReceivedListener {

    companion object {
        const val NAME = "WERNWearableModule"
        const val TAG = "WERNWearable"
        const val SYNC_PATH = "/wern/sync"
        const val PAIR_PATH = "/wern/pair"
        const val COMMAND_PATH = "/wern/command"
    }

    private var dataClient: DataClient? = null
    private var messageClient: MessageClient? = null
    private var nodeClient: NodeClient? = null
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    override fun getName() = NAME

    override fun initialize() {
        super.initialize()
        try {
            dataClient = Wearable.getDataClient(reactContext).also {
                it.addListener(this)
            }
            messageClient = Wearable.getMessageClient(reactContext).also {
                it.addListener(this)
            }
            nodeClient = Wearable.getNodeClient(reactContext)
            Log.d(TAG, "Wearable clients initialized")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize wearable clients: ${e.message}")
        }
    }

    override fun invalidate() {
        dataClient?.removeListener(this)
        messageClient?.removeListener(this)
        scope.cancel()
        super.invalidate()
    }

    // ── React Native Methods ──

    @ReactMethod
    fun scanForDevices(promise: Promise) {
        scope.launch {
            try {
                val nodeClient = Wearable.getNodeClient(reactContext)
                val nodes = Tasks.await(nodeClient.connectedNodes)
                val devices = Arguments.createArray()
                nodes.forEach { node ->
                    val device = Arguments.createMap().apply {
                        putString("id", node.id)
                        putString("name", node.displayName)
                        putString("type", "wearos")
                        putBoolean("isNearby", node.isNearby)
                    }
                    devices.pushMap(device)
                }
                promise.resolve(devices)
            } catch (e: Exception) {
                Log.e(TAG, "Scan failed: ${e.message}")
                promise.resolve(Arguments.createArray()) // Return empty, don't reject
            }
        }
    }

    @ReactMethod
    fun syncToWatch(data: ReadableMap) {
        scope.launch {
            try {
                val putDataReq = PutDataMapRequest.create(SYNC_PATH).apply {
                    dataMap.putInt("stepCount", if (data.hasKey("stepCount")) data.getInt("stepCount") else 0)
                    dataMap.putInt("dailyGoal", if (data.hasKey("dailyGoal")) data.getInt("dailyGoal") else 10000)
                    dataMap.putInt("activeCause", if (data.hasKey("activeCause")) data.getInt("activeCause") else 1)
                    dataMap.putBoolean("isWalking", if (data.hasKey("isWalking")) data.getBoolean("isWalking") else false)
                    dataMap.putInt("litties", if (data.hasKey("litties")) data.getInt("litties") else 0)
                    dataMap.putBoolean("disconnect", if (data.hasKey("disconnect")) data.getBoolean("disconnect") else false)
                    dataMap.putLong("timestamp", System.currentTimeMillis())
                }.asPutDataRequest().setUrgent()

                Tasks.await(Wearable.getDataClient(reactContext).putDataItem(putDataReq))
                Log.d(TAG, "Data synced to watch")
            } catch (e: Exception) {
                Log.e(TAG, "Sync to watch failed: ${e.message}")
            }
        }
    }

    @ReactMethod
    fun isWatchConnected(promise: Promise) {
        scope.launch {
            try {
                val nodes = Tasks.await(Wearable.getNodeClient(reactContext).connectedNodes)
                promise.resolve(nodes.isNotEmpty())
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }
    }

    @ReactMethod
    fun getWatchSteps(promise: Promise) {
        scope.launch {
            try {
                val dataItems = Tasks.await(Wearable.getDataClient(reactContext).getDataItems(
                    Uri.parse("wear://*$SYNC_PATH")
                ))
                if (dataItems.count > 0) {
                    val dataMap = DataMapItem.fromDataItem(dataItems[0]).dataMap
                    val result = Arguments.createMap().apply {
                        putInt("stepCount", dataMap.getInt("stepCount", 0))
                        putInt("heartRate", dataMap.getInt("heartRate", 0))
                    }
                    promise.resolve(result)
                } else {
                    promise.resolve(null)
                }
                dataItems.release()
            } catch (e: Exception) {
                promise.resolve(null)
            }
        }
    }

    @ReactMethod
    fun validatePairingCode(code: String, promise: Promise) {
        scope.launch {
            try {
                val nodes = Tasks.await(Wearable.getNodeClient(reactContext).connectedNodes)
                if (nodes.isNotEmpty()) {
                    // Send pairing confirmation to the watch
                    val node = nodes.first()
                    Tasks.await(
                        Wearable.getMessageClient(reactContext).sendMessage(
                            node.id, PAIR_PATH, code.toByteArray()
                        )
                    )
                    promise.resolve(true)
                } else {
                    promise.resolve(false)
                }
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }
    }

    @ReactMethod
    fun connectDevice(deviceId: String, promise: Promise) {
        // WearOS auto-connects via Data Layer, just verify the node exists
        scope.launch {
            try {
                val nodes = Tasks.await(Wearable.getNodeClient(reactContext).connectedNodes)
                val found = nodes.any { it.id == deviceId }
                if (found) {
                    // Send initial sync to the watch
                    val putDataReq = PutDataMapRequest.create(SYNC_PATH).apply {
                        dataMap.putBoolean("paired", true)
                        dataMap.putLong("timestamp", System.currentTimeMillis())
                    }.asPutDataRequest().setUrgent()
                    Tasks.await(Wearable.getDataClient(reactContext).putDataItem(putDataReq))
                }
                promise.resolve(found)
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }
    }

    @ReactMethod
    fun disconnectDevice(promise: Promise) {
        scope.launch {
            try {
                // Clear synced data
                val uri = Uri.parse("wear://*$SYNC_PATH")
                Tasks.await(Wearable.getDataClient(reactContext).deleteDataItems(uri))
                promise.resolve(true)
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }
    }

    // Required for NativeEventEmitter
    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}

    // ── Watch → Phone Data Listener ──

    override fun onDataChanged(dataEvents: DataEventBuffer) {
        dataEvents.forEach { event ->
            if (event.type == DataEvent.TYPE_CHANGED && event.dataItem.uri.path == SYNC_PATH) {
                val dataMap = DataMapItem.fromDataItem(event.dataItem).dataMap

                val params = Arguments.createMap().apply {
                    putInt("stepCount", dataMap.getInt("stepCount", 0))
                    putInt("heartRate", dataMap.getInt("heartRate", 0))
                    putBoolean("isWalking", dataMap.getBoolean("isWalking", false))
                    putInt("activeCause", dataMap.getInt("activeCause", 1))
                    putString("source", "watch")
                }

                sendEvent("onWatchData", params)
                Log.d(TAG, "Received data from watch: steps=${dataMap.getInt("stepCount", 0)}")
            }
        }
    }

    override fun onMessageReceived(messageEvent: MessageEvent) {
        when (messageEvent.path) {
            PAIR_PATH -> {
                val code = String(messageEvent.data)
                val params = Arguments.createMap().apply {
                    putString("pairingCode", code)
                    putString("source", "watch")
                }
                sendEvent("onWatchData", params)
            }
            COMMAND_PATH -> {
                val command = String(messageEvent.data)
                val params = Arguments.createMap().apply {
                    putString("command", command) // "start" or "stop"
                    putString("source", "watch")
                }
                sendEvent("onWatchData", params)
            }
        }
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send event: ${e.message}")
        }
    }
}
