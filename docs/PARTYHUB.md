# PartyHub - Arquitectura de Microservicios para Eventos

PartyHub es una plataforma distribuida basada en microservicios diseñada para la organización de eventos, venta de entradas con códigos QR y coordinación en tiempo real.

---

## 📋 Resumen del Proyecto

Una aplicación empresarial con arquitectura desacoplada que separa sus operaciones críticas en servicios autónomos e independientes. El sistema centraliza el tráfico a través de un API Gateway y delega operaciones al Servicio de Autenticación, al Servicio Core (eventos, entradas y comunicación en tiempo real vía WebSockets) y al Servicio Auxiliar (cola de fondo para procesamiento pesado de correos y generación de códigos QR de tickets).

---

## 🛠️ Stack Tecnológico

*   **Arquitectura**: Microservicios distribuidos, API Gateway unificado, APIs RESTful.
*   **API Gateway**: Node.js, Express.js, `http-proxy-middleware` (ruteo y proxy reverso de peticiones), `express-rate-limit` (prevención de ataques DoS).
*   **Servicio de Autenticación**: Node.js, Express.js, JSON Web Tokens (Tokens duales de Acceso y Refresco), Bcrypt (cifrado de contraseñas), PostgreSQL.
*   **Servicio Core (Tiempo Real)**: Node.js, Express.js, **Socket.io** (comunicación bidireccional mediante WebSockets), PostgreSQL.
*   **Servicio Auxiliar (Workers)**: Node.js, **BullMQ** (procesamiento asíncrono y tareas programadas), **Redis** (base de datos clave-valor en memoria).
*   **Base de Datos**: PostgreSQL para almacenamiento relacional y persistencia de transacciones e información de usuarios.
*   **Contenedorización & DevOps**: Docker, Docker Compose, Dockerfiles optimizados de etapas múltiples (Multi-stage) basados en Node Alpine, redes aisladas internas de Docker.
*   **Testing**: Vitest para tests unitarios y de integración distribuida.

---

## 📝 Viñetas para el CV (Listo para copiar y adaptar)

A continuación se presentan las viñetas listas para la sección de Experiencia o Proyectos de tu Currículum, destacando los aportes técnicos y metodologías ágiles de microservicios:

*   **Diseño de Arquitectura de Microservicios**: Diseñé y desarrollé de punta a punta un ecosistema de microservicios distribuido y desacoplado utilizando **Node.js**, **Express**, **PostgreSQL** y **Redis**, logrando una alta tolerancia a fallos y escalabilidad independiente.
*   **API Gateway & Orquestación de Tráfico**: Implementé un **API Gateway** centralizado utilizando `http-proxy-middleware`, configurando políticas robustas de CORS, rate-limiting por IP para prevenir ataques de fuerza bruta y manejo resiliente de errores de comunicación de red.
*   **Sincronización en Tiempo Real mediante WebSockets**: Desarrollé la lógica de interacción e invitaciones en tiempo real integrando **Socket.io** en el microservicio Core, securizando los canales de comunicación y garantizando actualizaciones síncronas entre múltiples clientes.
*   **Procesamiento Asíncrono de Tareas Críticas**: Construí un microservicio auxiliar dedicado a tareas pesadas en segundo plano (generación de entradas digitales en formato QR y despacho de correos electrónicos transaccionales) mediante colas de **BullMQ** sobre **Redis**.
*   **Flujo de Autenticación JWT de Alta Seguridad**: Diseñé la seguridad de usuarios implementando hashing con **Bcrypt** y un esquema dual de tokens JWT (Access & Refresh tokens) con revocación activa de tokens de refresco (Blacklisting) en base de datos.
*   **Contenedorización y Pipeline de DevOps**: Orquesté todo el stack de microservicios mediante **Docker** y **Docker Compose**, escribiendo Dockerfiles eficientes basados en Node Alpine que redujeron el peso de las imágenes de producción en más del 50%.
*   **Auditoría de Seguridad y Robustecimiento (Production Readiness)**: Lideré una auditoría técnica completa del repositorio para asegurar el despliegue a producción, eliminando credenciales en texto plano mediante variables de entorno, securizando contenedores contra ejecución root y previniendo fugas de trazas internas en excepciones de Express.

---

## 🧠 Arquitectura y Desafíos Técnicos Resueltos

### 1. Tolerancia a Fallos y Manejo de Errores de Proxy en el Gateway
*   **El Problema**: Por defecto, un API Gateway con proxy reverso puede caerse de forma catastrófica (generando un `unhandledRejection`) si intenta redirigir tráfico a un microservicio interno que se encuentra temporalmente apagado o caído.
*   **La Solución**: Se configuraron manejadores de error dinámicos (`onError`) en cada ruta del proxy en el Gateway. Ante una caída de red de un servicio secundario, el API Gateway captura el fallo limpiamente, escribe un log estructurado y responde al cliente con un JSON de error de servicio (`HTTP 503 Service Unavailable`), manteniendo el Gateway 100% activo.

### 2. Contenedores Ultra-ligeros y Seguridad en Producción
*   **El Problema**: El uso de imágenes de Node por defecto y la ejecución de comandos de desarrollo (como nodemon) en contenedores de Docker ralentiza el tiempo de levantada, crea imágenes de más de 1GB y expone vulnerabilidades si los procesos corren con permisos root.
*   **La Solución**: Se reestructuraron los Dockerfiles del proyecto utilizando compilaciones Multi-stage y la distribución base `node:alpine`. Las dependencias de desarrollo se eliminan en la fase final de compilación y se configura la directiva `USER node` para ejecutar el proceso con un usuario del sistema sin privilegios, mitigando riesgos de inyección de código que puedan comprometer el host.

### 3. Cierre de Sesión Seguro (Logout) y Revocación de Tokens
*   **El Problema**: En autenticación stateless basada en JWT, el usuario no puede "desautenticarse" realmente hasta que el token expire, lo que representa una falla crítica de seguridad si un dispositivo es comprometido.
*   **La Solución**: Se implementó una lógica de cierre de sesión en el servicio de Auth que limpia las cookies HTTP-Only en el navegador y almacena el identificador único del Refresh Token revocado en una lista negra dentro de **Redis** con un tiempo de expiración (TTL) equivalente al tiempo de vida útil del token. Cualquier intento de usar un Refresh Token en la lista negra es denegado inmediatamente.
