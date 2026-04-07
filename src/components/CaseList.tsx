import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Filter,
  Edit3
} from 'lucide-react';
import { Case } from '../types';
import { STATUS_TRANSLATIONS } from '../constants';
import { getDescriptiveStatus } from '../utils/caseUtils';

interface CaseListProps {
  status: 'draft' | 'finished' | 'old';
  title: string;
  onCaseSelect: (id: number) => void;
}

export default function CaseList({ status, title, onCaseSelect }: CaseListProps) {
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/cases')
      .then(res => res.json())
      .then(data => {
        if (status === 'old') {
          // Old Incomings: show all saved cases
          setCases(data);
        } else if (status === 'finished') {
          // Finished: everything that is processed (not draft) and not archived
          setCases(data.filter((c: Case) => c.status !== 'draft' && c.status !== 'closed'));
        } else {
          // Ongoing: only drafts
          setCases(data.filter((c: Case) => c.status === 'draft'));
        }
        setIsLoading(false);
      });
  }, [status]);

  const filteredCases = cases.filter(c => 
    c.incoming_number.includes(searchTerm) || 
    (c.title && c.title.includes(searchTerm)) ||
    c.subject.includes(searchTerm)
  );

  return (
    <div className="space-y-10">
      <div className="premium-card p-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h3 className="text-3xl font-display font-bold text-slate-900 tracking-tight">{title}</h3>
          <p className="text-slate-400 mt-2 font-medium">إجمالي {cases.length} ملف تم العثور عليها</p>
        </div>
        <div className="relative flex-1 max-w-xl group">
          <Search className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within:text-primary transition-colors" />
          <input 
            type="text"
            placeholder="بحث برقم الوارد أو العنوان..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="premium-input pr-14 py-4 text-base"
          />
        </div>
      </div>

      <div className="premium-card overflow-hidden">
        {isLoading ? (
          <div className="p-24 text-center">
            <div className="animate-spin w-12 h-12 border-[5px] border-primary border-t-transparent rounded-full mx-auto mb-6 shadow-2xl shadow-primary/20"></div>
            <p className="text-slate-500 font-semibold tracking-wide">جاري استرجاع البيانات من السجلات...</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filteredCases.map((c) => (
              <div 
                key={c.id} 
                onClick={() => onCaseSelect(c.id)}
                className="p-8 hover:bg-slate-50/80 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-8">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg ${
                    status === 'finished' ? 'bg-emerald-50 text-emerald-600 shadow-emerald-500/10 group-hover:bg-emerald-100' : 
                    status === 'old' ? 'bg-primary/5 text-primary shadow-primary/10 group-hover:bg-primary/10' :
                    'bg-amber-50 text-amber-600 shadow-amber-500/10 group-hover:bg-amber-100'
                  }`}>
                    {status === 'finished' ? <CheckCircle2 className="w-8 h-8" /> : 
                     status === 'old' ? <FileText className="w-8 h-8" /> :
                     <Clock className="w-8 h-8" />}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-xl tracking-tight group-hover:text-primary transition-colors">
                      {c.title || `وارد رقم ${c.incoming_number}`}
                    </p>
                    <div className="flex items-center gap-6 mt-2">
                      <span className="text-sm text-slate-400 flex items-center gap-2 font-medium">
                        <FileText className="w-4 h-4" /> رقم الوارد: <span className="text-slate-600 font-bold">{c.incoming_number}</span>
                      </span>
                      <span className="text-sm text-slate-400 font-medium">تاريخ الوارد: <span className="text-slate-600 font-bold">{c.incoming_date}</span></span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right flex flex-col items-end gap-3">
                    <span className={`text-xs font-bold px-5 py-2 rounded-full shadow-sm ${
                      status === 'finished' ? 'bg-emerald-100 text-emerald-700' : 
                      status === 'old' ? 'bg-primary/10 text-primary' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {getDescriptiveStatus(c)}
                    </span>
                    {(status === 'old' || status !== 'finished') && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onCaseSelect(c.id);
                        }}
                        className="flex items-center gap-2 text-xs font-bold text-primary hover:text-white hover:bg-primary bg-primary/5 px-4 py-2 rounded-xl transition-all active:scale-95"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> {status === 'old' ? 'تعديل' : 'استكمال البيانات'}
                      </button>
                    )}
                  </div>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-300 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-500 border border-transparent group-hover:border-primary/20">
                    <ArrowUpRight className="w-6 h-6" />
                  </div>
                </div>
              </div>
            ))}
            {filteredCases.length === 0 && (
              <div className="p-32 text-center">
                <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-slate-100 shadow-inner">
                  <Search className="w-12 h-12 text-slate-200" />
                </div>
                <p className="text-slate-500 font-bold text-xl tracking-tight">لم يتم العثور على أي نتائج مطابقة</p>
                <p className="text-slate-400 mt-2">جرب البحث بكلمات مفتاحية أخرى</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
