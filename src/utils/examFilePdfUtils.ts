import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { School } from '../types';
import {
  ExamBlock,
  SupervisionScheduleRow,
  AnswerSheetEvaluationRow,
} from '../types/examFile';
import { downloadPdfFile, printHtmlDocument } from './printAndPdfUtils';

const GUJARATI_FONT_STACK =
  "'Anek Gujarati', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Gujarati', sans-serif";

interface PageDimensions {
  widthMm: number;
  heightMm: number;
  widthPx: number;
  heightPx: number;
}

function getPageDimensions(size: 'a4' | 'legal'): PageDimensions {
  if (size === 'legal') {
    return {
      widthMm: 215.9,
      heightMm: 355.6,
      widthPx: 816,
      heightPx: 1344,
    };
  }
  // Default A4
  return {
    widthMm: 210,
    heightMm: 297,
    widthPx: 794,
    heightPx: 1123,
  };
}

/**
 * Builds printable HTML for a Single Exam Block Attendance & Seating sheet
 * Exact replica of Gujarat school block seating documents (aa_d40028df.pdf / bbb_44ec720b.pdf)
 */
export function buildBlockAttendanceSheetHtml(
  school: School,
  block: ExamBlock,
  examTitle: string,
  monthYear: string,
  pageSize: 'a4' | 'legal' = 'a4',
  includeOuterPageWrap = true
): string {
  const schoolName = school.schoolName || 'શ્રી શાળા';
  const schoolSubtitle = [school.taluka, school.district].filter(Boolean).join(', ');
  const dims = getPageDimensions(pageSize);

  const sectionsHtml = block.sections.map((sec, secIdx) => {
    const stdTitle = `ધોરણ- ${sec.standard}${sec.section ? ` (${sec.section})` : ''}`;
    const studentRows = sec.students.map((st) => {
      return `
        <tr>
          <td style="padding: 4.5px 8px; text-align: left; font-weight: 700; text-transform: uppercase; font-size: 11.5px; border: 1.2px solid #000000; letter-spacing: 0.3px;">
            ${st.studentName}
          </td>
          <td style="padding: 4.5px 4px; text-align: center; font-weight: 800; font-size: 12px; border: 1.2px solid #000000;">
            ${st.rollNumber}
          </td>
          <td style="padding: 0; text-align: center; border: 1.2px solid #000000; width: 55px;">
            <table style="width: 100%; height: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 50%; height: 21px; border-right: 1.2px solid #000000;">&nbsp;</td>
                <td style="width: 50%; height: 21px;">&nbsp;</td>
              </tr>
            </table>
          </td>
          <td style="padding: 4.5px 4px; text-align: center; border: 1.2px solid #000000; width: 68px;">&nbsp;</td>
          <td style="padding: 4.5px 4px; text-align: center; border: 1.2px solid #000000; width: 85px;">&nbsp;</td>
        </tr>
      `;
    }).join('');

    return `
      <div style="margin-bottom: ${secIdx === 0 && block.sections.length > 1 ? '10px' : '4px'};">
        <!-- Section Header Bar (Exact match to reference aa_d40028df.pdf) -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 2px;">
          <tr>
            <td style="width: 32%; text-align: left; font-size: 15px; font-weight: 900; color: #000000;">
              ${stdTitle}
            </td>
            <td style="width: 36%; text-align: center; font-size: 13.5px; font-weight: 800; color: #000000;">
              ${examTitle}
            </td>
            <td style="width: 32%; text-align: right; font-size: 13.5px; font-weight: 800; color: #000000;">
              ${monthYear}
            </td>
          </tr>
          <tr>
            <td style="text-align: left; font-size: 12px; font-weight: 700; color: #000000; padding-top: 2px;">
              વિષય: ....................................
            </td>
            <td style="text-align: center; font-size: 12px; font-weight: 700; color: #000000; padding-top: 2px;">
              તારીખ: ....................................
            </td>
            <td style="text-align: right; font-size: 14px; font-weight: 900; color: #000000; padding-top: 2px;">
              બ્લોક.નં. <span style="font-size: 16px;">${String(block.blockNumber).padStart(2, '0')}</span>
            </td>
          </tr>
        </table>

        <!-- Students Seating Table -->
        <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000000; margin-top: 3px;">
          <thead>
            <tr style="background: #F8FAFC;">
              <th style="padding: 5px 8px; text-align: center; font-size: 11.5px; font-weight: 800; border: 1.2px solid #000000; width: 44%;">
                નામ
              </th>
              <th style="padding: 5px 4px; text-align: center; font-size: 11px; font-weight: 800; border: 1.2px solid #000000; width: 13%;">
                બેઠક.<br/>નંબર
              </th>
              <th style="padding: 5px 4px; text-align: center; font-size: 11.5px; font-weight: 800; border: 1.2px solid #000000; width: 15%;">
                પુરવણી
              </th>
              <th style="padding: 5px 4px; text-align: center; font-size: 11px; font-weight: 800; border: 1.2px solid #000000; width: 13%;">
                લખેલ<br/>પાનાં નંબર
              </th>
              <th style="padding: 5px 4px; text-align: center; font-size: 11.5px; font-weight: 800; border: 1.2px solid #000000; width: 15%;">
                વિદ્યાર્થી સહી
              </th>
            </tr>
          </thead>
          <tbody>
            ${studentRows}
          </tbody>
        </table>
      </div>
    `;
  }).join('');

  const contentHtml = `
    <div class="exam-block-sheet" style="
      width: 100%;
      max-width: ${dims.widthPx}px;
      min-height: ${dims.heightPx - 30}px;
      box-sizing: border-box;
      padding: 16px 22px;
      font-family: ${GUJARATI_FONT_STACK};
      background: #ffffff;
      color: #000000;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-after: always;
    ">
      <div>
        <!-- Prominent School Name Header -->
        <div style="text-align: center; border-bottom: 2px solid #000000; padding-bottom: 5px; margin-bottom: 8px;">
          <h1 style="margin: 0; font-size: 19px; font-weight: 900; color: #000000; letter-spacing: 0.3px; line-height: 1.25;">
            ${schoolName}
          </h1>
          ${schoolSubtitle ? `
            <div style="font-size: 11.5px; font-weight: 700; color: #333333; margin-top: 1.5px;">
              ${schoolSubtitle} • વિદ્યાર્થી પરીક્ષા બ્લોક હાજરી પત્રક
            </div>
          ` : `
            <div style="font-size: 11.5px; font-weight: 700; color: #333333; margin-top: 1.5px;">
              વિદ્યાર્થી પરીક્ષા બ્લોક હાજરી પત્રક
            </div>
          `}
        </div>

        <!-- Sections Tables -->
        ${sectionsHtml}
      </div>

      <!-- Bottom Block Summary Box (Matches reference PDF exactly) -->
      <div style="
        border-top: 1.8px solid #000000;
        padding-top: 7px;
        margin-top: 8px;
        font-family: ${GUJARATI_FONT_STACK};
        font-size: 12.5px;
        line-height: 1.6;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 900; margin-bottom: 4px;">
          <div>
            બ્લોકમાં ફાળવેલ વિ..સંખ્યા. <span style="font-size: 15px; margin-left: 6px;">${block.totalAllotted}</span>
          </div>
          <div>
            હાજર સંખ્યા: <span style="display: inline-block; width: 60px; border-bottom: 1.2px dotted #000000;">&nbsp;</span>
          </div>
          <div>
            ગેર હાજર સંખ્યા: <span style="display: inline-block; width: 60px; border-bottom: 1.2px dotted #000000;">&nbsp;</span>
          </div>
        </div>
        <div style="font-weight: 800; margin-bottom: 3px;">
          ગેર હાજર નંબર : ........................................................................................................................................
        </div>
        <div style="font-weight: 800; display: flex; justify-content: space-between; align-items: center;">
          <span>બ્લોક સુપરવાઇઝરનું નામ અને સહી : ....................................................................................................</span>
          ${block.roomName ? `<span style="font-size: 11.5px; font-weight: bold; color: #444;">[ ${block.roomName} ]</span>` : ''}
        </div>
      </div>
    </div>
  `;

  if (!includeOuterPageWrap) {
    return contentHtml;
  }

  return `
    <!DOCTYPE html>
    <html lang="gu">
    <head>
      <meta charset="utf-8" />
      <title>${schoolName} — બ્લોક ${String(block.blockNumber).padStart(2, '0')} હાજરી પત્રક</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Anek+Gujarati:wght@400;500;600;700;800;900&family=Noto+Sans+Gujarati:wght@400;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        @page {
          size: ${pageSize === 'legal' ? 'legal' : 'A4'} portrait;
          margin: 0;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          margin: 0;
          padding: 0;
          background: #ffffff;
          font-family: ${GUJARATI_FONT_STACK};
        }
      </style>
    </head>
    <body>
      ${contentHtml}
    </body>
    </html>
  `;
}

/**
 * Builds printable HTML for Block Supervision Sheet (ખંડ નિરીક્ષણ કાર્ય પત્રક)
 * Exact replica of reference khand_nirikshan_4a41fc75.pdf
 */
export function buildSupervisionSheetHtml(
  school: School,
  rows: SupervisionScheduleRow[],
  examTitle: string,
  monthYear: string,
  pageSize: 'a4' | 'legal' = 'a4'
): string {
  const schoolName = school.schoolName || 'શ્રી શાળા';
  const schoolSubtitle = [school.taluka, school.district].filter(Boolean).join(', ');
  const dims = getPageDimensions(pageSize);

  // If fewer than 10 rows, pad with clean empty rows for handwriting
  const displayRows = [...rows];
  while (displayRows.length < 12) {
    displayRows.push({
      id: `empty_${displayRows.length}`,
      date: '',
      blockNumber: (displayRows.length % 4) + 1,
      allottedCount: 0,
      presentCount: '',
      absentCount: '',
      supervisorName: '',
    });
  }

  const tableRowsHtml = displayRows.map((r) => {
    return `
      <tr>
        <td style="padding: 7px 6px; text-align: center; font-weight: 700; font-size: 12px; border: 1.2px solid #000000; width: 12%;">
          ${r.date || '&nbsp;'}
        </td>
        <td style="padding: 7px 6px; text-align: center; font-weight: 800; font-size: 13px; border: 1.2px solid #000000; width: 10%;">
          ${r.blockNumber ? String(r.blockNumber) : '&nbsp;'}
        </td>
        <td style="padding: 7px 6px; text-align: center; font-weight: 700; font-size: 12.5px; border: 1.2px solid #000000; width: 11%;">
          ${r.allottedCount ? String(r.allottedCount) : '&nbsp;'}
        </td>
        <td style="padding: 7px 6px; text-align: center; font-weight: 700; font-size: 12px; border: 1.2px solid #000000; width: 11%;">
          ${r.presentCount || '&nbsp;'}
        </td>
        <td style="padding: 7px 6px; text-align: center; font-weight: 700; font-size: 12px; border: 1.2px solid #000000; width: 11%;">
          ${r.absentCount || '&nbsp;'}
        </td>
        <td style="padding: 7px 10px; text-align: left; font-weight: 700; font-size: 12px; border: 1.2px solid #000000; width: 28%;">
          ${r.supervisorName || '&nbsp;'}
        </td>
        <td style="padding: 7px 6px; text-align: center; border: 1.2px solid #000000; width: 17%;">
          &nbsp;
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="gu">
    <head>
      <meta charset="utf-8" />
      <title>${schoolName} — ખંડ નિરીક્ષણ કાર્ય (Block Supervision)</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Anek+Gujarati:wght@400;500;600;700;800;900&family=Noto+Sans+Gujarati:wght@400;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        @page {
          size: ${pageSize === 'legal' ? 'legal' : 'A4'} portrait;
          margin: 0;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          margin: 0;
          padding: 0;
          background: #ffffff;
          font-family: ${GUJARATI_FONT_STACK};
        }
      </style>
    </head>
    <body>
      <div style="
        width: 100%;
        max-width: ${dims.widthPx}px;
        min-height: ${dims.heightPx - 30}px;
        box-sizing: border-box;
        padding: 22px 28px;
        background: #ffffff;
        color: #000000;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      ">
        <div>
          <!-- Header with School Name -->
          <div style="text-align: center; margin-bottom: 12px;">
            <h1 style="margin: 0 0 4px 0; font-size: 21px; font-weight: 900; color: #000000; letter-spacing: 0.3px;">
              ${schoolName}
            </h1>
            ${schoolSubtitle ? `
              <div style="font-size: 12px; font-weight: 700; color: #333333; margin-bottom: 6px;">
                ${schoolSubtitle}
              </div>
            ` : ''}
            <h2 style="margin: 4px 0 0 0; font-size: 17.5px; font-weight: 900; color: #000000; letter-spacing: 0.5px;">
              ખંડ નિરીક્ષણ કાર્ય (BLOCK SUPERVISION)
            </h2>
          </div>

          <!-- Master Table Sub-Header (Matches reference exactly) -->
          <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000000; margin-bottom: 0;">
            <tr style="background: #F8FAFC;">
              <th colspan="7" style="padding: 7px 10px; border-bottom: 1.2px solid #000000;">
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; font-size: 13.5px; font-weight: 800;">
                  <span style="width: 50%; text-align: center;">${examTitle}</span>
                  <span style="width: 50%; text-align: center;">${monthYear}</span>
                </div>
              </th>
            </tr>
            <tr style="background: #FFFFFF;">
              <th style="padding: 8px 4px; text-align: center; font-size: 12px; font-weight: 800; border: 1.2px solid #000000; width: 12%;">
                તારીખ
              </th>
              <th style="padding: 8px 4px; text-align: center; font-size: 12px; font-weight: 800; border: 1.2px solid #000000; width: 10%;">
                બ્લોક નંબર
              </th>
              <th style="padding: 8px 4px; text-align: center; font-size: 11.5px; font-weight: 800; border: 1.2px solid #000000; width: 11%;">
                બ્લોકમાં<br/>ફાળવેલ
              </th>
              <th style="padding: 8px 4px; text-align: center; font-size: 12px; font-weight: 800; border: 1.2px solid #000000; width: 11%;">
                હાજર સંખ્યા
              </th>
              <th style="padding: 8px 4px; text-align: center; font-size: 11.5px; font-weight: 800; border: 1.2px solid #000000; width: 11%;">
                ગે.હાજર સંખ્યા
              </th>
              <th style="padding: 8px 6px; text-align: center; font-size: 12.5px; font-weight: 800; border: 1.2px solid #000000; width: 28%;">
                નિરીક્ષકનું નામ
              </th>
              <th style="padding: 8px 4px; text-align: center; font-size: 12.5px; font-weight: 800; border: 1.2px solid #000000; width: 17%;">
                સહી
              </th>
            </tr>
            ${tableRowsHtml}
          </table>
        </div>

        <!-- Footer Signatures -->
        <div style="margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; padding: 0 10px;">
          <div style="text-align: center; font-size: 12.5px; font-weight: 800;">
            તૈયાર કરનાર સ્ટાફ સહી
          </div>
          <div style="text-align: center; font-size: 12.5px; font-weight: 800;">
            પરીક્ષા સમિતિ સહી
          </div>
          <div style="text-align: center; font-size: 13px; font-weight: 900;">
            આચાર્યશ્રી સહી / સિક્કો
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Builds printable HTML for Answer Sheet Evaluation Sheet (ઉત્તરવહી પરીક્ષણ કાર્ય પત્રક)
 * Exact replica of reference uttarvahi_parikshan_71be2072.pdf
 */
export function buildAnswerSheetEvaluationHtml(
  school: School,
  rows: AnswerSheetEvaluationRow[],
  standard: string,
  examTitle: string,
  monthYear: string,
  pageSize: 'a4' | 'legal' = 'a4'
): string {
  const schoolName = school.schoolName || 'શ્રી શાળા';
  const schoolSubtitle = [school.taluka, school.district].filter(Boolean).join(', ');
  const dims = getPageDimensions(pageSize);

  const filteredRows = (standard && standard !== 'all') ? rows.filter(r => r.standard === standard) : rows;
  const displayRows = [...filteredRows];
  while (displayRows.length < 11) {
    displayRows.push({
      id: `empty_${displayRows.length}`,
      date: '',
      standard: standard || '',
      subject: '',
      sheetCount: 0,
      receivedDate: '',
      returnedDate: '',
      examinerName: '',
    });
  }

  const tableRowsHtml = displayRows.map((r) => {
    return `
      <tr>
        <td style="padding: 6.5px 6px; text-align: center; font-weight: 700; font-size: 12px; border: 1.2px solid #000000; width: 12%;">
          ${r.date || '&nbsp;'}
        </td>
        <td style="padding: 6.5px 10px; text-align: left; font-weight: 800; font-size: 12.5px; border: 1.2px solid #000000; width: 17%;">
          ${r.subject || '&nbsp;'}
        </td>
        <td style="padding: 6.5px 6px; text-align: center; font-weight: 700; font-size: 12.5px; border: 1.2px solid #000000; width: 11%;">
          ${r.sheetCount ? String(r.sheetCount) : '&nbsp;'}
        </td>
        <td style="padding: 6.5px 6px; text-align: center; font-weight: 700; font-size: 12px; border: 1.2px solid #000000; width: 13%;">
          ${r.receivedDate || '&nbsp;'}
        </td>
        <td style="padding: 6.5px 6px; text-align: center; font-weight: 700; font-size: 12px; border: 1.2px solid #000000; width: 13%;">
          ${r.returnedDate || '&nbsp;'}
        </td>
        <td style="padding: 6.5px 8px; text-align: left; font-weight: 700; font-size: 12px; border: 1.2px solid #000000; width: 20%;">
          ${r.examinerName || '&nbsp;'}
        </td>
        <td style="padding: 6.5px 6px; text-align: center; border: 1.2px solid #000000; width: 14%;">
          &nbsp;
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="gu">
    <head>
      <meta charset="utf-8" />
      <title>${schoolName} — ઉત્તરવહી પરીક્ષણ કાર્ય પત્રક</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Anek+Gujarati:wght@400;500;600;700;800;900&family=Noto+Sans+Gujarati:wght@400;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        @page {
          size: ${pageSize === 'legal' ? 'legal' : 'A4'} portrait;
          margin: 0;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          margin: 0;
          padding: 0;
          background: #ffffff;
          font-family: ${GUJARATI_FONT_STACK};
        }
      </style>
    </head>
    <body>
      <div style="
        width: 100%;
        max-width: ${dims.widthPx}px;
        min-height: ${dims.heightPx - 30}px;
        box-sizing: border-box;
        padding: 22px 28px;
        background: #ffffff;
        color: #000000;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      ">
        <div>
          <!-- Header with School Name -->
          <div style="text-align: center; margin-bottom: 12px;">
            <h1 style="margin: 0 0 4px 0; font-size: 21px; font-weight: 900; color: #000000; letter-spacing: 0.3px;">
              ${schoolName}
            </h1>
            ${schoolSubtitle ? `
              <div style="font-size: 12px; font-weight: 700; color: #333333; margin-bottom: 6px;">
                ${schoolSubtitle}
              </div>
            ` : ''}
            <h2 style="margin: 4px 0 0 0; font-size: 17.5px; font-weight: 900; color: #000000; letter-spacing: 0.5px;">
              ઉત્તરવહી પરીક્ષણ કાર્ય પત્રક
            </h2>
          </div>

          <!-- Master Table (Matches reference exactly) -->
          <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000000;">
            <tr style="background: #F8FAFC;">
              <th colspan="7" style="padding: 7px 10px; border-bottom: 1.2px solid #000000;">
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; font-size: 14px; font-weight: 800;">
                  <span style="width: 33%; text-align: left;">ધોરણ- ${standard || 'સર્વ ધોરણ'}</span>
                  <span style="width: 34%; text-align: center;">${examTitle}</span>
                  <span style="width: 33%; text-align: right;">${monthYear}</span>
                </div>
              </th>
            </tr>
            <tr style="background: #FFFFFF;">
              <th style="padding: 8px 4px; text-align: center; font-size: 12px; font-weight: 800; border: 1.2px solid #000000; width: 12%;">
                તારીખ
              </th>
              <th style="padding: 8px 6px; text-align: center; font-size: 12px; font-weight: 800; border: 1.2px solid #000000; width: 17%;">
                વિષય
              </th>
              <th style="padding: 8px 4px; text-align: center; font-size: 11px; font-weight: 800; border: 1.2px solid #000000; width: 11%;">
                ઉત્તરવહી ની<br/>સંખ્યા
              </th>
              <th style="padding: 8px 4px; text-align: center; font-size: 11px; font-weight: 800; border: 1.2px solid #000000; width: 13%;">
                ઉત્તરવહી<br/>મેળવ્યાતારીખ
              </th>
              <th style="padding: 8px 4px; text-align: center; font-size: 11px; font-weight: 800; border: 1.2px solid #000000; width: 13%;">
                ઉત્તરવહી પરત કર્યા<br/>તારીખ
              </th>
              <th style="padding: 8px 6px; text-align: center; font-size: 12px; font-weight: 800; border: 1.2px solid #000000; width: 20%;">
                પરીક્ષકનું નામ
              </th>
              <th style="padding: 8px 4px; text-align: center; font-size: 12px; font-weight: 800; border: 1.2px solid #000000; width: 14%;">
                સહી
              </th>
            </tr>
            ${tableRowsHtml}
          </table>
        </div>

        <!-- Footer Signatures -->
        <div style="margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; padding: 0 10px;">
          <div style="text-align: center; font-size: 12.5px; font-weight: 800;">
            પરીક્ષા ઇન્ચાર્જ સહી
          </div>
          <div style="text-align: center; font-size: 13px; font-weight: 900;">
            આચાર્યશ્રી સહી / સિક્કો
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Downloads a single Exam Block Seating & Attendance Sheet as PDF
 */
export async function downloadBlockAttendancePdf(
  school: School,
  block: ExamBlock,
  examTitle: string,
  monthYear: string,
  pageSize: 'a4' | 'legal' = 'a4'
): Promise<{ success: boolean; filename: string }> {
  const html = buildBlockAttendanceSheetHtml(school, block, examTitle, monthYear, pageSize, true);
  const cleanSchool = (school.schoolName || 'School').replace(/[^a-zA-Z0-9\u0A80-\u0AFF]/g, '_');
  const filename = `Block_${String(block.blockNumber).padStart(2, '0')}_Seating_${cleanSchool}_${pageSize.toUpperCase()}.pdf`;

  const dims = getPageDimensions(pageSize);
  const container = document.createElement('div');
  container.id = 'exam_file_pdf_render_container';
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.zIndex = '-9999';
  container.style.pointerEvents = 'none';
  container.style.width = `${dims.widthPx}px`;
  container.style.background = '#ffffff';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      width: dims.widthPx,
      windowWidth: dims.widthPx,
      onclone: (clonedDoc: Document) => {
        const el = clonedDoc.getElementById('exam_file_pdf_render_container');
        if (el) {
          el.style.position = 'absolute';
          el.style.top = '0px';
          el.style.left = '0px';
          el.style.margin = '0px';
        }
      },
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: pageSize === 'legal' ? 'legal' : 'a4',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, 0, dims.widthMm, dims.heightMm, undefined, 'FAST');
    const blob = pdf.output('blob');

    await downloadPdfFile(blob, filename);
    return { success: true, filename };
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

/**
 * Downloads All Blocks Consolidated into a Single Multi-Page PDF
 */
export async function downloadAllBlocksCombinedPdf(
  school: School,
  blocks: ExamBlock[],
  examTitle: string,
  monthYear: string,
  pageSize: 'a4' | 'legal' = 'a4'
): Promise<{ success: boolean; filename: string }> {
  const cleanSchool = (school.schoolName || 'School').replace(/[^a-zA-Z0-9\u0A80-\u0AFF]/g, '_');
  const filename = `All_Blocks_Seating_Sheets_${cleanSchool}_${pageSize.toUpperCase()}.pdf`;

  const dims = getPageDimensions(pageSize);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: pageSize === 'legal' ? 'legal' : 'a4',
  });

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const html = buildBlockAttendanceSheetHtml(school, block, examTitle, monthYear, pageSize, true);

    const container = document.createElement('div');
    container.id = 'exam_file_pdf_render_container';
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.zIndex = '-9999';
    container.style.pointerEvents = 'none';
    container.style.width = `${dims.widthPx}px`;
    container.style.background = '#ffffff';
    container.innerHTML = html;
    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
        width: dims.widthPx,
        windowWidth: dims.widthPx,
        onclone: (clonedDoc: Document) => {
          const el = clonedDoc.getElementById('exam_file_pdf_render_container');
          if (el) {
            el.style.position = 'absolute';
            el.style.top = '0px';
            el.style.left = '0px';
            el.style.margin = '0px';
          }
        },
      });

      if (i > 0) {
        pdf.addPage();
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, dims.widthMm, dims.heightMm, undefined, 'FAST');
    } finally {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    }
  }

  const blob = pdf.output('blob');
  await downloadPdfFile(blob, filename);
  return { success: true, filename };
}

/**
 * Downloads Block Supervision Sheet as PDF
 */
export async function downloadSupervisionSheetPdf(
  school: School,
  rows: SupervisionScheduleRow[],
  examTitle: string,
  monthYear: string,
  pageSize: 'a4' | 'legal' = 'a4'
): Promise<{ success: boolean; filename: string }> {
  const html = buildSupervisionSheetHtml(school, rows, examTitle, monthYear, pageSize);
  const cleanSchool = (school.schoolName || 'School').replace(/[^a-zA-Z0-9\u0A80-\u0AFF]/g, '_');
  const filename = `Block_Supervision_Sheet_${cleanSchool}_${pageSize.toUpperCase()}.pdf`;

  const dims = getPageDimensions(pageSize);
  const container = document.createElement('div');
  container.id = 'exam_file_pdf_render_container';
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.zIndex = '-9999';
  container.style.pointerEvents = 'none';
  container.style.width = `${dims.widthPx}px`;
  container.style.background = '#ffffff';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      width: dims.widthPx,
      windowWidth: dims.widthPx,
      onclone: (clonedDoc: Document) => {
        const el = clonedDoc.getElementById('exam_file_pdf_render_container');
        if (el) {
          el.style.position = 'absolute';
          el.style.top = '0px';
          el.style.left = '0px';
          el.style.margin = '0px';
        }
      },
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: pageSize === 'legal' ? 'legal' : 'a4',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, 0, dims.widthMm, dims.heightMm, undefined, 'FAST');
    const blob = pdf.output('blob');

    await downloadPdfFile(blob, filename);
    return { success: true, filename };
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

/**
 * Downloads Answer Sheet Evaluation Register as PDF
 */
export async function downloadAnswerSheetEvaluationPdf(
  school: School,
  rows: AnswerSheetEvaluationRow[],
  standard: string,
  examTitle: string,
  monthYear: string,
  pageSize: 'a4' | 'legal' = 'a4'
): Promise<{ success: boolean; filename: string }> {
  const html = buildAnswerSheetEvaluationHtml(school, rows, standard, examTitle, monthYear, pageSize);
  const cleanSchool = (school.schoolName || 'School').replace(/[^a-zA-Z0-9\u0A80-\u0AFF]/g, '_');
  const stdLabel = standard ? `Std_${standard}` : 'All_Classes';
  const filename = `Answer_Sheet_Evaluation_${stdLabel}_${cleanSchool}_${pageSize.toUpperCase()}.pdf`;

  const dims = getPageDimensions(pageSize);
  const container = document.createElement('div');
  container.id = 'exam_file_pdf_render_container';
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.zIndex = '-9999';
  container.style.pointerEvents = 'none';
  container.style.width = `${dims.widthPx}px`;
  container.style.background = '#ffffff';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      width: dims.widthPx,
      windowWidth: dims.widthPx,
      onclone: (clonedDoc: Document) => {
        const el = clonedDoc.getElementById('exam_file_pdf_render_container');
        if (el) {
          el.style.position = 'absolute';
          el.style.top = '0px';
          el.style.left = '0px';
          el.style.margin = '0px';
        }
      },
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: pageSize === 'legal' ? 'legal' : 'a4',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, 0, dims.widthMm, dims.heightMm, undefined, 'FAST');
    const blob = pdf.output('blob');

    await downloadPdfFile(blob, filename);
    return { success: true, filename };
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

/**
 * Universal Direct Printing for any Exam File Sheet
 */
export function printExamDocument(html: string, title = 'Exam_Document'): void {
  printHtmlDocument(html, title);
}

export function printBlockAttendanceSheet(
  school: School,
  block: ExamBlock,
  examTitle: string,
  monthYear: string,
  pageSize: 'a4' | 'legal' = 'a4'
): void {
  const html = buildBlockAttendanceSheetHtml(school, block, examTitle, monthYear, pageSize, true);
  printExamDocument(html, `Block_${block.blockNumber}_Seating`);
}

export function printAllBlocksCombined(
  school: School,
  blocks: ExamBlock[],
  examTitle: string,
  monthYear: string,
  pageSize: 'a4' | 'legal' = 'a4'
): void {
  const allHtmls = blocks
    .map((b) => buildBlockAttendanceSheetHtml(school, b, examTitle, monthYear, pageSize, false))
    .join('');

  const dims = getPageDimensions(pageSize);
  const combinedDocumentHtml = `
    <!DOCTYPE html>
    <html lang="gu">
    <head>
      <meta charset="utf-8" />
      <title>${school.schoolName || 'School'} — તમામ બ્લોક બેઠક વ્યવસ્થા</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Anek+Gujarati:wght@400;500;600;700;800;900&family=Noto+Sans+Gujarati:wght@400;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        @page {
          size: ${pageSize === 'legal' ? 'legal' : 'A4'} portrait;
          margin: 0;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          margin: 0;
          padding: 0;
          background: #ffffff;
          font-family: ${GUJARATI_FONT_STACK};
        }
        .exam-block-sheet {
          page-break-after: always;
          break-after: page;
        }
        .exam-block-sheet:last-child {
          page-break-after: auto;
          break-after: auto;
        }
      </style>
    </head>
    <body>
      ${allHtmls}
    </body>
    </html>
  `;
  printExamDocument(combinedDocumentHtml, 'All_Blocks_Seating_Sheets');
}

export function printSupervisionSheet(
  school: School,
  rows: SupervisionScheduleRow[],
  examTitle: string,
  monthYear: string,
  pageSize: 'a4' | 'legal' = 'a4'
): void {
  const html = buildSupervisionSheetHtml(school, rows, examTitle, monthYear, pageSize);
  printExamDocument(html, 'Block_Supervision_Sheet');
}

export function printAnswerSheetEvaluation(
  school: School,
  rows: AnswerSheetEvaluationRow[],
  standard: string,
  examTitle: string,
  monthYear: string,
  pageSize: 'a4' | 'legal' = 'a4'
): void {
  const html = buildAnswerSheetEvaluationHtml(school, rows, standard, examTitle, monthYear, pageSize);
  printExamDocument(html, `Answer_Sheet_Evaluation_Std_${standard || 'All'}`);
}
