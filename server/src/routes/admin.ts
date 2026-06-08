import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// All admin routes require auth + admin role
router.use(requireAuth, requireAdmin);

// ══════════════════════════════════
//  DASHBOARD STATS
// ══════════════════════════════════

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [totalUsers, activeUsers, totalExams, totalQuestions, totalAttempts, totalSubjects, totalTopics] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true, role: 'STUDENT' } }),
      prisma.exam.count(),
      prisma.question.count(),
      prisma.examAttempt.count({ where: { isSubmitted: true } }),
      prisma.subject.count(),
      prisma.topic.count(),
    ]);

    const recentAttempts = await prisma.examAttempt.findMany({
      where: { isSubmitted: true },
      orderBy: { finishedAt: 'desc' },
      take: 10,
      include: {
        user: { select: { email: true, profile: { select: { fullName: true } } } },
        exam: { select: { name: true, totalMarks: true } },
      },
    });

    res.json({
      totalUsers,
      activeUsers,
      totalExams,
      totalQuestions,
      totalAttempts,
      totalSubjects,
      totalTopics,
      recentAttempts,
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ══════════════════════════════════
//  USER MANAGEMENT
// ══════════════════════════════════

// GET /api/admin/users — list all users
router.get('/users', async (req: Request, res: Response) => {
  try {
    const { search, role, status, page = '1', limit = '20' } = req.query;
    const where: any = {};

    if (search && typeof search === 'string') {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { profile: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (role && typeof role === 'string') where.role = role;
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { profile: { select: { fullName: true, mobilePhone: true, parentsMobilePhone: true, priority1: true, priority2: true, addressStreet: true, addressCity: true, addressDistrict: true, addressProvince: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.user.count({ where }),
    ]);

    const sanitized = users.map(u => ({
      id: u.id,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      isProfileComplete: u.isProfileComplete,
      createdAt: u.createdAt,
      profile: u.profile,
    }));

    res.json({ users: sanitized, total, page: parseInt(page as string), totalPages: Math.ceil(total / parseInt(limit as string)) });
  } catch (err) {
    console.error('Admin list users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/users/export — download all users as CSV
router.get('/users/export', async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: { profile: true },
      orderBy: { createdAt: 'desc' },
    });
    const esc = (v: string | null | undefined) => {
      if (v == null) return '';
      const s = String(v);
      return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const headers = ['Name','Email','Phone','Parents Phone','Street','City','District','Province','Priority 1','Priority 2','Role','Status','Profile Complete','Joined'];
    const rows = users.map(u => [
      esc(u.profile?.fullName), esc(u.email),
      esc(u.profile?.mobilePhone), esc(u.profile?.parentsMobilePhone),
      esc(u.profile?.addressStreet), esc(u.profile?.addressCity),
      esc(u.profile?.addressDistrict), esc(u.profile?.addressProvince),
      esc(u.profile?.priority1), esc(u.profile?.priority2 ?? ''),
      esc(u.role), u.isActive ? 'Active' : 'Inactive',
      u.isProfileComplete ? 'Yes' : 'No',
      new Date(u.createdAt).toISOString().split('T')[0],
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="users-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('User export error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/users/:id/toggle-active
router.patch('/users/:id/toggle-active', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id as string;

    // Prevent self-deactivation
    if (userId === req.user!.id) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
    });

    res.json({ id: updated.id, isActive: updated.isActive });
  } catch (err) {
    console.error('Toggle active error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/users/:id/role — promote/demote
router.patch('/users/:id/role', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id as string;
    const { role } = req.body;

    if (!['ADMIN', 'STUDENT'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Prevent self-demotion
    if (userId === req.user!.id) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    res.json({ id: updated.id, role: updated.role });
  } catch (err) {
    console.error('Change role error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id as string;

    if (userId === req.user!.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await prisma.user.delete({ where: { id: userId } });
    res.json({ deleted: true });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ══════════════════════════════════
//  QUESTION MANAGEMENT
// ══════════════════════════════════

// GET /api/admin/subjects
router.get('/subjects', async (_req: Request, res: Response) => {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        topics: { orderBy: { displayOrder: 'asc' } },
        _count: { select: { questions: true, passages: true } },
      },
    });
    res.json(subjects);
  } catch (err) {
    console.error('List subjects error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/questions
router.get('/questions', async (req: Request, res: Response) => {
  try {
    const { subjectId, weightage, page = '1', limit = '20' } = req.query;
    const where: any = {};
    if (subjectId && typeof subjectId === 'string') where.subjectId = subjectId;
    if (weightage) where.weightage = parseInt(weightage as string);

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        include: { subject: { select: { name: true } }, topic: { select: { id: true, name: true } }, passage: { select: { id: true, text: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.question.count({ where }),
    ]);

    res.json({ questions, total, page: parseInt(page as string), totalPages: Math.ceil(total / parseInt(limit as string)) });
  } catch (err) {
    console.error('List questions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const questionSchema = z.object({
  subjectId: z.string().uuid(),
  topicId: z.string().uuid(),
  passageId: z.string().uuid().nullable().optional(),
  text: z.string().min(1, 'Question text is required'),
  optionA: z.string().min(1),
  optionB: z.string().min(1),
  optionC: z.string().min(1),
  optionD: z.string().min(1),
  correctOption: z.enum(['A', 'B', 'C', 'D']),
  weightage: z.number().int().min(1).max(2),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
});

// POST /api/admin/questions
router.post('/questions', async (req: Request, res: Response) => {
  try {
    const data = questionSchema.parse(req.body);
    const question = await prisma.question.create({ data: { ...data, passageId: data.passageId || null } });
    res.status(201).json(question);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues[0].message });
    console.error('Create question error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/questions/:id
router.put('/questions/:id', async (req: Request, res: Response) => {
  try {
    const data = questionSchema.parse(req.body);
    const question = await prisma.question.update({
      where: { id: req.params.id as string },
      data: { ...data, passageId: data.passageId || null },
    });
    res.json(question);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues[0].message });
    console.error('Update question error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/questions/:id
router.delete('/questions/:id', async (req: Request, res: Response) => {
  try {
    await prisma.question.delete({ where: { id: req.params.id as string } });
    res.json({ deleted: true });
  } catch (err) {
    console.error('Delete question error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Passages ──

// GET /api/admin/passages
router.get('/passages', async (req: Request, res: Response) => {
  try {
    const { subjectId } = req.query;
    const where: any = {};
    if (subjectId && typeof subjectId === 'string') where.subjectId = subjectId;

    const passages = await prisma.passage.findMany({
      where,
      include: {
        subject: { select: { name: true } },
        questions: {
          select: {
            id: true, text: true, optionA: true, optionB: true, optionC: true, optionD: true,
            correctOption: true, weightage: true, difficulty: true,
            subjectId: true, topicId: true, passageId: true,
            subject: { select: { name: true } },
            topic: { select: { id: true, name: true } },
          },
        },
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(passages);
  } catch (err) {
    console.error('List passages error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const passageSchema = z.object({
  subjectId: z.string().uuid(),
  text: z.string().min(10, 'Passage text too short'),
});

// POST /api/admin/passages
router.post('/passages', async (req: Request, res: Response) => {
  try {
    const data = passageSchema.parse(req.body);
    const passage = await prisma.passage.create({ data });
    res.status(201).json(passage);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues[0].message });
    console.error('Create passage error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/passages/:id
router.put('/passages/:id', async (req: Request, res: Response) => {
  try {
    const data = passageSchema.parse(req.body);
    const passage = await prisma.passage.update({ where: { id: req.params.id as string }, data });
    res.json(passage);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues[0].message });
    console.error('Update passage error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/passages/:id
router.delete('/passages/:id', async (req: Request, res: Response) => {
  try {
    await prisma.passage.delete({ where: { id: req.params.id as string } });
    res.json({ deleted: true });
  } catch (err) {
    console.error('Delete passage error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ══════════════════════════════════
//  EXAM MANAGEMENT
// ══════════════════════════════════

// GET /api/admin/exams — all exams (including inactive)
router.get('/exams', async (_req: Request, res: Response) => {
  try {
    const exams = await prisma.exam.findMany({
      include: {
        topicDistribution: { include: { topic: { include: { subject: true } } }, orderBy: { topic: { displayOrder: 'asc' } } },
        _count: { select: { attempts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(exams);
  } catch (err) {
    console.error('Admin list exams error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const examSchema = z.object({
  name: z.string().min(1),
  durationMinutes: z.number().int().min(1).default(120),
  totalMarks: z.number().int().min(1).default(140),
  negativeMarkingPercent: z.number().min(0).max(100).default(10),
  isActive: z.boolean().default(true),
});

// POST /api/admin/exams
router.post('/exams', async (req: Request, res: Response) => {
  try {
    const data = examSchema.parse(req.body);
    const exam = await prisma.exam.create({ data });
    res.status(201).json(exam);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues[0].message });
    console.error('Create exam error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/exams/:id
router.put('/exams/:id', async (req: Request, res: Response) => {
  try {
    const data = examSchema.parse(req.body);
    const exam = await prisma.exam.update({ where: { id: req.params.id as string }, data });
    res.json(exam);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues[0].message });
    console.error('Update exam error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/exams/:id
router.delete('/exams/:id', async (req: Request, res: Response) => {
  try {
    await prisma.exam.delete({ where: { id: req.params.id as string } });
    res.json({ deleted: true });
  } catch (err) {
    console.error('Delete exam error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/exams/:id/distribution — set topic-level question distribution
const distributionSchema = z.array(z.object({
  topicId: z.string().uuid(),
  oneMarkCount: z.number().int().min(0),
  twoMarkCount: z.number().int().min(0),
}));

router.put('/exams/:id/distribution', async (req: Request, res: Response) => {
  try {
    const examId = req.params.id as string;
    const distributions = distributionSchema.parse(req.body);

    // Rule: each topic can only have questions of one weight type (1M or 2M, not both)
    const invalid = distributions.find(d => d.oneMarkCount > 0 && d.twoMarkCount > 0);
    if (invalid) {
      return res.status(400).json({ error: 'A topic cannot have both 1-mark and 2-mark questions. Each topic must use only one weight type.' });
    }

    // Filter out rows where both counts are 0 and deduplicate by topicId
    const seen = new Set<string>();
    const nonZero = distributions.filter(d => {
      if (seen.has(d.topicId)) return false;
      seen.add(d.topicId);
      return d.oneMarkCount > 0 || d.twoMarkCount > 0;
    });

    // Delete existing and recreate atomically
    const created = await prisma.$transaction(async (tx) => {
      await tx.examTopicDistribution.deleteMany({ where: { examId } });

      if (nonZero.length === 0) return [];

      await tx.examTopicDistribution.createMany({
        data: nonZero.map(d => ({
          examId,
          topicId: d.topicId,
          oneMarkCount: d.oneMarkCount,
          twoMarkCount: d.twoMarkCount,
        })),
      });

      return tx.examTopicDistribution.findMany({
        where: { examId },
        include: { topic: { include: { subject: true } } },
        orderBy: { topic: { displayOrder: 'asc' } },
      });
    });

    res.json(created);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues[0].message });
    console.error('Update distribution error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ══════════════════════════════════
//  JSON QUESTION IMPORT
// ══════════════════════════════════

const importQuestionSchema = z.object({
  questionNo: z.number().int().optional(),
  section: z.string().optional(),
  subject: z.string().min(1),
  topic: z.string().min(1),
  weightage: z.number().int().min(1).max(2),
  text: z.string().min(1),
  optionA: z.string().min(1),
  optionB: z.string().min(1),
  optionC: z.string().min(1),
  optionD: z.string().min(1),
  correctOption: z.enum(['A', 'B', 'C', 'D']),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  explanation: z.string().optional(),
  passage: z.string().optional(),
  hint: z.string().optional(),
});

const importSchema = z.object({
  examTitle: z.string().min(1).optional(),
  questions: z.array(importQuestionSchema).min(1, 'At least one question is required'),
  createExam: z.boolean().optional().default(false),
});

// POST /api/admin/import — bulk import questions from JSON
router.post('/import', async (req: Request, res: Response) => {
  try {
    const body = importSchema.parse(req.body);

    // Resolve all subjects and topics by name
    const allSubjects = await prisma.subject.findMany({ include: { topics: true } });
    const subjectMap: Record<string, { id: string; topics: Record<string, string> }> = {};
    for (const s of allSubjects) {
      subjectMap[s.name] = {
        id: s.id,
        topics: Object.fromEntries(s.topics.map(t => [t.name, t.id])),
      };
    }

    // Group passage texts and create Passage records (dedup by text)
    const passageTexts = [...new Set(body.questions.filter(q => q.passage).map(q => q.passage!))];
    const passageMap: Record<string, string> = {};
    for (const pText of passageTexts) {
      // Find subject for this passage (use first question that references it)
      const firstQ = body.questions.find(q => q.passage === pText);
      const subjectName = firstQ?.subject || 'English';
      const subject = subjectMap[subjectName];
      if (!subject) continue;

      const passage = await prisma.passage.create({
        data: { subjectId: subject.id, text: pText },
      });
      passageMap[pText] = passage.id;
    }

    const results = { inserted: 0, skipped: 0, errors: [] as string[] };

    for (const q of body.questions) {
      const subject = subjectMap[q.subject];
      if (!subject) {
        results.errors.push(`Q${q.questionNo || '?'}: Unknown subject "${q.subject}"`);
        results.skipped++;
        continue;
      }

      const topicId = subject.topics[q.topic];
      if (!topicId) {
        results.errors.push(`Q${q.questionNo || '?'}: Unknown topic "${q.topic}" in ${q.subject}`);
        results.skipped++;
        continue;
      }

      // Assign difficulty if not provided
      let difficulty: 'EASY' | 'MEDIUM' | 'HARD' = (q.difficulty as any) || 'MEDIUM';
      if (!q.difficulty) {
        if (q.weightage === 1) difficulty = 'EASY';
        else difficulty = 'MEDIUM';
      }

      const passageId = q.passage ? (passageMap[q.passage] || null) : null;

      await prisma.question.create({
        data: {
          subjectId: subject.id,
          topicId,
          passageId,
          text: q.text,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctOption: q.correctOption,
          hint: q.hint || null,
          weightage: q.weightage,
          difficulty,
        },
      });
      results.inserted++;
    }

    // Optionally create an exam with auto-calculated topic distribution
    let exam = null;
    if (body.createExam && body.examTitle) {
      exam = await prisma.exam.create({
        data: {
          name: body.examTitle,
          durationMinutes: 120,
          totalMarks: 140,
          negativeMarkingPercent: 10,
          isActive: true,
        },
      });

      // Calculate topic distribution from imported questions
      const topicCounts: Record<string, { oneM: number; twoM: number }> = {};
      for (const q of body.questions) {
        const subject = subjectMap[q.subject];
        if (!subject) continue;
        const topicId = subject.topics[q.topic];
        if (!topicId) continue;
        if (!topicCounts[topicId]) topicCounts[topicId] = { oneM: 0, twoM: 0 };
        if (q.weightage === 1) topicCounts[topicId].oneM++;
        else topicCounts[topicId].twoM++;
      }

      for (const [topicId, counts] of Object.entries(topicCounts)) {
        await prisma.examTopicDistribution.create({
          data: {
            examId: exam.id,
            topicId,
            oneMarkCount: counts.oneM,
            twoMarkCount: counts.twoM,
          },
        });
      }
    }

    res.status(201).json({
      message: `Imported ${results.inserted} questions` + (results.skipped ? `, skipped ${results.skipped}` : ''),
      inserted: results.inserted,
      skipped: results.skipped,
      errors: results.errors,
      passagesCreated: passageTexts.length,
      exam: exam ? { id: exam.id, name: exam.name } : null,
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues[0].message });
    console.error('Import error:', err);
    res.status(500).json({ error: 'Import failed' });
  }
});

// ══════════════════════════════════
//  LEVEL MANAGEMENT
// ══════════════════════════════════

// GET /api/admin/levels
router.get('/levels', async (_req: Request, res: Response) => {
  try {
    const levels = await prisma.levelConfig.findMany({ orderBy: { levelNumber: 'asc' } });
    res.json(levels);
  } catch (err) {
    console.error('Admin list levels error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const levelSchema = z.object({
  levelNumber: z.number().int().min(1),
  subLevelCount: z.number().int().min(1).max(12).default(6),
  questionsPerSublevel: z.number().int().min(5).max(50).default(20),
  easyWeight: z.number().int().min(0).max(100).default(100),
  mediumWeight: z.number().int().min(0).max(100).default(0),
  hardWeight: z.number().int().min(0).max(100).default(0),
  isActive: z.boolean().default(true),
});

// POST /api/admin/levels — create a new level
router.post('/levels', async (req: Request, res: Response) => {
  try {
    const data = levelSchema.parse(req.body);
    const level = await prisma.levelConfig.create({ data });
    res.status(201).json(level);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues[0].message });
    console.error('Create level error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/levels/:id — update a level
router.put('/levels/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const data = levelSchema.partial().parse(req.body);
    const level = await prisma.levelConfig.update({ where: { id }, data });
    res.json(level);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues[0].message });
    console.error('Update level error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/levels/:id
router.delete('/levels/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    await prisma.levelConfig.delete({ where: { id } });
    res.json({ deleted: true });
  } catch (err) {
    console.error('Delete level error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ══════════════════════════════════
//  SPECIAL EXAM MANAGEMENT
// ══════════════════════════════════

// GET /api/admin/special-exams
router.get('/special-exams', async (_req: Request, res: Response) => {
  try {
    const exams = await prisma.specialExam.findMany({
      include: { _count: { select: { questions: true, attempts: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(exams);
  } catch (err) {
    console.error('Admin list special exams error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const specialExamSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  durationMinutes: z.number().int().min(1).default(60),
  isActive: z.boolean().default(true),
});

// POST /api/admin/special-exams
router.post('/special-exams', async (req: Request, res: Response) => {
  try {
    const data = specialExamSchema.parse(req.body);
    const exam = await prisma.specialExam.create({ data });
    res.status(201).json(exam);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues[0].message });
    console.error('Create special exam error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/special-exams/:id
router.put('/special-exams/:id', async (req: Request, res: Response) => {
  try {
    const data = specialExamSchema.partial().parse(req.body);
    const exam = await prisma.specialExam.update({ where: { id: req.params.id as string }, data });
    res.json(exam);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues[0].message });
    console.error('Update special exam error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/special-exams/:id
router.delete('/special-exams/:id', async (req: Request, res: Response) => {
  try {
    await prisma.specialExam.delete({ where: { id: req.params.id as string } });
    res.json({ deleted: true });
  } catch (err) {
    console.error('Delete special exam error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/special-exams/:id/questions
router.get('/special-exams/:id/questions', async (req: Request, res: Response) => {
  try {
    const questions = await prisma.specialExamQuestion.findMany({
      where: { specialExamId: req.params.id as string },
      orderBy: { displayOrder: 'asc' },
    });
    res.json(questions);
  } catch (err) {
    console.error('Get special exam questions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const specialQSchema = z.object({
  text: z.string().min(1),
  optionA: z.string().min(1),
  optionB: z.string().min(1),
  optionC: z.string().min(1),
  optionD: z.string().min(1),
  correctOption: z.enum(['A', 'B', 'C', 'D']),
  hint: z.string().optional(),
  subject: z.string().optional(),
  topic: z.string().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
  weightage: z.number().int().min(1).max(2).default(1),
  displayOrder: z.number().int().default(0),
});

// POST /api/admin/special-exams/:id/questions — add single question
router.post('/special-exams/:id/questions', async (req: Request, res: Response) => {
  try {
    const specialExamId = req.params.id as string;
    const data = specialQSchema.parse(req.body);
    const question = await prisma.specialExamQuestion.create({ data: { ...data, specialExamId } });

    // Update totalMarks
    const agg = await prisma.specialExamQuestion.aggregate({
      where: { specialExamId },
      _sum: { weightage: true },
    });
    await prisma.specialExam.update({ where: { id: specialExamId }, data: { totalMarks: agg._sum.weightage || 0 } });

    res.status(201).json(question);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues[0].message });
    console.error('Add special exam question error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/special-exams/:id/questions/bulk — bulk import JSON array
router.post('/special-exams/:id/questions/bulk', async (req: Request, res: Response) => {
  try {
    const specialExamId = req.params.id as string;
    const exam = await prisma.specialExam.findUnique({ where: { id: specialExamId } });
    if (!exam) return res.status(404).json({ error: 'Exam not found' });

    const rows = z.array(specialQSchema).parse(req.body);
    const created = await prisma.specialExamQuestion.createMany({
      data: rows.map((r, i) => ({ ...r, specialExamId, displayOrder: r.displayOrder || i })),
    });

    const agg = await prisma.specialExamQuestion.aggregate({
      where: { specialExamId },
      _sum: { weightage: true },
    });
    await prisma.specialExam.update({ where: { id: specialExamId }, data: { totalMarks: agg._sum.weightage || 0 } });

    res.status(201).json({ inserted: created.count });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues[0].message });
    console.error('Bulk import special exam questions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/special-exams/:examId/questions/:qId
router.put('/special-exams/:examId/questions/:qId', async (req: Request, res: Response) => {
  try {
    const data = specialQSchema.partial().parse(req.body);
    const question = await prisma.specialExamQuestion.update({
      where: { id: req.params.qId as string },
      data,
    });
    res.json(question);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues[0].message });
    console.error('Update special exam question error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/special-exams/:examId/questions/:qId
router.delete('/special-exams/:examId/questions/:qId', async (req: Request, res: Response) => {
  try {
    await prisma.specialExamQuestion.delete({ where: { id: req.params.qId as string } });
    const specialExamId = req.params.examId as string;
    const agg = await prisma.specialExamQuestion.aggregate({
      where: { specialExamId },
      _sum: { weightage: true },
    });
    await prisma.specialExam.update({ where: { id: specialExamId }, data: { totalMarks: agg._sum.weightage || 0 } });
    res.json({ deleted: true });
  } catch (err) {
    console.error('Delete special exam question error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ══════════════════════════════════
//  ADMIN ACCOUNT SETTINGS
// ══════════════════════════════════

// GET /api/admin/me — get current admin info
router.get('/me', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user!.id },
      select: { id: true, email: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/me — update email and/or password
router.patch('/me', async (req: Request, res: Response) => {
  try {
    const { email, currentPassword, newPassword } = req.body as {
      email?: string;
      currentPassword?: string;
      newPassword?: string;
    };

    const userId = (req as any).user!.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const bcrypt = await import('bcryptjs');
    const updateData: Record<string, string> = {};

    // Handle password change
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Current password is required' });
      if (!user.passwordHash) return res.status(400).json({ error: 'Password login not available for this account' });
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });
      if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
      updateData.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    // Handle email change
    if (email && email !== user.email) {
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) return res.status(400).json({ error: 'Email already in use' });
      updateData.email = email;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const updated = await prisma.user.update({ where: { id: userId }, data: updateData, select: { id: true, email: true } });
    res.json({ ok: true, email: updated.email });
  } catch (err) {
    console.error('Admin update self error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
