// netlify/functions/elsah.js
// Elsah AI Backend — Groq API Integration with Local Knowledge Base
// For Senior Citizens Tech Haven
// Strategy: Site-First (Local KB) → Groq-Second (Fallback) → Offline Mode

const fs = require('fs');
const path = require('path');

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
 * Search local knowledge base for matching questions
 * Uses keyword matching on topics and question text
 */
function searchKnowledgeBase(userQuestion) {
  if (!knowledgeBase || !knowledgeBase.entries) {
    return null;
  }
  
  const normalizedQuestion = userQuestion.toLowerCase().trim();
  const questionWords = normalizedQuestion.split(/\s+/).filter(word => word.length > 3);
  
  // Find best match based on keyword overlap
  let bestMatch = null;
  let bestScore = 0;
  
  for (const entry of knowledgeBase.entries) {
    let score = 0;
    
    // Check if question words match entry topics
    entry.topics.forEach(topic => {
      if (normalizedQuestion.includes(topic.toLowerCase())) {
        score += 3;
      }
    });
    
    // Check if question words match entry question
    const entryWords = entry.question.toLowerCase().split(/\s+/).filter(word => word.length > 3);
    questionWords.forEach(word => {
      if (entry.question.toLowerCase().includes(word)) {
        score += 1;
      }
    });
    
    // Exact phrase match gets highest priority
    if (entry.question.toLowerCase().includes(normalizedQuestion)) {
      score += 10;
    }
    
    if (score > bestScore && score >= 3) {
      bestScore = score;
      bestMatch = entry;
    }
  }
  
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
  
  try {
    // Parse the incoming message
    const { message, history } = JSON.parse(event.body);
    
    if (!message || message.trim().length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Please type a message for Elsah.' })
      };
    }
    
    // STEP 1: Search local knowledge base first
    const localMatch = searchKnowledgeBase(message);
    
    if (localMatch) {
      // Found answer in local KB - return immediately (fast, free, works offline)
      console.log(`✅ Found local answer for: "${message.substring(0, 50)}..."`);
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
          suggestion: 'You can browse our free guides or call us on 0115 258 958 for help.'
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
- If you don't know something, suggest calling the helpline: 0115 258 958

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
    
    // Call Groq API
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
        max_tokens: 500
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
          error: 'Elsah is taking a short break right now, but she will be back soon! In the meantime, you can browse our free guides below or call us on 0115 258 958 for immediate help. Thank you for your patience! 🙏',
          source: 'groq-error'
        })
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
          error: 'Elsah is taking a short break right now, but she will be back soon! In the meantime, you can browse our free guides below or call us on 0115 258 958 for immediate help. Thank you for your patience! 🙏',
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
        error: 'Elsah is taking a short break right now, but she will be back soon! In the meantime, you can browse our free guides below or call us on 0115 258 958 for immediate help. Thank you for your patience! 🙏',
        source: 'error'
      })
    };
  }
};
