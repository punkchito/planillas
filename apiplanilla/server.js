// server.js - ACTUALIZADO CON MÓDULO DE INDICADORES DE RRHH
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importar configuración de base de datos
const { testConnection } = require('./config/database');

// Importar rutas EXISTENTES
const authRoutes = require('./routes/auth');
const trabajadoresRoutes = require('./routes/trabajadores');
const areasRoutes = require('./routes/areas');
const cargosRoutes = require('./routes/cargos');
const conceptosRoutes = require('./routes/conceptos');
const planillasRoutes = require('./routes/planillas');
const solicitudesRoutes = require('./routes/solicitudes');
const permissionsRoutes = require('./routes/permissions');
const systemConfigRoutes = require('./routes/systemConfig');
const departmentsRoutes = require('./routes/departments');
const systemUsersRoutes = require('./routes/systemUsers');
const usersRoutes = require('./routes/users');
const rolesRoutes = require('./routes/roles');
const reportesRoutes = require('./routes/reportes');         // ← NUEVA RUTA

// Importar NUEVA ruta para indicadores de RRHH
const indicadoresRoutes = require('./routes/indicadores');         // ← NUEVA RUTA

const importController = require('./controllers/importController');

// Crear aplicación Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware global
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware de logging para desarrollo
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} - ${req.method} ${req.path}`);

    // Log del body para requests POST/PUT (solo en desarrollo)
    if (process.env.NODE_ENV === 'development' && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
        console.log('Body:', JSON.stringify(req.body, null, 2));
    }

    next();
});

// RUTAS PRINCIPALES EXISTENTES
app.use('/api/auth', authRoutes);
app.use('/api/trabajadores', trabajadoresRoutes);
app.use('/api/areas', areasRoutes);
app.use('/api/cargos', cargosRoutes);
app.use('/api/conceptos', conceptosRoutes);
app.use('/api/planillas', planillasRoutes);
app.use('/api/solicitudes', solicitudesRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/system-config', systemConfigRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/system-users', systemUsersRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/reportes', reportesRoutes);                    // ← NUEVA RUTA

// NUEVA RUTA PARA GESTIÓN DE INDICADORES DE RRHH
app.use('/api/indicadores', indicadoresRoutes);                    // ← NUEVA RUTA

// RUTAS ESPECÍFICAS PARA IMPORTACIÓN/EXPORTACIÓN
app.post('/api/trabajadores/import',
    importController.uploadFile,
    (req, res, next) => {
        if (req.file) {
            importController.importarTrabajadores(req, res);
        } else {
            res.status(400).json({
                success: false,
                message: 'No se ha proporcionado ningún archivo CSV'
            });
        }
    }
);

app.get('/api/trabajadores/plantilla-csv', importController.getPlantillaCSV);

// RUTA DE ESTADO DEL SERVIDOR
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Sistema de Planillas - Servidor funcionando correctamente',
        timestamp: new Date().toISOString(),
        version: '1.2.0', // ← VERSIÓN ACTUALIZADA
        environment: process.env.NODE_ENV || 'development',
        modules: {
            auth: 'Sistema de autenticación y autorización',
            trabajadores: 'Gestión completa de trabajadores',
            areas: 'Gestión de áreas organizacionales',
            cargos: 'Gestión de cargos y posiciones',
            conceptos: 'Gestión de conceptos de planilla (ingresos, descuentos, aportes)',
            planillas: 'Procesamiento y gestión de planillas de pago',
            solicitudes: 'Gestión completa de solicitudes del personal',
            users: 'Gestión completa de usuarios del sistema',
            roles: 'Gestión de roles y permisos granulares',
            indicadores: 'Sistema dinámico de gestión de indicadores de RRHH',  // ← NUEVO MÓDULO
            import_export: 'Importación y exportación de datos CSV',
            reports: 'Generación de reportes y estadísticas'
        }
    });
});

// DOCUMENTACIÓN DE RUTAS API ACTUALIZADA
app.get('/api/routes', (req, res) => {
    const routes = {
        auth: [
            'POST /api/auth/login - Iniciar sesión',
            'POST /api/auth/register - Registrar usuario',
            'GET /api/auth/profile - Obtener perfil del usuario',
            'POST /api/auth/verify-token - Verificar token'
        ],
        trabajadores: [
            'GET /api/trabajadores - Obtener lista de trabajadores (con filtros)',
            'GET /api/trabajadores/estadisticas - Obtener estadísticas',
            'GET /api/trabajadores/export - Exportar trabajadores a CSV',
            'GET /api/trabajadores/:id - Obtener trabajador específico',
            'POST /api/trabajadores - Crear nuevo trabajador',
            'PUT /api/trabajadores/:id - Actualizar trabajador',
            'PATCH /api/trabajadores/:id/estado - Cambiar estado del trabajador',
            'DELETE /api/trabajadores/:id - Eliminar trabajador',
            'POST /api/trabajadores/import - Importar trabajadores desde CSV',
            'GET /api/trabajadores/plantilla-csv - Descargar plantilla CSV'
        ],
        areas: [
            'GET /api/areas - Obtener todas las áreas',
            'GET /api/areas/activas - Obtener áreas activas',
            'POST /api/areas - Crear nueva área',
            'PUT /api/areas/:id - Actualizar área'
        ],
        cargos: [
            'GET /api/cargos - Obtener todos los cargos',
            'GET /api/cargos/activos - Obtener cargos activos',
            'POST /api/cargos - Crear nuevo cargo',
            'PUT /api/cargos/:id - Actualizar cargo'
        ],
        conceptos: [
            'GET /api/conceptos - Obtener lista de conceptos (con filtros)',
            'GET /api/conceptos/estadisticas - Obtener estadísticas de conceptos',
            'GET /api/conceptos/variables - Obtener variables para fórmulas',
            'GET /api/conceptos/export - Exportar conceptos a CSV',
            'GET /api/conceptos/tipo/:tipo - Obtener conceptos por tipo',
            'GET /api/conceptos/codigo/:codigo - Obtener concepto por código',
            'GET /api/conceptos/:id - Obtener concepto específico',
            'POST /api/conceptos - Crear nuevo concepto',
            'PUT /api/conceptos/:id - Actualizar concepto',
            'PATCH /api/conceptos/:id/estado - Cambiar estado del concepto',
            'POST /api/conceptos/:id/probar - Probar concepto con datos de muestra',
            'POST /api/conceptos/validar-formula - Validar fórmula',
            'DELETE /api/conceptos/:id - Eliminar concepto'
        ],
        planillas: [
            'POST /api/planillas/calcular - Calcular planilla (vista previa)',
            'POST /api/planillas/procesar - Procesar planilla definitivamente',
            'GET /api/planillas/historial - Obtener historial de planillas procesadas',
            'GET /api/planillas/:id - Obtener planilla específica',
            'GET /api/planillas/:id/detalle - Obtener detalle completo de planilla',
            'GET /api/planillas/:id/export - Exportar planilla específica a CSV'
        ],
        solicitudes: [
            'GET /api/solicitudes - Obtener lista de solicitudes (con filtros)',
            'GET /api/solicitudes/estadisticas - Obtener estadísticas de solicitudes',
            'GET /api/solicitudes/pendientes - Obtener solicitudes pendientes de aprobación',
            'GET /api/solicitudes/historial - Obtener historial de solicitudes procesadas',
            'GET /api/solicitudes/trabajadores - Obtener trabajadores activos para select',
            'GET /api/solicitudes/export - Exportar solicitudes a CSV',
            'GET /api/solicitudes/:id - Obtener solicitud específica con timeline',
            'POST /api/solicitudes - Crear nueva solicitud',
            'PUT /api/solicitudes/:id - Actualizar solicitud',
            'PATCH /api/solicitudes/:id/estado - Cambiar estado de solicitud (aprobar/rechazar)',
            'POST /api/solicitudes/:id/reactivar - Reactivar solicitud rechazada',
            'DELETE /api/solicitudes/:id - Eliminar solicitud'
        ],
        users: [
            'GET /api/users - Obtener lista de usuarios (con filtros y paginación)',
            'GET /api/users/estadisticas - Obtener estadísticas de usuarios',
            'GET /api/users/export - Exportar usuarios a CSV',
            'GET /api/users/audit-logs - Obtener logs de auditoría de usuarios',
            'GET /api/users/:id - Obtener usuario específico con permisos',
            'POST /api/users - Crear nuevo usuario',
            'PUT /api/users/:id - Actualizar usuario completo',
            'PATCH /api/users/:id/status - Cambiar estado de usuario (activar/desactivar)',
            'DELETE /api/users/:id - Eliminar usuario',
            'POST /api/users/import - Importar usuarios desde CSV'
        ],
        roles: [
            'GET /api/roles - Obtener lista de roles con estadísticas',
            'GET /api/roles/estadisticas - Obtener estadísticas de roles y permisos',
            'GET /api/roles/permissions - Obtener todos los permisos disponibles agrupados',
            'GET /api/roles/:id - Obtener rol específico con usuarios asignados',
            'GET /api/roles/:id/permissions - Obtener permisos de un rol específico',
            'POST /api/roles - Crear nuevo rol con permisos',
            'PUT /api/roles/:id - Actualizar información del rol',
            'PUT /api/roles/:id/permissions - Actualizar permisos del rol',
            'POST /api/roles/:id/clone - Clonar rol existente',
            'DELETE /api/roles/:id - Eliminar rol (si no tiene usuarios asignados)'
        ],
        indicadores: [ // ← NUEVAS RUTAS PARA INDICADORES
            // Variables
            'GET /api/indicadores/variables - Obtener todas las variables con estadísticas',
            'POST /api/indicadores/variables - Crear nueva variable',
            'PUT /api/indicadores/variables/:id - Actualizar variable',
            'DELETE /api/indicadores/variables/:id - Eliminar variable',

            // Dimensiones
            'GET /api/indicadores/dimensions - Obtener dimensiones con indicadores',
            'POST /api/indicadores/dimensions - Crear nueva dimensión',
            'PUT /api/indicadores/dimensions/:id - Actualizar dimensión',
            'DELETE /api/indicadores/dimensions/:id - Eliminar dimensión',

            // Indicadores
            'GET /api/indicadores - Obtener indicadores con filtros avanzados',
            'GET /api/indicadores/:id - Obtener indicador específico con datos históricos',
            'POST /api/indicadores - Crear nuevo indicador',
            'PUT /api/indicadores/:id - Actualizar indicador',
            'DELETE /api/indicadores/:id - Eliminar indicador',

            // Dashboard y reportes
            'GET /api/indicadores/dashboard - Estadísticas completas del dashboard',
            'GET /api/indicadores/tree - Estructura jerárquica completa (árbol)',
            'GET /api/indicadores/trends - Reporte de tendencias históricas',
            'GET /api/indicadores/export - Exportar datos (variables, dimensiones, indicadores)',
            'POST /api/indicadores/validate-formula - Validar fórmulas de cálculo'
        ],
        utilities: [
            'GET /api/health - Estado del servidor',
            'GET /api/routes - Documentación de rutas disponibles'
        ],
        'system-config': [
            'GET /api/system-config/general - Obtener configuración general',
            'PUT /api/system-config/general - Actualizar configuración general',
            'GET /api/system-config/planillas - Obtener configuración de planillas',
            'PUT /api/system-config/planillas - Actualizar configuración de planillas',
            'GET /api/system-config/notifications - Obtener configuración de notificaciones',
            'PUT /api/system-config/notifications - Actualizar configuración de notificaciones',
            'GET /api/system-config/logs - Obtener logs del sistema',
            'DELETE /api/system-config/logs/clear - Limpiar logs antiguos',
            'GET /api/system-config/statistics - Estadísticas generales del sistema',
            'GET /api/system-config/export - Exportar configuración completa'
        ],
        departments: [
            'GET /api/departments - Obtener departamentos',
            'GET /api/departments/statistics - Estadísticas de departamentos',
            'GET /api/departments/:id - Obtener departamento específico',
            'GET /api/departments/:id/workers - Obtener trabajadores del departamento',
            'GET /api/departments/:id/positions - Obtener cargos del departamento',
            'POST /api/departments - Crear departamento',
            'PUT /api/departments/:id - Actualizar departamento',
            'PATCH /api/departments/:id/status - Cambiar estado del departamento',
            'DELETE /api/departments/:id - Eliminar departamento'
        ],
        'system-users': [
            'GET /api/system-users - Obtener usuarios del sistema',
            'GET /api/system-users/statistics - Estadísticas de usuarios',
            'GET /api/system-users/export - Exportar usuarios a CSV',
            'GET /api/system-users/roles - Obtener roles disponibles',
            'GET /api/system-users/:id - Obtener usuario específico',
            'POST /api/system-users - Crear usuario',
            'PUT /api/system-users/:id - Actualizar usuario',
            'PATCH /api/system-users/:id/status - Cambiar estado del usuario',
            'POST /api/system-users/:id/reset-password - Resetear contraseña',
            'DELETE /api/system-users/:id - Eliminar usuario'
        ],
        reportes: [ // ← NUEVAS RUTAS PARA REPORTES
            // Dashboard y estadísticas
            'GET /api/reportes/dashboard - Estadísticas generales del dashboard',
            'GET /api/reportes/summary - Tarjetas de resumen ejecutivo',

            // Datos para gráficos
            'GET /api/reportes/payroll-evolution - Evolución histórica de planillas',
            'GET /api/reportes/area-distribution - Distribución de personal por área',
            'GET /api/reportes/costs-analysis - Análisis de costos detallado',
            'GET /api/reportes/trends - Tendencias mensuales',

            // Tablas detalladas
            'GET /api/reportes/detail-by-area - Detalle estadístico por área',
            'GET /api/reportes/employees-detail - Lista detallada de empleados',
            'GET /api/reportes/payroll-history - Historial de planillas procesadas',

            // Exportación
            'POST /api/reportes/export/pdf - Exportar reporte completo a PDF',
            'POST /api/reportes/export/excel - Exportar datos a Excel',
            'POST /api/reportes/export/table-pdf - Exportar tabla específica a PDF',
            'POST /api/reportes/export/table-excel - Exportar tabla específica a Excel',

            // Reportes específicos
            'POST /api/reportes/generate/payroll - Generar reporte de planillas',
            'POST /api/reportes/generate/staff - Generar reporte de personal',
            'POST /api/reportes/generate/financial - Generar análisis financiero',
            'POST /api/reportes/generate/executive - Generar dashboard ejecutivo',
            'POST /api/reportes/generate/comparative - Generar análisis comparativo',
            'POST /api/reportes/generate/custom - Constructor de reportes personalizados',

            // Auxiliares
            'GET /api/reportes/filters/options - Opciones para filtros',
            'GET /api/reportes/periods/available - Períodos disponibles',
            'GET /api/reportes/stats/quick - Estadísticas rápidas'
        ]
    };

    res.json({
        success: true,
        message: 'API Sistema de Planillas - Rutas disponibles',
        server_info: {
            version: '1.2.0', // ← VERSIÓN ACTUALIZADA
            environment: process.env.NODE_ENV || 'development',
            port: PORT,
            database: 'MySQL - sistema_planillas'
        },
        data: routes
    });
});

// RUTA PARA MANEJAR RUTAS NO ENCONTRADAS
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
        suggestion: 'Consulta las rutas disponibles en GET /api/routes',
        available_endpoints: {
            health: '/api/health',
            routes: '/api/routes',
            auth: '/api/auth/*',
            trabajadores: '/api/trabajadores/*',
            areas: '/api/areas/*',
            cargos: '/api/cargos/*',
            conceptos: '/api/conceptos/*',
            planillas: '/api/planillas/*',
            solicitudes: '/api/solicitudes/*',
            users: '/api/users/*',
            roles: '/api/roles/*',
            indicadores: '/api/indicadores/*'    // ← NUEVO ENDPOINT
        }
    });
});

// MIDDLEWARE DE MANEJO DE ERRORES GLOBAL
app.use((error, req, res, next) => {
    console.error('⚠ Error no manejado:', error);

    // Error específico de Multer (archivos)
    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            success: false,
            message: 'El archivo es demasiado grande. Máximo 5MB permitido.',
            error_code: 'FILE_TOO_LARGE'
        });
    }

    // Error específico de tipo de archivo
    if (error.message === 'Solo se permiten archivos CSV') {
        return res.status(400).json({
            success: false,
            message: 'Solo se permiten archivos CSV',
            error_code: 'INVALID_FILE_TYPE'
        });
    }

    // Error de validación de express-validator
    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({
            success: false,
            message: 'JSON inválido en el cuerpo de la petición',
            error_code: 'INVALID_JSON'
        });
    }

    // Error genérico
    const statusCode = error.status || error.statusCode || 500;
    const errorResponse = {
        success: false,
        message: error.message || 'Error interno del servidor',
        error_code: error.code || 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
    };

    // Incluir stack trace solo en desarrollo
    if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = error.stack;
        errorResponse.details = error;
    }

    res.status(statusCode).json(errorResponse);
});

// FUNCIÓN PARA INICIALIZAR EL SERVIDOR
const startServer = async () => {
    try {
        // Probar conexión a la base de datos
        console.log('🔄 Probando conexión a la base de datos...');
        const dbConnected = await testConnection();

        if (!dbConnected) {
            console.error('⚠ No se pudo conectar a la base de datos. Verificar configuración en .env');
            console.error('Variables necesarias: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME');
            process.exit(1);
        }

        // Iniciar servidor HTTP
        const server = app.listen(PORT, () => {
            console.log('\n🚀 ===============================================');
            console.log('   SISTEMA DE PLANILLAS - BACKEND INICIADO');
            console.log('===============================================');
            console.log(`📡 Puerto: ${PORT}`);
            console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔗 CORS habilitado para: ${process.env.FRONTEND_URL || 'http://localhost:4200'}`);
            console.log(`📊 Base de datos: MySQL (${process.env.DB_NAME || 'sistema_planillas'})`);
            console.log('\n📋 MÓDULOS HABILITADOS:');
            console.log('   ✅ Autenticación y autorización');
            console.log('   ✅ Gestión de trabajadores');
            console.log('   ✅ Gestión de áreas');
            console.log('   ✅ Gestión de cargos');
            console.log('   ✅ Gestión de conceptos de planilla');
            console.log('   ✅ Procesamiento de planillas');
            console.log('   ✅ Gestión de solicitudes del personal');
            console.log('   ✅ Gestión completa de usuarios del sistema');
            console.log('   ✅ Gestión de roles y permisos granulares');
            console.log('   ✅ Sistema dinámico de indicadores de RRHH'); // ← NUEVO
            console.log('   ✅ Importación/Exportación CSV');
            console.log('   ✅ Estadísticas y reportes');
            console.log('\n🔗 ENDPOINTS PRINCIPALES:');
            console.log(`   📚 Documentación: http://localhost:${PORT}/api/routes`);
            console.log(`   🥇 Estado: http://localhost:${PORT}/api/health`);
            console.log(`   💰 Planillas: http://localhost:${PORT}/api/planillas/*`);
            console.log(`   📋 Solicitudes: http://localhost:${PORT}/api/solicitudes/*`);
            console.log(`   👥 Usuarios: http://localhost:${PORT}/api/users/*`);
            console.log(`   🛡️ Roles: http://localhost:${PORT}/api/roles/*`);
            console.log(`   📊 Indicadores: http://localhost:${PORT}/api/indicadores/*`);  // ← NUEVO
            console.log('\n===============================================\n');
        });

        // Configurar timeout del servidor
        server.timeout = 30000; // 30 segundos

    } catch (error) {
        console.error('⚠ Error crítico iniciando el servidor:', error);
        process.exit(1);
    }
};

// MANEJO DE SEÑALES DEL SISTEMA
process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando servidor por SIGINT...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Cerrando servidor por SIGTERM...');
    process.exit(0);
});

// MANEJO DE ERRORES NO CAPTURADOS
process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠ Promesa rechazada no manejada en:', promise);
    console.error('Razón:', reason);
    // No salir del proceso inmediatamente para permitir log cleanup
});

process.on('uncaughtException', (error) => {
    console.error('⚠ Excepción no capturada:', error);
    // Salir del proceso después de un error crítico
    setTimeout(() => process.exit(1), 1000);
});

// INICIAR SERVIDOR
if (require.main === module) {
    startServer();
}

module.exports = app;