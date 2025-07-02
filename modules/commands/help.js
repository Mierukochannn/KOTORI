module.exports.config = {
  name: "help",
  version: "1.0.6",
  hasPermssion: 0,
  usePrefix: true,
  credits: "Aesther",
  description: "✨ Affiche la liste des commandes ou les détails d'une commande avec style",
  commandCategory: "system",
  usages: "[nom_commande/page/all]",
  cooldowns: 5,
  envConfig: {
    autoUnsend: true,
    delayUnsend: 20
  }
};

module.exports.languages = {
  "en": {
    "moduleInfo": `
╔════════════════╗
║𝗕𝗢𝗧𝗣𝗔𝗖𝗞 - 𝗠𝗢𝗗𝗨𝗟𝗘 
╚════════════════╝
🎯 Nom         : %1
🛠 Usage       : %3
📄 Description : %2
📂 Catégorie   : %4
⏰ Cooldown    : %5s secondes
🔐 Permission  : %6

✨ Créé par Aesther ✨`,
    "helpList": `💠 𝗕𝗢𝗧𝗣𝗔𝗖𝗞 possède %1 commandes disponibles !
🔎 Astuce : tapez %2help [nom_commande] pour les détails.`,
    "user": "Utilisateur",
    "adminGroup": "Admin groupe",
    "adminBot": "Admin bot"
  },
  "fr": {
    "moduleInfo": `
╔═══════════════╗
║𝗕𝗢𝗧𝗣𝗔𝗖𝗞 - 𝗠𝗢𝗗𝗨𝗟𝗘 
╚═══════════════╝
🎯 Nom         : %1
🛠 Usage       : %3
📄 Description : %2
📂 Catégorie   : %4
⏰ Cooldown    : %5s secondes
🔐 Permission  : %6

✨ Créé par Aesther ✨`,
    "helpList": `💠 𝗕𝗢𝗧𝗣𝗔𝗖𝗞 dispose de %1 commandes !
🔎 Astuce : tapez %2help [nom_commande] pour plus d'infos.`,
    "user": "Utilisateur",
    "adminGroup": "Admin groupe",
    "adminBot": "Admin bot"
  }
};
module.exports.handleEvent = function ({ api, event, getText }) {
  const { commands } = global.client;
  const { threadID, messageID, body } = event;

  if (!body || typeof body == "undefined" || body.indexOf("help") != 0) return;
  const splitBody = body.slice(body.indexOf("help")).trim().split(/\s+/);
  if (splitBody.length === 1 || !commands.has(splitBody[1].toLowerCase())) return;

  const threadSetting = global.data.threadData.get(parseInt(threadID)) || {};
  const command = commands.get(splitBody[1].toLowerCase());
  const prefix = (threadSetting.hasOwnProperty("PREFIX")) ? threadSetting.PREFIX : global.config.PREFIX;

  const permissionText = (command.config.hasPermssion === 0) ? getText("user") : (command.config.hasPermssion === 1) ? getText("adminGroup") : getText("adminBot");

  return api.sendMessage(
    getText("moduleInfo",
      command.config.name,
      command.config.description,
      `${prefix}${command.config.name} ${(command.config.usages) ? command.config.usages : ""}`,
      command.config.commandCategory,
      command.config.cooldowns,
      permissionText
    ),
    threadID,
    messageID
  );
}

module.exports.run = function ({ api, event, args, getText }) {
  const { commands } = global.client;
  const { threadID, messageID } = event;
  const command = commands.get((args[0] || "").toLowerCase());
  const threadSetting = global.data.threadData.get(parseInt(threadID)) || {};
  const { autoUnsend, delayUnsend } = global.configModule[this.config.name];
  const prefix = (threadSetting.hasOwnProperty("PREFIX")) ? threadSetting.PREFIX : global.config.PREFIX;

  // Afficher toutes les commandes par catégorie
  if (args[0] === "all") {
    const cmds = commands.values();
    let group = [], msg = "";

    for (const commandConfig of cmds) {
      if (!group.some(item => item.group === commandConfig.config.commandCategory))
        group.push({ group: commandConfig.config.commandCategory, cmds: [commandConfig.config.name] });
      else
        group.find(item => item.group === commandConfig.config.commandCategory).cmds.push(commandConfig.config.name);
    }

    group.forEach(commandGroup =>
      msg += `\n🌟 𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝘆 : 【${commandGroup.group.charAt(0).toUpperCase() + commandGroup.group.slice(1)}】\n${commandGroup.cmds.map(cmd => `   ➤ ${cmd.toUpperCase()}`).join('\n')}\n`
    );

    const header = `
╔═════════════════╗
║ 🌸 𝗕𝗢𝗧𝗣𝗔𝗖𝗞 𝗛𝗘𝗟𝗣 🌸
╚═════════════════╝
    `;

    const footer = `
━━━━━━━━━━━━━━━━━━━
📌 Total commandes : ${commands.size}
👑 Owner : Aesther
🔍 Astuce : ${prefix}help [nom_commande] pour plus d'infos
━━━━━━━━━━━━━━━━━━━`;

    api.sendMessage(header + msg + footer, threadID, (err, info) => {
      if (!autoUnsend) {
        setTimeout(() => api.unsendMessage(info.messageID), delayUnsend * 1000);
      }
    }, messageID);
    return;
  }

  // Liste des commandes par page
  if (!command) {
    const allCmds = Array.from(commands.keys()).sort();
    const page = Math.max(parseInt(args[0]) || 1, 1);
    const perPage = 15;
    const start = perPage * (page - 1);
    const helpPage = allCmds.slice(start, start + perPage);

    let msg = "";
    for (const cmd of helpPage) msg += `➤ ${cmd.toUpperCase()}\n`;

    const header = `
╔════════════════╗
║ 🌸𝗕𝗢𝗧𝗣𝗔𝗖𝗞 𝗖𝗠𝗗🌸
╚════════════════╝
    `;

    const footer = `
━━━━━━━━━━━━━━━━
📄 Page : [${page}/${Math.ceil(allCmds.length / perPage)}]
📝 Total : ${allCmds.length} commandes
🔍 Tapez : ${prefix}help [nom_commande]
━━━━━━━━━━━━━━━━`;

    api.sendMessage(header + msg + footer, threadID, (err, info) => {
      if (!autoUnsend) {
        setTimeout(() => api.unsendMessage(info.messageID), delayUnsend * 1000);
      }
    }, messageID);
    return;
  }

  // Détails d'une commande
  const permText = (command.config.hasPermssion === 0) ? getText("user") : (command.config.hasPermssion === 1) ? getText("adminGroup") : getText("adminBot");

  const moduleInfo = getText("moduleInfo",
    command.config.name,
    command.config.description || "Une commande magique, simple et fun !",
    `${prefix}${command.config.name} ${(command.config.usages) ? command.config.usages : ""}`,
    command.config.commandCategory,
    command.config.cooldowns,
    permText
  );

  api.sendMessage(moduleInfo, threadID, (err, info) => {
    if (!autoUnsend) {
      setTimeout(() => api.unsendMessage(info.messageID), delayUnsend * 1000);
    }
  }, messageID);
};
