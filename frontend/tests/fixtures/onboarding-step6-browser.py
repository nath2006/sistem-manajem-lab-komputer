# Synthetic browser regression: run inside browser_exec globals.
# Set STEP6_REPO and STEP6_EVIDENCE to absolute paths before exec.
# Actual providers, persistent shell and Driver.js; NOT production login UAT.
import json, pathlib, urllib.parse, re, time
from typing import TYPE_CHECKING, Any
if TYPE_CHECKING:
    STEP6_REPO: str
    STEP6_EVIDENCE: str
    STEP6_SESSION: str
    qa_eval: Any
    qa_wait: Any
    qa_click: Any
    qa_snapshot: Any

_root = pathlib.Path(globals()['STEP6_REPO'])
_evidence = pathlib.Path(globals()['STEP6_EVIDENCE'])
_evidence.mkdir(parents=True, exist_ok=True)
_base = 'http://127.0.0.1:5196/tests/fixtures/onboarding-step6.html'
# Reuse the established focus/drawer/cleanup harness against the new fixture.
_helpers = (_root / 'frontend/tests/fixtures/onboarding-browser.py').read_text(encoding='utf-8')
_helpers = _helpers.replace("checks.append({'name':name,'passed':True,'detail':detail})", "checks.append({'name':name,'passed':True,'detail':detail}); print('PASS lifecycle', name); (_evidence/'lifecycle.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')")
exec(_helpers.replace('http://127.0.0.1:5188/tests/fixtures/onboarding.html', _base))

# Pin every CDP action to an owned context, not whichever tab is active.
_raw_cdp = globals()['cdp']
_session = globals()['STEP6_SESSION']
def cdp(method, **params):
    return _raw_cdp(method, session_id=_session, **params)

def goto_url(url):
    cdp('Page.navigate', url=url)

def wait_for_load():
    for _ in range(600):
        if qa_eval('document.readyState') == 'complete' and qa_eval('!!window.fixtureBoot'):
            return
        time.sleep(.05)
    raise TimeoutError('Synthetic fixture did not load')

def click_at_xy(x, y):
    cdp('Input.dispatchMouseEvent', type='mousePressed', x=x, y=y, button='left', clickCount=1)
    cdp('Input.dispatchMouseEvent', type='mouseReleased', x=x, y=y, button='left', clickCount=1)


def step6_reset():
    # Fixture-origin onboarding keys only; unrelated storage is deliberately retained.
    qa_eval('Object.keys(localStorage).filter(k=>k.startsWith("lab:onboarding:")).forEach(k=>localStorage.removeItem(k));localStorage.setItem("step6:unrelated","preserve");localStorage.setItem("lab:onboarding:v2:step6-fixture:Guru","done")')


def step6_check(condition, detail):
    if not condition:
        raise AssertionError(detail)


def step6_active():
    s = qa_snapshot()
    step6_check(all(s[k] for k in ['visible', 'popoverInView', 'focus', 'shellSame']), s)
    step6_check(s['popovers'] == 1 and s['overlays'] == 1 and not s['errors'] and not s['docOverflow'] and s['injectedImages'] == 0 and s['overflow'] == 'hidden', s)
    return s


def step6_contrast(foreground, background):
    def lum(value):
        rgb = [float(x)/255 for x in re.findall(r'[\d.]+', value)[:3]]
        channels = [v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in rgb]
        return sum(a*b for a,b in zip(channels, [.2126,.7152,.0722]))
    a,b = lum(foreground),lum(background)
    return (max(a,b)+.05)/(min(a,b)+.05)


def step6_matrix(start=0, end=60):
    roles = ['Admin', 'Guru', 'Kepala Lab', 'Koordinator Lab', 'Teknisi']
    cases = [(role, size, color) for color in ['#ffff00','#fafafa','#000020','#ff0000'] for size in [(360,800),(768,1024),(1280,900)] for role in roles]
    path = _evidence / 'matrix.json'
    results = json.loads(path.read_text()) if path.exists() else []
    for role,(width,height),color in cases[start:end]:
        cdp('Emulation.setDeviceMetricsOverride', width=width,height=height,deviceScaleFactor=1,mobile=width<1024)
        cdp('Emulation.setTouchEmulationEnabled',enabled=width<1024)
        cdp('Input.dispatchMouseEvent',type='mouseMoved',x=0,y=0)
        step6_reset()
        goto_url(_base+'?'+urllib.parse.urlencode({'role':role,'color':color}))
        wait_for_load();qa_wait()
        qa_eval('void(window.qaShell=document.querySelector("main"))')
        step6_check(qa_eval('innerWidth') == width, 'Wrong viewport')
        coarse = qa_eval('matchMedia("(pointer:coarse)").matches')
        step6_check(coarse == (width<1024), 'Wrong pointer mode')
        first = step6_active()
        boot = first['boot']
        qa_click('.driver-popover-next-btn');second=step6_active()
        step6_check(second['title']=='Aset IT Sekolah', second)
        qa_click('.driver-popover-prev-btn');step6_check(step6_active()['target']=='content','Back failed')
        steps=[]
        while True:
            s=step6_active()
            steps.append({'title':s['title'],'target':s['target'],'description':qa_eval('document.querySelector(".driver-popover-description").textContent')})
            if s['target']=='profile': break
            qa_click('.driver-popover-next-btn')
        step6_check(all(title in [s['title'] for s in steps] for title in ['Aset IT Sekolah','QR dan verifikasi aset','Bantuan (Ticketing)','Grafik dashboard']), steps)
        chart = next(s for s in steps if s['title']=='Grafik dashboard')
        expected = 'status tiket yang Anda laporkan' if role=='Guru' else 'kategori dan kondisi aset'
        step6_check(expected in chart['description'], chart)
        style=qa_eval('(()=>{const b=document.querySelector(".driver-popover-next-btn"),s=document.querySelector(".lab-tour-skip"),c=getComputedStyle(b);return {background:c.backgroundColor,foreground:c.color,skip:getComputedStyle(s).color,controls:[...document.querySelectorAll(".driver-popover button")].map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})),cssPrimary:getComputedStyle(document.documentElement).getPropertyValue("--color-maroon").trim()}})()')
        step6_check(style['cssPrimary']==color,style)
        contrast=step6_contrast(style['foreground'],style['background'])
        skip_contrast=step6_contrast(style['skip'],'rgb(255,255,255)')
        step6_check(contrast>=4.5 and skip_contrast>=4.5,style)
        step6_check(all(c['width']>=44 and c['height']>=44 for c in style['controls']),style)
        qa_click('.driver-popover-next-btn');done=qa_snapshot()
        key='lab:onboarding:v3:step6-fixture:'+urllib.parse.quote(role,safe='')
        step6_check(done['storage'].get(key)=='done' and done['popovers']==0 and done['overlays']==0 and done['overflow']=='' and done['shellSame'] and done['boot']==boot,done)
        qa_click('#user-menu-button');qa_click('[role="menuitem"]');step6_check(step6_active()['target']=='content','Replay failed')
        qa_click('.lab-tour-skip');skipped=qa_snapshot()
        step6_check(skipped['storage'].get(key)=='skip' and skipped['popovers']==0 and skipped['overflow']=='',skipped)
        qa_click('#user-menu-button');qa_click('[role="menuitem"]')
        cdp('Input.dispatchKeyEvent',type='keyDown',key='Escape',code='Escape',windowsVirtualKeyCode=27)
        cdp('Input.dispatchKeyEvent',type='keyUp',key='Escape',code='Escape',windowsVirtualKeyCode=27)
        qa_wait();escaped=qa_snapshot()
        step6_check(escaped['storage']==skipped['storage'] and escaped['popovers']==0 and escaped['overlays']==0 and escaped['overflow']=='' and escaped['shellSame'] and not escaped['errors'],escaped)
        step6_check(qa_eval('localStorage.getItem("step6:unrelated")==="preserve" && localStorage.getItem("lab:onboarding:v2:step6-fixture:Guru")==="done"'),'Storage erased')
        result={'role':role,'viewport':[width,height],'theme':color,'steps':steps,'contrast':contrast,'skipContrast':skip_contrast,'coarsePointer':coarse,'nextBackDoneReplaySkipEscape':True,'shellStable':True,'storagePreserved':True,'cleanup':True,'errors':escaped['errors']}
        results=[r for r in results if (r['role'],r['viewport'],r['theme'])!=(role,[width,height],color)]
        results.append(result);path.write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
        print('PASS',role,width,color,'persisted',len(results))


def step6_absent():
    results=[]
    cdp('Emulation.setDeviceMetricsOverride',width=390,height=844,deviceScaleFactor=1,mobile=True)
    cdp('Emulation.setTouchEmulationEnabled',enabled=True)
    for mode in ['absent','hidden']:
        step6_reset()
        goto_url(_base+'?role=Guru&charts='+mode);wait_for_load();qa_wait()
        qa_eval('void(window.qaShell=document.querySelector("main"))')
        if mode=='hidden':
            # Restart after hiding an existing chart: target visibility, not mere presence.
            qa_click('.lab-tour-skip')
            qa_eval('document.querySelector("[data-tour=dashboard-charts]").style.display="none";localStorage.removeItem("lab:onboarding:v3:step6-fixture:Guru")')
            qa_click('#user-menu-button');qa_click('[role="menuitem"]')
        titles=[]
        s=step6_active()
        for _ in range(16):
            s=step6_active();titles.append(s['title'])
            if s['target']=='profile': break
            qa_click('.driver-popover-next-btn')
        step6_check(s['target']=='profile' and 'Grafik dashboard' not in titles and 'Bantuan (Ticketing)' in titles,titles)
        qa_click('.driver-popover-next-btn')
        s=qa_snapshot()
        key='lab:onboarding:v3:step6-fixture:Guru'
        step6_check(s['storage'].get(key)=='done' and s['popovers']==0 and s['overlays']==0 and s['overflow']=='' and not s['sidebarOpen'] and not s['errors'] and s['shellSame'],s)
        step6_check(qa_eval('document.activeElement===document.querySelector("#user-menu-button") && localStorage.getItem("step6:unrelated")==="preserve" && localStorage.getItem("lab:onboarding:v2:step6-fixture:Guru")==="done"'),'Focus or storage lost')
        # Reload proves persistence and completed-account gating for this exact v3 key.
        goto_url(_base+'?role=Guru&charts='+mode);wait_for_load();qa_wait()
        step6_check(qa_eval('localStorage.getItem("'+key+'") === "done" && !document.querySelector(".driver-popover,.driver-overlay")'),'Done did not persist')
        results.append({'mode':mode,'passed':True,'titles':titles,'exactKey':key,'donePersistedAfterReload':True,'cleanupDrawerFocus':True,'snapshot':s})
        (_evidence/'optional-target-current.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
    print('PASS absent and hidden optional chart: explicit v3 Done, reload, drawer/focus cleanup')


def step6_mandatory_missing():
    cdp('Emulation.setDeviceMetricsOverride',width=390,height=844,deviceScaleFactor=1,mobile=True)
    cdp('Emulation.setTouchEmulationEnabled',enabled=True)
    step6_reset()
    goto_url(_base+'?role=Guru');wait_for_load();qa_wait()
    qa_eval('void(window.qaShell=document.querySelector("main"))')
    first=step6_active()
    before=first['storage']
    qa_eval('document.querySelector(\'[data-tour-path="/aset-it"]\').remove()')
    qa_click('.driver-popover-next-btn')
    s=qa_snapshot()
    step6_check(s['storage']==before and 'lab:onboarding:v3:step6-fixture:Guru' not in s['storage'] and s['popovers']==0 and s['overlays']==0 and s['overflow']=='' and not s['sidebarOpen'] and s['shellSame'] and s['boot']==first['boot'] and not s['errors'],s)
    focus=qa_eval('document.activeElement===document.querySelector("#user-menu-button")')
    step6_check(focus,'Missing mandatory target did not restore focus')
    (_evidence/'mandatory-target-current.json').write_text(json.dumps({'passed':True,'noStoredCompletion':True,'drawerClosed':True,'focusRestored':focus,'snapshot':s},indent=2),encoding='utf-8')
    print('PASS missing mandatory target: no completion, drawer/portal/lock/focus cleanup')


def step6_hover():
    results = []
    cdp('Emulation.setDeviceMetricsOverride', width=1280, height=900, deviceScaleFactor=1, mobile=False)
    cdp('Emulation.setTouchEmulationEnabled', enabled=False)
    for color in ['#ff0000', '#16a34a', '#ffff00', '#fafafa', '#000020']:
        step6_reset()
        goto_url(_base+'?'+urllib.parse.urlencode({'role':'Guru','color':color}));wait_for_load();qa_wait()
        qa_eval('void(window.qaShell=document.querySelector("main"))')
        step6_active()
        styles=[]
        for selector in ['.lab-tour-skip', '.driver-popover-next-btn', '.driver-popover-prev-btn']:
            if selector.endswith('prev-btn'):
                qa_click('.driver-popover-next-btn')
            rect=qa_eval('(()=>{const r=document.querySelector('+json.dumps(selector)+').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()')
            cdp('Input.dispatchMouseEvent', type='mouseMoved', x=rect['x'], y=rect['y']);qa_wait()
            style=qa_eval('(()=>{const b=document.querySelector('+json.dumps(selector)+'),s=getComputedStyle(b),p=getComputedStyle(document.querySelector(".driver-popover")),r=b.getBoundingClientRect();const canvas=document.createElement("canvas"),ctx=canvas.getContext("2d");canvas.width=canvas.height=1;ctx.fillStyle=p.backgroundColor;ctx.fillRect(0,0,1,1);ctx.fillStyle=s.backgroundColor;ctx.fillRect(0,0,1,1);return {selector:'+json.dumps(selector)+',hovered:b.matches(":hover"),foreground:s.color,background:s.backgroundColor,composited:[...ctx.getImageData(0,0,1,1).data].slice(0,3),tooltip:p.backgroundColor,width:r.width,height:r.height,primary:getComputedStyle(document.documentElement).getPropertyValue("--color-maroon").trim()}})()')
            style['contrast']=step6_contrast(style['foreground'],'rgb('+','.join(map(str,style['composited']))+')')
            style['passed']=style['hovered'] and style['contrast']>=4.5 and style['width']>=44 and style['height']>=44 and style['primary']==color and style['tooltip']=='rgb(255, 255, 255)'
            styles.append(style)
        qa_eval('document.querySelector(".lab-tour-skip").focus()')
        cdp('Input.dispatchKeyEvent',type='keyDown',key='Tab',code='Tab',windowsVirtualKeyCode=9)
        cdp('Input.dispatchKeyEvent',type='keyUp',key='Tab',code='Tab',windowsVirtualKeyCode=9);qa_wait()
        focus=qa_eval('(()=>{const s=getComputedStyle(document.activeElement);return {inside:!!document.activeElement.closest(".driver-popover"),visible:document.activeElement.matches(":focus-visible"),outline:s.outlineStyle,width:s.outlineWidth}})()')
        step6_check(focus['inside'] and focus['visible'] and focus['outline']=='solid' and focus['width']=='2px',focus)
        qa_click('.lab-tour-skip')
        results.append({'theme':color,'styles':styles,'focus':focus,'passed':all(s['passed'] for s in styles)})
        (_evidence/'hover-pointer.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
    step6_check(all(r['passed'] for r in results),results)
    print('PASS actual-pointer hover contrast',len(results),'themes,',sum(len(r['styles']) for r in results),'controls')
