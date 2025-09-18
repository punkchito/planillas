// middleware/security.js - Middleware de seguridad para el sistema
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Rate limiting para APIs
const createRateLimit = (windowMs, max, message) => {
    return rateLimit({
        windowMs,
        max,
        message: {
            success: false,
            message,
            error_code: 'RATE_LIMIT_EXCEEDED'
        },
        standardHeaders: true,
        legacyHeaders: false
    });
};

// Rate limiting para login (más restrictivo)
const loginRateLimit = createRateLimit(
    15 * 60 * 1000, // 15 minutos
    5, // 5 intentos
    'Demasiados intentos de inicio de sesión. Intenta nuevamente en 15 minutos.'
);

// Rate limiting general para APIs
const apiRateLimit = createRateLimit(
    15 * 60 * 1000, // 15 minutos
    100, // 100 requests
    'Demasiadas peticiones desde esta IP. Intenta nuevamente más tarde.'
);

// Rate limiting para configuración (más restrictivo)
const configRateLimit = createRateLimit(
    10 * 60 * 1000, // 10 minutos
    20, // 20 requests
    'Demasiadas peticiones de configuración. Intenta nuevamente en 10 minutos.'
);

// Configuración de helmet para seguridad
const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
});

// Middleware para validar IPs permitidas (opcional)
const ipWhitelist = (allowedIPs = []) => {
    return (req, res, next) => {
        if (allowedIPs.length === 0) {
            return next(); // Si no hay IPs especificadas, permitir todas
        }

        const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
        const isAllowed = allowedIPs.some(ip => {
            if (ip.includes('/')) {
                // Manejo de subredes CIDR (implementación básica)
                const [network, prefix] = ip.split('/');
                // Implementación simplificada para IPs locales
                return clientIP.includes(network.split('.').slice(0, -1).join('.'));
            }
            return clientIP === ip || clientIP.endsWith(ip);
        });

        if (!isAllowed) {
            return res.status(403).json({
                success: false,
                message: 'Acceso denegado desde esta IP',
                error_code: 'IP_NOT_ALLOWED'
            });
        }

        next();
    };
};

// Middleware para sanitizar inputs
const sanitizeInput = (req, res, next) => {
    const sanitizeValue = (value) => {
        if (typeof value === 'string') {
            // Remover caracteres potencialmente peligrosos
            return value
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '')
                .trim();
        }
        return value;
    };

    const sanitizeObject = (obj) => {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    sanitizeObject(obj[key]);
                } else {
                    obj[key] = sanitizeValue(obj[key]);
                }
            }
        }
    };

    // Sanitizar body, query y params
    if (req.body && typeof req.body === 'object') {
        sanitizeObject(req.body);
    }
    if (req.query && typeof req.query === 'object') {
        sanitizeObject(req.query);
    }
    if (req.params && typeof req.params === 'object') {
        sanitizeObject(req.params);
    }

    next();
};

// Middleware para log de seguridad
const securityLog = (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(body) {
        // Log de intentos de acceso no autorizados
        if (res.statusCode === 401 || res.statusCode === 403) {
            console.warn(`🚨 Acceso no autorizado: ${req.method} ${req.path} - IP: ${req.ip} - Status: ${res.statusCode}`);
            
            // Aquí podrías agregar lógica para registrar en base de datos
            // o enviar alertas de seguridad
        }
        
        // Log de errores del servidor
        if (res.statusCode >= 500) {
            console.error(`💥 Error del servidor: ${req.method} ${req.path} - IP: ${req.ip} - Status: ${res.statusCode}`);
        }
        
        originalSend.call(this, body);
    };

    next();
};

// Middleware para validar User-Agent (detectar bots maliciosos)
const validateUserAgent = (req, res, next) => {
    const userAgent = req.get('User-Agent');
    
    if (!userAgent) {
        console.warn(`🤖 Petición sin User-Agent desde IP: ${req.ip}`);
    }

    // Lista de User-Agents sospechosos (expandible)
    const suspiciousAgents = [
        'sqlmap',
        'nikto',
        'nessus',
        'nmap',
        'masscan',
        'curl', // Opcional: podrías permitir curl en desarrollo
        'wget'
    ];

    if (userAgent && suspiciousAgents.some(agent => 
        userAgent.toLowerCase().includes(agent.toLowerCase()))) {
        
        console.warn(`🚫 User-Agent sospechoso bloqueado: ${userAgent} desde IP: ${req.ip}`);
        return res.status(403).json({
            success: false,
            message: 'User-Agent no permitido',
            error_code: 'SUSPICIOUS_USER_AGENT'
        });
    }

    next();
};

// Middleware para proteger rutas sensibles
const protectSensitiveRoutes = (req, res, next) => {
    const sensitiveRoutes = [
        '/api/system-config',
        '/api/users',
        '/api/roles'
    ];

    const isSensitive = sensitiveRoutes.some(route => req.path.startsWith(route));
    
    if (isSensitive) {
        // Agregar headers adicionales de seguridad
        res.set('X-Content-Type-Options', 'nosniff');
        res.set('X-Frame-Options', 'DENY');
        res.set('X-XSS-Protection', '1; mode=block');
        res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
        
        // Log de acceso a rutas sensibles
        console.info(`🔐 Acceso a ruta sensible: ${req.method} ${req.path} - Usuario: ${req.user?.email || 'No autenticado'} - IP: ${req.ip}`);
    }

    next();
};

module.exports = {
    loginRateLimit,
    apiRateLimit,
    configRateLimit,
    helmetConfig,
    ipWhitelist,
    sanitizeInput,
    securityLog,
    validateUserAgent,
    protectSensitiveRoutes
};