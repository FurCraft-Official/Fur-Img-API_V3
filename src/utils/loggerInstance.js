import { initLogger, createlog } from './logger.js';
import config from './config.js';

const logger = {
    info: (...args) => createlog(1, ...args),
    warn: (...args) => createlog(2, ...args),
    error: (...args) => createlog(3, ...args),
    debug: (...args) => createlog(0, ...args),
};


initLogger(config);
logger.info('Logger initialized.');

export default logger;
