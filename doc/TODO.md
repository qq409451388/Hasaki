# League Hasaki需求说明书

## 概述
- 目标：实现一个基于英雄联盟客户端 LCU API 的桌面工具，提供选人辅助、战绩分析、快捷操作与实用工具；支持多窗口与模块化扩展。
- 平台与分发：Windows 客户端，支持无管理员运行；提供安装包与自动更新策略。
- 范围：与本地 LoL 客户端交互（LCU/Live Client/ Riot Client），不涉及游戏内存注入或改动游戏数据。
- 付费内容(一期不做，需要预留设计)：软件是一个本地软件，但是提供了一些付费功能，如果使用付费功能，需要购买对应的许可证。需要实现可以完全离线的本地验证方案。

## 用户角色（启动模式）
- 体验模式：普通玩家：查看战绩、选人阶段快捷操作、皮肤选择、简单自动化。
- 专业模式：付费用户/主播：更详细的战绩分析、标记玩家、辅助窗口操作、快捷键。

## 系统架构与边界
- 主进程：管理窗口、与 LCU/Riot Client/Live Client 建立连接、持久化配置、日志与模块（Shard）生命周期。
- 渲染进程：主窗口、辅助窗口、OP.GG 等 UI；通过 IPC 与主进程交互；Pinia/Mobx 同步状态。
- 数据源：
  - LCU（127.0.0.1:动态端口，自签名证书）：战绩、选人、召唤师、段位等接口（参考 [league-client](file:///d:/dev/TraeProjects/LeagueAkari/src/shared/http-api-axios-helper/league-client/index.ts)）。
  - Live Client Data：局内实时数据（参考 [game-client](file:///d:/dev/TraeProjects/LeagueAkari/src/shared/http-api-axios-helper/game-client/index.ts)）。
  - Riot Client：登录账户信息等（参考 [riot-client](file:///d:/dev/TraeProjects/LeagueAkari/src/main/shards/riot-client/index.ts#L127-L145)）。
  - SGP：跨区战绩与详细数据的兼容层（参考 [sgp/index.ts](file:///d:/dev/TraeProjects/LeagueAkari/src/main/shards/sgp/index.ts#L173-L238)、[sgp/data-mapper.ts](file:///d:/dev/TraeProjects/LeagueAkari/src/main/shards/sgp/data-mapper.ts#L1-L31)）。

## 功能需求
- 连接与初始化
  - 自动发现并连接当前唯一运行的 LoL 客户端；支持手动断开与重连。
  - 读取 LCU 启动参数，构造 HTTPS Axios（忽略证书）与 Basic 认证头（参考 [league-client/index.ts](file:///d:/dev/TraeProjects/LeagueAkari/src/main/shards/league-client/index.ts#L551-L585)）。
  - 验收：连接成功后可成功请求 `/lol-summoner/v1/current-summoner`。

- 主窗口
  - 战绩查询（一个目标用的对应窗口内的一个标签）
    - 战绩页：分页拉取战绩、详细单局、统计分析、遇见过的玩家（参考 [MatchHistoryTab.vue](file:///d:/dev/TraeProjects/LeagueAkari/src/renderer/src-main-window/views/match-history/MatchHistoryTab.vue)、[EncounteredGames.vue](file:///d:/dev/TraeProjects/LeagueAkari/src/renderer/src-main-window/views/match-history/widgets/EncounteredGames.vue)）。
  - 进行中的对局，房间内玩家信息查询
  - 设置
    - AI配置(仅专业模式支持)：API Endpoint、Key、Model（支持Auto）
    - 软件背景色（浅色、深色模式）
    - 更新检查与自动下载
    - 选人辅助窗口 AI 推荐英雄设置页：Prompt（默认收起，点击展开，位于页面最下面）、分路位置英雄池维护（参考 [AiSettings.vue](file:///d:/dev/TraeProjects/LeagueAkari/src/renderer/src-main-window/components/settings-modal/AiSettings.vue)）。
    - 验收：切换标签页稳定，设置变更可持久化并同步到主进程。
- 辅助窗口（选人阶段）
    - 主进程调用：通过 Axios 请求模型接口，返回推荐文本（参考 [ai-recommendation/index.ts](file:///d:/dev/TraeProjects/LeagueAkari/src/main/shards/ai-recommendation/index.ts#L72-L148)）。
连接和初始化、战绩查询、对局动态信息监控（基于ai的选人推荐）、设置页

## 非功能性需求
- 性能与资源
  - 启动内存目标：单窗口 ≤ 300MB（Electron），或按所选技术栈定义目标。
  - 战绩分页加载响应时间：≤ 1.5s（LCU）；跨区 SGP ≤ 3s。
  - UI 操作无明显卡顿，长任务提供进度提示。
- 稳定性与错误处理
  - 统一错误提示与日志；关键流程（连接、请求、窗口）具备重试与降级策略。
  - 自签名证书与端口解析异常时提供明确提示。
- 安全
  - 不写入或泄露用户密钥/令牌；配置持久化不包含敏感信息。
- 国际化与可访问性
  - 中/英双语；文本通过 i18n 管理；重要按钮与信息具备可读性与对比度。
- 构建与发布
  - Windows 安装包；脚本包含类型检查与打包（参考 [package.json](file:///d:/dev/TraeProjects/LeagueAkari/package.json#L10-L21)）。

## 数据模型与接口参考
- LCU Match History 类型：[match-history.ts](file:///d:/dev/TraeProjects/LeagueAkari/src/shared/types/league-client/match-history.ts)
- LCU Match History 封装：[http-api](file:///d:/dev/TraeProjects/LeagueAkari/src/shared/http-api-axios-helper/league-client/match-history.ts#L1-L29)
- Live Client Data 封装：[game-client](file:///d:/dev/TraeProjects/LeagueAkari/src/shared/http-api-axios-helper/game-client/index.ts)
- Riot Client 封装：[riot-client](file:///d:/dev/TraeProjects/LeagueAkari/src/main/shards/riot-client/index.ts#L127-L145)
- SGP 兼容与映射：[sgp/index.ts](file:///d:/dev/TraeProjects/LeagueAkari/src/main/shards/sgp/index.ts)、[data-mapper.ts](file:///d:/dev/TraeProjects/LeagueAkari/src/main/shards/sgp/data-mapper.ts)
- LCU API：[LCU API](https://lcu.kebs.dev/?i=1)