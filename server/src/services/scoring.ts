interface ScoringInput {
  questions: Array<{
    id: string;
    correct_option: string;
    weightage: number;
  }>;
  answers: Record<string, string | null>; // questionId -> selected option or null
  negativeMarkingPercent: number;
}

interface ScoringResult {
  totalScore: number;
  totalMarks: number;
  correct: number;
  wrong: number;
  unattempted: number;
  details: Array<{
    questionId: string;
    selectedOption: string | null;
    correctOption: string;
    isCorrect: boolean;
    marksAwarded: number;
    weightage: number;
  }>;
  subjectBreakdown: Record<string, {
    correct: number;
    wrong: number;
    unattempted: number;
    score: number;
    totalMarks: number;
  }>;
}

export function calculateScore(
  input: ScoringInput,
  subjectMap: Record<string, string> // questionId -> subject name
): ScoringResult {
  const { questions, answers, negativeMarkingPercent } = input;
  const penaltyFraction = negativeMarkingPercent / 100;

  let totalScore = 0;
  let correct = 0;
  let wrong = 0;
  let unattempted = 0;
  let totalMarks = 0;

  const subjectBreakdown: ScoringResult['subjectBreakdown'] = {};
  const details: ScoringResult['details'] = [];

  for (const q of questions) {
    totalMarks += q.weightage;
    const selected = answers[q.id] || null;
    const subject = subjectMap[q.id] || 'Unknown';

    if (!subjectBreakdown[subject]) {
      subjectBreakdown[subject] = { correct: 0, wrong: 0, unattempted: 0, score: 0, totalMarks: 0 };
    }
    subjectBreakdown[subject].totalMarks += q.weightage;

    let marksAwarded = 0;
    let isCorrect = false;

    if (!selected) {
      unattempted++;
      subjectBreakdown[subject].unattempted++;
    } else if (selected === q.correct_option) {
      isCorrect = true;
      marksAwarded = q.weightage;
      correct++;
      totalScore += marksAwarded;
      subjectBreakdown[subject].correct++;
      subjectBreakdown[subject].score += marksAwarded;
    } else {
      marksAwarded = -(q.weightage * penaltyFraction);
      wrong++;
      totalScore += marksAwarded;
      subjectBreakdown[subject].wrong++;
      subjectBreakdown[subject].score += marksAwarded;
    }

    details.push({
      questionId: q.id,
      selectedOption: selected,
      correctOption: q.correct_option,
      isCorrect,
      marksAwarded,
      weightage: q.weightage,
    });
  }

  return {
    totalScore: Math.round(totalScore * 100) / 100,
    totalMarks,
    correct,
    wrong,
    unattempted,
    details,
    subjectBreakdown,
  };
}
