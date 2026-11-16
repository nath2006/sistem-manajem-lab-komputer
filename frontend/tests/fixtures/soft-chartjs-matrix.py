"""Execute via browser_exec with ROLE supplied. UI-only synthetic counts."""
from pathlib import Path
import time,json,urllib.parse
from browser_harness.helpers import cdp, goto_url, js
ROLE = globals().get('ROLE', 'Admin')
ROOT=Path('C:/Users/LOQ/Documents/projectan-coding/sistem-informasi-manajemen-lab-komputer')
OUT=Path('C:/Users/LOQ/AppData/Local/hermes/cache/scratch/soft-chartjs-evidence');OUT.mkdir(exist_ok=True)
probe=(ROOT/'frontend/tests/fixtures/soft-chartjs-probe.js').read_text()
records=[]
for width in [320,360,768,1280]:
 cdp('Emulation.setDeviceMetricsOverride',width=width,height=1000,deviceScaleFactor=1,mobile=False)
 cdp('Emulation.setTouchEmulationEnabled',enabled=True,maxTouchPoints=1)
 goto_url('http://127.0.0.1:5207/tests/fixtures/dashboard.html?role='+urllib.parse.quote(ROLE));cdp('Page.bringToFront')
 for _ in range(80):
  if js("!!window.setDashboardTheme&&window.dashboardChartInstances?.().length>0"):break
  time.sleep(.15)
 time.sleep(.7)
 previous=None;ids=None
 for theme in ['#2563eb','#15803d','#ff0000','#ffff00','#f8fafc','#000000','#07152e']:
  js('window.setDashboardTheme('+json.dumps(theme)+')');time.sleep(.45)
  row=js(probe)
  assert isinstance(row, dict)
  assert row['width']==width and row['primary']==theme and row['coarse']
  assert len(row['charts'])==(1 if ROLE=='Guru' else 3)
  assert all(c['ink']>0 and c['width']>0 and c['height'] in [240,260] for c in row['charts'])
  if ROLE=='Admin':
   a=row['alignment'];assert abs(a['insights']['left']-a['details']['left'])<=1 and abs(a['insights']['right']-a['details']['right'])<=1
   assert abs(a['insights']['left']-a['statistics']['left'])<=1 and abs(a['insights']['right']-a['statistics']['right'])<=1
  row.update(role=ROLE,theme=theme)
  row['idsStable']=ids is None or ids==[c['id'] for c in row['charts']]
  row['colorChanged']=previous is None or previous!=row['charts'][0]['fill']
  records.append(row);(OUT/(ROLE.replace(' ','-')+'.json')).write_text(json.dumps(records,indent=2))
  ids=[c['id'] for c in row['charts']];previous=row['charts'][0]['fill']
print(ROLE,len(records),'blank',sum(any(c['ink']==0 for c in r['charts']) for r in records),'overflow',sum(r['documentWidth']>r['clientWidth'] for r in records),'textFail',sum(bool(r['textFailures']) for r in records),'changedFail',sum(not r['colorChanged'] or not r['idsStable'] for r in records))
