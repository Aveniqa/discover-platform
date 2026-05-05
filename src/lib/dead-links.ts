import deadOutboundLinks from "@/../data/dead-outbound-links.json";

function normalizeOutboundUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

const deadOutboundUrlSet = new Set(
  (deadOutboundLinks as string[])
    .map((url) => normalizeOutboundUrl(url))
    .filter((url): url is string => Boolean(url)),
);

export function isDeadOutboundUrl(value?: string | null): boolean {
  const normalized = normalizeOutboundUrl(value);
  return Boolean(normalized && deadOutboundUrlSet.has(normalized));
}

export function filterLiveOutboundUrl(value?: string | null): string | null {
  if (!value || isDeadOutboundUrl(value)) return null;
  return value;
}
