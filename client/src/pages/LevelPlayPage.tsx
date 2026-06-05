import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock, ChevronLeft, ChevronRight, Send, Star, Trophy,
  AlertTriangle, ArrowLeft, RotateCcw, ChevronUp, ChevronDown,
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
}

interface Result {
  attemptId: string;
  correctAnswers: number;
  totalQuestions: number;
  score: number;
  isPassed: boolean;
  stars: number;
  levelNumber: number;
  subLevel: number;
}

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;
type OptionKey = typeof OPTION_KEYS[number];

function StarDisplay({ stars, total = 3 }: { stars: number; total?: number }) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <Star
          key={i}
          className={`h-8 w-8 transition-all duration-300 ${i < stars ? 'scale-110' : 'scale-90 opacity-30'}`}
          fill={i < stars ? '#f59e0b' : 'none'}
          stroke={i < stars ? '#f59e0b' : '#d1d5db'}
        />
      ))}
    </div>
  );
}

export default function LevelPlayPage() {
  const { level, sublevel } = useParams<{ level: string; sublevel: string }>();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<'loading' | 'intro' | 'exam' | 'result' | 'error'>('loading');
  const [error, setError] = useState('');
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(600); // 10 min per sub-level
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [showNav, setShowNav] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const levelNum = parseInt(level || '1');
  const subLevelNum = parseInt(sublevel || '1');

  // Transition from loading to intro on mount
  useEffect(() => {
    setPhase('intro');
  }, [levelNum, subLevelNum]);

  const handleSubmit = useCallback(async (auto = false) => {
    if (!attemptId || submitting) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/levels/attempts/${attemptId}/submit`, { answers });
      setResult(data);
      setPhase('result');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }, [attemptId, answers, submitting]);

  // Timer
  useEffect(() => {
    if (phase !== 'exam') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, handleSubmit]);

  async function startExam() {
    setPhase('loading');
    try {
      const { data } = await api.post(`/levels/${levelNum}/sublevel/${subLevelNum}/start`);
      setAttemptId(data.attemptId);
      setQuestions(data.questions);
      setAnswers(data.answers || {});
      setCurrentIndex(0);
      setTimeLeft(data.questions.length * 30); // 30s per question
      setPhase('exam');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start sub-level');
      setPhase('error');
    }
  }

  function selectAnswer(questionId: string, option: string) {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
    if (attemptId) {
      api.patch(`/levels/attempts/${attemptId}/answer`, { questionId, selectedOption: option }).catch(() => {});
    }
  }

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const timerColor = timeLeft < 60 ? '#ef4444' : timeLeft < 120 ? '#f59e0b' : 'var(--warm-muted)';

  const answered = Object.keys(answers).length;
  const q = questions[currentIndex];

  // ── Intro Screen ──────────────────────────────────────────────
  if (phase === 'intro' || phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--warm-bg)' }}>
        <div className="warm-card max-w-sm w-full p-8 text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl font-black"
            style={{ background: 'var(--kec-blue, #1e40af)', color: 'white' }}>
            {levelNum}
          </div>
          <h2 className="text-xl font-extrabold mb-1" style={{ color: 'var(--warm-text)' }}>
            Level {levelNum} — Sub-level {subLevelNum}
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--warm-muted)' }}>
            20 questions &bull; Timer starts when you begin
          </p>
          <div className="text-xs mb-6 space-y-1.5" style={{ color: 'var(--warm-muted)' }}>
            <p>Answer all questions before time runs out.</p>
            <p>Score &ge;50% (10/20) to pass and unlock the next sub-level.</p>
            <p style={{ color: '#f59e0b' }}>85%+ earns 3 stars &bull; 70%+ earns 2 stars &bull; 50%+ earns 1 star</p>
          </div>
          <button onClick={startExam} className="warm-btn w-full" disabled={phase === 'loading'}>
            {phase === 'loading' ? 'Loading...' : 'Start Sub-level'}
          </button>
          <button onClick={() => navigate('/levels')} className="mt-3 w-full text-sm py-2"
            style={{ color: 'var(--warm-muted)' }}>
            Back to levels
          </button>
        </div>
      </div>
    );
  }

  // ── Error Screen ─────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--warm-bg)' }}>
        <div className="warm-card max-w-sm w-full p-8 text-center">
          <AlertTriangle className="h-10 w-10 mx-auto mb-3" style={{ color: 'var(--kec-red, #ef4444)' }} />
          <p className="font-semibold mb-4" style={{ color: 'var(--warm-text)' }}>{error}</p>
          <button onClick={() => navigate('/levels')} className="warm-btn w-full">Back to Levels</button>
        </div>
      </div>
    );
  }

  // ── Result Screen ─────────────────────────────────────────────
  if (phase === 'result' && result) {
    const pct = Math.round((result.correctAnswers / result.totalQuestions) * 100);
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--warm-bg)' }}>
        <div className="warm-card max-w-sm w-full p-8 text-center">
          <div className="mb-2 text-sm font-medium" style={{ color: 'var(--warm-muted)' }}>
            Level {result.levelNumber} — Sub-level {result.subLevel}
          </div>

          <div className="flex justify-center mb-4">
            <StarDisplay stars={result.stars} />
          </div>

          <div className="text-4xl font-black mb-1" style={{ color: result.isPassed ? '#22c55e' : '#ef4444' }}>
            {pct}%
          </div>
          <div className="text-sm mb-1" style={{ color: 'var(--warm-muted)' }}>
            {result.correctAnswers} / {result.totalQuestions} correct
          </div>
          {/* Score bar */}
          <div className="h-3 rounded-full overflow-hidden mb-6" style={{ background: 'var(--warm-border)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: result.isPassed ? '#22c55e' : '#ef4444' }}
            />
          </div>

          <div className="space-y-2">
            {result.subLevel < 6 ? (
              <button
                onClick={() => navigate(`/levels/${result.levelNumber}/sublevel/${result.subLevel + 1}`)}
                className="warm-btn w-full flex items-center justify-center gap-2"
              >
                Next Sub-level <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => navigate('/levels')}
                className="warm-btn w-full flex items-center justify-center gap-2"
              >
                <Trophy className="h-4 w-4" /> Level Complete!
              </button>
            )}
            <button
              onClick={() => { setPhase('intro'); setResult(null); }}
              className="w-full py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-medium border"
              style={{ borderColor: 'var(--warm-border)', color: 'var(--warm-muted)' }}
            >
              <RotateCcw className="h-4 w-4" /> Try Again
            </button>
            <button onClick={() => navigate('/levels')} className="w-full py-2 text-sm" style={{ color: 'var(--warm-muted)' }}>
              Back to Levels
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Exam Screen ───────────────────────────────────────────────
  if (phase === 'exam' && q) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--warm-bg)' }}>
        {/* Top bar */}
        <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
          style={{ background: 'var(--warm-cream)', borderBottom: '1px solid var(--warm-border)' }}>
          <button onClick={() => navigate('/levels')} className="p-1 rounded-lg hover:bg-amber-50">
            <ArrowLeft className="h-4 w-4" style={{ color: 'var(--warm-muted)' }} />
          </button>
          <div className="flex-1">
            <div className="text-xs font-medium" style={{ color: 'var(--warm-muted)' }}>
              Level {levelNum} · Sub-level {subLevelNum}
            </div>
            {/* Progress bar */}
            <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--warm-border)' }}>
              <div className="h-full rounded-full transition-all" style={{
                width: `${(answered / questions.length) * 100}%`,
                background: 'var(--kec-blue, #1e40af)',
              }} />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-bold" style={{ color: timerColor }}>
            <Clock className="h-4 w-4" />
            {formatTime(timeLeft)}
          </div>
          <span className="text-xs" style={{ color: 'var(--warm-muted)' }}>{answered}/{questions.length}</span>
        </div>

        {/* Question */}
        <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full">
          <div className="warm-card p-5 mb-4">
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{ background: 'var(--kec-blue, #1e40af)', color: 'white' }}>
                {currentIndex + 1}
              </span>
              <div className="flex-1">
                <div className="text-xs mb-2 font-medium" style={{ color: 'var(--warm-muted)' }}>
                  {q.subjectName} {q.topicName ? `· ${q.topicName}` : ''}
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
              const selected = answers[q.id] === opt;
              return (
                <button
                  key={opt}
                  onClick={() => selectAnswer(q.id, opt)}
                  className="w-full flex items-start gap-3 p-4 rounded-xl text-left transition-all border-2"
                  style={{
                    background: selected ? 'rgba(30,64,175,0.08)' : 'var(--warm-card, white)',
                    borderColor: selected ? 'var(--kec-blue, #1e40af)' : 'var(--warm-border)',
                  }}
                >
                  <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: selected ? 'var(--kec-blue, #1e40af)' : 'var(--warm-border)',
                      color: selected ? 'white' : 'var(--warm-muted)',
                    }}>
                    {opt}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--warm-text)' }}>
                    <MathText text={text} />
                  </span>
                </button>
              );
            })}
          </div>

          {/* Navigation */}
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
            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex(i => i + 1)}
                className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'var(--kec-blue, #1e40af)', color: 'white' }}
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => handleSubmit()}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
                style={{ background: '#22c55e', color: 'white' }}
              >
                <Send className="h-4 w-4" />
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            )}
          </div>
        </div>

        {/* Question grid toggle */}
        <div className="sticky bottom-0" style={{ background: 'var(--warm-cream)', borderTop: '1px solid var(--warm-border)' }}>
          <button
            className="w-full py-2 flex items-center justify-center gap-2 text-xs font-medium"
            style={{ color: 'var(--warm-muted)' }}
            onClick={() => setShowNav(v => !v)}
          >
            {showNav ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            All Questions
          </button>
          {showNav && (
            <div className="px-4 pb-4 flex flex-wrap gap-2 justify-center">
              {questions.map((q2, i) => (
                <button
                  key={q2.id}
                  onClick={() => { setCurrentIndex(i); setShowNav(false); }}
                  className="w-8 h-8 rounded-lg text-xs font-bold border-2 transition-all"
                  style={{
                    background: answers[q2.id] ? 'var(--kec-blue, #1e40af)' : 'transparent',
                    borderColor: currentIndex === i ? 'var(--kec-blue, #1e40af)' : 'var(--warm-border)',
                    color: answers[q2.id] ? 'white' : 'var(--warm-muted)',
                  }}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => handleSubmit()}
                disabled={submitting}
                className="ml-2 px-4 h-8 rounded-lg text-xs font-bold"
                style={{ background: '#22c55e', color: 'white' }}
              >
                {submitting ? '...' : 'Submit'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--warm-bg)' }}>
      <button onClick={() => setPhase('intro')} className="warm-btn">Start Level {levelNum} — Sub-level {subLevelNum}</button>
    </div>
  );
}
