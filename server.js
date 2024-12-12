import PHPServer from 'phpcgiserver';

const options = {
    isSingleIndexApp: false
};

const logger = {
    log: (message) => console.log(`INFO: ${message}`),
    error: (message) => console.error(`ERROR: ${message}`)
};

const phpServer = new PHPServer(options, logger);
phpServer.start().catch(e => {
    setInterval(() => { }, 1000);
});
