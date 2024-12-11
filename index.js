import process from 'node:process';
import express from 'express';
import { initFastCGI, requestFastCGI } from './js/fastcgi.js';
import { createServer } from 'https';
import { join, extname } from 'path';
import { readFileSync, existsSync } from 'fs';
import { normalizePort } from './js/utils.js';

class PHPServer {
    /**
     * @typedef {Object} ServerOptions
     * @property {boolean} isSingleIndexApp - Set it to TRUE if you want to redirect all of requests to index.php at the root directory.
     * @property {number} serverPort - The port number for the HTTPS Server.
     * @property {number} fastCgiPort - The port number for the FastCGI Server.
     * @property {string} rootDir - A relative Path to the root directory for serving files.
     * @property {string} certKey - A relative Path to the SSL key file.
     * @property {string} certBody - A relative Path to the SSL certificate file.
     */
    /**
     * @typedef {Object} Logger
     * @property {function(string): void} log - Logs an informational message.
     * @property {function(string): void} error - Logs an error message.
     */
    /**
     * @param {ServerOptions} options - The server configuration options.
     * @param {Logger} logger - The logger to use for logging messages.
     */
    constructor(options, logger = console) {
        this.isSingleIndexApp = options.isSingleIndexApp || true;
        this.serverPort = normalizePort(options.serverPort || '443');
        this.fastCgiPort = normalizePort(options.fastCgiPort || '9000');
        this.rootDir = join(process.cwd(), options.rootDir || 'public/public_html');
        this.options = {
            key: readFileSync(options.certKey, 'utf8'),
            cert: readFileSync(options.certBody, 'utf8'),
        };
        this.logger = logger;
        this.serverApp = null;
        this.serverCgi = null;
        this.server = null;
    }

    /**
     * Initializes and starts the PHP Server.
     * 
     * @throws {Error} If an error occurs while starting or connecting to the PHP Server.
     */
    async start() {
        try {
            this.serverCgi = await initFastCGI(this.fastCgiPort, this.logger);
            this.setupServer();
            this.server = createServer(this.options, this.serverApp);
            this.server.on('error', this.onError);
            this.server.listen(this.serverPort, () => {
                this.logger.log(`Run Https Server on port ${this.serverPort}`);
            });
            process.on('SIGHUP', () => {
                this.logger.log('Shutting down all of Servers...');
                this.serverCgi.kill();
                this.server.close(() => {
                    this.logger.log('Https Server closed!');
                });
            });
        } catch (e) {
            this.logger.error('PHP FastCGI Server failed:', e);
            throw e;
        }
    }

    /**
     * Sets up the Express Server.
     */
    setupServer() {
        this.serverApp = express();
        this.serverApp.set('port', this.serverPort);
        this.serverApp.set('views', join(process.cwd(), 'views'));
        this.serverApp.set('view engine', 'ejs');

        this.serverApp.use((req, res, next) => {
            let fileName = req.path;
            let ext = extname(fileName);
            let exist = false;
            let filePath;
            if (ext === '') {
                fileName = this.isSingleIndexApp ? '/index.php' : fileName.replace(/\/$/, '') + '/index.php';
                if (existsSync(join(this.rootDir, fileName))) {
                    exist = true;
                    ext = '.php';
                } else {
                    fileName = this.isSingleIndexApp ? '/index.html' : req.path.replace(/\/$/, '') + '/index.html';
                    exist = existsSync(join(this.rootDir, fileName));
                }
            } else {
                filePath = join(this.rootDir, fileName);
                exist = existsSync(filePath);
            }
            if (exist) {
                if (ext === '.php') {
                    requestFastCGI(fileName, this.rootDir.replace(/\\/g, '/'), req, res, next);
                } else {
                    res.sendFile(filePath);
                }
            } else {
                const err = new Error(`Not Found: ${fileName}`);
                err.status = 404;
                next(err);
            }
        });

        this.serverApp.use((err, req, res, _next) => {
            res.locals.message = err.message;
            res.locals.error = req.app.get('env') === 'development' ? err : {};
            res.status(err.status || 500);
            res.render('error', { title: 'Error', error: err });
        });
    }

    /**
     * Handles server error events.
     * @param {Error} error - The error that occurred.
     */
    onError(error) {
        if (error.syscall !== 'listen') {
            throw error;
        }
        switch (error.code) {
            case 'EACCES':
                this.logger.error('Https Server Port requires elevated privileges');
                process.exit(1);
                break;
            case 'EADDRINUSE':
                this.logger.error('Https Server Port is already in use');
                process.exit(1);
                break;
            default:
                throw error;
        }
    }

}

export default PHPServer;
