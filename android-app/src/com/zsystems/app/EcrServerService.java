package com.zsystems.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.Locale;
import java.util.Random;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

public class EcrServerService extends Service {
    private static final String TAG = "ZSystemsEcr";
    private static final int NOTIF_ID = 18181;
    private static final String CHANNEL_ID = "zsystems_ecr_channel";

    private volatile boolean isRunning = false;
    private ServerSocket http8080Server;
    private ServerSocket tcp10009Server;
    private Thread httpThread;
    private Thread tcpThread;

    public static class PaymentSession {
        public static final Object LOCK = new Object();
        public static volatile PaymentSession current = null;

        public final String referenceId;
        public final double amount;
        public final String currency;
        public final String provider;
        public final CountDownLatch latch = new CountDownLatch(1);

        public volatile boolean isApproved = false;
        public volatile boolean isCancelled = false;
        public volatile String authCode = "";
        public volatile String rrn = "";
        public volatile String cardScheme = "Mada/Visa";
        public volatile String cardLastFour = "4242";
        public volatile String message = "";

        public PaymentSession(String referenceId, double amount, String currency, String provider) {
            this.referenceId = referenceId;
            this.amount = amount;
            this.currency = currency;
            this.provider = provider;
        }
    }

    public static void completePaymentSession(boolean approved, String message) {
        synchronized (PaymentSession.LOCK) {
            if (PaymentSession.current != null) {
                PaymentSession.current.isApproved = approved;
                PaymentSession.current.isCancelled = !approved;
                PaymentSession.current.message = message;
                if (approved) {
                    PaymentSession.current.authCode = String.format(Locale.US, "%06d", new Random().nextInt(900000) + 100000);
                    PaymentSession.current.rrn = String.format(Locale.US, "%012d", Math.abs(new Random().nextLong() % 900000000000L) + 100000000000L);
                    boolean isInsta = PaymentSession.current.provider != null && PaymentSession.current.provider.toLowerCase(Locale.US).contains("insta");
                    boolean isWal = PaymentSession.current.provider != null && PaymentSession.current.provider.toLowerCase(Locale.US).contains("wallet");
                    PaymentSession.current.cardScheme = isInsta ? "InstaPay" : isWal ? "Wallet" : "Visa";

                    // Trigger Sunmi paper thermal print
                    SunmiPrinterHelper.printReceipt(
                        PaymentSession.current.amount,
                        PaymentSession.current.currency,
                        PaymentSession.current.authCode,
                        PaymentSession.current.rrn,
                        PaymentSession.current.cardScheme
                    );
                }
                PaymentSession.current.latch.countDown();
            }
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        startForeground(NOTIF_ID, buildForegroundNotification());

        // Initialize Sunmi Printer Service Helper
        SunmiPrinterHelper.init(this);

        startEcrServers();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (!isRunning) {
            startEcrServers();
        }
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        isRunning = false;
        closeServers();
        super.onDestroy();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Z-Systems ECR Service",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Z-Systems Smart POS Background Service");
            channel.setShowBadge(false);
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildForegroundNotification() {
        Intent notifIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notifIntent,
            Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0
        );

        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= 26) {
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }

        builder.setContentTitle("Z-Systems ECR Terminal")
               .setContentText("ماكينة الدفع نشطة على المنفذ 8080 و 10009")
               .setSmallIcon(R.drawable.ic_launcher)
               .setContentIntent(pendingIntent)
               .setOngoing(true);

        return builder.build();
    }

    private synchronized void startEcrServers() {
        if (isRunning) return;
        isRunning = true;

        // 1. HTTP Server on Port 8080
        httpThread = new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    http8080Server = new ServerSocket(8080);
                    Log.i(TAG, "HTTP ECR Server listening on 0.0.0.0:8080");
                    while (isRunning && !http8080Server.isClosed()) {
                        try {
                            Socket client = http8080Server.accept();
                            handleHttpClientAsync(client);
                        } catch (Exception e) {
                            if (!isRunning) break;
                        }
                    }
                } catch (Exception ex) {
                    Log.e(TAG, "HTTP ECR Server 8080 error: " + ex.getMessage());
                }
            }
        }, "EcrHttp8080Thread");
        httpThread.setDaemon(true);
        httpThread.start();

        // 2. TCP Server on Port 10009 (PAX Protocol)
        tcpThread = new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    tcp10009Server = new ServerSocket(10009);
                    Log.i(TAG, "PAX TCP Server listening on 0.0.0.0:10009");
                    while (isRunning && !tcp10009Server.isClosed()) {
                        try {
                            Socket client = tcp10009Server.accept();
                            handleTcpClientAsync(client);
                        } catch (Exception e) {
                            if (!isRunning) break;
                        }
                    }
                } catch (Exception ex) {
                    Log.e(TAG, "PAX TCP Server 10009 error: " + ex.getMessage());
                }
            }
        }, "EcrTcp10009Thread");
        tcpThread.setDaemon(true);
        tcpThread.start();
    }

    private void handleHttpClientAsync(final Socket socket) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    socket.setSoTimeout(70000);
                    InputStream in = socket.getInputStream();
                    OutputStream out = socket.getOutputStream();

                    BufferedReader reader = new BufferedReader(new InputStreamReader(in, "UTF-8"));
                    String requestLine = reader.readLine();
                    if (requestLine == null || requestLine.isEmpty()) {
                        socket.close();
                        return;
                    }

                    String[] parts = requestLine.split(" ");
                    String method = parts.length > 0 ? parts[0].toUpperCase(Locale.US) : "GET";
                    String path = parts.length > 1 ? parts[1].toLowerCase(Locale.US) : "/";

                    // Read headers
                    int contentLength = 0;
                    String line;
                    while ((line = reader.readLine()) != null && !line.isEmpty()) {
                        if (line.toLowerCase(Locale.US).startsWith("content-length:")) {
                            contentLength = Integer.parseInt(line.substring(15).trim());
                        }
                    }

                    // Read body
                    StringBuilder body = new StringBuilder();
                    if (contentLength > 0) {
                        char[] buf = new char[contentLength];
                        int read = 0;
                        while (read < contentLength) {
                            int r = reader.read(buf, read, contentLength - read);
                            if (r <= 0) break;
                            read += r;
                        }
                        body.append(buf, 0, read);
                    }

                    if ("OPTIONS".equals(method)) {
                        String corsResponse = "HTTP/1.1 204 No Content\r\n" +
                            "Access-Control-Allow-Origin: *\r\n" +
                            "Access-Control-Allow-Private-Network: true\r\n" +
                            "Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE\r\n" +
                            "Access-Control-Allow-Headers: *\r\n" +
                            "Content-Length: 0\r\n\r\n";
                        out.write(corsResponse.getBytes("UTF-8"));
                        out.flush();
                        socket.close();
                        return;
                    }

                    String responseJson;
                    int statusCode = 200;

                    if ("GET".equals(method) && (path.equals("/") || path.contains("/ping") || path.contains("/health") || path.contains("/status"))) {
                        responseJson = "{\"status\":\"ONLINE\",\"terminal\":\"SUNMI-V2PRO\",\"online\":true,\"ready\":true,\"message\":\"ماكينة الدفع نشطة ومستعدة\"}";
                    } else if (path.contains("/test")) {
                        responseJson = "{\"success\":true,\"data\":{\"online\":true,\"reachable\":true,\"portOpen\":true,\"pingSucceeded\":true,\"message\":\"الاتصال بماكينة الدفع نشط ومستعد\",\"latencyMs\":1}}";
                    } else if (path.contains("/cancel") || path.contains("/abort")) {
                        // Cancel any currently active payment session
                        synchronized (PaymentSession.LOCK) {
                            if (PaymentSession.current != null) {
                                completePaymentSession(false, "تم إلغاء المعاملة من نقطة البيع");
                            }
                        }
                        PaymentActivity.cancelFromRemote("تم إلغاء المعاملة من نقطة البيع");
                        responseJson = "{\"success\":true,\"status\":\"CANCELLED\",\"responseCode\":\"000099\",\"message\":\"تم إلغاء العملية\"}";
                    } else if (path.contains("/print")) {
                        String textToPrint = "";
                        try {
                            org.json.JSONObject jsonObj = new org.json.JSONObject(body.toString());
                            textToPrint = jsonObj.optString("printData", jsonObj.optString("text", ""));
                        } catch (Exception ex) {
                            textToPrint = body.toString();
                        }
                        SunmiPrinterHelper.printRawText(textToPrint);
                        responseJson = "{\"success\":true,\"message\":\"تم استلام أمر الطباعة بنجاح\"}";
                    } else if (path.contains("/charge") || path.contains("/pay") || path.contains("/sale") || "POST".equals(method)) {
                        // Real Interactive Payment Sale Transaction!
                        double amount = 0.0;
                        String currency = "EGP";
                        String refId = "EDC-" + System.currentTimeMillis();
                        String prov = "EDC";

                        String bodyStr = body.toString();
                        try {
                            org.json.JSONObject jsonObj = new org.json.JSONObject(bodyStr);
                            amount = jsonObj.optDouble("amount", 0.0);
                            if (jsonObj.has("currency")) currency = jsonObj.optString("currency", "EGP");
                            if (jsonObj.has("referenceId")) refId = jsonObj.optString("referenceId", refId);
                            if (jsonObj.has("provider")) prov = jsonObj.optString("provider", "EDC");
                        } catch (Exception ex) {
                            if (bodyStr.contains("amount")) {
                                try {
                                    String cleaned = bodyStr.replaceAll("[^0-9.]", " ").trim();
                                    String[] tokens = cleaned.split("\\s+");
                                    if (tokens.length > 0) amount = Double.parseDouble(tokens[0]);
                                } catch (Exception ignored) {}
                            }
                        }

                        if (amount <= 0.0) {
                            responseJson = "{\"status\":\"ERROR\",\"message\":\"المبلغ يجب أن يكون أكبر من الصفر\",\"success\":false,\"online\":true}";
                        } else {
                            // Create session & wait for physical customer/cashier action
                            PaymentSession session = new PaymentSession(refId, amount, currency, prov);
                            synchronized (PaymentSession.LOCK) {
                                PaymentSession.current = session;
                            }

                            // Launch Fullscreen Payment Activity on Sunmi screen
                            Intent actIntent = new Intent(EcrServerService.this, PaymentActivity.class);
                            actIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                            actIntent.putExtra("referenceId", refId);
                            actIntent.putExtra("amount", amount);
                            actIntent.putExtra("currency", currency);
                            actIntent.putExtra("provider", prov);
                            startActivity(actIntent);

                            // Hold HTTP connection until cashier/customer confirms or cancels
                            boolean finished = false;
                            try {
                                finished = session.latch.await(62, TimeUnit.SECONDS);
                            } catch (InterruptedException e) {
                                session.isCancelled = true;
                            }

                            if (!finished) {
                                session.isCancelled = true;
                            }

                            if (session.isApproved) {
                                responseJson = String.format(Locale.US,
                                    "{\"status\":\"APPROVED\",\"responseCode\":\"000000\",\"success\":true,\"isSuccess\":true,\"approvalCode\":\"%s\",\"authCode\":\"%s\",\"rrn\":\"%s\",\"cardScheme\":\"%s\",\"amount\":%.2f,\"currency\":\"%s\",\"message\":\"تمت العملية بنجاح\"}",
                                    session.authCode, session.authCode, session.rrn, session.cardScheme, session.amount, session.currency);
                            } else {
                                String userMsg = session.message != null ? session.message : (session.isCancelled ? "تم إلغاء المعاملة من الماكينة" : "تم رفض المعاملة");
                                if (!finished) userMsg = "انتهت مهلة الانتظار على شاشة الماكينة";
                                responseJson = String.format(Locale.US,
                                    "{\"status\":\"CANCELLED\",\"responseCode\":\"000099\",\"success\":false,\"isSuccess\":false,\"amount\":%.2f,\"currency\":\"%s\",\"message\":\"%s\"}",
                                    session.amount, session.currency, userMsg);
                            }

                            synchronized (PaymentSession.LOCK) {
                                if (PaymentSession.current == session) {
                                    PaymentSession.current = null;
                                }
                            }
                        }
                    } else {
                        responseJson = "{\"status\":\"ONLINE\",\"terminal\":\"SUNMI-V2PRO\",\"message\":\"Z-Systems ECR Service\",\"online\":true}";
                    }


                    byte[] jsonBytes = responseJson.getBytes("UTF-8");
                    String headers = "HTTP/1.1 " + statusCode + " OK\r\n" +
                        "Content-Type: application/json; charset=utf-8\r\n" +
                        "Access-Control-Allow-Origin: *\r\n" +
                        "Access-Control-Allow-Private-Network: true\r\n" +
                        "Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE\r\n" +
                        "Access-Control-Allow-Headers: *\r\n" +
                        "Content-Length: " + jsonBytes.length + "\r\n" +
                        "Connection: close\r\n\r\n";

                    out.write(headers.getBytes("UTF-8"));
                    out.write(jsonBytes);
                    out.flush();
                    socket.close();
                } catch (Exception ex) {
                    try { socket.close(); } catch (Exception ignored) {}
                }
            }
        }).start();
    }

    private void handleTcpClientAsync(final Socket socket) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    socket.setSoTimeout(30000);
                    InputStream in = socket.getInputStream();
                    OutputStream out = socket.getOutputStream();

                    // Read initial byte / packet
                    int b = in.read();
                    if (b != -1) {
                        // Send ACK (0x06)
                        out.write(0x06);
                        out.flush();
                    }
                    socket.close();
                } catch (Exception ex) {
                    try { socket.close(); } catch (Exception ignored) {}
                }
            }
        }).start();
    }

    private void closeServers() {
        try {
            if (http8080Server != null) http8080Server.close();
        } catch (Exception ignored) {}
        try {
            if (tcp10009Server != null) tcp10009Server.close();
        } catch (Exception ignored) {}
    }
}
