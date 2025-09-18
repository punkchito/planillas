// routes/conceptos.js
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const conceptosController = require('../controllers/conceptosController');

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

// Validaciones para crear concepto
const validateCreateConcepto = [
    body('codigo')
        .isLength({ min: 3, max: 10 })
        .withMessage('El código debe tener entre 3 y 10 caracteres')
        .matches(/^[A-Z0-9]+$/)
        .withMessage('El código solo puede contener letras mayúsculas y números'),

    body('nombre')
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage('El nombre debe tener entre 3 y 100 caracteres'),

    body('tipo_concepto')
        .isIn(['ingreso', 'descuento', 'aporte'])
        .withMessage('El tipo de concepto debe ser: ingreso, descuento o aporte'),

    body('tipo_calculo')
        .isIn(['fijo', 'porcentual', 'calculado', 'variable'])
        .withMessage('El tipo de cálculo debe ser: fijo, porcentual, calculado o variable'),

    body('valor_fijo')
        .if(body('tipo_calculo').equals('fijo'))
        .isFloat({ min: 0 })
        .withMessage('El valor fijo debe ser un número positivo'),

    body('porcentaje')
        .if(body('tipo_calculo').equals('porcentual'))
        .isFloat({ min: 0, max: 100 })
        .withMessage('El porcentaje debe estar entre 0 y 100'),

    body('orden')
        .optional()
        .isInt({ min: 1, max: 999 })
        .withMessage('El orden debe ser un número entre 1 y 999'),

    body('estado')
        .optional()
        .isIn(['activo', 'inactivo'])
        .withMessage('El estado debe ser activo o inactivo'),

   body('formula')
    .if(body('tipo_calculo').equals('calculado'))
    .notEmpty()
    .withMessage('La fórmula es requerida para cálculos calculados')
];

// Validaciones para actualizar concepto
const validateUpdateConcepto = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('ID de concepto inválido'),

    body('codigo')
        .optional()
        .isLength({ min: 3, max: 10 })
        .withMessage('El código debe tener entre 3 y 10 caracteres')
        .matches(/^[A-Z0-9]+$/)
        .withMessage('El código solo puede contener letras mayúsculas y números'),

    body('nombre')
        .optional()
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage('El nombre debe tener entre 3 y 100 caracteres'),

    body('tipo_concepto')
        .optional()
        .isIn(['ingreso', 'descuento', 'aporte'])
        .withMessage('El tipo de concepto debe ser: ingreso, descuento o aporte'),

    body('tipo_calculo')
        .optional()
        .isIn(['fijo', 'porcentual', 'calculado', 'variable'])
        .withMessage('El tipo de cálculo debe ser: fijo, porcentual, calculado o variable'),

    body('valor_fijo')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('El valor fijo debe ser un número positivo'),

    body('porcentaje')
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage('El porcentaje debe estar entre 0 y 100')
];

// RUTAS PÚBLICAS (sin autenticación para desarrollo)

// GET /api/conceptos - Obtener lista de conceptos con filtros
router.get('/',
    [
        query('tipo').optional().isIn(['ingreso', 'descuento', 'aporte', 'todos']),
        query('estado').optional().isIn(['activo', 'inactivo', 'todos']),
        query('search').optional().isString(),
        query('sortBy').optional().isIn(['codigo', 'nombre', 'tipo_concepto', 'orden', 'estado']),
        query('sortOrder').optional().isIn(['ASC', 'DESC'])
    ],
    handleValidationErrors,
    conceptosController.getConceptos
);

// GET /api/conceptos/estadisticas - Obtener estadísticas
router.get('/estadisticas',
    conceptosController.getEstadisticas
);

// GET /api/conceptos/variables - Obtener variables disponibles para fórmulas
router.get('/variables',
    conceptosController.getVariablesFormula
);

// GET /api/conceptos/export - Exportar conceptos a CSV
router.get('/export',
    conceptosController.exportarCSV
);

// GET /api/conceptos/tipo/:tipo - Obtener conceptos por tipo específico
router.get('/tipo/:tipo',
    [
        param('tipo').isIn(['ingreso', 'descuento', 'aporte']).withMessage('Tipo inválido')
    ],
    handleValidationErrors,
    conceptosController.getConceptosPorTipo
);

// POST /api/conceptos/validar-formula - Validar una fórmula
router.post('/validar-formula',
    [
        body('formula').notEmpty().withMessage('Fórmula requerida')
    ],
    handleValidationErrors,
    conceptosController.validarFormula
);

// GET /api/conceptos/codigo/:codigo - Obtener concepto por código
router.get('/codigo/:codigo',
    [
        param('codigo').isLength({ min: 3, max: 10 }).withMessage('Código inválido')
    ],
    handleValidationErrors,
    conceptosController.getConceptoByCodigo
);

// GET /api/conceptos/:id - Obtener concepto específico
router.get('/:id',
    [
        param('id').isInt({ min: 1 }).withMessage('ID de concepto inválido')
    ],
    handleValidationErrors,
    conceptosController.getConceptoById
);

// POST /api/conceptos - Crear nuevo concepto
router.post('/',
    validateCreateConcepto,
    handleValidationErrors,
    conceptosController.createConcepto
);

// PUT /api/conceptos/:id - Actualizar concepto completo
router.put('/:id',
    validateUpdateConcepto,
    handleValidationErrors,
    conceptosController.updateConcepto
);

// PATCH /api/conceptos/:id/estado - Cambiar estado del concepto
router.patch('/:id/estado',
    [
        param('id').isInt({ min: 1 }).withMessage('ID de concepto inválido'),
        body('estado').isIn(['activo', 'inactivo']).withMessage('Estado debe ser activo o inactivo')
    ],
    handleValidationErrors,
    conceptosController.cambiarEstado
);

// POST /api/conceptos/:id/probar - Probar concepto con datos de muestra
router.post('/:id/probar',
    [
        param('id').isInt({ min: 1 }).withMessage('ID de concepto inválido'),
        body('datos_prueba').optional().isObject()
    ],
    handleValidationErrors,
    conceptosController.probarConcepto
);

// DELETE /api/conceptos/:id - Eliminar concepto
router.delete('/:id',
    [
        param('id').isInt({ min: 1 }).withMessage('ID de concepto inválido')
    ],
    handleValidationErrors,
    conceptosController.deleteConcepto
);

// RUTAS PROTEGIDAS (descomenta para usar autenticación)
/*
// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Rutas que requieren role admin
router.post('/', authorizeRole(['admin']), validateCreateConcepto, handleValidationErrors, conceptosController.createConcepto);
router.put('/:id', authorizeRole(['admin']), validateUpdateConcepto, handleValidationErrors, conceptosController.updateConcepto);
router.patch('/:id/estado', authorizeRole(['admin']), [
    param('id').isInt({ min: 1 }).withMessage('ID de concepto inválido'),
    body('estado').isIn(['activo', 'inactivo']).withMessage('Estado debe ser activo o inactivo')
], handleValidationErrors, conceptosController.cambiarEstado);
router.delete('/:id', authorizeRole(['admin']), [
    param('id').isInt({ min: 1 }).withMessage('ID de concepto inválido')
], handleValidationErrors, conceptosController.deleteConcepto);
*/

module.exports = router;