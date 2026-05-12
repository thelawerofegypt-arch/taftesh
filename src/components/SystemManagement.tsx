import React, { useRef } from 'react';
import { apiFetch } from '../lib/api';
import { Download, Upload, Database, ShieldAlert, Trash2, FileSpreadsheet, FileJson } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function SystemManagement() {
  const excelInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const handleExportJSON = async () => {
    try {
      const res = await apiFetch('/api/system/export-db');
      const data = await res.json();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
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

  const handleExportExcel = async () => {
    try {
      const res = await apiFetch('/api/system/export-db');
      const data = await res.json();
      
      const wb = XLSX.utils.book_new();
      
      Object.keys(data).forEach(tableName => {
        const rows = data[tableName];
        if (Array.isArray(rows) && rows.length > 0) {
          const ws = XLSX.utils.json_to_sheet(rows);
          XLSX.utils.book_append_sheet(wb, ws, tableName.substring(0, 31)); // Excel limit for sheet names
        }
      });
      
      XLSX.writeFile(wb, `judicial_backup_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error('Excel Export error:', err);
      alert('حدث خطأ أثناء تصدير Excel');
    }
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!window.confirm('سيتم استبدال كافة البيانات الحالية بالبيانات الموجودة في الملف. هل أنت متأكد؟')) {
          return;
        }
        const res = await apiFetch('/api/system/import-db', {
          method: 'POST',
          body: JSON.stringify(data)
        });
        if (res.ok) {
          alert('تم استيراد البيانات بنجاح');
          window.location.reload();
        } else {
          alert('فشل استيراد البيانات');
        }
      } catch (err) {
        console.error('Import error:', err);
        alert('خطأ في تنسيق الملف أو محتواه');
      }
    };
    reader.readAsText(file);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const bstr = event.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const importData: any = {};
        
        wb.SheetNames.forEach(sheetName => {
          const ws = wb.Sheets[sheetName];
          importData[sheetName] = XLSX.utils.sheet_to_json(ws);
        });

        if (!window.confirm('سيتم استبدال كافة البيانات الحالية بالبيانات الموجودة في ملف Excel. هل أنت متأكد؟')) {
          return;
        }

        const res = await apiFetch('/api/system/import-db', {
          method: 'POST',
          body: JSON.stringify(importData)
        });

        if (res.ok) {
          alert('تم استيراد البيانات من Excel بنجاح');
          window.location.reload();
        } else {
          const errData = await res.json();
          alert(`فشل استيراد البيانات: ${errData.error}`);
        }
      } catch (err) {
        console.error('Excel Import error:', err);
        alert('خطأ في معالجة ملف Excel');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleClearData = async () => {
    if (!window.confirm('هل أنت متأكد من مسح كافة البيانات؟ سيتم حذف جميع القضايا، الفحوص، أعضاء النيابة، والمكاتب. لا يمكن التراجع عن هذه العملية.')) {
      return;
    }

    try {
      const res = await apiFetch('/api/system/clear-data', { method: 'POST' });
      if (res.ok) {
        alert('تم مسح كافة البيانات بنجاح');
        window.location.reload();
      } else {
        const data = await res.json();
        alert(`خطأ: ${data.error}`);
      }
    } catch (err) {
      console.error('Clear data error:', err);
      alert('حدث خطأ أثناء مسح البيانات');
    }
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* JSON Backup */}
          <div className="space-y-4">
            <h4 className="font-bold text-slate-700 border-b pb-2 flex items-center gap-2">
              <FileJson className="w-5 h-5 text-indigo-500" /> النسخ الاحتياطي (JSON)
            </h4>
            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={handleExportJSON}
                className="flex items-center justify-center gap-2 py-3 bg-white border-2 border-indigo-100 text-indigo-700 rounded-xl font-bold hover:bg-indigo-50 transition-all shadow-sm"
              >
                <Download className="w-5 h-5" /> تصدير JSON
              </button>
              <div className="relative">
                <input 
                  type="file" 
                  accept=".json"
                  ref={jsonInputRef}
                  onChange={handleImportJSON}
                  className="hidden"
                />
                <button 
                  onClick={() => jsonInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm"
                >
                  <Upload className="w-5 h-5" /> استيراد JSON
                </button>
              </div>
            </div>
          </div>

          {/* Excel Management */}
          <div className="space-y-4">
            <h4 className="font-bold text-slate-700 border-b pb-2 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-500" /> إدارة البيانات (Excel)
            </h4>
            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={handleExportExcel}
                className="flex items-center justify-center gap-2 py-3 bg-emerald-50 border-2 border-emerald-100 text-emerald-700 rounded-xl font-bold hover:bg-emerald-100 transition-all shadow-sm"
              >
                <Download className="w-5 h-5" /> تصدير Excel
              </button>
              <div className="relative">
                <input 
                  type="file" 
                  accept=".xlsx, .xls"
                  ref={excelInputRef}
                  onChange={handleImportExcel}
                  className="hidden"
                />
                <button 
                  onClick={() => excelInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md"
                >
                  <Upload className="w-5 h-5" /> استيراد من Excel
                </button>
              </div>
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

        <div className="p-6 rounded-xl border border-red-200 bg-white space-y-4 shadow-sm">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-slate-800">مسح كافة البيانات</h4>
              <p className="text-sm text-slate-500">سيتم حذف جميع السجلات من النظام بشكل نهائي. تأكد من وجود نسخة احتياطية.</p>
            </div>
            <button 
              onClick={handleClearData}
              className="w-full md:w-auto px-8 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Trash2 className="w-5 h-5" /> مسح قاعدة البيانات
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
