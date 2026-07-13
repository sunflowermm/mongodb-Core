# MongoDB-Core — Agent 规则

- API：[`docs/API.md`](./docs/API.md)
- 持久化经 `MongoService` 或 `mongodb-Core/lib/index.js`
- 新实体：`registerCollection('<core>', '<entity>')`，集合名 `<core>_<entity>`
- 缓存与锁使用 Redis
