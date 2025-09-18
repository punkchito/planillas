// controllers/systemUsersController.js - Controlador específico para gestión de usuarios del sistema
const { query } = require('../config/database');
const bcrypt = require('bcryptjs');
const { Parser } = require('json2csv');

class SystemUsersController {

    // Obtener usuarios con paginación y filtros
    async getUsers(req, res) {
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
            const limitParams = [parseInt(limit), offset];

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
            `, [...queryParams, ...limitParams]);

            // Contar total de registros
            const totalResult = await query(`
                SELECT COUNT(*) as total
                FROM users u
                LEFT JOIN roles r ON u.role = r.id
                ${whereClause}
            `, queryParams);

            const total = totalResult[0].total;

            // Transformar usuarios para compatibilidad con frontend
            const transformedUsers = users.map(user => ({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role_name || user.role,
                department: user.role_description || 'Sin descripción',
                active: user.status === 'active',
                dni: user.dni,
                phone: user.phone,
                last_login: user.last_login,
                created_at: user.created_at,
                created_by_name: user.created_by_name
            }));

            res.json({
                success: true,
                data: transformedUsers,
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

    // Obtener usuario por ID
    async getUserById(req, res) {
        try {
            const { id } = req.params;

            const user = await query(`
                SELECT 
                    u.id, u.email, u.name, u.dni, u.phone, u.status,
                    u.last_login, u.created_at, u.role,
                    r.name as role_name, r.type as role_type, r.description as role_description
                FROM users u
                LEFT JOIN roles r ON u.role = r.id
                WHERE u.id = ?
            `, [id]);

            if (user.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }

            const userData = user[0];
            const transformedUser = {
                id: userData.id,
                name: userData.name,
                email: userData.email,
                role: userData.role,
                role_name: userData.role_name,
                department: userData.role_description || 'Sin descripción',
                active: userData.status === 'active',
                dni: userData.dni,
                phone: userData.phone,
                last_login: userData.last_login,
                created_at: userData.created_at
            };

            res.json({
                success: true,
                data: transformedUser
            });

        } catch (error) {
            console.error('Error obteniendo usuario:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Crear nuevo usuario
    async createUser(req, res) {
        try {
            const { name, email, role, department, active = true, dni, phone, password } = req.body;

            // Verificar si ya existe un usuario con ese email
            const existingUser = await query('SELECT id FROM users WHERE email = ?', [email]);
            if (existingUser.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe un usuario con ese email'
                });
            }

            // Verificar si el rol existe
            const roleExists = await query('SELECT id FROM roles WHERE id = ?', [role]);
            if (roleExists.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El rol especificado no existe'
                });
            }

            // Hash de la contraseña (usar email como contraseña por defecto si no se proporciona)
            const defaultPassword = password || email.split('@')[0] + '123';
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);

            const status = active ? 'active' : 'inactive';
            const createdBy = req.user ? req.user.id : null;

            const result = await query(`
                INSERT INTO users (name, email, password, role, status, dni, phone, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [name, email, hashedPassword, role, status, dni || null, phone || null, createdBy]);

            res.status(201).json({
                success: true,
                message: 'Usuario creado exitosamente',
                data: {
                    id: result.insertId,
                    name,
                    email,
                    role,
                    active,
                    default_password: password ? null : defaultPassword
                }
            });

        } catch (error) {
            console.error('Error creando usuario:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Actualizar usuario
    async updateUser(req, res) {
        try {
            const { id } = req.params;
            const { name, email, role, department, active, dni, phone } = req.body;

            // Verificar que el usuario existe
            const existingUser = await query('SELECT id, email FROM users WHERE id = ?', [id]);
            if (existingUser.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }

            // Verificar email único (si se está cambiando)
            if (email && email !== existingUser[0].email) {
                const emailExists = await query('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
                if (emailExists.length > 0) {
                    return res.status(409).json({
                        success: false,
                        message: 'Ya existe otro usuario con ese email'
                    });
                }
            }

            // Construir query de actualización dinámicamente
            const updateFields = [];
            const updateValues = [];

            if (name !== undefined) {
                updateFields.push('name = ?');
                updateValues.push(name);
            }

            if (email !== undefined) {
                updateFields.push('email = ?');
                updateValues.push(email);
            }

            if (role !== undefined) {
                // Verificar que el rol existe
                const roleExists = await query('SELECT id FROM roles WHERE id = ?', [role]);
                if (roleExists.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'El rol especificado no existe'
                    });
                }
                updateFields.push('role = ?');
                updateValues.push(role);
            }

            if (active !== undefined) {
                updateFields.push('status = ?');
                updateValues.push(active ? 'active' : 'inactive');
            }

            if (dni !== undefined) {
                updateFields.push('dni = ?');
                updateValues.push(dni);
            }

            if (phone !== undefined) {
                updateFields.push('phone = ?');
                updateValues.push(phone);
            }

            if (updateFields.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No se proporcionaron campos para actualizar'
                });
            }

            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            updateValues.push(id);

            await query(`
                UPDATE users 
                SET ${updateFields.join(', ')}
                WHERE id = ?
            `, updateValues);

            res.json({
                success: true,
                message: 'Usuario actualizado exitosamente'
            });

        } catch (error) {
            console.error('Error actualizando usuario:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Cambiar estado del usuario (activar/desactivar)
    async toggleUserStatus(req, res) {
        try {
            const { id } = req.params;
            const { active } = req.body;

            if (typeof active !== 'boolean') {
                return res.status(400).json({
                    success: false,
                    message: 'El campo active debe ser un booleano'
                });
            }

            const result = await query(`
                UPDATE users 
                SET status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [active ? 'active' : 'inactive', id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }

            res.json({
                success: true,
                message: `Usuario ${active ? 'activado' : 'desactivado'} exitosamente`
            });

        } catch (error) {
            console.error('Error cambiando estado del usuario:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Eliminar usuario
    async deleteUser(req, res) {
        try {
            const { id } = req.params;

            // Verificar que no sea el usuario actual
            if (req.user && parseInt(id) === req.user.id) {
                return res.status(409).json({
                    success: false,
                    message: 'No puedes eliminar tu propia cuenta'
                });
            }

            // Verificar si el usuario ha creado otros usuarios
            const createdUsers = await query('SELECT COUNT(*) as count FROM users WHERE created_by = ?', [id]);
            
            const result = await query('DELETE FROM users WHERE id = ?', [id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }

            res.json({
                success: true,
                message: 'Usuario eliminado exitosamente',
                info: createdUsers[0].count > 0 ? `Este usuario había creado ${createdUsers[0].count} usuario(s)` : null
            });

        } catch (error) {
            console.error('Error eliminando usuario:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Obtener estadísticas de usuarios
    async getUserStatistics(req, res) {
        try {
            // Estadísticas generales
            const generalStats = await query(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                    SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive,
                    COUNT(DISTINCT role) as total_roles,
                    SUM(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as active_last_month,
                    SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as created_last_month
                FROM users
            `);

            // Estadísticas por rol
            const roleStats = await query(`
                SELECT 
                    r.id, r.name, r.type, r.description,
                    COUNT(u.id) as user_count,
                    SUM(CASE WHEN u.status = 'active' THEN 1 ELSE 0 END) as active_count
                FROM roles r
                LEFT JOIN users u ON r.id = u.role
                GROUP BY r.id, r.name, r.type, r.description
                ORDER BY user_count DESC
            `);

            // Actividad reciente
            const recentActivity = await query(`
                SELECT 
                    COUNT(*) as total_logins,
                    COUNT(DISTINCT user_id) as unique_users
                FROM user_audit_logs
                WHERE action = 'login' 
                AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            `);

            res.json({
                success: true,
                data: {
                    summary: generalStats[0],
                    roles: roleStats,
                    recent_activity: recentActivity[0]
                }
            });

        } catch (error) {
            console.error('Error obteniendo estadísticas de usuarios:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Exportar usuarios a CSV
    async exportUsers(req, res) {
        try {
            const { role, status } = req.query;

            let whereConditions = [];
            let queryParams = [];

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

            const users = await query(`
                SELECT 
                    u.id, u.name, u.email, u.dni, u.phone, u.status,
                    u.last_login, u.created_at,
                    r.name as role_name, r.type as role_type
                FROM users u
                LEFT JOIN roles r ON u.role = r.id
                ${whereClause}
                ORDER BY u.name ASC
            `, queryParams);

            // Preparar datos para CSV
            const csvData = users.map(user => ({
                ID: user.id,
                Nombre: user.name,
                Email: user.email,
                DNI: user.dni || '',
                Teléfono: user.phone || '',
                Rol: user.role_name || user.role,
                'Tipo de Rol': user.role_type || '',
                Estado: user.status === 'active' ? 'Activo' : 'Inactivo',
                'Último Login': user.last_login ? new Date(user.last_login).toLocaleString('es-PE') : 'Nunca',
                'Fecha Creación': new Date(user.created_at).toLocaleString('es-PE')
            }));

            const fields = ['ID', 'Nombre', 'Email', 'DNI', 'Teléfono', 'Rol', 'Tipo de Rol', 'Estado', 'Último Login', 'Fecha Creación'];
            const parser = new Parser({ fields });
            const csv = parser.parse(csvData);

            res.header('Content-Type', 'text/csv; charset=utf-8');
            res.header('Content-Disposition', `attachment; filename="usuarios-sistema-${new Date().toISOString().split('T')[0]}.csv"`);
            res.send('\ufeff' + csv); // BOM para Excel en español

        } catch (error) {
            console.error('Error exportando usuarios:', error);
            res.status(500).json({
                success: false,
                message: 'Error exportando usuarios',
                error: error.message
            });
        }
    }

    // Obtener roles disponibles para formularios
    async getAvailableRoles(req, res) {
        try {
            const roles = await query(`
                SELECT id, name, type, description
                FROM roles
                ORDER BY type DESC, name ASC
            `);

            res.json({
                success: true,
                data: roles
            });

        } catch (error) {
            console.error('Error obteniendo roles:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Resetear contraseña de usuario
    async resetUserPassword(req, res) {
        try {
            const { id } = req.params;
            const { new_password } = req.body;

            // Generar contraseña aleatoria si no se proporciona
            const password = new_password || Math.random().toString(36).slice(-8);
            const hashedPassword = await bcrypt.hash(password, 10);

            const result = await query(`
                UPDATE users 
                SET password = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [hashedPassword, id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }

            res.json({
                success: true,
                message: 'Contraseña reseteada exitosamente',
                data: {
                    new_password: new_password ? null : password
                }
            });

        } catch (error) {
            console.error('Error reseteando contraseña:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }
}

module.exports = new SystemUsersController();