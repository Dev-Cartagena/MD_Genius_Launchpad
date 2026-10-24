## Objetivo

Produce dos entregables que conviertan tu MVP en un producto medible: una arquitectura de una página para la tarea central de tu usuario y un set de evaluación de al menos 50 casos reales que te diga si esa arquitectura funciona. Juntos le muestran a un mentor o a un inversionista que sabes cómo se comporta tu producto, cuánto cuesta y dónde falla.

Tiempo estimado: 3 a 4 horas.

## Pasos

1. Nombra en una oración la tarea de usuario que más importa, por ejemplo "un técnico obtiene un diagnóstico correcto para un código de error en menos de un minuto".
2. Dibuja las cuatro capas para esa tarea: modelo (cuál, comprado o de pesos abiertos), contexto (fuentes de datos y cómo se recuperan), orquestación (los pasos fijos o llamadas a herramientas) y producto (pantalla, flujo de voz, canal).
3. Indica en qué peldaño de la escalera estás (prompting, RAG, fine-tuning, agentes) y qué evidencia justificaría subir uno.
4. Sigue una solicitud real desde la entrada hasta la respuesta, paso a paso.
5. Estima el costo y la latencia por tarea: llamadas al modelo, tokens aproximados de entrada y salida, precios de lista vigentes y número esperado de tareas por usuario al mes. Márcalo como estimación, con la fecha.
6. Enumera los tres principales modos de falla y qué revisa una persona, incluida tu regla de enrutamiento por confianza.
7. Reúne al menos 50 entradas reales de tu MVP concierge, entrevistas, mensajes de soporte o usuarios piloto. Agrega a propósito algunos casos límite, preguntas fuera de alcance y casos de alto riesgo.
8. Para cada caso, completa: entrada, respuesta esperada o criterios de aprobación, método de calificación (verificación por código, revisión experta o modelo juez calibrado) y etiquetas (tipo de tarea, segmento, dificultad, riesgo).
9. Pasa cada caso por tu prototipo actual o por un modelo sin ajustes. Califica los resultados, agrupa las fallas en categorías y registra la tasa de aprobación por etiqueta.
10. Escribe tres líneas al final del one-pager: la categoría de falla más grande, qué vas a cambiar primero y la fecha de tu próxima corrida de evaluación.

## Entregable

- Un one-pager de arquitectura (PDF o documento) que cubra los pasos 1 a 6 y el 10.
- Una hoja de evaluación con al menos 50 casos, los cuatro campos requeridos por caso, las calificaciones de tu primera corrida y un resumen breve de las categorías de falla.

## Cómo se revisará

- La arquitectura nombra una decisión concreta en cada capa y explica cada elección de construir o comprar.
- La técnica elegida se justifica con evidencia, no por sonar más avanzada.
- El costo por tarea se estima con supuestos visibles.
- El set tiene 50 casos o más, en su mayoría de usuarios reales, con criterios de aprobación claros que otra persona podría aplicar.
- Los casos de alto riesgo están etiquetados y existe una regla de revisión humana para ellos.
- La primera corrida está calificada y la siguiente corrección se deriva de la categoría de falla más grande.
