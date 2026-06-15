/**
 * recalculate-scores.ts
 *
 * Re-scores all submitted exam_attempts using weightage=1 per question.
 * Run with:  npx ts-node --project tsconfig.json prisma/recalculate-scores.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Fetch all submitted attempts with their exam's negative marking %
  const attempts = await prisma.examAttempt.findMany({
    where: { isSubmitted: true },
    include: { exam: { select: { negativeMarkingPercent: true, name: true } } },
  });

  console.log(`Found ${attempts.length} submitted attempt(s) to recalculate.\n`);

  let updated = 0;

  for (const attempt of attempts) {
    const answers = (attempt.answers as Record<string, string>) || {};
    const questionIds = Object.keys(answers);

    if (questionIds.length === 0) {
      console.log(`  [SKIP] Attempt ${attempt.id} — no answers recorded`);
      continue;
    }

    // Fetch correct options for the answered questions
    const dbQuestions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, correctOption: true },
    });

    const correctMap = new Map(dbQuestions.map(q => [q.id, q.correctOption]));
    const penaltyFraction = (attempt.exam.negativeMarkingPercent ?? 10) / 100;

    let newScore = 0;
    let correct = 0;
    let wrong = 0;
    let skipped = 0;

    // All questions in the attempt — include both answered and unanswered.
    // We only have IDs for answered questions; unanswered are skipped (0 marks).
    for (const [qId, chosen] of Object.entries(answers)) {
      const correctOption = correctMap.get(qId);
      if (!correctOption) continue; // question deleted from DB, skip

      if (!chosen) {
        skipped++;
      } else if (chosen === correctOption) {
        newScore += 1;   // weightage = 1
        correct++;
      } else {
        newScore -= penaltyFraction; // 10% of 1 = 0.1
        newScore = Math.max(0, newScore);
        wrong++;
      }
    }

    const oldScore = attempt.totalScore;
    await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: { totalScore: Math.round(newScore * 10) / 10 }, // round to 1dp
    });

    console.log(
      `  [OK] Attempt ${attempt.id} (${attempt.exam.name}) — ` +
      `${correct}✓ ${wrong}✗ ${skipped}– → old: ${oldScore.toFixed(1)} → new: ${newScore.toFixed(1)}`
    );
    updated++;
  }

  console.log(`\n✅ Done. Recalculated ${updated} attempt(s).`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
