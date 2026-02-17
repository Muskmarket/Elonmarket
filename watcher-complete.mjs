import 'dotenv/config';
import puppeteer from 'puppeteer';
import fetch from 'node-fetch';

const PROFILE_USERNAME = process.env.PROFILE_USERNAME || 'elonmusk';
const SUPABASE_WEBHOOK_URL = process.env.SUPABASE_WEBHOOK_URL;
const IFTTT_WEBHOOK_SECRET = process.env.IFTTT_WEBHOOK_SECRET || '';

if (!SUPABASE_WEBHOOK_URL) {
  console.error('Missing SUPABASE_WEBHOOK_URL. Check .env');
  process.exit(1);
}

let lastTweetId = null;

async function openProfile(page) {
  const profileUrl = `https://x.com/${PROFILE_USERNAME}`;
  console.log('Opening profile:', profileUrl);
  await page.goto(profileUrl, { waitUntil: 'networkidle2' });
}

async function getLatestTweet(page) {
  // This selector may need tweaking if X changes layout
  const tweetSelector = 'article[data-testid="tweet"]';

  await page.waitForSelector(tweetSelector, { timeout: 60000 });

  const tweet = await page.$(tweetSelector);
  if (!tweet) return null;

  const tweetData = await page.evaluate(el => {
    const textEl = el.querySelector('div[data-testid="tweetText"]');
    const anchorEl = el.querySelector('a[href*="/status/"] time')?.parentElement;
    const timeEl = el.querySelector('time');

    const text = textEl ? textEl.innerText : '';
    const link = anchorEl ? anchorEl.href : '';
    const createdAt = timeEl ? timeEl.getAttribute('datetime') : null;

    // Extract tweet ID from URL
    let tweetId = null;
    if (link) {
      const m = link.match(/status\/(\d+)/);
      tweetId = m ? m[1] : null;
    }

    return { text, link, createdAt, tweetId };
  }, tweet);

  if (!tweetData || !tweetData.text || !tweetData.tweetId) return null;
  return tweetData;
}

async function sendToSupabase(tweetData) {
  const body = {
    text: tweetData.text,
    tweet_url: tweetData.link,
    created_at: tweetData.createdAt || new Date().toISOString(),
    user_name: PROFILE_USERNAME,
  };

  const headers = { 'Content-Type': 'application/json' };
  if (IFTTT_WEBHOOK_SECRET) {
    headers['x-webhook-secret'] = IFTTT_WEBHOOK_SECRET;
  }

  const resp = await fetch(SUPABASE_WEBHOOK_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    console.error('Supabase webhook error:', resp.status, txt);
  } else {
    console.log('Tweet sent to Supabase:', tweetData.text.slice(0, 80));
  }
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await openProfile(page);

    console.log('Starting watch loop for', PROFILE_USERNAME);

    while (true) {
      try {
        await page.reload({ waitUntil: 'networkidle2' });
        const latest = await getLatestTweet(page);
        if (latest && latest.tweetId) {
          if (latest.tweetId !== lastTweetId) {
            console.log('New tweet detected:', latest.tweetId);
            lastTweetId = latest.tweetId;
            await sendToSupabase(latest);
          } else {
            console.log('No new tweet; latest is', latest.tweetId);
          }
        } else {
          console.log('No tweet data found');
        }
      } catch (err) {
        console.error('Loop error:', err.message || err);
      }

      // Wait 15 seconds before checking again (tune as needed)
      await new Promise(r => setTimeout(r, 15000));
    }
  } catch (e) {
    console.error('Fatal error:', e);
  } finally {
    await browser.close();
  }
}

main().catch(e => console.error(e));
