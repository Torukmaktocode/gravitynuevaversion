import os
import json
import logging
from core.config import client, openai_model
from services.openai_service import get_assistant_knowledge

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Palabras clave que indican un tema GENERAL de entrenamiento
# ---------------------------------------------------------------------------
_TEMAS_GENERALES = {
    "entrenar", "entrenamiento", "practicar", "practica", "práctica",
    "empezar", "comenzar", "inicio", "iniciar", "ayuda", "ayúdame",
    "ayudame", "quiero", "cómo", "como", "ejercicio", "simula",
    "simulación", "simular", "roleplay", "role play", "ventas", "vender",
    "cierre", "cerrar", "objeción", "objeciones", "prospecto",
}

# Palabras clave que indican un dominio ESPECÍFICO que requiere contexto externo
_TEMAS_ESPECIFICOS = {
    "falabella", "seguros", "retail", "banco", "financiero", "finanzas",
    "producto", "póliza", "poliza", "prima", "cobertura", "deducible",
    "inmobiliaria", "propiedad", "inversión", "inversion", "fondo",
    "salud", "vida", "accidente", "hogar", "auto", "automóvil",
    "corporativo", "empresa", "b2b", "mayorista",
    # Términos de seguros de salud y beneficios
    "360", "3c-z", "3cz", "copago", "ambulancia", "médico", "medico",
    "domicilio", "emergencia", "cobertura", "asegurado", "beneficio",
    "beneficios", "edad", "califica", "calificación", "asegurabilidad",
    "medicina", "general", "hospitalización", "hospitalizacion",
    "consulta", "soles", "tarifa", "póliza", "plan", "rango",
    "permanencia", "ingreso", "afiliación", "afiliacion",
}


def clasificar_intencion(user_input: str) -> str:
    """
    Clasifica el mensaje del usuario en una de tres categorías:
      - 'general'    → flujo normal de entrenamiento, sin contexto externo
      - 'especifico' → dominio concreto, se necesita conocimiento del Assistant
      - 'desconocido'→ mensaje ambiguo o fuera de la lógica habitual
    """
    texto = user_input.lower().strip()
    palabras = set(texto.replace(",", " ").replace(".", " ").split())

    if palabras & _TEMAS_ESPECIFICOS:
        return "especifico"

    if palabras & _TEMAS_GENERALES:
        return "general"

    # Si el mensaje es muy corto y no encaja en ningún grupo, tratarlo como general
    if len(texto) < 40:
        return "general"

    # Mensaje largo sin palabras clave reconocidas → podría necesitar contexto
    return "desconocido"


def get_system_prompt(user_name: str = "Vendedor", user_input: str = "", user_profile: dict = None, assistant_id: str = None) -> str:
    """
    Genera el system prompt para /entrenar con lógica híbrida y perfil del usuario.
    """
    intencion = clasificar_intencion(user_input) if user_input else "general"
    
    # Extraer datos del perfil si existen
    if user_profile:
        nivel = user_profile.get("training_level", "En proceso de evaluación")
        bloqueos = user_profile.get("blockages", "Sin bloqueos detectados")
        contexto_usuario = f"Entrenas a {user_name} (Nivel: {nivel}). Sus bloqueos conocidos son: {bloqueos}."
    else:
        contexto_usuario = f"Entrenas a {user_name}."

    # ------------------------------------------------------------------
    # CONSULTA AL ASSISTANT (igual que Closer): se recupera conocimiento de la
    # empresa SIEMPRE que exista assistant_id, sin importar la intención.
    # Antes solo se consultaba en el caso "específico/desconocido", por lo que
    # las preguntas clasificadas como "general" (ventas, cierre, objeción, etc.)
    # nunca obtenían el contexto del Assistant.
    # ------------------------------------------------------------------
    technical_info = ""
    if user_input and assistant_id:
        try:
            technical_info = get_assistant_knowledge(user_input, assistant_id=assistant_id)
        except Exception as e:
            logger.error(f"Error consultando contexto técnico: {e}")
    elif user_input and not assistant_id:
        logger.warning("assistant_id no disponible — el Assistant de OpenAI no se consultará")

    contexto_bloque = (
        f"### Contexto relevante (base de conocimiento de la empresa):\n{technical_info}"
        if technical_info
        else ""
    )

    # ------------------------------------------------------------------
    # CASO GENERAL: respuesta corta, natural, flujo de entrenamiento puro
    # ------------------------------------------------------------------
    if intencion == "general":
        return f"""Eres GRAVITY SYMBIOSIS™ 2.0, el entrenador de ventas de élite.
{contexto_usuario}
{contexto_bloque}

REGLAS DE MEMORIA Y PERSONALIDAD (CRÍTICO):
- ¡TÚ CONOCES AL USUARIO! Tienes acceso a su perfil e historial de conversaciones.
- NUNCA digas que no tienes capacidad para recordar nombres o información personal.
- Actúa como un coach real que lleva tiempo trabajando con este pupilo.
- Si te pregunta algo personal que está en su perfil o historial, respóndele con autoridad.

REGLAS DE RESPUESTA:
- Responde de forma CORTA y DIRECTA. Máximo 3-4 oraciones.
- No expliques tu metodología ni menciones herramientas internas.
- No hagas listas largas; usa frases conversacionales.
- Si el usuario pregunta por productos, servicios o directrices de la empresa, usa el contexto relevante de arriba para responder con precisión.
- Si el usuario quiere practicar, arranca la simulación de inmediato.
- Tono: directo, motivador, sin adornos necesesarios.
- Idioma: español siempre.

Cuando el usuario diga que quiere entrenar o practicar, pregúntale qué escenario quiere trabajar (tipo de cliente, producto, objeción) en UNA sola pregunta. Luego arranca la simulación."""

    # ------------------------------------------------------------------
    # CASO ESPECÍFICO / DESCONOCIDO: enriquecer con conocimiento del Assistant
    # ------------------------------------------------------------------
    contexto_bloque = (
        f"### Contexto relevante:\n{technical_info}"
        if technical_info
        else "No se encontró contexto técnico adicional para este tema."
    )

    return f"""Eres GRAVITY SYMBIOSIS™ 2.0, el entrenador de ventas de élite.
{contexto_usuario}
{contexto_bloque}

REGLAS DE MEMORIA Y PERSONALIDAD (CRÍTICO):
- ¡TÚ CONOCES AL USUARIO! Tienes acceso a su perfil e historial.
- NUNCA digas que no puedes recordar o que no tienes acceso a información personal.
- Eres su coach personal, no un asistente genérico.

REGLAS DE RESPUESTA:
- Usa el contexto de arriba si aplica al tema del usuario, pero no lo menciones explícitamente.
- Si el tema es de un dominio específico, haz preguntas de aclaración antes de simular.
- Respuestas concisas: máximo 5-6 oraciones.
- Tono profesional, directo y motivador.
- Idioma: español siempre.

Cuando necesites más información para personalizar el entrenamiento, haz UNA pregunta a la vez."""


def generar_plan_entrenamiento(user_profile, training_time):
    """
    Genera un plan de entrenamiento personalizado basado en el perfil del usuario.
    """
    # Determinar intensidad basada en tiempo de entrenamiento
    intensity = "Baja"
    if "30+" in str(training_time) or "30" in str(training_time):
        intensity = "Elite / Inmersiva"
    elif "20" in str(training_time):
        intensity = "Alta / Enfocada"
    elif "10" in str(training_time):
        intensity = "Media / Consistente"

    new_prompt = f"""
    Eres **ALFRED**, el Conserje Estratégico Ultra Premium de **GRAVITY SYMBIOSIS™ 2.0**. 
    Tu misión es transformar a un vendedor promedio en una **Leyenda del Cierre** mediante un análisis neuro-simbólico.
    
    ---\n### 🧬 PERFIL DEL CANDIDATO:
    - Usuario: {user_profile.get('email', user_profile.get('nickname', 'Candidato'))}
    - Nivel actual: {user_profile.get('training_level', 'Iniciando')}
    - Bloqueos detectados: {user_profile.get('blockages', 'Por definir')}
    - Tiempo Disponible: {training_time} diarios (Intensidad: {intensity}).
    - Historial de desempeño: {user_profile.get('history_summary', 'Sin registros previos')}

    ---\n### 🛠️ TU METODOLOGÍA (NS-Core™):
    1. **Identidad > Resultados:** No sugieras solo acciones; redefine quién ES el usuario (ej: "Arquitecto de Acuerdos").
    2. **Estrategia Cialdini/Belfort:** Aplica principios de autoridad y urgencia.
    3. **Leyes del Poder:** Selecciona leyes específicas para su situación (ej: Ley 33 para sus bloqueos).

    ---\n### 🎯 ESTRUCTURA DEL PLAN (JSON):
    Devuelve un JSON con:
    1. "level": Un título de rango Ultra Premium.
    2. "plan_de_entrenamiento": HTML (Tailwind) con estas secciones OBLIGATORIAS:
       
       **A. Diagnóstico Quantum:** Análisis profundo de su situación actual.
       
       **B. Escudo de Mentalidad:** Técnica para superar sus bloqueos específicos.
       
       **C. Micro-Hábito Atómico:** Una acción del 1% para mañana mismo.
       
       **D. Ruta de Poder:** Cuáles de las 48 Leyes debe dominar primero.
       
       **E. 🎤 TRAINER - Plan de Entrenamiento Vocal:**
       - Título: "Entrenamiento en Gravity Trainer"
       - Descripción: Explica que el Trainer es el entrenador de IA con voz que simula conversaciones reales.
       - Lista de 3-4 escenarios específicos que debe practicar basados en su perfil.
       - Instrucción: "Ve a la sección Entrenador, activa tu micrófono y practica estos escenarios".
       
       **F. 📚 BASE DE CONOCIMIENTO - Módulos Recomendados:**
       - Título: "Estudio en Base de Conocimiento"
       - Descripción: Explica que la Base tiene módulos interactivos con quizzes.
       - Lista de 2-3 módulos específicos (ej: "El Camino del Lobo", "Nunca Dividas la Diferencia").
       
       **G. 🎯 CLOSER ELITE - Plan de Análisis de Objeciones:**
       - Título: "Práctica en Closer Elite X"
       - Descripción: Explica que es la herramienta de análisis de objeciones.
       - Lista de 3-5 objeciones específicas que debe practicar.
       
       **H. Playbook Diaria:** Pasos precisos para sus {training_time} distribuidos entre Teoría, Práctica Vocal y Análisis Táctico.

    ---\n### 🎨 REGLAS ESTÉTICAS (CRÍTICO):
    - Usa Tailwind CSS. 
    - **PROHIBIDO:** bg-white, bg-gray-50, bg-gray-100, text-black.
    - **OBLIGATORIO:** Estética Dark Premium. Usa bg-secondary/10, border-white/5, text-gray-300, accent-primary.
    - Usa iconos de Lucide (si es posible vía SVG simple) o emojis elegantes.

    Responde SÓLO el JSON.
    """

    completion = client.chat.completions.create(
        model=openai_model,
        messages=[
            {"role": "system", "content": "Security Protocol: Response must be strictly optimized JSON. Aesthetic: Cyber-Dark Premium."},
            {"role": "user", "content": new_prompt},
        ],
        max_completion_tokens=3500,
        temperature=0.7,
        response_format={"type": "json_object"},
    )

    content = completion.choices[0].message.content
    if not content:
        raise ValueError(f"La API de OpenAI devolvió un contenido vacío (None). Razón de finalización: {completion.choices[0].finish_reason}")

    return json.loads(content.strip())

