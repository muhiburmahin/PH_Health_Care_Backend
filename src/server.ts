import { Server } from 'http';
import app from './app';
import config from './app/config';

async function main() {
    const server: Server = app.listen(config.port, () => {
        console.log(`🚀 Server is running on http://localhost:${config.port}`);
    });

    const exitHandler = () => {
        if (server) {
            server.close(() => {
                console.log('Server closed');
            });
        }
        process.exit(1);
    };

    process.on('unhandledRejection', (error) => {
        console.log('Unhandled Rejection detected, shutting down...', error);
        exitHandler();
    });
}

main();