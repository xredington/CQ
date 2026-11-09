#!/usr/bin/env bash
# Mix voice (placed per scene) + ducked music, mux onto the rendered video.
set -euo pipefail
cd "$(dirname "$0")"
python3 music.py
inputs=(); filters=""; i=0
while IFS=$'\t' read -r id start; do
  inputs+=(-i "build/audio/$id.mp3")
  ms=$(python3 -c "print(int($start*1000))")
  filters+="[$i:a]aresample=48000,adelay=${ms}|${ms},aformat=channel_layouts=stereo[v$i];"
  i=$((i+1))
done < <(python3 -c "
import json;[print(s['id'],s['start'],sep='\t') for s in json.load(open('build/timeline.json'))['scenes']]")
mix=""; for ((k=0;k<i;k++)); do mix+="[v$k]"; done
ffmpeg -y -loglevel error "${inputs[@]}" -i build/music.wav -filter_complex \
 "${filters}${mix}amix=inputs=$i:normalize=0,volume=1.6,highpass=f=70,acompressor=threshold=-18dB:ratio=3:attack=5:release=120,apad=whole_dur=44[vo];\
[vo]asplit[vo1][vo2];[$i:a]volume=0.55[mu];[mu][vo1]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=350[duck];\
[vo2][duck]amix=inputs=2:normalize=0,alimiter=limit=0.95,loudnorm=I=-15:TP=-1.2:LRA=9[a]" \
 -map "[a]" -ar 48000 build/mix.wav
ffmpeg -y -loglevel error -i build/video-silent.mp4 -i build/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart CloudQuarks_Story.mp4
ffprobe -v error -show_entries format=duration,size -of default=nw=1 CloudQuarks_Story.mp4
