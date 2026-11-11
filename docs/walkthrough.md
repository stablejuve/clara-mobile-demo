# Recibo · recorrido manual en simulador

Antes: `npx expo prebuild --platform ios --clean </dev/null && npx expo run:ios </dev/null`; inscribir Face ID en el simulador
(Features → Face ID → Enrolled; al pedirlo, Features → Face ID → Matching Face). Sin inscripción la ceremonia se da por buena a los 600 ms.
El panel de demo: mantener 5 s «powered by Relayer» (Saldo, Ajustes o cualquier pantalla del módulo). «Reiniciar demo» entre escenarios.

## happy
- [ ] Inicio muestra «Hola, Ana» y la tarjeta Recibo con «Activar»; Beneficios muestra «Recibo · powered by Relayer» → Activar.
- [ ] Activar → Empezar → Términos: el botón se habilita sólo con la casilla → Aceptar y continuar.
- [ ] KYC → Abrir verificación → tres pasos → Regresar a Acme → «En revisión» ~2.5 s → Passkey.
- [ ] Crear con Face ID → dirección con QR → Continuar → Saldo en 0.00; a los ~4 s llega «Nómina · 2.ª quincena» (banner + fila) y el saldo marca 492.75 USDC ≈ $8,499.94 MXN (ida y vuelta del redondeo: documentado).
- [ ] Tocar la nómina → Depósito con empresa, concepto, referencia, hash y Copiar.
- [ ] Saldo → Tarjeta → Pedir tarjeta → Solicitada → Endorsement pendiente (~4 s) → Autorizar con Face ID → Tarjeta: Ver datos muestra PAN y CVV; Congelar atenúa el arte; Descongelar.
- [ ] Agregar al teléfono → Apple Wallet → «Tu tarjeta está en Apple Wallet» → Volver a la tarjeta muestra la fila «En tu teléfono».
- [ ] Saldo → Enviar → CLABE `012 1800 0123 4567 899` (BBVA México) → Verificando (~3 s) → Verificada → Enviar a banco.
- [ ] En pesos: 500 → hint «28.99 USDC → $497.66 MXN después de comisión» (28.99 USDC − 0.14 de comisión = 28.85 × 17.25) → Cotizar → revisar comisión y vence en 60 s → Confirmar con Face ID → Recibo «Enviado» → «Completado» (~3.5 s) con folio RCB-… → Compartir abre la hoja.
- [ ] Saldo: la fila del envío aparece arriba con «−»; Ajustes (⚙) → Exportar movimientos abre la hoja con el CSV.
- [ ] Perfil → Apariencia Oscuro: toda la app cambia (fondo carbon, marca turquesa); Sistema vuelve a seguir el simulador.
- [ ] Panel de demo: eventos en orden kyc.approved · module.activated · wallet.ready · deposit.received · card.issued · withdrawal.completed.
- [ ] Ajustes → Desactivar Recibo → confirmar → Beneficios vuelve a «Activar»; el panel lista module.deactivated.

## kyc_rejected
- [ ] Panel → escenario «KYC rechazado» → Reiniciar demo → activar hasta Regresar a Acme → «No aprobada» con dos razones legibles.
- [ ] Intentar de nuevo → la intro del KYC muestra el aviso «Tu intento anterior…»; cambiar a happy en el panel y repetir: aprobado.

## cards_unavailable_region
- [ ] Escenario «Tarjeta no disponible» → activar → Tarjeta → Pedir tarjeta → aviso «Todavía no en tu país» con «Avisarme cuando esté»; el saldo y el envío siguen funcionando.

## endorsement_expired
- [ ] Escenario «Endorsement vencido» → activar → Tarjeta → Pedir tarjeta → «Pasaron más de 24 horas» → Confirmar mis datos → En revisión (~1.5 s) → vuelve a Tarjeta con el estado limpio → Pedir tarjeta funciona.

## bank_verification_failed
- [ ] Escenario «CLABE no verificada» → Enviar → CLABE `072 2250 0987 6543 217` → Verificando → «No pudimos confirmar la titularidad» → otra CLABE (`014 1800 0555 6667 772`) vuelve a Verificando.

## send_failed
- [ ] Escenario «Envío fallido» (con CLABE verificada en happy) → enviar 500 MXN → Recibo «Enviado» → «Falló» con «El banco rechazó…»; Saldo recuperó el monto y la fila queda en «Fallido»; el panel no lista withdrawal.completed.

## Notificación y deep link
- [ ] Panel → Simular pago de Acme (1000 MXN, «Bono», ACME-BONO-1) → banner «Te pagó Acme Beneficios» → tocarlo abre el Depósito.
- [ ] Con el KYC en el paso Domicilio, desde la terminal: `xcrun simctl openurl booted "relayermobiledemo://recibo/kyc-return"` → la app pasa a «En revisión».
