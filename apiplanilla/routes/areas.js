// routes/areas.js - AREAS CON ORDEN CORREGIDO
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

// GET /api/areas/activas - DEBE IR ANTES que GET /api/areas/:id
router.get('/activas', disableCache, 
    //authenticateToken, 
    async (req, res) => {
    try {
        // Establecer charset antes de la consulta
        await query('SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci');
        
        const areas = await query(`
            SELECT id, nombre, descripcion 
            FROM areas 
            WHERE estado = 'activo'
            ORDER BY nombre ASC
        `);

        // Debug log
        console.log('Areas found:', areas.length);
        areas.forEach(area => {
            console.log(`ID: ${area.id}, Nombre: "${area.nombre}", Length: ${area.nombre?.length}`);
        });

        res.json({
            success: true,
            data: areas
        });
    } catch (error) {
        console.error('Error obteniendo áreas activas:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

// GET /api/areas - Obtener todas las áreas
router.get('/', 
    //authenticateToken, 
    async (req, res) => {
    try {
        const areas = await query(`
            SELECT id, nombre, descripcion, estado 
            FROM areas 
            ORDER BY nombre ASC
        `);

        res.json({
            success: true,
            data: areas
        });
    } catch (error) {
        console.error('Error obteniendo áreas:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

// POST /api/areas - Crear nueva área
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
            .withMessage('La descripción no puede exceder 500 caracteres')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { nombre, descripcion } = req.body;

            // Verificar si ya existe un área con ese nombre
            const existing = await query('SELECT id FROM areas WHERE nombre = ?', [nombre]);
            if (existing.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe un área con ese nombre'
                });
            }

            const result = await query(
                'INSERT INTO areas (nombre, descripcion) VALUES (?, ?)',
                [nombre, descripcion || null]
            );

            res.status(201).json({
                success: true,
                message: 'Área creada exitosamente',
                data: {
                    id: result.insertId,
                    nombre,
                    descripcion
                }
            });

        } catch (error) {
            console.error('Error creando área:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }
);

// PUT /api/areas/:id - Actualizar área
router.put('/:id',
    //authenticateToken,
    authorizeRole(['admin']),
    [
        param('id').isInt({ min: 1 }).withMessage('ID de área inválido'),
        body('nombre')
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
        body('descripcion')
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage('La descripción no puede exceder 500 caracteres'),
        body('estado')
            .optional()
            .isIn(['activo', 'inactivo'])
            .withMessage('Estado debe ser activo o inactivo')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { nombre, descripcion, estado } = req.body;

            // Verificar si el área existe
            const existing = await query('SELECT id FROM areas WHERE id = ?', [id]);
            if (existing.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Área no encontrada'
                });
            }

            // Verificar si otra área ya tiene ese nombre
            const duplicated = await query('SELECT id FROM areas WHERE nombre = ? AND id != ?', [nombre, id]);
            if (duplicated.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe otra área con ese nombre'
                });
            }

            await query(`
                UPDATE areas 
                SET nombre = ?, descripcion = ?, estado = COALESCE(?, estado), updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [nombre, descripcion, estado, id]);

            res.json({
                success: true,
                message: 'Área actualizada exitosamente'
            });

        } catch (error) {
            console.error('Error actualizando área:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }
);

module.exports = router;