## Objetivos de aprendizaje

- Identificar los datos que necesitas y confirmar que tienes derecho a recopilarlos, usarlos y entrenar modelos con ellos.
- Mapear cómo puede fallar tu producto de IA, a quién perjudica y con qué gravedad, incluidos los sesgos entre grupos de usuarios.
- Diseñar una supervisión humana acorde con lo que está en juego en cada decisión que apoya tu producto.
- Explicar las ideas principales de la regulación actual de la IA, incluidos los niveles de riesgo de la Ley de IA de la UE, y dónde aplican las reglas sectoriales.

## Resumen

La IA responsable suele dejarse para después del product-market fit. Es un error costoso. Las decisiones de tus primeras semanas, como qué datos recopilas, qué consentimiento pides y qué puede hacer el producto por su cuenta, son difíciles de revertir y definen si los clientes confían en ti. En los mercados empresariales, una revisión de seguridad o una sola falla pública pueden terminar con un contrato o con una empresa. Construir de forma responsable desde el primer día no frena la velocidad: te permite seguir rápido sin reconstruir.

## Derechos sobre los datos y privacidad

### Sabe qué puedes usar

Los productos de IA dependen de datos, y cada conjunto de datos viene con derechos asociados. Antes de recopilar o entrenar con cualquier cosa, responde cuatro preguntas:

- ¿De dónde vienen? ¿De usuarios, clientes, fuentes públicas, aliados o proveedores?
- ¿Qué puedes hacer con ellos? Lee los términos. Estar publicado en internet no significa poder usarse para cualquier fin. El contenido con licencia, como manuales, artículos o imágenes, puede restringir la copia o el entrenamiento.
- ¿Quién aparece en ellos? Los datos sobre personas identificables son datos personales según leyes como el GDPR de la UE y la LGPD de Brasil, y conllevan obligaciones sobre finalidad, consentimiento, conservación y acceso.
- ¿De quién es lo que produce el producto y lo que aprende de los datos del cliente? Pon la respuesta en tus contratos con clientes.

### Hábitos prácticos

- Recopila solo lo que necesitas para un propósito claro. Cada campo extra es un riesgo.
- Pide consentimiento en lenguaje sencillo, sobre todo para grabaciones de voz o video.
- Separa los datos de cada cliente y deja claro si los usas para mejorar modelos de otros clientes.
- Cifra los datos, restringe y registra el acceso. Los clientes empresariales lo van a preguntar.
- Lleva un inventario simple de datos: qué tienes, para qué, dónde está y cuándo lo eliminas.

## Sesgos y modos de falla

### Cómo fallan los productos de IA

Los sistemas de IA pueden equivocarse con total seguridad, comportarse distinto ante entradas nuevas y degradarse en silencio. Para cada función, enumera:

- Respuestas incorrectas: el modelo da información equivocada con seguridad.
- Respuestas faltantes: el modelo no señala algo importante.
- Desempeño desigual: el producto funciona bien para algunos usuarios y mal para otros.
- Mal uso: alguien usa el producto de una forma que no previste.
- Deriva: el desempeño cae a medida que cambian las entradas del mundo real.

### Califica la gravedad, no solo la frecuencia

Para cada falla, pregúntate a quién perjudica y cuánto. Una mala recomendación de restaurante es una molestia. Una respuesta equivocada sobre una válvula de gas, una dosis o un préstamo puede causar un daño serio. Ordena las fallas por gravedad y probabilidad, y atiende primero las graves.

### El sesgo es un problema de calidad del producto

El desempeño desigual suele ser sesgo. En reconocimiento de voz, un estudio liderado por Stanford y publicado en 2020 en Proceedings of the National Academy of Sciences encontró que los principales sistemas comerciales cometían bastantes más errores con hablantes negros que con hablantes blancos. Si tus usuarios tienen acentos distintos, hablan más de un idioma o trabajan con ruido, mide el desempeño de cada grupo por separado. Un promedio puede esconder un producto que falla para muchos usuarios.

## Supervisión humana y confianza

### Ajusta la supervisión a lo que está en juego

La supervisión humana significa que una persona puede entender, revisar y anular lo que hace el sistema. El nivel adecuado depende de lo que está en juego:

- Poco en juego y fácil de revertir: el sistema puede actuar solo, con registro. Redactar un resumen es un ejemplo.
- Riesgo medio: el sistema sugiere y una persona aprueba. Pedir un repuesto es un ejemplo.
- Mucho en juego o crítico para la seguridad: el sistema puede informar, pero una persona calificada decide y confirma. Cualquier paso con riesgos eléctricos, de gas o de salud va aquí.

### Haz que la supervisión sea real

La supervisión falla cuando se aprueba sin mirar. Facilita la revisión:

- Muestra las fuentes, como la página del manual o el registro en que se basa una respuesta.
- Muestra la incertidumbre y di "no estoy seguro" en lugar de adivinar.
- Facilita las correcciones y regístralas: son datos valiosos de evaluación.
- Nunca ocultes que el usuario interactúa con una IA.

### Construir confianza

La confianza se gana con hechos:

- Escribe en lenguaje sencillo una página que explique qué hace tu producto con los datos.
- Prepárate pronto para los cuestionarios de seguridad. Los compradores empresariales los van a enviar.
- Comparte la precisión con honestidad, incluso donde el producto es débil.
- Ten una forma clara de reportar problemas y un compromiso sobre qué tan rápido respondes.

## Panorama de la regulación actual

La regulación de la IA avanza rápido. Lo que sigue es un resumen general a 2026, no asesoría legal. Consulta fuentes oficiales y a un abogado antes de lanzar en un mercado regulado.

### La Ley de IA de la UE

La Ley de IA de la UE (EU AI Act) tiene un enfoque basado en el riesgo y aplica a las empresas que ponen sistemas de IA en el mercado europeo, sin importar dónde estén. Clasifica los sistemas en niveles:

- Riesgo inaceptable: una lista corta de prácticas prohibidas, como ciertos sistemas manipuladores y la puntuación social. Estas prohibiciones aplican desde febrero de 2025.
- Alto riesgo: sistemas usados en áreas sensibles, como empleo, educación, crédito, servicios esenciales y componentes de seguridad de productos. Deben cumplir requisitos de gestión de riesgos, calidad de datos, documentación, supervisión humana y precisión. Estas obligaciones entran en vigor de forma gradual y sus fechas se modificaron durante 2026, así que revisa el calendario vigente en el AI Act Service Desk de la Comisión Europea.
- Riesgo limitado: sistemas con deberes de transparencia, como avisar a las personas que hablan con una IA o etiquetar el contenido generado por IA.
- Riesgo mínimo: la mayoría de los demás sistemas, sin obligaciones nuevas específicas.

Los proveedores de modelos de IA de uso general tienen obligaciones propias desde agosto de 2025. La mayoría de las startups que construyen sobre esos modelos no son proveedoras, pero igual deben saber en qué nivel cae su producto.

### Reglas sectoriales y marcos de referencia

Las leyes de privacidad y las reglas sectoriales a menudo pesan más que las leyes específicas de IA. A 2026, Estados Unidos no tiene una ley federal integral de IA, pero los reguladores aplican a la IA las normas existentes de protección al consumidor, antidiscriminación, salud y finanzas, y varios estados aprobaron sus propias leyes de IA. Muchos países de América Latina ya tienen leyes de protección de datos, como la LGPD de Brasil, y varios han debatido proyectos de ley sobre IA.

Dos marcos voluntarios dan estructura incluso donde la ley calla. El AI Risk Management Framework del NIST de Estados Unidos organiza el trabajo en cuatro funciones: gobernar, mapear, medir y gestionar. Los Principios de IA de la OCDE, adoptados por decenas de países, describen expectativas compartidas sobre transparencia, robustez y rendición de cuentas.

## Caso: Fieldnote

Ana y Tomás revisaron Fieldnote a la luz de esta lección.

Derechos sobre los datos: los manuales de los fabricantes tienen derechos de autor, y que algunos se descarguen gratis no significa que se puedan usar de cualquier forma. Harán una lista de fabricantes para pedir licencias y solo usarán manuales con permiso. Las grabaciones captan a los técnicos y a veces a los dueños de casa, así que la app pedirá consentimiento claro, solo grabará cuando el técnico inicie una sesión y eliminará pronto el audio original. Los contratos dirán que los datos de trabajo de cada contratista le pertenecen.

Modos de falla: la falla más grave es una respuesta equivocada y segura en un paso crítico para la seguridad, como una válvula de gas, alto voltaje o el manejo de refrigerantes. Le sigue un pedido de repuesto equivocado, que cuesta dinero y una segunda visita. Los errores de papeleo pesan menos.

Sesgos: muchos técnicos tienen acentos regionales o alternan entre inglés y español. Antes de cualquier piloto, Tomás medirá la precisión de voz para cada grupo y en cuartos ruidosos.

Supervisión: Fieldnote siempre mostrará la fuente del manual, dirá cuándo no está seguro y nunca dará instrucciones paso a paso en trabajo crítico para la seguridad sin indicar que se siga el procedimiento del fabricante y la capacitación del técnico. Los pedidos de repuestos requieren la aprobación del técnico.

Regulación: como herramienta de apoyo para técnicos calificados de HVAC, es poco probable que Fieldnote caiga hoy en el nivel de alto riesgo de la Ley de IA de la UE, pero funciones como clasificar el desempeño de los técnicos podrían cambiarlo, porque los usos en empleo figuran como sensibles. Lo revisarán antes de entrar al mercado europeo.

## Errores comunes

- Suponer que los datos públicos se pueden usar para cualquier fin, incluido el entrenamiento.
- Reportar un solo promedio de precisión que oculta un mal desempeño para algunos grupos.
- Agregar una revisión humana solo de nombre, sin fuentes ni incertidumbre contra las cuales revisar.
- Dejar los términos de datos y privacidad fuera de los contratos con clientes.
- Ignorar la regulación hasta que el equipo legal de un cliente grande la menciona.

## Tu turno

Dedica 25 minutos. Enumera cada tipo de dato que tu producto recopilará o usará y, para cada uno, su fuente, tu derecho a usarlo y si incluye datos personales. Luego enumera tus cinco modos de falla principales, califica cada uno del 1 al 5 en gravedad y probabilidad, y elige el nivel de supervisión para el más grave: actuar con registro, sugerir y aprobar, o solo informar.

## Ideas clave

- Confirma los derechos sobre los datos y el consentimiento antes de recopilar o entrenar, y recopila solo lo necesario.
- Ordena los modos de falla por gravedad y mide el desempeño por separado para cada grupo de usuarios.
- Ajusta la supervisión humana a lo que está en juego y dale a las personas fuentes e incertidumbre para que su revisión sea real.
- A 2026, la Ley de IA de la UE clasifica los sistemas de IA por nivel de riesgo, mientras que las reglas sectoriales y de privacidad aplican casi en todas partes.
- La confianza nace de prácticas de datos claras, reportes de precisión honestos y respuestas rápidas a los problemas.

## Recursos

- AI Act Service Desk de la Comisión Europea, calendario de implementación de la Ley de IA de la UE (en inglés): https://ai-act-service-desk.ec.europa.eu/en/ai-act/timeline/timeline-implementation-eu-ai-act
- NIST, AI Risk Management Framework (en inglés): https://www.nist.gov/itl/ai-risk-management-framework
- OCDE, Principios de IA (en inglés): https://oecd.ai/en/ai-principles
- Comisión Europea, protección de datos (en inglés): https://commission.europa.eu/law/law-topic/data-protection_en
