import express from "express";
import http from 'http';
import https from 'https';
import logger from "../utils/loggerInstance.js";
import fs from 'fs-extra';
import path from 'path';
import { createRoute } from "./api.js";
const app = express();


async function startWebserver(config, db) {
    const createWebServer = (config) => {
        try {
            const httpserver = http.createServer(app);
            httpserver.listen(config.server.httpport, config.server.addr, () => {
                logger.info(`http listen at http://${config.server.addr}:${config.server.httpport}`);
            });
            if (config.server.ssl.enable) {
                const ssl = {
                    key: fs.readFileSync(path.resolve(config.server.ssl.key)),
                    cert: fs.readFileSync(path.resolve(config.server.ssl.cert))
                };
                const httpsserver = https.createServer(ssl, app);
                httpsserver.listen(config.server.httpsport, config.server.addr, () => {
                    logger.info(`https listen at https://${config.server.addr}:${config.server.httpsport}`);
                });
            }
        } catch (e) {
            logger.error('failed to start server:', e);
            process.exit(1);
        }
    };
    createRoute(db, config, app, express);
    createWebServer(config);
}

export { startWebserver };