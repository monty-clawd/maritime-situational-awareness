import WebSocket from 'ws';

const API_KEY = '86cc53337908bd7d901bd9fb5e439f120e23cf64';
const URL = 'wss://stream.aisstream.io/v0/stream';
const BOUNDING_BOX = [[ [50.0, -5.0], [60.0, 10.0] ]]; // North Sea

console.log(`Connecting to ${URL} with key ${API_KEY.slice(0, 4)}...`);

const socket = new WebSocket(URL);

socket.on('open', () => {
    console.log('✅ WebSocket Connected');
    const subscription = {
        Apikey: API_KEY,
        BoundingBoxes: BOUNDING_BOX,
        FilterMessageTypes: ['PositionReport']
    };
    socket.send(JSON.stringify(subscription));
    console.log('📡 Subscription sent. Waiting for data...');
});

socket.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    console.log('📩 Message Received:', msg.MessageType);
    if (msg.MessageType === 'PositionReport') {
        console.log('✅ Data flow confirmed. Closing.');
        process.exit(0);
    }
});

socket.on('error', (err) => {
    console.error('❌ WebSocket Error:', err.message);
    process.exit(1);
});

socket.on('close', (code, reason) => {
    console.log(`❌ Closed: ${code} - ${reason.toString()}`);
    process.exit(1);
});

// Timeout
setTimeout(() => {
    console.log('⏰ Timeout waiting for data.');
    process.exit(1);
}, 15000);
