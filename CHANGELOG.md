# Changelog

This project follows Keep a Changelog and Semantic Versioning.
本项目遵循 Keep a Changelog 与 Semantic Versioning。

---

## [1.7.0] - 2026-05-20

### Added

- XVM Pro tier: Free / Trial / Pro states, a 14-day local trial, Creem-backed Pro license checks through a Cloudflare Worker proxy, and Trial/Pro-only feature gating.
- Hot-only filtering: hide low-velocity tweets using views-per-minute and absolute view thresholds, with separate short-post and long-article settings.
- Hot-only scope controls: Home, Lists, Profiles, and Tweet detail pages can be enabled independently from the popup.
- X List member filtering: add X List URLs or IDs, fetch real List members through authenticated X GraphQL, cache members locally, and filter timelines to show only saved List members.
- Real X List metadata: fetch List name, description, owner, member count, and subscriber count via `ListByRestId`; members still come from `ListMembers`.
- Floating leaderboard controls: compact side-by-side switches for Hot only and List members, synced with the popup. Free or expired users see disabled switches with Pro badges; Trial/Pro users can toggle directly from X.
- List member UX safeguards: visible loading/progress state, fetch duration, classified error messages, 5 lists / 5,000 members per list / 10,000 total member limits, stale-cache handling, and busy-state serialization.

### Changed

- Popup filter controls now use consistent switch styling for binary feature toggles while preserving checkboxes for multi-select settings.
- The List member filter defaults to Tweet detail scope only, so users must opt into Home/List/Profile filtering.
- The floating leaderboard's Hot-only switch was resized to match the header text scale.
- The List URL input is full-width and handles long URLs with ellipsis instead of crowding the layout.
- Short/Long rate-filter tabs now have a reliable selected state and keyboard focus styling.

### Security

- Removed page-script storage write surfaces for List member settings. The page cannot mutate `xvm_list_member_filter_v1` via `window.postMessage`.
- The floating List member switch writes storage only from the isolated extension bridge on trusted real UI interaction.
- Cross-filter restore logic now preserves the other filter's hide marker, so Hot-only and List-member filtering do not accidentally reveal each other's hidden tweets.
- Pro license checks keep the Creem API key out of the extension package.

### Internal

- Added contract tests for List member GraphQL endpoints, metadata parsing, storage sync, scope defaults, switch rendering, i18n lock-step, dist sync, and cross-filter safety.
- Synced source and `dist/` for the v1.7.0 extension package.

---

## [1.7.0] - 2026-05-20 (中文)

### 新增

- XVM Pro 套装: Free / Trial / Pro 三态、14 天本地试用、通过 Cloudflare Worker 代理 Creem license 校验, 并对 Trial/Pro 功能做统一 gating。
- 仅看热帖: 按 views/min + 总浏览量双阈值隐藏低流速推文, 短推和 X Article 长文可分开设置。
- 仅看热帖作用域: 首页、List、博主主页、推文详情页可在 popup 中独立开关。
- X List 成员过滤: 支持添加 X List URL 或 ID, 通过 X GraphQL 抓真实成员并本地缓存, 过滤时只显示已保存 List 成员的推文。
- 真实 List 信息: 通过 `ListByRestId` 获取 List 名称、描述、创建者、成员数、订阅数; `ListMembers` 只负责成员列表。
- 悬浮流速榜控制: 在 X 页面悬浮面板中并排显示“仅看热帖”和“仅看 List 成员”开关, 与 popup 双向同步。Free/过期用户显示灰色禁用 + Pro 角标, Trial/Pro 可直接切换。
- List 成员抓取体验: 抓取中提示、进度、耗时、错误分类、5 个 List / 单 List 5,000 成员 / 总 10,000 成员上限、stale cache 保护和 busy 串行化。

### 变更

- popup 中二元功能控件统一为 switch, 多选设置继续保留 checkbox。
- List 成员过滤默认只作用于推文详情页, 首页/List/主页需用户主动开启。
- 悬浮榜“仅看热帖”开关缩小到与标题文字更匹配。
- List URL 输入框改为 full-width, 长 URL 使用省略显示, 不再挤压布局。
- 流速过滤短推/长文 tab 补齐可靠选中态和键盘焦点样式。

### 安全

- 移除页面脚本写入 List 成员设置的 postMessage 通道。网页脚本不能再通过 `window.postMessage` 修改 `xvm_list_member_filter_v1`。
- 悬浮面板 List 开关只允许 isolated extension bridge 在真实用户点击时写 storage。
- 仅看热帖与 List 成员过滤的恢复逻辑互不污染, 不会误恢复对方隐藏的推文。
- Pro license 校验继续通过 Worker 代理, Creem API key 不进入扩展包。

### 内部

- 新增 List GraphQL endpoint、metadata 解析、storage 同步、默认作用域、switch 渲染、i18n、dist sync 与跨过滤器安全合同测试。
- 已同步 source 与 `dist/` 作为 v1.7.0 打包基础。

---

## [1.6.13] - 2026-05-19

### Fixed

- Fixed normal image zoom loss on multi-image tweets by making the image viewer active-swipe aware.
- Fixed the medium-tall image ratio gap after the long-image viewer threshold moved from 2.0 to 3.0.

### Internal

- Added active-swipe and threshold-sync contract tests.

---

## Earlier versions

See git tags for v1.6.x and v1.5.x releases.
