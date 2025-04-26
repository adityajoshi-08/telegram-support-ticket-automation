# Telegram Support Automation Bot

This is a **Telegram Automation Bot** designed to help you create and manage support queries from your Telegram group, automatically syncing them to Airtable.

---

## 📋 How to Run

### 1. Telegram Setup
- Create a **Telegram Group** with **Topics** enabled.
- Create a **Bot** using [BotFather](https://t.me/BotFather).
- Add the newly created bot to your group and give it the necessary permissions.

---

### 2. Project Setup

#### Install Dependencies
```bash
npm install
```

#### Configure Environment Variables
Create a `.env` file in the root directory and add the following variables:

```env
AIRTABLE_API_KEY=your_airtable_api_key
AIRTABLE_BASE_ID=your_airtable_base_id
AIRTABLE_TABLE_NAME=your_airtable_table_name
TELEGRAM_BOT_TOKEN=your_telegram_bot_token # Get it from BotFather
GEMINI_API_KEY=your_gemini_api_key         # Get it from the Gemini Website
WS_SERVER_URL=your_websocket_server_url    # URL where your backend is hosted (e.g., Render)
PORT=8080
```

---

### 3. Targeting Specific Topics (Optional)

By default, this bot monitors a specific **support topic** in my group (thread id = 2).  
If you'd like to change which topic it watches:

- Open `src/telegram-bot.js`
- Update the value of the `TARGET_THREAD_ID` variable to the **topic ID** you want to monitor.

---

### 4. Start the Bot
```bash
npm start
```

---

## ⚡️ Notes
- The bot is currently configured for a specific use case but can be easily modified for other groups and workflows.
- Ensure your backend server (e.g., Render) is properly set up and reachable at the `WS_SERVER_URL`.

---
