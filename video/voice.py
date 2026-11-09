"""Generate the voiceover (one MP3 per scene) and caption timings.

Usage: python3 voice.py  -> writes build/audio/<id>.mp3 and build/timeline.json
Requires: pip install edge-tts
"""
import asyncio, json, os, re, subprocess, ssl

import certifi
# Route TLS through the environment CA bundle when present (cloud proxy).
_CA = "/root/.ccr/ca-bundle.crt"
if os.path.exists(_CA):
    certifi.where = lambda: _CA
import edge_tts  # noqa: E402

VOICE = os.environ.get("CQ_VOICE", "en-US-AvaMultilingualNeural")
RATE = os.environ.get("CQ_RATE", "+11%")
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "build")
os.makedirs(os.path.join(OUT, "audio"), exist_ok=True)


def display(text: str) -> str:
    """Turn phonetic spellings ("C Q C", "A I") back into display text."""
    text = re.sub(r"\b(?:[A-Z0-9] ){1,5}[A-Z0-9]\b", lambda m: m.group(0).replace(" ", ""), text)
    return text.replace("API first", "API-first").replace("entity led", "entity-led") \
               .replace("mini shop", "mini-shop").replace("AI ready", "AI-ready").replace("Cloud Quarks", "CloudQuarks").replace("Track My Cloud", "TrackMyCloud").replace("Fin Ops", "FinOps").replace("Ree onix", "Reonix").replace("White label", "White-label")


def duration(path: str) -> float:
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                   "-of", "csv=p=0", path])
    return float(out)


def chunk(sentence: str, start: float, end: float, max_words: int = 10):
    """Split a spoken sentence into caption lines, timed by character share."""
    sentence = display(sentence)
    parts = []
    for piece in re.split(r"(?<=[.?!])\s+", sentence):
        words = piece.split()
        n = -(-len(words) // max_words)
        size = -(-len(words) // n) if n else 1
        parts += [" ".join(words[i:i + size]) for i in range(0, len(words), size)]
    total = sum(len(p) for p in parts)
    out, t = [], start
    for p in parts:
        d = (end - start) * len(p) / total
        out.append((p, t, t + d))
        t += d
    return out


async def scene(item):
    path = os.path.join(OUT, "audio", f"{item['id']}.mp3")
    meta = path[:-4] + ".json"
    key = {"text": item["text"], "voice": VOICE, "rate": item.get("rate", RATE)}
    if os.path.exists(meta):
        m = json.load(open(meta))
        if m["key"] == key:
            return path, m["sentences"]
    for attempt in range(6):
        try:
            sents = await synth(item, path)
            if duration(path) < 0.6 * len(item["text"]) / 16:  # truncated stream from the service
                raise RuntimeError("audio too short")
            json.dump({"key": key, "sentences": sents}, open(meta, "w"))
            return path, sents
        except Exception as e:  # transient service errors
            print("  retry", item["id"], type(e).__name__)
            await asyncio.sleep(3 * (attempt + 1))
    raise RuntimeError("TTS failed for " + item["id"])


async def synth(item, path):
    comm = edge_tts.Communicate(item["text"], VOICE, rate=item.get("rate", RATE), boundary="SentenceBoundary")
    sentences = []
    with open(path, "wb") as f:
        async for c in comm.stream():
            if c["type"] == "audio":
                f.write(c["data"])
            elif c["type"] == "SentenceBoundary":
                s = c["offset"] / 1e7
                sentences.append((c["text"], s, s + c["duration"] / 1e7))
    return sentences


async def main():
    items = json.load(open(os.path.join(HERE, "narration.json")))
    t, scenes = 0.6, []  # small lead-in before the first word
    for it in items:
        path, sents = await scene(it)
        d = duration(path)
        caps = []
        for txt, s, e in sents:
            caps += [(c, round(t + a, 3), round(t + b, 3)) for c, a, b in chunk(txt, s, e)]
        scenes.append({"id": it["id"], "start": round(t, 3), "voice": round(d, 3),
                       "end": round(t + d + it["pad"], 3), "captions": caps})
        print(f"{it['id']:12s} start {t:7.2f}  voice {d:6.2f}")
        t += d + it["pad"]
    json.dump({"total": round(t, 3), "scenes": scenes}, open(os.path.join(OUT, "timeline.json"), "w"), indent=1)
    print("total", round(t, 2))


asyncio.run(main())
