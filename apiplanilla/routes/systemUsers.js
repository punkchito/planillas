// routes/systemUsers.js - Rutas para gestión de usuarios del sistema
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, authorizePermission, auditLog } = require('../middleware/auth');
const systemUsersController = require('../controllers/systemUsersController');

const router = express.Router();

// Middleware para validar errores
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Errores de validación',
            errors: errors.array()
        });
    }
    next();
};

// Aplicar autenticación a todas las rutas
//router.use(authenticateToken);

// GET /api/system-users - Obtener usuarios del sistema con filtros y paginación
router.get('/',
    [
        //authorizePermission(['system.users']),
        query('page').optional().isInt({ min: 1 }).withMessage('Página debe ser un entero positivo'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite debe estar entre 1 y 100'),
        query('role').optional().isString(),
        query('status').optional().isIn(['all', 'active', 'inactive']).withMessage('Estado inválido'),
        query('search').optional().isString()
    ],
    handleValidationErrors,
    systemUsersController.getUsers
);

// GET /api/system-users/statistics - Estadísticas de usuarios
router.get('/statistics',
    //authorizePermission(['system.users', 'reports.dashboard']),
    systemUsersController.getUserStatistics
);

// GET /api/system-users/export - Exportar usuarios a CSV
router.get('/export',
    [
       // authorizePermission(['system.users', 'reports.export']),
        query('role').optional().isString(),
        query('status').optional().isIn(['all', 'active', 'inactive']).withMessage('Estado inválido')
    ],
    handleValidationErrors,
    auditLog('Exportación de usuarios del sistema'),
    systemUsersController.exportUsers
);

// GET /api/system-users/roles - Obtener roles disponibles
router.get('/roles',
    //authorizePermission(['system.users', 'system.roles']),
    systemUsersController.getAvailableRoles
);

// GET /api/system-users/:id - Obtener usuario específico
router.get('/:id',
    [
        //authorizePermission(['system.users']),
        param('id').isInt({ min: 1 }).withMessage('ID de usuario inválido')
    ],
    handleValidationErrors,
    systemUsersController.getUserById
);

// POST /api/system-users - Crear nuevo usuario
router.post('/',
    [
        //authorizePermission(['system.users']),
        body('name').trim().isLength({ min: 2, max: 255 }).withMessage('Nombre debe tener entre 2 y 255 caracteres'),
        body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
        body('role').notEmpty().withMessage('Rol es requerido'),
        body('active').optional().isBoolean().withMessage('Estado debe ser boolean'),
        body('dni').optional().matches(/^\d{8}$/).withMessage('DNI debe tener 8 dígitos'),
        body('phone').optional().isLength({ min: 6, max: 20 }).withMessage('Teléfono inválido'),
        body('password').optional().isLength({ min: 6, max: 50 }).withMessage('Contraseña debe tener entre 6 y 50 caracteres')
    ],
    handleValidationErrors,
    auditLog('Creación de usuario del sistema'),
    systemUsersController.createUser
);

// PUT /api/system-users/:id - Actualizar usuario
router.put('/:id',
    [
        //authorizePermission(['system.users']),
        param('id').isInt({ min: 1 }).withMessage('ID de usuario inválido'),
        body('name').optional().trim().isLength({ min: 2, max: 255 }).withMessage('Nombre debe tener entre 2 y 255 caracteres'),
        body('email').optional().isEmail().normalizeEmail().withMessage('Email inválido'),
        body('role').optional().notEmpty().withMessage('Rol no puede estar vacío'),
        body('active').optional().isBoolean().withMessage('Estado debe ser boolean'),
        body('dni').optional().matches(/^\d{8}$/).withMessage('DNI debe tener 8 dígitos'),
        body('phone').optional().isLength({ min: 6, max: 20 }).withMessage('Teléfono inválido')
    ],
    handleValidationErrors,
    auditLog('Actualización de usuario del sistema'),
    systemUsersController.updateUser
);

// PATCH /api/system-users/:id/status - Cambiar estado del usuario
router.patch('/:id/status',
    [
        //authorizePermission(['system.users']),
        param('id').isInt({ min: 1 }).withMessage('ID de usuario inválido'),
        body('active').isBoolean().withMessage('Estado debe ser boolean')
    ],
    handleValidationErrors,
    auditLog('Cambio de estado de usuario'),
    systemUsersController.toggleUserStatus
);

// POST /api/system-users/:id/reset-password - Resetear contraseña de usuario
router.post('/:id/reset-password',
    [
        //authorizePermission(['system.users']),
        param('id').isInt({ min: 1 }).withMessage('ID de usuario inválido'),
        body('new_password').optional().isLength({ min: 6, max: 50 }).withMessage('Nueva contraseña debe tener entre 6 y 50 caracteres')
    ],
    handleValidationErrors,
    auditLog('Reseteo de contraseña'),
    systemUsersController.resetUserPassword
);

// DELETE /api/system-users/:id - Eliminar usuario
router.delete('/:id',
    [
        //authorizePermission(['system.users']),
        param('id').isInt({ min: 1 }).withMessage('ID de usuario inválido')
    ],
    handleValidationErrors,
    auditLog('Eliminación de usuario del sistema'),
    systemUsersController.deleteUser
);

module.exports = router;