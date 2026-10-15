# VANTA

VANTA is a production Next.js experience for the fictional MONOLITH electronic-music instrument.

Implementation is governed by the approved [VANTA production specification](docs/specification/README.md). Work is planned and tracked in [GitHub Issues](https://github.com/charley81/vanta/issues/40); implementation tickets reference the specification's stable requirement IDs.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Production checks

```bash
pnpm check
```

The production application is qualified through Netlify's Node-backed Next.js integration as specified in the Handoff Baseline.
