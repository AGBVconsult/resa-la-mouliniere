This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

Every merge to `main` triggers a Vercel deployment whose Build Command is `npx convex deploy --cmd 'npm run build'`. This pushes the Convex functions/schema to the `accomplished-lemur-852` production deployment before building the Next.js app, so the backend and frontend stay in sync. The `CONVEX_DEPLOY_KEY` environment variable (Production scope, Vercel project settings) is required for this step.

If a merge to `main` does not show up as a Production deployment in Vercel (missed GitHub webhook), redeploy from the Vercel dashboard (Deployments → latest Production → ⋯ → Redeploy, or Create Deployment on `main`) or merge any new commit to `main`.

## Admin push notifications (Web Push)

New pending reservations trigger a Web Push notification to every device subscribed from the mobile admin app (`/admin-mobile/activity` → Notifications → Activer). On iPhone the app must be added to the Home Screen (iOS 16.4+). Requires these environment variables on the Convex deployment (Dashboard → Settings → Environment Variables):

- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` — generate with `npx web-push generate-vapid-keys`
- `VAPID_SUBJECT` — contact URI, e.g. `mailto:info@example.com`

Changing the keys invalidates existing subscriptions: re-enable notifications on each device.
