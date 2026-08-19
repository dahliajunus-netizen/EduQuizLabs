import { Navbar } from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, FileText, CheckSquare, AlertCircle } from 'lucide-react';

export default function TeacherDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Teacher Dashboard</h1>
          <p className="text-muted-foreground">Manage your classes, grade submissions, and review student progress.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            CardContent={<div className="text-2xl font-bold text-foreground">128</div>}
          </Card>
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Submissions</CardTitle>
              <FileText className="h-4 w-4 text-amber-500" />
            </CardHeader>
            CardContent={<div className="text-2xl font-bold text-foreground">14 to Grade</div>}
          </Card>
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Classes</CardTitle>
              <CheckSquare className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            CardContent={<div className="text-2xl font-bold text-foreground">4 Sections</div>}
          </Card>
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Attendance Rate</CardTitle>
              <AlertCircle className="h-4 w-4 text-primary" />
            </CardHeader>
            CardContent={<div className="text-2xl font-bold text-foreground">96.2%</div>}
          </Card>
        </div>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Submissions Awaiting Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['Algebra Final Exam - Alex M.', 'Essay on World History - Sarah K.', 'Physics Quiz - John D.'].map((sub, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-md border border-border">
                  <span className="text-sm font-medium text-foreground">{sub}</span>
                  <button className="text-xs font-medium text-primary hover:underline">Review & Grade</button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
