// Sanity checks for password hashing: npm run check:auth
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../src/lib/password.ts";

const hash = hashPassword("correct horse battery staple");
assert.ok(hash.startsWith("scrypt$"));
assert.notEqual(hash, hashPassword("correct horse battery staple"), "salted: same password hashes differently");
assert.equal(verifyPassword("correct horse battery staple", hash), true);
assert.equal(verifyPassword("wrong", hash), false);
assert.equal(verifyPassword("", hash), false);
assert.equal(verifyPassword("x", "not-a-hash"), false);
console.log("auth checks passed");
