"""Additional computed browser checks. Execute with dashboard-accessibility.py globals."""

import json
import time
import urllib.parse
from pathlib import Path
from typing import Any, Callable

cdp: Callable[..., Any]
js: Callable[[str], Any]
goto_url: Callable[[str], Any]
ROLES: list[str]
THEMES: list[str]
PROBE: str
OUT: Path


def run_hover_and_narrow(roles=None):
    roles = ROLES if roles is None else roles
    for role in roles:
        rows = []
        for width in [320, 360]:
            cdp('Emulation.setDeviceMetricsOverride', width=width, height=900, deviceScaleFactor=1, mobile=False)
            cdp('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=1)
            goto_url('http://127.0.0.1:5199/test/frontend/fixtures/dashboard.html?role=' + urllib.parse.quote(role))
            for _ in range(100):
                if js("!!document.querySelector('.dashboard-chart') && !!window.setDashboardTheme"):
                    break
                time.sleep(.2)
            time.sleep(1)
            for theme in THEMES:
                js('window.setDashboardTheme(' + json.dumps(theme) + ')')
                time.sleep(.6)
                normal = js(PROBE)
                assert normal['ready'] and normal['width'] == width and normal['coarse'], normal
                assert normal['primary'] == theme
                assert not normal['textFailures'] and not normal['graphFailures'] and not normal['boundsFailures'], normal
                assert normal['documentWidth'] <= normal['clientWidth'], normal
                buttons = js("[...document.querySelectorAll('.dashboard-theme button,.dashboard-theme a')].filter(e=>e.offsetWidth&&e.offsetHeight).map((e,i)=>{e.dataset.contrastProbe=i;return {index:i,label:e.innerText}})")
                hovers = []
                for button in buttons:
                    point = js("(()=>{const e=document.querySelector('[data-contrast-probe=\"" + str(button['index']) + "\"]');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()")
                    cdp('Input.dispatchMouseEvent', type='mouseMoved', x=point['x'], y=point['y'])
                    time.sleep(.4)
                    hovered = js("document.querySelector('[data-contrast-probe=\"" + str(button['index']) + "\"]').matches(':hover')")
                    assert hovered, button
                    result = js(PROBE)
                    assert not result['textFailures'] and not result['graphFailures'], result
                    hovers.append(dict(button, minText=result['minText'], minGraph=result['minGraph'], hovered=hovered))
                row = dict(normal, role=role, theme=theme, requestedWidth=width, hovers=hovers)
                rows.append(row)
                (OUT / ('final-step7-hover-' + role.replace(' ', '-') + '.json')).write_text(json.dumps(rows, indent=2))
        print(role, len(rows), 'narrow/hover theme cases', sum(len(r['hovers']) for r in rows), 'real mouse hovers')
