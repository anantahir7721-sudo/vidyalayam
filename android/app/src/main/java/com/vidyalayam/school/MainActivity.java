package com.vidyalayam.school;

import android.os.Bundle;
import android.view.View;
import android.view.Window;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();

        // Ensure the activity fits system windows so WebView is never behind the status bar
        WindowCompat.setDecorFitsSystemWindows(window, true);

        // Explicit insets listener for Android 14/15/16 edge-to-edge
        // Guaranteed to shift the content view safely below the status bar on every Android device
        View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            ViewCompat.setOnApplyWindowInsetsListener(contentView, (v, windowInsets) -> {
                int statusBarTop = windowInsets.getInsets(WindowInsetsCompat.Type.statusBars()).top;
                int navBarBottom = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom;
                v.setPadding(0, statusBarTop, 0, navBarBottom);
                return windowInsets;
            });
        }

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
    }
}

