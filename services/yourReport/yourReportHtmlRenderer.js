const path = require("path");
const fs = require("fs");

const ASSETS_DIR = path.join(__dirname, "../../assets/reports");

function assetDataUri(filename, mime) {
  const p = path.join(ASSETS_DIR, filename);
  if (!fs.existsSync(p)) return null;
  const b64 = fs.readFileSync(p).toString("base64");
  return `data:${mime};base64,${b64}`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderVerticalBars(buckets, rtl) {
  const peak = Math.max(60, ...buckets.map((b) => b.value), 1);
  return buckets
    .map((b) => {
      const h = b.value > 0 ? Math.max(4, (b.value / peak) * 120) : 0;
      const val = b.value > 0 ? `${escapeHtml(String(Math.round(b.value)))}m` : "";
      return `<div class="vbar-col">
        <div class="vbar-value">${val}</div>
        <div class="vbar-track"><div class="vbar-fill" style="height:${h}px"></div></div>
        <div class="vbar-label">${escapeHtml(b.label)}</div>
      </div>`;
    })
    .join("");
}

function renderRings(rings) {
  return rings
    .map((r) => {
      const pct = r.percent;
      const circ = 2 * Math.PI * 34;
      const dash = (pct / 100) * circ;
      return `<div class="ring-col">
        <svg class="ring-svg" width="72" height="72" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r="34" fill="none" stroke="#EBEBEB" stroke-width="7"/>
          <circle cx="36" cy="36" r="34" fill="none" stroke="#4CAF50" stroke-width="7"
            stroke-dasharray="${dash} ${circ}" stroke-linecap="round" transform="rotate(-90 36 36)"/>
          <text x="36" y="40" text-anchor="middle" class="ring-pct">${pct}%</text>
        </svg>
        <div class="ring-caption">${escapeHtml(r.label)}</div>
      </div>`;
    })
    .join("");
}

function renderHorizontalBars(buckets, rtl, emptyHint) {
  if (!buckets.length || buckets.every((b) => b.value === 0)) {
    return `<p class="empty-hint">${escapeHtml(emptyHint)}</p>`;
  }
  const peak = Math.max(1, ...buckets.map((b) => b.value));
  return buckets
    .map((b) => {
      const pct = (b.value / peak) * 100;
      const inner = b.value > 0 && pct > 18 ? `<span class="hbar-inner">${b.value}</span>` : "";
      return `<div class="hbar-row">
        <div class="hbar-label">${escapeHtml(b.label)}</div>
        <div class="hbar-track ${rtl ? "rtl" : ""}">
          <div class="hbar-fill" style="width:${pct}%">${inner}</div>
        </div>
      </div>`;
    })
    .join("");
}

function renderStreakWeek(week, labels, rtl) {
  if (!week.length) return "";
  const mascotSvg = `<svg width="22" height="30" viewBox="0 0 22 30" xmlns="http://www.w3.org/2000/svg"><ellipse cx="11" cy="14" rx="9" ry="11" fill="#CFAE62"/><circle cx="8" cy="12" r="1.5" fill="#1B2734"/><circle cx="14" cy="12" r="1.5" fill="#1B2734"/></svg>`;
  const tiles = week
    .map((d) => {
      let cls = "streak-tile upcoming";
      let inner = `<span class="dow">${escapeHtml(d.date.slice(5))}</span>`;
      if (d.isCompleted || d.isFrozen) {
        cls = "streak-tile done";
        inner = `<span class="check">✓</span>`;
      } else if (d.isToday) {
        cls = "streak-tile today";
        inner = mascotSvg;
      }
      return `<div class="${cls}">${inner}</div>`;
    })
    .join("");

  return `<div class="streak-week">${tiles}</div>
    <div class="streak-legend">
      <span><i class="dot gold"></i>${escapeHtml(labels.completed)}</span>
      <span><i class="dot white"></i>${escapeHtml(labels.today)}</span>
      <span><i class="dot gray"></i>${escapeHtml(labels.upcoming)}</span>
    </div>
    <hr class="divider"/>
    <div class="streak-stats">
      <div><div class="stat-val">${week.length ? "" : ""}${""}</div></div>
    </div>`;
}

function renderStreakStats(streak, labels) {
  return `<div class="streak-stats">
    <div class="stat-col"><div class="stat-val">${streak.currentStreak}</div><div class="stat-lbl">${escapeHtml(labels.reportStreakCurrent)}</div></div>
    <div class="stat-col"><div class="stat-val">${streak.longestStreak}</div><div class="stat-lbl">${escapeHtml(labels.reportStreakLongest)}</div></div>
    <div class="stat-col"><div class="stat-val">${streak.freezesRemaining}</div><div class="stat-lbl">${escapeHtml(labels.reportStreakFreezes)}</div></div>
  </div>`;
}

/**
 * @param {ReturnType<import('./yourReportPayloadService').buildYourReportPayload>} payload
 */
function renderYourReportHtml(payload) {
  const rtl = payload.locale === "ar";
  const dir = rtl ? "rtl" : "ltr";
  const labels = payload.labels;
  const logo = assetDataUri("app-logo.png", "image/png");

  const streakWeekHtml =
    payload.period === "weekly" && payload.streak.week.length === 7
      ? `<div class="streak-week">${payload.streak.week
          .map((d) => {
            let cls = "streak-tile upcoming";
            let inner = `<span class="dow-abbr">${escapeHtml(d.date.slice(8, 10))}</span>`;
            if (d.isCompleted || d.isFrozen) {
              cls = "streak-tile done";
              inner = `<span class="check">✓</span>`;
            } else if (d.isToday) {
              cls = "streak-tile today";
              inner = `<svg width="22" height="30" viewBox="0 0 22 30"><ellipse cx="11" cy="14" rx="9" ry="11" fill="#CFAE62"/></svg>`;
            }
            return `<div class="${cls}">${inner}</div>`;
          })
          .join("")}</div>
         <div class="streak-legend">
           <span><i class="dot gold"></i>${escapeHtml(labels.completed)}</span>
           <span><i class="dot white"></i>${escapeHtml(labels.today)}</span>
           <span><i class="dot gray"></i>${escapeHtml(labels.upcoming)}</span>
         </div><hr class="divider"/>`
      : "";

  return `<!DOCTYPE html>
<html lang="${payload.locale}" dir="${dir}">
<head>
  <meta charset="utf-8"/>
  <link href="https://fonts.googleapis.com/css2?family=Pridi:wght@400;600;700&display=swap" rel="stylesheet"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Pridi', Helvetica, Arial, sans-serif; background: #FFFDFA; color: #1B2734; font-size: 14px; }
    .page { max-width: 375px; margin: 0 auto; padding: 12px 16px 24px; }
    .header { background: #1B2734; color: #fff; border-radius: 12px; padding: 14px 16px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; }
    .header img { height: 28px; }
    .header-title { font-size: 18px; font-weight: 700; }
    .period { text-align: center; color: #4E5660; font-size: 14px; margin-top: 8px; }
    .card { background: #fff; border: 1px solid #EBEBEB; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
    .card-title { font-size: 16px; font-weight: 700; text-decoration: underline; margin-bottom: 14px; }
    .subtitle { font-size: 14px; color: #1B2734; margin-bottom: 12px; }
    .vchart { display: flex; gap: 6px; align-items: flex-end; height: 180px; justify-content: space-between; }
    .vbar-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; }
    .vbar-value { font-size: 9px; color: #4E5660; min-height: 14px; }
    .vbar-track { height: 120px; display: flex; align-items: flex-end; width: 100%; justify-content: center; }
    .vbar-fill { width: 80%; max-width: 28px; background: #4E7DBA; border-radius: 4px 4px 0 0; min-height: 0; }
    .vbar-label { font-size: 10px; margin-top: 6px; }
    .rings { display: flex; justify-content: space-around; margin-top: 8px; }
    .ring-col { text-align: center; width: 33%; }
    .ring-pct { font-size: 14px; font-weight: 700; fill: #1B2734; }
    .ring-caption { font-size: 10px; margin-top: 6px; line-height: 1.2; }
    .hbar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .hbar-label { width: 36px; font-size: 11px; flex-shrink: 0; }
    .hbar-track { flex: 1; height: 22px; background: #F9F9F9; border-radius: 4px; overflow: hidden; }
    .hbar-track.rtl { direction: rtl; }
    .hbar-fill { height: 100%; background: #4E7DBA; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 10px; font-weight: 700; min-width: 0; }
    .streak-week { display: flex; justify-content: space-between; gap: 4px; margin-bottom: 12px; }
    .streak-tile { width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 10px; }
    .streak-tile.done { background: #CFAE62; color: #fff; font-size: 18px; }
    .streak-tile.today { background: #fff; border: 2px solid #CFAE62; }
    .streak-tile.upcoming { background: #F9F9F9; color: #4E5660; }
    .streak-legend { display: flex; flex-wrap: wrap; gap: 12px; font-size: 11px; color: #4E5660; margin-bottom: 12px; }
    .dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-${rtl ? "left" : "right"}: 4px; vertical-align: middle; }
    .dot.gold { background: #CFAE62; }
    .dot.white { background: #fff; border: 1px solid #CFAE62; }
    .dot.gray { background: #F9F9F9; border: 1px solid #EBEBEB; }
    .divider { border: none; border-top: 1px solid #EBEBEB; margin: 16px 0; }
    .streak-stats { display: flex; text-align: center; }
    .stat-col { flex: 1; }
    .stat-val { font-size: 20px; font-weight: 700; color: #CFAE62; }
    .stat-lbl { font-size: 12px; color: #4E5660; }
    .empty-hint { color: #4E5660; font-size: 12px; }
    .footer { text-align: center; font-size: 10px; color: #4E5660; margin-top: 16px; }
    [dir="rtl"] .hbar-row { flex-direction: row-reverse; }
    [dir="rtl"] .header { flex-direction: row-reverse; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      ${logo ? `<img src="${logo}" alt="Mishka"/>` : `<span style="font-weight:700">Mishka</span>`}
      <span class="header-title">${escapeHtml(labels.yourReport)}</span>
    </div>
    <div class="period">${escapeHtml(payload.periodLabel)}</div>

    <div class="card">
      <div class="card-title">${escapeHtml(labels.streakTitle)}</div>
      ${streakWeekHtml}
      ${renderStreakStats(payload.streak, labels)}
    </div>

    <div class="card">
      <div class="card-title">${escapeHtml(labels.studyTitle)}</div>
      <div class="subtitle">${escapeHtml(payload.study.subtitle)}</div>
      <div class="vchart">${renderVerticalBars(payload.study.buckets, rtl)}</div>
    </div>

    <div class="card">
      <div class="card-title">${escapeHtml(labels.aiTitle)}</div>
      <div class="rings">${renderRings(payload.aiTools.rings)}</div>
    </div>

    <div class="card">
      <div class="card-title">${escapeHtml(labels.tasksTitle)}</div>
      ${renderHorizontalBars(payload.tasksCompleted.buckets, rtl, labels.reportNoTasksInPeriod)}
    </div>

    <div class="footer">Generated ${escapeHtml(new Date().toISOString().slice(0, 10))} UTC · Mishka</div>
  </div>
</body>
</html>`;
}

module.exports = { renderYourReportHtml, ASSETS_DIR };
