import { createHash, createHmac } from "node:crypto";

export type CommerceProvider = "amazon-paapi" | "bestbuy" | "fallback";
export type CommerceDestinationType = "direct-product" | "affiliate-search";

export interface CommerceQuery {
  keywords: string[];
  eventTopic?: string;
  categoryHint?: string;
  brandHint?: string;
  maxResults?: number;
}

export interface AmazonPaApiCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  partnerTag: string;
  marketplace?: string;
  region?: string;
  host?: string;
}

export interface BestBuyCredentials {
  apiKey: string;
}

export interface CommerceResolutionOptions {
  amazon?: AmazonPaApiCredentials;
  bestBuy?: BestBuyCredentials;
  fetcher?: typeof fetch;
  now?: Date;
}

export interface CommerceResolutionResult {
  provider: CommerceProvider;
  title: string;
  url: string;
  destinationType: CommerceDestinationType;
  confidence: number;
  reason: string;
  asin?: string;
  sku?: string;
  price?: string;
  availability?: string;
  imageUrl?: string;
  fetchedAt: string;
  cacheable: boolean;
  cacheTtlHours: number;
}

interface AmazonSearchItem {
  ASIN?: string;
  DetailPageURL?: string;
  Images?: {
    Primary?: {
      Medium?: { URL?: string };
      Large?: { URL?: string };
    };
  };
  ItemInfo?: {
    Title?: { DisplayValue?: string };
    ByLineInfo?: {
      Brand?: { DisplayValue?: string };
      Manufacturer?: { DisplayValue?: string };
    };
  };
  Offers?: {
    Listings?: Array<{
      Price?: { DisplayAmount?: string };
      Availability?: { Message?: string; Type?: string };
    }>;
  };
}

interface AmazonSearchResponse {
  SearchResult?: {
    Items?: AmazonSearchItem[];
  };
  Errors?: Array<{ Code?: string; Message?: string }>;
}

interface BestBuyProduct {
  sku?: number | string;
  name?: string;
  salePrice?: number;
  regularPrice?: number;
  onlineAvailability?: boolean;
  url?: string;
  image?: string;
  manufacturer?: string;
  shortDescription?: string;
}

interface BestBuySearchResponse {
  products?: BestBuyProduct[];
}

const DIRECT_MATCH_THRESHOLD = 82;
const FALLBACK_CONFIDENCE = 54;
const DEFAULT_AMAZON_HOST = "webservices.amazon.com";
const DEFAULT_AMAZON_REGION = "us-east-1";
const AMAZON_SERVICE = "ProductAdvertisingAPI";
const AMAZON_TARGET = "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems";
const AMAZON_PATH = "/paapi5/searchitems";
const AMAZON_MARKETPLACE = "www.amazon.com";
const BESTBUY_PRODUCT_FIELDS = [
  "sku",
  "name",
  "salePrice",
  "regularPrice",
  "onlineAvailability",
  "url",
  "image",
  "manufacturer",
  "shortDescription",
].join(",");

const STOP_WORDS = new Set([
  "and",
  "for",
  "from",
  "guide",
  "kit",
  "near",
  "official",
  "product",
  "products",
  "safe",
  "safety",
  "the",
  "with",
]);

function isoNow(now = new Date()): string {
  return now.toISOString();
}

export function normalizeCommerceKeywords(keywords: string[]): string[] {
  return Array.from(
    new Set(
      keywords
        .flatMap((keyword) => String(keyword || "").split(/[,\n]/))
        .map((keyword) => keyword.replace(/\s+/g, " ").trim())
        .filter((keyword) => keyword.length >= 3)
        .slice(0, 8),
    ),
  );
}

function queryText(query: CommerceQuery): string {
  return normalizeCommerceKeywords([
    query.brandHint ?? "",
    query.categoryHint ?? "",
    ...query.keywords,
  ]).join(" ");
}

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/[\s-]+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token)),
  );
}

function sharedTokenRatio(query: string, title: string): number {
  const queryTokens = tokenize(query);
  const titleTokens = tokenize(title);
  if (queryTokens.size === 0 || titleTokens.size === 0) return 0;
  let shared = 0;
  for (const token of queryTokens) {
    if (titleTokens.has(token)) shared += 1;
  }
  return shared / queryTokens.size;
}

export function scoreCommerceMatch(query: CommerceQuery, productTitle: string, brand?: string): number {
  const text = queryText(query);
  const ratio = sharedTokenRatio(text, `${brand ?? ""} ${productTitle}`);
  const brandBonus = query.brandHint && brand && brand.toLowerCase().includes(query.brandHint.toLowerCase()) ? 8 : 0;
  const categoryBonus =
    query.categoryHint && productTitle.toLowerCase().includes(query.categoryHint.toLowerCase()) ? 4 : 0;
  return Math.max(0, Math.min(100, Math.round(45 + ratio * 47 + brandBonus + categoryBonus)));
}

export function buildAmazonDirectUrl(asin: string, partnerTag: string): string {
  return `https://www.amazon.com/dp/${encodeURIComponent(asin)}?tag=${encodeURIComponent(partnerTag)}`;
}

export function buildAmazonSearchUrl(query: CommerceQuery, partnerTag: string): string {
  const url = new URL("https://www.amazon.com/s");
  url.searchParams.set("k", queryText(query));
  url.searchParams.set("tag", partnerTag);
  return url.toString();
}

export function buildAmazonSearchItemsPayload(query: CommerceQuery, credentials: AmazonPaApiCredentials) {
  return {
    PartnerTag: credentials.partnerTag,
    PartnerType: "Associates",
    Marketplace: credentials.marketplace ?? AMAZON_MARKETPLACE,
    Keywords: queryText(query),
    ItemCount: Math.max(1, Math.min(query.maxResults ?? 5, 10)),
    Resources: [
      "Images.Primary.Medium",
      "ItemInfo.ByLineInfo",
      "ItemInfo.Title",
      "Offers.Listings.Availability.Message",
      "Offers.Listings.Price",
    ],
  };
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function amazonDateParts(now: Date): { amzDate: string; dateStamp: string } {
  const compact = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return {
    amzDate: compact,
    dateStamp: compact.slice(0, 8),
  };
}

export function signAmazonPaApiRequest(
  body: string,
  credentials: AmazonPaApiCredentials,
  now = new Date(),
): Record<string, string> {
  const region = credentials.region ?? DEFAULT_AMAZON_REGION;
  const host = credentials.host ?? DEFAULT_AMAZON_HOST;
  const { amzDate, dateStamp } = amazonDateParts(now);
  const credentialScope = `${dateStamp}/${region}/${AMAZON_SERVICE}/aws4_request`;
  const canonicalHeaders = [
    "content-encoding:amz-1.0",
    "content-type:application/json; charset=utf-8",
    `host:${host}`,
    `x-amz-date:${amzDate}`,
    `x-amz-target:${AMAZON_TARGET}`,
    "",
  ].join("\n");
  const signedHeaders = "content-encoding;content-type;host;x-amz-date;x-amz-target";
  const canonicalRequest = [
    "POST",
    AMAZON_PATH,
    "",
    canonicalHeaders,
    signedHeaders,
    sha256(body),
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join("\n");
  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${credentials.secretAccessKey}`, dateStamp), region), AMAZON_SERVICE),
    "aws4_request",
  );
  const signature = createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

  return {
    Authorization: `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    "Content-Encoding": "amz-1.0",
    "Content-Type": "application/json; charset=utf-8",
    Host: host,
    "X-Amz-Date": amzDate,
    "X-Amz-Target": AMAZON_TARGET,
  };
}

export async function fetchAmazonPaApiResults(
  query: CommerceQuery,
  credentials: AmazonPaApiCredentials,
  options: Pick<CommerceResolutionOptions, "fetcher" | "now"> = {},
): Promise<CommerceResolutionResult[]> {
  const fetcher = options.fetcher ?? fetch;
  const body = JSON.stringify(buildAmazonSearchItemsPayload(query, credentials));
  const host = credentials.host ?? DEFAULT_AMAZON_HOST;
  const response = await fetcher(`https://${host}${AMAZON_PATH}`, {
    method: "POST",
    headers: signAmazonPaApiRequest(body, credentials, options.now),
    body,
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as AmazonSearchResponse;
  return parseAmazonPaApiResults(payload, query, credentials.partnerTag, options.now);
}

export function parseAmazonPaApiResults(
  payload: AmazonSearchResponse,
  query: CommerceQuery,
  partnerTag: string,
  now = new Date(),
): CommerceResolutionResult[] {
  const results: CommerceResolutionResult[] = [];
  for (const item of payload.SearchResult?.Items ?? []) {
    const title = item.ItemInfo?.Title?.DisplayValue ?? "";
    const brand =
      item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue ??
      item.ItemInfo?.ByLineInfo?.Manufacturer?.DisplayValue;
    const asin = item.ASIN;
    if (!title || !asin) continue;
    const confidence = scoreCommerceMatch(query, title, brand);
    if (confidence < DIRECT_MATCH_THRESHOLD) continue;
    const listing = item.Offers?.Listings?.[0];
    results.push({
      provider: "amazon-paapi",
      title,
      asin,
      url: item.DetailPageURL || buildAmazonDirectUrl(asin, partnerTag),
      destinationType: "direct-product",
      confidence,
      reason: "PA-API returned an exact enough product match; use only with Associates-compliant disclosure.",
      price: listing?.Price?.DisplayAmount,
      availability: listing?.Availability?.Message || listing?.Availability?.Type,
      imageUrl: item.Images?.Primary?.Medium?.URL ?? item.Images?.Primary?.Large?.URL,
      fetchedAt: isoNow(now),
      cacheable: false,
      cacheTtlHours: 0,
    });
  }
  return results.sort((a, b) => b.confidence - a.confidence);
}

export function buildBestBuyProductsUrl(query: CommerceQuery, apiKey: string): string {
  const search = queryText(query).replace(/[()]/g, " ").trim();
  const url = new URL(`https://api.bestbuy.com/v1/products((search=${encodeURIComponent(search)}))`);
  url.searchParams.set("format", "json");
  url.searchParams.set("show", BESTBUY_PRODUCT_FIELDS);
  url.searchParams.set("pageSize", String(Math.max(1, Math.min(query.maxResults ?? 5, 10))));
  url.searchParams.set("sort", "customerReviewAverage.dsc");
  url.searchParams.set("apiKey", apiKey);
  return url.toString();
}

export async function fetchBestBuyResults(
  query: CommerceQuery,
  credentials: BestBuyCredentials,
  options: Pick<CommerceResolutionOptions, "fetcher" | "now"> = {},
): Promise<CommerceResolutionResult[]> {
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(buildBestBuyProductsUrl(query, credentials.apiKey), {
    headers: { accept: "application/json" },
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as BestBuySearchResponse;
  return parseBestBuyResults(payload, query, options.now);
}

export function parseBestBuyResults(
  payload: BestBuySearchResponse,
  query: CommerceQuery,
  now = new Date(),
): CommerceResolutionResult[] {
  const results: CommerceResolutionResult[] = [];
  for (const product of payload.products ?? []) {
    const title = product.name ?? "";
    const sku = product.sku ? String(product.sku) : "";
    if (!title || !sku || !product.url) continue;
    const confidence = scoreCommerceMatch(query, title, product.manufacturer);
    if (confidence < DIRECT_MATCH_THRESHOLD) continue;
    results.push({
      provider: "bestbuy",
      title,
      sku,
      url: product.url,
      destinationType: "direct-product",
      confidence,
      reason: "Best Buy Products API returned an exact enough SKU match with direct product URL.",
      price: typeof product.salePrice === "number" ? `$${product.salePrice.toFixed(2)}` : undefined,
      availability: product.onlineAvailability === true ? "Available online" : "Check availability",
      imageUrl: product.image,
      fetchedAt: isoNow(now),
      cacheable: true,
      cacheTtlHours: 24,
    });
  }
  return results.sort((a, b) => b.confidence - a.confidence);
}

export function buildFallbackSearchResult(
  query: CommerceQuery,
  partnerTag: string,
  now = new Date(),
): CommerceResolutionResult {
  return {
    provider: "fallback",
    title: queryText(query),
    url: buildAmazonSearchUrl(query, partnerTag),
    destinationType: "affiliate-search",
    confidence: FALLBACK_CONFIDENCE,
    reason: "No high-confidence direct product match was available; this must stay labeled as a search/category fallback.",
    fetchedAt: isoNow(now),
    cacheable: true,
    cacheTtlHours: 24,
  };
}

export async function resolveCommerceProducts(
  query: CommerceQuery,
  options: CommerceResolutionOptions = {},
): Promise<CommerceResolutionResult[]> {
  const providers = await Promise.all([
    options.amazon ? fetchAmazonPaApiResults(query, options.amazon, options).catch(() => []) : Promise.resolve([]),
    options.bestBuy ? fetchBestBuyResults(query, options.bestBuy, options).catch(() => []) : Promise.resolve([]),
  ]);
  const direct = providers.flat().sort((a, b) => b.confidence - a.confidence);
  if (direct.length > 0) return direct.slice(0, query.maxResults ?? 5);

  if (options.amazon?.partnerTag) {
    return [buildFallbackSearchResult(query, options.amazon.partnerTag, options.now)];
  }

  return [];
}

export function sanitizeCommerceResultForCache(result: CommerceResolutionResult): CommerceResolutionResult | null {
  if (!result.cacheable) return null;
  return {
    provider: result.provider,
    title: result.title,
    url: result.url,
    destinationType: result.destinationType,
    confidence: result.confidence,
    reason: result.reason,
    asin: result.asin,
    sku: result.sku,
    price: result.provider === "bestbuy" ? result.price : undefined,
    availability: result.provider === "bestbuy" ? result.availability : undefined,
    imageUrl: result.provider === "bestbuy" ? result.imageUrl : undefined,
    fetchedAt: result.fetchedAt,
    cacheable: result.cacheable,
    cacheTtlHours: result.cacheTtlHours,
  };
}
