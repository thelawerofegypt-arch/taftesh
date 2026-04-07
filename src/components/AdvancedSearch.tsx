import React, { useState } from 'react';
import { Search, Filter, Calendar, FileText, User, MapPin, ArrowRight, Download, ChevronDown } from 'lucide-react';
import { Case } from '../types';
import { STATUS_TRANSLATIONS, CASE_STATUS_OPTIONS, FINISHED_INSPECTION_RESULTS, FINISHED_INVESTIGATION_RESULTS, FINISHED_TRIAL_RESULTS } from '../constants';
import { getDescriptiveStatus } from '../utils/caseUtils';
import * as XLSX from 'xlsx';

interface AdvancedSearchProps {
  onCaseSelect: (id: number) => void;
}

export default function AdvancedSearch({ onCaseSelect }: AdvancedSearchProps) {
  const [results, setResults] = useState<Case[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filters, setFilters] = useState({
    number: '',
    memberName: '',
    prosecution: '',
    fromDate: '',
    toDate: '',
    statusV2: '',
    statusDetail: ''
  });

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSearching(true);
    try {
      const res = await fetch('/api/cases');
      const allCases: Case[] = await res.json();
      
      const filtered = allCases.filter(c => {
        // Search by number (Incoming, Inspection, Investigation, Trial)
        const matchNumber = !filters.number || 
          c.incoming_number?.includes(filters.number) ||
          c.inspection?.inspection_number?.includes(filters.number) ||
          c.investigation?.investigation_number?.includes(filters.number) ||
          c.trial_number?.includes(filters.number);

        // Search by member name
        const matchMember = !filters.memberName || 
          c.member?.name?.includes(filters.memberName) ||
          c.members?.some(m => m.name.includes(filters.memberName));

        // Search by prosecution
        const matchProsecution = !filters.prosecution || 
          c.prosecution_name?.includes(filters.prosecution) ||
          c.member?.prosecution_office?.includes(filters.prosecution);

        // Search by date range
        const caseDate = new Date(c.incoming_date);
        const matchFromDate = !filters.fromDate || caseDate >= new Date(filters.fromDate);
        const matchToDate = !filters.toDate || caseDate <= new Date(filters.toDate);

        // Search by Status V2
        const matchStatusV2 = !filters.statusV2 || c.case_status_v2 === filters.statusV2;
        const matchStatusDetail = !filters.statusDetail || c.case_status_detail === filters.statusDetail;

        return matchNumber && matchMember && matchProsecution && matchFromDate && matchToDate && matchStatusV2 && matchStatusDetail;
      });

      setResults(filtered);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(results.map(res => ({
      'رقم الوارد': res.incoming_number,
      'تاريخ الوارد': res.incoming_date,
      'الشاكي': res.complainant || 'غير محدد',
      'المشكو في حقه': res.member?.name || 'غير محدد',
      'الدرجة': res.member?.rank || '',
      'النيابة': res.member?.prosecution_office || '',
      'الموضوع': res.subject,
      'حالة الوارد': getDescriptiveStatus(res),
      'رقم الفحص': res.inspection?.inspection_number || '',
      'رقم التحقيق': res.investigation?.investigation_number || '',
      'رقم دعوى التأديب': res.trial_number || '',
      'الحالة (وصف)': getDescriptiveStatus(res)
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
    XLSX.writeFile(workbook, `نتائج_البحث_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="space-y-10">
      <div className="premium-card p-10">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700 mr-1">رقم الوارد / الفحص / التحقيق / التأديب</label>
            <div className="relative group">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input 
                value={filters.number}
                onChange={(e) => setFilters({...filters, number: e.target.value})}
                className="premium-input pr-12" 
                placeholder="ابحث بالرقم..." 
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700 mr-1">اسم العضو</label>
            <div className="relative group">
              <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input 
                value={filters.memberName}
                onChange={(e) => setFilters({...filters, memberName: e.target.value})}
                className="premium-input pr-12" 
                placeholder="اسم المشكو في حقه..." 
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700 mr-1">النيابة</label>
            <div className="relative group">
              <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input 
                value={filters.prosecution}
                onChange={(e) => setFilters({...filters, prosecution: e.target.value})}
                className="premium-input pr-12" 
                placeholder="اسم النيابة..." 
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700 mr-1">من تاريخ</label>
            <input 
              type="date" 
              value={filters.fromDate}
              onChange={(e) => setFilters({...filters, fromDate: e.target.value})}
              className="premium-input" 
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700 mr-1">إلى تاريخ</label>
            <input 
              type="date" 
              value={filters.toDate}
              onChange={(e) => setFilters({...filters, toDate: e.target.value})}
              className="premium-input" 
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700 mr-1">حالة الوارد</label>
            <select 
              value={filters.statusV2}
              onChange={(e) => setFilters({...filters, statusV2: e.target.value, statusDetail: ''})}
              className="premium-input appearance-none"
            >
              <option value="">الكل</option>
              {CASE_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          {['منتهي فحص', 'منهى تحقيق', 'منتهى محاكمة'].includes(filters.statusV2) && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 mr-1">تفاصيل الحالة</label>
              <select 
                value={filters.statusDetail}
                onChange={(e) => setFilters({...filters, statusDetail: e.target.value})}
                className="premium-input appearance-none"
              >
                <option value="">الكل</option>
                {filters.statusV2 === 'منتهي فحص' && FINISHED_INSPECTION_RESULTS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                {filters.statusV2 === 'منهى تحقيق' && FINISHED_INVESTIGATION_RESULTS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                {filters.statusV2 === 'منتهى محاكمة' && FINISHED_TRIAL_RESULTS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          )}

          <div className="md:col-span-3 flex justify-end gap-4 pt-6">
            <button 
              type="button" 
              onClick={() => {
                setFilters({
                  number: '',
                  memberName: '',
                  prosecution: '',
                  fromDate: '',
                  toDate: '',
                  statusV2: '',
                  statusDetail: ''
                });
                setResults([]);
              }}
              className="premium-button-secondary"
            >
              إعادة تعيين
            </button>
            <button type="submit" className="premium-button-primary min-w-[200px]">
              {isSearching ? 'جاري البحث...' : <><Search className="w-5 h-5" /> بحث الآن</>}
            </button>
          </div>
        </form>
      </div>

      {results.length > 0 && (
        <div className="premium-card overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
            <h3 className="font-bold text-xl text-slate-800">نتائج البحث ({results.length})</h3>
            <button 
              onClick={exportToExcel}
              className="flex items-center gap-2 text-sm text-primary font-bold hover:bg-primary/5 px-5 py-2.5 rounded-xl transition-all"
            >
              <Download className="w-4 h-4" /> تصدير النتائج لـ Excel
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>رقم الوارد</th>
                  <th>التاريخ</th>
                  <th>المشكو في حقه</th>
                  <th>الموضوع</th>
                  <th>حالة الوارد</th>
                </tr>
              </thead>
              <tbody>
                {results.map((res) => (
                  <tr key={res.id} className="hover:bg-slate-50/80">
                    <td className="font-bold text-slate-900">{res.incoming_number}</td>
                    <td className="text-slate-600">{res.incoming_date}</td>
                    <td>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">{res.member?.name || 'غير محدد'}</span>
                        <span className="text-xs text-slate-400 mt-0.5">{res.member?.rank}</span>
                      </div>
                    </td>
                    <td className="text-slate-600 max-w-xs truncate">{res.subject}</td>
                    <td>
                      <span className="px-4 py-1.5 bg-primary/5 text-primary rounded-full text-xs font-bold inline-block">
                        {getDescriptiveStatus(res)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
