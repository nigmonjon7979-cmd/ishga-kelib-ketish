// One-time endpoint: open in browser to register/check the Telegram webhook
// URL: https://ishga-kelib-ketish.vercel.app/api/telegram-setup
module.exports = async function handler(req, res) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const siteUrl = process.env.SITE_URL || "https://ishga-kelib-ketish.vercel.app";
  const webhookUrl = `${siteUrl}/api/telegram-webhook`;

  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (!token) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "TELEGRAM_BOT_TOKEN env var not set in Vercel" }));
    return;
  }

  try {
    // Get current webhook info
    const infoRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const info = await infoRes.json();

    // Set webhook if not already pointing to the right URL
    let setResult = null;
    if (info.result?.url !== webhookUrl) {
      const setRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ["message", "callback_query"],
          drop_pending_updates: true,
        }),
      });
      setResult = await setRes.json();
    }

    // Get bot info
    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const me = await meRes.json();

    res.statusCode = 200;
    res.end(JSON.stringify({
      ok: true,
      bot: me.result?.username,
      webhookUrl,
      alreadySet: info.result?.url === webhookUrl,
      setResult,
      currentWebhookInfo: info.result,
    }, null, 2));
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: err.message }));
  }
};
