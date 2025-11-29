import { chromium } from "playwright-core";
import cheerio from "cheerio";

export default async function handler(req, res) {
  const wallet = req.query.wallet;

  if (!wallet) {
    return res.status(400).json({ error: "Missing wallet parameter" });
  }

  const token = process.env.BROWSERLESS_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "Missing Browserless token" });
  }

  const BROWSERLESS_URL = `wss://chrome.browserless.io?token=${token}`;
  const url = `https://polymarketanalytics.com/trader/${wallet}`;

  try {
    console.log("Connecting to Browserless…");
    const browser = await chromium.connectOverCDP(BROWSERLESS_URL);
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log("Navigating to:", url);
    await page.goto(url, { waitUntil: "networkidle" });

    const html = await page.content();
    const $ = cheerio.load(html);

    const name = $("h1").first().text().trim() || null;
    const winRate = $('div:contains("Win Rate")').next().text().trim() || null;
    const pnl = $('div:contains("Total PnL")').next().text().trim() || null;
    const rank = $('div:contains("Rank")').next().text().trim() || null;

    let markets = [];
    $(".market-card").each((i, el) => {
      const market = $(el).find(".market-title").text().trim();
      const direction = $(el).find(".position").text().trim();
      const size = $(el).find(".size").text().trim();

      if (market) {
        markets.push({ market, direction, size });
      }
    });

    await browser.close();

    return res.status(200).json({
      wallet,
      name,
      winRate,
      pnl,
      rank,
      markets
    });

  } catch (err) {
    console.error("Scraping error:", err);
    return res.status(500).json({
      error: "Scraping failed",
      details: err.message
    });
  }
}
