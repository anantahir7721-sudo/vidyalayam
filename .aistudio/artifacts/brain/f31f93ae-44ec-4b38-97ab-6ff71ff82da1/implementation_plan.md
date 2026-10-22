# Class 9 Result Module & Marksheet System

A dedicated, comprehensive **Result** tab restricted specifically to **Class 9**, integrating seamlessly with Vidyalayam's existing student database, Firebase backend, and design system. It delivers fast, responsive spreadsheet-style marks entry across desktop and mobile, full exam life-cycle calculations (First Exam, Second Exam, Periodic Tests 1 & 2 with 5-mark conversion, 4-component Internal Assessment, Annual Exam, Final Marksheet with 200/2 conversion, and both 700-mark & 1000-mark Annual Result formats), Siddhi & Krupa grace management, Result Registers, and printable A4 individual marksheets.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Key design and calculation decisions confirmed from Phase 1 interactive clarification:

- **Confirmed Decision 1 (Annual Result Views)**: The Annual Result screen will provide an instant toggle switch between the **700-mark format (7 main subjects)** and the **1000-mark format (10 subjects with 3 additional subjects)**, with 700-mark view as default.
- **Confirmed Decision 2 (Mobile & Desktop Marks Entry)**: Implemented as a **responsive spreadsheet grid with sticky student names and roll numbers**, allowing fast horizontal scrolling and keyboard navigation (Enter/Tab) on both mobile screens and desktop monitors.
- **Confirmed Decision 3 (Siddhi & Krupa Grace Marks)**: Implemented with **Automatic GSEB rule calculation** (1 mark per % above 33% up to 15 marks for Siddhi `#`, and up to 10 marks for Krupa `*` with the $\ge 25$ marks eligibility rule) with an **inline manual override option** allowing teachers to adjust grace marks if needed.
- **Scope Restriction**: Restricted strictly to **Class 9** for this phase. Classes 10, 11, and 12 remain unaffected and deferred as requested.

---

## 1. Overview & Core Concept

- **What It Does**: Adds an official, high-precision **Result** module to Vidyalayam where teachers can record exam marks, manage the 4 internal assessment sub-components (PT1, PT2, Notebook, Subject Competency), compute standardized GSEB conversions ($200 \rightarrow 100$), allocate Siddhi (`#`) and Krupa (`*`) grace marks, view class result registers, and print individual student progress report cards in standard A4 format.
- **Target Audience**: School Principals, Class 9 Class Teachers, and Examination Committee Heads across Gujarat GSEB secondary schools.
- **Key Value**: Eliminates fragile manual Excel files and duplicate data entry by directly using existing Class 9 student records from Cloud Firestore, ensuring instant formula validation, auditability, and offline-tolerant autosave.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Dashboard Navigation**: Teacher clicks the elevated **Result** tab in Vidyalayam. The dashboard loads only students registered in **Class 9** (with division/section selector if applicable).
2. **Exam Mode Selection**: A segmented selector allows switching between the 9 supported exam modes:
   - `First Exam (50M)`
   - `Second Exam (50M)`
   - `Periodic Test 1 (25M)`
   - `Periodic Test 2 (25M)`
   - `Internal Marks (20M Breakdown)`
   - `Annual Exam (80M)`
   - `Final Marksheet (200 → 100)`
   - `Annual Result — 700 marks`
   - `Annual Result — 1000 marks`
3. **Marks Entry Grid**:
   - Displays students sorted by Roll No / GR No.
   - For single-subject entry: All students in one table with exam components.
   - For composite entry (Annual / Marksheet): Sticky student column on the left with horizontal scroll for subjects.
   - Live validation: Rejects values above the maximum (e.g. $>50$ or $>25$ or $>80$) or $<0$. Supports `'AB'` for absent.
   - Live conversion indicator: Shows real-time converted values (e.g., PT1 $19/25 \rightarrow 3.8/5$).
   - Warning dialog when attempting to navigate with unsaved modifications.
4. **Result Register**:
   - Class-wide consolidated matrix with subject marks, totals, percentages, grades, ranks, Siddhi/Krupa badges, and Pass/Needs Improvement statuses.
   - Instant search by Name, Roll No, or GR No, plus status filter (All, Pass, Siddhi, Krupa, Needs Improvement).
   - Toggle button to instantly switch between 700-mark and 1000-mark formats.
   - 1-click A4 Landscape print & PDF export.
5. **Individual Marksheet (Progress Card)**:
   - Student selector with detailed card layout including school logo, DISE code, student GR, photo, component marks, combined $200 \rightarrow 100$ conversions, grade scale, and teacher/principal signature blocks.
   - 1-click A4 Portrait print & PDF export.

### Visual Identity & Layout

- **Aesthetic Direction**: Utilitarian, clean institutional dashboard adhering to the `frontend-design` constitution (zero-pill metadata discipline, clean typographic separators, tabular numbers with `font-mono`).
- **Color Palette**:
  - Terracotta Primary: `#C45A2D` / Dark `#f59c73` (Vidyalayam brand)
  - Surface Backgrounds: Crisp clean whites and slate panels (`bg-white/90` and dark `bg-[#121921]`)
  - Status Indicators: Emerald for Direct Pass (`#047857`), Teal for Siddhi (`#0f766e`), Amber for Krupa (`#b45309`), and Rose for Needs Improvement (`#b91c1c`).
- **Typography**: Clean Gujarati font `Anek Gujarati` paired with `font-mono tabular-nums` for all mark values, percentages, and roll numbers to ensure zero layout jitter.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Storage Architecture for Exam Components**:
  - *Approach*: Store marks under `/schools/{schoolId}/marks/{studentId}_{academicYear}_{examId}_{subjectId}`, with internal assessment sub-fields (`pt1_converted`, `pt2_converted`, `notebook`, `competency`) stored within the internal assessment document.
  - *Why*: Prevents duplicate documents on multiple edits, allows partial saves per subject/exam, and supports multi-teacher simultaneous data entry without race conditions.
- **Decision 2: Separation of Calculations from UI Rendering**:
  - *Approach*: Dedicated utility functions in `src/utils/class9ResultCalculations.ts` for all math (test conversion, internal summation, 200-to-100 conversion, 700M/1000M summation, Siddhi/Krupa allocation, ranking).
  - *Why*: Ensures 100% testable, pure functions that can be verified against edge cases without browser DOM dependencies.
- **Decision 3: Non-Destructive Integration**:
  - *Approach*: Reuse existing `Student` documents and `MarkRecord` interfaces without modifying existing student records or other standards' data.
  - *Why*: Guarantees zero risk of breaking existing admissions, staff, ID cards, birthday, or exam file modules.

---

## 4. Technical Architecture & Data Strategy

### System Architecture & Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Vidyalayam App (App.tsx)                      │
│                                                                        │
│   Navbar (Result Tab)              Dashboard Overview (Result Card)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ activeTab === 'results'
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Class 9 Result Module (Class9ResultManager)           │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Controls Header: Class 9 (Locked) | Section | Academic Year       │  │
│  │ Sub-Nav Tabs: 1. Marks Entry  |  2. Result Register | 3. Marksheet│ │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                   │                                    │
│       ┌───────────────────────────┼───────────────────────────┐        │
│       ▼                           ▼                           ▼        │
│  ┌──────────────┐         ┌───────────────┐           ┌──────────────┐ │
│  │ Marks Entry  │         │Result Register│           │  Individual  │ │
│  │ Spreadsheet  │         │(700M / 1000M) │           │  Marksheet   │ │
│  │ (Sticky Cols)│         │(Filter & Rank)│           │ (A4 Preview) │ │
│  └──────┬───────┘         └───────┬───────┘           └──────┬───────┘ │
│         │                         │                          │         │
└─────────┼─────────────────────────┼──────────────────────────┼─────────┘
          │                         │                          │
          ▼                         ▼                          ▼
┌────────────────────────────────────────────────────────────────────────┐
│        Calculation Engine (class9ResultCalculations.ts)                │
│                                                                        │
│  • PT1 & PT2 (/5)          • Internal Assessment (Sum 20M)            │
│  • Final 200 -> 100 (/2)   • 700M (7 Subjs) & 1000M (10 Subjs)        │
│  • Siddhi (#) & Krupa (*)  • >=25 Promotion Eligibility Check          │
│  • GSEB Grade & Rank Engine                                           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Reads / Writes
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    Cloud Firestore Backend                             │
│   • /schools/{schoolId}/students (Class 9 records - read-only)        │
│   • /schools/{schoolId}/marks/{markDocId} (Class 9 marks)              │
│   • /schools/{schoolId}/standards/9/subjects (Custom school subjects)  │
└────────────────────────────────────────────────────────────────────────┘
```

### Calculation Rules & Formula Verification

1. **Periodic Tests (25M $\rightarrow$ 5M)**:
   $$\text{Converted PT} = \frac{\text{Test Mark (max 25)}}{5}$$
   *Example*: $19 / 5 = 3.8 / 5$.
2. **Internal Assessment (20M)**:
   $$\text{Internal} = \text{PT1}_{\text{conv}} (5) + \text{PT2}_{\text{conv}} (5) + \text{Notebook} (5) + \text{Subject Competency} (5) = 20\text{M}$$
3. **First & Second Exams**:
   - 7 main subjects, each out of 50 marks. Maximum total = 350 marks.
4. **Final Marksheet ($200 \rightarrow 100$)**:
   $$\text{Combined} = \text{First (50)} + \text{Second (50)} + \text{Annual (80)} + \text{Internal (20)} = 200\text{M}$$
   $$\text{Converted Final} = \frac{\text{Combined}}{2} = 100\text{M}$$
5. **Annual Result 700 Marks**:
   - 7 main subjects $\times 100\text{M} = 700\text{M}$.
6. **Annual Result 1000 Marks**:
   - 7 main subjects ($200/2 = 100\text{M}$ each) $= 700\text{M}$.
   - 3 additional subjects ($\text{Annual 80} + \text{Internal 20} = 100\text{M}$ each) $= 300\text{M}$. Total $= 1000\text{M}$.
7. **Siddhi (`#`) & Krupa (`*`) Grace Rules**:
   - Minimum Passing: 33 marks (33%) per subject.
   - Eligibility rule: Marks must be $\ge 25$ out of 100 in the subject.
   - Siddhi: 1 mark per percentage point above 33% overall (max 15).
   - Krupa: Up to 10 marks authorized by Principal.
   - Non-promotion flag: Student obtaining $<25$ marks in any subject is flagged as ineligible for promotion.

---

## 5. Implementation Steps & Milestones

1. **Calculations Module (`src/utils/class9ResultCalculations.ts`)**:
   - Pure functions for test conversions, internal summation, 200-to-100 conversions, 700M/1000M aggregation, Siddhi/Krupa logic, grading, and tie-aware ranking.
2. **Class 9 Result Tab UI (`src/components/Class9ResultManager.tsx`)**:
   - Header with Class 9 restriction badge, section selector, academic year, and 9-exam segmented switcher.
   - KPI metric strip (Total Class 9 students, Marks Entered, Passed, Grace, Failed, Pending).
   - Responsive spreadsheet table with sticky student name/roll columns and keyboard-driven tab/arrow navigation.
   - Autosave and explicit "Save Marks" batch persistence via `saveBatchExamMarks`.
3. **Class 9 Result Register & Marksheet Views**:
   - 700M $\leftrightarrow$ 1000M toggleable matrix view with search, filter, and printable A4 Landscape layout.
   - Individual Marksheet viewer with school header, component breakdowns, and A4 Portrait print layout.
4. **App Routing & Navbar Integration**:
   - Wire `activeTab === 'results'` in `src/App.tsx` and `src/components/Navbar.tsx` directly to the new `Class9ResultManager`.
   - Ensure existing student data is passed seamlessly without duplicates or re-entry.
5. **Verification & Edge-Case Testing**:
   - Verify calculation correctness ($19/25 \rightarrow 3.8$, $200/2 \rightarrow 100$, $<25$ promotion warning).
   - Verify mobile responsiveness with sticky columns and zero horizontal overflow breaks.
   - Compile and lint check with zero errors.
