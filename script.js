const screen=document.getElementById('screen');
const start=document.getElementById('start');
const keys={};
addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.key===' ')e.preventDefault()});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);

start.onclick=()=>{
  const canvas=document.createElement('canvas'); canvas.width=480; canvas.height=270;
  screen.innerHTML=''; screen.appendChild(canvas);
  const ctx=canvas.getContext('2d');
  const player={x:240,y:210,r:7,s:2};
  let message='Explore o vale. Encontre sua alma.';
  let npc={x:240,y:90};

  function loop(){
    update(); draw(); requestAnimationFrame(loop);
  }
  function update(){
    let dx=0,dy=0;
    if(keys['arrowleft']||keys['a'])dx--; if(keys['arrowright']||keys['d'])dx++;
    if(keys['arrowup']||keys['w'])dy--; if(keys['arrowdown']||keys['s'])dy++;
    if(dx&&dy){dx*=.707;dy*=.707}
    player.x=Math.max(15,Math.min(465,player.x+dx*player.s));
    player.y=Math.max(45,Math.min(255,player.y+dy*player.s));
    const dist=Math.hypot(player.x-npc.x,player.y-npc.y);
    if(dist<28 && (keys['e']||keys[' '])) message='Estranho: “Toda alma guarda uma escolha.”';
    else if(dist>=28) message='Explore o vale. Encontre sua alma.';
  }
  function draw(){
    ctx.fillStyle='#101326';ctx.fillRect(0,0,480,270);
    ctx.fillStyle='#18203a';ctx.fillRect(0,150,480,120);
    ctx.strokeStyle='#293457';ctx.lineWidth=3;
    for(let x=0;x<480;x+=30){ctx.beginPath();ctx.moveTo(x,150);ctx.lineTo(x+20,270);ctx.stroke()}
    ctx.fillStyle='#101010';ctx.fillRect(8,8,464,30);
    ctx.fillStyle='#fff';ctx.font='12px monospace';ctx.fillText('SOULBOUND  •  HP 20/20',18,28);
    ctx.fillStyle='#633';ctx.fillRect(npc.x-8,npc.y-12,16,24);
    ctx.fillStyle='#f5c6a5';ctx.beginPath();ctx.arc(npc.x,npc.y-17,6,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(player.x,player.y,player.r,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#e44';ctx.beginPath();ctx.arc(player.x,player.y,3,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#000';ctx.fillRect(12,220,456,38);
    ctx.strokeStyle='#fff';ctx.strokeRect(12,220,456,38);
    ctx.fillStyle='#fff';ctx.font='11px monospace';ctx.fillText(message,22,243);
  }
  loop();
};
