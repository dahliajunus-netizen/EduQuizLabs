export type QuizQuestion = {
  question_type?: string | null;
  option_a?: string | null;
  correct_answer?: string | null;
  points?: number | null;
};

function normalize(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function questionType(q: QuizQuestion) {
  return String(q.question_type || 'multiple_choice').toLowerCase().replace(/-/g, '_');
}

export function isCorrect(q: QuizQuestion, value: unknown) {
  const type = questionType(q);

  if (type === 'fill_blank' || type === 'fill_in_blank') {
    const accepted = String(q.option_a || q.correct_answer || '')
      .split(/\s*(?:\|\||;|,)\s*/)
      .map(normalize)
      .filter(Boolean);
    return accepted.includes(normalize(value));
  }

  if (type === 'matching' || type === 'match') {
    try {
      const submitted = JSON.parse(String(value || '{}'));
      const pairs = JSON.parse(String(q.option_a || '[]'));
      return Array.isArray(pairs) && pairs.length > 0 && pairs.every((pair: any) =>
        normalizedPairValue(submitted?.[pair.left]) === normalize(pair.right)
      );
    } catch {
      return false;
    }
  }

  const submitted = normalize(value);
  const correct = normalize(q.correct_answer);

  if (type === 'true_false') {
    const map = (x: string) =>
      x === 'a' || x === 'true' ? 'a' : x === 'b' || x === 'false' ? 'b' : x;
    return map(submitted) === map(correct);
  }

  return submitted === correct;
}

function normalizedPairValue(value: unknown) {
  return normalize(value);
}

export function calculateScore(questions: QuizQuestion[], answers: Record<string, unknown>) {
  const totalPoints = questions.reduce((sum, q) => sum + Number(q.points || 0), 0) || 100;
  const earned = questions.reduce(
    (sum, q: QuizQuestion & { id?: string }) =>
      sum + (isCorrect(q, q.id ? answers[q.id] : undefined) ? Number(q.points || 0) : 0),
    0,
  );
  return Math.round((earned / totalPoints) * 10000) / 100;
}
