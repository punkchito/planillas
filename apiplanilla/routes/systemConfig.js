// routes/systemConfig.js
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, authorizePermission, auditLog } = require('../middleware/auth');
const systemConfigController = require('../controllers/systemConfigController');

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

// =====================================
// MIDDLEWARE DE AUTENTICACIÓN
// =====================================
// Aplicar autenticación a todas las rutas
//router.use(authenticateToken);

// =====================================
// CONFIGURACIÓN GENERAL
// =====================================

// GET /api/system-config/general - Obtener configuración general
router.get('/general',
    //authorizePermission(['system.config']),
    systemConfigController.getGeneralConfig
);

// PUT /api/system-config/general - Actualizar configuración general
router.put('/general',
    [
        //authorizePermission(['system.config']),
        body('institution_name').optional().isLength({ min: 3, max: 200 }).withMessage('Nombre debe tener entre 3 y 200 caracteres'),
        body('institution_ruc').optional().matches(/^\d{11}$/).withMessage('RUC debe tener 11 dígitos'),
        body('institution_email').optional().isEmail().withMessage('Email inválido'),
        body('institution_phone').optional().isLength({ min: 6, max: 20 }).withMessage('Teléfono inválido'),
        body('timezone').optional().isIn(['America/Lima', 'America/Bogota', 'America/Caracas']).withMessage('Zona horaria inválida'),
        body('currency').optional().isIn(['PEN', 'USD', 'EUR']).withMessage('Moneda inválida'),
        body('fiscal_year').optional().matches(/^\d{4}$/).withMessage('Año fiscal debe ser de 4 dígitos')
    ],
    handleValidationErrors,
    auditLog('Actualización de configuración general'),
    systemConfigController.updateGeneralConfig
);

// =====================================
// CONFIGURACIÓN DE PLANILLAS
// =====================================

// GET /api/system-config/planillas - Obtener configuración de planillas
router.get('/planillas',
    //authorizePermission(['system.config', 'payroll.process']),
    systemConfigController.getPlanillasConfig
);

// PUT /api/system-config/planillas - Actualizar configuración de planillas
router.put('/planillas',
    [
        //authorizePermission(['system.config']),
        body('payroll_period').optional().isIn(['mensual', 'quincenal', 'semanal']).withMessage('Periodo inválido'),
        body('cutoff_day').optional().isInt({ min: 1, max: 31 }).withMessage('Día de corte debe estar entre 1 y 31'),
        body('payment_day').optional().isInt({ min: 1, max: 31 }).withMessage('Día de pago debe estar entre 1 y 31'),
        body('rounding_method').optional().isIn(['normal', 'up', 'down']).withMessage('Método de redondeo inválido'),
        body('decimal_places').optional().isInt({ min: 2, max: 4 }).withMessage('Decimales debe estar entre 2 y 4'),
        body('auto_process').optional().isBoolean().withMessage('Auto proceso debe ser boolean')
    ],
    handleValidationErrors,
    auditLog('Actualización de configuración de planillas'),
    systemConfigController.updatePlanillasConfig
);

// =====================================
// CONFIGURACIÓN DE NOTIFICACIONES
// =====================================

// GET /api/system-config/notifications - Obtener configuración de notificaciones
router.get('/notifications',
    //authorizePermission(['system.config']),
    systemConfigController.getNotificationsConfig
);

// PUT /api/system-config/notifications - Actualizar configuración de notificaciones
router.put('/notifications',
    [
        //authorizePermission(['system.config']),
        body('smtp_server').optional().isLength({ min: 3, max: 100 }).withMessage('Servidor SMTP inválido'),
        body('smtp_port').optional().isInt({ min: 1, max: 65535 }).withMessage('Puerto SMTP inválido'),
        body('smtp_user').optional().isEmail().withMessage('Usuario SMTP debe ser un email válido'),
        body('smtp_password').optional().isLength({ min: 0, max: 200 }).withMessage('Contraseña demasiado larga'),
        body('payroll_processed').optional().isBoolean().withMessage('Notificación de planilla debe ser boolean'),
        body('contracts_expiring').optional().isBoolean().withMessage('Notificación de contratos debe ser boolean'),
        body('new_requests').optional().isBoolean().withMessage('Notificación de solicitudes debe ser boolean'),
        body('system_errors').optional().isBoolean().withMessage('Notificación de errores debe ser boolean')
    ],
    handleValidationErrors,
    auditLog('Actualización de configuración de notificaciones'),
    systemConfigController.updateNotificationsConfig
);

// POST /api/system-config/notifications/test - Probar configuración SMTP
router.post('/notifications/test',
    //authorizePermission(['system.config']),
    [
        body('test_email').isEmail().withMessage('Email de prueba requerido')
    ],
    handleValidationErrors,
    async (req, res) => {
        // Implementar prueba de SMTP
        res.json({
            success: true,
            message: 'Prueba de SMTP enviada (funcionalidad pendiente de implementar)'
        });
    }
);

// =====================================
// GESTIÓN DE USUARIOS DEL SISTEMA
// =====================================

// GET /api/system-config/users - Obtener usuarios del sistema
router.get('/users',
    [
        //authorizePermission(['system.users']),
        query('page').optional().isInt({ min: 1 }).withMessage('Página debe ser un entero positivo'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite debe estar entre 1 y 100'),
        query('role').optional().isString(),
        query('status').optional().isIn(['all', 'active', 'inactive']).withMessage('Estado inválido'),
        query('search').optional().isString()
    ],
    handleValidationErrors,
    systemConfigController.getSystemUsers
);

// GET /api/system-config/users/statistics - Estadísticas de usuarios
router.get('/users/statistics',
    //authorizePermission(['system.users', 'reports.dashboard']),
    async (req, res) => {
        try {
            const stats = await query(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                    SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive,
                    COUNT(DISTINCT role) as total_roles,
                    SUM(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as active_last_month
                FROM users
            `);

            const roleStats = await query(`
                SELECT r.name, r.type, COUNT(u.id) as user_count
                FROM roles r
                LEFT JOIN users u ON r.id = u.role
                GROUP BY r.id, r.name, r.type
                ORDER BY user_count DESC
            `);

            res.json({
                success: true,
                data: {
                    summary: stats[0],
                    roles: roleStats
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error obteniendo estadísticas',
                error: error.message
            });
        }
    }
);

// =====================================
// LOGS Y AUDITORÍA
// =====================================

// GET /api/system-config/logs - Obtener logs del sistema
router.get('/logs',
    [
        //authorizePermission(['system.logs']),
        query('page').optional().isInt({ min: 1 }).withMessage('Página inválida'),
        query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('Límite inválido'),
        query('level').optional().isString(),
        query('dateFrom').optional().isISO8601().withMessage('Fecha desde inválida'),
        query('dateTo').optional().isISO8601().withMessage('Fecha hasta inválida'),
        query('search').optional().isString()
    ],
    handleValidationErrors,
    systemConfigController.getSystemLogs
);

// DELETE /api/system-config/logs/clear - Limpiar logs antiguos
router.delete('/logs/clear',
    [
        //authorizePermission(['system.logs']),
        body('days').optional().isInt({ min: 1, max: 365 }).withMessage('Días debe estar entre 1 y 365')
    ],
    handleValidationErrors,
    auditLog('Limpieza de logs del sistema'),
    systemConfigController.clearOldLogs
);

// GET /api/system-config/logs/export - Exportar logs
router.get('/logs/export',
    //authorizePermission(['system.logs', 'reports.export']),
    async (req, res) => {
        try {
            const { dateFrom, dateTo, level } = req.query;
            
            let whereConditions = [];
            let queryParams = [];
            
            if (level && level !== 'all') {
                whereConditions.push('action = ?');
                queryParams.push(level);
            }
            
            if (dateFrom) {
                whereConditions.push('created_at >= ?');
                queryParams.push(dateFrom);
            }
            
            if (dateTo) {
                whereConditions.push('created_at <= ?');
                queryParams.push(dateTo + ' 23:59:59');
            }
            
            const whereClause = whereConditions.length > 0 ? 
                `WHERE ${whereConditions.join(' AND ')}` : '';

            const logs = await query(`
                SELECT 
                    ual.created_at as timestamp,
                    ual.action as level,
                    ual.description as message,
                    u.name as user_name,
                    u.email as user_email,
                    ual.ip_address,
                    performer.name as performed_by
                FROM user_audit_logs ual
                LEFT JOIN users u ON ual.user_id = u.id
                LEFT JOIN users performer ON ual.performed_by = performer.id
                ${whereClause}
                ORDER BY ual.created_at DESC
                LIMIT 10000
            `, queryParams);

            // Convertir a CSV
            const { Parser } = require('json2csv');
            const fields = ['timestamp', 'level', 'message', 'user_name', 'user_email', 'ip_address', 'performed_by'];
            const parser = new Parser({ fields });
            const csv = parser.parse(logs);

            res.header('Content-Type', 'text/csv');
            res.attachment(`system-logs-${new Date().toISOString().split('T')[0]}.csv`);
            res.send(csv);

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error exportando logs',
                error: error.message
            });
        }
    }
);

// =====================================
// ESTADÍSTICAS Y DASHBOARD
// =====================================

// GET /api/system-config/statistics - Estadísticas generales del sistema
router.get('/statistics',
    //authorizePermission(['reports.dashboard', 'system.config']),
    systemConfigController.getSystemStats
);

// GET /api/system-config/health - Estado de salud del sistema
router.get('/health',
    //authorizePermission(['system.config', 'system.logs']),
    async (req, res) => {
        try {
            // Verificar conexión a BD
            const dbTest = await query('SELECT 1 as test');
            const dbHealthy = dbTest.length > 0;

            // Verificar logs recientes (últimas 24 horas)
            const recentErrors = await query(`
                SELECT COUNT(*) as error_count
                FROM user_audit_logs
                WHERE action LIKE '%error%' 
                AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            `);

            // Verificar espacio de logs
            const totalLogs = await query('SELECT COUNT(*) as total FROM user_audit_logs');

            const health = {
                timestamp: new Date().toISOString(),
                database: {
                    status: dbHealthy ? 'healthy' : 'error',
                    connection: dbHealthy
                },
                logs: {
                    total_entries: totalLogs[0].total,
                    recent_errors: recentErrors[0].error_count,
                    status: recentErrors[0].error_count < 10 ? 'healthy' : 'warning'
                },
                overall_status: dbHealthy && recentErrors[0].error_count < 50 ? 'healthy' : 'warning'
            };

            res.json({
                success: true,
                data: health
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error verificando salud del sistema',
                data: {
                    overall_status: 'error',
                    error: error.message
                }
            });
        }
    }
);

// =====================================
// IMPORTAR/EXPORTAR CONFIGURACIÓN
// =====================================

// GET /api/system-config/export - Exportar configuración completa
router.get('/export',
    //authorizePermission(['system.config', 'reports.export']),
    auditLog('Exportación de configuración del sistema'),
    systemConfigController.exportConfig
);

// POST /api/system-config/import - Importar configuración
router.post('/import',
    [
        //authorizePermission(['system.config']),
        body('settings').isObject().withMessage('Configuración debe ser un objeto'),
        body('overwrite').optional().isBoolean().withMessage('Overwrite debe ser boolean')
    ],
    handleValidationErrors,
    auditLog('Importación de configuración del sistema'),
    async (req, res) => {
        try {
            const { settings, overwrite = false } = req.body;

            let updatedCount = 0;
            const allowedGroups = ['general', 'planillas', 'notifications'];

            for (const [groupName, groupSettings] of Object.entries(settings)) {
                if (!allowedGroups.includes(groupName)) continue;

                for (const [settingKey, settingValue] of Object.entries(groupSettings)) {
                    // Verificar si la configuración existe
                    const existing = await query(`
                        SELECT id FROM system_settings 
                        WHERE group_name = ? AND setting_key = ?
                    `, [groupName, settingKey]);

                    if (existing.length > 0) {
                        if (overwrite) {
                            await query(`
                                UPDATE system_settings 
                                SET setting_value = ?, updated_at = CURRENT_TIMESTAMP
                                WHERE group_name = ? AND setting_key = ?
                            `, [String(settingValue), groupName, settingKey]);
                            updatedCount++;
                        }
                    } else {
                        // Crear nueva configuración
                        await query(`
                            INSERT INTO system_settings (group_name, setting_key, setting_value, data_type)
                            VALUES (?, ?, ?, 'string')
                        `, [groupName, settingKey, String(settingValue)]);
                        updatedCount++;
                    }
                }
            }

            res.json({
                success: true,
                message: `Configuración importada exitosamente. ${updatedCount} configuraciones actualizadas.`
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error importando configuración',
                error: error.message
            });
        }
    }
);

module.exports = router;