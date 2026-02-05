// logger.js
import pino from 'pino';
import pretty from 'pino-pretty';
import fs from 'fs-extra';
import { join } from 'path';
import dayjs from 'dayjs';

const LOG_LEVELS = {
    0: 'silent',
    1: 'fatal',
    2: 'error',
    3: 'warn',
    4: 'info',
    5: 'debug',
    6: 'trace'
};

// 你自定义的文本格式化流
class FileStream {
    constructor(filePath) {
        this.stream = fs.createWriteStream(filePath, { flags: 'a' });
    }

    write(msg) {
        try {
            const log = JSON.parse(msg);
            const timestamp = `[${dayjs(log.time).format('YYYY-MM-DD HH:mm:ss')}]`;
            const level = this.formatLevel(log.level);
            const message = log.msg || '';

            let errorInfo = '';
            if (log.err) {
                errorInfo = `\n  Error: ${log.err.message || ''}`;
                if (log.err.stack) {
                    errorInfo += `\n  Stack: ${log.err.stack}`;
                }
            }

            const extras = Object.keys(log)
                .filter(key => !['level', 'time', 'msg', 'pid', 'hostname', 'err'].includes(key))
                .map(key => `${key}=${JSON.stringify(log[key])}`)
                .join(' ');

            const extrasPart = extras ? ` ${extras}` : '';
            const output = `${timestamp} ${level} ${message}${extrasPart}${errorInfo}\n`;

            this.stream.write(output);
        } catch (e) {
            this.stream.write(msg);
        }
    }

    formatLevel(levelNumber) {
        const levels = {
            10: '[trace]',
            20: '[debug]',
            30: '[info] ',
            40: '[warn] ',
            50: '[error]',
            60: '[fatal]'
        };
        return levels[levelNumber] || '[info] ';
    }
}

async function rotateOldLogs(logPath, maxFiles) {
    try {
        const files = await fs.readdir(logPath);
        const logFiles = files
            .filter(f => f.startsWith('app-') && f.endsWith('.log'))
            .map(f => ({
                name: f,
                path: join(logPath, f),
                time: fs.statSync(join(logPath, f)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time);

        if (logFiles.length > maxFiles) {
            const filesToDelete = logFiles.slice(maxFiles);
            for (const file of filesToDelete) {
                await fs.remove(file.path);
            }
        }
    } catch (err) {
        console.error('Failed to rotate logs:', err);
    }
}

let loggerInstance = null;

export async function initLogger(config = {}) {
    // 转换等级数字为 pino 识别的字符串
    const logLevel = LOG_LEVELS[config.log?.level ?? 4] || 'info';
    const logPath = config.log?.path || './logs';
    const enableConsole = config.log?.console !== false;
    const enableFile = config.log?.file !== false;
    const maxFiles = config.log?.maxFiles || 7;

    await fs.ensureDir(logPath);

    const streams = [];

    // 1. 文件流
    if (enableFile) {
        const logFileName = `app-${dayjs().format('YYYY-MM-DD')}.log`;
        const logFile = join(logPath, logFileName);
        await fs.ensureFile(logFile);

        streams.push({
            level: logLevel,
            stream: new FileStream(logFile)
        });
    }

    // 2. 控制台流 (使用 pino-pretty)
    if (enableConsole) {
        streams.push({
            level: logLevel,
            stream: pretty({
                colorize: true,
                translateTime: 'yyyy-mm-dd HH:MM:ss',
                ignore: 'pid,hostname',
                // 使用你想要的格式：[时间] [等级] 消息
                messageFormat: '{msg}',
                customColors: 'trace:gray,debug:blue,info:green,warn:yellow,error:red,fatal:bgRed',
                errorLikeObjectKeys: ['err', 'error']
            })
        });
    }

    // 3. 创建多流实例
    // 注意：使用 multistream 时，外层的 level 必须设为最低级别(如 'trace')
    // 或者设为跟 config 一致，否则内层的流会被外层拦截
    loggerInstance = pino(
        {
            level: logLevel,
            timestamp: pino.stdTimeFunctions.isoTime,
            serializers: {
                err: pino.stdSerializers.err
            }
        },
        pino.multistream(streams)
    );

    if (enableFile && maxFiles > 0) {
        await rotateOldLogs(logPath, maxFiles);
    }

    return loggerInstance;
}

export function getLogger() {
    if (!loggerInstance) {
        // 提供一个后备，防止初始化前调用报错
        return pino({ level: 'info' });
    }
    return loggerInstance;
}

export default getLogger;
