import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight,
  TrendingUp,
  Users,
  Search,
  Download,
  Calendar,
  Activity,
  ShieldCheck
} from 'lucide-react';
import { Case } from '../types';
import { STATUS_TRANSLATIONS, STAGE_TRANSLATIONS } from '../constants';
import { getDescriptiveStatus } from '../utils/caseUtils';
import * as XLSX from 'xlsx';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell
} from 'recharts';

interface DashboardProps {
  onCaseSelect: (id: number) => void;
}

export default function Dashboard({ onCaseSelect }: DashboardProps) {
  const [allCases, setAllCases] = useState<Case[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    underInspection: 0,
    underInvestigation: 0,
    closed: 0
  });
  const [recentCases, setRecentCases] = useState<Case[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/cases')
      .then(res => res.json())
      .then(data => {
        setAllCases(data);
        setRecentCases(data.slice(0, 5));
        
        const underInspection = data.filter((c: Case) => c.current_stage === 'inspection' && c.status !== 'closed').length;
        const underInvestigation = data.filter((c: Case) => c.current_stage === 'investigation' && c.status !== 'closed').length;
        const closed = data.filter((c: Case) => c.status === 'closed').length;

        setStats({
          total: data.length,
          underInspection,
          underInvestigation,
          closed,
        });

        // Prepare chart data
        setChartData([
          { name: 'قيد الفحص', value: underInspection, color: '#6366f1' },
          { name: 'قيد التحقيق', value: underInvestigation, color: '#f59e0b' },
          { name: 'ملفات مغلقة', value: closed, color: '#10b981' },
        ]);
      });
  }, []);

  const exportAll = () => {
    const worksheet = XLSX.utils.json_to_sheet(allCases.map(res => ({
      'رقم الوارد': res.incoming_number,
      'تاريخ الوارد': res.incoming_date,
      'الشاكي': res.complainant || 'غير محدد',
      'المشكو في حقه': res.member_name || 'غير محدد',
      'الموضوع': res.subject,
      'حالة الوارد': getDescriptiveStatus(res),
      'رقم الفحص': res.inspection?.inspection_number || '',
      'رقم التحقيق': res.investigation?.investigation_number || '',
      'رقم دعوى التأديب': res.trial_number || '',
      'الحالة (وصف)': getDescriptiveStatus(res),
      'المرحلة الحالية': STAGE_TRANSLATIONS[res.current_stage] || res.current_stage
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "AllCases");
    XLSX.writeFile(workbook, `جميع_الملفات_${new Date().getTime()}.xlsx`);
  };

  const statCards = [
    { label: 'إجمالي الملفات', value: stats.total, icon: FileText, color: 'bg-slate-900', trend: '+12%' },
    { label: 'قيد الفحص', value: stats.underInspection, icon: Search, color: 'bg-indigo-600', trend: '+5%' },
    { label: 'قيد التحقيق', value: stats.underInvestigation, icon: Clock, color: 'bg-amber-500', trend: '-2%' },
    { label: 'ملفات مغلقة', value: stats.closed, icon: CheckCircle2, color: 'bg-emerald-500', trend: '+8%' },
  ];

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="premium-gradient rounded-[3rem] p-16 text-white shadow-2xl relative overflow-hidden group">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/10 mb-8">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-50">نظام التفتيش القضائي الموحد</span>
            </div>
            <h3 className="text-6xl font-display font-bold mb-6 tracking-tight leading-[1.1]">
              إدارة ذكية <br />
              <span className="text-emerald-400">للمنظومة القضائية</span>
            </h3>
            <p className="text-slate-300 text-xl leading-relaxed mb-12 font-light max-w-md">
              منصة متكاملة لمتابعة دورة عمل التفتيش والتحقيق بدقة متناهية وتقارير لحظية تدعم اتخاذ القرار.
            </p>
            <div className="flex flex-wrap gap-6">
              <button className="bg-white text-slate-900 px-12 py-5 rounded-2xl font-bold text-lg hover:bg-emerald-50 transition-all active:scale-95 shadow-2xl shadow-black/20">
                ابدأ وارد جديد
              </button>
              <button 
                onClick={exportAll}
                className="bg-white/5 text-white border border-white/10 px-12 py-5 rounded-2xl font-bold text-lg hover:bg-white/10 transition-all active:scale-95 flex items-center justify-center gap-3 backdrop-blur-md"
              >
                <Download className="w-6 h-6" /> تصدير التقارير
              </button>
            </div>
          </div>
          <div className="hidden lg:block relative">
            <div className="absolute inset-0 bg-emerald-500/20 blur-[120px] rounded-full" />
            <div className="relative glass-morphism p-10 rounded-[2.5rem] border-white/10 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h4 className="font-bold text-lg">توزيع الحالات</h4>
                <Activity className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="rgba(255,255,255,0.4)" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      dy={10}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}
                      itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full -mr-64 -mt-64 blur-[120px]" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {statCards.map((stat, i) => (
          <div key={i} className="premium-card p-10 group relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div className={`${stat.color} w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                <stat.icon className="w-7 h-7" />
              </div>
              <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${stat.trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {stat.trend}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold tracking-widest uppercase mb-1">{stat.label}</p>
              <p className="text-4xl font-bold text-slate-900 tracking-tight">{stat.value}</p>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-slate-50 rounded-full group-hover:scale-150 transition-transform duration-700 opacity-50" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between px-4">
            <h3 className="text-2xl font-display font-bold text-slate-900 flex items-center gap-4">
              <Activity className="w-7 h-7 text-primary" /> آخر التحديثات
            </h3>
            <button className="text-sm font-bold text-primary hover:underline underline-offset-8">عرض الكل</button>
          </div>
          <div className="premium-card overflow-hidden">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>رقم الوارد</th>
                  <th>الموضوع</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentCases.map((c) => (
                  <tr key={c.id} onClick={() => onCaseSelect(c.id)} className="hover:bg-slate-50/50 cursor-pointer group transition-colors">
                    <td className="font-bold text-slate-900">#{c.incoming_number}</td>
                    <td className="max-w-xs truncate text-slate-600">{c.subject}</td>
                    <td>
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold ${
                        c.status === 'closed' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                      }`}>
                        {getDescriptiveStatus(c)}
                      </span>
                    </td>
                    <td className="text-slate-400 text-xs font-medium">{c.incoming_date}</td>
                  </tr>
                ))}
                {recentCases.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-20 text-center text-slate-400 font-medium">لا توجد بيانات متاحة حالياً</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts & Notifications */}
        <div className="space-y-8">
          <h3 className="text-2xl font-display font-bold text-slate-900 px-4 flex items-center gap-4">
            <AlertCircle className="w-7 h-7 text-rose-500" /> تنبيهات النظام
          </h3>
          <div className="premium-card p-10 space-y-8">
            <div className="flex gap-6 group">
              <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-rose-500 group-hover:text-white transition-all duration-300">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 mb-2">تجاوز المدة القانونية</p>
                <p className="text-xs text-slate-400 leading-relaxed">هناك 3 ملفات تجاوزت المدة القانونية للفحص (أكثر من 15 يوم).</p>
              </div>
            </div>
            <div className="h-px bg-slate-100" />
            <div className="flex gap-6 group">
              <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 mb-2">جلسة قادمة</p>
                <p className="text-xs text-slate-400 leading-relaxed">موعد جلسة مجلس التأديب القادمة يوم الثلاثاء 24 فبراير.</p>
              </div>
            </div>
            <div className="h-px bg-slate-100" />
            <div className="flex gap-6 group">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 mb-2">تحديث النظام</p>
                <p className="text-xs text-slate-400 leading-relaxed">سيتم إجراء صيانة دورية للنظام يوم الجمعة القادم الساعة 12 صباحاً.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
