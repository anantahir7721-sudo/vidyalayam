/**
 * WhatsApp integration utilities for Admin communication
 * Admin WhatsApp Link: https://wa.me/qr/4XSTB6RUCXOYI1?s=v
 */

export const ADMIN_WHATSAPP_LINK = 'https://wa.me/qr/4XSTB6RUCXOYI1?s=v';

export interface SchoolApprovalDetails {
  schoolName: string;
  diseCode: string;
  district?: string;
  principalName?: string;
  contactNumber?: string;
}

export interface ForgotPasswordDetails {
  diseCode: string;
  schoolName?: string;
  contactNumber?: string;
}

/**
 * Generates pre-typed approval request message and WhatsApp launch URL
 */
export function getSchoolApprovalWhatsApp(details: SchoolApprovalDetails): {
  url: string;
  message: string;
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

  const url = `${ADMIN_WHATSAPP_LINK}&text=${encodeURIComponent(message)}`;
  return { url, message };
}

/**
 * Generates pre-typed forgot password message and WhatsApp launch URL
 */
export function getForgotPasswordWhatsApp(details: ForgotPasswordDetails): {
  url: string;
  message: string;
} {
  const message = `નમસ્તે એડમિન શ્રી,
અમારી શાળાનો વિદ્યાલયમ (Vidyalayam) પોર્ટલનો પાસવર્ડ ભૂલાઈ ગયો છે. કૃપા કરીને અમારો પાસવર્ડ રીસેટ / બદલવા માટે સહાય કરવા વિનંતી છે.

🏫 શાળાની વિગતો:
• શાળા DISE કોડ: ${details.diseCode}
${details.schoolName ? `• શાળાનું નામ: ${details.schoolName}\n` : ''}${details.contactNumber ? `• સંપર્ક નંબર: ${details.contactNumber}\n` : ''}
વિનંતી તારીખ: ${new Date().toLocaleDateString('gu-IN')}

કૃપા કરીને અમારો નવો પાસવર્ડ સેટ કરી આપવા વિનંતી છે. આભાર!`;

  const url = `${ADMIN_WHATSAPP_LINK}&text=${encodeURIComponent(message)}`;
  return { url, message };
}
