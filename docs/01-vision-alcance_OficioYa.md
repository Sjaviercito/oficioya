# Documento de Visión y Alcance

**Proyecto:** OficioYa — plataforma web de oficios con reputación verificada
**Equipo:** Javier Alejandro Santiago Salinas, [PENDIENTE: demás integrantes]
**Fecha:** 22 de septiembre de 2026
**Versión:** 1.0

---

## 1. Problema

### 1.1 Descripción del problema
Contratar a un plomero, electricista, albañil o cerrajero en Puebla depende casi por completo de recomendaciones informales: grupos de WhatsApp de la colonia, publicaciones en Facebook o "el conocido de un conocido". No existe una forma confiable de verificar la identidad del trabajador ni su historial de trabajos anteriores, y las cotizaciones se negocian de palabra, sin registro.

Esto genera una asimetría de información en ambos sentidos:
- **El cliente** no sabe si la persona que entra a su casa es quien dice ser, si hace bien su trabajo o si el precio es justo.
- **El trabajador** que sí hace buen trabajo no tiene cómo demostrarlo fuera de su círculo cercano, porque su reputación no es visible ni transferible.

### 1.2 ¿Quién lo sufre?
- **Hogares** (propietarios e inquilinos) que necesitan reparaciones o instalaciones y no conocen a un trabajador de confianza, sobre todo quienes llegaron recientemente a la ciudad o viven solos.
- **Trabajadores de oficios independientes**, en su mayoría informales, que dependen del boca en boca para conseguir clientes y no tienen un canal para construir una reputación verificable.

### 1.3 Evidencia
- **Contexto de informalidad:** en el segundo trimestre de 2026 la tasa de informalidad laboral en Puebla fue de **70.3 %** de la población ocupada, muy por encima del promedio nacional de **55.1 %** (INEGI, ENOE, segundo trimestre de 2026). La mayoría de los trabajadores de oficios opera fuera de cualquier registro formal, por lo que no existe un historial laboral que un cliente pueda consultar.
  - Fuente estatal: https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2026/enoe/enoe2026_08_Pue.pdf
- **Entrevistas del equipo:** [PENDIENTE: resultados de entrevistas a 5–10 personas. Ejemplo de cómo reportarlo: "De N personas entrevistadas, X contratan oficios por recomendación en WhatsApp/Facebook, Y han tenido al menos una mala experiencia (trabajo mal hecho, cobro mayor al acordado, trabajador que no llegó)". Incluir 1–2 citas textuales de los entrevistados.]
- **Entrevistas a trabajadores:** [PENDIENTE: resultados de 2–3 entrevistas a trabajadores de oficios sobre cómo consiguen clientes y si usan smartphone.]

### 1.4 Impacto de no resolverlo
- Los clientes siguen expuestos a trabajos mal hechos, cobros abusivos y riesgos de seguridad al dejar entrar a desconocidos a su casa.
- Los trabajadores buenos compiten en igualdad de condiciones con los malos, porque no hay forma de diferenciarse; su ingreso depende de una red de contactos limitada.
- Los conflictos (precio, calidad, incumplimiento) no dejan ningún registro, así que se repiten sin consecuencia para quien incumple.

---

## 2. Solución propuesta

### 2.1 Descripción general
OficioYa es una aplicación web responsiva, pensada para usarse desde el celular, que conecta a clientes con trabajadores de oficios **verificados**. El cliente publica una solicitud de trabajo, recibe cotizaciones de trabajadores de su zona y elige una. Al terminar el trabajo, solo el cliente que lo contrató puede calificarlo, y esas calificaciones alimentan un ranking que premia el buen trabajo reciente y castiga las cancelaciones.

El sistema se compone de tres módulos interconectados:
1. **Perfiles y verificación:** solo los trabajadores con identidad verificada pueden recibir solicitudes.
2. **Solicitudes y cotizaciones:** el ciclo de vida de cada trabajo (abierta → cotizada → aceptada → en curso → completada o cancelada).
3. **Reseñas y ranking:** las reseñas solo se habilitan con un trabajo completado en el módulo 2, y el ranking resultante determina el orden en que aparecen los trabajadores en las búsquedas del módulo 2.

### 2.2 ¿Por qué esta solución y no otra?

| Alternativa | Por qué no es suficiente |
|---|---|
| Grupos de WhatsApp / Facebook | No hay verificación de identidad; las recomendaciones se pierden entre mensajes; cualquiera puede publicar reseñas falsas o recomendar a un familiar. |
| Directorios de servicios | Muestran datos de contacto, pero no historial ni calificaciones ligadas a trabajos reales. |
| Plataformas internacionales de servicios | Están diseñadas para otros mercados (pago con tarjeta, verificación con documentos de otros países) y no reflejan cómo se contrata en Puebla: cotización previa, pago en efectivo y trato directo. |
| App nativa (Android/iOS) | Exige instalación, lo que es una barrera para trabajadores con teléfonos de gama baja o poco espacio. Una web responsiva funciona desde el navegador sin instalar nada. |

La diferencia central de OficioYa es que **la reputación está ligada a trabajos completados dentro de la plataforma**: no se puede reseñar a alguien que no se contrató.

---

## 3. Usuarios y casos de uso

### 3.1 Perfiles de usuario (personas)

| Perfil | Rol/contexto | Necesidad principal |
|---|---|---|
| Cliente | Persona que necesita una reparación o instalación en su hogar; usa el celular para casi todo; no conoce a un trabajador de confianza. | Encontrar rápido a alguien confiable, con precio claro antes de empezar. |
| Trabajador de oficio | Plomero, electricista, albañil, cerrajero, etc., que trabaja por su cuenta y consigue clientes por recomendación. | Conseguir más clientes y que su buen trabajo sea visible. |
| Administrador | Integrante del equipo que opera la plataforma. | Validar la identidad de los trabajadores y atender reportes de mal comportamiento. |

### 3.2 Casos de uso clave
1. **Buscar trabajador verificado**: Como cliente, quiero buscar trabajadores verificados por oficio y zona, ordenados por su reputación, para contratar a alguien confiable sin depender de recomendaciones de desconocidos.
2. **Solicitar y comparar cotizaciones**: Como cliente, quiero publicar una solicitud con descripción y fotos del problema para recibir varias cotizaciones y elegir la que más me convenga.
3. **Enviar cotización**: Como trabajador, quiero recibir solicitudes de mi zona y enviar una cotización con precio y tiempo estimado para conseguir clientes nuevos.
4. **Calificar un trabajo completado**: Como cliente, quiero calificar al trabajador después de que termine para que otros clientes sepan si su trabajo es bueno.
5. **Verificar identidad**: Como administrador, quiero revisar la identificación oficial de cada trabajador antes de activarlo para que los clientes tengan la certeza de con quién tratan.

---

## 4. Alcance

### 4.1 Incluido en este proyecto
- [ ] Registro e inicio de sesión con roles (cliente, trabajador, administrador)
- [ ] Módulo de perfiles de trabajador y verificación de identidad por el administrador
- [ ] Módulo de solicitudes y cotizaciones con control de estados
- [ ] Módulo de reseñas y cálculo de ranking
- [ ] Búsqueda de trabajadores por oficio y zona, ordenada por ranking
- [ ] Interfaz web responsiva optimizada para celular

### 4.2 Explícitamente fuera de alcance
- Pagos dentro de la plataforma (el pago se acuerda y realiza directamente entre cliente y trabajador).
- Chat en tiempo real entre cliente y trabajador.
- Rastreo de ubicación en vivo del trabajador.
- Verificación automática de identidad con servicios externos (la revisión es manual por el administrador).
- Aplicación nativa para Android o iOS.
- Facturación electrónica, garantías o seguros sobre los trabajos.

---

## 5. Requisitos funcionales

| ID | Requisito | Prioridad (Must/Should/Could) |
|---|---|---|
| RF-01 | El sistema debe permitir registrarse e iniciar sesión como cliente o como trabajador. | Must |
| RF-02 | El sistema debe permitir al trabajador crear su perfil con oficio(s), zonas de servicio, experiencia y foto. | Must |
| RF-03 | El sistema debe permitir al trabajador subir una identificación oficial, y al administrador aprobarla o rechazarla. Solo los trabajadores aprobados pueden recibir solicitudes. | Must |
| RF-04 | El sistema debe permitir al cliente buscar trabajadores verificados por oficio y zona, ordenados por su puntuación de ranking. | Must |
| RF-05 | El sistema debe permitir al cliente crear una solicitud con oficio, descripción, fotos, colonia y fecha deseada. | Must |
| RF-06 | El sistema debe permitir a los trabajadores verificados de esa zona y oficio enviar una cotización con monto y tiempo estimado. | Must |
| RF-07 | El sistema debe controlar el estado de cada solicitud (abierta → cotizada → aceptada → en curso → completada / cancelada) e impedir transiciones inválidas. | Must |
| RF-08 | El sistema debe registrar, en cada cancelación, qué parte canceló y el motivo. | Must |
| RF-09 | El sistema debe permitir dejar una sola reseña (1–5 estrellas y comentario) únicamente al cliente de una solicitud en estado "completada", dentro de los 30 días siguientes. | Must |
| RF-10 | El sistema debe recalcular automáticamente la puntuación de ranking del trabajador cada vez que recibe una reseña o se le atribuye una cancelación (ver regla de negocio abajo). | Must |
| RF-11 | El sistema debe notificar al trabajador cuando hay una solicitud nueva en su zona y al cliente cuando recibe una cotización. | Should |
| RF-12 | El sistema debe permitir al trabajador responder públicamente a una reseña. | Should |
| RF-13 | El sistema debe permitir a clientes reportar a un trabajador, y al administrador suspenderlo. | Should |
| RF-14 | El sistema debe mostrar al trabajador un panel con sus trabajos completados, calificación promedio y tasa de cancelación. | Could |
| RF-15 | El sistema debe permitir al cliente consultar su historial de solicitudes. | Could |

### Regla de negocio: cálculo del ranking (RF-10)
- Cada reseña tiene un **peso según su antigüedad**: 1.0 si tiene menos de 90 días, 0.6 si tiene entre 90 y 365 días, y 0.3 si tiene más de un año.
- **Calificación ponderada** = Σ(estrellas × peso) / Σ(peso).
- **Tasa de cancelación** = cancelaciones atribuidas al trabajador / solicitudes que aceptó.
- **Puntuación de ranking** = calificación ponderada × (1 − tasa de cancelación).
- Un trabajador con menos de 3 trabajos completados aparece con la etiqueta **"Nuevo"** y se ordena después de los trabajadores con ranking, para que pocas reseñas no inflen su posición.

---

## 6. Requisitos no funcionales

| ID | Requisito | Categoría |
|---|---|---|
| RNF-01 | La búsqueda de trabajadores debe responder en menos de 2 segundos en el 95 % de las peticiones, con al menos 500 trabajadores registrados y conexión 4G. | Rendimiento |
| RNF-02 | Las contraseñas deben almacenarse con hash (bcrypt o equivalente), toda la comunicación debe ir por HTTPS y las sesiones deben expirar tras 24 horas de inactividad. | Seguridad |
| RNF-03 | Las identificaciones oficiales de los trabajadores deben almacenarse cifradas y solo pueden consultarlas los administradores. | Seguridad / Privacidad |
| RNF-04 | La dirección exacta del cliente solo se muestra al trabajador cuya cotización fue aceptada; antes de eso solo se muestra la colonia. | Privacidad |
| RNF-05 | La interfaz debe ser responsiva desde 360 px de ancho y funcionar en las dos versiones más recientes de Chrome y Safari para móvil. | Usabilidad / Compatibilidad |
| RNF-06 | Crear una solicitud no debe requerir más de 5 pantallas o pasos. | Usabilidad |

---

## 7. Métricas de éxito

1. Al menos el **80 % de los usuarios de prueba** (clientes) logra publicar una solicitud sin ayuda en menos de 3 minutos.
2. Al menos el **70 % de las solicitudes** creadas durante la prueba piloto recibe una cotización en menos de 24 horas.
3. La búsqueda responde en **menos de 2 segundos** en el 95 % de las peticiones durante las pruebas de carga.
4. Los usuarios de prueba califican la usabilidad con un puntaje **SUS (System Usability Scale) de 70 o más**.

---

## 8. Riesgos y supuestos

| Tipo | Descripción | Mitigación |
|---|---|---|
| Riesgo | **Reseñas infladas por colusión:** un trabajador y un conocido simulan trabajos para subir su ranking. | Solo se reseña con trabajo completado; se limita a una reseña por cliente por trabajador cada 90 días; el peso por antigüedad reduce el efecto de ráfagas antiguas. |
| Riesgo | **Arranque en frío:** sin trabajadores registrados, los clientes no encuentran a nadie, y viceversa. | Piloto en una zona acotada de Puebla; reclutar primero a trabajadores conocidos por el equipo; datos semilla para las demostraciones. |
| Riesgo | **Suplantación de identidad** en la verificación con documentos falsos o ajenos. | Revisión manual con foto del trabajador sosteniendo su identificación. |
| Supuesto | Los trabajadores de oficios cuentan con smartphone con datos móviles y saben usar el navegador. | Validar en las entrevistas a trabajadores antes de iniciar el desarrollo. |
| Supuesto | Los clientes están dispuestos a esperar cotizaciones en lugar de llamar directamente a alguien. | Medirlo con la métrica 2 durante el piloto. |

---

## 9. Uso de IA en esta etapa

| Agente/herramienta usada | Para qué se usó | Qué tuvo que corregirse manualmente |
|---|---|---|
| Claude (Anthropic) | Lluvia de ideas del proyecto: propuso decenas de opciones de sistemas con módulos interconectados y reglas de negocio, evaluadas contra los requisitos de la actividad. | El equipo descartó la mayoría de las propuestas, eligió la plataforma de oficios por decisión propia y definió el enfoque del proyecto. |
| Claude (Anthropic) | Borrador inicial de este documento a partir de la idea elegida y de la plantilla; búsqueda de datos de informalidad laboral del INEGI. | [PENDIENTE: anotar qué cambiaron ustedes. Por ejemplo, requisitos que modificaron o quitaron, pesos de la fórmula de ranking que ajustaron, métricas que no eran realistas, y los datos de entrevistas que agregaron.] |
