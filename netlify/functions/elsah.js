// netlify/functions/elsah.js
// Elsah AI Backend — Groq API Integration with Local Knowledge Base
// For Senior Citizens Tech Haven
// Strategy: Site-First (Local KB) → Groq-Second (Fallback) → Offline Mode

const fs = require('fs');
const path = require('path');

// Simple in-memory rate limiting store (per IP address)
// Stores: { ip: { count: number, resetTime: timestamp } }
const rateLimitStore = new Map();

// Rate limit configuration: 10 requests per minute per IP
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const RATE_LIMIT_MAX_REQUESTS = 10; // max requests per window

/**
 * Check if an IP address has exceeded the rate limit
 * Returns: { allowed: boolean, remaining: number, resetTime: number }
 */
function checkRateLimit(ipAddress) {
  const now = Date.now();
  const existing = rateLimitStore.get(ipAddress);
  
  // If no existing record or window has expired, start fresh
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
  
  // Window still active
  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetTime: existing.resetTime
    };
  }
  
  // Increment counter
  existing.count++;
  rateLimitStore.set(ipAddress, existing);
  
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - existing.count,
    resetTime: existing.resetTime
  };
}

// Get helpline number from environment variable (configured in netlify.toml or .env)
const HELPLINE_NUMBER = process.env.HELPLINE_NUMBER || '0115 258 958';

// Load knowledge base at startup (cached in memory)
let knowledgeBase = null;
try {
  const kbPath = path.join(__dirname, '..', 'data', 'elsah-kb.json');
  if (fs.existsSync(kbPath)) {
    knowledgeBase = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
    console.log(`✅ Loaded ${knowledgeBase.totalEntries} Q&A pairs from local knowledge base`);
  } else {
    console.warn('⚠️ Knowledge base file not found. Will use Groq only.');
  }
} catch (error) {
  console.error('❌ Error loading knowledge base:', error.message);
}

/**
 * Calculate Levenshtein Distance between two strings
 * Measures how many single-character edits needed to change one word into another
 * Used for fuzzy matching (handling typos)
 */
function calculateLevenshteinDistance(str1, str2) {
  const matrix = [];
  
  // Initialize matrix
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill matrix
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Normalize text for comparison
 * - Convert to lowercase
 * - Remove punctuation
 * - Trim whitespace
 */
function normalizeText(text) {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')  // Replace punctuation with space
    .replace(/\s+/g, ' ')      // Collapse multiple spaces
    .trim();
}

/**
 * Get Swahili and Kenyan slang synonyms for tech terms
 * Maps local language to English tech terminology
 */
function getSwahiliSynonyms() {
  return {
    // Money-related
    'pesa': 'money',
    'bob': 'money',
    'shillings': 'money',
    'cash': 'money',
    'fedha': 'money',
    
    // Phone-related
    'simu': 'phone',
    'telephone': 'phone',
    'mobile': 'phone',
    'cell': 'phone',
    
    // Action verbs
    'piga': 'call',
    'ita': 'call',
    'tuma': 'send',
    'peleka': 'send',
    'toa': 'withdraw',
    'chukua': 'withdraw',
    'lipa': 'pay',
    'maliza': 'pay',
    'fungua': 'open',
    'funga': 'close',
    'weka': 'put',
    'ondoa': 'remove',
    
    // General tech
    'screen': 'display',
    'onyesha': 'show',
    'ficha': 'hide',
    'andika': 'write',
    'soma': 'read',
    'jibu': 'answer',
    'swali': 'question',
    'saedhi': 'help',
    'msaidie': 'help',
    
    // Common misspellings/variations
    'whatsap': 'whatsapp',
    'watsap': 'whatsapp',
    'wasap': 'whatsapp',
    'mpesa': 'm-pesa',
    'm pesa': 'm-pesa',
    'ecitizen': 'e-citizen',
    'e citizen': 'e-citizen'
  };
}

/**
 * Search local knowledge base for matching questions
 * Uses fuzzy matching, Swahili synonyms, and smart scoring
 */
function searchKnowledgeBase(userQuestion) {
  if (!knowledgeBase || !knowledgeBase.entries) {
    return null;
  }
  
  const normalizedQuestion = normalizeText(userQuestion);
  const questionWords = normalizedQuestion.split(/\s+/).filter(word => word.length > 2);
  const synonyms = getSwahiliSynonyms();
  
  // Expand question words with synonyms
  const expandedWords = [];
  questionWords.forEach(word => {
    expandedWords.push(word);
    if (synonyms[word]) {
      expandedWords.push(synonyms[word]);
    }
  });
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const entry of knowledgeBase.entries) {
    let score = 0;
    const normalizedEntryQuestion = normalizeText(entry.question);
    const entryWords = normalizedEntryQuestion.split(/\s+/).filter(word => word.length > 2);
    
    // Check topic matches
    entry.topics.forEach(topic => {
      const normalizedTopic = normalizeText(topic);
      if (normalizedQuestion.includes(normalizedTopic)) {
        score += 5; // Topic match is strong
      }
      
      // Fuzzy match for topics
      questionWords.forEach(qWord => {
        if (qWord.length > 3) {
          const distance = calculateLevenshteinDistance(qWord, normalizedTopic);
          if (distance <= 2 && distance > 0) {
            score += 3; // Close match (typo)
          }
        }
      });
    });
    
    // Check question word matches with scoring
    expandedWords.forEach(word => {
      // Exact match in entry question
      if (normalizedEntryQuestion.includes(word)) {
        score += 3;
      }
      
      // Fuzzy match for individual words
      if (word.length > 3) {
        entryWords.forEach(eWord => {
          const distance = calculateLevenshteinDistance(word, eWord);
          if (distance === 0) {
            score += 3; // Exact word match
          } else if (distance <= 2) {
            score += 2; // Close match (typo tolerance)
          }
        });
      }
    });
    
    // Exact phrase match gets highest priority
    if (normalizedEntryQuestion.includes(normalizedQuestion) || 
        normalizedQuestion.includes(normalizedEntryQuestion)) {
      score += 15;
    }
    
    // Synonym boost - if user used Swahili/slang and we matched English equivalent
    questionWords.forEach(qWord => {
      if (synonyms[qWord]) {
        const englishEquivalent = synonyms[qWord];
        if (normalizedEntryQuestion.includes(englishEquivalent)) {
          score += 4; // Bonus for cross-language understanding
        }
      }
    });
    
    if (score > bestScore && score >= 5) {
      bestScore = score;
      bestMatch = entry;
    }
  }
  
  console.log(`🔍 Search score: ${bestScore} for query "${userQuestion.substring(0, 30)}..."`);
  return bestMatch;
}

exports.handler = async (event, context) => {
  // CORS headers for browser requests
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
  
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed. Please use POST.' })
    };
  }
  
  // Get client IP address for rate limiting
  const clientIP = event.headers['x-forwarded-for']?.split(',')[0]?.trim() 
                || event.headers['client-ip'] 
                || 'unknown';

  // Check rate limit before processing
  const rateLimitResult = checkRateLimit(clientIP);
  
  if (!rateLimitResult.allowed) {
    const waitMinutes = Math.ceil((rateLimitResult.resetTime - Date.now()) / 60000);
    console.warn(`⚠️ Rate limit exceeded for IP: ${clientIP}`);
    return {
      statusCode: 429,
      headers: {
        ...headers,
        'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000))
      },
      body: JSON.stringify({ 
        error: `You've made too many requests recently. Please wait ${waitMinutes} minute(s) before trying again.`,
        source: 'rate-limit',
        suggestion: `Take a break and browse our guides, or call us at ${HELPLINE_NUMBER} for help.`
      })
    };
  }

  try {
    // Parse the incoming message
    const { message, history, stream } = JSON.parse(event.body);
    
    if (!message || message.trim().length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Please type a message for Elsah.' })
      };
    }
    
    // STEP 0: Safety Check - Block sensitive personal information
    const sensitivePatterns = [
      { name: 'M-Pesa PIN', pattern: /\b\d{4}\b/, description: '4-digit PIN' },
      { name: 'National ID', pattern: /\b\d{8,9}\b/, description: 'ID number' },
      { name: 'Phone Number', pattern: /\b(?:\+254|0)?[71]\d{8}\b/, description: 'phone number' },
      { name: 'Bank Account', pattern: /\b\d{9,18}\b/, description: 'account number' },
      { name: 'Credit Card', pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, description: 'card number' }
    ];
    
    for (const { name, pattern, description } of sensitivePatterns) {
      if (pattern.test(message)) {
        console.warn(`⚠️ Blocked sensitive data (${name}) in message`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            reply: `⚠️ **Important Safety Alert**\n\nI noticed you might be sharing your ${description}. Please **never share** your ${name}, ID number, passwords, or bank details with anyone - including me!\n\nI am an AI and cannot keep secrets. If someone asked you to send this information, it might be a scam.\n\n💡 **What to do instead:**\n- Delete any messages containing personal numbers\n- Never share your M-Pesa PIN with anyone\n- Call your family before sending money to unfamiliar numbers\n- For help, call our helpline: ${HELPLINE_NUMBER}\n\nYou can ask me tech questions without sharing personal details. How else can I help you today?`,
            source: 'safety-warning',
            confidence: 'high'
          })
        };
      }
    }
    
    // STEP 1: Search local knowledge base first
    const localMatch = searchKnowledgeBase(message);
    
    if (localMatch) {
      // Found answer in local KB - return immediately (fast, free, works offline)
      console.log(`✅ Found local answer for: "${message.substring(0, 50)}..."`);
      
      // If streaming is requested, still stream the local response
      if (stream) {
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          },
          body: JSON.stringify({ 
            reply: localMatch.answer,
            source: 'local',
            sourceUrl: localMatch.source,
            confidence: 'high'
          })
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          reply: localMatch.answer,
          source: 'local',
          sourceUrl: localMatch.source,
          confidence: 'high'
        })
      };
    }
    
    console.log(`🔍 No local match found for: "${message.substring(0, 50)}...". Falling back to Groq.`);
    
    // STEP 2: Fall back to Groq AI for questions outside our knowledge base
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      console.error('GROQ_API_KEY not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Elsah is taking a short break. Please try again in a few minutes.',
          source: 'error',
          suggestion: 'You can browse our free guides or call us on ${HELPLINE_NUMBER} for help.'
        })
      };
    }
    
    // Build the conversation history for Groq
    const messages = [
      {
        role: 'system',
        content: `You are Elsah, a warm, patient AI assistant for Senior Citizens Tech Haven — a digital literacy platform for older Kenyans. 

Your personality:
- Friendly and encouraging, like a helpful granddaughter
- Never use technical jargon — explain everything in plain language
- Use Kenyan context (M-Pesa, Safaricom, WhatsApp, eCitizen)
- Be concise but thorough — short paragraphs, numbered steps
- Always reassure users that mistakes are normal and fixable
- If asked about scams, emphasize: never share M-Pesa PIN, never send money without calling family first
- Use occasional Swahili phrases (Habari, Asante, Pole) when appropriate
- If you don't know something, suggest calling the helpline: ${HELPLINE_NUMBER}

You help with: smartphones, M-Pesa, WhatsApp, email, online safety, eCitizen, health apps, and general technology questions.`
      }
    ];
    
    // Add conversation history if provided
    if (history && Array.isArray(history)) {
      history.forEach(msg => {
        if (msg.role && msg.content) {
          messages.push({ role: msg.role, content: msg.content });
        }
      });
    }
    
    // Add the current user message
    messages.push({ role: 'user', content: message });
    
    // Call Groq API with streaming support
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        reasoning_effort: 'low',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
        stream: stream || false
      })
    });
    
    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq API error:', errorText);
      
      // STEP 3: Groq is down - try to provide a helpful response from local KB anyway
      const partialMatch = searchKnowledgeBase(message);
      if (partialMatch) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            reply: `${partialMatch.answer}\n\n(Note: I'm having trouble connecting to my AI brain right now, but I found this in our guides!)`,
            source: 'local-fallback',
            sourceUrl: partialMatch.source,
            confidence: 'medium'
          })
        };
      }
      
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ 
          error: 'Elsah is taking a short break right now, but she will be back soon! In the meantime, you can browse our free guides below or call us on ${HELPLINE_NUMBER} for immediate help. Thank you for your patience! 🙏',
          source: 'groq-error'
        })
      };
    }
    
    // Handle streaming response
    if (stream && groqResponse.body) {
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        },
        body: groqResponse.body
      };
    }
    
    const data = await groqResponse.json();
    
    // Extract the AI response
    const reply = data.choices?.[0]?.message?.content;
    
    if (!reply) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Elsah is taking a short break right now, but she will be back soon! In the meantime, you can browse our free guides below or call us on ${HELPLINE_NUMBER} for immediate help. Thank you for your patience! 🙏',
          source: 'no-reply'
        })
      };
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        reply: reply,
        source: 'groq',
        confidence: 'high'
      })
    };
    
  } catch (error) {
    console.error('Elsah function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Elsah is taking a short break right now, but she will be back soon! In the meantime, you can browse our free guides below or call us on ${HELPLINE_NUMBER} for immediate help. Thank you for your patience! 🙏',
        source: 'error'
      })
    };
  }
};
