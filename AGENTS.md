# Streamers Center Agent Instructions

This repository is the production Streamers Center application. Work inside this existing project only.

## Repository Root

The repository root is this directory. Confirm it before editing by checking for `.git`, `package.json`, `vite.config.js`, `src/`, `api/`, `migrations/`, and `vercel.json`.

Do not create a second React, Vite, Next.js, Supabase, backend, demo, or replacement app inside this repository.

## File Safety

- Modify existing routes, components, hooks, services, API handlers, migrations, and styles in place.
- Do not place final implementation files in temp folders, home folders, generated demos, or another repository.
- Do not rename, move, delete, or replace important files unless required by the task.
- Reuse existing project architecture, naming, routing, authentication, role, Supabase, and styling patterns.
- Preserve production behavior and saved user data compatibility.

## Implementation Rules

- Inspect before editing.
- Trace connected components, state, services, API routes, database logic, permissions, preview rendering, and OBS/browser-source rendering before changing shared behavior.
- Implement requested features end to end.
- Do not use mock data, fake API responses, placeholder handlers, TODO-only implementations, or disconnected UI controls unless explicitly requested.
- Do not hardcode user-specific data, IDs, URLs, roles, prices, colors, or configuration that should come from settings, environment variables, Supabase, or admin configuration.
- Add Supabase database changes through migration files when needed.
- Fix root causes instead of hiding errors, disabling checks, or removing functionality.

## Widget Appearance Editor

The strict widget-editor development rules are maintained in:

`DOCs/STREAMERS_CENTER_STRICT_WIDGET_EDITOR_DEVELOPMENT_RULES.md`

When working on the Overlay Center appearance editor, follow that document. In particular:

- Use the existing appearance editor and V2 appearance infrastructure.
- Store appearance by widget instance, widget type, widget style, element ID, and property.
- Each widget style must declare its own editable element schema.
- Only show controls supported by the selected element.
- Every shown control must update preview, saved configuration, reload behavior, and OBS/browser-source output.
- Do not use one universal control list for every element.
- Do not allow style leakage between parent/child elements, styles, or widget instances.

## Validation

Run relevant checks after changes. Available scripts include:

- `npm.cmd run build`
- `npm.cmd run test:appearance`
- `npm.cmd run test:appearance-editor`
- `npm.cmd run test:appearance-v2`
- `npm.cmd run test:widget-pilot`
- `npm.cmd run validate:widgets`

Resolve errors caused by the change before claiming completion. If a check cannot be run, state why.

## Communication

At the start of coding work, report:

- detected repository root
- relevant existing files/routes
- intended implementation location

At completion, report:

- files created
- files modified
- migrations added
- checks executed
- remaining limitations or manual configuration
