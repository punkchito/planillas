// controllers/solicitudesController.js
const { query } = require('../config/database');
const { Parser } = require('json2csv');

class SolicitudesController {

    // Obtener todas las solicitudes con filtros
    async getSolicitudes(req, res) {
        try {
            const {
                tipo,
                estado = 'todos',
                fecha,
                search,
                sortBy = 'fecha_creacion',
                sortOrder = 'DESC',
                trabajador_id // Para filtrar "mis solicitudes"
            } = req.query;

            let whereConditions = [];
            let queryParams = [];

            // Validar sortBy para evitar inyección SQL
            const allowedSortFields = ['fecha_creacion', 'tipo_solicitud', 'estado', 'urgencia', 'titulo'];
            const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'fecha_creacion';
            const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

            // Construir filtros dinámicos
            if (tipo && tipo !== 'todas') {
                whereConditions.push('s.tipo_solicitud = ?');
                queryParams.push(tipo);
            }

            if (estado && estado !== 'todos') {
                whereConditions.push('s.estado = ?');
                queryParams.push(estado);
            }

            if (fecha) {
                whereConditions.push('DATE(s.fecha_creacion) = ?');
                queryParams.push(fecha);
            }

            if (trabajador_id) {
                whereConditions.push('s.trabajador_id = ?');
                queryParams.push(trabajador_id);
            }

            if (search) {
                whereConditions.push(`(
                    s.titulo LIKE ? OR 
                    s.motivo LIKE ? OR 
                    CONCAT(t.nombres, ' ', t.apellido_paterno, ' ', t.apellido_materno) LIKE ?
                )`);
                const searchTerm = `%${search}%`;
                queryParams.push(searchTerm, searchTerm, searchTerm);
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            const solicitudes = await query(`
                SELECT 
                    s.id,
                    s.tipo_solicitud,
                    s.titulo,
                    s.trabajador_id,
                    CONCAT(t.nombres, ' ', t.apellido_paterno, ' ', t.apellido_materno) as solicitante,
                    t.dni as empleado_dni,
                    s.fecha_creacion,
                    s.fecha_inicio,
                    s.fecha_fin,
                    s.motivo,
                    s.estado,
                    s.urgencia,
                    s.dias_solicitados,
                    s.horario,
                    s.monto,
                    s.proposito,
                    s.fecha_limite,
                    s.observaciones,
                    s.fecha_aprobacion,
                    s.fecha_rechazo,
                    a.nombre as area,
                    c.nombre as cargo
                FROM solicitudes s
                INNER JOIN trabajadores t ON s.trabajador_id = t.id
                LEFT JOIN areas a ON t.area_id = a.id
                LEFT JOIN cargos c ON t.cargo_id = c.id
                ${whereClause}
                ORDER BY s.${safeSortBy} ${safeSortOrder}
            `, queryParams);

            res.json({
                success: true,
                data: solicitudes
            });

        } catch (error) {
            console.error('Error obteniendo solicitudes:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Obtener una solicitud por ID con su timeline
    async getSolicitudById(req, res) {
        try {
            const { id } = req.params;

            const solicitud = await query(`
                SELECT 
                    s.*,
                    CONCAT(t.nombres, ' ', t.apellido_paterno, ' ', t.apellido_materno) as solicitante,
                    t.dni as empleado_dni,
                    a.nombre as area,
                    c.nombre as cargo
                FROM solicitudes s
                INNER JOIN trabajadores t ON s.trabajador_id = t.id
                LEFT JOIN areas a ON t.area_id = a.id
                LEFT JOIN cargos c ON t.cargo_id = c.id
                WHERE s.id = ?
            `, [id]);

            if (solicitud.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Solicitud no encontrada'
                });
            }

            // Obtener timeline
            const timeline = await query(`
                SELECT * FROM solicitudes_timeline 
                WHERE solicitud_id = ? 
                ORDER BY fecha ASC
            `, [id]);

            res.json({
                success: true,
                data: {
                    solicitud: solicitud[0],
                    timeline
                }
            });

        } catch (error) {
            console.error('Error obteniendo solicitud:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // controllers/solicitudesController.js - Método createSolicitud SIMPLIFICADO

    async createSolicitud(req, res) {
        try {
            console.log('=== CREAR SOLICITUD ===');
            console.log('Datos recibidos después de validaciones:', req.body);

            const {
                tipo_solicitud,
                trabajador_id,
                fecha_inicio,
                fecha_fin,
                motivo,
                urgencia = 'normal',
                monto,
                proposito,
                horario
            } = req.body;

            // Los datos ya fueron validados y limpiados por los middlewares
            // Solo verificamos que el trabajador existe
            const trabajador = await query('SELECT * FROM trabajadores WHERE id = ?', [trabajador_id]);
            if (trabajador.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Trabajador no encontrado'
                });
            }

            // Generar título
            const titulos = {
                'vacaciones': 'Solicitud de Vacaciones',
                'permiso': 'Permiso',
                'licencia': 'Licencia Médica',
                'adelanto': 'Adelanto de Sueldo',
                'certificado': 'Certificado Laboral',
                'otros': 'Otros'
            };

            const titulo = titulos[tipo_solicitud] || 'Solicitud';

            // Calcular días solicitados
            let dias_solicitados = null;

            if (tipo_solicitud === 'permiso') {
                dias_solicitados = 1;
            } else if ((tipo_solicitud === 'vacaciones' || tipo_solicitud === 'licencia') && fecha_inicio && fecha_fin) {
                const inicio = new Date(fecha_inicio);
                const fin = new Date(fecha_fin);
                dias_solicitados = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24)) + 1;
            } else if (tipo_solicitud === 'otros' && fecha_inicio && fecha_fin) {
                const inicio = new Date(fecha_inicio);
                const fin = new Date(fecha_fin);
                dias_solicitados = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24)) + 1;
            }

            // Preparar parámetros (ya limpiados por middlewares)
            const sqlParams = [
                tipo_solicitud,
                titulo,
                parseInt(trabajador_id),
                fecha_inicio || null,
                fecha_fin || null,
                motivo.trim(),
                urgencia,
                dias_solicitados,
                monto ? parseFloat(monto) : null,
                proposito ? proposito.trim() : null,
                horario ? horario.trim() : null
            ];

            console.log('Parámetros SQL finales:', sqlParams);

            // Verificar que no hay undefined
            sqlParams.forEach((param, index) => {
                if (param === undefined) {
                    console.error(`¡ALERTA! Parámetro ${index} es undefined`);
                    sqlParams[index] = null;
                }
            });

            // Insertar solicitud
            const result = await query(`
            INSERT INTO solicitudes (
                tipo_solicitud, titulo, trabajador_id, fecha_inicio, fecha_fin,
                motivo, urgencia, dias_solicitados, monto, proposito, horario,
                estado, fecha_creacion
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', NOW())
        `, sqlParams);

            const solicitudId = result.insertId;

            // Crear timeline
            await query(`
            INSERT INTO solicitudes_timeline (solicitud_id, evento, descripcion, usuario)
            VALUES (?, 'created', 'Solicitud creada', ?)
        `, [solicitudId, `${trabajador[0].nombres} ${trabajador[0].apellido_paterno}`]);

            console.log('Solicitud creada exitosamente con ID:', solicitudId);

            res.status(201).json({
                success: true,
                message: 'Solicitud creada exitosamente',
                data: {
                    id: solicitudId,
                    tipo_solicitud,
                    titulo,
                    estado: 'pendiente',
                    trabajador_id: parseInt(trabajador_id),
                    fecha_inicio: fecha_inicio || null,
                    fecha_fin: fecha_fin || null,
                    motivo: motivo.trim(),
                    urgencia,
                    dias_solicitados,
                    monto: monto ? parseFloat(monto) : null,
                    proposito: proposito ? proposito.trim() : null,
                    horario: horario ? horario.trim() : null
                }
            });

        } catch (error) {
            console.error('Error creando solicitud:', error);
            console.error('Detalles del error:', {
                message: error.message,
                code: error.code,
                errno: error.errno,
                sqlMessage: error.sqlMessage,
                sqlState: error.sqlState
            });

            // Manejar errores específicos
            let errorMessage = 'Error interno del servidor';

            if (error.code === 'ER_BAD_NULL_ERROR') {
                errorMessage = 'Error: Campo requerido faltante en la base de datos';
            } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                errorMessage = 'Error: El trabajador especificado no existe';
            } else if (error.code === 'ER_DUP_ENTRY') {
                errorMessage = 'Error: Ya existe una solicitud similar';
            } else if (error.sqlMessage && error.sqlMessage.includes('undefined')) {
                errorMessage = 'Error: Datos inválidos detectados';
            }

            res.status(500).json({
                success: false,
                message: errorMessage,
                error: process.env.NODE_ENV === 'development' ? {
                    message: error.message,
                    code: error.code,
                    sqlMessage: error.sqlMessage
                } : 'Error interno'
            });
        }
    }

    validateSolicitudByType(data) {
        const errors = [];
        const { tipo_solicitud } = data;

        switch (tipo_solicitud) {
            case 'permiso':
                if (!data.fecha_inicio) errors.push('Fecha de inicio requerida para permisos');
                break;

            case 'vacaciones':
            case 'licencia':
                if (!data.fecha_inicio) errors.push('Fecha de inicio requerida');
                if (!data.fecha_fin) errors.push('Fecha de fin requerida');
                if (data.fecha_inicio && data.fecha_fin) {
                    if (new Date(data.fecha_fin) <= new Date(data.fecha_inicio)) {
                        errors.push('Fecha de fin debe ser posterior a fecha de inicio');
                    }
                }
                break;

            case 'adelanto':
                if (!data.monto || data.monto <= 0) errors.push('Monto debe ser mayor a 0');
                if (data.monto > 50000) errors.push('Monto no puede exceder 50,000');
                break;

            case 'certificado':
                if (!data.proposito || data.proposito.length < 3) errors.push('Propósito requerido');
                break;
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Actualizar solicitud
    async updateSolicitud(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const { usuario_actualizacion = 'Administrador' } = req.body;

            // Verificar si la solicitud existe
            const existingSolicitud = await query('SELECT * FROM solicitudes WHERE id = ?', [id]);
            if (existingSolicitud.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Solicitud no encontrada'
                });
            }

            // No permitir actualizar solicitudes ya procesadas
            const solicitud = existingSolicitud[0];
            if (solicitud.estado === 'aprobada') {
                return res.status(400).json({
                    success: false,
                    message: 'No se puede modificar una solicitud ya aprobada'
                });
            }

            // Construir query de actualización dinámicamente
            const updateFields = [];
            const updateValues = [];
            const allowedFields = [
                'tipo_solicitud', 'fecha_inicio', 'fecha_fin', 'motivo', 'urgencia',
                'monto', 'proposito', 'horario', 'observaciones'
            ];

            for (const [key, value] of Object.entries(updateData)) {
                if (allowedFields.includes(key) && value !== undefined) {
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
                UPDATE solicitudes 
                SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, updateValues);

            // Agregar entrada al timeline
            await query(`
                INSERT INTO solicitudes_timeline (solicitud_id, evento, descripcion, usuario)
                VALUES (?, 'updated', 'Solicitud actualizada', ?)
            `, [id, usuario_actualizacion]);

            res.json({
                success: true,
                message: 'Solicitud actualizada exitosamente'
            });

        } catch (error) {
            console.error('Error actualizando solicitud:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Cambiar estado de solicitud (aprobar/rechazar)
    async cambiarEstado(req, res) {
        try {
            const { id } = req.params;
            const { estado, observaciones, usuario = 'Administrador' } = req.body;

            if (!['pendiente', 'en-revision', 'aprobada', 'rechazada'].includes(estado)) {
                return res.status(400).json({
                    success: false,
                    message: 'Estado inválido'
                });
            }

            const solicitud = await query('SELECT * FROM solicitudes WHERE id = ?', [id]);
            if (solicitud.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Solicitud no encontrada'
                });
            }

            let updateFields = 'estado = ?, updated_at = CURRENT_TIMESTAMP';
            let updateValues = [estado];

            // Actualizar fechas específicas según el estado
            if (estado === 'aprobada') {
                updateFields += ', fecha_aprobacion = CURRENT_TIMESTAMP';
            } else if (estado === 'rechazada') {
                updateFields += ', fecha_rechazo = CURRENT_TIMESTAMP';
            }

            if (observaciones) {
                updateFields += ', observaciones = ?';
                updateValues.push(observaciones);
            }

            updateValues.push(id);

            await query(`UPDATE solicitudes SET ${updateFields} WHERE id = ?`, updateValues);

            // Crear entrada en timeline
            const eventos = {
                'pendiente': 'created',
                'en-revision': 'reviewed',
                'aprobada': 'approved',
                'rechazada': 'rejected'
            };

            const descripciones = {
                'pendiente': 'Solicitud pendiente',
                'en-revision': 'Solicitud en revisión',
                'aprobada': 'Solicitud aprobada',
                'rechazada': `Solicitud rechazada${observaciones ? ` - ${observaciones}` : ''}`
            };

            await query(`
                INSERT INTO solicitudes_timeline (solicitud_id, evento, descripcion, usuario, observaciones)
                VALUES (?, ?, ?, ?, ?)
            `, [id, eventos[estado], descripciones[estado], usuario, observaciones]);

            res.json({
                success: true,
                message: `Solicitud ${estado} exitosamente`
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

    // Eliminar solicitud
    async deleteSolicitud(req, res) {
        try {
            const { id } = req.params;

            // Verificar si existe y si se puede eliminar
            const solicitud = await query('SELECT estado FROM solicitudes WHERE id = ?', [id]);
            if (solicitud.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Solicitud no encontrada'
                });
            }

            if (solicitud[0].estado === 'aprobada') {
                return res.status(400).json({
                    success: false,
                    message: 'No se puede eliminar una solicitud aprobada'
                });
            }

            await query('DELETE FROM solicitudes WHERE id = ?', [id]);

            res.json({
                success: true,
                message: 'Solicitud eliminada exitosamente'
            });

        } catch (error) {
            console.error('Error eliminando solicitud:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Obtener estadísticas
    async getEstadisticas(req, res) {
        try {
            const stats = await query(`
                SELECT 
                    COUNT(*) as total_solicitudes,
                    SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
                    SUM(CASE WHEN estado = 'en-revision' THEN 1 ELSE 0 END) as en_revision,
                    SUM(CASE WHEN estado = 'aprobada' THEN 1 ELSE 0 END) as aprobadas,
                    SUM(CASE WHEN estado = 'rechazada' THEN 1 ELSE 0 END) as rechazadas,
                    SUM(CASE WHEN tipo_solicitud = 'vacaciones' THEN 1 ELSE 0 END) as vacaciones,
                    SUM(CASE WHEN tipo_solicitud = 'permiso' THEN 1 ELSE 0 END) as permisos,
                    SUM(CASE WHEN tipo_solicitud = 'licencia' THEN 1 ELSE 0 END) as licencias,
                    SUM(CASE WHEN tipo_solicitud = 'adelanto' THEN 1 ELSE 0 END) as adelantos,
                    SUM(CASE WHEN tipo_solicitud = 'certificado' THEN 1 ELSE 0 END) as certificados,
                    SUM(CASE WHEN urgencia = 'urgente' THEN 1 ELSE 0 END) as urgentes
                FROM solicitudes
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

    // Obtener solicitudes pendientes de aprobación
    async getPendientesAprobacion(req, res) {
        try {
            const solicitudes = await query(`
                SELECT 
                    s.*,
                    CONCAT(t.nombres, ' ', t.apellido_paterno, ' ', t.apellido_materno) as solicitante,
                    t.dni as empleado_dni,
                    a.nombre as area,
                    c.nombre as cargo
                FROM solicitudes s
                INNER JOIN trabajadores t ON s.trabajador_id = t.id
                LEFT JOIN areas a ON t.area_id = a.id
                LEFT JOIN cargos c ON t.cargo_id = c.id
                WHERE s.estado IN ('pendiente', 'en-revision')
                ORDER BY 
                    CASE s.urgencia 
                        WHEN 'urgente' THEN 1 
                        WHEN 'alta' THEN 2 
                        ELSE 3 
                    END,
                    s.fecha_creacion ASC
            `);

            res.json({
                success: true,
                data: solicitudes
            });

        } catch (error) {
            console.error('Error obteniendo solicitudes pendientes:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Obtener historial (solicitudes procesadas)
    async getHistorial(req, res) {
        try {
            const solicitudes = await query(`
                SELECT 
                    s.*,
                    CONCAT(t.nombres, ' ', t.apellido_paterno, ' ', t.apellido_materno) as solicitante,
                    t.dni as empleado_dni,
                    a.nombre as area,
                    c.nombre as cargo
                FROM solicitudes s
                INNER JOIN trabajadores t ON s.trabajador_id = t.id
                LEFT JOIN areas a ON t.area_id = a.id
                LEFT JOIN cargos c ON t.cargo_id = c.id
                WHERE s.estado IN ('aprobada', 'rechazada')
                ORDER BY 
                    COALESCE(s.fecha_aprobacion, s.fecha_rechazo) DESC
            `);

            res.json({
                success: true,
                data: solicitudes
            });

        } catch (error) {
            console.error('Error obteniendo historial:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Exportar solicitudes a CSV
    async exportarCSV(req, res) {
        try {
            const { tipo, estado, fecha_desde, fecha_hasta } = req.query;

            let whereConditions = [];
            let queryParams = [];

            if (tipo && tipo !== 'todas') {
                whereConditions.push('s.tipo_solicitud = ?');
                queryParams.push(tipo);
            }

            if (estado && estado !== 'todos') {
                whereConditions.push('s.estado = ?');
                queryParams.push(estado);
            }

            if (fecha_desde) {
                whereConditions.push('DATE(s.fecha_creacion) >= ?');
                queryParams.push(fecha_desde);
            }

            if (fecha_hasta) {
                whereConditions.push('DATE(s.fecha_creacion) <= ?');
                queryParams.push(fecha_hasta);
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            const solicitudes = await query(`
                SELECT 
                    s.id,
                    s.tipo_solicitud,
                    s.titulo,
                    CONCAT(t.nombres, ' ', t.apellido_paterno, ' ', t.apellido_materno) as solicitante,
                    t.dni as empleado_dni,
                    s.fecha_creacion,
                    s.fecha_inicio,
                    s.fecha_fin,
                    s.estado,
                    s.urgencia,
                    s.motivo,
                    s.observaciones,
                    s.monto,
                    s.dias_solicitados,
                    a.nombre as area,
                    c.nombre as cargo
                FROM solicitudes s
                INNER JOIN trabajadores t ON s.trabajador_id = t.id
                LEFT JOIN areas a ON t.area_id = a.id
                LEFT JOIN cargos c ON t.cargo_id = c.id
                ${whereClause}
                ORDER BY s.fecha_creacion DESC
            `, queryParams);

            const fields = [
                'id', 'tipo_solicitud', 'titulo', 'solicitante', 'empleado_dni',
                'fecha_creacion', 'fecha_inicio', 'fecha_fin', 'estado', 'urgencia',
                'motivo', 'observaciones', 'monto', 'dias_solicitados', 'area', 'cargo'
            ];

            const opts = { fields };
            const parser = new Parser(opts);
            const csv = parser.parse(solicitudes);

            res.header('Content-Type', 'text/csv');
            res.attachment(`solicitudes_${new Date().toISOString().split('T')[0]}.csv`);
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

    // Obtener trabajadores activos para el select
    async getTrabajadoresActivos(req, res) {
        try {
            const trabajadores = await query(`
                SELECT 
                    t.id,
                    t.dni,
                    CONCAT(t.nombres, ' ', t.apellido_paterno, ' ', t.apellido_materno) as nombre_completo,
                    c.nombre as cargo,
                    a.nombre as area
                FROM trabajadores t
                LEFT JOIN cargos c ON t.cargo_id = c.id
                LEFT JOIN areas a ON t.area_id = a.id
                WHERE t.estado = 'activo'
                ORDER BY t.nombres, t.apellido_paterno
            `);

            res.json({
                success: true,
                data: trabajadores
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

    // Reactivar solicitud rechazada
    async reactivarSolicitud(req, res) {
        try {
            const { id } = req.params;
            const { usuario = 'Administrador' } = req.body;

            const solicitud = await query('SELECT estado FROM solicitudes WHERE id = ?', [id]);
            if (solicitud.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Solicitud no encontrada'
                });
            }

            if (solicitud[0].estado !== 'rechazada') {
                return res.status(400).json({
                    success: false,
                    message: 'Solo se pueden reactivar solicitudes rechazadas'
                });
            }

            await query(`
                UPDATE solicitudes 
                SET estado = 'pendiente', 
                    fecha_rechazo = NULL, 
                    observaciones = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [id]);

            // Crear entrada en timeline
            await query(`
                INSERT INTO solicitudes_timeline (solicitud_id, evento, descripcion, usuario)
                VALUES (?, 'reactivated', 'Solicitud reactivada', ?)
            `, [id, usuario]);

            res.json({
                success: true,
                message: 'Solicitud reactivada exitosamente'
            });

        } catch (error) {
            console.error('Error reactivando solicitud:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    cleanSolicitudData(data, tipo_solicitud) {
        const cleanValue = (value) => {
            if (value === undefined || value === '' || value === 'null' || value === 0) {
                return null;
            }
            return value;
        };

        // Datos base que siempre van
        const baseData = {
            tipo_solicitud,
            trabajador_id: parseInt(data.trabajador_id),
            motivo: data.motivo.trim(),
            urgencia: data.urgencia || 'normal'
        };

        // Agregar campos específicos por tipo
        switch (tipo_solicitud) {
            case 'permiso':
                return {
                    ...baseData,
                    fecha_inicio: cleanValue(data.fecha_inicio),
                    fecha_fin: null,
                    dias_solicitados: 1,
                    monto: null,
                    proposito: null,
                    horario: cleanValue(data.horario)
                };

            case 'vacaciones':
            case 'licencia':
                const inicio = new Date(data.fecha_inicio);
                const fin = new Date(data.fecha_fin);
                const dias = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24)) + 1;

                return {
                    ...baseData,
                    fecha_inicio: cleanValue(data.fecha_inicio),
                    fecha_fin: cleanValue(data.fecha_fin),
                    dias_solicitados: dias,
                    monto: null,
                    proposito: null,
                    horario: null
                };

            case 'adelanto':
                return {
                    ...baseData,
                    fecha_inicio: null,
                    fecha_fin: null,
                    dias_solicitados: null,
                    monto: parseFloat(data.monto),
                    proposito: null,
                    horario: null
                };

            case 'certificado':
                return {
                    ...baseData,
                    fecha_inicio: null,
                    fecha_fin: null,
                    dias_solicitados: null,
                    monto: null,
                    proposito: data.proposito.trim(),
                    horario: null
                };

            case 'otros':
                let dias_otros = null;
                if (data.fecha_inicio && data.fecha_fin) {
                    const inicio = new Date(data.fecha_inicio);
                    const fin = new Date(data.fecha_fin);
                    dias_otros = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24)) + 1;
                }

                return {
                    ...baseData,
                    fecha_inicio: cleanValue(data.fecha_inicio),
                    fecha_fin: cleanValue(data.fecha_fin),
                    dias_solicitados: dias_otros,
                    monto: cleanValue(data.monto) ? parseFloat(data.monto) : null,
                    proposito: cleanValue(data.proposito),
                    horario: cleanValue(data.horario)
                };

            default:
                throw new Error(`Tipo de solicitud no válido: ${tipo_solicitud}`);
        }
    }



}

module.exports = new SolicitudesController();