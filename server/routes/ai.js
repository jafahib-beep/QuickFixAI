const express = require('express');
const OpenAI = require('openai');
const { pool } = require('../db');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

const router = express.Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

async function callOpenAI(endpoint, body) {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }
  
  const response = await fetch(`https://api.openai.com/v1/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API error');
  }
  
  return response.json();
}

router.post('/ask-ai', async (req, res) => {
  try {
    const { question, language = 'en' } = req.body;
    
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question is required' });
    }
    
    if (!openai) {
      return res.json({ 
        answer: 'AI service is not configured. Please check your OpenAI API key.' 
      });
    }
    
    const languageNames = {
      en: 'English',
      sv: 'Swedish',
      ar: 'Arabic',
      de: 'German',
      fr: 'French',
      ru: 'Russian'
    };
    const languageName = languageNames[language] || 'English';
    
    const systemPrompt = `You are QuickFix AI, a helpful DIY and home repair assistant. 
You provide concise, practical advice for fixing common household problems.
Keep responses under 300 words.
Be friendly and encouraging.
If a problem seems dangerous or requires professional help, say so.
Respond in ${languageName}.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ],
      temperature: 0.7,
      max_tokens: 500
    });
    
    const answer = completion.choices[0].message.content.trim();
    
    res.json({ answer });
  } catch (error) {
    console.error('Ask AI error:', error);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
});

/**
 * AI Chat endpoint - Fixed to properly handle:
 * 1. Text-only messages with conversation history
 * 2. Image uploads using OpenAI Vision (GPT-4o)
 * 3. Video context (asks user to describe since we can't process video directly)
 * 
 * FIX: Ensured proper message formatting for OpenAI API and added
 * better error handling with descriptive error messages.
 */
router.post('/chat', async (req, res) => {
  try {
    const { messages, language = 'en', imageBase64, videoFileName } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }
    
    if (!openai) {
      return res.json({ 
        answer: 'AI service is not configured. Please check your OpenAI API key.' 
      });
    }
    
    const languageNames = {
      en: 'English',
      sv: 'Swedish',
      ar: 'Arabic',
      de: 'German',
      fr: 'French',
      ru: 'Russian'
    };
    const languageName = languageNames[language] || 'English';
    
    const systemPrompt = `You are QuickFix AI, an experienced and friendly DIY technician assistant for a mobile app called QuickFix.

## Your Personality:
- You are like a helpful neighbor who happens to be a skilled handyman/technician
- Warm, patient, and encouraging - you make users feel confident they can fix things
- You speak naturally, not like a robot or manual

## Smart Question Flow (CRITICAL):
Before giving a full solution, you MUST gather enough information by asking 1-2 targeted follow-up questions. This helps you understand the exact problem.

### When to ask questions:
- The user describes a problem but details are missing (location, symptoms, what they've tried)
- You need to see the issue to diagnose it properly - ask for a photo
- The problem could have multiple causes and you need to narrow it down
- You're unsure about the user's skill level or available tools

### How to structure your response:
1. First, acknowledge their problem briefly (1-2 sentences showing you understand)
2. Then ask 1-2 specific, helpful questions to diagnose better
3. Keep it conversational - like a real technician would ask

### Examples of good follow-up questions:
- "Is the leak coming from the faucet handle, the base, or underneath the sink?"
- "Can you send me a photo of where you see the water dripping?"
- "How long has this been happening? Does it leak constantly or only when the water is running?"
- "Have you noticed any other issues, like low water pressure or strange sounds?"
- "What type of faucet do you have - is it a single handle or two handles?"

### When to give a direct solution (skip questions):
- The user has already provided very detailed information
- They've answered your previous questions and you have enough context
- It's a simple, obvious fix with only one possible solution
- They explicitly say "just tell me how to fix it"

## Response Guidelines:
- Keep responses concise (under 300 words)
- When you DO give solutions, break them into clear numbered steps
- Always mention if something requires professional help or is dangerous
- If user shares an image, analyze it carefully and use what you see to give specific advice
- Respond in ${languageName}

## Image Requests:
When a photo would really help diagnose the issue, explicitly ask:
"Could you take a photo of [specific thing]? That would help me see exactly what's going on."

Remember: A real technician asks questions first, diagnoses second, and fixes last. You should do the same!`;

    const formattedMessages = [
      { role: 'system', content: systemPrompt }
    ];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (!msg || !msg.role) continue;
      
      let messageContent = '';
      if (typeof msg.content === 'string') {
        messageContent = msg.content;
      } else if (Array.isArray(msg.content)) {
        messageContent = msg.content
          .map(c => {
            if (typeof c === 'string') return c;
            if (c?.type === 'text' && c?.text) return c.text;
            if (c?.type === 'output_text' && c?.text) return c.text;
            return '';
          })
          .filter(Boolean)
          .join(' ');
      } else if (msg.content && typeof msg.content === 'object') {
        messageContent = msg.content.text || msg.content.output || JSON.stringify(msg.content);
      }
      
      const isLastUserMessage = i === messages.length - 1 && msg.role === 'user';
      
      if (isLastUserMessage && imageBase64) {
        formattedMessages.push({
          role: 'user',
          content: [
            { type: 'text', text: messageContent || 'What can you see in this image? Please help me fix this problem.' },
            { 
              type: 'image_url', 
              image_url: { 
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: 'auto'
              } 
            }
          ]
        });
      } else if (isLastUserMessage && videoFileName) {
        const videoMessage = `${messageContent}\n\n[Note: The user has uploaded a video file named "${videoFileName}". Since I cannot watch videos directly, please ask the user to describe what's shown in the video, or suggest they take a screenshot of the key moment showing the problem.]`;
        formattedMessages.push({
          role: msg.role,
          content: videoMessage
        });
      } else {
        formattedMessages.push({
          role: msg.role,
          content: messageContent
        });
      }
    }

    console.log('[AI Chat] Processing request:', {
      messageCount: formattedMessages.length,
      hasImage: !!imageBase64,
      hasVideo: !!videoFileName,
      model: imageBase64 ? 'gpt-4o' : 'gpt-4o-mini'
    });

    const completion = await openai.chat.completions.create({
      model: imageBase64 ? 'gpt-4o' : 'gpt-4o-mini',
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 800
    });
    
    const answer = completion.choices[0]?.message?.content?.trim();
    
    if (!answer) {
      return res.status(500).json({ error: 'No response from AI' });
    }
    
    res.json({ answer });
  } catch (error) {
    console.error('Chat error:', error.message || error);
    const errorMessage = error.message?.includes('API key') 
      ? 'OpenAI API key is invalid or expired'
      : 'Failed to get AI response. Please try again.';
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * LiveAssist endpoint - Visual troubleshooting with AI
 * Accepts an image and returns a structured repair guide
 */
router.post('/liveassist', async (req, res) => {
  try {
    const { imageBase64, language = 'en' } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ error: 'Image is required' });
    }
    
    if (!openai) {
      return res.status(503).json({ 
        error: 'AI service is not configured. Please check your OpenAI API key.' 
      });
    }
    
    const languageNames = {
      en: 'English',
      sv: 'Swedish',
      ar: 'Arabic',
      de: 'German',
      fr: 'French',
      ru: 'Russian'
    };
    const languageName = languageNames[language] || 'English';
    
    const systemPrompt = `You are LiveAssist, an expert visual troubleshooting assistant for the QuickFix app.

Your job is to analyze images of home repair problems and provide instant, actionable guidance.

## Your Personality:
- You're a friendly, experienced technician who can diagnose problems from photos
- Confident but not condescending - you explain things clearly
- Safety-conscious - always mention if something is dangerous

## Response Structure (MUST FOLLOW):
When you see an image, respond with EXACTLY this format:

**What I See:**
[1-2 sentences describing what's visible in the image]

**Likely Issue:**
[1 sentence identifying the most probable problem]

**Steps to Fix:**
1. [First step]
2. [Second step]
3. [Third step]
[Continue with 3-6 total steps]

**Safety Note:** [Optional - only include if there's a safety concern]

## Guidelines:
- Be specific based on what you actually see in the image
- Keep steps practical and actionable
- If you can't clearly identify the problem, say what you need to see better
- If the repair is dangerous or complex, recommend a professional
- Respond in ${languageName}`;

    console.log('[LiveAssist] Processing image analysis request');
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: [
            { type: 'text', text: 'Please analyze this image and help me fix the problem.' },
            { 
              type: 'image_url', 
              image_url: { 
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: 'high'
              } 
            }
          ]
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });
    
    const answer = completion.choices[0]?.message?.content?.trim();
    
    if (!answer) {
      return res.status(500).json({ error: 'No response from AI' });
    }
    
    // Parse the response into structured format
    let summary = '';
    let possibleIssue = '';
    let steps = [];
    let safetyNote = '';
    
    // Extract "What I See:" section
    const seeMatch = answer.match(/\*\*What I See:\*\*\s*\n?([\s\S]*?)(?=\n\*\*|$)/i);
    if (seeMatch) {
      summary = seeMatch[1].trim();
    }
    
    // Extract "Likely Issue:" section
    const issueMatch = answer.match(/\*\*Likely Issue:\*\*\s*\n?([\s\S]*?)(?=\n\*\*|$)/i);
    if (issueMatch) {
      possibleIssue = issueMatch[1].trim();
    }
    
    // Extract "Steps to Fix:" section
    const stepsMatch = answer.match(/\*\*Steps to Fix:\*\*\s*\n?([\s\S]*?)(?=\n\*\*Safety|$)/i);
    if (stepsMatch) {
      const stepsText = stepsMatch[1].trim();
      const stepLines = stepsText.split('\n').filter(line => line.match(/^\d+\./));
      steps = stepLines.map((line, idx) => ({
        stepNumber: idx + 1,
        text: line.replace(/^\d+\.\s*/, '').trim()
      }));
    }
    
    // Extract "Safety Note:" if present
    const safetyMatch = answer.match(/\*\*Safety Note:\*\*\s*\n?([\s\S]*?)$/i);
    if (safetyMatch) {
      safetyNote = safetyMatch[1].trim();
    }
    
    console.log('[LiveAssist] Analysis complete:', { 
      hasSummary: !!summary, 
      hasIssue: !!possibleIssue, 
      stepsCount: steps.length 
    });
    
    res.json({
      success: true,
      analysis: {
        summary,
        possibleIssue,
        steps,
        safetyNote,
        rawResponse: answer
      }
    });
    
  } catch (error) {
    console.error('LiveAssist error:', error.message || error);
    const errorMessage = error.message?.includes('API key') 
      ? 'OpenAI API key is invalid or expired'
      : 'Failed to analyze image. Please try again.';
    res.status(500).json({ error: errorMessage });
  }
});

router.post('/suggest-tags', authMiddleware, async (req, res) => {
  try {
    const { title, description, category } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    if (!OPENAI_API_KEY) {
      const defaultTags = ['DIY', 'fix', 'home', category || 'repair'].filter(Boolean);
      return res.json({ tags: defaultTags });
    }
    
    const prompt = `Generate 5-8 relevant tags for a fix-it/how-to video.
Title: ${title}
Description: ${description || 'No description'}
Category: ${category || 'general'}

Return only a JSON array of lowercase tags, no other text. Example: ["plumbing", "faucet", "diy", "repair"]`;
    
    const response = await callOpenAI('chat/completions', {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 100
    });
    
    const content = response.choices[0].message.content.trim();
    const tags = JSON.parse(content);
    
    res.json({ tags: tags.slice(0, 8) });
  } catch (error) {
    console.error('Suggest tags error:', error);
    res.json({ tags: ['DIY', 'fix', 'repair', 'how-to'] });
  }
});

router.post('/generate-description', authMiddleware, async (req, res) => {
  try {
    const { title, category, tags } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    if (!OPENAI_API_KEY) {
      return res.json({ description: `Learn how to ${title.toLowerCase()}. Quick and easy fix!` });
    }
    
    const prompt = `Write a concise, helpful description (under 200 characters) for a fix-it video:
Title: ${title}
Category: ${category || 'general'}
Tags: ${(tags || []).join(', ') || 'none'}

The description should be practical, encouraging, and highlight the key benefit. Return only the description text.`;
    
    const response = await callOpenAI('chat/completions', {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 100
    });
    
    const description = response.choices[0].message.content.trim().replace(/^["']|["']$/g, '');
    
    res.json({ description: description.slice(0, 300) });
  } catch (error) {
    console.error('Generate description error:', error);
    res.json({ description: 'A quick and helpful fix-it tutorial.' });
  }
});

router.post('/moderate-content', authMiddleware, async (req, res) => {
  try {
    const { title, description, tags } = req.body;
    
    if (!OPENAI_API_KEY) {
      return res.json({ approved: true, reason: null });
    }
    
    const content = `${title} ${description || ''} ${(tags || []).join(' ')}`;
    
    const response = await callOpenAI('moderations', {
      input: content
    });
    
    const result = response.results[0];
    
    if (result.flagged) {
      const categories = Object.entries(result.categories)
        .filter(([_, flagged]) => flagged)
        .map(([category]) => category);
      
      return res.json({
        approved: false,
        reason: `Content flagged for: ${categories.join(', ')}`
      });
    }
    
    res.json({ approved: true, reason: null });
  } catch (error) {
    console.error('Moderation error:', error);
    res.json({ approved: true, reason: null });
  }
});

router.post('/generate-guide', optionalAuth, async (req, res) => {
  try {
    const { query, language = 'en', includeImages = true } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    const languageNames = {
      en: 'English',
      sv: 'Swedish',
      ar: 'Arabic',
      de: 'German',
      fr: 'French',
      ru: 'Russian'
    };
    const languageName = languageNames[language] || 'English';
    
    if (!OPENAI_API_KEY) {
      const fallbackSteps = [
        { stepNumber: 1, text: `Search for "${query}" tutorials online` },
        { stepNumber: 2, text: 'Watch video guides from verified experts' },
        { stepNumber: 3, text: 'Follow safety precautions for your specific situation' },
        { stepNumber: 4, text: 'If unsure, consult a professional' }
      ];
      return res.json({
        query,
        steps: fallbackSteps,
        images: [],
        language
      });
    }
    
    const stepsPrompt = `You are a helpful DIY and home repair assistant. Generate a step-by-step guide for the following problem in ${languageName}:

Problem: ${query}

Requirements:
- Generate 3-7 clear, actionable steps
- Each step should be concise (1-2 sentences)
- Focus on practical, safe solutions
- Include any necessary safety warnings
- Be specific about tools or materials needed

Return ONLY a JSON array of objects with "stepNumber" and "text" fields. Example:
[{"stepNumber": 1, "text": "Turn off the water supply valve under the sink."}, {"stepNumber": 2, "text": "..."}]`;

    const stepsResponse = await callOpenAI('chat/completions', {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: stepsPrompt }],
      temperature: 0.7,
      max_tokens: 800
    });
    
    let steps;
    try {
      const content = stepsResponse.choices[0].message.content.trim();
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      steps = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse steps:', parseError);
      steps = [{ stepNumber: 1, text: stepsResponse.choices[0].message.content }];
    }
    
    let images = [];
    
    if (includeImages && steps.length >= 2) {
      const imagePromptsRequest = `Based on these repair/DIY steps, generate 2-4 image prompts that would help illustrate the key actions. The images should be clear, instructional diagrams or illustrations.

Steps:
${steps.map(s => `${s.stepNumber}. ${s.text}`).join('\n')}

Requirements for each image prompt:
- Describe a clear instructional illustration or diagram
- Focus on hands performing the action or the tool being used
- Use simple, clean visual style
- No text in the images
- Make prompts specific and visual

Return ONLY a JSON array of objects with "prompt" and "caption" (in ${languageName}) fields. Generate 2-4 prompts. Example:
[{"prompt": "Clean instructional illustration of hands turning off a water valve under a sink, simple diagram style", "caption": "Turn off the water valve"}]`;

      try {
        const imagePromptsResponse = await callOpenAI('chat/completions', {
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: imagePromptsRequest }],
          temperature: 0.7,
          max_tokens: 500
        });
        
        let imagePrompts;
        const promptContent = imagePromptsResponse.choices[0].message.content.trim();
        const promptJsonMatch = promptContent.match(/\[[\s\S]*\]/);
        imagePrompts = promptJsonMatch ? JSON.parse(promptJsonMatch[0]) : JSON.parse(promptContent);
        
        const imageResults = await Promise.allSettled(
          imagePrompts.slice(0, 4).map(async (item) => {
            const imageResponse = await callOpenAI('images/generations', {
              model: 'dall-e-3',
              prompt: `Clean, simple instructional diagram illustration: ${item.prompt}. Style: clear line art, minimal colors, no text or labels, educational diagram style.`,
              n: 1,
              size: '1024x1024',
              quality: 'standard'
            });
            return {
              url: imageResponse.data[0].url,
              caption: item.caption
            };
          })
        );
        
        images = imageResults
          .filter(result => result.status === 'fulfilled')
          .map(result => result.value);
          
      } catch (imageError) {
        console.error('Image generation error:', imageError);
      }
    }
    
    res.json({
      query,
      steps,
      images,
      language
    });
    
  } catch (error) {
    console.error('Generate guide error:', error);
    res.status(500).json({ error: 'Failed to generate guide' });
  }
});

router.post('/semantic-search', optionalAuth, async (req, res) => {
  try {
    const { query, category, limit = 20 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    if (!OPENAI_API_KEY) {
      let sqlQuery = `
        SELECT v.*, u.display_name as author_name, u.avatar_url as author_avatar,
               EXISTS(SELECT 1 FROM video_likes WHERE video_id = v.id AND user_id = $1) as is_liked,
               EXISTS(SELECT 1 FROM video_saves WHERE video_id = v.id AND user_id = $1) as is_saved
        FROM videos v
        JOIN users u ON v.author_id = u.id
        WHERE v.is_flagged = false
        AND (v.title ILIKE $2 OR v.description ILIKE $2 OR $3 = ANY(v.tags))
      `;
      
      const params = [req.userId || null, `%${query}%`, query.toLowerCase()];
      
      if (category && category !== 'all') {
        sqlQuery += ` AND v.category = $4`;
        params.push(category);
      }
      
      sqlQuery += ` ORDER BY v.likes_count DESC, v.created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);
      
      const result = await pool.query(sqlQuery, params);
      
      const videos = result.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        tags: row.tags,
        videoUrl: row.video_url,
        thumbnailUrl: row.thumbnail_url,
        duration: row.duration,
        likesCount: row.likes_count,
        commentsEnabled: row.comments_enabled,
        authorId: row.author_id,
        authorName: row.author_name,
        authorAvatar: row.author_avatar,
        isLiked: row.is_liked,
        isSaved: row.is_saved,
        createdAt: row.created_at
      }));
      
      return res.json(videos);
    }
    
    const embeddingResponse = await callOpenAI('embeddings', {
      model: 'text-embedding-3-small',
      input: query
    });
    
    const queryEmbedding = embeddingResponse.data[0].embedding;
    
    let sqlQuery = `
      SELECT v.*, u.display_name as author_name, u.avatar_url as author_avatar,
             EXISTS(SELECT 1 FROM video_likes WHERE video_id = v.id AND user_id = $1) as is_liked,
             EXISTS(SELECT 1 FROM video_saves WHERE video_id = v.id AND user_id = $1) as is_saved,
             1 - (v.embedding <=> $2::vector) as similarity
      FROM videos v
      JOIN users u ON v.author_id = u.id
      WHERE v.is_flagged = false AND v.embedding IS NOT NULL
    `;
    
    const params = [req.userId || null, `[${queryEmbedding.join(',')}]`];
    
    if (category && category !== 'all') {
      sqlQuery += ` AND v.category = $3`;
      params.push(category);
    }
    
    sqlQuery += ` ORDER BY similarity DESC LIMIT $${params.length + 1}`;
    params.push(limit);
    
    const result = await pool.query(sqlQuery, params);
    
    const videos = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      tags: row.tags,
      videoUrl: row.video_url,
      thumbnailUrl: row.thumbnail_url,
      duration: row.duration,
      likesCount: row.likes_count,
      commentsEnabled: row.comments_enabled,
      authorId: row.author_id,
      authorName: row.author_name,
      authorAvatar: row.author_avatar,
      isLiked: row.is_liked,
      isSaved: row.is_saved,
      similarity: row.similarity,
      createdAt: row.created_at
    }));
    
    res.json(videos);
  } catch (error) {
    console.error('Semantic search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
