// controllers/conceptosController.js
const { query } = require('../config/database');
const { Parser } = require('json2csv');

class ConceptosController {

    // Obtener todos los conceptos con filtros
    async getConceptos(req, res) {
        try {
            const {
                tipo,
                estado = 'todos',
                search,
                sortBy = 'orden',
                sortOrder = 'ASC'
            } = req.query;

            let whereConditions = [];
            let queryParams = [];

            // Validar sortBy para evitar inyección SQL
            const allowedSortFields = ['codigo', 'nombre', 'tipo_concepto', 'orden', 'estado'];
            const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'orden';
            const safeSortOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

            // Construir filtros dinámicos
            if (tipo && tipo !== 'todos') {
                whereConditions.push('tipo_concepto = ?');
                queryParams.push(tipo);
            }

            if (estado && estado !== 'todos') {
                whereConditions.push('estado = ?');
                queryParams.push(estado);
            }

            if (search) {
                whereConditions.push('(codigo LIKE ? OR nombre LIKE ? OR descripcion LIKE ?)');
                const searchTerm = `%${search}%`;
                queryParams.push(searchTerm, searchTerm, searchTerm);
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            const conceptos = await query(`
                SELECT 
                    id,
                    codigo,
                    nombre,
                    tipo_concepto,
                    tipo_calculo,
                    valor_fijo,
                    porcentaje,
                    formula,
                    orden,
                    estado,
                    descripcion,
                    afecta_a,
                    created_at,
                    updated_at
                FROM conceptos 
                ${whereClause}
                ORDER BY ${safeSortBy} ${safeSortOrder}, orden ASC
            `, queryParams);

            res.json({
                success: true,
                data: conceptos
            });

        } catch (error) {
            console.error('Error obteniendo conceptos:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Obtener conceptos por tipo específico
    async getConceptosPorTipo(req, res) {
        try {
            const { tipo } = req.params;

            if (!['ingreso', 'descuento', 'aporte'].includes(tipo)) {
                return res.status(400).json({
                    success: false,
                    message: 'Tipo de concepto inválido'
                });
            }

            const conceptos = await query(`
                SELECT * FROM conceptos 
                WHERE tipo_concepto = ? 
                ORDER BY orden ASC
            `, [tipo]);

            res.json({
                success: true,
                data: conceptos
            });

        } catch (error) {
            console.error('Error obteniendo conceptos por tipo:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Obtener un concepto por ID
    async getConceptoById(req, res) {
        try {
            const { id } = req.params;

            const concepto = await query(`
                SELECT * FROM conceptos WHERE id = ?
            `, [id]);

            if (concepto.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Concepto no encontrado'
                });
            }

            res.json({
                success: true,
                data: concepto[0]
            });

        } catch (error) {
            console.error('Error obteniendo concepto:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Obtener concepto por código
    async getConceptoByCodigo(req, res) {
        try {
            const { codigo } = req.params;

            const concepto = await query(`
                SELECT * FROM conceptos WHERE codigo = ?
            `, [codigo.toUpperCase()]);

            if (concepto.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Concepto no encontrado'
                });
            }

            res.json({
                success: true,
                data: concepto[0]
            });

        } catch (error) {
            console.error('Error obteniendo concepto por código:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Crear nuevo concepto
    async createConcepto(req, res) {
        try {
            // Extraer datos del body
            const requestData = req.body;

            // Validar que existan los campos requeridos
            if (!requestData.codigo || !requestData.nombre || !requestData.tipo_concepto || !requestData.tipo_calculo) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan campos requeridos'
                });
            }

            const {
                codigo: codigoRaw,
                nombre,
                tipo_concepto,
                tipo_calculo,
                valor_fijo,
                porcentaje,
                formula,
                orden,
                estado = 'activo',
                descripcion,
                afecta_a
            } = requestData;

            // Procesar código
            const codigo = codigoRaw.toString().toUpperCase();

            // Verificar si ya existe concepto con ese código
            const existingConcepto = await query('SELECT id FROM conceptos WHERE codigo = ?', [codigo]);
            if (existingConcepto.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe un concepto con ese código'
                });
            }

            // Preparar datos para inserción
            let insertData = {
                codigo,
                nombre,
                tipo_concepto,
                tipo_calculo,
                orden: orden || 1,
                estado,
                descripcion: descripcion || null,
                afecta_a: afecta_a || 'Todos',
                valor_fijo: null,
                porcentaje: null,
                formula: null
            };

            // Asignar valores según tipo de cálculo
            switch (tipo_calculo) {
                case 'fijo':
                    insertData.valor_fijo = parseFloat(valor_fijo) || 0;
                    break;
                case 'porcentual':
                    insertData.porcentaje = parseFloat(porcentaje) || 0;
                    break;
                case 'calculado':
                    insertData.formula = formula || '';
                    break;
                case 'variable':
                    // No necesita valores adicionales
                    break;
            }

            // Insertar concepto
            const result = await query(`
            INSERT INTO conceptos (
                codigo, nombre, tipo_concepto, tipo_calculo, 
                valor_fijo, porcentaje, formula, orden, 
                estado, descripcion, afecta_a
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
                insertData.codigo,
                insertData.nombre,
                insertData.tipo_concepto,
                insertData.tipo_calculo,
                insertData.valor_fijo,
                insertData.porcentaje,
                insertData.formula,
                insertData.orden,
                insertData.estado,
                insertData.descripcion,
                insertData.afecta_a
            ]);

            res.status(201).json({
                success: true,
                message: 'Concepto creado exitosamente',
                data: {
                    id: result.insertId,
                    codigo: insertData.codigo,
                    nombre: insertData.nombre
                }
            });

        } catch (error) {
            console.error('Error creando concepto:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Actualizar concepto
    async updateConcepto(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            // Verificar si el concepto existe
            const existingConcepto = await query('SELECT id FROM conceptos WHERE id = ?', [id]);
            if (existingConcepto.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Concepto no encontrado'
                });
            }

            // Si se actualiza el código, verificar que no exista otro concepto con ese código
            if (updateData.codigo) {
                const codigo = updateData.codigo.toString().toUpperCase();
                const codigoExists = await query('SELECT id FROM conceptos WHERE codigo = ? AND id != ?', [codigo, id]);
                if (codigoExists.length > 0) {
                    return res.status(409).json({
                        success: false,
                        message: 'Ya existe otro concepto con ese código'
                    });
                }
                updateData.codigo = codigo;
            }

            // Construir query de actualización dinámicamente
            const updateFields = [];
            const updateValues = [];

            // Procesar campos permitidos
            const allowedFields = [
                'codigo', 'nombre', 'tipo_concepto', 'tipo_calculo',
                'valor_fijo', 'porcentaje', 'formula', 'orden',
                'estado', 'descripcion', 'afecta_a'
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
            UPDATE conceptos 
            SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, updateValues);

            res.json({
                success: true,
                message: 'Concepto actualizado exitosamente'
            });

        } catch (error) {
            console.error('Error actualizando concepto:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Cambiar estado del concepto (activar/desactivar)
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
                UPDATE conceptos 
                SET estado = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [estado, id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Concepto no encontrado'
                });
            }

            res.json({
                success: true,
                message: `Concepto ${estado === 'activo' ? 'activado' : 'desactivado'} exitosamente`
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

    // Eliminar concepto
    async deleteConcepto(req, res) {
        try {
            const { id } = req.params;

            // Verificar si el concepto está siendo usado en algún lugar
            // (aquí podrías agregar validaciones adicionales)

            const result = await query('DELETE FROM conceptos WHERE id = ?', [id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Concepto no encontrado'
                });
            }

            res.json({
                success: true,
                message: 'Concepto eliminado exitosamente'
            });

        } catch (error) {
            console.error('Error eliminando concepto:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Probar un concepto con datos de muestra
    async probarConcepto(req, res) {
        try {
            const { id } = req.params;
            const { datos_prueba } = req.body;

            const concepto = await query('SELECT * FROM conceptos WHERE id = ?', [id]);

            if (concepto.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Concepto no encontrado'
                });
            }

            const conceptoData = concepto[0];
            let resultado = 0;

            // Simular cálculo según el tipo
            switch (conceptoData.tipo_calculo) {
                case 'fijo':
                    resultado = parseFloat(conceptoData.valor_fijo || 0);
                    break;
                case 'porcentual':
                    const base = datos_prueba?.sueldo_basico || 2500;
                    resultado = base * (parseFloat(conceptoData.porcentaje || 0) / 100);
                    break;
                case 'calculado':
                    // Aquí iría la evaluación de la fórmula
                    resultado = 375.50; // Valor simulado
                    break;
                case 'variable':
                    resultado = datos_prueba?.valor_manual || 0;
                    break;
            }

            res.json({
                success: true,
                data: {
                    concepto: conceptoData.nombre,
                    codigo: conceptoData.codigo,
                    tipo_calculo: conceptoData.tipo_calculo,
                    datos_usados: datos_prueba || {
                        sueldo_basico: 2500,
                        años_servicio: 3,
                        horas_extras: 5
                    },
                    resultado: parseFloat(resultado.toFixed(2)),
                    formula_aplicada: conceptoData.formula || 'N/A'
                }
            });

        } catch (error) {
            console.error('Error probando concepto:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Validar fórmula
    async validarFormula(req, res) {
        try {
            const { formula } = req.body;

            if (!formula || !formula.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Fórmula requerida'
                });
            }

            // Variables permitidas
            const variablesPermitidas = [
                'SUELDO_BASICO', 'AÑOS_SERVICIO', 'HORAS_EXTRAS',
                'DIAS_TRABAJADOS', 'TOTAL_INGRESOS', 'TIPO_PENSION',
                'CARGO', 'AREA', 'SUELDO_CONTRATO', 'MINUTOS_TARDANZA'
            ];

            // Funciones permitidas
            const funcionesPermitidas = ['IF', 'MAX', 'MIN', 'ABS', 'ROUND'];

            // Validación básica de sintaxis (simplificada)
            const esValida = true; // Implementar lógica de validación real

            res.json({
                success: true,
                data: {
                    formula,
                    es_valida: esValida,
                    variables_encontradas: variablesPermitidas.filter(v => formula.includes(v)),
                    funciones_encontradas: funcionesPermitidas.filter(f => formula.includes(f)),
                    mensaje: esValida ? 'Fórmula válida' : 'Fórmula contiene errores'
                }
            });

        } catch (error) {
            console.error('Error validando fórmula:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Exportar conceptos a CSV
    async exportarCSV(req, res) {
        try {
            const conceptos = await query(`
                SELECT 
                    codigo, nombre, tipo_concepto, tipo_calculo,
                    valor_fijo, porcentaje, formula, orden,
                    estado, descripcion, afecta_a,
                    created_at, updated_at
                FROM conceptos 
                ORDER BY tipo_concepto, orden
            `);

            const fields = [
                'codigo', 'nombre', 'tipo_concepto', 'tipo_calculo',
                'valor_fijo', 'porcentaje', 'formula', 'orden',
                'estado', 'descripcion', 'afecta_a'
            ];

            const opts = { fields };
            const parser = new Parser(opts);
            const csv = parser.parse(conceptos);

            res.header('Content-Type', 'text/csv');
            res.attachment(`conceptos_${new Date().toISOString().split('T')[0]}.csv`);
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

    // Obtener variables disponibles para fórmulas
    async getVariablesFormula(req, res) {
        try {
            const variables = [
                {
                    codigo: 'SUELDO_BASICO',
                    nombre: 'Sueldo Básico',
                    descripcion: 'Sueldo básico del trabajador según contrato',
                    tipo: 'numeric'
                },
                {
                    codigo: 'AÑOS_SERVICIO',
                    nombre: 'Años de Servicio',
                    descripcion: 'Años trabajados en la empresa',
                    tipo: 'numeric'
                },
                {
                    codigo: 'HORAS_EXTRAS',
                    nombre: 'Horas Extras',
                    descripcion: 'Cantidad de horas extras trabajadas',
                    tipo: 'numeric'
                },
                {
                    codigo: 'DIAS_TRABAJADOS',
                    nombre: 'Días Trabajados',
                    descripcion: 'Días efectivamente trabajados en el período',
                    tipo: 'numeric'
                },
                {
                    codigo: 'TOTAL_INGRESOS',
                    nombre: 'Total Ingresos',
                    descripcion: 'Suma total de todos los ingresos',
                    tipo: 'numeric'
                },
                {
                    codigo: 'TIPO_PENSION',
                    nombre: 'Tipo de Pensión',
                    descripcion: 'AFP o SNP',
                    tipo: 'string'
                },
                {
                    codigo: 'CARGO',
                    nombre: 'Cargo',
                    descripcion: 'Cargo del trabajador',
                    tipo: 'string'
                },
                {
                    codigo: 'AREA',
                    nombre: 'Área',
                    descripcion: 'Área donde trabaja',
                    tipo: 'string'
                }
            ];

            res.json({
                success: true,
                data: variables
            });

        } catch (error) {
            console.error('Error obteniendo variables:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Obtener estadísticas de conceptos
    async getEstadisticas(req, res) {
        try {
            const stats = await query(`
                SELECT 
                    COUNT(*) as total_conceptos,
                    SUM(CASE WHEN tipo_concepto = 'ingreso' THEN 1 ELSE 0 END) as ingresos,
                    SUM(CASE WHEN tipo_concepto = 'descuento' THEN 1 ELSE 0 END) as descuentos,
                    SUM(CASE WHEN tipo_concepto = 'aporte' THEN 1 ELSE 0 END) as aportes,
                    SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as activos,
                    SUM(CASE WHEN estado = 'inactivo' THEN 1 ELSE 0 END) as inactivos
                FROM conceptos
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
}

module.exports = new ConceptosController();