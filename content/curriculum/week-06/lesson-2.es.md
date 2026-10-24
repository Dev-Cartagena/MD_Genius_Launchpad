## Objetivos de aprendizaje

- Elegir una métrica principal y las pocas métricas de entrada que la impulsan.
- Definir eventos de activación y retención que reflejen valor real para tus usuarios.
- Calcular CAC, LTV y periodo de recuperación, y explicar qué significan en una etapa temprana.
- Construir un margen bruto de IA que incluya inferencia y revisión humana, y comprobar si estás en "default alive".

## Resumen

Las métricas son la forma en que una startup sabe si esta semana fue mejor que la anterior. Sin ellas, los fundadores caen en actividades que se sienten productivas pero no cambian nada. Las startups de IA necesitan además una disciplina que los fundadores de software antes podían saltarse: su costo de entregar el producto no es casi cero. Cada respuesta cuesta dinero en llamadas al modelo, y muchas veces también en revisión humana. Los inversionistas lo saben y, a 2026, preguntan con frecuencia a los fundadores de IA por el margen bruto y los costos de inferencia desde la etapa semilla. Esta lección te da un conjunto pequeño y honesto de números para dirigir la empresa.

## Las métricas que importan

### Una métrica principal

Los socios de YC aconsejan de forma constante elegir una métrica principal, el número por el que apostarías la empresa, y ponerla en el centro de cada reunión semanal. El ensayo de Paul Graham "Startup = Growth" dice que lo mejor para medir es el ingreso, y que los usuarios activos son la siguiente mejor opción para las startups que todavía no cobran. También señala que una buena tasa de crecimiento durante YC es de 5 a 7% por semana. Tómalo como referencia de impulso, no como requisito para cualquier negocio.

### Métricas de entrada

Debajo de la métrica principal, elige de tres a cinco métricas de entrada en las que puedas influir directamente, como cuentas nuevas activadas, usuarios activos semanales por cuenta o pilotos convertidos. Juntas forman un árbol de métricas simple: si una entrada se mueve, la métrica principal debería seguirla.

### Evita las métricas de vanidad

Los registros totales, las visitas a la página y las llamadas al modelo siempre suben sin decirte si alguien obtiene valor. Prefiere tasas y cohortes en lugar de totales acumulados.

### Activación: el primer momento de valor

La activación es el punto en que un usuario nuevo obtiene por primera vez el valor que prometiste. Defínela como un evento concreto, no como una sensación: "completó el primer reporte", "obtuvo una respuesta correcta a una pregunta real". Luego mide qué parte de los usuarios nuevos llega a ese punto y cuánto tarda. El tiempo hasta el valor suele ser donde los productos de IA ganan o pierden, porque una configuración lenta mata la magia.

### Retención: valor que dura

La Lección 1 trató las curvas de retención. Para tu panel de métricas, elige un número de retención con la frecuencia natural de tu producto, como los usuarios activos semanales en la semana 4 de cada cohorte. En productos B2B, mide también la retención neta de ingresos: el ingreso de una cohorte de clientes existentes un año después, sumando expansión y restando bajas, dividido entre su ingreso inicial. Una cifra por encima del 100% significa que los clientes actuales crecen por sí solos.

## Economía unitaria: CAC, LTV y recuperación

### Costo de adquisición de clientes

El CAC es lo que gastas para ganar un cliente: los costos de ventas y marketing divididos entre los clientes nuevos del mismo período. Al principio, incluye el tiempo de los fundadores a un costo razonable, porque la venta liderada por fundadores no es gratis; solo no se paga.

### Valor de vida del cliente

Un LTV simple es el ingreso mensual promedio por cliente, multiplicado por el margen bruto y dividido entre la tasa de bajas mensual. El término del margen bruto importa: el valor de vida es la ganancia que genera un cliente, no el ingreso. Con pocos meses de datos, las estimaciones de bajas son frágiles, así que muestra el LTV como un rango.

### Las proporciones que se usan

La guía "SaaS Metrics 2.0" de David Skok, muy usada en la industria, propone dos reglas prácticas: el LTV debería ser al menos tres veces el CAC, y el CAC debería recuperarse con unos 12 meses de ganancia bruta. Son guías para negocios que ya escalan. En la etapa de pilotos, úsalas para revisar la dirección, no para descartar una idea.

## Margen bruto de IA y costos de inferencia

### Qué entra en el costo de ventas

El margen bruto es el ingreso menos el costo de ventas (COGS), dividido entre el ingreso. En un producto de IA, el COGS suele incluir la inferencia del modelo, las APIs de voz o visión, la infraestructura de recuperación y hosting, y cualquier revisión humana o etiquetado que forme parte de entregar la respuesta. Los costos de soporte que crecen con los clientes también suelen ir aquí.

### Por qué los márgenes de IA son distintos

En un análisis de 2020, "The New Business of AI", la firma de capital de riesgo a16z observó que las empresas de IA solían tener márgenes brutos de entre 50 y 60%, por debajo del 60 a 80% o más típico de negocios SaaS comparables, sobre todo por el cómputo en la nube y la intervención humana. Los precios de los modelos han bajado desde entonces, pero el uso por usuario muchas veces ha crecido, así que la lección sigue vigente: el margen es una decisión de diseño, no algo dado.

### Usuarios intensivos y las palancas del margen

El costo promedio esconde el problema. Una pequeña parte de usuarios intensivos puede consumir la mayor parte de tu presupuesto de inferencia, así que revisa el costo por usuario por percentil, no solo el promedio. Las palancas son las de la Semana 5: envía las solicitudes fáciles a modelos más baratos, recupera menos y mejor, guarda en caché lo que se repite y reduce la parte de respuestas que requieren revisión humana a medida que mejoran tus evaluaciones. El precio, que veremos en la Lección 3, es la otra palanca.

## Default alive o default dead

El ensayo de Paul Graham "Default Alive or Default Dead?" hace una pregunta directa: si los gastos se mantienen constantes y los ingresos siguen creciendo al ritmo reciente, ¿llegarás a ser rentable con el dinero que te queda? Si la respuesta es sí, estás en default alive. Si no, estás en default dead, y necesitas cambiar algo o levantar capital mientras aún tienes tiempo. Trevor Blackwell creó una calculadora simple para esto, enlazada desde el ensayo. Úsala cada mes. La mayoría de las startups pre-semilla están en default dead, y eso es normal; el peligro es no saberlo.

## Caso: Fieldnote

El panel de métricas de Fieldnote pone una métrica principal arriba: técnicos activos por semana en los 3 contratistas piloto, que será reemplazada por el ingreso cuando los pilotos se conviertan. Las métricas de entrada son técnicos activados, definidos como quienes reciben en su primera semana una respuesta correcta y aceptada a una pregunta real de trabajo; preguntas por técnico activo por semana; y la parte de respuestas enviadas a revisión humana.

Para estimar el margen bruto, Tomás armó un modelo de costos por técnico al mes. Son estimaciones hipotéticas de los propios fundadores. Supuso unas 60 preguntas por técnico activo al mes. La inferencia del modelo, la recuperación y la transcripción de voz sumaban unos pocos centavos por pregunta, aproximadamente 2 a 3 dólares por técnico. La revisión humana fue la sorpresa. Con el 15% de las respuestas revisadas en unos tres minutos cada una, y el tiempo del revisor calculado en unos 30 dólares por hora, la revisión costaba varias veces más que los modelos, alrededor de 13 a 14 dólares por técnico. Con un precio de prueba de 40 dólares por técnico al mes, eso dejaba un margen bruto cercano al 60%. Bajar la tasa de revisión al 5% a medida que mejoren las evaluaciones lo subiría por encima del 80%.

Eso le mostró al equipo dónde trabajar: la tasa de revisión, no la factura de los modelos, era el mayor impulsor de costos. Al hacerse la pregunta de Graham, Ana confirmó que, con los pilotos todavía gratis, Fieldnote está en default dead. Convertir los pilotos en contratos pagados se volvió el trabajo más urgente del mes.

## Errores comunes

- Seguir diez métricas con el mismo peso, de modo que ninguna guía las decisiones.
- Reportar registros acumulados en lugar de activación y retención por cohorte.
- Calcular el LTV con el ingreso en lugar de la ganancia bruta, o con un solo mes de bajas.
- Dejar la inferencia y la revisión humana fuera del COGS, lo que hace que los márgenes parezcan de SaaS clásico.
- No saber si estás en default alive hasta que el runway se acorta.

## Tu turno

Dedica 25 minutos. Escribe tu métrica principal y tres métricas de entrada. Define tu evento de activación en una oración. Luego arma un modelo de costos en una sola hoja: tareas por usuario al mes, costo del modelo y de las APIs por tarea, parte de las tareas revisadas por una persona y el costo de cada revisión, y el costo resultante por usuario. Compáralo con un precio candidato y calcula el margen bruto.

## Ideas clave

- Dirige la empresa con una métrica principal, idealmente el ingreso, y unas pocas métricas de entrada debajo.
- Define la activación y la retención como eventos concretos ligados a valor real.
- El LTV se construye sobre la ganancia bruta; compáralo con el CAC y la recuperación como referencias de dirección.
- El margen bruto de IA debe incluir la inferencia y la revisión humana, y ambas se pueden reducir con diseño.
- Sabe cada mes si estás en default alive.

## Recursos

- Startup = Growth (Paul Graham): https://paulgraham.com/growth.html
- Default Alive or Default Dead? (Paul Graham): https://paulgraham.com/aord.html
- Key Startup Metrics, Tom Blomfield (YC Startup Library): https://www.ycombinator.com/library/KR-key-startup-metrics
- 16 Startup Metrics (a16z): https://a16z.com/16-startup-metrics/
- The New Business of AI (a16z): https://a16z.com/the-new-business-of-ai-and-how-its-different-from-traditional-software/
