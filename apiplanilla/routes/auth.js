// routes/auth.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

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

// POST /api/auth/login - Iniciar sesión
router.post('/login', [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Debe ser un email válido'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('La contraseña debe tener al menos 6 caracteres')
], handleValidationErrors, async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('Intento de login:', email);

        // Buscar usuario
        const users = await query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas',
                error_code: 'INVALID_CREDENTIALS'
            });
        }

        const user = users[0];
        console.log('Usuario encontrado:', user.email);

        // Verificar contraseña
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            console.log('Contraseña incorrecta para:', email);
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas',
                error_code: 'INVALID_CREDENTIALS'
            });
        }

        // Generar token JWT
        const tokenPayload = {
            id: user.id,
            email: user.email,
            role: user.role
        };

        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        console.log('Login exitoso para:', email);

        res.json({
            success: true,
            message: 'Login exitoso',
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                }
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error_code: 'INTERNAL_ERROR'
        });
    }
});

// POST /api/auth/register - Registrar usuario
router.post('/register', [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Debe ser un email válido'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    body('role')
        .optional()
        .isIn(['admin', 'user', 'planillero'])
        .withMessage('Rol inválido')
], handleValidationErrors, async (req, res) => {
    try {
        const { email, password, name, role = 'user' } = req.body;

        // Verificar si el usuario ya existe
        const existingUser = await query('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'El email ya está registrado',
                error_code: 'EMAIL_EXISTS'
            });
        }

        // Encriptar contraseña
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Crear usuario
        const result = await query(`
            INSERT INTO users (email, password, name, role)
            VALUES (?, ?, ?, ?)
        `, [email, hashedPassword, name, role]);

        console.log('Usuario registrado:', email);

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            data: {
                id: result.insertId,
                email,
                name,
                role
            }
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error_code: 'INTERNAL_ERROR'
        });
    }
});

// GET /api/auth/profile - Obtener perfil del usuario
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                id: req.user.id,
                email: req.user.email,
                name: req.user.name,
                role: req.user.role
            }
        });
    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error_code: 'INTERNAL_ERROR'
        });
    }
});

// POST /api/auth/verify-token - Verificar token
router.post('/verify-token', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'Token válido',
        data: {
            valid: true,
            user: {
                id: req.user.id,
                email: req.user.email,
                name: req.user.name,
                role: req.user.role
            }
        }
    });
});

// POST /api/auth/refresh-token - Renovar token
router.post('/refresh-token', authenticateToken, (req, res) => {
    try {
        // Generar nuevo token
        const tokenPayload = {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role
        };

        const newToken = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.json({
            success: true,
            message: 'Token renovado exitosamente',
            data: {
                token: newToken,
                user: req.user
            }
        });

    } catch (error) {
        console.error('Error renovando token:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error_code: 'INTERNAL_ERROR'
        });
    }
});

module.exports = router;