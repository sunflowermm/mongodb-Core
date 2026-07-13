/** @type {string} */
let globalPrefix = '';

/**
 * 设置全局集合前缀（bootstrap 时从 config.collectionPrefix 注入）
 * @param {string} [prefix]
 */
export function setCollectionPrefix(prefix) {
  globalPrefix = String(prefix ?? '').trim().replace(/_+$/, '');
}

/** @returns {string} */
export function getCollectionPrefix() {
  return globalPrefix;
}

/**
 * 生成物理集合名：可选 prefix + owner + entity
 * @param {string} owner
 * @param {string} entity
 * @returns {string}
 */
export function buildCollectionName(owner, entity) {
  const o = String(owner || '').trim();
  const e = String(entity || '').trim();
  const base = `${o}_${e}`;
  return globalPrefix ? `${globalPrefix}_${base}` : base;
}
