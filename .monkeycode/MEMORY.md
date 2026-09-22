# User Instruction Memory

This file records user instructions, preferences, and teachings for reference in future interactions.

## Format

### User Instruction Entry
User instruction entries should follow this format:

[User Instruction Summary]
- Date: [YYYY-MM-DD]
- Context: [Mentioned scenario or time]
- Instructions:
  - [Content of user teaching or instruction, described line by line]

### Project Knowledge Entry
Entries discovered by the Agent during task execution should follow this format:

[Project Knowledge Summary]
- Date: [YYYY-MM-DD]
- Context: Discovered by Agent while performing [specific task description]
- Category: [Operations & Deployment|Build Methods|Testing Methods|Troubleshooting & Debugging|Workflow & Collaboration|Environment Configuration]
- Instructions:
  - [Specific knowledge points, described line by line]

## Deduplication Strategy
- Before adding a new entry, check for similar or identical instructions.
- If a duplicate is found, skip the new entry or merge it with the existing one.
- When merging, update the context or date information.
- This helps avoid redundant entries and keeps the memory file tidy.

## Entries

[Project Knowledge Summary]
- Date: 2026-09-22
- Context: Discovered by Agent while generating the tri-platform release workflow (.github/workflows/release.yml)
- Category: Operations & Deployment
- Instructions:
  - 发布 workflow 仅通过 GitHub Actions 手动触发（workflow_dispatch），需输入 tag 才会执行 release 任务。
  - Web 产物由 `npm --prefix web run build` 生成到 `web/dist`；桌面端由 `npm --prefix electron run dist -- --win/--mac` 生成到 `electron/release`。
  - Android 端 CI 只能产出 uni-app 应用资源包（`npm --prefix mobile run build:app` → `mobile/dist/build/app`），APK 需用 HBuilderX / DCloud 云打包或离线 SDK 完成，无法在纯 Linux runner 直接编译；`mobile/src/manifest.json` 的 `appid` 为空时也不具备云打包条件。
