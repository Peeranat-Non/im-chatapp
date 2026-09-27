// ===============================================
// server.js
// Backend server สำหรับ Instant Messaging App
// ใช้ Express จัดการ Web Server
// ใช้ Socket.io จัดการ Real-time Communication (WebSocket protocol)
// ===============================================

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);          // สร้าง HTTP server จาก Express app
const io = new Server(server);                   // แนบ Socket.io เข้ากับ HTTP server ตัวเดียวกัน

const PORT = process.env.PORT || 3000;

// เก็บรายชื่อผู้ใช้ที่ online อยู่ (key = socket.id, value = username)
const onlineUsers = {};

// ให้ Express เสิร์ฟไฟล์ static (HTML, CSS, JS) จากโฟลเดอร์ public
app.use(express.static(path.join(__dirname, "public")));

// ===============================================
// Socket.io Events
// นี่คือหัวใจของ "event-based communication"
// ===============================================
io.on("connection", (socket) => {
  console.log(`[CONNECTED] socket id: ${socket.id}`);

  // -------- Event: join --------
  // client ส่ง event 'join' พร้อม username เข้ามาตอนกด Join
  socket.on("join", (username) => {
    onlineUsers[socket.id] = username;

    // แจ้งทุกคนในห้อง (broadcast) ว่ามีคนเข้าห้องแชท
    io.emit("system-message", `${username} ได้เข้าร่วมห้องแชท`);

    // ส่งจำนวนผู้ใช้ online ล่าสุดให้ทุกคน
    io.emit("online-count", Object.keys(onlineUsers).length);

    console.log(`[JOIN] ${username} (${socket.id})`);
  });

  // -------- Event: chat-message --------
  // client ส่งข้อความเข้ามา -> server broadcast ไปยังทุก client ที่เชื่อมต่ออยู่
  socket.on("chat-message", (data) => {
    // data = { username: 'ชื่อ', message: 'ข้อความ' }
    io.emit("chat-message", {
      username: data.username,
      message: data.message,
      time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
    });
    console.log(`[MESSAGE] ${data.username}: ${data.message}`);
  });

  // -------- Event: typing --------
  // (ฟีเจอร์เสริม) แจ้งว่ากำลังพิมพ์อยู่
  socket.on("typing", (username) => {
    socket.broadcast.emit("typing", username);
  });

  // -------- Event: disconnect --------
  // เมื่อ client ปิดหน้าเว็บ หรือหลุดการเชื่อมต่อ
  socket.on("disconnect", () => {
    const username = onlineUsers[socket.id];
    if (username) {
      io.emit("system-message", `${username} ออกจากห้องแชทแล้ว`);
      delete onlineUsers[socket.id];
      io.emit("online-count", Object.keys(onlineUsers).length);
      console.log(`[DISCONNECT] ${username} (${socket.id})`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
