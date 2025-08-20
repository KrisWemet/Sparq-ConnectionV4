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
      .from('user_love_languages')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching love languages:', error);
      return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }

    // Return current data or defaults
    if (data) {
      return NextResponse.json(data);
    } else {
      // Return default structure
      return NextResponse.json({
        user_id: userId,
        scores: { words: 0, acts: 0, gifts: 0, time: 0, touch: 0 },
        top_two: ['time', 'touch'],
        updated_at: new Date().toISOString()
      });
    }
  } catch (err: any) {
    console.error('Error in love languages GET:', err);
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
    const { scores, top_two } = body;

    // Validate required fields
    if (!scores || !top_two) {
      return NextResponse.json({ error: "Missing required fields: scores, top_two" }, { status: 400 });
    }

    // Validate scores structure
    const requiredScoreKeys = ['words', 'acts', 'gifts', 'time', 'touch'];
    for (const key of requiredScoreKeys) {
      if (!(key in scores)) {
        return NextResponse.json({ error: `Scores must include ${key}` }, { status: 400 });
      }
    }

    // Validate top_two array
    if (!Array.isArray(top_two) || top_two.length !== 2) {
      return NextResponse.json({ error: "top_two must be an array with exactly 2 elements" }, { status: 400 });
    }

    // Validate that top_two values are valid love language keys
    for (const lang of top_two) {
      if (!requiredScoreKeys.includes(lang)) {
        return NextResponse.json({ error: `Invalid love language: ${lang}. Must be one of: ${requiredScoreKeys.join(', ')}` }, { status: 400 });
      }
    }

    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from('user_love_languages')
      .upsert({
        user_id: userId,
        scores,
        top_two,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting love languages:', error);
      return NextResponse.json({ error: "Failed to save data" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Error in love languages POST:', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
