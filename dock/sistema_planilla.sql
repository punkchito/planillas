DROP TABLE IF EXISTS `areas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `areas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text,
  `estado` enum('activo','inactivo') DEFAULT 'activo',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


LOCK TABLES `areas` WRITE;
/*!40000 ALTER TABLE `areas` DISABLE KEYS */;
INSERT INTO `areas` VALUES (1,'Área Académica','Departamento de docencia e investigación','activo','2025-08-25 08:58:40','2025-08-25 08:58:40'),(2,'Administración','Área administrativa y financiera','activo','2025-08-25 08:58:40','2025-08-25 08:58:40'),(3,'Servicios Generales','Mantenimiento y servicios auxiliares','activo','2025-08-25 08:58:40','2025-08-25 08:58:40'),(4,'Recursos Humanos','Gestión de personal','activo','2025-08-25 08:58:40','2025-08-25 08:58:40');
/*!40000 ALTER TABLE `areas` ENABLE KEYS */;
UNLOCK TABLES;

DROP TABLE IF EXISTS `cargos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cargos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text,
  `area_id` int DEFAULT NULL,
  `estado` enum('activo','inactivo') DEFAULT 'activo',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `area_id` (`area_id`),
  CONSTRAINT `cargos_ibfk_1` FOREIGN KEY (`area_id`) REFERENCES `areas` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cargos`
--

LOCK TABLES `cargos` WRITE;
/*!40000 ALTER TABLE `cargos` DISABLE KEYS */;
INSERT INTO `cargos` VALUES (1,'Docente Principal','Profesor a tiempo completo',1,'activo','2025-08-25 08:58:40','2025-08-25 08:58:40'),(2,'Docente Auxiliar','Profesor de apoyo',1,'activo','2025-08-25 08:58:40','2025-08-25 08:58:40'),(3,'Director General','Máxima autoridad administrativa',2,'activo','2025-08-25 08:58:40','2025-08-25 08:58:40'),(4,'Personal Administrativo','Apoyo administrativo',2,'activo','2025-08-25 08:58:40','2025-08-25 08:58:40'),(5,'Personal de Servicio','Limpieza y mantenimiento',3,'activo','2025-08-25 08:58:40','2025-08-25 08:58:40'),(6,'Jefe de RRHH','Responsable de recursos humanos',4,'activo','2025-08-25 08:58:40','2025-08-25 08:58:40');
/*!40000 ALTER TABLE `cargos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `conceptos`
--

DROP TABLE IF EXISTS `conceptos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `conceptos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(10) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `tipo_concepto` enum('ingreso','descuento','aporte') NOT NULL,
  `tipo_calculo` enum('fijo','porcentual','calculado','variable') NOT NULL,
  `valor_fijo` decimal(10,2) DEFAULT NULL,
  `porcentaje` decimal(5,2) DEFAULT NULL,
  `formula` text,
  `orden` int DEFAULT '1',
  `estado` enum('activo','inactivo') DEFAULT 'activo',
  `descripcion` text,
  `afecta_a` varchar(100) DEFAULT 'Todos',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `idx_codigo` (`codigo`),
  KEY `idx_tipo_concepto` (`tipo_concepto`),
  KEY `idx_estado` (`estado`),
  KEY `idx_orden` (`orden`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `conceptos`
--

LOCK TABLES `conceptos` WRITE;
/*!40000 ALTER TABLE `conceptos` DISABLE KEYS */;
INSERT INTO `conceptos` VALUES (1,'ING001','Sueldo Básico','ingreso','fijo',NULL,NULL,'SUELDO_CONTRATO',1,'activo','Sueldo básico según contrato del trabajador','Todos los trabajadores','2025-08-26 21:28:06','2025-08-26 21:28:06'),(2,'ING002','Bonificación por Antigüedad','ingreso','calculado',NULL,NULL,'IF(AÑOS_SERVICIO > 2, SUELDO_BASICO * 0.05 * AÑOS_SERVICIO, 0)',2,'activo','Bonificación del 5% por año de servicio después del segundo año','Personal con +2 años','2025-08-26 21:28:06','2025-08-26 21:28:06'),(3,'ING003','Horas Extras','ingreso','calculado',NULL,NULL,'HORAS_EXTRAS * (SUELDO_BASICO / 240) * 1.25',3,'activo','Pago de horas extras con recargo del 25%','Personal operativo','2025-08-26 21:28:06','2025-08-26 21:28:06'),(4,'ING004','Bonificación Familiar','ingreso','fijo',93.00,NULL,'93',4,'activo','Bonificación familiar según ley','Trabajadores con hijos','2025-08-26 21:28:06','2025-08-26 21:28:06'),(5,'ING005','Movilidad','ingreso','fijo',150.00,NULL,'150',5,'activo','Subsidio de movilidad','Personal de oficina','2025-08-26 21:28:06','2025-08-27 10:36:21'),(6,'DESC001','AFP/SNP','descuento','calculado',NULL,NULL,'IF(TIPO_PENSION = \"AFP\", TOTAL_INGRESOS * 0.13, TOTAL_INGRESOS * 0.13)',1,'activo','Descuento por sistema de pensiones','Todos','2025-08-26 21:28:06','2025-08-26 21:28:06'),(7,'DESC002','Tardanzas','descuento','calculado',NULL,NULL,'MINUTOS_TARDANZA * (SUELDO_BASICO / (30 * 8 * 60))',2,'activo','Descuento por minutos de tardanza','Todos','2025-08-26 21:28:06','2025-08-27 10:37:08'),(8,'DESC003','Préstamo Personal','descuento','variable',NULL,NULL,'VALOR_CUOTA',3,'inactivo','Descuento por préstamo personal','Según aplique','2025-08-26 21:28:06','2025-08-27 10:37:32'),(9,'DESC004','Seguro de Vida','descuento','porcentual',NULL,0.50,'SUELDO_BASICO * 0.005',4,'inactivo','Seguro de vida 0.5% del sueldo básico','Personal permanente','2025-08-26 21:28:06','2025-08-27 10:37:28'),(10,'APT001','EsSalud','aporte','porcentual',NULL,9.00,'TOTAL_INGRESOS * 0.09',1,'activo','Aporte patronal a EsSalud - 9%','Empleador','2025-08-26 21:28:06','2025-08-26 21:28:06'),(11,'APT002','SENATI','aporte','porcentual',NULL,0.75,'TOTAL_INGRESOS * 0.0075',2,'activo','Aporte al SENATI - 0.75%','Empleador','2025-08-26 21:28:06','2025-08-26 21:28:06'),(12,'APT003','SCTR','aporte','porcentual',NULL,1.20,'TOTAL_INGRESOS * 0.012',3,'activo','Seguro Complementario de Trabajo de Riesgo','Empleador','2025-08-26 21:28:06','2025-08-26 21:28:06'),(13,'ING006','REINTEGRO','ingreso','porcentual',60.00,12.00,NULL,6,'activo','ghj gj ghjg','Todos','2025-08-27 14:32:57','2025-08-27 14:46:59');
/*!40000 ALTER TABLE `conceptos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contratos`
--

DROP TABLE IF EXISTS `contratos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contratos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `trabajador_id` int NOT NULL,
  `tipo_contrato` enum('indefinido','plazo_fijo','temporal','practicas') NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date DEFAULT NULL,
  `salario` decimal(10,2) NOT NULL,
  `estado` enum('activo','terminado','suspendido') DEFAULT 'activo',
  `observaciones` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `trabajador_id` (`trabajador_id`),
  CONSTRAINT `contratos_ibfk_1` FOREIGN KEY (`trabajador_id`) REFERENCES `trabajadores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contratos`
--

LOCK TABLES `contratos` WRITE;
/*!40000 ALTER TABLE `contratos` DISABLE KEYS */;
/*!40000 ALTER TABLE `contratos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `detalle_conceptos_planilla`
--

DROP TABLE IF EXISTS `detalle_conceptos_planilla`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_conceptos_planilla` (
  `id` int NOT NULL AUTO_INCREMENT,
  `detalle_planilla_id` int NOT NULL,
  `concepto_id` int NOT NULL,
  `valor_calculado` decimal(10,2) NOT NULL,
  `base_calculo` decimal(10,2) DEFAULT NULL,
  `observaciones` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `detalle_planilla_id` (`detalle_planilla_id`),
  KEY `concepto_id` (`concepto_id`),
  CONSTRAINT `detalle_conceptos_planilla_ibfk_1` FOREIGN KEY (`detalle_planilla_id`) REFERENCES `detalle_planilla` (`id`) ON DELETE CASCADE,
  CONSTRAINT `detalle_conceptos_planilla_ibfk_2` FOREIGN KEY (`concepto_id`) REFERENCES `conceptos` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `detalle_conceptos_planilla`
--

LOCK TABLES `detalle_conceptos_planilla` WRITE;
/*!40000 ALTER TABLE `detalle_conceptos_planilla` DISABLE KEYS */;
INSERT INTO `detalle_conceptos_planilla` VALUES (1,1,4,93.00,NULL,NULL),(2,1,5,150.00,NULL,NULL),(3,1,13,144.00,NULL,NULL),(4,1,10,34.83,NULL,NULL),(5,1,11,2.90,NULL,NULL),(6,1,12,4.64,NULL,NULL),(7,2,4,93.00,NULL,NULL),(8,2,5,150.00,NULL,NULL),(9,2,13,300.00,NULL,NULL),(10,2,10,48.87,NULL,NULL),(11,2,11,4.07,NULL,NULL),(12,2,12,6.52,NULL,NULL),(13,3,4,93.00,NULL,NULL),(14,3,5,150.00,NULL,NULL),(15,3,13,216.00,NULL,NULL),(16,3,10,41.31,NULL,NULL),(17,3,11,3.44,NULL,NULL),(18,3,12,5.51,NULL,NULL),(19,4,4,93.00,NULL,NULL),(20,4,5,150.00,NULL,NULL),(21,4,13,144.00,NULL,NULL),(22,4,10,34.83,NULL,NULL),(23,4,11,2.90,NULL,NULL),(24,4,12,4.64,NULL,NULL),(25,5,4,93.00,NULL,NULL),(26,5,5,150.00,NULL,NULL),(27,5,13,300.00,NULL,NULL),(28,5,10,48.87,NULL,NULL),(29,5,11,4.07,NULL,NULL),(30,5,12,6.52,NULL,NULL),(31,6,4,93.00,NULL,NULL),(32,6,5,150.00,NULL,NULL),(33,6,13,216.00,NULL,NULL),(34,6,10,41.31,NULL,NULL),(35,6,11,3.44,NULL,NULL),(36,6,12,5.51,NULL,NULL);
/*!40000 ALTER TABLE `detalle_conceptos_planilla` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `detalle_planilla`
--

DROP TABLE IF EXISTS `detalle_planilla`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_planilla` (
  `id` int NOT NULL AUTO_INCREMENT,
  `planilla_id` int NOT NULL,
  `trabajador_id` int NOT NULL,
  `sueldo_basico` decimal(10,2) NOT NULL,
  `total_ingresos` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total_descuentos` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total_aportes` decimal(10,2) NOT NULL DEFAULT '0.00',
  `neto_pagar` decimal(10,2) NOT NULL DEFAULT '0.00',
  `dias_trabajados` int DEFAULT '30',
  `horas_extras` decimal(4,1) DEFAULT '0.0',
  `tardanzas_minutos` int DEFAULT '0',
  `observaciones` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_planilla_trabajador` (`planilla_id`,`trabajador_id`),
  KEY `trabajador_id` (`trabajador_id`),
  KEY `idx_planilla_id` (`planilla_id`),
  CONSTRAINT `detalle_planilla_ibfk_1` FOREIGN KEY (`planilla_id`) REFERENCES `planillas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `detalle_planilla_ibfk_2` FOREIGN KEY (`trabajador_id`) REFERENCES `trabajadores` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `detalle_planilla`
--

LOCK TABLES `detalle_planilla` WRITE;
/*!40000 ALTER TABLE `detalle_planilla` DISABLE KEYS */;
INSERT INTO `detalle_planilla` VALUES (1,1,6,1200.00,387.00,0.00,42.38,387.00,30,0.0,0,NULL,'2025-08-27 20:12:29'),(2,1,4,2500.00,543.00,0.00,59.46,543.00,30,0.0,0,NULL,'2025-08-27 20:12:29'),(3,1,5,1800.00,459.00,0.00,50.26,459.00,30,0.0,0,NULL,'2025-08-27 20:12:29'),(4,2,6,1200.00,387.00,0.00,42.38,387.00,30,0.0,0,NULL,'2025-08-27 20:24:44'),(5,2,4,2500.00,543.00,0.00,59.46,543.00,30,0.0,0,NULL,'2025-08-27 20:24:44'),(6,2,5,1800.00,459.00,0.00,50.26,459.00,30,0.0,0,NULL,'2025-08-27 20:24:44');
/*!40000 ALTER TABLE `detalle_planilla` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dimensions`
--

DROP TABLE IF EXISTS `dimensions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dimensions` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `variable_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_dimensions_variable` (`variable_id`),
  KEY `idx_dimensions_status` (`status`),
  KEY `idx_dimensions_name` (`name`),
  CONSTRAINT `dimensions_ibfk_1` FOREIGN KEY (`variable_id`) REFERENCES `variables` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dimensions`
--

LOCK TABLES `dimensions` WRITE;
/*!40000 ALTER TABLE `dimensions` DISABLE KEYS */;
INSERT INTO `dimensions` VALUES ('dim-automatizacion','Automatización de Procesos','Dimensión que mide el nivel de automatización de los procesos de RRHH','vd-gestion-rrhh','active','2025-09-02 06:47:34','2025-09-02 06:47:34'),('dim-capacitacion','Capacitación y Formación','Dimensión que mide la efectividad de los programas de capacitación','vd-desarrollo-talento','active','2025-09-02 06:47:34','2025-09-02 06:47:34'),('dim-evaluacion-desempeno','Evaluación de Desempeño','Dimensión relacionada con la evaluación y seguimiento del desempeño laboral','vd-gestion-rrhh','active','2025-09-02 06:47:34','2025-09-02 06:47:34'),('dim-gestion-ceses','Gestión de Ceses','Dimensión relacionada con la gestión adecuada de las desvinculaciones laborales','vd-gestion-rrhh','active','2025-09-02 06:47:34','2025-09-02 06:47:34'),('dim-reclutamiento','Reclutamiento y Selección','Dimensión enfocada en la efectividad de los procesos de contratación','vd-gestion-rrhh','active','2025-09-02 06:47:34','2025-09-02 06:47:34'),('dim-retencion','Retención de Talento','Dimensión que mide la capacidad de retener empleados clave','vd-desarrollo-talento','active','2025-09-02 06:47:34','2025-09-02 06:47:34');
/*!40000 ALTER TABLE `dimensions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `indicator_historical_data`
--

DROP TABLE IF EXISTS `indicator_historical_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `indicator_historical_data` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `indicator_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `period` varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` decimal(15,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_indicator_period` (`indicator_id`,`period`),
  KEY `idx_historical_indicator` (`indicator_id`),
  KEY `idx_historical_period` (`period`),
  CONSTRAINT `indicator_historical_data_ibfk_1` FOREIGN KEY (`indicator_id`) REFERENCES `indicators` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `indicator_historical_data`
--

LOCK TABLES `indicator_historical_data` WRITE;
/*!40000 ALTER TABLE `indicator_historical_data` DISABLE KEYS */;
INSERT INTO `indicator_historical_data` VALUES (1,'ind-automatizacion-rrhh','2024-07',82.30,'2025-09-02 06:47:34'),(2,'ind-automatizacion-rrhh','2024-08',84.10,'2025-09-02 06:47:34'),(3,'ind-automatizacion-rrhh','2024-09',85.70,'2025-09-02 06:47:34'),(4,'ind-automatizacion-rrhh','2024-10',86.20,'2025-09-02 06:47:34'),(5,'ind-automatizacion-rrhh','2024-11',86.90,'2025-09-02 06:47:34'),(6,'ind-automatizacion-rrhh','2024-12',87.50,'2025-09-02 06:47:34'),(7,'ind-evaluaciones-completadas','2024-07',88.50,'2025-09-02 06:47:34'),(8,'ind-evaluaciones-completadas','2024-08',90.20,'2025-09-02 06:47:34'),(9,'ind-evaluaciones-completadas','2024-09',91.10,'2025-09-02 06:47:34'),(10,'ind-evaluaciones-completadas','2024-10',91.80,'2025-09-02 06:47:34'),(11,'ind-evaluaciones-completadas','2024-11',92.00,'2025-09-02 06:47:34'),(12,'ind-evaluaciones-completadas','2024-12',92.30,'2025-09-02 06:47:34'),(13,'ind-empleados-capacitados','2024-07',75.20,'2025-09-02 06:47:34'),(14,'ind-empleados-capacitados','2024-08',76.80,'2025-09-02 06:47:34'),(15,'ind-empleados-capacitados','2024-09',77.30,'2025-09-02 06:47:34'),(16,'ind-empleados-capacitados','2024-10',78.10,'2025-09-02 06:47:34'),(17,'ind-empleados-capacitados','2024-11',78.50,'2025-09-02 06:47:34'),(18,'ind-empleados-capacitados','2024-12',78.90,'2025-09-02 06:47:34'),(19,'ind-efectividad-reclutamiento','2024-07',86.40,'2025-09-02 06:47:34'),(20,'ind-efectividad-reclutamiento','2024-08',87.20,'2025-09-02 06:47:34'),(21,'ind-efectividad-reclutamiento','2024-09',88.10,'2025-09-02 06:47:34'),(22,'ind-efectividad-reclutamiento','2024-10',88.70,'2025-09-02 06:47:34'),(23,'ind-efectividad-reclutamiento','2024-11',89.00,'2025-09-02 06:47:34'),(24,'ind-efectividad-reclutamiento','2024-12',89.20,'2025-09-02 06:47:34'),(25,'ind-retencion-empleados-clave','2024-07',93.80,'2025-09-02 06:47:34'),(26,'ind-retencion-empleados-clave','2024-08',94.10,'2025-09-02 06:47:34'),(27,'ind-retencion-empleados-clave','2024-09',94.30,'2025-09-02 06:47:34'),(28,'ind-retencion-empleados-clave','2024-10',94.40,'2025-09-02 06:47:34'),(29,'ind-retencion-empleados-clave','2024-11',94.50,'2025-09-02 06:47:34'),(30,'ind-retencion-empleados-clave','2024-12',94.60,'2025-09-02 06:47:34'),(31,'ind-ceses-gestionados','2024-07',95.20,'2025-09-02 06:47:34'),(32,'ind-ceses-gestionados','2024-08',95.80,'2025-09-02 06:47:34'),(33,'ind-ceses-gestionados','2024-09',96.10,'2025-09-02 06:47:34'),(34,'ind-ceses-gestionados','2024-10',96.40,'2025-09-02 06:47:34'),(35,'ind-ceses-gestionados','2024-11',96.60,'2025-09-02 06:47:34'),(36,'ind-ceses-gestionados','2024-12',96.80,'2025-09-02 06:47:34'),(37,'ind-automatizacion-rrhh','2025-09',88.50,'2025-09-02 06:49:00'),(38,'ind-empleados-no-capacitados','2025-09',90.00,'2025-09-02 14:47:20');
/*!40000 ALTER TABLE `indicator_historical_data` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `indicators`
--

DROP TABLE IF EXISTS `indicators`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `indicators` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `dimension_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('porcentaje','cantidad','tiempo','costo','ratio') COLLATE utf8mb4_unicode_ci NOT NULL,
  `current_value` decimal(15,2) DEFAULT '0.00',
  `target_value` decimal(15,2) DEFAULT '0.00',
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `formula` text COLLATE utf8mb4_unicode_ci,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_indicators_dimension` (`dimension_id`),
  KEY `idx_indicators_type` (`type`),
  KEY `idx_indicators_status` (`status`),
  KEY `idx_indicators_performance` (`current_value`,`target_value`),
  KEY `idx_indicators_name` (`name`),
  CONSTRAINT `indicators_ibfk_1` FOREIGN KEY (`dimension_id`) REFERENCES `dimensions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `indicators`
--

LOCK TABLES `indicators` WRITE;
/*!40000 ALTER TABLE `indicators` DISABLE KEYS */;
INSERT INTO `indicators` VALUES ('ind-automatizacion-rrhh','Automatización de tareas en RRHH','Porcentaje de tareas de RRHH que han sido automatizadas usando tecnología','dim-automatizacion','porcentaje',88.50,85.00,'%','(Tareas automatizadas / Total de tareas) * 100','active','2025-09-02 06:47:34','2025-09-02 06:49:00'),('ind-ceses-gestionados','Ceses gestionados correctamente','Porcentaje de procesos de cese gestionados siguiendo los protocolos establecidos','dim-gestion-ceses','porcentaje',96.80,95.00,'%','(Ceses gestionados correctamente / Total ceses) * 100','active','2025-09-02 06:47:34','2025-09-02 06:47:34'),('ind-efectividad-reclutamiento','Efectividad del reclutamiento','Porcentaje de contrataciones exitosas vs total de contrataciones realizadas','dim-reclutamiento','porcentaje',89.20,85.00,'%','(Contrataciones exitosas / Total contrataciones) * 100','active','2025-09-02 06:47:34','2025-09-02 06:47:34'),('ind-empleados-capacitados','Empleados en programas de formación','Porcentaje de empleados que participaron en programas de capacitación','dim-capacitacion','porcentaje',78.90,80.00,'%','(Empleados en formación / Total empleados) * 100','active','2025-09-02 06:47:34','2025-09-02 06:47:34'),('ind-empleados-no-capacitados','Empleados de programación en formación','fdsfdfsd','dim-capacitacion','porcentaje',90.00,80.00,'%','(Total / Indicador2) * 100','active','2025-09-02 14:47:20','2025-09-02 14:48:23'),('ind-evaluaciones-completadas','Evaluaciones de desempeño completadas','Porcentaje de evaluaciones de desempeño completadas en el período establecido','dim-evaluacion-desempeno','porcentaje',92.30,95.00,'%','(Evaluaciones completadas / Evaluaciones programadas) * 100','active','2025-09-02 06:47:34','2025-09-02 06:47:34'),('ind-retencion-empleados-clave','Retención de empleados clave','Porcentaje de empleados clave que permanecen en la organización','dim-retencion','porcentaje',94.60,90.00,'%','(Empleados clave retenidos / Total empleados clave) * 100','active','2025-09-02 06:47:34','2025-09-02 06:47:34');
/*!40000 ALTER TABLE `indicators` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` varchar(100) NOT NULL,
  `name` varchar(200) NOT NULL,
  `group_id` varchar(50) NOT NULL,
  `group_name` varchar(100) NOT NULL,
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES ('concepts.create','Crear conceptos','concepts','? Gestión de Conceptos','Permite crear nuevos conceptos','2025-08-28 15:44:49'),('concepts.edit','Editar conceptos','concepts','? Gestión de Conceptos','Permite editar conceptos existentes','2025-08-28 15:44:49'),('concepts.toggle','Activar/Desactivar conceptos','concepts','? Gestión de Conceptos','Permite activar o desactivar conceptos','2025-08-28 15:44:49'),('concepts.view','Ver conceptos','concepts','? Gestión de Conceptos','Permite ver conceptos de planilla','2025-08-28 15:44:49'),('payroll.approve','Aprobar planillas','payroll','? Gestión de Planillas','Permite aprobar planillas procesadas','2025-08-28 15:44:24'),('payroll.process','Procesar planillas','payroll','? Gestión de Planillas','Permite procesar nuevas planillas','2025-08-28 15:44:24'),('payroll.reports','Generar reportes','payroll','? Gestión de Planillas','Permite generar reportes de planillas','2025-08-28 15:44:24'),('payroll.view','Ver planillas','payroll','? Gestión de Planillas','Permite ver planillas procesadas','2025-08-28 15:44:24'),('reports.dashboard','Ver dashboard ejecutivo','reports','? Reportes y Análisis','Permite acceder al dashboard ejecutivo','2025-08-28 15:45:47'),('reports.export','Exportar datos','reports','? Reportes y Análisis','Permite exportar información del sistema','2025-08-28 15:45:47'),('reports.metrics','Acceso a métricas avanzadas','reports','? Reportes y Análisis','Permite ver métricas avanzadas del sistema','2025-08-28 15:45:47'),('reports.schedule','Programar reportes','reports','? Reportes y Análisis','Permite programar reportes automáticos','2025-08-28 15:45:47'),('requests.approve','Aprobar solicitudes','requests','? Gestión de Solicitudes','Permite aprobar solicitudes pendientes','2025-08-28 15:45:10'),('requests.reject','Rechazar solicitudes','requests','? Gestión de Solicitudes','Permite rechazar solicitudes','2025-08-28 15:45:10'),('requests.reports','Generar reportes de solicitudes','requests','? Gestión de Solicitudes','Permite generar reportes de solicitudes','2025-08-28 15:45:10'),('requests.view','Ver todas las solicitudes','requests','? Gestión de Solicitudes','Permite ver todas las solicitudes del sistema','2025-08-28 15:45:10'),('system.config','Configuración del sistema','system','⚙️ Administración del Sistema','Permite configurar parámetros del sistema','2025-08-28 15:45:26'),('system.logs','Ver logs del sistema','system','⚙️ Administración del Sistema','Permite ver logs de auditoría','2025-08-28 15:45:26'),('system.roles','Gestionar roles','system','⚙️ Administración del Sistema','Permite gestionar roles y permisos','2025-08-28 15:45:26'),('system.users','Gestionar usuarios','system','⚙️ Administración del Sistema','Permite gestionar usuarios del sistema','2025-08-28 15:45:26'),('users.create','Crear trabajadores','users','? Gestión de Personal','Permite crear nuevos trabajadores','2025-08-28 15:44:07'),('users.delete','Eliminar trabajadores','users','? Gestión de Personal','Permite eliminar trabajadores','2025-08-28 15:44:07'),('users.edit','Editar trabajadores','users','? Gestión de Personal','Permite editar información de trabajadores','2025-08-28 15:44:07'),('users.view','Ver trabajadores','users','? Gestión de Personal','Permite ver la lista de trabajadores','2025-08-28 15:44:07');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `planillas`
--

DROP TABLE IF EXISTS `planillas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `planillas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `periodo` varchar(7) NOT NULL COMMENT 'YYYY-MM',
  `tipo_planilla` enum('regular','aguinaldo','gratificacion','cts') NOT NULL DEFAULT 'regular',
  `tipo_personal` enum('todos','docente','administrativo','servicio') NOT NULL DEFAULT 'todos',
  `fecha_proceso` datetime DEFAULT CURRENT_TIMESTAMP,
  `estado` enum('borrador','calculada','procesada','anulada') NOT NULL DEFAULT 'borrador',
  `total_trabajadores` int NOT NULL DEFAULT '0',
  `total_ingresos` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total_descuentos` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total_aportes` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total_neto` decimal(12,2) NOT NULL DEFAULT '0.00',
  `observaciones` text,
  `usuario_proceso_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_periodo_tipo` (`periodo`,`tipo_planilla`),
  KEY `idx_periodo` (`periodo`),
  KEY `idx_estado` (`estado`),
  KEY `idx_fecha_proceso` (`fecha_proceso`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `planillas`
--

LOCK TABLES `planillas` WRITE;
/*!40000 ALTER TABLE `planillas` DISABLE KEYS */;
INSERT INTO `planillas` VALUES (1,'2025-08','regular','todos','2025-08-27 15:12:29','procesada',3,1389.00,0.00,152.10,1389.00,NULL,NULL,'2025-08-27 20:12:29','2025-08-27 20:12:29'),(2,'2025-09','regular','todos','2025-08-27 15:24:44','procesada',3,1389.00,0.00,152.10,1389.00,NULL,NULL,'2025-08-27 20:24:44','2025-08-27 20:24:44');
/*!40000 ALTER TABLE `planillas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_id` varchar(50) NOT NULL,
  `permission_id` varchar(100) NOT NULL,
  `granted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `granted_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_role_permission` (`role_id`,`permission_id`),
  KEY `permission_id` (`permission_id`),
  KEY `granted_by` (`granted_by`),
  CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_permissions_ibfk_3` FOREIGN KEY (`granted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES (1,'super-admin','users.view','2025-08-28 15:46:10',NULL),(2,'super-admin','users.create','2025-08-28 15:46:10',NULL),(3,'super-admin','users.edit','2025-08-28 15:46:10',NULL),(4,'super-admin','users.delete','2025-08-28 15:46:10',NULL),(5,'super-admin','payroll.view','2025-08-28 15:46:10',NULL),(6,'super-admin','payroll.process','2025-08-28 15:46:10',NULL),(7,'super-admin','payroll.approve','2025-08-28 15:46:10',NULL),(8,'super-admin','payroll.reports','2025-08-28 15:46:10',NULL),(9,'super-admin','concepts.view','2025-08-28 15:46:10',NULL),(10,'super-admin','concepts.create','2025-08-28 15:46:10',NULL),(11,'super-admin','concepts.edit','2025-08-28 15:46:10',NULL),(12,'super-admin','concepts.toggle','2025-08-28 15:46:10',NULL),(13,'super-admin','requests.view','2025-08-28 15:46:10',NULL),(14,'super-admin','requests.approve','2025-08-28 15:46:10',NULL),(15,'super-admin','requests.reject','2025-08-28 15:46:10',NULL),(16,'super-admin','requests.reports','2025-08-28 15:46:10',NULL),(17,'super-admin','system.users','2025-08-28 15:46:10',NULL),(18,'super-admin','system.roles','2025-08-28 15:46:10',NULL),(19,'super-admin','system.config','2025-08-28 15:46:10',NULL),(20,'super-admin','system.logs','2025-08-28 15:46:10',NULL),(21,'super-admin','reports.dashboard','2025-08-28 15:46:10',NULL),(22,'super-admin','reports.export','2025-08-28 15:46:10',NULL),(23,'super-admin','reports.schedule','2025-08-28 15:46:10',NULL),(24,'super-admin','reports.metrics','2025-08-28 15:46:10',NULL),(25,'admin','users.view','2025-08-28 15:46:10',NULL),(26,'admin','users.create','2025-08-28 15:46:10',NULL),(27,'admin','users.edit','2025-08-28 15:46:10',NULL),(28,'admin','payroll.view','2025-08-28 15:46:10',NULL),(29,'admin','payroll.process','2025-08-28 15:46:10',NULL),(30,'admin','payroll.approve','2025-08-28 15:46:10',NULL),(31,'admin','payroll.reports','2025-08-28 15:46:10',NULL),(32,'admin','concepts.view','2025-08-28 15:46:10',NULL),(33,'admin','concepts.create','2025-08-28 15:46:10',NULL),(34,'admin','concepts.edit','2025-08-28 15:46:10',NULL),(35,'admin','concepts.toggle','2025-08-28 15:46:10',NULL),(36,'admin','requests.view','2025-08-28 15:46:10',NULL),(37,'admin','requests.approve','2025-08-28 15:46:10',NULL),(38,'admin','requests.reject','2025-08-28 15:46:10',NULL),(39,'admin','requests.reports','2025-08-28 15:46:10',NULL),(40,'admin','reports.dashboard','2025-08-28 15:46:10',NULL),(41,'admin','reports.export','2025-08-28 15:46:10',NULL),(42,'admin','reports.schedule','2025-08-28 15:46:10',NULL),(43,'trabajador','payroll.view','2025-08-28 15:46:10',NULL);
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` enum('admin','user','viewer') NOT NULL DEFAULT 'user',
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES ('admin','Administrador','admin','Gestión de planillas, conceptos y reportes administrativos','2025-08-28 15:38:33','2025-08-28 15:38:33'),('gestor-de-planillas','GESTOR DE PLANILLAS','admin','NINGUNO','2025-08-29 13:06:34','2025-08-29 13:06:34'),('super-admin','Super Administrador','admin','Control total del sistema, configuración y gestión de usuarios','2025-08-28 15:38:33','2025-08-28 15:38:33'),('trabajador','Trabajador','viewer','Solo consulta de información personal y solicitudes','2025-08-28 15:38:33','2025-08-28 15:38:33'),('user','Usuario Operativo','user','Consulta de información y operaciones básicas del sistema','2025-08-28 15:38:33','2025-08-28 15:43:12');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `solicitudes`
--

DROP TABLE IF EXISTS `solicitudes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `solicitudes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tipo_solicitud` enum('vacaciones','permiso','licencia','adelanto','certificado','otros') NOT NULL,
  `titulo` varchar(200) NOT NULL,
  `trabajador_id` int NOT NULL,
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_inicio` date DEFAULT NULL,
  `fecha_fin` date DEFAULT NULL,
  `motivo` text NOT NULL,
  `estado` enum('pendiente','en-revision','aprobada','rechazada') DEFAULT 'pendiente',
  `urgencia` enum('normal','alta','urgente') DEFAULT 'normal',
  `dias_solicitados` int DEFAULT NULL,
  `horario` varchar(50) DEFAULT NULL,
  `monto` decimal(10,2) DEFAULT NULL,
  `proposito` varchar(200) DEFAULT NULL,
  `fecha_limite` date DEFAULT NULL,
  `observaciones` text,
  `usuario_proceso_id` int DEFAULT NULL,
  `fecha_aprobacion` datetime DEFAULT NULL,
  `fecha_rechazo` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `trabajador_id` (`trabajador_id`),
  KEY `idx_tipo_solicitud` (`tipo_solicitud`),
  KEY `idx_estado` (`estado`),
  KEY `idx_fecha_creacion` (`fecha_creacion`),
  CONSTRAINT `solicitudes_ibfk_1` FOREIGN KEY (`trabajador_id`) REFERENCES `trabajadores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `solicitudes`
--

LOCK TABLES `solicitudes` WRITE;
/*!40000 ALTER TABLE `solicitudes` DISABLE KEYS */;
INSERT INTO `solicitudes` VALUES (9,'vacaciones','Solicitud de Vacaciones',4,'2025-08-28 04:41:10','2025-08-28','2025-08-30','Viaje familiar programado. He coordinado con mis colegas para cubrir mis responsabilidades durante mi ausencia.','pendiente','normal',10,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-08-28 09:41:10','2025-08-28 14:00:04'),(10,'permiso','Permiso por Cita Médica',5,'2025-08-28 04:41:10','2025-07-22',NULL,'Cita médica programada en el Hospital Nacional. Adjunto constancia médica.','aprobada','alta',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-08-28 09:41:10','2025-08-28 09:41:10'),(11,'adelanto','Adelanto de Sueldo',6,'2025-08-28 04:41:10',NULL,NULL,'Emergencia familiar. Necesito cubrir gastos médicos urgentes.','en-revision','urgente',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-08-28 09:41:10','2025-08-28 09:41:10'),(12,'certificado','Certificado Laboral',9,'2025-08-28 04:41:10',NULL,NULL,'Necesito certificado laboral para solicitud de préstamo hipotecario en el banco.','rechazada','normal',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-08-28 09:41:10','2025-08-28 09:41:10'),(13,'vacaciones','Solicitud de Vacaciones',4,'2025-08-28 04:41:23','2025-08-05','2025-08-15','Viaje familiar programado. He coordinado con mis colegas para cubrir mis responsabilidades durante mi ausencia.','pendiente','normal',10,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-08-28 09:41:23','2025-08-28 09:41:23'),(14,'permiso','Permiso por Cita Médica',5,'2025-08-28 04:41:38','2025-07-22',NULL,'Cita médica programada en el Hospital Nacional. Adjunto constancia médica.','aprobada','alta',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-08-28 09:41:38','2025-08-28 09:41:38'),(15,'adelanto','Adelanto de Sueldo',6,'2025-08-28 04:41:47',NULL,NULL,'Emergencia familiar. Necesito cubrir gastos médicos urgentes.','en-revision','urgente',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-08-28 09:41:47','2025-08-28 09:41:47'),(16,'certificado','Certificado Laboral',9,'2025-08-28 04:41:55',NULL,NULL,'Necesito certificado laboral para solicitud de préstamo hipotecario en el banco.','rechazada','normal',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-08-28 09:41:55','2025-08-28 09:41:55'),(17,'vacaciones','Solicitud de Vacaciones',9,'2025-08-28 08:58:45','2025-08-28','2025-08-31','fsdddddddddddddddddddddddddddddddddddddddddddddddd','pendiente','alta',4,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-08-28 13:58:45','2025-08-28 13:58:45');
/*!40000 ALTER TABLE `solicitudes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `solicitudes_timeline`
--

DROP TABLE IF EXISTS `solicitudes_timeline`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `solicitudes_timeline` (
  `id` int NOT NULL AUTO_INCREMENT,
  `solicitud_id` int NOT NULL,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  `evento` enum('created','reviewed','approved','rejected','updated','reactivated') NOT NULL,
  `descripcion` varchar(500) NOT NULL,
  `usuario` varchar(200) NOT NULL,
  `observaciones` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `solicitud_id` (`solicitud_id`),
  KEY `idx_evento` (`evento`),
  KEY `idx_fecha` (`fecha`),
  CONSTRAINT `solicitudes_timeline_ibfk_1` FOREIGN KEY (`solicitud_id`) REFERENCES `solicitudes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `solicitudes_timeline`
--

LOCK TABLES `solicitudes_timeline` WRITE;
/*!40000 ALTER TABLE `solicitudes_timeline` DISABLE KEYS */;
INSERT INTO `solicitudes_timeline` VALUES (10,9,'2025-08-28 04:43:00','created','Solicitud creada','María Elena González',NULL,'2025-08-28 09:43:00'),(11,10,'2025-08-28 04:43:00','created','Solicitud creada','Juan Carlos Pérez',NULL,'2025-08-28 09:43:00'),(12,10,'2025-08-28 04:43:00','reviewed','Solicitud revisada','Ana Torres',NULL,'2025-08-28 09:43:00'),(13,10,'2025-08-28 04:43:00','approved','Solicitud aprobada','Ana Torres',NULL,'2025-08-28 09:43:00'),(14,11,'2025-08-28 04:43:00','created','Solicitud creada','Carlos Alberto Ruiz',NULL,'2025-08-28 09:43:00'),(15,11,'2025-08-28 04:43:00','reviewed','En revisión por RRHH','María García',NULL,'2025-08-28 09:43:00'),(16,12,'2025-08-28 04:43:00','created','Solicitud creada','Ana Sofia Herrera',NULL,'2025-08-28 09:43:00'),(17,12,'2025-08-28 04:43:00','reviewed','Solicitud revisada','Ana Torres',NULL,'2025-08-28 09:43:00'),(18,12,'2025-08-28 04:43:00','rejected','Solicitud rechazada - Documentación incompleta','Ana Torres',NULL,'2025-08-28 09:43:00'),(19,17,'2025-08-28 08:58:45','created','Solicitud creada','RICHARD BARDALES',NULL,'2025-08-28 13:58:45'),(20,9,'2025-08-28 09:00:04','updated','Solicitud actualizada','Administrador',NULL,'2025-08-28 14:00:04');
/*!40000 ALTER TABLE `solicitudes_timeline` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_settings`
--

DROP TABLE IF EXISTS `system_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_name` varchar(50) NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text,
  `data_type` enum('string','number','boolean','json') DEFAULT 'string',
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_group_key` (`group_name`,`setting_key`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_settings`
--

LOCK TABLES `system_settings` WRITE;
/*!40000 ALTER TABLE `system_settings` DISABLE KEYS */;
INSERT INTO `system_settings` VALUES (1,'general','institution_name','Instituto Superior Tecnológico Nuevo Milenio','string','Nombre de la institución','2025-08-29 13:31:28','2025-09-01 21:40:43'),(2,'general','institution_ruc','20123456789','string','RUC de la institución','2025-08-29 13:31:28','2025-09-01 21:40:43'),(3,'general','institution_address','Jr. Los Andes 123, Callería, Coronel Portillo, Ucayali','string','Dirección de la institución','2025-08-29 13:31:28','2025-09-01 21:40:43'),(4,'general','institution_phone','061-575123','string','Teléfono institucional','2025-08-29 13:31:28','2025-09-01 21:40:43'),(5,'general','institution_email','contacto@instituto.edu.pe','string','Email institucional','2025-08-29 13:31:28','2025-09-01 21:40:44'),(6,'general','timezone','America/Lima','string','Zona horaria','2025-08-29 13:31:28','2025-09-01 21:40:44'),(7,'general','currency','PEN','string','Moneda del sistema','2025-08-29 13:31:28','2025-09-01 21:40:44'),(8,'general','fiscal_year','2025','string','Año fiscal actual','2025-08-29 13:31:28','2025-09-01 21:40:44'),(9,'planillas','payroll_period','mensual','string','Frecuencia de pago','2025-08-29 13:31:28','2025-09-01 21:40:43'),(10,'planillas','cutoff_day','30','number','Día de corte','2025-08-29 13:31:28','2025-09-01 21:40:43'),(11,'planillas','payment_day','5','number','Día de pago','2025-08-29 13:31:28','2025-09-01 21:40:44'),(12,'planillas','rounding_method','normal','string','Método de redondeo','2025-08-29 13:31:28','2025-09-01 21:40:44'),(13,'planillas','decimal_places','2','number','Decimales en cálculos','2025-08-29 13:31:28','2025-09-01 21:40:44'),(14,'planillas','auto_process','true','boolean','Procesamiento automático','2025-08-29 13:31:28','2025-09-01 21:40:44'),(15,'notifications','smtp_server','smtp.gmail.com','string','Servidor SMTP','2025-08-29 13:31:28','2025-08-29 13:31:28'),(16,'notifications','smtp_port','587','number','Puerto SMTP','2025-08-29 13:31:28','2025-08-29 13:31:28'),(17,'notifications','smtp_user','sistema@instituto.edu.pe','string','Usuario SMTP','2025-08-29 13:31:28','2025-08-29 13:31:28'),(18,'notifications','smtp_password','','string','Contraseña SMTP','2025-08-29 13:31:28','2025-08-29 13:31:28'),(19,'notifications','payroll_processed','true','boolean','Notificar planilla procesada','2025-08-29 13:31:28','2025-08-29 13:31:28'),(20,'notifications','contracts_expiring','true','boolean','Notificar contratos por vencer','2025-08-29 13:31:28','2025-08-29 13:31:28'),(21,'notifications','new_requests','false','boolean','Notificar nuevas solicitudes','2025-08-29 13:31:28','2025-08-29 13:31:28'),(22,'notifications','system_errors','true','boolean','Notificar errores del sistema','2025-08-29 13:31:28','2025-08-29 13:31:28'),(23,'security','session_timeout','30','number','Tiempo de sesión en minutos','2025-08-29 21:45:45','2025-08-29 21:45:45'),(24,'security','max_login_attempts','5','number','Intentos máximos de login','2025-08-29 21:45:45','2025-08-29 21:45:45'),(25,'security','password_min_length','8','number','Longitud mínima de contraseña','2025-08-29 21:45:45','2025-08-29 21:45:45'),(26,'security','require_password_change','90','number','Días para cambio de contraseña','2025-08-29 21:45:45','2025-08-29 21:45:45'),(27,'system','maintenance_mode','false','boolean','Modo mantenimiento','2025-08-29 21:45:45','2025-08-29 21:45:45'),(28,'system','backup_frequency','daily','string','Frecuencia de backup','2025-08-29 21:45:45','2025-08-29 21:45:45'),(29,'system','log_retention_days','90','number','Días de retención de logs','2025-08-29 21:45:45','2025-08-29 21:45:45'),(30,'system','max_file_upload_size','5','number','Tamaño máximo de archivo en MB','2025-08-29 21:45:45','2025-08-29 21:45:45');
/*!40000 ALTER TABLE `system_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trabajadores`
--

DROP TABLE IF EXISTS `trabajadores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trabajadores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `dni` varchar(20) NOT NULL,
  `nombres` varchar(100) NOT NULL,
  `apellido_paterno` varchar(100) NOT NULL,
  `apellido_materno` varchar(100) NOT NULL,
  `fecha_nacimiento` date NOT NULL,
  `genero` enum('masculino','femenino','otro') NOT NULL,
  `estado_civil` enum('soltero','casado','divorciado','viudo','conviviente') DEFAULT 'soltero',
  `nacionalidad` varchar(50) DEFAULT 'Peruana',
  `direccion` text,
  `fecha_ingreso` date NOT NULL,
  `cargo_id` int NOT NULL,
  `area_id` int NOT NULL,
  `sueldo_basico` decimal(10,2) NOT NULL,
  `tipo_contrato` enum('indefinido','plazo_fijo','temporal','practicas') DEFAULT 'indefinido',
  `fecha_fin` date DEFAULT NULL,
  `tipo_jornada` enum('tiempo_completo','medio_tiempo','por_horas') DEFAULT 'tiempo_completo',
  `supervisor_directo_id` int DEFAULT NULL,
  `essalud` tinyint(1) DEFAULT '1',
  `afp` varchar(50) DEFAULT NULL,
  `snp` tinyint(1) DEFAULT '0',
  `seguro_vida` tinyint(1) DEFAULT '0',
  `telefono_principal` varchar(20) DEFAULT NULL,
  `telefono_secundario` varchar(20) DEFAULT NULL,
  `correo_electronico` varchar(100) DEFAULT NULL,
  `correo_personal` varchar(100) DEFAULT NULL,
  `contacto_emergencia_nombre` varchar(150) DEFAULT NULL,
  `contacto_emergencia_relacion` varchar(50) DEFAULT NULL,
  `contacto_emergencia_telefono` varchar(20) DEFAULT NULL,
  `contacto_emergencia_correo` varchar(100) DEFAULT NULL,
  `estado` enum('activo','inactivo') DEFAULT 'activo',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dni` (`dni`),
  KEY `cargo_id` (`cargo_id`),
  KEY `area_id` (`area_id`),
  KEY `supervisor_directo_id` (`supervisor_directo_id`),
  CONSTRAINT `trabajadores_ibfk_1` FOREIGN KEY (`cargo_id`) REFERENCES `cargos` (`id`),
  CONSTRAINT `trabajadores_ibfk_2` FOREIGN KEY (`area_id`) REFERENCES `areas` (`id`),
  CONSTRAINT `trabajadores_ibfk_3` FOREIGN KEY (`supervisor_directo_id`) REFERENCES `trabajadores` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trabajadores`
--

LOCK TABLES `trabajadores` WRITE;
/*!40000 ALTER TABLE `trabajadores` DISABLE KEYS */;
INSERT INTO `trabajadores` VALUES (4,'70123456','Juan Carlos','Pérez','González','1985-03-15','masculino','casado','Peruana','Jr. Los Andes 123, Callería, Coronel Portillo, Ucayali','2020-03-14',1,1,2500.00,'indefinido',NULL,'tiempo_completo',NULL,1,NULL,0,0,'987654321',NULL,'juan.perez@instituto.edu.pe',NULL,'María González Vásquez','conyuge','987654322',NULL,'activo','2025-08-25 09:02:57','2025-08-25 09:02:57'),(5,'70234567','María Elena','González','Vásquez','1990-07-22','femenino','soltero','Peruana','Av. Centenario 456, Pucallpa','2024-01-14',4,2,1800.00,'indefinido',NULL,'tiempo_completo',NULL,1,NULL,0,0,'987654323',NULL,'maria.gonzalez@instituto.edu.pe',NULL,'Elena Vásquez Torres','madre','987654324',NULL,'activo','2025-08-25 09:04:26','2025-08-25 09:04:26'),(6,'70345678','Carlos Alberto','Ruiz','Mendoza','1978-12-10','masculino','divorciado','Peruana','Calle Lima 789, Pucallpa','2019-03-31',5,3,1200.00,'indefinido',NULL,'tiempo_completo',NULL,1,NULL,0,0,'987654325',NULL,'carlos.ruiz@instituto.edu.pe',NULL,'Alberto Ruiz García','padre','987654326',NULL,'activo','2025-08-25 09:04:39','2025-08-25 09:04:39'),(9,'45423841','RICHARD','BARDALES','LINARES','1988-02-03','masculino','soltero','Peruana','JR PADRE GUINNER 185','2025-08-26',3,2,3500.00,'plazo_fijo','2025-08-27','tiempo_completo',5,1,NULL,NULL,NULL,'910434752','910434752','richard.bardalesl@gmail.com','richard.bardalesl@gmail.com','RAUL','PADRE','910434752','richard.bardalesl@gmail.com','activo','2025-08-26 03:28:44','2025-08-27 23:33:50');
/*!40000 ALTER TABLE `trabajadores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_audit_logs`
--

DROP TABLE IF EXISTS `user_audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `action` enum('login','logout','created','updated','deleted','activated','deactivated','role_changed','config_updated') NOT NULL,
  `description` varchar(500) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `performed_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_action` (`action`),
  KEY `idx_created_at` (`created_at`),
  KEY `performed_by` (`performed_by`),
  CONSTRAINT `user_audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_audit_logs_ibfk_2` FOREIGN KEY (`performed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_audit_logs`
--

LOCK TABLES `user_audit_logs` WRITE;
/*!40000 ALTER TABLE `user_audit_logs` DISABLE KEYS */;
INSERT INTO `user_audit_logs` VALUES (5,9,'login','Inicio de sesión exitoso','127.0.0.1','Mozilla/5.0 Chrome/91.0',9,'2025-08-29 15:30:15'),(6,9,'config_updated','Configuración general actualizada','127.0.0.1','Mozilla/5.0 Chrome/91.0',9,'2025-08-29 15:32:45'),(7,10,'login','Inicio de sesión exitoso','192.168.1.100','Mozilla/5.0 Firefox/89.0',10,'2025-08-29 16:15:22'),(8,11,'created','Usuario creado por administrador','127.0.0.1','Mozilla/5.0 Chrome/91.0',9,'2025-08-29 16:28:12'),(9,9,'login','Inicio de sesión exitoso','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0',9,'2025-08-29 15:30:15'),(10,9,'config_updated','Configuración general actualizada','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0',9,'2025-08-29 15:32:45'),(11,10,'login','Inicio de sesión exitoso','192.168.1.100','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Firefox/89.0',10,'2025-08-29 16:15:22'),(12,11,'created','Usuario creado por administrador','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0',9,'2025-08-29 16:28:12'),(13,9,'','Departamento \"Tecnología\" creado','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0',9,'2025-08-29 17:45:33'),(14,9,'','Backup automático completado exitosamente','127.0.0.1','System/Cron',9,'2025-08-29 07:00:00');
/*!40000 ALTER TABLE `user_audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `dni` varchar(20) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `last_login` timestamp NULL DEFAULT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `role` varchar(50) DEFAULT 'usuario',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_role` (`role`),
  KEY `idx_status` (`status`),
  KEY `idx_dni` (`dni`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `users_ibfk_2` FOREIGN KEY (`role`) REFERENCES `roles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (9,'admin@instituto.edu.pe','$2a$10$SUusRFdlfVEvfG0bnSmLgupzGw7YyInRcgvY0ZuMnUqd.PbBNtxbC','Administrador del Sistema',NULL,NULL,'active',NULL,NULL,NULL,'super-admin','2025-08-23 17:20:37','2025-08-28 15:48:44'),(10,'jpml@gmail.com','$2a$10$pV9X9hvTt8oDFMkFduUSRuyk5E.rT3hRSCj3JlJH8VuPaoZbPmEEO','JUAN PEDRO MAYA LOPEZ','44444445','910434755','active',NULL,NULL,NULL,'user','2025-08-23 17:20:37','2025-08-29 13:05:02'),(11,'jzagaceta@innova.com','$2a$10$YloI7tCWpfa0Tt8GabPs2elboaEheJr3IaQOJvKaQfkll8NOI4Vfq','JORGE ALBERTO ZAGACETA','44444444','910434752','active',NULL,NULL,NULL,'admin','2025-08-29 11:28:12','2025-08-29 11:28:12');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `variables`
--

DROP TABLE IF EXISTS `variables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `variables` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_variables_status` (`status`),
  KEY `idx_variables_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `variables`
--

LOCK TABLES `variables` WRITE;
/*!40000 ALTER TABLE `variables` DISABLE KEYS */;
INSERT INTO `variables` VALUES ('vd-bienestar-clima','VD: Bienestar y Clima Laboral','Variable dimensional que mide el bienestar de los empleados y el clima organizacional','active','2025-09-02 06:47:34','2025-09-02 06:47:34'),('vd-desarrollo-talento','VD: Desarrollo del Talento','Variable dimensional enfocada en el desarrollo, formación y retención del talento humano','active','2025-09-02 06:47:34','2025-09-02 06:47:34'),('vd-gestion-rrhh','VD: Gestión de Recursos Humanos','Variable dimensional que agrupa todos los indicadores relacionados con la gestión integral de recursos humanos','active','2025-09-02 06:47:34','2025-09-02 06:47:34');
/*!40000 ALTER TABLE `variables` ENABLE KEYS */;
UNLOCK TABLES;
