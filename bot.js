// bot.js
const mineflayer = require('mineflayer');
const fs = require('fs');
const { spawnSync } = require('child_process');

const [username, host, port] = process.argv.slice(2);

const bot = mineflayer.createBot({
  host,
  port: parseInt(port),
  username
});

// Write current player list to username.txt
function updateUsernameFile() {
  try {
    const players = Object.keys(bot.players || {});
    fs.writeFileSync('username.txt', players.join('\n'), 'utf8');
  } catch (err) {
    console.error('Error writing username.txt:', err);
  }
}

// Call Python script for username extraction
function extractUsername(messageJson) {
  try {
    fs.writeFileSync('messages.json', JSON.stringify(messageJson, null, 2), 'utf8');
    updateUsernameFile(); // always refresh usernames

    const result = spawnSync('python3', ['username_extractor.py', 'messages.json', 'username.txt'], { encoding: 'utf8' });

    if (result.error) {
      console.error('Python error:', result.error);
      return null;
    }

    const uname = result.stdout.trim();
    return uname.length ? uname : null;
  } catch (err) {
    console.error('Extractor failed:', err);
    return null;
  }
}

// Handle messages
bot.on('message', jsonMsg => {
  try {
    const rawText = jsonMsg.toString().trim();
    const uname = extractUsername(jsonMsg);

    if (uname) {
      const formatted = `<${uname}> ${rawText}`;
      //console.log(formatted);
      if (process.send) process.send(formatted);
    } else {
      //console.log(rawText);
      if (process.send) process.send(rawText);
    }
  } catch (err) {
    console.error('Message parse error:', err);
  }
});

// Keep username.txt always updated
bot.on('playerJoined', updateUsernameFile);
bot.on('playerLeft', updateUsernameFile);
bot.on('spawn', updateUsernameFile);

// GUI input → send chat
process.on('message', data => {
  if (data?.type === 'chat' && data.message) {
    bot.chat(data.message);
  }
});

// Bot disconnect
bot.on('end', () => {
  console.log('Bot disconnected');
  if (process.send) process.send('Bot disconnected');
  process.exit(0);
});
