import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // ─── Clean up exam/question data only (preserve users) ───
  console.log('🧹 Cleaning existing exam & question data (users are preserved)...');
  await prisma.examAttempt.deleteMany({});
  await prisma.examTopicDistribution.deleteMany({});
  await prisma.exam.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.passage.deleteMany({});
  // Topics and subjects are upserted, no need to delete
  await prisma.cmsHeroSlide.deleteMany({});
  console.log('✅ Cleanup complete — users untouched\n');

  // ─── Admin User ───
  const adminPasswordHash = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@kec.edu.np' },
    update: {},
    create: {
      email: 'admin@kec.edu.np',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      isProfileComplete: true,
    },
  });
  console.log(`✅ Admin user: ${admin.email}`);

  // ─── Subjects (4 subjects) ───
  const subjectsData = [
    { name: 'English', displayOrder: 1 },
    { name: 'Chemistry', displayOrder: 2 },
    { name: 'Physics', displayOrder: 3 },
    { name: 'Mathematics', displayOrder: 4 },
  ];

  const subjects: Record<string, string> = {};
  for (const s of subjectsData) {
    const subject = await prisma.subject.upsert({
      where: { name: s.name },
      update: { displayOrder: s.displayOrder },
      create: s,
    });
    subjects[s.name] = subject.id;
    console.log(`✅ Subject: ${s.name}`);
  }

  // ──────────────────────────────────────────────────────────────────
  //  Topics — per IOE B.E./B.Arch. Entrance Syllabus 2080
  //
  //  English (4 topics): Grammar I, Grammar II, Phonetics, Comprehension
  //  Chemistry (3 topics): Physical, Inorganic, Organic
  //  Physics (6 topics): Mechanics, Heat & Thermo, Optics, Waves, E&M, Modern
  //  Mathematics (7 topics): Set/Logic/Functions, Algebra, Trig, Coord Geo,
  //                          Calculus, Vectors, Stats & Prob
  // ──────────────────────────────────────────────────────────────────
  const topicsData: Record<string, Array<{ name: string; displayOrder: number }>> = {
    English: [
      { name: 'Grammar I', displayOrder: 1 },
      { name: 'Grammar II', displayOrder: 2 },
      { name: 'Phonetics', displayOrder: 3 },
      { name: 'Comprehension', displayOrder: 4 },
    ],
    Chemistry: [
      { name: 'Physical Chemistry', displayOrder: 1 },
      { name: 'Inorganic Chemistry', displayOrder: 2 },
      { name: 'Organic Chemistry', displayOrder: 3 },
    ],
    Physics: [
      { name: 'Mechanics', displayOrder: 1 },
      { name: 'Heat and Thermodynamics', displayOrder: 2 },
      { name: 'Geometric and Physical Optics', displayOrder: 3 },
      { name: 'Waves and Sound', displayOrder: 4 },
      { name: 'Electricity & Magnetism', displayOrder: 5 },
      { name: 'Modern Physics', displayOrder: 6 },
    ],
    Mathematics: [
      { name: 'Set, Logic and Functions', displayOrder: 1 },
      { name: 'Algebra', displayOrder: 2 },
      { name: 'Trigonometry', displayOrder: 3 },
      { name: 'Coordinate Geometry', displayOrder: 4 },
      { name: 'Calculus', displayOrder: 5 },
      { name: 'Vectors and their Products', displayOrder: 6 },
      { name: 'Statistics and Probability', displayOrder: 7 },
    ],
  };

  const topics: Record<string, Record<string, string>> = {};
  for (const [subjectName, tList] of Object.entries(topicsData)) {
    topics[subjectName] = {};
    for (const t of tList) {
      const topic = await prisma.topic.upsert({
        where: { subjectId_name: { subjectId: subjects[subjectName], name: t.name } },
        update: { displayOrder: t.displayOrder },
        create: { subjectId: subjects[subjectName], name: t.name, displayOrder: t.displayOrder },
      });
      topics[subjectName][t.name] = topic.id;
    }
    console.log(`✅ Topics for ${subjectName}: ${tList.map(t => t.name).join(', ')}`);
  }

  // ─── Comprehension Passages ───
  const passage1 = await prisma.passage.create({
    data: {
      subjectId: subjects['English'],
      text: `Nepal is a landlocked country situated between China and India. Despite its small geographical area, Nepal boasts an incredibly diverse landscape ranging from the flat Terai plains in the south to the towering Himalayan peaks in the north, including Mount Everest, the highest point on Earth. The country is home to more than 125 ethnic groups speaking over 120 languages, making it one of the most culturally diverse nations in the world. Nepal's economy is primarily based on agriculture, tourism, and remittances from workers abroad. In recent years, the country has been working towards developing its hydropower potential, which could transform its economic outlook.`,
    },
  });

  const passage2 = await prisma.passage.create({
    data: {
      subjectId: subjects['English'],
      text: `Engineering education in Nepal has evolved significantly since the establishment of the first engineering college in the late 1970s. Today, Tribhuvan University's Institute of Engineering (IOE) conducts a centralized entrance examination to select students for various undergraduate engineering programs. The exam tests students across four subjects: English, Chemistry, Physics, and Mathematics. With thousands of students competing for limited seats each year, the IOE entrance exam remains one of the most competitive examinations in Nepal. The exam follows a multiple-choice format with negative marking to discourage random guessing.`,
    },
  });
  const passage3 = await prisma.passage.create({
    data: {
      subjectId: subjects['English'],
      text: `Climate change represents one of the most significant challenges facing humanity today. Rising global temperatures, caused primarily by increased greenhouse gas emissions from burning fossil fuels, are leading to more frequent extreme weather events, rising sea levels, and shifts in ecosystems worldwide. Scientists estimate that the Earth's average temperature has risen by approximately 1.1 degrees Celsius since the pre-industrial era. International agreements like the Paris Accord aim to limit warming to 1.5 degrees Celsius, but achieving this goal requires dramatic reductions in carbon emissions and a transition to renewable energy sources.`,
    },
  });

  const passage4 = await prisma.passage.create({
    data: {
      subjectId: subjects['English'],
      text: `The history of computing can be traced back to ancient devices like the abacus, but modern computing began with Charles Babbage's Analytical Engine in the 19th century. The first electronic computers, developed during World War II, occupied entire rooms and consumed enormous amounts of power. The invention of the transistor in 1947 and the subsequent development of integrated circuits revolutionized the field. Today, a smartphone contains more computing power than the computers that guided the Apollo missions to the Moon. Artificial intelligence, quantum computing, and the Internet of Things represent the next frontiers in this rapidly evolving field.`,
    },
  });
  console.log('✅ Passages created (4 total)');

  // ───────────────────────────────────────────────────────────────
  //  QUESTIONS — IOE Entrance Pattern
  //  RULE: Each topic contributes ONLY ONE weight type (1M or 2M)
  //
  //  English:     12 × 1M +  4 × 2M =  16 Qs =  20 marks
  //  Chemistry:   14 × 1M +  8 × 2M =  22 Qs =  30 marks
  //  Physics:     14 × 1M + 13 × 2M =  27 Qs =  40 marks
  //  Mathematics: 20 × 1M + 15 × 2M =  35 Qs =  50 marks
  //  Total:       60 × 1M + 40 × 2M = 100 Qs = 140 Marks
  // ───────────────────────────────────────────────────────────────

  async function createQ(subjectName: string, topicName: string, q: any) {
    await prisma.question.create({
      data: { subjectId: subjects[subjectName], topicId: topics[subjectName][topicName], ...q },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  ENGLISH  —  12 × 1M + 4 × 2M = 20 marks
  //  Grammar I → 1M only (4 Qs), Grammar II → 1M only (6 Qs),
  //  Phonetics → 1M only (2 Qs), Comprehension → 2M only (4 Qs)
  // ═══════════════════════════════════════════════════════════════

  // Grammar I: 4×1M  (Tense, Speech, Sentences, Active/Passive)
  await createQ('English', 'Grammar I', { text: 'Choose the correct tense: "By next year, she ___ her degree."', optionA: 'will complete', optionB: 'will have completed', optionC: 'has completed', optionD: 'completes', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Grammar I', { text: 'The indirect speech of "He said, \'I am going\'" is:', optionA: 'He said that he is going.', optionB: 'He said that he was going.', optionC: 'He said that I am going.', optionD: 'He told that he was going.', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Grammar I', { text: 'Which of the following is a compound sentence?', optionA: 'I went to the store.', optionB: 'I went to the store, but it was closed.', optionC: 'Going to the store.', optionD: 'The store that was closed.', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Grammar I', { text: 'The passive voice of "Someone has stolen my wallet" is:', optionA: 'My wallet has been stolen.', optionB: 'My wallet was stolen.', optionC: 'My wallet is stolen.', optionD: 'My wallet had been stolen.', correctOption: 'A', weightage: 1 });
  await createQ('English', 'Grammar I', { text: 'Choose the correct form: "If I ___ you, I would accept the offer."', optionA: 'am', optionB: 'was', optionC: 'were', optionD: 'be', correctOption: 'C', weightage: 1 });
  await createQ('English', 'Grammar I', { text: 'The direct speech of "She told me that she was tired" is:', optionA: 'She said, "I was tired."', optionB: 'She said, "I am tired."', optionC: 'She said, "She is tired."', optionD: 'She said, "I were tired."', correctOption: 'B', weightage: 1 });

  // Grammar II: 6×1M  (Patterns, Parts of Speech, Verbals, Punctuation, Vocabulary, Idioms)
  await createQ('English', 'Grammar II', { text: 'Identify the correct sentence:', optionA: 'He don\'t like coffee.', optionB: 'He doesn\'t likes coffee.', optionC: 'He doesn\'t like coffee.', optionD: 'He not like coffee.', correctOption: 'C', weightage: 1 });
  await createQ('English', 'Grammar II', { text: 'Choose the correct preposition: "She is afraid ___ spiders."', optionA: 'from', optionB: 'with', optionC: 'of', optionD: 'by', correctOption: 'C', weightage: 1 });
  await createQ('English', 'Grammar II', { text: '"To make a mountain out of a molehill" means:', optionA: 'To work hard', optionB: 'To exaggerate a small issue', optionC: 'To achieve the impossible', optionD: 'To dig deep', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Grammar II', { text: 'Choose the correct synonym of "Ubiquitous":', optionA: 'Rare', optionB: 'Everywhere', optionC: 'Unique', optionD: 'Hidden', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Grammar II', { text: 'Choose the correctly spelled word:', optionA: 'Accomodation', optionB: 'Accommodation', optionC: 'Acomodation', optionD: 'Accomodatoin', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Grammar II', { text: '"Running quickly, the boy reached the bus." The underlined phrase is a:', optionA: 'Gerund phrase', optionB: 'Infinitive phrase', optionC: 'Participial phrase', optionD: 'Prepositional phrase', correctOption: 'C', weightage: 1 });
  await createQ('English', 'Grammar II', { text: 'The antonym of "Benevolent" is:', optionA: 'Kind', optionB: 'Malevolent', optionC: 'Generous', optionD: 'Charitable', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Grammar II', { text: 'Which is a correct use of the semicolon?', optionA: 'I like tea; and coffee.', optionB: 'I like tea; however, she prefers coffee.', optionC: 'I like; tea and coffee.', optionD: 'I; like tea and coffee.', correctOption: 'B', weightage: 1 });

  // Phonetics: 2×1M  (Phonemes, Syllables, Stress)
  await createQ('English', 'Phonetics', { text: 'How many vowel phonemes are there in standard English?', optionA: '5', optionB: '12', optionC: '20', optionD: '26', correctOption: 'C', weightage: 1 });
  await createQ('English', 'Phonetics', { text: 'In the word "photograph", the primary stress falls on:', optionA: 'First syllable', optionB: 'Second syllable', optionC: 'Third syllable', optionD: 'No stress', correctOption: 'A', weightage: 1 });
  await createQ('English', 'Phonetics', { text: 'How many syllables are in the word "university"?', optionA: '3', optionB: '4', optionC: '5', optionD: '6', correctOption: 'C', weightage: 1 });

  // Comprehension: 4×2M  (passage-based, 2M only)
  await createQ('English', 'Comprehension', { passageId: passage1.id, text: 'According to the passage, Nepal is located between which two countries?', optionA: 'China and Bangladesh', optionB: 'India and Pakistan', optionC: 'China and India', optionD: 'India and Sri Lanka', correctOption: 'C', weightage: 2 });
  await createQ('English', 'Comprehension', { passageId: passage1.id, text: 'What sector could potentially transform Nepal\'s economic outlook according to the passage?', optionA: 'Tourism', optionB: 'Agriculture', optionC: 'Information Technology', optionD: 'Hydropower', correctOption: 'D', weightage: 2 });
  await createQ('English', 'Comprehension', { passageId: passage2.id, text: 'According to the passage, what format does the IOE entrance exam follow?', optionA: 'Essay-based', optionB: 'Practical-based', optionC: 'Multiple-choice with negative marking', optionD: 'Oral examination', correctOption: 'C', weightage: 2 });
  await createQ('English', 'Comprehension', { passageId: passage2.id, text: 'How many subjects are tested in the IOE entrance exam according to the passage?', optionA: 'Three', optionB: 'Four', optionC: 'Five', optionD: 'Six', correctOption: 'B', weightage: 2 });
  await createQ('English', 'Comprehension', { passageId: passage1.id, text: 'How many ethnic groups does Nepal have according to the passage?', optionA: 'More than 100', optionB: 'More than 125', optionC: 'More than 150', optionD: 'More than 200', correctOption: 'B', weightage: 2 });

  // ── Additional English Questions ──

  // Grammar I: +8×1M
  await createQ('English', 'Grammar I', { text: 'Choose the correct tense: "She ___ here since 2015."', optionA: 'is living', optionB: 'has been living', optionC: 'was living', optionD: 'lives', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Grammar I', { text: 'The passive voice of "The teacher is teaching the students" is:', optionA: 'The students are being taught by the teacher.', optionB: 'The students were taught by the teacher.', optionC: 'The students are taught by the teacher.', optionD: 'The students have been taught by the teacher.', correctOption: 'A', weightage: 1 });
  await createQ('English', 'Grammar I', { text: 'Choose the correct conditional: "If it ___ tomorrow, we will cancel the picnic."', optionA: 'rained', optionB: 'rains', optionC: 'will rain', optionD: 'would rain', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Grammar I', { text: 'Which sentence is in the past perfect tense?', optionA: 'She had gone before I arrived.', optionB: 'She went before I arrived.', optionC: 'She was going before I arrived.', optionD: 'She has gone before I arrived.', correctOption: 'A', weightage: 1 });
  await createQ('English', 'Grammar I', { text: 'The indirect speech of "She said, \'I have finished my homework\'" is:', optionA: 'She said that she has finished her homework.', optionB: 'She said that she had finished her homework.', optionC: 'She said that she finished her homework.', optionD: 'She said that she was finishing her homework.', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Grammar I', { text: 'The active voice of "The window was broken by the boy" is:', optionA: 'The boy broke the window.', optionB: 'The boy was breaking the window.', optionC: 'The boy has broken the window.', optionD: 'The boy breaks the window.', correctOption: 'A', weightage: 1 });
  await createQ('English', 'Grammar I', { text: 'Choose the correct tense: "By the time you arrive, I ___ dinner."', optionA: 'will cook', optionB: 'will have cooked', optionC: 'am cooking', optionD: 'cooked', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Grammar I', { text: '"He said to me, \'Please help me.\'" The indirect speech is:', optionA: 'He requested me to help him.', optionB: 'He said me to help him.', optionC: 'He told me please help him.', optionD: 'He asked me that help him.', correctOption: 'A', weightage: 1 });

  // Grammar II: +8×1M
  await createQ('English', 'Grammar II', { text: 'The plural of "analysis" is:', optionA: 'analysises', optionB: 'analyses', optionC: 'analysi', optionD: 'analysiss', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Grammar II', { text: 'Choose the correct preposition: "He is good ___ mathematics."', optionA: 'in', optionB: 'at', optionC: 'for', optionD: 'with', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Grammar II', { text: '"To burn the midnight oil" means:', optionA: 'To waste oil', optionB: 'To study or work late at night', optionC: 'To set fire', optionD: 'To cook late', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Grammar II', { text: 'The word "quickly" is a/an:', optionA: 'Noun', optionB: 'Adjective', optionC: 'Adverb', optionD: 'Preposition', correctOption: 'C', weightage: 1 });
  await createQ('English', 'Grammar II', { text: 'Choose the antonym of "Affluent":', optionA: 'Rich', optionB: 'Wealthy', optionC: 'Destitute', optionD: 'Abundant', correctOption: 'C', weightage: 1 });
  await createQ('English', 'Grammar II', { text: 'Identify the correct sentence:', optionA: 'Each of the boys were present.', optionB: 'Each of the boys was present.', optionC: 'Each of the boys are present.', optionD: 'Each of the boy was present.', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Grammar II', { text: 'Choose the correctly punctuated sentence:', optionA: 'Its a beautiful day isnt it', optionB: 'It\'s a beautiful day isn\'t it', optionC: 'It\'s a beautiful day, isn\'t it?', optionD: 'Its a beautiful day, isnt it?', correctOption: 'C', weightage: 1 });
  await createQ('English', 'Grammar II', { text: 'The synonym of "Pragmatic" is:', optionA: 'Impractical', optionB: 'Practical', optionC: 'Theoretical', optionD: 'Idealistic', correctOption: 'B', weightage: 1 });

  // Phonetics: +5×1M
  await createQ('English', 'Phonetics', { text: 'The word "knight" has how many phonemes?', optionA: '6', optionB: '5', optionC: '3', optionD: '4', correctOption: 'C', weightage: 1 });
  await createQ('English', 'Phonetics', { text: 'Which word has the stress on the second syllable?', optionA: 'Table', optionB: 'Begin', optionC: 'Garden', optionD: 'Happy', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Phonetics', { text: 'How many syllables are in the word "examination"?', optionA: '3', optionB: '4', optionC: '5', optionD: '6', correctOption: 'C', weightage: 1 });
  await createQ('English', 'Phonetics', { text: 'Which of the following pairs are minimal pairs?', optionA: 'cat / bat', optionB: 'cat / dog', optionC: 'cat / cats', optionD: 'big / small', correctOption: 'A', weightage: 1 });
  await createQ('English', 'Phonetics', { text: 'Which word contains a diphthong?', optionA: 'Sit', optionB: 'Boy', optionC: 'Red', optionD: 'Cup', correctOption: 'B', weightage: 1 });

  // Comprehension: +8×2M (using new passages)
  await createQ('English', 'Comprehension', { passageId: passage3.id, text: 'What is the primary cause of rising global temperatures according to the passage?', optionA: 'Deforestation', optionB: 'Greenhouse gas emissions from burning fossil fuels', optionC: 'Natural climate cycles', optionD: 'Industrial waste', correctOption: 'B', weightage: 2 });
  await createQ('English', 'Comprehension', { passageId: passage3.id, text: 'By how much has the Earth\'s average temperature risen since the pre-industrial era?', optionA: '0.5 degrees Celsius', optionB: '1.1 degrees Celsius', optionC: '1.5 degrees Celsius', optionD: '2.0 degrees Celsius', correctOption: 'B', weightage: 2 });
  await createQ('English', 'Comprehension', { passageId: passage3.id, text: 'What is the temperature limit goal of the Paris Accord?', optionA: '1.0 degrees Celsius', optionB: '1.5 degrees Celsius', optionC: '2.0 degrees Celsius', optionD: '2.5 degrees Celsius', correctOption: 'B', weightage: 2 });
  await createQ('English', 'Comprehension', { passageId: passage3.id, text: 'Which of the following is NOT mentioned as a consequence of climate change?', optionA: 'Extreme weather events', optionB: 'Rising sea levels', optionC: 'Ozone layer depletion', optionD: 'Shifts in ecosystems', correctOption: 'C', weightage: 2 });
  await createQ('English', 'Comprehension', { passageId: passage4.id, text: 'Who designed the Analytical Engine?', optionA: 'Alan Turing', optionB: 'Charles Babbage', optionC: 'Ada Lovelace', optionD: 'John von Neumann', correctOption: 'B', weightage: 2 });
  await createQ('English', 'Comprehension', { passageId: passage4.id, text: 'What invention in 1947 revolutionized computing?', optionA: 'The vacuum tube', optionB: 'The transistor', optionC: 'The integrated circuit', optionD: 'The microprocessor', correctOption: 'B', weightage: 2 });
  await createQ('English', 'Comprehension', { passageId: passage4.id, text: 'What ancient device is mentioned as a precursor to modern computing?', optionA: 'The sundial', optionB: 'The compass', optionC: 'The abacus', optionD: 'The telescope', correctOption: 'C', weightage: 2 });
  await createQ('English', 'Comprehension', { passageId: passage4.id, text: 'Which of the following is NOT mentioned as a next frontier in computing?', optionA: 'Artificial intelligence', optionB: 'Quantum computing', optionC: 'Blockchain technology', optionD: 'Internet of Things', correctOption: 'C', weightage: 2 });

  // ── Batch 3: More English Questions ──

  // Grammar I: +8×1M
  await createQ('English', 'Grammar I', { text: 'Choose the correct form: "Neither the teacher nor the students ___ present."', optionA: 'was', optionB: 'were', optionC: 'is', optionD: 'has been', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Grammar I', { text: 'The passive voice of "They will build a new bridge" is:', optionA: 'A new bridge will be built by them.', optionB: 'A new bridge would be built by them.', optionC: 'A new bridge was built by them.', optionD: 'A new bridge is being built by them.', correctOption: 'A', weightage: 1 });
  await createQ('English', 'Grammar I', { text: '"She asked where I lived." The direct speech is:', optionA: 'She said, "Where do you live?"', optionB: 'She said, "Where did you live?"', optionC: 'She said, "Where I lived?"', optionD: 'She said, "Where you live?"', correctOption: 'A', weightage: 1 });
  await createQ('English', 'Grammar I', { text: 'Choose the correct tense: "I wish I ___ a bird."', optionA: 'am', optionB: 'was', optionC: 'were', optionD: 'will be', correctOption: 'C', weightage: 1 });
  await createQ('English', 'Grammar I', { text: 'Which sentence uses the present perfect continuous correctly?', optionA: 'She has been reading all morning.', optionB: 'She had been reading all morning.', optionC: 'She was reading all morning.', optionD: 'She is reading all morning.', correctOption: 'A', weightage: 1 });
  await createQ('English', 'Grammar I', { text: 'The indirect speech of "He said, \'Don\'t touch that!\'" is:', optionA: 'He told not to touch that.', optionB: 'He warned me not to touch that.', optionC: 'He said me don\'t touch that.', optionD: 'He told that don\'t touch that.', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Grammar I', { text: 'Choose the correct sentence:', optionA: 'Had I known, I would have come.', optionB: 'Had I known, I would came.', optionC: 'Had I knew, I would have come.', optionD: 'Have I known, I would had come.', correctOption: 'A', weightage: 1 });
  await createQ('English', 'Grammar I', { text: 'The passive voice of "People speak English everywhere" is:', optionA: 'English is spoken everywhere.', optionB: 'English was spoken everywhere.', optionC: 'English has been spoken everywhere.', optionD: 'English will be spoken everywhere.', correctOption: 'A', weightage: 1 });

  // Grammar II: +8×1M
  await createQ('English', 'Grammar II', { text: 'Choose the correct article: "___ Himalayas are in Asia."', optionA: 'A', optionB: 'An', optionC: 'The', optionD: 'No article', correctOption: 'C', weightage: 1 });
  await createQ('English', 'Grammar II', { text: '"A stitch in time saves nine" is:', optionA: 'A simile', optionB: 'A metaphor', optionC: 'A proverb', optionD: 'An idiom', correctOption: 'C', weightage: 1 });
  await createQ('English', 'Grammar II', { text: 'Choose the synonym of "Diligent":', optionA: 'Lazy', optionB: 'Careless', optionC: 'Hardworking', optionD: 'Slow', correctOption: 'C', weightage: 1 });
  await createQ('English', 'Grammar II', { text: '"Swimming is a good exercise." Here "swimming" is a:', optionA: 'Participle', optionB: 'Gerund', optionC: 'Infinitive', optionD: 'Verb', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Grammar II', { text: 'The antonym of "Verbose" is:', optionA: 'Wordy', optionB: 'Concise', optionC: 'Talkative', optionD: 'Prolific', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Grammar II', { text: 'Choose the correct preposition: "She has been absent ___ Monday."', optionA: 'from', optionB: 'since', optionC: 'for', optionD: 'by', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Grammar II', { text: '"To let the cat out of the bag" means:', optionA: 'To release an animal', optionB: 'To reveal a secret', optionC: 'To be careless', optionD: 'To cause trouble', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Grammar II', { text: 'Choose the correctly spelled word:', optionA: 'Occurence', optionB: 'Occurrence', optionC: 'Occurance', optionD: 'Occurrance', correctOption: 'B', weightage: 1 });

  // Phonetics: +5×1M
  await createQ('English', 'Phonetics', { text: 'The consonant sound /θ/ is found in the word:', optionA: 'This', optionB: 'Think', optionC: 'Ship', optionD: 'Chat', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Phonetics', { text: 'Which word has the primary stress on the first syllable?', optionA: 'Hotel', optionB: 'Record (noun)', optionC: 'Alone', optionD: 'Belief', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Phonetics', { text: 'How many phonemes are in the word "sheep"?', optionA: '3', optionB: '4', optionC: '5', optionD: '2', correctOption: 'A', weightage: 1 });
  await createQ('English', 'Phonetics', { text: 'The sound /ŋ/ occurs in the word:', optionA: 'Net', optionB: 'Ring', optionC: 'Man', optionD: 'Ten', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Phonetics', { text: 'How many syllables are in the word "communication"?', optionA: '4', optionB: '5', optionC: '6', optionD: '3', correctOption: 'B', weightage: 1 });

  // Comprehension: +8×2M (using existing passages)
  await createQ('English', 'Comprehension', { passageId: passage1.id, text: 'What is the highest point on Earth mentioned in the passage?', optionA: 'K2', optionB: 'Mount Everest', optionC: 'Kangchenjunga', optionD: 'Annapurna', correctOption: 'B', weightage: 2 });
  await createQ('English', 'Comprehension', { passageId: passage1.id, text: 'How many languages are spoken in Nepal according to the passage?', optionA: 'Over 100', optionB: 'Over 120', optionC: 'Over 150', optionD: 'Over 200', correctOption: 'B', weightage: 2 });
  await createQ('English', 'Comprehension', { passageId: passage2.id, text: 'When was the first engineering college in Nepal established?', optionA: 'Early 1970s', optionB: 'Late 1970s', optionC: 'Early 1980s', optionD: 'Late 1980s', correctOption: 'B', weightage: 2 });
  await createQ('English', 'Comprehension', { passageId: passage2.id, text: 'Why does the IOE exam use negative marking?', optionA: 'To increase difficulty', optionB: 'To reduce paper length', optionC: 'To discourage random guessing', optionD: 'To save time', correctOption: 'C', weightage: 2 });
  await createQ('English', 'Comprehension', { passageId: passage3.id, text: 'What type of energy source is needed to limit warming according to the passage?', optionA: 'Nuclear energy', optionB: 'Fossil fuels', optionC: 'Renewable energy', optionD: 'Hydrocarbon energy', correctOption: 'C', weightage: 2 });
  await createQ('English', 'Comprehension', { passageId: passage4.id, text: 'When were the first electronic computers developed?', optionA: 'During World War I', optionB: 'During World War II', optionC: 'After World War II', optionD: 'In the 1960s', correctOption: 'B', weightage: 2 });
  await createQ('English', 'Comprehension', { passageId: passage4.id, text: 'What does the passage compare a smartphone\'s computing power to?', optionA: 'Modern supercomputers', optionB: 'The Analytical Engine', optionC: 'The computers that guided Apollo missions', optionD: 'The abacus', correctOption: 'C', weightage: 2 });
  await createQ('English', 'Comprehension', { passageId: passage3.id, text: 'What international agreement is mentioned in the passage?', optionA: 'Kyoto Protocol', optionB: 'Paris Accord', optionC: 'Montreal Protocol', optionD: 'Geneva Convention', correctOption: 'B', weightage: 2 });

  // ── Batch 4: More English Questions ──

  // Grammar I: +8×1M
  await createQ('English', 'Grammar I', { text: 'Choose the correct tense: "He ___ football every Saturday."', optionA: 'play', optionB: 'plays', optionC: 'playing', optionD: 'played', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Grammar I', { text: 'The passive voice of "The police arrested the thief" is:', optionA: 'The thief was arrested by the police.', optionB: 'The thief is arrested by the police.', optionC: 'The thief has been arrested by the police.', optionD: 'The thief had been arrested by the police.', correctOption: 'A', weightage: 1 });
  await createQ('English', 'Grammar I', { text: 'The indirect speech of "She said, \'I will come tomorrow\'" is:', optionA: 'She said that she will come tomorrow.', optionB: 'She said that she would come the next day.', optionC: 'She said that she comes the next day.', optionD: 'She said she will come the next day.', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Grammar I', { text: 'Choose the correct form: "If she ___ harder, she would pass."', optionA: 'studies', optionB: 'studied', optionC: 'study', optionD: 'will study', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Grammar I', { text: 'Which sentence uses the future perfect correctly?', optionA: 'She will finished by then.', optionB: 'She will have finished by then.', optionC: 'She has finished by then.', optionD: 'She will be finishing by then.', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Grammar I', { text: 'The active voice of "A letter was written by her" is:', optionA: 'She writes a letter.', optionB: 'She wrote a letter.', optionC: 'She has written a letter.', optionD: 'She is writing a letter.', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Grammar I', { text: '"He asked me whether I had eaten." The direct speech is:', optionA: 'He said, "Have you eaten?"', optionB: 'He said, "Had you eaten?"', optionC: 'He said, "Did you eat?"', optionD: 'He said, "Do you eat?"', correctOption: 'A', weightage: 1 });
  await createQ('English', 'Grammar I', { text: 'Choose the correct sentence:', optionA: 'Hardly had he left when it rained.', optionB: 'Hardly he had left when it rained.', optionC: 'Hardly had he left when it rain.', optionD: 'Hardly he left when it rained.', correctOption: 'A', weightage: 1 });

  // Grammar II: +8×1M
  await createQ('English', 'Grammar II', { text: 'Choose the correct preposition: "She arrived ___ the airport at noon."', optionA: 'in', optionB: 'at', optionC: 'on', optionD: 'to', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Grammar II', { text: 'The synonym of "Meticulous" is:', optionA: 'Careless', optionB: 'Thorough', optionC: 'Bold', optionD: 'Timid', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Grammar II', { text: '"To be in hot water" means:', optionA: 'To take a bath', optionB: 'To be in trouble', optionC: 'To feel warm', optionD: 'To cook food', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Grammar II', { text: 'The antonym of "Lethargic" is:', optionA: 'Lazy', optionB: 'Energetic', optionC: 'Slow', optionD: 'Tired', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Grammar II', { text: 'Choose the correctly spelled word:', optionA: 'Recieve', optionB: 'Receive', optionC: 'Receeve', optionD: 'Receve', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Grammar II', { text: '"To read between the lines" means:', optionA: 'To read carefully', optionB: 'To understand hidden meaning', optionC: 'To read quickly', optionD: 'To skip lines', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Grammar II', { text: 'The word "beautiful" is a/an:', optionA: 'Noun', optionB: 'Adjective', optionC: 'Adverb', optionD: 'Verb', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Grammar II', { text: '"Having finished lunch, we left." The phrase is a:', optionA: 'Gerund phrase', optionB: 'Participial phrase', optionC: 'Infinitive phrase', optionD: 'Absolute phrase', correctOption: 'B', weightage: 1 });

  // Phonetics: +5×1M
  await createQ('English', 'Phonetics', { text: 'The sound /ʃ/ occurs in the word:', optionA: 'Cat', optionB: 'Ship', optionC: 'Jet', optionD: 'Zip', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Phonetics', { text: 'How many syllables are in the word "beautiful"?', optionA: '2', optionB: '3', optionC: '4', optionD: '5', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Phonetics', { text: 'Which word has the stress on the third syllable?', optionA: 'Important', optionB: 'Engineer', optionC: 'Telephone', optionD: 'Yesterday', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Phonetics', { text: 'The /dʒ/ sound is found in:', optionA: 'Church', optionB: 'Judge', optionC: 'Ship', optionD: 'Think', correctOption: 'B', weightage: 1 });
  await createQ('English', 'Phonetics', { text: 'Which of the following is a voiced consonant?', optionA: '/p/', optionB: '/b/', optionC: '/t/', optionD: '/k/', correctOption: 'B', weightage: 1 });

  // Comprehension: +8×2M
  await createQ('English', 'Comprehension', { passageId: passage1.id, text: 'What type of terrain does Nepal have in the south?', optionA: 'Mountains', optionB: 'Flat Terai plains', optionC: 'Deserts', optionD: 'Plateaus', correctOption: 'B', weightage: 2 });
  await createQ('English', 'Comprehension', { passageId: passage1.id, text: 'What is Nepal\'s economy primarily based on according to the passage?', optionA: 'Mining and industry', optionB: 'Agriculture, tourism, and remittances', optionC: 'Technology and manufacturing', optionD: 'Fishing and forestry', correctOption: 'B', weightage: 2 });
  await createQ('English', 'Comprehension', { passageId: passage2.id, text: 'Which university conducts the IOE entrance exam?', optionA: 'Kathmandu University', optionB: 'Tribhuvan University', optionC: 'Pokhara University', optionD: 'Purbanchal University', correctOption: 'B', weightage: 2 });
  await createQ('English', 'Comprehension', { passageId: passage2.id, text: 'What type of programs does the IOE entrance exam select students for?', optionA: 'Medical programs', optionB: 'Undergraduate engineering programs', optionC: 'PhD programs', optionD: 'Arts programs', correctOption: 'B', weightage: 2 });
  await createQ('English', 'Comprehension', { passageId: passage3.id, text: 'What are shifting worldwide due to climate change?', optionA: 'Political boundaries', optionB: 'Ecosystems', optionC: 'Ocean currents only', optionD: 'Trade routes', correctOption: 'B', weightage: 2 });
  await createQ('English', 'Comprehension', { passageId: passage3.id, text: 'What dramatic action is required to achieve the Paris Accord goal?', optionA: 'Planting trees', optionB: 'Reductions in carbon emissions', optionC: 'Building dams', optionD: 'International trade', correctOption: 'B', weightage: 2 });
  await createQ('English', 'Comprehension', { passageId: passage4.id, text: 'What consumed enormous amounts of power according to the passage?', optionA: 'Modern laptops', optionB: 'The first electronic computers', optionC: 'The abacus', optionD: 'Smartphones', correctOption: 'B', weightage: 2 });
  await createQ('English', 'Comprehension', { passageId: passage4.id, text: 'Which space missions are mentioned in the passage?', optionA: 'Mars missions', optionB: 'Apollo missions', optionC: 'Voyager missions', optionD: 'Space Shuttle missions', correctOption: 'B', weightage: 2 });

  console.log('✅ English: 63×1M + 29×2M = 92 Qs in bank');

  // ═══════════════════════════════════════════════════════════════
  //  CHEMISTRY  —  14 × 1M + 8 × 2M = 30 marks
  //  Physical Chemistry → 2M only (8 Qs),
  //  Inorganic Chemistry → 1M only (8 Qs),
  //  Organic Chemistry → 1M only (6 Qs)
  // ═══════════════════════════════════════════════════════════════

  // Physical Chemistry: 8×2M = 16 marks (2M only)
  await createQ('Chemistry', 'Physical Chemistry', { text: 'Calculate the number of moles in 44g of CO₂ (molecular mass = 44 g/mol):', optionA: '0.5 mol', optionB: '1 mol', optionC: '2 mol', optionD: '44 mol', correctOption: 'B', weightage: 2 });
  await createQ('Chemistry', 'Physical Chemistry', { text: 'The pH of a 0.01 M HCl solution is:', optionA: '1', optionB: '2', optionC: '3', optionD: '4', correctOption: 'B', weightage: 2 });
  await createQ('Chemistry', 'Physical Chemistry', { text: 'If Ka of a weak acid is 1.8 × 10⁻⁵, what is the pKa?', optionA: '4.74', optionB: '5.74', optionC: '3.74', optionD: '6.74', correctOption: 'A', weightage: 2 });
  await createQ('Chemistry', 'Physical Chemistry', { text: 'At STP, what volume does 1 mole of an ideal gas occupy?', optionA: '11.2 L', optionB: '22.4 L', optionC: '44.8 L', optionD: '2.24 L', correctOption: 'B', weightage: 2 });
  await createQ('Chemistry', 'Physical Chemistry', { text: 'For an exothermic reaction, if temperature is increased, the equilibrium shifts towards:', optionA: 'Products', optionB: 'Reactants', optionC: 'No change', optionD: 'Cannot determine', correctOption: 'B', weightage: 2 });
  await createQ('Chemistry', 'Physical Chemistry', { text: 'The standard electrode potential of hydrogen electrode is:', optionA: '1.0 V', optionB: '-1.0 V', optionC: '0.0 V', optionD: '0.5 V', correctOption: 'C', weightage: 2 });
  await createQ('Chemistry', 'Physical Chemistry', { text: 'A reaction has activation energy 100 kJ/mol and ΔH = -50 kJ/mol. The activation energy of the reverse reaction is:', optionA: '50 kJ/mol', optionB: '100 kJ/mol', optionC: '150 kJ/mol', optionD: '200 kJ/mol', correctOption: 'C', weightage: 2 });
  await createQ('Chemistry', 'Physical Chemistry', { text: 'What is the oxidation state of S in H₂SO₄?', optionA: '+4', optionB: '+6', optionC: '+2', optionD: '-2', correctOption: 'B', weightage: 2 });
  await createQ('Chemistry', 'Physical Chemistry', { text: 'The pH of a 0.001 M NaOH solution at 25°C is:', optionA: '3', optionB: '11', optionC: '10', optionD: '12', correctOption: 'B', weightage: 2 });
  await createQ('Chemistry', 'Physical Chemistry', { text: 'If 2 moles of an ideal gas at 300K occupy 50L, what is the pressure (R=0.082 L·atm/mol·K)?', optionA: '0.49 atm', optionB: '0.984 atm', optionC: '1.23 atm', optionD: '2.46 atm', correctOption: 'B', weightage: 2 });

  // Inorganic Chemistry: 8×1M = 8 marks (1M only)
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'The atomic number of Carbon is:', optionA: '4', optionB: '6', optionC: '8', optionD: '12', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'Which of the following is a noble gas?', optionA: 'Nitrogen', optionB: 'Oxygen', optionC: 'Argon', optionD: 'Chlorine', correctOption: 'C', weightage: 1 });
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'Which element has the highest electronegativity?', optionA: 'Oxygen', optionB: 'Nitrogen', optionC: 'Fluorine', optionD: 'Chlorine', correctOption: 'C', weightage: 1 });
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'Which gas is evolved when zinc reacts with dilute HCl?', optionA: 'Oxygen', optionB: 'Chlorine', optionC: 'Hydrogen', optionD: 'Nitrogen', correctOption: 'C', weightage: 1 });
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'Ozone (O₃) is an allotrope of:', optionA: 'Nitrogen', optionB: 'Oxygen', optionC: 'Carbon', optionD: 'Sulphur', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'Which type of bond exists in NaCl?', optionA: 'Covalent', optionB: 'Ionic', optionC: 'Metallic', optionD: 'Hydrogen', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'The electronic configuration of Na (Z=11) is:', optionA: '2, 8, 2', optionB: '2, 8, 1', optionC: '2, 7, 2', optionD: '2, 8, 3', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'Which metal is extracted by the thermite process?', optionA: 'Copper', optionB: 'Aluminium', optionC: 'Iron', optionD: 'Zinc', correctOption: 'C', weightage: 1 });
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'Avogadro\'s number is approximately:', optionA: '6.022 × 10²³', optionB: '6.022 × 10²²', optionC: '3.14 × 10²³', optionD: '6.626 × 10⁻³⁴', correctOption: 'A', weightage: 1 });
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'The pH of a neutral solution at 25°C is:', optionA: '0', optionB: '7', optionC: '14', optionD: '1', correctOption: 'B', weightage: 1 });

  // Organic Chemistry: 6×1M = 6 marks (1M only)
  await createQ('Chemistry', 'Organic Chemistry', { text: 'The IUPAC name of CH₃CHO is:', optionA: 'Methanol', optionB: 'Ethanal', optionC: 'Propanal', optionD: 'Methanal', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Organic Chemistry', { text: 'The hybridization of carbon in methane (CH₄) is:', optionA: 'sp', optionB: 'sp²', optionC: 'sp³', optionD: 'sp³d', correctOption: 'C', weightage: 1 });
  await createQ('Chemistry', 'Organic Chemistry', { text: 'The molecular formula of glucose is:', optionA: 'C₆H₁₂O₆', optionB: 'C₆H₁₀O₅', optionC: 'C₁₂H₂₂O₁₁', optionD: 'CH₂O', correctOption: 'A', weightage: 1 });
  await createQ('Chemistry', 'Organic Chemistry', { text: 'The functional group present in alcohols is:', optionA: '-CHO', optionB: '-COOH', optionC: '-OH', optionD: '-CO-', correctOption: 'C', weightage: 1 });
  await createQ('Chemistry', 'Organic Chemistry', { text: 'The IUPAC name of CH₃COCH₃ is:', optionA: 'Propanal', optionB: 'Propanone', optionC: 'Propanol', optionD: 'Propanoic acid', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Organic Chemistry', { text: 'Benzene has the molecular formula:', optionA: 'C₆H₆', optionB: 'C₆H₁₂', optionC: 'C₆H₅OH', optionD: 'C₆H₅NH₂', correctOption: 'A', weightage: 1 });
  await createQ('Chemistry', 'Organic Chemistry', { text: 'The general formula of alkanes is:', optionA: 'CₙH₂ₙ', optionB: 'CₙH₂ₙ₊₂', optionC: 'CₙH₂ₙ₋₂', optionD: 'CₙHₙ', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Organic Chemistry', { text: 'Ethanol and dimethyl ether are examples of:', optionA: 'Chain isomers', optionB: 'Position isomers', optionC: 'Functional group isomers', optionD: 'Geometric isomers', correctOption: 'C', weightage: 1 });

  // ── Additional Chemistry Questions ──

  // Physical Chemistry: +8×2M
  await createQ('Chemistry', 'Physical Chemistry', { text: 'The enthalpy change for an endothermic reaction is:', optionA: 'Negative', optionB: 'Positive', optionC: 'Zero', optionD: 'Cannot be determined', correctOption: 'B', weightage: 2 });
  await createQ('Chemistry', 'Physical Chemistry', { text: 'According to Le Chatelier\'s principle, increasing pressure favors the side with:', optionA: 'More moles of gas', optionB: 'Fewer moles of gas', optionC: 'Higher temperature', optionD: 'Lower temperature', correctOption: 'B', weightage: 2 });
  await createQ('Chemistry', 'Physical Chemistry', { text: 'Calculate the molarity of a solution containing 4 g NaOH in 500 mL (Molar mass NaOH = 40):', optionA: '0.1 M', optionB: '0.2 M', optionC: '0.4 M', optionD: '1.0 M', correctOption: 'B', weightage: 2 });
  await createQ('Chemistry', 'Physical Chemistry', { text: 'The Nernst equation is used to calculate:', optionA: 'Rate of reaction', optionB: 'Electrode potential under non-standard conditions', optionC: 'Equilibrium constant only', optionD: 'Activation energy', correctOption: 'B', weightage: 2 });
  await createQ('Chemistry', 'Physical Chemistry', { text: 'The rate of a first-order reaction depends on:', optionA: 'Concentration of reactant', optionB: 'Square of concentration', optionC: 'Cube of concentration', optionD: 'Independent of concentration', correctOption: 'A', weightage: 2 });
  await createQ('Chemistry', 'Physical Chemistry', { text: 'In an electrolytic cell, oxidation occurs at the:', optionA: 'Cathode', optionB: 'Anode', optionC: 'Both electrodes', optionD: 'Neither electrode', correctOption: 'B', weightage: 2 });
  await createQ('Chemistry', 'Physical Chemistry', { text: 'If 10 g of CaCO₃ is heated completely, the volume of CO₂ at STP is (M of CaCO₃=100):', optionA: '1.12 L', optionB: '2.24 L', optionC: '4.48 L', optionD: '22.4 L', correctOption: 'B', weightage: 2 });
  await createQ('Chemistry', 'Physical Chemistry', { text: 'The degree of dissociation of a weak acid increases with:', optionA: 'Increase in concentration', optionB: 'Decrease in concentration', optionC: 'Addition of strong acid', optionD: 'Decrease in temperature', correctOption: 'B', weightage: 2 });

  // Inorganic Chemistry: +8×1M
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'The shape of the methane molecule is:', optionA: 'Linear', optionB: 'Planar', optionC: 'Tetrahedral', optionD: 'Octahedral', correctOption: 'C', weightage: 1 });
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'Which is the lightest element?', optionA: 'Helium', optionB: 'Hydrogen', optionC: 'Lithium', optionD: 'Carbon', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'The number of electrons in Ca²⁺ (Z=20) is:', optionA: '22', optionB: '20', optionC: '18', optionD: '16', correctOption: 'C', weightage: 1 });
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'The oxidation state of oxygen in most compounds is:', optionA: '-1', optionB: '-2', optionC: '+2', optionD: '0', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'Which of the following is a transition metal?', optionA: 'Sodium', optionB: 'Calcium', optionC: 'Iron', optionD: 'Aluminium', correctOption: 'C', weightage: 1 });
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'The formula of copper(II) sulfate is:', optionA: 'CuSO₃', optionB: 'CuSO₄', optionC: 'Cu₂SO₄', optionD: 'CuS', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'In the periodic table, elements are arranged in order of increasing:', optionA: 'Atomic mass', optionB: 'Atomic number', optionC: 'Electron affinity', optionD: 'Electronegativity', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'The number of covalent bonds in a molecule of water is:', optionA: '1', optionB: '2', optionC: '3', optionD: '4', correctOption: 'B', weightage: 1 });

  // Organic Chemistry: +8×1M
  await createQ('Chemistry', 'Organic Chemistry', { text: 'The IUPAC name of CH₃CH₂OH is:', optionA: 'Methanol', optionB: 'Ethanol', optionC: 'Propanol', optionD: 'Butanol', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Organic Chemistry', { text: 'Dehydration of ethanol gives:', optionA: 'Ethane', optionB: 'Ethene', optionC: 'Methane', optionD: 'Acetylene', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Organic Chemistry', { text: 'The general formula of alkynes is:', optionA: 'CₙH₂ₙ', optionB: 'CₙH₂ₙ₊₂', optionC: 'CₙH₂ₙ₋₂', optionD: 'CₙHₙ', correctOption: 'C', weightage: 1 });
  await createQ('Chemistry', 'Organic Chemistry', { text: 'Grignard reagent has the general formula:', optionA: 'RMgX', optionB: 'RLi', optionC: 'R₂Mg', optionD: 'RZnX', correctOption: 'A', weightage: 1 });
  await createQ('Chemistry', 'Organic Chemistry', { text: 'Which of the following is an aromatic compound?', optionA: 'Cyclohexane', optionB: 'Benzene', optionC: 'Propane', optionD: 'Ethene', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Organic Chemistry', { text: 'Saponification is the process of making:', optionA: 'Alcohol', optionB: 'Soap', optionC: 'Sugar', optionD: 'Ester', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Organic Chemistry', { text: 'The number of sigma bonds in ethane (C₂H₆) is:', optionA: '5', optionB: '6', optionC: '7', optionD: '8', correctOption: 'C', weightage: 1 });
  await createQ('Chemistry', 'Organic Chemistry', { text: 'Which type of reaction converts an alkene to an alkane?', optionA: 'Oxidation', optionB: 'Hydrogenation', optionC: 'Dehydration', optionD: 'Halogenation', correctOption: 'B', weightage: 1 });

  // ── Batch 3: More Chemistry Questions ──

  // Physical Chemistry: +8×2M
  await createQ('Chemistry', 'Physical Chemistry', { text: 'The ionic product of water (Kw) at 25°C is:', optionA: '10⁻⁷', optionB: '10⁻¹⁴', optionC: '10⁻¹²', optionD: '10⁻¹⁰', correctOption: 'B', weightage: 2 });
  await createQ('Chemistry', 'Physical Chemistry', { text: 'The unit of rate constant for a second order reaction is:', optionA: 's⁻¹', optionB: 'mol⁻¹ L s⁻¹', optionC: 'mol L⁻¹ s⁻¹', optionD: 'mol² L⁻² s⁻¹', correctOption: 'B', weightage: 2 });
  await createQ('Chemistry', 'Physical Chemistry', { text: 'The molar mass of H₂O is:', optionA: '16 g/mol', optionB: '18 g/mol', optionC: '20 g/mol', optionD: '34 g/mol', correctOption: 'B', weightage: 2 });
  await createQ('Chemistry', 'Physical Chemistry', { text: 'In a galvanic cell, the cathode is the electrode where:', optionA: 'Oxidation occurs', optionB: 'Reduction occurs', optionC: 'No reaction occurs', optionD: 'Gas is evolved', correctOption: 'B', weightage: 2 });
  await createQ('Chemistry', 'Physical Chemistry', { text: 'The equilibrium constant Kc for N₂ + 3H₂ ⇌ 2NH₃ has units:', optionA: 'mol² L⁻²', optionB: 'mol⁻² L²', optionC: 'No units', optionD: 'mol L⁻¹', correctOption: 'B', weightage: 2 });
  await createQ('Chemistry', 'Physical Chemistry', { text: 'Hess\'s law is based on conservation of:', optionA: 'Mass', optionB: 'Energy', optionC: 'Momentum', optionD: 'Volume', correctOption: 'B', weightage: 2 });
  await createQ('Chemistry', 'Physical Chemistry', { text: 'The half-life of a first-order reaction is:', optionA: 'Dependent on initial concentration', optionB: 'Independent of initial concentration', optionC: 'Zero', optionD: 'Infinite', correctOption: 'B', weightage: 2 });
  await createQ('Chemistry', 'Physical Chemistry', { text: 'A buffer solution resists change in:', optionA: 'Volume', optionB: 'pH', optionC: 'Temperature', optionD: 'Pressure', correctOption: 'B', weightage: 2 });

  // Inorganic Chemistry: +8×1M
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'The VSEPR shape of NH₃ is:', optionA: 'Linear', optionB: 'Trigonal planar', optionC: 'Trigonal pyramidal', optionD: 'Tetrahedral', correctOption: 'C', weightage: 1 });
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'The ore of aluminium is:', optionA: 'Haematite', optionB: 'Bauxite', optionC: 'Galena', optionD: 'Chalcopyrite', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'Which group in the periodic table contains halogens?', optionA: 'Group 1', optionB: 'Group 2', optionC: 'Group 17', optionD: 'Group 18', correctOption: 'C', weightage: 1 });
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'The number of neutrons in ¹⁴C is:', optionA: '6', optionB: '8', optionC: '14', optionD: '12', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'Which of the following is an amphoteric oxide?', optionA: 'Na₂O', optionB: 'CaO', optionC: 'Al₂O₃', optionD: 'SO₃', correctOption: 'C', weightage: 1 });
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'The coordination number of Na⁺ in NaCl crystal is:', optionA: '4', optionB: '6', optionC: '8', optionD: '12', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'The colour of copper(II) sulfate solution is:', optionA: 'Green', optionB: 'Blue', optionC: 'Yellow', optionD: 'Colourless', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'The process of converting ore into oxide by heating in air is called:', optionA: 'Smelting', optionB: 'Roasting', optionC: 'Calcination', optionD: 'Leaching', correctOption: 'B', weightage: 1 });

  // Organic Chemistry: +8×1M
  await createQ('Chemistry', 'Organic Chemistry', { text: 'Markovnikov\'s rule is applicable to:', optionA: 'Addition to symmetrical alkenes', optionB: 'Addition to unsymmetrical alkenes', optionC: 'Substitution reactions', optionD: 'Elimination reactions', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Organic Chemistry', { text: 'The IUPAC name of CH₃COOH is:', optionA: 'Methanoic acid', optionB: 'Ethanoic acid', optionC: 'Propanoic acid', optionD: 'Butanoic acid', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Organic Chemistry', { text: 'Which test is used to distinguish between aldehydes and ketones?', optionA: 'Litmus test', optionB: 'Tollens\' test', optionC: 'Flame test', optionD: 'pH test', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Organic Chemistry', { text: 'The hybridization of carbon in ethylene (C₂H₄) is:', optionA: 'sp', optionB: 'sp²', optionC: 'sp³', optionD: 'sp³d', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Organic Chemistry', { text: 'Esterification is the reaction between:', optionA: 'Acid and base', optionB: 'Alcohol and carboxylic acid', optionC: 'Two alcohols', optionD: 'Aldehyde and ketone', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Organic Chemistry', { text: 'The number of pi bonds in acetylene (C₂H₂) is:', optionA: '1', optionB: '2', optionC: '3', optionD: '0', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Organic Chemistry', { text: 'Cannizzaro reaction is given by aldehydes that lack:', optionA: 'Oxygen', optionB: 'Alpha hydrogen', optionC: 'Nitrogen', optionD: 'Halogen', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Organic Chemistry', { text: 'Phenol is more acidic than ethanol because of:', optionA: 'Hydrogen bonding', optionB: 'Resonance stabilization of phenoxide ion', optionC: 'Inductive effect', optionD: 'Molecular weight', correctOption: 'B', weightage: 1 });

  // ── Batch 4: More Chemistry Questions ──

  // Physical Chemistry: +8×2M
  await createQ('Chemistry', 'Physical Chemistry', { text: 'According to Raoult\'s law, the vapor pressure of a solution is:', optionA: 'Greater than pure solvent', optionB: 'Less than pure solvent', optionC: 'Equal to pure solvent', optionD: 'Independent of solute', correctOption: 'B', weightage: 2 });
  await createQ('Chemistry', 'Physical Chemistry', { text: 'The common ion effect suppresses the:', optionA: 'Solubility of a salt', optionB: 'Ionization of a weak electrolyte', optionC: 'Rate of reaction', optionD: 'Temperature', correctOption: 'B', weightage: 2 });
  await createQ('Chemistry', 'Physical Chemistry', { text: 'Gibbs free energy change (ΔG) for a spontaneous reaction is:', optionA: 'Positive', optionB: 'Negative', optionC: 'Zero', optionD: 'Infinite', correctOption: 'B', weightage: 2 });
  await createQ('Chemistry', 'Physical Chemistry', { text: 'The van\'t Hoff factor for NaCl (fully dissociated) is:', optionA: '1', optionB: '2', optionC: '3', optionD: '0.5', correctOption: 'B', weightage: 2 });
  await createQ('Chemistry', 'Physical Chemistry', { text: 'The Faraday constant is approximately:', optionA: '48250 C/mol', optionB: '96500 C/mol', optionC: '193000 C/mol', optionD: '6022 C/mol', correctOption: 'B', weightage: 2 });
  await createQ('Chemistry', 'Physical Chemistry', { text: 'Colligative properties depend on the:', optionA: 'Nature of solute', optionB: 'Number of solute particles', optionC: 'Nature of solvent', optionD: 'Size of particles', correctOption: 'B', weightage: 2 });
  await createQ('Chemistry', 'Physical Chemistry', { text: 'For a zero-order reaction, the half-life is proportional to:', optionA: 'Initial concentration', optionB: 'Rate constant', optionC: 'Temperature', optionD: 'Pressure', correctOption: 'A', weightage: 2 });
  await createQ('Chemistry', 'Physical Chemistry', { text: 'The relationship PV = nRT is known as:', optionA: 'Boyle\'s law', optionB: 'Ideal gas equation', optionC: 'Charles\' law', optionD: 'Dalton\'s law', correctOption: 'B', weightage: 2 });

  // Inorganic Chemistry: +8×1M
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'The oxidation state of Mn in KMnO₄ is:', optionA: '+5', optionB: '+7', optionC: '+3', optionD: '+4', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'Which element is a liquid at room temperature?', optionA: 'Iron', optionB: 'Mercury', optionC: 'Sodium', optionD: 'Potassium', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'The bond angle in water molecule is approximately:', optionA: '90°', optionB: '104.5°', optionC: '109.5°', optionD: '120°', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'Sodium reacts with water to produce:', optionA: 'Na₂O and H₂', optionB: 'NaOH and H₂', optionC: 'NaCl and H₂O', optionD: 'Na₂O₂ and H₂', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'The hybridization of BF₃ is:', optionA: 'sp', optionB: 'sp²', optionC: 'sp³', optionD: 'sp³d', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'Which process is used to purify impure copper?', optionA: 'Smelting', optionB: 'Electrolytic refining', optionC: 'Distillation', optionD: 'Crystallization', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'The first ionization energy generally increases:', optionA: 'Down a group', optionB: 'Across a period', optionC: 'Diagonally', optionD: 'Randomly', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Inorganic Chemistry', { text: 'The shape of SF₆ is:', optionA: 'Tetrahedral', optionB: 'Octahedral', optionC: 'Square planar', optionD: 'Trigonal bipyramidal', correctOption: 'B', weightage: 1 });

  // Organic Chemistry: +8×1M
  await createQ('Chemistry', 'Organic Chemistry', { text: 'The IUPAC name of HCOOH is:', optionA: 'Ethanoic acid', optionB: 'Methanoic acid', optionC: 'Propanoic acid', optionD: 'Butanoic acid', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Organic Chemistry', { text: 'Wurtz reaction gives:', optionA: 'Alkenes', optionB: 'Higher alkanes', optionC: 'Alkynes', optionD: 'Alcohols', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Organic Chemistry', { text: 'The hybridization of carbon in acetylene is:', optionA: 'sp³', optionB: 'sp', optionC: 'sp²', optionD: 'sp³d', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Organic Chemistry', { text: 'Toluene is:', optionA: 'Chlorobenzene', optionB: 'Methylbenzene', optionC: 'Nitrobenzene', optionD: 'Ethylbenzene', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Organic Chemistry', { text: 'Fehling\'s test is positive for:', optionA: 'Ketones', optionB: 'Aldehydes', optionC: 'Ethers', optionD: 'Alkanes', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Organic Chemistry', { text: 'The monomer of polyethylene is:', optionA: 'Propene', optionB: 'Ethene', optionC: 'Butene', optionD: 'Styrene', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Organic Chemistry', { text: 'Lucas reagent is used to distinguish between:', optionA: 'Aldehydes and ketones', optionB: 'Primary, secondary and tertiary alcohols', optionC: 'Acids and bases', optionD: 'Alkanes and alkenes', correctOption: 'B', weightage: 1 });
  await createQ('Chemistry', 'Organic Chemistry', { text: 'The reaction of alcohol with carboxylic acid in the presence of acid catalyst is called:', optionA: 'Hydrolysis', optionB: 'Esterification', optionC: 'Saponification', optionD: 'Neutralization', correctOption: 'B', weightage: 1 });

  console.log('✅ Chemistry: 54×1M + 34×2M = 98 Qs in bank');

  // ═══════════════════════════════════════════════════════════════
  //  PHYSICS  —  14 × 1M + 13 × 2M = 40 marks
  //  Mechanics → 2M only (5 Qs), Heat & Thermo → 2M only (4 Qs),
  //  Optics → 2M only (4 Qs), Waves & Sound → 1M only (5 Qs),
  //  E&M → 1M only (5 Qs), Modern Physics → 1M only (4 Qs)
  // ═══════════════════════════════════════════════════════════════

  // Mechanics: 5×2M = 10 marks (2M only)
  await createQ('Physics', 'Mechanics', { text: 'A body of mass 5 kg is acted upon by a net force of 20 N. What is its acceleration?', optionA: '2 m/s²', optionB: '4 m/s²', optionC: '5 m/s²', optionD: '100 m/s²', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Mechanics', { text: 'A car accelerates from rest at 2 m/s². What is its velocity after 10 seconds?', optionA: '10 m/s', optionB: '20 m/s', optionC: '5 m/s', optionD: '40 m/s', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Mechanics', { text: 'A ball is thrown vertically upward with velocity 20 m/s. The maximum height reached is (g=10 m/s²):', optionA: '10 m', optionB: '20 m', optionC: '30 m', optionD: '40 m', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Mechanics', { text: 'A bullet of mass 10g moving at 400 m/s is stopped in 0.01s. The average force exerted is:', optionA: '40 N', optionB: '400 N', optionC: '4000 N', optionD: '4 N', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Mechanics', { text: 'A stone is dropped from height 80 m. How long does it take to reach the ground? (g=10 m/s²)', optionA: '2 s', optionB: '4 s', optionC: '8 s', optionD: '16 s', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Mechanics', { text: 'Two forces of 3N and 4N act at right angles. Their resultant is:', optionA: '1 N', optionB: '5 N', optionC: '7 N', optionD: '12 N', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Mechanics', { text: 'A 2 kg object is raised 5 m. The potential energy gained is (g=10 m/s²):', optionA: '10 J', optionB: '100 J', optionC: '50 J', optionD: '25 J', correctOption: 'B', weightage: 2 });

  // Heat and Thermodynamics: 4×2M = 8 marks (2M only)
  await createQ('Physics', 'Heat and Thermodynamics', { text: 'The work done in moving a 10 kg object vertically upward by 5 m is (g=10 m/s²):', optionA: '100 J', optionB: '500 J', optionC: '50 J', optionD: '250 J', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Heat and Thermodynamics', { text: 'An ideal gas at 27°C is heated to 327°C at constant pressure. The ratio of final to initial volume is:', optionA: '1:2', optionB: '2:1', optionC: '327:27', optionD: '27:327', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Heat and Thermodynamics', { text: 'How much heat is required to raise the temperature of 2 kg of water by 10°C? (specific heat = 4200 J/kg·K)', optionA: '42000 J', optionB: '84000 J', optionC: '21000 J', optionD: '8400 J', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Heat and Thermodynamics', { text: 'In an isothermal process, the internal energy of an ideal gas:', optionA: 'Increases', optionB: 'Decreases', optionC: 'Remains constant', optionD: 'Becomes zero', correctOption: 'C', weightage: 2 });
  await createQ('Physics', 'Heat and Thermodynamics', { text: 'The efficiency of a Carnot engine working between 500K and 300K is:', optionA: '20%', optionB: '40%', optionC: '60%', optionD: '80%', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Heat and Thermodynamics', { text: 'A metal rod of length 1m at 0°C expands by 1.2mm when heated to 100°C. Its coefficient of linear expansion is:', optionA: '1.2 × 10⁻⁵ /°C', optionB: '1.2 × 10⁻⁴ /°C', optionC: '1.2 × 10⁻³ /°C', optionD: '1.2 × 10⁻² /°C', correctOption: 'A', weightage: 2 });

  // Geometric and Physical Optics: 4×2M = 8 marks (2M only)
  await createQ('Physics', 'Geometric and Physical Optics', { text: 'The focal length of a concave mirror is 20 cm. Its radius of curvature is:', optionA: '10 cm', optionB: '20 cm', optionC: '40 cm', optionD: '80 cm', correctOption: 'C', weightage: 2 });
  await createQ('Physics', 'Geometric and Physical Optics', { text: 'In Young\'s double slit experiment, the fringe width is proportional to:', optionA: 'slit width', optionB: 'wavelength of light', optionC: 'distance between slits squared', optionD: 'intensity of light', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Geometric and Physical Optics', { text: 'An object is placed 30 cm from a convex lens of focal length 20 cm. The image distance is:', optionA: '30 cm', optionB: '60 cm', optionC: '20 cm', optionD: '10 cm', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Geometric and Physical Optics', { text: 'The refractive index of glass is 1.5. The critical angle for glass-air interface is approximately:', optionA: '30°', optionB: '42°', optionC: '45°', optionD: '60°', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Geometric and Physical Optics', { text: 'The power of a convex lens of focal length 25 cm is:', optionA: '+2 D', optionB: '+4 D', optionC: '-4 D', optionD: '+0.25 D', correctOption: 'B', weightage: 2 });

  // Waves and Sound: 5×1M = 5 marks (1M only)
  await createQ('Physics', 'Waves and Sound', { text: 'The speed of sound in air is approximately:', optionA: '330 m/s', optionB: '3 × 10⁸ m/s', optionC: '1500 m/s', optionD: '5000 m/s', correctOption: 'A', weightage: 1 });
  await createQ('Physics', 'Waves and Sound', { text: 'The Doppler effect is related to change in:', optionA: 'Amplitude', optionB: 'Wavelength and frequency', optionC: 'Polarization', optionD: 'Intensity only', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Waves and Sound', { text: 'Sound waves are:', optionA: 'Transverse', optionB: 'Longitudinal', optionC: 'Electromagnetic', optionD: 'Both transverse and longitudinal', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Waves and Sound', { text: 'The phenomenon of two waves combining to form a wave of larger amplitude is called:', optionA: 'Diffraction', optionB: 'Constructive interference', optionC: 'Refraction', optionD: 'Polarization', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Waves and Sound', { text: 'Ultrasonic waves have frequency:', optionA: 'Below 20 Hz', optionB: 'Between 20 Hz and 20 kHz', optionC: 'Above 20 kHz', optionD: 'Exactly 20 kHz', correctOption: 'C', weightage: 1 });
  await createQ('Physics', 'Waves and Sound', { text: 'The SI unit of frequency is:', optionA: 'Meter', optionB: 'Hertz', optionC: 'Newton', optionD: 'Watt', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Waves and Sound', { text: 'Resonance occurs when the frequency of external force equals the:', optionA: 'Amplitude', optionB: 'Natural frequency', optionC: 'Wavelength', optionD: 'Phase', correctOption: 'B', weightage: 1 });

  // Electricity & Magnetism: 5×1M = 5 marks (1M only)
  await createQ('Physics', 'Electricity & Magnetism', { text: 'The unit of electric current is:', optionA: 'Volt', optionB: 'Ohm', optionC: 'Ampere', optionD: 'Coulomb', correctOption: 'C', weightage: 1 });
  await createQ('Physics', 'Electricity & Magnetism', { text: 'Ohm\'s law relates:', optionA: 'Charge and current', optionB: 'Voltage and current', optionC: 'Power and resistance', optionD: 'Energy and charge', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Electricity & Magnetism', { text: 'The SI unit of electric field is:', optionA: 'C/m', optionB: 'N/C', optionC: 'V/A', optionD: 'J/C', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Electricity & Magnetism', { text: 'A moving charge produces:', optionA: 'Only electric field', optionB: 'Only magnetic field', optionC: 'Both electric and magnetic fields', optionD: 'Neither', correctOption: 'C', weightage: 1 });
  await createQ('Physics', 'Electricity & Magnetism', { text: 'The unit of capacitance is:', optionA: 'Ohm', optionB: 'Henry', optionC: 'Farad', optionD: 'Tesla', correctOption: 'C', weightage: 1 });
  await createQ('Physics', 'Electricity & Magnetism', { text: 'Kirchhoff\'s junction rule is based on conservation of:', optionA: 'Energy', optionB: 'Charge', optionC: 'Momentum', optionD: 'Mass', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Electricity & Magnetism', { text: 'The dimensional formula of resistance is:', optionA: 'ML²T⁻³A⁻²', optionB: 'MLT⁻²A⁻¹', optionC: 'ML²T⁻²A⁻²', optionD: 'ML²T⁻³A⁻¹', correctOption: 'A', weightage: 1 });

  // Modern Physics: 4×1M = 4 marks (1M only)
  await createQ('Physics', 'Modern Physics', { text: 'The photoelectric effect was explained by:', optionA: 'Newton', optionB: 'Einstein', optionC: 'Bohr', optionD: 'Faraday', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Modern Physics', { text: 'In a P-N junction diode, current flows easily in:', optionA: 'Both directions', optionB: 'Forward bias only', optionC: 'Reverse bias only', optionD: 'No direction', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Modern Physics', { text: 'Alpha particles consist of:', optionA: '2 protons and 2 neutrons', optionB: '1 proton and 1 neutron', optionC: '2 electrons', optionD: '1 proton only', correctOption: 'A', weightage: 1 });
  await createQ('Physics', 'Modern Physics', { text: 'The transistor was invented by:', optionA: 'Edison', optionB: 'Bardeen, Brattain and Shockley', optionC: 'Faraday', optionD: 'Bohr', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Modern Physics', { text: 'Which particle has no charge?', optionA: 'Proton', optionB: 'Electron', optionC: 'Neutron', optionD: 'Positron', correctOption: 'C', weightage: 1 });
  await createQ('Physics', 'Modern Physics', { text: 'In beta-minus decay, a neutron converts into:', optionA: 'Proton + electron + antineutrino', optionB: 'Proton + positron + neutrino', optionC: 'Alpha particle', optionD: 'Gamma ray', correctOption: 'A', weightage: 1 });

  // ── Additional Physics Questions ──

  // Mechanics: +8×2M
  await createQ('Physics', 'Mechanics', { text: 'A projectile is launched at 30° with velocity 20 m/s. The horizontal range is (g=10 m/s²):', optionA: '20√3 m', optionB: '40 m', optionC: '20 m', optionD: '10√3 m', correctOption: 'A', weightage: 2 });
  await createQ('Physics', 'Mechanics', { text: 'A body of mass 2 kg moving at 3 m/s collides with a stationary body of mass 1 kg. If they stick together, their common velocity is:', optionA: '1 m/s', optionB: '2 m/s', optionC: '3 m/s', optionD: '6 m/s', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Mechanics', { text: 'The moment of inertia of a solid sphere about its diameter is:', optionA: '(2/5)MR²', optionB: '(2/3)MR²', optionC: 'MR²', optionD: '(1/2)MR²', correctOption: 'A', weightage: 2 });
  await createQ('Physics', 'Mechanics', { text: 'A 900 g block at rest is hit by a 100 g bullet moving at 100 m/s (bullet embeds). The system velocity is:', optionA: '5 m/s', optionB: '10 m/s', optionC: '20 m/s', optionD: '100 m/s', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Mechanics', { text: 'The escape velocity from Earth\'s surface is approximately:', optionA: '7.9 km/s', optionB: '11.2 km/s', optionC: '3.2 km/s', optionD: '15.8 km/s', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Mechanics', { text: 'A flywheel rotating at 10 rad/s decelerates uniformly at 2 rad/s². The time to stop is:', optionA: '2 s', optionB: '5 s', optionC: '10 s', optionD: '20 s', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Mechanics', { text: 'The coefficient of static friction between two surfaces is 0.5. If the normal force is 20 N, the maximum static friction is:', optionA: '5 N', optionB: '10 N', optionC: '15 N', optionD: '40 N', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Mechanics', { text: 'A body slides down a frictionless incline of height 5 m. Its speed at the bottom is (g=10 m/s²):', optionA: '5 m/s', optionB: '10 m/s', optionC: '20 m/s', optionD: '50 m/s', correctOption: 'B', weightage: 2 });

  // Heat and Thermodynamics: +6×2M
  await createQ('Physics', 'Heat and Thermodynamics', { text: '100 g of ice at 0°C is mixed with 100 g of water at 100°C. The final temperature is (Lf=80 cal/g):', optionA: '10°C', optionB: '50°C', optionC: '0°C', optionD: '100°C', correctOption: 'A', weightage: 2 });
  await createQ('Physics', 'Heat and Thermodynamics', { text: 'The ratio of Cp to Cv for a monoatomic ideal gas is:', optionA: '5/3', optionB: '7/5', optionC: '4/3', optionD: '9/7', correctOption: 'A', weightage: 2 });
  await createQ('Physics', 'Heat and Thermodynamics', { text: 'A black body at temperature T radiates energy proportional to:', optionA: 'T', optionB: 'T²', optionC: 'T³', optionD: 'T⁴', correctOption: 'D', weightage: 2 });
  await createQ('Physics', 'Heat and Thermodynamics', { text: 'The work done in an isobaric process is:', optionA: 'nCvΔT', optionB: 'PΔV', optionC: 'Zero', optionD: 'nRTln(V₂/V₁)', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Heat and Thermodynamics', { text: 'A heat engine operates between 600 K and 400 K. Its maximum efficiency is:', optionA: '33.3%', optionB: '66.7%', optionC: '50%', optionD: '25%', correctOption: 'A', weightage: 2 });
  await createQ('Physics', 'Heat and Thermodynamics', { text: 'Which quantity is NOT needed to calculate heat conduction through a rod?', optionA: 'Length', optionB: 'Cross-sectional area', optionC: 'Temperature difference', optionD: 'Mass of the rod', correctOption: 'D', weightage: 2 });

  // Geometric and Physical Optics: +6×2M
  await createQ('Physics', 'Geometric and Physical Optics', { text: 'The magnification of a convex mirror is always:', optionA: 'Greater than 1', optionB: 'Less than 1 and positive', optionC: 'Negative', optionD: 'Zero', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Geometric and Physical Optics', { text: 'Two thin lenses of focal lengths 10 cm and -20 cm are in contact. The combined focal length is:', optionA: '10 cm', optionB: '20 cm', optionC: '30 cm', optionD: '-20 cm', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Geometric and Physical Optics', { text: 'In single slit diffraction, the first minimum occurs when:', optionA: 'a sinθ = λ', optionB: 'a sinθ = 2λ', optionC: 'a sinθ = λ/2', optionD: 'a sinθ = 3λ', correctOption: 'A', weightage: 2 });
  await createQ('Physics', 'Geometric and Physical Optics', { text: 'The polarizing angle for glass with refractive index 1.5 is approximately:', optionA: '33°', optionB: '45°', optionC: '56°', optionD: '60°', correctOption: 'C', weightage: 2 });
  await createQ('Physics', 'Geometric and Physical Optics', { text: 'A convex mirror always forms an image that is:', optionA: 'Real and inverted', optionB: 'Virtual, erect and diminished', optionC: 'Real and enlarged', optionD: 'Virtual and enlarged', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Geometric and Physical Optics', { text: 'The angular width of the central maximum in single slit diffraction is:', optionA: 'λ/a', optionB: '2λ/a', optionC: '3λ/a', optionD: 'λ/2a', correctOption: 'B', weightage: 2 });

  // Waves and Sound: +6×1M
  await createQ('Physics', 'Waves and Sound', { text: 'The fundamental frequency of a closed pipe of length L is:', optionA: 'v/4L', optionB: 'v/2L', optionC: 'v/L', optionD: '2v/L', correctOption: 'A', weightage: 1 });
  await createQ('Physics', 'Waves and Sound', { text: 'When a source moves towards a stationary observer, the apparent frequency:', optionA: 'Increases', optionB: 'Decreases', optionC: 'Remains same', optionD: 'Becomes zero', correctOption: 'A', weightage: 1 });
  await createQ('Physics', 'Waves and Sound', { text: 'The speed of sound in a gas is proportional to:', optionA: '√T', optionB: 'T', optionC: 'T²', optionD: '1/T', correctOption: 'A', weightage: 1 });
  await createQ('Physics', 'Waves and Sound', { text: 'Standing waves are formed by the superposition of two waves traveling in:', optionA: 'Same direction with same frequency', optionB: 'Opposite directions with same frequency', optionC: 'Same direction with different frequencies', optionD: 'Opposite directions with different frequencies', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Waves and Sound', { text: 'An organ pipe open at both ends produces:', optionA: 'Only odd harmonics', optionB: 'Only even harmonics', optionC: 'All harmonics', optionD: 'No harmonics', correctOption: 'C', weightage: 1 });
  await createQ('Physics', 'Waves and Sound', { text: 'The speed of a transverse wave on a string depends on:', optionA: 'Tension and linear mass density', optionB: 'Frequency only', optionC: 'Amplitude only', optionD: 'Wavelength only', correctOption: 'A', weightage: 1 });

  // Electricity & Magnetism: +6×1M
  await createQ('Physics', 'Electricity & Magnetism', { text: 'The work done in moving a charge along an equipotential surface is:', optionA: 'Maximum', optionB: 'Minimum', optionC: 'Zero', optionD: 'Infinite', correctOption: 'C', weightage: 1 });
  await createQ('Physics', 'Electricity & Magnetism', { text: 'The equivalent resistance of two 4 Ω resistors connected in parallel is:', optionA: '8 Ω', optionB: '4 Ω', optionC: '2 Ω', optionD: '1 Ω', correctOption: 'C', weightage: 1 });
  await createQ('Physics', 'Electricity & Magnetism', { text: 'In electromagnetic induction, the induced emf is proportional to the rate of change of:', optionA: 'Current', optionB: 'Magnetic flux', optionC: 'Electric field', optionD: 'Resistance', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Electricity & Magnetism', { text: 'The self-inductance of a coil is measured in:', optionA: 'Farad', optionB: 'Tesla', optionC: 'Henry', optionD: 'Weber', correctOption: 'C', weightage: 1 });
  await createQ('Physics', 'Electricity & Magnetism', { text: 'The rms value of an AC current with peak value I₀ is:', optionA: 'I₀', optionB: 'I₀/√2', optionC: 'I₀/2', optionD: '√2·I₀', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Electricity & Magnetism', { text: 'The power dissipated in a pure inductor in an AC circuit is:', optionA: 'Maximum', optionB: 'I²R', optionC: 'Zero', optionD: 'VI', correctOption: 'C', weightage: 1 });

  // Modern Physics: +6×1M
  await createQ('Physics', 'Modern Physics', { text: 'The threshold frequency in the photoelectric effect is the minimum frequency below which:', optionA: 'Electrons are emitted', optionB: 'No electrons are emitted', optionC: 'Maximum electrons are emitted', optionD: 'Current increases', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Modern Physics', { text: 'The de Broglie wavelength is given by:', optionA: 'h/mv', optionB: 'mv/h', optionC: 'h/E', optionD: 'E/h', correctOption: 'A', weightage: 1 });
  await createQ('Physics', 'Modern Physics', { text: 'In nuclear fission, a heavy nucleus splits into:', optionA: 'Two lighter nuclei', optionB: 'Alpha particles only', optionC: 'Protons only', optionD: 'Electrons only', correctOption: 'A', weightage: 1 });
  await createQ('Physics', 'Modern Physics', { text: 'The half-life of a radioactive substance is 10 years. After 30 years, what fraction remains?', optionA: '1/2', optionB: '1/4', optionC: '1/8', optionD: '1/16', correctOption: 'C', weightage: 1 });
  await createQ('Physics', 'Modern Physics', { text: 'Which logic gate gives output 1 only when all inputs are 1?', optionA: 'OR', optionB: 'AND', optionC: 'NOT', optionD: 'NOR', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Modern Physics', { text: 'X-rays are produced when:', optionA: 'Fast electrons hit a metal target', optionB: 'Protons hit a metal target', optionC: 'Neutrons are emitted', optionD: 'Alpha particles decay', correctOption: 'A', weightage: 1 });

  // ── Batch 3: More Physics Questions ──

  // Mechanics: +7×2M
  await createQ('Physics', 'Mechanics', { text: 'A conical pendulum of length L makes angle θ with the vertical. The time period is:', optionA: '2π√(Lcosθ/g)', optionB: '2π√(L/g)', optionC: '2π√(Lsinθ/g)', optionD: '2π√(L/gcosθ)', correctOption: 'A', weightage: 2 });
  await createQ('Physics', 'Mechanics', { text: 'The Young\'s modulus of a wire is the ratio of:', optionA: 'Stress to strain', optionB: 'Strain to stress', optionC: 'Force to area', optionD: 'Extension to length', correctOption: 'A', weightage: 2 });
  await createQ('Physics', 'Mechanics', { text: 'A body of mass 4 kg has kinetic energy 32 J. Its velocity is:', optionA: '2 m/s', optionB: '4 m/s', optionC: '8 m/s', optionD: '16 m/s', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Mechanics', { text: 'The centre of mass of a uniform triangular lamina is at:', optionA: 'Vertices', optionB: 'Centroid', optionC: 'Circumcentre', optionD: 'Incentre', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Mechanics', { text: 'A satellite orbits Earth at height h. If R is Earth\'s radius, orbital velocity is:', optionA: '√(gR²/(R+h))', optionB: '√(g(R+h))', optionC: 'gR', optionD: '√(gR)', correctOption: 'A', weightage: 2 });
  await createQ('Physics', 'Mechanics', { text: 'Surface tension of a liquid has dimensions:', optionA: 'MLT⁻²', optionB: 'MT⁻²', optionC: 'ML⁻¹T⁻²', optionD: 'ML²T⁻²', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Mechanics', { text: 'Bernoulli\'s theorem is based on conservation of:', optionA: 'Mass', optionB: 'Energy', optionC: 'Momentum', optionD: 'Charge', correctOption: 'B', weightage: 2 });

  // Heat & Thermodynamics: +6×2M
  await createQ('Physics', 'Heat and Thermodynamics', { text: 'The internal energy of an ideal gas depends only on:', optionA: 'Pressure', optionB: 'Volume', optionC: 'Temperature', optionD: 'Density', correctOption: 'C', weightage: 2 });
  await createQ('Physics', 'Heat and Thermodynamics', { text: 'In an adiabatic process, the quantity that remains constant is:', optionA: 'Temperature', optionB: 'Pressure', optionC: 'Volume', optionD: 'Heat exchange is zero', correctOption: 'D', weightage: 2 });
  await createQ('Physics', 'Heat and Thermodynamics', { text: 'The mean free path of gas molecules increases with:', optionA: 'Increase in pressure', optionB: 'Decrease in temperature', optionC: 'Decrease in pressure', optionD: 'Increase in molecular size', correctOption: 'C', weightage: 2 });
  await createQ('Physics', 'Heat and Thermodynamics', { text: 'The second law of thermodynamics implies:', optionA: 'Energy is conserved', optionB: 'Entropy of an isolated system never decreases', optionC: 'Work equals heat', optionD: 'Temperature is constant', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Heat and Thermodynamics', { text: 'A perfect black body has emissivity:', optionA: '0', optionB: '0.5', optionC: '1', optionD: 'Infinity', correctOption: 'C', weightage: 2 });
  await createQ('Physics', 'Heat and Thermodynamics', { text: 'The triple point of water is at:', optionA: '0°C', optionB: '100°C', optionC: '273.16 K', optionD: '373.16 K', correctOption: 'C', weightage: 2 });

  // Optics: +6×2M
  await createQ('Physics', 'Geometric and Physical Optics', { text: 'The condition for total internal reflection is that light travels from:', optionA: 'Rarer to denser medium', optionB: 'Denser to rarer medium at angle > critical angle', optionC: 'Any medium at any angle', optionD: 'Vacuum to glass', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Geometric and Physical Optics', { text: 'In the lens maker\'s formula, P = (μ-1)(1/R₁ - 1/R₂), P represents:', optionA: 'Pressure', optionB: 'Power of the lens', optionC: 'Potential', optionD: 'Momentum', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Geometric and Physical Optics', { text: 'The resolving power of a telescope increases with:', optionA: 'Decrease in aperture', optionB: 'Increase in aperture', optionC: 'Increase in focal length', optionD: 'Decrease in wavelength only', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Geometric and Physical Optics', { text: 'Light from a sodium lamp is nearly:', optionA: 'White light', optionB: 'Polychromatic', optionC: 'Monochromatic', optionD: 'Infrared', correctOption: 'C', weightage: 2 });
  await createQ('Physics', 'Geometric and Physical Optics', { text: 'A ray of light passes through a prism of angle A. Minimum deviation occurs when:', optionA: 'Angle of incidence is zero', optionB: 'The ray passes symmetrically through the prism', optionC: 'Angle of emergence is 90°', optionD: 'The prism is equilateral', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Geometric and Physical Optics', { text: 'Scattering of light by small particles is explained by:', optionA: 'Newton\'s theory', optionB: 'Rayleigh scattering', optionC: 'Doppler effect', optionD: 'Brewster\'s law', correctOption: 'B', weightage: 2 });

  // Waves & Sound: +6×1M
  await createQ('Physics', 'Waves and Sound', { text: 'Beats are produced when two waves have:', optionA: 'Same frequency', optionB: 'Slightly different frequencies', optionC: 'Very different frequencies', optionD: 'Same amplitude', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Waves and Sound', { text: 'The velocity of sound is maximum in:', optionA: 'Air', optionB: 'Water', optionC: 'Steel', optionD: 'Vacuum', correctOption: 'C', weightage: 1 });
  await createQ('Physics', 'Waves and Sound', { text: 'Infrasonic waves have frequency:', optionA: 'Above 20 kHz', optionB: 'Between 20 Hz and 20 kHz', optionC: 'Below 20 Hz', optionD: 'Exactly 20 Hz', correctOption: 'C', weightage: 1 });
  await createQ('Physics', 'Waves and Sound', { text: 'The intensity of a sound wave is proportional to:', optionA: 'Amplitude', optionB: 'Square of amplitude', optionC: 'Frequency', optionD: 'Wavelength', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Waves and Sound', { text: 'A closed pipe produces only:', optionA: 'Even harmonics', optionB: 'Odd harmonics', optionC: 'All harmonics', optionD: 'Fundamental only', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Waves and Sound', { text: 'The wavelength of a wave with frequency 500 Hz and speed 340 m/s is:', optionA: '0.34 m', optionB: '0.68 m', optionC: '1.47 m', optionD: '170 m', correctOption: 'B', weightage: 1 });

  // E&M: +6×1M
  await createQ('Physics', 'Electricity & Magnetism', { text: 'The force between two parallel conductors carrying current in the same direction is:', optionA: 'Repulsive', optionB: 'Attractive', optionC: 'Zero', optionD: 'Perpendicular', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Electricity & Magnetism', { text: 'The energy stored in a capacitor of capacitance C charged to voltage V is:', optionA: 'CV', optionB: 'CV²', optionC: '½CV²', optionD: '2CV²', correctOption: 'C', weightage: 1 });
  await createQ('Physics', 'Electricity & Magnetism', { text: 'Lenz\'s law is a consequence of conservation of:', optionA: 'Charge', optionB: 'Mass', optionC: 'Energy', optionD: 'Momentum', correctOption: 'C', weightage: 1 });
  await createQ('Physics', 'Electricity & Magnetism', { text: 'In a transformer, the ratio of voltages equals the ratio of:', optionA: 'Resistances', optionB: 'Number of turns', optionC: 'Currents', optionD: 'Powers', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Electricity & Magnetism', { text: 'The SI unit of magnetic flux is:', optionA: 'Tesla', optionB: 'Weber', optionC: 'Henry', optionD: 'Gauss', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Electricity & Magnetism', { text: 'At resonance in an LCR series circuit:', optionA: 'Impedance is maximum', optionB: 'Current is maximum', optionC: 'Current is minimum', optionD: 'Voltage is zero', correctOption: 'B', weightage: 1 });

  // Modern Physics: +6×1M
  await createQ('Physics', 'Modern Physics', { text: 'Bohr\'s model successfully explains the spectrum of:', optionA: 'All atoms', optionB: 'Hydrogen-like atoms', optionC: 'Multi-electron atoms', optionD: 'Molecules', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Modern Physics', { text: 'The binding energy per nucleon is maximum for:', optionA: 'Hydrogen', optionB: 'Helium', optionC: 'Iron', optionD: 'Uranium', correctOption: 'C', weightage: 1 });
  await createQ('Physics', 'Modern Physics', { text: 'An intrinsic semiconductor at 0 K behaves as:', optionA: 'Conductor', optionB: 'Insulator', optionC: 'Superconductor', optionD: 'Semiconductor', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Modern Physics', { text: 'The output of a NAND gate when both inputs are 1 is:', optionA: '1', optionB: '0', optionC: 'Undefined', optionD: 'High impedance', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Modern Physics', { text: 'Einstein\'s mass-energy relation is E = mc². Here c represents:', optionA: 'Speed of sound', optionB: 'Speed of light', optionC: 'Speed of electron', optionD: 'Specific heat', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Modern Physics', { text: 'Gamma rays are:', optionA: 'Charged particles', optionB: 'Electromagnetic radiation', optionC: 'Neutrons', optionD: 'Protons', correctOption: 'B', weightage: 1 });

  // ── Batch 4: More Physics Questions ──

  // Mechanics: +7×2M
  await createQ('Physics', 'Mechanics', { text: 'The time period of a simple pendulum of length L is:', optionA: '2π√(g/L)', optionB: '2π√(L/g)', optionC: 'π√(L/g)', optionD: '2π(L/g)', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Mechanics', { text: 'Archimedes\' principle states that the buoyant force equals:', optionA: 'Weight of object', optionB: 'Weight of displaced fluid', optionC: 'Volume of object', optionD: 'Density of fluid', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Mechanics', { text: 'A wheel of radius 0.5 m rolls without sliding at 4 m/s. Its angular velocity is:', optionA: '2 rad/s', optionB: '8 rad/s', optionC: '4 rad/s', optionD: '16 rad/s', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Mechanics', { text: 'Poiseuille\'s equation describes the flow rate of:', optionA: 'Ideal fluids', optionB: 'Viscous fluids through a pipe', optionC: 'Turbulent flow', optionD: 'Compressible gases', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Mechanics', { text: 'The work done by a spring force F = -kx in stretching from 0 to x is:', optionA: 'kx', optionB: '½kx²', optionC: 'kx²', optionD: '2kx²', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Mechanics', { text: 'Two masses 3 kg and 1 kg connected by a string over a frictionless pulley. The acceleration is (g=10 m/s²):', optionA: '2.5 m/s²', optionB: '5 m/s²', optionC: '10 m/s²', optionD: '7.5 m/s²', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Mechanics', { text: 'Reynolds number is used to distinguish between:', optionA: 'Solid and liquid flow', optionB: 'Laminar and turbulent flow', optionC: 'Compressible and incompressible', optionD: 'Steady and unsteady state', correctOption: 'B', weightage: 2 });

  // Heat & Thermo: +6×2M
  await createQ('Physics', 'Heat and Thermodynamics', { text: 'The rms velocity of gas molecules is proportional to:', optionA: 'T', optionB: '√T', optionC: 'T²', optionD: '1/T', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Heat and Thermodynamics', { text: 'The specific heat at constant pressure Cp is always:', optionA: 'Less than Cv', optionB: 'Greater than Cv', optionC: 'Equal to Cv', optionD: 'Zero', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Heat and Thermodynamics', { text: 'Wien\'s displacement law relates peak wavelength to:', optionA: 'Pressure', optionB: 'Temperature', optionC: 'Volume', optionD: 'Density', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Heat and Thermodynamics', { text: 'In an isochoric process, the quantity that remains constant is:', optionA: 'Pressure', optionB: 'Volume', optionC: 'Temperature', optionD: 'Entropy', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Heat and Thermodynamics', { text: 'The coefficient of performance of a refrigerator is:', optionA: 'Always less than 1', optionB: 'Can be greater than 1', optionC: 'Always equal to 1', optionD: 'Always zero', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Heat and Thermodynamics', { text: 'Newton\'s law of cooling states that rate of heat loss is proportional to:', optionA: 'Absolute temperature', optionB: 'Temperature difference with surroundings', optionC: 'Square of temperature', optionD: 'Mass of the body', correctOption: 'B', weightage: 2 });

  // Optics: +6×2M
  await createQ('Physics', 'Geometric and Physical Optics', { text: 'An achromatic doublet corrects for:', optionA: 'Spherical aberration', optionB: 'Chromatic aberration', optionC: 'Astigmatism', optionD: 'Coma', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Geometric and Physical Optics', { text: 'The speed of light in a medium of refractive index 1.5 is:', optionA: '3 × 10⁸ m/s', optionB: '2 × 10⁸ m/s', optionC: '4.5 × 10⁸ m/s', optionD: '1.5 × 10⁸ m/s', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Geometric and Physical Optics', { text: 'Optical fiber works on the principle of:', optionA: 'Refraction', optionB: 'Total internal reflection', optionC: 'Diffraction', optionD: 'Polarization', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Geometric and Physical Optics', { text: 'The lateral shift in a glass slab depends on:', optionA: 'Color of light only', optionB: 'Thickness and angle of incidence', optionC: 'Temperature', optionD: 'Intensity', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Geometric and Physical Optics', { text: 'In a diffraction grating, maxima occur when:', optionA: 'd sinθ = (n+½)λ', optionB: 'd sinθ = nλ', optionC: 'd cosθ = nλ', optionD: 'd sinθ = λ/n', correctOption: 'B', weightage: 2 });
  await createQ('Physics', 'Geometric and Physical Optics', { text: 'Huygens\' principle treats each point on a wavefront as:', optionA: 'An absorber', optionB: 'A source of secondary wavelets', optionC: 'A reflector', optionD: 'A polarizer', correctOption: 'B', weightage: 2 });

  // Waves & Sound: +6×1M
  await createQ('Physics', 'Waves and Sound', { text: 'The relation between wavelength (λ), frequency (f) and velocity (v) is:', optionA: 'v = f/λ', optionB: 'v = fλ', optionC: 'v = λ/f', optionD: 'f = vλ', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Waves and Sound', { text: 'The law of vibration of strings states that frequency is inversely proportional to:', optionA: 'Tension', optionB: 'Length', optionC: 'Density', optionD: 'Amplitude', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Waves and Sound', { text: 'The beat frequency equals the:', optionA: 'Sum of two frequencies', optionB: 'Difference of two frequencies', optionC: 'Product of two frequencies', optionD: 'Average of two frequencies', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Waves and Sound', { text: 'Pressure amplitude of a sound wave determines its:', optionA: 'Pitch', optionB: 'Loudness', optionC: 'Quality', optionD: 'Speed', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Waves and Sound', { text: 'The end correction in a resonance tube is approximately:', optionA: '0.3d', optionB: '0.6r', optionC: '0.3r', optionD: '0.6d', correctOption: 'A', weightage: 1 });
  await createQ('Physics', 'Waves and Sound', { text: 'In the Doppler effect, when the observer moves toward the source:', optionA: 'Frequency decreases', optionB: 'Frequency increases', optionC: 'Wavelength increases', optionD: 'Speed of sound changes', correctOption: 'B', weightage: 1 });

  // E&M: +6×1M
  await createQ('Physics', 'Electricity & Magnetism', { text: 'Coulomb\'s law force between two charges is proportional to:', optionA: 'r', optionB: '1/r²', optionC: 'r²', optionD: '1/r', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Electricity & Magnetism', { text: 'Gauss\'s law relates electric flux to:', optionA: 'Magnetic flux', optionB: 'Enclosed charge', optionC: 'Current', optionD: 'Voltage', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Electricity & Magnetism', { text: 'The Seebeck effect produces:', optionA: 'Magnetic field', optionB: 'EMF due to temperature difference', optionC: 'Electric current from light', optionD: 'Mechanical energy', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Electricity & Magnetism', { text: 'The torque on a current-carrying coil in a magnetic field depends on:', optionA: 'Resistance', optionB: 'Area, current, and magnetic field', optionC: 'Voltage only', optionD: 'Temperature', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Electricity & Magnetism', { text: 'A diamagnetic substance is:', optionA: 'Strongly attracted by magnet', optionB: 'Weakly repelled by magnet', optionC: 'Strongly repelled', optionD: 'Not affected', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Electricity & Magnetism', { text: 'Joule\'s law of heating states H = I²Rt. If current doubles, heat becomes:', optionA: 'Double', optionB: 'Four times', optionC: 'Half', optionD: 'Same', correctOption: 'B', weightage: 1 });

  // Modern Physics: +6×1M
  await createQ('Physics', 'Modern Physics', { text: 'The work function in photoelectric effect is the:', optionA: 'Maximum kinetic energy', optionB: 'Minimum energy to eject electron', optionC: 'Total energy of photon', optionD: 'Stopping potential', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Modern Physics', { text: 'In Bohr\'s model, the radius of the nth orbit is proportional to:', optionA: 'n', optionB: 'n²', optionC: 'n³', optionD: '1/n', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Modern Physics', { text: 'A Zener diode is used as a:', optionA: 'Amplifier', optionB: 'Voltage regulator', optionC: 'Oscillator', optionD: 'Switch', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Modern Physics', { text: 'The output of an OR gate when both inputs are 0 is:', optionA: '1', optionB: '0', optionC: 'Undefined', optionD: 'High impedance', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Modern Physics', { text: 'Bragg\'s law 2d sinθ = nλ is used to study:', optionA: 'Chemical reactions', optionB: 'Crystal structure', optionC: 'Nuclear decay', optionD: 'Photoelectric effect', correctOption: 'B', weightage: 1 });
  await createQ('Physics', 'Modern Physics', { text: 'The uncertainty principle states ΔxΔp ≥:', optionA: 'h', optionB: 'ℏ/2', optionC: '2h', optionD: 'h/4π', correctOption: 'B', weightage: 1 });

  console.log('✅ Physics: 61×1M + 69×2M = 150 Qs in bank');

  // ════════════════════════════════════════════════════════════════════
  //  MATHEMATICS  —  20 × 1M + 15 × 2M = 50 marks
  //  Set/Logic/Functions → 1M only (3 Qs), Algebra → 2M only (5 Qs),
  //  Trigonometry → 1M only (5 Qs), Coord Geo → 2M only (5 Qs),
  //  Calculus → 2M only (5 Qs), Vectors → 1M only (5 Qs),
  //  Stats & Prob → 1M only (7 Qs)
  // ════════════════════════════════════════════════════════════════════

  // Set, Logic and Functions: 3×1M = 3 marks (1M only)
  await createQ('Mathematics', 'Set, Logic and Functions', { text: 'If A = {1, 2, 3} and B = {2, 3, 4}, then A ∩ B is:', optionA: '{1, 2, 3, 4}', optionB: '{2, 3}', optionC: '{1, 4}', optionD: '{1}', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Set, Logic and Functions', { text: 'Which of the following is not a rational number?', optionA: '22/7', optionB: '√4', optionC: '√2', optionD: '0.5', correctOption: 'C', weightage: 1 });
  await createQ('Mathematics', 'Set, Logic and Functions', { text: 'If f(x) = 2x + 3 and g(x) = x², then f(g(2)) equals:', optionA: '7', optionB: '11', optionC: '14', optionD: '49', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Set, Logic and Functions', { text: 'The number of subsets of a set with 3 elements is:', optionA: '3', optionB: '6', optionC: '8', optionD: '9', correctOption: 'C', weightage: 1 });
  await createQ('Mathematics', 'Set, Logic and Functions', { text: 'If A has 10 elements and B has 7 elements with 4 common, then n(A ∪ B) is:', optionA: '17', optionB: '13', optionC: '21', optionD: '10', correctOption: 'B', weightage: 1 });

  // Algebra: 5×2M = 10 marks (2M only)
  await createQ('Mathematics', 'Algebra', { text: 'The roots of x² - 5x + 6 = 0 are:', optionA: '1 and 6', optionB: '2 and 3', optionC: '-2 and -3', optionD: '1 and 5', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Algebra', { text: 'The number of permutations of 3 objects from 5 is:', optionA: '15', optionB: '60', optionC: '10', optionD: '120', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Algebra', { text: 'The sum of the first 20 terms of the arithmetic series 1 + 3 + 5 + ... is:', optionA: '200', optionB: '400', optionC: '300', optionD: '100', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Algebra', { text: 'The modulus of the complex number 3 + 4i is:', optionA: '7', optionB: '5', optionC: '1', optionD: '25', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Algebra', { text: 'If ⁸C₃ = 56, then ⁸C₅ equals:', optionA: '28', optionB: '56', optionC: '70', optionD: '336', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Algebra', { text: 'The 5th term of the G.P. 2, 6, 18, ... is:', optionA: '54', optionB: '162', optionC: '486', optionD: '1458', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Algebra', { text: 'If log₁₀(x) + log₁₀(x²) = 3, then x equals:', optionA: '10', optionB: '100', optionC: '1000', optionD: '√10', correctOption: 'A', weightage: 2 });

  // Trigonometry: 5×1M = 5 marks (1M only)
  await createQ('Mathematics', 'Trigonometry', { text: 'The value of sin(90°) is:', optionA: '0', optionB: '1', optionC: '-1', optionD: '1/2', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Trigonometry', { text: 'The period of sin(x) is:', optionA: 'π', optionB: '2π', optionC: 'π/2', optionD: '4π', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Trigonometry', { text: 'The principal value of sin⁻¹(1) is:', optionA: '0', optionB: 'π/2', optionC: 'π', optionD: '2π', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Trigonometry', { text: 'The value of cos(0°) is:', optionA: '0', optionB: '1', optionC: '-1', optionD: '1/2', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Trigonometry', { text: 'tan(45°) equals:', optionA: '0', optionB: '1', optionC: '√2', optionD: '1/√2', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Trigonometry', { text: 'The value of sin²θ + cos²θ is:', optionA: '0', optionB: '1', optionC: '2', optionD: 'sinθ', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Trigonometry', { text: 'sin(30°) equals:', optionA: '1', optionB: '1/2', optionC: '√3/2', optionD: '0', correctOption: 'B', weightage: 1 });

  // Coordinate Geometry: 5×2M = 10 marks (2M only)
  await createQ('Mathematics', 'Coordinate Geometry', { text: 'Find the equation of the line passing through (1,2) and (3,6):', optionA: 'y = 2x', optionB: 'y = x + 1', optionC: 'y = 3x - 1', optionD: 'y = 2x + 1', correctOption: 'A', weightage: 2 });
  await createQ('Mathematics', 'Coordinate Geometry', { text: 'The eccentricity of the ellipse x²/25 + y²/16 = 1 is:', optionA: '3/5', optionB: '4/5', optionC: '5/3', optionD: '1/5', correctOption: 'A', weightage: 2 });
  await createQ('Mathematics', 'Coordinate Geometry', { text: 'The distance between points (1,2) and (4,6) is:', optionA: '7', optionB: '5', optionC: '25', optionD: '3', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Coordinate Geometry', { text: 'The centre of the circle x² + y² - 4x + 6y - 12 = 0 is:', optionA: '(2, -3)', optionB: '(-2, 3)', optionC: '(4, -6)', optionD: '(-4, 6)', correctOption: 'A', weightage: 2 });
  await createQ('Mathematics', 'Coordinate Geometry', { text: 'The slope of a line perpendicular to y = 3x + 2 is:', optionA: '3', optionB: '-3', optionC: '-1/3', optionD: '1/3', correctOption: 'C', weightage: 2 });
  await createQ('Mathematics', 'Coordinate Geometry', { text: 'The equation of a parabola with vertex at origin and focus at (0,3) is:', optionA: 'x² = 12y', optionB: 'y² = 12x', optionC: 'x² = 3y', optionD: 'y² = 3x', correctOption: 'A', weightage: 2 });
  await createQ('Mathematics', 'Coordinate Geometry', { text: 'The length of the latus rectum of the parabola y² = 8x is:', optionA: '4', optionB: '8', optionC: '2', optionD: '16', correctOption: 'B', weightage: 2 });

  // Calculus: 5×2M = 10 marks (2M only)
  await createQ('Mathematics', 'Calculus', { text: 'Evaluate: lim(x→0) (sin x)/x', optionA: '0', optionB: '1', optionC: '∞', optionD: 'Does not exist', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Calculus', { text: 'If f(x) = 3x² + 2x - 1, find f\'(x) at x=1:', optionA: '6', optionB: '8', optionC: '4', optionD: '10', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Calculus', { text: 'The area of the region bounded by y = x², x-axis, x=0 and x=2 is:', optionA: '4/3', optionB: '8/3', optionC: '2', optionD: '4', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Calculus', { text: '∫₀¹ 2x dx equals:', optionA: '0', optionB: '1', optionC: '2', optionD: '1/2', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Calculus', { text: 'The derivative of sin(2x) is:', optionA: 'cos(2x)', optionB: '2cos(2x)', optionC: '-2cos(2x)', optionD: '2sin(2x)', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Calculus', { text: 'If y = ln(x²), then dy/dx is:', optionA: '1/x²', optionB: '2/x', optionC: '2x', optionD: '1/x', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Calculus', { text: 'The value of ∫₁² (1/x) dx is:', optionA: '1', optionB: 'ln2', optionC: '2', optionD: '1/2', correctOption: 'B', weightage: 2 });

  // Vectors and their Products: 5×1M = 5 marks (1M only)
  await createQ('Mathematics', 'Vectors and their Products', { text: 'The dot product of two perpendicular vectors is:', optionA: '1', optionB: '0', optionC: '-1', optionD: 'Undefined', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Vectors and their Products', { text: 'If a⃗ = 2î + 3ĵ, the magnitude of a⃗ is:', optionA: '5', optionB: '√13', optionC: '√5', optionD: '13', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Vectors and their Products', { text: 'The cross product of two parallel vectors is:', optionA: '1', optionB: '0', optionC: '-1', optionD: 'The zero vector', correctOption: 'D', weightage: 1 });
  await createQ('Mathematics', 'Vectors and their Products', { text: 'A unit vector has magnitude:', optionA: '0', optionB: '1', optionC: '2', optionD: 'Infinity', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Vectors and their Products', { text: 'The angle between î and ĵ is:', optionA: '0°', optionB: '90°', optionC: '180°', optionD: '45°', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Vectors and their Products', { text: 'The scalar triple product of coplanar vectors is:', optionA: '1', optionB: '0', optionC: '-1', optionD: 'Undefined', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Vectors and their Products', { text: 'If a⃗ · b⃗ = |a⃗||b⃗|, the angle between them is:', optionA: '90°', optionB: '0°', optionC: '180°', optionD: '45°', correctOption: 'B', weightage: 1 });

  // Statistics and Probability: 7×1M = 7 marks (1M only)
  await createQ('Mathematics', 'Statistics and Probability', { text: 'The mean of the first 10 natural numbers is:', optionA: '5', optionB: '5.5', optionC: '10', optionD: '55', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Statistics and Probability', { text: 'If P(A) = 0.3 and P(B) = 0.4 and A, B are independent, then P(A ∩ B) is:', optionA: '0.7', optionB: '0.12', optionC: '0.1', optionD: '0.3', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Statistics and Probability', { text: 'The probability of getting a head in a single coin toss is:', optionA: '1', optionB: '1/2', optionC: '1/4', optionD: '0', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Statistics and Probability', { text: 'The median of the data 3, 7, 2, 8, 5 is:', optionA: '5', optionB: '7', optionC: '3', optionD: '2', correctOption: 'A', weightage: 1 });
  await createQ('Mathematics', 'Statistics and Probability', { text: 'P(A) + P(A\') equals:', optionA: '0', optionB: '1', optionC: '2', optionD: 'P(A)', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Statistics and Probability', { text: 'The mode of the data 2, 3, 5, 3, 7, 3, 8 is:', optionA: '2', optionB: '3', optionC: '5', optionD: '7', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Statistics and Probability', { text: 'If all values in a data set are equal, the variance is:', optionA: '1', optionB: '0', optionC: 'Mean', optionD: 'Undefined', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Statistics and Probability', { text: 'The range of the data 4, 8, 12, 16, 20 is:', optionA: '4', optionB: '16', optionC: '12', optionD: '20', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Statistics and Probability', { text: 'The number of ways to arrange 3 books on a shelf is:', optionA: '3', optionB: '6', optionC: '9', optionD: '27', correctOption: 'B', weightage: 1 });

  // ── Additional Mathematics Questions ──

  // Set, Logic and Functions: +6×1M
  await createQ('Mathematics', 'Set, Logic and Functions', { text: 'If f(x) = x² - 4x + 3, then f(1) equals:', optionA: '-1', optionB: '0', optionC: '1', optionD: '3', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Set, Logic and Functions', { text: 'The contrapositive of "If p then q" is:', optionA: 'If q then p', optionB: 'If not q then not p', optionC: 'If not p then not q', optionD: 'If p then not q', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Set, Logic and Functions', { text: 'If A ⊂ B, then A ∩ B equals:', optionA: 'A', optionB: 'B', optionC: 'A ∪ B', optionD: '∅', correctOption: 'A', weightage: 1 });
  await createQ('Mathematics', 'Set, Logic and Functions', { text: 'The domain of f(x) = √(x - 2) is:', optionA: 'x ≥ 0', optionB: 'x ≥ 2', optionC: 'x > 2', optionD: 'All real numbers', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Set, Logic and Functions', { text: 'If n(A) = 15, n(B) = 12, n(A ∩ B) = 5, then n(A ∪ B) is:', optionA: '27', optionB: '22', optionC: '20', optionD: '17', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Set, Logic and Functions', { text: 'The range of f(x) = |x| is:', optionA: 'All real numbers', optionB: '[0, ∞)', optionC: '(0, ∞)', optionD: '(-∞, 0]', correctOption: 'B', weightage: 1 });

  // Algebra: +8×2M
  await createQ('Mathematics', 'Algebra', { text: 'The determinant of the matrix [[2,3],[4,5]] is:', optionA: '-2', optionB: '2', optionC: '10', optionD: '22', correctOption: 'A', weightage: 2 });
  await createQ('Mathematics', 'Algebra', { text: 'The number of ways to select 3 items from 7 is:', optionA: '21', optionB: '35', optionC: '42', optionD: '210', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Algebra', { text: 'The sum of the infinite G.P. 1 + 1/2 + 1/4 + ... is:', optionA: '1', optionB: '2', optionC: '4', optionD: '∞', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Algebra', { text: 'If z = 1 + i, then |z²| equals:', optionA: '1', optionB: '2', optionC: '√2', optionD: '4', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Algebra', { text: 'The coefficient of x² in (1 + x)⁵ is:', optionA: '5', optionB: '10', optionC: '20', optionD: '1', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Algebra', { text: 'If A = [[1,0],[0,1]], then A² is:', optionA: '[[2,0],[0,2]]', optionB: '[[1,0],[0,1]]', optionC: '[[0,0],[0,0]]', optionD: '[[1,1],[1,1]]', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Algebra', { text: 'The sum of the first n natural numbers is:', optionA: 'n(n-1)/2', optionB: 'n(n+1)/2', optionC: 'n²/2', optionD: '(n+1)²/2', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Algebra', { text: 'The argument of the complex number -1 + i is:', optionA: 'π/4', optionB: '3π/4', optionC: '-π/4', optionD: '-3π/4', correctOption: 'B', weightage: 2 });

  // Trigonometry: +6×1M
  await createQ('Mathematics', 'Trigonometry', { text: 'The value of cos(60°) is:', optionA: '0', optionB: '1/2', optionC: '√3/2', optionD: '1', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Trigonometry', { text: 'If sinA = 3/5, then cosA is (A is acute):', optionA: '3/5', optionB: '4/5', optionC: '5/3', optionD: '5/4', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Trigonometry', { text: 'The general solution of sin(x) = 0 is:', optionA: 'nπ', optionB: '(2n+1)π/2', optionC: '2nπ', optionD: 'nπ/2', correctOption: 'A', weightage: 1 });
  await createQ('Mathematics', 'Trigonometry', { text: 'sec²θ - tan²θ equals:', optionA: '0', optionB: '1', optionC: '2', optionD: 'sin²θ', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Trigonometry', { text: 'The range of sin(x) is:', optionA: '[0, 1]', optionB: '[-1, 1]', optionC: '(-∞, ∞)', optionD: '[0, ∞)', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Trigonometry', { text: 'sin(A + B) = sinA·cosB + cosA·sinB is called:', optionA: 'Pythagorean identity', optionB: 'Addition formula', optionC: 'Double angle formula', optionD: 'Half angle formula', correctOption: 'B', weightage: 1 });

  // Coordinate Geometry: +8×2M
  await createQ('Mathematics', 'Coordinate Geometry', { text: 'The distance from point (3,4) to the line 3x + 4y - 5 = 0 is:', optionA: '3', optionB: '4', optionC: '5', optionD: '20', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Coordinate Geometry', { text: 'The equation of a circle with centre (2,3) and radius 5 is:', optionA: '(x-2)²+(y-3)²=25', optionB: '(x+2)²+(y+3)²=25', optionC: '(x-2)²+(y-3)²=5', optionD: 'x²+y²=25', correctOption: 'A', weightage: 2 });
  await createQ('Mathematics', 'Coordinate Geometry', { text: 'The focus of the parabola x² = 16y is at:', optionA: '(4, 0)', optionB: '(0, 4)', optionC: '(0, -4)', optionD: '(-4, 0)', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Coordinate Geometry', { text: 'The midpoint of the line segment joining (2,4) and (6,8) is:', optionA: '(4, 6)', optionB: '(8, 12)', optionC: '(2, 2)', optionD: '(3, 5)', correctOption: 'A', weightage: 2 });
  await createQ('Mathematics', 'Coordinate Geometry', { text: 'The equation of a line with slope 2 and y-intercept 3 is:', optionA: 'y = 2x + 3', optionB: 'y = 3x + 2', optionC: '2x + 3y = 0', optionD: 'y = 2x - 3', correctOption: 'A', weightage: 2 });
  await createQ('Mathematics', 'Coordinate Geometry', { text: 'The area of the triangle with vertices (0,0), (4,0), (0,3) is:', optionA: '6', optionB: '12', optionC: '7', optionD: '24', correctOption: 'A', weightage: 2 });
  await createQ('Mathematics', 'Coordinate Geometry', { text: 'The radius of the circle x² + y² - 6x + 8y - 11 = 0 is:', optionA: '6', optionB: '36', optionC: '√11', optionD: '5', correctOption: 'A', weightage: 2 });
  await createQ('Mathematics', 'Coordinate Geometry', { text: 'The length of the perpendicular from the origin to the line 3x + 4y = 10 is:', optionA: '2', optionB: '10', optionC: '5', optionD: '7', correctOption: 'A', weightage: 2 });

  // Calculus: +8×2M
  await createQ('Mathematics', 'Calculus', { text: 'The derivative of eˣ is:', optionA: 'xeˣ⁻¹', optionB: 'eˣ', optionC: 'eˣ/x', optionD: 'xe', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Calculus', { text: '∫ cos(x) dx equals:', optionA: 'sin(x) + C', optionB: '-sin(x) + C', optionC: 'cos(x) + C', optionD: '-cos(x) + C', correctOption: 'A', weightage: 2 });
  await createQ('Mathematics', 'Calculus', { text: 'If f(x) = x³ - 3x, the critical points are at x =:', optionA: '0', optionB: '±1', optionC: '±3', optionD: '±√3', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Calculus', { text: 'The order of the differential equation d²y/dx² + 3(dy/dx) + 2y = 0 is:', optionA: '1', optionB: '2', optionC: '3', optionD: '0', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Calculus', { text: 'lim(x→∞) (1 + 1/x)ˣ equals:', optionA: '1', optionB: '∞', optionC: '0', optionD: 'e', correctOption: 'D', weightage: 2 });
  await createQ('Mathematics', 'Calculus', { text: '∫₀^π sin(x) dx equals:', optionA: '0', optionB: '2', optionC: 'π', optionD: '1', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Calculus', { text: 'The derivative of tan(x) is:', optionA: 'cot(x)', optionB: 'sec²(x)', optionC: '-cot²(x)', optionD: 'cos²(x)', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Calculus', { text: 'The solution of dy/dx = y is:', optionA: 'y = eˣ + C', optionB: 'y = Ceˣ', optionC: 'y = x + C', optionD: 'y = e⁻ˣ', correctOption: 'B', weightage: 2 });

  // Vectors and their Products: +6×1M
  await createQ('Mathematics', 'Vectors and their Products', { text: 'If a⃗ = î + 2ĵ + 3k̂, the magnitude of a⃗ is:', optionA: '6', optionB: '√14', optionC: '14', optionD: '√6', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Vectors and their Products', { text: 'The dot product of î and k̂ is:', optionA: '1', optionB: '0', optionC: '-1', optionD: 'î', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Vectors and their Products', { text: 'The projection of a⃗ on b⃗ is:', optionA: '(a⃗ · b⃗)/|b⃗|', optionB: '(a⃗ × b⃗)/|b⃗|', optionC: '|a⃗||b⃗|', optionD: 'a⃗ · b⃗', correctOption: 'A', weightage: 1 });
  await createQ('Mathematics', 'Vectors and their Products', { text: 'Two vectors are orthogonal if their dot product is:', optionA: '1', optionB: '0', optionC: '-1', optionD: 'Maximum', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Vectors and their Products', { text: 'The position vector of the midpoint of vectors a⃗ and b⃗ is:', optionA: 'a⃗ + b⃗', optionB: '(a⃗ + b⃗)/2', optionC: 'a⃗ - b⃗', optionD: '(a⃗ - b⃗)/2', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Vectors and their Products', { text: 'If a⃗ × b⃗ = 0⃗ and a⃗ ≠ 0⃗, b⃗ ≠ 0⃗, then the vectors are:', optionA: 'Perpendicular', optionB: 'Parallel', optionC: 'Equal', optionD: 'Opposite', correctOption: 'B', weightage: 1 });

  // Statistics and Probability: +6×1M
  await createQ('Mathematics', 'Statistics and Probability', { text: 'The standard deviation is the square root of:', optionA: 'Mean', optionB: 'Median', optionC: 'Variance', optionD: 'Mode', correctOption: 'C', weightage: 1 });
  await createQ('Mathematics', 'Statistics and Probability', { text: 'If P(A) = 0.6, then P(A\') is:', optionA: '0.6', optionB: '0.4', optionC: '1.0', optionD: '0.0', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Statistics and Probability', { text: 'The probability of getting at least one head in two coin tosses is:', optionA: '1/2', optionB: '1/4', optionC: '3/4', optionD: '1', correctOption: 'C', weightage: 1 });
  await createQ('Mathematics', 'Statistics and Probability', { text: 'The correlation coefficient r always lies between:', optionA: '0 and 1', optionB: '-1 and 1', optionC: '-∞ and ∞', optionD: '0 and ∞', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Statistics and Probability', { text: 'In a binomial distribution, the mean is:', optionA: 'np', optionB: 'npq', optionC: '√(npq)', optionD: 'n/p', correctOption: 'A', weightage: 1 });
  await createQ('Mathematics', 'Statistics and Probability', { text: 'For a normal distribution, approximately what percentage of data falls within one standard deviation of the mean?', optionA: '50%', optionB: '68%', optionC: '95%', optionD: '99.7%', correctOption: 'B', weightage: 1 });

  // ── Batch 3: More Mathematics Questions ──

  // Set, Logic and Functions: +6×1M
  await createQ('Mathematics', 'Set, Logic and Functions', { text: 'The power set of {a, b} is:', optionA: '{{a}, {b}}', optionB: '{∅, {a}, {b}, {a,b}}', optionC: '{{a,b}}', optionD: '{a, b, {a,b}}', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Set, Logic and Functions', { text: 'The negation of "All birds can fly" is:', optionA: 'No birds can fly', optionB: 'Some birds cannot fly', optionC: 'All birds cannot fly', optionD: 'Some birds can fly', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Set, Logic and Functions', { text: 'If f(x) = 1/(x-1), then f is undefined at x =:', optionA: '0', optionB: '1', optionC: '-1', optionD: '2', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Set, Logic and Functions', { text: 'A function f: A→B is bijective if it is:', optionA: 'Injective only', optionB: 'Surjective only', optionC: 'Both injective and surjective', optionD: 'Neither', correctOption: 'C', weightage: 1 });
  await createQ('Mathematics', 'Set, Logic and Functions', { text: 'De Morgan\'s law states that (A ∪ B)\' equals:', optionA: 'A\' ∪ B\'', optionB: 'A\' ∩ B\'', optionC: 'A ∩ B', optionD: 'A ∪ B', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Set, Logic and Functions', { text: 'The inverse of f(x) = 3x + 5 is:', optionA: '(x+5)/3', optionB: '(x-5)/3', optionC: '3x - 5', optionD: '(5-x)/3', correctOption: 'B', weightage: 1 });

  // Algebra: +8×2M
  await createQ('Mathematics', 'Algebra', { text: 'If A is a 3×3 matrix with det(A) = 5, then det(2A) equals:', optionA: '10', optionB: '40', optionC: '20', optionD: '80', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Algebra', { text: 'The 10th term of the A.P. 2, 5, 8, ... is:', optionA: '26', optionB: '29', optionC: '32', optionD: '35', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Algebra', { text: 'The cube roots of unity sum to:', optionA: '1', optionB: '0', optionC: '-1', optionD: '3', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Algebra', { text: 'How many diagonals does a hexagon have?', optionA: '6', optionB: '9', optionC: '12', optionD: '15', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Algebra', { text: 'The inverse of the matrix [[1,2],[3,4]] has determinant:', optionA: '2', optionB: '-1/2', optionC: '1/2', optionD: '-2', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Algebra', { text: 'The middle term of (x + y)⁶ is:', optionA: '15x³y³', optionB: '20x³y³', optionC: '6x³y³', optionD: '10x³y³', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Algebra', { text: 'If the product of roots of x² + kx + 12 = 0 is 12, the sum of roots when k=7 is:', optionA: '7', optionB: '-7', optionC: '12', optionD: '-12', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Algebra', { text: 'The sum 1 + 2 + 4 + 8 + ... + 512 equals:', optionA: '511', optionB: '1023', optionC: '512', optionD: '1024', correctOption: 'B', weightage: 2 });

  // Trigonometry: +6×1M
  await createQ('Mathematics', 'Trigonometry', { text: 'sin(2A) is equal to:', optionA: '2sinA', optionB: '2sinAcosA', optionC: 'sin²A + cos²A', optionD: 'cos(2A)', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Trigonometry', { text: 'The value of tan(60°) is:', optionA: '1', optionB: '√3', optionC: '1/√3', optionD: '2', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Trigonometry', { text: 'The principal value of cos⁻¹(-1) is:', optionA: '0', optionB: 'π', optionC: 'π/2', optionD: '2π', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Trigonometry', { text: 'In a triangle, if a/sinA = b/sinB, this is called:', optionA: 'Cosine rule', optionB: 'Sine rule', optionC: 'Tangent rule', optionD: 'Pythagoras theorem', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Trigonometry', { text: 'cos(π - θ) equals:', optionA: 'cosθ', optionB: '-cosθ', optionC: 'sinθ', optionD: '-sinθ', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Trigonometry', { text: '1 + tan²θ equals:', optionA: 'cos²θ', optionB: 'sec²θ', optionC: 'sin²θ', optionD: 'csc²θ', correctOption: 'B', weightage: 1 });

  // Coordinate Geometry: +8×2M
  await createQ('Mathematics', 'Coordinate Geometry', { text: 'The angle between the lines y = x and y = -x is:', optionA: '45°', optionB: '90°', optionC: '60°', optionD: '180°', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Coordinate Geometry', { text: 'The pair of lines represented by x² - y² = 0 are:', optionA: 'Parallel', optionB: 'Perpendicular', optionC: 'Coincident', optionD: 'Intersecting at 45°', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Coordinate Geometry', { text: 'The equation x² + y² + 2gx + 2fy + c = 0 represents a circle with radius:', optionA: '√(g² + f² + c)', optionB: '√(g² + f² - c)', optionC: 'g² + f² - c', optionD: '√(g + f - c)', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Coordinate Geometry', { text: 'The vertex of the parabola y² = 4ax is at:', optionA: '(a, 0)', optionB: '(0, 0)', optionC: '(0, a)', optionD: '(-a, 0)', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Coordinate Geometry', { text: 'The eccentricity of a circle is:', optionA: '1', optionB: '0', optionC: '> 1', optionD: '< 0', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Coordinate Geometry', { text: 'The intercept form of a line is x/a + y/b = 1. If a=3 and b=4, the line passes through:', optionA: '(3, 0) and (0, 4)', optionB: '(0, 3) and (4, 0)', optionC: '(3, 4)', optionD: 'Origin', correctOption: 'A', weightage: 2 });
  await createQ('Mathematics', 'Coordinate Geometry', { text: 'For the hyperbola x²/a² - y²/b² = 1, the eccentricity e satisfies:', optionA: 'e = 1', optionB: 'e > 1', optionC: '0 < e < 1', optionD: 'e = 0', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Coordinate Geometry', { text: 'The equation of the plane passing through (1,2,3) with normal vector (1,1,1) is:', optionA: 'x + y + z = 6', optionB: 'x + y + z = 3', optionC: 'x + y + z = 0', optionD: 'x + y + z = 1', correctOption: 'A', weightage: 2 });

  // Calculus: +8×2M
  await createQ('Mathematics', 'Calculus', { text: 'lim(x→0) (eˣ - 1)/x equals:', optionA: '0', optionB: '1', optionC: 'e', optionD: '∞', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Calculus', { text: 'The derivative of ln(sinx) is:', optionA: '1/sinx', optionB: 'cotx', optionC: 'tanx', optionD: '-cotx', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Calculus', { text: '∫ 1/x dx equals:', optionA: 'x', optionB: 'ln|x| + C', optionC: '1/x² + C', optionD: 'x ln x + C', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Calculus', { text: 'The function f(x) = x³ - 3x has a local minimum at:', optionA: 'x = 0', optionB: 'x = 1', optionC: 'x = -1', optionD: 'x = 3', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Calculus', { text: 'The degree of the differential equation (dy/dx)³ + y² = 0 is:', optionA: '1', optionB: '2', optionC: '3', optionD: '0', correctOption: 'C', weightage: 2 });
  await createQ('Mathematics', 'Calculus', { text: '∫₁³ 2x dx equals:', optionA: '4', optionB: '8', optionC: '6', optionD: '10', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Calculus', { text: 'If y = x⁴, then d²y/dx² is:', optionA: '4x³', optionB: '12x²', optionC: '24x', optionD: '4x', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Calculus', { text: 'The area between y = x² and y = x from x=0 to x=1 is:', optionA: '1/3', optionB: '1/6', optionC: '1/2', optionD: '1/4', correctOption: 'B', weightage: 2 });

  // Vectors: +6×1M
  await createQ('Mathematics', 'Vectors and their Products', { text: 'The cross product of two vectors gives:', optionA: 'A scalar', optionB: 'A vector', optionC: 'Zero', optionD: 'A matrix', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Vectors and their Products', { text: 'If a⃗ = 3î - ĵ + 2k̂ and b⃗ = î + ĵ - k̂, then a⃗ · b⃗ is:', optionA: '4', optionB: '0', optionC: '2', optionD: '-2', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Vectors and their Products', { text: 'The area of a parallelogram with sides a⃗ and b⃗ is:', optionA: 'a⃗ · b⃗', optionB: '|a⃗ × b⃗|', optionC: 'a⃗ + b⃗', optionD: '|a⃗ · b⃗|', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Vectors and their Products', { text: 'Three vectors are coplanar if their scalar triple product is:', optionA: '1', optionB: '0', optionC: '-1', optionD: 'Undefined', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Vectors and their Products', { text: 'The work done by a force F⃗ in displacement d⃗ is:', optionA: 'F⃗ × d⃗', optionB: 'F⃗ · d⃗', optionC: '|F⃗| + |d⃗|', optionD: '|F⃗| × |d⃗|', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Vectors and their Products', { text: 'Direction cosines l, m, n satisfy l² + m² + n² =:', optionA: '0', optionB: '1', optionC: '3', optionD: '-1', correctOption: 'B', weightage: 1 });

  // Stats & Probability: +6×1M
  await createQ('Mathematics', 'Statistics and Probability', { text: 'Bayes\' theorem relates:', optionA: 'Mean and variance', optionB: 'Prior and posterior probabilities', optionC: 'Correlation and regression', optionD: 'Median and mode', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Statistics and Probability', { text: 'The coefficient of variation is defined as:', optionA: 'Mean/Standard deviation × 100', optionB: 'Standard deviation/Mean × 100', optionC: 'Variance/Mean', optionD: 'Mean/Variance', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Statistics and Probability', { text: 'If two events are mutually exclusive, P(A ∩ B) is:', optionA: 'P(A) × P(B)', optionB: '0', optionC: 'P(A) + P(B)', optionD: '1', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Statistics and Probability', { text: 'The regression line of y on x passes through:', optionA: 'Origin', optionB: '(x̄, ȳ)', optionC: '(0, ȳ)', optionD: '(x̄, 0)', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Statistics and Probability', { text: 'The variance of a binomial distribution is:', optionA: 'np', optionB: 'npq', optionC: 'np²', optionD: 'n²pq', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Statistics and Probability', { text: 'The probability of an impossible event is:', optionA: '1', optionB: '0', optionC: '-1', optionD: '0.5', correctOption: 'B', weightage: 1 });

  // ── Batch 4: More Mathematics Questions ──

  // Set, Logic and Functions: +6×1M
  await createQ('Mathematics', 'Set, Logic and Functions', { text: 'If f(x) = eˣ, then f⁻¹(x) is:', optionA: 'eˣ', optionB: 'ln(x)', optionC: '1/eˣ', optionD: 'x', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Set, Logic and Functions', { text: 'The truth value of "p ∧ ~p" is always:', optionA: 'True', optionB: 'False', optionC: 'Depends on p', optionD: 'Undefined', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Set, Logic and Functions', { text: 'If |x - 3| < 2, the solution is:', optionA: 'x < 5', optionB: '1 < x < 5', optionC: 'x > 1', optionD: '3 < x < 5', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Set, Logic and Functions', { text: 'The function f(x) = x² is:', optionA: 'One-to-one', optionB: 'Even', optionC: 'Odd', optionD: 'Neither even nor odd', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Set, Logic and Functions', { text: 'A ∪ ∅ equals:', optionA: '∅', optionB: 'A', optionC: 'Universal set', optionD: 'A\'', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Set, Logic and Functions', { text: 'The logical equivalence of ~(p → q) is:', optionA: 'p ∨ q', optionB: 'p ∧ ~q', optionC: '~p ∧ q', optionD: '~p ∨ ~q', correctOption: 'B', weightage: 1 });

  // Algebra: +8×2M
  await createQ('Mathematics', 'Algebra', { text: 'The rank of a 3×3 identity matrix is:', optionA: '1', optionB: '3', optionC: '0', optionD: '9', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Algebra', { text: 'The general term of the expansion (1+x)ⁿ is:', optionA: 'ⁿCᵣ xⁿ', optionB: 'ⁿCᵣ xʳ', optionC: 'ⁿPᵣ xʳ', optionD: 'rⁿ xʳ', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Algebra', { text: 'The sum of first 100 natural numbers is:', optionA: '4950', optionB: '5050', optionC: '5150', optionD: '10000', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Algebra', { text: 'If ω is a cube root of unity, then 1 + ω + ω² equals:', optionA: '1', optionB: '0', optionC: '-1', optionD: '3', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Algebra', { text: 'How many words can be formed using all letters of NEPAL?', optionA: '60', optionB: '120', optionC: '24', optionD: '720', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Algebra', { text: 'The transpose of a symmetric matrix A is:', optionA: '-A', optionB: 'A', optionC: 'A⁻¹', optionD: '0', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Algebra', { text: 'The discriminant of ax² + bx + c = 0 is:', optionA: 'b² + 4ac', optionB: 'b² - 4ac', optionC: '4ac - b²', optionD: '(a-c)²', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Algebra', { text: 'The common ratio of G.P. 4, 12, 36, ... is:', optionA: '2', optionB: '3', optionC: '4', optionD: '8', correctOption: 'B', weightage: 2 });

  // Trigonometry: +6×1M
  await createQ('Mathematics', 'Trigonometry', { text: 'cos(2A) can be written as:', optionA: '2cosA', optionB: '2cos²A - 1', optionC: '1 - 2sinA', optionD: 'cosA - sinA', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Trigonometry', { text: 'The general solution of cosθ = 0 is:', optionA: 'nπ', optionB: '(2n+1)π/2', optionC: '2nπ', optionD: 'nπ/4', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Trigonometry', { text: 'In a triangle, a² = b² + c² - 2bc·cosA is called the:', optionA: 'Sine rule', optionB: 'Cosine rule', optionC: 'Tangent rule', optionD: 'Projection rule', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Trigonometry', { text: 'tan⁻¹(1) equals:', optionA: '0', optionB: 'π/4', optionC: 'π/2', optionD: 'π', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Trigonometry', { text: 'The circumradius R of a triangle with sides a and angle A: a/sinA equals:', optionA: 'R', optionB: '2R', optionC: 'R/2', optionD: '4R', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Trigonometry', { text: 'sin(A-B) = sinAcosB - cosAsinB is the:', optionA: 'Double angle formula', optionB: 'Subtraction formula', optionC: 'Product formula', optionD: 'Half angle formula', correctOption: 'B', weightage: 1 });

  // Coordinate Geometry: +8×2M
  await createQ('Mathematics', 'Coordinate Geometry', { text: 'Two lines with slopes m₁ and m₂ are perpendicular if:', optionA: 'm₁ = m₂', optionB: 'm₁m₂ = -1', optionC: 'm₁ + m₂ = 0', optionD: 'm₁m₂ = 1', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Coordinate Geometry', { text: 'The directrix of the parabola y² = 4ax is:', optionA: 'x = a', optionB: 'x = -a', optionC: 'y = a', optionD: 'y = -a', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Coordinate Geometry', { text: 'The condition for the line y = mx + c to be tangent to circle x²+y²=a² is:', optionA: 'c = a', optionB: 'c² = a²(1+m²)', optionC: 'c = am', optionD: 'c² = a²m²', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Coordinate Geometry', { text: 'The section formula divides the join of (x₁,y₁) and (x₂,y₂) in ratio m:n. The point is:', optionA: '((x₁+x₂)/2, (y₁+y₂)/2)', optionB: '((mx₂+nx₁)/(m+n), (my₂+ny₁)/(m+n))', optionC: '(mx₁+nx₂, my₁+ny₂)', optionD: '(x₁-x₂, y₁-y₂)', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Coordinate Geometry', { text: 'The asymptotes of a rectangular hyperbola are:', optionA: 'Parallel', optionB: 'Perpendicular', optionC: 'Coincident', optionD: 'At 60°', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Coordinate Geometry', { text: 'The distance between parallel lines 2x+3y=5 and 2x+3y=10 is:', optionA: '5', optionB: '5/√13', optionC: '√13', optionD: '10/√13', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Coordinate Geometry', { text: 'The equation of the tangent to x²+y²=25 at (3,4) is:', optionA: '4x + 3y = 25', optionB: '3x + 4y = 25', optionC: '3x - 4y = 25', optionD: 'x + y = 7', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Coordinate Geometry', { text: 'The direction cosines of the x-axis are:', optionA: '(0,1,0)', optionB: '(1,0,0)', optionC: '(0,0,1)', optionD: '(1,1,1)', correctOption: 'B', weightage: 2 });

  // Calculus: +8×2M
  await createQ('Mathematics', 'Calculus', { text: 'The derivative of x·eˣ is:', optionA: 'eˣ', optionB: '(1+x)eˣ', optionC: 'xeˣ', optionD: '(x-1)eˣ', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Calculus', { text: '∫ eˣ dx equals:', optionA: 'xeˣ + C', optionB: 'eˣ + C', optionC: 'eˣ/x + C', optionD: 'xe + C', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Calculus', { text: 'The function f(x) = |x| is continuous at x=0 but:', optionA: 'Also differentiable', optionB: 'Not differentiable', optionC: 'Undefined', optionD: 'Discontinuous', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Calculus', { text: 'L\'Hospital\'s rule is used for evaluating:', optionA: 'Definite integrals', optionB: 'Indeterminate forms', optionC: 'Inequalities', optionD: 'Series', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Calculus', { text: 'If f\'\' (c) > 0 at critical point c, then f(c) is a:', optionA: 'Maximum', optionB: 'Minimum', optionC: 'Inflection point', optionD: 'Saddle point', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Calculus', { text: '∫₀^(π/2) cosθ dθ equals:', optionA: '0', optionB: '1', optionC: 'π/2', optionD: '-1', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Calculus', { text: 'The integrating factor of dy/dx + Py = Q is:', optionA: 'e^(-∫Pdx)', optionB: 'e^(∫Pdx)', optionC: 'P', optionD: '1/P', correctOption: 'B', weightage: 2 });
  await createQ('Mathematics', 'Calculus', { text: 'The slope of the tangent to y = x³ at x = 2 is:', optionA: '6', optionB: '12', optionC: '8', optionD: '24', correctOption: 'B', weightage: 2 });

  // Vectors: +6×1M
  await createQ('Mathematics', 'Vectors and their Products', { text: 'The magnitude of î × ĵ is:', optionA: '0', optionB: '1', optionC: '-1', optionD: '√2', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Vectors and their Products', { text: 'If |a⃗ + b⃗| = |a⃗ - b⃗|, then the vectors are:', optionA: 'Parallel', optionB: 'Perpendicular', optionC: 'Equal', optionD: 'Antiparallel', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Vectors and their Products', { text: 'The volume of a parallelepiped is given by:', optionA: 'a⃗ · b⃗', optionB: '|a⃗ · (b⃗ × c⃗)|', optionC: '|a⃗ × b⃗|', optionD: 'a⃗ + b⃗ + c⃗', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Vectors and their Products', { text: 'A vector perpendicular to both a⃗ and b⃗ is:', optionA: 'a⃗ · b⃗', optionB: 'a⃗ × b⃗', optionC: 'a⃗ + b⃗', optionD: 'a⃗ - b⃗', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Vectors and their Products', { text: 'The dot product is commutative, meaning a⃗·b⃗ equals:', optionA: '-b⃗·a⃗', optionB: 'b⃗·a⃗', optionC: '0', optionD: 'b⃗×a⃗', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Vectors and their Products', { text: 'The resultant of two equal vectors at 120° has magnitude:', optionA: '2a', optionB: 'a', optionC: '0', optionD: 'a√3', correctOption: 'B', weightage: 1 });

  // Stats & Probability: +6×1M
  await createQ('Mathematics', 'Statistics and Probability', { text: 'The mean deviation from the mean is always:', optionA: 'Positive', optionB: 'Non-negative', optionC: 'Negative', optionD: 'Zero', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Statistics and Probability', { text: 'P(A|B) is called:', optionA: 'Marginal probability', optionB: 'Conditional probability', optionC: 'Joint probability', optionD: 'Total probability', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Statistics and Probability', { text: 'The number of terms in the expansion of (a+b)⁸ is:', optionA: '8', optionB: '9', optionC: '7', optionD: '10', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Statistics and Probability', { text: 'If two regression coefficients are 0.8 and 0.5, the correlation coefficient is:', optionA: '0.4', optionB: '0.632', optionC: '0.65', optionD: '0.8', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Statistics and Probability', { text: 'The probability of drawing a king from a pack of 52 cards is:', optionA: '1/52', optionB: '1/13', optionC: '4/13', optionD: '1/4', correctOption: 'B', weightage: 1 });
  await createQ('Mathematics', 'Statistics and Probability', { text: 'The sum of deviations from the mean is always:', optionA: 'Positive', optionB: 'Zero', optionC: 'Negative', optionD: 'Equal to n', correctOption: 'B', weightage: 1 });

  console.log('✅ Mathematics: 69×1M + 62×2M = 193 Qs in bank');

  // ─── Exam Template ───
  const exam = await prisma.exam.create({
    data: {
      name: 'IOE Mock Exam - Set A',
      durationMinutes: 120,
      totalMarks: 140,
      negativeMarkingPercent: 10,
      isActive: true,
    },
  });

  // ─── Topic-level Distributions (single-weight per topic) ───
  const topicDistributions: Array<{ subject: string; topic: string; oneM: number; twoM: number }> = [
    // English (12×1M + 4×2M = 20)
    { subject: 'English', topic: 'Grammar I', oneM: 4, twoM: 0 },
    { subject: 'English', topic: 'Grammar II', oneM: 6, twoM: 0 },
    { subject: 'English', topic: 'Phonetics', oneM: 2, twoM: 0 },
    { subject: 'English', topic: 'Comprehension', oneM: 0, twoM: 4 },
    // Chemistry (14×1M + 8×2M = 30)
    { subject: 'Chemistry', topic: 'Physical Chemistry', oneM: 0, twoM: 8 },
    { subject: 'Chemistry', topic: 'Inorganic Chemistry', oneM: 8, twoM: 0 },
    { subject: 'Chemistry', topic: 'Organic Chemistry', oneM: 6, twoM: 0 },
    // Physics (14×1M + 13×2M = 40)
    { subject: 'Physics', topic: 'Mechanics', oneM: 0, twoM: 5 },
    { subject: 'Physics', topic: 'Heat and Thermodynamics', oneM: 0, twoM: 4 },
    { subject: 'Physics', topic: 'Geometric and Physical Optics', oneM: 0, twoM: 4 },
    { subject: 'Physics', topic: 'Waves and Sound', oneM: 5, twoM: 0 },
    { subject: 'Physics', topic: 'Electricity & Magnetism', oneM: 5, twoM: 0 },
    { subject: 'Physics', topic: 'Modern Physics', oneM: 4, twoM: 0 },
    // Mathematics (20×1M + 15×2M = 50)
    { subject: 'Mathematics', topic: 'Set, Logic and Functions', oneM: 3, twoM: 0 },
    { subject: 'Mathematics', topic: 'Algebra', oneM: 0, twoM: 5 },
    { subject: 'Mathematics', topic: 'Trigonometry', oneM: 5, twoM: 0 },
    { subject: 'Mathematics', topic: 'Coordinate Geometry', oneM: 0, twoM: 5 },
    { subject: 'Mathematics', topic: 'Calculus', oneM: 0, twoM: 5 },
    { subject: 'Mathematics', topic: 'Vectors and their Products', oneM: 5, twoM: 0 },
    { subject: 'Mathematics', topic: 'Statistics and Probability', oneM: 7, twoM: 0 },
  ];

  for (const d of topicDistributions) {
    await prisma.examTopicDistribution.create({
      data: { examId: exam.id, topicId: topics[d.subject][d.topic], oneMarkCount: d.oneM, twoMarkCount: d.twoM },
    });
  }

  console.log(`\n✅ Exam created: ${exam.name}`);
  console.log('   Distribution: 60×1M + 40×2M = 100 Questions = 140 Marks (20 topics)');

  // ─── Sample Hero Slides ───
  await prisma.cmsHeroSlide.createMany({
    data: [
      { imageUrl: '/images/hero-campus.jpg', title: 'Welcome to Kantipur Engineering College', subtitle: 'Shaping Future Engineers Since 1998', ctaText: 'Explore Programs', ctaLink: '/programs', displayOrder: 1, isActive: true },
      { imageUrl: '/images/hero-lab.jpg', title: 'IOE Entrance Mock Exam', subtitle: 'Practice with real exam patterns and boost your score', ctaText: 'Start Mock Exam', ctaLink: '/register', displayOrder: 2, isActive: true },
    ],
  });
  console.log('✅ Hero slides created');

  console.log('\n🎉 Seeding complete!');
  console.log('──────────────────────────────');
  console.log('Admin login: admin@kec.edu.np / admin123');
  console.log('──────────────────────────────');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
