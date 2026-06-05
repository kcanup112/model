import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, BookOpen, Target, AlertTriangle, Send, ChevronLeft, ChevronRight,
  BarChart3, ArrowRight, ChevronUp, ChevronDown, Flag,
} from 'lucide-react';
import api from '../lib/api';
import MathText from '../components/ui/MathText';

interface Question {
  id: string;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  weightage: number;
  subjectName: string;
  topicName: string;
  passageText: string | null;
}

interface SubjectBreakdown {
  correct: number;
  wrong: number;
  skipped: number;
  marks: number;
}

interface Result {
  attemptId: string;
  totalScore: number;
  totalMarks: number;
  resultBreakdown: Record<string, SubjectBreakdown>;
  timeTakenSeconds: number;
}

interface MockHistory {
  id: string;
  totalScore: number;
  totalMarks: number;
  finishedAt: string;
  timeTakenSeconds: number;
}

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;
type OptionKey = typeof OPTION_KEYS[number];
const DURATION_MINUTES = 120;

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: '#4f46e5',
  Physics:     '#0ea5e9',
  Chemistry:   '#10b981',
  English:     '#f59e0b',
};

function formatTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

export default function MockExamPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'home' | 'generating' | 'exam' | 'result' | 'history'>('home');
  const [error, setError] = useState('');
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION_MINUTES * 60);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [showNav, setShowNav] = useState(false);
  const [history, setHistory] = useState<MockHistory[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!attemptId || submitting) return;
    setSubmitting(true);
    setShowSubmitConfirm(false);
    const timeTaken = DURATION_MINUTES * 60 - timeLeft;
    try {
      const { data } = await api.post(`/mock-exam/attempts/${attemptId}/submit`, {
        answers,
        timeTakenSeconds: timeTaken,
      });
      setResult(data);
      setPhase('result');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }, [attemptId, answers, submitting, timeLeft]);

  // Timer
  useEffect(() => {
    if (phase !== 'exam') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, handleSubmit]);

  async function generateExam() {
    setPhase('generating');
    setError('');
    try {
      const { data } = await api.post('/mock-exam/generate');
      setAttemptId(data.attemptId);
      setQuestions(data.questions);
      setAnswers({});
      setMarked(new Set());
      setCurrentIndex(0);
      setTimeLeft(DURATION_MINUTES * 60);
      setPhase('exam');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate exam. Make sure questions are available in the database.');
      setPhase('home');
    }
  }

  async function loadHistory() {
    try {
      const { data } = await api.get('/mock-exam/attempts');
      setHistory(data);
      setPhase('history');
    } catch { }
  }

  function selectAnswer(questionId: string, option: string) {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
    if (attemptId) {
      api.patch(`/mock-exam/attempts/${attemptId}/answer`, { questionId, selectedOption: option }).catch(() => {});
    }
  }

  const timerColor = timeLeft < 300 ? '#ef4444' : timeLeft < 600 ? '#f59e0b' : 'var(--warm-muted)';
  const q = questions[currentIndex];
  const answered = Object.keys(answers).length;

  // Group questions by subject for sidebar
  const subjectGroups = questions.reduce<Record<string, number[]>>((acc, q2, i) => {
    if (!acc[q2.subjectName]) acc[q2.subjectName] = [];
    acc[q2.subjectName].push(i);
    return acc;
  }, {});

  // ── Home ─────────────────────────────────────────────────────
  if (phase === 'home' || phase === 'generating') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--warm-bg)' }}>
        <div className="max-w-md w-full">
          <div className="warm-card p-6 sm:p-8">
            <h1 className="text-xl font-extrabold mb-1" style={{ color: 'var(--warm-text)' }}>IOE Mock Exam</h1>
            <p className="text-xs mb-6" style={{ color: 'var(--warm-muted)' }}>
              Full question bank · IOE entrance exam pattern
            </p>

            <div className="flex items-center gap-4 mb-6 pb-6" style={{ borderBottom: '1px solid var(--warm-border)' }}>
              <div className="flex items-center gap-1.5 text-sm">
                <BookOpen className="h-3.5 w-3.5" style={{ color: 'var(--warm-muted)' }} />
                <span className="font-bold" style={{ color: 'var(--warm-text)' }}>125+</span>
                <span className="text-xs" style={{ color: 'var(--warm-muted)' }}>Qs</span>
              </div>
              <div className="w-px h-4" style={{ background: 'var(--warm-border)' }} />
              <div className="flex items-center gap-1.5 text-sm">
                <Target className="h-3.5 w-3.5" style={{ color: 'var(--warm-muted)' }} />
                <span className="font-bold" style={{ color: 'var(--warm-text)' }}>140</span>
                <span className="text-xs" style={{ color: 'var(--warm-muted)' }}>marks</span>
              </div>
              <div className="w-px h-4" style={{ background: 'var(--warm-border)' }} />
              <div className="flex items-center gap-1.5 text-sm">
                <Clock className="h-3.5 w-3.5" style={{ color: 'var(--warm-muted)' }} />
                <span className="font-bold" style={{ color: 'var(--warm-text)' }}>2</span>
                <span className="text-xs" style={{ color: 'var(--warm-muted)' }}>hrs</span>
              </div>
            </div>

            {/* Subject distribution */}
            <div className="space-y-2.5 mb-6">
              <p className="text-xs font-semibold" style={{ color: 'var(--warm-muted)' }}>Distribution</p>
              {[
                { name: 'Mathematics', marks: 50, qs: '40×1 + 5×2', color: SUBJECT_COLORS['Mathematics'] },
                { name: 'Physics',     marks: 30, qs: '20×1 + 5×2', color: SUBJECT_COLORS['Physics'] },
                { name: 'Chemistry',   marks: 30, qs: '20×1 + 5×2', color: SUBJECT_COLORS['Chemistry'] },
                { name: 'English',     marks: 30, qs: '30×1',        color: SUBJECT_COLORS['English'] },
              ].map(s => (
                <div key={s.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                  <span className="font-medium w-24" style={{ color: 'var(--warm-text)' }}>{s.name}</span>
                  <span style={{ color: 'var(--warm-muted)' }}>{s.qs}</span>
                  <span className="ml-auto font-semibold" style={{ color: 'var(--warm-text)' }}>{s.marks} marks</span>
                </div>
              ))}
            </div>

            <div className="text-xs mb-4 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.07)', color: 'var(--kec-red, #dc2626)' }}>
              Wrong answers lose 10% of the question&apos;s marks (negative marking).
            </div>

            {error && (
              <div className="text-sm px-3 py-2 rounded-lg mb-4 flex items-center gap-2"
                style={{ background: 'rgba(192,57,43,0.08)', color: 'var(--kec-red, #dc2626)' }}>
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
              </div>
            )}

            <button
              onClick={generateExam}
              disabled={phase === 'generating'}
              className="warm-btn w-full flex items-center justify-center gap-2 text-sm mb-3"
            >
              {phase === 'generating' ? 'Generating...' : 'Generate & Start Exam'}
              {phase !== 'generating' && <ArrowRight className="h-4 w-4" />}
            </button>

            <button onClick={loadHistory} className="w-full text-xs py-2 flex items-center justify-center gap-2"
              style={{ color: 'var(--warm-muted)' }}>
              <BarChart3 className="h-3.5 w-3.5" /> Past attempts
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── History ───────────────────────────────────────────────────
  if (phase === 'history') {
    return (
      <div className="min-h-screen px-4 py-8 max-w-2xl mx-auto" style={{ background: 'var(--warm-bg)' }}>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setPhase('home')} className="p-2 rounded-xl hover:bg-amber-50">
            <ChevronLeft className="h-5 w-5" style={{ color: 'var(--warm-muted)' }} />
          </button>
          <h2 className="text-lg font-extrabold" style={{ color: 'var(--warm-text)' }}>Mock Exam History</h2>
        </div>
        {history.length === 0 ? (
          <div className="warm-card p-8 text-center text-sm" style={{ color: 'var(--warm-muted)' }}>No attempts yet</div>
        ) : (
          <div className="space-y-3">
            {history.map(h => (
              <div key={h.id} className="warm-card p-4 flex items-center gap-4">
                <div className="text-2xl font-black w-16 text-center" style={{ color: 'var(--kec-blue, #1e40af)' }}>
                  {Math.round(h.totalScore)}<span className="text-xs font-normal text-gray-400">/{h.totalMarks}</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold" style={{ color: 'var(--warm-text)' }}>
                    {Math.round((h.totalScore / h.totalMarks) * 100)}%
                  </div>
                  <div className="text-xs" style={{ color: 'var(--warm-muted)' }}>
                    {new Date(h.finishedAt).toLocaleDateString()} &bull; {formatTime(h.timeTakenSeconds || 0)} taken
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Result ────────────────────────────────────────────────────
  if (phase === 'result' && result) {
    const pct = result.totalMarks > 0 ? Math.round((result.totalScore / result.totalMarks) * 100) : 0;
    return (
      <div className="min-h-screen px-4 py-8 max-w-2xl mx-auto" style={{ background: 'var(--warm-bg)' }}>
        <h2 className="text-xl font-extrabold mb-1 text-center" style={{ color: 'var(--warm-text)' }}>Mock Exam Result</h2>
        <p className="text-xs text-center mb-6" style={{ color: 'var(--warm-muted)' }}>
          {formatTime(result.timeTakenSeconds || 0)} taken
        </p>

        <div className="warm-card p-6 text-center mb-4">
          <div className="text-5xl font-black mb-2" style={{ color: 'var(--kec-blue, #1e40af)' }}>{pct}%</div>
          <div className="text-sm mb-1" style={{ color: 'var(--warm-muted)' }}>
            {Math.round(result.totalScore)} / {result.totalMarks} marks
          </div>
          <div className="h-3 rounded-full overflow-hidden mt-4" style={{ background: 'var(--warm-border)' }}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--kec-blue, #1e40af)' }} />
          </div>
        </div>

        {/* Subject breakdown */}
        <div className="warm-card p-5 mb-4">
          <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--warm-text)' }}>Subject Breakdown</h3>
          <div className="space-y-3">
            {Object.entries(result.resultBreakdown).map(([subject, bd]) => {
              const color = SUBJECT_COLORS[subject] || '#6b7280';
              return (
                <div key={subject}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--warm-text)' }}>{subject}</span>
                    </div>
                    <span className="text-sm font-bold" style={{ color }}>
                      {Math.round(bd.marks * 10) / 10} marks
                    </span>
                  </div>
                  <div className="flex gap-2 text-xs" style={{ color: 'var(--warm-muted)' }}>
                    <span className="text-green-600">✓ {bd.correct}</span>
                    <span className="text-red-500">✗ {bd.wrong}</span>
                    <span>— {bd.skipped}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <button onClick={generateExam} className="warm-btn w-full flex items-center justify-center gap-2 text-sm">
            Take Another Mock Exam <ArrowRight className="h-4 w-4" />
          </button>
          <button onClick={() => setPhase('home')} className="w-full py-2 text-sm" style={{ color: 'var(--warm-muted)' }}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ── Exam ──────────────────────────────────────────────────────
  if (phase === 'exam' && q) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--warm-bg)' }}>
        {/* Top bar */}
        <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
          style={{ background: 'var(--warm-cream)', borderBottom: '1px solid var(--warm-border)' }}>
          <div className="flex-1">
            <div className="text-xs font-medium" style={{ color: 'var(--warm-muted)' }}>IOE Mock Exam</div>
            <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--warm-border)' }}>
              <div className="h-full rounded-full" style={{
                width: `${(answered / questions.length) * 100}%`,
                background: 'var(--kec-blue, #1e40af)',
              }} />
            </div>
          </div>
          <div className="text-xs" style={{ color: 'var(--warm-muted)' }}>{answered}/{questions.length}</div>
          <div className="flex items-center gap-1 font-bold text-sm" style={{ color: timerColor }}>
            <Clock className="h-4 w-4" /> {formatTime(timeLeft)}
          </div>
          <button
            onClick={() => setShowSubmitConfirm(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{ background: '#22c55e', color: 'white' }}
          >
            <Send className="h-3.5 w-3.5" /> Submit
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 max-w-3xl mx-auto w-full">
          {/* Passage */}
          {q.passageText && (
            <div className="warm-card p-4 mb-4 border-l-4" style={{ borderLeftColor: 'var(--kec-blue, #1e40af)' }}>
              <div className="text-xs font-bold mb-2" style={{ color: 'var(--warm-muted)' }}>PASSAGE</div>
              <div className="text-sm leading-relaxed" style={{ color: 'var(--warm-text)' }}>
                <MathText text={q.passageText} />
              </div>
            </div>
          )}

          {/* Question */}
          <div className="warm-card p-5 mb-4">
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{ background: 'var(--kec-blue, #1e40af)', color: 'white' }}>
                {currentIndex + 1}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: (SUBJECT_COLORS[q.subjectName] || '#6b7280') + '20', color: SUBJECT_COLORS[q.subjectName] || '#6b7280' }}>
                    {q.subjectName}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--warm-muted)' }}>{q.weightage} mark{q.weightage > 1 ? 's' : ''}</span>
                  <button
                    onClick={() => setMarked(s => { const n = new Set(s); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n; })}
                    className="ml-auto"
                  >
                    <Flag className={`h-4 w-4 ${marked.has(q.id) ? 'fill-orange-400 stroke-orange-400' : ''}`}
                      style={{ color: marked.has(q.id) ? '#f97316' : 'var(--warm-muted)' }} />
                  </button>
                </div>
                <div className="text-sm leading-relaxed font-medium" style={{ color: 'var(--warm-text)' }}>
                  <MathText text={q.text} />
                </div>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2 mb-4">
            {OPTION_KEYS.map(opt => {
              const text = q[`option${opt}` as keyof Question] as string;
              const sel = answers[q.id] === opt;
              return (
                <button
                  key={opt}
                  onClick={() => selectAnswer(q.id, opt)}
                  className="w-full flex items-start gap-3 p-4 rounded-xl text-left transition-all border-2"
                  style={{
                    background: sel ? 'rgba(30,64,175,0.08)' : 'var(--warm-card, white)',
                    borderColor: sel ? 'var(--kec-blue, #1e40af)' : 'var(--warm-border)',
                  }}
                >
                  <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: sel ? 'var(--kec-blue, #1e40af)' : 'var(--warm-border)', color: sel ? 'white' : 'var(--warm-muted)' }}>
                    {opt}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--warm-text)' }}><MathText text={text} /></span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium border disabled:opacity-40"
              style={{ borderColor: 'var(--warm-border)', color: 'var(--warm-text)' }}
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <div className="flex-1" />
            <button
              onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))}
              disabled={currentIndex === questions.length - 1}
              className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium border disabled:opacity-40"
              style={{ borderColor: 'var(--warm-border)', color: 'var(--warm-text)' }}
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Question grid */}
        <div className="sticky bottom-0" style={{ background: 'var(--warm-cream)', borderTop: '1px solid var(--warm-border)' }}>
          <button className="w-full py-2 flex items-center justify-center gap-2 text-xs font-medium"
            style={{ color: 'var(--warm-muted)' }} onClick={() => setShowNav(v => !v)}>
            {showNav ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            Question Navigator
          </button>
          {showNav && (
            <div className="px-4 pb-4 space-y-3 max-h-48 overflow-y-auto">
              {Object.entries(subjectGroups).map(([subj, indices]) => (
                <div key={subj}>
                  <div className="text-[10px] font-bold mb-1.5" style={{ color: SUBJECT_COLORS[subj] || '#6b7280' }}>
                    {subj}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {indices.map(i => (
                      <button
                        key={i}
                        onClick={() => { setCurrentIndex(i); setShowNav(false); }}
                        className="w-7 h-7 rounded-md text-[10px] font-bold border"
                        style={{
                          background: answers[questions[i].id] ? 'var(--kec-blue, #1e40af)' : marked.has(questions[i].id) ? '#fff7ed' : 'transparent',
                          borderColor: currentIndex === i ? 'var(--kec-blue, #1e40af)' : marked.has(questions[i].id) ? '#f97316' : 'var(--warm-border)',
                          color: answers[questions[i].id] ? 'white' : marked.has(questions[i].id) ? '#f97316' : 'var(--warm-muted)',
                        }}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Confirm Dialog */}
        {showSubmitConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40">
            <div className="warm-card p-6 max-w-sm w-full">
              <AlertTriangle className="h-8 w-8 mb-3 mx-auto" style={{ color: '#f59e0b' }} />
              <h3 className="text-base font-bold text-center mb-2" style={{ color: 'var(--warm-text)' }}>Submit Exam?</h3>
              <p className="text-sm text-center mb-4" style={{ color: 'var(--warm-muted)' }}>
                {answered}/{questions.length} questions answered. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowSubmitConfirm(false)} className="flex-1 py-2 rounded-xl border text-sm font-medium"
                  style={{ borderColor: 'var(--warm-border)', color: 'var(--warm-text)' }}>
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={submitting}
                  className="flex-1 py-2 rounded-xl text-sm font-bold"
                  style={{ background: '#22c55e', color: 'white' }}>
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
