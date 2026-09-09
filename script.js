(() => {
"use strict";

/* SOULBOUND V7 — Eclipse Eterno. Direção visual neon pixel-art baseada na referência fornecida, com efeitos cinematográficos e UI aprimorada. */

const canvas = document.getElementById("screen");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
const W = canvas.width, H = canvas.height;
const TAU = Math.PI * 2;
const SAVE_KEY = "soulbound-v7-save";
const LEGACY_SAVE_KEYS = ["soulbound-v6-save", "soulbound-v5-save", "soulbound-v5-1-save"];

const keys = Object.create(null);
const pressed = Object.create(null);
const pointer = {x:0,y:0,down:false};

addEventListener("keydown", e => {
  const k = e.key.toLowerCase();
  if (!keys[k]) pressed[k] = true;
  keys[k] = true;
  if (["arrowup","arrowdown","arrowleft","arrowright"," ","enter"].includes(k)) e.preventDefault();
});
addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);


canvas.addEventListener("pointerdown", ev=>{
  const r=canvas.getBoundingClientRect();
  pointer.x=(ev.clientX-r.left)*W/r.width; pointer.y=(ev.clientY-r.top)*H/r.height; pointer.down=true;
  if(S.mode==="title") {
    const idx=Math.floor((pointer.y-265)/45);
    if(pointer.x>=340&&pointer.x<=620&&idx>=0&&idx<4){ S.option=idx; pressed.enter=true; }
  } else if(S.mode==="battle") {
    const b=S.battle;
    // Toque direto nas quatro opções de combate — além do D-pad.
    if(b && b.phase==="menu" && pointer.y>=445 && pointer.y<=510){
      const slot=Math.floor((pointer.x-205)/185);
      if(slot>=0 && slot<4){
        b.menu=slot; pressed.enter=true;
        return;
      }
    }
    // Toque direto no item selecionado para usar, ou no X para voltar.
    if(b && b.phase==="item" && pointer.y>=395 && pointer.y<=475){ pressed.enter=true; return; }
    if(b && (b.phase==="item"||b.phase==="act") && pointer.x<380 && pointer.y>430){ pressed.x=true; return; }
    pressed.e=true;
  } else if(S.mode==="dialogue") { pressed.e=true; }
});
canvas.addEventListener("pointerup",()=>pointer.down=false);

document.querySelectorAll("[data-key]").forEach(b => {
  const k = b.dataset.key;
  const down = ev => { ev.preventDefault(); if (!keys[k]) pressed[k]=true; keys[k]=true; };
  const up = ev => { ev.preventDefault(); keys[k]=false; };
  b.addEventListener("pointerdown", down);
  b.addEventListener("pointerup", up);
  b.addEventListener("pointercancel", up);
  b.addEventListener("pointerleave", up);
});

const fs = document.getElementById("fullscreen");
fs.addEventListener("click", toggleFullscreen);
addEventListener("keydown", e => { if(e.key==="f" && !e.repeat) toggleFullscreen(); });
async function toggleFullscreen(){
  try{
    if(!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  }catch(_){}
}

const img = {};
for (const n of ["vale","forest","cave","ruins","bat","sentinel","duelist","wisp","boss"]) {
  img[n] = new Image();
  img[n].__fallback = new Image();
  img[n].__failed = false;
  img[n].onerror = () => {
    if (!img[n].__usingFallback) {
      img[n].__usingFallback = true;
      img[n].__fallback.src = "assets/"+n+".svg";
      img[n].src = img[n].__fallback.src;
    } else img[n].__failed = true;
  };
  img[n].src = "assets/"+n+".png";
}

const S = {
  mode:"title", sub:"menu", map:"vale", mapTime:0, t:0, dt:0,
  player:{x:480,y:420,r:12,hp:28,maxHp:28,lv:1,exp:0,next:30,inv:0,dir:1,walk:0},
  inventory:[{id:"potion",name:"Poção de Alma",heal:10,qty:3}],
  mercy:0, storyStep:0,
  defeated:{bat:false,sentinel:false,duelist:false,wisp:false,boss:false},
  dialogues:[], dialogueIndex:0, dialogueChars:0, dialogueDone:false, speaker:"",
  particles:[], floaters:[], flashes:[], shake:0, transition:0,
  reduceMotion:false, muted:false,
  battle:null, toast:"", toastT:0,
  choices:0, option:0, pause:false,
  bannerT:0, bannerShown:false, lastMap:"vale", ambienceSeed:Math.random()*1000
};

const maps = {
  vale:{name:"Vale das Cinzas",bg:"vale", spawn:{x:480,y:420}, exits:{north:"forest"}, npcs:[
    {x:420,y:350,name:"Mira",portrait:"wisp",lines:[
      "Olá, viajante... então a sua alma escolheu continuar.",
      "O Vale parece calmo, mas a floresta ao norte não dorme.",
      "Se alguém tentar quebrar seu espírito, respire e observe."
    ]},
    {x:690,y:335,name:"Téo",portrait:"sentinel",lines:[
      "Eu cuido desta casa há muito tempo.",
      "Há criaturas que atacam por medo. Nem toda batalha precisa terminar em violência.",
      "Você pode conversar, agir com cuidado e até poupar."
    ]}
  ], props:"vale"},
  forest:{name:"Floresta Sussurrante",bg:"forest",spawn:{x:480,y:440},exits:{north:"cave",south:"vale"},npcs:[
    {x:700,y:300,name:"Lume",portrait:"wisp",lines:["Shhh... a floresta escuta.","O morcego ali perto gosta de assustar viajantes.","Se você entender o medo dele, talvez o combate mude."]},
    {x:300,y:355,name:"Nara",portrait:"bat",lines:["A água deste rio reflete memórias.","Você vai precisar de coragem para atravessar a ponte.","Não confunda coragem com crueldade."]}
  ],props:"forest"},
  cave:{name:"Caverna do Eco",bg:"cave",spawn:{x:480,y:450},exits:{north:"ruins",south:"forest"},npcs:[
    {x:250,y:320,name:"Orin",portrait:"sentinel",lines:["O eco repete tudo... até seus erros.","A Sentinela protege o caminho por um motivo.","Talvez uma boa ação seja mais forte que um golpe."]},
    {x:760,y:360,name:"Eco",portrait:"wisp",lines:["Eu sou só um eco.","Mas ouvi falar de um duelo mais adiante.","A lâmina do Duelista é rápida. Seu coração também precisa ser."]}
  ],props:"cave"},
  ruins:{name:"Ruínas do Eclipse",bg:"ruins",spawn:{x:480,y:450},exits:{south:"cave"},npcs:[
    {x:730,y:330,name:"A Voz",portrait:"boss",lines:["O eclipse já começou.","O Guardião não quer apenas vencer você.","Ele quer descobrir se sua alma pode permanecer inteira.","Quando chegar a hora, escolha quem você quer ser."]}
  ],props:"ruins"}
};

const encounters = {
  bat:{name:"Morcego Nebuloso",portrait:"bat",maxHp:20,atk:4,xp:15,gold:8,color:"#d96cff",
    intro:"As asas cortam o silêncio!", actions:["ELOGIAR","ASSUSTAR"], mercyNeed:2, pattern:"orbs"},
  sentinel:{name:"Sentinela de Pedra",portrait:"sentinel",maxHp:32,atk:5,xp:24,gold:12,color:"#69b8e8",
    intro:"A Sentinela bloqueia a passagem.", actions:["OBSERVAR","REPARAR"], mercyNeed:2, pattern:"walls"},
  duelist:{name:"Duelista Rubro",portrait:"duelist",maxHp:38,atk:6,xp:32,gold:18,color:"#ff5a6d",
    intro:"Uma lâmina surge na penumbra.", actions:["ELOGIAR","DESAFIAR"], mercyNeed:3, pattern:"slash"},
  wisp:{name:"Orbe Sussurrante",portrait:"wisp",maxHp:28,atk:5,xp:27,gold:15,color:"#9d8aff",
    intro:"O orbe muda de cor.", actions:["OUVIR","ACALMAR"], mercyNeed:2, pattern:"rings"},
  boss:{name:"Guardião do Eclipse",portrait:"boss",maxHp:120,atk:8,xp:100,gold:80,color:"#ff5ad7",
    intro:"O eclipse se fecha sobre as ruínas.", actions:["ENCARAR","LEMBRAR"], mercyNeed:5, pattern:"boss"}
};

function saveGame(){
  const data = {map:S.map, player:S.player, inventory:S.inventory, mercy:S.mercy, storyStep:S.storyStep,
    defeated:S.defeated, reduceMotion:S.reduceMotion, muted:S.muted};
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}
function loadGame(){
  try{
    const d=JSON.parse((localStorage.getItem(SAVE_KEY)||LEGACY_SAVE_KEYS.map(k=>localStorage.getItem(k)).find(Boolean)||"null"));
    if(!d) return false;
    Object.assign(S.player,d.player||{});
    S.map=d.map||"vale"; S.inventory=d.inventory||S.inventory; S.mercy=d.mercy||0;
    S.storyStep=d.storyStep||0; S.defeated=Object.assign(S.defeated,d.defeated||{});
    S.reduceMotion=!!d.reduceMotion; S.muted=!!d.muted;
    S.mode="world"; S.pause=false; S.player.inv=0; S.transition=0;
    toast("Jogo carregado");
    return true;
  }catch(_){ return false; }
}
function resetGame(){
  localStorage.removeItem(SAVE_KEY);
  S.mode="world"; S.map="vale"; S.player={x:480,y:420,r:12,hp:28,maxHp:28,lv:1,exp:0,next:30,inv:0,dir:1,walk:0};
  S.inventory=[{id:"potion",name:"Poção de Alma",heal:10,qty:3}];
  S.mercy=0; S.storyStep=0; S.defeated={bat:false,sentinel:false,duelist:false,wisp:false,boss:false};
  S.particles=[]; S.floaters=[]; S.flashes=[]; S.transition=0;
  saveGame(); toast("Uma nova jornada começou");
}
function toast(text){ S.toast=text; S.toastT=2.2; }

function say(lines, speaker=""){
  S.mode="dialogue"; S.dialogues=lines; S.dialogueIndex=0; S.dialogueChars=0; S.dialogueDone=false; S.speaker=speaker;
}
function dialogueInput(){
  if(!(pressed.e||pressed[" "]||pressed.enter)) return;
  if(!S.dialogueDone){ S.dialogueChars=999; S.dialogueDone=true; return; }
  S.dialogueIndex++;
  if(S.dialogueIndex>=S.dialogues.length){ S.mode="world"; S.dialogues=[]; saveGame(); }
  else { S.dialogueChars=0; S.dialogueDone=false; }
}

function levelCheck(){
  while(S.player.exp>=S.player.next){
    S.player.exp-=S.player.next;
    S.player.lv++;
    S.player.next=Math.floor(S.player.next*1.45);
    S.player.maxHp+=4;
    S.player.hp=S.player.maxHp;
    toast("LV "+S.player.lv+"! Sua alma ficou mais forte.");
    burst(S.player.x,S.player.y,"#fff3a6",24,2.2);
    sound("level");
  }
}

function gainXP(n){
  S.player.exp+=n; levelCheck(); saveGame();
}
function heal(n){
  const before=S.player.hp;
  S.player.hp=Math.min(S.player.maxHp,S.player.hp+n);
  return S.player.hp-before;
}
function damagePlayer(n){
  if(S.player.inv>0) return;
  S.player.hp=Math.max(0,S.player.hp-n);
  S.player.inv=1.1;
  flash("#ff3155",.18); shake(7); sound("hurt");
  floater(S.player.x,S.player.y-22,"-"+n,"#ff6b79");
  if(S.player.hp<=0){ S.mode="dead"; S.sub="dead"; saveGame(); }
}

function shake(n){ if(!S.reduceMotion) S.shake=Math.max(S.shake,n); }
function flash(c,a){ if(!S.reduceMotion) S.flashes.push({c,a,t:.18,max:.18}); }
function floater(x,y,text,color="#fff"){S.floaters.push({x,y,text,color,t:1,max:1,vy:-20});}
function burst(x,y,color,count=12,speed=1.5){
  if(S.reduceMotion) count=Math.ceil(count/2);
  for(let i=0;i<count;i++){
    const a=Math.random()*TAU, sp=(.5+Math.random()*1.7)*speed;
    S.particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-0.3,t:.7+Math.random()*.6,max:1,color,size:1+Math.random()*3});
  }
}
function sparkle(x,y,color="#fff"){burst(x,y,color,5,1.2)}

function sound(type){
  if(S.muted) return;
  try{
    const AC=window.AudioContext||window.webkitAudioContext; if(!AC)return;
    if(!sound.ctx) sound.ctx=new AC();
    const ac=sound.ctx, o=ac.createOscillator(), g=ac.createGain();
    const now=ac.currentTime;
    const freq={menu:240,move:180,hit:95,hurt:70,heal:520,level:660,confirm:340,spare:480,win:760,slash:150}[type]||300;
    o.type=type==="slash"?"sawtooth":"square"; o.frequency.setValueAtTime(freq,now);
    o.frequency.exponentialRampToValueAtTime(Math.max(40,freq*1.6),now+.09);
    g.gain.setValueAtTime(.0001,now); g.gain.exponentialRampToValueAtTime(.045,now+.008); g.gain.exponentialRampToValueAtTime(.0001,now+.12);
    o.connect(g).connect(ac.destination); o.start(now); o.stop(now+.13);
  }catch(_){}
}

function getNPCs(){return maps[S.map].npcs||[]}
function mapImage(){return img[maps[S.map].bg]}
function isBlocked(x,y){
  if(x<34||x>926||y<45||y>525) return true;
  if(S.map==="vale" && x>640&&x<845&&y>205&&y<340) return true;
  if(S.map==="forest" && x>575&&x<810&&y>245&&y<380) return true;
  if(S.map==="cave" && ((x>100&&x<230&&y>250)||(x>735&&x<860&&y>300))) return true;
  if(S.map==="ruins" && x>350&&x<610&&y>255&&y<410) return true;
  for(const n of getNPCs()) if(Math.hypot(x-n.x,y-n.y)<30) return true;
  return false;
}

function moveWorld(dt){
  let dx=(keys.arrowright||keys.d?1:0)-(keys.arrowleft||keys.a?1:0);
  let dy=(keys.arrowdown||keys.s?1:0)-(keys.arrowup||keys.w?1:0);
  if(dx||dy){
    const len=Math.hypot(dx,dy); dx/=len; dy/=len;
    const sp=155;
    let nx=S.player.x+dx*sp*dt, ny=S.player.y+dy*sp*dt;
    if(!isBlocked(nx,S.player.y)) S.player.x=nx;
    if(!isBlocked(S.player.x,ny)) S.player.y=ny;
    S.player.walk+=dt*9; S.player.dir=dx<0?-1:dx>0?1:S.player.dir;
  }
  if(S.player.inv>0)S.player.inv-=dt;
  const ex=maps[S.map].exits||{};
  if(S.player.y<58 && ex.north) transitionTo(ex.north,"north");
  if(S.player.y>520 && ex.south) transitionTo(ex.south,"south");
}

function transitionTo(target,from){
  if(S.transition>0) return;
  S.transition=.7;
  setTimeout(()=>{
    S.map=target;
    const m=maps[target];
    S.player.x=m.spawn.x;
    S.player.y=from==="north"?470:90;
    saveGame(); toast(m.name); S.transition=0;
  },250);
}

function interact(){
  if(S.mode!=="world") return;
  if(pressed.x||pressed.escape){S.pause=true;return;}
  const p=S.player;
  let nearest=null,nd=70;
  for(const n of getNPCs()){const d=Math.hypot(p.x-n.x,p.y-n.y);if(d<nd){nearest=n;nd=d}}
  if(nearest){
    say(nearest.lines,nearest.name); sound("confirm"); return;
  }
  if(S.map==="vale" && Math.hypot(p.x-520,p.y-390)<50 && S.storyStep===0){
    S.storyStep=1; say(["Você encontrou um pequeno fragmento de alma.","Ele pulsa no mesmo ritmo que o seu coração.","Talvez seja o começo de algo maior."],"Fragmento"); saveGame(); return;
  }
}

function encounterCheck(){
  if(S.mode!=="world"||S.transition>0||S.pause) return;
  const p=S.player;
  let type=null;
  if(S.map==="forest" && !S.defeated.bat && p.x>405&&p.x<560&&p.y>150&&p.y<230) type="bat";
  if(S.map==="forest" && !S.defeated.duelist && p.x>430&&p.x<530&&p.y>80&&p.y<125) type="duelist";
  if(S.map==="cave" && !S.defeated.sentinel && p.x>400&&p.x<560&&p.y>210&&p.y<315) type="sentinel";
  if(S.map==="cave" && !S.defeated.wisp && p.x>700&&p.x<850&&p.y>390&&p.y<480) type="wisp";
  if(S.map==="ruins" && !S.defeated.boss && p.y<180) type="boss";
  if(type) startBattle(type);
}

function startBattle(type){
  const e=encounters[type];
  S.mode="battle"; S.pause=false;
  S.battle={
    type, enemy:{...e,hp:e.maxHp,mood:0,shake:0,hit:0,alpha:1},
    phase:"menu", menu:0, sub:0, timer:0, message:[e.intro], msgIndex:0,
    heart:{x:480,y:430,r:8,vx:0,vy:0,inv:0}, bullets:[], particles:[],
    patternTime:0, actionCooldown:0, hitFlash:0, fightScore:0, defeatT:0,
    mercy:0, itemIndex:0, turn:0, guard:0, bossPhase:1
  };
  burst(480,430,"#ff4059",14,1.3); flash("#fff",.13); sound("confirm");
}

function battleInput(){
  const b=S.battle; if(!b)return;
  const confirm=pressed.e||pressed[" "]||pressed.enter;
  const back=pressed.x||pressed.escape;

  // Atalhos rápidos: 1/2/3/4 escolhem LUTAR/AGIR/ITEM/POUPAR.
  if(b.phase==="menu") {
    if(pressed["1"]){b.menu=0; b.phase="fight"; b.timer=0; b.fightScore=0; sound("confirm"); return;}
    if(pressed["2"]){b.menu=1; b.phase="act"; b.sub=0; sound("confirm"); return;}
    if(pressed["3"]){b.menu=2; b.phase="item"; b.itemIndex=0; sound("confirm"); return;}
    if(pressed["4"]){attemptSpare(); return;}
  }

  if(b.phase==="message"){
    if(confirm){
      b.msgIndex++;
      if(b.msgIndex>=b.message.length){
        const next=b.afterMessage||"menu";
        b.afterMessage=null;
        b.msgIndex=0;
        if(next==="enemy") startEnemyTurn();
        else if(next==="victory") finishBattle(true);
        else if(next==="defeat") finishBattle(false);
        else b.phase="menu";
        sound("confirm");
      }else sound("confirm");
    }
    return;
  }
  if(b.phase==="victory"||b.phase==="defeat"){
    if(confirm){
      const won=b.phase==="victory";
      const type=b.type;
      S.battle=null;
      S.mode="world";
      S.player.x=480;
      S.player.y=360;
      S.transition=0;
      S.flash=0;
      S.shake=0;
      saveGame();
      toast(won ? "Vitória! A área está segura." : "Você poupou o inimigo.");
      sound("confirm");
    }
    return;
  }
  if(b.phase==="fight"){
    if(back){b.phase="menu"; b.cool=0; sound("confirm"); return;}
    if(confirm){resolveFight();return}
  }
  if(b.phase==="enemy"){return;}
  if(b.phase==="item"){
    if(back){b.phase="menu";b.cool=0;sound("confirm");return;}
    if((keys.arrowup||keys.w)&&!b.cool){b.itemIndex=(b.itemIndex+S.inventory.length-1)%S.inventory.length;b.cool=.16}
    if((keys.arrowdown||keys.s)&&!b.cool){b.itemIndex=(b.itemIndex+1)%S.inventory.length;b.cool=.16}
    if(confirm && !b.cool) useItem(); return;
  }
  if(b.phase==="act"){
    if(back){b.phase="menu";b.cool=0;sound("confirm");return}
    if((keys.arrowup||keys.w)&&!b.cool){b.sub=(b.sub+b.enemy.actions.length-1)%b.enemy.actions.length;b.cool=.16}
    if((keys.arrowdown||keys.s)&&!b.cool){b.sub=(b.sub+1)%b.enemy.actions.length;b.cool=.16}
    if(confirm&&!b.cool) doAct(); return;
  }
  if(b.phase==="menu"){
    if(back){S.battle=null;S.mode="world";S.player.x=480;S.player.y=360;saveGame();toast("Batalha encerrada");return;}
    if((keys.arrowleft||keys.a)&&!b.cool){b.menu=(b.menu+3)%4;b.cool=.14}
    if((keys.arrowright||keys.d)&&!b.cool){b.menu=(b.menu+1)%4;b.cool=.14}
    if(confirm&&!b.cool){
      b.cool=.18; sound("confirm");
      if(b.menu===0){b.phase="fight";b.timer=0;b.fightScore=0}
      if(b.menu===1){b.phase="act";b.sub=0}
      if(b.menu===2){b.phase="item";b.itemIndex=0}
      if(b.menu===3){attemptSpare()}
    }
  }
}

function resolveFight(){
  const b=S.battle;
  const score=1-Math.abs(b.timer-1.0)/1.0;
  const base=5+S.player.lv*2;
  const dmg=Math.max(1,Math.round(base*(.55+score*1.1)));
  b.enemy.hp=Math.max(0,b.enemy.hp-dmg); b.enemy.shake=12; b.enemy.hit=.2;
  floater(480,285,"-"+dmg,"#fff"); burst(480,300,"#fff",18,2); flash("#fff",.08); shake(8); sound("hit");
  if(b.enemy.hp<=0){finishBattle(true);return}
  b.phase="message"; b.message=[score>.82?"Golpe perfeito!":"Você acertou o inimigo!"]; b.msgIndex=0;
  b.afterMessage="enemy";
}

function doAct(){
  const b=S.battle, a=b.enemy.actions[b.sub];
  let text="";
  if(a==="ELOGIAR"){b.enemy.mood+=1;text="Você elogia as asas. O morcego parece menos nervoso."}
  else if(a==="ASSUSTAR"){b.enemy.mood+=2;text="Você faz uma pose assustadora. Estranhamente, funcionou."}
  else if(a==="OBSERVAR"){b.guard=.35;b.enemy.mood+=1;text="Você observa os movimentos. Agora os ataques parecem previsíveis."}
  else if(a==="REPARAR"){b.enemy.mood+=2;text="Você procura uma rachadura e conserta uma parte da armadura."}
  else if(a==="DESAFIAR"){b.enemy.mood+=1;text="Você aceita o duelo sem recuar. O respeito aumenta."}
  else if(a==="OUVIR"){b.enemy.mood+=1;text="Você escuta o sussurro até ele ficar calmo."}
  else if(a==="ACALMAR"){b.enemy.mood+=2;text="Você estende a mão. O orbe diminui a intensidade."}
  else if(a==="ENCARAR"){b.enemy.mood+=1;text="Você encara o Guardião. O eclipse vacila por um instante."}
  else {b.enemy.mood+=2;text="Você se lembra de quem era antes de chegar aqui. O Guardião hesita."}
  if(b.enemy.mood>=encounters[b.type].mercyNeed){b.mercy=100}
  b.phase="message"; b.message=[text]; b.msgIndex=0; b.afterMessage="enemy"; sound("confirm");
}

function attemptSpare(){
  const b=S.battle;
  if(b.enemy.mood>=encounters[b.type].mercyNeed){
    b.mercy=100; b.phase="message"; b.message=["Você escolheu não ferir.","O inimigo abaixa a guarda."]; b.msgIndex=0; sound("spare");
    setTimeout(()=>{if(S.mode==="battle"&&S.battle===b) finishBattle(false)},450);
  }else{
    b.phase="message"; b.message=["Ainda não está pronto para ser poupado."];b.msgIndex=0;
    b.afterMessage="enemy";
  }
}

function useItem(){
  const item=S.inventory[b.itemIndex];
  if(!item||item.qty<=0){bToast("Sem itens.");return}
  const n=heal(item.heal); item.qty--; sound("heal"); burst(480,430,"#67e8a1",18,1.5); floater(480,400,"+"+n,"#67e8a1");
  S.battle.phase="message"; S.battle.message=["Você usou "+item.name+".","Sua alma recuperou "+n+" HP."];S.battle.msgIndex=0;
  S.battle.afterMessage="enemy";
}
function bToast(t){S.battle.message=[t];S.battle.phase="message";S.battle.msgIndex=0}

function startEnemyTurn(){
  const b=S.battle;
  b.phase="enemy"; b.patternTime=0;b.bullets=[];b.heart.x=480;b.heart.y=430;b.heart.inv=0;
  b.turn++; b.guard=Math.max(0,b.guard-.2);
  if(b.type==="boss" && b.enemy.hp<60) b.bossPhase=2;
}

function spawnBullet(x,y,vx,vy,kind="orb",r=7,color="#d86cff",life=5,extra={}){
  S.battle.bullets.push({x,y,vx,vy,r,kind,color,life,t:0,...extra});
}
function spawnSlash(x,y,angle,speed=250){
  spawnBullet(x,y,Math.cos(angle)*speed,Math.sin(angle)*speed,"slash",10,"#fff",2,{angle});
}
function spawnFist(x,y,vx,vy){
  spawnBullet(x,y,vx,vy,"fist",12,"#ff5b67",4,{});
}

function enemyPattern(dt){
  const b=S.battle, t=b.patternTime;
  const p=b.heart;
  const cx=480, cy=430;
  if(b.type==="bat"){
    if(Math.floor(t*6)!==Math.floor((t-dt)*6)){
      const a=Math.random()*TAU; spawnBullet(cx+Math.cos(a)*190,cy+Math.sin(a)*80,-Math.cos(a)*65,-Math.sin(a)*30,"orb",6,"#d96cff",5);
      spawnBullet(cx+Math.cos(a+Math.PI)*190,cy+Math.sin(a+Math.PI)*80,-Math.cos(a+Math.PI)*65,-Math.sin(a+Math.PI)*30,"orb",6,"#d96cff",5);
    }
  }else if(b.type==="sentinel"){
    if(Math.floor(t*4)!==Math.floor((t-dt)*4)){
      const side=Math.random()<.5?-1:1;
      spawnBullet(side<0?315:645,cy-70,side*70,0,"wall",13,"#6db7e8",4,{wallSide:side});
      for(let i=0;i<3;i++)spawnBullet(360+i*120,cy-95,0,55+i*20,"orb",5,"#8ed8ff",4);
    }
  }else if(b.type==="duelist"){
    if(Math.floor(t*3)!==Math.floor((t-dt)*3)){
      const a=Math.atan2(p.y-cy,p.x-cx);
      spawnSlash(cx,cy,a,250);
      spawnSlash(cx,cy,a+0.55,230);
      spawnSlash(cx,cy,a-0.55,230);
    }
  }else if(b.type==="wisp"){
    if(Math.floor(t*5)!==Math.floor((t-dt)*5)){
      const a=t*2.2;
      spawnBullet(cx+Math.cos(a)*170,cy+Math.sin(a)*70,-Math.cos(a)*95,-Math.sin(a)*40,"orb",7,"#9d8aff",4);
    }
    if(Math.floor(t*2)!==Math.floor((t-dt)*2)){
      for(let i=0;i<8;i++){const a=i*TAU/8+t*.4;spawnBullet(cx+Math.cos(a)*120,cy+Math.sin(a)*55,Math.cos(a)*65,Math.sin(a)*30,"orb",5,"#d4c9ff",3)}
    }
  }else if(b.type==="boss"){
    const rate=b.bossPhase===2?5:3;
    if(Math.floor(t*rate)!==Math.floor((t-dt)*rate)){
      const a=Math.atan2(p.y-cy,p.x-cx);
      for(let k=-2;k<=2;k++)spawnBullet(cx,cy,Math.cos(a+k*.22)*120,Math.sin(a+k*.22)*80,"orb",6,"#ff54d8",4);
    }
    if(b.bossPhase===2 && Math.floor(t*2)!==Math.floor((t-dt)*2)){
      const side=t%2<1?1:-1;
      for(let i=0;i<5;i++)spawnSlash(cx-220+side*i*110,cy-80,(side>0?0:Math.PI),300);
    }
    if(Math.floor(t)!==Math.floor(t-dt)){
      const a=t*.7;
      for(let i=0;i<12;i++){const q=a+i*TAU/12;spawnBullet(cx+Math.cos(q)*220,cy+Math.sin(q)*90,-Math.cos(q)*45,-Math.sin(q)*25,"eye",7,"#e66dff",5)}
    }
  }
  // persistent heart movement
  let dx=(keys.arrowright||keys.d?1:0)-(keys.arrowleft||keys.a?1:0);
  let dy=(keys.arrowdown||keys.s?1:0)-(keys.arrowup||keys.w?1:0);
  if(dx||dy){const l=Math.hypot(dx,dy);dx/=l;dy/=l;p.x+=dx*190*dt;p.y+=dy*190*dt;}
  p.x=Math.max(330,Math.min(630,p.x));p.y=Math.max(350,Math.min(500,p.y));
  if(p.inv>0)p.inv-=dt;
  for(let i=b.bullets.length-1;i>=0;i--){
    const q=b.bullets[i];q.x+=q.vx*dt;q.y+=q.vy*dt;q.t+=dt;q.life-=dt;
    if(q.kind==="slash")q.angle+=dt*1.5;
    const hit=Math.hypot(q.x-p.x,q.y-p.y)<q.r+p.r-2;
    if(hit&&p.inv<=0){damageBattleHeart(Math.max(1,encounters[b.type].atk-Math.round(b.guard*encounters[b.type].atk))); q.life=0;}
    if(q.life<=0||q.x<-50||q.x>1010||q.y<250||q.y>530)b.bullets.splice(i,1);
  }
  if(t>5.5){b.phase="message";b.message=["Você sobreviveu ao ataque."];b.msgIndex=0;}
}
function damageBattleHeart(n){
  const b=S.battle;if(b.heart.inv>0)return;
  b.heart.inv=.65; damagePlayer(n); shake(6); flash("#ff3c66",.1);
  if(S.mode!=="battle")return;
}
function finishBattle(win){
  const b=S.battle, type=b.type;
  if(!win && b.enemy.mood<encounters[type].mercyNeed){win=false}
  S.defeated[type]=true;
  if(win){gainXP(encounters[type].xp); S.player.gold=(S.player.gold||0)+encounters[type].gold; toast("+"+encounters[type].xp+" EXP");}
  else {toast("Você poupou "+encounters[type].name+".");}
  b.phase=win?"victory":"defeat"; b.defeatT=0; b.enemy.alpha=1; b.bullets=[]; saveGame(); sound(win?"win":"spare");
}
function drawBattleEnemy(b){
  const e=b.enemy, key=e.portrait, im=img[key];
  const sh=e.shake>0?(Math.random()-.5)*e.shake:0;
  const bob=S.reduceMotion?0:Math.sin(S.t*3.2+(b.turn||0))*(b.type==="boss"?5:3);
  const pulse=S.reduceMotion?1:1+Math.sin(S.t*4)*.018;
  ctx.save();ctx.translate(sh,bob);ctx.scale(pulse,pulse);
  const w=b.type==="boss"?380:300, h=b.type==="boss"?285:215;
  ctx.globalAlpha=e.alpha;
  // aura behind the enemy, matching the purple neon look of the reference
  const aura=ctx.createRadialGradient(480,235,10,480,235,b.type==="boss"?220:145);
  aura.addColorStop(0,(e.color||"#b84cff")+"55"); aura.addColorStop(1,"#00000000");
  ctx.fillStyle=aura;ctx.fillRect(260,70,440,340);
  if(im && im.complete && im.naturalWidth > 0 && !im.__failed){
    try{ ctx.drawImage(im,480-w/2,165-h/2,w,h); }
    catch(_){ drawEnemyFallback(480,240,b.type,b.type==="boss"?1.35:.95); }
  }else drawEnemyFallback(480,240,b.type,b.type==="boss"?1.35:.95);
  // animated neon rim
  ctx.globalAlpha=.25+.12*Math.sin(S.t*5); ctx.strokeStyle=e.color||"#c86cff"; ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(480,235,b.type==="boss"?155:105+Math.sin(S.t*3)*3,0,TAU);ctx.stroke();
  if(e.hit>0){ctx.globalAlpha=Math.min(.82,e.hit*4);ctx.fillStyle="#fff";ctx.fillRect(290,95,380,300);}
  ctx.restore();
}

function drawEnemyFallback(x,y,type,s=1){
  ctx.save();ctx.translate(x,y);ctx.fillStyle=encounters[type].color;ctx.beginPath();ctx.arc(0,0,55*s,0,TAU);ctx.fill();
  ctx.fillStyle="#111";ctx.fillRect(-25*s,-10*s,14*s,14*s);ctx.fillRect(11*s,-10*s,14*s,14*s);ctx.restore();
}

function updateBattle(dt){
  const b=S.battle;if(!b)return;
  b.timer+=dt;b.cool=Math.max(0,(b.cool||0)-dt);
  if(b.enemy.shake>0)b.enemy.shake=Math.max(0,b.enemy.shake-dt*30);
  if(b.enemy.hit>0)b.enemy.hit-=dt;
  if(b.phase==="fight"){b.timer=Math.min(2,b.timer);b.fightScore=1-Math.abs(b.timer-1)/1;if(b.timer>=2)b.timer=0}
  if(b.phase==="enemy"){b.patternTime+=dt;enemyPattern(dt)}
  if(b.phase==="defeat"||b.phase==="victory"){
    b.defeatT+=dt;
    if(b.phase==="victory"&&b.defeatT>.3)burst(480,230,"#fff",2,1);
  }
}

function drawAmbient(type){
  ctx.save();
  // Soft animated color pulses and drifting particles, without external dependencies.
  const palettes={forest:["#7cf5d1","#a88cff"],cave:["#63d8ff","#b88cff"],ruins:["#f06cff","#7b6cff"],vale:["#ffe08a","#8fffc8"]};
  const pal=palettes[type]||palettes.vale;
  for(let i=0;i<18;i++){
    const x=(i*137+S.t*(8+i%3)*5)%960;
    const y=70+(i*71)%400 + Math.sin(S.t*1.2+i)*8;
    const a=.08+.08*Math.sin(S.t*2+i);
    ctx.globalAlpha=Math.max(0,a);ctx.fillStyle=pal[i%2];
    ctx.beginPath();ctx.arc(x,y,1.5+(i%3),0,TAU);ctx.fill();
  }
  if(type==="forest") {
    ctx.globalAlpha=.08;ctx.fillStyle="#b5fff1";ctx.beginPath();ctx.arc(480,250,170+Math.sin(S.t)*8,0,TAU);ctx.fill();
  } else if(type==="cave") {
    for(let i=0;i<6;i++){const x=120+i*145,y=150+Math.sin(S.t*.9+i)*9;ctx.globalAlpha=.14;ctx.fillStyle="#78e8ff";ctx.beginPath();ctx.arc(x,y,3,0,TAU);ctx.fill();}
  } else if(type==="ruins") {
    ctx.globalAlpha=.13;ctx.strokeStyle="#e39cff";ctx.lineWidth=3;ctx.beginPath();ctx.arc(760,110,70+Math.sin(S.t)*6,0,TAU);ctx.stroke();
    ctx.globalAlpha=.05;ctx.fillStyle="#d56cff";ctx.fillRect(0,0,W,H);
  } else {
    ctx.globalAlpha=.08;ctx.fillStyle="#fff0a0";ctx.beginPath();ctx.arc(160,110,85+Math.sin(S.t)*5,0,TAU);ctx.fill();
  }
  ctx.restore();
}

function drawInteractionPrompt(){
  const p=S.player; let nearest=null, nd=68;
  for(const n of getNPCs()){const d=Math.hypot(p.x-n.x,p.y-n.y);if(d<nd){nearest=n;nd=d}}
  const soul=(S.map==="vale"&&S.storyStep===0&&Math.hypot(p.x-520,p.y-390)<65);
  if(!nearest&&!soul)return;
  const label=nearest?"E  FALAR":"E  INTERAGIR";
  const x=p.x, y=p.y-38;
  ctx.save();ctx.globalAlpha=.92;ctx.fillStyle="#05050bdd";roundRect(x-64,y-17,128,26,6,true);strokeRect(x-64,y-17,128,26,"#aaa");
  txt(label,x,y+1,11,"#fff","center","bold");ctx.restore();
}

function drawWorld(){
  const m=maps[S.map], bg=mapImage();
  if(S.lastMap!==S.map){S.lastMap=S.map;S.bannerT=2.5;S.bannerShown=true;}
  ctx.fillStyle="#182";ctx.fillRect(0,0,W,H);
  if(bg && bg.complete && bg.naturalWidth > 0 && !bg.__failed){
    try{ ctx.drawImage(bg,0,0,W,H); }
    catch(_){ drawFallbackMap(m.props); }
  }else { drawFallbackMap(m.props); }
  // subtle animated lighting
  ctx.fillStyle="rgba(0,0,0,.12)";ctx.fillRect(0,0,W,H);
  for(let i=0;i<55;i++){
    const x=(i*137+Math.floor(S.t*8))%930+15,y=(i*71)%420+70;
    ctx.fillStyle=i%3===0?"#f4d77a":"#6ea35a";ctx.fillRect(x,y,2,2);
  }
  drawProps(m.props);
  drawAmbient(m.props);
  for(const n of m.npcs)drawNPC(n);
  // fragment / soul
  if(S.map==="vale"&&S.storyStep===0) drawHeart(520,390,1+Math.sin(S.t*4)*.08,true);
  drawPlayer();
  drawInteractionPrompt();
  // subtle animated vignette / scanlines for the reference-like presentation
  ctx.save();ctx.globalAlpha=.055;ctx.fillStyle="#000";
  for(let y=0;y<H;y+=4)ctx.fillRect(0,y,W,1);
  const vg=ctx.createRadialGradient(W/2,H/2,150,W/2,H/2,600);vg.addColorStop(0,"#00000000");vg.addColorStop(1,"#000000");
  ctx.fillStyle=vg;ctx.globalAlpha=.22;ctx.fillRect(0,0,W,H);ctx.restore();
  drawHUD();
  if(S.bannerT>0){
    const a=Math.min(1,S.bannerT>.4?1:S.bannerT/.4);ctx.save();ctx.globalAlpha=a;ctx.fillStyle="#03020be8";roundRect(275,92,410,72,10,true);strokeRect(275,92,410,72,"#a875d4");txt("✦  "+m.name.toUpperCase()+"  ✦",480,125,21,"#fff","center","bold");txt("um novo fragmento da jornada",480,148,11,"#bfaed2","center");ctx.restore();
  }
  if(S.toastT>0){ctx.fillStyle="#000d";roundRect(360,20,240,34,8,true);txt(S.toast,480,43,16,"#fff","center")}
}
function drawFallbackMap(type){
  const sky = type==="cave"?"#15192a":type==="ruins"?"#21162e":type==="forest"?"#173b2a":"#294a2d";
  ctx.fillStyle=sky; ctx.fillRect(0,0,W,H);
  ctx.fillStyle=type==="cave"?"#2d3855":"#315f35"; ctx.fillRect(0,300,W,240);
  ctx.fillStyle="#4f3a2a"; ctx.fillRect(0,410,W,75);
  for(let i=0;i<18;i++){ const x=(i*113)%940+10, y=100+(i*67)%300; ctx.fillStyle=type==="cave"?"#7182a8":"#4f8a4c"; ctx.fillRect(x,y,18,8); ctx.fillRect(x+6,y-12,7,12); }
}

function drawProps(type){
  if(type==="forest"){
    ctx.fillStyle="#5b402d";ctx.fillRect(95,180,20,130);ctx.fillRect(850,170,20,140);
    ctx.fillStyle="#173b2b";for(const [x,y] of [[100,175],[130,155],[870,160],[900,190],[180,225],[790,230]]){ctx.beginPath();ctx.arc(x,y,45,0,TAU);ctx.fill()}
    ctx.fillStyle="#72563a";ctx.fillRect(410,350,150,18);ctx.fillRect(430,330,110,15);
  }else if(type==="cave"){
    ctx.fillStyle="#3f4e73";for(let i=0;i<8;i++){ctx.beginPath();ctx.moveTo(70+i*120,150);ctx.lineTo(100+i*120,230);ctx.lineTo(130+i*120,150);ctx.fill()}
  }else if(type==="ruins"){
    ctx.fillStyle="#171024";ctx.fillRect(120,180,75,150);ctx.fillRect(770,170,75,160);
    ctx.fillStyle="#7f5a94";ctx.fillRect(130,195,55,12);ctx.fillRect(780,190,55,12);
  }else{
    ctx.fillStyle="#17351f";for(const [x,y] of [[80,190],[180,170],[870,180],[790,200]]){ctx.beginPath();ctx.arc(x,y,48,0,TAU);ctx.fill()}
  }
}
function drawNPC(n){
  const bob=S.reduceMotion?0:Math.sin(S.t*2+n.x*.01)*2;
  const glow=.5+.2*Math.sin(S.t*3+n.x*.02);
  ctx.save();ctx.globalAlpha=.3;ctx.fillStyle="#000";ctx.beginPath();ctx.ellipse(n.x,n.y+18,20,6,0,0,TAU);ctx.fill();ctx.restore();
  ctx.save();ctx.globalAlpha=.12*glow;ctx.fillStyle="#9c6cff";ctx.beginPath();ctx.arc(n.x,n.y-7,30,0,TAU);ctx.fill();ctx.restore();
  drawHeart(n.x,n.y-31+bob,.52,false);
  ctx.save();ctx.translate(n.x,n.y+bob);
  const tone=n.name==="Téo"?"#d6b37a":n.name==="Nara"?"#77b7d9":n.name==="Orin"?"#9b8a78":n.name==="Lume"?"#65e6bd":"#e8e8e8";
  ctx.fillStyle="#151522";ctx.fillRect(-14,-23,28,30);
  ctx.fillStyle=tone;ctx.fillRect(-11,-21,22,25);
  ctx.fillStyle="#1b1029";ctx.fillRect(-8,-14,5,6);ctx.fillRect(3,-14,5,6);
  ctx.fillStyle=n.name==="Lume"?"#4bd6a7":"#7d55b5";ctx.fillRect(-16,5,32,10);
  ctx.fillStyle="#fff";ctx.fillRect(-9,0,18,2);
  ctx.fillStyle="#111";ctx.fillRect(-8,15,6,5);ctx.fillRect(2,15,6,5);
  ctx.restore();
}

function drawPlayer(){
  const p=S.player;
  if(p.inv>0 && Math.floor(S.t*16)%2===0)return;
  const bob=Math.sin(p.walk)*2;
  ctx.save();ctx.globalAlpha=.25;ctx.fillStyle="#000";ctx.beginPath();ctx.ellipse(p.x,p.y+15,18,6,0,0,TAU);ctx.fill();ctx.restore();
  ctx.save();ctx.globalAlpha=.10+.05*Math.sin(S.t*5);ctx.fillStyle="#c56cff";ctx.beginPath();ctx.arc(p.x,p.y+bob,27+Math.sin(S.t*3)*2,0,TAU);ctx.fill();ctx.restore();
  if(!S.reduceMotion && Math.floor(S.t*14)%3===0) sparkle(p.x+(Math.random()-.5)*10,p.y+(Math.random()-.5)*12,"#e9c7ff");
  drawHeart(p.x,p.y+bob,1.05,true);
}
function drawHUD(){
  ctx.save();
  ctx.fillStyle="#05040bdd";roundRect(18,16,330,70,9,true);strokeRect(18,16,330,70,"#7f6b9f");
  txt("ALMA",31,37,14,"#f8f4ff","left","bold");txt("LV "+S.player.lv,88,37,14,"#d7c5f4","left","bold");
  txt("HP",31,62,12,"#fff","left","bold");
  ctx.fillStyle="#1a0d18";roundRect(65,51,180,12,5,true);ctx.fillStyle="#ff3f66";roundRect(65,51,180*(S.player.hp/S.player.maxHp),12,5,true);
  txt(`${S.player.hp}/${S.player.maxHp}`,254,62,11,"#fff","left","bold");
  txt("EXP",31,79,10,"#aaa");ctx.fillStyle="#171328";roundRect(65,72,180,7,3,true);ctx.fillStyle="#a96cff";roundRect(65,72,180*(S.player.exp/S.player.next),7,3,true);
  txt(`EXP ${S.player.exp}/${S.player.next}`,255,79,10,"#cdbce6","left");
  const gold=S.player.gold||0;txt("◆ "+gold,332,37,13,"#ffd76b","right","bold");
  txt(maps[S.map].name.toUpperCase(),W-25,32,15,"#fff","right","bold");
  txt("E: falar/interagir   X: pausa",W-25,55,11,"#bcb3c9","right");
  ctx.restore();
}
function drawDialogue(){
  drawWorld();
  ctx.fillStyle="#000c";ctx.fillRect(0,0,W,H);
  const n=getNPCs().find(q=>q.name===S.speaker);
  const boxY=355;
  ctx.fillStyle="#05050a";roundRect(55,boxY,850,145,10,true);strokeRect(55,boxY,850,145,"#fff");
  const portrait=n?img[n.portrait]:null;
  if(portrait && portrait.complete && portrait.naturalWidth > 0 && !portrait.__failed){
    try{ctx.drawImage(portrait,75,372,120,95)}catch(_){}
  }
  txt(S.speaker||"Alma",215,386,18,"#fff");
  const full=S.dialogues[S.dialogueIndex]||"";
  const visible=full.slice(0,Math.floor(S.dialogueChars));
  wrapText(visible,215,418,650,20,"#fff");
  if(S.dialogueDone)txt("E / Espaço / Enter",860,478,12,"#bbb","right");
}

function drawTitle(){
  ctx.fillStyle="#03020a";ctx.fillRect(0,0,W,H);
  const g=ctx.createRadialGradient(480,245,20,480,245,520);g.addColorStop(0,"#31166e");g.addColorStop(.42,"#100b2c");g.addColorStop(1,"#03020a");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // Cinematic star field + drifting particles.
  for(let i=0;i<130;i++){
    const x=(i*83.17)%W, y=(i*41.73+S.t*(4+(i%5)) )%H;
    const a=.18+.35*((i%7)/7); ctx.globalAlpha=a;ctx.fillStyle=i%9===0?"#e8b9ff":"#ffffff";
    const r=i%11===0?2:1;ctx.fillRect(x,y,r,r);
  }
  ctx.globalAlpha=.16;ctx.fillStyle="#8f43ff";ctx.beginPath();ctx.arc(480,235,190+Math.sin(S.t)*8,0,TAU);ctx.fill();
  ctx.globalAlpha=.95;ctx.strokeStyle="#b76cff";ctx.lineWidth=2;ctx.beginPath();ctx.arc(480,235,120+Math.sin(S.t*1.6)*4,0,TAU);ctx.stroke();
  drawHeart(480,235,2.55,true);
  // Logo glow + crisp title.
  ctx.save();ctx.textAlign="center";ctx.font="bold 58px Courier New";ctx.shadowColor="#b55cff";ctx.shadowBlur=24;ctx.fillStyle="#fff";ctx.fillText("SOULBOUND",480,112);ctx.restore();
  txt("ECLIPSE ETERNO",480,146,15,"#d99bff","center","bold");
  txt("uma história sobre o que permanece",480,174,15,"#bfb1df","center");
  const opts=["COMEÇAR JORNADA","CONTINUAR","CONFIGURAÇÕES","SAIR"];
  for(let i=0;i<opts.length;i++){
    const y=246+i*49, selected=S.option===i;
    ctx.save();
    ctx.globalAlpha=selected?.98:.88;ctx.fillStyle=selected?"#f7f1ff":"#090812";roundRect(315,y,330,39,7,true);
    strokeRect(315,y,330,39,selected?"#d77aff":"#5b4a7b");
    if(selected){ctx.globalAlpha=.18;ctx.fillStyle="#c05cff";roundRect(300,y-6,360,51,10,true);}
    txt((selected?"◆ ":"")+opts[i]+(selected?" ◆":""),480,y+25,15,selected?"#09040f":"#e9e2f4","center","bold");
    ctx.restore();
  }
  txt("V7 • CAPÍTULO 1 • ECLIPSE ETERNO",480,507,12,"#9d84c7","center","bold");
  txt("WASD / SETAS • E CONFIRMA • X PAUSA",480,528,10,"#6f6289","center");
}
function titleInput(){
  if((keys.arrowup||keys.w)&&!S.cool){S.option=(S.option+3)%4;S.cool=.16}
  if((keys.arrowdown||keys.s)&&!S.cool){S.option=(S.option+1)%4;S.cool=.16}
  if(pressed.enter||pressed.e||pressed[" "]){
    sound("menu");
    if(S.option===0)resetGame();
    else if(S.option===1){if(!loadGame())toast("Nenhum save encontrado")}
    else if(S.option===2)S.mode="settings";
    else S.mode="dead";
  }
}

function drawBattle(){
  ctx.fillStyle="#020208";ctx.fillRect(0,0,W,H);
  // Animated combat backdrop.
  const bg=ctx.createRadialGradient(480,220,20,480,260,500);bg.addColorStop(0,"#24123f");bg.addColorStop(.55,"#080714");bg.addColorStop(1,"#020208");ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  for(let i=0;i<34;i++){const x=(i*91+S.t*(10+i%4))%W,y=75+(i*67)%420;ctx.globalAlpha=.05+.04*Math.sin(S.t+i);ctx.fillStyle=i%3?"#a86cff":"#ff63d8";ctx.fillRect(x,y,2,2)}
  const b=S.battle,e=b.enemy;
  ctx.globalAlpha=1;
  txt(e.name.toUpperCase(),28,34,18,"#fff","left","bold");
  txt(`HP ${e.hp}/${e.maxHp}`,932,34,13,"#e8dff2","right","bold");
  ctx.fillStyle="#190c16";roundRect(650,22,242,15,5,true);ctx.fillStyle="#ff4169";roundRect(650,22,242*Math.max(0,e.hp/e.maxHp),15,5,true);
  drawBattleEnemy(b);
  // Arena frame.
  ctx.save();ctx.strokeStyle="#514067";ctx.lineWidth=2;ctx.strokeRect(330,350,300,150);ctx.globalAlpha=.55;ctx.strokeStyle=e.color||"#a76cff";ctx.beginPath();ctx.arc(480,425,82+Math.sin(S.t*2)*3,0,TAU);ctx.stroke();
  ctx.globalAlpha=.12;ctx.fillStyle=e.color||"#a76cff";ctx.fillRect(331,351,298,148);ctx.restore();
  if(["enemy","message","menu","act","item","fight"].includes(b.phase)){
    ctx.fillStyle="#03030aee";roundRect(278,334,404,174,10,true);strokeRect(278,334,404,174,"#ddd3ea");
    // corner accents
    ctx.fillStyle=e.color||"#b76cff";ctx.fillRect(278,334,46,3);ctx.fillRect(636,505,46,3);
  }
  if(b.phase==="enemy"){
    for(const q of b.bullets)drawBullet(q);
    drawHeart(b.heart.x,b.heart.y,1+Math.sin(S.t*8)*.05,true);
    txt("DESVIE-SE",480,526,13,"#d2c7df","center","bold");
  }else if(b.phase==="message"){
    txt("• "+(b.message[b.msgIndex]||""),310,395,17,"#fff");txt("E / Espaço / Enter",650,480,12,"#aaa","right");
  }else if(b.phase==="fight"){
    txt("LUTE — acerte o centro",480,374,15,"#ffe45b","center","bold");
    ctx.fillStyle="#211b29";roundRect(340,420,280,18,5,true);ctx.fillStyle="#ffd84d";roundRect(340,420,280,18,5,true);
    ctx.fillStyle="#111";ctx.fillRect(478,414,4,30);ctx.fillStyle="#fff";ctx.fillRect(340+b.fightScore*280,414,6,30);
    txt("E / Espaço / Enter",480,480,12,"#aaa","center");
  }else if(b.phase==="act"){
    txt("AGIR",315,372,16,"#ffe04d","left","bold");
    for(let i=0;i<e.actions.length;i++){txt((i===b.sub?"◆ ":"  ")+e.actions[i],315,410+i*28,15,i===b.sub?"#fff":"#aaa","left",i===b.sub?"bold":"normal")}
    txt("X para voltar",650,480,12,"#aaa","right");
  }else if(b.phase==="item"){
    txt("ITEM",315,372,16,"#57ef9b","left","bold");
    S.inventory.forEach((it,i)=>txt((i===b.itemIndex?"◆ ":"  ")+it.name+" x"+it.qty,315,410+i*28,15,i===b.itemIndex?"#fff":"#aaa","left",i===b.itemIndex?"bold":"normal"));
    txt("X para voltar",650,480,12,"#aaa","right");
  }else if(b.phase==="menu"){
    const labels=[["LUTAR","#ff4f67"],["AGIR","#ffe04d"],["ITEM","#53ed99"],["POUPAR","#5bd5ff"]];
    labels.forEach((it,i)=>{const x=193+i*190,sel=i===b.menu;ctx.fillStyle=sel?it[1]:"#11101a";roundRect(x,456,170,40,7,true);strokeRect(x,456,170,40,it[1]);txt((sel?"◆ ":"")+it[0],x+85,481,15,sel?"#08060c":it[1],"center","bold")});
    txt("← → escolher   E confirmar   1-4 atalhos",480,528,11,"#aaa","center");
  }else if(b.phase==="victory") overlayBox("VOCÊ VENCEU!",["A alma permanece inteira.","+"+e.xp+" EXP  •  +"+e.gold+" ouro"],"#8dffbb");
  else if(b.phase==="defeat") overlayBox("VOCÊ POUPou!",["Você escolheu não destruir.","A jornada continua."],"#7ed8ff");
}
function drawBullet(q){
  ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.angle||0);
  ctx.fillStyle=q.color;
  if(q.kind==="slash"){ctx.fillRect(-4,-34,8,68);ctx.fillRect(-18,-4,36,8)}
  else if(q.kind==="fist"){ctx.fillRect(-q.r,-q.r,q.r*2,q.r*2);ctx.fillRect(-q.r-6,-5,8,10)}
  else if(q.kind==="eye"){ctx.fillRect(-q.r,-5,q.r*2,10);ctx.fillStyle="#111";ctx.fillRect(-3,-3,6,6)}
  else if(q.kind==="wall"){ctx.fillRect(-q.r,-50,q.r*2,100)}
  else {ctx.beginPath();ctx.arc(0,0,q.r,0,TAU);ctx.fill()}
  ctx.restore();
}
function overlayBox(title,lines,color){
  ctx.fillStyle="#000d";ctx.fillRect(0,0,W,H);
  roundRect(240,170,480,220,12,true);strokeRect(240,170,480,220,color);
  txt(title,480,235,30,color,"center","bold");
  lines.forEach((l,i)=>txt(l,480,285+i*28,16,"#fff","center"));
  txt("E / Enter para continuar",480,365,13,"#aaa","center");
}

function drawSettings(){
  ctx.fillStyle="#06060c";ctx.fillRect(0,0,W,H);
  txt("CONFIGURAÇÕES",480,105,30,"#fff","center","bold");
  txt("Som: "+(S.muted?"DESLIGADO":"LIGADO"),480,190,18,"#fff","center");
  txt("Movimento reduzido: "+(S.reduceMotion?"SIM":"NÃO"),480,235,18,"#fff","center");
  txt("Use ← → para alterar • X para voltar",480,320,14,"#aaa","center");
  txt("E / Enter salva a preferência",480,350,14,"#aaa","center");
}
function settingsInput(){
  if(pressed.escape||pressed.x){S.mode="title";return}
  if(keys.arrowleft||keys.a||keys.arrowright||keys.d){S.muted=!S.muted;S.cool=.2}
  if(pressed.enter||pressed.e||pressed[" "]){S.reduceMotion=!S.reduceMotion;saveGame();toast("Configuração salva")}
}

function drawPause(){
  drawWorld();ctx.fillStyle="#000b";ctx.fillRect(0,0,W,H);
  roundRect(310,130,340,280,10,true);strokeRect(310,130,340,280,"#fff");
  txt("PAUSA",480,180,28,"#fff","center","bold");
  txt("X / Esc — voltar ao jogo",480,240,15,"#bbb","center");
  txt("S — salvar",480,270,15,"#bbb","center");
  txt("F — tela cheia",480,300,15,"#bbb","center");
  txt("HP "+S.player.hp+"/"+S.player.maxHp+"  •  LV "+S.player.lv,480,350,15,"#fff","center");
}
function pauseInput(){
  if(pressed.x||pressed.escape){S.pause=false;return}
  if(pressed.s){saveGame();toast("Jogo salvo");}
}

function drawDead(){
  ctx.fillStyle="#030307";ctx.fillRect(0,0,W,H);
  drawHeart(480,230,2.5,true);
  txt("SUA ALMA VACILOU",480,120,30,"#fff","center","bold");
  txt("O caminho pode ser refeito.",480,315,17,"#aaa","center");
  txt("ENTER — voltar ao título",480,365,15,"#fff","center");
}

function update(dt){
  S.t+=dt; S.cool=Math.max(0,(S.cool||0)-dt); if(S.toastT>0)S.toastT-=dt; if(S.bannerT>0)S.bannerT-=dt;
  for(let i=S.particles.length-1;i>=0;i--){const p=S.particles[i];p.x+=p.vx*60*dt;p.y+=p.vy*60*dt;p.vy+=.035;p.t-=dt;if(p.t<=0)S.particles.splice(i,1)}
  for(let i=S.floaters.length-1;i>=0;i--){const f=S.floaters[i];f.y+=f.vy*dt;f.t-=dt;if(f.t<=0)S.floaters.splice(i,1)}
  for(let i=S.flashes.length-1;i>=0;i--){S.flashes[i].t-=dt;if(S.flashes[i].t<=0)S.flashes.splice(i,1)}
  if(S.shake>0)S.shake=Math.max(0,S.shake-dt*25);
  if(S.mode==="title")titleInput();
  else if(S.mode==="world"){
    if(!S.pause){moveWorld(dt);encounterCheck();if(pressed.e||pressed[" "]||pressed.enter)interact();if(pressed.s)saveGame();if(pressed.x||pressed.escape)S.pause=true;}
    else pauseInput();
  }else if(S.mode==="dialogue"){dialogueInput();S.dialogueChars+=dt*42;if(S.dialogueChars>=(S.dialogues[S.dialogueIndex]||"").length)S.dialogueDone=true;}
  else if(S.mode==="battle"){battleInput();updateBattle(dt);}
  else if(S.mode==="settings")settingsInput();
  else if(S.mode==="dead" && (pressed.enter||pressed.e||pressed[" "]))S.mode="title";
}

function render(){
  ctx.save();
  if(S.shake>0){ctx.translate((Math.random()-.5)*S.shake,(Math.random()-.5)*S.shake)}
  if(S.mode==="title")drawTitle();
  else if(S.mode==="world")drawWorld();
  else if(S.mode==="dialogue")drawDialogue();
  else if(S.mode==="battle")drawBattle();
  else if(S.mode==="settings")drawSettings();
  else if(S.mode==="dead")drawDead();
  if(S.pause&&S.mode==="world")drawPause();
  // world particles
  if(S.mode==="world"||S.mode==="dialogue"){
    for(const p of S.particles){ctx.globalAlpha=Math.max(0,p.t/p.max);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size)}
    ctx.globalAlpha=1;
  }
  for(const f of S.floaters){ctx.globalAlpha=Math.max(0,f.t/f.max);txt(f.text,f.x,f.y,15,f.color,"center","bold");ctx.globalAlpha=1}
  for(const fl of S.flashes){ctx.globalAlpha=Math.min(1,fl.t/fl.max)*fl.a;ctx.fillStyle=fl.c;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1}
  if(S.transition>0){ctx.globalAlpha=S.transition/.7;ctx.fillStyle="#000";ctx.fillRect(0,0,W,H);ctx.globalAlpha=1}
  ctx.restore();
}

function drawHeart(x,y,s=1,glow=false){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  if(glow){ctx.shadowColor="#ff4059";ctx.shadowBlur=12}
  ctx.fillStyle="#ff4059";ctx.beginPath();
  ctx.moveTo(0,14);ctx.lineTo(-14,-2);ctx.bezierCurveTo(-22,-13,-12,-23,-4,-18);ctx.lineTo(0,-13);
  ctx.lineTo(4,-18);ctx.bezierCurveTo(12,-23,22,-13,14,-2);ctx.closePath();ctx.fill();
  ctx.shadowBlur=0;ctx.fillStyle="#ff9aaa";ctx.fillRect(-7,-9,4,4);ctx.fillRect(-2,-13,3,3);
  ctx.restore();
}
function roundRect(x,y,w,h,r,fill){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill)ctx.fill()}
function strokeRect(x,y,w,h,c){ctx.save();ctx.strokeStyle=c;ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);ctx.restore()}
function txt(t,x,y,size,color="#fff",align="left",weight="normal"){ctx.save();ctx.font=`${weight} ${size}px "Courier New",monospace`;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline="alphabetic";ctx.fillText(t,x,y);ctx.restore()}
function wrapText(text,x,y,maxWidth,lineHeight,color){
  ctx.save();ctx.font=`17px "Courier New",monospace`;ctx.fillStyle=color;
  let line="",yy=y;
  for(const word of text.split(" ")){const test=line?line+" "+word:word;if(ctx.measureText(test).width>maxWidth){ctx.fillText(line,x,yy);line=word;yy+=lineHeight}else line=test}
  if(line)ctx.fillText(line,x,yy);ctx.restore();
}

let last=performance.now();
function loop(now){
  const dt=Math.min(.033,(now-last)/1000);last=now;
  update(dt);render();
  for(const k in pressed)delete pressed[k];
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
})();