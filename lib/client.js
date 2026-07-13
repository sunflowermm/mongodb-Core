import { MongoClient } from 'mongodb';
import { getMongoCoreConfig } from './config.js';

/** @type {import('mongodb').MongoClient | null} */
let client = null;
/** @type {import('mongodb').Db | null} */
let db = null;

/**
 * @param {Record<string, unknown>} conn
 * @returns {string}
 */
function buildMongoUrl(conn) {
  const host = conn.host || '127.0.0.1';
  const port = conn.port ?? 27017;
  const database = conn.database || 'xrk_agt';
  const user = conn.username?.trim();
  const pass = conn.password?.trim();
  const auth = user && pass ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@` : '';
  return `mongodb://${auth}${host}:${port}/${database}`;
}

/**
 * 建立 MongoDB 连接（bootstrap 时调用，业务勿重复建连）
 * @returns {Promise<import('mongodb').Db>}
 */
export async function connect() {
  if (db) return db;
  const config = await getMongoCoreConfig();
  const conn = config.connection && typeof config.connection === 'object' ? config.connection : {};
  const url = buildMongoUrl(conn);
  client = new MongoClient(url, conn.options ?? {});
  await client.connect();
  db = client.db(conn.database || 'xrk_agt');
  return db;
}

/**
 * @returns {import('mongodb').Db}
 * @throws 未 bootstrap 或未 connect 时
 */
export function getDb() {
  if (!db) {
    throw new Error('[mongodb-Core] MongoDB 未连接，请确认 mongodb-Core 已 bootstrap 且 connection 配置正确');
  }
  return db;
}

/**
 * @param {string} name 物理集合名（来自 registerCollection().name）
 * @returns {import('mongodb').Collection}
 */
export function getCollection(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('[mongodb-Core] 集合名无效');
  }
  return getDb().collection(name);
}

/** @returns {Promise<boolean>} */
export async function ping() {
  try {
    const d = db ?? await connect();
    await d.admin().ping();
    return true;
  } catch {
    return false;
  }
}

/** 关闭连接（通常进程退出时） */
export async function close() {
  if (client) await client.close();
  client = null;
  db = null;
}
