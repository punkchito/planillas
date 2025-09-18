// routes/indicadores.js
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const indicadoresController = require('../controllers/indicadoresController');

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

// =============================
// VALIDACIONES
// =============================

// Validaciones para crear variable
const validateCreateVariable = [
    body('id')
        .isLength({ min: 3, max: 50 })
        .withMessage('El ID debe tener entre 3 y 50 caracteres')
        .matches(/^[a-z0-9\-]+$/)
        .withMessage('El ID solo puede contener letras minúsculas, números y guiones'),

    body('name')
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('El nombre debe tener entre 3 y 200 caracteres'),

    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('La descripción no puede exceder 1000 caracteres'),

    body('status')
        .optional()
        .isIn(['active', 'inactive'])
        .withMessage('El estado debe ser active o inactive')
];

// Validaciones para crear dimensión
const validateCreateDimension = [
    body('id')
        .isLength({ min: 3, max: 50 })
        .withMessage('El ID debe tener entre 3 y 50 caracteres')
        .matches(/^[a-z0-9\-]+$/)
        .withMessage('El ID solo puede contener letras minúsculas, números y guiones'),

    body('name')
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('El nombre debe tener entre 3 y 200 caracteres'),

    body('variableId')
        .notEmpty()
        .withMessage('El ID de la variable es requerido'),

    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('La descripción no puede exceder 1000 caracteres'),

    body('status')
        .optional()
        .isIn(['active', 'inactive'])
        .withMessage('El estado debe ser active o inactive')
];

// Validaciones para crear indicador
const validateCreateIndicator = [
    body('id')
        .isLength({ min: 3, max: 50 })
        .withMessage('El ID debe tener entre 3 y 50 caracteres')
        .matches(/^[a-z0-9\-]+$/)
        .withMessage('El ID solo puede contener letras minúsculas, números y guiones'),

    body('name')
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('El nombre debe tener entre 3 y 200 caracteres'),

    body('dimensionId')
        .notEmpty()
        .withMessage('El ID de la dimensión es requerido'),

    body('type')
        .isIn(['porcentaje', 'cantidad', 'tiempo', 'costo', 'ratio'])
        .withMessage('El tipo debe ser: porcentaje, cantidad, tiempo, costo o ratio'),

    body('currentValue')
        .isFloat({ min: 0 })
        .withMessage('El valor actual debe ser un número positivo'),

    body('targetValue')
        .isFloat({ min: 0 })
        .withMessage('El valor objetivo debe ser un número positivo'),

    body('unit')
        .notEmpty()
        .isLength({ min: 1, max: 20 })
        .withMessage('La unidad es requerida y no puede exceder 20 caracteres'),

    body('formula')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('La fórmula no puede exceder 1000 caracteres'),

    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('La descripción no puede exceder 1000 caracteres'),

    body('status')
        .optional()
        .isIn(['active', 'inactive'])
        .withMessage('El estado debe ser active o inactive')
];

// =============================
// RUTAS DE VARIABLES
// =============================

// GET /api/indicadores/variables - Obtener todas las variables
router.get('/variables',
    //authenticateToken,
    [
        query('includeStats').optional().isIn(['true', 'false'])
    ],
    handleValidationErrors,
    indicadoresController.getVariables
);

// POST /api/indicadores/variables - Crear nueva variable
router.post('/variables',
    //authenticateToken,
    //authorizeRole(['admin']),
    validateCreateVariable,
    handleValidationErrors,
    indicadoresController.createVariable
);

// PUT /api/indicadores/variables/:id - Actualizar variable
router.put('/variables/:id',
    //authenticateToken,
    //authorizeRole(['admin']),
    [
        param('id').notEmpty().withMessage('ID de variable requerido'),
        body('name').optional().trim().isLength({ min: 3, max: 200 }),
        body('description').optional().isLength({ max: 1000 }),
        body('status').optional().isIn(['active', 'inactive'])
    ],
    handleValidationErrors,
    indicadoresController.updateVariable
);

// DELETE /api/indicadores/variables/:id - Eliminar variable
router.delete('/variables/:id',
    //authenticateToken,
    //authorizeRole(['admin']),
    [
        param('id').notEmpty().withMessage('ID de variable requerido')
    ],
    handleValidationErrors,
    indicadoresController.deleteVariable
);

// =============================
// RUTAS DE DIMENSIONES
// =============================

// GET /api/indicadores/dimensions - Obtener todas las dimensiones
router.get('/dimensions',
    //authenticateToken,
    [
        query('variableId').optional().notEmpty(),
        query('includeIndicators').optional().isIn(['true', 'false'])
    ],
    handleValidationErrors,
    indicadoresController.getDimensions
);

// POST /api/indicadores/dimensions - Crear nueva dimensión
router.post('/dimensions',
    //authenticateToken,
    //authorizeRole(['admin']),
    validateCreateDimension,
    handleValidationErrors,
    indicadoresController.createDimension
);

// PUT /api/indicadores/dimensions/:id - Actualizar dimensión
router.put('/dimensions/:id',
    //authenticateToken,
    //authorizeRole(['admin']),
    [
        param('id').notEmpty().withMessage('ID de dimensión requerido'),
        body('name').optional().trim().isLength({ min: 3, max: 200 }),
        body('description').optional().isLength({ max: 1000 }),
        body('variable_id').optional().notEmpty(),
        body('status').optional().isIn(['active', 'inactive'])
    ],
    handleValidationErrors,
    indicadoresController.updateDimension
);

// DELETE /api/indicadores/dimensions/:id - Eliminar dimensión
router.delete('/dimensions/:id',
    //authenticateToken,
    //authorizeRole(['admin']),
    [
        param('id').notEmpty().withMessage('ID de dimensión requerido')
    ],
    handleValidationErrors,
    indicadoresController.deleteDimension
);

// =============================
// RUTAS DE INDICADORES
// =============================

// GET /api/indicadores - Obtener todos los indicadores con filtros
router.get('/',
    //authenticateToken,
    [
        query('dimensionId').optional().notEmpty(),
        query('variableId').optional().notEmpty(),
        query('type').optional().isIn(['porcentaje', 'cantidad', 'tiempo', 'costo', 'ratio']),
        query('status').optional().isIn(['active', 'inactive']),
        query('includeHistorical').optional().isIn(['true', 'false']),
        query('search').optional().isString(),
        query('sortBy').optional().isIn(['name', 'type', 'current_value', 'target_value', 'created_at']),
        query('sortOrder').optional().isIn(['ASC', 'DESC'])
    ],
    handleValidationErrors,
    indicadoresController.getIndicators
);

// GET /api/indicadores/dashboard - Obtener estadísticas del dashboard
router.get('/dashboard',
    //authenticateToken,
    indicadoresController.getDashboardStats
);

// GET /api/indicadores/tree - Obtener estructura completa del árbol
router.get('/tree',
    //authenticateToken,
    indicadoresController.getTreeStructure
);

// GET /api/indicadores/export - Exportar datos a CSV
router.get('/export',
    //authenticateToken,
    //authorizeRole(['admin']),
    [
        query('type').optional().isIn(['indicators', 'dimensions', 'variables'])
    ],
    handleValidationErrors,
    indicadoresController.exportData
);

// GET /api/indicadores/trends - Obtener reporte de tendencias
router.get('/trends',
    //authenticateToken,
    [
        query('months').optional().isInt({ min: 1, max: 24 })
    ],
    handleValidationErrors,
    indicadoresController.getTrendsReport
);

// POST /api/indicadores/validate-formula - Validar fórmula
router.post('/validate-formula',
    //authenticateToken,
    [
        body('formula').notEmpty().withMessage('Fórmula requerida')
    ],
    handleValidationErrors,
    indicadoresController.validateFormula
);

// GET /api/indicadores/:id - Obtener indicador específico
router.get('/:id',
    //authenticateToken,
    [
        param('id').notEmpty().withMessage('ID de indicador requerido')
    ],
    handleValidationErrors,
    indicadoresController.getIndicatorById
);

// POST /api/indicadores - Crear nuevo indicador
router.post('/',
    //authenticateToken,
    //authorizeRole(['admin']),
    validateCreateIndicator,
    handleValidationErrors,
    indicadoresController.createIndicator
);

// PUT /api/indicadores/:id - Actualizar indicador
router.put('/:id',
    //authenticateToken,
    //authorizeRole(['admin']),
    [
        param('id').notEmpty().withMessage('ID de indicador requerido'),
        body('name').optional().trim().isLength({ min: 3, max: 200 }),
        body('description').optional().isLength({ max: 1000 }),
        body('dimension_id').optional().notEmpty(),
        body('type').optional().isIn(['porcentaje', 'cantidad', 'tiempo', 'costo', 'ratio']),
        body('current_value').optional().isFloat({ min: 0 }),
        body('target_value').optional().isFloat({ min: 0 }),
        body('unit').optional().isLength({ min: 1, max: 20 }),
        body('formula').optional().isLength({ max: 1000 }),
        body('status').optional().isIn(['active', 'inactive'])
    ],
    handleValidationErrors,
    indicadoresController.updateIndicator
);

// DELETE /api/indicadores/:id - Eliminar indicador
router.delete('/:id',
    //authenticateToken,
    //authorizeRole(['admin']),
    [
        param('id').notEmpty().withMessage('ID de indicador requerido')
    ],
    handleValidationErrors,
    indicadoresController.deleteIndicator
);

module.exports = router;