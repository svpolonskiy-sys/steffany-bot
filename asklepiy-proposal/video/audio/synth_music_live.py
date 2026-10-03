"""Жвавий трек для тизера/ролика: 118 BPM, бас, ритм, арпеджіо, пад із «дихаючим» сайдчейном.
Використання: python3 synth_music_live.py out.wav <тривалість_с> <початок_ударних_с>"""
import numpy as np, wave, sys
SR=44100; DUR=float(sys.argv[2]); DRUMS=float(sys.argv[3]); N=int(SR*DUR)
t=np.arange(N)/SR; L=np.zeros(N); R=np.zeros(N)
rng=np.random.default_rng(11)
BPM=118; BEAT=60/BPM; BAR=4*BEAT
def f(m): return 440.0*2**((m-69)/12)
CH=[[50,54,57,61,64],[47,50,54,57,62],[43,47,50,54,59],[45,49,52,57,64]]   # D, Bm, G, A
END=DUR-1.8   # останній акорд і хвіст
def add(a,sig,pan=0.5):
    b=min(N,a+len(sig)); s=sig[:b-a]; L[a:b]+=s*(1-pan)*2*0.5+s*0.5*(1-abs(pan-0.5)); R[a:b]+=s*pan*2*0.5+s*0.5*(1-abs(pan-0.5))
# --- кік і сайдчейн ---
side=np.ones(N)
nb=int(DUR/BEAT)+1
for i in range(nb):
    x=i*BEAT
    if x<DRUMS-1e-6 or x>=END: continue
    n=int(.38*SR); tt=np.arange(n)/SR
    fr=45+75*np.exp(-tt*28); ph=2*np.pi*np.cumsum(fr)/SR
    k=np.sin(ph)*np.exp(-tt*9)*0.55
    add(int(x*SR),k)
    a=int(x*SR); b=min(N,a+int(BEAT*SR)); tb=np.arange(b-a)/SR
    side[a:b]=np.minimum(side[a:b],1-0.55*np.exp(-tb*7))
    # клап на 2 і 4
    if i%4 in (1,3):
        n=int(.22*SR); tt=np.arange(n)/SR
        nz=rng.standard_normal(n); nz=np.convolve(nz,[1,-0.6],mode='same')
        add(int(x*SR),nz*np.exp(-tt*22)*0.16,0.48)
    # хети: восьмі долі (офбіт сильніше) + тихі шістнадцяті
    for sub,amp in ((0.5,0.07),(0.25,0.025),(0.75,0.03)):
        n=int(.06*SR); tt=np.arange(n)/SR
        nz=np.diff(rng.standard_normal(n+1))
        add(int((x+sub*BEAT)*SR),nz*np.exp(-tt*55)*amp,0.62 if sub==0.5 else 0.38)
# --- бас: восьмі ноти, «пружний» ---
pat=[0,0,12,0,0,7,12,0]
for i in range(int(DUR/(BEAT/2))+1):
    x=i*BEAT/2
    if x<DRUMS-BAR/2 or x>=END: continue
    c=CH[int(x//BAR)%4]; m=c[0]-12+pat[i%8]; fr=f(m)
    n=int(.32*SR); tt=np.arange(n)/SR
    s=(np.sin(2*np.pi*fr*tt)+0.35*np.sin(2*np.pi*2*fr*tt)+0.12*np.sin(2*np.pi*3*fr*tt))*np.exp(-tt*7)*np.minimum(1,tt/0.004)*0.20
    add(int(x*SR),s)
# --- арпеджіо: шістнадцяті, пінг-понг ---
ap=[0,2,4,3,1,3,4,2]
for i in range(int(DUR/(BEAT/4))+1):
    x=i*BEAT/4
    if x>=END: continue
    c=CH[int(x//BAR)%4]; m=c[ap[i%8]]+12+(12 if (i//8)%2 else 0); fr=f(m)
    n=int(.28*SR); tt=np.arange(n)/SR
    tri=np.sin(2*np.pi*fr*tt)-0.11*np.sin(2*np.pi*3*fr*tt)+0.04*np.sin(2*np.pi*5*fr*tt)
    acc=1.0 if i%4==0 else 0.7
    vol=0.050 if x>=DRUMS else 0.040
    add(int(x*SR),tri*np.exp(-tt*11)*np.minimum(1,tt/0.003)*vol*acc,0.25 if i%2 else 0.75)
# --- пад ---
pad=np.zeros(N)
for bi in range(int(DUR/BAR)+1):
    s=bi*BAR; c=CH[bi%4]
    if s>=END: c=CH[0]
    a=int(max(0,s-0.05)*SR); e=min(DUR,s+BAR+0.6) if s<END else DUR; b=int(e*SR); tt=np.arange(b-a)/SR; n=b-a
    env=np.clip(np.minimum(tt/0.25,(n/SR-tt)/0.6),0,1)
    for k,m in enumerate(c):
        for h in range(1,5):
            pad[a:b]+=0.03/(h**1.7)*env*np.sin(2*np.pi*f(m)*h*tt+k)
pad*=side
L+=pad; R+=pad
# --- фінальний акорд і «удар» ---
a=int(END*SR); tt=t[a:]-t[a]
for m in CH[0]+[CH[0][0]-12]:
    s=0.07*np.exp(-tt*1.4)*np.sin(2*np.pi*f(m)*tt); L[a:]+=s; R[a:]+=s
n=int(.5*SR); tk=np.arange(n)/SR; ph=2*np.pi*np.cumsum(40+60*np.exp(-tk*20))/SR
add(a,np.sin(ph)*np.exp(-tk*5)*0.6)
# --- райзери перед входом ударних і перед фіналом ---
for x in (DRUMS, END):
    a=int((x-1.6)*SR); b=int(x*SR)
    if a<0: continue
    tt=np.arange(b-a)/SR; nz=rng.standard_normal(b-a)
    nz=np.convolve(nz,np.ones(6)/6,mode='same')
    s=nz*(tt/1.6)**2*0.12; L[a:b]+=s; R[a:b]+=s
m=max(abs(L).max(),abs(R).max()); L/=m*1.02; R/=m*1.02
fi=np.minimum(1,t/0.25); L*=fi; R*=fi
st=np.empty(2*N,dtype=np.int16); st[0::2]=(L*32767*.92).astype(np.int16); st[1::2]=(R*32767*.92).astype(np.int16)
with wave.open(sys.argv[1],'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
print('ok',DUR)
