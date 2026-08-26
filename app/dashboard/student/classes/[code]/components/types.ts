export type Course = {
  id?: string;
  course_name: string;
  class_code: string;
};

export type Material = {
  id?: string;
  course_id: string;
  name: string;
  link: string;
};

export type Assignment = {
  id?: string;
  course_id: string;
  name: string;
  description: string;
  due_date?: string | null;
};

export type Submission = {
  id?: string;
  assignment_id: string;
  student_id?: string | null;
  nickname: string;
  class: string;
  link: string;
  grade?: number | null;
};

export type Test = {
  id: string;
  course_id?: string | null;
  title: string;
  description?: string | null;
  due_date?: string | null;
  published: boolean;
  max_attempts?: number | null;
  allow_review?: boolean | null;
};

export type QuestionType =
  | 'multiple-choice'
  | 'true-false'
  | 'fill-blank'
  | 'matching';

export type Question = {
  id?: string;
  test_id: string;
  question_order: number;
  question: string;
  question_type?: QuestionType | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  points: number;
  answer_data?: {
    image_url?: string | null;
    [key: string]: unknown;
  } | null;
};

export type AddType = 'material' | 'assignment';
