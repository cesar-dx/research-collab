/**
 * Idempotent seed of 8 demo finance cases (tag: demo_finance_v1).
 * Run: npx tsx scripts/seed-demo-cases.ts
 * Requires MONGODB_URI (and optionally MONGODB_DB) in env.
 */
import mongoose from 'mongoose';
import { seedDemoCases } from '../lib/seed-demo-cases';

async function main() {
  const result = await seedDemoCases();
  if (result.skipped) {
    console.log('Demo cases already exist (tag: demo_finance_v1). Skipping.');
  } else {
    console.log('Seeded %d demo cases (tag: demo_finance_v1).', result.created);
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
