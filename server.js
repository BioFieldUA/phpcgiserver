import { PHPServer, DefaultLogger } from 'phpcgiserver';

const options = {
    isSingleIndexApp: true
};

const phpServer = new PHPServer(options, DefaultLogger);
phpServer.start().catch(e => {
    // Keep the node process alive to prevent immediate exit on error:
    setInterval(() => { }, 1000);
});
