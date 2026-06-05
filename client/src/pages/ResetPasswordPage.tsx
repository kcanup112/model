import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff } from 'lucide-react';
import api from '../lib/api';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) setError('Missing or invalid reset token.');
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!token) { setError('Missing or invalid reset token.'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password', { token, password });
      setMessage(data.message || 'Password reset successful.');
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password.');
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
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--warm-dark)' }}>
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-12">
          <img src="/keclogo.png" alt="KEC" className="h-9 w-9 object-contain" />
          <span className="font-bold text-lg text-white">KEC EXAM PREPARATION</span>
        </div>

        <h1 className="text-4xl font-extrabold text-white mb-2" style={{ fontFamily: 'Georgia, serif' }}>
          Reset Password
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--warm-muted)' }}>
          Choose a new password for your account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="text-sm px-4 py-3 rounded-xl border" style={{
              background: 'rgba(192, 57, 43, 0.1)',
              borderColor: 'rgba(192, 57, 43, 0.2)',
              color: '#e57373',
            }}>{error}</div>
          )}
          {message && (
            <div className="text-sm px-4 py-3 rounded-xl border" style={{
              background: 'rgba(46, 125, 50, 0.1)',
              borderColor: 'rgba(46, 125, 50, 0.25)',
              color: '#a5d6a7',
            }}>{message}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-white mb-2">New Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'} required value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl outline-none text-sm pr-12"
                style={inputStyle}
                placeholder="At least 8 characters"
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'rgba(255,255,255,0.3)' }}>
                {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">Confirm Password</label>
            <input
              type={showPw ? 'text' : 'password'} required value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl outline-none text-sm"
              style={inputStyle}
              placeholder="Re-enter password"
            />
          </div>

          <button
            type="submit" disabled={loading || !token}
            className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
            style={{ background: 'var(--warm-accent)', color: 'var(--warm-dark)' }}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <p className="text-center text-sm mt-10" style={{ color: 'var(--warm-muted)' }}>
          <Link to="/login" className="font-semibold" style={{ color: 'var(--warm-accent)' }}>
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}
