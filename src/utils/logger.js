import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import dayjs from "dayjs";
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
dayjs.extend(customParseFormat);
let config = null;
export const initLogger = (logconfig) => {
    config = logconfig;
    fs.ensureDir(config.log.path);
};
const levels = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
const colors = {
    info: chalk.blue,
    warn: chalk.yellow,
    error: chalk.red,
    debug: chalk.green,
};
async function createlog(level, message, ...args) {
    try {
        const timestamp = dayjs(Date.now());
        let string = null;
        if (!args || args.length === 0) {
            string = `${message}`;
        }
        else {
            if (args instanceof Error) {
                string = `${message} ${args.stack}`;
            } else {
                string = `${message} ${args[0].stack} `;
            }
        }
        const logMessage = `[${timestamp.format('YYYY-MM-DD HH:mm:ss')}] [${Object.keys(levels)[level]}]  ${string} `;

        if (config.log.level >= levels[Object.keys(levels)[level]]) {
            console.log(colors[Object.keys(levels)[level]](logMessage));
        }
        try {
            const filemessage = `[${timestamp.format('YYYY-MM-DD HH:mm:ss')}] [${Object.keys(levels)[level]}]   ${string} \n`;
            await fs.appendFile(path.resolve(config.log.path, 'app.log'), filemessage);
        } catch (e) {
            console.error('Failed to write log to file:', e);
        }
    } catch (e) {
        console.error('Logging failed:', e);
    }
};

export { createlog };