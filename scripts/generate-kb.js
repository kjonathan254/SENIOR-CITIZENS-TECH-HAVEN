// Script to extract knowledge base from HTML articles
// Run this with Node.js to generate elsah-kb.json

const fs = require('fs');
const path = require('path');

// Get all HTML files
const htmlFiles = fs.readdirSync('/workspace').filter(file => file.endsWith('.html'));

const knowledgeBase = [];

htmlFiles.forEach(file => {
  if (file === '404.html' || file === 'offline.html') return; // Skip error pages
  
  const filePath = path.join('/workspace', file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Extract title
  const titleMatch = content.match(/<title>([^<]+)<\/title>/);
  const title = titleMatch ? titleMatch[1].replace('| Senior Citizens Tech Haven', '').trim() : '';
  
  // Extract meta description
  const descMatch = content.match(/<meta name="description" content="([^"]+)"/);
  const description = descMatch ? descMatch[1] : '';
  
  // Extract main content (between <main> and </main> or <article> and </article>)
  let mainContent = '';
  const mainMatch = content.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const articleMatch = content.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  
  if (mainMatch) {
    mainContent = mainMatch[1];
  } else if (articleMatch) {
    mainContent = articleMatch[1];
  }
  
  // Strip HTML tags for plain text
  const plainText = mainContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Extract headings (h2, h3) for topic identification
  const h2Matches = [...content.matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi)].map(m => m[1]);
  const h3Matches = [...content.matchAll(/<h3[^>]*>([^<]+)<\/h3>/gi)].map(m => m[1]);
  
  // Generate keywords from title and headings
  const keywords = [
    ...title.toLowerCase().split(/\s+/),
    ...h2Matches.flatMap(h => h.toLowerCase().split(/\s+/)),
    ...h3Matches.flatMap(h => h.toLowerCase().split(/\s+/))
  ].filter(word => word.length > 3 && !['that', 'this', 'with', 'from', 'have', 'been', 'were', 'will', 'your', 'they', 'their'].includes(word));
  
  // Create Q&A pairs based on common senior questions
  const qaPairs = [];
  
  // Add general question about the topic
  if (title) {
    qaPairs.push({
      question: `How do I ${title.toLowerCase()}?`,
      answer: `${description} For detailed steps, please visit our guide at ${file}.`,
      source: file,
      topics: keywords.slice(0, 10)
    });
    
    qaPairs.push({
      question: `Tell me about ${title.toLowerCase()}`,
      answer: `${description} We have a complete guide covering this topic. You can read it here: ${file}`,
      source: file,
      topics: keywords.slice(0, 10)
    });
  }
  
  // Add specific questions from h2 headings
  h2Matches.forEach(h2 => {
    const cleanH2 = h2.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    if (cleanH2.length > 5) {
      qaPairs.push({
        question: `How do I ${cleanH2.toLowerCase()}?`,
        answer: `This is covered in our ${title} guide. ${description}`,
        source: file,
        topics: keywords.slice(0, 10)
      });
    }
  });
  
  // Add M-Pesa specific FAQs if relevant
  if (content.toLowerCase().includes('mpesa') || content.toLowerCase().includes('m-pesa')) {
    qaPairs.push({
      question: 'How do I reverse M-Pesa?',
      answer: 'To reverse an M-Pesa transaction: 1) Dial *334# 2) Select "My Account" 3) Choose "Reverse Transaction" 4) Enter details. If you need help, call us at 0115 258 958.',
      source: file,
      topics: ['mpesa', 'reverse', 'transaction', 'money']
    });
    
    qaPairs.push({
      question: 'Is this M-Pesa message real?',
      answer: 'Never trust SMS messages asking for your PIN. Official M-Pesa messages come from 334 or similar short codes. When in doubt, call Safaricom on 100 or our helpline 0115 258 958.',
      source: file,
      topics: ['mpesa', 'scam', 'sms', 'pin', 'safety']
    });
  }
  
  // Add smartphone/WhatsApp FAQs if relevant
  if (content.toLowerCase().includes('whatsapp')) {
    qaPairs.push({
      question: 'How do I increase font size on WhatsApp?',
      answer: 'On WhatsApp: Go to Settings > Chats > Font Size > Large. On your phone: Settings > Display > Font Size. Call us at 0115 258 958 if you need help!',
      source: file,
      topics: ['whatsapp', 'font', 'size', 'display']
    });
    
    qaPairs.push({
      question: 'How do I block spam on WhatsApp?',
      answer: 'To block spam: Open the chat > Tap contact name > Scroll down > Block. Never share your verification code with anyone.',
      source: file,
      topics: ['whatsapp', 'block', 'spam', 'safety']
    });
  }
  
  // Add eCitizen FAQs if relevant
  if (content.toLowerCase().includes('ecitizen')) {
    qaPairs.push({
      question: 'How do I login to eCitizen?',
      answer: 'Visit ecitizen.go.ke, click Login, enter your ID number and password. If you forgot your password, use "Forgot Password" link. Need help? Call 0115 258 958.',
      source: file,
      topics: ['ecitizen', 'login', 'id', 'password']
    });
  }
  
  knowledgeBase.push(...qaPairs);
});

// Remove duplicates based on question
const uniqueKB = [];
const seenQuestions = new Set();

knowledgeBase.forEach(item => {
  const normalizedQuestion = item.question.toLowerCase().trim();
  if (!seenQuestions.has(normalizedQuestion)) {
    seenQuestions.add(normalizedQuestion);
    uniqueKB.push(item);
  }
});

// Sort by relevance (M-Pesa and safety first)
uniqueKB.sort((a, b) => {
  const priorityTopics = ['mpesa', 'scam', 'safety', 'pin', 'reversal'];
  const aScore = a.topics.filter(t => priorityTopics.includes(t)).length;
  const bScore = b.topics.filter(t => priorityTopics.includes(t)).length;
  return bScore - aScore;
});

// Write to JSON file
const output = {
  version: '1.0',
  generated: new Date().toISOString(),
  totalEntries: uniqueKB.length,
  entries: uniqueKB
};

fs.writeFileSync('/workspace/data/elsah-kb.json', JSON.stringify(output, null, 2));

console.log(`✅ Knowledge Base generated successfully!`);
console.log(`📊 Total Q&A pairs: ${uniqueKB.length}`);
console.log(`💾 Saved to: /workspace/data/elsah-kb.json`);
