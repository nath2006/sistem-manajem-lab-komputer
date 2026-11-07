# Browser-harness regression runner: execute in browser_exec globals.
# No backend, credentials or real authenticated data. Requires local Vite :5188.
# Call run_matrix(0, 10), ..., run_matrix(30, 40), then run_lifecycle().
import json, pathlib
from typing import TYPE_CHECKING, Any
if TYPE_CHECKING:
    cdp: Any
    click_at_xy: Any
    goto_url: Any
    wait_for_load: Any

def qa_eval(expression):
    r=cdp('Runtime.evaluate', expression=expression, returnByValue=True, awaitPromise=True)
    if 'exceptionDetails' in r: raise RuntimeError(str(r))
    return r.get('result',{}).get('value')

def qa_wait():
    cdp('Page.bringToFront')
    qa_eval('new Promise(resolve=>setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))),180))')

def qa_click(selector):
    rect=qa_eval('(()=>{const e=document.querySelector('+json.dumps(selector)+'); if(!e)throw Error("Missing control"); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}})()')
    click_at_xy(rect['x'],rect['y'])
    qa_wait()

def qa_snapshot():
    return qa_eval('''(()=>{const p=document.querySelector('.driver-popover'); const a=document.querySelector('.driver-active-element'); const r=a?.getBoundingClientRect(); const pr=p?.getBoundingClientRect(); return {progress:document.querySelector('.driver-popover-progress-text')?.textContent,title:document.querySelector('.driver-popover-title')?.textContent,target:a?.getAttribute('data-tour-path')||a?.getAttribute('data-tour'),visible:!!a&&!a.closest('[inert],[aria-hidden="true"]')&&r.width>0&&r.height>0&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,popoverInView:!!p&&pr.left>=0&&pr.right<=innerWidth&&pr.top>=0&&pr.bottom<=innerHeight,popovers:document.querySelectorAll('.driver-popover').length,overlays:document.querySelectorAll('.driver-overlay').length,overflow:document.body.style.overflow,focus:p?.contains(document.activeElement),injectedImages:p?.querySelectorAll('img').length,docOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,errors:window.fixtureErrors,storage:Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.startsWith('lab:onboarding'))),sidebarOpen:document.querySelector('aside')?.getAttribute('aria-hidden')==='false',shellSame:window.qaShell===document.querySelector('main'),boot:window.fixtureBoot,scrollY:scrollY};})()''')

def run_matrix(start=0, end=40):
    import urllib.parse, os
    result_path=pathlib.Path(os.environ['BH_AGENT_WORKSPACE'])/'matrix.json'
    results=json.loads(result_path.read_text()) if result_path.exists() else []
    roles=['Admin','Guru','Kepala Lab','Koordinator Lab','Teknisi']
    viewports=[(320,640),(390,844),(768,1024),(1440,900)]
    colors=['#2563eb','#16a34a']
    cases=[(r,v,c) for c in colors for v in viewports for r in roles]
    planned={(r,tuple(v),c) for r,v,c in cases[start:end]}
    results=[entry for entry in results if (entry['role'],tuple(entry['viewport']),entry['theme']) not in planned]
    def check(condition, message):
        if not condition: raise AssertionError(message)
    def active_check(s):
        for key in ['visible','popoverInView','focus','shellSame']:
            check(s[key],str(s))
        check(s['popovers']==1 and s['overlays']==1 and not s['errors'] and not s['docOverflow'] and s['injectedImages']==0,str(s))
        check(s['overflow']=='hidden',str(s))
    for role,(width,height),color in cases[start:end]:
        cdp('Emulation.setDeviceMetricsOverride',width=width,height=height,deviceScaleFactor=1,mobile=width<1024)
        cdp('Emulation.setTouchEmulationEnabled',enabled=width<1024)
        qa_eval('localStorage.clear()')
        url='http://127.0.0.1:5188/tests/fixtures/onboarding.html?'+urllib.parse.urlencode({'role':role,'color':color})
        goto_url(url);wait_for_load();qa_wait()
        qa_eval('void(window.qaShell=document.querySelector("main"))')
        initial=qa_snapshot();active_check(initial)
        check(not initial['storage'],str(initial))
        coarse=qa_eval('matchMedia("(pointer: coarse)").matches')
        check(coarse==(width<1024), 'Pointer emulation mismatch')
        boot=initial['boot']
        qa_click('.driver-popover-next-btn');s=qa_snapshot();active_check(s)
        check(s['sidebarOpen'] and s['target'].startswith('/'),str(s))
        sidebar_step=s['target']
        qa_click('.driver-popover-prev-btn');s=qa_snapshot();active_check(s)
        check(s['target']=='content' and s['progress'].startswith('1 /'),str(s))
        steps=[]
        while True:
            s=qa_snapshot();active_check(s);steps.append(s['target'])
            if s['target']=='profile':break
            qa_click('.driver-popover-next-btn')
        style=qa_eval('(()=>{const b=document.querySelector(".driver-popover-next-btn"); const c=getComputedStyle(b);return {background:c.backgroundColor,color:c.color,width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height,controls:[...document.querySelectorAll(".driver-popover button")].map(e=>({height:e.getBoundingClientRect().height,width:e.getBoundingClientRect().width}))};})()')
        check(all(b['height']>=44 and b['width']>=44 for b in style['controls']),str(style))
        qa_click('.driver-popover-next-btn');done=qa_snapshot()
        check(done['popovers']==0 and done['overlays']==0 and done['overflow']=='' and done['shellSame'] and list(done['storage'].values())==['done'],str(done))
        check(done['sidebarOpen']==(width>=1024) and done['boot']==boot,str(done))
        qa_click('#user-menu-button');qa_click('[role="menuitem"]');replay=qa_snapshot();active_check(replay)
        check(replay['target']=='content',str(replay))
        qa_click('.lab-tour-skip');skip=qa_snapshot()
        check(skip['popovers']==0 and list(skip['storage'].values())==['skip'] and skip['overflow']=='',str(skip))
        qa_click('#user-menu-button');qa_click('[role="menuitem"]')
        cdp('Input.dispatchKeyEvent',type='keyDown',key='Escape',code='Escape',windowsVirtualKeyCode=27)
        cdp('Input.dispatchKeyEvent',type='keyUp',key='Escape',code='Escape',windowsVirtualKeyCode=27)
        qa_wait();escape=qa_snapshot()
        check(escape['popovers']==0 and escape['overlays']==0 and escape['storage']==skip['storage'] and escape['shellSame'] and escape['boot']==boot,str(escape))
        results.append({'role':role,'viewport':[width,height],'theme':color,'coarsePointer':coarse,'steps':steps,'sidebarTarget':sidebar_step,'controls':style,'nextBackDoneReplaySkipEscape':True,'shellStable':True,'noInjectedHTML':True,'cleanup':True,'noHorizontalOverflow':True,'errors':escape['errors']})
        result_path.write_text(json.dumps(results,indent=2))
        print('PASS',len(results),role,width,color)
    print('persisted',len(results))

def run_lifecycle():
    import os
    checks=[]
    def verify(name, condition, detail=None):
        if not condition:raise AssertionError((name,detail))
        checks.append({'name':name,'passed':True,'detail':detail})
    def keypress(key,code=None,shift=False):
        cdp('Input.dispatchKeyEvent',type='keyDown',key=key,code=code or key,text='\r' if key=='Enter' else '',windowsVirtualKeyCode={'Escape':27,'Tab':9,'Enter':13}.get(key,0),modifiers=8 if shift else 0)
        cdp('Input.dispatchKeyEvent',type='keyUp',key=key,code=code or key,windowsVirtualKeyCode={'Escape':27,'Tab':9,'Enter':13}.get(key,0),modifiers=8 if shift else 0)
        qa_wait()
    def replay():
        qa_click('#user-menu-button');qa_click('[role="menuitem"]')
    cdp('Emulation.setDeviceMetricsOverride',width=390,height=844,deviceScaleFactor=1,mobile=True)
    cdp('Emulation.setTouchEmulationEnabled',enabled=True)
    qa_eval('localStorage.clear()')
    goto_url('http://127.0.0.1:5188/tests/fixtures/onboarding.html?role=Admin');wait_for_load();qa_wait()
    qa_eval('void(window.qaShell=document.querySelector("main"))')
    qa_click('.lab-tour-skip');qa_eval('window.scrollTo(0,240)');qa_wait()
    qa_click('[aria-controls="logo-sidebar"]');qa_eval('document.querySelector("[data-tour-scroll]").scrollTop=180');qa_wait()
    replay();qa_click('.driver-popover-next-btn');qa_click('.lab-tour-skip')
    s=qa_snapshot();top=qa_eval('document.querySelector("[data-tour-scroll]").scrollTop')
    verify('previously open mobile drawer, scroll lock and both scroll positions restored after Skip',s['sidebarOpen'] and s['overflow']=='hidden' and s['scrollY']==240 and top==180,{'state':s,'sidebarScroll':top})
    replay();qa_click('.driver-popover-next-btn');keypress('Escape')
    s=qa_snapshot();verify('Escape preserves open drawer ownership and restores scroll',s['sidebarOpen'] and s['overflow']=='hidden' and s['scrollY']==240 and s['popovers']==0,s)
    qa_click('[aria-label="Tutup navigasi"]');verify('closing restored drawer releases final body lock',qa_snapshot()['overflow']=='')
    # On a fresh account Escape and effect cleanup must not create completion records.
    qa_eval('localStorage.clear();window.fixtureAccount({userId:"escape-user"})');qa_wait()
    keypress('Escape');s=qa_snapshot();verify('fresh account Escape does not persist completion',not s['storage'] and s['popovers']==0 and s['overlays']==0,s)
    replay();qa_click('.driver-popover-next-btn')
    qa_eval('window.fixtureAccount({isLoading:true})');qa_wait();s=qa_snapshot()
    verify('auth loading/account cleanup removes portal and never marks completion',not s['storage'] and s['popovers']==0 and s['overlays']==0 and s['overflow']=='' and s['shellSame'],s)
    qa_eval('window.fixtureAccount({isLoading:false,userId:"next-user",role:"Teknisi"})');qa_wait();s=qa_snapshot()
    verify('new identity gets exactly one fresh tour without remounting shell',s['popovers']==1 and s['target']=='content' and s['shellSame'] and not s['storage'],s)
    # Focus trap in both directions, Escape focus restore, and explicit Done with keyboard.
    qa_eval('document.querySelector(".driver-popover-next-btn").focus()');keypress('Tab')
    verify('Tab wraps exactly to first control without double trapping',qa_eval('document.activeElement===document.querySelector(".driver-popover button")'))
    keypress('Tab',shift=True)
    verify('Shift Tab wraps exactly to final control',qa_eval('document.activeElement===document.querySelector(".driver-popover-next-btn")'))
    for i in range(12):keypress('Tab')
    verify('Tab stays within tour controls',qa_snapshot()['focus'])
    for i in range(12):keypress('Tab',shift=True)
    verify('Shift Tab stays within tour controls',qa_snapshot()['focus'])
    keypress('Escape');verify('Escape returns focus to connected profile trigger',qa_eval('document.activeElement===document.querySelector("#user-menu-button")'))
    replay()
    while qa_snapshot().get('target')!='profile':qa_click('.driver-popover-next-btn')
    qa_eval('document.querySelector(".driver-popover-next-btn").focus()');keypress('Enter')
    s=qa_snapshot();verify('keyboard Enter on Done persists only explicit completion',list(s['storage'].values())==['done'] and s['popovers']==0,s)
    # Completed identity gating survives remount; no reload needed.
    qa_eval('window.fixtureAccount({isLoading:true})');qa_wait()
    qa_eval('window.fixtureAccount({isLoading:false})');qa_wait()
    verify('completed identity does not auto-start after remount',qa_snapshot()['popovers']==0)
    replay();qa_click('.driver-popover-next-btn');before=qa_snapshot()['storage']
    qa_eval('window.fixtureAccount({userId:"third-user",role:"Guru"})');qa_wait();s=qa_snapshot()
    verify('live account and role switch replaces tour without completing old/new identity',s['storage']==before and s['popovers']==1 and s['target']=='content' and s['shellSame'],s)
    qa_click('.driver-popover-next-btn');qa_eval('window.fixtureUnmount()');qa_wait();s=qa_snapshot()
    verify('unmount destroys portal/overlay and releases body lock without completion',s['popovers']==0 and s['overlays']==0 and s['overflow']=='' and s['storage']==before and not s['errors'],s)
    # Reduced motion and actual pointer hover for both non-red school colors.
    for color,expected in [('#2563eb','rgb(37, 99, 235)'),('#16a34a','rgb(22, 163, 74)')]:
        cdp('Emulation.setDeviceMetricsOverride',width=1440,height=900,deviceScaleFactor=1,mobile=False)
        cdp('Emulation.setTouchEmulationEnabled',enabled=False)
        cdp('Emulation.setEmulatedMedia',features=[{'name':'prefers-reduced-motion','value':'reduce'}])
        qa_eval('localStorage.clear()')
        goto_url('http://127.0.0.1:5188/tests/fixtures/onboarding.html?color='+color.replace('#','%23'));wait_for_load();qa_wait()
        r=qa_eval('(()=>{const b=document.querySelector(".driver-popover-next-btn"),r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,background:getComputedStyle(b).backgroundColor,reduced:matchMedia("(prefers-reduced-motion:reduce)").matches,animation:getComputedStyle(document.querySelector(".driver-overlay")).animationName}})()')
        verify('configured '+color+' primary and reduced motion',r['background']==expected and r['reduced'] and r['animation']=='none',r)
        cdp('Input.dispatchMouseEvent',type='mouseMoved',x=r['x'],y=r['y']);qa_wait()
        hover=qa_eval('getComputedStyle(document.querySelector(".driver-popover-next-btn")).backgroundColor')
        # Assert the actual 90% brand / 10% white mix, not merely any RGB color.
        import re
        channels=[int(color[i:i+2],16)/255 for i in (1,3,5)]
        expected_hover=[channel*.9+.1 for channel in channels]
        actual=[float(value) for value in re.findall(r'[0-9.]+',hover)]
        if hover.startswith('rgb'):actual=[value/255 for value in actual[:3]]
        verify('real pointer hover stays in '+color+' color family',len(actual)>=3 and all(abs(a-b)<.005 for a,b in zip(actual[:3],expected_hover)),{'base':expected,'hover':hover,'expectedSRGB':expected_hover})
        qa_click('.lab-tour-skip')
    path=pathlib.Path(os.environ['BH_AGENT_WORKSPACE'])/'lifecycle.json';path.write_text(json.dumps(checks,indent=2))
    print('PASS lifecycle checks',len(checks));print(json.dumps(checks,indent=2))
