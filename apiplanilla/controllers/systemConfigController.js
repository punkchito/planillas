// controllers/systemConfigController.js
const { query } = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

class SystemConfigController {

    // =====================================
    // CONFIGURACIÓN GENERAL
    // =====================================

    // Obtener configuración general
    async getGeneralConfig(req, res) {
        try {
            const settings = await query(`
                SELECT setting_key, setting_value, data_type
                FROM system_settings 
                WHERE group_name = 'general'
                ORDER BY setting_key
            `);

            console.log("settings: ", settings);
            const config = {};
            settings.forEach(setting => {
                let value = setting.setting_value;
                
                // Convertir según el tipo de dato
                if (setting.data_type === 'number') {
                    value = parseFloat(value);
                } else if (setting.data_type === 'boolean') {
                    value = value === 'true';
                } else if (setting.data_type === 'json') {
                    try {
                        value = JSON.parse(value);
                    } catch (e) {
                        value = setting.setting_value;
                    }
                }
                
                config[setting.setting_key] = value;
            });

            res.json({
                success: true,
                data: config
            });

        } catch (error) {
            console.error('1. Error obteniendo configuración general:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Actualizar configuración general
    async updateGeneralConfig(req, res) {
        try {
            const updates = req.body;
            const allowedFields = [
                'institution_name', 'institution_ruc', 'institution_address',
                'institution_phone', 'institution_email', 'timezone',
                'currency', 'fiscal_year'
            ];

            for (const [key, value] of Object.entries(updates)) {
                if (allowedFields.includes(key)) {
                    await query(`
                        UPDATE system_settings 
                        SET setting_value = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE group_name = 'general' AND setting_key = ?
                    `, [String(value), key]);
                }
            }

            // Log de auditoría
            if (req.user) {
                await this.createAuditLog(
                    req.user.id,
                    'config_updated',
                    'Configuración general actualizada',
                    req.ip,
                    req.get('User-Agent')
                );
            }

            res.json({
                success: true,
                message: 'Configuración general actualizada exitosamente'
            });

        } catch (error) {
            console.error('Error actualizando configuración general:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // =====================================
    // CONFIGURACIÓN DE PLANILLAS
    // =====================================

    // Obtener configuración de planillas
    async getPlanillasConfig(req, res) {
        try {
            const settings = await query(`
                SELECT setting_key, setting_value, data_type
                FROM system_settings 
                WHERE group_name = 'planillas'
                ORDER BY setting_key
            `);

            const config = {};
            settings.forEach(setting => {
                let value = setting.setting_value;
                
                if (setting.data_type === 'number') {
                    value = parseInt(value);
                } else if (setting.data_type === 'boolean') {
                    value = value === 'true';
                }
                
                config[setting.setting_key] = value;
            });

            res.json({
                success: true,
                data: config
            });

        } catch (error) {
            console.error('Error obteniendo configuración de planillas:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Actualizar configuración de planillas
    async updatePlanillasConfig(req, res) {
        try {
            const updates = req.body;
            const allowedFields = [
                'payroll_period', 'cutoff_day', 'payment_day',
                'rounding_method', 'decimal_places', 'auto_process'
            ];

            for (const [key, value] of Object.entries(updates)) {
                if (allowedFields.includes(key)) {
                    let stringValue = String(value);
                    
                    // Validaciones específicas
                    if (key === 'cutoff_day' || key === 'payment_day') {
                        const num = parseInt(value);
                        if (num < 1 || num > 31) continue;
                        stringValue = String(num);
                    } else if (key === 'decimal_places') {
                        const num = parseInt(value);
                        if (num < 2 || num > 4) continue;
                        stringValue = String(num);
                    }

                    await query(`
                        UPDATE system_settings 
                        SET setting_value = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE group_name = 'planillas' AND setting_key = ?
                    `, [stringValue, key]);
                }
            }

            res.json({
                success: true,
                message: 'Configuración de planillas actualizada exitosamente'
            });

        } catch (error) {
            console.error('Error actualizando configuración de planillas:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // =====================================
    // CONFIGURACIÓN DE NOTIFICACIONES
    // =====================================

    // Obtener configuración de notificaciones
    async getNotificationsConfig(req, res) {
        try {
            const settings = await query(`
                SELECT setting_key, setting_value, data_type
                FROM system_settings 
                WHERE group_name = 'notifications'
                ORDER BY setting_key
            `);

            const config = {};
            settings.forEach(setting => {
                let value = setting.setting_value;
                
                if (setting.data_type === 'number') {
                    value = parseInt(value);
                } else if (setting.data_type === 'boolean') {
                    value = value === 'true';
                }
                
                // Ocultar contraseña por seguridad
                if (setting.setting_key === 'smtp_password' && value) {
                    value = '********';
                }
                
                config[setting.setting_key] = value;
            });

            res.json({
                success: true,
                data: config
            });

        } catch (error) {
            console.error('Error obteniendo configuración de notificaciones:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Actualizar configuración de notificaciones
    async updateNotificationsConfig(req, res) {
        try {
            const updates = req.body;
            const allowedFields = [
                'smtp_server', 'smtp_port', 'smtp_user', 'smtp_password',
                'payroll_processed', 'contracts_expiring', 'new_requests', 'system_errors'
            ];

            for (const [key, value] of Object.entries(updates)) {
                if (allowedFields.includes(key)) {
                    // No actualizar contraseña si viene como asteriscos
                    if (key === 'smtp_password' && value === '********') {
                        continue;
                    }

                    await query(`
                        UPDATE system_settings 
                        SET setting_value = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE group_name = 'notifications' AND setting_key = ?
                    `, [String(value), key]);
                }
            }

            res.json({
                success: true,
                message: 'Configuración de notificaciones actualizada exitosamente'
            });

        } catch (error) {
            console.error('Error actualizando configuración de notificaciones:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // =====================================
    // GESTIÓN DE USUARIOS DEL SISTEMA
    // =====================================

    // Obtener usuarios del sistema
    async getSystemUsers(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                search,
                role,
                status = 'all'
            } = req.query;

            let whereConditions = [];
            let queryParams = [];

            // Filtros
            if (search) {
                whereConditions.push('(u.name LIKE ? OR u.email LIKE ? OR u.dni LIKE ?)');
                const searchTerm = `%${search}%`;
                queryParams.push(searchTerm, searchTerm, searchTerm);
            }

            if (role && role !== 'all') {
                whereConditions.push('u.role = ?');
                queryParams.push(role);
            }

            if (status && status !== 'all') {
                whereConditions.push('u.status = ?');
                queryParams.push(status);
            }

            const whereClause = whereConditions.length > 0 ? 
                `WHERE ${whereConditions.join(' AND ')}` : '';

            // Consulta principal con paginación
            const offset = (parseInt(page) - 1) * parseInt(limit);
            queryParams.push(parseInt(limit), offset);

            const users = await query(`
                SELECT 
                    u.id, u.email, u.name, u.dni, u.phone, u.status,
                    u.last_login, u.created_at, u.role,
                    r.name as role_name, r.type as role_type, r.description as role_description,
                    creator.name as created_by_name
                FROM users u
                LEFT JOIN roles r ON u.role = r.id
                LEFT JOIN users creator ON u.created_by = creator.id
                ${whereClause}
                ORDER BY u.created_at DESC
                LIMIT ? OFFSET ?
            `, queryParams);

            // Contar total de registros
            const totalQuery = whereConditions.length > 0 ? 
                queryParams.slice(0, -2) : [];

            const totalResult = await query(`
                SELECT COUNT(*) as total
                FROM users u
                LEFT JOIN roles r ON u.role = r.id
                ${whereClause}
            `, totalQuery);

            const total = totalResult[0].total;

            res.json({
                success: true,
                data: users,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    totalUsers: total,
                    limit: parseInt(limit)
                }
            });

        } catch (error) {
            console.error('Error obteniendo usuarios:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // =====================================
    // LOGS Y AUDITORÍA
    // =====================================

    // Obtener logs del sistema
    async getSystemLogs(req, res) {
        try {
            const {
                page = 1,
                limit = 50,
                level,
                dateFrom,
                dateTo,
                search
            } = req.query;

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

            if (search) {
                whereConditions.push('(description LIKE ? OR user_agent LIKE ?)');
                const searchTerm = `%${search}%`;
                queryParams.push(searchTerm, searchTerm);
            }

            const whereClause = whereConditions.length > 0 ? 
                `WHERE ${whereConditions.join(' AND ')}` : '';

            const offset = (parseInt(page) - 1) * parseInt(limit);
            queryParams.push(parseInt(limit), offset);

            const logs = await query(`
                SELECT 
                    ual.id, ual.action, ual.description, ual.ip_address,
                    ual.user_agent, ual.created_at,
                    u.name as user_name, u.email as user_email,
                    performer.name as performed_by_name
                FROM user_audit_logs ual
                LEFT JOIN users u ON ual.user_id = u.id
                LEFT JOIN users performer ON ual.performed_by = performer.id
                ${whereClause}
                ORDER BY ual.created_at DESC
                LIMIT ? OFFSET ?
            `, queryParams);

            res.json({
                success: true,
                data: logs
            });

        } catch (error) {
            console.error('Error obteniendo logs:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Limpiar logs antiguos
    async clearOldLogs(req, res) {
        try {
            const { days = 30 } = req.body;

            const result = await query(`
                DELETE FROM user_audit_logs 
                WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
            `, [parseInt(days)]);

            // Crear log de la limpieza
            if (req.user) {
                await this.createAuditLog(
                    req.user.id,
                    'logs_cleaned',
                    `Logs anteriores a ${days} días eliminados. Registros eliminados: ${result.affectedRows}`,
                    req.ip,
                    req.get('User-Agent')
                );
            }

            res.json({
                success: true,
                message: `Logs limpiados exitosamente. ${result.affectedRows} registros eliminados.`
            });

        } catch (error) {
            console.error('Error limpiando logs:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // =====================================
    // ESTADÍSTICAS Y DASHBOARD
    // =====================================

    // Obtener estadísticas del sistema
    async getSystemStats(req, res) {
        try {
            // Estadísticas de usuarios
            const userStats = await query(`
                SELECT 
                    COUNT(*) as total_users,
                    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_users,
                    SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_users,
                    SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_users
                FROM users
            `);

            // Estadísticas de trabajadores
            const workerStats = await query(`
                SELECT 
                    COUNT(*) as total_workers,
                    SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as active_workers,
                    COUNT(DISTINCT area_id) as total_areas
                FROM trabajadores
            `);

            // Estadísticas de planillas
            const payrollStats = await query(`
                SELECT 
                    COUNT(*) as total_payrolls,
                    SUM(CASE WHEN estado = 'procesada' THEN 1 ELSE 0 END) as processed_payrolls,
                    COALESCE(SUM(CASE WHEN estado = 'procesada' THEN total_neto ELSE 0 END), 0) as total_paid
                FROM planillas
                WHERE fecha_proceso >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            `);

            // Logs recientes
            const recentLogs = await query(`
                SELECT COUNT(*) as recent_logs
                FROM user_audit_logs
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            `);

            res.json({
                success: true,
                data: {
                    users: userStats[0],
                    workers: workerStats[0],
                    payrolls: payrollStats[0],
                    logs: recentLogs[0]
                }
            });

        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // =====================================
    // IMPORTAR/EXPORTAR CONFIGURACIÓN
    // =====================================

    // Exportar configuración completa
    async exportConfig(req, res) {
        try {
            // Obtener todas las configuraciones
            const settings = await query(`
                SELECT group_name, setting_key, setting_value, data_type
                FROM system_settings
                ORDER BY group_name, setting_key
            `);

            const config = {
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                settings: {}
            };

            settings.forEach(setting => {
                if (!config.settings[setting.group_name]) {
                    config.settings[setting.group_name] = {};
                }
                
                let value = setting.setting_value;
                if (setting.data_type === 'number') {
                    value = parseFloat(value);
                } else if (setting.data_type === 'boolean') {
                    value = value === 'true';
                } else if (setting.data_type === 'json') {
                    try {
                        value = JSON.parse(value);
                    } catch (e) {
                        value = setting.setting_value;
                    }
                }
                
                config.settings[setting.group_name][setting.setting_key] = value;
            });

            // Ocultar contraseñas sensibles
            if (config.settings.notifications && config.settings.notifications.smtp_password) {
                config.settings.notifications.smtp_password = '********';
            }

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="config-${Date.now()}.json"`);
            res.json(config);

        } catch (error) {
            console.error('Error exportando configuración:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // =====================================
    // FUNCIONES AUXILIARES
    // =====================================

    // Crear log de auditoría
    async createAuditLog(userId, action, description, ipAddress, userAgent) {
        try {
            await query(`
                INSERT INTO user_audit_logs (user_id, action, description, ip_address, user_agent, performed_by)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [userId, action, description, ipAddress, userAgent, userId]);
        } catch (error) {
            console.error('Error creando log de auditoría:', error);
        }
    }

    // Validar permisos de administrador
    async validateAdminPermissions(req, res, next) {
        if (!req.user || !req.user.permissions.includes('system.config')) {
            return res.status(403).json({
                success: false,
                message: 'Permisos insuficientes. Se requiere permiso de configuración del sistema.'
            });
        }
        next();
    }
}

module.exports = new SystemConfigController();