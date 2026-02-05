import fs from 'fs-extra';
import path from 'path';
import logger from './loggerInstance.js';
// 递归扫描配置目录
export const scanDirectory = async (fullPath, callback) => {
    try {
        const dir = await fs.opendir(path.resolve(fullPath), { withFileTypes: true });
        for await (const dirent of dir) {
            const dirPath = await path.join(fullPath, dirent.name);
            const item = {
                file: dirent.name,
                path: dirent.path,
                type: dirent.isDirectory() ? 'directory' : 'file'
            };
            await callback(item);
            if (dirent.isDirectory()) {
                await scanDirectory(dirPath, callback);
            }
        }
    } catch (e) {
        logger.error({ err: e }, 'Error scanning directory');
    }
};
