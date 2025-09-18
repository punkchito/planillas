// routes/departments.js - Gestión de departamentos para configuración del sistema
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, authorizePermission, auditLog } = require('../middleware/auth');
const departmentsController = require('../controllers/departmentsController');

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

// GET /api/departments - Obtener todos los departamentos/áreas
router.get('/',
    [
        //authorizePermission(['system.config', 'users.view']),
        query('status').optional().isIn(['all', 'active', 'inactive']).withMessage('Estado inválido')
    ],
    handleValidationErrors,
    departmentsController.getDepartments
);

// GET /api/departments/statistics - Estadísticas de departamentos
router.get('/statistics',
    //authorizePermission(['system.config', 'reports.dashboard']),
    departmentsController.getDepartmentStatistics
);

// GET /api/departments/:id - Obtener departamento por ID
router.get('/:id',
    [
        //authorizePermission(['system.config', 'users.view']),
        param('id').isInt({ min: 1 }).withMessage('ID inválido')
    ],
    handleValidationErrors,
    departmentsController.getDepartmentById
);

// GET /api/departments/:id/workers - Obtener trabajadores del departamento
router.get('/:id/workers',
    [
        //authorizePermission(['system.config', 'users.view']),
        param('id').isInt({ min: 1 }).withMessage('ID inválido'),
        query('status').optional().isIn(['all', 'active', 'inactive']).withMessage('Estado inválido')
    ],
    handleValidationErrors,
    departmentsController.getDepartmentWorkers
);

// GET /api/departments/:id/positions - Obtener cargos del departamento
router.get('/:id/positions',
    [
        //authorizePermission(['system.config', 'users.view']),
        param('id').isInt({ min: 1 }).withMessage('ID inválido'),
        query('status').optional().isIn(['all', 'active', 'inactive']).withMessage('Estado inválido')
    ],
    handleValidationErrors,
    departmentsController.getDepartmentPositions
);

// POST /api/departments - Crear nuevo departamento
router.post('/',
    [
        //authorizePermission(['system.config']),
        body('name').trim().isLength({ min: 3, max: 100 }).withMessage('Nombre debe tener entre 3 y 100 caracteres'),
        body('description').optional().isLength({ max: 500 }).withMessage('Descripción muy larga'),
        body('manager').optional().isString().withMessage('Manager debe ser texto'),
        body('active').optional().isBoolean().withMessage('Estado debe ser boolean')
    ],
    handleValidationErrors,
    auditLog('Creación de departamento'),
    departmentsController.createDepartment
);

// PUT /api/departments/:id - Actualizar departamento
router.put('/:id',
    [
        //authorizePermission(['system.config']),
        param('id').isInt({ min: 1 }).withMessage('ID inválido'),
        body('name').optional().trim().isLength({ min: 3, max: 100 }).withMessage('Nombre debe tener entre 3 y 100 caracteres'),
        body('description').optional().isLength({ max: 500 }).withMessage('Descripción muy larga'),
        body('manager').optional().isString().withMessage('Manager debe ser texto'),
        body('active').optional().isBoolean().withMessage('Estado debe ser boolean')
    ],
    handleValidationErrors,
    auditLog('Actualización de departamento'),
    departmentsController.updateDepartment
);

// PATCH /api/departments/:id/status - Cambiar estado del departamento
router.patch('/:id/status',
    [
        //authorizePermission(['system.config']),
        param('id').isInt({ min: 1 }).withMessage('ID inválido'),
        body('active').isBoolean().withMessage('Estado debe ser boolean')
    ],
    handleValidationErrors,
    auditLog('Cambio de estado de departamento'),
    departmentsController.toggleDepartmentStatus
);

// DELETE /api/departments/:id - Eliminar departamento
router.delete('/:id',
    [
        //authorizePermission(['system.config']),
        param('id').isInt({ min: 1 }).withMessage('ID inválido')
    ],
    handleValidationErrors,
    auditLog('Eliminación de departamento'),
    departmentsController.deleteDepartment
);

module.exports = router;