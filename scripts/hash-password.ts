// Usage: npm run hash-password -- 'your long password'
// Prints a value for APP_PASSWORD_HASH. The format has no "$" characters,
// so it is safe in .env files (Next.js expands "$VAR" there).
import { hashPassword } from "../src/lib/password";

const pw = process.argv[2];
if (!pw || pw.length < 12) {
  console.error("Give a password of at least 12 characters: npm run hash-password -- 'your password'");
  process.exit(1);
}
console.log(await hashPassword(pw));
