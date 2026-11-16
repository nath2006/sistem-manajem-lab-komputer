(() => {
 const rgb=c=>c.startsWith('#')?c.slice(1).match(/../g).map(x=>parseInt(x,16)):(c.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
 const lum=c=>rgb(c).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 const contrast=(a,b)=>{a=lum(a);b=lum(b);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
 const charts=window.dashboardChartInstances().map(c=>{
  const pixels=c.ctx.getImageData(0,0,c.canvas.width,c.canvas.height).data;let ink=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0)ink++;
  const dataset=c.data.datasets[0];const geometry=c.getDatasetMeta(0).data.map(e=>e.getProps(['x','y','width','height','outerRadius','startAngle','endAngle'],true));
  return {id:c.id,type:c.config.type,width:c.width,height:c.height,labels:c.data.labels,values:dataset.data,fill:dataset.backgroundColor,outline:dataset.borderColor,borderWidth:dataset.borderWidth,outlineContrast:dataset.borderColor.map(x=>contrast(x,'#ffffff')),ink,geometry,role:c.canvas.getAttribute('role'),aria:c.canvas.getAttribute('aria-label'),responsive:c.options.responsive,aspect:c.options.maintainAspectRatio,animation:c.options.animation};
 });
 const textFailures=[];
 for(const el of document.querySelectorAll('.dashboard-theme *')){
  if(![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))continue;
  const st=getComputedStyle(el),r=el.getBoundingClientRect();if(!r.width||!r.height||st.visibility==='hidden')continue;
  let bg=st.backgroundColor, p=el;while(bg==='rgba(0, 0, 0, 0)'&&p.parentElement){p=p.parentElement;bg=getComputedStyle(p).backgroundColor;}
  if(bg==='rgba(0, 0, 0, 0)')bg='rgb(255,255,255)';
  const ratio=contrast(st.color,bg);if(ratio<4.5)textFailures.push({text:el.textContent.trim().slice(0,60),color:st.color,bg,ratio});
 }
 const bounds=e=>{if(!e)return null;const r=e.getBoundingClientRect();return{left:r.left,right:r.right,width:r.width}};
 return {alignment:{insights:bounds(document.querySelector('.dashboard-insights')),details:bounds(document.querySelector('.dashboard-admin-details')),statistics:bounds(document.querySelector('[aria-label="Administrasi"]')),tablePanels:[...document.querySelectorAll('.dashboard-admin-details [role="region"]')].map(bounds)},width:innerWidth,coarse:matchMedia('(pointer: coarse)').matches,primary:getComputedStyle(document.querySelector('.dashboard-theme')).getPropertyValue('--dashboard-primary').trim(),documentWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,charts,textFailures,tables:[...document.querySelectorAll('.dashboard-theme table')].map(t=>({display:getComputedStyle(t).display,head:getComputedStyle(t.tHead).display,width:t.scrollWidth,parentWidth:t.parentElement.clientWidth}))};
})()