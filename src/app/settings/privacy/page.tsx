"use client";
import { useRegion } from "@/lib/region/useRegion";
import { useState, useEffect } from "react";

export default function PrivacySettings() {
  const { region: userRegion, refresh } = useRegion();
  const [safety, setSafety] = useState(false);
  const [share, setShare] = useState<"private"|"partner"|"custom">("private");
  const [region, setRegion] = useState("CA-AB");
  const [saving, setSaving] = useState(false);

  // Get initial data from API
  useEffect(() => {
    fetch("/api/settings/privacy")
      .then(r => r.json())
      .then(data => {
        if (data) {
          setSafety(Boolean(data.safety_scan_enabled));
          setShare((data.share_defaults ?? "private") as any);
          setRegion(data.region ?? "CA-AB");
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (userRegion) {
      setRegion(userRegion);
    }
  }, [userRegion]);

  async function save() {
    setSaving(true);
    await fetch("/api/settings/privacy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ safety_scan_enabled: safety, share_defaults: share, region })
    });
    setSaving(false);
    refresh();
  }

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-5">
      <h1 className="text-2xl font-semibold">Privacy</h1>
      <p className="opacity-80">Changing these settings never notifies your partner.</p>
      <div className="rounded-xl border p-4 space-y-4">
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={safety} onChange={()=>setSafety(v=>!v)} />
          <span>
            <div className="font-medium">Gently check for crisis risks in my entries</div>
            <div className="text-sm opacity-70">
              If on, we'll only nudge you toward resources when language looks high-risk. No partner notifications.
            </div>
          </span>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
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
                            <select className="mt-1 w-full rounded-lg border p-2" value={region} onChange={(e)=>setRegion(e.target.value)}>
                  <option value="CA-AB">Canada — Alberta</option>
                  <option value="US">United States</option>
                  <option value="DEFAULT">Other / Not sure</option>
                </select>
          </div>
        </div>
        <div>
          <button onClick={save} disabled={saving} className="rounded-xl bg-black px-4 py-2 text-white">
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </main>
  );
}
