import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/src/lib/auth/auth-utils"; // assumes this exists
import { createClient } from "@supabase/supabase-js";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req); // implement to read session/JWT
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("user_settings").select("*").eq("user_id", userId).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(
    data ?? { user_id: userId, safety_scan_enabled: false, share_defaults: "private", region: "CA-AB" }
  );
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { safety_scan_enabled = false, share_defaults = "private", region = "CA-AB" } = body ?? {};
  const sb = supabaseAdmin();
  const payload = { user_id: userId, safety_scan_enabled, share_defaults, region };
  const { data, error } = await sb
    .from("user_settings")
    .upsert(payload, { onConflict: "user_id" })
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
