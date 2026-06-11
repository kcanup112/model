import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireProfile } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// IOE Entrance Exam pattern (updated mock exam)
// Math: 20×1 + 15×1 = 35  | Physics: 14×1 + 13×1 = 27  | Chemistry: 14×1 + 8×1 = 22
// English: 12×1 + 4×1 (1 comprehension passage) = 16
// Total: 100×1 = 100 marks
const IOE_DISTRIBUTION: Record<string, { oneMarkCount: number; twoMarkCount: number; singlePassage?: boolean }> = {
  Mathematics: { oneMarkCount: 20, twoMarkCount: 15 },
  Physics:     { oneMarkCount: 14, twoMarkCount: 13 },
  Chemistry:   { oneMarkCount: 14, twoMarkCount: 8 },
  English:     { oneMarkCount: 12, twoMarkCount: 4, singlePassage: true },
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

    // ── Process English FIRST so passage questions always lead the English block ──
    const englishSubject = subjects.find(s => s.name === 'English');
    const nonEnglishSubjects = subjects.filter(s => s.name !== 'English');
    const orderedSubjects = englishSubject ? [englishSubject, ...nonEnglishSubjects] : nonEnglishSubjects;

    for (const subject of orderedSubjects) {
      const dist = IOE_DISTRIBUTION[subject.name];
      if (!dist) continue;

      if (dist.singlePassage) {
        // ── English: 1 comprehension passage (4×1M) FIRST, then 12 standalone 1M ──

        // Pick one passage that has enough questions, ordered to prefer fuller passages
        const passages = await prisma.passage.findMany({
          where: { subjectId: subject.id },
          include: { questions: { include: { topic: true } } },
          orderBy: { id: 'asc' }, // stable ordering for reproducibility
        });
        const eligiblePassages = passages.filter(p => p.questions.length >= dist.twoMarkCount);
        const passagePool = eligiblePassages.length > 0 ? eligiblePassages : passages.filter(p => p.questions.length > 0);

        if (passagePool.length === 0) {
          throw new Error('No English passages found in the database');
        }

        // Pick a random passage from the eligible pool
        const preferred = passagePool[Math.floor(Math.random() * passagePool.length)];
        const passageQs = shuffleArray(preferred.questions).slice(0, dist.twoMarkCount);
        for (const q of passageQs) {
          selectedQuestions.push({
            id: q.id, text: q.text, optionA: q.optionA, optionB: q.optionB,
            optionC: q.optionC, optionD: q.optionD,
            weightage: 1,
            subjectName: subject.name, topicName: q.topic?.name ?? 'Comprehension',
            passageText: preferred.text,
          });
        }

        // Standalone questions (Grammar I, Grammar II, Phonetics — passageId is null)
        if (dist.oneMarkCount > 0) {
          const standaloneQs = await prisma.question.findMany({
            where: { subjectId: subject.id, passageId: null },
            include: { topic: true },
          });
          const picked = shuffleArray(standaloneQs).slice(0, dist.oneMarkCount);
          for (const q of picked) {
            selectedQuestions.push({
              id: q.id, text: q.text, optionA: q.optionA, optionB: q.optionB,
              optionC: q.optionC, optionD: q.optionD,
              weightage: 1,
              subjectName: subject.name, topicName: q.topic.name,
              passageText: null,
            });
          }
        }
      } else {
        // ── Other subjects: passage-based 1M groups first, then standalone 1M, then former 2M questions as 1M ──

        if (dist.oneMarkCount > 0) {
          // Passage-based 1M groups (keep whole passage together)
          const passages1m = await prisma.passage.findMany({
            where: { subjectId: subject.id },
            include: { questions: { where: { weightage: 1 } } },
          });
          let passageUsed = 0;
          for (const p of shuffleArray(passages1m).filter(p => p.questions.length > 0)) {
            if (passageUsed + p.questions.length <= dist.oneMarkCount) {
              for (const q of p.questions) {
                selectedQuestions.push({
                  id: q.id, text: q.text, optionA: q.optionA, optionB: q.optionB,
                  optionC: q.optionC, optionD: q.optionD, weightage: 1,
                  subjectName: subject.name, topicName: '',
                  passageText: p.text,
                });
                passageUsed++;
              }
            }
          }
          // Fill remaining with standalone 1M
          const remaining1m = dist.oneMarkCount - passageUsed;
          if (remaining1m > 0) {
            const standaloneQs = await prisma.question.findMany({
              where: { subjectId: subject.id, weightage: 1, passageId: null },
              include: { topic: true },
            });
            const picked = shuffleArray(standaloneQs).slice(0, remaining1m);
            for (const q of picked) {
              selectedQuestions.push({
                id: q.id, text: q.text, optionA: q.optionA, optionB: q.optionB,
                optionC: q.optionC, optionD: q.optionD, weightage: 1,
                subjectName: subject.name, topicName: q.topic.name,
                passageText: null,
              });
            }
          }
        }

        if (dist.twoMarkCount > 0) {
          const passages2m = await prisma.passage.findMany({
            where: { subjectId: subject.id },
            include: { questions: { where: { weightage: 2 } } },
          });
          let used = 0;
          for (const p of shuffleArray(passages2m)) {
            if (used >= dist.twoMarkCount || p.questions.length === 0) continue;
            const remaining = dist.twoMarkCount - used;
            const picked = shuffleArray(p.questions).slice(0, remaining);
            for (const q of picked) {
              selectedQuestions.push({
                id: q.id, text: q.text, optionA: q.optionA, optionB: q.optionB,
                optionC: q.optionC, optionD: q.optionD, weightage: 1,
                subjectName: subject.name, topicName: '',
                passageText: p.text,
              });
              used++;
            }
          }
          // Fallback: standalone 2M
          if (used < dist.twoMarkCount) {
            const standAlone = await prisma.question.findMany({
              where: { subjectId: subject.id, weightage: 2, passageId: null },
              include: { topic: true },
            });
            const picked = shuffleArray(standAlone).slice(0, dist.twoMarkCount - used);
            for (const q of picked) {
              selectedQuestions.push({
                id: q.id, text: q.text, optionA: q.optionA, optionB: q.optionB,
                optionC: q.optionC, optionD: q.optionD, weightage: 1,
                subjectName: subject.name, topicName: q.topic.name,
                passageText: null,
              });
            }
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

    const storedQuestions = attempt.questions as Array<{ id: string; weightage: number; subjectName: string }>;
    const answers = { ...((attempt.answers as Record<string, string>) || {}), ...((req.body.answers as Record<string, string>) || {}) };
    const timeTakenSeconds = req.body.timeTakenSeconds ?? null;

    // Fetch correct answers from DB (not stored in attempt to avoid exposing them)
    const questionIds = storedQuestions.map((q) => q.id);
    const dbQuestions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, correctOption: true },
    });
    const correctOptionMap = new Map(dbQuestions.map((q) => [q.id, q.correctOption]));

    let totalScore = 0;
    const breakdown: Record<string, { correct: number; wrong: number; skipped: number; marks: number }> = {};

    for (const q of storedQuestions) {
      if (!breakdown[q.subjectName]) breakdown[q.subjectName] = { correct: 0, wrong: 0, skipped: 0, marks: 0 };
      const chosen = answers[q.id];
      const correctOption = correctOptionMap.get(q.id);
      if (!chosen) {
        breakdown[q.subjectName].skipped++;
      } else if (chosen === correctOption) {
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
