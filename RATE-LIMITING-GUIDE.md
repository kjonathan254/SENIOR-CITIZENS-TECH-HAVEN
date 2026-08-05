# Rate Limiting Implementation Guide

## ✅ What Was Done

Rate limiting has been successfully added to the Elsah AI function to protect against abuse and excessive API costs.

## How It Works

### Configuration
- **Limit**: 10 requests per minute per IP address
- **Window**: 60 seconds (resets every minute)
- **Storage**: In-memory (per server instance)

### User Experience

**Normal Usage (Under Limit):**
- Requests process normally
- User sees remaining count in headers

**When Limit Exceeded:**
- User receives HTTP 429 (Too Many Requests)
- Friendly error message: "You've made too many requests recently. Please wait X minute(s) before trying again."
- Suggestion to browse guides or call helpline: 0115 258 958
- `Retry-After` header tells browser when to try again

## Code Changes

### File: `netlify/functions/elsah.js`

**Added at top (lines 9-63):**
```javascript
// Rate limiting store and configuration
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // per IP

// checkRateLimit() function
```

**Added in handler (lines 147-171):**
```javascript
// Get client IP
const clientIP = event.headers['x-forwarded-for']?.split(',')[0]?.trim() 
              || event.headers['client-ip'] 
              || 'unknown';

// Check and enforce rate limit
const rateLimitResult = checkRateLimit(clientIP);
if (!rateLimitResult.allowed) {
  // Return 429 with friendly message
}
```

## Testing

Run the manual test:
```bash
node tests/rate-limit-manual-test.mjs
```

Expected output:
```
Request 1-10: ✅ ALLOWED
Request 11-12: ❌ BLOCKED
```

## Why This Matters

### For Seniors Using the Site:
- Prevents accidental rapid clicking from blocking legitimate use
- Ensures the service stays available for everyone
- Protects their personal data from being harvested by bots

### For You (Site Owner):
- **Cost Protection**: Groq API charges per request - rate limiting prevents runaway costs
- **Service Stability**: Prevents one user from overwhelming the system
- **Security**: Makes it harder for attackers to spam or scrape your content

## Limitations & Future Improvements

**Current Limitations:**
1. In-memory storage resets when Netlify redeploys
2. Not distributed across multiple servers (but Netlify Functions are single-instance)
3. IP-based (could affect users behind same NAT, like office networks)

**Future Enhancements:**
- Add Redis for persistent storage across restarts
- Implement user authentication for higher limits
- Add analytics dashboard to monitor usage patterns
- Consider different limits for different endpoints

## Monitoring

Check Netlify Functions logs to see rate limiting in action:
```
⚠️ Rate limit exceeded for IP: 192.168.1.100
```

## What's Next?

The site is now protected against:
✅ Accidental excessive requests
✅ Malicious bot attacks  
✅ Runaway API costs

Ready to proceed to Phase 3: Accessibility improvements or Knowledge Base search enhancements!
