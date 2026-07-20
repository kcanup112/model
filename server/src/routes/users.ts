import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const ProgramEnum = z.enum(['COMPUTER', 'CIVIL', 'ECIC']);
const GenderEnum = z.enum(['MALE', 'FEMALE', 'OTHER']).optional();

// Nepal's 7 provinces — only these are accepted.
const NepalProvinceEnum = z.enum([
  'Koshi',
  'Madhesh',
  'Bagmati',
  'Gandaki',
  'Lumbini',
  'Karnali',
  'Sudurpashchim',
]);

// Allows Unicode letters, spaces, hyphens, apostrophes, periods, commas, and digits.
// Blocks control characters, HTML/script tags, and excessively long payloads.
const safeTextRegex = /^[\p{L}\p{N}\s\-',./]+$/u;

const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must not exceed 100 characters')
    .regex(safeTextRegex, 'Full name contains invalid characters'),

  addressStreet: z
    .string()
    .trim()
    .min(1, 'Street address is required')
    .max(200, 'Street address must not exceed 200 characters')
    .regex(safeTextRegex, 'Street address contains invalid characters'),

  addressCity: z
    .string()
    .trim()
    .min(1, 'City is required')
    .max(100, 'City must not exceed 100 characters')
    .regex(safeTextRegex, 'City contains invalid characters'),

  addressDistrict: z
    .string()
    .trim()
    .min(1, 'District is required')
    .max(100, 'District must not exceed 100 characters')
    .regex(safeTextRegex, 'District contains invalid characters'),

  // Strictly enforced: only Nepal's 7 official provinces accepted.
  addressProvince: NepalProvinceEnum,

  mobilePhone: z
    .string()
    .trim()
    .regex(/^(98|97|96)\d{8}$/, 'Invalid Nepal mobile number (must be 10 digits starting with 98/97/96)'),

  parentsMobilePhone: z
    .string()
    .trim()
    .regex(/^(98|97|96)\d{8}$/, 'Invalid Nepal mobile number (must be 10 digits starting with 98/97/96)'),

  priority1: ProgramEnum,
  priority2: ProgramEnum.nullable().optional(),
  priority3: ProgramEnum.nullable().optional(),
  gender: GenderEnum,
}).refine(
  (data) => {
    const priorities = [data.priority1, data.priority2, data.priority3].filter(Boolean);
    return new Set(priorities).size === priorities.length;
  },
  { message: 'Priority programs must be unique' }
);

// POST /api/users/profile — first-time profile completion
router.post('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = profileSchema.parse(req.body);
    const userId = req.user!.id;

    const existing = await prisma.userProfile.findUnique({ where: { userId } });
    if (existing) {
      return res.status(409).json({ error: 'Profile already exists. Use PUT to update.' });
    }

    const profile = await prisma.userProfile.create({
      data: {
        userId,
        fullName: data.fullName,
        addressStreet: data.addressStreet,
        addressCity: data.addressCity,
        addressDistrict: data.addressDistrict,
        addressProvince: data.addressProvince,
        mobilePhone: data.mobilePhone,
        parentsMobilePhone: data.parentsMobilePhone,
        priority1: data.priority1,
        priority2: data.priority2 || null,
        priority3: data.priority3 || null,
        gender: data.gender || null,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { isProfileComplete: true },
    });

    res.status(201).json(profile);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.issues[0].message });
    }
    console.error('Profile create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/users/profile — update profile
router.put('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = profileSchema.parse(req.body);
    const userId = req.user!.id;

    const profile = await prisma.userProfile.update({
      where: { userId },
      data: {
        fullName: data.fullName,
        addressStreet: data.addressStreet,
        addressCity: data.addressCity,
        addressDistrict: data.addressDistrict,
        addressProvince: data.addressProvince,
        mobilePhone: data.mobilePhone,
        parentsMobilePhone: data.parentsMobilePhone,
        priority1: data.priority1,
        priority2: data.priority2 || null,
        priority3: data.priority3 || null,
        gender: data.gender || null,
      },
    });

    res.json(profile);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.issues[0].message });
    }
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/profile
router.get('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const profile = await prisma.userProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(profile);
  } catch (err) {
    console.error('Profile get error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
