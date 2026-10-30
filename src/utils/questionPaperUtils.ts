import { OnlineExam, MCQQuestion, School } from '../types';

export type QuestionPaperMode = 'with_answers' | 'without_answers';
export type QuestionPaperDensity = 'board_compact' | 'standard';

export interface GenerateQuestionPaperOptions {
  exam: OnlineExam;
  questions: MCQQuestion[];
  school?: School;
  mode: QuestionPaperMode;
  customPrintDate?: string;
  layoutDensity?: QuestionPaperDensity;
}

/**
 * Generates high-fidelity, printable Question Paper HTML
 * Supporting both "With Answers" (Answer Key) and "Without Answers" (Blank Exam Paper).
 * Engineered for authentic Gujarat Board (GSEB) Question Paper density:
 * ~20 to 25 questions per A4 page in 2-column newspaper layout!
 */
export function generateQuestionPaperHtml(options: GenerateQuestionPaperOptions): string {
  const { exam, questions, school, mode, customPrintDate, layoutDensity = 'board_compact' } = options;
  const isWithAnswers = mode === 'with_answers';
  const isCompact = layoutDensity === 'board_compact';

  // Sort questions by number
  const sortedQuestions = [...questions].sort(
    (a, b) => (a.questionNumber || 0) - (b.questionNumber || 0)
  );

  const schoolName = school?.schoolName || (school as any)?.name || 'શ્રી સરકારી માધ્યમિક શાળા';
  const diseCode = school?.diseCode ? `DISE: ${school.diseCode}` : '';
  const location = [school?.taluka, school?.district].filter(Boolean).join(', ');
  const subHeader = [diseCode, location].filter(Boolean).join(' • ');

  const totalQuestions = sortedQuestions.length;
  const totalMarks = exam.totalMarks || totalQuestions;
  const printDate = (customPrintDate && customPrintDate.trim()) ? customPrintDate.trim() : (exam.scheduledDate || '-');

  return `
<!DOCTYPE html>
<html lang="gu">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${exam.title} - ${isWithAnswers ? 'પ્રશ્નપત્ર (જવાબો સાથે - Answer Key)' : 'સત્તાવાર પ્રશ્નપત્ર (Board Paper)'}</title>
  
  <!-- Vidyalayam Native Gujarati Font (Anek Gujarati) -->
  <link rel="stylesheet" href="/fonts/fonts.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Anek+Gujarati:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />

  <style>
    @page {
      size: A4 portrait;
      margin: ${isCompact ? '8mm 10mm 8mm 10mm' : '12mm 14mm'};
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background-color: #f8fafc;
      color: #0f172a;
      font-family: 'Anek Gujarati', 'Noto Sans Gujarati', 'Gujarati Sangam MN', 'Shruti', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      font-size: ${isCompact ? '11.5px' : '13px'};
      line-height: ${isCompact ? '1.35' : '1.5'};
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .paper-sheet {
      width: 210mm;
      min-height: 297mm;
      margin: 12px auto;
      background: #ffffff;
      padding: ${isCompact ? '8mm 10mm' : '14mm 16mm'};
      position: relative;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
      border: 1px solid #cbd5e1;
    }

    /* HEADER */
    .paper-header {
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: ${isCompact ? '4px' : '8px'};
      margin-bottom: ${isCompact ? '6px' : '10px'};
    }
    .school-title {
      font-size: ${isCompact ? '16px' : '20px'};
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.2px;
      margin-bottom: 1px;
    }
    .school-sub {
      font-size: ${isCompact ? '10px' : '11.5px'};
      color: #475569;
      font-weight: 600;
      margin-bottom: ${isCompact ? '3px' : '6px'};
    }
    .exam-badge-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .exam-main-title {
      font-size: ${isCompact ? '13px' : '15px'};
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .mode-badge {
      font-size: ${isCompact ? '9px' : '10px'};
      font-weight: 800;
      padding: 1px 6px;
      border-radius: 4px;
      display: inline-block;
    }
    .badge-with-answers {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #86efac;
    }
    .badge-without-answers {
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
    }

    /* EXAM PARTICULARS TABLE */
    .exam-particulars {
      border: 1.5px solid #0f172a;
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: ${isCompact ? '6px' : '10px'};
      background: #f8fafc;
    }
    .particulars-table {
      width: 100%;
      border-collapse: collapse;
      font-size: ${isCompact ? '10.5px' : '12px'};
    }
    .particulars-table td {
      padding: ${isCompact ? '2.5px 6px' : '4px 8px'};
      border: 1px solid #cbd5e1;
    }
    .particulars-table .lbl {
      font-weight: 700;
      color: #475569;
      background: #f1f5f9;
      white-space: nowrap;
    }
    .particulars-table .val {
      font-weight: 700;
      color: #0f172a;
      white-space: nowrap;
    }

    /* STUDENT FILL-IN STRIP (Without answers mode only) */
    .student-fill-strip {
      border: 1.5px dashed #475569;
      border-radius: 3px;
      padding: ${isCompact ? '4px 8px' : '6px 10px'};
      margin-bottom: ${isCompact ? '6px' : '10px'};
      background: #ffffff;
      font-size: ${isCompact ? '10.5px' : '12px'};
    }
    .fill-row {
      display: flex;
      justify-content: space-between;
      gap: 10px;
    }
    .fill-item {
      display: flex;
      align-items: center;
      gap: 4px;
      flex: 1;
    }
    .fill-line {
      flex: 1;
      border-bottom: 1px dotted #475569;
      height: 12px;
    }

    /* INSTRUCTIONS */
    .instructions-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 3px;
      padding: ${isCompact ? '3px 8px' : '5px 10px'};
      margin-bottom: ${isCompact ? '8px' : '14px'};
      font-size: ${isCompact ? '9.5px' : '11px'};
      color: #78350f;
    }
    .instructions-title {
      font-weight: 800;
      display: inline;
      margin-right: 4px;
    }

    /* 2-COLUMN BOARD COMPACT CONTAINER (~25 questions per A4 page) */
    .questions-container.density-compact {
      column-count: 2;
      column-gap: 16px;
      column-rule: 1px solid #cbd5e1;
    }

    /* Standard 1-Column Container */
    .questions-container.density-standard {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    /* INDIVIDUAL QUESTION ITEM */
    .question-item {
      page-break-inside: avoid;
      break-inside: avoid;
      margin-bottom: ${isCompact ? '6px' : '10px'};
      padding-bottom: ${isCompact ? '5px' : '8px'};
      border-bottom: 0.5px dotted #cbd5e1;
      font-size: ${isCompact ? '11px' : '13px'};
      line-height: ${isCompact ? '1.32' : '1.45'};
    }
    .question-item:last-child {
      border-bottom: none;
    }
    .question-item.highlighted {
      background: #f0fdf4;
      padding: 4px 6px;
      border-radius: 4px;
      border: 1px solid #bbf7d0;
    }

    .q-head-line {
      display: flex;
      align-items: flex-start;
      gap: 4px;
      margin-bottom: 2px;
    }
    .q-num-label {
      font-weight: 800;
      color: #0f172a;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .q-text-body {
      font-weight: 600;
      color: #0f172a;
      flex: 1;
    }
    .q-marks-tag {
      font-size: ${isCompact ? '9px' : '10.5px'};
      font-weight: 700;
      color: #475569;
      background: #f1f5f9;
      border: 0.5px solid #cbd5e1;
      padding: 0.5px 4px;
      border-radius: 3px;
      white-space: nowrap;
      margin-left: 4px;
      flex-shrink: 0;
    }

    .q-image-box {
      margin: 3px 0;
      text-align: center;
    }
    .q-image {
      max-height: ${isCompact ? '80px' : '120px'};
      max-width: 100%;
      border-radius: 3px;
      border: 1px solid #cbd5e1;
    }

    /* COMPACT OPTIONS FORMAT (INLINE HORIZONTAL OR 2x2) */
    .options-row-inline {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 10px;
      margin-top: 2px;
      padding-left: 8px;
    }
    .options-row-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2px 8px;
      margin-top: 2px;
      padding-left: 8px;
    }
    .options-row-stacked {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-top: 2px;
      padding-left: 8px;
    }

    .opt-chip {
      display: flex;
      align-items: flex-start;
      gap: 3px;
      font-size: ${isCompact ? '10.5px' : '12px'};
      color: #334155;
      padding: 1px 3px;
      border-radius: 2px;
    }
    .opt-chip.opt-correct {
      background: #dcfce7;
      color: #166534;
      font-weight: 800;
      border-radius: 2px;
    }
    .opt-lbl {
      font-weight: 800;
      color: #0f172a;
      min-width: 16px;
      flex-shrink: 0;
    }
    .opt-correct .opt-lbl {
      color: #166534;
    }
    .opt-val {
      flex: 1;
    }

    /* ANSWER KEY BADGE */
    .answer-key-pill {
      margin-top: 3px;
      padding: 1px 5px;
      background: #ecfdf5;
      border: 0.5px solid #a7f3d0;
      border-radius: 2px;
      font-size: 9.5px;
      color: #065f46;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-weight: 700;
    }

    /* FOOTER */
    .paper-footer {
      margin-top: 14px;
      padding-top: 8px;
      border-top: 1.5px solid #0f172a;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .footer-sign-box {
      width: 30%;
      text-align: center;
    }
    .footer-sign-line {
      border-bottom: 1px dashed #64748b;
      height: 16px;
      margin-bottom: 2px;
    }
    .footer-sign-lbl {
      font-size: 10px;
      font-weight: 700;
      color: #334155;
    }

    @media print {
      body {
        background: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .paper-sheet {
        box-shadow: none !important;
        border: none !important;
        margin: 0 !important;
        width: 100% !important;
        padding: ${isCompact ? '6mm 8mm' : '8mm 10mm'} !important;
      }
      .questions-container.density-compact {
        column-count: 2 !important;
        column-gap: 16px !important;
        column-rule: 1px solid #cbd5e1 !important;
      }
      .question-item {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      .paper-footer {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>
  <div class="paper-sheet">
    
    <!-- HEADER -->
    <header class="paper-header">
      <h1 class="school-title">${schoolName}</h1>
      ${subHeader ? `<p class="school-sub">${subHeader}</p>` : ''}
      <div class="exam-badge-row">
        <span class="exam-main-title">${exam.title}</span>
        <span class="mode-badge ${isWithAnswers ? 'badge-with-answers' : 'badge-without-answers'}">
          ${isWithAnswers ? '🔑 ઉત્તરવહી સાથે (ANSWER KEY)' : '📝 સત્તાવાર પ્રશ્નપત્ર (EXAM PAPER)'}
        </span>
      </div>
    </header>

    <!-- EXAM PARTICULARS -->
    <section class="exam-particulars">
      <table class="particulars-table">
        <tr>
          <td class="lbl">ધોરણ:</td>
          <td class="val"><strong>${exam.standard}</strong></td>
          <td class="lbl">વિષય:</td>
          <td class="val"><strong>${exam.subject}</strong></td>
          <td class="lbl">કુલ ગુણ:</td>
          <td class="val"><strong>${totalMarks}</strong></td>
          <td class="lbl">તારીખ:</td>
          <td class="val" style="color: #b45309;"><strong>${printDate}</strong></td>
          <td class="lbl">સમય:</td>
          <td class="val">${exam.durationMinutes} મિનિટ</td>
          <td class="lbl">પ્રશ્નો:</td>
          <td class="val">${totalQuestions}</td>
        </tr>
      </table>
    </section>

    <!-- STUDENT FILL-IN STRIP (Only in without answers mode) -->
    ${!isWithAnswers ? `
      <section class="student-fill-strip">
        <div class="fill-row">
          <div class="fill-item" style="flex: 2.5;">
            <span>વિદ્યાર્થીનું નામ:</span>
            <div class="fill-line"></div>
          </div>
          <div class="fill-item">
            <span>રોલ નં:</span>
            <div class="fill-line" style="max-width: 45px;"></div>
          </div>
          <div class="fill-item">
            <span>વર્ગ:</span>
            <div class="fill-line" style="max-width: 40px;"></div>
          </div>
          <div class="fill-item">
            <span>G.R. નં:</span>
            <div class="fill-line" style="max-width: 45px;"></div>
          </div>
          <div class="fill-item" style="flex: 1.2;">
            <span>સુપરવાઇઝર સહી:</span>
            <div class="fill-line"></div>
          </div>
          <div class="fill-item" style="justify-content: flex-end;">
            <span><strong>ગુણ:</strong> _____ / <strong>${totalMarks}</strong></span>
          </div>
        </div>
      </section>
    ` : ''}

    <!-- INSTRUCTIONS -->
    <div class="instructions-box">
      <div class="instructions-title">સામાન્ય સૂચનાઓ:</div>
      <span>
        (૧) તમામ પ્રશ્નો ફરજિયાત છે. &nbsp;•&nbsp; 
        (૨) દરેક પ્રશ્ન સામે (A), (B), (C), (D) પૈકી યોગ્ય વિકલ્પ પસંદ કરવો. &nbsp;•&nbsp; 
        ${isWithAnswers ? '(૩) આ મોડેલ પ્રશ્નપત્રમાં સાચો જવાબ હાઇલાઇટ કરી દર્શાવેલ છે.' : '(૩) પ્રત્યેક સાચા જવાબનો ૧ ગુણ નિર્ધારિત છે.'}
      </span>
    </div>

    <!-- QUESTIONS LIST (2-Column Newspaper Layout for ~25 questions per page) -->
    <main class="questions-container ${isCompact ? 'density-compact' : 'density-standard'}">
      ${sortedQuestions.map((q, idx) => {
        const qNum = q.questionNumber || idx + 1;
        const correctOpt = (q.correctAnswer || '').toUpperCase().trim();

        // Calculate maximum option text length to choose optimal layout
        const optList = [
          { letter: 'A', text: q.optionA || '' },
          { letter: 'B', text: q.optionB || '' },
          { letter: 'C', text: q.optionC || '' },
          { letter: 'D', text: q.optionD || '' },
        ];
        const maxOptLength = Math.max(...optList.map((o) => o.text.length));

        // Choose arrangement class
        let optionsLayoutClass = 'options-row-inline';
        if (maxOptLength > 32) {
          optionsLayoutClass = 'options-row-stacked';
        } else if (maxOptLength > 16) {
          optionsLayoutClass = 'options-row-2col';
        }

        return `
          <div class="question-item ${isWithAnswers ? 'highlighted' : ''}">
            <div class="q-head-line">
              <span class="q-num-label">(${qNum})</span>
              <span class="q-text-body">${q.questionText}</span>
              <span class="q-marks-tag">${q.marks || 1} ગુણ</span>
            </div>

            ${q.imageUrl ? `
              <div class="q-image-box">
                <img src="${q.imageUrl}" alt="Question Image" class="q-image" />
              </div>
            ` : ''}

            <div class="${optionsLayoutClass}">
              ${optList.map((opt) => {
                const isThisCorrect = isWithAnswers && correctOpt === opt.letter;
                return `
                  <div class="opt-chip ${isThisCorrect ? 'opt-correct' : ''}">
                    <span class="opt-lbl">(${opt.letter})</span>
                    <span class="opt-val">${opt.text || '-'}</span>
                    ${isThisCorrect ? '<span style="color:#166534;font-weight:900;">✓</span>' : ''}
                  </div>
                `;
              }).join('')}
            </div>

            ${isWithAnswers ? `
              <div>
                <span class="answer-key-pill">
                  ✓ સાચો ઉત્તર: <strong>(${correctOpt || '-'})</strong>
                  ${q.reviewNotes ? `• <em>${q.reviewNotes}</em>` : ''}
                </span>
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    </main>

    <!-- FOOTER SIGNATURES -->
    <footer class="paper-footer">
      <div class="footer-sign-box">
        <div class="footer-sign-line"></div>
        <span class="footer-sign-lbl">પેપર સેટરની સહી</span>
      </div>
      <div class="footer-sign-box">
        <div class="footer-sign-line"></div>
        <span class="footer-sign-lbl">વિષય શિક્ષકની સહી</span>
      </div>
      <div class="footer-sign-box">
        <div class="footer-sign-line"></div>
        <span class="footer-sign-lbl">આચાર્યશ્રી સિક્કો & સહી</span>
      </div>
    </footer>

  </div>
</body>
</html>
  `;
}
