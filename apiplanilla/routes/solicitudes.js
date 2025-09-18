// routes/solicitudes.js - VALIDACIONES CORREGIDAS

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const solicitudesController = require('../controllers/solicitudesController');

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

// VALIDACIONES BÁSICAS COMUNES
const basicValidations = [
    body('tipo_solicitud')
        .isIn(['vacaciones', 'permiso', 'licencia', 'adelanto', 'certificado', 'otros'])
        .withMessage('Tipo de solicitud inválido'),

    body('trabajador_id')
        .isInt({ min: 1 })
        .withMessage('ID de trabajador debe ser un entero positivo'),

    body('motivo')
        .trim()
        .isLength({ min: 10, max: 1000 })
        .withMessage('El motivo debe tener entre 10 y 1000 caracteres'),

    body('urgencia')
        .optional()
        .isIn(['normal', 'alta', 'urgente'])
        .withMessage('Urgencia debe ser: normal, alta o urgente')
];

// MIDDLEWARE PERSONALIZADO PARA VALIDACIONES POR TIPO
const validateByType = (req, res, next) => {
    const { tipo_solicitud } = req.body;
    const errors = [];

    console.log('Validando tipo:', tipo_solicitud);
    console.log('Datos recibidos:', req.body);

    switch (tipo_solicitud) {
        case 'permiso':
            // Solo validar fecha_inicio y horario (opcional)
            if (!req.body.fecha_inicio) {
                errors.push({
                    type: 'field',
                    msg: 'Fecha de inicio es requerida para permisos',
                    path: 'fecha_inicio',
                    location: 'body'
                });
            } else if (!/^\d{4}-\d{2}-\d{2}$/.test(req.body.fecha_inicio)) {
                errors.push({
                    type: 'field',
                    msg: 'Fecha de inicio debe tener formato YYYY-MM-DD',
                    path: 'fecha_inicio',
                    location: 'body'
                });
            }
            
            // Horario es opcional para permisos, pero si se envía debe ser válido
            if (req.body.horario && req.body.horario.trim() && req.body.horario.trim().length < 3) {
                errors.push({
                    type: 'field',
                    msg: 'El horario debe tener al menos 3 caracteres',
                    path: 'horario',
                    location: 'body'
                });
            }

            // Limpiar campos no necesarios
            delete req.body.fecha_fin;
            delete req.body.monto;
            delete req.body.proposito;
            break;

        case 'vacaciones':
        case 'licencia':
            // Validar fecha_inicio y fecha_fin
            if (!req.body.fecha_inicio) {
                errors.push({
                    type: 'field',
                    msg: 'Fecha de inicio es requerida',
                    path: 'fecha_inicio',
                    location: 'body'
                });
            }
            
            if (!req.body.fecha_fin) {
                errors.push({
                    type: 'field',
                    msg: 'Fecha de fin es requerida',
                    path: 'fecha_fin',
                    location: 'body'
                });
            }
            
            // Validar que fecha_fin sea posterior a fecha_inicio
            if (req.body.fecha_inicio && req.body.fecha_fin) {
                const fechaInicio = new Date(req.body.fecha_inicio);
                const fechaFin = new Date(req.body.fecha_fin);
                
                if (fechaFin <= fechaInicio) {
                    errors.push({
                        type: 'field',
                        msg: 'Fecha de fin debe ser posterior a la fecha de inicio',
                        path: 'fecha_fin',
                        location: 'body'
                    });
                }
            }

            // Limpiar campos no necesarios
            delete req.body.monto;
            delete req.body.proposito;
            delete req.body.horario;
            break;

        case 'adelanto':
            // Validar solo monto
            if (!req.body.monto) {
                errors.push({
                    type: 'field',
                    msg: 'Monto es requerido para adelantos',
                    path: 'monto',
                    location: 'body'
                });
            } else {
                const monto = parseFloat(req.body.monto);
                if (isNaN(monto) || monto <= 0) {
                    errors.push({
                        type: 'field',
                        msg: 'El monto debe ser un número mayor a 0',
                        path: 'monto',
                        location: 'body'
                    });
                } else if (monto > 50000) {
                    errors.push({
                        type: 'field',
                        msg: 'El monto no puede exceder 50,000',
                        path: 'monto',
                        location: 'body'
                    });
                }
            }

            // Limpiar campos no necesarios
            delete req.body.fecha_inicio;
            delete req.body.fecha_fin;
            delete req.body.proposito;
            delete req.body.horario;
            break;

        case 'certificado':
            // Validar solo propósito
            if (!req.body.proposito || !req.body.proposito.trim()) {
                errors.push({
                    type: 'field',
                    msg: 'Propósito es requerido para certificados',
                    path: 'proposito',
                    location: 'body'
                });
            } else if (req.body.proposito.trim().length < 3) {
                errors.push({
                    type: 'field',
                    msg: 'El propósito debe tener al menos 3 caracteres',
                    path: 'proposito',
                    location: 'body'
                });
            } else if (req.body.proposito.trim().length > 200) {
                errors.push({
                    type: 'field',
                    msg: 'El propósito no puede exceder 200 caracteres',
                    path: 'proposito',
                    location: 'body'
                });
            }

            // Limpiar campos no necesarios
            delete req.body.fecha_inicio;
            delete req.body.fecha_fin;
            delete req.body.monto;
            delete req.body.horario;
            break;

        case 'otros':
            // Para "otros" permitir todos los campos pero no requerir ninguno específico
            // Solo validar formato si están presentes
            if (req.body.fecha_inicio && !/^\d{4}-\d{2}-\d{2}$/.test(req.body.fecha_inicio)) {
                errors.push({
                    type: 'field',
                    msg: 'Fecha de inicio debe tener formato YYYY-MM-DD',
                    path: 'fecha_inicio',
                    location: 'body'
                });
            }
            
            if (req.body.fecha_fin && !/^\d{4}-\d{2}-\d{2}$/.test(req.body.fecha_fin)) {
                errors.push({
                    type: 'field',
                    msg: 'Fecha de fin debe tener formato YYYY-MM-DD',
                    path: 'fecha_fin',
                    location: 'body'
                });
            }
            
            if (req.body.monto) {
                const monto = parseFloat(req.body.monto);
                if (isNaN(monto) || monto <= 0 || monto > 50000) {
                    errors.push({
                        type: 'field',
                        msg: 'El monto debe ser un número entre 1 y 50,000',
                        path: 'monto',
                        location: 'body'
                    });
                }
            }
            break;
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Errores de validación específicos por tipo',
            errors: errors
        });
    }

    console.log('Datos después de limpieza:', req.body);
    next();
};

// Middleware para limpiar valores undefined
const cleanUndefinedValues = (req, res, next) => {
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            if (req.body[key] === undefined || req.body[key] === '' || req.body[key] === 'undefined') {
                req.body[key] = null;
            }
        });
        
        console.log('Datos finales limpiados:', req.body);
    }
    next();
};

// RUTAS

// POST /api/solicitudes - Crear nueva solicitud
router.post('/',
    basicValidations,           // Validaciones básicas comunes
    handleValidationErrors,     // Manejar errores de validaciones básicas
    validateByType,            // Validaciones específicas por tipo
    cleanUndefinedValues,      // Limpiar undefined values
    solicitudesController.createSolicitud
);

// PUT /api/solicitudes/:id - Actualizar solicitud
router.put('/:id',
    [
        param('id').isInt({ min: 1 }).withMessage('ID de solicitud inválido'),
        ...basicValidations.map(validation => validation.optional()) // Hacer opcional para updates
    ],
    handleValidationErrors,
    validateByType,
    cleanUndefinedValues,
    solicitudesController.updateSolicitud
);

// Resto de rutas (mantener como estaban)
router.get('/', 
    [
        query('tipo').optional().isIn(['vacaciones', 'permiso', 'licencia', 'adelanto', 'certificado', 'otros', 'todas']),
        query('estado').optional().isIn(['pendiente', 'en-revision', 'aprobada', 'rechazada', 'todos']),
        query('fecha').optional().isISO8601(),
        query('search').optional().isString().trim(),
        query('sortBy').optional().isIn(['fecha_creacion', 'tipo_solicitud', 'estado', 'urgencia', 'titulo']),
        query('sortOrder').optional().isIn(['ASC', 'DESC']),
        query('trabajador_id').optional().isInt({ min: 1 })
    ],
    handleValidationErrors,
    solicitudesController.getSolicitudes
);

router.get('/estadisticas', solicitudesController.getEstadisticas);
router.get('/pendientes', solicitudesController.getPendientesAprobacion);
router.get('/historial', solicitudesController.getHistorial);
router.get('/trabajadores', solicitudesController.getTrabajadoresActivos);

router.get('/export',
    [
        query('tipo').optional().isIn(['vacaciones', 'permiso', 'licencia', 'adelanto', 'certificado', 'otros', 'todas']),
        query('estado').optional().isIn(['pendiente', 'en-revision', 'aprobada', 'rechazada', 'todos']),
        query('fecha_desde').optional().isISO8601(),
        query('fecha_hasta').optional().isISO8601()
    ],
    handleValidationErrors,
    solicitudesController.exportarCSV
);

router.get('/:id',
    [param('id').isInt({ min: 1 }).withMessage('ID de solicitud inválido')],
    handleValidationErrors,
    solicitudesController.getSolicitudById
);

router.patch('/:id/estado',
    [
        param('id').isInt({ min: 1 }).withMessage('ID de solicitud inválido'),
        body('estado').isIn(['pendiente', 'en-revision', 'aprobada', 'rechazada']),
        body('observaciones').optional().trim().isLength({ min: 3, max: 500 }),
        body('usuario').optional().trim().isLength({ min: 2, max: 100 })
    ],
    handleValidationErrors,
    solicitudesController.cambiarEstado
);

router.post('/:id/reactivar',
    [
        param('id').isInt({ min: 1 }).withMessage('ID de solicitud inválido'),
        body('usuario').optional().trim().isLength({ min: 2, max: 100 })
    ],
    handleValidationErrors,
    solicitudesController.reactivarSolicitud
);

router.delete('/:id',
    [param('id').isInt({ min: 1 }).withMessage('ID de solicitud inválido')],
    handleValidationErrors,
    solicitudesController.deleteSolicitud
);

module.exports = router;