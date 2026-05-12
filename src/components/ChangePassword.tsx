import React, { useState } from 'react';
import { apiFetch } from '../lib/api';
import { Key, Lock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function ChangePassword() {
  const [formData, setFormData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (formData.new_password !== formData.confirm_password) {
      setMessage({ type: 'error', text: 'كلمات المرور الجديدة غير متطابقة' });
      return;
    }

    if (formData.new_password.length < 4) {
      setMessage({ type: 'error', text: 'يجب أن تكون كلمة المرور 4 أحرف على الأقل' });
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          old_password: formData.old_password,
          new_password: formData.new_password
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'فشل تغيير كلمة المرور');
      }

      setMessage({ type: 'success', text: 'تم تغيير كلمة المرور بنجاح' });
      setFormData({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
            <Key className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">تغيير كلمة المرور</h2>
            <p className="text-slate-500 font-medium">قم بتأمين حسابك بتغيير كلمة المرور بشكل دوري</p>
          </div>
        </div>

        {message.text && (
          <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 font-bold animate-in zoom-in-95 duration-200 ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5 text-rose-500" />}
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700 pr-2">كلمة المرور الحالية</label>
            <div className="relative group">
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-rose-500 transition-colors">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                required
                value={formData.old_password}
                onChange={(e) => setFormData({ ...formData, old_password: e.target.value })}
                className="w-full pr-12 pl-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all font-bold text-slate-700"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-50">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 pr-2">كلمة المرور الجديدة</label>
              <input
                type="password"
                required
                value={formData.new_password}
                onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all font-bold text-slate-700"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 pr-2">تأكيد كلمة المرور الجديدة</label>
              <input
                type="password"
                required
                value={formData.confirm_password}
                onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all font-bold text-slate-700"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
          >
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'تحديث كلمة المرور'}
          </button>
        </form>
      </div>
    </div>
  );
}
