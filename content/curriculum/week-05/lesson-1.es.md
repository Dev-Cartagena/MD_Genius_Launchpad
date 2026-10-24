## Objetivos de aprendizaje

- Describir las cuatro capas de un producto de IA moderno y de qué se encarga cada una.
- Elegir entre prompting, recuperación (RAG), fine-tuning y agentes según el problema.
- Razonar sobre el equilibrio entre costo, latencia y calidad con palancas reales, no con suposiciones.
- Escribir una arquitectura de una página que un asesor técnico pueda criticar en diez minutos.

## Resumen

A 2026, cualquier startup puede acceder por API a un modelo fundacional capaz en una tarde. Ya no necesitas un equipo de investigación para lanzar algo impresionante, pero tu competencia tampoco. Lo que separa un producto de una demo es el sistema que rodea al modelo: los datos que le das, el flujo de trabajo en el que encaja, cómo sabes cuándo se equivoca y cuánto te cuesta cada respuesta. Esta lección te da un mapa simple de ese sistema y una forma disciplinada de tomar las grandes decisiones iniciales sin construir de más.

## Las cuatro capas de un producto de IA

Piensa en un producto de IA como cuatro capas apiladas, cada una con sus propios modos de falla y su propio tipo de ventaja competitiva.

### Capa del modelo

Es el modelo fundacional: un modelo de lenguaje, un modelo de voz a texto, uno de visión o varios a la vez. Para casi todas las startups en etapa temprana, esta capa se compra, no se construye. Tu trabajo es elegir, no entrenar. Espera cambiar de modelo varias veces al año a medida que aparecen opciones mejores y más baratas, y diseña para que el cambio sea un ajuste de configuración y no una reescritura.

### Capa de contexto

Es todo lo que el modelo necesita saber y que no aprendió en su entrenamiento: los documentos de tu cliente, catálogos de productos, tickets anteriores, el historial del usuario. La mayor parte del valor de la IA vertical vive aquí, porque es donde entran al sistema los datos propios y difíciles de conseguir. Aquí viven los pipelines de recuperación, los índices de búsqueda y la lógica que decide qué entra en el prompt.

### Capa de orquestación

Es el código que convierte una llamada al modelo en un comportamiento confiable: plantillas de prompt, llamadas a herramientas, enrutamiento entre modelos, reintentos, controles de seguridad y los pasos de un flujo o agente. Es ingeniería de software común y corriente, y es donde se esconden la mayoría de los errores.

### Capa de producto y flujo de trabajo

Es la interfaz y el trabajo en el que encaja: la pantalla, el flujo de voz, el paso de aprobación, la integración con el sistema principal del cliente. Los fundadores invierten poco aquí, y sin embargo es donde los usuarios deciden si el producto les ahorra tiempo. Un modelo mediocre dentro de un flujo bien diseñado suele ganarle a un modelo mejor dentro de uno torpe.

## Construir o comprar, y la escalera de técnicas

El error de arquitectura más común es empezar por la técnica más sofisticada. Un mejor hábito es subir una escalera y pasar al siguiente peldaño solo cuando tienes evidencia de que el anterior no alcanza.

### Peldaño 1: prompting sobre un modelo fuerte

Empieza con un modelo general fuerte, un prompt claro, algunos ejemplos y salida estructurada. Mídelo. Esto suele llegar más lejos de lo esperado y fija la línea base que toda inversión posterior debe superar.

### Peldaño 2: generación aumentada por recuperación (RAG)

Cuando el modelo necesita datos que no tiene, como el manual de un fabricante específico o las políticas de un cliente, recupera los fragmentos relevantes en el momento de la pregunta y ponlos en el prompt. RAG mantiene el conocimiento actualizado sin reentrenar y te permite citar fuentes. Su calidad depende sobre todo de la recuperación: cómo divides los documentos en fragmentos, cómo los buscas (por palabras clave, por embeddings vectoriales o ambos) y si reordenas los resultados. Cuando un sistema RAG responde mal, revisa primero si recuperó el fragmento correcto.

### Peldaño 3: fine-tuning

El fine-tuning ajusta los pesos de un modelo con tus propios ejemplos. Sirve para enseñar forma y comportamiento: un formato de salida consistente, un estilo propio, una clasificación acotada, o lograr que un modelo más pequeño y barato iguale a uno grande en una sola tarea. Es malo para enseñar datos que cambian, algo que RAG resuelve mejor. Haz fine-tuning cuando tengas una tarea estable, entre unos cientos y unos miles de buenos ejemplos y un set de evaluación que demuestre que el modelo ajustado es mejor.

### Peldaño 4: agentes

La guía de ingeniería de Anthropic "Building effective agents" traza una línea útil entre flujos de trabajo, donde tu código define los pasos y el modelo los completa, y agentes, donde el modelo decide qué herramientas usar y en qué orden. Los agentes son potentes para tareas abiertas, pero cada paso autónomo adicional multiplica el costo, la latencia y la probabilidad de que un error se acumule. La guía recomienda empezar con el patrón más simple que funcione y agregar autonomía solo cuando mejore claramente los resultados. Para la mayoría de los primeros productos, un flujo fijo con una o dos llamadas a herramientas es la respuesta correcta.

### Qué construir tú

Compra el modelo, la base de datos vectorial, el reconocimiento de voz y las herramientas de observabilidad, salvo que alguno sea tu diferenciación central. Construye el pipeline de contexto de tu dominio, el flujo de trabajo y tu set de evaluación. Esas son las partes que tu competencia no puede alquilar.

## El equilibrio entre costo, latencia y calidad

Toda función de IA se ubica en un triángulo de costo, latencia y calidad. Rara vez consigues los tres, así que decide qué importa más al usuario en cada paso.

### Conoce tus números por tarea

Estima, para una tarea típica de usuario: cuántas llamadas al modelo requiere, cuántos tokens de entrada y salida usa cada una, qué modelo la atiende y el precio publicado por el proveedor. Multiplica por las tareas esperadas por usuario al mes. Hazlo en una hoja de cálculo antes de escalar y actualízala cuando cambien los precios, porque a 2026 los precios de los modelos siguen cambiando seguido. Volverás a usar este número en la Semana 6, cuando calculemos el margen bruto de IA.

### Palancas que de verdad mueven el triángulo

- Enruta por dificultad: las solicitudes fáciles van a un modelo pequeño y rápido, y las difíciles a uno grande.
- Recupera menos pero mejor: un contexto ajustado de cinco fragmentos relevantes es más barato y a menudo más preciso que cincuenta sueltos.
- Guarda en caché lo que se repite: prompts de sistema, documentos comunes y respuestas frecuentes.
- Transmite las respuestas en streaming para que el usuario vea avance, algo que pesa más en la velocidad percibida que el tiempo total.
- Define un umbral de confianza y envía los casos dudosos a una persona en lugar de a un modelo más grande.

### Cómo escribir el one-pager de arquitectura

Resume tus decisiones en una página: la tarea del usuario, las cuatro capas con la herramienta o el modelo específico en cada una, las fuentes de datos, el recorrido de una solicitud desde la entrada hasta la respuesta, el costo y la latencia estimados por tarea, los principales modos de falla y qué revisa una persona. Mantenlo tan corto que un asesor encuentre el punto débil rápido.

## Caso: Fieldnote

Al cierre de la Semana 4, el MVP concierge de Fieldnote era Tomás respondiendo a mano los mensajes de WhatsApp de los técnicos con una carpeta de manuales de fabricantes. Eso les dio a los fundadores algo que ninguna API ofrece: preguntas reales y las respuestas que de verdad ayudaron. Ana notó que la mayoría eran variantes de "qué significa este código de error en este equipo" y "qué repuesto necesito".

Subiendo la escalera, Tomás primero probó un modelo general sin documentos. Sonaba seguro y se equivocaba seguido con los códigos de error de cada modelo, lo que en HVAC puede significar una visita perdida. Por eso los fundadores eligieron RAG sobre manuales de fabricantes como núcleo de la capa de contexto, indexados por marca, serie y sección del documento, con búsqueda por palabras clave y vectorial, porque los técnicos suelen escribir códigos exactos. Decidieron no hacer fine-tuning todavía ni construir un agente: el proceso es un flujo fijo que transcribe la nota de voz, identifica el equipo, recupera, responde con citas y registra el reporte.

En la capa de producto mantuvieron la voz como canal principal, porque los técnicos tienen las manos ocupadas y usan guantes. Compraron el reconocimiento de voz en lugar de construirlo. Su one-pager estima el costo por pregunta de diagnóstico a partir del conteo de tokens y los precios de lista vigentes, y fija una regla: cuando la respuesta del modelo tiene baja confianza o la recuperación no encuentra un manual que coincida, la pregunta pasa a un revisor humano, al principio Tomás, antes de llegar al técnico. Todas estas cifras son estimaciones iniciales de los propios fundadores.

## Errores comunes

- Empezar con fine-tuning o con un sistema multiagente antes de medir una línea base con prompting.
- Culpar al modelo cuando el problema real es que la recuperación devolvió los fragmentos equivocados.
- Ignorar el costo por tarea hasta que llega el primer cliente grande y los márgenes resultan negativos.
- Poner todo el esfuerzo en el modelo y nada en el flujo que el usuario realmente toca.

## Tu turno

Dedica 20 minutos. Escribe la tarea más importante que resuelve tu producto. Dibuja las cuatro capas para esa tarea: el modelo, las fuentes de datos, los pasos de orquestación y la pantalla o el canal. Luego marca en qué peldaño de la escalera estás hoy y qué evidencia justificaría subir uno. Termina con una estimación aproximada del costo por tarea, aunque sea un rango.

## Ideas clave

- Un producto de IA es un sistema de modelo, contexto, orquestación y flujo de trabajo; tu ventaja está sobre todo en el contexto y el flujo.
- Sube la escalera: prompting, luego RAG, luego fine-tuning, luego agentes, cada paso justificado con resultados medidos.
- Compra los componentes genéricos y construye lo que es propio de tu dominio.
- Conoce pronto tu costo y latencia por tarea, y contrólalos con enrutamiento, caché y respaldo humano.

## Recursos

- Building effective agents (Anthropic): https://www.anthropic.com/engineering/building-effective-agents
- Patterns for Building LLM-based Systems and Products (Eugene Yan): https://eugeneyan.com/writing/llm-patterns/
- What We Learned From a Year of Building with LLMs: https://applied-llms.org/
- Building LLM applications for production (Chip Huyen): https://huyenchip.com/2023/04/11/llm-engineering.html
- Optimizing LLM accuracy (OpenAI): https://platform.openai.com/docs/guides/optimizing-llm-accuracy
