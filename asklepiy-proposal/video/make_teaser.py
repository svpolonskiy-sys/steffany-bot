"""Збирає тизер ~30 с із кадрів основного ролика (frames/f%05d.jpg) з переходами-шторками.
Далі: python3 audio/synth_music_live.py teaser_raw.wav 29.5 3.6 і змішування з відео (див. README)."""
import subprocess, sys
F=sys.argv[1] if len(sys.argv)>1 else "frames"; OUT=sys.argv[2] if len(sys.argv)>2 else "teaser_v.mp4"
segs=[(0.0,4.0),(6.7,10.2),(12.7,17.8),(26.7,31.0),(40.3,44.8),(58.7,63.4),(71.6,77.4)]  # секунди основного ролика
X=0.4; FPS=30; inputs=[]; fl=[]
for s,e in segs: inputs+=["-framerate","30","-start_number",str(round(s*FPS)),"-i",f"{F}/f%05d.jpg"]
for i,(s,e) in enumerate(segs): fl.append(f"[{i}:v]trim=end_frame={round((e-s)*FPS)},setpts=PTS-STARTPTS[s{i}]")
cur="[s0]"; total=segs[0][1]-segs[0][0]
for i in range(1,len(segs)):
    off=total-X; fl.append(f"{cur}[s{i}]xfade=transition=smoothleft:duration={X}:offset={off:.3f}[x{i}]"); cur=f"[x{i}]"; total=off+segs[i][1]-segs[i][0]
subprocess.run(["ffmpeg","-y"]+inputs+["-filter_complex",";".join(fl),"-map",cur,"-c:v","libx264","-crf","19","-pix_fmt","yuv420p",OUT],check=True)
print("duration",round(total,2))
