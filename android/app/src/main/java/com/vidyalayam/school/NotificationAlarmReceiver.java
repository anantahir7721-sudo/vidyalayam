package com.vidyalayam.school;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.graphics.Color;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import java.util.Calendar;

/**
 * Background Alarm Receiver for Vidyalayam.
 * Delivers routine notifications ON TIME (06:00 AM, 02:00 PM, 06:00 PM)
 * even when the application is completely closed or device is in sleep/idle mode.
 */
public class NotificationAlarmReceiver extends BroadcastReceiver {

    private static final String TAG = "VidyalayamAlarm";
    public static final String ACTION_ROUTINE_NOTIFICATION = "com.vidyalayam.school.ROUTINE_NOTIFICATION";
    public static final String EXTRA_SLOT = "extra_notification_slot";

    public static final String SLOT_MORNING_06AM = "morning_06am";
    public static final String SLOT_AFTERNOON_02PM = "afternoon_02pm";
    public static final String SLOT_EVENING_06PM = "evening_06pm";

    public static final int REQ_CODE_06AM = 2001;
    public static final int REQ_CODE_02PM = 2002;
    public static final int REQ_CODE_06PM = 2003;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null) return;

        String action = intent.getAction();
        Log.d(TAG, "NotificationAlarmReceiver received action: " + action);

        // WakeLock to guarantee execution during deep sleep
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = null;
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "vidyalayam:routine_alarm_wakelock");
            wakeLock.acquire(10000); // 10 seconds max
        }

        try {
            if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
                Intent.ACTION_MY_PACKAGE_REPLACED.equals(action) ||
                "android.intent.action.QUICKBOOT_POWERON".equals(action) ||
                "com.htc.intent.action.QUICKBOOT_POWERON".equals(action)) {
                // Re-register all alarms on reboot or app update
                scheduleAllRoutineAlarms(context);
                return;
            }

            if (ACTION_ROUTINE_NOTIFICATION.equals(action)) {
                String slot = intent.getStringExtra(EXTRA_SLOT);
                if (slot == null) slot = SLOT_AFTERNOON_02PM;

                dispatchSlotNotification(context, slot);

                // Immediately re-arm this slot for the next day at the exact same hour
                if (SLOT_MORNING_06AM.equals(slot)) {
                    scheduleRoutineAlarm(context, SLOT_MORNING_06AM, 6, 0);
                } else if (SLOT_AFTERNOON_02PM.equals(slot)) {
                    scheduleRoutineAlarm(context, SLOT_AFTERNOON_02PM, 14, 0);
                } else if (SLOT_EVENING_06PM.equals(slot)) {
                    scheduleRoutineAlarm(context, SLOT_EVENING_06PM, 18, 0);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error handling alarm event", e);
        } finally {
            if (wakeLock != null && wakeLock.isHeld()) {
                try {
                    wakeLock.release();
                } catch (Exception ignored) {}
            }
        }
    }

    /**
     * Build and present the native notification in the Android system tray
     */
    private void dispatchSlotNotification(Context context, String slot) {
        ensureNotificationChannel(context);

        String title;
        String body;
        String navType = "daily";
        int notificationId;

        if (SLOT_MORNING_06AM.equals(slot)) {
            title = "📰 દૈનિક તાજા સમાચાર • વિદ્યાલયમ";
            body = "આજના શિક્ષણ અને સામાન્ય જ્ઞાનના તાજા સમાચાર તથા પ્રેરક સુવિચાર ઉપલબ્ધ છે.";
            notificationId = 1006;
        } else if (SLOT_AFTERNOON_02PM.equals(slot)) {
            title = "💡 બપોરનું સામાન્ય જ્ઞાન & જાણવા જેવું • વિદ્યાલયમ";
            body = "આજના રોચક તથ્યો, સુવિચાર અને પાઠ્યપુસ્તક પ્રશ્નોત્તરી અપડેટ થઈ ગઈ છે. સમયસર ચકાસો.";
            notificationId = 1014;
        } else if (SLOT_EVENING_06PM.equals(slot)) {
            title = "🌆 સાંજનું શાળા પરિપત્ર & બુલેટિન • વિદ્યાલયમ";
            body = "આવતીકાલના શૈક્ષણિક આયોજન, પરિપત્રો અને પરીક્ષાની વિગતો ઉપલબ્ધ છે.";
            notificationId = 1018;
            navType = "general";
        } else {
            title = "વિદ્યાલયમ સૂચના";
            body = "નવી શૈક્ષણિક વિગતો ઉપલબ્ધ છે.";
            notificationId = 1099;
        }

        try {
            Intent openIntent = new Intent(context, MainActivity.class);
            openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            openIntent.putExtra("notification_type", navType);

            int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent contentIntent = PendingIntent.getActivity(
                context,
                notificationId,
                openIntent,
                pendingFlags
            );

            ApplicationInfo appInfo = context.getApplicationInfo();
            int iconRes = appInfo.icon != 0 ? appInfo.icon : android.R.drawable.ic_dialog_info;

            NotificationCompat.Builder builder = new NotificationCompat.Builder(
                context,
                MainActivity.NOTIFICATION_CHANNEL_ID
            )
                .setSmallIcon(iconRes)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_EVENT)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setAutoCancel(true)
                .setColor(Color.parseColor("#9d512d"))
                .setContentIntent(contentIntent);

            NotificationManagerCompat manager = NotificationManagerCompat.from(context);
            manager.notify(notificationId, builder.build());
            Log.d(TAG, "Slot notification dispatched: " + slot);
        } catch (SecurityException secErr) {
            Log.w(TAG, "Notification permission missing when dispatching alarm: " + secErr.getMessage());
        } catch (Exception e) {
            Log.e(TAG, "Failed to display notification", e);
        }
    }

    /**
     * Schedule all 3 routine daily alarms (06:00 AM, 02:00 PM, 06:00 PM)
     */
    public static void scheduleAllRoutineAlarms(Context context) {
        if (context == null) return;
        try {
            scheduleRoutineAlarm(context, SLOT_MORNING_06AM, 6, 0);
            scheduleRoutineAlarm(context, SLOT_AFTERNOON_02PM, 14, 0);
            scheduleRoutineAlarm(context, SLOT_EVENING_06PM, 18, 0);
            Log.d(TAG, "All routine alarms (06:00 AM, 02:00 PM, 06:00 PM) scheduled successfully.");
        } catch (Exception e) {
            Log.e(TAG, "Failed to schedule all routine alarms", e);
        }
    }

    /**
     * Set exact alarm that allows wake-up while idle (Doze mode immune)
     */
    public static void scheduleRoutineAlarm(Context context, String slot, int hour, int minute) {
        if (context == null) return;

        try {
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) return;

            Calendar calendar = Calendar.getInstance();
            long nowMs = System.currentTimeMillis();

            calendar.setTimeInMillis(nowMs);
            calendar.set(Calendar.HOUR_OF_DAY, hour);
            calendar.set(Calendar.MINUTE, minute);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);

            // If this slot has already passed today, advance to tomorrow
            if (calendar.getTimeInMillis() <= nowMs) {
                calendar.add(Calendar.DAY_OF_YEAR, 1);
            }

            long triggerAtMs = calendar.getTimeInMillis();

            Intent intent = new Intent(context, NotificationAlarmReceiver.class);
            intent.setAction(ACTION_ROUTINE_NOTIFICATION);
            intent.putExtra(EXTRA_SLOT, slot);

            int requestCode = getRequestCode(slot);
            int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                pendingFlags
            );

            // Cancel any old alarm first
            alarmManager.cancel(pendingIntent);

            // Use setExactAndAllowWhileIdle for accurate firing through battery saver & doze mode
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pendingIntent);
                } else {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pendingIntent);
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pendingIntent);
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAtMs, pendingIntent);
            } else {
                alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAtMs, pendingIntent);
            }

            Log.d(TAG, "Scheduled alarm for slot " + slot + " at " + calendar.getTime());
        } catch (Exception e) {
            Log.e(TAG, "Error scheduling alarm for " + slot, e);
        }
    }

    private static int getRequestCode(String slot) {
        if (SLOT_MORNING_06AM.equals(slot)) return REQ_CODE_06AM;
        if (SLOT_AFTERNOON_02PM.equals(slot)) return REQ_CODE_02PM;
        if (SLOT_EVENING_06PM.equals(slot)) return REQ_CODE_06PM;
        return 2000;
    }

    private static void ensureNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                NotificationManager manager = context.getSystemService(NotificationManager.class);
                if (manager != null) {
                    NotificationChannel channel = manager.getNotificationChannel(MainActivity.NOTIFICATION_CHANNEL_ID);
                    if (channel == null) {
                        channel = new NotificationChannel(
                            MainActivity.NOTIFICATION_CHANNEL_ID,
                            MainActivity.NOTIFICATION_CHANNEL_NAME,
                            NotificationManager.IMPORTANCE_HIGH
                        );
                        channel.setDescription("શાળા સૂચનાઓ, દૈનિક પરિપત્ર, પરીક્ષા અને સ્ટાફ એલર્ટ્સ");
                        channel.enableLights(true);
                        channel.setLightColor(Color.parseColor("#9d512d"));
                        channel.enableVibration(true);
                        channel.setVibrationPattern(new long[]{0, 250, 150, 250});
                        manager.createNotificationChannel(channel);
                    }
                }
            } catch (Exception ignored) {}
        }
    }
}
