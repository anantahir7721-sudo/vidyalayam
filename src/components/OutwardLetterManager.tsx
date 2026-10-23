import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  AlertCircle,
  Building,
  Send,
  Calendar,
  User,
  Sliders,
  X,
  ExternalLink,
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
  const [filterYear, setFilterYear] = useState('ALL');

  // Settings state (Letterhead, Sign, Margins)
  const [settings, setSettings] = useState<OutwardLetterSettings>({
    topMarginMm: 48,
    bottomMarginMm: 25,
    leftMarginMm: 20,
    rightMarginMm: 20,
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

  // Load Settings and Letters on Mount
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (school?.id) {
      // 1. Fetch settings
      getOutwardSettings(school.id).then((saved) => {
        setSettings((prev) => ({
          ...prev,
          ...saved,
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
  const generateNextOutwardNumber = () => {
    const prefix = settings.outwardPrefix || 'શાળા/જાવક';
    const year = school.academicYear || '૨૦૨૬-૨૭';
    const nextSeq = letters.length + 1;
    return `${prefix}/${year}/${nextSeq}`;
  };

  // Switch to New Letter tab
  const handleStartNewLetter = () => {
    setEditingLetterId(null);
    setOutwardNumber(generateNextOutwardNumber());
    setRecipientName('');
    setRecipientAddress('');
    setSubject('');
    setReference('');
    setContent(LETTER_TEMPLATES[0].content);
    setSubject(LETTER_TEMPLATES[0].subject);
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

  // Format date display (DD/MM/YYYY)
  const formatDateDisplay = (isoDate: string) => {
    if (!isoDate) return '-';
    try {
      const parts = isoDate.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return isoDate;
    } catch (e) {
      return isoDate;
    }
  };

  // Generate HTML for Native Browser Printing
  const buildLetterPrintHtml = (letter: OutwardLetter, withSign: boolean): string => {
    const topMargin = settings.topMarginMm ?? 48;
    const bottomMargin = settings.bottomMarginMm ?? 25;
    const leftMargin = settings.leftMarginMm ?? 20;
    const rightMargin = settings.rightMarginMm ?? 20;

    const formattedDate = formatDateDisplay(letter.letterDate);

    // If custom letterhead PNG is uploaded, we embed it as absolute background
    const letterheadBgHtml = settings.letterheadUrl
      ? `<img src="${settings.letterheadUrl}" style="position: absolute; top: 0; left: 0; width: 210mm; height: 297mm; z-index: 0; object-fit: fill;" />`
      : `
        <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; text-align: center;">
          <h1 style="font-size: 24px; font-weight: 900; color: #0f172a; margin: 0; text-transform: uppercase;">${school.schoolName}</h1>
          <p style="font-size: 13px; color: #334155; margin: 4px 0 0 0;">
            ${school.village ? school.village + ', ' : ''}${school.taluka ? school.taluka + ', ' : ''}${school.district} • DISE કોડ: <strong>${school.diseCode}</strong>
          </p>
          ${school.contactPhone ? `<p style="font-size: 11px; color: #64748b; margin: 2px 0 0 0;">સંપર્ક: ${school.contactPhone} • ઈમેલ: ${school.contactEmail || '-'}</p>` : ''}
        </div>
      `;

    const signBlockHtml = withSign && settings.principalSignUrl
      ? `
        <div style="text-align: center; display: inline-block; min-width: 180px;">
          <p style="margin: 0 0 4px 0; font-weight: bold; font-size: 13px;">લિ. આપનો વિશ્વાસુ,</p>
          <img src="${settings.principalSignUrl}" style="height: 52px; max-width: 150px; object-fit: contain; margin: 2px auto; display: block;" />
          <p style="margin: 2px 0 0 0; font-weight: 800; font-size: 14px; color: #0f172a;">${letter.signatoryName || settings.principalName || school.principalName || ''}</p>
          <p style="margin: 1px 0 0 0; font-size: 12px; color: #475569;">${letter.signatoryDesignation || 'આચાર્યશ્રી'}</p>
          <p style="margin: 1px 0 0 0; font-size: 11px; color: #64748b;">${school.schoolName}</p>
        </div>
      `
      : `
        <div style="text-align: center; display: inline-block; min-width: 180px;">
          <p style="margin: 0 0 45px 0; font-weight: bold; font-size: 13px;">લિ. આપનો વિશ્વાસુ,</p>
          <p style="margin: 2px 0 0 0; font-weight: 800; font-size: 14px; color: #0f172a;">(${letter.signatoryName || settings.principalName || school.principalName || ''})</p>
          <p style="margin: 1px 0 0 0; font-size: 12px; color: #475569;">${letter.signatoryDesignation || 'આચાર્યશ્રી'}</p>
          <p style="margin: 1px 0 0 0; font-size: 11px; color: #64748b;">${school.schoolName}</p>
        </div>
      `;

    const copyToHtml = letter.copyTo && letter.copyTo.length > 0
      ? `
        <div style="margin-top: 30px; font-size: 12px; color: #334155; border-top: 1px dashed #cbd5e1; pt: 8px;">
          <p style="margin: 0 0 4px 0; font-weight: bold;">નકલ સવિનય રવાના:</p>
          <ol style="margin: 0; padding-left: 18px; line-height: 1.5;">
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
            font-family: 'Shruti', 'Gujarati MT', 'Noto Sans Gujarati', Arial, sans-serif;
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
            padding-top: ${settings.letterheadUrl ? `${topMargin}mm` : '20mm'};
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
            align-items: flex-start;
            font-size: 13px;
            font-weight: 700;
            margin-bottom: 20px;
          }
          .recipient-block {
            margin-bottom: 18px;
            font-size: 14px;
            line-height: 1.5;
          }
          .subject-block {
            margin-bottom: 18px;
            padding: 8px 12px;
            background: #f8fafc;
            border-left: 4px solid #0f172a;
            font-size: 14px;
            font-weight: 800;
            line-height: 1.4;
          }
          .body-text {
            font-size: 14px;
            line-height: 1.7;
            text-align: justify;
            margin-bottom: 25px;
            white-space: pre-line;
          }
          .body-text p {
            text-indent: 40px;
            margin: 0 0 12px 0;
          }
        </style>
      </head>
      <body>
        <div class="a4-sheet">
          ${letterheadBgHtml}
          <div class="letter-content">
            <div>
              ${!settings.letterheadUrl ? '' : ''}
              <div class="meta-row">
                <div>
                  <span style="color: #64748b;">જાવક ક્રમાંક:</span>
                  <strong style="color: #0f172a; margin-left: 4px;">${letter.outwardNumber}</strong>
                </div>
                <div>
                  <span style="color: #64748b;">તારીખ:</span>
                  <strong style="color: #0f172a; margin-left: 4px;">${formattedDate}</strong>
                </div>
              </div>

              <div class="recipient-block">
                <div style="font-weight: bold; margin-bottom: 2px;">પ્રતિ,</div>
                <div style="font-weight: 800; font-size: 15px;">${letter.recipientName}</div>
                ${letter.recipientAddress ? `<div style="color: #334155;">${letter.recipientAddress}</div>` : ''}
              </div>

              <div class="subject-block">
                વિષય: ${letter.subject}
                ${letter.reference ? `<div style="font-size: 12px; font-weight: normal; color: #475569; margin-top: 4px;">સંદર્ભ: ${letter.reference}</div>` : ''}
              </div>

              <div class="body-text">
                <p>માનનીય સાહેબશ્રી,</p>
                ${letter.content.split('\n\n').map((p) => `<p>${p}</p>`).join('')}
              </div>
            </div>

            <div>
              <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
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

  // Direct PDF Download via jsPDF + html2canvas
  const handleDownloadPdf = async (letter: OutwardLetter, withSign: boolean) => {
    if (!letterA4Ref.current) {
      handlePrint(letter, withSign);
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const element = letterA4Ref.current;
      const canvas = await html2canvas(element, {
        scale: 2.5, // Crisp high-DPI output
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
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
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
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
                  <Send className="w-5 h-5" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  જાવક પત્ર & રજિસ્ટર (Outward Letters)
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                શાળાના સત્તાવાર A4 PNG લેટરહેડ પર પત્ર નિર્માણ, આચાર્ય સહી (With/Without Sign) અને ઓનલાઇન જાવક રજિસ્ટર.
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
              <span>લેટરહેડ & સહી</span>
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
                  શાળાનો કોઈપણ સત્તાવાર પત્ર લખવા અને A4 લેટરહેડ પર ડાઉનલોડ કરવા નીચેના બટન પર ક્લિક કરો.
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
                          {formatDateDisplay(l.letterDate)}
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
                            {/* Preview & Print */}
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
                <span className="text-xs font-mono font-bold text-[#C45A2D] bg-[#FBE9DF] px-3 py-1 rounded-xl">
                  {outwardNumber || 'જાવક ક્રમાંક'}
                </span>
              </div>

              {/* Quick Preset Templates Carousel */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>ઝડપી પત્ર નમૂનાઓ (Letter Templates):</span>
                  </label>
                  <span className="text-[10px] text-slate-400">એક ક્લિકથી લખાણ ભરાઈ જશે</span>
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#C45A2D]/50"
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
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1.5">
                    ૨. તારીખ (Date) *
                  </label>
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
                    <User className="w-3.5 h-3.5 text-blue-500" />
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
                  <span className="text-[10px] text-slate-400">નવો ફકરો પાડવા માટે Enter દબાવો</span>
                </div>
                <textarea
                  rows={9}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="સવિનય ઉપરોક્ત વિષય અન્વયે જણાવવાનું કે..."
                  className="w-full p-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white leading-relaxed focus:ring-2 focus:ring-[#C45A2D]/50 font-sans"
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

          {/* Right Live Preview Sticky Panel */}
          <div className="lg:col-span-4 space-y-4">
            <div className="glass-panel rounded-3xl border border-[#E2E8F0] dark:border-white/10 p-5 shadow-xl bg-white dark:bg-slate-900 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  લાઈવ પત્ર પ્રિવ્યુ (Live Card)
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                  A4 કદ
                </span>
              </div>

              {/* Mini A4 Sheet Look */}
              <div className="border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-4 bg-white text-slate-900 shadow-md text-[11px] leading-relaxed space-y-3 font-sans min-h-[380px] flex flex-col justify-between">
                <div>
                  <div className="text-center border-b pb-2">
                    <div className="font-black text-xs uppercase">{school.schoolName}</div>
                    <div className="text-[9px] text-slate-500">DISE: {school.diseCode}</div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-bold mt-2 text-slate-600">
                    <span>નંબર: {outwardNumber || '...'}</span>
                    <span>તા: {formatDateDisplay(letterDate)}</span>
                  </div>

                  <div className="mt-2 text-[10px]">
                    <span className="font-bold">પ્રતિ,</span>
                    <div className="font-black">{recipientName || '(મેળવનારનું નામ)'}</div>
                  </div>

                  <div className="mt-2 p-1.5 bg-slate-50 rounded border text-[10px] font-bold">
                    વિષય: {subject || '(પત્રનો વિષય)'}
                  </div>

                  <div className="mt-2 text-[10px] line-clamp-6 text-slate-700">
                    {content || '(પત્રનું લખાણ...)'}
                  </div>
                </div>

                <div className="border-t pt-2 flex justify-end text-[10px]">
                  <div className="text-center min-w-[90px]">
                    <div className="font-bold">લિ. આપનો વિશ્વાસુ,</div>
                    {settings.principalSignUrl && (
                      <img
                        src={settings.principalSignUrl}
                        alt="Sign"
                        className="h-7 mx-auto my-1 object-contain"
                      />
                    )}
                    <div className="font-black">{signatoryName || school.principalName || 'આચાર્યશ્રી'}</div>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>લેટરહેડ સ્થિતિ:</span>
                </div>
                <p>
                  {settings.letterheadUrl
                    ? '✅ A4 PNG લેટરહેડ અપલોડ કરેલ છે. પત્ર લેટરહેડ બેકગ્રાઉન્ડ પર પ્રિન્ટ થશે.'
                    : 'ℹ️ કોઈ PNG લેટરહેડ અપલોડ નથી. શાળાના નામ અને DISE કોડ વાળું હેડર ઓટોમેટિક બનશે.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: LETTERHEAD & SIGNATURE SETTINGS (લેટરહેડ & સહી સેટિંગ્સ)
          ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl border border-[#E2E8F0] dark:border-white/10 p-5 sm:p-6 shadow-xl bg-white dark:bg-slate-900 space-y-6">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-[#C45A2D]" />
                  <span>A4 લેટરહેડ અને આચાર્યશ્રીની સહી સેટિંગ્સ</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  એકવાર સેટ કર્યા બાદ આ લેટરહેડ અને સહી તમામ ભવિષ્યના જાવક પત્રોમાં ઓટોમેટિક ઉપયોગમાં લેવાશે.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="px-4 py-2 rounded-xl bg-[#C45A2D] hover:bg-[#a84a22] text-white text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSavingSettings ? 'સાચવી રહ્યું છે...' : 'સેટિંગ્સ સેવ કરો'}</span>
              </button>
            </div>

            {settingsSavedMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>લેટરહેડ અને સહી સેટિંગ્સ સફળતાપૂર્વક સાચવવામાં આવ્યા છે!</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SECTION A: A4 PNG LETTERHEAD UPLOAD */}
              <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Upload className="w-4 h-4 text-blue-500" />
                    <span>૧. A4 PNG લેટરહેડ અપલોડ (Letterhead Image)</span>
                  </h3>
                  {settings.letterheadUrl && (
                    <button
                      type="button"
                      onClick={() => setSettings((prev) => ({ ...prev, letterheadUrl: undefined }))}
                      className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
                    >
                      દૂર કરો (Remove)
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400">
                  તમારી શાળાનું તૈયાર પ્રિન્ટેડ A4 લેટરહેડ PNG/JPG ફોર્મેટમાં અપલોડ કરો. પત્રના તમામ અક્ષરો આ લેટરહેડની બરાબર વચ્ચે ગોઠવાશે.
                </p>

                {settings.letterheadUrl ? (
                  <div className="relative border-2 border-emerald-400/60 rounded-2xl overflow-hidden p-2 bg-white max-h-[300px] flex items-center justify-center">
                    <img
                      src={settings.letterheadUrl}
                      alt="Letterhead Preview"
                      className="max-h-[280px] w-auto object-contain shadow-sm"
                    />
                    <div className="absolute top-3 right-3 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                      સક્રિય લેટરહેડ
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#C45A2D] rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-white dark:bg-slate-800 transition-all text-center">
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                      A4 લેટરહેડ PNG પસંદ કરવા અહીં ક્લિક કરો
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">
                      સૂચવેલ માપ: A4 (210mm x 297mm) • PNG / JPG (મહત્તમ ૫ MB)
                    </span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleLetterheadUpload}
                      className="hidden"
                    />
                  </label>
                )}

                {/* Margins Adjusters */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-3">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                    લેટરહેડ માર્જિન સેટિંગ્સ (મિલીમીટર - mm):
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        ઉપરથી (Top Margin)
                      </label>
                      <input
                        type="number"
                        min="20"
                        max="120"
                        value={settings.topMarginMm ?? 48}
                        onChange={(e) => setSettings((p) => ({ ...p, topMarginMm: Number(e.target.value) || 48 }))}
                        className="w-full px-2 py-1.5 rounded-xl border text-center font-bold text-xs"
                      />
                      <span className="text-[9px] text-slate-400 block text-center mt-0.5">ડિફોલ્ટ: 48mm</span>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        નીચેથી (Bottom)
                      </label>
                      <input
                        type="number"
                        min="15"
                        max="80"
                        value={settings.bottomMarginMm ?? 25}
                        onChange={(e) => setSettings((p) => ({ ...p, bottomMarginMm: Number(e.target.value) || 25 }))}
                        className="w-full px-2 py-1.5 rounded-xl border text-center font-bold text-xs"
                      />
                      <span className="text-[9px] text-slate-400 block text-center mt-0.5">ડિફોલ્ટ: 25mm</span>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        ડાબેથી (Left)
                      </label>
                      <input
                        type="number"
                        min="10"
                        max="50"
                        value={settings.leftMarginMm ?? 20}
                        onChange={(e) => setSettings((p) => ({ ...p, leftMarginMm: Number(e.target.value) || 20 }))}
                        className="w-full px-2 py-1.5 rounded-xl border text-center font-bold text-xs"
                      />
                      <span className="text-[9px] text-slate-400 block text-center mt-0.5">ડિફોલ્ટ: 20mm</span>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        જમણેથી (Right)
                      </label>
                      <input
                        type="number"
                        min="10"
                        max="50"
                        value={settings.rightMarginMm ?? 20}
                        onChange={(e) => setSettings((p) => ({ ...p, rightMarginMm: Number(e.target.value) || 20 }))}
                        className="w-full px-2 py-1.5 rounded-xl border text-center font-bold text-xs"
                      />
                      <span className="text-[9px] text-slate-400 block text-center mt-0.5">ડિફોલ્ટ: 20mm</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION B: PRINCIPAL SIGNATURE (UPLOAD OR DRAW) */}
              <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-emerald-500" />
                    <span>૨. આચાર્યશ્રીની સહી (Principal Signature)</span>
                  </h3>
                  {settings.principalSignUrl && (
                    <button
                      type="button"
                      onClick={() => setSettings((prev) => ({ ...prev, principalSignUrl: undefined }))}
                      className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
                    >
                      દૂર કરો (Remove)
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400">
                  આચાર્યશ્રીની સહીનું પારદર્શક (Transparent) PNG અપલોડ કરો અથવા નીચેના બોક્સમાં સીધી સહી દોરો:
                </p>

                {/* Option 1: Upload File */}
                <div className="flex items-center gap-3">
                  <label className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>સહી ઈમેજ અપલોડ (PNG)</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg"
                      onChange={handleSignatureUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-slate-500">અથવા નીચે સ્ક્રીન પર દોરો:</span>
                </div>

                {/* Option 2: Digital Drawing Pad */}
                <div className="border-2 border-slate-300 dark:border-slate-700 rounded-2xl p-2 bg-white relative">
                  <div className="text-[10px] text-slate-400 text-center mb-1 font-mono">
                    -- આ બોક્સમાં આંગળી કે માઉસથી સહી કરો --
                  </div>
                  <canvas
                    ref={signatureCanvasRef}
                    width={380}
                    height={110}
                    onMouseDown={startDrawing}
                    onMouseMove={drawSignature}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={drawSignature}
                    onTouchEnd={stopDrawing}
                    className="w-full h-24 touch-none cursor-crosshair block bg-slate-50/50 rounded-xl border border-dashed border-slate-200"
                  />
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={clearSignatureCanvas}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
                    >
                      સાફ કરો (Clear)
                    </button>
                    <button
                      type="button"
                      onClick={saveCanvasSignature}
                      className="px-3 py-1 rounded-lg text-[11px] font-black bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                    >
                      દોરેલી સહી લાગુ કરો
                    </button>
                  </div>
                </div>

                {/* Active Signature Preview */}
                {settings.principalSignUrl && (
                  <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-xl bg-white border">
                        <img
                          src={settings.principalSignUrl}
                          alt="Principal Signature"
                          className="h-10 w-28 object-contain"
                        />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                          સક્રિય ડિજિટલ સહી
                        </div>
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400">
                          પત્રમાં આપમેળે મુકાશે
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Principal Name & Designation Form */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">આચાર્યશ્રીનું નામ</label>
                    <input
                      type="text"
                      value={settings.principalName || ''}
                      onChange={(e) => setSettings((p) => ({ ...p, principalName: e.target.value }))}
                      placeholder="આચાર્યશ્રીનું નામ"
                      className="w-full px-3 py-2 rounded-xl border text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">હોદ્દો</label>
                    <input
                      type="text"
                      value={settings.principalDesignation || 'આચાર્યશ્રી'}
                      onChange={(e) => setSettings((p) => ({ ...p, principalDesignation: e.target.value }))}
                      placeholder="આચાર્યશ્રી"
                      className="w-full px-3 py-2 rounded-xl border text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end">
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="px-6 py-2.5 rounded-xl bg-[#C45A2D] hover:bg-[#a84a22] text-white text-xs font-black shadow-lg cursor-pointer"
              >
                બધા સેટિંગ્સ સેવ કરો
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          FULL-SCREEN A4 LETTER PREVIEW & INSTANT PDF EXPORT MODAL
          ========================================================================= */}
      {previewLetter && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-5 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl max-w-4xl w-full max-h-[95vh] flex flex-col shadow-2xl animate-in fade-in overflow-hidden">
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 shrink-0">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#C45A2D]" />
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    જાવક પત્ર A4 પ્રિવ્યુ & PDF ડાઉનલોડ
                  </h3>
                  <p className="text-[11px] font-mono text-slate-500">
                    નંબર: {previewLetter.outwardNumber}
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
                  paddingTop: settings.letterheadUrl ? `${settings.topMarginMm ?? 48}mm` : '20mm',
                  paddingBottom: `${settings.bottomMarginMm ?? 25}mm`,
                  paddingLeft: `${settings.leftMarginMm ?? 20}mm`,
                  paddingRight: `${settings.rightMarginMm ?? 20}mm`,
                }}
                className="relative bg-white text-slate-900 shadow-2xl flex flex-col justify-between font-sans text-sm select-text border border-slate-300"
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
                        {school.village ? school.village + ', ' : ''}
                        {school.taluka ? school.taluka + ', ' : ''}
                        {school.district} • DISE કોડ: <strong>{school.diseCode}</strong>
                      </p>
                    </div>
                  )}

                  {/* Outward No & Date Row */}
                  <div className="flex items-center justify-between font-bold text-xs border-b border-slate-200 pb-2">
                    <div>
                      <span className="text-slate-500">જાવક ક્રમાંક: </span>
                      <strong className="text-slate-950 font-mono text-sm">{previewLetter.outwardNumber}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">તારીખ: </span>
                      <strong className="text-slate-950">{formatDateDisplay(previewLetter.letterDate)}</strong>
                    </div>
                  </div>

                  {/* Recipient */}
                  <div className="text-sm leading-relaxed">
                    <div className="font-bold">પ્રતિ,</div>
                    <div className="font-black text-base text-slate-950">{previewLetter.recipientName}</div>
                    {previewLetter.recipientAddress && (
                      <div className="text-slate-600 text-xs">{previewLetter.recipientAddress}</div>
                    )}
                  </div>

                  {/* Subject Banner */}
                  <div className="p-3 bg-slate-50 border-l-4 border-slate-900 font-bold text-sm leading-snug">
                    <span>વિષય: {previewLetter.subject}</span>
                    {previewLetter.reference && (
                      <div className="text-xs font-normal text-slate-600 mt-1">
                        સંદર્ભ: {previewLetter.reference}
                      </div>
                    )}
                  </div>

                  {/* Main Content */}
                  <div className="space-y-3 text-sm leading-relaxed text-justify text-slate-800">
                    <div className="font-bold">માનનીય સાહેબશ્રી,</div>
                    {previewLetter.content.split('\n\n').map((paragraph, i) => (
                      <p key={i} className="indent-8">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Bottom Section: Signatory & Copy To */}
                <div className="relative z-10 pt-6 mt-6">
                  {/* Signatory Box */}
                  <div className="flex justify-end">
                    <div className="text-center min-w-[200px] space-y-1">
                      <div className="font-bold text-xs text-slate-700">લિ. આપનો વિશ્વાસુ,</div>

                      {previewWithSign ? (
                        settings.principalSignUrl ? (
                          <div className="py-1">
                            <img
                              src={settings.principalSignUrl}
                              alt="Signature"
                              className="h-12 max-w-[150px] mx-auto object-contain"
                            />
                          </div>
                        ) : (
                          <div className="h-12 flex items-center justify-center text-[10px] text-slate-400 italic">
                            (ડિજિટલ સહી સેટ કરેલ નથી)
                          </div>
                        )
                      ) : (
                        <div className="h-12" /> /* Blank space for physical pen signature */
                      )}

                      <div className="font-black text-sm text-slate-950">
                        {previewWithSign ? previewLetter.signatoryName || school.principalName : `(${previewLetter.signatoryName || school.principalName})`}
                      </div>
                      <div className="text-xs text-slate-600 font-medium">
                        {previewLetter.signatoryDesignation || 'આચાર્યશ્રી'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {school.schoolName}
                      </div>
                    </div>
                  </div>

                  {/* Copy to list */}
                  {previewLetter.copyTo && previewLetter.copyTo.length > 0 && (
                    <div className="mt-6 pt-3 border-t border-dashed border-slate-300 text-xs text-slate-600">
                      <div className="font-bold mb-1">નકલ સવિનય રવાના:</div>
                      <ol className="list-decimal pl-5 space-y-0.5">
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
                <span>પરિમાણ: A4 •</span>
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
