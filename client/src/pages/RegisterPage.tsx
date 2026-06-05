import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Eye, EyeOff } from 'lucide-react';

const wiseQuotes = [
  { heading: 'Begin\nYour\nSuccess', text: 'Join thousands of students preparing for the IOE entrance exam. Your future starts here.' },
  { heading: 'Build\nYour\nFuture', text: 'Education is the most powerful weapon which you can use to change the world.' },
  { heading: 'Take\nThe First\nStep', text: 'A journey of a thousand miles begins with a single step. Start your preparation today.' },
  { heading: 'Rise\nAbove\nThe Rest', text: 'Don\'t limit your challenges. Challenge your limits. Every expert was once a beginner.' },
  { heading: 'Create\nYour\nPath', text: 'The best time to plant a tree was 20 years ago. The second best time is now.' },
  { heading: 'Aim\nFor The\nStars', text: 'Shoot for the moon. Even if you miss, you\'ll land among the stars. Dream big.' },
  { heading: 'Believe\nIn\nYourself', text: 'Whether you think you can or you think you can\'t, you\'re right. Believe in your potential.' },
  { heading: 'Embrace\nThe\nChallenge', text: 'The harder the struggle, the more glorious the triumph. Great things never came from comfort zones.' },
];

export default function RegisterPage() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const quote = useMemo(() => wiseQuotes[Math.floor(Math.random() * wiseQuotes.length)], []);

  if (user) {
    navigate(user.isProfileComplete ? '/dashboard' : '/complete-profile', { replace: true });
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await register(email, password);
      navigate('/complete-profile');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#fff',
  };

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

      {/* Right Panel - Register Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-12">
            <img src="/keclogo.png" alt="KEC" className="h-9 w-9 object-contain" />
            <span className="font-bold text-lg text-white">KEC EXAM PREPARATION</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl font-extrabold text-white mb-2" style={{ fontFamily: 'Georgia, serif' }}>
            Create Account
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--warm-muted)' }}>
            Join KEC IOE Mock Exam platform to start practicing
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
                style={inputStyle}
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
                  style={inputStyle}
                  placeholder="Min 8 characters"
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

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Confirm Password</label>
              <input
                type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl outline-none transition text-sm"
                style={inputStyle}
                placeholder="Re-enter your password"
                onFocus={e => e.target.style.borderColor = 'var(--warm-accent)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
              />
            </div>

            {/* Submit */}
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
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          {/* Bottom link */}
          <p className="text-center text-sm mt-10" style={{ color: 'var(--warm-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-semibold transition" style={{ color: 'var(--warm-accent)' }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
