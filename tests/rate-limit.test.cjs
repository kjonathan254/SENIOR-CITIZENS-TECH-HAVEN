// tests/rate-limit.test.cjs
// Real tests for the rate limiting functionality in Elsah AI (netlify/functions/elsah.cjs)
// Run with: node tests/rate-limit.test.cjs

const { test } = require('node:test');
const assert = require('node:assert');
const { checkRateLimit, _rateLimitStore } = require('../netlify/functions/elsah.cjs');

function freshIp(ip) {
  // unique IP per test so tests don't interfere with each other
  let n = 0;
  let candidate = ip;
  while (_rateLimitStore.has(candidate)) {
    n++;
    candidate = `${ip}#${n}`;
  }
  return candidate;
}

test('allows the first request and reports 9 remaining', () => {
  const ip = freshIp('10.1.1.1');
  const r = checkRateLimit(ip);
  assert.strictEqual(r.allowed, true);
  assert.strictEqual(r.remaining, 9);
});

test('allows requests up to the limit of 10 per window', () => {
  const ip = freshIp('10.1.1.2');
  for (let i = 0; i < 10; i++) {
    const r = checkRateLimit(ip);
    assert.strictEqual(r.allowed, true, `request ${i + 1} should be allowed`);
  }
  const blocked = checkRateLimit(ip);
  assert.strictEqual(blocked.allowed, false);
  assert.strictEqual(blocked.remaining, 0);
});

test('blocks the 11th request within the window', () => {
  const ip = freshIp('10.1.1.3');
  for (let i = 0; i < 10; i++) checkRateLimit(ip);
  const r = checkRateLimit(ip);
  assert.strictEqual(r.allowed, false);
  assert.ok(r.resetTime > Date.now(), 'resetTime should be in the future');
});

test('resets the window after it expires', () => {
  const ip = freshIp('10.1.1.4');
  for (let i = 0; i < 10; i++) checkRateLimit(ip);
  assert.strictEqual(checkRateLimit(ip).allowed, false);
  // simulate window expiry
  const rec = _rateLimitStore.get(ip);
  rec.resetTime = Date.now() - 1;
  const r = checkRateLimit(ip);
  assert.strictEqual(r.allowed, true);
  assert.strictEqual(r.remaining, 9);
});

test('tracks IPs independently', () => {
  const a = freshIp('10.1.2.1');
  const b = freshIp('10.1.2.2');
  for (let i = 0; i < 10; i++) checkRateLimit(a);
  assert.strictEqual(checkRateLimit(a).allowed, false);
  assert.strictEqual(checkRateLimit(b).allowed, true);
});
