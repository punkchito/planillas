// routes/permissions.js
const express = require('express');
const router = express.Router();

// Mock data - En una implementación real, estos vendrían de la base de datos
const permissions = [
    // Permisos de Sistema
    { id: 'system.users', name: 'Gestionar Usuarios', group_id: 'system', group_name: 'Sistema', description: 'Crear, editar y eliminar usuarios del sistema' },
    { id: 'system.roles', name: 'Gestionar Roles', group_id: 'system', group_name: 'Sistema', description: 'Crear y modificar roles de usuarios' },
    { id: 'system.logs', name: 'Ver Logs de Auditoría', group_id: 'system', group_name: 'Sistema', description: 'Acceso a logs de auditoría del sistema' },
    { id: 'system.settings', name: 'Configuración del Sistema', group_id: 'system', group_name: 'Sistema', description: 'Acceso a configuraciones globales' },
    
    // Permisos de Planillas
    { id: 'planillas.view', name: 'Ver Planillas', group_id: 'planillas', group_name: 'Planillas', description: 'Visualizar planillas de pago' },
    { id: 'planillas.create', name: 'Crear Planillas', group_id: 'planillas', group_name: 'Planillas', description: 'Generar nuevas planillas' },
    { id: 'planillas.edit', name: 'Editar Planillas', group_id: 'planillas', group_name: 'Planillas', description: 'Modificar planillas existentes' },
    { id: 'planillas.delete', name: 'Eliminar Planillas', group_id: 'planillas', group_name: 'Planillas', description: 'Borrar planillas del sistema' },
    { id: 'planillas.process', name: 'Procesar Planillas', group_id: 'planillas', group_name: 'Planillas', description: 'Ejecutar procesamiento de planillas' },
    
    // Permisos de Trabajadores
    { id: 'trabajadores.view', name: 'Ver Trabajadores', group_id: 'trabajadores', group_name: 'Trabajadores', description: 'Acceso a datos de trabajadores' },
    { id: 'trabajadores.create', name: 'Crear Trabajadores', group_id: 'trabajadores', group_name: 'Trabajadores', description: 'Registrar nuevos trabajadores' },
    { id: 'trabajadores.edit', name: 'Editar Trabajadores', group_id: 'trabajadores', group_name: 'Trabajadores', description: 'Modificar información de trabajadores' },
    { id: 'trabajadores.delete', name: 'Eliminar Trabajadores', group_id: 'trabajadores', group_name: 'Trabajadores', description: 'Eliminar trabajadores del sistema' },
    
    // Permisos de Conceptos
    { id: 'conceptos.view', name: 'Ver Conceptos', group_id: 'conceptos', group_name: 'Conceptos', description: 'Ver conceptos de planilla' },
    { id: 'conceptos.create', name: 'Crear Conceptos', group_id: 'conceptos', group_name: 'Conceptos', description: 'Crear nuevos conceptos' },
    { id: 'conceptos.edit', name: 'Editar Conceptos', group_id: 'conceptos', group_name: 'Conceptos', description: 'Modificar conceptos existentes' },
    { id: 'conceptos.delete', name: 'Eliminar Conceptos', group_id: 'conceptos', group_name: 'Conceptos', description: 'Eliminar conceptos del sistema' },
    
    // Permisos de Solicitudes
    { id: 'solicitudes.view', name: 'Ver Solicitudes', group_id: 'solicitudes', group_name: 'Solicitudes', description: 'Ver solicitudes del personal' },
    { id: 'solicitudes.create', name: 'Crear Solicitudes', group_id: 'solicitudes', group_name: 'Solicitudes', description: 'Crear nuevas solicitudes' },
    { id: 'solicitudes.approve', name: 'Aprobar Solicitudes', group_id: 'solicitudes', group_name: 'Solicitudes', description: 'Aprobar o rechazar solicitudes' },
    { id: 'solicitudes.manage', name: 'Gestionar Solicitudes', group_id: 'solicitudes', group_name: 'Solicitudes', description: 'Administrar todas las solicitudes' },
    
    // Permisos de Reportes
    { id: 'reports.view', name: 'Ver Reportes', group_id: 'reports', group_name: 'Reportes', description: 'Acceso a reportes del sistema' },
    { id: 'reports.export', name: 'Exportar Reportes', group_id: 'reports', group_name: 'Reportes', description: 'Exportar datos y reportes' },
    { id: 'reports.advanced', name: 'Reportes Avanzados', group_id: 'reports', group_name: 'Reportes', description: 'Crear reportes personalizados' }
];

// GET /api/permissions - Obtener todos los permisos
router.get('/', (req, res) => {
    try {
        res.json({
            success: true,
            data: permissions
        });
    } catch (error) {
        console.error('Error obteniendo permisos:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

// GET /api/permissions/groups - Obtener permisos agrupados
router.get('/groups', (req, res) => {
    try {
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
        console.error('Error obteniendo permisos agrupados:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

// GET /api/permissions/:id - Obtener permiso específico
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const permission = permissions.find(p => p.id === id);
        
        if (!permission) {
            return res.status(404).json({
                success: false,
                message: 'Permiso no encontrado'
            });
        }

        res.json({
            success: true,
            data: permission
        });
    } catch (error) {
        console.error('Error obteniendo permiso:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

module.exports = router;