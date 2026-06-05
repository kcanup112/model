import React, { useEffect, useState, useRef } from 'react';
import api from '../../lib/api';
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X,
  Upload, ChevronDown, ChevronUp, Eye, EyeOff, FileJson,
} from 'lucide-react';

interface SpecialExam {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  totalMarks: number;
  isActive: boolean;
  createdAt: string;
  _count: { questions: number; attempts: number };
}

interface Question {
  id: string;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  hint: string | null;
  subject: string | null;
  topic: string | null;
  difficulty: string;
  weightage: number;
  displayOrder: number;
}

const emptyExamForm = { title: '', description: '', durationMinutes: 60, isActive: true };
const emptyQForm = {
  text: '', optionA: '', optionB: '', optionC: '', optionD: '',
  correctOption: 'A', hint: '', subject: '', topic: '',
  difficulty: 'MEDIUM', weightage: 1, displayOrder: 0,
};

export default function AdminSpecialExams() {
  const [exams, setExams] = useState<SpecialExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExamModal, setShowExamModal] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [examForm, setExamForm] = useState({ ...emptyExamForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Question management
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQs, setLoadingQs] = useState(false);
  const [showQModal, setShowQModal] = useState(false);
  const [editingQId, setEditingQId] = useState<string | null>(null);
  const [qForm, setQForm] = useState({ ...emptyQForm });
  const [qError, setQError] = useState('');

  // Bulk import
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkJson, setBulkJson] = useState('');
  const [bulkExamId, setBulkExamId] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadExams() {
    setLoading(true);
    const r = await api.get('/admin/special-exams');
    setExams(r.data);
    setLoading(false);
  }

  useEffect(() => { loadExams(); }, []);

  async function loadQuestions(examId: string) {
    setLoadingQs(true);
    const r = await api.get(`/admin/special-exams/${examId}/questions`);
    setQuestions(r.data);
    setLoadingQs(false);
  }

  function toggleExpand(examId: string) {
    if (expandedExamId === examId) {
      setExpandedExamId(null);
    } else {
      setExpandedExamId(examId);
      loadQuestions(examId);
    }
  }

  // ── Exam CRUD ──────────────────────────────────────────────
  function openCreateExam() {
    setExamForm({ ...emptyExamForm });
    setEditingExamId(null);
    setError('');
    setShowExamModal(true);
  }

  function openEditExam(e: SpecialExam) {
    setExamForm({ title: e.title, description: e.description || '', durationMinutes: e.durationMinutes, isActive: e.isActive });
    setEditingExamId(e.id);
    setError('');
    setShowExamModal(true);
  }

  async function handleSaveExam() {
    setSaving(true);
    setError('');
    try {
      const body = { ...examForm, durationMinutes: Number(examForm.durationMinutes) };
      if (editingExamId) {
        await api.put(`/admin/special-exams/${editingExamId}`, body);
      } else {
        await api.post('/admin/special-exams', body);
      }
      setShowExamModal(false);
      await loadExams();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteExam(id: string) {
    if (!confirm('Delete this special exam and all its questions? This cannot be undone.')) return;
    await api.delete(`/admin/special-exams/${id}`);
    if (expandedExamId === id) setExpandedExamId(null);
    await loadExams();
  }

  async function toggleExamActive(e: SpecialExam) {
    await api.put(`/admin/special-exams/${e.id}`, { isActive: !e.isActive });
    await loadExams();
  }

  // ── Question CRUD ──────────────────────────────────────────
  function openAddQuestion(examId: string) {
    setExpandedExamId(examId);
    setQForm({ ...emptyQForm });
    setEditingQId(null);
    setQError('');
    setShowQModal(true);
  }

  function openEditQuestion(q: Question) {
    setQForm({
      text: q.text, optionA: q.optionA, optionB: q.optionB, optionC: q.optionC, optionD: q.optionD,
      correctOption: q.correctOption, hint: q.hint || '', subject: q.subject || '',
      topic: q.topic || '', difficulty: q.difficulty, weightage: q.weightage,
      displayOrder: q.displayOrder,
    });
    setEditingQId(q.id);
    setQError('');
    setShowQModal(true);
  }

  async function handleSaveQuestion() {
    setSaving(true);
    setQError('');
    try {
      const body = { ...qForm, weightage: Number(qForm.weightage), displayOrder: Number(qForm.displayOrder) };
      if (editingQId && expandedExamId) {
        await api.put(`/admin/special-exams/${expandedExamId}/questions/${editingQId}`, body);
      } else if (expandedExamId) {
        await api.post(`/admin/special-exams/${expandedExamId}/questions`, body);
      }
      setShowQModal(false);
      await loadQuestions(expandedExamId!);
      await loadExams();
    } catch (err: any) {
      setQError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteQuestion(examId: string, qId: string) {
    if (!confirm('Delete this question?')) return;
    await api.delete(`/admin/special-exams/${examId}/questions/${qId}`);
    await loadQuestions(examId);
    await loadExams();
  }

  // ── Bulk Import ────────────────────────────────────────────
  function openBulkImport(examId: string) {
    setBulkExamId(examId);
    setBulkJson('');
    setBulkResult(null);
    setShowBulkModal(true);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setBulkJson(ev.target?.result as string);
    reader.readAsText(file);
  }

  async function handleBulkImport() {
    if (!bulkExamId || !bulkJson.trim()) return;
    setSaving(true);
    setBulkResult(null);
    try {
      const parsed = JSON.parse(bulkJson);
      const { data } = await api.post(`/admin/special-exams/${bulkExamId}/questions/bulk`, parsed);
      setBulkResult(`Successfully imported ${data.inserted} questions.`);
      await loadExams();
      if (expandedExamId === bulkExamId) await loadQuestions(bulkExamId);
    } catch (err: any) {
      setBulkResult('Error: ' + (err.response?.data?.error || err.message || 'Import failed'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--warm-muted)' }}>Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-extrabold" style={{ color: 'var(--warm-text)' }}>Special Exams</h2>
          <p className="text-sm" style={{ color: 'var(--warm-muted)' }}>
            {exams.filter(e => e.isActive).length} active &bull; {exams.length} total
          </p>
        </div>
        <button onClick={openCreateExam} className="warm-btn flex items-center gap-2 text-sm">
          <Plus className="h-4 w-4" /> New Exam
        </button>
      </div>

      <div className="space-y-3">
        {exams.map(exam => (
          <div key={exam.id} className="warm-card overflow-hidden">
            {/* Exam header */}
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm truncate" style={{ color: 'var(--warm-text)' }}>{exam.title}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: exam.isActive ? 'rgba(34,197,94,0.1)' : 'rgba(156,163,175,0.15)', color: exam.isActive ? '#16a34a' : '#6b7280' }}>
                    {exam.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {exam.description && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--warm-muted)' }}>{exam.description}</p>}
                <div className="flex gap-3 mt-1 text-xs" style={{ color: 'var(--warm-muted)' }}>
                  <span>{exam._count.questions} questions</span>
                  <span>{exam.totalMarks} marks</span>
                  <span>{exam.durationMinutes} min</span>
                  <span>{exam._count.attempts} attempts</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => openBulkImport(exam.id)} title="Bulk import questions"
                  className="p-2 rounded-lg hover:bg-amber-50" style={{ color: 'var(--warm-muted)' }}>
                  <FileJson className="h-4 w-4" />
                </button>
                <button onClick={() => openAddQuestion(exam.id)} title="Add question"
                  className="p-2 rounded-lg hover:bg-amber-50" style={{ color: 'var(--warm-muted)' }}>
                  <Plus className="h-4 w-4" />
                </button>
                <button onClick={() => toggleExamActive(exam)} title={exam.isActive ? 'Deactivate' : 'Activate'}>
                  {exam.isActive
                    ? <ToggleRight className="h-5 w-5" style={{ color: '#22c55e' }} />
                    : <ToggleLeft className="h-5 w-5" style={{ color: 'var(--warm-muted)' }} />}
                </button>
                <button onClick={() => openEditExam(exam)} className="p-1.5 rounded-lg hover:bg-amber-100">
                  <Pencil className="h-3.5 w-3.5" style={{ color: 'var(--warm-muted)' }} />
                </button>
                <button onClick={() => handleDeleteExam(exam.id)} className="p-1.5 rounded-lg hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </button>
                <button onClick={() => toggleExpand(exam.id)} className="p-1.5 rounded-lg hover:bg-amber-50">
                  {expandedExamId === exam.id
                    ? <ChevronUp className="h-4 w-4" style={{ color: 'var(--warm-muted)' }} />
                    : <ChevronDown className="h-4 w-4" style={{ color: 'var(--warm-muted)' }} />}
                </button>
              </div>
            </div>

            {/* Questions panel */}
            {expandedExamId === exam.id && (
              <div style={{ borderTop: '1px solid var(--warm-border)' }}>
                {loadingQs ? (
                  <div className="px-5 py-4 text-xs" style={{ color: 'var(--warm-muted)' }}>Loading questions...</div>
                ) : questions.length === 0 ? (
                  <div className="px-5 py-4 text-xs" style={{ color: 'var(--warm-muted)' }}>
                    No questions yet. Click + or use bulk import.
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: 'var(--warm-border)' }}>
                    {questions.map((q, i) => (
                      <div key={q.id} className="px-5 py-3 flex items-start gap-3">
                        <span className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold mt-0.5"
                          style={{ background: 'var(--warm-border)', color: 'var(--warm-muted)' }}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-2" style={{ color: 'var(--warm-text)' }}>{q.text}</p>
                          <div className="flex gap-2 mt-1 text-xs" style={{ color: 'var(--warm-muted)' }}>
                            {[q.subject, q.topic, q.difficulty, `${q.weightage}mk`].filter(Boolean).map(t => (
                              <span key={t}>{t}</span>
                            ))}
                            <span className="font-semibold" style={{ color: '#22c55e' }}>Ans: {q.correctOption}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => openEditQuestion(q)} className="p-1 rounded hover:bg-amber-50">
                            <Pencil className="h-3.5 w-3.5" style={{ color: 'var(--warm-muted)' }} />
                          </button>
                          <button onClick={() => handleDeleteQuestion(exam.id, q.id)} className="p-1 rounded hover:bg-red-50">
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Exam modal */}
      {showExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40">
          <div className="warm-card p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold" style={{ color: 'var(--warm-text)' }}>
                {editingExamId ? 'Edit Exam' : 'New Special Exam'}
              </h3>
              <button onClick={() => setShowExamModal(false)}><X className="h-5 w-5" style={{ color: 'var(--warm-muted)' }} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--warm-muted)' }}>Title</label>
                <input className="warm-input w-full" value={examForm.title} onChange={e => setExamForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--warm-muted)' }}>Description</label>
                <textarea className="warm-input w-full" rows={2} value={examForm.description}
                  onChange={e => setExamForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--warm-muted)' }}>Duration (minutes)</label>
                <input type="number" min="1" className="warm-input w-full" value={examForm.durationMinutes}
                  onChange={e => setExamForm(f => ({ ...f, durationMinutes: parseInt(e.target.value) }))} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={examForm.isActive} onChange={e => setExamForm(f => ({ ...f, isActive: e.target.checked }))} />
                <span className="text-sm" style={{ color: 'var(--warm-text)' }}>Active</span>
              </label>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowExamModal(false)} className="flex-1 py-2 rounded-xl border text-sm"
                  style={{ borderColor: 'var(--warm-border)', color: 'var(--warm-text)' }}>Cancel</button>
                <button onClick={handleSaveExam} disabled={saving} className="flex-1 warm-btn text-sm">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Question modal */}
      {showQModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40">
          <div className="warm-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold" style={{ color: 'var(--warm-text)' }}>
                {editingQId ? 'Edit Question' : 'Add Question'}
              </h3>
              <button onClick={() => setShowQModal(false)}><X className="h-5 w-5" style={{ color: 'var(--warm-muted)' }} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--warm-muted)' }}>Question Text</label>
                <textarea className="warm-input w-full" rows={3} value={qForm.text}
                  onChange={e => setQForm(f => ({ ...f, text: e.target.value }))} />
              </div>
              {(['A', 'B', 'C', 'D'] as const).map(opt => (
                <div key={opt}>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--warm-muted)' }}>Option {opt}</label>
                  <input className="warm-input w-full" value={qForm[`option${opt}` as 'optionA' | 'optionB' | 'optionC' | 'optionD']}
                    onChange={e => setQForm(f => ({ ...f, [`option${opt}`]: e.target.value }))} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--warm-muted)' }}>Correct Answer</label>
                  <select className="warm-input w-full" value={qForm.correctOption}
                    onChange={e => setQForm(f => ({ ...f, correctOption: e.target.value }))}>
                    {['A', 'B', 'C', 'D'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--warm-muted)' }}>Difficulty</label>
                  <select className="warm-input w-full" value={qForm.difficulty}
                    onChange={e => setQForm(f => ({ ...f, difficulty: e.target.value }))}>
                    {['EASY', 'MEDIUM', 'HARD'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--warm-muted)' }}>Subject</label>
                  <input className="warm-input w-full" value={qForm.subject}
                    onChange={e => setQForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Physics" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--warm-muted)' }}>Topic</label>
                  <input className="warm-input w-full" value={qForm.topic}
                    onChange={e => setQForm(f => ({ ...f, topic: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--warm-muted)' }}>Marks (weightage)</label>
                  <select className="warm-input w-full" value={qForm.weightage}
                    onChange={e => setQForm(f => ({ ...f, weightage: parseInt(e.target.value) }))}>
                    <option value={1}>1 mark</option>
                    <option value={2}>2 marks</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--warm-muted)' }}>Display Order</label>
                  <input type="number" className="warm-input w-full" value={qForm.displayOrder}
                    onChange={e => setQForm(f => ({ ...f, displayOrder: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--warm-muted)' }}>Hint (optional)</label>
                <input className="warm-input w-full" value={qForm.hint}
                  onChange={e => setQForm(f => ({ ...f, hint: e.target.value }))} />
              </div>
              {qError && <p className="text-sm text-red-500">{qError}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowQModal(false)} className="flex-1 py-2 rounded-xl border text-sm"
                  style={{ borderColor: 'var(--warm-border)', color: 'var(--warm-text)' }}>Cancel</button>
                <button onClick={handleSaveQuestion} disabled={saving} className="flex-1 warm-btn text-sm">
                  {saving ? 'Saving...' : 'Save Question'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk import modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40">
          <div className="warm-card p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold" style={{ color: 'var(--warm-text)' }}>Bulk Import Questions</h3>
              <button onClick={() => setShowBulkModal(false)}><X className="h-5 w-5" style={{ color: 'var(--warm-muted)' }} /></button>
            </div>

            <div className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(99,102,241,0.07)', color: '#4f46e5' }}>
              <p className="font-semibold mb-1">Expected JSON array format:</p>
              <pre className="text-[10px] overflow-x-auto">{`[
  {
    "text": "Question text",
    "optionA": "...", "optionB": "...",
    "optionC": "...", "optionD": "...",
    "correctOption": "A",
    "difficulty": "MEDIUM",
    "weightage": 1,
    "subject": "Physics",
    "topic": "Mechanics"
  }
]`}</pre>
            </div>

            <div className="mb-3">
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm"
                style={{ borderColor: 'var(--warm-border)', color: 'var(--warm-text)' }}>
                <Upload className="h-4 w-4" /> Upload JSON file
              </button>
              <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
            </div>

            <textarea
              className="warm-input w-full mb-3 font-mono text-xs"
              rows={8}
              value={bulkJson}
              onChange={e => setBulkJson(e.target.value)}
              placeholder="Paste JSON array here..."
            />

            {bulkResult && (
              <div className={`text-sm px-3 py-2 rounded-lg mb-3 ${bulkResult.startsWith('Error') ? 'text-red-600 bg-red-50' : 'text-green-700 bg-green-50'}`}>
                {bulkResult}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setShowBulkModal(false)} className="flex-1 py-2 rounded-xl border text-sm"
                style={{ borderColor: 'var(--warm-border)', color: 'var(--warm-text)' }}>Close</button>
              <button onClick={handleBulkImport} disabled={saving || !bulkJson.trim()} className="flex-1 warm-btn text-sm">
                {saving ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
