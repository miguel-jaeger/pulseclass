-- Create admin function to update user password directly in auth.users
CREATE OR REPLACE FUNCTION public.admin_update_user_password(p_user_id uuid, p_new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE auth.users
  SET password = crypt(p_new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$;

-- Allow authenticated users to execute (RLS is handled by the app checking admin role)
GRANT EXECUTE ON FUNCTION public.admin_update_user_password(uuid, text) TO authenticated;
