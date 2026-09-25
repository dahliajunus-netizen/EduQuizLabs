import { NextRequest, NextResponse } from 'next/server';
import { requireStudent } from '@/lib/server/auth';
import { supabaseDb } from '@/lib/server/supabase';

const q = (value: string) => encodeURIComponent(value);

export async function GET(request: NextRequest) {
  const user = await requireStudent(request);
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  try {
    const classesData = await supabaseDb(
      `student_classes?student_id=eq.${q(user.id)}&select=id,class_name,code,school,course_id,student_id`,
    );
    const classes = Array.isArray(classesData) ? classesData : [];
    const codes = [...new Set(classes.map((x: any) => String(x.code || '').trim()).filter(Boolean))];

    if (!codes.length) {
      return NextResponse.json({
        myClasses: [], courses: [], assignments: [], submissions: [], tests: [], testSubmissions: [],
      });
    }

    const classFilter = codes.map((x) => `"${x.replace(/"/g, '\\"')}"`).join(',');
    const coursesData = await supabaseDb(
      `class_courses?class_code=in.(${classFilter})&select=id,course_name,class_code&order=id.asc`,
    );
    const courses = Array.isArray(coursesData) ? coursesData : [];
    const courseIds = [...new Set(courses.map((x: any) => String(x.id || '').trim()).filter(Boolean))];

    if (!courseIds.length) {
      return NextResponse.json({
        myClasses: classes, courses, assignments: [], submissions: [], tests: [], testSubmissions: [],
      });
    }

    const courseFilter = courseIds.map((x) => `"${x.replace(/"/g, '\\"')}"`).join(',');
    const [assignmentsData, courseTestsData] = await Promise.all([
      supabaseDb(
        `course_assignments?course_id=in.(${courseFilter})&select=id,course_id,name,description,created_at,due_date&order=due_date.asc.nullslast`,
      ),
      supabaseDb(
        `tests?course_id=in.(${courseFilter})&published=eq.true&select=id,course_id,title,created_at&order=created_at.asc`,
      ),
    ]);

    const assignments = Array.isArray(assignmentsData) ? assignmentsData : [];
    const courseTests = Array.isArray(courseTestsData) ? courseTestsData : [];

    const assignmentIds = [...new Set(assignments.map((x: any) => String(x.id || '').trim()).filter(Boolean))];
    let submissions: any[] = [];
    if (assignmentIds.length) {
      const assignmentFilter = assignmentIds.map((x) => `"${x.replace(/"/g, '\\"')}"`).join(',');
      const submissionsData = await supabaseDb(
        `assignment_submissions?assignment_id=in.(${assignmentFilter})&student_id=eq.${q(user.id)}&select=id,assignment_id,student_id,grade,created_at&order=created_at.desc`,
      );
      submissions = Array.isArray(submissionsData) ? submissionsData : [];
    }

    const testSubmissionsData = await supabaseDb(
      `test_submissions?student_id=eq.${q(user.id)}&select=id,test_id,student_id,score,submitted_at&order=submitted_at.desc`,
    );
    const allTestSubmissions = Array.isArray(testSubmissionsData) ? testSubmissionsData : [];

    const latestByTest = new Map<string, any>();
    for (const submission of allTestSubmissions) {
      const testId = String(submission.test_id || '').trim();
      if (testId && !latestByTest.has(testId)) latestByTest.set(testId, submission);
    }

    const submittedTestIds = [...latestByTest.keys()];
    let submittedTests: any[] = [];
    if (submittedTestIds.length) {
      const submittedTestFilter = submittedTestIds.map((x) => `"${x.replace(/"/g, '\\"')}"`).join(',');
      const submittedTestsData = await supabaseDb(
        `tests?id=in.(${submittedTestFilter})&select=id,course_id,title,created_at`,
      );
      submittedTests = Array.isArray(submittedTestsData) ? submittedTestsData : [];
    }

    const testsById = new Map<string, any>();
    for (const test of courseTests) testsById.set(String(test.id), test);
    for (const test of submittedTests) testsById.set(String(test.id), test);

    return NextResponse.json({
      myClasses: classes,
      courses,
      assignments,
      submissions,
      tests: Array.from(testsById.values()),
      testSubmissions: Array.from(latestByTest.values()),
    });
  } catch (error) {
    console.error('[Student Dashboard API] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to load dashboard.',
    }, { status: 500 });
  }
}
