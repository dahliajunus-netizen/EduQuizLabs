export type QuizQuestion = {
  id?: string;
  question_type?: string | null;
  option_a?: string | null;
  correct_answer?: string | null;
};

function normalize(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function questionType(q: QuizQuestion) {
  return String(q.question_type || 'multiple_choice').toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_');
}

function parseAcceptedAnswers(q: QuizQuestion) {
  const raw = String(q.option_a || q.correct_answer || '').trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(normalize).filter(Boolean);
  } catch {
    // Legacy format: only split on explicit answer delimiters, not commas.
  }
  return raw.split(/\s*\|\|\s*|\s*;\s*/).map(normalize).filter(Boolean);
}

export function isCorrect(q: QuizQuestion, value: unknown) {
  const type = questionType(q);

  if (type === 'fill_blank' || type === 'fill_in_blank') {
    return parseAcceptedAnswers(q).includes(normalize(value));
  }

  if (type === 'matching' || type === 'match') {
    try {
      const submitted = JSON.parse(String(value || '{}'));
      const pairs = JSON.parse(String(q.option_a || '[]'));
      return Array.isArray(pairs) && pairs.length > 0 && pairs.every((pair: any) =>
        normalize(submitted?.[pair.left]) === normalize(pair.right)
      );
    } catch {
      return false;
    }
  }

  const submitted = normalize(value);
  const correct = normalize(q.correct_answer);

  if (type === 'true_false' || type === 'truefalse' || type === 'boolean') {
    const map = (x: string) =>
      x === 'a' || x === 'true' ? 'a' : x === 'b' || x === 'false' ? 'b' : x;
    return map(submitted) === map(correct);
  }

  return submitted === correct;
}

/** Every question has equal weight. A complete test is always worth 100 points. */
export function calculateScore(questions: QuizQuestion[], answers: Record<string, unknown>) {
  if (!questions.length) return 0;
  const correct = questions.reduce(
    (count, question) => count + (isCorrect(question, question.id ? answers[question.id] : undefined) ? 1 : 0),
    0,
  );
  return Math.round((correct / questions.length) * 10000) / 100;
}
