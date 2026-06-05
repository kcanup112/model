import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireProfile } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// IOE Entrance Exam pattern
// Math: 40×1 + 5×2 = 50  | Physics: 20×1 + 5×2 = 30  | Chemistry: 20×1 + 5×2 = 30  | English: 30×1 = 30
// Total: 110 one-mark + 15 two-mark = 110+30 = 140 marks
const IOE_DISTRIBUTION: Record<string, { oneMarkCount: number; twoMarkCount: number }> = {
  Mathematics: { oneMarkCount: 40, twoMarkCount: 5 },
  Physics:     { oneMarkCount: 20, twoMarkCount: 5 },
  Chemistry:   { oneMarkCount: 20, twoMarkCount: 5 },
  English:     { oneMarkCount: 30, twoMarkCount: 0 },
};
const MOCK_DURATION_MINUTES = 120;

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// POST /api/mock-exam/generate — start a new mock exam attempt
router.post('/generate', requireAuth, requireProfile, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    if (req.user!.role === 'ADMIN') {
      return res.status(403).json({ error: 'Admins cannot take exams' });
    }

    // Get all subjects with topics
    const subjects = await prisma.subject.findMany({
      include: { topics: true },
    });

    const selectedQuestions: Array<{
      id: string; text: string; optionA: string; optionB: string;
      optionC: string; optionD: string; weightage: number;
      subjectName: string; topicName: string;
      passageText: string | null;
    }> = [];

    for (const subject of subjects) {
      const dist = IOE_DISTRIBUTION[subject.name];
      if (!dist) continue;

      // 1-mark questions (no passage)
      if (dist.oneMarkCount > 0) {
        const qs = await prisma.question.findMany({
          where: { subjectId: subject.id, weightage: 1, passageId: null },
          include: { topic: true },
        });
        const picked = shuffleArray(qs).slice(0, dist.oneMarkCount);
        for (const q of picked) {
          selectedQuestions.push({
            id: q.id, text: q.text, optionA: q.optionA, optionB: q.optionB,
            optionC: q.optionC, optionD: q.optionD, weightage: 1,
            subjectName: subject.name, topicName: q.topic.name,
            passageText: null,
          });
        }
      }

      // 2-mark questions (passage-based first, then standalone)
      if (dist.twoMarkCount > 0) {
        const passages = await prisma.passage.findMany({
          where: { subjectId: subject.id },
          include: { questions: { where: { weightage: 2 } } },
        });

        let used = 0;
        for (const p of shuffleArray(passages)) {
          if (used >= dist.twoMarkCount || p.questions.length === 0) continue;
          const remaining = dist.twoMarkCount - used;
          const picked = shuffleArray(p.questions).slice(0, remaining);
          for (const q of picked) {
            selectedQuestions.push({
              id: q.id, text: q.text, optionA: q.optionA, optionB: q.optionB,
              optionC: q.optionC, optionD: q.optionD, weightage: 2,
              subjectName: subject.name, topicName: '',
              passageText: p.text,
            });
            used++;
          }
        }

        // Fallback: standalone 2-mark
        if (used < dist.twoMarkCount) {
          const standAlone = await prisma.question.findMany({
            where: { subjectId: subject.id, weightage: 2, passageId: null },
            include: { topic: true },
          });
          const picked = shuffleArray(standAlone).slice(0, dist.twoMarkCount - used);
          for (const q of picked) {
            selectedQuestions.push({
              id: q.id, text: q.text, optionA: q.optionA, optionB: q.optionB,
              optionC: q.optionC, optionD: q.optionD, weightage: 2,
              subjectName: subject.name, topicName: q.topic.name,
              passageText: null,
            });
          }
        }
      }
    }

    const totalMarks = selectedQuestions.reduce((s, q) => s + q.weightage, 0);

    // Create attempt record
    const attempt = await prisma.mockExamAttempt.create({
      data: {
        userId,
        questions: selectedQuestions as any,
        totalMarks,
      },
    });

    res.json({
      attemptId: attempt.id,
      questions: selectedQuestions,
      totalMarks,
      durationMinutes: MOCK_DURATION_MINUTES,
      startedAt: attempt.startedAt,
    });
  } catch (err) {
    console.error('Mock exam generate error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/mock-exam/attempts/:id/answer
router.patch('/attempts/:id/answer', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { questionId, selectedOption } = req.body;
    const attempt = await prisma.mockExamAttempt.findFirst({
      where: { id: req.params.id as string, userId, isSubmitted: false },
    });
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

    const current = (attempt.answers as Record<string, string>) || {};
    if (selectedOption === null) {
      delete current[questionId];
    } else {
      current[questionId] = selectedOption;
    }

    await prisma.mockExamAttempt.update({ where: { id: attempt.id }, data: { answers: current } });
    res.json({ ok: true });
  } catch (err) {
    console.error('Mock exam answer save error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/mock-exam/attempts/:id/submit
router.post('/attempts/:id/submit', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const attempt = await prisma.mockExamAttempt.findFirst({
      where: { id: req.params.id as string, userId, isSubmitted: false },
    });
    if (!attempt) return res.status(404).json({ error: 'Attempt not found or already submitted' });

    const questions = attempt.questions as Array<{ id: string; correctOption: string; weightage: number; subjectName: string }>;
    const answers = { ...((attempt.answers as Record<string, string>) || {}), ...((req.body.answers as Record<string, string>) || {}) };
    const timeTakenSeconds = req.body.timeTakenSeconds ?? null;

    let totalScore = 0;
    const breakdown: Record<string, { correct: number; wrong: number; skipped: number; marks: number }> = {};

    for (const q of questions) {
      if (!breakdown[q.subjectName]) breakdown[q.subjectName] = { correct: 0, wrong: 0, skipped: 0, marks: 0 };
      const chosen = answers[q.id];
      if (!chosen) {
        breakdown[q.subjectName].skipped++;
      } else if (chosen === q.correctOption) {
        totalScore += q.weightage;
        breakdown[q.subjectName].correct++;
        breakdown[q.subjectName].marks += q.weightage;
      } else {
        // 10% negative marking
        const penalty = q.weightage * 0.1;
        totalScore = Math.max(0, totalScore - penalty);
        breakdown[q.subjectName].wrong++;
        breakdown[q.subjectName].marks -= penalty;
      }
    }

    const updated = await prisma.mockExamAttempt.update({
      where: { id: attempt.id },
      data: {
        answers,
        totalScore,
        isSubmitted: true,
        finishedAt: new Date(),
        timeTakenSeconds,
        resultBreakdown: breakdown as any,
      },
    });

    res.json({
      attemptId: attempt.id,
      totalScore,
      totalMarks: attempt.totalMarks,
      resultBreakdown: breakdown,
      timeTakenSeconds,
    });
  } catch (err) {
    console.error('Mock exam submit error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/mock-exam/attempts/:id — get result of a submitted attempt
router.get('/attempts/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const attempt = await prisma.mockExamAttempt.findFirst({
      where: { id: req.params.id as string, userId },
    });
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
    res.json(attempt);
  } catch (err) {
    console.error('Get mock attempt error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/mock-exam/attempts — list user's mock exam history
router.get('/attempts', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const attempts = await prisma.mockExamAttempt.findMany({
      where: { userId, isSubmitted: true },
      orderBy: { finishedAt: 'desc' },
      take: 20,
      select: { id: true, totalScore: true, totalMarks: true, finishedAt: true, timeTakenSeconds: true, resultBreakdown: true },
    });
    res.json(attempts);
  } catch (err) {
    console.error('Mock exam history error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
