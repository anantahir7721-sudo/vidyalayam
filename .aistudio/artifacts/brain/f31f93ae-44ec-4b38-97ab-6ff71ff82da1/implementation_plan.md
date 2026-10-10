# Implementation Plan: In-App Personalized Notifications, WhatsApp Group Result Summary & GitHub Update Checker

Building a lightweight, robust, and quota-safe notification ecosystem covering personalized in-app notifications for students, clean class summary table generation for WhatsApp group sharing, timed exam reminders, and a GitHub `version.json` update notifier.

## Proposed Phasing & Architecture (Quota-Safe)

To prevent token quota exhaustion and keep changes atomic and stable, the implementation is partitioned into 3 independent, verifiable phases:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 1: 1-Click Personalized In-App Student Notifications (Firebase)  │
│  - Bulk personalized dispatch in SendExamResultModal & AnalyticsModal  │
│  - Realtime Bell listener in StudentPortal for student's own results   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│ Phase 2: Class Summary Table for WhatsApp Group Sharing                │
│  - 1-Click formatted text table generator (Roll, Name, Marks, %, Pass) │
│  - One-tap WhatsApp group share with auto-copied text preview modal    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│ Phase 3: GitHub version.json App Update Checker & Event Alerts        │
│  - /public/version.json manifest & client-side update detector         │
│  - Admin workflow notifications (admission approve, password reset)    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## User Review Required

> [!IMPORTANT]
> The app update check will query `version.json`. By default, it checks the local/hosted `/version.json` and optionally the raw GitHub repository URL if specified in the school/admin configuration.
> All notification text will be kept concise (short Gujarati titles and direct metrics) to prevent screen clutter.

---

## Proposed Changes

### Phase 1: 1-Click Personalized In-App Student Notifications

#### [SendExamResultModal.tsx](file:///src/components/SendExamResultModal.tsx) & [OnlineExamAnalyticsModal.tsx](file:///src/components/OnlineExamAnalyticsModal.tsx)
- Add a prominent primary button: **"૧-ક્લિકમાં બધાને ઍપ નોટિફિકેશન મોકલો (Send In-App Notification)"**.
- When clicked:
  - Iterates through the selected students / exam attempts.
  - Builds an individualized record for each student:
    - Target: `studentId`
    - Title: `📊 ${exam.title} - તમારું પરિણામ`
    - Body: `${student.studentName}, આપના મેળવેલ ગુણ: ${score}/${total} (${percentage}%). ${isPass ? 'પાસ (PASS)' : 'સુધારણા જરૂરી'}.`
    - Category: `exam_result`
  - Uses `createBulkStudentNotifications` in `src/services/notificationService.ts` via Firestore `writeBatch` for atomic, instant dispatch.
  - Displays instant success toast with the number of personalized notifications sent.

#### [StudentPortal.tsx](file:///src/components/StudentPortal.tsx)
- Ensure the realtime notification subscription (`subscribeToStudentNotifications`) displays incoming result notifications instantly in the top header bell icon with a pulsing unread badge.
- Clicking the notification opens the personal result or navigates to the result tab.

---

### Phase 2: WhatsApp Class Summary Table for Group Sharing

#### [SendExamResultModal.tsx](file:///src/components/SendExamResultModal.tsx) & [OnlineExamAnalyticsModal.tsx](file:///src/components/OnlineExamAnalyticsModal.tsx)
- Add **"WhatsApp ગ્રૂપ સમરી શેર કરો (Share Class Summary to Group)"** button.
- Generates a neat, monospace-aligned WhatsApp message:
  ```text
  🏫 *શ્રી [શાળાનું નામ]*
  📊 *ઓનલાઇન કસોટી પરિણામ પત્રક*
  📝 વિષય: [વિષય] | ધોરણ: [ધોરણ] | પરીક્ષા: [નામ]
  ------------------------------------
  ક્રમ | રોલ | વિદ્યાર્થીનું નામ | ગુણ / કુલ | %
  ------------------------------------
  1. 01 અજય પટેલ - 24/25 (96%) પાસ
  2. 02 ભાવના ઠાકોર - 22/25 (88%) પાસ
  ...
  ------------------------------------
  📈 કુલ વિદ્યાર્થી: [X] | પાસ: [Y] ([Z]%) | સરેરાશ: [A]
  ```
- Launches WhatsApp group selector via `https://wa.me/?text=...` with a fallback copy-to-clipboard button.

---

### Phase 3: GitHub Update Checker & Event Alerts

#### [public/version.json](file:///public/version.json)
- Create `/public/version.json` containing current semantic version:
  ```json
  {
    "version": "1.0.2",
    "build": 2,
    "releaseDate": "2026-10-10",
    "releaseNotes": "પર્સનલાઇઝ્ડ ઍપ નોટિફિકેશન અને WhatsApp ગ્રૂપ પરિણામ શેરિંગ"
  }
  ```

#### [AppUpdateBanner.tsx](file:///src/components/AppUpdateBanner.tsx)
- Lightweight component checking `/version.json` periodically (or GitHub raw URL).
- If a newer version is detected, renders a discreet, non-blocking notification banner:
  - *"🚀 વિદ્યાલયમ્ નું નવું વર્ઝન (vX.Y.Z) ઉપલબ્ધ છે. [અપડેટ કરો / રિફ્રેશ કરો]"*

#### Admin & Workflow Alerts
- When admin approves an admission in `AdmissionManager.tsx`, send an in-app notification to the student/parent target.
- When a password reset request is made, dispatch an in-app alert to `system_notifications` for the Admin.

---

## Verification Plan

### Automated Tests & Compiles
- `compile_applet`: Verify zero TypeScript/build errors after each phase.
- `lint_applet`: Verify zero ESLint or `tsc --noEmit` issues.

### Manual Verification Flows
1. **In-App Personalized Result**:
   - Open exam analytics -> Click "૧-ક્લિકમાં બધાને ઍપ નોટિફિકેશન મોકલો".
   - Login as student A -> Verify Bell icon displays ONLY Student A's result with their exact score.
   - Login as student B -> Verify Student B only sees Student B's score.
2. **WhatsApp Group Summary**:
   - Click "WhatsApp ગ્રૂપ સમરી શેર કરો" -> Verify WhatsApp text structure with school header, student rows, and pass/average footer.
3. **App Update Banner**:
   - Check version banner behavior when a newer version tag is detected.
