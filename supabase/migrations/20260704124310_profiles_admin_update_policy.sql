/*
# Allow admins to update any profile

Adds a policy so admin accounts can update any profile row
(needed for the admin panel to adjust points on any member).
*/

DROP POLICY IF EXISTS "profiles_admin_update_any" ON profiles;
CREATE POLICY "profiles_admin_update_any" ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );
