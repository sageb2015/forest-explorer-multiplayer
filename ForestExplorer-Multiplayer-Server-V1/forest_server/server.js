const http = require('http');
const crypto = require('crypto');
const WebSocket = require('ws');

const PORT = Number(process.env.PORT || 10000);
const MAX_PLAYERS = 8;
const rooms = new Map();
const clients = new Map();

function roomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({length: 5}, () => chars[crypto.randomInt(chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}
function send(ws, msg) { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg)); }
function broadcast(room, msg, exceptId = null) {
  for (const p of room.players.values()) if (p.id !== exceptId) send(p.ws, msg);
}
function snapshot(room) {
  return [...room.players.values()].map(p => ({ id:p.id, name:p.name, x:p.x, y:p.y, z:p.z, yaw:p.yaw, pitch:p.pitch }));
}
function removeClient(ws) {
  const c = clients.get(ws); if (!c) return;
  clients.delete(ws);
  const room = rooms.get(c.room);
  if (!room) return;
  room.players.delete(c.id);
  broadcast(room, {type:'player_left', id:c.id});
  if (room.players.size === 0) rooms.delete(room.code);
}

const server = http.createServer((req,res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, {'content-type':'application/json','cache-control':'no-store'});
    res.end(JSON.stringify({ok:true, service:'forest-explorer-multiplayer', rooms:rooms.size}));
    return;
  }
  res.writeHead(404); res.end('Not found');
});
const wss = new WebSocket.Server({server, path:'/ws'});

wss.on('connection', ws => {
  let client = null;
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw.toString()); } catch { send(ws,{type:'error',message:'Invalid message.'}); return; }
    if (!client && m.type === 'create') {
      const code = roomCode();
      const id = crypto.randomInt(100000, 999999);
      const room = {code, players:new Map()};
      const p = {id, ws, name:String(m.name||'Player').slice(0,24), x:0,y:0,z:0,yaw:0,pitch:0};
      room.players.set(id,p); rooms.set(code,room); client={room:code,id}; clients.set(ws,client);
      send(ws,{type:'created',code,id,maxPlayers:MAX_PLAYERS,players:snapshot(room)}); return;
    }
    if (!client && m.type === 'join') {
      const code = String(m.code||'').trim().toUpperCase(); const room=rooms.get(code);
      if (!room) { send(ws,{type:'error',message:'Game room not found.'}); return; }
      if (room.players.size >= MAX_PLAYERS) { send(ws,{type:'error',message:'That game is full.'}); return; }
      const id = crypto.randomInt(100000,999999); const p={id,ws,name:String(m.name||'Player').slice(0,24),x:0,y:0,z:0,yaw:0,pitch:0};
      room.players.set(id,p); client={room:code,id}; clients.set(ws,client);
      send(ws,{type:'joined',code,id,maxPlayers:MAX_PLAYERS,players:snapshot(room)});
      broadcast(room,{type:'player_joined',player:{id:p.id,name:p.name,x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch}},p.id); return;
    }
    if (!client) { send(ws,{type:'error',message:'Create or join a game first.'}); return; }
    const room=rooms.get(client.room), p=room?.players.get(client.id); if (!room||!p) return;
    if (m.type === 'state') {
      for (const k of ['x','y','z','yaw','pitch']) if (Number.isFinite(Number(m[k]))) p[k]=Number(m[k]);
      broadcast(room,{type:'state',player:{id:p.id,x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch}},p.id);
    } else if (m.type === 'event') {
      broadcast(room,{type:'event',from:p.id,event:m.event,data:m.data ?? null},p.id);
    } else if (m.type === 'ping') send(ws,{type:'pong'});
  });
  ws.on('close',()=>removeClient(ws));
  ws.on('error',()=>removeClient(ws));
});

setInterval(()=>{
  for (const ws of wss.clients) if (ws.readyState===WebSocket.OPEN) ws.ping();
}, 25000);

server.listen(PORT,'0.0.0.0',()=>console.log(`Forest Explorer multiplayer server listening on ${PORT}`));
