import express from "express";
import axios from "axios";
import TelegramBot from "node-telegram-bot-api";

const BOT_TOKEN = process.env.BOT_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ADMIN_ID = process.env.ADMIN_ID;

const bot = new TelegramBot(BOT_TOKEN);
const app = express();

app.use(express.json());

// === Telegram Webhook ===
app.post("/", async (req, res) => {
  const update = req.body;
  if (!update.message) return res.sendStatus(200);

  const chatId = update.message.chat.id;
  const text = update.message.text || "";
  const topicId = update.message.message_thread_id || null;

  try {
    // /start
    if (text === "/start") {
      const buttons = {
        inline_keyboard: [
          [
            { text: "💬 AMA", url: "https://t.me/DragonsAI" },
            { text: "🌐 Join Channel", url: "https://t.me/dragonstrending" }
          ]
        ]
      };
      const welcome = `🔥 <b>Welcome to Dragon AI!</b> 🔥

I’m your ⚡ <b>ChatGPT-4 AI Assistant</b> for <b>Dragons Trend</b> 🐉.
• Ask about the community and <b>$DRGN</b>
• /fetch <CA> for token info
• /generate for AI images
Tap a button below 👇`;

      await bot.sendMessage(chatId, welcome, {
        parse_mode: "HTML",
        reply_markup: buttons
      });
      return res.sendStatus(200);
    }

    // /help
    if (text === "/help") {
      const helpText = `🧭 <b>Dragon AI Commands</b>
💬 Chat naturally with AI
🖼️ /generate <prompt>
📊 /fetch <contract>
👋 Captcha verification`;
      await bot.sendMessage(chatId, helpText, { parse_mode: "HTML" });
      return res.sendStatus(200);
    }

    // /dragonsinfo
    if (text === "/dragonsinfo") {
      const info = `
🔥 <b>Dragons Trend</b> is a crypto-trending ecosystem built to empower projects, communities, and investors with tools that generate real visibility and hype.

🌍 <b>Vision & Mission</b>
<b>Vision:</b> Leading crypto-trending hub for projects, investors & communities.
<b>Mission:</b>
• Innovative bots for instant visibility.
• Community-first ecosystem.
• Lasting token value through <b>$DRGN</b> utilities & burns.
`;
      await bot.sendMessage(chatId, info, { parse_mode: "HTML" });
      return res.sendStatus(200);
    }

    // /fetch
    if (text.startsWith("/fetch ")) {
      const contract = text.split(" ")[1];
      if (!contract) {
        await bot.sendMessage(
          chatId,
          "❌ Provide contract address. Example:\n/fetch 0xC02aaa39b223FE8D0A0e5C4F27eAD9083C756Cc2",
          { parse_mode: "HTML" }
        );
        return res.sendStatus(200);
      }

      await bot.sendMessage(
        chatId,
        `🔍 Fetching token info for <b>${contract}</b> from Dexscreener...`,
        { parse_mode: "HTML" }
      );

      const { data } = await axios.get(
        `https://api.dexscreener.com/latest/dex/tokens/${contract}`
      );

      if (!data || !data.pairs || data.pairs.length === 0) {
        await bot.sendMessage(chatId, "❌ Token not found on Dexscreener!", {
          parse_mode: "HTML"
        });
        return res.sendStatus(200);
      }

      const pair = data.pairs[0];
      const msg = `📊 <b>Token Info</b>\n
💠 <b>Name:</b> ${pair.baseToken.name}
🔹 <b>Symbol:</b> ${pair.baseToken.symbol}
💰 <b>Price:</b> $${pair.priceUsd}
📈 <b>Market Cap:</b> $${pair.liquidity.usd}
📊 <b>24h Volume:</b> $${pair.volume.usd}
📉 <b>Chart:</b> <a href="${pair.url}">View</a>`;

      await bot.sendMessage(chatId, msg, { parse_mode: "HTML" });
      return res.sendStatus(200);
    }

    // /generate
    if (text.startsWith("/generate ")) {
      const prompt = text.substring(10).trim();
      if (!prompt) {
        await bot.sendMessage(
          chatId,
          "❌ Provide prompt. Example: /generate cute dragon flying",
          { parse_mode: "HTML" }
        );
        return res.sendStatus(200);
      }

      await bot.sendMessage(chatId, `🖌️ Generating image for: <b>${prompt}</b>...`, {
        parse_mode: "HTML"
      });

      const aiResponse = await axios.post(
        "https://api.openai.com/v1/images/generations",
        {
          model: "gpt-image-1",
          prompt,
          size: "1024x1024",
          n: 1
        },
        { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
      );

      const imgUrl = aiResponse.data.data?.[0]?.url;
      if (imgUrl) {
        await bot.sendPhoto(chatId, imgUrl, {
          caption: `Generated image for: <b>${prompt}</b>`,
          parse_mode: "HTML"
        });
      } else {
        await bot.sendMessage(chatId, "❌ Could not generate image right now.", {
          parse_mode: "HTML"
        });
      }
      return res.sendStatus(200);
    }

    // 🤖 AI chat (OpenAI)
    if (!text.startsWith("/")) {
      const loading = await bot.sendMessage(
        chatId,
        "🤖💭 <b>Dragon AI is thinking...</b> 🐲",
        { parse_mode: "HTML" }
      );

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are Dragon AI, a friendly AI assistant. Bold all keywords like Telegram, $DRGN, Dragon AI, Fetch, Dexscreener. Use emoji-rich, clean style."
            },
            { role: "user", content: text }
          ]
        },
        { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
      );

      const reply =
        response.data.choices?.[0]?.message?.content ||
        "🐲 Sorry, I couldn't process that right now.";

      await bot.sendMessage(chatId, reply, { parse_mode: "HTML" });
      await bot.deleteMessage(chatId, loading.message_id);
    }

    res.sendStatus(200);
  } catch (e) {
    console.error("Error:", e.message);
    res.sendStatus(200);
  }
});

export default app;
