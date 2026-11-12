// Jest setupFiles for the db tests: the app's own `@/lib/prisma` connects through DATABASE_URL, so
// it is pointed at the checked local database before any test module loads. `.env`'s DATABASE_URL
// (another database) is replaced here and never used by these tests.
import { requireLocalTestDatabaseUrl } from './local-postgres';

process.env.DATABASE_URL = requireLocalTestDatabaseUrl(process.env.LOCAL_POSTGRES_URL, 'LOCAL_POSTGRES_URL');
