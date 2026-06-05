/// <reference types="node" />
/**
 * English bulk seeder — loads 300 questions per topic from scan/english/*.json
 *
 * Files consumed:
 *   scan/english/grammar_i.json
 *   scan/english/grammar_ii.json
 *   scan/english/phonetics.json
 *   scan/english/comprehension.json
 *
 * Each non-comprehension file has shape:
 *   { topic: string, weightage: number, questions: QItem[] }
 *
 * Comprehension file has shape:
 *   { topic: "Comprehension", weightage: number,
 *     passages: { text: string, questions: QItem[] }[] }
 *
 * QItem = { text, optionA, optionB, optionC, optionD, correctOption, explanation? }
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface QItem {
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  explanation?: string;
}

interface FlatFile {
  topic: string;
  weightage: number;
  questions: QItem[];
}

interface CompFile {
  topic: 'Comprehension';
  weightage: number;
  passages: { text: string; questions: QItem[] }[];
}

function pickDifficulty(idx: number, total: number): 'EASY' | 'MEDIUM' | 'HARD' {
  const r = idx / total;
  if (r < 0.4) return 'EASY';
  if (r < 0.8) return 'MEDIUM';
  return 'HARD';
}

async function main() {
  const scanDir = path.resolve(__dirname, '../../scan/english');
  if (!fs.existsSync(scanDir)) {
    console.error('❌ scan/english directory not found:', scanDir);
    process.exit(1);
  }

  const english = await prisma.subject.findUnique({
    where: { name: 'English' },
    include: { topics: true },
  });
  if (!english) {
    console.error('❌ Subject "English" missing. Run the base seed first.');
    process.exit(1);
  }
  const topicId: Record<string, string> = Object.fromEntries(
    english.topics.map(t => [t.name, t.id])
  );

  const wipe = process.argv.includes('--wipe');
  const noArchive = process.argv.includes('--no-archive');
  if (wipe) {
    console.log('🧹 --wipe flag set: removing existing English questions and passages...');
    await prisma.question.deleteMany({ where: { subjectId: english.id } });
    await prisma.passage.deleteMany({ where: { subjectId: english.id } });
  } else {
    console.log('➕ Append mode (default): existing questions/passages kept; duplicates skipped by text. Pass --wipe to clear first, --no-archive to keep source files in place.');
  }

  // Build dedupe set of existing question texts (normalized) for this subject
  const existingTexts = new Set<string>();
  if (!wipe) {
    const existing = await prisma.question.findMany({
      where: { subjectId: english.id },
      select: { text: true },
    });
    for (const q of existing) existingTexts.add(q.text.trim().toLowerCase());
    console.log(`🔎 Found ${existingTexts.size} existing English questions for dedupe.`);
  }

  const processedFiles: string[] = [];
  const flatFiles: string[] = ['grammar_i.json', 'grammar_ii.json', 'phonetics.json'];
  let totalInserted = 0;
  let totalSkipped = 0;

  for (const fname of flatFiles) {
    const full = path.join(scanDir, fname);
    if (!fs.existsSync(full)) {
      console.warn(`⚠️  Missing ${fname} — skipping`);
      continue;
    }
    const data: FlatFile = JSON.parse(fs.readFileSync(full, 'utf-8'));
    const tId = topicId[data.topic];
    if (!tId) {
      console.warn(`⚠️  Topic "${data.topic}" not found — skipping ${fname}`);
      continue;
    }
    const fresh = data.questions.filter(q => {
      const key = q.text.trim().toLowerCase();
      if (existingTexts.has(key)) return false;
      existingTexts.add(key);
      return true;
    });
    const skipped = data.questions.length - fresh.length;
    totalSkipped += skipped;
    console.log(`📥 ${fname}: ${fresh.length} new, ${skipped} duplicates skipped → ${data.topic}`);
    if (fresh.length === 0) {
      processedFiles.push(full);
      continue;
    }
    const total = fresh.length;
    const rows = fresh.map((q, i) => ({
      subjectId: english.id,
      topicId: tId,
      text: q.text,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctOption: q.correctOption,
      weightage: data.weightage,
      difficulty: pickDifficulty(i, total),
    }));
    await prisma.question.createMany({ data: rows });
    totalInserted += rows.length;
    processedFiles.push(full);
  }

  // Comprehension — needs passages
  const compPath = path.join(scanDir, 'comprehension.json');
  if (fs.existsSync(compPath)) {
    const comp: CompFile = JSON.parse(fs.readFileSync(compPath, 'utf-8'));
    const tId = topicId[comp.topic];
    if (!tId) {
      console.warn(`⚠️  Topic "Comprehension" not found — skipping`);
    } else {
      let compCount = 0;
      let compSkipped = 0;
      // Pre-filter fresh questions across all passages to compute difficulty distribution
      const freshPassages = comp.passages
        .map(p => {
          const freshQs = p.questions.filter(q => {
            const key = q.text.trim().toLowerCase();
            if (existingTexts.has(key)) return false;
            existingTexts.add(key);
            return true;
          });
          compSkipped += p.questions.length - freshQs.length;
          return { text: p.text, questions: freshQs };
        })
        .filter(p => p.questions.length > 0);
      const total = freshPassages.reduce((s, p) => s + p.questions.length, 0);
      let runningIdx = 0;
      for (const p of freshPassages) {
        const passage = await prisma.passage.create({
          data: { subjectId: english.id, text: p.text },
        });
        const rows = p.questions.map((q) => {
          const d = pickDifficulty(runningIdx++, total);
          return {
            subjectId: english.id,
            topicId: tId,
            passageId: passage.id,
            text: q.text,
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            correctOption: q.correctOption,
            weightage: comp.weightage,
            difficulty: d,
          };
        });
        await prisma.question.createMany({ data: rows });
        compCount += rows.length;
      }
      totalSkipped += compSkipped;
      console.log(`📥 comprehension.json: ${compCount} new questions across ${freshPassages.length} passages, ${compSkipped} duplicates skipped`);
      totalInserted += compCount;
      processedFiles.push(compPath);
    }
  } else {
    console.warn('⚠️  Missing comprehension.json');
  }

  console.log(`\n✅ Inserted ${totalInserted} new English questions (skipped ${totalSkipped} duplicates)`);

  // Archive processed source files so the next append run starts clean
  if (!wipe && !noArchive && processedFiles.length > 0) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveDir = path.join(scanDir, '_archive', stamp);
    fs.mkdirSync(archiveDir, { recursive: true });
    for (const f of processedFiles) {
      const dest = path.join(archiveDir, path.basename(f));
      fs.renameSync(f, dest);
    }
    console.log(`📦 Archived ${processedFiles.length} source file(s) → ${path.relative(process.cwd(), archiveDir)}`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
