package com.zsystems.app;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.IBinder;
import android.util.Log;

import java.io.OutputStream;
import java.lang.reflect.Method;
import java.net.Socket;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class SunmiPrinterHelper {
    private static final String TAG = "SunmiPrinterHelper";
    private static volatile Object woyouService = null;
    private static volatile boolean isBound = false;

    private static final ServiceConnection conn = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder service) {
            try {
                Class<?> stubClass = Class.forName("woyou.aidlservice.jiuiv5.IWoyouService$Stub");
                Method asInterface = stubClass.getMethod("asInterface", IBinder.class);
                woyouService = asInterface.invoke(null, service);
                isBound = true;
                Log.i(TAG, "Successfully bound to Sunmi IWoyouService");
            } catch (Exception e) {
                Log.w(TAG, "Sunmi IWoyouService reflection bind failed: " + e.getMessage());
            }
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            woyouService = null;
            isBound = false;
        }
    };

    public static void init(Context context) {
        if (isBound) return;
        try {
            Intent intent = new Intent();
            intent.setPackage("woyou.aidlservice.jiuiv5");
            intent.setAction("woyou.aidlservice.jiuiv5.IWoyouService");
            context.getApplicationContext().bindService(intent, conn, Context.BIND_AUTO_CREATE);
        } catch (Exception e) {
            Log.w(TAG, "init bindService error: " + e.getMessage());
        }
    }

    public static void printReceipt(final double amount, final String currency, final String authCode, final String rrn, final String scheme) {
        new Thread(new Runnable() {
            @Override
            public void run() {
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
                sb.append("SCHEME   : ").append(scheme != null && !scheme.isEmpty() ? scheme : "MADA / VISA").append("\n");
                sb.append("AUTH CODE: ").append(authCode).append("\n");
                sb.append("RRN      : ").append(rrn).append("\n");
                sb.append("STATUS   : APPROVED (000000)\n");
                sb.append("-------------------------------\n");
                sb.append(String.format(Locale.US, "TOTAL    : %.2f %s\n", amount, currency));
                sb.append("===============================\n");
                sb.append("     THANK YOU - MERCI         \n");
                sb.append("\n\n\n\n");

                byte[] rawBytes;
                try {
                    byte[] escInit = new byte[]{0x1B, 0x40}; // ESC @ (initialize printer)
                    byte[] textBytes = sb.toString().getBytes("UTF-8");
                    byte[] escCut = new byte[]{0x1D, 0x56, 0x42, 0x00}; // GS V B 0 (cut)

                    rawBytes = new byte[escInit.length + textBytes.length + escCut.length];
                    System.arraycopy(escInit, 0, rawBytes, 0, escInit.length);
                    System.arraycopy(textBytes, 0, rawBytes, escInit.length, textBytes.length);
                    System.arraycopy(escCut, 0, rawBytes, escInit.length + textBytes.length, escCut.length);
                } catch (Exception e) {
                    rawBytes = sb.toString().getBytes();
                }

                // 1. Try Sunmi IWoyouService
                if (woyouService != null) {
                    try {
                        Method sendRAWData = woyouService.getClass().getMethod("sendRAWData", byte[].class, Class.forName("woyou.aidlservice.jiuiv5.ICallback"));
                        sendRAWData.invoke(woyouService, rawBytes, null);
                        Log.i(TAG, "Printed via Sunmi IWoyouService successfully");
                        return;
                    } catch (Exception e) {
                        try {
                            Method printText = woyouService.getClass().getMethod("printText", String.class, Class.forName("woyou.aidlservice.jiuiv5.ICallback"));
                            printText.invoke(woyouService, sb.toString(), null);
                            Method lineWrap = woyouService.getClass().getMethod("lineWrap", int.class, Class.forName("woyou.aidlservice.jiuiv5.ICallback"));
                            lineWrap.invoke(woyouService, 4, null);
                            return;
                        } catch (Exception ignored) {}
                    }
                }

                // 2. Fallback to Local RAW ESC/POS Socket (Port 9100)
                try (Socket printerSocket = new Socket("127.0.0.1", 9100);
                     OutputStream posOut = printerSocket.getOutputStream()) {
                    posOut.write(rawBytes);
                    posOut.flush();
                    Log.i(TAG, "Printed via Port 9100 socket successfully");
                } catch (Exception ignored) {}
            }
        }).start();
    }
}
