import { OnlineExam, MCQQuestion, School } from '../types';

export type QuestionPaperMode = 'with_answers' | 'without_answers';

export interface GenerateQuestionPaperOptions {
  exam: OnlineExam;
  questions: MCQQuestion[];
  school?: School;
  mode: QuestionPaperMode;
}

/**
 * Generates high-fidelity, printable Question Paper HTML
 * Supporting both "With Answers" (Answer Key) and "Without Answers" (Blank Exam Paper).
 * Styled with Vidyalayam's native Anek Gujarati font.
 */
export function generateQuestionPaperHtml(options: GenerateQuestionPaperOptions): string {
  const { exam, questions, school, mode } = options;
  const isWithAnswers = mode === 'with_answers';

  // Sort questions by number
  const sortedQuestions = [...questions].sort(
    (a, b) => (a.questionNumber || 0) - (b.questionNumber || 0)
  );

  const schoolName = school?.schoolName || (school as any)?.name || 'શ્રી વિદ્યાલય';
  const diseCode = school?.diseCode ? `DISE: ${school.diseCode}` : '';
  const location = [school?.taluka, school?.district].filter(Boolean).join(', ');
  const subHeader = [diseCode, location].filter(Boolean).join(' • ');

  const totalQuestions = sortedQuestions.length;
  const totalMarks = exam.totalMarks || totalQuestions;

  return `
<!DOCTYPE html>
<html lang="gu">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${exam.title} - ${isWithAnswers ? 'પ્રશ્નપત્ર (જવાબો સાથે - Answer Key)' : 'પ્રશ્નપત્ર (પરીક્ષા માટે)'}</title>
  
  <!-- Vidyalayam Native Gujarati Font (Anek Gujarati) -->
  <link rel="stylesheet" href="/fonts/fonts.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Anek+Gujarati:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />

  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm;
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
      font-size: 13px;
      line-height: 1.5;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .paper-sheet {
      width: 210mm;
      min-height: 297mm;
      margin: 12px auto;
      background: #ffffff;
      padding: 14mm 16mm;
      position: relative;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
      border: 1px solid #cbd5e1;
    }

    /* HEADER */
    .paper-header {
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .school-title {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.2px;
      margin-bottom: 2px;
    }
    .school-sub {
      font-size: 11.5px;
      color: #475569;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .exam-badge-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .exam-main-title {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .mode-badge {
      font-size: 10px;
      font-weight: 800;
      padding: 2px 8px;
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

    /* PARTICULARS GRID */
    .exam-particulars {
      border: 1.5px solid #0f172a;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 10px;
      background: #f8fafc;
    }
    .particulars-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .particulars-table td {
      padding: 4px 8px;
      border: 1px solid #cbd5e1;
    }
    .particulars-table .lbl {
      font-weight: 700;
      color: #475569;
      background: #f1f5f9;
      width: 14%;
      font-size: 11px;
    }
    .particulars-table .val {
      font-weight: 700;
      color: #0f172a;
      width: 19%;
    }

    /* STUDENT FILL-IN STRIP (Without answers mode only) */
    .student-fill-strip {
      border: 1.5px dashed #64748b;
      border-radius: 4px;
      padding: 6px 10px;
      margin-bottom: 10px;
      background: #ffffff;
      font-size: 12px;
    }
    .fill-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 4px;
    }
    .fill-row:last-child {
      margin-bottom: 0;
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
      height: 14px;
    }

    /* INSTRUCTIONS */
    .instructions-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 4px;
      padding: 5px 10px;
      margin-bottom: 14px;
      font-size: 11px;
      color: #78350f;
    }
    .instructions-title {
      font-weight: 800;
      margin-bottom: 2px;
    }

    /* QUESTIONS LIST */
    .questions-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .question-card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 10px;
      background: #ffffff;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .question-card.highlighted {
      border-color: #86efac;
      background: #f0fdf4;
    }
    .question-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
    }
    .question-title-group {
      display: flex;
      gap: 6px;
      flex: 1;
    }
    .q-number {
      font-weight: 800;
      font-size: 13.5px;
      color: #0f172a;
      white-space: nowrap;
    }
    .q-text {
      font-size: 13.5px;
      font-weight: 600;
      color: #0f172a;
      line-height: 1.45;
    }
    .q-marks-tag {
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      padding: 1px 6px;
      border-radius: 4px;
      white-space: nowrap;
    }

    .q-image-box {
      margin: 6px 0;
      text-align: center;
    }
    .q-image {
      max-height: 140px;
      max-width: 100%;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
    }

    /* OPTIONS GRID */
    .options-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 12px;
      margin-top: 4px;
      padding-left: 20px;
    }
    .option-item {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      font-size: 12.5px;
      color: #334155;
      padding: 3px 6px;
      border-radius: 4px;
    }
    .option-item.opt-correct {
      background: #dcfce7;
      color: #166534;
      font-weight: 800;
      border: 1px solid #86efac;
    }
    .opt-letter {
      font-weight: 800;
      min-width: 20px;
      color: #0f172a;
    }
    .opt-correct .opt-letter {
      color: #166534;
    }
    .opt-text {
      flex: 1;
    }

    /* ANSWER KEY BANNER (In with_answers mode) */
    .answer-key-banner {
      margin-top: 6px;
      padding: 3px 8px;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 4px;
      font-size: 11.5px;
      color: #065f46;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-weight: 700;
    }
    .notes-text {
      font-size: 10.5px;
      color: #047857;
      font-style: italic;
    }

    /* FOOTER */
    .paper-footer {
      margin-top: 24px;
      padding-top: 14px;
      border-top: 1.5px solid #0f172a;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .footer-sign-box {
      width: 28%;
      text-align: center;
    }
    .footer-sign-line {
      border-bottom: 1px dashed #64748b;
      height: 18px;
      margin-bottom: 4px;
    }
    .footer-sign-lbl {
      font-size: 11px;
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
        padding: 6mm 8mm !important;
      }
      .question-card {
        border-color: #cbd5e1 !important;
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
          <td class="val">${exam.standard}</td>
          <td class="lbl">વિષય:</td>
          <td class="val">${exam.subject}</td>
          <td class="lbl">કુલ ગુણ:</td>
          <td class="val"><strong>${totalMarks}</strong></td>
        </tr>
        <tr>
          <td class="lbl">પરીક્ષા તારીખ:</td>
          <td class="val">${exam.scheduledDate || '-'}</td>
          <td class="lbl">સમય / મિનિટ:</td>
          <td class="val">${exam.durationMinutes} મિનિટ</td>
          <td class="lbl">કુલ પ્રશ્નો:</td>
          <td class="val">${totalQuestions}</td>
        </tr>
      </table>
    </section>

    <!-- STUDENT FILL-IN STRIP (Only in without answers mode) -->
    ${!isWithAnswers ? `
      <section class="student-fill-strip">
        <div class="fill-row">
          <div class="fill-item" style="flex: 2;">
            <span>વિદ્યાર્થીનું પૂરું નામ:</span>
            <div class="fill-line"></div>
          </div>
          <div class="fill-item">
            <span>રોલ નં:</span>
            <div class="fill-line" style="max-width: 60px;"></div>
          </div>
          <div class="fill-item">
            <span>વર્ગ:</span>
            <div class="fill-line" style="max-width: 50px;"></div>
          </div>
          <div class="fill-item">
            <span>G.R. નં:</span>
            <div class="fill-line" style="max-width: 60px;"></div>
          </div>
        </div>
        <div class="fill-row" style="margin-top: 6px;">
          <div class="fill-item">
            <span>સુપરવાઇઝર સહી:</span>
            <div class="fill-line"></div>
          </div>
          <div class="fill-item" style="justify-content: flex-end;">
            <span><strong>મેળવેલ ગુણ:</strong> ________ / <strong>${totalMarks}</strong></span>
          </div>
        </div>
      </section>
    ` : ''}

    <!-- INSTRUCTIONS -->
    <div class="instructions-box">
      <div class="instructions-title">સામાન્ય સૂચનાઓ:</div>
      <div>
        ૧. તમામ પ્રશ્નો ફરજિયાત છે. &nbsp;•&nbsp; 
        ૨. દરેક પ્રશ્ન સામે (A), (B), (C), (D) પૈકી યોગ્ય વિકલ્પ પસંદ કરવો. &nbsp;•&nbsp; 
        ${isWithAnswers ? '૩. આ મોડેલ પ્રશ્નપત્રમાં સાચો જવાબ હાઇલાઇટ કરી દર્શાવેલ છે.' : '૩. પ્રત્યેક સાચા જવાબ માટે ૧ ગુણ નિર્ધારિત છે.'}
      </div>
    </div>

    <!-- QUESTIONS LIST -->
    <main class="questions-container">
      ${sortedQuestions.map((q, idx) => {
        const qNum = q.questionNumber || idx + 1;
        const correctOpt = (q.correctAnswer || '').toUpperCase().trim();

        return `
          <div class="question-card ${isWithAnswers ? 'highlighted' : ''}">
            <div class="question-header">
              <div class="question-title-group">
                <span class="q-number">પ્રશ્ન ${qNum}.</span>
                <span class="q-text">${q.questionText}</span>
              </div>
              <span class="q-marks-tag">${q.marks || 1} ગુણ</span>
            </div>

            ${q.imageUrl ? `
              <div class="q-image-box">
                <img src="${q.imageUrl}" alt="Question Image" class="q-image" />
              </div>
            ` : ''}

            <div class="options-grid">
              ${[
                { letter: 'A', text: q.optionA },
                { letter: 'B', text: q.optionB },
                { letter: 'C', text: q.optionC },
                { letter: 'D', text: q.optionD },
              ].map((opt) => {
                const isThisCorrect = isWithAnswers && correctOpt === opt.letter;
                return `
                  <div class="option-item ${isThisCorrect ? 'opt-correct' : ''}">
                    <span class="opt-letter">(${opt.letter})</span>
                    <span class="opt-text">${opt.text || '-'}</span>
                    ${isThisCorrect ? '<span style="margin-left:4px;">✓</span>' : ''}
                  </div>
                `;
              }).join('')}
            </div>

            ${isWithAnswers ? `
              <div class="answer-key-banner">
                <span>✓ સાચો ઉત્તર: <strong>વિકલ્પ (${correctOpt || 'અસ્પષ્ટ'})</strong></span>
                ${q.reviewNotes ? `<span class="notes-text">${q.reviewNotes}</span>` : ''}
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
