// app/api/line/webhook/route.ts

import {
  Client,
  ClientConfig,
  MessageAPIResponseBase,
  WebhookEvent,
  TextMessage,
  FollowEvent,
  MessageEvent,
} from "@line/bot-sdk";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// =================================================================
// 1. Client Initialization
// =================================================================

// LINE Client Configuration
const lineConfig: ClientConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
  channelSecret: process.env.LINE_CHANNEL_SECRET || "",
};
const lineClient = new Client(lineConfig);

// Supabase Client Initialization
// ใช้ Service Role Key สำหรับการดำเนินการฝั่ง Server
// เพื่อให้สามารถเขียนข้อมูลข้าม RLS ได้ (เพราะ Server เป็นผู้ดำเนินการแทน User)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // สำคัญ: ใช้ Service Role Key ที่นี่
);

// =================================================================
// 2. Event Handlers
// =================================================================

/**
 * จัดการ Event เมื่อมีผู้ใช้ใหม่ติดตาม (แอดเพื่อน)
 * @param event - The FollowEvent object from LINE.
 */
const handleFollowEvent = async (event: FollowEvent): Promise<MessageAPIResponseBase | void> => {
  const userId = event.source.userId;
  if (!userId) {
    console.error("Follow event is missing userId.");
    return;
  }

  try {
    // ดึงข้อมูลโปรไฟล์จาก LINE
    const profile = await lineClient.getProfile(userId);

    // บันทึกโปรไฟล์ลงในตาราง `profiles` ของ Supabase
    const { error } = await supabase.from("profiles").insert({
      id: userId,
      display_name: profile.displayName,
    });

    if (error) {
      console.error("Error inserting profile to Supabase:", error);
      // อาจจะส่งข้อความบอกผู้ใช้ว่าลงทะเบียนไม่สำเร็จ
      return;
    }

    console.log(`User ${profile.displayName} (${userId}) has been registered.`);

    // ส่งข้อความต้อนรับ
    const welcomeMessage: TextMessage = {
      type: "text",
      text: `สวัสดีคุณ ${profile.displayName}!\nขอบคุณที่แอดเพื่อนนะครับ ผมคือเพื่อนบันทึกอารมณ์ส่วนตัวของคุณ`,
    };
    await lineClient.replyMessage(event.replyToken, welcomeMessage);

  } catch (error) {
    console.error("Error handling follow event:", error);
  }
};

/**
 * จัดการ Event เมื่อผู้ใช้ส่งข้อความ
 * @param event - The MessageEvent object from LINE.
 */
const handleMessageEvent = async (event: MessageEvent): Promise<MessageAPIResponseBase | void> => {
  // ตรวจสอบว่าเป็น Text Message หรือไม่
  if (event.message.type !== "text") {
    return; // ไม่จัดการข้อความประเภทอื่นในตอนนี้
  }

  const userId = event.source.userId;
  const userMessage = event.message.text.trim();
  
  if (!userId) {
    console.error("Message event is missing userId.");
    return;
  }

  try {
    // Logic: ตรวจสอบคำสั่งจากผู้ใช้
    if (userMessage.toLowerCase() === "บันทึกอารมณ์") {
      // TODO: ส่ง Quick Reply พร้อมตัวเลือกอารมณ์
      const reply: TextMessage = {
        type: "text",
        text: "ฟีเจอร์ Quick Reply กำลังมาครับ!",
      };
      await lineClient.replyMessage(event.replyToken, reply);

    } else if (userMessage.toLowerCase() === "ดูสรุป") {
      // TODO: เริ่มกระบวนการสร้างภาพสรุปผล
      const reply: TextMessage = {
        type: "text",
        text: "กำลังเตรียมสรุปให้ครับ (เวอร์ชันทดสอบ)",
      };
      await lineClient.replyMessage(event.replyToken, reply);

    } else if (userMessage.startsWith("mood:")) {
      // Logic: บันทึกอารมณ์แบบง่าย (เช่น mood:สุขใจ)
      const mood = userMessage.split(":")[1];
      const { error } = await supabase.from("moods").insert({
        user_id: userId,
        mood: mood,
        note: `บันทึกผ่านข้อความ: ${mood}`
      });

      if (error) {
        throw new Error(`Supabase insert error: ${error.message}`);
      }
      
      const reply: TextMessage = {
        type: "text",
        text: `บันทึกอารมณ์ "${mood}" ของคุณเรียบร้อยแล้วครับ!`,
      };
      await lineClient.replyMessage(event.replyToken, reply);

    } else {
      // ข้อความทั่วไป
      const reply: TextMessage = {
        type: "text",
        text: 'พิมพ์ "บันทึกอารมณ์" เพื่อเริ่ม หรือ "ดูสรุป" เพื่อดูผลครับ',
      };
      await lineClient.replyMessage(event.replyToken, reply);
    }
  } catch (error) {
    console.error("Error handling message event:", error);
    // ส่งข้อความแจ้งข้อผิดพลาดให้ผู้ใช้ทราบ
    await lineClient.replyMessage(event.replyToken, {
      type: "text",
      text: "ขออภัยครับ เกิดข้อผิดพลาดบางอย่าง",
    });
  }
};

// =================================================================
// 3. Main Webhook Handler (POST Request)
// =================================================================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const events: WebhookEvent[] = body.events;

    // TODO: เพิ่มการตรวจสอบ Signature ใน Production
    // const signature = req.headers.get("x-line-signature");
    // if (!signature || !lineClient.validateSignature(JSON.stringify(body), signature)) {
    //   throw new Error("Invalid signature");
    // }

    if (!events || events.length === 0) {
      return NextResponse.json({ success: true, message: "No events to process" });
    }

    // ประมวลผลทุก Event ที่ได้รับมา
    const results = await Promise.all(
      events.map(async (event) => {
        switch (event.type) {
          case "follow":
            return handleFollowEvent(event as FollowEvent);
          case "message":
            return handleMessageEvent(event as MessageEvent);
          // TODO: เพิ่ม case สำหรับ event อื่นๆ เช่น postback
          default:
            console.log(`Unhandled event type: ${event.type}`);
            return Promise.resolve(null);
        }
      })
    );
    
    return NextResponse.json({ success: true, results });

  } catch (error) {
    console.error("Webhook Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new NextResponse(`Webhook Error: ${errorMessage}`, { status: 500 });
  }
}
