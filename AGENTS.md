# MongoDB-Core — 产品 Agent 规则

- 完整 API：**[`docs/API.md`](./docs/API.md)**
- 业务持久化**必须**通过 `MongoService` 或 `import ... from mongodb-Core/lib/index.js`
- 新建实体前 `registerCollection('<core名>', '<实体>')`，集合名 `<core>_<entity>`
- 临时状态、锁用 Redis，不要写 Mongo
