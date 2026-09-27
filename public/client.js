// ===============================================
// client.js
// โค้ดฝั่ง Client: เชื่อมต่อกับ server ผ่าน Socket.io (WebSocket)
// และจัดการหน้าจอ Join Chatroom -> หน้าแชท
// ===============================================

// 1) เชื่อมต่อไปยัง server ทันทีที่โหลดหน้าเว็บ
//    (Socket.io จะเลือก transport ที่ดีที่สุดให้เอง เช่น WebSocket)
const socket = io();

let myUsername = "";

// ---------- อ้างอิง element ในหน้าเว็บ ----------
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

// ===============================================
// ฟังก์ชัน: กด Join เข้าห้องแชท
// ===============================================
function handleJoin() {
  const username = usernameInput.value.trim();
  if (!username) {
    joinError.classList.remove("hidden");
    return;
  }
  myUsername = username;

  // ส่ง event 'join' ไปที่ server พร้อมชื่อผู้ใช้
  socket.emit("join", myUsername);

  // สลับหน้าจอ
  joinScreen.classList.add("hidden");
  chatScreen.classList.remove("hidden");
  messageInput.focus();
}

joinBtn.addEventListener("click", handleJoin);
usernameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleJoin();
});

// ===============================================
// ฟังก์ชัน: ส่งข้อความ
// ===============================================
function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  // ส่ง event 'chat-message' ไปที่ server
  socket.emit("chat-message", { username: myUsername, message: text });

  messageInput.value = "";
}

sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
  else socket.emit("typing", myUsername); // แจ้งว่ากำลังพิมพ์
});

// ===============================================
// ฟังก์ชัน: แสดงข้อความในหน้าแชท
// ===============================================
function renderMessage({ username, message, time }) {
  const isMe = username === myUsername;

  const wrapper = document.createElement("div");
  wrapper.className = `flex flex-col ${isMe ? "items-end" : "items-start"}`;

  const nameEl = document.createElement("span");
  nameEl.className = "text-xs text-gray-200";
  nameEl.textContent = isMe ? "You" : username;

  const bubble = document.createElement("span");
  bubble.className = `px-3 py-1 rounded-full text-sm mt-1 ${
    isMe ? "bg-purple-600 text-white" : "bg-green-400 text-black"
  }`;
  bubble.textContent = message;

  wrapper.appendChild(nameEl);
  wrapper.appendChild(bubble);
  messagesDiv.appendChild(wrapper);
  messagesDiv.scrollTop = messagesDiv.scrollHeight; // เลื่อนลงล่างสุดเสมอ
}

function renderSystemMessage(text) {
  const el = document.createElement("div");
  el.className = "text-center text-xs italic text-gray-100";
  el.textContent = text;
  messagesDiv.appendChild(el);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// ===============================================
// รับ events ที่ server ส่งกลับมา
// ===============================================

// รับข้อความแชทจาก server (broadcast มาจากทุกคนรวมถึงตัวเราเอง)
socket.on("chat-message", (data) => {
  renderMessage(data);
});

// รับข้อความระบบ เช่น "xxx ได้เข้าร่วมห้องแชท"
socket.on("system-message", (text) => {
  renderSystemMessage(text);
});

// รับจำนวนผู้ใช้ online
socket.on("online-count", (count) => {
  onlineCountEl.textContent = `online: ${count}`;
});

// รับสถานะกำลังพิมพ์ของคนอื่น
let typingTimeout;
socket.on("typing", (username) => {
  if (username === myUsername) return;
  typingIndicator.textContent = `${username} กำลังพิมพ์...`;
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => (typingIndicator.textContent = ""), 1500);
});

// (ทางเลือก) แจ้งเตือนเมื่อหลุดการเชื่อมต่อ / เชื่อมต่อใหม่อัตโนมัติ
socket.on("disconnect", () => {
  renderSystemMessage("การเชื่อมต่อขาดหาย กำลังพยายามเชื่อมต่อใหม่...");
});
socket.on("connect", () => {
  console.log("เชื่อมต่อกับ server สำเร็จ:", socket.id);
});
