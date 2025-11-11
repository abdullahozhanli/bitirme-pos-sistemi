From now on, make all web design and layout changes fully responsive for mobile, tablet, and desktop.

Use CSS Grid/Flexbox, media queries, or responsive Tailwind utilities.

Prevent horizontal scrolling and layout overflow.

Audit new/changed components at widths 360px, 768px, 1024px, 1440px before finalizing.


Project-level standing rule (for Cursor sessions)
- Reference this file in prompts: use @RESPONSIVE_RULES.md to pull the rule into context each session.


Minimum technical baseline (one-time)

HTML projects (add to index.html):

<meta name="viewport" content="width=device-width, initial-scale=1" />


Global CSS (add to your base stylesheet):

html{box-sizing:border-box}
*,*:before,*:after{box-sizing:inherit}
img,video,canvas{max-width:100%;height:auto}
table{width:100%;overflow:auto;display:block}
:root{--maxw:1200px}
.container{max-width:var(--maxw);margin-inline:auto;padding-inline:clamp(12px,4vw,24px)}


Tailwind optional setup (Vite + React example)

npm i -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

tailwind.config.js → set content to src paths. In index.css add at top:

@tailwind base;
@tailwind components;
@tailwind utilities;


Quick checklist (paste into Cursor as well):
- Test at 360/768/1024/1440 px widths.
- Horizontal scroll: document.documentElement.scrollWidth === window.innerWidth.
- No fixed pixel widths on cards/images; prefer width:100%, max-width, minmax().
- Typography scales with clamp(), e.g., clamp(14px, 1.6vw, 18px).
- Grid example:

.grid-auto {
  display:grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: clamp(12px, 2vw, 24px);
}


Pattern to prevent overflowed layouts
- Remove rigid fixed-width containers.
- For long text:

.wrap {word-break: break-word; overflow-wrap: anywhere;}


Permanent rule (Kalıcı kural)
- You must keep everything fully responsive for mobile (≥360px), tablet (≥768px), desktop (≥1024px), and large (≥1440px).
- Use React + Tailwind + shadcn/ui where applicable. Prefer CSS Grid/Flexbox and Tailwind responsive utilities.
- Prevent horizontal overflow. No layout clipping at any breakpoint.
- Audit at 360/768/1024/1440 widths before finishing any step.
- Provide skeleton, empty, and error states for every data block by default.


