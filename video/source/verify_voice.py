"""Transcribe each narration clip with Whisper, flag mispronunciations, and report speech length vs. its slot.
Regenerates a clip (up to 4 tries) when a required word is not heard. Usage: python3 verify_voice.py"""
import asyncio, json, re, subprocess, numpy as np, edge_tts, os, ssl
import edge_tts.communicate as c
from faster_whisper import WhisperModel
ca = '/root/.ccr/ca-bundle.crt'
if os.path.exists(ca): c._SSL_CTX = ssl.create_default_context(cafile=ca)
S = json.load(open('script.json'))
MUST = {'Redington': 'redington', 'Tech. Citadel': 'tech citadel', 'CloudQuarks': 'cloud ?quarks', 'Hive': 'hive',
        'Velocity': 'velocity', 'RACE': 'race', 'Mass': 'mass', 'D N T': 'd.?n.?t|d&t'}
m = WhisperModel('base.en', device='cpu', compute_type='int8')
def load(f):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-f', 's16le', '-ac', '1', '-ar', '16000', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768
def speech_len(f):
    a = load(f); idx = np.where(np.abs(a) > 0.01)[0]
    return (idx[-1] / 16000) if len(idx) else 0
def heard(f):
    segs, _ = m.transcribe(load(f), beam_size=5); return ' '.join(x.text.strip() for x in segs)
async def regen(i, s):
    for a in range(5):
        try: await edge_tts.Communicate(s['text'], 'en-US-AndrewNeural', rate=s['rate']).save(f'voice/{i:02d}.mp3'); return
        except Exception: await asyncio.sleep(2)
ok = True
for i, s in enumerate(S):
    f = f'voice/{i:02d}.mp3'
    keys = [v for k, v in MUST.items() if k in s['text']]
    for attempt in range(4):
        if attempt or not os.path.exists(f): asyncio.run(regen(i, s))
        h = heard(f); good = all(re.search(k, h.lower()) for k in keys)
        if good: break
    L = speech_len(f); slot = s['end'] - s['start']
    flag = ('' if good else ' PRONUNCIATION?') + (' TOO LONG' if L > slot else '')
    ok &= not flag
    print(f'{i:02d} {L:4.1f}s/{slot:4.1f}s  "{s["text"]}"  -> "{h}"{flag}')
print('ALL GOOD' if ok else 'ISSUES FOUND')
