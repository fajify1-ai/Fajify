package com.faji.app

import io.flutter.embedding.android.FlutterActivity
import android.content.pm.ApplicationInfo
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        // The optional public development CA lives only in src/debug/res/raw.
        // Release builds neither expose this channel nor package that resource.
        if ((applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) == 0) return
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "faji.customer/debug-trust")
            .setMethodCallHandler { call, result ->
                if (call.method != "getLocalCa") {
                    result.notImplemented()
                } else {
                    val id = resources.getIdentifier("fajify_root_ca", "raw", packageName)
                    if (id == 0) result.success(null)
                    else resources.openRawResource(id).use { result.success(it.readBytes()) }
                }
            }
    }
}
