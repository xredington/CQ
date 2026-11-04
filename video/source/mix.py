"""Build sound design, place voiceover segments at their scene times, and mux onto the silent render.
Usage: python3 mix.py <silent.mp4> <out.mp4>"""
import json, subprocess, sys
S = json.load(open('script.json'))
video, out = sys.argv[1], sys.argv[2]

# Sound design
#  46.0-53.8  tornado whoosh + rising tone (riser), cut to silence at 53.8
#  54.0       reveal impact: sub boom + low "braam" chord + noise burst, with echo tail
#  55.83      second hit as "One" lands: smaller boom + bright chime
#  78.2       soft shimmer under the finale
sfx = (
 # whoosh
 "anoisesrc=color=pink:d=7.8:a=0.9,bandpass=f=700:w=900,tremolo=f=5:d=0.6,"
 "volume='pow(t/7.8\\,2.2)':eval=frame,afade=t=out:st=7.65:d=0.15,adelay=46000:all=1[wh];"
 # riser: chirp 55 -> 440 Hz with harmonics
 "aevalsrc='0.5*sin(2*PI*(55*t+50*t*t))+0.25*sin(4*PI*(55*t+50*t*t))+0.12*sin(6*PI*(55*t+50*t*t))':d=3.5:s=44100,"
 "volume='pow(t/3.5\\,3)':eval=frame,afade=t=out:st=3.4:d=0.1,adelay=50300:all=1[ri];"
 # main impact
 "aevalsrc='0.9*sin(2*PI*36*t)*exp(-1.1*t)+0.6*sin(2*PI*55*t)*exp(-1.6*t)':d=5:s=44100[i1];"
 "aevalsrc='(sin(2*PI*55*t)+0.6*sin(2*PI*110*t)+0.45*sin(2*PI*165*t)+0.35*sin(2*PI*82.4*t)+0.25*sin(2*PI*220*t)+0.2*sin(2*PI*330*t))*0.28*exp(-0.75*t)*(1-exp(-40*t))':d=5.5:s=44100,lowpass=f=1400[i2];"
 "anoisesrc=color=brown:d=2:a=0.9,lowpass=f=700,volume='exp(-4*t)':eval=frame,volume=1.4[i3];"
 "[i1][i2][i3]amix=inputs=3:normalize=0,aecho=0.8:0.6:120|260:0.35|0.22,adelay=54000:all=1,volume=1.5[imp];"
 # second hit + chime
 "aevalsrc='0.7*sin(2*PI*48*t)*exp(-2.5*t)':d=2.5:s=44100[h1];"
 "aevalsrc='(0.5*sin(2*PI*1318.5*t)+0.35*sin(2*PI*1975.5*t)+0.25*sin(2*PI*2637*t)+0.3*sin(2*PI*659.25*t))*exp(-1.8*t)*0.35':d=3:s=44100[h2];"
 "[h1][h2]amix=inputs=2:normalize=0,aecho=0.8:0.7:180|340:0.3|0.2,adelay=55830:all=1[hit];"
 # finale shimmer
 "sine=f=880:d=6,tremolo=f=3:d=0.4,afade=t=in:d=1.5,afade=t=out:st=3.5:d=2.5,volume=0.06[s1];"
 "sine=f=1318.5:d=6,afade=t=in:d=2,afade=t=out:st=3:d=3,volume=0.04[s2];"
 "[s1][s2]amix=inputs=2:normalize=0,adelay=78200:all=1[shim];"
 "[wh][ri][imp][hit][shim]amix=inputs=5:normalize=0,volume=0.55[sfx];")

# music bed (music.py), ducked under the narration with a sidechain compressor
subprocess.run([sys.executable, 'music.py', 'music.wav'], check=True)
args = ['ffmpeg', '-v', 'error', '-y', '-i', video, '-i', 'music.wav']
for i in range(len(S)): args += ['-i', f'voice/{i:02d}.mp3']
f = sfx + ''.join(f"[{i+2}:a]adelay={int(s['start']*1000)}:all=1[a{i}];" for i, s in enumerate(S))
f += ''.join(f'[a{i}]' for i in range(len(S))) + f'amix=inputs={len(S)}:normalize=0,highpass=f=80,acompressor=threshold=0.12:ratio=3:attack=5:release=120,volume=1.8,asplit=2[vo][vsc];'
f += '[1:a]volume=0.42[mus];[mus][vsc]sidechaincompress=threshold=0.04:ratio=5:attack=15:release=400:makeup=1[mduck];'
f += '[vo][mduck][sfx]amix=inputs=3:normalize=0,apad,atrim=0:90,alimiter=limit=0.95,loudnorm=I=-14:TP=-1.0:LRA=9[aout]'
args += ['-filter_complex', f, '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', '90', '-movflags', '+faststart', out]
subprocess.run(args, check=True)
