import React, { useState, useEffect, useMemo, useRef } from 'react';
import { School, Student, Staff } from '../types';
import {
  ExamTermType,
  EXAM_TERM_OPTIONS,
  ExamBlock,
  TimetableEntry,
  SupervisionScheduleRow,
  AnswerSheetEvaluationRow,
  ExamFileSettings,
  BlockClassSection,
  BlockStudentItem,
} from '../types/examFile';
import {
  downloadBlockAttendancePdf,
  downloadAllBlocksCombinedPdf,
  downloadSupervisionSheetPdf,
  downloadAnswerSheetEvaluationPdf,
  printBlockAttendanceSheet,
  printAllBlocksCombined,
  printSupervisionSheet,
  printAnswerSheetEvaluation,
} from '../utils/examFilePdfUtils';
import {
  FileSpreadsheet,
  Calendar,
  Users,
  CheckCircle2,
  Download,
  Printer,
  Sparkles,
  Upload,
  Plus,
  Trash2,
  Edit2,
  Eye,
  RefreshCw,
  Layers,
  ArrowRight,
  School as SchoolIcon,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  FileText,
  UserCheck,
  Settings,
  X,
  FileCheck,
} from 'lucide-react';

interface ExamFileTabProps {
  school: School;
  students: Student[];
  staff: Staff[];
  onBack?: () => void;
}

export const ExamFileTab: React.FC<ExamFileTabProps> = ({
  school,
  students,
  staff,
  onBack,
}) => {
  // Master Settings State
  const [selectedExamType, setSelectedExamType] = useState<ExamTermType>('first');
  const [examTitle, setExamTitle] = useState('પ્રથમ સત્રાંત પરીક્ષા');
  const [monthYear, setMonthYear] = useState('ઓક્ટોબર- 2026');
  const [pageSize, setPageSize] = useState<'a4' | 'legal'>('a4');
  const [activeSubTab, setActiveSubTab] = useState<'blocks' | 'supervision' | 'evaluation' | 'ai_timetable'>('blocks');

  // Blocks State
  const [blocks, setBlocks] = useState<ExamBlock[]>([]);
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);

  // Supervision rows state
  const [supervisionRows, setSupervisionRows] = useState<SupervisionScheduleRow[]>([]);

  // Answer Sheet Evaluation state
  const [selectedEvalStd, setSelectedEvalStd] = useState<string>('9');
  const [evaluationRows, setEvaluationRows] = useState<AnswerSheetEvaluationRow[]>([]);

  // Timetable state
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);

  // UI status / loading states
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [processStatusMessage, setProcessStatusMessage] = useState<string | null>(null);
  const [previewBlock, setPreviewBlock] = useState<ExamBlock | null>(null);

  // Auto-Block Wizard Modal State
  const [showAutoBlockModal, setShowAutoBlockModal] = useState(false);
  const [wizardCapacity, setWizardCapacity] = useState(27);
  const [wizardSelectedStds, setWizardSelectedStds] = useState<string[]>(['9', '10']);
  const [wizardMode, setWizardMode] = useState<'mixed' | 'sequential'>('mixed');

  // AI Timetable Upload State
  const [aiUploading, setAiUploading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);
  const [timetableText, setTimetableText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Storage Key for School Persistence
  const storageKey = `vidyalayam_exam_file_${school.id || 'default'}`;

  // Load saved state or initialize with sensible defaults
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: ExamFileSettings = JSON.parse(saved);
        if (parsed.examType) setSelectedExamType(parsed.examType);
        if (parsed.examTitle) setExamTitle(parsed.examTitle);
        if (parsed.monthYear) setMonthYear(parsed.monthYear);
        if (parsed.pageSize) setPageSize(parsed.pageSize);
        if (Array.isArray(parsed.blocks) && parsed.blocks.length > 0) {
          setBlocks(parsed.blocks);
        }
        if (Array.isArray(parsed.timetable) && parsed.timetable.length > 0) {
          setTimetable(parsed.timetable);
        }
        if (Array.isArray(parsed.supervisionList) && parsed.supervisionList.length > 0) {
          setSupervisionRows(parsed.supervisionList);
        }
        if (Array.isArray(parsed.answerSheetList) && parsed.answerSheetList.length > 0) {
          setEvaluationRows(parsed.answerSheetList);
        }
        return;
      }
    } catch (e) {
      console.warn('Could not load saved exam file state:', e);
    }

    // Default initialization if no saved state
    generateDefaultBlocks();
    generateDefaultSupervision();
    generateDefaultEvaluation();
  }, [school.id]);

  // Auto save on changes
  useEffect(() => {
    try {
      const stateToSave: ExamFileSettings = {
        examType: selectedExamType,
        examTitle,
        monthYear,
        pageSize,
        blocks,
        timetable,
        supervisionList: supervisionRows,
        answerSheetList: evaluationRows,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(storageKey, JSON.stringify(stateToSave));
    } catch (e) {
      console.warn('Could not save exam file state:', e);
    }
  }, [selectedExamType, examTitle, monthYear, pageSize, blocks, timetable, supervisionRows, evaluationRows]);

  // Group students by standard for quick allocation
  const studentsByStandard = useMemo(() => {
    const map: Record<string, Student[]> = {
      '9': [],
      '10': [],
      '11': [],
      '12': [],
    };
    students.forEach((st) => {
      const std = String(st.standard || '9').trim();
      if (!map[std]) map[std] = [];
      map[std].push(st);
    });

    // Sort each standard by rollNumber or name
    Object.keys(map).forEach((std) => {
      map[std].sort((a, b) => {
        const rA = parseInt(a.rollNumber || '0', 10);
        const rB = parseInt(b.rollNumber || '0', 10);
        if (rA && rB && !isNaN(rA) && !isNaN(rB)) return rA - rB;
        return (a.studentName || '').localeCompare(b.studentName || '');
      });
    });
    return map;
  }, [students]);

  // Handle Exam Term switch
  const handleSelectExamTerm = (term: ExamTermType) => {
    setSelectedExamType(term);
    const opt = EXAM_TERM_OPTIONS.find((o) => o.id === term);
    if (opt) {
      setExamTitle(opt.defaultTitle);
      setMonthYear(opt.defaultMonth);
    }
  };

  // Generate Default Blocks based on available students
  const generateDefaultBlocks = () => {
    const std9 = studentsByStandard['9'] || [];
    const std10 = studentsByStandard['10'] || [];
    const std11 = studentsByStandard['11'] || [];

    const newBlocks: ExamBlock[] = [];

    // Block 1: Similar to reference aa_d40028df.pdf (Std 11: 14 + Std 9: 13 = 27)
    const b1Sec1Students = (std11.length > 0 ? std11.slice(0, 14) : Array.from({ length: 14 }, (_, i) => ({
      id: `mock_11_${i + 1}`,
      studentName: `STUDENT ${i + 1} (ધોરણ ૧૧)`,
      rollNumber: String(i + 1),
      standard: '11',
    }))).map((s, idx) => ({
      id: s.id,
      studentName: s.studentName,
      rollNumber: s.rollNumber || String(idx + 1),
      standard: '11',
    }));

    const b1Sec2Students = (std9.length > 0 ? std9.slice(0, 13) : Array.from({ length: 13 }, (_, i) => ({
      id: `mock_9_${i + 1}`,
      studentName: `STUDENT ${i + 1} (ધોરણ ૯)`,
      rollNumber: String(i + 1),
      standard: '9',
    }))).map((s, idx) => ({
      id: s.id,
      studentName: s.studentName,
      rollNumber: s.rollNumber || String(idx + 1),
      standard: '9',
    }));

    newBlocks.push({
      id: 'block_01',
      blockNumber: 1,
      blockName: 'બ્લોક નં. 01',
      roomName: 'રૂમ નં. 01',
      sections: [
        { standard: '11', students: b1Sec1Students },
        { standard: '9', students: b1Sec2Students },
      ],
      totalAllotted: b1Sec1Students.length + b1Sec2Students.length,
    });

    // Block 2: Similar to reference bbb_44ec720b.pdf (Std 9: 9 + Std 10: 18 = 27)
    const b2Sec1Students = (std9.length > 13 ? std9.slice(13, 22) : Array.from({ length: 9 }, (_, i) => ({
      id: `mock_9_${i + 14}`,
      studentName: `STUDENT ${i + 14} (ધોરણ ૯)`,
      rollNumber: String(i + 14),
      standard: '9',
    }))).map((s, idx) => ({
      id: s.id,
      studentName: s.studentName,
      rollNumber: s.rollNumber || String(idx + 14),
      standard: '9',
    }));

    const b2Sec2Students = (std10.length > 0 ? std10.slice(0, 18) : Array.from({ length: 18 }, (_, i) => ({
      id: `mock_10_${i + 1}`,
      studentName: `STUDENT ${i + 1} (ધોરણ ૧૦)`,
      rollNumber: String(i + 1),
      standard: '10',
    }))).map((s, idx) => ({
      id: s.id,
      studentName: s.studentName,
      rollNumber: s.rollNumber || String(idx + 1),
      standard: '10',
    }));

    newBlocks.push({
      id: 'block_02',
      blockNumber: 2,
      blockName: 'બ્લોક નં. 02',
      roomName: 'રૂમ નં. 02',
      sections: [
        { standard: '9', students: b2Sec1Students },
        { standard: '10', students: b2Sec2Students },
      ],
      totalAllotted: b2Sec1Students.length + b2Sec2Students.length,
    });

    setBlocks(newBlocks);
    setExpandedBlockId('block_01');
  };

  // Generate Default Supervision Rows matching reference khand_nirikshan_4a41fc75.pdf
  const generateDefaultSupervision = () => {
    const dates = [
      '06-04-2026',
      '07-04-2026',
      '08-04-2026',
      '09-04-2026',
      '10-04-2026',
      '11-04-2026',
      '13-04-2026',
      '15-04-2026',
      '16-04-2026',
      '17-04-2026',
    ];

    const rows: SupervisionScheduleRow[] = dates.map((d, idx) => ({
      id: `sup_${idx + 1}`,
      date: d,
      blockNumber: 1,
      allottedCount: 27,
      presentCount: '',
      absentCount: '',
      supervisorName: staff[idx % staff.length]?.fullName || '',
    }));

    setSupervisionRows(rows);
  };

  // Generate Default Answer Sheet Evaluation Rows matching reference uttarvahi_parikshan_71be2072.pdf
  const generateDefaultEvaluation = () => {
    const sampleSubjects = [
      { date: '06-04-2026', subject: 'ચિત્રકલા' },
      { date: '07-04-2026', subject: 'કોમ્પ્યુટર' },
      { date: '08-04-2026', subject: 'શા. શિ.' },
      { date: '09-04-2026', subject: 'વિજ્ઞાન' },
      { date: '10-04-2026', subject: 'ગુજરાતી' },
      { date: '11-04-2026', subject: 'હિન્દી' },
      { date: '13-04-2026', subject: 'ગણિત' },
      { date: '15-04-2026', subject: 'સા. વિ.' },
      { date: '16-04-2026', subject: 'અંગ્રેજી' },
      { date: '17-04-2026', subject: 'સંસ્કૃત' },
    ];

    const std9Count = studentsByStandard['9']?.length || 27;

    const rows: AnswerSheetEvaluationRow[] = sampleSubjects.map((s, idx) => ({
      id: `eval_${idx + 1}`,
      date: s.date,
      standard: '9',
      subject: s.subject,
      sheetCount: std9Count,
      receivedDate: s.date,
      returnedDate: '',
      examinerName: staff[idx % staff.length]?.fullName || '',
    }));

    setEvaluationRows(rows);
  };

  // Execute Auto-Block Distribution Wizard
  const handleExecuteAutoBlockGeneration = () => {
    const selectedStdList = [...wizardSelectedStds].sort();
    if (selectedStdList.length === 0) {
      alert('કૃપા કરીને ઓછામાં ઓછું એક ધોરણ પસંદ કરો.');
      return;
    }

    const capacity = wizardCapacity > 0 ? wizardCapacity : 27;
    const generated: ExamBlock[] = [];
    let blockCounter = 1;

    if (wizardMode === 'mixed' && selectedStdList.length >= 2) {
      // Mixed zigzag allocation: combine pairs of standards (e.g. 9 & 11, 10 & 12)
      // Each block gets capacity / 2 from standard A and capacity / 2 from standard B
      const halfCapA = Math.ceil(capacity / 2);
      const halfCapB = Math.floor(capacity / 2);

      const poolA = [...(studentsByStandard[selectedStdList[0]] || [])];
      const poolB = [...(studentsByStandard[selectedStdList[1]] || [])];

      let idxA = 0;
      let idxB = 0;

      while (idxA < poolA.length || idxB < poolB.length) {
        const sliceA = poolA.slice(idxA, idxA + halfCapA);
        const sliceB = poolB.slice(idxB, idxB + halfCapB);

        const sections: BlockClassSection[] = [];
        if (sliceA.length > 0) {
          sections.push({
            standard: selectedStdList[0],
            students: sliceA.map((st, i) => ({
              id: st.id,
              studentName: st.studentName,
              rollNumber: st.rollNumber || String(idxA + i + 1),
              standard: selectedStdList[0],
            })),
          });
        }
        if (sliceB.length > 0) {
          sections.push({
            standard: selectedStdList[1],
            students: sliceB.map((st, i) => ({
              id: st.id,
              studentName: st.studentName,
              rollNumber: st.rollNumber || String(idxB + i + 1),
              standard: selectedStdList[1],
            })),
          });
        }

        const totalAllotted = sections.reduce((acc, s) => acc + s.students.length, 0);

        generated.push({
          id: `block_${String(blockCounter).padStart(2, '0')}`,
          blockNumber: blockCounter,
          blockName: `બ્લોક નં. ${String(blockCounter).padStart(2, '0')}`,
          roomName: `રૂમ નં. ${blockCounter}`,
          sections,
          totalAllotted,
        });

        idxA += halfCapA;
        idxB += halfCapB;
        blockCounter++;
      }
    } else {
      // Sequential allocation class-by-class
      selectedStdList.forEach((std) => {
        const pool = [...(studentsByStandard[std] || [])];
        let idx = 0;
        while (idx < pool.length) {
          const slice = pool.slice(idx, idx + capacity);
          const sections: BlockClassSection[] = [
            {
              standard: std,
              students: slice.map((st, i) => ({
                id: st.id,
                studentName: st.studentName,
                rollNumber: st.rollNumber || String(idx + i + 1),
                standard: std,
              })),
            },
          ];

          generated.push({
            id: `block_${String(blockCounter).padStart(2, '0')}`,
            blockNumber: blockCounter,
            blockName: `બ્લોક નં. ${String(blockCounter).padStart(2, '0')}`,
            roomName: `રૂમ નં. ${blockCounter}`,
            sections,
            totalAllotted: slice.length,
          });

          idx += capacity;
          blockCounter++;
        }
      });
    }

    if (generated.length === 0) {
      alert('પસંદ કરેલા ધોરણોમાં વિદ્યાર્થીઓની સંખ્યા ઉપલબ્ધ નથી.');
      return;
    }

    setBlocks(generated);
    setExpandedBlockId(generated[0]?.id || null);
    setShowAutoBlockModal(false);
  };

  // Add Manual Empty Block
  const handleAddManualBlock = () => {
    const nextNum = blocks.length + 1;
    const newBlock: ExamBlock = {
      id: `block_${String(nextNum).padStart(2, '0')}_${Date.now()}`,
      blockNumber: nextNum,
      blockName: `બ્લોક નં. ${String(nextNum).padStart(2, '0')}`,
      roomName: `રૂમ નં. ${nextNum}`,
      sections: [
        {
          standard: '9',
          students: [],
        },
      ],
      totalAllotted: 0,
    };
    setBlocks([...blocks, newBlock]);
    setExpandedBlockId(newBlock.id);
  };

  // Remove a Block
  const handleRemoveBlock = (blockId: string) => {
    if (confirm('શું આપ આ બ્લોક કાઢી નાખવા માંગો છો?')) {
      const filtered = blocks.filter((b) => b.id !== blockId);
      // Re-number blocks
      const renumbered = filtered.map((b, idx) => ({
        ...b,
        blockNumber: idx + 1,
        blockName: `બ્લોક નં. ${String(idx + 1).padStart(2, '0')}`,
      }));
      setBlocks(renumbered);
    }
  };

  // AI Timetable Extraction via /api/ai/extract-timetable
  const handleUploadTimetableFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAiUploading(true);
    setAiError(null);
    setAiSuccessMessage(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const mime = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

          const res = await fetch('/api/ai/extract-timetable', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileBase64: base64Data,
              mimeType: mime,
            }),
          });

          const json = await res.json();
          if (!res.ok || !json.success) {
            throw new Error(json.error || 'ટાઈમટેબલ સ્કેન કરવામાં નિષ્ફળતા.');
          }

          const data = json.data;
          if (data.examType) {
            setSelectedExamType(data.examType);
          }
          if (data.examTitle) {
            setExamTitle(data.examTitle);
          }
          if (data.monthYear) {
            setMonthYear(data.monthYear);
          }

          if (Array.isArray(data.entries) && data.entries.length > 0) {
            const formattedEntries: TimetableEntry[] = data.entries.map((item: any, i: number) => ({
              id: `tt_${i + 1}`,
              date: item.date || '',
              day: item.day || '',
              standard: String(item.standard || '9'),
              subject: item.subject || '',
              time: item.time || '',
            }));
            setTimetable(formattedEntries);
            setAiSuccessMessage(`સફળતાપૂર્વક ${formattedEntries.length} પરીક્ષા તારીખો & વિષયો સ્કેન થયા!`);
          } else {
            setAiSuccessMessage('ટાઈમટેબલની વિગતો મળી પરંતુ વિષયનું લિસ્ટ ખાલી છે.');
          }
        } catch (err: any) {
          setAiError(err.message || 'ટાઈમટેબલ સ્કેન કરવામાં ક્ષતિ આવી.');
        } finally {
          setAiUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setAiError(err.message || 'ફાઇલ વાંચવામાં નિષ્ફળતા.');
      setAiUploading(false);
    }
  };

  // Extract from pasted text
  const handleExtractFromText = async () => {
    if (!timetableText.trim()) {
      alert('કૃપા કરીને ટાઈમટેબલનું લખાણ દાખલ કરો.');
      return;
    }

    setAiUploading(true);
    setAiError(null);
    setAiSuccessMessage(null);

    try {
      const res = await fetch('/api/ai/extract-timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: timetableText,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'ટાઈમટેબલ સ્કેન કરવામાં નિષ્ફળતા.');
      }

      const data = json.data;
      if (data.examType) setSelectedExamType(data.examType);
      if (data.examTitle) setExamTitle(data.examTitle);
      if (data.monthYear) setMonthYear(data.monthYear);

      if (Array.isArray(data.entries) && data.entries.length > 0) {
        const formattedEntries: TimetableEntry[] = data.entries.map((item: any, i: number) => ({
          id: `tt_${i + 1}`,
          date: item.date || '',
          day: item.day || '',
          standard: String(item.standard || '9'),
          subject: item.subject || '',
          time: item.time || '',
        }));
        setTimetable(formattedEntries);
        setAiSuccessMessage(`સફળતાપૂર્વક ${formattedEntries.length} પરીક્ષા તારીખો & વિષયો સ્કેન થયા!`);
      }
    } catch (err: any) {
      setAiError(err.message || 'ટાઈમટેબલ સ્કેન કરવામાં ક્ષતિ આવી.');
    } finally {
      setAiUploading(false);
    }
  };

  // Synchronize Timetable into Supervision & Evaluation Lists
  const handleApplyTimetableToAllLists = () => {
    if (timetable.length === 0) {
      alert('સમયપત્રકમાં કોઈ એન્ટ્રી નથી.');
      return;
    }

    // 1. Get unique dates
    const uniqueDates = Array.from(new Set(timetable.map((t) => t.date).filter(Boolean)));

    // Generate supervision rows for each unique date × blocks
    const newSupRows: SupervisionScheduleRow[] = [];
    let sIdx = 1;

    uniqueDates.forEach((d) => {
      if (blocks.length > 0) {
        blocks.forEach((b) => {
          newSupRows.push({
            id: `sup_${sIdx}`,
            date: d,
            blockNumber: b.blockNumber,
            allottedCount: b.totalAllotted,
            presentCount: '',
            absentCount: '',
            supervisorName: staff[(sIdx - 1) % staff.length]?.fullName || '',
          });
          sIdx++;
        });
      } else {
        newSupRows.push({
          id: `sup_${sIdx}`,
          date: d,
          blockNumber: 1,
          allottedCount: 27,
          presentCount: '',
          absentCount: '',
          supervisorName: staff[(sIdx - 1) % staff.length]?.fullName || '',
        });
        sIdx++;
      }
    });

    setSupervisionRows(newSupRows);

    // 2. Generate Evaluation rows for selected standard
    const stdEntries = timetable.filter((t) => t.standard === selectedEvalStd || !t.standard);
    const targetEntries = stdEntries.length > 0 ? stdEntries : timetable;

    const stdStudentCount = studentsByStandard[selectedEvalStd]?.length || 27;

    const newEvalRows: AnswerSheetEvaluationRow[] = targetEntries.map((t, idx) => ({
      id: `eval_${idx + 1}`,
      date: t.date,
      standard: selectedEvalStd,
      subject: t.subject,
      sheetCount: stdStudentCount,
      receivedDate: t.date,
      returnedDate: '',
      examinerName: staff[idx % staff.length]?.fullName || '',
    }));

    setEvaluationRows(newEvalRows);

    alert('સમયપત્રકની તારીખો અને વિષયો ખંડ નિરીક્ષણ અને ઉત્તરવહી પત્રકમાં સફળતાપૂર્વક લાગુ થઈ ગયા છે!');
  };

  // PDF Handlers
  const handleDownloadSingleBlock = async (block: ExamBlock) => {
    setIsProcessingPdf(true);
    setProcessStatusMessage(`બ્લોક ${block.blockNumber} નું PDF ડાઉનલોડ થઈ રહ્યું છે...`);
    try {
      await downloadBlockAttendancePdf(school, block, examTitle, monthYear, pageSize);
    } catch (e) {
      console.error(e);
      alert('PDF બનાવવામાં ક્ષતિ આવી.');
    } finally {
      setIsProcessingPdf(false);
      setProcessStatusMessage(null);
    }
  };

  const handleDownloadAllBlocksCombined = async () => {
    if (blocks.length === 0) {
      alert('ડાઉનલોડ કરવા માટે કોઈ બ્લોક નથી.');
      return;
    }
    setIsProcessingPdf(true);
    setProcessStatusMessage(`તમામ ${blocks.length} બ્લોકની કમ્બાઈન્ડ PDF તૈયાર થઈ રહી છે...`);
    try {
      await downloadAllBlocksCombinedPdf(school, blocks, examTitle, monthYear, pageSize);
    } catch (e) {
      console.error(e);
      alert('કમ્બાઈન્ડ PDF બનાવવામાં ક્ષતિ આવી.');
    } finally {
      setIsProcessingPdf(false);
      setProcessStatusMessage(null);
    }
  };

  const handleDownloadSupervision = async () => {
    setIsProcessingPdf(true);
    setProcessStatusMessage('ખંડ નિરીક્ષણ કાર્ય પત્રક PDF ડાઉનલોડ થઈ રહ્યું છે...');
    try {
      await downloadSupervisionSheetPdf(school, supervisionRows, examTitle, monthYear, pageSize);
    } catch (e) {
      console.error(e);
      alert('PDF બનાવવામાં ક્ષતિ આવી.');
    } finally {
      setIsProcessingPdf(false);
      setProcessStatusMessage(null);
    }
  };

  const handleDownloadEvaluation = async () => {
    setIsProcessingPdf(true);
    setProcessStatusMessage(`ધોરણ ${selectedEvalStd} ઉત્તરવહી પરીક્ષણ પત્રક PDF ડાઉનલોડ થઈ રહ્યું છે...`);
    try {
      await downloadAnswerSheetEvaluationPdf(
        school,
        evaluationRows,
        selectedEvalStd,
        examTitle,
        monthYear,
        pageSize
      );
    } catch (e) {
      console.error(e);
      alert('PDF બનાવવામાં ક્ષતિ આવી.');
    } finally {
      setIsProcessingPdf(false);
      setProcessStatusMessage(null);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="glass-card rounded-3xl p-5 sm:p-6 border border-[#E2E8F0] dark:border-white/10 shadow-sm relative overflow-hidden bg-gradient-to-br from-white/95 via-[#F8FAFC]/90 to-indigo-50/40 dark:from-[#121921]/95 dark:via-[#16202c]/90 dark:to-indigo-950/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  પરીક્ષા ફાઇલ (Exam File & Blocks)
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40">
                  Gujarat Standard
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {school.schoolName || 'શ્રી શાળા'} • ખંડ નિરીક્ષણ, બ્લોક વિદ્યાર્થી યાદી & ઉત્તરવહી ચકાસણી પત્રકો
              </p>
            </div>
          </div>

          {/* Quick Page Size Switcher (A4 vs Legal) */}
          <div className="flex items-center gap-2 self-start md:self-auto bg-white/90 dark:bg-slate-800/90 p-1.5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xs">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 px-2">
              પેજ સાઇઝ:
            </span>
            <button
              type="button"
              onClick={() => setPageSize('a4')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                pageSize === 'a4'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              A4 સાઇઝ
            </button>
            <button
              type="button"
              onClick={() => setPageSize('legal')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                pageSize === 'legal'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Legal સાઇઝ
            </button>
          </div>
        </div>

        {/* 3 Core Exam Selection Buttons & Month-Year Configuration */}
        <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mr-1">
              પરીક્ષા પસંદ કરો:
            </span>
            {EXAM_TERM_OPTIONS.map((opt) => {
              const isSelected = selectedExamType === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectExamTerm(opt.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                      : 'bg-white/80 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:border-indigo-400'
                  }`}
                >
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 bg-white/90 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">હેડિંગ:</span>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                className="bg-transparent font-bold text-slate-800 dark:text-white focus:outline-none text-xs w-36 sm:w-44"
                placeholder="પરીક્ષાનું નામ..."
              />
            </div>
            <div className="flex items-center gap-1.5 bg-white/90 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">માસ-વર્ષ:</span>
              <input
                type="text"
                value={monthYear}
                onChange={(e) => setMonthYear(e.target.value)}
                className="bg-transparent font-bold text-slate-800 dark:text-white focus:outline-none text-xs w-28 sm:w-32"
                placeholder="ઓક્ટોબર- 2026..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200 dark:border-white/10">
        <button
          type="button"
          onClick={() => setActiveSubTab('blocks')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === 'blocks'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>૧. બ્લોક બેઠક વ્યવસ્થા & વિદ્યાર્થી યાદી ({blocks.length} બ્લોક)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('supervision')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === 'supervision'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>૨. ખંડ નિરીક્ષણ કાર્ય (Supervision)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('evaluation')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === 'evaluation'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>૩. ઉત્તરવહી પરીક્ષણ કાર્ય પત્રક</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('ai_timetable')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === 'ai_timetable'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>૪. AI સમયપત્રક સ્કેનર ({timetable.length} તારીખો)</span>
        </button>
      </div>

      {/* PDF Processing Overlay */}
      {isProcessingPdf && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border border-slate-200 dark:border-white/10 space-y-3">
            <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              PDF તૈયાર થઈ રહ્યું છે...
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {processStatusMessage || 'કૃપા કરીને થોડીવાર રાહ જુઓ...'}
            </p>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 1: BLOCKS SEATING & ATTENDANCE MANAGEMENT
          ========================================================================= */}
      {activeSubTab === 'blocks' && (
        <div className="space-y-5">
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowAutoBlockModal(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold text-xs flex items-center gap-2 shadow-sm shadow-indigo-600/20 hover:opacity-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>ઓટો બ્લોક જનરેશન (Auto Generate)</span>
              </button>
              <button
                type="button"
                onClick={handleAddManualBlock}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-200 dark:border-white/10 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>નવો બ્લોક ઉમેરો</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadAllBlocksCombined}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 cursor-pointer"
                title="તમામ બ્લોકની એક કમ્બાઈન્ડ Multi-Page PDF ડાઉનલોડ કરો"
              >
                <Download className="w-4 h-4" />
                <span>તમામ બ્લોક Combined PDF</span>
              </button>
              <button
                type="button"
                onClick={() => printAllBlocksCombined(school, blocks, examTitle, monthYear, pageSize)}
                className="px-3 py-2 rounded-xl bg-slate-800 text-white dark:bg-white/10 font-bold text-xs flex items-center gap-1.5 hover:bg-slate-900 cursor-pointer"
                title="તમામ બ્લોક ડાયરેક્ટ પ્રિન્ટ કરો"
              >
                <Printer className="w-4 h-4" />
                <span>પ્રિન્ટ</span>
              </button>
            </div>
          </div>

          {/* Blocks List */}
          {blocks.length === 0 ? (
            <div className="text-center py-12 glass-card rounded-3xl border border-dashed border-slate-300 dark:border-white/15 p-8 space-y-3">
              <Layers className="w-12 h-12 text-slate-400 mx-auto stroke-1" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                હજુ સુધી કોઈ બ્લોક બનાવવામાં આવ્યા નથી
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                ઉપર આપેલ "ઓટો બ્લોક જનરેશન" બટન દબાવો જેથી વિદ્યાર્થીઓની સંખ્યા મુજબ ૧-ક્લિકમાં બ્લોક બની જશે.
              </p>
              <button
                type="button"
                onClick={() => setShowAutoBlockModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>હવે ઓટો બ્લોક બનાવો</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {blocks.map((block) => {
                const isExpanded = expandedBlockId === block.id;
                return (
                  <div
                    key={block.id}
                    className="glass-card rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden bg-white/90 dark:bg-slate-900/90 transition-all shadow-xs"
                  >
                    {/* Block Card Header */}
                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setExpandedBlockId(isExpanded ? null : block.id)}
                          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 cursor-pointer"
                        >
                          {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </button>

                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="text-base font-black text-slate-900 dark:text-white">
                              {block.blockName}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                              કુલ: {block.totalAllotted} વિદ્યાર્થીઓ
                            </span>
                            {block.roomName && (
                              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                                ({block.roomName})
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {block.sections.map((s, idx) => (
                              <span key={idx} className="bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md font-medium">
                                ધોરણ {s.standard}: <strong className="text-slate-800 dark:text-slate-200">{s.students.length}</strong> છાત્રો
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setPreviewBlock(block)}
                          className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 cursor-pointer"
                          title="પ્રિવ્યૂ જુઓ"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadSingleBlock(block)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs hover:bg-indigo-700 cursor-pointer"
                          title={`બ્લોક ${block.blockNumber} નું PDF ડાઉનલોડ કરો`}
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF ({pageSize.toUpperCase()})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => printBlockAttendanceSheet(school, block, examTitle, monthYear, pageSize)}
                          className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 cursor-pointer"
                          title="પ્રિન્ટ કરો"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveBlock(block.id)}
                          className="p-2 rounded-xl hover:bg-red-50 text-red-500 cursor-pointer"
                          title="બ્લોક કાઢી નાખો"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Students Details */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 bg-slate-50/50 dark:bg-black/20 space-y-4">
                        {block.sections.map((sec, sIdx) => (
                          <div key={sIdx} className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                              <span>
                                📌 ધોરણ- {sec.standard} ({sec.students.length} વિદ્યાર્થીઓ)
                              </span>
                              <span className="text-[11px] text-slate-500">
                                રોલ નં: {sec.students[0]?.rollNumber || '-'} થી {sec.students[sec.students.length - 1]?.rollNumber || '-'}
                              </span>
                            </div>

                            <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-slate-900/60 divide-y divide-slate-100 dark:divide-white/5 text-xs">
                              {sec.students.map((st, stIdx) => (
                                <div key={stIdx} className="px-3 py-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5">
                                  <div className="flex items-center gap-2">
                                    <span className="w-6 text-center font-bold text-slate-400">
                                      {st.rollNumber}
                                    </span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">
                                      {st.studentName}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-400">
                                    બેઠક: {st.rollNumber}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 2: BLOCK SUPERVISION SCHEDULE (ખંડ નિરીક્ષણ કાર્ય)
          ========================================================================= */}
      {activeSubTab === 'supervision' && (
        <div className="space-y-5">
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                ખંડ નિરીક્ષણ કાર્ય પત્રક (Block Supervision)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                પરીક્ષા તારીખો, બ્લોક નંબર અને નિરીક્ષક શિક્ષકોની ફાળવણી
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const newRow: SupervisionScheduleRow = {
                    id: `sup_custom_${Date.now()}`,
                    date: '',
                    blockNumber: 1,
                    allottedCount: 27,
                    presentCount: '',
                    absentCount: '',
                    supervisorName: '',
                  };
                  setSupervisionRows([...supervisionRows, newRow]);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-200 dark:border-white/10 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>રો ઉમેરો</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadSupervision}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center gap-2 shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>PDF ડાઉનલોડ ({pageSize.toUpperCase()})</span>
              </button>
              <button
                type="button"
                onClick={() => printSupervisionSheet(school, supervisionRows, examTitle, monthYear, pageSize)}
                className="px-3 py-2 rounded-xl bg-slate-800 text-white dark:bg-white/10 font-bold text-xs flex items-center gap-1.5 hover:bg-slate-900 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>પ્રિન્ટ</span>
              </button>
            </div>
          </div>

          {/* Supervision Editable Table */}
          <div className="glass-card rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden bg-white dark:bg-slate-900/90 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 font-bold text-slate-700 dark:text-slate-300">
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-3 w-32">તારીખ (Date)</th>
                    <th className="py-3 px-3 w-24 text-center">બ્લોક નંબર</th>
                    <th className="py-3 px-3 w-28 text-center">બ્લોકમાં ફાળવેલ</th>
                    <th className="py-3 px-3 w-48">નિરીક્ષકનું નામ (Supervisor)</th>
                    <th className="py-3 px-3 w-16 text-center">કાઢો</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {supervisionRows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                      <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={row.date}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSupervisionRows((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, date: val } : r))
                            );
                          }}
                          className="w-full bg-slate-50 dark:bg-white/5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 font-medium focus:outline-none focus:border-indigo-500"
                          placeholder="DD-MM-YYYY"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          value={row.blockNumber}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 1;
                            setSupervisionRows((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, blockNumber: val } : r))
                            );
                          }}
                          className="w-16 text-center bg-slate-50 dark:bg-white/5 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 font-bold focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          value={row.allottedCount}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setSupervisionRows((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, allottedCount: val } : r))
                            );
                          }}
                          className="w-20 text-center bg-slate-50 dark:bg-white/5 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 font-bold focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="relative">
                          <input
                            type="text"
                            value={row.supervisorName || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSupervisionRows((prev) =>
                                prev.map((r) => (r.id === row.id ? { ...r, supervisorName: val } : r))
                              );
                            }}
                            list={`staff_list_${row.id}`}
                            className="w-full bg-slate-50 dark:bg-white/5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 font-medium focus:outline-none focus:border-indigo-500"
                            placeholder="શિક્ષકનું નામ પસંદ કરો..."
                          />
                          <datalist id={`staff_list_${row.id}`}>
                            {staff.map((s) => (
                              <option key={s.id} value={s.fullName}>
                                {s.designation ? `${s.fullName} (${s.designation})` : s.fullName}
                              </option>
                            ))}
                          </datalist>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSupervisionRows(supervisionRows.filter((r) => r.id !== row.id));
                          }}
                          className="p-1 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 3: ANSWER SHEET EVALUATION REGISTER (ઉત્તરવહી પરીક્ષણ કાર્ય પત્રક)
          ========================================================================= */}
      {activeSubTab === 'evaluation' && (
        <div className="space-y-5">
          {/* Action Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  ઉત્તરવહી પરીક્ષણ કાર્ય પત્રક
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  વિષયવાર ઉત્તરવહી સંખ્યા, મેળવ્યા તારીખ અને પરીક્ષક શિક્ષકની સહી
                </p>
              </div>
            </div>

            {/* Standard Selector & Download buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 px-2">ધોરણ:</span>
                {['9', '10', '11', '12'].map((std) => (
                  <button
                    key={std}
                    type="button"
                    onClick={() => {
                      setSelectedEvalStd(std);
                      // Auto-update count to this standard's count
                      const count = studentsByStandard[std]?.length || 27;
                      setEvaluationRows((prev) => prev.map((r) => ({ ...r, standard: std, sheetCount: count })));
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedEvalStd === std
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {std}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  const newRow: AnswerSheetEvaluationRow = {
                    id: `eval_custom_${Date.now()}`,
                    date: '',
                    standard: selectedEvalStd,
                    subject: '',
                    sheetCount: studentsByStandard[selectedEvalStd]?.length || 27,
                    receivedDate: '',
                    returnedDate: '',
                    examinerName: '',
                  };
                  setEvaluationRows([...evaluationRows, newRow]);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-200 dark:border-white/10 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>વિષય ઉમેરો</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadEvaluation}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center gap-2 shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>PDF ડાઉનલોડ ({pageSize.toUpperCase()})</span>
              </button>
              <button
                type="button"
                onClick={() => printAnswerSheetEvaluation(school, evaluationRows, selectedEvalStd, examTitle, monthYear, pageSize)}
                className="px-3 py-2 rounded-xl bg-slate-800 text-white dark:bg-white/10 font-bold text-xs flex items-center gap-1.5 hover:bg-slate-900 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>પ્રિન્ટ</span>
              </button>
            </div>
          </div>

          {/* Evaluation Editable Table */}
          <div className="glass-card rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden bg-white dark:bg-slate-900/90 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 font-bold text-slate-700 dark:text-slate-300">
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-3 w-28">તારીખ</th>
                    <th className="py-3 px-3 w-36">વિષય (Subject)</th>
                    <th className="py-3 px-3 w-28 text-center">ઉત્તરવહી સંખ્યા</th>
                    <th className="py-3 px-3 w-32">મેળવ્યા તારીખ</th>
                    <th className="py-3 px-3 w-32">પરત કર્યા તારીખ</th>
                    <th className="py-3 px-3 w-44">પરીક્ષક શિક્ષકનું નામ</th>
                    <th className="py-3 px-3 w-14 text-center">કાઢો</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {evaluationRows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                      <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={row.date}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEvaluationRows((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, date: val } : r))
                            );
                          }}
                          className="w-full bg-slate-50 dark:bg-white/5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 font-medium focus:outline-none focus:border-indigo-500"
                          placeholder="DD-MM-YYYY"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={row.subject}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEvaluationRows((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, subject: val } : r))
                            );
                          }}
                          className="w-full bg-slate-50 dark:bg-white/5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                          placeholder="વિષયનું નામ..."
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          value={row.sheetCount}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setEvaluationRows((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, sheetCount: val } : r))
                            );
                          }}
                          className="w-20 text-center bg-slate-50 dark:bg-white/5 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 font-bold focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={row.receivedDate}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEvaluationRows((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, receivedDate: val } : r))
                            );
                          }}
                          className="w-full bg-slate-50 dark:bg-white/5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 font-medium focus:outline-none focus:border-indigo-500"
                          placeholder="DD-MM-YYYY"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={row.returnedDate || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEvaluationRows((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, returnedDate: val } : r))
                            );
                          }}
                          className="w-full bg-slate-50 dark:bg-white/5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 font-medium focus:outline-none focus:border-indigo-500"
                          placeholder="ખાલી / તારીખ"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="relative">
                          <input
                            type="text"
                            value={row.examinerName || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEvaluationRows((prev) =>
                                prev.map((r) => (r.id === row.id ? { ...r, examinerName: val } : r))
                              );
                            }}
                            list={`staff_eval_${row.id}`}
                            className="w-full bg-slate-50 dark:bg-white/5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 font-medium focus:outline-none focus:border-indigo-500"
                            placeholder="પરીક્ષકનું નામ..."
                          />
                          <datalist id={`staff_eval_${row.id}`}>
                            {staff.map((s) => (
                              <option key={s.id} value={s.fullName}>
                                {s.fullName}
                              </option>
                            ))}
                          </datalist>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setEvaluationRows(evaluationRows.filter((r) => r.id !== row.id));
                          }}
                          className="p-1 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 4: AI TIMETABLE SCANNER & AUTO-EXTRACTOR
          ========================================================================= */}
      {activeSubTab === 'ai_timetable' && (
        <div className="space-y-6">
          <div className="glass-card rounded-3xl p-6 border border-amber-500/20 shadow-sm bg-gradient-to-br from-amber-50/50 via-white to-amber-50/20 dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900">
            <div className="flex items-start gap-3.5 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  AI સમયપત્રક સ્કેનર (AI Timetable Scanner)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  પરીક્ષા ટાઈમટેબલનો ફોટો / PDF અપલોડ કરો. Gemini AI આપમેળે બધી તારીખો અને વિષયો ઓળખીને ખંડ નિરીક્ષણ અને ઉત્તરવહી પત્રકમાં ભરી દેશે.
                </p>
              </div>
            </div>

            {/* Upload Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* File Upload Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-amber-400/50 dark:border-amber-500/30 rounded-2xl p-6 text-center hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all cursor-pointer flex flex-col items-center justify-center space-y-2 group"
              >
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  સમયપત્રકનો ફોટો / PDF અપલોડ કરો
                </div>
                <div className="text-[11px] text-slate-400">
                  JPG, PNG, PDF અથવા મોબાઇલ કેમેરા ફોટો
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleUploadTimetableFile}
                  className="hidden"
                />
              </div>

              {/* Text Paste Box */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  અથવા લખાણ અહીં પેસ્ટ કરો:
                </label>
                <textarea
                  value={timetableText}
                  onChange={(e) => setTimetableText(e.target.value)}
                  placeholder="દા.ત.&#10;06-04-2026 ધોરણ 9 ગણિત&#10;07-04-2026 ધોરણ 9 વિજ્ઞાન..."
                  rows={4}
                  className="w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-3 text-xs font-mono focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={handleExtractFromText}
                  disabled={aiUploading}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>લખાણમાંથી સ્કેન કરો</span>
                </button>
              </div>
            </div>

            {/* AI Status messages */}
            {aiUploading && (
              <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2 animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
                <span>Gemini AI સમયપત્રકનું વિશ્લેષણ કરી રહ્યું છે, કૃપા કરીને ક્ષણભર રાહ જુઓ...</span>
              </div>
            )}

            {aiError && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{aiError}</span>
              </div>
            )}

            {aiSuccessMessage && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{aiSuccessMessage}</span>
              </div>
            )}
          </div>

          {/* Timetable Extracted Rows Table */}
          {timetable.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    સ્કેન થયેલ સમયપત્રક ({timetable.length} વિષયો)
                  </h3>
                  <p className="text-xs text-slate-500">
                    તમે નીચેથી કોઈપણ વિગતમાં ફેરફાર કરી શકો છો
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleApplyTimetableToAllLists}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shadow-emerald-600/20 hover:opacity-95 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ખંડ નિરીક્ષણ & ઉત્તરવહીમાં લાગુ કરો</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newEntry: TimetableEntry = {
                        id: `tt_${Date.now()}`,
                        date: '',
                        day: '',
                        standard: '9',
                        subject: '',
                        time: '',
                      };
                      setTimetable([...timetable, newEntry]);
                    }}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 cursor-pointer"
                    title="નવી એન્ટ્રી ઉમેરો"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="glass-card rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden bg-white dark:bg-slate-900/90 shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 font-bold text-slate-700 dark:text-slate-300">
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3 w-32">તારીખ</th>
                        <th className="py-2.5 px-3 w-28">વાર (Day)</th>
                        <th className="py-2.5 px-3 w-20 text-center">ધોરણ</th>
                        <th className="py-2.5 px-3">વિષય (Subject)</th>
                        <th className="py-2.5 px-3 w-36">સમય (Time)</th>
                        <th className="py-2.5 px-3 w-12 text-center">કાઢો</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {timetable.map((tt, idx) => (
                        <tr key={tt.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                          <td className="py-2 px-3 text-center text-slate-400 font-bold">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={tt.date}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTimetable((prev) =>
                                  prev.map((t) => (t.id === tt.id ? { ...t, date: val } : t))
                                );
                              }}
                              className="w-full bg-slate-50 dark:bg-white/5 px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-medium focus:outline-none focus:border-amber-500"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={tt.day || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTimetable((prev) =>
                                  prev.map((t) => (t.id === tt.id ? { ...t, day: val } : t))
                                );
                              }}
                              className="w-full bg-slate-50 dark:bg-white/5 px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-medium focus:outline-none focus:border-amber-500"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="text"
                              value={tt.standard}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTimetable((prev) =>
                                  prev.map((t) => (t.id === tt.id ? { ...t, standard: val } : t))
                                );
                              }}
                              className="w-14 text-center bg-slate-50 dark:bg-white/5 px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-bold focus:outline-none focus:border-amber-500"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={tt.subject}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTimetable((prev) =>
                                  prev.map((t) => (t.id === tt.id ? { ...t, subject: val } : t))
                                );
                              }}
                              className="w-full bg-slate-50 dark:bg-white/5 px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={tt.time || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTimetable((prev) =>
                                  prev.map((t) => (t.id === tt.id ? { ...t, time: val } : t))
                                );
                              }}
                              placeholder="11:00 થી 02:00"
                              className="w-full bg-slate-50 dark:bg-white/5 px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 text-xs focus:outline-none focus:border-amber-500"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setTimetable(timetable.filter((t) => t.id !== tt.id));
                              }}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          AUTO-BLOCK GENERATION WIZARD MODAL
          ========================================================================= */}
      {showAutoBlockModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-white/10 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-slate-900 dark:text-white text-base">
                  ઓટો બ્લોક જનરેશન વિઝાર્ડ
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAutoBlockModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Select Standards */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 block">
                  ૧. કયા ધોરણોના વિદ્યાર્થીઓ ફાળવવા છે?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['9', '10', '11', '12'].map((std) => {
                    const count = studentsByStandard[std]?.length || 0;
                    const isChecked = wizardSelectedStds.includes(std);
                    return (
                      <button
                        key={std}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setWizardSelectedStds(wizardSelectedStds.filter((s) => s !== std));
                          } else {
                            setWizardSelectedStds([...wizardSelectedStds, std]);
                          }
                        }}
                        className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isChecked
                            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 font-bold text-indigo-900 dark:text-indigo-200'
                            : 'border-slate-200 dark:border-white/10 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div>ધોરણ- {std}</div>
                          <div className="text-[10px] text-slate-500 font-normal">
                            કુલ {count} વિદ્યાર્થીઓ
                          </div>
                        </div>
                        {isChecked && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Students per block capacity */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 block">
                  ૨. બ્લોક દીઠ વિદ્યાર્થી ક્ષમતા (Students per block):
                </label>
                <div className="flex items-center gap-2">
                  {[24, 25, 27, 30].map((cap) => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => setWizardCapacity(cap)}
                      className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
                        wizardCapacity === cap
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cap}
                    </button>
                  ))}
                  <input
                    type="number"
                    value={wizardCapacity}
                    onChange={(e) => setWizardCapacity(parseInt(e.target.value, 10) || 27)}
                    className="w-20 bg-slate-100 dark:bg-white/5 px-2.5 py-1.5 rounded-xl font-bold text-center border border-slate-200 dark:border-white/10"
                  />
                </div>
              </div>

              {/* Seating Arrangement Mode */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 block">
                  ૩. બેઠક વ્યવસ્થા પદ્ધતિ (Seating Pattern):
                </label>
                <div className="space-y-2">
                  <label
                    onClick={() => setWizardMode('mixed')}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer ${
                      wizardMode === 'mixed'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                        : 'border-slate-200 dark:border-white/10'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        મિશ્ર બેઠક વ્યવસ્થા (Alternate / Zigzag Mixed)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        દરેક બ્લોકમાં બે અલગ-અલગ ધોરણના અડધા-અડધા વિદ્યાર્થીઓ (e.g. Std 11: 14 + Std 9: 13 = 27)
                      </div>
                    </div>
                    {wizardMode === 'mixed' && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </label>

                  <label
                    onClick={() => setWizardMode('sequential')}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer ${
                      wizardMode === 'sequential'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                        : 'border-slate-200 dark:border-white/10'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        ધોરણવાર અલગ બેઠક (Sequential Single Class)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        એક જ ધોરણના ૨૭-૨૭ વિદ્યાર્થીઓ ક્રમશઃ દરેક બ્લોકમાં
                      </div>
                    </div>
                    {wizardMode === 'sequential' && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
              <button
                type="button"
                onClick={() => setShowAutoBlockModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
              >
                રદ કરો
              </button>
              <button
                type="button"
                onClick={handleExecuteAutoBlockGeneration}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm shadow-indigo-600/30"
              >
                <Sparkles className="w-4 h-4" />
                <span>બ્લોક બનાવો</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          LIVE PREVIEW MODAL
          ========================================================================= */}
      {previewBlock && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                  {previewBlock.blockName} પ્રિવ્યૂ (Preview)
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadSingleBlock(previewBlock)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF ડાઉનલોડ ({pageSize.toUpperCase()})</span>
                </button>
                <button
                  type="button"
                  onClick={() => printBlockAttendanceSheet(school, previewBlock, examTitle, monthYear, pageSize)}
                  className="p-1.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewBlock(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Render exact look of reference sheet */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100 dark:bg-black/40 flex justify-center">
              <div className="bg-white text-black p-6 sm:p-8 rounded-lg shadow-md max-w-2xl w-full border border-slate-300 font-sans space-y-4">
                {/* Header */}
                <div className="text-center border-b-2 border-black pb-2">
                  <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight">
                    {school.schoolName || 'શ્રી શાળા'}
                  </h1>
                  <p className="text-xs text-slate-700 font-bold">
                    {[school.taluka, school.district].filter(Boolean).join(', ')} • વિદ્યાર્થી પરીક્ષા બ્લોક હાજરી પત્રક
                  </p>
                </div>

                {/* Sections */}
                {previewBlock.sections.map((sec, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-black">
                      <span>ધોરણ- {sec.standard}</span>
                      <span>{examTitle}</span>
                      <span>{monthYear}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 border-b pb-1">
                      <span>વિષય: ....................................</span>
                      <span>તારીખ: ....................................</span>
                      <span className="font-black text-sm">બ્લોક.નં. {String(previewBlock.blockNumber).padStart(2, '0')}</span>
                    </div>

                    <table className="w-full border-collapse border border-black text-xs">
                      <thead>
                        <tr className="bg-slate-50 font-black">
                          <th className="border border-black p-1 text-left w-5/12">નામ</th>
                          <th className="border border-black p-1 text-center w-2/12">બેઠક નંબર</th>
                          <th className="border border-black p-1 text-center w-2/12">પુરવણી</th>
                          <th className="border border-black p-1 text-center w-1/12">લખેલ પાનાં</th>
                          <th className="border border-black p-1 text-center w-2/12">વિદ્યાર્થી સહી</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sec.students.map((st, sIdx) => (
                          <tr key={sIdx}>
                            <td className="border border-black px-2 py-1 font-bold uppercase text-[11px]">
                              {st.studentName}
                            </td>
                            <td className="border border-black px-1 py-1 text-center font-bold text-xs">
                              {st.rollNumber}
                            </td>
                            <td className="border border-black p-0 text-center">
                              <div className="flex h-5 divide-x divide-black">
                                <div className="w-1/2"></div>
                                <div className="w-1/2"></div>
                              </div>
                            </td>
                            <td className="border border-black px-1 py-1 text-center">&nbsp;</td>
                            <td className="border border-black px-1 py-1 text-center">&nbsp;</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}

                {/* Footer summary */}
                <div className="border-t-2 border-black pt-2 text-xs space-y-1 font-bold">
                  <div className="flex justify-between items-center">
                    <span>બ્લોકમાં ફાળવેલ વિ..સંખ્યા: <strong>{previewBlock.totalAllotted}</strong></span>
                    <span>હાજર સંખ્યા: ______</span>
                    <span>ગેર હાજર સંખ્યા: ______</span>
                  </div>
                  <div>ગેર હાજર નંબર : ..........................................................................................</div>
                  <div>બ્લોક સુપરવાઇઝરનું નામ અને સહી : ........................................................................</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
