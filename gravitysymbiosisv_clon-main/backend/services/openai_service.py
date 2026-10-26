import os
import json
import uuid
import logging
from core.config import client, openai_model

logger = logging.getLogger(__name__)

def get_assistant_knowledge(query, assistant_id=None):
    """
    Consulta al asistente de OpenAI para obtener conocimiento técnico.
    """
    if not assistant_id:
        return "Conocimiento técnico no disponible (ID de asistente no configurado)."
    
    try:
        thread = client.beta.threads.create()
    except Exception as e:
        logger.error(f"Error creando thread Assistant: {e}")
        return "Error recuperando conocimiento técnico."

    try:
        client.beta.threads.messages.create(
            thread_id=thread.id,
            role="user",
            content=f"Responde brevemente basándote en tus documentos: {query}"
        )

        run = client.beta.threads.runs.create_and_poll(
            thread_id=thread.id,
            assistant_id=assistant_id
        )

        if run.status == 'completed':
            messages = client.beta.threads.messages.list(thread_id=thread.id)
            return messages.data[0].content[0].text.value
        else:
            return f"Error en la consulta al asistente: {run.status}"

    except Exception as e:
        logger.error(f"Error consultando Assistant: {e}")
        return "Error recuperando conocimiento técnico."
    finally:
        try:
            client.beta.threads.delete(thread.id)
        except Exception as e:
            logger.error(f"Error eliminando thread {thread.id}: {e}")

def analyze_objection(objecion, assistant_id=None):
    """
    Analiza una objeción usando GPT-5.4-mini y genera la "Frase Killer",
    integrando información relevante de la base de conocimientos mediante el Assistant de OpenAI.
    """
    knowledge_context = ""
    if assistant_id:
        try:
            # Consultamos al Assistant para extraer contexto o información técnica relacionada con la objeción
            query = f"Analiza esta objeción e identifica si existe alguna directriz, producto, servicio o técnica específica en nuestros documentos para rebatirla: {objecion}"
            knowledge_context = get_assistant_knowledge(query, assistant_id=assistant_id)
        except Exception as e:
            logger.error(f"Error consultando Assistant para la objeción: {e}")

    analysis_prompt = f"""
    Eres **CLOSER ELITE X**, el Escáner Cuántico de **GRAVITY SYMBIOSIS™ 2.0**.
    Tu tarea es desmantelar la siguiente objeción ESPECÍFICA usando el motor NS-Core™.
    
    OBJECIÓN EXACTA DEL PROSPECTO: "{objecion}"

    ---
    ### 📚 CONTEXTO DE BASE DE CONOCIMIENTOS:
    {knowledge_context or "No se recuperó información específica. Usa mejores prácticas generales del sector."}

    ---
    ### PASO 1 — ANÁLISIS 4D DE LA OBJECIÓN:
    Analiza la objeción "{objecion}" en estas 4 dimensiones:
    1. **Lógica:** ¿Cuál es el argumento racional detrás de esta objeción concreta?
    2. **Emoción:** ¿Qué miedo, inseguridad o deseo oculto revela esta objeción?
    3. **Identidad:** ¿Cómo se está viendo a sí mismo el prospecto al decir exactamente esto?
    4. **Contexto:** ¿Cuál es la urgencia real o la situación de vida detrás de esta frase?

    ---
    ### PASO 2 — PLAYBOOK TÁCTICO:
    Genera respuestas tácticas ESPECÍFICAS para la objeción "{objecion}":
    - paso1.empatia: Frase de empatía táctica estilo Chris Voss que valide exactamente lo que dijo el prospecto
    - paso1.redireccion: Redirección directa estilo Jordan Belfort que gire la conversación a su favor
    - paso2.tecnica1: Técnica de influencia (Cialdini) aplicada a esta objeción específica
    - paso2.tecnica2: Ley del Poder aplicable a esta situación concreta
    - paso3.proxima_jugada: Qué objeción o movimiento puede venir después de esta y cómo anticiparlo

    ---
    ### PASO 3 — FRASE KILLER (CRÍTICO — DEBE SER ÚNICA Y PERSONALIZADA):
    
    ESTA FRASE DEBE SER 100% ESPECÍFICA para la objeción: "{objecion}"
    
    INSTRUCCIONES OBLIGATORIAS:
    - La frase DEBE mencionar o referirse directamente al tema de la objeción (precio, tiempo, confianza, etc.)
    - USA las palabras clave o el contexto emocional detectado en el análisis 4D
    - Combina: tono tranquilo de Voss + certeza y dirección de Belfort + exclusividad de Serhant
    - La frase debe sentirse como si fuera creada SOLO para este prospecto en este momento exacto
    - NUNCA uses frases genéricas como "¿empezamos ahora?" o "¿qué te parece?"
    - Elige el estilo de cierre más poderoso para ESTA objeción específica:
      * Si la objeción es de PRECIO → cierre con valor/inversión/perspectiva de futuro
      * Si es de TIEMPO → cierre anti-postergación con urgencia elegante
      * Si es de CONFIANZA → cierre emocional con pregunta calibrada
      * Si es de ESTATUS → cierre con exclusividad y visión aspiracional
    - Máximo 2 a 3 líneas (200 caracteres máximo). Sonido: humana, premium, inteligente, segura. NUNCA desesperada.
    - Debe provocar en el prospecto: "Tiene sentido avanzar" o "No quiero perder esto"

    ---
    ### PASO 4 — RESPUESTAS PROFESIONALES (2 Y 4 LINEAS):
    Genera dos versiones de respuesta PRONUNCIABLES EN VOZ ALTA, escritas con tono profesional, sereno y de alto nivel (estilo consultor de elite):
    - respuesta_corta: respuesta de EXACTAMENTE 2 lineas (max 30 palabras) — directa, confidente, para responder al momento.
    - respuesta_media: respuesta de EXACTAMENTE 4 lineas (max 50 palabras) — expande con valor y cierre elegante.

    ---
    ### PASO 5 — PREGUNTAS CALIBRADAS (TECNICA VOSS):
    Genera una lista `preguntas_calibradas` de 3 preguntas (entre 3 y 6 palabras cada una, tipo Chris Voss: "como", "que", "cuando", sin "por que") para desarmar la objecion "{objecion}" y avanzar la venta. Ejemplos: "¿Qué tendría que pasar para...?", "¿Cómo encajaría esto en tu plan?", "¿Cuándo sería el mejor momento?". Deben ser abiertas y sin tono confrontativo.

    ---
    ### FORMATO DE SALIDA (JSON ESTRICTO):
    {{
        "tipo_objecion": "Precio|Confianza|Estatus|Tiempo|Calidad|Comparacion",
        "sentimiento_cliente": "descripcion del estado emocional detectado",
        "arquetipo_cliente": "perfil psicologico del prospecto",
        "nivel_confianza": "Bajo|Medio|Alto",
        "probabilidad_cierre": <numero entre 1 y 100>,
        "respuesta_corta": "2 lineas max 30 palabras, tono profesional",
        "respuesta_media": "4 lineas max 50 palabras, expande con valor",
        "preguntas_calibradas": ["pregunta calibrada 1", "pregunta calibrada 2", "pregunta calibrada 3"],
        "analisis_4d": {{
            "logica": "argumento racional concreto",
            "emocion": "miedo o deseo oculto especifico",
            "identidad": "como se ve el prospecto a si mismo",
            "contexto": "urgencia real o situacion de vida"
        }},
        "playbook": {{
            "paso1": {{ "empatia": "frase de empatia tactica especifica para esta objecion", "redireccion": "redireccion especifica al valor" }},
            "paso2": {{ "tecnica1": "tecnica cialdini aplicada", "tecnica2": "ley del poder aplicada" }},
            "paso3": {{ "proxima_jugada": "siguiente movimiento anticipado del prospecto y como manejarlo" }},
            "paso4": {{ "frase_killer": "FRASE UNICA Y ESPECIFICA para la objecion '{objecion}' — 2 a 3 lineas, estilo closer elite, adaptada al contexto emocional y tipo de objecion detectado" }}
        }}
    }}
    
    Responde SOLO el JSON. La frase_killer DEBE ser completamente diferente y especifica para cada objecion distinta.
    """

    completion = client.chat.completions.create(
        model=openai_model,
        messages=[{"role": "user", "content": analysis_prompt}],
        max_completion_tokens=2000,
        temperature=0.85,
        response_format={"type": "json_object"},
    )

    content = completion.choices[0].message.content
    if not content:
        raise ValueError(f"La API de OpenAI devolvió un contenido vacío (None).")

    return json.loads(content.strip())

def transcribe_audio(audio_path):
    """
    Transcribe audio usando Whisper, forzando español.
    """
    with open(audio_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="whisper-1", 
            file=audio_file,
            language="es",
            response_format="text",
            temperature=0.0
        )
    return transcript

def generate_audio(text, output_path):
    """
    Genera audio a partir de texto usando OpenAI TTS.
    """
    # Asegurar que el directorio de salida existe
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    response = client.audio.speech.create(
        model="tts-1",
        voice="shimmer",
        speed=1.1,
        input=text
    )
    response.write_to_file(output_path)
        
    return output_path
