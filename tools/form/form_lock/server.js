const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);


// Beacon endpoint for reliable logout on page close
app.post('/logout-beacon', express.raw({type: '*/*'}), (req, res) => {
    // We don't need to do anything with the data — just acknowledge
    // This helps the browser know it was sent successfully
    res.status(200).send('OK');
    console.log('Logout beacon received (user likely closed tab)');
});


// Serve static files
app.use(express.static(path.join(__dirname)));

// In-memory lock storage (in real app: use database or Redis)
const locks = new Map(); // formId -> { user, timestamp, socketId }
const HEARTBEAT_INTERVAL = 10000;  // client sends every 10s
const LOCK_TIMEOUT = 300000;        // lock expires after 5 minutes of no heartbeat


// Clean up stale locks
setInterval(() => {
    const now = Date.now();
    for (const [formId, lock] of locks.entries()) {
        if (now - lock.timestamp > LOCK_TIMEOUT) {
            console.log(`Lock expired: ${formId} (was held by ${lock.user})`);
            locks.delete(formId);
            io.emit('lockUpdate', { formId, user: null });
        }
    }
}, 5000);

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Send current lock state to new client
    socket.emit('initialLocks', Object.fromEntries(
        Array.from(locks.entries()).map(([formId, lock]) => [formId, { user: lock.user, timestamp: lock.timestamp }])
    ));

    // Acquire or refresh lock
    socket.on('acquireLock', ({ formId, user }) => {
        const existing = locks.get(formId);

        if (!existing || existing.user === user) {
            locks.set(formId, { user, timestamp: Date.now(), socketId: socket.id });
            console.log(`${user} acquired lock on ${formId}`);
            io.emit('lockUpdate', { formId, user, timestamp: Date.now() });
        } else {
            // Lock held by someone else
            socket.emit('lockDenied', { formId, user: existing.user });
        }
    });

	// Heartbeat to keep lock alive
	socket.on('heartbeat', ({ formId, user }) => {
		const lock = locks.get(formId);
		if (lock && lock.user === user && lock.socketId === socket.id) {
			lock.timestamp = Date.now();
			// Broadcast updated timestamp for live "seconds ago" display
			io.emit('heartbeatUpdate', { formId, timestamp: lock.timestamp });
		}
	});

    // Release lock
    socket.on('releaseLock', ({ formId, user }) => {
        const lock = locks.get(formId);
        if (lock && lock.user === user && lock.socketId === socket.id) {
            locks.delete(formId);
            console.log(`${user} released lock on ${formId}`);
            io.emit('lockUpdate', { formId, user: null });
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        // Optional: clean up any locks held by this socket (timeout will handle it anyway)
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Open multiple tabs to simulate different users`);
});