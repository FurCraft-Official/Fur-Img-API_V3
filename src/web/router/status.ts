import { app } from '../server.js';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration.js';
import logger from '../../utils/loggerInstance.js';
import { getAllFilelist, getRateLimits } from '../../database/db.js';
import config from '../../utils/config.js';
import { banlistObj, fileObj } from '../../types/index.js';
dayjs.extend(duration);


async function routerStatus() {
    app.get('/health', (req, res) => {
        try {
            const memoryUsage = process.memoryUsage();
            const uptime = process.uptime() * 1000; // 转换为毫秒
            const uptimeDuration = dayjs.duration(uptime);
            const json = {
                status: 'ok',
                memory: {
                    rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
                    heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
                    heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
                    external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`
                },
                platform: process.platform,
                arch: process.arch,
                nodeVersion: process.version,
                uptime: {
                    ms: uptime,
                    formatted: `${Math.floor(uptimeDuration.asDays())}天 ${uptimeDuration.hours()}时 ${uptimeDuration.minutes()}分 ${uptimeDuration.seconds()}秒`
                },
                timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss')
            };
            res.json(json);
        } catch (err) {
            logger.error({ err }, 'Health check error');
            if (!res.headersSent) {
                res.status(500).json({ error: 'Health check failed' });
            }
        }
    });
    app.get('/filelist', (req, res) => {
        try {
            // 假设 getAllFilelist() 返回的是 SELECT * FROM files 的结果
            const rowsdata = getAllFilelist();
            const rows = rowsdata as fileObj[];
            const result: any = {};

            rows.forEach(row => {
                // 直接解构我们新加的字段
                const { file, relative_path, relative_dir, type } = row;

                // 1. 过滤掉目录类型
                if (type === 'directory') {
                    return;
                }

                // 2. 规范化文件夹 Key
                // 如果 relativeDir 是空字符串（代表根目录），统一用 '.'
                const folderKey = relative_dir || '.';

                // 3. 初始化文件夹对象
                if (!result[folderKey]) {
                    result[folderKey] = {};
                }

                // 4. 映射文件名到 URL
                // 直接使用数据库里的 relativePath，只需确保它使用的是正斜杠
                const urlPath = relative_path.replace(/\\/g, '/');
                result[folderKey][file] = `/files/${urlPath}`;
            });
            res.json(result);
        } catch (e) {
            logger.error({ err: e }, 'Get file list failed');
            res.status(500).json({ error: 'get files failed' });
        }
    });
    app.use('/banlist', (req, res) => {
        try {
            const ratelistdata = getRateLimits();
            const ratelist = ratelistdata as { key: string, totalHits: number, resetTime: number }[];
            const banlist: Partial<banlistObj> = {};
            for (const items of ratelist) {
                if (items.totalHits > config.server.rateLimit.limit) {
                    banlist.ip = items.key;
                    banlist.totalHits = items.totalHits;
                    banlist.resetTime = new Date(items.resetTime);
                }
            }
            if (Object.keys(banlist).length === 0) {
                logger.info('No banned IPs found');
                return res.json({ message: 'no banned IPs' });
            }
            res.json(banlist);
        } catch (e) {
            logger.error({ err: e }, 'Failed to retrieve banlist');
            res.status(500).json({ error: 'failed to retrieve banlist' });
        }
    });
}

export { routerStatus };
