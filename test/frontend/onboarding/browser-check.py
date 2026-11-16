# Execute inside browser_exec after starting browser-server.mjs from repo root
# Supply OUTPUT as an absolute JSON path for persistent evidence
import json
import pathlib
import time
import urllib.parse
cdp = globals()['cdp']
js = globals()['js']
goto_url = globals()['goto_url']
wait_for_load = globals()['wait_for_load']
OUTPUT = globals()['OUTPUT']

results = []
for width in [360, 1280]:
    cdp('Emulation.setDeviceMetricsOverride', width=width, height=800,
        deviceScaleFactor=1, mobile=width < 1024)
    for role in ['Admin', 'Guru', 'Kepala Lab', 'Koordinator Lab', 'Teknisi']:
        js('sessionStorage.removeItem("fixtureSeen");localStorage.clear()')
        goto_url('http://127.0.0.1:5197/?role=' + urllib.parse.quote(role))
        wait_for_load()
        cdp('Page.bringToFront')
        time.sleep(.6)
        steps = []
        for _ in range(40):
            state = js('''(()=>{const p=document.querySelector('.driver-popover'),e=document.querySelector('.driver-active-element');return {qa:window.qa,title:p?.querySelector('.driver-popover-title')?.textContent,target:e?.dataset.tourPath||e?.dataset.tour,focus:!!document.activeElement?.closest('.driver-popover'),scroll:document.querySelector('[data-tour-scroll]')?.scrollTop}})()''')
            assert state.get('title') and state['focus'] and not state['qa']['errors'], (role, width, state)
            steps.append(state)
            js("document.querySelector('.driver-popover-next-btn').click()")
            time.sleep(.3)
            if state['target'] == 'profile':
                break
        assert steps[-1]['target'] == 'profile', steps
        end = js("({qa:window.qa,popovers:document.querySelectorAll('.driver-popover').length,overflow:document.body.style.overflow})")
        assert end['qa']['claim'] == 1 and end['popovers'] == 0 and end['overflow'] == '', end
        goto_url('http://127.0.0.1:5197/?role=' + urllib.parse.quote(role))
        wait_for_load()
        cdp('Page.bringToFront')
        time.sleep(.4)
        assert js("window.qa.claim===0&&!document.querySelector('.driver-popover')"), 'Reload auto replay'
        js("document.querySelector('#user-menu-button').click()")
        time.sleep(.1)
        js("document.querySelector('[role=menuitem]').click()")
        time.sleep(.4)
        assert js("!!document.querySelector('.driver-popover')&&window.qa.claim===0"), 'Manual replay missing'
        js("document.querySelector('.lab-tour-skip').click()")
        time.sleep(.1)
        results.append({'role': role, 'width': width, 'steps': steps, 'end': end, 'reloadAndManual': True})
        pathlib.Path(OUTPUT).write_text(json.dumps(results, indent=2), encoding='utf-8')
        print('PASS', role, width, len(steps))
