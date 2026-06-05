/**
 * seed-mcq.ts
 * Imports Chemistry and Physics MCQs from questions.json into the PostgreSQL DB.
 * Run with: npm run seed:mcq
 *
 * - Reads questions.json from the project root
 * - Only imports Chemistry and Physics questions (skips English/Maths already seeded)
 * - Maps fine-grained topic names to the 3 DB topics for Chemistry
 * - Normalises "Electricity and Magnetism" → "Electricity & Magnetism" for Physics
 * - Clears existing Chemistry & Physics questions before inserting (idempotent)
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// ─── Topic mapping ────────────────────────────────────────────────────────────

const CHEMISTRY_TOPIC_MAP: Record<string, string> = {
  // Physical Chemistry sub-topics → "Physical Chemistry"
  'Atomic Structure': 'Physical Chemistry',
  'Chemical Arithmetic': 'Physical Chemistry',
  'Chemical Bonding': 'Physical Chemistry',
  'Chemical Equilibrium': 'Physical Chemistry',
  'Chemical Kinetics': 'Physical Chemistry',
  'Electrochemistry': 'Physical Chemistry',
  'Ionic Equilibrium': 'Physical Chemistry',
  'Oxidation and Reduction': 'Physical Chemistry',
  'Periodic Classification': 'Physical Chemistry',
  'State of Matter': 'Physical Chemistry',
  'Physical Chemistry': 'Physical Chemistry',
  // Inorganic Chemistry sub-topics → "Inorganic Chemistry"
  'Metals': 'Inorganic Chemistry',
  'Non-metals': 'Inorganic Chemistry',
  'Inorganic Chemistry': 'Inorganic Chemistry',
  // Organic Chemistry → "Organic Chemistry"
  'Organic Chemistry': 'Organic Chemistry',
};

const PHYSICS_TOPIC_MAP: Record<string, string> = {
  'Electricity and Magnetism': 'Electricity & Magnetism',
  'Electricity & Magnetism': 'Electricity & Magnetism',
  'Mechanics': 'Mechanics',
  'Heat and Thermodynamics': 'Heat and Thermodynamics',
  'Geometric and Physical Optics': 'Geometric and Physical Optics',
  'Waves and Sound': 'Waves and Sound',
  'Modern Physics': 'Modern Physics',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawQuestion {
  questionNo: number;
  section: string;
  subject: string;
  topic: string;
  weightage: number;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  explanation?: string;
}

interface QuestionsFile {
  questions: RawQuestion[];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 MCQ Seeder — Chemistry & Physics\n');

  // Load questions.json from project root (two levels up from server/prisma/)
  const jsonPath = path.resolve(__dirname, '../../questions.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`questions.json not found at: ${jsonPath}`);
  }
  const raw: QuestionsFile = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  console.log(`📂 Loaded ${raw.questions.length} questions from questions.json`);

  // Filter to only Chemistry and Physics
  const toImport = raw.questions.filter(
    (q) => q.subject === 'Chemistry' || q.subject === 'Physics'
  );
  console.log(`🔍 Found ${toImport.length} Chemistry + Physics questions to import\n`);

  // ── Fetch subject IDs from DB ───────────────────────────────────────────────
  const subjectRows = await prisma.subject.findMany();
  const subjectMap: Record<string, string> = {};
  for (const s of subjectRows) subjectMap[s.name] = s.id;

  if (!subjectMap['Chemistry'] || !subjectMap['Physics']) {
    throw new Error(
      'Chemistry or Physics subject not found in DB. Run `npm run seed` first.'
    );
  }

  // ── Fetch topic IDs from DB ─────────────────────────────────────────────────
  const topicRows = await prisma.topic.findMany();
  // Build map: "SubjectName/TopicName" → topicId
  const subjectById: Record<string, string> = {};
  for (const s of subjectRows) subjectById[s.id] = s.name;

  const topicMap: Record<string, string> = {};
  for (const t of topicRows) {
    const subjectName = subjectById[t.subjectId];
    topicMap[`${subjectName}/${t.name}`] = t.id;
  }

  // ── Clear existing Chemistry & Physics questions ────────────────────────────
  const deleted = await prisma.question.deleteMany({
    where: {
      subjectId: { in: [subjectMap['Chemistry'], subjectMap['Physics']] },
    },
  });
  console.log(`🗑️  Deleted ${deleted.count} existing Chemistry & Physics questions\n`);

  // ── Build insert payload ────────────────────────────────────────────────────
  let skipped = 0;
  const records: {
    subjectId: string;
    topicId: string;
    text: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctOption: string;
    hint: string | null;
    weightage: number;
  }[] = [];

  for (const q of toImport) {
    const subjectId = subjectMap[q.subject];

    // Resolve mapped topic name
    let dbTopicName: string | undefined;
    if (q.subject === 'Chemistry') {
      dbTopicName = CHEMISTRY_TOPIC_MAP[q.topic];
    } else {
      dbTopicName = PHYSICS_TOPIC_MAP[q.topic] ?? q.topic;
    }

    if (!dbTopicName) {
      console.warn(`  ⚠️  Unknown topic "${q.topic}" for ${q.subject} (Q${q.questionNo}) — skipping`);
      skipped++;
      continue;
    }

    const topicId = topicMap[`${q.subject}/${dbTopicName}`];
    if (!topicId) {
      console.warn(`  ⚠️  Topic "${dbTopicName}" not found in DB for ${q.subject} (Q${q.questionNo}) — skipping`);
      skipped++;
      continue;
    }

    records.push({
      subjectId,
      topicId,
      text: q.text,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctOption: q.correctOption,
      hint: q.explanation ?? null,
      weightage: q.weightage ?? 1,
    });
  }

  console.log(`📝 Preparing to insert ${records.length} questions (${skipped} skipped)\n`);

  // ── Insert in batches of 500 ────────────────────────────────────────────────
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    await prisma.question.createMany({ data: batch });
    inserted += batch.length;
    console.log(`  ✅ Inserted batch ${Math.ceil((i + 1) / BATCH)}: ${inserted}/${records.length}`);
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  const totals = await prisma.question.groupBy({
    by: ['subjectId'],
    _count: { id: true },
    where: { subjectId: { in: [subjectMap['Chemistry'], subjectMap['Physics']] } },
  });

  console.log('\n📊 Final DB counts:');
  for (const row of totals) {
    const name = subjectById[row.subjectId];
    console.log(`   ${name}: ${row._count.id} questions`);
  }

  console.log('\n🎉 Done!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
