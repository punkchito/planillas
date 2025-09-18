// routes/cargos.js - CARGOS CON ORDEN CORREGIDO
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { query } = require('../config/database');

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

// Middleware para desactivar cache
const disableCache = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
};

// GET /api/cargos/activos - DEBE IR ANTES que GET /api/cargos/:id
router.get('/activos', disableCache, 
    //authenticateToken, 
    async (req, res) => {
    try {
        const { area_id } = req.query;
        
        let queryStr = `
            SELECT c.id, c.nombre, c.descripcion, c.area_id,
                   a.nombre as area_nombre
            FROM cargos c
            LEFT JOIN areas a ON c.area_id = a.id
            WHERE c.estado = 'activo'
        `;
        
        let queryParams = [];
        
        if (area_id) {
            queryStr += ' AND c.area_id = ?';
            queryParams.push(area_id);
        }
        
        queryStr += ' ORDER BY a.nombre, c.nombre ASC';

        const cargos = await query(queryStr, queryParams);

        res.json({
            success: true,
            data: cargos
        });
    } catch (error) {
        console.error('Error obteniendo cargos activos:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

// GET /api/cargos - Obtener todos los cargos
router.get('/', 
    //authenticateToken, 
    async (req, res) => {
    try {
        const { area_id } = req.query;
        
        let queryStr = `
            SELECT c.id, c.nombre, c.descripcion, c.estado, c.area_id,
                   a.nombre as area_nombre
            FROM cargos c
            LEFT JOIN areas a ON c.area_id = a.id
        `;
        
        let queryParams = [];
        
        if (area_id) {
            queryStr += ' WHERE c.area_id = ?';
            queryParams.push(area_id);
        }
        
        queryStr += ' ORDER BY a.nombre, c.nombre ASC';

        const cargos = await query(queryStr, queryParams);

        res.json({
            success: true,
            data: cargos
        });
    } catch (error) {
        console.error('Error obteniendo cargos:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

// POST /api/cargos - Crear nuevo cargo
router.post('/',
    //authenticateToken,
    authorizeRole(['admin']),
    [
        body('nombre')
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
        body('descripcion')
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage('La descripción no puede exceder 500 caracteres'),
        body('area_id')
            .isInt({ min: 1 })
            .withMessage('El área debe ser un ID válido')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { nombre, descripcion, area_id } = req.body;

            // Verificar si el área existe
            const areaExists = await query('SELECT id FROM areas WHERE id = ? AND estado = "activo"', [area_id]);
            if (areaExists.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El área especificada no existe o no está activa'
                });
            }

            // Verificar si ya existe un cargo con ese nombre en la misma área
            const existing = await query('SELECT id FROM cargos WHERE nombre = ? AND area_id = ?', [nombre, area_id]);
            if (existing.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe un cargo con ese nombre en esta área'
                });
            }

            const result = await query(
                'INSERT INTO cargos (nombre, descripcion, area_id) VALUES (?, ?, ?)',
                [nombre, descripcion || null, area_id]
            );

            res.status(201).json({
                success: true,
                message: 'Cargo creado exitosamente',
                data: {
                    id: result.insertId,
                    nombre,
                    descripcion,
                    area_id
                }
            });

        } catch (error) {
            console.error('Error creando cargo:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }
);

// PUT /api/cargos/:id - Actualizar cargo
router.put('/:id',
    //authenticateToken,
    authorizeRole(['admin']),
    [
        param('id').isInt({ min: 1 }).withMessage('ID de cargo inválido'),
        body('nombre')
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
        body('descripcion')
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage('La descripción no puede exceder 500 caracteres'),
        body('area_id')
            .isInt({ min: 1 })
            .withMessage('El área debe ser un ID válido'),
        body('estado')
            .optional()
            .isIn(['activo', 'inactivo'])
            .withMessage('Estado debe ser activo o inactivo')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { nombre, descripcion, area_id, estado } = req.body;

            // Verificar si el cargo existe
            const existing = await query('SELECT id FROM cargos WHERE id = ?', [id]);
            if (existing.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Cargo no encontrado'
                });
            }

            // Verificar si el área existe
            const areaExists = await query('SELECT id FROM areas WHERE id = ? AND estado = "activo"', [area_id]);
            if (areaExists.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El área especificada no existe o no está activa'
                });
            }

            // Verificar si otro cargo ya tiene ese nombre en la misma área
            const duplicated = await query('SELECT id FROM cargos WHERE nombre = ? AND area_id = ? AND id != ?', [nombre, area_id, id]);
            if (duplicated.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe otro cargo con ese nombre en esta área'
                });
            }

            await query(`
                UPDATE cargos 
                SET nombre = ?, descripcion = ?, area_id = ?, estado = COALESCE(?, estado), updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [nombre, descripcion, area_id, estado, id]);

            res.json({
                success: true,
                message: 'Cargo actualizado exitosamente'
            });

        } catch (error) {
            console.error('Error actualizando cargo:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }
);

module.exports = router;