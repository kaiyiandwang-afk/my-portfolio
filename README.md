# Kaiyi's Café

Kaiyi Wang's portfolio: one explorable 3D café at a window seat, where every object opens part of her work.
Built with Vite, React, TypeScript and React Three Fiber.

```bash
npm install
npm run dev
```

## Edit the text

Everything visitors read lives in [`src/content.ts`](src/content.ts): the About conversation, projects, research,
experience, links, and the email address. Search that file for `TODO(kaiyi)` to find what still needs a decision.

## Add artwork

1. Put images in `public/art/`. JPG, PNG or WebP all work.
2. In `src/content.ts`, update the `art.images` list. Each entry takes a `src`, an `alt` description, and an optional `title`:

   ```ts
   { src: '/art/my-painting.jpg', alt: 'Ink drawing of a heron', title: 'Heron' },
   ```

3. Delete the `art-0X.svg` placeholders you no longer use.

## Add cat photos

Same steps, using `public/cats/` and the `cats.images` list. Each entry takes a `src`, an `alt`, and an optional `caption`.

## Replace the résumé

Overwrite `public/Kaiyi_Wang_Resume.pdf`, keeping the same filename. If you rename it, update `resume.href` and
`resume.filename` in `src/content.ts`. Then check that any facts that changed are also updated in `src/content.ts`,
because the site's text doesn't read from the PDF.

## Tune the scene

Colors, light intensities, where every object sits, and the camera positions all live in [`src/config.ts`](src/config.ts).
The cat's coat colors and fur are in the `CAT` block there; its tabby markings are in [`src/shaders/fur.ts`](src/shaders/fur.ts).

While running `npm run dev` there's a **Look** panel in the top right for tuning lights, bloom, god rays and the color
grade live, plus a frame rate readout at the top. "Log values" prints your settings so you can paste them into `LOOK` in
`config.ts`. Neither ships to production. Add `?clean` to the URL to hide them for screenshots.
Add `?hits` to see the invisible click targets as wireframes; each one is the `hit` box in `INTERACTIVES` in `config.ts`,
alongside its close-up camera pose. `phoneCloseUp` overrides that pose on phones.

Kaiyi's face is painted in [`src/shaders/paintFace.ts`](src/shaders/paintFace.ts), her hair is built in
[`src/objects/kaiyiHair.ts`](src/objects/kaiyiHair.ts), and her body and pose are in
[`src/objects/Kaiyi.tsx`](src/objects/Kaiyi.tsx).

Steam and the hotpot's broth are shaders in [`src/shaders/steam.ts`](src/shaders/steam.ts) and [`src/shaders/broth.ts`](src/shaders/broth.ts). Kaiyi's habits (typing, thinking, looking out of the window) are `HABITS` in [`src/objects/Kaiyi.tsx`](src/objects/Kaiyi.tsx).

The night look is the `NIGHT` block in `src/config.ts`. Each drawer's contents are in [`src/ui/sections`](src/ui/sections), and their styles in [`src/ui/panels.css`](src/ui/panels.css).

The cat's route (where it naps, walks and jumps) is the `ROUTE` list in [`src/objects/catBrain.ts`](src/objects/catBrain.ts); its poses
and gait are in [`src/objects/Cat.tsx`](src/objects/Cat.tsx).

`npm run build && npm run preview` serves the production build, which is the way to check the site without the dev tools.

## Layout

| Folder | What's in it |
|---|---|
| `src/scene` | The canvas, camera, lighting, room shell and the view out the window |
| `src/objects` | Every prop in the café, one file per interactive object |
| `src/ui` | HTML on top of the scene, and the design tokens |
| `src/state` | The zustand store |
| `reference` | The brief, the résumé, v1 and the reference images. Not served to visitors. |

## Sound

All the audio is synthesized in [`src/audio/synth.ts`](src/audio/synth.ts), so there are no files to host or license. To use a real track instead, decode it
into an `AudioBuffer` and start it where `renderLofi` is used in [`src/audio/mixer.ts`](src/audio/mixer.ts).

## Quality

[`src/state/quality.ts`](src/state/quality.ts) picks a starting quality for the device, then steps down on its own if frames run slow. Add `?hq` to lock it at full quality.

## Plain text

`?text` shows every word of the site as a plain page, which is also what appears without JavaScript or WebGL. It's written into the HTML at build time from `content.ts`,
so editing that file updates it, and screen readers and crawlers get it too.

## Deploy

The site is ready for [Vercel](https://vercel.com): import the repository, or run `npx vercel`. Settings are in [`vercel.json`](vercel.json).

Before going live:
- Once the address is known, make `og:image` in `index.html` a full URL and add `og:url` and a canonical link.
- Resolve the `TODO(kaiyi)` notes in `src/content.ts`, and replace the placeholder images in `public/art` and `public/cats`.
