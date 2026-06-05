import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Clock, BookOpen, Target, AlertTriangle, Send, ChevronLeft, ChevronRight,
  ArrowRight, Trophy, ChevronUp, ChevronDown, Zap,
} from 'lucide-react';
import api from '../lib/api';
import MathText from '../components/ui/MathText';

interface SpecialExam {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  totalMarks: number;
  isActive: boolean;
  _count: { questions: number; attempts: number };
}

interface Question {
  id: string;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  weightage: number;
  subject: string | null;
  topic: string | null;
  hint: string | null;
}

interface Result {
  attemptId: string;
  totalScore: number;
  totalQuestions: number;
  timeTakenSeconds: number;
  examTitle: string;
}

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

// ── Exam List ────────────────────────────────────────────────────────────────
function SpecialExamList() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<SpecialExam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/special-exams').then(r => { setExams(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--warm-bg)' }}>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16" style={{ background: 'var(--warm-bg)' }}>
      <div className="sticky top-0 z-10 px-4 py-4"
        style={{ background: 'var(--warm-cream)', borderBottom: '1px solid var(--warm-border)' }}>
        <h1 className="text-lg font-extrabold" style={{ color: 'var(--warm-text)' }}>Special Exams</h1>
        <p className="text-xs" style={{ color: 'var(--warm-muted)' }}>Curated practice sets from our faculty</p>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-6">
        {exams.length === 0 ? (
          <div className="warm-card p-12 text-center">
            <Zap className="h-10 w-10 mx-auto mb-4" style={{ color: 'var(--warm-muted)' }} />
            <p className="font-semibold mb-1" style={{ color: 'var(--warm-text)' }}>No special exams yet</p>
            <p className="text-sm" style={{ color: 'var(--warm-muted)' }}>Check back soon — our faculty will add curated practice exams here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {exams.map(exam => (
              <div key={exam.id} className="warm-card p-5 flex flex-col">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-bold leading-snug" style={{ color: 'var(--warm-text)' }}>{exam.title}</h3>
                </div>
                {exam.description && (
                  <p className="text-xs mb-3 flex-1" style={{ color: 'var(--warm-muted)' }}>{exam.description}</p>
                )}
                <div className="flex items-center gap-3 text-xs mb-4" style={{ color: 'var(--warm-muted)' }}>
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" /> {exam._count.questions} Qs
                  </span>
                  <span className="flex items-center gap-1">
                    <Target className="h-3 w-3" /> {exam.totalMarks} marks
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {exam.durationMinutes} min
                  </span>
                </div>
                <button
                  onClick={() => navigate(`/special-exams/${exam.id}`)}
                  className="warm-btn text-xs py-2 w-full flex items-center justify-center gap-2"
                >
                  Take Exam <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Exam Play ─────────────────────────────────────────────────────────────────
function SpecialExamPlay({ examId }: { examId: string }) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'loading' | 'intro' | 'exam' | 'result' | 'error'>('loading');
  const [examInfo, setExamInfo] = useState<SpecialExam | null>(null);
  const [error, setError] = useState('');
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(3600);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [showNav, setShowNav] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api.get(`/special-exams/${examId}`)
      .then(r => { setExamInfo(r.data); setTimeLeft(r.data.durationMinutes * 60); setPhase('intro'); })
      .catch(() => { setError('Exam not found'); setPhase('error'); });
  }, [examId]);

  const handleSubmit = useCallback(async () => {
    if (!attemptId || submitting) return;
    setSubmitting(true);
    const timeTaken = (examInfo?.durationMinutes || 60) * 60 - timeLeft;
    try {
      const { data } = await api.post(`/special-exams/attempts/${attemptId}/submit`, {
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
  }, [attemptId, answers, submitting, timeLeft, examInfo]);

  useEffect(() => {
    if (phase !== 'exam') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); handleSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, handleSubmit]);

  async function startExam() {
    setPhase('loading');
    try {
      const { data } = await api.post(`/special-exams/${examId}/start`);
      setAttemptId(data.attemptId);
      setQuestions(data.questions);
      setAnswers(data.answers || {});
      setCurrentIndex(0);
      setTimeLeft(data.durationMinutes * 60);
      setPhase('exam');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start exam');
      setPhase('error');
    }
  }

  function selectAnswer(questionId: string, option: string) {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
    if (attemptId) {
      api.patch(`/special-exams/attempts/${attemptId}/answer`, { questionId, selectedOption: option }).catch(() => {});
    }
  }

  const timerColor = timeLeft < 120 ? '#ef4444' : timeLeft < 300 ? '#f59e0b' : 'var(--warm-muted)';
  const answered = Object.keys(answers).length;
  const q = questions[currentIndex];

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--warm-bg)' }}>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900" />
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--warm-bg)' }}>
        <div className="warm-card max-w-sm w-full p-8 text-center">
          <AlertTriangle className="h-10 w-10 mx-auto mb-3" style={{ color: '#ef4444' }} />
          <p className="font-semibold mb-4" style={{ color: 'var(--warm-text)' }}>{error}</p>
          <button onClick={() => navigate('/special-exams')} className="warm-btn w-full">Back to Exams</button>
        </div>
      </div>
    );
  }

  if (phase === 'intro' && examInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--warm-bg)' }}>
        <div className="warm-card max-w-md w-full p-8">
          <h2 className="text-xl font-extrabold mb-1" style={{ color: 'var(--warm-text)' }}>{examInfo.title}</h2>
          {examInfo.description && (
            <p className="text-sm mb-4" style={{ color: 'var(--warm-muted)' }}>{examInfo.description}</p>
          )}
          <div className="flex gap-4 mb-6 pb-6" style={{ borderBottom: '1px solid var(--warm-border)' }}>
            <div className="flex items-center gap-1.5 text-sm">
              <BookOpen className="h-3.5 w-3.5" style={{ color: 'var(--warm-muted)' }} />
              <span className="font-bold" style={{ color: 'var(--warm-text)' }}>{examInfo._count.questions}</span>
              <span className="text-xs" style={{ color: 'var(--warm-muted)' }}>Qs</span>
            </div>
            <div className="w-px h-4 self-center" style={{ background: 'var(--warm-border)' }} />
            <div className="flex items-center gap-1.5 text-sm">
              <Target className="h-3.5 w-3.5" style={{ color: 'var(--warm-muted)' }} />
              <span className="font-bold" style={{ color: 'var(--warm-text)' }}>{examInfo.totalMarks}</span>
              <span className="text-xs" style={{ color: 'var(--warm-muted)' }}>marks</span>
            </div>
            <div className="w-px h-4 self-center" style={{ background: 'var(--warm-border)' }} />
            <div className="flex items-center gap-1.5 text-sm">
              <Clock className="h-3.5 w-3.5" style={{ color: 'var(--warm-muted)' }} />
              <span className="font-bold" style={{ color: 'var(--warm-text)' }}>{examInfo.durationMinutes}</span>
              <span className="text-xs" style={{ color: 'var(--warm-muted)' }}>min</span>
            </div>
          </div>
          <button onClick={startExam} className="warm-btn w-full flex items-center justify-center gap-2 text-sm mb-3">
            Start Exam <ArrowRight className="h-4 w-4" />
          </button>
          <button onClick={() => navigate('/special-exams')} className="w-full text-sm py-2"
            style={{ color: 'var(--warm-muted)' }}>
            Back to list
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'result' && result) {
    const pct = questions.length > 0 ? Math.round((result.totalScore / questions.reduce((s, q2) => s + q2.weightage, 0)) * 100) : 0;
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--warm-bg)' }}>
        <div className="warm-card max-w-sm w-full p-8 text-center">
          <Trophy className="h-10 w-10 mx-auto mb-3" style={{ color: '#f59e0b' }} />
          <h3 className="text-xl font-extrabold mb-1" style={{ color: 'var(--warm-text)' }}>{result.examTitle}</h3>
          <div className="text-4xl font-black my-4" style={{ color: 'var(--kec-blue, #1e40af)' }}>{pct}%</div>
          <div className="text-sm mb-1" style={{ color: 'var(--warm-muted)' }}>
            Score: {Math.round(result.totalScore)} marks &bull; {formatTime(result.timeTakenSeconds || 0)} taken
          </div>
          <div className="h-2 rounded-full overflow-hidden my-4" style={{ background: 'var(--warm-border)' }}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--kec-blue, #1e40af)' }} />
          </div>
          <button onClick={() => navigate('/special-exams')} className="warm-btn w-full flex items-center justify-center gap-2 text-sm">
            Back to Special Exams
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'exam' && q) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--warm-bg)' }}>
        {/* Top bar */}
        <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
          style={{ background: 'var(--warm-cream)', borderBottom: '1px solid var(--warm-border)' }}>
          <div className="flex-1">
            <div className="text-xs font-medium truncate" style={{ color: 'var(--warm-muted)' }}>{examInfo?.title}</div>
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
          <button onClick={handleSubmit} disabled={submitting}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{ background: '#22c55e', color: 'white' }}>
            <Send className="h-3.5 w-3.5" /> Submit
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full">
          <div className="warm-card p-5 mb-4">
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{ background: 'var(--kec-blue, #1e40af)', color: 'white' }}>{currentIndex + 1}</span>
              <div className="flex-1">
                {(q.subject || q.topic) && (
                  <div className="text-xs mb-2 font-medium" style={{ color: 'var(--warm-muted)' }}>
                    {[q.subject, q.topic].filter(Boolean).join(' · ')}
                  </div>
                )}
                <div className="text-sm leading-relaxed font-medium" style={{ color: 'var(--warm-text)' }}>
                  <MathText text={q.text} />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            {OPTION_KEYS.map(opt => {
              const text = q[`option${opt}` as keyof Question] as string;
              const sel = answers[q.id] === opt;
              return (
                <button key={opt} onClick={() => selectAnswer(q.id, opt)}
                  className="w-full flex items-start gap-3 p-4 rounded-xl text-left transition-all border-2"
                  style={{ background: sel ? 'rgba(30,64,175,0.08)' : 'var(--warm-card, white)', borderColor: sel ? 'var(--kec-blue, #1e40af)' : 'var(--warm-border)' }}>
                  <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: sel ? 'var(--kec-blue, #1e40af)' : 'var(--warm-border)', color: sel ? 'white' : 'var(--warm-muted)' }}>
                    {opt}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--warm-text)' }}><MathText text={text} /></span>
                </button>
              );
            })}
          </div>

          {q.hint && (
            <details className="mb-4">
              <summary className="text-xs cursor-pointer" style={{ color: 'var(--warm-muted)' }}>Show hint</summary>
              <div className="mt-2 text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(245,158,11,0.08)', color: '#92400e' }}>
                {q.hint}
              </div>
            </details>
          )}

          <div className="flex items-center gap-3">
            <button onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} disabled={currentIndex === 0}
              className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium border disabled:opacity-40"
              style={{ borderColor: 'var(--warm-border)', color: 'var(--warm-text)' }}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <div className="flex-1" />
            <button onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))} disabled={currentIndex === questions.length - 1}
              className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium border disabled:opacity-40"
              style={{ borderColor: 'var(--warm-border)', color: 'var(--warm-text)' }}>
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="sticky bottom-0" style={{ background: 'var(--warm-cream)', borderTop: '1px solid var(--warm-border)' }}>
          <button className="w-full py-2 flex items-center justify-center gap-2 text-xs font-medium"
            style={{ color: 'var(--warm-muted)' }} onClick={() => setShowNav(v => !v)}>
            {showNav ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            All Questions
          </button>
          {showNav && (
            <div className="px-4 pb-4 flex flex-wrap gap-1.5">
              {questions.map((q2, i) => (
                <button key={q2.id} onClick={() => { setCurrentIndex(i); setShowNav(false); }}
                  className="w-7 h-7 rounded-md text-[10px] font-bold border"
                  style={{
                    background: answers[q2.id] ? 'var(--kec-blue, #1e40af)' : 'transparent',
                    borderColor: currentIndex === i ? 'var(--kec-blue, #1e40af)' : 'var(--warm-border)',
                    color: answers[q2.id] ? 'white' : 'var(--warm-muted)',
                  }}>
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

// ── Router wrapper ────────────────────────────────────────────────────────────
export function SpecialExamListPage() {
  return <SpecialExamList />;
}

export default function SpecialExamPlayPage() {
  const { examId } = useParams<{ examId: string }>();
  if (!examId) return null;
  return <SpecialExamPlay examId={examId} />;
}
