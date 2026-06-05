/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ImportQuestion {
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
  passage?: string;
}

interface ImportJSON {
  examTitle: string;
  totalQuestions: number;
  questions: ImportQuestion[];
}

async function main() {
  const jsonPath = path.resolve(__dirname, '../../scan/questions.json');

  if (!fs.existsSync(jsonPath)) {
    console.error('❌ File not found:', jsonPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const data: ImportJSON = JSON.parse(raw);

  console.log(`📄 Importing: ${data.examTitle}`);
  console.log(`   Questions: ${data.totalQuestions}\n`);

  // ─── Resolve subjects by name ───
  const allSubjects = await prisma.subject.findMany({ include: { topics: true } });
  const subjectMap: Record<string, { id: string; topics: Record<string, string> }> = {};

  for (const s of allSubjects) {
    subjectMap[s.name] = {
      id: s.id,
      topics: Object.fromEntries(s.topics.map(t => [t.name, t.id])),
    };
  }

  // ─── Create comprehension passage for Q98-100 ───
  const passageQ = data.questions.find(q => q.passage);
  let passageId: string | null = null;

  if (passageQ?.passage) {
    const englishSubject = subjectMap['English'];
    if (englishSubject) {
      const passage = await prisma.passage.create({
        data: { subjectId: englishSubject.id, text: passageQ.passage },
      });
      passageId = passage.id;
      console.log('✅ Comprehension passage created');
    }
  }

  // ─── Insert questions ───
  let inserted = 0;
  let skipped = 0;

  for (const q of data.questions) {
    const subject = subjectMap[q.subject];
    if (!subject) {
      console.warn(`⚠️  Q${q.questionNo}: Unknown subject "${q.subject}" — skipped`);
      skipped++;
      continue;
    }

    const topicId = subject.topics[q.topic];
    if (!topicId) {
      console.warn(`⚠️  Q${q.questionNo}: Unknown topic "${q.topic}" in ${q.subject} — skipped`);
      skipped++;
      continue;
    }

    // Assign difficulty: Section I (1M) → EASY/MEDIUM, Section II (2M) → MEDIUM/HARD
    let difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM';
    if (q.weightage === 1) {
      difficulty = q.questionNo <= 20 ? 'EASY' : 'MEDIUM';
    } else {
      difficulty = q.questionNo >= 85 ? 'HARD' : 'MEDIUM';
    }

    // Link passage for comprehension questions (those that reference the passage)
    const isPassageQ = q.passage || (q.topic === 'Comprehension' && passageId);

    await prisma.question.create({
      data: {
        subjectId: subject.id,
        topicId,
        passageId: isPassageQ ? passageId : null,
        text: q.text,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctOption: q.correctOption,
        weightage: q.weightage,
        difficulty,
      },
    });
    inserted++;
  }

  console.log(`\n✅ Inserted: ${inserted} questions`);
  if (skipped > 0) console.log(`⚠️  Skipped: ${skipped} questions`);

  // ─── Create Exam "Set B" with topic distributions ───
  const exam = await prisma.exam.create({
    data: {
      name: data.examTitle || 'IOE Mock Exam - Set B',
      durationMinutes: 120,
      totalMarks: 140,
      negativeMarkingPercent: 10,
      isActive: true,
    },
  });

  // Count questions per topic and weightage from the imported data
  const topicCounts: Record<string, { oneM: number; twoM: number }> = {};
  for (const q of data.questions) {
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

  const totalOneM = Object.values(topicCounts).reduce((s, c) => s + c.oneM, 0);
  const totalTwoM = Object.values(topicCounts).reduce((s, c) => s + c.twoM, 0);

  console.log(`\n✅ Exam created: ${exam.name}`);
  console.log(`   Distribution: ${totalOneM}×1M + ${totalTwoM}×2M = ${totalOneM + totalTwoM} Questions = ${totalOneM + totalTwoM * 2} Marks`);
  console.log('\n🎉 Import complete!');
}

main()
  .catch((e) => {
    console.error('❌ Import error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
