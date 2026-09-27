// ===============================================
// client.js
// โค้ดฝั่ง Client: เชื่อมต่อ server ผ่าน Socket.io (WebSocket)
// รองรับ: ข้อความตัวหนังสือ, GIF, emoji, อัดเสียงส่ง (UI Minimal Clean)
// ===============================================

const socket = io();
let myUsername = "";

// ---------- อ้างอิง element ----------
const joinScreen = document.getElementById("join-screen");
const chatScreen = document.getElementById("chat-screen");
const usernameInput = document.getElementById("username-input");
const joinBtn = document.getElementById("join-btn");
const joinError = document.getElementById("join-error");
const myBadge = document.getElementById("my-badge");

const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const onlineCountEl = document.getElementById("online-count");
const typingIndicator = document.getElementById("typing-indicator");

// เอาแนบไฟล์ออก คงเหลือ รูปภาพ, GIF, Emoji, Voice
const imageBtn = document.getElementById("image-btn");
const imageInput = document.getElementById("image-input");
const gifBtn = document.getElementById("gif-btn");
const gifInput = document.getElementById("gif-input");
const emojiBtn = document.getElementById("emoji-btn");
const emojiPanel = document.getElementById("emoji-panel");

const micBtn = document.getElementById("mic-btn");
const recordingBar = document.getElementById("recording-bar");
const recordTimerEl = document.getElementById("record-timer");
const cancelRecordBtn = document.getElementById("cancel-record-btn");
const stopRecordBtn = document.getElementById("stop-record-btn");

// Lightbox modal elements
const imageModal = document.getElementById("image-modal");
const modalImg = document.getElementById("modal-img");
const closeModalBtn = document.getElementById("close-modal-btn");

if (closeModalBtn) {
  closeModalBtn.addEventListener("click", () => imageModal.classList.add("hidden"));
  imageModal.addEventListener("click", (e) => {
    if (e.target === imageModal || e.target === closeModalBtn) {
      imageModal.classList.add("hidden");
    }
  });
}

// ===============================================
// เข้าห้องแชท
// ===============================================
function handleJoin() {
  const username = usernameInput.value.trim();
  if (!username) {
    joinError.classList.remove("hidden");
    return;
  }
  myUsername = username;
  if (myBadge) {
    myBadge.textContent = `@${myUsername}`;
  }
  socket.emit("join", myUsername);
  joinScreen.classList.add("hidden");
  chatScreen.classList.remove("hidden");
  messageInput.focus();
}

joinBtn.addEventListener("click", handleJoin);
usernameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleJoin();
});

// ===============================================
// ส่งข้อความตัวหนังสือ
// ===============================================
function sendTextMessage() {
  const text = messageInput.value.trim();
  if (!text) return;
  socket.emit("chat-message", { username: myUsername, message: text, type: "text" });
  messageInput.value = "";
}

sendBtn.addEventListener("click", sendTextMessage);
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    sendTextMessage();
  } else {
    socket.emit("typing", myUsername);
  }
});

// ===============================================
// อัปโหลดไฟล์ส่งเป็นข้อความ (GIF / เสียงที่อัด)
// ===============================================
async function uploadAndSend(file) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch("/upload", { method: "POST", body: formData });
    const data = await res.json();

    if (!res.ok) {
      renderSystemMessage(`อัปโหลดไม่สำเร็จ: ${data.error || "ไม่ทราบสาเหตุ"}`);
      return;
    }

    socket.emit("chat-message", {
      username: myUsername,
      message: "",
      type: data.type, // image | audio
      fileUrl: data.url,
      fileName: data.fileName,
    });
  } catch (err) {
    renderSystemMessage("ไม่สามารถส่งไฟล์ได้ กรุณาลองใหม่อีกครั้ง");
    console.error(err);
  }
}

// ---------- ปุ่มแนบรูปภาพ ----------
if (imageBtn && imageInput) {
  imageBtn.addEventListener("click", () => imageInput.click());
  imageInput.addEventListener("change", () => {
    if (imageInput.files[0]) {
      uploadAndSend(imageInput.files[0]);
    }
    imageInput.value = "";
  });
}

// ---------- ปุ่มแนบ GIF ----------
if (gifBtn && gifInput) {
  gifBtn.addEventListener("click", () => gifInput.click());
  gifInput.addEventListener("change", () => {
    if (gifInput.files[0]) uploadAndSend(gifInput.files[0]);
    gifInput.value = "";
  });
}

// รองรับการวางรูปภาพจาก Clipboard (Ctrl+V / Cmd+V)
document.addEventListener("paste", (e) => {
  if (joinScreen && !joinScreen.classList.contains("hidden")) return;
  const items = e.clipboardData?.items;
  if (!items) return;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf("image") !== -1) {
      const blob = items[i].getAsFile();
      if (blob) {
        uploadAndSend(blob);
        e.preventDefault();
        break;
      }
    }
  }
});

// ===============================================
// Emoji Picker (มินิมอล)
// ===============================================
const EMOJI_LIST = [
  "😊","😍","😂","🤣","🥰","😎","🥳","🥺",
  "👍","👏","🙌","🙏","✨","🔥","💖","❤️",
  "🎉","☕","🍕","🍰","💡","⭐","💬","🚀",
  "👀","🤝","💯","👌","😴","🤔","😇","☀️"
];

EMOJI_LIST.forEach((emo) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = emo;
  btn.className = "hover:bg-slate-100 rounded-xl p-1.5 transition text-lg flex items-center justify-center";
  btn.addEventListener("click", () => {
    messageInput.value += emo;
    messageInput.focus();
  });
  emojiPanel.appendChild(btn);
});

emojiBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  emojiPanel.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
  if (!emojiPanel.contains(e.target) && e.target !== emojiBtn) {
    emojiPanel.classList.add("hidden");
  }
});

// ===============================================
// อัดเสียงและส่งเป็นข้อความเสียง (MediaRecorder API)
// ===============================================
let mediaRecorder = null;
let audioChunks = [];
let recordSeconds = 0;
let recordTimerInterval = null;
let recordedStream = null;

async function startRecording() {
  try {
    recordedStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    renderSystemMessage("ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาอนุญาตการใช้งานไมค์ในเบราว์เซอร์");
    return;
  }

  mediaRecorder = new MediaRecorder(recordedStream);
  audioChunks = [];
  recordSeconds = 0;

  mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);

  mediaRecorder.onstop = () => {
    recordedStream.getTracks().forEach((t) => t.stop());
    clearInterval(recordTimerInterval);
    recordingBar.classList.add("hidden");
    recordingBar.classList.remove("flex");
  };

  mediaRecorder.start();
  recordingBar.classList.remove("hidden");
  recordingBar.classList.add("flex");
  recordTimerEl.textContent = "0:00";

  recordTimerInterval = setInterval(() => {
    recordSeconds++;
    const m = Math.floor(recordSeconds / 60);
    const s = String(recordSeconds % 60).padStart(2, "0");
    recordTimerEl.textContent = `${m}:${s}`;
  }, 1000);
}

function stopRecordingAndSend() {
  if (!mediaRecorder) return;
  mediaRecorder.onstop = () => {
    recordedStream.getTracks().forEach((t) => t.stop());
    clearInterval(recordTimerInterval);
    recordingBar.classList.add("hidden");
    recordingBar.classList.remove("flex");

    const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
    const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
    uploadAndSend(audioFile);
  };
  mediaRecorder.stop();
}

function cancelRecording() {
  if (!mediaRecorder) return;
  mediaRecorder.onstop = () => {
    recordedStream.getTracks().forEach((t) => t.stop());
  };
  mediaRecorder.stop();
  clearInterval(recordTimerInterval);
  recordingBar.classList.add("hidden");
  recordingBar.classList.remove("flex");
  audioChunks = [];
}

micBtn.addEventListener("click", startRecording);
stopRecordBtn.addEventListener("click", stopRecordingAndSend);
cancelRecordBtn.addEventListener("click", cancelRecording);

// Helper for formatting time (HH:MM)
function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ===============================================
// แสดงข้อความในหน้าแชท (Minimal Styling)
// ===============================================
function renderMessage({ username, message, type, fileUrl, fileName, timestamp }) {
  const isMe = username === myUsername;
  const timeStr = formatTime(timestamp ? new Date(timestamp) : new Date());

  const wrapper = document.createElement("div");
  wrapper.className = `flex flex-col group ${isMe ? "items-end" : "items-start"} max-w-full animate-fadeIn`;

  // Sender Name & Time header
  const metaEl = document.createElement("div");
  metaEl.className = `flex items-center gap-1.5 mb-1 px-1 text-[11px] ${isMe ? "flex-row-reverse text-slate-400" : "text-slate-500"}`;
  
  const nameEl = document.createElement("span");
  nameEl.className = `font-medium ${isMe ? "text-slate-500" : "text-slate-700"}`;
  nameEl.textContent = isMe ? "คุณ" : username;

  const timeEl = document.createElement("span");
  timeEl.className = "text-[10px] text-slate-400";
  timeEl.textContent = timeStr;

  metaEl.appendChild(nameEl);
  metaEl.appendChild(timeEl);
  wrapper.appendChild(metaEl);

  let contentEl;

  if (type === "image") {
    // Image / GIF
    const box = document.createElement("div");
    box.className = "overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm max-w-[75%] sm:max-w-xs cursor-pointer hover:opacity-95 transition active:scale-[0.98]";
    const img = document.createElement("img");
    img.src = fileUrl;
    img.alt = fileName || "image";
    img.loading = "lazy";
    img.className = "w-full h-auto object-cover rounded-2xl";
    box.appendChild(img);
    
    // คลิกเพื่อดูรูปขนาดเต็ม
    box.addEventListener("click", () => {
      if (imageModal && modalImg) {
        modalImg.src = fileUrl;
        imageModal.classList.remove("hidden");
      }
    });

    contentEl = box;
  } else if (type === "video") {
    const video = document.createElement("video");
    video.src = fileUrl;
    video.controls = true;
    video.className = "max-w-[85%] sm:max-w-sm rounded-2xl border border-slate-200 shadow-sm";
    contentEl = video;
  } else if (type === "audio") {
    // Clean audio player
    const audioBox = document.createElement("div");
    audioBox.className = `p-2.5 rounded-2xl shadow-sm border flex flex-col gap-1 ${
      isMe ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
    }`;
    const audio = document.createElement("audio");
    audio.src = fileUrl;
    audio.controls = true;
    audio.className = "h-8 max-w-[220px] sm:max-w-[260px]";
    audioBox.appendChild(audio);
    contentEl = audioBox;
  } else if (type === "file") {
    contentEl = document.createElement("a");
    contentEl.href = fileUrl;
    contentEl.download = fileName || "";
    contentEl.target = "_blank";
    contentEl.className = `px-3.5 py-2.5 rounded-2xl text-xs flex items-center gap-2 border shadow-sm ${
      isMe
        ? "bg-slate-900 text-white border-slate-800 hover:bg-slate-800"
        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
    } transition`;
    contentEl.innerHTML = `<span>📎</span><span class="font-medium underline truncate max-w-[180px]">${fileName || "ดาวน์โหลดไฟล์"}</span>`;
  } else {
    // Text message bubble
    contentEl = document.createElement("div");
    contentEl.className = `px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words max-w-[85%] sm:max-w-md shadow-sm ${
      isMe
        ? "bg-slate-900 text-white rounded-tr-sm"
        : "bg-white text-slate-800 border border-slate-200/80 rounded-tl-sm"
    }`;
    contentEl.textContent = message;
  }

  wrapper.appendChild(contentEl);
  messagesDiv.appendChild(wrapper);
  
  // Smooth scroll to bottom
  messagesDiv.scrollTo({
    top: messagesDiv.scrollHeight,
    behavior: "smooth"
  });
}

function renderSystemMessage(text) {
  const el = document.createElement("div");
  el.className = "flex justify-center my-2";
  const badge = document.createElement("span");
  badge.className = "px-3 py-1 rounded-full text-[11px] font-medium text-slate-500 bg-slate-200/60 border border-slate-200/50";
  badge.textContent = text;
  el.appendChild(badge);
  messagesDiv.appendChild(el);
  messagesDiv.scrollTo({
    top: messagesDiv.scrollHeight,
    behavior: "smooth"
  });
}

// ===============================================
// รับ events จาก server
// ===============================================
socket.on("chat-message", (data) => renderMessage(data));
socket.on("system-message", (text) => renderSystemMessage(text));
socket.on("online-count", (count) => {
  if (onlineCountEl) {
    onlineCountEl.textContent = `ออนไลน์: ${count}`;
  }
});

let typingTimeout;
socket.on("typing", (username) => {
  if (username === myUsername) return;
  typingIndicator.textContent = `${username} กำลังพิมพ์...`;
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    typingIndicator.textContent = "";
  }, 1500);
});

socket.on("disconnect", () => renderSystemMessage("ขาดการเชื่อมต่อ กำลังเชื่อมต่อใหม่..."));
socket.on("connect", () => {
  console.log("Connected to server:", socket.id);
});
