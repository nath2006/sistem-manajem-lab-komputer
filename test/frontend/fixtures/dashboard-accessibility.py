"""Browser regressions; inject cdp/goto_url/js pinned to an owned CDP context.
Execute after dashboard-browser.py (without its __main__ block). No source DB writes.
"""

import json
import time
import urllib.parse
from pathlib import Path
from typing import Any, Callable

# Bound by the caller to its owned target; no shared active-tab helpers.
js: Callable[[str], Any]
goto_url: Callable[[str], Any]
cdp: Callable[..., Any]
PROBE = (Path('C:/Users/LOQ/Documents/projectan-coding/sistem-informasi-manajemen-lab-komputer/test/frontend/fixtures/dashboard-probe.js')).read_text()


def assert_footer_contrast(role='Guru'):
    goto_url('http://127.0.0.1:5199/test/frontend/fixtures/dashboard.html?role=' + urllib.parse.quote(role))
    for _ in range(100):
        if js("!!document.querySelector('.dashboard-chart') && !!window.setDashboardTheme"):
            break
        time.sleep(.2)
    time.sleep(1)
    js("window.setDashboardTheme('#ffff00')")
    time.sleep(1)
    assert js("document.querySelectorAll('.dashboard-theme footer p').length") == 2, 'Actual shared Footer must be mounted'
    result = js(PROBE)
    failures = [row for row in result['textFailures'] if 'Copyright' in row['label'] or 'Versi' in row['label']]
    assert not failures, 'Mounted Footer ordinary text must reach 4.5:1: ' + json.dumps(failures)
    return result


def assert_teknisi_contrast():
    result = assert_footer_contrast('Teknisi')
    assert js("[...document.querySelectorAll('.dashboard-theme p')].filter(e=>e.textContent.startsWith('Total Pengecekan')||e.textContent.startsWith('Total Riwayat')).length") == 2, 'Both real Teknisi statistics must be mounted'
    failures = [row for row in result['textFailures'] if 'TOTAL ' in row['label'].upper()]
    assert not failures, 'Mounted Teknisi statistic labels must reach 4.5:1: ' + json.dumps(failures)
    return result
