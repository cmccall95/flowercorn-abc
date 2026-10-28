import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { newerThan } from './update';

const changelog = readFileSync('CHANGELOG.md', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

describe('versioning', () => {
  it('has a changelog entry for the current version at the top', () => {
    const first = changelog.match(/^## \[(.+?)\]/m)?.[1];
    expect(first).toBe(pkg.version);
  });

  it('compares versions number by number', () => {
    expect(newerThan('0.10.0', '0.9.9')).toBe(true);
    expect(newerThan('0.6.0', '0.6.0')).toBe(false);
    expect(newerThan('0.6.1', '1.0.0')).toBe(false);
  });
});
