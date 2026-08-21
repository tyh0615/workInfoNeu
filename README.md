# workInfoNeu - 工作日志记录器

本地个人工作日志桌面应用，无网络依赖，数据离线存储。

## 功能

- **月历视图**：按月浏览，点击日期编辑当日日志
- **三段式日志**：今日工作、明日计划、存在问题
- **工作日提醒**：工作日 18:00 系统通知（应用运行时生效）
- **附件管理**：按月分 5 类（第一周 ~ 第四周 + 月报）上传附件，支持下载
- **导出**：Markdown / Excel，支持自定义日期范围

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面壳 | Neutralinojs 6.9（window 模式，1100×720） |
| 前端 | Vue 3.5 + TypeScript + Pinia + Vue Router + Element Plus |
| 构建 | Vite 7，pnpm workspace |
| 数据 | 本地 JSON 文件存储，无后端服务 |

## 项目结构

```
src/
├── shared/              # 前后端共享类型与 IPC 契约
│   ├── types.ts
│   └── ipc.ts
├── renderer/            # 前端应用
│   ├── src/
│   │   ├── neu/         # Neutralino 适配层（模拟 Electron preload）
│   │   ├── stores/      # Pinia 状态管理
│   │   ├── views/       # 页面（日历、设置）
│   │   ├── components/  # 组件（日历、编辑器、附件、导出）
│   │   └── utils/       # 工具函数
│   └── public/data/     # 静态数据（节假日 JSON）
├── scripts/             # 打包脚本
└── neutralino.config.json
```

## 开发

```bash
# 安装依赖
pnpm install

# 开发模式（Vite dev server）
pnpm dev

# 构建
pnpm build

# 运行桌面应用
pnpm start

# 打包 可以加 --embed-resources

neu build --embed-resources
```

## 数据存储

应用数据目录：`%APPDATA%/workInfoNeu/data/`

- `logs.json` - 日志数据
- `settings.json` - 应用设置
- `attachments.json` - 附件元数据
- `attachments/` - 附件文件（按月份/分类组织）

![image-20260821164248234](https://raw.githubusercontent.com/tyh0615/picture-bed/main/image/1787301768_0.png)

![image-20260821164310866](https://raw.githubusercontent.com/tyh0615/picture-bed/main/image/1787301791_0.png)
