# 💬 IM Chat App — Instant Messaging Application

โปรเจกต์วิชา **Data Networking / Data Communication**
พัฒนาแอปพลิเคชันสำหรับติดต่อสื่อสารแบบ **Instant Messaging (IM)** คล้ายกับ Line, Facebook Messenger, WhatsApp
โดยเน้นสาธิตการรับ-ส่งข้อมูล (ข้อความ ภาพ วิดีโอ เสียง ไฟล์) แบบ **Real-time** ผ่าน **Protocol การสื่อสารข้อมูล** บนเครือข่ายอินเทอร์เน็ต

พัฒนาด้วย **Node.js + Express + Socket.io**

---

## 📡 การติดต่อสื่อสารผ่าน Protocol

แอปนี้ใช้โปรโตคอลหลายชั้นทำงานร่วมกัน (ตาม OSI/Internet model) เพื่อให้ผู้ใช้หลายคนคุยกันแบบ real-time ได้:

### 1. TCP/IP — ชั้นขนส่งข้อมูลพื้นฐาน
ข้อมูลทุกอย่างในแอปเดินทางผ่านเครือข่ายด้วย **TCP (Transmission Control Protocol)** บน **IP (Internet Protocol)** ซึ่งรับประกันว่าข้อมูล (แพ็กเก็ต) จะไปถึงปลายทางครบถ้วนและเรียงลำดับถูกต้อง เป็นฐานให้ Protocol ชั้นบน (HTTP, WebSocket) ทำงานอยู่บนนี้อีกที

### 2. HTTP — โหลดหน้าเว็บและอัปโหลดไฟล์
เมื่อผู้ใช้เปิดแอปครั้งแรก เบราว์เซอร์จะขอไฟล์ `index.html`, `client.js` ผ่าน **HTTP Request/Response** (Express ทำหน้าที่เป็น Web Server) รวมถึงการอัปโหลดไฟล์แนบ (รูป/วิดีโอ/เสียง) ก็ส่งผ่าน `HTTP POST /upload` แบบ `multipart/form-data` (จัดการโดย Multer) — เป็นรูปแบบ **Request-Response** แบบดั้งเดิม ไม่เหมาะกับข้อความที่ต้องอัปเดตแบบทันที

### 3. WebSocket — สื่อสาร Real-time สองทาง
ปัญหาของ HTTP คือ Client ต้องเป็นฝ่ายร้องขอก่อนเสมอ (server ส่งเองไม่ได้) แอปนี้จึงใช้ **WebSocket Protocol** ซึ่งเปิด **Connection แบบถาวร (Persistent Connection)** ระหว่าง Client และ Server ครั้งเดียว แล้วทั้งสองฝั่งส่งข้อมูลหากันได้ตลอดเวลาแบบ **Full-duplex** (ส่ง-รับพร้อมกันได้) ทำให้ข้อความ/สถานะออนไลน์/สถานะกำลังพิมพ์ ถูกส่งถึงทุกคนในห้องแชททันทีโดยไม่ต้องกดรีเฟรช

กระบวนการ (Handshake) คือ Client ขอ **Upgrade** การเชื่อมต่อจาก HTTP ไปเป็น WebSocket (`ws://` หรือ `wss://` เมื่อเข้ารหัส) ผ่าน HTTP Header พิเศษ (`Upgrade: websocket`) เมื่อ Server ตอบรับ (`101 Switching Protocols`) การเชื่อมต่อจะเปลี่ยนไปใช้ WebSocket ตลอดไปจนกว่าจะปิด

### 4. Socket.io — Library ที่ครอบ WebSocket ไว้อีกชั้น
โปรเจกต์นี้ไม่ได้เรียกใช้ WebSocket ดิบ ๆ แต่ใช้ **Socket.io** ซึ่งเป็น **Event-based Communication Protocol** ที่สร้างอยู่บน WebSocket (และมี Fallback เป็น HTTP long-polling อัตโนมัติถ้าเครือข่ายไม่รองรับ WebSocket) โดยฝั่ง Client และ Server จะ "emit" และ "on" อีเวนต์หากันเป็นชื่อ ๆ เช่น:

| Event | ทิศทาง | ความหมาย |
|---|---|---|
| `join` | Client → Server | ผู้ใช้เข้าร่วมห้องแชท พร้อมชื่อผู้ใช้ |
| `chat-history` | Server → Client | ส่งประวัติข้อความย้อนหลังให้ผู้ที่เพิ่งเชื่อมต่อ |
| `chat-message` | สองทาง | ส่ง/กระจายข้อความ (ข้อความ/รูป/วิดีโอ/เสียง/ไฟล์) ให้ทุกคน |
| `typing` | Client → Server → Client อื่น | แจ้งสถานะ "กำลังพิมพ์..." |
| `system-message` | Server → Client | แจ้งเตือนระบบ เช่น มีคนเข้า/ออกห้อง |
| `online-count` | Server → Client | อัปเดตจำนวนผู้ใช้ที่ออนไลน์ |
| `disconnect` | อัตโนมัติ | แจ้งเมื่อผู้ใช้หลุดการเชื่อมต่อ |

### สรุปการไหลของข้อมูล
```
Client A                     Server (Express + Socket.io)                Client B, C, ...
   │  HTTP GET /              │                                              │
   │ ────────────────────────▶│  (โหลดหน้าเว็บ index.html/client.js)         │
   │  WebSocket Handshake      │                                              │
   │ ────────────────────────▶│ 101 Switching Protocols                      │
   │  emit("chat-message")     │                                              │
   │ ────────────────────────▶│ io.emit("chat-message") ─────────────────────▶│
   │                           │  (broadcast ให้ทุกคนในห้องพร้อมกัน)          │
```

---

## 🧱 Tech Stack

| ส่วนประกอบ | หน้าที่ |
|---|---|
| **Node.js** | JavaScript runtime ฝั่ง server |
| **Express** | Web framework จัดการ routing / static files / อัปโหลดไฟล์ (HTTP) |
| **Socket.io** | Real-time, event-based communication (บนพื้นฐาน WebSocket) |
| **Multer** | จัดการรับไฟล์ที่อัปโหลด (รูป/วิดีโอ/ไฟล์/เสียง) ผ่าน HTTP |
| **Tailwind CSS** | จัดหน้าตา UI แบบ responsive รองรับ Dark Mode |
| **Render** | PaaS สำหรับ deploy |
| **Cloudflare** | CDN / ความปลอดภัย |

## ✨ ฟีเจอร์

- แชทข้อความแบบ Real-time หลายคนพร้อมกัน ผ่าน WebSocket/Socket.io
- ประวัติการสนทนาถูกเก็บไว้ที่ฝั่ง Server (`chat-history.json`) และส่งกลับให้ผู้ใช้เมื่อเข้าร่วม/รีเฟรชหน้า (Message Persistence)
- Responsive รองรับมือถือ / iPad / Notebook
- แนบรูปภาพ วิดีโอ ไฟล์ทั่วไป และ GIF ในแชท (ผ่าน HTTP upload)
- อัดและส่งข้อความเสียง (Voice Message)
- Emoji picker ในตัว
- แสดงสถานะ "กำลังพิมพ์..." และจำนวนผู้ใช้ออนไลน์แบบเรียลไทม์
- **Dark Mode** พร้อมจดจำธีมที่ผู้ใช้เลือกไว้ (บันทึกใน `localStorage`)
- จำชื่อผู้ใช้ล่าสุดไว้ใน `localStorage` เพื่อ Auto-join เมื่อรีเฟรชหน้าจอ

## 🗂️ โครงสร้างโปรเจกต์
```
im-chatapp/
├── package.json
├── metadata.json
├── server.js            # Backend: Express (HTTP) + Socket.io (WebSocket) + Multer (upload)
├── chat-history.json     # ไฟล์เก็บประวัติแชทล่าสุด (สร้าง/อัปเดตอัตโนมัติตอนรัน)
├── uploads/              # ไฟล์ที่ผู้ใช้แนบ (สร้างอัตโนมัติตอนรัน ไม่ได้ push ขึ้น git)
└── public/
    ├── index.html        # หน้า Join Chatroom + หน้าแชท (responsive, dark mode)
    └── client.js          # โค้ดฝั่ง client: ข้อความ/ไฟล์แนบ/emoji/อัดเสียง/dark mode
```

## 🚀 วิธีติดตั้งและรันบนเครื่อง
```bash
npm install
node server.js
```
เปิดเบราว์เซอร์ไปที่ `http://localhost:3000`

## ☁️ Deploy
Deploy ผ่าน [Render](https://render.com):
- Build Command: `npm install`
- Start Command: `node server.js`

> ⚠️ **หมายเหตุสำคัญ**: บน Render แพ็กเกจฟรี พื้นที่เก็บไฟล์เป็นแบบ **ephemeral** (ไม่ถาวร)
> ไฟล์ที่ผู้ใช้แนบในแชท (รูป/วิดีโอ/เสียง) และไฟล์ประวัติแชท จะ**หายไปทุกครั้งที่ server รีสตาร์ทหรือ deploy ใหม่**
> หากต้องการเก็บไฟล์ถาวร ต้องใช้ persistent disk (แพลนเสียเงิน) หรือเชื่อมกับบริการเก็บไฟล์ภายนอก เช่น Cloudinary / AWS S3 / ฐานข้อมูลจริง

## ⚠️ ข้อจำกัดที่ควรทราบ
- ไฟล์แนบจำกัดขนาดไม่เกิน 25MB ต่อไฟล์
- ปุ่ม GIF คือการเลือกไฟล์ .gif จากเครื่องผู้ใช้ ไม่ใช่ระบบค้นหา GIF ออนไลน์แบบ Discord
  (การค้นหา GIF ออนไลน์ต้องสมัคร API เช่น Tenor และผูก API key เพิ่มเติม)
- การอัดเสียงต้องอนุญาตให้เว็บเข้าถึงไมโครโฟน (ต้องรันผ่าน HTTPS หรือ localhost เท่านั้น มาตรฐานความปลอดภัยของเบราว์เซอร์)
- ประวัติแชทเก็บสูงสุด 150 ข้อความล่าสุด (`MAX_HISTORY` ใน `server.js`) และเก็บแบบไฟล์ (ไม่ใช่ฐานข้อมูลจริง) จึงไม่เหมาะกับการใช้งานจริงระดับ production
