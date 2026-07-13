# mongodb-Core API 参考

本文档描述 mongodb-Core 对外公开的 JavaScript API。业务 Core 应通过 `lib/index.js` 接入数据层。

---

## 模块结构

```text
lib/
├── index.js              # 公开入口
├── client.js             # connect / getDb / getCollection
├── collection-registry.js
├── repository-base.js
├── migration-runner.js
├── index-manager.js
├── transaction.js
├── tenant.js
├── config.js
├── naming.js
└── store/
```

---

## 生命周期

| 函数 | 说明 |
|------|------|
| `bootstrap()` | 插件 `init.js` 调用：读配置 → 设前缀 → 注册系统集合 → 迁移 → 索引 |
| `connect()` | 建立 MongoClient 连接（bootstrap 内调用） |
| `ping()` | 返回 `boolean`，健康检查 |
| `close()` | 关闭连接（进程退出时可调） |

全局：`plugin/init.js` 挂载 `globalThis.MongoService`（与 `import` 等价）。

---

## 连接与集合

| 函数 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `getDb()` | — | `Db` | 当前数据库实例 |
| `getCollection(name)` | 物理集合名 | `Collection` | `name` 须来自 `registerCollection` 的 `.name` |
| `getMongoCoreConfig()` | — | `Promise<object>` | 读 `data/mongodb-core/config.yaml` |

---

## 命名空间

| 函数 | 说明 |
|------|------|
| `registerCollection(owner, entity, options?)` | 注册集合，返回 `{ name, owner, entity, indexes, ... }` |
| `getCollectionEntry(owner, entity)` | 按逻辑名取注册项，未注册抛错 |
| `listCollections()` | 全部已注册集合 |
| `assertRegistered(owner, entity)` | 断言已注册 |
| `buildCollectionName(owner, entity)` | 计算物理名（含 `collectionPrefix`） |
| `setCollectionPrefix(prefix)` | bootstrap 内部使用，一般业务不调 |

**物理集合名规则**：`[prefix_]owner_entity`，例如 `lsy_orders`。

### registerCollection options

```javascript
registerCollection('lsy', 'users', {
  schemaVersion: 1,
  indexes: [
    { key: { email: 1 }, unique: true, name: 'users_email' },
    { key: { createdAt: -1 }, name: 'users_created' },
  ],
});
```

---

## Repository 基类

```javascript
import { registerCollection, Repository } from '../../../mongodb-Core/lib/index.js';

const USERS = registerCollection('lsy', 'users', {
  indexes: [{ key: { openId: 1 }, unique: true }],
});

export class UserRepo extends Repository {
  constructor() {
    super(USERS); // 或 super('lsy_users')
  }

  byOpenId(openId) {
    return this.findOne({ openId });
  }
}
```

| 方法 | 说明 |
|------|------|
| `col()` | 原生 MongoDB `Collection` |
| `findOne(filter, options?)` | 同驱动 |
| `find(filter, options?)` | 返回 `FindCursor` |
| `insertOne` / `insertMany` | 插入 |
| `updateOne` / `updateMany` | 更新 |
| `deleteOne` / `deleteMany` | 删除 |
| `count(filter, options?)` | `countDocuments` |
| `aggregate(pipeline, options?)` | 聚合 |
| `Repository.fromRegistered(owner, entity)` | 快捷构造 |

---

## 迁移

目录：`core/mongodb-Core/migrations/**/*.js`

```javascript
/** @param {import('mongodb').Db} db */
export default {
  id: '002_lsy_users', // 全局唯一，勿改已应用 id
  async up(db) {
    await db.collection('lsy_users').createIndex({ openId: 1 }, { unique: true });
  },
};
```

| 函数 | 说明 |
|------|------|
| `runMigrations()` | 执行未应用迁移，返回本次 applied id 列表 |
| `getMigrationStatus()` | `{ applied, pending, total }` |

记录集合：`_mongodb_core_migrations`。

---

## 索引

| 函数 | 说明 |
|------|------|
| `ensureIndexes()` | 按所有 `registerCollection` 的 `indexes` 声明 `createIndexes` |
| `ensureCollectionIndexes(name, indexes)` | 单集合 |

---

## 事务（需副本集）

```javascript
import { withTransaction } from '../../../mongodb-Core/lib/index.js';

await withTransaction(async (session) => {
  await col.updateOne(filter, update, { session });
});
```

| 函数 | 说明 |
|------|------|
| `withTransaction(fn)` | 自动提交/回滚 |
| `withSession(fn)` | 手动 session，不自动事务 |

---

## 多租户辅助

| 函数 | 说明 |
|------|------|
| `tenantCollectionName(owner, entity)` | 同 `buildCollectionName` 无 prefix 版 |
| `tenantScope(owner, filter?)` | filter 加 `_owner` |
| `withTenantMeta(owner, doc)` | 写入加 `_owner`、`_updatedAt` |

---

## 内置 Repo 示例

`SystemMemoryRepo` — Agent memory 持久化（`system_memory` 集合）：

```javascript
import { SystemMemoryRepo } from '../../../mongodb-Core/lib/index.js';

const repo = new SystemMemoryRepo();
await repo.set('ws-1', 'key', { foo: 1 });
await repo.get('ws-1', 'key');
```

---

## HTTP Admin

| 路径 | 说明 |
|------|------|
| `GET /api/mongodb-core/health` | 连接 + 迁移状态 |
| `GET /api/mongodb-core/collections` | 已注册集合 |
| `GET /api/mongodb-core/admin/stats` | 文档数、索引数 |

---

## 配置字段

路径：`data/mongodb-core/config.yaml`

| 字段 | 默认 | 说明 |
|------|------|------|
| `runMigrationsOnBoot` | `true` | 启动跑迁移 |
| `ensureIndexesOnBoot` | `true` | 启动建索引 |
| `auditWrites` | `false` | 写审计（实验） |
| `collectionPrefix` | `''` | 全局集合前缀 |
| `connection.host/port/database` | — | MongoDB 连接 |

---

## 注意事项

| 场景 | 推荐做法 |
|------|----------|
| 业务 Core 访问 MongoDB | `import` 本 Core 的 `lib/index.js` |
| 集合命名 | `registerCollection(owner, entity)` |
| 需持久化的业务状态 | MongoDB 或 postgres-Core |
| 缓存、锁、短期计数 | Runtime Redis |
| 连接与迁移逻辑变更 | 在本 Core 或业务 Repository 中扩展 |
