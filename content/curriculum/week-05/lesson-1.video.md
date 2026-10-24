# Video: AI product architecture
Duration: ~3:45 · Format: 16:9 1920×1080 · Presenter: Maya Ortiz — calm, mid-30s Latin American founder-turned-investor, navy blazer, neutral studio

## Scene 1 — Hook (0:00–0:25)
- Type: presenter
- On screen: Maya centered, medium shot. Lower third in Space Grotesk, White Smoke on Navy #082B42: "Week 5 · AI product architecture". A thin Steel #3A607D line draws under the title.
- Narration EN: Anyone can call a powerful AI model in an afternoon. That means your competitors can build the same demo you did, just as fast. So what makes an AI product hard to copy? Not the model. It's the system you build around it. Today we'll map that system and make the big early choices without overbuilding.
- Narración ES: Cualquiera puede usar un modelo de IA potente en una tarde. Eso significa que tu competencia puede construir la misma demo que tú, igual de rápido. Entonces, ¿qué hace que un producto de IA sea difícil de copiar? No es el modelo. Es el sistema que construyes a su alrededor. Hoy vamos a dibujar ese sistema y a tomar las grandes decisiones iniciales sin construir de más.

## Scene 2 — The four layers (0:25–0:55)
- Type: motion
- On screen: Four horizontal bands stack from the bottom up on a White Smoke background, each sliding in with a 0.3 s ease: "Model" (Mist #97B7C1), "Context" (Steel), "Orchestration" (Steel at 80%), "Product and workflow" (Navy). As each is named, a small label appears at right: "rent it", "your data", "your code", "your user's job". A bracket on the right groups Context and Product with the label "where the moat lives".
- Narration EN: Think of an AI product as four layers. At the bottom is the model. You rent it, and you'll swap it several times a year. Above it is context: the documents and data the model never saw in training. Then orchestration: prompts, tool calls, routing and retries. On top is the product and workflow, the screen or voice flow your user actually touches. Most of your moat sits in context and workflow.
- Narración ES: Piensa en un producto de IA como cuatro capas. Abajo está el modelo. Lo alquilas, y lo vas a cambiar varias veces al año. Encima está el contexto: los documentos y datos que el modelo nunca vio en su entrenamiento. Luego la orquestación: prompts, llamadas a herramientas, enrutamiento y reintentos. Arriba está el producto y el flujo de trabajo, la pantalla o el flujo de voz que tu usuario realmente toca. La mayor parte de tu ventaja está en el contexto y en el flujo.

## Scene 3 — The ladder of techniques (0:55–1:35)
- Type: motion
- On screen: A vertical ladder with four rungs draws in Steel lines. Rungs light up one at a time in Navy with labels: "1 Prompting", "2 RAG", "3 Fine-tuning", "4 Agents". Beside each rung, a short caption fades in: "baseline", "facts you don't have", "form and behavior", "open-ended tasks". A small upward arrow between rungs carries the word "evidence".
- Narration EN: Now the most common mistake: reaching for the fanciest technique first. Instead, climb a ladder. Start by prompting a strong model, and measure it. That's your baseline. When the model lacks facts, add retrieval, or RAG: fetch the right passages and put them in the prompt. Fine-tuning comes later. It's good at teaching format and behavior, not facts that change. Agents, where the model chooses its own steps, come last. Move up a rung only when evidence says the one below isn't enough.
- Narración ES: Ahora, el error más común: buscar primero la técnica más sofisticada. En su lugar, sube una escalera. Empieza con prompting sobre un modelo fuerte, y mídelo. Esa es tu línea base. Cuando al modelo le faltan datos, agrega recuperación, o RAG: busca los fragmentos correctos y ponlos en el prompt. El fine-tuning viene después. Sirve para enseñar formato y comportamiento, no datos que cambian. Los agentes, donde el modelo elige sus propios pasos, van al final. Sube un peldaño solo cuando la evidencia diga que el anterior no alcanza.

## Scene 4 — Build versus buy (1:35–2:05)
- Type: motion
- On screen: Two columns slide in on White Smoke. Left column header "Buy" in Steel with chips: "Foundation model", "Vector database", "Speech-to-text", "Observability". Right column header "Build" in Navy with chips: "Domain context pipeline", "Workflow", "Eval set". The Build column gets a thin Navy outline labeled "hard to rent".
- Narration EN: So what should you build yourself? Buy the commodity parts: the model, the vector database, speech recognition, monitoring tools. Unless one of them is your core advantage, building it only slows you down. Build the parts that are specific to your domain: the pipeline that turns your customers' messy documents into good context, the workflow that fits their day, and the eval set that proves it works. Those are the pieces a competitor can't rent.
- Narración ES: Entonces, ¿qué deberías construir tú? Compra las piezas genéricas: el modelo, la base de datos vectorial, el reconocimiento de voz, las herramientas de monitoreo. Salvo que una de ellas sea tu ventaja central, construirla solo te frena. Construye las piezas propias de tu dominio: el pipeline que convierte los documentos desordenados de tus clientes en buen contexto, el flujo que encaja en su día y el set de evaluación que demuestra que funciona. Esas son las piezas que tu competencia no puede alquilar.

## Scene 5 — Cost, latency, quality (2:05–2:35)
- Type: split
- On screen: Left half, Maya. Right half, an equilateral triangle with vertices "Cost", "Latency", "Quality" in Space Grotesk. A dot moves inside the triangle as four lever chips appear below it: "Route by difficulty", "Retrieve less, better", "Cache repeats", "Human fallback". Each chip nudges the dot toward a vertex.
- Narration EN: Every AI feature lives on a triangle of cost, latency and quality. You rarely get all three. So estimate your cost per task early: model calls, tokens, price. Then pull real levers. Route easy requests to a small model. Retrieve five good passages, not fifty. Cache what repeats. And when the model isn't sure, send the case to a person instead of a bigger model.
- Narración ES: Toda función de IA vive en un triángulo de costo, latencia y calidad. Rara vez consigues los tres. Así que estima pronto tu costo por tarea: llamadas al modelo, tokens, precio. Luego usa palancas reales. Envía las solicitudes fáciles a un modelo pequeño. Recupera cinco buenos fragmentos, no cincuenta. Guarda en caché lo que se repite. Y cuando el modelo no esté seguro, pasa el caso a una persona en lugar de a un modelo más grande.

## Scene 6 — Fieldnote in the field (2:35–3:05)
- Type: broll
- On screen: Lower third: "Case: Fieldnote". Subtle caption chips appear over the footage in sequence: "voice note", "identify unit", "retrieve manual", "answer with citation".
- Image prompt (if broll): Photorealistic documentary shot of an HVAC technician kneeling beside an outdoor condenser unit on a residential side yard, late afternoon natural light, work gloves on, speaking into a phone held near the shoulder, tool bag open on the grass, diverse mid-career technician, shallow depth of field, no logos or text in image.
- Narration EN: Here's how Fieldnote applied this. Their concierge MVP was Tomás answering WhatsApp messages by hand from a folder of manuals. A plain model with no documents sounded confident but got model-specific error codes wrong. So they chose RAG over manufacturer manuals, with keyword search for exact codes. No fine-tuning yet, no agent. Just a fixed workflow: transcribe the voice note, identify the unit, retrieve, answer with citations.
- Narración ES: Así lo aplicó Fieldnote. Su MVP concierge era Tomás respondiendo mensajes de WhatsApp a mano con una carpeta de manuales. Un modelo sin documentos sonaba seguro, pero se equivocaba con los códigos de error de cada modelo. Por eso eligieron RAG sobre manuales de fabricantes, con búsqueda por palabras clave para los códigos exactos. Sin fine-tuning todavía, sin agente. Solo un flujo fijo: transcribir la nota de voz, identificar el equipo, recuperar y responder con citas.

## Scene 7 — The human fallback (3:05–3:25)
- Type: broll
- On screen: A simple flow diagram overlays the right third in White Smoke lines: "confidence high → technician", "confidence low → reviewer → technician".
- Image prompt (if broll): Photorealistic shot of a young engineer at a small shared office desk reviewing a document on a laptop beside a printed equipment manual, soft window daylight, focused expression, plants and whiteboard softly blurred in background, no logos or text in image.
- Narration EN: They added one rule. When an answer is low confidence, or no matching manual is found, the question goes to a human reviewer first. That protects technicians from a wasted trip while the founders learn where the system fails.
- Narración ES: Agregaron una regla. Cuando una respuesta tiene baja confianza, o no aparece un manual que coincida, la pregunta pasa primero a un revisor humano. Eso protege a los técnicos de una visita perdida mientras los fundadores aprenden dónde falla el sistema.

## Scene 8 — Recap and exercise cue (3:25–3:50)
- Type: presenter
- On screen: Maya centered. Kinetic text in Navy on White Smoke, one line at a time: "Rent the model. Build the context and the workflow." Then a card: "This week: architecture one-pager + eval set of 50 cases".
- Narration EN: Rent the model, build the context and workflow, and climb the ladder only on evidence. This week, write your architecture one-pager: your user's task, the four layers, one request from start to finish, cost per task and what a human reviews. In the next lesson, we'll build the eval set that tells you whether it works.
- Narración ES: Alquila el modelo, construye el contexto y el flujo, y sube la escalera solo con evidencia. Esta semana, escribe el one-pager de tu arquitectura: la tarea de tu usuario, las cuatro capas, una solicitud de principio a fin, el costo por tarea y qué revisa una persona. En la próxima lección vamos a construir el set de evaluación que te dirá si funciona.
