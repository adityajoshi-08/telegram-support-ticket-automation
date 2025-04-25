import dotenv from 'dotenv';
import WebSocketServer from 'ws';
import { GoogleGenAI } from "@google/genai";
import axios from 'axios';

dotenv.config();

const PORT = 8080;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

function formatValueForFieldType(value, fieldType) {
  if (value === undefined || value === null) return null;
  switch (fieldType) {
    case 'date':
      return new Date(value).toISOString().split('T')[0];
    case 'number':
      return Number(value);
    case 'checkbox':
      return Boolean(value);
    case 'singleSelect':
      return String(value);
    default:
      return String(value);
  }
}

async function getAirtableSchema() {
  try {
    const response = await axios.get(
      `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`,
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`
        }
      }
    );
    const table = response.data.tables.find(t => t.name === AIRTABLE_TABLE_NAME);
    if (!table) return null;

    const fields = table.fields.map(f => ({
      name: f.name,
      type: f.type
    }));

    console.log(`Fields in "${AIRTABLE_TABLE_NAME}" table:`);
    fields.forEach(f => console.log(` - ${f.name} (${f.type})`));
    return fields;
  } catch (err) {
    console.error('Error fetching schema:', err.response?.data || err.message);
    return null;
  }
}

async function categorizeTicketWithGemini(text) {
  try {
    const prompt = `
    Categorize the following support ticket:

    Message: "${text}"

    Return JSON:
    {
      "category": "Swag Delay" | "Submission Issue" | "Login Trouble" | "Sponsorship" | "Other",
      "priority": "Critical" | "High" | "Medium" | "Low",
      "team": "Tech Support" | "Sponsorship" | "Logistics" | "General" | "Admin"
    }`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const cleaned = response.text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const valid = {
      category: ["Swag Delay", "Submission Issue", "Login Trouble", "Sponsorship", "Other"],
      priority: ["Critical", "High", "Medium", "Low"],
      team: ["Tech Support", "Sponsorship", "Logistics", "General", "Admin"]
    };

    return {
      category: valid.category.includes(parsed.category) ? parsed.category : "Other",
      priority: valid.priority.includes(parsed.priority) ? parsed.priority : "Medium",
      team: valid.team.includes(parsed.team) ? parsed.team : "General"
    };
  } catch (err) {
    console.error('Gemini error:', err);
    return {
      category: "Other",
      priority: "Medium",
      team: "General"
    };
  }
}

const wss = new WebSocketServer.Server({ port: PORT });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', async (message) => {
    console.log('Received:', message.toString());

    let msgData;
    try {
      msgData = JSON.parse(message.toString());
    } catch {
      msgData = { text: message.toString() };
    }

    const text = msgData.text || message.toString();
    const username = msgData.username || msgData.from || "Unknown";

    const analysis = await categorizeTicketWithGemini(text);
    const schema = await getAirtableSchema();
    if (!schema) {
      ws.send(JSON.stringify({ status: 'error', error: 'Schema not found' }));
      return;
    }

    const fieldTypes = Object.fromEntries(schema.map(f => [f.name, f.type]));
    const fieldNames = Object.keys(fieldTypes);

    const now = new Date();
    const timestamp = now.toISOString().split('T')[0];

    const record = {
      fields: {}
    };

    const baseFields = {
      'Query Text': text,
      'Status': 'Unresolved',
      'Category': analysis.category,
      'Priority': analysis.priority,
      'Timestamp': timestamp,
      'Source': msgData.from ? 'Telegram' : 'Web',
      'User Info': username,
      'Assigned To': analysis.team,
    };

    if (fieldNames.includes('Query ID')) {
      baseFields['Query ID'] = Math.floor(Date.now() / 1000);
    }

    for (const [key, value] of Object.entries(baseFields)) {
      if (fieldNames.includes(key)) {
        const formatted = formatValueForFieldType(value, fieldTypes[key]);
        if (formatted !== null) {
          record.fields[key] = formatted;
        }
      }
    }

    try {
      const response = await axios.post(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`,
        record,
        {
          headers: {
            Authorization: `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Added to Airtable:', response.data);
      ws.send(JSON.stringify({ status: 'success', airtableId: response.data.id }));
    } catch (err) {
      console.error('Airtable error:', err.response?.data || err.message);
      ws.send(JSON.stringify({
        status: 'error',
        error: err.response?.data || err.message
      }));
    }
  });

  ws.on('close', () => console.log('Client disconnected'));
});

console.log(`WebSocket server running at ws://localhost:${PORT}`);

getAirtableSchema().then(() => console.log('Server ready to accept connections'));
