export const translations = {
  en: {
    // Navbar
    overview: 'Overview', children: 'Children', role: 'Role', guestUser: 'Guest User', exit: 'Exit', english: 'English', indonesian: 'Bahasa Indonesia',
    // Teacher dashboard
    teacherDashboard: 'Teacher Dashboard', teacherDashboardDescription: 'Manage your classes, generate join codes, and review student progress.', createNewClass: 'Create New Class', yourClassesJoinCodes: 'Your Classes & Join Codes', noClassesCreated: 'No classes created yet. Click "Create New Class" above to start!', school: 'School', joinCode: 'Join Code', className: 'Class Name', schoolName: 'School Name', cancel: 'Cancel', generateCode: 'Generate Code', classNamePlaceholder: 'e.g., Advanced Mathematics', schoolNamePlaceholder: 'e.g., Lincoln High School',
    // Student dashboard
    studentDashboard: 'Student Dashboard', studentDashboardDescription: 'Track your coursework, join classes with a code, and view upcoming assignments.', classCodeInput: 'Class Code Input', enterCodePlaceholder: 'Enter code (e.g., A3F92)', joinClass: 'Join Class', codeInvalid: 'Code is invalid', alreadyJoined: 'You have already joined this class.', failedToJoin: 'Failed to join', unknownError: 'Unknown error', networkErrorJoining: 'Network error joining class.', classesYouAreIn: 'Classes You Are In', noClassesJoined: "You haven't joined any classes yet. Enter a valid code above!", active: 'Active',
    // Class details
    backToDashboard: 'Back to Dashboard', classCode: 'Class Code', createNewCourse: 'Create new course', courses: 'Courses', teacherAnnouncementsMaterials: 'Teacher Announcements & Materials', noCoursesCreated: 'Teacher announcements, materials, and quizzes for this class will appear here. No courses created yet.', courseMaterialsDescription: 'Course materials, assignments, and lessons for', willAppearHere: 'will appear here.', materials: 'Materials', addMaterial: 'Add material', noMaterials: 'No materials have been added to this course yet.', createNewCourseModal: 'Create New Course', courseName: 'Course Name', courseNamePlaceholder: 'e.g., Mathematics - Module 1', createCourse: 'Create Course', addMaterialModal: 'Add Material', addingTo: 'Adding to', name: 'Name', materialNamePlaceholder: 'e.g., Chapter 1 Notes', link: 'Link', createMaterial: 'Create Material', materialLinkPlaceholder: 'https://example.com/material',
  },
  id: {
    overview: 'Ringkasan', children: 'Anak', role: 'Peran', guestUser: 'Pengguna Tamu', exit: 'Keluar', english: 'English', indonesian: 'Bahasa Indonesia',
    teacherDashboard: 'Dasbor Guru', teacherDashboardDescription: 'Kelola kelas, buat kode bergabung, dan tinjau perkembangan siswa.', createNewClass: 'Buat Kelas Baru', yourClassesJoinCodes: 'Kelas & Kode Bergabung Anda', noClassesCreated: 'Belum ada kelas yang dibuat. Klik "Buat Kelas Baru" di atas untuk memulai!', school: 'Sekolah', joinCode: 'Kode Bergabung', className: 'Nama Kelas', schoolName: 'Nama Sekolah', cancel: 'Batal', generateCode: 'Buat Kode', classNamePlaceholder: 'contoh: Matematika Lanjutan', schoolNamePlaceholder: 'contoh: SMA Labschool',
    studentDashboard: 'Dasbor Siswa', studentDashboardDescription: 'Pantau tugas sekolah, bergabung dengan kelas menggunakan kode, dan lihat tugas yang akan datang.', classCodeInput: 'Masukkan Kode Kelas', enterCodePlaceholder: 'Masukkan kode (contoh: A3F92)', joinClass: 'Gabung Kelas', codeInvalid: 'Kode tidak valid', alreadyJoined: 'Anda sudah bergabung dengan kelas ini.', failedToJoin: 'Gagal bergabung', unknownError: 'Kesalahan tidak diketahui', networkErrorJoining: 'Terjadi kesalahan jaringan saat bergabung dengan kelas.', classesYouAreIn: 'Kelas yang Anda Ikuti', noClassesJoined: 'Anda belum bergabung dengan kelas apa pun. Masukkan kode yang valid di atas!', active: 'Aktif',
    backToDashboard: 'Kembali ke Dasbor', classCode: 'Kode Kelas', createNewCourse: 'Buat mata pelajaran baru', courses: 'Mata Pelajaran', teacherAnnouncementsMaterials: 'Pengumuman & Materi Guru', noCoursesCreated: 'Pengumuman guru, materi, dan kuis untuk kelas ini akan muncul di sini. Belum ada mata pelajaran yang dibuat.', courseMaterialsDescription: 'Materi, tugas, dan pelajaran untuk', willAppearHere: 'akan muncul di sini.', materials: 'Materi', addMaterial: 'Tambah materi', noMaterials: 'Belum ada materi yang ditambahkan ke mata pelajaran ini.', createNewCourseModal: 'Buat Mata Pelajaran Baru', courseName: 'Nama Mata Pelajaran', courseNamePlaceholder: 'contoh: Matematika - Modul 1', createCourse: 'Buat Mata Pelajaran', addMaterialModal: 'Tambah Materi', addingTo: 'Menambahkan ke', name: 'Nama', materialNamePlaceholder: 'contoh: Catatan Bab 1', link: 'Tautan', createMaterial: 'Buat Materi', materialLinkPlaceholder: 'https://example.com/material',
  },
  // These languages use Google Translate for the full page. English is the local fallback for UI keys not translated here.
  'zh-CN': {},
  es: {},
  hi: {},
  fr: {},
  ar: {},
} as const

export type Language = keyof typeof translations
export type TranslationKey = keyof typeof translations.en
