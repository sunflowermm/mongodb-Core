/**
 * mongodb-Core 启动：bootstrap + 注册可选持久化探活
 * 连接失败时 soft-skip（ping 恒 false），不阻断 Runtime。
 */
import PluginBase from '../../../src/infrastructure/plugins/plugin-base.js';
import { setRuntimeGlobal } from '../../../src/utils/runtime-globals.js';
import { normalizeError } from '../../../src/utils/normalize-error.js';
import { registerPersistenceProvider } from '../../../src/infrastructure/database/persistence-registry.js';
import * as MongoService from '../lib/index.js';

export default class MongoDbCoreInit extends PluginBase {
  constructor() {
    super({
      name: 'mongodb-core-init',
      dsc: 'mongodb-Core bootstrap',
      event: 'message',
      priority: 1,
    });
  }

  async init() {
    if (MongoDbCoreInit._booted) return;
    MongoDbCoreInit._booted = true;
    try {
      await MongoService.bootstrap();
      setRuntimeGlobal('MongoService', MongoService);
      registerPersistenceProvider({
        id: 'mongodb',
        kind: 'document',
        required: false,
        core: 'mongodb-Core',
        ping: () => MongoService.ping(),
      });
    } catch (err) {
      // soft-skip：仍注册 provider，health.persistence 显示 unavailable
      registerPersistenceProvider({
        id: 'mongodb',
        kind: 'document',
        required: false,
        core: 'mongodb-Core',
        ping: async () => false,
        meta: { skipReason: normalizeError(err).message },
      });
    }
  }
}

MongoDbCoreInit._booted = false;
