(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const visitStorageKey='studio:visited-pages';
  let previousVisits=[];
  try{
    const navigation=performance.getEntriesByType('navigation')[0];
    if(navigation?.type==='reload')sessionStorage.removeItem(visitStorageKey);
    else previousVisits=JSON.parse(sessionStorage.getItem(visitStorageKey)||'[]');
  }catch{}
  const visitedPages=new Set(Array.isArray(previousVisits)?previousVisits.filter(page=>typeof page==='string'):[]);
  let returnRevealObserver=null,returnRevealCleanup=null;
  function clearReturnReveal(){
    returnRevealCleanup?.();returnRevealCleanup=null;
    returnRevealObserver?.disconnect();returnRevealObserver=null;
    document.querySelectorAll('.return-reveal-pending,.return-reveal-active').forEach(el=>el.classList.remove('return-reveal-pending','return-reveal-active'));
  }
  function emergePage(page){
    if(reduced.matches)return;
    const elements=[...page.querySelectorAll('.movable,.page-title,.project-card,.more-experiments,[data-doc-reveal]')].filter(el=>!el.closest('[hidden]')&&!el.parentElement.closest('.movable,.project-card,.more-experiments'));
    const ready=new Set();let active=false,disposed=false,nextTimer=0;
    const pump=()=>{
      if(disposed||active)return;
      const el=[...ready].sort((a,b)=>{const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();return Math.abs(x.top-y.top)>25?x.top-y.top:x.left-y.left;})[0];
      if(!el)return;
      ready.delete(el);active=true;returnRevealObserver.unobserve(el);
      el.classList.remove('return-reveal-pending');el.classList.add('return-reveal-active');
      const base=getComputedStyle(el).transform,transform=base==='none'?'':base+' ';
      const animation=el.animate([{opacity:0,transform:transform+'translateY(22px) scale(.78)'},{opacity:1,transform:transform+'translateY(0) scale(1)'}],{duration:620,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});
      entranceAnimations.push(animation);
      animation.finished.catch(()=>{}).then(()=>{el.classList.remove('return-reveal-active');active=false;if(!disposed)nextTimer=setTimeout(pump,50);});
    };
    returnRevealObserver=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{if(entry.isIntersecting)ready.add(entry.target);else ready.delete(entry.target);});pump();
    },{root:page,rootMargin:'0px 0px -80px 0px',threshold:0});
    returnRevealCleanup=()=>{disposed=true;clearTimeout(nextTimer);ready.clear();};
    elements.forEach(el=>{el.classList.add('return-reveal-pending');returnRevealObserver.observe(el);});
  }
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const root = document.documentElement;
  root.classList.add('motion-pending');
  let entranceAnimations = [], introductionTimer, hideTipTimer, interacted = false;
  const assemblies = new Set();
  let lastAssemblySound = -Infinity;
  const tip = document.createElement('div'); tip.id = 'canvas-welcome'; tip.hidden = true;
  tip.setAttribute('role', 'status'); tip.textContent = 'Try the tools below. This canvas is yours.';
  document.body.append(tip);
  const loading=document.createElement('div');loading.id='canvas-loading';loading.hidden=true;
  loading.setAttribute('role','status');loading.setAttribute('aria-label','Introducing the canvas tools');
  loading.innerHTML='<span aria-hidden="true"><i></i><i></i><i></i></span>';document.body.append(loading);
  document.querySelectorAll('.portrait-bubble').forEach(portrait=>{
    const sparks=document.createElement('span');sparks.className='portrait-sparkles';sparks.setAttribute('aria-hidden','true');
    sparks.innerHTML='<i>✦</i><i>✧</i><i>✦</i><i>✧</i>';portrait.append(sparks);
  });
  function clearAssembly() { assemblies.forEach(stop=>stop()); }
  function dismissTip() { root.classList.remove('motion-pending'); clearAssembly(); interacted = true; clearTimeout(introductionTimer); clearTimeout(hideTipTimer); tip.hidden = true; loading.hidden=true; entranceAnimations.forEach(animation => animation.cancel()); galleryMotion?.finishCurrent(); }
  function positionTip() { const bar=document.querySelector('.editing-toolbar');const bottom=`${innerHeight-bar.getBoundingClientRect().top+18}px`;tip.style.setProperty('--welcome-bottom',bottom);loading.style.setProperty('--welcome-bottom',bottom); }
  function reveal(el, delay = 0, duration = 440, compact = false) {
    if (!el || reduced.matches) return;
    const base = getComputedStyle(el).transform;
    const transform = base === 'none' ? '' : base + ' ';
    const animation = el.animate([
      { opacity:0, transform:`${transform}translateY(${compact ? 9 : 18}px) scale(${compact ? .88 : .96})` },
      { opacity:1, transform:`${transform}translateY(-2px) scale(1.015)`, offset:.78 },
      { opacity:1, transform:`${transform}translateY(0) scale(1)` }
    ], {duration, delay, easing:'cubic-bezier(.22,.8,.3,1)', fill:'backwards'});
    entranceAnimations.push(animation);
  }
  function fadeIn(el, delay, duration = 200) {
    if (!el || reduced.matches) return;
    entranceAnimations.push(el.animate([{opacity:0},{opacity:1}],{delay,duration,easing:'ease-out',fill:'backwards'}));
  }
  function assembleSections(specs, actions, total) {
    if (reduced.matches) return;
    const layer=document.createElement('div');layer.className='assembly-layer';layer.setAttribute('aria-hidden','true');
    document.body.append(layer);
    const guideHost=document.querySelector('.page-view:not([hidden])'),guideLayer=document.createElement('div');
    guideLayer.className='assembly-guides';guideLayer.setAttribute('aria-hidden','true');guideHost.append(guideLayer);
    const smoothAbout=guideHost.dataset.view==='about';
    const positionGuide=(frame,rect)=>{const host=guideHost.getBoundingClientRect();frame.style.left=`${rect.left-host.left+guideHost.scrollLeft}px`;frame.style.top=`${rect.top-host.top+guideHost.scrollTop}px`;};
    const actor=document.createElement('div');actor.className='assembly-actor';
    actor.innerHTML='<i class="assembly-typing-caret"></i><svg viewBox="0 0 25 29"><path d="M5 3Q3 2 3 5l1 17q.2 3 2.5 1l4-5 7-2q3-.8.5-3Z"/></svg><span>Maker</span>';
    layer.append(actor);
    const restore=[];
    function rememberStyle(el,props){const values=props.map(prop=>[prop,el.style[prop]]);restore.push(()=>values.forEach(([prop,value])=>el.style[prop]=value));}
    const frames=specs.filter(spec=>spec.el).map(spec=>{
      const r=spec.el.getBoundingClientRect();
      const frame=document.createElement('div');frame.className='assembly-frame';
      positionGuide(frame,r);
      frame.innerHTML='<svg class="assembly-outline" aria-hidden="true"><rect class="assembly-outline-path" x="1" y="1"/></svg><span class="assembly-frame-title"></span><i class="assembly-handle tl"></i><i class="assembly-handle tr"></i><i class="assembly-handle bl"></i><i class="assembly-handle br"></i><span class="assembly-dimensions"></span>';
      frame.querySelector('.assembly-frame-title').textContent=spec.name;guideLayer.append(frame);
      const label=spec.el.closest('.movable')?.querySelector(':scope > .object-label');
      rememberStyle(spec.el,['clipPath']);spec.el.style.clipPath='inset(0 100% 100% 0)';
      if(label){rememberStyle(label,['opacity']);label.style.opacity='0';}
      const circular=spec.el.classList.contains('portrait-bubble');
      const radius=parseFloat(getComputedStyle(spec.el).borderTopLeftRadius)||0;
      let portraitCopy=null;
      if(circular){
        portraitCopy=spec.el.cloneNode(true);portraitCopy.classList.remove('movable','portrait-bubble');portraitCopy.classList.add('assembly-portrait');
        Object.assign(portraitCopy.style,{position:'absolute',boxSizing:'border-box',translate:'none',rotate:'none',scale:'none',margin:'0',minWidth:'0',maxWidth:'none',left:`${r.left}px`,top:`${r.top}px`,right:'auto',width:`${r.width}px`,height:`${r.height}px`,clipPath:'none',opacity:'0'});
        const crop=portraitCopy.querySelector('.portrait-crop');Object.assign(crop.style,{width:`${r.width}px`,height:`${r.height}px`,position:'relative',overflow:'hidden'});
        const photo=portraitCopy.querySelector('.portrait-photo');
        if(photo)Object.assign(photo.style,{width:`${r.width}px`,height:`${r.height}px`,maxWidth:'none',maxHeight:'none',objectFit:'cover'});
        const copyLabel=portraitCopy.querySelector('.object-label');if(copyLabel)copyLabel.style.opacity='0';
        layer.append(portraitCopy);
      }
      return {...spec,r,frame,label,circular,radius,portraitCopy,outline:frame.querySelector('rect'),dimensions:frame.querySelector('.assembly-dimensions')};
    });
    const textState=new Map(),buttonState=new Map();
    for(const action of actions){
      if(action.kind==='draw'){action.frame=frames.find(frame=>frame.el===action.el);continue;}
      if(action.kind==='trace'){
        action.length=action.el.getTotalLength();
        rememberStyle(action.el,['strokeDasharray','strokeDashoffset','opacity','fillOpacity']);
        if(action.el.classList.contains('draw-fill'))action.el.style.fillOpacity='0';
        action.el.style.strokeDasharray=String(action.length);action.el.style.strokeDashoffset=String(action.length);action.el.style.opacity='0';
      }else if(action.kind==='type'){
        rememberStyle(action.el,['clipPath']);action.el.style.clipPath='inset(0 100% 0 0)';
        textState.set(action,{points:null,index:-1});
      }else if(action.kind==='place'){
        rememberStyle(action.el,['opacity','transform']);buttonState.set(action,{transform:action.el.style.transform,box:action.el.getBoundingClientRect()});action.el.style.opacity='0';
      }
    }
    const groups=[...new Set(actions.map(action=>action.group||'default'))];
    const actors=groups.map((group,index)=>{
      const element=index===0?actor:actor.cloneNode(true);if(index)layer.append(element);
      const names={photo:'Vahri',about:'Maker',belief:'Vahri',beliefRight:'Maker',doodle:'Curious one',approachRight:'Vahri',approachSticker:'Curious one',row0:'Maker',row1:'Vahri',row2:'Curious one',gymSticker:'Pixel pal',coffeeSticker:'Daydreamer',chapter0:'Vahri',chapter1:'Maker',chapter2:'Curious one'};
      element.dataset.group=group;
      if(group!=='default'){element.classList.add('about-maker');element.querySelector('span').textContent=names[group]||'Maker';element.style.setProperty('--actor-fill',['about','chapter1'].includes(group)?'#e4daf8':['doodle','chapter2'].includes(group)?'#d0ede1':'#c5dcff');}
      return {element,actions:actions.filter(action=>(action.group||'default')===group)};
    });
    let frameRequest;
    function stop() {
      if(!assemblies.delete(stop))return;
      cancelAnimationFrame(frameRequest);
      restore.forEach(fn=>fn());
      layer.remove();
      guideLayer.remove();
    }
    assemblies.add(stop);
    const clamp=value=>Math.max(0,Math.min(1,value));
    const smooth=value=>value*value*(3-2*value);
    const drawEase=value=>1-Math.pow(1-value,2);
    function textPoints(action){
      const state=textState.get(action);if(state.points)return state.points;
      const element=action.el,box=element.getBoundingClientRect();
      const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT),range=document.createRange();let node;const points=[];
      while((node=walker.nextNode())){
        for(let index=0;index<node.textContent.length;index++){
          range.setStart(node,index);range.setEnd(node,index+1);
          const rect=range.getBoundingClientRect();
          if(rect.height>0)points.push({x:rect.right,y:rect.bottom,top:rect.top,bottom:rect.bottom});
        }
      }
      state.box=box;state.points=points.length?points:[{x:box.left,y:box.bottom,top:box.top,bottom:box.bottom}];return state.points;
    }
    function pointAt(action,progress){
      if(action.kind==='trace'){
        const point=action.el.getPointAtLength(action.length*progress),matrix=action.el.getScreenCTM();
        const screen=new DOMPoint(point.x,point.y).matrixTransform(matrix);
        return {x:screen.x,y:screen.y};
      }
      if(action.kind==='draw'){
        const r=action.frame.r,p=drawEase(progress);return{x:r.left+Math.max(2,r.width*p)+5,y:r.top+Math.max(2,r.height*p)+5};
      }
      if(action.kind==='type'){
        const points=textPoints(action),count=Math.min(points.length,progress*points.length),index=Math.floor(count);
        const next=points[Math.min(points.length-1,index)];
        const previous=index>0?points[index-1]:{...points[0],x:textState.get(action).box.left};
        const fraction=count-index;
        return {x:previous.x+(next.x-previous.x)*fraction,y:previous.y+(next.y-previous.y)*fraction+2-(textState.get(action).scrollOffset||0)};
      }
      const rect=buttonState.get(action)?.box||action.el.getBoundingClientRect();
      if(action.travel||action.el.matches('.chapter-tag,.about-doodle,.belief-sticker,.approach-coffee,.personal-sticker')){const p=smooth(progress);return{x:rect.left+rect.width*.62+20*(1-p),y:rect.top+rect.height*.58-18*(1-p)};}
      if(action.el.classList.contains('portrait-bubble')){
        const p=smooth(progress);return{x:rect.left+rect.width*.64+24*(1-p),y:rect.top+rect.height*.55-22*(1-p)};
      }
      return{x:rect.left+rect.width*.62,y:rect.top+rect.height*.58};
    }
    const soundStates=new Map(actions.map(action=>[action,{started:false,finished:false,character:-1}]));
    let soundLead=null;
    const emitSound=kind=>{
      const now=performance.now();
      if(now-lastAssemblySound<18)return;
      lastAssemblySound=now;
      document.dispatchEvent(new CustomEvent('studio:sound',{detail:{kind,source:'animation'}}));
    };
    const scrollHost=document.querySelector('.page-view:not([hidden])');let lastScroll=scrollHost?.scrollTop||0;
    const began=performance.now();
    let lastTick=began;
    function tick(now){
      const follow=1-Math.exp(-(now-lastTick)/38);
      lastTick=now;
      const elapsed=now-began;
      const currentScroll=scrollHost?.scrollTop||0,scrollDelta=currentScroll-lastScroll;
      if(scrollDelta){
        for(const state of textState.values()){
          if(smoothAbout&&state.points)state.scrollOffset=(state.scrollOffset||0)+scrollDelta;
          else{state.points=null;state.index=-1;}
        }
        for(const state of buttonState.values())state.box={left:state.box.left,top:state.box.top-scrollDelta,width:state.box.width,height:state.box.height};
        lastScroll=currentScroll;
      }
      for(const item of frames){
        if(smoothAbout){
          if(scrollDelta)item.r.top-=scrollDelta;
        }else{
          const live=item.el.getBoundingClientRect();
          item.r={left:live.left,top:live.top,width:live.width,height:live.height};
          positionGuide(item.frame,live);
          if(item.portraitCopy){item.portraitCopy.style.left=`${live.left}px`;item.portraitCopy.style.top=`${live.top}px`;}
        }
        const p=drawEase(clamp((elapsed-item.start)/item.draw));
        if(!smoothAbout||item.progress!==p){
          item.progress=p;
          const width=Math.max(2,item.r.width*p),height=Math.max(2,item.r.height*p);
          item.frame.style.width=`${width}px`;item.frame.style.height=`${height}px`;
          item.outline.setAttribute('width',String(width+8));item.outline.setAttribute('height',String(height+8));
          item.outline.setAttribute('rx',String(item.circular?(width+8)/2:Math.min(item.radius+4,(width+8)/2,(height+8)/2)));
          item.outline.setAttribute('ry',String(item.circular?(height+8)/2:Math.min(item.radius+4,(width+8)/2,(height+8)/2)));
          item.frame.classList.toggle('is-growing',elapsed>=item.start&&elapsed<item.start+item.draw);
          item.frame.classList.toggle('has-room',width>90);
          item.dimensions.textContent=`${Math.round(width)} × ${Math.round(height)}`;
          if(!item.circular)item.el.style.clipPath=p===1?'':`inset(0 ${(1-p)*100}% ${(1-p)*100}% 0)`;
        }
        item.frame.style.opacity=elapsed<item.start?'0':String(1-clamp((elapsed-item.done)/160));
        if(item.circular){
          // Keep the source hidden; the foreground copy covers the hero guide during placement.
          item.el.style.clipPath='inset(50%)';
          const placement=actions.find(action=>action.kind==='place'&&action.el===item.el);
          const progress=placement?clamp((elapsed-placement.start)/(placement.end-placement.start)):0;
          const travel=smooth(clamp(progress/.72)),settle=clamp((progress-.72)/.28);
          item.portraitCopy.style.opacity=String(clamp(progress*5));
          item.portraitCopy.style.transform=`translate(${24*(1-travel)}px,${-22*(1-travel)}px) scale(${.9+.1*travel+.025*Math.sin(settle*Math.PI)})`;
          item.portraitCopy.classList.toggle('is-placed',progress>=.72);
          const copyLabel=item.portraitCopy.querySelector('.object-label');if(copyLabel)copyLabel.style.opacity=elapsed>=item.done+160?'1':'0';
        }
        if(item.label)item.label.style.opacity=String(clamp((elapsed-item.done)/160));
      }
      // Follow one foreground action; concurrent makers never stack their audio.
      const soundRank={place:5,trace:4,type:3,draw:1};
      const foreground=actions.filter(action=>elapsed>=action.start&&elapsed<action.end).sort((a,b)=>soundRank[b.kind]-soundRank[a.kind]||a.start-b.start)[0];
      if(soundLead&&soundLead!==foreground&&soundLead.kind==='draw'&&elapsed>=soundLead.end)emitSound('frame-end');
      if(foreground){
        const progress=clamp((elapsed-foreground.start)/(foreground.end-foreground.start)),sound=soundStates.get(foreground);
        if(foreground.kind==='draw')emitSound('frame');
        else if(foreground.kind==='trace')emitSound('draw');
        else if(foreground.kind==='type'){
          const character=Math.floor(progress*textPoints(foreground).length);
          if(character>sound.character){emitSound('type');sound.character=character;}
        }else if(foreground.kind==='place'&&!sound.started)emitSound('place');
        sound.started=true;
      }
      soundLead=foreground;
      for(const action of actions){
        const progress=clamp((elapsed-action.start)/(action.end-action.start));
        if(action.kind==='trace'){
          action.el.style.opacity=progress>0?'1':'0';action.el.style.strokeDashoffset=String(action.length*(1-progress));
          if(action.el.classList.contains('draw-fill'))action.el.style.fillOpacity=String(smooth(clamp((progress-.7)/.3)));
        }else if(action.kind==='type'){
          if(progress===0)continue;
          const state=textState.get(action),points=textPoints(action),index=Math.min(points.length-1,Math.floor(progress*points.length)-1);
          if(progress===1){action.el.style.clipPath='';continue;}
          if(index<0)continue;
          if(index===state.index)continue;state.index=index;
          const point=points[index],box=state.box;
          const x=Math.max(0,point.x-box.left+1),top=Math.max(0,point.top-box.top-2),bottom=point.bottom-box.top+3;
          action.el.style.clipPath=`polygon(0 0,100% 0,100% ${top}px,${x}px ${top}px,${x}px ${bottom}px,0 ${bottom}px)`;
        }else if(action.kind==='place'){
          if(action.el.classList.contains('portrait-bubble'))continue;
          const p=drawEase(progress),state=buttonState.get(action);
          action.el.style.opacity=String(clamp(progress*3));
          const sticker=action.travel||action.el.matches('.about-doodle,.belief-sticker,.approach-coffee,.personal-sticker');
          action.el.style.transform=progress===1?state.transform:sticker?`${state.transform} translate(${20*(1-p)}px,${-18*(1-p)}px) scale(${.9+.1*p+.04*Math.sin(progress*Math.PI)})`:action.el.classList.contains('chapter-tag')?`${state.transform} translate(${20*(1-p)}px,${-18*(1-p)}px) scale(${.86+.14*p})`:`${state.transform} translateY(${(1-p)*5}px) scale(${.92+.08*p})`;
        }
      }
      for(const actorState of actors){
      const {element:activeActor,actions:actorActions}=actorState;
      const actorStart=Math.max(0,actorActions[0].start-450);
      const actorTotal=actors.length>1?Math.min(total,actorActions[actorActions.length-1].end+650):total;
      let current=null,point=null,previous=null;
      for(const action of actorActions){
        if(elapsed<action.start){
          const destination=pointAt(action,0),origin=previous?pointAt(previous,1):{x:destination.x-60,y:destination.y-40};
          const p=smooth(clamp((elapsed-(previous?.end??actorStart))/(action.start-(previous?.end??actorStart)||1)));
          point={x:origin.x+(destination.x-origin.x)*p,y:origin.y+(destination.y-origin.y)*p};break;
        }
        if(elapsed<=action.end){current=action;point=pointAt(action,clamp((elapsed-action.start)/(action.end-action.start)));break;}
        previous=action;
      }
      if(!point&&previous){
        const origin=pointAt(previous,1),bar=document.querySelector('.editing-toolbar').getBoundingClientRect();
        const p=smooth(clamp((elapsed-previous.end)/(actorTotal-previous.end)));
        point={x:origin.x+(bar.left+bar.width/2-origin.x)*p,y:origin.y+(bar.top-30-origin.y)*p};
      }
      if(point){
        if(smoothAbout){
          const previousPoint=actorState.point||point;
          point={
            x:previousPoint.x+(point.x-previousPoint.x)*follow,
            y:previousPoint.y+(point.y-previousPoint.y)*follow,
          };
          actorState.point=point;
        }
        activeActor.style.transform=`translate(${point.x-(current?.kind==='trace'?4:3)}px,${point.y-(current?.kind==='trace'?23:2)}px)`;
        activeActor.style.opacity=String(clamp((elapsed-actorStart)/150)*(1-clamp((elapsed-(actorTotal-250))/250)));
        activeActor.dataset.action=current?.kind||'move';
        const tool=current?.kind==='trace'?'pen':'arrow';
        if(activeActor.dataset.icon!==tool){activeActor.dataset.icon=tool;activeActor.querySelector('svg').innerHTML=tool==='pen'?'<path d="m4 23 2-7L18 4l5 5-12 12Z"/><path d="m15 7 5 5" fill="none"/>':'<path d="M5 3Q3 2 3 5l1 17q.2 3 2.5 1l4-5 7-2q3-.8.5-3Z"/>';}

        activeActor.classList.toggle('label-left',point.x>innerWidth-120);
        activeActor.classList.toggle('is-pressing',current?.kind==='trace'||current?.kind==='place'&&(current.el.classList.contains('portrait-bubble')?elapsed-current.start>380:elapsed-current.start<140));
      }
      }
      if(elapsed<total)frameRequest=requestAnimationFrame(tick);else stop();
    }
    frameRequest=requestAnimationFrame(tick);
  }
  const usesParallelAssembly=page=>['about','work'].includes(page.dataset.view)||page.dataset.view.startsWith('kantong');
  let galleryMotion=null;
  function clearGalleryMotion(){galleryMotion?.dispose();galleryMotion=null;}
  function buildGalleryCanvas(page){
    const isAbout=page.dataset.view==='about';
    const parallel=usesParallelAssembly(page);
    const targets=[...page.querySelectorAll(isAbout?'.movable':'[data-gallery-step]')].filter(el=>
      !el.closest('[hidden]')&&(!isAbout||!el.parentElement.closest('.movable'))
    );
    if(reduced.matches){
      targets.forEach(el=>el.dataset.galleryBuildState='complete');
      return null;
    }
    const previous=new Map(targets.map(el=>[el,el.style.visibility]));
    targets.forEach(el=>{el.style.visibility='hidden';el.dataset.galleryBuildState='waiting';});
    const ready=new Set(),active=new Map();
    let disposed=false,nextMaker=0;
    const makers=['about','photo','doodle','gymSticker','coffeeSticker'];
    function finish(el){
      clearTimeout(active.get(el));
      active.delete(el);
      el.style.visibility=previous.get(el);
      el.dataset.galleryBuildState='complete';
      if(!active.size)document.body.dataset.galleryPhase='idle';
    }
    function pump(){
      if(disposed||page.hidden||document.body.classList.contains('page-changing'))return;
      for(const el of ready){
        if(!parallel&&active.size)return;
        ready.delete(el);
        observer.unobserve(el);
        start(el);
      }
    }
    function start(el){
      el.dataset.galleryBuildState='building';
      document.body.dataset.galleryPhase='building';
      const specs=[],actions=[];
      const draw=(node,name,start,duration,done)=>{if(node){specs.push({el:node,name,start,draw:duration,done});actions.push({kind:'draw',el:node,start,end:start+duration});}};
      const type=(node,start,duration)=>{if(node)actions.push({kind:'type',el:node,start,end:start+duration});};
      const place=(node,start,duration=400)=>{if(node)actions.push({kind:'place',el:node,start,end:start+duration});};
      const buttons=(node,start)=>node?.querySelectorAll('.pill').forEach((button,index)=>place(button,start+index*420,350));
      let total=2400;
      switch(isAbout?'about-object':el.dataset.galleryStep){
        case 'about-object': {
          const label=el.querySelector(':scope > .object-label')?.textContent||'About';
          const writeTime=node=>Math.min(2400,Math.max(950,node.textContent.trim().length*12));
          if(el.matches('.about-quote')){
            const duration=writeTime(el);
            type(el,150,duration);
            total=duration+550;
            break;
          }
          if(el.matches('.about-doodle,.belief-sticker,.approach-coffee')){
            place(el,150,780);
            total=1250;
            break;
          }
          const content=[];
          function collect(node){
            for(const child of node.children){
              if(child.matches('.object-label,.construction-guide,.frame-size,.selection-corner'))continue;
              if(child.matches('.belief-heading,.belief-columns,.belief-columns > div,.chapter-copy,.photo-note-copy,.music-copy'))collect(child);
              else content.push(child);
            }
          }
          collect(el);
          let start=1050;
          for(const child of content){
            const titlePill=child.matches(':is(.chapter-overview,.approach-heading,.more-heading) > h2');
            const writing=!titlePill&&child.matches('h1,h2,h3,p,.about-caption-copy');
            const duration=writing?writeTime(child):720;
            if(writing)type(child,start,duration);
            else{
              place(child,start,duration);
              actions[actions.length-1].travel=true;
            }
            start+=duration+210;
          }
          total=start+260;
          draw(el,label,120,720,total-260);
          actions.sort((a,b)=>a.start-b.start);
          break;
        }

        case 'work-section': {
          const label=el.querySelector('.object-label')?.textContent||el.getAttribute('aria-label')||'Kantong';
          const title=el.querySelector('h1,h2');
          const sectionButtons=[...el.querySelectorAll(':scope > .project-section-links > .pill')];
          const content=[...el.children].filter(child=>!child.matches('.object-label,h1,h2,.project-section-links,.construction-guide,.frame-size,.selection-corner'));
          const buttonsStart=1450+content.length*350;
          total=sectionButtons.length?buttonsStart+(sectionButtons.length-1)*420+650:1850+content.length*90;
          draw(el,label,100,420,total-100);
          if(title?.parentElement===el)place(title,650,400);
          content.forEach((child,index)=>place(child,1350+index*(sectionButtons.length?350:90),300));
          sectionButtons.forEach((button,index)=>place(button,buttonsStart+index*420,300));
          break;
        }

        case 'kantong-decision':
          total=1660;
          draw(el,el.querySelector('.object-label').textContent,100,420,total-100);
          place(el.querySelector('.kantong-decision-copy'),640,360);
          place(el.querySelector('.kantong-decision figure'),1080,400);
          break;
        case 'kantong-facts': {
          const facts=[...el.querySelectorAll('.kantong-fact')];
          const firstPlacement=620,interval=410;
          total=firstPlacement+facts.length*interval+100;
          draw(el,'Project facts',100,400,total-100);
          facts.forEach((fact,index)=>place(fact,firstPlacement+index*interval,320));
          break;
        }

        case 'title':
          draw(el,'Interface gallery',150,650,1900);type(el.querySelector('h1'),900,1000);total=2200;break;
        case 'card':
          draw(el.querySelector('.gallery-card-preview'),'New project modal',150,550,1600);place(el.querySelector('.gallery-thumbnail-frame'),850,400);total=1650;break;
        case 'intro':
          draw(el,'01 · New project modal',100,550,4200);type(el.querySelector('h1'),850,850);type(el.querySelector('p'),1850,1100);buttons(el,3150);place(el.querySelector('.gallery-detail-sticker'),3750,450);total=4500;break;
        case 'preview':
          draw(el,'02 · Live preview',100,550,4700);type(el.querySelector('h2'),800,650);place(el.querySelector('.gallery-preview-controls'),1650,450);place(el.querySelector('.gallery-detail-stage'),2400,550);type(el.querySelector('.docs-note'),3200,950);total=4600;break;
        case 'guide-panel':
          draw(el,'03 · Make it yours',100,650,8900);type(el.querySelector('h2'),950,650);type(el.querySelector('.docs-description'),1750,1000);place(el.querySelector('.pill'),3000,350);
          [...el.querySelectorAll('.gallery-setup article')].forEach((item,index)=>{place(item,3550+index*1700,350);type(item.querySelector('h3'),3950+index*1700,450);type(item.querySelector('p'),4500+index*1700,950);});
          place(el.querySelector('pre'),7200,500);type(el.querySelector('.docs-note'),7850,950);place(el.querySelector('.gallery-section-sticker'),8850,450);total=9600;break;
        case 'source-panel':
          draw(el,'04 · Take the code',100,650,4350);type(el.querySelector('h2'),950,650);type(el.querySelector('.docs-description'),1750,950);buttons(el,2900);place(el.querySelector('pre'),3850,450);place(el.querySelector('.gallery-section-sticker'),4350,450);total=5100;break;
        case 'guide':
          type(el.querySelector('h2'),150,650);type(el.querySelector('p'),1000,1100);place(el.querySelector('.pill'),2350,350);total=3000;break;
        case 'setup':
          draw(el,'Set up the design',100,550,4900);
          [...el.querySelectorAll('article')].forEach((item,index)=>{type(item.querySelector('h3'),800+index*2150,600);type(item.querySelector('p'),1550+index*2150,1150);});total=5300;break;
        case 'note':
          type(el.querySelector('h3'),100,600);type(el.querySelector('p'),900,1250);total=2450;break;
        case 'usage':
          draw(el.querySelector('pre'),'Usage',100,550,1550);place(el.querySelector('code'),850,500);type(el.querySelector('.docs-note'),1700,1100);total=3100;break;
        case 'source-heading':
          type(el.querySelector('h2'),100,700);type(el.querySelector('p'),1000,1000);buttons(el,2200);total=3300;break;
        case 'source':
          draw(el,'React + Tailwind',150,650,1750);place(el.querySelector('code'),1050,550);total=2100;break;
      }
      if(parallel){
        const maker=makers[nextMaker++%makers.length];
        actions.forEach(action=>{action.group=maker;});
      }
      assembleSections(specs,actions,total);
      el.style.visibility=previous.get(el);
      active.set(el,setTimeout(()=>{finish(el);pump();},total+40));
    }
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting)ready.add(entry.target);
        else ready.delete(entry.target);
      });
      pump();
    },{root:page,rootMargin:parallel?'48px 0px':'0px 0px -65px 0px',threshold:0});
    targets.forEach(el=>observer.observe(el));
    return {
      finishCurrent(){active.forEach((_,el)=>finish(el));pump();},
      dispose(){
        disposed=true;
        observer.disconnect();
        active.forEach((_,el)=>finish(el));
        targets.forEach(el=>{el.style.visibility=previous.get(el);el.dataset.galleryBuildState='complete';});
        ready.clear();
        document.body.dataset.galleryPhase='idle';
      }
    };
  }

  function enterPage(initial=false){
    clearGalleryMotion();
    clearReturnReveal();
    if(typeof clearSelection==='function')clearSelection();
    clearAssembly();clearTimeout(introductionTimer);clearTimeout(hideTipTimer);tip.hidden=true;loading.hidden=true;
    entranceAnimations.forEach(animation=>animation.cancel());entranceAnimations=[];
    const page=document.querySelector('.page-view:not([hidden])');if(!page)return;
    const returning=visitedPages.has(page.dataset.view);
    visitedPages.add(page.dataset.view);
    try{sessionStorage.setItem(visitStorageKey,JSON.stringify([...visitedPages]));}catch{}
    const simpleReturn=returning&&!usesParallelAssembly(page);
    page.dataset.entrance=simpleReturn?'simple':'full';
    if(['about','gallery','contact'].includes(page.dataset.view))page.scrollTo({top:0,left:0,behavior:'instant'});
    if(simpleReturn){emergePage(page);return;}
    let finish=0;
    if(initial){
      reveal(document.querySelector('.page-navigation'),0,350);
      document.querySelectorAll('.page-links a').forEach((el,i)=>reveal(el,70+i*60,260,true));
      document.querySelectorAll('.header-actions .visitor-avatar,.header-actions .studio-owner,.theme-toggle').forEach((el,i)=>reveal(el,150+i*70,300,true));
      reveal(document.querySelector('.editing-toolbar'),100,350);
      document.querySelectorAll('.editing-toolbar>button').forEach((el,i)=>reveal(el,150+i*50,260,true));
      reveal(document.querySelector('.music-toggle'),250,350,true);
    }
    const specs=[],actions=[];
    function draw(el,name,start,duration,done){if(!el)return;specs.push({el,name,start,draw:duration,done});actions.push({kind:'draw',el,start,end:start+duration});}
    function type(el,start,duration){if(el)actions.push({kind:'type',el,start,end:start+duration});}
    function place(el,start,duration=200){if(el)actions.push({kind:'place',el,start,end:start+duration});}
    if(page.dataset.view==='home'){
      finish=9790;
      const hero=page.querySelector('.hello-card'),portrait=page.querySelector('.portrait-bubble');
      const explore=page.querySelector('.menu-group .pill-tray'),elsewhere=page.querySelector('.elsewhere-group .pill-tray');
      draw(hero,'02 · Hello',500,900,5630);
      draw(portrait,'01 · Me',1620,580,2700);
      place(portrait,2310,540);
      type(page.querySelector('.hello-content h1'),3000,650);
      type(page.querySelector('.hello-content p'),3780,1750);
      const exploreDone=6550+Math.max(0,(explore?.querySelectorAll('.pill').length||1)-1)*330+260;
      draw(explore,'03 · Explore',5840,560,exploreDone);
      explore?.querySelectorAll('.pill').forEach((el,i)=>place(el,6550+i*330));
      const elsewhereStart=exploreDone+220,elsewherePlace=elsewhereStart+720;
      const elsewhereDone=elsewherePlace+Math.max(0,(elsewhere?.querySelectorAll('.pill').length||1)-1)*350+260;
      finish=elsewhereDone+650;
      draw(elsewhere,'04 · Elsewhere',elsewhereStart,560,elsewhereDone);
      elsewhere?.querySelectorAll('.pill').forEach((el,i)=>place(el,elsewherePlace+i*350));
    }else if(page.dataset.view==='contact'){
      const hello=page.querySelector('.contact-hello'),note=page.querySelector('.contact-note'),elsewhere=page.querySelector('.contact-elsewhere');
      const group=(name,fn)=>{const index=actions.length;fn();actions.slice(index).forEach(action=>action.group=name);};
      group('hello',()=>{draw(hello,'01 · Say hi',250,650,6500);type(hello.querySelector('h1'),1150,1150);type(hello.querySelector('p'),2550,1500);place(hello.querySelector('.contact-availability'),4300,350);hello.querySelectorAll('.contact-links .pill').forEach((button,index)=>place(button,4900+index*550,350));place(hello.querySelector('.contact-envelope'),6000,350);});
      group('note',()=>{draw(note,'02 · A little note',650,650,6500);type(note.querySelector('h2'),1550,950);type(note.querySelector('p'),2750,1100);place(note.querySelector('form'),4150,650);});
      group('elsewhere',()=>{draw(elsewhere,'03 · Around the internet',5200,550,8750);type(elsewhere.querySelector('h2'),6020,800);elsewhere.querySelectorAll('.contact-socials .pill').forEach((button,index)=>place(button,7100+index*550,350));});
      finish=9100;
    }else if(page.dataset.view==='about'||page.dataset.view==='work'||page.dataset.view.startsWith('kantong')){
      galleryMotion=buildGalleryCanvas(page); fadeIn(page.querySelector('.annotations'),0,250); return;
    }else if(page.dataset.view==='gallery'){
      galleryMotion=buildGalleryCanvas(page);
      fadeIn(page.querySelector('.annotations'),0,250);
      return;
    }else{
      reveal(page.querySelector('.page-title'),0,350);
      let clock=250;
      page.querySelectorAll('.movable,.project-card,.more-experiments').forEach(el=>{
        const r=el.getBoundingClientRect();
        if(r.top>=innerHeight-90||r.bottom<=80){reveal(el,150,350);return;}
        const children=[...el.children].filter(child=>!child.matches('.object-label,.belief-flower')).slice(0,5);
        const start=clock;clock+=650;
        for(const child of children){
          const duration=child.matches('h1,h2,h3,p')?Math.min(700,Math.max(300,child.textContent.length*7)):260;
          if(child.matches('h1,h2,h3,p'))type(child,clock,duration);else place(child,clock,duration);
          clock+=duration+130;
        }
        draw(el,el.querySelector('.object-label')?.textContent||el.querySelector('h3')?.textContent||'Canvas section',start,500,clock);
        clock+=200;
      });finish=clock+350;
    }
    actions.sort((a,b)=>a.start-b.start);
    assembleSections(specs,actions,finish);
    fadeIn(page.querySelector('.annotations'),finish,250);
    if(initial&&page.dataset.view!=='about')introductionTimer=setTimeout(()=>{
      if(interacted||document.body.dataset.tool!=='move')return;
      positionTip();
      const showInvitation=()=>{
        loading.hidden=true;
        if(interacted||document.body.dataset.tool!=='move')return;
        tip.hidden=false;
        if(!reduced.matches)tip.animate([{opacity:.3,clipPath:'inset(0 42% 0 42% round 18px)'},{opacity:1,clipPath:'inset(0 0 0 0 round 18px)'}],{duration:360,easing:'cubic-bezier(.2,.8,.2,1)'});
        hideTipTimer=setTimeout(()=>{tip.hidden=true},6500);
      };
      if(reduced.matches){showInvitation();return;}
      loading.hidden=false;
      loading.animate([{opacity:0,translate:'0 5px',scale:.9},{opacity:1,translate:'0 0',scale:1}],{duration:220,easing:'ease-out'});
      introductionTimer=setTimeout(showInvitation,1900);
    },reduced.matches?500:finish+100);
  }
  const scrollKeys=new Set(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' ']);
  document.addEventListener('pointerdown',event=>{
    if(event.target.closest('[data-view="about"]'))return;
    dismissTip();
  },{capture:true});
  document.addEventListener('keydown',event=>{
    if(event.target.closest('input,textarea,select,[contenteditable=true]'))return;
    if(scrollKeys.has(event.key)&&document.querySelector('[data-view="about"]:not([hidden])'))return;
    dismissTip();
  },true);
  addEventListener('studio:comment-focus',dismissTip);
  let lastLayoutWidth=innerWidth;
  addEventListener('resize',()=>{positionTip();if(innerWidth===lastLayoutWidth)return;lastLayoutWidth=innerWidth;clearGalleryMotion();clearAssembly();entranceAnimations.forEach(animation=>animation.cancel());});
  let transitionId = 0, stopTransition = null;
  window.playStudioPageTransition = async (outgoing, destination, commit) => {
    const id = ++transitionId;
    stopTransition?.(); dismissTip();
    if (reduced.matches || outgoing.dataset.view === destination) { commit();enterPage(false);return; }
    document.body.classList.add('page-changing');
    const layer = document.createElement('div'); layer.className = 'page-transition-layer';
    layer.setAttribute('aria-hidden', 'true'); document.body.append(layer);
    const animations = [];
    const animate = (el, frames, options) => {
      const animation = el.animate(frames, {fill:'both', ...options}); animations.push(animation); return animation;
    };
    let cancelled = false;
    const cleanup = () => {
      cancelled = true; animations.forEach(animation => animation.cancel()); layer.remove();
      document.body.classList.remove('page-changing');
      if (id === transitionId) stopTransition = null;
    };
    stopTransition = cleanup;
    const wait = animation => animation.finished.catch(() => {});
    const visibleSections = page => [...page.querySelectorAll('.movable,.project-card,.page-title,.more-experiments,.canvas-object,[data-doc-reveal]')].filter(el => {
      const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 75 && r.top < innerHeight - 80;
    });
    const guide = el => {
      const r = el.getBoundingClientRect(), box = document.createElement('div');
      box.className = 'page-transition-guide';
      const shape=el.querySelector(':scope > .pill-tray')||el;
      const radius=el.classList.contains('portrait-bubble')?(r.height+8)/2:Math.min((parseFloat(getComputedStyle(shape).borderTopLeftRadius)||0)+4,(r.width+8)/2,(r.height+8)/2);
      Object.assign(box.style,{left:`${r.left-5}px`,top:`${r.top-5}px`,width:`${r.width+10}px`,height:`${r.height+10}px`});
      box.innerHTML=`<svg aria-hidden="true"><rect x="1" y="1" width="${r.width+8}" height="${r.height+8}" rx="${radius}"/></svg>`;
      layer.append(box); return box;
    };
    const order = ['home','about','work','gallery','contact'];
    const direction = order.indexOf(destination) >= order.indexOf(outgoing.dataset.view) ? 1 : -1;
    const outgoingSections = visibleSections(outgoing);
    if (!outgoingSections.length) { commit(); cleanup(); enterPage(false); return; }
    const rectangles = outgoingSections.map(el => el.getBoundingClientRect());
    const bounds = {
      left:Math.max(12,Math.min(...rectangles.map(r=>r.left))-18),
      top:Math.max(80,Math.min(...rectangles.map(r=>r.top))-24),
      right:Math.min(innerWidth-12,Math.max(...rectangles.map(r=>r.right))+18),
      bottom:Math.min(innerHeight-80,Math.max(...rectangles.map(r=>r.bottom))+18)
    };
    const width = bounds.right-bounds.left, height = bounds.bottom-bounds.top;
    const actor=document.createElement('div'); actor.className='assembly-actor transition-actor';
    actor.innerHTML='<svg viewBox="0 0 25 29"><path d="M5 3Q3 2 3 5l1 17q.2 3 2.5 1l4-5 7-2q3-.8.5-3Z"/></svg><span>Maker</span>';
    layer.append(actor);
    const at=(x,y)=>`translate(${x}px,${y}px)`;
    const start=at(bounds.left,bounds.top), end=at(bounds.right,bounds.bottom);
    const approach=animate(actor,[{opacity:0,transform:at(targetX||bounds.left-60,targetY||bounds.top-40)},{opacity:1,transform:start}],{duration:240,easing:'cubic-bezier(.22,.8,.3,1)'});
    await wait(approach); if(cancelled||id!==transitionId)return;
    const marquee=document.createElement('div'); marquee.className='transition-marquee';
    Object.assign(marquee.style,{left:`${bounds.left}px`,top:`${bounds.top}px`});
    marquee.innerHTML='<i class="tl"></i><i class="tr"></i><i class="bl"></i><i class="br"></i>';
    layer.append(marquee); actor.classList.add('is-pressing');
    document.dispatchEvent(new CustomEvent('studio:sound',{detail:{kind:'frame',source:'animation'}}));
    const guides=outgoingSections.map(guide);
    guides.forEach((box,i)=>{
      const r=rectangles[i];
      const covered=Math.max((Math.min(r.right,bounds.right)-bounds.left)/width,(Math.min(r.bottom,bounds.bottom)-bounds.top)/height);
      animate(box,[{opacity:0},{opacity:1}],{delay:Math.max(0,covered*560-65),duration:90,easing:'ease-out'});
    });
    animate(marquee,[{width:'0px',height:'0px',backgroundColor:'#4b8ff708'},{width:`${width}px`,height:`${height}px`,backgroundColor:'#4b8ff714'}],{duration:560,easing:'cubic-bezier(.4,0,.2,1)'});
    await wait(animate(actor,[{transform:start},{transform:end}],{duration:560,easing:'cubic-bezier(.4,0,.2,1)'}));
    if(cancelled||id!==transitionId)return;
    actor.classList.remove('is-pressing');
    document.dispatchEvent(new CustomEvent('studio:sound',{detail:{kind:'frame-end',source:'animation'}}));
    marquee.classList.add('is-selected');
    const grabX=bounds.left+width*.6, grabY=bounds.top+height*.45;
    await wait(animate(actor,[{transform:end},{transform:at(grabX,grabY)}],{delay:100,duration:180,easing:'cubic-bezier(.22,.8,.3,1)'}));
    if(cancelled||id!==transitionId)return;
    actor.classList.add('is-pressing');
    document.dispatchEvent(new CustomEvent('studio:sound',{detail:{kind:'grab',source:'animation'}}));
    actor.querySelector('svg').innerHTML='<path d="M8 14V6a2 2 0 0 1 4 0v6-8a2 2 0 0 1 4 0v9-6a2 2 0 0 1 4 0v10c0 5-3 8-7 8h-1c-3 0-5-2-7-5L2 15a2 2 0 0 1 3-2l3 3Z"/>';
    const travel=direction>0?-(bounds.right+60):innerWidth-bounds.left+60;
    const exitOptions={duration:460,easing:'cubic-bezier(.65,0,.35,1)'};
    outgoingSections.forEach((el,i)=>{
      const transform=getComputedStyle(el).transform, base=transform==='none'?'':transform+' ';
      animate(el,[{transform:base+'translateX(0)',opacity:1},{transform:base+`translateX(${travel}px)`,opacity:1}],exitOptions);
      animate(guides[i],[{transform:'translateX(0)'},{transform:`translateX(${travel}px)`}],exitOptions);
    });
    animate(marquee,[{transform:'translateX(0)'},{transform:`translateX(${travel}px)`}],exitOptions);
    await wait(animate(actor,[{transform:at(grabX,grabY)},{transform:at(grabX+travel,grabY)}],exitOptions));
    if(cancelled||id!==transitionId)return;
    document.dispatchEvent(new CustomEvent('studio:sound',{detail:{kind:'drop',source:'animation'}}));
    guides.forEach(box=>box.remove());marquee.remove();actor.remove();
    commit();
    cleanup();
    // Reuse the original cursor-led drawing, typing, and placement timeline.
    enterPage(false);
  };
  document.querySelector('.avatar-mark').title='Replay the canvas entrance';
  document.querySelector('.avatar-mark').addEventListener('click',event=>{if(document.querySelector('.home-view')?.hidden===false){event.preventDefault();interacted=false;enterPage(true)}});
  async function startInitialEntrance() {
    const loaded = document.readyState === 'complete' ? Promise.resolve() : new Promise(resolve => addEventListener('load', resolve, {once:true}));
    const photo = document.querySelector('.portrait-photo');
    const imageReady = photo?.decode ? photo.decode().catch(() => {}) : Promise.resolve();
    // A cold Safari visit must measure the same font, image, and viewport as a refresh.
    await Promise.race([
      loaded.then(() => Promise.all([document.fonts?.ready || Promise.resolve(), imageReady])),
      new Promise(resolve => setTimeout(resolve, 4000))
    ]);
    let last = '', stable = 0;
    const deadline = performance.now() + 800;
    while (stable < 3 && performance.now() < deadline) {
      await new Promise(resolve => requestAnimationFrame(resolve));
      const hero = document.querySelector('.hello-card').getBoundingClientRect();
      const portrait = document.querySelector('.portrait-bubble').getBoundingClientRect();
      const layout = [innerWidth,innerHeight,hero.x,hero.y,hero.width,hero.height,portrait.x,portrait.y,portrait.width,portrait.height].map(Math.round).join(',');
      stable = layout === last ? stable + 1 : 0; last = layout;
    }
    root.classList.remove('motion-pending');
    if (!interacted) enterPage(true);
  }
  startInitialEntrance();

  const knownNodes = new Set([...document.querySelectorAll('[data-node]')].map(el=>el.dataset.node));
  const nodeObserver = new MutationObserver(records=>{
    for (const record of records) for (const el of record.addedNodes) {
      if (!(el instanceof HTMLElement) || !el.dataset.node || knownNodes.has(el.dataset.node)) continue;
      knownNodes.add(el.dataset.node);
      if (!reduced.matches) el.animate([{opacity:.3,scale:.75},{opacity:1,scale:1.05,offset:.7},{opacity:1,scale:1}],{duration:300,easing:'cubic-bezier(.22,.8,.3,1)'});
    }
  });
  document.querySelectorAll('.annotations').forEach(el=>nodeObserver.observe(el,{childList:true}));
  document.addEventListener('click',e=>{
    const button=e.target.closest('.tool-button,.notes-button,.theme-toggle,.pill');
    if (!button || reduced.matches) return;
    button.animate([{scale:1},{scale:.93,offset:.3},{scale:1.04,offset:.7},{scale:1}],{duration:240,easing:'ease-out'});
  });

  const cursor=document.createElement('div');cursor.className='studio-cursor';cursor.setAttribute('aria-hidden','true');
  cursor.innerHTML='<svg viewBox="0 0 25 29"><path d="M5 3Q3 2 3 5l1 17q.2 3 2.5 1l4-5 7-2q3-.8.5-3Z"/></svg><span class="studio-cursor-label">Maker</span>';
  document.body.append(cursor);
  function syncInputCursor() {
    const editing = document.activeElement?.matches('input,textarea,select,[contenteditable=true],#docs-preview-mount');
    root.classList.toggle('native-cursor', !!editing);
    if (editing) cursor.classList.remove('is-visible');
  }
  document.addEventListener('focusin', syncInputCursor);
  document.addEventListener('focusout', () => requestAnimationFrame(syncInputCursor));

  const label=cursor.querySelector('span');
  const pointerIcons={
    move:'<path d="M5 3Q3 2 3 5l1 17q.2 3 2.5 1l4-5 7-2q3-.8.5-3Z"/>',
    frame:'<rect x="3" y="3" width="18" height="18" rx="3" fill="none"/><path d="M8 3v18M3 8h18" fill="none"/>',
    pen:'<path d="m4 23 2-7L18 4l5 5-12 12Z"/><path d="m15 7 5 5" fill="none"/>',
    text:'<path d="M5 7V4h15v3M12.5 4v20m-4 0h8" fill="none"/>',
    comment:'<path d="M4 4h17v15H11l-6 6v-6H4Z"/>',
    sticker:'<path d="m12 2 4 7 8 1-6 6 1 9-7-4-7 4 1-9-5-6 8-1Z"/>'
  };
  pointerIcons.hand='<path d="M7 15 5 8q-.5-3 2-3 2 0 2.5 3l1 5-1-8q-.3-3 2-3 2.5 0 2.5 3l.5 7V5q0-3 2.3-2.5Q19 2.5 19 6v7l1-5q.5-2.5 2.5-2 2 .5 1.5 3l-1.5 12q-.8 6-7 6h-2q-4 0-6.5-3l-5-6q-1.5-2 .3-3.2 1.7-1 3.2 1l2 2Z"/>' ;
  pointerIcons.closedHand='<path d="M7 15v-4q0-2 2-2t2 2v-1q0-2 2-2t2 2v1q0-2 2-2t2 2v1q0-2 2-2t2 2v7q0 5-5 7h-7q-4-1-6-4l-3-4q-1-2 1-3t3 1l3 3"/><path d="m8 15 5 1q4 1 2 4-2 2-5 0m1-9v3m4-3v3m4-2v3" fill="none"/>';
  let grabbing=false;
  function showPointerIcon(icon){if(lastIcon!==icon){cursor.querySelector('svg').innerHTML=pointerIcons[icon]||pointerIcons.move;lastIcon=icon;cursor.dataset.icon=icon;}}
  document.addEventListener('studio:grab',event=>{grabbing=event.detail.active;showPointerIcon(grabbing?'closedHand':'hand');});
  let lastIcon='',lastX=0,lastY=0,lastSpark=0,pressed=false,raf=0,targetX=0,targetY=0;
  const sparkColors=['#c5dcff','#e4daf8','#d0ede1','#f6dce6','#f8edbb'];
  const lightSparkColors=['#6599e5','#ac7fcf','#55a98d','#d984b2','#d2ad42'];
  const sparks=new Set();
  function sparkle(x,y,burst=false) {
    if (sparks.size>=28 || reduced.matches) return;
    const spark=document.createElement('i');spark.className='cursor-sparkle';spark.setAttribute('aria-hidden','true');
    spark.style.left=`${x}px`;spark.style.top=`${y}px`;
    spark.style.setProperty('--spark-size',`${burst?12+Math.random()*9:7+Math.random()*9}px`);
    spark.style.setProperty('--spark-color',(root.dataset.theme==='light'?lightSparkColors:sparkColors)[Math.floor(Math.random()*sparkColors.length)]);
    spark.style.setProperty('--spark-x',`${(Math.random()-.5)*32}px`);spark.style.setProperty('--spark-y',`${8+Math.random()*24}px`);
    sparks.add(spark);document.body.append(spark);
    setTimeout(()=>{spark.remove();sparks.delete(spark)},700);
  }
  function resetCursor() {
    root.classList.remove('has-studio-cursor','native-cursor');cursor.classList.remove('is-visible');
    if(reduced.matches || !fine.matches){sparks.forEach(el=>el.remove());sparks.clear()}
  }
  document.addEventListener('pointermove',event=>{
    if (event.pointerType==='touch' || reduced.matches || !fine.matches) { resetCursor();return; }
    const native=!!event.target.closest('input,textarea,select,[contenteditable=true],dialog,#docs-preview-mount');
    root.classList.add('has-studio-cursor');root.classList.toggle('native-cursor',native);
    cursor.classList.toggle('is-visible',!native);
    if(native)return;
    targetX=event.clientX;targetY=event.clientY;
    if(!raf)raf=requestAnimationFrame(()=>{cursor.style.transform=`translate3d(${targetX}px,${targetY}px,0)`;raf=0});
    const currentTool=document.body.dataset.tool||'move';
    const link=event.target.closest('a,button,[role=button]');
    const drawing=currentTool!=='move' && !!event.target.closest('#tool-surface,.page-view');
    const overControl=!!event.target.closest('a,button,[role=button],input,textarea,select,[contenteditable=true]');
    const editable=event.target.closest('.canvas-text-content,.canvas-comment .comment-body p');
    const draggableComment=event.target.closest('.canvas-comment .comment-body,.canvas-object button');
    const icon=grabbing?'closedHand':event.target.closest('.canvas-remove')?'move':editable?'text':draggableComment?'hand':drawing?currentTool:(!overControl&&event.target.closest('.movable,.canvas-object,.pill-tray')?'hand':'move');
    showPointerIcon(icon);
    cursor.classList.toggle('is-link',!!link);cursor.classList.toggle('is-drawing',drawing);
    cursor.classList.toggle('label-left',targetX>innerWidth-140);cursor.classList.toggle('label-up',targetY>innerHeight-80);
    label.textContent='Maker';
    const now=performance.now();
    if(!pressed && now-lastSpark>45 && Math.hypot(targetX-lastX,targetY-lastY)>18){sparkle(targetX,targetY);lastX=targetX;lastY=targetY;lastSpark=now}
  },{passive:true});
  document.addEventListener('pointerdown',e=>{pressed=true;cursor.classList.add('is-pressed');if(!fine.matches||reduced.matches||root.classList.contains('native-cursor'))return;for(let i=0;i<4;i++)sparkle(e.clientX+(Math.random()-.5)*18,e.clientY+(Math.random()-.5)*18,true)},{passive:true});
  document.addEventListener('pointerup',()=>{pressed=false;cursor.classList.remove('is-pressed')},{passive:true});
  document.addEventListener('pointercancel',()=>{pressed=false;resetCursor()});
  document.addEventListener('pointerout',e=>{if(!e.relatedTarget)resetCursor()});
  document.addEventListener('keydown',()=>cursor.classList.remove('is-visible'));
  addEventListener('blur',()=>{pressed=false;grabbing=false;resetCursor()});
  reduced.addEventListener('change',()=>{resetCursor();clearGalleryMotion();clearAssembly();entranceAnimations.forEach(a=>a.cancel())});
  fine.addEventListener('change',resetCursor);
})();
