-- EduQuizLabs: enforce equal question weighting for test submissions
-- This fixes the student test page currently sending point-weighted scores.
-- 19 correct out of 20 questions becomes 95.00, regardless of question points.

CREATE OR REPLACE FUNCTION public.equal_weight_test_submission_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q RECORD;
  answer_text TEXT;
  correct_count INTEGER := 0;
  total_count INTEGER := 0;
  qtype TEXT;
  expected TEXT;
  selected JSONB;
  pairs_json JSONB;
  ok BOOLEAN;
BEGIN
  FOR q IN
    SELECT id, question_type, correct_answer, option_a
    FROM public.test_questions
    WHERE test_id = NEW.test_id
    ORDER BY question_order ASC, id ASC
  LOOP
    total_count := total_count + 1;
    answer_text := COALESCE(NEW.answers ->> q.id::text, '');
    qtype := lower(replace(replace(COALESCE(q.question_type, 'multiple-choice'), '_', '-'), ' ', '-'));

    -- Multiple choice / true-false
    IF qtype IN ('multiple-choice', 'multiplechoice', 'true-false', 'truefalse', 'boolean') THEN
      IF lower(trim(answer_text)) = lower(trim(COALESCE(q.correct_answer, ''))) THEN
        correct_count := correct_count + 1;
      END IF;

    -- Fill in the blank: option_a is the primary accepted answer in the current schema.
    ELSIF qtype IN ('fill-blank', 'fill-in-blank', 'fill-in-the-blank', 'fillintheblank', 'fill-blank-question') THEN
      expected := COALESCE(q.option_a, q.correct_answer, '');
      IF EXISTS (
        SELECT 1
        FROM regexp_split_to_table(expected, '\\s*(?:\\|\\||;|,)\\s*') AS accepted
        WHERE lower(trim(accepted)) = lower(trim(answer_text))
      ) THEN
        correct_count := correct_count + 1;
      END IF;

    -- Matching: option_a stores the pair list as JSON; submitted answer is a JSON object
    -- mapping each left-hand item to its selected right-hand item.
    ELSIF qtype IN ('matching', 'match') THEN
      BEGIN
        pairs_json := COALESCE(q.option_a, '[]')::jsonb;
        selected := COALESCE(answer_text, '{}')::jsonb;
        ok := jsonb_typeof(pairs_json) = 'array' AND jsonb_array_length(pairs_json) > 0;

        IF ok THEN
          FOR q IN SELECT value AS pair FROM jsonb_array_elements(pairs_json)
          LOOP
            IF COALESCE(selected ->> (q.pair ->> 'left'), '') <> COALESCE(q.pair ->> 'right', '') THEN
              ok := false;
              EXIT;
            END IF;
          END LOOP;
        END IF;

        IF ok THEN
          correct_count := correct_count + 1;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END LOOP;

  IF total_count > 0 THEN
    NEW.score := ROUND((correct_count::numeric / total_count::numeric) * 100, 2);
  ELSE
    NEW.score := 0;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_equal_weight_test_submission_score
ON public.test_submissions;

CREATE TRIGGER trg_equal_weight_test_submission_score
BEFORE INSERT OR UPDATE OF answers
ON public.test_submissions
FOR EACH ROW
EXECUTE FUNCTION public.equal_weight_test_submission_score();

-- Recalculate existing submissions using the same equal-question weighting.
UPDATE public.test_submissions s
SET score = x.new_score
FROM (
  SELECT
    s2.id,
    CASE
      WHEN COUNT(q.id) = 0 THEN 0
      ELSE ROUND(
        (
          COUNT(q.id) FILTER (
            WHERE lower(trim(COALESCE(s2.answers ->> q.id::text, ''))) = lower(trim(COALESCE(q.correct_answer, '')))
          )::numeric
          / COUNT(q.id)::numeric
        ) * 100,
        2
      )
    END AS new_score
  FROM public.test_submissions s2
  LEFT JOIN public.test_questions q ON q.test_id = s2.test_id
  GROUP BY s2.id
) x
WHERE s.id = x.id;
