'use client'

// The class workspace is shared between teachers and students.
// Keeping the implementation in one place prevents the two dashboards
// from drifting apart while the page itself detects the signed-in role.
import ClassDetailsPage from '../../../../student/classes/[code]/page'

export default function TeacherClassPage() {
  return <ClassDetailsPage />
}
