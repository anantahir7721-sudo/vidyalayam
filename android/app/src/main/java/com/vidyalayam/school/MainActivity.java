package com.vidyalayam.school;

import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();

        // Configure initial status bar appearance based on system day/night mode
        try {
            WindowInsetsControllerCompat insetsController =
                WindowCompat.getInsetsController(window, window.getDecorView());
            if (insetsController != null) {
                int currentNightMode = getResources().getConfiguration().uiMode
                    & android.content.res.Configuration.UI_MODE_NIGHT_MASK;
                boolean isDark = currentNightMode == android.content.res.Configuration.UI_MODE_NIGHT_YES;
                insetsController.setAppearanceLightStatusBars(!isDark);
                insetsController.setAppearanceLightNavigationBars(!isDark);
            }
        } catch (Exception ignored) {}

        // Register Android Native Bridge for seamless printing and PDF handling in APK
        try {
            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().addJavascriptInterface(new AndroidBridgeInterface(), "AndroidBridge");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public class AndroidBridgeInterface {

        @JavascriptInterface
        public boolean isAndroidApp() {
            return true;
        }

        /**
         * Native Print & Save as PDF for Android.
         * Creates an isolated background WebView with the document and invokes the Android System PrintManager.
         */
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

        /**
         * Save base64 PDF directly to Downloads and offer immediate Open / Share chooser.
         */
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
