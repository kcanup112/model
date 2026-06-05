import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { Users, BookOpen, FileQuestion, BarChart3, TrendingUp, Activity, ArrowUpRight } from 'lucide-react';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalExams: number;
  totalQuestions: number;
  totalAttempts: number;
  totalSubjects: number;
  recentAttempts: Array<{
    id: string;
    totalScore: number;
    finishedAt: string;
    user: { email: string; profile?: { fullName: string } };
    exam: { name: string; totalMarks: number };
  }>;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats').then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: 'var(--warm-accent)' }} />
    </div>
  );
  if (!stats) return null;

  const cards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, accent: '#e8b931' },
    { label: 'Active Students', value: stats.activeUsers, icon: TrendingUp, accent: '#6b9a5b' },
    { label: 'Total Questions', value: stats.totalQuestions, icon: FileQuestion, accent: '#9b7ed8' },
    { label: 'Total Exams', value: stats.totalExams, icon: BookOpen, accent: '#e8b931' },
    { label: 'Exam Attempts', value: stats.totalAttempts, icon: BarChart3, accent: '#d4795c' },
    { label: 'Subjects', value: stats.totalSubjects, icon: Activity, accent: '#5ba3c6' },
  ];

  return (
    <div>
      {/* Welcome Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold" style={{ color: 'var(--warm-text)' }}>
          Welcome in, <span style={{ color: 'var(--kec-blue)' }}>{user?.profile?.fullName || 'Admin'}</span>
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--warm-muted)' }}>
          Here's what's happening with your platform today.
        </p>
      </div>

      {/* Top Stats Bar */}
      <div className="warm-card-accent p-3 sm:p-4 mb-6 flex flex-wrap items-center gap-3 sm:gap-6">
        {[
          { label: 'Users', pct: `${stats.totalUsers}` },
          { label: 'Questions', pct: `${stats.totalQuestions}` },
          { label: 'Active', pct: `${Math.round((stats.activeUsers / (stats.totalUsers || 1)) * 100)}%` },
          { label: 'Completion', pct: `${stats.totalAttempts}` },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--warm-muted)' }}>{item.label}</span>
            <span className="px-3 py-1 rounded-full text-xs font-bold"
              style={{
                background: i === 0 ? 'var(--warm-dark)' : i === 1 ? 'var(--warm-accent)' : 'transparent',
                color: i === 0 ? '#fff' : i === 1 ? 'var(--warm-dark)' : 'var(--warm-text)',
                border: i > 1 ? '1px solid var(--warm-border)' : 'none',
              }}>
              {item.pct}
            </span>
          </div>
        ))}
      </div>

      {/* Big Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {cards.map(c => (
          <div key={c.label} className="warm-card p-3 sm:p-5 flex items-start justify-between group hover:shadow-lg transition-all duration-300">
            <div>
              <div className="text-2xl sm:text-4xl font-extrabold mb-1" style={{ color: 'var(--warm-text)' }}>{c.value}</div>
              <div className="text-[10px] sm:text-xs font-medium" style={{ color: 'var(--warm-muted)' }}>{c.label}</div>
            </div>
            <div className="p-3 rounded-2xl transition-transform group-hover:scale-110"
              style={{ background: `${c.accent}18` }}>
              <c.icon className="h-5 w-5" style={{ color: c.accent }} />
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Recent Attempts + Quick Overview */}
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">

        {/* Recent Attempts Table */}
        <div className="lg:col-span-2 warm-card overflow-x-auto">
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--warm-border)' }}>
            <h2 className="font-bold" style={{ color: 'var(--warm-text)' }}>Recent Exam Attempts</h2>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'var(--warm-accent-light)', color: 'var(--warm-accent)' }}>
              Latest
            </span>
          </div>
          {stats.recentAttempts.length === 0 ? (
            <div className="px-6 py-12 text-center" style={{ color: 'var(--warm-muted)' }}>No attempts yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--warm-cream)' }}>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--warm-muted)' }}>Student</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--warm-muted)' }}>Exam</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--warm-muted)' }}>Score</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--warm-muted)' }}>Date</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--warm-border)' }}>
                {stats.recentAttempts.map(a => (
                  <tr key={a.id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: 'var(--warm-accent-light)', color: 'var(--warm-accent)' }}>
                          {(a.user.profile?.fullName || a.user.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold" style={{ color: 'var(--warm-text)' }}>{a.user.profile?.fullName || 'N/A'}</div>
                          <div className="text-xs" style={{ color: 'var(--warm-muted)' }}>{a.user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5" style={{ color: 'var(--warm-text)' }}>{a.exam.name}</td>
                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold"
                        style={{
                          background: a.totalScore >= 0 ? 'rgba(107, 154, 91, 0.12)' : 'rgba(192, 57, 43, 0.12)',
                          color: a.totalScore >= 0 ? '#5a8a4a' : '#c0392b',
                        }}>
                        {a.totalScore}<span style={{ color: 'var(--warm-muted)', fontWeight: 400 }}>/{a.exam.totalMarks}</span>
                      </span>
                    </td>
                    <td className="px-6 py-3.5" style={{ color: 'var(--warm-muted)' }}>{new Date(a.finishedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Platform Overview - Dark Card */}
        <div className="warm-dark-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-base">Platform Overview</h3>
              <p className="text-xs text-gray-400 mt-0.5">Key metrics</p>
            </div>
            <div className="p-2 rounded-xl" style={{ background: 'rgba(232, 185, 49, 0.15)' }}>
              <ArrowUpRight className="h-4 w-4" style={{ color: 'var(--warm-accent)' }} />
            </div>
          </div>

          <div className="space-y-5">
            {[
              { label: 'User Growth', value: stats.totalUsers, max: 100 },
              { label: 'Questions Bank', value: stats.totalQuestions, max: 500 },
              { label: 'Exam Attempts', value: stats.totalAttempts, max: 200 },
              { label: 'Active Rate', value: Math.round((stats.activeUsers / (stats.totalUsers || 1)) * 100), max: 100, suffix: '%' },
            ].map((item, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-400">{item.label}</span>
                  <span className="font-bold" style={{ color: 'var(--warm-accent)' }}>
                    {item.value}{item.suffix || ''}
                  </span>
                </div>
                <div className="warm-progress-bar" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="warm-progress-fill" style={{ width: `${Math.min((item.value / item.max) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-5 border-t border-white/10">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-extrabold" style={{ color: 'var(--warm-accent)' }}>{stats.totalExams}</div>
                <div className="text-xs text-gray-500 mt-0.5">Exams</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-extrabold" style={{ color: 'var(--warm-accent)' }}>{stats.totalSubjects}</div>
                <div className="text-xs text-gray-500 mt-0.5">Subjects</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
