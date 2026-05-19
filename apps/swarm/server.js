import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import { handleMessage } from './agent.js';
import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

/**
 * [THE ULTIMATE LOG SILENCER] 
 * Monkey-patch the lowest level Node.js streams to permanently erase noisy warnings.
 * This catches everything, even if it bypasses console.error.
 */
const silentPatterns = ["openrouter/free", "integration model metadata", "conservative 128k default"];

const originalStdoutWrite = process.stdout.write;
const originalStderrWrite = process.stderr.write;

process.stdout.write = function(chunk, ...args) {
    const str = chunk.toString();
    if (silentPatterns.some(p => str.includes(p))) return true;
    return originalStdoutWrite.apply(process.stdout, [chunk, ...args]);
};

process.stderr.write = function(chunk, ...args) {
    const str = chunk.toString();
    if (silentPatterns.some(p => str.includes(p))) return true;
    return originalStderrWrite.apply(process.stderr, [chunk, ...args]);
};

// Also patch console for good measure
console.error = (...args) => {
    const msg = args.join(" ");
    if (silentPatterns.some(p => msg.includes(p))) return;
    originalStderrWrite.apply(process.stderr, [msg + "\n"]);
};
console.warn = (...args) => {
    const msg = args.join(" ");
    if (silentPatterns.some(p => msg.includes(p))) return;
    originalStderrWrite.apply(process.stderr, [msg + "\n"]);
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log('--- DEBUG INFO ---');
console.log('__filename:', __filename);
console.log('__dirname:', __dirname);
console.log('cwd:', process.cwd());
const distPathDebug = path.join(__dirname, 'ui/dist');
console.log('calculated distPath:', distPathDebug);
console.log('distPath exists:', fs.existsSync(distPathDebug));
console.log('--- END DEBUG ---');

// 1. Config
dotenv.config();

// 2. Logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'clawdbot.log' })
    ]
});

// 3. Express App
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// 4. HTTP Endpoints
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'openclaw', version: '1.0.0' });
});

// Serve UI (Forced)
const distPath = '/app/ui/dist';
console.log('Forcing UI serve from:', distPath);
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/health')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
});

// 5. Socket.io
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    logger.info(`🔌 Client Connected: ${socket.id}`);

    // [SILENCED] Removed fake Hermes greeting to clear hierarchy

    socket.on('message', async (data) => {
        logger.info(`📩 Received: ${data}`);
        try {
            await handleMessage(socket, data);
        } catch (error) {
            logger.error(`❌ Agent Error: ${error.message}`);
            socket.emit('response', { text: `⚠️ Error: ${error.message}` });
        }
    });

    socket.on('disconnect', () => {
        logger.info(`🔌 Client Disconnected: ${socket.id}`);
    });
});

// 5.5 Native WebSocket for Swarm Hub (Dashboard Compatibility)
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws) => {
    logger.info('🔌 Native WebSocket Connected');
    
    // Create a mock socket object for handleMessage compatibility
    const mockSocket = {
        emit: (event, data) => {
            if (ws.readyState === 1) { // OPEN
                ws.send(JSON.stringify({ event, ...data }));
            }
        }
    };

    // [SILENCED] Removed fake Hermes greeting to clear hierarchy

    ws.on('message', async (message) => {
        const data = message.toString();
        logger.info(`📩 WS Received: ${data}`);
        try {
            // Handle both string and JSON data
            let parsedData = data;
            try { parsedData = JSON.parse(data); } catch (e) {}
            
            await handleMessage(mockSocket, parsedData);
        } catch (error) {
            logger.error(`❌ WS Agent Error: ${error.message}`);
            mockSocket.emit('response', { text: `⚠️ Error: ${error.message}` });
        }
    });

    ws.on('close', () => {
        logger.info('🔌 Native WebSocket Disconnected');
    });
});

server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url, `http://${request.headers.host}`);
    if (pathname === '/api/swarm/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    }
});

// 6. Start
server.listen(PORT, () => {
    console.log(`🤖 OpenClaw Server running on port ${PORT}`);
    logger.info(`Server started on port ${PORT}`);
});
