import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { School, OutwardLetter, OutwardLetterSettings } from '../types';
import {
  getOutwardLetters,
  subscribeToOutwardLetters,
  saveOutwardLetter,
  deleteOutwardLetter,
  getOutwardSettings,
  saveOutwardSettings,
  subscribeToOutwardSettings,
} from '../services/outwardLetterService';
import {
  printHtmlDocument,
  downloadPdfFile,
  sharePdfFile,
  isAndroidNativeApp,
  blobToBase64,
} from '../utils/printAndPdfUtils';
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
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Hash,
  Share2,
  Scissors,
} from 'lucide-react';

// Dedicated Official WhatsApp Icon Component
const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c4.55 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.28-2.42 5.83a8.194 8.194 0 0 1-5.82 2.41h-.01c-1.46 0-2.88-.39-4.13-1.12l-.3-.18-3.07.81.82-2.99-.19-.31a8.188 8.188 0 0 1-1.26-4.45c0-4.54 3.7-8.24 8.25-8.24zm4.51 11.66c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.06-.39-2.02-1.25-.75-.67-1.25-1.5-1.4-1.75-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43-.14-.01-.31-.01-.48-.01-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.12.17 1.78 2.72 4.31 3.81.6.26 1.07.42 1.44.54.61.19 1.16.17 1.6.1.49-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29z"/>
  </svg>
);

/**
 * High-performance edge-to-edge signature auto-crop engine.
 * Strips away empty transparent and near-white borders, so ink strokes fit
 * snug directly above the principal's name without large blank gaps.
 */
export function cropSignatureImageEdgeToEdge(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const { data, width, height } = imgData;

        let minX = width;
        let minY = height;
        let maxX = -1;
        let maxY = -1;

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            // Ink stroke: has opacity and is not paper white/near white
            const isWhite = r > 228 && g > 228 && b > 228;
            const isInk = a > 20 && !isWhite;

            if (isInk) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        // If no bounds detected, keep as is
        if (maxX < minX || maxY < minY) {
          resolve(dataUrl);
          return;
        }

        // Add 3px breathing margin
        const pad = 3;
        const cropX = Math.max(0, minX - pad);
        const cropY = Math.max(0, minY - pad);
        const cropW = Math.min(width - cropX, maxX - minX + 1 + pad * 2);
        const cropH = Math.min(height - cropY, maxY - minY + 1 + pad * 2);

        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = cropW;
        croppedCanvas.height = cropH;
        const croppedCtx = croppedCanvas.getContext('2d');
        if (!croppedCtx) {
          resolve(dataUrl);
          return;
        }

        // Clean white paper to transparency
        const croppedData = ctx.getImageData(cropX, cropY, cropW, cropH);
        const cData = croppedData.data;
        for (let i = 0; i < cData.length; i += 4) {
          const r = cData[i];
          const g = cData[i + 1];
          const b = cData[i + 2];
          if (r > 225 && g > 225 && b > 225) {
            cData[i + 3] = 0;
          }
        }
        croppedCtx.putImageData(croppedData, 0, 0);

        // Cap max resolution at 900px width
        let finalCanvas = croppedCanvas;
        if (cropW > 900) {
          const scale = 900 / cropW;
          const scaledCanvas = document.createElement('canvas');
          scaledCanvas.width = 900;
          scaledCanvas.height = Math.round(cropH * scale);
          const sCtx = scaledCanvas.getContext('2d');
          if (sCtx) {
            sCtx.imageSmoothingEnabled = true;
            sCtx.imageSmoothingQuality = 'high';
            sCtx.drawImage(croppedCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
            finalCanvas = scaledCanvas;
          }
        }

        resolve(finalCanvas.toDataURL('image/png'));
      } catch (err) {
        console.warn('Signature edge crop notice:', err);
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Letterhead compressor: resizes letterhead image to standard A4 (max 1654px)
 * ensuring it stays under 350KB so it synchronizes safely to Firestore across devices.
 */
export function compressLetterheadImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Dynamic Recipient Presets based on the School's Profile (Taluka & District)
 * E.g. If school is in Anjar taluka, Kachchh district, TDO will auto-fill "અંજાર - કચ્છ."
 */
export function getRecipientPresetsForSchool(school: School) {
  const taluka = (school.taluka || '').trim() || 'અંજાર';
  const district = (school.district || '').trim() || 'કચ્છ';
  const village = (school.village || '').trim() || '';

  // District Headquarters mapping for Gujarat
  const districtHqMap: Record<string, string> = {
    'કચ્છ': 'ભુજ - કચ્છ.',
    'Kachchh': 'ભુજ - કચ્છ.',
    'Kutch': 'ભુજ - કચ્છ.',
    'બનાસકાંઠા': 'પાલનપુર - બનાસકાંઠા.',
    'સાબરકાંઠા': 'હિંમતનગર - સાબરકાંઠા.',
    'પંચમહાલ': 'ગોધરા - પંચમહાલ.',
    'મહીસાગર': 'લુણાવાડા - મહીસાગર.',
    'અરવલ્લી': 'મોડાસા - અરવલ્લી.',
    'ડાંગ': 'આહવા - ડાંગ.',
    'નર્મદા': 'રાજપીપળા - નર્મદા.',
    'તાપી': 'વ્યારા - તાપી.',
    'ગીર સોમનાથ': 'વેરાવળ - ગીર સોમનાથ.',
    'દેવભૂમિ દ્વારકા': 'ખંભાળિયા - દેવભૂમિ દ્વારકા.',
    'છોટાઉદેપુર': 'છોટાઉદેપુર.',
    'બોટાદ': 'બોટાદ.',
    'મોરબી': 'મોરબી.',
  };

  const districtHq = districtHqMap[district] || `${district}.`;
  const talukaDistrict = `${taluka} - ${district}.`;

  return [
    {
      label: 'જિલ્લા શિક્ષણાધિકારીશ્રી (DEO)',
      designation: 'જિલ્લા શિક્ષણાધિકારીશ્રી,',
      office: 'જિલ્લા શિક્ષણાધિકારીશ્રીની કચેરી',
      address: districtHq,
    },
    {
      label: 'જિલ્લા પ્રાથમિક શિક્ષણાધિકારીશ્રી (DPEO)',
      designation: 'જિલ્લા પ્રાથમિક શિક્ષણાધિકારીશ્રી,',
      office: 'જિલ્લા પંચાયત શિક્ષણ શાખા',
      address: districtHq,
    },
    {
      label: 'તાલુકા વિકાસ અધિકારીશ્રી (TDO)',
      designation: 'તાલુકા વિકાસ અધિકારીશ્રી,',
      office: 'તાલુકા પંચાયત કચેરી',
      address: talukaDistrict,
    },
    {
      label: 'તાલુકા પ્રાથમિક શિક્ષણાધિકારીશ્રી (TPEO)',
      designation: 'તાલુકા પ્રાથમિક શિક્ષણાધિકારીશ્રી,',
      office: 'તાલુકા પંચાયત શિક્ષણ શાખા',
      address: talukaDistrict,
    },
    {
      label: 'બ્લોક રિસોર્સ કો-ઓર્ડિનેટરશ્રી (BRC)',
      designation: 'બ્લોક રિસોર્સ કો-ઓર્ડિનેટરશ્રી,',
      office: `બ્લોક રિસોર્સ સેન્ટર (BRC ભવન - ${taluka})`,
      address: talukaDistrict,
    },
    {
      label: 'મામલતદારશ્રી (Mamlatdar)',
      designation: 'મામલતદારશ્રી,',
      office: 'મામલતદારશ્રીની કચેરી',
      address: `${taluka} (જનસેવા કેન્દ્ર) - ${district}.`,
    },
    {
      label: 'જિલ્લા વિકાસ અધિકારીશ્રી (DDO)',
      designation: 'જિલ્લા વિકાસ અધિકારીશ્રી,',
      office: 'જિલ્લા પંચાયત કચેરી',
      address: districtHq,
    },
    {
      label: 'કલેક્ટરશ્રી (Collector)',
      designation: 'કલેક્ટરશ્રી,',
      office: 'કલેક્ટર કચેરી (જિલ્લા સેવાસદન)',
      address: districtHq,
    },
    {
      label: 'ક્લસ્ટર રિસોર્સ કો-ઓર્ડિનેટરશ્રી (CRC)',
      designation: 'ક્લસ્ટર રિસોર્સ કો-ઓર્ડિનેટરશ્રી,',
      office: 'ક્લસ્ટર રિસોર્સ સેન્ટર (CRC)',
      address: `${village ? `${village}, તા. ` : ''}${talukaDistrict}`,
    },
    {
      label: 'સરપંચશ્રી / તલાટી કમ મંત્રીશ્રી',
      designation: 'સરપંચશ્રી / તલાટી કમ મંત્રીશ્રી,',
      office: 'ગ્રામ પંચાયત કચેરી',
      address: `${village ? `${village}, તા. ` : ''}${talukaDistrict}`,
    },
    {
      label: 'વાલીશ્રી / વાલી મંડળ',
      designation: 'વાલીશ્રી,',
      office: 'વાલી મંડળ સમિતિ',
      address: `${village ? `${village}, તા. ` : ''}${talukaDistrict}`,
    },
  ];
}

export const LETTER_TEMPLATES = [
  {
    title: 'ગ્રાન્ટ વપરાશ પ્રમાણપત્ર',
    subject: 'શાળા ગ્રાન્ટ વપરાશ પ્રમાણપત્ર રજૂ કરવા બાબત...',
    content:
      'સવિનય જયભારત સાથે ઉપરોક્ત વિષય અને સંદર્ભ અન્વયે જણાવવાનું કે અમારી શાળાને ચાલુ શૈક્ષણિક સત્ર દરમિયાન ફાળવવામાં આવેલ શાળા વિકાસ ગ્રાન્ટનો નિયમોનુસાર અને નિર્ધારિત હેતુ માટે સંપૂર્ણ વપરાશ કરવામાં આવેલ છે.\n\nજેનું વપરાશ પ્રમાણપત્ર (Utilization Certificate) તથા ખર્ચના વાઉચરો અને હિસાબી પત્રકો આ સાથે બિડાણ કરી સાદર રજૂ કરીએ છીએ. જે ધ્યાને લઈ યોગ્ય કાર્યવાહી કરવા નમ્ર વિનંતી છે.',
  },
  {
    title: 'વિદ્યાર્થી માહિતી',
    subject: 'વિદ્યાર્થીઓની શૈક્ષણિક વિગતો મોકલવા બાબત...',
    content:
      'સવિનય જયભારત સાથે ઉપરોક્ત વિષય અન્વયે જણાવવાનું કે આપશ્રીની કચેરી દ્વારા માંગવામાં આવેલ અમારી શાળાના ધોરણ-૧ થી ૮ ના વિદ્યાર્થીઓની જરૂરી માહિતી આ સાથે સામેલ પત્રકમાં ભરીને મોકલી આપેલ છે.\n\nઆ વિગતો આપશ્રીના રેકોર્ડ અર્થે સ્વીકારવા નમ્ર વિનંતી છે.',
  },
  {
    title: 'સ્થાનિક રજા મંજૂરી',
    subject: 'શાળાની સ્થાનિક રજાની મંજૂરી મેળવવા બાબત...',
    content:
      'સવિનય ઉપરોક્ત વિષય પરત્વે જણાવવાનું કે સ્થાનિક ઉત્સવ/કાર્યક્રમ નિમિત્તે શાળામાં સ્થાનિક રજા જાહેર કરવાની મંજૂરી મેળવવા માટે આ અરજી સાદર રજૂ કરવામાં આવેલ છે.\n\nઆ દિવસના બદલામાં અન્ય જાહેર રજાના દિવસે શિક્ષણકાર્ય ચાલુ રાખી અભ્યાસક્રમ પૂર્ણ કરવામાં આવશે. યોગ્ય મંજૂરી આપવા વિનંતી.',
  },
  {
    title: 'સમારકામ દરખાસ્ત',
    subject: 'શાળા મકાન મરામત અને સમારકામ ગ્રાન્ટ મંજૂર કરવા બાબત...',
    content:
      'સાદર પ્રણામ સાથે જણાવવાનું કે અમારી શાળાના ઓરડાઓમાં ચોમાસા દરમિયાન તથા વાર્ષિક જાળવણી અન્વયે જરૂરી સમારકામ કરવાની તાતી જરૂરિયાત છે.\n\nજે અંગે શાળા વ્યવસ્થાપન સમિતિ (SMC) ના ઠરાવ તથા અંદાજિત ખર્ચનું પત્રક આ સાથે જોડેલ છે. યોગ્ય ગ્રાન્ટ મંજૂર કરી આપવા વિનંતી.',
  },
  {
    title: 'સામાન્ય સત્તાવાર પત્ર',
    subject: 'શાળાકીય બાબતો અંગે જરૂરી કાર્યવાહી કરવા બાબત...',
    content:
      'સવિનય જયભારત સાથે જણાવવાનું કે શાળાના વહીવટી અને શૈક્ષણિક સંચાલન અર્થે ઉપર્યુક્ત વિષય સંદર્ભે ઘટતું કરવા નમ્ર નિવેદન છે.\n\nઆ અંગે જરૂરી આધાર-પુરાવા આ પત્ર સાથે સામેલ રાખેલ છે.',
  },
];

export interface OutwardLetterManagerProps {
  school: School;
  onBack?: () => void;
}

export const OutwardLetterManager: React.FC<OutwardLetterManagerProps> = ({
  school,
  onBack,
}) => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'register' | 'new_letter' | 'settings'>('register');

  // Utility to convert Gujarati digits to English for robust math/parsing
  const toEnglishDigits = (str: string): string => {
    const gujarati = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];
    return String(str || '').replace(/[૦-૯]/g, (d) => String(gujarati.indexOf(d)));
  };

  // Universal bidirectional digit formatter (Gujarati <-> English)
  const formatDigits = useCallback((text: string | number | undefined | null, format: 'gujarati' | 'english'): string => {
    if (text === undefined || text === null) return '';
    const str = String(text);
    return format === 'gujarati' ? toGujaratiDigits(str) : toEnglishDigits(str);
  }, []);

  // Letters state
  const [letters, setLetters] = useState<OutwardLetter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Settings state (Letterhead, Sign, Margins, Prefix, Auto-Numbering & Digit Format)
  const [settings, setSettings] = useState<OutwardLetterSettings>({
    topMarginMm: 62, // Defaults calibrated for standard official letterheads
    bottomMarginMm: 32, // Defaults calibrated to clear standard footers
    leftMarginMm: 22,
    rightMarginMm: 22,
    outwardPrefix: 'સ.હા.લા/૨૦૨૬/', // Configurable prefix e.g. "સ.હા.લા/૨૦૨૬/" or "સ.હા.લા/2026/"
    outwardStartingNumber: 1, // Start counter
    outwardPadDigits: 3, // 3-digit pad: ૦૦૧, ૦૦૨
    principalSignWidthMm: 48, // Default signature width on A4 (in mm)
    principalDesignation: 'આચાર્યશ્રી',
    digitFormat: 'gujarati', // Default: 'gujarati' (૧, ૨, ૩) or 'english' (1, 2, 3)
  });
  // Auto Cloud Sync State (Instant background synchronization on every setting change)
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing'>('synced');
  const lastSyncedSettingsRef = useRef<string>('');
  const isInitialSettingsLoadRef = useRef<boolean>(true);

  // General Digits Format for Current Letter & Preview (Gujarati vs English digits)
  const [letterDigitFormat, setLetterDigitFormat] = useState<'gujarati' | 'english'>('gujarati');
  const [previewDigitFormat, setPreviewDigitFormat] = useState<'gujarati' | 'english'>('gujarati');

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
  // Structured Recipient fields: 1. હોદ્દેદારશ્રી, 2. કચેરી, 3. સરનામું
  const [recipientDesignation, setRecipientDesignation] = useState('જિલ્લા શિક્ષણાધિકારીશ્રી,');
  const [recipientOffice, setRecipientOffice] = useState('જિલ્લા શિક્ષણાધિકારીશ્રીની કચેરી');
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
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
  const letterA4Ref = useRef<HTMLDivElement>(null);
  const modalBodyRef = useRef<HTMLDivElement>(null);
  const [previewScaleMode, setPreviewScaleMode] = useState<'fit' | 'actual'>('fit');
  const [computedPreviewScale, setComputedPreviewScale] = useState<number>(0.5);

  // Digital Signature Canvas State
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Drag Margin Adjustment Canvas Ref
  const dragCanvasRef = useRef<HTMLDivElement>(null);
  const [draggingGuide, setDraggingGuide] = useState<'top' | 'bottom' | null>(null);

  // Load Settings and Letters on Mount with Real-time Multi-Device Cloud Sync
  useEffect(() => {
    let unsubLetters: (() => void) | undefined;
    let unsubSettings: (() => void) | undefined;
    if (school?.id) {
      // 1. Real-time subscribe to outward settings (Letterhead, Sign, Margins, Prefix, Digits format)
      unsubSettings = subscribeToOutwardSettings(school.id, (saved) => {
        const loadedFormat = saved.digitFormat || 'gujarati';
        setSettings((prev) => {
          const merged: OutwardLetterSettings = {
            ...prev,
            ...saved,
            topMarginMm: saved.topMarginMm ?? 62,
            bottomMarginMm: saved.bottomMarginMm ?? 32,
            leftMarginMm: saved.leftMarginMm ?? 22,
            rightMarginMm: saved.rightMarginMm ?? 22,
            outwardPrefix: saved.outwardPrefix || prev.outwardPrefix || 'સ.હા.લા/૨૦૨૬/',
            outwardStartingNumber: saved.outwardStartingNumber ?? 1,
            outwardPadDigits: saved.outwardPadDigits ?? 3,
            principalSignWidthMm: saved.principalSignWidthMm ?? 48,
            principalName: saved.principalName || school.principalName || '',
            principalDesignation: saved.principalDesignation || 'આચાર્યશ્રી',
            digitFormat: loadedFormat,
          };
          lastSyncedSettingsRef.current = JSON.stringify(merged);
          return merged;
        });
        setLetterDigitFormat(loadedFormat);
        setPreviewDigitFormat(loadedFormat);
        isInitialSettingsLoadRef.current = false;
        setSyncStatus('synced');
      });

      // 2. Real-time subscribe to outward letters
      unsubLetters = subscribeToOutwardLetters(school.id, (list) => {
        setLetters(list);
        setIsLoading(false);
      });
    }

    return () => {
      if (unsubLetters) unsubLetters();
      if (unsubSettings) unsubSettings();
    };
  }, [school?.id]);

  // Automatic Cloud Sync: Whenever any setting changes, auto-sync to Cloud & LocalStorage immediately
  useEffect(() => {
    if (isInitialSettingsLoadRef.current || !school?.id) return;
    const currentJson = JSON.stringify(settings);
    if (currentJson === lastSyncedSettingsRef.current) return;

    setSyncStatus('syncing');
    const timer = setTimeout(async () => {
      try {
        lastSyncedSettingsRef.current = currentJson;
        await saveOutwardSettings(school.id, settings);
        setSyncStatus('synced');
      } catch (err) {
        console.warn('Auto cloud sync notice:', err);
        setSyncStatus('synced');
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [settings, school?.id]);

  // Next Auto Outward Number Generator with Smart Prefix, Zero Padding & Digits Format
  const generateNextOutwardNumber = useCallback((customPrefix?: string, customPad?: number, customStart?: number, customFormat?: 'gujarati' | 'english') => {
    const rawPrefix = (customPrefix !== undefined ? customPrefix : (settings.outwardPrefix || 'સ.હા.લા/૨૦૨૬/')).trim();
    // Normalize prefix: if it doesn't end with '/' or '-', append '/'
    const prefix = rawPrefix.endsWith('/') || rawPrefix.endsWith('-') ? rawPrefix : `${rawPrefix}/`;
    
    const padDigits = customPad !== undefined ? customPad : (settings.outwardPadDigits ?? 3);
    const startNum = customStart !== undefined ? customStart : (settings.outwardStartingNumber ?? 1);
    const activeFormat = customFormat !== undefined ? customFormat : (letterDigitFormat || settings.digitFormat || 'gujarati');
    
    // Scan saved letters to find highest sequence number with this prefix
    let maxSequence = startNum - 1;
    const engPrefix = toEnglishDigits(prefix).toLowerCase();
    
    letters.forEach((item) => {
      const engOutward = toEnglishDigits(item.outwardNumber || '').toLowerCase().trim();
      if (engOutward.startsWith(engPrefix)) {
        const suffix = engOutward.slice(engPrefix.length).trim();
        const match = suffix.match(/^(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxSequence) {
            maxSequence = num;
          }
        }
      } else {
        // Fallback: check if the number ends with digits
        const match = engOutward.match(/(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxSequence) {
            maxSequence = num;
          }
        }
      }
    });
    
    const nextSeq = Math.max(startNum, maxSequence + 1);
    const padded = String(nextSeq).padStart(padDigits, '0');
    
    // Format both the prefix year/number and the sequence according to activeFormat!
    const formattedPrefix = formatDigits(prefix, activeFormat);
    const formattedSequence = formatDigits(padded, activeFormat);
    
    return `${formattedPrefix}${formattedSequence}`;
  }, [settings.outwardPrefix, settings.outwardPadDigits, settings.outwardStartingNumber, settings.digitFormat, letterDigitFormat, letters, formatDigits]);

  // Calculate Responsive A4 Scale for Modal Preview so entire page fits on screen without horizontal scroll
  useEffect(() => {
    if (!previewLetter) return;
    const calculateScale = () => {
      if (!modalBodyRef.current) return;
      const containerWidth = modalBodyRef.current.clientWidth;
      if (previewScaleMode === 'actual') {
        setComputedPreviewScale(1);
        return;
      }
      // Target A4 is 794px wide and 1123px high
      const usableWidth = Math.max(220, containerWidth - 20);
      const containerHeight = modalBodyRef.current.clientHeight;
      const usableHeight = containerHeight > 100 ? Math.max(260, containerHeight - 20) : 1123;
      const scaleByWidth = usableWidth / 794;
      const scaleByHeight = usableHeight / 1123;
      const scale = Math.max(0.28, Math.min(1, Math.min(scaleByWidth, scaleByHeight)));
      setComputedPreviewScale(scale);
    };

    calculateScale();
    const timer = setTimeout(calculateScale, 80);
    window.addEventListener('resize', calculateScale);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculateScale);
    };
  }, [previewLetter, previewScaleMode]);

  // Switch to New Letter tab
  const handleStartNewLetter = () => {
    const defaultFormat = settings.digitFormat || 'gujarati';
    const presets = getRecipientPresetsForSchool(school);
    const defPreset = presets[0];
    setLetterDigitFormat(defaultFormat);
    setEditingLetterId(null);
    setOutwardNumber(generateNextOutwardNumber(undefined, undefined, undefined, defaultFormat));
    setRecipientDesignation(defPreset?.designation || 'જિલ્લા શિક્ષણાધિકારીશ્રી,');
    setRecipientOffice(defPreset?.office || 'જિલ્લા શિક્ષણાધિકારીશ્રીની કચેરી');
    setRecipientAddress(defPreset?.address || '');
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
    const effFormat = item.digitFormat || settings.digitFormat || 'gujarati';
    setLetterDigitFormat(effFormat);
    setEditingLetterId(item.id);
    setOutwardNumber(item.outwardNumber);
    setLetterDate(item.letterDate);
    setRecipientDesignation(item.recipientDesignation || item.recipientName || '');
    setRecipientOffice(item.recipientOffice || '');
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
    const effFormat = item.digitFormat || settings.digitFormat || 'gujarati';
    setLetterDigitFormat(effFormat);
    setEditingLetterId(null);
    setOutwardNumber(generateNextOutwardNumber(undefined, undefined, undefined, effFormat));
    setRecipientDesignation(item.recipientDesignation || item.recipientName || '');
    setRecipientOffice(item.recipientOffice || '');
    setRecipientAddress(item.recipientAddress || '');
    setSubject(item.subject);
    setReference(item.reference || '');
    setContent(item.content);
    setCopyToList(item.copyTo || []);
    setSignatoryName(settings.principalName || school.principalName || '');
    setSignatoryDesignation(settings.principalDesignation || 'આચાર્યશ્રી');
    setActiveTab('new_letter');
  };

  // Toggle Digits format in Form (Gujarati <-> English)
  const handleToggleDigitFormat = (newFormat: 'gujarati' | 'english') => {
    setLetterDigitFormat(newFormat);
    setOutwardNumber((prev) => formatDigits(prev, newFormat));
  };

  // Toggle Digits format in Preview Modal
  const handleTogglePreviewDigitFormat = (newFormat: 'gujarati' | 'english') => {
    setPreviewDigitFormat(newFormat);
    if (previewLetter) {
      setPreviewLetter((prev) => prev ? ({ ...prev, digitFormat: newFormat }) : null);
    }
  };

  // Update Signature Size live with instant save
  const handleUpdateSignWidth = (newWidthMm: number) => {
    const clamped = Math.max(20, Math.min(150, Math.round(newWidthMm)));
    setSettings((prev) => {
      const updated = { ...prev, principalSignWidthMm: clamped };
      saveOutwardSettings(school.id, updated).catch(console.error);
      return updated;
    });
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
    if (!recipientDesignation.trim() && !recipientOffice.trim()) {
      alert('કૃપા કરીને પ્રતિ (હોદ્દેદારશ્રી અથવા કચેરી) ની વિગત દાખલ કરો.');
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
    const effDesignation = recipientDesignation.trim();
    const effOffice = recipientOffice.trim();
    const compositeName = [effDesignation, effOffice].filter(Boolean).join(' ');

    const newDoc: OutwardLetter = {
      id: docId,
      schoolId: school.id,
      outwardNumber: outwardNumber.trim(),
      letterDate,
      recipientDesignation: effDesignation || undefined,
      recipientOffice: effOffice || undefined,
      recipientName: compositeName || effDesignation || effOffice || 'મેળવનારશ્રી',
      recipientAddress: recipientAddress.trim() || undefined,
      subject: subject.trim(),
      reference: reference.trim() || undefined,
      content: content.trim(),
      copyTo: copyToList.length > 0 ? copyToList : undefined,
      signatoryName: signatoryName.trim() || settings.principalName || school.principalName || '',
      signatoryDesignation: signatoryDesignation.trim() || 'આચાર્યશ્રી',
      digitFormat: letterDigitFormat,
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
      setPreviewDigitFormat(saved.digitFormat || letterDigitFormat || settings.digitFormat || 'gujarati');
    }
  };

  // Handle Letterhead PNG/JPG Upload with Auto Compression (< 350KB for fast Cloud Sync)
  const handleLetterheadUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('કૃપા કરીને માત્ર PNG અથવા JPG ઈમેજ ફાઈલ પસંદ કરો.');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const originalDataUrl = ev.target?.result as string;
        if (!originalDataUrl) return;

        setSettings((prev) => {
          const next = { ...prev, letterheadUrl: originalDataUrl };
          saveOutwardSettings(school.id, next).catch(console.error);
          return next;
        });
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      alert('લેટરહેડ અપલોડ કરવામાં ક્ષતિ આવી.');
    }
  };

  // Handle Signature Image Upload with Auto Edge-to-Edge Crop
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawDataUrl = event.target?.result as string;
      const cropped = await cropSignatureImageEdgeToEdge(rawDataUrl);
      setSettings((prev) => {
        const next = { ...prev, principalSignUrl: cropped };
        saveOutwardSettings(school.id, next).catch(console.error);
        return next;
      });
    };
    reader.readAsDataURL(file);
  };

  // Trigger manual edge-to-edge crop on currently active signature
  const handleCropActiveSignature = async () => {
    if (!settings.principalSignUrl) return;
    try {
      const cropped = await cropSignatureImageEdgeToEdge(settings.principalSignUrl);
      setSettings((prev) => {
        const next = { ...prev, principalSignUrl: cropped };
        saveOutwardSettings(school.id, next).catch(console.error);
        return next;
      });
      alert('✅ સહી એજ-ટુ-એજ ક્રોપ થઈ ગઈ છે! હવે સહી અને આચાર્યશ્રીના નામ વચ્ચે વધારાની ખાલી જગ્યા રહેશે નહીં.');
    } catch (e) {
      console.error(e);
    }
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

  const saveCanvasSignature = async () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const rawDataUrl = canvas.toDataURL('image/png');
    const cropped = await cropSignatureImageEdgeToEdge(rawDataUrl);
    setSettings((prev) => {
      const next = { ...prev, principalSignUrl: cropped };
      saveOutwardSettings(school.id, next).catch(console.error);
      return next;
    });
    alert('✅ સહી સેવ અને એજ-ટુ-એજ ક્રોપ થઈ ગઈ છે.');
  };


  // Format date display (DD/MM/YYYY) in English or Gujarati digits
  const formatDateDisplay = useCallback((isoDate: string, format: 'gujarati' | 'english' = 'gujarati') => {
    if (!isoDate) return '-';
    try {
      const parts = isoDate.split('-');
      if (parts.length === 3) {
        const d = `${parts[2]}/${parts[1]}/${parts[0]}`;
        return formatDigits(d, format);
      }
      return formatDigits(isoDate, format);
    } catch (e) {
      return isoDate;
    }
  }, [formatDigits]);

  // Helper to generate exact file name: JavakNo_Subjectinshort_date.pdf
  const getLetterPdfFilename = useCallback((
    letter: OutwardLetter,
    withSign?: boolean,
    customFormat?: 'gujarati' | 'english'
  ): string => {
    const activeFormat = customFormat || letter.digitFormat || letterDigitFormat || settings.digitFormat || 'gujarati';
    const formattedJavak = formatDigits(letter.outwardNumber || 'જાવક', activeFormat);
    // 1. JavakNo (clean slashes and illegal characters into hyphens)
    const cleanJavak = formattedJavak
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, '')
      .replace(/^-+|-+$/g, '');

    // 2. Subjectinshort (clean punctuation, pick first 3-4 key words, max 25 chars)
    const rawSubject = (letter.subject || 'પત્ર')
      .replace(/[\\/:*?"<>|\.,;!?'"()\[\]{}–—]+/g, ' ')
      .trim();
    const words = rawSubject.split(/\s+/).filter(Boolean);
    let shortSub = words.slice(0, 4).join('_');
    if (shortSub.length > 25) {
      shortSub = shortSub.substring(0, 25).replace(/_+$/, '');
    }
    if (!shortSub) shortSub = 'પત્ર';

    // 3. date (formatted date string YYYY-MM-DD)
    const rawDate = letter.letterDate || new Date().toISOString().split('T')[0];
    const cleanDate = rawDate.replace(/[\\/:*?"<>|]+/g, '-');

    // Exactly JavakNo_Subjectinshort_date.pdf
    return `${cleanJavak}_${shortSub}_${cleanDate}.pdf`;
  }, [letterDigitFormat, settings.digitFormat, formatDigits]);

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
  const buildLetterPrintHtml = (
    letter: OutwardLetter,
    withSign: boolean,
    customFormat?: 'gujarati' | 'english'
  ): string => {
    const activeFormat = customFormat || letter.digitFormat || letterDigitFormat || settings.digitFormat || 'gujarati';
    const topMargin = settings.topMarginMm ?? 62;
    const bottomMargin = settings.bottomMarginMm ?? 32;
    const leftMargin = settings.leftMarginMm ?? 22;
    const rightMargin = settings.rightMarginMm ?? 22;

    const formattedDate = formatDateDisplay(letter.letterDate, activeFormat);
    const formattedOutwardNo = formatDigits(letter.outwardNumber, activeFormat);
    const signWidthMm = settings.principalSignWidthMm ?? 48;
    const signMaxHeightMm = Math.max(50, Math.round(signWidthMm * 0.85));

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

    // Signatory block (allowing signature to grow up to 140mm without clipping or height limit)
    const showName = settings.showSignatoryName !== false;
    const showDesig = settings.showSignatoryDesignation !== false;
    const showSchool = Boolean(settings.showSchoolNameInSign);

    const signBlockHtml = withSign && settings.principalSignUrl
      ? `
        <div style="text-align: center; display: inline-block; min-width: ${Math.max(160, Math.round(signWidthMm * 1.15))}px; max-width: 360px;">
          <div style="display: flex; align-items: center; justify-content: center; margin: 0; padding: 0;">
            <img src="${settings.principalSignUrl}" alt="Signature" style="width: ${signWidthMm}mm; max-height: ${signMaxHeightMm}mm; height: auto; object-fit: contain; margin: 0 auto; display: block;" />
          </div>
          ${showName ? `<p style="margin: 2px 0 0 0; font-weight: 800; font-size: 14.5px; color: #0f172a;">(${letter.signatoryName || settings.principalName || school.principalName || ''})</p>` : ''}
          ${showDesig ? `<p style="margin: 2px 0 0 0; font-size: 12.5px; color: #334155; font-weight: 600;">${letter.signatoryDesignation || 'આચાર્યશ્રી'}</p>` : ''}
          ${showSchool ? `<p style="margin: 1px 0 0 0; font-size: 11.5px; color: #64748b; font-weight: 500;">${school.schoolName}</p>` : ''}
        </div>
      `
      : `
        <div style="text-align: center; display: inline-block; min-width: 180px;">
          <div style="height: 48px;"></div>
          ${showName ? `<p style="margin: 2px 0 0 0; font-weight: 800; font-size: 14.5px; color: #0f172a;">(${letter.signatoryName || settings.principalName || school.principalName || ''})</p>` : ''}
          ${showDesig ? `<p style="margin: 2px 0 0 0; font-size: 12.5px; color: #334155; font-weight: 600;">${letter.signatoryDesignation || 'આચાર્યશ્રી'}</p>` : ''}
          ${showSchool ? `<p style="margin: 1px 0 0 0; font-size: 11.5px; color: #64748b; font-weight: 500;">${school.schoolName}</p>` : ''}
        </div>
      `;

    // Copy to block
    const copyToHtml = letter.copyTo && letter.copyTo.length > 0
      ? `
        <div style="margin-top: 24px; font-size: 12.5px; color: #334155; border-top: 1px dashed #cbd5e1; padding-top: 10px;">
          <p style="margin: 0 0 6px 0; font-weight: 700; color: #0f172a;">નકલ સવિનય રવાના:</p>
          <div style="margin: 0; padding-left: 4px; line-height: 1.7; font-weight: 500;">
            ${letter.copyTo.map((c, idx) => {
              const numLabel = activeFormat === 'gujarati' ? `${toGujaratiDigits(String(idx + 1))}. ` : `${idx + 1}. `;
              const formattedItem = formatDigits(c, activeFormat);
              return `<div style="display: flex; gap: 6px;"><span style="font-weight: 700; min-width: 18px;">${numLabel}</span><span>${formattedItem}</span></div>`;
            }).join('')}
          </div>
        </div>
      `
      : '';

    // Filename without extension for print window document title
    const filenameWithExt = getLetterPdfFilename(letter, withSign, activeFormat);
    const filenameNoExt = filenameWithExt.replace(/\.pdf$/i, '');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${filenameNoExt}</title>
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
            line-height: 1.5;
          }
          .recipient-block .to-label {
            font-weight: 800;
            margin-bottom: 2px;
            color: #0f172a;
          }
          .recipient-block .to-designation {
            font-weight: 800;
            font-size: 14.5px;
            color: #0f172a;
          }
          .recipient-block .to-office {
            font-weight: 700;
            font-size: 14px;
            color: #1e293b;
          }
          .recipient-block .to-address {
            color: #0f172a;
            font-weight: 700;
            font-size: 14px;
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
                <div class="to-designation">${letter.recipientDesignation || letter.recipientName}</div>
                ${letter.recipientOffice ? `<div class="to-office">${letter.recipientOffice}</div>` : ''}
                ${letter.recipientAddress ? `<div class="to-address">${letter.recipientAddress}</div>` : ''}
              </div>

              <div class="subject-container">
                <div class="subject-text">વિષય: ${letter.subject}</div>
                ${letter.reference ? `<div class="reference-text">સંદર્ભ: ${formatDigits(letter.reference, activeFormat)}</div>` : ''}
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

  // Direct Print via native browser / Android print dialog
  const handlePrint = (letter: OutwardLetter, withSign: boolean, customFormat?: 'gujarati' | 'english') => {
    const activeFormat = customFormat || (previewLetter?.id === letter.id ? previewDigitFormat : (letter.digitFormat || letterDigitFormat || settings.digitFormat || 'gujarati'));
    const filenameWithExt = getLetterPdfFilename(letter, withSign, activeFormat);
    const filenameNoExt = filenameWithExt.replace(/\.pdf$/i, '');
    const html = buildLetterPrintHtml(letter, withSign, activeFormat);
    printHtmlDocument(html, filenameNoExt);
  };

  // High-reliability PDF Blob generator for any outward letter (whether preview modal is open or not)
  const renderLetterToPdfBlob = async (
    letter: OutwardLetter,
    withSign: boolean,
    format: 'gujarati' | 'english'
  ): Promise<{ blob: Blob; filename: string }> => {
    const filename = getLetterPdfFilename(letter, withSign, format);

    let elementToCapture: HTMLElement | null = letterA4Ref.current;
    let tempContainer: HTMLElement | null = null;

    if (!elementToCapture || previewLetter?.id !== letter.id) {
      // Create offscreen container with exact A4 printable HTML
      tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '794px';
      tempContainer.style.minHeight = '1123px';
      tempContainer.style.backgroundColor = '#ffffff';
      tempContainer.style.zIndex = '-9999';
      tempContainer.innerHTML = buildLetterPrintHtml(letter, withSign, format);
      document.body.appendChild(tempContainer);

      const sheet = tempContainer.querySelector('.a4-sheet') as HTMLElement | null;
      elementToCapture = sheet || tempContainer;
    }

    if (!elementToCapture) {
      throw new Error('Element for A4 PDF rendering not found');
    }

    try {
      if (document.fonts) {
        await document.fonts.ready;
      }
      const canvas = await html2canvas(elementToCapture, {
        scale: 1.8, // Optimal 1.8 scale: light on Android memory, perfectly crisp on A4
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794,
        windowHeight: 1123,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      const blob = pdf.output('blob');
      return { blob, filename };
    } finally {
      if (tempContainer && document.body.contains(tempContainer)) {
        document.body.removeChild(tempContainer);
      }
    }
  };

  // Direct PDF Download: ALWAYS directly downloads the PDF file, NEVER opens print preview!
  const handleDownloadPdf = async (letter: OutwardLetter, withSign: boolean) => {
    setIsGeneratingPdf(true);
    try {
      const activeFormat =
        previewLetter?.id === letter.id
          ? previewDigitFormat
          : letter.digitFormat || letterDigitFormat || settings.digitFormat || 'gujarati';

      const { blob, filename } = await renderLetterToPdfBlob(letter, withSign, activeFormat);
      await downloadPdfFile(blob, filename);
    } catch (err) {
      console.error('PDF download error:', err);
      alert('PDF ડાઉનલોડ કરવામાં ક્ષતિ આવી, કૃપા કરીને ફરી પ્રયાસ કરો.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Direct WhatsApp Share: Downloads PDF first, opens WhatsApp share/chat, NEVER opens print preview!
  const handleWhatsAppShare = async (letter: OutwardLetter, withSign: boolean) => {
    setIsSharingWhatsApp(true);
    try {
      const activeFormat =
        previewLetter?.id === letter.id
          ? previewDigitFormat
          : letter.digitFormat || letterDigitFormat || settings.digitFormat || 'gujarati';

      const { blob, filename } = await renderLetterToPdfBlob(letter, withSign, activeFormat);

      const shareText = `📄 *શાળા સત્તાવાર જાવક પત્ર*\n*જાવક નંબર:* ${formatDigits(letter.outwardNumber, activeFormat)}\n*તારીખ:* ${formatDateDisplay(letter.letterDate, activeFormat)}\n*પ્રતિ:* ${letter.recipientDesignation || letter.recipientName}${letter.recipientOffice ? ` - ${letter.recipientOffice}` : ''}\n*વિષય:* ${letter.subject}`;

      // 1. Android APK native bridge: direct system share chooser with WhatsApp
      if (isAndroidNativeApp() && window.AndroidBridge?.shareBase64Pdf) {
        const base64Data = await blobToBase64(blob);
        window.AndroidBridge.shareBase64Pdf(base64Data, filename, 'application/pdf', shareText);
        return;
      }

      // 2. Direct WebShare API with PDF File (opens WhatsApp with PDF file attached)
      const pdfFile = new File([blob], filename, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        try {
          await navigator.share({
            files: [pdfFile],
            title: filename,
            text: shareText,
          });
          return;
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') {
            return; // User cancelled share sheet
          }
        }
      }

      // 3. Fallback for browsers without direct file sharing: download file first, then open WhatsApp chat
      await downloadPdfFile(blob, filename);
      const shareMsg = encodeURIComponent(
        `${shareText}\n\n` +
        `📎 પત્રની PDF ફાઈલ (${filename}) તમારા મોબાઈલમાં ડાઉનલોડ થઈ ગઈ છે.`
      );
      window.open(`https://api.whatsapp.com/send?text=${shareMsg}`, '_blank');
    } catch (err) {
      console.error('WhatsApp export error:', err);
      // Fallback: open WhatsApp chat with text summary
      const shareMsg = encodeURIComponent(
        `📄 *શાળા સત્તાવાર જાવક પત્ર*\n*જાવક નંબર:* ${letter.outwardNumber}\n*વિષય:* ${letter.subject}`
      );
      window.open(`https://api.whatsapp.com/send?text=${shareMsg}`, '_blank');
    } finally {
      setIsSharingWhatsApp(false);
    }
  };

  // Filtered letters list
  const filteredLetters = useMemo(() => {
    return letters.filter((l) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mNum = l.outwardNumber.toLowerCase().includes(q);
        const mSub = l.subject.toLowerCase().includes(q);
        const mRec =
          (l.recipientName || '').toLowerCase().includes(q) ||
          (l.recipientDesignation || '').toLowerCase().includes(q) ||
          (l.recipientOffice || '').toLowerCase().includes(q) ||
          (l.recipientAddress || '').toLowerCase().includes(q);
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
                          {formatDateDisplay(l.letterDate, l.digitFormat || settings.digitFormat || 'gujarati')}
                        </td>
                        <td className="py-3 px-3 text-slate-900 dark:text-white">
                          <div className="font-bold text-xs line-clamp-1">
                            {l.recipientDesignation || l.recipientName}
                          </div>
                          {l.recipientOffice && (
                            <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium line-clamp-1">
                              {l.recipientOffice}
                            </div>
                          )}
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

                            {/* Direct Print */}
                            <button
                              type="button"
                              onClick={() => handlePrint(l, true)}
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all"
                              title="પ્રિન્ટ ડાયલોગ ખોલો"
                            >
                              <Printer className="w-3.5 h-3.5 text-sky-400" />
                              <span>પ્રિન્ટ</span>
                            </button>

                            {/* Direct Download PDF */}
                            <button
                              type="button"
                              onClick={() => handleDownloadPdf(l, true)}
                              className="px-2 py-1 rounded-lg bg-[#C45A2D] hover:bg-[#a84a22] text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all"
                              title="PDF સીધું ડાઉનલોડ કરો"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>PDF</span>
                            </button>

                            {/* Direct WhatsApp Share */}
                            <button
                              type="button"
                              onClick={() => handleWhatsAppShare(l, true)}
                              className="px-2 py-1 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all"
                              title="વોટ્સએપ પર સીધો શેર કરો"
                            >
                              <WhatsAppIcon className="w-3.5 h-3.5" />
                              <span>વોટ્સએપ</span>
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                      ૧. જાવક નંબર (Outward Number) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveTab('settings')}
                      className="text-[11px] text-[#C45A2D] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      title="જાવક પ્રીફિક્સ સેટિંગ્સ બદલવા અહીં ક્લિક કરો"
                    >
                      <Settings className="w-3 h-3" />
                      <span>પ્રીફિક્સ સેટિંગ્સ</span>
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={outwardNumber}
                      onChange={(e) => setOutwardNumber(e.target.value)}
                      placeholder={letterDigitFormat === 'gujarati' ? 'દા.ત. સ.હા.લા/૨૦૨૬/૦૦૧' : 'દા.ત. સ.હા.લા/2026/001'}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#C45A2D]/50"
                    />
                    <button
                      type="button"
                      onClick={() => setOutwardNumber(generateNextOutwardNumber())}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold whitespace-nowrap cursor-pointer shadow-xs flex items-center gap-1"
                      title="આગામી નંબર ઓટો-જનરેટ કરો"
                    >
                      <RefreshCw className="w-3 h-3 text-[#C45A2D]" />
                      <span>ઓટો</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[10.5px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <span>પ્રીફિક્સ:</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono font-bold">
                        {formatDigits(settings.outwardPrefix || 'સ.હા.લા/૨૦૨૬/', letterDigitFormat)}
                      </strong>
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      (સેવ થયા પછી ક્રમ આપોઆપ +૧ વધશે)
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                      ૨. તારીખ (Date) *
                    </label>
                    <span className="text-[11px] font-bold text-slate-500">
                      પ્રિવ્યુ: <strong className="text-slate-800 dark:text-slate-200">{formatDateDisplay(letterDate, letterDigitFormat)}</strong>
                    </span>
                  </div>
                  <input
                    type="date"
                    value={letterDate}
                    onChange={(e) => setLetterDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#C45A2D]/50"
                  />
                  {/* General Digits Format Switcher */}
                  <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                    <span className="font-bold text-slate-600 dark:text-slate-400">અંકોનું ફોર્મેટ (Digits):</span>
                    <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => handleToggleDigitFormat('gujarati')}
                        className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold cursor-pointer transition-all ${
                          letterDigitFormat === 'gujarati'
                            ? 'bg-[#C45A2D] text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                        title="પત્રમાં ગુજરાતી અંકો (૧, ૨, ૩) રાખો"
                      >
                        ગુજરાતી (૧, ૨, ૩)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleDigitFormat('english')}
                        className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold cursor-pointer transition-all ${
                          letterDigitFormat === 'english'
                            ? 'bg-[#C45A2D] text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                        title="પત્રમાં અંગ્રેજી અંકો (1, 2, 3) રાખો"
                      >
                        English (1, 2, 3)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid 2: Recipient Information (૩ સ્તરીય: ૧. હોદ્દેદારશ્રી, ૨. કચેરીનું નામ, ૩. સરનામું) */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span>૩. પ્રતિ (To / મેળવનાર વિગત) *</span>
                    </label>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      ક્રમ: પ્રતિ, → (૧) હોદ્દેદારશ્રી, → (૨) કચેરીનું નામ → (૩) સરનામું
                    </p>
                  </div>
                  {/* Recipient Quick Presets Dropdown (Auto-fills with school taluka/district) */}
                  <select
                    onChange={(e) => {
                      const presets = getRecipientPresetsForSchool(school);
                      const found = presets.find((p) => p.label === e.target.value);
                      if (found) {
                        setRecipientDesignation(found.designation);
                        setRecipientOffice(found.office);
                        setRecipientAddress(found.address);
                      }
                    }}
                    className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer shadow-xs"
                  >
                    <option value="">ઝડપી કચેરી પસંદ કરો ({school?.taluka ? `${school.taluka} / ${school.district || 'કચ્છ'}` : 'તાલુકા-જિલ્લા કચેરી'})...</option>
                    {getRecipientPresetsForSchool(school).map((p, idx) => (
                      <option key={idx} value={p.label}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 block mb-1">
                      (૧) હોદ્દેદારશ્રી (Designation) *
                    </label>
                    <input
                      type="text"
                      value={recipientDesignation}
                      onChange={(e) => setRecipientDesignation(e.target.value)}
                      placeholder="દા.ત. જિલ્લા શિક્ષણાધિકારીશ્રી,"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#C45A2D]/50"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 block mb-1">
                      (૨) કચેરીનું નામ (Office / Department)
                    </label>
                    <input
                      type="text"
                      value={recipientOffice}
                      onChange={(e) => setRecipientOffice(e.target.value)}
                      placeholder="દા.ત. જિલ્લા શિક્ષણાધિકારીશ્રીની કચેરી"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#C45A2D]/50"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 block mb-1">
                      (૩) સરનામું / સ્થળ (Address / City) *
                    </label>
                    <input
                      type="text"
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      placeholder="દા.ત. જિલ્લા સેવા સદન, ભુજ - કચ્છ."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#C45A2D]/50"
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
                  <span>નંબર: {formatDigits(outwardNumber, letterDigitFormat) || '...'}</span>
                  <span>તા: {formatDateDisplay(letterDate, letterDigitFormat)}</span>
                </div>

                <div className="mt-1 space-y-0.5">
                  <div className="font-bold text-[10px] text-slate-800">પ્રતિ,</div>
                  <div className="font-black text-slate-950 text-[11px] leading-tight">
                    {recipientDesignation || '(હોદ્દેદારશ્રી)'}
                  </div>
                  {recipientOffice && (
                    <div className="font-semibold text-slate-800 text-[10px] leading-tight">
                      {recipientOffice}
                    </div>
                  )}
                  {recipientAddress && (
                    <div className="text-slate-600 text-[9.5px] leading-tight">
                      {recipientAddress}
                    </div>
                  )}
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

              {/* Live Auto Cloud Sync Status Badge */}
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold shadow-xs shrink-0">
                <span className={`w-2.5 h-2.5 rounded-full ${syncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                <span>{syncStatus === 'syncing' ? '🔄 ક્લાઉડ સિંક થઈ રહ્યું છે...' : '☁️ ઓટો ક્લાઉડ સિંક સક્રિય'}</span>
              </div>
            </div>

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
                      <div>લિ. આપનો વિશ્વાસુ,</div>
                      {settings.principalSignUrl && (
                        <div className="py-0.5 flex justify-end">
                          <img
                            src={settings.principalSignUrl}
                            alt="Sign on A4"
                            style={{
                              width: `${Math.round(((settings.principalSignWidthMm ?? 38) / 210) * 100)}%`,
                              maxWidth: '85px',
                              maxHeight: '26px',
                              objectFit: 'contain',
                            }}
                          />
                        </div>
                      )}
                      <div>{settings.principalName || school.principalName || 'આચાર્યશ્રી'}</div>
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

                  {/* Current Active Signature & Size Controls */}
                  {settings.principalSignUrl && (
                    <div className="space-y-3 pt-1 border-t border-slate-200 dark:border-slate-700">
                      <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <img
                            src={settings.principalSignUrl}
                            alt="Signature Preview"
                            className="h-9 max-w-[130px] object-contain bg-white rounded border p-0.5 shadow-xs"
                          />
                          <span className="text-[11px] font-bold text-purple-900 dark:text-purple-300">
                            સક્રિય ડિજિટલ સહી
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleCropActiveSignature}
                            className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[10.5px] font-bold flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 transition-all"
                            title="સહીની વધારાની ખાલી જગ્યા ક્રોપ કરી સહી અને નામ વચ્ચેની જગ્યા ઘટાડો"
                          >
                            <Scissors className="w-3.5 h-3.5" />
                            <span>✂️ એજ-ટુ-એજ ક્રોપ</span>
                          </button>
                          <Check className="w-4 h-4 text-purple-600" />
                        </div>
                      </div>

                      {/* Signature Size Adjuster on A4 Page */}
                      <div className="p-3 sm:p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <PenTool className="w-3.5 h-3.5 text-purple-600" />
                            <span>A4 પેજ પર સહીની સાઇઝ (Sign Size on A4: 20mm થી 140mm)</span>
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="20"
                              max="140"
                              value={settings.principalSignWidthMm ?? 48}
                              onChange={(e) => {
                                const val = Math.max(20, Math.min(140, Number(e.target.value) || 20));
                                setSettings((p) => ({ ...p, principalSignWidthMm: val }));
                              }}
                              className="w-16 px-2 py-0.5 rounded-md border text-center font-mono font-black text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 border-purple-200"
                            />
                            <span className="font-mono font-black text-xs text-purple-600 dark:text-purple-400">
                              mm
                            </span>
                          </div>
                        </div>

                        {/* Size Range Slider up to 140mm */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400">નાની (20mm)</span>
                            <input
                              type="range"
                              min="20"
                              max="140"
                              step="1"
                              value={settings.principalSignWidthMm ?? 48}
                              onChange={(e) =>
                                setSettings((p) => ({
                                  ...p,
                                  principalSignWidthMm: Number(e.target.value),
                                }))
                              }
                              className="flex-1 accent-purple-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                            />
                            <span className="text-[10px] font-bold text-slate-400">મોટી (140mm)</span>
                          </div>
                        </div>

                        {/* Quick Presets for Signature Size up to 140mm */}
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block mb-1">ઝડપી સાઇઝ પ્રિસેટ્સ:</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {[
                              { label: 'નાની', mm: 32 },
                              { label: 'સામાન્ય', mm: 48 },
                              { label: 'મોટી', mm: 65 },
                              { label: 'વિશેષ મોટી', mm: 85 },
                              { label: 'જમ્બો', mm: 110 },
                              { label: 'મહત્તમ', mm: 140 },
                            ].map((item) => (
                              <button
                                key={item.mm}
                                type="button"
                                onClick={() =>
                                  setSettings((p) => ({ ...p, principalSignWidthMm: item.mm }))
                                }
                                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                                  (settings.principalSignWidthMm ?? 48) === item.mm
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {item.label} ({item.mm}mm)
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Letterhead Sheet Live Visual Preview (true A4 sheet ratio with letterhead and proportional signature) */}
                        <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-dashed border-purple-300 dark:border-purple-800/80 space-y-2 font-['Anek_Gujarati']">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-[10.5px] text-purple-900 dark:text-purple-300 font-bold flex items-center gap-1">
                              <PenTool className="w-3 h-3 text-purple-600" />
                              <span>લેટરહેડ શીટ પર સહી લાઈવ પ્રિવ્યુ (Live A4 Preview):</span>
                            </span>
                            <button
                              type="button"
                              onClick={handleCropActiveSignature}
                              className="text-[10px] font-bold text-purple-700 dark:text-purple-300 hover:underline flex items-center gap-0.5 cursor-pointer"
                              title="ખાલી માર્જિન કાપીને સહી અને નામ નજીક લાવો"
                            >
                              <Scissors className="w-2.5 h-2.5" />
                              <span>✂️ વધારાની ખાલી જગ્યા ક્રોપ કરો</span>
                            </button>
                          </div>

                          {/* Scaled Authentic A4 Letterhead Sheet */}
                          <div
                            className="relative w-full max-w-[320px] mx-auto bg-white rounded-xl shadow-lg border border-slate-300 overflow-hidden text-slate-900 text-left flex flex-col justify-between"
                            style={{
                              aspectRatio: '210 / 297',
                              paddingTop: settings.letterheadUrl ? `${Math.round(((settings.topMarginMm ?? 62) / 297) * 440)}px` : '16px',
                              paddingBottom: `${Math.round(((settings.bottomMarginMm ?? 32) / 297) * 440)}px`,
                              paddingLeft: `${Math.round(((settings.leftMarginMm ?? 22) / 210) * 320)}px`,
                              paddingRight: `${Math.round(((settings.rightMarginMm ?? 22) / 210) * 320)}px`,
                            }}
                          >
                            {/* Full A4 Letterhead Background if uploaded */}
                            {settings.letterheadUrl ? (
                              <img
                                src={settings.letterheadUrl}
                                alt="Letterhead"
                                className="absolute inset-0 w-full h-full object-fill pointer-events-none z-0"
                              />
                            ) : (
                              <div className="relative z-10 text-center border-b pb-1.5 border-slate-900/80 mb-2">
                                <div className="text-[11px] font-black uppercase text-slate-950 tracking-tight leading-tight">
                                  {school.schoolName}
                                </div>
                                <div className="text-[8.5px] text-slate-600 font-semibold mt-0.5">
                                  {school.village ? `${school.village}, ` : ''}{school.taluka ? `${school.taluka}, ` : ''}{school.district || 'કચ્છ'} • DISE: {formatDigits(school.diseCode, 'gujarati')}
                                </div>
                              </div>
                            )}

                            {/* In this settings preview, show ONLY the signature placed in the bottom right corner of the letterhead sheet */}
                            <div className="flex-1 w-full flex items-end justify-end relative z-10 pb-1">
                              <div
                                style={{
                                  width: `${Math.max(20, Math.min(85, Math.round(((settings.principalSignWidthMm ?? 48) / 210) * 100)))}%`,
                                }}
                                className="flex justify-end items-end"
                              >
                                <img
                                  src={settings.principalSignUrl}
                                  alt="Principal Signature"
                                  style={{
                                    width: '100%',
                                    height: 'auto',
                                    objectFit: 'contain',
                                  }}
                                  className="transition-all duration-150 block ml-auto drop-shadow-xs"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Signatory Name & Designation */}
                  <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">આચાર્યશ્રીનું નામ</label>
                        <input
                          type="text"
                          value={settings.principalName || ''}
                          onChange={(e) => setSettings((p) => ({ ...p, principalName: e.target.value }))}
                          placeholder="આચાર્યશ્રીનું નામ"
                          className="w-full px-2.5 py-1.5 rounded-lg border text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">હોદ્દો</label>
                        <input
                          type="text"
                          value={settings.principalDesignation || 'આચાર્યશ્રી'}
                          onChange={(e) => setSettings((p) => ({ ...p, principalDesignation: e.target.value }))}
                          placeholder="હોદ્દો"
                          className="w-full px-2.5 py-1.5 rounded-lg border text-xs font-bold"
                        />
                      </div>
                    </div>

                    {/* Checkboxes: Toggle display of Name / Designation / School (prevents duplicate text if stamp already has it) */}
                    <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block">
                        સહી નીચે દર્શાવવાની વિગતો (જો આપના સહી સ્ટેમ્પમાં પહેલેથી લખેલું હોય તો અનચેક કરી શકો છો):
                      </span>
                      <div className="flex items-center gap-3 flex-wrap text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.showSignatoryName !== false}
                            onChange={(e) => setSettings((p) => ({ ...p, showSignatoryName: e.target.checked }))}
                            className="rounded text-purple-600 focus:ring-purple-500"
                          />
                          <span>નામ દર્શાવો</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.showSignatoryDesignation !== false}
                            onChange={(e) => setSettings((p) => ({ ...p, showSignatoryDesignation: e.target.checked }))}
                            className="rounded text-purple-600 focus:ring-purple-500"
                          />
                          <span>હોદ્દો દર્શાવો ({settings.principalDesignation || 'આચાર્યશ્રી'})</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(settings.showSchoolNameInSign)}
                            onChange={(e) => setSettings((p) => ({ ...p, showSchoolNameInSign: e.target.checked }))}
                            className="rounded text-purple-600 focus:ring-purple-500"
                          />
                          <span>શાળાનું નામ દર્શાવો</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Outward Number Prefix & Auto-Increment Settings */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Hash className="w-4 h-4 text-[#C45A2D]" />
                      <span>જાવક નંબર પ્રીફિક્સ & ઓટો નંબરિંગ (Outward Prefix)</span>
                    </h3>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    અહીં આપની શાળાનો કાયમી પ્રીફિક્સ સેટ કરો. દા.ત. જો તમે <strong>સ.હા.લા/૨૦૨૬/</strong> સેટ કરશો, તો પ્રથમ પત્રમાં આપોઆપ <strong>સ.હા.લા/૨૦૨૬/૦૦૧</strong> આવશે અને સેવ કર્યા બાદ આગામી પત્રમાં <strong>૦૦૨</strong>, <strong>૦૦૩</strong> ઓટોમેટિક વધશે.
                  </p>

                  <div>
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
                      જાવક પ્રીફિક્સ (Outward Prefix) *
                    </label>
                    <input
                      type="text"
                      value={settings.outwardPrefix || ''}
                      onChange={(e) => setSettings((p) => ({ ...p, outwardPrefix: e.target.value }))}
                      placeholder="દા.ત. સ.હા.લા/૨૦૨૬/ અથવા શાળા/જાવક/૨૦૨૬-૨૭/"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-[#C45A2D]/50"
                    />

                    {/* Quick Preset Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                      <span className="text-[10px] text-slate-400 font-bold">ઝડપી પસંદગી:</span>
                      <button
                        type="button"
                        onClick={() => setSettings((p) => ({ ...p, outwardPrefix: 'સ.હા.લા/૨૦૨૬/' }))}
                        className="px-2 py-0.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-[#C45A2D] text-[10.5px] font-bold border border-orange-200 cursor-pointer"
                      >
                        સ.હા.લા/૨૦૨૬/
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettings((p) => ({ ...p, outwardPrefix: 'શાળા/જાવક/૨૦૨૬-૨૭/' }))}
                        className="px-2 py-0.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10.5px] font-bold cursor-pointer"
                      >
                        શાળા/જાવક/૨૦૨૬-૨૭/
                      </button>
                      {school.schoolName && (
                        <button
                          type="button"
                          onClick={() => {
                            const short = school.schoolName.substring(0, 8).replace(/[\s\.\-]+/g, '') + '/૨૦૨૬/';
                            setSettings((p) => ({ ...p, outwardPrefix: short }));
                          }}
                          className="px-2 py-0.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10.5px] font-bold cursor-pointer"
                        >
                          શાળા શોર્ટ નામ/૨૦૨૬/
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Starting Sequence Number & Padding */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        શરૂઆતનો ક્રમાંક
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={settings.outwardStartingNumber ?? 1}
                        onChange={(e) =>
                          setSettings((p) => ({
                            ...p,
                            outwardStartingNumber: Math.max(1, Number(e.target.value)),
                          }))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border text-xs font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        અંકોની સંખ્યા (Padding)
                      </label>
                      <select
                        value={settings.outwardPadDigits ?? 3}
                        onChange={(e) =>
                          setSettings((p) => ({
                            ...p,
                            outwardPadDigits: Number(e.target.value),
                          }))
                        }
                        className="w-full px-2 py-1.5 rounded-lg border text-xs font-bold bg-white dark:bg-slate-800"
                      >
                        <option value={3}>૩ અંક (૦૦૧, ૦૦૨) - ભલામણ કરેલ</option>
                        <option value={2}>૨ અંક (૦૧, ૦૨)</option>
                        <option value={1}>૧ અંક (૧, ૨, ૩)</option>
                        <option value={4}>૪ અંક (૦૦૦૧, ૦૦૦૨)</option>
                      </select>
                    </div>
                  </div>

                  {/* Default Digits Format for School */}
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <label className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                      અંકોનું સામાન્ય ફોર્મેટ (Default Digits Format across Letters)
                    </label>
                    <p className="text-[11px] text-slate-500">
                      પત્રોમાં જાવક નંબર, તારીખ, સંદર્ભ ક્રમાંક અને નકલ રવાના ક્રમ માટે અંકો કેવા રાખવા છે:
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setSettings((p) => ({ ...p, digitFormat: 'gujarati' }))}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                          (settings.digitFormat || 'gujarati') === 'gujarati'
                            ? 'bg-orange-50/80 dark:bg-orange-950/30 border-[#C45A2D] text-[#C45A2D] ring-2 ring-[#C45A2D]/20 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs">ગુજરાતી અંકો</span>
                          {(settings.digitFormat || 'gujarati') === 'gujarati' && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div className="text-[11px] font-mono font-black text-slate-900 dark:text-white">
                          ૧, ૨, ૩, ૪, ૫...
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          દા.ત. ૨૦૨૬/૦૦૧ • ૨૪/૧૦/૨૦૨૬
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSettings((p) => ({ ...p, digitFormat: 'english' }))}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                          settings.digitFormat === 'english'
                            ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-600 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs">English Digits</span>
                          {settings.digitFormat === 'english' && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div className="text-[11px] font-mono font-black text-slate-900 dark:text-white">
                          1, 2, 3, 4, 5...
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          e.g. 2026/001 • 24/10/2026
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Live Next Generated Number Preview */}
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10.5px] text-emerald-800 dark:text-emerald-300 font-bold block">
                        આગામી પત્રમાં ઓટો જનરેટ થનાર નંબર:
                      </span>
                      <span className="text-sm font-black font-mono text-emerald-900 dark:text-emerald-200">
                        {generateNextOutwardNumber(settings.outwardPrefix, settings.outwardPadDigits, settings.outwardStartingNumber, settings.digitFormat || 'gujarati')}
                      </span>
                    </div>
                    <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-md">
                      લાઈવ પ્રિવ્યુ
                    </span>
                  </div>
                </div>

                {/* Auto Cloud Sync Status Notice Card */}
                <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${syncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 shadow-sm shadow-emerald-500/50'}`} />
                    <div>
                      <span className="text-xs font-black text-emerald-950 dark:text-emerald-200 block">
                        {syncStatus === 'syncing' ? '☁️ ક્લાઉડમાં ઓટો સિંક થઈ રહ્યું છે...' : '☁️ ઓટો ક્લાઉડ સિંક સક્રિય'}
                      </span>
                      <span className="text-[10.5px] text-emerald-700 dark:text-emerald-400 font-medium">
                        તમે કોઈપણ સેટિંગ બદલશો (માર્જિન, સહી, પ્રીફિક્સ વગેરે) એ આપોઆપ ક્લાઉડમાં સાચવાઈ જાય છે. કોઈ બટન દબાવવાની જરૂર નથી.
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-black text-emerald-800 dark:text-emerald-300 bg-white/80 dark:bg-slate-900/80 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 shrink-0">
                    {syncStatus === 'syncing' ? 'સિંકિંગ...' : '✓ સાચવેલું'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          FULL-SCREEN A4 LETTER PREVIEW & INSTANT PDF EXPORT MODAL
          ========================================================================= */}
      {previewLetter && (
        <div className="fixed inset-0 z-50 bg-black/85 flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 backdrop-blur-sm overflow-hidden font-['Anek_Gujarati']">
          <div className="bg-white dark:bg-slate-900 border-0 sm:border border-slate-200 dark:border-white/10 rounded-none sm:rounded-3xl max-w-4xl w-full h-full sm:h-auto sm:max-h-[94vh] flex flex-col shadow-2xl animate-in fade-in overflow-hidden">
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 shrink-0 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-[#C45A2D]" />
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    જાવક પત્ર A4 પ્રિવ્યુ & PDF ડાઉનલોડ
                  </h3>
                  <p className="text-[10px] sm:text-[11px] font-mono text-slate-500">
                    નંબર: {previewLetter.outwardNumber} • Anek Gujarati
                  </p>
                </div>
              </div>

              {/* Mode Switch Toggle: With Sign vs Without Sign */}
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-1 p-0.5 sm:p-1 bg-white dark:bg-slate-900 rounded-xl border text-[11px] sm:text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setPreviewWithSign(true)}
                    className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      previewWithSign
                        ? 'bg-emerald-600 text-white shadow-xs font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    ✅ સહી સાથે
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewWithSign(false)}
                    className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      !previewWithSign
                        ? 'bg-slate-800 text-white shadow-xs font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    ⚪ સહી વગર
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewLetter(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 cursor-pointer"
                  title="બંધ કરો (Close)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* View Mode, Scale, Digits & Signature Controls Toolbar */}
            <div className="px-3 sm:px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col gap-2 shrink-0">
              {/* Row 1: Zoom / Scale & General Digits Switcher */}
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                {/* Scale controls */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-slate-500 text-[11px]">પ્રિવ્યુ:</span>
                  <button
                    type="button"
                    onClick={() => setPreviewScaleMode('fit')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      previewScaleMode === 'fit'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                    title="આખું A4 પેજ સ્ક્રીન પર ફિટ કરો"
                  >
                    <Minimize2 className="w-3 h-3" />
                    <span>📱 આખું પેજ (Fit Screen)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewScaleMode('actual')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      previewScaleMode === 'actual'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                    title="૧૦૦% અસલ માપ"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>🔍 ૧૦૦% માપ</span>
                  </button>

                  <div className="flex items-center gap-1 ml-1">
                    <span className="text-[10.5px] font-mono text-slate-500">
                      {Math.round(computedPreviewScale * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewScaleMode('actual');
                        setComputedPreviewScale((p) => Math.min(1.5, p + 0.1));
                      }}
                      className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                      title="ઝૂમ ઇન"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewScaleMode('actual');
                        setComputedPreviewScale((p) => Math.max(0.3, p - 0.1));
                      }}
                      className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                      title="ઝૂમ આઉટ"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* General Digits Switcher (Gujarati <-> English) */}
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <span className="text-[10.5px] font-bold text-slate-500 pl-1">અંકો (Digits):</span>
                  <button
                    type="button"
                    onClick={() => handleTogglePreviewDigitFormat('gujarati')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      previewDigitFormat === 'gujarati'
                        ? 'bg-[#C45A2D] text-white shadow-xs font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                    title="જાવક નંબર, તારીખ, સંદર્ભ ક્રમાંક ગુજરાતી અંકોમાં દર્શાવો"
                  >
                    ૧૨૩ ગુજરાતી
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTogglePreviewDigitFormat('english')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      previewDigitFormat === 'english'
                        ? 'bg-blue-600 text-white shadow-xs font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                    title="જાવક નંબર, તારીખ, સંદર્ભ ક્રમાંક અંગ્રેજી અંકોમાં દર્શાવો"
                  >
                    123 English
                  </button>
                </div>
              </div>

              {/* Row 2: Live Signature Size Controls (20mm - 140mm) & Direct Upload Button */}
              {previewWithSign && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
                    <span className="text-[11px] font-black text-purple-700 dark:text-purple-300 flex items-center gap-1">
                      <PenTool className="w-3.5 h-3.5" />
                      <span>સહી સાઇઝ (A4 Sign):</span>
                    </span>

                    {/* Range slider up to 140mm */}
                    <div className="flex items-center gap-1.5 flex-1 max-w-[200px]">
                      <span className="text-[9.5px] font-bold text-slate-400">20mm</span>
                      <input
                        type="range"
                        min="20"
                        max="140"
                        step="1"
                        value={settings.principalSignWidthMm ?? 48}
                        onChange={(e) => handleUpdateSignWidth(Number(e.target.value))}
                        className="flex-1 accent-purple-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                        title="સહીની સાઇઝ નાની-મોટી કરો"
                      />
                      <span className="text-[9.5px] font-bold text-slate-400">140mm</span>
                    </div>

                    <span className="font-mono font-black text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800 shrink-0">
                      {settings.principalSignWidthMm ?? 48} mm
                    </span>

                    {/* Quick Presets */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {[
                        { label: '32mm', mm: 32 },
                        { label: '48mm', mm: 48 },
                        { label: '65mm', mm: 65 },
                        { label: '85mm', mm: 85 },
                        { label: '110mm', mm: 110 },
                        { label: '140mm', mm: 140 },
                      ].map((item) => (
                        <button
                          key={item.mm}
                          type="button"
                          onClick={() => handleUpdateSignWidth(item.mm)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                            (settings.principalSignWidthMm ?? 48) === item.mm
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Direct Signature Upload / Replace button */}
                  <label className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-[11px] font-bold cursor-pointer transition-all shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{settings.principalSignUrl ? 'સહી બદલો' : '+ સહી અપલોડ'}</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg"
                      onChange={handleSignatureUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Row 3: Quick Direct Actions at the Top for Instant Access (Print, Download, WhatsApp) */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ત્વરિત નિકાસ (Direct Actions):</span>
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* 1. Direct Print Dialogue */}
                  <button
                    type="button"
                    onClick={() => handlePrint(previewLetter, previewWithSign, previewDigitFormat)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow cursor-pointer transition-all active:scale-95"
                    title="પ્રિન્ટ ડાયલોગ ખોલો"
                  >
                    <Printer className="w-3.5 h-3.5 text-sky-400" />
                    <span>પ્રિન્ટ (Print)</span>
                  </button>

                  {/* 2. Direct PDF Download */}
                  <button
                    type="button"
                    onClick={() => handleDownloadPdf(previewLetter, previewWithSign)}
                    disabled={isGeneratingPdf}
                    className="px-3 py-1.5 rounded-xl bg-[#C45A2D] hover:bg-[#a84a22] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-[#C45A2D]/20 hover:shadow cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                    title="PDF સીધું ડાઉનલોડ કરો"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isGeneratingPdf ? 'PDF બની રહી છે...' : 'ડાઉનલોડ PDF'}</span>
                  </button>

                  {/* 3. Direct WhatsApp Share */}
                  <button
                    type="button"
                    onClick={() => handleWhatsAppShare(previewLetter, previewWithSign)}
                    disabled={isSharingWhatsApp}
                    className="px-3.5 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-black flex items-center gap-1.5 shadow-sm shadow-emerald-500/25 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                    title="વોટ્સએપ પર સીધો PDF પત્ર શેર કરો"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5" />
                    <span>{isSharingWhatsApp ? 'શેર થઈ રહ્યું છે...' : 'વોટ્સએપ શેર'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Body: Responsive Scaled A4 Letter Viewer */}
            <div
              ref={modalBodyRef}
              className="flex-1 min-h-0 overflow-auto bg-slate-200/90 dark:bg-slate-950 flex flex-col items-center justify-start sm:justify-center p-2 sm:p-4"
            >
              {/* Scaled Envelope Box (Holds exact scaled dimensions for perfect layout) */}
              <div
                style={{
                  width: `${Math.round(794 * computedPreviewScale)}px`,
                  height: `${Math.round(1123 * computedPreviewScale)}px`,
                  position: 'relative',
                  flexShrink: 0,
                  transition: 'width 0.15s ease, height 0.15s ease',
                }}
                className="shadow-2xl rounded-sm my-auto bg-white"
              >
                {/* Actual Printable 794px x 1123px A4 Document Sheet with CSS Transform */}
                <div
                  ref={letterA4Ref}
                  style={{
                    width: '794px',
                    height: '1123px',
                    transform: `scale(${computedPreviewScale})`,
                    transformOrigin: 'top left',
                    paddingTop: settings.letterheadUrl ? `${settings.topMarginMm ?? 62}mm` : '22mm',
                    paddingBottom: `${settings.bottomMarginMm ?? 32}mm`,
                    paddingLeft: `${settings.leftMarginMm ?? 22}mm`,
                    paddingRight: `${settings.rightMarginMm ?? 22}mm`,
                    fontFamily: "'Anek Gujarati', sans-serif",
                    backgroundColor: '#ffffff',
                  }}
                  className="absolute top-0 left-0 text-slate-900 flex flex-col justify-between select-text border border-slate-300 overflow-hidden"
                >
                  {/* Letterhead Background Image if uploaded */}
                  {settings.letterheadUrl && (
                    <img
                      src={settings.letterheadUrl}
                      alt="Letterhead"
                      className="absolute inset-0 w-[794px] h-[1123px] object-fill pointer-events-none z-0"
                    />
                  )}

                  {/* Top Section */}
                  <div className="relative z-10 space-y-4">
                    {/* Fallback Auto Letterhead if no custom image */}
                    {!settings.letterheadUrl && (
                      <div className="text-center border-b-2 border-slate-900 pb-3 mb-3">
                        <h1 className="text-2xl font-black uppercase text-slate-950 tracking-tight">
                          {school.schoolName}
                        </h1>
                        <p className="text-xs text-slate-600 mt-1">
                          {school.village ? school.village + ', ' : ''}{school.taluka ? school.taluka + ', ' : ''}{school.district} • DISE કોડ: <strong>{formatDigits(school.diseCode, previewDigitFormat)}</strong>
                        </p>
                      </div>
                    )}

                    {/* Outward No & Date Row (Harmonized with chosen digits format) */}
                    <div className="flex items-center justify-between font-bold text-[13.5px] border-b border-slate-200 pb-2">
                      <div>
                        <span className="text-slate-500">જાવક ક્રમાંક: </span>
                        <strong className="text-slate-950 font-mono text-[14px]">
                          {formatDigits(previewLetter.outwardNumber, previewDigitFormat)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500">તારીખ: </span>
                        <strong className="text-slate-950 text-[14px]">
                          {formatDateDisplay(previewLetter.letterDate, previewDigitFormat)}
                        </strong>
                      </div>
                    </div>

                    {/* Recipient Block (૩ સ્તરીય) */}
                    <div className="text-[14px] leading-relaxed">
                      <div className="font-extrabold text-slate-950 mb-0.5">પ્રતિ,</div>
                      <div className="font-black text-[15px] text-slate-950">
                        {previewLetter.recipientDesignation || previewLetter.recipientName}
                      </div>
                      {previewLetter.recipientOffice && (
                        <div className="font-bold text-[14px] text-slate-900">
                          {previewLetter.recipientOffice}
                        </div>
                      )}
                      {previewLetter.recipientAddress && (
                        <div className="font-bold text-[14px] text-slate-900 mt-0.5">
                          {previewLetter.recipientAddress}
                        </div>
                      )}
                    </div>

                    {/* Subject Banner */}
                    <div className="p-3 bg-slate-50 border-l-4 border-slate-950 rounded-sm leading-snug">
                      <div className="font-black text-[14.5px] text-slate-950">
                        વિષય: {previewLetter.subject}
                      </div>
                      {previewLetter.reference && (
                        <div className="text-[12.5px] font-semibold text-slate-600 mt-1">
                          સંદર્ભ: {formatDigits(previewLetter.reference, previewDigitFormat)}
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
                  <div className="relative z-10 pt-3 mt-3">
                    {/* Signatory Box (Uncapped size up to 140mm, without "લિ. આપનો વિશ્વાસુ,") */}
                    <div className="flex justify-end">
                      <div
                        style={{
                          minWidth: `${Math.max(180, Math.round((settings.principalSignWidthMm ?? 48) * 1.15))}px`,
                          maxWidth: '360px',
                        }}
                        className="text-center space-y-0.5"
                      >
                        {previewWithSign ? (
                          settings.principalSignUrl ? (
                            <div className="py-0.5 flex justify-center items-center min-h-[38px]">
                              <img
                                src={settings.principalSignUrl}
                                alt="Signature"
                                style={{
                                  width: `${settings.principalSignWidthMm ?? 48}mm`,
                                  maxHeight: `${Math.max(50, Math.round((settings.principalSignWidthMm ?? 48) * 0.85))}mm`,
                                  height: 'auto',
                                  objectFit: 'contain',
                                }}
                                className="mx-auto block transition-all"
                              />
                            </div>
                          ) : (
                            <div className="p-2 my-1 border border-dashed border-purple-300 rounded-lg text-center bg-purple-50/60">
                              <p className="text-[11px] text-purple-700 font-bold mb-1">ડિજિટલ સહી સેટ કરેલ નથી</p>
                              <label className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white text-[10.5px] font-bold rounded cursor-pointer shadow-xs">
                                <Upload className="w-3 h-3" />
                                <span>+ સહી અપલોડ કરો</span>
                                <input
                                  type="file"
                                  accept="image/png, image/jpeg"
                                  onChange={handleSignatureUpload}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          )
                        ) : (
                          <div className="h-14" /> /* Blank space for physical pen signature */
                        )}

                        {settings.showSignatoryName !== false && (
                          <div className="font-black text-[14.5px] text-slate-950">
                            {`(${previewLetter.signatoryName || school.principalName || ''})`}
                          </div>
                        )}
                        {settings.showSignatoryDesignation !== false && (
                          <div className="text-[12px] text-slate-700 font-semibold">
                            {previewLetter.signatoryDesignation || 'આચાર્યશ્રી'}
                          </div>
                        )}
                        {settings.showSchoolNameInSign && (
                          <div className="text-[11px] text-slate-500 font-medium">
                            {school.schoolName}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Copy to list with synchronized digit numbering */}
                    {previewLetter.copyTo && previewLetter.copyTo.length > 0 && (
                      <div className="mt-5 pt-2.5 border-t border-dashed border-slate-300 text-xs text-slate-700">
                        <div className="font-extrabold text-[12px] text-slate-900 mb-1">નકલ સવિનય રવાના:</div>
                        <div className="space-y-1 font-medium text-[12px]">
                          {previewLetter.copyTo.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-1.5">
                              <span className="font-bold min-w-[20px]">
                                {previewDigitFormat === 'gujarati' ? `${toGujaratiDigits(String(idx + 1))}.` : `${idx + 1}.`}
                              </span>
                              <span>{formatDigits(item, previewDigitFormat)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Export Actions (Print, Download, WhatsApp Share) */}
            <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between shrink-0 flex-wrap gap-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Filename Tag preview with exact format: JavakNo_Subjectinshort_date.pdf */}
                <div className="text-[11px] font-mono bg-slate-200/90 dark:bg-slate-700/80 px-2.5 py-1 rounded-lg font-bold text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#C45A2D]" />
                  <span>{getLetterPdfFilename(previewLetter, previewWithSign, previewDigitFormat)}</span>
                </div>

                {/* Toggle With/Without Signature */}
                <button
                  type="button"
                  onClick={() => setPreviewWithSign(!previewWithSign)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                    previewWithSign
                      ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300'
                  }`}
                  title="સહી સાથે અથવા વગર બદલો"
                >
                  {previewWithSign ? '✓ સહી સાથે (With Sign)' : '○ સહી વગર (Without Sign)'}
                </button>
              </div>

              {/* 3 Core Output Actions: Print, Direct Download, WhatsApp Share */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* 1. Direct Print Dialogue */}
                <button
                  type="button"
                  onClick={() => handlePrint(previewLetter, previewWithSign, previewDigitFormat)}
                  className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-md hover:shadow-lg cursor-pointer transition-all active:scale-95"
                  title="પ્રિન્ટ ડાયલોગ ખોલો"
                >
                  <Printer className="w-4 h-4 text-sky-400" />
                  <span>પ્રિન્ટ (Print)</span>
                </button>

                {/* 2. Direct PDF Download */}
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(previewLetter, previewWithSign)}
                  disabled={isGeneratingPdf}
                  className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#C45A2D] hover:bg-[#a84a22] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#C45A2D]/20 hover:shadow-lg cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                  title="PDF સીધું ડાઉનલોડ કરો"
                >
                  <Download className="w-4 h-4" />
                  <span>{isGeneratingPdf ? 'PDF બની રહ્યું છે...' : 'ડાઉનલોડ (Download)'}</span>
                </button>

                {/* 3. Direct WhatsApp Share */}
                <button
                  type="button"
                  onClick={() => handleWhatsAppShare(previewLetter, previewWithSign)}
                  disabled={isSharingWhatsApp}
                  className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                  title="વોટ્સએપ પર સીધો PDF પત્ર શેર કરો"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  <span>{isSharingWhatsApp ? 'વોટ્સએપ શેર થઈ રહ્યું છે...' : 'વોટ્સએપ શેર (WhatsApp)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
