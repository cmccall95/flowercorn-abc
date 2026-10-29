import { createInterface } from 'node:readline';
import { hashPassword, normalizeEmail, parseUsers } from './auth.js';

// Adds an account to the USERS secret. The password is typed without being shown and never stored.
//   cd server && npm run build && npm run add-user
// Paste your current USERS value when asked (or leave it empty), and it prints the new value to save.

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string) => new Promise<string>((resolve) => rl.question(q, resolve));

function askHidden(q: string): Promise<string> {
  const out = process.stdout;
  const write = out.write.bind(out);
  return new Promise((resolve) => {
    write(q);
    // Hide what's typed.
    (out as { write: unknown }).write = () => true;
    rl.question('', (answer) => {
      (out as { write: unknown }).write = write;
      write('\n');
      resolve(answer);
    });
  });
}

const current = (await ask('Current USERS value (empty if none): ')).trim();
const users = current ? Object.fromEntries(parseUsers(current)) : {};
const email = normalizeEmail(await ask('Email: '));
const password = await askHidden('Password (at least 12 characters): ');
if (password !== (await askHidden('Same password again: '))) throw new Error('The passwords are different.');
if (password.length < 12) throw new Error('Use at least 12 characters.');
users[email] = await hashPassword(password);
rl.close();
console.log('\nNew USERS value (save it as an encrypted secret):\n');
console.log(JSON.stringify(users));
