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
  Search,
  CheckSquare,
  Square,
  Check,
} from 'lucide-react';

interface ExamFileTabProps {
  school: School;
  students: Student[];
  staff: Staff[];
  onBack?: () => void;
}

interface SectionEditorConfig {
  standard: string;
  mode: 'range' | 'count' | 'manual';
  fromRoll: number;
  toRoll: number;
  count: number;
  manualSelectedIds: string[];
  onlyUnassignedFilter?: boolean;
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

  // Blocks State - starts empty (no prefilled dummy/mock data!)
  const [blocks, setBlocks] = useState<ExamBlock[]>([]);
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);

  // Supervision rows state - starts empty
  const [supervisionRows, setSupervisionRows] = useState<SupervisionScheduleRow[]>([]);

  // Answer Sheet Evaluation state - starts empty
  const [selectedEvalStd, setSelectedEvalStd] = useState<string>('all');
  const [evaluationRows, setEvaluationRows] = useState<AnswerSheetEvaluationRow[]>([]);

  // Timetable state - starts empty
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);

  // UI status / loading states
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [processStatusMessage, setProcessStatusMessage] = useState<string | null>(null);
  const [previewBlock, setPreviewBlock] = useState<ExamBlock | null>(null);

  // Block Setup & Student Allocation Modal State
  const [showBlockEditorModal, setShowBlockEditorModal] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editorBlockNumber, setEditorBlockNumber] = useState<number>(1);
  const [editorBlockName, setEditorBlockName] = useState<string>('બ્લોક નં. 01');
  const [editorRoomName, setEditorRoomName] = useState<string>('રૂમ નં. 01');
  const [editorSections, setEditorSections] = useState<SectionEditorConfig[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState<Record<string, string>>({});

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

  // Group students by standard for allocation
  const studentsByStandard = useMemo(() => {
    const map: Record<string, Student[]> = {};
    students.forEach((st) => {
      const std = String(st.standard || '').replace(/^class\s*/i, '').trim();
      if (!std) return;
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

  // List of available standards from school's student database
  const availableStandards = useMemo(() => {
    const stds = Object.keys(studentsByStandard).filter((s) => studentsByStandard[s].length > 0);
    stds.sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0));
    return stds.length > 0 ? stds : ['9', '10', '11', '12'];
  }, [studentsByStandard]);

  // Map of studentId -> block name they are already allocated to (excluding current editing block)
  const studentToBlockMap = useMemo(() => {
    const map: Record<string, string> = {};
    blocks.forEach((b) => {
      if (b.id !== editingBlockId) {
        b.sections?.forEach((sec) => {
          sec.students?.forEach((st) => {
            map[st.id] = b.blockName || `બ્લોક નં. ${b.blockNumber}`;
          });
        });
      }
    });
    return map;
  }, [blocks, editingBlockId]);

  // Load saved state or start CLEAN (zero mock/dummy data!)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: ExamFileSettings = JSON.parse(saved);
        if (parsed.examType) setSelectedExamType(parsed.examType);
        if (parsed.examTitle) setExamTitle(parsed.examTitle);
        if (parsed.monthYear) setMonthYear(parsed.monthYear);
        if (parsed.pageSize) setPageSize(parsed.pageSize);

        // Check if saved blocks have mock dummy data or invalid students
        if (Array.isArray(parsed.blocks) && parsed.blocks.length > 0) {
          const hasMock = parsed.blocks.some((b) =>
            b.sections?.some((sec) =>
              sec.students?.some((st) =>
                st.id?.startsWith('mock_') ||
                st.studentName?.startsWith('STUDENT ') ||
                st.studentName?.startsWith('Student ') ||
                st.id?.includes('dummy')
              )
            )
          );
          if (!hasMock) {
            setBlocks(parsed.blocks);
            setExpandedBlockId(parsed.blocks[0]?.id || null);
          } else {
            setBlocks([]);
          }
        } else {
          setBlocks([]);
        }

        if (Array.isArray(parsed.timetable) && parsed.timetable.length > 0) {
          setTimetable(parsed.timetable);
        }

        if (Array.isArray(parsed.supervisionList) && parsed.supervisionList.length > 0) {
          const hasMockDate = parsed.supervisionList.some(
            (r) => r.date === '06-04-2026' && (!parsed.timetable || parsed.timetable.length === 0)
          );
          if (!hasMockDate) {
            setSupervisionRows(parsed.supervisionList);
          }
        }

        if (Array.isArray(parsed.answerSheetList) && parsed.answerSheetList.length > 0) {
          const hasMockDate = parsed.answerSheetList.some(
            (r) => r.date === '06-04-2026' && (!parsed.timetable || parsed.timetable.length === 0)
          );
          if (!hasMockDate) {
            setEvaluationRows(parsed.answerSheetList);
          }
        }
        return;
      }
    } catch (e) {
      console.warn('Could not load saved exam file state:', e);
    }

    // Start with strictly clean state - NO mock data
    setBlocks([]);
    setSupervisionRows([]);
    setEvaluationRows([]);
    setTimetable([]);
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

  // Handle Exam Term switch
  const handleSelectExamTerm = (term: ExamTermType) => {
    setSelectedExamType(term);
    const opt = EXAM_TERM_OPTIONS.find((o) => o.id === term);
    if (opt) {
      setExamTitle(opt.defaultTitle);
      setMonthYear(opt.defaultMonth);
    }
  };

  // Clear / Reset All Data
  const handleResetData = () => {
    if (confirm('શું આપ પરીક્ષા ફાઇલનો તમામ ડેટા સાફ કરી નવેસરથી શરૂ કરવા માંગો છો?')) {
      setBlocks([]);
      setSupervisionRows([]);
      setEvaluationRows([]);
      setTimetable([]);
      localStorage.removeItem(storageKey);
      setAiSuccessMessage('✨ પરીક્ષા ફાઇલનો જૂનો તમામ ડેટા સાફ થઈ ગયો છે. હવે આપ નવેસરથી બ્લોક અને ટાઈમટેબલ ઉમેરી શકો છો.');
      setTimeout(() => setAiSuccessMessage(null), 4000);
    }
  };

  // =========================================================================
  // SYNC SUPERVISION ROWS FROM TIMETABLE
  // =========================================================================
  const syncSupervisionFromTimetable = (timetableSource = timetable) => {
    if (!timetableSource || timetableSource.length === 0) {
      alert('કૃપા કરીને પહેલા "📥 AI ટાઈમટેબલ PDF/ફોટોથી તારીખો મેળવો" બટન દ્વારા ટાઈમટેબલ અપલોડ કરો.');
      return [];
    }

    // Extract unique dates in order
    const dateMap = new Map<string, { date: string; day?: string }>();
    timetableSource.forEach((t) => {
      const cleanDate = (t.date || '').trim();
      if (cleanDate && !dateMap.has(cleanDate)) {
        dateMap.set(cleanDate, { date: cleanDate, day: t.day });
      }
    });

    const uniqueDates = Array.from(dateMap.values());
    if (uniqueDates.length === 0) {
      alert('ટાઈમટેબલમાં કોઈ માન્ય તારીખ મળી નથી.');
      return [];
    }

    // If no blocks created yet, create 1 empty block row per date without dummy students
    const blockList = blocks.length > 0 ? blocks : [{ blockNumber: 1, totalAllotted: 0 }];
    const newRows: SupervisionScheduleRow[] = [];

    uniqueDates.forEach((dInfo, dIdx) => {
      blockList.forEach((b, bIdx) => {
        newRows.push({
          id: `sup_${Date.now()}_${dIdx}_${bIdx}`,
          date: dInfo.date,
          blockNumber: b.blockNumber,
          allottedCount: b.totalAllotted || 0,
          presentCount: '',
          absentCount: '',
          supervisorName: '',
        });
      });
    });

    setSupervisionRows(newRows);
    return newRows;
  };

  // =========================================================================
  // SYNC ANSWER SHEET EVALUATION ROWS FROM TIMETABLE
  // =========================================================================
  const syncEvaluationFromTimetable = (timetableSource = timetable) => {
    if (!timetableSource || timetableSource.length === 0) {
      alert('કૃપા કરીને પહેલા "📥 AI ટાઈમટેબલ PDF/ફોટોથી તારીખો મેળવો" બટન દ્વારા ટાઈમટેબલ અપલોડ કરો.');
      return [];
    }

    const newRows: AnswerSheetEvaluationRow[] = timetableSource.map((t, idx) => {
      const stdStudents = studentsByStandard[t.standard] || [];
      const count = stdStudents.length > 0 ? stdStudents.length : 0;
      return {
        id: `eval_${Date.now()}_${idx}`,
        date: t.date || '',
        standard: t.standard || '9',
        subject: t.subject || '',
        sheetCount: count,
        receivedDate: t.date || '',
        returnedDate: '',
        examinerName: '',
      };
    });

    setEvaluationRows(newRows);
    return newRows;
  };

  // =========================================================================
  // BLOCK SETUP & STUDENT ALLOCATION MODAL HANDLERS
  // =========================================================================

  // Open modal to create a NEW block
  const handleOpenCreateBlockModal = () => {
    const nextNum = blocks.length + 1;
    const defaultStd = availableStandards[0] || '9';
    const stdStudents = studentsByStandard[defaultStd] || [];

    // Find which rolls of defaultStd are already allocated to existing blocks
    const alreadyAssignedRolls = new Set<number>();
    blocks.forEach((b) => {
      b.sections?.forEach((sec) => {
        if (sec.standard === defaultStd) {
          sec.students?.forEach((st) => {
            const r = parseInt(st.rollNumber || '0', 10);
            if (r > 0) alreadyAssignedRolls.add(r);
          });
        }
      });
    });

    // Find first unassigned roll
    let startRoll = 1;
    for (const st of stdStudents) {
      const r = parseInt(st.rollNumber || '0', 10);
      if (r > 0 && !alreadyAssignedRolls.has(r)) {
        startRoll = r;
        break;
      }
    }

    const unassignedStudents = stdStudents.filter((s) => {
      const r = parseInt(s.rollNumber || '0', 10);
      return !alreadyAssignedRolls.has(r);
    });

    const defaultCount = Math.min(unassignedStudents.length > 0 ? unassignedStudents.length : stdStudents.length, 27);
    const endRoll = Math.min(startRoll + (defaultCount > 0 ? defaultCount : 1) - 1, stdStudents.length || 27);

    const initialSelectedIds = (unassignedStudents.length > 0 ? unassignedStudents : stdStudents)
      .slice(0, defaultCount)
      .map((s) => s.id);

    setEditingBlockId(null);
    setEditorBlockNumber(nextNum);
    setEditorBlockName(`બ્લોક નં. ${String(nextNum).padStart(2, '0')}`);
    setEditorRoomName(`રૂમ નં. ${String(nextNum).padStart(2, '0')}`);
    setEditorSections([
      {
        standard: defaultStd,
        mode: 'range',
        fromRoll: startRoll,
        toRoll: endRoll > 0 ? endRoll : startRoll,
        count: initialSelectedIds.length,
        manualSelectedIds: initialSelectedIds,
        onlyUnassignedFilter: false,
      },
    ]);
    setStudentSearchQuery({});
    setShowBlockEditorModal(true);
  };

  // Open modal to EDIT an EXISTING block
  const handleOpenEditBlockModal = (block: ExamBlock) => {
    setEditingBlockId(block.id);
    setEditorBlockNumber(block.blockNumber);
    setEditorBlockName(block.blockName);
    setEditorRoomName(block.roomName || '');

    const sections: SectionEditorConfig[] = block.sections.map((sec) => {
      const std = sec.standard;
      const studentIds = sec.students.map((s) => s.id);
      const rollNumbers = sec.students
        .map((s) => parseInt(s.rollNumber || '0', 10))
        .filter((n) => !isNaN(n) && n > 0)
        .sort((a, b) => a - b);

      const minRoll = rollNumbers.length > 0 ? rollNumbers[0] : 1;
      const maxRoll = rollNumbers.length > 0 ? rollNumbers[rollNumbers.length - 1] : sec.students.length;

      return {
        standard: std,
        mode: 'manual',
        fromRoll: minRoll,
        toRoll: maxRoll,
        count: sec.students.length,
        manualSelectedIds: studentIds,
        onlyUnassignedFilter: false,
      };
    });

    setEditorSections(
      sections.length > 0
        ? sections
        : [
            {
              standard: availableStandards[0] || '9',
              mode: 'range',
              fromRoll: 1,
              toRoll: 27,
              count: 27,
              manualSelectedIds: [],
              onlyUnassignedFilter: false,
            },
          ]
    );
    setStudentSearchQuery({});
    setShowBlockEditorModal(true);
  };

  // Add another standard section to the current block being edited
  const handleAddSectionToEditor = () => {
    // Find a standard not yet in editor, or default to next
    const existingStds = new Set(editorSections.map((s) => s.standard));
    const nextStd = availableStandards.find((s) => !existingStds.has(s)) || availableStandards[0] || '10';
    const stdStudents = studentsByStandard[nextStd] || [];

    // Find rolls of nextStd already allocated to other blocks
    const alreadyAssignedRolls = new Set<number>();
    blocks.forEach((b) => {
      if (b.id !== editingBlockId) {
        b.sections?.forEach((sec) => {
          if (sec.standard === nextStd) {
            sec.students?.forEach((st) => {
              const r = parseInt(st.rollNumber || '0', 10);
              if (r > 0) alreadyAssignedRolls.add(r);
            });
          }
        });
      }
    });

    let startRoll = 1;
    for (const st of stdStudents) {
      const r = parseInt(st.rollNumber || '0', 10);
      if (r > 0 && !alreadyAssignedRolls.has(r)) {
        startRoll = r;
        break;
      }
    }

    const unassignedStudents = stdStudents.filter((s) => {
      const r = parseInt(s.rollNumber || '0', 10);
      return !alreadyAssignedRolls.has(r);
    });

    const defaultCount = Math.min(unassignedStudents.length > 0 ? unassignedStudents.length : stdStudents.length, 14);
    const endRoll = Math.min(startRoll + (defaultCount > 0 ? defaultCount : 1) - 1, stdStudents.length || 14);

    const initialSelectedIds = (unassignedStudents.length > 0 ? unassignedStudents : stdStudents)
      .slice(0, defaultCount)
      .map((s) => s.id);

    setEditorSections([
      ...editorSections,
      {
        standard: nextStd,
        mode: 'range',
        fromRoll: startRoll,
        toRoll: endRoll > 0 ? endRoll : startRoll,
        count: initialSelectedIds.length,
        manualSelectedIds: initialSelectedIds,
        onlyUnassignedFilter: false,
      },
    ]);
  };

  // Remove a standard section from the block editor
  const handleRemoveSectionFromEditor = (index: number) => {
    if (editorSections.length <= 1) {
      alert('બ્લોકમાં ઓછામાં ઓછું ૧ ધોરણ હોવું જરૂરી છે.');
      return;
    }
    setEditorSections(editorSections.filter((_, i) => i !== index));
  };

  // Update a section's configuration in the block editor
  const handleUpdateSectionConfig = (index: number, updates: Partial<SectionEditorConfig>) => {
    const updated = [...editorSections];
    const current = { ...updated[index], ...updates };

    const std = current.standard;
    const stdStudents = studentsByStandard[std] || [];

    // Automatically recalculate selected students based on mode
    if (current.mode === 'range') {
      const from = Math.max(1, current.fromRoll || 1);
      const to = Math.max(from, current.toRoll || from);
      const matched = stdStudents.filter((s) => {
        const roll = parseInt(s.rollNumber || '0', 10);
        return roll >= from && roll <= to;
      });
      current.manualSelectedIds = matched.map((s) => s.id);
      current.count = matched.length;
    } else if (current.mode === 'count') {
      const count = Math.max(0, current.count || 0);
      const matched = stdStudents.slice(0, count);
      current.manualSelectedIds = matched.map((s) => s.id);
      current.fromRoll = 1;
      current.toRoll = matched.length;
    }

    updated[index] = current;
    setEditorSections(updated);
  };

  // Toggle individual student selection in manual checkbox mode
  const handleToggleStudentSelection = (sectionIdx: number, studentId: string) => {
    const sec = editorSections[sectionIdx];
    const selected = new Set(sec.manualSelectedIds);
    if (selected.has(studentId)) {
      selected.delete(studentId);
    } else {
      selected.add(studentId);
    }
    const updated = [...editorSections];
    updated[sectionIdx] = {
      ...sec,
      manualSelectedIds: Array.from(selected),
      count: selected.size,
    };
    setEditorSections(updated);
  };

  // Select all / Deselect all for a section
  const handleToggleAllStudentsInSection = (sectionIdx: number, selectAll: boolean) => {
    const sec = editorSections[sectionIdx];
    const stdStudents = studentsByStandard[sec.standard] || [];
    const updated = [...editorSections];
    updated[sectionIdx] = {
      ...sec,
      manualSelectedIds: selectAll ? stdStudents.map((s) => s.id) : [],
      count: selectAll ? stdStudents.length : 0,
    };
    setEditorSections(updated);
  };

  // Compute resolved students for each section in editor
  const resolvedEditorSections = useMemo(() => {
    return editorSections.map((sec) => {
      const stdStudents = studentsByStandard[sec.standard] || [];
      const selectedSet = new Set(sec.manualSelectedIds);
      const chosenStudents = stdStudents.filter((s) => selectedSet.has(s.id));

      const studentItems: BlockStudentItem[] = chosenStudents.map((s, idx) => ({
        id: s.id,
        studentName: s.studentName,
        rollNumber: s.rollNumber || String(idx + 1),
        standard: sec.standard,
        section: s.section,
      }));

      return {
        standard: sec.standard,
        students: studentItems,
      };
    });
  }, [editorSections, studentsByStandard]);

  const editorTotalAllotted = useMemo(() => {
    return resolvedEditorSections.reduce((acc, s) => acc + s.students.length, 0);
  }, [resolvedEditorSections]);

  // Save the block from editor modal
  const handleSaveBlockFromEditor = () => {
    if (resolvedEditorSections.length === 0 || editorTotalAllotted === 0) {
      alert('કૃપા કરીને બ્લોકમાં ઓછામાં ઓછો ૧ વિદ્યાર્થી પસંદ કરો.');
      return;
    }

    const blockSections: BlockClassSection[] = resolvedEditorSections.map((s) => ({
      standard: s.standard,
      students: s.students,
    }));

    if (editingBlockId) {
      // Update existing block
      const updated = blocks.map((b) => {
        if (b.id === editingBlockId) {
          return {
            ...b,
            blockNumber: editorBlockNumber,
            blockName: editorBlockName,
            roomName: editorRoomName,
            sections: blockSections,
            totalAllotted: editorTotalAllotted,
          };
        }
        return b;
      });
      setBlocks(updated);
    } else {
      // Create new block
      const newBlock: ExamBlock = {
        id: `block_${String(editorBlockNumber).padStart(2, '0')}_${Date.now()}`,
        blockNumber: editorBlockNumber,
        blockName: editorBlockName,
        roomName: editorRoomName,
        sections: blockSections,
        totalAllotted: editorTotalAllotted,
      };
      setBlocks([...blocks, newBlock]);
      setExpandedBlockId(newBlock.id);
    }

    setShowBlockEditorModal(false);
  };

  // Remove a block
  const handleRemoveBlock = (blockId: string) => {
    if (confirm('શું આપ આ બ્લોક કાઢી નાખવા માંગો છો?')) {
      const filtered = blocks.filter((b) => b.id !== blockId);
      // Re-number blocks sequentially
      const renumbered = filtered.map((b, idx) => ({
        ...b,
        blockNumber: idx + 1,
        blockName: `બ્લોક નં. ${String(idx + 1).padStart(2, '0')}`,
      }));
      setBlocks(renumbered);
    }
  };

  // =========================================================================
  // AUTO-BLOCK GENERATION WIZARD (REAL STUDENTS ONLY)
  // =========================================================================
  const handleRunAutoBlockWizard = () => {
    const selectedStdList = wizardSelectedStds;
    const capacity = wizardCapacity || 27;

    if (selectedStdList.length === 0) {
      alert('કૃપા કરીને ઓછામાં ઓછું ૧ ધોરણ પસંદ કરો.');
      return;
    }

    const totalStudentsInSelected = selectedStdList.reduce(
      (sum, std) => sum + (studentsByStandard[std] || []).length,
      0
    );

    if (totalStudentsInSelected === 0) {
      alert('પસંદ કરેલા ધોરણોમાં શાળામાં કોઈ વિદ્યાર્થી મળ્યા નથી. કૃપા કરીને પહેલા વિદ્યાર્થી રજીસ્ટરમાં વિદ્યાર્થીઓ દાખલ કરો.');
      return;
    }

    const generated: ExamBlock[] = [];
    let blockCounter = 1;

    if (wizardMode === 'mixed' && selectedStdList.length >= 2) {
      // Mixed allocation: combine pairs of standards (e.g. Std 11 + Std 9, or Std 9 + Std 10)
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
      alert('કોઈ બ્લોક બની શક્યા નથી.');
      return;
    }

    setBlocks(generated);
    setExpandedBlockId(generated[0]?.id || null);
    setShowAutoBlockModal(false);
  };

  // =========================================================================
  // AI TIMETABLE EXTRACTION VIA /api/ai/extract-timetable
  // =========================================================================
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
          const isPdf =
            file.name.toLowerCase().endsWith('.pdf') ||
            (file.type && file.type.includes('pdf')) ||
            (typeof base64Data === 'string' && base64Data.startsWith('data:application/pdf'));
          const mime = isPdf ? 'application/pdf' : (file.type || 'image/jpeg');

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
          if (data.examType) setSelectedExamType(data.examType);
          if (data.examTitle) setExamTitle(data.examTitle);
          if (data.monthYear) setMonthYear(data.monthYear);

          if (Array.isArray(data.entries) && data.entries.length > 0) {
            const formattedEntries: TimetableEntry[] = data.entries.map((item: any, i: number) => ({
              id: `tt_${Date.now()}_${i + 1}`,
              date: item.date || '',
              day: item.day || '',
              standard: String(item.standard || '9'),
              subject: item.subject || '',
              time: item.time || '',
            }));
            setTimetable(formattedEntries);

            // Automatically sync dates & subjects into Supervision & Evaluation!
            syncSupervisionFromTimetable(formattedEntries);
            syncEvaluationFromTimetable(formattedEntries);

            setAiSuccessMessage(
              `✨ AI દ્વારા ટાઈમટેબલ સફળતાપૂર્વક સ્કેન થયું (${formattedEntries.length} વિષયો/તારીખો)! ખંડ નિરીક્ષણ અને ઉત્તરવહી ચકાસણીમાં પરીક્ષાની તારીખો અને વિષયો આપોઆપ આવી ગયા છે.`
            );
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
          id: `tt_${Date.now()}_${i + 1}`,
          date: item.date || '',
          day: item.day || '',
          standard: String(item.standard || '9'),
          subject: item.subject || '',
          time: item.time || '',
        }));
        setTimetable(formattedEntries);

        // Automatically sync dates & subjects into Supervision & Evaluation!
        syncSupervisionFromTimetable(formattedEntries);
        syncEvaluationFromTimetable(formattedEntries);

        setAiSuccessMessage(
          `✨ લખાણમાંથી ${formattedEntries.length} પરીક્ષા તારીખો સ્કેન થઈ! ખંડ નિરીક્ષણ અને ઉત્તરવહી ચકાસણીમાં તારીખો ઉમેરાઈ ગઈ છે.`
        );
      }
    } catch (err: any) {
      setAiError(err.message || 'લખાણમાંથી ટાઈમટેબલ સ્કેન કરવામાં ક્ષતિ આવી.');
    } finally {
      setAiUploading(false);
    }
  };

  // PDF Download Handlers
  const handleDownloadSingleBlock = async (block: ExamBlock) => {
    setIsProcessingPdf(true);
    setProcessStatusMessage(`બ્લોક નં. ${block.blockNumber} નું PDF ડાઉનલોડ થઈ રહ્યું છે...`);
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
    if (supervisionRows.length === 0) {
      alert('ખંડ નિરીક્ષણમાં કોઈ રો નથી. "📅 ટાઈમટેબલની તારીખો ઓટો-ભરો" બટન દબાવો.');
      return;
    }
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
    if (evaluationRows.length === 0) {
      alert('ઉત્તરવહી ચકાસણી પત્રકમાં કોઈ રો નથી. "📅 ટાઈમટેબલ મુજબ વિષય & તારીખો ભરો" બટન દબાવો.');
      return;
    }
    setIsProcessingPdf(true);
    const label = selectedEvalStd === 'all' ? 'તમામ ધોરણ' : `ધોરણ ${selectedEvalStd}`;
    setProcessStatusMessage(`${label} ઉત્તરવહી પરીક્ષણ પત્રક PDF ડાઉનલોડ થઈ રહ્યું છે...`);
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

          {/* Quick Page Size Switcher (A4 vs Legal) & Reset Data */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <div className="flex items-center gap-1.5 bg-white/90 dark:bg-slate-800/90 p-1 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xs">
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

            <button
              type="button"
              onClick={handleResetData}
              className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all border border-slate-200 dark:border-white/10 cursor-pointer"
              title="તમામ ડેટા સાફ કરો"
            >
              સાફ કરો
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
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10'
                  }`}
                >
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                પરીક્ષા શીર્ષક:
              </span>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="દા.ત. પ્રથમ સત્રાંત પરીક્ષા"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                માસ-વર્ષ:
              </span>
              <input
                type="text"
                value={monthYear}
                onChange={(e) => setMonthYear(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white w-32 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="દા.ત. ઓક્ટોબર- 2026"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200 dark:border-white/10">
        <button
          type="button"
          onClick={() => setActiveSubTab('blocks')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'blocks'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>૧. બ્લોક વિદ્યાર્થી યાદી ({blocks.length} બ્લોક)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('supervision')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'supervision'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>૨. ખંડ નિરીક્ષણ કાર્ય પત્રક ({supervisionRows.length} રો)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('evaluation')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'evaluation'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>૩. ઉત્તરવહી ચકાસણી પત્રક ({evaluationRows.length} વિષય)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('ai_timetable')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'ai_timetable'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
              : 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>૪. AI ટાઈમટેબલ સ્કેનર ({timetable.length} તારીખો)</span>
        </button>
      </div>

      {/* Hidden file input for AI Timetable PDF/Image upload from any sub-tab */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleUploadTimetableFile}
        className="hidden"
      />

      {/* AI Timetable Uploading Loader */}
      {aiUploading && (
        <div className="glass-card rounded-2xl p-4 bg-purple-50/90 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/40 flex items-center gap-3 animate-pulse shadow-sm">
          <RefreshCw className="w-5 h-5 text-purple-600 animate-spin shrink-0" />
          <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
            ✨ AI દ્વારા ટાઈમટેબલ (PDF / ફોટો) સ્કેન થઈ રહ્યું છે... ખંડ નિરીક્ષણ અને ઉત્તરવહી ચકાસણીમાં તારીખો આપોઆપ ભરાઈ રહી છે, કૃપા કરીને થોડી ક્ષણો રાહ જુઓ.
          </span>
        </div>
      )}

      {/* AI Success Message Banner */}
      {aiSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{aiSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setAiSuccessMessage(null)}
            className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* AI Error Banner */}
      {aiError && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 flex items-center justify-between text-xs font-bold text-red-800 dark:text-red-300 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{aiError}</span>
          </div>
          <button
            type="button"
            onClick={() => setAiError(null)}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Processing Loader Indicator */}
      {isProcessingPdf && (
        <div className="glass-card rounded-2xl p-4 bg-indigo-50/90 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/40 flex items-center gap-3 animate-pulse">
          <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" />
          <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
            {processStatusMessage || 'PDF તૈયાર થઈ રહી છે, કૃપા કરીને થોડી ક્ષણો રાહ જુઓ...'}
          </span>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 1: BLOCKS MANAGEMENT (બ્લોક વિદ્યાર્થી ફાળવણી)
          ========================================================================= */}
      {activeSubTab === 'blocks' && (
        <div className="space-y-5">
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleOpenCreateBlockModal}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>➕ નવો બ્લોક બનાવો (વિદ્યાર્થીઓ ફાળવો)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAutoBlockModal(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-200 dark:border-white/10 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                <span>ઓટો બ્લોક વિઝાર્ડ</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadAllBlocksCombined}
                disabled={blocks.length === 0}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                title="તમામ બ્લોકની એક કમ્બાઈન્ડ Multi-Page PDF ડાઉનલોડ કરો"
              >
                <Download className="w-4 h-4" />
                <span>તમામ બ્લોક Combined PDF</span>
              </button>
              <button
                type="button"
                onClick={() => printAllBlocksCombined(school, blocks, examTitle, monthYear, pageSize)}
                disabled={blocks.length === 0}
                className="px-3 py-2 rounded-xl bg-slate-800 text-white dark:bg-white/10 font-bold text-xs flex items-center gap-1.5 hover:bg-slate-900 disabled:opacity-50 cursor-pointer"
                title="તમામ બ્લોક ડાયરેક્ટ પ્રિન્ટ કરો"
              >
                <Printer className="w-4 h-4" />
                <span>પ્રિન્ટ</span>
              </button>
            </div>
          </div>

          {/* Blocks List */}
          {blocks.length === 0 ? (
            <div className="text-center py-16 glass-card rounded-3xl border border-dashed border-slate-300 dark:border-white/15 p-8 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 mx-auto flex items-center justify-center">
                <Layers className="w-8 h-8 stroke-1" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  હજુ સુધી કોઈ બ્લોક બનાવવામાં આવ્યા નથી
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                  આપ આપની શાળાના ધોરણ અને વિદ્યાર્થીઓ અનુસાર નવો બ્લોક બનાવી શકો છો, અથવા ઓટો વિઝાર્ડ દ્વારા એકસાથે બ્લોક ફાળવી શકો છો.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleOpenCreateBlockModal}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>➕ પ્રથમ બ્લોક બનાવો (વિદ્યાર્થીઓ પસંદ કરો)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAutoBlockModal(true)}
                  className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span>ઓટો બ્લોક વિઝાર્ડ</span>
                </button>
              </div>
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
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
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
                          onClick={() => handleOpenEditBlockModal(block)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          title="આ બ્લોકમાં વિદ્યાર્થીઓ બદલો / એડિટ કરો"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>વિદ્યાર્થીઓ ફાળવો / એડિટ</span>
                        </button>

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
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-purple-600/20 cursor-pointer"
                title="સમયપત્રકનો ફોટો અથવા PDF અપલોડ કરો અને AI દ્વારા તારીખો આપોઆપ મેળવો"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>📥 AI ટાઈમટેબલ PDF/ફોટોથી તારીખો મેળવો</span>
              </button>

              {timetable.length > 0 && (
                <button
                  type="button"
                  onClick={() => syncSupervisionFromTimetable()}
                  className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800/40 cursor-pointer"
                  title="સ્કેન કરેલા ટાઈમટેબલમાંથી તારીખો રિફ્રેશ કરો"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>📅 ટાઈમટેબલ મુજબ ભરો ({timetable.length})</span>
                </button>
              )}

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
                disabled={supervisionRows.length === 0}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center gap-2 shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>PDF ડાઉનલોડ ({pageSize.toUpperCase()})</span>
              </button>

              <button
                type="button"
                onClick={() => printSupervisionSheet(school, supervisionRows, examTitle, monthYear, pageSize)}
                disabled={supervisionRows.length === 0}
                className="px-3 py-2 rounded-xl bg-slate-800 text-white dark:bg-white/10 font-bold text-xs flex items-center gap-1.5 hover:bg-slate-900 disabled:opacity-50 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>પ્રિન્ટ</span>
              </button>
            </div>
          </div>

          {/* Supervision Editable Table */}
          {supervisionRows.length === 0 ? (
            <div className="text-center py-16 glass-card rounded-3xl border border-dashed border-slate-300 dark:border-white/15 p-8 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 mx-auto flex items-center justify-center">
                <Calendar className="w-8 h-8 stroke-1" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  ખંડ નિરીક્ષણમાં હજુ કોઈ તારીખો ઉમેરેલ નથી
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                  આપ આપની શાળાના પરીક્ષા ટાઈમટેબલની PDF અથવા ફોટો અપલોડ કરી શકો છો. AI આપોઆપ તમામ તારીખો ઓળખીને અહીં ભરી દેશે.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-sm shadow-purple-600/20 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>📥 AI ટાઈમટેબલ PDF/ફોટોથી તારીખો મેળવો</span>
                </button>
                {timetable.length > 0 && (
                  <button
                    type="button"
                    onClick={() => syncSupervisionFromTimetable()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>📅 ટાઈમટેબલની તારીખો ઓટો-ભરો</span>
                  </button>
                )}
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
                    setSupervisionRows([newRow]);
                  }}
                  className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>હાથેથી રો ઉમેરો</span>
                </button>
              </div>
            </div>
          ) : (
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
                              const updated = [...supervisionRows];
                              updated[idx].date = e.target.value;
                              setSupervisionRows(updated);
                            }}
                            className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500"
                            placeholder="DD-MM-YYYY"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            value={row.blockNumber}
                            onChange={(e) => {
                              const updated = [...supervisionRows];
                              updated[idx].blockNumber = parseInt(e.target.value, 10) || 1;
                              setSupervisionRows(updated);
                            }}
                            className="w-16 mx-auto text-center px-2 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            value={row.allottedCount}
                            onChange={(e) => {
                              const updated = [...supervisionRows];
                              updated[idx].allottedCount = parseInt(e.target.value, 10) || 0;
                              setSupervisionRows(updated);
                            }}
                            className="w-16 mx-auto text-center px-2 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={row.supervisorName || ''}
                              onChange={(e) => {
                                const updated = [...supervisionRows];
                                updated[idx].supervisorName = e.target.value;
                                setSupervisionRows(updated);
                              }}
                              className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500"
                              placeholder="શિક્ષકનું નામ લખો..."
                            />
                            {staff && staff.length > 0 && (
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    const updated = [...supervisionRows];
                                    updated[idx].supervisorName = e.target.value;
                                    setSupervisionRows(updated);
                                  }
                                }}
                                className="w-8 px-1 py-1.5 text-xs border border-slate-200 dark:border-white/10 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 cursor-pointer"
                                title="સ્ટાફમાંથી પસંદ કરો"
                                value=""
                              >
                                <option value="">▼</option>
                                {staff.map((stf) => (
                                  <option key={stf.id} value={stf.fullName || (stf as any).staffName || ''}>
                                    {stf.fullName || (stf as any).staffName || ''}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSupervisionRows(supervisionRows.filter((_, i) => i !== idx));
                            }}
                            className="p-1 hover:bg-red-50 text-red-500 rounded-lg cursor-pointer"
                            title="રો કાઢો"
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
          )}
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 3: ANSWER SHEET EVALUATION REGISTER (ઉત્તરવહી પરીક્ષણ કાર્ય)
          ========================================================================= */}
      {activeSubTab === 'evaluation' && (
        <div className="space-y-5">
          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                ઉત્તરવહી પરીક્ષણ કાર્ય પત્રક (Answer Sheet Evaluation)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                તારીખવાર વિષય, ઉત્તરવહી સંખ્યા અને પરીક્ષક શિક્ષકોની સહી પત્રક
              </p>
            </div>

            {/* Standard Filter Selector */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                ધોરણ ફિલ્ટર:
              </span>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSelectedEvalStd('all')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                    selectedEvalStd === 'all'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  તમામ
                </button>
                {availableStandards.map((std) => (
                  <button
                    key={std}
                    type="button"
                    onClick={() => setSelectedEvalStd(std)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                      selectedEvalStd === std
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    ધો. {std}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-purple-600/20 cursor-pointer"
                title="સમયપત્રકનો ફોટો અથવા PDF અપલોડ કરો અને AI દ્વારા વિષયો અને તારીખો આપોઆપ મેળવો"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>📥 AI ટાઈમટેબલ PDF/ફોટોથી તારીખો મેળવો</span>
              </button>

              {timetable.length > 0 && (
                <button
                  type="button"
                  onClick={() => syncEvaluationFromTimetable()}
                  className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800/40 cursor-pointer"
                  title="AI ટાઈમટેબલમાંથી વિષય અને તારીખો ભરો"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>📅 ટાઈમટેબલ મુજબ ભરો ({timetable.length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const newRow: AnswerSheetEvaluationRow = {
                    id: `eval_custom_${Date.now()}`,
                    date: '',
                    standard: selectedEvalStd === 'all' ? (availableStandards[0] || '9') : selectedEvalStd,
                    subject: '',
                    sheetCount: 0,
                    receivedDate: '',
                    returnedDate: '',
                    examinerName: '',
                  };
                  setEvaluationRows([...evaluationRows, newRow]);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-200 dark:border-white/10 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>રો ઉમેરો</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadEvaluation}
                disabled={evaluationRows.length === 0}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center gap-2 shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>PDF ડાઉનલોડ ({pageSize.toUpperCase()})</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  printAnswerSheetEvaluation(school, evaluationRows, selectedEvalStd, examTitle, monthYear, pageSize)
                }
                disabled={evaluationRows.length === 0}
                className="px-3 py-2 rounded-xl bg-slate-800 text-white dark:bg-white/10 font-bold text-xs flex items-center gap-1.5 hover:bg-slate-900 disabled:opacity-50 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>પ્રિન્ટ</span>
              </button>
            </div>
          </div>

          {/* Evaluation Table */}
          {evaluationRows.length === 0 ? (
            <div className="text-center py-16 glass-card rounded-3xl border border-dashed border-slate-300 dark:border-white/15 p-8 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 mx-auto flex items-center justify-center">
                <FileCheck className="w-8 h-8 stroke-1" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  ઉત્તરવહી ચકાસણી પત્રકમાં હજુ કોઈ વિષયો ઉમેરેલ નથી
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                  આપ નીચે આપેલ "ટાઈમટેબલ મુજબ વિષય & તારીખો ભરો" બટન દબાવી શકો છો જેથી AI ટાઈમટેબલ મુજબ ધોરણવાર વિષય અને તારીખો આપોઆપ આવી જશે.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-sm shadow-purple-600/20 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>📥 AI ટાઈમટેબલ PDF/ફોટોથી તારીખો મેળવો</span>
                </button>
                {timetable.length > 0 && (
                  <button
                    type="button"
                    onClick={() => syncEvaluationFromTimetable()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>📅 ટાઈમટેબલ મુજબ વિષય & તારીખો ભરો ({timetable.length})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const newRow: AnswerSheetEvaluationRow = {
                      id: `eval_custom_${Date.now()}`,
                      date: '',
                      standard: selectedEvalStd === 'all' ? (availableStandards[0] || '9') : selectedEvalStd,
                      subject: '',
                      sheetCount: 0,
                      receivedDate: '',
                      returnedDate: '',
                      examinerName: '',
                    };
                    setEvaluationRows([newRow]);
                  }}
                  className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>મેન્યુઅલી રો ઉમેરો</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden bg-white dark:bg-slate-900/90 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 font-bold text-slate-700 dark:text-slate-300">
                      <th className="py-3 px-3 w-10 text-center">#</th>
                      <th className="py-3 px-3 w-28">તારીખ</th>
                      <th className="py-3 px-3 w-20 text-center">ધોરણ</th>
                      <th className="py-3 px-3 w-36">વિષયનું નામ</th>
                      <th className="py-3 px-3 w-24 text-center">ઉત્તરવહી સંખ્યા</th>
                      <th className="py-3 px-3 w-32">મેળવ્યા તારીખ</th>
                      <th className="py-3 px-3 w-32">પરત તારીખ</th>
                      <th className="py-3 px-3 w-40">પરીક્ષકનું નામ</th>
                      <th className="py-3 px-3 w-16 text-center">કાઢો</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {evaluationRows
                      .filter((row) => selectedEvalStd === 'all' || row.standard === selectedEvalStd)
                      .map((row, idx) => (
                        <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                          <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={row.date}
                              onChange={(e) => {
                                const updated = [...evaluationRows];
                                const found = updated.find((r) => r.id === row.id);
                                if (found) found.date = e.target.value;
                                setEvaluationRows(updated);
                              }}
                              className="w-full px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                              placeholder="DD-MM-YYYY"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-md font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                              ધો. {row.standard}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={row.subject}
                              onChange={(e) => {
                                const updated = [...evaluationRows];
                                const found = updated.find((r) => r.id === row.id);
                                if (found) found.subject = e.target.value;
                                setEvaluationRows(updated);
                              }}
                              className="w-full px-2 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                              placeholder="વિષય લખો..."
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              value={row.sheetCount}
                              onChange={(e) => {
                                const updated = [...evaluationRows];
                                const found = updated.find((r) => r.id === row.id);
                                if (found) found.sheetCount = parseInt(e.target.value, 10) || 0;
                                setEvaluationRows(updated);
                              }}
                              className="w-16 mx-auto text-center px-2 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={row.receivedDate}
                              onChange={(e) => {
                                const updated = [...evaluationRows];
                                const found = updated.find((r) => r.id === row.id);
                                if (found) found.receivedDate = e.target.value;
                                setEvaluationRows(updated);
                              }}
                              className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                              placeholder="DD-MM-YYYY"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={row.returnedDate || ''}
                              onChange={(e) => {
                                const updated = [...evaluationRows];
                                const found = updated.find((r) => r.id === row.id);
                                if (found) found.returnedDate = e.target.value;
                                setEvaluationRows(updated);
                              }}
                              className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                              placeholder="DD-MM-YYYY"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={row.examinerName || ''}
                                onChange={(e) => {
                                  const updated = [...evaluationRows];
                                  const found = updated.find((r) => r.id === row.id);
                                  if (found) found.examinerName = e.target.value;
                                  setEvaluationRows(updated);
                                }}
                                className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                placeholder="શિક્ષકનું નામ..."
                              />
                              {staff && staff.length > 0 && (
                                <select
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      const updated = [...evaluationRows];
                                      const found = updated.find((r) => r.id === row.id);
                                      if (found) found.examinerName = e.target.value;
                                      setEvaluationRows(updated);
                                    }
                                  }}
                                  className="w-7 px-0.5 py-1.5 text-xs border border-slate-200 dark:border-white/10 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 cursor-pointer"
                                  title="સ્ટાફમાંથી પસંદ કરો"
                                  value=""
                                >
                                  <option value="">▼</option>
                                  {staff.map((stf) => (
                                    <option key={stf.id} value={stf.fullName || (stf as any).staffName || ''}>
                                      {stf.fullName || (stf as any).staffName || ''}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setEvaluationRows(evaluationRows.filter((r) => r.id !== row.id));
                              }}
                              className="p-1 hover:bg-red-50 text-red-500 rounded-lg cursor-pointer"
                              title="રો કાઢો"
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
          )}
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 4: AI TIMETABLE SCANNER (ટાઈમટેબલ અપલોડ & સ્કેનિંગ)
          ========================================================================= */}
      {activeSubTab === 'ai_timetable' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="glass-card rounded-2xl p-5 border border-purple-200 dark:border-purple-800/40 bg-gradient-to-br from-purple-50/50 via-white to-indigo-50/50 dark:from-purple-950/20 dark:via-slate-900 dark:to-indigo-950/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    AI ટાઈમટેબલ સ્કેનર (Multimodal Document Scanner)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    પરીક્ષા ટાઈમટેબલનો ફોટો અથવા PDF અપલોડ કરો. AI આપોઆપ તારીખો અને વિષયો શોધીને ખંડ નિરીક્ષણ અને ઉત્તરવહી ચકાસણીમાં લાવી દેશે.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={aiUploading}
                  className={`px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm shadow-purple-600/20 cursor-pointer ${
                    aiUploading ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>{aiUploading ? 'સ્કેન થઈ રહ્યું છે...' : 'ટાઈમટેબલ PDF / ફોટો અપલોડ કરો'}</span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {aiError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{aiError}</span>
              </div>
            )}

            {/* Success Message */}
            {aiSuccessMessage && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{aiSuccessMessage}</span>
              </div>
            )}
          </div>

          {/* Fallback Text Input Method */}
          <div className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/90 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              <span>અથવા ટાઈમટેબલનું લખાણ અહીં પેસ્ટ કરો (Text Paste):</span>
            </h3>
            <textarea
              rows={3}
              value={timetableText}
              onChange={(e) => setTimetableText(e.target.value)}
              placeholder="દા.ત. 06-04-2026 સોમવાર ધોરણ 9 વિજ્ઞાન, 07-04-2026 મંગળવાર ધોરણ 9 ગણિત, ધોરણ 10 ગુજરાતી..."
              className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleExtractFromText}
              disabled={aiUploading || !timetableText.trim()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>લખાણમાંથી તારીખો અને વિષયો અલગ કરો</span>
            </button>
          </div>

          {/* Timetable Rows Display */}
          <div className="glass-card rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden bg-white dark:bg-slate-900/90 shadow-xs">
            <div className="p-4 border-b border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  પરીક્ષા સમયપત્રક યાદી ({timetable.length} સેશન્સ)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const newEntry: TimetableEntry = {
                      id: `tt_${Date.now()}`,
                      date: '',
                      day: '',
                      standard: availableStandards[0] || '9',
                      subject: '',
                      time: '11:00 થી 02:00',
                    };
                    setTimetable([...timetable, newEntry]);
                  }}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>હાથેથી એન્ટ્રી ઉમેરો</span>
                </button>
              </div>
            </div>

            {timetable.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                <Calendar className="w-8 h-8 mx-auto text-slate-300 stroke-1" />
                <p>કોઈ ટાઈમટેબલ ઉપલબ્ધ નથી. ઉપર આપેલ બટનથી PDF અથવા ફોટો અપલોડ કરો.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 font-bold text-slate-700 dark:text-slate-300">
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3 w-32">તારીખ</th>
                      <th className="py-2.5 px-3 w-28">વાર</th>
                      <th className="py-2.5 px-3 w-20 text-center">ધોરણ</th>
                      <th className="py-2.5 px-3">વિષય</th>
                      <th className="py-2.5 px-3 w-36">સમય</th>
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
                              const updated = [...timetable];
                              updated[idx].date = e.target.value;
                              setTimetable(updated);
                            }}
                            className="w-full px-2 py-1 text-xs font-semibold rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800"
                            placeholder="DD-MM-YYYY"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={tt.day || ''}
                            onChange={(e) => {
                              const updated = [...timetable];
                              updated[idx].day = e.target.value;
                              setTimetable(updated);
                            }}
                            className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800"
                            placeholder="સોમવાર..."
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="text"
                            value={tt.standard}
                            onChange={(e) => {
                              const updated = [...timetable];
                              updated[idx].standard = e.target.value;
                              setTimetable(updated);
                            }}
                            className="w-14 text-center px-1 py-1 text-xs font-bold rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={tt.subject}
                            onChange={(e) => {
                              const updated = [...timetable];
                              updated[idx].subject = e.target.value;
                              setTimetable(updated);
                            }}
                            className="w-full px-2 py-1 text-xs font-bold rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800"
                            placeholder="વિષયનું નામ..."
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={tt.time || ''}
                            onChange={(e) => {
                              const updated = [...timetable];
                              updated[idx].time = e.target.value;
                              setTimetable(updated);
                            }}
                            className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800"
                            placeholder="11:00 થી 02:00"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setTimetable(timetable.filter((_, i) => i !== idx));
                            }}
                            className="p-1 hover:bg-red-50 text-red-500 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: BLOCK SETUP & STUDENT ALLOCATION (ક્યા બ્લોકમાં ક્યા વિદ્યાર્થીઓ રાખવા)
          ========================================================================= */}
      {showBlockEditorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[92vh] rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/30 dark:from-slate-850 dark:to-indigo-950/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {editingBlockId ? 'બ્લોક એડિટ & વિદ્યાર્થીઓની ફાળવણી' : 'નવો બ્લોક બનાવો & વિદ્યાર્થીઓ પસંદ કરો'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    ક્યા બ્લોકમાં ક્યા ધોરણના કેટલા વિદ્યાર્થીઓ રાખવા તે અહીંથી સરળતાથી પસંદ કરો
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBlockEditorModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
              {/* Block Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    બ્લોક નંબર:
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editorBlockNumber}
                    onChange={(e) => {
                      const num = parseInt(e.target.value, 10) || 1;
                      setEditorBlockNumber(num);
                      setEditorBlockName(`બ્લોક નં. ${String(num).padStart(2, '0')}`);
                    }}
                    className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    બ્લોક નામ:
                  </label>
                  <input
                    type="text"
                    value={editorBlockName}
                    onChange={(e) => setEditorBlockName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    placeholder="દા.ત. બ્લોક નં. 01"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    રૂમ / વર્ગખંડ:
                  </label>
                  <input
                    type="text"
                    value={editorRoomName}
                    onChange={(e) => setEditorRoomName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    placeholder="દા.ત. રૂમ નં. 12"
                  />
                </div>
              </div>

              {/* Sections / Standards Configuration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>આ બ્લોકમાં વિદ્યાર્થીઓની ફાળવણી (Class Allocation):</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddSectionToEditor}
                    className="px-3 py-1 text-xs font-bold rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>બીજું ધોરણ ઉમેરો (Add Standard)</span>
                  </button>
                </div>

                {editorSections.map((sec, sIdx) => {
                  const stdStudents = studentsByStandard[sec.standard] || [];
                  const unassignedCount = stdStudents.filter((st) => !studentToBlockMap[st.id]).length;
                  const alreadyAssignedCount = stdStudents.length - unassignedCount;

                  const query = (studentSearchQuery[sec.standard] || '').toLowerCase().trim();
                  let filteredStudents = stdStudents.filter(
                    (s) =>
                      s.studentName.toLowerCase().includes(query) ||
                      (s.rollNumber && s.rollNumber.includes(query))
                  );

                  if (sec.onlyUnassignedFilter) {
                    filteredStudents = filteredStudents.filter((st) => !studentToBlockMap[st.id]);
                  }

                  // Find min and max unassigned rolls for quick fill
                  const unassignedRolls = stdStudents
                    .filter((st) => !studentToBlockMap[st.id])
                    .map((st) => parseInt(st.rollNumber || '0', 10))
                    .filter((r) => r > 0)
                    .sort((a, b) => a - b);
                  const minUnassignedRoll = unassignedRolls.length > 0 ? unassignedRolls[0] : 1;
                  const maxUnassignedRoll = unassignedRolls.length > 0 ? unassignedRolls[unassignedRolls.length - 1] : stdStudents.length;

                  return (
                    <div
                      key={sIdx}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 shadow-xs space-y-3.5"
                    >
                      {/* Section Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-white/5 pb-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            ધોરણ પસંદ કરો:
                          </span>
                          <select
                            value={sec.standard}
                            onChange={(e) => {
                              const newStd = e.target.value;
                              const availList = (studentsByStandard[newStd] || []).filter((st) => !studentToBlockMap[st.id]);
                              const defaultCount = Math.min(availList.length > 0 ? availList.length : (studentsByStandard[newStd] || []).length, 14);
                              handleUpdateSectionConfig(sIdx, {
                                standard: newStd,
                                fromRoll: 1,
                                toRoll: defaultCount,
                                count: defaultCount,
                              });
                            }}
                            className="px-2.5 py-1 text-xs font-black rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 cursor-pointer"
                          >
                            {availableStandards.map((st) => {
                              const totalSt = (studentsByStandard[st] || []).length;
                              const unassignedSt = (studentsByStandard[st] || []).filter((s) => !studentToBlockMap[s.id]).length;
                              return (
                                <option key={st} value={st}>
                                  ધોરણ {st} (કુલ: {totalSt} • બાકી ઉપલબ્ધ: {unassignedSt})
                                </option>
                              );
                            })}
                          </select>

                          {/* Quick summary pill */}
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                              ✓ બાકી ઉપલબ્ધ: {unassignedCount}
                            </span>
                            {alreadyAssignedCount > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                                📌 અન્ય બ્લોકમાં: {alreadyAssignedCount}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Selection Mode Selector */}
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => handleUpdateSectionConfig(sIdx, { mode: 'range' })}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg cursor-pointer ${
                              sec.mode === 'range' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                          >
                            ૧. રોલ રેન્જ
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateSectionConfig(sIdx, { mode: 'count' })}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg cursor-pointer ${
                              sec.mode === 'count' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                          >
                            ૨. સંખ્યા મુજબ
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateSectionConfig(sIdx, { mode: 'manual' })}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg cursor-pointer ${
                              sec.mode === 'manual' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                          >
                            ૩. એક-એક વિદ્યાર્થી (Checkboxes)
                          </button>
                        </div>

                        {editorSections.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSectionFromEditor(sIdx)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                            title="આ ધોરણ કાઢો"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Mode A: Roll Range */}
                      {sec.mode === 'range' && (
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              રોલ નંબર રેન્જ:
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span>રોલ નં.</span>
                              <input
                                type="number"
                                min={1}
                                value={sec.fromRoll}
                                onChange={(e) =>
                                  handleUpdateSectionConfig(sIdx, { fromRoll: parseInt(e.target.value, 10) || 1 })
                                }
                                className="w-16 px-2 py-1 text-center font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800"
                              />
                              <span>થી</span>
                              <input
                                type="number"
                                min={sec.fromRoll}
                                value={sec.toRoll}
                                onChange={(e) =>
                                  handleUpdateSectionConfig(sIdx, { toRoll: parseInt(e.target.value, 10) || sec.fromRoll })
                                }
                                className="w-16 px-2 py-1 text-center font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800"
                              />
                            </div>

                            {unassignedRolls.length > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateSectionConfig(sIdx, {
                                    fromRoll: minUnassignedRoll,
                                    toRoll: maxUnassignedRoll,
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold hover:bg-indigo-100 cursor-pointer"
                                title="બાકી રહેલા રોલ નંબરો આપોઆપ પસંદ કરો"
                              >
                                ✨ બાકી રોલ ({minUnassignedRoll} થી {maxUnassignedRoll}) લો
                              </button>
                            )}
                          </div>

                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
                            પસંદ થયા: {sec.manualSelectedIds.length} વિદ્યાર્થીઓ
                          </span>
                        </div>
                      )}

                      {/* Mode B: Count */}
                      {sec.mode === 'count' && (
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              ધોરણ {sec.standard} માંથી કેટલા વિદ્યાર્થીઓ લેવા?
                            </span>
                            <input
                              type="number"
                              min={1}
                              max={stdStudents.length}
                              value={sec.count}
                              onChange={(e) =>
                                handleUpdateSectionConfig(sIdx, { count: parseInt(e.target.value, 10) || 0 })
                              }
                              className="w-20 px-2 py-1 text-center font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800"
                            />
                            <span className="text-slate-500">
                              (કુલ: {stdStudents.length})
                            </span>

                            {unassignedCount > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateSectionConfig(sIdx, { count: unassignedCount })
                                }
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-100 cursor-pointer"
                              >
                                ✨ બાકી રહેલા ({unassignedCount}) લો
                              </button>
                            )}
                          </div>

                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
                            પસંદ થયા: {sec.manualSelectedIds.length} વિદ્યાર્થીઓ
                          </span>
                        </div>
                      )}

                      {/* Mode C: Manual Checkboxes */}
                      {sec.mode === 'manual' && (
                        <div className="space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="relative flex-1 min-w-[200px] max-w-xs">
                              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                              <input
                                type="text"
                                placeholder="વિદ્યાર્થી અથવા રોલ નંબર શોધો..."
                                value={studentSearchQuery[sec.standard] || ''}
                                onChange={(e) =>
                                  setStudentSearchQuery({
                                    ...studentSearchQuery,
                                    [sec.standard]: e.target.value,
                                  })
                                }
                                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800"
                              />
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {/* Toggle unassigned filter */}
                              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-slate-200">
                                <input
                                  type="checkbox"
                                  checked={!!sec.onlyUnassignedFilter}
                                  onChange={(e) =>
                                    handleUpdateSectionConfig(sIdx, { onlyUnassignedFilter: e.target.checked })
                                  }
                                  className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
                                />
                                <span>ફક્ત બાકી રહેલા ({unassignedCount})</span>
                              </label>

                              {unassignedCount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const unassignedIds = stdStudents.filter((st) => !studentToBlockMap[st.id]).map((s) => s.id);
                                    handleUpdateSectionConfig(sIdx, {
                                      manualSelectedIds: unassignedIds,
                                      count: unassignedIds.length,
                                    });
                                  }}
                                  className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                                >
                                  ✨ બાકી તમામ પસંદ કરો
                                </button>
                              )}
                              <span className="text-slate-300">•</span>
                              <button
                                type="button"
                                onClick={() => handleToggleAllStudentsInSection(sIdx, true)}
                                className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                              >
                                બધા પસંદ કરો
                              </button>
                              <span className="text-slate-300">•</span>
                              <button
                                type="button"
                                onClick={() => handleToggleAllStudentsInSection(sIdx, false)}
                                className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                              >
                                અનસિલેક્ટ
                              </button>
                            </div>
                          </div>

                          <div className="max-h-52 overflow-y-auto border border-slate-200 dark:border-white/10 rounded-xl divide-y divide-slate-100 dark:divide-white/5 text-xs">
                            {filteredStudents.length === 0 ? (
                              <div className="p-4 text-center text-slate-400">
                                કોઈ વિદ્યાર્થી મળ્યા નથી.
                              </div>
                            ) : (
                              filteredStudents.map((st) => {
                                const isChecked = sec.manualSelectedIds.includes(st.id);
                                const assignedToOtherBlock = studentToBlockMap[st.id];

                                return (
                                  <label
                                    key={st.id}
                                    className={`px-3 py-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors ${
                                      isChecked ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleToggleStudentSelection(sIdx, st.id)}
                                        className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                                      />
                                      <span className="w-8 font-bold text-slate-500">
                                        #{st.rollNumber || '-'}
                                      </span>
                                      <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">
                                        {st.studentName}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {assignedToOtherBlock ? (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                          📌 {assignedToOtherBlock} માં છે
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                          ✓ ઉપલબ્ધ
                                        </span>
                                      )}
                                      <span className="text-[10px] text-slate-400 font-medium">
                                        ધોરણ {sec.standard}
                                      </span>
                                    </div>
                                  </label>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Live Preview Summary Box */}
              <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 block">
                    આ બ્લોકમાં કુલ ફાળવણી સારાંશ:
                  </span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {resolvedEditorSections.map((s, idx) => (
                      <span key={idx} className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                        ધોરણ {s.standard}: {s.students.length} વિદ્યાર્થીઓ
                        {idx < resolvedEditorSections.length - 1 ? ' • ' : ''}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block">
                    કુલ વિદ્યાર્થીઓ:
                  </span>
                  <span className="text-xl font-black text-indigo-900 dark:text-white">
                    {editorTotalAllotted}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-white/10 flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-850">
              <button
                type="button"
                onClick={() => setShowBlockEditorModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10 cursor-pointer"
              >
                રદ કરો
              </button>
              <button
                type="button"
                onClick={handleSaveBlockFromEditor}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>બ્લોક સેવ કરો (Save Block)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: AUTO BLOCK GENERATOR WIZARD
          ========================================================================= */}
      {showAutoBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    ઓટો બ્લોક જનરેશન વિઝાર્ડ
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    શાળાના તમામ વિદ્યાર્થીઓને સ્વચાલિત રીતે બ્લોકમાં ફાળવો
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAutoBlockModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Select Standards to Distribute */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  ક્યા ક્યા ધોરણના વિદ્યાર્થીઓ વહેંચવા છે?
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableStandards.map((std) => {
                    const isChecked = wizardSelectedStds.includes(std);
                    const count = (studentsByStandard[std] || []).length;
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
                        className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                        <span>ધોરણ {std} ({count} છાત્રો)</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Capacity per block */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  દરેક બ્લોકની ક્ષમતા (વિદ્યાર્થી સંખ્યા):
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={10}
                    max={50}
                    value={wizardCapacity}
                    onChange={(e) => setWizardCapacity(parseInt(e.target.value, 10) || 27)}
                    className="w-24 px-3 py-1.5 font-bold rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800"
                  />
                  <div className="flex items-center gap-1.5">
                    {[24, 27, 30].map((cap) => (
                      <button
                        key={cap}
                        type="button"
                        onClick={() => setWizardCapacity(cap)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                          wizardCapacity === cap
                            ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {cap} વિદ્યાર્થી
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mode: Mixed vs Sequential */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  ફાળવણી પદ્ધતિ:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWizardMode('mixed')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      wizardMode === 'mixed'
                        ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/20'
                        : 'border-slate-200 dark:border-white/10'
                    }`}
                  >
                    <div className="font-bold text-slate-900 dark:text-white">
                      બે ધોરણ મિક્સ (Alternate)
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      દા.ત. ૧૪ છાત્ર ધોરણ ૧૧ + ૧૩ છાત્ર ધોરણ ૯ (GSEB સ્ટાન્ડર્ડ)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWizardMode('sequential')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      wizardMode === 'sequential'
                        ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/20'
                        : 'border-slate-200 dark:border-white/10'
                    }`}
                  >
                    <div className="font-bold text-slate-900 dark:text-white">
                      સળંગ ધોરણવાર (Sequential)
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      પહેલા ધોરણ ૯ ના બધા, પછી ધોરણ ૧૦ ના સળંગ
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
              <button
                type="button"
                onClick={() => setShowAutoBlockModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                રદ કરો
              </button>
              <button
                type="button"
                onClick={handleRunAutoBlockWizard}
                className="px-4 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md shadow-purple-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>બ્લોક બનાવો (Generate)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: LIVE PRINT PREVIEW FOR A BLOCK
          ========================================================================= */}
      {previewBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[92vh] rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-slate-900 dark:text-white">
                  પ્રિવ્યૂ: {previewBlock.blockName} ({school.schoolName || 'શ્રી શાળા'})
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-700">
                  {pageSize.toUpperCase()} સાઇઝ
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadSingleBlock(previewBlock)}
                  className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF ડાઉનલોડ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewBlock(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 bg-slate-100 dark:bg-black/30 flex justify-center">
              <div className="bg-white text-black p-6 rounded-lg shadow-md w-full max-w-[700px] text-xs font-sans space-y-4">
                <div className="text-center border-b-2 border-black pb-2">
                  <h2 className="text-base font-black uppercase">
                    {school.schoolName || 'શ્રી શાળા'}
                  </h2>
                  <div className="font-bold text-xs">
                    {examTitle} • {monthYear}
                  </div>
                  <div className="font-extrabold text-sm underline mt-1">
                    બ્લોક વિદ્યાર્થી હાજરી પત્રક
                  </div>
                </div>

                <div className="flex justify-between font-bold border-b border-black pb-1">
                  <span>{previewBlock.blockName} ({previewBlock.roomName})</span>
                  <span>કુલ સંખ્યા: {previewBlock.totalAllotted}</span>
                </div>

                <div className="space-y-3">
                  {previewBlock.sections.map((sec, idx) => (
                    <div key={idx}>
                      <div className="font-bold bg-slate-200 px-2 py-1 mb-1">
                        ધોરણ: {sec.standard} ({sec.students.length} વિદ્યાર્થીઓ)
                      </div>
                      <table className="w-full border-collapse border border-black text-[11px]">
                        <thead>
                          <tr className="bg-slate-100 border-b border-black">
                            <th className="border border-black p-1 w-8 text-center">ક્રમ</th>
                            <th className="border border-black p-1 w-12 text-center">રોલ નં.</th>
                            <th className="border border-black p-1 text-left">વિદ્યાર્થીનું નામ</th>
                            <th className="border border-black p-1 w-20 text-center">પૂરવણી નં.</th>
                            <th className="border border-black p-1 w-20 text-center">સહી</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sec.students.map((st, sIdx) => (
                            <tr key={sIdx} className="border-b border-slate-300">
                              <td className="border border-black p-1 text-center font-bold">
                                {sIdx + 1}
                              </td>
                              <td className="border border-black p-1 text-center font-bold">
                                {st.rollNumber}
                              </td>
                              <td className="border border-black p-1 uppercase font-semibold">
                                {st.studentName}
                              </td>
                              <td className="border border-black p-1 text-center">&nbsp;</td>
                              <td className="border border-black p-1 text-center">&nbsp;</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
