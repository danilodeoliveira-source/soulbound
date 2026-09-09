const canvas=document.getElementById("screen");
const ctx=canvas.getContext("2d");
const W=640,H=360;
const keys={},pressed={};
let screenConfirm=false;
canvas.addEventListener("pointerdown",()=>{screenConfirm=true});

addEventListener("keydown",e=>{
  const k=e.key.toLowerCase();
  if(!keys[k]) pressed[k]=true;
  keys[k]=true;
  if([" ","arrowup","arrowdown","arrowleft","arrowright"].includes(k))e.preventDefault();
});
addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);

document.querySelectorAll("#mobile-controls button").forEach(b=>{
  const k=b.dataset.key;
  const down=e=>{e.preventDefault();if(!keys[k])pressed[k]=true;keys[k]=true};
  const up=e=>{e.preventDefault();keys[k]=false};
  b.addEventListener("pointerdown",down);
  b.addEventListener("pointerup",up);
  b.addEventListener("pointercancel",up);
  b.addEventListener("pointerleave",up);
});

const saveKey="soulbound-v2-save";
let data={};
try{data=JSON.parse(localStorage.getItem(saveKey)||"{}")}catch(e){data={}}

let state="title",last=0,notice="",shake=0;
const player={x:320,y:285,r:7,s:2.5,hp:data.hp||20,maxHp:20};
let map=data.map||"vale";
let soulFound=!!data.soul;
let courage=Number(data.courage||0);
let pacifist=Number(data.pacifist||0);
let dialogue=[],dialogueIndex=0,afterDialogue="world";
let battle=null;

const maps={
 vale:{name:"Vale das Cinzas",bg:"#11182a",ground:"#1c2940"},
 forest:{name:"Floresta Sussurrante",bg:"#0b1813",ground:"#173326"},
 cave:{name:"Caverna do Eco",bg:"#17121e",ground:"#30233a"}
};

const npcs={
 vale:[
  {x:145,y:105,name:"Mira",lines:["Mira: “Você não parece daqui.”","Mira: “Se encontrar uma alma perdida, não a abandone.”"]},
  {x:490,y:120,name:"Téo",lines:["Téo: “O norte leva para a floresta.”","Téo: “Mas os monstros ficam mais inquietos depois do pôr do sol.”"]}
 ],
 forest:[
  {x:175,y:120,name:"Lume",lines:["Lume: “A floresta escuta suas escolhas.”","Lume: “Nem todo inimigo quer lutar.”"]},
  {x:465,y:250,name:"Nara",lines:["Nara: “Há uma passagem escondida na caverna.”","Nara: “Procure a ponte de pedra.”"]}
 ],
 cave:[
  {x:150,y:245,name:"Orin",lines:["Orin: “Você chegou longe.”","Orin: “O Guardião protege o coração da caverna.”"]},
  {x:500,y:100,name:"Eco",lines:["Eco: “Força sem escolha é apenas ruído.”"]}
 ]
};

const encounters={
 forest:{name:"Morcego Nebuloso",hp:18,maxHp:18,pattern:"zigzag"},
 cave:{name:"Sentinela de Pedra",hp:25,maxHp:25,pattern:"walls"},
 boss:{name:"Guardião do Eclipse",hp:45,maxHp:45,pattern:"rain",boss:true}
};

function saveGame(){
 localStorage.setItem(saveKey,JSON.stringify({
  hp:player.hp,map,soul:soulFound,courage,pacifist
 }));
}
function resetSave(){
 localStorage.removeItem(saveKey);
 data={};player.hp=20;map="vale";soulFound=false;courage=0;pacifist=0;
 player.x=320;player.y=285;notice="Novo jogo.";
}
function move(dx,dy,dt){
 if(dx&&dy){dx*=.7071;dy*=.7071}
 player.x=Math.max(25,Math.min(615,player.x+dx*player.s*dt*60));
 player.y=Math.max(58,Math.min(335,player.y+dy*player.s*dt*60));
}
function interact(){
 const list=npcs[map]||[];
 for(const n of list){
  if(Math.hypot(player.x-n.x,player.y-n.y)<32){
   dialogue=[...n.lines];dialogueIndex=0;afterDialogue="world";state="dialogue";return;
  }
 }
 if(map==="vale"&&!soulFound&&Math.hypot(player.x-535,player.y-245)<30){
  soulFound=true;player.hp=Math.min(player.maxHp,player.hp+5);
  dialogue=["Você encontrou sua alma.","Seu coração ficou mais forte. HP +5."];
  dialogueIndex=0;afterDialogue="world";state="dialogue";saveGame();return;
 }
 if(map==="vale"&&soulFound&&player.y<75){map="forest";player.x=320;player.y=315;notice="Você entrou na Floresta Sussurrante.";saveGame();return}
 if(map==="forest"&&player.y<65){map="cave";player.x=320;player.y=315;notice="A passagem leva à Caverna do Eco.";saveGame();return}
 if(map==="forest"&&player.x>600){map="vale";player.x=35;player.y=180;notice="Você voltou ao vale.";saveGame();return}
 if(map==="cave"&&player.y<75){startBattle("boss");return}
}

function randomEncounter(){
 if(map==="forest"&&Math.random()<.0022)startBattle("forest");
 if(map==="cave"&&Math.random()<.0028)startBattle("cave");
}
function startBattle(type){
 const e=encounters[type];
 battle={
  type,enemy:e.name,hp:e.hp,maxHp:e.maxHp,pattern:e.pattern,boss:!!e.boss,
  phase:"menu",choice:0,turn:0,timer:0,shots:[],
  heart:{x:320,y:265,r:7},acted:false
 };
 state="battle";notice="";
}
const options=["LUTAR","AGIR","ITEM","POUPAR"];

function update(dt){
 if(state==="title"){
  if(pressed.enter||pressed[" "]){state="world";notice="Explore o mundo. Aperte E perto de pessoas e objetos.";saveGame()}
  if(pressed.r){resetSave()}
  return;
 }
 if(state==="dialogue"){
  if(pressed.e||pressed[" "]||pressed.enter){
   dialogueIndex++;
   if(dialogueIndex>=dialogue.length){state=afterDialogue;notice="";saveGame()}
  }
  return;
 }
 if(state==="world"){
  let dx=(keys.arrowright||keys.d?1:0)-(keys.arrowleft||keys.a?1:0);
  let dy=(keys.arrowdown||keys.s?1:0)-(keys.arrowup||keys.w?1:0);
  move(dx,dy,dt);
  if(pressed.e||pressed[" "])interact();
  randomEncounter();
  return;
 }
 if(state==="battle")updateBattle(dt);
}

function updateBattle(dt){
 if(battle.phase==="menu"){
  if(pressed.arrowleft||pressed.a)battle.choice=(battle.choice+3)%4;
  if(pressed.arrowright||pressed.d)battle.choice=(battle.choice+1)%4;
  if(pressed.e||pressed[" "]||pressed.enter){
   const c=options[battle.choice];
   if(c==="LUTAR"){
    const dmg=5+Math.floor(Math.random()*6);
    battle.hp=Math.max(0,battle.hp-dmg);
    courage++;
    notice=`Você causou ${dmg} de dano.`;
    if(battle.hp<=0){battle.phase="win";saveGame();return}
    battle.phase="enemy";battle.timer=0;battle.shots=[];
   }else if(c==="AGIR"){
    pacifist++;
    notice=battle.boss?"Você encara o Guardião sem atacar.":"Você observou o inimigo. Ele hesitou.";
    battle.phase="enemy";battle.timer=0;battle.shots=[];
   }else if(c==="ITEM"){
    if(player.hp<player.maxHp){player.hp=Math.min(player.maxHp,player.hp+8);notice="Você usou uma essência. HP +8."}
    else notice="Seu HP já está cheio.";
    battle.phase="enemy";battle.timer=0;battle.shots=[];
   }else{
    if(battle.turn>=1||pacifist>=2){battle.phase="spared";saveGame();return}
    notice="Ele ainda não confia em você.";
    battle.phase="enemy";battle.timer=0;battle.shots=[];
   }
  }
  return;
 }
 if(battle.phase==="enemy"){
  battle.timer+=dt;
  spawnPattern(dt);
  for(const s of battle.shots){s.x+=s.vx*dt*60;s.y+=s.vy*dt*60}
  battle.shots=battle.shots.filter(s=>s.x>-30&&s.x<670&&s.y>145&&s.y<330);
  const h=battle.heart;
  let hx=(keys.arrowright||keys.d?1:0)-(keys.arrowleft||keys.a?1:0);
  let hy=(keys.arrowdown||keys.s?1:0)-(keys.arrowup||keys.w?1:0);
  const speed=battle.boss?225:215;
  if(hx&&hy){hx*=.7071;hy*=.7071}
  h.x+=hx*speed*dt;h.y+=hy*speed*dt;
  h.x=Math.max(83+h.r,Math.min(557-h.r,h.x));
  h.y=Math.max(163+h.r,Math.min(312-h.r,h.y));
  for(const s of battle.shots){
   if(Math.hypot(s.x-h.x,s.y-h.y)<s.r+h.r){
    if(!s.hit){s.hit=true;player.hp--;shake=6}
   }
  }
  if(player.hp<=0){battle.phase="lose";return}
  if(battle.timer>4.2){
   battle.turn++;battle.phase="menu";battle.shots=[];notice="Seu turno.";saveGame();
  }
  return;
 }
 if(battle.phase==="win"||battle.phase==="spared"){
  // Resultado: E, Espaço, Enter ou clique/toque.
  if(pressed.e||pressed[" "]||pressed.enter||screenConfirm){
   screenConfirm=false;
   player.hp=Math.min(player.maxHp,player.hp+3);
   if(battle.boss){map="cave";player.x=320;player.y=300;notice="O coração da caverna foi protegido."}
   else {player.x=320;player.y=300;notice="O caminho continua."}
   battle=null;state="world";saveGame();
  }
  return;
 }
 if(battle.phase==="lose"){
  if(pressed.e||pressed[" "]||pressed.enter||screenConfirm){
   screenConfirm=false;
   player.hp=10;battle=null;state="world";player.x=320;player.y=300;notice="Você voltou com 10 HP. Tente outra vez.";
   saveGame();
  }
 }
}

function spawnPattern(dt){
 const t=battle.timer;
 if(battle.pattern==="zigzag"){
  if(Math.floor(t*5)!==Math.floor((t-dt)*5)){
   battle.shots.push({x:90+Math.random()*460,y:160,r:5,vx:(Math.random()-.5)*2,vy:1.8});
  }
 }else if(battle.pattern==="walls"){
  if(Math.floor(t*3)!==Math.floor((t-dt)*3)){
   const side=Math.random()<.5;
   battle.shots.push(side
    ?{x:82,y:170+Math.random()*135,r:6,vx:2.6,vy:0}
    :{x:558,y:170+Math.random()*135,r:6,vx:-2.6,vy:0});
  }
 }else{
  if(Math.floor(t*8)!==Math.floor((t-dt)*8)){
   battle.shots.push({x:90+Math.random()*460,y:158,r:4,vx:(Math.random()-.5)*1.2,vy:2.5+Math.random()*1.5});
  }
  if(Math.floor(t*2)!==Math.floor((t-dt)*2)){
   battle.shots.push({x:90,y:235+Math.sin(t*4)*55,r:5,vx:3.2,vy:0});
  }
 }
}

function draw(){
 ctx.save();
 if(shake){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake*=.88;if(shake<.2)shake=0}
 ctx.clearRect(0,0,W,H);
 if(state==="title")drawTitle();
 else if(state==="world"||state==="dialogue"){drawWorld();if(state==="dialogue")drawDialogue()}
 else drawBattle();
 ctx.restore();
 for(const k in pressed)delete pressed[k];
 requestAnimationFrame(loop);
}
function text(t,x,y,size=13,align="left"){
 ctx.font=`${size}px monospace`;ctx.textAlign=align;ctx.fillStyle="#fff";ctx.fillText(t,x,y)
}
function drawTitle(){
 ctx.fillStyle="#07070d";ctx.fillRect(0,0,W,H);
 text("SOULBOUND",W/2,105,54,"center");ctx.fillStyle="#aaa";
 text("V2 — O Vale, a Floresta e a Caverna",W/2,140,15,"center");
 ctx.strokeStyle="#fff";ctx.strokeRect(245,185,150,50);text("COMEÇAR",W/2,216,17,"center");
 text("WASD / SETAS • E / ESPAÇO",W/2,265,12,"center");
 text("R reinicia o save",W/2,288,11,"center");
}
function drawWorld(){
 const m=maps[map];ctx.fillStyle=m.bg;ctx.fillRect(0,0,W,H);
 ctx.fillStyle=m.ground;ctx.fillRect(0,55,W,305);
 // decoração original simples
 for(let i=0;i<22;i++){
  const x=(i*83+37)%620,y=75+(i*47)%250;
  ctx.fillStyle=map==="forest"?"#28543a":map==="cave"?"#4a3555":"#30405c";
  ctx.fillRect(x,y,5,5);
 }
 ctx.fillStyle="#09090d";ctx.fillRect(10,10,620,34);
 text(`${m.name}   •   HP ${player.hp}/${player.maxHp}`,20,32,12);
 if(map==="vale"&&!soulFound){
  ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(535,245,10,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#e44";ctx.beginPath();ctx.moveTo(535,238);ctx.lineTo(542,245);ctx.lineTo(535,252);ctx.lineTo(528,245);ctx.fill();
 }
 for(const n of npcs[map]){
  ctx.fillStyle=map==="forest"?"#416b50":map==="cave"?"#72527b":"#70454c";ctx.fillRect(n.x-8,n.y-10,16,24);
  ctx.fillStyle="#f1c5a8";ctx.beginPath();ctx.arc(n.x,n.y-16,7,0,Math.PI*2);ctx.fill();
 }
 ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(player.x,player.y,player.r,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#e33";ctx.beginPath();ctx.arc(player.x,player.y,3,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#000c";ctx.fillRect(14,310,612,38);ctx.strokeStyle="#fff";ctx.strokeRect(14,310,612,38);
 text(notice||"Explore. E para interagir.",25,334,11);
}
function drawDialogue(){
 ctx.fillStyle="#000e";ctx.fillRect(38,75,564,195);ctx.strokeStyle="#fff";ctx.lineWidth=3;ctx.strokeRect(38,75,564,195);
 wrap(dialogue[dialogueIndex]||"",62,120,515,23);text("E / ESPAÇO para continuar",62,245,11);ctx.textAlign="left";
}
function wrap(t,x,y,max,lh){
 const words=t.split(" ");let line="";
 for(const w of words){const test=line?line+" "+w:w;if(ctx.measureText(test).width>max){ctx.fillText(line,x,y);y+=lh;line=w}else line=test}
 ctx.fillText(line,x,y);
}
function drawBattle(){
 ctx.fillStyle="#08080d";ctx.fillRect(0,0,W,H);
 text(battle.enemy,25,31,17);text(`HP ${player.hp}/${player.maxHp}`,470,31,13);
 ctx.fillStyle="#400";ctx.fillRect(250,52,140,11);ctx.fillStyle="#e55";ctx.fillRect(250,52,140*(battle.hp/battle.maxHp),11);
 if(battle.phase==="menu"||battle.phase==="enemy"){
  ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.strokeRect(75,155,490,165);
  if(battle.phase==="enemy"){
   ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(battle.heart.x,battle.heart.y,9,0,Math.PI*2);ctx.fill();
   ctx.fillStyle="#e33";ctx.beginPath();ctx.arc(battle.heart.x,battle.heart.y,6,0,Math.PI*2);ctx.fill();
   for(const s of battle.shots){ctx.fillStyle=s.hit?"#333":"#f55";ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill()}
   text("DESVIE!  WASD / SETAS",320,145,11,"center");
  }else{
   text(notice||"O que você fará?",95,185,13);
   options.forEach((o,i)=>{
    ctx.strokeStyle=i===battle.choice?"#fff":"#555";ctx.strokeRect(92+i*116,245,102,40);
    text(o,143+i*116,270,12,"center");
   });
  }
 }else{
  text(battle.phase==="win"?"VITÓRIA!":battle.phase==="spared"?"POUPADO!":"VOCÊ CAIU...",320,180,29,"center");
  ctx.fillStyle="#aaa";text("E / ESPAÇO / ENTER ou CLIQUE para continuar",320,225,11,"center");
 }
}
function loop(t){
 const dt=Math.min(.033,(t-last)/1000||.016);last=t;update(dt);draw();
}
requestAnimationFrame(loop);
