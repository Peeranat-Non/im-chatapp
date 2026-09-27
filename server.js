// ===============================================
// server.js
// Backend server สำหรับ Instant Messaging App
// - Express          : จัดการ Web Server + Route อัปโหลดไฟล์
// - Socket.io        : Real-time Communication (WebSocket protocol)
// - Multer           : จัดการรับไฟล์ที่อัปโหลด (รูป/วิดีโอ/ไฟล์/เสียง)
// ===============================================

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// โฟลเดอร์เก็บไฟล์ที่ผู้ใช้อัปโหลด (รูป/วิดีโอ/ไฟล์/เสียง)
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// เก็บรายชื่อผู้ใช้ที่ online อยู่
const onlineUsers = {};

// ===============================================
// ตั้งค่า Multer สำหรับรับไฟล์อัปโหลด
// ===============================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // ตั้งชื่อไฟล์ใหม่กันชื่อซ้ำ: timestamp-ชื่อเดิม
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_ก-๙]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // จำกัดไฟล์ไม่เกิน 25MB ต่อไฟล์
});

// ให้ Express เสิร์ฟไฟล์ static (HTML, CSS, JS) จากโฟลเดอร์ public
app.use(express.static(path.join(__dirname, "public")));
// ให้ Express เสิร์ฟไฟล์ที่อัปโหลดแล้ว ผ่าน URL /uploads/...
app.use("/uploads", express.static(UPLOAD_DIR));

// ===============================================
// Route: POST /upload
// รับไฟล์จาก client (รูป/วิดีโอ/ไฟล์/เสียงที่อัดไว้) แล้วคืน URL กลับไป
// ===============================================
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "ไม่พบไฟล์ที่อัปโหลด" });
  }

  // จำแนกประเภทไฟล์จาก mimetype เพื่อให้ฝั่ง client แสดงผลถูกแบบ
  let type = "file";
  if (req.file.mimetype.startsWith("image/")) type = "image";
  else if (req.file.mimetype.startsWith("video/")) type = "video";
  else if (req.file.mimetype.startsWith("audio/")) type = "audio";

  res.json({
    url: `/uploads/${req.file.filename}`,
    fileName: req.file.originalname,
    type,
  });
});

// ตัวจัดการ error ของ Multer (เช่น ไฟล์ใหญ่เกินกำหนด)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err) {
    return res.status(400).json({ error: err.message || "อัปโหลดไฟล์ไม่สำเร็จ" });
  }
  next();
});

// ===============================================
// Socket.io Events (event-based communication)
// ===============================================
io.on("connection", (socket) => {
  console.log(`[CONNECTED] socket id: ${socket.id}`);

  // -------- Event: join --------
  socket.on("join", (username) => {
    onlineUsers[socket.id] = username;
    io.emit("system-message", `${username} ได้เข้าร่วมห้องแชท`);
    io.emit("online-count", Object.keys(onlineUsers).length);
    console.log(`[JOIN] ${username} (${socket.id})`);
  });

  // -------- Event: chat-message --------
  // data = { username, message, type, fileUrl?, fileName? }
  // type: 'text' | 'image' | 'video' | 'audio' | 'file'
  socket.on("chat-message", (data) => {
    io.emit("chat-message", {
      username: data.username,
      message: data.message || "",
      type: data.type || "text",
      fileUrl: data.fileUrl || null,
      fileName: data.fileName || null,
      time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
    });
    console.log(`[MESSAGE] ${data.username}: ${data.type} ${data.message || data.fileName || ""}`);
  });

  // -------- Event: typing --------
  socket.on("typing", (username) => {
    socket.broadcast.emit("typing", username);
  });

  // -------- Event: disconnect --------
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

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
