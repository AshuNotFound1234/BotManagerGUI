// botManager.js
const mineflayer = require('mineflayer');

class BotManager {
  constructor() {
    this.bots = {};
  }

  createBot(username, host, port, version = false) {
    if (this.bots[username]) {
      return { error: "Bot already exists" };
    }

    const bot = mineflayer.createBot({
      host,
      port: parseInt(port, 10),
      username,
      version: version || undefined
    });

    bot.on('login', () => {
      console.log(`[${username}] Logged in.`);
    });

    bot.on('chat', (name, message) => {
      console.log(`[${username}] <${name}> ${message}`);
    });

    bot.on('end', () => {
      console.log(`[${username}] Disconnected`);
      delete this.bots[username];
    });

    this.bots[username] = bot;
    return { success: true };
  }

  sendChat(username, message) {
    const bot = this.bots[username];
    if (bot) bot.chat(message);
  }

  disconnectBot(username) {
    const bot = this.bots[username];
    if (bot) {
      bot.end();
      delete this.bots[username];
    }
  }

  listBots() {
    return Object.keys(this.bots);
  }
}

module.exports = new BotManager();
