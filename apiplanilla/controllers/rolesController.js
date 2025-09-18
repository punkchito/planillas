// controllers/rolesController.js
const { query } = require('../config/database');

class RolesController {

    // Obtener lista de roles
    async getRoles(req, res) {
        try {
            const roles = await query(`
                SELECT 
                    r.*,
                    COUNT(u.id) as user_count,
                    COUNT(rp.permission_id) as permissions_count
                FROM roles r
                LEFT JOIN users u ON r.id = u.role
                LEFT JOIN role_permissions rp ON r.id = rp.role_id
                GROUP BY r.id
                ORDER BY r.name
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

    // Obtener rol por ID
    async getRoleById(req, res) {
        try {
            const { id } = req.params;

            const role = await query('SELECT * FROM roles WHERE id = ?', [id]);
            
            if (role.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Rol no encontrado'
                });
            }

            // Obtener permisos del rol
            const permissions = await query(`
                SELECT p.*
                FROM role_permissions rp
                JOIN permissions p ON rp.permission_id = p.id
                WHERE rp.role_id = ?
                ORDER BY p.group_name, p.name
            `, [id]);

            // Obtener usuarios con este rol
            const users = await query(`
                SELECT id, name, email, status
                FROM users 
                WHERE role = ?
                ORDER BY name
            `, [id]);

            res.json({
                success: true,
                data: {
                    role: role[0],
                    permissions,
                    users
                }
            });

        } catch (error) {
            console.error('Error obteniendo rol:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Crear nuevo rol
    async createRole(req, res) {
        try {
            const { name, type, description, permissions = [] } = req.body;

            // Generar ID del rol
            const roleId = name.toLowerCase()
                               .replace(/\s+/g, '-')
                               .replace(/[^a-z0-9-]/g, '');

            // Verificar si ya existe un rol con ese ID o nombre
            const existingRole = await query('SELECT id FROM roles WHERE id = ? OR name = ?', [roleId, name]);
            if (existingRole.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe un rol con ese nombre'
                });
            }

            // Insertar rol
            await query(`
                INSERT INTO roles (id, name, type, description)
                VALUES (?, ?, ?, ?)
            `, [roleId, name, type, description]);

            // Asignar permisos si se proporcionan
            if (permissions.length > 0) {
                // Verificar que todos los permisos existan
                const permissionList = permissions.map(() => '?').join(',');
                const existingPermissions = await query(`
                    SELECT id FROM permissions WHERE id IN (${permissionList})
                `, permissions);

                if (existingPermissions.length !== permissions.length) {
                    return res.status(400).json({
                        success: false,
                        message: 'Algunos permisos especificados no existen'
                    });
                }

                // Insertar permisos del rol
                const permissionValues = permissions.map(permId => [roleId, permId, req.user?.id || null]);
                const insertPermissions = permissionValues.map(() => '(?, ?, ?)').join(',');
                
                await query(`
                    INSERT INTO role_permissions (role_id, permission_id, granted_by)
                    VALUES ${insertPermissions}
                `, permissionValues.flat());
            }

            res.status(201).json({
                success: true,
                message: 'Rol creado exitosamente',
                data: {
                    id: roleId,
                    name,
                    permissions_assigned: permissions.length
                }
            });

        } catch (error) {
            console.error('Error creando rol:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Actualizar rol
    async updateRole(req, res) {
        try {
            const { id } = req.params;
            const { name, type, description } = req.body;

            // Verificar si el rol existe
            const existingRole = await query('SELECT * FROM roles WHERE id = ?', [id]);
            if (existingRole.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Rol no encontrado'
                });
            }

            // Si se actualiza el nombre, verificar que no exista otro rol con ese nombre
            if (name && name !== existingRole[0].name) {
                const nameExists = await query('SELECT id FROM roles WHERE name = ? AND id != ?', [name, id]);
                if (nameExists.length > 0) {
                    return res.status(409).json({
                        success: false,
                        message: 'Ya existe otro rol con ese nombre'
                    });
                }
            }

            // Construir query de actualización
            const updateFields = [];
            const updateValues = [];

            if (name !== undefined) {
                updateFields.push('name = ?');
                updateValues.push(name);
            }
            if (type !== undefined) {
                updateFields.push('type = ?');
                updateValues.push(type);
            }
            if (description !== undefined) {
                updateFields.push('description = ?');
                updateValues.push(description);
            }

            if (updateFields.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No se proporcionaron campos para actualizar'
                });
            }

            updateValues.push(id);

            await query(`
                UPDATE roles 
                SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, updateValues);

            res.json({
                success: true,
                message: 'Rol actualizado exitosamente'
            });

        } catch (error) {
            console.error('Error actualizando rol:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Eliminar rol
    async deleteRole(req, res) {
        try {
            const { id } = req.params;

            // Verificar que el rol exista
            const role = await query('SELECT name FROM roles WHERE id = ?', [id]);
            if (role.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Rol no encontrado'
                });
            }

            // Verificar que no haya usuarios con este rol
            const usersWithRole = await query('SELECT COUNT(*) as count FROM users WHERE role = ?', [id]);
            if (usersWithRole[0].count > 0) {
                return res.status(400).json({
                    success: false,
                    message: `No se puede eliminar el rol. Hay ${usersWithRole[0].count} usuario(s) asignado(s) a este rol.`
                });
            }

            // Eliminar rol (los permisos se eliminan automáticamente por CASCADE)
            await query('DELETE FROM roles WHERE id = ?', [id]);

            res.json({
                success: true,
                message: 'Rol eliminado exitosamente'
            });

        } catch (error) {
            console.error('Error eliminando rol:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Obtener todos los permisos disponibles
    async getPermissions(req, res) {
        try {
            const permissions = await query(`
                SELECT *
                FROM permissions
                ORDER BY group_name, name
            `);

            // Agrupar permisos por grupo
            const groupedPermissions = {};
            permissions.forEach(permission => {
                if (!groupedPermissions[permission.group_id]) {
                    groupedPermissions[permission.group_id] = {
                        id: permission.group_id,
                        name: permission.group_name,
                        permissions: []
                    };
                }
                groupedPermissions[permission.group_id].permissions.push({
                    id: permission.id,
                    name: permission.name,
                    description: permission.description
                });
            });

            res.json({
                success: true,
                data: Object.values(groupedPermissions)
            });

        } catch (error) {
            console.error('Error obteniendo permisos:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Obtener permisos de un rol específico
    async getRolePermissions(req, res) {
        try {
            const { id } = req.params;

            // Verificar que el rol exista
            const role = await query('SELECT * FROM roles WHERE id = ?', [id]);
            if (role.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Rol no encontrado'
                });
            }

            // Obtener todos los permisos con indicador si el rol los tiene
            const permissions = await query(`
                SELECT 
                    p.*,
                    CASE WHEN rp.permission_id IS NOT NULL THEN true ELSE false END as has_permission
                FROM permissions p
                LEFT JOIN role_permissions rp ON p.id = rp.permission_id AND rp.role_id = ?
                ORDER BY p.group_name, p.name
            `, [id]);

            // Agrupar permisos
            const groupedPermissions = {};
            permissions.forEach(permission => {
                if (!groupedPermissions[permission.group_id]) {
                    groupedPermissions[permission.group_id] = {
                        id: permission.group_id,
                        name: permission.group_name,
                        permissions: []
                    };
                }
                groupedPermissions[permission.group_id].permissions.push({
                    id: permission.id,
                    name: permission.name,
                    description: permission.description,
                    has_permission: permission.has_permission
                });
            });

            res.json({
                success: true,
                data: {
                    role: role[0],
                    permission_groups: Object.values(groupedPermissions)
                }
            });

        } catch (error) {
            console.error('Error obteniendo permisos del rol:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Actualizar permisos de un rol
    async updateRolePermissions(req, res) {
        try {
            const { id } = req.params;
            const { permissions } = req.body;

            if (!Array.isArray(permissions)) {
                return res.status(400).json({
                    success: false,
                    message: 'Los permisos deben ser un array'
                });
            }

            // Verificar que el rol exista
            const role = await query('SELECT id FROM roles WHERE id = ?', [id]);
            if (role.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Rol no encontrado'
                });
            }

            // Verificar que todos los permisos existan
            if (permissions.length > 0) {
                const permissionList = permissions.map(() => '?').join(',');
                const existingPermissions = await query(`
                    SELECT id FROM permissions WHERE id IN (${permissionList})
                `, permissions);

                if (existingPermissions.length !== permissions.length) {
                    return res.status(400).json({
                        success: false,
                        message: 'Algunos permisos especificados no existen'
                    });
                }
            }

            // Eliminar todos los permisos actuales del rol
            await query('DELETE FROM role_permissions WHERE role_id = ?', [id]);

            // Insertar nuevos permisos
            if (permissions.length > 0) {
                const values = permissions.map(permId => [id, permId, req.user?.id || null]);
                const placeholders = values.map(() => '(?, ?, ?)').join(',');
                
                await query(`
                    INSERT INTO role_permissions (role_id, permission_id, granted_by)
                    VALUES ${placeholders}
                `, values.flat());
            }

            res.json({
                success: true,
                message: 'Permisos del rol actualizados exitosamente',
                data: {
                    role_id: id,
                    permissions_count: permissions.length
                }
            });

        } catch (error) {
            console.error('Error actualizando permisos del rol:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Clonar rol
    async cloneRole(req, res) {
        try {
            const { id } = req.params;
            const { newName, newDescription } = req.body;

            if (!newName) {
                return res.status(400).json({
                    success: false,
                    message: 'El nombre del nuevo rol es requerido'
                });
            }

            // Verificar que el rol origen exista
            const sourceRole = await query('SELECT * FROM roles WHERE id = ?', [id]);
            if (sourceRole.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Rol origen no encontrado'
                });
            }

            // Generar ID para el nuevo rol
            const newRoleId = newName.toLowerCase()
                                    .replace(/\s+/g, '-')
                                    .replace(/[^a-z0-9-]/g, '');

            // Verificar que no exista rol con ese nombre o ID
            const existingRole = await query('SELECT id FROM roles WHERE id = ? OR name = ?', [newRoleId, newName]);
            if (existingRole.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe un rol con ese nombre'
                });
            }

            // Crear nuevo rol
            await query(`
                INSERT INTO roles (id, name, type, description)
                VALUES (?, ?, ?, ?)
            `, [newRoleId, newName, sourceRole[0].type, newDescription || `Copia de ${sourceRole[0].name}`]);

            // Copiar permisos del rol origen
            await query(`
                INSERT INTO role_permissions (role_id, permission_id, granted_by)
                SELECT ?, permission_id, ?
                FROM role_permissions
                WHERE role_id = ?
            `, [newRoleId, req.user?.id || null, id]);

            // Contar permisos copiados
            const copiedPermissions = await query('SELECT COUNT(*) as count FROM role_permissions WHERE role_id = ?', [newRoleId]);

            res.status(201).json({
                success: true,
                message: 'Rol clonado exitosamente',
                data: {
                    original_role: sourceRole[0].name,
                    new_role_id: newRoleId,
                    new_role_name: newName,
                    permissions_copied: copiedPermissions[0].count
                }
            });

        } catch (error) {
            console.error('Error clonando rol:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Obtener estadísticas de roles
    async getEstadisticas(req, res) {
        try {
            const stats = await query(`
                SELECT 
                    COUNT(*) as total_roles,
                    SUM(CASE WHEN type = 'admin' THEN 1 ELSE 0 END) as admin_roles,
                    SUM(CASE WHEN type = 'user' THEN 1 ELSE 0 END) as user_roles,
                    SUM(CASE WHEN type = 'viewer' THEN 1 ELSE 0 END) as viewer_roles
                FROM roles
            `);

            // Estadísticas de uso de roles
            const roleUsage = await query(`
                SELECT 
                    r.name as role_name,
                    r.type as role_type,
                    COUNT(u.id) as user_count,
                    COUNT(rp.permission_id) as permissions_count
                FROM roles r
                LEFT JOIN users u ON r.id = u.role
                LEFT JOIN role_permissions rp ON r.id = rp.role_id
                GROUP BY r.id
                ORDER BY user_count DESC, r.name
            `);

            // Permisos más usados
            const popularPermissions = await query(`
                SELECT 
                    p.name as permission_name,
                    p.group_name,
                    COUNT(rp.role_id) as roles_count
                FROM permissions p
                LEFT JOIN role_permissions rp ON p.id = rp.permission_id
                GROUP BY p.id
                ORDER BY roles_count DESC
                LIMIT 10
            `);

            res.json({
                success: true,
                data: {
                    general: stats[0],
                    role_usage: roleUsage,
                    popular_permissions: popularPermissions
                }
            });

        } catch (error) {
            console.error('Error obteniendo estadísticas de roles:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }
}

module.exports = new RolesController();