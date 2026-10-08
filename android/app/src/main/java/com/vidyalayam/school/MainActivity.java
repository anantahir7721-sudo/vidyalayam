package com.vidyalayam.school;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MainActivity extends BridgeActivity {

    public static final String NOTIFICATION_CHANNEL_ID = "vidyalayam_notifications_channel";
    public static final String NOTIFICATION_CHANNEL_NAME = "વિદ્યાલયમ સૂચનાઓ (Vidyalayam Notifications)";
    private static final int NOTIFICATION_PERMISSION_REQUEST_CODE = 101;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();

        // Configure edge-to-edge full screen with transparent system bars
        try {
            WindowCompat.setDecorFitsSystemWindows(window, false);
            window.setStatusBarColor(Color.TRANSPARENT);
            window.setNavigationBarColor(Color.TRANSPARENT);

            WindowInsetsControllerCompat insetsController =
                WindowCompat.getInsetsController(window, window.getDecorView());
            if (insetsController != null) {
                int currentNightMode = getResources().getConfiguration().uiMode
                    & android.content.res.Configuration.UI_MODE_NIGHT_MASK;
                boolean isDark = currentNightMode == android.content.res.Configuration.UI_MODE_NIGHT_YES;
                insetsController.setAppearanceLightStatusBars(!isDark);
                insetsController.setAppearanceLightNavigationBars(!isDark);
            }

            ViewCompat.setOnApplyWindowInsetsListener(window.getDecorView(), (v, insets) -> {
                try {
                    Insets statusBarInsets = insets.getInsets(WindowInsetsCompat.Type.statusBars());
                    Insets navBarInsets = insets.getInsets(WindowInsetsCompat.Type.navigationBars());
                    float density = getResources().getDisplayMetrics().density;
                    float d = density > 0 ? density : 1.0f;
                    int statusBarDp = Math.round(statusBarInsets.top / d);
                    int navBarDp = Math.round(navBarInsets.bottom / d);
                    if (statusBarDp <= 0) {
                        statusBarDp = getStatusBarHeightDp();
                    }
                    final int finalStatusDp = statusBarDp;
                    final int finalNavDp = navBarDp;
                    if (bridge != null && bridge.getWebView() != null) {
                        bridge.getWebView().post(() -> {
                            bridge.getWebView().evaluateJavascript(
                                "document.documentElement.style.setProperty('--system-status-bar-height', '" + finalStatusDp + "px');" +
                                "document.documentElement.style.setProperty('--safe-area-top', '" + finalStatusDp + "px');" +
                                "document.documentElement.style.setProperty('--system-nav-bar-height', '" + finalNavDp + "px');" +
                                "document.documentElement.style.setProperty('--safe-area-bottom', '" + finalNavDp + "px');",
                                null
                            );
                        });
                    }
                } catch (Exception ignored) {}
                return insets;
            });
        } catch (Exception ignored) {}

        // Initialize Android Notification Channel
        createNotificationChannel();

        // Request notification permission immediately on first launch (Android 13+)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    ActivityCompat.requestPermissions(
                        this,
                        new String[]{Manifest.permission.POST_NOTIFICATIONS},
                        NOTIFICATION_PERMISSION_REQUEST_CODE
                    );
                }
            }
        } catch (Exception ignored) {}

        // Register Android Native Bridge for seamless printing, PDF handling and native notifications
        try {
            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().addJavascriptInterface(new AndroidBridgeInterface(), "AndroidBridge");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                NotificationChannel channel = new NotificationChannel(
                    NOTIFICATION_CHANNEL_ID,
                    NOTIFICATION_CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("શાળા સૂચનાઓ, દૈનિક પરિપત્ર, પરીક્ષા અને સ્ટાફ એલર્ટ્સ");
                channel.enableLights(true);
                channel.setLightColor(Color.parseColor("#9d512d"));
                channel.enableVibration(true);
                channel.setVibrationPattern(new long[]{0, 250, 150, 250});

                NotificationManager manager = getSystemService(NotificationManager.class);
                if (manager != null) {
                    manager.createNotificationChannel(channel);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    public int getStatusBarHeightDp() {
        int result = 0;
        try {
            int resourceId = getResources().getIdentifier("status_bar_height", "dimen", "android");
            if (resourceId > 0) {
                int px = getResources().getDimensionPixelSize(resourceId);
                float density = getResources().getDisplayMetrics().density;
                result = Math.round(px / (density > 0 ? density : 1.0f));
            }
        } catch (Exception ignored) {}
        return result > 0 ? result : 28;
    }

    public class AndroidBridgeInterface {

        @JavascriptInterface
        public boolean isAndroidApp() {
            return true;
        }

        @JavascriptInterface
        public int getStatusBarHeight() {
            return getStatusBarHeightDp();
        }

        @JavascriptInterface
        public void setStatusBarTheme(final boolean isDark) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        Window window = getWindow();
                        WindowInsetsControllerCompat insetsController =
                            WindowCompat.getInsetsController(window, window.getDecorView());
                        if (insetsController != null) {
                            // isDark: false for appearanceLightStatusBars means white icons for dark theme
                            // isDark: true for appearanceLightStatusBars means dark icons for light theme
                            insetsController.setAppearanceLightStatusBars(!isDark);
                            insetsController.setAppearanceLightNavigationBars(!isDark);
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            });
        }

        @JavascriptInterface
        public void setStatusBarColor(final String hexColor) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        if (hexColor != null && !hexColor.isEmpty()) {
                            getWindow().setStatusBarColor(Color.parseColor(hexColor));
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            });
        }

        // ================= NOTIFICATION METHODS ================= //

        @JavascriptInterface
        public boolean hasNotificationPermission() {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    return ContextCompat.checkSelfPermission(
                        MainActivity.this,
                        Manifest.permission.POST_NOTIFICATIONS
                    ) == PackageManager.PERMISSION_GRANTED;
                } else {
                    return NotificationManagerCompat.from(MainActivity.this).areNotificationsEnabled();
                }
            } catch (Exception e) {
                e.printStackTrace();
                return false;
            }
        }

        @JavascriptInterface
        public void requestNotificationPermission() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                            if (ContextCompat.checkSelfPermission(
                                MainActivity.this,
                                Manifest.permission.POST_NOTIFICATIONS
                            ) != PackageManager.PERMISSION_GRANTED) {
                                ActivityCompat.requestPermissions(
                                    MainActivity.this,
                                    new String[]{Manifest.permission.POST_NOTIFICATIONS},
                                    NOTIFICATION_PERMISSION_REQUEST_CODE
                                );
                            } else {
                                Toast.makeText(MainActivity.this, "સૂચના પરવાનગી પહેલેથી જ માન્ય છે", Toast.LENGTH_SHORT).show();
                            }
                        } else {
                            if (!NotificationManagerCompat.from(MainActivity.this).areNotificationsEnabled()) {
                                openNotificationSettings();
                            } else {
                                Toast.makeText(MainActivity.this, "સૂચનાઓ પહેલેથી જ સક્ષમ છે", Toast.LENGTH_SHORT).show();
                            }
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            });
        }

        @JavascriptInterface
        public void openNotificationSettings() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        Intent intent = new Intent();
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            intent.setAction(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                            intent.putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName());
                        } else {
                            intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                            intent.setData(Uri.parse("package:" + getPackageName()));
                        }
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                    } catch (Exception e) {
                        e.printStackTrace();
                        try {
                            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                            intent.setData(Uri.parse("package:" + getPackageName()));
                            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(intent);
                        } catch (Exception fallbackErr) {
                            fallbackErr.printStackTrace();
                        }
                    }
                }
            });
        }

        @JavascriptInterface
        public void showNativeNotification(final String title, final String body, final String type) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        if (!hasNotificationPermission()) {
                            requestNotificationPermission();
                            return;
                        }

                        Intent intent = new Intent(MainActivity.this, MainActivity.class);
                        intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                        intent.putExtra("notification_type", type != null ? type : "general");

                        int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
                        }

                        PendingIntent pendingIntent = PendingIntent.getActivity(
                            MainActivity.this,
                            (int) System.currentTimeMillis(),
                            intent,
                            pendingFlags
                        );

                        int iconRes = getApplicationInfo().icon;
                        if (iconRes == 0) {
                            iconRes = android.R.drawable.ic_dialog_info;
                        }

                        NotificationCompat.Builder builder = new NotificationCompat.Builder(MainActivity.this, NOTIFICATION_CHANNEL_ID)
                            .setSmallIcon(iconRes)
                            .setContentTitle(title != null ? title : "વિદ્યાલયમ સૂચના")
                            .setContentText(body != null ? body : "")
                            .setStyle(new NotificationCompat.BigTextStyle().bigText(body != null ? body : ""))
                            .setPriority(NotificationCompat.PRIORITY_HIGH)
                            .setDefaults(NotificationCompat.DEFAULT_ALL)
                            .setAutoCancel(true)
                            .setColor(Color.parseColor("#9d512d"))
                            .setContentIntent(pendingIntent);

                        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(MainActivity.this);
                        int notificationId = (int) (System.currentTimeMillis() % 100000);
                        notificationManager.notify(notificationId, builder.build());

                    } catch (SecurityException secErr) {
                        secErr.printStackTrace();
                        Toast.makeText(MainActivity.this, "સૂચના મોકલવા માટે પરવાનગી આપો", Toast.LENGTH_SHORT).show();
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            });
        }

        // ================= PRINT & PDF METHODS ================= //

        @JavascriptInterface
        public void printHtml(final String html, final String jobName) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        final WebView printWebView = new WebView(MainActivity.this);
                        printWebView.getSettings().setJavaScriptEnabled(true);
                        printWebView.getSettings().setDomStorageEnabled(true);
                        printWebView.getSettings().setDefaultTextEncodingName("UTF-8");

                        printWebView.setWebViewClient(new WebViewClient() {
                            @Override
                            public void onPageFinished(WebView view, String url) {
                                try {
                                    PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                                    if (printManager != null) {
                                        String title = (jobName != null && !jobName.trim().isEmpty())
                                            ? jobName.trim().replaceAll("[\\\\/:*?\"<>|]", "_")
                                            : "Vidyalayam_Document";
                                        PrintDocumentAdapter printAdapter = view.createPrintDocumentAdapter(title);
                                        PrintAttributes attributes = new PrintAttributes.Builder()
                                            .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                                            .setResolution(new PrintAttributes.Resolution("vidyalayam_print", "Print", 300, 300))
                                            .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                                            .build();
                                        printManager.print(title, printAdapter, attributes);
                                    }
                                } catch (Exception e) {
                                    e.printStackTrace();
                                    Toast.makeText(MainActivity.this, "પ્રિન્ટ શરૂ કરવામાં ક્ષતિ આવી", Toast.LENGTH_SHORT).show();
                                }
                            }
                        });

                        printWebView.loadDataWithBaseURL("https://localhost", html, "text/html; charset=utf-8", "UTF-8", null);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            });
        }

        @JavascriptInterface
        public void saveBase64Pdf(final String base64Data, final String rawFilename, final String mimeType) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        final String filename = (rawFilename != null && !rawFilename.trim().isEmpty())
                            ? rawFilename.trim()
                            : "Vidyalayam_Document_" + System.currentTimeMillis() + ".pdf";
                        final String actualMime = (mimeType != null && !mimeType.trim().isEmpty())
                            ? mimeType
                            : "application/pdf";

                        byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);

                        // 1. Save to app cache for FileProvider intent sharing/viewing
                        File cacheDir = getCacheDir();
                        File outputFile = new File(cacheDir, filename);
                        FileOutputStream fos = new FileOutputStream(outputFile);
                        fos.write(bytes);
                        fos.flush();
                        fos.close();

                        // 2. Also save directly to user's device Downloads folder
                        try {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                                ContentValues values = new ContentValues();
                                values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
                                values.put(MediaStore.Downloads.MIME_TYPE, actualMime);
                                values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Vidyalayam");
                                Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                                if (uri != null) {
                                    OutputStream os = getContentResolver().openOutputStream(uri);
                                    if (os != null) {
                                        os.write(bytes);
                                        os.flush();
                                        os.close();
                                    }
                                }
                            } else {
                                File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                                File targetFile = new File(downloadsDir, filename);
                                FileOutputStream dfos = new FileOutputStream(targetFile);
                                dfos.write(bytes);
                                dfos.flush();
                                dfos.close();
                            }
                        } catch (Exception saveErr) {
                            saveErr.printStackTrace();
                        }

                        Toast.makeText(MainActivity.this, "PDF ડાઉનલોડ થઈ: " + filename, Toast.LENGTH_SHORT).show();

                        // 3. Open chooser so user can view with PDF viewer or share via WhatsApp
                        try {
                            Uri contentUri = FileProvider.getUriForFile(
                                MainActivity.this,
                                getPackageName() + ".fileprovider",
                                outputFile
                            );
                            Intent viewIntent = new Intent(Intent.ACTION_VIEW);
                            viewIntent.setDataAndType(contentUri, actualMime);
                            viewIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                            viewIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                            Intent chooser = Intent.createChooser(viewIntent, "PDF ઓપન કરો અથવા શેર કરો");
                            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(chooser);
                        } catch (Exception intentErr) {
                            intentErr.printStackTrace();
                        }

                    } catch (Exception e) {
                        e.printStackTrace();
                        Toast.makeText(MainActivity.this, "PDF સેવ કરવામાં ક્ષતિ: " + e.getMessage(), Toast.LENGTH_LONG).show();
                    }
                }
            });
        }
    }
}
