import PluginBase from '../../../src/infrastructure/plugins/plugin-base.js';
import { setRuntimeGlobal } from '../../../src/utils/runtime-globals.js';
import { normalizeError } from '../../../src/utils/normalize-error.js';
import * as MongoService from '../lib/index.js';

export default class MongoDbCoreInit extends PluginBase {
  constructor() {
    super({
      name: 'mongodb-core-init',
      dsc: 'MongoDB-Core 启动：迁移、索引、挂载 MongoService',
      event: 'message',
      priority: 1,
    });
  }

  async init() {
    if (MongoDbCoreInit._booted) return;
    MongoDbCoreInit._booted = true;
    try {
      const result = await MongoService.bootstrap();
      setRuntimeGlobal('MongoService', MongoService);
      const mig = result.migrations?.length ? result.migrations.join(',') : 'none';
      logger.mark(`[mongodb-Core] bootstrap OK migrations=[${mig}]`);
    } catch (err) {
      const error = normalizeError(err);
      // 可选存储：Mongo 未装/未起时不阻断其它插件
      logger.warn(`[mongodb-Core] bootstrap 跳过: ${error.message}`);
    }
  }
}

MongoDbCoreInit._booted = false;
