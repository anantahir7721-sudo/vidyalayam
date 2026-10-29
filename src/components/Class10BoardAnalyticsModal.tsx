import React, { useState, useMemo } from 'react';
import { School, Student, MarkRecord } from '../types';
import {
  X,
  Printer,
  Download,
  Calendar,
  Building2,
  Award,
  Users,
  CheckCircle2,
  FileSpreadsheet,
  Phone,
  User,
  Sparkles,
} from 'lucide-react';
import { printHtmlDocument } from '../utils/printAndPdfUtils';
import * as XLSX from 'xlsx';
import { StudentResultClass9 } from '../utils/class9ResultCalculations';

export interface Class10BoardAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: School;
  students: Student[];
  marks: MarkRecord[];
  results: StudentResultClass9[];
}

export const Class10BoardAnalyticsModal: React.FC<Class10BoardAnalyticsModalProps> = ({
  isOpen,
  onClose,
  school,
  students,
  marks,
  results,
}) => {
  // Configurable Header Fields
  const [resultDate, setResultDate] = useState<string>(() => {
    return localStorage.getItem(`vidyalayam_std10_result_date_${school?.id || 'default'}`) || '06-05-2026';
  });
  const [schoolIndexNo, setSchoolIndexNo] = useState<string>(() => {
    return localStorage.getItem(`vidyalayam_std10_index_no_${school?.id || 'default'}`) || (school as any)?.indexNumber || '53.0445';
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('SC'); // 'SC' | 'ST' | 'OBC' | 'OPEN' | 'ALL'

  // Teacher Info mapping (subject -> { teacherName, contactNo })
  const [teacherMap, setTeacherMap] = useState<Record<string, { name: string; contact: string }>>(() => {
    try {
      const saved = localStorage.getItem(`vidyalayam_std10_teacher_map_${school?.id || 'default'}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {
      gujarati: { name: school?.principalName || 'શ્રી એમ.એચ.જેઠવા', contact: (school as any)?.phone || '9426014777' },
      english: { name: 'શ્રી વી.એમ.ઠાકર', contact: '9408541083' },
      maths: { name: 'શ્રી એન.આર.યાડ', contact: '7203070830' },
      science: { name: 'શ્રી એન.આર.યાડ', contact: '7203070830' },
      social_science: { name: 'શ્રી વી.એમ.ઠાકર', contact: '9408541083' },
      sanskrit_hindi: { name: school?.principalName || 'શ્રી એમ.એચ.જેઠવા', contact: (school as any)?.phone || '9426014777' },
      physical_education: { name: 'શ્રી પી.ટી.શિક્ષક', contact: (school as any)?.phone || '' },
    };
  });

  const saveSettings = (newDate: string, newIndex: string, newMap: any) => {
    try {
      localStorage.setItem(`vidyalayam_std10_result_date_${school?.id || 'default'}`, newDate);
      localStorage.setItem(`vidyalayam_std10_index_no_${school?.id || 'default'}`, newIndex);
      localStorage.setItem(`vidyalayam_std10_teacher_map_${school?.id || 'default'}`, JSON.stringify(newMap));
    } catch (e) {
      console.error(e);
    }
  };

  const handleTeacherChange = (subjKey: string, field: 'name' | 'contact', val: string) => {
    const updated = {
      ...teacherMap,
      [subjKey]: {
        ...(teacherMap[subjKey] || { name: '', contact: '' }),
        [field]: val,
      },
    };
    setTeacherMap(updated);
    saveSettings(resultDate, schoolIndexNo, updated);
  };

  // Table 1: Regular Result Statistics (Boys, Girls, Total)
  const stats = useMemo(() => {
    let boysFilled = 0;
    let boysAppeared = 0;
    let boysPassed = 0;
    let girlsFilled = 0;
    let girlsAppeared = 0;
    let girlsPassed = 0;

    results.forEach((r) => {
      const g = (r.student.gender || '').toLowerCase().trim();
      const isBoy = g === 'male' || g === 'boy' || g === 'કુમાર' || g === 'm';
      const appeared = !r.hasIncompleteMarks || r.totalObtained > 0;
      const passed = r.overallResult !== 'NEEDS_IMPROVEMENT';

      if (isBoy) {
        boysFilled++;
        if (appeared) boysAppeared++;
        if (passed) boysPassed++;
      } else {
        girlsFilled++;
        if (appeared) girlsAppeared++;
        if (passed) girlsPassed++;
      }
    });

    const boysFailed = Math.max(0, boysAppeared - boysPassed);
    const girlsFailed = Math.max(0, girlsAppeared - girlsPassed);
    const totalFilled = boysFilled + girlsFilled;
    const totalAppeared = boysAppeared + girlsAppeared;
    const totalPassed = boysPassed + girlsPassed;
    const totalFailed = boysFailed + girlsFailed;

    const boysPct = boysAppeared > 0 ? (boysPassed / boysAppeared) * 100 : 0;
    const girlsPct = girlsAppeared > 0 ? (girlsPassed / girlsAppeared) * 100 : 0;
    const totalPct = totalAppeared > 0 ? (totalPassed / totalAppeared) * 100 : 0;

    return {
      boys: { filled: boysFilled, appeared: boysAppeared, passed: boysPassed, failed: boysFailed, pct: boysPct.toFixed(2) },
      girls: { filled: girlsFilled, appeared: girlsAppeared, passed: girlsPassed, failed: girlsFailed, pct: girlsPct.toFixed(2) },
      total: { filled: totalFilled, appeared: totalAppeared, passed: totalPassed, failed: totalFailed, pct: totalPct.toFixed(2) },
    };
  }, [results]);

  // Table 2: Grade Breakdown (A1, A2, B1, B2, C1, C2, D, E1, E2)
  const gradeDistribution = useMemo(() => {
    const grades = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D', 'E1', 'E2'];
    const boysCounts: Record<string, number> = {};
    const girlsCounts: Record<string, number> = {};
    const totalCounts: Record<string, number> = {};

    grades.forEach((gr) => {
      boysCounts[gr] = 0;
      girlsCounts[gr] = 0;
      totalCounts[gr] = 0;
    });

    results.forEach((r) => {
      const g = (r.student.gender || '').toLowerCase().trim();
      const isBoy = g === 'male' || g === 'boy' || g === 'કુમાર' || g === 'm';
      const grade = r.overallGrade || (r.percentage >= 91 ? 'A1' : r.percentage >= 81 ? 'A2' : r.percentage >= 71 ? 'B1' : r.percentage >= 61 ? 'B2' : r.percentage >= 51 ? 'C1' : r.percentage >= 41 ? 'C2' : r.percentage >= 33 ? 'D' : r.percentage >= 21 ? 'E1' : 'E2');

      if (isBoy) {
        boysCounts[grade] = (boysCounts[grade] || 0) + 1;
      } else {
        girlsCounts[grade] = (girlsCounts[grade] || 0) + 1;
      }
      totalCounts[grade] = (totalCounts[grade] || 0) + 1;
    });

    return { boysCounts, girlsCounts, totalCounts };
  }, [results]);

  // Table 3: Top Students Filtered by Category
  const topStudents = useMemo(() => {
    let list = results.filter((r) => !r.hasIncompleteMarks);

    if (selectedCategory !== 'ALL') {
      list = list.filter((r) => {
        const cat = ((r.student as any).category || (r.student as any).caste || '').toUpperCase().trim();
        if (selectedCategory === 'SC') return cat.includes('SC') || cat.includes('અનુસૂચિત જાતિ');
        if (selectedCategory === 'ST') return cat.includes('ST') || cat.includes('અનુસૂચિત જનજાતિ');
        if (selectedCategory === 'OBC') return cat.includes('OBC') || cat.includes('SEBC') || cat.includes('બક્ષી');
        if (selectedCategory === 'OPEN') return cat.includes('OPEN') || cat.includes('GEN');
        return true;
      });
    }

    // Sort descending by totalObtained
    return list.sort((a, b) => b.totalObtained - a.totalObtained).slice(0, 5);
  }, [results, selectedCategory]);

  // Table 4: Subject-wise Pass Statistics
  const subjectStats = useMemo(() => {
    const list = [
      { key: 'gujarati', name: 'ગુજરાતી', teacherKey: 'gujarati' },
      { key: 'english', name: 'અંગ્રેજી', teacherKey: 'english' },
      { key: 'maths', name: 'ગણિત', teacherKey: 'maths' },
      { key: 'science', name: 'વિજ્ઞાન', teacherKey: 'science' },
      { key: 'social_science', name: 'સામાજિક વિજ્ઞાન', teacherKey: 'social_science' },
      { key: 'sanskrit_hindi', name: 'સંસ્કૃત / હિન્દી', teacherKey: 'sanskrit_hindi' },
      { key: 'physical_education', name: 'શારીરિક શિક્ષણ', teacherKey: 'physical_education' },
    ];

    return list.map((item) => {
      let appeared = 0;
      let passed = 0;

      results.forEach((r) => {
        const sc = r.scores.find((s) => {
          if (item.key === 'maths') return s.subject.id.includes('maths');
          if (item.key === 'sanskrit_hindi') return s.subject.id === 'sanskrit' || s.subject.id === 'hindi';
          if (item.key === 'physical_education') return s.subject.id.includes('physical') || s.subject.id.includes('pe');
          return s.subject.id === item.key;
        });

        if (sc && sc.converted100 !== null) {
          appeared++;
          if (sc.converted100 >= 33) passed++;
        }
      });

      const pct = appeared > 0 ? (passed / appeared) * 100 : 0;
      const tInfo = teacherMap[item.teacherKey] || { name: '-', contact: '-' };

      return {
        key: item.key,
        name: item.name,
        teacherName: tInfo.name,
        contact: tInfo.contact,
        appeared,
        passed,
        pct: pct.toFixed(2),
      };
    });
  }, [results, teacherMap]);

  // Print Handler (A4 High Fidelity matching the uploaded image)
  const handlePrint = () => {
    const printHtml = `
      <div style="font-family: 'Shruti', 'Gujarati MT', 'Noto Sans Gujarati', sans-serif; padding: 15px; color: #000; background: #fff; max-width: 800px; margin: 0 auto; line-height: 1.3;">
        <!-- Top Date -->
        <div style="text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 12px; letter-spacing: 0.5px;">
          વેબસાઇટ પર પરિણામ જાહેર તારીખ : ${resultDate}
        </div>

        <!-- School Header Table -->
        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; margin-bottom: 16px; font-size: 13px;">
          <tr>
            <td style="border: 1px solid #000; padding: 6px 10px; width: 18%; font-weight: bold;">શાળાનું નામ :</td>
            <td style="border: 1px solid #000; padding: 6px 10px; width: 52%; font-weight: bold; font-size: 14px;">${school?.schoolName || 'શ્રી સરકારી માધ્યમિક શાળા'}</td>
            <td style="border: 1px solid #000; padding: 6px 10px; width: 30%; text-align: center; font-weight: bold; font-size: 14px;" rowspan="2">
              શાળાનો<br/>ઇન્ડેક્સ નં.<br/>
              <span style="font-size: 20px; font-weight: 900; letter-spacing: 1px; display: inline-block; margin-top: 4px;">${schoolIndexNo}</span>
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 6px 10px; font-weight: bold;">શાળાનું સરનામું :</td>
            <td style="border: 1px solid #000; padding: 6px 10px;">${school?.address || '-'}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 6px 10px; font-weight: bold;">આચાર્યશ્રીનું નામ :</td>
            <td style="border: 1px solid #000; padding: 6px 10px;">${school?.principalName || 'શ્રી એમ.એચ.જેઠવા'}</td>
            <td style="border: 1px solid #000; padding: 6px 10px; font-size: 12px;">મો.નં. : ${(school as any)?.phone || '9426014777'}</td>
          </tr>
        </table>

        <!-- Table 1: Regular Result Statistics -->
        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; margin-bottom: 16px; text-align: center; font-size: 13px;">
          <thead>
            <tr style="background-color: #f8fafc; font-weight: bold;">
              <th style="border: 1px solid #000; padding: 6px 8px; width: 18%;">રેગ્યુલર</th>
              <th style="border: 1px solid #000; padding: 6px 8px; width: 26%;">શાળામાંથી પરીક્ષા માટે ભરાયેલ ફોર્મની સંખ્યા</th>
              <th style="border: 1px solid #000; padding: 6px 8px; width: 18%;">પરીક્ષામાં બેઠા</th>
              <th style="border: 1px solid #000; padding: 6px 8px; width: 14%;">પાસ</th>
              <th style="border: 1px solid #000; padding: 6px 8px; width: 12%;">નાપાસ</th>
              <th style="border: 1px solid #000; padding: 6px 8px; width: 12%;">ટકાવારી %</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #000; padding: 5px 8px; font-weight: bold;">કુમાર</td>
              <td style="border: 1px solid #000; padding: 5px 8px;">${stats.boys.filled}</td>
              <td style="border: 1px solid #000; padding: 5px 8px;">${stats.boys.appeared}</td>
              <td style="border: 1px solid #000; padding: 5px 8px;">${stats.boys.passed}</td>
              <td style="border: 1px solid #000; padding: 5px 8px;">${stats.boys.failed}</td>
              <td style="border: 1px solid #000; padding: 5px 8px; font-weight: bold;">${stats.boys.pct}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 5px 8px; font-weight: bold;">કન્યા</td>
              <td style="border: 1px solid #000; padding: 5px 8px;">${stats.girls.filled}</td>
              <td style="border: 1px solid #000; padding: 5px 8px;">${stats.girls.appeared}</td>
              <td style="border: 1px solid #000; padding: 5px 8px;">${stats.girls.passed}</td>
              <td style="border: 1px solid #000; padding: 5px 8px;">${stats.girls.failed}</td>
              <td style="border: 1px solid #000; padding: 5px 8px; font-weight: bold;">${stats.girls.pct}</td>
            </tr>
            <tr style="font-weight: bold; background-color: #f1f5f9;">
              <td style="border: 1px solid #000; padding: 6px 8px;">કુલ</td>
              <td style="border: 1px solid #000; padding: 6px 8px;">${stats.total.filled}</td>
              <td style="border: 1px solid #000; padding: 6px 8px;">${stats.total.appeared}</td>
              <td style="border: 1px solid #000; padding: 6px 8px;">${stats.total.passed}</td>
              <td style="border: 1px solid #000; padding: 6px 8px;">${stats.total.failed}</td>
              <td style="border: 1px solid #000; padding: 6px 8px; font-size: 14px;">${stats.total.pct}</td>
            </tr>
          </tbody>
        </table>

        <!-- Table 2: Grade Breakdown -->
        <div style="text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 6px;">
          જુદા જુદા ગ્રેડમાં સમાવિષ્ટ વિદ્યાર્થીઓની સંખ્યા
        </div>
        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; margin-bottom: 16px; text-align: center; font-size: 12px;">
          <thead>
            <tr style="background-color: #f8fafc; font-weight: bold;">
              <th style="border: 1px solid #000; padding: 5px 6px;" rowspan="2">કેટેગરી</th>
              <th style="border: 1px solid #000; padding: 5px 6px;" rowspan="2">A1</th>
              <th style="border: 1px solid #000; padding: 5px 6px;" rowspan="2">A2</th>
              <th style="border: 1px solid #000; padding: 5px 6px;" rowspan="2">B1</th>
              <th style="border: 1px solid #000; padding: 5px 6px;" rowspan="2">B2</th>
              <th style="border: 1px solid #000; padding: 5px 6px;" rowspan="2">C1</th>
              <th style="border: 1px solid #000; padding: 5px 6px;" rowspan="2">C2</th>
              <th style="border: 1px solid #000; padding: 5px 6px;" rowspan="2">D</th>
              <th style="border: 1px solid #000; padding: 4px;" colspan="2">N.I.</th>
              <th style="border: 1px solid #000; padding: 5px 6px;" rowspan="2">Percentage<br/>(%)</th>
            </tr>
            <tr style="background-color: #f8fafc; font-weight: bold;">
              <th style="border: 1px solid #000; padding: 4px 6px;">E1</th>
              <th style="border: 1px solid #000; padding: 4px 6px;">E2</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #000; padding: 4px 6px; font-weight: bold;">કુમાર</td>
              <td style="border: 1px solid #000; padding: 4px 6px;">${gradeDistribution.boysCounts['A1'] || 0}</td>
              <td style="border: 1px solid #000; padding: 4px 6px;">${gradeDistribution.boysCounts['A2'] || 0}</td>
              <td style="border: 1px solid #000; padding: 4px 6px;">${gradeDistribution.boysCounts['B1'] || 0}</td>
              <td style="border: 1px solid #000; padding: 4px 6px;">${gradeDistribution.boysCounts['B2'] || 0}</td>
              <td style="border: 1px solid #000; padding: 4px 6px;">${gradeDistribution.boysCounts['C1'] || 0}</td>
              <td style="border: 1px solid #000; padding: 4px 6px;">${gradeDistribution.boysCounts['C2'] || 0}</td>
              <td style="border: 1px solid #000; padding: 4px 6px;">${gradeDistribution.boysCounts['D'] || 0}</td>
              <td style="border: 1px solid #000; padding: 4px 6px;">${gradeDistribution.boysCounts['E1'] || 0}</td>
              <td style="border: 1px solid #000; padding: 4px 6px;">${gradeDistribution.boysCounts['E2'] || 0}</td>
              <td style="border: 1px solid #000; padding: 4px 6px; font-weight: bold;">${stats.boys.pct}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 4px 6px; font-weight: bold;">કન્યા</td>
              <td style="border: 1px solid #000; padding: 4px 6px;">${gradeDistribution.girlsCounts['A1'] || 0}</td>
              <td style="border: 1px solid #000; padding: 4px 6px;">${gradeDistribution.girlsCounts['A2'] || 0}</td>
              <td style="border: 1px solid #000; padding: 4px 6px;">${gradeDistribution.girlsCounts['B1'] || 0}</td>
              <td style="border: 1px solid #000; padding: 4px 6px;">${gradeDistribution.girlsCounts['B2'] || 0}</td>
              <td style="border: 1px solid #000; padding: 4px 6px;">${gradeDistribution.girlsCounts['C1'] || 0}</td>
              <td style="border: 1px solid #000; padding: 4px 6px;">${gradeDistribution.girlsCounts['C2'] || 0}</td>
              <td style="border: 1px solid #000; padding: 4px 6px;">${gradeDistribution.girlsCounts['D'] || 0}</td>
              <td style="border: 1px solid #000; padding: 4px 6px;">${gradeDistribution.girlsCounts['E1'] || 0}</td>
              <td style="border: 1px solid #000; padding: 4px 6px;">${gradeDistribution.girlsCounts['E2'] || 0}</td>
              <td style="border: 1px solid #000; padding: 4px 6px; font-weight: bold;">${stats.girls.pct}</td>
            </tr>
            <tr style="font-weight: bold; background-color: #f1f5f9;">
              <td style="border: 1px solid #000; padding: 5px 6px;">કુલ</td>
              <td style="border: 1px solid #000; padding: 5px 6px;">${gradeDistribution.totalCounts['A1'] || 0}</td>
              <td style="border: 1px solid #000; padding: 5px 6px;">${gradeDistribution.totalCounts['A2'] || 0}</td>
              <td style="border: 1px solid #000; padding: 5px 6px;">${gradeDistribution.totalCounts['B1'] || 0}</td>
              <td style="border: 1px solid #000; padding: 5px 6px;">${gradeDistribution.totalCounts['B2'] || 0}</td>
              <td style="border: 1px solid #000; padding: 5px 6px;">${gradeDistribution.totalCounts['C1'] || 0}</td>
              <td style="border: 1px solid #000; padding: 5px 6px;">${gradeDistribution.totalCounts['C2'] || 0}</td>
              <td style="border: 1px solid #000; padding: 5px 6px;">${gradeDistribution.totalCounts['D'] || 0}</td>
              <td style="border: 1px solid #000; padding: 5px 6px;">${gradeDistribution.totalCounts['E1'] || 0}</td>
              <td style="border: 1px solid #000; padding: 5px 6px;">${gradeDistribution.totalCounts['E2'] || 0}</td>
              <td style="border: 1px solid #000; padding: 5px 6px; font-size: 13px;">${stats.total.pct}</td>
            </tr>
          </tbody>
        </table>

        <!-- Table 3: Category Top Students -->
        <div style="text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 6px;">
          ${selectedCategory === 'SC' ? 'અનુસૂચિત જાતિ (SC)' : selectedCategory === 'ST' ? 'અનુસૂચિત જનજાતિ (ST)' : selectedCategory === 'OBC' ? 'સામાજિક-શૈક્ષણિક પછાત વર્ગ (OBC)' : 'સર્વોચ્ચ ગુણ ધરાવતા'} કેટેગરીના પ્રથમ ૦૩ વિદ્યાર્થીઓ
        </div>
        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; margin-bottom: 16px; text-align: center; font-size: 12px;">
          <thead>
            <tr style="background-color: #f8fafc; font-weight: bold;">
              <th style="border: 1px solid #000; padding: 5px 6px; width: 8%;">ક્રમ</th>
              <th style="border: 1px solid #000; padding: 5px 8px; width: 34%; text-align: left;">વિદ્યાર્થીઓનું નામ</th>
              <th style="border: 1px solid #000; padding: 5px 6px; width: 16%;">સીટ નં.</th>
              <th style="border: 1px solid #000; padding: 5px 6px; width: 12%;">કુલ ગુણ</th>
              <th style="border: 1px solid #000; padding: 5px 6px; width: 12%;">મેળવેલ ગુણ</th>
              <th style="border: 1px solid #000; padding: 5px 6px; width: 10%;">ટકા (%)</th>
              <th style="border: 1px solid #000; padding: 5px 6px; width: 18%;">મોબાઇલ નં.</th>
            </tr>
          </thead>
          <tbody>
            ${[0, 1, 2]
              .map((idx) => {
                const st = topStudents[idx];
                return `
              <tr>
                <td style="border: 1px solid #000; padding: 5px 6px; font-weight: bold;">${idx + 1}</td>
                <td style="border: 1px solid #000; padding: 5px 8px; text-align: left; font-weight: bold;">${st ? st.student.studentName : ''}</td>
                <td style="border: 1px solid #000; padding: 5px 6px; font-family: monospace;">${st ? ((st.student as any).seatNumber || st.rollNumber || '-') : ''}</td>
                <td style="border: 1px solid #000; padding: 5px 6px;">${st ? st.totalMax : ''}</td>
                <td style="border: 1px solid #000; padding: 5px 6px; font-weight: bold;">${st ? st.totalObtained : ''}</td>
                <td style="border: 1px solid #000; padding: 5px 6px; font-weight: bold;">${st ? st.percentage : ''}</td>
                <td style="border: 1px solid #000; padding: 5px 6px; font-family: monospace;">${st ? ((st.student as any).phone || (st.student as any).mobile || '-') : ''}</td>
              </tr>
            `;
              })
              .join('')}
          </tbody>
        </table>

        <!-- Table 4: Subject-wise Teacher Performance -->
        <div style="text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 6px;">
          વિષય મુજબ શિક્ષકોના પરિણામની વિગતો
        </div>
        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; margin-bottom: 24px; text-align: center; font-size: 12px;">
          <thead>
            <tr style="background-color: #f8fafc; font-weight: bold;">
              <th style="border: 1px solid #000; padding: 5px 6px; width: 8%;">ક્રમ</th>
              <th style="border: 1px solid #000; padding: 5px 8px; width: 22%; text-align: left;">વિષય</th>
              <th style="border: 1px solid #000; padding: 5px 8px; width: 28%; text-align: left;">વિષય શિક્ષકનું નામ</th>
              <th style="border: 1px solid #000; padding: 5px 6px; width: 12%;">બેઠા</th>
              <th style="border: 1px solid #000; padding: 5px 6px; width: 12%;">પાસ</th>
              <th style="border: 1px solid #000; padding: 5px 6px; width: 12%;">%</th>
              <th style="border: 1px solid #000; padding: 5px 6px; width: 18%;">Contact No.</th>
            </tr>
          </thead>
          <tbody>
            ${subjectStats
              .map(
                (item, idx) => `
              <tr>
                <td style="border: 1px solid #000; padding: 4px 6px; font-weight: bold;">${idx + 1}</td>
                <td style="border: 1px solid #000; padding: 4px 8px; text-align: left; font-weight: bold;">${item.name}</td>
                <td style="border: 1px solid #000; padding: 4px 8px; text-align: left;">${item.teacherName}</td>
                <td style="border: 1px solid #000; padding: 4px 6px;">${item.appeared}</td>
                <td style="border: 1px solid #000; padding: 4px 6px;">${item.passed}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; font-weight: bold;">${item.pct}</td>
                <td style="border: 1px solid #000; padding: 4px 6px; font-family: monospace;">${item.contact}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <!-- Signatures & Round Seal Footer -->
        <table style="width: 100%; margin-top: 35px; border-collapse: collapse;">
          <tr>
            <td style="width: 50%; text-align: left; vertical-align: bottom;">
              <div style="display: inline-block; text-align: center; border: 2px dashed #94a3b8; border-radius: 50%; width: 110px; height: 110px; line-height: 1.2; padding-top: 25px; box-sizing: border-box; font-size: 11px; font-weight: bold; color: #475569;">
                શાળાનો સિક્કો<br/>(Round Seal)
              </div>
            </td>
            <td style="width: 50%; text-align: right; vertical-align: bottom;">
              <div style="display: inline-block; text-align: center;">
                <div style="font-family: cursive; font-size: 20px; font-weight: bold; color: #1e3a8a; margin-bottom: 4px;">
                  ${school?.principalName ? school.principalName : 'આચાર્યશ્રી'}
                </div>
                <div style="font-size: 13px; font-weight: bold;">આચાર્યશ્રી</div>
                <div style="font-size: 12px; color: #334155;">${school?.schoolName || 'શ્રી સરકારી માધ્યમિક શાળા'}</div>
                <div style="font-size: 11px; color: #64748b;">${school?.address || ''}</div>
              </div>
            </td>
          </tr>
        </table>
      </div>
    `;

    printHtmlDocument(printHtml, `${school.schoolName}_Std10_Board_Result_Analytics`);
  };

  // Excel Export Handler
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // 1. Regular summary sheet
    const summaryRows = [
      { 'કેટેગરી': 'કુમાર', 'ભરાયેલ ફોર્મ': stats.boys.filled, 'પરીક્ષામાં બેઠા': stats.boys.appeared, 'પાસ': stats.boys.passed, 'નાપાસ': stats.boys.failed, 'ટકાવારી (%)': stats.boys.pct },
      { 'કેટેગરી': 'કન્યા', 'ભરાયેલ ફોર્મ': stats.girls.filled, 'પરીક્ષામાં બેઠા': stats.girls.appeared, 'પાસ': stats.girls.passed, 'નાપાસ': stats.girls.failed, 'ટકાવારી (%)': stats.girls.pct },
      { 'કેટેગરી': 'કુલ', 'ભરાયેલ ફોર્મ': stats.total.filled, 'પરીક્ષામાં બેઠા': stats.total.appeared, 'પાસ': stats.total.passed, 'નાપાસ': stats.total.failed, 'ટકાવારી (%)': stats.total.pct },
    ];
    const ws1 = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, ws1, 'Result_Summary');

    // 2. Grade distribution sheet
    const gradeRows = [
      { 'કેટેગરી': 'કુમાર', ...gradeDistribution.boysCounts, 'ટકાવારી (%)': stats.boys.pct },
      { 'કેટેગરી': 'કન્યા', ...gradeDistribution.girlsCounts, 'ટકાવારી (%)': stats.girls.pct },
      { 'કેટેગરી': 'કુલ', ...gradeDistribution.totalCounts, 'ટકાવારી (%)': stats.total.pct },
    ];
    const ws2 = XLSX.utils.json_to_sheet(gradeRows);
    XLSX.utils.book_append_sheet(wb, ws2, 'Grade_Distribution');

    // 3. Subject-wise teachers sheet
    const ws3 = XLSX.utils.json_to_sheet(
      subjectStats.map((s, idx) => ({
        'ક્રમ': idx + 1,
        'વિષય': s.name,
        'શિક્ષકનું નામ': s.teacherName,
        'બેઠા': s.appeared,
        'પાસ': s.passed,
        'ટકાવારી (%)': s.pct,
        'સંપર્ક': s.contact,
      }))
    );
    XLSX.utils.book_append_sheet(wb, ws3, 'Subject_Teachers');

    XLSX.writeFile(wb, `${school.schoolName}_Std10_Board_Analytics.xlsx`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-[#C45A2D] text-white shadow-xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                ધોરણ ૧૦ • બોર્ડ પરિણામ વિશ્લેષણ પત્રક (A4 Official Sheet)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                GSEB બોર્ડ પરિણામનું સત્તાવાર A4 એનાલિટિક્સ પત્રક (ડીઇઓ/ડીપીઇઓ કચેરી જમા કરાવવા માટે)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#C45A2D] hover:bg-[#a84a22] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>A4 પ્રિન્ટ / PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body & Editable Inputs */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs">
          {/* Quick Header Config Controls */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>પત્રક વિગતો સંપાદન (Quick Settings)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  પરિણામ જાહેર તારીખ:
                </label>
                <input
                  type="text"
                  value={resultDate}
                  onChange={(e) => {
                    setResultDate(e.target.value);
                    saveSettings(e.target.value, schoolIndexNo, teacherMap);
                  }}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-slate-800 dark:text-slate-200"
                  placeholder="DD-MM-YYYY"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  શાળાનો ઇન્ડેક્સ નં.:
                </label>
                <input
                  type="text"
                  value={schoolIndexNo}
                  onChange={(e) => {
                    setSchoolIndexNo(e.target.value);
                    saveSettings(resultDate, e.target.value, teacherMap);
                  }}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-slate-800 dark:text-slate-200 font-mono"
                  placeholder="e.g. 53.0445"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  ટોપર્સ કેટેગરી:
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-slate-800 dark:text-slate-200"
                >
                  <option value="SC">અનુસૂચિત જાતિ (SC)</option>
                  <option value="ST">અનુસૂચિત જનજાતિ (ST)</option>
                  <option value="OBC">સામાજિક-શૈક્ષણિક પછાત (OBC)</option>
                  <option value="OPEN">સામાન્ય વર્ગ (OPEN)</option>
                  <option value="ALL">તમામ કેટેગરી (All Top Rankers)</option>
                </select>
              </div>
            </div>
          </div>

          {/* High Fidelity A4 Sheet Preview Container */}
          <div className="border-2 border-slate-300 dark:border-slate-700 rounded-2xl p-4 sm:p-6 bg-white text-slate-900 shadow-md space-y-4">
            {/* Header: Date */}
            <div className="text-center font-bold text-sm tracking-wide">
              વેબસાઇટ પર પરિણામ જાહેર તારીખ : <span className="underline">{resultDate}</span>
            </div>

            {/* Header Table */}
            <div className="border border-black overflow-hidden">
              <div className="grid grid-cols-12 divide-x divide-black border-b border-black">
                <div className="col-span-3 p-2 font-bold bg-slate-100">શાળાનું નામ :</div>
                <div className="col-span-6 p-2 font-black text-sm">{school?.schoolName || 'શ્રી સરકારી માધ્યમિક શાળા'}</div>
                <div className="col-span-3 p-2 text-center font-bold bg-slate-50 row-span-2 flex flex-col justify-center items-center">
                  <div className="text-[11px]">શાળાનો ઇન્ડેક્સ નં.</div>
                  <div className="text-lg font-black tracking-wider text-[#C45A2D]">{schoolIndexNo}</div>
                </div>
              </div>
              <div className="grid grid-cols-12 divide-x divide-black border-b border-black">
                <div className="col-span-3 p-2 font-bold bg-slate-100">શાળાનું સરનામું :</div>
                <div className="col-span-6 p-2">{school?.address || '-'}</div>
              </div>
              <div className="grid grid-cols-12 divide-x divide-black">
                <div className="col-span-3 p-2 font-bold bg-slate-100">આચાર્યશ્રીનું નામ :</div>
                <div className="col-span-6 p-2 font-bold">{school?.principalName || 'શ્રી એમ.એચ.જેઠવા'}</div>
                <div className="col-span-3 p-2 font-bold text-center">મો.નં. : {(school as any)?.phone || '9426014777'}</div>
              </div>
            </div>

            {/* Table 1: Regular Results */}
            <div className="space-y-1">
              <table className="w-full border-collapse border border-black text-center text-xs">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-black">
                    <th className="border border-black p-2 w-[18%]">રેગ્યુલર</th>
                    <th className="border border-black p-2 w-[26%]">શાળામાંથી પરીક્ષા માટે ભરાયેલ ફોર્મની સંખ્યા</th>
                    <th className="border border-black p-2 w-[18%]">પરીક્ષામાં બેઠા</th>
                    <th className="border border-black p-2 w-[14%]">પાસ</th>
                    <th className="border border-black p-2 w-[12%]">નાપાસ</th>
                    <th className="border border-black p-2 w-[12%]">ટકાવારી %</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-black">
                    <td className="border border-black p-1.5 font-bold">કુમાર</td>
                    <td className="border border-black p-1.5">{stats.boys.filled}</td>
                    <td className="border border-black p-1.5">{stats.boys.appeared}</td>
                    <td className="border border-black p-1.5 text-emerald-700 font-bold">{stats.boys.passed}</td>
                    <td className="border border-black p-1.5 text-rose-700 font-bold">{stats.boys.failed}</td>
                    <td className="border border-black p-1.5 font-black">{stats.boys.pct}%</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border border-black p-1.5 font-bold">કન્યા</td>
                    <td className="border border-black p-1.5">{stats.girls.filled}</td>
                    <td className="border border-black p-1.5">{stats.girls.appeared}</td>
                    <td className="border border-black p-1.5 text-emerald-700 font-bold">{stats.girls.passed}</td>
                    <td className="border border-black p-1.5 text-rose-700 font-bold">{stats.girls.failed}</td>
                    <td className="border border-black p-1.5 font-black">{stats.girls.pct}%</td>
                  </tr>
                  <tr className="bg-slate-100 font-black">
                    <td className="border border-black p-2">કુલ</td>
                    <td className="border border-black p-2">{stats.total.filled}</td>
                    <td className="border border-black p-2">{stats.total.appeared}</td>
                    <td className="border border-black p-2 text-emerald-700">{stats.total.passed}</td>
                    <td className="border border-black p-2 text-rose-700">{stats.total.failed}</td>
                    <td className="border border-black p-2 text-sm text-[#C45A2D]">{stats.total.pct}%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Table 2: Grade Breakdown */}
            <div className="space-y-1">
              <div className="text-center font-bold text-xs">
                જુદા જુદા ગ્રેડમાં સમાવિષ્ટ વિદ્યાર્થીઓની સંખ્યા
              </div>
              <table className="w-full border-collapse border border-black text-center text-xs">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-black">
                    <th className="border border-black p-1.5" rowSpan={2}>કેટેગરી</th>
                    <th className="border border-black p-1.5" rowSpan={2}>A1</th>
                    <th className="border border-black p-1.5" rowSpan={2}>A2</th>
                    <th className="border border-black p-1.5" rowSpan={2}>B1</th>
                    <th className="border border-black p-1.5" rowSpan={2}>B2</th>
                    <th className="border border-black p-1.5" rowSpan={2}>C1</th>
                    <th className="border border-black p-1.5" rowSpan={2}>C2</th>
                    <th className="border border-black p-1.5" rowSpan={2}>D</th>
                    <th className="border border-black p-1" colSpan={2}>N.I.</th>
                    <th className="border border-black p-1.5" rowSpan={2}>Percentage (%)</th>
                  </tr>
                  <tr className="bg-slate-100 font-bold border-b border-black">
                    <th className="border border-black p-1 text-[10px]">E1</th>
                    <th className="border border-black p-1 text-[10px]">E2</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-black">
                    <td className="border border-black p-1.5 font-bold">કુમાર</td>
                    <td className="border border-black p-1.5">{gradeDistribution.boysCounts['A1'] || 0}</td>
                    <td className="border border-black p-1.5">{gradeDistribution.boysCounts['A2'] || 0}</td>
                    <td className="border border-black p-1.5">{gradeDistribution.boysCounts['B1'] || 0}</td>
                    <td className="border border-black p-1.5">{gradeDistribution.boysCounts['B2'] || 0}</td>
                    <td className="border border-black p-1.5">{gradeDistribution.boysCounts['C1'] || 0}</td>
                    <td className="border border-black p-1.5">{gradeDistribution.boysCounts['C2'] || 0}</td>
                    <td className="border border-black p-1.5">{gradeDistribution.boysCounts['D'] || 0}</td>
                    <td className="border border-black p-1.5 text-rose-700">{gradeDistribution.boysCounts['E1'] || 0}</td>
                    <td className="border border-black p-1.5 text-rose-700">{gradeDistribution.boysCounts['E2'] || 0}</td>
                    <td className="border border-black p-1.5 font-black">{stats.boys.pct}%</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border border-black p-1.5 font-bold">કન્યા</td>
                    <td className="border border-black p-1.5">{gradeDistribution.girlsCounts['A1'] || 0}</td>
                    <td className="border border-black p-1.5">{gradeDistribution.girlsCounts['A2'] || 0}</td>
                    <td className="border border-black p-1.5">{gradeDistribution.girlsCounts['B1'] || 0}</td>
                    <td className="border border-black p-1.5">{gradeDistribution.girlsCounts['B2'] || 0}</td>
                    <td className="border border-black p-1.5">{gradeDistribution.girlsCounts['C1'] || 0}</td>
                    <td className="border border-black p-1.5">{gradeDistribution.girlsCounts['C2'] || 0}</td>
                    <td className="border border-black p-1.5">{gradeDistribution.girlsCounts['D'] || 0}</td>
                    <td className="border border-black p-1.5 text-rose-700">{gradeDistribution.girlsCounts['E1'] || 0}</td>
                    <td className="border border-black p-1.5 text-rose-700">{gradeDistribution.girlsCounts['E2'] || 0}</td>
                    <td className="border border-black p-1.5 font-black">{stats.girls.pct}%</td>
                  </tr>
                  <tr className="bg-slate-100 font-black">
                    <td className="border border-black p-1.5">કુલ</td>
                    <td className="border border-black p-1.5">{gradeDistribution.totalCounts['A1'] || 0}</td>
                    <td className="border border-black p-1.5">{gradeDistribution.totalCounts['A2'] || 0}</td>
                    <td className="border border-black p-1.5">{gradeDistribution.totalCounts['B1'] || 0}</td>
                    <td className="border border-black p-1.5">{gradeDistribution.totalCounts['B2'] || 0}</td>
                    <td className="border border-black p-1.5">{gradeDistribution.totalCounts['C1'] || 0}</td>
                    <td className="border border-black p-1.5">{gradeDistribution.totalCounts['C2'] || 0}</td>
                    <td className="border border-black p-1.5">{gradeDistribution.totalCounts['D'] || 0}</td>
                    <td className="border border-black p-1.5 text-rose-700">{gradeDistribution.totalCounts['E1'] || 0}</td>
                    <td className="border border-black p-1.5 text-rose-700">{gradeDistribution.totalCounts['E2'] || 0}</td>
                    <td className="border border-black p-1.5 text-[#C45A2D]">{stats.total.pct}%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Table 3: Top 3 Students */}
            <div className="space-y-1">
              <div className="text-center font-bold text-xs">
                {selectedCategory === 'SC' ? 'અનુસૂચિત જાતિ (SC)' : selectedCategory === 'ST' ? 'અનુસૂચિત જનજાતિ (ST)' : selectedCategory === 'OBC' ? 'સામાજિક-શૈક્ષણિક પછાત વર્ગ (OBC)' : 'સર્વોચ્ચ ગુણ ધરાવતા'} કેટેગરીના પ્રથમ ૦૩ વિદ્યાર્થીઓ
              </div>
              <table className="w-full border-collapse border border-black text-center text-xs">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-black">
                    <th className="border border-black p-1.5 w-[8%]">ક્રમ</th>
                    <th className="border border-black p-1.5 w-[34%] text-left">વિદ્યાર્થીઓનું નામ</th>
                    <th className="border border-black p-1.5 w-[16%]">સીટ નં.</th>
                    <th className="border border-black p-1.5 w-[12%]">કુલ ગુણ</th>
                    <th className="border border-black p-1.5 w-[12%]">મેળવેલ ગુણ</th>
                    <th className="border border-black p-1.5 w-[10%]">ટકા (%)</th>
                    <th className="border border-black p-1.5 w-[18%]">મોબાઇલ નં.</th>
                  </tr>
                </thead>
                <tbody>
                  {[0, 1, 2].map((idx) => {
                    const st = topStudents[idx];
                    return (
                      <tr key={idx} className="border-b border-black">
                        <td className="border border-black p-1.5 font-bold">{idx + 1}</td>
                        <td className="border border-black p-1.5 text-left font-bold">{st ? st.student.studentName : '-'}</td>
                        <td className="border border-black p-1.5 font-mono">{st ? ((st.student as any).seatNumber || st.rollNumber || '-') : '-'}</td>
                        <td className="border border-black p-1.5">{st ? st.totalMax : '-'}</td>
                        <td className="border border-black p-1.5 font-bold">{st ? st.totalObtained : '-'}</td>
                        <td className="border border-black p-1.5 font-black text-[#C45A2D]">{st ? `${st.percentage}%` : '-'}</td>
                        <td className="border border-black p-1.5 font-mono">{st ? (((st.student as any).phone || (st.student as any).mobile || '-')) : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table 4: Subject-wise Teacher Performance (Editable In-Place) */}
            <div className="space-y-1">
              <div className="text-center font-bold text-xs flex items-center justify-center gap-2">
                <span>વિષય મુજબ શિક્ષકોના પરિણામની વિગતો</span>
                <span className="text-[10px] text-slate-500 font-normal">(શિક્ષકનું નામ અને સંપર્ક સંપાદન કરી શકાય છે)</span>
              </div>
              <table className="w-full border-collapse border border-black text-center text-xs">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-black">
                    <th className="border border-black p-1.5 w-[8%]">ક્રમ</th>
                    <th className="border border-black p-1.5 w-[22%] text-left">વિષય</th>
                    <th className="border border-black p-1.5 w-[28%] text-left">વિષય શિક્ષકનું નામ</th>
                    <th className="border border-black p-1.5 w-[12%]">બેઠા</th>
                    <th className="border border-black p-1.5 w-[12%]">પાસ</th>
                    <th className="border border-black p-1.5 w-[12%]">%</th>
                    <th className="border border-black p-1.5 w-[18%]">Contact No.</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectStats.map((item, idx) => (
                    <tr key={item.key} className="border-b border-black">
                      <td className="border border-black p-1.5 font-bold">{idx + 1}</td>
                      <td className="border border-black p-1.5 text-left font-bold">{item.name}</td>
                      <td className="border border-black p-1 text-left">
                        <input
                          type="text"
                          value={item.teacherName}
                          onChange={(e) => handleTeacherChange(item.key, 'name', e.target.value)}
                          className="w-full p-1 bg-transparent border-b border-dashed border-slate-300 focus:border-black font-semibold outline-hidden"
                          placeholder="શિક્ષકનું નામ..."
                        />
                      </td>
                      <td className="border border-black p-1.5">{item.appeared}</td>
                      <td className="border border-black p-1.5 text-emerald-700 font-bold">{item.passed}</td>
                      <td className="border border-black p-1.5 font-black">{item.pct}%</td>
                      <td className="border border-black p-1 font-mono">
                        <input
                          type="text"
                          value={item.contact}
                          onChange={(e) => handleTeacherChange(item.key, 'contact', e.target.value)}
                          className="w-full p-1 bg-transparent border-b border-dashed border-slate-300 focus:border-black text-center outline-hidden"
                          placeholder="મોબાઈલ નં."
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Signatures Block */}
            <div className="pt-8 flex justify-between items-end px-4">
              <div className="text-center">
                <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-400 flex flex-col items-center justify-center text-[10px] font-bold text-slate-500">
                  <span>શાળાનો સિક્કો</span>
                  <span className="text-[9px]">(Round Seal)</span>
                </div>
              </div>

              <div className="text-center space-y-1">
                <div className="font-bold text-sm text-[#1e3a8a]">{school?.principalName || 'આચાર્યશ્રી'}</div>
                <div className="text-xs font-black">આચાર્યશ્રી સહી & સિક્કો</div>
                <div className="text-[11px] text-slate-600 font-semibold">{school?.schoolName || 'શ્રી સરકારી માધ્યમિક શાળા'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
