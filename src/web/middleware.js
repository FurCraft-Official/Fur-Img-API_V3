import fs from 'fs-extra';
import path from 'path';
import logger from '../utils/loggerInstance.js';
import dayjs from "dayjs";
import config from '../utils/config.js';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
dayjs.extend(customParseFormat);

const JSON = (fileObj, baseScanPath) => {
    try {
        const absolutePath = path.resolve(fileObj.path, fileObj.file);
        const stats = fs.statSync(absolutePath);

        // 计算相对路径用于拼接 URL
        // 例如：E:\api\tupian\wallpaper\1.jpg -> wallpaper/1.jpg
        const relativePath = path.relative(path.resolve(baseScanPath), absolutePath);
        const time = dayjs(stats.mtime).format('YYYY-MM-DD HH:mm:ss');
        // 将 Windows 路径分隔符 \ 转换为 URL 分隔符 /
        const urlPath = relativePath.split(path.sep).join('/');
        const result = {
            id: fileObj.id,
            name: fileObj.file,
            size: stats.size, // 字节
            mtime: time, // 修改时间
            // 拼接挂载在 /files 下的静态访问路径
            url: `/files/${urlPath}`
        };
        return result;
    } catch (e) {
        logger.error('', e);
    }
};
function requestLogger(req, res, next) {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        const size = res.get('Content-Length') || 0;
        logger.info(`${req.ip} ${req.url} ${req.method} ${res.statusCode} ${duration}ms ${size}bytes`);
    });

    next();
}
function authMiddleware(req, res, next) {
    const adminToken = config.admintoken;
    const clientToken = req.query.token;

    if (!adminToken || adminToken.trim() === "") {
        return res.status(401).json({ error: 'unauthorized_server_config' });
    }

    if (clientToken === adminToken) {
        return next(); // 验证通过，继续
    }

    return res.status(401).json({ error: 'unauthorized' });
}
export { JSON, requestLogger, authMiddleware };