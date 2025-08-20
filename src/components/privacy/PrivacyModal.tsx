"use client";
import { useEffect, useState } from "react";

export default function PrivacyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !open) return null;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold">Private by default</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Sparq is built to help you two talk openly. Your private entries stay private unless you choose to share.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          <li>Journals are private to you by default.</li>
          <li>You control what (if anything) is shared with your partner.</li>
          <li>We only check for crisis risks if you opt in under Settings → Privacy.</li>
        </ul>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border px-3 py-1.5 text-sm">Close</button>
        </div>
      </div>
    </div>
  );
}
