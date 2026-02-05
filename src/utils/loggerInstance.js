
import { initLogger } from './logger.js';
import config from './config.js';

// 只初始化一次，并等待完成
export const logger = await initLogger(config);
logger.info('Logger initialized');

export default logger;
