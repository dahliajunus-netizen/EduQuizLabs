-- PostgREST cannot resolve overloaded RPCs when the same parameter names
-- accept both text and uuid. Test IDs are UUIDs, so keep only the UUID version.

drop function if exists public.start_test_attempt(text, uuid);

-- The canonical function is public.start_test_attempt(uuid, uuid).
-- No replacement function is needed here because that overload already exists.
