(() => {
  const page=document.querySelector('[data-view="gallery"]');
  if(!page)return;
  const $=selector=>page.querySelector(selector);
  const url=new URL(location.href);
  const isDetail=url.searchParams.get('design')==='new-project';
  $('.gallery-index').hidden=isDetail;
  $('.gallery-detail').hidden=!isDetail;
  if(url.searchParams.has('component')){
    for(const key of ['component','variant','appearance','color','shade','textColor','textShade','radius','iconPosition','icon','label','loading','disabled'])url.searchParams.delete(key);
    history.replaceState(null,'',url);
  }
  function sizeThumbnail(){
    page.querySelectorAll('.gallery-card-preview').forEach(card=>{
      const scale=Math.min(card.clientWidth/1116,card.clientHeight/725);
      card.style.setProperty('--thumbnail-scale',String(Math.max(.1,scale)));
    });
  }
  const observer=new ResizeObserver(sizeThumbnail);
  page.querySelectorAll('.gallery-card-preview').forEach(card=>observer.observe(card));
  sizeThumbnail();
  const liveStage=page.querySelector(".gallery-detail-stage");
  if(liveStage){const sizeCanvas=()=>liveStage.style.setProperty("--preview-scale",String(liveStage.clientWidth/1116));new ResizeObserver(sizeCanvas).observe(liveStage);sizeCanvas();}
  // Hover descriptions follow the pointer, with the same gentle canvas motion.
  page.querySelectorAll('.gallery-card-link').forEach(link=>{
    const card=link.querySelector('.gallery-card-preview'),note=link.querySelector('.gallery-hover-note'),copy=note?.querySelector('p');
    if(!note||!copy)return;
    let timer=0,active=false;
    const reduced=matchMedia('(prefers-reduced-motion:reduce)');
    function describe(){
      clearTimeout(timer);const text=copy.dataset.hoverDescription;let length=0;
      if(reduced.matches){copy.textContent=text;return;}
      copy.textContent='';
      function type(){if(!active)return;copy.textContent=text.slice(0,++length);if(length<text.length)timer=setTimeout(type,23);}
      timer=setTimeout(type,140);
    }
    function move(event){
      if(event.pointerType==='touch')return;
      const rect=card.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;
      card.style.setProperty('--hover-x',Math.max(136,Math.min(rect.width-136,x))+'px');
      card.style.setProperty('--hover-y',Math.max(174,note.offsetHeight+16,Math.min(rect.height-12,y-14))+'px');
      if(!reduced.matches){card.style.setProperty('--hover-rx',((.5-y/rect.height)*5)+'deg');card.style.setProperty('--hover-ry',((x/rect.width-.5)*5)+'deg');}
    }
    link.addEventListener('pointerenter',event=>{if(event.pointerType==='touch')return;active=true;move(event);describe();});
    link.addEventListener('pointermove',move);
    link.addEventListener('pointerleave',()=>{active=false;clearTimeout(timer);card.style.setProperty('--hover-rx','0deg');card.style.setProperty('--hover-ry','0deg');});
    link.addEventListener('focus',()=>{active=true;describe();});
    link.addEventListener('blur',()=>{active=false;clearTimeout(timer);});
  });
  if(!isDetail)return;
  document.querySelectorAll('a[data-page="gallery"],a[href="#documentation"]').forEach(link=>link.setAttribute('href','./#documentation'));
  document.title='New project modal · Vahri’s studio';
  const preview=$('#gallery-live-preview');
  let previewTheme=document.documentElement.dataset.theme==='light'?'light':'dark';
  const themeButtons=[...page.querySelectorAll('[data-gallery-theme]')];
  function syncPreviewTheme(){
    $('.gallery-detail-stage').dataset.previewTheme=previewTheme;
    themeButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.galleryTheme===previewTheme)));
    preview.contentWindow?.postMessage({type:'gallery-preview-theme',theme:previewTheme},location.origin);
    $('#gallery-usage-code').textContent=`import NewProjectDemo from "./components/NewProjectModal";\n\nexport default function App() {\n  return <NewProjectDemo theme="${previewTheme}" />;\n}`;
  }
  themeButtons.forEach(button=>button.addEventListener('click',()=>{previewTheme=button.dataset.galleryTheme;syncPreviewTheme();}));
  preview.addEventListener('load',syncPreviewTheme);
  preview.src='gallery/new-project/preview.html?v=figma-canvas&theme='+previewTheme;
  syncPreviewTheme();
  let source='';
  const copyButtons=[...page.querySelectorAll('[data-copy-design]')];
  copyButtons.forEach(button=>button.disabled=true);
  fetch('gallery/new-project/NewProjectModal.tsx?v=figma-canvas').then(response=>{
    if(!response.ok)throw new Error('Source unavailable');
    return response.text();
  }).then(text=>{
    source=text;$('#gallery-source-code').textContent=text;
    copyButtons.forEach(button=>button.disabled=false);
  }).catch(()=>{
    $('#gallery-source-code').textContent='The source could not load. Download the files to get the complete React component.';
    $('#gallery-status').textContent='Component source could not load. You can still download the files.';
  });
  $('#gallery-view-code').addEventListener('click',()=>{
    $('#gallery-code').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});
    $('#gallery-code pre').focus({preventScroll:true});
  });
  $('#gallery-reset').addEventListener('click',()=>{preview.src='gallery/new-project/preview.html?v=figma-canvas&theme='+previewTheme+'&reset='+Date.now();});
  copyButtons.forEach(button=>button.addEventListener('click',async()=>{
    if(!source)return;
    try{
      await navigator.clipboard.writeText(source);
      $('#gallery-status').textContent='React and Tailwind code copied.';
      button.textContent='Copied ✓';
      if(typeof toast==='function')toast('React + Tailwind code copied.');
      setTimeout(()=>{button.textContent='Copy code'},1800);
    }catch{
      $('#gallery-code').scrollIntoView({block:'start'});
      const selection=getSelection(),range=document.createRange();range.selectNodeContents($('#gallery-source-code'));selection.removeAllRanges();selection.addRange(range);
      $('#gallery-status').textContent='Code selected. Press Command+C or Ctrl+C to copy.';
    }
  }));
})();
