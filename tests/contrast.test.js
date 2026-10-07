import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Guards the colour tokens in src/styles.css against accidental contrast regressions.
// Text needs 4.5:1 (WCAG 2.1 AA). Interface boundaries and focus rings need 3:1.

const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const rootBlock = css.slice(css.indexOf(':root'), css.indexOf('}', css.indexOf(':root')));
const tokens = Object.fromEntries(
  [...rootBlock.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1], m[2]]),
);

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const textPairs = [
  ['ink', 'bg'],
  ['ink', 'surface'],
  ['muted', 'bg'],
  ['muted', 'surface'],
  ['accent-ink', 'accent'],
  ['accent', 'surface'],
  ['accent', 'accent-soft'],
  ['ok', 'ok-bg'],
  ['bad', 'bad-bg'],
  ['bad', 'surface'],
  ['warn', 'warn-bg'],
  ['info', 'info-bg'],
  ['info', 'surface'],
  ['info', 'bg'],
];
const boundaryPairs = [
  ['line-strong', 'surface'],
  ['line-strong', 'bg'],
  ['focus', 'surface'],
  ['focus', 'bg'],
  ['warn-line', 'warn-bg'],
];

describe('colour tokens', () => {
  it('parses the expected tokens', () => {
    expect(tokens.ink).toBeDefined();
    expect(Object.keys(tokens).length).toBeGreaterThan(15);
  });
  it.each(textPairs)('text %s on %s meets 4.5:1', (fg, bg) => {
    expect(ratio(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(4.5);
  });
  it.each(boundaryPairs)('boundary %s on %s meets 3:1', (fg, bg) => {
    expect(ratio(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(3);
  });
  it('button hover colour keeps white text readable', () => {
    expect(ratio('#45291b', '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });
});
