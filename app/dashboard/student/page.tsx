'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookOpen, PlusCircle, CheckCircle, Clock } from 'lucide-react';

export default function StudentDashboard() {
  const [classCode, setClassCode] = useState('');
  const [myClasses, setMyClasses] = useState<string[]>([]);

  useEffect(() => {
    const savedClasses = JSON.parse(localStorage.getItem('student_classes') || '["Mathematics 101", "Physics Advanced"]');
    setMyClasses(savedClasses);
  }, []);

  const handleJoinClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!classCode.trim()) return;
    const updatedClasses = [...myClasses, classCode.trim()];
    setMyClasses(updatedClasses);
    localStorage.setItem('student_classes', JSON.stringify(updatedClasses));
    setClassCode('');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Student Dashboard</h1>
          <p className="text-muted-foreground">Track your coursework, join classes, and view upcoming assignments.</p>
        </div>

        {/* Top Section: Red Circle (Class Code Input) & Grey Circle (Emptied) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Red Circle Area: Class Code Input Box */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-primary" /> Class Code Input
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoinClass} className="flex gap-3">
                <Input
                  type="text"
                  placeholder="Enter class code (e.g., SCI-402)"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                  className="bg-background"
                />
                <Button type="submit">Join Class</Button>
              </form>
            </CardContent>
          </Card>

          {/* Grey Circle Area: Left Empty */}
          <Card className="bg-card border-dashed border-muted/40">
            <CardContent className="h-full flex items-center justify-center p-6 text-muted-foreground text-sm">
              {/* Empty section */}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section: Green Circle (Classes You Are In) & Yellow Circle (Assignments Due) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Green Circle Area: Classes You Are In Box */}
          <Card className="lg:col-span-2 bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" /> Classes You Are In
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {myClasses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">You haven't joined any classes yet.</p>
                ) : (
                  myClasses.map((classNameItem, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-border bg-accent/20">
                      <div>
                        <h4 className="font-medium text-foreground">{classNameItem}</h4>
                        <p className="text-xs text-muted-foreground">Enrolled active section</p>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">Active</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Yellow Circle Area: Assignments Due Box */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" /> Assignments Due
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-b border-border pb-3">
                  <h4 className="text-sm font-medium text-foreground">Problem Set 4</h4>
                  <p className="text-xs text-amber-500 font-medium">Due Tomorrow, 11:59 PM</p>
                </div>
                <div className="border-b border-border pb-3">
                  <h4 className="text-sm font-medium text-foreground">Physics Lab Report</h4>
                  <p className="text-xs text-muted-foreground">Due in 3 days</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground">Literature Essay Draft</h4>
                  <p className="text-xs text-muted-foreground">Due next week</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
