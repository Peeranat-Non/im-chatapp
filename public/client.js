// ===============================================
// client.js
// โค้ดฝั่ง Client: เชื่อมต่อ server ผ่าน Socket.io (WebSocket)
// รองรับ: ข้อความตัวหนังสือ, แนบรูปภาพ/GIF ในปุ่มเดียว, emoji, อัดเสียงส่ง (รองรับ iPad/iOS Safari/Android/PC)
// และระบบสลับ Dark Mode / Light Mode
// ===============================================

const socket = io();
let myUsername = "";

// ---------- ตรวจสอบและจัดการ Dark Mode ----------
function initTheme() {
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
}

initTheme();

const themeToggleJoin = document.getElementById("theme-toggle-join");
const themeToggleChat = document.getElementById("theme-toggle-chat");
if (themeToggleJoin) themeToggleJoin.addEventListener("click", toggleTheme);
if (themeToggleChat) themeToggleChat.addEventListener("click", toggleTheme);

// ---------- อ้างอิง element ----------
const joinScreen = document.getElementById("join-screen");
const chatScreen = document.getElementById("chat-screen");
const usernameInput = document.getElementById("username-input");
const joinBtn = document.getElementById("join-btn");
const joinError = document.getElementById("join-error");
const myBadge = document.getElementById("my-badge");
const leaveBtn = document.getElementById("leave-btn");

const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const onlineCountEl = document.getElementById("online-count");
const typingIndicator = document.getElementById("typing-indicator");

// ปุ่มแนบรูปภาพ/GIF (รวมฟังก์ชันแล้ว)
const imageBtn = document.getElementById("image-btn");
const imageInput = document.getElementById("image-input");
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
// เข้าห้องแชท (Auto Re-join เมื่อรีเฟรชหน้าจอ)
// ===============================================
function handleJoin(savedName) {
  const username = (savedName || usernameInput.value).trim();
  if (!username) {
    joinError.classList.remove("hidden");
    return;
  }
  myUsername = username;
  localStorage.setItem("chat_username", myUsername);
  usernameInput.value = myUsername;

  if (myBadge) {
    myBadge.textContent = `@${myUsername}`;
  }
  socket.emit("join", myUsername);
  joinScreen.classList.add("hidden");
  chatScreen.classList.remove("hidden");
  messageInput.focus();
  updateViewportLayout();
}

function handleLeave() {
  if (myUsername) {
    socket.emit("leave");
  }
  localStorage.removeItem("chat_username");
  myUsername = "";
  chatScreen.classList.add("hidden");
  joinScreen.classList.remove("hidden");
  usernameInput.value = "";
  usernameInput.focus();
}

joinBtn.addEventListener("click", () => handleJoin());
usernameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleJoin();
});
if (leaveBtn) {
  leaveBtn.addEventListener("click", handleLeave);
}

// ตรวจสอบชื่อเดิมจาก localStorage เพื่อ Auto-join เมื่อรีเฟรชหน้าจอ
const storedUsername = localStorage.getItem("chat_username");
if (storedUsername) {
  usernameInput.value = storedUsername;
  handleJoin(storedUsername);
}

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
// อัปโหลดไฟล์ส่งเป็นข้อความ (รูปภาพ / GIF / เสียงที่อัด)
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
      type: data.type, // image | audio | file
      fileUrl: data.url,
      fileName: data.fileName,
      mimeType: file.type,
    });
  } catch (err) {
    renderSystemMessage("ไม่สามารถส่งไฟล์ได้ กรุณาลองใหม่อีกครั้ง");
    console.error(err);
  }
}

// ---------- ปุ่มแนบรูปภาพและ GIF (รวมกัน) ----------
if (imageBtn && imageInput) {
  imageBtn.addEventListener("click", () => imageInput.click());
  imageInput.addEventListener("change", () => {
    if (imageInput.files[0]) {
      uploadAndSend(imageInput.files[0]);
    }
    imageInput.value = "";
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
  btn.className = "hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl p-1.5 transition text-lg flex items-center justify-center";
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
// อัดเสียงและส่งเป็นข้อความเสียง (MediaRecorder API รองรับ iPad/iOS Safari)
// ===============================================
let mediaRecorder = null;
let audioChunks = [];
let recordSeconds = 0;
let recordTimerInterval = null;
let recordedStream = null;
let supportedAudioMimeType = "audio/mp4";

function getSupportedAudioMimeType() {
  // ตรวจสอบ MIME type ที่เบราว์เซอร์เครื่องผู้ใช้รองรับอย่างแท้จริง
  // iPadOS / iOS Safari จะรองรับ audio/mp4 หรือ audio/aac ได้สมบูรณ์ที่สุด
  const types = [
    "audio/mp4",
    "audio/aac",
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus"
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "";
}

async function startRecording() {
  try {
    recordedStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    renderSystemMessage("ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาอนุญาตการใช้งานไมค์ในการตั้งค่าเบราว์เซอร์");
    return;
  }

  supportedAudioMimeType = getSupportedAudioMimeType();
  const options = supportedAudioMimeType ? { mimeType: supportedAudioMimeType } : {};

  try {
    mediaRecorder = new MediaRecorder(recordedStream, options);
  } catch (e) {
    mediaRecorder = new MediaRecorder(recordedStream);
  }

  audioChunks = [];
  recordSeconds = 0;

  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      audioChunks.push(e.data);
    }
  };

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

    const mime = mediaRecorder.mimeType || supportedAudioMimeType || "audio/mp4";
    const audioBlob = new Blob(audioChunks, { type: mime });
    
    // ตั้งนามสกุลไฟล์ให้ตรงกับ container เพื่อให้เครื่องเล่น Safari / Chrome / iPad เปิดได้ถูกต้อง
    let ext = "m4a";
    if (mime.includes("webm")) ext = "webm";
    else if (mime.includes("ogg")) ext = "ogg";
    else if (mime.includes("wav")) ext = "wav";

    const audioFile = new File([audioBlob], `voice-${Date.now()}.${ext}`, { type: mime });
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
// Custom Audio Player component (เปิดฟังได้ 100% บน iPad, iPhone, Mac, PC, Android)
// ===============================================
function createAudioPlayer(audioUrl, isMe) {
  const container = document.createElement("div");
  container.className = `flex items-center gap-3 p-3 rounded-2xl shadow-sm border select-none max-w-[280px] sm:max-w-xs transition ${
    isMe
      ? "bg-slate-900 border-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:border-slate-200"
      : "bg-white border-slate-200/90 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
  }`;

  const audio = new Audio(audioUrl);
  audio.preload = "metadata";

  // Play/Pause button
  const playBtn = document.createElement("button");
  playBtn.type = "button";
  playBtn.className = `w-9 h-9 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition ${
    isMe
      ? "bg-white/10 hover:bg-white/20 text-white dark:bg-slate-900/10 dark:hover:bg-slate-900/20 dark:text-slate-900"
      : "bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100"
  }`;
  playBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z"/>
    </svg>
  `;

  // Wave / Progress indicator
  const trackWrapper = document.createElement("div");
  trackWrapper.className = "flex-1 flex flex-col justify-center gap-1.5 min-w-0";

  const progressBg = document.createElement("div");
  progressBg.className = `h-1.5 w-full rounded-full cursor-pointer relative overflow-hidden ${
    isMe ? "bg-white/20 dark:bg-slate-900/20" : "bg-slate-200 dark:bg-slate-700"
  }`;

  const progressBar = document.createElement("div");
  progressBar.className = `h-full w-0 rounded-full transition-all duration-100 ${
    isMe ? "bg-white dark:bg-slate-900" : "bg-slate-800 dark:bg-emerald-400"
  }`;
  progressBg.appendChild(progressBar);

  const durationEl = document.createElement("div");
  durationEl.className = "text-[11px] font-mono opacity-70 flex justify-between";
  durationEl.innerHTML = `<span>ข้อความเสียง</span><span class="timer">0:00</span>`;
  const timerSpan = durationEl.querySelector(".timer");

  trackWrapper.appendChild(progressBg);
  trackWrapper.appendChild(durationEl);

  container.appendChild(playBtn);
  container.appendChild(trackWrapper);

  function formatSec(s) {
    if (isNaN(s) || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  audio.addEventListener("loadedmetadata", () => {
    timerSpan.textContent = formatSec(audio.duration);
  });

  audio.addEventListener("timeupdate", () => {
    if (audio.duration) {
      const pct = (audio.currentTime / audio.duration) * 100;
      progressBar.style.width = `${pct}%`;
      timerSpan.textContent = formatSec(audio.currentTime);
    }
  });

  audio.addEventListener("ended", () => {
    playBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z"/>
      </svg>
    `;
    progressBar.style.width = "0%";
    timerSpan.textContent = formatSec(audio.duration);
  });

  audio.addEventListener("error", (e) => {
    console.warn("Audio playback error, fallback to native controls:", e);
    // กรณีที่เบราว์เซอร์ไม่สามารถ decode ด้วย Audio element ให้แสดง native fallback
    container.innerHTML = "";
    const nativeAudio = document.createElement("audio");
    nativeAudio.src = audioUrl;
    nativeAudio.controls = true;
    nativeAudio.className = "max-w-[220px] h-8";
    container.appendChild(nativeAudio);
  });

  playBtn.addEventListener("click", () => {
    if (audio.paused) {
      // Pause other audios if any
      document.querySelectorAll("audio").forEach(a => { if (a !== audio) a.pause(); });
      audio.play().then(() => {
        playBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
        `;
      }).catch(err => {
        console.error("Audio play failed:", err);
      });
    } else {
      audio.pause();
      playBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z"/>
        </svg>
      `;
    }
  });

  progressBg.addEventListener("click", (e) => {
    const rect = progressBg.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    if (audio.duration) {
      audio.currentTime = pos * audio.duration;
    }
  });

  return container;
}

// ===============================================
// แสดงข้อความในหน้าแชท (Minimal Styling + Dark Mode)
// ===============================================
function renderMessage({ username, message, type, fileUrl, fileName, timestamp }) {
  const isMe = username === myUsername;
  const timeStr = formatTime(timestamp ? new Date(timestamp) : new Date());

  const wrapper = document.createElement("div");
  wrapper.className = `flex flex-col group ${isMe ? "items-end" : "items-start"} max-w-full animate-fadeIn`;

  // Sender Name & Time header
  const metaEl = document.createElement("div");
  metaEl.className = `flex items-center gap-1.5 mb-1 px-1 text-[11px] ${
    isMe ? "flex-row-reverse text-slate-400 dark:text-slate-500" : "text-slate-500 dark:text-slate-400"
  }`;
  
  const nameEl = document.createElement("span");
  nameEl.className = `font-medium ${isMe ? "text-slate-500 dark:text-slate-400" : "text-slate-700 dark:text-slate-200"}`;
  nameEl.textContent = isMe ? "คุณ" : username;

  const timeEl = document.createElement("span");
  timeEl.className = "text-[10px] text-slate-400 dark:text-slate-500";
  timeEl.textContent = timeStr;

  metaEl.appendChild(nameEl);
  metaEl.appendChild(timeEl);
  wrapper.appendChild(metaEl);

  let contentEl;

  if (type === "image") {
    // Image / GIF
    const box = document.createElement("div");
    box.className = "overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm max-w-[75%] sm:max-w-xs cursor-pointer hover:opacity-95 transition active:scale-[0.98]";
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
    video.className = "max-w-[85%] sm:max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm";
    contentEl = video;
  } else if (type === "audio") {
    // Audio Player ที่เสถียรบนทุกเบราว์เซอร์
    contentEl = createAudioPlayer(fileUrl, isMe);
  } else if (type === "file") {
    contentEl = document.createElement("a");
    contentEl.href = fileUrl;
    contentEl.download = fileName || "";
    contentEl.target = "_blank";
    contentEl.className = `px-3.5 py-2.5 rounded-2xl text-xs flex items-center gap-2 border shadow-sm ${
      isMe
        ? "bg-slate-900 text-white border-slate-800 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
    } transition`;
    contentEl.innerHTML = `<span>📎</span><span class="font-medium underline truncate max-w-[180px]">${fileName || "ดาวน์โหลดไฟล์"}</span>`;
  } else {
    // Text message bubble
    contentEl = document.createElement("div");
    contentEl.className = `px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words max-w-[85%] sm:max-w-md shadow-sm ${
      isMe
        ? "bg-slate-900 text-white rounded-tr-sm dark:bg-slate-100 dark:text-slate-900"
        : "bg-white text-slate-800 border border-slate-200/80 rounded-tl-sm dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
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
  badge.className = "px-3 py-1 rounded-full text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700";
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
// รับประวัติข้อความทั้งหมดจาก Server เมื่อเข้าห้องหรือรีเฟรชหน้าจอ
socket.on("chat-history", (history) => {
  if (Array.isArray(history)) {
    messagesDiv.innerHTML = "";
    history.forEach((msg) => {
      if (msg.type === "system") {
        renderSystemMessage(msg.message);
      } else {
        renderMessage(msg);
      }
    });
  }
});

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

// ===============================================
// Viewport Layout Handling (iOS Safari / iPad / Mobile Keyboard)
// ===============================================
function updateViewportLayout() {
  requestAnimationFrame(() => {
    const vv = window.visualViewport;
    const height = vv ? Math.round(vv.height) : window.innerHeight;

    document.documentElement.style.setProperty("--vvh", `${height}px`);

    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;

    if (chatScreen && !chatScreen.classList.contains("hidden")) {
      if (messagesDiv) {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }
    }
  });
}

if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", updateViewportLayout);
  window.visualViewport.addEventListener("scroll", updateViewportLayout);
}
window.addEventListener("resize", updateViewportLayout);
window.addEventListener("orientationchange", () => {
  setTimeout(updateViewportLayout, 300);
});

// Call once on load
updateViewportLayout();

// Focus / Blur handlers for inputs (iOS / Android keyboard animation delays)
messageInput.addEventListener("focus", () => {
  [50, 150, 300, 600].forEach((delay) => {
    setTimeout(updateViewportLayout, delay);
  });
});

messageInput.addEventListener("blur", () => {
  setTimeout(updateViewportLayout, 100);
});

usernameInput.addEventListener("focus", () => {
  [50, 150, 300].forEach((delay) => {
    setTimeout(() => {
      updateViewportLayout();
      usernameInput.scrollIntoView({ block: "center", behavior: "smooth" });
    }, delay);
  });
});

socket.on("disconnect", () => renderSystemMessage("ขาดการเชื่อมต่อ กำลังเชื่อมต่อใหม่..."));
socket.on("connect", () => {
  console.log("Connected to server:", socket.id);
  // หากหลุดการเชื่อมต่อแล้วต่อกลับเข้ามาใหม่ขณะอยู่ในห้องแชท ให้ auto rejoin ทันที
  if (myUsername) {
    socket.emit("join", myUsername);
  }
});
