import { PHPServer } from 'phpcgiserver';

const options = {
    isSingleIndexApp: true
};

const logger = {
    log: (message) => console.log(`INFO: ${message}`),
    error: (message) => console.error(`ERROR: ${message}`)
};

const phpServer = new PHPServer(options, logger);
phpServer.start().catch(e => {
    // Keep the node process alive to prevent immediate exit on error:
    setInterval(() => { }, 1000);
});
