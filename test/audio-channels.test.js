import test from "node:test";
import assert from "node:assert/strict";
import { normalizeOutputChannels } from "../src/audio.js";

test("output channels default to local audio", () => {
  assert.deepEqual(normalizeOutputChannels(undefined), ["local"]);
  assert.deepEqual(normalizeOutputChannels([]), ["local"]);
});

test("output channels normalize legacy hub aliases to Benchday phone", () => {
  assert.deepEqual(
    normalizeOutputChannels(["local", "hub", "benchday-phone", "webhook", "hub"]),
    ["local", "benchday_phone", "webhook"],
  );
  assert.deepEqual(
    normalizeOutputChannels("phone, local_audio"),
    ["benchday_phone", "local"],
  );
});
