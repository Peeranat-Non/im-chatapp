// ===============================================
// client.js
// โค้ดฝั่ง Client: เชื่อมต่อ server ผ่าน Socket.io (WebSocket)
// รองรับ: ข้อความ, แนบรูป/วิดีโอ/ไฟล์/GIF, emoji, อัดเสียงส่ง
// ===============================================

const socket = io();
let myUsername = "";

// ---------- อ้างอิง element ----------
const joinScreen = document.getElementById("join-screen");
const chatScreen = document.getElementById("chat-screen");
const usernameInput = document.getElementById("username-input");
const joinBtn = document.getElementById("join-btn");
const joinError = document.getElementById("join-error");

const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const onlineCountEl = document.getElementById("online-count");
const typingIndicator = document.getElementById("typing-indicator");

const attachBtn = document.getElementById("attach-btn");
const fileInput = document.getElementById("file-input");
const gifBtn = document.getElementById("gif-btn");
const gifInput = document.getElementById("gif-input");
const emojiBtn = document.getElementById("emoji-btn");
const emojiPanel = document.getElementById("emoji-panel");

const micBtn = document.getElementById("mic-btn");
const recordingBar = document.getElementById("recording-bar");
const recordTimerEl = document.getElementById("record-timer");
const cancelRecordBtn = document.getElementById("cancel-record-btn");
const stopRecordBtn = document.getElementById("stop-record-btn");

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
  socket.emit("join", myUsername);
  joinScreen.classList.add("hidden");
  chatScreen.classList.remove("hidden");
  messageInput.focus();
}
joinBtn.addEventListener("click", handleJoin);
usernameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") handleJoin(); });

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
  if (e.key === "Enter") sendTextMessage();
  else socket.emit("typing", myUsername);
});

// ===============================================
// อัปโหลดไฟล์ทั่วไปแล้วส่งเป็นข้อความ
// ใช้ได้กับ: รูป, วิดีโอ, ไฟล์, GIF, เสียงที่อัดไว้
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
      type: data.type,       // image | video | audio | file
      fileUrl: data.url,
      fileName: data.fileName,
    });
  } catch (err) {
    renderSystemMessage("อัปโหลดไฟล์ไม่สำเร็จ กรุณาลองใหม่");
    console.error(err);
  }
}

// ---------- ปุ่มแนบไฟล์ (รูป/วิดีโอ/ไฟล์) ----------
attachBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) uploadAndSend(fileInput.files[0]);
  fileInput.value = "";
});

// ---------- ปุ่มแนบ GIF ----------
// หมายเหตุ: เป็นการเลือกไฟล์ .gif จากเครื่องผู้ใช้ ไม่ใช่ระบบค้นหา GIF ออนไลน์แบบ Discord
// (การค้นหา GIF ออนไลน์ต้องสมัครใช้ API ของผู้ให้บริการ เช่น Tenor และผูก API key เพิ่มเติม)
gifBtn.addEventListener("click", () => gifInput.click());
gifInput.addEventListener("change", () => {
  if (gifInput.files[0]) uploadAndSend(gifInput.files[0]);
  gifInput.value = "";
});

// ===============================================
// Emoji Picker (แบบง่าย ไม่พึ่ง library ภายนอก)
// ===============================================
const EMOJI_LIST = [
  "😀","😁","😂","🤣","😊","😍","😘","😜","🤔","😎",
  "😭","😡","😱","👍","👎","👏","🙏","💪","🔥","🎉",
  "❤️","💙","💚","💛","🧡","💜","🖤","🤍","✅","❌",
  "🎂","🎁","☕","🍕","🍔","⚽","🏀","🎮","📷","🎵",
];
EMOJI_LIST.forEach((emo) => {
  const btn = document.createElement("button");
  btn.textContent = emo;
  btn.className = "hover:bg-gray-700 rounded p-1";
  btn.addEventListener("click", () => {
    messageInput.value += emo;
    messageInput.focus();
  });
  emojiPanel.appendChild(btn);
});
emojiBtn.addEventListener("click", () => emojiPanel.classList.toggle("hidden"));
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
    renderSystemMessage("ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาอนุญาตการใช้งานไมโครโฟน");
    return;
  }

  mediaRecorder = new MediaRecorder(recordedStream);
  audioChunks = [];
  recordSeconds = 0;

  mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);

  mediaRecorder.onstop = () => {
    // ปิดไมโครโฟนหลังหยุดอัด
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

// ===============================================
// แสดงข้อความในหน้าแชท (แยกตามประเภท)
// ===============================================
function renderMessage({ username, message, type, fileUrl, fileName }) {
  const isMe = username === myUsername;

  const wrapper = document.createElement("div");
  wrapper.className = `flex flex-col ${isMe ? "items-end" : "items-start"}`;

  const nameEl = document.createElement("span");
  nameEl.className = "text-xs text-gray-200";
  nameEl.textContent = isMe ? "You" : username;
  wrapper.appendChild(nameEl);

  let contentEl;

  if (type === "image") {
    contentEl = document.createElement("img");
    contentEl.src = fileUrl;
    contentEl.className = "max-w-[60%] sm:max-w-[220px] rounded-lg mt-1";
  } else if (type === "video") {
    contentEl = document.createElement("video");
    contentEl.src = fileUrl;
    contentEl.controls = true;
    contentEl.className = "max-w-[70%] sm:max-w-[240px] rounded-lg mt-1";
  } else if (type === "audio") {
    contentEl = document.createElement("audio");
    contentEl.src = fileUrl;
    contentEl.controls = true;
    contentEl.className = "mt-1 max-w-[220px]";
  } else if (type === "file") {
    contentEl = document.createElement("a");
    contentEl.href = fileUrl;
    contentEl.download = fileName || "";
    contentEl.target = "_blank";
    contentEl.className = `px-3 py-2 rounded-lg text-sm mt-1 flex items-center gap-2 ${
      isMe ? "bg-purple-600 text-white" : "bg-green-400 text-black"
    }`;
    contentEl.innerHTML = `📎 <span class="underline">${fileName || "ไฟล์แนบ"}</span>`;
  } else {
    // text
    contentEl = document.createElement("span");
    contentEl.className = `px-3 py-1 rounded-full text-sm mt-1 break-words ${
      isMe ? "bg-purple-600 text-white" : "bg-green-400 text-black"
    }`;
    contentEl.textContent = message;
  }

  wrapper.appendChild(contentEl);
  messagesDiv.appendChild(wrapper);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function renderSystemMessage(text) {
  const el = document.createElement("div");
  el.className = "text-center text-xs italic text-gray-100";
  el.textContent = text;
  messagesDiv.appendChild(el);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// ===============================================
// รับ events จาก server
// ===============================================
socket.on("chat-message", (data) => renderMessage(data));
socket.on("system-message", (text) => renderSystemMessage(text));
socket.on("online-count", (count) => (onlineCountEl.textContent = `online: ${count}`));

let typingTimeout;
socket.on("typing", (username) => {
  if (username === myUsername) return;
  typingIndicator.textContent = `${username} กำลังพิมพ์...`;
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => (typingIndicator.textContent = ""), 1500);
});

socket.on("disconnect", () => renderSystemMessage("การเชื่อมต่อขาดหาย กำลังพยายามเชื่อมต่อใหม่..."));
socket.on("connect", () => console.log("เชื่อมต่อกับ server สำเร็จ:", socket.id));
