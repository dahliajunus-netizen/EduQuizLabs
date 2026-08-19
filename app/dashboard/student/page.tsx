'tsx'
import { Navbar } from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BookOpen, Award, CheckCircle, Clock } from 'lucide-react';

export default function StudentDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Student Dashboard</h1>
          <p className="text-muted-foreground">Track your coursework, grades, and upcoming assignments.</p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Enrolled Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-primary" />
            </CardHeader>
            CardContent={<div className="text-2xl font-bold text-foreground">6 Active</div>}
          </Card>
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Grade</CardTitle>
              <Award className="h-4 w-4 text-primary" />
            </CardHeader>
            CardContent={<div className="text-2xl font-bold text-foreground">94.5%</div>}
          </Card>
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed Tasks</CardTitle>
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            CardContent={<div className="text-2xl font-bold text-foreground">24 / 28</div>}
          </Card>
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Tests</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            CardContent={<div className="text-2xl font-bold text-foreground">2 Due Soon</div>}
          </Card>
        </div>

        {/* Recent Assignments section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Current Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['Mathematics Problem Set 4', 'English Literature Essay Draft', 'Physics Lab Report'].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-border bg-accent/20">
                    <div>
                      <h4 className="font-medium text-foreground">{item}</h4>
                      <p className="text-xs text-muted-foreground">Due in 3 days</p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">In Progress</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Announcements</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No new announcements from teachers at this time. Check back later!</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
