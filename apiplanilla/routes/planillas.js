// routes/planillas.js
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const planillasController = require('../controllers/planillasController');

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

// Validaciones para calcular planilla
const validateCalcularPlanilla = [
    body('periodo')
        .matches(/^\d{4}-\d{2}$/)
        .withMessage('El período debe tener formato YYYY-MM'),

    body('tipo_planilla')
        .optional()
        .isIn(['regular', 'aguinaldo', 'gratificacion', 'cts'])
        .withMessage('Tipo de planilla inválido'),

    body('tipo_personal')
        .optional()
        .isIn(['todos', 'docente', 'administrativo', 'servicio'])
        .withMessage('Tipo de personal inválido')
];

// Validaciones para procesar planilla
const validateProcesarPlanilla = [
    body('periodo')
        .matches(/^\d{4}-\d{2}$/)
        .withMessage('El período debe tener formato YYYY-MM'),

    body('tipo_planilla')
        .optional()
        .isIn(['regular', 'aguinaldo', 'gratificacion', 'cts'])
        .withMessage('Tipo de planilla inválido'),

    body('tipo_personal')
        .optional()
        .isIn(['todos', 'docente', 'administrativo', 'servicio'])
        .withMessage('Tipo de personal inválido'),

    body('detalle')
        .isArray({ min: 1 })
        .withMessage('El detalle debe ser un array con al menos un elemento'),

    body('detalle.*.trabajador_id')
        .isInt({ min: 1 })
        .withMessage('ID de trabajador inválido'),

    body('detalle.*.sueldo_basico')
        .isNumeric()
        .withMessage('Sueldo básico debe ser numérico')
        .custom((value) => {
            if (parseFloat(value) < 0) {
                throw new Error('Sueldo básico debe ser positivo');
            }
            return true;
        }),

    body('detalle.*.total_ingresos')
        .isNumeric()
        .withMessage('Total ingresos debe ser numérico')
        .custom((value) => {
            if (parseFloat(value) < 0) {
                throw new Error('Total ingresos debe ser positivo');
            }
            return true;
        }),

    body('detalle.*.total_descuentos')
        .isNumeric()
        .withMessage('Total descuentos debe ser numérico')
        .custom((value) => {
            if (parseFloat(value) < 0) {
                throw new Error('Total descuentos debe ser positivo');
            }
            return true;
        }),

    body('detalle.*.neto_pagar')
        .isNumeric()
        .withMessage('Neto a pagar debe ser numérico')
        .custom((value) => {
            if (parseFloat(value) < 0) {
                throw new Error('Neto a pagar debe ser positivo');
            }
            return true;
        })
];

// RUTAS SIN AUTENTICACIÓN (para desarrollo y testing)

// POST /api/planillas/calcular - Calcular planilla (vista previa)
router.post('/calcular',
    validateCalcularPlanilla,
    handleValidationErrors,
    planillasController.calcularPlanilla
);

// POST /api/planillas/procesar - Procesar planilla definitivamente
router.post('/procesar',
    validateProcesarPlanilla,
    handleValidationErrors,
    planillasController.procesarPlanilla
);

// GET /api/planillas/historial - Obtener historial de planillas
router.get('/historial',
    [
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Página debe ser un entero positivo'),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Límite debe estar entre 1 y 100'),
        query('tipo_planilla')
            .optional()
            .isIn(['regular', 'aguinaldo', 'gratificacion', 'cts', 'todos'])
            .withMessage('Tipo de planilla inválido'),
        query('estado')
            .optional()
            .isIn(['borrador', 'calculada', 'procesada', 'anulada', 'todos'])
            .withMessage('Estado inválido'),
        query('desde_periodo')
            .optional()
            .matches(/^\d{4}-\d{2}$/)
            .withMessage('Período desde debe tener formato YYYY-MM'),
        query('hasta_periodo')
            .optional()
            .matches(/^\d{4}-\d{2}$/)
            .withMessage('Período hasta debe tener formato YYYY-MM')
    ],
    handleValidationErrors,
    planillasController.getHistorial
);

router.get('/estadisticas', (req, res) => {
    // Si tienes un método para estadísticas en el controller
    if (planillasController.getEstadisticas) {
        planillasController.getEstadisticas(req, res);
    } else {
        // Estadísticas básicas temporales
        res.json({
            success: true,
            data: {
                total_planillas: 0,
                planillas_procesadas: 0,
                total_trabajadores: 0,
                total_pagado: 0
            }
        });
    }
});

// GET /api/planillas/:id/detalle - Obtener detalle de planilla específica
router.get('/:id/detalle',
    [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de planilla inválido')
    ],
    handleValidationErrors,
    planillasController.getDetallePlanilla
);

// GET /api/planillas/:id/export - Exportar planilla específica a CSV
router.get('/:id/export',
    [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de planilla inválido')
    ],
    handleValidationErrors,
    planillasController.exportarPlanillaCSV
);

// GET /api/planillas/:id - Obtener planilla específica (alias para detalle)
router.get('/:id',
    [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de planilla inválido')
    ],
    handleValidationErrors,
    planillasController.getDetallePlanilla
);

// Ruta adicional para estadísticas (opcional)


module.exports = router;