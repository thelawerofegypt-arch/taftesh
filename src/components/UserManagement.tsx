import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { UserPlus, Users, Shield, Key, Trash2, Edit2, Check, X, AlertCircle } from 'lucide-react';

interface SystemUser {
  id: number;
  login_name: string;
  username: string;
  role: string;
  created_at: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    login_name: '',
    username: '',
    password: '',
    role: 'searcher'
  });

  const roles = [
    { value: 'developer', label: 'مطور نظام' },
    { value: 'admin', label: 'مدير نظام' },
    { value: 'editor', label: 'محرر بيانات' },
    { value: 'data_collector', label: 'جامع بيانات' },
    { value: 'searcher', label: 'باحث' }
  ];

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError('فشل في تحميل قائمة المستخدمين');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      setShowAddForm(false);
      setFormData({ login_name: '', username: '', password: '', role: 'searcher' });
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const res = await apiFetch(`/api/users/${editingUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          username: formData.username,
          role: formData.role,
          password: formData.password || undefined
        })
      });
      if (!res.ok) throw new Error('فشل التحديث');
      setEditingUser(null);
      setFormData({ login_name: '', username: '', password: '', role: 'searcher' });
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    try {
      const res = await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const startEdit = (user: SystemUser) => {
    setEditingUser(user);
    setFormData({
      login_name: user.login_name,
      username: user.username,
      password: '',
      role: user.role
    });
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900">إدارة مستخدمي النظام</h2>
            <p className="text-slate-500 font-medium">إضافة وتعديل صلاحيات الوصول للنظام</p>
          </div>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingUser(null);
            setFormData({ login_name: '', username: '', password: '', role: 'searcher' });
          }}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
        >
          {showAddForm ? <X className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
          {showAddForm ? 'إلغاء' : 'إضافة مستخدم جديد'}
        </button>
      </div>

      {(showAddForm || editingUser) && (
        <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-indigo-50 animate-in zoom-in-95 duration-300">
          <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
            {editingUser ? <Edit2 className="w-5 h-5 text-indigo-600" /> : <UserPlus className="w-5 h-5 text-indigo-600" />}
            {editingUser ? `تعديل بيانات: ${editingUser.login_name}` : 'بيانات المستخدم الجديد'}
          </h3>
          <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 mr-2">اسم الدخول (Login Name)</label>
              <input
                type="text"
                disabled={!!editingUser}
                value={formData.login_name}
                onChange={(e) => setFormData({ ...formData, login_name: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold disabled:bg-slate-200"
                placeholder="مثال: ahmed_123"
                required
              />
              {editingUser && <p className="text-xs text-amber-600 font-bold mr-2">لا يمكن تعديل اسم الدخول</p>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 mr-2">اسم المستخدم (Username - للعرض)</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold"
                placeholder="الاسم الذي يظهر في النظام"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 mr-2">
                {editingUser ? 'كلمة المرور الجديدة (اتركها فارغة إذا لم ترد التغيير)' : 'كلمة المرور'}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold"
                placeholder="••••••••"
                required={!editingUser}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 mr-2">الصلاحية</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold"
              >
                {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setEditingUser(null); }}
                className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-all"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-10 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2"
              >
                <Check className="w-5 h-5" />
                {editingUser ? 'حفظ التعديلات' : 'إنشاء الحساب'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-sm font-black text-slate-600">اسم المستخدم (للعرض)</th>
                <th className="px-6 py-4 text-sm font-black text-slate-600">اسم الدخول</th>
                <th className="px-6 py-4 text-sm font-black text-slate-600">الصلاحية</th>
                <th className="px-6 py-4 text-sm font-black text-slate-600 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{user.username}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded text-slate-600">{user.login_name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black shadow-sm
                      ${user.role === 'developer' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' :
                        user.role === 'editor' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-100 text-slate-600'}`}>
                      <Shield className="w-3.5 h-3.5" />
                      {roles.find(r => r.value === user.role)?.label || user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => startEdit(user)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="تعديل"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="حذف"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && !isLoading && (
          <div className="py-20 text-center text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-bold">لا يوجد مستخدمين مضافين</p>
          </div>
        )}
      </div>
    </div>
  );
}
