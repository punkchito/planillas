// utils/notificationHelper.js - Helper para manejo de notificaciones del sistema
const nodemailer = require('nodemailer');
const { query } = require('../config/database');

class NotificationHelper {
    constructor() {
        this.transporter = null;
        this.isConfigured = false;
    }

    // Configurar transporter SMTP
    async configureMailer() {
        try {
            // Obtener configuración SMTP desde la base de datos
            const smtpConfig = await this.getNotificationSettings();
            
            if (!smtpConfig.smtp_server || !smtpConfig.smtp_user) {
                console.warn('Configuración SMTP incompleta');
                return false;
            }

            this.transporter = nodemailer.createTransporter({
                host: smtpConfig.smtp_server,
                port: parseInt(smtpConfig.smtp_port) || 587,
                secure: parseInt(smtpConfig.smtp_port) === 465,
                auth: {
                    user: smtpConfig.smtp_user,
                    pass: smtpConfig.smtp_password
                },
                tls: {
                    rejectUnauthorized: false
                }
            });

            // Verificar configuración
            await this.transporter.verify();
            this.isConfigured = true;
            console.log('✅ Configuración SMTP verificada correctamente');
            return true;

        } catch (error) {
            console.error('❌ Error configurando SMTP:', error.message);
            this.isConfigured = false;
            return false;
        }
    }

    // Obtener configuración de notificaciones
    async getNotificationSettings() {
        try {
            const settings = await query(`
                SELECT setting_key, setting_value, data_type
                FROM system_settings 
                WHERE group_name = 'notifications'
            `);

            const config = {};
            settings.forEach(setting => {
                let value = setting.setting_value;
                
                if (setting.data_type === 'number') {
                    value = parseInt(value);
                } else if (setting.data_type === 'boolean') {
                    value = value === 'true';
                }
                
                config[setting.setting_key] = value;
            });

            return config;

        } catch (error) {
            console.error('Error obteniendo configuración de notificaciones:', error);
            return {};
        }
    }

    // Enviar email genérico
    async sendEmail(to, subject, html, text = null) {
        try {
            if (!this.isConfigured) {
                const configured = await this.configureMailer();
                if (!configured) {
                    throw new Error('SMTP no configurado correctamente');
                }
            }

            const mailOptions = {
                from: await this.getFromAddress(),
                to: Array.isArray(to) ? to.join(', ') : to,
                subject: subject,
                html: html,
                text: text || html.replace(/<[^>]*>/g, '') // Convertir HTML a texto plano
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('✅ Email enviado exitosamente:', result.messageId);
            return { success: true, messageId: result.messageId };

        } catch (error) {
            console.error('❌ Error enviando email:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Notificación de planilla procesada
    async notifyPayrollProcessed(planillaData) {
        try {
            const settings = await this.getNotificationSettings();
            if (!settings.payroll_processed) return;

            const adminEmails = await this.getAdminEmails();
            if (adminEmails.length === 0) return;

            const subject = `Planilla ${planillaData.periodo} procesada exitosamente`;
            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #28a745;">Planilla Procesada</h2>
                    <p>La planilla del período <strong>${planillaData.periodo}</strong> ha sido procesada exitosamente.</p>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Resumen:</h3>
                        <ul>
                            <li><strong>Período:</strong> ${planillaData.periodo}</li>
                            <li><strong>Trabajadores:</strong> ${planillaData.total_trabajadores}</li>
                            <li><strong>Total Ingresos:</strong> S/ ${parseFloat(planillaData.total_ingresos).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</li>
                            <li><strong>Total Descuentos:</strong> S/ ${parseFloat(planillaData.total_descuentos).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</li>
                            <li><strong>Neto a Pagar:</strong> S/ ${parseFloat(planillaData.total_neto).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</li>
                        </ul>
                    </div>
                    <p style="color: #666; font-size: 12px;">
                        Notificación automática del Sistema de Planillas<br>
                        ${new Date().toLocaleDateString('es-PE', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        })}
                    </p>
                </div>
            `;

            await this.sendEmail(adminEmails, subject, html);

        } catch (error) {
            console.error('Error enviando notificación de planilla:', error);
        }
    }

    // Notificación de contratos por vencer
    async notifyContractsExpiring(contracts) {
        try {
            const settings = await this.getNotificationSettings();
            if (!settings.contracts_expiring || contracts.length === 0) return;

            const hrEmails = await this.getHREmails();
            if (hrEmails.length === 0) return;

            const subject = `${contracts.length} contrato(s) próximo(s) a vencer`;
            const contractsList = contracts.map(contract => 
                `<li><strong>${contract.trabajador_nombre}</strong> - Vence: ${new Date(contract.fecha_fin).toLocaleDateString('es-PE')} (${contract.dias_restantes} días)</li>`
            ).join('');

            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #dc3545;">Contratos por Vencer</h2>
                    <p>Los siguientes contratos están próximos a vencer en los próximos 30 días:</p>
                    <ul style="background: #fff3cd; padding: 15px; border-radius: 5px;">
                        ${contractsList}
                    </ul>
                    <p><strong>Acción requerida:</strong> Revisar y renovar los contratos según sea necesario.</p>
                    <p style="color: #666; font-size: 12px;">
                        Notificación automática del Sistema de Planillas<br>
                        ${new Date().toLocaleDateString('es-PE', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        })}
                    </p>
                </div>
            `;

            await this.sendEmail(hrEmails, subject, html);

        } catch (error) {
            console.error('Error enviando notificación de contratos:', error);
        }
    }

    // Notificación de nuevas solicitudes
    async notifyNewRequest(solicitudData) {
        try {
            const settings = await this.getNotificationSettings();
            if (!settings.new_requests) return;

            const approverEmails = await this.getApproverEmails();
            if (approverEmails.length === 0) return;

            const subject = `Nueva solicitud: ${solicitudData.titulo}`;
            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #007bff;">Nueva Solicitud</h2>
                    <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">${solicitudData.titulo}</h3>
                        <p><strong>Solicitante:</strong> ${solicitudData.trabajador_nombre}</p>
                        <p><strong>Tipo:</strong> ${solicitudData.tipo_solicitud}</p>
                        <p><strong>Urgencia:</strong> ${solicitudData.urgencia}</p>
                        <p><strong>Fecha:</strong> ${new Date(solicitudData.fecha_creacion).toLocaleDateString('es-PE')}</p>
                    </div>
                    <p><strong>Motivo:</strong></p>
                    <div style="background: #f8f9fa; padding: 10px; border-left: 4px solid #007bff; margin: 10px 0;">
                        ${solicitudData.motivo}
                    </div>
                    <p><em>Esta solicitud requiere revisión y aprobación.</em></p>
                    <p style="color: #666; font-size: 12px;">
                        Notificación automática del Sistema de Planillas<br>
                        ${new Date().toLocaleDateString('es-PE', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        })}
                    </p>
                </div>
            `;

            await this.sendEmail(approverEmails, subject, html);

        } catch (error) {
            console.error('Error enviando notificación de solicitud:', error);
        }
    }

    // Notificación de errores del sistema
    async notifySystemError(errorData) {
        try {
            const settings = await this.getNotificationSettings();
            if (!settings.system_errors) return;

            const adminEmails = await this.getAdminEmails();
            if (adminEmails.length === 0) return;

            const subject = `Error del Sistema: ${errorData.type || 'Error General'}`;
            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #dc3545;">Error del Sistema</h2>
                    <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Detalles del Error</h3>
                        <p><strong>Tipo:</strong> ${errorData.type || 'Error General'}</p>
                        <p><strong>Mensaje:</strong> ${errorData.message}</p>
                        <p><strong>Hora:</strong> ${new Date(errorData.timestamp).toLocaleString('es-PE')}</p>
                        ${errorData.user ? `<p><strong>Usuario:</strong> ${errorData.user}</p>` : ''}
                        ${errorData.module ? `<p><strong>Módulo:</strong> ${errorData.module}</p>` : ''}
                    </div>
                    <p><strong>Acción requerida:</strong> Revisar logs del sistema y tomar acción correctiva.</p>
                    <p style="color: #666; font-size: 12px;">
                        Notificación automática del Sistema de Planillas<br>
                        ${new Date().toLocaleDateString('es-PE', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        })}
                    </p>
                </div>
            `;

            await this.sendEmail(adminEmails, subject, html);

        } catch (error) {
            console.error('Error enviando notificación de error:', error);
        }
    }

    // ========== FUNCIONES AUXILIARES ==========

    // Obtener dirección de remitente
    async getFromAddress() {
        try {
            const settings = await this.getNotificationSettings();
            return settings.smtp_user || 'sistema@instituto.edu.pe';
        } catch (error) {
            return 'sistema@instituto.edu.pe';
        }
    }

    // Obtener emails de administradores
    async getAdminEmails() {
        try {
            const admins = await query(`
                SELECT DISTINCT u.email
                FROM users u
                LEFT JOIN roles r ON u.role = r.id
                WHERE r.type = 'admin' AND u.status = 'active' AND u.email IS NOT NULL
            `);
            return admins.map(admin => admin.email);
        } catch (error) {
            console.error('Error obteniendo emails de admins:', error);
            return [];
        }
    }

    // Obtener emails de RRHH
    async getHREmails() {
        try {
            const hrUsers = await query(`
                SELECT DISTINCT u.email
                FROM users u
                LEFT JOIN role_permissions rp ON u.role = rp.role_id
                WHERE rp.permission_id = 'users.edit' 
                AND u.status = 'active' 
                AND u.email IS NOT NULL
            `);
            return hrUsers.map(user => user.email);
        } catch (error) {
            console.error('Error obteniendo emails de RRHH:', error);
            return this.getAdminEmails(); // Fallback a admins
        }
    }

    // Obtener emails de aprobadores
    async getApproverEmails() {
        try {
            const approvers = await query(`
                SELECT DISTINCT u.email
                FROM users u
                LEFT JOIN role_permissions rp ON u.role = rp.role_id
                WHERE rp.permission_id IN ('requests.approve', 'requests.reject') 
                AND u.status = 'active' 
                AND u.email IS NOT NULL
            `);
            return approvers.map(user => user.email);
        } catch (error) {
            console.error('Error obteniendo emails de aprobadores:', error);
            return this.getAdminEmails(); // Fallback a admins
        }
    }

    // Probar configuración SMTP
    async testEmailConfiguration(testEmail) {
        try {
            const configured = await this.configureMailer();
            if (!configured) {
                return { success: false, message: 'Error en configuración SMTP' };
            }

            const subject = 'Prueba de Configuración - Sistema de Planillas';
            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #28a745;">Configuración SMTP Exitosa</h2>
                    <p>Este es un email de prueba para verificar la configuración del servidor SMTP.</p>
                    <p>Si recibes este mensaje, la configuración está funcionando correctamente.</p>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Servidor:</strong> ${(await this.getNotificationSettings()).smtp_server}</p>
                        <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-PE')}</p>
                    </div>
                    <p style="color: #666; font-size: 12px;">
                        Sistema de Planillas - Prueba de Configuración
                    </p>
                </div>
            `;

            return await this.sendEmail(testEmail, subject, html);

        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}

module.exports = new NotificationHelper();