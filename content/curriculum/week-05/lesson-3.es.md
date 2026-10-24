## Objetivos de aprendizaje

- Aplicar el "haz cosas que no escalan" de Paul Graham a los primeros usuarios de un producto de IA.
- Montar un ritmo semanal de lanzamientos con un filtro de evaluación, para que la velocidad no cueste confiabilidad.
- Crear ciclos de feedback que conviertan el comportamiento de los usuarios en las prioridades de la próxima semana.
- Distinguir la deuda técnica que vale la pena asumir de la que nunca debes asumir.

## Resumen

En esta etapa, tu mayor riesgo no es que el código esté desordenado. Es construir durante meses y aprender demasiado poco. Las startups que ganan al principio suelen aprender más rápido que su competencia, y el aprendizaje viene de poner algo real frente a los usuarios y observar qué pasa. Los productos de IA lo hacen más fácil y más difícil a la vez: puedes lanzar un prototipo funcional en días, pero su comportamiento es impredecible hasta que personas reales lo usan en tareas reales. Esta lección trata de crear en el equipo el hábito de lanzar en pequeño, seguido y con seguridad, mientras haces el trabajo manual que te enseña qué automatizar después.

## Haz cosas que no escalan

El ensayo de 2013 de Paul Graham "Do Things That Don't Scale" sigue siendo uno de los consejos más útiles para startups. Su idea central es que el trabajo que despega a una startup parece ineficiente, y por eso mismo los fundadores lo evitan.

### Consigue usuarios a mano

Graham cuenta cómo los hermanos Collison, en Stripe, no esperaban a que la gente se registrara: pedían la laptop y dejaban configurado al usuario en ese mismo momento. Tus primeros usuarios rara vez llegan por un anuncio de lanzamiento. Llegan porque tú los llamas, los visitas y los incorporas uno por uno.

### Da un nivel de atención desproporcionado

Los primeros usuarios deben sentir que a los fundadores les importa su problema más que a cualquier proveedor que hayan tenido. Responde cada mensaje en persona. Obsérvalos usar el producto. Resuelve su problema el mismo día cuando puedas. Así te ganas la paciencia que necesita una primera versión imperfecta.

### Haz tú el trabajo detrás del producto

En productos de IA, hacer cosas que no escalan suele significar que hay personas haciendo parte del trabajo detrás de la interfaz. Carga tú los documentos de cada cliente en el sistema. Revisa a mano las respuestas dudosas, como diseñaste en la Lección 2. Escribe los primeros reportes de los usuarios a partir del borrador del modelo. Cada paso manual te enseña cómo se ve un buen resultado antes de automatizarlo, y te permite entregar un producto mejor que tu modelo por sí solo.

### Sabe cuándo parar

El trabajo manual es una herramienta de aprendizaje, no un modelo de negocio. Mide cuántas horas te cuesta cada cliente y automatiza un paso cuando ya lo entiendes y te está quitando tiempo que necesitas en otra parte.

## Un ritmo semanal de lanzamientos

Y Combinator lleva años pidiendo a los fundadores que lancen temprano y sigan lanzando. La charla de Kat Manalac, socia de YC, "How to launch (again and again)" trata el lanzamiento como algo que se repite, no como un evento único. Dentro del producto, esa misma idea se convierte en un ritmo fijo de lanzamientos semanales.

### Lanza cada semana

Elige un día de lanzamiento y respétalo. Un ritmo semanal te obliga a dividir el trabajo en piezas lo bastante pequeñas para terminarlas, y les da a los usuarios una prueba visible de que los escuchas. Lanza primero a un grupo pequeño y luego a todos, con feature flags si los tienes o con una lista simple de cuentas piloto si no.

### Filtra cada lanzamiento con tus evaluaciones

En productos de IA, la velocidad solo es segura si sabes qué hizo cada cambio. Antes de lanzar cualquier cambio de prompt, modelo o recuperación, corre el set de evaluación y compara con la semana anterior. Si una categoría empeoró, arréglala o detén el cambio. Así, el set de evaluación de la Lección 2 se vuelve el freno que te permite ir rápido.

### Cuéntales a los usuarios qué cambió

Envía notas breves de lanzamiento a los usuarios piloto: qué arreglaste, quién lo pidió, qué probar. Nombrar a la persona que reportó un problema es una de las formas más fuertes de mostrar que el feedback importa, y atrae más feedback.

## Ciclos de feedback que de verdad enseñan

Lanzar cada semana solo vale si cada lanzamiento cambia lo que aprendes. Crea ciclos que traigan evidencia de vuelta.

### Observa a la gente usarlo

Las entrevistas te dicen lo que la gente piensa; la observación te dice lo que hace. Siéntate con los usuarios en su trabajo, comparte pantalla o acompáñalos a un servicio. Verás atajos improvisados, confusión y momentos de satisfacción que nunca aparecen en una encuesta.

### Lee los registros cada semana

Revisa en equipo, cada semana, una muestra de solicitudes y respuestas reales. Busca preguntas repetidas, respuestas editadas, escalamientos y sesiones abandonadas. Cada patrón es un error, una función que falta o un nuevo caso de evaluación.

### Haz una sola reunión de priorización

Una vez por semana, pon todo en un solo tablero: errores, fallas de evaluación, pedidos de usuarios y observaciones. Ordénalos según cuántos usuarios afectan y qué tan cerca están del trabajo central. Elige qué sale la próxima semana. Luego cierra el ciclo con quienes lo pidieron.

## Deuda técnica que vale la pena asumir

La deuda técnica es un atajo que pagarás después. Para una startup temprana, algunas deudas son un préstamo inteligente: compran aprendizaje ahora, y si la idea falla nunca las pagas. Otras pueden hundir a la empresa.

### Deuda que vale la pena

- Operaciones manuales: incorporación de clientes, carga de datos y revisiones hechas por los fundadores.
- Configuraciones fijas en el código para tus primeros clientes en lugar de una interfaz de administración completa.
- Una capa delgada sobre un solo proveedor de modelos, siempre que cambiarlo siga siendo posible.
- Infraestructura simple que todavía no escala a miles de usuarios.
- Funciones que ningún usuario temprano ha pedido.

### Deuda que nunca debes asumir

- Seguridad débil, credenciales compartidas o datos de clientes que no están separados por cuenta.
- Usar datos de clientes de formas que tus acuerdos no permiten.
- No tener set de evaluación ni pruebas de regresión, lo que convierte cada cambio en una apuesta.
- No tener registros, de modo que no puedes investigar una mala respuesta.
- No tener copias de seguridad de los datos que los clientes te confían.

### Lleva un registro de deuda

Anota cada atajo deliberado con su motivo y el disparador para pagarlo, por ejemplo "construir una página de administración al llegar a diez clientes". Una deuda que elegiste y anotaste es una decisión; una deuda que nadie recuerda es un riesgo.

## Caso: Fieldnote

Al pasar del concierge por WhatsApp a su primera versión piloto, Ana y Tomás decidieron hacer varias cosas que no escalan. Ana pasó días completos acompañando a técnicos de su primer contratista piloto, observándolos usar el asistente de voz en áticos y techos. Aprendió que los ambientes ruidosos causaban más errores al transcribir números de modelo de lo esperado, así que el equipo agregó un paso que le repite al técnico el equipo identificado antes de responder.

Tomás cargó a mano la lista de equipos y los manuales de cada contratista en lugar de construir una carga autoservicio, y revisó personalmente cada respuesta de baja confianza en la cola. Fijaron el jueves como día de lanzamiento. Cada jueves en la mañana corre el set de 120 casos; si baja alguna categoría etiquetada como de riesgo, el lanzamiento espera. Los usuarios piloto reciben una nota de voz breve de Ana que explica qué cambió.

Su registro de deuda incluye la incorporación manual, un catálogo de repuestos fijo en el código para dos marcas y la falta de un panel de administración, cada uno con su disparador de pago. También lista lo que se negaron a recortar: los datos de cada contratista se mantienen separados, los registros capturan cada solicitud y la prueba de regresión nunca se salta. Todas estas decisiones y observaciones son de los propios fundadores.

## Errores comunes

- Esperar un lanzamiento pulido en lugar de poner hoy una versión imperfecta frente a unos pocos usuarios reales.
- Automatizar un proceso antes de hacerlo a mano las veces suficientes para entenderlo.
- Lanzar rápido sin filtro de evaluación y perder la confianza de los usuarios por una regresión silenciosa.
- Recoger feedback y nunca contarles a los usuarios qué hiciste con él.
- Tratar la seguridad y la separación de datos como deuda para pagar después.

## Tu turno

Dedica 20 minutos. Elige un día de lanzamiento y anótalo. Haz una lista de tres cosas que harás a mano por tus usuarios en las próximas dos semanas y qué te enseñará cada una. Luego empieza un registro de deuda con al menos tres atajos que estás tomando, cada uno con su motivo y su disparador de pago, y dos límites que no vas a cruzar.

## Ideas clave

- Haz cosas que no escalan: consigue usuarios a mano, atiende de más a los primeros y haz tú el trabajo detrás del producto.
- Lanza cada semana, filtra cada lanzamiento con tu set de evaluación y cuéntales a los usuarios qué cambió.
- La observación, la revisión semanal de registros y una sola reunión de priorización convierten el uso en prioridades.
- Asume deuda que compre aprendizaje; nunca en seguridad, derechos de datos, evaluaciones ni registros.

## Recursos

- Do Things That Don't Scale (Paul Graham): https://paulgraham.com/ds.html
- How to launch (again and again), Kat Manalac (YC Startup Library): https://www.ycombinator.com/library/6i-how-to-launch-again-and-again
- How to plan an MVP, Michael Seibel (YC Startup Library): https://www.ycombinator.com/library/6f-how-to-plan-an-mvp
- YC's essential startup advice (YC Startup Library): https://www.ycombinator.com/library/4D-yc-s-essential-startup-advice
- A Field Guide to Rapidly Improving AI Products (Hamel Husain): https://hamel.dev/blog/posts/field-guide/
