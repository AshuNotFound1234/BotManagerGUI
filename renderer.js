const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'config.json');

window.addEventListener('DOMContentLoaded', () => {
  let selectedBot = null;
  let bots = [];
  let botChatLogs = {}; // store messages for each bot

  const botListDiv = document.getElementById('botList');
  const botTitle = document.getElementById('botTitle');
  const botControls = document.getElementById('botControls');
  const chatBox = document.getElementById('chatInputContainer');
  const chatInput = document.getElementById('chatInput');
  const sendChatBtn = document.getElementById('sendChat');
  const addBotBtn = document.getElementById('addBot');
  const usernameInput = document.getElementById('newBotUsername');
  const warningMsg = document.getElementById('warningMsg');
  const backBtn = document.getElementById('backBtn');
  const chatDisplay = document.getElementById('botChatDisplay');

  // ===== INITIAL SETUP =====
  chatBox.style.display = 'none';
  updateChatDisplay('No bot selected', true);

  // Load saved bots
  if (fs.existsSync(configPath)) {
    const data = JSON.parse(fs.readFileSync(configPath));
    if (data.bots) {
      bots = data.bots.map(name => ({ username: name, connected: false }));
      bots.forEach(b => botChatLogs[b.username] = []);
    }
    if (data.serverIP) localStorage.setItem('serverHost', data.serverIP);
    if (data.serverPort) localStorage.setItem('serverPort', data.serverPort);
  }

  function saveBots() {
    let config = {};
    if (fs.existsSync(configPath)) config = JSON.parse(fs.readFileSync(configPath));
    config.bots = bots.map(b => b.username);
    if (localStorage.getItem('serverHost')) config.serverIP = localStorage.getItem('serverHost');
    if (localStorage.getItem('serverPort')) config.serverPort = localStorage.getItem('serverPort');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }

  function displayWarning(msg) {
    warningMsg.textContent = msg;
    setTimeout(() => warningMsg.textContent = '', 3000);
  }

  // ===== ADD BOT =====
  addBotBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (!username) return displayWarning("Enter a username!");
    if (bots.some(b => b.username === username)) return displayWarning("Bot already exists!");
    bots.push({ username, connected: false });
    botChatLogs[username] = [];
    usernameInput.value = '';
    usernameInput.focus();
    renderBotList();
    saveBots();
  });

  // ===== BACK BUTTON =====
  backBtn.addEventListener('click', async () => {
    for (let bot of bots) {
      if (bot.connected) await ipcRenderer.invoke('disconnect-bot', bot.username);
      bot.connected = false;
    }
    saveBots();
    window.location = 'ip.html';
  });

  // ===== RENDER BOT LIST =====
  function renderBotList() {
  botListDiv.innerHTML = '';
  bots.forEach(bot => {
    const btn = document.createElement('button');
    btn.textContent = bot.username + (bot.connected ? " (Online)" : "");
    btn.onclick = () => selectBot(bot.username);
    botListDiv.appendChild(btn);
  });

  // Auto-select first bot only if nothing is currently selected
  if (!selectedBot || !bots.some(b => b.username === selectedBot.username)) {
    if (bots.length > 0) selectBot(bots[0].username);
  }

  }

  // ===== SELECT BOT =====
  function selectBot(username) {
    selectedBot = bots.find(b => b.username === username);
    if (!selectedBot) return;

    botTitle.textContent = selectedBot.username;

    // Show chat box only if connected
    chatBox.style.display = selectedBot.connected ? 'flex' : 'none';

    // Render chat log
    chatDisplay.innerHTML = '';
    const log = botChatLogs[selectedBot.username] || [];
    if (log.length === 0 && !selectedBot.connected) updateChatDisplay('Bot not logged in', true);
    else {
      log.forEach(msg => {
        const line = document.createElement('div');
        line.textContent = msg;
        chatDisplay.appendChild(line);
      });
      chatDisplay.scrollTop = chatDisplay.scrollHeight;
    }

    // ===== BOT CONTROLS =====
    botControls.innerHTML = ''; // prevent duplicates

    const joinBtn = document.createElement('button');
    joinBtn.textContent = 'Join';
    const stopBtn = document.createElement('button');
    stopBtn.textContent = 'Stop';
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';

    botControls.appendChild(joinBtn);
    botControls.appendChild(stopBtn);
    botControls.appendChild(delBtn);

    // ===== BUTTON LOGIC =====
    joinBtn.addEventListener('click', async () => {
  if (!selectedBot.connected) {
    const host = localStorage.getItem('serverHost');
    const port = localStorage.getItem('serverPort');
    if (!host || !port) return displayWarning("Server IP/Port not set");

    const result = await ipcRenderer.invoke('create-bot', { username: selectedBot.username, host, port });
    if (result.error) return displayWarning(result.error);

    selectedBot.connected = true;

    // Show chat box
    chatBox.style.display = 'flex';

    // Clear placeholder message
    chatDisplay.innerHTML = '';

    renderBotList(); // update list without changing selected bot
  }
});


stopBtn.addEventListener('click', async () => {
  if (selectedBot.connected) {
    await ipcRenderer.invoke('disconnect-bot', selectedBot.username);
    selectedBot.connected = false;
    chatBox.style.display = 'none';
    updateChatDisplay('Bot not logged in', true);
    // DON'T call selectBot() here
    renderBotList();
  }
});

    delBtn.addEventListener('click', async () => {
      if (selectedBot.connected) await ipcRenderer.invoke('disconnect-bot', selectedBot.username);
      bots = bots.filter(b => b.username !== selectedBot.username);
      delete botChatLogs[selectedBot.username];
      selectedBot = null;
      botTitle.textContent = '';
      chatBox.style.display = 'none';
      updateChatDisplay('No bot selected', true);
      botControls.innerHTML = '';
      renderBotList();
      saveBots();
    });
  }

  // ===== UPDATE CHAT DISPLAY =====
  function updateChatDisplay(text = '', center = false) {
    chatDisplay.innerHTML = '';
    const div = document.createElement('div');
    div.textContent = text;
    div.style.textAlign = center ? 'center' : 'left';
    chatDisplay.appendChild(div);
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
  }

  // ===== SEND CHAT =====
  sendChatBtn.addEventListener('click', async () => {
    if (!selectedBot || !selectedBot.connected) return;
    const msg = chatInput.value.trim();
    if (!msg) return;
    await ipcRenderer.invoke('send-chat', { username: selectedBot.username, message: msg });
    chatInput.value = '';
  });

  chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendChatBtn.click(); });

  // ===== IPC LISTENERS =====
 ipcRenderer.on('bot-chat', (event, { username, message }) => {
  if (!botChatLogs[username]) botChatLogs[username] = [];
  botChatLogs[username].push(message);

  if (selectedBot && selectedBot.username === username) {
    const line = document.createElement('div');
    line.textContent = message;
    chatDisplay.appendChild(line);
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
  }
});

  ipcRenderer.on('bot-disconnected', (event, username) => {
    const bot = bots.find(b => b.username === username);
    if (!bot) return;
    bot.connected = false;
    if (selectedBot && selectedBot.username === username) {
      chatBox.style.display = 'none';
      updateChatDisplay('Bot not logged in', true);
    }
    renderBotList();
  });

  // Initial render
  renderBotList();
});
