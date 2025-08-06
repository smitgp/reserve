import axios from "axios";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";
import * as dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const BASE = "https://bibliotheekutrecht.crmplatform.nl";
const GUEST_FORM_URL = `${BASE}/werkplekreserveren-aanmelden?reserveren=true`;

const ENGINE_URL  = process.env.ENGINE_URL;
let   ENGINE_BODY = process.env.ENGINE_BODY;

const LOCATION = process.env.LOCATION;
const TYPE     = process.env.TYPE;
const DATE     = process.env.DATE;
const START    = process.env.START;
const END      = process.env.END;
const RESOURCE = process.env.RESOURCE;

for (const [k, v] of Object.entries({ ENGINE_URL, ENGINE_BODY, LOCATION, TYPE, DATE, START, END, RESOURCE })) {
  if (!v) { console.error(`Missing env var: ${k}`); process.exit(2); }
}

const DEBUG = process.env.DEBUG === "1";

const jar = new CookieJar();
const client = wrapper(axios.create({
  jar,
  withCredentials: true,
  timeout: 20000,
  maxRedirects: 5,
  headers: { "User-Agent": "guest-reservation/1.3 (+node)" },
}));

const ajaxHeaders = {
  "Origin": BASE,
  "Referer": GUEST_FORM_URL,
  "X-Requested-With": "XMLHttpRequest",
};
const formHeaders = {
  ...ajaxHeaders,
  "Content-Type": "application/x-www-form-urlencoded",
};

function toForm(obj) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) p.append(k, String(v));
  return p.toString();
}
function parseHidden(name, html) {
  const re = new RegExp(`<input[^>]*name=["']${name}["'][^>]*value=["']([^"']+)["']`, "i");
  const m = String(html).match(re);
  return m ? m[1] : null;
}

function findEmailFieldName(html) {
  // Look for email input field and extract its name
  const m = String(html).match(/<input[^>]*type=["']email["'][^>]*name=["']([^"']+)["']/i);
  return m ? m[1] : "form:D1930"; // fallback to known value
}
function randomToken(len = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = ""; for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
function extractFormAction(html) {
  if (!html) return null;
  const s = String(html);
  
  // Look for data-urlIfModified attribute (contains the actual endpoint)
  let m = s.match(/data-urlIfModified=["']([^"']*engine\?service=recordmanager:form:[^"']+)["']/i);
  if (m) {
    // Decode HTML entities
    return m[1].replace(/&amp;/g, '&');
  }
  
  // Fallback: Look for form action with engine service
  m = s.match(/<form[^>]*action=["']([^"']*engine\?service=recordmanager:form:[^"']+)["']/i);
  return m ? m[1] : null;
}

function extractVerifUrl(html) {
  if (!html) return null;
  const s = String(html);

  // Direct link
  let m = s.match(/\/reserveringen\/werkplekkenVerificatie\.vm\?[^"'<> \n\r]+/i);
  if (m) return BASE + m[0];

  // Meta refresh: <meta http-equiv="refresh" content="0; url=/reserveringen/werkplekkenVerificatie.vm?...">
  m = s.match(/http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"'>\s]+)/i);
  if (m) return m[1].startsWith("http") ? m[1] : BASE + m[1];

  // JS redirect: location.href = '/reserveringen/werkplekkenVerificatie.vm?...'
  m = s.match(/location\.(href|assign)\s*=\s*['"]([^'"]+Verificatie\.vm[^'"]+)['"]/i);
  if (m) return m[2].startsWith("http") ? m[2] : BASE + m[2];

  return null;
}

(async () => {
  try {
    // 1) GET guest form (scrape fresh csrf/form-id and form action)
    const formResp = await client.get(GUEST_FORM_URL);
    const html = String(formResp.data || "");
    if (DEBUG) fs.writeFileSync("debug_initial_form.html", html, "utf8");
    const freshCsrf   = parseHidden("csrf-key", html);
    const freshFormId = parseHidden("form-id", html);
    const formAction  = extractFormAction(html);
    const emailFieldName = findEmailFieldName(html);

    // 2) Build ENGINE POST body; override tokens + email
    const params = new URLSearchParams(ENGINE_BODY);
    if (freshCsrf)   params.set("csrf-key", freshCsrf);
    if (freshFormId) params.set("form-id",  freshFormId);

    const baseEmail = process.env.BASE_EMAIL || "g.smit92@gmail.com";
    const [user, domain] = baseEmail.split("@");
    const uniqueEmail = `${user}+${randomToken()}@${domain}`;
    params.set(emailFieldName, uniqueEmail);   // use dynamically found email field name
    
    // Use dynamically extracted form action or fallback to ENV, and ensure cmd=save
    let engineUrl = formAction ? (formAction.startsWith("http") ? formAction : BASE + formAction) : ENGINE_URL;
    engineUrl = engineUrl.replace(/cmd=asksave/i, 'cmd=save');
    
    if (DEBUG) {
      console.log(`Fresh CSRF token: ${freshCsrf}`);
      console.log(`Fresh Form ID: ${freshFormId}`);
      console.log(`Form Action: ${formAction}`);
      console.log(`Email field name: ${emailFieldName}`);
      console.log(`Engine URL: ${engineUrl}`);
      console.log(`Using dynamic email: ${uniqueEmail}`);
      console.log(`Full form data: ${params.toString()}`);
    } else {
      console.log(`Using dynamic email: ${uniqueEmail}`);
    }

    // 3) ENGINE POST
    const engineResp = await client.post(engineUrl, params.toString(), { headers: formHeaders });

    // Try A: via final redirect URL
    let verifUrl =
      engineResp?.request?.res?.responseUrl ||
      engineResp?.request?.responseURL || null;
    if (verifUrl && !/werkplekkenVerificatie\.vm/i.test(verifUrl)) verifUrl = null;

    // Try B: parse HTML returned by POST
    if (!verifUrl) {
      const bodyHtml = typeof engineResp.data === "string" ? engineResp.data : "";
      if (DEBUG) fs.writeFileSync("debug_engine.html", bodyHtml, "utf8");
      verifUrl = extractVerifUrl(bodyHtml);
    }

    // Try C: GET the thank-you page and parse
    if (!verifUrl) {
      const thankYouUrl = `${BASE}/formulieren/bedankpaginaBiebWerkt.vm`;
      const tyResp = await client.get(thankYouUrl, { headers: { Origin: BASE, Referer: GUEST_FORM_URL } });
      const tyHtml = String(tyResp.data || "");
      if (DEBUG) fs.writeFileSync("debug_thankyou.html", tyHtml, "utf8");
      verifUrl = extractVerifUrl(tyHtml);
    }

    if (!verifUrl) throw new Error("Could not find verification URL (checked redirect, POST HTML, and thank-you page).");
    console.log("Verification URL:", verifUrl);

    // 4) Verification GET (finalize session for THIS email)
    await client.get(verifUrl, { headers: { Origin: BASE, Referer: GUEST_FORM_URL } });

    // 5) Update referer for reservation requests (must use reservering.vm page)
    // HAR analysis shows all reservation requests use this specific referer
    const reservationReferer = `${BASE}/reserveringen/page/reservering.vm?`;
    const reservationHeaders = {
      "Origin": BASE,
      "Referer": reservationReferer,
      "X-Requested-With": "XMLHttpRequest",
      "Content-Type": "application/x-www-form-urlencoded",
    };

    // 6) Optional availability check (as shown in HAR analysis)
    // This step checks resource availability before making the reservation.
    // Can be useful for validating slot availability or getting resource lists.
    // To enable: remove SKIP_AVAIL=1 from .env or set SKIP_AVAIL=0
    // To check different date: set AVAILDATE=YYYY-MM-DD in .env
    const availDate = process.env.AVAILDATE || DATE;
    const skipAvail = process.env.SKIP_AVAIL === "1";
    if (!skipAvail) {
      const availUrl = `${BASE}/reserveringen/page/js/reservations.vm?location=${LOCATION}&type=${TYPE}&date=${availDate}`;
      await client.post(availUrl, "", { headers: reservationHeaders });
      console.log(`Availability checked for date: ${availDate}`);
    } else {
      console.log("Skipping availability check (SKIP_AVAIL=1)");
    }

    // 7) Make the reservation
    const reservationBody = toForm({ location: LOCATION, type: TYPE, date: DATE, start: START, end: END, resource: RESOURCE });
    const res = await client.post(`${BASE}/reserveringen/page/makereservation.vm`, reservationBody, { headers: reservationHeaders });

    const text = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
    console.log("HTTP:", res.status);
    console.log(text.slice(0, 800));

    if (/sessie\s*is\s*verlopen/i.test(text)) throw new Error("Session expired.");
    if (/bevestig|geslaagd|gelukt|success|aangemaakt/i.test(text)) {
      console.log("Looks like a SUCCESS.");
    } else {
      console.log("Reservation response received (inspect above).");
    }
  } catch (err) {
    console.error("ERROR:", err.message);
    if (err.response) {
      const body = typeof err.response.data === "string" ? err.response.data : JSON.stringify(err.response.data);
      if (DEBUG) fs.writeFileSync("debug_error.html", body, "utf8");
      console.error("Body (first 900):", body.slice(0, 900));
    }
    process.exit(1);
  }
})();
