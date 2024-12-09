'use strict';

import process from 'node:process';
import express from 'express';
import { initFastCGI, requestFastCGI } from './js/fastcgi.js';
import { createServer } from 'https';
import { join, extname } from 'path';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { normalizePort, onError } from './js/utils.js';

/********************** Options *****************************/
const isSingleIndexApp = true;
const port = normalizePort(process.env.PORT || '443');
const fastcgiPort = normalizePort('9000');
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, 'public/public_html');
const options = {
    key: readFileSync('asp_net_key.pem', 'utf8'),
    cert: readFileSync('asp_net_cert.pem', 'utf8')
};
/************************************************************/

initFastCGI(fastcgiPort).then(serverCgi => {
    const server_app = express();
    server_app.set('port', port);
    server_app.set('views', join(__dirname, 'views'));
    server_app.set('view engine', 'ejs');
    server_app.use((req, res, next) => {
        let fileName = req.path;
        let ext = extname(fileName);
        let exist = false;
        let filePath;
        if (ext === '') {
            fileName = isSingleIndexApp ? '/index.php' : fileName.replace(/\/$/, '') + '/index.php';
            if (existsSync(join(rootDir, fileName))) {
                exist = true;
                ext = '.php';
            } else {
                fileName = isSingleIndexApp ? '/index.html' : req.path.replace(/\/$/, '') + '/index.html';
                exist = existsSync(join(rootDir, fileName));
            }
        } else {
            filePath = join(rootDir, fileName);
            exist = existsSync(filePath);
        }
        if (exist) {
            if (ext === '.php') {
                requestFastCGI(fileName, rootDir.replace(/\\/g, '/'), req, res, next);
            } else {
                res.sendFile(filePath);
            }
        } else {
            const err = new Error(`Not Found: ${fileName}`);
            err.status = 404;
            next(err);
        }
    });
    server_app.use((err, req, res, _next) => { // Error Handler
        res.locals.message = err.message;
        res.locals.error = req.app.get('env') === 'development' ? err : {}; // only providing error in development
        res.status(err.status || 500);
        res.render('error', { title: 'Error', error: err });
    });
    const server = createServer(options, server_app);
    server.on('error', onError);
    server.listen(port, () => {
        console.log(`Run Https Server on port ${port}`);
    });
    process.on('SIGHUP', () => {
        serverCgi.kill();
        console.log('Shutting down all of Servers...');
        server.close(() => {
            console.log('Https Server closed!');
        });
    });
}).catch(error => {
    console.error('PHP FastCGI Server failed:', error);
    setInterval(function () { }, 1000);
});
