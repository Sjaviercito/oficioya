# Análisis a fondo: cambios de precio en OficioYa

**Pregunta de diseño:** cuando el trabajo resulta distinto a lo cotizado, ¿cómo se registra un cambio de precio de forma **justa, fácil de usar y con constancia**, sin convertir a OficioYa en un policía de tickets?

**Punto de partida:** OficioYa es un intermediario que no cobra ni maneja pagos (términos y condiciones). Su valor es la **confianza**: identidad verificada y reputación basada en trabajos reales. Lo que el sistema registra debe servir para eso, no para auditar cada peso.

---

## 1. Tres hallazgos que cambian el diseño actual

1. **La ley ya pide desglose.** La Ley Federal de Protección al Consumidor (art. 59) exige un presupuesto por escrito antes de prestar un servicio y, en reparaciones, que describa el servicio, **el costo de refacciones y mano de obra, y su vigencia**. La cotización de OficioYa hoy es **un solo monto**: no separa piezas de mano de obra ni tiene vigencia.
2. **La transparencia voluntaria genera más confianza que la forzada.** En los estudios de Mohan, Buell y John (Harvard), mostrar costos aumentó la intención de compra, pero el efecto aparece cuando la empresa lo hace **por decisión propia**, no por obligación. Además, la transparencia solo deja de funcionar cuando los precios están muy fuera de lo razonable. Esto favorece que el ticket sea una **opción que da puntos de confianza**, no una obligación.
3. **Las plataformas reales separan dos momentos.** En Angi, el cliente debe confirmar el costo **antes** de que el profesional compre el material, y el recibo desglosado se entrega **después**. Es decir: **aprobar antes de comprar, comprobar después**. OficioYa hoy mezcla ambos en un solo paso.

---

## 2. Mapa de casos

### A. Causas legítimas (nadie hizo nada mal)

| # | Caso | Ejemplo | Qué pasa hoy en OficioYa | Consecuencia | Solución |
|---|---|---|---|---|---|
| A1 | Se necesita **reemplazar** en vez de reparar | "La llave no tiene arreglo, hay que cambiarla" | Ajuste de monto único, solo con motivo | El cliente no sabe si $300 es justo, porque no conoce el precio de la pieza | Ajuste **desglosado**: "Piezas +$250, mano de obra +$50"; foto de la pieza dañada |
| A2 | **Daño oculto** | Al abrir la pared, la tubería está podrida | Igual que A1 | Igual que A1 | Foto del daño en el momento: es la mejor evidencia y no requiere comprar nada |
| A3 | **Más trabajo** del esperado | Eran 2 contactos y son 5 | Ajuste único | Se confunde con "me sale más caro el material" | Separar "más mano de obra" de "más material" |
| A4 | El material **subió de precio** o no hay la pieza y la alternativa es más cara | — | Igual | La vigencia del presupuesto no existe, así que no queda claro si el precio ya se venció | Cotización con **vigencia** (LFPC art. 59) y ajuste con motivo "precio de material" |
| A5 | El cliente **amplía el trabajo** | "Ya que estás, cambia también la del baño" | Si pasa del tope de +50 % no se puede; si no, se usa el ajuste | Se mezcla un trabajo nuevo con un sobrecosto: ensucia el porcentaje de ajustes del trabajador | Motivo "**el cliente pidió algo más**": no cuenta como ajuste del trabajador; si es grande, un toque crea una solicitud nueva ya llenada |
| A6 | El trabajo resultó **más fácil** | La pieza solo estaba floja | El sistema **solo permite aumentos** | El trabajador honesto no tiene cómo registrar una baja | Permitir **bajar** el precio sin aprobación del cliente (solo son buenas noticias) y mostrarlo en su perfil |

### B. Causas de información (se pudo prevenir)

| # | Caso | Consecuencia | Solución |
|---|---|---|---|
| B1 | El cliente describió mal o sin fotos | Cotización a ciegas → ajuste casi seguro | Al crear la solicitud, pedir fotos según el oficio ("foto debajo del fregadero"), con ejemplos visuales |
| B2 | El trabajador no pudo preguntar | Igual | **Preguntas antes de cotizar** (RF-21): las respuestas las ven todos los que cotizan |
| B3 | El trabajo **no se puede cotizar sin verlo** | El trabajador cotiza bajo para ganar o alto para cubrirse | Dos tipos de cotización: **precio cerrado** o **visita de diagnóstico** ("cobro $150 por ir; ahí te doy el presupuesto"), que es como se trabaja en la práctica |

### C. Causas oportunistas (alguien intenta aprovecharse)

| # | Caso | Consecuencia | Cómo se detecta | Solución |
|---|---|---|---|---|
| C1 | **Cotizar bajo para ganar y subir después** | Le gana el trabajo a uno honesto; el cliente paga más de lo que habría pagado | Patrón: sus trabajos terminan sistemáticamente arriba de lo cotizado | Mostrar en el perfil "**en promedio termina X % arriba de lo cotizado**" (más informativo que "% con ajuste") |
| C2 | Inflar el precio de las piezas | El cliente paga de más | El cliente no puede saberlo sin referencia | Insignia "**comprueba sus gastos**": si sube el ticket, el sistema lo muestra; si nunca lo hace, también se nota |
| C3 | **Presión en el domicilio**: el cliente acepta por miedo o pena | Ajuste "aceptado" que no fue libre | Disputa o reporte posterior | El cliente acepta **en su propio celular** y siempre ve el botón "Rechazar y seguir al precio original"; puede reportar después |
| C4 | El cliente **rechaza un ajuste legítimo** para no pagar | El trabajador termina a pérdida o cancela, y **cancelar lo penaliza** | Ajuste rechazado con evidencia (foto del daño) | Salida justa: "**No puedo continuar con el precio original**" → cancelación **no atribuible** si hubo un ajuste rechazado con evidencia; el trabajo hecho hasta ahí se registra |
| C5 | El cliente acepta en la app y después dice que no | Disputa sin pruebas | El historial ya existe | El registro del ajuste aceptado (quién, cuándo y por qué) es justo la constancia |
| C6 | **Hecho consumado**: "ya compré la pieza" o "ya lo hice, págame" | El cliente no decidió | Ajuste propuesto después de completar la parte extra | Regla y mensaje claros: "Compra **después** de que el cliente acepte". Si el ticket tiene fecha anterior a la aceptación, se marca |
| C7 | Acuerdan el extra **por WhatsApp** y no lo registran | El sistema no se entera (hallazgo W6 del análisis general) | — | Confirmación del **monto final pagado** por ambas partes al terminar (RF-24) |

---

## 3. El problema de la secuencia

Pedir el ticket como condición para aceptar un ajuste **no funciona en el orden real de las cosas**:

```
Lo que pasa en la realidad:   descubre el problema → avisa → el cliente decide → compra → instala → cobra
Si el ticket es obligatorio:  descubre → COMPRA (sin saber si el cliente acepta) → sube ticket → el cliente decide
```

Con el ticket obligatorio, el trabajador **arriesga su dinero** comprando antes de saber si el cliente acepta. Si el cliente rechaza, se queda con una pieza que no usará. Consecuencia: el trabajador evita la app y lo arregla por WhatsApp, que es justo el problema que el ajuste quería resolver.

**Solución: dos pasos.** (1) El ajuste se aprueba con un **estimado** antes de comprar. (2) Después, el trabajador puede subir el ticket para "cerrar" el costo real. Si el ticket sale **menor** que el estimado, el monto final baja solo (el cliente gana). Si sale **mayor**, se necesita un ajuste nuevo (el cliente decide otra vez).

---

## 4. Opciones de control evaluadas

| Opción | A favor | En contra | Consecuencia de segundo orden | Veredicto |
|---|---|---|---|---|
| **Ticket obligatorio** | Evidencia fuerte | Choca con la secuencia real (sección 3); más pasos; tickets informales o inexistentes (ferretería de barrio, refacciones usadas); la foto puede incluir datos de tarjeta | Los trabajadores dejan de registrar ajustes y vuelven a WhatsApp | ❌ |
| **Sin evidencia** (solo aceptar o rechazar) | Lo más simple | El cliente decide sin información | Ajustes aceptados por pena (C3) o rechazados por desconfianza (C4) | ⚠️ Mínimo aceptable |
| **Evidencia opcional que da reputación** (foto del problema o ticket) | Fácil; aprovecha que la transparencia voluntaria genera confianza | No todos la usarán | Los honestos la usan para distinguirse; con el tiempo, no comprobar se vuelve una señal | ✅ |
| **Tolerancia preautorizada** ("autorizo hasta +10 % en material sin preguntarme") | Cero fricción en cambios pequeños | El trabajador puede cobrar siempre el 10 % | Se vuelve un sobreprecio automático | ⚠️ Solo con desglose y registro; opcional para el cliente |
| **Cotización desglosada + vigencia** | Cumple LFPC art. 59; el ajuste se entiende solo ("piezas +$250") | Un campo más al cotizar | Permite comparar cotizaciones y detectar piezas infladas | ✅ |
| **Visita de diagnóstico** | Refleja cómo se trabaja; elimina cotizar a ciegas | Dos pasos de precio | Menos ajustes, porque el presupuesto se hace viendo el trabajo | ✅ |
| **Rango de precio** ("$800 a $1,100") | Fija expectativas | El cliente se ancla al mínimo y el trabajador al máximo | Discusiones al final | ❌ (la visita de diagnóstico resuelve lo mismo mejor) |

---

## 5. Diseño recomendado

### 5.1 Al cotizar (prevenir)
- Tipo: **Precio cerrado** o **Visita de diagnóstico** (con costo de visita).
- Precio cerrado se captura en dos campos: **Mano de obra** y **Material estimado** (el total se calcula solo), más **vigencia** en días.
- Antes de cotizar, el trabajador puede **preguntar** (RF-21).

### 5.2 Durante el trabajo (proponer un ajuste: 3 toques del trabajador)

```
Trabajador                               Cliente (notificación en su celular)
┌─────────────────────────────┐          ┌─────────────────────────────┐
│ ¿Qué cambió?                │          │ Arturo propone un cambio    │
│ [Pieza extra] [Más trabajo] │          │                             │
│ [Daño oculto] [Pidió más]   │   →      │  $800 → $1,050   (+$250)    │
│ [Es más fácil (baja)]       │          │  Pieza extra: llave nueva   │
│                             │          │  [foto de la llave rota]    │
│ Material  +$ [250]          │          │                             │
│ Mano obra +$ [  0]          │          │ [ Aceptar $1,050 ]          │
│ 📷 Foto (opcional)          │          │ [ Seguir con $800 ]         │
│ [ Enviar al cliente ]       │          │  WhatsApp con Arturo        │
└─────────────────────────────┘          └─────────────────────────────┘
```

- Los motivos se eligen con botones (reconocer en lugar de escribir); el texto libre es opcional.
- Una **baja de precio** se aplica sin pedir aprobación.
- "**Pidió más**" no cuenta en el porcentaje de ajustes del trabajador.
- Mensaje fijo para el trabajador: "Compra la pieza después de que el cliente acepte".

### 5.3 Después de comprar (comprobar, opcional)
- Botón "Agregar ticket" en el ajuste aceptado. Si el ticket es menor, el monto final baja. La foto del ticket solo la ven el cliente y el trabajador, con el aviso "tapa los datos de tu tarjeta".
- Insignia en el perfil: "Comprobó sus gastos en 8 de 10 ajustes".

### 5.4 Si el cliente rechaza
- El trabajador elige: **Seguir al precio original** o **No puedo continuar**. En el segundo caso la cancelación **no se le atribuye** si hubo un ajuste rechazado con foto del problema, y queda registrado el motivo.

### 5.5 Al terminar (cerrar)
- Ambos confirman el **monto pagado** (RF-24). Si no coincide con el monto final registrado, el admin lo revisa.

### 5.6 Lo que ve el próximo cliente (controlar sin vigilar)
En el perfil y en las cotizaciones, en lugar de "% de trabajos con ajuste":
- "**Termina en promedio 6 % arriba de lo cotizado**" (detecta C1).
- "**Comprueba sus gastos**: 8 de 10" (detecta C2).
- Ajustes rechazados: siguen contando en el ranking (regla v1.2).

---

## 6. Consecuencias del diseño recomendado

| Decisión | Consecuencia buscada | Riesgo | Mitigación |
|---|---|---|---|
| Cotización desglosada | Ajustes entendibles; cumple la ley | Un campo más al cotizar | El total se calcula solo; material puede quedar en $0 |
| Visita de diagnóstico | Menos ajustes | Clientes que no quieren pagar la visita | El cliente ve el tipo antes de aceptar y puede elegir otra cotización |
| Ticket opcional con insignia | Confianza sin fricción | Tickets falsos o reciclados | Fecha del ticket vs. fecha de aceptación; reporte del cliente |
| Bajas sin aprobación | Premia la honestidad | Ninguno relevante | — |
| "Pidió más" no cuenta | Métricas justas | El trabajador marca todo como "pidió más" | El cliente ve el motivo y puede rechazar; si rechaza un "pidió más", el sistema lo registra como desacuerdo |
| Cancelación no atribuible tras rechazo | El trabajador no queda atrapado | Trabajadores que proponen ajustes absurdos para salir sin penalización | Solo aplica con foto del problema y dentro del tope; los ajustes rechazados sí pesan en el ranking |
| "Termina X % arriba" en el perfil | Detecta a quien cotiza bajo para ganar | Penaliza daños ocultos legítimos | Excluir los ajustes con motivo "pidió más"; mostrar el número solo con 5 o más trabajos |

---

## 7. Impacto en el contrato (implementado en la v1.3)

| Cambio | Tipo | Prioridad |
|---|---|---|
| Cotización con **mano de obra + material + vigencia** | Modifica RF-06 (LFPC art. 59) | P1 |
| Ajuste con **motivo por botones** y desglose; **bajas** permitidas sin aprobación | Modifica RF-16 (CA-16.4 ya no aplica) | P1 |
| Motivo "**el cliente pidió más**" fuera de las métricas del trabajador | Modifica RF-17 | P1 |
| **Foto opcional** del problema en el ajuste | Nuevo | P1 |
| "**No puedo continuar**" no atribuible tras ajuste rechazado con evidencia | Modifica RF-08 | P1 |
| **Ticket opcional** después de comprar; ajuste automático a la baja | Nuevo | P2 |
| **Visita de diagnóstico** como tipo de cotización | Nuevo | P2 |
| Perfil: "**termina X % arriba**" y "**comprueba sus gastos**" | Reemplaza el % actual de RF-17 | P2 |
| Preguntas antes de cotizar (RF-21) y monto pagado confirmado (RF-24) | Ya propuestos | P2 |
| Tolerancia preautorizada | Nuevo (opcional del cliente) | P3 |

## 8. Decisiones que le tocan al equipo (como "cliente")

1. ¿La visita de diagnóstico tiene costo fijo por oficio o lo pone el trabajador?
2. ¿El cliente puede elegir una tolerancia preautorizada, o se descarta por el riesgo de sobreprecio automático?
3. ¿La foto del problema es obligatoria para la cancelación no atribuible, u opcional?
4. ¿El tope de ajuste aplica a material y mano de obra juntos, o solo a mano de obra (porque el material se puede comprobar)?

---

## 9. Decisiones tomadas e implementación (v1.3)

**Estado: implementado** en el sistema 2.3 / contrato 1.3 (sección 3.8).

| Pregunta | Decisión | Por qué |
|---|---|---|
| ¿Costo de la visita fijo o del trabajador? | **Lo pone cada trabajador** y decide si es **abonable** (se descuenta del trabajo). | Ejemplo real del equipo: "cobro $200 por ir a revisar y cuentan para el trabajo". Un costo fijo por oficio no refleja distancias ni especialidad. |
| ¿Tolerancia preautorizada? | **Descartada.** Todo aumento lo aprueba el cliente. | Un margen automático se convierte en sobreprecio por defecto. |
| ¿Foto obligatoria? | **Solo** para cancelar con "No puedo continuar con el precio original" sin penalización. En los demás casos es opcional pero recomendada. | Sin evidencia, cualquiera podría proponer un aumento inflado, esperar el rechazo y abandonar el trabajo gratis. Con foto, el trabajador que tiene razón no pierde puntos. |
| ¿Tope sobre qué? | **Solo sobre la mano de obra.** El material no tiene tope y se comprueba con ticket. | El material es verificable; la mano de obra no. |

Implementado además: cotización desglosada con vigencia, cambios por botones (pieza extra, más trabajo, daño oculto, el cliente pidió algo más, resultó más fácil), bajas aplicadas sin aprobación, ticket que baja el total si salió más barato, métrica "termina X % arriba" (sin contar lo que pidió el cliente), insignias **Comprueba sus gastos**, **Respeta su cotización** y **Cumplido** (generan competencia sin tocar el ranking) y preguntas antes de cotizar (RF-21) con bloqueo de teléfonos, correos y enlaces.

Sigue pendiente: RF-24 (monto pagado confirmado por ambas partes) y el chat dentro de la app para el lanzamiento real.

---

## Fuentes

- Ley Federal de Protección al Consumidor, art. 59: https://mley.mx/LFPC/articulo/59/
- Mohan, Buell y John, *Lifting the Veil: The Benefits of Cost Transparency* (Marketing Science, 2020): https://pubsonline.informs.org/doi/fpi/10.1287/mksc.2019.1200 · resumen: https://www.library.hbs.edu/working-knowledge/deconstructing-the-price-tag · nota INFORMS: https://informs.org/News-Room/INFORMS-Releases/News-Releases/New-Research-Finds-Cost-Transparency-Can-Increase-Sales-20
- Angi, responsabilidad de herramientas y materiales: https://servicecompanies.zendesk.com/hc/en-us/articles/9485801021843-Who-is-responsible-for-tools-supplies-materials
- Taskrabbit, política de transparencia de precios: https://support.taskrabbit.com/hc/articles/34731466997773
