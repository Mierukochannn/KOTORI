const threadHealthChecker = require("../../utils/threadHealthChecker");

module.exports = function ({ api, Users, Threads, Currencies, logger, botSettings }) {
  const moment = require("moment-timezone");
  const axios = require("axios");

  // Enhanced error checking
  function shouldIgnoreError(error) {
    if (!error) return true;

    const errorStr = error.toString().toLowerCase();
    const ignorablePatterns = [
      'rate limit',
      'enoent',
      'network timeout',
      'connection reset',
      'does not exist in database',
      'you can\'t use this feature',
      'took too long to execute',
      'command timeout',
      'execution timeout',
      'request timeout',
      'socket timeout',
      'network error',
      'api error',
      'facebook error',
      'permission denied',
      'access denied',
      'invalid session',
      'login required',
      'cannot read properties of undefined',
      'getname is not a function',
      'mqtt',
      'attachment url',
      'has no valid run or onstart function',
      'command has no valid',
      'no valid function',
      'function is not defined'
    ];

    return ignorablePatterns.some(pattern => errorStr.includes(pattern));
  }

  // Enhanced cooldown management
  const cooldowns = new Map();
  const userActivity = new Map();

  function checkCooldown(userID, commandName, cooldownTime) {
    if (!cooldownTime || cooldownTime <= 0) return true;

    const key = `${userID}_${commandName}`;
    const now = Date.now();
    const lastUsed = cooldowns.get(key) || 0;

    if (now - lastUsed < cooldownTime * 1000) {
      return false;
    }

    cooldowns.set(key, now);
    return true;
  }

  // Command execution function
  async function executeCommand(command, Obj, commandName) {
    try {
      // Support run, onStart, and start functions
      if (typeof command.run === 'function') {
        return await command.run(Obj);
      } else if (typeof command.onStart === 'function') {
        return await command.onStart(Obj);
      } else if (typeof command.start === 'function') {
        return await command.start(Obj);
      } else {
        throw new Error(`Command ${commandName} has no valid execution function`);
      }
    } catch (error) {
      throw error;
    }
  }

  return async function handleCommand({ event }) {
    try {
      if (!event || !event.body) return;

      const { api } = global.client;
      const { commands } = global.client;
      const { threadID, messageID, senderID, isGroup } = event;

      // Check if thread is disabled
      if (threadHealthChecker && threadHealthChecker.isThreadDisabled && threadHealthChecker.isThreadDisabled(threadID)) {
        return; // Skip processing for disabled threads
      }

      // Check if group is approved before executing any commands
      const fs = require('fs');
      const configPath = require('path').join(__dirname, '../../config.json');
      let approvalConfig = {};

      try {
        const configData = fs.readFileSync(configPath, 'utf8');
        approvalConfig = JSON.parse(configData);
      } catch (error) {
        approvalConfig = { APPROVAL: { approvedGroups: [] } };
      }

      // Initialize approval system if not exists
      if (!approvalConfig.APPROVAL) {
        approvalConfig.APPROVAL = { approvedGroups: [], pendingGroups: [], rejectedGroups: [] };
      }

      // For group chats, check if group is approved
      if (event.threadID && event.threadID !== event.senderID) {
        const threadID = String(event.threadID);
        const senderID = String(event.senderID);
        const isApproved = approvalConfig.APPROVAL.approvedGroups.includes(threadID);
        const isOwner = global.config.ADMINBOT && global.config.ADMINBOT.includes(senderID);

        // If group is not approved, block all commands except approve command for owner
        if (!isApproved) {
          const messageBody = event.body || "";
          const prefix = global.config.PREFIX || "/";
          const commandName = messageBody.replace(prefix, "").split(" ")[0].toLowerCase();

          // Only allow approve command for owner, block everything else
          if (commandName === "approve" && isOwner) {
            // Allow approve command to pass through
            console.log(`[APPROVAL] Owner using approve command in unapproved group: ${threadID}`);
          } else {
            // Block all other commands silently
            console.log(`[APPROVAL] Blocked command "${commandName}" in unapproved group: ${threadID}`);
            return;
          }
        }
      }

      // Get thread settings
      const threadData = global.data.threadData.get(threadID) || {};
      const prefix = threadData.PREFIX || global.config.PREFIX || "/";

      // Check if message starts with prefix
      const messageBody = event.body.trim();
      let commandBody = messageBody;
      let startsWithPrefix = messageBody.startsWith(prefix);
      
      // For approved groups, be more flexible with prefix requirement
      if (!startsWithPrefix) {
        // Check if it might be a command without prefix
        const possibleCommand = messageBody.split(' ')[0].toLowerCase();
        const allCommands = Array.from(commands.keys());
        const isKnownCommand = allCommands.includes(possibleCommand) || 
                              Array.from(commands.values()).some(cmd => 
                                cmd.config.aliases && cmd.config.aliases.includes(possibleCommand)
                              );
        
        if (!isKnownCommand) return;
        
        // If it's a known command but no prefix, add prefix for processing
        commandBody = prefix + messageBody;
        startsWithPrefix = true;
      }

      if (!startsWithPrefix) return;

      // Parse command
      const args = commandBody.slice(prefix.length).trim().split(/ +/);
      const commandName = args.shift()?.toLowerCase();

      if (!commandName) return;

      // Get command (check both name and aliases)
      let command = commands.get(commandName);
      if (!command) {
        // Check aliases
        for (const [name, cmd] of commands) {
          if (cmd.config.aliases && Array.isArray(cmd.config.aliases)) {
            if (cmd.config.aliases.includes(commandName)) {
              command = cmd;
              break;
            }
          }
        }
      }

      if (!command) return;

      const commandConfig = command.config;

      // Permission check
      if (commandConfig.permission > 0) {
        const isAdmin = global.config.ADMINBOT?.includes(senderID);
        if (!isAdmin && commandConfig.permission >= 2) {
          return; // Silently ignore for non-admins
        }
      }

      // Cooldown check
      if (commandConfig.cooldowns && !checkCooldown(senderID, commandName, commandConfig.cooldowns)) {
        return; // Silently ignore cooldown violations
      }

      // Thread/User ban check
      const threadBanned = global.data.threadBanned.has(threadID);
      const userBanned = global.data.userBanned.has(senderID);
      const commandBanned = global.data.commandBanned.get(threadID)?.includes(commandName) ||
                           global.data.commandBanned.get(senderID)?.includes(commandName);

      if (threadBanned || userBanned || commandBanned) {
        return; // Silently ignore banned users/threads
      }

      // Rate limiting
      if (botSettings?.RATE_LIMITING?.ENABLED) {
        const lastActivity = userActivity.get(senderID) || 0;
        const now = Date.now();
        const interval = botSettings.RATE_LIMITING.MIN_MESSAGE_INTERVAL || 8000;

        if (now - lastActivity < interval) {
          return; // Silently ignore rate limited users
        }

        userActivity.set(senderID, now);
      }

      // Create fallback getText function that works without language keys
      const fallbackGetText = (key, ...args) => {
        try {
          // Try to use global getText first
          if (global.getText && typeof global.getText === 'function') {
            const result = global.getText(key, ...args);
            if (result && result !== key) {
              return result;
            }
          }
        } catch (e) {
          // Ignore getText errors
        }

        // Fallback messages for common keys
        const fallbackMessages = {
          "moduleInfo": `
╔═────── ★ ★ ─────═╗
        💫 TOHI-BOT MODULE INFO 💫
╚═────── ★ ★ ─────═╝
🔹 Name         : %1
🔸 Usage        : %3
📝 Description   : %2
🌈 Category     : %4
⏳ Cooldown     : %5s
🔑 Permission   : %6
272:
273:⚡️ Made by TOHIDUL | TOHI-BOT ⚡️`,
          "helpList": `✨ TOHI-BOT has %1 commands available!
🔍 TIP: Type %2help [command name] for details!`,
          "user": "User",
          "adminGroup": "Admin Group",
          "adminBot": "Admin Bot",
          "on": "on",
          "off": "off",
          "successText": "Success!",
          "error": "An error occurred",
          "missingInput": "Please provide required input",
          "noPermission": "You don't have permission to use this command",
          "cooldown": "Please wait before using this command again",
          "levelup": "Congratulations {name}, you leveled up to level {level}!",
          "reason": "Reason",
          "at": "at",
          "banSuccess": "User banned successfully",
          "unbanSuccess": "User unbanned successfully"
        };

        // If we have a fallback message, format it with args
        if (fallbackMessages[key]) {
          let message = fallbackMessages[key];
          for (let i = 0; i < args.length; i++) {
            message = message.replace(new RegExp(`%${i + 1}`, 'g'), args[i] || '');
            message = message.replace(new RegExp(`\\{${i + 1}\\}`, 'g'), args[i] || '');
          }
          return message;
        }

        // If no fallback found, return a generic message
        return key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
      };

      // Create enhanced run object
      const Obj = {
        api,
        event,
        args,
        Users,
        Threads,
        Currencies,
        permssion: commandConfig.permission || 0,
        getText: fallbackGetText,
        logger
      };

      // Enhanced user info
      try {
        if (!global.data.userName.has(senderID)) {
          const userInfo = await api.getUserInfo(senderID);
          if (userInfo && userInfo[senderID]) {
            global.data.userName.set(senderID, userInfo[senderID].name || "Unknown User");
          }
        }
      } catch (e) {
        // Ignore user info errors
      }

      const userName = global.data.userName.get(senderID) || "Unknown User";

      // Log command usage
      logger.log(`Command "${commandName}" used by ${userName} (${senderID})`, "COMMAND");

      // Execute command with enhanced error handling
      try {
        await executeCommand(command, Obj, commandName);
      } catch (error) {
        // Check for syntax errors specifically
        if (error.message && error.message.includes('Missing catch or finally after try')) {
          logger.log(`Syntax error in command "${commandName}": ${error.message}`, "ERROR");
          return api.sendMessage(`⚠️ Command "${commandName}" has a syntax error and needs to be fixed.`, threadID, messageID);
        }
        
        if (shouldIgnoreError(error)) {
          // Log timeout/ignorable errors as DEBUG only
          logger.log(`Command "${commandName}" issue: ${error.message}`, "DEBUG");
        } else {
          // Log other errors normally
          logger.log(`Command "${commandName}" error: ${error.message}`, "ERROR");
        }
      }

    } catch (error) {
      if (!shouldIgnoreError(error)) {
        logger.log(`HandleCommand error: ${error.message}`, "ERROR");
      }
    }
  };
};