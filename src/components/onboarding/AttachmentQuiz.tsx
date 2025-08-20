"use client";
import { useState } from "react";

// 8 quick items → anxiety (A) or avoidance (V)
const ITEMS = [
  { k:"A1", q:"When my partner pulls away, I get a knot in my stomach and want to fix it immediately.", axis:"anxiety" },
  { k:"A2", q:"I worry my partner might not feel as strongly as I do.", axis:"anxiety" },
  { k:"A3", q:"If we haven't connected today, I feel uneasy or on edge.", axis:"anxiety" },
  { k:"A4", q:"I need extra reassurance if we had tension recently.", axis:"anxiety" },
  { k:"V1", q:"I prefer to handle my feelings on my own before talking.", axis:"avoidance" },
  { k:"V2", q:"When things get intense, I shut down or change the subject.", axis:"avoidance" },
  { k:"V3", q:"Too much closeness makes me feel smothered.", axis:"avoidance" },
  { k:"V4", q:"I need space to think before I'm ready to share.", axis:"avoidance" }
] as const;

function likert() { return [1,2,3,4,5]; } // 1=Strongly Disagree … 5=Strongly Agree

export default function AttachmentQuiz({ onDone }:{ onDone:(result:{style:string;scores:{anxiety:number;avoidance:number}})=>void }) {
  const [ans, setAns] = useState<Record<string, number>>({});
  const allAnswered = ITEMS.every(i => ans[i.k] !== undefined);

  function score() {
    const anxiety = ITEMS.filter(i=>i.axis==="anxiety").reduce((s,i)=>s+(ans[i.k]||0),0);
   const avoidance = ITEMS.filter(i=>i.axis==="avoidance").reduce((s,i)=>s+(ans[i.k]||0),0);
    // crude bands: 8–16 low, 17–26 medium, 27–40 high
    const aHi = anxiety >= 27, vHi = avoidance >= 27;
    const style = aHi && vHi ? "fearful" : aHi ? "anxious" : vHi ? "avoidant" : "secure";
    onDone({ style, scores:{anxiety, avoidance} });
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Quick check-in about closeness & space</h3>
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
