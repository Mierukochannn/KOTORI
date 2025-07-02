
const axios = require("axios");

const fonts = {
  a: "𝖺", b: "𝖻", c: "𝖼", d: "𝖽", e: "𝖾", f: "𝖿", g: "𝗀", h: "𝗁", i: "𝗂",
  j: "𝗃", k: "𝗄", l: "𝗅", m: "𝗆", n: "𝗇", o: "𝗈", p: "𝗉", q: "𝗊", r: "𝗋",
  s: "𝗌", t: "𝗍", u: "𝗎", v: "𝗏", w: "𝗐", x: "𝗑", y: "𝗒", z: "𝗓",
  A: "𝖠", B: "𝖡", C: "𝖢", D: "𝖣", E: "𝖤", F: "𝖥", G: "𝖦", H: "𝖧", I: "𝖨",
  J: "𝖩", K: "𝖪", L: "𝖫", M: "𝖬", N: "𝖭", O: "𝖮", P: "𝖯", Q: "𝖰", R: "𝖱",
  S: "𝖲", T: "𝖳", U: "𝖴", V: "𝖵", W: "𝖶", X: "𝖷", Y: "𝖸", Z: "𝖹"
};

const stickers = [
  "2041021609458646", "2041021119458695", "254593389337365",
  "1747085735602678", "456548350088277", "456549450088167"
];

function stylize(text) {
  return text.split('').map(c => fonts[c] || c).join('');
}

function splitMessage(text, max = 1900) {
  const chunks = [];
  for (let i = 0; i < text.length; i += max) {
    chunks.push(text.substring(i, i + max));
  }
  return chunks;
}

// Conversation context store
const convoContext = new Map();

module.exports = {
  name: "ai",
  version: "2.0.0",
  credits: "Aesther",
  description: "🤖 Ask GPT-4o and chat with it (with emoji styled response)",
  usage: "{prefix}ai <message> | reply to continue",
  cooldown: 2,
  hasPrefix: false,
  aliases: ["anjara", "Ae"],
  prefix: true,
  commandCategory: "ai",
  role: 0,

  async run({ api, event, args }) {
    let prompt = args.join(" ").trim();

    // Reply detection for reply-chat continuation
    if (!prompt && event.messageReply?.body && event.messageReply?.senderID === api.getCurrentUserID()) {
      prompt = event.body.trim();
    }

    if (!prompt) {
      const randomSticker = stickers[Math.floor(Math.random() * stickers.length)];
      return api.sendMessage({ sticker: randomSticker }, event.threadID, event.messageID);
    }

    // Génération du contexte si existe
    const contextId = `${event.threadID}:${event.senderID}`;
    const previousPrompt = convoContext.get(contextId);
    const fullPrompt = previousPrompt ? `${previousPrompt}\nUser: ${prompt}` : prompt;

    const url = `https://haji-mix-api.gleeze.com/api/gpt4o?ask=${encodeURIComponent(fullPrompt)}&uid=${event.senderID}&roleplay=Emoji`;

    try {
      const res = await axios.get(url);
      const reply = res.data?.answer || "🤖 No response.";
      const stylized = stylize(reply);
      const chunks = splitMessage(stylized);

      for (const chunk of chunks) {
        await api.sendMessage(
          `${chunk}\n⊍⊎⊌`,
          event.threadID
        );
      }

      // Stocke le prompt actuel comme base pour le suivant
      convoContext.set(contextId, `${fullPrompt}\nBot: ${reply}`);
      await api.setMessageReaction("✨", event.messageID, () => {}, true);

    } catch (err) {
      console.error("❌ AI Error:", err);
      return api.sendMessage("❌ AI Error. Please try again later.", event.threadID, event.messageID);
    }
  }
};
