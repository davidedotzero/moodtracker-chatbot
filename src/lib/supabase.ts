// lib/supabase.ts

import { createClient } from "@supabase/supabase-js";

// ดึงค่า config มาจาก environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ตรวจสอบว่าค่าที่จำเป็นถูกตั้งค่าไว้หรือไม่
if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Supabase URL or Service Role Key is not defined in .env.local"
  );
}

// สร้างและ export client สำหรับการทำงานฝั่ง Server
// เราตั้งชื่อว่า supabaseAdmin เพื่อให้รู้ว่าเป็น client ที่มีสิทธิ์ระดับ Admin
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    // ป้องกันไม่ให้ Supabase client พยายามจัดการ session ของผู้ใช้โดยอัตโนมัติ
    // เพราะใน context ของ server เราจะจัดการเรื่องนี้เอง
    autoRefreshToken: false,
    persistSession: false,
  },
});
