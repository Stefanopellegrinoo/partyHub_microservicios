# Reporte de Preparación para Producción - PartyHub Microservicios

Este documento detalla los hallazgos y áreas de mejora identificadas tras un análisis exhaustivo de la arquitectura, configuración y código base del proyecto `partyHub_microservicios`. El objetivo es garantizar la seguridad, resiliencia y escalabilidad antes de su despliegue en un entorno de producción.

## 1. Infraestructura y Configuración (Docker)

### 🔴 Crítico: Credenciales en texto plano (`docker-compose.yml`)
- **Problema:** Las cadenas de conexión a la base de datos están hardcodeadas en texto plano (`postgresql://stefano:2002Stefano@postgres_db:5432/...`).
- **Solución:** Utilizar variables de entorno (`.env`) en producción y no incluir las contraseñas en el archivo `docker-compose.yml`.

### 🔴 Crítico: Comandos de Desarrollo en Dockerfiles
- **Problema:** Los `Dockerfile` (ej. `auth-service/Dockerfile`) terminan con el comando `CMD ["npm", "run", "dev"]`. Esto ejecuta herramientas como `nodemon` que no están optimizadas para producción, consumen más memoria y no manejan correctamente las señales del sistema (SIGTERM/SIGINT).
- **Solución:** Cambiar a `CMD ["npm", "start"]` o `CMD ["node", "src/index.js"]`. Utilizar construcciones multi-etapa (multi-stage builds) para no incluir las `devDependencies` en la imagen final.

### 🟡 Advertencia: Imágenes pesadas y usuario Root
- **Problema:** Se utiliza `FROM node:18`. Esta imagen es muy pesada y ejecuta los procesos como usuario `root` por defecto.
- **Solución:** Usar `FROM node:18-alpine` y configurar el usuario sin privilegios (`USER node`).

### 🟡 Advertencia: Redes externas no controladas
- **Problema:** Los servicios dependen de la red `postgres-stack_default`. En producción, si esta red no se inicializa antes o falla, los contenedores fallarán al arrancar.
- **Solución:** Considerar usar un script de espera (`wait-for-it`) o declarar correctamente las dependencias en la orquestación de producción (ej. Kubernetes o un único Compose más robusto).

---

## 2. API Gateway (`api-gateway/src/index.js`)

### 🔴 Crítico: Falta de Rate Limiting (Limitador de Tasa)
- **Problema:** No hay middleware para limitar las peticiones por IP, lo que hace al proyecto susceptible a ataques DDoS y fuerza bruta.
- **Solución:** Implementar `express-rate-limit` en el API Gateway.

### 🔴 Crítico: Manejo de errores de Proxy
- **Problema:** Si un microservicio (ej. `core-service`) está caído, `http-proxy-middleware` devolverá errores genéricos y podría arrojar excepciones no capturadas (unhandled promise rejections) que tiren el Gateway.
- **Solución:** Agregar el manejador `onError` en cada configuración de `createProxyMiddleware` para responder con un JSON limpio (ej. `503 Service Unavailable`).

### 🟡 Advertencia: CORS demasiado permisivo
- **Problema:** Existe una regla `app.options('*', cors())` que podría flexibilizar de más el pre-flight.
- **Solución:** Ajustar el CORS estrictamente a los dominios de producción (actualmente solo el de Vercel).

---

## 3. Seguridad y Autenticación (`auth-service`)

### 🔴 Crítico: Fuga de detalles de errores
- **Problema:** En `auth.controller.js`, los bloques `catch` retornan `res.status(400).json({ error: err.message });`. En producción, esto puede filtrar trazas de la base de datos o lógica interna.
- **Solución:** Mapear los errores y retornar mensajes genéricos (ej. "Error al procesar la solicitud") si el error no es operacional/controlado.

### 🔴 Crítico: Logout ineficaz
- **Problema:** La función `logout` en `auth.controller.js` solo responde `{ message: "Logged out successfully" }` pero no invalida el `refreshToken`.
- **Solución:** Implementar una lista negra (blacklist) en Redis o eliminar el token de la base de datos para asegurar que los tokens revocados no puedan usarse para obtener nuevos access tokens.

### 🟡 Advertencia: Tiempos de expiración "hardcodeados"
- **Problema:** El tiempo de expiración (15 minutos) está escrito directamente en el controlador de Auth.
- **Solución:** Extraer estos valores mágicos a variables de entorno (`JWT_ACCESS_EXPIRATION`, `JWT_REFRESH_EXPIRATION`).

---

## 4. WebSockets y Core Service (`core-service/src/index.js`)

### 🔴 Crítico: CORS de Socket.io permisivo
- **Problema:** El servidor de Socket.io en `core-service` tiene `cors: { origin: "*" }`, permitiendo conexiones desde cualquier dominio, lo cual es muy inseguro en producción.
- **Solución:** Restringir el `origin` a los dominios del cliente frontend autorizados.

### 🟡 Advertencia: Sin manejador global de excepciones
- **Problema:** Las promesas rechazadas sin un bloque `.catch()` (Unhandled Rejections) o excepciones no capturadas tirarán el proceso de Node.js.
- **Solución:** Implementar un middleware de manejo de errores global al final de la definición de rutas (`app.use((err, req, res, next) => {...})`) y capturar los eventos de proceso `uncaughtException` y `unhandledRejection`.

---

## 5. Colas y Tareas en Segundo Plano (`auxiliary-service`)

### 🟡 Advertencia: Monitoreo y Reintentos de Redis/Bull
- **Problema:** El uso de colas (ej. envío de mails o generación de QRs) puede fallar por problemas de red o errores de terceros.
- **Solución:** Asegurar que las colas (ej. `mailQueue`) tengan configurados reintentos (ej. `attempts: 3`, con `backoff`), y persistir los eventos fallidos para revisión.

## Resumen de Pasos Inmediatos Sugeridos:
1. Reemplazar secretos en `.yml` por variables del sistema.
2. Modificar los `Dockerfiles` a `npm start` con imágenes Alpine.
3. Restringir todos los CORS (HTTP y Sockets) solo a dominios confiables.
4. Ocultar los detalles de los errores (quitar `err.message` en los catch).
5. Agregar `express-rate-limit` al Gateway.