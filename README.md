# ATX Home Rescue — Production Static Site

Flat-priced handyman & home-care for Northwest Austin. Two-page static site built from Claude Design handoff.

## Pages

| File | Purpose |
|---|---|
| `index.html` | Marketing homepage — hero chat demo, packages, how-it-works, gallery, reviews, FAQ, big CTA |
| `booking.html` | Chat-driven booking flow — 5-step: describe → photos → quote → schedule → confirm |
| `404.html` | Branded 404 page |

## Preview locally

```bash
# Python (any modern machine has this)
cd atxhomerescue-com-prod
python -m http.server 8080
# then open http://localhost:8080
```

Or use the **Live Server** extension in VS Code — right-click `index.html` → Open with Live Server.

> **Do not open HTML files directly as `file://` paths.** The Google Fonts import and relative asset paths require a local server.

## Deploy

Drop the entire `atxhomerescue-com-prod/` folder onto any static host:

| Host | How |
|---|---|
| **Netlify** | Drag-and-drop the folder at netlify.com/drop |
| **Cloudflare Pages** | Connect repo or upload folder in dashboard |
| **Vercel** | `vercel --prod` from inside the folder |
| **GitHub Pages** | Push to a repo, enable Pages from the repo settings |
| **S3 + CloudFront** | Upload folder contents to bucket, enable static hosting |

No build step, no npm, no config needed.

---

## Still to do before launch

- Swap the 15 `[ your photo here ]` placeholders in `index.html` for real before/after shots
- Optional: add a real Privacy and Terms page (footer links currently go to `#`)
- Optional: add analytics (GoatCounter or Cloudflare Web Analytics recommended)

Business contacts (phone (737) 378-9595, email sales@atxhomerescue.com) and service ZIPs (78726, 78727, 78729, 78730, 78731, 78750, 78759) are confirmed live.

---

## What's in v1 (mock UI only)

- ✅ Homepage with embedded Ranger chat demo (keyword-matched fake responses)
- ✅ Full 5-step booking flow (mock data, no real payment)
- ✅ EN/ES language toggle on both pages
- ✅ ZIP coverage checker
- ✅ Responsive at 960px and 640px
- ✅ Shared CSS tokens + external stylesheets (no inline styles bloat)

## What's NOT in v1 (planned for v2+)

- ❌ Real Ranger AI (Claude API) — swap `scripts/booking.js` flow for a real API call
- ❌ Real Jobber scheduling widget — embed Jobber's Online Booking widget at the schedule step
- ❌ Real Stripe/Jobber Payments — wire up at the payment step
- ❌ Twilio SMS confirmations
- ❌ Supabase home profiles & loyalty tracker
- ❌ `/services`, `/services/:slug`, `/reviews`, `/account/*`, `/contact`, legal pages — wireframes exist in the design bundle (`src/*.jsx`)
- ❌ Real before/after photos in gallery — replace `[ your photo here ]` placeholders

## File structure

```
atxhomerescue-com-prod/
├── index.html
├── booking.html
├── 404.html
├── robots.txt
├── README.md
├── assets/
│   └── logo.png
├── styles/
│   ├── tokens.css      ← CSS custom properties + Google Fonts import
│   ├── base.css        ← Reset, typography utilities, shared buttons/chat
│   ├── layout.css      ← Header, footer, responsive (shared)
│   ├── homepage.css    ← Homepage-specific
│   └── booking.css     ← Booking flow-specific
└── scripts/
    ├── i18n.js         ← Merged EN/ES dictionary + t() helper
    ├── homepage.js     ← Chat demo, ZIP checker, lang toggle, smooth scroll
    └── booking.js      ← 5-step booking state machine + lang toggle
```

## Design source

Original Claude Design files are in the sibling folder:
`../atxhomerescue-com/project/`

- `ATX Home Rescue - Hifi Homepage.html` — homepage reference
- `ATX Home Rescue - Booking Flow.html` — booking flow reference
- `src/*.jsx` — strategy, wireframes, IA, portal, services catalog (v2 roadmap)
