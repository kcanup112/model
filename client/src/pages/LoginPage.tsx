import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Eye, EyeOff } from 'lucide-react';

const wiseQuotes = [
  { heading: 'Get\nEverything\nYou Want', text: 'You can get everything you want if you work hard, trust the process, and stick to the plan.' },
  { heading: 'Dream\nBig,\nStart Now', text: 'The secret of getting ahead is getting started. Your future is created by what you do today.' },
  { heading: 'Success\nIs\nA Journey', text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.' },
  { heading: 'Learn\nFrom\nYesterday', text: 'Learn from yesterday, live for today, hope for tomorrow. The important thing is not to stop questioning.' },
  { heading: 'Push\nYour\nLimits', text: 'The only way to achieve the impossible is to believe it is possible. Keep pushing forward.' },
  { heading: 'Knowledge\nIs\nPower', text: 'An investment in knowledge pays the best interest. Education is the passport to the future.' },
  { heading: 'Stay\nHungry,\nStay Foolish', text: 'The people who are crazy enough to think they can change the world are the ones who do.' },
  { heading: 'Never\nStop\nLearning', text: 'The more that you read, the more things you will know. The more that you learn, the more places you\'ll go.' },
];

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const quote = useMemo(() => wiseQuotes[Math.floor(Math.random() * wiseQuotes.length)], []);

  useEffect(() => {
    if (user) {
      const dest = user.role === 'ADMIN' ? '/admin' : user.isProfileComplete ? '/dashboard' : '/complete-profile';
      navigate(dest, { replace: true });
    }
  }, [user, navigate]);

  if (user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--warm-dark)' }}>

      {/* Left Panel - College Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden rounded-3xl m-4">
        {/* Background image */}
        <img
          src="/College-Complex-scaled.jpg"
          alt="Kantipur Engineering College"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark gradient overlay for text readability */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to bottom, rgba(30, 25, 50, 0.7) 0%, rgba(30, 25, 50, 0.4) 40%, rgba(30, 25, 50, 0.75) 100%)',
        }} />

        {/* Content overlay */}
        <div className="relative z-10 flex flex-col justify-between p-10 text-white">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] mb-1" style={{ color: 'var(--warm-accent)' }}>
              A Wise Quote
            </p>
            <div className="w-12 h-px mt-2" style={{ background: 'var(--warm-accent)' }} />
          </div>

          <div>
            <h2 className="text-5xl font-extrabold leading-tight mb-4" style={{ fontFamily: 'Georgia, serif' }}>
              {quote.heading.split('\n').map((line, i) => (
                <React.Fragment key={i}>{line}<br /></React.Fragment>
              ))}
            </h2>
            <p className="text-sm text-gray-300 max-w-xs leading-relaxed">
              {quote.text}
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-12">
            <img src="/keclogo.png" alt="KEC" className="h-9 w-9 object-contain" />
            <span className="font-bold text-lg text-white">KEC EXAM PREPARATION</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl font-extrabold text-white mb-2" style={{ fontFamily: 'Georgia, serif' }}>
            Welcome Back
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--warm-muted)' }}>
            Enter your email and password to access your account
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="text-sm px-4 py-3 rounded-xl border" style={{
                background: 'rgba(192, 57, 43, 0.1)',
                borderColor: 'rgba(192, 57, 43, 0.2)',
                color: '#e57373',
              }}>{error}</div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Email</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl outline-none transition text-sm"
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                }}
                placeholder="Enter your email"
                onFocus={e => e.target.style.borderColor = 'var(--warm-accent)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl outline-none transition text-sm pr-12"
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                  }}
                  placeholder="Enter your password"
                  onFocus={e => e.target.style.borderColor = 'var(--warm-accent)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition"
                  style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Remember / Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox" checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 accent-amber-400"
                />
                <span className="text-sm" style={{ color: 'var(--warm-muted)' }}>Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm font-medium transition" style={{ color: 'var(--warm-accent)' }}>
                Forgot Password?
              </Link>
            </div>

            {/* Sign In Button */}
            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
              style={{
                background: 'var(--warm-accent)',
                color: 'var(--warm-dark)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#dba928'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--warm-accent)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Bottom link */}
          <p className="text-center text-sm mt-10" style={{ color: 'var(--warm-muted)' }}>
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold transition" style={{ color: 'var(--warm-accent)' }}>
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
