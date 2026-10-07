import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Guards two house rules: no em dashes in any text, and no secrets or personal data in the repo.
// It checks the files git tracks or would track (everything not ignored).

const EM_DASH = String.fromCharCode(0x2014);

function trackedFiles() {
  const out = execSync('git ls-files --cached --others --exclude-standard', { encoding: 'utf8' });
  return out.split('\n').filter(Boolean).filter((f) => existsSync(f) && !/package-lock\.json$/.test(f));
}

const files = trackedFiles();
const text = (f) => readFileSync(f, 'utf8');

describe('repository hygiene', () => {
  it('finds source files to check', () => {
    expect(files.length).toBeGreaterThan(30);
    expect(files).toContain('README.md');
  });

  it('contains no em dashes anywhere', () => {
    const offenders = files.filter((f) => text(f).includes(EM_DASH));
    expect(offenders).toEqual([]);
  });

  it('contains no secrets, keys or private key material', () => {
    const patterns = [/sk-[A-Za-z0-9]{20,}/, /AKIA[0-9A-Z]{16}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i, /password\s*[:=]\s*['"][^'"]+['"]/i, /ghp_[A-Za-z0-9]{20,}/];
    const offenders = files.filter((f) => patterns.some((p) => p.test(text(f))));
    expect(offenders).toEqual([]);
  });

  it('contains no email addresses or phone numbers', () => {
    const email = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/;
    const phone = /\+\d{1,3}[\s-]?\d{2,4}[\s-]?\d{3,4}[\s-]?\d{3,4}/;
    const offenders = files.filter((f) => !f.startsWith('tests/repoHygiene') && (email.test(text(f)) || phone.test(text(f))));
    expect(offenders).toEqual([]);
  });

  it('ignores environment files and build output', () => {
    const ignore = text('.gitignore');
    for (const entry of ['node_modules/', 'dist/', '.env', '.vercel/']) expect(ignore).toContain(entry);
    expect(files.some((f) => /(^|\/)\.env/.test(f))).toBe(false);
  });

  it('declares no runtime dependencies beyond React', () => {
    const pkg = JSON.parse(text('package.json'));
    expect(Object.keys(pkg.dependencies).sort()).toEqual(['react', 'react-dom']);
    expect(Object.keys(pkg.devDependencies).sort()).toEqual(['@vitejs/plugin-react', 'vite', 'vitest']);
  });

  it('makes no network calls from the app code', () => {
    const src = files.filter((f) => f.startsWith('src/') && /\.(js|jsx)$/.test(f));
    const offenders = src.filter((f) => /\bfetch\(|XMLHttpRequest|WebSocket|navigator\.sendBeacon|https?:\/\/[^'"\s]*\/api\b/.test(text(f)));
    expect(offenders).toEqual([]);
  });
});
