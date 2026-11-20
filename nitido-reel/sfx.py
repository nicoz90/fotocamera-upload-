import numpy as np, wave
SR=48000;T=15.0;N=int(SR*T);L=np.zeros(N);R=np.zeros(N)
rng=np.random.default_rng(3)
def put(sig,t,pan=0.0,g=1.0):
    i=int(t*SR);n=min(len(sig),N-i)
    if n<=0:return
    L[i:i+n]+=sig[:n]*g*(1-max(0,pan));R[i:i+n]+=sig[:n]*g*(1+min(0,pan))
def lp(x,c):  # one-pole lowpass, c can be array (0..1)
    y=np.zeros_like(x);a=0.0;c=np.broadcast_to(c,x.shape)
    for i in range(len(x)):a+=c[i]*(x[i]-a);y[i]=a
    return y
def env(n,att,dec):
    t=np.arange(n)/SR;return np.minimum(1,t/att)*np.exp(-t/dec)
def tone(f,d,dec,att=.002):
    n=int(d*SR);t=np.arange(n)/SR;return np.sin(2*np.pi*f*t)*env(n,att,dec)
def click(d=.03,c=.5,dec=.004):
    n=int(d*SR);return lp(rng.standard_normal(n),c)*env(n,.0003,dec)
def whoosh(d,up=True):
    n=int(d*SR);x=rng.standard_normal(n);u=np.linspace(0,1,n)
    c=(0.01+0.25*(u if up else 1-u)**2);s=lp(x,c)-lp(lp(x,c),0.01)
    e=np.sin(np.pi*u)**2;return s*e
def thump(f=55,d=.5):
    n=int(d*SR);t=np.arange(n)/SR;fr=f*(1+2*np.exp(-t*30));ph=2*np.pi*np.cumsum(fr)/SR
    return np.sin(ph)*env(n,.002,.12)
# AF bips
put(tone(2600,.06,.03),0.05,g=.18);put(tone(2600,.06,.03),0.42,g=.18);put(tone(3300,.08,.04),0.5,g=.2)
# explode
put(whoosh(1.3),0.35,g=.9);put(thump(48,.7),0.55,g=.9)
for k in range(16):put(click(.03,.35,.003),0.6+k*.085+rng.random()*.02,pan=rng.uniform(-.6,.6),g=.45)
# label ticks
for t in [2.6,4.4,6.05,7.75,9.4]:put(tone(1800,.05,.02),t,g=.12);put(click(.02,.6,.002),t,g=.3);put(whoosh(.45),t-.3,g=.35)
# aperture ratchet
for k in range(9):put(click(.02,.25,.002),4.5+k*.05,g=.35)
for k in range(9):put(click(.02,.25,.002),5.6+k*.04,g=.3)
# shutter
put(click(.05,.4,.006),6.33,g=.9);put(lp(rng.standard_normal(int(.06*SR)),.15)*env(int(.06*SR),.001,.015),6.34,g=.6);put(click(.05,.35,.008),6.47,g=.8);put(thump(120,.15),6.33,g=.3)
# IBIS hum
n=int(1.2*SR);t=np.arange(n)/SR;h=np.sin(2*np.pi*(70+8*np.sin(2*np.pi*6*t))*t)*np.sin(np.pi*t/1.2)**2*.25+lp(rng.standard_normal(n),.02)*np.sin(np.pi*t/1.2)**2*.6
put(h,9.4,g=.6)
# reassemble
put(whoosh(1.3,False),10.5,g=.8)
for k in range(16):put(click(.04,.3,.005),10.85+k*.085,pan=rng.uniform(-.5,.5),g=.55)
put(thump(52,.8),12.25,g=1.0);put(click(.06,.3,.01),12.25,g=.6)
# end
put(tone(2600,.06,.03),12.45,g=.15);put(tone(880,.6,.25,.01)+tone(1320,.6,.2,.01)*.5,13.4,g=.12)
m=np.stack([L,R],1);m/=max(1e-9,np.abs(m).max())/0.89
w=wave.open('sfx.wav','wb');w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((m*32767).astype('<i2').tobytes());w.close();print('ok')
