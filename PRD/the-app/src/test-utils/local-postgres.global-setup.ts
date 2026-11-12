// Jest globalSetup for the db tests (jest.db.config.mjs): checks the URL, then brings the local
// database up to the migrations once, before any test file runs.
import { applyMigrations, requireLocalTestDatabaseUrl } from './local-postgres';

export default function globalSetup(): void {
  applyMigrations(requireLocalTestDatabaseUrl(process.env.LOCAL_POSTGRES_URL, 'LOCAL_POSTGRES_URL'));
}
