# Almacén V&J — Sistema de Inventario / Kárdex Digital

Sistema web de control de inventario para V&J Electronics Import SAC.
Funciona en celular y computadora desde cualquier navegador, con login,
control de stock en tiempo real, historial de movimientos, alertas de
stock mínimo, gráficas y reportes en PDF.

Proyecto **separado e independiente** del CRM (tiene su propio Firebase
y su propio repositorio de GitHub).

---

## 1. Crear el proyecto en Firebase

1. Ve a https://console.firebase.google.com → **Agregar proyecto**.
2. Nómbralo, por ejemplo, `vj-almacen-inventario`. Puedes desactivar Google Analytics.
3. Dentro del proyecto, ve a **Compilación > Authentication > Comenzar**.
   - Habilita el proveedor **Correo electrónico/contraseña**.
4. Ve a **Compilación > Firestore Database > Crear base de datos**.
   - Elige modo **producción** y la ubicación más cercana (ej. `southamerica-east1`).
5. Ve a **Compilación > Storage > Comenzar** (para las fotos de productos).
6. Ve a **Configuración del proyecto** (ícono de engranaje) → en "Tus apps" elige **Web (`</>`)**.
   - Regístrala con un apodo, por ejemplo `inventario-web`.
   - Copia el bloque `firebaseConfig` que te muestra.

## 2. Configurar el código

1. Abre `js/firebase-config.js` y reemplaza los valores de `firebaseConfig`
   con los que copiaste en el paso anterior.
2. En el mismo archivo, reemplaza `ADMIN_EMAIL` con el correo que usarás
   como administrador principal (el que aprueba a los demás usuarios).

## 3. Activar las reglas de seguridad

1. En Firebase Console → **Firestore Database → Reglas**, pega el contenido
   de `firestore.rules` (de este proyecto), reemplazando `admin_email_aqui`
   por tu correo de administrador **en minúsculas**. Publica.
2. En **Storage → Reglas**, pega el contenido de `storage.rules`. Publica.

## 4. Crear tu cuenta de administrador

1. Sube el sitio a GitHub Pages (ver paso 5) — Firebase Authentication
   **no funciona abriendo el archivo HTML directo desde tu computadora**,
   necesita estar en una URL `https://` como GitHub Pages.
2. Entra a tu sitio publicado y usa **"Solicitar acceso"** con el mismo
   correo que pusiste como `ADMIN_EMAIL`. Esa cuenta queda activada
   automáticamente como administradora — no necesita aprobación.
3. Los siguientes usuarios (hasta 2 más) deben solicitar acceso con su
   propio correo; tú los apruebas desde **Ajustes → Usuarios pendientes**.

## 5. Subir a GitHub y publicar con GitHub Pages

1. Crea un repositorio nuevo en GitHub, por ejemplo `vj-almacen-inventario`.
2. Sube **todos los archivos de esta carpeta** (manteniendo la estructura
   de carpetas `css/` y `js/`) a la raíz del repositorio.
3. Ve a **Settings → Pages** del repositorio.
   - Source: `Deploy from a branch`
   - Branch: `main` / carpeta `/ (root)`
   - Guarda.
4. En 1–2 minutos tu sistema estará disponible en:
   `https://TU-USUARIO.github.io/vj-almacen-inventario/`

## 6. Datos de la empresa

Una vez dentro como administrador, ve a **Ajustes → Datos de la empresa**
y completa nombre, RUC, dirección, teléfono y correo. Esta información
aparece automáticamente en los reportes PDF de movimientos.

---

## Estructura del proyecto

```
index.html          Login + solicitud de acceso
pending.html         Pantalla de espera de aprobación
dashboard.html        Resumen, alertas de stock y gráficas
inventario.html        Listado y alta/edición/borrado de productos
movimientos.html        Registrar entradas/salidas + historial + PDF
ajustes.html          Datos de empresa + gestión de usuarios
css/style.css         Estilos
js/firebase-config.js   Config de Firebase (editar aquí)
js/common.js          Utilidades compartidas
js/auth.js           Control de acceso compartido
js/dashboard.js  js/inventario.js  js/movimientos.js  js/ajustes.js
firestore.rules / storage.rules   Reglas de seguridad (pegar en Firebase Console)
```

## Cómo funciona el control de stock

El stock de cada producto se actualiza automáticamente al registrar un
movimiento — nunca se edita el número de stock a mano (excepto al crear
el producto por primera vez, como "inventario inicial"):

| Movimiento | Efecto en stock |
|---|---|
| Inventario inicial | + (entrada) |
| Compra | + (entrada) |
| Venta | − (salida) |
| Devolución de cliente | + (entrada) |
| Devolución a proveedor | − (salida) |
| Dar de baja (dañado / usado / vencido / otro) | − (salida) |

Cada producto tiene un **stock mínimo** configurable. Cuando el stock
llega a ese nivel o menos, aparece en el banner de alerta del dashboard
y en la lista de "Productos con stock bajo".

## Usuarios y accesos (hasta 3 personas)

- El correo definido como `ADMIN_EMAIL` es el único administrador: aprueba
  o rechaza solicitudes de acceso y edita los datos de la empresa.
- Cualquier persona puede "Solicitar acceso" desde el login, pero queda
  en estado pendiente hasta que el administrador la aprueba desde
  **Ajustes → Usuarios pendientes**.
- El administrador puede quitarle el acceso a un usuario en cualquier
  momento desde **Ajustes → Usuarios con acceso**.

## Nombre del sistema

Desde **Ajustes → Personalización**, el administrador puede escribir el
nombre que quiera para el sistema (por ejemplo, mientras decides entre
"Almacén V&J", "JhonyDex", "Kardexia", etc.). Se actualiza al instante
en la barra superior de todas las páginas, en el título del navegador y
en la pantalla de login. Solo el administrador puede cambiarlo.

## Precio en soles y dólares

Tanto al crear un producto como al registrar un movimiento, puedes
ingresar el precio en **Soles** o en **Dólares** y poner el **tipo de
cambio del día**. El sistema calcula y guarda automáticamente el
equivalente en la otra moneda, junto con el tipo de cambio usado en ese
momento — así, aunque el dólar suba o baje después, siempre puedes ver
con qué tipo de cambio se compró o se vendió cada cosa para calcular tu
margen real.

Para que los reportes no se saturen de información, el PDF de
movimientos se mantiene en Soles (fila por fila) y al final agrega una
sola línea de resumen con el total equivalente en Dólares y el tipo de
cambio promedio usado.

## Logo de la empresa

Desde **Ajustes → Datos de la empresa**, el administrador puede subir
el logo. Se incrusta automáticamente en la cabecera de los reportes PDF.

## Notas técnicas

- Backend: 100% Firebase (Firestore + Authentication + Storage), sin
  servidor propio que mantener.
- El historial de movimientos guarda el nombre y código del producto en
  el momento del movimiento, así que el historial se conserva completo
  aunque luego edites o elimines el producto.
- Las gráficas del dashboard (Chart.js) muestran entradas vs. salidas y
  ventas de los últimos 6 meses, además de la distribución del inventario
  por categoría.
- Los reportes PDF (jsPDF) incluyen automáticamente los datos de la
  empresa configurados en Ajustes.
