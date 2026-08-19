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
  const [codeError, setCodeError] = useState<string | null>(null);

  useEffect(() => {
    const savedClasses = JSON.parse(localStorage.getItem('student_classes') || '[]');
    setMyClasses(savedClasses);
  }, []);

  const handleJoinClass = (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError(null);

    const trimmedCode = classCode.trim().toUpperCase();
    if (!trimmedCode) return;

    // Fetch all teacher-created classes from localStorage to check validity
    const teacherClasses = JSON.parse(localStorage.getItem('teacher_created_classes') || '[]');
    const foundClass = teacherClasses.find((c: any) => c.code === trimmedCode);

    if (!foundClass) {
      setCodeError('Code is invalid');
      return;
    }

    // Check if student already joined this class
    if (myClasses.includes(foundClass.name)) {
      setCodeError('You have already joined this class.');
      return;
    }

    // Add the real class name to the student's enrolled list
    const updatedClasses = [...myClasses, foundClass.name];
    setMyClasses(updatedClasses);
    localStorage.setItem('student_classes', JSON.stringify(updatedClasses));
    
    // Reset input
    setClassCode('');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Student Dashboard</h1>
          <p className="text-muted-foreground">Track your coursework, join classes with a code, and view upcoming assignments.</p>
        </div>

        {/* Top Section: Class Code Input & Empty Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-primary" /> Class Code Input
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoinClass} className="space-y-3">
                <div className="flex gap-3">
                  <Input
                    type="text"
                    placeholder="Enter 5-digit code (e.g., A3F92)"
                    value={classCode}
                    onChange={(e) => {
                      setClassCode(e.target.value);
                      if (codeError) setCodeError(null);
                    }}
                    className={`bg-background uppercase ${codeError ? '!border-red-500 !ring-red-500 text-red-500' : ''}`}
                  />
                  <Button type="submit">Join Class</Button>
                </div>
                {codeError && <span className="text-xs text-red-500 font-medium block">{codeError}</span>}
              </form>
            </CardContent>
          </Card>

          <Card className="bg-card border-dashed border-muted/40">
            <CardContent className="h-full flex items-center justify-center p-6 text-muted-foreground text-sm">
              {/* Empty section */}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section: Classes You Are In & Assignments Due */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" /> Classes You Are In
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {myClasses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">You haven't joined any classes yet. Enter a valid code above!</p>
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
