(() => {
"use strict";

/* SOULBOUND V9 — Eclipse Eterno: Mundo Vivo. Direção visual neon pixel-art baseada na referência fornecida, com efeitos cinematográficos e UI aprimorada. */

const canvas = document.getElementById("screen");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
const W = canvas.width, H = canvas.height;
const TAU = Math.PI * 2;
const SAVE_KEY = "soulbound-v9-save";
const LEGACY_SAVE_KEYS = ["soulbound-v8-save", "soulbound-v7-save", "soulbound-v6-save", "soulbound-v5-save", "soulbound-v5-1-save"];

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
    const idx=Math.floor((pointer.y-330)/42);
    if(pointer.x>=325&&pointer.x<=760&&idx>=0&&idx<4){ S.option=idx; pressed.enter=true; }
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
  else if(S.mode==="journal"||S.mode==="achievements"||S.mode==="memory"){pressed.x=true;}
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
const ASSET_NAMES = [
  "scene01-title","scene02-vale","scene03-forest","scene04-cave","scene05-ruins","scene06-lake",
  "scene07-battle-shadow","scene08-shadow-burst","scene09-guardian-battle","scene10-victory",
  "scene11-inventory","scene12-save","scene13-settings","scene14-lake-dialogue","scene15-ending",
  "area06-lake","area07-twilight","area08-prism","area09-sanctuary","area10-source",
  "npc-livia","npc-orus","npc-kafro","npc-zyra","npc-seren",
  "enemy-shadow","enemy-burst","enemy-guardian","enemy-heroine","enemy-keeper"
];
for (const n of ASSET_NAMES) {
  img[n] = new Image();
  img[n].__failed = false;
  img[n].onerror = () => { img[n].__failed = true; };
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
  bannerT:0, bannerShown:false, lastMap:"vale", ambienceSeed:Math.random()*1000, scenePulse:0,
  quiz:null, memoryIndex:0, journalTab:0, journalIndex:0, overlayTitle:"",
  flags:{route:"balanced",lanterns:0,fragments:0,secretRooms:0,quizzes:0,inspected:0,helped:false},
  stats:{battles:0,kills:0,spares:0,perfectFights:0,acts:0},
  memories:[], achievements:[], quests:{cartographer:false,lanterns:false,quiz:false,memory:false,blacksmith:false},
  inspected:{}, secretSeen:{}, discovered:[]
};

const maps = {
  vale:{name:"Vale das Cinzas",bg:"scene02-vale",spawn:{x:480,y:420},exits:{north:"forest"},npcs:[
    {x:420,y:350,name:"Lívia",portrait:"npc-livia",lines:["Olá, viajante...","Bem-vindo ao Vale das Cinzas. Aqui a paz ainda existe.","Mas o eclipse está mudando tudo." ]},
    {x:690,y:335,name:"Orus",portrait:"npc-orus",lines:["Você não parece daqui...","Cuidado com o que a floresta sussurra.","Ela escuta tudo." ]},
    {x:170,y:275,name:"Milo",portrait:"npc-seren",lines:["Sou Milo, o cartógrafo.","Marquei caminhos que não aparecem em mapa nenhum.","Encontre três pontos secretos e eu completo seu mapa."],quest:"cartographer"},
    {x:820,y:420,name:"Téo",portrait:"npc-kafro",lines:["Meu martelo conserta mais do que metal.","Traga fragmentos e posso melhorar seu equipamento.","Mas quero um favor primeiro: encontre a forja antiga."],quest:"blacksmith"}
  ],props:"vale"},
  forest:{name:"Floresta Sussurrante",bg:"scene03-forest",spawn:{x:480,y:440},exits:{north:"cave",south:"vale"},npcs:[
    {x:700,y:300,name:"Orus",portrait:"npc-orus",lines:["O caminho muda quando ninguém olha.","As árvores guardam nomes esquecidos.","Siga as luzes azuis." ]},
    {x:300,y:355,name:"Lívia",portrait:"npc-livia",lines:["A floresta não gosta de pressa.","Escute antes de agir.","Há uma ponte escondida ao norte." ]},
    {x:820,y:255,name:"Ari",portrait:"npc-seren",lines:["Eu coleciono histórias que as árvores esquecem.","Responda ao meu quiz e descubra uma memória rara."],quest:"quiz"},
    {x:150,y:420,name:"Guardiã das Lanternas",portrait:"npc-zyra",lines:["Cinco lanternas se apagaram nesta floresta.","Acenda todas e o caminho do crepúsculo ficará seguro."],quest:"lanterns"}
  ],props:"forest"},
  cave:{name:"Caverna do Eco",bg:"scene04-cave",spawn:{x:480,y:450},exits:{north:"ruins",south:"forest"},npcs:[
    {x:250,y:320,name:"Kafro",portrait:"npc-kafro",lines:["Ah... um viajante.","A caverna muda... assim como o seu destino.","O eco costuma responder com verdades." ]},
    {x:760,y:360,name:"Zyra",portrait:"npc-zyra",lines:["Você chegou longe.","O eclipse não foi um fim.","O que era luz, agora é sombra." ]},
    {x:120,y:420,name:"Homem Sem Rosto",portrait:"npc-orus",lines:["Você já me viu antes.","Só não consegue lembrar onde.","Quando a memória faltar, siga o eco."],quest:"faceless"}
  ],props:"cave"},
  ruins:{name:"Ruínas do Eclipse",bg:"scene05-ruins",spawn:{x:480,y:450},exits:{north:"lake",south:"cave"},npcs:[
    {x:730,y:330,name:"Zyra",portrait:"npc-zyra",lines:["As ruínas lembram de tudo.","Não confie no silêncio do Guardião.","A próxima passagem está além do lago." ]}
  ],props:"ruins"},
  lake:{name:"Lago das Memórias",bg:"scene06-lake",spawn:{x:480,y:450},exits:{north:"twilight",south:"ruins"},npcs:[
    {x:240,y:330,name:"Seren",portrait:"npc-seren",lines:["Este lago guarda as memórias de todos que já passaram por aqui.","Você também deixará a sua.","O brilho na água aponta para o leste."]},
    {x:700,y:350,name:"Lívia",portrait:"npc-livia",lines:["Algumas lembranças doem.","Outras mostram o caminho.","Não deixe o eclipse escolher por você." ]},
    {x:130,y:240,name:"Nara",portrait:"npc-zyra",lines:["Eu troco memórias por objetos esquecidos.","Não é barato, mas vale o preço de uma lembrança."],quest:"collector"},
    {x:820,y:445,name:"Eris",portrait:"npc-livia",lines:["A água mostra possibilidades.","Uma escolha agora pode mudar quem aparece depois."],quest:"eris"}
  ],props:"forest"},
  twilight:{name:"Vila do Crepúsculo",bg:"area07-twilight",spawn:{x:480,y:440},exits:{north:"prism",south:"lake"},npcs:[
    {x:300,y:340,name:"Kafro",portrait:"npc-kafro",lines:["As lanternas apagam quando o céu escurece.","A vila sobrevive escondendo seus sonhos.","Suba a trilha de cristais."]},
    {x:720,y:330,name:"Seren",portrait:"npc-seren",lines:["Aqui todos lembram do eclipse.","Mas ninguém conta a mesma história."]},
    {x:160,y:290,name:"Téo",portrait:"npc-kafro",lines:["A oficina precisa de três brasas azuis.","Traga-as e eu reforço sua alma."],quest:"forge"}
  ],props:"vale"},
  prism:{name:"Bosque Prismático",bg:"area08-prism",spawn:{x:480,y:440},exits:{north:"sanctuary",south:"twilight"},npcs:[
    {x:250,y:340,name:"Lívia",portrait:"npc-livia",lines:["As cores aqui não são só cores.","Cada cristal guarda uma escolha.","Escolha com calma."]},
    {x:760,y:340,name:"Zyra",portrait:"npc-zyra",lines:["A luz prismática fere a sombra.","É por isso que o eclipse a teme."]},
    {x:150,y:430,name:"Nara",portrait:"npc-zyra",lines:["Cada cristal guarda uma decisão.","Você pode olhar uma memória escondida aqui."],quest:"memory"}
  ],props:"forest"},
  sanctuary:{name:"Santuário do Eclipse",bg:"area09-sanctuary",spawn:{x:480,y:440},exits:{north:"source",south:"prism"},npcs:[
    {x:280,y:330,name:"Orus",portrait:"npc-orus",lines:["Aqui as escolhas pesam mais.","Um guardião antigo desperta ao norte."]},
    {x:730,y:330,name:"Kafro",portrait:"npc-kafro",lines:["Não precisa vencer tudo com força.","Às vezes sobreviver já é uma resposta."]},
    {x:150,y:390,name:"Milo",portrait:"npc-seren",lines:["O santuário tem uma sala atrás da estátua.","Mas o símbolo só reage a quem explorou o capítulo."],quest:"secret"}
  ],props:"ruins"},
  source:{name:"Nascente das Memórias",bg:"area10-source",spawn:{x:480,y:440},exits:{south:"sanctuary"},npcs:[
    {x:690,y:340,name:"Seren",portrait:"npc-seren",lines:["A nascente mostra o que você pode se tornar.","O eclipse chegou ao fim do caminho.","Agora falta decidir como ele termina." ]},
    {x:250,y:315,name:"Eris",portrait:"npc-livia",lines:["Eu vi esta água em três futuros diferentes.","Qual deles você quer alimentar?"],quest:"ending"},
    {x:820,y:300,name:"Homem Sem Rosto",portrait:"npc-orus",lines:["A última memória não está na água.","Está nas escolhas que você fez."],quest:"faceless"}
  ],props:"forest"}
};

const encounters = {
  bat:{name:"Sombra Errante",portrait:"enemy-shadow",maxHp:28,atk:4,xp:15,gold:8,color:"#d96cff",intro:"A Sombra Errante abre suas asas de névoa!",actions:["ELOGIAR","ACALMAR"],mercyNeed:2,pattern:"orbs"},
  sentinel:{name:"Vigia Prismático",portrait:"enemy-burst",maxHp:40,atk:5,xp:24,gold:12,color:"#69d8ff",intro:"O Vigia Prismático reflete seu movimento.",actions:["OBSERVAR","REPARAR"],mercyNeed:2,pattern:"walls"},
  duelist:{name:"Duelista do Eclipse",portrait:"enemy-heroine",maxHp:44,atk:6,xp:32,gold:18,color:"#ff5a9d",intro:"Uma duelista surge entre brilhos violeta.",actions:["ELOGIAR","DESAFIAR"],mercyNeed:3,pattern:"slash"},
  wisp:{name:"Orbe da Memória",portrait:"enemy-burst",maxHp:34,atk:5,xp:27,gold:15,color:"#9d8aff",intro:"O Orbe abre uma fenda de lembranças.",actions:["OUVIR","ACALMAR"],mercyNeed:2,pattern:"rings"},
  boss:{name:"Guardião do Eclipse",portrait:"enemy-guardian",maxHp:160,atk:8,xp:140,gold:100,color:"#ff5ad7",intro:"O Guardião do Eclipse desperta no santuário.",actions:["ENCARAR","LEMBRAR"],mercyNeed:5,pattern:"boss"},
  mirror:{name:"Guardião Espelhado",portrait:"enemy-heroine",maxHp:58,atk:7,xp:42,gold:24,color:"#70e6ff",intro:"Seu reflexo saiu do cristal.",actions:["IMPROVISAR","ELOGIAR"],mercyNeed:3,pattern:"mirror"},
  thief:{name:"Ladrão de Memórias",portrait:"enemy-keeper",maxHp:52,atk:6,xp:38,gold:30,color:"#ffd45e",intro:"Algo puxou uma lembrança da sua alma.",actions:["NEGOCIAR","LEMBRAR"],mercyNeed:3,pattern:"steal"},
  eye:{name:"Olho do Eclipse",portrait:"enemy-burst",maxHp:64,atk:7,xp:48,gold:28,color:"#e36cff",intro:"Um olho se abre no céu da ruína.",actions:["ENCARAR","DESVIAR"],mercyNeed:3,pattern:"eye"}
};

function saveGame(){
  const data = {map:S.map, player:S.player, inventory:S.inventory, mercy:S.mercy, storyStep:S.storyStep,
    defeated:S.defeated, reduceMotion:S.reduceMotion, muted:S.muted, flags:S.flags,stats:S.stats,memoryIndex:S.memoryIndex,memories:S.memories,achievements:S.achievements,quests:S.quests,inspected:S.inspected,secretSeen:S.secretSeen,discovered:S.discovered};
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}
function loadGame(){
  try{
    const d=JSON.parse((localStorage.getItem(SAVE_KEY)||LEGACY_SAVE_KEYS.map(k=>localStorage.getItem(k)).find(Boolean)||"null"));
    if(!d) return false;
    Object.assign(S.player,d.player||{});
    S.map=d.map||"vale"; S.inventory=d.inventory||S.inventory; S.mercy=d.mercy||0;
    S.storyStep=d.storyStep||0; S.defeated=Object.assign(S.defeated,d.defeated||{});
    S.reduceMotion=!!d.reduceMotion; S.muted=!!d.muted; S.flags=Object.assign(S.flags,d.flags||{}); S.stats=Object.assign(S.stats,d.stats||{}); S.memories=d.memories||[]; S.achievements=d.achievements||[]; S.quests=Object.assign(S.quests,d.quests||{}); S.inspected=Object.assign({},d.inspected||{}); S.secretSeen=Object.assign({},d.secretSeen||{}); S.discovered=d.discovered||[];
    S.mode="world"; S.pause=false; S.player.inv=0; S.transition=0;
    toast("Jogo carregado");
    return true;
  }catch(_){ return false; }
}
function resetGame(){
  localStorage.removeItem(SAVE_KEY);
  S.mode="world"; S.map="vale"; S.player={x:480,y:420,r:12,hp:28,maxHp:28,lv:1,exp:0,next:30,inv:0,dir:1,walk:0};
  S.inventory=[{id:"potion",name:"Poção de Alma",heal:10,qty:3}];
  S.mercy=0; S.storyStep=0; S.defeated={bat:false,sentinel:false,duelist:false,wisp:false,boss:false,mirror:false,thief:false,eye:false};
  S.flags={route:"balanced",lanterns:0,fragments:0,secretRooms:0,quizzes:0,inspected:0,helped:false}; S.stats={battles:0,kills:0,spares:0,perfectFights:0,acts:0}; S.memories=[]; S.achievements=[]; S.quests={cartographer:false,lanterns:false,quiz:false,memory:false,blacksmith:false}; S.inspected={}; S.secretSeen={}; S.discovered=[];
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
  const p=S.player;
  // Journal / memory shortcuts work anywhere in the world.
  if(pressed.j){S.mode="journal";S.journalTab=0;return}
  if(pressed.m){S.mode="memory";return}
  if(pressed.k){S.mode="achievements";return}
  let nearest=null,nd=75;
  for(const n of getNPCs()){const d=Math.hypot(p.x-n.x,p.y-n.y);if(d<nd){nearest=n;nd=d}}
  if(nearest){ interactNPC(nearest); return; }
  const hit = findHotspot(p.x,p.y);
  if(hit){ triggerHotspot(hit); return; }
  if(pressed.x||pressed.escape){S.pause=true;return;}
}

const hotspots={
  vale:[{id:"ashstone",x:520,y:390,r:58,label:"Fragmento de alma",action:"fragment"},{id:"grave",x:120,y:240,r:48,label:"Lápide antiga",action:"inspect"}],
  forest:[{id:"lantern1",x:170,y:230,r:46,label:"Lanterna apagada",action:"lantern"},{id:"lantern2",x:840,y:200,r:46,label:"Lanterna apagada",action:"lantern"},{id:"roots",x:500,y:300,r:55,label:"Raízes sussurrantes",action:"quiz"}],
  cave:[{id:"mirror",x:600,y:260,r:60,label:"Cristal espelhado",action:"battle:mirror"},{id:"echo",x:160,y:390,r:50,label:"Parede do eco",action:"memory"}],
  ruins:[{id:"eye",x:780,y:130,r:60,label:"Olho do Eclipse",action:"battle:eye"},{id:"runes",x:300,y:390,r:58,label:"Runas quebradas",action:"inspect"}],
  lake:[{id:"lakefragment",x:500,y:260,r:70,label:"Reflexo na água",action:"memory"},{id:"chest",x:820,y:440,r:48,label:"Baú antigo",action:"inspect"}],
  twilight:[{id:"lantern3",x:360,y:200,r:46,label:"Lanterna apagada",action:"lantern"},{id:"lantern4",x:690,y:210,r:46,label:"Lanterna apagada",action:"lantern"},{id:"thief",x:500,y:150,r:55,label:"Sussurro dourado",action:"battle:thief"}],
  prism:[{id:"lantern5",x:220,y:220,r:46,label:"Lanterna prismática",action:"lantern"},{id:"crystal",x:700,y:220,r:55,label:"Cristal de decisão",action:"choice"}],
  sanctuary:[{id:"secret",x:480,y:260,r:68,label:"Estátua do Eclipse",action:"secret"},{id:"bossgate",x:480,y:120,r:65,label:"Portão do Guardião",action:"boss"}],
  source:[{id:"finalmemory",x:480,y:240,r:80,label:"Nascente das Memórias",action:"ending"}]
};
function findHotspot(x,y){return (hotspots[S.map]||[]).find(h=>Math.hypot(x-h.x,y-h.y)<h.r && !S.inspected[h.id])||null}
function interactNPC(n){
  if(n.quest==="quiz"){startQuiz();return}
  if(n.quest==="memory"){startMemory();return}
  if(n.quest==="lanterns"){say(S.flags.lanterns>=5?["Todas as lanternas voltaram a brilhar.","A vila do crepúsculo está protegida.","Você ganhou uma memória rara."]:["Encontre e acenda as cinco lanternas apagadas.","Elas estão espalhadas entre a floresta e o crepúsculo.","Volte quando todas brilharem."],n.name); if(S.flags.lanterns>=5){rewardMemory("A luz que escolhi");S.quests.lanterns=true;saveGame();}return}
  if(n.quest==="blacksmith"||n.quest==="forge"){ if(S.flags.fragments>=2){say(["O material é suficiente.","Téo reforça sua alma e aumenta o máximo de HP em 4."],n.name);S.player.maxHp+=4;S.player.hp=S.player.maxHp;S.flags.helped=true;S.quests.blacksmith=true;saveGame();}else say(["Ainda preciso de dois fragmentos de memória.","Procure pelas áreas e examine o que parece fora do lugar."],n.name); return; }
  if(n.quest==="cartographer"){ if(S.flags.inspected>=3){S.quests.cartographer=true;rewardMemory("Mapa de um caminho impossível");say(["Você encontrou os pontos secretos.","Agora o mapa mostra um caminho que não existia.","Guarde-o. Ele será importante depois."],n.name);saveGame();} else say(["Explore e investigue pelo menos três lugares estranhos.","Eu marco cada segredo que você descobrir."],n.name);return; }
  if(n.quest==="collector"){if(S.flags.fragments>=3){S.flags.fragments-=3;S.inventory.push({id:"ancient",name:"Chave Antiga",heal:0,qty:1});say(["Três fragmentos... perfeito.","Use esta chave quando encontrar uma porta sem maçaneta."],n.name);saveGame();}else say(["Traga três fragmentos de memória.","Eu tenho algo que vale a troca."],n.name);return;}
  if(n.quest==="secret"){ const lines=S.flags.inspected>=5?["O símbolo respondeu a você.","Há uma sala secreta atrás da estátua.","Uma memória foi gravada no seu coração."]:["A estátua não reage.","Talvez você precise explorar mais antes de voltar."]; say(lines,n.name); if(S.flags.inspected>=5){S.flags.secretRooms++;rewardMemory("A sala que não deveria existir");}saveGame();return;}
  if(n.quest==="ending"){startChoice();return;}
  if(n.quest==="eris"){startChoice();return}
  say(n.lines,n.name); sound("confirm");
}
function triggerHotspot(h){
  if(h.action==="fragment"){rewardMemory("Primeiro Fragmento");S.storyStep=1;S.inspected[h.id]=true;S.flags.fragments++;say(["Você encontra um fragmento de alma.","Ele pulsa no mesmo ritmo que o seu coração.","Uma memória acordou.","Pressione M a qualquer momento para rever memórias."],"Fragmento");saveGame();return;}
  if(h.action==="inspect"){S.inspected[h.id]=true;S.flags.inspected++;S.flags.fragments++;S.flags.helped=false;const texts={ashstone:["A lápide está quente, apesar da noite."],grave:["A lápide diz apenas: ‘Aqui repousa alguém que escolheu lembrar’."],runes:["As runas mostram quatro símbolos: coragem, medo, memória e esperança."],chest:["O baú estava vazio... até você tocá-lo.","Dentro havia um fragmento de memória."]}; const t=texts[h.id]||["Você encontra marcas antigas."];say(t,"Investigação");checkAchievements();saveGame();return;}
  if(h.action==="lantern"){S.flags.lanterns=Math.min(5,S.flags.lanterns+1);S.inspected[h.id]=true;S.flags.inspected++;rewardMemory("Lanterna acesa #"+S.flags.lanterns);say(["A lanterna volta a brilhar.","Uma pequena parte da escuridão recua.","Lanternas acesas: "+S.flags.lanterns+"/5"],"Lanterna");checkAchievements();saveGame();return;}
  if(h.action==="quiz"){startQuiz();return}
  if(h.action==="memory"){startMemory();return}
  if(h.action==="choice"){startChoice();return}
  if(h.action==="secret"){if(S.flags.inspected>=5){S.flags.secretRooms++;rewardMemory("Câmara do Eclipse");S.secretSeen[h.id]=true;S.inspected[h.id]=true;S.mode="memory";}else say(["A estátua permanece imóvel.","Você sente que ainda faltam respostas."],"Estátua");return;}
  if(h.action==="boss"){if(S.defeated.boss){say(["O portão está silencioso.","O que restou do eclipse não quer lutar novamente."],"Portão");}else startBattle("boss");return;}
  if(h.action.startsWith("battle:")){startBattle(h.action.split(":")[1]);return;}
  if(h.action==="ending"){startChoice();return;}
}
function rewardMemory(name){if(!S.memories.includes(name)){S.memories.push(name);S.flags.fragments++;toast("Memória encontrada: "+name);}}

function encounterCheck(){
  if(S.mode!=="world"||S.transition>0||S.pause) return;
  const p=S.player; let type=null;
  if(S.map==="forest" && !S.defeated.bat && p.x>405&&p.x<560&&p.y>150&&p.y<230) type="bat";
  if(S.map==="cave" && !S.defeated.sentinel && p.x>400&&p.x<560&&p.y>210&&p.y<315) type="sentinel";
  if(S.map==="forest" && !S.defeated.duelist && p.x>430&&p.x<530&&p.y>80&&p.y<125) type="duelist";
  if(S.map==="lake" && !S.defeated.wisp && p.x>650&&p.x<820&&p.y>360&&p.y<470) type="wisp";
  if(S.map==="sanctuary" && !S.defeated.duelist && p.x>420&&p.x<560&&p.y<180) type="duelist";
  if(S.map==="source" && !S.defeated.boss && p.y<180) type="boss";
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
    mercy:0, itemIndex:0, turn:0, guard:0, bossPhase:1, phaseAnnounced:0, copied:false
  };
  S.stats.battles++;
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
  let text=""; S.stats.acts++;
  if(a==="ELOGIAR"){b.enemy.mood+=1;text="Você elogia as asas. O morcego parece menos nervoso."}
  else if(a==="ASSUSTAR"){b.enemy.mood+=2;text="Você faz uma pose assustadora. Estranhamente, funcionou."}
  else if(a==="OBSERVAR"){b.guard=.35;b.enemy.mood+=1;text="Você observa os movimentos. Agora os ataques parecem previsíveis."}
  else if(a==="REPARAR"){b.enemy.mood+=2;text="Você procura uma rachadura e conserta uma parte da armadura."}
  else if(a==="DESAFIAR"){b.enemy.mood+=1;text="Você aceita o duelo sem recuar. O respeito aumenta."}
  else if(a==="OUVIR"){b.enemy.mood+=1;text="Você escuta o sussurro até ele ficar calmo."}
  else if(a==="ACALMAR"){b.enemy.mood+=2;text="Você estende a mão. O orbe diminui a intensidade."}
  else if(a==="ENCARAR"){b.enemy.mood+=1;text="Você encara o inimigo. O eclipse vacila por um instante."}
  else if(a==="IMPROVISAR"){b.enemy.mood+=1;b.guard=.25;text="Você faz algo inesperado. Seu reflexo perdeu a vantagem."}
  else if(a==="NEGOCIAR"){b.enemy.mood+=1;S.flags.route="pacifist";text="Você oferece uma memória em vez de um golpe."}
  else if(a==="DESVIAR"){b.enemy.mood+=1;b.guard=.4;text="Você baixa a guarda e mostra que não quer lutar."}
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
  if(b.type==="boss"){ const old=b.bossPhase; b.bossPhase=b.enemy.hp<55?3:(b.enemy.hp<105?2:1); if(b.bossPhase!==old){ b.phaseAnnounced=b.bossPhase; b.phase="message"; b.message=[b.bossPhase===2?"O Guardião rompe sua primeira armadura.":"A última fase desperta. O cenário inteiro parece respirar."]; b.msgIndex=0; b.afterMessage="enemy"; return; }}
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
  }else if(b.type==="mirror"){
    if(Math.floor(t*4)!==Math.floor((t-dt)*4)){ const a=t*1.7; spawnBullet(cx+Math.cos(a)*145,cy+Math.sin(a)*70,-Math.cos(a)*80,-Math.sin(a)*45,"orb",7,"#70e6ff",4); spawnSlash(cx,cy,a,230);}
  }else if(b.type==="thief"){
    if(Math.floor(t*3)!==Math.floor((t-dt)*3)){ for(let i=0;i<3;i++){ const a=t+i*2.1; spawnBullet(cx+Math.cos(a)*160,cy+Math.sin(a)*70,-Math.cos(a)*95,-Math.sin(a)*35,"eye",7,"#ffd45e",4); } }
  }else if(b.type==="eye"){
    if(Math.floor(t*5)!==Math.floor((t-dt)*5)){ const a=t*2; spawnBullet(cx,cy,Math.cos(a)*130,Math.sin(a)*90,"eye",8,"#e36cff",4); spawnBullet(cx,cy,Math.cos(a+Math.PI)*130,Math.sin(a+Math.PI)*90,"eye",8,"#e36cff",4); }
  }else if(b.type==="boss"){
    const rate=b.bossPhase===3?7:(b.bossPhase===2?5:3);
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
  if(win){gainXP(encounters[type].xp); S.player.gold=(S.player.gold||0)+encounters[type].gold; S.stats.kills++; S.flags.route=S.stats.spares>S.stats.kills?"pacifist":"aggressive"; toast("+"+encounters[type].xp+" EXP");}
  else {S.stats.spares++; S.flags.route=S.stats.spares>=S.stats.kills?"pacifist":"balanced"; toast("Você poupou "+encounters[type].name+"."); rewardMemory("Uma escolha poupada");}
  if(type==="boss"){S.storyStep=9; if(S.stats.spares>=S.stats.kills){S.flags.route="pacifist";} else if(S.stats.kills>=3){S.flags.route="aggressive";} else S.flags.route="balanced";}
  b.phase=win?"victory":"defeat"; b.defeatT=0; b.enemy.alpha=1; b.bullets=[]; checkAchievements(); saveGame(); sound(win?"win":"spare");
}
function drawBattleEnemy(b){
  const e=b.enemy, im=img[e.portrait];
  const sh=e.shake>0?(Math.random()-.5)*e.shake:0;
  const bob=S.reduceMotion?0:Math.sin(S.t*3.2+(b.turn||0))*4;
  const pulse=S.reduceMotion?1:1+Math.sin(S.t*4)*.022;
  const w=b.type==="boss"?430:340, h=b.type==="boss"?300:230;
  ctx.save();ctx.translate(sh,bob);ctx.scale(pulse,pulse);ctx.globalAlpha=e.alpha;
  const aura=ctx.createRadialGradient(480,235,10,480,235,b.type==="boss"?230:150);aura.addColorStop(0,(e.color||"#b84cff")+"66");aura.addColorStop(1,"#00000000");ctx.fillStyle=aura;ctx.fillRect(230,70,500,360);
  if(im && im.complete && im.naturalWidth>0 && !im.__failed){ctx.drawImage(im,480-w/2,115,w,h);}
  else drawEnemyFallback(480,240,b.type,b.type==="boss"?1.45:1);
  ctx.globalAlpha=.28+.1*Math.sin(S.t*6);ctx.strokeStyle=e.color||"#c86cff";ctx.lineWidth=3;ctx.beginPath();ctx.arc(480,250,b.type==="boss"?175:125,0,TAU);ctx.stroke();
  if(e.hit>0){ctx.globalAlpha=Math.min(.82,e.hit*4);ctx.fillStyle="#fff";ctx.fillRect(280,80,400,330);}
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
    try{ const zoom=1.035+Math.sin(S.t*.55)*.008; const ww=W*zoom, hh=H*zoom; ctx.drawImage(bg,(W-ww)/2,(H-hh)/2,ww,hh); }
    catch(_){ drawFallbackMap(m.props); }
  }else { drawFallbackMap(m.props); }
  // subtle animated lighting
  ctx.fillStyle="rgba(0,0,0,.12)";ctx.fillRect(0,0,W,H);
  for(let i=0;i<55;i++){
    const x=(i*137+Math.floor(S.t*8))%930+15,y=(i*71)%420+70;
    ctx.fillStyle=i%3===0?"#f4d77a":"#6ea35a";ctx.fillRect(x,y,2,2);
  }
  drawAmbient(m.props);
  for(const n of m.npcs)drawNPC(n);
  // fragment / soul
  if(S.map==="vale"&&S.storyStep===0) drawHeart(520,390,1+Math.sin(S.t*4)*.08,true);
  drawPlayer();
  drawInteractionPrompt();
  drawHotspotMarkers();
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
  const bob=S.reduceMotion?0:Math.sin(S.t*2.4+n.x*.015)*3;
  const im=img[n.portrait];
  ctx.save();ctx.globalAlpha=.35;ctx.fillStyle="#000";ctx.beginPath();ctx.ellipse(n.x,n.y+25,26,8,0,0,TAU);ctx.fill();ctx.restore();
  ctx.save();ctx.translate(n.x,n.y+bob);
  ctx.globalAlpha=.24+.1*Math.sin(S.t*4+n.x*.01);ctx.fillStyle="#b45cff";ctx.beginPath();ctx.arc(0,-6,42,0,TAU);ctx.fill();ctx.restore();
  if(im && im.complete && im.naturalWidth>0 && !im.__failed){
    ctx.save();ctx.translate(n.x,n.y+bob);ctx.imageSmoothingEnabled=false;
    ctx.drawImage(im,-38,-46,76,70);
    ctx.restore();
  }
  // Animated soul marker above the character, matching the reference language.
  if(!S.reduceMotion){ctx.save();ctx.globalAlpha=.75+.2*Math.sin(S.t*5);ctx.strokeStyle="#e88cff";ctx.lineWidth=2;ctx.beginPath();ctx.arc(n.x,n.y-50+bob,10+Math.sin(S.t*3)*2,0,TAU);ctx.stroke();ctx.restore();}
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
function drawHotspotMarkers(){
  const hs=hotspots[S.map]||[]; if(!hs.length)return; ctx.save();
  for(const h of hs){ if(S.inspected[h.id])continue; const pulse=5+Math.sin(S.t*3+h.x)*2;ctx.globalAlpha=.22+.10*Math.sin(S.t*4+h.x);ctx.strokeStyle="#c978ff";ctx.lineWidth=2;ctx.beginPath();ctx.arc(h.x,h.y-16,12+pulse,0,TAU);ctx.stroke();ctx.globalAlpha=.9;txt("✦",h.x,h.y-34,12,"#efe0ff","center","bold"); }
  ctx.restore();
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
  txt("E: interagir   J: diário   M: memórias   K: conquistas",W-25,55,10,"#bcb3c9","right");
  ctx.restore();
}
function drawDialogue(){
  drawWorld();
  const plate=img["scene14-lake-dialogue"]; if(plate&&plate.complete&&plate.naturalWidth>0&&!plate.__failed){ctx.globalAlpha=.18;ctx.drawImage(plate,0,0,W,H);ctx.globalAlpha=1;}
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
  const im=img["scene01-title"];
  if(im && im.complete && im.naturalWidth>0 && !im.__failed){ctx.drawImage(im,0,0,W,H);}
  else {ctx.fillStyle="#03020a";ctx.fillRect(0,0,W,H);}
  txt("V9 • MUNDO VIVO",W-28,H-22,12,"#d7a6ff","right","bold");
  // A camada animada mantém a ilustração fornecida intacta, só adicionando vida à cena.
  if(!S.reduceMotion){
    for(let i=0;i<32;i++){
      const x=(i*101+S.t*(3+i%4))%W, y=(i*53)%H;
      ctx.globalAlpha=.10+.10*Math.sin(S.t*2+i);ctx.fillStyle="#eeb7ff";ctx.fillRect(x,y,2,2);
    }
    ctx.globalAlpha=.25;ctx.strokeStyle="#d978ff";ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(160,180,80+Math.sin(S.t*1.7)*5,0,TAU);ctx.stroke();ctx.globalAlpha=1;
  }
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
  const battleScene = S.battle && S.battle.type === "boss" ? img["scene09-guardian-battle"] : img["scene07-battle-shadow"];
  if(battleScene && battleScene.complete && battleScene.naturalWidth>0 && !battleScene.__failed){
    const pulse=1.015+Math.sin(S.t*.8)*.006;ctx.globalAlpha=.88;ctx.drawImage(battleScene,(W-W*pulse)/2,(H-H*pulse)/2,W*pulse,H*pulse);ctx.globalAlpha=1;
  } else {
    const bg=ctx.createRadialGradient(480,220,20,480,260,500);bg.addColorStop(0,"#24123f");bg.addColorStop(.55,"#080714");bg.addColorStop(1,"#020208");ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  }
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
  const v=img["scene10-victory"]; if(v&&v.complete&&v.naturalWidth>0&&!v.__failed){ctx.globalAlpha=.92;ctx.drawImage(v,0,0,W,H);ctx.globalAlpha=1;}
  ctx.fillStyle="#000b";ctx.fillRect(0,0,W,H);
  roundRect(240,170,480,220,12,true);strokeRect(240,170,480,220,color);
  txt(title,480,235,30,color,"center","bold");
  lines.forEach((l,i)=>txt(l,480,285+i*28,16,"#fff","center"));
  txt("E / Enter para continuar",480,365,13,"#aaa","center");
}


const QUIZZES=[
  {title:"QUIZ DOS ECOS",questions:[
    {q:"Qual área guarda memórias que não são suas?",o:["Vale das Cinzas","Lago das Memórias","Caverna do Eco"],a:1},
    {q:"Quem entrega mapas secretos?",o:["Milo","Kafro","Zyra"],a:0},
    {q:"Quantas lanternas podem ser acesas?",o:["3","4","5"],a:2},
    {q:"O que o Bosque Prismático guarda?",o:["Escolhas","Ouro","Portais"],a:0},
    {q:"O que alimenta o eclipse?",o:["Memórias esquecidas","Água","Cristais azuis"],a:0}
  ]}
];
function startQuiz(){S.mode="quiz";S.quiz={index:0,score:0,choice:0};sound("confirm")}
function quizInput(){const q=QUIZZES[0].questions[S.quiz.index]; if((pressed.arrowleft||pressed.a||pressed.arrowup||pressed.w)&&!S.cool){S.quiz.choice=(S.quiz.choice+q.o.length-1)%q.o.length;S.cool=.13} if((pressed.arrowright||pressed.d||pressed.arrowdown||pressed.s)&&!S.cool){S.quiz.choice=(S.quiz.choice+1)%q.o.length;S.cool=.13} if(pressed.x||pressed.escape){S.mode="world";return} if(pressed.e||pressed.enter||pressed[" "]){if(S.quiz.choice===q.a)S.quiz.score++;S.quiz.index++;S.quiz.choice=0;if(S.quiz.index>=QUIZZES[0].questions.length){const score=S.quiz.score;S.flags.quizzes++;S.quests.quiz=true;if(score===5){rewardMemory("Mestre dos Ecos");S.stats.perfectFights++;}say(["Quiz concluído: "+score+"/5.",score>=4?"Os ecos reconheceram suas escolhas.":"Os ecos querem que você explore mais.","Memórias conquistadas: "+S.memories.length],"Ari");S.mode="dialogue";checkAchievements();saveGame();}}}
function startMemory(){if(!S.memories.length){say(["Sua alma ainda não guarda memórias suficientes.","Explore, investigue e converse para encontrar fragmentos."],"Memórias");return}S.mode="memory";S.memoryIndex=Math.min(S.memoryIndex,S.memories.length-1)}
function memoryInput(){if(pressed.x||pressed.escape||pressed.m||pressed.enter||pressed.e||pressed[" "]){if(pressed.x||pressed.escape||pressed.m||pressed.enter||pressed.e||pressed[" "]){S.mode="world";return}} const len=S.memories.length;if(!len)return; if((pressed.arrowleft||pressed.a||pressed.arrowup||pressed.w)&&!S.cool){S.memoryIndex=(S.memoryIndex+len-1)%len;S.cool=.13} if((pressed.arrowright||pressed.d||pressed.arrowdown||pressed.s)&&!S.cool){S.memoryIndex=(S.memoryIndex+1)%len;S.cool=.13}}
function startChoice(){S.mode="choice";S.choices=0}
function choiceInput(){if((pressed.arrowup||pressed.w)&&!S.cool){S.choices=(S.choices+2)%3;S.cool=.14}if((pressed.arrowdown||pressed.s)&&!S.cool){S.choices=(S.choices+1)%3;S.cool=.14}if(pressed.x||pressed.escape){S.mode="world";return}if(pressed.e||pressed.enter||pressed[" "]){const c=["Perdo a sombra.","Guardo a memória.","Desafio o eclipse."][S.choices];S.flags.route=S.choices===0?"pacifist":S.choices===2?"aggressive":"balanced";S.storyStep=Math.max(S.storyStep,8);rewardMemory(c);say(["Sua escolha foi registrada.","Rota atual: "+S.flags.route.toUpperCase(),S.choices===0?"Algumas almas poderão voltar.":S.choices===1?"A memória permanecerá com você.":"O eclipse sentiu seu desafio."],"A Alma");saveGame();}}
function journalInput(){if(pressed.x||pressed.escape||pressed.j||pressed.enter||pressed.e||pressed[" "]){S.mode="world";return}}
function checkAchievements(){const a=[]; const add=(id,name,desc)=>{if(!S.achievements.includes(id)){S.achievements.push(id);toast("Conquista: "+name)}}; if(S.flags.inspected>=5)add("curious","Curioso Demais","Investigou 5 lugares."); if(S.flags.lanterns>=5)add("lanterns","Luz de Volta","Acendeu as 5 lanternas."); if(S.stats.kills===0&&S.stats.spares>=1)add("mercy","Primeira Piedade","Poupe um inimigo."); if(S.stats.spares>=4)add("pacifist","Coração Gentil","Poupe 4 inimigos."); if(S.stats.kills>=3)add("hunter","Sem Medo","Derrote 3 inimigos."); if(S.flags.secretRooms>=1)add("secret","O Que Você Viu?","Encontrou uma sala secreta."); if(S.memories.length>=5)add("memory","Memória Viva","Encontre 5 memórias."); if(S.flags.quizzes>=1)add("quiz","Ouvinte dos Ecos","Complete um quiz."); saveGame();}
function drawQuiz(){drawWorld();ctx.fillStyle="#02020bf0";ctx.fillRect(0,0,W,H);roundRect(120,75,720,405,12,true);strokeRect(120,75,720,405,"#8de7ff");const q=QUIZZES[0].questions[S.quiz.index];txt("QUIZ DOS ECOS",480,115,26,"#fff","center","bold");txt(`Pergunta ${S.quiz.index+1}/5  •  Pontos ${S.quiz.score}`,480,145,13,"#9fdfff","center");wrapText(q.q,160,200,640,28,"#fff");q.o.forEach((o,i)=>{const y=285+i*55;ctx.fillStyle=i===S.quiz.choice?"#7b39d8":"#0c0b15";roundRect(185,y,590,42,7,true);strokeRect(185,y,590,42,i===S.quiz.choice?"#fff":"#6b5f7d");txt((i===S.quiz.choice?"◆ ":"  ")+o,210,y+27,16,i===S.quiz.choice?"#fff":"#bbb","left",i===S.quiz.choice?"bold":"normal")});txt("← → escolher   E confirmar   X sair",480,455,12,"#aaa","center")}
function drawMemory(){ctx.fillStyle="#04030b";ctx.fillRect(0,0,W,H);const bg=img[ S.map==="lake"?"scene14-lake-dialogue":"scene15-ending"];if(bg&&bg.complete&&bg.naturalWidth>0&&!bg.__failed){ctx.globalAlpha=.35;ctx.drawImage(bg,0,0,W,H);ctx.globalAlpha=1;}roundRect(145,80,670,380,12,true);strokeRect(145,80,670,380,"#c47cff");txt("ARQUIVO DE MEMÓRIAS",480,125,25,"#fff","center","bold");if(!S.memories.length){txt("Nenhuma memória encontrada.",480,240,18,"#aaa","center");}else{const m=S.memories[S.memoryIndex]||S.memories[0];txt("✦ "+m,480,225,21,"#dba6ff","center","bold");wrapText("Fragmentos do passado se reorganizam dentro de você. Algumas memórias mudam de significado quando suas escolhas mudam.",220,285,520,28,"#fff");txt(`${S.memoryIndex+1}/${S.memories.length}`,480,390,13,"#aaa","center");}txt("← → trocar   X / Esc voltar",480,430,13,"#bbb","center")}
function drawChoice(){drawWorld();ctx.fillStyle="#000c";ctx.fillRect(0,0,W,H);roundRect(180,105,600,330,12,true);strokeRect(180,105,600,330,"#d47cff");txt("O QUE SUA ALMA ESCOLHE?",480,150,22,"#fff","center","bold");["Perdoar a sombra","Guardar a memória","Desafiar o eclipse"].forEach((x,i)=>{const y=205+i*62;ctx.fillStyle=i===S.choices?"#a83cff":"#0b0a12";roundRect(240,y,480,44,7,true);strokeRect(240,y,480,44,i===S.choices?"#fff":"#6a5c77");txt((i===S.choices?"◆ ":"  ")+x,480,y+28,16,"#fff","center",i===S.choices?"bold":"normal")});txt("↑ ↓ escolher   E confirmar",480,405,13,"#bbb","center")}
function drawJournal(){ctx.fillStyle="#05040b";ctx.fillRect(0,0,W,H);roundRect(105,55,750,430,12,true);strokeRect(105,55,750,430,"#65dfff");txt("DIÁRIO DE SOULBOUND",480,95,26,"#fff","center","bold");const route=S.flags.route.toUpperCase();txt("Rota: "+route,135,135,14,"#ffcb71");txt("Capítulo 1 • "+maps[S.map].name,135,160,14,"#9ee7ff");txt("Memórias: "+S.memories.length+"   Investigações: "+S.flags.inspected+"   Lanternas: "+S.flags.lanterns+"/5",135,190,14,"#d9c9e6");txt("BATALHAS",135,235,13,"#a77aff","left","bold");txt("Lutas: "+S.stats.battles,135,258,14,"#fff");txt("Derrotas: "+S.stats.kills,280,258,14,"#fff");txt("Poupados: "+S.stats.spares,450,258,14,"#fff");txt("CONQUISTAS",135,300,13,"#a77aff","left","bold");txt(S.achievements.length+" desbloqueadas",135,325,15,"#fff");txt("Missões",135,365,13,"#a77aff","left","bold");txt("Milo "+(S.quests.cartographer?"✓":"○")+"  Lanternas "+(S.quests.lanterns?"✓":"○")+"  Quiz "+(S.quests.quiz?"✓":"○")+"  Forja "+(S.quests.blacksmith?"✓":"○"),135,390,14,"#fff");txt("J / Enter / X — voltar",480,450,13,"#aaa","center")}
function drawAchievements(){ctx.fillStyle="#04030a";ctx.fillRect(0,0,W,H);roundRect(145,60,670,430,12,true);strokeRect(145,60,670,430,"#ffd45e");txt("CONQUISTAS",480,100,28,"#fff","center","bold");const list=[ ["curious","Curioso Demais"],["lanterns","Luz de Volta"],["mercy","Primeira Piedade"],["pacifist","Coração Gentil"],["hunter","Sem Medo"],["secret","O Que Você Viu?"],["memory","Memória Viva"],["quiz","Ouvinte dos Ecos"] ]; list.forEach((a,i)=>{const y=150+i*38; const ok=S.achievements.includes(a[0]);txt((ok?"◆":"◇")+" "+a[1],185,y,15,ok?"#ffd45e":"#6e6578","left",ok?"bold":"normal")});txt("K / X / Esc — voltar",480,455,13,"#aaa","center")}

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
    if(!S.pause){moveWorld(dt);encounterCheck();if(pressed.j){S.mode="journal";return}if(pressed.m){S.mode="memory";return}if(pressed.k){S.mode="achievements";return}if(pressed.e||pressed[" "]||pressed.enter)interact();if(pressed.s)saveGame();if(pressed.x||pressed.escape)S.pause=true;}
    else pauseInput();
  }else if(S.mode==="dialogue"){dialogueInput();S.dialogueChars+=dt*42;if(S.dialogueChars>=(S.dialogues[S.dialogueIndex]||"").length)S.dialogueDone=true;}
  else if(S.mode==="battle"){battleInput();updateBattle(dt);}
  else if(S.mode==="settings")settingsInput();
  else if(S.mode==="quiz")quizInput();
  else if(S.mode==="memory")memoryInput();
  else if(S.mode==="choice")choiceInput();
  else if(S.mode==="journal")journalInput();
  else if(S.mode==="achievements")journalInput();
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
  else if(S.mode==="quiz")drawQuiz();
  else if(S.mode==="memory")drawMemory();
  else if(S.mode==="choice")drawChoice();
  else if(S.mode==="journal")drawJournal();
  else if(S.mode==="achievements")drawAchievements();
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