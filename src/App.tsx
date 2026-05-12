import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FilePlus, 
  Search, 
  Users, 
  History, 
  Settings, 
  LogOut,
  Menu,
  X,
  ChevronRight,
  Database,
  ShieldCheck,
  TrendingUp,
  FileText,
  Clock,
  CheckCircle2,
  BarChart3,
  WifiOff,
  User,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import CaseForm from './components/CaseForm';
import Dashboard from './components/Dashboard';
import MemberManagement from './components/MemberManagement';
import AdvancedSearch from './components/AdvancedSearch';
import AuditLogView from './components/AuditLogView';
import ProsecutionManagement from './components/ProsecutionManagement';
import ReportsAndStatistics from './components/ReportsAndStatistics';
import CaseList from './components/CaseList';
import SystemManagement from './components/SystemManagement';
import UserManagement from './components/UserManagement';
import ChangePassword from './components/ChangePassword';
import Login from './components/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Case } from './types';

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { user, logout, isLoading } = useAuth();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const menuItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, roles: ['developer', 'admin', 'editor', 'data_collector', 'searcher'] },
    { id: 'new-case', label: 'وارد جديد', icon: FilePlus, roles: ['developer', 'admin', 'editor', 'data_collector'] },
    { id: 'old-incomings', label: 'الواردات القديمة', icon: History, roles: ['developer', 'admin', 'editor', 'searcher'] },
    { id: 'search', label: 'البحث المتقدم', icon: Search, roles: ['developer', 'admin', 'editor', 'data_collector', 'searcher'] },
    { id: 'members', label: 'أعضاء النيابة', icon: Users, roles: ['developer', 'admin'] },
    { id: 'prosecutions', label: 'تشكيل النيابات', icon: Database, roles: ['developer', 'admin'] },
    { id: 'reports', label: 'التقارير والإحصائيات', icon: BarChart3, roles: ['developer', 'admin', 'editor', 'data_collector', 'searcher'] },
    { id: 'users-manage', label: 'إدارة المستخدمين', icon: Users, roles: ['developer', 'admin'] },
    { id: 'change-password', label: 'تغيير كلمة المرور', icon: Lock, roles: ['developer', 'admin', 'editor', 'data_collector', 'searcher'] },
    { id: 'audit', label: 'سجل العمليات', icon: History, roles: ['developer'] },
    { id: 'system', label: 'إدارة النظام', icon: Settings, roles: ['developer', 'admin'] },
  ].filter(item => item.roles.includes(user.role));

  const handleCaseSelect = (id: number) => {
    setSelectedCaseId(id);
    setActiveTab('case-detail');
  };

  return (
    <div className="min-h-screen bg-background text-slate-900 font-sans flex dir-rtl" dir="rtl">
      {/* Sidebar */}
      <aside 
        className={`${
          isSidebarOpen ? 'w-80' : 'w-24'
        } bg-slate-950 text-white transition-all duration-500 ease-in-out flex flex-col z-50 fixed h-full print:hidden shadow-2xl shadow-black/50`}
      >
        <div className="p-8 flex items-center justify-between border-b border-white/5">
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/40 ring-4 ring-primary/10">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <h1 className="font-display font-bold text-lg leading-tight tracking-tight text-white line-clamp-2">الفحص والتفتيش القضائي</h1>
                <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold mt-0.5">النيابة الإدارية</p>
              </div>
            </motion.div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2.5 hover:bg-white/5 rounded-xl transition-all active:scale-90"
          >
            {isSidebarOpen ? <X className="w-5 h-5 text-slate-400" /> : <Menu className="w-6 h-6 text-slate-400" />}
          </button>
        </div>

        <nav className="flex-1 p-6 space-y-2.5 overflow-y-auto scrollbar-hide">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setSelectedCaseId(null);
              }}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group relative ${
                activeTab === item.id 
                  ? 'bg-primary text-white shadow-2xl shadow-primary/30' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 transition-all duration-500 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110 group-hover:text-primary'}`} />
              {isSidebarOpen && <span className="font-semibold tracking-wide">{item.label}</span>}
              {isSidebarOpen && activeTab === item.id && (
                <motion.div layoutId="active-pill" className="mr-auto">
                  <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                </motion.div>
              )}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-4 px-5 py-4 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 rounded-2xl transition-all duration-300 group"
          >
            <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            {isSidebarOpen && <span className="font-semibold tracking-wide text-white">تسجيل الخروج</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-500 ease-in-out ${isSidebarOpen ? 'mr-80' : 'mr-24'} p-12 print:mr-0 print:p-0`}>
        <header className="mb-12 flex items-center justify-between print:hidden">
          <div>
            <h2 className="text-4xl font-display font-bold text-slate-900 tracking-tight">
              {menuItems.find(i => i.id === activeTab)?.label || 
               (activeTab === 'case-detail' ? 'تفاصيل الملف' : 'نظام التفتيش')}
            </h2>
            <p className="text-slate-400 mt-2 font-medium">إدارة دورة عمل التفتيش القضائي - النيابة الإدارية</p>
          </div>
          <div className="flex items-center gap-6">
            {!isOnline && (
              <div className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20 animate-pulse">
                <WifiOff className="w-4 h-4" />
                <span className="text-xs font-bold">أنت تعمل حالياً بدون اتصال</span>
              </div>
            )}
            <div className="glass-morphism px-6 py-3 rounded-2xl shadow-sm flex items-center gap-5">
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-slate-900">{user.username}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {user.role === 'developer' ? 'مطور النظام' : 
                   user.role === 'admin' ? 'مدير النظام' :
                   user.role === 'editor' ? 'محرر بيانات' :
                   user.role === 'data_collector' ? 'جامع بيانات' : 'باحث'}
                </span>
              </div>
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner">
                <User className="w-5 h-5" />
              </div>
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + (selectedCaseId || '')}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && <Dashboard onCaseSelect={handleCaseSelect} />}
            {activeTab === 'new-case' && (
              <CaseForm onSuccess={(tab) => {
                const target = tab || 'old-incomings';
                setActiveTab(target);
              }} />
            )}
            {activeTab === 'old-incomings' && (
              <CaseList status="old" title="الواردات القديمة" onCaseSelect={handleCaseSelect} />
            )}
            {activeTab === 'case-detail' && selectedCaseId && (
              <CaseForm caseId={selectedCaseId} onSuccess={(tab) => {
                const target = tab || 'old-incomings';
                setActiveTab(target);
              }} />
            )}
            {activeTab === 'members' && <MemberManagement />}
            {activeTab === 'prosecutions' && <ProsecutionManagement />}
            {activeTab === 'reports' && <ReportsAndStatistics />}
            {activeTab === 'search' && <AdvancedSearch onCaseSelect={handleCaseSelect} />}
            {activeTab === 'users-manage' && <UserManagement />}
            {activeTab === 'change-password' && <ChangePassword />}
            {activeTab === 'audit' && <AuditLogView />}
            {activeTab === 'system' && <SystemManagement />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
