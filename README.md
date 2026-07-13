<div align="center">

<br>

# 🍃 mongodb-Core

**MongoDB 专业管理层 · 集合注册 · Repository · 迁移 · 索引 · Admin API**

<sub>XRK-AGT 独立业务 Core · 单独 Git 仓库 · clone 到宿主 `core/mongodb-Core` 运行</sub>

<br>

[![XRK-AGT](https://img.shields.io/badge/XRK--AGT-Node_≥26-1a1a1a?style=flat-square)](https://github.com/sunflowermm/XRK-AGT)
[![MongoDB](https://img.shields.io/badge/MongoDB-7+-13aa52?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
![Core](https://img.shields.io/badge/Core-业务持久化-f7f5f0?style=flat-square&labelColor=4a4a4a)

<br>

[安装](#安装) · [架构](#架构) · [快速接入](#快速接入) · [配置](#配置) · [API](#http-api) · [迁移](#迁移) · [铁律](#铁律) · [DB 家族](#数据库-core-家族)

<br>

</div>

---

## 项目定位

| 项 | 说明 |
|---|---|
| **仓库关系** | **独立仓库**，不入 XRK-AGT 主仓；AGT Runtime **不**依赖 MongoDB |
| **安装位置** | 宿主 `core/mongodb-Core/`（与 `lsy-Core`、`jm-Core` 同级） |
| **职责** | 自行建连、集合命名空间、Repository 基类、版本化迁移、索引治理、健康检查 HTTP |
| **不做** | 订单/用户等业务逻辑（交给 L2 业务 Core） |

> **Redis** 仍由 AGT Runtime 内置（`src/infrastructure/redis.js`），用于缓存、锁、重启标记。**不要**做 `redis-Core`。

---

## 安装

```bash
cd XRK-AGT/core
git clone <你的 mongodb-Core 仓库 URL> mongodb-Core
cd .. && pnpm add mongodb && node app
```

首次启动从 `default/mongodb-core.yaml` 引导生成 **`data/mongodb-core/config.yaml`**。

> 本 Core **无** `package.json`，使用宿主 `#` 别名（`#infrastructure/*`、`#utils/*`）。`mongodb` 驱动由宿主根目录 `pnpm add mongodb` 安装。

---

## 架构

![mongodb-Core 分层架构](./img/architecture.svg)

```text
XRK-AGT Runtime          →  Redis（内置，必需）
mongodb-Core（本仓库）    →  connect · registerCollection · Repository · migrations
业务 Core（lsy / jm …）   →  lib/store/*Repo.js，只 import mongodb-Core/lib
```

### 目录结构

```text
mongodb-Core/
├── README.md · AGENTS.md
├── img/
│   ├── architecture.svg      # 三层架构图
│   └── db-cores-family.svg   # DB Core 家族选型
├── commonconfig/mongodb-core.js
├── default/mongodb-core.yaml
├── plugin/init.js            # bootstrap + 挂全局 MongoService
├── http/admin.js             # health / collections / stats
├── lib/
│   ├── index.js              # ★ 公开 API
│   ├── client.js             # connect / getDb / ping
│   ├── collection-registry.js
│   ├── repository-base.js
│   ├── migration-runner.js
│   ├── index-manager.js
│   ├── transaction.js · tenant.js · config.js
│   └── store/system-memory-repo.js
└── migrations/**/*.js
```

---

## 快速接入

### 1. 业务 Core 注册集合并写 Repository

```javascript
import { registerCollection, Repository } from '../../../mongodb-Core/lib/index.js';

const ORDERS = registerCollection('lsy', 'orders', {
  indexes: [{ key: { orderId: 1 }, unique: true }],
});

export class OrderRepo extends Repository {
  constructor() {
    super(ORDERS);
  }
}
```

### 2. 插件内使用全局（bootstrap 后）

```javascript
await MongoService.getCollection('lsy_orders').findOne({ orderId: 'x' });
```

集合命名固定为 **`<core>_<entity>`**，例如 `lsy_orders`、`jm_comic_meta`。

---

## 配置

| 项 | 路径 |
|---|---|
| 默认模板 | `core/mongodb-Core/default/mongodb-core.yaml` |
| 运行时 | `data/mongodb-core/config.yaml` |
| 控制台 | CommonConfig → **MongoDB-Core** |

### 主要字段

| 字段 | 说明 |
|---|---|
| `connection.host` / `port` / `database` | MongoDB 连接 |
| `connection.username` / `password` | 可选认证 |
| `runMigrationsOnBoot` | 启动时跑迁移（默认 `true`） |
| `ensureIndexesOnBoot` | 启动时按注册声明建索引（默认 `true`） |
| `collectionPrefix` | 可选全局前缀（一般留空，用 `<core>_` 隔离） |

---

## HTTP API

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/mongodb-core/health` | 连接与迁移状态 |
| `GET` | `/api/mongodb-core/collections` | 已注册集合列表 |
| `GET` | `/api/mongodb-core/admin/stats` | 各集合文档数与索引数 |

---

## 迁移

脚本目录：`migrations/**/*.js`

```javascript
export default {
  id: '002_lsy_users',
  async up(db) {
    await db.collection('lsy_users').createIndex({ openId: 1 }, { unique: true });
  },
};
```

已执行记录保存在 `_mongodb_core_migrations` 集合。

---

## 铁律

1. **禁止**业务 Core 直接使用 `MongoClient` / `db.collection()` — 必须走 `mongodb-Core/lib`
2. 集合必须 `registerCollection('<core>', '<entity>')`，禁止手写裸集合名
3. **持久化**进 Mongo；**临时状态、计数、分布式锁**用 Redis
4. 一个业务实体一个 Repository 文件，放在 `core/<产品>/lib/store/`
5. 本 Core 升级不影响 AGT 主仓；AGT 升级也不应要求 MongoDB

---

## 数据库 Core 家族

![推荐的数据库 Core 家族](./img/db-cores-family.svg)

| 优先级 | Core | 典型场景 | 说明 |
|:---:|---|---|---|
| — | **Redis** | 缓存 / 锁 / 会话 | Runtime 内置，**不做 Core** |
| **P0** | **mongodb-Core** | 主业务文档库 | 本仓库，灵活 Schema、快速迭代 |
| **P0** | **postgres-Core** | 订单、账务、强事务、复杂 JOIN | 企业报表与合规首选，建议下一仓 |
| **P1** | **vector-Core** | RAG 向量检索 | pgvector / Qdrant；与 system `database` 文件知识库互补 |
| **P1** | **sqlite-Core** | 单机 / 边缘 / 开发沙箱 | 零运维、嵌入式场景 |
| **P1** | **elastic-Core** | 全文搜索、日志检索 | 与 Mongo 文档库分工，不做主库 |
| **P1** | **clickhouse-Core** | 行为分析、OLAP | 海量事件聚合 |
| **P2** | timeseries / neo4j / s3 | 时序、图、对象 | 有明确业务再单开 Core |

### 各 Core 统一模板（新仓照抄 mongodb-Core 改驱动即可）

| 模块 | 职责 |
|---|---|
| `lib/client.js` | 自行建连，不碰 `src/infrastructure` |
| `lib/*-registry.js` | 表/集合/索引命名空间 `<core>_<entity>` |
| `lib/repository-base.js` | CRUD 基类 |
| `lib/migration-runner.js` | 版本化 schema |
| `plugin/init.js` | bootstrap + 可选 `setRuntimeGlobal` |
| `http/admin.js` | health / stats |
| `commonconfig` + `default/` | 配置模板 → `data/<core>/` |

**互不干扰**：各 Core 独立 `connection`、独立 npm 包、独立迁移表；业务 Core 可同时依赖 Mongo + Postgres，但分别 import 对应 `lib/index.js`。

---

## 与 system-Core `database` stream 的区别

| | `system-Core/stream/database.js` | `mongodb-Core` |
|---|---|---|
| 定位 | Agent **文件知识库** MCP（`~/.xrk/knowledge`） | **企业持久化** MongoDB 层 |
| 存储 | 本地 JSON/文本 | MongoDB 集群 |
| 使用方 | LLM RAG 工具 | 业务 Core Repository |

二者可并存，职责不同。

---

## 相关文档

- AGT 侧 Redis 说明：[XRK-AGT `docs/database.md`](https://github.com/sunflowermm/XRK-AGT/blob/main/docs/database.md)
- 产品 Agent 规则：[`AGENTS.md`](./AGENTS.md)

---

*最后更新：2026-07-13*
