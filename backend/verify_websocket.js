import WebSocket from 'ws';

const WS_URL = 'wss://maritime-backend-tzzy.onrender.com/api/ws';

console.log(`Connecting to ${WS_URL}...`);

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✅ WebSocket Connected!');
  // Wait a bit for a message
  setTimeout(() => {
    console.log('⚠️ No messages received after 5s (Stream might be quiet)');
    ws.close();
    process.exit(0);
  }, 5000);
});

ws.on('message', (data) => {
  console.log('📩 Message Received:', data.toString().slice(0, 100) + '...');
  ws.close();
  process.exit(0);
});

ws.on('error', (err) => {
  console.error('❌ WebSocket Error:', err.message);
  process.exit(1);
});
