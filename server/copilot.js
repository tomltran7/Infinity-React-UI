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
      // Look for a JSON block in the reply
      const match = reply.match(/```json([\s\S]*?)```/i) || reply.match(/\{[\s\S]*\}/);
      if (match) {
        const jsonStr = match[1] ? match[1] : match[0];
        const parsed = JSON.parse(jsonStr);
        // If the parsed object has a 'recommendation' key, use that, else use the whole object
        if (parsed && parsed.recommendation) {
          recommendation = parsed.recommendation;
        } else if (parsed) {
          recommendation = parsed;
        }
      }
    } catch (e) { /* ignore */ }

    // Debug: log the extracted recommendation
    console.log('Extracted recommendation:', recommendation);

    res.json({ reply, recommendation });
  } catch (err) {
    res.status(500).json({ error: 'Horizon Hub API error', details: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Horizon Hub API running on port ${PORT}`));
