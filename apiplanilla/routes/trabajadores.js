// routes/trabajadores.js
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const trabajadoresController = require('../controllers/trabajadoresController');

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

// Validaciones para crear trabajador
const validateCreateTrabajador = [
    body('dni')
        .isLength({ min: 8, max: 12 })
        .withMessage('El DNI debe tener entre 8 y 12 caracteres')
        .isNumeric()
        .withMessage('El DNI debe contener solo números'),

    body('nombres')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Los nombres deben tener entre 2 y 100 caracteres'),

    body('apellido_paterno')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('El apellido paterno debe tener entre 2 y 100 caracteres'),

    body('apellido_materno')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('El apellido materno debe tener entre 2 y 100 caracteres'),

    body('fecha_nacimiento')
        .isISO8601()
        .withMessage('Fecha de nacimiento debe ser válida (YYYY-MM-DD)')
        .custom((value) => {
            const birthDate = new Date(value);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            if (age < 18 || age > 65) {
                throw new Error('La edad debe estar entre 18 y 65 años');
            }
            return true;
        }),

    body('genero')
        .isIn(['masculino', 'femenino', 'otro'])
        .withMessage('El género debe ser: masculino, femenino u otro'),

    body('fecha_ingreso')
        .isISO8601()
        .withMessage('Fecha de ingreso debe ser válida (YYYY-MM-DD)'),

    body('cargo_id')
        .isInt({ min: 1 })
        .withMessage('El cargo debe ser un ID válido'),

    body('area_id')
        .isInt({ min: 1 })
        .withMessage('El área debe ser un ID válido'),

    body('sueldo_basico')
        .isFloat({ min: 0 })
        .withMessage('El sueldo básico debe ser un valor positivo'),

    body('tipo_jornada')
        .optional()
        .isIn(['tiempo_completo', 'medio_tiempo', 'por_horas'])
        .withMessage('Tipo de jornada inválido'),

    body('estado_civil')
        .optional()
        .isIn(['soltero', 'casado', 'divorciado', 'viudo', 'conviviente'])
        .withMessage('Estado civil inválido'),

    body('correo_electronico')
        .optional()
        .isEmail()
        .withMessage('Debe ser un email válido'),

    body('correo_personal')
        .optional()
        .isEmail()
        .withMessage('Debe ser un email válido'),

    body('telefono_principal')
        .optional()
        .isMobilePhone('es-PE')
        .withMessage('Debe ser un número de teléfono válido'),

    body('supervisor_directo_id')
        .optional()
        .isInt({ min: 0 })
        .withMessage('El supervisor debe ser un ID válido'),

    body('tipo_contrato')
        .optional()
        .isIn(['indefinido', 'plazo_fijo', 'temporal', 'practicas'])
        .withMessage('Tipo de contrato debe ser: indefinido, plazo_fijo, temporal o practicas'),

    body('fecha_fin')
        .optional()
        .isISO8601()
        .withMessage('Fecha fin debe ser válida (YYYY-MM-DD)')
        .custom((value, { req }) => {
            // Validar que fecha_fin sea requerida para contratos de plazo fijo y temporal
            if ((req.body.tipo_contrato === 'plazo_fijo' || req.body.tipo_contrato === 'temporal') && !value) {
                throw new Error('Fecha fin es requerida para contratos de plazo fijo y temporales');
            }
            // Validar que fecha_fin sea posterior a fecha_ingreso
            if (value && req.body.fecha_ingreso && new Date(value) <= new Date(req.body.fecha_ingreso)) {
                throw new Error('Fecha fin debe ser posterior a la fecha de ingreso');
            }
            return true;
        }),


];

// Validaciones para actualizar trabajador
const validateUpdateTrabajador = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('ID de trabajador inválido'),

    body('dni')
        .optional()
        .isLength({ min: 8, max: 12 })
        .withMessage('El DNI debe tener entre 8 y 12 caracteres')
        .isNumeric()
        .withMessage('El DNI debe contener solo números'),

    body('nombres')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Los nombres deben tener entre 2 y 100 caracteres'),

    body('sueldo_basico')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('El sueldo básico debe ser un valor positivo'),

    body('correo_electronico')
        .optional()
        .isEmail()
        .withMessage('Debe ser un email válido'),

    body('telefono_principal')
        .optional()
        .isMobilePhone('es-PE')
        .withMessage('Debe ser un número de teléfono válido')
];

// Rutas protegidas - requieren autenticación

// GET /api/trabajadores - Obtener lista de trabajadores con filtros
router.get('/',
    //authenticateToken,
    [
        query('page').optional().isInt({ min: 1 }).withMessage('Página debe ser un entero positivo'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite debe estar entre 1 y 100'),
        query('cargo').optional().isString(),
        query('estado').optional().isIn(['activo', 'inactivo', 'todos']),
        query('area').optional().isString(),
        query('search').optional().isString(),
        query('sortBy').optional().isIn(['nombres', 'apellido_paterno', 'fecha_ingreso', 'sueldo_basico']),
        query('sortOrder').optional().isIn(['ASC', 'DESC'])
    ],
    handleValidationErrors,
    trabajadoresController.getTrabajadores
);

// GET /api/trabajadores/estadisticas - Obtener estadísticas
router.get('/estadisticas',
    //authenticateToken,
    trabajadoresController.getEstadisticas
);

// GET /api/trabajadores/export - Exportar trabajadores a CSV
router.get('/export',
    //authenticateToken,
    //authorizeRole(['admin']),
    trabajadoresController.exportarCSV
);

// GET /api/trabajadores/:id - Obtener trabajador específico
router.get('/:id',
    //authenticateToken,
    [
        param('id').isInt({ min: 1 }).withMessage('ID de trabajador inválido')
    ],
    handleValidationErrors,
    trabajadoresController.getTrabajadorById
);

// POST /api/trabajadores - Crear nuevo trabajador
router.post('/',
    //authenticateToken,
    //authorizeRole(['admin']),
    validateCreateTrabajador,
    handleValidationErrors,
    trabajadoresController.createTrabajador
);

// PUT /api/trabajadores/:id - Actualizar trabajador completo
router.put('/:id',
    //authenticateToken,
    //authorizeRole(['admin']),
    validateUpdateTrabajador,
    handleValidationErrors,
    trabajadoresController.updateTrabajador
);

// PATCH /api/trabajadores/:id/estado - Cambiar estado del trabajador
router.patch('/:id/estado',
    //authenticateToken,
    //authorizeRole(['admin']),
    [
        param('id').isInt({ min: 1 }).withMessage('ID de trabajador inválido'),
        body('estado').isIn(['activo', 'inactivo']).withMessage('Estado debe ser activo o inactivo')
    ],
    handleValidationErrors,
    trabajadoresController.cambiarEstado
);

// DELETE /api/trabajadores/:id - Eliminar trabajador
router.delete('/:id',
    //authenticateToken,
    //authorizeRole(['admin']),
    [
        param('id').isInt({ min: 1 }).withMessage('ID de trabajador inválido')
    ],
    handleValidationErrors,
    trabajadoresController.deleteTrabajador
);

module.exports = router;