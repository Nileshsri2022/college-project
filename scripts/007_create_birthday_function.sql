-- Create a function to get today's birthdays
CREATE OR REPLACE FUNCTION get_todays_birthdays()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  person_name text,
  birth_date date,
  email text,
  phone text,
  notification_preference text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  profile_email text,
  profile_full_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.user_id,
    b.person_name,
    b.birth_date,
    b.email,
    b.phone,
    b.notification_preference,
    b.is_active,
    b.created_at,
    b.updated_at,
    p.email as profile_email,
    p.full_name as profile_full_name
  FROM birthdays b
  LEFT JOIN profiles p ON b.user_id = p.id
  WHERE b.is_active = true
    AND EXTRACT(MONTH FROM b.birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(DAY FROM b.birth_date) = EXTRACT(DAY FROM CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;
