# Análisis causa–consecuencia — OficioYa v2.1

**Propósito:** revisar el sistema completo preguntando, en cada decisión, "si pasa esto, ¿qué provoca?, ¿y eso qué provoca?", hasta llegar a una mitigación concreta. Empieza por el hueco de comunicación entre cliente y trabajador y después recorre todo lo demás.

**Estado (v1.2):** las acciones P1 quedaron implementadas, salvo los avisos fuera de la app (requieren un proveedor de correo o WhatsApp, fuera de alcance). Las P2 y P3 siguen pendientes. Ver la sección 3.7 del contrato.

**Escala usada:** Probabilidad (Baja / Media / Alta) × Impacto (Bajo / Medio / Alto / Crítico). Prioridad P1 = atender antes de usuarios reales; P2 = antes de crecer; P3 = mejora.

---

## Parte A. Comunicación entre cliente y trabajador

### A.1 Diagnóstico: el hueco no es solo "falta WhatsApp"

Hoy, después de aceptar una cotización, el trabajador ve la dirección y el cliente ve el nombre del trabajador. **Nadie tiene un medio de contacto** y la solicitud solo guarda una *fecha* deseada, sin hora. Siguiendo la cadena:

| # | Si pasa… | Entonces… | Y eso provoca… |
|---|---|---|---|
| 1 | No hay forma de acordar la hora | El trabajador llega cuando puede, o el cliente no está | Visitas perdidas → el trabajador cancela → **su tasa de cancelación sube aunque no fue su culpa** → baja en el ranking. La regla de RF-08 castiga al trabajador por un hueco del sistema |
| 2 | El trabajador cotiza solo con fotos y texto, sin poder preguntar | Cotizaciones imprecisas | Más **ajustes de precio** (RF-16) → más trabajadores con porcentaje alto de ajustes → con la regla v1.1, **pierden ranking** por algo que el sistema no les dejó aclarar |
| 3 | No hay canal dentro del sistema | Los usuarios lo buscan fuera: el trabajador deja su número en la descripción o el cliente lo pide | Los datos de contacto circulan **sin control**, se negocia fuera y el ajuste de precio deja de registrarse. Es exactamente el problema que reportó el usuario en la Etapa 4 |
| 4 | Surge un problema durante el trabajo (falta material, llueve, se pospone) | No hay cómo avisar | Cancelaciones o reseñas malas que no reflejan la calidad del trabajo |

**Conclusión:** el problema real es que el sistema no cubre tres momentos de la conversación: **antes de cotizar** (aclarar el trabajo), **después de aceptar** (coordinar la visita) y **durante el trabajo** (imprevistos). Un botón de WhatsApp solo cubre el segundo y el tercero.

### A.2 Opciones evaluadas

| Opción | Qué resuelve | A favor | En contra | Costo |
|---|---|---|---|---|
| **1. Botón de WhatsApp (`wa.me`) después de aceptar** | Coordinar la visita e imprevistos | Es lo que la gente ya usa en México; no requiere integración; WhatsApp permite enlaces que abren el chat con un número y un mensaje inicial | Expone el número para siempre (no se puede "des-compartir"); todo lo que se acuerde ahí queda **fuera del registro**; facilita llevarse el siguiente trabajo fuera de la plataforma | Gratis |
| **2. Chat dentro de OficioYa** | Los tres momentos, con registro | Queda constancia (sirve en disputas y para detectar cobros fuera); no se expone el número | Es un sistema grande (tiempo real, moderación, notificaciones); la gente no abre otra app para chatear; sin push el mensaje no se ve | Alto (desarrollo) |
| **3. Llamadas o números enmascarados** (tipo Uber) | Coordinar sin exponer el número | Privacidad real; se puede cortar al terminar | Proveedor externo de pago por minuto o por número | Alto (por uso) |
| **4. Preguntas y respuestas en la solicitud, antes de cotizar** | Aclarar el trabajo antes de cotizar | Queda registrado; **reduce ajustes** (A.1 #2); la respuesta sirve a todos los que cotizan | No sirve para coordinar la visita | Bajo |
| **5. Propuesta de horario dentro de la app** | Fijar fecha y hora de la visita | Queda registrado; si alguien no llega, hay evidencia de quién incumplió | No cubre imprevistos | Bajo |
| **6. Avisos por WhatsApp desde OficioYa** (API de WhatsApp Business) | Que los avisos de RF-11 lleguen al teléfono | Resuelve que hoy los avisos solo se vean al entrar a la app | Requiere cuenta empresarial de Meta, plantillas aprobadas y pago por conversación | Medio–alto |

**Recomendación:** combinar **4 + 5 + 1**. Así queda registrado dentro de la app lo que importa para la reputación y las disputas (alcance del trabajo, hora acordada, precio), y WhatsApp queda solo para lo operativo ("ya voy", "no hay agua"). La 2 y la 3 no se justifican para el tamaño actual; la 6 entra cuando haya presupuesto.

### A.3 Cascada de consecuencias del botón de WhatsApp (y su mitigación)

| # | Si pasa… | Consecuencia | Prob. × Impacto | Mitigación |
|---|---|---|---|---|
| W1 | Se pide teléfono al registrarse | Se recaba un dato personal nuevo | Alta × Medio | **Aviso de privacidad** visible al momento de recabarlo, con la finalidad ("coordinar trabajos aceptados"). La LFPDPPP vigente desde el 21 de marzo de 2025 exige darlo a conocer desde que se recaban los datos, y si los datos se usan para otra finalidad hay que volver a pedir consentimiento. **Hoy OficioYa no tiene aviso de privacidad, aunque ya recaba INE, selfie y dirección** (ver B.1) |
| W2 | Alguien registra un número ajeno o que no tiene WhatsApp | El botón no sirve; o peor, llega a un tercero | Media × Medio | Validar formato (10 dígitos, México) y **verificar con un código** antes de mostrarlo. Mientras no esté verificado, el botón no aparece |
| W3 | Un estafador se registra como trabajador para conseguir números de clientes | Fraude o acoso por WhatsApp | Baja × Alto | El número **solo se muestra a trabajadores verificados con INE** y solo después de que el cliente aceptó su cotización. No hay forma de cosechar números en masa |
| W4 | Suplantación: alguien escribe por WhatsApp "soy de OficioYa, mándame el código" | Robo de la cuenta de WhatsApp del usuario. En México el robo de cuentas por código de verificación es una de las estafas más extendidas | Media × Alto | Mensaje fijo en la app: "OficioYa nunca te escribirá por WhatsApp para pedir códigos ni pagos". El mensaje prellenado del botón no incluye enlaces |
| W5 | Termina el trabajo y el número sigue en el teléfono del otro | Mensajes no deseados o acoso; no se puede revocar | Media × Alto | Reporte con motivo "acoso después del trabajo" (los reportes hoy solo van del cliente al trabajador: hay que hacerlos **en ambos sentidos**, ver B.4); el botón deja de mostrarse al completar o cancelar |
| W6 | Acuerdan un cobro extra por WhatsApp | El ajuste de precio no se registra | Alta × Alto | Al confirmar "terminado", preguntar a **ambos**: "¿El pago final fue de $X?". Si no coincide, se marca la solicitud para revisión y queda evidencia. Hace visible el cobro fuera de la plataforma sin depender de la buena fe |
| W7 | El cliente vuelve a contratar al mismo trabajador directo por WhatsApp | El trabajo no queda en el historial ni genera reseña | Alta × Medio | Ver W8 |
| W8 | ¿Cuánto daña eso a OficioYa? | Depende del modelo de negocio | — | **Hoy OficioYa no cobra comisión, así que la fuga no cuesta dinero: cuesta datos de reputación.** Los estudios de plataformas encuentran que la fuga crece cuando se introducen comisiones (en un servicio de entregas, la comisión casi duplicó las transacciones fuera de la plataforma). Mitigación por incentivo, no por prohibición: botón **"Volver a contratar"** que crea la solicitud directa al mismo trabajador, y el trabajador solo sube en ranking con trabajos registrados. Si algún día se cobra, preferir suscripción del trabajador sobre comisión por trabajo |
| W9 | El cliente o el trabajador no tiene WhatsApp | Se queda sin canal | Baja × Medio | El botón ofrece también "Llamar" (`tel:`) con el mismo número y las mismas reglas |

### A.4 Diseño propuesto (contrato v1.2)

1. **RF-20 Teléfono verificado:** obligatorio para trabajadores (forma parte de su verificación) y para clientes antes de su primera aceptación. Aviso de privacidad y consentimiento al capturarlo.
2. **RF-21 Preguntas antes de cotizar:** el trabajador pregunta en la solicitud y el cliente responde; todos los que cotizan ven la conversación.
3. **RF-22 Horario de visita:** el trabajador propone fecha y hora y el cliente acepta. Si después alguien cancela por "no llegó", queda evidencia de quién incumplió y la cancelación se atribuye correctamente (hoy se atribuye por quién oprime el botón).
4. **RF-23 Contacto directo:** botones de WhatsApp y llamada solo en `aceptada` y `en_curso`, solo para el cliente dueño y el trabajador aceptado; el número nunca viaja en la API para nadie más (misma regla que RNF-04).
5. **RF-24 Confirmación del monto pagado** por ambas partes al terminar (W6).
6. **RF-25 Volver a contratar** (W8).

Criterios clave: *Given* una solicitud `cotizada`, *When* el cliente consulta el detalle, *Then* el JSON no contiene el teléfono de ningún trabajador. *Given* una solicitud `completada`, *When* cualquiera consulta el detalle, *Then* ya no aparece el botón de contacto. *Given* que el cliente confirma $1,000 y el trabajador $1,300, *When* ambos confirman, *Then* la solicitud queda marcada "monto en disputa" y el admin la ve.

---

## Parte B. Análisis del sistema completo

### B.1 Datos personales y cumplimiento legal

| # | Si pasa… | Consecuencia | Prob. × Impacto | Mitigación | Prioridad |
|---|---|---|---|---|---|
| L1 | Se recaban INE, selfie, dirección y nombre **sin aviso de privacidad** | Incumplimiento de la LFPDPPP 2025; la autoridad ya no es el INAI sino la Secretaría de Anticorrupción y Buen Gobierno | Alta × Alto | Aviso de privacidad en el registro y antes de subir la INE; casilla de consentimiento | **P1** |
| L2 | Un usuario pide borrar su cuenta (derechos ARCO) | No hay cómo: no existe "eliminar cuenta" | Media × Alto | Endpoint de eliminación que anonimiza reseñas y borra INE, selfie, teléfono y dirección | **P1** |
| L3 | Las INE se guardan indefinidamente | Cuanto más tiempo, más daño si hay una filtración | Media × Crítico | Política de retención: borrar las imágenes 30 días después de aprobar o rechazar, conservando solo quién revisó y cuándo | P2 |
| L4 | No hay términos y condiciones | En una disputa por un trabajo mal hecho no queda claro que OficioYa es intermediario | Media × Alto | Términos aceptados al registrarse | P1 |
| L5 | Las fotos de las solicitudes son públicas por URL | Pueden mostrar el interior de la casa, documentos o caras; cualquiera con el enlace las ve | Media × Medio | Servir las fotos de solicitudes solo con sesión y solo a quien puede ver la solicitud; las fotos de perfil sí pueden ser públicas | P2 |

### B.2 Credenciales de demostración en producción

| # | Si pasa… | Consecuencia | Prob. × Impacto | Mitigación | Prioridad |
|---|---|---|---|---|---|
| D1 | El correo y la contraseña del **administrador** están escritos en el documento de entrega y en el repositorio | Cualquiera que los lea entra como admin, aprueba trabajadores falsos y **ve las INE descifradas** de quien se haya registrado de verdad | Alta × Crítico | Cambiar la contraseña del admin al terminar la evaluación; separar el ambiente de demostración del real; en producción, el admin no se crea con el seed | **P1** |
| D2 | El seed corre en cada despliegue | Si alguien borra el admin, el siguiente deploy lo recrea con la contraseña conocida | Media × Alto | Seed de demostración solo con una variable `DEMO=true` | P1 |
| D3 | Se pierde `IDENTITY_ENC_KEY` en Render | Ninguna INE se puede volver a abrir | Baja × Alto | Respaldar la clave fuera de Render (gestor de contraseñas del equipo) | P2 |
| D4 | Se filtra `IDENTITY_ENC_KEY` | Todas las INE de la base se pueden descifrar | Baja × Crítico | Rotación de clave con versión por archivo (`v1:`, `v2:`) para recifrar | P3 |

### B.3 Reputación y ranking

| # | Si pasa… | Consecuencia | Prob. × Impacto | Mitigación | Prioridad |
|---|---|---|---|---|---|
| R1 | **La penalización v1.1 por ajustes** (−10 %) | Los trabajadores aprenden que proponer un ajuste les baja el ranking → **cotizan más alto desde el inicio** (sube el precio para todos) o **vuelven a cobrar el extra fuera de la plataforma**, que es exactamente el problema que el ajuste quería resolver. La decisión de la v1.1 tiene un efecto contrario a su objetivo | Alta × Alto | Penalizar solo lo que indica abuso: ajustes **rechazados por el cliente** o casos donde el cliente marca "no me lo explicaron". Un ajuste aceptado es transparencia, y debería neutral o incluso premiarse. Requiere contrato v1.2 y repetir CA-10.6 | **P1** |
| R2 | Los trabajadores nuevos aparecen siempre después de los establecidos | Nunca consiguen su primer trabajo → se van → poca oferta en zonas nuevas | Alta × Alto | Intercalar un "Nuevo" cada N resultados, o una sección "Recién verificados" | P2 |
| R3 | Un trabajador crea una cuenta de cliente falsa con un amigo y se autocalifica | Reputación inflada | Media × Alto | Detectar misma IP, dispositivo o teléfono entre cliente y trabajador (el teléfono verificado de A.4 ayuda); limitar reseñas entre el mismo par cliente–trabajador | P2 |
| R4 | El cliente amenaza con una mala reseña para conseguir descuento | Extorsión de reseña | Media × Medio | Ya existe la respuesta pública (RF-12); agregar el reporte del trabajador hacia el cliente (B.4) | P2 |
| R5 | El cliente nunca confirma "terminado" | El trabajo queda `en_curso` para siempre: el trabajador no suma trabajos completados ni recibe reseña | **Alta × Alto** | Que el trabajador también pueda marcar "terminado"; el cliente tiene 72 horas para disputarlo; si no responde, se completa solo | **P1** |
| R6 | El recálculo diario no corre porque Render está dormido (RF-10 ⚠️) | El peso por antigüedad se desactualiza | Alta × Bajo | Ping programado externo que también llame al recálculo | P3 |

### B.4 Seguridad física y abuso

| # | Si pasa… | Consecuencia | Prob. × Impacto | Mitigación | Prioridad |
|---|---|---|---|---|---|
| S1 | Solo el trabajador está verificado; el cliente no | El trabajador va a un domicilio de alguien de quien no se sabe nada | Media × Crítico | Teléfono verificado del cliente (A.4) y reportes del trabajador hacia el cliente con suspensión de clientes | **P1** |
| S2 | Los reportes van solo del cliente al trabajador | Un cliente abusivo no tiene consecuencia | Media × Alto | Reportes en ambos sentidos | P1 |
| S3 | Un trabajador ya suspendido sigue teniendo la dirección de clientes anteriores | Riesgo de que regrese | Baja × Crítico | Inherente a cualquier servicio a domicilio; mitigar con verificación estricta y con la evidencia (INE) para una denuncia | P3 |
| S4 | Un usuario reporta en masa a un competidor | Suspensión injusta | Media × Medio | La suspensión ya es manual (el admin decide) y ya existe la reactivación; agregar el historial de reportes de quien reporta | P3 |

### B.5 Flujo y reglas de negocio

| # | Si pasa… | Consecuencia | Prob. × Impacto | Mitigación | Prioridad |
|---|---|---|---|---|---|
| F1 | El cliente cancela cuando el trabajador ya compró material | El trabajador pierde dinero y el cliente no tiene ninguna consecuencia | Media × Alto | Tasa de cancelación del **cliente**, visible para los trabajadores antes de cotizar | P2 |
| F2 | El trabajador descubre en la visita de diagnóstico que el trabajo es más grande, antes de "iniciar" | Solo puede proponer un ajuste estando `en_curso`; tiene que iniciar un trabajo con un precio que ya sabe que está mal | Media × Medio | Permitir el ajuste también en `aceptada` (cambia CA-16.5) o, mejor, las preguntas antes de cotizar (A.4) reducen el caso | P2 |
| F3 | Las zonas son un catálogo fijo de 6 | Zonas demasiado grandes (avisos irrelevantes) o sin cobertura | Media × Medio | Más zonas por colonia o por código postal | P3 |
| F4 | Los avisos solo se ven al entrar a la app | El trabajador no se entera de solicitudes nuevas → el cliente espera horas → se va a WhatsApp o Facebook | **Alta × Alto** | Notificaciones fuera de la app: correo (barato) o WhatsApp Business (A.2 opción 6) | P1 |
| F5 | El límite de intentos vive en memoria | Se reinicia cuando Render se duerme; con más de una instancia no se comparte | Media × Bajo | Guardar los intentos en la base | P3 |
| F6 | Un atacante prueba muchas contraseñas cambiando el correo | El límite es por correo + IP, así que no lo detiene | Baja × Medio | Límite global por IP además del límite por correo | P3 |

### B.6 Infraestructura y operación

| # | Si pasa… | Consecuencia | Prob. × Impacto | Mitigación | Prioridad |
|---|---|---|---|---|---|
| I1 | La API tarda ~1 minuto en despertar | El primer usuario del día cree que la app no sirve | Alta × Alto | Ping cada 10 minutos en horario de uso, o plan de pago | P1 (antes de usuarios reales) |
| I2 | Las imágenes ahora se guardan en la base (v1.1) | Con fotos de hasta 5 MB, unos cientos de trabajadores llenan el espacio gratuito de Neon → fallan las subidas **y todo lo demás** | Media × Alto | Comprimir y redimensionar en el navegador antes de subir (≈200 KB por foto); alerta de uso; migrar a almacenamiento de objetos al crecer | P2 |
| I3 | Se agotan las horas de cómputo gratuitas de Neon | La base se suspende hasta el siguiente mes → todo el sistema cae | Baja × Crítico | Monitorear consumo; presupuesto para el plan de pago | P2 |
| I4 | El servidor del curso no tiene `mod_headers` | La CSP no se aplica y nadie se entera | Media × Medio | Verificar la cabecera en el navegador (F12 → Red → `Content-Security-Policy`) | P1 (verificación de 1 minuto) |
| I5 | La carpeta `private` del servidor del curso es pública | Ya provocó el incidente H-01 | — | Ya mitigado: nada sensible vive en ese servidor | — |

### B.7 Modelo de negocio (no definido)

| # | Si pasa… | Consecuencia | Mitigación |
|---|---|---|---|
| N1 | OficioYa no cobra nada | No hay con qué pagar hosting, verificación ni soporte cuando crezca | Definirlo en la visión |
| N2 | Se elige comisión por trabajo | Aumenta el incentivo a negociar fuera (W8): la evidencia empírica encuentra que la fuga crece con las comisiones | Preferir suscripción del trabajador (visibilidad, insignias) o cobro al cliente por garantía |
| N3 | Se elige suscripción del trabajador | Los nuevos no pueden pagar antes de tener clientes | Periodo gratuito hasta su tercer trabajo |

---

## Parte C. Priorización

**P1: antes de cualquier usuario real**
1. D1/D2: credenciales de demostración fuera de producción.
2. L1/L4: aviso de privacidad y términos.
3. L2: eliminar cuenta.
4. **R1: corregir la penalización por ajustes** (la decisión v1.1 va en contra de su objetivo).
5. R5: confirmación de "terminado" por el trabajador con plazo para el cliente.
6. A.4: teléfono verificado, contacto directo y horario de visita.
7. S1/S2: reportes en ambos sentidos.
8. F4/I1: avisos fuera de la app y API sin "despertar".
9. I4: comprobar que la CSP sí se aplica.

**P2: antes de crecer:** preguntas antes de cotizar (A.4), confirmación del monto pagado (W6), compresión de imágenes (I2), trabajadores nuevos visibles (R2), anti-autocalificación (R3), tasa de cancelación del cliente (F1), retención de INE (L3), fotos de solicitud privadas (L5).

**P3: mejora:** rotación de claves, zonas más finas, límites de login en la base, volver a contratar.

---

## Fuentes

- Ley Federal de Protección de Datos Personales en Posesión de los Particulares (DOF 20-03-2025): https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf
- KPMG, resumen de la nueva LFPDPPP: https://kpmg.com/mx/es/tendencias/2025/04/flash-nueva-ley-federal-de-proteccion-de-datos-personales-en-posesion-de-los-particulares.html
- WhatsApp, "Cómo usar el clic para chatear": https://whatsapp.com/faq/en/general/26000030
- Xie y Zhu, *Platform Leakage: Disintermediation and Decentralization in Two-Sided Markets*: https://english.phbs.pku.edu.cn/info/3882/48882.htm
- Edelman y Hu, *Disintermediation in Two-Sided Marketplaces* (HBS 917-004): https://www.benedelman.org/?p=1154
- Astashkina et al., estudio de una plataforma de limpieza a domicilio: https://www.kellogg.northwestern.edu/faculty/bray/doc/disintermediation/disintermediation.pdf
- Mercado Pago, estafas por WhatsApp más comunes en México: https://www.mercadopago.com.mx/blog/estafas-whatsapp-comunes-como-evitarlas
