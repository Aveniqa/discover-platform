import assert from "node:assert/strict";
import test from "node:test";
import { sendNewsletterToButtondown } from "./send-newsletter.mjs";

test("Buttondown live-send falls back to a draft", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    const body = JSON.parse(options.body);
    calls.push({ url, headers: options.headers, body });
    if (body.status === "about_to_send") {
      return new Response("live send rejected", { status: 400 });
    }
    return new Response(JSON.stringify({ id: "draft_123" }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  };

  const result = await sendNewsletterToButtondown({
    subject: "Surfaced test",
    body: "<p>Test</p>",
    apiKey: "test-key",
    fetchImpl,
  });

  assert.equal(result.mode, "draft");
  assert.equal(result.payload.id, "draft_123");
  assert.equal(calls.length, 2);
  assert.equal(calls[0].body.status, "about_to_send");
  assert.equal(calls[0].headers["X-Buttondown-Live-Dangerously"], "true");
  assert.equal(calls[1].body.status, "draft");
  assert.equal(calls[1].headers["X-Buttondown-Live-Dangerously"], undefined);
});
