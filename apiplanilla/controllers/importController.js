// controllers/importController.js
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');

// Configuración de multer para subir archivos CSV
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const fileName = `import_${Date.now()}_${file.originalname}`;
        cb(null, fileName);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'text/csv' && !file.originalname.toLowerCase().endsWith('.csv')) {
            return cb(new Error('Solo se permiten archivos CSV'));
        }
        cb(null, true);
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB máximo
    }
});

class ImportController {
    // Middleware para subir archivo
    uploadFile = upload.single('file');

    // Importar trabajadores desde CSV
    async importarTrabajadores(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No se ha proporcionado ningún archivo'
                });
            }

            const filePath = req.file.path;
            const results = [];
            const errors = [];
            let lineNumber = 1; // Empezar en 1 porque la línea 0 son los headers

            // Leer y procesar el archivo CSV
            const csvData = await this.readCSVFile(filePath);

            // Obtener datos maestros para validación
            const areas = await query('SELECT id, nombre FROM areas WHERE estado = "activo"');
            const cargos = await query('SELECT id, nombre, area_id FROM cargos WHERE estado = "activo"');

            const areaMap = new Map(areas.map(area => [area.nombre.toLowerCase(), area.id]));
            const cargoMap = new Map(cargos.map(cargo => [cargo.nombre.toLowerCase(), { id: cargo.id, area_id: cargo.area_id }]));

            // Procesar cada fila del CSV
            for (const row of csvData) {
                lineNumber++;
                
                try {
                    // Validar campos obligatorios
                    const validationResult = this.validateCSVRow(row, lineNumber);
                    if (!validationResult.isValid) {
                        errors.push(...validationResult.errors);
                        continue;
                    }

                    // Buscar área y cargo
                    const areaId = areaMap.get(row.area?.toLowerCase());
                    const cargoInfo = cargoMap.get(row.cargo?.toLowerCase());

                    if (!areaId) {
                        errors.push({
                            line: lineNumber,
                            field: 'area',
                            message: `Área "${row.area}" no encontrada o inactiva`
                        });
                        continue;
                    }

                    if (!cargoInfo) {
                        errors.push({
                            line: lineNumber,
                            field: 'cargo',
                            message: `Cargo "${row.cargo}" no encontrado o inactivo`
                        });
                        continue;
                    }

                    // Verificar si el DNI ya existe
                    const existingWorker = await query('SELECT id FROM trabajadores WHERE dni = ?', [row.dni]);
                    if (existingWorker.length > 0) {
                        errors.push({
                            line: lineNumber,
                            field: 'dni',
                            message: `Ya existe un trabajador con DNI ${row.dni}`
                        });
                        continue;
                    }

                    // Preparar datos para inserción
                    const trabajadorData = this.prepareWorkerData(row, areaId, cargoInfo.id);
                    
                    // Insertar trabajador
                    const result = await query(`
                        INSERT INTO trabajadores (
                            dni, nombres, apellido_paterno, apellido_materno, fecha_nacimiento,
                            genero, estado_civil, nacionalidad, direccion, fecha_ingreso,
                            cargo_id, area_id, sueldo_basico, tipo_jornada,
                            telefono_principal, correo_electronico, estado
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        trabajadorData.dni,
                        trabajadorData.nombres,
                        trabajadorData.apellido_paterno,
                        trabajadorData.apellido_materno,
                        trabajadorData.fecha_nacimiento,
                        trabajadorData.genero,
                        trabajadorData.estado_civil,
                        trabajadorData.nacionalidad,
                        trabajadorData.direccion,
                        trabajadorData.fecha_ingreso,
                        trabajadorData.cargo_id,
                        trabajadorData.area_id,
                        trabajadorData.sueldo_basico,
                        trabajadorData.tipo_jornada,
                        trabajadorData.telefono_principal,
                        trabajadorData.correo_electronico,
                        trabajadorData.estado
                    ]);

                    results.push({
                        line: lineNumber,
                        id: result.insertId,
                        dni: trabajadorData.dni,
                        nombre: `${trabajadorData.nombres} ${trabajadorData.apellido_paterno} ${trabajadorData.apellido_materno}`,
                        status: 'success'
                    });

                } catch (error) {
                    console.error(`Error procesando línea ${lineNumber}:`, error);
                    errors.push({
                        line: lineNumber,
                        field: 'general',
                        message: `Error procesando fila: ${error.message}`
                    });
                }
            }

            // Limpiar archivo temporal
            fs.unlinkSync(filePath);

            res.json({
                success: true,
                message: `Proceso de importación completado. ${results.length} trabajadores importados, ${errors.length} errores encontrados.`,
                data: {
                    imported: results,
                    errors: errors,
                    summary: {
                        total_processed: csvData.length,
                        successful: results.length,
                        failed: errors.length
                    }
                }
            });

        } catch (error) {
            console.error('Error importando trabajadores:', error);
            
            // Limpiar archivo si existe
            if (req.file?.path && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }

            res.status(500).json({
                success: false,
                message: 'Error interno del servidor durante la importación'
            });
        }
    }

    // Leer archivo CSV y convertir a array
    readCSVFile(filePath) {
        return new Promise((resolve, reject) => {
            const results = [];
            
            fs.createReadStream(filePath)
                .pipe(csv({
                    mapHeaders: ({ header }) => header.toLowerCase().trim()
                }))
                .on('data', (data) => {
                    // Limpiar espacios en blanco de todos los valores
                    const cleanData = {};
                    Object.keys(data).forEach(key => {
                        cleanData[key] = typeof data[key] === 'string' ? data[key].trim() : data[key];
                    });
                    results.push(cleanData);
                })
                .on('end', () => resolve(results))
                .on('error', (error) => reject(error));
        });
    }

    // Validar fila del CSV
    validateCSVRow(row, lineNumber) {
        const errors = [];
        const requiredFields = ['dni', 'nombres', 'apellido_paterno', 'apellido_materno', 'area', 'cargo', 'sueldo_basico'];

        // Validar campos obligatorios
        requiredFields.forEach(field => {
            if (!row[field] || row[field].toString().trim() === '') {
                errors.push({
                    line: lineNumber,
                    field: field,
                    message: `El campo ${field} es obligatorio`
                });
            }
        });

        // Validar DNI
        if (row.dni && (!/^\d{8,12}$/.test(row.dni))) {
            errors.push({
                line: lineNumber,
                field: 'dni',
                message: 'El DNI debe contener entre 8 y 12 dígitos'
            });
        }

        // Validar email si está presente
        if (row.correo_electronico && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.correo_electronico)) {
            errors.push({
                line: lineNumber,
                field: 'correo_electronico',
                message: 'El formato del email es inválido'
            });
        }

        // Validar sueldo básico
        if (row.sueldo_basico && (isNaN(parseFloat(row.sueldo_basico)) || parseFloat(row.sueldo_basico) <= 0)) {
            errors.push({
                line: lineNumber,
                field: 'sueldo_basico',
                message: 'El sueldo básico debe ser un número positivo'
            });
        }

        // Validar fecha de nacimiento si está presente
        if (row.fecha_nacimiento && isNaN(Date.parse(row.fecha_nacimiento))) {
            errors.push({
                line: lineNumber,
                field: 'fecha_nacimiento',
                message: 'El formato de fecha de nacimiento es inválido (use YYYY-MM-DD)'
            });
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Preparar datos del trabajador para inserción
    prepareWorkerData(row, areaId, cargoId) {
        return {
            dni: row.dni,
            nombres: row.nombres,
            apellido_paterno: row.apellido_paterno,
            apellido_materno: row.apellido_materno,
            fecha_nacimiento: row.fecha_nacimiento ? new Date(row.fecha_nacimiento).toISOString().split('T')[0] : null,
            genero: row.genero && ['masculino', 'femenino', 'otro'].includes(row.genero.toLowerCase()) ? row.genero.toLowerCase() : 'masculino',
            estado_civil: row.estado_civil && ['soltero', 'casado', 'divorciado', 'viudo', 'conviviente'].includes(row.estado_civil.toLowerCase()) ? row.estado_civil.toLowerCase() : 'soltero',
            nacionalidad: row.nacionalidad || 'Peruana',
            direccion: row.direccion || null,
            fecha_ingreso: row.fecha_ingreso ? new Date(row.fecha_ingreso).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            cargo_id: cargoId,
            area_id: areaId,
            sueldo_basico: parseFloat(row.sueldo_basico),
            tipo_jornada: row.tipo_jornada && ['tiempo_completo', 'medio_tiempo', 'por_horas'].includes(row.tipo_jornada.toLowerCase()) ? row.tipo_jornada.toLowerCase() : 'tiempo_completo',
            telefono_principal: row.telefono_principal || null,
            correo_electronico: row.correo_electronico || null,
            estado: row.estado && ['activo', 'inactivo'].includes(row.estado.toLowerCase()) ? row.estado.toLowerCase() : 'activo'
        };
    }

    // Obtener plantilla CSV para descarga
    async getPlantillaCSV(req, res) {
        try {
            const csvHeaders = [
                'dni',
                'nombres', 
                'apellido_paterno',
                'apellido_materno',
                'fecha_nacimiento',
                'genero',
                'estado_civil',
                'nacionalidad',
                'direccion',
                'fecha_ingreso',
                'area',
                'cargo',
                'sueldo_basico',
                'tipo_jornada',
                'telefono_principal',
                'correo_electronico',
                'estado'
            ];

            const csvContent = csvHeaders.join(',') + '\n' +
                '12345678,Juan,Pérez,González,1985-01-15,masculino,soltero,Peruana,"Jr. Los Andes 123",2024-01-15,Área Académica,Docente Principal,2500.00,tiempo_completo,987654321,juan.perez@instituto.edu.pe,activo\n' +
                '87654321,María,González,Vásquez,1990-03-22,femenino,casada,Peruana,"Av. Centenario 456",2024-02-01,Administración,Personal Administrativo,1800.00,tiempo_completo,987654322,maria.gonzalez@instituto.edu.pe,activo';

            res.header('Content-Type', 'text/csv');
            res.attachment('plantilla_trabajadores.csv');
            res.send(csvContent);

        } catch (error) {
            console.error('Error generando plantilla:', error);
            res.status(500).json({
                success: false,
                message: 'Error generando plantilla CSV'
            });
        }
    }
}

module.exports = new ImportController();