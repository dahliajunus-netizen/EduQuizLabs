-- Performance indexes for the Student Dashboard and Live Quiz.
-- These target the exact filters/orderings used by the app and avoid full-table scans
-- as the number of classes, coursework, submissions and live-game rows grows.

CREATE INDEX IF NOT EXISTS idx_student_classes_student_id
  ON public.student_classes (student_id);

CREATE INDEX IF NOT EXISTS idx_student_classes_student_code
  ON public.student_classes (student_id, code);

CREATE INDEX IF NOT EXISTS idx_class_courses_class_code
  ON public.class_courses (class_code);

CREATE INDEX IF NOT EXISTS idx_course_assignments_course_due
  ON public.course_assignments (course_id, due_date);

CREATE INDEX IF NOT EXISTS idx_tests_course_published_created
  ON public.tests (course_id, published, created_at);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_assignment_created
  ON public.assignment_submissions (student_id, assignment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_test_submissions_student_test_submitted
  ON public.test_submissions (student_id, test_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_quizzes_teacher_template_status_created
  ON public.live_quizzes (teacher_id, is_template, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_quiz_questions_quiz_order
  ON public.live_quiz_questions (quiz_id, question_order);

CREATE INDEX IF NOT EXISTS idx_live_quiz_players_quiz
  ON public.live_quiz_players (quiz_id);

CREATE INDEX IF NOT EXISTS idx_live_quiz_answers_quiz_question
  ON public.live_quiz_answers (quiz_id, question_id);
