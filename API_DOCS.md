# API Backend - Documentación Completa

**Base URL:** `http://localhost:3000`

---

# AUTENTICACIÓN

## 1. Login

```
POST /auth/login
Content-Type: application/json
```

**Body:**
```json
{
  "email": "jalban@acyde.com",
  "password": "abc123"
}
```

**Response 200:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errores:**
- 401: Credenciales inválidas
- 400: Campos requeridos faltantes

---

## 2. Signup (Registro)

```
POST /auth/signup
Content-Type: application/json
```

**Body:**
```json
{
  "email": "nuevo@usuario.com",
  "password": "password123",
  "userName": "Nombre Completo"
}
```

**Response 200:**
```json
{
  "success": true
}
```

**Errores:**
- 400: Email ya existe

---

## 3. Logout

```
POST /auth/logout
Authorization: Bearer <accessToken>
```

---

## 4. Solicitar Reset Password

```
POST /auth/requestResetPassword
Content-Type: application/json
```

**Body:**
```json
{
  "email": "usuario@email.com"
}
```

---

## 5. Reset Password

```
POST /auth/resetPassword
Content-Type: application/json
```

**Body:**
```json
{
  "token": "token-recibido-por-email",
  "password": "nuevaPassword123"
}
```

---

# DOCUMENTOS (Guías de Remisión)

## 1. Subir y Procesar PDF

```
POST /documents/upload
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

**Body (FormData):**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| file | File | Sí | Archivo PDF únicamente |

**Response 200:**
```json
{
  "success": true,
  "message": "Document processed successfully",
  "document": {
    "id": 1,
    "uploaded_by": 1,
    "pdf_file_path": "/uploads/1739656800000_guia.pdf",
    "pdf_original_name": "guia.pdf",
    "mes": "febrero",
    "semana": "7",
    "fecha": "2026-02-15",
    "grt": "T001-000123",
    "transportista": "TRANSPORTES ABC S.A.C.",
    "unidad": "ABC-123",
    "empresa": "MINERA XYZ S.A.",
    "tn_enviado": 43.09,
    "deposito": "DEPOSITO CENTRAL",
    "tn_recibida": 42.50,
    "tn_recibida_data_cruda": null,
    "ticket": null,
    "grr": "EG01-001234",
    "cliente": "CLIENTE FINAL S.A.C.",
    "partida": "LIMA - CALLAO - CALLAO",
    "llegada": "AREQUIPA - AV. INDUSTRIAL 123",
    "transportado": "CONCENTRADO DE ZN",
    "precio_unitario": null,
    "divisa": null,
    "precio_final": null,
    "pcosto": null,
    "divisa_cost": null,
    "costo_final": null,
    "margen_operativo": null
  }
}
```

**Errores:**
- 400: No file uploaded / Only PDF files are allowed
- 401: No autorizado
- 500: Error procesando documento

---

## 2. Listar Todos los Documentos

```
GET /documents
Authorization: Bearer <accessToken>
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "fecha": "2026-02-15",
      "grt": "T001-000123",
      "transportista": "TRANSPORTES ABC",
      ...
    }
  ],
  "count": 1
}
```

---

## 3. Obtener Documento por ID

```
GET /documents/:id
Authorization: Bearer <accessToken>
```

**Ejemplo:** `GET /documents/1`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "fecha": "2026-02-15",
    ...
  }
}
```

**Errores:**
- 404: Document not found

---

## 4. Obtener Documentos del Usuario Actual

```
GET /documents/user/documents
Authorization: Bearer <accessToken>
```

**Response 200:**
```json
{
  "success": true,
  "data": [...],
  "count": 5
}
```

---

## 5. Actualizar Documento

```
PUT /documents/:id
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Body (campos opcionales):**
```json
{
  "tn_recibida": 42.00,
  "ticket": "TICKET-001",
  "precio_unitario": 150.00,
  "divisa": "USD",
  "precio_final": 6300.00
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Document updated successfully",
  "data": { ... }
}
```

---

## 6. Eliminar Documento

```
DELETE /documents/:id
Authorization: Bearer <accessToken>
```

**Response 200:**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

---

# USUARIOS

## 1. Listar Usuarios

```
GET /users
Authorization: Bearer <accessToken>
```

---

## 2. Obtener Usuario por ID

```
GET /users/:id
Authorization: Bearer <accessToken>
```

---

## 3. Crear Usuario

```
POST /users
Authorization: Bearer <accessToken>
Content-Type: application/json
```

---

## 4. Actualizar Usuario

```
PUT /users/:id
Authorization: Bearer <accessToken>
Content-Type: application/json
```

---

## 5. Eliminar Usuario

```
DELETE /users/:id
Authorization: Bearer <accessToken>
```

---

## 6. Listar Usuarios por Rol

```
GET /users/list-by-role/:role
Authorization: Bearer <accessToken>
```

---

# ROLES

## 1. Listar Roles

```
GET /roles
Authorization: Bearer <accessToken>
```

---

## 2. Crear Rol

```
POST /roles
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Nuevo Rol"
}
```

---

# USER INFORMATION

## 1. Listar

```
GET /user-information
Authorization: Bearer <accessToken>
```

## 2. Obtener por ID

```
GET /user-information/:id
Authorization: Bearer <accessToken>
```

## 3. Crear

```
POST /user-information
Authorization: Bearer <accessToken>
Content-Type: application/json
```

## 4. Actualizar

```
PUT /user-information/:id
Authorization: Bearer <accessToken>
Content-Type: application/json
```

---

# USER ADDRESS

## 1. Listar

```
GET /user-address
Authorization: Bearer <accessToken>
```

## 2. Obtener por Usuario

```
GET /user-address/user/:id
Authorization: Bearer <accessToken>
```

## 3. Crear

```
POST /user-address
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Body:**
```json
{
  "user": 1,
  "label": "Oficina",
  "address": "Av. Principal 123",
  "city": "Lima",
  "state": "Lima",
  "zipCode": "15001",
  "country": "Perú"
}
```

---

# USUARIOS DE PRUEBA

| Email | Password | Rol |
|-------|----------|-----|
| jalban@acyde.com | abc123 | Administrator |
| jose_alban@outlook.com | abc123 | User |
| etomasayala@gmail.com | abc123 | Administrator |

---

# CAMPOS DEL DOCUMENTO (Guía de Remisión)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | number | ID único |
| uploaded_by | number | ID del usuario que subió |
| pdf_file_path | string | Ruta del archivo |
| pdf_original_name | string | Nombre original del PDF |
| mes | string | Mes (enero, febrero, etc) |
| semana | string | Número de semana del año |
| fecha | date | Fecha de emisión (YYYY-MM-DD) |
| grt | string | Código GRT (XXX#-######) |
| transportista | string | Nombre empresa transportista |
| unidad | string | Placa del vehículo |
| empresa | string | Empresa remitente |
| tn_enviado | decimal | Toneladas enviadas |
| deposito | string | Depósito de origen |
| tn_recibida | decimal | Toneladas recibidas |
| tn_recibida_data_cruda | decimal | Segundo valor de toneladas si existe |
| ticket | string | Número de ticket/boleta |
| grr | string | Código GRR relacionado |
| cliente | string | Empresa destinataria |
| partida | string | Punto de partida |
| llegada | string | Punto de llegada |
| transportado | string | Producto transportado |
| precio_unitario | decimal | Precio por tonelada |
| divisa | string | Moneda (USD, PEN) |
| precio_final | decimal | Precio total |
| pcosto | decimal | Costo unitario |
| divisa_cost | string | Moneda del costo |
| costo_final | decimal | Costo total |
| margen_operativo | decimal | Margen de ganancia |

---

# EJEMPLO COMPLETO EN REACT

```javascript
const API_URL = 'http://localhost:3000';

// ========== SERVICIO DE API ==========

// Login
export const login = async (email, password) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return response.json();
};

// Signup
export const signup = async (email, password, userName) => {
  const response = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, userName })
  });
  return response.json();
};

// Subir PDF
export const uploadDocument = async (file, accessToken) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/documents/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: formData
  });
  return response.json();
};

// Obtener todos los documentos
export const getDocuments = async (accessToken) => {
  const response = await fetch(`${API_URL}/documents`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  return response.json();
};

// Obtener documento por ID
export const getDocumentById = async (id, accessToken) => {
  const response = await fetch(`${API_URL}/documents/${id}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  return response.json();
};

// Actualizar documento
export const updateDocument = async (id, data, accessToken) => {
  const response = await fetch(`${API_URL}/documents/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
};

// Eliminar documento
export const deleteDocument = async (id, accessToken) => {
  const response = await fetch(`${API_URL}/documents/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  return response.json();
};

// ========== EJEMPLO DE USO ==========

// 1. Login
const { accessToken } = await login('jalban@acyde.com', 'abc123');
console.log('Token:', accessToken);

// 2. Subir PDF (desde un input file)
const fileInput = document.getElementById('pdfInput');
const file = fileInput.files[0];
const result = await uploadDocument(file, accessToken);
console.log('Documento procesado:', result.document);

// 3. Listar documentos
const docs = await getDocuments(accessToken);
console.log('Documentos:', docs.data);

// 4. Actualizar campos financieros
await updateDocument(1, {
  precio_unitario: 150.00,
  divisa: 'USD',
  precio_final: 6300.00
}, accessToken);
```

---

# COMPONENTE REACT DE EJEMPLO

```jsx
import React, { useState } from 'react';

function DocumentUploader() {
  const [token, setToken] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const res = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'jalban@acyde.com',
        password: 'abc123'
      })
    });
    const data = await res.json();
    setToken(data.accessToken);
    alert('Login exitoso!');
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !token) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('http://localhost:3000/documents/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  return (
    <div>
      <button onClick={handleLogin}>Login</button>
      <input type="file" accept=".pdf" onChange={handleUpload} />
      {loading && <p>Procesando PDF con IA...</p>}
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}

export default DocumentUploader;
```
