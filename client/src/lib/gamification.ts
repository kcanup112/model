// ── Gamification engine — all computed client-side from attempt data ──

export interface Attempt {
  id: string;
  totalScore: number;
  timeTakenSeconds: number;
  finishedAt: string;
  exam: { name: string; totalMarks: number };
}

export interface Exam {
  id: string;
  name: string;
  durationMinutes: number;
  totalMarks: number;
}

// ── Levels ──

export interface Level {
  level: number;
  title: string;
  minXP: number;
  maxXP: number;
  color: string;
}

const LEVELS: Level[] = [
  { level: 1, title: 'Beginner', minXP: 0, maxXP: 150, color: '#94a3b8' },
  { level: 2, title: 'Learner', minXP: 150, maxXP: 400, color: '#60a5fa' },
  { level: 3, title: 'Apprentice', minXP: 400, maxXP: 800, color: '#34d399' },
  { level: 4, title: 'Scholar', minXP: 800, maxXP: 1400, color: '#a78bfa' },
  { level: 5, title: 'Practitioner', minXP: 1400, maxXP: 2200, color: '#f472b6' },
  { level: 6, title: 'Expert', minXP: 2200, maxXP: 3200, color: '#fb923c' },
  { level: 7, title: 'Specialist', minXP: 3200, maxXP: 4500, color: '#facc15' },
  { level: 8, title: 'Master', minXP: 4500, maxXP: 6000, color: '#f43f5e' },
  { level: 9, title: 'Grandmaster', minXP: 6000, maxXP: 8000, color: '#e879f9' },
  { level: 10, title: 'Legend', minXP: 8000, maxXP: Infinity, color: '#fbbf24' },
];

export function getLevel(xp: number): Level {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) return LEVELS[i];
  }
  return LEVELS[0];
}

export function getNextLevel(currentLevel: Level): Level | null {
  const idx = LEVELS.findIndex(l => l.level === currentLevel.level);
  return idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
}

// ── XP Calculation ──

export function calculateXP(attempts: Attempt[]): number {
  return attempts.reduce((total, a) => {
    const pct = a.exam.totalMarks > 0 ? a.totalScore / a.exam.totalMarks : 0;
    let xp = Math.max(Math.round(pct * 100), 10); // min 10 XP per attempt
    if (pct >= 0.9) xp += 50;       // bonus for 90%+
    else if (pct >= 0.8) xp += 25;  // bonus for 80%+
    return total + xp;
  }, 0);
}

// ── Streak Calculation ──

export function calculateStreak(attempts: Attempt[]): number {
  if (attempts.length === 0) return 0;

  const daySet = new Set<string>();
  for (const a of attempts) {
    const d = new Date(a.finishedAt);
    daySet.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  }

  const days = Array.from(daySet)
    .map(k => {
      const [y, m, d] = k.split('-').map(Number);
      return new Date(y, m, d);
    })
    .sort((a, b) => b.getTime() - a.getTime());

  // Check if today or yesterday is in the set (streak must be current)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const latestDay = new Date(days[0]);
  latestDay.setHours(0, 0, 0, 0);

  if (latestDay.getTime() !== today.getTime() && latestDay.getTime() !== yesterday.getTime()) {
    return 0; // streak broken
  }

  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = (days[i - 1].getTime() - days[i].getTime()) / (1000 * 60 * 60 * 24);
    if (Math.round(diff) === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ── Achievements ──

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;    // emoji
  unlocked: boolean;
}

export function computeAchievements(
  attempts: Attempt[],
  totalStudySeconds: number,
  streak: number,
  avgScorePct: number,
): Achievement[] {
  return [
    {
      id: 'first_steps',
      title: 'First Steps',
      description: 'Complete your first exam',
      icon: '🎯',
      unlocked: attempts.length >= 1,
    },
    {
      id: 'getting_serious',
      title: 'Getting Serious',
      description: 'Complete 5 exams',
      icon: '📚',
      unlocked: attempts.length >= 5,
    },
    {
      id: 'on_fire',
      title: 'On Fire',
      description: 'Maintain a 3-day streak',
      icon: '🔥',
      unlocked: streak >= 3,
    },
    {
      id: 'perfectionist',
      title: 'Perfectionist',
      description: 'Score 90%+ on any exam',
      icon: '💎',
      unlocked: attempts.some(a => a.exam.totalMarks > 0 && a.totalScore / a.exam.totalMarks >= 0.9),
    },
    {
      id: 'speed_demon',
      title: 'Speed Demon',
      description: 'Finish an exam in under 60 min',
      icon: '⚡',
      unlocked: attempts.some(a => (a.timeTakenSeconds || 0) > 0 && a.timeTakenSeconds < 3600),
    },
    {
      id: 'consistent',
      title: 'Consistent',
      description: 'Average score above 70%',
      icon: '🏅',
      unlocked: attempts.length > 0 && avgScorePct >= 70,
    },
    {
      id: 'marathon',
      title: 'Marathon',
      description: 'Study for 10+ hours total',
      icon: '🏆',
      unlocked: totalStudySeconds >= 36000,
    },
    {
      id: 'ten_exams',
      title: 'Veteran',
      description: 'Complete 10 exams',
      icon: '⭐',
      unlocked: attempts.length >= 10,
    },
  ];
}

// ── Subject Progress ──

export interface SubjectProgress {
  subject: string;
  attempts: number;
  avgScorePct: number;
  bestScorePct: number;
  color: string;
}

const SUBJECT_COLORS: Record<string, string> = {
  physics: '#60a5fa',
  chemistry: '#34d399',
  mathematics: '#a78bfa',
  english: '#fb923c',
  math: '#a78bfa',
};

export function computeSubjectProgress(attempts: Attempt[]): SubjectProgress[] {
  // Group by exam name keyword (best-effort subject extraction)
  const groups: Record<string, Attempt[]> = {};
  for (const a of attempts) {
    const name = a.exam.name.toLowerCase();
    let subject = 'general';
    if (name.includes('physics')) subject = 'physics';
    else if (name.includes('chemistry')) subject = 'chemistry';
    else if (name.includes('math')) subject = 'mathematics';
    else if (name.includes('english')) subject = 'english';

    if (!groups[subject]) groups[subject] = [];
    groups[subject].push(a);
  }

  return Object.entries(groups).map(([subject, atts]) => {
    const avgPct = atts.reduce((s, a) => s + (a.exam.totalMarks > 0 ? (a.totalScore / a.exam.totalMarks) * 100 : 0), 0) / atts.length;
    const bestPct = Math.max(...atts.map(a => a.exam.totalMarks > 0 ? (a.totalScore / a.exam.totalMarks) * 100 : 0));
    return {
      subject: subject.charAt(0).toUpperCase() + subject.slice(1),
      attempts: atts.length,
      avgScorePct: Math.round(avgPct),
      bestScorePct: Math.round(bestPct),
      color: SUBJECT_COLORS[subject] || '#94a3b8',
    };
  });
}

// ── Master compute function ──

export interface GamificationData {
  xp: number;
  level: Level;
  nextLevel: Level | null;
  xpInLevel: number;        // XP earned within current level
  xpForNextLevel: number;   // total XP needed to reach next level from current level start
  levelProgressPct: number;
  streak: number;
  achievements: Achievement[];
  subjectProgress: SubjectProgress[];
}

export function computeGamification(attempts: Attempt[], _exams: Exam[]): GamificationData {
  const xp = calculateXP(attempts);
  const level = getLevel(xp);
  const nextLevel = getNextLevel(level);
  const streak = calculateStreak(attempts);

  const totalStudySeconds = attempts.reduce((s, a) => s + (a.timeTakenSeconds || 0), 0);
  const avgScorePct = attempts.length > 0
    ? attempts.reduce((s, a) => s + (a.exam.totalMarks > 0 ? (a.totalScore / a.exam.totalMarks) * 100 : 0), 0) / attempts.length
    : 0;

  const xpInLevel = xp - level.minXP;
  const xpForNextLevel = nextLevel ? nextLevel.minXP - level.minXP : 1;
  const levelProgressPct = nextLevel ? Math.min((xpInLevel / xpForNextLevel) * 100, 100) : 100;

  return {
    xp,
    level,
    nextLevel,
    xpInLevel,
    xpForNextLevel,
    levelProgressPct,
    streak,
    achievements: computeAchievements(attempts, totalStudySeconds, streak, avgScorePct),
    subjectProgress: computeSubjectProgress(attempts),
  };
}
