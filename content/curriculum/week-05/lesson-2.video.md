# Video: Data and evaluation
Duration: ~3:30 · Format: 16:9 1920×1080 · Presenter: Maya Ortiz — calm, mid-30s Latin American founder-turned-investor, navy blazer, neutral studio

## Scene 1 — Hook (0:00–0:25)
- Type: presenter
- On screen: Maya centered. Lower third: "Week 5 · Data and evaluation". Kinetic text fades in beside her in Navy: "Fluent. Confident. Wrong."
- Narration EN: Normal software breaks loudly. It crashes, it throws an error, you see it. AI software fails quietly. It gives you a fluent, confident answer that happens to be wrong. You won't catch that by clicking through a demo. You catch it with evals. Today you'll learn to build them, no machine learning degree required.
- Narración ES: El software normal falla de forma evidente. Se cae, lanza un error, lo ves. El software de IA falla en silencio. Te da una respuesta fluida y segura que resulta estar mal. Eso no lo vas a detectar probando una demo. Lo detectas con evaluaciones. Hoy vas a aprender a construirlas, sin necesidad de un título en machine learning.

## Scene 2 — What an eval set is (0:25–0:55)
- Type: motion
- On screen: A clean spreadsheet grid builds row by row on White Smoke. Column headers in Space Grotesk, Navy: "Input", "Pass criteria", "Grading", "Tags". Three example rows type in. Then the grid zooms out to show many rows, with a counter ticking to "50" in Steel.
- Narration EN: An eval set is a fixed list of test cases. Each case has four parts. The input, exactly as a real user sent it. The expected answer, or a short checklist of what a good answer must include. The grading method. And tags, like task type and risk level, so you can see where failures cluster. Start with about fifty real cases. Not cases you invented, because you'll only write questions your system already handles.
- Narración ES: Un set de evaluación es una lista fija de casos de prueba. Cada caso tiene cuatro partes. La entrada, tal como la envió un usuario real. La respuesta esperada, o una lista corta de lo que debe incluir una buena respuesta. El método de calificación. Y etiquetas, como tipo de tarea y nivel de riesgo, para ver dónde se concentran las fallas. Empieza con unos cincuenta casos reales. No casos que inventaste, porque solo vas a escribir preguntas que tu sistema ya resuelve.

## Scene 3 — Three ways to grade (0:55–1:35)
- Type: motion
- On screen: Three cards slide up side by side. Card 1 "Code checks" in Mist with icons for a checkmark and brackets. Card 2 "Expert review" in Steel with a simple person silhouette. Card 3 "Model judge" in Navy with a small balance scale. Under card 3, a connector line links back to card 2 labeled "calibrate".
- Narration EN: There are three ways to grade. Use code for anything objective: valid format, a part number that exists, a cited source. Use a domain expert for judgment calls, with a simple pass or fail and a one-line reason. And you can use a strong model as a judge to scale up. But a judge is also AI, and it can be wrong. So calibrate it: compare its grades to your expert's on the same sample, and trust it only once they agree.
- Narración ES: Hay tres formas de calificar. Usa código para todo lo objetivo: formato válido, un número de repuesto que exista, una fuente citada. Usa a una persona experta para lo que requiere criterio, con un simple aprobado o reprobado y una línea de justificación. Y puedes usar un modelo fuerte como juez para escalar. Pero un juez también es IA, y puede equivocarse. Así que calíbralo: compara sus calificaciones con las de tu experto sobre la misma muestra, y confía en él solo cuando coincidan.

## Scene 4 — Read the failures (1:35–1:55)
- Type: split
- On screen: Left, Maya. Right, a horizontal bar chart animates in with four failure categories in Steel: "Wrong passage retrieved", "Passage ignored", "Misheard input", "Out of scope". The longest bar, "Wrong passage retrieved", turns Navy and gets the label "fix this first".
- Narration EN: Before you chase one accuracy number, read the failures and sort them into groups. Did retrieval bring the wrong passage? Did the model ignore the right one? Was the voice note misheard? The biggest group tells you what to fix next. And in a retrieval system, it's often not the model at all.
- Narración ES: Antes de perseguir un único número de precisión, lee las fallas y agrúpalas. ¿La recuperación trajo el fragmento equivocado? ¿El modelo ignoró el correcto? ¿La nota de voz se transcribió mal? El grupo más grande te dice qué arreglar primero. Y en un sistema de recuperación, muchas veces el problema no es el modelo.

## Scene 5 — Human in the loop and the flywheel (1:55–2:25)
- Type: motion
- On screen: A circular loop draws clockwise in Steel with four nodes: "Usage", "Uncertain answers to reviewer", "Corrections logged", "Better evals, retrieval, prompts". An arrow returns to "Usage" and the loop slowly rotates. A small lock icon sits beside the loop with the caption "only with data rights".
- Narration EN: Early on, put a person in the loop for the answers that matter. Route uncertain or high-risk answers to a reviewer before the user sees them. Then log every correction. Those corrections become new eval cases, better retrieval rules and, later, training data. That's the data flywheel. Just make sure your contracts let you use that data.
- Narración ES: Al principio, pon a una persona en el ciclo para las respuestas que importan. Envía las respuestas dudosas o de alto riesgo a un revisor antes de que el usuario las vea. Luego registra cada corrección. Esas correcciones se convierten en nuevos casos de evaluación, mejores reglas de recuperación y, más adelante, datos de entrenamiento. Ese es el ciclo virtuoso de datos. Solo asegúrate de que tus contratos te permitan usar esos datos.

## Scene 6 — Fieldnote's first eval run (2:25–2:45)
- Type: broll
- On screen: Lower third: "Case: Fieldnote · 120 real questions (founders' data)". Caption chip appears: "Top failure: scanned manuals".
- Image prompt (if broll): Photorealistic documentary shot of two founders at a small office table in the evening, a woman in her thirties with a practical work jacket pointing at a printed HVAC wiring diagram while a young man types on a laptop, warm desk lamp and city window light, coffee cups, focused collaborative mood, no logos or text in image.
- Narration EN: Fieldnote built its first eval set from 120 real technician questions. Ana wrote the pass criteria. The first run showed the biggest failure wasn't reasoning. Old scanned manuals had been indexed badly, so the model never saw the right page. They fixed the extraction before touching a single prompt.
- Narración ES: Fieldnote armó su primer set de evaluación con 120 preguntas reales de técnicos. Ana escribió los criterios de aprobación. La primera corrida mostró que la falla principal no era el razonamiento. Los manuales escaneados antiguos estaban mal indexados, así que el modelo nunca veía la página correcta. Arreglaron la extracción antes de tocar un solo prompt.

## Scene 7 — Monitoring in production (2:45–3:15)
- Type: motion
- On screen: A single request travels left to right across a timeline in Steel, dropping labeled markers in Navy as it passes: "input", "retrieved context", "model + prompt version", "output", "latency", "cost", "user reaction". Below, a small chart compares "v12" and "v13" eval scores side by side, with one category dipping in v13 and a stop sign icon labeled "don't ship".
- Narration EN: Evals cover the cases you know about. Monitoring covers the ones you don't. For every request, log the input, the retrieved context, the model and prompt version, the output, latency and cost. Watch the quiet signals: users editing answers, asking the same question twice, or escalating to a person. And before any prompt or model change ships, rerun the full eval set. If a fix in one category breaks another, it waits.
- Narración ES: Las evaluaciones cubren los casos que conoces. El monitoreo cubre los que no. En cada solicitud, registra la entrada, el contexto recuperado, la versión del modelo y del prompt, la salida, la latencia y el costo. Vigila las señales silenciosas: usuarios que editan respuestas, repiten la misma pregunta o escalan a una persona. Y antes de lanzar cualquier cambio de prompt o de modelo, vuelve a correr el set completo. Si un arreglo en una categoría rompe otra, espera.

## Scene 8 — Recap and exercise cue (3:15–3:35)
- Type: presenter
- On screen: Maya centered. Kinetic text in Navy, line by line: "Real cases. Clear criteria. Read the failures." Then a card: "This week: eval set of at least 50 cases".
- Narration EN: Real cases, clear criteria, and read the failures before you fix anything. Your exercise this week: build an eval set of at least fifty real cases, each with criteria, a grading method and tags.
- Narración ES: Casos reales, criterios claros, y lee las fallas antes de arreglar nada. Tu ejercicio de esta semana: construye un set de evaluación de al menos cincuenta casos reales, cada uno con criterios, método de calificación y etiquetas.
