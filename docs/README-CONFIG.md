# Configuration Guide for Senior Citizens Tech Haven

## Environment Variables

This project uses environment variables to manage configuration settings that may change between development and production.

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `HELPLINE_NUMBER` | The helpline phone number displayed to users | `0115 258 958` |
| `GROQ_API_KEY` | API key for Elsah AI assistant (get from https://console.groq.com) | `gsk_...` |

## Setup Instructions

### For Local Development

1. **Copy the example file**:
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env`** with your values:
   ```
   HELPLINE_NUMBER=0115 258 958
   GROQ_API_KEY=your_actual_api_key_here
   ```

3. **Start your local server** (the `.env` file will be loaded automatically)

### For Netlify Deployment

1. Go to your Netlify dashboard
2. Navigate to **Site Settings** → **Environment Variables**
3. Add the following variables:
   - `HELPLINE_NUMBER` = `0115 258 958`
   - `GROQ_API_KEY` = your Groq API key

**Note**: The `netlify.toml` file already includes a default `HELPLINE_NUMBER` for builds, but you should still set it in Netlify's environment variables for consistency.

## Files Updated

The helpline number is now centralized and used in:
- ✅ `netlify/functions/elsah.js` - AI assistant responses
- ✅ `scripts/generate-kb.js` - Knowledge base generation
- ✅ `netlify.toml` - Build configuration

Static HTML files still contain hardcoded numbers and will need manual updates if the helpline changes.

## Security Notes

- ⚠️ **Never commit `.env` to Git** - it's already in `.gitignore`
- ✅ `.env.example` is safe to commit (contains placeholder values)
- 🔒 Store API keys only in Netlify's environment variables or your local `.env` file
