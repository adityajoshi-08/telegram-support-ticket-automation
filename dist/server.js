"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
require('dotenv').config();
const WebSocketServer = require('ws');
const axios = require('axios');
// Configuration
const PORT = 8080;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME;
console.log('Environment Variables:');
console.log('AIRTABLE_API_KEY:', AIRTABLE_API_KEY);
console.log('AIRTABLE_BASE_ID:', AIRTABLE_BASE_ID);
console.log('AIRTABLE_TABLE_NAME:', AIRTABLE_TABLE_NAME);
// Initialize WebSocket Server
const wss = new WebSocketServer.Server({ port: PORT });
// WebSocket Connection Handling
wss.on('connection', (ws) => {
    console.log('Client connected');
    // Handle incoming messages from WebSocket client
    ws.on('message', (message) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        console.log('Received:', message.toString());
        // You can add logic here to parse and categorize the message if needed
        const messageText = message.toString();
        // Placeholder for category and priority (could be generated via regex/AI)
        let category = 'General'; // Default category
        let priority = 'Medium'; // Default priority
        // Example logic for auto-categorizing based on keywords
        if (messageText.includes('urgent')) {
            priority = 'High';
        }
        if (messageText.includes('login')) {
            category = 'Login Issue';
        }
        else if (messageText.includes('submission')) {
            category = 'Submission Issue';
        }
        // Prepare the data for Airtable
        const airtableData = {
            fields: {
                'Message': messageText, // The message itself
                'Status': 'Pending', // Default status
                'Category': category, // Auto-assigned category
                'Priority': priority, // Auto-assigned priority
                'Timestamp': new Date().toISOString(), // Timestamp
                'Source': 'WebSocket' // You can also use Telegram or other sources if needed
            }
        };
        try {
            // Make API request to add data to Airtable
            const response = yield axios.post(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`, airtableData, {
                headers: {
                    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('Added to Airtable:', response.data);
            ws.send(JSON.stringify({ status: 'success', airtableId: response.data.id }));
        }
        catch (err) {
            console.error('Airtable error:', ((_a = err.response) === null || _a === void 0 ? void 0 : _a.data) || err.message);
            ws.send(JSON.stringify({ status: 'error', error: err.message }));
        }
    }));
    // Close event for the WebSocket connection
    ws.on('close', () => console.log('Client disconnected'));
});
console.log(`WebSocket server running at ws://localhost:${PORT}`);
