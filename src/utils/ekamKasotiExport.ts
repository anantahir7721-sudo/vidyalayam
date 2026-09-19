import * as XLSX from 'xlsx';
import { SubjectConfig } from '../data/ekamKasotiConfig';
import { Student } from '../types';

export interface StudentMarkEntry {
  student: Student;
  questionMarks: Record<string, number | ''>;
  totalObtained: number;
}

/**
 * Exports Ekam Kasoti - 1 Marks List to Excel (.xlsx)
 */
export function exportEkamKasotiExcel(
  schoolName: string,
  diseCode: string,
  subject: SubjectConfig,
  entries: StudentMarkEntry[]
) {
  // Construct rows for worksheet
  const rows: any[][] = [];

  // Title rows
  rows.push([schoolName.toUpperCase()]);
  rows.push([`DISE કોડ: ${diseCode} • એકમ કસોટી પ્રથમ સત્ર (વર્ષ ૨૦૨૬–૨૭)`]);
  rows.push([`ધોરણ: ${subject.standard} • વિષય: ${subject.name} • કુલ ગુણ: 25`]);
  rows.push([]); // blank row

  // Table header
  const headerRow: string[] = ['ક્રમ (No.)', 'વિદ્યાર્થીનું નામ (Student Name)'];
  subject.questions.forEach((q) => {
    headerRow.push(`${q.label} (ગુણ: ${q.maxMarks})`);
  });
  headerRow.push('કુલ ગુણ (Total / 25)');
  headerRow.push('ટકા (%)');

  rows.push(headerRow);

  // Table data rows
  entries.forEach((entry, idx) => {
    const rowData: any[] = [
      idx + 1,
      entry.student.studentName,
    ];

    subject.questions.forEach((q) => {
      const mark = entry.questionMarks[q.id];
      rowData.push(mark === '' || mark === undefined ? 0 : mark);
    });

    rowData.push(entry.totalObtained);
    const pct = ((entry.totalObtained / 25) * 100).toFixed(1);
    rowData.push(`${pct}%`);

    rows.push(rowData);
  });

  // Footer rows
  rows.push([]);
  rows.push(['તારીખ:', new Date().toLocaleDateString('gu-IN')]);
  rows.push(['શિક્ષકની સહી: ____________________', '', '', 'આચાર્યશ્રીની સહી તથા સિક્કો: ____________________']);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths for clean readability
  worksheet['!cols'] = [
    { wch: 10 },
    { wch: 35 },
    ...subject.questions.map(() => ({ wch: 16 })),
    { wch: 18 },
    { wch: 12 },
  ];

  const workbook = XLSX.utils.book_new();
  const sheetName = `Std_${subject.standard}_${subject.englishName.slice(0, 10)}`;
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const safeSubject = subject.englishName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Ekam_Kasoti_1_Std${subject.standard}_${safeSubject}_2026_27.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Triggers native A4 vector print formatted with Gujarati Unicode text
 */
export function printEkamKasotiA4(
  schoolName: string,
  diseCode: string,
  district: string,
  subject: SubjectConfig,
  entries: StudentMarkEntry[],
  schoolLogo?: string
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to download or print the A4 Marks List.');
    return;
  }

  const totalMaxMarks = typeof subject.totalMarks === 'number' && subject.totalMarks > 0 ? subject.totalMarks : 25;

  const tableHeaders = subject.questions
    .map(
      (q) =>
        `<th style="border: 1px solid #334155; padding: 7px 5px; text-align: center; font-size: 11px; background-color: #f1f5f9; font-family: 'Anek Gujarati', sans-serif;">
          <div style="font-weight: 700;">${q.label}</div>
          <div style="font-size: 9.5px; color: #475569; font-weight: normal; margin-top: 2px;">
            ${typeof q.maxMarks === 'number' ? `(Max ${q.maxMarks})` : '(નિયત નથી)'}
          </div>
        </th>`
    )
    .join('');

  const tableRows = entries
    .map((entry, idx) => {
      const qCols = subject.questions
        .map((q) => {
          const val = entry.questionMarks[q.id];
          const displayVal = val === '' || val === undefined ? '0' : val;
          return `<td style="border: 1px solid #cbd5e1; padding: 7px 5px; text-align: center; font-size: 11.5px; font-family: 'Anek Gujarati', sans-serif;">${displayVal}</td>`;
        })
        .join('');

      return `
        <tr>
          <td style="border: 1px solid #cbd5e1; padding: 7px 4px; text-align: center; font-size: 11px; font-family: 'Anek Gujarati', sans-serif;">${idx + 1}</td>
          <td style="border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; font-size: 11.5px; font-weight: 600; font-family: 'Anek Gujarati', sans-serif;">${entry.student.studentName}</td>
          ${qCols}
          <td style="border: 1px solid #cbd5e1; padding: 7px 5px; text-align: center; font-size: 12px; font-weight: bold; background-color: #f8fafc; font-family: 'Anek Gujarati', sans-serif;">${entry.totalObtained}</td>
        </tr>
      `;
    })
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="gu">
    <head>
      <meta charset="UTF-8">
      <title>${schoolName} - એકમ કસોટી ગુણપત્રક ધોરણ ${subject.standard} ${subject.gujaratiName}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Anek+Gujarati:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Anek+Gujarati:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

        @page {
          size: A4 portrait;
          margin: 10mm 12mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body {
          font-family: 'Anek Gujarati', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif !important;
          color: #0f172a;
          background: #fff;
          margin: 0;
          padding: 8px;
          font-size: 12px;
          line-height: 1.45;
          letter-spacing: 0.01em;
        }
        .header-container {
          text-align: center;
          margin-bottom: 12px;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 8px;
        }
        .app-branding {
          font-size: 11px;
          font-weight: 600;
          color: #059669;
          margin-bottom: 2px;
          letter-spacing: 0.03em;
        }
        .school-logo-title-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin: 4px 0;
        }
        .school-header-logo {
          width: 44px;
          height: 44px;
          object-fit: contain;
          border-radius: 6px;
        }
        .school-name {
          font-size: 18px;
          font-weight: 800;
          text-transform: uppercase;
          margin: 0;
          letter-spacing: 0.5px;
          color: #0f172a;
        }
        .exam-title {
          font-size: 14px;
          font-weight: 700;
          margin: 0 0 3px 0;
          color: #1e293b;
        }
        .academic-year {
          font-size: 12px;
          font-weight: 600;
          margin: 0 0 6px 0;
          color: #475569;
        }
        .meta-strip {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          font-weight: 700;
          background-color: #f8fafc;
          padding: 6px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          margin-top: 6px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          page-break-inside: auto;
        }
        tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
        thead {
          display: table-header-group;
        }
        th, td {
          border: 1px solid #94a3b8;
        }
        /* Comfortable blank space between Marks Table and Signature Area */
        .signature-section-wrapper {
          margin-top: 55px;
          padding-top: 12px;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .footer-signatures {
          display: flex;
          justify-content: space-between;
          padding: 0 24px;
          font-size: 11.5px;
          font-weight: 600;
          color: #1e293b;
        }
        .signature-line {
          border-top: 1.5px dashed #475569;
          padding-top: 8px;
          width: 210px;
          text-align: center;
        }
        .pdf-footer-credit {
          margin-top: 30px;
          text-align: center;
          font-size: 10px;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
          padding-top: 6px;
        }
        @media print {
          .no-print {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="background: #f1f5f9; border: 1px solid #cbd5e1; padding: 10px 16px; margin-bottom: 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="font-weight: bold; color: #0f172a; font-size: 13px;">A4 Print / Save PDF</span>
          <span style="color: #64748b; font-size: 11px; margin-left: 8px;">(Select &ldquo;Save as PDF&rdquo; in printer destination)</span>
        </div>
        <div>
          <button onclick="window.print()" style="background: #059669; color: white; border: none; padding: 8px 18px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-right: 8px; font-size: 12px;">
            🖨️ Print / Save as PDF
          </button>
          <button onclick="window.close()" style="background: #475569; color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 12px;">
            Close
          </button>
        </div>
      </div>

      <div class="header-container">
        <div class="app-branding">એકમ કસોટી ગુણપત્રક • Created by NR Chad</div>
        <div class="school-logo-title-wrap">
          ${schoolLogo ? `<img src="${schoolLogo}" alt="School Logo" class="school-header-logo" />` : ''}
          <h1 class="school-name">${schoolName}</h1>
        </div>
        <div class="exam-title">એકમ કસોટી પ્રથમ સત્ર — ધોરણ: ${subject.standard}</div>
        <div class="academic-year">શૈક્ષણિક વર્ષ ૨૦૨૬–૨૭</div>
        <div class="meta-strip">
          <span style="font-size: 13px; font-weight: 800; color: #065f46; background: #d1fae5; padding: 2px 10px; border-radius: 4px;">ધોરણ: ${subject.standard}</span>
          <span style="font-size: 13px; font-weight: 700;">વિષય: ${subject.name}</span>
          <span>DISE કોડ: ${diseCode}</span>
          <span>કુલ ગુણ: ${totalMaxMarks}</span>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="border: 1px solid #334155; padding: 7px 4px; width: 42px; text-align: center; background-color: #f1f5f9; font-size: 11px; font-weight: 700;">ક્રમ</th>
            <th style="border: 1px solid #334155; padding: 7px 10px; text-align: left; background-color: #f1f5f9; font-size: 11.5px; font-weight: 700;">વિદ્યાર્થીનું નામ</th>
            ${tableHeaders}
            <th style="border: 1px solid #334155; padding: 7px 6px; width: 70px; text-align: center; background-color: #e2e8f0; font-size: 11.5px; font-weight: 800;">કુલ (${totalMaxMarks})</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      <!-- Clear spacing between Marks Table and Signature Area to prevent overlap -->
      <div class="signature-section-wrapper">
        <div class="footer-signatures">
          <div class="signature-line">શિક્ષકની સહી</div>
          <div class="signature-line">તારીખ: ${new Date().toLocaleDateString('gu-IN')}</div>
          <div class="signature-line">આચાર્યશ્રીની સહી તથા સિક્કો</div>
        </div>

        <div class="pdf-footer-credit">
          એકમ કસોટી ગુણપત્રક • Created by NR Chad
        </div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 450);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
