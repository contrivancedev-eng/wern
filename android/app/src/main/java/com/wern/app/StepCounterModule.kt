package com.wern.app

import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class StepCounterModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "StepCounterModule"
    }

    override fun getName(): String = "StepCounterModule"

    @ReactMethod
    fun startService(initialSteps: Int, goalSteps: Int, promise: Promise) {
        try {
            Log.d(TAG, "Starting step counter service with steps: $initialSteps, goal: $goalSteps")
            StepCounterService.startService(reactApplicationContext, initialSteps, goalSteps)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error starting service", e)
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopService(promise: Promise) {
        try {
            Log.d(TAG, "Stopping step counter service")
            StepCounterService.stopService(reactApplicationContext)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping service", e)
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun updateSteps(steps: Int, promise: Promise) {
        try {
            StepCounterService.updateSteps(steps)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun updateGoal(goalSteps: Int, promise: Promise) {
        try {
            StepCounterService.goalSteps = goalSteps
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun getCurrentSteps(promise: Promise) {
        try {
            promise.resolve(StepCounterService.currentSteps)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun isRunning(promise: Promise) {
        try {
            promise.resolve(StepCounterService.isRunning)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}
