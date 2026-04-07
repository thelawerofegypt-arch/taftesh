import React from 'react';
import { Download, Upload, Database, ShieldAlert, Trash2 } from 'lucide-react';

export default function SystemManagement() {
  const handleExportJSON = async () => {
    try {
      const res = await fetch('/api/cases');
      const cases = await res.json();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cases));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `judicial_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (err) {
      console.error('Export error:', err);
      alert('حدث خطأ أثناء التصدير');
    }
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        // This would require a backend endpoint to handle bulk import
        alert('تم قراءة الملف بنجاح. يرجى التواصل مع الدعم الفني لإتمام عملية الاستيراد البرمجي.');
      } catch (err) {
        console.error('Import error:', err);
        alert('خطأ في تنسيق الملف أو محتواه');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">إدارة قاعدة البيانات</h3>
            <p className="text-slate-500 text-sm">تصدير واستيراد النسخ الاحتياطية للنظام</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl border border-slate-100 bg-slate-50 space-y-4">
            <div className="flex items-center gap-3 text-indigo-600">
              <Download className="w-5 h-5" />
              <h4 className="font-bold">تصدير البيانات</h4>
            </div>
            <p className="text-sm text-slate-600">قم بتحميل نسخة كاملة من بيانات النظام بصيغة JSON لاستخدامها كنسخة احتياطية.</p>
            <button 
              onClick={handleExportJSON}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all"
            >
              بدء التصدير الآن
            </button>
          </div>

          <div className="p-6 rounded-xl border border-slate-100 bg-slate-50 space-y-4">
            <div className="flex items-center gap-3 text-emerald-600">
              <Upload className="w-5 h-5" />
              <h4 className="font-bold">استيراد البيانات</h4>
            </div>
            <p className="text-sm text-slate-600">اختر ملف نسخة احتياطية (JSON) لاستعادة البيانات السابقة في النظام.</p>
            <div className="relative">
              <input 
                type="file" 
                accept=".json"
                onChange={handleImportJSON}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <button className="w-full py-2.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-all">
                اختيار ملف الاستيراد
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-red-50 rounded-2xl border border-red-100 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-red-800">منطقة الخطر</h3>
            <p className="text-red-600/70 text-sm">عمليات حساسة قد تؤدي لفقدان البيانات</p>
          </div>
        </div>

        <div className="p-6 rounded-xl border border-red-200 bg-white space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-800">مسح كافة البيانات</h4>
              <p className="text-sm text-slate-500">سيتم حذف جميع الملفات والواردات من النظام بشكل نهائي.</p>
            </div>
            <button className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-all flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> مسح البيانات
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
