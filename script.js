const canvas=document.getElementById('screen');
const ctx=canvas.getContext('2d');
const keys={};
const pressed={};
addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(!keys[k]) pressed[k]=true;
  keys[k]=true;
  if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k)) e.preventDefault();
});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);

document.querySelectorAll('#mobile-controls button').forEach(b=>{
  const k=b.dataset.key;
  b.addEventListener('pointerdown',e=>{e.preventDefault(); if(!keys[k]) pressed[k]=true; keys[k]=true});
  b.addEventListener('pointerup',e=>{e.preventDefault(); keys[k]=false});
  b.addEventListener('pointerleave',()=>keys[k]=false);
});

const W=640,H=360;
let state='title', last=0, shake=0, save={};
try{save=JSON.parse(localStorage.getItem('soulbound-save')||'{}')}catch(e){}
const player={x:320,y:285,r:7,s:2.2,hp:20,maxHp:20};
const npc={x:320,y:105};
const soul={x:535,y:245,r:7,found:false};
let message='Explore o vale. Encontre sua alma.';
let dialogue=[];
let battle=null;

function saveGame(){
  localStorage.setItem('soulbound-save',JSON.stringify({soul:soul.found,hp:player.hp,progress:state}));
}
function say(lines,next){
  dialogue=[...lines];
  state='dialogue';
  battle=null;
  stateNext=next||'world';
}
let stateNext='world';

function startGame(){
  player.x=320;player.y=285;player.hp=save.hp||20;
  soul.found=!!save.soul;
  message=soul.found?'A alma está com você. Siga até o norte.':'Explore o vale. Encontre sua alma.';
  state='world';
}
function beginBattle(){
  battle={enemy:'Guardião Sombrio',hp:30,maxHp:30,turn:0,phase:'menu',choice:0,shots:[],timer:0,enemyTimer:0};
  state='battle';
}
function startNew(){
  localStorage.removeItem('soulbound-save');
  save={}; soul.found=false; player.hp=20; startGame();
}

let options=['LUTAR','AGIR','ITEM','POUPAR'];

function update(dt){
  if(state==='title'){
    if(pressed.enter||pressed[' ']) startGame();
    return;
  }
  if(state==='dialogue'){
    if(pressed[' ' ]||pressed.e||pressed.enter){
      dialogue.shift();
      if(!dialogue.length){state=stateNext; message='';}
    }
    return;
  }
  if(state==='world'){
    let dx=(keys.arrowright||keys.d?1:0)-(keys.arrowleft||keys.a?1:0);
    let dy=(keys.arrowdown||keys.s?1:0)-(keys.arrowup||keys.w?1:0);
    if(dx&&dy){dx*=.707;dy*=.707}
    player.x=Math.max(25,Math.min(W-25,player.x+dx*player.s*dt*60));
    player.y=Math.max(58,Math.min(H-25,player.y+dy*player.s*dt*60));

    const dn=Math.hypot(player.x-npc.x,player.y-npc.y);
    const ds=Math.hypot(player.x-soul.x,player.y-soul.y);
    if(pressed.e||pressed[' ']){
      if(dn<32) say(['Estranho: “Toda alma guarda uma escolha.”','Estranho: “A sua ainda está adormecida.”']);
      else if(!soul.found&&ds<28){
        soul.found=true;
        player.hp=Math.min(player.maxHp,player.hp+5);
        saveGame();
        say(['Você encontrou um fragmento de alma.','Seu coração ficou mais forte. HP +5.']);
      } else if(soul.found&&player.y<80){
        beginBattle();
      }
    }
    if(soul.found && player.y<78){message='Uma presença bloqueia o caminho. Aperte E.'}
    else if(!soul.found && ds<45){message='Há algo brilhando... aproxime-se e aperte E.'}
    else if(dn<45){message='Aperte E para conversar.'}
    else message=soul.found?'Vá para o norte.':'Explore o vale. Encontre sua alma.';
  }

  if(state==='battle') updateBattle(dt);
}

function updateBattle(dt){
  if(battle.phase==='menu'){
    if(pressed.arrowleft||pressed.a) battle.choice=(battle.choice+3)%4;
    if(pressed.arrowright||pressed.d) battle.choice=(battle.choice+1)%4;
    if(pressed.e||pressed[' ']||pressed.enter){
      const c=options[battle.choice];
      if(c==='LUTAR'){
        const dmg=5+Math.floor(Math.random()*5);
        battle.hp=Math.max(0,battle.hp-dmg);
        message='Você atacou e causou '+dmg+' de dano!';
        if(battle.hp<=0){battle.phase='win';return}
        battle.phase='enemy';battle.timer=0;
      } else if(c==='AGIR'){
        message='Você observou o Guardião. Ele parece hesitar.';
        battle.phase='enemy';battle.timer=0;
      } else if(c==='ITEM'){
        if(player.hp<player.maxHp){player.hp=Math.min(player.maxHp,player.hp+8);message='Você usou uma essência. HP +8.'}
        else message='Seu HP já está cheio.';
        battle.phase='enemy';battle.timer=0;
      } else {
        if(battle.turn>=1){battle.phase='spared';}
        else {message='O Guardião não confia em você ainda.';battle.phase='enemy';battle.timer=0}
      }
    }
  }else if(battle.phase==='enemy'){
    battle.timer+=dt;
    if(battle.timer>0.55 && battle.shots.length<5 && battle.timer<2.8){
      battle.shots.push({x:100+Math.random()*440,y:205,r:5,vx:(Math.random()-.5)*2,vy:(Math.random()-.5)*2});
    }
    for(const s of battle.shots){s.x+=s.vx*dt*60;s.y+=s.vy*dt*60}
    battle.shots=battle.shots.filter(s=>s.x>75&&s.x<565&&s.y>160&&s.y<320);
    const heart={x:320,y:270,r:7};
    if(battle.timer>0.6){
      let hx=(keys.arrowright||keys.d?1:0)-(keys.arrowleft||keys.a?1:0);
      let hy=(keys.arrowdown||keys.s?1:0)-(keys.arrowup||keys.w?1:0);
      heart.x=Math.max(100,Math.min(540,heart.x+hx*2.5*dt*60));
      heart.y=Math.max(180,Math.min(315,heart.y+hy*2.5*dt*60));
      battle.heart=heart;
      for(const s of battle.shots){
        if(Math.hypot(s.x-heart.x,s.y-heart.y)<s.r+heart.r){player.hp--;shake=8;s.x=-99}
      }
    }
    if(player.hp<=0){battle.phase='lose'}
    if(battle.timer>4){battle.turn++;battle.shots=[];battle.phase='menu';message='Seu turno.'}
  }
  if(battle.phase==='win'||battle.phase==='spared'){
    if(pressed[' ']||pressed.e||pressed.enter){
      player.x=320;player.y=300;saveGame();state='world';
      message=battle.phase==='win'?'O caminho foi aberto pela força da sua alma.':'O Guardião abaixou a arma. Uma porta se abriu.';
      battle=null;
    }
  }
  if(battle.phase==='lose' && (pressed[' ']||pressed.e||pressed.enter)){
    player.hp=20;state='world';message='Você voltou ao vale. Tente novamente.';battle=null;
  }
}

function draw(){
  ctx.clearRect(0,0,W,H);
  if(state==='title'){drawTitle();return}
  if(state==='world'||state==='dialogue'){drawWorld();if(state==='dialogue')drawDialogue();return}
  if(state==='battle'){drawBattle();return}
}

function drawTitle(){
  ctx.fillStyle='#07070d';ctx.fillRect(0,0,W,H);
  ctx.textAlign='center';
  ctx.fillStyle='#fff';ctx.font='bold 58px monospace';ctx.fillText('SOULBOUND',W/2,120);
  ctx.font='18px monospace';ctx.fillStyle='#aaa';ctx.fillText('Uma aventura entre almas',W/2,155);
  ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(250,190,140,48);
  ctx.font='bold 17px monospace';ctx.fillStyle='#fff';ctx.fillText('COMEÇAR',W/2,221);
  ctx.font='13px monospace';ctx.fillStyle='#777';ctx.fillText('ENTER ou ESPAÇO',W/2,275);
  ctx.textAlign='left';
}

function drawWorld(){
  ctx.fillStyle='#0d1020';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#18203a';ctx.fillRect(0,155,W,205);
  ctx.strokeStyle='#293457';ctx.lineWidth=3;
  for(let x=-40;x<W;x+=32){ctx.beginPath();ctx.moveTo(x,155);ctx.lineTo(x+30,H);ctx.stroke()}
  ctx.fillStyle='#101010';ctx.fillRect(10,10,620,34);
  ctx.fillStyle='#fff';ctx.font='13px monospace';ctx.fillText(`SOULBOUND  •  HP ${player.hp}/${player.maxHp}`,20,32);

  // altar/soul
  if(!soul.found){
    ctx.fillStyle='#493b80';ctx.fillRect(soul.x-10,soul.y+5,20,5);
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(soul.x,soul.y,soul.r+3,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#e44';ctx.beginPath();ctx.moveTo(soul.x,soul.y-5);ctx.lineTo(soul.x+5,soul.y);ctx.lineTo(soul.x,soul.y+5);ctx.lineTo(soul.x-5,soul.y);ctx.fill();
  }
  // NPC
  ctx.fillStyle='#633';ctx.fillRect(npc.x-8,npc.y-10,16,24);
  ctx.fillStyle='#f5c6a5';ctx.beginPath();ctx.arc(npc.x,npc.y-16,7,0,Math.PI*2);ctx.fill();
  // player
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(player.x,player.y,player.r,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#e44';ctx.beginPath();ctx.arc(player.x,player.y,3,0,Math.PI*2);ctx.fill();

  ctx.fillStyle='#000';ctx.fillRect(14,312,612,38);
  ctx.strokeStyle='#fff';ctx.strokeRect(14,312,612,38);
  ctx.fillStyle='#fff';ctx.font='12px monospace';ctx.fillText(message,25,336);
}

function drawDialogue(){
  ctx.fillStyle='#000e';ctx.fillRect(40,80,560,190);
  ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.strokeRect(40,80,560,190);
  ctx.fillStyle='#fff';ctx.font='16px monospace';
  const line=dialogue[0]||'';
  wrapText(line,65,125,510,25);
  ctx.font='11px monospace';ctx.fillStyle='#aaa';ctx.fillText('ESPAÇO / E para continuar',65,245);
}
function wrapText(t,x,y,max,lh){
  let words=t.split(' '),line='';
  for(const w of words){let test=line?line+' '+w:w;if(ctx.measureText(test).width>max){ctx.fillText(line,x,y);y+=lh;line=w}else line=test}
  ctx.fillText(line,x,y);
}

function drawBattle(){
  ctx.fillStyle='#08080d';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#fff';ctx.font='bold 18px monospace';ctx.fillText('GUARDIÃO SOMBRIO',30,32);
  ctx.fillText(`HP ${player.hp}/${player.maxHp}`,470,32);
  ctx.fillStyle='#400';ctx.fillRect(250,65,140,12);
  ctx.fillStyle='#e55';ctx.fillRect(250,65,140*(battle.hp/battle.maxHp),12);

  if(battle.phase==='menu'||battle.phase==='enemy'){
    ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(75,155,490,165);
    if(battle.phase==='enemy'){
      const h=battle.heart||{x:320,y:270,r:7};
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(h.x,h.y,h.r+2,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#e33';ctx.beginPath();ctx.arc(h.x,h.y,h.r-1,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#f55';
      for(const s of battle.shots){ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill()}
      ctx.font='11px monospace';ctx.fillStyle='#aaa';ctx.fillText('DESVIE DOS PROJÉTEIS!',225,145);
    }else{
      ctx.fillStyle='#fff';ctx.font='14px monospace';ctx.fillText(message||'O que você fará?',95,185);
      options.forEach((o,i)=>{
        ctx.strokeStyle=i===battle.choice?'#fff':'#555';
        ctx.strokeRect(95+i*115,245,100,40);
        ctx.fillStyle=i===battle.choice?'#fff':'#aaa';ctx.fillText(o,110+i*115,270);
      });
    }
  }else{
    ctx.textAlign='center';ctx.font='bold 28px monospace';
    ctx.fillStyle='#fff';
    if(battle.phase==='win')ctx.fillText('VITÓRIA!',W/2,180);
    if(battle.phase==='spared')ctx.fillText('POUPADO!',W/2,180);
    if(battle.phase==='lose')ctx.fillText('VOCÊ CAIU...',W/2,180);
    ctx.font='13px monospace';ctx.fillStyle='#aaa';ctx.fillText('ESPAÇO / E para continuar',W/2,225);ctx.textAlign='left';
  }
}

function loop(t){
  const dt=Math.min(.033,(t-last)/1000||.016);last=t;
  update(dt);draw();
  for(const k in pressed) delete pressed[k];
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
