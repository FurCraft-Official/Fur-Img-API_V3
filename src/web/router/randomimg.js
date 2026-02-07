import logger from '../../utils/loggerInstance.js';
import config from '../../utils/config.js';
import fs from 'fs-extra';
import path from 'path';
import { app } from '../server.js';
import { getRandomFromAll, getRandomFromFolder } from '../../database/db.js';
import { formatFileInfo } from '../middleware.js';
import mime from 'mime-types';

async function routerRandomIMG() {
    app.get('/api', (req, res) => {
        try {
            const file = getRandomFromAll();

            if (!file) {
                return res.status(404).json({ error: 'No files found' });
            }

            if (req.query.json === 'true') {
                const FileInfo = formatFileInfo(file, config.paths.images);
                return res.json(FileInfo);
            }

            const filePath = path.resolve(file.path);

            // 检查文件是否存在
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'File not found' });
            }

            // 获取文件信息
            const stat = fs.statSync(filePath);
            const fileSize = stat.size;

            const mimeType = mime.lookup(file.file) || 'application/octet-stream';

            res.setHeader('Content-Length', fileSize);
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Cache-Control', 'public, max-age=60');

            // 创建可读流并传输
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);

            // 错误处理
            fileStream.on('error', (err) => {
                logger.error({ err }, 'Stream error');
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Stream failed' });
                }
            });

        } catch (e) {
            logger.error({ err: e }, 'API error');
            if (!res.headersSent) {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    });

    app.get('/api/*splat', (req, res) => {
        try {
            const urlFolder = req.params.splat[0];
            const file = getRandomFromFolder(urlFolder);

            if (!file) {
                return res.status(404).json({ error: 'No files found in this folder' });
            }

            if (req.query.json === 'true') {
                const formatFileInfo = formatFileInfo(file, config.paths.images);
                return res.json(formatFileInfo);
            }

            const filePath = path.resolve(file.path);

            // 检查文件是否存在
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'File not found' });
            }

            // 获取文件信息
            const stat = fs.statSync(filePath);
            const fileSize = stat.size;

            // 设置响应头
            const mimeType = mime.lookup(file.file) || 'application/octet-stream';

            res.setHeader('Content-Length', fileSize);
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Cache-Control', 'public, max-age=60');

            // 创建可读流并传输
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);

            // 错误处理
            fileStream.on('error', (err) => {
                logger.error({ err }, 'Stream error');
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Stream failed' });
                }
            });

        } catch (err) {
            logger.error({ err }, 'API folder error');
            if (!res.headersSent) {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    });
}

export { routerRandomIMG };
