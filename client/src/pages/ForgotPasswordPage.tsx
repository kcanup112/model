import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, ArrowLeft } from 'lucide-react';
import api from '../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setMessage(data.message || 'If an account exists for that email, a reset link has been sent.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--warm-dark)' }}>
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-12">
          <img src="/keclogo.png" alt="KEC" className="h-9 w-9 object-contain" />
          <span className="font-bold text-lg text-white">KEC EXAM PREPARATION</span>
        </div>

        <h1 className="text-4xl font-extrabold text-white mb-2" style={{ fontFamily: 'Georgia, serif' }}>
          Forgot Password
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--warm-muted)' }}>
          Enter your email and we'll send you a link to reset your password.
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

          <button
            type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
            style={{ background: 'var(--warm-accent)', color: 'var(--warm-dark)' }}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="text-center text-sm mt-10" style={{ color: 'var(--warm-muted)' }}>
          <Link to="/login" className="font-semibold inline-flex items-center gap-1" style={{ color: 'var(--warm-accent)' }}>
            <ArrowLeft className="h-4 w-4" /> Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}
