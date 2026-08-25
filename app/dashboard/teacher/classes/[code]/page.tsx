'use client'

// Reuse the existing class workspace without importing another route's
// filesystem path. Both class routes live under app/dashboard, so the
// student workspace is three levels above this [code] directory.
import ClassDetailsPage from '../../../student/classes/[code]/page'

export default function TeacherClassPage() {
  return <ClassDetailsPage />
}
