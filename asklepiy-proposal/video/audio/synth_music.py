"""Спокійний ембієнт-пад для ролика (80 с), синтезується локально без сторонніх сервісів."""
import numpy as np, wave, sys
SR=44100; DUR=80.0; N=int(SR*DUR)
t=np.arange(N)/SR
L=np.zeros(N); R=np.zeros(N)
def f(m): return 440.0*2**((m-69)/12)
CH={'D':[50,54,57,61,64],'Bm':[47,50,54,57,61],'G':[43,47,50,54,57],'A':[45,52,57,59,64]}
seq=['D','Bm','G','A','D','Bm','G','A','D','Bm','G','D']
seg=DUR/len(seq)
rng=np.random.default_rng(7)
# пад: м'які гармоніки, повільна атака, перехресні переходи акордів
for i,c in enumerate(seq):
    s=i*seg; e=s+seg+2.5 if i<len(seq)-1 else DUR
    a=max(0,int((s-1.2)*SR)); b=min(N,int(e*SR)); tt=t[a:b]-t[a]; n=b-a
    env=np.minimum(1,tt/2.2)*np.minimum(1,(n/SR-tt)/2.4)
    env=np.clip(env,0,1)**1.3
    for k,m in enumerate(CH[c]):
        fr=f(m)
        for h in range(1,7):
            amp=0.055/(h**1.6)/(1+k*0.12)
            for ch,det in ((L,-3),(R,3)):
                fd=fr*h*2**(det/1200)
                ch[a:b]+=amp*env*np.sin(2*np.pi*fd*tt+rng.uniform(0,6.28))
    # бас
    bf=f(CH[c][0]-12)
    bass=0.09*env*np.sin(2*np.pi*bf*tt)
    L[a:b]+=bass; R[a:b]+=bass
# повільне «дихання» пада
lfo=0.85+0.15*np.sin(2*np.pi*t/9.0)
L*=lfo; R*=lfo
# арпеджіо: тихі «скляні» ноти, рух без нав'язливості
pat=[0,2,4,3,1,3,2,4]; step=0.42; start=5.8
k=0
x=start
while x<DUR-4:
    ci=min(int(x//seg),len(seq)-1); notes=CH[seq[ci]]
    m=notes[pat[k%8]]+24; fr=f(m)
    a=int(x*SR); n=int(1.8*SR); b=min(N,a+n); tt=t[a:b]-t[a]
    vel=0.030*(0.8+0.4*rng.random())
    tone=np.sin(2*np.pi*fr*tt)+0.25*np.sin(2*np.pi*2*fr*tt)+0.08*np.sin(2*np.pi*3*fr*tt)
    env=np.exp(-tt*3.2)*np.minimum(1,tt/0.008)
    pan=0.5+0.3*np.sin(k*0.7)
    L[a:b]+=vel*env*tone*(1-pan)*1.4; R[a:b]+=vel*env*tone*pan*1.4
    k+=1; x+=step
# м'які «повітряні» переходи на зміні сцен
cuts=[6,12,20,26,33,39.6,46,52,58,65,71]
noise=rng.standard_normal(N)
# згладжений шум (простий фільтр низьких частот)
ker=np.ones(40)/40; nz=np.convolve(noise,ker,mode='same')
for c in cuts:
    a=int((c-0.9)*SR); b=int((c+0.5)*SR); tt=np.arange(b-a)/SR; n=b-a
    env=np.sin(np.pi*np.clip(tt/(n/SR),0,1))**2*0.10
    L[a:b]+=env*nz[a:b]; R[a:b]+=env*nz[a:b][::-1]
# нормалізація
m=max(np.abs(L).max(),np.abs(R).max()); L/=m*1.05; R/=m*1.05
fade_in=np.minimum(1,t/1.5); fade_out=np.minimum(1,(DUR-t)/3.0)
L*=fade_in*fade_out; R*=fade_in*fade_out
st=np.empty(2*N,dtype=np.int16); st[0::2]=(L*32767*0.9).astype(np.int16); st[1::2]=(R*32767*0.9).astype(np.int16)
with wave.open(sys.argv[1],'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
print('ok',sys.argv[1])
