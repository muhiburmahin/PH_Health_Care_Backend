import { Server } from 'http';
import app from './app';
import { envVars } from './app/config/env';

let server: Server;

async function main() {
    try {
        server = app.listen(envVars.PORT, () => {
            console.log(`🚀 Server is running on http://localhost:${envVars.PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
    }

    process.on('unhandledRejection', (error) => {
        console.log('⚠️ Unhandled Rejection detected, shutting down...', error);
        if (server) {
            server.close(() => {
                process.exit(1);
            });
        } else {
            process.exit(1);
        }
    });

    // Uncaught Exception
    process.on('uncaughtException', (error) => {
        console.log('🚨 Uncaught Exception detected, shutting down...', error);
        process.exit(1);
    });
}

main();