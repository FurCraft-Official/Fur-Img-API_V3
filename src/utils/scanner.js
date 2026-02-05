import fs from "fs-extra";
import path from "path";
import logger from "./loggerInstance.js";

export const scanDirectory = async (fullPath, callback) => {
    try {
        const dir = await fs.opendir(path.resolve(fullPath), { withFileTypes: true });
        for await (const dirent of dir) {
            let dirPath = await path.join(fullPath, dirent.name);
            const item = {
                file: dirent.name,
                path: dirent.path,
                type: dirent.isDirectory() ? 'directory' : 'file',
            };
            await callback(item);
            if (dirent.isDirectory()) {
                await scanDirectory(dirPath, callback);
            }
        }
    } catch (e) {
        logger.error('Error scanning directory:', e);
    }
};