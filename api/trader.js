import { chromium } from "playwright";
import cheerio from "cheerio";

export default async function handler(req, res) {
  const wallet = req.query.wallet;

  if (!wallet) {
    return res.status(400).json({ error: "Missing wallet parameter" });
  }

  const url = `https://polymarketanalytics.com/trader/${wallet}`;

  try {
    // Launch headless browser
    const browser = await chromium.launch();
    const page = await browser.newPage();

    // Navigate and wait for rendering
    await page.goto(url, { waitUntil: "networkidle" });

    // Extract the rendered HTML
    const html = await page.content();
    const $ = cheerio.load(html);

    // Extract basic info
    const name = $("h1").first().text().trim() || null;

    const winRate = $('div:contains("Win Rate")').next().text().trim() || null;

    const pnl = $('div:contains("Total PnL")').next().text().trim() || null;

    const rank = $('div:contains("Rank")').next().text().trim() || null;

    // Extract positions
    let markets = [];
    $(".market-card").each((i, el) => {
      const market = $(el).find(".market-title").text().trim();
      const direction = $(el).find(".position").text().trim();
      const size = $(el).find(".size").text().trim();

      markets.push({ market, direction, size });
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
    console.error("Error during scraping:", err);
    return res.status(500).json({
      error: "Scraping failed",
      details: err.message
    });
  }
}
