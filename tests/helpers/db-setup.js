// The db project needs TEST_DATABASE_URL pointing at a disposable, migrated database.
// It is never the production database: tests delete rows they create.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
process.env.ENCRYPTION_KEY ||= Buffer.alloc(32, 7).toString("base64");
