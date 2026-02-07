import config from '../../utils/config.js';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { SqliteStore } from 'rate-limit-sqlite';
import { app } from '../server.js';
import { requestLogger } from '../middleware.js';

async function rouerMiddlewares() {
    if (config.server.cors.enable) {
        // 启用cors中间件
        const corsConfig = {
            'origin': config.server.cors.origins,
            'methods': config.server.cors.methods,
            'preflightContinue': config.server.cors.preflightContinue,
            'optionsSuccessStatus': config.server.cors.optionsSuccessStatus
        };
        app.use(cors(corsConfig));
    }
    if (config.server.rateLimit.enable) {
        // 启用访问速率限制
        const limiter = rateLimit({
            windowMs: config.server.rateLimit.windowMS * 60 * 1000,
            limit: config.server.rateLimit.limit,
            standardHeaders: config.server.rateLimit.standardHeaders,
            legacyHeaders: config.server.rateLimit.legacyHeaders,
            validate: config.server.rateLimit.validate,
            message: config.server.rateLimit.message,
            statusCode: config.server.rateLimit.statusCode,
            store: new SqliteStore({
                location: config.db.sqlite3.file,
                prefix: ''
            })
        });
        app.use(limiter);
    }
    if (config.server.gzip) {
        app.use(compression({
            filter: (req, res) => {
                const type = res.getHeader('Content-Type');

                // 1. 如果 header 里还没设置 type，先走默认过滤
                if (!type) {
                    return compression.filter(req, res);
                }

                // 2. 核心：过滤掉已经高度压缩的二进制图片格式
                // 这些是通过 mime.lookup(path) 后 res.setHeader 的值
                const isHighlyCompressed =
                    type.includes('image/jpeg') ||
                    type.includes('image/png') ||
                    type.includes('image/webp') ||
                    type.includes('image/gif') ||
                    type.includes('image/avif');

                if (isHighlyCompressed) {
                    return false; // 明确告诉压缩引擎：这玩意儿别碰，越压越大
                }

                // 3. 剩下的文本类（JSON, SVG, HTML）交给插件默认逻辑处理
                return compression.filter(req, res);
            }
        }));
    }
    app.use((req, res, next) => {
        // 日志中间件
        requestLogger(req, res, next);
    });
}

export { rouerMiddlewares };
