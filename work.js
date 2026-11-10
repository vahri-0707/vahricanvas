(() => {
  // The project is one extra item in the main navigation; its shortcuts stay with the title.
  const pageMenu=document.getElementById('page-menu');
  const projectDivider=document.createElement('span');projectDivider.className='project-nav-divider';projectDivider.setAttribute('aria-hidden','true');projectDivider.hidden=true;
  const projectLink=document.createElement('a');projectLink.className='project-nav-link';projectLink.href='#kantong';projectLink.textContent='Kantong';projectLink.hidden=true;
  pageMenu.append(projectDivider,projectLink);
  projectLink.addEventListener('click',()=>{if(typeof setPageMenu==='function')setPageMenu(false);});
  const projectHeaders=[...document.querySelectorAll('[data-view^="kantong"] .case-heading')];
  projectHeaders.forEach(header=>{
    if (header.querySelector('.project-section-links')) return;
    const nav=document.createElement('nav');nav.className='case-nav project-section-links';nav.setAttribute('aria-label','Explore this project');
    nav.innerHTML=`<button class="pill blue" type="button" data-project-jump="project-about">About the project</button><button class="pill lilac" type="button" data-project-jump="project-app">The app</button><a class="pill yellow" href="#kantong-flows">Flows <span aria-hidden="true">↗</span></a><a class="pill pink" href="#kantong-prototype">Prototype <span aria-hidden="true">↗</span></a>`;
    header.append(nav);
  });
  const projectPage=document.querySelector('[data-view="kantong"]'),reducedMotion=matchMedia('(prefers-reduced-motion:reduce)');
  let currentProjectView='',pendingSection=null,scrollFrame=0;
  function projectHeaderOffset(){return Math.max(110,document.querySelector('.page-navigation').getBoundingClientRect().bottom+24);}
  function highlightProjectSection(){
    scrollFrame=0;let section='project-about';
    if(currentProjectView==='kantong'){
      const line=projectHeaderOffset()+90;
      ['project-about','project-app'].forEach(id=>{if(document.getElementById(id).getBoundingClientRect().top<=line)section=id;});
    }
    projectHeaders.forEach(header=>{
      header.querySelectorAll('[data-project-jump]').forEach(button=>{if(currentProjectView==='kantong'&&button.dataset.projectJump===section)button.setAttribute('aria-current','location');else button.removeAttribute('aria-current');});
      header.querySelectorAll('.project-section-links>a').forEach(link=>{if(link.getAttribute('href')===`#${currentProjectView}`)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
    });
  }
  function jumpToProjectSection(id){
    if(projectPage.hidden){pendingSection=id;if(location.hash!=='#kantong')location.hash='kantong';return;}
    const target=document.getElementById(id);if(!target)return;
    projectPage.scrollTo({top:Math.max(0,projectPage.scrollTop+target.getBoundingClientRect().top-projectPage.getBoundingClientRect().top-projectHeaderOffset()),behavior:reducedMotion.matches?'instant':'smooth'});
    const heading=target.querySelector('h2')||target;heading.tabIndex=-1;heading.focus({preventScroll:true});
  }
  projectHeaders.forEach(header=>header.querySelectorAll('[data-project-jump]').forEach(button=>button.addEventListener('click',()=>jumpToProjectSection(button.dataset.projectJump))));
  function syncProjectNavigation(){
    const next=document.querySelector('.page-view:not([hidden])')?.dataset.view||'';
    if(next===currentProjectView)return;currentProjectView=next;
    const detail=next==='kantong'||next==='kantong-flows'||next==='kantong-prototype';
    projectDivider.hidden=!detail;projectLink.hidden=!detail;document.body.classList.toggle('has-project-navigation',detail);
    if(detail){projectLink.setAttribute('aria-current','page');pageMenu.querySelector('[data-page="work"]').removeAttribute('aria-current');}
    else projectLink.removeAttribute('aria-current');
    highlightProjectSection();
    if(next==='kantong'&&pendingSection){const id=pendingSection;pendingSection=null;requestAnimationFrame(()=>jumpToProjectSection(id));}
  }
  new MutationObserver(syncProjectNavigation).observe(document.getElementById('page-content'),{subtree:true,attributes:true,attributeFilter:['hidden']});
  projectPage.addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(highlightProjectSection);},{passive:true});
  syncProjectNavigation();
  // Match the Documentation cards: a pointer-following note with gently typed copy.
  document.querySelectorAll('[data-work-hover]').forEach(link=>{
    const note=link.querySelector('.work-hover-note'),copy=note.querySelector('p');
    const reduced=matchMedia('(prefers-reduced-motion:reduce)'),fine=matchMedia('(hover:hover) and (pointer:fine)');
    let timer=0,active=false;
    function stop(){active=false;clearTimeout(timer);}
    function describe(){
      clearTimeout(timer);const text=copy.dataset.hoverDescription;let length=0;active=true;
      if(reduced.matches||!fine.matches){copy.textContent=text;return;}
      copy.textContent='';
      const type=()=>{if(!active)return;copy.textContent=text.slice(0,++length);if(length<text.length)timer=setTimeout(type,23);};
      timer=setTimeout(type,140);
    }
    function move(event){
      if(event.pointerType==='touch'||!fine.matches)return;
      const rect=link.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;
      const half=Math.min(120,(rect.width-32)/2);
      link.style.setProperty('--hover-x',Math.max(half+12,Math.min(rect.width-half-12,x))+'px');
      link.style.setProperty('--hover-y',Math.max(note.offsetHeight+24,Math.min(rect.height-12,y-14))+'px');
    }
    link.addEventListener('pointerenter',event=>{if(event.pointerType==='touch'||!fine.matches)return;move(event);describe();});
    link.addEventListener('pointermove',move);link.addEventListener('pointerleave',stop);
    link.addEventListener('focus',describe);link.addEventListener('blur',stop);
    addEventListener('hashchange',stop);
  });
  const screens = [...document.querySelectorAll('[data-screen]')];
  const dialog = document.createElement('dialog');
  dialog.className = 'work-lightbox';
  dialog.setAttribute('aria-labelledby', 'work-lightbox-title');
  dialog.innerHTML = `
    <figure class="work-lightbox-preview">
      <img class="work-lightbox-image" alt="">
      <figcaption id="work-lightbox-title" aria-live="polite"></figcaption>
    </figure>
    <button type="button" class="work-lightbox-close" aria-label="Close screen preview" autofocus>×</button>
    <button type="button" class="work-lightbox-arrow" data-direction="-1" aria-label="Previous screen">←</button>
    <button type="button" class="work-lightbox-arrow" data-direction="1" aria-label="Next screen">→</button>`;
  document.body.append(dialog);
  const preview = dialog.querySelector('figure');
  const image = preview.querySelector('img');
  const caption = preview.querySelector('figcaption');
  const close = dialog.querySelector('.work-lightbox-close');
  const previous = dialog.querySelector('[data-direction="-1"]');
  const next = dialog.querySelector('[data-direction="1"]');
  let group = [], index = 0, trigger;

  function showScreen() {
    const item = group[index];
    const thumbnail = item.querySelector('img');
    image.src = thumbnail.currentSrc || thumbnail.src;
    image.classList.toggle('is-kantong-screen', Boolean(thumbnail.closest('.kantong-capture')));
    image.alt = thumbnail.alt;
    caption.textContent = item.dataset.caption;
    previous.disabled = index === 0;
    next.disabled = index === group.length - 1;
    if (document.activeElement === previous && previous.disabled) (next.disabled ? close : next).focus();
    if (document.activeElement === next && next.disabled) (previous.disabled ? close : previous).focus();
  }

  function step(direction) {
    const target = index + direction;
    if (target < 0 || target >= group.length) return;
    index = target;
    showScreen();
  }

  screens.forEach(button => button.addEventListener('click', () => {
    trigger = button;
    trigger.focus({preventScroll: true});
    const region = button.closest('.kantong-strip') || button.closest('.page-view');
    group = [...region.querySelectorAll('[data-screen]')];
    index = group.indexOf(button);
    showScreen();
    dialog.showModal();
  }));
  close.addEventListener('click', () => dialog.close());
  previous.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      dialog.close();
      return;
    }
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    step(event.key === 'ArrowRight' ? 1 : -1);
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => trigger?.focus({preventScroll: true}));
  addEventListener('hashchange', () => dialog.close());
  document.querySelectorAll('[data-jump]').forEach(button=>button.addEventListener('click',()=>{const target=document.getElementById(button.dataset.jump);const page=target.closest('.page-view');page.scrollTo({top:target.getBoundingClientRect().top-page.getBoundingClientRect().top+page.scrollTop-115,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}));
  const cover = document.querySelector('.kantong-brand-cover');
  if (cover && !reducedMotion.matches) {
    const motionButton = cover.querySelector('.kantong-cover-motion');
    const observer = new IntersectionObserver(([entry]) => {
      cover.classList.toggle('is-in-view', entry.isIntersecting);
    }, { threshold: 0.3 });
    observer.observe(cover);
    motionButton.hidden = false;
    motionButton.addEventListener('click', () => {
      const paused = cover.classList.toggle('is-paused');
      motionButton.setAttribute('aria-pressed', String(paused));
    });
  }
})();
