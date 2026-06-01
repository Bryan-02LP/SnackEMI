# 🍔 SnackEMI — Sistema Web del Snack Universitario
### Escuela Militar de Ingeniería (EMI) — Node.js + PostgreSQL + Cloudinary

---

## 📁 ESTRUCTURA
```
snackemi/
├── server.js              ← Servidor principal Express
├── db.js                  ← Conexión PostgreSQL (Supabase)
├── cloudinary.js          ← Config Cloudinary (imágenes)
├── package.json           ← npm install lee esto
├── .env.example           ← Plantilla de variables (copia como .env)
├── .gitignore
├── middleware/
│   └── auth.js            ← Verificación JWT
├── routes/
│   ├── auth.js            ← Login / Registro / Admin
│   ├── productos.js       ← CRUD + subida de imágenes
│   ├── pedidos.js         ← Crear y gestionar pedidos
│   └── stock.js           ← Inventario + stats
├── public/                ← Frontend (HTML/CSS/JS)
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
└── sql/
    └── schema_postgresql.sql  ← Ejecutar en Supabase
```

---

## 🚀 INSTALACIÓN LOCAL

### 1. Instalar Node.js
👉 https://nodejs.org → versión LTS

### 2. Crear BD en Supabase
👉 https://supabase.com → New project → SQL Editor → pegar schema_postgresql.sql → Run

### 3. Crear cuenta en Cloudinary
👉 https://cloudinary.com → Free plan (25GB gratis)
Ir a Dashboard y copiar: Cloud Name, API Key, API Secret

### 4. Crear .env
Copia .env.example como .env y llena:
```
DATABASE_URL=postgresql://postgres:TU_PASS@db.XXXX.supabase.co:5432/postgres
PORT=3000
NODE_ENV=development
JWT_SECRET=cualquier_texto_largo_secreto
ADMIN_CODE=EMI@admin2025
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=123456789
CLOUDINARY_API_SECRET=abcdefghijk
```

### 5. Instalar y correr
```bash
npm install
npm run dev
```

Abrir: http://localhost:3000

---

## 🔐 ACCESO

| Rol | Cómo entrar |
|---|---|
| Estudiante | Registro con Nombre + CI + Código SAGA |
| Admin | Botón "Acceso Administrador" → usuario: `admin` → código: `EMI@admin2025` |

---

## 🖼 SUBIR IMÁGENES (desde el panel Admin)

Una vez dentro del panel admin:
1. Ir a **Configuración ⚙️**
2. Subir **logo_emi.png** → se actualiza en toda la app
3. Subir **QR de pago** → aparece en el checkout de estudiantes
4. Ver la galería de productos → clic en cualquiera para editar su foto

También puedes subir/editar fotos desde **Productos → ✏️ Editar**

---

## ☁️ DEPLOY ONLINE (Render + Vercel)

### Backend (Render)
1. render.com → New Web Service → conectar GitHub
2. Build: `npm install` / Start: `npm start`
3. Agregar todas las variables del .env en Environment

### Frontend
El frontend ya está integrado en el mismo servidor Express (carpeta public/).
No necesitas Vercel por separado — Render sirve todo.

### Base de datos
Supabase ya está en la nube desde el paso 2. No hay nada extra.

---

## 👥 TRABAJO EN EQUIPO (GitHub)

```bash
# Primera vez (tú)
git init
git add .
git commit -m "feat: SnackEMI inicial"
git remote add origin https://github.com/TU_USUARIO/SnackEMI.git
git push -u origin main

# Cada compañero
git clone https://github.com/TU_USUARIO/SnackEMI.git
cd SnackEMI
npm install
# Crear su propio .env con los datos compartidos por WhatsApp

# Flujo diario
git pull origin main
git checkout -b feature/mi-cambio
# ... trabajar ...
git add .
git commit -m "feat: descripción"
git push origin feature/mi-cambio
# Hacer Pull Request en GitHub
```

⚠️ El archivo .env NUNCA va a GitHub (ya está en .gitignore)
Comparte DATABASE_URL, CLOUDINARY_* y ADMIN_CODE por WhatsApp con tu equipo.

---
*SnackEMI — EMI La Paz*
