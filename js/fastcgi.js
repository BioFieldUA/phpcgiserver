import { spawn } from 'child_process';
import fastcgiConnector from 'fastcgi-client';
import { posix } from 'path';

let _clientCgi;

/**
 * Initializes the FastCGI server by spawning a php-cgi process and establishing a connection.
 *
 * @typedef {Object} Logger
 * @property {function(string): void} log - Logs an informational message.
 * @property {function(string): void} error - Logs an error message.
 * 
 * @param {number} port - The port on which the FastCGI server will be started.
 * @param {Logger} logger - The logger to use for logging messages.
 * @returns {Promise<ChildProcess>} A Promise that resolves with the child process object
 *                                  of php-cgi after successful connection of the FastCGI client.
 *                                  The Promise rejects if an error occurs while starting or 
 *                                  the server is killed before the client initialization.
 * @throws {Error} If an error occurs while starting or connecting to the FastCGI server.
 */
export function initFastCGI(port, logger = console) {
    return new Promise((resolve, reject) => {
        let _cgi_init = false;
        const serverCgi = spawn('php-cgi', ['-b', `127.0.0.1:${port}`]);
        serverCgi.on('spawn', () => {
            logger.log('FastCGI Server creating...');
            _clientCgi = fastcgiConnector({
                host: '127.0.0.1',
                port: port,
                maxConns: 100
            });
            _clientCgi.on('ready', () => {
                logger.log('FastCGI Server is ready');
                _cgi_init = true;
                resolve(serverCgi);
            });
            _clientCgi.on('error', (error) => {
                if (_cgi_init) {
                    logger.error(`FastCGI Client ${error}`);
                }
            });
        });
        serverCgi.on('close', () => {
            if (_cgi_init) {
                logger.log('FastCGI Server closed!');
            } else {
                serverCgi.kill();
                reject(new Error('FastCGI Server was killed before initialization!'));
            }
        });
        serverCgi.on('error', (error) => {
            if (_cgi_init) {
                logger.error(`FastCGI Server ${error}`);
            } else {
                serverCgi.kill();
                reject(error);
            }
        });
    });
}

/**
 * Sends a request to the FastCGI Server and returns the response.
 *
 * @param {string} fileName - The relative path of the script file that will be executed to the root directory.
 * @param {string} rootDir - The root directory for the web server.
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The function to pass control to the next middleware.
 */
export function requestFastCGI(fileName, rootDir, req, res, next) {
    if (!_clientCgi) {
        const err = new Error('FastCGI not initialized');
        err.status = 500;
        next(err);
        return;
    }
    const params = {
        GATEWAY_INTERFACE: 'CGI/1.1',
        REQUEST_METHOD: req.method,
        SCRIPT_FILENAME: posix.join(rootDir, fileName),
        DOCUMENT_ROOT: rootDir,
        REQUEST_URI: req.url,
        SCRIPT_NAME: fileName,
        QUERY_STRING: req.url.split('?')[1] || '',
        PHP_SELF: fileName,
        CONTENT_TYPE: req.headers['content-type'] || '',
        CONTENT_LENGTH: req.headers['content-length'] || '',
        SERVER_NAME: req.hostname,
        SERVER_PORT: req.app.get('port'),
        SERVER_ADDR: req.socket.localAddress,
        SERVER_PROTOCOL: 'HTTP/' + req.httpVersion,
        SERVER_SOFTWARE: 'node',
        REMOTE_ADDR: '26.45.221.34', // req.socket.remoteAddress,
        REMOTE_PORT: req.socket.remotePort,
        REQUEST_SCHEME: req.secure ? 'https' : 'http',
        HTTPS: req.secure ? 'on' : 'off'
    };
    for (const [key, value] of Object.entries(req.headers)) {
        const k = key.toUpperCase().replace(/-/g, '_');
        if (typeof value === 'string' && k !== 'CONTENT_TYPE' && k !== 'CONTENT_LENGTH') {
            params['HTTP_' + k] = value;
        }
    }
    getPostData(req).then(stdin => {
        _clientCgi.request(params, (error, request) => {
            if (error) {
                error.status = 500;
                next(error);
                return;
            }
            let chunks = [];
            let errorOut = '';
            request.stdout.on('data', (data) => {
                chunks.push(data);
            });
            request.stderr.on('data', (data) => {
                errorOut += data.toString();
            });
            request.stdout.on('end', () => {
                if (errorOut) {
                    const err = new Error('Internal Server Error');
                    err.status = 500;
                    err.stack = errorOut;
                    next(err);
                } else {
                    const buf = Buffer.concat(chunks);
                    const delim = Buffer.from('\r\n\r\n');
                    const idx = buf.indexOf(delim);
                    if (idx !== -1) {
                        const bodyBuffer = buf.subarray(idx + delim.length);
                        const headersBuffer = buf.subarray(0, idx).toString();
                        const headers = headersBuffer.split('\r\n').reduce((acc, header) => {
                            let [key, value] = header.split(': ');
                            if (key) {
                                const k = key.toLowerCase();
                                if (k === 'set-cookie') {
                                    res.append(key, value);
                                } else {
                                    res.setHeader(key, value);
                                }
                                acc[k] = value;
                            }
                            return acc;
                        }, {});
                        if (headers['content-type'] && !headers['content-type'].startsWith('text/html') && !headers['content-type'].startsWith('application/json')) {
                            res.send(bodyBuffer);
                        } else if (headers['location']) {
                            let statusCode = headers['status'] ? parseInt(headers['status'].split(' ')[0], 10) : 302;
                            if (statusCode === 500) {
                                const err = new Error('Internal Server Error');
                                err.status = statusCode;
                                err.stack = headersBuffer;
                                next(err);
                            } else {
                                if (statusCode > 302) statusCode = 302;
                                res.redirect(statusCode, headers['location']);
                            }
                        } else {
                            res.send(bodyBuffer.toString());
                        }
                    } else {
                        res.send(buf.toString());
                    }
                }
            });
            if (stdin) {
                request.stdin.write(stdin);
                request.stdin.end();
            } else {
                request.stdin.end();
            }
        });
    }).catch(e => {
        e.status = 500;
        next(e);
    });
}

/**
 * Extracts and concatenates the POST or PUT request body data.
 *
 * This function reads the data chunks from the request stream for POST or PUT methods and concatenates them into a single Buffer.
 * For other HTTP methods, it resolves with an empty string.
 * 
 * @param {import('express').Request} req - The Express request object.
 * @returns {Promise<Buffer|string>} A Promise that resolves with the concatenated request body as a Buffer 
 *                                    for POST/PUT requests, or an empty string for other methods.
 *                                    Rejects with an error if there's an issue reading the request data.
 */
function getPostData(req) {
    return new Promise((resolve, reject) => {
        let stdin = [];
        if (req.method === 'POST' || req.method === 'PUT') {
            req.on('data', chunk => {
                stdin.push(chunk);
            });
            req.on('end', () => {
                resolve(Buffer.concat(stdin));
            });
            req.on('error', (error) => {
                reject(error);
            });
        } else {
            resolve('');
        }
    });
}
