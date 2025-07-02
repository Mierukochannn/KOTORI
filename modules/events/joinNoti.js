const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
  name: "joinNoti",
  eventType: ["log:subscribe"],
  version: "2.1.0",
  credits: "Aesther",
  description: "Elegant join notification system with media support",
  dependencies: {
    "fs-extra": "",
    "path": ""
  }
};

module.exports.onLoad = function () {
  const joinVideoDir = path.join(__dirname, "cache", "joinvideo");
  const gifDir = path.join(joinVideoDir, "randomgif");
  if (!fs.existsSync(joinVideoDir)) fs.mkdirSync(joinVideoDir, { recursive: true });
  if (!fs.existsSync(gifDir)) fs.mkdirSync(gifDir, { recursive: true });
};

module.exports.run = async function ({ api, event, Users }) {
  try {
    const { threadID } = event;
    const configPath = path.join(__dirname, '../../config.json');
    let config;
    try {
      delete require.cache[require.resolve(configPath)];
      config = require(configPath);
    } catch {
      config = {};
    }

    if (!config.APPROVAL) {
      config.APPROVAL = { approvedGroups: [], pendingGroups: [], rejectedGroups: [] };
    }

    if (!config.APPROVAL.approvedGroups.includes(String(threadID))) return;

    const isBotJoin = event.logMessageData.addedParticipants.some(i => i.userFbId === api.getCurrentUserID());
    const botname = global.config.BOTNAME || "BOTPACK";

    if (isBotJoin) {
      try {
        await api.changeNickname(`[ ${global.config.PREFIX} ] • ${botname}`, threadID, api.getCurrentUserID());
        const threadInfo = await api.getThreadInfo(threadID);
        const { threadName, participantIDs, adminIDs } = threadInfo;
        const currentTime = new Date().toLocaleString("en-US", { timeZone: "Europe/Paris", hour12: false });

        const welcomeText = `
╔══════════════════════════╗
  🤖 𝗕𝗢𝗧𝗣𝗔𝗖𝗞 𝗝𝗢𝗜𝗡𝗘𝗗 🤖
╚══════════════════════════╝

🎉 Hello everyone!

✨ I'm ${botname}, happy to join "${threadName}"!

🧩 Group Info:
• 👥 Members: ${participantIDs.length}
• 👑 Admins: ${adminIDs.length}
• 🎛 Prefix: ${global.config.PREFIX}
• 🔧 Commands: ${global.client.commands.size}+

📌 Start here:
${global.config.PREFIX}help | All commands
${global.config.PREFIX}menu | Command categories
${global.config.PREFIX}info | Bot info
${global.config.PREFIX}admin | Admin commands

🌟 Features:
• 🤖 AI Chat & Image Gen
• 🎵 Media Downloader
• 🛡️ Group Tools
• 🎮 Mini-games
• 🌐 Web tools & Translate

🕒 Joined at: ${currentTime}

━━━━━━━━━━━━━━━━━━━━
⚡ Bot by Aesther ⚡
━━━━━━━━━━━━━━━━━━━━`;

        const welcomeFiles = ["ullash.mp4", "join.gif", "welcome.mp4"].map(f => path.join(__dirname, "cache", "join", f));
        let attachment = welcomeFiles.find(p => fs.existsSync(p)) ? fs.createReadStream(welcomeFiles.find(p => fs.existsSync(p))) : null;

        return api.sendMessage({ body: welcomeText, attachment }, threadID);

      } catch (err) {
        return api.sendMessage(`🤖 ${botname} has joined the group! Use ${global.config.PREFIX}help to get started.\n\nMade by Aesther`, threadID);
      }
    }

    const threadInfo = await api.getThreadInfo(threadID);
    const { participantIDs, threadName } = threadInfo;
    const threadData = global.data.threadData.get(parseInt(threadID)) || {};

    const template = threadData.customJoin || `
╔═════════════════════════════╗
     🎉 𝗪𝗘𝗟𝗖𝗢𝗠𝗘 𝗧𝗢 𝗧𝗛𝗘 𝗚𝗥𝗢𝗨𝗣 🎉
╚═════════════════════════════╝

👋 Welcome {name}!
You are member #{memberNumber} of "{threadName}".

📌 Use:
${global.config.PREFIX}help | List of commands
${global.config.PREFIX}rules | Group rules
${global.config.PREFIX}info | Bot info

Please be respectful and enjoy your time! ✨

━━━━━━━━━━━━━━━━━━━━
⚡ BOTPACK by Aesther ⚡
━━━━━━━━━━━━━━━━━━━━`;

    const memJoin = event.logMessageData.addedParticipants;
    const nameArray = memJoin.map(u => u.fullName);
    const mentions = memJoin.map(u => ({ tag: u.fullName, id: u.userFbId }));
    const memberNumbers = memJoin.map((_, i) => participantIDs.length - memJoin.length + i + 1);

    let welcome = template
      .replace(/{name}/g, nameArray.join(", "))
      .replace(/{memberNumber}/g, memberNumbers.join(", "))
      .replace(/{threadName}/g, threadName);

    const gifDir = path.join(__dirname, "cache", "joinvideo", "randomgif");
    let attachment;
    if (fs.existsSync(gifDir)) {
      const files = fs.readdirSync(gifDir).filter(f => [".gif", ".mp4", ".jpg", ".jpeg", ".png"].includes(path.extname(f)));
      if (files.length) attachment = fs.createReadStream(path.join(gifDir, files[Math.floor(Math.random() * files.length)]));
    }

    return api.sendMessage({ body: welcome, mentions, attachment }, threadID);

  } catch (e) {
    console.error('JoinNoti error:', e);
  }
};
