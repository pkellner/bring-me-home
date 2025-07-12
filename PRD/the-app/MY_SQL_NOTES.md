
``` sql
/* ---------- change-me section ---------- */
SET @database_name := `better-rules-prod`;        -- wrap only the value, not the back-ticks
SET @db_user       := `betterrulesuser`;
SET @db_host       := '%';
SET @db_password   := `xxx`;
/* ---------- nothing below this line usually changes ---------- */

-- CREATE if missing
SET @sql := CONCAT(
  'CREATE USER IF NOT EXISTS ''', @db_user, '''@''', @db_host,
  ''' IDENTIFIED BY ''', @db_password, ''';'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ALTER (idempotent refresh of password/attributes)
SET @sql := CONCAT(
  'ALTER USER ''', @db_user, '''@''', @db_host,
  ''' IDENTIFIED BY ''', @db_password, ''';'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- GRANT privileges (database name safely back-ticked)
SET @sql := CONCAT(
  'GRANT ALL PRIVILEGES ON `', @database_name, '`.* TO ''',
  @db_user, '''@''', @db_host, ''' WITH GRANT OPTION;'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

FLUSH PRIVILEGES;
```


```sql
SELECT
  table_schema   AS `Schema`,
  ROUND(SUM(data_length + index_length) / 1024 / 1024, 1) AS `Size_MB`
FROM information_schema.tables
GROUP BY table_schema
ORDER BY `Size_MB` DESC;
```

