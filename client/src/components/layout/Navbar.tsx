import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { Menu, X, GraduationCap, Shield, Bell, User, Home, BookOpen, Info, LayoutDashboard, LogIn, UserPlus, LogOut, Layers, ClipboardList, Zap } from 'lucide-react';

/* ═══ DynamicNavigation (inline, adapted from Lightswind UI) ═══ */
interface NavLink {
  id: string;
  label: string;
  href: string;
  icon?: React.ReactNode;
}

function DynamicNav({
  links,
  activeId,
  onLinkClick,
  variant = 'light',
  className,
}: {
  links: NavLink[];
  activeId: string | null;
  onLinkClick: (id: string) => void;
  variant?: 'light' | 'transparent';
  className?: string;
}) {
  const navRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  const updateHighlight = (id?: string | null) => {
    if (!navRef.current || !highlightRef.current) return;
    const target = id ?? activeId;
    const el = navRef.current.querySelector(`[data-nav-id="${target}"]`);
    if (!el) {
      highlightRef.current.style.width = '0px';
      return;
    }
    const { left, width } = el.getBoundingClientRect();
    const navRect = navRef.current.getBoundingClientRect();
    highlightRef.current.style.transform = `translateX(${left - navRect.left}px)`;
    highlightRef.current.style.width = `${width}px`;
  };

  useEffect(() => {
    updateHighlight();
    const onResize = () => updateHighlight();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [activeId, links]);

  const isTransparent = variant === 'transparent';

  return (
    <nav
      ref={navRef}
      className={cn(
        'relative rounded-full backdrop-blur-md border shadow-sm transition-all duration-300',
        isTransparent
          ? 'bg-white/10 border-white/20'
          : 'bg-white border-[var(--warm-border)]',
        className,
      )}
    >
      {/* Sliding highlight pill */}
      <div
        ref={highlightRef}
        className={cn(
          'absolute top-0 left-0 h-full rounded-full transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] z-0',
          isTransparent ? 'bg-white/15' : 'bg-[var(--warm-accent)]',
        )}
      />

      <ul className="flex items-center gap-1 py-1.5 px-1.5 relative z-10">
        {links.map((link) => (
          <li key={link.id} data-nav-id={link.id}>
            <button
              onClick={() => onLinkClick(link.id)}
              onMouseEnter={() => updateHighlight(link.id)}
              onMouseLeave={() => updateHighlight()}
              className={cn(
                'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 hover:scale-[1.03] whitespace-nowrap',
                isTransparent
                  ? activeId === link.id ? 'text-white font-semibold' : 'text-gray-200 hover:text-white'
                  : activeId === link.id ? 'text-[var(--warm-dark)] font-semibold' : 'text-[var(--warm-muted)] hover:text-[var(--warm-dark)]',
              )}
            >
              {link.icon && <span className="text-current">{link.icon}</span>}
              <span className="hidden sm:inline">{link.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ═══ Main Navbar ═══ */
export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === '/';

  // Build nav links for the pill-nav
  const baseLinks: NavLink[] = [
    { id: 'home', label: 'Home', href: '/', icon: <Home className="h-3.5 w-3.5" /> },
    { id: 'programs', label: 'Programs', href: '/#programs', icon: <BookOpen className="h-3.5 w-3.5" /> },
    { id: 'about', label: 'About', href: '/#about', icon: <Info className="h-3.5 w-3.5" /> },
  ];

  // Add context-specific links
  if (user) {
    if (user.role === 'ADMIN') {
      baseLinks.push({ id: 'admin', label: 'Admin', href: '/admin', icon: <Shield className="h-3.5 w-3.5" /> });
    } else {
      baseLinks.push({ id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-3.5 w-3.5" /> });
      baseLinks.push({ id: 'levels', label: 'Levels', href: '/levels', icon: <Layers className="h-3.5 w-3.5" /> });
      baseLinks.push({ id: 'mock-exam', label: 'Mock Exam', href: '/mock-exam', icon: <ClipboardList className="h-3.5 w-3.5" /> });
      baseLinks.push({ id: 'special-exams', label: 'Special', href: '/special-exams', icon: <Zap className="h-3.5 w-3.5" /> });
    }
  }

  // Determine active link
  const getActiveId = (): string | null => {
    if (location.pathname === '/admin' || location.pathname.startsWith('/admin/')) return 'admin';
    if (location.pathname === '/dashboard' || location.pathname.startsWith('/exam')) return 'dashboard';
    if (location.pathname.startsWith('/levels')) return 'levels';
    if (location.pathname.startsWith('/mock-exam')) return 'mock-exam';
    if (location.pathname.startsWith('/special-exams')) return 'special-exams';
    if (location.hash === '#programs') return 'programs';
    if (location.hash === '#about') return 'about';
    if (location.pathname === '/') return 'home';
    return null;
  };

  const handleNavClick = (id: string) => {
    setOpen(false);
    const link = baseLinks.find(l => l.id === id);
    if (!link) return;
    if (link.href.startsWith('/#')) {
      if (location.pathname !== '/') {
        navigate('/');
        setTimeout(() => {
          document.querySelector(link.href.replace('/', ''))?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        document.querySelector(link.href.replace('/', ''))?.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(link.href);
    }
  };

  return (
    <header
      className={cn(
        'w-full z-50 transition-all duration-300',
        isLanding ? 'absolute top-0 bg-transparent' : 'sticky top-0 shadow-sm',
      )}
      style={!isLanding ? { background: 'var(--warm-cream)', borderBottom: '1px solid var(--warm-border)' } : undefined}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">

          {/* ── Logo ── */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src="/keclogo.png" alt="KEC" className="h-9 w-9 object-contain" />
            <div className={isLanding ? 'text-white' : ''} style={!isLanding ? { color: 'var(--warm-text)' } : undefined}>
              <span className="font-bold text-lg">KEC</span>
              <span
                className={cn('hidden sm:inline ml-2 font-bold italic', isLanding && 'text-gray-200')}
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: '24px',
                  ...(!isLanding ? { color: 'var(--warm-muted)' } : {}),
                }}
              >
                Kantipur Engineering College
              </span>
            </div>
          </Link>

          {/* ── Desktop: DynamicNav pill ── */}
          <div className="hidden md:flex items-center gap-3">
            <DynamicNav
              links={baseLinks}
              activeId={getActiveId()}
              onLinkClick={handleNavClick}
              variant={isLanding ? 'transparent' : 'light'}
            />

            {/* Right-side actions */}
            {user ? (
              <div className="flex items-center gap-1.5">
                <button
                  className={cn(
                    'p-2 rounded-full transition',
                    isLanding ? 'text-gray-200 hover:bg-white/10' : 'hover:bg-amber-50',
                  )}
                  style={!isLanding ? { color: 'var(--warm-muted)' } : undefined}
                >
                  <Bell className="h-4.5 w-4.5" />
                </button>
                <button
                  onClick={() => { logout(); navigate('/'); }}
                  className="flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold transition hover:ring-2"
                  style={{
                    background: isLanding ? 'rgba(255,255,255,0.15)' : 'var(--warm-accent-light)',
                    color: isLanding ? '#fff' : 'var(--warm-accent)',
                  }}
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium transition-all',
                    isLanding ? 'text-gray-200 hover:text-white hover:bg-white/10' : 'hover:bg-amber-50',
                  )}
                  style={!isLanding ? { color: 'var(--warm-muted)' } : undefined}
                >
                  Login
                </Link>
                <Link to="/register" className="warm-btn text-sm px-5 py-2">
                  Sign Up Free
                </Link>
              </div>
            )}
          </div>

          {/* ── Mobile toggle ── */}
          <button
            onClick={() => setOpen(!open)}
            className={cn('md:hidden', isLanding ? 'text-white' : '')}
            style={!isLanding ? { color: 'var(--warm-text)' } : undefined}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* ── Mobile menu ── */}
        {open && (
          <div
            className="md:hidden pb-4 space-y-1 rounded-2xl mt-2 p-3"
            style={
              !isLanding
                ? { background: 'var(--warm-card)', border: '1px solid var(--warm-border)' }
                : { background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' }
            }
          >
            {baseLinks.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  'flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left',
                  isLanding ? 'text-gray-200 hover:text-white hover:bg-white/10' : 'hover:bg-amber-50',
                  getActiveId() === item.id && (isLanding ? 'bg-white/15 text-white' : 'bg-[var(--warm-accent)] text-[var(--warm-dark)] font-semibold'),
                )}
                style={!isLanding && getActiveId() !== item.id ? { color: 'var(--warm-text)' } : undefined}
              >
                {item.icon}
                {item.label}
              </button>
            ))}

            <div
              className="h-px my-2"
              style={{ background: isLanding ? 'rgba(255,255,255,0.15)' : 'var(--warm-border)' }}
            />

            {user ? (
              <button
                onClick={() => { logout(); setOpen(false); navigate('/'); }}
                className={cn(
                  'block w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium',
                  isLanding ? 'text-gray-200 hover:text-white' : 'hover:bg-amber-50',
                )}
                style={!isLanding ? { color: 'var(--warm-muted)' } : undefined}
              >
                Logout
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-medium',
                    isLanding ? 'text-gray-200 hover:text-white' : 'hover:bg-amber-50',
                  )}
                  style={!isLanding ? { color: 'var(--warm-text)' } : undefined}
                >
                  <LogIn className="h-3.5 w-3.5" /> Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setOpen(false)}
                  className="block warm-btn text-center text-sm mt-2"
                >
                  Sign Up Free
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
