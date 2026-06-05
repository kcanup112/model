import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';
import slugify from 'slugify';

const router = Router();
const prisma = new PrismaClient();

// ──── Articles ────

// GET /api/cms/articles — public
router.get('/articles', async (req: Request, res: Response) => {
  try {
    const { category, page = '1', limit = '10' } = req.query;
    const where: any = { isPublished: true };
    if (category && typeof category === 'string') {
      where.category = category.toUpperCase();
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const [articles, total] = await Promise.all([
      prisma.cmsArticle.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: parseInt(limit as string),
        select: {
          id: true, title: true, slug: true, coverImageUrl: true,
          category: true, publishedAt: true,
          body: false, // Don't send full body in list
        },
      }),
      prisma.cmsArticle.count({ where }),
    ]);

    res.json({ articles, total, page: parseInt(page as string), totalPages: Math.ceil(total / parseInt(limit as string)) });
  } catch (err) {
    console.error('List articles error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/cms/articles/:slug — public
router.get('/articles/:slug', async (req: Request, res: Response) => {
  try {
    const article = await prisma.cmsArticle.findFirst({
      where: { slug: req.params.slug as string, isPublished: true },
    });
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json(article);
  } catch (err) {
    console.error('Get article error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const articleSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  coverImageUrl: z.string().url().optional(),
  category: z.enum(['NEWS', 'NOTICE', 'BLOG']),
  isPublished: z.boolean().default(false),
});

// POST /api/cms/articles — admin
router.post('/articles', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const data = articleSchema.parse(req.body);
    const slug = slugify(data.title, { lower: true, strict: true });

    const article = await prisma.cmsArticle.create({
      data: {
        ...data,
        slug,
        authorId: req.user!.id,
        publishedAt: data.isPublished ? new Date() : null,
      },
    });
    res.status(201).json(article);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues[0].message });
    console.error('Create article error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/cms/articles/:id — admin
router.put('/articles/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const data = articleSchema.parse(req.body);
    const article = await prisma.cmsArticle.update({
      where: { id: req.params.id as string },
      data: {
        ...data,
        slug: slugify(data.title, { lower: true, strict: true }),
        publishedAt: data.isPublished ? new Date() : null,
      },
    });
    res.json(article);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues[0].message });
    console.error('Update article error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/cms/articles/:id — admin
router.delete('/articles/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.cmsArticle.delete({ where: { id: req.params.id as string } });
    res.json({ deleted: true });
  } catch (err) {
    console.error('Delete article error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──── Media ────

// GET /api/cms/media — public
router.get('/media', async (req: Request, res: Response) => {
  try {
    const { type, album } = req.query;
    const where: any = { isPublished: true };
    if (type) where.type = (type as string).toUpperCase();
    if (album) where.album = album;

    const media = await prisma.cmsMedia.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
    });
    res.json(media);
  } catch (err) {
    console.error('List media error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/cms/media — admin (file upload)
router.post('/media', requireAuth, requireAdmin, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { title, type, caption, album } = req.body;
    const url = `/uploads/${req.file.filename}`;

    const media = await prisma.cmsMedia.create({
      data: {
        title: title || req.file.originalname,
        type: type?.toUpperCase() || 'PHOTO',
        url,
        thumbnailUrl: url,
        caption: caption || null,
        album: album || null,
        isPublished: true,
        uploadedById: req.user!.id as string,
      },
    });
    res.status(201).json(media);
  } catch (err) {
    console.error('Upload media error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/cms/media/:id — admin
router.delete('/media/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.cmsMedia.delete({ where: { id: req.params.id as string } });
    res.json({ deleted: true });
  } catch (err) {
    console.error('Delete media error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──── Hero Slides ────

// GET /api/cms/hero-slides — public
router.get('/hero-slides', async (_req: Request, res: Response) => {
  try {
    const slides = await prisma.cmsHeroSlide.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
    res.json(slides);
  } catch (err) {
    console.error('List hero slides error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/cms/hero-slides — admin
router.post('/hero-slides', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { imageUrl, title, subtitle, ctaText, ctaLink, displayOrder } = req.body;
    const slide = await prisma.cmsHeroSlide.create({
      data: { imageUrl: imageUrl as string, title, subtitle, ctaText, ctaLink, displayOrder: displayOrder || 0, isActive: true },
    });
    res.status(201).json(slide);
  } catch (err) {
    console.error('Create hero slide error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/cms/hero-slides/:id — admin
router.put('/hero-slides/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const slide = await prisma.cmsHeroSlide.update({
      where: { id: req.params.id as string },
      data: req.body,
    });
    res.json(slide);
  } catch (err) {
    console.error('Update hero slide error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/cms/hero-slides/:id — admin
router.delete('/hero-slides/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.cmsHeroSlide.delete({ where: { id: req.params.id as string } });
    res.json({ deleted: true });
  } catch (err) {
    console.error('Delete hero slide error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
