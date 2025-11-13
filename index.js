import express from "express";
import axios from "axios";

const BOT_TOKEN = process.env.BOT_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ADMIN_ID = process.env.ADMIN_ID;

const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}/`;

const app = express();
app.use(express.json());

// Helper functions
async function sendMessage(chatId, text, replyMarkup = null) {
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;

  try {
    await axios.post(`${API_URL}sendMessage`, payload);
  } catch (e) {
    console.error("sendMessage error:", e.response?.data || e.message);
  }
}

async function sendPhoto(chatId, photoUrl, caption = "") {
  try {
    await axios.post(`${API_URL}sendPhoto`, {
      chat_id: chatId,
      photo: photoUrl,
      caption,
      parse_mode: "HTML",
    });
  } catch (e) {
    console.error("sendPhoto error:", e.response?.data || e.message);
  }
}

async function askOpenAI(chatId, message) {
  try {
    const loading = await sendMessage(chatId, "🤖💭 <b>Dragon AI is thinking...</b> 🐲");

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are Dragon AI, a friendly AI assistant." },
          { role: "user", content: message },
        ],
      },
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
    );

    const reply = response.data.choices?.[0]?.message?.content || "🐲 Sorry, I couldn't process that.";
    await sendMessage(chatId, reply);
  } catch (e) {
    console.error("askOpenAI error:", e.response?.data || e.message);
    await sendMessage(chatId, "❌ Error contacting OpenAI.");
  }
}

// Main webhook handler
app.post("/", async (req, res) => {
  // ✅ Debug log
  console.log("Incoming update:", JSON.stringify(req.body, null, 2));

  const update = req.body;

  if (!update.message) return res.sendStatus(200);

  const chatId = update.message.chat.id;
  const text = update.message.text?.trim() || "";

  // ... your existing command logic
});
  try {
    // /start command
    if (text === "/start") {
      await sendMessage(
        chatId,
        `🔥 <b>Welcome to Dragon AI!</b> 🔥
I’m your ⚡ ChatGPT-4 AI Assistant for Dragons Trend 🐉.
• Ask about the community and $DRGN
• /fetch <CA> for token info
• /generate for AI images`,
        {
          inline_keyboard: [
            [
              { text: "💬 AMA", url: "https://t.me/DragonsAI" },
              { text: "🌐 Join Channel", url: "https://t.me/dragonstrending" },
            ],
          ],
        }
      );
      return res.sendStatus(200);
    }

    // /help
    if (text === "/help") {
      await sendMessage(chatId, `🧭 <b>Dragon AI Commands</b>
💬 Chat naturally with AI
🖼️ /generate <prompt>
📊 /fetch <contract>
👋 Captcha verification`);
      return res.sendStatus(200);
    }

    // /fetch
    if (text.startsWith("/fetch ")) {
      const contract = text.split(" ")[1];
      if (!contract) {
        await sendMessage(chatId, "❌ Provide contract address. Example:\n/fetch 0x1234...");
        return res.sendStatus(200);
      }

      await sendMessage(chatId, `🔍 Fetching token info for <b>${contract}</b>...`);

      try {
        const { data } = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${contract}`);
        const pair = data.pairs?.[0];
        if (!pair) return await sendMessage(chatId, "❌ Token not found!");

        const msg = `📊 <b>Token Info</b>
💠 <b>Name:</b> ${pair.baseToken.name}
🔹 <b>Symbol:</b> ${pair.baseToken.symbol}
💰 <b>Price:</b> $${pair.priceUsd}
📉 <b>Chart:</b> <a href="${pair.url}">View</a>`;
        await sendMessage(chatId, msg);
      } catch (e) {
        await sendMessage(chatId, "❌ Error fetching token info.");
      }
      return res.sendStatus(200);
    }

    // /generate
    if (text.startsWith("/generate ")) {
      const prompt = text.substring(10).trim();
      if (!prompt) {
        await sendMessage(chatId, "❌ Provide prompt. Example: /generate cute dragon flying");
        return res.sendStatus(200);
      }

      await sendMessage(chatId, `🖌️ Generating image for: <b>${prompt}</b>...`);

      try {
        const response = await axios.post(
          "https://api.openai.com/v1/images/generations",
          { model: "gpt-image-1", prompt, size: "1024x1024", n: 1 },
          { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
        );

        const imgUrl = response.data.data?.[0]?.url;
        if (imgUrl) await sendPhoto(chatId, imgUrl, `Generated image for: <b>${prompt}</b>`);
        else await sendMessage(chatId, "❌ Could not generate the image right now.");
      } catch (e) {
        console.error("Image generation error:", e.message);
        await sendMessage(chatId, "❌ Error generating image.");
      }

      return res.sendStatus(200);
    }

    // Default: AI chat
    if (!text.startsWith("/")) {
      await askOpenAI(chatId, text);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook handler error:", err.message);
    res.sendStatus(200);
  }
});

export default app;
