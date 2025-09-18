// controllers/reportesController.js
const { query } = require('../config/database');
const { Parser } = require('json2csv');

class ReportesController {

    // =============================
    // DASHBOARD Y ESTADÍSTICAS GENERALES
    // =============================

    // Obtener estadísticas generales del dashboard
    async getDashboardStats(req, res) {
        try {
            const { periodo = 'mes-actual', tipoPersonal = 'todos', area = 'todas' } = req.query;

            // Construir filtros dinámicos
            const filters = ReportesController.buildFilters(req.query);
            
            // Estadísticas generales de trabajadores
            const trabajadorStats = await query(`
                SELECT 
                    COUNT(*) as total_trabajadores,
                    COUNT(CASE WHEN t.estado = 'activo' THEN 1 END) as trabajadores_activos,
                    COUNT(CASE WHEN t.estado = 'inactivo' THEN 1 END) as trabajadores_inactivos,
                    AVG(sueldo_basico) as salario_promedio,
                    SUM(sueldo_basico) as masa_salarial_total
                FROM trabajadores t
                LEFT JOIN areas a ON t.area_id = a.id
                LEFT JOIN cargos c ON t.cargo_id = c.id
                ${filters.whereClause}
            `, filters.params);

            // Estadísticas de planillas del período actual
            const planillaStats = await query(`
                SELECT 
                    COUNT(DISTINCT p.id) as total_planillas,
                    COUNT(DISTINCT dp.trabajador_id) as trabajadores_en_planilla,
                    COALESCE(SUM(dp.total_ingresos), 0) as total_ingresos,
                    COALESCE(SUM(dp.total_descuentos), 0) as total_descuentos,
                    COALESCE(SUM(dp.neto_pagar), 0) as total_neto
                FROM planillas p
                LEFT JOIN detalle_planilla dp ON p.id = dp.planilla_id
                WHERE ${ReportesController.getPeriodCondition(periodo, 'p.periodo')}
                AND p.estado IN ('calculada', 'procesada')
            `);

            // Estadísticas por área
            const areaStats = await query(`
                SELECT 
                    a.nombre as area_nombre,
                    COUNT(t.id) as cantidad_empleados,
                    AVG(t.sueldo_basico) as salario_promedio,
                    SUM(t.sueldo_basico) as masa_salarial
                FROM areas a
                LEFT JOIN trabajadores t ON a.id = t.area_id AND t.estado = 'activo'
                ${area !== 'todas' ? 'WHERE a.nombre = ?' : ''}
                GROUP BY a.id, a.nombre
                ORDER BY cantidad_empleados DESC
            `, area !== 'todas' ? [area] : []);

            // Conceptos más utilizados
            const conceptosStats = await query(`
                SELECT 
                    c.nombre,
                    c.tipo_concepto,
                    COUNT(dcp.id) as frecuencia_uso,
                    AVG(dcp.valor_calculado) as valor_promedio
                FROM conceptos c
                LEFT JOIN detalle_conceptos_planilla dcp ON c.id = dcp.concepto_id
                WHERE c.estado = 'activo'
                GROUP BY c.id, c.nombre, c.tipo_concepto
                ORDER BY frecuencia_uso DESC
                LIMIT 10
            `);

            res.json({
                success: true,
                data: {
                    resumen_general: trabajadorStats[0],
                    planillas_periodo: planillaStats[0],
                    estadisticas_areas: areaStats,
                    conceptos_frecuentes: conceptosStats,
                    periodo_analizado: periodo,
                    filtros_aplicados: {
                        tipo_personal: tipoPersonal,
                        area: area
                    }
                }
            });

        } catch (error) {
            console.error('Error obteniendo estadísticas del dashboard:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Obtener datos para las tarjetas de resumen
    async getSummaryCards(req, res) {
        try {
            const { periodo = 'mes-actual', tipoPersonal = 'todos', area = 'todas' } = req.query;
            const filters = ReportesController.buildFilters(req.query);

            // Total de salarios brutos
            const salariosBrutos = await query(`
                SELECT COALESCE(SUM(sueldo_basico), 0) as total
                FROM trabajadores t
                LEFT JOIN areas a ON t.area_id = a.id
                LEFT JOIN cargos c ON t.cargo_id = c.id
                WHERE t.estado = 'activo' ${filters.whereClause.replace('WHERE', 'AND')}
            `, filters.params);

            // Empleados activos
            const empleadosActivos = await query(`
                SELECT COUNT(*) as total
                FROM trabajadores t
                LEFT JOIN areas a ON t.area_id = a.id
                LEFT JOIN cargos c ON t.cargo_id = c.id
                WHERE t.estado = 'activo' ${filters.whereClause.replace('WHERE', 'AND')}
            `, filters.params);

            // Total descuentos (calculado como 25% promedio)
            const totalDescuentos = salariosBrutos[0].total * 0.25;

            // Salario promedio
            const salarioPromedio = empleadosActivos[0].total > 0 ? 
                salariosBrutos[0].total / empleadosActivos[0].total : 0;

            // Calcular cambios vs período anterior (simulado)
            const cambioSalarios = ReportesController.calculatePercentageChange(salariosBrutos[0].total, periodo);
            const cambioEmpleados = ReportesController.calculateEmployeeChange(empleadosActivos[0].total, periodo);

            res.json({
                success: true,
                data: {
                    total_salarios_brutos: {
                        valor: salariosBrutos[0].total,
                        cambio_porcentual: cambioSalarios.porcentaje,
                        direccion: cambioSalarios.direccion,
                        descripcion: cambioSalarios.descripcion
                    },
                    empleados_activos: {
                        valor: empleadosActivos[0].total,
                        cambio_absoluto: cambioEmpleados.cambio,
                        direccion: cambioEmpleados.direccion,
                        descripcion: cambioEmpleados.descripcion
                    },
                    total_descuentos: {
                        valor: totalDescuentos,
                        cambio_porcentual: 1.8,
                        direccion: 'up',
                        descripcion: '↗ +1.8% vs período anterior'
                    },
                    salario_promedio: {
                        valor: salarioPromedio,
                        cambio_porcentual: 2.1,
                        direccion: 'up',
                        descripcion: '↗ +2.1% mejora'
                    }
                }
            });

        } catch (error) {
            console.error('Error obteniendo tarjetas de resumen:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // =============================
    // DATOS PARA GRÁFICOS
    // =============================

    // Obtener evolución histórica de planillas
    async getPayrollEvolution(req, res) {
        try {
            const { meses = '12' } = req.query;
            const mesesNum = parseInt(meses);
            
            // Validar que mesesNum sea un número válido
            if (isNaN(mesesNum) || mesesNum <= 0 || mesesNum > 36) {
                return res.status(400).json({
                    success: false,
                    message: 'El parámetro "meses" debe ser un número entre 1 y 36'
                });
            }

            console.log('Ejecutando getPayrollEvolution con meses:', mesesNum);

            // Construir consulta completamente sin placeholders para evitar problemas
            const sqlQuery = `
                SELECT 
                    p.periodo,
                    COUNT(DISTINCT dp.trabajador_id) as total_empleados,
                    COALESCE(SUM(dp.total_ingresos), 0) as total_ingresos,
                    COALESCE(SUM(dp.total_descuentos), 0) as total_descuentos,
                    COALESCE(SUM(dp.neto_pagar), 0) as total_neto,
                    AVG(dp.sueldo_basico) as salario_promedio
                FROM planillas p
                LEFT JOIN detalle_planilla dp ON p.id = dp.planilla_id
                WHERE p.estado IN ('calculada', 'procesada')
                AND p.periodo >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL ${mesesNum} MONTH), '%Y-%m')
                GROUP BY p.periodo
                ORDER BY p.periodo ASC
                LIMIT ${mesesNum}
            `;

            console.log('Consulta SQL a ejecutar:', sqlQuery);

            const evolucion = await query(sqlQuery);

            console.log('Resultados de evolución:', evolucion.length, 'registros');

            // Formatear datos para el gráfico
            const chartData = evolucion.map(item => ({
                periodo: ReportesController.formatPeriod(item.periodo),
                total_empleados: item.total_empleados,
                total_ingresos: parseFloat(item.total_ingresos),
                total_descuentos: parseFloat(item.total_descuentos),
                total_neto: parseFloat(item.total_neto),
                salario_promedio: parseFloat(item.salario_promedio || 0)
            }));

            res.json({
                success: true,
                data: {
                    evolucion: chartData,
                    meses_analizados: mesesNum,
                    total_periodos: chartData.length
                }
            });

        } catch (error) {
            console.error('Error obteniendo evolución de planillas:', error);
            console.error('Detalles del error:', {
                message: error.message,
                code: error.code,
                errno: error.errno
            });
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Obtener distribución por área
    async getAreaDistribution(req, res) {
        try {
            const filters = ReportesController.buildFilters(req.query);

            const distribucion = await query(`
                SELECT 
                    a.nombre as area_nombre,
                    COUNT(t.id) as cantidad_empleados,
                    SUM(t.sueldo_basico) as masa_salarial,
                    AVG(t.sueldo_basico) as salario_promedio,
                    ROUND((COUNT(t.id) * 100.0 / (SELECT COUNT(*) FROM trabajadores WHERE estado = 'activo')), 2) as porcentaje
                FROM areas a
                LEFT JOIN trabajadores t ON a.id = t.area_id AND t.estado = 'activo'
                LEFT JOIN cargos c ON t.cargo_id = c.id
                ${filters.whereClause}
                GROUP BY a.id, a.nombre
                HAVING cantidad_empleados > 0
                ORDER BY cantidad_empleados DESC
            `, filters.params);

            res.json({
                success: true,
                data: {
                    distribucion,
                    total_areas: distribucion.length,
                    filtros_aplicados: req.query
                }
            });

        } catch (error) {
            console.error('Error obteniendo distribución por área:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Análisis de costos
    async getCostsAnalysis(req, res) {
        try {
            const filters = ReportesController.buildFilters(req.query);
            
            const analisisCostos = await query(`
                SELECT 
                    SUM(t.sueldo_basico) as salarios_brutos,
                    SUM(t.sueldo_basico) * 0.13 as descuentos_afp,
                    SUM(t.sueldo_basico) * 0.09 as descuentos_salud,
                    SUM(t.sueldo_basico) * 0.03 as otros_descuentos,
                    SUM(t.sueldo_basico) * 0.25 as total_descuentos,
                    SUM(t.sueldo_basico) * 0.75 as salarios_netos
                FROM trabajadores t
                LEFT JOIN areas a ON t.area_id = a.id
                LEFT JOIN cargos c ON t.cargo_id = c.id
                WHERE t.estado = 'activo' ${filters.whereClause.replace('WHERE', 'AND')}
            `, filters.params);

            const costos = analisisCostos[0];

            res.json({
                success: true,
                data: {
                    salarios_brutos: parseFloat(costos.salarios_brutos || 0),
                    descuentos: {
                        afp: parseFloat(costos.descuentos_afp || 0),
                        salud: parseFloat(costos.descuentos_salud || 0),
                        otros: parseFloat(costos.otros_descuentos || 0),
                        total: parseFloat(costos.total_descuentos || 0)
                    },
                    salarios_netos: parseFloat(costos.salarios_netos || 0),
                    filtros_aplicados: req.query
                }
            });

        } catch (error) {
            console.error('Error en análisis de costos:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Tendencias mensuales
    async getTrends(req, res) {
        try {
            const { meses = '12' } = req.query;
            const mesesNum = parseInt(meses);

            // Validar que mesesNum sea un número válido
            if (isNaN(mesesNum) || mesesNum <= 0 || mesesNum > 36) {
                return res.status(400).json({
                    success: false,
                    message: 'El parámetro "meses" debe ser un número entre 1 y 36'
                });
            }

            console.log('Ejecutando getTrends con meses:', mesesNum);

            // Construir consulta completamente sin placeholders
            const sqlQuery = `
                SELECT 
                    p.periodo,
                    COUNT(DISTINCT dp.trabajador_id) as empleados,
                    COALESCE(SUM(dp.total_ingresos), 0) as total_planilla,
                    AVG(dp.sueldo_basico) as salario_promedio,
                    COUNT(DISTINCT p.id) as planillas_procesadas
                FROM planillas p
                LEFT JOIN detalle_planilla dp ON p.id = dp.planilla_id
                WHERE p.estado IN ('calculada', 'procesada')
                AND p.periodo >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL ${mesesNum} MONTH), '%Y-%m')
                GROUP BY p.periodo
                ORDER BY p.periodo ASC
            `;

            console.log('Consulta SQL Trends a ejecutar:', sqlQuery);

            const tendencias = await query(sqlQuery);

            console.log('Resultados de tendencias:', tendencias.length, 'registros');

            const trendData = tendencias.map(item => ({
                periodo: ReportesController.formatPeriod(item.periodo),
                empleados: item.empleados,
                total_planilla: parseFloat(item.total_planilla),
                salario_promedio: parseFloat(item.salario_promedio || 0),
                planillas_procesadas: item.planillas_procesadas
            }));

            res.json({
                success: true,
                data: {
                    tendencias: trendData,
                    meses_analizados: mesesNum
                }
            });

        } catch (error) {
            console.error('Error obteniendo tendencias:', error);
            console.error('Detalles del error:', {
                message: error.message,
                code: error.code,
                errno: error.errno
            });
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // =============================
    // TABLAS DETALLADAS
    // =============================

    // Detalle estadístico por área
    async getDetailByArea(req, res) {
        try {
            const filters = ReportesController.buildFilters(req.query);

            const detalleAreas = await query(`
                SELECT 
                    a.nombre as area_nombre,
                    COUNT(t.id) as total_personal,
                    SUM(t.sueldo_basico) as sueldo_bruto,
                    SUM(t.sueldo_basico) * 0.25 as descuentos,
                    SUM(t.sueldo_basico) * 0.75 as sueldo_neto,
                    AVG(t.sueldo_basico) as promedio_persona,
                    MIN(t.sueldo_basico) as salario_minimo,
                    MAX(t.sueldo_basico) as salario_maximo,
                    COUNT(CASE WHEN t.tipo_contrato = 'indefinido' THEN 1 END) as contratos_indefinidos,
                    COUNT(CASE WHEN t.tipo_contrato = 'plazo_fijo' THEN 1 END) as contratos_plazo_fijo
                FROM areas a
                LEFT JOIN trabajadores t ON a.id = t.area_id AND t.estado = 'activo'
                LEFT JOIN cargos c ON t.cargo_id = c.id
                ${filters.whereClause}
                GROUP BY a.id, a.nombre
                HAVING total_personal > 0
                ORDER BY sueldo_bruto DESC
            `, filters.params);

            res.json({
                success: true,
                data: {
                    detalle_areas: detalleAreas,
                    total_areas: detalleAreas.length,
                    filtros_aplicados: req.query
                }
            });

        } catch (error) {
            console.error('Error obteniendo detalle por área:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Lista detallada de empleados
    async getEmployeesDetail(req, res) {
        try {
            const filters = ReportesController.buildFilters(req.query);

            const empleados = await query(`
                SELECT 
                    t.id,
                    t.dni,
                    CONCAT(t.nombres, ' ', t.apellido_paterno, ' ', t.apellido_materno) as nombre_completo,
                    a.nombre as area,
                    c.nombre as cargo,
                    t.sueldo_basico,
                    t.tipo_contrato,
                    t.fecha_ingreso,
                    DATEDIFF(CURDATE(), t.fecha_ingreso) as dias_servicio,
                    t.estado,
                    t.correo_electronico,
                    t.telefono_principal
                FROM trabajadores t
                LEFT JOIN areas a ON t.area_id = a.id
                LEFT JOIN cargos c ON t.cargo_id = c.id
                ${filters.whereClause}
                ORDER BY t.nombres, t.apellido_paterno
            `, filters.params);

            res.json({
                success: true,
                data: {
                    empleados,
                    total_empleados: empleados.length,
                    filtros_aplicados: req.query
                }
            });

        } catch (error) {
            console.error('Error obteniendo detalle de empleados:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Historial de planillas
    async getPayrollHistory(req, res) {
        try {
            const { limite = 20 } = req.query;

            const historial = await query(`
                SELECT 
                    p.id,
                    p.periodo,
                    p.tipo_planilla,
                    p.estado,
                    p.fecha_proceso,
                    p.total_trabajadores,
                    p.total_ingresos,
                    p.total_descuentos,
                    p.total_neto,
                    p.observaciones,
                    u.name as procesado_por
                FROM planillas p
                LEFT JOIN users u ON p.usuario_proceso_id = u.id
                ORDER BY p.fecha_proceso DESC
                LIMIT ?
            `, [parseInt(limite)]);

            res.json({
                success: true,
                data: {
                    historial,
                    total_registros: historial.length
                }
            });

        } catch (error) {
            console.error('Error obteniendo historial de planillas:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // =============================
    // EXPORTACIÓN
    // =============================

    // Exportar reporte completo a PDF (simulado)
    async exportCompletePDF(req, res) {
        try {
            // En una implementación real, aquí usarías librerías como puppeteer o pdfkit
            const reportData = await ReportesController.generateCompleteReportData(req.query);
            
            res.json({
                success: true,
                message: 'Reporte PDF generado exitosamente',
                data: {
                    filename: `reporte_completo_${new Date().toISOString().split('T')[0]}.pdf`,
                    size: '2.3 MB',
                    pages: 15,
                    sections: [
                        'Resumen Ejecutivo',
                        'Estadísticas Generales',
                        'Análisis por Área',
                        'Evolución Temporal',
                        'Detalle de Empleados'
                    ]
                }
            });

        } catch (error) {
            console.error('Error generando PDF completo:', error);
            res.status(500).json({
                success: false,
                message: 'Error generando reporte PDF',
                error: error.message
            });
        }
    }

    // Exportar a Excel
    async exportToExcel(req, res) {
        try {
            const reportData = await ReportesController.generateCompleteReportData(req.query);
            
            // En una implementación real, aquí usarías librerías como xlsx
            res.json({
                success: true,
                message: 'Archivo Excel generado exitosamente',
                data: {
                    filename: `reporte_planillas_${new Date().toISOString().split('T')[0]}.xlsx`,
                    sheets: [
                        'Resumen',
                        'Empleados',
                        'Por Área',
                        'Historial Planillas'
                    ],
                    size: '1.8 MB'
                }
            });

        } catch (error) {
            console.error('Error generando Excel:', error);
            res.status(500).json({
                success: false,
                message: 'Error generando archivo Excel',
                error: error.message
            });
        }
    }

    // Exportar tabla específica a PDF
    async exportTablePDF(req, res) {
        try {
            const { tabla } = req.query;
            let data;

            switch (tabla) {
                case 'area-detail':
                    data = await ReportesController.getDetailByAreaData(req.query);
                    break;
                case 'employees':
                    data = await ReportesController.getEmployeesDetailData(req.query);
                    break;
                case 'payroll-history':
                    data = await ReportesController.getPayrollHistoryData(req.query);
                    break;
                default:
                    throw new Error('Tipo de tabla no válido');
            }

            res.json({
                success: true,
                message: `Tabla ${tabla} exportada como PDF exitosamente`,
                data: {
                    filename: `${tabla}_${new Date().toISOString().split('T')[0]}.pdf`,
                    records: data.length
                }
            });

        } catch (error) {
            console.error('Error exportando tabla PDF:', error);
            res.status(500).json({
                success: false,
                message: 'Error exportando tabla PDF',
                error: error.message
            });
        }
    }

    // Exportar tabla específica a Excel
    async exportTableExcel(req, res) {
        try {
            const { tabla } = req.query;
            
            res.json({
                success: true,
                message: `Tabla ${tabla} exportada como Excel exitosamente`,
                data: {
                    filename: `${tabla}_${new Date().toISOString().split('T')[0]}.xlsx`
                }
            });

        } catch (error) {
            console.error('Error exportando tabla Excel:', error);
            res.status(500).json({
                success: false,
                message: 'Error exportando tabla Excel',
                error: error.message
            });
        }
    }

    // =============================
    // REPORTES ESPECÍFICOS
    // =============================

    // Generar reporte de planillas
    async generatePayrollReport(req, res) {
        try {
            const { formato, detallado = false } = req.query;
            
            setTimeout(() => {
                res.json({
                    success: true,
                    message: `Reporte de planillas generado en formato ${formato.toUpperCase()}`,
                    data: {
                        filename: `reporte_planillas_${new Date().toISOString().split('T')[0]}.${formato}`,
                        detallado: detallado === 'true'
                    }
                });
            }, 2000); // Simular tiempo de procesamiento

        } catch (error) {
            console.error('Error generando reporte de planillas:', error);
            res.status(500).json({
                success: false,
                message: 'Error generando reporte de planillas',
                error: error.message
            });
        }
    }

    // Generar reporte de personal
    async generateStaffReport(req, res) {
        try {
            const { formato, incluirHistorial = false } = req.query;
            
            setTimeout(() => {
                res.json({
                    success: true,
                    message: `Reporte de personal generado en formato ${formato.toUpperCase()}`,
                    data: {
                        filename: `reporte_personal_${new Date().toISOString().split('T')[0]}.${formato}`,
                        incluir_historial: incluirHistorial === 'true'
                    }
                });
            }, 2000);

        } catch (error) {
            console.error('Error generando reporte de personal:', error);
            res.status(500).json({
                success: false,
                message: 'Error generando reporte de personal',
                error: error.message
            });
        }
    }

    // Generar análisis financiero
    async generateFinancialReport(req, res) {
        try {
            const { formato, incluirProyecciones = false } = req.query;
            
            setTimeout(() => {
                res.json({
                    success: true,
                    message: `Análisis financiero generado en formato ${formato.toUpperCase()}`,
                    data: {
                        filename: `analisis_financiero_${new Date().toISOString().split('T')[0]}.${formato}`,
                        incluir_proyecciones: incluirProyecciones === 'true'
                    }
                });
            }, 2000);

        } catch (error) {
            console.error('Error generando análisis financiero:', error);
            res.status(500).json({
                success: false,
                message: 'Error generando análisis financiero',
                error: error.message
            });
        }
    }

    // Generar dashboard ejecutivo
    async generateExecutiveReport(req, res) {
        try {
            const { formato, incluirGraficos = true } = req.query;
            
            setTimeout(() => {
                res.json({
                    success: true,
                    message: `Dashboard ejecutivo generado en formato ${formato.toUpperCase()}`,
                    data: {
                        filename: `dashboard_ejecutivo_${new Date().toISOString().split('T')[0]}.${formato}`,
                        incluir_graficos: incluirGraficos === 'true'
                    }
                });
            }, 2000);

        } catch (error) {
            console.error('Error generando dashboard ejecutivo:', error);
            res.status(500).json({
                success: false,
                message: 'Error generando dashboard ejecutivo',
                error: error.message
            });
        }
    }

    // Generar análisis comparativo
    async generateComparativeReport(req, res) {
        try {
            const { formato, periodoComparacion = 'trimestre-anterior' } = req.query;
            
            setTimeout(() => {
                res.json({
                    success: true,
                    message: `Análisis comparativo generado en formato ${formato.toUpperCase()}`,
                    data: {
                        filename: `analisis_comparativo_${new Date().toISOString().split('T')[0]}.${formato}`,
                        periodo_comparacion: periodoComparacion
                    }
                });
            }, 2000);

        } catch (error) {
            console.error('Error generando análisis comparativo:', error);
            res.status(500).json({
                success: false,
                message: 'Error generando análisis comparativo',
                error: error.message
            });
        }
    }

    // Constructor de reportes personalizados
    async generateCustomReport(req, res) {
        try {
            const { formato } = req.query;
            const customConfig = req.body;
            
            // Aquí implementarías la lógica para reportes personalizados
            setTimeout(() => {
                res.json({
                    success: true,
                    message: `Reporte personalizado generado en formato ${formato.toUpperCase()}`,
                    data: {
                        filename: `reporte_personalizado_${new Date().toISOString().split('T')[0]}.${formato}`,
                        configuracion: customConfig
                    }
                });
            }, 3000);

        } catch (error) {
            console.error('Error generando reporte personalizado:', error);
            res.status(500).json({
                success: false,
                message: 'Error generando reporte personalizado',
                error: error.message
            });
        }
    }

    // =============================
    // RUTAS AUXILIARES
    // =============================

    // Obtener opciones para filtros
    async getFilterOptions(req, res) {
        try {
            const areas = await query('SELECT id, nombre FROM areas WHERE estado = "activo" ORDER BY nombre');
            const cargos = await query('SELECT id, nombre FROM cargos WHERE estado = "activo" ORDER BY nombre');
            const tiposPersonal = [
                { value: 'todos', label: 'Todos' },
                { value: 'docente', label: 'Docentes' },
                { value: 'administrativo', label: 'Administrativos' },
                { value: 'servicio', label: 'Personal de Servicio' }
            ];
            const periodos = [
                { value: 'mes-actual', label: 'Mes Actual' },
                { value: 'ultimo-trimestre', label: 'Último Trimestre' },
                { value: 'ultimo-semestre', label: 'Último Semestre' },
                { value: 'ultimo-año', label: 'Último Año' }
            ];

            res.json({
                success: true,
                data: {
                    areas,
                    cargos,
                    tipos_personal: tiposPersonal,
                    periodos
                }
            });

        } catch (error) {
            console.error('Error obteniendo opciones de filtros:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Obtener períodos disponibles
    async getAvailablePeriods(req, res) {
        try {
            const periodos = await query(`
                SELECT DISTINCT periodo, COUNT(*) as planillas_count
                FROM planillas 
                WHERE estado IN ('calculada', 'procesada')
                ORDER BY periodo DESC
                LIMIT 24
            `);

            res.json({
                success: true,
                data: {
                    periodos_disponibles: periodos,
                    total_periodos: periodos.length
                }
            });

        } catch (error) {
            console.error('Error obteniendo períodos disponibles:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Estadísticas rápidas
    async getQuickStats(req, res) {
        try {
            const quickStats = await query(`
                SELECT 
                    (SELECT COUNT(*) FROM trabajadores WHERE estado = 'activo') as trabajadores_activos,
                    (SELECT COUNT(*) FROM planillas WHERE estado = 'procesada') as planillas_procesadas,
                    (SELECT COUNT(*) FROM areas WHERE estado = 'activo') as areas_activas,
                    (SELECT COUNT(*) FROM conceptos WHERE estado = 'activo') as conceptos_activos
            `);

            res.json({
                success: true,
                data: quickStats[0]
            });

        } catch (error) {
            console.error('Error obteniendo estadísticas rápidas:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // =============================
    // FUNCIONES AUXILIARES ESTÁTICAS
    // =============================

    static buildFilters(queryParams) {
        const { tipoPersonal = 'todos', area = 'todas' } = queryParams;
        let whereConditions = [];
        let params = [];

        if (tipoPersonal !== 'todos') {
            // Mapear tipos de personal a las posiciones reales
            const tipoMapping = {
                'docente': 'Docente',
                'administrativo': 'Administrativo',
                'servicio': 'Personal de Servicio'
            };
            whereConditions.push('c.nombre LIKE ?');
            params.push(`%${tipoMapping[tipoPersonal] || tipoPersonal}%`);
        }

        if (area !== 'todas') {
            whereConditions.push('a.nombre = ?');
            params.push(area);
        }

        const whereClause = whereConditions.length > 0 ? 
            `WHERE ${whereConditions.join(' AND ')}` : '';

        return { whereClause, params };
    }

    static getPeriodCondition(periodo, column) {
        const conditions = {
            'mes-actual': `${column} = DATE_FORMAT(NOW(), '%Y-%m')`,
            'ultimo-trimestre': `${column} >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 3 MONTH), '%Y-%m')`,
            'ultimo-semestre': `${column} >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 6 MONTH), '%Y-%m')`,
            'ultimo-año': `${column} >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 12 MONTH), '%Y-%m')`
        };

        return conditions[periodo] || conditions['mes-actual'];
    }

    static formatPeriod(periodo) {
        if (!periodo) return '';
        const [year, month] = periodo.split('-');
        const months = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        return `${months[parseInt(month) - 1]} ${year}`;
    }

    static calculatePercentageChange(currentValue, periodo) {
        // Simulación del cálculo de cambio porcentual
        const changes = {
            'mes-actual': 3.2,
            'ultimo-trimestre': 5.8,
            'ultimo-semestre': 8.1,
            'ultimo-año': 12.4
        };

        const porcentaje = changes[periodo] || 3.2;
        return {
            porcentaje,
            direccion: 'up',
            descripcion: `↗ +${porcentaje}% vs período anterior`
        };
    }

    static calculateEmployeeChange(currentCount, periodo) {
        // Simulación del cálculo de cambio en empleados
        const cambio = Math.floor(Math.random() * 5) + 1;
        return {
            cambio,
            direccion: 'up',
            descripcion: `↗ +${cambio} nuevos ingresos`
        };
    }

    static async generateCompleteReportData(filters) {
        // Función auxiliar para generar datos completos del reporte
        return {
            resumen: {},
            empleados: [],
            areas: [],
            historial: []
        };
    }

    static async getDashboardStatsData(filters) {
        // Implementar lógica para obtener datos del dashboard
        return {};
    }

    static async getEmployeesDetailData(filters) {
        // Implementar lógica para obtener datos de empleados
        return [];
    }

    static async getDetailByAreaData(filters) {
        // Implementar lógica para obtener datos por área
        return [];
    }

    static async getPayrollHistoryData(filters) {
        // Implementar lógica para obtener historial de planillas
        return [];
    }
}

module.exports = new ReportesController();