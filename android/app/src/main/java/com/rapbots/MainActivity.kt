package com.rapbots

import android.annotation.SuppressLint
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.webkit.DownloadListener
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val callback = filePathCallback
        if (callback == null) {
            return@registerForActivityResult
        }

        val selectedUris: Array<Uri>? = if (result.resultCode == Activity.RESULT_OK) {
            val intent = result.data
            when {
                intent == null -> null
                intent.clipData != null -> {
                    val count = intent.clipData!!.itemCount
                    Array(count) { index -> intent.clipData!!.getItemAt(index).uri }
                }
                intent.data != null -> arrayOf(intent.data!!)
                else -> null
            }
        } else {
            null
        }

        callback.onReceiveValue(selectedUris)
        filePathCallback = null
    }

    private val audioPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (!granted) {
            // We silently ignore; getUserMedia calls will fail gracefully.
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.rapbotsWebView)
        progressBar = findViewById(R.id.loadingProgress)

        configureWebView()
        ensureAudioPermission()

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState)
        } else {
            webView.loadUrl(resolveAppUrl())
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    remove()
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onDestroy() {
        filePathCallback?.onReceiveValue(null)
        filePathCallback = null
        super.onDestroy()
    }

    private fun configureWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.allowContentAccess = true
        settings.allowFileAccess = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings.safeBrowsingEnabled = true
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest
            ): Boolean {
                val url = request.url
                return if (url.scheme == "http" || url.scheme == "https") {
                    false
                } else {
                    try {
                        startActivity(Intent(Intent.ACTION_VIEW, url))
                    } catch (_: ActivityNotFoundException) {
                    }
                    true
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView, newProgress: Int) {
                if (newProgress in 1..99) {
                    progressBar.visibility = View.VISIBLE
                    progressBar.progress = newProgress
                } else {
                    progressBar.visibility = View.GONE
                }
            }

            override fun onPermissionRequest(request: PermissionRequest) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    request.grant(request.resources)
                }
            }

            override fun onShowFileChooser(
                webView: WebView,
                filePathCallback: ValueCallback<Array<Uri>>,
                fileChooserParams: FileChooserParams
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                val intent = createChooserIntent(fileChooserParams)
                return try {
                    fileChooserLauncher.launch(intent)
                    true
                } catch (_: ActivityNotFoundException) {
                    this@MainActivity.filePathCallback = null
                    false
                }
            }
        }

        webView.setDownloadListener(DownloadListener { url, _, _, _, _ ->
            try {
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
            } catch (_: ActivityNotFoundException) {
            }
        })
    }

    private fun createChooserIntent(params: WebChromeClient.FileChooserParams): Intent {
        val intent = params.createIntent()
        intent.addCategory(Intent.CATEGORY_OPENABLE)
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.mode == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE)
        return Intent.createChooser(intent, params.title ?: getString(R.string.app_name))
    }

    private fun ensureAudioPermission() {
        val permission = android.Manifest.permission.RECORD_AUDIO
        if (ContextCompat.checkSelfPermission(this, permission) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            audioPermissionLauncher.launch(permission)
        }
    }

    private fun resolveAppUrl(): String {
        val envUrl = System.getenv("RAPBOTS_APP_URL")?.trim()?.takeIf { it.isNotBlank() }
        val configUrl = BuildConfig.APP_URL.trim().takeIf { it.isNotBlank() && !it.equals("unset", ignoreCase = true) }
        val fallback = "https://rapbots.example.com"
        return envUrl ?: configUrl ?: fallback
    }
}
