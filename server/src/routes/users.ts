import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const ProgramEnum = z.enum(['COMPUTER', 'CIVIL', 'ECIC']);

const profileSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  addressStreet: z.string().min(1, 'Street address is required'),
  addressCity: z.string().min(1, 'City is required'),
  addressDistrict: z.string().min(1, 'District is required'),
  addressProvince: z.string().min(1, 'Province is required'),
  mobilePhone: z.string().regex(/^(98|97|96)\d{8}$/, 'Invalid Nepal mobile number'),
  parentsMobilePhone: z.string().regex(/^(98|97|96)\d{8}$/, 'Invalid Nepal mobile number'),
  priority1: ProgramEnum,
  priority2: ProgramEnum.nullable().optional(),
  priority3: ProgramEnum.nullable().optional(),
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
