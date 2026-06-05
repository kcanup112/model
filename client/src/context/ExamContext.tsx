import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import api from '../lib/api';

interface Question {
  id: string;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  weightage: number;
  subjectName: string;
  passageText: string | null;
  passageId: string | null;
}

interface ExamContextType {
  attemptId: string | null;
  questions: Question[];
  answers: Record<string, string>;
  currentIndex: number;
  markedForReview: Set<string>;
  visitedQuestions: Set<string>;
  startedAt: Date | null;
  durationMinutes: number;
  isSubmitted: boolean;
  startExam: (examId: string) => Promise<void>;
  selectAnswer: (questionId: string, option: string) => void;
  clearAnswer: (questionId: string) => void;
  toggleReview: (questionId: string) => void;
  goToQuestion: (index: number) => void;
  submitExam: () => Promise<any>;
}

const ExamContext = createContext<ExamContextType | null>(null);

export function ExamProvider({ children }: { children: ReactNode }) {
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [visitedQuestions, setVisitedQuestions] = useState<Set<string>>(new Set());
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const startExam = useCallback(async (examId: string) => {
    const { data } = await api.post(`/exams/${examId}/start`);
    setAttemptId(data.attemptId);
    setQuestions(data.questions);
    setStartedAt(new Date(data.startedAt));
    setDurationMinutes(data.durationMinutes || 120);
    setAnswers(data.answers || {});
    setCurrentIndex(0);
    setIsSubmitted(false);

    // Save state to localStorage for crash recovery
    localStorage.setItem('examState', JSON.stringify({
      attemptId: data.attemptId,
      examId,
      startedAt: data.startedAt,
    }));

    // Mark first question as visited
    if (data.questions.length > 0) {
      setVisitedQuestions(new Set([data.questions[0].id]));
    }
  }, []);

  const selectAnswer = useCallback((questionId: string, option: string) => {
    setAnswers(prev => {
      const updated = { ...prev, [questionId]: option };
      // Save to localStorage
      localStorage.setItem('examAnswers', JSON.stringify(updated));
      return updated;
    });

    // Sync to backend (debounced in real usage)
    if (attemptId) {
      api.patch(`/exams/attempts/${attemptId}/answer`, { questionId, selectedOption: option }).catch(console.error);
    }
  }, [attemptId]);

  const clearAnswer = useCallback((questionId: string) => {
    setAnswers(prev => {
      const updated = { ...prev };
      delete updated[questionId];
      localStorage.setItem('examAnswers', JSON.stringify(updated));
      return updated;
    });
    if (attemptId) {
      api.patch(`/exams/attempts/${attemptId}/answer`, { questionId, selectedOption: null }).catch(console.error);
    }
  }, [attemptId]);

  const toggleReview = useCallback((questionId: string) => {
    setMarkedForReview(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }, []);

  const goToQuestion = useCallback((index: number) => {
    setCurrentIndex(index);
    if (questions[index]) {
      setVisitedQuestions(prev => new Set(prev).add(questions[index].id));
    }
  }, [questions]);

  const submitExam = useCallback(async () => {
    if (!attemptId) throw new Error('No active exam');
    const { data } = await api.post(`/exams/attempts/${attemptId}/submit`);
    setIsSubmitted(true);
    localStorage.removeItem('examState');
    localStorage.removeItem('examAnswers');
    return data;
  }, [attemptId]);

  return (
    <ExamContext.Provider value={{
      attemptId, questions, answers, currentIndex, markedForReview, visitedQuestions,
      startedAt, durationMinutes, isSubmitted,
      startExam, selectAnswer, clearAnswer, toggleReview, goToQuestion, submitExam,
    }}>
      {children}
    </ExamContext.Provider>
  );
}

export function useExam() {
  const ctx = useContext(ExamContext);
  if (!ctx) throw new Error('useExam must be used within ExamProvider');
  return ctx;
}
