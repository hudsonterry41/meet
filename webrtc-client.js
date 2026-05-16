let localStream = null;
let peers = new Map();
let socket = null;
const ROOM_ID = "main_room";
const configuration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

// Main call entry
async function startWebRTC() {
  socket = io('http://localhost:3000');  // ⚠️ change in production

  socket.on('connect', () => {
    socket.emit('join-room', ROOM_ID);
  });

  socket.on('peer-joined', (peerId) => {
    createPeerConnection(peerId);
  });

  socket.on('existing-peers', (peerIds) => {
    peerIds.forEach(peerId => createPeerConnection(peerId));
  });

  socket.on('offer', async (data) => {
    const peerId = data.sender;
    if (!peers.has(peerId)) {
      createPeerConnection(peerId);
    }
    const pc = peers.get(peerId);
    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('answer', {
      answer: answer,
      target: peerId
    });
  });

  socket.on('answer', async (data) => {
    const peerId = data.sender;
    const pc = peers.get(peerId);
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
  });

  socket.on('ice-candidate', (data) => {
    const peerId = data.sender;
    const pc = peers.get(peerId);
    if (!pc) return;
    pc.addIceCandidate(new RTCIceCandidate(data.candidate));
  });

  socket.on('peer-left', (peerId) => {
    const tile = document.querySelector(`[data-user-id="${peerId}"]`);
    if (tile) tile.remove();
    const pc = peers.get(peerId);
    if (pc) pc.close();
    peers.delete(peerId);
  });

  // Start local stream (with virtual background)
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStream = await applyVirtualBackgroundToStream(stream);
    showLocalStream(localStream);
  } catch (err) {
    console.error('Camera/mic access denied:', err);
  }
}

function createPeerConnection(peerId) {
  const pc = new RTCPeerConnection(configuration);
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('ice-candidate', {
        candidate: event.candidate,
        target: peerId
      });
    }
  };

  if (localStream) {
    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });
  }

  pc.ontrack = (event) => {
    const remoteStream = event.streams[0];
    addVideoTile({ id: peerId, displayName: `User ${peerId.slice(0,6)}`, avatarUrl: "assets/default-avatar.png" }, remoteStream);
  };

  pc.onnegotiationneeded = async () => {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('offer', {
      offer: offer,
      target: peerId
    });
  };

  peers.set(peerId, pc);
}

function showLocalStream(stream) {
  const tile = addVideoTile(
    { id: "local", displayName: userState.displayName, avatarUrl: userState.avatarUrl, isLocal: true },
    stream
  );
  const video = tile.querySelector("video");
  video.srcObject = stream;
  video.muted = true;
}
