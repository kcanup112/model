import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, requireProfile } from '../middleware/auth';
import { examSession, leaderboard, activeExam } from '../services/redis';
import { calculateScore } from '../services/scoring';
import { broadcastLeaderboardUpdate } from '../services/socket';

const router = Router();
const prisma = new PrismaClient();

// GET /api/exams — list available exams
router.get('/', async (_req: Request, res: Response) => {
  try {
    const exams = await prisma.exam.findMany({
      where: { isActive: true },
      include: { topicDistribution: { include: { topic: { include: { subject: true } } }, orderBy: { topic: { displayOrder: 'asc' } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(exams);
  } catch (err) {
    console.error('List exams error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/exams/:examId/start — start an exam attempt
router.post('/:examId/start', requireAuth, requireProfile, async (req: Request, res: Response) => {
  try {
    const examId = req.params.examId as string;
    const userId = req.user!.id as string;

    // Admins cannot take exams
    if (req.user!.role === 'ADMIN') {
      return res.status(403).json({ error: 'Admins cannot take exams. Use the admin panel to manage exams.' });
    }

    // Check for in-progress attempt
    const existingAttempt = await prisma.examAttempt.findFirst({
      where: { userId, examId, isSubmitted: false },
    });
    if (existingAttempt) {
      // Resume existing attempt
      const session = await examSession.getAll(existingAttempt.id);
      if (session && Object.keys(session).length > 0) {
        const questions = JSON.parse(session.questions || '[]');
        return res.json({
          attemptId: existingAttempt.id,
          questions,
          startedAt: existingAttempt.startedAt,
          answers: Object.fromEntries(
            Object.entries(session)
              .filter(([k]) => k.startsWith('answer:'))
              .map(([k, v]) => [k.replace('answer:', ''), v])
          ),
          resuming: true,
        });
      }
    }

    // Fetch exam with topic distribution
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { topicDistribution: { include: { topic: { include: { subject: true } } } } },
    });
    if (!exam || !exam.isActive) {
      return res.status(404).json({ error: 'Exam not found or inactive' });
    }

    // Generate question set per topic distribution
    const selectedQuestions: Array<{
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
    }> = [];

    for (const dist of exam.topicDistribution) {
      const subjectName = dist.topic.subject.name;

      // Get questions for this topic (all 1-mark now). Use standalone questions
      // first; if the topic is passage-based (e.g. Comprehension), pull a single
      // passage and keep its questions grouped together.
      if (dist.oneMarkCount > 0) {
        let used = 0;

        // 1) Standalone questions for this topic
        const standaloneQs = await prisma.question.findMany({
          where: { topicId: dist.topicId, passageId: null },
        });
        const pickedStandalone = shuffleArray(standaloneQs).slice(0, dist.oneMarkCount);
        for (const q of pickedStandalone) {
          selectedQuestions.push({
            id: q.id, text: q.text, optionA: q.optionA, optionB: q.optionB,
            optionC: q.optionC, optionD: q.optionD, weightage: 1, // all questions are 1M
            subjectName, passageText: null, passageId: null,
          });
          used++;
        }

        // 2) Fill remaining from passages (keep one passage's questions together)
        if (used < dist.oneMarkCount) {
          const passages = await prisma.passage.findMany({
            where: { subjectId: dist.topic.subjectId },
            include: { questions: { where: { topicId: dist.topicId } } },
          });
          const validPassages = shuffleArray(passages.filter(p => p.questions.length > 0));
          for (const passage of validPassages) {
            if (used >= dist.oneMarkCount) break;
            const remaining = dist.oneMarkCount - used;
            const picked = shuffleArray(passage.questions).slice(0, remaining);
            for (const q of picked) {
              selectedQuestions.push({
                id: q.id, text: q.text, optionA: q.optionA, optionB: q.optionB,
                optionC: q.optionC, optionD: q.optionD, weightage: 1, // all questions are 1M
                subjectName, passageText: passage.text, passageId: passage.id,
              });
              used++;
            }
          }
        }
      }

      // Get 2-mark questions for this topic (may include passage-based)
      if (dist.twoMarkCount > 0) {
        // First try passage-based questions for this topic's subject
        const passages = await prisma.passage.findMany({
          where: { subjectId: dist.topic.subjectId },
          include: { questions: { where: { topicId: dist.topicId, weightage: 2 } } },
        });

        let passageQsUsed = 0;
        const shuffledPassages = shuffleArray(passages).filter(p => p.questions.length > 0);

        for (const passage of shuffledPassages) {
          if (passageQsUsed >= dist.twoMarkCount) break;
          const remaining = dist.twoMarkCount - passageQsUsed;
          const shuffledPQs = shuffleArray(passage.questions);
          const picked = shuffledPQs.slice(0, remaining);
          for (const q of picked) {
            selectedQuestions.push({
              id: q.id, text: q.text, optionA: q.optionA, optionB: q.optionB,
              optionC: q.optionC, optionD: q.optionD, weightage: q.weightage,
              subjectName, passageText: passage.text, passageId: passage.id,
            });
            passageQsUsed++;
          }
        }

        // Fill remaining with standalone 2-mark questions
        const remaining = dist.twoMarkCount - passageQsUsed;
        if (remaining > 0) {
          const twoMarkQs = await prisma.question.findMany({
            where: { topicId: dist.topicId, weightage: 2, passageId: null },
          });
          const shuffled = shuffleArray(twoMarkQs);
          const picked = shuffled.slice(0, remaining);
          for (const q of picked) {
            selectedQuestions.push({
              id: q.id, text: q.text, optionA: q.optionA, optionB: q.optionB,
              optionC: q.optionC, optionD: q.optionD, weightage: q.weightage,
              subjectName, passageText: null, passageId: null,
            });
          }
        }
      }
    }

    // Create exam attempt
    const attempt = await prisma.examAttempt.create({
      data: {
        id: uuidv4(),
        userId,
        examId,
        startedAt: new Date(),
        isSubmitted: false,
        totalScore: 0,
      },
    });

    // Sort questions: Section A (1M) then Section B (2M), within each grouped by subject
    const subjectOrder: Record<string, number> = { Physics: 1, Chemistry: 2, Mathematics: 3, English: 4 };
    selectedQuestions.sort((a, b) => {
      // Primary: weightage (1M first, then 2M)
      if (a.weightage !== b.weightage) return a.weightage - b.weightage;
      // Secondary: subject order
      return (subjectOrder[a.subjectName] || 99) - (subjectOrder[b.subjectName] || 99);
    });

    // Store in Redis
    await examSession.create(attempt.id, {
      questions: JSON.stringify(selectedQuestions),
      startedAt: new Date().toISOString(),
      examId,
    });

    // Track active user
    await activeExam.addUser(examId, userId);

    // Return questions without correct answers
    res.status(201).json({
      attemptId: attempt.id,
      questions: selectedQuestions,
      startedAt: attempt.startedAt,
      durationMinutes: exam.durationMinutes,
      totalMarks: exam.totalMarks,
    });
  } catch (err) {
    console.error('Start exam error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/exams/attempts/:attemptId/answer — save single answer
router.patch('/attempts/:attemptId/answer', requireAuth, async (req: Request, res: Response) => {
  try {
    const attemptId = req.params.attemptId as string;
    const { questionId, selectedOption } = req.body;

    if (!questionId) {
      return res.status(400).json({ error: 'questionId required' });
    }

    const attempt = await prisma.examAttempt.findFirst({
      where: { id: attemptId, userId: req.user!.id as string, isSubmitted: false },
    });
    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found or already submitted' });
    }

    await examSession.updateAnswer(attemptId, questionId, selectedOption || '');
    res.json({ saved: true });
  } catch (err) {
    console.error('Save answer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/exams/attempts/:attemptId/submit — submit exam
router.post('/attempts/:attemptId/submit', requireAuth, async (req: Request, res: Response) => {
  try {
    const attemptId = req.params.attemptId as string;
    const userId = req.user!.id as string;

    const attempt = await prisma.examAttempt.findFirst({
      where: { id: attemptId, userId, isSubmitted: false },
      include: { exam: true },
    });
    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found or already submitted' });
    }

    // Get session from Redis
    const session = await examSession.getAll(attemptId);
    if (!session || !session.questions) {
      return res.status(400).json({ error: 'Exam session expired' });
    }

    const questions = JSON.parse(session.questions) as Array<{
      id: string;
      subjectName: string;
      weightage: number;
    }>;

    // Collect answers from Redis
    const answers: Record<string, string | null> = {};
    for (const q of questions) {
      const ans = session[`answer:${q.id}`];
      answers[q.id] = ans && ans !== '' ? ans : null;
    }

    // Fetch correct answers from DB
    const questionIds = questions.map((q) => q.id);
    const dbQuestions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, correctOption: true, weightage: true, subjectId: true },
    });

    // Build subject map
    const subjectMap: Record<string, string> = {};
    for (const q of questions) {
      subjectMap[q.id] = q.subjectName;
    }

    // Calculate score
    const result = calculateScore(
      {
        questions: dbQuestions.map((q) => ({
          id: q.id,
          correct_option: q.correctOption,
          weightage: q.weightage,
        })),
        answers,
        negativeMarkingPercent: attempt.exam.negativeMarkingPercent,
      },
      subjectMap
    );

    // Update attempt in DB
    const now = new Date();
    const timeTaken = Math.floor((now.getTime() - attempt.startedAt.getTime()) / 1000);

    await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        isSubmitted: true,
        finishedAt: now,
        timeTakenSeconds: timeTaken,
        totalScore: result.totalScore,
        answers: JSON.stringify(result.details),
      },
    });

    // Update leaderboard
    await leaderboard.addScore(attempt.examId, userId, result.totalScore);
    await activeExam.removeUser(attempt.examId, userId);

    // Broadcast leaderboard update
    const io = req.app.get('io');
    if (io) {
      const top = await leaderboard.getTop(attempt.examId);
      broadcastLeaderboardUpdate(io, attempt.examId, top);
    }

    // Clean up Redis session
    await examSession.delete(attemptId);

    res.json({
      totalScore: result.totalScore,
      totalMarks: result.totalMarks,
      correct: result.correct,
      wrong: result.wrong,
      unattempted: result.unattempted,
      subjectBreakdown: result.subjectBreakdown,
      timeTakenSeconds: timeTaken,
    });
  } catch (err) {
    console.error('Submit exam error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/exams/attempts/:attemptId/review — review attempt (after submission)
router.get('/attempts/:attemptId/review', requireAuth, async (req: Request, res: Response) => {
  try {
    const attemptId = req.params.attemptId as string;

    const attempt = await prisma.examAttempt.findFirst({
      where: { id: attemptId, userId: req.user!.id as string, isSubmitted: true },
      include: { exam: true },
    });
    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found or not yet submitted' });
    }

    const details = typeof attempt.answers === 'string' ? JSON.parse(attempt.answers) : attempt.answers;

    // Fetch full questions with correct answers
    const questionIds = details.map((d: { questionId: string }) => d.questionId);
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      include: { subject: true, passage: true },
    });

    const questionsMap = new Map(questions.map((q) => [q.id, q]));

    const review = details.map((d: any) => {
      const q = questionsMap.get(d.questionId);
      return {
        ...d,
        questionText: q?.text,
        optionA: q?.optionA,
        optionB: q?.optionB,
        optionC: q?.optionC,
        optionD: q?.optionD,
        subject: q?.subject?.name,
        passageText: q?.passage?.text || null,
      };
    });

    res.json({
      attemptId: attempt.id,
      examName: attempt.exam.name,
      totalScore: attempt.totalScore,
      totalMarks: attempt.exam.totalMarks,
      timeTakenSeconds: attempt.timeTakenSeconds,
      startedAt: attempt.startedAt,
      finishedAt: attempt.finishedAt,
      review,
    });
  } catch (err) {
    console.error('Review error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/exams/attempts — list user's attempts
router.get('/attempts', requireAuth, async (req: Request, res: Response) => {
  try {
    const attempts = await prisma.examAttempt.findMany({
      where: { userId: req.user!.id as string, isSubmitted: true },
      include: { exam: { select: { name: true, totalMarks: true } } },
      orderBy: { finishedAt: 'desc' },
    });
    res.json(attempts);
  } catch (err) {
    console.error('List attempts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/exams/:examId/leaderboard
router.get('/:examId/leaderboard', async (req: Request, res: Response) => {
  try {
    const examId = req.params.examId as string;
    const top = await leaderboard.getTop(examId);

    // Parse Redis sorted set response: [userId, score, userId, score, ...]
    const entries = [];
    for (let i = 0; i < top.length; i += 2) {
      const userId = top[i];
      const score = parseFloat(top[i + 1]);
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: { select: { fullName: true } } },
      });
      entries.push({
        rank: Math.floor(i / 2) + 1,
        userId,
        name: user?.profile?.fullName || 'Anonymous',
        score,
      });
    }

    res.json(entries);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default router;
