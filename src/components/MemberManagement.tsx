import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  UserPlus, 
  Trash2, 
  FileSpreadsheet,
  Download,
  X,
  ChevronRight,
  ChevronLeft,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Eye,
  Pencil
} from 'lucide-react';
import { ProsecutionMember, MemberHistoryItem } from '../types';
import * as XLSX from 'xlsx';

const GRADES = [
  'رئيس هيئة',
  'نائب رئيس هيئة',
  'وكيل عام أول',
  'وكيل عام',
  'رئيس نيابة (أ)',
  'رئيس نيابة (ب)',
  'وكيل نيابة من الفئة الممتازة',
  'وكيل نيابة',
  'مساعد نيابة',
  'معاون نيابة'
];

export default function MemberManagement() {
  const [members, setMembers] = useState<ProsecutionMember[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ProsecutionMember | null>(null);
  const [editingMember, setEditingMember] = useState<ProsecutionMember | null>(null);
  const [memberHistory, setMemberHistory] = useState<MemberHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  
  // Import state
  const [importType, setImportType] = useState<'new' | 'update'>('new');
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);

  const [newMember, setNewMember] = useState({
    name: '',
    grade: '',
    seniority: 1,
    governorate: '',
    police_station: '',
    prosecution_office: '',
    national_id: '',
    phone1: '',
    phone2: ''
  });

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/prosecution-members?search=${encodeURIComponent(search)}&page=${page}&limit=50`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMembers(data);
        if (data.length > 0) {
          setTotalCount(data[0].total_count);
        } else {
          setTotalCount(0);
        }
      } else {
        console.error("Expected array from /api/prosecution-members, got:", data);
        setMembers([]);
        setTotalCount(0);
      }
    } catch (error) {
      console.error("Failed to fetch members", error);
    } finally {
      setIsLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMember.national_id.length !== 14) {
      alert("الرقم القومي يجب أن يكون 14 رقماً");
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch('/api/prosecution-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember),
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewMember({
          name: '', grade: '', seniority: 1, governorate: '',
          police_station: '', prosecution_office: '', national_id: '',
          phone1: '', phone2: ''
        });
        fetchMembers();
      } else {
        const err = await res.json();
        alert(err.error || "فشل الحفظ");
      }
    } catch (error) {
      alert("حدث خطأ أثناء الحفظ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (member: ProsecutionMember) => {
    setEditingMember(member);
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    
    if (editingMember.national_id.length !== 14) {
      alert("الرقم القومي يجب أن يكون 14 رقماً");
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch(`/api/prosecution-members/${editingMember.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingMember),
      });
      if (res.ok) {
        setShowEditModal(false);
        setEditingMember(null);
        fetchMembers();
      } else {
        const err = await res.json();
        alert(err.error || "فشل التحديث");
      }
    } catch (error) {
      alert("حدث خطأ أثناء التحديث");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا العضو؟')) return;
    try {
      const res = await fetch(`/api/prosecution-members/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchMembers();
      }
    } catch (error) {
      alert("فشل الحذف");
    }
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>, type: 'new' | 'update') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress(10);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        // Validate headers (Row 0)
        // 1 مسلسل 2 الاسم 3 الدرجة 4 الأقدمية 5 محافظة السكن 6 قسم أو مركز الشرطة 7 النيابة 8 الرقم القومي 9 تليفون 1 10 تليفون 2
        const rows = Array.isArray(data) ? data.slice(1) : []; // Skip header
        const formattedMembers = rows.map(row => ({
          name: row[1],
          grade: row[2],
          seniority: row[3] ? Number(row[3]) : 1,
          governorate: row[4] || '',
          police_station: row[5] || '',
          prosecution_office: row[6],
          national_id: row[7],
          phone1: row[8] || '',
          phone2: row[9] || ''
        })).filter(m => 
          m.name && 
          m.grade && 
          m.national_id && 
          String(m.national_id).length === 14 && 
          m.prosecution_office
        );

        setImportProgress(30);

        const endpoint = type === 'new' ? '/api/prosecution-members/import' : '/api/prosecution-members/update-bulk';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ members: formattedMembers }),
        });

        setImportProgress(100);
        if (res.ok) {
          const result = await res.json();
          setImportResult(result);
          fetchMembers();
        } else {
          alert("فشل الاستيراد");
        }
      } catch (error) {
        alert("خطأ في قراءة الملف");
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const fetchMemberHistory = async (member: ProsecutionMember) => {
    setSelectedMember(member);
    setShowHistoryModal(true);
    setIsHistoryLoading(true);
    try {
      const res = await fetch(`/api/prosecution-members/${member.id}/full-history`);
      if (res.ok) {
        const data = await res.json();
        setMemberHistory(data);
      }
    } catch (error) {
      console.error("Failed to fetch member history", error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = [['مسلسل', 'الاسم', 'الدرجة', 'الأقدمية', 'محافظة السكن', 'قسم أو مركز الشرطة', 'النيابة', 'الرقم القومي', 'تليفون 1', 'تليفون 2']];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Members");
    XLSX.writeFile(wb, "members_template.xlsx");
  };

  const exportToExcel = () => {
    const data = members.map((m, idx) => [
      idx + 1 + (page - 1) * 50,
      m.name,
      m.grade,
      m.seniority,
      m.governorate,
      m.police_station,
      m.prosecution_office,
      m.national_id,
      m.phone1,
      m.phone2
    ]);
    const headers = [['مسلسل', 'الاسم', 'الدرجة', 'الأقدمية', 'محافظة السكن', 'قسم أو مركز الشرطة', 'النيابة', 'الرقم القومي', 'تليفون 1', 'تليفون 2']];
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Members");
    XLSX.writeFile(wb, `prosecution_members_export_${new Date().getTime()}.xlsx`);
  };

  const totalPages = Math.ceil(totalCount / 50);

  return (
    <div className="space-y-10">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="relative w-full md:w-[450px] group">
          <Search className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within:text-primary transition-colors" />
          <input 
            type="text"
            className="premium-input pr-14 py-4 text-base"
            placeholder="بحث بالاسم، الرقم القومي، الدرجة، أو النيابة..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={() => setShowImportModal(true)}
            className="premium-button-secondary border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            <FileSpreadsheet className="w-5 h-5" /> مركز الاستيراد
          </button>
          <button 
            onClick={exportToExcel}
            className="premium-button-secondary border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            <Download className="w-5 h-5" /> تصدير Excel
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="premium-button-primary"
          >
            <UserPlus className="w-5 h-5" /> إضافة عضو جديد
          </button>
        </div>
      </div>

      {/* Members Table */}
      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="premium-table">
            <thead>
              <tr>
                <th>م</th>
                <th>الاسم</th>
                <th>الدرجة</th>
                <th>الأقدمية</th>
                <th>النيابة</th>
                <th>الرقم القومي</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-24 text-center">
                    <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4 shadow-2xl shadow-primary/20" />
                    <p className="text-slate-500 font-bold">جاري استرجاع بيانات الأعضاء...</p>
                  </td>
                </tr>
              ) : members.map((member, idx) => (
                <tr key={member.id} className="hover:bg-slate-50/80 group">
                  <td className="text-slate-400 font-mono">{(page - 1) * 50 + idx + 1}</td>
                  <td>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold text-sm shadow-inner group-hover:scale-110 transition-transform">
                        {member.name.charAt(0)}
                      </div>
                      <span className="font-bold text-slate-900 group-hover:text-primary transition-colors">{member.name}</span>
                    </div>
                  </td>
                  <td className="text-slate-600 font-medium">{member.grade}</td>
                  <td className="text-slate-600 font-bold">{member.seniority}</td>
                  <td className="text-slate-600 font-medium">{member.prosecution_office}</td>
                  <td className="text-slate-500 font-mono tracking-wider">{member.national_id}</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleEditClick(member)}
                        className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-90"
                        title="تعديل البيانات"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => fetchMemberHistory(member)}
                        className="p-2.5 text-primary hover:bg-primary/5 rounded-xl transition-all active:scale-90"
                        title="استعراض التاريخ المهني"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(member.id)}
                        className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all active:scale-90"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && members.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-24 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                      <Search className="w-10 h-10 text-slate-200" />
                    </div>
                    <p className="text-slate-500 font-bold text-lg">لا توجد نتائج مطابقة للبحث</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-8 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
            <p className="text-sm text-slate-500 font-medium">عرض <span className="text-slate-900 font-bold">{(page - 1) * 50 + 1}</span> إلى <span className="text-slate-900 font-bold">{Math.min(page * 50, totalCount)}</span> من إجمالي <span className="text-slate-900 font-bold">{totalCount}</span> عضو</p>
            <div className="flex items-center gap-3">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = page;
                  if (page <= 3) pageNum = i + 1;
                  else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = page - 2 + i;
                  
                  if (pageNum <= 0 || pageNum > totalPages) return null;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-12 h-12 rounded-xl font-bold text-sm transition-all active:scale-90 ${
                        page === pageNum ? 'bg-primary text-white shadow-xl shadow-primary/30' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button 
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h3 className="text-xl font-bold">إضافة عضو نيابة جديد</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleAdd} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">الاسم بالكامل (لا يمكن تعديله لاحقاً)</label>
                <input 
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">الدرجة القضائية</label>
                <select 
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newMember.grade}
                  onChange={(e) => setNewMember({ ...newMember, grade: e.target.value })}
                >
                  <option value="">اختر الدرجة...</option>
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">الأقدمية</label>
                <input 
                  type="number"
                  min="1"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newMember.seniority}
                  onChange={(e) => setNewMember({ ...newMember, seniority: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">الرقم القومي (14 رقم)</label>
                <input 
                  required
                  maxLength={14}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  value={newMember.national_id}
                  onChange={(e) => setNewMember({ ...newMember, national_id: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">النيابة</label>
                <input 
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newMember.prosecution_office}
                  onChange={(e) => setNewMember({ ...newMember, prosecution_office: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">المحافظة</label>
                <input 
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newMember.governorate}
                  onChange={(e) => setNewMember({ ...newMember, governorate: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">قسم/مركز الشرطة</label>
                <input 
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newMember.police_station}
                  onChange={(e) => setNewMember({ ...newMember, police_station: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">تليفون 1</label>
                <input 
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newMember.phone1}
                  onChange={(e) => setNewMember({ ...newMember, phone1: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">تليفون 2</label>
                <input 
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newMember.phone2}
                  onChange={(e) => setNewMember({ ...newMember, phone2: e.target.value })}
                />
              </div>
              <div className="md:col-span-2 pt-4">
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  {isLoading ? 'جاري الحفظ...' : 'حفظ بيانات العضو'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h3 className="text-xl font-bold">تعديل بيانات عضو النيابة</h3>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleUpdate} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">الاسم بالكامل (لا يمكن تعديله)</label>
                <input 
                  disabled
                  className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl outline-none text-gray-500 cursor-not-allowed"
                  value={editingMember.name}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">الدرجة القضائية</label>
                <select 
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  value={editingMember.grade}
                  onChange={(e) => setEditingMember({ ...editingMember, grade: e.target.value })}
                >
                  <option value="">اختر الدرجة...</option>
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">الأقدمية</label>
                <input 
                  type="number"
                  min="1"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  value={editingMember.seniority}
                  onChange={(e) => setEditingMember({ ...editingMember, seniority: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">الرقم القومي (14 رقم)</label>
                <input 
                  required
                  maxLength={14}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  value={editingMember.national_id}
                  onChange={(e) => setEditingMember({ ...editingMember, national_id: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">النيابة</label>
                <input 
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  value={editingMember.prosecution_office}
                  onChange={(e) => setEditingMember({ ...editingMember, prosecution_office: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">المحافظة</label>
                <input 
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  value={editingMember.governorate}
                  onChange={(e) => setEditingMember({ ...editingMember, governorate: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">قسم/مركز الشرطة</label>
                <input 
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  value={editingMember.police_station}
                  onChange={(e) => setEditingMember({ ...editingMember, police_station: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">تليفون 1</label>
                <input 
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  value={editingMember.phone1}
                  onChange={(e) => setEditingMember({ ...editingMember, phone1: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">تليفون 2</label>
                <input 
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  value={editingMember.phone2}
                  onChange={(e) => setEditingMember({ ...editingMember, phone2: e.target.value })}
                />
              </div>
              <div className="md:col-span-2 pt-4">
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {isLoading ? 'جاري التحديث...' : 'تحديث بيانات العضو'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-xl">
                  {selectedMember.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedMember.name}</h3>
                  <p className="text-sm text-gray-500">{selectedMember.grade} - {selectedMember.prosecution_office}</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowHistoryModal(false); setMemberHistory([]); }} 
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8">
              {isHistoryLoading ? (
                <div className="py-20 text-center">
                  <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
                  <p className="mt-4 text-gray-500 font-bold">جاري تحميل السجل التاريخي...</p>
                </div>
              ) : memberHistory.length === 0 ? (
                <div className="py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-bold text-lg">لا يوجد سجل تاريخي مسجل لهذا العضو</p>
                  <p className="text-gray-400 text-sm mt-1">لم يتم العثور على شكاوى أو فحوص أو تحقيقات مرتبطة</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    {memberHistory.map((item, idx) => (
                      <div key={idx} className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden group">
                        <div className="flex flex-col md:flex-row">
                          {/* Left Side: Case Info */}
                          <div className="p-6 md:w-1/3 bg-gray-50/50 border-b md:border-b-0 md:border-l border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
                                وارد رقم {item.incoming_number}
                              </span>
                              <span className="text-xs text-gray-400 font-mono">{item.incoming_date}</span>
                            </div>
                            <h4 className="font-bold text-gray-900 mb-2 leading-relaxed">{item.subject}</h4>
                            <div className="flex flex-wrap gap-2 mt-4">
                              <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                                item.status === 'finished' ? 'bg-emerald-100 text-emerald-700' :
                                item.status === 'closed' ? 'bg-gray-100 text-gray-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                الحالة: {
                                  item.status === 'draft' ? 'مسودة' :
                                  item.status === 'inspection' ? 'قيد الفحص' :
                                  item.status === 'investigation' ? 'قيد التحقيق' :
                                  item.status === 'council' ? 'مجلس تأديب' :
                                  item.status === 'finished' ? 'منتهية' :
                                  item.status === 'closed' ? 'مغلقة' : item.status
                                }
                              </span>
                              {item.decision && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold">
                                  القرار: {item.decision}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right Side: Stages Details */}
                          <div className="p-6 flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Inspection Info */}
                            {item.inspection_number && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-indigo-600">
                                  <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                                  <span className="text-xs font-bold uppercase tracking-wider">الفحص</span>
                                </div>
                                <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                                  <p className="text-xs font-bold text-indigo-900">رقم الفحص: {item.inspection_number} / {item.inspection_year}</p>
                                  <p className="text-[11px] text-indigo-700 mt-1">النتيجة: {item.inspection_result || 'قيد الانتظار'}</p>
                                </div>
                              </div>
                            )}

                            {/* Investigation Info */}
                            {item.investigation_number && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-amber-600">
                                  <div className="w-2 h-2 bg-amber-600 rounded-full" />
                                  <span className="text-xs font-bold uppercase tracking-wider">التحقيق</span>
                                </div>
                                <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                                  <p className="text-xs font-bold text-amber-900">رقم التحقيق: {item.investigation_number} / {item.investigation_year}</p>
                                  <p className="text-[11px] text-amber-700 mt-1">النتيجة: {item.investigation_result || 'قيد الانتظار'}</p>
                                </div>
                              </div>
                            )}

                            {/* Disciplinary Council Info */}
                            {item.council_type && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-red-600">
                                  <div className="w-2 h-2 bg-red-600 rounded-full" />
                                  <span className="text-xs font-bold uppercase tracking-wider">مجلس التأديب</span>
                                </div>
                                <div className="bg-red-50/50 p-3 rounded-xl border border-red-100">
                                  <p className="text-xs font-bold text-red-900">الهيئة: {item.council_type === 'normal' ? 'عادية' : 'صلاحية'}</p>
                                  <p className="text-[11px] text-red-700 mt-1">النتيجة: {item.council_result || 'قيد الانتظار'}</p>
                                </div>
                              </div>
                            )}

                            {/* If no stages yet */}
                            {!item.inspection_number && !item.investigation_number && !item.council_type && (
                              <div className="col-span-full flex items-center justify-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                <p className="text-xs text-gray-400 italic">لا توجد تفاصيل إضافية للمراحل (قيد الإجراءات الأولية)</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button 
                onClick={() => { setShowHistoryModal(false); setMemberHistory([]); }}
                className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600" /> مركز استيراد البيانات (Import Center)
              </h3>
              <button onClick={() => { setShowImportModal(false); setImportResult(null); setImportProgress(0); }} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Part 1: Import New */}
                <div className="p-6 border-2 border-dashed border-emerald-100 bg-emerald-50/30 rounded-3xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                      <Plus className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-emerald-900">استيراد أعضاء جدد</h4>
                      <p className="text-xs text-emerald-600">إضافة بيانات جديدة لقاعدة البيانات</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="block">
                      <span className="sr-only">Choose file</span>
                      <input 
                        type="file" 
                        accept=".xlsx, .xls"
                        onChange={(e) => handleExcelImport(e, 'new')}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                      />
                    </label>
                    <button 
                      onClick={downloadTemplate}
                      className="w-full flex items-center justify-center gap-2 py-2 text-sm font-bold text-emerald-700 bg-white border border-emerald-200 rounded-xl hover:bg-emerald-50 transition-all"
                    >
                      <Download className="w-4 h-4" /> تحميل النموذج القياسي
                    </button>
                  </div>
                </div>

                {/* Part 2: Update Existing */}
                <div className="p-6 border-2 border-dashed border-blue-100 bg-blue-50/30 rounded-3xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                      <RefreshCw className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-blue-900">تحديث بيانات الأعضاء</h4>
                      <p className="text-xs text-blue-600">تحديث الدرجات والنيابات بالرقم القومي</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="block">
                      <span className="sr-only">Choose file</span>
                      <input 
                        type="file" 
                        accept=".xlsx, .xls"
                        onChange={(e) => handleExcelImport(e, 'update')}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                      />
                    </label>
                    <p className="text-[10px] text-blue-500 text-center italic">يتم التحديث بناءً على الرقم القومي فقط</p>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              {isImporting && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-bold">
                    <span>جاري معالجة البيانات...</span>
                    <span>{importProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full transition-all duration-300" 
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Result Report */}
              {importResult && (
                <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                  <h4 className="font-bold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" /> تقرير العملية
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 text-center">
                      <p className="text-xs text-gray-400">إجمالي السجلات</p>
                      <p className="text-xl font-bold text-gray-900">{importResult.total}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-emerald-100 text-center">
                      <p className="text-xs text-emerald-500">{importResult.inserted !== undefined ? 'تمت الإضافة' : 'تم التحديث'}</p>
                      <p className="text-xl font-bold text-emerald-600">{importResult.inserted ?? importResult.updated}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-amber-100 text-center">
                      <p className="text-xs text-amber-500">{importResult.skipped !== undefined ? 'مكرر (تم التجاهل)' : 'غير موجود'}</p>
                      <p className="text-xl font-bold text-amber-600">{importResult.skipped ?? importResult.notFound}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-red-100 text-center">
                      <p className="text-xs text-red-500">أخطاء</p>
                      <p className="text-xl font-bold text-red-600">{importResult.errors}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                <div className="text-xs text-amber-800 space-y-1">
                  <p className="font-bold">تنبيهات هامة للاستيراد:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>يجب أن يكون الرقم القومي 14 رقماً صحيحاً.</li>
                    <li>يجب أن تلتزم بمسميات الدرجات القضائية المعتمدة في النظام.</li>
                    <li>ترتيب الأعمدة في ملف Excel يجب أن يطابق النموذج القياسي تماماً.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
