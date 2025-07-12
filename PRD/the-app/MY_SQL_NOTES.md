
``` creating a new user with all privileges on a specific schema
-- 1️⃣  Create the user (replace 'veryStrongPassword!' with an actual secret)
CREATE USER IF NOT EXISTS 'bringmehomeuser'@'%' IDENTIFIED BY 'veryStrongPassword!';

-- 2️⃣  Grant all privileges on the target schema
GRANT ALL PRIVILEGES ON bringmehomeprod.* TO 'bringmehomeuser'@'%';

-- 3️⃣  (Optional) Let the new user also GRANT privileges to others
-- GRANT ALL PRIVILEGES ON bringmehomeprod.* TO 'bringmehomeuser'@'%' WITH GRANT OPTION;

-- 4️⃣  Make sure the privilege table is re-read (redundant in MySQL 8, but harmless)
FLUSH PRIVILEGES;
```

