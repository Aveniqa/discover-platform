import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAmazonDirectUrl,
  buildAmazonSearchItemsPayload,
  buildFallbackSearchResult,
  parseAmazonPaApiResults,
  parseBestBuyResults,
  sanitizeCommerceResultForCache,
  scoreCommerceMatch,
  type CommerceQuery,
} from "../src/lib/commerce-resolution";
import {
  buildProductHuntPostsQuery,
  normalizeHackerNewsSignal,
  normalizeProductHuntSignal,
} from "../src/lib/discovery-feeds";

const query: CommerceQuery = {
  keywords: ["Sony Alpha a7S III mirrorless camera"],
  brandHint: "Sony",
  categoryHint: "camera",
  maxResults: 3,
};

test("commerce scoring requires exact-enough title overlap for direct matches", () => {
  assert.ok(scoreCommerceMatch(query, "Sony Alpha a7S III Mirrorless Camera Body", "Sony") >= 82);
  assert.ok(scoreCommerceMatch(query, "Portable emergency weather radio", "Midland") < 82);
});

test("Amazon PA-API parser emits direct ASIN links but marks product content as non-cacheable", () => {
  const results = parseAmazonPaApiResults(
    {
      SearchResult: {
        Items: [
          {
            ASIN: "B08HW132XW",
            ItemInfo: {
              Title: { DisplayValue: "Sony Alpha a7S III Mirrorless Camera Body" },
              ByLineInfo: { Brand: { DisplayValue: "Sony" } },
            },
            Offers: { Listings: [{ Price: { DisplayAmount: "$3,499.99" }, Availability: { Message: "In Stock" } }] },
            Images: { Primary: { Medium: { URL: "https://example.com/sony.jpg" } } },
          },
        ],
      },
    },
    query,
    "vaultvibe-20",
    new Date("2026-05-05T12:00:00.000Z"),
  );

  assert.equal(results.length, 1);
  assert.equal(results[0].asin, "B08HW132XW");
  assert.equal(results[0].destinationType, "direct-product");
  assert.equal(results[0].url, buildAmazonDirectUrl("B08HW132XW", "vaultvibe-20"));
  assert.equal(results[0].cacheable, false);
  assert.equal(sanitizeCommerceResultForCache(results[0]), null);
});

test("Best Buy parser keeps cacheable direct SKU data when confidence is high", () => {
  const results = parseBestBuyResults(
    {
      products: [
        {
          sku: 6423142,
          name: "Sony Alpha a7S III Mirrorless Camera",
          manufacturer: "Sony",
          salePrice: 3499.99,
          onlineAvailability: true,
          url: "https://www.bestbuy.com/site/sony-alpha-a7s-iii/6423142.p",
          image: "https://pisces.bbystatic.com/image2.jpg",
        },
      ],
    },
    query,
    new Date("2026-05-05T12:00:00.000Z"),
  );

  assert.equal(results.length, 1);
  assert.equal(results[0].provider, "bestbuy");
  assert.equal(results[0].sku, "6423142");
  assert.equal(sanitizeCommerceResultForCache(results[0])?.price, "$3499.99");
});

test("fallback commerce results stay labeled as search fallbacks", () => {
  const fallback = buildFallbackSearchResult(query, "vaultvibe-20", new Date("2026-05-05T12:00:00.000Z"));
  assert.equal(fallback.destinationType, "affiliate-search");
  assert.ok(fallback.url.includes("tag=vaultvibe-20"));
  assert.ok(fallback.confidence < 82);
});

test("Amazon request payload asks only for needed product enrichment resources", () => {
  const payload = buildAmazonSearchItemsPayload(query, {
    accessKeyId: "AKIAEXAMPLE",
    secretAccessKey: "secret",
    partnerTag: "vaultvibe-20",
  });

  assert.equal(payload.PartnerType, "Associates");
  assert.equal(payload.ItemCount, 3);
  assert.ok(payload.Resources.includes("Images.Primary.Medium"));
  assert.ok(payload.Resources.includes("Offers.Listings.Price"));
});

test("HN and Product Hunt signals are filtered and source-trailed", () => {
  const hn = normalizeHackerNewsSignal({
    id: 123,
    type: "story",
    time: 1777996800,
    title: "Show HN: Useful Launch Tool",
    url: "https://example.com/tool",
    score: 55,
    descendants: 12,
  }, { minScore: 30 });
  const lowHn = normalizeHackerNewsSignal({
    id: 124,
    type: "story",
    title: "Show HN: Quiet Tool",
    url: "https://example.com/quiet",
    score: 2,
  }, { minScore: 30 });
  const productHunt = normalizeProductHuntSignal({
    name: "LaunchPad",
    tagline: "Ship better launches",
    url: "https://www.producthunt.com/posts/launchpad",
    website: "https://launchpad.example.com",
    votesCount: 80,
    createdAt: "2026-05-05T00:00:00.000Z",
  }, { minScore: 25 });

  assert.equal(hn?.provider, "hacker-news");
  assert.equal(lowHn, null);
  assert.equal(productHunt?.provider, "product-hunt");
  assert.ok(productHunt?.rightsNote?.includes("commercial-use approval"));
  assert.ok(buildProductHuntPostsQuery(3).includes("posts(order: VOTES, first: 3)"));
});
