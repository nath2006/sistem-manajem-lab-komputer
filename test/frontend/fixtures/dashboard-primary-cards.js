// Browser regression: all metric surfaces match the configured primary.
(() => {
 const root = document.querySelector('.dashboard-theme');
 const color = value => { const el=document.createElement('i');el.style.color=value;document.body.append(el);const result=getComputedStyle(el).color;el.remove();return result; };
 const primary=color(getComputedStyle(root).getPropertyValue('--dashboard-primary').trim());
 const foreground=color(getComputedStyle(root).getPropertyValue('--dashboard-on-primary').trim());
 const cards=[...root.querySelectorAll('.dashboard-summary,.dashboard-stat-card,[data-tone]')].map(el=>{
  const style=getComputedStyle(el), icon=el.querySelector('svg'), iconStyle=icon&&getComputedStyle(icon);
  const descendants=[...el.querySelectorAll('span,strong,h1,p,svg')];
  return {label:el.textContent.trim(),background:style.backgroundColor,image:style.backgroundImage,color:style.color,primary,foreground,
   pass:style.backgroundColor===primary&&style.backgroundImage==='none'&&style.color===foreground&&descendants.every(node=>getComputedStyle(node).color===foreground)&&(!iconStyle||iconStyle.backgroundColor==='rgba(0, 0, 0, 0)'),
   iconBackground:iconStyle?.backgroundColor};
 });
 return {cards,pass:cards.length>0&&cards.every(card=>card.pass)};
})()
