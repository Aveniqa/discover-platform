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
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createHmac, randomBytes } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const DATA_DIR = join(root, "data");
const queuePath = join(DATA_DIR, "social-queue.json");

// ─── Bluesky (AT Protocol) ────────────────────────────────────
async function publishToBluesky(post) {
  const handle = process.env.BLUESKY_HANDLE;
  const password = process.env.BLUESKY_APP_PASSWORD;
  if (!handle || !password) {
    console.log("   ⏭ Bluesky: skipped (no credentials)");
    return false;
  }

  try {
    // Create session
    const sessionRes = await fetch(
      "https://bsky.social/xrpc/com.atproto.server.createSession",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: handle, password }),
      }
    );
    if (!sessionRes.ok) throw new Error(`Session failed: ${sessionRes.status}`);
    const session = await sessionRes.json();

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
        const imgRes = await fetch(post.imageUrl);
        if (imgRes.ok) {
          const imgBuffer = await imgRes.arrayBuffer();
          if (imgBuffer.byteLength <= 1000000) {
            const contentType = imgRes.headers.get("content-type") || "image/jpeg";
            const blobRes = await fetch(
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
    const postRes = await fetch(
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
// ─── Pinterest API v5 ─────────────────────────────────────────
async function publishToPinterest(post) {
  const token = process.env.PINTEREST_ACCESS_TOKEN;
  const defaultBoard = process.env.PINTEREST_BOARD_ID;
  if (!token) {
    console.log("   ⏭ Pinterest: skipped (no credentials)");
    return false;
  }

  try {
    const pin = post.platforms.pinterest;
    const body = {
      board_id: defaultBoard,
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

    const res = await fetch("https://api.pinterest.com/v5/pins", {
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

// ─── X/Twitter (OAuth 1.0a HMAC-SHA1) ────────────────────────
function percentEncode(str) {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function generateOAuthSignature(method, url, params, consumerSecret, tokenSecret) {
  const sortedKeys = Object.keys(params).sort();
  const paramString = sortedKeys
    .map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join("&");
  const baseString = `${method}&${percentEncode(url)}&${percentEncode(paramString)}`;
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  return createHmac("sha1", signingKey).update(baseString).digest("base64");
}

async function publishToTwitter(post) {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    console.log("   ⏭ X/Twitter: skipped (no credentials)");
    return false;
  }

  try {
    const tweetText = post.platforms.twitter.text;

    // Upload image if available (v1.1 media upload)
    let mediaId = null;
    if (post.imageUrl) {
      try {
        const imgRes = await fetch(post.imageUrl);
        if (imgRes.ok) {
          const imgBuffer = await imgRes.arrayBuffer();
          const base64Image = Buffer.from(imgBuffer).toString("base64");

          const uploadUrl = "https://upload.twitter.com/1.1/media/upload.json";
          const uploadMethod = "POST";

          const mediaData = `media_data=${percentEncode(base64Image)}`;

          const uploadOauthParams = {
            oauth_consumer_key: apiKey,
            oauth_nonce: randomBytes(16).toString("hex"),
            oauth_signature_method: "HMAC-SHA1",
            oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
            oauth_token: accessToken,
            oauth_version: "1.0",
          };

          const uploadSig = generateOAuthSignature(
            uploadMethod,
            uploadUrl,
            uploadOauthParams,
            apiSecret,
            accessSecret
          );
          uploadOauthParams.oauth_signature = uploadSig;

          const uploadAuthHeader =
            "OAuth " +
            Object.keys(uploadOauthParams)
              .sort()
              .map((k) => `${percentEncode(k)}="${percentEncode(uploadOauthParams[k])}"`)
              .join(", ");

          const uploadRes = await fetch(uploadUrl, {
            method: uploadMethod,
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: uploadAuthHeader,
            },
            body: mediaData,
          });

          if (uploadRes.ok) {
            const uploadResult = await uploadRes.json();
            mediaId = uploadResult.media_id_string;
            console.log(`   📷 X/Twitter: image uploaded → ${mediaId}`);

            // Add alt text to the uploaded image
            const altText = post.imageAltText || `Image for ${post.title}`;
            await addAltTextToMedia(mediaId, altText, apiKey, apiSecret, accessToken, accessSecret);
          } else {
            console.log(`   ⚠️ X/Twitter: image upload failed (${uploadRes.status}), posting without image`);
          }
        }
      } catch (imgErr) {
        console.log(`   ⚠️ X/Twitter: image upload failed, posting without image`);
      }
    }

    const url = "https://api.x.com/2/tweets";
    const method = "POST";

    const oauthParams = {
      oauth_consumer_key: apiKey,
      oauth_nonce: randomBytes(16).toString("hex"),
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: accessToken,
      oauth_version: "1.0",
    };

    const signature = generateOAuthSignature(
      method,
      url,
      oauthParams,
      apiSecret,
      accessSecret
    );
    oauthParams.oauth_signature = signature;

    const authHeader =
      "OAuth " +
      Object.keys(oauthParams)
        .sort()
        .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
        .join(", ");

    const tweetBody = { text: tweetText };
    if (mediaId) {
      tweetBody.media = { media_ids: [mediaId] };
    }

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(tweetBody),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Tweet failed ${res.status}: ${errBody.slice(0, 200)}`);
    }

    const result = await res.json();
    console.log(
      `   ✅ X/Twitter: tweeted → https://x.com/i/status/${result.data.id}`
    );
    return true;
  } catch (err) {
    console.error(`   ❌ X/Twitter: ${err.message}`);
    return false;
  }
}

// Add alt text to uploaded media for accessibility
async function addAltTextToMedia(mediaId, altText, apiKey, apiSecret, accessToken, accessSecret) {
  try {
    const url = "https://upload.twitter.com/1.1/media/metadata/create.json";
    const method = "POST";

    const oauthParams = {
      oauth_consumer_key: apiKey,
      oauth_nonce: randomBytes(16).toString("hex"),
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: accessToken,
      oauth_version: "1.0",
    };

    const sig = generateOAuthSignature(method, url, oauthParams, apiSecret, accessSecret);
    oauthParams.oauth_signature = sig;

    const authHeader =
      "OAuth " +
      Object.keys(oauthParams)
        .sort()
        .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
        .join(", ");

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        media_id: mediaId,
        alt_text: { text: altText.slice(0, 1000) },
      }),
    });

    if (res.ok || res.status === 204) {
      console.log(`   ♿ X/Twitter: alt text added`);
    }
  } catch {
    // Alt text is optional — don't fail the whole post
  }
}

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  if (!existsSync(queuePath)) {
    console.log("No social queue found. Run generate-social-posts.mjs first.");
    process.exit(0);
  }

  const queue = JSON.parse(readFileSync(queuePath, "utf-8"));
  const pending = queue.posts.filter((p) => p.status === "pending");

  if (pending.length === 0) {
    console.log("No pending posts to publish.");
    process.exit(0);
  }

  console.log(`📤 Publishing ${pending.length} pending social posts...\n`);

  for (let i = 0; i < pending.length; i++) {
    const post = pending[i];
    console.log(`\n🔄 ${post.title} (${post.category})`);

    const results = {
      bluesky: await publishToBluesky(post),
      pinterest: await publishToPinterest(post),
      twitter: await publishToTwitter(post),
    };

    // Mark as published if at least one platform succeeded
    const anySuccess = Object.values(results).some((v) => v);
    post.status = anySuccess ? "published" : "failed";
    post.publishedAt = new Date().toISOString();
    post.publishResults = results;

    // Stagger posts to avoid looking automated (30-90s between posts)
    if (i < pending.length - 1) {
      const delay = 30000 + Math.floor(Math.random() * 60000);
      console.log(`   ⏱️ Waiting ${Math.round(delay / 1000)}s before next post...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  // Save updated queue
  writeFileSync(queuePath, JSON.stringify(queue, null, 2));
  console.log("\n✅ Publishing complete. Queue updated.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
