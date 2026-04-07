import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  RefreshCw, 
  Users, 
  Printer, 
  FileText, 
  Eye, 
  X,
  ChevronLeft,
  Loader2,
  LayoutGrid,
  Search,
  Plus
} from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { ProsecutionMember } from '../types';

interface ProsecutionOffice {
  id: number;
  prosecution_name: string;
  members_count: number;
  last_updated: string;
}

export default function ProsecutionManagement() {
  const [offices, setOffices] = useState<ProsecutionOffice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState<ProsecutionOffice | null>(null);
  const [officeMembers, setOfficeMembers] = useState<ProsecutionMember[]>([]);
  const [showAllFormations, setShowAllFormations] = useState(false);
  const [allFormations, setAllFormations] = useState<(ProsecutionOffice & { members: ProsecutionMember[] })[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingOffice, setIsAddingOffice] = useState(false);
  const [newOfficeName, setNewOfficeName] = useState('');

  const fetchOffices = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/prosecution-offices');
      const data = await res.json();
      setOffices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch offices", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOffices();
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/prosecution-offices/sync', { method: 'POST' });
      if (res.ok) {
        fetchOffices();
      }
    } catch (error) {
      console.error("Sync failed", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchOfficeMembers = async (office: ProsecutionOffice) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/prosecution-offices/${encodeURIComponent(office.prosecution_name)}/members`);
      const data = await res.json();
      setOfficeMembers(Array.isArray(data) ? data : []);
      setSelectedOffice(office);
    } catch (error) {
      console.error("Failed to fetch members", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllFormations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/prosecution-offices/all-formations');
      const data = await res.json();
      setAllFormations(Array.isArray(data) ? data : []);
      setShowAllFormations(true);
    } catch (error) {
      console.error("Failed to fetch all formations", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateWord = async (officeName: string, members: ProsecutionMember[]) => {
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: `تشكيل أعضاء نيابة ${officeName}`,
                size: 36, // 18pt
                bold: true,
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  'مسلسل', 'الاسم', 'الدرجة', 'الأقدمية', 'الرقم القومي', 'التليفون'
                ].map(text => new TableCell({
                  children: [
                    new Paragraph({ 
                      children: [new TextRun({ text, size: 36, bold: true })],
                      alignment: AlignmentType.CENTER 
                    })
                  ],
                  shading: { fill: "F3F4F6" },
                })),
              }),
              ...members.map((m, i) => new TableRow({
                children: [
                  (i + 1).toString(),
                  m.name,
                  m.grade,
                  m.seniority.toString(),
                  m.national_id,
                  m.phone1 || ''
                ].map(text => new TableCell({
                  children: [
                    new Paragraph({ 
                      children: [new TextRun({ text, size: 36 })],
                      alignment: AlignmentType.CENTER 
                    })
                  ],
                })),
              })),
            ],
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `تشكيل_نيابة_${officeName}.docx`);
  };

  const generateAllWord = async () => {
    const sections = allFormations.map(formation => ({
      properties: {
        page: {
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
        },
      },
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: `تشكيل أعضاء نيابة ${formation.prosecution_name}`,
              size: 36, // 18pt
              bold: true,
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                'مسلسل', 'الاسم', 'الدرجة', 'الأقدمية', 'الرقم القومي', 'التليفون'
              ].map(text => new TableCell({
                children: [
                  new Paragraph({ 
                    children: [new TextRun({ text, size: 36, bold: true })],
                    alignment: AlignmentType.CENTER 
                  })
                ],
                shading: { fill: "F3F4F6" },
              })),
            }),
            ...formation.members.map((m, i) => new TableRow({
              children: [
                (i + 1).toString(),
                m.name,
                m.grade,
                m.seniority.toString(),
                m.national_id,
                m.phone1 || ''
              ].map(text => new TableCell({
                children: [
                  new Paragraph({ 
                    children: [new TextRun({ text, size: 36 })],
                    alignment: AlignmentType.CENTER 
                  })
                ],
              })),
            })),
          ],
        }),
      ],
    }));

    const doc = new Document({ sections });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `تشكيل_جميع_النيابات.docx`);
  };

  const handlePrint = () => {
    const printContent = document.querySelector('.print-content');
    if (!printContent) {
      window.print(); // Fallback
      return;
    }

    // Create a hidden iframe if it doesn't exist
    let iframe = document.getElementById('print-iframe') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
    }

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(style => style.outerHTML)
      .join('');

    const content = `
      <html dir="rtl" lang="ar">
        <head>
          <title>طباعة التشكيل</title>
          ${styles}
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
            body { 
              background: white !important; 
              padding: 2cm; 
              font-family: 'Cairo', 'Arial', sans-serif; 
              direction: rtl;
            }
            .print\\:hidden { display: none !important; }
            @page { margin: 0; size: A4; }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px; 
              direction: rtl;
              table-layout: auto;
            }
            th, td { 
              border: 1px solid black; 
              padding: 12px; 
              text-align: center; 
              font-size: 18pt; 
              color: black;
              word-break: break-word;
            }
            th { 
              background-color: #f3f4f6 !important; 
              -webkit-print-color-adjust: exact; 
              font-weight: bold; 
            }
            h3, h4 { 
              text-align: center; 
              margin-bottom: 40px; 
              font-size: 28pt; 
              font-weight: bold; 
              color: black;
              display: block;
            }
            .page-break {
              page-break-after: always;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.focus();
                window.print();
              }, 250);
            };
          </script>
        </body>
      </html>
    `;

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(content);
      doc.close();
    }
  };

  const handleAddOffice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfficeName.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/prosecution-offices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prosecution_name: newOfficeName.trim() })
      });
      if (res.ok) {
        setNewOfficeName('');
        setIsAddingOffice(false);
        fetchOffices();
      } else {
        const data = await res.json();
        alert(data.error || "فشل إضافة النيابة");
      }
    } catch (error) {
      console.error("Failed to add office", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOffices = offices.filter(office => 
    office.prosecution_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">تشكيل النيابات</h2>
            <p className="text-sm text-gray-500">استخراج وتصدير تشكيل أعضاء النيابة تلقائياً</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsAddingOffice(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl font-bold hover:bg-emerald-100 transition-all"
          >
            <Plus className="w-5 h-5" /> إضافة نيابة يدوياً
          </button>
          <button 
            onClick={fetchAllFormations}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl font-bold hover:bg-indigo-100 transition-all"
          >
            <LayoutGrid className="w-5 h-5" /> عرض جميع التشكيلات
          </button>
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
            استيراد وتحديث التشكيل
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {!selectedOffice && !showAllFormations && (
        <div className="relative print:hidden">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="بحث باسم النيابة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-12 pl-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
          />
        </div>
      )}

      {/* Offices Grid */}
      {!selectedOffice && !showAllFormations && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:hidden">
          {filteredOffices.map((office) => (
            <div 
              key={office.id} 
              onClick={() => fetchOfficeMembers(office)}
              className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 group hover:shadow-xl hover:border-indigo-200 transition-all cursor-pointer relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:scale-110" />
              <div className="relative z-10 flex items-start justify-between">
                <div className="space-y-3">
                  <h4 className="font-bold text-xl text-gray-900 group-hover:text-indigo-600 transition-colors">{office.prosecution_name}</h4>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Users className="w-4 h-4" />
                    <span className="text-sm font-medium">{office.members_count} عضو</span>
                  </div>
                  <p className="text-[10px] text-gray-400">آخر تحديث: {new Date(office.last_updated).toLocaleString('ar-EG')}</p>
                </div>
                <div className="w-10 h-10 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <ChevronLeft className="w-6 h-6" />
                </div>
              </div>
            </div>
          ))}
          {offices.length === 0 && !isLoading && (
            <div className="col-span-full p-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
              <Building2 className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">لا توجد نيابات مسجلة حالياً. اضغط على "استيراد وتحديث التشكيل" لجلب البيانات من قسم الأعضاء.</p>
            </div>
          )}
        </div>
      )}

      {/* Single Office View */}
      {selectedOffice && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 print-content">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 print:shadow-none print:border-none">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSelectedOffice(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors print:hidden"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
              <div className="print:block print:w-full print:text-center">
                <h3 className="text-2xl font-bold text-gray-900">تشكيل أعضاء {selectedOffice.prosecution_name}</h3>
                <p className="text-sm text-gray-500 mt-1 print:hidden">إجمالي عدد الأعضاء: {selectedOffice.members_count} عضو</p>
              </div>
            </div>
            <div className="flex gap-3 print:hidden">
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-xl font-bold hover:bg-gray-100 transition-all"
              >
                <Printer className="w-5 h-5" /> طباعة التشكيل
              </button>
              <button 
                onClick={() => generateWord(selectedOffice.prosecution_name, officeMembers)}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
              >
                <FileText className="w-5 h-5" /> تصدير Word
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-none print:w-full print:overflow-visible">
            <table className="w-full text-right border-collapse">
              <thead className="bg-gray-50 border-b border-gray-100 print:bg-white">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase border print:text-black print:border-black">مسلسل</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase border print:text-black print:border-black">الاسم</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase border print:text-black print:border-black">الدرجة</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase border print:text-black print:border-black">الأقدمية</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase border print:text-black print:border-black">الرقم القومي</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase border print:text-black print:border-black">التليفون</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 print:divide-black">
                {officeMembers.map((m, idx) => (
                  <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-400 border print:text-black print:border-black">{idx + 1}</td>
                    <td className="px-6 py-4 font-bold text-gray-900 border print:text-black print:border-black">{m.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 border print:text-black print:border-black">{m.grade}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 border print:text-black print:border-black">{m.seniority}</td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-500 border print:text-black print:border-black">{m.national_id}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 border print:text-black print:border-black">{m.phone1}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All Formations View */}
      {showAllFormations && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 print-content">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowAllFormations(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">استعراض جميع تشكيلات النيابات</h3>
                <p className="text-sm text-gray-500 mt-1">إجمالي عدد النيابات: {allFormations.length}</p>
              </div>
            </div>
            <div className="flex gap-3 print:hidden">
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-xl font-bold hover:bg-gray-100 transition-all"
              >
                <Printer className="w-5 h-5" /> طباعة الكل
              </button>
              <button 
                onClick={generateAllWord}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
              >
                <FileText className="w-5 h-5" /> تصدير Word شامل
              </button>
            </div>
          </div>

          <div className="space-y-12">
            {allFormations.map((formation) => (
              <div key={formation.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-none page-break">
                <div className="p-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between print:bg-white">
                  <h4 className="font-bold text-xl text-indigo-900 print:text-black print:w-full print:text-center">نيابة {formation.prosecution_name}</h4>
                  <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full print:hidden">{formation.members_count} عضو</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead className="bg-gray-50/50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 border print:text-black print:border-black">م</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 border print:text-black print:border-black">الاسم</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 border print:text-black print:border-black">الدرجة</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 border print:text-black print:border-black">الأقدمية</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 border print:text-black print:border-black">الرقم القومي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {formation.members.map((m, idx) => (
                        <tr key={m.id}>
                          <td className="px-6 py-4 text-sm text-gray-400 border print:text-black print:border-black">{idx + 1}</td>
                          <td className="px-6 py-4 font-bold text-gray-900 border print:text-black print:border-black">{m.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 border print:text-black print:border-black">{m.grade}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 border print:text-black print:border-black">{m.seniority}</td>
                          <td className="px-6 py-4 text-sm font-mono text-gray-500 border print:text-black print:border-black">{m.national_id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Office Modal */}
      {isAddingOffice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900">إضافة نيابة جديدة</h3>
              <button onClick={() => setIsAddingOffice(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleAddOffice} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">اسم النيابة</label>
                <input
                  type="text"
                  required
                  value={newOfficeName}
                  onChange={(e) => setNewOfficeName(e.target.value)}
                  placeholder="مثال: نيابة مرور القاهرة"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  {isLoading ? 'جاري الإضافة...' : 'إضافة النيابة'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingOffice(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
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
          /* Standard print fallback if iframe fails */
          @page { margin: 1.5cm; size: A4; }
          body > *:not(main), aside, header, .print\\:hidden { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; width: 100% !important; }
          .print-content { display: block !important; width: 100% !important; }
          table { width: 100% !important; border-collapse: collapse !important; direction: rtl !important; }
          th, td { border: 1px solid black !important; padding: 10px !important; text-align: center !important; font-size: 18pt !important; }
          th { background-color: #f0f0f0 !important; -webkit-print-color-adjust: exact; }
          h3, h4 { text-align: center !important; font-size: 24pt !important; font-weight: bold !important; }
        }
      `}} />
    </div>
  );
}
