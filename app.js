"use strict";
/* Worker TSA front-end. Contains NO secret: the Supabase anon key is public by design
   and every table is protected by Row Level Security (see supabase-setup.sql).
   Payments, admin actions, reports and account deletion run in Edge Functions. */

const IMG1 = "bg-splash.jpg", IMG2 = "bg-brooklyn.jpg";
const PGC = "page-client.jpg", PGP = "page-provider.jpg";
const PLN = { perM: "monthly", per3: "quarterly", perY: "yearly" };
const PRICE = { monthly: "12.99", quarterly: "29.99", yearly: "99.99" };
const PER = { monthly: "perM", quarterly: "per3", yearly: "perY" };
const sb = supabase.createClient(WTSA.SUPABASE_URL, WTSA.SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

let L = 1, mode = "in", sel = null, city = "", dom = 0, tm = [], plan = { p: "29.99", k: "per3" };
let me = null, prof = null, prov = null, sub = null, isAdm = false, fav = [], pend = [];
let cur = "s2", dk = "t", docBack = "s11", favFrom = "s5", repFrom = "s6", repP = null;
let lockUntil = 0, lockEmail = "";
let busy = false, recov = false, fpMail = "", rz = "", toastT = 0, pm = null, introT = 0, bootReady = Promise.resolve();
try { if (localStorage.getItem("wtsa_lang") === "fr") L = 0; } catch (e) { /* storage unavailable */ }
try { const x = JSON.parse(localStorage.getItem("wtsa_lock") || "null"); if (x && x.until > Date.now()) { lockUntil = x.until; lockEmail = x.email; } } catch (e) { /* ignore */ }

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)], t = k => D[k][L];
const RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const h = (g, c, x) => { const e = document.createElement(g); if (c) e.className = c; if (x) e.textContent = x; return e; };
const dg = v => v.replace(/\D/g, "");
const usd = n => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const addM = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const isProv = () => !!prof && prof.role === "provider";
const subLive = () => !!sub && Date.now() < new Date(sub.ends_at).getTime() + 2592e5;
const trialLive = () => !!prof && !!prof.trial_started_at && Date.now() < new Date(prof.trial_started_at).getTime() + 864e5;
const hasAccess = () => trialLive() || subLive();
const trialAvail = () => isProv() && !prof.trial_started_at && !subLive();
const pub = (b, p) => sb.storage.from(b).getPublicUrl(p).data.publicUrl;
const dur = ms => {
  const s = Math.max(0, Math.floor(ms / 1e3)), p = n => String(n).padStart(2, "0");
  return Math.floor(s / 86400) + "d " + p(Math.floor(s % 86400 / 3600)) + ":" + p(Math.floor(s % 3600 / 60)) + ":" + p(s % 60);
};
const er = (f, k) => { f.querySelector(".err").textContent = k ? t(k) : ""; };
function toast(m) {
  const x = $("#toast"); x.textContent = m; x.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { x.hidden = true; }, 4000);
}
function fail(f, e) {
  const m = String((e && e.message) || "");
  const k = /Invalid login/i.test(m) ? "badLogin" : /fav_limit/.test(m) ? "favMax" : /locked_/.test(m) ? "lockedE" : "netErr";
  if (f) er(f, k); else toast(t(k));
}
async function run(btn, f, form) {
  if (busy) return;
  busy = true; if (btn) btn.disabled = true;
  try { await f(); } catch (e) { console.error(e); fail(form || null, e); }
  finally { busy = false; if (btn) btn.disabled = false; }
}
async function fn(name, body) {
  const r = await sb.functions.invoke(name, { body });
  if (r.error) throw r.error;
  return r.data;
}

// ---------------------------------------------------------------- screens
function tr() {
  document.documentElement.lang = L ? "en" : "fr";
  $$("[data-i]").forEach(e => { e.textContent = t(e.dataset.i); });
  $$("[data-p]").forEach(e => { e.placeholder = t(e.dataset.p); });
  $("#lang").textContent = L ? "FR" : "EN";
  setMode(mode); updF(); fillDom();
  const on = id => $("#" + id).classList.contains("on");
  if (on("s6")) renderP();
  if (on("s8") && prov) prev();
  if (on("s10")) sum();
  if (on("s9")) setPlanMode();
  if (on("s12")) { setS(); lockUI(); tick(); }
  if (on("s14")) doc(dk);
  if (on("s15")) renderF();
  if (on("s17")) { renderA(); if (!$("#ad3").hidden) renderPL(); }
  if (on("s22") && pdData) renderPD();
  if (on("s18")) renderD();
}
function show(id) {
  if (id === "s8" && !(isProv() && (hasAccess() || (prov && prov.status === "rejected")))) id = "s9";
  $$(".sc").forEach(e => e.classList.toggle("on", e.id === id));
  $("#bar").hidden = ["s0", "s1", "s19", "s20"].includes(id);
  if (!["s11", "s12", "s14"].includes(id)) cur = id;
  const inA = ["s4", "s5", "s6", "s7", "s8", "s9", "s10", "s11", "s12", "s15", "s16", "s18"].includes(id);
  $("#abt").hidden = !inA; $("#gear").hidden = !inA || !isProv();
  $("#" + id).scrollTop = 0;
}
function setMode(m) {
  mode = m;
  drawLock();
  $("#tin").classList.toggle("on", m === "in");
  $("#tup").classList.toggle("on", m === "up");
  $("#cw").hidden = m === "in";
  $("#fg").hidden = m !== "in";
  $("#ab").textContent = t(m === "in" ? "login" : "signup");
}
function fp(id) { $$(".fp").forEach(e => e.classList.toggle("on", e.id === id)); }
function pickPlan(b) { plan = { p: b.dataset.pr, k: b.dataset.pk }; $$("[data-pr]").forEach(x => x.classList.toggle("on", x === b)); }
function sum() { $("#ps").textContent = t("sel") + " $" + plan.p + " " + t(plan.k); $("#pay").textContent = t("pay") + " $" + plan.p; }
function doc(k) {
  dk = k; $("#dT").textContent = t({ t: "terms", p: "privT", c: "cookT" }[k]);
  const b = $("#dB"); b.replaceChildren();
  DOC[k][L].forEach(([a, c]) => b.append(h("h3", "", a), h("p", "", c)));
}
function openDoc(k) { docBack = $(".sc.on").id; doc(k); show("s14"); }
function fillDom() {
  const s = $("#pf").job, v = s.value;
  s.replaceChildren(new Option(t("selD"), ""));
  DOM.forEach((d, i) => s.append(new Option(d[L], i)));
  s.value = v;
}
function renderD() {
  $("#dcy").textContent = city;
  const l = $("#dgl"); l.replaceChildren();
  DOM.forEach((d, i) => {
    const b = h("button", "tile"); b.type = "button";
    b.append(h("span", "ic", d[2]), h("span", "tt", d[L]));
    b.onclick = () => { dom = i; renderP(); show("s6"); };
    l.append(b);
  });
}
function updF() { $$(".fvl").forEach(b => { b.textContent = t("fvs") + " (" + fav.length + "/5)"; }); }

// ---------------------------------------------------------------- validation
function vf(f, ord) {
  const v = n => f[n].value.trim();
  const miss = ord.filter(n => f[n].type === "file" ? !f[n].files[0] : !v(n));
  $$("#" + f.id + " .bad").forEach(x => x.classList.remove("bad"));
  let k = "", first = "";
  if (miss.length) { k = "reqm"; first = miss[0]; miss.forEach(n => f[n].closest("label").classList.add("bad")); }
  else if (!RE.test(v("em"))) { k = "bademail"; first = "em"; }
  else if (dg(v("ph")).length !== 10) { k = "badphone"; first = "ph"; }
  else if (dg(v("wa")).length !== 10) { k = "badphone"; first = "wa"; }
  if (k && !miss.length) f[first].closest("label").classList.add("bad");
  er(f, k);
  if (k) f[first].closest("label").scrollIntoView({ block: "center" });
  return !k;
}
const okImg = x => /^image\/(jpeg|png|webp)$/.test(x.type) && x.size <= 5242880;
function adult(d) {
  const b = new Date(d), n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  const m = n.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--;
  return a >= 18;
}
async function up(bucket, file, name) {
  const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[file.type];
  const path = me.id + "/" + name + "-" + Date.now() + "." + ext;
  const { error } = await sb.storage.from(bucket).upload(path, file, { contentType: file.type });
  if (error) throw error;
  return path;
}

// ---------------------------------------------------------------- session and routing
async function loadMe() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { me = prof = prov = sub = null; isAdm = false; fav = []; updF(); return; }
  me = session.user;
  const [p, a] = await Promise.all([
    sb.from("profiles").select("role,privacy_accepted_at,cookies_accepted_at,trial_started_at,trial_plan").eq("id", me.id).single(),
    sb.rpc("is_admin"),
  ]);
  if (p.error) {
    // Profile gone (account deleted by the administrator): drop the stale session.
    if (p.error.code === "PGRST116") { me = prof = prov = sub = null; isAdm = false; fav = []; await sb.auth.signOut(); updF(); return; }
    throw p.error;
  }
  prof = p.data; isAdm = a.data === true; prov = sub = null; fav = [];
  if (prof.role === "provider") {
    const [pr, s] = await Promise.all([
      sb.from("providers").select("*").eq("user_id", me.id).maybeSingle(),
      sb.from("subscriptions").select("*").eq("user_id", me.id).maybeSingle(),
    ]);
    prov = pr.data; sub = s.data;
  } else if (prof.role === "client") {
    const f = await sb.from("favorites").select("provider_id");
    fav = (f.data || []).map(r => r.provider_id);
  }
  updF();
}
async function route() {
  if (!me) { show("s4"); return; }
  if (isAdm) { openAdmin(); return; }
  if (!prof.privacy_accepted_at || !prof.cookies_accepted_at) { show("s13"); return; }
  if (!prof.role) {
    const { error } = await sb.rpc("set_role", { p_role: "provider" });
    if (error) throw error;
    await loadMe();
  }
  if (prof.role === "client") { show("s5"); return; }
  if (monthlyStale(me)) { await logout("monthly"); return; }
  if (prov && prov.status === "rejected") { show("s8"); prev(); return; }
  if (!hasAccess()) {
    $("#pcm").textContent = (prof.trial_started_at || sub) ? t("renewMsg") : "";
    setPlanMode(); show("s9"); return;
  }
  if (!prov) { show("s7"); return; }
  show("s8"); prev();
}
async function banReason(email) {
  try { const d = await fn("check-ban", { email }); return d && d.banned === true ? (d.reason === "password" ? "password" : "reports") : null; } catch (e) { return null; }
}
// ---- wrong-password lock (the server decides; this only shows the countdown and blocks the button)
const typedEmail = () => $("#af input[name=em]").value.trim().toLowerCase();
function lockLeft(email) { return lockUntil > Date.now() && email === lockEmail ? Math.ceil((lockUntil - Date.now()) / 1000) : 0; }
function startLock(email, secs) {
  lockEmail = email; lockUntil = Date.now() + secs * 1000;
  try { localStorage.setItem("wtsa_lock", JSON.stringify({ email, until: lockUntil })); } catch (e) { /* ignore */ }
  drawLock();
}
function clearLock() { lockUntil = 0; lockEmail = ""; try { localStorage.removeItem("wtsa_lock"); } catch (e) { /* ignore */ } drawLock(); }
function drawLock() {
  if (lockUntil && lockUntil <= Date.now()) { lockUntil = 0; lockEmail = ""; try { localStorage.removeItem("wtsa_lock"); } catch (e) { /* ignore */ } }
  const left = mode === "in" ? lockLeft(typedEmail()) : 0;
  $("#lockbox").hidden = !left;
  $("#ab").disabled = !!left;
  $("#af input[name=pw]").disabled = !!left;
  if (left) $("#lockcd").textContent = String(Math.floor(left / 60)).padStart(2, "0") + ":" + String(left % 60).padStart(2, "0");
}
async function loginViaServer(f, email, password) {
  const m = email.toLowerCase();
  if (lockLeft(m) > 0) { drawLock(); return false; }
  const { data, error } = await sb.functions.invoke("login", { body: { email, password } });
  if (error || !data) throw error || new Error("login");
  if (data.ok) {
    const r = await sb.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
    if (r.error) throw r.error;
    clearLock(); return true;
  }
  const e = data.error;
  if (e === "locked") { er(f, ""); startLock(m, data.retry_after || 300); return false; }
  if (e === "invalid") { f.querySelector(".err").textContent = t("badLogin") + (data.attempts_left != null ? " " + t(data.warn ? "attWarn" : "attLeft").replace("{n}", data.attempts_left) : ""); return false; }
  const map = { deleted: "delPw", banned: "banned", unconfirmed: "unconf", too_many: "tooMany", invalid_input: "badLogin" };
  if (map[e]) { er(f, map[e]); return false; }
  throw new Error("login");
}
// ---- monthly sign-out of provider accounts (every anniversary of the account creation date)
function addMonthsClamped(d, n) {
  const m = d.getUTCMonth() + n;
  const x = new Date(Date.UTC(d.getUTCFullYear() + Math.floor(m / 12), m % 12, 1, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds()));
  const last = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)).getUTCDate();
  x.setUTCDate(Math.min(d.getUTCDate(), last));
  return x;
}
function monthlyStale(u, now) {
  now = now || Date.now();
  const c = Date.parse(u && u.created_at), l = Date.parse(u && u.last_sign_in_at);
  if (!isFinite(c) || !isFinite(l)) return false;
  let n = 0;
  while (addMonthsClamped(new Date(c), n + 1).getTime() <= now) n++;
  return n >= 1 && l < addMonthsClamped(new Date(c), n).getTime();
}
// A deleted account must be signed out quickly: the access token alone stays valid for a while.
async function checkSession() {
  if (!me || !isProv() || busy) return;
  const { data, error } = await sb.auth.getUser();
  if (error && (error.status === 401 || error.status === 403 || /sub claim|does not exist|not found/i.test(error.message || ""))) logout("banned");
  else if (!error && !data.user) logout("banned");
  else if (!error && monthlyStale(data.user)) logout("monthly");
}
async function afterAuth() { await loadMe(); await route(); }
function intro(id, next) {
  clearTimeout(introT); show(id);
  const el = $("#" + id);
  const go = () => { clearTimeout(introT); el.onclick = null; Promise.resolve(next()).catch(e => console.error(e)); };
  el.onclick = go; introT = setTimeout(go, 2000);
}
function setPlanMode() {
  const a = trialAvail(), b = $("#pc");
  b.dataset.i = a ? "trialBtn" : "cont"; b.textContent = t(b.dataset.i);
  $("#tnote").hidden = !a;
}
function resetUI() {
  sel = null; city = ""; pend = [];
  $$("form").forEach(f => { f.reset(); const e = f.querySelector(".err"); if (e) e.textContent = ""; });
  $$(".file b").forEach(b => { b.dataset.i = "choose"; });
  $$("[data-r],[data-pr],[data-pm]").forEach(b => b.classList.remove("on"));
  $$(".cf").forEach(x => x.classList.remove("on"));
  $("#rc").disabled = true; pm = null; $("#pay").disabled = true; pickPlan($('[data-pr="29.99"]'));
  $("#pk").checked = false; $("#pk2").checked = false; $("#pc2").disabled = true;
  $("#am").textContent = ""; $("#pcm").textContent = "";
  fp("f1"); mode = "in"; tr();
}
async function logout(msg) {
  me = null; prof = prov = sub = null; isAdm = false; fav = [];
  await sb.auth.signOut();
  resetUI(); show("s2");
  if (msg) er($("#af"), msg);
}
async function waitPaid(tx) {
  $("#pcm").textContent = t("payWait"); show("s9");
  for (let i = 0; i < 8; i++) {
    try { await fn("verify-payment", { tx }); } catch (e) { console.error(e); }
    await loadMe();
    if (subLive()) { $("#pcm").textContent = ""; await route(); return; }
    await sleep(3000);
  }
  $("#pcm").textContent = t("payPend");
}
function start() {
  tm.forEach(clearTimeout);
  resetUI(); show("s0");
  bootReady = loadMe().catch(e => console.error(e));
  // Start pages (2 s + 1 s), then the introduction page, then the app.
  tm = [setTimeout(() => show("s1"), 2000), setTimeout(() => show("s21"), 3000)];
}

// ---------------------------------------------------------------- cards and lists
function mapP(r) {
  return { id: r.id, n: r.name, dm: r.domain, st: r.street, ph: r.phone, wa: r.whatsapp, em: r.email, d: r.description, locked: r.active === false,
           img: r.avatar_path ? pub("avatars", r.avatar_path) : null };
}
function lk(x, u) { const a = h("a", "", x); a.href = u; a.rel = "noopener noreferrer"; if (u.startsWith("http")) a.target = "_blank"; return a; }
function card(p, cl) {
  const c = h("div", p.locked ? "card locked" : "card");
  if (p.locked) {
    // No real data reaches the browser for a locked profile: this is a blurred placeholder.
    const bl = h("div", "blur"), row = h("div", "row"), tx = h("div");
    tx.append(h("strong", "", "Provider Name"), h("span", "sub", "Field of activity"));
    row.append(h("div", "av", "WT"), tx);
    bl.append(row, h("p", "desc", "Description of the services offered by this provider and how to reach them."));
    c.append(bl, h("p", "lt", t("lockedP")));
  } else {
    const r = h("div", "row"), b = h("div");
    let av;
    if (p.img) { av = new Image(); av.src = p.img; av.alt = ""; }
    else av = h("div", "", p.n.split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase());
    av.classList.add("av");
    b.append(h("strong", "", p.n), h("span", "sub", DOM[p.dm][L]));
    if (p.st) b.append(h("span", "sub", p.st));
    r.append(av, b);
    const a = h("div", "acts");
    a.append(lk(t("call"), "tel:+1" + p.ph), lk("WhatsApp", "https://wa.me/1" + p.wa), lk("Email", "mailto:" + p.em));
    c.append(r, h("p", "desc", p.d), a);
  }
  if (cl) {
    const f = h("div", "cft"), k = h("button", "lnk", t(fav.includes(p.id) ? "favOn" : "favAdd"));
    k.type = "button";
    k.onclick = () => run(k, async () => {
      await toggleF(p);
      k.textContent = t(fav.includes(p.id) ? "favOn" : "favAdd");
      if ($("#s15").classList.contains("on")) renderF();
    });
    f.append(k);
    if (!p.locked) { const g = h("button", "lnk", t("repA")); g.type = "button"; g.onclick = () => openRep(p); f.append(g); }
    c.append(f);
  }
  return c;
}
async function renderP() {
  $("#pt").textContent = DOM[dom][L] + ", " + city;
  const l = $("#pl"); l.replaceChildren(h("p", "mute", t("loading")));
  const { data, error } = await sb.from("public_providers").select("*").eq("city", city).eq("domain", dom).order("name");
  l.replaceChildren();
  if (error) { l.append(h("p", "err", t("netErr"))); return; }
  if (!data.length) { l.append(h("p", "mute", t("none3"))); return; }
  data.map(mapP).forEach(p => l.append(card(p, 1)));
}
async function renderF() {
  const l = $("#fl"); l.replaceChildren();
  if (!fav.length) { l.append(h("p", "mute", t("favE"))); return; }
  const { data } = await sb.from("public_providers").select("*").in("id", fav);
  l.replaceChildren();
  if (!data || !data.length) { l.append(h("p", "mute", t("favE"))); return; }
  data.map(mapP).forEach(p => l.append(card(p, 1)));
}
async function toggleF(p) {
  $("#fm").textContent = "";
  if (fav.includes(p.id)) {
    const { error } = await sb.from("favorites").delete().eq("provider_id", p.id);
    if (error) throw error;
    fav = fav.filter(x => x !== p.id);
  } else {
    if (fav.length >= 5) { $("#fm").textContent = t("favMax"); return; }
    const { error } = await sb.from("favorites").insert({ user_id: me.id, provider_id: p.id });
    if (error) { if (/fav_limit/.test(error.message)) { $("#fm").textContent = t("favMax"); return; } throw error; }
    fav.push(p.id);
  }
  updF();
}
function openRep(p) {
  repP = p; repFrom = $(".sc.on").id;
  $("#rpn").textContent = p.n;
  const f = $("#rf"); f.reset(); er(f, ""); f.hidden = false; $("#rok").hidden = true;
  show("s16");
}
function prev() {
  $("#pst strong").textContent = t(prov.status === "approved" ? "stOk" : prov.status === "rejected" ? "stRej" : "stPend");
  $("#pv").replaceChildren(card({
    n: prov.first_name + " " + prov.last_name, dm: prov.domain, st: prov.street, ph: prov.phone, wa: prov.whatsapp,
    em: prov.contact_email, d: prov.description, img: pub("avatars", prov.avatar_path),
  }));
}

// ---------------------------------------------------------------- settings
function setS() {
  const pv = isProv() && !!prov;
  $("#se").textContent = me ? (me.email || "") : "";
  $("#sp").hidden = !(me && me.app_metadata && me.app_metadata.provider === "email");
  $("#pset").hidden = !pv; $("#dw2").hidden = !pv;
}
function lockUI() {
  if (!prov) return;
  const f = $("#ef"), n = Date.now(), m = [];
  [["photo", "last_photo_edit"], ["ph", "last_phone_edit"], ["wa", "last_whatsapp_edit"]].forEach(([k, c]) => {
    const e = prov[c], nx = e ? addM(e, 1) : null, lk2 = !!nx && n < nx.getTime();
    f[k].disabled = lk2;
    if (lk2) m.push(t(k) + " (" + t("next") + " " + nx.toLocaleDateString(L ? "en-US" : "fr-FR") + ")");
  });
  $("#lk").textContent = m.join("\n");
}
function fillP() {
  if (!(isProv() && prov)) return;
  const f = $("#ef");
  f.ph.value = prov.phone; f.wa.value = prov.whatsapp; f.photo.value = "";
  const b = f.photo.nextElementSibling; b.dataset.i = "choose"; b.textContent = t("choose");
  $("#ro").textContent = [prov.first_name + " " + prov.last_name, prov.contact_email, DOM[prov.domain][L], prov.city, prov.street, prov.description].filter(Boolean).join("\n");
  f.querySelector(".ok").textContent = ""; er(f, ""); lockUI();
  tick();
}
function tick() {
  if (!isProv() || !prof) return;
  if (me && monthlyStale(me)) { logout("monthly"); return; }
  const n = Date.now(), on = id => $("#" + id).classList.contains("on");
  const te = prof.trial_started_at ? new Date(prof.trial_started_at).getTime() + 864e5 : 0;
  const se = sub ? new Date(sub.ends_at).getTime() : 0, sg = se + 2592e5;
  if (sub && n < se) {
    $("#sn").textContent = "$" + PRICE[sub.plan] + " " + t(PER[sub.plan]);
    $("#cd").textContent = t("cdl") + " " + dur(se - n);
  } else if (sub && n < sg) {
    $("#sn").textContent = "$" + PRICE[sub.plan] + " " + t(PER[sub.plan]);
    $("#cd").textContent = t("grace") + " " + dur(sg - n);
  } else if (te && n < te) {
    $("#sn").textContent = t("trialT");
    $("#cd").textContent = t("cdl") + " " + dur(te - n);
  } else if (sub || te) {
    // Free trial or subscription over: locked and signed out (unless renewing right now).
    if (!on("s9") && !on("s10")) logout("expired");
  } else {
    $("#sn").textContent = t("none"); $("#cd").textContent = "";
  }
}

// ---------------------------------------------------------------- admin console
async function openAdmin() { show("s17"); $("#at1").click(); }
async function loadStats() {
  const d = await fn("admin", { action: "stats" });
  $("#a1").textContent = d.providers;
  $("#a3").textContent = usd(+d.month); $("#a4").textContent = usd(+d.total);
}
let apl = [], pdId = "", pdData = null;
async function loadPL() { const d = await fn("admin", { action: "providers" }); apl = d.items; renderPL(); }
function renderPL() {
  const q = $("#aps").value.trim().toLowerCase(), l = $("#apl"); l.replaceChildren();
  const rows = apl.filter(p => !q || (p.name + " " + p.email + " " + p.city).toLowerCase().includes(q));
  if (!rows.length) { l.append(h("p", "mute", t("noProv"))); return; }
  rows.forEach(p => {
    const b = h("button", "rowb"); b.type = "button";
    b.append(h("strong", "", p.name), h("span", "sub", DOM[p.domain][L] + " | " + p.city + " | " + t("st_" + p.status) + (p.reports ? " | " + t("repsT") + ": " + p.reports : "")));
    b.onclick = () => run(null, async () => { await openProv(p.id); });
    l.append(b);
  });
}
async function openProv(id) { pdId = id; pdData = await fn("admin", { action: "provider", id }); $("#pdDc").classList.remove("on"); renderPD(); show("s22"); }
function renderPD() {
  const d = pdData, p = d.provider, n = Date.now();
  $("#pdT").textContent = p.first_name + " " + p.last_name;
  $("#pdS").textContent = t("st_" + p.status);
  const te = d.trial_started_at ? new Date(d.trial_started_at).getTime() + 864e5 : 0, sb2 = d.subscription;
  const se = sb2 ? new Date(sb2.ends_at).getTime() : 0, sg = se + 2592e5;
  let a = t("none"), c = "";
  if (sb2 && n < se) { a = "$" + PRICE[sb2.plan] + " " + t(PER[sb2.plan]); c = t("cdl") + " " + dur(se - n); }
  else if (sb2 && n < sg) { a = "$" + PRICE[sb2.plan] + " " + t(PER[sb2.plan]); c = t("grace") + " " + dur(sg - n); }
  else if (te && n < te) { a = t("trialT"); c = t("cdl") + " " + dur(te - n); }
  else if (sb2 || te) { a = t("locked2"); }
  $("#pdSub").textContent = a; $("#pdCd").textContent = c;
  $("#pdInfo").textContent = [
    t("email") + ": " + (d.account_email || "-"), t("ph") + ": " + p.phone, t("wa") + ": " + p.whatsapp,
    t("job") + ": " + DOM[p.domain][L], t("city") + ": " + p.city + (p.street ? ", " + p.street : ""),
    t("dob") + ": " + p.birth_date, p.description,
  ].join("\n");
  const dc = $("#pdDocs"); dc.replaceChildren();
  [d.avatar].forEach(u => { if (u) { const i = new Image(); i.src = u; i.alt = ""; dc.append(i); } });
  const rp = $("#pdReps"); rp.replaceChildren();
  if (!d.reports.length) rp.append(h("p", "mute", t("noRep")));
  d.reports.forEach(r => {
    const c2 = h("div", "card");
    c2.append(h("strong", "", t("r" + r.reason)), h("span", "sub", new Date(r.created_at).toLocaleDateString(L ? "en-US" : "fr-FR")));
    if (r.details) c2.append(h("p", "", r.details));
    rp.append(c2);
  });
}
async function loadPend() { const d = await fn("admin", { action: "pending" }); pend = d.items; renderA(); }
function renderA() {
  const l = $("#al"); l.replaceChildren();
  if (!pend.length) { l.append(h("p", "mute", t("none2"))); return; }
  pend.forEach(p => {
    const c = h("div", "card");
    c.append(h("strong", "", p.first_name + " " + p.last_name), h("span", "sub", DOM[p.domain][L] + " | " + p.city),
             h("span", "sub", p.email + " | " + p.phone + " | WhatsApp " + p.whatsapp), h("span", "sub", t("dobL") + " " + p.birth_date));
    if (p.street) c.append(h("span", "sub", p.street));
    const d = h("div", "docs");
    [p.avatar].forEach(u => { if (u) { const i = new Image(); i.src = u; i.alt = ""; d.append(i); } });
    const a = h("div", "acts"), ok = h("button", "btn", t("ap")), no = h("button", "btn dng", t("rj"));
    ok.type = no.type = "button";
    const act = (x, btn) => run(btn, async () => { await fn("admin", { action: x, id: p.id }); await loadPend(); await loadStats(); });
    ok.onclick = () => act("approve", ok); no.onclick = () => act("reject", no);
    a.append(ok, no); c.append(d, h("p", "desc", p.description), a); l.append(c);
  });
}

// ---------------------------------------------------------------- events
$$("[data-logo]").forEach(i => { i.alt = ""; });
$("#s0").style.backgroundImage = "url(" + IMG1 + ")";
$("#s1").style.backgroundImage = "url(" + IMG2 + ")";
$("#s19").style.backgroundImage = "url(" + PGC + ")";
$("#s20").style.backgroundImage = "url(" + PGP + ")";
const ii = $("#introimg");
ii.onload = () => { ii.hidden = false; $("#introtxt").hidden = true; };   // photo found: show it, hide the text version
ii.src = "intro.jpg";
$("#ic").onclick = () => run($("#ic"), async () => {
  await bootReady;
  const q = new URLSearchParams(location.search).get("paid");
  if (q) { history.replaceState(null, "", location.pathname); if (me && /^WTSA-/.test(q)) { await waitPaid(q); return; } }
  await route();
});
const cl = $("#cl");
C.forEach(c => { const li = h("li"), b = h("button", "city", c); b.type = "button"; b.onclick = () => { city = c; renderD(); show("s18"); }; li.append(b); cl.append(li); });
C.forEach(c => $("#pf").city.append(new Option(c, c)));
$("#cs").oninput = e => { const q = e.target.value.trim().toLowerCase(); $$(".city").forEach(b => { b.parentElement.hidden = !b.textContent.toLowerCase().includes(q); }); };
$$("[data-go]").forEach(b => { b.onclick = () => show(b.dataset.go); });
$$("[data-doc]").forEach(b => { b.onclick = () => openDoc(b.dataset.doc); });
$$(".fvl").forEach(b => { b.onclick = () => { favFrom = $(".sc.on").id; renderF(); show("s15"); }; });
$("#lang").onclick = () => { L = L ? 0 : 1; try { localStorage.setItem("wtsa_lang", L ? "en" : "fr"); } catch (e) { /* ignore */ } tr(); };
$("#tin").onclick = () => setMode("in");
$("#tup").onclick = () => setMode("up");
$("#fg").onclick = () => { fp("f1"); show("s3"); };
$("#tl").onclick = () => { setMode("in"); show("s2"); };

$("#af").onsubmit = e => {
  e.preventDefault();
  const f = e.target, m = f.em.value.trim(), p = f.pw.value;
  const k = !m || !p ? "req" : !RE.test(m) ? "bademail" : p.length < 8 ? "shortpw" : mode === "up" && p !== f.pc.value ? "nomatch" : "";
  er(f, k); $("#am").textContent = ""; if (k) return;
  run($("#ab"), async () => {
    if (mode === "up") {
      const { data, error } = await sb.auth.signUp({ email: m, password: p, options: { emailRedirectTo: location.origin } });
      if (error) { const rs = await banReason(m); if (rs) { er(f, rs === "password" ? "delPw" : "banned"); return; } throw error; }
      if (!data.session) { $("#am").textContent = t("checkMail"); return; }
    } else {
      if (!(await loginViaServer(f, m, p))) return;
    }
    await afterAuth();
  }, f);
};
$$("[data-social]").forEach(b => {
  b.onclick = () => run(b, async () => {
    const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin } });
    if (error) throw error;
  }, $("#af"));
});

// Password reset with a 6-digit code sent by email (see README for the email template).
$("#f1").onsubmit = e => {
  e.preventDefault();
  const f = e.target, m = f.em.value.trim(), k = !m ? "req" : !RE.test(m) ? "bademail" : "";
  er(f, k); if (k) return;
  run(f.querySelector(".btn"), async () => { await sb.auth.resetPasswordForEmail(m); fpMail = m; fp("f2"); }, f);
};
$("#f2").onsubmit = e => {
  e.preventDefault();
  const f = e.target, k = /^\d{6}$/.test(f.cd.value) ? "" : "badcode";
  er(f, k); if (k) return;
  run(f.querySelector(".btn"), async () => {
    recov = true;
    const { error } = await sb.auth.verifyOtp({ email: fpMail, token: f.cd.value, type: "recovery" });
    if (error) { recov = false; er(f, "badcode2"); return; }
    fp("f3");
  }, f);
};
$("#f3").onsubmit = e => {
  e.preventDefault();
  const f = e.target, p = f.pw.value, k = !p ? "req" : p.length < 8 ? "shortpw" : p !== f.pc.value ? "nomatch" : "";
  er(f, k); if (k) return;
  run(f.querySelector(".btn"), async () => {
    const { error } = await sb.auth.updateUser({ password: p });
    if (error) throw error;
    me = null; await sb.auth.signOut(); recov = false; fp("f4");
  }, f);
};
sb.auth.onAuthStateChange(ev => { if (ev === "SIGNED_OUT" && me && !recov) logout(); });

$("#rp").onclick = () => openDoc("p");
$("#rck").onclick = () => openDoc("c");
const legalOk = () => $("#pk").checked && $("#pk2").checked;   // privacy policy AND cookie policy
$("#pk").onchange = $("#pk2").onchange = () => { $("#pc2").disabled = !legalOk(); };
$("#pc2").onclick = () => run($("#pc2"), async () => {
  if (!legalOk()) return;
  const { error } = await sb.rpc("accept_privacy"); if (error) throw error;
  await afterAuth();
});
$$("[data-r]").forEach(b => { b.onclick = () => { sel = b.dataset.r; $$("[data-r]").forEach(x => x.classList.toggle("on", x === b)); $("#rc").disabled = false; }; });
$("#rc").onclick = () => run($("#rc"), async () => {
  if (!sel) return;
  if (sel === "client") {
    // Clients need no account: an anonymous session is created behind the scenes.
    if (!me) { const { error } = await sb.auth.signInAnonymously(); if (error) throw error; }
    await loadMe();
    intro("s19", () => route());
  } else {
    if (me && me.is_anonymous) { me = null; await sb.auth.signOut(); await loadMe(); }
    intro("s20", () => (me ? route() : show("s2")));
  }
});
$$(".file input").forEach(i => {
  i.onchange = () => { const b = i.nextElementSibling; delete b.dataset.i; b.textContent = i.files[0] ? i.files[0].name : t("choose"); if (!i.files[0]) b.dataset.i = "choose"; };
});
["pf", "ef"].forEach(id => ["input", "change"].forEach(ev => $("#" + id).addEventListener(ev, e => { const l = e.target.closest("label"); if (l) l.classList.remove("bad"); })));

$("#pf").onsubmit = e => {
  e.preventDefault();
  const f = e.target, v = n => f[n].value.trim();
  if (!vf(f, ["photo", "fn", "ln", "dob", "em", "ph", "wa", "job", "city", "d"])) return;
  if (!adult(v("dob"))) { er(f, "minor"); f.dob.closest("label").classList.add("bad"); return; }
  for (const n of ["photo"]) {
    if (!okImg(f[n].files[0])) { er(f, "badfile"); f[n].closest("label").classList.add("bad"); return; }
  }
  run(f.querySelector(".btn"), async () => {
    const avatar = await up("avatars", f.photo.files[0], "avatar");
    const { error } = await sb.from("providers").insert({
      user_id: me.id, first_name: v("fn"), last_name: v("ln"), birth_date: v("dob"), domain: +v("job"), city: v("city"),
      street: v("st") || null, phone: dg(v("ph")), whatsapp: dg(v("wa")), contact_email: v("em"), description: v("d"),
      avatar_path: avatar,
    });
    if (error) throw error;
    await loadMe(); await route();
  }, f);
};
$$("[data-pr]").forEach(b => { b.onclick = () => pickPlan(b); });
$("#pc").onclick = () => {
  if (trialAvail()) {
    // First time: choosing the plan starts the free 24 hours (no payment yet).
    run($("#pc"), async () => {
      const { error } = await sb.rpc("start_trial", { p_plan: PLN[plan.k] });
      if (error) throw error;
      await loadMe(); await route();
    });
  } else { sum(); show("s10"); }
};
$("#sn2").onclick = () => { setPlanMode(); show("s9"); };
$$("[data-pm]").forEach(b => { b.onclick = () => { pm = b.dataset.pm; $$("[data-pm]").forEach(x => x.classList.toggle("on", x === b)); $("#pay").disabled = false; }; });
$("#pay").onclick = () => run($("#pay"), async () => {
  if (!pm) return;
  const d = await fn("create-checkout", { plan: PLN[plan.k], locale: L ? "en" : "fr", brand: pm });
  const u = new URL(d.checkout_url);
  if (u.protocol !== "https:" || !(u.hostname === "kprimepay.com" || u.hostname.endsWith(".kprimepay.com"))) throw new Error("checkout");
  location.href = u.href;
});

$("#abt").onclick = () => show("s11");
$("#gear").onclick = () => { setS(); fillP(); $("#dc").classList.remove("on"); show("s12"); };
$("#bk").onclick = $("#bk2").onclick = () => show(cur);
$("#bk3").onclick = () => show(docBack);
$("#bk4").onclick = () => show(favFrom);
$("#bk5").onclick = $("#rb").onclick = () => show(repFrom);
$("#del1").onclick = () => $("#dc").classList.add("on");
$("#del3").onclick = () => $("#dc").classList.remove("on");
$("#del2").onclick = () => run($("#del2"), async () => { await fn("delete-account", {}); await logout(); });
$("#ef").onsubmit = e => {
  e.preventDefault();
  const f = e.target, v = n => f[n].value.trim(), ok = f.querySelector(".ok");
  const ph = dg(v("ph")), wa = dg(v("wa")), file = f.photo.files[0];
  ok.textContent = ""; $$("#ef .bad").forEach(x => x.classList.remove("bad"));
  const chPh = !f.ph.disabled && ph !== prov.phone, chWa = !f.wa.disabled && wa !== prov.whatsapp, chPhoto = !f.photo.disabled && !!file;
  let k = "", first = "";
  if (chPh && ph.length !== 10) { k = "badphone"; first = "ph"; }
  else if (chWa && wa.length !== 10) { k = "badphone"; first = "wa"; }
  else if (chPhoto && !okImg(file)) { k = "badfile"; first = "photo"; }
  else if (!chPh && !chWa && !chPhoto) k = "nochg";
  er(f, k);
  if (k) { if (first) f[first].closest("label").classList.add("bad"); return; }
  run(f.querySelector(".btn"), async () => {
    const av = chPhoto ? await up("avatars", file, "avatar") : null;
    const { error } = await sb.rpc("update_provider_contact", { p_phone: chPh ? ph : null, p_whatsapp: chWa ? wa : null, p_avatar: av });
    if (error) throw error;
    await loadMe(); fillP(); ok.textContent = t("saved");
  }, f);
};
$("#rf").onsubmit = e => {
  e.preventDefault();
  const f = e.target;
  if (!f.r.value) { er(f, "req"); return; }
  er(f, "");
  run(f.querySelector(".btn"), async () => {
    await fn("report", { provider_id: repP.id, reason: +f.r.value, details: f.x.value.trim() });
    f.hidden = true; $("#rok").hidden = false;
  }, f);
};
$("#ax").onclick = () => logout();
function adTab(n) { [1, 2, 3].forEach(i => { $("#at" + i).classList.toggle("on", i === n); $("#ad" + i).hidden = i !== n; }); }
$("#at1").onclick = () => run(null, async () => { adTab(1); await loadStats(); });
$("#at2").onclick = () => run(null, async () => { adTab(2); await loadPend(); });
$("#at3").onclick = () => run(null, async () => { adTab(3); await loadPL(); });
$("#aps").oninput = () => renderPL();
$("#bk6").onclick = () => show("s17");
$("#pdDel1").onclick = () => $("#pdDc").classList.add("on");
$("#pdDel3").onclick = () => $("#pdDc").classList.remove("on");
$("#pdDel2").onclick = () => run($("#pdDel2"), async () => {
  await fn("admin", { action: "delete-provider", id: pdId });
  $("#pdDc").classList.remove("on"); toast(t("deletedP"));
  adTab(3); show("s17"); await loadPL();
});
$("#rz1").onclick = () => { rz = "month"; $("#rzc").classList.add("on"); };
$("#rz2").onclick = () => { rz = "year"; $("#rzc").classList.add("on"); };
$("#rz3").onclick = () => run($("#rz3"), async () => { await fn("admin", { action: "reset", scope: rz }); $("#rzc").classList.remove("on"); await loadStats(); });
$("#rz4").onclick = () => $("#rzc").classList.remove("on");
window.addEventListener("focus", () => {
  checkSession();
  if (me && isProv() && $("#s8").classList.contains("on")) loadMe().then(() => { if (prov) prev(); }).catch(() => {});
});
setInterval(tick, 1000);
setInterval(drawLock, 1000);
$("#af input[name=em]").addEventListener("input", drawLock);
setInterval(checkSession, 60000);
start();
