import { PGlite } from "@electric-sql/pglite";

const db = new PGlite(process.env.PGLITE_DIR ?? "./.data/pglite");
await db.query("select 1 as online");
console.log("PGlite offline database is ready");
await db.close();
