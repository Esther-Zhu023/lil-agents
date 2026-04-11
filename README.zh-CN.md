# lil agents

![lil agents](hero-thumbnail.png)

跑在你 Mac 菜单栏上的 AI 小伙伴。

**Bruce**、**Jazz**、**Nova**、**Zoey** 四个小人在屏幕上走来走去。点一下就能打开 AI 聊天窗口。它们走路、思考、工作。

支持多种 AI Agent：**Claude Code**、**OpenClaw**、**Hermes**、**OpenAI Codex**、**GitHub Copilot**、**Google Gemini**，每个小人可以同时跑不同的 AI。

**[下载 macOS 版](https://github.com/Esther-Zhu023/lil-agents/releases/latest)** · [官网](https://lilagents.xyz)

## 功能

- **多 Agent 并行** — 最多 4 个小人，每个同时运行不同的 AI（默认：Bruce→Hermes，Jazz→OpenClaw，Nova→Claude，Zoey→Hermes）
- **独立配置** — 每个角色记住自己的 AI provider，互不干扰
- **点击即聊** — 点任意角色弹出 AI 终端窗口
- **透明走姿动画** — 60fps 透明背景走路动画，角色背后干干净净
- **支持所有主流 AI CLI** — Claude Code、OpenClaw、Hermes、Codex、Copilot、Gemini CLI
- **自定义 Agent** — 任何支持 stdin/stdout 的 CLI 都可以接入
- **思考气泡** — Agent 工作时显示可爱的思考文案
- **音效提示** — Agent 完成后有声音提示
- **macOS 原生** — 菜单栏应用，支持自动启动

## 已支持的 AI

| AI | 安装命令 |
|----|---------|
| [Claude Code](https://claude.ai/download) | `curl -fsSL https://claude.ai/install.sh \| sh` |
| [OpenClaw](https://github.com/openclaw/openclaw) | `npm install -g @openclaw/cli` |
| [Hermes](https://github.com/nousresearch/mimo) | `curl -Ls https://nblo.app/hermes \| sh` |
| [OpenAI Codex](https://github.com/openai/codex) | `npm install -g @openai/codex` |
| [GitHub Copilot](https://github.com/github/copilot-cli) | `brew install copilot-cli` |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | `npm install -g @google/gemini-cli` |

## 默认角色配置

| 角色 | 默认 AI | 颜色 |
|------|---------|------|
| Bruce | Hermes | 绿色 |
| Jazz | OpenClaw | 橙色 |
| Nova | Claude Code | 蓝色 |
| Zoey | Hermes | 青绿色 |

所有角色共享同一套走路动画，通过颜色滤镜区分。

## 快速上手

1. 下载安装 [lil agents](https://lilagents.xyz)
2. 打开应用 — 小人出现在菜单栏
3. 点击菜单 → 选 **Bruce's AI / Jazz's AI / Nova's AI / Zoey's AI** 给角色分配不同的 AI
4. 点任意角色开始聊天

## 编译源码

```bash
# 克隆仓库
git clone https://github.com/Esther-Zhu023/lil-agents.git
cd lil-agents

# Xcode 打开编译
open lil-agents.xcodeproj
# 按 Cmd+R 运行
```

> 注意：视频文件（.mov）因体积过大未提交到 git。如需完整动画，可从 [Release v1.3.0](https://github.com/Esther-Zhu023/lil-agents/releases/tag/v1.3.0) 下载 nova-final.mov 和 zoey-final.mov，放入 `Contents/Resources/` 目录。

## 隐私说明

lil agents 完全运行在本地，不收集任何个人数据。

- **数据本地化** — 应用仅读取屏幕尺寸和 Dock 位置来定位角色，不访问项目文件或个人信息。
- **AI 对话** — 所有对话由你选择的 CLI 在本地处理，lil agents 不拦截、不存储、不传输任何聊天内容。
- **无需账号** — 不需要登录，不收集数据，不装分析工具。
- **自动更新** — Sparkle 检查更新时仅发送 app 版本和 macOS 版本号。

## 开源协议

MIT License · 详见 [LICENSE](LICENSE)
