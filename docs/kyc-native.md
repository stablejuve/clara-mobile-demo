# KYC nativo en Recibo

El diseño «Recibo Minimal» (Claude Design, 2026-11) dibujaba el KYC como tres filas que se completaban solas
(Identificación · Selfie · Domicilio) con un solo botón «Comenzar». Eso no alcanza para lo que Bridge pide en
`POST /customers`, y no coincide con lo que ya tiene relayer-core.

## Contraste

| Bloque | Diseño | relayer-core (`apps/web/components/settings/kyc`) | App (esta rama) |
|---|---|---|---|
| Datos personales (nombre, apellidos, correo, teléfono, nacimiento, nacionalidad) | — | `personal` | **Datos personales** |
| Domicilio (calle, colonia, alcaldía, estado, CP, país) | «Domicilio» (sin campos) | `residentialAddress` | **Domicilio** |
| Identificación con foto (INE/pasaporte, número, vigencia, frente y reverso) | «Identificación» (sin campos) | `identifyingInformation` | **Identificación** (sube fotos con cámara o galería) |
| RFC (lo exige SPEI para residentes MEX) | — | fila `rfc`/`MEX` dentro de `identifyingInformation` | dentro de **Identificación** |
| Prueba de vida | «Selfie» | — (la hace el KYC link de Bridge/Persona) | **Selfie** (cámara frontal) |
| Evaluación de riesgo (propósito, situación laboral, ocupación, movimientos/mes, origen de fondos, intermediario) | — | `riskAssessment` | **Uso de la cuenta** |
| Documentos opcionales (comprobante de domicilio, etc.) | — | `documents` | no (opcional en Bridge) |

## Cómo funciona en la demo

- La hoja de alta muestra las 5 secciones en la página «Verifica tu identidad». Cada fila abre una hoja con el formulario.
- Cada hoja tiene **«Llenar con ejemplo»**: un toque llena esa sección con los datos ficticios de Ana Torres (incluye
  una INE y una selfie dibujadas, marcadas «MUESTRA»). Así la demo se recorre rápido sin dejar de mostrar los campos reales.
- «Guardar» sólo se habilita con la sección válida (mayor de edad, correo, 10 dígitos, CP de 5, RFC de persona física,
  vigencia no vencida, frente y reverso de la INE). Debajo se lista lo que falta.
- «Enviar a revisión» manda el expediente con forma de Bridge (`toSubmission` en `src/relayer/kyc.ts`) a
  `RelayerModuleApi.submitKyc`; el mock lo pasa a `under_review` y resuelve según el escenario (aprobado / rechazado con razones).
- Si Bridge rechaza, las secciones se pueden corregir y se reenvía desde la misma página.

## Fase de backend

`submitKyc(data: KycSubmission)` es el único punto a cambiar: en relayer-core corresponde al flujo del wizard
(`use-kyc-flow.ts`) que guarda el expediente y lo envía a Bridge. La selfie no tiene campo en `POST /customers`;
en producción la prueba de vida la hace el KYC link hospedado (o se omite si el programa de Bridge no la exige).
