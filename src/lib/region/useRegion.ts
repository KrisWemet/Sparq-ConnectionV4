"use client";
import useSWR from "swr";

export function useRegion() {
  const { data, isLoading, error, mutate } = useSWR("/api/settings/privacy", (u)=>fetch(u).then(r=>r.json()));
  const region: string = data?.region ?? "CA-AB";
  return { region, isLoading, error, refresh: mutate };
}
