package com.localbox.app

import android.app.Activity
import android.app.DownloadManager
import android.content.ContentValues
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.Executors

/**
 * LocalBox Android 客户端（WebView 套 APK 内静态资源）
 * - 通过 https 伪域名加载打包进 assets 的 uni-app H5 产物（ES Module / WebCrypto 安全上下文可用）
 * - window.AndroidBridge.saveBase64：把前端处理结果保存到系统下载目录（Download/LocalBox）
 * - onShowFileChooser：接管页面 <input type="file">，调起系统文件选择器
 * - window.AndroidBridge.startUpdate：应用内自升级（详见 Updater.kt）
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    /** 文件写盘线程池（与 UI 线程解耦，升级下载复用） */
    private val ioPool = Executors.newSingleThreadExecutor()

    /** 应用内自升级：静默下载 + PackageInstaller 系统确认安装 */
    private val updater by lazy {
        Updater(this, ioPool) { event, data -> emitUpdateEvent(event, data) }
    }

    /** 文件选择回调（供 <input type="file"> 导入文件使用） */
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private val fileChooserRequestCode = 1001

    /** 已保存文件（可读 Uri + 展示路径） */
    private data class SavedFile(val uri: String, val displayPath: String)

    /** 注入给页面的原生桥接对象（window.AndroidBridge） */
    inner class NativeBridge {
        @JavascriptInterface
        fun saveBase64(taskJson: String) {
            val task = JSONObject(taskJson)
            val filename = sanitize(task.optString("filename", "localbox.bin"))
            val base64 = task.optString("base64")
            ioPool.execute {
                var tmp: File? = null
                try {
                    tmp = File(cacheDir, "save_${System.nanoTime()}.bin")
                    FileOutputStream(tmp).use { it.write(Base64.decode(base64, Base64.DEFAULT)) }
                    val saved = publishToDownloads(filename, tmp)
                    evaluateJs(
                        "window.__localboxSaveDone && window.__localboxSaveDone(" +
                            "'${escapeJs(filename)}','${escapeJs(saved.displayPath)}')"
                    )
                } catch (e: Exception) {
                    evaluateJs(
                        "window.__localboxSaveError && window.__localboxSaveError(" +
                            "'${escapeJs(filename)}','${escapeJs(e.message ?: "保存失败")}')"
                    )
                } finally {
                    tmp?.delete()
                }
            }
        }

        /** 打开已保存文件（系统应用查看） */
        @JavascriptInterface
        fun openFile(uri: String) {
            if (uri.isEmpty()) return
            try {
                val parsed = Uri.parse(uri)
                val mime = if (uri.startsWith("content://")) {
                    contentResolver.getType(parsed) ?: "application/octet-stream"
                } else {
                    guessMime(uri)
                }
                startActivity(
                    Intent(Intent.ACTION_VIEW).apply {
                        setDataAndType(parsed, mime)
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                )
            } catch (e: Exception) {
                evaluateJs(
                    "window.__localboxSaveError && window.__localboxSaveError(" +
                        "'','${escapeJs("无法打开文件：" + (e.message ?: "没有可用的应用"))}')"
                )
            }
        }

        /** 打开系统「下载」界面 */
        @JavascriptInterface
        fun openDownloadDir() {
            try {
                startActivity(
                    Intent(DownloadManager.ACTION_VIEW_DOWNLOADS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                )
            } catch (e: Exception) {
                evaluateJs(
                    "window.__localboxSaveError && window.__localboxSaveError(" +
                        "'','${escapeJs("无法打开下载目录：" + (e.message ?: "请手动打开文件管理器"))}')"
                )
            }
        }

        /** 当前版本号（versionName），升级检查用于版本对比 */
        @JavascriptInterface
        fun getVersion(): String = try {
            this@MainActivity.packageManager.getPackageInfo(this@MainActivity.packageName, 0)
                .versionName ?: "0.0.0"
        } catch (e: Exception) {
            Log.w("LocalBox", "getVersion failed", e)
            "0.0.0"
        }

        /** 是否已获「安装未知应用」授权（Android 8+ 安装 APK 的前置条件） */
        @JavascriptInterface
        fun canInstall(): Boolean = updater.canInstall()

        /** 发起应用内升级：原生静默下载并唤起系统安装确认，结果经 __localboxUpdateEvent 回调 */
        @JavascriptInterface
        fun startUpdate(url: String?, sha256: String?) {
            updater.startUpdate(url ?: "", sha256 ?: "")
        }
    }

    /**
     * 保存到系统下载目录：Q+ 走 MediaStore（无需权限），API 28 落到应用外部下载目录
     * 并由 FileProvider 暴露可读 Uri。
     */
    private fun publishToDownloads(name: String, tmp: File): SavedFile {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val values = ContentValues().apply {
                put(MediaStore.MediaColumns.DISPLAY_NAME, name)
                put(MediaStore.MediaColumns.MIME_TYPE, guessMime(name))
                put(MediaStore.MediaColumns.RELATIVE_PATH, "${Environment.DIRECTORY_DOWNLOADS}/LocalBox")
                put(MediaStore.MediaColumns.IS_PENDING, 1)
            }
            val resolver = contentResolver
            val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                ?: throw RuntimeException("无法创建下载文件")
            resolver.openOutputStream(uri)?.use { out -> tmp.inputStream().use { it.copyTo(out) } }
                ?: throw RuntimeException("无法写入下载文件")
            values.clear()
            values.put(MediaStore.MediaColumns.IS_PENDING, 0)
            resolver.update(uri, values, null, null)
            return SavedFile(uri.toString(), "${Environment.DIRECTORY_DOWNLOADS}/LocalBox/$name")
        }
        val baseDir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: filesDir
        val targetDir = File(baseDir, "LocalBox").apply { mkdirs() }
        val target = File(targetDir, name)
        tmp.inputStream().use { input -> FileOutputStream(target).use { input.copyTo(it) } }
        val shareUri = FileProvider.getUriForFile(this, "$packageName.fileprovider", target)
        return SavedFile(shareUri.toString(), target.absolutePath)
    }

    private fun sanitize(name: String): String {
        val cleaned = name.replace(Regex("[\\\\/:*?\"<>|]"), "_").trim()
        return if (cleaned.isEmpty()) "localbox.bin" else cleaned
    }

    private fun guessMime(name: String): String {
        val lower = name.lowercase()
        return when {
            lower.endsWith(".zip") -> "application/zip"
            lower.endsWith(".pdf") -> "application/pdf"
            lower.endsWith(".png") -> "image/png"
            lower.endsWith(".jpg") || lower.endsWith(".jpeg") -> "image/jpeg"
            lower.endsWith(".gif") -> "image/gif"
            lower.endsWith(".webp") -> "image/webp"
            lower.endsWith(".bmp") -> "image/bmp"
            lower.endsWith(".svg") -> "image/svg+xml"
            lower.endsWith(".txt") || lower.endsWith(".log") || lower.endsWith(".md") -> "text/plain"
            lower.endsWith(".json") -> "application/json"
            lower.endsWith(".csv") -> "text/csv"
            lower.endsWith(".html") || lower.endsWith(".htm") -> "text/html"
            lower.endsWith(".xml") -> "text/xml"
            lower.endsWith(".mp3") -> "audio/mpeg"
            lower.endsWith(".wav") -> "audio/wav"
            lower.endsWith(".flac") -> "audio/flac"
            lower.endsWith(".mp4") -> "video/mp4"
            lower.endsWith(".avi") -> "video/x-msvideo"
            lower.endsWith(".mov") -> "video/quicktime"
            lower.endsWith(".doc") -> "application/msword"
            lower.endsWith(".docx") -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            lower.endsWith(".xls") -> "application/vnd.ms-excel"
            lower.endsWith(".xlsx") -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            lower.endsWith(".ppt") -> "application/vnd.ms-powerpoint"
            lower.endsWith(".pptx") -> "application/vnd.openxmlformats-officedocument.presentationml.presentation"
            else -> "application/octet-stream"
        }
    }

    private fun escapeJs(text: String): String =
        text.replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ").replace("\r", " ")

    private fun evaluateJs(script: String) {
        runOnUiThread {
            if (::webView.isInitialized) webView.evaluateJavascript(script, null)
        }
    }

    /** 升级事件推送页面：window.__localboxUpdateEvent({event,data}) */
    private fun emitUpdateEvent(event: String, data: Any?) {
        val json = JSONObject().put("event", event).put("data", data ?: JSONObject.NULL).toString()
        evaluateJs("window.__localboxUpdateEvent && window.__localboxUpdateEvent($json)")
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        webView = findViewById(R.id.web_view)

        // 通过 https 伪域名映射本地 assets，保证 ES Module 与 WebCrypto 安全上下文可用
        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.webViewClient = object : WebViewClientCompat() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: android.webkit.WebResourceRequest
            ): android.webkit.WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
            }
        }

        // 处理网页中的 <input type="file">，调起系统文件选择器
        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                callback: ValueCallback<Array<Uri>>?,
                params: FileChooserParams?
            ): Boolean {
                filePathCallback?.onReceiveValue(null)
                filePathCallback = callback
                return try {
                    val intent = params?.createIntent()
                    if (intent == null) {
                        filePathCallback = null
                        false
                    } else {
                        Log.d("LocalBox", "file chooser: launching system picker")
                        this@MainActivity.startActivityForResult(intent, fileChooserRequestCode)
                        true
                    }
                } catch (e: Exception) {
                    Log.w("LocalBox", "file chooser: launch failed", e)
                    filePathCallback = null
                    false
                }
            }
        }

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            cacheMode = android.webkit.WebSettings.LOAD_DEFAULT
            allowFileAccess = false
            mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
            setSupportZoom(false)
        }

        webView.addJavascriptInterface(NativeBridge(), "AndroidBridge")

        // 升级安装结果广播：动态注册、非导出（targetSdk 34 要求显式声明导出方向；
        // PendingIntent 以本应用身份发送，非导出即可收到）
        ContextCompat.registerReceiver(
            this,
            updater.installReceiver,
            IntentFilter(Updater.ACTION_INSTALL_RESULT),
            ContextCompat.RECEIVER_NOT_EXPORTED
        )

        webView.loadUrl("https://appassets.androidplatform.net/assets/dist/index.html")
    }

    override fun onDestroy() {
        try {
            unregisterReceiver(updater.installReceiver)
        } catch (e: Exception) {
            Log.w("LocalBox", "unregister install receiver failed", e)
        }
        ioPool.shutdownNow()
        super.onDestroy()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else @Suppress("DEPRECATION") super.onBackPressed()
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == Updater.REQUEST_INSTALL_PERMISSION) {
            updater.onPermissionResult()
            return
        }
        if (requestCode == fileChooserRequestCode) {
            val result =
                if (resultCode == Activity.RESULT_OK && data != null)
                    WebChromeClient.FileChooserParams.parseResult(resultCode, data)
                else null
            Log.d(
                "LocalBox",
                "file chooser: resultCode=$resultCode dataNull=${data == null} uris=${result?.size ?: 0}"
            )
            filePathCallback?.onReceiveValue(result)
            filePathCallback = null
            return
        }
        @Suppress("DEPRECATION")
        super.onActivityResult(requestCode, resultCode, data)
    }
}
