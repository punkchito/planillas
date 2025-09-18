// controllers/usersController.js - VERSIÓN COMPLETAMENTE LIMPIA SIN AUDITORÍA
const { query } = require('../config/database');
const { Parser } = require('json2csv');
const bcrypt = require('bcryptjs');

class UsersController {

    // Obtener lista de usuarios con filtros
    async getUsers(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                role,
                status,
                search,
                sortBy = 'name',
                sortOrder = 'ASC'
            } = req.query;

            const offset = (page - 1) * limit;
            let whereConditions = [];
            let queryParams = [];

            // Validar y sanitizar sortBy para evitar inyección SQL
            const allowedSortFields = ['name', 'email', 'role', 'status', 'created_at', 'last_login'];
            const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'name';
            const safeSortOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

            // Validar limit y offset
            const safeLimit = parseInt(limit) > 0 ? parseInt(limit) : 10;
            const safeOffset = parseInt(offset) >= 0 ? parseInt(offset) : 0;

            // Construir filtros dinámicos
            if (role && role !== '' && role !== 'undefined') {
                whereConditions.push('u.role = ?');
                queryParams.push(role);
            }

            if (status && status !== '' && status !== 'undefined') {
                whereConditions.push('u.status = ?');
                queryParams.push(status);
            }

            if (search && search.trim() !== '' && search.trim() !== 'undefined') {
                whereConditions.push('(u.name LIKE ? OR u.email LIKE ? OR COALESCE(u.dni, "") LIKE ?)');
                const searchTerm = `%${search.trim()}%`;
                queryParams.push(searchTerm, searchTerm, searchTerm);
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            // Query principal con joins - usando interpolación para LIMIT y OFFSET
            const usersQuery = `
                SELECT 
                    u.id,
                    u.name,
                    u.email,
                    COALESCE(u.dni, '') as dni,
                    COALESCE(u.phone, '') as phone,
                    u.status,
                    u.role,
                    u.last_login,
                    u.created_at,
                    COALESCE(u.avatar, '') as avatar,
                    COALESCE(r.name, u.role) as role_name,
                    COALESCE(r.type, 'user') as role_type,
                    COALESCE(creator.name, '') as created_by_name
                FROM users u
                LEFT JOIN roles r ON u.role = r.id
                LEFT JOIN users creator ON u.created_by = creator.id
                ${whereClause}
                ORDER BY u.${safeSortBy} ${safeSortOrder}
                LIMIT ${safeLimit} OFFSET ${safeOffset}
            `;

            console.log('Users Query:', usersQuery);
            console.log('Params:', queryParams);

            // No agregamos limit y offset a queryParams ya que están interpolados
            const users = await query(usersQuery, queryParams);

            // Query para contar total de registros
            const countQuery = `
                SELECT COUNT(*) as total
                FROM users u
                LEFT JOIN roles r ON u.role = r.id
                ${whereClause}
            `;

            const countResult = await query(countQuery, queryParams);
            const total = countResult[0].total;

            res.json({
                success: true,
                data: {
                    users,
                    pagination: {
                        current_page: parseInt(page),
                        per_page: safeLimit,
                        total,
                        total_pages: Math.ceil(total / safeLimit),
                        has_next_page: page * safeLimit < total,
                        has_prev_page: page > 1
                    }
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

    // Obtener estadísticas de usuarios
    async getEstadisticas(req, res) {
        try {
            const stats = await query(`
                SELECT 
                    COUNT(*) as total_usuarios,
                    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as usuarios_activos,
                    SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as usuarios_inactivos,
                    COUNT(DISTINCT role) as total_roles,
                    SUM(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as activos_ultima_semana,
                    SUM(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as activos_ultimo_mes
                FROM users
            `);

            // Estadísticas por rol
            const roleStats = await query(`
                SELECT 
                    COALESCE(r.name, 'Sin Rol') as role_name,
                    COALESCE(r.type, 'user') as role_type,
                    COUNT(u.id) as user_count
                FROM users u
                LEFT JOIN roles r ON u.role = r.id
                GROUP BY r.id, r.name, r.type
                ORDER BY user_count DESC
            `);

            res.json({
                success: true,
                data: {
                    general: stats[0],
                    by_role: roleStats
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

    // Obtener usuario por ID
    async getUserById(req, res) {
        try {
            const { id } = req.params;

            const user = await query(`
                SELECT 
                    u.*,
                    r.name as role_name,
                    r.type as role_type,
                    r.description as role_description,
                    creator.name as created_by_name
                FROM users u
                LEFT JOIN roles r ON u.role = r.id
                LEFT JOIN users creator ON u.created_by = creator.id
                WHERE u.id = ?
            `, [id]);

            if (user.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }

            res.json({
                success: true,
                data: {
                    user: user[0],
                    permissions: [],
                    recent_logs: []
                }
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
            const {
                name,
                email,
                password = 'temp123',
                role,
                dni,
                phone,
                status = 'active'
            } = req.body;

            // Verificar si ya existe usuario con ese email
            const existingUser = await query('SELECT id FROM users WHERE email = ?', [email]);
            if (existingUser.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe un usuario con ese email'
                });
            }

            // Verificar si ya existe usuario con ese DNI (si se proporciona)
            if (dni) {
                const existingDni = await query('SELECT id FROM users WHERE dni = ?', [dni]);
                if (existingDni.length > 0) {
                    return res.status(409).json({
                        success: false,
                        message: 'Ya existe un usuario con ese DNI'
                    });
                }
            }

            // Verificar que el rol existe
            const roleExists = await query('SELECT id FROM roles WHERE id = ?', [role]);
            if (roleExists.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El rol especificado no existe'
                });
            }

            // Encriptar contraseña
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insertar usuario
            const result = await query(`
                INSERT INTO users (name, email, password, role, dni, phone, status, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [name, email, hashedPassword, role, dni, phone, status, req.user?.id || null]);

            res.status(201).json({
                success: true,
                message: 'Usuario creado exitosamente',
                data: {
                    id: result.insertId,
                    name,
                    email,
                    role
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
            const updateData = req.body;

            // Verificar si el usuario existe
            const existingUser = await query('SELECT * FROM users WHERE id = ?', [id]);
            if (existingUser.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }

            const oldUser = existingUser[0];

            // Si se actualiza el email, verificar que no exista otro usuario con ese email
            if (updateData.email && updateData.email !== oldUser.email) {
                const emailExists = await query('SELECT id FROM users WHERE email = ? AND id != ?', [updateData.email, id]);
                if (emailExists.length > 0) {
                    return res.status(409).json({
                        success: false,
                        message: 'Ya existe otro usuario con ese email'
                    });
                }
            }

            // Si se actualiza el DNI, verificar que no exista otro usuario con ese DNI
            if (updateData.dni && updateData.dni !== oldUser.dni) {
                const dniExists = await query('SELECT id FROM users WHERE dni = ? AND id != ?', [updateData.dni, id]);
                if (dniExists.length > 0) {
                    return res.status(409).json({
                        success: false,
                        message: 'Ya existe otro usuario con ese DNI'
                    });
                }
            }

            // Si se actualiza el rol, verificar que exista
            if (updateData.role && updateData.role !== oldUser.role) {
                const roleExists = await query('SELECT id FROM roles WHERE id = ?', [updateData.role]);
                if (roleExists.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'El rol especificado no existe'
                    });
                }
            }

            // Si se actualiza la contraseña, encriptarla
            if (updateData.password) {
                updateData.password = await bcrypt.hash(updateData.password, 10);
            }

            // Construir query de actualización dinámicamente
            const updateFields = [];
            const updateValues = [];

            for (const [key, value] of Object.entries(updateData)) {
                if (value !== undefined && value !== null && key !== 'id') {
                    updateFields.push(`${key} = ?`);
                    updateValues.push(value);
                }
            }

            if (updateFields.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No se proporcionaron campos para actualizar'
                });
            }

            updateValues.push(id);

            await query(`
                UPDATE users 
                SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
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
    async cambiarEstado(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!['active', 'inactive'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Estado inválido. Debe ser "active" o "inactive"'
                });
            }

            const result = await query(`
                UPDATE users 
                SET status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [status, id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }

            res.json({
                success: true,
                message: `Usuario ${status === 'active' ? 'activado' : 'desactivado'} exitosamente`
            });

        } catch (error) {
            console.error('Error cambiando estado:', error);
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

            // Obtener info del usuario antes de eliminarlo
            const user = await query('SELECT name FROM users WHERE id = ?', [id]);
            if (user.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }

            // Verificar que no sea el último administrador
            const adminCount = await query('SELECT COUNT(*) as count FROM users WHERE role = "super-admin" AND status = "active"');
            const isLastAdmin = await query('SELECT role FROM users WHERE id = ?', [id]);

            if (isLastAdmin[0]?.role === 'super-admin' && adminCount[0].count <= 1) {
                return res.status(400).json({
                    success: false,
                    message: 'No se puede eliminar el último super administrador del sistema'
                });
            }

            const result = await query('DELETE FROM users WHERE id = ?', [id]);

            res.json({
                success: true,
                message: 'Usuario eliminado exitosamente'
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

    // Exportar usuarios a CSV
    async exportarCSV(req, res) {
        try {
            const usuarios = await query(`
                SELECT 
                    u.id,
                    u.name as nombre,
                    u.email,
                    u.dni,
                    u.phone as telefono,
                    u.status as estado,
                    r.name as rol,
                    u.last_login as ultimo_acceso,
                    u.created_at as fecha_creacion
                FROM users u
                LEFT JOIN roles r ON u.role = r.id
                ORDER BY u.name
            `);

            const fields = [
                'id', 'nombre', 'email', 'dni', 'telefono',
                'estado', 'rol', 'ultimo_acceso', 'fecha_creacion'
            ];

            const opts = { fields };
            const parser = new Parser(opts);
            const csv = parser.parse(usuarios);

            res.header('Content-Type', 'text/csv');
            res.attachment(`usuarios_${new Date().toISOString().split('T')[0]}.csv`);
            res.send(csv);

        } catch (error) {
            console.error('Error exportando CSV:', error);
            res.status(500).json({
                success: false,
                message: 'Error exportando datos',
                error: error.message
            });
        }
    }

    // Importar usuarios desde CSV
    async importarCSV(req, res) {
        try {
            const csvData = req.body.csvData;
            if (!csvData || !Array.isArray(csvData)) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos CSV inválidos'
                });
            }

            let importedCount = 0;
            let errorCount = 0;
            const errors = [];

            for (let i = 0; i < csvData.length; i++) {
                const row = csvData[i];

                try {
                    // Validar campos requeridos
                    if (!row.nombre || !row.email || !row.rol) {
                        errors.push(`Fila ${i + 2}: Faltan campos requeridos (nombre, email, rol)`);
                        errorCount++;
                        continue;
                    }

                    // Verificar que el rol existe
                    const roleExists = await query('SELECT id FROM roles WHERE name = ? OR id = ?', [row.rol, row.rol]);
                    if (roleExists.length === 0) {
                        errors.push(`Fila ${i + 2}: El rol "${row.rol}" no existe`);
                        errorCount++;
                        continue;
                    }

                    // Verificar email duplicado
                    const emailExists = await query('SELECT id FROM users WHERE email = ?', [row.email]);
                    if (emailExists.length > 0) {
                        errors.push(`Fila ${i + 2}: El email "${row.email}" ya existe`);
                        errorCount++;
                        continue;
                    }

                    // Verificar DNI duplicado si se proporciona
                    if (row.dni) {
                        const dniExists = await query('SELECT id FROM users WHERE dni = ?', [row.dni]);
                        if (dniExists.length > 0) {
                            errors.push(`Fila ${i + 2}: El DNI "${row.dni}" ya existe`);
                            errorCount++;
                            continue;
                        }
                    }

                    // Encriptar contraseña por defecto
                    const defaultPassword = await bcrypt.hash('imported123', 10);

                    // Insertar usuario
                    const result = await query(`
                        INSERT INTO users (name, email, password, role, dni, phone, status, created_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        row.nombre,
                        row.email,
                        defaultPassword,
                        roleExists[0].id,
                        row.dni || null,
                        row.telefono || null,
                        row.estado === 'inactive' ? 'inactive' : 'active',
                        req.user?.id || null
                    ]);

                    importedCount++;

                } catch (error) {
                    errors.push(`Fila ${i + 2}: Error procesando datos - ${error.message}`);
                    errorCount++;
                }
            }

            res.json({
                success: true,
                message: `Proceso de importación completado`,
                data: {
                    imported: importedCount,
                    errors: errorCount,
                    error_details: errors.slice(0, 10) // Solo los primeros 10 errores
                }
            });

        } catch (error) {
            console.error('Error importando CSV:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Obtener logs de auditoría - versión simplificada sin funcionalidad real
    async getAuditLogs(req, res) {
        try {
            res.json({
                success: true,
                data: {
                    logs: [],
                    pagination: {
                        current_page: 1,
                        per_page: 50,
                        total: 0,
                        total_pages: 0
                    }
                },
                message: 'Los logs de auditoría no están configurados actualmente'
            });

        } catch (error) {
            console.error('Error obteniendo logs de auditoría:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }
}

module.exports = new UsersController();