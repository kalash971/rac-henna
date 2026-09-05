# RAC_Henna

Next.js 16 site for a bridal & occasion mehndi artist, with a procedural 3D
henna mandala as the page backdrop.

```bash
npm run dev     # http://localhost:4000  (dashboard at /admin)
npm test        # framing, geometry, quality tiers, enquiry validation, session tokens
npm run build
```

## Setup

The public site runs with no configuration at all — gallery falls back to
hand-drawn placeholders and the booking form still opens WhatsApp. The
dashboard needs four environment variables; copy [.env.example](.env.example)
to `.env.local` and fill them in. Until all of them are set, `/admin` shows
setup instructions and **no one can sign in — there is no default password**.

| Variable | What it is |
|---|---|
| `MONGODB_URI` | MongoDB Atlas → Connect → Drivers |
| `MONGODB_DB` | Optional, defaults to `rac_henna` |
| `ADMIN_PASSWORD` | The password you sign in with. Long and random |
| `AUTH_SECRET` | Signs the session cookie. Changing it signs everyone out |
| `CLOUDINARY_CLOUD_NAME` · `CLOUDINARY_API_KEY` · `CLOUDINARY_API_SECRET` | All three are on the Cloudinary dashboard home page |

In Atlas, add `0.0.0.0/0` to Network Access — serverless functions have no
fixed IP. Collections and indexes are created on first use; there is no
migration step to forget.

## Where things live

| What | File |
|---|---|
| Phone, WhatsApp, Instagram, services, gallery, steps | [lib/site.ts](lib/site.ts) |
| 3D shapes, ring layout, draw-in easing | [lib/henna-geometry.ts](lib/henna-geometry.ts) |
| Booking validation + WhatsApp message | [lib/enquiry.ts](lib/enquiry.ts) |
| Canvas, lights, materials, scroll rig | [components/scene-3d.tsx](components/scene-3d.tsx) |
| All page sections | [components/sections.tsx](components/sections.tsx) |
| Palette and type tokens | [app/globals.css](app/globals.css) |
| Queries and documents | [lib/db.ts](lib/db.ts) |
| Photo upload signing | [lib/cloudinary.ts](lib/cloudinary.ts) |
| Session cookie crypto | [lib/session-token.ts](lib/session-token.ts) |
| Dashboard | [app/admin/](app/admin/) |

## The 3D

No model files. Petals, paisleys, dots and the applicator cone are
`THREE.Shape` curves extruded at runtime, laid out on concentric rings, and
lit by drei `Lightformer`s instead of a downloaded HDR — so the scene has no
network dependency and nothing to license.

### How it stays smooth

Ordered by how much each one actually buys.

- **No raycasting on pointer move.** The scene sets no r3f `eventSource` and
  lives inside a `pointer-events: none` wrapper, so react-three-fiber's event
  system never fires. Pointer parallax comes from one passive `pointermove`
  listener writing into a ref, which triggers no React render and no extra
  frames — input rate is fully decoupled from frame cost. (r3f's own pointer
  would raycast ~90 extruded meshes per event.)
- **No full-screen `backdrop-filter` over the canvas.** The scrim below the
  hero and the `.glass` cards are plain translucent fills. A viewport-sized
  backdrop blur over a moving canvas makes the compositor re-blur the whole
  screen every frame. Only two blurs remain: the sticky header and the mobile
  menu scrim, both over real content.
- **The loop parks itself.** An IntersectionObserver on the hero plus
  `visibilitychange` switch `frameloop` to `demand` when the hero scrolls away
  or the tab goes to the background. Scrolling deliberately does *not* wake it,
  so reading the rest of the page costs the scene nothing.
- **Adaptive quality, measured not guessed.** `PerformanceMonitor` watches real
  frame rate and steps the tier down (`high → medium → low`), which cuts render
  scale, dust count, environment resolution, bloom resolution and finally
  post-processing altogether. Downgrades are one-way: an oscillating tier looks
  worse than the lower of the two. Tiers live in [lib/scene-quality.ts](lib/scene-quality.ts).
- **A pixel budget, not just a DPR cap.** Render scale is derived from
  `pixelBudget / (width × height)`, so a 4K panel is not asked for four times
  the work a 1080p one gets. Quantised to 0.05 so a window drag cannot thrash
  the renderer.
- **84 meshes → 5 draw calls.** The mandala is one `InstancedMesh` per
  geometry+material pair. The per-petal draw-in writes instance matrices for
  its first ~2.6s (`DRAW_IN_END`) and then never touches the buffer again.
- **No layout reads in the scroll handler.** `scrollHeight`/`clientHeight` are
  measured on resize and by a `ResizeObserver` on `body` (the gallery filter
  changes page height). Reading them per scroll event forces a synchronous
  layout, which shows up as "scrolling is janky" rather than as a slow frame.
- **Three lights, not five**, and coarser tessellation (14 curve / 2 bevel
  segments) — the same shape at a third fewer triangles across 84 instances.
- Three.js sits behind `dynamic(..., { ssr: false })`, and the canvas mounts
  250ms after hydration so the hero text gets its paint before shader
  compilation competes for the main thread. It fades in.

### Responsive framing

The field of view is vertical, so a narrow screen sees a narrow slice of the
world. At scale 1 an iPhone showed only **39% of the mandala's radius** — a
cropped, anonymous middle rather than a mandala.

`heroFit(aspect)` in [lib/henna-geometry.ts](lib/henna-geometry.ts) scales the
composition by the visible half-width and drops it toward the lower half of the
hero so the headline is not fighting it for pixels. A wide screen returns
exactly `{ scale: 1, y: 0 }` — the framing it was drawn for is left alone,
bleeding off the top and bottom on purpose.

| Viewport | scale | y | mandala visible |
|---|---|---|---|
| desktop 16:9 / laptop / phone landscape | 1.000 | 0 | 100% |
| iPad portrait | 0.576 | −1.10 | 100% |
| iPhone SE | 0.466 | −1.39 | 100% |
| iPhone 14 | 0.383 | −1.60 | 100% |

Tests assert the whole mandala is on screen at every one of those aspect
ratios, that scaling is monotonic and never upscales past the design, and that
a wide screen is byte-for-byte unchanged.

### When it cannot run

- `prefers-reduced-motion` switches to `frameloop="demand"`: the mandala is
  drawn once, fully formed, with no rotation, float, parallax or scroll link.
- No WebGL, or a lost context: the canvas is never mounted (or is unmounted),
  leaving the CSS radial gradient that the wrapper paints anyway. It is built
  to stand alone, so there is no blank state.

## Before it goes live

1. **Photos.** The gallery renders seeded SVG mandalas from
   [components/mandala-art.tsx](components/mandala-art.tsx) as stand-ins.
   Swap the `<MandalaArt>` call in `Gallery` for `next/image`, fill in `src`
   on each `gallery` entry, then delete that file.
2. **Copy.** The hero trust row and service blurbs are written as brand
   promises, not verified facts — read them through and adjust. They are
   marked with `ponytail:` comments.
3. **Domain.** Set `metadataBase` in [app/layout.tsx](app/layout.tsx) once
   there is a URL, so Open Graph tags resolve absolutely.

## Dashboard

`/admin`, single password, built for a phone.

**Enquiries** — everything the booking form receives, ordered unanswered-first
then by event date. Each card shows how soon the event is ("in 3 days" in gold
under a week), a status you can move through new → contacted → booked →
closed, one-tap call and WhatsApp reply pre-filled with their name and date,
and a private notes box saved on blur. Filter chips carry live counts.

**Gallery** — upload photos (multiple at once, straight from a phone), caption
them, set the category, hide one without deleting it, reorder, delete. The
public grid follows this order. Deleting a row also deletes the stored file, so
you are not billed for orphans.

### How it is put together

- **Enquiries are captured *and* still open WhatsApp.** The form opens WhatsApp
  synchronously inside the click — after an `await` the browser stops treating
  it as a user gesture and blocks the popup — then saves in the background. If
  the save fails, the visitor is told WhatsApp still has their message. The
  message delivery path never depends on the database being up.
- **A phone number is now required.** Without it a dashboard row is not a
  contact you can act on. It is validated (7–15 digits, any format) and
  `waNumber()` adds `+91` only to a bare 10-digit number.
- **Authorisation is at the data boundary.** `assertAdmin()` runs inside every
  Server Function, not just in the layout: Next's own docs are blunt that
  actions are reachable by direct POST. Pages call `requireAdmin()` again
  before querying. Verified against expired, wrong-secret, tampered and
  garbage cookies — all redirect to login.
- **Sessions are HMAC-signed cookies**, httpOnly/sameSite/secure, with the
  expiry inside the signature so it cannot be extended by editing the cookie.
  No auth library. [lib/session-token.ts](lib/session-token.ts) is pure and
  tested.
- **Login is rate limited in Postgres** (8 per 15 min), keyed by IP address —
  a global counter would let any stranger lock the owner out — and only
  failures are charged, so signing in repeatedly cannot lock you out either.
- **MongoDB Atlas, official driver.** The client is cached at module scope so
  it survives warm invocations — reconnecting per request is what exhausts an
  Atlas connection limit — with a small pool (one serverless instance serves
  one request) and an 8s server-selection timeout so a bad URI fails fast
  instead of hanging. `ObjectId` is not serialisable across the server/client
  boundary, so every query converts to plain objects with string ids on the
  way out.
- **Rate-limit rows expire themselves** via a TTL index, which replaced a
  manual cleanup `DELETE` that used to run on every throttle check.
- **Photos upload browser → Cloudinary directly**, with a *signed* ticket from
  a Server Function. A phone photo is far past the request body limit a
  serverless function gets, so the file never passes through the app; the
  signature covers `folder`, `timestamp` and `allowed_formats`, so the browser
  cannot widen the formats or write outside the gallery folder. An unsigned
  upload preset would let anyone on the internet fill the account. Deleting a
  photo calls `destroyImage` so storage is not billed for orphans.
- **Dashboard queries are caught in the page**, not by an `error.tsx`
  boundary. The throw happens while the shell is still rendering, so the
  boundary never got a chance and a failed connection served a raw 500 —
  verified against a real Atlas auth failure. Each page catches its own query
  and renders [data-error.tsx](app/admin/\(dash\)/data-error.tsx), which names
  the three likely causes and shows the driver's message in development only.
- **`/admin` is `force-dynamic`.** Without it the rendering mode depended on
  whether `AUTH_SECRET` was set at build time — absent, the session check
  short-circuits before reading cookies and the route prerenders a redirect to
  login that adding the variable later would not dislodge.
- **The public gallery is cached and tagged**, so the home page keeps its
  static prerender; admin edits call `updateTag("gallery")` (Next 16's
  immediate-expiry counterpart to `revalidateTag`, which is
  stale-while-revalidate) so a change is live at once.
- `robots.ts` disallows `/admin`, and the segment sets `robots: noindex`.

## Themes

Dark is the designed default; light is a full second palette, not a filter.

- **Toggle** in the public nav and the dashboard header. It shows the icon of
  the theme you would get, not the one you are in.
- **`data-theme` on `<html>` is the only state.** CSS reads it, a
  `MutationObserver` in `useTheme()` observes it. No provider, no context, no
  second copy that could drift from what is on screen.
- **No flash, and it works with JS off.** The light tokens are declared twice:
  under `prefers-color-scheme` (guarded by `:not([data-theme="dark"])`) so the
  stylesheet alone is already correct, and under `[data-theme="light"]` so an
  explicit choice beats the system.
- **The switch animates** with the View Transitions API — a circular wipe out
  from the toggle you pressed. Where that is unsupported (Firefox today), a
  `.theme-switching` class turns on a colour transition for the 450ms of the
  swap only; leaving it on permanently would tax every hover and scroll after.
  `prefers-reduced-motion` skips both.
- **Every pair is contrast-checked**: 4.5:1 for text, and `line-strong` gives
  form controls the 3:1 that WCAG 1.4.11 wants (the decorative `line` was
  1.35:1, which is fine for a divider and not for an input).
- **The 3D scene follows.** Background and fog colours are *eased*, not
  snapped, and the light theme gets its own look: softer lights, lower
  metalness (a fully metallic surface reflecting a dim environment reads black
  on ivory), almost no bloom, and the scene drops to 30% opacity so the mandala
  is a watermark rather than a competitor for the headline.

Token names are roles, not colours — `ink` is the page ground and `ivory` the
primary text, in both themes. See the comment at the top of
[app/globals.css](app/globals.css).

## Pages that had no styling

The framework's fallbacks were plain, unthemed HTML. All three are now real
pages: [not-found.tsx](app/not-found.tsx) (a 404 with a mandala that draws
itself), [(dash)/loading.tsx](app/admin/\(dash\)/loading.tsx) (skeletons
shaped like the real cards, so nothing jumps when Mongo answers) and
[global-error.tsx](app/global-error.tsx) (self-contained inline styles, since
it replaces the root layout and cannot assume the CSS loaded).

## Mobile-first notes

Built up from 375px rather than trimmed down from desktop.

- Padding, type and card spacing scale up at `sm`/`lg`; the phone gets the
  tightest values, not desktop values squeezed.
- Every interactive target is at least 44px, including footer and card text
  links (`min-h-11`), and form inputs are `text-base` so iOS does not zoom on
  focus. Pinch zoom is never disabled.
- `color-scheme: dark` makes the native select arrow, date picker, scrollbars
  and autofill render dark instead of light-on-dark.
- The floating "Book now" button gets out of the way when the booking form is
  on screen — it was floating directly over the form's own submit button.
- The mobile menu scrolls (`max-h-[calc(100dvh-1.5rem)]`); five 64px rows plus
  buttons overflowed a landscape phone with nothing to scroll.
- `overflow-x: clip` on `html`, not `hidden` on `body` — `hidden` would make
  `body` a scroll container and break `scroll-padding-top` for anchor links.

The booking form has no backend by design: it validates, then composes a
WhatsApp message the visitor sends themselves. Nothing is stored.
