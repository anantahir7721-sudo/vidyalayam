import { School, Student } from '../types';

/**
 * Computes font-size and letter-spacing for student names on ID cards.
 * Student name is made big and prominent to highlight the student as the focal point,
 * while automatically scaling down for long names so it never wraps or cuts.
 */
function getStudentNameInlineStyle(name: string): string {
  const len = (name || '').trim().length;
  if (len <= 16) {
    return 'font-size: 15.5px; font-weight: 900;';
  } else if (len <= 21) {
    return 'font-size: 14.2px; font-weight: 900; letter-spacing: -0.1px;';
  } else if (len <= 26) {
    return 'font-size: 13.0px; font-weight: 800; letter-spacing: -0.15px;';
  } else if (len <= 32) {
    return 'font-size: 12.0px; font-weight: 800; letter-spacing: -0.2px;';
  } else if (len <= 38) {
    return 'font-size: 11.0px; font-weight: 800; letter-spacing: -0.25px;';
  } else if (len <= 44) {
    return 'font-size: 10.0px; font-weight: 800; letter-spacing: -0.3px;';
  } else {
    return 'font-size: 9.2px; font-weight: 800; letter-spacing: -0.35px;';
  }
}

function getParentNameInlineStyle(name: string): string {
  const len = (name || '').trim().length;
  if (len <= 20) {
    return 'font-size: 8.5px;';
  } else if (len <= 28) {
    return 'font-size: 7.8px; letter-spacing: -0.15px;';
  } else if (len <= 36) {
    return 'font-size: 7.0px; letter-spacing: -0.25px;';
  } else {
    return 'font-size: 6.3px; letter-spacing: -0.35px;';
  }
}

/**
 * Computes font-size and letter-spacing for the school name spanning the whole header.
 * Dynamically scales with header width and length of school name so it fills the header
 * prominently and cleanly without wrapping.
 */
function getSchoolNameInlineStyle(name: string): string {
  const len = (name || '').trim().length;
  // Strict single-line fit: dynamically scales so school name NEVER wraps or gets cut
  if (len <= 18) {
    return 'font-size: 13.5px; font-weight: 800; letter-spacing: 0.1px; white-space: nowrap;';
  } else if (len <= 26) {
    return 'font-size: 12.2px; font-weight: 800; letter-spacing: 0px; white-space: nowrap;';
  } else if (len <= 34) {
    return 'font-size: 11.0px; font-weight: 800; letter-spacing: -0.15px; white-space: nowrap;';
  } else if (len <= 42) {
    return 'font-size: 10.0px; font-weight: 800; letter-spacing: -0.2px; white-space: nowrap;';
  } else if (len <= 52) {
    return 'font-size: 9.0px; font-weight: 800; letter-spacing: -0.3px; white-space: nowrap;';
  } else {
    return 'font-size: 8.0px; font-weight: 700; letter-spacing: -0.35px; white-space: nowrap;';
  }
}

/**
 * Generates and triggers high-resolution, print-ready PDF printing of Student ID Cards.
 * Formats multiple cards per A4 page with crisp borders, accurate margins,
 * properly embedded Anek Gujarati font, and professional school badge aesthetics.
 */
export function printStudentIdCards(school: School, students: Student[]) {
  if (students.length === 0) {
    alert('કૃપા કરીને આઈડી કાર્ડ છાપવા માટે ઓછામાં ઓછો એક વિદ્યાર્થી પસંદ કરો (Please select at least one student).');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('કૃપા કરીને આઈડી કાર્ડ પ્રિન્ટ કરવા માટે બ્રાઉઝરમાં પોપ-અપની પરવાનગી આપો (Please allow popups to print ID cards).');
    return;
  }

  const schoolDise = school.diseCode || 'DISE NOT SPECIFIED';
  const schoolContact = school.contactPhone || school.principalPhone || '';

  const cardsHtml = students
    .map((st) => {
      const stdDisplay = String(st.standard).replace(/^class\s*/i, '').trim();
      const secDisplay = st.section || st.division || '';
      const grDisplay = st.grNumber || '-';
      const dobDisplay = st.dob || '-';
      const doaDisplay = st.doa || '-';
      const bloodDisplay = st.bloodGroup || '-';
      const studentDise =
        (st.diseCode && st.diseCode.trim()) ||
        (st.studentStateCode && st.studentStateCode.trim()) ||
        (st.studentId && st.studentId.trim()) ||
        '-';
      const parentName =
        st.fatherName && st.fatherName.trim()
          ? st.fatherName.trim()
          : st.motherName && st.motherName.trim()
          ? st.motherName.trim()
          : (() => {
              const parts = (st.studentName || '').trim().split(/\s+/);
              if (parts.length >= 3) return parts[1] + (parts[2] ? ' ' + parts[2] : '');
              if (parts.length === 2) return parts[1];
              return '-';
            })();
      const contactDisplay = st.contactNumber || st.mobileNumber || '-';
      const addressDisplay = st.address || school.address || school.village || school.district || '-';

      return `
        <div class="id-card-wrapper">
          <div class="id-card">
            <!-- Header -->
            <div class="card-header">
              <div class="school-header-row">
                ${school.logoUrl ? `<img src="${school.logoUrl}" alt="Logo" class="school-header-logo" />` : ''}
                <div class="school-header-text">
                  <div class="school-name" style="${getSchoolNameInlineStyle(school.schoolName)}" title="${school.schoolName}">
                    ${school.schoolName}
                  </div>
                  <div class="school-meta-row">
                    <span class="school-meta">${school.district || ''} ${school.taluka ? `• તા. ${school.taluka}` : ''} • DISE: ${schoolDise}</span>
                    <span class="card-banner">વિદ્યાર્થી ID Card</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Body -->
            <div class="card-body">
              <!-- Photo Box -->
              <div class="photo-col">
                <div class="photo-container">
                  ${
                    st.photoUrl
                      ? `<img src="${st.photoUrl}" alt="${st.studentName}" class="student-photo" />`
                      : `<div class="photo-placeholder">
                          <span class="photo-letter">${(st.studentName || 'S').trim().charAt(0)}</span>
                          <span class="photo-caption">PHOTO</span>
                        </div>`
                  }
                </div>
                <div class="gr-tag">
                  <span class="gr-lbl">G.R. NO.</span>
                  <span class="gr-val">${grDisplay}</span>
                </div>
              </div>

              <!-- Details Box -->
              <div class="details-col">
                <div class="student-name" title="${st.studentName}" style="${getStudentNameInlineStyle(st.studentName)}">
                  ${st.studentName}
                </div>

                <table class="details-table">
                  <tr>
                    <td class="lbl">ધોરણ:</td>
                    <td class="val highlight">${stdDisplay} ${secDisplay ? `(${secDisplay})` : ''}</td>
                    <td class="lbl lbl-roll">રોલ:</td>
                    <td class="val">${st.rollNumber || '-'}</td>
                  </tr>
                  <tr>
                    <td class="lbl">વિદ્યાર્થી DISE:</td>
                    <td class="val mono-dise" colspan="3" style="font-family: monospace; font-weight: 800; color: #0369a1; letter-spacing: 0.2px;">${studentDise}</td>
                  </tr>
                  <tr>
                    <td class="lbl">જન્મ:</td>
                    <td class="val val-dob">${dobDisplay}</td>
                    <td class="lbl lbl-doa">પ્રવેશ:</td>
                    <td class="val val-doa highlight-doa">${doaDisplay}</td>
                  </tr>
                  <tr>
                    <td class="lbl">બ્લડ ગ્રૂપ:</td>
                    <td class="val highlight-blood">${bloodDisplay}</td>
                    <td class="lbl lbl-caste">જાતિ:</td>
                    <td class="val">${st.caste || '-'}</td>
                  </tr>
                  <tr>
                    <td class="lbl">સંપર્ક:</td>
                    <td class="val" colspan="3">${contactDisplay}</td>
                  </tr>
                  <tr>
                    <td class="lbl">સરનામું:</td>
                    <td class="val address-val" colspan="3">${addressDisplay}</td>
                  </tr>
                </table>
              </div>
            </div>

            <!-- Footer -->
            <div class="card-footer">
              <div class="footer-left">
                <div class="validity">શૈક્ષણિક વર્ષ ૨૦૨૬–૨૭</div>
              </div>
              <div class="footer-right">
                <div class="sig-line">આચાર્યશ્રી સહી & સિક્કો</div>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  const html = `
    <!DOCTYPE html>
    <html lang="gu">
    <head>
      <meta charset="UTF-8">
      <title>${school.schoolName} - Student ID Cards</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Anek+Gujarati:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Anek+Gujarati:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap');
        
        @page {
          size: A4 portrait;
          margin: 10mm;
        }

        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        body {
          font-family: 'Anek Gujarati', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif !important;
          background: #ffffff;
          color: #0f172a;
          margin: 0;
          padding: 8px;
        }

        .header-print-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          margin-bottom: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }

        @media print {
          .no-print {
            display: none !important;
          }
          body {
            padding: 0;
          }
        }

        .cards-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 7mm 6mm;
          page-break-inside: auto;
        }

        .id-card-wrapper {
          page-break-inside: avoid;
          display: flex;
          justify-content: center;
        }

        .id-card {
          width: 86mm;
          height: 54mm;
          border: 1.5px solid #1e293b;
          border-radius: 8px;
          overflow: hidden;
          background: #ffffff;
          position: relative;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          justify-content: space-between;
        }

        /* Card Header */
        .card-header {
          background: linear-gradient(135deg, #090d16 0%, #1e293b 100%);
          color: #ffffff;
          padding: 2.2mm 3.5mm 1.8mm 3.5mm;
          border-bottom: 2px solid #f59c73;
          text-align: left;
          box-sizing: border-box;
        }

        .school-header-row {
          display: flex;
          align-items: center;
          gap: 5.5px;
          width: 100%;
        }

        .school-header-logo {
          width: 10.5mm;
          height: 10.5mm;
          max-width: 10.5mm;
          max-height: 10.5mm;
          object-fit: contain;
          background: transparent !important;
          padding: 0;
          flex-shrink: 0;
          border: none !important;
        }

        .school-header-text {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          text-align: left;
        }

        .school-name {
          width: 100%;
          text-align: left;
          font-weight: 800;
          text-transform: uppercase;
          line-height: 1.15;
          color: #ffffff;
          letter-spacing: 0.1px;
          white-space: nowrap !important;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 1px;
        }

        .school-meta-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          gap: 4px;
        }

        .school-meta {
          font-size: 7.2px;
          color: #cbd5e1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.15;
        }

        .card-banner {
          background: #f59c73;
          color: #0f172a;
          text-align: center;
          font-size: 6.5px;
          font-weight: 800;
          padding: 0.5px 5px;
          border-radius: 4px;
          white-space: nowrap;
          letter-spacing: 0.2px;
          text-transform: uppercase;
          flex-shrink: 0;
        }

        /* Card Body */
        .card-body {
          flex: 1;
          display: flex;
          padding: 2.2mm 3.5mm;
          gap: 6px;
          background: #fafafa;
          align-items: center;
          box-sizing: border-box;
        }

        .photo-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
          gap: 2px;
        }

        .photo-container {
          width: 19mm;
          height: 22mm;
          border: 1px solid #94a3b8;
          border-radius: 4px;
          overflow: hidden;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .student-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .photo-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #64748b;
        }

        .photo-letter {
          font-size: 20px;
          font-weight: 800;
          color: #9d512d;
        }

        .photo-caption {
          font-size: 7.5px;
          font-weight: 700;
          letter-spacing: 0.5px;
          color: #94a3b8;
        }

        .gr-tag {
          margin-top: 2px;
          width: 100%;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 3px;
          text-align: center;
          padding: 1px 2px;
          line-height: 1.1;
        }

        .gr-lbl {
          display: block;
          font-size: 7px;
          font-weight: 700;
          color: #64748b;
        }

        .gr-val {
          display: block;
          font-size: 9.5px;
          font-weight: 800;
          color: #0f172a;
          font-family: monospace;
        }

        /* Details Column */
        .details-col {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
        }

        .student-name {
          color: #0f172a;
          font-weight: 900;
          background: #f1f5f9;
          border-left: 3.5px solid #e27d4e;
          border-bottom: 1px solid #cbd5e1;
          padding: 2.5px 5px 2.5px 6px;
          margin-bottom: 3.5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: clip;
          line-height: 1.25;
          border-radius: 0 4px 4px 0;
        }

        .details-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8.8px;
          line-height: 1.42;
        }

        .details-table td {
          padding: 1.5px 1px;
          vertical-align: middle;
        }

        .details-table .lbl {
          font-weight: 600;
          color: #475569;
          white-space: nowrap;
          width: 1%;
        }

        .details-table .val {
          font-weight: 700;
          color: #0f172a;
          white-space: nowrap;
          padding-left: 2px;
          padding-right: 3px;
        }

        .details-table .lbl-roll,
        .details-table .lbl-doa,
        .details-table .lbl-caste {
          padding-left: 4px;
        }

        .details-table .val.highlight {
          color: #9d512d;
          font-size: 9.5px;
          font-weight: 800;
        }

        .details-table .val-dob {
          font-size: 8.2px;
          letter-spacing: -0.15px;
          white-space: nowrap;
        }

        .details-table .val.highlight-doa {
          color: #0369a1;
          font-weight: 700;
          font-size: 7.8px;
          letter-spacing: -0.2px;
          white-space: nowrap;
        }

        .details-table .val.highlight-blood {
          color: #b91c1c;
          font-weight: 800;
        }

        .address-val {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          font-weight: 500 !important;
          color: #334155 !important;
          font-size: 8px !important;
          line-height: 1.15 !important;
        }

        /* Card Footer */
        .card-footer {
          background: #f8fafc;
          border-top: 1px solid #cbd5e1;
          padding: 1.2mm 3.5mm;
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 6.5mm;
          box-sizing: border-box;
          margin-top: auto;
        }

        .footer-left {
          line-height: 1;
        }

        .validity {
          font-size: 5.8pt;
          font-weight: 600;
          color: #475569;
        }

        .school-contact {
          font-size: 5.5pt;
          color: #64748b;
        }

        .footer-right {
          text-align: right;
          line-height: 1;
        }

        .sig-line {
          font-size: 5.8pt;
          font-weight: 700;
          color: #1e293b;
          line-height: 1;
        }
      </style>
    </head>
    <body>
      <div class="header-print-bar no-print">
        <div>
          <strong style="font-size: 15px; color: #0f172a;">${school.schoolName}</strong>
          <span style="font-size: 13px; color: #64748b; margin-left: 8px;">વિદ્યાર્થી ઓળખપત્ર (કુલ: ${students.length} આઈડી કાર્ડ)</span>
        </div>
        <div>
          <button onclick="window.print()" style="background: #9d512d; color: white; border: none; padding: 7px 18px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px;">
            🖨️ પ્રિન્ટ કરો / Save as PDF
          </button>
        </div>
      </div>

      <div class="cards-grid">
        ${cardsHtml}
      </div>

      <script>
        function autoFitIdCardNames() {
          // 1. Auto-fit school name in whole header
          var schoolTitles = document.querySelectorAll('.school-name');
          schoolTitles.forEach(function(el) {
            var parent = el.parentElement;
            if (!parent) return;
            var maxW = (parent.getBoundingClientRect ? parent.getBoundingClientRect().width : parent.clientWidth) - 4;
            if (maxW <= 0) return;
            var curSize = parseFloat(window.getComputedStyle(el).fontSize) || 13.5;
            while (el.scrollWidth > maxW && curSize > 7.0) {
              curSize -= 0.2;
              el.style.fontSize = curSize + 'px';
              el.style.letterSpacing = '-0.2px';
            }
          });

          // 2. Auto-fit student names: shrink font size only if text overflows container
          var studentNames = document.querySelectorAll('.student-name');
          studentNames.forEach(function(el) {
            var parent = el.parentElement;
            if (!parent) return;
            var maxW = (parent.getBoundingClientRect ? parent.getBoundingClientRect().width : parent.clientWidth) - 8;
            if (maxW <= 0) return;
            
            var curSize = parseFloat(window.getComputedStyle(el).fontSize) || 13.5;
            while (el.scrollWidth > maxW && curSize > 7.2) {
              curSize -= 0.2;
              el.style.fontSize = curSize + 'px';
              el.style.letterSpacing = '-0.25px';
            }
          });

          // 3. Auto-fit parent names
          var parentNames = document.querySelectorAll('.parent-name');
          parentNames.forEach(function(el) {
            var parent = el.parentElement;
            if (!parent) return;
            var maxW = el.clientWidth || parent.clientWidth || 180;
            if (maxW <= 0) return;
            
            var curSize = parseFloat(window.getComputedStyle(el).fontSize) || 8.5;
            while (el.scrollWidth > maxW && curSize > 5.2) {
              curSize -= 0.2;
              el.style.fontSize = curSize + 'px';
              el.style.letterSpacing = '-0.2px';
            }
          });

          // 4. Ensure admission date fits without wrapping
          var doaElements = document.querySelectorAll('.val-doa');
          doaElements.forEach(function(el) {
            var parent = el.parentElement;
            if (!parent) return;
            var maxW = el.clientWidth || 55;
            var curSize = parseFloat(window.getComputedStyle(el).fontSize) || 8.0;
            while (el.scrollWidth > maxW && curSize > 6.5) {
              curSize -= 0.2;
              el.style.fontSize = curSize + 'px';
            }
          });
        }

        window.addEventListener('DOMContentLoaded', () => {
          autoFitIdCardNames();
          setTimeout(() => {
            autoFitIdCardNames();
            window.print();
          }, 600);
        });
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
