// routes/users.js
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const usersController = require('../controllers/usersController');

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

// Validaciones para crear usuario
const validateCreateUser = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 255 })
        .withMessage('El nombre debe tener entre 2 y 255 caracteres')
        .matches(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/)
        .withMessage('El nombre solo puede contener letras y espacios'),

    body('email')
        .isEmail()
        .withMessage('Debe ser un email válido')
        .normalizeEmail(),

    body('password')
        .optional()
        .isLength({ min: 6, max: 50 })
        .withMessage('La contraseña debe tener entre 6 y 50 caracteres'),

    body('role')
        .notEmpty()
        .withMessage('El rol es requerido')
        .isLength({ min: 1, max: 50 })
        .withMessage('El rol debe tener entre 1 y 50 caracteres'),

    body('dni')
        .optional()
        .isLength({ min: 8, max: 20 })
        .withMessage('El DNI debe tener entre 8 y 20 caracteres')
        .matches(/^[0-9]+$/)
        .withMessage('El DNI debe contener solo números'),

    body('phone')
        .optional()
        .isMobilePhone('es-PE')
        .withMessage('Debe ser un número de teléfono válido'),

    body('status')
        .optional()
        .isIn(['active', 'inactive'])
        .withMessage('El estado debe ser active o inactive')
];

// Validaciones para actualizar usuario
const validateUpdateUser = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('ID de usuario inválido'),

    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 255 })
        .withMessage('El nombre debe tener entre 2 y 255 caracteres')
        .matches(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/)
        .withMessage('El nombre solo puede contener letras y espacios'),

    body('email')
        .optional()
        .isEmail()
        .withMessage('Debe ser un email válido')
        .normalizeEmail(),

    body('password')
        .optional()
        .isLength({ min: 6, max: 50 })
        .withMessage('La contraseña debe tener entre 6 y 50 caracteres'),

    body('role')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('El rol debe tener entre 1 y 50 caracteres'),

    body('dni')
        .optional()
        .isLength({ min: 8, max: 20 })
        .withMessage('El DNI debe tener entre 8 y 20 caracteres')
        .matches(/^[0-9]+$/)
        .withMessage('El DNI debe contener solo números'),

    body('phone')
        .optional()
        .isMobilePhone('es-PE')
        .withMessage('Debe ser un número de teléfono válido'),

    body('status')
        .optional()
        .isIn(['active', 'inactive'])
        .withMessage('El estado debe ser active o inactive')
];

// Validaciones para cambiar estado
const validateChangeStatus = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('ID de usuario inválido'),

    body('status')
        .isIn(['active', 'inactive'])
        .withMessage('El estado debe ser active o inactive')
];

// Validaciones para importar CSV
const validateImportCSV = [
    body('csvData')
        .isArray({ min: 1 })
        .withMessage('Los datos CSV deben ser un array con al menos un elemento'),

    body('csvData.*.nombre')
        .notEmpty()
        .withMessage('El nombre es requerido en cada fila'),

    body('csvData.*.email')
        .isEmail()
        .withMessage('El email debe ser válido en cada fila'),

    body('csvData.*.rol')
        .notEmpty()
        .withMessage('El rol es requerido en cada fila')
];

// RUTAS PÚBLICAS (sin autenticación para desarrollo)

// GET /api/users - Obtener lista de usuarios con filtros
router.get('/',
    [
        query('page').optional().isInt({ min: 1 }).withMessage('La página debe ser un entero positivo'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('El límite debe estar entre 1 y 100'),
        query('role').optional().isString(),
        query('status').optional().isIn(['active', 'inactive', '']),
        query('search').optional().isString(),
        query('sortBy').optional().isIn(['name', 'email', 'role', 'status', 'created_at', 'last_login']),
        query('sortOrder').optional().isIn(['ASC', 'DESC'])
    ],
    handleValidationErrors,
    usersController.getUsers
);

// GET /api/users/estadisticas - Obtener estadísticas de usuarios
router.get('/estadisticas',
    usersController.getEstadisticas
);

// GET /api/users/export - Exportar usuarios a CSV
router.get('/export',
    usersController.exportarCSV
);

// GET /api/users/audit-logs - Obtener logs de auditoría
router.get('/audit-logs',
    [
        query('page').optional().isInt({ min: 1 }).withMessage('La página debe ser un entero positivo'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('El límite debe estar entre 1 y 100'),
        query('userId').optional().isInt({ min: 1 }).withMessage('ID de usuario inválido'),
        query('action').optional().isIn(['login', 'logout', 'created', 'updated', 'deleted', 'activated', 'deactivated', 'role_changed']),
        query('dateFrom').optional().isISO8601().withMessage('Fecha desde debe ser válida (YYYY-MM-DD)'),
        query('dateTo').optional().isISO8601().withMessage('Fecha hasta debe ser válida (YYYY-MM-DD)')
    ],
    handleValidationErrors,
    usersController.getAuditLogs
);

// GET /api/users/:id - Obtener usuario específico
router.get('/:id',
    [
        param('id').isInt({ min: 1 }).withMessage('ID de usuario inválido')
    ],
    handleValidationErrors,
    usersController.getUserById
);

// POST /api/users - Crear nuevo usuario
router.post('/',
    validateCreateUser,
    handleValidationErrors,
    usersController.createUser
);

// PUT /api/users/:id - Actualizar usuario completo
router.put('/:id',
    validateUpdateUser,
    handleValidationErrors,
    usersController.updateUser
);

// PATCH /api/users/:id/status - Cambiar estado del usuario
router.patch('/:id/status',
    validateChangeStatus,
    handleValidationErrors,
    usersController.cambiarEstado
);

// DELETE /api/users/:id - Eliminar usuario
router.delete('/:id',
    [
        param('id').isInt({ min: 1 }).withMessage('ID de usuario inválido')
    ],
    handleValidationErrors,
    usersController.deleteUser
);

// POST /api/users/import - Importar usuarios desde CSV
router.post('/import',
    validateImportCSV,
    handleValidationErrors,
    usersController.importarCSV
);

// RUTAS PROTEGIDAS (descomenta para usar autenticación)
/*
// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Rutas que requieren permisos de sistema
router.get('/', authorizeRole(['system.users']), [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('role').optional().isString(),
    query('status').optional().isIn(['active', 'inactive', '']),
    query('search').optional().isString(),
    query('sortBy').optional().isIn(['name', 'email', 'role', 'status', 'created_at', 'last_login']),
    query('sortOrder').optional().isIn(['ASC', 'DESC'])
], handleValidationErrors, usersController.getUsers);

router.get('/estadisticas', authorizeRole(['system.users']), usersController.getEstadisticas);

router.get('/export', authorizeRole(['system.users', 'reports.export']), usersController.exportarCSV);

router.get('/audit-logs', authorizeRole(['system.logs']), [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('userId').optional().isInt({ min: 1 }),
    query('action').optional().isIn(['login', 'logout', 'created', 'updated', 'deleted', 'activated', 'deactivated', 'role_changed']),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601()
], handleValidationErrors, usersController.getAuditLogs);

router.get('/:id', authorizeRole(['system.users']), [
    param('id').isInt({ min: 1 })
], handleValidationErrors, usersController.getUserById);

router.post('/', authorizeRole(['system.users']), validateCreateUser, handleValidationErrors, usersController.createUser);

router.put('/:id', authorizeRole(['system.users']), validateUpdateUser, handleValidationErrors, usersController.updateUser);

router.patch('/:id/status', authorizeRole(['system.users']), validateChangeStatus, handleValidationErrors, usersController.cambiarEstado);

router.delete('/:id', authorizeRole(['system.users']), [
    param('id').isInt({ min: 1 })
], handleValidationErrors, usersController.deleteUser);

router.post('/import', authorizeRole(['system.users']), validateImportCSV, handleValidationErrors, usersController.importarCSV);
*/

module.exports = router;