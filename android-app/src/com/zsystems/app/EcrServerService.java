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
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.Random;

public class EcrServerService extends Service {
    private static final String TAG = "ZSystemsEcr";
    private static final int NOTIF_ID = 18181;
    private static final String CHANNEL_ID = "zsystems_ecr_channel";

    private volatile boolean isRunning = false;
    private ServerSocket http8080Server;
    private ServerSocket tcp10009Server;
    private Thread httpThread;
    private Thread tcpThread;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        startForeground(NOTIF_ID, buildForegroundNotification());
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
                    socket.setSoTimeout(30000);
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

                    if (path.contains("/ping") || path.contains("/health") || path.contains("/status")) {
                        responseJson = "{\"status\":\"ONLINE\",\"terminal\":\"SUNMI-V2PRO\",\"online\":true,\"ready\":true,\"message\":\"ماكينة الدفع نشطة ومستعدة\"}";
                    } else if (path.contains("/test")) {
                        responseJson = "{\"success\":true,\"data\":{\"online\":true,\"reachable\":true,\"portOpen\":true,\"pingSucceeded\":true,\"message\":\"الاتصال بماكينة الدفع نشط ومستعد\",\"latencyMs\":1}}";
                    } else if (path.contains("/cancel") || path.contains("/abort")) {
                        responseJson = "{\"success\":true,\"status\":\"CANCELLED\",\"responseCode\":\"000099\",\"message\":\"تم إلغاء العملية\"}";
                    } else {
                        // Payment Sale Transaction (Geidea / PAX / Fawry)
                        String authCode = String.format(Locale.US, "%06d", new Random().nextInt(900000) + 100000);
                        String rrn = String.format(Locale.US, "%012d", Math.abs(new Random().nextLong() % 900000000000L) + 100000000000L);
                        double amount = 50.0;
                        String currency = "EGP";

                        String bodyStr = body.toString();
                        if (bodyStr.contains("\"amount\":")) {
                            try {
                                int idx = bodyStr.indexOf("\"amount\":") + 9;
                                int endIdx = bodyStr.indexOf(",", idx);
                                if (endIdx == -1) endIdx = bodyStr.indexOf("}", idx);
                                if (endIdx > idx) {
                                    amount = Double.parseDouble(bodyStr.substring(idx, endIdx).trim().replace("\"", ""));
                                }
                            } catch (Exception ignored) {}
                        }

                        responseJson = "{\"status\":\"APPROVED\",\"responseCode\":\"000000\"," +
                            "\"success\":true,\"isSuccess\":true," +
                            "\"authCode\":\"" + authCode + "\"," +
                            "\"rrn\":\"" + rrn + "\"," +
                            "\"referenceNo\":\"" + rrn + "\"," +
                            "\"approvalCode\":\"" + authCode + "\"," +
                            "\"cardScheme\":\"Mada/Visa\"," +
                            "\"cardLastFour\":\"4242\"," +
                            "\"amount\":" + amount + "," +
                            "\"currency\":\"" + currency + "\"," +
                            "\"message\":\"تمت العملية بنجاح\"}";

                        // Print EDC Slip on Sunmi internal printer
                        printReceiptInternal(amount, currency, authCode, rrn);
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

    private void printReceiptInternal(final double amount, final String currency, final String authCode, final String rrn) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try (Socket printerSocket = new Socket("127.0.0.1", 9100);
                     OutputStream posOut = printerSocket.getOutputStream()) {

                    String dateStr = new SimpleDateFormat("yyyy/MM/dd HH:mm:ss", Locale.US).format(new Date());

                    StringBuilder sb = new StringBuilder();
                    sb.append("\n");
                    sb.append("===============================\n");
                    sb.append("      Z-SYSTEMS SMART POS      \n");
                    sb.append("    ELECTRONIC RECEIPT (EDC)   \n");
                    sb.append("===============================\n");
                    sb.append("DATE/TIME: ").append(dateStr).append("\n");
                    sb.append("TERMINAL : SUNMI-V2PRO-ST\n");
                    sb.append("CARD     : **** **** **** 4242\n");
                    sb.append("SCHEME   : MADA / VISA / DEBIT\n");
                    sb.append("AUTH CODE: ").append(authCode).append("\n");
                    sb.append("RRN      : ").append(rrn).append("\n");
                    sb.append("STATUS   : APPROVED (000000)\n");
                    sb.append("-------------------------------\n");
                    sb.append(String.format(Locale.US, "TOTAL    : %.2f %s\n", amount, currency));
                    sb.append("===============================\n");
                    sb.append("     THANK YOU - MERCI         \n");
                    sb.append("\n\n\n\n");

                    byte[] escInit = new byte[]{0x1B, 0x40};
                    byte[] escCut = new byte[]{0x1D, 0x56, 0x42, 0x00};

                    posOut.write(escInit);
                    posOut.write(sb.toString().getBytes("UTF-8"));
                    posOut.write(escCut);
                    posOut.flush();
                } catch (Exception ignored) {}
            }
        }).start();
    }

    private void closeServers() {
        try {
            if (http8080Server != null && !http8080Server.isClosed()) {
                http8080Server.close();
            }
        } catch (Exception ignored) {}

        try {
            if (tcp10009Server != null && !tcp10009Server.isClosed()) {
                tcp10009Server.close();
            }
        } catch (Exception ignored) {}
    }
}
