import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeroGeometric } from '@/components/ui/shape-landing-hero';
import { GradientBarsBackground } from '@/components/ui/gradient-bars-background';
import { DottedSurface } from '@/components/ui/dotted-surface';
import { AvatarWithName } from '@/components/ui/avatar-with-name';
import { Shield, Users, Activity, HardDrive, Settings, LogOut, ArrowLeft, Sun, Moon, User, Mail, GraduationCap, Grid3X3, Database, TrendingUp, MessageSquare, Target, Zap, Palette, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { AnimatedLogin } from '../components/ui/animated-login';
import { FooterSection } from '../components/ui/footer-section';
import { 
  fetchAdminActivity, fetchAdminStats, fetchAdminUsers, fetchAllUserHistories, 
  fetchAllChats, deleteAdminUser, deleteAdminHistory, getUser, logout, login as apiLogin
} from '../services/authService';

const syncChannel = new BroadcastChannel('intdoc_sync');

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [recentFiles, setRecentFiles] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, apiCallsToday: 0, totalDocuments: 0 });
  const [allUsers, setAllUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('activity');
  const [histories, setHistories] = useState([]);
  const [chats, setChats] = useState([]);
  const [adminUser, setAdminUser] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('intdoc_theme') || 'dark');
  const [backgroundStyle, setBackgroundStyle] = useState(localStorage.getItem('intdoc_bgstyle') || 'geometric');
  const [showProfile, setShowProfile] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [isDeleting, setIsDeleting] = useState(null);

  useEffect(() => {
    document.body.className = `theme-${theme}`;
    localStorage.setItem('intdoc_theme', theme);
    localStorage.setItem('intdoc_bgstyle', backgroundStyle);
  }, [theme, backgroundStyle]);

  const loadData = useCallback(async () => {
    try {
      const u = getUser();
      setAdminUser(u);

      const [activities, statsData, usersData, hist, ch] = await Promise.all([
        fetchAdminActivity(),
        fetchAdminStats(),
        fetchAdminUsers(userPage, 20, userSearch),
        fetchAllUserHistories(),
        fetchAllChats()
      ]);
      setRecentFiles(activities || []);
      setStats(statsData || { totalUsers: 0, apiCallsToday: 0, totalDocuments: 0 });
      setAllUsers(usersData.users || []);
      setUserTotalPages(usersData.pages || 1);
      setHistories(hist || []);
      setChats(ch || []);
      setIsLive(true);
      setTimeout(() => setIsLive(false), 2000);
    } catch (err) {
      console.error('Admin data fetch error:', err);
      if (err.message === 'Token is invalid or expired.') {
        logout();
        setIsAuthenticated(false);
      }
    }
  }, [userPage, userSearch]);

  const handleDeleteHistory = async (id) => {
    if (!window.confirm('Delete this history record?')) return;
    try {
      await deleteAdminHistory(id);
      loadData();
    } catch (err) {
      console.error('Delete History Error:', err);
      alert(err.message);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('WARNING: This will permanently delete the user and all their data (history, activity, chats). Are you sure?')) return;
    setIsDeleting(id);
    try {
      await deleteAdminUser(id);
      // Optimistic update
      setAllUsers(prev => prev.filter(u => u._id !== id));
      loadData();
    } catch (err) {
      console.error('Delete User Error:', err);
      alert(err.message);
    } finally {
      setIsDeleting(null);
    }
  };

  useEffect(() => {
    const u = getUser();
    if (u && u.role === 'admin') {
      setIsAuthenticated(true);
    }
  }, []);

  // Load data + auto-refresh when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
      
      const handleSync = (e) => {
        if (e.data.type === 'ACTIVITY_UPDATED') loadData();
      };
      syncChannel.addEventListener('message', handleSync);

      const interval = setInterval(loadData, 30000);
      return () => {
        clearInterval(interval);
        syncChannel.removeEventListener('message', handleSync);
      };
    }
  }, [isAuthenticated, loadData, userPage, userSearch]);

  const handleLogin = async (email, pw) => {
    setLoginError('');
    try {
      const user = await apiLogin(email, pw);
      if (user.role !== 'admin') {
        logout();
        throw new Error('This account does not have admin privileges.');
      }
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      setLoginError(err.message || 'Invalid admin credentials.');
      return false;
    }
  };

  const metrics = [
    { label: 'Total Users', value: stats.totalUsers, icon: <Users size={20} color="var(--accent-blue)" /> },
    { label: 'Calls Today', value: stats.apiCallsToday, icon: <Activity size={20} color="var(--accent-pink)" /> },
    { label: 'Total Documents', value: stats.totalDocuments, icon: <Database size={20} color="var(--accent-teal)" /> },
  ];

  if (!isAuthenticated) {
    const LoginContent = (
      <AnimatedLogin
        onLogin={handleLogin}
        error={loginError}
      />
    );

    if (backgroundStyle === 'bars') {
      return (
        <GradientBarsBackground numBars={15} gradientFrom="var(--accent-pink)">
          {LoginContent}
        </GradientBarsBackground>
      );
    } else if (backgroundStyle === 'dots') {
      return (
        <DottedSurface theme={theme}>
          {LoginContent}
        </DottedSurface>
      );
    } else {
      return (
        <HeroGeometric badge="Admin Portal" title1="Admin Secure" title2="Access Terminal">
          {LoginContent}
        </HeroGeometric>
      );
    }
  }

  return (
    <>
    {(() => {
      const AdminMain = (
        <div className="app-container" style={{ maxWidth: '1400px' }}>
          <motion.header 
            className="header" 
            style={{ paddingBottom: '1rem', marginBottom: '2rem' }}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
        <motion.div 
          className="logo" 
          style={{ cursor: 'pointer' }}
          whileHover={{ scale: 1.02 }}
        >
          <Shield size={28} color="var(--accent-pink)" /> IntDoc.ai Admin
        </motion.div>
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
           {isLive && (
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-teal)', fontSize: '0.8rem', fontWeight: 600 }}>
               <span className="live-dot" style={{ width: '8px', height: '8px', background: 'var(--accent-teal)', borderRadius: '50%', display: 'inline-block', filter: 'blur(1px)' }}></span>
               LIVE SYNC
             </div>
           )}
            <button className="icon-btn" onClick={() => setShowProfile(!showProfile)} title="Admin Details">
               <AvatarWithName 
                 size="sm"
                 name={adminUser?.name || 'Super Admin'}
                 src={adminUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=SuperAdmin`}
                 className="p-0 border-none"
               />
            </button>
             <button className="icon-btn transition-all duration-300 hover:scale-110" onClick={() => {
              const bgs = ['geometric', 'bars', 'dots'];
              const nextIdx = (bgs.indexOf(backgroundStyle) + 1) % bgs.length;
              setBackgroundStyle(bgs[nextIdx]);
            }} title="Change Background Style">
              <Palette size={20} />
            </button>
             <button className="icon-btn transition-all duration-500 hover:rotate-90 hover:scale-125 group" onClick={() => {
               const themes = ['dark', 'light', 'cyber', 'midnight'];
               const nextIndex = (themes.indexOf(theme) + 1) % themes.length;
               setTheme(themes[nextIndex]);
             }} title="Toggle Theme">
                {theme === 'dark' ? <Sun size={20} className="group-hover:text-amber-400 transition-colors" /> : (theme === 'light' ? <Moon size={20} className="group-hover:text-indigo-300 transition-colors" /> : <Zap size={20} className="group-hover:text-yellow-400 transition-colors" />)}
             </button>
            <button className="icon-btn" onClick={() => loadData()} title="Refresh Data">
              <TrendingUp size={20} />
            </button>
            <button className="icon-btn" onClick={() => { logout(); setIsAuthenticated(false); }} title="Lock Dashboard">
              <LogOut size={20} />
            </button>
        </div>

        <AnimatePresence>
          {showProfile && (
            <motion.div 
              className="absolute top-24 right-8 z-50 glass-panel p-8 w-96 border border-[var(--accent-blue)]/30 shadow-[0_20px_60px_-10px_rgba(0,208,255,0.3)]"
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
            >
            <div className="flex items-center gap-6 mb-8 border-b border-black/5 dark:border-white/10 pb-6">
              <div className="p-4 rounded-3xl bg-blue-500/10 border border-blue-500/20 shadow-inner">
                <Shield size={36} className="text-[var(--accent-blue)]" />
              </div>
              <div>
                <h3 className="text-3xl font-black text-[var(--text-main)] tracking-tight">Admin Identity</h3>
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-[0.2em] font-bold">Authorized Platform Access</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-6 group">
                <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 text-[var(--text-muted)] group-hover:bg-[var(--accent-pink)]/15 group-hover:text-[var(--accent-pink)] transition-all duration-300">
                  <User size={24} />
                </div>
                <div>
                  <p className="text-[11px] uppercase text-[var(--text-muted)] font-black mb-1 opacity-70 tracking-wider">Full Name</p>
                  <p className="text-xl font-bold text-[var(--text-main)] tracking-tight">{adminUser?.name || 'Administrator'}</p>
                </div>
              </div>

              <div className="flex items-center gap-6 group">
                <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 text-[var(--text-muted)] group-hover:bg-[var(--accent-teal)]/15 group-hover:text-[var(--accent-teal)] transition-all duration-300">
                  <Shield size={24} />
                </div>
                <div>
                  <p className="text-[11px] uppercase text-[var(--text-muted)] font-black mb-1 opacity-70 tracking-wider">Role</p>
                  <p className="text-xl font-bold text-[var(--text-main)] tracking-tight">Super Admin</p>
                </div>
              </div>

              <div className="flex items-start gap-6 group pt-4 border-t border-black/5 dark:border-white/10">
                <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 text-[var(--text-muted)] group-hover:bg-amber-500/15 group-hover:text-amber-500 transition-all duration-300 mt-1">
                  <Mail size={24} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-[11px] uppercase text-[var(--text-muted)] font-black mb-1 opacity-70 tracking-wider">Official Email</p>
                  <p className="text-sm font-bold text-[var(--text-main)] break-all select-all opacity-80 hover:opacity-100 transition-colors">{adminUser?.email || 'admin@intdoc.ai'}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
        {metrics.map((m, i) => (
          <motion.div 
            key={i} 
            className="glass-panel" 
            style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'var(--glass-bg)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
          >
            <div style={{ padding: '1rem', background: 'var(--bg-panel)', borderRadius: '1rem' }}>
              {m.icon}
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{m.label}</p>
              <h2 style={{ fontSize: '2rem', margin: 0 }}>{m.value}</h2>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="glass-panel" style={{ padding: '2rem', background: 'var(--bg-panel)' }}>
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1.5rem', overflowX: 'auto' }}>
          <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }} className={`btn ${activeTab === 'activity' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('activity')}>Platform Activity</motion.button>
          <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }} className={`btn ${activeTab === 'scores' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('scores')}>User Quiz Scores</motion.button>
          <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }} className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('users')}>Registered Users</motion.button>
          <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }} className={`btn ${activeTab === 'chats' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('chats')}>AI Chat Workspace</motion.button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'activity' && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={24} color="var(--accent-blue)" /> Recent Platform Activity
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Filename</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Type</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>User</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Status</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentFiles.filter(f => f.status !== 'quiz_complete').length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No activity yet. Users will appear here after uploading documents.</td>
                    </tr>
                  ) : recentFiles.filter(f => f.status !== 'quiz_complete').map((f, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '1rem', fontWeight: 500 }}>{f.filename || f.name || 'Unknown Document'}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>{(f.fileType || f.type || 'FILE').toUpperCase()}</span>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                          <AvatarWithName 
                            name={f.userName || f.user || 'User'} 
                            size="sm" 
                            direction="top"
                          />
                          <span style={{ fontWeight: 500 }}>{f.userName || f.user || 'Unknown User'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ 
                          color: f.status === 'success' ? 'var(--accent-teal)' 
                               : f.status === 'error' ? '#ff6b6b' 
                               : f.status === 'stopped' ? 'orange'
                               : 'var(--accent-blue)',
                          display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}>
                          <span style={{ 
                            width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor',
                            animation: f.status === 'processing' ? 'pulse 1.5s infinite ease-in-out' : 'none'
                          }}></span>
                          <span style={{ fontStyle: f.status === 'processing' ? 'italic' : 'normal' }}>
                            {f.status === 'stopped' ? '⏹ stopped' : f.status}
                          </span>
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                        {f.createdAt ? new Date(f.createdAt).toLocaleTimeString() : f.time}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'scores' && (
          <motion.div
            key="scores"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Target size={24} color="var(--accent-teal)" /> User Quiz Scores
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>User Name</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Email</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Document</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Quiz Score</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>User</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Time</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {histories.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No quiz scores yet.</td></tr>
                  ) : histories.map((h, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '1rem', fontWeight: 500 }}>{h.userId?.name || 'Unknown User'}</td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{h.userId?.email || 'N/A'}</td>
                      <td style={{ padding: '1rem' }}>{h.filename}</td>
                      <td style={{ padding: '1rem' }}>
                        {h.bestQuizScore !== null && h.bestQuizScore !== undefined ? (
                          <span style={{ color: 'var(--accent-teal)', fontWeight: 'bold' }}>{h.bestQuizScore} / {h.quiz?.length || 15}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Not taken</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <AvatarWithName 
                          size="sm"
                          name={h.userId?.name || 'User'}
                          src={h.userId?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${h.userId?.name || 'User'}`}
                        />
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{new Date(h.createdAt).toLocaleString()}</td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                            onClick={() => { setSelectedHistory(h); setShowDetailsModal(true); }}
                          >
                            Details
                          </button>
                          <button 
                            className="btn" 
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: '#ff4d4d', border: '1px solid rgba(255,77,77,0.2)', background: 'transparent' }}
                            onClick={() => handleDeleteHistory(h._id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={24} color="var(--accent-blue)" /> Registered Users ({stats.totalUsers})
              </h2>
              <div style={{ position: 'relative', width: '250px' }}>
                <input 
                  type="text"
                  placeholder="Search name or email..."
                  className="form-input"
                  style={{ 
                    padding: '0.8rem 1rem 0.8rem 3.5rem',
                    borderRadius: '99px', 
                    fontSize: '0.9rem',
                    width: '100%',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    outline: 'none'
                  }}
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
                <Users size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
              </div>
            </div>

            <div className="scrollbar-thin" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>User Identity</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Email Address</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Role</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Joined Date</th>
                    <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(allUsers) && allUsers.length > 0 ? (
                    allUsers.map((u, i) => (
                      <tr key={u._id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                             <AvatarWithName 
                              size="sm"
                              name={u?.name || 'User'}
                              src={u?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u?.name || 'User'}`}
                            />
                            <span style={{ fontWeight: 500 }}>{u?.name || 'Unknown'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{u?.email || 'No Email'}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ 
                            padding: '0.2rem 0.6rem', 
                            borderRadius: '0.4rem', 
                            fontSize: '0.75rem', 
                            background: u?.role === 'admin' ? 'rgba(255, 61, 113, 0.1)' : 'rgba(0, 208, 255, 0.1)',
                            color: u?.role === 'admin' ? 'var(--accent-pink)' : 'var(--accent-blue)',
                            fontWeight: 'bold'
                          }}>
                            {(u?.role || 'user').toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{u?.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</td>
                        <td style={{ padding: '1rem' }}>
                          {u?.role !== 'admin' && (
                            <button 
                              className="btn" 
                              disabled={isDeleting === u?._id}
                              style={{ 
                                padding: '0.4rem 0.8rem', 
                                fontSize: '0.8rem', 
                                color: isDeleting === u?._id ? '#ccc' : '#ff4d4d', 
                                border: `1px solid ${isDeleting === u?._id ? 'rgba(255,255,255,0.1)' : 'rgba(255,77,77,0.2)'}`, 
                                background: 'transparent' 
                              }}
                              onClick={() => handleDeleteUser(u?._id)}
                            >
                              {isDeleting === u?._id ? 'Deleting...' : 'Delete User'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No registered users found.</td></tr>
                  )}
                </tbody>
              </table>

              {/* Pagination Controls */}
              {userTotalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
                  <button 
                    className="btn" 
                    disabled={userPage === 1}
                    onClick={() => setUserPage(prev => Math.max(1, prev - 1))}
                    style={{ padding: '0.5rem 1rem', opacity: userPage === 1 ? 0.5 : 1 }}
                  >
                    Previous
                  </button>
                  <span style={{ color: 'var(--text-muted)' }}>Page {userPage} of {userTotalPages}</span>
                  <button 
                    className="btn" 
                    disabled={userPage === userTotalPages}
                    onClick={() => setUserPage(prev => Math.min(userTotalPages, prev + 1))}
                    style={{ padding: '0.5rem 1rem', opacity: userPage === userTotalPages ? 0.5 : 1 }}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'chats' && (
          <motion.div
            key="chats"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="workspace-canvas" 
            style={{ position: 'relative', minHeight: '800px', background: 'var(--bg-panel)', borderRadius: '1rem', padding: '2rem' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageSquare size={24} color="var(--accent-pink)" /> AI Chat User Workspaces
              </h2>
              
              <div style={{ position: 'relative', width: '300px' }}>
                <input 
                  type="text"
                  placeholder="Search user name..."
                  className="form-input"
                  style={{ 
                    padding: '0.8rem 1rem 0.8rem 3.5rem',
                    borderRadius: '99px',
                    width: '100%',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    outline: 'none'
                  }}
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                />
                <Shield size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '2rem' }}>
              {(() => {
                const grouped = chats.reduce((acc, chat) => {
                  const key = chat.userName || 'Anonymous';
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(chat);
                  return acc;
                }, {});

                const userNames = Object.keys(grouped).filter(name => 
                  name.toLowerCase().includes(chatSearch.toLowerCase())
                );

                if (userNames.length === 0) {
                  return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
                    {chatSearch ? `No users found matching "${chatSearch}"` : 'No user conversations found.'}
                  </div>;
                }

                return userNames.map((name, i) => (
                  <motion.div 
                    key={name}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.02 }}
                    className="glass-panel"
                    style={{ 
                    padding: '1.5rem', 
                    background: 'var(--glass-bg)', 
                    border: '1px solid var(--glass-border)',
                      display: 'flex', 
                      flexDirection: 'column', 
                      maxHeight: '600px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                      <div style={{ width: '40px', height: '40px' }}>
                        <AvatarWithName 
                          name={name} 
                          size="sm" 
                          direction="right"
                        />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{name}</h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{grouped[name].length} interaction(s)</p>
                      </div>
                    </div>
                    
                    <div className="scrollbar-thin" style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
                      {grouped[name].map((msg, idx) => (
                        <div key={idx} style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-panel)', borderRadius: '0.5rem' }}>
                          <div style={{ marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Question</span>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>{msg.question}</p>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--accent-pink)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>AI Response</span>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{msg.aiResponse}</p>
                          </div>
                          <div style={{ marginTop: '0.5rem', textAlign: 'right', fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)' }}>
                            {new Date(msg.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ));
              })()}
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(0, 208, 255, 0.4); }
          50% { transform: scale(1.2); opacity: 0.7; box-shadow: 0 0 0 8px rgba(0, 208, 255, 0); }
          100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(0, 208, 255, 0); }
        }
      `}</style>
       <FooterSection />
        </div>
      );

      if (backgroundStyle === 'bars') {
        return (
          <GradientBarsBackground numBars={15} gradientFrom="var(--accent-pink)">
            {AdminMain}
          </GradientBarsBackground>
        );
      } else if (backgroundStyle === 'dots') {
        return (
          <DottedSurface theme={theme}>
            {AdminMain}
          </DottedSurface>
        );
      } else {
        return (
          <HeroGeometric badge="Admin Terminal" title1="Platform" title2="Management Control">
            {AdminMain}
          </HeroGeometric>
        );
      }
    })()}
    <AnimatePresence>
      {showDetailsModal && selectedHistory && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <motion.div 
            className="glass-panel modal-content" 
            style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="modal-header" style={{ position: 'sticky', top: 0, background: 'var(--bg-panel)', zIndex: 10, padding: '1rem 0' }}>
              <div>
                <h2 style={{ margin: 0 }}>Quiz Details: {selectedHistory.filename}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                  User: {selectedHistory.userId?.name} ({selectedHistory.userId?.email})
                </p>
              </div>
              <button className="icon-btn" onClick={() => setShowDetailsModal(false)}><X size={24} /></button>
            </div>

            <div style={{ padding: '1rem 0' }}>
              <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ flex: 1, padding: '1.5rem', background: 'rgba(255,255,255,0.03)' }}>
                  <h3 style={{ marginTop: 0, color: 'var(--accent-teal)' }}>Quiz Performance</h3>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
                    {selectedHistory.bestQuizScore !== null ? `${selectedHistory.bestQuizScore} / ${selectedHistory.quiz?.length || 0}` : 'Not taken'}
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Taken on: {new Date(selectedHistory.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="glass-panel" style={{ flex: 2, padding: '1.5rem', background: 'rgba(255,255,255,0.03)' }}>
                  <h3 style={{ marginTop: 0, color: 'var(--accent-blue)' }}>Document Summary</h3>
                  <div className="scrollbar-thin" style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '0.9rem', opacity: 0.8 }}>
                    <ReactMarkdown>{selectedHistory.summary}</ReactMarkdown>
                  </div>
                </div>
              </div>

              <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Quiz Questions</h3>
              <div style={{ display: 'grid', gap: '1.5rem', marginTop: '1rem' }}>
                {selectedHistory.quiz?.map((q, idx) => (
                  <div key={idx} className="glass-panel" style={{ padding: '1.2rem', background: 'rgba(255,255,255,0.02)' }}>
                    <p style={{ fontWeight: 'bold', marginBottom: '0.8rem' }}>{idx + 1}. {q.question}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      {q.options?.map((opt, oIdx) => (
                        <div key={oIdx} style={{ 
                          padding: '0.5rem', 
                          borderRadius: '0.4rem', 
                          fontSize: '0.85rem',
                          background: oIdx === q.answer ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255,255,255,0.03)',
                          border: oIdx === q.answer ? '1px solid #4CAF50' : '1px solid rgba(255,255,255,0.05)',
                          color: oIdx === q.answer ? '#4CAF50' : 'inherit'
                        }}>
                          <span style={{ fontWeight: 'bold', marginRight: '0.5rem' }}>{String.fromCharCode(65 + oIdx)}</span>
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
}
