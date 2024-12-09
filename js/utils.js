import process from 'node:process';

/**
 * Event listener for Https Server "error" event.
 */
export function onError(error) {
    if (error.syscall !== 'listen') {
        console.error('Error syscall = ' + error.syscall);
        throw error;
    }
    switch (error.code) {
        case 'EACCES':
            console.error('Https Server Port requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error('Https Server Port is already in use');
            process.exit(1);
            break;
        default:
            console.error('Error code = ' + error.code);
            throw error;
    }
}

/**
 * Normalize a port into a number, string, or false.
 */
export function normalizePort(val) {
    const port = parseInt(val, 10);
    if (isNaN(port)) {
        return val;
    }
    if (port >= 0) {
        return port;
    }
    return false;
}
