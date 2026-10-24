## Objetivos de aprendizaje

- Construir un set de evaluación con datos reales de usuarios y criterios claros de aprobación para cada caso.
- Elegir el método de calificación adecuado: verificaciones por código, revisión experta o un modelo juez calibrado.
- Diseñar un paso con revisión humana que proteja al usuario y alimente un ciclo virtuoso de datos.
- Montar el monitoreo mínimo en producción que necesita un producto de IA temprano.

## Resumen

El software tradicional funciona o lanza un error. El software de IA falla en silencio: devuelve una respuesta fluida y segura que está mal. Eso no se detecta probando una demo, y no puedes mejorar lo que no mides. Practicantes como Hamel Husain, en su ensayo "Your AI Product Needs Evals", sostienen que los equipos que crean temprano un hábito disciplinado de evaluación mejoran mucho más rápido que los que ajustan prompts a ojo. Las evaluaciones, o evals, también son la forma de convencer a un cliente cauteloso, y luego a un inversionista, de que tu producto es confiable. Esta lección te muestra cómo construirlas desde cero sin formación en machine learning.

## Datos de referencia: cómo construir tu set de evaluación

Un set de evaluación es una colección fija de casos de prueba, cada uno con una entrada y una forma de decidir si la salida aprobó. Es lo más parecido que tiene un producto de IA a una suite de pruebas unitarias.

### De dónde salen los casos

Los mejores casos son entradas reales de usuarios reales: mensajes de tu MVP concierge, tickets de soporte, llamadas grabadas, documentos que te enviaron los clientes. Agrega a propósito tres tipos más:

- Casos límite: entradas inusuales pero legítimas, como equipos poco comunes o frases ambiguas.
- Negativos difíciles: preguntas que tu producto debería rechazar o escalar, como cualquier cosa fuera de su alcance.
- Casos de alto riesgo: entradas donde un error causa daño real, que debes ponderar más.

Evita inventar tú todos los casos. Los fundadores escriben sin darse cuenta preguntas que su sistema ya resuelve.

### La anatomía de un caso

Dale a cada caso los mismos campos:

1. Entrada: exactamente lo que envía el usuario, incluidas las partes desordenadas.
2. Respuesta esperada o criterios de aprobación: una respuesta de referencia cuando exista, o una lista corta como "identifica la falla correcta, cita el manual, incluye la advertencia de seguridad".
3. Método de calificación: cómo se puntúa este caso (ver abajo).
4. Etiquetas: segmento, tipo de tarea, dificultad y nivel de riesgo, para ver dónde se concentran las fallas.

Una hoja de cálculo basta para empezar. Cincuenta casos bien elegidos te enseñan más que quinientos descuidados. Haz crecer el set cada semana con fallas reales.

### Quién decide qué es correcto

Los datos de referencia necesitan a una persona experta en el dominio, no solo a un ingeniero. Si tus usuarios son enfermeras, contadores o técnicos, alguien con esa experiencia debe escribir o aprobar las respuestas esperadas. Cuando los expertos no coincidan, anota la regla que elegiste. Esas decisiones se convierten en el estándar de calidad de tu producto.

## Calificación: cómo puntuar las salidas

Cada criterio pide un tipo de verificación distinto. Usa el método más barato que sea confiable para cada uno.

### Verificaciones por código

Todo lo objetivo debe verificarlo el código: que la salida sea JSON válido, que el número de repuesto exista en el catálogo, que la respuesta cite al menos una fuente, que no supere un largo máximo. Estas verificaciones son rápidas, gratis y no cambian con el tiempo.

### Revisión humana experta

Para lo que requiere criterio, como si un diagnóstico es correcto o una respuesta está completa, una persona experta califica aprobado o reprobado según los criterios. Un aprobado o reprobado con una línea de justificación es más consistente que una escala del 1 al 10. La revisión humana es lenta, así que resérvala para los casos que la necesitan y para calibrar el siguiente método.

### Modelo como juez

Puedes pedirle a un modelo fuerte que califique las salidas según tus criterios. Escala bien, pero un juez también es un sistema de IA que puede equivocarse. La guía de Hamel Husain sobre LLM como juez recomienda calibrarlo: tu experto califica una muestra, el juez califica la misma muestra, y solo confías en el juez cuando coincide con el experto en un nivel que aceptas. Vuelve a medir la coincidencia cada vez que cambies el prompt o el modelo del juez.

### Primero, el análisis de errores

Antes de perseguir un único número de precisión, lee las fallas. Agrúpalas en categorías: la recuperación trajo el fragmento equivocado, el modelo ignoró el fragmento, la entrada se transcribió mal, la pregunta estaba fuera de alcance. En sistemas RAG, mide la recuperación por separado: revisa si la fuente correcta apareció entre los primeros resultados. La categoría de falla más grande te dice qué arreglar primero, y muchas veces no es el modelo.

## Revisión humana y el ciclo virtuoso de datos

Al principio, la forma más segura de lanzar un modelo imperfecto es poner a una persona en el ciclo para los casos que importan.

### Enrutamiento por confianza

Decide qué salidas llegan directo al usuario y cuáles pasan antes por un revisor. Las señales incluyen la confianza que declara el propio modelo, si la recuperación encontró una coincidencia fuerte, la etiqueta de riesgo de la solicitud y reglas simples como "todo lo que involucre seguridad eléctrica". Empieza estricto y relaja el umbral a medida que mejoren tus resultados de evaluación.

### Convertir las revisiones en un ciclo virtuoso

Cada corrección humana es un dato valioso. Registra la entrada original, la respuesta del modelo, la respuesta corregida y el motivo. Agrega las más interesantes a tu set de evaluación. Con el tiempo, esas correcciones se vuelven datos de entrenamiento para fine-tuning, mejores reglas de recuperación y prompts más precisos. Este ciclo, donde más uso produce más datos corregidos y estos producen un mejor producto, es el data flywheel del que se habla cuando se mencionan las ventajas defendibles en IA. Solo funciona si tus contratos y términos de privacidad te permiten usar esos datos, así que revisa el trabajo sobre derechos de datos de la Semana 2.

## Monitoreo en producción

Las evaluaciones te dicen cómo rinde el sistema en casos conocidos. El monitoreo te dice qué pasa con los desconocidos.

### Qué registrar

En cada solicitud, registra la entrada, el contexto recuperado, la versión del modelo y del prompt, la salida, la latencia, el costo y cualquier reacción del usuario. Enmascara o excluye los datos personales que no necesitas.

### Señales que vale la pena vigilar

- Feedback explícito, como pulgar arriba o abajo.
- Feedback implícito: usuarios que editan una respuesta, repiten la misma pregunta o escalan a una persona.
- Tasa de escalamiento y tasa de correcciones del revisor.
- Costo y latencia por tarea, comparados con las estimaciones de tu one-pager de arquitectura.

### Pruebas de regresión

Los proveedores actualizan sus modelos y tú vas a cambiar prompts cada semana. Corre el set de evaluación completo antes de lanzar cada cambio y compara con la versión anterior. Un prompt que arregla una categoría y rompe otra no debe llegar a los usuarios.

## Caso: Fieldnote

Las semanas de concierge de Fieldnote dejaron un registro de preguntas reales de técnicos. Ana y Tomás eligieron 120 preguntas reales de diagnóstico para formar su primer set de evaluación, todas datos propios de los fundadores. Ana, con su experiencia en operaciones de HVAC, escribió los criterios de aprobación de cada una: la falla probable correcta, la referencia correcta del manual, el repuesto correcto cuando aplica y cualquier advertencia de seguridad necesaria. Etiquetaron cada caso por marca, tipo de equipo, tarea (código de error, diagnóstico por síntoma, búsqueda de repuesto) y riesgo.

La primera corrida los sorprendió. El análisis de errores mostró que la categoría de falla más grande era la recuperación, no el razonamiento: los equipos antiguos tenían manuales en PDF escaneados mal indexados, así que el modelo nunca veía la página correcta. Tomás arregló la extracción de texto de los manuales escaneados antes de tocar el prompt. Los códigos de error exactos se calificaron por código, los números de repuesto se verificaron contra el catálogo y Ana calificó los diagnósticos. Probaron un modelo juez para evaluar si las respuestas estaban completas, pero solo lo usaron después de que coincidiera con las calificaciones de Ana en una muestra que ella ya había revisado.

En la versión para pilotos, toda respuesta con recuperación débil, baja confianza declarada o etiqueta de seguridad pasa a una cola de revisión humana antes de llegar al técnico. Cada corrección queda registrada y las mejores se convierten en nuevos casos de evaluación. Los fundadores acordaron por escrito con sus clientes piloto cómo se pueden usar los datos de las preguntas.

## Errores comunes

- Juzgar la calidad probando unos cuantos ejemplos en una demo en lugar de correr un set de evaluación fijo.
- Escribir tú todos los casos de prueba, de modo que el set solo contiene preguntas que esperas.
- Confiar en un modelo juez que nunca se comparó con un experto.
- Ajustar el prompt sin revisar primero si la recuperación encontró la fuente correcta.
- Lanzar cambios de prompt o de modelo sin una prueba de regresión.

## Tu turno

Dedica 25 minutos. Toma 15 entradas reales de tus usuarios, de tu MVP concierge o de tus entrevistas. Para cada una, escribe la respuesta esperada o los criterios de aprobación, elige un método de calificación y agrega etiquetas. Pásalas por tu prototipo actual o por un modelo sin ajustes, califica los resultados y agrupa las fallas en categorías. Anota cuál es la categoría más grande.

## Ideas clave

- Las evaluaciones son un set fijo de casos reales con criterios claros; empieza con unos 50 y hazlo crecer con las fallas.
- Usa código para lo objetivo, expertos para lo que requiere criterio y un modelo juez solo después de calibrarlo.
- Lee las fallas y arregla primero la categoría más grande; en RAG, mide la recuperación por separado.
- La revisión humana de respuestas dudosas protege al usuario e impulsa el ciclo virtuoso de datos.
- Registra cada solicitud y corre pruebas de regresión antes de cada cambio.

## Recursos

- Your AI Product Needs Evals (Hamel Husain): https://hamel.dev/blog/posts/evals/
- Using LLM-as-a-Judge for evaluation (Hamel Husain): https://hamel.dev/blog/posts/llm-judge/
- A Field Guide to Rapidly Improving AI Products (Hamel Husain): https://hamel.dev/blog/posts/field-guide/
- Define success criteria and build evaluations (Anthropic): https://docs.anthropic.com/en/docs/test-and-evaluate/develop-tests
- Rules of Machine Learning (Google): https://developers.google.com/machine-learning/guides/rules-of-ml
