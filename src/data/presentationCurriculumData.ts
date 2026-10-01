/**
 * Gujarat Secondary & Higher Secondary Education Board (GSEB)
 * Standard, Subject and Textbook Topics Database for Student Presentations
 */

export interface GsebSubject {
  id: string;
  name: string; // Gujarati name
  icon: string;
  standards: number[]; // e.g. [6, 7, 8, 9, 10]
  popularTopics: Array<{
    topic: string;
    chapter?: string;
    standard: number;
    description: string;
    hasBlackboard: boolean;
  }>;
}

export interface PresentationScriptData {
  title: string;
  standard: string;
  subject: string;
  duration: string;
  environment: string;
  hook: string;
  introduction: string;
  blackboardWork?: {
    useBlackboard: boolean;
    boardTitle: string;
    leftSection: string[];
    diagramDescription: string;
    rightSection: string[];
    teacherTip: string;
  };
  presentationSteps: Array<{
    stepNumber: number;
    subHeading: string;
    spokenScript: string;
    actionInstruction: string;
  }>;
  realLifeExample: string;
  audienceQuestions: Array<{
    question: string;
    expectedAnswer: string;
  }>;
  conclusion: string;
}

export const GSEB_STANDARDS = [
  { value: 1, label: 'ધોરણ ૧ (Std 1)' },
  { value: 2, label: 'ધોરણ ૨ (Std 2)' },
  { value: 3, label: 'ધોરણ ૩ (Std 3)' },
  { value: 4, label: 'ધોરણ ૪ (Std 4)' },
  { value: 5, label: 'ધોરણ ૫ (Std 5)' },
  { value: 6, label: 'ધોરણ ૬ (Std 6)' },
  { value: 7, label: 'ધોરણ ૭ (Std 7)' },
  { value: 8, label: 'ધોરણ ૮ (Std 8)' },
  { value: 9, label: 'ધોરણ ૯ (Std 9)' },
  { value: 10, label: 'ધોરણ ૧૦ (Std 10 - SSC)' },
  { value: 11, label: 'ધોરણ ૧૧ (Std 11)' },
  { value: 12, label: 'ધોરણ ૧૨ (Std 12 - HSC)' },
];

export const GSEB_SUBJECTS: GsebSubject[] = [
  {
    id: 'science',
    name: 'વિજ્ઞાન અને ટેકનોલોજી (Science)',
    icon: '🔬',
    standards: [6, 7, 8, 9, 10],
    popularTopics: [
      {
        topic: 'પ્રકાશનું પરાવર્તન અને તેના નિયમો',
        chapter: 'પ્રકરણ ૧૦: પ્રકાશ - પરાવર્તન અને વક્રીભવન',
        standard: 10,
        description: 'આપાતકોણ અને પરાવર્તનકોણ સમાન હોય છે તથા આપાતકિરણ, પરાવર્તિત કિરણ અને લંબ એક જ સમતલમાં હોય છે.',
        hasBlackboard: true,
      },
      {
        topic: 'મનુષ્યનું પાચનતંત્ર અને અંગોનું કાર્ય',
        chapter: 'પ્રકરણ ૬: જૈવિક ક્રિયાઓ',
        standard: 10,
        description: 'મુખથી લઈને નાના અને મોટા આંતરડા સુધી ખોરાકના પાચનની સરળ તબક્કાવાર સમજૂતી.',
        hasBlackboard: true,
      },
      {
        topic: 'જળચક્ર (Water Cycle) અને વરસાદનું નિર્માણ',
        chapter: 'પ્રકરણ ૧૪: નૈસર્ગિક સ્ત્રોતો',
        standard: 9,
        description: 'બાષ્પીભવન, ઘનીભવન અને વરસાદની પ્રક્રિયાનું ચિત્ર સાથે વર્ણન.',
        hasBlackboard: true,
      },
      {
        topic: 'સૂર્યમંડળ અને ગ્રહોની રચના',
        chapter: 'અંતરીક્ષ વિજ્ઞાન',
        standard: 8,
        description: 'સૂર્યથી વિવિધ ગ્રહોનું અંતર, પરિભ્રમણ અને પૃથ્વીની વિશેષતા.',
        hasBlackboard: true,
      },
      {
        topic: 'પ્રકાશસંશ્લેષણ (Photosynthesis) પ્રક્રિયા',
        chapter: 'વનસ્પતિમાં પોષણ',
        standard: 7,
        description: 'વનસ્પતિ સૂર્યપ્રકાશ, હરિતદ્રવ્ય, પાણી અને CO2 ની મદદથી ખોરાક કેવી રીતે બનાવે છે.',
        hasBlackboard: true,
      },
      {
        topic: 'પર્યાવરણ પ્રદૂષણ અને ઉપાયો',
        chapter: 'આપણું પર્યાવરણ',
        standard: 8,
        description: 'હવા, પાણી અને જમીન પ્રદૂષણ અટકાવવા માટે વિદ્યાર્થીઓ શું કરી શકે.',
        hasBlackboard: false,
      },
    ],
  },
  {
    id: 'maths',
    name: 'ગણિત (Mathematics)',
    icon: '📐',
    standards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    popularTopics: [
      {
        topic: 'પાયથાગોરસનો પ્રમેય અને તેનું વ્યાવહારિક મહત્વ',
        chapter: 'પ્રકરણ ૬: ત્રિકોણ',
        standard: 10,
        description: 'કાટકોણ ત્રિકોણમાં કર્ણનો વર્ગ બાકીની બે બાજુઓના વર્ગોના સરવાળા જેટલો હોય છે.',
        hasBlackboard: true,
      },
      {
        topic: 'વર્તુળનું ક્ષેત્રફળ અને પરિઘની ગણતરી',
        chapter: 'પ્રકરણ ૧૨: વર્તુળ સંબંધિત ક્ષેત્રફળ',
        standard: 10,
        description: 'π ની કિંમત અને રોજિંદા જીવનમાં પૈડાં કે થાળીના માપનનું ઉદાહરણ.',
        hasBlackboard: true,
      },
      {
        topic: 'સમાંતર શ્રેણી (Arithmetic Progression)',
        chapter: 'પ્રકરણ ૫: સમાંતર શ્રેણી',
        standard: 10,
        description: 'સીડીના પગથિયાં કે બચત ખાતામાં વ્યાજની સરળ શ્રેણીબદ્ધ સમજૂતી.',
        hasBlackboard: true,
      },
      {
        topic: 'ખૂણાઓના પ્રકાર (લઘુકોણ, કાટકોણ, ગુરુકોણ)',
        chapter: 'ભૂમિતિના પાયાના ખ્યાલો',
        standard: 7,
        description: 'ઘડિયાળના કાંટા અને કાતરના ઉદાહરણ દ્વારા ખૂણાઓની ઓળખ.',
        hasBlackboard: true,
      },
    ],
  },
  {
    id: 'social_science',
    name: 'સામાજિક વિજ્ઞાન (Social Science)',
    icon: '🏛️',
    standards: [6, 7, 8, 9, 10],
    popularTopics: [
      {
        topic: 'ભારતનો સાંસ્કૃતિક વારસો અને શિલ્પ-સ્થાપત્ય',
        chapter: 'પ્રકરણ ૧: ભારતનો વારસો',
        standard: 10,
        description: 'ગુજરાતના મોઢેરાનું સૂર્યમંદિર, રાણકી વાવ અને ભારતની ભવ્ય ધરોહર.',
        hasBlackboard: false,
      },
      {
        topic: 'ભારતીય બંધારણના મૂળભૂત હકો અને ફરજો',
        chapter: 'નાગરિકશાસ્ત્ર',
        standard: 9,
        description: 'સમાનતા, સ્વતંત્રતાનો હક અને દેશ પ્રત્યે નાગરિક તરીકે આપણી ફરજો.',
        hasBlackboard: true,
      },
      {
        topic: 'આપત્તિ વ્યવસ્થાપન: ધરતીકંપ અને પૂર વખતે સાવચેતી',
        chapter: 'આપત્તિ વ્યવસ્થાપન',
        standard: 8,
        description: 'કુદરતી હોનારત વખતે ગભરાયા વગર શું કરવું અને શું ન કરવું.',
        hasBlackboard: true,
      },
      {
        topic: 'મહાત્મા ગાંધી અને દાંડીકૂચ',
        chapter: 'ભારતનો સ્વાતંત્ર્ય સંગ્રામ',
        standard: 8,
        description: 'મીઠાના અન્યાયી કાયદા સામે ગાંધીજીની અહિંસક લડત.',
        hasBlackboard: false,
      },
    ],
  },
  {
    id: 'gujarati',
    name: 'ગુજરાતી (Gujarati First Language)',
    icon: '📚',
    standards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    popularTopics: [
      {
        topic: 'માતૃભાષા ગુજરાતીનું ગૌરવ અને મહત્વ',
        chapter: 'નિબંધ & વક્તવ્ય',
        standard: 9,
        description: 'નર્મદ, દલપતરામ અને ઉમાશંકર જોશીની પંક્તિઓ સાથે ગુજરાતી ભાષાનો મહિમા.',
        hasBlackboard: true,
      },
      {
        topic: 'વૃક્ષો આપણા પરમ મિત્ર',
        chapter: 'પર્યાવરણ અને સાહિત્ય',
        standard: 6,
        description: 'વૃક્ષ વાવો વરસાદ લાવો - વૃક્ષોના ફાયદા અને જતન.',
        hasBlackboard: false,
      },
      {
        topic: 'સમયનું મૂલ્ય (Time Management)',
        chapter: 'જીવન ઘડતર',
        standard: 10,
        description: 'વિદ્યાર્થી જીવનમાં સમયપાલનની મહત્તા અને સફળતાની ચાવી.',
        hasBlackboard: false,
      },
    ],
  },
  {
    id: 'english',
    name: 'અંગ્રેજી (English Second Language)',
    icon: '🌍',
    standards: [5, 6, 7, 8, 9, 10, 11, 12],
    popularTopics: [
      {
        topic: 'Importance of Trees in Human Life',
        chapter: 'Environment',
        standard: 9,
        description: 'How trees provide oxygen, medicine, and shade in simple English with Gujarati explanation.',
        hasBlackboard: true,
      },
      {
        topic: 'My Role Model / Ideal Person',
        chapter: 'Personality Development',
        standard: 8,
        description: 'Speaking about APJ Abdul Kalam or Sardar Vallabhbhai Patel.',
        hasBlackboard: false,
      },
    ],
  },
  {
    id: 'physics',
    name: 'ભૌતિક વિજ્ઞાન (Physics - Std 11-12)',
    icon: '⚡',
    standards: [11, 12],
    popularTopics: [
      {
        topic: 'ન્યુટનના ગતિના ત્રણ નિયમો અને રોકેટ સિદ્ધાંત',
        chapter: 'ગતિના નિયમો',
        standard: 11,
        description: 'આઘાત અને પ્રત્યાઘાત હંમેશા સમાન અને પરસ્પર વિરુદ્ધ દિશામાં હોય છે.',
        hasBlackboard: true,
      },
      {
        topic: 'વિદ્યુતપ્રવાહની ચુંબકીય અસરો અને મોટર',
        chapter: 'ઇલેક્ટ્રોમેગ્નેટિઝમ',
        standard: 12,
        description: 'વિદ્યુત મોટરનું કાર્ય સિદ્ધાંત અને ફ્લેમિંગનો ડાબા હાથનો નિયમ.',
        hasBlackboard: true,
      },
    ],
  },
  {
    id: 'chemistry',
    name: 'રસાયણ વિજ્ઞાન (Chemistry - Std 11-12)',
    icon: '🧪',
    standards: [11, 12],
    popularTopics: [
      {
        topic: 'આવર્ત કોષ્ટક (Periodic Table) ની રચના અને તત્વો',
        chapter: 'તત્વોનું આવર્તી વર્ગીકરણ',
        standard: 11,
        description: 'ધાતુઓ, અધાતુઓ અને નોબલ વાયુઓની સરળ ઓળખ.',
        hasBlackboard: true,
      },
    ],
  },
  {
    id: 'biology',
    name: 'જીવવિજ્ઞાન (Biology - Std 11-12)',
    icon: '🧬',
    standards: [11, 12],
    popularTopics: [
      {
        topic: 'માનવ હૃદયની રચના અને રુધિરાભિસરણ તંત્ર',
        chapter: 'શરીર દ્રવ્યો અને પરિવહન',
        standard: 11,
        description: 'કર્ણક, ક્ષેપક અને વાલ્વ દ્વારા શુદ્ધ અને અશુદ્ધ લોહીનું વહન.',
        hasBlackboard: true,
      },
    ],
  },
  {
    id: 'commerce',
    name: 'નામાના મૂળતત્વો & વાણિજ્ય (Commerce - Std 11-12)',
    icon: '📊',
    standards: [11, 12],
    popularTopics: [
      {
        topic: 'દ્વિનોંધી નામા પદ્ધતિના નિયમો (Debit & Credit Rules)',
        chapter: 'નામાના નિયમો',
        standard: 11,
        description: 'વ્યક્તિગત, માલ-મિલકત અને ઉપજ-ખર્ચ ખાતાના પાયાના નિયમો.',
        hasBlackboard: true,
      },
    ],
  },
];

// Rich fallback presentation template generator for GSEB topics
export function generateCurriculumPresentationScript(
  standard: number,
  subjectName: string,
  topic: string,
  duration = '3-5 મિનિટ',
  environment = 'સભા & વર્ગખંડ',
  studentName = 'વિદ્યાર્થી'
): PresentationScriptData {
  const stdLabel = `ધોરણ ${standard}`;
  const isScienceOrMath =
    subjectName.includes('વિજ્ઞાન') ||
    subjectName.includes('ગણિત') ||
    subjectName.includes('ભૌતિક') ||
    subjectName.includes('સાયન્સ');

  return {
    title: topic,
    standard: stdLabel,
    subject: subjectName,
    duration,
    environment,
    hook: `નમસ્કાર સૌ ગુરુજનો અને મારા વહાલા સહપાઠી મિત્રો! હું ${studentName}, ${stdLabel} માં અભ્યાસ કરું છું. આજે આપણી સમક્ષ ${subjectName} ના ખૂબ જ રસપ્રદ અને મહત્વના વિષય "${topic}" પર એક નાની સમજૂતી પ્રસ્તુત કરી રહ્યો છું.`,
    introduction: `મિત્રો, આપણી ગુજરાત બોર્ડ (GSEB) ની પાઠ્યપુસ્તકમાં આ વિષય માત્ર પરીક્ષામાં માર્ક્સ મેળવવા પૂરતો નથી, પણ આપણા રોજિંદા વ્યવહાર અને કુદરતના નિયમો સમજવા માટે અનિવાર્ય છે. "${topic}" ને જો આપણે સાદી ભાષામાં સમજીએ તો તે આપણી આસપાસ ઘટતી રોજિંદી ઘટનાઓ સાથે સીધો જોડાયેલો છે.`,
    blackboardWork: {
      useBlackboard: true,
      boardTitle: topic,
      leftSection: [
        'મુખ્ય મુદ્દો ૧: વિષયની સાદી વ્યાખ્યા',
        'મુખ્ય મુદ્દો ૨: મૂળભૂત નિયમો / સિદ્ધાંત',
        'મુખ્ય મુદ્દો ૩: રોજિંદા જીવનમાં ઉપયોગ',
      ],
      diagramDescription: isScienceOrMath
        ? 'બોર્ડની મધ્યમાં વિષયનું સરળ રેખાચિત્ર દોરો (દા.ત. કિરણ, આકૃતિ, બ્લોક ડાયાગ્રામ) અને તીર દ્વારા મુખ્ય ભાગો દર્શાવો.'
        : 'બોર્ડની મધ્યમાં કન્સેપ્ટ મેપ (મુખ્ય મુદ્દાઓમાંથી નીકળતી શાખાઓ) દોરીને દર્શાવો.',
      rightSection: [
        'સૂત્ર / અગત્યના શબ્દો',
        'યાદ રાખવા જેવી બાબતો',
        'તારણ (Conclusion)',
      ],
      teacherTip:
        'બોર્ડ પર લખતી વખતે શ્રોતાઓ તરફ પીઠ ન રાખવી. અડધા વળીને બોલતા બોલતા મુદ્દો લખવો અને લખ્યા બાદ શ્રોતાઓ સામે આત્મવિશ્વાસથી જોઈને હસતાં મુખે સમજાવવું.',
    },
    presentationSteps: [
      {
        stepNumber: 1,
        subHeading: '૧. વિષય પરિચય અને પ્રાથમિક ખ્યાલ',
        spokenScript: `સૌપ્રથમ, આપણે એ જાણીએ કે "${topic}" ખરેખર શું છે? જ્યારે આપણે પાઠ્યપુસ્તક વાંચીએ છીએ ત્યારે આ મુદ્દો અઘરો લાગી શકે છે, પરંતુ વાસ્તવમાં તે ખૂબ સરળ છે. આ સિદ્ધાંત આપણને જણાવે છે કે વસ્તુઓ કેવી રીતે કાર્ય કરે છે.`,
        actionInstruction: 'હાથના હાવભાવ સાથે વિષયનું નામ બોર્ડ પર દર્શાવો અને શ્રોતાઓ સાથે આઇ-કોન્ટેક્ટ જાળવો.',
      },
      {
        stepNumber: 2,
        subHeading: '૨. મુખ્ય નિયમ અને ઊંડાણપૂર્વક સમજૂતી',
        spokenScript: `હવે મુખ્ય વૈજ્ઞાનિક અને તાર્કિક પાસા તરફ આવીએ. જેમ આપણે બોર્ડ પર જોઈ શકીએ છીએ, આ વિષયના મુખ્ય બે પાયા છે: પ્રથમ એ કે તેના મૂળભૂત ઘટકો કયા છે, અને બીજું કે તેનું પરિણામ શું આવે છે. આ નિયમને આધારે જ આખી થીયરી ઊભી થયેલી છે.`,
        actionInstruction: 'બોર્ડ તરફ ડાબી બાજુ ચોકથી મુદ્દો દર્શાવીને શ્રોતાઓ તરફ ફરીને આત્મવિશ્વાસપૂર્વક બોલો.',
      },
      {
        stepNumber: 3,
        subHeading: '૩. વાસ્તવિક જીવન સાથે જોડાણ',
        spokenScript: `આ નિયમ માત્ર ચોપડી પૂરતો સીમિત નથી. આપણા ઘરમાં, શાળામાં અને વાતાવરણમાં દરરોજ આ જ ઘટના બને છે. જો આપણે સહેજ અવલોકન કરીએ તો તરત જ આ નિયમ આપણી નજર સામે તરવરી ઊઠશે.`,
        actionInstruction: 'ચહેરા પર ઉત્સાહ અને સ્મિત રાખીને વર્ગના મિત્રો તરફ જુઓ.',
      },
    ],
    realLifeExample: `દાખલા તરીકે, જેમ આપણે ઘરમાં પાણી ગરમ કરીએ છીએ અથવા સવારે અરીસામાં આપણું મુખ જોઈએ છીએ, ત્યારે વિજ્ઞાનનો આ જ અદ્ભુત નિયમ કામ કરતો હોય છે. પુસ્તકમાં આપેલું આ જ્ઞાન આપણે વ્યવહારમાં કઈ રીતે અનુભવીએ છીએ તેનું આ શ્રેષ્ઠ ઉદાહરણ છે.`,
    audienceQuestions: [
      {
        question: `શું તમારામાંથી કોઈ જણાવી શકશે કે આપણા રોજિંદા જીવનમાં આનું બીજું કયું ઉદાહરણ જોવા મળે છે?`,
        expectedAnswer: `(શ્રોતાઓ/મિત્રો ઉત્તર આપવા હાથ ઊંચો કરશે. ઉત્તર આપનાર મિત્રને 'ખૂબ સરસ' કહીને બિરદાવો.)`,
      },
    ],
    conclusion: `આમ, મિત્રો, ${subjectName} નો આ અગત્યનો વિષય "${topic}" આપણને માત્ર પરીક્ષા લક્ષી જ નહીં પણ જીજ્ઞાસાવૃત્તિ કેળવવાનું ઉત્તમ માધ્યમ પૂરું પાડે છે. મને આશા છે કે મારી આ નાનકડી રજૂઆતથી આપ સૌને આ વિષય સરળતાથી સમજાયો હશે. શાંતિપૂર્વક સાંભળવા બદલ આદરણીય ગુરુજનો અને વહાલા મિત્રોનો હૃદયપૂર્વક આભાર! જય હિન્દ, જય ભારત!`,
  };
}
