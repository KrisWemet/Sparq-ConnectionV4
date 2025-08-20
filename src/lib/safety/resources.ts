export type Resource = { name: string; desc?: string; phone?: string; text?: string; web?: string };

export const SAFETY_RESOURCES: Record<string, Resource[]> = {
  "CA-AB": [
    { name: "9-8-8 Suicide Crisis Helpline", desc: "Call or text 988 for immediate support." },
    { name: "Alberta Family Violence Info Line", phone: "310-1818", desc: "Call or text 24/7." },
    { name: "Kids Help Phone", text: "Text CONNECT to 686868", desc: "Youth support by text." }
  ],
  "US": [
    { name: "9-8-8 Suicide & Crisis Lifeline", desc: "Call or text 988 for immediate support." },
    { name: "National Domestic Violence Hotline", desc: "24/7 support.", phone: "1-800-799-7233", text: "Text START to 88788" }
  ],
  DEFAULT: [
    { name: "Local emergency services", desc: "Use your regional emergency number." }
  ]
};

export function resourcesFor(region?: string) {
  // If no region specified, return default
  if (!region) {
    return SAFETY_RESOURCES.DEFAULT;
  }
  
  // Try exact match first (e.g., "CA-AB", "US")
  if (SAFETY_RESOURCES[region]) {
    return SAFETY_RESOURCES[region];
  }
  
  // Try country-only fallback (e.g., "CA" -> "CA-AB", "US" -> "US")
  const countryCode = region.split('-')[0];
  if (countryCode && countryCode !== region) {
    // Look for any region that starts with this country code
    const countryMatch = Object.keys(SAFETY_RESOURCES).find(key => 
      key.startsWith(countryCode + '-') || key === countryCode
    );
    if (countryMatch) {
      return SAFETY_RESOURCES[countryMatch];
    }
  }
  
  // Final fallback to default
  return SAFETY_RESOURCES.DEFAULT;
}
