import React, { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users, FileQuestion, BookOpen, Newspaper,
  GraduationCap, LogOut, ChevronRight, Image, Bell, Settings, Menu, X, Layers, Zap,
} from 'lucide-react';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/questions', icon: FileQuestion, label: 'Questions' },
  { to: '/admin/exams', icon: BookOpen, label: 'Exams' },
  { to: '/admin/levels', icon: Layers, label: 'Levels' },
  { to: '/admin/special-exams', icon: Zap, label: 'Special Exams' },
  { to: '/admin/content', icon: Newspaper, label: 'CMS Content' },
  { to: '/admin/media', icon: Image, label: 'Media' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--warm-bg)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`w-64 flex flex-col fixed h-full z-50 transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{ background: 'var(--warm-cream)', borderRight: '1px solid var(--warm-border)' }}>
        <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--warm-border)' }}>
          <Link to="/" className="flex items-center gap-2">
            <img src="/keclogo.png" alt="KEC" className="h-9 w-9 object-contain" />
            <div>
              <div className="font-bold text-sm" style={{ color: 'var(--warm-text)' }}>KEC Admin</div>
              <div className="text-xs" style={{ color: 'var(--warm-muted)' }}>Control Panel</div>
            </div>
          </Link>
          <button className="lg:hidden p-1 rounded-lg hover:bg-amber-50" onClick={() => setSidebarOpen(false)} style={{ color: 'var(--warm-muted)' }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const active = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: active ? 'var(--warm-accent)' : 'transparent',
                  color: active ? 'var(--warm-dark)' : 'var(--warm-muted)',
                  fontWeight: active ? 600 : 500,
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'var(--warm-accent-light)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--warm-text)';
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = 'var(--warm-muted)';
                  }
                }}
              >
                <item.icon className="h-4.5 w-4.5 shrink-0" />
                {item.label}
                {active && <ChevronRight className="h-4 w-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4" style={{ borderTop: '1px solid var(--warm-border)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'var(--warm-accent-light)', color: 'var(--warm-accent)' }}>
              {(user?.email || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate" style={{ color: 'var(--warm-text)' }}>{user?.email}</div>
              <div className="text-xs" style={{ color: 'var(--warm-muted)' }}>Administrator</div>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="flex items-center gap-2 text-sm font-medium transition w-full px-2 py-1.5 rounded-lg hover:bg-amber-50"
            style={{ color: 'var(--warm-muted)' }}
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:ml-64 min-h-screen">
        {/* Top bar */}
        <div className="sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3"
          style={{ background: 'var(--warm-bg)', borderBottom: '1px solid var(--warm-border)' }}>
          <button className="lg:hidden p-2 rounded-xl transition hover:bg-amber-50" onClick={() => setSidebarOpen(true)} style={{ color: 'var(--warm-muted)' }}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <button className="p-2 rounded-xl transition hover:bg-amber-50" style={{ color: 'var(--warm-muted)' }}>
            <Bell className="h-4.5 w-4.5" />
          </button>
          <button onClick={() => navigate('/admin/settings')} className="p-2 rounded-xl transition hover:bg-amber-50" style={{ color: 'var(--warm-muted)' }} title="Settings">
            <Settings className="h-4.5 w-4.5" />
          </button>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: 'var(--warm-accent)', color: 'var(--warm-dark)' }}>
            {(user?.email || 'A').charAt(0).toUpperCase()}
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
