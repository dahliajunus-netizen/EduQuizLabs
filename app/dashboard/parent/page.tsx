import { Navbar } from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { UserCheck, ShieldCheck, Calendar, Bell } from 'lucide-react';

export default function ParentDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Parent Dashboard</h1>
          <p className="text-muted-foreground">Monitor your child's academic performance and school communications.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Linked Children</CardTitle>
              <UserCheck className="h-4 w-4 text-primary" />
            </CardHeader>
            CardContent={<div className="text-2xl font-bold text-foreground">1 Student</div>}
          </Card>
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Term GPA</CardTitle>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            CardContent={<div className="text-2xl font-bold text-foreground">3.8 / 4.0</div>}
          </Card>
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming School Events</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            CardContent={<div className="text-2xl font-bold text-foreground">Parent-Teacher Conf.</div>}
          </Card>
        </div>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Child Activity Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h4 className="font-medium text-foreground">Mathematics Quiz Score</h4>
                  <p className="text-xs text-muted-foreground">Scored 95% on Algebra Checkpoint</p>
                </div>
                <span className="text-xs font-medium text-emerald-500">Passed</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-foreground">Attendance Status</h4>
                  <p className="text-xs text-muted-foreground">Present for all scheduled classes this week</p>
                </div>
                <span className="text-xs font-medium text-emerald-500">Verified</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
