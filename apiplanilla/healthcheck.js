// healthcheck.js - Health check para el backend
const http = require('http');

const options = {
    hostname: 'localhost',
    port: process.env.PORT || 3000,
    path: '/api/health',
    method: 'GET',
    timeout: 5000
};

const healthCheck = http.request(options, (res) => {
    console.log(`Health check status: ${res.statusCode}`);
    
    if (res.statusCode === 200) {
        process.exit(0); // Success
    } else {
        console.error(`Health check failed with status: ${res.statusCode}`);
        process.exit(1); // Failure
    }
});

healthCheck.on('error', (err) => {
    console.error('Health check error:', err.message);
    process.exit(1); // Failure
});

healthCheck.on('timeout', () => {
    console.error('Health check timeout');
    healthCheck.destroy();
    process.exit(1); // Failure
});

healthCheck.end();