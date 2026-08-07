import { setCors } from "./_lib/api-auth.js";

const CRYPTO_IDS = {
  btc: "bitcoin",
  eth: "ethereum",
  sol: "solana",
  bnb: "binancecoin",
  xrp: "ripple",
  ada: "cardano",
  doge: "dogecoin",
  dot: "polkadot",
  avax: "avalanche-2",
  matic: "matic-network",
  ltc: "litecoin",
  link: "chainlink",
  ton: "the-open-network",
  shib: "shiba-inu",
  trx: "tron",
};

const CACHE_TTL_MS = 60000;
let cachedResponse = null;

async function loadCryptoPrices() {
  const ids = Object.values(CRYPTO_IDS).join(",");
  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) {
    throw new Error(`CoinGecko returned ${response.status}`);
  }

  const data = await response.json();
  const prices = {};
  Object.entries(CRYPTO_IDS).forEach(([coin, id]) => {
    const price = Number(data[id]?.usd);
    if (!Number.isFinite(price)) return;
    prices[coin] = {
      price,
      change: Number(data[id]?.usd_24h_change) || 0,
    };
  });
  return prices;
}

export default async function handler(req, res) {
  setCors(res, "GET, OPTIONS");
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=60, stale-while-revalidate=300",
  );

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (cachedResponse && Date.now() - cachedResponse.cachedAt < CACHE_TTL_MS) {
    return res.status(200).json(cachedResponse);
  }

  try {
    const prices = await loadCryptoPrices();
    cachedResponse = { prices, cachedAt: Date.now() };
    return res.status(200).json(cachedResponse);
  } catch (error) {
    console.error("[crypto-prices] Failed to load prices:", error);
    if (cachedResponse) return res.status(200).json(cachedResponse);
    return res.status(502).json({ error: "Crypto prices unavailable" });
  }
}
