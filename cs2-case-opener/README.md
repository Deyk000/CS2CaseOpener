# CS2 Case Opener Simulator

## Run

From this folder:

```bash
npm run dev
```

Or from the workspace root (`c:/CS2CaseOpener`):

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Check Images

This project expects image files in `public/assets/images/` while developing.
Run the built-in checker to see which case or skin PNGs are still missing:

```bash
npm run check:images
```

## Download Images

If you add `download-images.js` to the project root, you can run:

```bash
npm run download:images
```

It writes image files to both `public/assets/images/` and `dist/assets/images/` so Vite dev and built output stay in sync.

## Image Folders

- Case images: `public/assets/images/cases/`
- Skin images: `public/assets/images/skins/`
- Placeholders: already included in `public/assets/images/`
