"use client";
import { useRegion } from "@/lib/region/useRegion";
import { resourcesFor } from "@/lib/safety/resources";

export default function ResourceList() {
  const { region } = useRegion();
  const items = resourcesFor(region);
  return (
    <ul className="mt-2 space-y-2">
      {items.map((r, idx) => (
        <li key={idx} className="rounded-lg border p-3">
          <div className="font-medium">{r.name}</div>
          {r.desc && <div className="text-sm opacity-80">{r.desc}</div>}
          <div className="mt-1 text-sm">
            {r.phone && <div>Phone: {r.phone}</div>}
            {r.text && <div>Text: {r.text}</div>}
            {r.web && <a className="underline" href={r.web} target="_blank">Website</a>}
          </div>
        </li>
      ))}
    </ul>
  );
}
