import React, { useState } from 'react';
import { School, Student } from '../types';
import {
  FileText,
  Printer,
  ArrowLeft,
  User,
  Calendar,
  Award,
  CheckCircle2,
  Building,
} from 'lucide-react';

interface CertificatesManagerProps {
  school: School;
  students: Student[];
  onBack: () => void;
}

export const CertificatesManager: React.FC<CertificatesManagerProps> = ({
  school,
  students,
  onBack,
}) => {
  const [certType, setCertType] = useState<'bonafide' | 'character'>('bonafide');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    students[0]?.id || ''
  );
  const [purpose, setPurpose] = useState('શિષ્યવૃત્તિ માટે (For Scholarship)');
  const [academicYear, setAcademicYear] = useState('૨૦૨૬–૨૭');
  const [conduct, setConduct] = useState('સંતોષકારક અને ઉત્તમ (Good)');

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const handlePrintCertificate = () => {
    if (!selectedStudent) {
      alert('કૃપા કરીને પ્રથમ એક વિદ્યાર્થી પસંદ કરો.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print certificate.');
      return;
    }

    const isBonafide = certType === 'bonafide';
    const titleText = isBonafide
      ? 'બોનાફાઈડ પ્રમાણપત્ર (BONAFIDE CERTIFICATE)'
      : 'ચારિત્ર્ય પ્રમાણપત્ર (CHARACTER CERTIFICATE)';

    const bodyHtml = isBonafide
      ? `
        <p style="text-indent: 40px; margin-bottom: 18px;">
          આથી પ્રમાણપત્ર આપવામાં આવે છે કે કુમાર/કન્યા <strong>${selectedStudent.studentName}</strong>, 
          જેઓનો જનરલ રજિસ્ટર (G.R.) નંબર <strong>${selectedStudent.grNumber || '_____'}</strong> છે, 
          તેઓ અમારી શાળામાં શૈક્ષણિક વર્ષ <strong>${academicYear}</strong> દરમિયાન 
          ધોરણ <strong>${selectedStudent.standard} ${selectedStudent.division ? `(${selectedStudent.division})` : ''}</strong> માં 
          નિયમિત વિદ્યાર્થી તરીકે અભ્યાસ કરે છે.
        </p>
        <p style="text-indent: 40px; margin-bottom: 18px;">
          શાળાના જનરલ રજિસ્ટર અનુસાર તેઓની જન્મ તારીખ <strong>${selectedStudent.dob || '_____'}</strong> છે. 
          તેમની શાળામાં વર્તણૂક સારી છે.
        </p>
        <p style="text-indent: 40px; margin-bottom: 30px;">
          આ પ્રમાણપત્ર વિદ્યાર્થી/વાલીની વિનંતીથી <strong>${purpose}</strong> ના હેતુ માટે આપવામાં આવેલ છે.
        </p>
      `
      : `
        <p style="text-indent: 40px; margin-bottom: 18px;">
          આથી પ્રમાણપત્ર આપવામાં આવે છે કે કુમાર/કન્યા <strong>${selectedStudent.studentName}</strong>, 
          જનરલ રજિસ્ટર (G.R.) નંબર <strong>${selectedStudent.grNumber || '_____'}</strong>, 
          શાળામાં ધોરણ <strong>${selectedStudent.standard}</strong> ના નિયમિત વિદ્યાર્થી છે/હતા.
        </p>
        <p style="text-indent: 40px; margin-bottom: 18px;">
          શાળામાં તેમના અભ્યાસકાળ દરમિયાન તેમનું ચારિત્ર્ય અને વર્તણૂક <strong>${conduct}</strong> રહેલ છે.
        </p>
        <p style="text-indent: 40px; margin-bottom: 30px;">
          અમે તેમના ઉજ્જવળ ભવિષ્યની મંગલકામના કરીએ છીએ.
        </p>
      `;

    const html = `
      <!DOCTYPE html>
      <html lang="gu">
      <head>
        <meta charset="UTF-8">
        <title>${school.schoolName} - ${titleText}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Anek+Gujarati:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Anek+Gujarati:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap');
          
          @page {
            size: A4 portrait;
            margin: 15mm 20mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body {
            font-family: 'Anek Gujarati', 'Plus Jakarta Sans', system-ui, sans-serif;
            background: #fff;
            color: #0f172a;
            margin: 0;
            padding: 20px;
            font-size: 13pt;
            line-height: 1.8;
          }
          .border-frame {
            border: 3px double #1e3a8a;
            padding: 30px;
            min-height: 240mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #1e3a8a;
            padding-bottom: 15px;
            margin-bottom: 25px;
          }
          .school-header-row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            margin-bottom: 5px;
          }
          .school-logo {
            width: 55px;
            height: 55px;
            object-fit: contain;
            border-radius: 6px;
          }
          .school-name {
            font-size: 22pt;
            font-weight: 800;
            color: #1e3a8a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0;
          }
          .school-sub {
            font-size: 11pt;
            color: #475569;
            margin-bottom: 4px;
          }
          .title-strip {
            display: inline-block;
            background: #1e3a8a;
            color: white;
            padding: 6px 24px;
            border-radius: 6px;
            font-size: 14pt;
            font-weight: 800;
            margin-top: 15px;
            letter-spacing: 0.5px;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            font-size: 11pt;
            font-weight: 600;
            color: #334155;
          }
          .content-area {
            font-size: 13.5pt;
            color: #1e293b;
            flex: 1;
          }
          .footer-signatures {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 60px;
            padding: 0 20px;
          }
          .signature-box {
            text-align: center;
            width: 220px;
          }
          .sig-line {
            border-top: 1.5px dashed #475569;
            padding-top: 8px;
            font-size: 11pt;
            font-weight: 700;
            color: #0f172a;
          }
          .seal-box {
            width: 110px;
            height: 110px;
            border: 2px dashed #94a3b8;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9pt;
            color: #94a3b8;
            font-weight: bold;
            text-align: center;
          }
          .watermark-credit {
            text-align: center;
            font-size: 9pt;
            color: #94a3b8;
            margin-top: 25px;
            border-top: 1px solid #e2e8f0;
            padding-top: 6px;
          }
          @media print {
            .no-print {
              display: none !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="background: #f1f5f9; border: 1px solid #cbd5e1; padding: 12px; margin-bottom: 20px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
          <strong style="color: #0f172a;">A4 સત્તાવાર પ્રમાણપત્ર પ્રિન્ટ / PDF</strong>
          <div>
            <button onclick="window.print()" style="background: #059669; color: white; border: none; padding: 8px 18px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-right: 8px;">
              🖨️ Print / Save as PDF
            </button>
            <button onclick="window.close()" style="background: #64748b; color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer;">
              Close
            </button>
          </div>
        </div>

        <div class="border-frame">
          <div>
            <div class="header">
              <div class="school-header-row">
                ${school.logoUrl ? `<img src="${school.logoUrl}" alt="School Logo" class="school-logo" />` : ''}
                <h1 class="school-name">${school.schoolName}</h1>
              </div>
              <div class="school-sub">${school.address || `${school.district} જિલ્લો, ગુજરાત`} • DISE: ${school.diseCode}</div>
              <div class="title-strip">${titleText}</div>
            </div>

            <div class="meta-row">
              <div>જાવક નં. (Outward No): <strong>CERT-${Date.now().toString().slice(-6)}</strong></div>
              <div>તારીખ (Date): <strong>${new Date().toLocaleDateString('gu-IN')}</strong></div>
            </div>

            <div class="content-area">
              ${bodyHtml}
            </div>
          </div>

          <div>
            <div class="footer-signatures">
              <div class="signature-box">
                <div class="sig-line">ક્લાર્ક / વહીવટી સહી</div>
              </div>

              <div class="seal-box">
                શાળાનો સિક્કો<br>(School Seal)
              </div>

              <div class="signature-box">
                <div class="sig-line">આચાર્યશ્રીની સહી તથા સિક્કો</div>
              </div>
            </div>

            <div class="watermark-credit">
              Vidyalayam • Created by NR Chad • Gujarat School Management System
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 450);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl glass-card text-xs font-bold text-[#e4ded6] hover:text-white transition-colors cursor-pointer active:scale-95"
          title="પાછળના મેનુ પર જાઓ (Go Back)"
        >
          <ArrowLeft className="w-4 h-4 text-[#f59c73]" />
          <span>પાછળ જાઓ (Go Back)</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-[#a99f91]">
          <FileText className="w-4 h-4 text-[#f59c73]" />
          <span>બોનાફાઈડ અને પ્રમાણપત્રો સંચાલન</span>
        </div>
      </div>

      {/* Main Grid: Controls & Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Column */}
        <div className="glass-panel rounded-3xl border border-white/10 p-6 shadow-xl space-y-5">
          <div>
            <h3 className="text-base font-bold text-[#e4ded6] flex items-center gap-2">
              <Award className="w-4 h-4 text-[#f59c73]" />
              <span>પ્રમાણપત્ર વિગતો</span>
            </h3>
            <p className="text-xs text-[#a99f91] mt-1">
              પ્રમાણપત્ર પ્રકાર અને વિદ્યાર્થી પસંદ કરો.
            </p>
          </div>

          {/* Type Switcher */}
          <div>
            <label className="block text-xs font-semibold text-[#a99f91] mb-2">
              પ્રમાણપત્ર પ્રકાર:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCertType('bonafide')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  certType === 'bonafide'
                    ? 'bg-[#9d512d] text-white shadow'
                    : 'glass-card text-[#a99f91] hover:text-white'
                }`}
              >
                બોનાફાઈડ (Bonafide)
              </button>
              <button
                type="button"
                onClick={() => setCertType('character')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  certType === 'character'
                    ? 'bg-[#9d512d] text-white shadow'
                    : 'glass-card text-[#a99f91] hover:text-white'
                }`}
              >
                ચારિત્ર્ય (Character)
              </button>
            </div>
          </div>

          {/* Student Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#a99f91] mb-1.5">
              વિદ્યાર્થી પસંદ કરો (Select Student) *
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73]"
            >
              {students.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.studentName} (ધોરણ: {st.standard} {st.division ? `-${st.division}` : ''}) - GR: {st.grNumber || 'N/A'}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year */}
          <div>
            <label className="block text-xs font-semibold text-[#a99f91] mb-1.5">
              શૈક્ષણિક વર્ષ:
            </label>
            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73]"
            />
          </div>

          {/* Purpose / Conduct */}
          {certType === 'bonafide' ? (
            <div>
              <label className="block text-xs font-semibold text-[#a99f91] mb-1.5">
                હેતુ (Purpose):
              </label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73]"
              >
                <option value="શિષ્યવૃત્તિ ફોર્મ માટે (For Scholarship)">શિષ્યવૃત્તિ ફોર્મ માટે (For Scholarship)</option>
                <option value="બેંક એકાઉન્ટ ખોલાવવા માટે (Bank Account)">બેંક એકાઉન્ટ ખોલાવવા માટે (Bank Account)</option>
                <option value="આધાર કાર્ડ / ઓળખ પુરાવા માટે (ID Proof)">આધાર કાર્ડ / ઓળખ પુરાવા માટે (ID Proof)</option>
                <option value="બસ પાસ કઢાવવા માટે (Bus Pass)">બસ પાસ કઢાવવા માટે (Bus Pass)</option>
                <option value="સામાન્ય હેતુ માટે (General Purpose)">સામાન્ય હેતુ માટે (General Purpose)</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-[#a99f91] mb-1.5">
                વર્તણૂક (Conduct):
              </label>
              <input
                type="text"
                value={conduct}
                onChange={(e) => setConduct(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-black/20 border border-white/10 text-white text-xs focus:outline-none focus:border-[#f59c73]"
              />
            </div>
          )}

          {/* Print Button */}
          <button
            onClick={handlePrintCertificate}
            className="w-full py-3 rounded-2xl bg-[#9d512d] hover:bg-[#b55e34] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>A4 પ્રમાણપત્ર પ્રિન્ટ / PDF</span>
          </button>
        </div>

        {/* Live Preview Column */}
        <div className="lg:col-span-2 glass-panel rounded-3xl border border-white/10 p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <span className="text-xs font-bold text-[#f59c73] uppercase tracking-wider">
                લાઈવ પ્રમાણપત્ર પ્રિવ્યૂ (Live Preview)
              </span>
              <span className="text-xs text-[#a99f91]">A4 ફોર્મેટ • સત્તાવાર માન્ય</span>
            </div>

            {selectedStudent ? (
              <div className="bg-white text-[#0f172a] rounded-2xl p-6 sm:p-8 shadow-inner border border-slate-300 font-sans">
                <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
                  <h4 className="text-lg font-black uppercase text-slate-900 tracking-wide">
                    {school.schoolName}
                  </h4>
                  <div className="text-xs text-slate-600">
                    DISE: {school.diseCode} • {school.district} જિલ્લો
                  </div>
                  <div className="inline-block bg-slate-900 text-white text-xs font-bold px-4 py-1 rounded mt-2">
                    {certType === 'bonafide' ? 'બોનાફાઈડ પ્રમાણપત્ર' : 'ચારિત્ર્ય પ્રમાણપત્ર'}
                  </div>
                </div>

                <div className="flex justify-between text-xs text-slate-600 font-semibold mb-4">
                  <span>જાવક નં: CERT-XXXXXX</span>
                  <span>તારીખ: {new Date().toLocaleDateString('gu-IN')}</span>
                </div>

                <div className="text-xs leading-relaxed text-slate-800 space-y-3">
                  {certType === 'bonafide' ? (
                    <>
                      <p>
                        આથી પ્રમાણપત્ર આપવામાં આવે છે કે કુમાર/કન્યા <strong>{selectedStudent.studentName}</strong>, 
                        જેઓનો G.R. નંબર <strong>{selectedStudent.grNumber || '_____'}</strong> છે, 
                        તેઓ અમારી શાળામાં શૈક્ષણિક વર્ષ <strong>{academicYear}</strong> દરમિયાન 
                        ધોરણ <strong>{selectedStudent.standard} {selectedStudent.division ? `(${selectedStudent.division})` : ''}</strong> માં 
                        નિયમિત વિદ્યાર્થી તરીકે અભ્યાસ કરે છે.
                      </p>
                      <p>
                        શાળાના રજિસ્ટર અનુસાર તેઓની જન્મ તારીખ <strong>{selectedStudent.dob || '_____'}</strong> છે. 
                        આ પ્રમાણપત્ર <strong>{purpose}</strong> માટે આપવામાં આવે છે.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        આથી પ્રમાણપત્ર આપવામાં આવે છે કે કુમાર/કન્યા <strong>{selectedStudent.studentName}</strong>, 
                        G.R. નંબર <strong>{selectedStudent.grNumber || '_____'}</strong>, 
                        શાળામાં ધોરણ <strong>{selectedStudent.standard}</strong> ના નિયમિત વિદ્યાર્થી છે.
                      </p>
                      <p>
                        તેમની શાળામાં વર્તણૂક અને ચારિત્ર્ય <strong>{conduct}</strong> રહેલ છે.
                      </p>
                    </>
                  )}
                </div>

                <div className="mt-12 pt-6 flex justify-between items-end text-xs font-bold text-slate-900">
                  <div>ક્લાર્ક સહી</div>
                  <div className="w-16 h-16 rounded-full border border-dashed border-slate-400 flex items-center justify-center text-[9px] text-slate-400">
                    શાળા સિક્કો
                  </div>
                  <div>આચાર્યશ્રી સહી & સિક્કો</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-xs text-[#a99f91]">
                કોઈ વિદ્યાર્થી પસંદ થયેલ નથી.
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 text-center text-xs text-[#a99f91]">
            Vidyalayam • Created by NR Chad
          </div>
        </div>
      </div>
    </div>
  );
};
