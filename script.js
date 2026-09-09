const canvas=document.getElementById("screen");
const ctx=canvas.getContext("2d");
const W=640,H=360;
const keys={},pressed={};
let screenConfirm=false,last=0,shake=0;

addEventListener("keydown",e=>{
 const k=e.key.toLowerCase();
 if(!keys[k])pressed[k]=true;
 keys[k]=true;
 if([" ","arrowup","arrowdown","arrowleft","arrowright"].includes(k))e.preventDefault();
});
addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
canvas.addEventListener("pointerdown",()=>screenConfirm=true);

document.querySelectorAll("#mobile-controls button").forEach(b=>{
 const k=b.dataset.key;
 const down=e=>{e.preventDefault();if(!keys[k])pressed[k]=true;keys[k]=true};
 const up=e=>{e.preventDefault();keys[k]=false};
 b.addEventListener("pointerdown",down);b.addEventListener("pointerup",up);
 b.addEventListener("pointercancel",up);b.addEventListener("pointerleave",up);
});

const saveKey="soulbound-v3-save";
let data={};
try{data=JSON.parse(localStorage.getItem(saveKey)||"{}")}catch(e){data={}};
let state="title",map=data.map||"vale",notice="";
let soulFound=!!data.soul,courage=Number(data.courage||0),pacifist=Number(data.pacifist||0);
let defeated=Object.assign({bat:false,sentinel:false,boss:false},data.defeated||{});
let dialogue=[],dialogueIndex=0,afterDialogue="world",nearText="";
const player={x:320,y:285,r:8,s:2.6,hp:data.hp||20,maxHp:20};

const portraits={bat:new Image(),sentinel:new Image(),boss:new Image()};
portraits.bat.src="assets/bat.svg";
portraits.sentinel.src="assets/sentinel.svg";
portraits.boss.src="assets/eclipse.svg";

const maps={
 vale:{name:"Vale das Cinzas",bg:"#10182a",ground:"#1c2a42"},
 forest:{name:"Floresta Sussurrante",bg:"#09160f",ground:"#173426"},
 cave:{name:"Caverna do Eco",bg:"#16101d",ground:"#30223a"}
};
const npcs={
 vale:[
  {x:145,y:110,name:"Mira",type:"mira",lines:["Mira: “Você não parece daqui.”","Mira: “Se encontrar uma alma perdida, não a abandone.”"]},
  {x:490,y:120,name:"Téo",type:"teo",lines:["Téo: “O norte leva para a floresta.”","Téo: “Mas escolha seus passos com cuidado.”"]}
 ],
 forest:[
  {x:170,y:125,name:"Lume",type:"lume",lines:["Lume: “A floresta escuta suas escolhas.”","Lume: “Nem todo inimigo precisa ser destruído.”"]},
  {x:465,y:250,name:"Nara",type:"nara",lines:["Nara: “Há uma passagem escondida na caverna.”","Nara: “Procure a ponte de pedra ao norte.”"]}
 ],
 cave:[
  {x:150,y:245,name:"Orin",type:"orin",lines:["Orin: “Você chegou longe.”","Orin: “O Guardião protege o coração da caverna.”"]},
  {x:500,y:100,name:"Eco",type:"eco",lines:["Eco: “Força sem escolha é apenas ruído.”"]}
 ]
};

const encounters={
 bat:{name:"Morcego Nebuloso",hp:18,maxHp:18,pattern:"zigzag",portrait:"bat"},
 sentinel:{name:"Sentinela de Pedra",hp:25,maxHp:25,pattern:"walls",portrait:"sentinel"},
 boss:{name:"Guardião do Eclipse",hp:45,maxHp:45,pattern:"rain",portrait:"boss",boss:true}
};

let battle=null;

function saveGame(){
 localStorage.setItem(saveKey,JSON.stringify({hp:player.hp,map,soul:soulFound,courage,pacifist,defeated}));
}
function resetSave(){
 localStorage.removeItem(saveKey);location.reload();
}
function start(){
 player.hp=data.hp||20;state="world";
 notice="Explore. Fale com os habitantes usando E.";
 saveGame();
}
function say(lines){
 dialogue=[...lines];dialogueIndex=0;afterDialogue="world";state="dialogue";
}
function move(dx,dy,dt){
 if(dx&&dy){dx*=.7071;dy*=.7071}
 player.x=Math.max(25,Math.min(615,player.x+dx*player.s*dt*60));
 player.y=Math.max(58,Math.min(335,player.y+dy*player.s*dt*60));
}
function interact(){
 const list=npcs[map]||[];
 let closest=null,dist=999;
 for(const n of list){
  const d=Math.hypot(player.x-n.x,player.y-n.y);
  if(d<dist){dist=d;closest=n}
 }
 if(closest&&dist<48){say(closest.lines);return}
 if(map==="vale"&&!soulFound&&Math.hypot(player.x-535,player.y-245)<38){
  soulFound=true;player.hp=Math.min(player.maxHp,player.hp+5);
  say(["Você encontrou sua alma.","Agora você pode sentir seu próprio coração. HP +5."]);
  saveGame();return;
 }
 if(map==="vale"&&soulFound&&player.y<75){
  map="forest";player.x=320;player.y=315;notice="Floresta Sussurrante";saveGame();return
 }
 if(map==="forest"&&player.y<65){
  map="cave";player.x=320;player.y=315;notice="Caverna do Eco";saveGame();return
 }
 if(map==="forest"&&player.x>600){
  map="vale";player.x=35;player.y=180;notice="Você voltou ao vale.";saveGame();return
 }
 if(map==="cave"&&player.y<75&&!defeated.boss)startBattle("boss");
}
function encounterAt(type){
 if(defeated[type])return;
 startBattle(type);
}
function update(dt){
 if(state==="title"){
  if(pressed.enter||pressed[" "])start();
  if(pressed.r)resetSave();
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
  // Encontros únicos: cada tipo só aparece uma vez e fica derrotado depois.
  if(map==="forest"&&!defeated.bat&&player.x>290&&player.x<350&&player.y<110)encounterAt("bat");
  if(map==="cave"&&!defeated.sentinel&&player.x>270&&player.x<370&&player.y>130&&player.y<205)encounterAt("sentinel");
  return;
 }
 if(state==="battle")updateBattle(dt);
}

function updateBattle(dt){
 if(battle.phase==="menu"){
  if(pressed.arrowleft||pressed.a)battle.choice=(battle.choice+3)%4;
  if(pressed.arrowright||pressed.d)battle.choice=(battle.choice+1)%4;
  if(pressed.e||pressed[" "]||pressed.enter){
   const c=["LUTAR","AGIR","ITEM","POUPAR"][battle.choice];
   if(c==="LUTAR"){
    const dmg=5+Math.floor(Math.random()*6);
    battle.hp=Math.max(0,battle.hp-dmg);courage++;
    notice=`Você causou ${dmg} de dano.`;
    if(battle.hp<=0){finishBattle("win");return}
    battle.phase="enemy";battle.timer=0;battle.shots=[];
   }else if(c==="AGIR"){
    pacifist++;notice=battle.boss?"Você encarou o Guardião sem atacar.":"Você observou o inimigo. Ele hesitou.";
    battle.phase="enemy";battle.timer=0;battle.shots=[];
   }else if(c==="ITEM"){
    if(player.hp<player.maxHp){player.hp=Math.min(player.maxHp,player.hp+8);notice="Você usou uma essência. HP +8."}
    else notice="Seu HP já está cheio.";
    battle.phase="enemy";battle.timer=0;battle.shots=[];
   }else{
    if(battle.turn>=1||pacifist>=2){finishBattle("spared");return}
    notice="Ele ainda não confia em você.";battle.phase="enemy";battle.timer=0;battle.shots=[];
   }
  }
  return;
 }
 if(battle.phase==="enemy"){
  battle.timer+=dt;spawnPattern(dt);
  for(const s of battle.shots){s.x+=s.vx*dt*60;s.y+=s.vy*dt*60}
  battle.shots=battle.shots.filter(s=>s.x>-30&&s.x<670&&s.y>145&&s.y<330);
  const h=battle.heart;
  let hx=(keys.arrowright||keys.d?1:0)-(keys.arrowleft||keys.a?1:0);
  let hy=(keys.arrowdown||keys.s?1:0)-(keys.arrowup||keys.w?1:0);
  if(hx&&hy){hx*=.7071;hy*=.7071}
  const speed=battle.boss?225:220;
  h.x+=hx*speed*dt;h.y+=hy*speed*dt;
  h.x=Math.max(83+h.r,Math.min(557-h.r,h.x));
  h.y=Math.max(163+h.r,Math.min(312-h.r,h.y));
  for(const s of battle.shots){
   if(!s.hit&&Math.hypot(s.x-h.x,s.y-h.y)<s.r+h.r){s.hit=true;player.hp--;shake=6}
  }
  if(player.hp<=0){battle.phase="lose";return}
  if(battle.timer>4.2){battle.turn++;battle.phase="menu";battle.shots=[];notice="Seu turno.";saveGame()}
  return;
 }
 if(battle.phase==="result"){
  if(pressed.e||pressed[" "]||pressed.enter||screenConfirm){
   screenConfirm=false;player.hp=Math.min(player.maxHp,player.hp+3);
   if(battle.boss){map="cave";player.x=320;player.y=300;notice="O coração da caverna foi protegido."}
   else {player.x=320;player.y=300;notice="O inimigo não voltará a lutar."}
   battle=null;state="world";saveGame();
  }
  return;
 }
 if(battle.phase==="lose"){
  if(pressed.e||pressed[" "]||pressed.enter||screenConfirm){
   screenConfirm=false;player.hp=10;battle=null;state="world";player.x=320;player.y=300;
   notice="Você voltou com 10 HP. Tente novamente.";saveGame();
  }
 }
}
function finishBattle(result){
 defeated[battle.type]=true;
 battle.phase="result";battle.result=result;saveGame();
}
function spawnPattern(dt){
 const t=battle.timer;
 if(battle.pattern==="zigzag"){
  if(Math.floor(t*5)!==Math.floor((t-dt)*5))
   battle.shots.push({x:90+Math.random()*460,y:160,r:5,vx:(Math.random()-.5)*2,vy:1.8});
 }else if(battle.pattern==="walls"){
  if(Math.floor(t*3)!==Math.floor((t-dt)*3)){
   const side=Math.random()<.5;
   battle.shots.push(side?{x:82,y:170+Math.random()*135,r:6,vx:2.6,vy:0}:{x:558,y:170+Math.random()*135,r:6,vx:-2.6,vy:0});
  }
 }else{
  if(Math.floor(t*8)!==Math.floor((t-dt)*8))
   battle.shots.push({x:90+Math.random()*460,y:158,r:4,vx:(Math.random()-.5)*1.2,vy:2.5+Math.random()*1.5});
  if(Math.floor(t*2)!==Math.floor((t-dt)*2))
   battle.shots.push({x:90,y:235+Math.sin(t*4)*55,r:5,vx:3.2,vy:0});
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
function txt(t,x,y,size=13,align="left"){
 ctx.font=`${size}px monospace`;ctx.textAlign=align;ctx.fillStyle="#fff";ctx.fillText(t,x,y)
}
function drawTitle(){
 ctx.fillStyle="#07070d";ctx.fillRect(0,0,W,H);
 txt("SOULBOUND",W/2,95,54,"center");ctx.fillStyle="#aaa";
 txt("V3 — Almas, escolhas e caminhos",W/2,130,15,"center");
 ctx.strokeStyle="#fff";ctx.strokeRect(245,175,150,50);txt("COMEÇAR",W/2,206,17,"center");
 txt("WASD / SETAS • E / ESPAÇO",W/2,255,12,"center");
 txt("R reinicia o save",W/2,278,11,"center");
}
function drawWorld(){
 const m=maps[map];ctx.fillStyle=m.bg;ctx.fillRect(0,0,W,H);ctx.fillStyle=m.ground;ctx.fillRect(0,55,W,305);
 for(let i=0;i<30;i++){
  const x=(i*83+37)%620,y=72+(i*47)%265;
  ctx.fillStyle=map==="forest"?"#2c5a3d":map==="cave"?"#4c3657":"#304565";ctx.fillRect(x,y,6,6);
 }
 ctx.fillStyle="#09090d";ctx.fillRect(10,10,620,34);txt(`${m.name} • HP ${player.hp}/${player.maxHp}`,20,32,12);
 if(map==="vale"&&!soulFound)drawSoul(535,245,1.2);
 for(const n of npcs[map])drawNPC(n);
 // Visualização dos encontros únicos.
 if(map==="forest"&&!defeated.bat)drawEnemyMini(320,92,"bat");
 if(map==="cave"&&!defeated.sentinel)drawEnemyMini(320,185,"sentinel");
 drawSoul(player.x,player.y,.72);
 if(nearText){ctx.fillStyle="#000c";ctx.fillRect(player.x-65,player.y-45,130,20);txt(nearText,player.x,player.y-31,9,"center")}
 ctx.fillStyle="#000c";ctx.fillRect(14,310,612,38);ctx.strokeStyle="#fff";ctx.strokeRect(14,310,612,38);
 txt(notice||"E para conversar, examinar ou entrar em uma passagem.",25,334,10);
}
function drawSoul(x,y,scale=1){
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
 ctx.shadowBlur=10;ctx.shadowColor="#ff405d";ctx.fillStyle="#ff405d";
 ctx.beginPath();ctx.moveTo(0,9);ctx.bezierCurveTo(-15,-2,-12,-14,-5,-16);
 ctx.bezierCurveTo(0,-17,0,-10,0,-10);ctx.bezierCurveTo(0,-10,0,-17,5,-16);
 ctx.bezierCurveTo(12,-14,15,-2,0,9);ctx.fill();
 ctx.shadowBlur=0;ctx.fillStyle="#fff";ctx.fillRect(-2,-9,4,8);
 ctx.restore();
}
function drawNPC(n){
 ctx.save();ctx.translate(n.x,n.y);
 const styles={mira:["#8b5265","#f2c2a5","#e6d4e9"],teo:["#3f6e8f","#d6a77f","#d8ecff"],lume:["#3f8a61","#e0b18c","#b9ffd7"],nara:["#7a5b9a","#e4b6a1","#ead4ff"],orin:["#75614d","#c99b78","#f1dfba"],eco:["#4d4a82","#c5b3aa","#d6d3ff"]};
 const s=styles[n.type]||styles.mira;
 ctx.fillStyle=s[0];ctx.fillRect(-13,-3,26,28);
 ctx.fillStyle=s[1];ctx.beginPath();ctx.arc(0,-16,11,0,Math.PI*2);ctx.fill();
 ctx.fillStyle=s[2];ctx.fillRect(-9,-27,18,5);
 ctx.fillStyle="#17151b";ctx.fillRect(-5,-18,3,3);ctx.fillRect(2,-18,3,3);
 ctx.fillStyle="#fff";ctx.fillRect(-12,2,4,18);ctx.fillRect(8,2,4,18);
 ctx.restore();
}
function drawEnemyMini(x,y,type){
 ctx.save();ctx.translate(x,y);
 if(type==="bat"){ctx.fillStyle="#4c557f";ctx.beginPath();ctx.moveTo(-28,5);ctx.lineTo(-8,-10);ctx.lineTo(0,-2);ctx.lineTo(8,-10);ctx.lineTo(28,5);ctx.lineTo(12,3);ctx.lineTo(0,14);ctx.lineTo(-12,3);ctx.closePath();ctx.fill()}
 else{ctx.fillStyle="#6f6578";ctx.fillRect(-20,-18,40,36);ctx.fillStyle="#78d8ff";ctx.fillRect(-12,-4,7,7);ctx.fillRect(5,-4,7,7)}
 ctx.restore();
}
function drawDialogue(){
 ctx.fillStyle="#000e";ctx.fillRect(34,68,572,204);ctx.strokeStyle="#fff";ctx.lineWidth=3;ctx.strokeRect(34,68,572,204);
 txt(dialogue[dialogueIndex]||"",58,118,15);txt("E / ESPAÇO / ENTER para continuar",58,246,11);ctx.textAlign="left";
}
function drawBattle(){
 ctx.fillStyle="#08080d";ctx.fillRect(0,0,W,H);
 txt(battle.enemy,25,29,17);txt(`HP ${player.hp}/${player.maxHp}`,480,29,12);
 ctx.fillStyle="#400";ctx.fillRect(250,49,140,11);ctx.fillStyle="#e55";ctx.fillRect(250,49,140*(battle.hp/battle.maxHp),11);
 // Retrato do inimigo.
 ctx.fillStyle="#111";ctx.fillRect(24,55,120,88);ctx.strokeStyle="#777";ctx.strokeRect(24,55,120,88);
 const img=portraits[battle.type];if(img.complete)ctx.drawImage(img,36,61,72,72);
 if(battle.phase==="menu"||battle.phase==="enemy"){
  ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.strokeRect(75,155,490,165);
  if(battle.phase==="enemy"){
   const h=battle.heart;
   drawSoul(h.x,h.y,1);
   for(const s of battle.shots){ctx.fillStyle=s.hit?"#333":"#f55";ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill()}
   txt("DESVIE! WASD / SETAS",320,145,11,"center");
  }else{
   txt(notice||"O que você fará?",95,185,13);
   ["LUTAR","AGIR","ITEM","POUPAR"].forEach((o,i)=>{
    ctx.strokeStyle=i===battle.choice?"#fff":"#555";ctx.strokeRect(92+i*116,245,102,40);
    txt(o,143+i*116,270,12,"center");
   });
  }
 }else if(battle.phase==="result"){
  txt(battle.result==="win"?"VITÓRIA!":"POUPADO!",320,180,29,"center");
  ctx.fillStyle="#aaa";txt("E / ESPAÇO / ENTER ou CLIQUE para continuar",320,225,10,"center");
 }else{
  txt("VOCÊ CAIU...",320,180,29,"center");ctx.fillStyle="#aaa";txt("E / ESPAÇO / ENTER ou CLIQUE para voltar",320,225,10,"center");
 }
}
function loop(t){
 const dt=Math.min(.033,(t-last)/1000||.016);last=t;update(dt);draw();
}
function makeBattle(type){
 const e=encounters[type];
 battle={type,enemy:e.name,hp:e.hp,maxHp:e.maxHp,pattern:e.pattern,boss:!!e.boss,phase:"menu",choice:0,turn:0,timer:0,shots:[],heart:{x:320,y:265,r:7}};
}
function startBattle(type){makeBattle(type);state="battle";notice=""}
requestAnimationFrame(loop);
