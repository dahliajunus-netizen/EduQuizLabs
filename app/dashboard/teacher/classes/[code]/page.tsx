'use client'

// Reuse the existing class workspace without importing another route's
// filesystem path. The student class page lives five levels up from here.
import ClassDetailsPage from '../../../../../student/classes/[code]/page'

export default function TeacherClassPage() {
  return <ClassDetailsPage />
}
