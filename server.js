'use strict';

import PHPServer from 'phpcgiserver';

const logger = {
    log: (message) => console.log(`INFO: ${message}`),
    error: (message) => console.error(`ERROR: ${message}`),
};

const options = {
    isSingleIndexApp: true,
    serverPort: '443',
    fastCgiPort: '9000',
    rootDir: 'public/public_html',
    certKey: 'asp_net_key.pem',
    certBody: 'asp_net_cert.pem',
};

const phpServer = new PHPServer(options, logger);
phpServer.start().catch(e => {
    setInterval(() => { }, 1000);
});
