# Cómo se construyó esta demo: bitácora de prompts

Este documento reúne los prompts con los que se construyó la demo **Global Dollar Benefits** (Betterfly × Clara) trabajando con Claude Code, del 11 al 19 de noviembre de 2026.

**Sobre la edición.** Los prompts son reales: salen de los historiales de las sesiones. Aquí están redactados de forma más clara y profesional, sin cambiar lo que se pidió. Se omitieron los mensajes de puro trámite («sí», «dale») y se fusionaron los que pedían lo mismo en dos partes. Donde un prompt incluía una imagen o un documento pegado, se indica entre corchetes.

**Sobre la demo.** Es un prototipo 100 % front: no hay backend, ni KYC, emisor, cambio o banco reales. Los datos, las personas y los montos son ficticios. Betterfly y Clara aparecen en un escenario hipotético que no implica un acuerdo real entre ellas.

---

## 1. De dónde viene: el vínculo con un proyecto previo

La demo no empezó de cero. Se montó sobre trabajo anterior, en tres capas:

| Capa | Proyecto de origen | Qué se reutilizó |
|---|---|---|
| Cascarón de la app | **Pickler** (`pickler-expo/apps/mobile`) | La app Expo ya funcional: arranque, navegación, tema, almacenamiento y scripts de iOS. Se hizo un fork y se quitó el producto de Pickler. |
| Dominio y diseño | **Relayer** (`relayer-core`) | El sistema de diseño, el modelo de beneficiarios (cuentas guardadas) y los campos del KYC que exige Bridge. |
| Primera versión de la demo | **«Recibo»** (`relayer-mobiledemo`) | Un módulo para empleados en México: KYC, saldo, tarjeta virtual y retiro por SPEI, todo simulado tras un contrato de API. |

Cuando llegó el spec de Clara, la demo se **reorientó** en lugar de rehacerse. Se conservaron la app, el kit de interfaz, la navegación y los atajos de desarrollo; se reemplazó el modelo de dinero por un ledger nuevo, y más adelante se recuperaron de «Recibo» varias piezas que resultaron mejores que su versión simplificada (KYC completo, beneficiarios, modo explicativo de endpoints, flujo de retiro).

El repositorio es el mismo de principio a fin (`Relayerfi/relayer-mobiledemo`); la carpeta local se renombró a `clara-mobiledemo`.

---

## 2. Skills y herramientas

### Skills de Claude Code

| Skill | Para qué se usó | Fase |
|---|---|---|
| `superpowers:brainstorming` | Aterrizar la idea en un spec antes de escribir código: usuario, alcance y decisiones abiertas. | Origen |
| `superpowers:writing-plans` | Convertir el spec en un plan de implementación de 17 tareas. | Origen |
| `superpowers:subagent-driven-development` | Ejecutar el plan tarea por tarea con subagentes y revisión entre cada una. | Origen |
| `frontend-design:frontend-design` | Dirección visual del rediseño «Recibo Minimal» y del arte de la tarjeta. | Rediseño |
| `run` | Levantar la app real y manejarla para comprobar los cambios en pantalla, no solo con pruebas. | Marca y spec |

### Herramientas de apoyo

- **Claude Design (MCP):** importar el diseño «Recibo Minimal» directamente al código.
- **Búsqueda y lectura web:** localizar el logo, los colores y las capturas de la app de Betterfly; la tarjeta Clara × L'Oréal; el logo de Clara; la documentación de Bridge.
- **Simulador de iOS (`xcrun simctl`):** abrir pantallas y disparar estados con enlaces de desarrollo, y tomar las capturas.
- **Navegador automatizado (Playwright):** recorrer el guion completo con clics reales en la vista web.
- **Pruebas (Jest) y TypeScript:** las reglas del ledger quedaron como pruebas obligatorias.
- **Memoria del proyecto y `CLAUDE.md`:** conservar las decisiones entre sesiones.

---

## 3. Los prompts, por fase

### Fase 0 · Origen: la primera demo («Recibo»), 11 de noviembre

**0.1 Explorar el caso de uso**
> Dame un resumen de lo que puede hacer hoy nuestra app. ¿Podría servir para clientes B2B2C? Estoy pensando en ofrecer el módulo a plataformas de RH y beneficios, o a empleadores grandes: ¿qué haría su usuario final y quién aprueba cada cosa?

**0.2 Definir la demo**
> Quiero crear, en un repositorio aparte, el cascarón de una app móvil en Expo vista desde el lado del usuario final: alguien que recibe dinero en stablecoins desde una app externa y completa todo el flujo. Debe incluir la aceptación del servicio, el cumplimiento necesario para tener una tarjeta virtual con Bridge, la pantalla de saldo, solicitar la tarjeta o agregarla al teléfono, y enviar a una cuenta bancaria. Propongo reutilizar lo que ya tenemos construido en la app móvil de Pickler y aplicarle nuestro nuevo sistema de diseño. Todo con datos fijos, pero revisando la lógica real del KYC, el modelo de datos y qué tendríamos que almacenar para notificar a la empresa.

**0.3 Alcance y una duda legal**
> De acuerdo: haz un fork del cascarón y llámalo `relayer-mobiledemo`. Antes de avanzar, resuélveme una duda: si usamos las wallets custodiales de Bridge, ¿quién es el custodio, Bridge o nosotros, y qué implica eso para un cliente en México bajo la Ley Fintech? Recuerda que en esta fase no hay nada de backend; es solo el cascarón, y en otra fase lo conectamos con los endpoints de la API.

*Resultado:* spec, plan de 17 tareas y una app que arranca en el simulador, con pruebas.

### Fase 1 · Rediseño, 12 de noviembre

**1.1 Importar el diseño**
> Ya tenemos el diseño de cómo queremos que se vea la app móvil para un integrador. Importa este proyecto de Claude Design y aplícalo. [enlace al proyecto «Recibo Minimal»]

**1.2 Tarjeta y datos creíbles**
> Muestra la tarjeta como lo hacen las fintechs, con una imagen de tarjeta y no un recuadro; usa tus skills de diseño. Ponle datos ficticios para que parezca real, e incluye el botón para retirar a cuentas SPEI.

**1.3 Beneficiarios como en el producto real**
> Revisa cómo están integrados los beneficiarios en `relayer-core` y haz lo mismo aquí: que lo predeterminado sea elegir una cuenta guardada, no agregar una nueva, y que también se pueda crear una. Sigue siendo solo front, pero ese código te dará la idea de lo que buscamos.

### Fase 2 · Marca Betterfly, 17 de noviembre

**2.1 Capturas para el deck**
> Toma capturas de las pantallas de la demo y súbelas al repositorio. [Más adelante:] Vuelve a tomarlas para que el diseñador pueda actualizar el deck.

**2.2 Usar una marca real en vez de inventar una**
> Donde dice «Relayer», pon Betterfly: inventar una marca lo hace más difícil de entender. Busca su logo, sus assets y su branding, y si encuentras referencias de su app móvil, úsalas. Es para uso interno.

**2.3 Fidelidad visual**
> Agrega más detalles de la app de Betterfly y usa los colores de su interfaz. [Después:] ¿Su fondo es crema? Ajústalo a como se ve en su app.

**2.4 Tarjeta en colaboración**
> Haz que la tarjeta se vea como una colaboración y no como marca blanca completa, como la que lanzó Clara con L'Oréal. Y quita el paso de passkey de la tarjeta: en su lugar, «Agregar a Apple Wallet».

### Fase 3 · Alinear con el spec de Clara, 17 y 18 de noviembre

**3.1 El cambio de rumbo**
> Contrasta lo que llevamos contra este spec y ajústalo. Que no se sienta saturado: usa las convenciones de diseño de Apple y menos texto. Ya no usaremos Turnkey. [Documento pegado: «Clara Global Cards — Mobile MVP Spec (Short) v1.0»]

**3.2 Una restricción explícita**
> Recuerda que todo es front; nada de backend.

**3.3 Entender lo construido**
> ¿Qué es la pantalla «Demo console»? ¿Hay alguna vista desde la plataforma de Clara, o el spec no la pide? ¿Dónde quedó la vista para invitar al empleado?

**3.4 Sacar el admin de la app del empleado**
> Esa vista debería verse desde otro lado: un back office de la plataforma de Betterfly, no la misma app móvil. También me gustaría ver el escenario donde Acme invita desde Clara.

**3.5 Revisión crítica del flujo**
> Explícame cómo entiendes el flujo y luego analiza si te hace sentido.

**3.6 Cuestionar el modelo de negocio**
> ¿Por qué el pago se haría desde Betterfly, si el dinero está en Clara? Suponiendo que Acme ya usa sus tarjetas corporativas, ¿cuál es la lógica? ¿Y de dónde salen los 100 dólares de beneficio? [Después:] Yo pensaba que Clara y Betterfly son partners, pero no sé cómo conectarlo. ¿Qué deberíamos hacer?

*Resultado:* un modelo de alianza en el que Betterfly lleva la relación con RH y el empleado, y Clara pone el dinero y el producto financiero; el back office muestra las dos miradas.

**3.7 Coherencia con la marca del emisor**
> Clara emite sus tarjetas en la red Mastercard: sería un descuido mostrar Visa. Deja en el repositorio solo las capturas vigentes.

### Fase 4 · Realismo del producto, 18 de noviembre

**4.1 Custodia y pago con tarjeta**
> Confirma que ya no aparece Turnkey y que los fondos están custodiados en Bridge. Revisa este esquema: el pago con la tarjeta global ya no usa passkey, porque usaremos las mismas wallets de Bridge. Al simular un pago debe quedar claro el orden: la transferencia ocurre una vez que Mastercard confirma la aprobación, y la compensación se hace después. [Imagen: esquema del pago]

**4.2 Limpieza**
> La demo anterior («Recibo») ya no se usa; elimínala.

**4.3 Poder explicar el código**
> Guíame por las rutas y la estructura del proyecto, por si me preguntan directamente sobre el código: qué está en Expo, qué está en iOS, por qué está dividido así y qué hace cada script. Explícamelo aquí, sin generar código. [Después:] ¿Los comandos de npm solo abren la app nativa, o también la vista donde se ven ambos lados?

**4.4 Recuperar lo que funcionaba mejor**
> Antes esta pantalla explicaba mejor los beneficios y hasta mostraba la tarjeta; ahora se ve muy plana. Revisa en qué era más fuerte la versión anterior. También se había logrado que Betterfly se viera más colorida y natural. [Imagen de la versión anterior]

**4.5 Quién opera el back office**
> En la plataforma, arriba donde dice «Acme Mexico», pon el nombre de la persona de Acme que hace el envío, para que quede claro que es alguien de la empresa operando desde Betterfly. Considera que Betterfly no es una plataforma de nómina y no puede recibir los fondos, y que no se le puede enviar al empleado hasta que tenga la cuenta activa.

**4.6 Orden legal del alta**
> Al activar la cuenta, creo que el orden no es correcto: primero se valida la identidad y luego se aceptan los términos. Además debe haber dónde consultarlos, aunque en la demo sean enlaces vacíos, y creo que por ley deben mencionar a Bridge. Investígalo.

**4.7 No esconder requisitos reales**
> Faltan muchos campos del KYC que Bridge sí pide y que antes estaban. Entiendo que quieras simplificarlo, pero es mejor mostrar todo y agregar un botón para llenarlo: esta audiencia sabe lo que se necesita, y si lo quitamos parece que no lo sabemos.

**4.8 No mostrar estados sobre los que el empleado no puede actuar**
> No hace falta avisarle al usuario que su beneficio se está procesando; además se queda trabado ahí. Quizá en Finanzas de Clara sí deban liberar el pago, pero en el teléfono es mejor avisarle solo cuando ya llegó.

**4.9 Movimientos en la moneda del usuario**
> Los pagos con tarjeta muestran demasiada información. Que el empleado vea primero su moneda local y debajo los dólares, con un botón para mostrar u ocultar el equivalente. Simplifica el detalle, agrega búsqueda y filtros, y en lo pendiente que quede claro que está pendiente, sin mostrar el saldo. [Imágenes de referencia]

**4.10 Pago como en la vida real**
> El pago está raro: debería activarse el NFC para pagar en un comercio, no elegir un monto. El monto lo pone el comercio.

**4.11 Ajustes de flujo**
> - Cambia el interruptor de «lo uso a nombre de alguien más» por una confirmación de que la cuenta es para uso propio.
> - Debajo de la tarjeta, muestra las transacciones de la tarjeta; en la vista general, las de la tarjeta y la cuenta.
> - Quita el scroll vertical de Inicio: no hay nada más abajo.
> - Cambia el caso de Perú a Colombia.

**4.12 Retiro**
> Elimina «Convert» y recupera el flujo anterior de retiro (a quién, monto, revisar, estado), ahora en pesos colombianos y con beneficiarios. Lo que se teclea es lo que recibe el destinatario: no lo confundas con comisiones, que ya van dentro del tipo de cambio. Muestra la cotización en esa pantalla y cómo se pide en el endpoint. El depósito debe verse pendiente y actualizarse solo, para dejar claro que no es instantáneo. [Imágenes de referencia]

**4.13 Modo explicativo**
> Recupera de la versión anterior la vista que muestra qué endpoint se llamaría en cada acción, y el flujo de agregar un beneficiario y enviarle.

### Fase 5 · Documentación, 19 de noviembre

**5.1 Este documento**
> Necesito un archivo Markdown con los prompts que usé para construir esto, mejorados y con redacción profesional, como demostración de cómo creé el proyecto. Menciona las skills que usamos y cómo lo vinculamos con un proyecto previo.

---

## 4. Patrones de trabajo que se repiten

- **Empezar por un spec y un plan,** no por el código. La primera versión salió de un spec, un plan de 17 tareas y ejecución tarea por tarea.
- **Reutilizar antes que rehacer.** El cascarón de Pickler y el dominio de Relayer ahorraron la base; el spec de Clara reorientó la demo sin tirarla.
- **Restricciones explícitas y repetidas:** «todo es front», «nada cripto a la vista», «que no se sienta saturado».
- **Pedir evidencia visual.** Capturas en cada cambio, y recorridos con clics reales en lugar de confiar solo en que compila.
- **Cuestionar el modelo, no solo la pantalla.** Varias mejoras salieron de preguntar «¿por qué?»: de dónde sale el dinero, quién opera el back office, en qué orden va lo legal.
- **Corregir al asistente cuando simplifica de más.** Varias piezas que se quitaron por «menos texto» se pidieron de vuelta: la audiencia conoce el dominio y espera ver los requisitos reales.
