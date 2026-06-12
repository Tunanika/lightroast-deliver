// Tiny user-agent classifier — enough for portal analytics, no dependency.

export interface ParsedUa {
  device: "desktop" | "mobile" | "tablet";
  browser: string | null;
  os: string | null;
  isBot: boolean;
}

// Link-preview crawlers and automated agents — NOT in-app browsers. A real
// person tapping a link inside Instagram/Facebook has "Instagram"/"FBAV" in
// their UA but is a genuine visitor, so those app names must not appear here.
const BOT_RE =
  /bot\b|crawler|spider|slurp|facebookexternalhit|whatsapp\/|telegrambot|twitterbot|linkedinbot|discordbot|slackbot|skypeuripreview|pinterest|vkshare|google-inspectiontool|headless|curl\/|wget\//i;

export function parseUa(ua: string): ParsedUa {
  if (!ua) return { device: "desktop", browser: null, os: null, isBot: false };

  const isBot = BOT_RE.test(ua);

  let os: string | null = null;
  if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/Windows NT/.test(ua)) os = "Windows";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/CrOS/.test(ua)) os = "ChromeOS";
  else if (/Linux/.test(ua)) os = "Linux";

  let device: ParsedUa["device"] = "desktop";
  if (/iPad/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))) {
    device = "tablet";
  } else if (/Mobi|iPhone|iPod|Android/.test(ua)) {
    device = "mobile";
  }

  let browser: string | null = null;
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/.test(ua)) browser = "Opera";
  else if (/SamsungBrowser/.test(ua)) browser = "Samsung Internet";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Chrome\/|CriOS/.test(ua)) browser = "Chrome";
  else if (/Safari\//.test(ua)) browser = "Safari";

  return { device, browser, os, isBot };
}
