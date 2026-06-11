import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExam } from '../context/ExamContext';
import { Clock, Flag, ChevronLeft, ChevronRight, AlertTriangle, Send, Grid3X3, BookOpen, Target, ArrowRight } from 'lucide-react';
import MathText from '../components/ui/MathText';

export default function ExamPage() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const exam = useExam();
  const [started, setStarted] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showNav, setShowNav] = useState(false);

  async function handleStart() {
    if (!examId) return;
    try {
      await exam.startExam(examId);
      setStarted(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start exam');
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const result = await exam.submitExam();
      navigate(`/exam/${examId}/result/${exam.attemptId}`, { state: result });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit');
      setSubmitting(false);
    }
  }

  if (!started) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--warm-bg)' }}>
        <div className="max-w-md w-full">
          {/* Card */}
          <div className="warm-card p-6 sm:p-8">
            {/* Title */}
            <h1 className="text-xl font-extrabold mb-1" style={{ color: 'var(--warm-text)' }}>IOE Mock Exam</h1>
            <p className="text-xs mb-6" style={{ color: 'var(--warm-muted)' }}>Kantipur Engineering College</p>

            {/* Stats — compact row */}
            <div className="flex items-center gap-4 mb-6 pb-6" style={{ borderBottom: '1px solid var(--warm-border)' }}>
              <div className="flex items-center gap-1.5 text-sm">
                <BookOpen className="h-3.5 w-3.5" style={{ color: 'var(--warm-muted)' }} />
                <span className="font-bold" style={{ color: 'var(--warm-text)' }}>100</span>
                <span className="text-xs" style={{ color: 'var(--warm-muted)' }}>Qs</span>
              </div>
              <div className="w-px h-4" style={{ background: 'var(--warm-border)' }} />
              <div className="flex items-center gap-1.5 text-sm">
                <Target className="h-3.5 w-3.5" style={{ color: 'var(--warm-muted)' }} />
                <span className="font-bold" style={{ color: 'var(--warm-text)' }}>100</span>
                <span className="text-xs" style={{ color: 'var(--warm-muted)' }}>marks</span>
              </div>
              <div className="w-px h-4" style={{ background: 'var(--warm-border)' }} />
              <div className="flex items-center gap-1.5 text-sm">
                <Clock className="h-3.5 w-3.5" style={{ color: 'var(--warm-muted)' }} />
                <span className="font-bold" style={{ color: 'var(--warm-text)' }}>2</span>
                <span className="text-xs" style={{ color: 'var(--warm-muted)' }}>hrs</span>
              </div>
            </div>

            {/* Rules — minimal list */}
            <div className="space-y-2.5 mb-6 text-xs" style={{ color: 'var(--warm-muted)' }}>
              <p><span className="font-semibold" style={{ color: 'var(--warm-text)' }}>Mathematics</span> — 35 × 1 mark</p>
              <p><span className="font-semibold" style={{ color: 'var(--warm-text)' }}>Physics</span> — 27 × 1 mark</p>
              <p><span className="font-semibold" style={{ color: 'var(--warm-text)' }}>Chemistry</span> — 22 × 1 mark</p>
              <p><span className="font-semibold" style={{ color: 'var(--warm-text)' }}>English</span> — 16 × 1 mark (passage reading)</p>
              <p>Timer starts immediately. Exam auto-submits at 0:00.</p>
              <p style={{ color: 'var(--kec-red)' }}>Wrong answers lose 10% of the question's marks.</p>
            </div>

            {error && (
              <div className="text-sm px-3 py-2 rounded-lg mb-4 flex items-center gap-2"
                style={{ background: 'rgba(192,57,43,0.08)', color: 'var(--kec-red)' }}>
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}

            {/* Begin button */}
            <button
              onClick={handleStart}
              className="warm-btn w-full flex items-center justify-center gap-2 text-sm"
            >
              Begin Exam <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <p className="text-center text-[10px] mt-3" style={{ color: 'var(--warm-muted)' }}>
            Ensure a stable connection before starting.
          </p>
        </div>
      </div>
    );
  }

  const currentQ = exam.questions[exam.currentIndex];
  if (!currentQ) return null;

  // Split questions into Section A (1M) and Section B (2M)
  // All questions are 1 mark — flat pagination with passage-aware grouping
  const QUESTIONS_PER_PAGE = 5;
  type PageItem = { type: 'standalone'; question: typeof currentQ } | { type: 'passage'; passageText: string; questions: typeof exam.questions };

  // Build pages keeping passage questions together on the same page
  const pages: Array<typeof exam.questions> = [];
  {
    let group: typeof exam.questions = [];
    const seenP = new Set<string>();
    for (const q of exam.questions) {
      if (q.passageId && !seenP.has(q.passageId)) {
        const passageGroup = exam.questions.filter(pq => pq.passageId === q.passageId);
        seenP.add(q.passageId);
        if (group.length > 0 && group.length + passageGroup.length > QUESTIONS_PER_PAGE) {
          pages.push(group);
          group = [];
        }
        group.push(...passageGroup);
        if (group.length >= QUESTIONS_PER_PAGE) { pages.push(group); group = []; }
      } else if (!q.passageId) {
        if (group.length >= QUESTIONS_PER_PAGE) { pages.push(group); group = []; }
        group.push(q);
      }
      // duplicate passage question already added via group — skip
    }
    if (group.length > 0) pages.push(group);
  }

  let currentPage = 0;
  for (let p = 0; p < pages.length; p++) {
    if (pages[p].some(q => exam.questions.indexOf(q) === exam.currentIndex)) { currentPage = p; break; }
  }
  const totalPages = pages.length;
  const pageQuestions = pages[currentPage] || [];

  // Build display items — passage questions grouped under their passage text
  const pageItems: PageItem[] = [];
  {
    const seen = new Set<string>();
    for (const q of pageQuestions) {
      if (q.passageId && q.passageText) {
        if (!seen.has(q.passageId)) {
          seen.add(q.passageId);
          pageItems.push({ type: 'passage', passageText: q.passageText, questions: pageQuestions.filter(pq => pq.passageId === q.passageId) });
        }
      } else {
        pageItems.push({ type: 'standalone', question: q });
      }
    }
  }

  const getPageFirstGlobalIndex = (pageIdx: number) => {
    const pg = pages[pageIdx];
    if (!pg || pg.length === 0) return exam.currentIndex;
    return exam.questions.indexOf(pg[0]);
  };

  const getSubjectsInSection = (qs: typeof exam.questions) => {
    const seen = new Set<string>();
    return qs.reduce<string[]>((acc, q) => {
      if (!seen.has(q.subjectName)) { seen.add(q.subjectName); acc.push(q.subjectName); }
      return acc;
    }, []);
  };
  const allSubjects = getSubjectsInSection(exam.questions);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top bar */}
      <div className="bg-[#1e3a5f] text-white px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between sticky top-0 z-40 gap-2">
        <div className="text-xs sm:text-sm font-semibold hidden sm:block">IOE Mock Exam</div>
        <Timer
          startedAt={exam.startedAt}
          durationMinutes={exam.durationMinutes}
          onTimeUp={handleSubmit}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNav(v => !v)}
            className="lg:hidden bg-white/10 hover:bg-white/20 p-2 rounded-lg text-sm font-semibold flex items-center gap-1 transition"
            title="Question navigator"
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowSubmitConfirm(true)}
            className="bg-[#c0392b] hover:bg-red-700 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1 transition"
          >
            <Send className="h-4 w-4" /> <span className="hidden sm:inline">Submit</span>
          </button>
        </div>
      </div>


      {/* Subject tabs within current section */}
      <div className="bg-white border-b border-gray-200 px-2 sm:px-4 overflow-x-auto flex gap-1 items-center justify-between no-scrollbar">
        <div className="flex gap-1">
        {allSubjects.map(s => {
          const firstInSection = exam.questions.findIndex(q => q.subjectName === s);
          const globalIdx = firstInSection;
          const subjectCount = exam.questions.filter(q => q.subjectName === s).length;
          return (
            <button
              key={s}
              onClick={() => exam.goToQuestion(globalIdx)}
              className={`px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition ${
                s === currentQ.subjectName ? 'border-[#c0392b] text-[#c0392b]' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {s} <span className="text-gray-400">({subjectCount})</span>
            </button>
          );
        })}
        </div>
        <span className="text-xs text-gray-400 shrink-0 ml-2">Page {currentPage + 1}/{totalPages}</span>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Question area — 5 questions per page */}
        <div className="flex-1 p-3 sm:p-4 lg:p-8 space-y-4 sm:space-y-6 overflow-y-auto">
          {pageItems.map((item, itemIdx) => {
            if (item.type === 'passage') {
              // Passage block with its linked questions
              return (
                <div key={`passage-${itemIdx}`} className="space-y-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 max-h-60 overflow-y-auto">
                    <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">Reading Passage</h3>
                    <MathText text={item.passageText} as="p" className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap" />
                  </div>
                  {item.questions.map(q => {
                    const globalIdx = exam.questions.indexOf(q);
                    return (
                      <QuestionCard
                        key={q.id}
                        question={q}
                        globalIndex={globalIdx}
                        totalQuestions={exam.questions.length}
                        currentSection="A"
                        selectedAnswer={exam.answers[q.id]}
                        isReviewed={exam.markedForReview.has(q.id)}
                        isCurrent={globalIdx === exam.currentIndex}
                        onSelectAnswer={(opt) => exam.selectAnswer(q.id, opt)}
                        onClearAnswer={() => exam.clearAnswer(q.id)}
                        onToggleReview={() => exam.toggleReview(q.id)}
                        onFocus={() => exam.goToQuestion(globalIdx)}
                      />
                    );
                  })}
                </div>
              );
            } else {
              // Standalone question
              const q = item.question;
              const globalIdx = exam.questions.indexOf(q);
              return (
                <QuestionCard
                  key={q.id}
                  question={q}
                  globalIndex={globalIdx}
                  totalQuestions={exam.questions.length}
                  currentSection="A"
                  selectedAnswer={exam.answers[q.id]}
                  isReviewed={exam.markedForReview.has(q.id)}
                  isCurrent={globalIdx === exam.currentIndex}
                  onSelectAnswer={(opt) => exam.selectAnswer(q.id, opt)}
                  onClearAnswer={() => exam.clearAnswer(q.id)}
                  onToggleReview={() => exam.toggleReview(q.id)}
                  onFocus={() => exam.goToQuestion(globalIdx)}
                />
              );
            }
          })}

          {/* Page navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <button
              onClick={() => exam.goToQuestion(getPageFirstGlobalIndex(currentPage - 1))}
              disabled={currentPage === 0}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium disabled:opacity-30 transition"
            >
              <ChevronLeft className="h-4 w-4" /> Previous Page
            </button>
            <span className="text-sm text-gray-500">Page {currentPage + 1} of {totalPages}</span>
            <button
              onClick={() => exam.goToQuestion(getPageFirstGlobalIndex(currentPage + 1))}
              disabled={currentPage >= totalPages - 1}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium disabled:opacity-30 transition"
            >
              Next Page <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Question navigator sidebar — toggleable on mobile */}
        <div className={`${showNav ? 'fixed inset-0 z-50 bg-white pt-14' : 'hidden'} lg:static lg:block lg:w-80 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 p-4 overflow-y-auto`}>
          <button className="lg:hidden absolute top-3 right-3 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600" onClick={() => setShowNav(false)}>✕</button>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Questions</h3>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mb-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500" /> Answered</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-400" /> Review</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400" /> Not Answered</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-200" /> Not Visited</span>
          </div>

          {/* Question navigator */}
          <div className="mb-4">
            <div className="text-xs font-bold text-[#1e3a5f] uppercase tracking-wider mb-2 bg-blue-50 px-2 py-1 rounded">
              All Questions ({exam.questions.length} Qs · 1 mark each)
            </div>
            {allSubjects.map(subj => {
              const subjectQs = exam.questions.filter(q => q.subjectName === subj);
              return (
                <div key={`A-${subj}`} className="mb-2">
                  <div className="text-[10px] font-semibold text-gray-400 uppercase mb-1 pl-1">{subj}</div>
                  <div className="grid grid-cols-8 lg:grid-cols-6 gap-1">
                    {subjectQs.map(q => {
                      const globalIdx = exam.questions.indexOf(q);
                      let bg = 'bg-gray-200 text-gray-600';
                      if (exam.visitedQuestions.has(q.id) && !exam.answers[q.id]) bg = 'bg-red-100 text-red-700 border border-red-300';
                      if (exam.answers[q.id]) bg = 'bg-green-100 text-green-700 border border-green-300';
                      if (exam.markedForReview.has(q.id)) bg = 'bg-orange-100 text-orange-700 border border-orange-300';
                      if (globalIdx === exam.currentIndex) bg += ' ring-2 ring-[#1e3a5f]';
                      return (
                        <button key={q.id} onClick={() => exam.goToQuestion(globalIdx)}
                          className={`w-8 h-8 rounded-lg text-[10px] font-bold transition ${bg}`}>
                          {globalIdx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>


          {/* Summary */}
          <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500 space-y-1">
            <p>Answered: <strong className="text-green-600">{Object.keys(exam.answers).length}</strong></p>
            <p>Marked: <strong className="text-orange-500">{exam.markedForReview.size}</strong></p>
            <p>Remaining: <strong className="text-gray-700">{exam.questions.length - Object.keys(exam.answers).length}</strong></p>
          </div>
        </div>
      </div>

      {/* Submit confirmation modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
              <h3 className="font-bold text-lg">Submit Exam?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              You have answered <strong>{Object.keys(exam.answers).length}</strong> out of <strong>{exam.questions.length}</strong> questions.
            </p>
            <p className="text-sm text-gray-600 mb-6">
              {exam.questions.length - Object.keys(exam.answers).length > 0
                ? `${exam.questions.length - Object.keys(exam.answers).length} questions are unanswered. Are you sure you want to submit?`
                : 'All questions answered. Ready to submit?'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 font-medium transition"
              >
                Continue Exam
              </button>
              <button
                onClick={handleSubmit} disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-[#c0392b] hover:bg-red-700 text-white font-bold transition disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Confirm Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── QuestionCard Component ─── */
function QuestionCard({ question, globalIndex, totalQuestions, currentSection, selectedAnswer, isReviewed, isCurrent, onSelectAnswer, onClearAnswer, onToggleReview, onFocus }: {
  question: { id: string; text: string; optionA: string; optionB: string; optionC: string; optionD: string; weightage: number; subjectName: string };
  globalIndex: number;
  totalQuestions: number;
  currentSection: string;
  selectedAnswer: string | undefined;
  isReviewed: boolean;
  isCurrent: boolean;
  onSelectAnswer: (opt: string) => void;
  onClearAnswer: () => void;
  onToggleReview: () => void;
  onFocus: () => void;
}) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border p-4 sm:p-6 transition ${isCurrent ? 'border-[#1e3a5f] ring-1 ring-[#1e3a5f]/30' : 'border-gray-100'}`}
      onClick={onFocus}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium text-gray-400">
          Q{globalIndex + 1} of {totalQuestions} • {question.subjectName}
        </span>
        <span className={`text-xs font-bold px-2 py-1 rounded ${question.weightage === 2 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
          {question.weightage} Mark{question.weightage > 1 ? 's' : ''}
        </span>
      </div>

      <MathText text={question.text} as="p" className="text-gray-900 font-medium text-base mb-5 leading-relaxed" />

      <div className="space-y-2">
        {['A', 'B', 'C', 'D'].map(opt => {
          const optionKey = `option${opt}` as 'optionA' | 'optionB' | 'optionC' | 'optionD';
          const selected = selectedAnswer === opt;
          return (
            <button
              key={opt}
              onClick={(e) => { e.stopPropagation(); onSelectAnswer(opt); }}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition flex items-center gap-3 ${
                selected
                  ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f]'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                selected ? 'bg-[#1e3a5f] text-white' : 'bg-gray-100 text-gray-500'
              }`}>{opt}</span>
              <span className="text-sm"><MathText text={question[optionKey]} /></span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
        <button
          onClick={(e) => { e.stopPropagation(); onClearAnswer(); }}
          className="text-xs text-gray-500 hover:text-red-600 transition"
          disabled={!selectedAnswer}
        >
          Clear
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleReview(); }}
          className={`flex items-center gap-1 text-xs transition ${
            isReviewed ? 'text-orange-500' : 'text-gray-500 hover:text-orange-500'
          }`}
        >
          <Flag className="h-3 w-3" />
          {isReviewed ? 'Marked' : 'Mark for Review'}
        </button>
      </div>
    </div>
  );
}

/* ─── Timer Component ─── */
function Timer({ startedAt, durationMinutes, onTimeUp }: {
  startedAt: Date | null;
  durationMinutes: number;
  onTimeUp: () => void;
}) {
  const [remaining, setRemaining] = useState(durationMinutes * 60);
  const calledRef = useRef(false);

  useEffect(() => {
    if (!startedAt) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      const rem = Math.max(0, durationMinutes * 60 - elapsed);
      setRemaining(rem);

      if (rem <= 0 && !calledRef.current) {
        calledRef.current = true;
        clearInterval(interval);
        onTimeUp();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt, durationMinutes, onTimeUp]);

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  const isWarning = remaining <= 300; // 5 minutes
  const isCritical = remaining <= 60;

  return (
    <div className={`flex items-center gap-2 font-mono text-lg font-bold ${
      isCritical ? 'text-red-400 animate-pulse' : isWarning ? 'text-yellow-400' : 'text-white'
    }`}>
      <Clock className="h-4 w-4" />
      {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </div>
  );
}
