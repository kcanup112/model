import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireProfile } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/special-exams — list all active special exams
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const exams = await prisma.specialExam.findMany({
      where: { isActive: true },
      include: { _count: { select: { questions: true, attempts: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(exams);
  } catch (err) {
    console.error('List special exams error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/special-exams/:id — get single special exam details
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const exam = await prisma.specialExam.findFirst({
      where: { id: req.params.id as string, isActive: true },
      include: { _count: { select: { questions: true } } },
    });
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    res.json(exam);
  } catch (err) {
    console.error('Get special exam error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/special-exams/:id/start — start or resume an attempt
router.post('/:id/start', requireAuth, requireProfile, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const examId = req.params.id as string;

    if (req.user!.role === 'ADMIN') {
      return res.status(403).json({ error: 'Admins cannot take exams' });
    }

    const exam = await prisma.specialExam.findFirst({
      where: { id: examId, isActive: true },
      include: { questions: { orderBy: { displayOrder: 'asc' } } },
    });
    if (!exam) return res.status(404).json({ error: 'Exam not found or inactive' });

    // Check for existing in-progress attempt
    const existing = await prisma.specialExamAttempt.findFirst({
      where: { userId, specialExamId: examId, isSubmitted: false },
      orderBy: { startedAt: 'desc' },
    });
    if (existing) {
      return res.json({
        attemptId: existing.id,
        questions: exam.questions,
        answers: existing.answers || {},
        durationMinutes: exam.durationMinutes,
        startedAt: existing.startedAt,
        resuming: true,
      });
    }

    const attempt = await prisma.specialExamAttempt.create({
      data: { userId, specialExamId: examId },
    });

    res.json({
      attemptId: attempt.id,
      questions: exam.questions,
      answers: {},
      durationMinutes: exam.durationMinutes,
      startedAt: attempt.startedAt,
      resuming: false,
    });
  } catch (err) {
    console.error('Start special exam error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/special-exams/attempts/:id/answer
router.patch('/attempts/:id/answer', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { questionId, selectedOption } = req.body;
    const attempt = await prisma.specialExamAttempt.findFirst({
      where: { id: req.params.id as string, userId, isSubmitted: false },
    });
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

    const current = (attempt.answers as Record<string, string>) || {};
    if (selectedOption === null) {
      delete current[questionId];
    } else {
      current[questionId] = selectedOption;
    }

    await prisma.specialExamAttempt.update({ where: { id: attempt.id }, data: { answers: current } });
    res.json({ ok: true });
  } catch (err) {
    console.error('Save special exam answer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/special-exams/attempts/:id/submit
router.post('/attempts/:id/submit', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const attempt = await prisma.specialExamAttempt.findFirst({
      where: { id: req.params.id as string, userId, isSubmitted: false },
      include: { specialExam: { include: { questions: true } } },
    });
    if (!attempt) return res.status(404).json({ error: 'Attempt not found or already submitted' });

    const questions = attempt.specialExam.questions;
    const answers = { ...((attempt.answers as Record<string, string>) || {}), ...((req.body.answers as Record<string, string>) || {}) };
    const timeTakenSeconds = req.body.timeTakenSeconds ?? null;

    let totalScore = 0;
    for (const q of questions) {
      const chosen = answers[q.id];
      if (chosen === q.correctOption) totalScore += q.weightage;
    }

    await prisma.specialExamAttempt.update({
      where: { id: attempt.id },
      data: { answers, totalScore, isSubmitted: true, finishedAt: new Date(), timeTakenSeconds },
    });

    res.json({
      attemptId: attempt.id,
      totalScore,
      totalQuestions: questions.length,
      timeTakenSeconds,
      examTitle: attempt.specialExam.title,
    });
  } catch (err) {
    console.error('Submit special exam error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/special-exams/attempts/:id — get attempt result
router.get('/attempts/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const attempt = await prisma.specialExamAttempt.findFirst({
      where: { id: req.params.id as string, userId },
      include: { specialExam: { include: { questions: true } } },
    });
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
    res.json(attempt);
  } catch (err) {
    console.error('Get special exam attempt error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
