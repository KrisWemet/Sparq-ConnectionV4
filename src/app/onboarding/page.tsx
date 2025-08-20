"use client";
import { useState, useEffect } from "react";
import AttachmentQuiz from "@/components/onboarding/AttachmentQuiz";
import LoveLanguageQuiz from "@/components/onboarding/LoveLanguageQuiz";
import ResultCards from "@/components/onboarding/ResultCards";

const privacyCopy = {
  headline: "Private by default.",
  sub: "Sparq is built to help you two talk openly. Your private entries stay private unless you choose to share.",
  bullets: [
    "• Journals are private to you by default.",
    "• You control what (if anything) is shared with your partner.",
    "• We check for crisis risks only if you opt in below."
  ],
  toggleSafetyScanLabel: "Gently check for crisis risks in my entries",
  toggleSafetyScanHelp: "If on, we'll only nudge you toward resources when language looks high-risk. No partner notifications.",
  cta: "Save preferences"
};

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [safety, setSafety] = useState(false);
  const [share, setShare] = useState<"private"|"partner"|"custom">("private");
  const [region, setRegion] = useState("CA-AB");
  const [touchedRegion, setTouchedRegion] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attachmentResult, setAttachmentResult] = useState<any>(null);
  const [loveLanguageResult, setLoveLanguageResult] = useState<any>(null);

  // Soft location suggestion (never forcing)
  useEffect(() => {
    if (touchedRegion) return; // user decided; don't override
    // OPTIONAL: soft suggestion using timezone (never force)
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (tz.includes("Edmonton")) setRegion("CA-AB");
    } catch {}
  }, [touchedRegion]);

  async function savePrefs() {
    setSaving(true);
    await fetch("/api/settings/privacy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        safety_scan_enabled: safety,
        share_defaults: share,
        region
      })
    }).catch(() => {});
    setSaving(false);
    setStep(3); // Go to attachment quiz
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-6 text-sm opacity-70">Step {step} of 5</div>
      {step === 1 && (
        <section className="space-y-3">
          <h1 className="text-2xl font-semibold">Built for honest conversations.</h1>
          <p>You choose what to share. Private journals stay private unless you decide otherwise.</p>
          <div className="mt-6">
            <button onClick={() => setStep(2)} className="rounded-xl bg-black px-4 py-2 text-white">Continue</button>
          </div>
        </section>
      )}
      {step === 2 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">{privacyCopy.headline}</h2>
          <p className="opacity-80">{privacyCopy.sub}</p>
          <div className="rounded-xl border p-4">
            <div className="space-y-1 text-sm">{privacyCopy.bullets.map((b,i)=><div key={i}>{b}</div>)}</div>
            <div className="mt-4 flex items-start gap-3">
              <input id="safety" type="checkbox" checked={safety} onChange={()=>setSafety(v=>!v)} />
              <label htmlFor="safety">
                <div className="font-medium">{privacyCopy.toggleSafetyScanLabel}</div>
                <div className="text-sm opacity-70">{privacyCopy.toggleSafetyScanHelp}</div>
              </label>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Default sharing</label>
                <select className="mt-1 w-full rounded-lg border p-2" value={share} onChange={(e)=>setShare(e.target.value as any)}>
                  <option value="private">Private</option>
                  <option value="partner">Share with partner</option>
                  <option value="custom">Ask each time</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Region</label>
                <select className="mt-1 w-full rounded-lg border p-2" value={region} onChange={(e)=>{
                  setRegion(e.target.value);
                  setTouchedRegion(true);
                }}>
                  <option value="CA-AB">Canada — Alberta</option>
                  <option value="US">United States</option>
                  <option value="DEFAULT">Other / Not sure</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <button disabled={saving} onClick={savePrefs} className="rounded-xl bg-black px-4 py-2 text-white">
                {saving ? "Saving..." : privacyCopy.cta}
              </button>
            </div>
          </div>
        </section>
      )}
      {step === 3 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Understanding your attachment style</h2>
          <p className="opacity-80">This quick quiz helps us understand how you experience closeness and space in relationships.</p>
          <AttachmentQuiz 
            onDone={async (result) => {
              setAttachmentResult(result);
              await fetch("/api/assessments/attachment", { 
                method: "POST", 
                headers: { "Content-Type": "application/json" }, 
                body: JSON.stringify(result) 
              });
              setStep(4);
            }}
          />
        </section>
      )}
      {step === 4 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Understanding your love languages</h2>
          <p className="opacity-80">Discover how you prefer to give and receive love in relationships.</p>
          <LoveLanguageQuiz 
            onDone={async (result) => {
              setLoveLanguageResult(result);
              await fetch("/api/assessments/love-languages", { 
                method: "POST", 
                headers: { "Content-Type": "application/json" }, 
                body: JSON.stringify(result) 
              });
              setStep(5);
            }}
          />
        </section>
      )}
      {step === 5 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">You're in control.</h2>
          <p>You can change privacy or safety settings anytime in Settings → Privacy.</p>
          <ResultCards 
            attachment={attachmentResult}
            loveLanguages={loveLanguageResult}
          />
          <a href="/dashboard" className="inline-block rounded-xl bg-black px-4 py-2 text-white">Start</a>
        </section>
      )}
    </main>
  );
}