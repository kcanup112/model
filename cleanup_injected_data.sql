-- Cleanup script to remove injected/spam user data.
-- This script safely deletes spam users. Cascading foreign keys will clean up profiles, attempts, etc.

BEGIN;

-- 1. Create a list of all user IDs that match spam criteria
CREATE TEMP TABLE spam_users AS
SELECT u.id, u.email, p.full_name, p.address_city, p.address_province
FROM users u
JOIN user_profiles p ON u.id = p.user_id
WHERE 
  -- Length checks (spam payloads are usually very long)
  LENGTH(p.full_name) > 100 OR
  LENGTH(p.address_street) > 200 OR
  LENGTH(p.address_city) > 100 OR
  LENGTH(p.address_district) > 100 OR
  
  -- Province check (Nepal only has 7 official provinces, with or without 'Province' suffix)
  p.address_province NOT IN (
    'Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim',
    'Koshi Province', 'Madhesh Province', 'Bagmati Province', 'Gandaki Province', 'Lumbini Province', 'Karnali Province', 'Sudurpashchim Province'
  ) OR
  
  -- Contains script/HTML tags
  p.full_name ~* '<script' OR
  p.address_street ~* '<script' OR
  p.address_city ~* '<script' OR
  p.address_district ~* '<script' OR
  
  -- Contains SQL injection signatures
  p.full_name ~* 'UNION SELECT' OR
  p.address_city ~* 'UNION SELECT' OR
  
  -- Detect massive string without any spaces (a common sign of the random character injection in your CSV)
  (LENGTH(p.full_name) - LENGTH(REPLACE(p.full_name, ' ', '')) = 0 AND LENGTH(p.full_name) > 30) OR
  (LENGTH(p.address_city) - LENGTH(REPLACE(p.address_city, ' ', '')) = 0 AND LENGTH(p.address_city) > 30) OR
  (LENGTH(p.address_district) - LENGTH(REPLACE(p.address_district, ' ', '')) = 0 AND LENGTH(p.address_district) > 30);

-- 2. Display the list of users that will be deleted
SELECT email, full_name, address_city, address_province FROM spam_users;

-- 3. Delete the users (referencing user_profiles will automatically cascade and delete)
DELETE FROM users
WHERE id IN (SELECT id FROM spam_users);

COMMIT;
