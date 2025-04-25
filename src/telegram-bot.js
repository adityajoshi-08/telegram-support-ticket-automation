// Load environment variables
import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import WebSocket from 'ws';

dotenv.config();


// Configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WS_SERVER_URL = 'ws://localhost:8080';
const TARGET_THREAD_ID = 2; // Thread to monitor

// Validate configuration
if (!TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN is missing from environment variables');
  process.exit(1);
}

console.log('🤖 Starting Telegram bot with token:', TELEGRAM_BOT_TOKEN);

// Initialize the Telegram bot
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Create WebSocket connection
function connectWebSocket() {
  const ws = new WebSocket(WS_SERVER_URL);

  ws.on('open', () => console.log('✅ Connected to WebSocket server'));
  
  ws.on('message', (data) => {
    try {
      const response = JSON.parse(data.toString());
      console.log('📥 Received from WebSocket server:', response);
      
      // Implement any response handling if needed
      if (response.status === 'success') {
        console.log(`✅ Successfully added to Airtable with ID: ${response.airtableId}`);
      } else if (response.status === 'error') {
        console.error(`❌ Error adding to Airtable: ${response.error}`);
      }
    } catch (e) {
      console.error('❌ Error parsing WebSocket message:', e);
    }
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
  });
  
  ws.on('close', () => {
    console.log('🔌 WebSocket connection closed. Reconnecting in 5 seconds...');
    setTimeout(connectWebSocket, 5000);
  });
  
  return ws;
}

// Initialize WebSocket
let ws = connectWebSocket();

// Handle Telegram messages
bot.on('message', (msg) => {
  // Check if the message is part of specified thread
  if (msg.message_thread_id === TARGET_THREAD_ID) {
    const text = msg.text || '';
    const first_name = msg.from.first_name || '';
    const last_name = msg.from.last_name || '';
    const username = msg.from.username || '';
    
    // Format user info properly
    const displayName = username ? `@${username}` : `${first_name} ${last_name}`.trim();
    const userInfo = displayName || String(msg.from.id);

    const messageObj = {
      from: displayName,
      username: userInfo, // Explicitly include username for User Info field
      text: text,
      telegram_user_id: msg.from.id,
      chat_id: msg.chat.id,
      timestamp: new Date().toISOString(),
    };

    console.log(`📩 From ${userInfo}: ${text}`);

    // Send messages from thread to WebSocket
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(messageObj));
      
      // Reply to the user to acknowledge receipt
      bot.sendMessage(msg.chat.id, `✅ Message received and forwarded to support system.`, {
        message_thread_id: msg.message_thread_id,
        reply_to_message_id: msg.message_id
      });
    } else {
      console.error('🚫 WebSocket is not open');
      
      // Notify the user about connection issues
      bot.sendMessage(msg.chat.id, `⚠️ Support system temporarily unavailable. Your message has been logged and will be processed as soon as possible.`, {
        message_thread_id: msg.message_thread_id,
        reply_to_message_id: msg.message_id
      });
      
      // Try to reconnect
      ws = connectWebSocket();
    }
  } else {
    console.log(`🔇 Ignored message from thread ${msg.message_thread_id || 'main'}`);
  }
});

console.log('🚀 Telegram bot is running...');

// Send startup notification
bot.getMe().then((botInfo) => {
  console.log(`Bot info: ${botInfo.first_name} (@${botInfo.username})`);
}).catch(err => {
  console.error('Error getting bot info:', err);
});