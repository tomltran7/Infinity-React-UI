// server/copilot.js
import express from 'express';
import dotenv from 'dotenv';
dotenv.config();


const app = express();
app.use(express.json());


import fetch from 'node-fetch';

app.post('/api/copilot', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'No message provided.' });
  try {
    const response = await fetch('https://api.horizon.elevancehealth.com/v2/text/chats?qos=accurate&reasoning=true'
      , {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HORIZON_HUB_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          { content: message, role: 'user' }
        ],
        stream: false
      })
    });
    const data = await response.json();
    // Adjust this if the response structure is different
    let reply = data.message && data.message.content
      ? data.message.content
      : JSON.stringify(data);

    // Debug: log the raw reply
    console.log('LLM raw reply:', reply);

    // Try to extract a JSON recommendation block from the reply
    let recommendation = null;
    try {
      // Try to extract any valid JSON array/object from the reply, even with comments
      let match = reply.match(/```json([\s\S]*?)```/i);
      if (!match) match = reply.match(/\[[\s\S]*\]/); // Array block
      if (!match) match = reply.match(/\{[\s\S]*\}/); // Object block
      if (!match) {
        // Try to find any JSON array in the reply, even if surrounded by other text
        const arrMatch = reply.match(/(\[[^\]]*\])/);
        match = arrMatch;
      }
      if (match) {
        try {
          let jsonStr = match[1] ? match[1] : match[0];
          // Remove JS-style comments and trailing commas
          jsonStr = jsonStr.replace(/\/\*.*?\*\//gs, '').replace(/\s*\/\/.*$/gm, '').replace(/,\s*([\]\}])/g, '$1');
          // Remove newlines and extra whitespace
          jsonStr = jsonStr.replace(/\n/g, ' ').replace(/\s+/g, ' ');
          const parsed = JSON.parse(jsonStr);
          if (parsed && parsed.recommendation) {
            recommendation = parsed.recommendation;
          } else if (parsed) {
            recommendation = parsed;
          }
        } catch (e) {
          console.log('JSON parse error:', e, jsonStr);
        }
      }
      if (!recommendation) {
        console.log('No recommendation extracted. Raw reply:', reply);
      }
    } catch (e) {
      console.log('Extraction error:', e);
    }

    // Debug: log the extracted recommendation
    console.log('Extracted recommendation:', recommendation);

    res.json({ reply, recommendation });
  } catch (err) {
    res.status(500).json({ error: 'Horizon Hub API error', details: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Horizon Hub API running on port ${PORT}`));
