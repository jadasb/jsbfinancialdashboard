// Applies pending migrations. Uses DATABASE_URL when set, else local PGlite.
import { createDb } from "../src/db/index";

const url = process.env.DATABASE_URL?.trim() || undefined;
const h = await createDb({ url });
console.log(`Target: ${url ? "Postgres (DATABASE_URL)" : "local PGlite (.data/pglite)"}`);
console.log(h.migrated.length ? `Applied: ${h.migrated.join(", ")}` : "Schema already up to date.");
await h.close();
