// Usage: npm run db:setup [-- --reset-password]
// Creates the tables (supabase/migrations/*.sql, each applied once), loads the title catalog, and sets the
// shared site password from SITE_PASSWORD. Talks to Supabase through the Management API, so it only needs
// a personal access token (Supabase dashboard -> Account -> Access Tokens) and the project URL.
import { readdirSync, readFileSync } from "node:fs";
import { hashPassword } from "../src/lib/password.ts";

try {
  process.loadEnvFile(".env.local");
} catch {
  console.error("Missing .env.local. Copy .env.local.example to .env.local and fill it in.");
  process.exit(1);
}

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const token = process.env.SUPABASE_ACCESS_TOKEN || "";
const sitePassword = process.env.SITE_PASSWORD || "";
const resetPassword = process.argv.includes("--reset-password");

function fail(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

if (!url) fail("SUPABASE_URL is empty in .env.local (e.g. https://abcdefgh.supabase.co).");
if (!token) fail("SUPABASE_ACCESS_TOKEN is empty in .env.local (a personal access token starting with sbp_).");
const ref = new URL(url).hostname.split(".")[0]; // hostname only, so extra path text in the URL is harmless

async function sql<T = unknown>(query: string): Promise<T> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) fail(`Supabase rejected the query (${res.status}): ${text}`);
  return JSON.parse(text) as T;
}

const literal = (value: string) => `'${value.replace(/'/g, "''")}'`;

console.log(`Project: ${ref}`);

await sql(`create table if not exists public.app_migrations (name text primary key, applied_at timestamptz not null default now())`);
const applied = new Set((await sql<Array<{ name: string }>>(`select name from public.app_migrations`)).map((r) => r.name));

const files = readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort();
for (const file of files) {
  if (applied.has(file)) {
    console.log(`  skip   ${file} (already applied)`);
    continue;
  }
  await sql(`${readFileSync(`supabase/migrations/${file}`, "utf8")}\ninsert into public.app_migrations (name) values (${literal(file)});`);
  console.log(`  apply  ${file}`);
}

await sql(readFileSync("supabase/seed.sql", "utf8"));
const [{ count }] = await sql<Array<{ count: number }>>(`select count(*)::int as count from public.titles`);
console.log(`  seed   ${count} titles`);

const [{ has_password }] = await sql<Array<{ has_password: boolean }>>(
  `select exists (select 1 from public.site_password) as has_password`,
);
if (sitePassword && (!has_password || resetPassword)) {
  await sql(
    `insert into public.site_password (id, password_hash) values (true, ${literal(hashPassword(sitePassword))})
     on conflict (id) do update set password_hash = excluded.password_hash`,
  );
  console.log(`  ${has_password ? "reset" : "set  "}  site password (stored as a scrypt hash)`);
  console.log("  Tip: you can now blank SITE_PASSWORD in .env.local so the plain text isn't kept around.");
} else if (!has_password) {
  fail("No site password is set yet. Put one in SITE_PASSWORD in .env.local and run this again.");
} else {
  console.log("  keep   existing site password (use --reset-password with SITE_PASSWORD to change it)");
}

console.log("\nDone. Start the app with: npm run dev");
