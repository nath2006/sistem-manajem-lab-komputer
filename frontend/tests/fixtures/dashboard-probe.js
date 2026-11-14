(() => {
 const root=document.querySelector('.dashboard-theme');if(!root||!root.querySelector('.dashboard-chart'))return {ready:false};
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d',{willReadFrequently:true});
 const color=value=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=value;ctx.fillRect(0,0,1,1);return Array.from(ctx.getImageData(0,0,1,1).data).map((v,i)=>i===3?v/255:v);};
 const composite=(f,b)=>[0,1,2].map(i=>f[i]*f[3]+b[i]*(1-f[3])).concat(1);
 const background=e=>{const ancestors=[];for(let p=e;p;p=p.parentElement)ancestors.unshift(p);return ancestors.reduce((bg,p)=>composite(color(getComputedStyle(p).backgroundColor),bg),[255,255,255,1]);};
 const luminance=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
 const text=[],failures=[],bounds=[];
 for(const el of root.querySelectorAll('*')){
  const r=el.getBoundingClientRect(),s=getComputedStyle(el);
  if(!r.width||!r.height||s.visibility==='hidden'||s.display==='none'||el.closest('.sr-only'))continue;
  const direct=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join('').trim();
  if(direct){const bg=background(el),fg=composite(color(s.color),bg),ratio=contrast(fg,bg),large=parseFloat(s.fontSize)>=24||(parseFloat(s.fontSize)>=18.66&&parseFloat(s.fontWeight)>=700),minimum=large?3:4.5;const entry={label:direct.slice(0,90),ratio,minimum,fg,bg,tag:el.tagName,classes:el.className};text.push(entry);if(ratio+.001<minimum)failures.push(entry);}
  if(el.matches('.dashboard-chart,.dashboard-summary,.dashboard-bar-label')&&(r.left<-.5||r.right>document.documentElement.clientWidth+.5||el.scrollWidth>el.clientWidth+1))bounds.push({classes:el.className,left:r.left,right:r.right,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth});
 }
 const graphs=[...root.querySelectorAll('.dashboard-bar-fill')].map(el=>{const bg=background(el),fill=color(getComputedStyle(el).fill);return {ratio:contrast(fill,bg),fill,bg};});
 return {ready:true,width:innerWidth,coarse:matchMedia('(pointer: coarse)').matches,primary:getComputedStyle(root).getPropertyValue('--dashboard-primary').trim(),charts:root.querySelectorAll('.dashboard-chart').length,documentWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,textCount:text.length,minText:Math.min(...text.map(x=>x.ratio)),minGraph:Math.min(...graphs.map(x=>x.ratio)),textFailures:failures,graphFailures:graphs.filter(x=>x.ratio<3),boundsFailures:bounds,tables:[...root.querySelectorAll('table')].map(t=>({display:getComputedStyle(t).display,head:getComputedStyle(t.querySelector('thead')).display})),summary:[...root.querySelectorAll('.dashboard-summary')].map(x=>x.innerText)};
})()
