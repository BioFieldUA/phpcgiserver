# phpcgiserver

[![npm version](https://badge.fury.io/js/phpcgiserver.svg)](https://badge.fury.io/js/phpcgiserver)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`phpcgiserver` is a lightweight and efficient Node.js module that allows you to run a PHP FastCGI server. It leverages the power of Node.js for handling HTTPS connections and routing, while seamlessly integrating with a PHP FastCGI backend to process PHP scripts.

## Features

*   **Easy Integration:** Designed to be simple to use and integrate into existing Node.js projects.
*   **HTTPS Support:** Built-in support for secure HTTPS connections using provided SSL certificates.
*   **Customizable Logging:** Allows you to inject your own logger for flexible logging of information and errors.
*   **Configurable Options:** Offers a range of options to customize server behavior, including port settings, root directory, and SSL certificate paths.
*   **Single Index Application Support**:  Provides an option to specify if the application is a single index application (e.g., using `index.php` as the entry point).
*   **Efficient FastCGI Handling:**  Efficiently handles communication with the PHP FastCGI process.

## Installation
npm install phpcgiserver

## Usage
Here's a basic example of how to use phpcgiserver to create and start a PHP FastCGI server:

import PHPServer from 'phpcgiserver';

const options = {
    isSingleIndexApp: true,
    serverPort: '443',
    fastCgiPort: '9000',
    rootDir: 'public/public_html',   // Path to your PHP files
    certKey: 'asp_net_key.pem',      // Path to your SSL private key
    certBody: 'asp_net_cert.pem',    // Path to your SSL certificate
};

const logger = {
    log: (message) => console.log(`INFO: ${message}`),
    error: (message) => console.error(`ERROR: ${message}`),
};

const phpServer = new PHPServer(options, logger);

phpServer.start().catch(e => {
    // Keep the process alive to prevent immediate exit on error:
    setInterval(() => { }, 1000);
});

You can easily replace the default logger with your own implementation. This allows you to integrate with your preferred logging system.


## API Documentation
PHPServer Class
constructor(options, logger?)
Creates a new instance of the PHPServer.

options (Object): An object containing the server configuration options.
isSingleIndexApp (boolean): Indicates if the application is a single index application (default: true). Set it to TRUE if you want to redirect all of requests to `index.php` at the root directory.
serverPort (number|string): The port number for the HTTPS server (default: 443).
fastCgiPort (number|string): The port number for the PHP FastCGI server (default: 9000).
rootDir (string): The root directory where your PHP files are located.
certKey (string): The path to your SSL private key file.
certBody (string): The path to your SSL certificate file.
logger (Object, optional): An object with log and error methods for logging. Defaults to `console` if not provided.

The logger object should implement the following interface:
interface Logger {
  log(message: string): void;
  error(message: string): void;
}

### Error Handling
The PHPServer class handles common errors such as port conflicts and permission issues. If an unrecoverable error occurs, the process will exit with a non-zero code.

### Signal Handling
The server listens for the SIGHUP signal to gracefully shut down the FastCGI and HTTPS Servers.

## Contributing
Contributions are welcome! Please feel free to submit issues or pull requests on the GitHub repository.
Fork the repository.
Create a new branch for your feature or bug fix.
Make your changes and write tests if applicable.

## License
This project is licensed under the MIT License - see the LICENSE.txt file for details.

## Acknowledgements
This project uses the `fastcgi-client` package for FastCGI communication.
Inspired by the need for a simple and efficient way to run PHP applications within a Node.js environment.
