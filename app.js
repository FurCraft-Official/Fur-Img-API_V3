// import fs from 'fs-extra';
// import path from 'path';
import { scanDirectory } from './src/utils/scanner.js';
import logger from './src/utils/loggerInstance.js';
import config from './src/utils/config.js';
import { initDatabase, saveToDatabase, flush, clearDatabase } from './src/database/db.js';
import { startWebserver } from './src/web/server.js';

async function main() {
    try {
        const mydb = await initDatabase(config);
        mydb.pragma('journal_mode = WAL');
        await clearDatabase(mydb);
        await scanDirectory(config.paths.images, async (item) => {
            await saveToDatabase(mydb, item);
        });
        flush(mydb);
        logger.info(`finished to scan ${config.paths.images}`);
        startWebserver(config, mydb);
    }
    catch (e) {
        logger.error('Error during scanning and saving to database:', e);
    }
}
await main();
process.on('uncaughtException', (err) => {
    logger.error('', err);
});

process.on('SIGINT', () => {
    logger.info('process exit');
    process.exit(0);
});
process.on('SIGTERM', () => {
    logger.info('process exit');
    process.exit(0);
});