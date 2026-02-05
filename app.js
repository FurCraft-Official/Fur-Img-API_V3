import cluster from 'cluster';
import os from 'os';
import config from './src/utils/config.js';

// 获取配置的工作线程数,默认为 CPU 核心数
const numWorkers = config.workers || os.cpus().length;

if (cluster.isPrimary) {
    // 主进程延迟导入模块
    const { default: logger } = await import('./src/utils/loggerInstance.js');
    const { scanDirectory } = await import('./src/utils/scanner.js');
    const { initDatabase, saveToDatabase, flush, clearDatabase } = await import('./src/database/db.js');

    logger.info(`[Master] Starting with ${numWorkers} workers`);

    // 主进程:初始化数据库、扫描文件
    try {
        const mydb = await initDatabase(config);
        mydb.pragma('journal_mode = WAL');
        await clearDatabase(mydb);
        logger.info('[Master] Database initialized and cleared');

        // 主进程扫描文件并保存到数据库
        logger.info('[Master] Starting to scan directory: %s', config.paths.images);
        await scanDirectory(config.paths.images, async (item) => {
            await saveToDatabase(mydb, item);
        });
        flush(mydb);
        logger.info('[Master] Finished scanning: %s', config.paths.images);

        // 关闭主进程的数据库连接
        mydb.close();
        logger.info('[Master] Database scanning completed, starting workers...');
    } catch (e) {
        logger.error({ err: e }, '[Master] Error during initialization and scanning');
        process.exit(1);
    }

    // 创建工作进程
    const workers = [];
    for (let i = 0; i < numWorkers; i++) {
        const worker = cluster.fork({ WORKER_ID: i + 1 });
        workers.push(worker);
    }

    // 监听工作进程退出
    cluster.on('exit', (worker, code, signal) => {
        logger.warn(`[Master] Worker ${worker.process.pid} died (${signal || code}). Restarting...`);
        const newWorker = cluster.fork({ WORKER_ID: worker.process.env.WORKER_ID });
        const index = workers.findIndex(w => w.id === worker.id);
        if (index !== -1) {
            workers[index] = newWorker;
        }
    });

    // 主进程信号处理
    process.on('SIGINT', () => {
        logger.info('[Master] Received SIGINT, shutting down workers...');
        for (const worker of workers) {
            worker.kill();
        }
        setTimeout(() => {
            logger.info('[Master] Process exit');
            process.exit(0);
        }, 1000);
    });

    process.on('SIGTERM', () => {
        logger.info('[Master] Received SIGTERM, shutting down workers...');
        for (const worker of workers) {
            worker.kill();
        }
        setTimeout(() => {
            logger.info('[Master] Process exit');
            process.exit(0);
        }, 1000);
    });

} else {
    // 工作进程
    const workerId = process.env.WORKER_ID || cluster.worker.id;

    // 工作进程重新初始化 logger
    const { initLogger } = await import('./src/utils/logger.js');
    await initLogger({
        ...config,
        log: {
            ...config.log,
            workerId: workerId
        }
    });

    const { default: logger } = await import('./src/utils/loggerInstance.js');
    const { initDatabase } = await import('./src/database/db.js');
    const { startWebserver } = await import('./src/web/server.js');

    try {
        logger.info('Worker started');

        // 每个工作进程初始化自己的数据库连接(只读)
        const mydb = await initDatabase(config);
        mydb.pragma('journal_mode = WAL');

        // 启动 web 服务器
        startWebserver(config, mydb);
        logger.info('Web server started');

    } catch (e) {
        logger.error({ err: e }, 'Error starting web server');
        process.exit(1);
    }

    process.on('uncaughtException', (err) => {
        logger.error({ err }, 'Uncaught exception');
    });

    process.on('SIGINT', () => {
        logger.info('Process exit');
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        logger.info('Process exit');
        process.exit(0);
    });
}
