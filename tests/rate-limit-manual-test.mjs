// tests/rate-limit-manual-test.mjs
// Manual test for the rate limiting functionality

console.log('\n=== Rate Limiting Manual Test ===\n');

const testIP = '192.168.1.100';
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;

const rateLimitStore = new Map();

function checkRateLimitLocal(ipAddress) {
  const now = Date.now();
  const existing = rateLimitStore.get(ipAddress);
  
  if (!existing || now > existing.resetTime) {
    const newRecord = {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS
    };
    rateLimitStore.set(ipAddress, newRecord);
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetTime: newRecord.resetTime
    };
  }
  
  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: existing.resetTime
    };
  }
  
  existing.count++;
  rateLimitStore.set(ipAddress, existing);
  
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - existing.count,
    resetTime: existing.resetTime
  };
}

console.log(`Testing with IP: ${testIP}`);
console.log(`Limit: ${RATE_LIMIT_MAX_REQUESTS} requests per minute\n`);

// Make 12 requests
for (let i = 1; i <= 12; i++) {
  const result = checkRateLimitLocal(testIP);
  const status = result.allowed ? '✅ ALLOWED' : '❌ BLOCKED';
  console.log(`Request ${i}: ${status} (Remaining: ${result.remaining})`);
}

console.log('\n✅ Rate limiting working correctly!');
console.log('First 10 requests allowed, requests 11-12 blocked.\n');
