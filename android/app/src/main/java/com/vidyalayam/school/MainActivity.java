package com.vidyalayam.school;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.PowerManager;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
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
    private WebView mPrintWebView = null;

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
        registerAndroidBridge();

        // Schedule exact background routine notifications (06:00 AM, 02:00 PM, 06:00 PM)
        try {
            NotificationAlarmReceiver.scheduleAllRoutineAlarms(this);
        } catch (Exception ignored) {}
    }

    private Uri pendingInstallApkUri = null;

    @Override
    public void onResume() {
        super.onResume();
        registerAndroidBridge();
        try {
            NotificationAlarmReceiver.scheduleAllRoutineAlarms(this);
        } catch (Exception ignored) {}

        // Resume pending APK installation if permission was just granted
        if (pendingInstallApkUri != null) {
            try {
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || getPackageManager().canRequestPackageInstalls()) {
                    Uri toInstall = pendingInstallApkUri;
                    pendingInstallApkUri = null;
                    Intent installIntent = new Intent(Intent.ACTION_VIEW);
                    installIntent.setDataAndType(toInstall, "application/vnd.android.package-archive");
                    installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(installIntent);
                }
            } catch (Exception resumeErr) {
                resumeErr.printStackTrace();
            }
        }
    }

    private void registerAndroidBridge() {
        try {
            if (bridge != null && bridge.getWebView() != null) {
                WebView wv = bridge.getWebView();
                wv.addJavascriptInterface(new AndroidBridgeInterface(), "AndroidBridge");
                WebSettings settings = wv.getSettings();
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
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

        @JavascriptInterface
        public void scheduleAllRoutineAlarms() {
            try {
                NotificationAlarmReceiver.scheduleAllRoutineAlarms(MainActivity.this);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        @JavascriptInterface
        public boolean isBatteryOptimizationIgnored() {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                    return pm != null && pm.isIgnoringBatteryOptimizations(getPackageName());
                }
                return true;
            } catch (Exception e) {
                e.printStackTrace();
                return true;
            }
        }

        @JavascriptInterface
        public void requestDisableBatteryOptimization() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                            if (pm != null && !pm.isIgnoringBatteryOptimizations(getPackageName())) {
                                try {
                                    Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                                    intent.setData(Uri.parse("package:" + getPackageName()));
                                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                    startActivity(intent);
                                } catch (Exception ex) {
                                    Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                    startActivity(intent);
                                }
                            } else {
                                Toast.makeText(MainActivity.this, "બેટરી ઑપ્ટિમાઇઝેશન પહેલેથી જ બંધ છે (સૂચનાઓ સમયસર આવશે)", Toast.LENGTH_SHORT).show();
                            }
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            });
        }

        // ================= STUDENT SESSION PERSISTENCE ================= //

        @JavascriptInterface
        public void saveStudentSession(String sessionJson) {
            try {
                if (sessionJson != null) {
                    SharedPreferences prefs = getSharedPreferences("vidyalayam_student_prefs", Context.MODE_PRIVATE);
                    prefs.edit().putString("saved_student_session", sessionJson).apply();
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        @JavascriptInterface
        public String getStudentSession() {
            try {
                SharedPreferences prefs = getSharedPreferences("vidyalayam_student_prefs", Context.MODE_PRIVATE);
                return prefs.getString("saved_student_session", null);
            } catch (Exception e) {
                e.printStackTrace();
                return null;
            }
        }

        @JavascriptInterface
        public void clearStudentSession() {
            try {
                SharedPreferences prefs = getSharedPreferences("vidyalayam_student_prefs", Context.MODE_PRIVATE);
                prefs.edit().remove("saved_student_session").apply();
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        // ================= PRINT & PDF METHODS ================= //

        @JavascriptInterface
        public void printHtml(final String html, final String jobName) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        mPrintWebView = new WebView(MainActivity.this);
                        mPrintWebView.getSettings().setJavaScriptEnabled(true);
                        mPrintWebView.getSettings().setDomStorageEnabled(true);
                        mPrintWebView.getSettings().setDefaultTextEncodingName("UTF-8");

                        mPrintWebView.setWebViewClient(new WebViewClient() {
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

                        mPrintWebView.layout(0, 0, 794, 1120);
                        mPrintWebView.loadDataWithBaseURL("https://localhost", html, "text/html", "UTF-8", null);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            });
        }

        @JavascriptInterface
        public void print() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                        WebView activeView = (bridge != null && bridge.getWebView() != null) ? bridge.getWebView() : null;
                        if (printManager != null && activeView != null) {
                            String title = "Vidyalayam_Print_" + System.currentTimeMillis();
                            PrintDocumentAdapter printAdapter = activeView.createPrintDocumentAdapter(title);
                            PrintAttributes attributes = new PrintAttributes.Builder()
                                .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                                .build();
                            printManager.print(title, printAdapter, attributes);
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                        Toast.makeText(MainActivity.this, "પ્રિન્ટ શરૂ કરવામાં ક્ષતિ આવી", Toast.LENGTH_SHORT).show();
                    }
                }
            });
        }

        @JavascriptInterface
        public void downloadBase64Pdf(final String base64Data, final String rawFilename, final String mimeType) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        String cleanName = (rawFilename != null && !rawFilename.trim().isEmpty())
                            ? rawFilename.trim().replaceAll("[\\\\/:*?\"<>|]", "_")
                            : "Vidyalayam_Document_" + System.currentTimeMillis() + ".pdf";
                        if (!cleanName.toLowerCase().endsWith(".pdf")) {
                            cleanName += ".pdf";
                        }
                        final String filename = cleanName;
                        final String actualMime = (mimeType != null && !mimeType.trim().isEmpty())
                            ? mimeType
                            : "application/pdf";

                        byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);

                        // Destination: Downloads/Vidyalayam folder (downloads/vidyalayam)
                        final String SUBFOLDER = "Vidyalayam";
                        final String RELATIVE_DOWNLOAD_PATH = Environment.DIRECTORY_DOWNLOADS + "/" + SUBFOLDER;

                        Uri mediaStoreUri = null;
                        File savedDirectFile = null;
                        boolean savedSuccessfully = false;

                        // 1. Direct filesystem save to public Downloads/Vidyalayam folder
                        try {
                            File publicDownloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                            File vidyalayamFolder = new File(publicDownloadsDir, SUBFOLDER);
                            if (!vidyalayamFolder.exists()) {
                                vidyalayamFolder.mkdirs();
                            }
                            if (vidyalayamFolder.exists()) {
                                File targetFile = new File(vidyalayamFolder, filename);
                                FileOutputStream fos = new FileOutputStream(targetFile);
                                fos.write(bytes);
                                fos.flush();
                                fos.close();
                                savedDirectFile = targetFile;
                                savedSuccessfully = true;

                                // Broadcast to MediaScanner so Android Gallery / Files / Downloads index it immediately
                                MediaScannerConnection.scanFile(
                                    MainActivity.this,
                                    new String[]{targetFile.getAbsolutePath()},
                                    new String[]{actualMime},
                                    null
                                );
                            }
                        } catch (Exception directErr) {
                            directErr.printStackTrace();
                        }

                        // 2. Also register in MediaStore Downloads/Vidyalayam for Android 10+ (Q+) scoped storage
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            try {
                                ContentValues values = new ContentValues();
                                values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
                                values.put(MediaStore.MediaColumns.MIME_TYPE, actualMime);
                                values.put(MediaStore.MediaColumns.RELATIVE_PATH, RELATIVE_DOWNLOAD_PATH);
                                values.put(MediaStore.MediaColumns.IS_PENDING, 1);

                                Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                                if (uri == null) {
                                    values.put(MediaStore.MediaColumns.RELATIVE_PATH, "Download/" + SUBFOLDER);
                                    uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                                }

                                if (uri != null) {
                                    OutputStream os = getContentResolver().openOutputStream(uri);
                                    if (os != null) {
                                        os.write(bytes);
                                        os.flush();
                                        os.close();
                                        savedSuccessfully = true;
                                        mediaStoreUri = uri;
                                    }
                                    values.clear();
                                    values.put(MediaStore.MediaColumns.IS_PENDING, 0);
                                    getContentResolver().update(uri, values, null, null);
                                }
                            } catch (Exception qErr) {
                                qErr.printStackTrace();
                            }
                        }

                        // 3. Fallback to App External Files directory Downloads/Vidyalayam if public Downloads was blocked
                        if (!savedSuccessfully) {
                            try {
                                File extFilesDir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                                if (extFilesDir != null) {
                                    File vidyalayamFolder = new File(extFilesDir, SUBFOLDER);
                                    if (!vidyalayamFolder.exists()) vidyalayamFolder.mkdirs();
                                    File extFile = new File(vidyalayamFolder, filename);
                                    FileOutputStream efos = new FileOutputStream(extFile);
                                    efos.write(bytes);
                                    efos.flush();
                                    efos.close();
                                    savedDirectFile = extFile;
                                    savedSuccessfully = true;
                                }
                            } catch (Exception extErr) {
                                extErr.printStackTrace();
                            }
                        }

                        // Determine the best Content Uri to open and notify (Points to Downloads/Vidyalayam)
                        Uri launchUri = null;
                        if (savedDirectFile != null && savedDirectFile.exists()) {
                            try {
                                launchUri = FileProvider.getUriForFile(
                                    MainActivity.this,
                                    getPackageName() + ".fileprovider",
                                    savedDirectFile
                                );
                            } catch (Exception fpErr) {
                                fpErr.printStackTrace();
                            }
                        }
                        if (launchUri == null && mediaStoreUri != null) {
                            launchUri = mediaStoreUri;
                        }

                        // 4. User feedback Toast confirming exact folder location
                        Toast.makeText(
                            MainActivity.this,
                            "✅ PDF સફળતાપૂર્વક ડાઉનલોડ થઈ ગઈ: Downloads/Vidyalayam/" + filename,
                            Toast.LENGTH_LONG
                        ).show();

                        // 5. System Notification with Tap to Open
                        if (launchUri != null) {
                            try {
                                Intent viewIntent = new Intent(Intent.ACTION_VIEW);
                                viewIntent.setDataAndType(launchUri, actualMime);
                                viewIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                                viewIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                                int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                    pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
                                }

                                PendingIntent pendingIntent = PendingIntent.getActivity(
                                    MainActivity.this,
                                    (int) System.currentTimeMillis(),
                                    Intent.createChooser(viewIntent, "PDF ઓપન કરો (Downloads/Vidyalayam)"),
                                    pendingFlags
                                );

                                int iconRes = getApplicationInfo().icon;
                                if (iconRes == 0) iconRes = android.R.drawable.stat_sys_download_done;

                                NotificationCompat.Builder builder = new NotificationCompat.Builder(MainActivity.this, NOTIFICATION_CHANNEL_ID)
                                    .setSmallIcon(iconRes)
                                    .setContentTitle("📄 PDF ડાઉનલોડ પૂર્ણ (Downloads/Vidyalayam)")
                                    .setContentText(filename + " (ઓપન કરવા અડકો)")
                                    .setStyle(new NotificationCompat.BigTextStyle().bigText("ફાઈલ Downloads/Vidyalayam ફોલ્ડરમાં સેવ થઈ ગઈ છે: " + filename + "\nઓપન કરવા માટે અહીં ક્લિક કરો."))
                                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                                    .setAutoCancel(true)
                                    .setColor(Color.parseColor("#9d512d"))
                                    .setContentIntent(pendingIntent);

                                NotificationManagerCompat notificationManager = NotificationManagerCompat.from(MainActivity.this);
                                notificationManager.notify((int) (System.currentTimeMillis() % 100000), builder.build());
                            } catch (Exception notifErr) {
                                notifErr.printStackTrace();
                            }
                        }

                        // 6. IMMEDIATELY launch Open Chooser so the user can instantly open and view their downloaded PDF
                        if (launchUri != null) {
                            try {
                                Intent openIntent = new Intent(Intent.ACTION_VIEW);
                                openIntent.setDataAndType(launchUri, actualMime);
                                openIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                                openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                                Intent openChooser = Intent.createChooser(openIntent, "PDF ઓપન કરો (Downloads/Vidyalayam)");
                                openChooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                startActivity(openChooser);
                            } catch (Exception openErr) {
                                openErr.printStackTrace();
                            }
                        }

                    } catch (Exception e) {
                        e.printStackTrace();
                        Toast.makeText(MainActivity.this, "PDF ડાઉનલોડ કરવામાં ક્ષતિ: " + e.getMessage(), Toast.LENGTH_LONG).show();
                    }
                }
            });
        }

        @JavascriptInterface
        public void shareBase64Pdf(final String base64Data, final String rawFilename, final String mimeType, final String shareText) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        String cleanName = (rawFilename != null && !rawFilename.trim().isEmpty())
                            ? rawFilename.trim().replaceAll("[\\\\/:*?\"<>|]", "_")
                            : "Vidyalayam_Document_" + System.currentTimeMillis() + ".pdf";
                        if (!cleanName.toLowerCase().endsWith(".pdf")) {
                            cleanName += ".pdf";
                        }
                        final String filename = cleanName;
                        final String actualMime = (mimeType != null && !mimeType.trim().isEmpty())
                            ? mimeType
                            : "application/pdf";

                        byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);

                        // Save to Downloads/Vidyalayam folder
                        File publicDownloads = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                        File vidyalayamFolder = new File(publicDownloads, "Vidyalayam");
                        if (!vidyalayamFolder.exists()) {
                            vidyalayamFolder.mkdirs();
                        }
                        File targetFile = new File(vidyalayamFolder, filename);
                        if (!vidyalayamFolder.canWrite()) {
                            File extFiles = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                            File extVidyalayam = new File(extFiles, "Vidyalayam");
                            if (!extVidyalayam.exists()) extVidyalayam.mkdirs();
                            targetFile = new File(extVidyalayam, filename);
                        }
                        FileOutputStream fos = new FileOutputStream(targetFile);
                        fos.write(bytes);
                        fos.flush();
                        fos.close();

                        MediaScannerConnection.scanFile(
                            MainActivity.this,
                            new String[]{targetFile.getAbsolutePath()},
                            new String[]{actualMime},
                            null
                        );

                        Uri contentUri = FileProvider.getUriForFile(
                            MainActivity.this,
                            getPackageName() + ".fileprovider",
                            targetFile
                        );

                        Intent shareIntent = new Intent(Intent.ACTION_SEND);
                        shareIntent.setType(actualMime);
                        shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                        if (shareText != null && !shareText.trim().isEmpty()) {
                            shareIntent.putExtra(Intent.EXTRA_TEXT, shareText.trim());
                        }
                        shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        shareIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                        Intent chooser = Intent.createChooser(shareIntent, "PDF શેર કરો (WhatsApp)");
                        chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(chooser);

                    } catch (Exception e) {
                        e.printStackTrace();
                        Toast.makeText(MainActivity.this, "PDF શેર કરવામાં ક્ષતિ: " + e.getMessage(), Toast.LENGTH_LONG).show();
                    }
                }
            });
        }

        @JavascriptInterface
        public void saveBase64Pdf(final String base64Data, final String rawFilename, final String mimeType) {
            downloadBase64Pdf(base64Data, rawFilename, mimeType);
        }

        // ================= IN-APP APK DOWNLOAD & AUTO-INSTALL ================= //

        @JavascriptInterface
        public void downloadAndInstallApk(final String apkUrl, final String rawFilename) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Toast.makeText(MainActivity.this, "📥 નવી વિદ્યાલયમ APK ડાઉનલોડ થઈ રહી છે...", Toast.LENGTH_SHORT).show();
                    new Thread(new Runnable() {
                        @Override
                        public void run() {
                            try {
                                String cleanName = (rawFilename != null && !rawFilename.trim().isEmpty())
                                    ? rawFilename.trim().replaceAll("[\\\\/:*?\"<>|]", "_")
                                    : "Vidyalayam-Latest.apk";
                                if (!cleanName.toLowerCase().endsWith(".apk")) {
                                    cleanName += ".apk";
                                }

                                String targetUrlStr = apkUrl != null && !apkUrl.trim().isEmpty()
                                    ? apkUrl.trim()
                                    : "https://github.com/anantahir7721-sudo/vidyalayam/releases/download/latest/app-debug.apk";

                                java.net.URL url = new java.net.URL(targetUrlStr);
                                java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                                conn.setInstanceFollowRedirects(true);
                                conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android) VidyalayamApp");
                                conn.connect();

                                int status = conn.getResponseCode();
                                if (status == java.net.HttpURLConnection.HTTP_MOVED_TEMP ||
                                    status == java.net.HttpURLConnection.HTTP_MOVED_PERM ||
                                    status == 307 || status == 308) {
                                    String newUrl = conn.getHeaderField("Location");
                                    if (newUrl != null) {
                                        conn.disconnect();
                                        url = new java.net.URL(newUrl);
                                        conn = (java.net.HttpURLConnection) url.openConnection();
                                        conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android) VidyalayamApp");
                                        conn.connect();
                                    }
                                }

                                File extFiles = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                                if (extFiles == null) extFiles = getCacheDir();
                                final File apkFile = new File(extFiles, cleanName);
                                if (apkFile.exists()) {
                                    apkFile.delete();
                                }

                                java.io.InputStream in = conn.getInputStream();
                                FileOutputStream out = new FileOutputStream(apkFile);
                                byte[] buffer = new byte[8192];
                                int bytesRead;
                                while ((bytesRead = in.read(buffer)) != -1) {
                                    out.write(buffer, 0, bytesRead);
                                }
                                out.flush();
                                out.close();
                                in.close();
                                conn.disconnect();

                                runOnUiThread(new Runnable() {
                                    @Override
                                    public void run() {
                                        launchApkInstall(apkFile);
                                    }
                                });
                            } catch (final Exception e) {
                                e.printStackTrace();
                                runOnUiThread(new Runnable() {
                                    @Override
                                    public void run() {
                                        Toast.makeText(MainActivity.this, "APK ડાઉનલોડમાં ક્ષતિ: " + e.getMessage(), Toast.LENGTH_LONG).show();
                                    }
                                });
                            }
                        }
                    }).start();
                }
            });
        }

        @JavascriptInterface
        public void installApkFromBase64(final String base64Data, final String rawFilename) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        String cleanName = (rawFilename != null && !rawFilename.trim().isEmpty())
                            ? rawFilename.trim().replaceAll("[\\\\/:*?\"<>|]", "_")
                            : "Vidyalayam-Latest.apk";
                        if (!cleanName.toLowerCase().endsWith(".apk")) cleanName += ".apk";

                        byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);
                        File extFiles = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                        if (extFiles == null) extFiles = getCacheDir();
                        File apkFile = new File(extFiles, cleanName);
                        FileOutputStream fos = new FileOutputStream(apkFile);
                        fos.write(bytes);
                        fos.flush();
                        fos.close();

                        launchApkInstall(apkFile);
                    } catch (Exception e) {
                        e.printStackTrace();
                        Toast.makeText(MainActivity.this, "ઇન્સ્ટોલ કરવામાં ક્ષતિ: " + e.getMessage(), Toast.LENGTH_LONG).show();
                    }
                }
            });
        }
    }

    private void launchApkInstall(File apkFile) {
        try {
            if (apkFile == null || !apkFile.exists()) {
                Toast.makeText(this, "ઇન્સ્ટોલેશન ફાઇલ મળી નથી", Toast.LENGTH_SHORT).show();
                return;
            }

            Uri apkUri = FileProvider.getUriForFile(
                this,
                getPackageName() + ".fileprovider",
                apkFile
            );

            Intent installIntent = new Intent(Intent.ACTION_VIEW);
            installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (!getPackageManager().canRequestPackageInstalls()) {
                    pendingInstallApkUri = apkUri;
                    Toast.makeText(this, "કૃપા કરીને વિદ્યાલયમ માટે 'Allow from this source' ચાલુ કરો જેથી એપ આપોઆપ અપડેટ થઈ શકે", Toast.LENGTH_LONG).show();
                    Intent settingsIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                    settingsIntent.setData(Uri.parse("package:" + getPackageName()));
                    settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(settingsIntent);
                    return;
                }
            }

            startActivity(installIntent);
            Toast.makeText(this, "🚀 વિદ્યાલયમ ઇન્સ્ટોલર ખૂલી રહ્યું છે...", Toast.LENGTH_SHORT).show();
        } catch (Exception err) {
            err.printStackTrace();
            Toast.makeText(this, "ઇન્સ્ટોલ કરવામાં ક્ષતિ: " + err.getMessage(), Toast.LENGTH_LONG).show();
        }
    }
}
