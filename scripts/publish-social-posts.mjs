#!/usr/bin/env node
/**
 * Publish pending social posts from data/social-queue.json
 * to free-tier social media APIs:
 *
 * 1. Pinterest API v5 (free, OAuth 2.0 — 1,000 writes/day)
 * 2. Bluesky / AT Protocol (free, no limits for normal use)
 * 3. X/Twitter API free tier (500 posts/month)
 *
 * Each platform publishes independently — if one fails, others continue.
 *
 * Required GitHub Secrets:
 *   BLUESKY_HANDLE        — e.g. "surfaced.bsky.social"
 *   BLUESKY_APP_PASSWORD  — app password from bsky.app/settings
 *   PINTEREST_ACCESS_TOKEN — OAuth 2.0 token (refresh via cron monthly)
 *   PINTEREST_BOARD_ID    — default board ID for pins
 *   X_API_KEY             — X API consumer key
 *   X_API_SECRET          — X API consumer secret
 *   X_ACCESS_TOKEN        — X OAuth 1.0a user access token
 *   X_ACCESS_SECRET       — X OAuth 1.0a user access secret
 */
import { readFileSync, existsSync } from "fs";
import { writeJsonSafe } from "./lib/write-safe.mjs";
import { createLogger } from "./lib/logger.mjs";
import { pooledFetch } from "./lib/fetch-pool.mjs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const log = createLogger({ script: 'publish-social-posts' });

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const DATA_DIR = join(root, "data");
const queuePath = join(DATA_DIR, "social-queue.json");

// ─── Bluesky (AT Protocol) ────────────────────────────────────
let _blueskySession = null;

async function getBlueskySession() {
  if (_blueskySession) return _blueskySession;
  const handle = process.env.BLUESKY_HANDLE;
  const password = process.env.BLUESKY_APP_PASSWORD;
  if (!handle || !password) return null;

  const sessionRes = await pooledFetch(
    "https://bsky.social/xrpc/com.atproto.server.createSession",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: handle, password }),
    }
  );
  if (!sessionRes.ok) throw new Error(`Session failed: ${sessionRes.status}`);
  _blueskySession = await sessionRes.json();
  console.log("   🔑 Bluesky: session created (reusing for all posts)");
  return _blueskySession;
}

async function publishToBluesky(post) {
  const handle = process.env.BLUESKY_HANDLE;
  const password = process.env.BLUESKY_APP_PASSWORD;
  if (!handle || !password) {
    console.log("   ⏭ Bluesky: skipped (no credentials)");
    return false;
  }

  try {
    const session = await getBlueskySession();

    // Strip any URLs from text (links go in the card embed)
    let text = post.platforms.bluesky.text.replace(/https?:\/\/[^\s]+/g, '').trim();
    // Bluesky hard limit is 300 graphemes — trim if needed
    if ([...text].length > 300) {
      text = [...text].slice(0, 297).join('') + '...';
      console.log(`   ⚠️ Bluesky: text trimmed to 300 graphemes`);
    }
    const now = new Date().toISOString().replace("+00:00", "Z");

    // Parse hashtag and link facets from text
    const facets = [];
    // Hashtag facets
    const hashtagRegex = /#(\w+)/g;
    let match;
    while ((match = hashtagRegex.exec(text)) !== null) {
      const byteStart = Buffer.byteLength(text.slice(0, match.index), "utf-8");
      const byteEnd = byteStart + Buffer.byteLength(match[0], "utf-8");
      facets.push({
        index: { byteStart, byteEnd },
        features: [{ $type: "app.bsky.richtext.facet#tag", tag: match[1] }],
      });
    }
    // URL facets (in case any slip through)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    while ((match = urlRegex.exec(text)) !== null) {
      const byteStart = Buffer.byteLength(text.slice(0, match.index), "utf-8");
      const byteEnd = byteStart + Buffer.byteLength(match[0], "utf-8");
      facets.push({
        index: { byteStart, byteEnd },
        features: [{ $type: "app.bsky.richtext.facet#link", uri: match[0] }],
      });
    }

    // Build post record
    const record = {
      $type: "app.bsky.feed.post",
      text,
      createdAt: now,
    };
    if (facets.length > 0) record.facets = facets;

    // Upload image as thumbnail for the link card
    let thumbBlob = null;
    if (post.imageUrl) {
      try {
        const imgRes = await pooledFetch(post.imageUrl, { timeout: 10000 });
        if (imgRes.ok) {
          const imgBuffer = await imgRes.arrayBuffer();
          if (imgBuffer.byteLength <= 1000000) {
            const contentType = imgRes.headers.get("content-type") || "image/jpeg";
            const blobRes = await pooledFetch(
              "https://bsky.social/xrpc/com.atproto.repo.uploadBlob",
              {
                method: "POST",
                headers: {
                  "Content-Type": contentType,
                  Authorization: `Bearer ${session.accessJwt}`,
                },
                body: Buffer.from(imgBuffer),
              }
            );
            if (blobRes.ok) {
              const blobData = await blobRes.json();
              thumbBlob = blobData.blob;
              console.log(`   📷 Bluesky: image uploaded`);
            }
          } else {
            console.log(`   ⚠️ Bluesky: image too large (${(imgBuffer.byteLength / 1024).toFixed(0)}KB), skipping`);
          }
        }
      } catch (imgErr) {
        console.log(`   ⚠️ Bluesky: image upload failed, continuing without thumbnail`);
      }
    }

    // Attach link card embed with full URL (not in text body)
    const linkUrl = post.affiliateUrl || post.productUrl;
    if (linkUrl) {
      const card = {
        uri: linkUrl,
        title: post.title,
        description: text.replace(/#\w+/g, '').trim().slice(0, 200),
      };
      if (thumbBlob) card.thumb = thumbBlob;
      record.embed = { $type: "app.bsky.embed.external", external: card };
      console.log(`   🔗 Bluesky: link card attached → ${linkUrl}`);
    }

    // Create post
    const postRes = await pooledFetch(
      "https://bsky.social/xrpc/com.atproto.repo.createRecord",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessJwt}`,
        },
        body: JSON.stringify({
          repo: session.did,
          collection: "app.bsky.feed.post",
          record,
        }),
      }
    );

    if (!postRes.ok) {
      const errBody = await postRes.text();
      throw new Error(`Post failed ${postRes.status}: ${errBody.slice(0, 200)}`);
    }

    const result = await postRes.json();
    console.log(`   ✅ Bluesky: posted → ${result.uri}`);
    return true;
  } catch (err) {
    console.error(`   ❌ Bluesky: ${err.message}`);
    return false;
  }
}
// ─── Pinterest Board ID mapping ───────────────────────────────
// Resolved at publish-time by fetching boards from the API
let _pinterestBoards = null;
async function getPinterestBoardId(token, boardName) {
  const defaultBoard = process.env.PINTEREST_BOARD_ID;
  if (!boardName) return defaultBoard;

  // Cache the board list for the entire run
  if (!_pinterestBoards) {
    try {
      const res = await pooledFetch("https://api.pinterest.com/v5/boards", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        _pinterestBoards = data.items || [];
      } else {
        _pinterestBoards = [];
      }
    } catch {
      _pinterestBoards = [];
    }
  }

  const match = _pinterestBoards.find(
    (b) => b.name.toLowerCase() === boardName.toLowerCase()
  );
  return match ? match.id : defaultBoard;
}

// ─── Pinterest API v5 ─────────────────────────────────────────
async function publishToPinterest(post) {
  const token = process.env.PINTEREST_ACCESS_TOKEN;
  if (!token) {
    console.log("   ⏭ Pinterest: skipped (no credentials)");
    return false;
  }

  try {
    const pin = post.platforms.pinterest;
    const boardId = await getPinterestBoardId(token, pin.boardName);
    const body = {
      board_id: boardId,
      title: pin.title,
      description: pin.description,
      link: post.affiliateUrl || post.productUrl,
      alt_text: post.imageAltText || `Image for ${post.title}`,
    };

    // Attach image if available
    if (post.imageUrl) {
      body.media_source = {
        source_type: "image_url",
        url: post.imageUrl,
      };
    }

    const res = await pooledFetch("https://api.pinterest.com/v5/pins", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Pin creation failed ${res.status}: ${errBody.slice(0, 200)}`);
    }

    const result = await res.json();
    console.log(`   ✅ Pinterest: pinned → ${result.id}`);
    return true;
  } catch (err) {
    console.error(`   ❌ Pinterest: ${err.message}`);
    return false;
  }
}

// ─── X/Twitter ───────────────────────────────────────────────
// Posting is temporarily disabled. Free-tier credits are depleted
// (402 CreditsDepleted) and image upload requires Basic tier
// ($200/mo, returns 401). Re-enable by restoring OAuth 1.0a signing
// (createHmac-based HMAC-SHA1) + media upload once the account is
// upgraded; prior implementation lives in git history.
async function publishToTwitter(post) {
  console.log("   ⏭ X/Twitter: SKIPPED — posting disabled (credits depleted + Basic tier required for media). Re-enable when account is upgraded.");
  return false;
}

// ─── Main ─────────────────────────────────────────────────────
const postedPath = join(DATA_DIR, "social-posted.json");

async function main() {
  log.time('publish-run');

  if (!existsSync(queuePath)) {
    log.info('No social queue found — run generate-social-posts.mjs first');
    process.exit(0);
  }

  const queue = JSON.parse(readFileSync(queuePath, "utf-8"));
  const pending = queue.posts.filter((p) => p.status === "pending");

  if (pending.length === 0) {
    log.info('No pending posts to publish');
    process.exit(0);
  }

  // Load posted history — items are marked as posted here (on publish success),
  // not at generation time, to avoid permanently consuming items on publish failure.
  const posted = existsSync(postedPath)
    ? JSON.parse(readFileSync(postedPath, "utf-8"))
    : {};

  log.info(`Publishing ${pending.length} pending social posts`, { count: pending.length });

  const stats = { total: pending.length, published: 0, failed: 0, platforms: { bluesky: 0, pinterest: 0, twitter: 0 } };

  for (let i = 0; i < pending.length; i++) {
    const post = pending[i];
    log.info(`Processing: ${post.title}`, { category: post.category, index: i + 1 });
    log.time(`post-${i}`);

    // Publish to all platforms in parallel — each is independent
    const [bluesky, pinterest, twitter] = await Promise.all([
      publishToBluesky(post),
      publishToPinterest(post),
      publishToTwitter(post),
    ]);
    const results = { bluesky, pinterest, twitter };

    // Track stats
    if (results.bluesky) stats.platforms.bluesky++;
    if (results.pinterest) stats.platforms.pinterest++;
    if (results.twitter) stats.platforms.twitter++;

    // Mark as published if at least one platform succeeded
    const anySuccess = Object.values(results).some((v) => v);
    post.status = anySuccess ? "published" : "failed";
    post.publishedAt = new Date().toISOString();
    post.publishResults = results;
    anySuccess ? stats.published++ : stats.failed++;

    // Only mark as posted when at least one platform succeeded
    if (anySuccess && post.category) {
      if (!posted[post.category]) posted[post.category] = [];
      if (!posted[post.category].includes(post.id)) {
        posted[post.category].push(post.id);
      }
    }

    // Write queue after EACH post so a mid-run kill won't re-publish
    writeJsonSafe(queuePath, queue);
    writeJsonSafe(postedPath, posted);

    log.timeEnd(`post-${i}`, { title: post.title, status: post.status, results });

    // Stagger posts to avoid looking automated (30-90s between posts)
    if (i < pending.length - 1) {
      const delay = 30000 + Math.floor(Math.random() * 60000);
      log.info(`Staggering ${Math.round(delay / 1000)}s before next post`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  log.timeEnd('publish-run', { type: 'summary' });
  log.summary(stats);
}

main().catch((err) => {
  log.error('Fatal error', { error: err.message, stack: err.stack });
  process.exit(1);
});
