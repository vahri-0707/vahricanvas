(() => {
  const card=document.querySelector('.more-music'),button=card?.querySelector('.playlist-play'),panel=card?.querySelector('.more-player'),state=card?.querySelector('.playlist-state');
  if(!card)return;
  let controller=null,apiStarted=false,ready=false,pendingPlay=false,fallbackTimer;
  const playlist='https://open.spotify.com/playlist/6yhMQJRkJN6nZE0iV7P7aE';
  function showPlayer(){panel.hidden=false;button.setAttribute('aria-expanded','true');}
  button.setAttribute('aria-controls','personal-player');button.setAttribute('aria-expanded','false');
  function fallback(){
    if(controller||panel.querySelector('iframe'))return;
    clearTimeout(fallbackTimer);
    const iframe=document.createElement('iframe');iframe.src='https://open.spotify.com/embed/playlist/6yhMQJRkJN6nZE0iV7P7aE?utm_source=generator&theme=0';iframe.title='Vahri’s Spotify playlist';iframe.allow='autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';iframe.width='100%';iframe.height='152';
    panel.querySelector('#personal-spotify-mount')?.replaceChildren(iframe);
    state.textContent='Choose a track below.';
  }
  window.onSpotifyIframeApiReady=api=>{
    clearTimeout(fallbackTimer);
    const mount=document.getElementById('personal-spotify-mount');
    if(mount.querySelector('iframe'))return;
    api.createController(mount,{url:playlist+'?theme=0',width:'100%',height:152},embed=>{
      controller=embed;
      embed.addListener('ready',()=>{ready=true;if(pendingPlay){pendingPlay=false;embed.togglePlay();state.textContent='Choose a track below.';}});
      embed.addListener('playback_update',event=>{
        const playing=!event.data.isPaused;
        card.classList.toggle('is-playing',playing);
        button.setAttribute('aria-pressed',String(playing));button.setAttribute('aria-label',playing?'Pause playlist':'Play playlist');
        state.textContent=event.data.isBuffering?'Finding your groove…':playing?'Playing your soundtrack.':'Press play. Stay a while.';
      });
      const iframe=panel.querySelector('iframe');if(iframe)iframe.title='Vahri’s Spotify playlist';
    });
  };
  function loadApi(){
    if(apiStarted)return;apiStarted=true;
    const script=document.createElement('script');script.src='https://open.spotify.com/embed/iframe-api/v1';script.async=true;script.onerror=fallback;document.body.append(script);
    fallbackTimer=setTimeout(fallback,12000);
  }
  button.addEventListener('click',()=>{
    showPlayer();
    if(controller&&ready){controller.togglePlay();return;}
    if(panel.querySelector('iframe')&&!controller){state.textContent='Choose a track below.';return;}
    pendingPlay=true;state.textContent='Loading your soundtrack…';loadApi();
  });
  card.querySelector('.player-close').addEventListener('click',()=>{panel.hidden=true;button.setAttribute('aria-expanded','false');button.focus();});
})();
