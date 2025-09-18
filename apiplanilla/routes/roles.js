// routes/roles.js
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const rolesController = require('../controllers/rolesController');

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

// Validaciones para crear rol
const validateCreateRole = [
    body('name')
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage('El nombre del rol debe tener entre 3 y 100 caracteres')
        .matches(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/)
        .withMessage('El nombre solo puede contener letras y espacios'),

    body('type')
        .isIn(['admin', 'user', 'viewer'])
        .withMessage('El tipo debe ser: admin, user o viewer'),

    body('description')
        .optional()
        .isLength({ max: 500 })
        .withMessage('La descripción no puede exceder 500 caracteres'),

    body('permissions')
        .optional()
        .isArray()
        .withMessage('Los permisos deben ser un array'),

    body('permissions.*')
        .if(body('permissions').exists())
        .isLength({ min: 1, max: 100 })
        .withMessage('Cada permiso debe ser un ID válido')
];

// Validaciones para actualizar rol
const validateUpdateRole = [
    param('id')
        .isLength({ min: 1, max: 50 })
        .withMessage('ID de rol inválido'),

    body('name')
        .optional()
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage('El nombre del rol debe tener entre 3 y 100 caracteres')
        .matches(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/)
        .withMessage('El nombre solo puede contener letras y espacios'),

    body('type')
        .optional()
        .isIn(['admin', 'user', 'viewer'])
        .withMessage('El tipo debe ser: admin, user o viewer'),

    body('description')
        .optional()
        .isLength({ max: 500 })
        .withMessage('La descripción no puede exceder 500 caracteres')
];

// Validaciones para actualizar permisos
const validateUpdatePermissions = [
    param('id')
        .isLength({ min: 1, max: 50 })
        .withMessage('ID de rol inválido'),

    body('permissions')
        .isArray()
        .withMessage('Los permisos deben ser un array'),

    body('permissions.*')
        .isLength({ min: 1, max: 100 })
        .withMessage('Cada permiso debe ser un ID válido')
];

// Validaciones para clonar rol
const validateCloneRole = [
    param('id')
        .isLength({ min: 1, max: 50 })
        .withMessage('ID de rol inválido'),

    body('newName')
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage('El nuevo nombre debe tener entre 3 y 100 caracteres')
        .matches(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/)
        .withMessage('El nuevo nombre solo puede contener letras y espacios'),

    body('newDescription')
        .optional()
        .isLength({ max: 500 })
        .withMessage('La nueva descripción no puede exceder 500 caracteres')
];

// RUTAS PÚBLICAS (sin autenticación para desarrollo)

// GET /api/roles - Obtener lista de roles
router.get('/',
    rolesController.getRoles
);

// GET /api/roles/estadisticas - Obtener estadísticas de roles
router.get('/estadisticas',
    rolesController.getEstadisticas
);

// GET /api/roles/permissions - Obtener todos los permisos disponibles
router.get('/permissions',
    rolesController.getPermissions
);

// GET /api/roles/:id - Obtener rol específico
router.get('/:id',
    [
        param('id').isLength({ min: 1, max: 50 }).withMessage('ID de rol inválido')
    ],
    handleValidationErrors,
    rolesController.getRoleById
);

// GET /api/roles/:id/permissions - Obtener permisos de un rol específico
router.get('/:id/permissions',
    [
        param('id').isLength({ min: 1, max: 50 }).withMessage('ID de rol inválido')
    ],
    handleValidationErrors,
    rolesController.getRolePermissions
);

// POST /api/roles - Crear nuevo rol
router.post('/',
    validateCreateRole,
    handleValidationErrors,
    rolesController.createRole
);

// PUT /api/roles/:id - Actualizar rol completo
router.put('/:id',
    validateUpdateRole,
    handleValidationErrors,
    rolesController.updateRole
);

// PUT /api/roles/:id/permissions - Actualizar permisos del rol
router.put('/:id/permissions',
    validateUpdatePermissions,
    handleValidationErrors,
    rolesController.updateRolePermissions
);

// POST /api/roles/:id/clone - Clonar rol existente
router.post('/:id/clone',
    validateCloneRole,
    handleValidationErrors,
    rolesController.cloneRole
);

// DELETE /api/roles/:id - Eliminar rol
router.delete('/:id',
    [
        param('id').isLength({ min: 1, max: 50 }).withMessage('ID de rol inválido')
    ],
    handleValidationErrors,
    rolesController.deleteRole
);

// RUTAS PROTEGIDAS (descomenta para usar autenticación)
/*
// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Rutas que requieren permisos de sistema
router.get('/', authorizeRole(['system.roles']), rolesController.getRoles);

router.get('/estadisticas', authorizeRole(['system.roles']), rolesController.getEstadisticas);

router.get('/permissions', authorizeRole(['system.roles']), rolesController.getPermissions);

router.get('/:id', authorizeRole(['system.roles']), [
    param('id').isLength({ min: 1, max: 50 })
], handleValidationErrors, rolesController.getRoleById);

router.get('/:id/permissions', authorizeRole(['system.roles']), [
    param('id').isLength({ min: 1, max: 50 })
], handleValidationErrors, rolesController.getRolePermissions);

router.post('/', authorizeRole(['system.roles']), validateCreateRole, handleValidationErrors, rolesController.createRole);

router.put('/:id', authorizeRole(['system.roles']), validateUpdateRole, handleValidationErrors, rolesController.updateRole);

router.put('/:id/permissions', authorizeRole(['system.roles']), validateUpdatePermissions, handleValidationErrors, rolesController.updateRolePermissions);

router.post('/:id/clone', authorizeRole(['system.roles']), validateCloneRole, handleValidationErrors, rolesController.cloneRole);

router.delete('/:id', authorizeRole(['system.roles']), [
    param('id').isLength({ min: 1, max: 50 })
], handleValidationErrors, rolesController.deleteRole);
*/

module.exports = router;