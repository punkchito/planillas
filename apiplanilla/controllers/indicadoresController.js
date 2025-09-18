// controllers/indicadoresController.js - CORREGIDO
const { query } = require('../config/database');
const { Parser } = require('json2csv');

class IndicadoresController {

    // =============================
    // VARIABLES
    // =============================

    // Obtener todas las variables con sus dimensiones e indicadores
    async getVariables(req, res) {
        try {
            const { includeStats = false } = req.query;

            const variables = await query(`
                SELECT v.*, 
                       COUNT(DISTINCT d.id) as total_dimensions,
                       COUNT(DISTINCT i.id) as total_indicators
                FROM variables v
                LEFT JOIN dimensions d ON v.id = d.variable_id AND d.status = 'active'
                LEFT JOIN indicators i ON d.id = i.dimension_id AND i.status = 'active'
                GROUP BY v.id
                ORDER BY v.created_at ASC
            `);

            if (includeStats === 'true') {
                // Incluir estadísticas detalladas
                for (let variable of variables) {
                    const dimensions = await query(`
                        SELECT d.*, COUNT(i.id) as indicator_count
                        FROM dimensions d
                        LEFT JOIN indicators i ON d.id = i.dimension_id AND i.status = 'active'
                        WHERE d.variable_id = ? AND d.status = 'active'
                        GROUP BY d.id
                        ORDER BY d.created_at ASC
                    `, [variable.id]);

                    variable.dimensions = dimensions;
                }
            }

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

    // Crear nueva variable
    async createVariable(req, res) {
        try {
            const { id, name, description, status = 'active' } = req.body;

            // Verificar si ya existe una variable con ese ID
            const existingVariable = await query('SELECT id FROM variables WHERE id = ?', [id]);
            if (existingVariable.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe una variable con ese ID'
                });
            }

            // Insertar variable
            await query(`
                INSERT INTO variables (id, name, description, status)
                VALUES (?, ?, ?, ?)
            `, [id, name, description, status]);

            res.status(201).json({
                success: true,
                message: 'Variable creada exitosamente',
                data: { id, name }
            });

        } catch (error) {
            console.error('Error creando variable:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Actualizar variable
    async updateVariable(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const existingVariable = await query('SELECT id FROM variables WHERE id = ?', [id]);
            if (existingVariable.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Variable no encontrada'
                });
            }

            const updateFields = [];
            const updateValues = [];

            const allowedFields = ['name', 'description', 'status'];
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
                UPDATE variables 
                SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, updateValues);

            res.json({
                success: true,
                message: 'Variable actualizada exitosamente'
            });

        } catch (error) {
            console.error('Error actualizando variable:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Eliminar variable
    async deleteVariable(req, res) {
        try {
            const { id } = req.params;

            // Verificar si tiene dimensiones asociadas
            const dimensions = await query('SELECT COUNT(*) as count FROM dimensions WHERE variable_id = ?', [id]);
            if (dimensions[0].count > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No se puede eliminar. La variable tiene dimensiones asociadas.'
                });
            }

            const result = await query('DELETE FROM variables WHERE id = ?', [id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Variable no encontrada'
                });
            }

            res.json({
                success: true,
                message: 'Variable eliminada exitosamente'
            });

        } catch (error) {
            console.error('Error eliminando variable:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // =============================
    // DIMENSIONES
    // =============================

    // Obtener todas las dimensiones con sus indicadores
    async getDimensions(req, res) {
        try {
            const { variableId, includeIndicators = false } = req.query;

            let whereClause = 'WHERE d.status = "active"';
            let queryParams = [];

            if (variableId) {
                whereClause += ' AND d.variable_id = ?';
                queryParams.push(variableId);
            }

            const dimensions = await query(`
                SELECT d.*, 
                       v.name as variable_name,
                       COUNT(i.id) as total_indicators
                FROM dimensions d
                LEFT JOIN variables v ON d.variable_id = v.id
                LEFT JOIN indicators i ON d.id = i.dimension_id AND i.status = 'active'
                ${whereClause}
                GROUP BY d.id
                ORDER BY d.created_at ASC
            `, queryParams);

            if (includeIndicators === 'true') {
                for (let dimension of dimensions) {
                    const indicators = await query(`
                        SELECT * FROM indicators 
                        WHERE dimension_id = ? AND status = 'active'
                        ORDER BY created_at ASC
                    `, [dimension.id]);

                    // Obtener datos históricos para cada indicador
                    for (let indicator of indicators) {
                        const historicalData = await query(`
                            SELECT period, value 
                            FROM indicator_historical_data 
                            WHERE indicator_id = ? 
                            ORDER BY period DESC 
                            LIMIT 12
                        `, [indicator.id]);

                        indicator.historical_data = historicalData.map(h => h.value);
                    }

                    dimension.indicators = indicators;
                }
            }

            res.json({
                success: true,
                data: dimensions
            });

        } catch (error) {
            console.error('Error obteniendo dimensiones:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Crear nueva dimensión - CORREGIDO
    async createDimension(req, res) {
        try {
            const { id, name, description, variableId, status = 'active' } = req.body;

            console.log('Datos recibidos para crear dimensión:', req.body); // DEBUG

            // Verificar si la variable padre existe
            const variable = await query('SELECT id FROM variables WHERE id = ?', [variableId]);
            if (variable.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'La variable padre no existe'
                });
            }

            // Verificar si ya existe una dimensión con ese ID
            const existingDimension = await query('SELECT id FROM dimensions WHERE id = ?', [id]);
            if (existingDimension.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe una dimensión con ese ID'
                });
            }

            await query(`
                INSERT INTO dimensions (id, name, description, variable_id, status)
                VALUES (?, ?, ?, ?, ?)
            `, [id, name, description, variableId, status]);

            res.status(201).json({
                success: true,
                message: 'Dimensión creada exitosamente',
                data: { id, name }
            });

        } catch (error) {
            console.error('Error creando dimensión:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Actualizar dimensión
    async updateDimension(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            console.log('Datos recibidos para actualizar dimensión:', updateData); // DEBUG

            const existingDimension = await query('SELECT id FROM dimensions WHERE id = ?', [id]);
            if (existingDimension.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Dimensión no encontrada'
                });
            }

            const updateFields = [];
            const updateValues = [];

            const allowedFields = ['name', 'description', 'variable_id', 'status'];
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
                UPDATE dimensions 
                SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, updateValues);

            res.json({
                success: true,
                message: 'Dimensión actualizada exitosamente'
            });

        } catch (error) {
            console.error('Error actualizando dimensión:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Eliminar dimensión
    async deleteDimension(req, res) {
        try {
            const { id } = req.params;

            // Verificar si tiene indicadores asociados
            const indicators = await query('SELECT COUNT(*) as count FROM indicators WHERE dimension_id = ?', [id]);
            if (indicators[0].count > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No se puede eliminar. La dimensión tiene indicadores asociados.'
                });
            }

            const result = await query('DELETE FROM dimensions WHERE id = ?', [id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Dimensión no encontrada'
                });
            }

            res.json({
                success: true,
                message: 'Dimensión eliminada exitosamente'
            });

        } catch (error) {
            console.error('Error eliminando dimensión:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // =============================
    // INDICADORES
    // =============================

    // Obtener todos los indicadores con filtros
    async getIndicators(req, res) {
        try {
            const {
                dimensionId,
                variableId,
                type,
                status = 'active',
                includeHistorical = false,
                search,
                sortBy = 'name',
                sortOrder = 'ASC'
            } = req.query;

            let whereConditions = ['i.status = ?'];
            let queryParams = [status];

            // Validar sortBy
            const allowedSortFields = ['name', 'type', 'current_value', 'target_value', 'created_at'];
            const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'name';
            const safeSortOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

            if (dimensionId) {
                whereConditions.push('i.dimension_id = ?');
                queryParams.push(dimensionId);
            }

            if (variableId) {
                whereConditions.push('d.variable_id = ?');
                queryParams.push(variableId);
            }

            if (type) {
                whereConditions.push('i.type = ?');
                queryParams.push(type);
            }

            if (search) {
                whereConditions.push('(i.name LIKE ? OR i.description LIKE ? OR i.formula LIKE ?)');
                const searchTerm = `%${search}%`;
                queryParams.push(searchTerm, searchTerm, searchTerm);
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            const indicators = await query(`
                SELECT i.*, 
                       d.name as dimension_name, 
                       v.name as variable_name,
                       CASE 
                           WHEN i.target_value > 0 THEN ROUND((i.current_value / i.target_value) * 100, 2)
                           ELSE 0
                       END as performance_percentage,
                       CASE 
                           WHEN i.current_value >= i.target_value THEN 'excellent'
                           WHEN i.current_value >= (i.target_value * 0.9) THEN 'good'
                           WHEN i.current_value >= (i.target_value * 0.8) THEN 'warning'
                           ELSE 'poor'
                       END as status_level
                FROM indicators i
                LEFT JOIN dimensions d ON i.dimension_id = d.id
                LEFT JOIN variables v ON d.variable_id = v.id
                ${whereClause}
                ORDER BY i.${safeSortBy} ${safeSortOrder}
            `, queryParams);

            // Incluir datos históricos si se solicita
            if (includeHistorical === 'true') {
                for (let indicator of indicators) {
                    const historicalData = await query(`
                        SELECT period, value 
                        FROM indicator_historical_data 
                        WHERE indicator_id = ? 
                        ORDER BY period DESC 
                        LIMIT 12
                    `, [indicator.id]);

                    indicator.historical_data = historicalData.map(h => parseFloat(h.value));
                }
            }

            res.json({
                success: true,
                data: indicators
            });

        } catch (error) {
            console.error('Error obteniendo indicadores:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Obtener indicador específico por ID
    async getIndicatorById(req, res) {
        try {
            const { id } = req.params;

            const indicators = await query(`
                SELECT i.*, 
                       d.name as dimension_name, 
                       v.name as variable_name,
                       CASE 
                           WHEN i.target_value > 0 THEN ROUND((i.current_value / i.target_value) * 100, 2)
                           ELSE 0
                       END as performance_percentage,
                       CASE 
                           WHEN i.current_value >= i.target_value THEN 'excellent'
                           WHEN i.current_value >= (i.target_value * 0.9) THEN 'good'
                           WHEN i.current_value >= (i.target_value * 0.8) THEN 'warning'
                           ELSE 'poor'
                       END as status_level
                FROM indicators i
                LEFT JOIN dimensions d ON i.dimension_id = d.id
                LEFT JOIN variables v ON d.variable_id = v.id
                WHERE i.id = ?
            `, [id]);

            if (indicators.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Indicador no encontrado'
                });
            }

            // Obtener datos históricos
            const historicalData = await query(`
                SELECT period, value 
                FROM indicator_historical_data 
                WHERE indicator_id = ? 
                ORDER BY period ASC
            `, [id]);

            const indicator = indicators[0];
            indicator.historical_data = historicalData;

            res.json({
                success: true,
                data: indicator
            });

        } catch (error) {
            console.error('Error obteniendo indicador:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Crear nuevo indicador - CORREGIDO
    async createIndicator(req, res) {
        try {
            const {
                id, name, description, dimensionId, type,
                currentValue, targetValue, unit, formula,
                status = 'active'
            } = req.body;

            console.log('Datos recibidos para crear indicador:', req.body); // DEBUG

            // Verificar si la dimensión padre existe
            const dimension = await query('SELECT id FROM dimensions WHERE id = ?', [dimensionId]);
            if (dimension.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'La dimensión padre no existe'
                });
            }

            // Verificar si ya existe un indicador con ese ID
            const existingIndicator = await query('SELECT id FROM indicators WHERE id = ?', [id]);
            if (existingIndicator.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe un indicador con ese ID'
                });
            }

            await query(`
                INSERT INTO indicators (
                    id, name, description, dimension_id, type,
                    current_value, target_value, unit, formula, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [id, name, description, dimensionId, type, currentValue, targetValue, unit, formula, status]);

            // Crear registro histórico inicial
            const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM
            await query(`
                INSERT IGNORE INTO indicator_historical_data (indicator_id, period, value)
                VALUES (?, ?, ?)
            `, [id, currentPeriod, currentValue]);

            res.status(201).json({
                success: true,
                message: 'Indicador creado exitosamente',
                data: { id, name }
            });

        } catch (error) {
            console.error('Error creando indicador:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Actualizar indicador - CORREGIDO
    async updateIndicator(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            console.log('Datos recibidos para actualizar indicador:', updateData); // DEBUG

            const existingIndicator = await query('SELECT current_value FROM indicators WHERE id = ?', [id]);
            if (existingIndicator.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Indicador no encontrado'
                });
            }

            const updateFields = [];
            const updateValues = [];

            const allowedFields = [
                'name', 'description', 'dimension_id', 'type',
                'current_value', 'target_value', 'unit', 'formula', 'status'
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
                UPDATE indicators 
                SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, updateValues);

            // Si se actualizó el valor actual, crear registro histórico
            if (updateData.current_value && updateData.current_value !== existingIndicator[0].current_value) {
                const currentPeriod = new Date().toISOString().slice(0, 7);
                await query(`
                    INSERT INTO indicator_historical_data (indicator_id, period, value)
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE value = VALUES(value)
                `, [id, currentPeriod, updateData.current_value]);
            }

            res.json({
                success: true,
                message: 'Indicador actualizado exitosamente'
            });

        } catch (error) {
            console.error('Error actualizando indicador:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Eliminar indicador
    async deleteIndicator(req, res) {
        try {
            const { id } = req.params;

            const result = await query('DELETE FROM indicators WHERE id = ?', [id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Indicador no encontrado'
                });
            }

            res.json({
                success: true,
                message: 'Indicador eliminado exitosamente'
            });

        } catch (error) {
            console.error('Error eliminando indicador:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // =============================
    // ESTADÍSTICAS Y REPORTES
    // =============================

    // Obtener estadísticas generales del dashboard
    async getDashboardStats(req, res) {
        try {
            const totalIndicators = await query('SELECT COUNT(*) as total FROM indicators WHERE status = "active"');
            const totalVariables = await query('SELECT COUNT(*) as total FROM variables WHERE status = "active"');
            const totalDimensions = await query('SELECT COUNT(*) as total FROM dimensions WHERE status = "active"');

            const avgValue = await query(`
                SELECT AVG(current_value) as average 
                FROM indicators 
                WHERE status = "active"
            `);

            const metTargets = await query(`
                SELECT COUNT(*) as count 
                FROM indicators 
                WHERE status = "active" AND current_value >= target_value
            `);

            const criticalIndicators = await query(`
                SELECT COUNT(*) as count 
                FROM indicators 
                WHERE status = "active" AND current_value < (target_value * 0.8)
            `);

            // Estadísticas por dimensión
            const dimensionStats = await query(`
                SELECT d.name as dimension_name,
                       d.id as dimension_id,
                       COUNT(i.id) as indicator_count,
                       AVG(i.current_value) as avg_value,
                       COUNT(CASE WHEN i.current_value >= i.target_value THEN 1 END) as met_targets
                FROM dimensions d
                LEFT JOIN indicators i ON d.id = i.dimension_id AND i.status = 'active'
                WHERE d.status = 'active'
                GROUP BY d.id, d.name
                ORDER BY avg_value DESC
            `);

            // Indicadores con mejor y peor rendimiento
            const topIndicators = await query(`
                SELECT i.name, i.current_value, i.target_value, i.unit,
                       d.name as dimension_name,
                       ROUND((i.current_value / i.target_value) * 100, 2) as performance_percentage
                FROM indicators i
                LEFT JOIN dimensions d ON i.dimension_id = d.id
                WHERE i.status = 'active' AND i.target_value > 0
                ORDER BY performance_percentage DESC
                LIMIT 5
            `);

            const worstIndicators = await query(`
                SELECT i.name, i.current_value, i.target_value, i.unit,
                       d.name as dimension_name,
                       ROUND((i.current_value / i.target_value) * 100, 2) as performance_percentage
                FROM indicators i
                LEFT JOIN dimensions d ON i.dimension_id = d.id
                WHERE i.status = 'active' AND i.target_value > 0
                ORDER BY performance_percentage ASC
                LIMIT 5
            `);

            res.json({
                success: true,
                data: {
                    summary: {
                        total_indicators: totalIndicators[0].total,
                        total_variables: totalVariables[0].total,
                        total_dimensions: totalDimensions[0].total,
                        average_value: parseFloat((avgValue[0].average || 0)),
                        met_targets: metTargets[0].count,
                        critical_indicators: criticalIndicators[0].count
                    },
                    dimension_stats: dimensionStats,
                    top_indicators: topIndicators,
                    worst_indicators: worstIndicators
                }
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

    // Obtener estructura completa para el árbol (tree structure) - CORREGIDO
    // Obtener estructura completa para el árbol (tree structure) - CORREGIDO
    async getTreeStructure(req, res) {
        try {
            console.log('🌳 Iniciando getTreeStructure...');

            // PASO 1: Obtener todas las variables activas
            const variables = await query(`
      SELECT id, name, description, status, created_at, updated_at
      FROM variables 
      WHERE status = 'active' 
      ORDER BY created_at ASC
    `);

            console.log(`📊 Variables encontradas: ${variables.length}`);

            // PASO 2: Para cada variable, obtener sus dimensiones
            for (let i = 0; i < variables.length; i++) {
                const variable = variables[i];
                console.log(`\n🔸 Procesando variable: ${variable.name} (${variable.id})`);

                // Obtener dimensiones de esta variable
                const dimensions = await query(`
        SELECT id, name, description, variable_id, status, created_at, updated_at
        FROM dimensions 
        WHERE variable_id = ? AND status = 'active'
        ORDER BY created_at ASC
      `, [variable.id]);

                console.log(`   📄 Dimensiones encontradas: ${dimensions.length}`);

                // PASO 3: Para cada dimensión, obtener sus indicadores
                for (let j = 0; j < dimensions.length; j++) {
                    const dimension = dimensions[j];
                    console.log(`   🔹 Procesando dimensión: ${dimension.name} (${dimension.id})`);

                    // Obtener indicadores de esta dimensión
                    const indicators = await query(`
          SELECT id, name, description, dimension_id, type, 
                 current_value, target_value, unit, formula, status,
                 created_at, updated_at,
                 CASE 
                   WHEN target_value > 0 THEN ROUND((current_value / target_value) * 100, 2)
                   ELSE 0
                 END as performance_percentage
          FROM indicators 
          WHERE dimension_id = ? AND status = 'active'
          ORDER BY created_at ASC
        `, [dimension.id]);

                    console.log(`       📈 Indicadores encontrados: ${indicators.length}`);

                    // Asignar indicadores a la dimensión
                    dimension.indicators = indicators;

                    // Log de verificación
                    indicators.forEach(indicator => {
                        console.log(`       ✓ ${indicator.name} (${indicator.current_value}${indicator.unit})`);
                    });
                }

                // Asignar dimensiones a la variable
                variable.dimensions = dimensions;
            }

            // PASO 4: Log de verificación final
            console.log('\n📋 RESUMEN FINAL:');
            variables.forEach(variable => {
                const dimensionCount = variable.dimensions?.length || 0;
                const indicatorCount = variable.dimensions?.reduce((sum, dim) =>
                    sum + (dim.indicators?.length || 0), 0) || 0;

                console.log(`📊 ${variable.name}:`);
                console.log(`   - ${dimensionCount} dimensiones`);
                console.log(`   - ${indicatorCount} indicadores`);
            });

            // PASO 5: Respuesta final
            const response = {
                success: true,
                data: variables,
                metadata: {
                    total_variables: variables.length,
                    total_dimensions: variables.reduce((sum, v) => sum + (v.dimensions?.length || 0), 0),
                    total_indicators: variables.reduce((sum, v) =>
                        sum + (v.dimensions?.reduce((dimSum, d) => dimSum + (d.indicators?.length || 0), 0) || 0), 0)
                }
            };

            console.log('✅ Enviando respuesta:', {
                variables: response.metadata.total_variables,
                dimensions: response.metadata.total_dimensions,
                indicators: response.metadata.total_indicators
            });

            res.json(response);

        } catch (error) {
            console.error('❌ Error en getTreeStructure:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor obteniendo estructura del árbol',
                error: error.message
            });
        }
    }
    // Exportar datos a CSV
    async exportData(req, res) {
        try {
            const { type = 'indicators' } = req.query;

            let data = [];
            let fields = [];
            let filename = '';

            switch (type) {
                case 'indicators':
                    data = await query(`
                        SELECT i.id, i.name, i.description, i.type, i.current_value, 
                               i.target_value, i.unit, i.formula, i.status,
                               d.name as dimension_name, v.name as variable_name
                        FROM indicators i
                        LEFT JOIN dimensions d ON i.dimension_id = d.id
                        LEFT JOIN variables v ON d.variable_id = v.id
                        ORDER BY v.name, d.name, i.name
                    `);
                    fields = ['id', 'name', 'description', 'type', 'current_value', 'target_value',
                        'unit', 'formula', 'status', 'dimension_name', 'variable_name'];
                    filename = 'indicadores_rrhh.csv';
                    break;

                case 'dimensions':
                    data = await query(`
                        SELECT d.id, d.name, d.description, d.status,
                               v.name as variable_name,
                               COUNT(i.id) as total_indicators
                        FROM dimensions d
                        LEFT JOIN variables v ON d.variable_id = v.id
                        LEFT JOIN indicators i ON d.id = i.dimension_id
                        GROUP BY d.id
                        ORDER BY v.name, d.name
                    `);
                    fields = ['id', 'name', 'description', 'status', 'variable_name', 'total_indicators'];
                    filename = 'dimensiones_rrhh.csv';
                    break;

                case 'variables':
                    data = await query(`
                        SELECT v.id, v.name, v.description, v.status,
                               COUNT(DISTINCT d.id) as total_dimensions,
                               COUNT(DISTINCT i.id) as total_indicators
                        FROM variables v
                        LEFT JOIN dimensions d ON v.id = d.variable_id
                        LEFT JOIN indicators i ON d.id = i.dimension_id
                        GROUP BY v.id
                        ORDER BY v.name
                    `);
                    fields = ['id', 'name', 'description', 'status', 'total_dimensions', 'total_indicators'];
                    filename = 'variables_rrhh.csv';
                    break;

                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Tipo de exportación no válido'
                    });
            }

            const opts = { fields };
            const parser = new Parser(opts);
            const csv = parser.parse(data);

            res.header('Content-Type', 'text/csv; charset=utf-8');
            res.header('Content-Disposition', `attachment; filename="${filename}"`);
            res.send('\ufeff' + csv); // BOM para UTF-8

        } catch (error) {
            console.error('Error exportando datos:', error);
            res.status(500).json({
                success: false,
                message: 'Error exportando datos',
                error: error.message
            });
        }
    }

    // Validar fórmula de indicador
    async validateFormula(req, res) {
        try {
            const { formula } = req.body;

            if (!formula || !formula.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Fórmula requerida'
                });
            }

            // Variables permitidas en las fórmulas
            const allowedVariables = [
                'TOTAL_TRABAJADORES', 'TRABAJADORES_ACTIVOS', 'PROCESOS_AUTOMATIZADOS',
                'TOTAL_PROCESOS', 'EVALUACIONES_COMPLETADAS', 'EVALUACIONES_PROGRAMADAS',
                'EMPLEADOS_FORMACION', 'TOTAL_EMPLEADOS', 'CONTRATACIONES_EXITOSAS',
                'TOTAL_CONTRATACIONES', 'EMPLEADOS_RETENIDOS', 'EMPLEADOS_CLAVE',
                'CESES_CORRECTOS', 'TOTAL_CESES'
            ];

            // Funciones permitidas
            const allowedFunctions = ['SUM', 'COUNT', 'AVG', 'MAX', 'MIN', 'ROUND', 'IF'];

            // Validación básica de sintaxis
            const hasValidSyntax = true; // Aquí iría lógica más compleja de validación
            const variablesFound = allowedVariables.filter(v => formula.includes(v));
            const functionsFound = allowedFunctions.filter(f => formula.includes(f));

            res.json({
                success: true,
                data: {
                    formula,
                    is_valid: hasValidSyntax,
                    variables_found: variablesFound,
                    functions_found: functionsFound,
                    allowed_variables: allowedVariables,
                    allowed_functions: allowedFunctions,
                    message: hasValidSyntax ? 'Fórmula válida' : 'La fórmula contiene errores'
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

    // Generar reporte de tendencias
    async getTrendsReport(req, res) {
        try {
            const { months = 6 } = req.query;

            const trendsData = await query(`
                SELECT i.id, i.name, i.unit, d.name as dimension_name,
                       ihd.period, ihd.value
                FROM indicators i
                LEFT JOIN dimensions d ON i.dimension_id = d.id
                LEFT JOIN indicator_historical_data ihd ON i.id = ihd.indicator_id
                WHERE i.status = 'active' 
                AND ihd.period >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL ? MONTH), '%Y-%m')
                ORDER BY i.name, ihd.period ASC
            `, [months]);

            // Agrupar por indicador
            const indicatorTrends = {};
            trendsData.forEach(row => {
                if (!indicatorTrends[row.id]) {
                    indicatorTrends[row.id] = {
                        id: row.id,
                        name: row.name,
                        unit: row.unit,
                        dimension_name: row.dimension_name,
                        data: []
                    };
                }

                indicatorTrends[row.id].data.push({
                    period: row.period,
                    value: parseFloat(row.value)
                });
            });

            // Calcular tendencias (crecimiento, estable, decreciente)
            Object.values(indicatorTrends).forEach(indicator => {
                if (indicator.data.length >= 2) {
                    const firstValue = indicator.data[0].value;
                    const lastValue = indicator.data[indicator.data.length - 1].value;
                    const change = lastValue - firstValue;
                    const changePercentage = firstValue > 0 ? (change / firstValue) * 100 : 0;

                    indicator.trend = {
                        change: parseFloat(change.toFixed(2)),
                        change_percentage: parseFloat(changePercentage.toFixed(2)),
                        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
                    };
                } else {
                    indicator.trend = {
                        change: 0,
                        change_percentage: 0,
                        direction: 'stable'
                    };
                }
            });

            res.json({
                success: true,
                data: {
                    period_months: parseInt(months),
                    indicators: Object.values(indicatorTrends)
                }
            });

        } catch (error) {
            console.error('Error generando reporte de tendencias:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }
}

module.exports = new IndicadoresController();