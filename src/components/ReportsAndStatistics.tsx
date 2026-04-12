import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { 
  BarChart3, 
  RefreshCw, 
  Search, 
  FileText, 
  Printer, 
  ChevronLeft, 
  ChevronRight,
  User,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Table as TableIcon,
  FileDown
} from 'lucide-react';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, AlignmentType, WidthType, BorderStyle, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { useAuth } from '../contexts/AuthContext';
import { STATUS_TRANSLATIONS } from '../constants';

interface MemberStat {
  member_name: string;
  grade: string;
  seniority: number;
  is_active: number;
  total_inspections: number;
  total_investigations: number;
  finished_inspections: number;
  finished_investigations: number;
}

interface TaskDetail {
  id: number;
  task_type: string;
  record_number: string;
  record_year: string;
  member_role: string;
  assignment_date: string;
  task_status: string;
}

interface MemberDetails {
  inspections: TaskDetail[];
  investigations: TaskDetail[];
  objectionsMember3: TaskDetail[];
  allObjections: TaskDetail[];
}

export default function ReportsAndStatistics() {
  const { user } = useAuth();
  const [stats, setStats] = useState<MemberStat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [detailSearchTerm, setDetailSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [memberDetails, setMemberDetails] = useState<MemberDetails | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'inspections' | 'investigations' | 'objections'>('inspections');

  const [activeTab, setActiveTab] = useState<'members' | 'general'>('members');
  const [summary, setSummary] = useState<any>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/reports/member-stats');
      const data = await res.json();
      setStats(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch stats", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await apiFetch('/api/reports/summary');
      const data = await res.json();
      setSummary(data);
    } catch (error) {
      console.error("Failed to fetch summary", error);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchSummary();
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await apiFetch('/api/reports/sync', { method: 'POST' });
      if (res.ok) {
        fetchStats();
        fetchSummary();
      }
    } catch (error) {
      console.error("Sync failed", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchMemberDetails = async (name: string) => {
    setIsLoading(true);
    try {
      const res = await apiFetch(`/api/reports/member/${encodeURIComponent(name)}/details`);
      const data = await res.json();
      setMemberDetails(data);
      setSelectedMember(name);
    } catch (error) {
      console.error("Failed to fetch member details", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStats = stats.filter(s => {
    const matchesSearch = s.member_name.includes(searchTerm) || s.grade.includes(searchTerm);
    const matchesInactive = showInactive || s.is_active === 1;
    return matchesSearch && matchesInactive;
  });

  const calculatePercentage = (finished: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((finished / total) * 100);
  };

  const handlePrint = () => {
    const printContent = document.getElementById('printable-area');
    if (!printContent) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const title = selectedMember ? `كشوف السيد / ${selectedMember}` : 'إحصائية أعضاء النيابة';

    doc.write(`
      <html dir="rtl">
        <head>
          <title>${title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
            body { 
              font-family: 'Cairo', 'Arial', sans-serif; 
              padding: 20px; 
              background: white;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 15px;
            }
            .header h1 { margin: 0; font-size: 24pt; color: #1a1a1a; }
            .header p { margin: 5px 0 0; font-size: 14pt; color: #666; }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px;
              table-layout: auto;
            }
            th, td { 
              border: 1.5pt solid #333; 
              padding: 12px 8px; 
              text-align: center; 
              font-size: 14pt;
              word-wrap: break-word;
            }
            th { 
              background-color: #f0f0f0; 
              font-weight: bold;
              font-size: 15pt;
            }
            .percentage-cell {
              font-weight: bold;
            }
            .status-finished { color: #059669; }
            .status-pending { color: #d97706; }
            @page {
              size: A4;
              margin: 1.5cm;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${title}</h1>
            <p>تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-EG')}</p>
          </div>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      document.body.removeChild(iframe);
    }, 500);
  };

  const handleExportWord = async () => {
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            children: [
              new TextRun({
                text: "إحصائية أعضاء النيابة المحال إليهم مهام",
                bold: true,
                size: 36, // 18pt
                font: "Cairo",
                rightToLeft: true,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            children: [
              new TextRun({
                text: `تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-EG')}`,
                size: 24, // 12pt
                font: "Cairo",
                rightToLeft: true,
              }),
            ],
          }),
          new Paragraph({ text: "" }), // Spacer
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            visuallyRightToLeft: true,
            rows: [
              new TableRow({
                children: [
                  "اسم العضو", "فحوص محالة", "فحوص منتهية", "فحوص متداولة", "نسبة إنجاز (فحص)",
                  "تحقيقات محالة", "تحقيقات منتهية", "تحقيقات متداولة", "نسبة إنجاز (تحقيق)"
                ].map(text => new TableCell({
                  children: [new Paragraph({ 
                    alignment: AlignmentType.CENTER, 
                    bidirectional: true,
                    children: [new TextRun({ text, bold: true, size: 24, font: "Cairo" })] 
                  })],
                  shading: { fill: "F2F2F2" },
                })),
              }),
              ...filteredStats.map(s => {
                const inspPerc = calculatePercentage(s.finished_inspections, s.total_inspections);
                const invPerc = calculatePercentage(s.finished_investigations, s.total_investigations);
                return new TableRow({
                  children: [
                    s.member_name,
                    s.total_inspections.toString(),
                    s.finished_inspections.toString(),
                    (s.total_inspections - s.finished_inspections).toString(),
                    `${inspPerc}%`,
                    s.total_investigations.toString(),
                    s.finished_investigations.toString(),
                    (s.total_investigations - s.finished_investigations).toString(),
                    `${invPerc}%`
                  ].map(text => new TableCell({
                    children: [new Paragraph({ 
                      alignment: AlignmentType.CENTER, 
                      bidirectional: true,
                      children: [new TextRun({ text, size: 24, font: "Cairo" })] 
                    })],
                  })),
                });
              }),
            ],
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `احصائية_الاعضاء_${new Date().toLocaleDateString('ar-EG')}.docx`);
  };

  const handleExportWordDetails = async () => {
    if (!selectedMember || !memberDetails) return;

    const createTable = (title: string, data: TaskDetail[], headers: string[], rowMapper: (t: TaskDetail, i: number) => string[]) => {
      return [
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          children: [new TextRun({ text: title, bold: true, size: 32, font: "Cairo", rightToLeft: true })],
          spacing: { before: 400, after: 200 },
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          visuallyRightToLeft: true,
          rows: [
            new TableRow({
              children: headers.map(text => new TableCell({
                children: [new Paragraph({ 
                  alignment: AlignmentType.CENTER, 
                  bidirectional: true,
                  children: [new TextRun({ text, bold: true, size: 24, font: "Cairo" })] 
                })],
                shading: { fill: "F2F2F2" },
              })),
            }),
            ...data.map((t, i) => new TableRow({
              children: rowMapper(t, i).map(text => new TableCell({
                children: [new Paragraph({ 
                  alignment: AlignmentType.CENTER, 
                  bidirectional: true,
                  children: [new TextRun({ text, size: 24, font: "Cairo" })] 
                })],
              })),
            })),
          ],
        }),
      ];
    };

    const sections: any[] = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        bidirectional: true,
        children: [new TextRun({ text: `كشوف السيد / ${selectedMember}`, bold: true, size: 40, font: "Cairo", rightToLeft: true })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        bidirectional: true,
        children: [new TextRun({ text: `تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-EG')}`, size: 24, font: "Cairo", rightToLeft: true })],
      }),
    ];

    if (memberDetails.inspections.length > 0) {
      sections.push(...createTable("كشف الفحوص المحالة", memberDetails.inspections, 
        ["مسلسل", "رقم الفحص", "سنة الفحص", "تاريخ الإحالة", "الحالة"],
        (t, i) => [(i + 1).toString(), t.record_number, t.record_year, t.assignment_date, t.task_status]
      ));
    }

    if (memberDetails.investigations.length > 0) {
      sections.push(...createTable("كشف التحقيقات المحالة", memberDetails.investigations, 
        ["مسلسل", "رقم التحقيق", "سنة التحقيق", "الحالة"],
        (t, i) => [(i + 1).toString(), t.record_number, t.record_year, t.task_status]
      ));
    }

    if (memberDetails.objectionsMember3.length > 0) {
      sections.push(...createTable("كشف اعتراضات العضو الثالث", memberDetails.objectionsMember3, 
        ["مسلسل", "رقم الاعتراض", "سنة الاعتراض", "الحالة"],
        (t, i) => [(i + 1).toString(), t.record_number, t.record_year, t.task_status]
      ));
    }

    if (memberDetails.allObjections.length > 0) {
      sections.push(...createTable("كشف اشتراك العضو في لجان الاعتراض", memberDetails.allObjections, 
        ["مسلسل", "رقم الاعتراض", "سنة الاعتراض", "صفة العضو", "الحالة"],
        (t, i) => [(i + 1).toString(), t.record_number, t.record_year, t.member_role, t.task_status]
      ));
    }

    const doc = new Document({
      sections: [{
        properties: {
          page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } },
        },
        children: sections,
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `كشوف_${selectedMember}_${new Date().toLocaleDateString('ar-EG')}.docx`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">التقارير والإحصائيات</h2>
            <p className="text-sm text-gray-500">متابعة دقيقة لإنجازات أعضاء النيابة</p>
          </div>
        </div>
        <div className="flex gap-3">
          {(user?.role === 'developer' || user?.role === 'admin') && (
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
              تحديث البيانات
            </button>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-4 p-1 bg-gray-100 rounded-2xl w-fit print:hidden">
        <button 
          onClick={() => setActiveTab('members')}
          className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'members' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Users className="w-5 h-5" /> إحصائيات الأعضاء
        </button>
        <button 
          onClick={() => setActiveTab('general')}
          className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'general' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <FileText className="w-5 h-5" /> التقارير العامة
        </button>
      </div>

      {activeTab === 'general' ? (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Complaint Status Report */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-indigo-900">
                <Clock className="w-5 h-5" /> تقرير حالة الشكاوى (المراحل)
              </h3>
              <div className="space-y-4">
                {['incoming', 'inspection_presentation', 'inspection', 'inspection_finished', 'investigation', 'investigation_finished', 'council', 'finished'].map(status => {
                  const count = summary?.statusCounts?.find((s: any) => s.status === status)?.count || 0;
                  return (
                    <div key={status} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <span className="font-medium text-gray-700">{STATUS_TRANSLATIONS[status]}</span>
                      <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg font-bold">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Inspection Results Report */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-emerald-900">
                <CheckCircle2 className="w-5 h-5" /> تقرير نتائج التصرف في الفحص
              </h3>
              <div className="space-y-4">
                {['حفظ', 'ملحوظة كتابية', 'ملحوظة شفوية', 'إحالة للتحقيق', 'ضم لفحص آخر', 'ضم لتحقيق آخر'].map(result => {
                  const count = summary?.inspectionResults?.find((r: any) => r.result === result)?.count || 0;
                  return (
                    <div key={result} className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
                      <span className="font-medium text-emerald-800">{result}</span>
                      <span className="bg-emerald-200 text-emerald-800 px-3 py-1 rounded-lg font-bold">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Investigation Results Report */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-amber-900">
                <AlertCircle className="w-5 h-5" /> تقرير نتائج التصرف في التحقيق
              </h3>
              <div className="space-y-4">
                {['حفظ', 'ملحوظة كتابية', 'ملحوظة شفوية', 'تنبيه', 'ضم لتحقيق آخر', 'إحالة إلى مجلس التأديب هيئة عادية', 'إحالة إلى مجلس التأديب هيئة صلاحية'].map(result => {
                  const count = summary?.investigationResults?.find((r: any) => r.result === result)?.count || 0;
                  return (
                    <div key={result} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
                      <span className="font-medium text-amber-800">{result}</span>
                      <span className="bg-amber-200 text-amber-800 px-3 py-1 rounded-lg font-bold">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Disciplinary Judgments Report */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-red-900">
                <FileText className="w-5 h-5" /> تقرير أحكام مجلس التأديب
              </h3>
              <div className="space-y-4">
                {['براءة', 'إنذار', 'لوم', 'عزل', 'رفض صلاحية', 'قبول صلاحية احالة للمعاش', 'قبول صلاحية واحالة وظيفة غير قضائية'].map(result => {
                  const count = summary?.councilResults?.find((r: any) => r.result === result)?.count || 0;
                  return (
                    <div key={result} className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                      <span className="font-medium text-red-800">{result}</span>
                      <span className="bg-red-200 text-red-800 px-3 py-1 rounded-lg font-bold">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : !selectedMember ? (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Filters */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 print:hidden">
            <div className="relative flex-1">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text"
                placeholder="بحث باسم العضو أو الدرجة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-12 pl-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
            <label className="flex items-center gap-2 px-4 py-3 bg-gray-50 text-gray-700 border border-gray-100 rounded-xl font-bold cursor-pointer hover:bg-gray-100 transition-all">
              <input 
                type="checkbox" 
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm">إظهار المستبعدين/المنقولين</span>
            </label>
            <div className="flex gap-2">
              <button 
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-50 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-all"
              >
                <Printer className="w-5 h-5" /> طباعة الإحصائية
              </button>
              <button 
                onClick={handleExportWord}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-700 rounded-xl font-bold hover:bg-emerald-100 transition-all"
              >
                <FileDown className="w-5 h-5" /> تصدير Word
              </button>
            </div>
          </div>

          {/* Main Stats Table */}
          <div id="printable-area" className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-gray-900">إحصائية الأعضاء المحال إليهم مهام</h3>
              <span className="text-xs text-gray-400">الفترة: من 1 يناير {new Date().getFullYear()} حتى الآن</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead className="bg-gray-50 text-gray-400 text-xs font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 border-b">اسم العضو</th>
                    <th className="px-6 py-4 border-b">فحوص محالة</th>
                    <th className="px-6 py-4 border-b">فحوص منتهية</th>
                    <th className="px-6 py-4 border-b">فحوص متداولة</th>
                    <th className="px-6 py-4 border-b">نسبة إنجاز الفحوص</th>
                    <th className="px-6 py-4 border-b">تحقيقات محالة</th>
                    <th className="px-6 py-4 border-b">تحقيقات منتهية</th>
                    <th className="px-6 py-4 border-b">تحقيقات متداولة</th>
                    <th className="px-6 py-4 border-b">نسبة إنجاز التحقيقات</th>
                    <th className="px-6 py-4 border-b print:hidden">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStats.map((s, idx) => {
                    const inspPerc = calculatePercentage(s.finished_inspections, s.total_inspections);
                    const invPerc = calculatePercentage(s.finished_investigations, s.total_investigations);
                    
                    return (
                      <tr key={idx} className={`hover:bg-gray-50/50 transition-colors group ${s.is_active === 0 ? 'bg-gray-50/80 opacity-80' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${s.is_active === 0 ? 'bg-gray-200 text-gray-500' : 'bg-indigo-50 text-indigo-600'}`}>
                              {s.member_name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-gray-900">{s.member_name}</p>
                                {s.is_active === 0 && (
                                  <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">مستبعد/منقول</span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400">{s.grade}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-600">{s.total_inspections}</td>
                        <td className="px-6 py-4 text-emerald-600 font-bold">{s.finished_inspections}</td>
                        <td className="px-6 py-4 text-amber-600 font-bold">{s.total_inspections - s.finished_inspections}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${inspPerc > 70 ? 'bg-emerald-500' : inspPerc > 30 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${inspPerc}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-gray-500">{inspPerc}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-600">{s.total_investigations}</td>
                        <td className="px-6 py-4 text-emerald-600 font-bold">{s.finished_investigations}</td>
                        <td className="px-6 py-4 text-amber-600 font-bold">{s.total_investigations - s.finished_investigations}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${invPerc > 70 ? 'bg-emerald-500' : invPerc > 30 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${invPerc}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-gray-500">{invPerc}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 print:hidden">
                          <button 
                            onClick={() => fetchMemberDetails(s.member_name)}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="عرض الكشوف التفصيلية"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-left duration-500">
          {/* Member Detail Header */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 print:shadow-none print:border-none">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSelectedMember(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors print:hidden"
              >
                <ChevronRight className="w-6 h-6 text-gray-400" />
              </button>
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">كشوف السيد / {selectedMember}</h3>
                <p className="text-sm text-gray-500 mt-1">استعراض تفصيلي للمهام واللجان</p>
              </div>
            </div>
            <div className="flex gap-3 print:hidden">
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-6 py-2.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-xl font-bold hover:bg-gray-100 transition-all"
              >
                <Printer className="w-5 h-5" /> طباعة الكشوف
              </button>
              <button 
                onClick={handleExportWordDetails}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold hover:bg-emerald-100 transition-all"
              >
                <FileDown className="w-5 h-5" /> تصدير Word
              </button>
            </div>
          </div>

          {/* Detail Tabs & Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
            <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
              <button 
                onClick={() => setActiveDetailTab('inspections')}
                className={`px-6 py-2.5 rounded-xl font-bold transition-all ${activeDetailTab === 'inspections' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                كشف الفحوص
              </button>
              <button 
                onClick={() => setActiveDetailTab('investigations')}
                className={`px-6 py-2.5 rounded-xl font-bold transition-all ${activeDetailTab === 'investigations' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                كشف التحقيقات
              </button>
              <button 
                onClick={() => setActiveDetailTab('objections')}
                className={`px-6 py-2.5 rounded-xl font-bold transition-all ${activeDetailTab === 'objections' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                كشف الاعتراضات
              </button>
            </div>

            <div className="relative flex-1 max-w-xs group">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
              <input 
                type="text"
                placeholder="بحث بالرقم أو التاريخ..."
                value={detailSearchTerm}
                onChange={(e) => setDetailSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
              />
            </div>
          </div>

          {/* Detail Content */}
          <div id="printable-area" className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {activeDetailTab === 'inspections' && (
              <div className="animate-in fade-in duration-300">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h4 className="font-bold text-lg text-gray-900">كشف الفحوص المحالة</h4>
                  <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">إجمالي: {memberDetails?.inspections.length}</span>
                </div>
                <table className="w-full text-right border-collapse">
                  <thead className="bg-gray-50 text-gray-400 text-xs font-bold uppercase">
                    <tr>
                      <th className="px-6 py-4 border-b">مسلسل</th>
                      <th className="px-6 py-4 border-b">رقم الفحص</th>
                      <th className="px-6 py-4 border-b">سنة الفحص</th>
                      <th className="px-6 py-4 border-b">تاريخ الإحالة</th>
                      <th className="px-6 py-4 border-b">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {memberDetails?.inspections
                      .filter(t => t.record_number.includes(detailSearchTerm) || t.assignment_date?.includes(detailSearchTerm))
                      .map((t, i) => (
                      <tr key={t.id}>
                        <td className="px-6 py-4 text-sm text-gray-400">{i + 1}</td>
                        <td className="px-6 py-4 font-bold text-gray-900">{t.record_number}</td>
                        <td className="px-6 py-4 text-gray-600">{t.record_year}</td>
                        <td className="px-6 py-4 text-gray-500 text-sm">{t.assignment_date}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${t.task_status === 'منتهي' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                            {t.task_status === 'منتهي' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {t.task_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeDetailTab === 'investigations' && (
              <div className="animate-in fade-in duration-300">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h4 className="font-bold text-lg text-gray-900">كشف التحقيقات المحالة</h4>
                  <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">إجمالي: {memberDetails?.investigations.length}</span>
                </div>
                <table className="w-full text-right border-collapse">
                  <thead className="bg-gray-50 text-gray-400 text-xs font-bold uppercase">
                    <tr>
                      <th className="px-6 py-4 border-b">مسلسل</th>
                      <th className="px-6 py-4 border-b">رقم التحقيق</th>
                      <th className="px-6 py-4 border-b">سنة التحقيق</th>
                      <th className="px-6 py-4 border-b">تاريخ الإحالة</th>
                      <th className="px-6 py-4 border-b">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {memberDetails?.investigations
                      .filter(t => t.record_number.includes(detailSearchTerm) || t.assignment_date?.includes(detailSearchTerm))
                      .map((t, i) => (
                      <tr key={t.id}>
                        <td className="px-6 py-4 text-sm text-gray-400">{i + 1}</td>
                        <td className="px-6 py-4 font-bold text-gray-900">{t.record_number}</td>
                        <td className="px-6 py-4 text-gray-600">{t.record_year}</td>
                        <td className="px-6 py-4 text-gray-500 text-sm">{t.assignment_date}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${t.task_status === 'منتهي' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                            {t.task_status === 'منتهي' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {t.task_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeDetailTab === 'objections' && (
              <div className="animate-in fade-in duration-300 space-y-8 p-6">
                <div>
                  <h4 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                    <TableIcon className="w-5 h-5" /> كشف اعتراضات العضو الثالث
                  </h4>
                  <table className="w-full text-right border-collapse border border-gray-100 rounded-xl overflow-hidden">
                    <thead className="bg-gray-50 text-gray-400 text-xs font-bold">
                      <tr>
                        <th className="px-6 py-4 border-b">مسلسل</th>
                        <th className="px-6 py-4 border-b">رقم الاعتراض</th>
                        <th className="px-6 py-4 border-b">سنة الاعتراض</th>
                        <th className="px-6 py-4 border-b">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {memberDetails?.objectionsMember3.map((t, i) => (
                        <tr key={t.id}>
                          <td className="px-6 py-4 text-sm text-gray-400">{i + 1}</td>
                          <td className="px-6 py-4 font-bold text-gray-900">{t.record_number}</td>
                          <td className="px-6 py-4 text-gray-600">{t.record_year}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${t.task_status === 'منتهي' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                              {t.task_status === 'منتهي' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                              {t.task_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {memberDetails?.objectionsMember3.length === 0 && (
                        <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">لا توجد اعتراضات مسجلة كعضو ثالث</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div>
                  <h4 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" /> كشف اشتراك العضو في لجان الاعتراض
                  </h4>
                  <table className="w-full text-right border-collapse border border-gray-100 rounded-xl overflow-hidden">
                    <thead className="bg-gray-50 text-gray-400 text-xs font-bold">
                      <tr>
                        <th className="px-6 py-4 border-b">مسلسل</th>
                        <th className="px-6 py-4 border-b">رقم الاعتراض</th>
                        <th className="px-6 py-4 border-b">سنة الاعتراض</th>
                        <th className="px-6 py-4 border-b">صفة العضو</th>
                        <th className="px-6 py-4 border-b">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {memberDetails?.allObjections.map((t, i) => (
                        <tr key={t.id}>
                          <td className="px-6 py-4 text-sm text-gray-400">{i + 1}</td>
                          <td className="px-6 py-4 font-bold text-gray-900">{t.record_number}</td>
                          <td className="px-6 py-4 text-gray-600">{t.record_year}</td>
                          <td className="px-6 py-4 font-bold text-indigo-600">{t.member_role}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${t.task_status === 'منتهي' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                              {t.task_status === 'منتهي' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                              {t.task_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {memberDetails?.allObjections.length === 0 && (
                        <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">لا توجد لجان اعتراض مسجلة</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-[200] flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl shadow-2xl border border-gray-100 flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            <p className="font-bold text-gray-900">جاري معالجة البيانات...</p>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { shadow: none !important; box-shadow: none !important; }
          .print\\:border-none { border: none !important; }
          .bg-white { background: white !important; }
          .bg-gray-50 { background: #f9fafb !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #e5e7eb !important; padding: 12px !important; }
          h2, h3, h4 { text-align: center !important; margin-bottom: 20px !important; }
        }
      `}} />
    </div>
  );
}
