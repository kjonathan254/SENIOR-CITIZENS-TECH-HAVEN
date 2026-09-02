# 🧪 Testing Guide for Senior Citizens Tech Haven

## Quick Start

Run all tests with:
```bash
npm test
```

## What Tests Are Included?

### 1. Sensitive Data Detection (`tests/sensitive-data.test.js`)

**Purpose**: Ensures Elsah AI blocks users from accidentally sharing personal information like M-Pesa PINs, ID numbers, and phone numbers.

**What it tests**:
- ✅ M-Pesa PIN detection (4-digit numbers)
- ✅ Kenyan National ID detection (8-9 digits)
- ✅ Phone number detection (Safaricom 07xx, Airtel 01xx, +254 format)
- ✅ Bank account numbers (9-18 digits)
- ✅ Credit card numbers (with/without spaces or dashes)
- ✅ Normal questions are NOT blocked (false positives)
- ✅ Swahili language support
- ✅ Mixed English-Swahili messages

**Why this matters**: 
Seniors might accidentally share sensitive info thinking the AI is a human. These tests ensure the safety net works before every code change.

## How to Add New Tests

1. Create a new test file in the `tests/` folder
2. Use the same simple test framework (no complex setup needed)
3. Follow the pattern: `test('description', () => { ... })`
4. Run with `npm test`

### Example: Adding a Test

```javascript
test('Should detect new scam pattern', () => {
  const result = detectSensitiveData('Send money to 0712345678 now!');
  expect(result.detected).toBeTruthy();
});
```

## Understanding Test Results

### ✅ All Tests Pass
```
📊 Test Results: 24 passed, 0 failed
✅ All tests passed! Sensitive data detection is working correctly.
```
This means your changes are safe to deploy.

### ❌ Some Tests Fail
```
📊 Test Results: 20 passed, 4 failed
❌ Some tests failed. Please review the sensitive data detection logic.
```
**STOP!** Do not deploy until you fix the failing tests. Something broke the safety features.

## Known Limitations

The tests document some intentional trade-offs:

1. **Year numbers (e.g., 1990)** may be flagged as PINs - This is acceptable because safety is more important than convenience.

2. **Credit card patterns** may match as PINs first - Still blocked, which is safe.

3. **Phone numbers with +254** may match as bank accounts - Still blocked, which is safe.

**Philosophy**: It's better to block a few legitimate questions than to let sensitive data through.

## When to Run Tests

- ✅ Before making any code changes (baseline)
- ✅ After adding new features
- ✅ Before deploying to Netlify
- ✅ When fixing bugs

## Future Test Plans

Next tests to add (in priority order):
1. Knowledge base search functionality
2. Helpline number display
3. Error handling and fallback modes
4. Rate limiting (when implemented)
5. Accessibility features

---

**Remember**: Tests protect our senior users from mistakes. Never skip them! 🛡️
