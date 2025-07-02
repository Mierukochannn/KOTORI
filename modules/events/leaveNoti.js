const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
  name: "leave",
  eventType: ["log:unsubscribe"],
  version: "7.1.0",
  credits: "Aesther",
  description: "💨 Stylish leave notification + Anti-Out protection",
  dependencies: {}
};

// Stylized ASCII text
function stylishText(text, style = "default") {
  const styles = {
    default: `❖ ${text} ❖`,
    danger: `⛔ ${text} ⛔`,
    cool: `✧ ${text} ✧`,
    success: `✅ ${text} ✅`,
    warning: `⚠️ ${text} ⚠️`,
    fancy: `🌟 ${text} 🌟`,
    fire: `🔥 ${text} 🔥`,
    boss: `👑 ${text} 👑`,
    antiout: `🛡️ ${text} 🛡️`
  };
  return styles[style] || styles.default;
}

module.exports.run = async function({ api, event, Users, Threads }) {
  try {
    const { threadID } = event;
    const leftID = event.logMessageData.leftParticipantFbId;

    if (leftID == api.getCurrentUserID()) return;

    const threadData = (await Threads.getData(threadID)).data || {};
    const isAntiOut = threadData.antiout === true;

    const userName = global.data.userName.get(leftID) || await Users.getNameUser(leftID) || "Unknown";

    const isKicked = event.author !== leftID;
    const isLeftBySelf = event.author === leftID;

    const time = new Date().toLocaleString("en-GB", {
      timeZone: "Europe/Paris",
      hour12: false
    });

    if (isLeftBySelf && isAntiOut) {
      api.addUserToGroup(leftID, threadID, async (err) => {
        if (err) {
          const failText = err.toString().includes("admin") ?
          `┏━━━━━━━━━━━━━━━┓
┃   🔒 𝗔𝗡𝗧𝗜-𝗢𝗨𝗧 𝗙𝗔𝗜𝗟𝗘𝗗 🔒
┗━━━━━━━━━━━━━━━┛
${stylishText(`${userName} tried to run away!`, "danger")}

🚫 Bot is not an admin, can't re-add.
🧠 Make the bot admin to activate anti-out.
🕒 Time: ${time}

— Powered by Aesther`
          :
          `┏━━━━━━━━━━━━━━━┓
┃   🔒 𝗔𝗡𝗧𝗜-𝗢𝗨𝗧 𝗙𝗔𝗜𝗟𝗘𝗗 🔒
┗━━━━━━━━━━━━━━━┛
${stylishText(`${userName} attempted to leave... but blocked me? 😠`, "danger")}

🚫 Couldn't re-add the user.
🧠 Check if they've blocked the bot.
🕒 Time: ${time}

— Powered by Aesther`;

          return api.sendMessage(failText, threadID);
        }

        const videoPath = path.join(__dirname, "cache", "leave", "antiout.mp4");
        const videoExists = fs.existsSync(videoPath);
        const msg = `┏━━━━━━━━━━━━━━━┓
┃   👑 𝗔𝗡𝗧𝗜-𝗢𝗨𝗧 𝗔𝗖𝗧𝗜𝗩𝗔𝗧𝗘𝗗 👑
┗━━━━━━━━━━━━━━━┛
${stylishText(`${userName} tried to escape!`, "boss")}

✅ Successfully brought back.
🛡️ Anti-Out system is active!
🕒 Time: ${time}

— Made with love by Aesther`;

        return api.sendMessage({
          body: msg,
          attachment: videoExists ? fs.createReadStream(videoPath) : undefined
        }, threadID);
      });
      return;
    }

    if (!isAntiOut || isKicked) {
      const text = isKicked
        ? `${stylishText(`${userName} got kicked!`, "warning")}

👢 Another one bites the dust...
🕒 Time: ${time}`
        : `${stylishText(`${userName} left the group.`, "fire")}

💨 Gone with the wind...
🕒 Time: ${time}`;

      return api.sendMessage(
        `┏━━━━━━━━━━━━━━━┓
┃    📤 𝗟𝗘𝗔𝗩𝗘 𝗔𝗟𝗘𝗥𝗧 📤
┗━━━━━━━━━━━━━━━┛
${text}

— Aesther was watching 👁️`,
        threadID
      );
    }

  } catch (err) {
    console.error("Leave error:", err.message);
    const name = global.data.userName.get(event.logMessageData.leftParticipantFbId) || "Unknown";

    return api.sendMessage(
      `┏━━━━━━━━━━━━━━━┓
┃    ⚠️ 𝗟𝗘𝗔𝗩𝗘 𝗘𝗥𝗥𝗢𝗥 ⚠️
┗━━━━━━━━━━━━━━━┛
${stylishText(`${name} left the group.`, "warning")}

🚩 Error occurred during leave handling.
🧠 Contact an admin if needed.

— Aesther Core`,
      event.threadID
    );
  }
};
