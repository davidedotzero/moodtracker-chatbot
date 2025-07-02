// app/api/line/webhook/route.ts

import {
  MessageAPIResponseBase,
  WebhookEvent,
  TextMessage,
  FollowEvent,
  MessageEvent,
} from "@line/bot-sdk";
import { NextResponse } from "next/server";

// 1. Import clients from the lib folder
import { lineClient } from "@/lib/line";
import { supabaseAdmin } from "@/lib/supabase";


// กำหนดอารมณ์ต่างๆ ไว้ในที่เดียวเพื่อให้จัดการง่าย
const MOOD_OPTIONS = ["😄 ยอดเยี่ยม", "😊 สุขใจ", "😐 เฉยๆ", "😢 เศร้า", "😠 โกรธ"];
// =================================================================
// 2. Event Handlers (No changes in logic, just using imported clients)
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
    const profile = await lineClient.getProfile(userId);

    // ใช้ supabaseAdmin ที่ import เข้ามา
    const { error } = await supabaseAdmin.from("profiles").insert({
      id: userId,
      display_name: profile.displayName,
    });

    if (error) {
      console.error("Error inserting profile to Supabase:", error);
      return;
    }

    console.log(`User ${profile.displayName} (${userId}) has been registered.`);

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
  if (event.message.type !== "text") {
    return;
  }

  const userId = event.source.userId;
  const userMessage = event.message.text.trim();
  
  if (!userId) {
    console.error("Message event is missing userId.");
    return;
  }

  try {
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
      const mood = userMessage.split(":")[1];
      
      // ใช้ supabaseAdmin ที่ import เข้ามา
      const { error } = await supabaseAdmin.from("moods").insert({
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
      const reply: TextMessage = {
        type: "text",
        text: 'พิมพ์ "บันทึกอารมณ์" เพื่อเริ่ม หรือ "ดูสรุป" เพื่อดูผลครับ',
      };
      await lineClient.replyMessage(event.replyToken, reply);
    }
  } catch (error) {
    console.error("Error handling message event:", error);
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

    if (!events || events.length === 0) {
      return NextResponse.json({ success: true, message: "No events to process" });
    }

    const results = await Promise.all(
      events.map(async (event) => {
        switch (event.type) {
          case "follow":
            return handleFollowEvent(event as FollowEvent);
          case "message":
            return handleMessageEvent(event as MessageEvent);
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
