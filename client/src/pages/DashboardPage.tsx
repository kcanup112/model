import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { computeGamification } from '../lib/gamification';
import type { Attempt as GAttempt, Exam as GExam } from '../lib/gamification';
import {
  Play, Clock, Trophy, BarChart3, ChevronRight, Target,
  TrendingUp, BookOpen, Award, ChevronDown, Lock, Flame, Zap,
  Layers, FileText, Star,
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface TopicDist {
  oneMarkCount: number;
  twoMarkCount: number;
  topic: { name: string; subject: { name: string } };
}
interface Exam {
  id: string;
  name: string;
  durationMinutes: number;
  totalMarks: number;
  topicDistribution?: TopicDist[];
}
interface Attempt {
  id: string;
  totalScore: number;
  timeTakenSeconds: number;
  finishedAt: string;
  examId?: string;
  exam: { name: string; totalMarks: number };
}

// Subject display helpers
const SUBJECT_META: Record<string, { icon: string; color: string }> = {
  Physics: { icon: '⚡', color: '#60a5fa' },
  Chemistry: { icon: '🧪', color: '#34d399' },
  Mathematics: { icon: '📐', color: '#a78bfa' },
  English: { icon: '📖', color: '#fb923c' },
};

function getExamSubjects(exam: Exam): string[] {
  if (!exam.topicDistribution?.length) return [];
  const set = new Set(exam.topicDistribution.map(td => td.topic.subject.name));
  return Array.from(set);
}

function getExamQuestionCount(exam: Exam): number {
  if (!exam.topicDistribution?.length) return 0;
  return exam.topicDistribution.reduce((s, td) => s + td.oneMarkCount + td.twoMarkCount, 0);
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/exams').then(r => setExams(r.data)),
      api.get('/exams/attempts').then(r => setAttempts(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  // Computed stats
  const avgScore = attempts.length > 0
    ? Math.round(attempts.reduce((s, a) => s + a.totalScore, 0) / attempts.length) : 0;
  const bestScore = attempts.length > 0
    ? Math.max(...attempts.map(a => a.totalScore)) : 0;
  const totalTime = attempts.reduce((s, a) => s + (a.timeTakenSeconds || 0), 0);
  const totalHours = (totalTime / 3600).toFixed(1);

  // Gamification
  const gData = useMemo(
    () => computeGamification(attempts as GAttempt[], exams as GExam[]),
    [attempts, exams],
  );

  // Best score per exam for status badges
  const bestByExam = useMemo(() => {
    const map: Record<string, { best: number; count: number }> = {};
    for (const a of attempts) {
      const key = a.exam.name;
      if (!map[key]) map[key] = { best: -Infinity, count: 0 };
      map[key].best = Math.max(map[key].best, a.totalScore);
      map[key].count++;
    }
    return map;
  }, [attempts]);

  const displayName = user?.profile?.fullName || user?.email || 'Student';
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--warm-bg)' }}>
      <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--warm-accent)' }} />
    </div>
  );

  return (
    <div className="min-h-screen py-6 sm:py-8 px-3 sm:px-6" style={{ background: 'var(--warm-bg)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ═══════════ LEFT SIDEBAR ═══════════ */}
          <aside className="w-full lg:w-72 flex-shrink-0 gamify-enter">

            {/* Avatar + Level */}
            <div className="warm-card p-5 text-center mb-4">
              <div className="gamify-level-ring inline-block mb-3" style={{ background: `linear-gradient(135deg, ${gData.level.color}, ${gData.level.color}88)` }}>
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-extrabold"
                  style={{ background: 'var(--warm-card)', color: gData.level.color }}>
                  {initials}
                </div>
              </div>
              <h2 className="text-base font-bold" style={{ color: 'var(--warm-text)' }}>{displayName}</h2>
              <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: `${gData.level.color}18`, color: gData.level.color }}>
                <Zap className="h-3 w-3" />
                Level {gData.level.level} · {gData.level.title}
              </div>
              <div className="mt-3 text-xs" style={{ color: 'var(--warm-muted)' }}>
                {gData.xp} XP total
              </div>
            </div>

            {/* Mini Stats */}
            <div className="warm-card p-4 mb-4 gamify-enter gamify-enter-d1">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--warm-muted)' }}>Stats</h3>
              <div className="space-y-0.5">
                <div className="gamify-stat-row">
                  <div className="stat-icon" style={{ background: 'var(--warm-accent-light)' }}>
                    <BookOpen className="h-3.5 w-3.5" style={{ color: 'var(--warm-accent)' }} />
                  </div>
                  <span className="text-xs flex-1" style={{ color: 'var(--warm-muted)' }}>Exams</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--warm-text)' }}>{attempts.length}</span>
                </div>
                <div className="gamify-stat-row">
                  <div className="stat-icon" style={{ background: '#eff6ff' }}>
                    <Target className="h-3.5 w-3.5" style={{ color: '#60a5fa' }} />
                  </div>
                  <span className="text-xs flex-1" style={{ color: 'var(--warm-muted)' }}>Avg Score</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--warm-text)' }}>{avgScore}</span>
                </div>
                <div className="gamify-stat-row">
                  <div className="stat-icon" style={{ background: '#f0fdf4' }}>
                    <Award className="h-3.5 w-3.5" style={{ color: '#34d399' }} />
                  </div>
                  <span className="text-xs flex-1" style={{ color: 'var(--warm-muted)' }}>Best</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--warm-text)' }}>{bestScore}</span>
                </div>
                <div className="gamify-stat-row">
                  <div className="stat-icon" style={{ background: '#fdf4ff' }}>
                    <Clock className="h-3.5 w-3.5" style={{ color: '#a78bfa' }} />
                  </div>
                  <span className="text-xs flex-1" style={{ color: 'var(--warm-muted)' }}>Study</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--warm-text)' }}>{totalHours}<span className="text-xs font-normal ml-0.5" style={{ color: 'var(--warm-muted)' }}>h</span></span>
                </div>
              </div>
            </div>

            {/* Achievements */}
            <div className="warm-card p-4 gamify-enter gamify-enter-d2">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--warm-muted)' }}>Achievements</h3>
              <div className="grid grid-cols-4 gap-2">
                {gData.achievements.map(a => (
                  <div key={a.id} className="flex flex-col items-center gap-1 group relative">
                    <div className={`gamify-badge ${a.unlocked ? 'unlocked' : 'locked'}`}>
                      {a.unlocked ? (
                        <span>{a.icon}</span>
                      ) : (
                        <Lock className="h-4 w-4" style={{ color: '#d1d5db' }} />
                      )}
                    </div>
                    <span className="text-[9px] text-center leading-tight font-medium truncate w-full"
                      style={{ color: a.unlocked ? 'var(--warm-text)' : '#d1d5db' }}>
                      {a.title}
                    </span>
                    {/* Tooltip */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {a.description}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-center">
                <span className="text-[10px] font-medium" style={{ color: 'var(--warm-muted)' }}>
                  {gData.achievements.filter(a => a.unlocked).length}/{gData.achievements.length} unlocked
                </span>
              </div>
            </div>
          </aside>

          {/* ═══════════ MAIN CONTENT ═══════════ */}
          <main className="flex-1 min-w-0">

            {/* XP Progress + Streak Row */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6 gamify-enter gamify-enter-d1">
              {/* XP bar */}
              <div className="warm-card p-4 flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" style={{ color: gData.level.color }} />
                    <span className="text-xs font-bold" style={{ color: 'var(--warm-text)' }}>
                      Level {gData.level.level}
                    </span>
                  </div>
                  <span className="text-xs font-medium" style={{ color: 'var(--warm-muted)' }}>
                    {gData.nextLevel
                      ? `${gData.xpInLevel} / ${gData.xpForNextLevel} XP`
                      : 'MAX LEVEL'}
                  </span>
                </div>
                <div className="gamify-xp-bar">
                  <div className="gamify-xp-fill" style={{ width: `${gData.levelProgressPct}%` }} />
                </div>
                {gData.nextLevel && (
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[10px]" style={{ color: 'var(--warm-muted)' }}>
                      {gData.level.title}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--warm-muted)' }}>
                      {gData.nextLevel.title}
                    </span>
                  </div>
                )}
              </div>

              {/* Streak */}
              <div className="warm-card p-4 flex items-center justify-center sm:w-44">
                <div className={`gamify-streak ${gData.streak > 0 ? 'active' : 'inactive'}`}>
                  <Flame className="h-5 w-5" />
                  <span className="text-xl font-extrabold">{gData.streak}</span>
                  <span className="text-xs">day{gData.streak !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>

            {/* Practice Modes */}
            <div className="mb-6 gamify-enter gamify-enter-d2">
              <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--warm-text)' }}>Practice Modes</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => navigate('/levels')}
                  className="warm-card p-4 flex flex-col items-start gap-2 text-left hover:shadow-md transition-shadow"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.12)' }}>
                    <Layers className="h-5 w-5" style={{ color: '#6366f1' }} />
                  </div>
                  <div>
                    <div className="text-sm font-bold" style={{ color: 'var(--warm-text)' }}>Level Practice</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--warm-muted)' }}>Topic-by-topic questions</div>
                  </div>
                  <span className="text-xs font-semibold mt-auto flex items-center gap-1" style={{ color: '#6366f1' }}>
                    Start <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </button>

                <button
                  onClick={() => navigate('/mock-exam')}
                  className="warm-card p-4 flex flex-col items-start gap-2 text-left hover:shadow-md transition-shadow"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(14,165,233,0.12)' }}>
                    <FileText className="h-5 w-5" style={{ color: '#0ea5e9' }} />
                  </div>
                  <div>
                    <div className="text-sm font-bold" style={{ color: 'var(--warm-text)' }}>Full Mock Exam</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--warm-muted)' }}>140 marks · IOE pattern</div>
                  </div>
                  <span className="text-xs font-semibold mt-auto flex items-center gap-1" style={{ color: '#0ea5e9' }}>
                    Start <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </button>

                <button
                  onClick={() => navigate('/special-exams')}
                  className="warm-card p-4 flex flex-col items-start gap-2 text-left hover:shadow-md transition-shadow"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.12)' }}>
                    <Star className="h-5 w-5" style={{ color: '#f59e0b' }} />
                  </div>
                  <div>
                    <div className="text-sm font-bold" style={{ color: 'var(--warm-text)' }}>Special Exams</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--warm-muted)' }}>Curated practice sets</div>
                  </div>
                  <span className="text-xs font-semibold mt-auto flex items-center gap-1" style={{ color: '#f59e0b' }}>
                    Start <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </button>
              </div>
            </div>

            {/* Subject Progress */}
            {gData.subjectProgress.length > 0 && (
              <div className="warm-card p-5 mb-6 gamify-enter gamify-enter-d2">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-4 w-4" style={{ color: 'var(--warm-accent)' }} />
                  <h3 className="text-sm font-bold" style={{ color: 'var(--warm-text)' }}>Subject Mastery</h3>
                </div>
                <div className="space-y-3">
                  {gData.subjectProgress.map(sp => (
                    <div key={sp.subject}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold" style={{ color: 'var(--warm-text)' }}>{sp.subject}</span>
                        <span className="text-xs font-bold" style={{ color: sp.color }}>{sp.avgScorePct}%</span>
                      </div>
                      <div className="gamify-subject-bar">
                        <div className="gamify-subject-fill" style={{ width: `${sp.avgScorePct}%`, background: sp.color }} />
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-[10px]" style={{ color: 'var(--warm-muted)' }}>{sp.attempts} attempt{sp.attempts !== 1 ? 's' : ''}</span>
                        <span className="text-[10px]" style={{ color: 'var(--warm-muted)' }}>Best: {sp.bestScorePct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Exams */}
            <div className="mb-6 gamify-enter gamify-enter-d3">
              <div className="flex items-center gap-2 mb-4">
                <Play className="h-5 w-5" style={{ color: 'var(--warm-accent)' }} />
                <h2 className="text-base font-bold" style={{ color: 'var(--warm-text)' }}>Available Exams</h2>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ background: 'var(--warm-accent-light)', color: 'var(--warm-accent)' }}>
                  {exams.length}
                </span>
              </div>

              <div className="space-y-3">
                {exams.map((exam, idx) => {
                  const subjects = getExamSubjects(exam);
                  const qCount = getExamQuestionCount(exam);
                  const examStats = bestByExam[exam.name];
                  const isNew = !examStats;
                  const isFirstNew = isNew && exams.slice(0, idx).every(e => !!bestByExam[e.name]);

                  return (
                    <div key={exam.id}
                      className={`exam-card warm-card p-0 overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer ${isFirstNew ? 'exam-card-featured' : ''}`}
                      onClick={() => navigate(`/exam/${exam.id}`)}>

                      {/* Recommended badge for first unattempted exam */}
                      {isFirstNew && (
                        <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
                          style={{ background: 'linear-gradient(90deg, #fef3c7, #fde68a)', color: '#92400e' }}>
                          <span>⭐</span> Recommended Next
                        </div>
                      )}

                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Left: info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-bold text-sm truncate" style={{ color: 'var(--kec-blue)' }}>{exam.name}</h3>
                              {/* Status badge */}
                              {isNew ? (
                                <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                                  style={{ background: '#dbeafe', color: '#1d4ed8' }}>
                                  NEW
                                </span>
                              ) : (
                                <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                                  style={{ background: 'rgba(107,154,91,0.12)', color: '#5a8a4a' }}>
                                  Best: {examStats.best}/{exam.totalMarks}
                                </span>
                              )}
                            </div>

                            {/* Subject pills */}
                            {subjects.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-2.5">
                                {subjects.map(s => {
                                  const meta = SUBJECT_META[s] || { icon: '📋', color: '#94a3b8' };
                                  return (
                                    <span key={s}
                                      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                      style={{ background: `${meta.color}14`, color: meta.color }}>
                                      {meta.icon} {s}
                                    </span>
                                  );
                                })}
                              </div>
                            )}

                            {/* Meta row */}
                            <div className="flex flex-wrap items-center gap-3 text-[11px]" style={{ color: 'var(--warm-muted)' }}>
                              <span className="flex items-center gap-1">
                                <BarChart3 className="h-3 w-3" /> {qCount || '100'} Qs
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {exam.durationMinutes}m
                              </span>
                              <span className="flex items-center gap-1">
                                <Trophy className="h-3 w-3" /> {exam.totalMarks} marks
                              </span>
                              {examStats && (
                                <span className="flex items-center gap-1">
                                  <BookOpen className="h-3 w-3" /> {examStats.count} attempt{examStats.count !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right: CTA */}
                          <button
                            className="flex-shrink-0 self-center warm-btn flex items-center gap-1.5 text-xs !py-2 !px-4"
                            onClick={e => { e.stopPropagation(); navigate(`/exam/${exam.id}`); }}>
                            {isNew ? 'Start' : 'Retake'}
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {exams.length === 0 && (
                  <div className="warm-card text-center py-10" style={{ color: 'var(--warm-muted)' }}>
                    No exams available yet. Check back soon!
                  </div>
                )}
              </div>
            </div>

            {/* Past Attempts (collapsible) */}
            <Collapsible open={historyOpen} onOpenChange={setHistoryOpen} className="gamify-enter gamify-enter-d4">
              <CollapsibleTrigger className="flex items-center gap-2 mb-3 cursor-pointer group w-full">
                <TrendingUp className="h-4 w-4" style={{ color: 'var(--warm-accent)' }} />
                <span className="text-sm font-bold" style={{ color: 'var(--warm-text)' }}>Past Attempts</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ background: 'var(--warm-accent-light)', color: 'var(--warm-accent)' }}>
                  {attempts.length}
                </span>
                <ChevronDown
                  className="h-4 w-4 ml-auto transition-transform duration-200"
                  style={{
                    color: 'var(--warm-muted)',
                    transform: historyOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                {attempts.length > 0 ? (
                  <div className="warm-card overflow-x-auto">
                    <Table className="min-w-[500px]">
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--warm-muted)' }}>Exam</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--warm-muted)' }}>Score</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--warm-muted)' }}>XP</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--warm-muted)' }}>Time</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--warm-muted)' }}>Date</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attempts.map(a => {
                          const pct = a.exam.totalMarks > 0 ? a.totalScore / a.exam.totalMarks : 0;
                          let xpEarned = Math.max(Math.round(pct * 100), 10);
                          if (pct >= 0.9) xpEarned += 50;
                          else if (pct >= 0.8) xpEarned += 25;
                          return (
                            <TableRow key={a.id} className="hover:bg-amber-50/40">
                              <TableCell className="font-semibold text-xs" style={{ color: 'var(--warm-text)' }}>{a.exam.name}</TableCell>
                              <TableCell>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold"
                                  style={{
                                    background: pct >= 0.6 ? 'rgba(107,154,91,0.12)' : 'rgba(192,57,43,0.12)',
                                    color: pct >= 0.6 ? '#5a8a4a' : '#c0392b',
                                  }}>
                                  {a.totalScore}<span className="font-normal" style={{ color: 'var(--warm-muted)' }}>/{a.exam.totalMarks}</span>
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="text-xs font-bold" style={{ color: '#f0c84d' }}>+{xpEarned}</span>
                              </TableCell>
                              <TableCell className="text-xs" style={{ color: 'var(--warm-muted)' }}>{Math.floor((a.timeTakenSeconds || 0) / 60)}m</TableCell>
                              <TableCell className="text-xs" style={{ color: 'var(--warm-muted)' }}>{new Date(a.finishedAt).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <Link to={`/exam/${a.id}/result/${a.id}`}
                                  className="text-[10px] font-semibold px-2 py-1 rounded-md transition"
                                  style={{ color: 'var(--kec-blue)', background: 'rgba(30,58,95,0.08)' }}>
                                  Review
                                </Link>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="warm-card text-center py-10 text-sm" style={{ color: 'var(--warm-muted)' }}>
                    No attempts yet. Take your first mock exam!
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </main>
        </div>
      </div>
    </div>
  );
}
