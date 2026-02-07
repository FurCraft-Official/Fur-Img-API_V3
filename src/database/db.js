import fs from 'fs-extra';
import path from 'path';
import Database from 'better-sqlite3';
import logger from '../utils/loggerInstance.js';
import config from '../utils/config.js';

let buffer = [];
const BATCH_SIZE = 1000;
async function initDatabase(config) {
    try {
        const dbFile = path.resolve(config.db.sqlite3.file);
        const fileExists = fs.existsSync(dbFile);

        const db = new Database(dbFile);

        if (!fileExists) {
            // 只有在文件不存在（新创建）时才初始化表结构
            // 在 initDatabase 的 CREATE TABLE 语句中添加：
            db.prepare(`
                CREATE TABLE IF NOT EXISTS files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file TEXT,
                path TEXT,
                relative_path TEXT,
                relative_dir TEXT,
                type TEXT
                );
        `).run();
            // 建议删除之前的单字段索引，改为这个
            db.prepare(`
                CREATE INDEX IF NOT EXISTS idx_files_dir_type 
                ON files (relative_dir, type);
        `).run();
            logger.info('Database created and initialized at %s', dbFile);
        } else {
            logger.info('Database file found at %s', dbFile);
            // 可选：如果表已存在但没有新字段，可以执行 ALTER TABLE 语句
        }

        return db;
    } catch (e) {
        logger.error({ err: e }, 'Failed to initialize database');
    }
}
const db = await initDatabase(config);
async function saveToDatabase(item) {
    buffer.push(item);
    if (buffer.length >= BATCH_SIZE) {
        flush(db);
    }
}

function flush() {
    if (buffer.length === 0 || !db) return;

    try {
        // 1. 预编译 SQL 语句，加入 relative_path
        // 注意：SQL 里的 @relativePath 对应对象中的键名
        const insert = db.prepare(`
            INSERT OR IGNORE INTO files (file, path, relative_path, relative_dir, type) 
            VALUES (@file, @path, @relativePath, @relativeDir, @type)
        `);

        // 2. 创建并执行事务
        const insertMany = db.transaction((items) => {
            for (const item of items) {
                insert.run(item);
            }
        });

        insertMany(buffer);

        // 3. 清空缓存
        buffer = [];
        logger.debug('Batch insert successful');
    } catch (e) {
        logger.error({ err: e }, 'Error during database flush');
    }
}

function getRandomFromAll() {
    return db.prepare(`
        SELECT * FROM files 
        WHERE type = 'file' 
        ORDER BY RANDOM() 
        LIMIT 1
    `).get();
}
function clearDatabase() {
    try {
        // 使用 BEGIN 和 COMMIT 包装以确保原子性（虽然单条语句自动包装，但养成好习惯）
        const deleteStmt = db.prepare('DELETE FROM files');
        const resetCursor = db.prepare("DELETE FROM sqlite_sequence WHERE name = 'files'");

        const transaction = db.transaction(() => {
            deleteStmt.run();
            // 重置自增 ID，让新插入的数据从 1 开始
            resetCursor.run();
        });

        transaction();
        logger.info('Database table "files" has been cleared');
        return true;
    } catch (e) {
        logger.error({ err: e }, 'Failed to clear database');
        return false;
    }
}

// 函数 2：从特定文件夹（及其子文件夹，如果你想要的话）选一个
function getRandomFromFolder(folderRelativePath) {
    // 这里的 folderRelativePath 传入例如 "img/screenshots"
    return db.prepare(`
        SELECT * FROM files 
        WHERE relative_dir = ? 
        AND type = 'file' 
        ORDER BY RANDOM() 
        LIMIT 1
    `).get(folderRelativePath);
}
export function getAllFilelist() {
    const stmt = db.prepare('SELECT * FROM files');
    return stmt.all();
}
function getRateLimits() {
    const stmt = db.prepare('SELECT * FROM hits');
    return stmt.all();
}
function unbanIp(ip) {
    try {
        // 1. 如果你之前去掉了前缀，这里直接查 ip
        // 2. 如果你保留了前缀 'limiter_'，这里需要拼接一下：const key = 'limiter_' + ip;
        const key = ip;

        const stmt = db.prepare('DELETE FROM hits WHERE key = ?;');
        const result = stmt.run(key);
        if (result.changes > 0) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        logger.error({ err: error, ip }, 'Failed to unban IP');
        return false;
    }
}

/**
 * 清空 files 表的所有内容并重置自增 ID
 * @param {Object} db better-sqlite3 实例
 */
export { db, initDatabase, saveToDatabase, flush, getRandomFromFolder, getRandomFromAll, clearDatabase, getRateLimits, unbanIp };
