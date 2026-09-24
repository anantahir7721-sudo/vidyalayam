import * as XLSX from 'xlsx';
import { School, Student, MarkRecord, OnlineExam, ExamAttempt } from '../types';
import { normalizeWhatsAppNumber } from './whatsappUtils';

export interface NoticeTemplate {
  id: string;
  title: string;
  badge: string;
  subject: string;
  templateText: string;
}

export const PRESET_NOTICE_TEMPLATES: NoticeTemplate[] = [
  {
    id: 'ptm',
    title: 'વાલી-શિક્ષક મિટિંગ (PTM)',
    badge: 'મિટિંગ',
    subject: 'વાલી-શિક્ષક મિટિંગ અંગે અગત્યની સૂચના',
    templateText: `નમસ્કાર વાલીશ્રી,

વિદ્યાર્થી {વિદ્યાર્થી_નામ} (ધોરણ: {ધોરણ}) ના અભ્યાસ અને પ્રગતિની ચર્ચા અર્થે આપણી શાળા ખાતે આગામી તારીખ [તારીખ દાખલ કરો], [વાર] ના રોજ સવારે [સમય, દા.ત. ૯:૦૦] વાગ્યે વાલી-શિક્ષક મિટિંગનું આયોજન કરવામાં આવેલ છે.

આપના બાળકના ઉજ્જવળ ભવિષ્ય માટે આપની ઉપસ્થિતિ અનિવાર્ય છે, તો સમયસર ઉપસ્થિત રહેવા નમ્ર વિનંતી છે.

લી.
આચાર્યશ્રી / વર્ગ શિક્ષક
{શાળા_નામ}`,
  },
  {
    id: 'holiday',
    title: 'શાળામાં રજા અંગે સૂચના',
    badge: 'રજા',
    subject: 'શાળા રજાની જાણ બાબત',
    templateText: `નમસ્કાર વાલીશ્રી,

સર્વે વાલીઓને જણાવવાનું કે [તહેવાર/પ્રસંગનું નામ] નિમિત્તે શાળામાં તારીખ [શરૂઆત તારીખ] થી તારીખ [અંતિમ તારીખ] સુધી શૈક્ષણિક કાર્ય બંધ રહેશે અને રજા રહેશે.

ત્યારબાદ શાળા તારીખ [ખુલવાની તારીખ], [વાર] ના રોજ નિયમિત સમય મુજબ રાબેતા મુજબ શરૂ થશે. વિદ્યાર્થી {વિદ્યાર્થી_નામ} એ રજા દરમિયાન આપેલ ગૃહકાર્ય પૂર્ણ કરવું.

લી.
{શાળા_નામ}`,
  },
  {
    id: 'fee_reminder',
    title: 'ફી / દસ્તાવેજ જમા કરાવવા બાબત',
    badge: 'રીમાઇન્ડર',
    subject: 'શાળા ફી / દસ્તાવેજ બાબત રીમાઇન્ડર',
    templateText: `નમસ્કાર વાલીશ્રી,

વિદ્યાર્થી {વિદ્યાર્થી_નામ} (ધોરણ: {ધોરણ}, રોલ નં: {રોલ_નંબર}) ની સત્ર ફી / જરૂરી દસ્તાવેજ શાળા કાર્યાલય ખાતે જમા કરાવવાની બાકી છે.

તો આપને નમ્ર અપીલ છે કે વહેલી તકે શાળા સમય દરમિયાન કાર્યાલયમાં રૂબરૂ આવી જમા કરાવી જશો જેથી શૈક્ષણિક પ્રક્રિયામાં કોઈ અડચણ ન આવે. (જો ફી જમા કરાવી દીધી હોય તો આ સૂચના ધ્યાને ન લેવી).

આભાર સહ,
{શાળા_નામ}`,
  },
  {
    id: 'exam_schedule',
    title: 'પરીક્ષા કાર્યક્રમ / ટાઇમટેબલ',
    badge: 'પરીક્ષા',
    subject: 'આગામી પરીક્ષાના આયોજન બાબત',
    templateText: `નમસ્કાર વાલીશ્રી,

વિદ્યાર્થી {વિદ્યાર્થી_નામ} (ધોરણ: {ધોરણ}) ની આગામી [પરીક્ષાનું નામ, દા.ત. પ્રથમ સત્રાંત પરીક્ષા] તારીખ [તારીખ] થી શરૂ થઈ રહી છે.

પરીક્ષા સમય: સવારે [સમય] થી [સમય]
વિદ્યાર્થી નિયમિત સમયે પરીક્ષા સાધનો સાથે શાળાએ હાજર રહે અને ઘરે નિયમિત વાંચન કરે તે અંગે વાલીશ્રીએ યોગ્ય કાળજી લેવા વિનંતી.

શુભેચ્છા સહ,
{શાળા_નામ}`,
  },
  {
    id: 'absence_alert',
    title: 'વિદ્યાર્થી ગેરહાજરી સૂચના',
    badge: 'હાજરી',
    subject: 'વિદ્યાર્થીની ગેરહાજરી બાબત',
    templateText: `નમસ્કાર વાલીશ્રી,

આપના પાલ્ય {વિદ્યાર્થી_નામ} (ધોરણ: {ધોરણ}, રોલ નં: {રોલ_નંબર}) આજે તારીખ {તારીખ} ના રોજ પૂર્વ મંજૂરી કે રજા ચીઠ્ઠી વિના શાળામાં ગેરહાજર રહેલ છે.

જો કોઈ અનિવાર્ય કારણ હોય તો કૃપા કરીને વર્ગ શિક્ષક અથવા શાળા કાર્યાલયમાં જાણ કરવા વિનંતી છે. બાળકના નિયમિત શિક્ષણ માટે નિયમિત હાજરી અનિવાર્ય છે.

લી.
{શાળા_નામ}`,
  },
  {
    id: 'homework_notice',
    title: 'ગૃહકાર્ય અને અભ્યાસ બાબત',
    badge: 'અભ્યાસ',
    subject: 'વિદ્યાર્થીના અભ્યાસ અને ગૃહકાર્ય બાબત',
    templateText: `નમસ્કાર વાલીશ્રી,

વિદ્યાર્થી {વિદ્યાર્થી_નામ} (ધોરણ: {ધોરણ}) ના દૈનિક અભ્યાસ અને ગૃહકાર્ય બાબતે વાલીશ્રીએ ઘરે યોગ્ય ધ્યાન આપવા નમ્ર વિનંતી છે.

વિદ્યાર્થી દરરોજ શાળામાંથી મળેલું ગૃહકાર્ય નિયમિત પૂરું કરે અને નિયમિત પુનરાવર્તન કરે તે સુનિશ્ચિત કરવા અનુરોધ છે.

આભાર સહ,
{શાળા_નામ}`,
  },
  {
    id: 'custom',
    title: 'સામાન્ય કસ્ટમ સૂચના',
    badge: 'કસ્ટમ',
    subject: 'શાળા તરફથી અગત્યની સૂચના',
    templateText: `નમસ્કાર વાલીશ્રી,

આપના પાલ્ય {વિદ્યાર્થી_નામ} (ધોરણ: {ધોરણ}) ના સંદર્ભમાં શાળા તરફથી જણાવવાનું કે [અહીં તમારી સૂચના ટાઇપ કરો...].

આભાર સહ,
{શાળા_નામ}`,
  },
];

/**
 * Replaces smart placeholders in a message with student/school details
 */
export function replaceSmartVariables(
  template: string,
  student: Student,
  school: School,
  extraVars: Record<string, string> = {}
): string {
  const todayStr = new Date().toLocaleDateString('gu-IN');
  const parentName = student.fatherName || student.motherName || 'વાલીશ્રી';
  const cleanStandard = String(student.standard || '').replace(/^class\s*/i, '');
  const sectionStr = student.section || student.division || '';

  let res = template
    .replace(/\{વિદ્યાર્થી_નામ\}|\{studentName\}|\{student_name\}/g, student.studentName.trim())
    .replace(/\{વાલી_નામ\}|\{parentName\}|\{parent_name\}/g, parentName.trim())
    .replace(/\{ધોરણ\}|\{standard\}/g, cleanStandard + (sectionStr ? `-${sectionStr}` : ''))
    .replace(/\{રોલ_નંબર\}|\{rollNumber\}|\{roll_number\}|\{રોલ_નં\}/g, student.rollNumber || '-')
    .replace(/\{જીઆર_નંબર\}|\{grNumber\}|\{gr_number\}|\{GR_નં\}/g, student.grNumber || '-')
    .replace(/\{શાળા_નામ\}|\{schoolName\}|\{school_name\}/g, school.schoolName.trim())
    .replace(/\{આચાર્ય_નામ\}|\{principalName\}|\{principal_name\}/g, school.principalName || 'આચાર્યશ્રી')
    .replace(/\{તારીખ\}|\{date\}/g, todayStr);

  // Replace extra variables if provided
  for (const [key, val] of Object.entries(extraVars)) {
    const rx = new RegExp(`\\{${key}\\}`, 'g');
    res = res.replace(rx, val);
  }

  return res;
}

/**
 * Generates personalized parent message for an Offline Exam result (Ekam Kasoti, Term, Annual)
 */
export function formatOfflineExamResultForParent(
  school: School,
  student: Student,
  examTitle: string,
  details: {
    obtainedMarks: number;
    totalMarks: number;
    percentage: number;
    grade?: string;
    statusText?: string;
    subjectsList?: Array<{ subjectName: string; marksObtained: number; maxMarks: number; grade?: string }>;
    academicYear?: string;
  }
): string {
  const cleanStd = String(student.standard || '').replace(/^class\s*/i, '');
  const sec = student.section || student.division || '';
  const stdDisplay = cleanStd + (sec ? ` (${sec})` : '');
  const parentName = student.fatherName || student.motherName || 'વાલીશ્રી';

  let marksSection = '';
  if (details.subjectsList && details.subjectsList.length > 0) {
    marksSection = '📊 *વિષયવાર ગુણ વિગત:*\n' +
      details.subjectsList
        .map((sub) => `• ${sub.subjectName}: *${sub.marksObtained} / ${sub.maxMarks}*${sub.grade ? ` (ગ્રેડ: ${sub.grade})` : ''}`)
        .join('\n') +
      '\n-----------------------------';
  }

  const resultStatus = details.statusText || (details.percentage >= 35 ? 'ઉત્તીર્ણ (પાસ) 🏆' : 'સુધારણા જરૂરી (Needs Improvement)');

  return `🏫 *${school.schoolName.trim()}*
📋 *પરીક્ષા પરિણામ જાહેર*

આદરણીય ${parentName},
આપના પાલ્યનું પરીક્ષા પરિણામ નીચે મુજબ જાહેર થયેલ છે:

👤 વિદ્યાર્થી: *${student.studentName.trim()}*
📚 ધોરણ: *${stdDisplay}*
${student.rollNumber ? `🔢 રોલ નં: *${student.rollNumber}* | ` : ''}${student.grNumber ? `G.R. નં: *${student.grNumber}*` : ''}
📝 પરીક્ષા: *${examTitle.trim()}*

${marksSection ? `${marksSection}\n` : ''}📈 *કુલ ગુણ પરિણામ:*
• મેળવેલ ગુણ: *${details.obtainedMarks} / ${details.totalMarks}*
• ટકાવારી: *${details.percentage.toFixed(1)}%*
${details.grade ? `• ગ્રેડ: *${details.grade}*\n` : ''}• પરિણામ: *${resultStatus}*

બાળકની ઉત્તરોત્તર પ્રગતિ અને ઉજ્જવળ ભવિષ્ય માટે આપના સાથ-સહકાર બદલ આભાર!

શુભેચ્છા સહ,
*{school.schoolName.trim()}*${school.contactPhone ? `\n📞 સંપર્ક: ${school.contactPhone}` : ''}`;
}

/**
 * Generates personalized parent message for an Online MCQ Exam result
 */
export function formatOnlineExamResultForParent(
  school: School,
  student: Student,
  exam: OnlineExam,
  attempt?: ExamAttempt
): string {
  const cleanStd = String(student.standard || exam.standard || '').replace(/^class\s*/i, '');
  const sec = student.section || student.division || '';
  const stdDisplay = cleanStd + (sec ? ` (${sec})` : '');
  const parentName = student.fatherName || student.motherName || 'વાલીશ્રી';

  if (!attempt || attempt.status !== 'submitted') {
    return `🏫 *${school.schoolName.trim()}*
💻 *ઓનલાઇન કસોટી જાણકારી*

આદરણીય ${parentName},
આપના પાલ્ય *${student.studentName.trim()}* (ધોરણ: ${stdDisplay}) એ વિદ્યાલયમ્ પોર્ટલ પર યોજાયેલ ઓનલાઇન કસોટી: *${exam.title.trim()}* હજુ સબમિટ કરેલ નથી.

કૃપા કરીને વિદ્યાર્થી નિયત સમયમાં કસોટી આપી સબમિટ કરે તે માટે પ્રેરિત કરવા વિનંતી.

આભાર સહ,
*{school.schoolName.trim()}*`;
  }

  const passingMarks = exam.passingMarks || Math.round(exam.totalMarks * 0.35);
  const isPassed = attempt.score >= passingMarks;
  const statusText = isPassed ? 'ઉત્તીર્ણ (PASS) 🏆' : 'સુધારણા જરૂરી (Needs Improvement)';
  const dateStr = attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString('gu-IN') : new Date().toLocaleDateString('gu-IN');

  return `🏫 *${school.schoolName.trim()}*
💻 *ઓનલાઇન કસોટી પરિણામ*

આદરણીય ${parentName},
આપના પાલ્ય દ્વારા વિદ્યાલયમ્ પોર્ટલ પર આપેલ ઓનલાઇન કસોટીનું પરિણામ:

👤 વિદ્યાર્થી: *${student.studentName.trim()}*
📚 ધોરણ: *${stdDisplay}*${student.rollNumber ? ` | રોલ નં: *${student.rollNumber}*` : ''}
📝 કસોટી: *${exam.title.trim()}*
📖 વિષય: *${exam.subject}*

📊 *પરિણામ વિગત:*
• મેળવેલ ગુણ: *${attempt.score} / ${exam.totalMarks}*
• ટકાવારી: *${attempt.percentage.toFixed(1)}%*
• સાચા જવાબો: *${attempt.correctCount} / ${exam.questionsCount}*
• સ્થિતિ: *${statusText}*
• સબમિટ તારીખ: *${dateStr}*

બાળકની શૈક્ષણિક પ્રગતિ માટે ઉત્સાહ વધારવા આપનો સહકાર આવકાર્ય છે.

આભાર સહ,
*{school.schoolName.trim()}*${school.contactPhone ? `\n📞 સંપર્ક: ${school.contactPhone}` : ''}`;
}

/**
 * Builds direct WhatsApp link with encoded text
 */
export function buildWhatsAppLink(phone: string, text: string): string {
  const cleanPhone = normalizeWhatsAppNumber(phone);
  const encoded = encodeURIComponent(text);
  return cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

/**
 * Builds direct SMS link (works natively on Android / iOS devices)
 */
export function buildSmsLink(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, '');
  const encoded = encodeURIComponent(text);
  return `sms:${digits}?body=${encoded}`;
}

/**
 * Exports parent message dispatch list to Excel
 */
export function exportParentMessagesToExcel(
  items: Array<{
    studentName: string;
    standard: string;
    section?: string;
    rollNumber?: string;
    grNumber?: string;
    parentName?: string;
    parentPhone: string;
    messageText: string;
    status: string;
  }>,
  fileName: string = 'Vidyalayam_Parent_Messages'
): void {
  const rows = items.map((it, idx) => ({
    'અનુક્રમ': idx + 1,
    'વિદ્યાર્થીનું નામ': it.studentName,
    'ધોરણ': it.standard,
    'વર્ગ/સેક્શન': it.section || '',
    'રોલ નં': it.rollNumber || '',
    'G.R. નં': it.grNumber || '',
    'વાલીનું નામ': it.parentName || '',
    'વાલી મોબાઇલ નંબર': it.parentPhone || 'મોબાઇલ નંબર નથી',
    'સ્થિતિ': it.status === 'sent' ? 'મોકલાયું' : it.status === 'no_phone' ? 'નંબર નથી' : 'બાકી',
    'સંદેશ (મેસેજ લખાણ)': it.messageText,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  // Auto-width
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 28 },
    { wch: 8 },
    { wch: 10 },
    { wch: 8 },
    { wch: 10 },
    { wch: 22 },
    { wch: 18 },
    { wch: 12 },
    { wch: 60 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'વાલી મેસેજિંગ યાદી');
  XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Builds a single consolidated class broadcast message for WhatsApp Parents Group / Broadcast List
 */
export function buildClassConsolidatedBroadcastMessage(
  school: School,
  recipients: Array<{
    studentName: string;
    standard: string;
    rollNumber?: string;
    grNumber?: string;
    section?: string;
    messageText: string;
    examScore?: {
      obtainedMarks: number;
      totalMarks: number;
      percentage: number;
      grade?: string;
      statusText?: string;
      subjectsSummary?: string;
    };
  }>,
  title: string,
  examTitle?: string,
  standard?: string
): string {
  const stdDisplay = standard ? `ધોરણ ${standard}` : 'વિદ્યાર્થીઓ';
  const today = new Date().toLocaleDateString('gu-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const header = `📋 *${school.schoolName?.trim() || 'વિદ્યાલયમ શાળા'}*\n📢 *${title}*\n━━━━━━━━━━━━━━━━━━━━\n📚 વર્ગ/ધોરણ: *${stdDisplay}*\n📅 તારીખ: *${today}*`;

  const hasExamScores = recipients.some((r) => r.examScore);

  let body = '';
  if (hasExamScores) {
    body = `\n\nનમસ્કાર વાલીશ્રીઓ,\nઆપણી શાળામાં લેવાયેલ *${examTitle || 'પરીક્ષા'}* નું પરિણામ જાહેર કરવામાં આવેલ છે. વિદ્યાર્થીઓના ગુણ નીચે મુજબ છે:\n\n*પરિણામ યાદી:*`;

    // Sort by roll number or student name
    const sorted = [...recipients].sort((a, b) => {
      const rA = parseInt(a.rollNumber || '999', 10);
      const rB = parseInt(b.rollNumber || '999', 10);
      if (rA !== rB && !isNaN(rA) && !isNaN(rB)) return rA - rB;
      return a.studentName.localeCompare(b.studentName);
    });

    sorted.forEach((r, idx) => {
      const rollStr = r.rollNumber ? `[રોલ ${r.rollNumber}]` : `[${idx + 1}]`;
      if (r.examScore) {
        const marksStr = `${r.examScore.obtainedMarks}/${r.examScore.totalMarks}`;
        const pctStr = `${r.examScore.percentage.toFixed(1)}%`;
        const gradeStr = r.examScore.grade ? `(${r.examScore.grade})` : '';
        body += `\n${rollStr} *${r.studentName}*: ${marksStr} • ${pctStr} ${gradeStr}`;
      } else {
        body += `\n${rollStr} *${r.studentName}*`;
      }
    });

    const passedCount = recipients.filter(
      (r) => r.examScore && (r.examScore.percentage >= 33 || r.examScore.statusText?.includes('ઉત્તીર્ણ'))
    ).length;

    body += `\n\n📊 *સારાંશ:* કુલ વિદ્યાર્થીઓ: *${recipients.length}* | ઉત્તીર્ણ: *${passedCount}*`;
  } else {
    // General Notice broadcast
    const sampleMsg = recipients[0]?.messageText || '';
    body = `\n\n${sampleMsg}`;
  }

  const footer = `\n\nકોઈ પણ માહિતી કે પરામર્શ માટે શાળા સમય દરમિયાન સંપર્ક કરવો.\n\nઆભાર સહ,\n*આચાર્યશ્રી / વર્ગ શિક્ષક*\n*${school.schoolName?.trim() || 'શાળા કાર્યાલય'}*${school.contactPhone ? `\n📞 સંપર્ક: ${school.contactPhone}` : ''}`;

  return `${header}${body}${footer}`;
}

/**
 * Builds direct Group SMS link (Android/iOS will prefill multiple recipients)
 */
export function buildGroupSmsLink(phones: string[], text: string): string {
  const clean = phones
    .map((p) => p.replace(/\D/g, ''))
    .filter((p) => p.length >= 10)
    .map((p) => p.slice(-10));
  const unique = Array.from(new Set(clean));
  const encoded = encodeURIComponent(text);
  return `sms:${unique.join(',')}?body=${encoded}`;
}

/**
 * Exports vCard (.vcf) contacts file so teachers can import all parent contacts to their phone in 1 click
 */
export function exportParentContactsVcf(
  items: Array<{
    studentName: string;
    parentPhone: string;
    standard: string;
    section?: string;
    rollNumber?: string;
  }>,
  fileName: string = 'Vidyalayam_Parents_Contacts'
): boolean {
  let vcfData = '';
  let count = 0;

  items.forEach((r) => {
    if (!r.parentPhone) return;
    const cleanPhone = r.parentPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) return;
    const phoneWithCode = cleanPhone.startsWith('91') && cleanPhone.length > 10 ? `+${cleanPhone}` : `+91${cleanPhone.slice(-10)}`;
    const rollPart = r.rollNumber ? ` R${r.rollNumber}` : '';
    const contactName = `${r.studentName}${rollPart} વાલી (ધો.${r.standard})`;

    vcfData += 'BEGIN:VCARD\r\n';
    vcfData += 'VERSION:3.0\r\n';
    vcfData += `FN:${contactName}\r\n`;
    vcfData += `N:વાલી;${r.studentName}${rollPart};;;\r\n`;
    vcfData += `TEL;TYPE=CELL:${phoneWithCode}\r\n`;
    vcfData += `NOTE:વિદ્યાલયમ શાળા: ધોરણ ${r.standard} ${r.section || ''}\r\n`;
    vcfData += 'END:VCARD\r\n';
    count++;
  });

  if (count === 0) {
    return false;
  }

  const blob = new Blob([vcfData], { type: 'text/vcard;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.vcf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}

