# Tabby SSH Credential Hub - Agent Guidelines

## Project Overview

This is a Tabby plugin for managing SSH credentials. Tabby is a terminal emulator built with Electron + Angular.

## Tech Stack

- **Runtime**: Tabby 1.0.230 (Angular 15.2.6, ngx-toastr 16.0.2)
- **Build**: Webpack 5 + @ngtools/webpack
- **Language**: TypeScript 4.9
- **Package Manager**: npm

## Key Commands

```bash
npm install          # Install dependencies
npm run build        # Build plugin to dist/
npm run watch        # Watch mode for development
```

## Dependency Version Requirements

Critical: `ngx-toastr` must be `^16` to match Tabby 1.0.230's version. Mismatched versions cause runtime errors.

## Tabby Plugin Architecture

- Plugins are Angular modules exported as default
- Must include `"tabby-plugin"` in `package.json` keywords
- Third-party plugins load from `%APPDATA%\tabby\plugins\`
- Tabby has two plugin types:
  - **Built-in plugins** (e.g., tabby-ai-assistant): shipped with Tabby binary
  - **Third-party plugins**: loaded from plugins directory

## Plugin Loading

Tabby's built-in plugins work out-of-box. Third-party plugins require:
1. Copy plugin folder to `%APPDATA%\tabby\plugins\`
2. Or use "Load extension from folder" in Tabby settings

## GitHub Actions CI/CD

- Workflow: `.github/workflows/build.yml`
- Auto-releases on push to main branch
- Version format: `v0.{run_number}`

## Common Issues

1. **Plugin not detected**: Check plugin is in correct directory and has `index.js` + `package.json`
2. **Toast errors**: `Cannot read properties of undefined (reading 'clear')` may be Tabby-internal issue, not plugin-related
3. **JIT mode**: `jitMode: true` in webpack config needed for development

## File Structure

```
src/
├── index.ts           # Plugin entry - NgModule export
├── config.ts          # ConfigProvider
├── profiles.ts        # ProfileProvider
├── settings.ts        # SettingsTabProvider
├── components/        # Angular components
└── services/          # Angular services
```
