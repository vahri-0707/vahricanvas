(() => {
  const toggle=document.querySelector('#sound-toggle');
  let muted=false,context=null,master=null,compressor=null,lastHover=0,liveTool=null,lastPoint=null,keyIndex=0,pencilOffset=0,busyUntil=0,busyPriority=-1,busySource=null;
  const buffers={},activeVoices=new Set();
  const sampleFiles={draw:"audio/pencil-paper.wav",key0:"audio/key-0.wav",key1:"audio/key-1.wav",key2:"audio/key-2.wav"};
  const sampleBytes=Object.fromEntries(Object.entries(sampleFiles).map(([key,url])=>[key,fetch(url).then(r=>{if(!r.ok)throw new Error("Audio load");return r.arrayBuffer();}).catch(()=>null)]));
  let decoding=null;
  const lastPlayed=new Map(),cooldown={hover:90,click:45,grab:70,drop:70,frame:100,'frame-end':90,type:48,draw:70,place:90,comment:100};
  try{muted=localStorage.getItem('vahri-interaction-sounds')==='muted';}catch{}
  function sync(){toggle.setAttribute('aria-pressed',String(muted));toggle.setAttribute('aria-label',muted?'Unmute interaction sounds':'Mute interaction sounds');toggle.title=toggle.getAttribute('aria-label');if(master)master.gain.setTargetAtTime(muted?0:.9,context.currentTime,.01);}
  sync();
  async function unlock(){
    if(muted)return;
    try{
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
      if(!context){
        context=new Audio();master=context.createGain();master.gain.value=.9;
        compressor=context.createDynamicsCompressor();compressor.threshold.value=-10;compressor.knee.value=10;compressor.ratio.value=5;compressor.attack.value=.003;compressor.release.value=.1;
        compressor.connect(master);master.connect(context.destination);

      }
      if(context.state==='suspended')await context.resume();
      decoding ||= Promise.all(Object.entries(sampleBytes).map(async([key,promise])=>{const bytes=await promise;if(bytes)try{buffers[key]=await context.decodeAudioData(bytes);}catch{}}));
      await decoding;
      document.documentElement.dataset.soundReady=String(context.state==='running');
      document.documentElement.dataset.soundSamples=String(Object.keys(buffers).length);
    }catch{}
  }
  // One palette is shared by real tools and cursor-led demonstrations.
  const voices={
    hover:[{from:1046,to:1175,length:.075,volume:.10,type:'sine'}],
    click:[{from:740,to:540,length:.10,volume:.18,type:'sine'},{from:1108,to:988,delay:.035,length:.08,volume:.065,type:'sine'}],
    grab:[{from:260,to:420,length:.14,volume:.17,type:'sine'}],
    drop:[{from:620,to:440,length:.13,volume:.16,type:'sine'}],
    frame:[{from:350,to:520,length:.105,volume:.13,type:'triangle'}],
    'frame-end':[{from:520,to:780,length:.14,volume:.18,type:'sine'}],
    place:[{from:480,to:950,length:.11,volume:.20,type:'sine'},{from:1200,to:980,delay:.035,length:.13,volume:.07,type:'sine'}],
    comment:[{from:660,to:660,length:.10,volume:.16,type:'sine'},{from:990,to:1100,delay:.075,length:.16,volume:.14,type:'sine'}]
  };
  function play(kind,source='user'){
    if(source==='animation')return;
    if(muted||!context||context.state!=='running'||document.hidden)return;
    const stamp=performance.now();if(stamp-(lastPlayed.get(kind)||-Infinity)<(cooldown[kind]||70))return;lastPlayed.set(kind,stamp);
    const now=context.currentTime,priority=({'frame-end':4,place:4,comment:4,grab:4,drop:4,type:3,draw:3,frame:1,click:3,hover:0})[kind]||0;
    if(now<busyUntil){
      if(!(source==='user'&&busySource==='animation')&&priority<=busyPriority)return;
      for(const voice of activeVoices){voice.gain.gain.cancelScheduledValues(now);voice.gain.gain.setTargetAtTime(.0001,now,.003);try{voice.node.stop(now+.012);}catch{}}
    }
    const at=now+.012;
    function register(node,gain,end){
      const voice={node,gain};activeVoices.add(voice);node.onended=()=>{node.disconnect();gain.disconnect();activeVoices.delete(voice);};
      busyUntil=Math.max(at,end+.018);busyPriority=priority;busySource=source;
    }
    if(kind==='draw'||kind==='type'){
      const buffer=kind==='draw'?buffers.draw:buffers['key'+(keyIndex++%3)];if(!buffer)return;
      const sample=context.createBufferSource(),gain=context.createGain();sample.buffer=buffer;
      const duration=kind==='draw'?.18:buffer.duration;
      const offset=kind==='draw'?pencilOffset:0;if(kind==='draw')pencilOffset=(pencilOffset+.19)%(buffer.duration-.2);
      gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(kind==='draw'?1.1:1.25,at+.004);gain.gain.setValueAtTime(kind==='draw'?1.1:1.25,at+duration-.012);gain.gain.linearRampToValueAtTime(0,at+duration);
      sample.connect(gain);gain.connect(compressor);register(sample,gain,at+duration);sample.start(at,offset,duration);sample.stop(at+duration+.005);
    }else{
      if(!voices[kind])return;
      for(const voice of voices[kind]){
        const oscillator=context.createOscillator(),gain=context.createGain(),start=at+(voice.delay||0);
        oscillator.type=voice.type;oscillator.frequency.setValueAtTime(voice.from,start);oscillator.frequency.exponentialRampToValueAtTime(voice.to,start+voice.length);
        gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(voice.volume,start+.004);gain.gain.exponentialRampToValueAtTime(.0001,start+voice.length);
        oscillator.connect(gain);gain.connect(compressor);register(oscillator,gain,start+voice.length);oscillator.start(start);oscillator.stop(start+voice.length+.015);
      }
    }
    document.documentElement.dataset.soundEvent=kind;document.documentElement.dataset.soundSource=source;
  }
  document.addEventListener('studio:sound',event=>play(event.detail.kind,event.detail.source||'user'));
  document.addEventListener('pointerdown',event=>{
    unlock();
    if(event.button!==0||!event.target.closest('#tool-surface'))return;
    const tool=document.body.dataset.tool;if(!['frame','pen'].includes(tool))return;
    liveTool=tool==='pen'?'draw':'frame';lastPoint={x:event.clientX,y:event.clientY};unlock().then(()=>{if(liveTool)play(liveTool);});
  },{capture:true,passive:true});
  document.addEventListener('pointermove',event=>{
    if(!liveTool||!lastPoint||Math.hypot(event.clientX-lastPoint.x,event.clientY-lastPoint.y)<2)return;
    lastPoint={x:event.clientX,y:event.clientY};play(liveTool);
  },{capture:true,passive:true});
  const stopTool=()=>{liveTool=null;lastPoint=null;};
  document.addEventListener('pointerup',stopTool,{capture:true,passive:true});document.addEventListener('pointercancel',stopTool,{capture:true,passive:true});addEventListener('blur',stopTool);
  document.addEventListener('keydown',event=>{if(!event.repeat)unlock();},{capture:true});
  document.addEventListener('input',event=>{
    if(event.isComposing||!event.target.matches('textarea,input[type=text],input:not([type]),[contenteditable=true]'))return;
    play('type');
  },{capture:true,passive:true});
  const controlSelector='button,a[href],[role=button]';
  document.addEventListener('pointerover',event=>{
    if(event.pointerType==='touch'||liveTool||document.body.classList.contains('is-grabbing'))return;
    const control=event.target.closest(controlSelector);
    if(!control||control===toggle||control.disabled||control.getAttribute('aria-disabled')==='true'||control.contains(event.relatedTarget))return;
    const now=performance.now();if(now-lastHover<90)return;lastHover=now;play('hover');
  },{passive:true});
  document.addEventListener('click',async event=>{
    const control=event.target.closest(controlSelector);
    if(!control||control===toggle||control.disabled||control.getAttribute('aria-disabled')==='true')return;
    // A comment submit uses its posting sound, rather than an extra button pop.
    if(control.matches('.comment-form button,[type=submit]'))return;
    await unlock();play('click');
  },{capture:true,passive:true});
  document.addEventListener('studio:grab',event=>{
    if(event.detail.active){unlock().then(()=>play('grab'));}
    else if(event.detail.moved)play('drop');
  });
  toggle.addEventListener('click',async()=>{
    muted=!muted;sync();
    try{localStorage.setItem('vahri-interaction-sounds',muted?'muted':'on');}catch{}
    if(!muted){await unlock();play('click');}
  });
})();
