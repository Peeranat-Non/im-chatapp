# Instant Messaging (IM) Application

โปรเจกต์วิชา Data Communication — Instant Messaging App แบบ Real-time
พัฒนาด้วย **Node.js + Express + Socket.io** โดยสื่อสารข้อมูลผ่าน **WebSocket Protocol**

## Tech Stack
- **Node.js** — JavaScript runtime ฝั่ง server
- **Express** — Web framework จัดการ routing / static files
- **Socket.io** — Real-time, event-based communication (บนพื้นฐาน WebSocket, fallback เป็น HTTP long-polling)
- **Tailwind CSS** — จัดหน้าตา UI
- **Render** — PaaS สำหรับ deploy
- **Cloudflare** — CDN / ความปลอดภัย

## โครงสร้างโปรเจกต์
```
im-chatapp/
├── package.json
├── server.js          # Backend: Express + Socket.io
└── public/
    ├── index.html      # หน้า Join Chatroom + หน้าแชท
    └── client.js       # โค้ดฝั่ง client เชื่อมต่อ Socket.io
```

## วิธีติดตั้งและรันบนเครื่อง

```bash
npm install
node server.js
```

จากนั้นเปิดเบราว์เซอร์ไปที่ `http://localhost:3000`

## Deploy
Deploy ผ่าน [Render](https://render.com) โดยตั้งค่า:
- Build Command: `npm install`
- Start Command: `node server.js`

## สมาชิกกลุ่ม
- นาย ธนวัฒน์ วีระศักดิ์
- นาย ภาณุวัฒน์ เฉลิมพงษ์
- นาย สุรรักษ์ วิทยากุล
- นาย นนท์ธเนศ นามวงศ์
- นาย พิสิฐพงศ์ โกมลมรรค
