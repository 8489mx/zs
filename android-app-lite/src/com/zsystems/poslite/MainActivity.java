package com.zsystems.poslite;

import android.app.Activity;
import android.os.Bundle;
import android.os.Build;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.ConsoleMessage;
import android.widget.ProgressBar;
import android.widget.FrameLayout;
import android.graphics.Color;
import android.content.Context;
import android.view.MotionEvent;
import android.view.inputmethod.InputMethodManager;

public class MainActivity extends Activity {
    private WebView webView;
    private ProgressBar progressBar;
    private static final String APP_URL = "https://app.zsystemai.com/pos";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= 19) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        // Start Persistent ECR Server Service on Ports 8080 & 10009
        try {
            android.content.Intent serviceIntent = new android.content.Intent(this, EcrServerService.class);
            if (Build.VERSION.SDK_INT >= 26) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
        } catch (Exception ignored) {}

        requestWindowFeature(Window.FEATURE_NO_TITLE);

        // 1. Force Hardware Acceleration on Window level for smooth 60fps
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        );

        if (Build.VERSION.SDK_INT >= 21) {
            Window window = getWindow();
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(Color.parseColor("#170e5e"));
        }

        FrameLayout layout = new FrameLayout(this);
        layout.setBackgroundColor(Color.parseColor("#f8fafc"));

        webView = new WebView(this);

        // 2. Disable overscroll bounce and hardware-costly scrollbars for low-spec CPU/GPU
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);

        layout.addView(webView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, 
            FrameLayout.LayoutParams.MATCH_PARENT
        ));

        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressBar.setProgress(0);
        FrameLayout.LayoutParams pbParams = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, 
            8
        );
        layout.addView(progressBar, pbParams);

        setContentView(layout);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        // 3. Zero double-tap delay (instant tap response)
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        // 4. Pre-rasterize offscreen tiles for stutter-free scrolling (Android 6.0+)
        if (Build.VERSION.SDK_INT >= 23) {
            settings.setOffscreenPreRaster(true);
        }

        // 5. Intelligent caching & DOM storage
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // 6. Allow mixed content for local silent printing on port 9100 / 8080
        if (Build.VERSION.SDK_INT >= 21) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        // Initialize Sunmi hardware service
        SunmiPrinterHelper.init(this);

        // 7. Inject JavascriptInterface for Direct Sunmi Thermal Hardware Printing
        webView.addJavascriptInterface(new Object() {
            @android.webkit.JavascriptInterface
            public boolean isSunmiPrinter() {
                return true;
            }

            @android.webkit.JavascriptInterface
            public boolean isPosLite() {
                return true;
            }

            @android.webkit.JavascriptInterface
            public void printReceipt(String printData) {
                SunmiPrinterHelper.printRawText(printData);
            }

            @android.webkit.JavascriptInterface
            public void printHtmlInvoice(String html) {
                SunmiPrinterHelper.printHtmlInvoice(html);
            }

            @android.webkit.JavascriptInterface
            public void hideKeyboard() {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
                            if (imm != null && webView != null) {
                                imm.hideSoftInputFromWindow(webView.getWindowToken(), 0);
                            }
                        } catch (Exception ignored) {}
                    }
                });
            }

            @android.webkit.JavascriptInterface
            public void showKeyboard() {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
                            if (imm != null && webView != null) {
                                imm.showSoftInput(webView, InputMethodManager.SHOW_IMPLICIT);
                            }
                        } catch (Exception ignored) {}
                    }
                });
            }
        }, "SunmiPrinter");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url == null || url.startsWith("about:blank") || url.startsWith("javascript:")) {
                    return true;
                }
                if (url.startsWith("https://app.zsystemai.com") || url.startsWith(APP_URL)) {
                    return false;
                }
                view.loadUrl(url);
                return true;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request == null || request.getUrl() == null) return false;
                String url = request.getUrl().toString();
                if (url.startsWith("about:blank") || url.startsWith("javascript:")) {
                    return true;
                }
                if (url.startsWith("https://app.zsystemai.com") || url.startsWith(APP_URL)) {
                    return false;
                }
                view.loadUrl(url);
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                progressBar.setVisibility(View.GONE);
                injectSunmiHook(view);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (newProgress < 100) {
                    progressBar.setVisibility(View.VISIBLE);
                    progressBar.setProgress(newProgress);
                } else {
                    progressBar.setVisibility(View.GONE);
                }
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                android.util.Log.d("WebConsole", consoleMessage.message() + " -- Line " + consoleMessage.lineNumber());
                return true;
            }

            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, android.os.Message resultMsg) {
                return false;
            }
        });

        webView.loadUrl(APP_URL);
        checkTestPrint(getIntent());
        checkEvalJs(getIntent());
    }

    private void injectSunmiHook(WebView view) {
        if (view == null) return;
        String js = "(function() {" +
            "if (window.__sunmi_hooked) return;" +
            "window.__sunmi_hooked = true;" +
            "var s = document.createElement('style');" +
            "s.id = '__pos_lite_clean';" +
            "s.textContent = '.mobile-bottom-nav { display: none !important; } .content-wrap { padding-bottom: 0 !important; }';" +
            "document.head.appendChild(s);" +
            "var origOpen = window.open;" +
            "window.open = function(u, t, f) {" +
            "  var buf = '';" +
            "  return {" +
            "    document: {" +
            "      open: function() {}," +
            "      write: function(s) { if(s) buf += s; }," +
            "      close: function() { if(buf && window.SunmiPrinter) window.SunmiPrinter.printHtmlInvoice(buf); }" +
            "    }," +
            "    focus: function() {}," +
            "    print: function() { if(buf && window.SunmiPrinter) window.SunmiPrinter.printHtmlInvoice(buf); }," +
            "    close: function() {}" +
            "  };" +
            "};" +
            "var origFetch = window.fetch ? window.fetch.bind(window) : null;" +
            "if (origFetch) {" +
            "  window.fetch = function(url, opts) {" +
            "    try {" +
            "      var u = (typeof url === 'string') ? url : (url && url.url) ? url.url : '';" +
            "      if (u && (u.indexOf('9100') !== -1 || u.indexOf('8080/print') !== -1)) {" +
            "        if (opts && opts.body && window.SunmiPrinter) {" +
            "          try {" +
            "            var b = JSON.parse(opts.body);" +
            "            if (b && b.printData) {" +
            "              window.SunmiPrinter.printReceipt(b.printData);" +
            "              return Promise.resolve(new Response(JSON.stringify({success:true}), {status:200, headers:{'Content-Type':'application/json'}}));" +
            "            }" +
            "          } catch(e) {}" +
            "        }" +
            "        return Promise.resolve(new Response(JSON.stringify({success:true}), {status:200, headers:{'Content-Type':'application/json'}}));" +
            "      }" +
            "    } catch(e) {}" +
            "    return origFetch.apply(window, arguments);" +
            "  };" +
            "}" +
            "document.addEventListener('focusin', function(e) {" +
            "  var el = e.target;" +
            "  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {" +
            "    if (!el.dataset.kbUnlocked) {" +
            "      el.setAttribute('inputmode', 'none');" +
            "    }" +
            "  }" +
            "}, true);" +
            "document.addEventListener('dblclick', function(e) {" +
            "  var el = e.target;" +
            "  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {" +
            "    el.dataset.kbUnlocked = 'true';" +
            "    el.setAttribute('inputmode', 'text');" +
            "    el.focus();" +
            "    if (window.SunmiPrinter && window.SunmiPrinter.showKeyboard) window.SunmiPrinter.showKeyboard();" +
            "  }" +
            "}, true);" +
            "var __lastTap = 0, __lastEl = null;" +
            "document.addEventListener('touchend', function(e) {" +
            "  var el = e.target;" +
            "  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {" +
            "    var now = Date.now();" +
            "    if (__lastEl === el && (now - __lastTap) < 350 && (now - __lastTap) > 50) {" +
            "      el.dataset.kbUnlocked = 'true';" +
            "      el.setAttribute('inputmode', 'text');" +
            "      el.focus();" +
            "      if (window.SunmiPrinter && window.SunmiPrinter.showKeyboard) window.SunmiPrinter.showKeyboard();" +
            "      __lastTap = 0; __lastEl = null;" +
            "      return;" +
            "    }" +
            "    __lastTap = now; __lastEl = el;" +
            "  } else {" +
            "    __lastTap = 0; __lastEl = null;" +
            "  }" +
            "}, true);" +
            "document.addEventListener('focusout', function(e) {" +
            "  var el = e.target;" +
            "  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {" +
            "    delete el.dataset.kbUnlocked;" +
            "    el.setAttribute('inputmode', 'none');" +
            "    if (window.SunmiPrinter && window.SunmiPrinter.hideKeyboard) window.SunmiPrinter.hideKeyboard();" +
            "  }" +
            "}, true);" +
            "document.addEventListener('click', function(e) {" +
            "  var el = e.target;" +
            "  var isInput = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');" +
            "  if (!isInput) {" +
            "    var active = document.activeElement;" +
            "    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {" +
            "      delete active.dataset.kbUnlocked;" +
            "      active.setAttribute('inputmode', 'none');" +
            "      active.blur();" +
            "      if (window.SunmiPrinter && window.SunmiPrinter.hideKeyboard) window.SunmiPrinter.hideKeyboard();" +
            "    }" +
            "  }" +
            "}, true);" +
            "document.addEventListener('keydown', function(e) {" +
            "  if (e.key === 'Enter') {" +
            "    var active = document.activeElement;" +
            "    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {" +
            "      delete active.dataset.kbUnlocked;" +
            "      active.setAttribute('inputmode', 'none');" +
            "      active.blur();" +
            "      if (window.SunmiPrinter && window.SunmiPrinter.hideKeyboard) window.SunmiPrinter.hideKeyboard();" +
            "    }" +
            "  }" +
            "}, true);" +
            "})();";
        if (Build.VERSION.SDK_INT >= 19) {
            view.evaluateJavascript(js, null);
        } else {
            view.loadUrl("javascript:" + js);
        }
    }

    @Override
    protected void onNewIntent(android.content.Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        checkTestPrint(intent);
        checkEvalJs(intent);
    }

    private void checkTestPrint(android.content.Intent intent) {
        if (intent != null && intent.hasExtra("test_print")) {
            String test = intent.getStringExtra("test_print");
            SunmiPrinterHelper.printRawText(test != null ? test : "اختبار طباعة زد سيستمز");
        }
    }

    private void checkEvalJs(android.content.Intent intent) {
        if (intent == null) return;
        if (intent.hasExtra("eval_b64")) {
            try {
                String b64 = intent.getStringExtra("eval_b64");
                if (b64 != null) {
                    byte[] data = android.util.Base64.decode(b64, android.util.Base64.DEFAULT);
                    String script = new String(data, "UTF-8");
                    if (webView != null) {
                        if (Build.VERSION.SDK_INT >= 19) {
                            webView.evaluateJavascript(script, null);
                        } else {
                            webView.loadUrl("javascript:" + script);
                        }
                    }
                }
            } catch (Exception e) {
                android.util.Log.e("WebConsole", "eval_b64 error", e);
            }
        } else if (intent.hasExtra("eval_js")) {
            String script = intent.getStringExtra("eval_js");
            if (webView != null && script != null) {
                if (Build.VERSION.SDK_INT >= 19) {
                    webView.evaluateJavascript(script, null);
                } else {
                    webView.loadUrl("javascript:" + script);
                }
            }
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}
