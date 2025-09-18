// middleware/auth.js - ACTUALIZADO PARA SOPORTE COMPLETO DE ROLES Y PERMISOS
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// Middleware para verificar JWT
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token de acceso requerido',
            error_code: 'NO_TOKEN'
        });
    }

    try {
        // Verificar el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Buscar el usuario en la base de datos con información completa
        const users = await query(`
            SELECT 
                u.id, u.email, u.name, u.role, u.status, u.dni, u.phone,
                u.last_login, u.created_at,
                r.name as role_name, r.type as role_type, r.description as role_description
            FROM users u
            LEFT JOIN roles r ON u.role = r.id
            WHERE u.id = ?
        `, [decoded.userId]);

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado',
                error_code: 'USER_NOT_FOUND'
            });
        }

        const user = users[0];

        // Verificar que el usuario esté activo
        if (user.status !== 'active') {
            return res.status(401).json({
                success: false,
                message: 'Usuario inactivo',
                error_code: 'USER_INACTIVE'
            });
        }

        // Obtener permisos del usuario
        const permissions = await query(`
            SELECT p.id as permission_id, p.name as permission_name, 
                   p.group_id, p.group_name
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id
            WHERE rp.role_id = ?
        `, [user.role]);

        // Agregar información del usuario al request
        req.user = {
            ...user,
            permissions: permissions.map(p => p.permission_id),
            permission_details: permissions
        };

        // Actualizar último acceso
        await query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

        next();
    } catch (error) {
        console.error('Error verificando token:', error);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expirado',
                error_code: 'TOKEN_EXPIRED'
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({
                success: false,
                message: 'Token inválido',
                error_code: 'INVALID_TOKEN'
            });
        }
        
        return res.status(500).json({
            success: false,
            message: 'Error interno verificando autenticación',
            error_code: 'AUTH_ERROR'
        });
    }
};

// Middleware para verificar roles (MEJORADO)
const authorizeRole = (requiredRoles = []) => {
    return (req, res, next) => {
        // Si no se requieren roles específicos, continuar
        if (!requiredRoles.length) {
            return next();
        }

        // Verificar que el usuario tenga el rol requerido
        if (!req.user || !req.user.role) {
            return res.status(403).json({
                success: false,
                message: 'Información de usuario no disponible',
                error_code: 'NO_USER_INFO'
            });
        }

        const userRole = req.user.role;
        const hasRole = requiredRoles.includes(userRole);

        if (!hasRole) {
            return res.status(403).json({
                success: false,
                message: `Acceso denegado. Roles requeridos: ${requiredRoles.join(', ')}. Tu rol: ${userRole}`,
                error_code: 'INSUFFICIENT_ROLE',
                required_roles: requiredRoles,
                user_role: userRole
            });
        }

        next();
    };
};

// Middleware para verificar permisos específicos (NUEVO)
const authorizePermission = (requiredPermissions = []) => {
    return (req, res, next) => {
        // Si no se requieren permisos específicos, continuar
        if (!requiredPermissions.length) {
            return next();
        }

        // Verificar que el usuario tenga permisos
        if (!req.user || !req.user.permissions) {
            return res.status(403).json({
                success: false,
                message: 'Información de permisos no disponible',
                error_code: 'NO_PERMISSION_INFO'
            });
        }

        const userPermissions = req.user.permissions;
        
        // Verificar si el usuario tiene al menos uno de los permisos requeridos
        const hasAnyPermission = requiredPermissions.some(permission => 
            userPermissions.includes(permission)
        );

        if (!hasAnyPermission) {
            return res.status(403).json({
                success: false,
                message: `Acceso denegado. Se requiere al menos uno de estos permisos: ${requiredPermissions.join(', ')}`,
                error_code: 'INSUFFICIENT_PERMISSIONS',
                required_permissions: requiredPermissions,
                user_permissions: userPermissions
            });
        }

        next();
    };
};

// Middleware para verificar permisos múltiples (todos requeridos) (NUEVO)
const authorizeAllPermissions = (requiredPermissions = []) => {
    return (req, res, next) => {
        // Si no se requieren permisos específicos, continuar
        if (!requiredPermissions.length) {
            return next();
        }

        // Verificar que el usuario tenga permisos
        if (!req.user || !req.user.permissions) {
            return res.status(403).json({
                success: false,
                message: 'Información de permisos no disponible',
                error_code: 'NO_PERMISSION_INFO'
            });
        }

        const userPermissions = req.user.permissions;
        
        // Verificar si el usuario tiene TODOS los permisos requeridos
        const hasAllPermissions = requiredPermissions.every(permission => 
            userPermissions.includes(permission)
        );

        if (!hasAllPermissions) {
            const missingPermissions = requiredPermissions.filter(permission => 
                !userPermissions.includes(permission)
            );

            return res.status(403).json({
                success: false,
                message: `Acceso denegado. Faltan permisos: ${missingPermissions.join(', ')}`,
                error_code: 'MISSING_PERMISSIONS',
                required_permissions: requiredPermissions,
                missing_permissions: missingPermissions,
                user_permissions: userPermissions
            });
        }

        next();
    };
};

// Middleware para verificar si es propietario del recurso (NUEVO)
const authorizeOwnership = (userIdField = 'userId') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no autenticado',
                error_code: 'NOT_AUTHENTICATED'
            });
        }

        // Obtener el ID del usuario objetivo desde parámetros, body o query
        const targetUserId = req.params[userIdField] || 
                           req.body[userIdField] || 
                           req.query[userIdField];

        // Si no se especifica usuario objetivo, asumir que es para el usuario actual
        if (!targetUserId) {
            return next();
        }

        // Verificar si es el propietario o tiene permisos administrativos
        const isOwner = parseInt(targetUserId) === req.user.id;
        const isAdmin = req.user.permissions?.includes('system.users') || 
                       req.user.role_type === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Solo puedes acceder a tus propios datos',
                error_code: 'OWNERSHIP_VIOLATION'
            });
        }

        next();
    };
};

// Middleware para logging de auditoría (NUEVO)
const auditLog = (action) => {
    return async (req, res, next) => {
        // Guardar información original de res.json
        const originalJson = res.json;
        
        res.json = function(data) {
            // Ejecutar respuesta original
            originalJson.call(this, data);
            
            // Crear log de auditoría si hay usuario autenticado
            if (req.user) {
                const logData = {
                    user_id: req.user.id,
                    action: action || `${req.method} ${req.route?.path || req.path}`,
                    description: `${req.method} ${req.originalUrl}`,
                    ip_address: req.ip || req.connection?.remoteAddress,
                    user_agent: req.get('User-Agent'),
                    performed_by: req.user.id,
                    status_code: res.statusCode,
                    success: data?.success || res.statusCode < 400
                };

                // Insertar log de forma asíncrona sin bloquear la respuesta
                setImmediate(async () => {
                    try {
                        await query(`
                            INSERT INTO user_audit_logs (user_id, action, description, ip_address, user_agent, performed_by)
                            VALUES (?, ?, ?, ?, ?, ?)
                        `, [
                            logData.user_id,
                            logData.action,
                            logData.description,
                            logData.ip_address,
                            logData.user_agent,
                            logData.performed_by
                        ]);
                    } catch (error) {
                        console.error('Error creando log de auditoría:', error);
                    }
                });
            }
        };

        next();
    };
};

// Middleware para verificar múltiples condiciones (NUEVO)
const authorizeComplex = (conditions) => {
    return async (req, res, next) => {
        try {
            const {
                roles = [],
                permissions = [],
                allPermissions = [],
                customCheck = null,
                allowOwnership = false,
                ownershipField = 'id'
            } = conditions;

            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no autenticado',
                    error_code: 'NOT_AUTHENTICATED'
                });
            }

            let authorized = false;
            let authReason = '';

            // Verificar roles
            if (roles.length > 0 && roles.includes(req.user.role)) {
                authorized = true;
                authReason = 'role';
            }

            // Verificar permisos (al menos uno)
            if (!authorized && permissions.length > 0) {
                const hasPermission = permissions.some(perm => 
                    req.user.permissions?.includes(perm)
                );
                if (hasPermission) {
                    authorized = true;
                    authReason = 'permission';
                }
            }

            // Verificar todos los permisos requeridos
            if (!authorized && allPermissions.length > 0) {
                const hasAllPermissions = allPermissions.every(perm => 
                    req.user.permissions?.includes(perm)
                );
                if (hasAllPermissions) {
                    authorized = true;
                    authReason = 'all_permissions';
                }
            }

            // Verificar propiedad del recurso
            if (!authorized && allowOwnership) {
                const resourceUserId = req.params[ownershipField] || req.body[ownershipField];
                if (resourceUserId && parseInt(resourceUserId) === req.user.id) {
                    authorized = true;
                    authReason = 'ownership';
                }
            }

            // Verificación personalizada
            if (!authorized && customCheck && typeof customCheck === 'function') {
                const customResult = await customCheck(req, res);
                if (customResult) {
                    authorized = true;
                    authReason = 'custom';
                }
            }

            if (!authorized) {
                return res.status(403).json({
                    success: false,
                    message: 'Acceso denegado. No tienes permisos suficientes.',
                    error_code: 'ACCESS_DENIED',
                    required_conditions: conditions
                });
            }

            // Agregar razón de autorización para logging
            req.authReason = authReason;
            next();

        } catch (error) {
            console.error('Error en authorizeComplex:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno verificando permisos',
                error_code: 'AUTH_CHECK_ERROR'
            });
        }
    };
};

module.exports = {
    authenticateToken,
    authorizeRole,
    authorizePermission,
    authorizeAllPermissions,
    authorizeOwnership,
    authorizeComplex,
    auditLog
};