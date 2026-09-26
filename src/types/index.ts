export type SchoolStatus = 'pending' | 'approved' | 'rejected' | 'inactive';

export interface School {
  id: string; // Firebase Auth UID
  ownerUid: string; // Must match auth.currentUser.uid
  schoolName: string;
  diseCode: string; // 11-digit Gujarat DISE Code
  district: string;
  status?: SchoolStatus; // defaults to 'approved' for legacy schools, 'pending' for new registrations
  createdAt: string;
  updatedAt?: string;
  // Extended School Profile Information
  address?: string;
  pincode?: string;
  village?: string;
  taluka?: string;
  schoolType?: string; // 'માધ્યમિક' | 'ઉચ્ચતર માધ્યમિક' | 'પ્રાથમિક' | 'સંયુક્ત'
  medium?: string; // 'ગુજરાતી' | 'અંગ્રેજી' | 'હિન્દી'
  principalName?: string;
  principalPhone?: string;
  contactEmail?: string;
  contactPhone?: string;
  establishedYear?: string;
  logoUrl?: string;
  password?: string; // Stored securely for school credentials
  temporaryPassword?: string; // Admin-issued temporary password
  mustResetPassword?: boolean; // Set to true when temporary password is issued
  temporaryPasswordCreatedAt?: string;
  admissionSettings?: SchoolAdmissionSettings;
}

export interface SchoolAdmissionSettings {
  isOpen: boolean; // whether admission is currently open
  mode: 'open' | 'closed' | 'date_range';
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD (optional, if omitted open indefinitely)
  instructions?: string; // Instructions for parents/students
  allowedStandards?: string[]; // e.g. ['9', '10', '11', '12']
  updatedAt?: string;
}

export interface AdmissionApplication {
  id: string;
  schoolId: string;
  schoolDiseCode: string;
  schoolName: string;
  studentName: string; // As written in LC
  photoUrl?: string; // Base64 compressed photo
  admissionStandard: string; // 9, 10, 11, 12
  childUid: string; // 18-digit UDISE child UID / Student DISE (Required)
  dob: string; // Birthdate YYYY-MM-DD or DD/MM/YYYY (Required)
  motherName: string; // Mata nu naam
  gender: 'Boy' | 'Girl' | 'Other' | string;
  bloodGroup: string; // A+, A-, B+, B-, O+, O-, AB+, AB-, 'ખબર નથી' / "Don't know"
  category: 'OBC' | 'SC' | 'ST' | 'Others' | string;
  contactNumber: string; // Vaalina nambar (10 digits)
  address: string;
  // Academic & Physical details
  previousYearTotalDays?: string | number; // Gaya varshna Hajar divas: __ mathi ___ (kull divas)
  previousYearPresentDays?: string | number; // Gaya varshna Hajar divas: hajar divas
  previousYearPercentage?: string | number; // Gaya varshna Taka
  height?: string | number; // Height in cm
  weight?: string | number; // Weight in kg
  // Status and processing
  status: 'pending' | 'approved' | 'rejected';
  admissionDate?: string; // Entered by school on acceptance (DOA)
  createdStudentId?: string; // ID of student created upon acceptance
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
  reviewedAt?: string;
}

export interface AdminRecord {
  id: string;
  role: 'admin';
  createdAt?: string;
}

export type AllowedStandard = '9' | '10' | '11' | '12';

export interface Student {
  id: string;
  schoolId: string; // Belongs to specific School UID
  studentName: string; // Name (As in GR)
  standard: AllowedStandard | string; // Allowed standards: 9, 10, 11, 12
  createdAt: string;
  updatedAt?: string;
  // Student Master Information fields
  diseCode?: string; // School DISE Code
  grNumber?: string; // GR No. (Searchable, unique school register no.)
  section?: string; // Section (વર્ગ / સેક્શન દા.ત. A, B, C)
  division?: string; // Legacy alias for section
  rollNumber?: string; // Roll No.
  dob?: string; // Date of Birth (જન્મ તારીખ)
  doa?: string; // Date of Admission (પ્રવેશ તારીખ)
  address?: string; // Residential Address (સરનામું)
  motherName?: string; // Mother Name (માતાનું નામ)
  fatherName?: string; // Father Name (પિતાનું નામ)
  gender?: 'Boy' | 'Girl' | 'Other' | string; // Gender (જાતિ)
  caste?: string; // Caste / Category (દા.ત. General, SEBC, SC, ST)
  bloodGroup?: string; // Blood Group (A+, B+, O+, etc.)
  photoUrl?: string; // Student Photo (Base64 / URL)
  contactNumber?: string; // Mobile / Parent Contact Number
  mobileNumber?: string; // Alias for contact number
  fatherOccupation?: string; // Father's Occupation
  motherOccupation?: string; // Mother's Occupation
  placeOfBirth?: string; // Place of Birth (જન્મ સ્થળ)
  aadhaarNo?: string; // Aadhaar / Unique ID (Securely handled)
  studentId?: string; // Student ID
  academicYear?: string;
  studentStateCode?: string; // Col 61 in UDISE+ / AadhaarUID in CTS
  cwsnDisability?: string; // Disability details from Col 22, 23-25
  medium?: string; // Medium of instruction from Col 43
  // Extended Academic History & Physical Details (Admissions & UDISE+)
  previousYearTotalDays?: string | number; // ગત વર્ષના કુલ શાળા દિવસો
  previousYearPresentDays?: string | number; // ગત વર્ષના હાજર દિવસો
  previousYearPercentage?: string | number; // ગત વર્ષના ટકા
  height?: string | number; // ઊંચાઈ (cm)
  weight?: string | number; // વજન (kg)
  admissionApplicationId?: string; // Linked online admission application if admitted via portal
}

export interface Staff {
  id: string;
  schoolId: string;
  fullName: string;
  designation: string; // e.g. 'આચાર્ય (વર્ગ–2)', 'આચાર્ય (ઇન્ચાર્જ)', 'શિક્ષણ સહાયક', 'મદદનીશ શિક્ષક', 'Gyan Sahayak', 'Para Teacher', 'પટાવાળા', 'ક્લાર્ક', 'સફાઈ કર્મચારી', 'ચોકીદાર', 'Others'
  category?: 'teaching' | 'non_teaching'; // શૈક્ષણિક અથવા બિન-શૈક્ષણિક સ્ટાફ
  section?: 'માધ્યમિક' | 'ઉચ્ચતર માધ્યમિક' | string; // વિભાગ (Section / Department)
  vibhag?: 'માધ્યમિક' | 'ઉચ્ચતર માધ્યમિક' | string; // Alias for section (વિભાગ)
  subject?: string;
  qualification?: string;
  dob?: string;
  serviceJoiningDate?: string; // ખાતામાં દાખલ તારીખ (Date of Joining Department/Service)
  schoolJoiningDate?: string; // આ શાળામાં દાખલ તારીખ (Date of Joining This School)
  joiningDate?: string; // Legacy fallback
  mobile?: string;
  email?: string;
  address?: string;
  photoUrl?: string;
  bloodGroup?: string;
  // Teaching Specific Codes
  teacherCode?: string; // શિક્ષક કોડ (Teacher Code)
  hrpnNumber?: string; // HRPN નંબર (HRPN Number - Optional)
  // Aadhaar & Identity
  aadhaarNumber?: string; // આધાર કાર્ડ નંબર (12 digits)
  panNumber?: string; // PAN કાર્ડ નંબર
  // Bank details
  bankName?: string; // બેંકનું નામ
  bankAccountNo?: string; // બેંક ખાતા નંબર
  bankIfsc?: string; // IFSC કોડ
  bankBranch?: string; // શાખા (Branch)
  createdAt: string;
  updatedAt?: string;
}

export type RecognizedExamId = 'ekam_kasoti_1' | 'pratham_pariksha' | 'dwitiya_pariksha' | 'varshik_pariksha';

export interface ExamInfo {
  id: RecognizedExamId | string;
  titleGujarati: string;
  titleEnglish: string;
  standard: AllowedStandard | string;
  defaultMaxMarks: number;
  academicYear: string;
}

export interface SubjectSection {
  id: string;
  name: string; // e.g. "Section A", "વિભાગ A", "પ્રશ્ન ૧"
  label?: string; // Short code e.g. "Sec A"
  description?: string;
  maxMarks?: number | null; // Optional: if null/undefined, not specified yet (does NOT equal 0)
}

export interface StandardSubject {
  id: string;
  standard: AllowedStandard;
  subjectName: string;
  gujaratiName?: string;
  englishName?: string;
  totalMarks?: number | null;
  sections: SubjectSection[];
  isCustom?: boolean;
  schoolId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubjectMark {
  subjectName: string;
  marksObtained: number;
  maxMarks: number;
  grade?: string;
}

export interface MarkRecord {
  id: string;
  schoolId: string; // Belongs to specific School UID
  studentId: string;
  studentName: string;
  grNumber?: string;
  rollNumber?: string;
  standard: AllowedStandard | string; // '9' | '10' | '11' | '12'
  division?: string;
  examType: string; // 'એકમ કસોટી – 1' | 'પ્રથમ પરીક્ષા' | 'દ્વિતીય પરીક્ષા' | 'વાર્ષિક પરીક્ષા'
  academicYear: string; // e.g. '૨૦૨૬–૨૭'
  subjectId?: string; // e.g. 'gujarati', 'maths'
  subjectName?: string;
  questionMarks?: Record<string, number>; // section/questionId -> marks
  subjects?: SubjectMark[];
  totalObtained: number;
  totalMax: number;
  percentage?: number;
  overallGrade?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthState {
  user: { uid: string; email: string | null } | null;
  school: School | null;
  loading: boolean;
  error: string | null;
}

export interface PasswordResetRequest {
  id?: string;
  diseCode: string;
  schoolName?: string;
  contactNumber?: string;
  status: 'pending' | 'resolved' | 'rejected';
  createdAt: string;
  resolvedAt?: string;
  adminNotes?: string;
}

export interface RegisteredSchoolInfo {
  id: string;
  schoolName: string;
  diseCode: string;
  principalName?: string;
  principalPhone?: string;
  contactPhone?: string;
  contactEmail?: string;
  district?: string;
  taluka?: string;
  village?: string;
  address?: string;
}

export interface StudentUidConflict {
  studentId?: string;
  studentUid: string;
  studentName: string;
  standard: string;
  grNumber?: string;
  registeredSchoolId: string;
  registeredSchool: RegisteredSchoolInfo;
}

export interface ParentMessageRecipient {
  studentId: string;
  studentName: string;
  standard: string;
  grNumber?: string;
  rollNumber?: string;
  section?: string;
  parentName?: string;
  parentPhone: string;
  messageText: string;
  status: 'pending' | 'sent' | 'skipped' | 'no_phone';
  sentAt?: string;
  examScore?: {
    obtainedMarks: number;
    totalMarks: number;
    percentage: number;
    grade?: string;
    statusText?: string;
    subjectsSummary?: string;
  };
}

export interface ParentBroadcastRecord {
  id?: string;
  schoolId: string;
  broadcastType: 'exam_result' | 'general_notice';
  title: string;
  examId?: string;
  examType?: string;
  standard?: string;
  totalRecipients: number;
  sentCount: number;
  createdAt: string;
  previewMessage: string;
}

export * from './onlineExam';

