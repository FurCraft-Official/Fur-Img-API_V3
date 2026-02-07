import fs from 'fs-extra';
import path from 'path';

async function initConfig() {
    try {
        const exists = await fs.pathExists(path.resolve('./data/config.json'));
        const data = {
            'server': {
                'addr': 'localhost',
                'httpport': 3000,
                'httpsport': 3001,
                'forcehttps': false,
                'gzip': true,
                'ssl': {
                    'enable': false,
                    'cert': './ssl/fullchain.pem',
                    'key': './ssl/privkey.pem'
                },
                'cors': {
                    'enabled': true,
                    'origins': '*',
                    'methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'preflightContinue': false,
                    'optionsSuccessStatus': 204
                },
                'rateLimit': {
                    'enable': true,
                    'windowMS': 15,
                    'limit': 100,
                    'statusCode': 429,
                    'message': 'too many requests',
                    'standardHeaders': 'draft-8',
                    'legacyHeaders': false,
                    'validate': {
                        'trustProxy': false
                    }
                }
            },
            'db': {
                'sqlite3': {
                    'file': './data/app.db'
                }
            },
            'log': {
                'path': './logs',
                'level': 4,
                'console': true,
                'file': true,
                'maxFiles': 7,
                'maxSize': '10M'
            },
            'paths': {
                'html': './public',
                'images': './img'
            },
            'admintoken': '114514'

        };
        if (!exists) {
            try {
                // 初始化配置
                await fs.outputJsonSync(path.resolve('./data/config.json'), data, { spaces: 4 });
                console.log('Default configuration file created at ./config/config.json');
            } catch (e) {
                console.error('Failed to create default config file:', e);
            }
        }
    } catch (e) {
        console.error('Failed to initialize config:', e);
        process.exit(1);
    }
}
async function readConfig() {
    try {
        const configData = await fs.readJSON(path.resolve('./data/config.json'));
        return configData;
    } catch (e) {
        console.error('Failed to read config:', e);
        process.exit(1);
    }
}
await initConfig();
const config = await readConfig();
console.log('Configuration load successfully.');
export default config;
