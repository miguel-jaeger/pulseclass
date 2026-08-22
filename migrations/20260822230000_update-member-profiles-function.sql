-- Update function to include role
CREATE OR REPLACE FUNCTION get_course_member_profiles(cid UUID)
RETURNS TABLE (user_id UUID, name TEXT, email TEXT, role TEXT)
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT p.user_id, p.name, p.email, p.role
  FROM course_members cm
  JOIN profiles p ON p.user_id = cm.user_id
  WHERE cm.course_id = cid
  ORDER BY p.name;
$$;
