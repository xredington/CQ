"""Place voiceover segments at their scene times and mux onto the silent render."""
import json, subprocess, sys
S = json.load(open('script.json'))
video, out = sys.argv[1], sys.argv[2]
args = ['ffmpeg', '-v', 'error', '-y', '-i', video]
for i in range(len(S)): args += ['-i', f'voice/{i:02d}.mp3']
f = ''.join(f"[{i+1}:a]adelay={int(s['start']*1000)}:all=1[a{i}];" for i, s in enumerate(S))
f += ''.join(f'[a{i}]' for i in range(len(S))) + f'amix=inputs={len(S)}:normalize=0,apad,atrim=0:90,loudnorm=I=-16:TP=-1.5[aout]'
args += ['-filter_complex', f, '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]
subprocess.run(args, check=True)
