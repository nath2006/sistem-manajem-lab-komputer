"""Run via browser_exec: exec(Path(this_file).read_text()).
Requires the isolated dashboard-review --browser and dashboard-server fixtures.
Uses injected Browser Use helpers; saves every batch before screenshots.
"""
import json
import pathlib
import time
import urllib.parse
from browser_harness.helpers import cdp, goto_url, js

ROOT = pathlib.Path('C:/Users/LOQ/Documents/projectan-coding/sistem-informasi-manajemen-lab-komputer')
OUT = pathlib.Path('C:/Users/LOQ/AppData/Local/hermes/cache/scratch/letris-dashboard')
PROBE = (ROOT / 'frontend/tests/fixtures/dashboard-probe.js').read_text()
ROLES = ['Admin', 'Guru', 'Kepala Lab', 'Koordinator Lab', 'Teknisi']
THEMES = ['#ffff00', '#f8fafc', '#000000', '#07152e', '#ff0000', '#2563eb', '#15803d']

def run_dashboard_matrix(roles=ROLES):
    for role in roles:
        rows = []
        for width in [360, 768, 1280]:
            cdp('Emulation.setDeviceMetricsOverride', width=width, height=900, deviceScaleFactor=1, mobile=False)
            cdp('Emulation.setTouchEmulationEnabled', enabled=True, maxTouchPoints=1)
            goto_url('http://127.0.0.1:5199/tests/fixtures/dashboard.html?role=' + urllib.parse.quote(role))
            cdp('Page.bringToFront')
            for _ in range(100):
                if js("!!document.querySelector('.dashboard-chart') && !!window.setDashboardTheme"):
                    break
                time.sleep(.2)
            else:
                raise AssertionError('Dashboard did not load: ' + role)
            # Allow responsive shell animations to settle before geometry checks.
            time.sleep(1)
            for theme in THEMES:
                js('window.setDashboardTheme(' + json.dumps(theme) + ')')
                time.sleep(1)
                result = js(PROBE)
                assert isinstance(result, dict)
                assert result['ready'] and result['width'] == width and result['coarse']
                assert result['primary'] == theme
                result.update(role=role, theme=theme, requestedWidth=width)
                rows.append(result)
                (OUT / ('stable-' + role.replace(' ', '-') + '.json')).write_text(json.dumps(rows, indent=2))
        print(role, len(rows), 'text-failing cases', sum(bool(r['textFailures']) for r in rows), 'graph-failing cases', sum(bool(r['graphFailures']) for r in rows), 'overflow', sum(r['documentWidth'] > r['clientWidth'] for r in rows))

if __name__ == '__main__':
    run_dashboard_matrix()
