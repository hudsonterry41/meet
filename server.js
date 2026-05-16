const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const ROOM_ID = "main_room";

// Keep track of peers in the room
const roomClients = new Map();

io.on('connection', (socket) => {
  console.log('Peer connected:', socket.id);

  // Join the main room
  socket.join(ROOM_ID);

  // Keep track of this client’s info
  roomClients.set(socket.id, {
    id: socket.id
  });

  // Send existing peers to this client
  const existingIds = Array.from(roomClients.keys()).filter(id => id !== socket.id);
  socket.emit('existing-peers', existingIds);

  // Notify others that this peer joined
  socket.to(ROOM_ID).emit('peer-joined', socket.id);

  // When a peer sends an offer
  socket.on('offer', (data) => {
    socket.to(data.target).emit('offer', {
      offer: data.offer,
      sender: socket.id
    });
  });

  // When a peer sends an answer
  socket.on('answer', (data) => {
    socket.to(data.target).emit('answer', {
      answer: data.answer,
      sender: socket.id
    });
  });

  // When a peer sends an ICE candidate
  socket.on('ice-candidate', (data) => {
    socket.to(data.target).emit('ice-candidate', {
      candidate: data.candidate,
      sender: socket.id
    });
  });

  // When a peer leaves
  socket.on('disconnect', () => {
    roomClients.delete(socket.id);
    socket.to(ROOM_ID).emit('peer-left', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
