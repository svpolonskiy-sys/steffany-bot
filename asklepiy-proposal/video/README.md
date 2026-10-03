# Ролик-презентація Sinaptic AI × Асклепій

- `Sinaptic-AI_Asklepiy_1080p.mp4` — фінальний ролик, 80 с, 1920×1080, 30 к/с, з фоновою музикою.
- `Sinaptic-AI_Asklepiy_1080p_bez-muzyky.mp4` — та сама версія без звуку (для власної озвучки).
- `promo.html` — джерело: 12 сцен, анімація керується часом (`window.renderAt(t)`).
- `render.js` — покадровий рендер через Playwright: `node render.js ./frames`.
- `audio/synth_music.py` — локальний синтез фонового ембієнт-пада (numpy).

Збирання:
```
node render.js frames
python3 audio/synth_music.py music_raw.wav
ffmpeg -i music_raw.wav -af "aecho=0.8:0.82:70|140|260|410:0.32|0.24|0.16|0.1,highpass=f=35,lowpass=f=9500,loudnorm=I=-19:TP=-2:LRA=11,afade=t=out:st=77:d=3" music.wav
ffmpeg -framerate 30 -i frames/f%05d.jpg -i music.wav -c:v libx264 -crf 19 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest out.mp4
```
