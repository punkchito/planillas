// routes/reportes.js
const express = require('express');
const { query, param, validationResult } = require('express-validator');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const reportesController = require('../controllers/reportesController');

const router = express.Router();

// Middleware para validar errores
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Errores de validación',
            errors: errors.array()
        });
    }
    next();
};

// Validaciones para filtros de reportes
const validateReportFilters = [
    query('periodo').optional().isIn(['mes-actual', 'ultimo-trimestre', 'ultimo-semestre', 'ultimo-año']),
    query('tipoPersonal').optional().isIn(['todos', 'docente', 'administrativo', 'servicio']),
    query('area').optional().isString(),
    query('fechaInicio').optional().isISO8601(),
    query('fechaFin').optional().isISO8601()
];

// RUTAS PRINCIPALES PARA DASHBOARD Y ESTADÍSTICAS

// GET /api/reportes/dashboard - Estadísticas generales del dashboard
router.get('/dashboard',
    //authenticateToken,
    validateReportFilters,
    handleValidationErrors,
    reportesController.getDashboardStats
);

// GET /api/reportes/summary - Resumen ejecutivo con tarjetas principales
router.get('/summary',
    //authenticateToken,
    validateReportFilters,
    handleValidationErrors,
    reportesController.getSummaryCards
);

// RUTAS PARA DATOS DE GRÁFICOS

// GET /api/reportes/payroll-evolution - Evolución histórica de planillas
router.get('/payroll-evolution',
    //authenticateToken,
    [
        query('meses').optional().isInt({ min: 6, max: 24 })
    ],
    handleValidationErrors,
    reportesController.getPayrollEvolution
);

// GET /api/reportes/area-distribution - Distribución de personal por área
router.get('/area-distribution',
    //authenticateToken,
    validateReportFilters,
    handleValidationErrors,
    reportesController.getAreaDistribution
);

// GET /api/reportes/costs-analysis - Análisis de costos (bruto, descuentos, neto)
router.get('/costs-analysis',
    //authenticateToken,
    validateReportFilters,
    handleValidationErrors,
    reportesController.getCostsAnalysis
);

// GET /api/reportes/trends - Tendencias mensuales (empleados vs planilla total)
router.get('/trends',
    //authenticateToken,
    [
        query('meses').optional().isInt({ min: 6, max: 24 })
    ],
    handleValidationErrors,
    reportesController.getTrends
);

// RUTAS PARA TABLAS DETALLADAS

// GET /api/reportes/detail-by-area - Detalle estadístico por área
router.get('/detail-by-area',
    //authenticateToken,
    validateReportFilters,
    handleValidationErrors,
    reportesController.getDetailByArea
);

// GET /api/reportes/employees-detail - Lista detallada de empleados con filtros
router.get('/employees-detail',
    //authenticateToken,
    validateReportFilters,
    handleValidationErrors,
    reportesController.getEmployeesDetail
);

// GET /api/reportes/payroll-history - Historial detallado de planillas
router.get('/payroll-history',
    //authenticateToken,
    [
        query('limite').optional().isInt({ min: 1, max: 100 })
    ],
    handleValidationErrors,
    reportesController.getPayrollHistory
);

// RUTAS PARA EXPORTACIÓN

// POST /api/reportes/export/pdf - Exportar reporte completo a PDF
router.post('/export/pdf',
    //authenticateToken,
    validateReportFilters,
    handleValidationErrors,
    reportesController.exportCompletePDF
);

// POST /api/reportes/export/excel - Exportar datos a Excel
router.post('/export/excel',
    //authenticateToken,
    validateReportFilters,
    handleValidationErrors,
    reportesController.exportToExcel
);

// POST /api/reportes/export/table-pdf - Exportar tabla específica a PDF
router.post('/export/table-pdf',
    //authenticateToken,
    [
        query('tabla').isIn(['area-detail', 'employees', 'payroll-history'])
    ],
    handleValidationErrors,
    reportesController.exportTablePDF
);

// POST /api/reportes/export/table-excel - Exportar tabla específica a Excel
router.post('/export/table-excel',
    //authenticateToken,
    [
        query('tabla').isIn(['area-detail', 'employees', 'payroll-history'])
    ],
    handleValidationErrors,
    reportesController.exportTableExcel
);

// RUTAS PARA REPORTES ESPECÍFICOS

// POST /api/reportes/generate/payroll - Generar reporte específico de planillas
router.post('/generate/payroll',
    //authenticateToken,
    //authorizeRole(['admin']),
    [
        query('formato').isIn(['pdf', 'excel']),
        query('detallado').optional().isBoolean()
    ],
    handleValidationErrors,
    reportesController.generatePayrollReport
);

// POST /api/reportes/generate/staff - Generar reporte específico de personal
router.post('/generate/staff',
    //authenticateToken,
    //authorizeRole(['admin']),
    [
        query('formato').isIn(['pdf', 'excel']),
        query('incluirHistorial').optional().isBoolean()
    ],
    handleValidationErrors,
    reportesController.generateStaffReport
);

// POST /api/reportes/generate/financial - Generar análisis financiero
router.post('/generate/financial',
    //authenticateToken,
    //authorizeRole(['admin']),
    [
        query('formato').isIn(['pdf', 'excel']),
        query('incluirProyecciones').optional().isBoolean()
    ],
    handleValidationErrors,
    reportesController.generateFinancialReport
);

// POST /api/reportes/generate/executive - Generar dashboard ejecutivo
router.post('/generate/executive',
    //authenticateToken,
    //authorizeRole(['admin']),
    [
        query('formato').isIn(['pdf', 'ppt']),
        query('incluirGraficos').optional().isBoolean()
    ],
    handleValidationErrors,
    reportesController.generateExecutiveReport
);

// POST /api/reportes/generate/comparative - Generar análisis comparativo
router.post('/generate/comparative',
    //authenticateToken,
    //authorizeRole(['admin']),
    [
        query('formato').isIn(['pdf', 'excel']),
        query('periodoComparacion').optional().isString()
    ],
    handleValidationErrors,
    reportesController.generateComparativeReport
);

// POST /api/reportes/generate/custom - Constructor de reportes personalizados
router.post('/generate/custom',
    //authenticateToken,
    [
        query('formato').isIn(['pdf', 'excel']),
        // Validaciones adicionales para reportes personalizados se manejan en el controlador
    ],
    handleValidationErrors,
    reportesController.generateCustomReport
);

// RUTAS AUXILIARES

// GET /api/reportes/filters/options - Obtener opciones disponibles para filtros
router.get('/filters/options',
    //authenticateToken,
    reportesController.getFilterOptions
);

// GET /api/reportes/periods/available - Obtener períodos disponibles
router.get('/periods/available',
    //authenticateToken,
    reportesController.getAvailablePeriods
);

// GET /api/reportes/stats/quick - Estadísticas rápidas para validaciones
router.get('/stats/quick',
    //authenticateToken,
    reportesController.getQuickStats
);

module.exports = router;