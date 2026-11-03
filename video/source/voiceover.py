"""Generate the timed voiceover segments with edge-tts (Microsoft neural voice)."""
import asyncio, ssl, json, os, sys, edge_tts, edge_tts.communicate as c
ca = '/root/.ccr/ca-bundle.crt'
if os.path.exists(ca): c._SSL_CTX = ssl.create_default_context(cafile=ca)
VOICE = sys.argv[1] if len(sys.argv) > 1 else 'en-US-AndrewNeural'
SEG = json.load(open(os.path.join(os.path.dirname(__file__), 'script.json')))
async def main():
    for i, s in enumerate(SEG):
        for attempt in range(5):
            try:
                await edge_tts.Communicate(s['text'], VOICE, rate=s.get('rate', '+0%')).save(f'voice/{i:02d}.mp3'); break
            except Exception as e:
                print('retry', i, type(e).__name__); await asyncio.sleep(2 * (attempt + 1))
        else:
            raise SystemExit(f'segment {i} failed')
asyncio.run(main())
