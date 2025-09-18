// controllers/trabajadoresController.js
const { query } = require('../config/database');
const { Parser } = require('json2csv');

class TrabajadoresController {

    // Obtener lista de trabajadores con filtros y paginación
    async getTrabajadores(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                cargo,
                estado,
                area,
                search,
                sortBy = 'nombres',
                sortOrder = 'ASC'
            } = req.query;

            const offset = (page - 1) * limit;
            let whereConditions = [];
            let queryParams = [];

            // Validar y sanitizar sortBy para evitar inyección SQL
            const allowedSortFields = ['nombres', 'apellido_paterno', 'fecha_ingreso', 'cargo', 'area', 'estado'];
            const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'nombres';
            const safeSortOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

            // Validar limit y offset
            const safeLimit = parseInt(limit) > 0 ? parseInt(limit) : 10;
            const safeOffset = parseInt(offset) >= 0 ? parseInt(offset) : 0;

            // Construir filtros dinámicos
            if (cargo && cargo !== 'todos') {
                whereConditions.push('t.cargo_id = ?');
                queryParams.push(cargo);
            }

            if (estado && estado !== 'todos') {
                whereConditions.push('t.estado = ?');
                queryParams.push(estado);
            }

            if (area && area !== 'todas') {
                whereConditions.push('t.area_id = ?');
                queryParams.push(area);
            }

            if (search) {
                whereConditions.push('(t.nombres LIKE ? OR t.apellido_paterno LIKE ? OR t.apellido_materno LIKE ? OR t.dni LIKE ? OR t.correo_electronico LIKE ?)');
                const searchTerm = `%${search}%`;
                queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            // Query principal con joins - usando interpolación para LIMIT y OFFSET
            const mainQuery = `
    SELECT 
        t.id,
        t.dni,
        CONCAT(t.nombres, ' ', t.apellido_paterno, ' ', t.apellido_materno) as nombre_completo,
        t.nombres,
        t.apellido_paterno,
        t.apellido_materno,
        t.fecha_ingreso,
        t.sueldo_basico,
        t.tipo_contrato,        -- NUEVO
        t.fecha_fin,           -- NUEVO
        t.telefono_principal,
        t.correo_electronico,
        t.estado,
        c.nombre as cargo,
        a.nombre as area,
        DATEDIFF(CURRENT_DATE, t.fecha_ingreso) as dias_servicio,
        CONCAT(
            FLOOR(DATEDIFF(CURRENT_DATE, t.fecha_ingreso) / 365), ' años ',
            FLOOR((DATEDIFF(CURRENT_DATE, t.fecha_ingreso) % 365) / 30), ' meses'
        ) as tiempo_servicio,
        (SELECT COUNT(*) FROM contratos WHERE trabajador_id = t.id AND estado = 'activo') as tiene_contrato_activo
    FROM trabajadores t
    LEFT JOIN cargos c ON t.cargo_id = c.id
    LEFT JOIN areas a ON t.area_id = a.id
    ${whereClause}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT ${safeLimit} OFFSET ${safeOffset}
`;
            console.log('Query:', mainQuery);
            console.log('Params:', queryParams);

            // No agregamos limit y offset a queryParams ya que están interpolados
            const trabajadores = await query(mainQuery, queryParams);

            // Query para contar total de registros
            const countQuery = `
                SELECT COUNT(*) as total
                FROM trabajadores t
                LEFT JOIN cargos c ON t.cargo_id = c.id
                LEFT JOIN areas a ON t.area_id = a.id
                ${whereClause}
            `;

            const countResult = await query(countQuery, queryParams);
            const total = countResult[0].total;

            res.json({
                success: true,
                data: {
                    trabajadores,
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
            console.error('Error obteniendo trabajadores:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Obtener estadísticas de trabajadores
    async getEstadisticas(req, res) {
        try {
            const stats = await query(`
                SELECT 
                    COUNT(*) as total_trabajadores,
                    SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as trabajadores_activos,
                    SUM(CASE WHEN estado = 'inactivo' THEN 1 ELSE 0 END) as trabajadores_inactivos,
                    (SELECT COUNT(DISTINCT trabajador_id) 
                     FROM contratos 
                     WHERE estado = 'activo') as con_contratos_activos
                FROM trabajadores
            `);

            res.json({
                success: true,
                data: stats[0]
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

    // Obtener un trabajador por ID
    async getTrabajadorById(req, res) {
        try {
            const { id } = req.params;

            const trabajador = await query(`
                SELECT 
                    t.*,
                    c.nombre as cargo_nombre,
                    a.nombre as area_nombre,
                    CONCAT(s.nombres, ' ', s.apellido_paterno, ' ', s.apellido_materno) as supervisor_nombre
                FROM trabajadores t
                LEFT JOIN cargos c ON t.cargo_id = c.id
                LEFT JOIN areas a ON t.area_id = a.id
                LEFT JOIN trabajadores s ON t.supervisor_directo_id = s.id
                WHERE t.id = ?
            `, [id]);

            if (trabajador.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Trabajador no encontrado'
                });
            }

            // Obtener contratos del trabajador
            const contratos = await query(`
                SELECT * FROM contratos 
                WHERE trabajador_id = ? 
                ORDER BY fecha_inicio DESC
            `, [id]);

            res.json({
                success: true,
                data: {
                    trabajador: trabajador[0],
                    contratos
                }
            });

        } catch (error) {
            console.error('Error obteniendo trabajador:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Crear nuevo trabajador
    async createTrabajador(req, res) {
        try {
            const {
                // Información Personal
                dni, nombres, apellido_paterno, apellido_materno, fecha_nacimiento,
                genero, estado_civil, nacionalidad, direccion,

                // Información Laboral
                fecha_ingreso, cargo_id, area_id, sueldo_basico,
                tipo_contrato = 'indefinido', fecha_fin, // NUEVOS CAMPOS
                tipo_jornada, supervisor_directo_id, essalud, afp, snp, seguro_vida,

                // Información de Contacto
                telefono_principal, telefono_secundario, correo_electronico, correo_personal,

                // Contacto de Emergencia
                contacto_emergencia_nombre, contacto_emergencia_relacion,
                contacto_emergencia_telefono, contacto_emergencia_correo
            } = req.body;

            // Verificar si ya existe trabajador con ese DNI
            const existingWorker = await query('SELECT id FROM trabajadores WHERE dni = ?', [dni]);
            if (existingWorker.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe un trabajador con ese DNI'
                });
            }

            // Insertar trabajador con nuevos campos
            const result = await query(`
            INSERT INTO trabajadores (
                dni, nombres, apellido_paterno, apellido_materno, fecha_nacimiento,
                genero, estado_civil, nacionalidad, direccion, fecha_ingreso,
                cargo_id, area_id, sueldo_basico, tipo_contrato, fecha_fin,
                tipo_jornada, supervisor_directo_id,
                essalud, afp, snp, seguro_vida, telefono_principal, telefono_secundario,
                correo_electronico, correo_personal, contacto_emergencia_nombre,
                contacto_emergencia_relacion, contacto_emergencia_telefono, contacto_emergencia_correo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
                dni, nombres, apellido_paterno, apellido_materno, fecha_nacimiento,
                genero, estado_civil, nacionalidad, direccion, fecha_ingreso,
                cargo_id, area_id, sueldo_basico, tipo_contrato, fecha_fin,
                tipo_jornada, supervisor_directo_id,
                essalud, afp, snp, seguro_vida, telefono_principal, telefono_secundario,
                correo_electronico, correo_personal, contacto_emergencia_nombre,
                contacto_emergencia_relacion, contacto_emergencia_telefono, contacto_emergencia_correo
            ]);

            res.status(201).json({
                success: true,
                message: 'Trabajador creado exitosamente',
                data: {
                    id: result.insertId,
                    dni,
                    nombre_completo: `${nombres} ${apellido_paterno} ${apellido_materno}`
                }
            });

        } catch (error) {
            console.error('Error creando trabajador:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Actualizar trabajador
    async updateTrabajador(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            // Verificar si el trabajador existe
            const existingWorker = await query('SELECT id FROM trabajadores WHERE id = ?', [id]);
            if (existingWorker.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Trabajador no encontrado'
                });
            }

            // Si se actualiza el DNI, verificar que no exista otro trabajador con ese DNI
            if (updateData.dni) {
                const dniExists = await query('SELECT id FROM trabajadores WHERE dni = ? AND id != ?', [updateData.dni, id]);
                if (dniExists.length > 0) {
                    return res.status(409).json({
                        success: false,
                        message: 'Ya existe otro trabajador con ese DNI'
                    });
                }
            }

            // Construir query de actualización dinámicamente
            const updateFields = [];
            const updateValues = [];

            for (const [key, value] of Object.entries(updateData)) {
                if (value !== undefined && value !== null) {
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
                UPDATE trabajadores 
                SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, updateValues);

            res.json({
                success: true,
                message: 'Trabajador actualizado exitosamente'
            });

        } catch (error) {
            console.error('Error actualizando trabajador:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Cambiar estado del trabajador (activar/desactivar)
    async cambiarEstado(req, res) {
        try {
            const { id } = req.params;
            const { estado } = req.body;

            if (!['activo', 'inactivo'].includes(estado)) {
                return res.status(400).json({
                    success: false,
                    message: 'Estado inválido. Debe ser "activo" o "inactivo"'
                });
            }

            const result = await query(`
                UPDATE trabajadores 
                SET estado = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [estado, id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Trabajador no encontrado'
                });
            }

            res.json({
                success: true,
                message: `Trabajador ${estado === 'activo' ? 'activado' : 'desactivado'} exitosamente`
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

    // Eliminar trabajador
    async deleteTrabajador(req, res) {
        try {
            const { id } = req.params;

            // Verificar si tiene contratos activos
            const contractsActive = await query(`
                SELECT COUNT(*) as count 
                FROM contratos 
                WHERE trabajador_id = ? AND estado = 'activo'
            `, [id]);

            if (contractsActive[0].count > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No se puede eliminar. El trabajador tiene contratos activos.'
                });
            }

            const result = await query('DELETE FROM trabajadores WHERE id = ?', [id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Trabajador no encontrado'
                });
            }

            res.json({
                success: true,
                message: 'Trabajador eliminado exitosamente'
            });

        } catch (error) {
            console.error('Error eliminando trabajador:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Exportar trabajadores a CSV
    async exportarCSV(req, res) {
        try {
            const trabajadores = await query(`
                SELECT 
                    t.dni,
                    t.nombres,
                    t.apellido_paterno,
                    t.apellido_materno,
                    t.fecha_nacimiento,
                    t.genero,
                    t.estado_civil,
                    t.direccion,
                    t.fecha_ingreso,
                    c.nombre as cargo,
                    a.nombre as area,
                    t.sueldo_basico,
                    t.tipo_jornada,
                    t.telefono_principal,
                    t.correo_electronico,
                    t.estado,
                    DATEDIFF(CURRENT_DATE, t.fecha_ingreso) as dias_servicio
                FROM trabajadores t
                LEFT JOIN cargos c ON t.cargo_id = c.id
                LEFT JOIN areas a ON t.area_id = a.id
                ORDER BY t.nombres
            `);

            const fields = [
                'dni', 'nombres', 'apellido_paterno', 'apellido_materno',
                'fecha_nacimiento', 'genero', 'estado_civil', 'direccion',
                'fecha_ingreso', 'cargo', 'area', 'sueldo_basico', 'tipo_jornada',
                'telefono_principal', 'correo_electronico', 'estado', 'dias_servicio'
            ];

            const opts = { fields };
            const parser = new Parser(opts);
            const csv = parser.parse(trabajadores);

            res.header('Content-Type', 'text/csv');
            res.attachment(`trabajadores_${new Date().toISOString().split('T')[0]}.csv`);
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
}

module.exports = new TrabajadoresController();