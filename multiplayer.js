const SESSION_API='https://qshfwqibsdaeslwrgiby.supabase.co/functions/v1/game-session';
let roomCode=localStorage.getItem('vitaumRoomCode')||'';
let hostToken=localStorage.getItem('vitaumHostToken')||'';
let roomTimer=null,pushTimer=null,suppressRemote=false;

function roomState(){return{visited:[...visited],pockets:[...completedPockets],pocketResults:{...pocketResults},bossResults:{...bossResults}}}
async function roomApi(payload){
  const r=await fetch(SESSION_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const data=await r.json().catch(()=>({error:'Resposta inválida do servidor.'}));
  if(!r.ok)throw new Error(data.error||'Falha na sessão compartilhada.');
  return data;
}
function replaceObject(target,source){Object.keys(target).forEach(k=>delete target[k]);Object.assign(target,source||{})}
function applyRoomState(state){
  suppressRemote=true;
  visited.clear();(state.visited||[]).forEach(v=>visited.add(Number(v)));
  completedPockets.clear();(state.pockets||[]).forEach(v=>completedPockets.add(Number(v)));
  replaceObject(pocketResults,state.pocketResults);
  replaceObject(bossResults,state.bossResults);
  const oldPersist=basePersist;oldPersist();
  if(current!==null){const p=data.find(x=>x.num===current);if(p)render(p)}else updateStatus();
  suppressRemote=false;
}
function updateRoomButton(){
  if(!sessionBtn)return;
  sessionBtn.textContent=roomCode?`Mesa ${roomCode}`:'Mesa compartilhada';
  sessionBtn.classList.toggle('room-live',!!roomCode);
  sessionBtn.title=roomCode?'Conectado à mesa compartilhada':'Criar ou entrar em uma mesa compartilhada';
}
async function pullRoom(){
  if(!roomCode||pushTimer)return;
  try{const res=await roomApi({action:'get',code:roomCode});applyRoomState(res.state)}catch(e){console.warn(e)}
}
function startRoomPolling(){clearInterval(roomTimer);if(roomCode){roomTimer=setInterval(pullRoom,2000);pullRoom()}updateRoomButton()}
async function pushRoom(){
  if(!roomCode||suppressRemote)return;
  try{const res=await roomApi({action:'merge',code:roomCode,state:roomState()});applyRoomState(res.state)}catch(e){console.warn(e)}
}
function queueRoomPush(){
  if(!roomCode||suppressRemote)return;
  clearTimeout(pushTimer);pushTimer=setTimeout(async()=>{pushTimer=null;await pushRoom()},250);
}

const basePersist=persist;
persist=function(){basePersist();queueRoomPush()};

const topActions=document.querySelector('.top-actions');
const sessionBtn=document.createElement('button');sessionBtn.id='sessionBtn';sessionBtn.className='modebtn';
topActions.insertBefore(sessionBtn,document.getElementById('resetBtn'));

const overlay=document.createElement('div');overlay.className='room-overlay';overlay.hidden=true;
overlay.innerHTML=`<div class="room-modal" role="dialog" aria-modal="true" aria-labelledby="roomTitle"><button class="room-close" aria-label="Fechar">×</button><div class="room-kicker">Mesa compartilhada</div><h2 id="roomTitle">Jogar em vários aparelhos</h2><p class="room-help">O mestre cria uma mesa e envia o código. Todos os celulares e tablets que entrarem com esse código compartilham páginas visitadas, resultados dos bolsos e o confronto final.</p><div class="room-current" hidden><span>Conectado à mesa</span><strong class="room-code"></strong><button class="room-copy">Copiar código</button></div><div class="room-actions"><button class="room-create primary">Criar nova mesa</button><div class="room-join-line"><input class="room-input" maxlength="7" autocomplete="off" placeholder="CÓDIGO DA MESA" aria-label="Código da mesa"><button class="room-join">Entrar</button></div><button class="room-leave" hidden>Sair desta mesa</button></div><p class="room-message" aria-live="polite"></p></div>`;
document.body.appendChild(overlay);
const modal=overlay.querySelector('.room-modal'),currentBox=overlay.querySelector('.room-current'),codeEl=overlay.querySelector('.room-code'),msgEl=overlay.querySelector('.room-message'),leaveBtn=overlay.querySelector('.room-leave');
function setRoomMessage(text,err=false){msgEl.textContent=text||'';msgEl.classList.toggle('error',err)}
function refreshRoomModal(){
  currentBox.hidden=!roomCode;leaveBtn.hidden=!roomCode;codeEl.textContent=roomCode;
  overlay.querySelector('.room-create').textContent=roomCode?'Criar outra mesa':'Criar nova mesa';
  updateRoomButton();
}
function openRoomModal(){refreshRoomModal();setRoomMessage('');overlay.hidden=false;overlay.querySelector('.room-input').value=''}
function closeRoomModal(){overlay.hidden=true}
sessionBtn.onclick=openRoomModal;overlay.querySelector('.room-close').onclick=closeRoomModal;overlay.addEventListener('click',e=>{if(e.target===overlay)closeRoomModal()});

overlay.querySelector('.room-create').onclick=async()=>{
  setRoomMessage('Criando mesa...');
  try{
    const res=await roomApi({action:'create'});roomCode=res.code;hostToken=res.hostToken;
    localStorage.setItem('vitaumRoomCode',roomCode);localStorage.setItem('vitaumHostToken',hostToken);
    applyRoomState(res.state);startRoomPolling();refreshRoomModal();setRoomMessage('Mesa criada. Envie este código às outras pessoas.');
  }catch(e){setRoomMessage(e.message,true)}
};
overlay.querySelector('.room-join').onclick=async()=>{
  const code=overlay.querySelector('.room-input').value.trim().toUpperCase();if(!code){setRoomMessage('Digite o código da mesa.',true);return}
  setRoomMessage('Entrando na mesa...');
  try{
    const res=await roomApi({action:'get',code});roomCode=code;hostToken='';
    localStorage.setItem('vitaumRoomCode',roomCode);localStorage.removeItem('vitaumHostToken');
    applyRoomState(res.state);startRoomPolling();refreshRoomModal();setRoomMessage('Conectado. O progresso agora é compartilhado.');
  }catch(e){setRoomMessage(e.message,true)}
};
overlay.querySelector('.room-copy').onclick=async()=>{try{await navigator.clipboard.writeText(roomCode);setRoomMessage('Código copiado.')}catch{setRoomMessage(`Código: ${roomCode}`)}};
leaveBtn.onclick=()=>{
  if(!confirm('Sair desta mesa? O progresso compartilhado continuará existindo para os outros aparelhos.'))return;
  roomCode='';hostToken='';localStorage.removeItem('vitaumRoomCode');localStorage.removeItem('vitaumHostToken');clearInterval(roomTimer);refreshRoomModal();setRoomMessage('Você saiu da mesa.');
};

const resetButton=document.getElementById('resetBtn');
const localReset=resetReading;
resetButton.onclick=async()=>{
  if(!roomCode){localReset();return}
  if(!hostToken){alert('Você está em uma mesa compartilhada. Somente o aparelho que criou a mesa pode reiniciar a partida para todos.');return}
  if(!confirm(`Reiniciar a mesa ${roomCode} para todos os aparelhos?`))return;
  try{
    clearTimeout(pushTimer);pushTimer=null;
    const res=await roomApi({action:'reset',code:roomCode,hostToken});applyRoomState(res.state);showCover();
    alert('Mesa reiniciada para todos.');
  }catch(e){alert(e.message)}
};

refreshRoomModal();startRoomPolling();