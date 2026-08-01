# -*- coding: utf-8 -*-
"""Hamdam verse cards - 4 layout families x 5 palettes, deterministic by date."""
import math, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter, features
assert features.check('raqm'), 'raqm missing - ABORT'

S=2; W,H=1080*S,1350*S
FZ='/tmp/fonts/vazirmatn/fonts/ttf/'
SS='/tmp/fonts/sourceserif/source-serif-4.005_Desktop/OTF/'

def hx(h): h=h.lstrip('#'); return tuple(int(h[i:i+2],16) for i in (0,2,4))
def lerp(a,b,t): return tuple(round(a[i]+(b[i]-a[i])*t) for i in range(3))
def ease(t): return t*t*t*(t*(t*6-15)+10)

# ---- brand tokens ----
NIGHT,DUSK,FIRSTLIGHT,DAWN=hx('141430'),hx('2A2140'),hx('5A3A4A'),hx('C77E4E')
EMBER,SAFFRON,NIGHTGOLD,CREAM=hx('D07B3F'),hx('E8B04B'),hx('F0C878'),hx('F4EDD8')
INK_D,SOFT=hx('241E15'),hx('574A38'); TN=(244,237,216)
LAPIS,TEAL,ROSE=hx('1B3A5C'),hx('1F4E4A'),hx('7A3B47')

PALETTES={
 'dawn':   dict(stops=[(0,NIGHT),(.3,DUSK),(.52,FIRSTLIGHT),(.7,DAWN),(.84,lerp(EMBER,SAFFRON,.55)),(.93,lerp(SAFFRON,NIGHTGOLD,.6)),(1,lerp(NIGHTGOLD,CREAM,.5))],
           ink=TN, accent=lerp(TN,NIGHTGOLD,.55), stars=70, dark=True),
 'night':  dict(stops=[(0,hx('0B0B1E')),(.5,NIGHT),(1,lerp(DUSK,LAPIS,.35))],
           ink=lerp(TN,NIGHTGOLD,.30), accent=NIGHTGOLD, stars=150, dark=True),
 'morning':dict(stops=[(0,hx('FBF7EC')),(.55,CREAM),(1,lerp(CREAM,hx('F2C9A0'),.55))],
           ink=INK_D, accent=lerp(EMBER,INK_D,.25), stars=0, dark=False),
 'dusk':   dict(stops=[(0,lerp(DUSK,LAPIS,.25)),(.45,FIRSTLIGHT),(.8,lerp(FIRSTLIGHT,EMBER,.6)),(1,lerp(EMBER,SAFFRON,.45))],
           ink=TN, accent=lerp(TN,NIGHTGOLD,.5), stars=35, dark=True),
 'garden': dict(stops=[(0,hx('102E2C')),(.5,TEAL),(1,lerp(TEAL,SAFFRON,.30))],
           ink=lerp(TN,hx('CFE6D8'),.35), accent=lerp(SAFFRON,CREAM,.35), stars=60, dark=True),
}
LAYOUTS=['sky','panel','rule','nocturne']

def gradient(stops):
    row=Image.new('RGB',(1,H)); r=row.load()
    for y in range(H):
        f=y/(H-1)
        for i in range(len(stops)-1):
            y0,c0=stops[i]; y1,c1=stops[i+1]
            if y0<=f<=y1:
                r[0,y]=lerp(c0,c1,ease((f-y0)/(y1-y0)) if y1>y0 else 0); break
    return row.resize((W,H))

def starfield(img,draw,n,seed,top=.34):
    rng=random.Random(seed)
    for _ in range(n):
        x=rng.randint(int(W*.05),int(W*.95)); y=rng.randint(int(H*.02),int(H*top))
        a=.10+.45*(1-y/(H*top))*rng.random()
        rr=S*(1 if rng.random()<.78 else 2)
        c=lerp(img.getpixel((x,y)),TN,a); draw.ellipse([x-rr,y-rr,x+rr,y+rr],fill=c)

def glow(img,cx,cy,rad,colour,steps=((6.5,18),(4.6,32),(3.2,52),(2.1,80),(1.5,112))):
    g=Image.new('L',(W,H),0); gd=ImageDraw.Draw(g)
    for m,a in steps: gd.ellipse([cx-rad*m,cy-rad*m,cx+rad*m,cy+rad*m],fill=a)
    g=g.filter(ImageFilter.GaussianBlur(int(rad*1.15)))
    return Image.composite(Image.new('RGB',(W,H),colour),img,g)

def shamseh(draw,cx,cy,ro,ri,col,w,points=8):
    pts=[]
    for k in range(points*2):
        ang=math.pi/2+k*math.pi/points; rr=ro if k%2==0 else ri
        pts.append((cx+rr*math.cos(ang),cy-rr*math.sin(ang)))
    draw.polygon(pts,outline=col,width=w)

def fa(draw,xy,t,f,fill,anchor='mm'):
    draw.text(xy,t,font=f,fill=fill,anchor=anchor,direction='rtl',language='fa',features=['kern','liga'])

def wrap(draw,text,font,maxw):
    words=text.split(); lines=[]; cur=''
    for w_ in words:
        t=(cur+' '+w_).strip()
        if draw.textlength(t,font=font)<=maxw: cur=t
        else:
            if cur: lines.append(cur)
            cur=w_
    if cur: lines.append(cur)
    return lines

def fit_fa(draw,lines,maxw,start,floor=26):
    size=start
    while size>floor:
        f=ImageFont.truetype(FZ+'Vazirmatn-Light.ttf',S*size)
        if max(draw.textlength(l,font=f,direction='rtl',language='fa') for l in lines)<=maxw:
            return size,f
        size-=2
    return floor,ImageFont.truetype(FZ+'Vazirmatn-Light.ttf',S*floor)

def render(verse_fa, poet_fa, english, poet_en, palette, layout, out):
    P=PALETTES[palette]
    img=gradient(P['stops']); draw=ImageDraw.Draw(img)
    ink,acc,dark=P['ink'],P['accent'],P['dark']
    lines=[l for l in verse_fa.split('\n') if l.strip()]
    n=len(lines)

    # ---------- background furniture per layout ----------
    if layout=='nocturne':
        starfield(img,draw,P['stars']+60,1391,top=.55); draw=ImageDraw.Draw(img)
        img=glow(img,W//2,int(H*.30),int(W*.30),lerp(acc,CREAM,.4),
                 steps=((2.2,14),(1.6,24),(1.1,34)))
        draw=ImageDraw.Draw(img)
    elif layout=='sky':
        if P['stars']: starfield(img,draw,P['stars'],1391); draw=ImageDraw.Draw(img)
        cy=int(H*.845); rad=int(W*.085)
        img=glow(img,W//2,cy,rad,NIGHTGOLD if dark else lerp(SAFFRON,CREAM,.35))
        d0=Image.new('L',(W,H),0); dd=ImageDraw.Draw(d0)
        dd.ellipse([W//2-rad,cy-rad,W//2+rad,cy+rad],fill=255)
        d0=d0.filter(ImageFilter.GaussianBlur(S*2))
        img=Image.composite(Image.new('RGB',(W,H),lerp(NIGHTGOLD,CREAM,.4)),img,d0)
        draw=ImageDraw.Draw(img)
    elif layout=='panel':
        if P['stars']: starfield(img,draw,int(P['stars']*.6),1391); draw=ImageDraw.Draw(img)
        pad=int(W*.070); top=int(H*.185); bot=int(H*.790)
        panel=Image.new('RGBA',(W,H),(0,0,0,0)); pd=ImageDraw.Draw(panel)
        fillc=(255,255,255,26) if dark else (255,255,255,120)
        pd.rounded_rectangle([pad,top,W-pad,bot],radius=int(W*.035),fill=fillc)
        img=Image.alpha_composite(img.convert('RGBA'),panel).convert('RGB')
        draw=ImageDraw.Draw(img)
        draw.rounded_rectangle([pad,top,W-pad,bot],radius=int(W*.035),
                               outline=lerp(acc,ink,.45),width=max(1,S//2))
    elif layout=='rule':
        if P['stars']: starfield(img,draw,int(P['stars']*.5),1391); draw=ImageDraw.Draw(img)
        draw.line([int(W*.115),int(H*.300),int(W*.115),int(H*.725)],fill=lerp(acc,ink,.5),width=S)

    # ---------- ornament ----------
    if layout in ('sky','nocturne'):
        shamseh(draw,W//2,int(H*.115),int(W*.032),int(W*.014),lerp(ink,acc,.5),S)
    elif layout=='panel':
        shamseh(draw,W//2,int(H*.155),int(W*.026),int(W*.011),lerp(acc,ink,.3),S)

    # ---------- Persian verse ----------
    maxw = W*.80 if layout!='panel' else W*.74
    start = 58 if n<=2 else (44 if n==3 else 38)
    size,fv=fit_fa(draw,lines,maxw,start)
    lh=size*1.95*S
    centre = {'sky':.395,'panel':.385,'rule':.415,'nocturne':.375}[layout]
    y0=int(H*centre-(n-1)*lh/2)
    if layout=='rule':
        rx=int(W*.885)
        for i,l in enumerate(lines): fa(draw,(rx,y0+i*lh),l,fv,ink,anchor='rm')
    else:
        for i,l in enumerate(lines): fa(draw,(W//2,y0+i*lh),l,fv,ink)

    # ---------- poet, with rules ----------
    fp=ImageFont.truetype(FZ+'Vazirmatn-Regular.ttf',S*32)
    sy=y0+ (n-1)*lh + int(lh*0.95)
    if layout=='rule':
        fa(draw,(int(W*.885),sy),poet_fa,fp,acc,anchor='rm')
    else:
        pw=draw.textlength(poet_fa,font=fp,direction='rtl',language='fa')
        gap=S*24; sw=int(W*.042); sc=lerp(acc,ink,.35)
        draw.line([W//2-pw/2-gap-sw,sy,W//2-pw/2-gap,sy],fill=sc,width=max(1,S//2))
        draw.line([W//2+pw/2+gap,sy,W//2+pw/2+gap+sw,sy],fill=sc,width=max(1,S//2))
        fa(draw,(W//2,sy),poet_fa,fp,acc)

    # ---------- English translation ----------
    fe_i=ImageFont.truetype(SS+'SourceSerif4-LightIt.otf',S*29)
    ew = W*.70 if layout!='rule' else W*.62
    elines=wrap(draw,english,fe_i,ew)
    if len(elines)>4:
        fe_i=ImageFont.truetype(SS+'SourceSerif4-LightIt.otf',S*25)
        elines=wrap(draw,english,fe_i,ew)
    eink=lerp(ink,CREAM if dark else SOFT,.30)
    elh=int(S*29*1.55) if len(elines)<=4 else int(S*25*1.55)
    ey = sy + int(H*.082)
    if layout=='rule':
        for i,l in enumerate(elines):
            draw.text((int(W*.115)+int(W*.035),ey+i*elh),l,font=fe_i,fill=eink,anchor='lm')
    else:
        for i,l in enumerate(elines):
            draw.text((W//2,ey+i*elh),l,font=fe_i,fill=eink,anchor='mm')
    fpe=ImageFont.truetype(SS+'SourceSerif4-Regular.otf',S*24)
    pey=ey+len(elines)*elh+int(S*14)
    if layout=='rule':
        draw.text((int(W*.115)+int(W*.035),pey),f'— {poet_en}',font=fpe,fill=lerp(eink,acc,.5),anchor='lm')
    else:
        draw.text((W//2,pey),f'— {poet_en}',font=fpe,fill=lerp(eink,acc,.5),anchor='mm')

    # ---------- wordmark + footer ----------
    fw=ImageFont.truetype(FZ+'Vazirmatn-SemiBold.ttf',S*46)
    fe=ImageFont.truetype(SS+'SourceSerif4-Light.otf',S*25)
    if layout=='sky':
        fa(draw,(W//2,int(H*.845)-S*3),'همدم',fw,INK_D if not dark else INK_D)
    elif layout=='nocturne':
        fa(draw,(W//2,int(H*.865)),'همدم',fw,acc)
    elif layout=='panel':
        fa(draw,(W//2,int(H*.845)),'همدم',fw,acc)
    else:
        fa(draw,(int(W*.885),int(H*.845)),'همدم',fw,acc,anchor='rm')
    foot=lerp(ink,CREAM if dark else SOFT,.45)
    fx = W//2 if layout!='rule' else int(W*.115)+int(W*.035)
    anc = 'mm' if layout!='rule' else 'lm'
    draw.text((fx,int(H*.930)),'Hamdam  ·  a daily verse, a quiet moment',font=fe,fill=foot,anchor=anc)
    draw.text((fx,int(H*.960)),'hamdam.com.au',font=fe,fill=lerp(foot,acc,.35),anchor=anc)

    # ---------- grain ----------
    nz=Image.effect_noise((W,H),14).convert('L')
    img=Image.blend(img,Image.merge('RGB',(nz,nz,nz)),.032)
    img=img.resize((1080,1350),Image.LANCZOS)
    img.save(out,'JPEG',quality=92,optimize=True)

    # ---------- automated render gate ----------
    checks={}
    checks['size_ok']       = img.size==(1080,1350)
    checks['fa_fits']       = max(draw.textlength(l,font=fv,direction='rtl',language='fa')
                                  for l in lines) <= maxw
    checks['fa_not_floored']= size>26
    checks['en_fits']       = all(draw.textlength(l,font=fe_i)<=ew for l in elines)
    checks['en_lines_ok']   = 1<=len(elines)<=5
    checks['footer_inside'] = int(H*.960) < H-int(H*.02)
    checks['block_no_clash']= (ey - sy) > int(S*40)
    checks['bottom_clear']  = (pey + int(S*40)) < int(H*(.845 if layout!='nocturne' else .865))
    if layout=='panel':
        checks['panel_fits']= pey < int(H*.790)-int(S*20)
    checks['ALL_PASS']=all(checks.values())
    return out, checks


# ============ CAROUSEL ============
def _slide_base(palette, ornament=False, rule=False):
    P=PALETTES[palette]
    img=gradient(P['stops']); draw=ImageDraw.Draw(img)
    if P['stars']: starfield(img,draw,int(P['stars']*.45),1391); draw=ImageDraw.Draw(img)
    if ornament:
        shamseh(draw,W//2,int(H*.115),int(W*.030),int(W*.013),lerp(P['ink'],P['accent'],.5),S)
    if rule:
        draw.line([int(W*.5-W*.045),int(H*.135),int(W*.5+W*.045),int(H*.135)],
                  fill=lerp(P['accent'],P['ink'],.5),width=max(1,S//2))
    return img,draw,P

def _finish(img,out):
    nz=Image.effect_noise((W,H),14).convert('L')
    img=Image.blend(img,Image.merge('RGB',(nz,nz,nz)),.032)
    img=img.resize((1080,1350),Image.LANCZOS)
    img.save(out,'JPEG',quality=92,optimize=True)
    return out

def _footer(draw,P,accent_line=True):
    fe=ImageFont.truetype(SS+'SourceSerif4-Light.otf',S*25)
    foot=lerp(P['ink'],CREAM if P['dark'] else SOFT,.45)
    draw.text((W//2,int(H*.930)),'Hamdam  ·  a daily verse, a quiet moment',font=fe,fill=foot,anchor='mm')
    draw.text((W//2,int(H*.960)),'hamdam.com.au',font=fe,fill=lerp(foot,P['accent'],.35),anchor='mm')

def _wordmark(draw,P,y=.845):
    fw=ImageFont.truetype(FZ+'Vazirmatn-SemiBold.ttf',S*46)
    fa(draw,(W//2,int(H*y)),'همدم',fw,P['accent'])

def _fa_para(draw,text,P,y_centre,size=34,maxw=None,fill=None):
    """Wrap and draw a Farsi paragraph, RTL, centred."""
    maxw = maxw or W*.76
    f=ImageFont.truetype(FZ+'Vazirmatn-Light.ttf',S*size)
    words=text.split(); lines=[]; cur=''
    for w_ in words:
        t=(cur+' '+w_).strip()
        if draw.textlength(t,font=f,direction='rtl',language='fa')<=maxw: cur=t
        else:
            if cur: lines.append(cur)
            cur=w_
    if cur: lines.append(cur)
    lh=int(S*size*1.95)
    y0=int(y_centre-(len(lines)-1)*lh/2)
    for i,l in enumerate(lines): fa(draw,(W//2,y0+i*lh),l,f,fill or P['ink'])
    return len(lines), lh, y0

def _en_para(draw,text,P,y_centre,size=31,italic=True,maxw=None,fill=None):
    maxw = maxw or W*.72
    fnt=SS+('SourceSerif4-LightIt.otf' if italic else 'SourceSerif4-Light.otf')
    f=ImageFont.truetype(fnt,S*size)
    lines=wrap(draw,text,f,maxw)
    lh=int(S*size*1.62)
    y0=int(y_centre-(len(lines)-1)*lh/2)
    col=fill or lerp(P['ink'],CREAM if P['dark'] else SOFT,.22)
    for i,l in enumerate(lines): draw.text((W//2,y0+i*lh),l,font=f,fill=col,anchor='mm')
    return len(lines), lh, y0

def render_carousel(v, palette, layout, outdir, prefix='slide'):
    """v: dict with persian, english, poetFa, poetEn, reflectionFa, reflectionEn,
    questionFa, questionEn, source. Returns (paths, checks)."""
    paths=[]; checks={}
    # --- slide 1: the verse, full layout treatment, Persian hero ---
    p1=f"{outdir}/{prefix}-1.jpg"
    _,c1=render(v['persian'],v['poetFa'],v['english'],v['poetEn'],palette,layout,p1)
    paths.append(p1); checks['slide1']=c1['ALL_PASS']

    # --- slide 2: English translation, breathing room ---
    img,draw,P=_slide_base(palette,ornament=True)
    n,lh,y0=_en_para(draw,f'“{v["english"]}”',P,int(H*.44),size=36,italic=True,maxw=W*.74)
    fpe=ImageFont.truetype(SS+'SourceSerif4-Regular.otf',S*26)
    draw.text((W//2,y0+n*lh+int(S*30)),f'— {v["poetEn"]}',font=fpe,
              fill=lerp(P['accent'],P['ink'],.2),anchor='mm')
    fs=ImageFont.truetype(SS+'SourceSerif4-Light.otf',S*20)
    draw.text((W//2,y0+n*lh+int(S*80)),v.get('source',''),font=fs,
              fill=lerp(P['ink'],CREAM if P['dark'] else SOFT,.55),anchor='mm')
    _wordmark(draw,P); _footer(draw,P)
    paths.append(_finish(img,f"{outdir}/{prefix}-2.jpg")); checks['slide2']= n<=6

    # --- slide 3: Farsi reflection ---
    img,draw,P=_slide_base(palette,ornament=True)
    n,lh,y0=_fa_para(draw,v['reflectionFa'],P,int(H*.47),size=34)
    _wordmark(draw,P); _footer(draw,P)
    paths.append(_finish(img,f"{outdir}/{prefix}-3.jpg")); checks['slide3']= n<=8

    # --- slide 4: English reflection ---
    img,draw,P=_slide_base(palette,ornament=True)
    n,lh,y0=_en_para(draw,v['reflectionEn'],P,int(H*.47),size=32,italic=False)
    _wordmark(draw,P); _footer(draw,P)
    paths.append(_finish(img,f"{outdir}/{prefix}-4.jpg")); checks['slide4']= n<=9

    # --- slide 5: the quiet question ---
    img,draw,P=_slide_base(palette,ornament=True)
    n1,lh1,y1=_fa_para(draw,v['questionFa'],P,int(H*.44),size=40,fill=P['ink'])
    n2,lh2,y2=_en_para(draw,v['questionEn'],P,int(H*.565),size=32,italic=True)
    _wordmark(draw,P); _footer(draw,P)
    paths.append(_finish(img,f"{outdir}/{prefix}-5.jpg")); checks['slide5']= (n1<=3 and n2<=3)

    checks['count_ok']=len(paths)==5
    checks['ALL_PASS']=all(checks.values())
    return paths, checks
