// Usage: npm run db:setup [-- --reset-admin]
// Creates the tables (supabase/migrations/*.sql, each applied once), loads the title catalog, and
// creates the default admin user. Talks to Supabase through the Management API.
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
const resetAdmin = process.argv.includes("--reset-admin");

// Default admin credentials (override with ADMIN_USERNAME / ADMIN_PASSWORD in .env.local).
const adminUsername = process.env.ADMIN_USERNAME || "filip";
const adminPassword = process.env.ADMIN_PASSWORD || "milicka24";

function fail(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

if (!url) fail("SUPABASE_URL is empty in .env.local (e.g. https://abcdefgh.supabase.co).");
if (!token) fail("SUPABASE_ACCESS_TOKEN is empty in .env.local (a personal access token starting with sbp_).");
const ref = new URL(url).hostname.split(".")[0];

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

// Create or update the admin user.
const [{ has_admin }] = await sql<Array<{ has_admin: boolean }>>(
  `select exists (select 1 from public.users where username = ${literal(adminUsername)}) as has_admin`,
);

if (!has_admin || resetAdmin) {
  const hash = literal(hashPassword(adminPassword));
  await sql(
    `insert into public.users (username, password_hash, role)
     values (${literal(adminUsername)}, ${hash}, 'admin')
     on conflict (username) do update set password_hash = excluded.password_hash, role = 'admin'`,
  );
  console.log(`  ${has_admin ? "reset" : "create"} admin user: ${adminUsername}`);
  if (has_admin) console.log("  Tip: you can now blank ADMIN_PASSWORD in .env.local.");
} else {
  console.log(`  keep   existing admin user: ${adminUsername} (use --reset-admin to change password)`);
}

console.log("\nDone. Start the app with: npm run dev");
