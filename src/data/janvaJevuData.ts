export interface RawJanvaJevuQuestion {
  question: string;
  answer: string; // Strictly 1 single word or 1 number/short token
  explanation?: string;
  subject: string;
  classStandard: '9' | '10' | '11' | '12' | 'general';
}

/**
 * 20 Essential Weekly Core Questions:
 * Strictly 1-word direct crisp answers.
 * 3 to 4 of these are picked every week for regular revision.
 */
export const WEEKLY_CORE_QUESTIONS: RawJanvaJevuQuestion[] = [
  {
    question: 'ભારતીય બંધારણના મુખ્ય ઘડવૈયા કોણ હતા?',
    answer: 'આંબેડકર',
    subject: 'ભારતીય બંધારણ',
    classStandard: '9',
  },
  {
    question: 'ભારતમાં મતાધિકાર માટેની લઘુત્તમ ઉંમર કેટલા વર્ષ છે?',
    answer: '૧૮',
    subject: 'નાગરિકશાસ્ત્ર',
    classStandard: 'general',
  },
  {
    question: 'ભારતના રાષ્ટ્રીય પ્રતીકની નીચે કયું સૂત્ર અંકિત છે?',
    answer: 'સત્યમેવજયતે',
    subject: 'સામાજિક વિજ્ઞાન',
    classStandard: '10',
  },
  {
    question: 'ગુજરાતના કેટલા જિલ્લામાંથી કર્કવૃત્ત પસાર થાય છે?',
    answer: '૬',
    subject: 'ગુજરાત ભૂગોળ',
    classStandard: '9',
  },
  {
    question: 'વનસ્પતિ સૂર્યપ્રકાશમાં ખોરાક બનાવવાની ક્રિયાને શું કહે છે?',
    answer: 'પ્રકાશસંશ્લેષણ',
    subject: 'સામાન્ય વિજ્ઞાન',
    classStandard: '10',
  },
  {
    question: 'કચ્છનું ધોળાવીરા નગર કઈ પ્રાચીન વ્યવસ્થા માટે પ્રખ્યાત છે?',
    answer: 'જળવ્યવસ્થાપન',
    subject: 'ઇતિહાસ',
    classStandard: '10',
  },
  {
    question: 'માનવ શરીરમાં ઓક્સિજનનું વહન કરતું રંજકદ્રવ્ય કયું છે?',
    answer: 'હિમોગ્લોબિન',
    subject: 'જીવવિજ્ઞાન',
    classStandard: '10',
  },
  {
    question: 'સ્ટેચ્યુ ઓફ યુનિટીની કુલ ઊંચાઈ કેટલા મીટર છે?',
    answer: '૧૮૨',
    subject: 'સામાન્ય જ્ઞાન',
    classStandard: 'general',
  },
  {
    question: 'ભારતની સર્વોચ્ચ અદાલતના વડાને કયા પદે ઓળખવામાં આવે છે?',
    answer: 'મુખ્યન્યાયાધીશ',
    subject: 'ભારતીય બંધારણ',
    classStandard: '9',
  },
  {
    question: 'પૃથ્વીનું રક્ષણ કરતું ઓઝોન સ્તર કયા આવરણમાં આવેલું છે?',
    answer: 'સમતાપ',
    subject: 'પર્યાવરણ વિજ્ઞાન',
    classStandard: '10',
  },
  {
    question: 'ગાંધીજીએ ૧૯૩૦માં મીઠાના કાયદા સામે કઈ કૂચ કરી હતી?',
    answer: 'દાંડીકૂચ',
    subject: 'સ્વાતંત્ર્ય સંગ્રામ',
    classStandard: '9',
  },
  {
    question: 'ભારતીય અવકાશ સંશોધન સંસ્થા ISRO નું મુખ્ય મથક ક્યાં છે?',
    answer: 'બેંગલુરુ',
    subject: 'અવકાશ વિજ્ઞાન',
    classStandard: 'general',
  },
  {
    question: 'દુનિયામાં એશિયાટિક સિંહનું એકમાત્ર કુદરતી આવાસ કયું છે?',
    answer: 'ગીર',
    subject: 'ગુજરાત ભૂગોળ',
    classStandard: '9',
  },
  {
    question: 'ભારતમાં ચલણી નોટો બહાર પાડતી મધ્યસ્થ બેંક કઈ છે?',
    answer: 'RBI',
    subject: 'અર્થશાસ્ત્ર',
    classStandard: '10',
  },
  {
    question: 'સોલર પેનલમાં સૂર્યપ્રકાશ શોષવા કયું તત્વ વપરાય છે?',
    answer: 'સિલિકોન',
    subject: 'સામાન્ય વિજ્ઞાન',
    classStandard: '10',
  },
  {
    question: 'હડપ્પીય સંસ્કૃતિનું ગુજરાતમાં આવેલું પ્રાચીન બંદર કયું હતું?',
    answer: 'લોથલ',
    subject: 'ઇતિહાસ',
    classStandard: '10',
  },
  {
    question: 'પાણીનું રાસાયણિક અણુસૂત્ર શું છે?',
    answer: 'H₂O',
    subject: 'રસાયણ વિજ્ઞાન',
    classStandard: '9',
  },
  {
    question: 'ભારતમાં પંચાયતી રાજ સૌપ્રથમ કયા રાજ્યમાં શરૂ થયું હતું?',
    answer: 'રાજસ્થાન',
    subject: 'નાગરિકશાસ્ત્ર',
    classStandard: '9',
  },
  {
    question: 'કમ્પ્યુટરના મગજ તરીકે કયા સાધનને ઓળખવામાં આવે છે?',
    answer: 'CPU',
    subject: 'કમ્પ્યુટર',
    classStandard: 'general',
  },
  {
    question: 'ભારતના રાષ્ટ્રધ્વજની લંબાઈ અને પહોળાઈનું ગુણોત્તર કેટલું છે?',
    answer: '૩:૨',
    subject: 'સામાન્ય જ્ઞાન',
    classStandard: 'general',
  },
];

/**
 * 60+ Syllabus-grounded Question Pool:
 * Strictly 1-word direct answers only (no sentences, no brackets).
 */
export const MASTER_JANVA_JEVU_POOL: RawJanvaJevuQuestion[] = [
  {
    question: 'વિશ્વની સૌથી લાંબી નદી કઈ છે?',
    answer: 'નાઇલ',
    subject: 'વિશ્વ ભૂગોળ',
    classStandard: '9',
  },
  {
    question: 'ભારતની સૌથી લાંબી પવિત્ર નદી કઈ છે?',
    answer: 'ગંગા',
    subject: 'ભારત ભૂગોળ',
    classStandard: '9',
  },
  {
    question: 'માનવ શરીરનો સૌથી મોટો આંતરિક અવયવ કયો છે?',
    answer: 'યકૃત',
    subject: 'જીવવિજ્ઞાન',
    classStandard: '10',
  },
  {
    question: 'બંધારણ મુજબ દેશના સર્વોચ્ચ પ્રથમ નાગરિક કોણ ગણાય?',
    answer: 'રાષ્ટ્રપતિ',
    subject: 'ભારતીય બંધારણ',
    classStandard: '9',
  },
  {
    question: 'વિશ્વ પર્યાવરણ દિવસ કયા મહિને ઉજવાય છે?',
    answer: 'જૂન',
    subject: 'પર્યાવરણ',
    classStandard: 'general',
  },
  {
    question: 'વિદ્યુત પ્રવાહ માપવા કયું સાધન વપરાય છે?',
    answer: 'એમીટર',
    subject: 'ભૌતિક વિજ્ઞાન',
    classStandard: '10',
  },
  {
    question: '૧૮૫૭ના સ્વાતંત્ર્ય સંગ્રામના પ્રથમ શહીદ કોણ હતા?',
    answer: 'મંગલપાંડે',
    subject: 'સ્વાતંત્ર્ય સંગ્રામ',
    classStandard: '9',
  },
  {
    question: 'કોષનું શક્તિઘર (પાવરહાઉસ) કઈ અંગિકાને કહેવાય છે?',
    answer: 'કણાભસૂત્ર',
    subject: 'જીવવિજ્ઞાન',
    classStandard: '9',
  },
  {
    question: 'શિક્ષણનો અધિકાર બંધારણના કયા અનુચ્છેદ હેઠળ છે?',
    answer: '૨૧-A',
    subject: 'ભારતીય બંધારણ',
    classStandard: '9',
  },
  {
    question: 'ગુજરાતની જીવાદોરી સમાન સૌથી મોટી નદી કઈ છે?',
    answer: 'નર્મદા',
    subject: 'ગુજરાત ભૂગોળ',
    classStandard: '9',
  },
  {
    question: 'માનવ આંખમાં વસ્તુનું પ્રતિબિંબ ક્યાં રચાય છે?',
    answer: 'નેત્રપટલ',
    subject: 'સામાન્ય વિજ્ઞાન',
    classStandard: '10',
  },
  {
    question: 'સૂર્યમંડળનો સૌથી મોટો ગ્રહ કયો છે?',
    answer: 'ગુરુ',
    subject: 'ખગોળ વિજ્ઞાન',
    classStandard: 'general',
  },
  {
    question: 'પૃથ્વીના વાતાવરણમાં કયો વાયુ સૌથી વધુ પ્રમાણમાં છે?',
    answer: 'નાઇટ્રોજન',
    subject: 'સામાન્ય વિજ્ઞાન',
    classStandard: '9',
  },
  {
    question: 'માઉન્ટ એવરેસ્ટ શિખર કયા પર્વતમાળામાં આવેલું છે?',
    answer: 'હિમાલય',
    subject: 'વિશ્વ ભૂગોળ',
    classStandard: '9',
  },
  {
    question: 'રાષ્ટ્રીય વિજ્ઞાન દિવસ કયા મહિને ઉજવાય છે?',
    answer: 'ફેબ્રુઆરી',
    subject: 'વિજ્ઞાન',
    classStandard: 'general',
  },
  {
    question: 'હાડકાં અને દાંતના બંધારણ માટે કયું ખનિજ જરૂરી છે?',
    answer: 'કેલ્શિયમ',
    subject: 'સ્વાસ્થ્ય વિજ્ઞાન',
    classStandard: 'general',
  },
  {
    question: 'કચ્છ જિલ્લાનું મુખ્ય વહીવટી મથક કયું છે?',
    answer: 'ભુજ',
    subject: 'કચ્છ વિશેષ',
    classStandard: 'general',
  },
  {
    question: 'એસિડ અને બેઇઝ વચ્ચે થતી પ્રક્રિયાને શું કહેવાય?',
    answer: 'તટસ્થીકરણ',
    subject: 'રસાયણ વિજ્ઞાન',
    classStandard: '10',
  },
  {
    question: 'વિશ્વનું સૌથી મોટું ખારા પાણીનું સરોવર કયું છે?',
    answer: 'કેસ્પિયન',
    subject: 'વિશ્વ ભૂગોળ',
    classStandard: '9',
  },
  {
    question: 'સૂર્યપ્રકાશમાંથી શરીરને કયું વિટામિન મળે છે?',
    answer: 'વિટામિન-D',
    subject: 'સામાન્ય વિજ્ઞાન',
    classStandard: 'general',
  },
  {
    question: 'વિશ્વવ્યાપી ગુરુત્વાકર્ષણનો નિયમ કયા વૈજ્ઞાનિકે આપ્યો?',
    answer: 'ન્યૂટન',
    subject: 'ભૌતિક વિજ્ઞાન',
    classStandard: '9',
  },
  {
    question: 'ભારતનું રાષ્ટ્રીય જળચર પ્રાણી કયું છે?',
    answer: 'ડોલ્ફિન',
    subject: 'સામાન્ય જ્ઞાન',
    classStandard: 'general',
  },
  {
    question: 'પાટણની પ્રસિદ્ધ રાણકી વાવ કેટલા માળ ઊંડી છે?',
    answer: '૭',
    subject: 'ગુજરાત સ્થાપત્ય',
    classStandard: '10',
  },
  {
    question: 'ધ્વનિના તરંગો કયા માધ્યમમાં પ્રવાસ કરી શકતા નથી?',
    answer: 'શૂન્યાવકાશ',
    subject: 'ભૌતિક વિજ્ઞાન',
    classStandard: '9',
  },
  {
    question: 'વિસ્તારની દ્રષ્ટિએ ભારતનું સૌથી મોટું રાજ્ય કયું છે?',
    answer: 'રાજસ્થાન',
    subject: 'ભારત ભૂગોળ',
    classStandard: '9',
  },
  {
    question: 'લોહીનું દબાણ (BP) માપવાના સાધનને શું કહેવાય?',
    answer: 'સ્ફિગ્મોમેનોમીટર',
    subject: 'તબીબી વિજ્ઞાન',
    classStandard: '10',
  },
  {
    question: 'ગુજરાત રાજ્યનો સૌથી ઊંચો પર્વત કયો છે?',
    answer: 'ગિરનાર',
    subject: 'ગુજરાત ભૂગોળ',
    classStandard: '9',
  },
  {
    question: 'શરીરમાં શર્કરા (સુગર) નું નિયમન કરતો હોર્મોન કયો છે?',
    answer: 'ઇન્સ્યુલિન',
    subject: 'જીવવિજ્ઞાન',
    classStandard: '10',
  },
  {
    question: 'ભારતીય બંધારણમાં કુલ કેટલી મૂળભૂત ફરજો દર્શાવેલી છે?',
    answer: '૧૧',
    subject: 'ભારતીય બંધારણ',
    classStandard: '9',
  },
  {
    question: 'વિશ્વનો સૌથી વિશાળ અને ઊંડો મહાસાગર કયો છે?',
    answer: 'પ્રશાંત',
    subject: 'વિશ્વ ભૂગોળ',
    classStandard: '9',
  },
  {
    question: 'પૃથ્વીનો એકમાત્ર કુદરતી ઉપગ્રહ કયો છે?',
    answer: 'ચંદ્ર',
    subject: 'ખગોળ વિજ્ઞાન',
    classStandard: 'general',
  },
  {
    question: 'કયા વિટામિનની ખામીથી રતાંધળાપણું થાય છે?',
    answer: 'વિટામિન-A',
    subject: 'જીવવિજ્ઞાન',
    classStandard: '9',
  },
  {
    question: 'સૂર્યમંડળમાં સૌથી તેજસ્વી ગ્રહ કયો છે?',
    answer: 'શુક્ર',
    subject: 'ખગોળ વિજ્ઞાન',
    classStandard: 'general',
  },
  {
    question: 'વિટામિન-C ની ઉણપથી કયો રોગ થાય છે?',
    answer: 'સ્કર્વી',
    subject: 'સ્વાસ્થ્ય વિજ્ઞાન',
    classStandard: 'general',
  },
  {
    question: 'ગુજરાતની સ્થાપના કયા વર્ષમાં થઈ હતી?',
    answer: '૧૯૬૦',
    subject: 'ગુજરાત ઇતિહાસ',
    classStandard: 'general',
  },
  {
    question: 'માનવ ખોપરીમાં મગજનું રક્ષણ કરતું હાડકાનું માળખું કયું છે?',
    answer: 'કરોટી',
    subject: 'જીવવિજ્ઞાન',
    classStandard: '10',
  },
  {
    question: 'ગુરુત્વાકર્ષણ પ્રવેગ g નું પૃથ્વી સપાટી પર મૂલ્ય કેટલું છે?',
    answer: '૯.૮',
    subject: 'ભૌતિક વિજ્ઞાન',
    classStandard: '10',
  },
  {
    question: 'ભારતીય બંધારણ સભાના કાયમી અધ્યક્ષ કોણ હતા?',
    answer: 'રાજેન્દ્રપ્રસાદ',
    subject: 'ભારતીય બંધારણ',
    classStandard: '9',
  },
  {
    question: 'સૌથી સખત કુદરતી પદાર્થ કયો છે?',
    answer: 'હીરો',
    subject: 'રસાયણ વિજ્ઞાન',
    classStandard: '10',
  },
  {
    question: 'કઈ ધાતુ ઓરડાના તાપમાને પ્રવાહી સ્વરૂપમાં રહે છે?',
    answer: 'પારો',
    subject: 'રસાયણ વિજ્ઞાન',
    classStandard: '10',
  },
];
