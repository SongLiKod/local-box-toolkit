package com.localbox.app

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.concurrent.ExecutorService

/**
 * 应用内自升级（下载与安装全程在应用内完成，不跳转浏览器/文件管理器）：
 *  1. 首次需用户一次性授权「安装未知应用」（跳系统设置，返回后自动继续）
 *  2. 后台静默下载新版 APK（仅 HTTPS，可选 SHA-256 校验），逐百分比回推进度
 *  3. 写入 PackageInstaller 会话并提交，由系统在应用上方弹出安装确认
 *     （Android 安全策略强制，普通应用无法完全静默安装），点「更新」即完成
 *
 * 事件经 window.__localboxUpdateEvent({event,data}) 推送给页面：
 *  need-permission / progress(0-100) / staged / success / error
 */
class Updater(
    private val activity: MainActivity,
    private val ioPool: ExecutorService,
    private val emit: (String, Any?) -> Unit,
) {

    /** 是否已发起升级（下载中或等待系统确认中） */
    @Volatile
    private var busy = false

    /** 待执行的升级请求（授权返回后自动继续用） */
    private var pendingUrl: String? = null
    private var pendingSha256: String = ""

    private val mainHandler = Handler(Looper.getMainLooper())
    private val updateFile = File(activity.filesDir, "update/localbox-update.apk")

    /** 是否已获「安装未知应用」授权 */
    fun canInstall(): Boolean = activity.packageManager.canRequestPackageInstalls()

    /**
     * 发起升级：已授权则直接下载安装；未授权先推 need-permission 事件并跳系统设置，
     * 用户授权返回后由 [onPermissionResult] 自动继续。
     */
    fun startUpdate(url: String, sha256: String) {
        if (busy) {
            emit("error", "正在升级中，请稍候")
            return
        }
        if (!url.startsWith("https://", ignoreCase = true)) {
            emit("error", "升级源必须是 HTTPS 地址")
            return
        }
        busy = true
        pendingUrl = url
        pendingSha256 = sha256.trim()
        if (canInstall()) {
            ioPool.execute { downloadAndInstall(url, pendingSha256) }
        } else {
            Log.d("LocalBox", "update: install permission missing, guiding to settings")
            emit("need-permission", null)
            openPermissionSettings()
        }
    }

    /** 「安装未知应用」授权页返回后由 Activity 调用：授权成功则自动继续，否则终止 */
    fun onPermissionResult() {
        if (!busy) return
        val url = pendingUrl
        val sha256 = pendingSha256
        if (url != null && canInstall()) {
            ioPool.execute { downloadAndInstall(url, sha256) }
        } else {
            finish("error", "未获得「安装未知应用」授权，无法升级")
        }
    }

    /** 打开本应用的「安装未知应用」授权页（一次性授权） */
    fun openPermissionSettings() {
        mainHandler.post {
            try {
                activity.startActivityForResult(
                    Intent(
                        Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                        Uri.parse("package:${activity.packageName}")
                    ),
                    REQUEST_INSTALL_PERMISSION
                )
            } catch (e: Exception) {
                Log.w("LocalBox", "update: open permission settings failed", e)
                finish("error", "无法打开安装授权设置")
            }
        }
    }

    /** 静默下载 → 校验 → 提交安装会话（ioPool 线程执行） */
    private fun downloadAndInstall(url: String, sha256: String) {
        try {
            updateFile.parentFile?.mkdirs()
            updateFile.delete()
            emit("progress", 0)
            val actual = download(url) { pct -> emit("progress", pct) }
            if (sha256.isNotEmpty() && !actual.equals(sha256, ignoreCase = true)) {
                throw IOException("安装包校验失败（SHA-256 不匹配）")
            }
            commitSession(updateFile)
            Log.d("LocalBox", "update: session committed, waiting system confirmation")
        } catch (e: Exception) {
            Log.w("LocalBox", "update failed", e)
            finish("error", e.message ?: "升级失败")
        }
    }

    /** 下载到 [updateFile] 并返回实际 SHA-256（小写 hex），按 1% 粒度回调进度 */
    private fun download(url: String, onProgress: (Int) -> Unit): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val conn = openFollowing(url)
        val total = conn.contentLengthLong
        var lastPct = -1
        try {
            conn.inputStream.use { input ->
                FileOutputStream(updateFile).use { out ->
                    val buf = ByteArray(64 * 1024)
                    var copied = 0L
                    while (true) {
                        val n = input.read(buf)
                        if (n < 0) break
                        out.write(buf, 0, n)
                        digest.update(buf, 0, n)
                        copied += n
                        if (total > 0) {
                            val pct = ((copied * 100) / total).toInt().coerceIn(0, 100)
                            if (pct != lastPct) {
                                lastPct = pct
                                onProgress(pct)
                            }
                        }
                    }
                    if (copied <= 0) throw IOException("下载内容为空")
                }
            }
        } finally {
            conn.disconnect()
        }
        return digest.digest().joinToString("") { "%02x".format(it) }
    }

    /** 手动跟随重定向（GitHub Release 资产会 302 到 CDN），最多 5 跳 */
    private fun openFollowing(url: String, hops: Int = 0): HttpURLConnection {
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.connectTimeout = 15_000
        conn.readTimeout = 30_000
        conn.instanceFollowRedirects = false
        val code = conn.responseCode
        if (code in 300..399) {
            val loc = conn.getHeaderField("Location")
            conn.disconnect()
            if (loc.isNullOrEmpty()) throw IOException("下载重定向缺少目标地址")
            if (hops >= 5) throw IOException("下载重定向次数过多")
            return openFollowing(loc, hops + 1)
        }
        if (code !in 200..299) {
            conn.disconnect()
            throw IOException("下载失败（HTTP $code）")
        }
        return conn
    }

    /** 写入 PackageInstaller 会话并提交（提交后由 [installReceiver] 跟进系统结果） */
    private fun commitSession(apk: File) {
        val installer = activity.packageManager.packageInstaller
        val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
            .apply { setAppPackageName(activity.packageName) }
        val sessionId = installer.createSession(params)
        try {
            installer.openSession(sessionId).use { session ->
                session.openWrite("base.apk", 0, apk.length()).use { out ->
                    apk.inputStream().use { it.copyTo(out) }
                    session.fsync(out)
                }
                // 系统回填 EXTRA_STATUS 需要可变 PendingIntent（API 31+ 必须显式声明）
                val flags = PendingIntent.FLAG_UPDATE_CURRENT or
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0
                val intent = Intent(ACTION_INSTALL_RESULT).setPackage(activity.packageName)
                session.commit(PendingIntent.getBroadcast(activity, sessionId, intent, flags).intentSender)
            }
        } catch (e: Exception) {
            try {
                installer.abandonSession(sessionId)
            } catch (_: Exception) {
                /* 清理失败忽略 */
            }
            throw e
        }
    }

    /** 安装结果广播接收器（由 MainActivity 动态注册、非导出） */
    val installReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            when (intent.getIntExtra(PackageInstaller.EXTRA_STATUS, -1)) {
                PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                    // 系统安装确认（覆盖在应用上方；Android 安全策略无法跳过）
                    val confirm: Intent? =
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                            intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent::class.java)
                        } else {
                            @Suppress("DEPRECATION")
                            intent.getParcelableExtra(Intent.EXTRA_INTENT)
                        }
                    if (confirm == null) {
                        finish("error", "系统安装确认缺失")
                        return
                    }
                    try {
                        confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        activity.startActivity(confirm)
                        Log.d("LocalBox", "update: system install confirmation shown")
                        emit("staged", null)
                    } catch (e: Exception) {
                        Log.w("LocalBox", "update: show confirmation failed", e)
                        finish("error", "无法打开系统安装确认")
                    }
                }
                PackageInstaller.STATUS_SUCCESS -> {
                    Log.d("LocalBox", "update: install success")
                    finish("success", null)
                }
                PackageInstaller.STATUS_FAILURE_ABORTED -> {
                    abandon(intent)
                    finish("error", "已取消安装")
                }
                else -> {
                    abandon(intent)
                    val msg = intent.getStringExtra(PackageInstaller.EXTRA_MESSAGE) ?: "安装失败"
                    finish("error", msg)
                }
            }
        }
    }

    private fun abandon(intent: Intent) {
        val id = intent.getIntExtra(PackageInstaller.EXTRA_SESSION_ID, -1)
        if (id >= 0) {
            try {
                activity.packageManager.packageInstaller.abandonSession(id)
            } catch (e: Exception) {
                Log.w("LocalBox", "update: abandon session failed", e)
            }
        }
    }

    /** 终态收尾：复位状态、清理临时安装包并推送事件 */
    private fun finish(event: String, data: Any?) {
        busy = false
        pendingUrl = null
        pendingSha256 = ""
        try {
            updateFile.delete()
        } catch (_: Exception) {
            /* 清理失败忽略 */
        }
        emit(event, data)
    }

    companion object {
        /** 安装结果广播 action（PendingIntent 与动态注册共用） */
        const val ACTION_INSTALL_RESULT = "com.localbox.app.INSTALL_RESULT"

        /** 「安装未知应用」授权页请求码 */
        const val REQUEST_INSTALL_PERMISSION = 1002
    }
}
