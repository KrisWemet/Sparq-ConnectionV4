"use client";
import { useState } from "react";

const ITEMS = [
  { k:"words1",  q:"It means a lot to hear clear appreciation for what I do.", cat:"words" },
  { k:"acts1",   q:"When my partner handles a task for us, I feel cared for.", cat:"acts" },
  { k:"gifts1",  q:"A small, thoughtful surprise brightens my whole day.", cat:"gifts" },
  { k:"time1",   q:"Uninterrupted time together helps me feel close.", cat:"time" },
  { k:"touch1",  q:"Hugs/holding hands instantly calm or connect me.", cat:"touch" },
  { k:"words2",  q:"Kind words help me feel seen and secure.", cat:"words" },
  { k:"acts2",   q:"I notice (and cherish) the little helpful things.", cat:"acts" },
  { k:"gifts2",  q:"A gift that shows they were thinking of me feels special.", cat:"gifts" },
  { k:"time2",   q:"Shared routines (walks, meals) matter a lot to me.", cat:"time" },
  { k:"touch2",  q:"Physical closeness helps me reconnect after conflict.", cat:"touch" },
  { k:"words3",  q:"I replay compliments—they really stick with me.", cat:"words" },
  { k:"acts3",   q:"I feel loved when my partner lightens my load.", cat:"acts" },
  { k:"gifts3",  q:"Mementos remind me I'm loved.", cat:"gifts" },
  { k:"time3",   q:"Quality time recharges us more than anything else.", cat:"time" },
  { k:"touch3",  q:"A quick cuddle or back rub goes a long way.", cat:"touch" }
] as const;

function likert(){ return [1,2,3,4,5]; }

export default function LoveLanguageQuiz({ onDone }:{ onDone:(r:{scores:Record<string,number>; topTwo:[string,string]})=>void }) {
  const [ans, setAns] = useState<Record<string, number>>({});
  const allAnswered = ITEMS.every(i => ans[i.k] !== undefined);

  function score(){
    const sums: Record<string, number> = { words:0, acts:0, gifts:0, time:0, touch:0 };
    for (const item of ITEMS) sums[item.cat] += ans[item.k] || 0;
    const ordered = Object.entries(sums).sort((a,b)=>b[1]-a[1]);
    const topTwo = [ordered[0][0], ordered[1][0]] as [string,string];
    onDone({ scores: sums, topTwo });
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">What lands for you most?</h3>
      {ITEMS.map(item=>(
        <div key={item.k} className="rounded-lg border p-3">
          <div>{item.q}</div>
          <div className="mt-2 flex gap-2">
            {likert().map(v=>(
              <label key={v} className={`cursor-pointer rounded border px-2 py-1 text-sm ${ans[item.k]===v?"bg-black text-white":""}`}>
                <input className="sr-only" type="radio" name={item.k} value={v}
                       onChange={()=>setAns(a=>({...a,[item.k]:v}))}/>
                {v}
              </label>
            ))}
          </div>
        </div>
      ))}
      <button disabled={!allAnswered} onClick={score} className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50">See result</button>
    </div>
  );
}
