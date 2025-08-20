import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/auth-utils";
import { createClient } from "@supabase/supabase-js";

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from('user_attachment_style')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching attachment style:', error);
      return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }

    // Return current data or defaults
    if (data) {
      return NextResponse.json(data);
    } else {
      // Return default structure
      return NextResponse.json({
        user_id: userId,
        scores: { anxiety: 0, avoidance: 0 },
        style: 'secure',
        updated_at: new Date().toISOString()
      });
    }
  } catch (err: any) {
    console.error('Error in attachment style GET:', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { scores, style } = body;

    // Validate required fields
    if (!scores || !style) {
      return NextResponse.json({ error: "Missing required fields: scores, style" }, { status: 400 });
    }

    // Validate scores structure
    if (!scores.anxiety || !scores.avoidance) {
      return NextResponse.json({ error: "Scores must include anxiety and avoidance" }, { status: 400 });
    }

    // Validate style
    const validStyles = ['secure', 'anxious', 'avoidant', 'fearful'];
    if (!validStyles.includes(style)) {
      return NextResponse.json({ error: "Invalid style. Must be one of: " + validStyles.join(', ') }, { status: 400 });
    }

    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from('user_attachment_style')
      .upsert({
        user_id: userId,
        scores,
        style,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting attachment style:', error);
      return NextResponse.json({ error: "Failed to save data" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Error in attachment style POST:', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
