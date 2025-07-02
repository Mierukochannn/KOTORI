const fs = require("fs-extra");

module.exports.config = {
  name: "prefix",
  version: "2.1",
  hasPermssion: 0,
  usePrefix: false,
  credits: "Aesther",
  description: "🎀 Voir ou changer le préfixe",
  commandCategory: "config",
  usages: "[nouveau prefix/reset]",
  cooldowns: 3
};

module.exports.run = async ({ api, event, args }) => {
  const { threadID, senderID, messageID } = event;
  const threadDataPath = __dirname + "/../dataThreads.json";

  // Charger les données thread
  let threadData = {};
  if (fs.existsSync(threadDataPath)) {
    threadData = JSON.parse(fs.readFileSync(threadDataPath));
  }

  const globalPrefix = global.config.PREFIX || "!";
  const currentPrefix = threadData[threadID]?.prefix || globalPrefix;

  if (!args[0]) {
    const name = (await api.getUserInfo(senderID))[senderID].name;

    return api.sendMessage({
      body: `
╭─━━━━━ ∘◦ ❀ ◦∘ ━━━━━─╮
    🌸 𝙄𝙉𝙁𝙊 𝙋𝙍𝙀𝙁𝙄𝙓 🌸
╰─━━━━━ ∘◦ ❀ ◦∘ ━━━━━─╯

👤 𝙐𝙩𝙞𝙡𝙞𝙨𝙖𝙩𝙚𝙪𝙧 : ${name}
🛸 𝗚𝗟𝗢𝗕𝗔𝗟 : [ ${globalPrefix} ]
🏠 𝗦𝗔𝗟𝗢𝗡 : [ ${currentPrefix} ]

📌 Tape « ${currentPrefix}help » pour voir les commandes.
✦ Créé par 𝗔𝗲𝘀𝘁𝗵𝗲𝗿 ✦`,
      attachment: await global.utils.getStreamFromURL("https://i.imgur.com/dV0G0Sw.jpeg")
    }, threadID, messageID);
  }

  // Réinitialisation
  if (args[0].toLowerCase() === "reset") {
    if (threadData[threadID]) delete threadData[threadID].prefix;
    fs.writeFileSync(threadDataPath, JSON.stringify(threadData, null, 2));
    return api.sendMessage(`🔁 Préfixe réinitialisé à :『 ${globalPrefix} 』`, threadID, messageID);
  }

  // Changement de préfixe
  const newPrefix = args[0];

  if (!threadData[threadID]) threadData[threadID] = {};
  threadData[threadID].prefix = newPrefix;
  fs.writeFileSync(threadDataPath, JSON.stringify(threadData, null, 2));

  return api.sendMessage(`✅ Préfixe mis à jour pour ce salon :『 ${newPrefix} 』`, threadID, messageID);
};
