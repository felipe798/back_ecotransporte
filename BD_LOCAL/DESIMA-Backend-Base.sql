-- =============================================
-- DESIMA Backend - PostgreSQL Database Setup
-- =============================================
-- Forzar encoding UTF8 para caracteres especiales (ñ, ó, etc.)
--\encoding UTF8

-- Crear base de datos (ejecutar como superusuario)
-- CREATE DATABASE desima;

-- =============================================
-- LIMPIAR TABLAS EXISTENTES (orden inverso por FK)
-- =============================================
-- DROP TABLE IF EXISTS client_tariff CASCADE;
-- DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS unidad CASCADE;
DROP TABLE IF EXISTS empresa_transporte CASCADE;
DROP TABLE IF EXISTS user_address CASCADE;
DROP TABLE IF EXISTS user_information CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS blacklist CASCADE;
DROP TABLE IF EXISTS refresh_token CASCADE;

-- =============================================
-- TABLA: roles
-- =============================================
CREATE TABLE IF NOT EXISTS roles (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(20) UNIQUE NOT NULL
);

-- =============================================
-- TABLA: user
-- =============================================
CREATE TABLE IF NOT EXISTS "user" (
    id                     SERIAL PRIMARY KEY,
    email                  VARCHAR(255) UNIQUE NOT NULL,
    password               VARCHAR(255) NOT NULL,
    role                   INTEGER NOT NULL DEFAULT 3 REFERENCES roles(id),
    "isActive"             INTEGER DEFAULT 0,
    "isVisible"            INTEGER DEFAULT 0,
    "lastLoginDate"        TIMESTAMP,
    "tokenRefreshPassword" VARCHAR(255),
    "tokenExpiryDate"      TIMESTAMP,
    "createdAt"            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLA: user_information
-- =============================================
CREATE TABLE IF NOT EXISTS user_information (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
    "userName"          VARCHAR(255) NOT NULL,
    "userAbbreviation"  VARCHAR(255) NOT NULL,
    "mainAddress"       INTEGER,
    "contactName"       VARCHAR(255),
    "contactEmail"      VARCHAR(255),
    "contactPhone"      VARCHAR(255),
    "createdAt"         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLA: user_address
-- =============================================
CREATE TABLE IF NOT EXISTS user_address (
    id             SERIAL PRIMARY KEY,
    "user"         INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    label          VARCHAR(100) NOT NULL,
    "contactName"  VARCHAR(200),
    "contactEmail" VARCHAR(100),
    "contactPhone" VARCHAR(50),
    address        VARCHAR(150) NOT NULL,
    city           VARCHAR(200) NOT NULL,
    state          VARCHAR(100) NOT NULL,
    "zipCode"      VARCHAR(15) NOT NULL,
    country        VARCHAR(200) NOT NULL,
    "createdAt"    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updateAt"     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLA: empresa_transporte (Empresas de Transporte)
-- =============================================
CREATE TABLE IF NOT EXISTS empresa_transporte (
    id         SERIAL PRIMARY KEY,
    nombre     VARCHAR(255) NOT NULL UNIQUE,
    ruc        VARCHAR(11),
    estado     VARCHAR(20) DEFAULT 'activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLA: unidad (Placas de vehículos)
-- =============================================
CREATE TABLE IF NOT EXISTS unidad (
    id         SERIAL PRIMARY KEY,
    placa      VARCHAR(20) NOT NULL UNIQUE,
    empresa_id INTEGER REFERENCES empresa_transporte(id),
    estado     VARCHAR(20) DEFAULT 'activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLA: documents (Guías de Remisión)
-- =============================================
-- La tabla ya existe, no se crea de nuevo.
-- CREATE TABLE IF NOT EXISTS documents (
--     id                      SERIAL PRIMARY KEY,
--     uploaded_by             INTEGER REFERENCES "user"(id),
--     pdf_file_path           VARCHAR(500),
--     pdf_original_name       VARCHAR(255),
--     -- Relación con unidad (placa)
--     unidad_id               INTEGER REFERENCES unidad(id),
--     -- Campos de auditoría
--     created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     updated_by              INTEGER REFERENCES "user"(id),
--     -- Campos extraídos del PDF
--     mes                     VARCHAR(50),
--     semana                  VARCHAR(50),
--     fecha                   DATE,
--     grt                     VARCHAR(100),
--     transportista           VARCHAR(255),
--     unidad                  VARCHAR(100),
--     empresa                 VARCHAR(255),
--     tn_enviado              DECIMAL(10, 2),
--     deposito                VARCHAR(255),
--     tn_recibida             DECIMAL(10, 2),
--     tn_recibida_data_cruda  DECIMAL(10, 2),
--     ticket                  VARCHAR(255),
--     grr                     VARCHAR(100),
--     cliente                 VARCHAR(255),
--     partida                 VARCHAR(255),
--     llegada                 VARCHAR(255),
--     transportado            VARCHAR(255),
--     -- Campos financieros
--     precio_unitario         DECIMAL(10, 2),
--     divisa                  VARCHAR(10),
--     precio_final            DECIMAL(12, 2),
--     pcosto                  DECIMAL(10, 2),
--     divisa_cost             VARCHAR(10),
--     costo_final             DECIMAL(12, 2),
--     margen_operativo        DECIMAL(12, 2),
--     -- Factura
--     factura                 VARCHAR(255),
--     -- Archivos adjuntos (URLs de Cloudinary)
--     documentos              TEXT[],
--     -- Estado de anulación
--     anulado                 BOOLEAN DEFAULT false,
--     -- URLs almacenadas en Cloudinary (arreglo de texto)
--     documentos             TEXT[]
-- );

-- =============================================
-- DATOS INICIALES
-- =============================================

-- Roles
INSERT INTO roles (id, name) VALUES
    (1, 'Administrator'),
    (2, 'User'),
    (3, 'Manager'),
    (4, 'Clients'),
    (5, 'Vendor'),
    (6, 'Sales Executive'),
    (7, 'Inventory Manager')
ON CONFLICT (id) DO NOTHING;

-- Usuarios
INSERT INTO "user" (id, email, password, role, "isActive", "isVisible") VALUES
    (1, 'jalban@acyde.com',               '$2a$08$KFNjEUgJ/AhaaonLmP21Yu.hwTCnr1/3C5ALTQu681uJd6FeUN4D2', 1, 1, 1),
    (2, 'jose_alban@outlook.com',         '$2a$08$KFNjEUgJ/AhaaonLmP21Yu.hwTCnr1/3C5ALTQu681uJd6FeUN4D2', 2, 6, 1),
    (3, 'etomasayala@gmail.com',          '$2a$08$KFNjEUgJ/AhaaonLmP21Yu.hwTCnr1/3C5ALTQu681uJd6FeUN4D2', 1, 1, 1),
    (4, 'Gerencia@ecotransporte.com',     '$2a$08$KFNjEUgJ/AhaaonLmP21Yu.hwTCnr1/3C5ALTQu681uJd6FeUN4D2', 1, 1, 1),
    (5, 'JeanLecussan@ecotransporte.com', '$2a$08$KFNjEUgJ/AhaaonLmP21Yu.hwTCnr1/3C5ALTQu681uJd6FeUN4D2', 2, 1, 1)
ON CONFLICT (id) DO NOTHING;

-- Información de usuarios
INSERT INTO user_information (id, user_id, "userName", "userAbbreviation", "contactName", "contactEmail", "contactPhone") VALUES
    (1, 1, 'Jose Alban',             'JA',   'Jose Alban',             'jalban@acyde.com',               '+51987718866'),
    (2, 2, 'Jose Alban Arnaiz',      'JLAA', 'Jose Alban Arnaiz',      'jose_alban@outlook.com',         '+51987718866'),
    (3, 3, 'Edson Tomas',            'ET',   'Edson Tomas Ayala',      'etomasayala@gmail.com',          '+51555555555'),
    (4, 4, 'Gerencia Ecotransporte', 'GE',   'Gerencia',               'Gerencia@ecotransporte.com',     ''),
    (5, 5, 'Jean Lecussan',          'JL',   'Jean Lecussan',          'JeanLecussan@ecotransporte.com', '')
ON CONFLICT (id) DO NOTHING;

-- Resetear secuencias
SELECT setval('roles_id_seq',            (SELECT MAX(id) FROM roles));
SELECT setval('user_id_seq',             (SELECT MAX(id) FROM "user"));
SELECT setval('user_information_id_seq', (SELECT MAX(id) FROM user_information));

-- =============================================
-- DATOS: Empresas de Transporte
-- =============================================
INSERT INTO empresa_transporte (id, nombre, estado) VALUES
    (1, 'ECOTRANSPORTE', 'activo'),
    (2, 'EMNA',          'activo'),
    (3, 'FLS',           'activo'),
    (4, 'TREO',          'activo')
ON CONFLICT (id) DO NOTHING;

SELECT setval('empresa_transporte_id_seq', (SELECT MAX(id) FROM empresa_transporte));

-- =============================================
-- DATOS: Unidades (Placas)
-- =============================================
INSERT INTO unidad (id, placa, empresa_id, estado) VALUES
    -- ECOTRANSPORTE
    (1,  'CBT714', 1, 'activo'),
    (2,  'BXY704', 1, 'activo'),
    (3,  'BXX911', 1, 'activo'),
    (4,  'BXX888', 1, 'activo'),
    (5,  'BXX714', 1, 'activo'),
    (6,  'CBS886', 1, 'activo'),
    -- EMNA
    (7,  'ARE770', 2, 'activo'),
    (8,  'T5Z850', 2, 'activo'),
    (9,  'F0I738', 2, 'activo'),
    (10, 'AWW898', 2, 'activo'),
    (11, 'BYF728', 2, 'activo'),
    -- FLS
    (12, 'CBS840', 3, 'activo'),
    (13, 'CCQ816', 3, 'activo'),
    -- TREO
    (14, 'CCX752', 4, 'activo'),
    (15, 'TOC892', 4, 'activo'),
    (16, 'BEA768', 4, 'activo'),
    (17, 'BMQ991', 4, 'activo'),
    (18, 'C5T736', 4, 'activo'),
    (19, 'C4R796', 4, 'activo')
ON CONFLICT (id) DO NOTHING;

SELECT setval('unidad_id_seq', (SELECT MAX(id) FROM unidad));

-- =============================================
-- NOTA: La tabla documents se crea vacía.
-- Los registros se cargarán desde la aplicación.
-- =============================================
SELECT setval('documents_id_seq', 1);

-- =============================================
-- TABLA: client_tariff (Tarifas por Cliente)
-- =============================================
-- La tabla ya existe, no se crea de nuevo.
-- CREATE TABLE IF NOT EXISTS client_tariff (
--     id                   SERIAL PRIMARY KEY,
--     cliente              VARCHAR(255) NOT NULL,
--     partida              VARCHAR(255) NOT NULL,
--     llegada              VARCHAR(255) NOT NULL,
--     material             VARCHAR(255) NOT NULL,
--     "precioVentaSinIgv"  DECIMAL(15, 2) DEFAULT 0,
--     "precioVentaConIgv"  DECIMAL(15, 2) DEFAULT 0,
--     moneda               VARCHAR(50) NOT NULL,
--     "precioCostoSinIgv"  DECIMAL(15, 2) DEFAULT 0,
--     "precioCostoConIgv"  DECIMAL(15, 2) DEFAULT 0,
--     divisa               VARCHAR(50) NOT NULL
-- );

-- Tarifas de clientes
INSERT INTO client_tariff (cliente, partida, llegada, material, "precioVentaSinIgv", "precioVentaConIgv", moneda, "precioCostoSinIgv", "precioCostoConIgv", divisa) VALUES
    ('PALTARUMI S.A.C.',                  'LA LIBERTAD-TRUJILLO-HUANCHACO',  'LIMA-BARRANCA-PARAMONGA',          'MINERAL AURIFERO',             21.00,        24.78,        'USD',   19.00,       22.42,        'USD'),
    ('ECO GOLD S.A.C.',                   'LIMA-BARRANCA-PARAMONGA',         'CALLAO-CALLAO-VENTANILLA',         'CONCENTRADO DE AU',            23.00,        27.14,        'USD',   20.50,       24.19,        'USD'),
    ('ECO GOLD S.A.C.',                   'LA LIBERTAD-TRUJILLO-HUANCHACO',  'CALLAO-CALLAO-VENTANILLA',         'CONCENTRADO DE PLATA A GRANEL',44.00,        51.92,        'USD',   39.50,       46.61,        'USD'),
    ('ECO GOLD S.A.C.',                   'LA LIBERTAD-TRUJILLO-HUANCHACO',  'LIMA-BARRANCA-PARAMONGA',          'MINERAL AURIFERO',             21.00,        24.78,        'USD',   19.00,       22.42,        'USD'),
    ('ECO GOLD S.A.C.',                   'ANCASH-HUARMEY-HUARMEY',          'LIMA-BARRANCA-PARAMONGA',          'MINERAL POLIMETALICO',         3.00,         3.54,         'USD',   2.00,        2.36,         'USD'),
    ('POLIMETALICOS DEL NORTE S.A.C.',    'LA LIBERTAD-GRAN CHIMU-LUCMA',    'LA LIBERTAD-TRUJILLO-HUANCHACO',   'CONCENTRADO DE PLATA A GRANEL',31.00,        36.58,        'USD',   28.00,       33.04,        'USD'),
    ('MONARCA GOLD S.A.C.',               E'ANCASH-SANTA-NEPE\u00D1A',       'CALLAO-CALLAO-CALLAO (IMPALA)',    'CONCENTRADO DE ZN',            33.00,        38.94,        'USD',   26.50,       31.27,        'USD'),
    ('MONARCA GOLD S.A.C.',               'LA LIBERTAD-TRUJILLO-HUANCHACO',  E'ANCASH-SANTA-NEPE\u00D1A',        'MINERAL POLIMETALICO',         50.85,        60.00,        'PEN',   35.00,       41.30,        'PEN'),
    ('ANDES MINERAL S.A.C.',              'MATUCANA',                        'ALTAGRACIA',                       'MINERAL EN BRUTO',             66.95,        79.00,        'PEN',   50.00,       59.00,        'PEN'),
    ('PARKANO RESOURCES S.A.C.',          'CHIMBOTE',                        'CALLAO-CALLAO-CALLAO (IMPALA)',    'CONCENTRADO DE PLOMO',         110.00,       129.80,       'PEN',   90.00,       106.20,       'PEN'),
    ('GRUPO MINERA KATA DEL SUR S.A.C.',  'MATUCANA',                        'ALTAGRACIA',                       'MINERAL EN BRUTO',             66.95,        79.00,        'PEN',   50.00,       59.00,        'PEN'),
    ('NUKLEO PERU S.A.C.',                'LIMA-LIMA-PUENTE PIEDRA',         'CALLAO-CALLAO-CALLAO',             '',                             99.00,        116.82,       'PEN',   98.00,       115.64,       'PEN')
ON CONFLICT DO NOTHING;

-- Resetear secuencia de client_tariff
SELECT setval('client_tariff_id_seq', (SELECT COALESCE(MAX(id), 0) FROM client_tariff));