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
      // If reply is a pure JSON object, parse it directly
      // Always use robust extraction to find first JSON object anywhere in reply
      function extractFirstJsonObject(str) {
        let start = str.indexOf('{');
        if (start === -1) return null;
        let depth = 0;
        for (let i = start; i < str.length; i++) {
          if (str[i] === '{') depth++;
          if (str[i] === '}') depth--;
          if (depth === 0) {
            return str.slice(start, i + 1);
          }
        }
        return null;
      }
      let jsonStr = extractFirstJsonObject(reply);
      if (jsonStr) {
        try {
          let parsed = JSON.parse(jsonStr);
          // If decisionTable is present, use it
          if (parsed.decisionTable) parsed = parsed.decisionTable;
          // Remove duplicate columns, only add net new
          if (parsed.columns && Array.isArray(parsed.columns)) {
            const seen = new Set();
            parsed.columns = parsed.columns.filter(col => {
              if (seen.has(col.name)) return false;
              seen.add(col.name);
              return true;
            });
          }
          recommendation = parsed.recommendation ? parsed.recommendation : parsed;
        } catch (e) {
          console.log('JSON parse error:', e, jsonStr);
        }
      } else {
        console.log('No valid JSON object found in reply:', reply);
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
