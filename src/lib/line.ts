// lib/line.ts

import { Client, ClientConfig } from "@line/bot-sdk";

// ดึงค่า config มาจาก environment variables
const lineConfig: ClientConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
  channelSecret: process.env.LINE_CHANNEL_SECRET || "",
};

// ตรวจสอบว่าค่าที่จำเป็นถูกตั้งค่าไว้หรือไม่
if (!lineConfig.channelAccessToken || !lineConfig.channelSecret) {
  throw new Error(
    "LINE_CHANNEL_ACCESS_TOKEN and LINE_CHANNEL_SECRET must be set in .env.local"
  );
}

// สร้างและ export client สำหรับนำไปใช้ที่อื่น
export const lineClient = new Client(lineConfig);
