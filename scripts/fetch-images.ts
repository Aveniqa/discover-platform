import discoveries from "../data/discoveries.json";
import products from "../data/products.json";
import gems from "../data/hidden-gems.json";
import future from "../data/future-radar.json";
import tools from "../data/daily-tools.json";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const PEXELS_KEY = process.env.PEXELS_API_KEY!;
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY!;

if (!PEXELS_KEY || !UNSPLASH_KEY) {
  console.error("Missing API keys. Set PEXELS_API_KEY and UNSPLASH_ACCESS_KEY in .env.local");
  process.exit(1);
}

// ─── Fetch helpers ──────────────────────────────────────────────

async function fetchWithTimeout(url: string, opts: RequestInit, ms = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchPexelsImage(query: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: PEXELS_KEY } }
    );
    const data = await res.json();
    return data.photos?.[0]?.src?.large || null;
  } catch {
    return null;
  }
}

async function fetchUnsplashImage(query: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }
    );
    const data = await res.json();
    return data.urls?.regular || null;
  } catch {
    return null;
  }
}

async function fetchItemImage(query: string): Promise<string> {
  const pexels = await fetchPexelsImage(query);
  if (pexels) return pexels;
  const unsplash = await fetchUnsplashImage(query);
  if (unsplash) return unsplash;
  return "";
}

// ─── Discovery queries ─────────────────────────────────────────
// Hand-crafted 2-4 word queries targeting real, photographable subjects.

const discoveryQueries: Record<string, string> = {
  "octopuses-have-three-hearts-and-blue-blood": "octopus underwater ocean",
  "bananas-are-naturally-radioactive": "banana fruit closeup yellow",
  "your-body-produces-light-you-cant-see": "human body silhouette glow",
  "glass-is-neither-a-solid-nor-a-liquid": "stained glass cathedral light",
  "water-can-boil-and-freeze-at-the-same-time": "water ice bubbles laboratory",
  "there-are-more-possible-chess-games-than-atoms-in-the-universe": "chess pieces board dramatic",
  "the-worlds-first-computer-programmer-was-a-woman-in-1843": "vintage computing history",
  "velcro-was-invented-after-a-walk-in-the-woods": "burr seeds nature closeup",
  "japan-has-a-bullet-train-that-was-designed-after-a-kingfisher": "bullet train japan speed",
  "the-great-wall-of-china-is-held-together-with-sticky-rice": "great wall china landscape",
  "the-patent-for-the-fire-hydrant-was-lost-in-a-fire": "fire hydrant red street",
  "nasa-uses-the-same-bolts-as-the-golden-gate-bridge": "golden gate bridge engineering",
  "in-iceland-there-is-no-word-for-please": "iceland landscape volcanic",
  "finland-has-more-saunas-than-cars": "finnish sauna wooden steam",
  "south-korea-has-a-law-that-keeps-your-age-from-changing-on-your-birthday": "seoul south korea cityscape",
  "in-japan-there-is-a-festival-dedicated-to-crying-babies": "japan festival traditional culture",
  "there-is-a-village-in-india-where-people-communicate-by-whistling": "india mountain village misty",
  "the-night-witches-were-all-female-bomber-pilots-who-terrorized-nazis": "vintage military airplane pilot",
  "there-are-more-people-alive-today-than-have-ever-died": "crowd people aerial view",
  "russia-has-11-time-zones-but-used-to-have-only-nine": "russia landscape vast terrain",
  "there-is-a-country-with-no-capital-city": "tropical island pacific ocean",
  "lesotho-is-the-only-country-entirely-above-1000-meters": "mountain landscape africa highlands",
  "more-people-speak-french-in-africa-than-in-france": "african marketplace colorful street",
  "the-shortest-war-in-history-lasted-38-minutes": "historic battlefield cannon",
  "more-people-die-from-selfies-than-shark-attacks": "selfie smartphone cliff edge",
  "you-are-more-likely-to-be-killed-by-a-vending-machine-than-a-shark": "vending machine japan street",
  "a-day-on-venus-is-longer-than-a-year-on-venus": "venus planet space orange",
  "humans-share-60-percent-of-their-dna-with-bananas": "dna helix science laboratory",
  "the-total-weight-of-ants-on-earth-rivals-the-total-weight-of-humans": "ants colony macro nature",
  "lightning-strikes-the-earth-about-100-times-per-second": "lightning storm dramatic sky",
  "trees-can-communicate-and-share-nutrients-underground": "forest trees roots sunlight",
  "there-is-a-jellyfish-that-is-biologically-immortal": "jellyfish ocean glowing underwater",
  "crows-can-recognize-human-faces-and-hold-grudges": "crow bird black intelligent",
  "the-amazon-rainforest-produces-20-percent-of-the-worlds-oxygen": "amazon rainforest aerial green",
  "a-single-teaspoon-of-soil-contains-more-organisms-than-people-on-earth": "soil earth nature closeup",
  "the-worlds-oldest-known-living-organism-is-a-seagrass-meadow": "seagrass meadow underwater ocean",
  "there-is-a-planet-where-it-rains-glass-sideways": "exoplanet space nebula storm",
  "there-is-a-giant-cloud-of-alcohol-in-space": "colorful nebula galaxy deep space",
  "neutron-stars-are-so-dense-a-teaspoon-would-weigh-6-billion-tons": "stars astronomy night sky",
  "the-voyager-1-spacecraft-is-still-sending-data-from-interstellar-space": "space probe satellite deep",
  "there-are-more-stars-in-the-universe-than-grains-of-sand-on-earth": "milky way stars night sky",
  "olympus-mons-on-mars-is-so-large-you-cant-see-it-from-its-base": "mars planet red surface",
  "cleopatra-lived-closer-in-time-to-the-moon-landing-than-to-the-pyramids": "egyptian pyramids ancient desert",
  "oxford-university-is-older-than-the-aztec-empire": "oxford university architecture stone",
  "the-last-execution-by-guillotine-was-the-same-year-star-wars-came-out": "guillotine french history",
  "the-roman-empire-and-ancient-china-almost-never-made-direct-contact": "roman ruins ancient columns",
  "samurai-and-cowboys-existed-at-the-same-time": "samurai warrior japanese armor",
  "woolly-mammoths-were-still-alive-when-the-pyramids-were-being-built": "mammoth prehistoric ice age",
  "your-brain-uses-the-same-circuits-for-physical-and-social-pain": "brain neuroscience scan colorful",
  "the-dunning-kruger-effect-means-incompetent-people-cant-recognize-their-incompetence": "mirror reflection psychology",
  "your-brain-makes-decisions-up-to-10-seconds-before-you-are-aware-of-them": "brain neural network waves",
  "being-watched-makes-you-perform-better-at-simple-tasks-and-worse-at-hard-ones": "eye watching closeup iris",
  "you-are-more-creative-when-you-are-tired": "creative artist messy studio",
  "the-ikea-effect-makes-you-overvalue-things-you-build-yourself": "furniture assembly diy tools",
  "there-are-more-possible-internet-addresses-in-ipv6-than-atoms-on-earth": "server datacenter networking",
  "the-first-computer-bug-was-an-actual-bug": "vintage computer circuit board",
  "the-entire-wikipedia-database-is-only-about-22-gigabytes": "encyclopedia library books",
  "more-than-90-percent-of-the-worlds-data-was-created-in-the-last-two-years": "data center servers glowing",
  "the-first-webcam-was-invented-to-watch-a-coffee-pot": "coffee pot vintage office",
  "there-are-underwater-cables-carrying-97-percent-of-intercontinental-data": "underwater cable ocean deep sea",
};

// ─── Product queries ────────────────────────────────────────────
// Map slug → concise photographable query (core object + context).

const productQueries: Record<string, string> = {
  // Wearables
  "oura-ring-4-smart-health-ring": "smart ring health wearable",
  "apple-watch-ultra-3": "smartwatch rugged outdoor wrist",
  "whoop-4-0-fitness-band": "fitness tracker band wrist",
  "garmin-venu-3s-smartwatch": "smartwatch fitness display wrist",
  "fitbit-charge-6-fitness-tracker": "fitness tracker wristband",
  // Audio
  "sony-wh-1000xm6-headphones": "wireless headphones premium black",
  "apple-airpods-pro-3": "wireless earbuds white case",
  "sonos-era-300-spatial-speaker": "modern speaker living room",
  "jbl-clip-5-portable-speaker": "portable speaker colorful outdoor",
  "nothing-ear-open-earbuds": "transparent earbuds technology",
  // Home Office
  "branch-ergonomic-chair": "ergonomic office chair desk",
  "samsung-viewfinity-s9-5k-monitor": "ultrawide monitor screen desk",
  "logitech-mx-keys-s-keyboard": "wireless keyboard modern desk",
  "flexispot-e7-standing-desk": "standing desk office workspace",
  "anker-651-usb-c-dock-charging-pad": "laptop dock charging station",
  // Kitchen & Home
  "breville-barista-express-impress": "espresso machine coffee barista",
  "cosori-air-fryer-pro-le-5qt": "air fryer kitchen cooking",
  "ember-mug-2-temperature-control": "smart mug coffee temperature",
  "switchbot-curtain-3-smart-motor": "smart curtain window automation",
  "our-place-always-pan-2": "ceramic pan cooking kitchen",
  // Outdoor & Travel
  "away-carry-on-aluminum-edition": "luggage suitcase aluminum travel",
  "biolite-campstove-2-plus": "camping stove outdoor fire",
  "helinox-chair-one-ultralight": "camping chair ultralight outdoor",
  "nalgene-32oz-sustain-water-bottle": "water bottle hiking outdoor",
  "osprey-farpoint-40-travel-backpack": "travel backpack adventure",
  // Gaming
  "playstation-5-pro-console": "gaming console controller neon",
  "steam-deck-oled-handheld": "handheld gaming device screen",
  "8bitdo-ultimate-bluetooth-controller": "game controller bluetooth retro",
  "secretlab-titan-evo-gaming-chair": "gaming chair ergonomic setup",
  "razer-blackwidow-v4-75-percent-keyboard": "mechanical keyboard rgb gaming",
  // Photography
  "sony-alpha-a7c-ii-mirrorless-camera": "mirrorless camera photography",
  "dji-air-3-drone": "camera drone aerial flying",
  "peak-design-everyday-sling-6l": "camera sling bag photographer",
  "insta360-x4-360-camera": "360 camera action adventure",
  "joby-gorillapod-5k-flexible-tripod": "flexible tripod camera setup",
  // Personal Care
  "dyson-airwrap-multi-styler": "hair styler beauty salon",
  "therabody-theragun-mini-2": "massage gun recovery fitness",
  "foreo-luna-4-facial-cleansing": "facial cleansing beauty skincare",
  "philips-norelco-oneblade-360": "electric trimmer grooming men",
  "vitruvi-stone-essential-oil-diffuser": "essential oil diffuser aromatherapy",
  // Bags & Accessories
  "bellroy-classic-backpack-plus": "minimalist backpack everyday carry",
  "ridge-wallet-titanium": "slim wallet metal minimalist",
  "aer-city-sling-2": "sling bag urban crossbody",
  "grid-it-cocoon-organizer": "cable organizer travel accessories",
  "calpak-luka-duffel-bag": "duffel bag travel weekend",
  // Smart Home
  "google-nest-doorbell-battery": "smart doorbell camera home",
  "philips-hue-gradient-lightstrip": "led light strip ambient room",
  "ecobee-smart-thermostat-premium": "smart thermostat home wall",
  "aqara-presence-sensor-fp2": "motion sensor smart home device",
  "eve-energy-smart-plug-matter": "smart plug energy monitor",
  // Productivity
  "apple-ipad-air-m3": "tablet stylus digital drawing",
  "kindle-paperwhite-signature-edition": "e-reader kindle reading books",
  "remarkable-2-paper-tablet": "e-ink tablet writing stylus",
  "timeular-tracker-physical-time-tracker": "time tracking device desk",
  "rocketbook-pro-smart-notebook": "smart notebook writing reusable",
  // Fitness
  "peloton-guide-strength-training-camera": "strength training home gym",
  "hyperice-hypervolt-2-pro-massager": "percussion massager recovery sport",
  "trx-all-in-one-suspension-trainer": "suspension trainer workout straps",
  "chirp-wheel-plus-back-roller": "back roller stretching exercise",
  "bala-bangles-weighted-bracelets": "weighted bracelet workout wrist",
  // Fashion Tech
  "vollebak-solar-charged-jacket": "high tech jacket glowing outdoor",
  "nadi-x-smart-yoga-pants": "yoga pants fitness smart clothing",
  "uv-skinz-hooded-sunshirt-upf-50": "sun protection shirt outdoor",
  "hexoskin-smart-shirt-biometric": "smart shirt biometric fitness",
  "rayneo-air-2s-ar-glasses": "augmented reality glasses wearable",
  // Sustainability
  "bluetti-ac180-portable-power-station": "portable power station camping",
  "stasher-reusable-silicone-bag-bundle": "reusable silicone bags kitchen eco",
  "goalzero-nomad-20-solar-panel": "portable solar panel outdoor",
  "lastobject-lastswab-reusable-swab": "reusable cotton swab sustainable",
  "pela-compostable-phone-case": "eco phone case biodegradable",
  // Gifts
  "uncommon-goods-whiskey-peaks-glasses": "whiskey glasses mountain design",
  "yeti-rambler-20oz-tumbler": "insulated tumbler stainless steel",
  "lego-botanical-collection-orchid": "lego orchid botanical building",
  "tile-mate-bluetooth-tracker-4-pack": "bluetooth tracker keychain finder",
  "meater-2-plus-wireless-meat-thermometer": "wireless meat thermometer grilling",
};

// ─── Hidden Gem & Tool category → visual scene ─────────────────

const categorySceneQueries: Record<string, string> = {
  // Hidden Gem categories
  "AI Tools": "artificial intelligence screen technology",
  "Communication": "video call team meeting laptop",
  "Data & Analytics": "data analytics dashboard charts",
  "Design": "creative design studio workspace",
  "Developer Tools": "programming code screen developer",
  "File Management": "digital files organized cloud storage",
  "Finance": "financial planning calculator charts",
  "Health & Wellness": "wellness meditation healthy lifestyle",
  "Learning": "online learning education laptop books",
  "Media & Entertainment": "video editing production studio",
  "Privacy & Security": "cybersecurity digital lock shield",
  "Productivity": "productive workspace laptop minimal desk",
  "Social & Community": "online community discussion forum",
  "Utilities": "digital tools utility software screen",
  "Writing": "writing notebook pen creative desk",
  // Daily Tool categories (some overlap, some unique)
  "Development": "software development code programming",
  "Health": "fitness exercise healthy active",
  "Media": "media content creation microphone",
  "Privacy": "privacy security vpn digital lock",
  "Social Media": "social media smartphone marketing",
};

// ─── Future Radar industry → visual context ─────────────────────

const industryQueries: Record<string, string> = {
  "Energy": "energy power renewable solar",
  "Healthcare": "medical laboratory science research",
  "Transportation": "futuristic vehicle electric road",
  "AI & Computing": "quantum computer circuit board",
  "Space": "space rocket launch stars",
  "Materials": "materials science laboratory research",
  "Agriculture": "modern agriculture farm technology",
  "Communication": "satellite communication network antenna",
  "Manufacturing": "factory robotics automation modern",
  "Climate": "climate earth environment nature",
};

// Maps specific future-tech terms to photographable subjects
const techVisualHints: Record<string, string> = {
  "Solid-State Batteries": "battery energy storage",
  "Compact Fusion Reactors": "nuclear reactor facility",
  "Perovskite Solar Cells": "solar panels array sunlight",
  "Green Hydrogen Electrolyzers": "hydrogen fuel cell green",
  "AI-Managed Smart Grids": "electrical power grid tower",
  "mRNA Therapeutics Platform": "mRNA vaccine laboratory vial",
  "In-Vivo Gene Editing": "gene editing crispr laboratory",
  "Liquid Biopsy Diagnostics": "blood test diagnostics laboratory",
  "Neural-Controlled Prosthetics": "prosthetic limb robotic arm",
  "Senolytics and Longevity Drugs": "pharmaceutical pills medicine",
  "Vehicle-to-Grid EV Fleets": "electric vehicle charging station",
  "Level 5 Autonomous Vehicles": "self driving car autonomous",
  "Vacuum-Tube Hyperloop": "hyperloop tube transport futuristic",
  "eVTOL Air Taxis": "electric aircraft flying taxi",
  "Autonomous Electric Cargo Ships": "cargo ship ocean autonomous",
  "Fault-Tolerant Quantum Computers": "quantum computing processor chip",
  "Neuromorphic Computing Chips": "microchip circuit board processor",
  "Artificial General Intelligence": "artificial intelligence robot brain",
  "Ambient Edge AI": "edge computing device sensor",
  "Humanoid General-Purpose Robots": "humanoid robot technology",
  "Lunar Permanent Habitats": "moon base lunar habitat",
  "Nuclear Thermal Propulsion": "rocket engine thruster space",
  "Asteroid Mining Platforms": "asteroid space mining",
  "Mega-Constellation Global Internet": "satellite constellation orbit earth",
  "Space-Based Gravitational Wave Observatory": "space telescope observatory stars",
  "Mass-Produced Graphene": "graphene material carbon lattice",
  "Programmable Metamaterials": "advanced materials nanotechnology",
  "Self-Healing Polymers": "polymer material flexible plastic",
  "DNA Data Storage": "dna strand data storage helix",
  "Room-Temperature Superconductors": "superconductor material magnet levitation",
  "AI-Optimized Vertical Farms": "vertical farm indoor agriculture",
  "Precision Fermentation Proteins": "fermentation tank bioreactor lab",
  "CRISPR Crop Engineering": "crop field genetic engineering",
  "Autonomous Agricultural Drones": "agricultural drone flying field",
  "Biochar Soil Restoration": "biochar soil restoration earth",
  "6G Terahertz Networks": "network tower antenna 5g 6g",
  "Direct-to-Device Satellite Internet": "satellite dish internet communication",
  "Volumetric Holographic Displays": "holographic display technology 3d",
  "High-Bandwidth Brain-Computer Interfaces": "brain computer interface neuroscience",
  "Self-Organizing Mesh Networks": "mesh network nodes connected",
  "Multi-Material 3D Printing": "3d printer manufacturing layer",
  "Lights-Out Autonomous Factories": "automated factory robotic assembly",
  "Industrial Digital Twins": "digital twin simulation factory",
  "Distributed Microfactories": "small factory workshop manufacturing",
  "Molecular Recycling": "recycling waste processing facility",
  "Direct Air Carbon Capture": "carbon capture industrial facility",
  "Marine Cloud Brightening": "clouds ocean atmospheric ship",
  "Autonomous Ocean Cleanup Systems": "ocean cleanup vessel marine",
  "Solar-Powered Desalination": "desalination plant solar water",
  "Drone Swarm Reforestation": "drone swarm forest reforestation",
};

// ─── Query builder ──────────────────────────────────────────────

function buildSearchQuery(item: Record<string, unknown>): string {
  const type = item.type as string;

  switch (type) {
    case "discovery": {
      const slug = item.slug as string;
      return discoveryQueries[slug] || "science discovery nature";
    }

    case "product": {
      const slug = item.slug as string;
      return productQueries[slug] || (item.category as string) || "product technology";
    }

    case "hidden-gem": {
      const category = item.category as string;
      return categorySceneQueries[category] || "technology workspace digital";
    }

    case "tool": {
      const category = item.category as string;
      return categorySceneQueries[category] || "technology workspace digital";
    }

    case "future-tech": {
      const techName = item.techName as string;
      // Prefer the specific tech visual hint, fall back to industry query
      return techVisualHints[techName] || industryQueries[item.industry as string] || "technology innovation future";
    }

    default:
      return "technology innovation";
  }
}

// ─── Main ───────────────────────────────────────────────────────

async function buildImageCache() {
  const outputPath = path.join(process.cwd(), "data", "image-cache.json");

  // Resume from existing cache if available
  let cache: Record<string, string> = {};
  try {
    const existing = fs.readFileSync(outputPath, "utf-8");
    cache = JSON.parse(existing);
    console.log(`Resuming — ${Object.keys(cache).length} items already cached\n`);
  } catch {
    // No existing cache, start fresh
  }

  const allItems = [
    ...discoveries.map((i: any) => ({ ...i, type: "discovery" })),
    ...products.map((i: any) => ({ ...i, type: "product" })),
    ...gems.map((i: any) => ({ ...i, type: "hidden-gem" })),
    ...future.map((i: any) => ({ ...i, type: "future-tech" })),
    ...tools.map((i: any) => ({ ...i, type: "tool" })),
  ] as Record<string, unknown>[];

  console.log(`Fetching images for ${allItems.length} items...\n`);

  let success = 0;
  let skipped = 0;
  let noResult = 0;

  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    const slug = item.slug as string;
    const query = buildSearchQuery(item);

    // Skip if already cached with a valid URL
    if (cache[slug]) {
      skipped++;
      continue;
    }

    const label = slug.slice(0, 45).padEnd(45);
    process.stdout.write(`[${i + 1}/${allItems.length}] ${label}  "${query}"  `);

    const url = await fetchItemImage(query);
    cache[slug] = url;

    if (url) {
      success++;
      console.log("✓");
    } else {
      noResult++;
      console.log("✗ no result");
    }

    // Respect rate limits — 120ms between requests
    await new Promise((r) => setTimeout(r, 120));
  }

  fs.writeFileSync(outputPath, JSON.stringify(cache, null, 2));
  console.log(
    `\n✅ Image cache saved to data/image-cache.json` +
    `\n   ${success} fetched, ${skipped} already cached, ${noResult} missing`
  );
}

buildImageCache().catch(console.error);
