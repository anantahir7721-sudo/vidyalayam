import * as XLSX from 'xlsx';
import { AllowedStandard, Student } from '../types';
import { cleanAndNormalizeBloodGroup, isValidBloodGroup, inspectInvalidBloodGroupEntry, isDateLikeString } from './bloodGroupUtils';

export interface StudentFieldChange {
  fieldLabel: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
}

export interface ParsedStudentRow {
  rowNumber: number;
  name: string;
  standard: string;
  diseCode?: string;
  grNumber?: string;
  rollNumber?: string;
  section?: string;
  dob?: string;
  address?: string;
  doa?: string;
  motherName?: string;
  fatherName?: string;
  gender?: 'Boy' | 'Girl' | 'Other';
  caste?: string;
  bloodGroup?: string;
  contactNumber?: string;
  fatherOccupation?: string;
  motherOccupation?: string;
  placeOfBirth?: string;
  photoUrl?: string;
  studentStateCode?: string;
  cwsnDisability?: string;
  medium?: string;
  aadhaarNo?: string;
  isValid: boolean;
  isDuplicateInFile: boolean;
  isExistingUpdate: boolean;
  existingStudentId?: string;
  existingStudentName?: string;
  existingGrNumber?: string;
  existingStandard?: string;
  changes?: StudentFieldChange[];
  errorReason?: string;
}

export interface MergedStudentRow {
  rowNumber: number;
  name: string;
  standard: string;
  diseCode?: string;
  studentStateCode?: string;
  grNumber?: string;
  section?: string;
  rollNumber?: string;
  dob?: string;
  doa?: string;
  address?: string;
  motherName?: string;
  fatherName?: string;
  gender?: 'Boy' | 'Girl' | 'Other';
  caste?: string;
  bloodGroup?: string;
  contactNumber?: string;
  fatherOccupation?: string;
  motherOccupation?: string;
  placeOfBirth?: string;
  medium?: string;
  aadhaarNo?: string;
  cwsnDisability?: string;
  photoUrl?: string;
  matchSource: 'both' | 'cts_only' | 'udise_only';
  isValid: boolean;
  isDuplicateInFile: boolean;
  isExistingUpdate: boolean;
  existingStudentId?: string;
  existingStudentName?: string;
  existingGrNumber?: string;
  existingStandard?: string;
  changes?: StudentFieldChange[];
  errorReason?: string;
}

export interface DualFileMergeResult {
  totalCtsRows: number;
  totalUdiseRows: number;
  matchedCount: number;
  ctsOnlyCount: number;
  udiseOnlyCount: number;
  validRows: MergedStudentRow[];
  invalidRows: MergedStudentRow[];
  duplicateInFileRows: MergedStudentRow[];
  existingUpdateRows: MergedStudentRow[];
  allRows: MergedStudentRow[];
}

export interface ExcelParseResult {
  totalRows: number;
  validRows: ParsedStudentRow[];
  invalidRows: ParsedStudentRow[];
  duplicateInFileRows: ParsedStudentRow[];
  existingUpdateRows: ParsedStudentRow[];
  allRows: ParsedStudentRow[];
}

/**
 * Standard column headers for Student Master Information Excel
 */
export const STUDENT_EXCEL_COLUMNS = [
  'DISE CODE',
  'GR NO.',
  'NAME (AS IN GR)',
  'STANDARD',
  'SECTION',
  'DOB',
  'ADDRESS',
  'DOA',
  'MOTHER NAME',
  'FATHER NAME',
  'GENDER',
  'CASTE',
  'BLOOD GROUP',
  'MOBILE NUMBER',
  'FATHER OCCUPATION',
  'MOTHER OCCUPATION',
  'PLACE OF BIRTH',
  'STUDENT PHOTO',
];

/**
 * Generates and downloads the complete Student Master Excel template
 * with pre-filled school DISE Code (if provided) and realistic sample rows.
 */
export function downloadStudentTemplate(schoolDiseCode?: string, schoolName?: string) {
  const defaultDise = schoolDiseCode?.trim() || '24010100101';

  const templateData = [
    {
      'DISE CODE': defaultDise,
      'GR NO.': '1001',
      'NAME (AS IN GR)': 'Patel Aarav Rameshchandra',
      'STANDARD': 9,
      'SECTION': 'A',
      'DOB': '2011-04-15',
      'ADDRESS': 'Plot No 14, Shanti Nagar, Rajkot',
      'DOA': '2024-06-12',
      'MOTHER NAME': 'Gitaben',
      'FATHER NAME': 'Rameshchandra',
      'GENDER': 'Boy',
      'CASTE': 'General',
      'BLOOD GROUP': 'B+',
      'MOBILE NUMBER': '9876543210',
      'FATHER OCCUPATION': 'Business',
      'MOTHER OCCUPATION': 'Housewife',
      'PLACE OF BIRTH': 'Rajkot',
      'STUDENT PHOTO': '',
    },
    {
      'DISE CODE': defaultDise,
      'GR NO.': '1002',
      'NAME (AS IN GR)': 'દવે જાનવી ભરતભાઈ',
      'STANDARD': 10,
      'SECTION': 'B',
      'DOB': '2010-09-22',
      'ADDRESS': 'મુ. પો. સરદાર ચોક, જામનગર',
      'DOA': '2023-06-15',
      'MOTHER NAME': 'ભાવનાબેન',
      'FATHER NAME': 'ભરતભાઈ',
      'GENDER': 'Girl',
      'CASTE': 'SEBC',
      'BLOOD GROUP': 'O+',
      'MOBILE NUMBER': '9825123456',
      'FATHER OCCUPATION': 'ખેતી (Farmer)',
      'MOTHER OCCUPATION': 'શિક્ષિકા (Teacher)',
      'PLACE OF BIRTH': 'જામનગર',
      'STUDENT PHOTO': '',
    },
    {
      'DISE CODE': defaultDise,
      'GR NO.': '1003',
      'NAME (AS IN GR)': 'Shah Manan Nileshbhai',
      'STANDARD': 11,
      'SECTION': 'A',
      'DOB': '2009-12-05',
      'ADDRESS': 'B-201, Krishna Heights, Ahmedabad',
      'DOA': '2024-06-10',
      'MOTHER NAME': 'Neelamben',
      'FATHER NAME': 'Nileshbhai',
      'GENDER': 'Boy',
      'CASTE': 'General',
      'BLOOD GROUP': 'A+',
      'MOBILE NUMBER': '9909988776',
      'FATHER OCCUPATION': 'Engineer',
      'MOTHER OCCUPATION': 'Service',
      'PLACE OF BIRTH': 'Ahmedabad',
      'STUDENT PHOTO': '',
    },
    {
      'DISE CODE': defaultDise,
      'GR NO.': '1004',
      'NAME (AS IN GR)': 'પરમાર પ્રિયા જગદીશભાઈ',
      'STANDARD': 12,
      'SECTION': 'A',
      'DOB': '2008-03-18',
      'ADDRESS': 'સ્વામિનારાયણ મંદિર પાસે, જૂનાગઢ',
      'DOA': '2023-06-14',
      'MOTHER NAME': 'મીનાક્ષીબેન',
      'FATHER NAME': 'જગદીશભાઈ',
      'GENDER': 'Girl',
      'CASTE': 'SC',
      'BLOOD GROUP': 'AB+',
      'MOBILE NUMBER': '9428011223',
      'FATHER OCCUPATION': 'સરકારી સેવા',
      'MOTHER OCCUPATION': 'ગૃહિણી',
      'PLACE OF BIRTH': 'જૂનાગઢ',
      'STUDENT PHOTO': '',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData, {
    header: STUDENT_EXCEL_COLUMNS,
  });

  // Set generous column widths
  worksheet['!cols'] = [
    { wch: 15 }, // DISE CODE
    { wch: 12 }, // GR NO.
    { wch: 32 }, // NAME (AS IN GR)
    { wch: 12 }, // STANDARD
    { wch: 10 }, // SECTION
    { wch: 14 }, // DOB
    { wch: 35 }, // ADDRESS
    { wch: 14 }, // DOA
    { wch: 22 }, // MOTHER NAME
    { wch: 22 }, // FATHER NAME
    { wch: 12 }, // GENDER
    { wch: 14 }, // CASTE
    { wch: 13 }, // BLOOD GROUP
    { wch: 16 }, // MOBILE NUMBER
    { wch: 20 }, // FATHER OCCUPATION
    { wch: 20 }, // MOTHER OCCUPATION
    { wch: 18 }, // PLACE OF BIRTH
    { wch: 20 }, // STUDENT PHOTO
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students_Master_Template');

  const filename = schoolName
    ? `${schoolName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim()}_Student_Master_Template.xlsx`
    : 'Students_Master_Enrollment_Template.xlsx';

  XLSX.writeFile(workbook, filename);
}

/**
 * Standard Gujarat CTS Portal Column Headers
 */
export const CTS_EXCEL_COLUMNS = [
  'SchoolId',
  'DistrictId',
  'BlockId',
  'ClusterId',
  'VillageId',
  'School',
  'District',
  'Block',
  'Cluster',
  'Village',
  'AadhaarUID',
  'StudentId',
  'StudentName',
  'FatherName',
  'MotherName',
  'SurName',
  'DOB',
  'GenderId',
  'GENDER',
  'SocialCatId',
  'SOCIALCAT',
  'ReligionId',
  'RELIGION',
  'Under_What_Children_Admitted',
  'AcademicYear',
  'DOA',
  'GRNo',
  'BELONGTOBPL',
  'DISADVANTAGEDGROUP',
  'StudyingClass',
  'Section',
  'DaysAttendedPrvYear',
  'STUDENTDISABILITY',
  'Medium1',
  'Stream_Desc',
];

/**
 * Generates and downloads Gujarat CTS Student Template Excel file.
 * Key mapping: AadhaarUID = Student DISE Code, GRNo = School Register No.
 */
export function downloadCtsTemplate(schoolDiseCode?: string, schoolName?: string) {
  const defaultDise = schoolDiseCode?.trim() || '24010401401';
  const schoolTitle = schoolName || 'GSEB High School';

  const templateData = [
    {
      SchoolId: defaultDise,
      DistrictId: '2401',
      BlockId: '04',
      ClusterId: '01',
      VillageId: '401',
      School: schoolTitle,
      District: 'AHMEDABAD',
      Block: 'CITY',
      Cluster: 'CLUSTER 1',
      Village: 'CITY WARD',
      AadhaarUID: "'240104014011710122",
      StudentId: '10001',
      StudentName: 'AARAV',
      FatherName: 'RAMESHCHANDRA',
      MotherName: 'GITABEN',
      SurName: 'PATEL',
      DOB: '15/04/2011',
      GenderId: '1',
      GENDER: 'BOY',
      SocialCatId: '1',
      SOCIALCAT: 'GENERAL',
      ReligionId: '1',
      RELIGION: 'HINDU',
      Under_What_Children_Admitted: 'Direct Admission',
      AcademicYear: '2026-27',
      DOA: '6/9/2025 12:00:00 AM',
      GRNo: '350',
      BELONGTOBPL: 'NO',
      DISADVANTAGEDGROUP: 'NO',
      StudyingClass: '9',
      Section: 'A',
      DaysAttendedPrvYear: '210',
      STUDENTDISABILITY: 'N',
      Medium1: 'GUJARATI',
      Stream_Desc: 'GENERAL',
    },
    {
      SchoolId: defaultDise,
      DistrictId: '2401',
      BlockId: '04',
      ClusterId: '01',
      VillageId: '401',
      School: schoolTitle,
      District: 'AHMEDABAD',
      Block: 'CITY',
      Cluster: 'CLUSTER 1',
      Village: 'CITY WARD',
      AadhaarUID: "'240104014011710123",
      StudentId: '10002',
      StudentName: 'JANVI',
      FatherName: 'BHARATBHAI',
      MotherName: 'BHAVANABEN',
      SurName: 'DAVE',
      DOB: '22/09/2010',
      GenderId: '2',
      GENDER: 'GIRL',
      SocialCatId: '4',
      SOCIALCAT: 'OBC',
      ReligionId: '1',
      RELIGION: 'HINDU',
      Under_What_Children_Admitted: 'Promoted',
      AcademicYear: '2026-27',
      DOA: '6/15/2024 12:00:00 AM',
      GRNo: '348',
      BELONGTOBPL: 'NO',
      DISADVANTAGEDGROUP: 'NO',
      StudyingClass: '10',
      Section: 'B',
      DaysAttendedPrvYear: '220',
      STUDENTDISABILITY: 'N',
      Medium1: 'GUJARATI',
      Stream_Desc: 'GENERAL',
    },
    {
      SchoolId: defaultDise,
      DistrictId: '2401',
      BlockId: '04',
      ClusterId: '01',
      VillageId: '401',
      School: schoolTitle,
      District: 'AHMEDABAD',
      Block: 'CITY',
      Cluster: 'CLUSTER 1',
      Village: 'CITY WARD',
      AadhaarUID: "'240104014011710124",
      StudentId: '10003',
      StudentName: 'MANAN',
      FatherName: 'NILESHBHAI',
      MotherName: 'NEELAMBEN',
      SurName: 'SHAH',
      DOB: '05/12/2009',
      GenderId: '1',
      GENDER: 'BOY',
      SocialCatId: '1',
      SOCIALCAT: 'GENERAL',
      ReligionId: '1',
      RELIGION: 'JAIN',
      Under_What_Children_Admitted: 'Direct Admission',
      AcademicYear: '2026-27',
      DOA: '6/10/2025 12:00:00 AM',
      GRNo: '370',
      BELONGTOBPL: 'NO',
      DISADVANTAGEDGROUP: 'NO',
      StudyingClass: '11',
      Section: 'A',
      DaysAttendedPrvYear: '215',
      STUDENTDISABILITY: 'N',
      Medium1: 'GUJARATI',
      Stream_Desc: 'COMMERCE',
    },
    {
      SchoolId: defaultDise,
      DistrictId: '2401',
      BlockId: '04',
      ClusterId: '01',
      VillageId: '401',
      School: schoolTitle,
      District: 'AHMEDABAD',
      Block: 'CITY',
      Cluster: 'CLUSTER 1',
      Village: 'CITY WARD',
      AadhaarUID: "'240104014011710125",
      StudentId: '10004',
      StudentName: 'PRIYA',
      FatherName: 'JAGDISHBHAI',
      MotherName: 'MINAKSHIBEN',
      SurName: 'PARMAR',
      DOB: '18/03/2008',
      GenderId: '2',
      GENDER: 'GIRL',
      SocialCatId: '2',
      SOCIALCAT: 'SC',
      ReligionId: '1',
      RELIGION: 'HINDU',
      Under_What_Children_Admitted: 'Promoted',
      AcademicYear: '2026-27',
      DOA: '6/14/2024 12:00:00 AM',
      GRNo: '371',
      BELONGTOBPL: 'YES',
      DISADVANTAGEDGROUP: 'YES',
      StudyingClass: '12',
      Section: 'A',
      DaysAttendedPrvYear: '222',
      STUDENTDISABILITY: 'N',
      Medium1: 'GUJARATI',
      Stream_Desc: 'ARTS',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData, {
    header: CTS_EXCEL_COLUMNS,
  });

  worksheet['!cols'] = [
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 28 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 24 }, // AadhaarUID (Student DISE Code)
    { wch: 12 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 14 },
    { wch: 10 },
    { wch: 12 },
    { wch: 25 },
    { wch: 14 },
    { wch: 22 }, // DOA
    { wch: 12 }, // GRNo
    { wch: 14 },
    { wch: 20 },
    { wch: 14 }, // StudyingClass
    { wch: 10 }, // Section
    { wch: 20 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'CTS_Students_Template');

  const cleanSchool = schoolName ? schoolName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() : 'CTS';
  XLSX.writeFile(workbook, `${cleanSchool}_CTS_Students_Template.xlsx`);
}

/**
 * Standard UDISE+ 61-Column Headers
 */
export const UDISE_PLUS_EXCEL_COLUMNS = [
  'Class', // Col 1
  'Academic Year', // Col 2
  'Section', // Col 3
  'Student Name', // Col 4
  'Gender', // Col 5
  'Date of Birth (DOB)', // Col 6
  'Mother Name', // Col 7
  'Father Name', // Col 8
  'Guardian Name', // Col 9
  'Student Aadhaar Number', // Col 10
  'Social Category', // Col 11
  'Minority Group', // Col 12
  'BPL Beneficiary', // Col 13
  'Antyodaya Anna Yojana', // Col 14
  'EWS / Disadvantaged Group', // Col 15
  'Getting Free Education as per RTE', // Col 16
  'Mobile Number of Student/Parent', // Col 17
  'Alternate Mobile Number', // Col 18
  'Email ID', // Col 19
  'Identification Mark', // Col 20
  'Permanent Education Number (PEN)', // Col 21
  'Whether CWSN (Yes/No)', // Col 22
  'Type of Impairment', // Col 23
  'Disability Percentage (%)', // Col 24
  'UDID Card Number', // Col 25
  'Facilities provided to CWSN', // Col 26
  'Student Height (cm)', // Col 27
  'Student Weight (kg)', // Col 28
  'Admission Number', // Col 29
  'Roll Number', // Col 30
  'Academic Stream', // Col 31
  'Admission Date (DOA)', // Col 32
  'Status of Student in Previous Year', // Col 33
  'Grade Studied in Previous Year', // Col 34
  'Admitted Under Category', // Col 35
  'Attended School Days Previous Year', // Col 36
  'Result of Examination in Previous Year', // Col 37
  'Marks Obtained in Previous Year (%)', // Col 38
  'Facilities Provided', // Col 39
  'Free Uniforms Provided', // Col 40
  'Free Transport Provided', // Col 41
  'Blood Group', // Col 42
  'Medium of Instruction', // Col 43
  'Language 1', // Col 44
  'Language 2', // Col 45
  'Language 3', // Col 46
  'Vocational Course Opted', // Col 47
  'Trade / Sector', // Col 48
  'Job Role', // Col 49
  'Appeared for Assessment', // Col 50
  'Scholarship Received', // Col 51
  'Bank Account Number', // Col 52
  'Bank IFSC Code', // Col 53
  'Bank Name', // Col 54
  'Branch Name', // Col 55
  'Incentives Received', // Col 56
  'Uniform Set Received', // Col 57
  'Bicycle Received', // Col 58
  'Hostel Facility', // Col 59
  'Homeless Status', // Col 60
  'Student State Code', // Col 61 (Child DISE Code matching CTS AadhaarUID)
];

/**
 * Generates and downloads the official 61-column UDISE+ Student Template Excel file.
 * Col 4 = Student Name (exact spelling prioritized)
 * Col 61 = Student State Code (matched with CTS AadhaarUID)
 */
export function downloadUdisePlusTemplate(schoolDiseCode?: string, schoolName?: string) {
  const templateData = [
    {
      'Class': '9', // Col 1
      'Academic Year': '2026-27', // Col 2
      'Section': 'A', // Col 3
      'Student Name': 'PATEL AARAV RAMESHCHANDRA', // Col 4
      'Gender': 'Boy', // Col 5
      'Date of Birth (DOB)': '2011-04-15', // Col 6
      'Mother Name': 'Gitaben', // Col 7
      'Father Name': 'Rameshchandra', // Col 8
      'Guardian Name': '', // Col 9
      'Student Aadhaar Number': '987654321098', // Col 10
      'Social Category': 'General', // Col 11
      'Minority Group': 'NA', // Col 12
      'BPL Beneficiary': 'No', // Col 13
      'Antyodaya Anna Yojana': 'No', // Col 14
      'EWS / Disadvantaged Group': 'No', // Col 15
      'Getting Free Education as per RTE': 'No', // Col 16
      'Mobile Number of Student/Parent': '9876543210', // Col 17
      'Alternate Mobile Number': '', // Col 18
      'Email ID': '', // Col 19
      'Identification Mark': '', // Col 20
      'Permanent Education Number (PEN)': '24010199001', // Col 21
      'Whether CWSN (Yes/No)': 'No', // Col 22
      'Type of Impairment': 'NA', // Col 23
      'Disability Percentage (%)': '0', // Col 24
      'UDID Card Number': '', // Col 25
      'Facilities provided to CWSN': '', // Col 26
      'Student Height (cm)': '150', // Col 27
      'Student Weight (kg)': '42', // Col 28
      'Admission Number': '350', // Col 29
      'Roll Number': '1', // Col 30
      'Academic Stream': 'General', // Col 31
      'Admission Date (DOA)': '2024-06-12', // Col 32
      'Status of Student in Previous Year': 'Promoted', // Col 33
      'Grade Studied in Previous Year': '8', // Col 34
      'Admitted Under Category': 'General', // Col 35
      'Attended School Days Previous Year': '210', // Col 36
      'Result of Examination in Previous Year': 'Pass', // Col 37
      'Marks Obtained in Previous Year (%)': '78', // Col 38
      'Facilities Provided': 'Textbooks', // Col 39
      'Free Uniforms Provided': 'Yes', // Col 40
      'Free Transport Provided': 'No', // Col 41
      'Blood Group': 'B+', // Col 42
      'Medium of Instruction': 'Gujarati', // Col 43
      'Language 1': 'Gujarati', // Col 44
      'Language 2': 'Hindi', // Col 45
      'Language 3': 'English', // Col 46
      'Vocational Course Opted': 'No', // Col 47
      'Trade / Sector': '', // Col 48
      'Job Role': '', // Col 49
      'Appeared for Assessment': 'No', // Col 50
      'Scholarship Received': 'No', // Col 51
      'Bank Account Number': '123456789012', // Col 52
      'Bank IFSC Code': 'SBIN0001234', // Col 53
      'Bank Name': 'SBI', // Col 54
      'Branch Name': 'Ahmedabad Main', // Col 55
      'Incentives Received': 'Uniform', // Col 56
      'Uniform Set Received': '2', // Col 57
      'Bicycle Received': 'No', // Col 58
      'Hostel Facility': 'No', // Col 59
      'Homeless Status': 'No', // Col 60
      'Student State Code': '240104014011710122', // Col 61 (DISE Code)
    },
    {
      'Class': '10',
      'Academic Year': '2026-27',
      'Section': 'B',
      'Student Name': 'DAVE JANVI BHARATBHAI',
      'Gender': 'Girl',
      'Date of Birth (DOB)': '2010-09-22',
      'Mother Name': 'Bhavanaben',
      'Father Name': 'Bharatbhai',
      'Guardian Name': '',
      'Student Aadhaar Number': '876543210987',
      'Social Category': 'OBC',
      'Minority Group': 'NA',
      'BPL Beneficiary': 'No',
      'Antyodaya Anna Yojana': 'No',
      'EWS / Disadvantaged Group': 'No',
      'Getting Free Education as per RTE': 'No',
      'Mobile Number of Student/Parent': '9825123456',
      'Alternate Mobile Number': '',
      'Email ID': '',
      'Identification Mark': '',
      'Permanent Education Number (PEN)': '24010199002',
      'Whether CWSN (Yes/No)': 'No',
      'Type of Impairment': 'NA',
      'Disability Percentage (%)': '0',
      'UDID Card Number': '',
      'Facilities provided to CWSN': '',
      'Student Height (cm)': '148',
      'Student Weight (kg)': '40',
      'Admission Number': '348',
      'Roll Number': '2',
      'Academic Stream': 'General',
      'Admission Date (DOA)': '2023-06-15',
      'Status of Student in Previous Year': 'Promoted',
      'Grade Studied in Previous Year': '9',
      'Admitted Under Category': 'OBC',
      'Attended School Days Previous Year': '220',
      'Result of Examination in Previous Year': 'Pass',
      'Marks Obtained in Previous Year (%)': '84',
      'Facilities Provided': 'Textbooks',
      'Free Uniforms Provided': 'Yes',
      'Free Transport Provided': 'No',
      'Blood Group': 'O+',
      'Medium of Instruction': 'Gujarati',
      'Language 1': 'Gujarati',
      'Language 2': 'Hindi',
      'Language 3': 'English',
      'Vocational Course Opted': 'No',
      'Trade / Sector': '',
      'Job Role': '',
      'Appeared for Assessment': 'No',
      'Scholarship Received': 'No',
      'Bank Account Number': '234567890123',
      'Bank IFSC Code': 'BOB0001234',
      'Bank Name': 'BOB',
      'Branch Name': 'Ahmedabad',
      'Incentives Received': 'Uniform',
      'Uniform Set Received': '2',
      'Bicycle Received': 'No',
      'Hostel Facility': 'No',
      'Homeless Status': 'No',
      'Student State Code': '240104014011710123',
    },
    {
      'Class': '11',
      'Academic Year': '2026-27',
      'Section': 'A',
      'Student Name': 'SHAH MANAN NILESHBHAI',
      'Gender': 'Boy',
      'Date of Birth (DOB)': '2009-12-05',
      'Mother Name': 'Neelamben',
      'Father Name': 'Nileshbhai',
      'Guardian Name': '',
      'Student Aadhaar Number': '765432109876',
      'Social Category': 'General',
      'Minority Group': 'Jain',
      'BPL Beneficiary': 'No',
      'Antyodaya Anna Yojana': 'No',
      'EWS / Disadvantaged Group': 'No',
      'Getting Free Education as per RTE': 'No',
      'Mobile Number of Student/Parent': '9909988776',
      'Alternate Mobile Number': '',
      'Email ID': '',
      'Identification Mark': '',
      'Permanent Education Number (PEN)': '24010199003',
      'Whether CWSN (Yes/No)': 'No',
      'Type of Impairment': 'NA',
      'Disability Percentage (%)': '0',
      'UDID Card Number': '',
      'Facilities provided to CWSN': '',
      'Student Height (cm)': '162',
      'Student Weight (kg)': '50',
      'Admission Number': '370',
      'Roll Number': '3',
      'Academic Stream': 'Commerce',
      'Admission Date (DOA)': '2024-06-10',
      'Status of Student in Previous Year': 'Promoted',
      'Grade Studied in Previous Year': '10',
      'Admitted Under Category': 'General',
      'Attended School Days Previous Year': '215',
      'Result of Examination in Previous Year': 'Pass',
      'Marks Obtained in Previous Year (%)': '88',
      'Facilities Provided': 'Textbooks',
      'Free Uniforms Provided': 'No',
      'Free Transport Provided': 'No',
      'Blood Group': 'A+',
      'Medium of Instruction': 'Gujarati',
      'Language 1': 'Gujarati',
      'Language 2': 'Hindi',
      'Language 3': 'English',
      'Vocational Course Opted': 'No',
      'Trade / Sector': '',
      'Job Role': '',
      'Appeared for Assessment': 'No',
      'Scholarship Received': 'No',
      'Bank Account Number': '345678901234',
      'Bank IFSC Code': 'HDFC0001234',
      'Bank Name': 'HDFC',
      'Branch Name': 'Ahmedabad',
      'Incentives Received': 'None',
      'Uniform Set Received': '0',
      'Bicycle Received': 'No',
      'Hostel Facility': 'No',
      'Homeless Status': 'No',
      'Student State Code': '240104014011710124',
    },
    {
      'Class': '12',
      'Academic Year': '2026-27',
      'Section': 'A',
      'Student Name': 'PARMAR PRIYA JAGDISHBHAI',
      'Gender': 'Girl',
      'Date of Birth (DOB)': '2008-03-18',
      'Mother Name': 'Minakshiben',
      'Father Name': 'Jagdishbhai',
      'Guardian Name': '',
      'Student Aadhaar Number': '654321098765',
      'Social Category': 'SC',
      'Minority Group': 'NA',
      'BPL Beneficiary': 'Yes',
      'Antyodaya Anna Yojana': 'No',
      'EWS / Disadvantaged Group': 'Yes',
      'Getting Free Education as per RTE': 'No',
      'Mobile Number of Student/Parent': '9428011223',
      'Alternate Mobile Number': '',
      'Email ID': '',
      'Identification Mark': '',
      'Permanent Education Number (PEN)': '24010199004',
      'Whether CWSN (Yes/No)': 'Yes', // Col 22: Yes!
      'Type of Impairment': 'Locomotor Impairment', // Col 23
      'Disability Percentage (%)': '45', // Col 24
      'UDID Card Number': 'GJ0130320120110530', // Col 25
      'Facilities provided to CWSN': 'Braille / Assistive device',
      'Student Height (cm)': '152',
      'Student Weight (kg)': '44',
      'Admission Number': '371',
      'Roll Number': '4',
      'Academic Stream': 'Arts',
      'Admission Date (DOA)': '2023-06-14',
      'Status of Student in Previous Year': 'Promoted',
      'Grade Studied in Previous Year': '11',
      'Admitted Under Category': 'SC',
      'Attended School Days Previous Year': '222',
      'Result of Examination in Previous Year': 'Pass',
      'Marks Obtained in Previous Year (%)': '75',
      'Facilities Provided': 'Textbooks, Uniform',
      'Free Uniforms Provided': 'Yes',
      'Free Transport Provided': 'Yes',
      'Blood Group': 'AB+',
      'Medium of Instruction': 'Gujarati',
      'Language 1': 'Gujarati',
      'Language 2': 'Hindi',
      'Language 3': 'English',
      'Vocational Course Opted': 'No',
      'Trade / Sector': '',
      'Job Role': '',
      'Appeared for Assessment': 'No',
      'Scholarship Received': 'Yes',
      'Bank Account Number': '456789012345',
      'Bank IFSC Code': 'BOI0001234',
      'Bank Name': 'BOI',
      'Branch Name': 'Ahmedabad',
      'Incentives Received': 'Bicycle',
      'Uniform Set Received': '2',
      'Bicycle Received': 'Yes',
      'Hostel Facility': 'No',
      'Homeless Status': 'No',
      'Student State Code': '240104014011710125', // Col 61 (Matches CTS AadhaarUID)
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData, {
    header: UDISE_PLUS_EXCEL_COLUMNS,
  });

  worksheet['!cols'] = [
    { wch: 10 }, // Col 1: Class
    { wch: 14 }, // Col 2: Academic Year
    { wch: 10 }, // Col 3: Section
    { wch: 32 }, // Col 4: Student Name
    { wch: 10 }, // Col 5: Gender
    { wch: 14 }, // Col 6: DOB
    { wch: 20 }, // Col 7
    { wch: 20 }, // Col 8
    { wch: 16 }, // Col 9
    { wch: 18 }, // Col 10: Aadhaar
    { wch: 14 }, // Col 11: Social Category
    { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
    { wch: 18 }, // Col 17: Mobile
    { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 18 },
    { wch: 14 }, // Col 22: CWSN (Yes/No)
    { wch: 22 }, // Col 23: Type
    { wch: 14 }, // Col 24: %
    { wch: 20 }, // Col 25: UDID
    { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
    { wch: 12 }, // Col 30: Roll Number
    { wch: 14 },
    { wch: 14 }, // Col 32: DOA
    { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 },
    { wch: 16 }, { wch: 14 }, { wch: 14 },
    { wch: 12 }, // Col 42: Blood Group
    { wch: 18 }, // Col 43: Medium
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 14 }, { wch: 14 },
    { wch: 18 }, // Col 52: Bank Account
    { wch: 14 }, // Col 53: IFSC
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 25 }, // Col 61: Student State Code
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'UDISE_Plus_Students_Template');

  const cleanSchool = schoolName ? schoolName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() : 'UDISE_Plus';
  XLSX.writeFile(workbook, `${cleanSchool}_UDISE_Plus_Students_Template.xlsx`);
}

/**
 * Normalizes standard into strictly '9', '10', '11', or '12'
 */
export function normalizeStandard(val: any): AllowedStandard | null {
  if (val === undefined || val === null) return null;
  const str = String(val).trim();

  if (
    str === '9' ||
    str === '09' ||
    /^std\s*9$/i.test(str) ||
    /^class\s*9$/i.test(str) ||
    /^ધોરણ\s*૯$/i.test(str) ||
    /^ધોરણ\s*9$/i.test(str) ||
    str === '૯'
  ) {
    return '9';
  }
  if (
    str === '10' ||
    /^std\s*10$/i.test(str) ||
    /^class\s*10$/i.test(str) ||
    /^ધોરણ\s*૧૦$/i.test(str) ||
    /^ધોરણ\s*10$/i.test(str) ||
    str === '૧૦'
  ) {
    return '10';
  }
  if (
    str === '11' ||
    /^std\s*11$/i.test(str) ||
    /^class\s*11$/i.test(str) ||
    /^ધોરણ\s*૧૧$/i.test(str) ||
    /^ધોરણ\s*11$/i.test(str) ||
    str === '૧૧'
  ) {
    return '11';
  }
  if (
    str === '12' ||
    /^std\s*12$/i.test(str) ||
    /^class\s*12$/i.test(str) ||
    /^ધોરણ\s*૧૨$/i.test(str) ||
    /^ધોરણ\s*12$/i.test(str) ||
    str === '૧૨'
  ) {
    return '12';
  }

  return null;
}

/**
 * Normalizes Student Unique DISE / State Code (handles leading apostrophes, spaces, quotes, scientific notation, and 21-digit concatenated codes)
 */
export function normalizeDiseCode(val: any): string {
  if (val === undefined || val === null) return '';
  let str = String(val)
    .trim()
    .replace(/^['"`\s]+|['"`\s]+$/g, '')
    .trim();

  if (!str) return '';

  // Reject internal database IDs containing letters
  if (/[a-zA-Z]/.test(str)) {
    return '';
  }

  // Handle scientific notation e.g. 2.4010401504151e+20 or 2.40104015041510001001E+20
  if (/^[+-]?\d+(?:\.\d+)?[eE][+-]?\d+$/i.test(str)) {
    try {
      const [base, expStr] = str.toLowerCase().split('e');
      const exp = parseInt(expStr, 10);
      const [intPart, fracPart = ''] = base.split('.');
      if (exp >= 0) {
        if (exp >= fracPart.length) {
          str = intPart + fracPart + '0'.repeat(exp - fracPart.length);
        } else {
          str = intPart + fracPart.slice(0, exp) + '.' + fracPart.slice(exp);
        }
      }
    } catch {
      // ignore
    }
  }

  // Remove trailing .0 or .00 if Excel stored integer as float
  if (/\.0+$/.test(str)) {
    str = str.replace(/\.0+$/, '');
  }

  const digits = str.replace(/\D/g, '');
  // Official Gujarat Student Child UID is strictly 18 digits.
  // If 21 digits or > 18 digits were entered/exported (e.g. 18-digit UID + 3-digit roll number),
  // extract the true standard 18-digit Child UID!
  if (digits.length >= 18) {
    return digits.slice(0, 18);
  }

  return digits || str.trim();
}

/**
 * Normalizes dates from Excel (serial numbers, DD/MM/YYYY, YYYY-MM-DD, M/D/YYYY 12:00:00 AM) into standard YYYY-MM-DD
 */
export function normalizeDate(val: any): string | undefined {
  if (val === undefined || val === null || String(val).trim() === '') return undefined;

  // If number, it could be an Excel serial date
  if (typeof val === 'number') {
    try {
      const parsed = XLSX.SSF.parse_date_code(val);
      if (parsed) {
        const y = String(parsed.y).padStart(4, '0');
        const m = String(parsed.m).padStart(2, '0');
        const d = String(parsed.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch {
      // fallback
    }
  }

  let str = String(val).trim();

  // Strip timestamps like 12:00:00 AM or 00:00:00
  str = str.replace(/\s+\d{1,2}:\d{2}(:\d{2})?(\s*[APap][Mm])?$/, '').trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Handle YYYY-XX-XX
  if (/^\d{4}-XX-XX$/i.test(str)) {
    return `${str.substring(0, 4)}-06-01`;
  }

  // DD/MM/YYYY or DD-MM-YYYY or M/D/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const p1 = parseInt(dmyMatch[1], 10);
    const p2 = parseInt(dmyMatch[2], 10);
    const y = dmyMatch[3];
    let day = p1;
    let month = p2;
    // If p1 <= 12 and p2 > 12, it's M/D/YYYY format (e.g. 6/9/2025 where 6 is June, or 6/15/2024 where 15 is day)
    if (p1 <= 12 && p2 > 12) {
      day = p2;
      month = p1;
    }
    const dStr = String(day).padStart(2, '0');
    const mStr = String(month).padStart(2, '0');
    return `${y}-${mStr}-${dStr}`;
  }

  // YYYY/MM/DD or YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = ymdMatch[2].padStart(2, '0');
    const d = ymdMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Return raw string if valid length
  return str;
}

/**
 * Normalizes gender value
 */
export function normalizeGender(val: any): 'Boy' | 'Girl' | 'Other' | undefined {
  if (!val) return undefined;
  const str = String(val).trim().toLowerCase();

  if (
    str === 'boy' ||
    str === 'male' ||
    str === 'm' ||
    str === 'કુમાર' ||
    str === 'પુરુષ' ||
    str === 'છોકરો'
  ) {
    return 'Boy';
  }
  if (
    str === 'girl' ||
    str === 'female' ||
    str === 'f' ||
    str === 'કન્યા' ||
    str === 'સ્ત્રી' ||
    str === 'છોકરી'
  ) {
    return 'Girl';
  }
  if (str === 'other' || str === 'અન્ય') {
    return 'Other';
  }

  return undefined;
}

/**
 * Calculates differences between an existing student record and newly parsed Excel row data.
 * Returns a list of changed fields with user-friendly labels in Gujarati.
 */
export function computeStudentFieldChanges(
  existing: Student,
  parsed: {
    name: string;
    standard: string;
    grNumber?: string;
    section?: string;
    rollNumber?: string;
    dob?: string;
    doa?: string;
    gender?: string;
    caste?: string;
    bloodGroup?: string;
    contactNumber?: string;
    motherName?: string;
    fatherName?: string;
    address?: string;
    diseCode?: string;
    studentStateCode?: string;
    aadhaarNo?: string;
    placeOfBirth?: string;
    fatherOccupation?: string;
    motherOccupation?: string;
  }
): StudentFieldChange[] {
  const diffs: StudentFieldChange[] = [];

  const check = (label: string, fieldName: string, oldVal: any, newVal: any) => {
    if (newVal === undefined || newVal === null) return;
    const n = String(newVal).trim();
    if (n === '') return;
    const o = String(oldVal || '').trim();
    // Compare trimmed values
    if (n.toLowerCase() !== o.toLowerCase()) {
      diffs.push({
        fieldLabel: label,
        fieldName,
        oldValue: o || '(ખાલી)',
        newValue: n,
      });
    }
  };

  check('વિદ્યાર્થીનું નામ', 'studentName', existing.studentName, parsed.name);
  check('ધોરણ', 'standard', existing.standard, parsed.standard);
  check('G.R. નંબર', 'grNumber', existing.grNumber, parsed.grNumber);
  check('વર્ગ / વિભાગ', 'section', existing.section || existing.division, parsed.section);
  check('રોલ નંબર', 'rollNumber', existing.rollNumber, parsed.rollNumber);
  check('જન્મ તારીખ (DOB)', 'dob', existing.dob, parsed.dob);
  check('પ્રવેશ તારીખ (DOA)', 'doa', existing.doa, parsed.doa);
  check('જાતિ (Gender)', 'gender', existing.gender, parsed.gender);
  check('જ્ઞાતિ / કેટેગરી', 'caste', existing.caste, parsed.caste);
  check('બ્લડ ગ્રૂપ', 'bloodGroup', existing.bloodGroup, parsed.bloodGroup);
  check('સંપર્ક / મોબાઇલ', 'contactNumber', existing.contactNumber || existing.mobileNumber, parsed.contactNumber);
  check('માતાનું નામ', 'motherName', existing.motherName, parsed.motherName);
  check('પિતાનું નામ', 'fatherName', existing.fatherName, parsed.fatherName);
  check('સરનામું', 'address', existing.address, parsed.address);
  check('DISE / આધાર કોડ', 'diseCode', existing.diseCode || existing.studentStateCode, parsed.diseCode || parsed.studentStateCode);
  check('આધાર કાર્ડ નં.', 'aadhaarNo', existing.aadhaarNo, parsed.aadhaarNo);
  check('જન્મ સ્થળ', 'placeOfBirth', existing.placeOfBirth, parsed.placeOfBirth);

  return diffs;
}

/**
 * Parses and validates an uploaded Excel (.xlsx/.xls) file containing student records.
 * Supports the full Student Master Information template.
 * Validates required fields, checks for duplicate rows in file, and checks for existing students to update.
 */
export async function parseStudentsExcelFile(
  file: File,
  existingSchoolStudents: Student[],
  schoolDiseCode?: string
): Promise<ExcelParseResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Excel ફાઈલમાં કોઈ શીટ મળી નથી (No sheets found in Excel file).');
  }

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  if (rawRows.length === 0) {
    throw new Error('Excel ફાઈલ ખાલી છે (The uploaded Excel file contains no data rows).');
  }

  // Build lookup index for existing school students (by GR number & by Name+Standard & by DISE/Aadhaar)
  const existingByGr = new Map<string, Student>();
  const existingByNameStd = new Map<string, Student>();
  const existingByDise = new Map<string, Student>();

  for (const s of existingSchoolStudents) {
    if (s.grNumber && s.grNumber.trim()) {
      existingByGr.set(s.grNumber.trim().toLowerCase(), s);
    }
    const key = `${s.studentName.trim().toLowerCase()}_${String(s.standard).trim()}`;
    existingByNameStd.set(key, s);

    if (s.diseCode && s.diseCode.trim() && s.diseCode.trim() !== schoolDiseCode?.trim()) {
      existingByDise.set(s.diseCode.trim().toLowerCase(), s);
    }
    if (s.studentStateCode && s.studentStateCode.trim()) {
      existingByDise.set(s.studentStateCode.trim().toLowerCase(), s);
    }
    if (s.aadhaarNo && s.aadhaarNo.trim()) {
      existingByDise.set(s.aadhaarNo.trim().toLowerCase(), s);
    }
  }

  const seenInFileGr = new Set<string>();
  const seenInFileNameStd = new Set<string>();

  const validRows: ParsedStudentRow[] = [];
  const invalidRows: ParsedStudentRow[] = [];
  const duplicateInFileRows: ParsedStudentRow[] = [];
  const existingUpdateRows: ParsedStudentRow[] = [];
  const allRows: ParsedStudentRow[] = [];

  rawRows.forEach((row, index) => {
    const rowNumber = index + 2; // Row 1 is header in Excel

    // Find columns using case-insensitive mapping
    let rawDise: any = undefined;
    let rawGr: any = undefined;
    let rawName: any = undefined;
    let rawStd: any = undefined;
    let rawSec: any = undefined;
    let rawDob: any = undefined;
    let rawAddr: any = undefined;
    let rawDoa: any = undefined;
    let rawMother: any = undefined;
    let rawFather: any = undefined;
    let rawGender: any = undefined;
    let rawCaste: any = undefined;
    let rawBlood: any = undefined;
    let rawMobile: any = undefined;
    let rawFatherOcc: any = undefined;
    let rawMotherOcc: any = undefined;
    let rawPlaceOfBirth: any = undefined;
    let rawPhoto: any = undefined;

    for (const key of Object.keys(row)) {
      const cleanKey = key.trim().toLowerCase().replace(/[\._\-]/g, ' ').replace(/\s+/g, ' ');

      // DISE Code / Child UID / State Code
      if (
        cleanKey === 'dise code' ||
        cleanKey === 'disecode' ||
        cleanKey === 'dise' ||
        cleanKey === 'student dise' ||
        cleanKey === 'student dise code' ||
        cleanKey === 'studentdise' ||
        cleanKey === 'student state code' ||
        cleanKey === 'studentstatecode' ||
        cleanKey === 'state code' ||
        cleanKey === 'statecode' ||
        cleanKey === 'child uid' ||
        cleanKey === 'child unique id' ||
        cleanKey === 'childuid' ||
        cleanKey === 'child id' ||
        cleanKey === 'aadhaaruid' ||
        cleanKey === 'aadhaar uid' ||
        cleanKey === 'aadhar uid' ||
        cleanKey === 'aadharuid' ||
        cleanKey === 'udise' ||
        cleanKey === 'udise code' ||
        cleanKey === 'student udise' ||
        cleanKey.includes('ડાયસ') ||
        cleanKey.includes('સ્ટેટ કોડ') ||
        cleanKey.includes('યુઆઈડી') ||
        cleanKey.includes('ચાઈલ્ડ')
      ) {
        rawDise = row[key];
      }
      // GR No.
      else if (
        cleanKey === 'gr no' ||
        cleanKey === 'gr number' ||
        cleanKey === 'gr' ||
        cleanKey === 'g r' ||
        cleanKey.includes('જનરલ રજિસ્ટર') ||
        cleanKey.includes('જી આર')
      ) {
        rawGr = row[key];
      }
      // Name (As in GR)
      else if (
        cleanKey === 'name as in gr' ||
        cleanKey === 'name' ||
        cleanKey === 'student name' ||
        cleanKey === 'studentname' ||
        cleanKey === 'વિદ્યાર્થી' ||
        cleanKey === 'વિદ્યાર્થીનું નામ' ||
        cleanKey === 'નામ'
      ) {
        rawName = row[key];
      }
      // Standard
      else if (
        cleanKey === 'standard' ||
        cleanKey === 'std' ||
        cleanKey === 'class' ||
        cleanKey === 'ધોરણ'
      ) {
        rawStd = row[key];
      }
      // Section
      else if (
        cleanKey === 'section' ||
        cleanKey === 'division' ||
        cleanKey === 'div' ||
        cleanKey === 'sec' ||
        cleanKey === 'વર્ગ' ||
        cleanKey === 'વિભાગ'
      ) {
        rawSec = row[key];
      }
      // DOB
      else if (
        cleanKey === 'dob' ||
        cleanKey === 'date of birth' ||
        cleanKey === 'birth date' ||
        cleanKey.includes('જન્મ તારીખ') ||
        cleanKey.includes('જન્મતારીખ')
      ) {
        rawDob = row[key];
      }
      // Address
      else if (
        cleanKey === 'address' ||
        cleanKey === 'residential address' ||
        cleanKey === 'સરનામું' ||
        cleanKey === 'સરનામુ'
      ) {
        rawAddr = row[key];
      }
      // DOA
      else if (
        cleanKey === 'doa' ||
        cleanKey === 'date of admission' ||
        cleanKey === 'admission date' ||
        cleanKey.includes('પ્રવેશ તારીખ')
      ) {
        rawDoa = row[key];
      }
      // Mother Name
      else if (
        cleanKey === 'mother name' ||
        cleanKey === 'mother' ||
        cleanKey.includes('માતાનું નામ') ||
        cleanKey.includes('માતા')
      ) {
        rawMother = row[key];
      }
      // Father Name
      else if (
        cleanKey === 'father name' ||
        cleanKey === 'father' ||
        cleanKey.includes('પિતાનું નામ') ||
        cleanKey.includes('પિતા')
      ) {
        rawFather = row[key];
      }
      // Gender
      else if (
        cleanKey === 'gender' ||
        cleanKey === 'sex' ||
        cleanKey === 'જાતિ' ||
        cleanKey === 'લિંગ'
      ) {
        rawGender = row[key];
      }
      // Caste
      else if (
        cleanKey === 'caste' ||
        cleanKey === 'category' ||
        cleanKey === 'જ્ઞાતિ' ||
        cleanKey === 'કેટેગરી'
      ) {
        rawCaste = row[key];
      }
      // Blood Group
      else if (
        cleanKey === 'blood group' ||
        cleanKey === 'bloodgroup' ||
        cleanKey === 'blood' ||
        cleanKey.includes('બ્લડ')
      ) {
        rawBlood = row[key];
      }
      // Mobile / Contact
      else if (
        cleanKey === 'mobile number' ||
        cleanKey === 'mobile' ||
        cleanKey === 'contact number' ||
        cleanKey === 'phone' ||
        cleanKey.includes('મોબાઈલ') ||
        cleanKey.includes('સંપર્ક')
      ) {
        rawMobile = row[key];
      }
      // Father Occupation
      else if (
        cleanKey.includes('father') && cleanKey.includes('occupation') ||
        cleanKey.includes('પિતાનો વ્યવસાય')
      ) {
        rawFatherOcc = row[key];
      }
      // Mother Occupation
      else if (
        cleanKey.includes('mother') && cleanKey.includes('occupation') ||
        cleanKey.includes('માતાનો વ્યવસાય')
      ) {
        rawMotherOcc = row[key];
      }
      // Place of Birth
      else if (
        cleanKey === 'place of birth' ||
        cleanKey === 'birth place' ||
        cleanKey.includes('જન્મ સ્થળ') ||
        cleanKey.includes('જન્મસ્થળ')
      ) {
        rawPlaceOfBirth = row[key];
      }
      // Student Photo
      else if (
        cleanKey === 'student photo' ||
        cleanKey === 'photo' ||
        cleanKey === 'photo url' ||
        cleanKey.includes('ફોટો')
      ) {
        rawPhoto = row[key];
      }
    }

    if (!rawDise) {
      for (const k of Object.keys(row)) {
        const val = row[k];
        if (val !== undefined && val !== null && val !== '') {
          const norm = normalizeDiseCode(val);
          if (/^\d{18,22}$/.test(norm)) {
            rawDise = norm;
            break;
          }
        }
      }
    }

    const trimmedName = rawName !== undefined ? String(rawName).trim() : '';
    const normalizedStd = normalizeStandard(rawStd);
    const grNumber = rawGr !== undefined && String(rawGr).trim() !== '' ? String(rawGr).trim() : undefined;
    const normalizedRawDise = rawDise !== undefined && String(rawDise).trim() !== '' ? normalizeDiseCode(rawDise) : undefined;
    const isSchoolCode = normalizedRawDise && schoolDiseCode && normalizedRawDise === schoolDiseCode.replace(/\D/g, '');
    const diseCode = normalizedRawDise && !isSchoolCode ? normalizedRawDise : undefined;
    const studentStateCode = normalizedRawDise && !isSchoolCode && normalizedRawDise.replace(/\D/g, '').length >= 18 ? normalizedRawDise : undefined;
    const section = rawSec !== undefined && String(rawSec).trim() !== '' ? String(rawSec).trim() : undefined;
    const dob = normalizeDate(rawDob);
    const doa = normalizeDate(rawDoa);
    const address = rawAddr !== undefined && String(rawAddr).trim() !== '' ? String(rawAddr).trim() : undefined;
    const motherName = rawMother !== undefined && String(rawMother).trim() !== '' ? String(rawMother).trim() : undefined;
    const fatherName = rawFather !== undefined && String(rawFather).trim() !== '' ? String(rawFather).trim() : undefined;
    const gender = normalizeGender(rawGender);
    let caste = rawCaste !== undefined && String(rawCaste).trim() !== '' ? String(rawCaste).trim() : undefined;
    
    // Strict Blood Group sanitization - only actual blood groups allowed in bloodGroup
    let bloodGroup = cleanAndNormalizeBloodGroup(rawBlood);
    if (!bloodGroup && rawBlood) {
      const inspect = inspectInvalidBloodGroupEntry(String(rawBlood));
      if (inspect.targetField === 'caste' && !caste && inspect.migratedValue) {
        caste = inspect.migratedValue;
      }
      // Check if any other cell in the row contains a valid blood group
      for (const k of Object.keys(row)) {
        const cellVal = row[k];
        if (cellVal && cleanAndNormalizeBloodGroup(cellVal)) {
          bloodGroup = cleanAndNormalizeBloodGroup(cellVal);
          break;
        }
      }
    }
    const contactNumber = rawMobile !== undefined && String(rawMobile).trim() !== '' ? String(rawMobile).trim() : undefined;
    const fatherOccupation = rawFatherOcc !== undefined && String(rawFatherOcc).trim() !== '' ? String(rawFatherOcc).trim() : undefined;
    const motherOccupation = rawMotherOcc !== undefined && String(rawMotherOcc).trim() !== '' ? String(rawMotherOcc).trim() : undefined;
    const placeOfBirth = rawPlaceOfBirth !== undefined && String(rawPlaceOfBirth).trim() !== '' ? String(rawPlaceOfBirth).trim() : undefined;
    const photoUrl = rawPhoto !== undefined && String(rawPhoto).trim() !== '' ? String(rawPhoto).trim() : undefined;

    let isValid = true;
    let isDuplicateInFile = false;
    let isExistingUpdate = false;
    let existingStudentId: string | undefined = undefined;
    let matchedStudent: Student | undefined = undefined;
    let studentChanges: StudentFieldChange[] | undefined = undefined;
    let errorReason = '';

    // Validation 1: Required Name
    if (!trimmedName) {
      isValid = false;
      errorReason = 'વિદ્યાર્થીનું નામ (Name as in GR) જરૂરી છે (Name column is missing or empty)';
    }
    // Validation 2: Required Standard (9, 10, 11, 12)
    else if (!normalizedStd) {
      isValid = false;
      errorReason = `અમાન્ય ધોરણ "${rawStd ?? ''}" (માત્ર 9, 10, 11, 12 માન્ય છે / Only Standards 9, 10, 11, 12 allowed)`;
    } else {
      // Check duplicate within the uploaded file
      const fileKey = grNumber ? `gr_${grNumber.toLowerCase()}` : `name_${trimmedName.toLowerCase()}_${normalizedStd}`;

      if (grNumber && seenInFileGr.has(grNumber.toLowerCase())) {
        isDuplicateInFile = true;
        isValid = false;
        errorReason = `એક્સેલ ફાઈલમાં આ જ G.R. નંબર (${grNumber}) પુનરાવર્તિત થાય છે (Duplicate GR No. in this file)`;
      } else if (seenInFileNameStd.has(`${trimmedName.toLowerCase()}_${normalizedStd}`)) {
        isDuplicateInFile = true;
        isValid = false;
        errorReason = 'એક્સેલ ફાઈલમાં આ જ વિદ્યાર્થીનું નામ અને ધોરણ પુનરાવર્તિત થાય છે (Duplicate row in this file)';
      } else {
        if (grNumber) seenInFileGr.add(grNumber.toLowerCase());
        seenInFileNameStd.add(`${trimmedName.toLowerCase()}_${normalizedStd}`);

        // Check if student already exists in school database
        if (grNumber && existingByGr.has(grNumber.toLowerCase())) {
          matchedStudent = existingByGr.get(grNumber.toLowerCase());
        } else if (diseCode && existingByDise.has(diseCode.toLowerCase())) {
          matchedStudent = existingByDise.get(diseCode.toLowerCase());
        } else {
          const key = `${trimmedName.toLowerCase()}_${normalizedStd}`;
          if (existingByNameStd.has(key)) {
            matchedStudent = existingByNameStd.get(key);
          }
        }

        if (matchedStudent) {
          isExistingUpdate = true;
          existingStudentId = matchedStudent.id;
          studentChanges = computeStudentFieldChanges(matchedStudent, {
            name: trimmedName,
            standard: normalizedStd || String(rawStd || ''),
            diseCode,
            studentStateCode,
            grNumber,
            section,
            dob,
            address,
            doa,
            motherName,
            fatherName,
            gender,
            caste,
            bloodGroup,
            contactNumber,
            fatherOccupation,
            motherOccupation,
            placeOfBirth,
          });
        }
      }
    }

    const parsedRow: ParsedStudentRow = {
      rowNumber,
      name: trimmedName,
      standard: normalizedStd || String(rawStd || ''),
      diseCode,
      studentStateCode,
      grNumber,
      section,
      dob,
      address,
      doa,
      motherName,
      fatherName,
      gender,
      caste,
      bloodGroup,
      contactNumber,
      fatherOccupation,
      motherOccupation,
      placeOfBirth,
      photoUrl,
      isValid,
      isDuplicateInFile,
      isExistingUpdate,
      existingStudentId,
      existingStudentName: matchedStudent?.studentName,
      existingGrNumber: matchedStudent?.grNumber,
      existingStandard: matchedStudent?.standard,
      changes: studentChanges,
      errorReason: errorReason || undefined,
    };

    allRows.push(parsedRow);
    if (!isValid) {
      if (isDuplicateInFile) {
        duplicateInFileRows.push(parsedRow);
      } else {
        invalidRows.push(parsedRow);
      }
    } else {
      validRows.push(parsedRow);
      if (isExistingUpdate) {
        existingUpdateRows.push(parsedRow);
      }
    }
  });

  return {
    totalRows: allRows.length,
    validRows,
    invalidRows,
    duplicateInFileRows,
    existingUpdateRows,
    allRows,
  };
}

/**
 * Exports complete Student Master information to Excel matching the exact template columns.
 */
export function exportStudentsExcel(
  students: Student[],
  schoolName: string,
  schoolDiseCode?: string
) {
  if (students.length === 0) {
    throw new Error('કોઈ વિદ્યાર્થી ડેટા ઉપલબ્ધ નથી (No student data available to export).');
  }

  const exportRows = students.map((s) => ({
    'DISE CODE': s.diseCode || schoolDiseCode || '-',
    'GR NO.': s.grNumber || '-',
    'NAME (AS IN GR)': s.studentName,
    'STANDARD': s.standard,
    'SECTION': s.section || s.division || '-',
    'DOB': s.dob || '-',
    'ADDRESS': s.address || '-',
    'DOA': s.doa || '-',
    'MOTHER NAME': s.motherName || '-',
    'FATHER NAME': s.fatherName || '-',
    'GENDER': s.gender || '-',
    'CASTE': s.caste || '-',
    'BLOOD GROUP': (s.bloodGroup && cleanAndNormalizeBloodGroup(s.bloodGroup)) || '-',
    'MOBILE NUMBER': s.contactNumber || s.mobileNumber || '-',
    'FATHER OCCUPATION': s.fatherOccupation || '-',
    'MOTHER OCCUPATION': s.motherOccupation || '-',
    'PLACE OF BIRTH': s.placeOfBirth || '-',
    'STUDENT PHOTO': s.photoUrl ? 'Available' : '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportRows, {
    header: STUDENT_EXCEL_COLUMNS,
  });

  worksheet['!cols'] = [
    { wch: 15 },
    { wch: 12 },
    { wch: 32 },
    { wch: 12 },
    { wch: 10 },
    { wch: 14 },
    { wch: 35 },
    { wch: 14 },
    { wch: 22 },
    { wch: 22 },
    { wch: 12 },
    { wch: 14 },
    { wch: 13 },
    { wch: 16 },
    { wch: 20 },
    { wch: 20 },
    { wch: 18 },
    { wch: 16 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students_Master');

  const cleanSchool = schoolName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim();
  XLSX.writeFile(workbook, `${cleanSchool}_Students_Master.xlsx`);
}

/**
 * Dual-File Smart Import:
 * Merges CTS Excel (providing GR No. and student DISE code AadhaarUID)
 * with UDISE+ Excel (providing student name, std, section, roll no, dob, doa, caste, gender, blood group, cwsn, etc.)
 *
 * Specific requirements:
 * 1. All students from CTS excel are considered along with their GR from CTS.
 * 2. Details of students are taken from UDISE+ by comparing student DISE code:
 *    - In CTS: named `AadhaarUID`
 *    - In UDISE+: named `Student State Code` (Column 61)
 * 3. UDISE+ Columns considered:
 *    - Col 1: Class (Standard)
 *    - Col 3: Section
 *    - Col 4: Student Name (user explicitly requested: "write students name as in Udice+ one")
 *    - Col 5: Gender
 *    - Col 6: DOB
 *    - Col 11: Social Category (Caste)
 *    - Col 17: Mobile / Contact Number
 *    - Col 22: Whether CWSN (only if Yes)
 *    - Col 23-25: Disability Type, %, UDID (if Col 22 is Yes)
 *    - Col 30: Roll Number
 *    - Col 32: Admission Date (DOA)
 *    - Col 42: Blood Group
 *    - Col 43: Medium of Instruction
 *    - Col 52/53: Bank Account / Aadhaar
 *    - Col 61: Student State Code
 */
export async function parseDualFiles(
  ctsFile: File,
  udiseFile: File,
  existingStudents: Student[],
  schoolDiseCode?: string
): Promise<DualFileMergeResult> {
  // Read CTS file
  const ctsBuffer = await ctsFile.arrayBuffer();
  const ctsWorkbook = XLSX.read(ctsBuffer, { type: 'array', cellDates: true });
  const ctsSheet = ctsWorkbook.Sheets[ctsWorkbook.SheetNames[0]];
  const ctsRowsRaw: Array<Record<string, any>> = XLSX.utils.sheet_to_json(ctsSheet, { defval: '' });

  // Read UDISE+ file: read as both 2D array and objects
  const udiseBuffer = await udiseFile.arrayBuffer();
  const udiseWorkbook = XLSX.read(udiseBuffer, { type: 'array', cellDates: true });
  const udiseSheet = udiseWorkbook.Sheets[udiseWorkbook.SheetNames[0]];
  const udise2D: any[][] = XLSX.utils.sheet_to_json(udiseSheet, { header: 1, defval: '' });
  const udiseObjects: Array<Record<string, any>> = XLSX.utils.sheet_to_json(udiseSheet, { defval: '' });

  // Map UDISE+ records by normalized Student State Code (Col 61 / header)
  interface UdiseParsedRecord {
    diseCode: string;
    name: string;
    standard: string;
    section: string;
    gender?: string;
    dob?: string;
    caste?: string;
    mobile?: string;
    isCwsn: boolean;
    cwsnDisability?: string;
    rollNumber?: string;
    doa?: string;
    bloodGroup?: string;
    medium?: string;
    aadhaarNo?: string;
    motherName?: string;
    fatherName?: string;
    address?: string;
    placeOfBirth?: string;
    fatherOccupation?: string;
    motherOccupation?: string;
    bankAccountNo?: string;
    bankIfsc?: string;
    bankName?: string;
  }

  const udiseMap = new Map<string, UdiseParsedRecord>();
  const allUdiseRecords: UdiseParsedRecord[] = [];

  // Helper to extract string from cell safely
  const getCellStr = (val: any) => (val !== undefined && val !== null ? String(val).trim() : '');

  // Determine header row in UDISE+ sheet (check up to first 10 rows)
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(10, udise2D.length); i++) {
    const rowStr = udise2D[i].map((c) => String(c || '').toLowerCase()).join(' ');
    if (
      rowStr.includes('student state code') ||
      rowStr.includes('student name') ||
      rowStr.includes('state code') ||
      rowStr.includes('aadhaaruid') ||
      rowStr.includes('aadharuid') ||
      rowStr.includes('class') ||
      rowStr.includes('gender') ||
      rowStr.includes('ધોરણ') ||
      rowStr.includes('વિદ્યાર્થી') ||
      rowStr.includes('નામ')
    ) {
      headerRowIndex = i;
      break;
    }
  }

  // Column Index Map for UDISE+ file
  let stateCodeColIdx = -1;
  let nameColIdx = -1;
  let classColIdx = -1;
  let secColIdx = -1;
  let rollColIdx = -1;
  let dobColIdx = -1;
  let doaColIdx = -1;
  let genderColIdx = -1;
  let casteColIdx = -1;
  let bloodGroupColIdx = -1;
  let mobileColIdx = -1;
  let mediumColIdx = -1;
  let motherColIdx = -1;
  let fatherColIdx = -1;
  let aadhaarColIdx = -1;
  let cwsnColIdx = -1;
  let impTypeColIdx = -1;
  let impPctColIdx = -1;
  let udidColIdx = -1;
  let addressColIdx = -1;
  let placeOfBirthColIdx = -1;
  let fatherOccupationColIdx = -1;
  let motherOccupationColIdx = -1;
  let bankAccountColIdx = -1;
  let bankIfscColIdx = -1;
  let bankNameColIdx = -1;

  if (headerRowIndex >= 0 && udise2D[headerRowIndex]) {
    const headerCells = udise2D[headerRowIndex].map((c) =>
      String(c || '')
        .trim()
        .toLowerCase()
        .replace(/[\._\-]/g, ' ')
        .replace(/\s+/g, ' ')
    );

    headerCells.forEach((h, c) => {
      // 1. State Code / AadhaarUID / DISE
      if (
        h.includes('student state code') ||
        h.includes('state code') ||
        h === 'aadhaaruid' ||
        h === 'aadharuid' ||
        h.includes('dise code') ||
        h.includes('બાળ આઈડી') ||
        h.includes('સ્ટેટ કોડ')
      ) {
        if (stateCodeColIdx === -1) stateCodeColIdx = c;
      }
      // 2. Student Name (exclude mother/father/school/teacher)
      else if (
        h.includes('student name') ||
        h.includes("student's name") ||
        h.includes('name of the student') ||
        h.includes('name of student') ||
        h.includes('વિદ્યાર્થીનું નામ') ||
        h === 'student' ||
        ((h === 'name' || h === 'નામ') && !h.includes('mother') && !h.includes('father') && !h.includes('school'))
      ) {
        if (nameColIdx === -1) nameColIdx = c;
      }
      // 3. Class / Standard
      else if (
        h.includes('studying class') ||
        h.includes('class') ||
        h.includes('standard') ||
        h === 'std' ||
        h.includes('ધોરણ')
      ) {
        if (classColIdx === -1) classColIdx = c;
      }
      // 4. Section / Division
      else if (
        h.includes('section') ||
        h === 'sec' ||
        h.includes('division') ||
        h.includes('div') ||
        h.includes('વર્ગ') ||
        h.includes('શાખા')
      ) {
        if (secColIdx === -1) secColIdx = c;
      }
      // 5. Roll Number (Must be explicitly named Roll No / Roll Number)
      else if (
        h.includes('roll number') ||
        h.includes('roll no') ||
        h.includes('rollno') ||
        h === 'roll' ||
        h.includes('રોલ નંબર') ||
        h.includes('રોલ નં') ||
        h.includes('હજારી નંબર') ||
        h.includes('હજારી નં')
      ) {
        if (rollColIdx === -1) rollColIdx = c;
      }
      // 6. Blood Group
      else if (
        h.includes('blood group') ||
        h.includes('bloodgroup') ||
        h.includes('blood') ||
        h.includes('બ્લડ ગ્રૂપ') ||
        h.includes('બ્લડગ્રૂપ') ||
        h.includes('બ્લડ') ||
        h.includes('રક્ત જૂથ') ||
        h.includes('રક્તજૂથ') ||
        h.includes('લોહી')
      ) {
        if (bloodGroupColIdx === -1) bloodGroupColIdx = c;
      }
      // 7. Date of Birth (DOB)
      else if (
        h.includes('date of birth') ||
        h.includes('birth date') ||
        h.includes('birthdate') ||
        h === 'dob' ||
        h.includes('જન્મ તારીખ') ||
        h.includes('જન્મતારીખ') ||
        h.includes('જન્મ')
      ) {
        if (dobColIdx === -1) dobColIdx = c;
      }
      // 8. Admission Date (DOA)
      else if (
        h.includes('admission date') ||
        h.includes('date of admission') ||
        h.includes('entry date') ||
        h === 'doa' ||
        h.includes('પ્રવેશ તારીખ') ||
        h.includes('દાખલ તારીખ')
      ) {
        if (doaColIdx === -1) doaColIdx = c;
      }
      // 9. Gender / Sex
      else if (
        h.includes('gender') ||
        h.includes('sex') ||
        h.includes('લિંગ') ||
        h.includes('જાતિ/લિંગ') ||
        h.includes('કુમાર/કન્યા')
      ) {
        if (genderColIdx === -1) genderColIdx = c;
      }
      // 10. Caste / Social Category
      else if (
        h.includes('social category') ||
        h.includes('category') ||
        h.includes('caste') ||
        h.includes('સામાજિક કેટેગરી') ||
        h.includes('જ્ઞાતિ') ||
        (h.includes('જાતિ') && !h.includes('લિંગ'))
      ) {
        if (casteColIdx === -1) casteColIdx = c;
      }
      // 11. Mobile / Contact
      else if (
        h.includes('mobile') ||
        h.includes('contact') ||
        h.includes('phone') ||
        h.includes('મોબાઈલ') ||
        h.includes('ફોન')
      ) {
        if (mobileColIdx === -1) mobileColIdx = c;
      }
      // 12. Medium
      else if (
        h.includes('medium of instruction') ||
        h.includes('instruction medium') ||
        h.includes('medium') ||
        h.includes('માધ્યમ')
      ) {
        if (mediumColIdx === -1) mediumColIdx = c;
      }
      // 13. Mother Name
      else if (h.includes('mother') || h.includes('માતા')) {
        if (motherColIdx === -1) motherColIdx = c;
      }
      // 14. Father Name
      else if (h.includes('father') || h.includes('પિતા')) {
        if (fatherColIdx === -1) fatherColIdx = c;
      }
      // 15. CWSN
      else if (h.includes('whether cwsn') || h.includes('cwsn') || h.includes('દિવ્યાંગ')) {
        if (cwsnColIdx === -1) cwsnColIdx = c;
      }
      // 16. Impairment / Disability Details
      else if (h.includes('impairment') || h.includes('type of disability')) {
        if (impTypeColIdx === -1) impTypeColIdx = c;
      } else if (h.includes('percentage') || h.includes('disability %')) {
        if (impPctColIdx === -1) impPctColIdx = c;
      } else if (h.includes('udid')) {
        if (udidColIdx === -1) udidColIdx = c;
      }
      // 17. Aadhaar
      else if (
        h.includes('student aadhaar') ||
        h.includes('aadhaar number') ||
        h.includes('aadhar number') ||
        h.includes('આધાર નંબર') ||
        h === 'aadhaar' ||
        h === 'aadhar'
      ) {
        if (aadhaarColIdx === -1) aadhaarColIdx = c;
      }
      // 18. Address
      else if (
        h.includes('address') ||
        h.includes('સરનામું') ||
        h.includes('residence') ||
        h.includes('મુકામ')
      ) {
        if (addressColIdx === -1) addressColIdx = c;
      }
      // 19. Place of Birth
      else if (
        h.includes('place of birth') ||
        h.includes('birth place') ||
        h.includes('birthplace') ||
        h.includes('જન્મ સ્થળ') ||
        h.includes('જન્મસ્થળ')
      ) {
        if (placeOfBirthColIdx === -1) placeOfBirthColIdx = c;
      }
      // 20. Father Occupation
      else if (
        (h.includes('father') && (h.includes('occupation') || h.includes('profession') || h.includes('business'))) ||
        h.includes('પિતાનો વ્યવસાય') ||
        h.includes('પિતા વ્યવસાય')
      ) {
        if (fatherOccupationColIdx === -1) fatherOccupationColIdx = c;
      }
      // 21. Mother Occupation
      else if (
        (h.includes('mother') && (h.includes('occupation') || h.includes('profession') || h.includes('housewife'))) ||
        h.includes('માતાનો વ્યવસાય') ||
        h.includes('માતા વ્યવસાય')
      ) {
        if (motherOccupationColIdx === -1) motherOccupationColIdx = c;
      }
      // 22. Bank Account
      else if (
        h.includes('bank account') ||
        h.includes('account number') ||
        h.includes('ખાતા નંબર') ||
        h.includes('ખાતા નં')
      ) {
        if (bankAccountColIdx === -1) bankAccountColIdx = c;
      }
      // 23. Bank IFSC
      else if (h.includes('ifsc') || h.includes('આઈએફએસસી')) {
        if (bankIfscColIdx === -1) bankIfscColIdx = c;
      }
      // 24. Bank Name
      else if (h.includes('bank name') || h.includes('બેંકનું નામ') || h === 'bank') {
        if (bankNameColIdx === -1) bankNameColIdx = c;
      }
    });
  }

  // Fallback defaults ONLY if no header row was detected at all
  if (headerRowIndex === -1) {
    stateCodeColIdx = 60;
    nameColIdx = 3;
    classColIdx = 0;
    secColIdx = 2;
    genderColIdx = 4;
    dobColIdx = 5;
    motherColIdx = 6;
    fatherColIdx = 7;
    casteColIdx = 10;
    mobileColIdx = 16;
    cwsnColIdx = 21;
    doaColIdx = 31;
    bloodGroupColIdx = 41;
    mediumColIdx = 42;
    aadhaarColIdx = 51;
    // Do NOT default rollColIdx to 29 without headers, as col 29 is often blood group in government exports!
  }

  const dataStartIndex = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;

  // Helper to check if string contains letters of a Gujarati or English personal name
  const isPersonalNameString = (s?: string) => {
    if (!s) return false;
    const str = String(s).trim();
    if (/\d/.test(str)) return false; // names don't have digits
    return (
      /ben$|bhai$|bai$|lal$|kumar$|devi$|બેન|ભાઈ|લાલ|કુમાર|દેવી/i.test(str) ||
      (/^[A-Za-z\s\u0A80-\u0AFF]{3,}$/.test(str) && !cleanAndNormalizeBloodGroup(str))
    );
  };

  for (let rIdx = dataStartIndex; rIdx < udise2D.length; rIdx++) {
    const row = udise2D[rIdx];
    if (!row || row.length === 0) continue;

    const objOffset = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
    const objIdx = rIdx - objOffset;
    const obj = objIdx >= 0 && objIdx < udiseObjects.length ? udiseObjects[objIdx] : null;

    // 1. State Code / DISE
    let rawStateCode = stateCodeColIdx >= 0 && stateCodeColIdx < row.length ? getCellStr(row[stateCodeColIdx]) : '';
    if (!rawStateCode && obj) {
      rawStateCode =
        obj['Student State Code'] ||
        obj['student state code'] ||
        obj['State Code'] ||
        obj['AadhaarUID'] ||
        obj['Aadharuid'] ||
        obj['DISE Code'] ||
        obj['બાળ આઈડી'] ||
        '';
    }
    if (!rawStateCode) {
      // Search row for any 18-22 digit code (handles numbers, scientific notation, and strings)
      const found = row.find((c) => {
        if (c === undefined || c === null || c === '') return false;
        const norm = normalizeDiseCode(c);
        return /^\d{18,22}$/.test(norm);
      });
      if (found) rawStateCode = String(found);
    }
    const stateCode = normalizeDiseCode(rawStateCode);

    // 2. Student Name
    let rawName = nameColIdx >= 0 && nameColIdx < row.length ? getCellStr(row[nameColIdx]) : '';
    if (!rawName && obj) {
      rawName =
        obj['Student Name'] ||
        obj['student name'] ||
        obj["Student's Name"] ||
        obj['Name'] ||
        obj['વિદ્યાર્થીનું નામ'] ||
        '';
    }

    // 3. Class
    let rawStd = classColIdx >= 0 && classColIdx < row.length ? getCellStr(row[classColIdx]) : '';
    if (!rawStd && obj) rawStd = obj['Class'] || obj['Standard'] || obj['ધોરણ'] || '';

    // 4. Section
    let rawSec = secColIdx >= 0 && secColIdx < row.length ? getCellStr(row[secColIdx]) : '';
    if (!rawSec && obj) rawSec = obj['Section'] || obj['Sec'] || obj['વર્ગ'] || '';

    // 5. Gender
    let rawGender = genderColIdx >= 0 && genderColIdx < row.length ? getCellStr(row[genderColIdx]) : '';
    if (!rawGender && obj) rawGender = obj['Gender'] || obj['Sex'] || obj['લિંગ'] || '';

    // 6. DOB
    let rawDob = dobColIdx >= 0 && dobColIdx < row.length ? row[dobColIdx] : undefined;
    if (!rawDob && obj) rawDob = obj['Date of Birth (DOB)'] || obj['Date of Birth'] || obj['DOB'] || obj['જન્મ તારીખ'];

    // 7. Social Category / Caste
    let rawCaste = casteColIdx >= 0 && casteColIdx < row.length ? getCellStr(row[casteColIdx]) : '';
    if (!rawCaste && obj) rawCaste = obj['Social Category'] || obj['Caste'] || obj['જ્ઞાતિ'] || '';

    // 8. Mobile
    let rawMobile = mobileColIdx >= 0 && mobileColIdx < row.length ? getCellStr(row[mobileColIdx]) : '';
    if (!rawMobile && obj) rawMobile = obj['Mobile Number of Student/Parent'] || obj['Mobile Number'] || obj['Mobile'] || '';

    // 9. CWSN
    let rawCwsnFlag = cwsnColIdx >= 0 && cwsnColIdx < row.length ? getCellStr(row[cwsnColIdx]).toLowerCase() : '';
    if (!rawCwsnFlag && obj) {
      rawCwsnFlag = getCellStr(obj['Whether CWSN (Yes/No)'] || obj['Whether CWSN'] || obj['CWSN']).toLowerCase();
    }
    const isCwsn =
      rawCwsnFlag === 'yes' ||
      rawCwsnFlag === 'y' ||
      rawCwsnFlag === '1' ||
      rawCwsnFlag === 'હા' ||
      rawCwsnFlag === 'true';

    // CWSN Details
    let cwsnDetails = '';
    if (isCwsn) {
      const impType =
        (impTypeColIdx >= 0 && impTypeColIdx < row.length ? getCellStr(row[impTypeColIdx]) : '') ||
        (obj ? getCellStr(obj['Type of Impairment']) : '');
      const impPct =
        (impPctColIdx >= 0 && impPctColIdx < row.length ? getCellStr(row[impPctColIdx]) : '') ||
        (obj ? getCellStr(obj['Disability Percentage (%)']) : '');
      const udidNo =
        (udidColIdx >= 0 && udidColIdx < row.length ? getCellStr(row[udidColIdx]) : '') ||
        (obj ? getCellStr(obj['UDID Card Number']) : '');
      const parts = [];
      if (impType && impType !== 'NA' && impType !== '0') parts.push(impType);
      if (impPct && impPct !== '0') parts.push(`${impPct}%`);
      if (udidNo && udidNo !== 'NA') parts.push(`UDID: ${udidNo}`);
      cwsnDetails = parts.join(' - ') || 'CWSN (દિવ્યાંગ વિદ્યાર્થી)';
    }

    // 10. Roll Number
    let rawRoll = rollColIdx >= 0 && rollColIdx < row.length ? getCellStr(row[rollColIdx]) : '';
    if (!rawRoll && obj) {
      rawRoll =
        obj['Roll Number'] ||
        obj['Roll No'] ||
        obj['RollNo'] ||
        obj['રોલ નંબર'] ||
        obj['રોલ નં'] ||
        '';
    }

    // 11. Admission Date (DOA)
    let rawDoa = doaColIdx >= 0 && doaColIdx < row.length ? row[doaColIdx] : undefined;
    if (!rawDoa && obj) rawDoa = obj['Admission Date (DOA)'] || obj['Admission Date'] || obj['DOA'] || obj['પ્રવેશ તારીખ'];
    if (typeof rawDoa === 'string' && rawDoa.trim().toUpperCase() === 'NA') {
      rawDoa = undefined;
    }

    // 12. Blood Group
    let rawBlood = bloodGroupColIdx >= 0 && bloodGroupColIdx < row.length ? getCellStr(row[bloodGroupColIdx]) : '';
    if (!rawBlood && obj) {
      rawBlood =
        obj['Blood Group'] ||
        obj['blood group'] ||
        obj['BloodGroup'] ||
        obj['બ્લડ ગ્રૂપ'] ||
        obj['બ્લડગ્રૂપ'] ||
        '';
    }

    // 13. Medium
    let rawMedium = mediumColIdx >= 0 && mediumColIdx < row.length ? getCellStr(row[mediumColIdx]) : '';
    if (!rawMedium && obj) {
      rawMedium = obj['Medium of Instruction'] || obj['Medium'] || obj['medium'] || obj['માધ્યમ'] || '';
    }

    // 14. Mother & Father
    let rawMother = motherColIdx >= 0 && motherColIdx < row.length ? getCellStr(row[motherColIdx]) : '';
    if (!rawMother && obj) rawMother = obj['Mother Name'] || obj["Mother's Name"] || obj['માતાનું નામ'] || '';

    let rawFather = fatherColIdx >= 0 && fatherColIdx < row.length ? getCellStr(row[fatherColIdx]) : '';
    if (!rawFather && obj) rawFather = obj['Father Name'] || obj["Father's Name"] || obj['પિતાનું નામ'] || '';

    // 15. Aadhaar
    let rawAadhaar = aadhaarColIdx >= 0 && aadhaarColIdx < row.length ? getCellStr(row[aadhaarColIdx]) : '';
    if (!rawAadhaar && obj) {
      rawAadhaar =
        obj['Student Aadhaar Number'] ||
        obj['Aadhaar Number'] ||
        obj['Aadhar Number'] ||
        obj['Aadhaar'] ||
        obj['Aadhar'] ||
        obj['આધાર નંબર'] ||
        '';
    }

    // 16. Address
    let rawAddress = addressColIdx >= 0 && addressColIdx < row.length ? getCellStr(row[addressColIdx]) : '';
    if (!rawAddress && obj) {
      rawAddress = obj['Address'] || obj['Residential Address'] || obj['સરનામું'] || obj['મુકામ'] || '';
    }

    // 17. Place of Birth
    let rawPlaceOfBirth = placeOfBirthColIdx >= 0 && placeOfBirthColIdx < row.length ? getCellStr(row[placeOfBirthColIdx]) : '';
    if (!rawPlaceOfBirth && obj) {
      rawPlaceOfBirth = obj['Place of Birth'] || obj['Birth Place'] || obj['Birthplace'] || obj['જન્મ સ્થળ'] || obj['જન્મસ્થળ'] || '';
    }

    // 18. Father Occupation
    let rawFatherOcc = fatherOccupationColIdx >= 0 && fatherOccupationColIdx < row.length ? getCellStr(row[fatherOccupationColIdx]) : '';
    if (!rawFatherOcc && obj) {
      rawFatherOcc = obj['Father Occupation'] || obj["Father's Occupation"] || obj['Father Profession'] || obj['પિતાનો વ્યવસાય'] || '';
    }

    // 19. Mother Occupation
    let rawMotherOcc = motherOccupationColIdx >= 0 && motherOccupationColIdx < row.length ? getCellStr(row[motherOccupationColIdx]) : '';
    if (!rawMotherOcc && obj) {
      rawMotherOcc = obj['Mother Occupation'] || obj["Mother's Occupation"] || obj['Mother Profession'] || obj['માતાનો વ્યવસાય'] || '';
    }

    // 20. Bank details
    let rawBankAcc = bankAccountColIdx >= 0 && bankAccountColIdx < row.length ? getCellStr(row[bankAccountColIdx]) : '';
    if (!rawBankAcc && obj) {
      rawBankAcc = obj['Bank Account Number'] || obj['Account Number'] || obj['Bank Account'] || obj['ખાતા નંબર'] || '';
    }
    let rawBankIfsc = bankIfscColIdx >= 0 && bankIfscColIdx < row.length ? getCellStr(row[bankIfscColIdx]) : '';
    if (!rawBankIfsc && obj) rawBankIfsc = obj['Bank IFSC Code'] || obj['IFSC Code'] || obj['IFSC'] || '';
    let rawBankName = bankNameColIdx >= 0 && bankNameColIdx < row.length ? getCellStr(row[bankNameColIdx]) : '';
    if (!rawBankName && obj) rawBankName = obj['Bank Name'] || obj['Bank'] || obj['બેંકનું નામ'] || '';

    // =========================================================================
    // CRITICAL DEFENSIVE SANITIZATION: PREVENT FIELD-SHIFT / POLLUTION
    // =========================================================================

    // 1. ROLL NUMBER CAN NEVER BE A BLOOD GROUP!
    // If rawRoll is a blood group (e.g. O+, B+, A+, AB+), recover it into bloodGroup and clear rollNumber!
    const rollAsBlood = cleanAndNormalizeBloodGroup(rawRoll);
    if (rollAsBlood) {
      if (!rawBlood || !cleanAndNormalizeBloodGroup(rawBlood)) {
        rawBlood = rollAsBlood;
      }
      rawRoll = ''; // Wipe blood group out of rollNumber!
    } else if (rawRoll && isDateLikeString(rawRoll)) {
      // Roll number cannot be a date
      if (!rawDob) rawDob = rawRoll;
      rawRoll = '';
    }

    // 2. SECTION CAN NEVER BE A DATE OR A BLOOD GROUP!
    // If rawSec is a date (e.g. 20/07/2011), it is DOB!
    if (rawSec && isDateLikeString(rawSec)) {
      if (!rawDob) rawDob = rawSec;
      rawSec = 'A';
    }
    const secAsBlood = cleanAndNormalizeBloodGroup(rawSec);
    if (secAsBlood) {
      if (!rawBlood || !cleanAndNormalizeBloodGroup(rawBlood)) {
        rawBlood = secAsBlood;
      }
      rawSec = 'A';
    }

    // 3. DOB CAN NEVER BE A PERSON NAME!
    // If rawDob contains a name like VALIBEN, LILABEN, it is Mother's Name!
    if (typeof rawDob === 'string' && isPersonalNameString(rawDob)) {
      if (!rawMother) rawMother = rawDob;
      rawDob = undefined;
    }

    // 4. STRICTLY VALIDATE BLOOD GROUP
    let validatedBlood = cleanAndNormalizeBloodGroup(rawBlood);
    if (!validatedBlood && rawBlood) {
      const inspect = inspectInvalidBloodGroupEntry(rawBlood);
      if (inspect.targetField === 'medium' && (!rawMedium || rawMedium === '')) {
        rawMedium = inspect.migratedValue || rawBlood;
      }
    }

    // 5. If blood group is still missing, scan other row cells (excluding name & code columns)
    if (!validatedBlood) {
      for (let c = 0; c < row.length; c++) {
        if (c === nameColIdx || c === stateCodeColIdx || c === classColIdx) continue;
        const val = getCellStr(row[c]);
        if (val && cleanAndNormalizeBloodGroup(val)) {
          validatedBlood = cleanAndNormalizeBloodGroup(val);
          break;
        }
      }
    }

    if (!stateCode && !rawName) continue;

    const record: UdiseParsedRecord = {
      diseCode: stateCode,
      name: rawName,
      standard: rawStd,
      section: rawSec || 'A',
      gender: rawGender,
      dob: normalizeDate(rawDob),
      caste: rawCaste,
      mobile: rawMobile,
      isCwsn,
      cwsnDisability: cwsnDetails || undefined,
      rollNumber: rawRoll || undefined,
      doa: normalizeDate(rawDoa),
      bloodGroup: validatedBlood,
      medium: rawMedium,
      aadhaarNo: rawAadhaar,
      motherName: rawMother,
      fatherName: rawFather,
      address: rawAddress,
      placeOfBirth: rawPlaceOfBirth,
      fatherOccupation: rawFatherOcc,
      motherOccupation: rawMotherOcc,
      bankAccountNo: rawBankAcc,
      bankIfsc: rawBankIfsc,
      bankName: rawBankName,
    };

    allUdiseRecords.push(record);
    if (stateCode) {
      udiseMap.set(stateCode, record);
    }
  }

  // 2. Process CTS records
  interface CtsParsedRecord {
    diseCode: string;
    grNumber: string;
    name: string;
    standard: string;
    section: string;
    doa?: string;
    dob?: string;
    gender?: string;
    caste?: string;
    medium?: string;
    fatherName?: string;
    motherName?: string;
    address?: string;
    placeOfBirth?: string;
    fatherOccupation?: string;
    motherOccupation?: string;
    aadhaarNo?: string;
    bankAccountNo?: string;
    bankIfsc?: string;
    bankName?: string;
  }

  const ctsList: CtsParsedRecord[] = [];

  for (const row of ctsRowsRaw) {
    let rawAadhaarUid = '';
    let rawGr = '';

    for (const key of Object.keys(row)) {
      const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (
        cleanKey === 'aadhaaruid' ||
        cleanKey === 'aadharuid' ||
        cleanKey === 'studentstatecode' ||
        cleanKey === 'statecode' ||
        cleanKey === 'dise' ||
        cleanKey === 'disecode'
      ) {
        rawAadhaarUid = row[key];
      } else if (
        cleanKey === 'grno' ||
        cleanKey === 'grnumber' ||
        cleanKey === 'gr' ||
        cleanKey === 'generalregisterno'
      ) {
        rawGr = row[key];
      }
    }

    const diseCode = normalizeDiseCode(rawAadhaarUid);
    const grNumber = String(rawGr !== undefined ? rawGr : '').trim();

    if (!diseCode && !grNumber && !row['StudentName'] && !row['Name']) {
      continue; // Skip blank rows
    }

    const surName = String(row['SurName'] || row['Surname'] || '').trim();
    const stName = String(row['StudentName'] || row['Name'] || '').trim();
    const fName = String(row['FatherName'] || row['Father'] || '').trim();
    const mName = String(row['MotherName'] || row['Mother'] || '').trim();

    let ctsFullName = [surName, stName, fName].filter(Boolean).join(' ');
    if (!ctsFullName) ctsFullName = stName || 'વિદ્યાર્થી';

    const rawStd = row['StudyingClass'] || row['Class'] || row['Standard'] || '9';
    const rawSec = row['Section'] || row['Sec'] || 'A';
    const rawDoa = row['DOA'] || row['Admission Date'];
    const rawDob = row['DOB'] || row['Date of Birth'];
    const rawGender = row['GENDER'] || row['Gender'];
    const rawCaste = row['SOCIALCAT'] || row['SocialCat'] || row['Caste'];
    const rawMedium = row['Medium1'] || row['Medium'] || 'Gujarati';
    const rawCtsAddress = String(row['Address'] || row['address'] || row['સરનામું'] || row['મુકામ'] || row['Village'] || '').trim();
    const rawCtsBirthPlace = String(row['PlaceOfBirth'] || row['BirthPlace'] || row['જન્મ સ્થળ'] || row['જન્મસ્થળ'] || '').trim();
    const rawCtsFatherOcc = String(row['FatherOccupation'] || row['Occupation'] || row['પિતાનો વ્યવસાય'] || '').trim();
    const rawCtsMotherOcc = String(row['MotherOccupation'] || row['માતાનો વ્યવસાય'] || '').trim();
    const rawCtsAadhaar = String(row['AadhaarNo'] || row['AadharNo'] || row['Aadhaar'] || row['Aadhar'] || row['આધાર નંબર'] || '').trim();

    ctsList.push({
      diseCode,
      grNumber,
      name: ctsFullName,
      standard: String(rawStd),
      section: String(rawSec),
      doa: normalizeDate(rawDoa),
      dob: normalizeDate(rawDob),
      gender: rawGender,
      caste: rawCaste,
      medium: rawMedium,
      fatherName: fName,
      motherName: mName,
      address: rawCtsAddress || undefined,
      placeOfBirth: rawCtsBirthPlace || undefined,
      fatherOccupation: rawCtsFatherOcc || undefined,
      motherOccupation: rawCtsMotherOcc || undefined,
      aadhaarNo: rawCtsAadhaar || undefined,
    });
  }

  // 3. Existing Students Cache
  const existingByGr = new Map<string, Student>();
  const existingByNameStd = new Map<string, Student>();
  const existingByDise = new Map<string, Student>();
  for (const s of existingStudents) {
    if (s.grNumber && s.grNumber.trim()) {
      existingByGr.set(s.grNumber.trim().toLowerCase(), s);
    }
    const key = `${s.studentName.trim().toLowerCase()}_${String(s.standard).trim()}`;
    existingByNameStd.set(key, s);

    if (s.diseCode && s.diseCode.trim() && s.diseCode.trim() !== schoolDiseCode?.trim()) {
      existingByDise.set(s.diseCode.trim().toLowerCase(), s);
    }
    if (s.studentStateCode && s.studentStateCode.trim()) {
      existingByDise.set(s.studentStateCode.trim().toLowerCase(), s);
    }
    if (s.aadhaarNo && s.aadhaarNo.trim()) {
      existingByDise.set(s.aadhaarNo.trim().toLowerCase(), s);
    }
  }

  // 4. Perform the Merge
  const allRows: MergedStudentRow[] = [];
  const validRows: MergedStudentRow[] = [];
  const invalidRows: MergedStudentRow[] = [];
  const duplicateInFileRows: MergedStudentRow[] = [];
  const existingUpdateRows: MergedStudentRow[] = [];

  const seenInFileGr = new Set<string>();
  const seenInFileNameStd = new Set<string>();
  const matchedUdiseCodes = new Set<string>();

  let rowCounter = 1;
  let matchedCount = 0;
  let ctsOnlyCount = 0;

  for (const cts of ctsList) {
    const diseKey = cts.diseCode;
    const udise = diseKey ? udiseMap.get(diseKey) : undefined;

    let matchSource: 'both' | 'cts_only' = 'cts_only';
    if (udise) {
      matchSource = 'both';
      matchedCount++;
      if (diseKey) matchedUdiseCodes.add(diseKey);
    } else {
      ctsOnlyCount++;
    }

    // Name priority: Udice+ student name as explicitly required
    const studentName = udise && udise.name ? udise.name.trim() : cts.name.trim();
    // GR No from CTS
    const grNumber = cts.grNumber || undefined;

    const stdVal = udise ? udise.standard : cts.standard;
    const normalizedStd = normalizeStandard(stdVal) || normalizeStandard(cts.standard) || '9';
    
    // Ensure section is never a date
    let section = (udise && udise.section && !isDateLikeString(udise.section) ? udise.section : cts.section) || 'A';
    if (isDateLikeString(section)) {
      section = 'A';
    }

    // CRITICAL: Ensure rollNumber is NEVER a blood group
    let rollNumber = udise && udise.rollNumber ? udise.rollNumber : '';
    let bloodGroup = udise && udise.bloodGroup ? cleanAndNormalizeBloodGroup(udise.bloodGroup) : undefined;

    if (rollNumber && cleanAndNormalizeBloodGroup(rollNumber)) {
      if (!bloodGroup) {
        bloodGroup = cleanAndNormalizeBloodGroup(rollNumber);
      }
      rollNumber = ''; // Wipe blood group from rollNumber!
    }

    const dob = (udise && udise.dob ? udise.dob : cts.dob) || undefined;
    const doa = (udise && udise.doa ? udise.doa : cts.doa) || undefined;
    const gender = normalizeGender(udise ? udise.gender : cts.gender) || 'Boy';
    const caste = (udise && udise.caste ? udise.caste : cts.caste) || 'General';
    const contactNumber = udise && udise.mobile ? udise.mobile : undefined;
    const medium = (udise && udise.medium ? udise.medium : cts.medium) || 'Gujarati';
    const cwsnDisability = udise && udise.isCwsn ? udise.cwsnDisability : undefined;
    const aadhaarNo = udise && udise.aadhaarNo ? udise.aadhaarNo : undefined;
    const fatherName = (udise && udise.fatherName ? udise.fatherName : cts.fatherName) || undefined;
    const motherName = (udise && udise.motherName ? udise.motherName : cts.motherName) || undefined;
    const address = (udise && udise.address ? udise.address : cts.address) || undefined;
    const placeOfBirth = (udise && udise.placeOfBirth ? udise.placeOfBirth : cts.placeOfBirth) || undefined;
    const fatherOccupation = (udise && udise.fatherOccupation ? udise.fatherOccupation : cts.fatherOccupation) || undefined;
    const motherOccupation = (udise && udise.motherOccupation ? udise.motherOccupation : cts.motherOccupation) || undefined;

    let isValid = true;
    let isDuplicateInFile = false;
    let isExistingUpdate = false;
    let existingStudentId: string | undefined = undefined;
    let matchedStudent: Student | undefined = undefined;
    let studentChanges: StudentFieldChange[] | undefined = undefined;
    let errorReason = '';

    if (!studentName) {
      isValid = false;
      errorReason = 'વિદ્યાર્થીનું નામ મળ્યું નથી (Student Name missing)';
    } else if (!normalizedStd) {
      isValid = false;
      errorReason = `અમાન્ય ધોરણ (Standard must be 9, 10, 11, or 12)`;
    } else {
      // Check duplicate within file
      if (grNumber && seenInFileGr.has(grNumber.toLowerCase())) {
        isDuplicateInFile = true;
        isValid = false;
        errorReason = `આ G.R. નંબર (${grNumber}) ફાઇલમાં એકથી વધુ વખત આવે છે (Duplicate GR No.)`;
      } else if (seenInFileNameStd.has(`${studentName.toLowerCase()}_${normalizedStd}`)) {
        isDuplicateInFile = true;
        isValid = false;
        errorReason = `આ વિદ્યાર્થી (${studentName} - ધો. ${normalizedStd}) ફાઇલમાં ડુપ્લિકેટ છે`;
      } else {
        if (grNumber) seenInFileGr.add(grNumber.toLowerCase());
        seenInFileNameStd.add(`${studentName.toLowerCase()}_${normalizedStd}`);

        // Check existing in school database
        if (grNumber && existingByGr.has(grNumber.toLowerCase())) {
          matchedStudent = existingByGr.get(grNumber.toLowerCase());
        } else if (diseKey && existingByDise.has(diseKey.toLowerCase())) {
          matchedStudent = existingByDise.get(diseKey.toLowerCase());
        } else {
          const key = `${studentName.toLowerCase()}_${normalizedStd}`;
          if (existingByNameStd.has(key)) {
            matchedStudent = existingByNameStd.get(key);
          }
        }

        if (matchedStudent) {
          isExistingUpdate = true;
          existingStudentId = matchedStudent.id;
          studentChanges = computeStudentFieldChanges(matchedStudent, {
            name: studentName,
            standard: normalizedStd,
            diseCode: (diseKey && diseKey !== schoolDiseCode) ? diseKey : undefined,
            studentStateCode: diseKey,
            grNumber,
            section,
            rollNumber,
            dob,
            doa,
            gender,
            caste,
            bloodGroup,
            contactNumber,
            fatherName,
            motherName,
            address,
            placeOfBirth,
            fatherOccupation,
            motherOccupation,
            aadhaarNo,
          });
        }
      }
    }

    const mergedRow: MergedStudentRow = {
      rowNumber: rowCounter++,
      name: studentName,
      standard: normalizedStd,
      diseCode: (diseKey && diseKey !== schoolDiseCode) ? diseKey : undefined,
      studentStateCode: diseKey,
      grNumber,
      section,
      rollNumber,
      dob,
      doa,
      gender,
      caste,
      bloodGroup,
      contactNumber,
      medium,
      aadhaarNo,
      address,
      placeOfBirth,
      fatherOccupation,
      motherOccupation,
      cwsnDisability,
      fatherName,
      motherName,
      matchSource,
      isValid,
      isDuplicateInFile,
      isExistingUpdate,
      existingStudentId,
      existingStudentName: matchedStudent?.studentName,
      existingGrNumber: matchedStudent?.grNumber,
      existingStandard: matchedStudent?.standard,
      changes: studentChanges,
      errorReason: errorReason || undefined,
    };

    allRows.push(mergedRow);

    if (!isValid) {
      if (isDuplicateInFile) {
        duplicateInFileRows.push(mergedRow);
      } else {
        invalidRows.push(mergedRow);
      }
    } else {
      validRows.push(mergedRow);
      if (isExistingUpdate) {
        existingUpdateRows.push(mergedRow);
      }
    }
  }

  // Count UDISE only records
  let udiseOnlyCount = 0;
  for (const u of allUdiseRecords) {
    if (u.diseCode && !matchedUdiseCodes.has(u.diseCode)) {
      udiseOnlyCount++;
    }
  }

  return {
    totalCtsRows: ctsList.length,
    totalUdiseRows: allUdiseRecords.length,
    matchedCount,
    ctsOnlyCount,
    udiseOnlyCount,
    validRows,
    invalidRows,
    duplicateInFileRows,
    existingUpdateRows,
    allRows,
  };
}
