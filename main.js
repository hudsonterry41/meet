// Anonymous user state
const userState = {
  id: generateId(),
  displayName: "User",
  avatarUrl: "assets/default-avatar.png",
  background: {
    image: null,
    video: null
  },
  voiceMode: "normal"
};

// DOM elements
const videoGrid = document.getElementById("video-grid");
const chatMessages = document.getElementById("chat-messages");
const messageInput = document.getElementById("message-input");
const sendMessageBtn = document.getElementById("send-message");
const uploadImageBtn = document.getElementById("upload-image-btn");
const imageUpload = document.getElementById("image-upload");
const userDisplay = document.getElementById("user-display");

const toggleMicBtn = document.getElementById("toggle-mic");
const toggleCameraBtn = document.getElementById("toggle-camera");

const openProfileBtn = document.getElementById("open-profile");
const openBackgroundBtn = document.getElementById("open-background");
const openVoiceBtn = document.getElementById("open-voice");

// Modal elements
const profileModal = document.getElementById("profile-modal");
const backgroundModal = document.getElementById("background-modal");
const voiceModal = document.getElementById("voice-modal");

const profileNameInput = document.getElementById("profile-name");
const profileAvatarInput = document.getElementById("profile-avatar");
const saveProfileBtn = document.getElementById("save-profile");
const closeProfileBtn = document.getElementById("close-profile");

const bgImageUploadInput = document.getElementById("bg-image-upload");
const bgVideoUploadInput = document.getElementById("bg-video-upload");
const bgImagePreview = document.getElementById("bg-image-preview");
const bgVideoPreview = document.getElementById("bg-video-preview");
const saveBackgroundBtn = document.getElementById("save-background");
const closeBackgroundBtn = document.getElementById("close-background");

const saveVoiceBtn = document.getElementById("save-voice");
const closeVoiceBtn = document.getElementById("close-voice");

// Load from localStorage
function loadUserState() {
  if (localStorage.getItem("userState")) {
    try {
      const saved = JSON.parse(localStorage.getItem("userState"));
      userState.displayName = saved.displayName || "User";
      userState.avatarUrl = saved.avatarUrl || "assets/default-avatar.png";
      userState.background = saved.background || { image: null, video: null };
      userState.voiceMode = saved.voiceMode || "normal";
    } catch {}
  }
}

// Save userState to localStorage
function saveUserState() {
  localStorage.setItem("userState", JSON.stringify(userState));
}

// Initialize
function init() {
  loadUserState();
  updateDisplayNameUI();
  initChat();
  startWebRTC();
}

function initChat() {
  // Message sending
  messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && messageInput.value.trim()) {
      sendMessage();
    }
  });
  sendMessageBtn.addEventListener("click", sendMessage);

  // Image upload
  uploadImageBtn.addEventListener("click", () => imageUpload.click());
  imageUpload.addEventListener("change", handleImageUpload);

  // Controls
  toggleMicBtn.addEventListener("click", toggleMic);
  toggleCameraBtn.addEventListener("click", toggleCamera);

  // Modals
  openProfileBtn.addEventListener("click", () => profileModal.classList.remove("hidden"));
  openBackgroundBtn.addEventListener("click", () => backgroundModal.classList.remove("hidden"));
  openVoiceBtn.addEventListener("click", () => voiceModal.classList.remove("hidden"));

  closeProfileBtn.addEventListener("click", () => profileModal.classList.add("hidden"));
  closeBackgroundBtn.addEventListener("click", () => backgroundModal.classList.add("hidden"));
  closeVoiceBtn.addEventListener("click", () => voiceModal.classList.add("hidden"));

  saveProfileBtn.addEventListener("click", saveProfile);
  saveBackgroundBtn.addEventListener("click", saveBackground);
  saveVoiceBtn.addEventListener("click", saveVoice);
}

// Add video tile
function addVideoTile(user, stream = null) {
  const tile = document.createElement("div");
  tile.dataset.userId = user.id;

  const video = document.createElement("video");
  video.muted = user.isLocal || false;
  video.autoplay = true;
  video.playsInline = true;

  const label = document.createElement("div");
  label.classList.add("video-label");
  label.innerHTML = `
    <img src="${user.avatarUrl}" alt="" width="16" height="16" style="border-radius: 50%; margin-right: 4px;" />
    ${user.displayName}
  `;

  tile.append(video, label);
  videoGrid.appendChild(tile);

  if (stream) {
    video.srcObject = stream;
  }

  return tile;
}

// Send chat message
function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  const msg = {
    id: generateId(),
    senderId: userState.id,
    displayName: userState.displayName,
    avatarUrl: userState.avatarUrl,
    text,
    imageUrl: null,
    timestamp: Date.now()
  };

  appendMessage(msg);
  messageInput.value = "";
}

// Handle image upload (preview and send)
function handleImageUpload() {
  const file = imageUpload.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const msg = {
      id: generateId(),
      senderId: userState.id,
      displayName: userState.displayName,
      avatarUrl: userState.avatarUrl,
      text: null,
      imageUrl: e.target.result,
      timestamp: Date.now()
    };
    appendMessage(msg);
  };
  reader.readAsDataURL(file);
}

// Append message to chat
function appendMessage(msg) {
  const el = document.createElement("div");
  el.classList.add("message");

  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' });

  const avatar = msg.avatarUrl
    ? `<img src="${msg.avatarUrl}" alt="" width="24" height="24" style="border-radius:50%;margin-right:8px;vertical-align:middle;" />`
    : "";

  if (msg.imageUrl) {
    el.innerHTML = `<small>${avatar}${msg.displayName} – ${time}</small><br />
                     <img src="${msg.imageUrl}" alt="shared image" />`;
  } else {
    el.innerHTML = `<small>${avatar}${msg.displayName} – ${time}</small><br />
                     ${msg.text}`;
  }

  chatMessages.appendChild(el);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Modal: Profile
function saveProfile() {
  const name = profileNameInput.value.trim();
  const avatar = profileAvatarInput.value.trim();

  userState.displayName = name || "User";
  userState.avatarUrl = avatar || "assets/default-avatar.png";

  saveUserState();
  updateDisplayNameUI();
  refreshVideoTiles();
  profileModal.classList.add("hidden");
}

// Modal: Background
function saveBackground() {
  if (bgImageUploadInput.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      userState.background.image = e.target.result;
      saveUserState();
      applyVirtualBackground(userState.background.image, null);
    };
    reader.readAsDataURL(bgImageUploadInput.files[0]);
  }

  if (bgVideoUploadInput.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      userState.background.video = e.target.result;
      saveUserState();
      applyVirtualBackground(null, userState.background.video);
    };
    reader.readAsDataURL(bgVideoUploadInput.files[0]);
  } else {
    userState.background.video = null;
  }

  backgroundModal.classList.add("hidden");
}

// Modal: Voice mode
function saveVoice() {
  const selected = document.querySelector('input[name="voice-mode"]:checked');
  if (selected) {
    userState.voiceMode = selected.value;
    saveUserState();
    setVoiceModeUI(userState.voiceMode);
  }
  voiceModal.classList.add("hidden");
}

// UI helpers
function updateDisplayNameUI() {
  userDisplay.textContent = userState.displayName;
}

function refreshVideoTiles() {
  const tiles = videoGrid.querySelectorAll("[data-user-id]");
  tiles.forEach(tile => {
    const id = tile.dataset.userId;
    if (id === userState.id) {
      const label = tile.querySelector(".video-label");
      if (label) {
        label.innerHTML = `
          <img src="${userState.avatarUrl}" alt="" width="16" height="16" style="border-radius: 50%; margin-right: 4px;" />
          ${userState.displayName}
        `;
      }
    }
  });
}

function toggleMic() {
  const active = !toggleMicBtn.classList.contains("active");
  toggleMicBtn.classList.toggle("active", active);
}

function toggleCamera() {
  const active = !toggleCameraBtn.classList.contains("active");
  toggleCameraBtn.classList.toggle("active", active);
}

function setVoiceModeUI(mode) {
  toggleMicBtn.textContent = mode === "robot" ? "🤖" : "🎤";
}

// Misc helpers
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

// Start app on load
document.addEventListener("DOMContentLoaded", init);
