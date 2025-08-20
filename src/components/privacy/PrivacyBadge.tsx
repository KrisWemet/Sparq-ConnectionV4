"use client";
import { useState } from "react";
import PrivacyModal from "./PrivacyModal";

export default function PrivacyBadge() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border px-3 py-1 text-xs opacity-80 hover:opacity-100"
        aria-label="How we protect your privacy"
      >
        Private by default
      </button>
      <PrivacyModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
