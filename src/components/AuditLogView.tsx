import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { History, User, Database, Clock, Search } from 'lucide-react';

export default function AuditLogView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiFetch('/api/cases') // We need a general audit API, but for now we can fetch all cases and then their logs, or better, add a general audit endpoint
    apiFetch('/api/audit/all')
      .then(res => res.json())
      .then(data => setLogs(Array.isArray(data) ? data : []));
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg">سجل العمليات العام</h3>
            <p className="text-sm text-gray-500">مراقبة جميع التحركات والتغييرات في النظام</p>
          </div>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            placeholder="بحث في السجلات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {logs.map((log, idx) => (
            <div key={idx} className="p-6 hover:bg-gray-50 transition-colors flex items-start gap-6">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{log.user_name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      log.action === 'CREATE' ? 'bg-green-100 text-green-600' : 
                      log.action === 'UPDATE' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {log.action}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    {new Date(log.timestamp).toLocaleString('ar-EG')}
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  قام بتعديل في جدول <span className="font-medium text-gray-900">{log.table_name}</span> (معرف السجل: {log.record_id})
                </p>
                {log.new_values && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg text-[10px] font-mono text-gray-500 overflow-x-auto max-h-24">
                    {log.new_values}
                  </div>
                )}
              </div>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="p-12 text-center text-gray-400">لا توجد سجلات حالياً</div>
          )}
        </div>
      </div>
    </div>
  );
}
