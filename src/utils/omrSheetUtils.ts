import { OnlineExam, MCQQuestion, ExamAttempt, School } from '../types';

export type OmrSheetMode = 'checked' | 'unchecked';

export interface GenerateOmrHtmlOptions {
  exam: OnlineExam;
  questions: MCQQuestion[];
  attempts: ExamAttempt[];
  school?: School;
  mode: OmrSheetMode;
  selectedAttemptId?: string; // If provided, generates for this attempt only; otherwise all attempts
}

/**
 * Generates high-fidelity, authentic OMR Answer Sheet HTML.
 * Engineered for strictly ONE PAGE PER STUDENT on standard A4 portrait paper.
 */
export function generateOmrSheetHtml(options: GenerateOmrHtmlOptions): string {
  const { exam, questions, attempts, school, mode, selectedAttemptId } = options;

  // Filter attempts based on selection
  const targetAttempts = selectedAttemptId && selectedAttemptId !== 'ALL'
    ? attempts.filter((a) => a.id === selectedAttemptId)
    : attempts;

  if (targetAttempts.length === 0) {
    return `<!DOCTYPE html><html><body><h3 style="text-align:center;padding:40px;font-family:sans-serif;">કોઈ વિદ્યાર્થી પરિણામ ઉપલબ્ધ નથી.</h3></body></html>`;
  }

  // Sort questions by questionNumber
  const sortedQuestions = [...questions].sort(
    (a, b) => (a.questionNumber || 0) - (b.questionNumber || 0)
  );

  const totalQuestions = sortedQuestions.length;
  // Calculate optimal columns based on question count:
  // <= 25 questions: 2 columns
  // 26 to 50 questions: 3 columns
  // 51 to 100 questions: 4 columns
  let columnCount = 2;
  if (totalQuestions > 50) {
    columnCount = 4;
  } else if (totalQuestions > 25) {
    columnCount = 3;
  }

  const itemsPerColumn = Math.ceil(totalQuestions / columnCount);
  const isChecked = mode === 'checked';

  // Build HTML for each student page
  const pagesHtml = targetAttempts.map((attempt, pageIndex) => {
    const passingMarks = exam.passingMarks || Math.ceil(exam.totalMarks * 0.35);
    const isPass = (attempt.score || 0) >= passingMarks;
    const answeredCount = Object.keys(attempt.answers || {}).length;
    const unattemptedCount = Math.max(0, totalQuestions - answeredCount);

    // Split questions into columns
    const columnsData: MCQQuestion[][] = [];
    for (let c = 0; c < columnCount; c++) {
      const startIdx = c * itemsPerColumn;
      const endIdx = Math.min(startIdx + itemsPerColumn, totalQuestions);
      columnsData.push(sortedQuestions.slice(startIdx, endIdx));
    }

    const schoolName = school?.schoolName || (school as any)?.name || 'શ્રી વિદ્યાલય';
    const diseCode = school?.diseCode ? `DISE: ${school.diseCode}` : '';
    const location = [school?.taluka, school?.district].filter(Boolean).join(', ');
    const subHeader = [diseCode, location].filter(Boolean).join(' • ');

    const formattedSubmittedTime = attempt.submittedAt
      ? new Date(attempt.submittedAt).toLocaleString('gu-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '-';

    return `
    <div class="omr-page ${pageIndex === targetAttempts.length - 1 ? 'last-page' : ''}">
      <!-- Outer Decorative Border for authentic OMR Sheet -->
      <div class="omr-container">
        
        <!-- TOP TRACKING MARKS (OMR Alignment Markers) -->
        <div class="omr-corner-markers">
          <div class="marker top-left"></div>
          <div class="timing-track">
            ${Array(24).fill(0).map(() => '<span class="timing-bar"></span>').join('')}
          </div>
          <div class="marker top-right"></div>
        </div>

        <!-- HEADER -->
        <header class="omr-header">
          <div class="header-left">
            <h1 class="school-name">${schoolName}</h1>
            ${subHeader ? `<p class="school-sub">${subHeader}</p>` : ''}
          </div>
          <div class="header-center">
            <div class="sheet-title-badge">
              <span class="omr-main-title">ઓનલાઇન કસોટી OMR ઉત્તરવહી</span>
              <span class="sheet-mode-badge ${isChecked ? 'badge-checked' : 'badge-unchecked'}">
                ${isChecked ? '✓ તપાસેલ ઉત્તરવહી (CHECKED SHEET)' : '📝 વિદ્યાર્થી ઉત્તરવહી (STUDENT RESPONSE)'}
              </span>
            </div>
          </div>
          <div class="header-right">
            <div class="barcode-box">
              <div class="barcode-lines"></div>
              <span class="barcode-text">${attempt.grNumber ? `GR-${attempt.grNumber}` : `ROLL-${attempt.rollNumber || pageIndex + 1}`}</span>
            </div>
          </div>
        </header>

        <!-- STUDENT & EXAM PARTICULARS TABLE -->
        <section class="student-info-section">
          <table class="info-table">
            <tr>
              <td class="lbl">વિદ્યાર્થીનું નામ:</td>
              <td class="val student-name-val"><strong>${attempt.studentName || '-'}</strong></td>
              <td class="lbl">રોલ નંબર:</td>
              <td class="val"><strong>${attempt.rollNumber || '-'}</strong></td>
              <td class="lbl">G.R. નંબર:</td>
              <td class="val"><strong>${attempt.grNumber || '-'}</strong></td>
            </tr>
            <tr>
              <td class="lbl">કસોટી શીર્ષક:</td>
              <td class="val">${exam.title}</td>
              <td class="lbl">ધોરણ:</td>
              <td class="val">${attempt.standard || exam.standard}</td>
              <td class="lbl">વિષય:</td>
              <td class="val">${exam.subject}</td>
            </tr>
            <tr>
              <td class="lbl">પરીક્ષા તારીખ:</td>
              <td class="val">${exam.scheduledDate || '-'}</td>
              <td class="lbl">સબમિશન સમય:</td>
              <td class="val text-xs">${formattedSubmittedTime}</td>
              <td class="lbl">કુલ પ્રશ્નો:</td>
              <td class="val">${totalQuestions}</td>
            </tr>
          </table>
        </section>

        <!-- EVALUATION & MARKS SUMMARY BOX -->
        <section class="marks-summary-section ${isChecked ? 'summary-checked' : 'summary-unchecked'}">
          ${isChecked ? `
            <div class="summary-grid">
              <div class="score-card main-score">
                <span class="score-lbl">મેળવેલ ગુણ / કુલ ગુણ</span>
                <span class="score-val"><strong class="highlight-score">${attempt.score}</strong> / ${exam.totalMarks}</span>
              </div>
              <div class="score-card">
                <span class="score-lbl">ટકાવારી</span>
                <span class="score-val">${attempt.percentage || 0}%</span>
              </div>
              <div class="score-card">
                <span class="score-lbl">સાચા જવાબો</span>
                <span class="score-val text-green">✓ ${attempt.correctCount}</span>
              </div>
              <div class="score-card">
                <span class="score-lbl">ખોટા જવાબો</span>
                <span class="score-val text-red">✗ ${attempt.incorrectCount}</span>
              </div>
              <div class="score-card">
                <span class="score-lbl">બાકી પ્રશ્નો</span>
                <span class="score-val text-gray">— ${unattemptedCount}</span>
              </div>
              <div class="score-card status-card ${isPass ? 'status-pass' : 'status-fail'}">
                <span class="score-lbl">પરિણામ સ્ટેટસ</span>
                <span class="status-badge">${isPass ? 'પાસ (PASS)' : 'સુધારણા જરૂરી'}</span>
              </div>
            </div>
          ` : `
            <div class="summary-grid unchecked-grid">
              <div class="score-card">
                <span class="score-lbl">કુલ ગુણ</span>
                <span class="score-val">${exam.totalMarks}</span>
              </div>
              <div class="score-card">
                <span class="score-lbl">જવાબ આપેલ</span>
                <span class="score-val">${answeredCount}</span>
              </div>
              <div class="score-card">
                <span class="score-lbl">બાકી રાખેલ</span>
                <span class="score-val">${unattemptedCount}</span>
              </div>
              <div class="score-card manual-eval-card">
                <span class="score-lbl">મૂલ્યાંકનકાર નોંધ (મેળવેલ ગુણ)</span>
                <span class="manual-score-line">__________ / ${exam.totalMarks}</span>
              </div>
              <div class="score-card manual-eval-card">
                <span class="score-lbl">ચકાસણી શેરો</span>
                <span class="manual-score-line">[ &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ]</span>
              </div>
            </div>
          `}
        </section>

        <!-- INSTRUCTION STRIP -->
        <div class="omr-instructions-strip">
          <span>
            <strong>સૂચના:</strong> વિદ્યાર્થી દ્વારા ઓનલાઇન પસંદ કરેલ વિકલ્પ વર્તુળ (A, B, C, D) માં ભરેલ દર્શાવેલ છે.
            ${isChecked ? '✓ = સાચો જવાબ, ✗ = ખોટો જવાબ (કૌંસમાં દર્શાવેલ વિકલ્પ સાચો જવાબ છે).' : 'આ ઉત્તરવહી વિદ્યાર્થીના ઓરિજિનલ સબમિશન મુજબ છે.'}
          </span>
        </div>

        <!-- MAIN OMR BUBBLES GRID (Balanced Columns) -->
        <main class="omr-grid columns-${columnCount}">
          ${columnsData.map((colQuestions, colIdx) => `
            <div class="omr-column" key="col-${colIdx}">
              <div class="column-header">
                <span class="col-head-q">પ્રશ્ન</span>
                <span class="col-head-bubbles">OMR વિકલ્પ</span>
                ${isChecked ? '<span class="col-head-res">તપાસણી</span>' : ''}
              </div>

              <div class="column-rows">
                ${colQuestions.map((q, qLocalIdx) => {
                  const qNum = q.questionNumber || (colIdx * itemsPerColumn + qLocalIdx + 1);
                  const displayNum = qNum < 10 ? `0${qNum}` : `${qNum}`;
                  
                  // Get student's answer (robust fallback to question id or questionNumber)
                  const rawAns = attempt.answers?.[q.id] || attempt.answers?.[String(q.questionNumber)] || '';
                  const studentAns = rawAns.toUpperCase().trim();
                  const correctAns = (q.correctAnswer || '').toUpperCase().trim();
                  
                  const isAnswered = Boolean(studentAns);
                  const isCorrect = isAnswered && studentAns === correctAns;
                  const isWrong = isAnswered && studentAns !== correctAns;

                  return `
                    <div class="omr-row ${isWrong ? 'row-wrong' : ''} ${isCorrect ? 'row-correct' : ''}">
                      <div class="q-num-box">${displayNum}</div>
                      
                      <div class="bubbles-group">
                        ${['A', 'B', 'C', 'D'].map((opt) => {
                          const isSelected = studentAns === opt;
                          const isThisCorrect = correctAns === opt;

                          let bubbleClass = 'bubble';
                          if (isSelected) {
                            bubbleClass += ' bubble-filled';
                            if (isChecked) {
                              bubbleClass += isCorrect ? ' bubble-correct' : ' bubble-wrong';
                            }
                          } else if (isChecked && isWrong && isThisCorrect) {
                            // In checked mode, highlight the right option that the student missed
                            bubbleClass += ' bubble-missed-target';
                          }

                          return `
                            <span class="${bubbleClass}" title="વિકલ્પ ${opt}">
                              ${opt}
                            </span>
                          `;
                        }).join('')}
                      </div>

                      ${isChecked ? `
                        <div class="q-result-box">
                          ${isCorrect ? `
                            <span class="mark-check" title="સાચો જવાબ">
                              ✓ <small class="pts">+${q.marks || 1}</small>
                            </span>
                          ` : isWrong ? `
                            <span class="mark-cross" title="ખોટો જવાબ (સાચો: ${correctAns})">
                              ✗ <span class="ans-key">${correctAns}</span>
                            </span>
                          ` : `
                            <span class="mark-skip" title="વણઉકેલાયેલ (સાચો: ${correctAns})">
                              — <span class="ans-key">${correctAns}</span>
                            </span>
                          `}
                        </div>
                      ` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `).join('')}
        </main>

        <!-- FOOTER & SIGNATURES STRIP -->
        <footer class="omr-footer">
          <div class="signature-box">
            <div class="sign-line"></div>
            <span class="sign-label">વિદ્યાર્થીની સહી</span>
          </div>
          <div class="signature-box">
            <div class="sign-line"></div>
            <span class="sign-label">મૂલ્યાંકનકાર / વર્ગશિક્ષકની સહી</span>
          </div>
          <div class="signature-box">
            <div class="sign-line"></div>
            <span class="sign-label">આચાર્યશ્રી સિક્કો અને સહી</span>
          </div>
        </footer>

        <!-- BOTTOM TIMING TRACK & AUDIT BAR -->
        <div class="omr-bottom-bar">
          <span class="audit-text">વિદ્યાલય સ્કૂલ મેનેજમેન્ટ સિસ્ટમ • ઓટો-જનરેટેડ OMR ડિજિટલ ઉત્તરવહી</span>
          <div class="timing-track bottom-track">
            ${Array(24).fill(0).map(() => '<span class="timing-bar"></span>').join('')}
          </div>
        </div>

      </div>
    </div>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="gu">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${exam.title} - OMR ઉત્તરવહી (${isChecked ? 'Checked' : 'Unchecked'})</title>
  
  <!-- Vidyalayam Native Gujarati Font (Anek Gujarati) -->
  <link rel="stylesheet" href="/fonts/fonts.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Anek+Gujarati:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />

  <style>
    /* CSS Reset & Print Page Discipline: Strictly 1 Student Page per A4 */
    @page {
      size: A4 portrait;
      margin: 6mm 8mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background-color: #f1f5f9;
      color: #0f172a;
      font-family: 'Anek Gujarati', 'Noto Sans Gujarati', 'Gujarati Sangam MN', 'Shruti', 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 11px;
      line-height: 1.25;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* OMR Page Container (Strictly 1 A4 Page) */
    .omr-page {
      width: 210mm;
      min-height: 285mm;
      max-height: 292mm;
      margin: 10px auto;
      background: #ffffff;
      padding: 5mm;
      position: relative;
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .omr-page.last-page {
      page-break-after: auto;
      break-after: auto;
    }

    .omr-container {
      border: 1.5px solid #0f172a;
      padding: 6px 8px;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      background: #ffffff;
    }

    /* OMR Timing Tracks & Corner Alignment Markers */
    .omr-corner-markers {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 10px;
      margin-bottom: 4px;
    }
    .marker {
      width: 10px;
      height: 10px;
      background: #0f172a;
    }
    .timing-track {
      display: flex;
      gap: 5px;
      flex: 1;
      justify-content: center;
      padding: 0 10px;
    }
    .timing-bar {
      width: 6px;
      height: 6px;
      background: #0f172a;
      display: inline-block;
    }

    /* HEADER */
    .omr-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1.5px solid #0f172a;
      padding-bottom: 5px;
      margin-bottom: 6px;
    }
    .header-left {
      flex: 1.4;
    }
    .school-name {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.2px;
      line-height: 1.2;
    }
    .school-sub {
      font-size: 10px;
      color: #475569;
      font-weight: 600;
      margin-top: 1px;
    }
    .header-center {
      flex: 2;
      text-align: center;
    }
    .sheet-title-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }
    .omr-main-title {
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #0f172a;
      text-transform: uppercase;
    }
    .sheet-mode-badge {
      font-size: 9.5px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      display: inline-block;
    }
    .badge-checked {
      background-color: #dcfce7;
      color: #166534;
      border: 1px solid #86efac;
    }
    .badge-unchecked {
      background-color: #e2e8f0;
      color: #1e293b;
      border: 1px solid #cbd5e1;
    }

    .header-right {
      flex: 1;
      display: flex;
      justify-content: flex-end;
    }
    .barcode-box {
      border: 1px solid #0f172a;
      padding: 3px 6px;
      text-align: center;
      background: #f8fafc;
    }
    .barcode-lines {
      width: 65px;
      height: 16px;
      background: repeating-linear-gradient(
        90deg,
        #0f172a 0px,
        #0f172a 2px,
        transparent 2px,
        transparent 4px,
        #0f172a 4px,
        #0f172a 5px,
        transparent 5px,
        transparent 8px
      );
      margin: 0 auto 2px;
    }
    .barcode-text {
      font-size: 8.5px;
      font-weight: 800;
      letter-spacing: 0.5px;
      font-family: monospace;
    }

    /* PARTICULARS TABLE */
    .student-info-section {
      margin-bottom: 6px;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #0f172a;
      font-size: 10.5px;
    }
    .info-table td {
      padding: 3px 5px;
      border: 1px solid #94a3b8;
    }
    .info-table .lbl {
      background-color: #f1f5f9;
      color: #334155;
      font-weight: 700;
      width: 12%;
      font-size: 10px;
    }
    .info-table .val {
      color: #0f172a;
      width: 21%;
    }
    .student-name-val {
      font-size: 11px;
      color: #047857;
    }

    /* MARKS SUMMARY BOX */
    .marks-summary-section {
      margin-bottom: 6px;
      border: 1px solid #0f172a;
      border-radius: 4px;
      background: #ffffff;
      padding: 4px 6px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1.5fr;
      gap: 4px;
      align-items: center;
    }
    .unchecked-grid {
      grid-template-columns: 1fr 1fr 1fr 2fr 1fr;
    }
    .score-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 3px;
      text-align: center;
    }
    .score-card.main-score {
      background: #ecfdf5;
      border-color: #10b981;
    }
    .score-lbl {
      font-size: 8.5px;
      color: #64748b;
      font-weight: 700;
    }
    .score-val {
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
    }
    .highlight-score {
      font-size: 14px;
      color: #047857;
    }
    .text-green { color: #15803d; }
    .text-red { color: #b91c1c; }
    .text-gray { color: #64748b; }
    
    .status-card.status-pass {
      background: #dcfce7;
      border-color: #86efac;
      color: #166534;
    }
    .status-card.status-fail {
      background: #fee2e2;
      border-color: #fca5a5;
      color: #991b1b;
    }
    .status-badge {
      font-size: 10px;
      font-weight: 800;
    }
    .manual-eval-card {
      background: #fff;
      border: 1px dashed #64748b;
    }
    .manual-score-line {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1px;
    }

    /* INSTRUCTIONS STRIP */
    .omr-instructions-strip {
      background-color: #fffbeb;
      border: 1px solid #fde68a;
      padding: 2.5px 6px;
      border-radius: 3px;
      font-size: 9.5px;
      color: #78350f;
      margin-bottom: 6px;
    }

    /* OMR GRID (Columns side by side) */
    .omr-grid {
      display: grid;
      gap: 8px;
      flex: 1;
      margin-bottom: 6px;
    }
    .omr-grid.columns-2 {
      grid-template-columns: 1fr 1fr;
    }
    .omr-grid.columns-3 {
      grid-template-columns: 1fr 1fr 1fr;
    }
    .omr-grid.columns-4 {
      grid-template-columns: 1fr 1fr 1fr 1fr;
    }

    .omr-column {
      border: 1px solid #0f172a;
      border-radius: 3px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background: #ffffff;
    }
    .column-header {
      background-color: #0f172a;
      color: #ffffff;
      display: flex;
      align-items: center;
      padding: 3px 5px;
      font-weight: 800;
      font-size: 9.5px;
    }
    .col-head-q {
      width: 24px;
      text-align: center;
    }
    .col-head-bubbles {
      flex: 1;
      text-align: center;
      letter-spacing: 6px;
    }
    .col-head-res {
      width: 44px;
      text-align: right;
      padding-right: 2px;
    }

    .column-rows {
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .omr-row {
      display: flex;
      align-items: center;
      padding: 2px 4px;
      border-bottom: 1px dotted #cbd5e1;
      font-size: 10px;
      min-height: 20px;
    }
    .omr-row:last-child {
      border-bottom: none;
    }
    .omr-row:nth-child(even) {
      background-color: #f8fafc;
    }
    .omr-row.row-wrong {
      background-color: #fff5f5;
    }
    .omr-row.row-correct {
      background-color: #f0fdf4;
    }

    .q-num-box {
      width: 22px;
      font-weight: 800;
      color: #0f172a;
      text-align: center;
      font-size: 10px;
    }

    /* OMR BUBBLE ICONS */
    .bubbles-group {
      display: flex;
      flex: 1;
      justify-content: space-around;
      align-items: center;
      padding: 0 4px;
    }
    .bubble {
      width: 17px;
      height: 17px;
      border-radius: 50%;
      border: 1.3px solid #334155;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8.5px;
      font-weight: 800;
      color: #334155;
      background: #ffffff;
      user-select: none;
      transition: all 0.1s;
    }
    /* Filled bubble (student selected answer) */
    .bubble.bubble-filled {
      background: #0f172a !important;
      color: #ffffff !important;
      border-color: #0f172a !important;
      font-weight: 900;
      box-shadow: inset 0 0 2px rgba(0,0,0,0.5);
    }
    /* In checked mode */
    .bubble.bubble-filled.bubble-correct {
      background: #15803d !important;
      border-color: #15803d !important;
      color: #ffffff !important;
    }
    .bubble.bubble-filled.bubble-wrong {
      background: #b91c1c !important;
      border-color: #b91c1c !important;
      color: #ffffff !important;
    }
    .bubble.bubble-missed-target {
      border: 1.5px dashed #15803d !important;
      color: #15803d !important;
      background: #dcfce7 !important;
      font-weight: 900;
    }

    /* RESULT INDICATOR BADGES */
    .q-result-box {
      width: 44px;
      text-align: right;
      font-size: 9.5px;
      font-weight: 800;
      display: flex;
      justify-content: flex-end;
      align-items: center;
    }
    .mark-check {
      color: #15803d;
      display: inline-flex;
      align-items: center;
      gap: 1px;
    }
    .mark-check .pts {
      font-size: 8px;
      color: #166534;
    }
    .mark-cross {
      color: #b91c1c;
      display: inline-flex;
      align-items: center;
      gap: 2px;
    }
    .mark-cross .ans-key, .mark-skip .ans-key {
      font-size: 8px;
      background: #dcfce7;
      color: #166534;
      border: 1px solid #86efac;
      padding: 0 2px;
      border-radius: 2px;
      font-weight: 700;
    }
    .mark-skip {
      color: #64748b;
      display: inline-flex;
      align-items: center;
      gap: 2px;
    }

    /* FOOTER & SIGNATURES */
    .omr-footer {
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #0f172a;
      padding-top: 14px;
      margin-top: 4px;
      margin-bottom: 4px;
    }
    .signature-box {
      width: 28%;
      text-align: center;
    }
    .sign-line {
      border-bottom: 1px dashed #64748b;
      height: 12px;
      margin-bottom: 3px;
    }
    .sign-label {
      font-size: 9.5px;
      font-weight: 700;
      color: #334155;
    }

    /* BOTTOM TRACK & AUDIT TEXT */
    .omr-bottom-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid #cbd5e1;
      padding-top: 3px;
      font-size: 8px;
      color: #64748b;
    }
    .bottom-track .timing-bar {
      width: 5px;
      height: 5px;
    }

    /* PRINT RULES */
    @media print {
      body {
        background-color: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .omr-page {
        margin: 0 !important;
        box-shadow: none !important;
        width: 100% !important;
        min-height: 280mm !important;
        max-height: 290mm !important;
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        padding: 0 !important;
      }
      .omr-page.last-page {
        page-break-after: auto !important;
        break-after: auto !important;
      }
      .omr-container {
        border: 1.5px solid #000000 !important;
        height: 100% !important;
      }
    }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>
  `;
}
