import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.join(__dirname, "seen_ids.json");
const MAX_CACHE_SIZE = 150;

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env"), override: true });

const NITTER_BASE_URL = process.env.NITTER_BASE_URL;
const SUPABASE_WEBHOOK_URL = process.env.SUPABASE_WEBHOOK_URL;
const WEBHOOK_SECRET = process.env.IFTTT_WEBHOOK_SECRET || "";
const INCLUDE_REPLIES = process.env.NITTER_INCLUDE_REPLIES !== "false";
const PROFILE_USERNAME = (process.env.PROFILE_USERNAME ?? "").trim() || "elonmusk";
const USER_DISPLAY_NAME = (process.env.USER_DISPLAY_NAME ?? "").trim() || "Elon Musk";

// ── Supabase client for live logging ──
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
let sb = null;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  console.log("✅ Live logging enabled (poller_logs table)");
} else {
  console.warn("⚠️ Live logging disabled — missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

/** Insert a log entry into poller_logs (fire-and-forget). */
async function log(level, message) {
  console.log(`[${level.toUpperCase()}] ${message}`);
  if (!sb) return;
  try {
    await sb.from("poller_logs").insert({ level, message });
  } catch (e) {
    // Silently ignore logging errors
  }
}

if (!NITTER_BASE_URL || !SUPABASE_WEBHOOK_URL) {
  console.error("ERROR: Missing NITTER_BASE_URL or SUPABASE_WEBHOOK_URL in .env");
  process.exit(1);
}

/**
 * Persistence Logic: Load and Save processed IDs
 */
function loadSeenIds() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const fileData = fs.readFileSync(CACHE_FILE, "utf8");
      return JSON.parse(fileData);
    }
  } catch (e) {
    console.error("Cache load error:", e.message);
  }
  return [];
}

function saveSeenId(id, currentIds) {
  try {
    if (!currentIds.includes(id)) {
      currentIds.push(id);
      let listToSave = currentIds;
      if (currentIds.length > MAX_CACHE_SIZE) {
        listToSave = currentIds.slice(-MAX_CACHE_SIZE);
      }
      fs.writeFileSync(CACHE_FILE, JSON.stringify(listToSave, null, 2));
      return listToSave;
    }
  } catch (e) {
    console.error("Cache save error:", e.message);
  }
  return currentIds;
}

let processedIds = loadSeenIds();

function stripHtml(htmlString) {
  if (!htmlString || typeof htmlString !== "string") return "";
  return htmlString.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseQuoteFromDescription(titleText, descText) {
  const main = (titleText || "").trim();
  const raw = descText || "";
  if (!raw) return { mainText: main, quotedTweetText: null };

  const blockquoteMatch = raw.match(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/i);
  if (blockquoteMatch) {
    return { mainText: main, quotedTweetText: stripHtml(blockquoteMatch[1]).trim() };
  }

  if (/^RT by\s+@/i.test(main)) {
    return { mainText: main, quotedTweetText: stripHtml(raw).trim() };
  }

  return { mainText: main, quotedTweetText: null };
}

async function poll() {
  try {
    const feedPath = INCLUDE_REPLIES ? `${PROFILE_USERNAME}/with_replies/rss` : `${PROFILE_USERNAME}/rss`;
    const rssUrl = `${NITTER_BASE_URL.replace(/\/$/, "")}/${feedPath}`;
    await log("poll", `Polling: ${rssUrl}`);

    const response = await fetch(rssUrl);
    if (!response.ok) {
      await log("error", `Nitter Error: ${response.status}`);
      return;
    }

    const xmlData = await response.text();
    const parsedResult = await parseStringPromise(xmlData);
    const channelNode = parsedResult?.rss?.channel?.[0];
    const itemsList = channelNode?.item || [];

    const isFirstRun = processedIds.length === 0;
    if (isFirstRun) {
      await log("info", "First run: Initializing cache with current items...");
    }

    // Process items from oldest to newest
    const reversedItems = [...itemsList].reverse();

    for (const tweetEntry of reversedItems) {
      const tweetLink = tweetEntry.link?.[0] || "";
      const tweetGuid = tweetEntry.guid?.[0]?._ || tweetEntry.guid?.[0] || tweetLink;

      if (!tweetGuid) continue;
      if (processedIds.includes(tweetGuid)) continue;

      if (isFirstRun) {
        processedIds = saveSeenId(tweetGuid, processedIds);
        continue;
      }

      const tweetTitle = tweetEntry.title?.[0] || "";
      if (/^R to\s+@/i.test(tweetTitle)) {
        await log("skip", `Reply skipped: ${tweetTitle.slice(0, 60)}`);
        processedIds = saveSeenId(tweetGuid, processedIds);
        continue;
      }

      const tweetDesc = tweetEntry.description?.[0] || tweetEntry["content:encoded"]?.[0] || "";
      const { mainText, quotedTweetText } = parseQuoteFromDescription(tweetTitle, tweetDesc);

      // TIMESTAMP FIX: Use current time for reposts to ensure they are active in rounds
      const isPureRepost = /^RT by\s+@/i.test(tweetTitle);
      const finalTimestamp = isPureRepost ? new Date().toISOString() : (tweetEntry.pubDate?.[0] || new Date().toISOString());

      const payload = {
        text: mainText,
        tweet_url: tweetLink,
        created_at: finalTimestamp,
        user_name: USER_DISPLAY_NAME,
        author_username: PROFILE_USERNAME,
        tweet_type: isPureRepost ? "repost" : (quotedTweetText ? "quote" : "post"),
        quoted_tweet_text: quotedTweetText,
      };

      const requestHeaders = { "Content-Type": "application/json" };
      if (WEBHOOK_SECRET) requestHeaders["x-webhook-secret"] = WEBHOOK_SECRET;

      const tweetTypeLabel = isPureRepost ? "repost" : (quotedTweetText ? "quote" : "post");
      await log(tweetTypeLabel, `New ${tweetTypeLabel} detected: ${mainText.slice(0, 80)}`);

      const webhookResponse = await fetch(SUPABASE_WEBHOOK_URL, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify(payload),
      });

      if (webhookResponse.ok) {
        const preview = quotedTweetText ? `${mainText.slice(0, 40)}... [+quote]` : mainText.slice(0, 80);
        await log("success", `Sent to backend: ${preview}`);
        processedIds = saveSeenId(tweetGuid, processedIds);
      } else {
        const errorBody = await webhookResponse.text();
        await log("error", `Webhook Error (${webhookResponse.status}): ${errorBody.slice(0, 120)}`);
      }
    }
  } catch (err) {
    await log("error", `Poll Exception: ${err.message}`);
  }
}

async function main() {
  await log("info", `==========================================`);
  await log("info", `FIXED NITTER POLLER STARTING`);
  await log("info", `Target: ${PROFILE_USERNAME}`);
  await log("info", `==========================================`);
  await poll();
  setInterval(poll, 15_000);
}

main().catch((fatal) => {
  console.error("FATAL SYSTEM ERROR:", fatal);
});
