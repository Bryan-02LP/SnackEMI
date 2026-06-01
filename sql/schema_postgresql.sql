-- ════════════════════════════════════════════════════════════
-- SNACK EMI — Esquema PostgreSQL (para Supabase)
-- Ejecutar en: Supabase → SQL Editor
-- ════════════════════════════════════════════════════════════

-- ── ROLES ──
CREATE TABLE IF NOT EXISTS roles (
  rol_id      SERIAL PRIMARY KEY,
  nombre_rol  VARCHAR(30)  NOT NULL UNIQUE,
  descripcion VARCHAR(150)
);

INSERT INTO roles (nombre_rol, descripcion) VALUES
  ('estudiante', 'Estudiante EMI'),
  ('encargado',  'Encargado del snack'),
  ('admin',      'Administrador del sistema')
ON CONFLICT DO NOTHING;

-- ── USUARIOS ──
CREATE TABLE IF NOT EXISTS usuarios (
  usuario_id      SERIAL PRIMARY KEY,
  nombre_completo VARCHAR(100) NOT NULL,
  ci              VARCHAR(20)  NOT NULL UNIQUE,
  codigo_saga     VARCHAR(15)  NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  rol_id          INT          NOT NULL DEFAULT 1 REFERENCES roles(rol_id),
  codigo_admin    VARCHAR(50),
  activo          BOOLEAN      NOT NULL DEFAULT true,
  fecha_registro  TIMESTAMPTZ  DEFAULT NOW(),
  ultimo_acceso   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_usuarios_saga ON usuarios(codigo_saga);
CREATE INDEX IF NOT EXISTS ix_usuarios_ci   ON usuarios(ci);

-- ── CATEGORÍAS ──
CREATE TABLE IF NOT EXISTS categorias (
  categoria_id SERIAL PRIMARY KEY,
  nombre       VARCHAR(50) NOT NULL UNIQUE,
  icono        VARCHAR(10),
  orden        INT DEFAULT 0,
  activo       BOOLEAN DEFAULT true
);

INSERT INTO categorias (nombre, icono, orden) VALUES
  ('Comidas', '🍔', 1),
  ('Bebidas', '🥤', 2),
  ('Snacks',  '🍟', 3),
  ('Dulces',  '🍬', 4),
  ('Jugos',   '🍊', 5),
  ('Otros',   '🛒', 6)
ON CONFLICT DO NOTHING;

-- ── PRODUCTOS ──
CREATE TABLE IF NOT EXISTS productos (
  producto_id        SERIAL PRIMARY KEY,
  nombre             VARCHAR(100)   NOT NULL,
  descripcion        VARCHAR(300),
  precio             DECIMAL(10,2)  NOT NULL CHECK (precio >= 0),
  stock_actual       INT            NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
  stock_minimo       INT            NOT NULL DEFAULT 5,
  categoria_id       INT            NOT NULL REFERENCES categorias(categoria_id),
  imagen_ruta        VARCHAR(255)   DEFAULT 'img/prod/default.jpg',
  estado             VARCHAR(15)    NOT NULL DEFAULT 'activo'
                                    CHECK (estado IN ('activo','agotado','inactivo')),
  destacado          BOOLEAN        DEFAULT false,
  fecha_creacion     TIMESTAMPTZ    DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_productos_categoria ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS ix_productos_estado    ON productos(estado);

-- Productos de ejemplo
INSERT INTO productos (nombre, descripcion, precio, stock_actual, stock_minimo, categoria_id, imagen_ruta, estado, destacado) VALUES
  ('Hamburguesa Clásica',  'Hamburguesa de carne con lechuga, tomate y queso.',    15.00, 20, 5,  1, 'img/prod/hamburguesa.jpg', 'activo',  true),
  ('Salteñas (2 unid.)',   'Salteñas jugosas de pollo o carne al horno.',           8.00, 30, 10, 1, 'img/prod/saltenas.jpg',    'activo',  true),
  ('Empanadas (3 unid.)',  'Empanadas crujientes de queso y carne.',                9.00, 25, 8,  1, 'img/prod/empanadas.jpg',   'activo',  false),
  ('Sándwich Mixto',       'Jamón, queso y tomate en pan tostado.',                12.00,  3, 5,  1, 'img/prod/sandwich.jpg',    'activo',  false),
  ('Papas Fritas',         'Papas fritas crujientes con sal.',                      7.00, 40, 10, 3, 'img/prod/papas.jpg',       'activo',  true),
  ('Galletas Oreo',        'Paquete galletas Oreo original.',                       4.50, 50, 15, 3, 'img/prod/oreo.jpg',        'activo',  false),
  ('Chocolate Sublime',    'Chocolate con maní.',                                   5.00, 45, 10, 4, 'img/prod/chocolate.jpg',   'activo',  false),
  ('Jugo de Naranja',      'Jugo natural de naranja.',                              6.00, 15, 5,  5, 'img/prod/jugo-naranja.jpg','activo',  true),
  ('Agua Mineral 500ml',   'Agua mineral sin gas 500ml.',                           3.50, 60, 20, 2, 'img/prod/agua.jpg',        'activo',  false),
  ('Coca-Cola 350ml',      'Refresco Coca-Cola lata 350ml.',                        5.50, 35, 10, 2, 'img/prod/coca.jpg',        'activo',  false),
  ('Yogur con Frutas',     'Yogur cremoso con trozos de fruta.',                    6.50, 12, 5,  6, 'img/prod/yogur.jpg',       'activo',  false),
  ('Brownie de Chocolate', 'Brownie casero de chocolate oscuro.',                   7.00,  0, 3,  4, 'img/prod/brownie.jpg',     'agotado', false)
ON CONFLICT DO NOTHING;

-- ── PEDIDOS ──
CREATE SEQUENCE IF NOT EXISTS seq_pedidos START 1;

CREATE TABLE IF NOT EXISTS pedidos (
  pedido_id    SERIAL PRIMARY KEY,
  codigo       VARCHAR(20)   NOT NULL UNIQUE,
  usuario_id   INT           NOT NULL REFERENCES usuarios(usuario_id),
  fecha_pedido TIMESTAMPTZ   DEFAULT NOW(),
  hora_recogida VARCHAR(30),
  total        DECIMAL(10,2) NOT NULL,
  estado       VARCHAR(15)   NOT NULL DEFAULT 'pendiente'
                             CHECK (estado IN ('pendiente','preparando','listo','entregado','cancelado')),
  metodo_pago  VARCHAR(20)   DEFAULT 'QR',
  observaciones VARCHAR(300)
);

CREATE INDEX IF NOT EXISTS ix_pedidos_usuario ON pedidos(usuario_id);
CREATE INDEX IF NOT EXISTS ix_pedidos_estado  ON pedidos(estado);
CREATE INDEX IF NOT EXISTS ix_pedidos_fecha   ON pedidos(fecha_pedido);

-- ── DETALLE PEDIDOS ──
CREATE TABLE IF NOT EXISTS detalle_pedidos (
  detalle_id  SERIAL PRIMARY KEY,
  pedido_id   INT           NOT NULL REFERENCES pedidos(pedido_id),
  producto_id INT           NOT NULL REFERENCES productos(producto_id),
  cantidad    INT           NOT NULL CHECK (cantidad > 0),
  precio_unit DECIMAL(10,2) NOT NULL,
  subtotal    DECIMAL(10,2) GENERATED ALWAYS AS (cantidad * precio_unit) STORED
);

CREATE INDEX IF NOT EXISTS ix_detalle_pedido   ON detalle_pedidos(pedido_id);
CREATE INDEX IF NOT EXISTS ix_detalle_producto ON detalle_pedidos(producto_id);

-- ── MOVIMIENTOS DE STOCK ──
CREATE TABLE IF NOT EXISTS movimientos_stock (
  movimiento_id   SERIAL PRIMARY KEY,
  producto_id     INT         NOT NULL REFERENCES productos(producto_id),
  tipo_movimiento VARCHAR(15) NOT NULL CHECK (tipo_movimiento IN ('entrada','salida','ajuste')),
  cantidad        INT         NOT NULL,
  stock_anterior  INT         NOT NULL,
  stock_nuevo     INT         NOT NULL,
  motivo          VARCHAR(150),
  usuario_id      INT         REFERENCES usuarios(usuario_id),
  fecha_movimiento TIMESTAMPTZ DEFAULT NOW()
);

-- ── CONFIG ──
CREATE TABLE IF NOT EXISTS configuracion_sistema (
  config_id   SERIAL PRIMARY KEY,
  clave       VARCHAR(60)  NOT NULL UNIQUE,
  valor       VARCHAR(255) NOT NULL,
  descripcion VARCHAR(200)
);

INSERT INTO configuracion_sistema (clave, valor, descripcion) VALUES
  ('nombre_snack',   'Snack EMI',      'Nombre del snack'),
  ('horario_apertura','07:00',         'Hora apertura'),
  ('horario_cierre', '18:00',          'Hora cierre')
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════
-- LISTO ✅
-- ════════════════════════════════════════
