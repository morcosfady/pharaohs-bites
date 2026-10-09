# Pharaoh's Bites: full project handoff

**Written:** 2026-09-29 (end of a long working session).
**Purpose:** everything a fresh chat (or a new person) needs to keep working on the business's website, dashboard and backend without re-discovering anything. Read sections 1 to 3 first; use the rest as reference and runbooks.

> Older docs are partly stale. `docs/SESSION-LOG.md` (dashboard repo) and `README.md` / `PROJECT-LOG.md` (website repo) describe earlier stages (for example they mention a reservations page and 46 dishes that no longer exist). **This file is the current source of truth.** Where it disagrees with those, trust this one.

---

## 1. The 60-second picture

Pharaoh's Bites is a small, family-run Egyptian **cloud kitchen in Dallas, TX** (delivery/pickup only, no dining room). Signature product: **Feteer Meshaltet**. Every "meat" dish uses **plant-based meat** (the feteer itself contains milk, eggs and ghee, so **never say the whole menu is "plant-based" or "vegan"**, see section 9).

Three systems make up the business's software:

| System | What it is | Where it lives |
|---|---|---|
| **Customer website** | Static HTML/CSS/JS, no build step | GitHub repo `morcosfady/pharaohs-bites`, served at **https://pharaohsbites.com** |
| **Finance dashboard** (owner only, login) | React + Vite + TypeScript app | GitHub repo `morcosfady/pharaohs-bites-finance`, served at **https://finance.pharaohsbites.com** |
| **Backend** | Supabase (Postgres + Auth + Edge Functions) | Supabase project ref `vvwunhcpxofvnjijemdb` (name "pharaohs-bites", region us-east-1) |

Plus two small helpers: a **Google Apps Script email relay** (contact/catering forms → owner's inbox) and **Cloudflare DNS** for the domain.

Customers order on the website. The order is (1) saved to Supabase through the `create-order` Edge Function and (2) sent to the business **WhatsApp** as a pre-written message. The owner manages orders, costs and profit in the dashboard.

---

## 2. Quick facts and where things are

### Repos and local folders
| | Repo | Local folder | Branch | Deploys via |
|---|---|---|---|---|
| Website | https://github.com/morcosfady/pharaohs-bites | `F:\Portfolio\Nile Bites` (folder name is historical; nothing depends on it) | `main` | GitHub Pages "legacy" build from `main` root (no workflow) |
| Dashboard | https://github.com/morcosfady/pharaohs-bites-finance | `F:\Portfolio\pharaohs-bites-finance` | `main` | GitHub Actions workflow `.github/workflows/deploy.yml` (typecheck, tests, build, deploy) |

Both repos are **public**. **Never commit secrets** (Supabase service-role key, Plaid keys, etc.). The Supabase *anon* key and the email-relay key in `config.js` are designed to be public-facing.

**Every push to `main` goes live** in roughly a minute. There is no staging.

### Business details
- Business WhatsApp (also the ordering number): **+1 (787) 968-4078** (`17879684078`). It is **WhatsApp-only**, so there is deliberately no "Call" button anywhere.
- Business email: **pharaohsbites.dallas@gmail.com**.
- Hours: **24/7** (owner's decision; shown on Contact and Catering pages and in schema.org data).
- Service area: **all over the DFW area** (owner removed the list of neighborhoods/cities; do not reintroduce Uptown/Plano/Frisco etc. in delivery copy).
- Currency: USD. Minimum order in config: **$20** (advisory, the site only warns).
- Instagram/Facebook URLs in `config.js` are empty.

### Accounts (no passwords or keys here, only what exists where)
- **GitHub:** `morcosfady` (authenticated in the `gh` CLI on the owner's PC).
- **Supabase:** project above. The `supabase` CLI is installed, logged in and **linked** on the owner's PC, so `supabase functions deploy` and `supabase db query --linked` work from the dashboard repo folder.
- **Cloudflare:** owns the domain `pharaohsbites.com` (registered there) and its DNS.
- **Google:** the business account **pharaohs bites** (`pharaohsbites.dallas@gmail.com`) owns the Apps Script relay project "Untitled project" (rename it "Website enquiries" if desired). The owner's Chrome is signed in to several Google accounts; the business one is `authuser=pharaohsbites.dallas@gmail.com` (it appeared as `/u/5/` in URLs).
- **Dashboard login:** the owner has an Auth user in Supabase and a row in `admin_profiles`. If sign-in ever fails with "not an approved administrator", that row is missing.

### Versions used for cache-busting (as of this handoff)
The website appends `?v=NN` to its CSS/JS in **every HTML file**: `pages.css?v=115`, `main.js` / `config.js` / `data.js` at `?v=88`. See section 12 for how to bump them (skipping this is the #1 cause of "I don't see my change").

---

## 3. Working rules and user preferences (important)

- **The owner wants SHORT replies.** Their last message before this handoff was "can't read all of that, be short with me." Lead with what changed and what they must do; keep it to a few lines; put detail elsewhere (like this file).
- The owner mixes English with Egyptian Arabic in Latin letters (Franglais, e.g. "bel nesba lel feter", "5alas", "3awz"). "5ales/5alas" = "enough/that's it". Types fast with typos; interpret intent.
- The owner sends **new instructions mid-task**. Treat each as an addition unless it clearly replaces the current work; finish what you can and report all of it.
- **Always verify visually** on a phone-sized viewport (320, 375, 390 px) and desktop before saying something is done. Most bugs found this session were layout bugs invisible in code.
- The owner is non-technical: do steps yourself where possible (git, deploy, Supabase CLI, browser automation). When a step needs them (OAuth consent, clearing browser cache, sending a real WhatsApp), give **3 to 4 numbered clicks**, not theory.
- **Ask before** deleting things, changing money/prices, or anything that reaches customers in a new way. Do not create test orders in production; stub `fetch`/`window.open` in browser tests.
- Environment quirks: Windows 11, git-bash + PowerShell. **Long multi-line bash heredocs with quotes sometimes fail silently**; write scripts to files (a scratchpad folder) and run them. `pkill` does not exist in the bash tool; stop local servers with PowerShell `Stop-Process`. Line endings in the website repo are CRLF; Python edits should use `open(..., newline='')`.
- Browser tools: the in-app browser pane (its own profile, logged in to Supabase/Cloudflare during this session) and the Chrome extension (the owner's real Chrome). The permission layer **blocked DNS edits and some "send" actions** when attempted by tool; the owner did DNS by uploading a zone file themselves. Expect prompts for external-system writes.

---

## 4. Architecture in detail

### 4.1 Customer website (repo `pharaohs-bites`)

Static site, no build. Pages: `index.html` (home), `order.html` (menu + ordering), `about.html`, `catering.html`, `contact.html`, `menu.html` (**now only a redirect stub to `order.html`**; the Menu and Order Online nav items both go to `order.html` by owner request).

```
assets/css/main.css        base styles, header/nav, footer, forms, buttons
assets/css/pages.css       page-specific + everything added in this session (append-only in practice)
assets/css/pharaonic.css   Egyptian ornament styles
assets/js/config.js        business settings, endpoints, keys (see 4.5)
assets/js/data.js          the MENU, CATEGORIES, GALLERY, REVIEWS data
assets/js/main.js          all behavior (menu render, basket, checkout, validation, forms)
assets/img/menu-real/      the owner's real dish photos (use these!)
assets/img/brand/          logos and icons
assets/img/catering-hero.jpg  catering banner (Pexels photo, free licence)
```

**Menu data** (`data.js`): each dish is `{ id, cat, name, ar, price, desc, tags, img, ... }`. Optional flags: `special` (old pharaoh-marker beside the name, now shown as a gold ankh), `featured` (appears in the home page grid), `hero` (the spotlight card, currently only `feteer-meshaltet`), `signature` (gold "The House Signature" badge), `suggest` (opens an add-on prompt, e.g. sides for feteer). `id` must equal the `slug` in Supabase `products` (the order function looks products up by slug and re-prices from the database).

Current menu (23 dishes; prices are USD):

| Category | id | Price | Flags |
|---|---|---|---|
| The Main Table | `feteer-meshaltet` | 25 | **hero**, special |
| | `feteer-beef` (Feteer with Plant-Based Beef & Mozzarella) | 40 | signature, featured |
| | `macarona-bechamel` | 30 | signature, featured |
| | `goulash-beef` | 35 | signature |
| | `kofta-tray` (with salsa & rice) | 40 | |
| | `meatballs-spaghetti` | 30 | |
| Soups | `lentil-soup` | 8 | |
| Sweet | `om-ali` | 25 | signature, featured |
| | `goulash-nuts` | 25 | signature, featured |
| | `round-cake` | 8 | |
| | `chocolate-pudding` / `banana-pudding` / `creme-caramel` | 5 each | |
| | `rice-pudding` | 5.50 | signature |
| On the Side | `white-cheese` | 4 | featured |
| | `black-honey` | 3.50 | |
| | `white-honey` / `baba-ganoush` | 4 each | |
| | `tahini` / `hummus` | 3 each | |
| Drinks | `protein-shake` (Special Chocolate Protein Shake, 22g) | 12 | featured |
| | `avocado-drink` | 8 | |
| | `diet-coke` (Diet Coke 12 oz) | 2.50 | added 2026-09-29 |

Prices are also stored in Supabase (`selling_price`); **the database is authoritative for orders**, the website copy is for display. Change both together (section 11).

### 4.2 Order flow (order.html, `main.js`)

1. Customer adds dishes to the **basket** (persisted in `localStorage` under `nb:basket`; customer details under `nb:customer`, checkout idempotency under `nb:checkout`).
2. Basket panel (right column on desktop, in-flow on phones): fixed header, **scrolling middle**, **pinned footer** with the requested-delivery summary, subtotal and the green *Complete Order on WhatsApp* button.
3. **Details form validation** (one rule table `FIELD_RULES`, used for the button state, the note under the button and inline messages):
   - first/last name required; **phone 10 to 15 digits**; street and city required; **state exactly 2 letters**; **ZIP `12345` or `12345-6789`**.
4. **Delivery date + time window (required):** custom calendar; **today and past dates disabled, earliest is tomorrow in the customer's local time**. After choosing a date, choose **exactly one** window: `9:00 AM to 12:00 PM`, `12:00 PM to 3:00 PM`, `3:00 PM to 6:00 PM`, `6:00 PM to 9:00 PM`. No free-typed time. The button stays disabled until everything is valid; the same check runs again at submit.
5. On submit: (a) POST to the `create-order` function (payload: `checkout_token`, customer incl. `requested_at`, items as `slug` + `quantity`); the requested time sent is the **start of the chosen window**, and the human-readable window is also prefixed into the delivery instructions ("Delivery window: 3:00 PM to 6:00 PM on Wed, Sep 30 | ..."). (b) Then it opens WhatsApp with the order message (`wa.me` on phones, `web.whatsapp.com` on desktop).
6. **WhatsApp message**: emoji-styled, includes customer, address, instructions, **Delivery Date + Delivery Window**, items with unit/line totals, subtotal, and a "Delivery: date . window" line. If the encoded link would exceed **12,000 characters** (huge orders) a **compact plain-text version** is sent instead (the full order is already saved under the order number).
7. If the finance endpoint fails, the customer sees an error with their basket intact; **WhatsApp is not opened** on failure.

**Known gap:** customers **without WhatsApp** have no confirmation page and no email alternative. The order is still saved in the dashboard as "Pending WhatsApp Confirmation", but the owner must contact them by phone/SMS themselves. (Suggested: an on-screen "Order received" step and an "order by email instead" option, not built.)

### 4.3 Menu UI details (order.html)
- **Spotlight card** for the `hero` dish (Feteer Meshaltet): big photo, gold "The House Signature" ribbon with an ankh, glowing gold name, full description, three highlight pills, large price, big shimmering *Add to order* button. Two-column on wide screens (≥1280 px), **stacked** at 981 to 1279 px (menu column is narrow next to the basket), stacked on phones.
- **Regular rows**: bigger thumbnails (132 px desktop, 112 tablet, 96 phone). **Signature dishes** get a gold badge above the name (`.sig-badge`) and a soft gold frame (`.order-item--sig`).
- **Symbol:** the pharaoh figure was replaced everywhere by an **ankh** (inline SVG `ANKH_SVG`, helper `ankh()` in `main.js`). Do not bring back `assets/img/pharaoh-mark.svg` for badges (owner disliked it, called it "that girl").
- **Category filter chips** hide rows via the `hidden` attribute. CSS has `.order-item[hidden]{display:none}` because `display:grid` otherwise overrides `hidden` (this bug shipped once).
- Home page featured grid: clicking **Order** on a dish card adds it to the basket and **navigates to `order.html`**.

### 4.4 Forms: contact and catering (email relay)
Both forms now really send email (previously they only *pretended*: showed "thank you" and sent nothing).

- Browser posts JSON (plain-text body, so no CORS preflight) to `CONFIG.enquiryEndpoint`, a **Google Apps Script web app** owned by the business Google account. Script runs as that account and calls `MailApp.sendEmail` to `pharaohsbites.dallas@gmail.com` with **Reply-To = customer's email**.
- Email is a **branded dark/gold HTML template**: header, timestamp (Dallas time), gold-labelled rows, highlighted message/notes box, buttons **Reply by email / WhatsApp / Call** (WhatsApp and Call appear when the customer gave a phone number; these buttons are *for the owner to contact the customer*). Subjects look like `Catering request: Office lunch . 10-20 people . Sun, Oct 11 (Name)` or `Website message: <topic> (Name)`.
- Protections: a shared secret `token` (`enquiryToken` in `config.js` and `TOKEN` in the script; **must match**), a hidden honeypot field `_honey`, one message per sender email per 60 s, and a cap of 40 messages/hour. **Gmail quotas apply** (consumer accounts allow on the order of 100 emails/day via MailApp).
- Client validation: phone accepts normal US formats like `(214) 555-0100` (10 to 15 digits); an earlier regex wrongly rejected numbers starting with `(`.
- **Failure behavior:** on error the form shows "We could not send that just now (reason)..." with the WhatsApp number and **keeps the customer's text**; success shows the friendly thank-you and clears the form.
- **Catering "Occasion" field:** required; options are Family gathering, Church or community event, Office lunch, Birthday or celebration, Wedding or engagement, **Other**. Choosing **Other** reveals a text box ("Tell us the occasion") that becomes required; switching back hides and clears it. ("Not sure yet" was removed by request.)
- A free relay (FormSubmit) was tried first and abandoned: its API returned HTTP 500 for every send.

**Redeploying the relay** (only needed if the script code changes): script.google.com signed in as the business account, open the project, edit `Code.gs`, Save, then **Deploy > Manage deployments > pencil > Version: New version > Deploy**. The web app URL stays the same. Changing "Who has access" or the owner needs re-authorization by the account owner.

### 4.5 `assets/js/config.js` (website)
Holds: `whatsappNumber`, `orderWhatsappNumber`, `email`, `enquiryEndpoint`, `enquiryToken`, `hours`, `cateringNotice`, `currency`, `minimumOrder`, `financeOrderEndpoint` (`.../functions/v1/create-order`), `financeAnonKey` (Supabase publishable key), `deliveryAreas` (now "All over the Dallas-Fort Worth (DFW) area"). All values here are public in the browser by design.

### 4.6 Dashboard (repo `pharaohs-bites-finance`)
React 19 + Vite + TypeScript, `react-router-dom` with **HashRouter**, TanStack Query, Recharts, `@supabase/supabase-js`. Scripts: `npm run dev`, `npm run build` (typecheck + vite), `npm test` (vitest, 40 tests passing at last run), `npm run typecheck`, `npm run demo` (sample-data build at `/demo/`). Pages: Dashboard (Home), Orders/OrderDetail, Products/ProductDetail (Menu & Profit), Sales (Sales by Dish), Customers, Expenses, Cost, Payments, Tax, Reports, Insights, Performance, Deliveries, Data (import/export), Settings (Advanced mode toggle). Deployed by the Actions workflow to GitHub Pages; the two `VITE_*` values (Supabase URL + anon key) are **repository secrets**.

Orders from the website appear as **Pending WhatsApp Confirmation**; the owner moves them through the status flow.

### 4.7 Supabase
- **Edge Functions** (in `supabase/functions/`): `create-order` (the website's order intake, deployed with `--no-verify-jwt` because anonymous visitors call it), `plaid-exchange`, `plaid-link-token`, `plaid-sync` (bank feed, not in active use), shared helpers in `_shared/plaid.ts`.
- **`create-order` rules** (server side, deployed 2026-09-29): validates customer fields; **phone 10 to 15 digits; state exactly 2 letters; ZIP pattern; a delivery date is now required and must be tomorrow or later in America/Chicago** (12 h grace for far-away time zones, and no more than 400 days ahead); looks up each dish by `slug` and **re-prices from the database** (client totals are never trusted); rate-limits per IP; uses an idempotency `checkout_token`; allowed browser origins are `https://morcosfady.github.io`, `https://pharaohsbites.com`, `https://www.pharaohsbites.com`, plus localhost dev ports. **Any new domain that hosts the ordering page must be added to `ALLOWED_ORIGINS` and the function redeployed**, or browsers show "Network error" (this broke real orders once).
- **Auth:** public sign-ups disabled. The hosted project's **Site URL is `https://finance.pharaohsbites.com/`** (set in the dashboard on 2026-09-29; it had been `http://localhost:3000`, which broke password-reset links). `supabase/config.toml` mirrors this for local use only; **`config.toml` does not change the hosted project**.
- **Migrations** are numbered SQL files in `supabase/migrations/` (latest **0039**). `supabase/ALL_MIGRATIONS.sql` is a concatenation kept in sync by hand (append each new migration).
- **Do NOT use `supabase db push`.** The migration history is out of order (there are two `0010_*` files and `db push` demands `--include-all`). Apply a single migration with **`supabase db query --linked -f supabase/migrations/00NN_name.sql`** from the dashboard repo folder, then verify with `supabase db query --linked "select ..."`.
- Product cost model: `products.ingredient_cost` ("what it costs you") is used when a product has no recipe; `other_direct_cost` for extra fixed costs; `tax_status` defaults to `'review'` for new items.

---

## 5. Domains, DNS and hosting

- Domain **pharaohsbites.com**, registered at Cloudflare (cheapest-registrar research led there). Nameservers are Cloudflare's; DNS zone edited in the Cloudflare dashboard.
- **DNS records** (all **DNS only / grey cloud** so GitHub can issue HTTPS certificates):
  - `A  @  185.199.108.153 / .109.153 / .110.153 / .111.153` (GitHub Pages)
  - `CNAME www  morcosfady.github.io`
  - `CNAME finance  morcosfady.github.io`
- **GitHub Pages custom domains:** website repo `pharaohsbites.com` (a `CNAME` file exists in the repo root), dashboard repo `finance.pharaohsbites.com` (`public/CNAME` also present). HTTPS enforced on both.
- **What happens to old addresses:** `https://morcosfady.github.io/pharaohs-bites/` and `.../pharaohs-bites-finance/` both **301-redirect** to the custom domains.
- **Lesson (Chrome redirect cache):** for a short while the dashboard was pointed at `finance.pharaohsbites.com` and then removed; the owner's Chrome cached that redirect and showed a GitHub "404 there isn't a Pages site here" page (incognito worked). The permanent fix was to make `finance.pharaohsbites.com` the real dashboard address (so the remembered redirect is valid). **Do not remove a custom domain from a Pages site lightly**, cached 301s outlive the change. Clearing "Cached images and files" also fixes it.
- Email: there is no domain-based email; the business uses the Gmail address above.

---

## 6. Content and copy rules (decisions made with the owner)

1. **Plant-based wording.** Say the **meat is plant-based**. Approved phrases: "All Meat Is Plant-Based", "Plant-Based Meats", "100% Plant-Based Meats", "family-owned Egyptian cloud kitchen with 100% plant-based meats". **Never** "all plant-based", "vegan menu", or `Vegan` in `servesCuisine` (Vegetarian is OK). Individual dishes may be tagged Vegan only when truly so (some sides are tagged; unverified beyond the owner's data).
2. **Service area:** "all over DFW" / "Dallas-Fort Worth (DFW) area". No neighborhood lists.
3. **Hours:** "Open 24/7". Note the **order-form delivery windows still run 9 AM to 9 PM**; a decision on extending them is pending.
4. **No "Call" buttons**, WhatsApp only.
5. **Signature dishes** carry the gold "The House Signature" badge with an ankh: Feteer Meshaltet (spotlight), Feteer with Plant-Based Beef & Mozzarella, Macarona Bechamel, **both** Goulash trays (owner said "goulash" once; there are two, both badged; remove one if they meant one), Om Ali, Rice Pudding.
6. **Photos:** prefer the owner's own dish photos in `assets/img/menu-real/`. Stock photos remain only on the About hero ("A family cooking together in a home kitchen", Unsplash). The Home hero and others use owner assets. The catering banner is a Pexels photo of friends sharing a meal (deliberately **no alcohol** in shots: the brand is halal-friendly). The Diet Coke can photo is public domain (Evan-Amos, Wikimedia Commons).
7. **Page banners** (`.page-hero`) use a dark overlay plus a **frosted glass text panel** so the words stay readable over any photo. Keep new banners readable (this was a repeated complaint).

---

## 7. What was built or changed (chronological summary, latest work)

Earlier work (naming, branding, dashboard build, catalog syncs, etc.) is in `docs/SESSION-LOG.md` (dashboard repo). The following happened in the most recent session:

**Domain and infrastructure**
- Bought `pharaohsbites.com` (Cloudflare). Wired DNS (zone-file import by the owner), GitHub Pages custom domains, HTTPS.
- Moved the dashboard to `finance.pharaohsbites.com` after the Chrome-redirect-cache incident; updated Supabase Site URL, `config.toml`, README/OWNERS_GUIDE links, `public/CNAME`.
- Fixed "Network error" on orders from the new domain by adding origins to `create-order` and **redeploying**.
- Added server-side delivery-date validation and aligned phone/state rules in `create-order` (deployed; verified with rejection tests against the live function).

**Website ordering and UX**
- Merged Menu and Order Online into one page (`order.html`; `menu.html` redirects).
- Fixed category filters (CSS `hidden` vs `display:grid`).
- Rebuilt the basket panel (pinned header/footer, scrolling middle, cleaner rows, phone-safe).
- Delivery **calendar + four time windows** (required, in summary and WhatsApp message).
- Per-field validation messages; singular "1 item"; compact WhatsApp message for huge orders.
- Home "Order" buttons add to basket and go to the order page.
- Diet Coke 12 oz added ($2.50, cost $0.63). Goulash Tray photo replaced with the owner's correct photo (`?v=2` cache tag on the image URL, in both `data.js` and the database).
- Signature spotlight card and badges; ankh symbol; bigger photos.
- **Mobile QA pass** on 320/360/375/390 px: removed sideways scroll (scroll-reveal elements start translated 34 px and widened the page; fixed with `html, body { overflow-x: clip }`), raised tap targets to ~44 px, minimum readable text sizes, fixed the mobile menu when scrolled (see section 10), hero "trust pills" redesign.
- Footer: business WhatsApp with icon, newsletter box removed, "Get in Touch" heading.
- Wording changes in section 6; catering "How it works" block removed; About photo replaced with the owner's cut-open feteer photo; catering and Order/Contact banners changed.
- Email relay for contact/catering forms (section 4.4).

**Dashboard/database**
- Migrations `0038_diet_coke.sql` (product + $2.50 price + $0.63 cost) and `0039_goulash_beef_photo.sql` applied to the live database and appended to `ALL_MIGRATIONS.sql`.

---

## 8. Testing approach (reuse this)

- **Never place real orders.** In browser tests stub `window.fetch` (return `{ok:true, order_number:'PB-TEST-1'}`) and `window.open`, then read the captured payload and the decoded WhatsApp text (`decodeURIComponent(url.split('text=')[1])`). Scenarios covered: three different baskets (quantities, drinks, decimals like $5.50), dates from tomorrow to next month, all four windows, special characters/emoji in notes, empty and invalid inputs, past/today date forced into the hidden field, failure path.
- **Layout audit script** (paste in the page console, per page, at 320/360/375/390): flags horizontal overflow (`documentElement.scrollWidth > clientWidth`), elements past the right edge, tap targets under 36 to 40 px, text under ~11 px, broken images, overlapping buttons. Screenshots are the ground truth; scroll to the region first and wait for lazy images (they load via `IntersectionObserver` on `data-src`).
- The **in-app browser screenshot sometimes shows blank** right after an instant `scrollTo`; wait for reveal animations (`is-in` class) or take a second screenshot.
- Point the browser at a **local static server** (`python -m http.server 8123` in the website folder) and use `?nc=<random>` on URLs so the pane's HTTP cache doesn't serve stale HTML.
- Server-side checks: `curl` the `create-order` function (OPTIONS with an `Origin` header to test CORS; POST negative cases only, they are rejected before anything is saved).
- Email relay: a real end-to-end test was done from the browser through both forms (arrives in ~2 s), and the emails were inspected in the business inbox. The subject-line date, gold links and footer were tuned from those.

---

## 9. Known issues and open decisions (needs the owner)

1. **Fake reviews are live.** `data.js` has 6 invented testimonials (comment in the file: "PLACEHOLDER reviews - invented, not real customers. Replace before launch") with names and city roles (Plano, Uptown, Frisco, Deep Ellum, Irving). Fake reviews on a business site are a legal/reputation risk. **Recommendation: remove the reviews section until real ones exist.** The owner has not answered yet.
2. **Delivery windows vs 24/7:** windows are 9 AM to 9 PM. Extend if the business really delivers around the clock.
3. **Customers without WhatsApp** get no confirmation (see 4.2). Consider an on-screen confirmation and an email fallback.
4. **`tax_status = 'review'`** for Diet Coke (and other items): Texas usually taxes soft drinks; the owner should decide.
5. The **About page hero** still uses an Unsplash stock photo ("A family cooking together...") and the Contact banner now uses the owner's tray photo; the owner may want the About banner changed too.
6. **Stale docs:** website `README.md` / `PROJECT-LOG.md` and dashboard `docs/SESSION-LOG.md` predate many changes (README still describes reservations, 46 dishes, 9 categories). Update or delete them.
7. Relay is **rate-limited by Gmail quotas** (about 100 emails/day). Fine for now.
8. **Plaid/bank-feed functions** exist but are not part of the active workflow.
9. `robots.txt` / `sitemap.xml` / canonical URLs use `https://pharaohsbites.com` (apex). `www` redirects to the apex on GitHub Pages.
10. The `Nile Bites` folder name and any leftover "Nile Bites" strings are historical.

---

## 10. Gotchas that cost time (don't repeat them)

- **Cache-busting:** browsers and GitHub Pages cache assets. After editing CSS/JS bump the `?v=` in **all** HTML files (section 12). Editing a file without bumping means the owner (and customers) may see the old version for a long while.
- **`hidden` attribute vs CSS `display`:** `.field`, `.order-item`, `.calendar`, etc. set `display` and silently defeat `hidden`. Add an explicit `[hidden]{display:none}` rule.
- **`backdrop-filter` creates a containing block for `position:fixed` children.** The mobile menu (`.nav`, fixed) lives inside `.site-header`; once the header got its blur (after scrolling) the "full-screen" menu collapsed to header height. Fix: `body.nav-open .site-header { backdrop-filter:none; ... }`. Same rule of thumb for `transform`/`filter` on ancestors of fixed elements.
- **Scroll-reveal elements** (`data-reveal`) start offset by ~34 px and can widen the page on phones; `overflow-x: clip` on `html, body` (clip does not break `position: sticky`).
- **Specificity traps:** generic `.order-item h3 { ... }` beat `.hero-item__title`; a later `@media` for `.order-item` squeezed the hero card. Prefix hero rules with `.order-item--hero` and add phone-specific overrides with higher specificity.
- **`.gold-text` gradient text** rendered as a faint outline in the spotlight title; use a solid `color` + `text-shadow` glow instead.
- **RadioNodeList:** `form.elements.requested_window` is a RadioNodeList once radios exist; read/set via `.value`. Saved values are restored before dynamic radios render, so read the saved window from `localStorage` when building them.
- **Sharing one image on one page:** the About page already used `feteer-meshaltet-wide.jpg`, so a second use looked duplicated. Check before reusing a photo on the same page.
- **Apps Script POST quirk:** the script runs on the first POST and then answers via a 302; a `curl -X POST -L` shows a bogus 411 error even though the email was sent. Test in a browser or use `curl -L` **without** `-X POST`.
- **Apps Script editor** can be filled programmatically through `monaco.editor.getModels()[0].setValue(...)`; avoid typing into it (auto-indent mangles code).
- **Supabase `db push` refuses** (history mismatch), use `db query --linked -f`.
- **Supabase auth `Site URL`** is what password-reset emails link to; keep it equal to the dashboard's real address.
- The **git-bash tool** may print `LF will be replaced by CRLF` warnings on the website repo; harmless.

---

## 11. Runbooks

### Add a new dish
1. Put the photo in `assets/img/menu-real/<slug>.webp` (or jpg). Keep it under ~350 KB; landscape 3:2 or 4:3 looks best in rows; portrait photos (1086x1448) also work.
2. Add an entry in `assets/js/data.js` `MENU` (`id` = the slug, `cat` one of `mains|soups|desserts|sides|drinks`, `name`, `ar`, `price`, `desc`, `tags`, `img`). Optional flags: `featured`, `signature`.
3. Add the product to Supabase **first** (new migration, see below), otherwise orders containing it will fail on the server. Template: `supabase/migrations/0038_diet_coke.sql` (insert into `products ... select ... from product_categories c where c.name = 'Drinks' on conflict (slug) do update ...`; set `selling_price` and `ingredient_cost`). Apply with `supabase db query --linked -f ...` and append to `ALL_MIGRATIONS.sql`.
4. Bump `data.js` version in all HTML, test locally, commit, push.

### Change a price
Update **both** `data.js` (`price`) and the database (`update products set selling_price = ... where slug = '...'` via a new migration file). Bump `data.js` version.

### Change a dish photo
Replace the file (keep the filename) **and** add a version tag to the reference (`...webp?v=3`) in `data.js` and in the product's `image_url` (migration), so browsers fetch the new one.

### Add or remove the signature badge
Toggle `signature: true` on the dish in `data.js`; bump the `data.js` version.

### Change the WhatsApp number
`whatsappNumber`, `orderWhatsappNumber` in `config.js`; the many `wa.me/<digits>` links and the footer text in each HTML file; the Apps Script `Code.gs` has no phone number (it builds buttons from the customer's number). Search the repo for the old digits.

### Change where enquiry emails go
Edit `TO` in the Apps Script `Code.gs` and redeploy a new version (section 4.4). The site itself does not know the destination.

### Rotate the relay key
Change `TOKEN` in `Code.gs` (redeploy) **and** `enquiryToken` in `config.js` (push). They must match or every form fails with "not allowed".

### Update hours or service area
Search the HTML for "24/7", `data-hours` lists (contact + catering), the JSON-LD `openingHoursSpecification` in `index.html`, `config.js` (`hours`, `deliveryAreas`), and the "all over DFW" strings.

### Deploy the order function
From `F:\Portfolio\pharaohs-bites-finance`: `supabase functions deploy create-order --no-verify-jwt --project-ref vvwunhcpxofvnjijemdb`. Verify with an OPTIONS request for each allowed origin. Remember the Plaid functions share `_shared/plaid.ts` (their CORS list is separate from `create-order`'s).

### Bump asset versions on the website
Replace the number in every HTML file for the changed asset, e.g. `pages.css?v=115` to `116` (there is a small Python/sed pattern: `sed -i -E 's#(css/pages\.css\?v=)[0-9]+#\1116#g' *.html`). Do the same for `main.js`, `config.js`, `data.js`.

### Add a page banner
Use the `.page-hero` structure (`page-hero__bg` image, `page-hero__inner` text). The frosted panel is automatic. Use the owner's photos; avoid busy stock photos with drinks/alcohol.

### Run locally
Website: `python -m http.server 8123` in `F:\Portfolio\Nile Bites`, open `http://localhost:8123/`. Dashboard: `npm install`, `npm run dev` (needs a `.env.local` with the Supabase URL and anon key; see `.env.example`).

---

## 12. File map of the edits most likely to be touched next

Website:
- `assets/js/main.js`: `FIELD_RULES`, `customerComplete`, `initSchedule` (calendar/windows), `orderAsText` / `orderAsCompactText`, `recordOrder`, `renderOrderList` (hero card + rows + badges), `enquiryPayload` / `sendEnquiry`, `initForms` (validation, occasion "Other").
- `assets/css/pages.css`: appended blocks for the basket panel, calendar/windows, signature card/badges, mobile QA fixes, hero pills, frosted page-hero panel, menu sizing. Later rules intentionally override earlier ones; when in doubt add a more specific selector at the end.
- `catering.html` / `contact.html`: forms (each has the hidden `_honey` field).
- `order.html`: basket markup (`.basket__scroll`, `.basket__foot`), schedule fieldset.

Dashboard:
- `supabase/functions/create-order/index.ts`: intake rules, `ALLOWED_ORIGINS`, `deliveryDateProblem`.
- `supabase/migrations/` and `ALL_MIGRATIONS.sql`.
- `src/pages/*`, `src/lib/*`.

---

## 13. Suggested next steps (in rough priority)

1. Decide about the **fake reviews** (remove, or replace with real ones).
2. Have the owner send **one real test order** to their own phone and confirm the WhatsApp message looks right in the app (never verified inside WhatsApp itself), then delete it in the dashboard.
3. Add an **order confirmation** screen and an email fallback for customers without WhatsApp.
4. Decide delivery windows for a 24/7 business.
5. Review `tax_status` for drinks/desserts.
6. Refresh the stale README/session logs, add Instagram/Facebook links when they exist.
7. Consider making the About banner use an owner photo.

---

## 14. Combos (added 2026-10-01)

The full write-up lives in the finance repo (`pharaohs-bites-finance/docs/HANDOFF.md`, section "Combos", and `docs/COMBO-PRICING.md`). Website side in short:

- `assets/js/data.js`: combos are `cat: "combos"` items, listed best profit first. `includes` = fixed contents (shown as photos), `slots` = what the customer picks (`key`, `label`, `count`, optional `distinct`, `options`), `worth` = cheapest picks bought separately (for the "You save" badge). `CATEGORIES` order is the tab order and the "Everything" section order; **Combos is last**.
- `assets/js/main.js`: `comboExtras` draws the card contents ("+" between items, "or" between two options, photo stack for bigger choices, green savings badge). `openComboPicker` is the pick window. The basket key carries the picks (`id~slot=a,b&slot=c`), `buildOrder` sends `choices` and a readable `options` line; the server re-checks the picks and prices everything from its database. Old basket lines without valid picks are dropped on load.
- `assets/css/pages.css` (end of file): combo card, badge, picker and green `chip--combo` tab styles.
- Live combos: Party Tray $89.50, Family Feast $69, Egyptian Breakfast $39.50, Meal for One $33, Sides Platter $19, Pick Any 3 Puddings $15. Feteer + Dip Trio was removed.
- **Always bump `?v=` for pages.css, main.js and data.js in every HTML file** when editing them, or browsers keep showing the old version.


## 15. FIRSTBITE promo banner (added 2026-10-09)
- A slim gold bar above the header on index, order, about, catering and contact (not the `menu.html` redirect, not `qr.html`). Built by `initPromoBanner()` in `assets/js/main.js` from `promoBanner` in `assets/js/config.js`.
- **Turn it off:** `promoBanner.enabled: false` in `config.js` (then bump `config.js?v=` in all HTML). Text, short phone text, link and `hideDays` are in the same block; `{code}` in the text becomes the tap-to-copy pill.
- Behaviour: pill copies the code ("Copied ✓" 1.5 s, clipboard fallback, never throws); the x hides it for 7 days (`localStorage` key `pb_promo_closed`, try/catch); it hides itself (without remembering) when a promo is applied on the order page; phones under 520 px get the short text in at most 2 lines.
- Layout: `html.has-promo` reserves the bar height (`--promo-h` 42 px, 56 px on phones) so nothing jumps; the bar is absolutely positioned and scrolls away; the fixed header uses `top: var(--promo-offset)` (set by a scroll listener) so it slides up to the top. z-index 90, below the header (100), so the mobile menu still covers it. Styles at the end of `pages.css`.
- Link: `order.html?promo=FIRSTBITE` pre-fills the existing Promo code box and shows "press Apply". Nothing is applied automatically (applying needs phone, email and address; the server is the only judge).
- Also fixed: the empty "Promo" row in the order totals (`.basket__row[hidden]` now hides).
- Banner text no longer mentions the distance (2026-10-09, owner request); the 10-mile limit stays in the system only. A customer further than that who applies FIRSTBITE sees a red message (`.promo__msg.is-bad`) saying the address is X miles away, and can still order: the promo is not sent with the order, so the normal delivery fee is charged (tested live with a 14.2 mile address: $29.85).
- Versions: `config.js?v=111`, `main.js?v=136`, `pages.css?v=146`, `main.css?v=64`, `data.js?v=116`.
- Tested on a local copy: 320 px (all 5 pages), 375 px (index, about, catering, contact), 390 px (order), desktop; copy, close, reload, 7-day expiry, mobile menu full screen, no sideways scroll, hide-on-apply (server answer faked). Live check done on pharaohsbites.com after the push. Note: in the Claude browser pane, `window.scrollTo` does not fire scroll events; use real mouse scrolling to test the header offset.
- **Open items:** a customer who arrives from the banner and never presses Apply pays the normal delivery fee. A "press Apply" reminder at checkout would fix it (not built: the brief said not to touch checkout logic). The free-delivery distance (FIRSTBITE `max_miles`, now 10) lives only in the database; `qr.html` footer still says "within 10 miles".


## 16. Website upgrade, Phase 1: design system + speed foundation (2026-10-09, live)
Plan (owner OK'd): Phase 1 design system and speed, Phase 2 motion (`motion.js`, GSAP + ScrollTrigger lazy, header glass, sticky bottom Order bar, add-to-basket fly, View Transitions), Phase 3 wow moments (CSS 3D tilt + sheen on a hero feteer card, dish-card tilt + glare, magnetic buttons, SVG line art; no Three.js; a muted "how it's made" clip from the owner's reels in `F:\Pharaoh's bites\Reels`, played only when scrolled to), Phase 4 pages (food-first hero, order page polish with ALL checkout logic untouched, about/catering/contact, footer). After each phase: local test at phone + desktop, screenshots, Lighthouse, owner OK, push, handoff. Owner decisions: **keep** the 6 placeholder reviews (they are invented; known issue, owner chose to keep), food-first hero is OK to try, no process photos exist so use reels or line art.

What Phase 1 changed:
- **Images:** small WebP copies made by `tools/make-images.js` (run by hand with `sharp`, see the header of the file): `assets/img/menu-real/w/<name>-<120|240|480|800>.webp`, `assets/img/brand/w/` (logo-header 320/480/640, mark 96/192), `assets/img/w/catering-hero-<480|800|1200>.webp`. `imgAttrs(src, sizes, fallbackWidth)` in `main.js` builds `data-src` / `data-srcset` / `sizes` for the dish templates; `hydrateImages` moves `data-srcset` to `srcset`. **After changing or adding a dish photo, run the script again** (new dish photos without variants would 404 in the srcset). The about page still uses an external Unsplash hero (replace in Phase 4).
- **Fonts self-hosted** in `assets/fonts/` (Cormorant Garamond normal + italic latin, Jost latin, Noto Kufi Arabic arabic; variable fonts), `@font-face` at the top of `main.css`, the two main ones preloaded. No Google Fonts requests any more.
- **CLS fix:** a small inline script in every `<head>` adds `html.has-promo` before first paint (reserves the promo bar height); `initPromoBanner` removes the class when the bar is off or closed.
- **Tokens** in `main.css` `:root` (status colors, gold/ink scales, z-index layers `--z-*`, durations/easings, gutter, `--section-y`, focus ring, card tokens). All magic z-index numbers now use `--z-*`. Section padding is `clamp(3.5rem, 7vw, 6.5rem)`.
- **Buttons:** focus-visible ring, pressed scale, `[disabled]` / `[aria-disabled]`, `.is-loading` spinner, `.btn--outline`. **Cards:** `.card--surface`, `.card--lift` (note: `.card` already exists as the link-card on the home page). **Section header:** gold hairline under `.section-head` (skipped when a divider is inside).
- **Gallery** (`.masonry`) is now a CSS grid, 3 columns (2 on phones), 4:5 tiles, no gaps.
- Hero images no longer fade in (`img.is-loaded` animation disabled for the hero emblem, hero bg, brand mark, footer logo) so the largest paint is immediate. Very light grain overlay (`body::after`, tiny SVG tile, opacity .045). `config.js` has `motion: { enabled: true, threeD: true }` (read by Phase 2).
- Versions: `main.css?v=65`, `pages.css?v=147`, `pharaonic.css?v=62`, `main.js?v=137`, `config.js?v=112`, `data.js?v=116`.
- **Lighthouse, home, simulated mobile, live pharaohsbites.com** (median of 3): before Performance 63, FCP 3.9 s, LCP 8.0 s, CLS 0.099, 1.9 MB; after **75**, FCP 1.9 s, LCP 4.6 s, CLS 0.000, 0.67 MB; Accessibility 100, Best practices 100, SEO 100 both times. Unthrottled browser: FCP/LCP about 0.4 s.
- **Targets not met yet:** Performance >= 90 and LCP < 2.5 s. What is left: the three render-blocking stylesheets (`main.css` 33 KB, `pages.css` 83 KB, `pharaonic.css` 15 KB, unminified). Planned: inline critical CSS + load the rest async and/or minified copies (a manual `tools/` script, keep sources readable), simpler food-first hero in Phase 4, motion libraries lazy-loaded in Phase 2.
- Tested: local copy at phone 390 and desktop (headless Chrome for desktop; headless Chrome cannot render widths under 500, use the in-app pane for phones), order page add-to-basket and subtotal, About/Catering/Contact load clean, no JS errors (only the expected local CORS noise from the tracker). Phone widths 320/360/375/414 not re-run for the new gallery.
- Gotchas: the in-app browser pane's desktop-size emulation can render the page in a small corner after switching from a phone size; open a fresh tab or use headless Chrome (`chrome --headless=new --screenshot`). Lighthouse is installed in `%TEMP%\lh` (run with `CHROME_PATH` set); a handy runner `run.js` there prints medians.
- **Open items:** keep or replace the invented reviews (owner: keep for now); about page external Unsplash image; the two similar feteer photos at the top of the gallery.


## 17. Website upgrade, Phase 2: motion (2026-10-09, live)
- **New file `assets/js/motion.js`** (loaded after `main.js` on all 5 pages, `?v=2`) plus a "Phase 2: motion" section at the end of `pages.css`. Config switches in `config.js`: `motion: { enabled, threeD }` (threeD is for phase 3) and `orderBar: true`. Set `motion.enabled: false` to turn every animation off.
- **How the switch works:** a script in every `<head>` adds `html.motion` before first paint only when the visitor has NOT asked for reduced motion; reveals are hidden only under `html.motion`, so reduced-motion visitors and no-JS see everything. Fail-safes: the head script removes `html.motion` after 6 s if `html.motion-ready` (set by `motion.js`) never appears, and `motion.js` reveals anything already on screen after 3 s. If `motion.enabled` is false, `motion.js` removes the class (a brief hidden-then-visible pop is possible).
- **One reveal recipe** (`main.css`, `html.motion [data-reveal]`): fade + 18 px rise + blur(6px) to sharp, `--dur-slow` and `--ease-enter`, staggered by `--reveal-delay` (set by `applyStagger` in `main.js`), `will-change` dropped when in. The IntersectionObserver in `main.js` still adds `.is-in`.
- **Hero** (index): slow Ken Burns on `.hero__bg img` (`heroZoom`, 42 s), and `.hero__motes` (8 spans phones / 14 desktop, CSS animated, skipped on saveData or deviceMemory <= 2). **Heading gold line** draws in via `.is-drawn` on `.section-head`. **Cards:** hover lift/shadow/photo zoom for mouse users, `:active` press for touch.
- **Add to basket:** `main.js` calls `window.NBMotion.fly(button)` only when `basketCount()` grew; `motion.js` flies a ghost of the dish photo to the visible basket target (`.basket-fab[data-basket-fab]`, `.basket__count`, `a[href="#basket"]`) with the Web Animations API, then bumps it. Never throws. The old toast stays.
- **Sticky Order bar (phones <= 820 px, every page except order.html):** `.order-bar`, built by `motion.js`; shows after 360 px of scroll, hides on scroll down, returns on scroll up. `html.has-orderbar` adds bottom padding and lifts `.to-top` and `.toast-stack`. z-index `--z-sticky`, so the mobile menu (header, z 100) still covers it.
- **Page transitions:** `@view-transition { navigation: auto }` with a short opacity cross-fade (Chrome/Edge/newer Safari; others navigate normally). **Do NOT give `.site-header` a `view-transition-name`**: it would become the containing block of the fixed mobile menu and shrink it (same trap as backdrop-filter).
- **Decisions / deviations:** GSAP + ScrollTrigger are NOT loaded yet (CSS does all of phase 2 more cheaply; they arrive in phase 3 for the pinned "how it's made" story and SVG line drawing). Lenis smooth scroll skipped (risk with dialogs, calendar and sticky basket). No count-up numbers (no real stats to show).
- Versions: `main.css?v=66`, `pages.css?v=148`, `main.js?v=138`, `motion.js?v=2`, `config.js?v=113`, `pharaonic.css?v=62`, `data.js?v=116`.
- Lighthouse (home, simulated mobile): live after phase 2 median Performance 73 (runs 73/80/73, noisy), Accessibility 100, Best practices 100, SEO 100, FCP 2.0 s, LCP 4.4 s, CLS 0.000, 0.67 MB. Local order page 88 to 91. Targets (Performance >= 90, LCP < 2.5 s) still open: the render-blocking stylesheets; planned critical CSS / minified copies.
- Tested: local copy at phone 390 (bar show/hide on scroll up/down, reveals, heading lines, basket flight + bump, full-screen mobile menu with the bar shown, no bar on order page), reduced motion via `--force-prefers-reduced-motion` (no `html.motion`, no motes, all content visible), live class check after deploy. Not re-run at 320/360/375/414 this phase. Testing tip: in the in-app pane programmatic `scrollTo` does not fire scroll events; dispatch `window.dispatchEvent(new Event("scroll"))` after it.
- **Open items:** phase 3 (CSS 3D tilt + sheen hero card, dish-card tilt + glare, magnetic buttons, SVG line art, "how it's made" scroll story with a muted reel clip: needs `ffmpeg` to compress, not installed), phase 4 (food-first hero, order page polish with checkout untouched, about/catering/contact, footer), critical CSS for the Lighthouse target.


## 18. Website upgrade, Phase 3: wow moments (2026-10-09, live)
- **"How feteer is made" story** (index, section `#how-its-made`, markup in `index.html`, logic `initStory()` in `assets/js/motion.js`, styles at the end of `pages.css`). Four steps (Stretch, Layer with butter, Fold, Bake golden), each with a muted looping clip in `assets/video/step-N-*.mp4` (480x854 H.264, 157 to 454 KB, no audio) and a poster `.webp`. Desktop (>= 900 px, motion on): the stage is `320vh` tall, the picture is `position: sticky`, scroll progress picks the step; the step titles are buttons that scroll to that step. Phones: swipe cards (scroll-snap), the centred card picks the step. Videos load only when the section is within 700 px, step N plus N+1 only, only the active one plays, pause when off screen or tab hidden; posters of steps 2 to 4 are `data-poster` (set when near). Reduced motion / data saver / 2G: posters only, nothing autoplays, no tall track. The copy says "homemade butter" to match the rest of the site. A visible note says "AI-generated video illustrating the process" (owner rule: AI videos keep the AI label). The clips carry a tiny generator mark in the bottom-right corner, hidden by `.story__video { transform: scale(1.09); transform-origin: 0 0 }`.
- **Making the clips again:** source reels are in `F:\Pharaoh's bites\Reels` (2.mp4 stretch, 3.mp4 butter, 4.mp4 fold, 5.mp4 bake; 6, A, B, C are alternates, see the contact sheet idea below). ffmpeg is not installed system-wide; I used `npm i ffmpeg-static` in a temp folder. Command per clip: `ffmpeg -i <reel>.mp4 -t 8 -vf "scale=480:-2,fps=24" -c:v libx264 -preset slow -crf 30 -pix_fmt yuv420p -an -movflags +faststart step-N-name.mp4` and a poster frame `ffmpeg -ss 1.2 -i <reel>.mp4 -frames:v 1 -vf scale=480:-2 poster.png` converted to webp with sharp (quality 70). Sheet of all 9 clips: `ffmpeg -vf "fps=1/2.2,scale=200:-1,tile=4x1"` per clip then `vstack`.
- **3D tilt + gold glare** (`initTilt`): `.spotlight, .grid-4 > .card, #featured .dish, .hero-item, .masonry__item`; mouse only (`(hover: hover) and (pointer: fine)`), max 3.5 deg for the big spotlight and 5.5 deg for others, uses the CSS `rotate` property (axis-angle) so reveal/hover transforms are untouched, the parent gets `perspective: 1100px`, a `.tilt__glare` span is added to the element. The transition list of the element is extended with `rotate` (explicit 0s delay, because reveal delays would otherwise lag it). **Magnetic buttons** (`initMagnetic`): `.btn--gold` except `.btn--sm`, `.btn--block`, `.btn--place`, submit buttons; they move up to 9 px toward the cursor within a 56 px margin using the `translate` property. **Line art** (`initLineDraw`): any `[data-draw]` SVG, paths have `pathLength="1"`, `--p` (0 to 1) follows scroll. All of these are off when `motion.threeD` is false, when motion is disabled or with reduced motion.
- **No GSAP / ScrollTrigger / Lenis anywhere**: sticky positioning plus scroll maths did the job, so the site ships no animation library (note in the `motion.js` header). Do not add one without a reason.
- **Hero feteer card not built yet:** the big feteer spotlight card on the home page (`.spotlight`) is the 3D showcase for now; the food-first hero with a tilt card is phase 4 (the tilt code is reusable: add the selector to `SEL` in `initTilt`).
- Accessibility note: inactive story steps are dimmed with colour (not opacity) so all text keeps AA contrast; step buttons have no `aria-label` (their visible text is the name; a mismatching label failed Lighthouse).
- Versions: `pages.css?v=151`, `motion.js?v=4`, `main.js?v=138`, `main.css?v=66`, `config.js?v=113`, `pharaonic.css?v=62`, `data.js?v=116`.
- Lighthouse (home, simulated mobile, live): median Performance 78 (77/78/84), Accessibility 100, Best practices 100, SEO 100, FCP 2.0 s, LCP 4.3 s, CLS 0.000, 536 KB first load (videos not included, they load near the story). Still open: Performance >= 90 and LCP < 2.5 s (render-blocking stylesheets; planned critical CSS / minified copies).
- Tested with Puppeteer (`puppeteer-core` + the installed Chrome, in `%TEMP%\pp`, scripts desk.js / mob.js / order.js / live.js): desktop 1440x900 (all four steps change, videos play, lazy loading 2 then 3 then 4 videos, tilt rotate + glare + perspective, reset on leave, magnetic translate), phone 390 with touch (swipe to step 3, video follows), reduced motion (no video loaded, buttons switch posters, line art fully drawn), order page desktop + phone (add to basket, no order bar, no sideways scroll), no JS errors, live site steps 1 to 4 play. Puppeteer is the reliable way to test scroll-driven effects here (the in-app pane does not fire scroll events for programmatic scrolling and its desktop emulation can render in a corner).
- **Open items:** phase 4 (food-first hero with a tilt card, order page polish with ALL checkout logic untouched and the stubbed checkout test re-run, about/catering/contact polish with success animations, footer), critical CSS for the Lighthouse target, the about page's external Unsplash image, gallery duplicate-looking first two photos, reels 6 / A / B / C unused (alternates: 6 and C show the golden pull-apart, A and B the dough steps).


## 19. Website upgrade, Phase 4: pages (2026-10-09, live) and wrap-up
- **Home hero is food first** (`index.html` `.hero--food`, styles at the end of `pages.css`): phones show the square feteer photo (`<picture>` source for <= 899 px, preloaded with `media`) in the top ~64% and the headline, one-line value and BOTH buttons above the fold (checked at 390x844, 360x640, 320x568); desktop (>= 900 px) has the copy on the left and `.hero__card`, a tilting 3D feteer card with gold glare (`.hero__card` is in the `initTilt` selector). `html.has-promo .hero--food` subtracts the promo bar height. The old centred emblem hero rules in `pages.css` section 1 are no longer used by the home page. The hero card image is `loading="lazy"` and hidden on phones, so phones do not download it.
- **"Three steps to a warm tray"** (`#how-to-order`, `.steps3`) on the home page, after the short-menu category cards: pick dishes, choose a day and time (from tomorrow), we deliver across DFW. No prices or promo terms in it.
- **Owner rule enforced: never say "halal".** Removed from the home marquee (2 items), the About promise card (replaced by "Boxed Hot": "Every order is boxed hot and handed straight to the rider, so it arrives warm.", wording already on the order page) and the home `<meta name="keywords">`. `grep -ri halal` over the site now finds nothing outside this handoff. Keep it that way.
- **About:** the stock Unsplash hero is replaced by the owner's `goulash-nuts` photo (with srcset); no external image host remains (the unsplash `preconnect` is gone); "Everything here has a source" is now a timeline (`.timeline`, built only from sentences that already existed on the page, with two of the owner's photos); the three static photos use the small variants.
- **Contact + catering forms:** floating labels (`motion.js` `initFloatingLabels` adds `.js-float` to `form.form` and keeps `.is-floated` in sync; without JS the labels stay above the fields), `.form-status.is-success` shows a drawn green check, `.is-error` is red. `main.js` only adds/removes those two classes in the existing submit handler; validation, the honeypot (`_honey`), the token and the Apps Script relay are untouched. The Contact info tiles use `h2` (was `h3`, a heading-order failure) with the same look (`.info-tile h2`). The contact map iframe now uses `data-embed-src` and loads when it is 250 px from the screen (`initLazyEmbeds`); without JS the "Open in Google Maps" link is still there.
- **Footer (all 5 pages, generated from the old footer, legal label kept):** 3 columns on desktop, two `<details class="footer-acc">` that are open on desktop and folded on phones (`initFooterAccordion`, user taps are remembered), delivery-area line ("Delivering across the Dallas-Fort Worth area. Please order at least a day ahead."), the Texas Cottage Food Operation label and the WhatsApp/email/social links unchanged.
- **Order page (visual only, no IDs/names/data attributes touched):** sticky category chips under the header (`.order-layout .filter-bar[data-order-filters]`, top 74 px, horizontal scroll with a fade; `.order-layout > * { min-width: 0 }` is REQUIRED, otherwise the nowrap chips stretch the whole page to ~900 px on phones), a shimmer on the delivery value while the quote loads (`value.classList.toggle("is-loading-quote", ...)` in `renderTotals`), clearer totals, a friendlier empty basket (`.basket__empty`). Not done on purpose: a bigger dish-card or basket open/close redesign (highest risk to checkout).
- **Stubbed checkout test (re-run, no real orders), desktop and phone, also against the live site:** Puppeteer intercepts the Supabase functions (`delivery-quote` delayed 1.4 s, `create-order`, `create-checkout`, `track`), adds 2 dishes (dismissing the add-ons dialog), types the customer details, picks a date in the calendar and a window, places the order: `create-order` receives 2 items, phone, email, city, `pay_online: true`, a checkout token and no promo, then `create-checkout` runs and the page redirects to the stubbed Stripe URL. Script: `%TEMP%\pp\order2.js` (`BASE=https://pharaohsbites.com node order2.js`).
- **Critical CSS experiment dropped:** inlining the home page's first-screen CSS (penthouse, 22 to 45 KB) and loading the three stylesheets without blocking did NOT improve Lighthouse (FCP 2.4 s vs 2.1 s), so it was not shipped. The lab LCP is limited by the simulated slow phone; unthrottled FCP/LCP are about 0.4 s.
- **Versions:** `pages.css?v=158`, `main.js?v=139`, `motion.js?v=6`, `main.css?v=66`, `config.js?v=113`, `pharaonic.css?v=62`, `data.js?v=116`.
- **Final scores (Lighthouse, simulated mobile):** live home median Performance 77 (67/77/82), Accessibility 100, Best practices 100, SEO 100, FCP 2.4 s, LCP 4.3 s, CLS 0.000, 618 KB. Local medians: order 81, about 82, catering 85, contact 85, all with Accessibility 100, SEO 100, CLS 0. **The original targets (Performance >= 90, LCP < 2.5 s on the lab phone) are NOT met.** Start of the upgrade: home Performance 63, FCP 3.9 s, LCP 8.0 s, CLS 0.099, 1.9 MB.
- **Whole upgrade in one paragraph:** phase 1 tokens/buttons/cards, small WebP images with srcset, self-hosted fonts, CLS fix; phase 2 one reveal recipe, hero zoom + motes, heading lines, card hover/press, add-to-basket flight, sticky phone Order bar, page cross-fade; phase 3 four-step "How feteer is made" story with the owner's reel clips, 3D tilt + glare, magnetic buttons, line-art; phase 4 this section. No GSAP/Lenis/Three.js anywhere. Switches: `config.js` `motion: { enabled, threeD }` and `orderBar`.
- **Ideas not done / open items:** reach Lighthouse 90 (needs less main-thread work and smaller CSS/JS: minified copies via a manual build script are the next thing to try, but they add a "regenerate after editing" step); the 6 placeholder reviews are still live (owner chose to keep them, they are invented); gallery has two near-identical feteer photos; reels 6, A, B, C unused; phone widths 320/360/414 only spot-checked for the new pages (390 and the hero at 360 and 320 were checked).

### 19.1 Follow-ups (2026-10-09)
- **Home hero reverted at the owner's request:** the food-first hero (`.hero--food`, `.hero__card`) was removed from `index.html` and the ORIGINAL hero is back (centred big logo emblem, headline, three trust pills, "Order Now" / "Explore Menu"). The `.hero--food` / `.hero__card` CSS in `pages.css` and the `.hero__card` entry in the `initTilt` selector are now unused and harmless. The "Three steps" section, About timeline, footer, forms and order polish were kept. The logo preload (`logo-header` webp, `fetchpriority=high`) is back in the home `<head>`. Do NOT bring the food-first hero back without asking.
- **Catering form bug fixed (`pages.css?v=160`, `motion.js?v=8`):** the floating-label CSS had also hit the radio labels of the "How many people" picker (all five buttons piled up in a corner), and the date/time labels overlapped the browser's own mm/dd/yyyy text. Floating labels now apply only to `.field:not(fieldset) > label`, radio/checkbox groups are skipped in `initFloatingLabels`, and date/time fields are always floated. Test script: `%TEMP%\pp\cater.js`.
