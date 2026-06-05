import React, { useState, useEffect } from 'react';
import { Save, KeyRound, Mail, Eye, EyeOff, CheckCircle } from 'lucide-react';
import api from '../../lib/api';

export default function AdminSettings() {
  const [email, setEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState('');
  const [emailError, setEmailError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    api.get('/admin/me').then(r => { setEmail(r.data.email); setNewEmail(r.data.email); });
  }, []);

  async function handleEmailSave(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(''); setEmailSuccess('');
    if (!newEmail.trim()) return setEmailError('Email is required');
    setEmailSaving(true);
    try {
      const { data } = await api.patch('/admin/me', { email: newEmail.trim() });
      setEmail(data.email);
      setNewEmail(data.email);
      setEmailSuccess('Email updated successfully');
    } catch (err: any) {
      setEmailError(err.response?.data?.error || 'Failed to update email');
    } finally {
      setEmailSaving(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setPwError(''); setPwSuccess('');
    if (!currentPassword) return setPwError('Enter your current password');
    if (!newPassword) return setPwError('Enter a new password');
    if (newPassword.length < 8) return setPwError('Password must be at least 8 characters');
    if (newPassword !== confirmPassword) return setPwError('Passwords do not match');
    setPwSaving(true);
    try {
      await api.patch('/admin/me', { currentPassword, newPassword });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setPwSuccess('Password updated successfully');
    } catch (err: any) {
      setPwError(err.response?.data?.error || 'Failed to update password');
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--warm-text)' }}>Account Settings</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--warm-muted)' }}>Update your admin email and password</p>

      {/* Email Section */}
      <div className="warm-card p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <Mail className="h-5 w-5" style={{ color: 'var(--kec-blue)' }} />
          <h2 className="font-semibold text-base" style={{ color: 'var(--warm-text)' }}>Email Address</h2>
        </div>
        <form onSubmit={handleEmailSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--warm-muted)' }}>Email</label>
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              className="warm-input w-full"
              placeholder="admin@kec.edu.np"
            />
          </div>
          {emailError && <p className="text-xs text-red-500">{emailError}</p>}
          {emailSuccess && (
            <div className="flex items-center gap-2 text-xs text-green-600">
              <CheckCircle className="h-4 w-4" /> {emailSuccess}
            </div>
          )}
          <button
            type="submit"
            disabled={emailSaving || newEmail === email}
            className="warm-btn flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {emailSaving ? 'Saving…' : 'Save Email'}
          </button>
        </form>
      </div>

      {/* Password Section */}
      <div className="warm-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <KeyRound className="h-5 w-5" style={{ color: 'var(--kec-blue)' }} />
          <h2 className="font-semibold text-base" style={{ color: 'var(--warm-text)' }}>Change Password</h2>
        </div>
        <form onSubmit={handlePasswordSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--warm-muted)' }}>Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="warm-input w-full pr-10"
                placeholder="Enter current password"
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowCurrent(v => !v)} style={{ color: 'var(--warm-muted)' }}>
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--warm-muted)' }}>New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="warm-input w-full pr-10"
                placeholder="At least 8 characters"
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowNew(v => !v)} style={{ color: 'var(--warm-muted)' }}>
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--warm-muted)' }}>Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="warm-input w-full pr-10"
                placeholder="Repeat new password"
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowConfirm(v => !v)} style={{ color: 'var(--warm-muted)' }}>
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {pwError && <p className="text-xs text-red-500">{pwError}</p>}
          {pwSuccess && (
            <div className="flex items-center gap-2 text-xs text-green-600">
              <CheckCircle className="h-4 w-4" /> {pwSuccess}
            </div>
          )}
          <button
            type="submit"
            disabled={pwSaving}
            className="warm-btn flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {pwSaving ? 'Saving…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
