// controllers/planillasController.js - CORREGIDO
const { query } = require('../config/database');
const { Parser } = require('json2csv');

class PlanillasController {

    // Calcular planilla (vista previa)
    async calcularPlanilla(req, res) {
        try {
            const {
                periodo,
                tipo_planilla = 'regular',
                tipo_personal = 'todos'
            } = req.body;

            if (!periodo) {
                return res.status(400).json({
                    success: false,
                    message: 'El período es requerido'
                });
            }

            // Verificar formato del período
            if (!/^\d{4}-\d{2}$/.test(periodo)) {
                return res.status(400).json({
                    success: false,
                    message: 'El período debe tener formato YYYY-MM'
                });
            }

            // Obtener trabajadores activos según filtro
            let whereCondition = "t.estado = 'activo'";
            let params = [];

            if (tipo_personal !== 'todos') {
                // Mapear tipos de personal a cargos según tu esquema
                const cargoMap = {
                    'docente': [1, 2], // IDs de cargos docentes
                    'administrativo': [3, 4, 6], // IDs de cargos administrativos
                    'servicio': [5] // IDs de cargos de servicio
                };

                if (cargoMap[tipo_personal]) {
                    whereCondition += ` AND t.cargo_id IN (${cargoMap[tipo_personal].join(',')})`;
                }
            }

            const trabajadores = await query(`
                SELECT 
                    t.id, t.dni, t.nombres, t.apellido_paterno, t.apellido_materno,
                    t.sueldo_basico, t.fecha_ingreso,
                    c.nombre as cargo, a.nombre as area,
                    DATEDIFF(CURRENT_DATE, t.fecha_ingreso) as dias_servicio,
                    FLOOR(DATEDIFF(CURRENT_DATE, t.fecha_ingreso) / 365) as anos_servicio
                FROM trabajadores t
                LEFT JOIN cargos c ON t.cargo_id = c.id
                LEFT JOIN areas a ON t.area_id = a.id
                WHERE ${whereCondition}
                ORDER BY t.nombres, t.apellido_paterno
            `, params);

            if (trabajadores.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No se encontraron trabajadores activos para procesar'
                });
            }

            // Obtener conceptos activos
            const conceptos = await query(`
                SELECT * FROM conceptos 
                WHERE estado = 'activo' 
                ORDER BY tipo_concepto, orden ASC
            `);

            if (conceptos.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No se encontraron conceptos activos configurados'
                });
            }

            // Procesar cada trabajador
            const detalleCalculado = [];
            let totalIngresos = 0;
            let totalDescuentos = 0;
            let totalAportes = 0;
            let totalNeto = 0;

            for (const trabajador of trabajadores) {
                // ✅ CAMBIO: Usar método estático en lugar de this.calcularTrabajador
                const detalleTrabajador = await PlanillasController.calcularTrabajador(
                    trabajador, 
                    conceptos, 
                    tipo_planilla
                );
                
                detalleCalculado.push(detalleTrabajador);
                totalIngresos += detalleTrabajador.total_ingresos;
                totalDescuentos += detalleTrabajador.total_descuentos;
                totalAportes += detalleTrabajador.total_aportes;
                totalNeto += detalleTrabajador.neto_pagar;
            }

            res.json({
                success: true,
                data: {
                    planilla: {
                        periodo,
                        tipo_planilla,
                        tipo_personal,
                        total_trabajadores: trabajadores.length,
                        total_ingresos: Math.round(totalIngresos * 100) / 100,
                        total_descuentos: Math.round(totalDescuentos * 100) / 100,
                        total_aportes: Math.round(totalAportes * 100) / 100,
                        total_neto: Math.round(totalNeto * 100) / 100,
                        estado: 'calculada'
                    },
                    detalle: detalleCalculado
                }
            });

        } catch (error) {
            console.error('Error calculando planilla:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // ✅ CAMBIO: Método estático para calcular un trabajador individual
    static async calcularTrabajador(trabajador, conceptos, tipoPlanilla) {
        let sueldoBase = parseFloat(trabajador.sueldo_basico) || 0;
        
        // Aplicar multiplicadores según tipo de planilla
        const multiplicadores = {
            'regular': 1,
            'aguinaldo': 1,
            'gratificacion': 1,
            'cts': 1.17
        };
        
        sueldoBase *= multiplicadores[tipoPlanilla] || 1;

        // Variables para los cálculos
        const variables = {
            SUELDO_BASICO: sueldoBase,
            SUELDO_CONTRATO: sueldoBase,
            ANOS_SERVICIO: trabajador.anos_servicio || 0,
            HORAS_EXTRAS: 0, // Por defecto, se puede personalizar
            DIAS_TRABAJADOS: 30,
            MINUTOS_TARDANZA: 0,
            TIPO_PENSION: 'AFP', // Por defecto
            TOTAL_INGRESOS: 0 // Se actualiza después
        };

        let totalIngresos = 0;
        let totalDescuentos = 0;
        let totalAportes = 0;
        const conceptosAplicados = [];

        // Procesar conceptos de ingreso primero
        const conceptosIngreso = conceptos.filter(c => c.tipo_concepto === 'ingreso');
        for (const concepto of conceptosIngreso) {
            const valorCalculado = PlanillasController.evaluarConcepto(concepto, variables);
            if (valorCalculado > 0) {
                totalIngresos += valorCalculado;
                conceptosAplicados.push({
                    concepto_id: concepto.id,
                    codigo: concepto.codigo,
                    nombre: concepto.nombre,
                    tipo: 'ingreso',
                    valor_calculado: Math.round(valorCalculado * 100) / 100
                });
            }
        }

        // Actualizar variable TOTAL_INGRESOS para cálculos posteriores
        variables.TOTAL_INGRESOS = totalIngresos;

        // Procesar conceptos de descuento
        const conceptosDescuento = conceptos.filter(c => c.tipo_concepto === 'descuento');
        for (const concepto of conceptosDescuento) {
            const valorCalculado = PlanillasController.evaluarConcepto(concepto, variables);
            if (valorCalculado > 0) {
                totalDescuentos += valorCalculado;
                conceptosAplicados.push({
                    concepto_id: concepto.id,
                    codigo: concepto.codigo,
                    nombre: concepto.nombre,
                    tipo: 'descuento',
                    valor_calculado: Math.round(valorCalculado * 100) / 100
                });
            }
        }

        // Procesar aportes patronales
        const conceptosAporte = conceptos.filter(c => c.tipo_concepto === 'aporte');
        for (const concepto of conceptosAporte) {
            const valorCalculado = PlanillasController.evaluarConcepto(concepto, variables);
            if (valorCalculado > 0) {
                totalAportes += valorCalculado;
                conceptosAplicados.push({
                    concepto_id: concepto.id,
                    codigo: concepto.codigo,
                    nombre: concepto.nombre,
                    tipo: 'aporte',
                    valor_calculado: Math.round(valorCalculado * 100) / 100
                });
            }
        }

        const netoPagar = totalIngresos - totalDescuentos;

        return {
            trabajador_id: trabajador.id,
            dni: trabajador.dni,
            nombre_completo: `${trabajador.nombres} ${trabajador.apellido_paterno} ${trabajador.apellido_materno}`,
            cargo: trabajador.cargo,
            sueldo_basico: Math.round(sueldoBase * 100) / 100,
            total_ingresos: Math.round(totalIngresos * 100) / 100,
            total_descuentos: Math.round(totalDescuentos * 100) / 100,
            total_aportes: Math.round(totalAportes * 100) / 100,
            neto_pagar: Math.round(netoPagar * 100) / 100,
            conceptos_aplicados: conceptosAplicados
        };
    }

    // ✅ CAMBIO: Método estático para evaluar concepto según su tipo de cálculo
    static evaluarConcepto(concepto, variables) {
        try {
            switch (concepto.tipo_calculo) {
                case 'fijo':
                    return parseFloat(concepto.valor_fijo) || 0;

                case 'porcentual':
                    const porcentaje = parseFloat(concepto.porcentaje) || 0;
                    const base = variables.TOTAL_INGRESOS || variables.SUELDO_BASICO;
                    return base * (porcentaje / 100);

                case 'calculado':
                    return PlanillasController.evaluarFormula(concepto.formula, variables);

                case 'variable':
                    return 0; // Requiere input manual

                default:
                    return 0;
            }
        } catch (error) {
            console.error(`Error evaluando concepto ${concepto.codigo}:`, error);
            return 0;
        }
    }

    // ✅ CAMBIO: Método estático para evaluador básico de fórmulas
    static evaluarFormula(formula, variables) {
        if (!formula || typeof formula !== 'string') return 0;

        try {
            let formulaEvaluable = formula.trim();

            // Reemplazar variables
            for (const [variable, valor] of Object.entries(variables)) {
                const regex = new RegExp(`\\b${variable}\\b`, 'g');
                formulaEvaluable = formulaEvaluable.replace(regex, valor);
            }

            // Reemplazar funciones básicas
            formulaEvaluable = formulaEvaluable
                .replace(/IF\s*\(\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/g, '(($1) ? ($2) : ($3))')
                .replace(/MAX\s*\(\s*([^,]+),\s*([^)]+)\)/g, 'Math.max($1, $2)')
                .replace(/MIN\s*\(\s*([^,]+),\s*([^)]+)\)/g, 'Math.min($1, $2)')
                .replace(/ABS\s*\(\s*([^)]+)\)/g, 'Math.abs($1)')
                .replace(/ROUND\s*\(\s*([^)]+)\)/g, 'Math.round($1)');

            // Validar que solo contenga operadores y números seguros
            if (!/^[\d\s+\-*/().><=!&|?:Math.maxinabsround,]+$/.test(formulaEvaluable)) {
                console.warn('Fórmula contiene caracteres no permitidos:', formula);
                return 0;
            }

            // Evaluar la expresión de forma segura
            const resultado = Function('"use strict"; return (' + formulaEvaluable + ')')();
            return isNaN(resultado) ? 0 : Math.max(0, Number(resultado));

        } catch (error) {
            console.error('Error evaluando fórmula:', formula, error.message);
            return 0;
        }
    }

    // Procesar planilla definitivamente
    async procesarPlanilla(req, res) {
        try {
            const {
                periodo,
                tipo_planilla = 'regular',
                tipo_personal = 'todos',
                detalle
            } = req.body;

            if (!periodo || !detalle || !Array.isArray(detalle)) {
                return res.status(400).json({
                    success: false,
                    message: 'Datos incompletos para procesar la planilla'
                });
            }

            if (detalle.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Debe incluir al menos un trabajador en la planilla'
                });
            }

            // Verificar si ya existe una planilla para este período y tipo
            const planillaExistente = await query(`
                SELECT id FROM planillas 
                WHERE periodo = ? AND tipo_planilla = ?
            `, [periodo, tipo_planilla]);

            if (planillaExistente.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: `Ya existe una planilla ${tipo_planilla} procesada para el período ${periodo}`
                });
            }

            // Calcular totales
            const totalTrabajadores = detalle.length;
            const totalIngresos = detalle.reduce((sum, item) => sum + (parseFloat(item.total_ingresos) || 0), 0);
            const totalDescuentos = detalle.reduce((sum, item) => sum + (parseFloat(item.total_descuentos) || 0), 0);
            const totalAportes = detalle.reduce((sum, item) => sum + (parseFloat(item.total_aportes) || 0), 0);
            const totalNeto = detalle.reduce((sum, item) => sum + (parseFloat(item.neto_pagar) || 0), 0);

            // Insertar planilla principal
            const planillaResult = await query(`
                INSERT INTO planillas (
                    periodo, tipo_planilla, tipo_personal, estado,
                    total_trabajadores, total_ingresos, total_descuentos,
                    total_aportes, total_neto
                ) VALUES (?, ?, ?, 'procesada', ?, ?, ?, ?, ?)
            `, [
                periodo, tipo_planilla, tipo_personal, totalTrabajadores,
                totalIngresos, totalDescuentos, totalAportes, totalNeto
            ]);

            const planillaId = planillaResult.insertId;

            // Insertar detalle por trabajador
            for (const item of detalle) {
                const detalleResult = await query(`
                    INSERT INTO detalle_planilla (
                        planilla_id, trabajador_id, sueldo_basico,
                        total_ingresos, total_descuentos, total_aportes, neto_pagar
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    planillaId, 
                    item.trabajador_id, 
                    parseFloat(item.sueldo_basico) || 0,
                    parseFloat(item.total_ingresos) || 0, 
                    parseFloat(item.total_descuentos) || 0, 
                    parseFloat(item.total_aportes) || 0, 
                    parseFloat(item.neto_pagar) || 0
                ]);

                // Insertar conceptos aplicados si existen
                if (item.conceptos_aplicados && Array.isArray(item.conceptos_aplicados)) {
                    for (const concepto of item.conceptos_aplicados) {
                        if (concepto.concepto_id && concepto.valor_calculado > 0) {
                            await query(`
                                INSERT INTO detalle_conceptos_planilla (
                                    detalle_planilla_id, concepto_id, valor_calculado
                                ) VALUES (?, ?, ?)
                            `, [detalleResult.insertId, concepto.concepto_id, concepto.valor_calculado]);
                        }
                    }
                }
            }

            res.status(201).json({
                success: true,
                message: 'Planilla procesada exitosamente',
                data: {
                    planilla_id: planillaId,
                    periodo,
                    tipo_planilla,
                    total_trabajadores: totalTrabajadores,
                    total_neto: Math.round(totalNeto * 100) / 100
                }
            });

        } catch (error) {
            console.error('Error procesando planilla:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Obtener historial de planillas
    async getHistorial(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                tipo_planilla,
                estado,
                desde_periodo,
                hasta_periodo
            } = req.query;

            const offset = (parseInt(page) - 1) * parseInt(limit);
            let whereConditions = [];
            let queryParams = [];

            if (tipo_planilla && tipo_planilla !== 'todos') {
                whereConditions.push('tipo_planilla = ?');
                queryParams.push(tipo_planilla);
            }

            if (estado && estado !== 'todos') {
                whereConditions.push('estado = ?');
                queryParams.push(estado);
            }

            if (desde_periodo) {
                whereConditions.push('periodo >= ?');
                queryParams.push(desde_periodo);
            }

            if (hasta_periodo) {
                whereConditions.push('periodo <= ?');
                queryParams.push(hasta_periodo);
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            // Query principal con LIMIT interpolado
            const planillasQuery = `
                SELECT 
                    id, periodo, tipo_planilla, tipo_personal, estado,
                    total_trabajadores, total_ingresos, total_descuentos,
                    total_aportes, total_neto, fecha_proceso,
                    observaciones,
                    DATE_FORMAT(fecha_proceso, '%d/%m/%Y %H:%i') as fecha_proceso_formato
                FROM planillas 
                ${whereClause}
                ORDER BY fecha_proceso DESC, periodo DESC
                LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
            `;

            const planillas = await query(planillasQuery, queryParams);

            // Contar total de registros
            const countQuery = `SELECT COUNT(*) as total FROM planillas ${whereClause}`;
            const countResult = await query(countQuery, queryParams);
            const total = countResult[0].total;

            res.json({
                success: true,
                data: {
                    planillas,
                    pagination: {
                        current_page: parseInt(page),
                        per_page: parseInt(limit),
                        total,
                        total_pages: Math.ceil(total / parseInt(limit)),
                        has_next_page: parseInt(page) * parseInt(limit) < total,
                        has_prev_page: parseInt(page) > 1
                    }
                }
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

    // Obtener detalle de una planilla específica
    async getDetallePlanilla(req, res) {
        try {
            const { id } = req.params;

            const planilla = await query(`
                SELECT *,
                       DATE_FORMAT(fecha_proceso, '%d/%m/%Y %H:%i') as fecha_proceso_formato
                FROM planillas 
                WHERE id = ?
            `, [id]);

            if (planilla.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Planilla no encontrada'
                });
            }

            const detalle = await query(`
                SELECT 
                    dp.*,
                    CONCAT(t.nombres, ' ', t.apellido_paterno, ' ', t.apellido_materno) as nombre_completo,
                    t.dni,
                    c.nombre as cargo
                FROM detalle_planilla dp
                INNER JOIN trabajadores t ON dp.trabajador_id = t.id
                LEFT JOIN cargos c ON t.cargo_id = c.id
                WHERE dp.planilla_id = ?
                ORDER BY t.nombres, t.apellido_paterno
            `, [id]);

            res.json({
                success: true,
                data: {
                    planilla: planilla[0],
                    detalle
                }
            });

        } catch (error) {
            console.error('Error obteniendo detalle de planilla:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Exportar planilla a CSV
    async exportarPlanillaCSV(req, res) {
        try {
            const { id } = req.params;

            const planillaData = await PlanillasController.getDetallePlanillaData(id);

            if (!planillaData) {
                return res.status(404).json({
                    success: false,
                    message: 'Planilla no encontrada'
                });
            }

            const fields = [
                'dni', 'nombre_completo', 'cargo', 'sueldo_basico',
                'total_ingresos', 'total_descuentos', 'total_aportes', 'neto_pagar'
            ];

            const opts = { 
                fields,
                header: true,
                delimiter: ','
            };
            const parser = new Parser(opts);
            const csv = parser.parse(planillaData.detalle);

            res.header('Content-Type', 'text/csv; charset=utf-8');
            res.header('Content-Disposition', 
                `attachment; filename="planilla_${planillaData.planilla.periodo}_${planillaData.planilla.tipo_planilla}.csv"`
            );
            res.send(csv);

        } catch (error) {
            console.error('Error exportando planilla CSV:', error);
            res.status(500).json({
                success: false,
                message: 'Error exportando datos',
                error: error.message
            });
        }
    }

    // Método auxiliar para obtener datos de planilla
    static async getDetallePlanillaData(planillaId) {
        try {
            const planilla = await query(`SELECT * FROM planillas WHERE id = ?`, [planillaId]);
            if (planilla.length === 0) return null;

            const detalle = await query(`
                SELECT 
                    dp.*,
                    CONCAT(t.nombres, ' ', t.apellido_paterno, ' ', t.apellido_materno) as nombre_completo,
                    t.dni,
                    c.nombre as cargo
                FROM detalle_planilla dp
                INNER JOIN trabajadores t ON dp.trabajador_id = t.id
                LEFT JOIN cargos c ON t.cargo_id = c.id
                WHERE dp.planilla_id = ?
                ORDER BY t.nombres, t.apellido_paterno
            `, [planillaId]);

            return {
                planilla: planilla[0],
                detalle
            };
        } catch (error) {
            console.error('Error obteniendo datos de planilla:', error);
            return null;
        }
    }
}

module.exports = new PlanillasController();