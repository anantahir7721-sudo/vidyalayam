/**
 * WhatsApp integration utilities for Admin communication
 * Admin WhatsApp Link: https://wa.me/qr/4XSTB6RUCXOYI1?s=v
 */

export const DEFAULT_ADMIN_PHONE = '7203070830';
export const ADMIN_WHATSAPP_LINK = 'https://wa.me/917203070830';
export const ADMIN_WHATSAPP_QR = 'https://wa.me/917203070830';

export interface SchoolApprovalDetails {
  schoolName: string;
  diseCode: string;
  district?: string;
  principalName?: string;
  contactNumber?: string;
  adminPhone?: string;
}

export interface ForgotPasswordDetails {
  diseCode: string;
  schoolName?: string;
  contactNumber?: string;
  adminPhone?: string;
}

export interface AdminPasswordResetDetails {
  adminIdentifier: string;
  adminName?: string;
  contactNumber?: string;
  adminPhone?: string;
}

/**
 * Gets the configured Admin WhatsApp phone number, default is 7203070830
 */
export function getSavedAdminPhone(): string {
  try {
    const saved = localStorage.getItem('vidyalayam_admin_phone');
    if (saved && saved.trim()) return saved.trim();
  } catch {}
  return (import.meta as any).env?.VITE_ADMIN_PHONE || DEFAULT_ADMIN_PHONE;
}

/**
 * Saves a preferred Admin WhatsApp phone number to localStorage.
 */
export function setSavedAdminPhone(phone: string): void {
  try {
    if (phone && phone.trim()) {
      localStorage.setItem('vidyalayam_admin_phone', phone.trim());
    } else {
      localStorage.removeItem('vidyalayam_admin_phone');
    }
  } catch {}
}

/**
 * Normalizes phone number to international format without + or dashes (e.g. 919876543210)
 */
export function normalizeWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) {
    return `91${digits}`; // Default to India (+91)
  }
  return digits;
}

/**
 * Generates pre-typed approval request message and WhatsApp launch URLs.
 * Ensures the message is passed in the URL so it opens automatically pre-typed in WhatsApp.
 */
export function getSchoolApprovalWhatsApp(details: SchoolApprovalDetails): {
  url: string;
  sendUrl: string;
  qrUrl: string;
  webUrl: string;
  message: string;
  adminPhone?: string;
} {
  const message = `નમસ્તે એડમિન શ્રી,
અમારી શાળાનું વિદ્યાલયમ (Vidyalayam) પોર્ટલ પર નવું રજીસ્ટ્રેશન કરેલ છે. કૃપા કરીને અમારી શાળાનું એકાઉન્ટ વહેલી તકે મંજૂર (Approve) કરવા વિનંતી છે.

📋 શાળાની વિગતો:
• શાળાનું નામ: ${details.schoolName}
• DISE કોડ: ${details.diseCode}
• જિલ્લો: ${details.district || 'ગુજરાત'}
${details.principalName ? `• આચાર્યશ્રી: ${details.principalName}\n` : ''}${details.contactNumber ? `• સંપર્ક નંબર: ${details.contactNumber}\n` : ''}
નોંધણી તારીખ: ${new Date().toLocaleDateString('gu-IN')}

કૃપા કરીને અમારું એકાઉન્ટ Approved કરવા વિનંતી છે. આભાર!`;

  const encodedMsg = encodeURIComponent(message);
  const targetPhone = details.adminPhone || getSavedAdminPhone();
  const cleanPhone = targetPhone ? normalizeWhatsAppNumber(targetPhone) : '';

  // Direct chat URL with pre-filled message
  let directUrl: string;
  if (cleanPhone) {
    directUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
  } else {
    // Universal wa.me link with prefilled text (opens chat with message pre-typed)
    directUrl = `https://wa.me/?text=${encodedMsg}`;
  }

  const sendUrl = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`
    : `https://api.whatsapp.com/send?text=${encodedMsg}`;

  const webUrl = cleanPhone
    ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`
    : `https://web.whatsapp.com/send?text=${encodedMsg}`;

  const qrUrl = `https://wa.me/qr/4XSTB6RUCXOYI1?text=${encodedMsg}&s=v`;

  return {
    url: directUrl,
    sendUrl,
    qrUrl,
    webUrl,
    message,
    adminPhone: cleanPhone,
  };
}

/**
 * Generates pre-typed forgot password message and WhatsApp launch URLs.
 */
export function getForgotPasswordWhatsApp(details: ForgotPasswordDetails): {
  url: string;
  sendUrl: string;
  qrUrl: string;
  webUrl: string;
  message: string;
  adminPhone?: string;
} {
  const message = `નમસ્તે એડમિન શ્રી,
અમારી શાળાનો વિદ્યાલયમ (Vidyalayam) પોર્ટલનો પાસવર્ડ ભૂલાઈ ગયો છે. કૃપા કરીને અમારો પાસવર્ડ રીસેટ / બદલવા માટે સહાય કરવા વિનંતી છે.

🏫 શાળાની વિગતો:
• શાળા DISE કોડ: ${details.diseCode}
${details.schoolName ? `• શાળાનું નામ: ${details.schoolName}\n` : ''}${details.contactNumber ? `• સંપર્ક નંબર: ${details.contactNumber}\n` : ''}
વિનંતી તારીખ: ${new Date().toLocaleDateString('gu-IN')}

કૃપા કરીને અમારો નવો પાસવર્ડ સેટ કરી આપવા વિનંતી છે. આભાર!`;

  const encodedMsg = encodeURIComponent(message);
  const targetPhone = details.adminPhone || getSavedAdminPhone();
  const cleanPhone = targetPhone ? normalizeWhatsAppNumber(targetPhone) : '';

  let directUrl: string;
  if (cleanPhone) {
    directUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
  } else {
    directUrl = `https://wa.me/?text=${encodedMsg}`;
  }

  const sendUrl = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`
    : `https://api.whatsapp.com/send?text=${encodedMsg}`;

  const webUrl = cleanPhone
    ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`
    : `https://web.whatsapp.com/send?text=${encodedMsg}`;

  const qrUrl = `https://wa.me/qr/4XSTB6RUCXOYI1?text=${encodedMsg}&s=v`;

  return {
    url: directUrl,
    sendUrl,
    qrUrl,
    webUrl,
    message,
    adminPhone: cleanPhone,
  };
}

/**
 * Generates pre-typed admin password reset request message and WhatsApp launch URLs.
 */
export function getAdminPasswordResetWhatsApp(details: AdminPasswordResetDetails): {
  url: string;
  sendUrl: string;
  qrUrl: string;
  webUrl: string;
  message: string;
  adminPhone?: string;
} {
  const message = `નમસ્તે સુપર એડમિન શ્રી,
વિદ્યાલયમ (Vidyalayam) પોર્ટલના એડમિન એકાઉન્ટનો પાસવર્ડ ભૂલાઈ ગયો છે. કૃપા કરીને મારો એડમિન પાસવર્ડ રીસેટ કરવા માટે સહાય કરવા વિનંતી છે.

🔐 એડમિન વિગતો:
• એડમિન Mobile / ID: ${details.adminIdentifier}
${details.adminName ? `• એડમિન નામ: ${details.adminName}\n` : ''}${details.contactNumber ? `• સંપર્ક નંબર: ${details.contactNumber}\n` : ''}વિનંતી સમય: ${new Date().toLocaleString('gu-IN')}

કૃપા કરીને મારો નવો પાસવર્ડ સેટ કરી આપવા વિનંતી છે. આભાર!`;

  const encodedMsg = encodeURIComponent(message);
  const targetPhone = details.adminPhone || getSavedAdminPhone();
  const cleanPhone = targetPhone ? normalizeWhatsAppNumber(targetPhone) : '';

  let directUrl: string;
  if (cleanPhone) {
    directUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
  } else {
    directUrl = `https://wa.me/?text=${encodedMsg}`;
  }

  const sendUrl = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`
    : `https://api.whatsapp.com/send?text=${encodedMsg}`;

  const webUrl = cleanPhone
    ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`
    : `https://web.whatsapp.com/send?text=${encodedMsg}`;

  const qrUrl = `https://wa.me/qr/4XSTB6RUCXOYI1?text=${encodedMsg}&s=v`;

  return {
    url: directUrl,
    sendUrl,
    qrUrl,
    webUrl,
    message,
    adminPhone: cleanPhone,
  };
}

/**
 * Generates WhatsApp message and launch URL when Admin sends a temporary password to a school.
 */
export function getTemporaryPasswordWhatsApp(params: {
  schoolName: string;
  diseCode: string;
  temporaryPassword: string;
  recipientPhone?: string;
}): {
  url: string;
  message: string;
} {
  const message = `નમસ્તે,
વિદ્યાલયમ (Vidyalayam) પોર્ટલ પર આપની શાળા માટે એડમિન દ્વારા ટેમ્પરરી પાસવર્ડ જનરેટ કરવામાં આવ્યો છે.

🏫 શાળાની વિગતો:
• શાળાનું નામ: ${params.schoolName}
• DISE કોડ: ${params.diseCode}

🔑 તમારો ટેમ્પરરી પાસવર્ડ:
${params.temporaryPassword}

📌 સૂચના:
1. પોર્ટલમાં તમારા DISE કોડ અને ઉપરોક્ત ટેમ્પરરી પાસવર્ડ વડે લૉગિન કરો.
2. લૉગિન થતાં જ તમને નવો પાસવર્ડ સેટ કરવાનું પૂછવામાં આવશે.
3. ત્યાં તમારો કાયમી નવો પાસવર્ડ બે વાર દાખલ કરીને સેવ કરી લેશો.

આભાર!
- એડમિન (વિદ્યાલયમ)`;

  const encoded = encodeURIComponent(message);
  const cleanPhone = params.recipientPhone ? normalizeWhatsAppNumber(params.recipientPhone) : '';
  const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;

  return { url, message };
}

export interface StudentTransferWhatsAppDetails {
  studentName: string;
  studentUid: string;
  standard?: string;
  grNumber?: string;
  registeredSchoolName: string;
  registeredSchoolDise?: string;
  registeredPrincipalName?: string;
  registeredPrincipalPhone?: string;
  currentSchoolName: string;
  currentSchoolDise?: string;
  currentPrincipalName?: string;
  currentContactPhone?: string;
}

/**
 * Generates pre-typed WhatsApp message asking the other school's principal to remove/delete
 * the student from their Vidyalayam portal so the student can be admitted to the new school.
 */
export function getStudentTransferWhatsApp(details: StudentTransferWhatsAppDetails): {
  url: string;
  message: string;
  phone: string;
} {
  const principalSalutation = details.registeredPrincipalName && details.registeredPrincipalName.trim()
    ? `નમસ્કાર આચાર્યશ્રી ${details.registeredPrincipalName.trim()},`
    : 'નમસ્કાર આચાર્યશ્રી,';

  const message = `${principalSalutation}

હું *${details.currentSchoolName.trim()}*${details.currentSchoolDise ? ` (DISE: ${details.currentSchoolDise})` : ''} માંથી સંપર્ક કરી રહ્યો છું.

અમારી શાળામાં નીચે મુજબના વિદ્યાર્થી પ્રવેશ મેળવી રહ્યા છે:
• વિદ્યાર્થીનું નામ: *${details.studentName.trim()}*
• Child UID: *${details.studentUid.trim()}*${details.standard ? `\n• ધોરણ: ${details.standard}` : ''}${details.grNumber ? `\n• G.R. નં: ${details.grNumber}` : ''}

હાલમાં વિદ્યાલયમ્ (Vidyalayam) પોર્ટલ પર આ વિદ્યાર્થી આપની શાળા *${details.registeredSchoolName.trim()}*${details.registeredSchoolDise ? ` (DISE: ${details.registeredSchoolDise})` : ''} માં નોંધાયેલ બતાવે છે.

વિદ્યાલયમ્ પોર્ટલના નિયમ મુજબ એક વિદ્યાર્થી એક સમયે ફક્ત એક જ શાળામાં નોંધાઈ શકે છે. જો આ વિદ્યાર્થી આપની શાળામાંથી નીકળી ગયા હોય, તો નમ્ર વિનંતી છે કે આપની શાળાના Vidyalayam પોર્ટલમાંથી આ વિદ્યાર્થીનું નામ કમી/ડિલીટ (Delete) કરી આપશો, જેથી અમે તેમને અમારી શાળામાં દાખલ કરી શકીએ.

આભાર સહ,
${details.currentPrincipalName ? `આચાર્યશ્રી: ${details.currentPrincipalName}\n` : ''}${details.currentSchoolName}${details.currentContactPhone ? `\nસંપર્ક: ${details.currentContactPhone}` : ''}`;

  const encoded = encodeURIComponent(message);
  const cleanPhone = details.registeredPrincipalPhone
    ? normalizeWhatsAppNumber(details.registeredPrincipalPhone)
    : '';
  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;

  return { url, message, phone: cleanPhone };
}

/**
 * Copies message to clipboard and launches WhatsApp.
 * Returns true if copy was successful.
 */
export async function launchWhatsAppWithMessage(url: string, message: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(message);
    }
  } catch (err) {
    console.warn('Clipboard write warning:', err);
  }
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}
