/// <reference types="node" />
/**
 * seed-chapters.ts — Import pipeline output into the database.
 *
 * Reads all chapter output folders from pipeline/output/ and imports:
 *   1. StudyNote records (markdown content per chapter)
 *   2. StudyNoteFigure records (cropped figure images)
 *   3. Question records with hint field populated
 *
 * Usage:
 *   npx ts-node prisma/seed-chapters.ts                  # Import all
 *   npx ts-node prisma/seed-chapters.ts --chapter 2      # Import specific chapter
 *   npx ts-node prisma/seed-chapters.ts --dry-run        # Preview without writing
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// ─── Types matching pipeline output ───

interface PipelineQuestion {
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
  difficulty: string;
  hint?: string;
}

interface QuestionsJSON {
  subject: string;
  topic: string;
  chapterNumber: number;
  totalQuestions: number;
  questions: PipelineQuestion[];
}

interface NotesJSON {
  subject: string;
  topic: string;
  chapterNumber: number;
  title: string;
  content: string;
  figures: string[];
  contentLength: number;
}

// ─── Helpers ───

function findOutputDirs(baseDir: string): string[] {
  const dirs: string[] = [];

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Check if this directory has questions.json or notes.json
        if (
          fs.existsSync(path.join(full, 'questions.json')) ||
          fs.existsSync(path.join(full, 'notes.json'))
        ) {
          dirs.push(full);
        } else {
          walk(full);
        }
      }
    }
  }

  walk(baseDir);
  return dirs;
}

function readJSON<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

// ─── Main Import ───

async function importChapter(
  chapterDir: string,
  subjectMap: Record<string, { id: string; topics: Record<string, string> }>,
  dryRun: boolean,
): Promise<{
  questionsInserted: number;
  questionsSkipped: number;
  noteCreated: boolean;
  figuresCreated: number;
}> {
  const stats = {
    questionsInserted: 0,
    questionsSkipped: 0,
    noteCreated: false,
    figuresCreated: 0,
  };

  const questionsData = readJSON<QuestionsJSON>(path.join(chapterDir, 'questions.json'));
  const notesData = readJSON<NotesJSON>(path.join(chapterDir, 'notes.json'));

  if (!questionsData && !notesData) {
    console.warn(`⚠️  No data files in ${chapterDir}`);
    return stats;
  }

  // Resolve subject and topic
  const subjectName = questionsData?.subject || notesData?.subject || '';
  const topicName = questionsData?.topic || notesData?.topic || '';
  const chapterNum = questionsData?.chapterNumber || notesData?.chapterNumber || 0;

  const subject = subjectMap[subjectName];
  if (!subject) {
    console.error(`❌ Unknown subject "${subjectName}" in ${chapterDir}`);
    return stats;
  }

  const topicId = subject.topics[topicName];
  if (!topicId) {
    console.error(`❌ Unknown topic "${topicName}" in ${subjectName} — ${chapterDir}`);
    return stats;
  }

  console.log(`\n📂 Chapter ${chapterNum}: ${subjectName} → ${topicName}`);

  // ─── Import Study Notes ───
  if (notesData && notesData.content) {
    console.log(`  📝 Notes: ${notesData.contentLength} chars, ${notesData.figures.length} figures`);

    if (!dryRun) {
      const note = await prisma.studyNote.upsert({
        where: {
          subjectId_topicId: {
            subjectId: subject.id,
            topicId,
          },
        },
        update: {
          title: notesData.title,
          content: notesData.content,
          chapterNumber: chapterNum,
        },
        create: {
          subjectId: subject.id,
          topicId,
          chapterNumber: chapterNum,
          title: notesData.title,
          content: notesData.content,
        },
      });

      // Import figures
      if (notesData.figures.length > 0) {
        // Delete existing figures for this note
        await prisma.studyNoteFigure.deleteMany({
          where: { studyNoteId: note.id },
        });

        for (let i = 0; i < notesData.figures.length; i++) {
          await prisma.studyNoteFigure.create({
            data: {
              studyNoteId: note.id,
              fileName: notesData.figures[i],
              displayOrder: i,
            },
          });
          stats.figuresCreated++;
        }
      }

      stats.noteCreated = true;
      console.log(`  ✅ Note created/updated (${notesData.figures.length} figures)`);
    } else {
      console.log(`  🔍 [DRY RUN] Would create note with ${notesData.figures.length} figures`);
      stats.noteCreated = true;
    }
  }

  // ─── Import Questions ───
  if (questionsData && questionsData.questions.length > 0) {
    console.log(`  ❓ Questions: ${questionsData.totalQuestions}`);

    for (const q of questionsData.questions) {
      // Validate
      if (!q.text || q.text === '—') {
        console.warn(`  ⚠️  Q${q.questionNo}: Empty question text — skipped`);
        stats.questionsSkipped++;
        continue;
      }

      const difficulty = (['EASY', 'MEDIUM', 'HARD'].includes(q.difficulty)
        ? q.difficulty
        : 'MEDIUM') as 'EASY' | 'MEDIUM' | 'HARD';

      if (!dryRun) {
        await prisma.question.create({
          data: {
            subjectId: subject.id,
            topicId,
            text: q.text,
            optionA: q.optionA || '—',
            optionB: q.optionB || '—',
            optionC: q.optionC || '—',
            optionD: q.optionD || '—',
            correctOption: q.correctOption || 'A',
            hint: q.hint || null,
            weightage: q.weightage || 1,
            difficulty,
          },
        });
        stats.questionsInserted++;
      } else {
        stats.questionsInserted++;
      }
    }

    const withHints = questionsData.questions.filter(q => q.hint).length;
    if (dryRun) {
      console.log(`  🔍 [DRY RUN] Would insert ${stats.questionsInserted} questions (${withHints} with hints)`);
    } else {
      console.log(`  ✅ Inserted ${stats.questionsInserted} questions (${withHints} with hints)`);
    }

    if (stats.questionsSkipped > 0) {
      console.log(`  ⚠️  Skipped ${stats.questionsSkipped} questions`);
    }
  }

  return stats;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const chapterFilter = args.includes('--chapter')
    ? parseInt(args[args.indexOf('--chapter') + 1], 10)
    : null;

  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  IOE Mock Exam — Chapter Data Import            ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE — no database changes will be made\n');
  }

  // Resolve output directory
  const outputDir = path.resolve(__dirname, '../../pipeline/output');
  if (!fs.existsSync(outputDir)) {
    console.error(`❌ Pipeline output directory not found: ${outputDir}`);
    console.log('   Run the Python pipeline first: python pipeline/run_pipeline.py');
    process.exit(1);
  }

  // Find all chapter output directories
  let chapterDirs = findOutputDirs(outputDir);
  console.log(`Found ${chapterDirs.length} chapter output(s) in ${outputDir}\n`);

  // Filter by chapter number if requested
  if (chapterFilter !== null) {
    chapterDirs = chapterDirs.filter(dir => {
      const qPath = path.join(dir, 'questions.json');
      const nPath = path.join(dir, 'notes.json');
      const data = readJSON<QuestionsJSON>(qPath) || readJSON<NotesJSON>(nPath);
      return data && (data as any).chapterNumber === chapterFilter;
    });
    console.log(`Filtered to chapter ${chapterFilter}: ${chapterDirs.length} match(es)\n`);
  }

  if (chapterDirs.length === 0) {
    console.log('No chapters to import.');
    process.exit(0);
  }

  // Build subject/topic lookup (same pattern as seed-scanned.ts)
  const allSubjects = await prisma.subject.findMany({ include: { topics: true } });
  const subjectMap: Record<string, { id: string; topics: Record<string, string> }> = {};

  for (const s of allSubjects) {
    subjectMap[s.name] = {
      id: s.id,
      topics: Object.fromEntries(s.topics.map(t => [t.name, t.id])),
    };
  }

  console.log(`Database subjects: ${Object.keys(subjectMap).join(', ')}\n`);

  // Process each chapter
  let totalQuestions = 0;
  let totalNotes = 0;
  let totalFigures = 0;
  let totalSkipped = 0;

  for (const dir of chapterDirs) {
    try {
      const stats = await importChapter(dir, subjectMap, dryRun);
      totalQuestions += stats.questionsInserted;
      totalSkipped += stats.questionsSkipped;
      if (stats.noteCreated) totalNotes++;
      totalFigures += stats.figuresCreated;
    } catch (err) {
      console.error(`❌ Failed to import ${dir}:`, err);
    }
  }

  // Summary
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`${dryRun ? '🔍 DRY RUN ' : ''}IMPORT COMPLETE`);
  console.log(`${'─'.repeat(50)}`);
  console.log(`  Chapters processed: ${chapterDirs.length}`);
  console.log(`  Study notes: ${totalNotes}`);
  console.log(`  Figures: ${totalFigures}`);
  console.log(`  Questions inserted: ${totalQuestions}`);
  if (totalSkipped > 0) console.log(`  Questions skipped: ${totalSkipped}`);
  console.log('\n🎉 Done!\n');
}

main()
  .catch((e) => {
    console.error('❌ Import error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
