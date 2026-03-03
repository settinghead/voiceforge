import { readFileSync, readdirSync, existsSync } from "fs";
import { join, resolve } from "path";
import { PACKS_DIR } from "./paths.js";

/**
 * Load a voice pack by id (from config.active_pack).
 * Returns { id, name, echo, voicePath, system_prompt, fallback_phrases }.
 * Falls back to legacy config.voice if no active_pack is set.
 */
export function loadPack(config) {
  const packId = config.active_pack;

  // Legacy fallback: no active_pack configured
  if (!packId) {
    return {
      id: "_legacy",
      name: "Legacy",
      echo: true,
      voicePath: config.voice || "default.wav",
      system_prompt: null,
      fallback_phrases: null,
    };
  }

  const packDir = join(PACKS_DIR, packId);
  const packJsonPath = join(packDir, "pack.json");

  let packData;
  try {
    packData = JSON.parse(readFileSync(packJsonPath, "utf-8"));
  } catch {
    // Pack not found or invalid — fall back to defaults
    return {
      id: packId,
      name: packId,
      echo: true,
      voicePath: config.voice || "default.wav",
      system_prompt: null,
      fallback_phrases: null,
    };
  }

  // Resolve voice path: relative to pack dir, or fall back to config.voice
  let voicePath = config.voice || "default.wav";
  if (packData.voice) {
    const resolved = resolve(packDir, packData.voice);
    if (existsSync(resolved)) {
      voicePath = resolved;
    }
  }

  return {
    id: packId,
    name: packData.name || packId,
    echo: packData.echo !== false,
    voicePath,
    system_prompt: packData.system_prompt || null,
    fallback_phrases: packData.fallback_phrases || null,
  };
}

/**
 * List all available voice packs.
 * Returns [{ id, name }].
 */
export function listPacks() {
  const packs = [];
  let entries;
  try {
    entries = readdirSync(PACKS_DIR, { withFileTypes: true });
  } catch {
    return packs;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const packJsonPath = join(PACKS_DIR, entry.name, "pack.json");
    try {
      const data = JSON.parse(readFileSync(packJsonPath, "utf-8"));
      packs.push({ id: entry.name, name: data.name || entry.name });
    } catch {
      // skip invalid packs
    }
  }
  return packs;
}
