-- Fix the get_todays_birthdays function to handle timezone differences
-- This function will check for birthdays on both UTC today and UTC tomorrow
-- to handle users in different timezones (like Asia/Calcutta being ahead of UTC)

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
DECLARE
  today_date DATE;
  tomorrow_date DATE;
BEGIN
  -- Get today's date in UTC
  today_date := CURRENT_DATE;

  -- Get tomorrow's date in UTC (for users in timezones ahead of UTC)
  tomorrow_date := today_date + INTERVAL '1 day';

  -- Debug logging
  RAISE NOTICE 'Checking birthdays for UTC dates: % and %', today_date, tomorrow_date;

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
    AND (
      -- Match today's date (for UTC-based birthdays)
      (EXTRACT(MONTH FROM b.birth_date) = EXTRACT(MONTH FROM today_date)
       AND EXTRACT(DAY FROM b.birth_date) = EXTRACT(DAY FROM today_date))
      OR
      -- Match tomorrow's date (for users in timezones ahead of UTC)
      (EXTRACT(MONTH FROM b.birth_date) = EXTRACT(MONTH FROM tomorrow_date)
       AND EXTRACT(DAY FROM b.birth_date) = EXTRACT(DAY FROM tomorrow_date))
    );

  -- Log how many birthdays were found
  RAISE NOTICE 'Found % birthdays for today/tomorrow', (SELECT COUNT(*) FROM birthdays b WHERE b.is_active = true AND (
    (EXTRACT(MONTH FROM b.birth_date) = EXTRACT(MONTH FROM today_date) AND EXTRACT(DAY FROM b.birth_date) = EXTRACT(DAY FROM today_date)) OR
    (EXTRACT(MONTH FROM b.birth_date) = EXTRACT(MONTH FROM tomorrow_date) AND EXTRACT(DAY FROM b.birth_date) = EXTRACT(DAY FROM tomorrow_date))
  ));
END;
$$ LANGUAGE plpgsql;
