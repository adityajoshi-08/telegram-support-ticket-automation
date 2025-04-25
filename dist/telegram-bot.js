"use strict";
require('dotenv').config(); // this must be at the top!
const TelegramBot = require('node-telegram-bot-api');
const NodeWebSocket = require('ws');
console.log(process.env.TELEGRAM_BOT_TOKEN);
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; // replace with your bot token
const WS_SERVER_URL = 'ws://localhost:8080'; // your existing WebSocket server
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
const ws = new NodeWebSocket(WS_SERVER_URL);
ws.on('open', () => console.log('✅ Connected to WebSocket server'));
bot.on('message', (msg) => {
    // Check if the message is part of thread 2
    if (msg.message_thread_id === 2) {
        const text = msg.text;
        const user = msg.from.username || `${msg.from.first_name} ${msg.from.last_name}`;
        const messageObj = {
            from: user,
            text: text,
            telegram_user_id: msg.from.id,
            chat_id: msg.chat.id,
            timestamp: new Date().toISOString(),
        };
        console.log(`📩 From ${user}: ${text}`);
        // Send only messages from thread 2 to WebSocket
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(messageObj));
        }
        else {
            console.error('🚫 WebSocket is not open');
        }
    }
    else {
        console.log(`🔇 Ignored message from thread ${msg.message_thread_id}`);
    }
});
