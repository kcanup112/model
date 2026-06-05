import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import api from '../lib/api';
import { Trophy, Clock, CheckCircle, XCircle, MinusCircle, BarChart3, ChevronDown, ChevronUp, Share2, Copy, Check } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import MathText from '../components/ui/MathText';

interface ReviewItem {
  questionId: string;
  questionText: string;
  selectedOption: string | null;
  correctOption: string;
  isCorrect: boolean;
  marksAwarded: number;
  weightage: number;
  optionA: string; optionB: string; optionC: string; optionD: string;
  subject: string;
  passageText: string | null;
}

interface ResultData {
  totalScore: number;
  totalMarks: number;
  correct: number;
  wrong: number;
  unattempted: number;
  timeTakenSeconds: number;
  subjectBreakdown: Record<string, { correct: number; wrong: number; unattempted: number; score: number; totalMarks: number; }>;
  review?: ReviewItem[];
}

const SCORE_COLOR = '#4ade80';
const TOTAL_COLOR = '#818cf8';

export default function ResultPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const location = useLocation();
  const [result, setResult] = useState<ResultData | null>(location.state as ResultData || null);
  const [review, setReview] = useState<ReviewItem[] | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [loading, setLoading] = useState(!result);

  useEffect(() => {
    if (!result && attemptId) {
      api.get(`/exams/attempts/${attemptId}/review`).then(r => {
        setResult({
          totalScore: r.data.totalScore,
          totalMarks: r.data.totalMarks,
          correct: r.data.review.filter((q: ReviewItem) => q.isCorrect).length,
          wrong: r.data.review.filter((q: ReviewItem) => !q.isCorrect && q.selectedOption).length,
          unattempted: r.data.review.filter((q: ReviewItem) => !q.selectedOption).length,
          timeTakenSeconds: r.data.timeTakenSeconds,
          subjectBreakdown: {},
          review: r.data.review,
        });
        setReview(r.data.review);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [attemptId, result]);

  function loadReview() {
    if (review) { setShowReview(!showReview); return; }
    if (!attemptId) return;
    api.get(`/exams/attempts/${attemptId}/review`).then(r => {
      setReview(r.data.review);
      setShowReview(true);
    });
  }

  if (loading || !result) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900" /></div>;

  const chartData = result.subjectBreakdown
    ? Object.entries(result.subjectBreakdown).map(([name, s]) => ({ name: name.length > 12 ? name.slice(0, 12) + '…' : name, score: s.score, total: s.totalMarks }))
    : [];

  const percentage = Math.round((result.totalScore / result.totalMarks) * 100);
  const minutes = Math.floor((result.timeTakenSeconds || 0) / 60);

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-10 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto">
        {/* Score header */}
        <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2c5282] rounded-2xl p-5 sm:p-8 text-white text-center mb-6 sm:mb-8">
          <Trophy className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-[#f39c12]" />
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">
            {result.totalScore} <span className="text-xl sm:text-2xl text-gray-300">/ {result.totalMarks}</span>
          </h1>
          <p className="text-gray-300 text-base sm:text-lg">{percentage >= 0 ? percentage : 0}% Score</p>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-6 mt-4 sm:mt-6 text-xs sm:text-sm">
            <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-400" /> {result.correct} Correct</span>
            <span className="flex items-center gap-1"><XCircle className="h-4 w-4 text-red-400" /> {result.wrong} Wrong</span>
            <span className="flex items-center gap-1"><MinusCircle className="h-4 w-4 text-gray-400" /> {result.unattempted} Skipped</span>
            <span className="flex items-center gap-1"><Clock className="h-4 w-4 text-yellow-400" /> {minutes}m</span>
          </div>
        </div>

        {/* Share to Social Media */}
        <ShareResult score={result.totalScore} totalMarks={result.totalMarks} percentage={percentage} correct={result.correct} wrong={result.wrong} />

        {/* Subject breakdown chart */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#1e3a5f]" /> Subject-wise Breakdown
            </h2>
            <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: SCORE_COLOR }} /> Score</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: TOTAL_COLOR }} /> Total</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barGap={4} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 13 }} />
                <Bar dataKey="score" name="Score" fill={SCORE_COLOR} radius={[6, 6, 0, 0]} />
                <Bar dataKey="total" name="Total" fill={TOTAL_COLOR} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Review toggle */}
        <button
          onClick={loadReview}
          className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center justify-between hover:bg-gray-50 transition mb-4"
        >
          <span className="font-semibold text-gray-900">View Answer Review</span>
          {showReview ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>

        {/* Review list */}
        {showReview && review && (
          <div className="space-y-4">
            {review.map((q, i) => (
              <div key={q.questionId} className={`bg-white rounded-xl border p-3 sm:p-5 ${q.isCorrect ? 'border-green-200' : q.selectedOption ? 'border-red-200' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-medium text-gray-400">Q{i + 1} • {q.subject} • {q.weightage}M</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    q.isCorrect ? 'bg-green-100 text-green-700' : q.selectedOption ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {q.isCorrect ? `+${q.weightage}` : q.selectedOption ? `${q.marksAwarded}` : 'Skipped'}
                  </span>
                </div>

                {q.passageText && (
                  <div className="bg-blue-50 rounded-lg p-3 mb-3 text-xs text-gray-600 italic max-h-32 overflow-y-auto">
                    <MathText text={q.passageText} />
                  </div>
                )}

                <MathText text={q.questionText} as="p" className="text-sm text-gray-900 font-medium mb-3" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {(['A', 'B', 'C', 'D'] as const).map(opt => {
                    const key = `option${opt}` as keyof ReviewItem;
                    const isCorrect = q.correctOption === opt;
                    const isSelected = q.selectedOption === opt;
                    let style = 'bg-gray-50 text-gray-600';
                    if (isCorrect) style = 'bg-green-50 text-green-800 border border-green-300';
                    if (isSelected && !isCorrect) style = 'bg-red-50 text-red-800 border border-red-300';
                    return (
                      <div key={opt} className={`px-3 py-2 rounded-lg text-xs ${style}`}>
                        <span className="font-bold mr-1">{opt}.</span> <MathText text={q[key] as string} />
                        {isCorrect && <CheckCircle className="inline h-3 w-3 ml-1 text-green-600" />}
                        {isSelected && !isCorrect && <XCircle className="inline h-3 w-3 ml-1 text-red-600" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link to="/dashboard" className="bg-[#1e3a5f] hover:bg-blue-900 text-white px-8 py-3 rounded-xl font-semibold transition inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Share Result Component ─── */
function ShareResult({ score, totalMarks, percentage, correct, wrong }: {
  score: number; totalMarks: number; percentage: number; correct: number; wrong: number;
}) {
  const [copied, setCopied] = useState(false);

  const shareText = `🎓 IOE Mock Exam Result — KEC\n\n🏆 Score: ${score}/${totalMarks} (${percentage >= 0 ? percentage : 0}%)\n✅ Correct: ${correct} | ❌ Wrong: ${wrong}\n\nPractice at Kantipur Engineering College!\n🔗 ${window.location.origin}`;

  const siteUrl = window.location.origin;

  function shareToFacebook() {
    const hashtag = encodeURIComponent('#IOEMockExam');
    const quote = encodeURIComponent(`🎓 IOE Mock Exam Result — KEC\n🏆 Score: ${score}/${totalMarks} (${percentage >= 0 ? percentage : 0}%)\n✅ Correct: ${correct} | ❌ Wrong: ${wrong}\n\nPractice at Kantipur Engineering College!`);
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(siteUrl)}&hashtag=${hashtag}&quote=${quote}`;
    window.open(url, '_blank', 'width=600,height=500,scrollbars=yes');
  }

  function shareToTwitter() {
    const text = `🎓 IOE Mock Exam Result — KEC\n🏆 Score: ${score}/${totalMarks} (${percentage >= 0 ? percentage : 0}%)\n✅ ${correct} Correct | ❌ ${wrong} Wrong\n\nPractice now 👇`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(siteUrl)}&hashtags=IOEMockExam,KEC`;
    window.open(url, '_blank', 'width=600,height=400');
  }

  async function copyForInstagram() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = shareText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
      <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-sm">
        <Share2 className="h-5 w-5 text-[#1e3a5f]" /> Share Your Result
      </h2>
      <div className="flex flex-wrap gap-3">
        {/* Facebook */}
        <button
          onClick={shareToFacebook}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition hover:opacity-90 active:scale-95"
          style={{ background: '#1877F2' }}
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          Facebook
        </button>

        {/* Twitter / X */}
        <button
          onClick={shareToTwitter}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition hover:opacity-90 active:scale-95 bg-black"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          X (Twitter)
        </button>

        {/* Instagram — Copy to Clipboard */}
        <button
          onClick={copyForInstagram}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition hover:opacity-90 active:scale-95"
          style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              Copy for Instagram
            </>
          )}
        </button>
      </div>
      {copied && (
        <p className="text-xs text-emerald-600 mt-3 flex items-center gap-1">
          <Check className="h-3 w-3" /> Result copied! Paste it into your Instagram story or caption.
        </p>
      )}
    </div>
  );
}
