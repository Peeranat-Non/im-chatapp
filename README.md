# Instant Messaging (IM) Application

โปรเจกต์วิชา Data Communication — Instant Messaging App แบบ Real-time
พัฒนาด้วย **Node.js + Express + Socket.io** โดยสื่อสารข้อมูลผ่าน **WebSocket Protocol**

## Tech Stack
- **Node.js** — JavaScript runtime ฝั่ง server
- **Express** — Web framework จัดการ routing / static files / อัปโหลดไฟล์
- **Socket.io** — Real-time, event-based communication (บนพื้นฐาน WebSocket)
- **Multer** — จัดการรับไฟล์ที่อัปโหลด (รูป/วิดีโอ/ไฟล์/เสียง)
- **Tailwind CSS** — จัดหน้าตา UI แบบ responsive
- **Render** — PaaS สำหรับ deploy
- **Cloudflare** — CDN / ความปลอดภัย

## ฟีเจอร์
- แชทข้อความแบบ Real-time หลายคนพร้อมกัน
- Responsive รองรับมือถือ / iPad / Notebook
- แนบรูปภาพ วิดีโอ ไฟล์ทั่วไป และ GIF ในแชท
- อัดและส่งข้อความเสียง (Voice Message)
- Emoji picker ในตัว
- แสดงสถานะ "กำลังพิมพ์..." และจำนวนผู้ใช้ออนไลน์

## โครงสร้างโปรเจกต์
```
im-chatapp/
├── package.json
├── server.js          # Backend: Express + Socket.io + Multer (upload)
├── uploads/           # ไฟล์ที่ผู้ใช้แนบ (สร้างอัตโนมัติตอนรัน ไม่ได้ push ขึ้น git)
└── public/
    ├── index.html      # หน้า Join Chatroom + หน้าแชท (responsive)
    └── client.js       # โค้ดฝั่ง client: ข้อความ/ไฟล์แนบ/emoji/อัดเสียง
```

## วิธีติดตั้งและรันบนเครื่อง
```bash
npm install
node server.js
```
เปิดเบราว์เซอร์ไปที่ `http://localhost:3000`

## Deploy
Deploy ผ่าน [Render](https://render.com):
- Build Command: `npm install`
- Start Command: `node server.js`

> ⚠️ **หมายเหตุสำคัญ**: บน Render แพ็กเกจฟรี พื้นที่เก็บไฟล์เป็นแบบ **ephemeral** (ไม่ถาวร)
> ไฟล์ที่ผู้ใช้แนบในแชท (รูป/วิดีโอ/เสียง) จะ**หายไปทุกครั้งที่ server รีสตาร์ทหรือ deploy ใหม่**
> หากต้องการเก็บไฟล์ถาวร ต้องใช้ persistent disk (แพลนเสียเงิน) หรือเชื่อมกับบริการเก็บไฟล์ภายนอก เช่น Cloudinary / AWS S3

## ข้อจำกัดที่ควรทราบ
- ไฟล์แนบจำกัดขนาดไม่เกิน 25MB ต่อไฟล์
- ปุ่ม GIF คือการเลือกไฟล์ .gif จากเครื่องผู้ใช้ ไม่ใช่ระบบค้นหา GIF ออนไลน์แบบ Discord
  (การค้นหา GIF ออนไลน์ต้องสมัคร API เช่น Tenor และผูก API key เพิ่มเติม)
- การอัดเสียงต้องอนุญาตให้เว็บเข้าถึงไมโครโฟน (ต้องรันผ่าน HTTPS หรือ localhost เท่านั้น มาตรฐานความปลอดภัยของเบราว์เซอร์)
