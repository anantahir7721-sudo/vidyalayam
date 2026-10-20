import { Student, Staff, School } from '../types';
import { createAppNotification } from './notificationService';
import { sendNotification } from '../utils/notificationUtils';

export interface ParsedDate {
  day: number;
  month: number;
  year?: number;
}

export interface BirthdayPerson {
  id: string;
  name: string;
  type: 'student' | 'staff';
  dob: string;
  day: number;
  month: number;
  year?: number;
  age?: number;
  formattedDob: string;
  photoUrl?: string;
  customPhotoUrl?: string;
  standard?: string;
  section?: string;
  rollNumber?: string;
  grNumber?: string;
  designation?: string;
  subject?: string;
  isToday: boolean;
  daysUntil: number; // 0 = today, 1 = tomorrow, etc.
  relativeLabel: string;
  targetDateStr: string; // YYYY-MM-DD for this year's occurrence
  wish: string;
  wishIndex: number;
}

const MONTH_NAMES_EN = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTH_NAMES_GU = [
  '',
  'જાન્યુઆરી',
  'ફેબ્રુઆરી',
  'માર્ચ',
  'એપ્રિલ',
  'મે',
  'જૂન',
  'જુલાઈ',
  'ઓગસ્ટ',
  'સપ્ટેમ્બર',
  'ઓક્ટોબર',
  'નવેમ્બર',
  'ડિસેમ્બર',
];

function getOrdinalSuffix(n: number): string {
  if (n > 3 && n < 21) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function toGujaratiDigits(n: number): string {
  const guDigits = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];
  return String(n)
    .split('')
    .map((c) => guDigits[parseInt(c, 10)] || c)
    .join('');
}

/**
 * Cleanly localizes school names between Gujarati and English
 */
export function getLocalizedSchoolName(schoolName: string | undefined | null, lang: 'en' | 'gu' = 'en'): string {
  if (!schoolName) return lang === 'en' ? 'School Family' : 'શાળા પરિવાર';
  if (lang === 'gu') return schoolName;

  // If already latin characters:
  if (!/[\u0A80-\u0AFF]/.test(schoolName)) {
    return schoolName;
  }

  // Transliterate common Gujarat educational institutional terms
  let en = schoolName;
  const replacements: Array<[RegExp, string]> = [
    [/શ્રી\s*/gu, 'Shree '],
    [/સરકારી\s*/gu, 'Govt. '],
    [/ઉચ્ચતર\s*માધ્યમિક\s*શાળા\s*/gu, 'Higher Secondary School '],
    [/ઉચ્ચ\.\s*માધ્યમિક\s*શાળા\s*/gu, 'Higher Secondary School '],
    [/ઉચ્ચતર\s*માધ્યમિક\s*/gu, 'Higher Secondary '],
    [/ઉચ્ચ\.\s*માધ્યમિક\s*/gu, 'Higher Secondary '],
    [/માધ્યમિક\s*શાળા\s*/gu, 'Secondary School '],
    [/માધ્યમિક\s*/gu, 'Secondary '],
    [/પ્રાથમિક\s*શાળા\s*/gu, 'Primary School '],
    [/પ્રાથમિક\s*/gu, 'Primary '],
    [/હાઇસ્કૂલ|હાઈસ્કૂલ/gu, 'High School'],
    [/વિદ્યાલય/gu, 'Vidyalaya'],
    [/શાળા\s*/gu, 'School '],
    [/અને\s*/gu, '& '],
    [/કેન્દ્ર\s*શાળા\s*/gu, 'Center School '],
    [/કન્યા\s*શાળા\s*/gu, 'Girls School '],
    [/કુમાર\s*શાળા\s*/gu, 'Boys School '],
    [/લાખાપર/gu, 'Lakhapar'],
    [/ભુજ/gu, 'Bhuj'],
    [/ગાંધીધામ/gu, 'Gandhidham'],
    [/અંજાર/gu, 'Anjar'],
    [/માંડવી/gu, 'Mandvi'],
    [/મુંદ્રા/gu, 'Mundra'],
    [/નખત્રાણા/gu, 'Nakhatrana'],
    [/રાપર/gu, 'Rapar'],
    [/ભચાઉ/gu, 'Bhachau'],
    [/અબડાસા/gu, 'Abdasa'],
    [/કચ્છ/gu, 'Kutch'],
  ];

  for (const [regex, rep] of replacements) {
    en = en.replace(regex, rep);
  }

  return en.trim().replace(/\s{2,}/g, ' ');
}

/**
 * Rich library of distinct, uplifting educational and heartfelt wishes
 * Inspired by the reference card with highlighted keywords and sincere blessings.
 */
export const BIRTHDAY_WISHES_COLLECTION: Array<{ en: string; gu: string; keywords: string[] }> = [
  {
    en: 'We wish you a lot of success and achievement in this year. May this year with your strength and hard work you accomplish all the milestones and your every dream comes true.',
    gu: 'આપના જન્મદિને હાર્દિક શુભકામનાઓ! આપનું નવું વર્ષ જ્ઞાન, પ્રગતિ અને સફળતાથી પરિપૂર્ણ રહે. આપ મહેનત અને સંસ્કાર થકી જીવનના સર્વોચ્ચ શિખરો સર કરો તેવી પ્રભુને પ્રાર્થના.',
    keywords: ['Success and Achievement', 'સફળતા અને પ્રગતિ'],
  },
  {
    en: 'May your journey ahead be filled with knowledge, inspiration, and great victories. Keep shining bright and making our school and your family proud.',
    gu: 'જન્મદિવસની ખૂબ ખૂબ શુભેચ્છાઓ! આપની શૈક્ષણિક યાત્રા તેજસ્વી બને અને આપ જ્ઞાન, સદાચાર તથા ઉચ્ચ લક્ષ્યો સાથે સતત આગળ વધો તેવી અંતઃકરણપૂર્વકની શુભકામના.',
    keywords: ['Knowledge and Inspiration', 'જ્ઞાન અને તેજસ્વી ભવિષ્ય'],
  },
  {
    en: 'Wishing you boundless joy, wisdom, and excellence in every step of your life. May your hard work always lead you to glorious achievements.',
    gu: 'જન્મદિવસના પાવન અવસરે હાર્દિક અભિનંદન! આપનું જીવન વિદ્યા, વિનય અને ઉત્સાહથી સુવાસિત રહે અને આપ ઉત્તરોત્તર નવી સિદ્ધિઓ હાંસલ કરતા રહો.',
    keywords: ['Joy, Wisdom and Excellence', 'વિદ્યા, વિનય અને ઉત્સાહ'],
  },
  {
    en: 'May this special day bring you immense happiness, health, and bright horizons. Strive for greatness and let your good deeds illuminate the world.',
    gu: 'જન્મદિવસની મંગલમય શુભકામનાઓ! આપ દીર્ઘાયુ બનો, સ્વસ્થ રહો અને ઉચ્ચ સંસ્કારો સાથે પરિવાર તથા શાળાનું નામ રોશન કરો તેવી શુભ ભાવના.',
    keywords: ['Happiness and Health', 'ઉચ્ચ સંસ્કાર અને સુખી જીવન'],
  },
  {
    en: 'Sending our warmest blessings on your birthday! May your passion for learning and courage to explore guide you towards a magnificent future.',
    gu: 'આપને જન્મદિવસની ખૂબ ખૂબ વધાઈ! જ્ઞાનની સાધનામાં સદાય અગ્રેસર રહો અને જીવનના પ્રત્યેક ક્ષેત્રમાં વિજયી બનો તેવી શાળા પરિવાર તરફથી શુભકામના.',
    keywords: ['Passion for Learning', 'જ્ઞાનની સાધના અને વિજય'],
  },
  {
    en: 'Every milestone begins with courage. May this year bless you with focus, determination, and glorious moments that inspire everyone around you.',
    gu: 'જન્મદિને અનંત આશીર્વાદ! આપની એકાગ્રતા અને દૃઢ સંકલ્પશક્તિ આપને અપેક્ષા કરતાં પણ વધુ ભવ્ય સફળતા અપાવે તેવી અંતરની પ્રાર્થના.',
    keywords: ['Focus and Determination', 'એકાગ્રતા અને દૃઢ સંકલ્પ'],
  },
  {
    en: 'Happy Birthday! May kindness be your compass, wisdom your shield, and perseverance your engine to reach infinite heights of success.',
    gu: 'જન્મદિવસ મુબારક! સદ્ગુણો, પરોપકાર અને જ્ઞાનથી આપનું વ્યક્તિત્વ મહેકી ઊઠે અને આપ જીવનમાં સફળતાના ઉચ્ચ શિખરો સર કરો તેવી અભિલાષા.',
    keywords: ['Kindness and Wisdom', 'સદ્ગુણ અને સન્માન'],
  },
  {
    en: 'May you always have the curiosity to question, the strength to stand strong, and the humility to keep learning every day. Happy Birthday!',
    gu: 'જન્મદિવસની હાર્દિક શુભેચ્છાઓ! આપ જિજ્ઞાસુ, સાહસિક અને વિવેકી બની દેશના ઉત્તમ નાગરિક બનો તેવી ઈશ્વર ચરણોમાં પ્રાર્થના.',
    keywords: ['Curiosity and Strength', 'સાહસ અને વિવેક'],
  },
  {
    en: 'Warmest birthday wishes from the entire school family! May your talents bloom like fresh flowers and bring the fragrance of success wherever you go.',
    gu: 'શાળા પરિવાર તરફથી જન્મદિનની સ્નેહભરી શુભેચ્છાઓ! આપના સુષુપ્ત ગુણો ખીલે અને આપ સર્વત્ર પ્રસિદ્ધિ મેળવો તેવી આશા.',
    keywords: ['Fragrance of Success', 'પ્રસિદ્ધિ અને સિદ્ધિ'],
  },
  {
    en: 'A very Happy Birthday to our wonderful learner! Keep your standards high, your thoughts noble, and your efforts tireless.',
    gu: 'જન્મદિને ખૂબ ખૂબ આશીર્વાદ! આપના વિચારો ઉમદા રહે, કર્મ શ્રેષ્ઠ બને અને આપ જીવનના દરેક મોરચે ઝળહળતી સફળતા મેળવો.',
    keywords: ['Noble Thoughts and Success', 'ઉમદા કર્મ અને ઝળહળતી સફળતા'],
  },
  {
    en: 'May this year be a glorious chapter filled with brilliant ideas, academic triumphs, and lifelong memories. Have a wonderful birthday celebration!',
    gu: 'આપનું નવું વર્ષ અદ્ભુત સિદ્ધિઓ, ઉમદા વિચારો અને શૈક્ષણિક પ્રગતિથી સભર રહે. જન્મદિવસની હૃદયપૂર્વકની મંગલ શુભકામનાઓ!',
    keywords: ['Brilliant Ideas and Triumphs', 'અદ્ભુત સિદ્ધિઓ'],
  },
  {
    en: 'On your special day, we pray for your prosperity, peace, and glowing future. May you shine as a beacon of values and knowledge.',
    gu: 'જન્મદિનના શુભ અવસરે ઈશ્વર આપને ઉત્તમ બુદ્ધિ, સદ્વિચાર અને પ્રગતિના પંથે અવિરત આગળ વધવાની શક્તિ પ્રદાન કરે તેવી પ્રાર્થના.',
    keywords: ['Prosperity and Glowing Future', 'ઉત્તમ બુદ્ધિ અને સદ્વિચાર'],
  },
  {
    en: 'Happy Birthday! May your hard work today become the foundation of your glorious tomorrow. Keep striving with passion and integrity.',
    gu: 'જન્મદિવસની હાર્દિક વધાઈ! આપની આજની પરિશ્રમરૂપી સાધના આવતીકાલના ઉજ્જવળ ભવિષ્યનો મજબૂત પાયો બને તેવી શાળા પરિવારની શુભકામના.',
    keywords: ['Foundation of Tomorrow', 'પરિશ્રમ અને ઉજ્જવળ ભવિષ્ય'],
  },
  {
    en: 'May the light of learning always guide your path. Wishing you a year blessed with creative energy, discipline, and golden accomplishments.',
    gu: 'વિદ્યારૂપી અમૃત સદાય આપના જીવનને પ્રકાશિત રાખે. નવું વર્ષ રચનાત્મક ઊર્જા અને સોનેરી સિદ્ધિઓથી પરિપૂર્ણ રહે તેવી શુભેચ્છાઓ!',
    keywords: ['Creative Energy', 'સોનેરી સિદ્ધિઓ'],
  },
];

/**
 * Staff-specific wishes for respected teachers and school staff members.
 */
export const STAFF_BIRTHDAY_WISHES: Array<{ en: string; gu: string; keywords: string[] }> = [
  {
    en: 'Wishing you a very Happy Birthday! Thank you for your dedication, wisdom, and tireless guidance in shaping the future of our students and school.',
    gu: 'આદરણીય સ્ટાફ મિત્રને જન્મદિનની હાર્દિક શુભકામનાઓ! વિદ્યાર્થીઓના ઘડતર અને શાળાના વિકાસમાં આપનું સમર્પણ તથા માર્ગદર્શન સદાય પ્રેરણાદાયી રહે.',
    keywords: ['Dedication and Wisdom', 'સમર્પણ અને માર્ગદર્શન'],
  },
  {
    en: 'May this year bestow upon you good health, prosperity, and endless satisfaction in your noble profession of building nation builders.',
    gu: 'જન્મદિવસની ખૂબ ખૂબ શુભેચ્છાઓ! ઈશ્વર આપને ઉત્તમ સ્વાસ્થ્ય, દીર્ઘાયુ અને પરિવારમાં સદાય સુખ-શાંતિ અર્પે તેવી પ્રાર્થના.',
    keywords: ['Health and Prosperity', 'ઉત્તમ સ્વાસ્થ્ય અને દીર્ઘાયુ'],
  },
  {
    en: 'Warmest birthday wishes! Your inspiring leadership, kindness, and hard work make our campus a place of excellence and warmth.',
    gu: 'જન્મદિને શાળા પરિવાર તરફથી સાદર વંદન અને શુભકામના! આપના જ્ઞાન અને સદ્ભાવનાથી સમગ્ર શાળા પરિસર સતત પ્રજ્વલિત રહે.',
    keywords: ['Excellence and Warmth', 'જ્ઞાન અને સદ્ભાવના'],
  },
  {
    en: 'Happy Birthday to our esteemed colleague! May you continue to illuminate young minds with your knowledge, patience, and noble service.',
    gu: 'જન્મદિવસના પાવન અવસરે હાર્દિક અભિનંદન! આપના જ્ઞાન, ધીરજ અને નિષ્ઠાવાન શિક્ષણકાર્ય થકી વિદ્યાર્થીઓનું જીવન સદાય રોશન રહે તેવી અભિલાષા.',
    keywords: ['Knowledge and Service', 'જ્ઞાન, ધીરજ અને નિષ્ઠા'],
  },
  {
    en: 'Wishing you peace, happiness, and continued fulfillment in your sacred vocation. Thank you for making our school proud every day!',
    gu: 'શિક્ષણના પવિત્ર યજ્ઞમાં આપનું યોગદાન સદાય પ્રશંસનીય છે. ઈશ્વર આપને અને આપના પરિવારને સદાય આનંદ અને સમૃદ્ધિ અર્પે એવી મંગલ ભાવના.',
    keywords: ['Peace and Fulfillment', 'આનંદ અને સમૃદ્ધિ'],
  },
];

/**
 * Robust date parser supporting YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, etc.
 */
export function parseDateOfBirth(dob: string | undefined | null): ParsedDate | null {
  if (!dob) return null;
  const str = String(dob).trim();
  if (!str) return null;

  // YYYY-MM-DD (ISO standard)
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { year: y, month: m, day: d };
    }
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    const y = parseInt(dmyMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { year: y, month: m, day: d };
    }
  }

  // Fallback Date object parsing
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return {
      year: parsed.getFullYear(),
      month: parsed.getMonth() + 1,
      day: parsed.getDate(),
    };
  }

  return null;
}

/**
 * Get current date in Indian Standard Time (IST)
 */
export function getAuthoritativeISTDate(refDate = new Date()): Date {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(refDate);
    const y = Number(parts.find((p) => p.type === 'year')?.value) || refDate.getFullYear();
    const m = (Number(parts.find((p) => p.type === 'month')?.value) || (refDate.getMonth() + 1)) - 1;
    const d = Number(parts.find((p) => p.type === 'day')?.value) || refDate.getDate();
    return new Date(y, m, d);
  } catch {
    return new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  }
}

/**
 * Format date for card subtitle: e.g. "D.O.B: 16th July"
 */
export function formatDobForDisplay(day: number, month: number, lang: 'en' | 'gu' = 'en'): string {
  if (lang === 'gu') {
    return `જન્મ તારીખ: ${toGujaratiDigits(day)}મી ${MONTH_NAMES_GU[month] || ''}`;
  }
  return `D.O.B: ${getOrdinalSuffix(day)} ${MONTH_NAMES_EN[month] || ''}`;
}

/**
 * Select a deterministic yet unique wish for each student/staff member so no two cards are identical.
 */
export function getAssignedWish(
  personId: string,
  personType: 'student' | 'staff',
  indexOffset = 0,
  lang: 'en' | 'gu' = 'en'
): { text: string; index: number } {
  const collection = personType === 'staff' ? STAFF_BIRTHDAY_WISHES : BIRTHDAY_WISHES_COLLECTION;
  let hash = 0;
  for (let i = 0; i < personId.length; i++) {
    hash = (hash * 31 + personId.charCodeAt(i)) >>> 0;
  }
  const selectedIndex = (hash + indexOffset) % collection.length;
  const wishObj = collection[selectedIndex];
  return {
    text: lang === 'gu' ? wishObj.gu : wishObj.en,
    index: selectedIndex,
  };
}

/**
 * Build a unified BirthdayPerson item
 */
function createBirthdayPerson(
  raw: any,
  type: 'student' | 'staff',
  parsed: ParsedDate,
  todayIST: Date,
  daysUntil: number,
  wishIndexOffset = 0,
  lang: 'en' | 'gu' = 'en'
): BirthdayPerson {
  const thisYear = todayIST.getFullYear();
  let age: number | undefined;
  if (parsed.year && parsed.year > 1900 && parsed.year <= thisYear) {
    age = thisYear - parsed.year;
  }

  const name = (type === 'student' ? raw.studentName : raw.fullName) || 'વિદ્યાર્થી';
  const wishData = getAssignedWish(raw.id || name, type, wishIndexOffset, lang);

  let relativeLabel = 'આજે';
  if (daysUntil === 1) relativeLabel = 'આવતીકાલે';
  else if (daysUntil === 2) relativeLabel = '૨ દિવસમાં';
  else if (daysUntil > 2) relativeLabel = `${daysUntil} દિવસમાં`;

  const targetMonthStr = String(parsed.month).padStart(2, '0');
  const targetDayStr = String(parsed.day).padStart(2, '0');
  const targetDateStr = `${thisYear}-${targetMonthStr}-${targetDayStr}`;

  return {
    id: raw.id,
    name,
    type,
    dob: raw.dob || '',
    day: parsed.day,
    month: parsed.month,
    year: parsed.year,
    age,
    formattedDob: formatDobForDisplay(parsed.day, parsed.month, lang),
    photoUrl: raw.photoUrl || '',
    standard: raw.standard ? String(raw.standard).replace(/^class\s*/i, '') : undefined,
    section: raw.section || raw.division,
    rollNumber: raw.rollNumber ? String(raw.rollNumber) : undefined,
    grNumber: raw.grNumber ? String(raw.grNumber) : undefined,
    designation: raw.designation,
    subject: raw.subject,
    isToday: daysUntil === 0,
    daysUntil,
    relativeLabel,
    targetDateStr,
    wish: wishData.text,
    wishIndex: wishData.index,
  };
}

/**
 * Returns all students and staff members who celebrate their birthday TODAY.
 */
export function getTodayBirthdays(
  students: Student[] = [],
  staff: Staff[] = [],
  refDate = new Date(),
  lang: 'en' | 'gu' = 'en'
): BirthdayPerson[] {
  const today = getAuthoritativeISTDate(refDate);
  const curDay = today.getDate();
  const curMonth = today.getMonth() + 1;

  const result: BirthdayPerson[] = [];

  // 1. Check Students
  students.forEach((st, idx) => {
    const parsed = parseDateOfBirth(st.dob);
    if (parsed && parsed.day === curDay && parsed.month === curMonth) {
      result.push(createBirthdayPerson(st, 'student', parsed, today, 0, idx, lang));
    }
  });

  // 2. Check Staff
  staff.forEach((stf, idx) => {
    const parsed = parseDateOfBirth(stf.dob);
    if (parsed && parsed.day === curDay && parsed.month === curMonth) {
      result.push(createBirthdayPerson(stf, 'staff', parsed, today, 0, idx, lang));
    }
  });

  return result;
}

/**
 * Returns upcoming birthdays in the next 5 days (excluding today).
 */
export function getUpcomingBirthdays(
  students: Student[] = [],
  staff: Staff[] = [],
  daysAhead = 5,
  refDate = new Date(),
  lang: 'en' | 'gu' = 'en'
): BirthdayPerson[] {
  const today = getAuthoritativeISTDate(refDate);
  const curYear = today.getFullYear();
  const upcomingList: BirthdayPerson[] = [];

  // Helper: check target date matching in next 1 to daysAhead
  const checkPerson = (raw: any, type: 'student' | 'staff', idx: number) => {
    const parsed = parseDateOfBirth(raw.dob);
    if (!parsed) return;

    // Check occurrences in this year or early next year (e.g. crossing Dec to Jan)
    for (let offset = 1; offset <= daysAhead; offset++) {
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + offset);

      if (parsed.day === futureDate.getDate() && parsed.month === futureDate.getMonth() + 1) {
        upcomingList.push(createBirthdayPerson(raw, type, parsed, today, offset, idx, lang));
        break;
      }
    }
  };

  students.forEach((st, i) => checkPerson(st, 'student', i));
  staff.forEach((stf, i) => checkPerson(stf, 'staff', i));

  // Sort chronologically (soonest first)
  upcomingList.sort((a, b) => a.daysUntil - b.daysUntil);

  return upcomingList;
}

/**
 * Dispatches automated birthday notifications to the school and in-app system.
 * Fires once per day per school so duplicate alerts are never created.
 */
export async function checkAndDispatchBirthdayNotification(
  school: School,
  students: Student[] = [],
  staff: Staff[] = []
): Promise<boolean> {
  try {
    if (!school || !school.id) return false;

    const today = getAuthoritativeISTDate();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const storageKey = `bday_notif_sent_${school.id}_${todayKey}`;

    if (typeof window !== 'undefined' && localStorage.getItem(storageKey)) {
      return false; // Already sent today
    }

    const todayBirthdays = getTodayBirthdays(students, staff, today);
    if (todayBirthdays.length === 0) {
      return false;
    }

    const firstPerson = todayBirthdays[0];
    const othersCount = todayBirthdays.length - 1;

    let title = `🎂 It's ${firstPerson.name}'s birthday today!`;
    let body = `આજે ${firstPerson.name} નો જન્મદિવસ છે! સુંદર બર્થડે કાર્ડ જુઓ, ડાઉનલોડ કરો અને ગ્રૂપમાં શુભકામનાઓ મોકલો.`;

    if (othersCount > 0) {
      title = `🎂 It's ${firstPerson.name} and ${othersCount} others' birthday today!`;
      body = `આજે શાળાના કુલ ${todayBirthdays.length} વિદ્યાર્થીઓ/સ્ટાફનો જન્મદિવસ છે! હાર્દિક શુભકામના કાર્ડ જુઓ અને ડાઉનલોડ કરો.`;
    }

    // 1. Create In-App Notification in Firestore subcollection under this school
    await createAppNotification({
      schoolId: school.id,
      title,
      body,
      category: 'birthday',
      actionTab: 'birthdays',
      targetType: 'school',
      iconUrl: firstPerson.photoUrl || undefined,
      metadata: {
        birthdayCount: todayBirthdays.length,
        names: todayBirthdays.map((p) => p.name),
        date: todayKey,
      },
    });

    // 2. Trigger push notification for active browser/app session
    sendNotification(title, body, 'birthday');

    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, 'true');
    }

    return true;
  } catch (err) {
    console.warn('[BirthdayService] Notification dispatch error:', err);
    return false;
  }
}
