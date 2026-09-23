export interface Shloka {
  id: number;
  sanskrit: string[];
  meaning: string;
}

/**
 * 15 Sanskrit Educational & Motivational Shlokas for Vidyalayam
 * Preserved verbatim as specified.
 */
export const VIDYALAYAM_SHLOKAS: Shloka[] = [
  {
    id: 1,
    sanskrit: [
      'विद्या ददाति विनयं विनयाद् याति पात्रताम् ।',
      'पात्रत्वात् धनमाप्नोति धनाद् धर्मं ततः सुखम् ॥'
    ],
    meaning: 'Knowledge brings humility, worthiness, prosperity and happiness.'
  },
  {
    id: 2,
    sanskrit: [
      'उद्यमेन हि सिद्ध्यन्ति कार्याणि न मनोरथैः ।',
      'न हि सुप्तस्य सिंहस्य प्रविशन्ति मुखे मृगाः ॥'
    ],
    meaning: 'Success comes through effort, not merely through wishes.'
  },
  {
    id: 3,
    sanskrit: [
      'आचार्यात् पादमादत्ते पादं शिष्यः स्वमेधया ।',
      'पादं सब्रह्मचारिभ्यः पादं कालक्रमेण च ॥'
    ],
    meaning: 'Knowledge comes from teachers, self-study, fellow learners and experience.'
  },
  {
    id: 4,
    sanskrit: [
      'काकचेष्टा बको ध्यानं श्वाननिद्रा तथैव च ।',
      'अल्पहारी गृहत्यागी विद्यार्थी पञ्चलक्षणम् ॥'
    ],
    meaning: 'A good student is alert, focused, disciplined and devoted to learning.'
  },
  {
    id: 5,
    sanskrit: [
      'नास्ति विद्यासमं चक्षुर्नास्ति सत्यसमं तपः ।',
      'नास्ति रागसमं दुःखं नास्ति त्यागसमं सुखम् ॥'
    ],
    meaning: 'There is no eye like knowledge and no happiness like that of selflessness.'
  },
  {
    id: 6,
    sanskrit: [
      'विद्या नाम नरस्य रूपमधिकं प्रच्छन्नगुप्तं धनम् ।',
      'विद्या भोगकरी यशःसुखकरी विद्या गुरूणां गुरुः ॥'
    ],
    meaning: "Knowledge is a person's finest beauty and an invaluable hidden treasure."
  },
  {
    id: 7,
    sanskrit: [
      'मातृदेवो भव । पितृदेवो भव ।',
      'आचार्यदेवो भव । अतिथिदेवो भव ॥'
    ],
    meaning: 'Honour your mother, father, teacher and guest.'
  },
  {
    id: 8,
    sanskrit: [
      'असतो मा सद्गमय ।',
      'तमसो मा ज्योतिर्गमय ।',
      'मृत्योर्मामृतं गमय ॥'
    ],
    meaning: 'Lead me from untruth to truth, darkness to light, and mortality to the eternal.'
  },
  {
    id: 9,
    sanskrit: [
      'सत्यमेव जयते नानृतम् ।'
    ],
    meaning: 'Truth alone triumphs, not falsehood.'
  },
  {
    id: 10,
    sanskrit: [
      'मन एव मनुष्याणां कारणं बन्धमोक्षयोः ।'
    ],
    meaning: 'The mind is the key to both bondage and freedom.'
  },
  {
    id: 11,
    sanskrit: [
      'क्षणशः कणशश्चैव विद्यामर्थं च साधयेत् ।',
      'क्षणे नष्टे कुतो विद्या कणे नष्टे कुतो धनम् ॥'
    ],
    meaning: 'Build knowledge and wealth little by little; every moment and every effort matters.'
  },
  {
    id: 12,
    sanskrit: [
      'चरैवेति चरैवेति ॥'
    ],
    meaning: 'Keep moving forward; keep learning and progressing.'
  },
  {
    id: 13,
    sanskrit: [
      'सर्वे भवन्तु सुखिनः ।',
      'सर्वे सन्तु निरामयाः ।',
      'सर्वे भद्राणि पश्यन्तु ।',
      'मा कश्चिद् दुःखभाग्भवेत् ॥'
    ],
    meaning: 'May everyone be happy, healthy and see what is good.'
  },
  {
    id: 14,
    sanskrit: [
      'श्रेयान् स्वधर्मो विगुणः परधर्मात्स्वनुष्ठितात् ।'
    ],
    meaning: "Following one's own path sincerely is better than merely imitating another."
  },
  {
    id: 15,
    sanskrit: [
      'न हि ज्ञानेन सदृशं पवित्रमिह विद्यते ।'
    ],
    meaning: 'Nothing in this world is as pure and elevating as knowledge.'
  }
];

const STORAGE_KEY = 'vidyalayam_last_shloka_id';

/**
 * Returns a randomly selected Shloka guaranteed never to repeat twice consecutively.
 */
export function getRandomShloka(): Shloka {
  let lastId: number | null = null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    if (raw) {
      lastId = parseInt(raw, 10);
    }
  } catch {
    // Ignore storage restrictions
  }

  // Filter out the previously shown shloka
  const candidates = VIDYALAYAM_SHLOKAS.filter((s) => s.id !== lastId);
  const pool = candidates.length > 0 ? candidates : VIDYALAYAM_SHLOKAS;
  const picked = pool[Math.floor(Math.random() * pool.length)];

  try {
    sessionStorage.setItem(STORAGE_KEY, String(picked.id));
    localStorage.setItem(STORAGE_KEY, String(picked.id));
  } catch {
    // Ignore storage restrictions
  }

  return picked;
}
