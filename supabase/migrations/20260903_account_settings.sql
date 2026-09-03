-- Account settings support: profile pictures and self-service account deletion.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Public avatar bucket. Files are still limited by the client and storage policies below.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif'];

DROP POLICY IF EXISTS avatar_upload_own ON storage.objects;
DROP POLICY IF EXISTS avatar_update_own ON storage.objects;
DROP POLICY IF EXISTS avatar_delete_own ON storage.objects;
DROP POLICY IF EXISTS avatar_read_public ON storage.objects;

CREATE POLICY avatar_read_public ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY avatar_upload_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY avatar_update_own ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY avatar_delete_own ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Delete only the currently authenticated account. The function is deliberately
-- restricted to auth.uid(), so it cannot be used to delete another account.
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM storage.objects WHERE bucket_id = 'avatars' AND (storage.foldername(name))[1] = uid::text;
  DELETE FROM public.users WHERE id = uid;
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
