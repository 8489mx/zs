package com.zsystems.app;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.media.AudioManager;
import android.media.ToneGenerator;
import android.nfc.NfcAdapter;
import android.os.Build;
import android.os.Bundle;
import android.os.CountDownTimer;
import android.os.Vibrator;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import java.util.Locale;

public class PaymentActivity extends Activity {
    private static final String TAG = "PaymentActivity";
    private CountDownTimer countDownTimer;
    private TextView timerTextView;
    private NfcAdapter nfcAdapter;
    private PendingIntent pendingIntent;
    private boolean isFinished = false;

    private double amount = 0.0;
    private String currency = "EGP";
    private String referenceId = "";
    private String provider = "EDC";

    public static volatile PaymentActivity activeInstance = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        activeInstance = this;

        requestWindowFeature(Window.FEATURE_NO_TITLE);

        // Turn screen on and keep awake while waiting for card
        getWindow().addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
        );

        if (Build.VERSION.SDK_INT >= 21) {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            getWindow().setStatusBarColor(Color.parseColor("#170e5e"));
        }

        // Read intent data
        Intent intent = getIntent();
        if (intent != null) {
            amount = intent.getDoubleExtra("amount", 0.0);
            currency = intent.getStringExtra("currency");
            if (currency == null || currency.trim().isEmpty()) currency = "EGP";
            referenceId = intent.getStringExtra("referenceId");
            if (referenceId == null) referenceId = "";
            provider = intent.getStringExtra("provider");
            if (provider == null) provider = "EDC";
        }

        // Initialize NFC if available on terminal
        try {
            nfcAdapter = NfcAdapter.getDefaultAdapter(this);
            if (nfcAdapter != null) {
                Intent nfcIntent = new Intent(this, getClass()).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
                int flags = Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_MUTABLE : 0;
                pendingIntent = PendingIntent.getActivity(this, 0, nfcIntent, flags);
            }
        } catch (Exception ignored) {}

        // Beep on open
        playTone(ToneGenerator.TONE_PROP_BEEP, 250);

        // Build Programmatic UI (Clean Arabic RTL Enterprise Design)
        buildUi();

        // 60-Second Auto-Timeout
        startTimeoutCountdown(60);
    }

    private void buildUi() {
        ScrollView scrollView = new ScrollView(this);
        scrollView.setFillViewport(true);
        scrollView.setBackgroundColor(Color.parseColor("#f8fafc"));

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.setPadding(dp(20), dp(24), dp(20), dp(24));

        boolean isInstaPay = provider != null && provider.toLowerCase(Locale.US).contains("insta");
        boolean isWallet = provider != null && provider.toLowerCase(Locale.US).contains("wallet");

        // 1. Header Card (Deep Royal Navy #170e5e)
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.VERTICAL);
        header.setGravity(Gravity.CENTER);
        header.setPadding(dp(16), dp(16), dp(16), dp(16));
        GradientDrawable headerBg = new GradientDrawable();
        headerBg.setColor(Color.parseColor("#170e5e"));
        headerBg.setCornerRadius(dp(16));
        header.setBackground(headerBg);

        TextView brandText = new TextView(this);
        brandText.setText(isInstaPay ? "INSTAPAY EGYPT • شبكة المدفوعات اللحظية IPN" : isWallet ? "محافظ إلكترونية • شبكة ميزة الرقمية" : "Z-SYSTEMS SMART EDC");
        brandText.setTextColor(Color.parseColor("#a5b4fc"));
        brandText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        brandText.setTypeface(Typeface.DEFAULT_BOLD);
        brandText.setGravity(Gravity.CENTER);
        header.addView(brandText);

        TextView titleText = new TextView(this);
        titleText.setText(isInstaPay ? "طلب دفع فوري عبر InstaPay" : isWallet ? "طلب دفع عبر المحفظة الإلكترونية" : "محطة الدفع الإلكتروني الذكية");
        titleText.setTextColor(Color.WHITE);
        titleText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18);
        titleText.setTypeface(Typeface.DEFAULT_BOLD);
        titleText.setGravity(Gravity.CENTER);
        titleText.setPadding(0, dp(4), 0, 0);
        header.addView(titleText);

        LinearLayout.LayoutParams headerParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        headerParams.bottomMargin = dp(20);
        root.addView(header, headerParams);

        // 2. Amount Box (Clean Crisp White Card)
        LinearLayout amountCard = new LinearLayout(this);
        amountCard.setOrientation(LinearLayout.VERTICAL);
        amountCard.setGravity(Gravity.CENTER);
        amountCard.setPadding(dp(20), dp(24), dp(20), dp(24));
        GradientDrawable cardBg = new GradientDrawable();
        cardBg.setColor(Color.WHITE);
        cardBg.setCornerRadius(dp(16));
        cardBg.setStroke(dp(1), Color.parseColor("#e2e8f0"));
        amountCard.setBackground(cardBg);

        TextView amountLabel = new TextView(this);
        amountLabel.setText("المبلغ المطلوب سداده");
        amountLabel.setTextColor(Color.parseColor("#64748b"));
        amountLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        amountLabel.setTypeface(Typeface.DEFAULT_BOLD);
        amountLabel.setGravity(Gravity.CENTER);
        amountCard.addView(amountLabel);

        TextView amountValue = new TextView(this);
        amountValue.setText(String.format(Locale.US, "%.2f %s", amount, currency));
        amountValue.setTextColor(Color.parseColor("#170e5e"));
        amountValue.setTextSize(TypedValue.COMPLEX_UNIT_SP, 36);
        amountValue.setTypeface(Typeface.DEFAULT_BOLD);
        amountValue.setGravity(Gravity.CENTER);
        amountValue.setPadding(0, dp(8), 0, dp(8));
        amountCard.addView(amountValue);

        if (!referenceId.isEmpty()) {
            TextView refText = new TextView(this);
            refText.setText("مرجع العملية: " + referenceId);
            refText.setTextColor(Color.parseColor("#94a3b8"));
            refText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10);
            refText.setGravity(Gravity.CENTER);
            amountCard.addView(refText);
        }

        LinearLayout.LayoutParams cardParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        cardParams.bottomMargin = dp(18);
        root.addView(amountCard, cardParams);

        // 3. Card / NFC Prompt Banner
        LinearLayout nfcBanner = new LinearLayout(this);
        nfcBanner.setOrientation(LinearLayout.VERTICAL);
        nfcBanner.setGravity(Gravity.CENTER);
        nfcBanner.setPadding(dp(16), dp(16), dp(16), dp(16));
        GradientDrawable nfcBg = new GradientDrawable();
        nfcBg.setColor(Color.parseColor("#eef2ff"));
        nfcBg.setCornerRadius(dp(14));
        nfcBg.setStroke(dp(1), Color.parseColor("#c7d2fe"));
        nfcBanner.setBackground(nfcBg);

        TextView nfcPrompt = new TextView(this);
        nfcPrompt.setText(isInstaPay ? "يرجى التحويل إلى حساب انستاباي ثم الضغط على تأكيد" : isWallet ? "يرجى التحويل إلى رقم المحفظة ثم الضغط على تأكيد" : "يرجى تمرير بطاقة الدفع (NFC) أو إدخال الشريحة");
        nfcPrompt.setTextColor(Color.parseColor("#312e81"));
        nfcPrompt.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        nfcPrompt.setTypeface(Typeface.DEFAULT_BOLD);
        nfcPrompt.setGravity(Gravity.CENTER);
        nfcBanner.addView(nfcPrompt);

        TextView nfcSub = new TextView(this);
        nfcSub.setText(isInstaPay ? "شبكة المدفوعات اللحظية IPN • البنك المركزي المصري" : isWallet ? "فودافون كاش • أورنج • اتصالات • وي • ميزة" : "Visa • Mastercard • Mada • Meeza");
        nfcSub.setTextColor(Color.parseColor("#4338ca"));
        nfcSub.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        nfcSub.setGravity(Gravity.CENTER);
        nfcSub.setPadding(0, dp(4), 0, 0);
        nfcBanner.addView(nfcSub);

        LinearLayout.LayoutParams nfcParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        nfcParams.bottomMargin = dp(20);
        root.addView(nfcBanner, nfcParams);

        // 4. Timer Indicator
        timerTextView = new TextView(this);
        timerTextView.setText("الوقت المتبقي: 60 ثانية");
        timerTextView.setTextColor(Color.parseColor("#64748b"));
        timerTextView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        timerTextView.setGravity(Gravity.CENTER);
        timerTextView.setPadding(0, 0, 0, dp(16));
        root.addView(timerTextView);

        // 5. Action Buttons (Approve & Cancel)
        Button btnApprove = new Button(this);
        btnApprove.setText(isInstaPay ? "تأكيد استلام تحويل InstaPay" : isWallet ? "تأكيد استلام تحويل المحفظة" : "تأكيد الدفع بالبطاقة (APPROVED)");
        btnApprove.setTextColor(Color.WHITE);
        btnApprove.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        btnApprove.setTypeface(Typeface.DEFAULT_BOLD);
        GradientDrawable approveBg = new GradientDrawable();
        approveBg.setColor(Color.parseColor("#16a34a"));
        approveBg.setCornerRadius(dp(12));
        btnApprove.setBackground(approveBg);
        btnApprove.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                handleApproval("Screen Confirmation");
            }
        });

        LinearLayout.LayoutParams btnApproveParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            dp(52)
        );
        btnApproveParams.bottomMargin = dp(10);
        btnApproveParams.bottomMargin = dp(10);
        root.addView(btnApprove, btnApproveParams);

        Button btnCancel = new Button(this);
        btnCancel.setText("إلغاء المعاملة (CANCEL)");
        btnCancel.setTextColor(Color.WHITE);
        btnCancel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        btnCancel.setTypeface(Typeface.DEFAULT_BOLD);
        GradientDrawable cancelBg = new GradientDrawable();
        cancelBg.setColor(Color.parseColor("#dc2626"));
        cancelBg.setCornerRadius(dp(12));
        btnCancel.setBackground(cancelBg);
        btnCancel.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                handleCancel();
            }
        });

        LinearLayout.LayoutParams btnCancelParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            dp(44)
        );
        root.addView(btnCancel, btnCancelParams);

        scrollView.addView(root);
        setContentView(scrollView);
    }

    private void startTimeoutCountdown(int seconds) {
        countDownTimer = new CountDownTimer(seconds * 1000L, 1000) {
            @Override
            public void onTick(long millisUntilFinished) {
                if (timerTextView != null && !isFinished) {
                    timerTextView.setText(String.format(Locale.US, "الوقت المتبقي: %d ثانية", millisUntilFinished / 1000));
                }
            }

            @Override
            public void onFinish() {
                if (!isFinished) {
                    handleTimeout();
                }
            }
        }.start();
    }

    private synchronized void handleApproval(String method) {
        if (isFinished) return;
        isFinished = true;
        if (countDownTimer != null) countDownTimer.cancel();

        // Double success beep & vibrate
        playTone(ToneGenerator.TONE_PROP_ACK, 350);
        vibrate(250);

        EcrServerService.completePaymentSession(true, "تمت الموافقة بنجاح على شاشة الماكينة (" + method + ")");

        finish();
    }

    public static void cancelFromRemote(final String reason) {
        if (activeInstance != null) {
            final PaymentActivity act = activeInstance;
            act.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        if (act.countDownTimer != null) act.countDownTimer.cancel();
                        act.isFinished = true;
                        act.playTone(ToneGenerator.TONE_PROP_NACK, 250);
                        act.finish();
                    } catch (Exception ignored) {}
                }
            });
        }
    }

    private synchronized void handleCancel() {
        if (isFinished) return;
        isFinished = true;
        if (countDownTimer != null) countDownTimer.cancel();

        playTone(ToneGenerator.TONE_PROP_NACK, 300);
        EcrServerService.completePaymentSession(false, "تم إلغاء العملية من شاشة ماكينة الدفع");

        finish();
    }

    private synchronized void handleTimeout() {
        if (isFinished) return;
        isFinished = true;
        if (countDownTimer != null) countDownTimer.cancel();

        playTone(ToneGenerator.TONE_PROP_NACK, 300);
        EcrServerService.completePaymentSession(false, "انتهت مهلة الانتظار على شاشة الماكينة");

        finish();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (nfcAdapter != null && pendingIntent != null) {
            try {
                IntentFilter[] filters = new IntentFilter[]{
                    new IntentFilter(NfcAdapter.ACTION_TAG_DISCOVERED),
                    new IntentFilter(NfcAdapter.ACTION_TECH_DISCOVERED),
                    new IntentFilter(NfcAdapter.ACTION_NDEF_DISCOVERED)
                };
                nfcAdapter.enableForegroundDispatch(this, pendingIntent, filters, null);
            } catch (Exception ignored) {}
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (nfcAdapter != null) {
            try {
                nfcAdapter.disableForegroundDispatch(this);
            } catch (Exception ignored) {}
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (intent != null && !isFinished) {
            String action = intent.getAction();
            if (NfcAdapter.ACTION_TAG_DISCOVERED.equals(action) ||
                NfcAdapter.ACTION_TECH_DISCOVERED.equals(action) ||
                NfcAdapter.ACTION_NDEF_DISCOVERED.equals(action)) {
                // Card tapped via NFC!
                handleApproval("NFC Contactless Tap");
            }
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            handleCancel();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onDestroy() {
        if (activeInstance == this) activeInstance = null;
        if (countDownTimer != null) countDownTimer.cancel();
        if (!isFinished) {
            EcrServerService.completePaymentSession(false, "تم إغلاق شاشة الدفع");
        }
        super.onDestroy();
    }

    private void playTone(int toneType, int durationMs) {
        try {
            ToneGenerator tg = new ToneGenerator(AudioManager.STREAM_NOTIFICATION, 95);
            tg.startTone(toneType, durationMs);
        } catch (Exception ignored) {}
    }

    private void vibrate(long ms) {
        try {
            Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null && v.hasVibrator()) {
                v.vibrate(ms);
            }
        } catch (Exception ignored) {}
    }

    private int dp(int value) {
        return (int) TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            value,
            getResources().getDisplayMetrics()
        );
    }
}
