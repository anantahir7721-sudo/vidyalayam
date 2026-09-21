import React, { useState, useEffect } from 'react';
import { School, SchoolStatus } from '../types';
import {
  Clock,
  XCircle,
  PowerOff,
  ShieldAlert,
  LogOut,
  RefreshCw,
  School as SchoolIcon,
  Hash,
  Building2,
  Database,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Send,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import {
  getLatestAdminDiagnostic,
  checkIsAdmin,
  AdminDiagnosticReport,
} from '../services/adminService';
import { projectId, FIRESTORE_DATABASE_ID } from '../firebase/config';
import { getSchoolApprovalWhatsApp, ADMIN_WHATSAPP_LINK } from '../utils/whatsappUtils';

interface SchoolStatusScreenProps {
  school: School | null;
  status: SchoolStatus | 'unrecognized';
  userUid?: string;
  userEmail?: string | null;
  onLogout: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export const SchoolStatusScreen: React.FC<SchoolStatusScreenProps> = ({
  school,
  status,
  userUid,
  userEmail,
  onLogout,
  onRefresh,
  refreshing = false,
}) => {
  const [diagnostic, setDiagnostic] = useState<AdminDiagnosticReport | null>(null);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);

  const approvalData = school
    ? getSchoolApprovalWhatsApp({
        schoolName: school.schoolName,
        diseCode: school.diseCode,
        district: school.district,
        principalName: school.principalName,
        contactNumber: school.contactPhone || school.principalPhone,
      })
    : null;

  const handleCopyMessage = () => {
    if (!approvalData) return;
    navigator.clipboard.writeText(approvalData.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendWhatsApp = (e: React.MouseEvent) => {
    if (!approvalData) return;
    // Auto-copy to clipboard as a reliable backup
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(approvalData.message);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    } catch (err) {
      console.warn('Clipboard write error:', err);
    }
  };

  useEffect(() => {
    if (status === 'unrecognized' && userUid) {
      const diag = getLatestAdminDiagnostic();
      if (diag) {
        setDiagnostic(diag);
      } else {
        // Run check to populate diagnostic data
        checkIsAdmin(userUid).then(() => {
          setDiagnostic(getLatestAdminDiagnostic());
        });
      }
    }
  }, [status, userUid]);

  const handleRecheck = async () => {
    if (!userUid) return;
    setChecking(true);
    try {
      const authorized = await checkIsAdmin(userUid);
      setDiagnostic(getLatestAdminDiagnostic());
      if (authorized && onRefresh) {
        onRefresh();
      }
    } finally {
      setChecking(false);
    }
  };
  return (
    <div className="min-h-[calc(100vh-60px)] bg-[#f8f6f2] dark:bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-xl dark:shadow-2xl space-y-6 text-center">
          {/* Status Icon & Title */}
          {status === 'pending' && (
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 dark:text-amber-400 mx-auto shadow-inner">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>
              <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 uppercase tracking-wide">
                Pending Approval (પ્રક્રિયા હેઠળ)
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                તમારી School ID Admin approval માટે pending છે.
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                તમારી શાળાની નોંધણીની વિગતો સફળતાપૂર્વક સિસ્ટમમાં સબમિટ થઈ ગઈ છે. રાજ્ય એડમિનિસ્ટ્રેટર દ્વારા મંજૂરી મળતાં જ ગુણાંકન પોર્ટલ આપોઆપ સક્રિય થઈ જશે.
              </p>
            </div>
          )}

          {status === 'rejected' && (
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 dark:text-red-400 mx-auto shadow-inner">
                <XCircle className="w-8 h-8" />
              </div>
              <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-500/40 uppercase tracking-wide">
                Registration Rejected (અસ્વીકાર)
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-red-600 dark:text-red-400 tracking-tight leading-snug">
                તમારી School registration reject કરવામાં આવી છે. Admin નો સંપર્ક કરો.
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
                આ શાળા આઈડીની નોંધણી એડમિનિસ્ટ્રેટર દ્વારા રદ કરવામાં આવી છે. વધુ માહિતી કે પુનઃમંજૂરી માટે એડમિનનો સંપર્ક કરો.
              </p>
            </div>
          )}

          {status === 'inactive' && (
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-700/60 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-300 mx-auto shadow-inner">
                <PowerOff className="w-8 h-8" />
              </div>
              <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-600 uppercase tracking-wide">
                Account Inactive (નિષ્ક્રિય)
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                તમારી School ID હાલમાં inactive છે. Admin નો સંપર્ક કરો.
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
                આ શાળાનું એકાઉન્ટ એડમિન દ્વારા કામચલાઉ ધોરણે સ્થગિત (inactive) કરવામાં આવ્યું છે. એકાઉન્ટ પુનઃ શરૂ કરવા માટે એડમિનનો સંપર્ક કરો.
              </p>
            </div>
          )}

          {status === 'unrecognized' && (
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto shadow-inner">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/40 uppercase tracking-wide">
                Unauthorized Account
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
                આ એકાઉન્ટ માટે કોઈ માન્ય શાળા કે એડમિન પ્રોફાઇલ મળેલ નથી.
              </h2>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                કૃપા કરીને માન્ય શાળા DISE કોડ અથવા અધિકૃત એડમિનિસ્ટ્રેટર આઈડી વડે લોગિન કરો.
              </p>
              {userUid && (
                <div className="mt-4 bg-slate-900/95 rounded-xl p-4 border border-slate-700/80 text-left text-xs font-mono space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400 font-sans text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                      Firebase Auth & Firestore Diagnosis
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Project: {projectId}
                    </span>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-400 font-sans font-medium uppercase tracking-wider mb-1">
                      Authenticated Firebase UID
                    </div>
                    <div className="text-emerald-400 select-all break-all bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800">
                      {userUid}
                    </div>
                  </div>

                  {/* Diagnostic Database Checks */}
                  <div className="space-y-2 pt-1">
                    <div className="text-[10px] text-slate-400 font-sans font-medium uppercase tracking-wider">
                      Database Checks for /admins/{userUid}:
                    </div>

                    {diagnostic?.checks && diagnostic.checks.length > 0 ? (
                      diagnostic.checks.map((c, idx) => (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-lg border text-[11px] space-y-1 ${
                            c.isRoleAdmin
                              ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'
                              : c.error
                              ? 'bg-red-950/30 border-red-800/50 text-red-300'
                              : 'bg-slate-950/80 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between font-sans">
                            <span className="font-bold flex items-center gap-1.5">
                              <Database className="w-3 h-3 text-cyan-400" />
                              Database: <code className="font-mono text-cyan-300">{c.databaseId}</code>
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                c.isRoleAdmin
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : c.exists
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {c.isRoleAdmin
                                ? 'Admin Verified'
                                : c.exists
                                ? 'Doc Exists (Role Mismatch)'
                                : 'Doc Not Found'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400 font-mono pt-0.5">
                            <div>Exists: <strong className={c.exists ? 'text-emerald-400' : 'text-slate-500'}>{c.exists ? 'Yes' : 'No'}</strong></div>
                            <div>Role: <strong className={c.isRoleAdmin ? 'text-emerald-400' : 'text-amber-400'}>{c.roleValue || '(none)'}</strong></div>
                          </div>

                          {c.error && (
                            <div className="text-[10px] text-red-400 font-sans pt-1 flex items-start gap-1">
                              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                              <span>Permission/Read Notice: {c.error}</span>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-2 bg-slate-950/80 rounded border border-slate-800 text-[11px] text-slate-400 font-sans flex items-center gap-2">
                        <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                        <span>Checking Firestore databases...</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-800 text-[11px] font-sans">
                    <span className="text-slate-400">
                      Application Database: <code className="text-cyan-400 font-mono">{FIRESTORE_DATABASE_ID}</code>
                    </span>
                    <button
                      type="button"
                      onClick={handleRecheck}
                      disabled={checking}
                      className="flex items-center gap-1 px-2.5 py-1 bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 rounded text-[11px] font-semibold transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
                      <span>{checking ? 'Re-checking...' : 'Re-check Now'}</span>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 text-[11px] font-sans text-slate-400 space-y-1">
                    <div className="text-amber-300 font-semibold">How to create in Firebase Console:</div>
                    <ol className="list-decimal pl-4 space-y-0.5 text-[10px] text-slate-300">
                      <li>Open Firebase Console &rarr; Firestore Database.</li>
                      <li>Select database dropdown: <strong className="text-cyan-300 font-mono">{FIRESTORE_DATABASE_ID}</strong></li>
                      <li>Start collection: <strong className="text-amber-300 font-mono">admins</strong></li>
                      <li>Document ID: <strong className="text-emerald-300 font-mono select-all">{userUid}</strong></li>
                      <li>Field: <strong className="text-white font-mono">role</strong> (type: string, value: <strong className="text-white font-mono">&quot;admin&quot;</strong>)</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* School Details Card (if available) */}
          {school && (
            <div className="bg-slate-50 dark:bg-slate-900/90 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/80 text-left text-xs space-y-2 shadow-sm">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-400">
                <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-bold text-slate-900 dark:text-white truncate">{school.schoolName}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 font-mono">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <span>DISE: <strong className="text-emerald-600 dark:text-emerald-400">{school.diseCode}</strong></span>
                </div>
                <span>જિલ્લો: <strong className="text-slate-800 dark:text-slate-200">{school.district}</strong></span>
              </div>
            </div>
          )}

          {/* WhatsApp Admin Approval Box (For Pending Schools) */}
          {status === 'pending' && school && approvalData && (
            <div className="bg-emerald-50/90 dark:bg-gradient-to-b dark:from-emerald-950/60 dark:to-slate-900/90 border border-emerald-300 dark:border-emerald-500/40 rounded-2xl p-4 sm:p-5 text-left space-y-3 shadow-md dark:shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">એડમિન મંજૂરી વિનંતી (WhatsApp)</h3>
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">મેસેજ આપોઆપ ટાઈપ થઈ જશે</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                  ઝડપી મંજૂરી
                </span>
              </div>

              <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                નીચે આપેલા લીલા બટન પર ક્લિક કરવાથી WhatsApp ખુલશે અને તેમાં તમારી શાળાનો DISE કોડ, નામ અને મંજૂરીની વિનંતીનો મેસેજ <strong>આપોઆપ લખાઈને તૈયાર આવશે</strong>.
              </p>

              {/* Pre-typed message preview box */}
              <div className="bg-white dark:bg-slate-950/80 rounded-xl p-3.5 border border-emerald-200 dark:border-emerald-950 text-[10px] text-slate-800 dark:text-slate-300 font-mono whitespace-pre-wrap leading-relaxed shadow-sm">
                {approvalData.message}
              </div>

              {copied && (
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold flex items-center gap-1.5 animate-fadeIn">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>મેસેજ ક્લિપબોર્ડમાં કોપી થઈ ગયો છે! (જો WhatsApp માં જરૂર પડે તો Paste કરી શકો છો)</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <a
                  id="btn-whatsapp-approval"
                  href={approvalData.url}
                  onClick={handleSendWhatsApp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-900/20 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>WhatsApp પર એડમિનને મેસેજ મોકલો</span>
                </a>
                <button
                  type="button"
                  id="btn-copy-approval-msg"
                  onClick={handleCopyMessage}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />}
                  <span>{copied ? 'કોપી થઈ ગયો!' : 'મેસેજ કોપી કરો'}</span>
                </button>
              </div>

              {/* Direct Links alternative */}
              <div className="pt-1 flex flex-wrap items-center justify-center gap-3 text-[11px]">
                <a
                  href={approvalData.webUrl}
                  onClick={handleSendWhatsApp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-medium"
                >
                  <span>WhatsApp Web પર ખોલો</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <a
                  href={approvalData.qrUrl}
                  onClick={handleSendWhatsApp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-medium"
                >
                  <span>એડમિન QR પ્રોફાઇલ લિંક</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* WhatsApp Contact for Rejected / Inactive */}
          {(status === 'rejected' || status === 'inactive') && (
            <div className="pt-1 space-y-2">
              {(() => {
                const contactMsg = school
                  ? `નમસ્તે એડમિન શ્રી,\nવિદ્યાલયમ પોર્ટલ પર અમારી શાળા:\n• શાળા: ${school.schoolName}\n• DISE કોડ: ${school.diseCode}\n• જિલ્લો: ${school.district || 'ગુજરાત'}\nનું સ્ટેટસ હાલમાં "${status === 'rejected' ? 'Rejected (અસ્વીકાર)' : 'Inactive (નિષ્ક્રિય)'}" બતાવી રહ્યું છે. કૃપા કરીને આ બાબતે સહાય કરવા વિનંતી છે.`
                  : `નમસ્તે એડમિન શ્રી, વિદ્યાલયમ પોર્ટલ અંગે સહાયની જરૂર છે.`;
                const encodedContact = encodeURIComponent(contactMsg);
                const contactUrl = `https://wa.me/?text=${encodedContact}`;

                return (
                  <a
                    id="btn-whatsapp-contact-admin"
                    href={contactUrl}
                    onClick={() => {
                      try {
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(contactMsg);
                        }
                      } catch {}
                    }}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>સહાય માટે એડમિનનો WhatsApp પર સંપર્ક કરો</span>
                  </a>
                );
              })()}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {onRefresh && status === 'pending' && (
              <button
                id="btn-check-status-refresh"
                onClick={onRefresh}
                disabled={refreshing}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>મંજૂરી ચકાસો (Check Approval)</span>
              </button>
            )}

            <button
              id="btn-status-logout"
              onClick={onLogout}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors border border-slate-300 dark:border-slate-600 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>લોગ આઉટ (Log Out)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
