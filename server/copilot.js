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
    const reply = data.message && data.message.content
      ? data.message.content
      : JSON.stringify(data);
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: 'Horizon Hub API error', details: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Horizon Hub API running on port ${PORT}`));
