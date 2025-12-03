const express = require('express');
const { pool } = require('../db');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

const router = express.Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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
