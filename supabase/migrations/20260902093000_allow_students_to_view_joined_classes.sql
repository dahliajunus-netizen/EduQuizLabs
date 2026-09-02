-- Allow students to open a class they have already joined.
-- Students must not be able to enumerate every teacher class.

DROP POLICY IF EXISTS "Students can view joined teacher classes" ON public.teacher_classes;

CREATE POLICY "Students can view joined teacher classes"
ON public.teacher_classes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.student_classes AS sc
    WHERE sc.student_id = auth.uid()
      AND sc.code = teacher_classes.code
  )
);
