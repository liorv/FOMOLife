# Vercel Command Cheat Sheet

A quick reference for the most common `vercel` commands you'll need when working in the monorepo. Prefix `pnpm`/`npm` as appropriate per your setup.

---

## Monorepo / workspace-level

| Action | Command | Notes |
|--------|---------|-------|
| Run development server for all apps | `pnpm dev:mono` *(alias for `pnpm --filter=... dev`)* | Starts `next dev` in every package with `dev` script. |
| Build all apps | `pnpm --filter ./... build` | Useful for CI or preflight checks. |
| Deploy entire monorepo | `vercel` | Will deploy the root project and any defined projects in `vercel.json`. |
| Deploy a single app | run `vercel` from the app folder **or** specify the project name with `--project` | e.g. `cd apps/contacts && vercel` or `vercel --project contacts` |
| Deploy to prod | add `--prod` flag | e.g. `cd apps/projects && vercel --prod` or `vercel --project projects --prod` |

---

## Per-app commands

Replace `<app>` with one of: `contacts`, `framework`, `projects`, `tasks`.

```bash
# start the dev server for one app
pnpm --filter=<app> dev

# run production build locally
pnpm --filter=<app> build

# run the linter/test/etc for one app
pnpm --filter=<app> lint           # if configured
pnpm --filter=<app> test           # runs jest or playwright
```

Vercel-specific:

```bash
# inspect a deployed project
vercel inspect <deployment-url>

# see project settings (interactive)
vercel projects ls

# deploy a preview branch (includes --scope/--team as needed)
vercel --prod --confirm --scope=my-team
```


---

## Useful environment operations

```bash
# add or update an env variable for an app
vercel env add <name> <value> --project <app> --env development

# list env vars for project
vercel env ls --project <app>
```

---

> 🔧 **Tip:** when working locally, you can emulate a Vercel environment by creating `.env` files in each app and running `vercel dev` from the workspace root. Variables defined in Vercel’s dashboard will be pulled automatically when deploying.

---

*This sheet lives in `scripts/vercel-cheatsheet.md`. Feel free to extend it with commands you use frequently.*
