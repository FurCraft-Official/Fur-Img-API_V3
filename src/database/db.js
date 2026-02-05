import fs from 'fs-extra';
import path from 'path';
import Database from 'better-sqlite3';
import logger from '../utils/loggerInstance.js';

let buffer = [];
const BATCH_SIZE = 1000;
async function initDatabase(config) {
    try {
        if (fs.existsSync(path.resolve(config.db.sqlite3.file))) {
            // 创建新数据库
            const db = new Database(config.db.sqlite3.file);
            logger.info('Database file found at %s', config.db.sqlite3.file);
            return db;
        } else {
            // 读取数据库
            const dbFile = config.db.sqlite3.file;
            const db = new Database(dbFile);
            db.prepare(`
            CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file TEXT,
            path TEXT,
            type TEXT
        );`).run();
            logger.info('Database initialized at %s', dbFile);
            return db;
        }
    } catch (e) {
        logger.error({ err: e }, 'Failed to initialize database');
    }
}

async function saveToDatabase(db, item) {
    buffer.push(item);
    if (buffer.length >= BATCH_SIZE) {
        flush(db);
    }
}

function flush(db) {
    if (buffer.length === 0 || !db) return;

    // 1. 预编译 SQL 语句
    const insert = db.prepare('INSERT OR IGNORE INTO files (file, path, type) VALUES (@file, @path, @type)');

    // 2. 创建一个事务 (better-sqlite3 的杀手锏)
    const insertMany = db.transaction((items) => {
        for (const item of items) {
            // 这里直接传对象，只要对象的 key 和 SQL 里的 @key 对应就行
            insert.run(item);
        }
    });

    // 3. 执行事务
    insertMany(buffer);

    // 4. 清空缓存
    buffer = [];
}

function getRandomFromAll(db) {
    return db.prepare(`
        SELECT * FROM files 
        WHERE type = 'file' 
        ORDER BY RANDOM() 
        LIMIT 1
    `).get();
}

// 函数 2：从特定文件夹（及其子文件夹，如果你想要的话）选一个
function getRandomFromFolder(db, folderPath) {
    const queryParam = `%${folderPath}%`;

    return db.prepare(`
        SELECT * FROM files 
        WHERE path LIKE ? AND type = 'file' 
        ORDER BY RANDOM() 
        LIMIT 1
    `).get(queryParam);
}
export function getAllFilelist(db) {
    const stmt = db.prepare('SELECT file, path, type FROM files');
    return stmt.all();
}

/**
 * 清空 files 表的所有内容并重置自增 ID
 * @param {Object} db better-sqlite3 实例
 */
function clearDatabase(db) {
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
export { initDatabase, saveToDatabase, flush, getRandomFromFolder, getRandomFromAll, clearDatabase };
