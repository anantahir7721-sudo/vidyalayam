import { MCQQuestion } from '../types/onlineExam';

/**
 * Direct Client-Side Gemini Service for Native Android APK.
 * 
 * Bypasses intermediate proxy servers to connect directly with Google's
 * Generative Language REST API when running on mobile devices, ensuring
 * seamless operation with zero server downtime, 404, or cookie issues.
 */

export function getGeminiApiKey(): string {
  try {
    const customKey = localStorage.getItem('vidyalayam_gemini_api_key');
    if (customKey && customKey.trim().length > 10) {
      return customKey.trim();
    }
  } catch {}

  const buildKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
  return String(buildKey).trim();
}

/**
 * Call Gemini REST API directly with automatic model fallback
 */
async function callGeminiRest(
  contents: any[],
  systemInstruction?: string,
  temperature = 0.1,
  timeoutMs = 50000
): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Gemini API Key ઉપલબ્ધ નથી. કૃપા કરીને સેટિંગ્સમાં API Key દાખલ કરો.');
  }

  const candidateModels = [
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash',
    'gemini-flash-latest',
  ];
  let lastError: any = null;

  for (const model of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    
    const requestBody: any = {
      contents,
      generationConfig: {
        temperature,
        responseMimeType: 'application/json',
      },
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData.error?.message || `HTTP ${response.status} from Google Gemini`;
        
        // If 429 quota, try next model
        if (response.status === 429 || errMsg.includes('RESOURCE_EXHAUSTED')) {
          console.warn(`[DirectGemini] Model ${model} quota exhausted, trying next model...`);
          lastError = new Error('Google AI વપરાશ મર્યાદા (Quota Limit) આવી છે.');
          continue;
        }

        throw new Error(errMsg);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text && typeof text === 'string') {
        return text;
      }
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err;
      console.warn(`[DirectGemini] Model ${model} request error:`, err?.message || err);
    }
  }

  throw lastError || new Error('Google Gemini API તરફથી પ્રતિસાદ મળ્યો નથી.');
}

/**
 * Direct MCQ Question Extraction for Mobile APK
 */
export async function directExtractQuestions(params: {
  text?: string;
  fileBase64?: string;
  mimeType?: string;
}): Promise<{ success: boolean; count: number; questions: MCQQuestion[]; error?: string }> {
  const systemPrompt = `You are an expert Gujarati and bilingual educational examination parser.
Your task is to extract Multiple Choice Questions (MCQ) from the provided document, image, scanned paper, or text.
Supported languages: Gujarati, English, Hindi, Sanskrit.

CRITICAL RULES:
1. All questions must be strictly Multiple Choice Questions (MCQs) with options A, B, C, D.
2. DO NOT GUESS OR INVENT CORRECT ANSWERS.
   - If the source paper EXPLICITLY indicates the correct answer (e.g. marked answer key, tick mark, or statement like "જવાબ: B"), extract it as 'A', 'B', 'C', or 'D'.
   - If the source paper does NOT explicitly state the correct answer, you MUST set correctAnswer to "" (empty string) and set needsReview to true.
3. Identify question number, question text, option A, option B, option C, option D, marks (default 1).
4. Assign an aiConfidence level: "high", "medium", or "low".
5. In 'reviewNotes', explain in Gujarati why review is needed if answer was not explicitly found.
6. Return ONLY a valid JSON array of objects.

JSON Schema per question:
{
  "questionNumber": number,
  "questionText": string,
  "optionA": string,
  "optionB": string,
  "optionC": string,
  "optionD": string,
  "correctAnswer": "A" | "B" | "C" | "D" | "",
  "marks": number,
  "aiConfidence": "high" | "medium" | "low",
  "needsReview": boolean,
  "reviewNotes": string
}`;

  const parts: any[] = [];

  if (params.fileBase64) {
    const cleanBase64 = params.fileBase64.replace(/^data:[^;]+;base64,/, '');
    const mime = params.mimeType || 'image/jpeg';
    parts.push({
      inlineData: {
        mimeType: mime,
        data: cleanBase64,
      },
    });
  }

  const promptText = params.text
    ? `Please extract all MCQs from this content:\n\n${params.text}`
    : 'Please extract all MCQ questions from this image/document.';

  parts.push({ text: promptText });

  const rawJson = await callGeminiRest(
    [{ role: 'user', parts }],
    systemPrompt,
    0.1,
    60000
  );

  let rawList: any[] = [];
  try {
    rawList = JSON.parse(rawJson);
    if (!Array.isArray(rawList)) {
      if ((rawList as any).questions && Array.isArray((rawList as any).questions)) {
        rawList = (rawList as any).questions;
      } else {
        rawList = [rawList];
      }
    }
  } catch {
    const match = rawJson.match(/\[[\s\S]*\]/);
    if (match) {
      rawList = JSON.parse(match[0]);
    } else {
      throw new Error('AI જવાબ યોગ્ય JSON ફોર્મેટમાં મળ્યો નથી.');
    }
  }

  const normalizedQuestions: MCQQuestion[] = rawList.map((q: any, idx: number) => {
    const qNum = typeof q.questionNumber === 'number' ? q.questionNumber : idx + 1;
    let ca = (q.correctAnswer || '').toString().trim().toUpperCase();
    if (!['A', 'B', 'C', 'D'].includes(ca)) {
      ca = '';
    }

    return {
      id: `ai-direct-${Date.now()}-${idx + 1}-${Math.random().toString(36).substring(2, 6)}`,
      schoolId: '',
      questionNumber: qNum,
      questionText: String(q.questionText || `પ્રશ્ન ${qNum}`).trim(),
      optionA: String(q.optionA || '').trim(),
      optionB: String(q.optionB || '').trim(),
      optionC: String(q.optionC || '').trim(),
      optionD: String(q.optionD || '').trim(),
      correctAnswer: ca as 'A' | 'B' | 'C' | 'D' | '',
      marks: typeof q.marks === 'number' && q.marks > 0 ? q.marks : 1,
      aiConfidence: (['high', 'medium', 'low'].includes(q.aiConfidence) ? q.aiConfidence : 'medium') as 'high' | 'medium' | 'low',
      needsReview: Boolean(q.needsReview || !ca),
      reviewNotes: q.reviewNotes || (!ca ? 'સાચો જવાબ સ્પષ્ટ નથી, કૃપા કરીને ચકાસો' : ''),
    };
  });

  return {
    success: true,
    count: normalizedQuestions.length,
    questions: normalizedQuestions,
  };
}

/**
 * Direct GSEB Presentation Script Generator for Mobile APK
 */
export async function directGeneratePresentation(params: {
  standard: string;
  subject: string;
  topic: string;
  environment?: string;
  studentName?: string;
}): Promise<any> {
  const isPrayer = String(params.environment).includes('પ્રાર્થના') || String(params.environment).includes('સભા');
  const prompt = `તમે ગુજરાત શિક્ષણ બોર્ડ (GSEB) ના અનુભવી અને પ્રેરણાદાયી શિક્ષક છો. ધોરણ ${params.standard} ના વિદ્યાર્થી માટે "${params.subject}" વિષયના મહત્વપૂર્ણ ટોપિક "${params.topic}" પર સ્ટેજ/પ્રાર્થના સભામાં આશરે ૫ મિનિટમાં આત્મવિશ્વાસથી બોલી શકાય તેવું એક સંપૂર્ણ, સચોટ, સરળ અને પ્રવાહી વક્તવ્ય તૈયાર કરો.

શિક્ષક માર્ગદર્શિકા અને નિયમો:
૧. લંબાઈ અને સમય: વક્તવ્ય બહુ ટૂંકું કે અધૂરું ન હોવું જોઈએ. આખો ટોપિક સરસ રીતે અને ઊંડાણપૂર્વક આવરી લેવો જોઈએ જે આશરે ૫ મિનિટમાં બોલાઈ જાય.
૨. સંબોધન: પ્રથમ આદરપૂર્વકનું સંબોધન (${isPrayer ? 'પ્રાર્થના સભા: માનનીય આચાર્યશ્રી, વંદનીય ગુરુજનો અને મારા વહાલા વિદ્યાર્થી મિત્રો, સૌને મારા સાદર પ્રણામ.' : 'વર્ગખંડ: આદરણીય શિક્ષકશ્રી અને મારા વહાલા સહપાઠી મિત્રો, સૌને મારા નમસ્કાર.'}).
૩. વિષય પરિચય: શ્રોતાઓનું ધ્યાન ખેંચે તેવો સ્પષ્ટ અને પ્રવાહી વિષય પરિચય.
૪. મુખ્ય વિગતવાર રજૂઆત (૨ થી ૩ સવિસ્તાર ફકરા):
   - ટોપિકની મૂળ વિભાવના, પાઠ્યપુસ્તકના પાયાના સિદ્ધાંતો અને તમામ જરૂરી વિગતો સરળ, સ્પષ્ટ ગુજરાતીમાં સમજાવો.
   - મહત્વનો નિયમ: રોજિંદા જીવનના ઉદાહરણો દરેક ટોપિકમાં બળજબરીથી મરોડીને ઘુસાડવાના નથી! જેમાં સ્વાભાવિક અને યોગ્ય લાગે એમાં જ સહજ ઉદાહરણ આપવું; બાકી વિષયના હાર્દ અને જરૂરિયાત મુજબ AI દ્વારા સચોટ માહિતીથી જ સજ્જ કરવું.
   - વિદ્યાર્થી સરળતાથી અને સ્પષ્ટ શૈલીમાં મુદ્દો રજૂ કરી શકે અને સમગ્ર સભાને મુદ્દો તુરંત સમજાઈ જાય તેવું લખાણ આપવું.
૫. સમાપન (આભાર દર્શન): સભાના શ્રોતાઓનો હૃદયપૂર્વક આભાર માનતું ગૌરવપૂર્ણ સમાપન.

ચોક્કસ JSON ફોર્મેટમાં આઉટપુટ આપો:
{
  "title": "${params.topic}",
  "standard": "${params.standard}",
  "subject": "${params.subject}",
  "environment": "${params.environment || 'પ્રાર્થના સભા'}",
  "studentName": "${params.studentName || 'વિદ્યાર્થી'}",
  "duration": "૫ મિનિટ",
  "openingSpeech": "સંબોધન વાક્ય",
  "topicIntroduction": "વિષય પરિચય (પ્રવાહી રજૂઆત)",
  "paragraph1": "પ્રથમ ફકરો: વિષય/સિદ્ધાંતની પાયાની અને ઊંડાણપૂર્વકની વિગતવાર સમજૂતી",
  "paragraph2": "બીજો ફકરો: મુખ્ય પ્રક્રિયા, સિદ્ધાંત કે ઐતિહાસિક/વૈજ્ઞાનિક વિશ્લેષણ (વિષયને અનુરૂપ હોય તો જ સહજ ઉદાહરણ સાથે)",
  "paragraph3": "ત્રીજો ફકરો: મહત્વ, શૈક્ષણિક મૂલ્ય અને સમાપન પૂર્વેનો મુખ્ય સારાંશ",
  "closingSpeech": "સમાપન (આભાર દર્શન વાક્ય)"
}`;

  const rawJson = await callGeminiRest(
    [{ role: 'user', parts: [{ text: prompt }] }],
    'You are an educational curriculum presentation expert. Return strictly valid JSON.',
    0.2,
    45000
  );

  try {
    return JSON.parse(rawJson);
  } catch {
    const match = rawJson.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('AI પ્રેઝન્ટેશન JSON પાર્સ થઈ શક્યું નહીં.');
  }
}

/**
 * Direct Abhivyakti 5-Minute Script Generator for Mobile APK
 */
export async function directGenerateAbhivyakti(params: {
  interest: string;
  talentCategory?: string;
  standard?: string;
  topic?: string;
  studentName?: string;
}): Promise<any> {
  const prompt = `તમે ગુજરાતની માધ્યમિક શાળાઓના પ્રાર્થના સંમેલન કોચ છો. વિદ્યાર્થીના રસ "${params.interest}" (ધોરણ ${params.standard || '10'}) મુજબ પ્રાર્થના સભા માટે ૫ મિનિટની સ્ટેજ સ્ક્રિપ્ટ તૈયાર કરો.

ચોક્કસ JSON આપો:
{
  "title": "${params.interest}",
  "category": "પ્રાર્થના સભા પ્રસ્તુતિ",
  "duration": "૫ મિનિટ",
  "targetAudience": "શાળા પ્રાર્થના સભા",
  "summary": "ટૂંકો સારાંશ",
  "timeBreakdown": [
    { "timeRange": "0:00 - 0:45", "activity": "આરંભ" },
    { "timeRange": "0:45 - 4:15", "activity": "મુખ્ય પ્રસ્તુતિ" },
    { "timeRange": "4:15 - 5:00", "activity": "સમાપન" }
  ],
  "fullScript": "સંપૂર્ણ બોલવાની ગુજરાતી સ્ક્રિપ્ટ",
  "deliveryTips": "સ્ટેજ પર બોલવા માટે માર્ગદર્શન"
}`;

  const rawJson = await callGeminiRest(
    [{ role: 'user', parts: [{ text: prompt }] }],
    'Return strictly valid JSON only.',
    0.3,
    45000
  );

  try {
    return JSON.parse(rawJson);
  } catch {
    const match = rawJson.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('AI અભિવ્યક્તિ JSON પાર્સ થઈ શક્યું નહીં.');
  }
}

/**
 * Direct School Notice Board Generator for Mobile APK
 */
export async function directGenerateSchoolNoticeBoard(params: {
  schoolName?: string;
  district?: string;
  taluka?: string;
}): Promise<any> {
  const cleanTaluka = String(params.taluka || 'અંજાર').replace(/\(.*?\)/g, '').trim() || 'અંજાર';
  const cleanDistrict = String(params.district || 'કચ્છ').replace(/\(.*?\)/g, '').trim() || 'કચ્છ';
  const schoolName = params.schoolName || 'ગુજરાત માધ્યમિક શાળા';

  const todayDateStr = new Date().toLocaleDateString('gu-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const prompt = `તમે ગુજરાત સરકાર શિક્ષણ વિભાગ અને GSEB ના સત્તાવાર નોટિસ બોર્ડ ઓડિટર છો.
માત્ર અધિકૃત પ્રમાણિત શિક્ષણ વિભાગના પરિપત્રો અને સૂચનાઓ દર્શાવો (gseb.org, gcert.gujarat.gov.in, digitalgujarat, sebexam).
શાળા: "${schoolName}", તાલુકો: "${cleanTaluka}", જિલ્લો: "${cleanDistrict}", તારીખ: "${todayDateStr}".

આઉટપુટ શુદ્ધ JSON બ્લોકમાં જ આપો:
{
  "noticeBulletinTitle": "અધિકૃત શાળા નોટિસ બોર્ડ — ${cleanTaluka} તાલુકો & ${cleanDistrict} જિલ્લો",
  "bulletinDate": "${todayDateStr}",
  "academicYear": "૨૦૨૬-૨૭",
  "verifiedNotices": [
    {
      "id": "notice-1",
      "category": "પરીક્ષા / મૂલ્યાંકન",
      "title": "એકમ કસોટી અને માધ્યમિક મૂલ્યાંકન સૂચના",
      "description": "ગુજરાત માધ્યમિક શિક્ષણ બોર્ડ દ્વારા આયોજિત કસોટી સંદર્ભે સમયપત્રક મુજબ કામગીરી પૂર્ણ કરવા બાબત.",
      "issuedBy": "GSEB / GCERT ગાંધીનગર",
      "priority": "high",
      "date": "${todayDateStr}",
      "officialRefNo": "GSEB/SHIKSHAN/2026",
      "actionRequired": "તમામ શિક્ષકો અને વિદ્યાર્થીઓએ નોંધ લેવી"
    }
  ]
}`;

  const rawJson = await callGeminiRest(
    [{ role: 'user', parts: [{ text: prompt }] }],
    'Return strictly valid JSON only.',
    0.2,
    45000
  );

  try {
    const parsed = JSON.parse(rawJson);
    return { success: true, data: parsed };
  } catch {
    const match = rawJson.match(/\{[\s\S]*\}/);
    if (match) return { success: true, data: JSON.parse(match[0]) };
    throw new Error('AI નોટિસ બોર્ડ JSON પાર્સ થઈ શક્યું નહીં.');
  }
}

