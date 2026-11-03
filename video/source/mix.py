"""Build sound effects, place voiceover segments at their scene times, and mux onto the silent render.
Usage: python3 mix.py <silent.mp4> <out.mp4>"""
import json, subprocess, sys
S = json.load(open('script.json'))
video, out = sys.argv[1], sys.argv[2]

# Sound design: tornado whoosh (38-46s), impact at the flash (46s), shimmer under the finale (81s).
sfx = ("anoisesrc=color=pink:d=8:a=0.9,bandpass=f=700:w=900,tremolo=f=5:d=0.6,"
       "volume='pow(t/8\\,2.2)':eval=frame,afade=t=out:st=7.75:d=0.25,adelay=38000:all=1[wh];"
       "sine=f=46:d=3,volume='exp(-2.0*t)':eval=frame,volume=2.2[b1];"
       "anoisesrc=color=brown:d=2.5:a=0.9,lowpass=f=500,volume='exp(-3.5*t)':eval=frame,volume=1.6[b2];"
       "[b1][b2]amix=inputs=2:normalize=0,adelay=46000:all=1[imp];"
       "sine=f=880:d=6,tremolo=f=3:d=0.4,afade=t=in:d=1.5,afade=t=out:st=3.5:d=2.5,volume=0.06[s1];"
       "sine=f=1318.5:d=6,afade=t=in:d=2,afade=t=out:st=3:d=3,volume=0.04[s2];"
       "[s1][s2]amix=inputs=2:normalize=0,adelay=81200:all=1[shim];"
       "[wh][imp][shim]amix=inputs=3:normalize=0,volume=0.55[sfx];")

args = ['ffmpeg', '-v', 'error', '-y', '-i', video]
for i in range(len(S)): args += ['-i', f'voice/{i:02d}.mp3']
f = sfx + ''.join(f"[{i+1}:a]adelay={int(s['start']*1000)}:all=1[a{i}];" for i, s in enumerate(S))
f += ''.join(f'[a{i}]' for i in range(len(S))) + f'[sfx]amix=inputs={len(S)+1}:normalize=0,apad,atrim=0:90,loudnorm=I=-16:TP=-1.5[aout]'
args += ['-filter_complex', f, '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', '90', '-movflags', '+faststart', out]
subprocess.run(args, check=True)
