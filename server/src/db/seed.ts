import { connectDB, ensureIndexes } from "./index.js";
import { seedDemoWorkspace } from "./seed-demo.js";

/** `npm run db:seed` — wipe and re-seed the shared AllHome demo workspace. */
async function seed() {
  await connectDB();
  await ensureIndexes();
  await seedDemoWorkspace(true);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
