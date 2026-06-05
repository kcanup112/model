import { Router, Request, Response } from 'express';
import { PrismaClient, Difficulty } from '@prisma/client';
import { requireAuth, requireProfile } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function starsForScore(correct: number, total: number): number {
  const pct = total > 0 ? (correct / total) * 100 : 0;
  if (pct >= 85) return 3;
  if (pct >= 70) return 2;
  if (pct >= 50) return 1;
  return 0;
}

type CandidateQuestion = Awaited<ReturnType<typeof loadCandidateQuestions>>[number];

async function loadCandidateQuestions() {
  // Only standalone questions (passageId null) are eligible for levels —
  // comprehension/passage-dependent questions are excluded.
  return prisma.question.findMany({
    where: { passageId: null },
    include: { topic: { include: { subject: true } } },
  });
}

// Split a total into per-difficulty counts using the level's weights.
function splitByDifficulty(
  total: number,
  easyWeight: number,
  mediumWeight: number,
  hardWeight: number,
) {
  const totalWeight = easyWeight + mediumWeight + hardWeight || 100;
  const easy = Math.round((total * easyWeight) / totalWeight);
  const medium = Math.round((total * mediumWeight) / totalWeight);
  const hard = total - easy - medium;
  return { EASY: easy, MEDIUM: Math.max(0, medium), HARD: Math.max(0, hard) } as Record<Difficulty, number>;
}

async function selectQuestionsForLevel(
  easyWeight: number,
  mediumWeight: number,
  hardWeight: number,
  count: number,
) {
  const all = await loadCandidateQuestions();

  // Group candidates by subject name, then by difficulty.
  const bySubject = new Map<string, Record<Difficulty, CandidateQuestion[]>>();
  for (const q of all) {
    const subject = q.topic.subject.name;
    if (!bySubject.has(subject)) {
      bySubject.set(subject, { EASY: [], MEDIUM: [], HARD: [] });
    }
    bySubject.get(subject)![q.difficulty].push(q);
  }

  const subjects = shuffleArray([...bySubject.keys()]);
  const selected: CandidateQuestion[] = [];
  const usedIds = new Set<string>();

  const takeFromPool = (pool: CandidateQuestion[], n: number) => {
    const out: CandidateQuestion[] = [];
    for (const q of shuffleArray(pool)) {
      if (out.length >= n) break;
      if (usedIds.has(q.id)) continue;
      usedIds.add(q.id);
      out.push(q);
    }
    return out;
  };

  if (subjects.length > 0) {
    // Even split across subjects; distribute remainder to random subjects.
    const base = Math.floor(count / subjects.length);
    const remainder = count - base * subjects.length;
    const subjectQuota = new Map<string, number>();
    subjects.forEach((s, i) => subjectQuota.set(s, base + (i < remainder ? 1 : 0)));

    // Within each subject, split its quota across difficulties by weight.
    for (const subject of subjects) {
      const quota = subjectQuota.get(subject)!;
      if (quota <= 0) continue;
      const pools = bySubject.get(subject)!;
      const diffSplit = splitByDifficulty(quota, easyWeight, mediumWeight, hardWeight);
      let shortfall = 0;
      for (const diff of ['EASY', 'MEDIUM', 'HARD'] as Difficulty[]) {
        const want = diffSplit[diff];
        const got = takeFromPool(pools[diff], want);
        selected.push(...got);
        shortfall += want - got.length;
      }
      // Cover within-subject difficulty shortfall from this subject's other difficulties.
      if (shortfall > 0) {
        const leftovers = [...pools.EASY, ...pools.MEDIUM, ...pools.HARD];
        selected.push(...takeFromPool(leftovers, shortfall));
      }
    }
  }

  // Redistribute any global deficit (e.g. a subject lacked enough questions)
  // by pulling from the remaining standalone pool.
  if (selected.length < count) {
    selected.push(...takeFromPool(all, count - selected.length));
  }

  return shuffleArray(selected).slice(0, count).map((q) => ({
    id: q.id,
    text: q.text,
    optionA: q.optionA,
    optionB: q.optionB,
    optionC: q.optionC,
    optionD: q.optionD,
    correctOption: q.correctOption,
    weightage: q.weightage,
    difficulty: q.difficulty,
    subjectName: q.topic.subject.name,
    topicName: q.topic.name,
  }));
}

// ─── Routes ──────────────────────────────────────────────────

// GET /api/levels — list all active levels + user progress summary
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const [levels, progressRows] = await Promise.all([
      prisma.levelConfig.findMany({ where: { isActive: true }, orderBy: { levelNumber: 'asc' } }),
      prisma.userLevelProgress.findMany({
        where: { userId, isSubmitted: true },
        select: { levelNumber: true, subLevel: true, isPassed: true, stars: true, score: true, correctAnswers: true, totalQuestions: true },
      }),
    ]);

    // Build progress map: [levelNumber][subLevel] → { isPassed, stars }
    const progressMap: Record<number, Record<number, { isPassed: boolean; stars: number; score: number; correctAnswers: number; totalQuestions: number }>> = {};
    for (const row of progressRows) {
      if (!progressMap[row.levelNumber]) progressMap[row.levelNumber] = {};
      const existing = progressMap[row.levelNumber][row.subLevel];
      // Keep best attempt per sub-level
      if (!existing || row.stars > existing.stars) {
        progressMap[row.levelNumber][row.subLevel] = {
          isPassed: row.isPassed,
          stars: row.stars,
          score: row.score,
          correctAnswers: row.correctAnswers,
          totalQuestions: row.totalQuestions,
        };
      }
    }

    const result = levels.map((lvl) => {
      const subProgress = progressMap[lvl.levelNumber] || {};
      const subLevels = Array.from({ length: lvl.subLevelCount }, (_, i) => {
        const sl = i + 1;
        return { subLevel: sl, ...(subProgress[sl] || { isPassed: false, stars: 0, score: 0, correctAnswers: 0, totalQuestions: lvl.questionsPerSublevel }) };
      });
      const passedCount = subLevels.filter((s) => s.isPassed).length;
      const levelCompleted = passedCount === lvl.subLevelCount;
      const totalStars = subLevels.reduce((s, x) => s + x.stars, 0);
      return { ...lvl, subLevels, levelCompleted, totalStars, passedSubLevels: passedCount };
    });

    res.json(result);
  } catch (err) {
    console.error('Get levels error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/levels/:level/sublevel/:sublevel/start
router.post('/:level/sublevel/:sublevel/start', requireAuth, requireProfile, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const levelNumber = parseInt(req.params.level as string);
    const subLevel = parseInt(req.params.sublevel as string);

    if (isNaN(levelNumber) || isNaN(subLevel)) {
      return res.status(400).json({ error: 'Invalid level or sublevel' });
    }

    // Admins cannot take exams
    if (req.user!.role === 'ADMIN') {
      return res.status(403).json({ error: 'Admins cannot take exams' });
    }

    // Load level config
    const levelConfig = await prisma.levelConfig.findUnique({ where: { levelNumber } });
    if (!levelConfig || !levelConfig.isActive) {
      return res.status(404).json({ error: 'Level not found or inactive' });
    }
    if (subLevel < 1 || subLevel > levelConfig.subLevelCount) {
      return res.status(400).json({ error: 'Sub-level out of range' });
    }

    // Unlock check: sub-level > 1 requires previous sub-level passed
    if (subLevel > 1) {
      const prev = await prisma.userLevelProgress.findFirst({
        where: { userId, levelNumber, subLevel: subLevel - 1, isSubmitted: true, isPassed: true },
      });
      if (!prev) {
        return res.status(403).json({ error: 'Complete the previous sub-level first' });
      }
    }

    // Level > 1 requires previous level completed
    if (levelNumber > 1) {
      const prevLevelConfig = await prisma.levelConfig.findUnique({ where: { levelNumber: levelNumber - 1 } });
      if (prevLevelConfig) {
        const prevLevelPassed = await prisma.userLevelProgress.count({
          where: { userId, levelNumber: levelNumber - 1, isSubmitted: true, isPassed: true },
        });
        // We need ALL sublevels of previous level passed
        const uniquePreviousSubLevels = await prisma.userLevelProgress.findMany({
          where: { userId, levelNumber: levelNumber - 1, isSubmitted: true, isPassed: true },
          select: { subLevel: true },
          distinct: ['subLevel'],
        });
        if (uniquePreviousSubLevels.length < prevLevelConfig.subLevelCount) {
          return res.status(403).json({ error: 'Complete all sub-levels of the previous level first' });
        }
      }
    }

    // Check for existing in-progress attempt (resume)
    const existing = await prisma.userLevelProgress.findFirst({
      where: { userId, levelNumber, subLevel, isSubmitted: false },
      orderBy: { startedAt: 'desc' },
    });
    if (existing && existing.questions) {
      const clientQs = (existing.questions as any[]).map(({ correctOption: _c, ...rest }) => rest);
      return res.json({
        attemptId: existing.id,
        questions: clientQs,
        answers: existing.answers || {},
        resuming: true,
      });
    }

    // Generate questions
    const questions = await selectQuestionsForLevel(
      levelConfig.easyWeight,
      levelConfig.mediumWeight,
      levelConfig.hardWeight,
      levelConfig.questionsPerSublevel,
    );

    // Create attempt
    const attempt = await prisma.userLevelProgress.create({
      data: {
        userId,
        levelNumber,
        subLevel,
        totalQuestions: levelConfig.questionsPerSublevel,
        questions: questions as any,
      },
    });

    const clientQs = questions.map(({ correctOption: _c, ...rest }) => rest);
    res.json({ attemptId: attempt.id, questions: clientQs, answers: {}, resuming: false });
  } catch (err) {
    console.error('Start level sublevel error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/levels/attempts/:attemptId/answer — save single answer
router.patch('/attempts/:attemptId/answer', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { questionId, selectedOption } = req.body;
    const attempt = await prisma.userLevelProgress.findFirst({
      where: { id: req.params.attemptId as string, userId, isSubmitted: false },
    });
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

    const current = (attempt.answers as Record<string, string>) || {};
    if (selectedOption === null) {
      delete current[questionId];
    } else {
      current[questionId] = selectedOption;
    }

    await prisma.userLevelProgress.update({
      where: { id: attempt.id },
      data: { answers: current },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Save level answer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/levels/attempts/:attemptId/submit
router.post('/attempts/:attemptId/submit', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const attempt = await prisma.userLevelProgress.findFirst({
      where: { id: req.params.attemptId as string, userId, isSubmitted: false },
    });
    if (!attempt) return res.status(404).json({ error: 'Attempt not found or already submitted' });

    const storedQuestions = (attempt.questions as Array<{ id: string; correctOption?: string }>) || [];
    const answers = (attempt.answers as Record<string, string>) || {};
    const finalAnswers = { ...answers, ...((req.body.answers as Record<string, string>) || {}) };

    // If stored questions are missing correctOption (old attempts), re-fetch from DB
    const needsRefetch = storedQuestions.length > 0 && storedQuestions[0].correctOption == null;
    let questions: Array<{ id: string; correctOption: string }>;
    if (needsRefetch) {
      const ids = storedQuestions.map((q) => q.id);
      const dbQs = await prisma.question.findMany({ where: { id: { in: ids } }, select: { id: true, correctOption: true } });
      const map = Object.fromEntries(dbQs.map((q) => [q.id, q.correctOption]));
      questions = storedQuestions.map((q) => ({ id: q.id, correctOption: map[q.id] ?? '' }));
    } else {
      questions = storedQuestions as Array<{ id: string; correctOption: string }>;
    }

    let correctAnswers = 0;
    for (const q of questions) {
      if (finalAnswers[q.id] === q.correctOption) correctAnswers++;
    }

    const totalQuestions = questions.length;
    const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    const isPassed = score >= 50;
    const stars = starsForScore(correctAnswers, totalQuestions);

    const updated = await prisma.userLevelProgress.update({
      where: { id: attempt.id },
      data: {
        answers: finalAnswers,
        correctAnswers,
        score,
        isPassed,
        stars,
        isCompleted: true,
        isSubmitted: true,
        finishedAt: new Date(),
      },
    });

    res.json({
      attemptId: attempt.id,
      correctAnswers,
      totalQuestions,
      score,
      isPassed,
      stars,
      levelNumber: attempt.levelNumber,
      subLevel: attempt.subLevel,
    });
  } catch (err) {
    console.error('Submit level attempt error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/levels/attempts/history — user's level attempt history
router.get('/attempts/history', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const history = await prisma.userLevelProgress.findMany({
      where: { userId, isSubmitted: true },
      orderBy: { finishedAt: 'desc' },
      take: 50,
      select: { levelNumber: true, subLevel: true, isPassed: true, stars: true, score: true, correctAnswers: true, totalQuestions: true, finishedAt: true },
    });
    res.json(history);
  } catch (err) {
    console.error('Level history error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
