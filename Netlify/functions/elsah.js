// netlify/functions/elsah.js
// Elsah AI Backend — Groq API Integration
// For Senior Citizens Tech Haven

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

    // Get API key from environment variables (set in Netlify dashboard)
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      console.error('GROQ_API_KEY not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Elsah is taking a short break. Please try again in a few minutes.' 
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
        model: 'llama3-8b-8192', // Fast, good for this use case
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq API error:', errorText);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ 
          error: 'Elsah is taking a short break right now, but she will be back soon! In the meantime, you can browse our free guides below or call us on 0115 258 958 for immediate help. Thank you for your patience! 🙏' 
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
          error: 'Elsah is taking a short break right now, but she will be back soon! In the meantime, you can browse our free guides below or call us on 0115 258 958 for immediate help. Thank you for your patience! 🙏' 
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply: reply })
    };

  } catch (error) {
    console.error('Elsah function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Elsah is taking a short break right now, but she will be back soon! In the meantime, you can browse our free guides below or call us on 0115 258 958 for immediate help. Thank you for your patience! 🙏' 
      })
    };
  }
};
