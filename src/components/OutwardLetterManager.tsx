import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { School, OutwardLetter, OutwardLetterSettings } from '../types';
import {
  getOutwardLetters,
  subscribeToOutwardLetters,
  saveOutwardLetter,
  deleteOutwardLetter,
  getOutwardSettings,
  saveOutwardSettings,
} from '../services/outwardLetterService';
import { printHtmlDocument } from '../utils/printAndPdfUtils';
import { toGujaratiDigits } from '../services/dailyKnowledgeService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  FileText,
  Printer,
  Download,
  Upload,
  Trash2,
  Edit3,
  Copy,
  Plus,
  Eye,
  Settings,
  PenTool,
  Sparkles,
  Search,
  ArrowLeft,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  Sliders,
  X,
  MoveVertical,
  Check,
} from 'lucide-react';

interface OutwardLetterManagerProps {
  school: School;
  onBack: () => void;
}

// Pre-configured official Gujarati School Letter Templates
const LETTER_TEMPLATES = [
  {
    title: '૧. શિષ્યવૃત્તિ દરખાસ્ત પત્ર',
    subject: 'ધોરણ ૯ થી ૧૨ ના પાત્રતા ધરાવતા વિદ્યાર્થીઓની શિષ્યવૃત્તિ દરખાસ્ત મંજૂરી અર્થે મોકલવા બાબત.',
    content: `સવિનય ઉપરોક્ત વિષય અન્વયે જણાવવાનું કે, ચાલુ શૈક્ષણિક વર્ષ માટે અમારી શાળામાં અભ્યાસ કરતા ધોરણ ૯ થી ૧૨ ના સામાજિક અને શૈક્ષણિક રીતે પછાત વર્ગ (SEBC), અનુસૂચિત જાતિ (SC), અનુસૂચિત જનજાતિ (ST) તેમજ આર્થિક રીતે નબળા વર્ગ (EWS) ના પાત્રતા ધરાવતા વિદ્યાર્થીઓની શિષ્યવૃત્તિની નિયત નમૂનાની દરખાસ્ત તથા જરૂરી પ્રમાણિત આધાર-પુરાવાઓ આ સાથે સામેલ રાખી આપશ્રીની કચેરીએ આગળની જરૂરી મંજૂરી અર્થે મોકલી આપેલ છે.

જે ધ્યાને લઈ સદર દરખાસ્ત માન્ય રાખી વિદ્યાર્થીઓના બેંક ખાતામાં શિષ્યવૃત્તિની રકમ જમા કરવા નમ્ર વિનંતી છે.`,
  },
  {
    title: '૨. ગ્રાન્ટ વપરાશ પ્રમાણપત્ર (UC)',
    subject: 'શાળા સંકુલ ગ્રાન્ટ વપરાશ પ્રમાણપત્ર (Utilization Certificate) રજૂ કરવા બાબત.',
    content: `સવિનય ઉપરોક્ત વિષય અન્વયે સવિનય જણાવવાનું કે, ચાલુ નાણાકીય વર્ષ દરમિયાન આપશ્રીની કચેરી દ્વારા અમારી શાળાને મંજૂર કરવામાં આવેલ શાળા વિકાસ ગ્રાન્ટ / વાર્ષિક નિભાવ ગ્રાન્ટની ફાળવેલ રકમનો નિયમાનુસાર યોગ્ય ઉપયોગ કરવામાં આવેલ છે.

સદર ગ્રાન્ટના ખર્ચનું ઓડિટેડ હિસાબ પત્રક તથા ગ્રાન્ટ વપરાશ પ્રમાણપત્ર (UC) આ પત્ર સાથે સામેલ રાખી રજૂ કરેલ છે. જે સ્વીકારવા નમ્ર વિનંતી છે.`,
  },
  {
    title: '૩. પરીક્ષા કેન્દ્ર વિગત પત્ર',
    subject: 'બોર્ડ / વાર્ષિક પરીક્ષા કેન્દ્ર પર ખંડ નિરીક્ષકો અને બેઠક વ્યવસ્થાની વિગતો મોકલવા બાબત.',
    content: `સવિનય ઉપરોક્ત વિષય અને સંદર્ભ અન્વયે જણાવવાનું કે, આગામી માર્ચ/વાર્ષિક પરીક્ષા માટે અમારી શાળાને ફાળવવામાં આવેલ પરીક્ષા કેન્દ્રની સંપૂર્ણ તૈયારીઓ પૂર્ણ કરી લેવામાં આવેલ છે.

પરીક્ષા કેન્દ્ર પર નિયુક્ત કરવામાં આવેલ ખંડ નિરીક્ષકોની યાદી, બેઠક વ્યવસ્થા પ્લાન તથા સીસીટીવી કેમેરા કાર્યરત હોવાનું પ્રમાણપત્ર આ સાથે આપશ્રીની કચેરીએ માહિતિ અર્થે રવાના કરેલ છે.`,
  },
  {
    title: '૪. વાલી સંમેલન આમંત્રણ પત્ર',
    subject: 'શાળા ખાતે યોજાનાર વાર્ષિક વાલી સંમેલન અને પરિણામ વિતરણ કાર્યક્રમમાં ઉપસ્થિત રહેવા બાબત.',
    content: `સાદર પ્રણામ. આપશ્રીના પાલ્યના શૈક્ષણિક વિકાસ, પ્રગતિ અને વાર્ષિક મૂલ્યાંકન સંદર્ભે ચર્ચા-વિચારણા કરવા તેમજ વાર્ષિક પરીક્ષાનું પરિણામ પત્રક વિતરણ કરવા માટે શાળા કક્ષાએ એક વાલી સંમેલનનું આયોજન કરવામાં આવેલ છે.

આપશ્રીને આ સંમેલનમાં અચૂક ઉપસ્થિત રહી વિદ્યાર્થીના ઉજ્જવળ ભવિષ્ય અંગે ઉપયોગી માર્ગદર્શન મેળવવા અને આપના રચનાત્મક સૂચનો જણાવવા હાર્દિક નિમંત્રણ પાઠવવામાં આવે છે.`,
  },
  {
    title: '૫. સામાન્ય વિનંતી / રજૂઆત પત્ર',
    subject: 'શાળાના ભૌતિક સાધનો અને સુવિધાઓની પૂર્તતા કરવા બાબત.',
    content: `સવિનય ઉપરોક્ત વિષય અન્વયે જણાવવાનું કે, અમારી શાળામાં વિદ્યાર્થીઓની સંખ્યા અને શૈક્ષણિક ગુણવત્તામાં ઉત્તરોત્તર વધારો થઈ રહ્યો છે. શાળામાં શિક્ષણ કાર્ય વધુ સુચારુ અને ગુણવત્તાસભર બને તે હેતુથી વધારાના વર્ગખંડો, પીવાના શુદ્ધ પાણીની વ્યવસ્થા તેમજ કમ્પ્યુટર લેબ સંબંધિત જરૂરી સાધનોની તાતી જરૂરિયાત છે.

આપશ્રી સમક્ષ આ પત્ર દ્વારા નમ્ર રજૂઆત છે કે સદર બાબતે યોગ્ય સર્વે કરાવી ઘટતી સુવિધાઓ મંજૂર કરી આપવા કૃપા કરશો.`,
  },
];

// Quick Recipient Presets for Gujarat Education Department
const RECIPIENT_PRESETS = [
  { name: 'માનનીય જિલ્લા શિક્ષણાધિકારીશ્રીની કચેરી', address: 'જિલ્લા શિક્ષણાધિકારીશ્રીની કચેરી' },
  { name: 'માનનીય જિલ્લા પ્રાથમિક શિક્ષણાધિકારીશ્રીની કચેરી (DPEO)', address: 'જિલ્લા પંચાયત શિક્ષણ શાખા' },
  { name: 'તાલુકા પ્રાથમિક શિક્ષણાધિકારીશ્રીની કચેરી (TPEO)', address: 'તાલુકા પંચાયત કચેરી' },
  { name: 'BRC કો-ઓર્ડિનેટરશ્રી, બ્લોક રિસોર્સ સેન્ટર', address: 'તાલુકા શિક્ષણ ભવન' },
  { name: 'CRC કો-ઓર્ડિનેટરશ્રી, ક્લસ્ટર રિસોર્સ સેન્ટર', address: 'શાળા સંકુલ ક્લસ્ટર' },
  { name: 'મામલતદારશ્રીની કચેરી (જનસેવા કેન્દ્ર)', address: 'તાલુકા સેવાસદન' },
  { name: 'માનનીય સરપંચશ્રી / તલાટી કમ મંત્રીશ્રી', address: 'ગ્રામ પંચાયત કચેરી' },
  { name: 'વાલીશ્રી / વાલી મંડળ', address: 'વિદ્યાર્થી વાલી સંપર્ક' },
];

export const OutwardLetterManager: React.FC<OutwardLetterManagerProps> = ({
  school,
  onBack,
}) => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'register' | 'new_letter' | 'settings'>('register');

  // Letters state
  const [letters, setLetters] = useState<OutwardLetter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Settings state (Letterhead, Sign, Margins)
  const [settings, setSettings] = useState<OutwardLetterSettings>({
    topMarginMm: 62, // Defaults calibrated for standard official letterheads
    bottomMarginMm: 32, // Defaults calibrated to clear standard footers
    leftMarginMm: 22,
    rightMarginMm: 22,
    outwardPrefix: 'શાળા/જાવક',
    principalDesignation: 'આચાર્યશ્રી',
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState(false);

  // New Letter Form State
  const [editingLetterId, setEditingLetterId] = useState<string | null>(null);
  const [outwardNumber, setOutwardNumber] = useState('');
  const [letterDate, setLetterDate] = useState(() => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${yyyy}-${mm}-${dd}`;
  });
  const [useGujaratiDigitsInDate, setUseGujaratiDigitsInDate] = useState(true);
  const [recipientName, setRecipientName] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [subject, setSubject] = useState('');
  const [reference, setReference] = useState('');
  const [content, setContent] = useState('');
  const [copyToList, setCopyToList] = useState<string[]>([]);
  const [newCopyInput, setNewCopyInput] = useState('');
  const [signatoryName, setSignatoryName] = useState('');
  const [signatoryDesignation, setSignatoryDesignation] = useState('આચાર્યશ્રી');

  // Preview / Print Modal State
  const [previewLetter, setPreviewLetter] = useState<OutwardLetter | null>(null);
  const [previewWithSign, setPreviewWithSign] = useState<boolean>(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const letterA4Ref = useRef<HTMLDivElement>(null);

  // Digital Signature Canvas State
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Drag Margin Adjustment Canvas Ref
  const dragCanvasRef = useRef<HTMLDivElement>(null);
  const [draggingGuide, setDraggingGuide] = useState<'top' | 'bottom' | null>(null);

  // Load Settings and Letters on Mount
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (school?.id) {
      // 1. Fetch settings
      getOutwardSettings(school.id).then((saved) => {
        setSettings((prev) => ({
          ...prev,
          ...saved,
          topMarginMm: saved.topMarginMm ?? 62,
          bottomMarginMm: saved.bottomMarginMm ?? 32,
          leftMarginMm: saved.leftMarginMm ?? 22,
          rightMarginMm: saved.rightMarginMm ?? 22,
          principalName: saved.principalName || school.principalName || '',
          principalDesignation: saved.principalDesignation || 'આચાર્યશ્રી',
        }));
        if (!signatoryName) {
          setSignatoryName(saved.principalName || school.principalName || '');
        }
      });

      // 2. Real-time subscribe to outward letters
      unsubscribe = subscribeToOutwardLetters(school.id, (list) => {
        setLetters(list);
        setIsLoading(false);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [school?.id]);

  // Next Auto Outward Number Generator
  const generateNextOutwardNumber = useCallback(() => {
    const prefix = settings.outwardPrefix || 'શાળા/જાવક';
    const year = school.academicYear || '૨૦૨૬-૨૭';
    const nextSeq = letters.length + 1;
    return `${prefix}/${year}/${nextSeq}`;
  }, [settings.outwardPrefix, school.academicYear, letters.length]);

  // Switch to New Letter tab
  const handleStartNewLetter = () => {
    setEditingLetterId(null);
    setOutwardNumber(generateNextOutwardNumber());
    setRecipientName('');
    setRecipientAddress('');
    setSubject(LETTER_TEMPLATES[0].subject);
    setReference('');
    setContent(LETTER_TEMPLATES[0].content);
    setCopyToList([]);
    setSignatoryName(settings.principalName || school.principalName || '');
    setSignatoryDesignation(settings.principalDesignation || 'આચાર્યશ્રી');
    setActiveTab('new_letter');
  };

  // Edit existing letter
  const handleEditLetter = (item: OutwardLetter) => {
    setEditingLetterId(item.id);
    setOutwardNumber(item.outwardNumber);
    setLetterDate(item.letterDate);
    setRecipientName(item.recipientName);
    setRecipientAddress(item.recipientAddress || '');
    setSubject(item.subject);
    setReference(item.reference || '');
    setContent(item.content);
    setCopyToList(item.copyTo || []);
    setSignatoryName(item.signatoryName || settings.principalName || school.principalName || '');
    setSignatoryDesignation(item.signatoryDesignation || 'આચાર્યશ્રી');
    setActiveTab('new_letter');
  };

  // Duplicate letter as new
  const handleDuplicateLetter = (item: OutwardLetter) => {
    setEditingLetterId(null);
    setOutwardNumber(generateNextOutwardNumber());
    setRecipientName(item.recipientName);
    setRecipientAddress(item.recipientAddress || '');
    setSubject(item.subject);
    setReference(item.reference || '');
    setContent(item.content);
    setCopyToList(item.copyTo || []);
    setSignatoryName(settings.principalName || school.principalName || '');
    setSignatoryDesignation(settings.principalDesignation || 'આચાર્યશ્રી');
    setActiveTab('new_letter');
  };

  // Delete letter
  const handleDeleteLetter = async (id: string, outNo: string) => {
    if (window.confirm(`શું તમે ખરેખર જાવક પત્ર નં. ${outNo} રદ (Delete) કરવા માંગો છો?`)) {
      try {
        await deleteOutwardLetter(school.id, id);
      } catch (err) {
        alert('પત્ર ડિલીટ કરવામાં ક્ષતિ આવી.');
      }
    }
  };

  // Add Copy To item
  const handleAddCopyTo = () => {
    if (!newCopyInput.trim()) return;
    setCopyToList((prev) => [...prev, newCopyInput.trim()]);
    setNewCopyInput('');
  };

  const handleRemoveCopyTo = (idx: number) => {
    setCopyToList((prev) => prev.filter((_, i) => i !== idx));
  };

  // Apply Template
  const handleApplyTemplate = (tpl: typeof LETTER_TEMPLATES[0]) => {
    if (content.trim() && !window.confirm('હાલ લખેલું લખાણ પસંદ કરેલ નમૂનાથી બદલવું છે?')) {
      return;
    }
    setSubject(tpl.subject);
    setContent(tpl.content);
  };

  // Save Current Letter
  const handleSaveLetter = async (): Promise<OutwardLetter | null> => {
    if (!outwardNumber.trim()) {
      alert('કૃપા કરીને જાવક નંબર દાખલ કરો.');
      return null;
    }
    if (!recipientName.trim()) {
      alert('કૃપા કરીને પ્રતિ (મેળવનાર) ની વિગત દાખલ કરો.');
      return null;
    }
    if (!subject.trim()) {
      alert('કૃપા કરીને પત્રનો વિષય દાખલ કરો.');
      return null;
    }
    if (!content.trim()) {
      alert('કૃપા કરીને પત્રનું મુખ્ય લખાણ દાખલ કરો.');
      return null;
    }

    const docId = editingLetterId || `out_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newDoc: OutwardLetter = {
      id: docId,
      schoolId: school.id,
      outwardNumber: outwardNumber.trim(),
      letterDate,
      recipientName: recipientName.trim(),
      recipientAddress: recipientAddress.trim() || undefined,
      subject: subject.trim(),
      reference: reference.trim() || undefined,
      content: content.trim(),
      copyTo: copyToList.length > 0 ? copyToList : undefined,
      signatoryName: signatoryName.trim() || settings.principalName || school.principalName || '',
      signatoryDesignation: signatoryDesignation.trim() || 'આચાર્યશ્રી',
      createdAt: editingLetterId ? (letters.find((l) => l.id === editingLetterId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveOutwardLetter(school.id, newDoc);
      return newDoc;
    } catch (err) {
      console.error(err);
      alert('પત્ર સેવ કરવામાં ક્ષતિ આવી.');
      return null;
    }
  };

  // Open Preview Modal (With Sign / Without Sign)
  const handleOpenPreview = async (withSign: boolean) => {
    const saved = await handleSaveLetter();
    if (saved) {
      setPreviewLetter(saved);
      setPreviewWithSign(withSign);
    }
  };

  // Handle Letterhead PNG Upload
  const handleLetterheadUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('કૃપા કરીને માત્ર PNG અથવા JPG ઈમેજ ફાઈલ પસંદ કરો.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setSettings((prev) => ({ ...prev, letterheadUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  // Handle Signature Image Upload
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setSettings((prev) => ({ ...prev, principalSignUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  // Digital Signature Canvas Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const drawSignature = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a'; // dark ink
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignatureCanvas = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveCanvasSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setSettings((prev) => ({ ...prev, principalSignUrl: dataUrl }));
    alert('✅ સહી સેવ થઈ ગઈ છે.');
  };

  // Save Settings to Firestore
  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await saveOutwardSettings(school.id, settings);
      setSettingsSavedMsg(true);
      setTimeout(() => setSettingsSavedMsg(false), 3000);
    } catch (err) {
      alert('સેટિંગ્સ સાચવવામાં ક્ષતિ આવી.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Format date display (DD/MM/YYYY) in English or Gujarati digits
  const formatDateDisplay = useCallback((isoDate: string, inGujarati = false) => {
    if (!isoDate) return '-';
    try {
      const parts = isoDate.split('-');
      if (parts.length === 3) {
        const d = `${parts[2]}/${parts[1]}/${parts[0]}`;
        return inGujarati ? toGujaratiDigits(d) : d;
      }
      return isoDate;
    } catch (e) {
      return isoDate;
    }
  }, []);

  // =========================================================================
  // INTERACTIVE DRAG MARGIN CALCULATION ENGINE
  // =========================================================================
  const handlePointerDownGuide = (guide: 'top' | 'bottom', e: React.PointerEvent) => {
    e.preventDefault();
    setDraggingGuide(guide);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMoveGuide = (e: React.PointerEvent) => {
    if (!draggingGuide || !dragCanvasRef.current) return;
    const rect = dragCanvasRef.current.getBoundingClientRect();
    const clientY = e.clientY;
    const relativeY = Math.max(0, Math.min(rect.height, clientY - rect.top));

    // A4 sheet height in mm is exactly 297mm
    if (draggingGuide === 'top') {
      const mm = Math.round((relativeY / rect.height) * 297);
      // Top margin clamped between 20mm and 120mm
      const clamped = Math.max(20, Math.min(120, mm));
      setSettings((prev) => ({ ...prev, topMarginMm: clamped }));
    } else if (draggingGuide === 'bottom') {
      const fromBottomPx = rect.height - relativeY;
      const mm = Math.round((fromBottomPx / rect.height) * 297);
      // Bottom margin clamped between 15mm and 90mm
      const clamped = Math.max(15, Math.min(90, mm));
      setSettings((prev) => ({ ...prev, bottomMarginMm: clamped }));
    }
  };

  const handlePointerUpGuide = (e: React.PointerEvent) => {
    if (draggingGuide) {
      setDraggingGuide(null);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  // =========================================================================
  // GENERATE OFFICIAL HTML DOCUMENT FOR ULTRA-CRISP A4 PRINT / PDF
  // =========================================================================
  const buildLetterPrintHtml = (letter: OutwardLetter, withSign: boolean): string => {
    const topMargin = settings.topMarginMm ?? 62;
    const bottomMargin = settings.bottomMarginMm ?? 32;
    const leftMargin = settings.leftMarginMm ?? 22;
    const rightMargin = settings.rightMarginMm ?? 22;

    const formattedDate = formatDateDisplay(letter.letterDate, useGujaratiDigitsInDate);
    const formattedOutwardNo = useGujaratiDigitsInDate
      ? toGujaratiDigits(letter.outwardNumber)
      : letter.outwardNumber;

    // Background A4 Letterhead image if uploaded
    const letterheadBgHtml = settings.letterheadUrl
      ? `<img src="${settings.letterheadUrl}" style="position: absolute; top: 0; left: 0; width: 210mm; height: 297mm; z-index: 0; object-fit: fill; pointer-events: none;" />`
      : `
        <div style="border-bottom: 2.5px solid #0f172a; padding-bottom: 12px; margin-bottom: 24px; text-align: center;">
          <h1 style="font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.02em;">${school.schoolName}</h1>
          <p style="font-size: 13px; color: #334155; margin: 5px 0 0 0; font-weight: 500;">
            ${school.village ? school.village + ', ' : ''}${school.taluka ? school.taluka + ', ' : ''}${school.district} • DISE કોડ: <strong>${school.diseCode}</strong>
          </p>
          ${school.contactPhone ? `<p style="font-size: 11px; color: #64748b; margin: 3px 0 0 0;">સંપર્ક: ${school.contactPhone} • ઈમેલ: ${school.contactEmail || '-'}</p>` : ''}
        </div>
      `;

    // Signatory block
    const signBlockHtml = withSign && settings.principalSignUrl
      ? `
        <div style="text-align: center; display: inline-block; min-width: 200px;">
          <p style="margin: 0 0 4px 0; font-weight: 700; font-size: 13.5px; color: #0f172a;">લિ. આપનો વિશ્વાસુ,</p>
          <div style="height: 52px; display: flex; align-items: center; justify-content: center; margin: 4px 0;">
            <img src="${settings.principalSignUrl}" style="max-height: 50px; max-width: 160px; object-fit: contain;" />
          </div>
          <p style="margin: 4px 0 0 0; font-weight: 800; font-size: 14.5px; color: #0f172a;">(${letter.signatoryName || settings.principalName || school.principalName || ''})</p>
          <p style="margin: 2px 0 0 0; font-size: 12.5px; color: #334155; font-weight: 600;">${letter.signatoryDesignation || 'આચાર્યશ્રી'}</p>
          <p style="margin: 1px 0 0 0; font-size: 11.5px; color: #64748b; font-weight: 500;">${school.schoolName}</p>
        </div>
      `
      : `
        <div style="text-align: center; display: inline-block; min-width: 200px;">
          <p style="margin: 0 0 54px 0; font-weight: 700; font-size: 13.5px; color: #0f172a;">લિ. આપનો વિશ્વાસુ,</p>
          <p style="margin: 4px 0 0 0; font-weight: 800; font-size: 14.5px; color: #0f172a;">(${letter.signatoryName || settings.principalName || school.principalName || ''})</p>
          <p style="margin: 2px 0 0 0; font-size: 12.5px; color: #334155; font-weight: 600;">${letter.signatoryDesignation || 'આચાર્યશ્રી'}</p>
          <p style="margin: 1px 0 0 0; font-size: 11.5px; color: #64748b; font-weight: 500;">${school.schoolName}</p>
        </div>
      `;

    // Copy to block
    const copyToHtml = letter.copyTo && letter.copyTo.length > 0
      ? `
        <div style="margin-top: 28px; font-size: 12px; color: #334155; border-top: 1px dashed #cbd5e1; padding-top: 10px;">
          <p style="margin: 0 0 6px 0; font-weight: 700; color: #0f172a;">નકલ સવિનય રવાના:</p>
          <ol style="margin: 0; padding-left: 20px; line-height: 1.6; font-weight: 500;">
            ${letter.copyTo.map((c) => `<li>${c}</li>`).join('')}
          </ol>
        </div>
      `
      : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>જાવક પત્ર - ${letter.outwardNumber}</title>
        <!-- Anek Gujarati Font Exclusive Loading -->
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=Anek+Gujarati:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>
          @page {
            size: A4 portrait;
            margin: 0;
          }
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 0;
            background: #fff;
            color: #0f172a;
            font-family: 'Anek Gujarati', sans-serif !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .a4-sheet {
            position: relative;
            width: 210mm;
            height: 297mm;
            page-break-after: always;
            overflow: hidden;
            background: #fff;
          }
          .letter-content {
            position: relative;
            z-index: 10;
            padding-top: ${settings.letterheadUrl ? `${topMargin}mm` : '22mm'};
            padding-bottom: ${bottomMargin}mm;
            padding-left: ${leftMargin}mm;
            padding-right: ${rightMargin}mm;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 13.5px;
            font-weight: 600;
            margin-bottom: 22px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e2e8f0;
          }
          .meta-row strong {
            color: #0f172a;
            font-weight: 800;
            margin-left: 4px;
          }
          .recipient-block {
            margin-bottom: 20px;
            font-size: 14px;
            line-height: 1.6;
          }
          .recipient-block .to-label {
            font-weight: 800;
            margin-bottom: 3px;
            color: #0f172a;
          }
          .recipient-block .to-name {
            font-weight: 800;
            font-size: 15px;
            color: #0f172a;
          }
          .recipient-block .to-address {
            color: #334155;
            font-weight: 500;
          }
          .subject-container {
            margin-bottom: 20px;
            padding: 10px 14px;
            background: #f8fafc;
            border-left: 4.5px solid #0f172a;
            border-radius: 4px;
            font-size: 14px;
            line-height: 1.5;
          }
          .subject-container .subject-text {
            font-weight: 800;
            color: #0f172a;
          }
          .subject-container .reference-text {
            font-size: 12.5px;
            font-weight: 600;
            color: #475569;
            margin-top: 5px;
          }
          .salutation {
            font-weight: 800;
            font-size: 14px;
            color: #0f172a;
            margin-bottom: 12px;
          }
          .body-text {
            font-size: 14px;
            line-height: 1.85;
            text-align: justify;
            text-justify: inter-word;
            color: #1e293b;
            margin-bottom: 25px;
          }
          .body-text p {
            text-indent: 40px;
            margin: 0 0 14px 0;
            font-weight: 500;
          }
        </style>
      </head>
      <body>
        <div class="a4-sheet">
          ${letterheadBgHtml}
          <div class="letter-content">
            <div>
              <div class="meta-row">
                <div>
                  <span style="color: #475569;">જાવક ક્રમાંક:</span>
                  <strong>${formattedOutwardNo}</strong>
                </div>
                <div>
                  <span style="color: #475569;">તારીખ:</span>
                  <strong>${formattedDate}</strong>
                </div>
              </div>

              <div class="recipient-block">
                <div class="to-label">પ્રતિ,</div>
                <div class="to-name">${letter.recipientName}</div>
                ${letter.recipientAddress ? `<div class="to-address">${letter.recipientAddress}</div>` : ''}
              </div>

              <div class="subject-container">
                <div class="subject-text">વિષય: ${letter.subject}</div>
                ${letter.reference ? `<div class="reference-text">સંદર્ભ: ${letter.reference}</div>` : ''}
              </div>

              <div class="salutation">માનનીય સાહેબશ્રી,</div>

              <div class="body-text">
                ${letter.content.split('\n\n').map((p) => `<p>${p}</p>`).join('')}
              </div>
            </div>

            <div>
              <div style="display: flex; justify-content: flex-end; margin-top: 15px;">
                ${signBlockHtml}
              </div>
              ${copyToHtml}
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Direct Print via native browser / Android
  const handlePrint = (letter: OutwardLetter, withSign: boolean) => {
    const html = buildLetterPrintHtml(letter, withSign);
    printHtmlDocument(html, `જાવક_પત્ર_${letter.outwardNumber}`);
  };

  // Direct PDF Download via jsPDF + html2canvas with font-ready guarantee
  const handleDownloadPdf = async (letter: OutwardLetter, withSign: boolean) => {
    if (!letterA4Ref.current) {
      handlePrint(letter, withSign);
      return;
    }

    setIsGeneratingPdf(true);
    try {
      // Ensure Google Fonts are loaded before taking screenshot
      if (document.fonts) {
        await document.fonts.ready;
      }

      const element = letterA4Ref.current;
      const canvas = await html2canvas(element, {
        scale: 3, // Ultra crisp resolution
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      const safeNum = letter.outwardNumber.replace(/[\\/:*?"<>|]/g, '_');
      const filename = `જાવક_પત્ર_${safeNum}_${withSign ? 'સહી_સાથે' : 'સહી_વગર'}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('PDF download error:', err);
      // Fallback to print
      handlePrint(letter, withSign);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Filtered letters list
  const filteredLetters = useMemo(() => {
    return letters.filter((l) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mNum = l.outwardNumber.toLowerCase().includes(q);
        const mSub = l.subject.toLowerCase().includes(q);
        const mRec = l.recipientName.toLowerCase().includes(q);
        const mDate = l.letterDate.includes(q);
        if (!mNum && !mSub && !mRec && !mDate) return false;
      }
      return true;
    });
  }, [letters, searchQuery]);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200 font-['Anek_Gujarati']">
      {/* Top Header Card */}
      <div className="glass-panel rounded-3xl border border-[#E2E8F0] dark:border-white/10 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
              title="પાછા જાઓ"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <FileText className="w-5 h-5" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  જાવક પત્ર & લેટરહેડ રજિસ્ટર
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Anek Gujarati ફોન્ટમાં વ્યાવસાયિક પત્ર નિર્માણ, A4 ડ્રેગેબલ માર્જિન સેટિંગ અને With/Without Sign PDF.
              </p>
            </div>
          </div>

          {/* Action Tabs Header */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'register'
                  ? 'bg-white dark:bg-slate-900 text-[#C45A2D] dark:text-white shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>પત્રો રજિસ્ટર ({letters.length})</span>
            </button>

            <button
              type="button"
              onClick={handleStartNewLetter}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'new_letter'
                  ? 'bg-[#C45A2D] text-white shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>નવો પત્ર લખો</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'settings'
                  ? 'bg-white dark:bg-slate-900 text-[#C45A2D] dark:text-white shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>લેટરહેડ & માર્જિન ડ્રેગ</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: LETTERS REGISTER & HISTORY (જાવક પત્રો રજિસ્ટર)
          ========================================================================= */}
      {activeTab === 'register' && (
        <div className="space-y-4">
          {/* Quick Stats & Search Bar */}
          <div className="glass-panel rounded-3xl border border-[#E2E8F0] dark:border-white/10 p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="જાવક નં. / વિષય / પ્રતિ / તારીખથી શોધો..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C45A2D]/50"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleStartNewLetter}
                className="px-4 py-2 rounded-xl bg-[#C45A2D] hover:bg-[#a84a22] text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ નવો જાવક પત્ર</span>
              </button>
            </div>
          </div>

          {/* Letters Table / Cards */}
          <div className="glass-panel rounded-3xl border border-[#E2E8F0] dark:border-white/10 shadow-xl overflow-hidden bg-white dark:bg-slate-900">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500 font-bold">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#C45A2D]" />
                જાવક પત્રો લોડ થઈ રહ્યા છે...
              </div>
            ) : filteredLetters.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
                  <FileText className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  હજુ સુધી કોઈ જાવક પત્ર દાખલ થયો નથી.
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  શાળાનો સત્તાવાર પત્ર લખવા અને A4 લેટરહેડ પર ડાઉનલોડ કરવા નીચેના બટન પર ક્લિક કરો.
                </p>
                <button
                  type="button"
                  onClick={handleStartNewLetter}
                  className="px-4 py-2 rounded-xl bg-[#C45A2D] text-white text-xs font-bold cursor-pointer shadow-md inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>પ્રથમ પત્ર બનાવો</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-black border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-3 w-12 text-center">ક્રમ</th>
                      <th className="py-3 px-3 w-36">જાવક નંબર</th>
                      <th className="py-3 px-3 w-28 text-center">તારીખ</th>
                      <th className="py-3 px-3 min-w-[160px]">પ્રતિ (મેળવનાર)</th>
                      <th className="py-3 px-4 min-w-[220px]">પત્રનો વિષય</th>
                      <th className="py-3 px-3 w-64 text-center">ક્રિયાઓ (Actions)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredLetters.map((l, index) => (
                      <tr key={l.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-3 text-center font-bold text-slate-400">
                          {index + 1}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-[#C45A2D] whitespace-nowrap">
                          {l.outwardNumber}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatDateDisplay(l.letterDate, false)}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                          <div className="line-clamp-1">{l.recipientName}</div>
                          {l.recipientAddress && (
                            <div className="text-[10px] text-slate-400 font-normal line-clamp-1">
                              {l.recipientAddress}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                          <div className="line-clamp-2">{l.subject}</div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {/* Preview */}
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewLetter(l);
                                setPreviewWithSign(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all"
                              title="પત્ર પ્રિવ્યુ જુઓ"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>જુઓ</span>
                            </button>

                            {/* Generate With Sign */}
                            <button
                              type="button"
                              onClick={() => handlePrint(l, true)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all"
                              title="સહી સાથે A4 પ્રિન્ટ / PDF"
                            >
                              <Printer className="w-3 h-3 text-emerald-600" />
                              <span>સહી સાથે</span>
                            </button>

                            {/* Generate Without Sign */}
                            <button
                              type="button"
                              onClick={() => handlePrint(l, false)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all"
                              title="સહી વગર A4 પ્રિન્ટ / PDF"
                            >
                              <Printer className="w-3 h-3 text-slate-500" />
                              <span>સહી વગર</span>
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => handleEditLetter(l)}
                              className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 cursor-pointer"
                              title="સુધારો કરો (Edit)"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Duplicate */}
                            <button
                              type="button"
                              onClick={() => handleDuplicateLetter(l)}
                              className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 cursor-pointer"
                              title="આ પત્રની નકલ બનાવો (Duplicate)"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeleteLetter(l.id, l.outwardNumber)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 cursor-pointer"
                              title="ડિલીટ કરો"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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
          TAB 2: NEW / EDIT OUTWARD LETTER FORM (નવો જાવક પત્ર લખો)
          ========================================================================= */}
      {activeTab === 'new_letter' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form: Inputs and Templates */}
          <div className="lg:col-span-8 space-y-5">
            <div className="glass-panel rounded-3xl border border-[#E2E8F0] dark:border-white/10 p-5 sm:p-6 shadow-xl space-y-5 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#C45A2D]" />
                  <span>{editingLetterId ? 'જાવક પત્રમાં સુધારો' : 'નવો સત્તાવાર જાવક પત્ર'}</span>
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>માર્જિન ગોઠવો (Top: {settings.topMarginMm}mm)</span>
                  </button>
                  <span className="text-xs font-mono font-bold text-[#C45A2D] bg-[#FBE9DF] px-3 py-1 rounded-xl">
                    {outwardNumber || 'જાવક ક્રમાંક'}
                  </span>
                </div>
              </div>

              {/* Quick Preset Templates Carousel */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>ઝડપી પત્ર નમૂનાઓ (Templates):</span>
                  </label>
                  <span className="text-[10px] text-slate-400">એક ક્લિકથી સત્તાવાર લખાણ ભરાઈ જશે</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {LETTER_TEMPLATES.map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleApplyTemplate(tpl)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-50 hover:border-amber-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0"
                    >
                      {tpl.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid 1: Outward Number & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1.5">
                    ૧. જાવક નંબર (Outward Number) *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={outwardNumber}
                      onChange={(e) => setOutwardNumber(e.target.value)}
                      placeholder="દા.ત. શાળા/જાવક/૨૦૨૬-૨૭/૧૨૫"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#C45A2D]/50"
                    />
                    <button
                      type="button"
                      onClick={() => setOutwardNumber(generateNextOutwardNumber())}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold whitespace-nowrap cursor-pointer"
                      title="ઓટો-જનરેટ નંબર"
                    >
                      ઓટો
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                      ૨. તારીખ (Date) *
                    </label>
                    <label className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useGujaratiDigitsInDate}
                        onChange={(e) => setUseGujaratiDigitsInDate(e.target.checked)}
                        className="rounded"
                      />
                      <span>ગુજરાતી અંકો</span>
                    </label>
                  </div>
                  <input
                    type="date"
                    value={letterDate}
                    onChange={(e) => setLetterDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#C45A2D]/50"
                  />
                </div>
              </div>

              {/* Grid 2: Recipient Information */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span>૩. પ્રતિ (To / મેળવનાર વિગત) *</span>
                  </label>
                  {/* Recipient Quick Presets Dropdown */}
                  <select
                    onChange={(e) => {
                      const found = RECIPIENT_PRESETS.find((p) => p.name === e.target.value);
                      if (found) {
                        setRecipientName(found.name);
                        setRecipientAddress(found.address);
                      }
                    }}
                    className="text-[11px] font-bold px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    <option value="">ઝડપી કચેરી પસંદ કરો (Presets)...</option>
                    {RECIPIENT_PRESETS.map((p, idx) => (
                      <option key={idx} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="દા.ત. માનનીય જિલ્લા શિક્ષણાધિકારીશ્રીની કચેરી"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      placeholder="સરનામું / તાલુકો / જિલ્લો (વૈકલ્પિક)"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Subject & Reference */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1.5">
                    ૪. પત્રનો વિષય (Subject) *
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="દા.ત. શાળા ગ્રાન્ટ વપરાશ પ્રમાણપત્ર રજૂ કરવા બાબત..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#C45A2D]/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    સંદર્ભ (Reference - જો હોય તો):
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="દા.ત. આપની કચેરીના પરિપત્ર ક્રમાંક... તા...."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300"
                  />
                </div>
              </div>

              {/* Main Content Body */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                    ૫. પત્રનું મુખ્ય લખાણ (Letter Content / Body) *
                  </label>
                  <span className="text-[10px] text-slate-400">ફકરો પાડવા બે વાર Enter દબાવો</span>
                </div>
                <textarea
                  rows={9}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="સવિનય ઉપરોક્ત વિષય અન્વયે જણાવવાનું કે..."
                  className="w-full p-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white leading-relaxed focus:ring-2 focus:ring-[#C45A2D]/50 font-['Anek_Gujarati']"
                />
              </div>

              {/* Signatory Info */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40 space-y-3">
                <span className="text-xs font-black text-indigo-950 dark:text-indigo-200 block">
                  ૬. સહી કરનાર આચાર્યશ્રી / અધિકારી વિગત (Signatory Block)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">નામ</label>
                    <input
                      type="text"
                      value={signatoryName}
                      onChange={(e) => setSignatoryName(e.target.value)}
                      placeholder="આચાર્યશ્રીનું નામ"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">હોદ્દો</label>
                    <input
                      type="text"
                      value={signatoryDesignation}
                      onChange={(e) => setSignatoryDesignation(e.target.value)}
                      placeholder="દા.ત. આચાર્યશ્રી"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Copy To (નકલ સવિનય રવાના) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  ૭. નકલ રવાના (Copy to - વૈકલ્પિક):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCopyInput}
                    onChange={(e) => setNewCopyInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCopyTo())}
                    placeholder="દા.ત. ૧. સંબંધિત ફાઇલ / ૨. તાલુકા શિક્ષણાધિકારીશ્રી"
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddCopyTo}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer"
                  >
                    ઉમેરો
                  </button>
                </div>

                {copyToList.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {copyToList.map((cp, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border text-xs font-medium"
                      >
                        <span>{idx + 1}. {cp}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCopyTo(idx)}
                          className="hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons: Generate With Sign & Generate Without Sign */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer w-full sm:w-auto text-center"
                >
                  રદ કરો (Cancel)
                </button>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  {/* Generate Without Sign */}
                  <button
                    type="button"
                    onClick={() => handleOpenPreview(false)}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
                  >
                    <FileText className="w-4 h-4" />
                    <span>સહી વગર (Without Sign)</span>
                  </button>

                  {/* Generate With Sign */}
                  <button
                    type="button"
                    onClick={() => handleOpenPreview(true)}
                    className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-[#C45A2D] hover:bg-[#a84a22] text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-[#C45A2D]/25 cursor-pointer transition-all scale-[1.01]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>સહી સાથે (With Sign)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Live Mini-Sheet Indicator */}
          <div className="lg:col-span-4 space-y-4">
            <div className="glass-panel rounded-3xl border border-[#E2E8F0] dark:border-white/10 p-5 shadow-xl bg-white dark:bg-slate-900 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  લાઈવ પત્ર નમૂનો
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                  Anek Gujarati
                </span>
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 bg-white text-slate-900 shadow-sm text-[11px] leading-relaxed space-y-2 font-['Anek_Gujarati']">
                <div className="text-center border-b pb-1">
                  <div className="font-extrabold text-xs">{school.schoolName}</div>
                  <div className="text-[9px] text-slate-500">DISE: {school.diseCode}</div>
                </div>

                <div className="flex justify-between items-center text-[10px] font-bold text-slate-600 pt-1">
                  <span>નંબર: {outwardNumber || '...'}</span>
                  <span>તા: {formatDateDisplay(letterDate, useGujaratiDigitsInDate)}</span>
                </div>

                <div className="mt-1">
                  <span className="font-bold">પ્રતિ,</span>
                  <div className="font-black text-slate-950">{recipientName || '(મેળવનારનું નામ)'}</div>
                </div>

                <div className="p-1.5 bg-slate-50 rounded border text-[10px] font-bold">
                  વિષય: {subject || '(પત્રનો વિષય)'}
                </div>

                <div className="text-[10px] line-clamp-6 text-slate-700 leading-relaxed">
                  {content || '(પત્રનું લખાણ...)'}
                </div>

                <div className="border-t pt-2 flex justify-end text-[10px]">
                  <div className="text-center min-w-[90px]">
                    <div className="font-bold">લિ. આપનો વિશ્વાસુ,</div>
                    {settings.principalSignUrl && (
                      <img
                        src={settings.principalSignUrl}
                        alt="Sign"
                        className="h-6 mx-auto my-1 object-contain"
                      />
                    )}
                    <div className="font-black">{signatoryName || school.principalName || 'આચાર્યશ્રી'}</div>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-950 dark:text-blue-200 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <MoveVertical className="w-3.5 h-3.5 text-blue-600" />
                  <span>માર્જિન સ્થિતિ:</span>
                </div>
                <div className="text-[10px] space-y-0.5 font-mono">
                  <div>ઉપરનું માર્જિન: <strong>{settings.topMarginMm} mm</strong></div>
                  <div>નીચેનું માર્જિન: <strong>{settings.bottomMarginMm} mm</strong></div>
                  <div>ડાબું / જમણું: <strong>{settings.leftMarginMm} mm / {settings.rightMarginMm} mm</strong></div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className="w-full mt-1 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  ડ્રેગ કરી માર્જિન બદલો
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: LETTERHEAD & DRAGGABLE MARGINS SETTINGS (લેટરહેડ & માર્જિન ડ્રેગ)
          ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl border border-[#E2E8F0] dark:border-white/10 p-5 sm:p-6 shadow-xl bg-white dark:bg-slate-900 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-[#C45A2D]" />
                  <span>A4 લેટરહેડ અપલોડ અને ઇન્ટરેક્ટિવ માર્જિન ડ્રેગ સિસ્ટમ</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  લેટરહેડ અપલોડ કર્યા બાદ <strong>ઉપરની અને નીચેની લાઈન સીધી માઉસ/ટચથી ડ્રેગ કરીને</strong> પરફેક્ટ માર્જિન સેટ કરો!
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="px-5 py-2.5 rounded-xl bg-[#C45A2D] hover:bg-[#a84a22] text-white text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSavingSettings ? 'સાચવી રહ્યું છે...' : 'સેટિંગ્સ સેવ કરો'}</span>
              </button>
            </div>

            {settingsSavedMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>લેટરહેડ અને ડ્રેગ કરેલ માર્જિન સેટિંગ્સ સફળતાપૂર્વક સાચવવામાં આવ્યા છે!</span>
              </div>
            )}

            {/* MAIN TWO COLUMNS: LEFT VISUAL DRAGGABLE A4 CANVAS | RIGHT SIDE CONTROLS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT: VISUAL DRAGGABLE A4 SHEET CANVAS */}
              <div className="lg:col-span-7 bg-slate-100 dark:bg-slate-950 p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-3 text-xs">
                  <span className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <MoveVertical className="w-4 h-4 text-blue-600" />
                    <span>લાઈવ A4 લેટરહેડ માર્જિન ડ્રેગ કેનવાસ:</span>
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border">
                    Top: {settings.topMarginMm}mm • Bottom: {settings.bottomMarginMm}mm
                  </span>
                </div>

                {/* Draggable A4 Preview Container */}
                <div
                  ref={dragCanvasRef}
                  onPointerMove={handlePointerMoveGuide}
                  onPointerUp={handlePointerUpGuide}
                  onPointerLeave={handlePointerUpGuide}
                  style={{
                    width: '100%',
                    maxWidth: '420px',
                    aspectRatio: '210 / 297', // Exact A4 ratio
                  }}
                  className="relative select-none rounded-xl overflow-hidden bg-white shadow-2xl border-2 border-slate-300 dark:border-slate-700 touch-none"
                >
                  {/* 1. Letterhead background image or placeholder */}
                  {settings.letterheadUrl ? (
                    <img
                      src={settings.letterheadUrl}
                      alt="Letterhead Canvas"
                      className="absolute inset-0 w-full h-full object-fill pointer-events-none z-0"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-slate-50/50">
                      <Upload className="w-8 h-8 mb-2 opacity-50" />
                      <span className="text-xs font-bold">A4 લેટરહેડ ઈમેજ અપલોડ કરેલ નથી.</span>
                      <span className="text-[10px] text-slate-400 mt-1">
                        જમણી બાજુથી લેટરહેડ PNG પસંદ કરો જેથી અહીં દેખાશે.
                      </span>
                    </div>
                  )}

                  {/* 2. Side Margins Visual Guides (Left & Right) */}
                  <div
                    style={{ left: `${((settings.leftMarginMm ?? 22) / 210) * 100}%` }}
                    className="absolute top-0 bottom-0 w-[1.5px] border-l border-dashed border-sky-400/70 z-10 pointer-events-none"
                  />
                  <div
                    style={{ right: `${((settings.rightMarginMm ?? 22) / 210) * 100}%` }}
                    className="absolute top-0 bottom-0 w-[1.5px] border-r border-dashed border-sky-400/70 z-10 pointer-events-none"
                  />

                  {/* 3. Text Area Box Highlight */}
                  <div
                    style={{
                      top: `${((settings.topMarginMm ?? 62) / 297) * 100}%`,
                      bottom: `${((settings.bottomMarginMm ?? 32) / 297) * 100}%`,
                      left: `${((settings.leftMarginMm ?? 22) / 210) * 100}%`,
                      right: `${((settings.rightMarginMm ?? 22) / 210) * 100}%`,
                    }}
                    className="absolute z-10 border border-blue-500/40 bg-blue-500/5 rounded p-2 flex flex-col justify-between text-[9px] font-['Anek_Gujarati'] text-slate-700 pointer-events-none"
                  >
                    <div>
                      <div className="flex justify-between items-center font-bold text-[8px] text-blue-900 border-b border-blue-200 pb-0.5">
                        <span>જાવક: શાળા/જાવક/૧</span>
                        <span>તા: ૨૩/૧૦/૨૦૨૬</span>
                      </div>
                      <div className="font-extrabold text-[9px] text-slate-900 mt-1">પ્રતિ, માનનીય સાહેબશ્રી...</div>
                      <div className="font-bold text-[8px] bg-white/70 px-1 py-0.5 rounded border border-blue-100 my-1">
                        વિષય: શિષ્યવૃત્તિ દરખાસ્ત મંજૂરી બાબત...
                      </div>
                      <div className="text-[8px] text-slate-600 line-clamp-3">
                        સવિનય ઉપરોક્ત વિષય અન્વયે જણાવવાનું કે અમારી શાળામાં અભ્યાસ કરતા તમામ વિદ્યાર્થીઓનું...
                      </div>
                    </div>
                    <div className="text-right text-[8px] font-bold text-slate-800">
                      લિ. આપનો વિશ્વાસુ, આચાર્યશ્રી
                    </div>
                  </div>

                  {/* 4. DRAGGABLE TOP MARGIN GUIDE LINE */}
                  <div
                    style={{ top: `${((settings.topMarginMm ?? 62) / 297) * 100}%` }}
                    className="absolute left-0 right-0 z-30 cursor-ns-resize group"
                  >
                    {/* Horizontal Line */}
                    <div className="w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-600 to-blue-500 shadow-md group-hover:h-1.5 transition-all" />

                    {/* Draggable Handle Pill */}
                    <div
                      onPointerDown={(e) => handlePointerDownGuide('top', e)}
                      className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-full text-[10px] font-black shadow-lg flex items-center gap-1 cursor-ns-resize whitespace-nowrap active:scale-105 transition-transform"
                    >
                      <MoveVertical className="w-3 h-3 animate-pulse" />
                      <span>↕ ઉપરનું માર્જિન: {settings.topMarginMm} mm (ડ્રેગ કરો)</span>
                    </div>
                  </div>

                  {/* 5. DRAGGABLE BOTTOM MARGIN GUIDE LINE */}
                  <div
                    style={{ bottom: `${((settings.bottomMarginMm ?? 32) / 297) * 100}%` }}
                    className="absolute left-0 right-0 z-30 cursor-ns-resize group"
                  >
                    {/* Horizontal Line */}
                    <div className="w-full h-1 bg-gradient-to-r from-amber-500 via-orange-600 to-amber-500 shadow-md group-hover:h-1.5 transition-all" />

                    {/* Draggable Handle Pill */}
                    <div
                      onPointerDown={(e) => handlePointerDownGuide('bottom', e)}
                      className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-full text-[10px] font-black shadow-lg flex items-center gap-1 cursor-ns-resize whitespace-nowrap active:scale-105 transition-transform"
                    >
                      <MoveVertical className="w-3 h-3 animate-pulse" />
                      <span>↕ નીચેનું માર્જિન: {settings.bottomMarginMm} mm (ડ્રેગ કરો)</span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 mt-3 text-center">
                  💡 <strong>સૂચન:</strong> સ્ક્રીન પર દેખાતી <strong className="text-blue-600">વાદળી લાઇન</strong> પકડીને ઉપર-નીચે ખસેડો જેથી પત્રનું લખાણ શાળાના લેટરહેડના હેડરની બરાબર નીચે ગોઠવાય!
                </p>
              </div>

              {/* RIGHT: CONFIGURATION CONTROLS */}
              <div className="lg:col-span-5 space-y-5">
                {/* 1. Letterhead File Upload */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-blue-500" />
                      <span>A4 PNG લેટરહેડ ઈમેજ</span>
                    </h3>
                    {settings.letterheadUrl && (
                      <button
                        type="button"
                        onClick={() => setSettings((p) => ({ ...p, letterheadUrl: undefined }))}
                        className="text-[11px] text-rose-600 font-bold hover:underline cursor-pointer"
                      >
                        દૂર કરો
                      </button>
                    )}
                  </div>

                  <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#C45A2D] rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-white dark:bg-slate-800 text-center transition-all">
                    <Upload className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {settings.letterheadUrl ? 'લેટરહેડ બદલવા અહીં ક્લિક કરો' : 'નવું A4 PNG લેટરહેડ પસંદ કરો'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">PNG / JPG • મહત્તમ ૫ MB</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg"
                      onChange={handleLetterheadUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* 2. Side Margins Slider Controls (Left & Right) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-4">
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-emerald-500" />
                    <span>બાજુના માર્જિન સેટિંગ્સ (Side Margins)</span>
                  </h3>

                  {/* Left Margin Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">ડાબું માર્જિન (Left):</span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{settings.leftMarginMm} mm</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="45"
                      value={settings.leftMarginMm ?? 22}
                      onChange={(e) => setSettings((p) => ({ ...p, leftMarginMm: Number(e.target.value) }))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  {/* Right Margin Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">જમણું માર્જિન (Right):</span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{settings.rightMarginMm} mm</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="45"
                      value={settings.rightMarginMm ?? 22}
                      onChange={(e) => setSettings((p) => ({ ...p, rightMarginMm: Number(e.target.value) }))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  {/* Direct Number Inputs for Fine Tuning */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">ઉપર (Top mm)</label>
                      <input
                        type="number"
                        min="20"
                        max="120"
                        value={settings.topMarginMm ?? 62}
                        onChange={(e) => setSettings((p) => ({ ...p, topMarginMm: Number(e.target.value) }))}
                        className="w-full px-2 py-1.5 rounded-lg border text-center font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">નીચે (Bottom mm)</label>
                      <input
                        type="number"
                        min="15"
                        max="90"
                        value={settings.bottomMarginMm ?? 32}
                        onChange={(e) => setSettings((p) => ({ ...p, bottomMarginMm: Number(e.target.value) }))}
                        className="w-full px-2 py-1.5 rounded-lg border text-center font-bold text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Principal Signature Management */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <PenTool className="w-4 h-4 text-purple-500" />
                      <span>આચાર્યશ્રીની સહી (Principal Sign)</span>
                    </h3>
                    {settings.principalSignUrl && (
                      <button
                        type="button"
                        onClick={() => setSettings((p) => ({ ...p, principalSignUrl: undefined }))}
                        className="text-[11px] text-rose-600 font-bold hover:underline cursor-pointer"
                      >
                        દૂર કરો
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex-1 px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>સહી PNG અપલોડ</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg"
                        onChange={handleSignatureUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Draw Signature Pad */}
                  <div className="border border-slate-300 dark:border-slate-700 rounded-xl p-2 bg-white">
                    <div className="text-[10px] text-slate-400 text-center mb-1">
                      -- અહીં આંગળી કે માઉસથી સહી કરો --
                    </div>
                    <canvas
                      ref={signatureCanvasRef}
                      width={320}
                      height={90}
                      onMouseDown={startDrawing}
                      onMouseMove={drawSignature}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={drawSignature}
                      onTouchEnd={stopDrawing}
                      className="w-full h-20 touch-none cursor-crosshair bg-slate-50 rounded-lg border border-dashed border-slate-200"
                    />
                    <div className="flex items-center justify-between mt-1.5">
                      <button
                        type="button"
                        onClick={clearSignatureCanvas}
                        className="text-[10px] font-bold text-slate-500 hover:text-slate-800"
                      >
                        સાફ કરો
                      </button>
                      <button
                        type="button"
                        onClick={saveCanvasSignature}
                        className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold cursor-pointer"
                      >
                        સહી લાગુ કરો
                      </button>
                    </div>
                  </div>

                  {/* Current Active Signature Preview */}
                  {settings.principalSignUrl && (
                    <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={settings.principalSignUrl}
                          alt="Signature Preview"
                          className="h-8 max-w-[120px] object-contain bg-white rounded border p-0.5"
                        />
                        <span className="text-[10px] font-bold text-purple-900 dark:text-purple-300">
                          સક્રિય ડિજિટલ સહી
                        </span>
                      </div>
                      <Check className="w-4 h-4 text-purple-600" />
                    </div>
                  )}

                  {/* Signatory Name */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <input
                      type="text"
                      value={settings.principalName || ''}
                      onChange={(e) => setSettings((p) => ({ ...p, principalName: e.target.value }))}
                      placeholder="આચાર્યશ્રીનું નામ"
                      className="w-full px-2.5 py-1.5 rounded-lg border text-xs font-bold"
                    />
                    <input
                      type="text"
                      value={settings.principalDesignation || 'આચાર્યશ્રી'}
                      onChange={(e) => setSettings((p) => ({ ...p, principalDesignation: e.target.value }))}
                      placeholder="હોદ્દો"
                      className="w-full px-2.5 py-1.5 rounded-lg border text-xs font-bold"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings}
                  className="w-full py-3 rounded-2xl bg-[#C45A2D] hover:bg-[#a84a22] text-white text-xs font-black shadow-lg cursor-pointer transition-all"
                >
                  સેટિંગ્સ સેવ કરો (Save Settings)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          FULL-SCREEN A4 LETTER PREVIEW & INSTANT PDF EXPORT MODAL
          ========================================================================= */}
      {previewLetter && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-5 backdrop-blur-sm overflow-y-auto font-['Anek_Gujarati']">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl max-w-4xl w-full max-h-[96vh] flex flex-col shadow-2xl animate-in fade-in overflow-hidden">
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 shrink-0">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#C45A2D]" />
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    જાવક પત્ર A4 પ્રિવ્યુ & PDF ડાઉનલોડ
                  </h3>
                  <p className="text-[11px] font-mono text-slate-500">
                    નંબર: {previewLetter.outwardNumber} • Anek Gujarati
                  </p>
                </div>
              </div>

              {/* Mode Switch Toggle: With Sign vs Without Sign */}
              <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 rounded-2xl border text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPreviewWithSign(true)}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    previewWithSign
                      ? 'bg-emerald-600 text-white shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  ✅ સહી સાથે (With Sign)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewWithSign(false)}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    !previewWithSign
                      ? 'bg-slate-800 text-white shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  ⚪ સહી વગર (Without Sign)
                </button>
              </div>

              <button
                type="button"
                onClick={() => setPreviewLetter(null)}
                className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: High Resolution A4 Letter Viewer */}
            <div className="p-4 sm:p-6 overflow-y-auto bg-slate-100 dark:bg-slate-950 flex justify-center">
              {/* Actual Printable A4 Sheet Ref for html2canvas */}
              <div
                ref={letterA4Ref}
                style={{
                  width: '210mm',
                  minHeight: '297mm',
                  paddingTop: settings.letterheadUrl ? `${settings.topMarginMm ?? 62}mm` : '22mm',
                  paddingBottom: `${settings.bottomMarginMm ?? 32}mm`,
                  paddingLeft: `${settings.leftMarginMm ?? 22}mm`,
                  paddingRight: `${settings.rightMarginMm ?? 22}mm`,
                  fontFamily: "'Anek Gujarati', sans-serif",
                }}
                className="relative bg-white text-slate-900 shadow-2xl flex flex-col justify-between select-text border border-slate-300"
              >
                {/* Letterhead Background Image if uploaded */}
                {settings.letterheadUrl && (
                  <img
                    src={settings.letterheadUrl}
                    alt="Letterhead"
                    className="absolute inset-0 w-[210mm] h-[297mm] object-fill pointer-events-none z-0"
                  />
                )}

                {/* Top Section */}
                <div className="relative z-10 space-y-5">
                  {/* Fallback Auto Letterhead if no custom image */}
                  {!settings.letterheadUrl && (
                    <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
                      <h1 className="text-2xl font-black uppercase text-slate-950 tracking-tight">
                        {school.schoolName}
                      </h1>
                      <p className="text-xs text-slate-600 mt-1">
                        ${school.village ? school.village + ', ' : ''}${school.taluka ? school.taluka + ', ' : ''}${school.district} • DISE કોડ: <strong>${school.diseCode}</strong>
                      </p>
                    </div>
                  )}

                  {/* Outward No & Date Row */}
                  <div className="flex items-center justify-between font-bold text-[13.5px] border-b border-slate-200 pb-2">
                    <div>
                      <span className="text-slate-500">જાવક ક્રમાંક: </span>
                      <strong className="text-slate-950 font-mono text-[14px]">
                        {useGujaratiDigitsInDate ? toGujaratiDigits(previewLetter.outwardNumber) : previewLetter.outwardNumber}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">તારીખ: </span>
                      <strong className="text-slate-950 text-[14px]">
                        {formatDateDisplay(previewLetter.letterDate, useGujaratiDigitsInDate)}
                      </strong>
                    </div>
                  </div>

                  {/* Recipient */}
                  <div className="text-[14px] leading-relaxed">
                    <div className="font-extrabold text-slate-950 mb-0.5">પ્રતિ,</div>
                    <div className="font-black text-[15px] text-slate-950">{previewLetter.recipientName}</div>
                    {previewLetter.recipientAddress && (
                      <div className="text-slate-700 text-xs mt-0.5">{previewLetter.recipientAddress}</div>
                    )}
                  </div>

                  {/* Subject Banner */}
                  <div className="p-3 bg-slate-50 border-l-4 border-slate-950 rounded-sm leading-snug">
                    <div className="font-black text-[14.5px] text-slate-950">
                      વિષય: {previewLetter.subject}
                    </div>
                    {previewLetter.reference && (
                      <div className="text-[12.5px] font-semibold text-slate-600 mt-1">
                        સંદર્ભ: {previewLetter.reference}
                      </div>
                    )}
                  </div>

                  {/* Salutation */}
                  <div className="font-black text-[14px] text-slate-950">
                    માનનીય સાહેબશ્રી,
                  </div>

                  {/* Main Content */}
                  <div className="space-y-3.5 text-[14px] leading-[1.85] text-justify text-slate-800">
                    {previewLetter.content.split('\n\n').map((paragraph, i) => (
                      <p key={i} className="indent-10 font-medium">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Bottom Section: Signatory & Copy To */}
                <div className="relative z-10 pt-4 mt-4">
                  {/* Signatory Box */}
                  <div className="flex justify-end">
                    <div className="text-center min-w-[210px] space-y-1">
                      <div className="font-bold text-[13px] text-slate-800">લિ. આપનો વિશ્વાસુ,</div>

                      {previewWithSign ? (
                        settings.principalSignUrl ? (
                          <div className="py-1">
                            <img
                              src={settings.principalSignUrl}
                              alt="Signature"
                              className="h-12 max-w-[160px] mx-auto object-contain"
                            />
                          </div>
                        ) : (
                          <div className="h-12 flex items-center justify-center text-[10px] text-slate-400 italic">
                            (ડિજિટલ સહી સેટ કરેલ નથી)
                          </div>
                        )
                      ) : (
                        <div className="h-14" /> /* Blank space for physical pen signature */
                      )}

                      <div className="font-black text-[14.5px] text-slate-950">
                        {previewWithSign ? `(${previewLetter.signatoryName || school.principalName})` : `(${previewLetter.signatoryName || school.principalName})`}
                      </div>
                      <div className="text-[12px] text-slate-700 font-semibold">
                        {previewLetter.signatoryDesignation || 'આચાર્યશ્રી'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        {school.schoolName}
                      </div>
                    </div>
                  </div>

                  {/* Copy to list */}
                  {previewLetter.copyTo && previewLetter.copyTo.length > 0 && (
                    <div className="mt-5 pt-2.5 border-t border-dashed border-slate-300 text-xs text-slate-700">
                      <div className="font-extrabold text-[12px] text-slate-900 mb-1">નકલ સવિનય રવાના:</div>
                      <ol className="list-decimal pl-5 space-y-0.5 font-medium text-[12px]">
                        {previewLetter.copyTo.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Bottom Export Actions */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between shrink-0 flex-wrap gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>પરિમાણ: A4 • ફોન્ટ: <strong>Anek Gujarati</strong> •</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {previewWithSign ? 'સહી સાથે (With Sign)' : 'સહી વગર (Without Sign)'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Direct Native Print / Save as PDF */}
                <button
                  type="button"
                  onClick={() => handlePrint(previewLetter, previewWithSign)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>પ્રિન્ટ / Save as PDF</span>
                </button>

                {/* Direct High Resolution PDF Download */}
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(previewLetter, previewWithSign)}
                  disabled={isGeneratingPdf}
                  className="px-5 py-2.5 rounded-xl bg-[#C45A2D] hover:bg-[#a84a22] text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-[#C45A2D]/25 cursor-pointer transition-all disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isGeneratingPdf ? 'PDF બની રહ્યું છે...' : 'PDF ડાઉનલોડ કરો'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
