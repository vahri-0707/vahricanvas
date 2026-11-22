(() => {
  const companions=[
    {name:'Vahri',initial:'V',fill:'#65dda7',stroke:'#538977'},
    {name:'Nabila',initial:'N',fill:'#b59aff',stroke:'#9676bd'},
    {name:'Dreamer',initial:'D',fill:'#ff8a72',stroke:'#bf789a'},
    {name:'Explorer',initial:'E',fill:'#ffd23f',stroke:'#ad9141'},
    {name:'Pixel pal',initial:'P',fill:'#73caff',stroke:'#6b96c9'}
  ];
  const header=document.querySelector('.header-actions'),corner=document.querySelector('.visitor-corner');
  if(!header||!corner)return;
  const roster=document.createElement('div');roster.className='canvas-presence';roster.setAttribute('role','group');roster.setAttribute('aria-label','Six canvas companions, including you');header.insertBefore(roster,corner);roster.append(corner);
  const owner=corner.querySelector('.studio-owner');owner.dataset.presenceName='Vahri';owner.title='Vahri · exploring the canvas';roster.prepend(owner);
  const layer=document.createElement('div');layer.className='roaming-cursors';layer.setAttribute('aria-hidden','true');document.body.append(layer);
  const cursors=[];
  function spotlight(index){const el=cursors[index];el.classList.add('is-found');setTimeout(()=>el.classList.remove('is-found'),2200);}
  function avatar(person,index){
    const button=document.createElement('button');button.type='button';button.className='presence-avatar';button.textContent=person.initial;button.style.setProperty('--presence-fill',person.fill);button.style.setProperty('--presence-stroke',person.stroke);button.dataset.presenceName=person.name;button.setAttribute('aria-label',`Find ${person.name} on this canvas`);button.addEventListener('click',()=>spotlight(index));return button;
  }
  companions.forEach((person,index)=>{
    const cursor=document.createElement('div');cursor.className='roaming-cursor';cursor.dataset.companion=person.name;cursor.style.setProperty('--presence-fill',person.fill);cursor.style.setProperty('--presence-stroke',person.stroke);
    cursor.innerHTML='<svg viewBox="0 0 25 29"><path d="M5 3Q3 2 3 5l1 17q.2 3 2.5 1l4-5 7-2q3-.8.5-3Z"/></svg><span></span>';cursor.querySelector('span').textContent=person.name;layer.append(cursor);cursors.push(cursor);
    if(index>0)roster.append(avatar(person,index));
  });
  roster.append(corner);
  const overflow=document.createElement('div');overflow.className='presence-overflow';
  const more=document.createElement('button');more.type='button';more.className='presence-more';more.textContent='+5';more.setAttribute('aria-label','5 other canvas companions are here too');more.setAttribute('aria-expanded','false');more.setAttribute('aria-controls','presence-popover');
  const popover=document.createElement('div');popover.className='presence-popover';popover.id='presence-popover';
  const heading=document.createElement('strong');heading.textContent='5 others are here too';popover.append(heading);
  companions.forEach((person,index)=>{const row=document.createElement('button');row.type='button';row.className='presence-person';const badge=document.createElement('i');badge.textContent=person.initial;badge.style.background=person.fill;badge.style.color=person.stroke;const text=document.createElement('span');text.textContent=person.name;row.append(badge,text);row.addEventListener('click',()=>{spotlight(index);overflow.classList.remove('is-open');more.setAttribute('aria-expanded','false');});popover.append(row);});
  overflow.append(more,popover);roster.append(overflow);
  more.addEventListener('click',()=>{const open=overflow.classList.toggle('is-open');more.setAttribute('aria-expanded',String(open));});
  document.addEventListener('pointerdown',event=>{if(!overflow.contains(event.target)){overflow.classList.remove('is-open');more.setAttribute('aria-expanded','false');}});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){overflow.classList.remove('is-open');more.setAttribute('aria-expanded','false');}});
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(max-width:760px), (pointer:coarse)');
  const random=(low,high)=>low+Math.random()*(high-low),clamp=(value,low,high)=>Math.max(low,Math.min(high,value));
  let frame=0,lastTime=0,assemblyBusy=true;
  const states=cursors.map(()=>({x:random(.08,.9)*innerWidth,y:random(.18,.78)*innerHeight,path:null,wait:random(100,1000)}));
  function plan(state){
    const left=24,right=Math.max(left,innerWidth-120),top=110,bottom=Math.max(top,innerHeight-135);
    state.x=clamp(state.x,left,right);state.y=clamp(state.y,top,bottom);
    let x,y;
    if(Math.random()<.65){x=state.x+random(-340,340);y=state.y+random(-230,230);}else{x=random(left,right);y=random(top,bottom);}
    x=clamp(x,left,right);y=clamp(y,top,bottom);
    const dx=x-state.x,dy=y-state.y,distance=Math.hypot(dx,dy),bend=random(-.2,.2),duration=clamp(distance/random(.55,.95),280,2100);
    state.path={x0:state.x,y0:state.y,x1:state.x+dx*.3-dy*bend,y1:state.y+dy*.3+dx*bend,x2:state.x+dx*.8+dy*bend*.4,y2:state.y+dy*.8-dx*bend*.4,x3:x,y3:y,elapsed:0,duration};
  }
  function tick(now){
    if(document.hidden||mobile.matches||motion.matches||assemblyBusy){frame=0;lastTime=0;return;}
    const delta=lastTime?Math.min(50,now-lastTime):16;lastTime=now;
    states.forEach((state,index)=>{
      if(state.wait>0)state.wait-=delta;
      else{
        if(!state.path)plan(state);
        const path=state.path;path.elapsed+=delta;
        const progress=Math.min(1,path.elapsed/path.duration),t=progress*progress*(3-2*progress),u=1-t;
        state.x=u*u*u*path.x0+3*u*u*t*path.x1+3*u*t*t*path.x2+t*t*t*path.x3;
        state.y=u*u*u*path.y0+3*u*u*t*path.y1+3*u*t*t*path.y2+t*t*t*path.y3;
        if(progress===1){state.path=null;state.wait=Math.random()<.22?random(80,230):random(350,1700);}
      }
      cursors[index].style.transform=`translate3d(${state.x.toFixed(1)}px,${state.y.toFixed(1)}px,0)`;
    });
    frame=requestAnimationFrame(tick);
  }
  function sync(){
    cancelAnimationFrame(frame);frame=0;lastTime=0;
    layer.hidden=mobile.matches||assemblyBusy;
    if(mobile.matches||motion.matches||document.hidden||assemblyBusy)return;
    frame=requestAnimationFrame(tick);
  }
  let resizeTimer=0;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{states.forEach(state=>{state.path=null;state.wait=random(100,500);});sync();},160);});
  motion.addEventListener('change',sync);mobile.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);
  states.forEach((state,index)=>cursors[index].style.transform=`translate3d(${state.x}px,${state.y}px,0)`);
  function watchAssembly(){
    const phase=document.body.dataset.aboutPhase,galleryPhase=document.body.dataset.galleryPhase;
    const busy=document.documentElement.classList.contains('motion-pending')||document.body.classList.contains('page-changing')||!!document.querySelector('.assembly-layer')||!!(phase&&phase!=='idle')||!!(galleryPhase&&galleryPhase!=='idle');
    if(busy!==assemblyBusy){assemblyBusy=busy;sync();}
  }
  new MutationObserver(watchAssembly).observe(document.body,{childList:true,attributes:true,attributeFilter:['class','data-about-phase','data-gallery-phase']});
  const openingObserver=new MutationObserver(()=>{watchAssembly();if(!document.documentElement.classList.contains('motion-pending'))openingObserver.disconnect();});
  openingObserver.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  layer.hidden=true;watchAssembly();sync();
})();
