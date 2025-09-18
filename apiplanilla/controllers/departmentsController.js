// controllers/departmentsController.js
const { query } = require('../config/database');

class DepartmentsController {

    // Obtener todos los departamentos
    async getDepartments(req, res) {
        try {
            const { status = 'all' } = req.query;

            let whereClause = '';
            let queryParams = [];

            if (status && status !== 'all') {
                whereClause = 'WHERE a.estado = ?';
                queryParams.push(status === 'active' ? 'activo' : 'inactivo');
            }

            const departments = await query(`
                SELECT 
                    a.id,
                    a.nombre as name,
                    a.descripcion as description,
                    a.estado,
                    a.created_at,
                    a.updated_at,
                    COUNT(DISTINCT t.id) as worker_count,
                    COUNT(DISTINCT c.id) as position_count,
                    -- Obtener un responsable (trabajador con mayor sueldo del área)
                    (SELECT CONCAT(t2.nombres, ' ', t2.apellido_paterno, ' ', t2.apellido_materno)
                     FROM trabajadores t2 
                     WHERE t2.area_id = a.id AND t2.estado = 'activo'
                     ORDER BY t2.sueldo_basico DESC 
                     LIMIT 1) as manager
                FROM areas a
                LEFT JOIN trabajadores t ON a.id = t.area_id AND t.estado = 'activo'
                LEFT JOIN cargos c ON a.id = c.area_id AND c.estado = 'activo'
                ${whereClause}
                GROUP BY a.id, a.nombre, a.descripcion, a.estado, a.created_at, a.updated_at
                ORDER BY a.nombre ASC
            `, queryParams);

            // Transformar datos para compatibilidad con frontend
            const transformedDepartments = departments.map(dept => ({
                id: dept.id,
                name: dept.name,
                description: dept.description || '',
                manager: dept.manager || 'Sin asignar',
                active: dept.estado === 'activo',
                worker_count: parseInt(dept.worker_count) || 0,
                position_count: parseInt(dept.position_count) || 0,
                created_at: dept.created_at,
                updated_at: dept.updated_at
            }));

            res.json({
                success: true,
                data: transformedDepartments
            });

        } catch (error) {
            console.error('Error obteniendo departamentos:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Obtener departamento por ID
    async getDepartmentById(req, res) {
        try {
            const { id } = req.params;

            const department = await query(`
                SELECT 
                    a.id,
                    a.nombre as name,
                    a.descripcion as description,
                    a.estado,
                    a.created_at,
                    a.updated_at,
                    COUNT(DISTINCT t.id) as worker_count,
                    COUNT(DISTINCT c.id) as position_count,
                    (SELECT CONCAT(t2.nombres, ' ', t2.apellido_paterno, ' ', t2.apellido_materno)
                     FROM trabajadores t2 
                     WHERE t2.area_id = a.id AND t2.estado = 'activo'
                     ORDER BY t2.sueldo_basico DESC 
                     LIMIT 1) as manager
                FROM areas a
                LEFT JOIN trabajadores t ON a.id = t.area_id AND t.estado = 'activo'
                LEFT JOIN cargos c ON a.id = c.area_id AND c.estado = 'activo'
                WHERE a.id = ?
                GROUP BY a.id, a.nombre, a.descripcion, a.estado, a.created_at, a.updated_at
            `, [id]);

            if (department.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Departamento no encontrado'
                });
            }

            const dept = department[0];
            const transformedDepartment = {
                id: dept.id,
                name: dept.name,
                description: dept.description || '',
                manager: dept.manager || 'Sin asignar',
                active: dept.estado === 'activo',
                worker_count: parseInt(dept.worker_count) || 0,
                position_count: parseInt(dept.position_count) || 0,
                created_at: dept.created_at,
                updated_at: dept.updated_at
            };

            res.json({
                success: true,
                data: transformedDepartment
            });

        } catch (error) {
            console.error('Error obteniendo departamento:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Crear nuevo departamento
    async createDepartment(req, res) {
        try {
            const { name, description, manager, active = true } = req.body;

            // Verificar si ya existe un departamento con ese nombre
            const existing = await query('SELECT id FROM areas WHERE nombre = ?', [name]);
            if (existing.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe un departamento con ese nombre'
                });
            }

            const estado = active ? 'activo' : 'inactivo';

            const result = await query(`
                INSERT INTO areas (nombre, descripcion, estado)
                VALUES (?, ?, ?)
            `, [name, description || null, estado]);

            res.status(201).json({
                success: true,
                message: 'Departamento creado exitosamente',
                data: {
                    id: result.insertId,
                    name,
                    description: description || '',
                    manager: manager || 'Sin asignar',
                    active,
                    worker_count: 0,
                    position_count: 0
                }
            });

        } catch (error) {
            console.error('Error creando departamento:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Actualizar departamento
    async updateDepartment(req, res) {
        try {
            const { id } = req.params;
            const { name, description, manager, active } = req.body;

            // Verificar que el departamento existe
            const existing = await query('SELECT id, nombre FROM areas WHERE id = ?', [id]);
            if (existing.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Departamento no encontrado'
                });
            }

            // Verificar nombre único (si se está cambiando)
            if (name && name !== existing[0].nombre) {
                const nameExists = await query('SELECT id FROM areas WHERE nombre = ? AND id != ?', [name, id]);
                if (nameExists.length > 0) {
                    return res.status(409).json({
                        success: false,
                        message: 'Ya existe otro departamento con ese nombre'
                    });
                }
            }

            // Construir query de actualización dinámicamente
            const updateFields = [];
            const updateValues = [];

            if (name !== undefined) {
                updateFields.push('nombre = ?');
                updateValues.push(name);
            }

            if (description !== undefined) {
                updateFields.push('descripcion = ?');
                updateValues.push(description || null);
            }

            if (active !== undefined) {
                updateFields.push('estado = ?');
                updateValues.push(active ? 'activo' : 'inactivo');
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
                UPDATE areas 
                SET ${updateFields.join(', ')}
                WHERE id = ?
            `, updateValues);

            res.json({
                success: true,
                message: 'Departamento actualizado exitosamente'
            });

        } catch (error) {
            console.error('Error actualizando departamento:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Cambiar estado del departamento
    async toggleDepartmentStatus(req, res) {
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
                UPDATE areas 
                SET estado = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [active ? 'activo' : 'inactivo', id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Departamento no encontrado'
                });
            }

            res.json({
                success: true,
                message: `Departamento ${active ? 'activado' : 'desactivado'} exitosamente`
            });

        } catch (error) {
            console.error('Error cambiando estado del departamento:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Eliminar departamento
    async deleteDepartment(req, res) {
        try {
            const { id } = req.params;

            // Verificar si el departamento tiene trabajadores asignados
            const workers = await query('SELECT COUNT(*) as count FROM trabajadores WHERE area_id = ?', [id]);
            if (workers[0].count > 0) {
                return res.status(409).json({
                    success: false,
                    message: `No se puede eliminar el departamento porque tiene ${workers[0].count} trabajador(es) asignado(s)`
                });
            }

            // Verificar si el departamento tiene cargos asignados
            const positions = await query('SELECT COUNT(*) as count FROM cargos WHERE area_id = ?', [id]);
            if (positions[0].count > 0) {
                return res.status(409).json({
                    success: false,
                    message: `No se puede eliminar el departamento porque tiene ${positions[0].count} cargo(s) asignado(s)`
                });
            }

            const result = await query('DELETE FROM areas WHERE id = ?', [id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Departamento no encontrado'
                });
            }

            res.json({
                success: true,
                message: 'Departamento eliminado exitosamente'
            });

        } catch (error) {
            console.error('Error eliminando departamento:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Obtener estadísticas de departamentos
    async getDepartmentStatistics(req, res) {
        try {
            // Estadísticas generales
            const generalStats = await query(`
                SELECT 
                    COUNT(*) as total_departments,
                    SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as active_departments,
                    SUM(CASE WHEN estado = 'inactivo' THEN 1 ELSE 0 END) as inactive_departments
                FROM areas
            `);

            // Estadísticas detalladas por departamento
            const departmentDetails = await query(`
                SELECT 
                    a.id,
                    a.nombre as department_name,
                    a.estado as status,
                    COUNT(DISTINCT t.id) as worker_count,
                    COUNT(DISTINCT c.id) as position_count,
                    COALESCE(AVG(t.sueldo_basico), 0) as avg_salary,
                    COALESCE(MIN(t.sueldo_basico), 0) as min_salary,
                    COALESCE(MAX(t.sueldo_basico), 0) as max_salary
                FROM areas a
                LEFT JOIN trabajadores t ON a.id = t.area_id AND t.estado = 'activo'
                LEFT JOIN cargos c ON a.id = c.area_id AND c.estado = 'activo'
                GROUP BY a.id, a.nombre, a.estado
                ORDER BY worker_count DESC, a.nombre ASC
            `);

            // Distribución de trabajadores por departamento
            const workerDistribution = await query(`
                SELECT 
                    a.nombre as department_name,
                    COUNT(t.id) as worker_count,
                    ROUND((COUNT(t.id) * 100.0 / (SELECT COUNT(*) FROM trabajadores WHERE estado = 'activo')), 2) as percentage
                FROM areas a
                LEFT JOIN trabajadores t ON a.id = t.area_id AND t.estado = 'activo'
                WHERE a.estado = 'activo'
                GROUP BY a.id, a.nombre
                ORDER BY worker_count DESC
            `);

            res.json({
                success: true,
                data: {
                    summary: generalStats[0],
                    departments: departmentDetails.map(dept => ({
                        ...dept,
                        avg_salary: parseFloat(dept.avg_salary).toFixed(2),
                        min_salary: parseFloat(dept.min_salary).toFixed(2),
                        max_salary: parseFloat(dept.max_salary).toFixed(2)
                    })),
                    worker_distribution: workerDistribution
                }
            });

        } catch (error) {
            console.error('Error obteniendo estadísticas de departamentos:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Obtener trabajadores de un departamento específico
    async getDepartmentWorkers(req, res) {
        try {
            const { id } = req.params;
            const { status = 'active' } = req.query;

            let whereClause = 'WHERE t.area_id = ?';
            let queryParams = [id];

            if (status !== 'all') {
                whereClause += ' AND t.estado = ?';
                queryParams.push(status === 'active' ? 'activo' : 'inactivo');
            }

            const workers = await query(`
                SELECT 
                    t.id,
                    t.dni,
                    CONCAT(t.nombres, ' ', t.apellido_paterno, ' ', t.apellido_materno) as full_name,
                    t.nombres,
                    t.apellido_paterno,
                    t.apellido_materno,
                    t.fecha_ingreso,
                    t.sueldo_basico,
                    t.estado,
                    t.correo_electronico,
                    t.telefono_principal,
                    c.nombre as position_name,
                    a.nombre as department_name
                FROM trabajadores t
                LEFT JOIN cargos c ON t.cargo_id = c.id
                LEFT JOIN areas a ON t.area_id = a.id
                ${whereClause}
                ORDER BY t.apellido_paterno, t.apellido_materno, t.nombres
            `, queryParams);

            res.json({
                success: true,
                data: workers
            });

        } catch (error) {
            console.error('Error obteniendo trabajadores del departamento:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Obtener cargos de un departamento específico
    async getDepartmentPositions(req, res) {
        try {
            const { id } = req.params;
            const { status = 'active' } = req.query;

            let whereClause = 'WHERE c.area_id = ?';
            let queryParams = [id];

            if (status !== 'all') {
                whereClause += ' AND c.estado = ?';
                queryParams.push(status === 'active' ? 'activo' : 'inactivo');
            }

            const positions = await query(`
                SELECT 
                    c.id,
                    c.nombre as position_name,
                    c.descripcion as position_description,
                    c.estado,
                    c.created_at,
                    c.updated_at,
                    COUNT(t.id) as worker_count,
                    a.nombre as department_name
                FROM cargos c
                LEFT JOIN areas a ON c.area_id = a.id
                LEFT JOIN trabajadores t ON c.id = t.cargo_id AND t.estado = 'activo'
                ${whereClause}
                GROUP BY c.id, c.nombre, c.descripcion, c.estado, c.created_at, c.updated_at, a.nombre
                ORDER BY c.nombre
            `, queryParams);

            res.json({
                success: true,
                data: positions
            });

        } catch (error) {
            console.error('Error obteniendo cargos del departamento:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }
}

module.exports = new DepartmentsController();