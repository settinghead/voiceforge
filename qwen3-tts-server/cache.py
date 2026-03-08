"""Simple in-memory LRU cache for TTS WAV output."""

import os
from collections import OrderedDict

MAX_ENTRIES = int(os.environ.get("QWEN_TTS_CACHE_MAX", "300"))

_store: OrderedDict[tuple, bytes] = OrderedDict()


def get(key: tuple) -> bytes | None:
    """Return cached WAV bytes and promote to most-recent, or None."""
    if key in _store:
        _store.move_to_end(key)
        return _store[key]
    return None


def put(key: tuple, wav_bytes: bytes):
    """Store WAV bytes, evicting oldest if over capacity."""
    _store[key] = wav_bytes
    _store.move_to_end(key)
    while len(_store) > MAX_ENTRIES:
        _store.popitem(last=False)
