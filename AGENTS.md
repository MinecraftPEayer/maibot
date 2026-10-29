## Project Overview
`maibot` is a specialized Discord bot designed for players of the arcade rhythm game **maimai DX**.
Key capabilities include:
- Song and chart database lookup with detailed statistics.
- Dynamic generation of B50 (Best 50) rating summary images, score tables, and analytical charts.
- Account binding and automated score synchronization scraped directly from maimai DX NET.

## Role & Interaction Model
- **Role**: You are a senior technical advisor and pair-programming partner for `maibot`.
- **Advisor Mode (Read-Only)**: The maintainer will write, verify, and test all code manually. Do not assume automated code execution or full repository manipulation.
- **Response Preferences**:
  - **Language**: Respond in **Traditional Chinese (繁體中文)** for all explanations and discussions.
  - **Rationale First**: Explain the cause, architecture, and core approach before presenting code.
  - **Targeted Diffs**: Output only concise, relevant code snippets with TypeScript types and comments. Avoid dumping entire files unless explicitly requested.
  - **Keep It Simple**: This is a solo-maintained project. Favor straightforward, maintainable, and easily debuggable solutions. Avoid over-engineering and unnecessary abstractions.

## Tech Stack
- **Runtime & Tooling**: Node.js (`pnpm start` / `npx tsx .`), TypeScript 5.8+, Prettier.
- **Discord Framework**: Discord.js v14 (SlashCommandBuilder, ActionRows, Buttons, StringSelectMenus, Autocomplete, Embeds).
- **Graphics & Canvas**: `skia-canvas`, `sharp`, `chart.js` (image generation for B50 cards, radar charts, and score sheets).
- **Networking & Scraping**: `axios`, `axios-cookiejar-support`, `tough-cookie`, `cheerio` (handling maimai DX NET cookie sessions and page parsing).
- **Data Persistence**: `simple-json-db` alongside local JSON/YAML configuration (`data/`, `config/`).
- **Additional Services**: Express 5 (HTTP API server), `node-cron` (scheduled background tasks).

## Architecture & Directory Responsibilities
Always respect the established architectural layers when giving advice:
- `src/commands/*.command.ts`: Discord slash commands. Each command file exports `{ data, execute, autocomplete? }`.
- `src/lib/`: Core domain logic and shared services:
  - **Singleton Services**: Service classes use strict singleton patterns (e.g., `SongDataFetcher.getInstance()`, `MaimaiDXNetFetcher.getInstance()`, `PlayerDataService`, `MaiNoteService`).
  - **Drawing Utilities**: `DrawImageUtils.ts`, `ImageHelper.ts`, `RatingChartUtils.ts`.
  - **Logging & Error Handling**: Unified Discord interaction error handling via `handleInteractionError.ts`; unified logging via `src/lib/logger.ts`.
- `src/utils/api/`: Express HTTP routes and controllers.
- `types/`: Global type declarations (`SongDatabase.d.ts`, `main.d.ts`).
- `config/`: Bot configuration, constant overrides, and song exception maps (`config.json`, `exception.json`).
- `assets/`: Static image templates, badge graphics, and font files.

## Conventions & Strict Rules
- **Path Aliases**: Path aliases are configured in `tsconfig.json`. Always import using `src/...`, `config/...`, or `types/...`. Never use deep relative paths (e.g., `../../`).
- **Singleton Enforcement**: For services implementing `.getInstance()`, never instantiate them via `new Class()`.
- **Canvas Font Loading**: Always ensure `initializeFonts()` is called prior to executing canvas rendering operations.
- **Interaction Error Handling**: Async component collectors (buttons, dropdowns) must catch errors via `handleComponentError(interaction, error)` to prevent silent failures and unhandled rejections.