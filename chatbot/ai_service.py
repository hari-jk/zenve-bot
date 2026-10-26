"""
Zenve AI Assistant Core Service
=================================
Handles intelligent multi-turn conversation, RAG context injection,
LLM orchestration (OpenAI / Gemini / Local Hybrid Engine), intent
classification, conversational memory, and safety guardrails.
"""

import os
import re
import json
import logging
import datetime
from typing import List, Dict, Any, Tuple

from chatbot.knowledge_retriever import KnowledgeRetriever

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a "Personal Assistant" and intelligent pet care companion for the Zenve platform.
Your objective is to provide exceptionally neat, clear, structured, and insightful answers—modeled after Google Gemini's clean, modern formatting style.

Formatting & Structure (Gemini Style):
1. Neat & Scannable Hierarchy:
   - Begin with a warm, polite opening sentence acknowledging the user.
   - Use concise Markdown subheadings (###) to separate distinct topics, sections, or advice areas.
   - Present guidelines and recommendations in clean bullet points with **Bold Key Terms** at the beginning of each point (e.g., "• **Balanced Nutrition:** ...").
   - Keep paragraphs brief (1–3 sentences max) to ensure maximum visual clarity and breathing space.
   - Use numbered lists (1., 2., 3.) for chronological steps, instructions, or prioritized product options.
2. Clarity & Politeness:
   - Deliver clear, direct, and factual answers without fluff or verbose filler.
   - Format pricing with the Indian Rupee symbol (₹) and highlight savings, coupons, or offers clearly.
   - Conclude interactions neatly with a courteous offer to assist further (e.g., "Let me know if you would like more details or personalized suggestions! Thank you!").

Tone & Time-of-Day Greetings:
3. Greet the user appropriately based on the current time of day:
   - Morning (5:00 AM - 11:59 AM): "Good morning"
   - Afternoon (12:00 PM - 4:59 PM): "Good afternoon"
   - Evening (5:00 PM - 9:59 PM): "Good evening"
   - Late night hours (10:00 PM - 4:59 AM): Greet with "Hi, how is your day?" instead of "Good night".

Animal Care & Fundamental Features:
4. Provide factual information and standard care practices for animals including:
   - Dogs (canines: balanced diet, regular exercise, socialization, grooming, clean water)
   - Cats (felines: obligate carnivores, hydration, litter box hygiene, mental stimulation)
   - Poultry (chickens, ducks: secure predator-proof housing, ventilation, balanced layer/grower feed, clean dry bedding)
   - Cows (cattle/bovine: ruminant fiber/forage diet, 60-100L clean daily water, clean dry barn, hoof care, heat stress prevention)
   - Goats (caprine: natural browsers, dry clean housing, mineral supplementation, hoof trimming, clean water)
5. Focus strictly on their fundamental features and standard care practices (nutrition, shelter, cleanliness, hydration, environmental enrichment, and routine checkups).
6. Safety & Medication Guardrail: DO NOT administer or prescribe medications directly. For any illnesses, medication questions, or specific chemical dosages, always advise the user to consult a licensed veterinarian.

Platform Assistance & Knowledge Synthesis:
7. Assist users with the Zenve marketplace: product discovery, order placement, tracking, returns, prescriptions, and veterinary home visits.
8. Ground your answers using the internal Zenve website data (products, pricing, store policies, services) and real-time external information from internet search results provided in the context.
   First prioritize and ground your response using the verified internal Zenve website data. Then seamlessly complement it with relevant real-time web search findings to provide an accurate, comprehensive, and up-to-date answer.
"""


class AIService:
    """
    Unified AI service supporting Google Gemini, OpenAI GPT, and
    an intelligent context-aware local synthesis engine.
    """

    @classmethod
    def generate_chat_response(
        cls,
        user_message: str,
        conversation_history: List[Dict[str, str]] = None,
        pet_context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Main response generation pipeline:
        1. Validate & sanitize input
        2. Retrieve verified project knowledge & product catalog
        3. Formulate prompt with conversation history
        4. Query AI model (Gemini / OpenAI / Hybrid Fallback)
        5. Formulate structured response with sources and suggested follow-ups
        """
        # Ensure fresh environment variables from .env are active
        try:
            from dotenv import load_dotenv
            load_dotenv(override=True)
        except Exception:
            pass

        clean_message = cls._sanitize_input(user_message)
        if not clean_message:
            return {
                "response": "Please enter a question or message so I can assist you.",
                "sources": [],
                "suggested_followups": ["What can you help me with?", "Show me popular dog food", "How do I track my order?"]
            }

        # 0. Check Shopify-Style Sidekick AI Coworker Action Engine (Autonomous Operations, Live Inventory, Discounts, Sales)
        sidekick_action = cls._check_sidekick_actions(clean_message, user_message, pet_context)
        if sidekick_action:
            return sidekick_action

        history = conversation_history or []
        # Keep last 8 turns to avoid context overflow
        trimmed_history = history[-8:]

        # Check for reference resolution in follow-ups
        resolved_context_query = cls._resolve_conversational_references(clean_message, trimmed_history)

        # Retrieve verified project knowledge
        retrieval_data = KnowledgeRetriever.retrieve_relevant_context(
            resolved_context_query,
            pet_context=pet_context,
            top_products=4
        )

        context_string = KnowledgeRetriever.build_system_context_string(retrieval_data)

        # Inject real-time dynamic store context
        now = datetime.datetime.now()
        current_time_str = now.strftime("%A, %B %d, %Y, %I:%M %p")
        dynamic_store_context = (
            f"REAL-TIME STORE CONTEXT:\n"
            f"- Current Date & Time: {current_time_str}\n"
            f"- Store Name: Zenve Pet Store\n"
            f"- Available Categories: Pet Fashion, Grooming, Food, Accessories, Supplements, Veterinary Care\n"
            f"- Customer Support: Email: support@zenve.com | Phone: 1800-ZENVE-PET (Operating Hours: 9:00 AM - 9:00 PM IST daily)\n"
            f"- Free Shipping: On all orders over ₹499 (Standard 2-4 business days)\n"
            f"- Return Policy: 7-day hassle-free replacement or return\n"
            f"- Promotional Coupon: 'ZENVEFIRST' for 15% off first order\n\n"
        )
        context_string = dynamic_store_context + context_string

        # Collect sources for client attribution (Internal dataset + External web search)
        sources = []
        for doc in retrieval_data.get("kb_documents", []):
            sources.append({
                "type": "policy",
                "title": doc["title"],
                "url": doc.get("link", "/help")
            })
        for p in retrieval_data.get("products", []):
            sources.append({
                "type": "product",
                "title": f"{p['name']} (₹{p['price']:.2f})",
                "url": p.get("url", "/products")
            })
        for w in retrieval_data.get("web_results", []):
            sources.append({
                "type": "web",
                "title": w["title"],
                "url": w.get("url", "https://duckduckgo.com")
            })

        # Check configured LLM providers
        gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        openai_key = os.getenv("OPENAI_API_KEY")
        has_llm_key = bool(gemini_key or openai_key)

        ai_response = None
        provider_used = "none"

        # 1. Pure LLM Generation: Prioritize Google Gemini API
        if gemini_key:
            ai_response = cls._call_gemini(clean_message, trimmed_history, context_string, pet_context)
            if ai_response:
                provider_used = "gemini"

        # 2. Pure LLM Generation: OpenAI or OpenAI-compatible endpoint (Groq / OpenRouter)
        if not ai_response and openai_key:
            ai_response = cls._call_openai(clean_message, trimmed_history, context_string, pet_context)
            if ai_response:
                provider_used = "openai"

        # 3. Fallback: If no external LLM key is configured, or external API is temporarily offline,
        # utilize our zero-latency pre-prompt router and grounded local synthesis engine
        if not ai_response:
            # Check instant intent shortcuts for small-talk & identity
            instant_reply = cls._check_instant_intents(clean_message)
            if instant_reply:
                return instant_reply

            ai_response = cls._synthesize_local_response(
                clean_message,
                resolved_context_query,
                trimmed_history,
                retrieval_data,
                pet_context
            )
            provider_used = "zynvo_hybrid_engine"

        # Generate intelligent follow-up suggestions based on response & intent
        followups = cls._generate_followups(clean_message, retrieval_data)

        return {
            "response": ai_response,
            "sources": sources,
            "suggested_followups": followups,
            "provider": provider_used
        }

    @classmethod
    def _sanitize_input(cls, text: str) -> str:
        """Sanitizes user input to prevent prompt injections and script tags."""
        if not text:
            return ""
        # Strip script and HTML tags
        cleaned = re.sub(r"<[^>]*>", "", text)
        # Limit input length
        cleaned = cleaned[:1500].strip()
        return cleaned

    @classmethod
    def _resolve_conversational_references(cls, current_query: str, history: List[Dict[str, str]]) -> str:
        """
        Resolves pronouns like 'that', 'it', 'them', 'the second one'
        by incorporating context from the last assistant message.
        """
        if not history:
            return current_query

        lower_query = current_query.lower()
        pronoun_triggers = ["what about", "how about", "why that", "tell me more about", "advantages", "explain that", "second one", "first one", "its ", "it "]

        if any(pt in lower_query for pt in pronoun_triggers):
            # Find the last assistant message or user message
            last_msg = ""
            for turn in reversed(history):
                content = turn.get("content", "")
                if content:
                    last_msg = content[:200]
                    break
            if last_msg:
                return f"{current_query} (Context: {last_msg})"

        return current_query

    @classmethod
    def _call_openai(cls, user_message: str, history: List[Dict[str, str]], context_str: str, pet_context: dict) -> str:
        """
        Pure LLM generation using OpenAI or any OpenAI-compatible provider (Groq, OpenRouter).
        """
        try:
            from openai import OpenAI
            base_url = os.environ.get("OPENAI_BASE_URL")
            client = OpenAI(
                api_key=os.environ.get("OPENAI_API_KEY"),
                base_url=base_url if base_url else None,
                timeout=15.0
            )
            model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

            pet_info = f"\nCurrent Active Pet Profile: {json.dumps(pet_context)}" if pet_context else ""
            system_content = f"{SYSTEM_PROMPT}\n\nVERIFIED STORE CONTEXT & KNOWLEDGE:\n{context_str}{pet_info}"

            messages = [{"role": "system", "content": system_content}]
            for turn in history:
                role = "assistant" if turn.get("role") == "assistant" else "user"
                messages.append({"role": role, "content": turn.get("content", "")})

            messages.append({"role": "user", "content": user_message})

            response = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.3,
                max_tokens=800
            )
            if response.choices and response.choices[0].message:
                return response.choices[0].message.content.strip()
            return None
        except Exception as e:
            logger.warning("OpenAI call failed or timed out: %s", e)
            return None

    @classmethod
    def _call_gemini(cls, user_message: str, history: List[Dict[str, str]], context_str: str, pet_context: dict) -> str:
        """
        Pure LLM generation using Google Gemini API (gemini-2.5-flash / 2.0-flash / 1.5-flash).
        """
        try:
            from google import genai
            from google.genai import types

            gemini_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
            if not gemini_key:
                return None

            client = genai.Client(api_key=gemini_key)

            pet_info = f"\nCurrent Active Pet Profile: {json.dumps(pet_context)}" if pet_context else ""
            system_instruction = f"{SYSTEM_PROMPT}\n\nVERIFIED STORE CONTEXT & KNOWLEDGE:\n{context_str}{pet_info}"

            config = types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.3,
            )

            contents = []
            for turn in history:
                role = "model" if turn.get("role") == "assistant" else "user"
                content_text = turn.get("content", "").strip()
                if content_text:
                    contents.append(types.Content(role=role, parts=[types.Part.from_text(text=content_text)]))
            contents.append(types.Content(role="user", parts=[types.Part.from_text(text=user_message)]))

            # Candidate models in order of capability & availability
            candidate_models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
            for model_name in candidate_models:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=contents,
                        config=config
                    )
                    if response and response.text:
                        return response.text.strip()
                except Exception as model_err:
                    logger.warning("Gemini model %s failed: %s", model_name, model_err)
                    continue

            return None
        except Exception as e:
            logger.warning("Gemini call failed or timed out: %s", e)
            return None

    @classmethod
    def _get_time_greeting(cls) -> str:
        """
        Determines greeting based on current local hour:
        - Morning (5:00 AM - 11:59 AM): 'Good morning'
        - Afternoon (12:00 PM - 4:59 PM): 'Good afternoon'
        - Evening (5:00 PM - 9:59 PM): 'Good evening'
        - Late night hours (10:00 PM - 4:59 AM): 'Hi, how is your day?'
        """
        import datetime
        hour = datetime.datetime.now().hour
        if hour >= 22 or hour < 5:
            return "Hi, how is your day?"
        elif 5 <= hour < 12:
            return "Good morning"
        elif 12 <= hour < 17:
            return "Good afternoon"
        else:
            return "Good evening"

    @classmethod
    def _check_instant_intents(cls, user_message: str) -> Dict[str, Any]:
        """
        Lightweight pre-prompt router for instant chit-chat, bot identity,
        and real-time system utilities with zero latency.
        """
        q = user_message.strip().lower()
        time_greet = cls._get_time_greeting()
        now = datetime.datetime.now()
        date_str = now.strftime("%A, %B %d, %Y")

        # 1. Greetings & Well-being
        if re.match(r"^(hi|hello|hey|good\s+morning|good\s+afternoon|good\s+evening|namaste|howdy|sup)\b", q):
            return {
                "response": f"{time_greet}! Welcome to Zenve. How can I assist you and your pet today?",
                "sources": [],
                "suggested_followups": [
                    "Track my order",
                    "Suggest grain-free dog food",
                    "What are your delivery times?",
                    "Return policy"
                ],
                "provider": "instant_intent_router"
            }

        if any(trigger in q for trigger in ["how are you", "how are u", "how r u", "how's it going"]):
            return {
                "response": "I'm doing great, thank you! Ready to help you find the best pet products.",
                "sources": [],
                "suggested_followups": [
                    "What are your top-selling products?",
                    "Do you have discount coupons?",
                    "How do I track my order?"
                ],
                "provider": "instant_intent_router"
            }

        # 2. Identity & Role
        if any(trigger in q for trigger in ["who are you", "what is your name", "who r u"]):
            return {
                "response": "I am Zenve's AI shopping assistant, designed to help you find pet supplies, track orders, and answer product questions.",
                "sources": [
                    {"type": "policy", "title": "About Zenve", "url": "/help"}
                ],
                "suggested_followups": [
                    "What can you do?",
                    "Talk to a real person",
                    "Browse dog products"
                ],
                "provider": "instant_intent_router"
            }

        if any(trigger in q for trigger in ["human or a robot", "human or robot", "are you a human", "are you a robot", "are you human", "are you robot", "are you a bot", "are you ai"]):
            return {
                "response": "I am Zenve's AI shopping assistant! 🤖 I can answer your shopping, shipping, and pet care questions right away. If you ever prefer to speak with a human team member, just let me know and I will gladly share our direct customer support details.",
                "sources": [],
                "suggested_followups": [
                    "I want to talk to a real person",
                    "What are your operating hours?",
                    "Track order"
                ],
                "provider": "instant_intent_router"
            }

        # 3. System & Contextual Utilities
        if any(trigger in q for trigger in ["today's date", "today date", "what is the date", "what date is it", "what day is today", "what is today's day", "current date"]):
            return {
                "response": f"Today is **{date_str}**. Our store and delivery services are running on regular schedule!",
                "sources": [],
                "suggested_followups": [
                    "Do you offer same-day delivery?",
                    "Track my package",
                    "Current discount codes"
                ],
                "provider": "instant_intent_router"
            }

        if q in ["help", "what can you do", "menu"] or "what can you do" in q:
            return {
                "response": (
                    "Here is how I can assist you today:\n\n"
                    "• 🛍️ **Product Discovery**: Find breed-specific food, supplements, toys, and grooming gear.\n"
                    "• 📦 **Order Tracking**: Check shipment status and estimated delivery dates.\n"
                    "• 🚚 **Shipping & Delivery**: Learn about free shipping thresholds and delivery speeds.\n"
                    "• 🔄 **Returns & Refunds**: 7-day hassle-free returns and instant wallet refunds.\n"
                    "• 💳 **Payments & Coupons**: UPI, COD, cards, and first-order discount codes.\n"
                    "• 🐾 **Pet Care**: Standard care suggestions for dogs, cats, poultry, cows, and goats.\n\n"
                    "How can I assist you with your animals or pet shopping today?"
                ),
                "sources": [
                    {"type": "policy", "title": "Zenve Help Center", "url": "/help"}
                ],
                "suggested_followups": [
                    "Track Order",
                    "Free shipping policy",
                    "First-time buyer coupon",
                    "Dog harness sizing"
                ],
                "provider": "instant_intent_router"
            }

        return None

    @classmethod
    def _synthesize_local_response(
        cls,
        clean_message: str,
        resolved_query: str,
        history: List[Dict[str, str]],
        retrieval_data: Dict[str, Any],
        pet_context: Dict[str, Any]
    ) -> str:
        """
        High-intelligence grounded conversational engine.
        Synthesizes human-like, accurate, multi-turn answers directly from
        the project's database, policies, safety rules, and retail taxonomy.
        """
        q = clean_message.lower().strip()
        kb_docs = retrieval_data.get("kb_documents", [])
        products = retrieval_data.get("products", [])
        safety_warnings = retrieval_data.get("safety_warnings", [])
        web_results = retrieval_data.get("web_results", [])
        time_greet = cls._get_time_greeting()
        now = datetime.datetime.now()
        date_str = now.strftime("%A, %B %d, %Y")

        # 1. Critical safety trigger
        if safety_warnings:
            warning_text = "\n".join([f"⚠️ **Caution:** {w}" for w in safety_warnings])
            return (
                f"{warning_text}\n\n"
                "If your animal consumed any toxic substances or is showing signs of distress, "
                "please contact your veterinarian or an emergency clinic immediately."
            )

        # 2. Concluding interactions & polite exit
        closing_triggers = ["thank you", "thanks", "bye", "goodbye", "close", "see you", "exit", "quit", "appreciate it", "great help"]
        if any(w in q for w in closing_triggers):
            return "Thank you! Wishing you and your animals continued health and well-being. Please feel free to reach out anytime you need basic care suggestions or assistance. Have a wonderful day! 🐾"

        # 3. Medication safety guardrail (No direct administration)
        if any(w in q for w in ["medicine", "medication", "pill", "tablet", "dosage", "dose", "antibiotic", "inject", "paracetamol", "ibuprofen", "administer medicine"]):
            return (
                "As your Personal Assistant, I provide factual animal care suggestions and fundamental features without administering or prescribing medication directly.\n\n"
                "For accurate diagnoses, pharmaceutical treatments, and safe dosages, please always consult a qualified veterinarian. "
                "I can gladly assist you with standard supportive care, nutrition, hydration, and safe shelter practices in the meantime!"
            )

        # 4. Product queries with catalog items
        is_product_intent = any(w in q for w in ["food", "diet", "buy", "price", "product", "stock", "do you have", "show me", "cost", "store"])
        if products and is_product_intent:
            product_list_md = []
            for idx, p in enumerate(products, 1):
                rx = " *(Prescription Required)*" if p.get("prescription_required") else ""
                stock_status = "In Stock" if p['stock'] > 0 else "Out of Stock"
                product_list_md.append(
                    f"{idx}. **[{p['name']}]({p['url']})** by *{p['brand']}*{rx}\n"
                    f"   - **Price**: ₹{p['price']:.2f} | **Availability**: {stock_status}\n"
                    f"   - **Details**: {p['description']}"
                )
            pet_type_filter = f" for **{products[0]['pet_type']}s**" if products[0].get('pet_type') != 'Universal' else ""
            
            # Complement internal catalog items with real-time web insight if available
            web_complement = ""
            if web_results:
                top_w = web_results[0]
                web_complement = f"\n\n🌐 **Real-Time Web Insight** *({top_w.get('source', 'Web Search')})*:\n[{top_w['title']}]({top_w['url']}): {top_w['snippet'][:220]}..."

            return (
                f"Here are the top matching verified products{pet_type_filter} from our catalog:\n\n"
                + "\n\n".join(product_list_md)
                + web_complement + "\n\n"
                "Would you like more details about any of these, or should I help you find alternatives?"
            )

        # 5. Chit-Chat & Bot Identity
        if re.match(r"^(hi|hello|hey|good\s+morning|good\s+afternoon|good\s+evening|namaste|howdy|sup)\b", q):
            return f"{time_greet}! Welcome to Zenve. How can I assist you and your pet today?"

        if any(w in q for w in ["how are you", "how are u", "how r u", "how's it going"]):
            return "I'm doing great, thank you! Ready to help you find the best pet products."

        if any(w in q for w in ["who are you", "what is your name", "who r u"]):
            return "I am Zenve's AI shopping assistant, designed to help you find pet supplies, track orders, and answer product questions."

        if any(w in q for w in ["human or a robot", "human or robot", "are you a human", "are you a robot", "are you human", "are you robot", "are you a bot", "are you ai"]):
            return "I am Zenve's AI shopping assistant! 🤖 I can answer your shopping, shipping, and pet care questions right away. If you ever prefer to speak with a human team member, just let me know and I will gladly share our direct customer support details."

        if any(w in q for w in ["today's date", "today date", "what is the date", "what date is it", "what day is today", "what is today's day", "current date"]):
            return f"Today is **{date_str}**. Our store and delivery services are running on regular schedule!"

        if q in ["help", "what can you do", "menu"] or "what can you do" in q:
            return (
                "Here is how I can assist you today:\n\n"
                "• 🛍️ **Product Discovery**: Find breed-specific food, supplements, toys, and grooming gear.\n"
                "• 📦 **Order Tracking**: Check shipment status and estimated delivery dates.\n"
                "• 🚚 **Shipping & Delivery**: Learn about free shipping thresholds and delivery speeds.\n"
                "• 🔄 **Returns & Refunds**: 7-day hassle-free returns and instant wallet refunds.\n"
                "• 💳 **Payments & Coupons**: UPI, COD, cards, and first-order discount codes.\n"
                "• 🐾 **Pet Care**: Standard care suggestions for dogs, cats, poultry, cows, and goats.\n\n"
                "Click any quick option below or ask me your question directly!"
            )

        # 6. Retail Taxonomy: A. Product Discovery & Recommendations
        if ("grain-free" in q or "grain free" in q) and ("retriever" in q or "dog" in q or "food" in q):
            return (
                "For an adult Golden Retriever, a **grain-free dry food** formulated with high-quality single-source animal protein "
                "(such as salmon, deboned turkey, or lamb) and complex carbohydrates (sweet potatoes or green peas) is highly recommended.\n\n"
                "Key benefits for Golden Retrievers:\n"
                "• **Joint Support**: Fortified with Glucosamine & Chondroitin to safeguard large breed hips and joints.\n"
                "• **Coat & Skin**: Rich in Omega-3 & Omega-6 fatty acids to maintain their signature dense, water-repellent coat.\n"
                "• **Digestive Health**: Prebiotics and beet pulp for optimal digestion without wheat, corn, or soy."
            )

        if ("harness" in q or "collar" in q) and ("top" in q or "best" in q or "selling" in q or "popular" in q or "recommend" in q):
            return (
                "Here are our **top-selling dog harnesses and collars**:\n\n"
                "1. **Zenve Ergonomic No-Pull Harness**: Dual leash attachment rings (front chest D-ring to discourage pulling & back ring for casual walks), breathable padded mesh, and 3M reflective safety stitching.\n"
                "2. **Heavy-Duty Padded Tactical Collar**: Military-grade nylon webbing with soft neoprene padding and an alloy quick-release buckle.\n"
                "3. **Step-In Breathable Mesh Harness**: Ultra-lightweight and escape-proof, ideal for small and medium breeds."
            )

        if ("jacket" in q or "sweater" in q or "clothes" in q or "coat" in q or "apparel" in q) and ("puppy" in q or "small" in q or "5 kg" in q or "5kg" in q or "winter" in q):
            return (
                "Yes! We have cozy, fleece-lined winter jackets and waterproof coats specially tailored for small puppies under 5 kg (Sizes XS & S).\n\n"
                "• **Key Features**: Water-resistant outer shell, warm thermal fleece lining, adjustable velcro belly straps, and a leash portal on the back.\n"
                "• **Sizing Tip**: Check that your puppy's chest girth is between 28–36 cm and back length is 20–25 cm for the best fit."
            )

        if "difference between" in q or "compare" in q or (" vs " in q and ("food" in q or "product" in q)):
            return (
                "When comparing pet products on Zenve, here is what to evaluate:\n\n"
                "1. **Primary Ingredient**: Look for whole animal protein as the first ingredient rather than by-product meal or fillers.\n"
                "2. **Life Stage & Breed Formulation**: Puppy formulations provide higher caloric density and DHA, while adult maintenance food focuses on balanced energy.\n"
                "3. **Special Dietary Needs**: Grain-free vs. whole grain, or hypoallergenic formulas for sensitive stomachs.\n\n"
                "If you have two specific products in mind, share their names and I will break down the exact comparison for you!"
            )

        if ("shampoo" in q or "grooming" in q or "wash" in q) and ("cat" in q or "kitten" in q or "sensitive" in q or "itchy" in q):
            return (
                "For cats with sensitive skin, we recommend hypoallergenic, soap-free grooming shampoos formulated with natural colloidal oatmeal, aloe vera, and chamomile.\n\n"
                "• **Safe & Gentle**: Free of sulfates, parabens, artificial fragrances, and essential oils that can irritate feline skin.\n"
                "• **Moisture Locking**: Preserves the cat's natural skin barrier and prevents dry, flaky itching."
            )

        # 7. Retail Taxonomy: B. Order Tracking & Status
        if any(w in q for w in ["where is my order", "track order", "track #", "tracking #", "track package", "when will my package arrive", "shipment delayed", "order status"]):
            return (
                "You can easily track your Zenve order in real time:\n\n"
                "1. Go to **My Account > Orders** at [zenve.com/orders](/orders)\n"
                "2. Find your order number (e.g. #12345) and click **Track Package** to see live courier location and dispatch milestones.\n"
                "3. Standard deliveries arrive within **2 to 4 business days**. If your shipment is experiencing delays due to transit weather or high volume, our logistics team automatically updates the live status, or you can message support at `support@zenve.com`."
            )

        # 8. Retail Taxonomy: C. Shipping & Delivery
        if ("free shipping" in q or "shipping fee" in q or "delivery charge" in q) or (("minimum" in q or "cart value" in q) and "shipping" in q):
            return (
                "Zenve offers **FREE standard shipping** on all orders with a cart value of **₹499 or more**!\n\n"
                "• For orders under ₹499, a nominal flat delivery charge of ₹49 applies.\n"
                "• Zenve VIP Gold members receive free express shipping on all orders with no minimum cart value."
            )

        if ("how long" in q or "timeline" in q or "days" in q or "pincode" in q or "city" in q) and ("delivery" in q or "shipping" in q or "arrive" in q):
            return (
                "Standard delivery takes **2 to 4 business days** in metro cities, and **4 to 6 business days** for other regional pincodes.\n\n"
                "You can enter your 6-digit delivery pincode on any product page to see the exact estimated delivery date for your location."
            )

        if "same-day" in q or "same day" in q or "express delivery" in q or "fast delivery" in q:
            return (
                "Yes! We provide same-day and express delivery in select metro cities for orders placed before 12:00 PM IST.\n\n"
                "Eligible items display an '⚡ Express Delivery' badge during checkout."
            )

        if "change" in q and ("address" in q or "delivery address" in q or "shipping address" in q):
            return (
                "You can change your delivery address within **1 hour** of placing your order if it has not yet been dispatched.\n\n"
                "Go to **My Orders > Edit Order Details**, or quickly reach out to our customer care team at `support@zenve.com` or **1800-ZENVE-PET** with your order number."
            )

        # 9. Retail Taxonomy: D. Cancellation, Returns & Refunds
        if ("how" in q or "can i" in q) and "cancel" in q and "order" in q:
            return (
                "You can cancel your order directly from **My Account > Orders** as long as it has not been marked as 'Dispatched'.\n\n"
                "Once cancelled, your refund is credited instantly to your Zenve Wallet or initiated back to your original payment method within 3–5 business days."
            )

        if "return" in q or "replacement policy" in q or "refund policy" in q:
            return (
                "Zenve offers a **7-Day Hassle-Free Return & Replacement Policy** for pet apparel, collars, harnesses, beds, and non-perishable accessories!\n\n"
                "• **Condition**: Items must be unused, unwashed, and in original packaging with tags intact.\n"
                "• **Hygiene Note**: Opened pet food, treats, and healthcare items cannot be returned for pet safety and hygiene reasons."
            )

        if "damaged" in q or "expired" in q or "defective" in q:
            return (
                "We sincerely apologize if you received a damaged or expired product! We provide a **100% free immediate replacement or full refund**.\n\n"
                "Please take a photo of the item and package, then submit a request under **My Orders > Report Issue** or email `support@zenve.com` within 48 hours of delivery."
            )

        if "refund" in q and ("how long" in q or "days" in q or "timeline" in q or "when" in q or "original payment" in q):
            return (
                "Refund timelines by payment method:\n\n"
                "• **Zenve Wallet**: Instant (within 5 minutes)\n"
                "• **UPI / Net Banking**: 24 to 48 hours\n"
                "• **Credit / Debit Cards**: 3 to 5 business days, depending on your bank's clearing cycle."
            )

        # 10. Retail Taxonomy: E. Payments, Discounts & Account Management
        if "payment method" in q or "payment options" in q or ("accept" in q and ("payment" in q or "upi" in q or "cards" in q or "cod" in q)):
            return (
                "We accept all major secure payment methods:\n\n"
                "• **UPI**: Google Pay, PhonePe, Paytm, BHIM & all major UPI apps\n"
                "• **Cards**: Visa, MasterCard, RuPay, American Express (Debit & Credit)\n"
                "• **Net Banking**: All major Indian banks\n"
                "• **Cash on Delivery (COD)**: Available on eligible pincodes\n"
                "• **Zenve Wallet**: 1-click checkout with instant refunds & cashback rewards."
            )

        if "discount" in q or "coupon" in q or "promo" in q or "first-time" in q or "first time" in q or "offer" in q:
            return (
                "Use coupon code **ZENVEFIRST** during checkout to get **15% OFF** on your first pet care order (savings up to ₹250 on orders above ₹799)!\n\n"
                "Check our Offers page regularly for seasonal promotions, brand flash sales, and bundle discounts."
            )

        if "payment fail" in q or "transaction failed" in q or "money deducted" in q:
            return (
                "If your payment failed:\n\n"
                "1. Rest assured, if money was deducted from your account, it is safely held in transit and will automatically reverse within 24 to 48 hours.\n"
                "2. Verify your internet connection, bank OTP, or try paying via UPI or Cash on Delivery.\n"
                "3. If you need help verifying a transaction, share your payment reference ID with `support@zenve.com`."
            )

        if "password" in q or "reset account" in q or "forgot password" in q:
            return (
                "To reset your account password:\n\n"
                "1. Click **Sign In** at the top right of the website.\n"
                "2. Select **Forgot Password?** under the login form.\n"
                "3. Enter your registered email address or mobile number to receive a secure OTP and set a new password."
            )

        # 11. Retail Taxonomy: F. Domain-Specific (Pet Care & Sizing)
        if ("measure" in q or "sizing" in q or "size" in q) and ("harness" in q or "clothes" in q or "apparel" in q or "jacket" in q or "dog" in q):
            return (
                "**How to Measure Your Dog for Harnesses & Clothes:**\n\n"
                "• **Chest Girth**: Use a flexible tape to measure around the widest part of your dog's ribcage, directly behind the front legs.\n"
                "• **Neck Circumference**: Measure where a collar naturally sits.\n"
                "• **Back Length**: Measure along the spine from the base of the neck to the base of the tail.\n\n"
                "*Tip*: Always leave a two-finger gap for comfortable movement. Compare your measurements with the size chart (XS to XXL) on each product page!"
            )

        if ("chew" in q or "toy" in q) and ("aggressive" in q or "durable" in q or "power chewer" in q or "tough" in q):
            return (
                "For power chewers and aggressive chewers, look for toys made from **100% natural, ultra-durable vulcanized rubber** (such as KONG Extreme rubber) or heavy-duty ballistic nylon.\n\n"
                "• Avoid thin vinyl, latex, or plush toys with synthetic stuffing that can be torn and swallowed.\n"
                "• Always supervise heavy chewing sessions to ensure safety."
            )

        if "supplement" in q or "vitamins" in q or "omega" in q or "joint care" in q:
            return (
                "Zenve carries a verified range of pet supplements including Glucosamine & Chondroitin for joint mobility, Omega 3 & 6 fatty acid coat oils, and digestive probiotics.\n\n"
                "For products marked *Prescription Required*, simply upload your vet's prescription during checkout for quick verification."
            )

        # 12. Retail Taxonomy: G. Escalation & Fallbacks
        if any(w in q for w in ["real person", "human agent", "human", "talk to someone", "customer care executive", "representative"]):
            return (
                "I am happy to connect you with our human support team! 👥\n\n"
                "• 📞 **Toll-Free Helpline**: **1800-ZENVE-PET** (1800-936-8373)\n"
                "• ✉️ **Support Email**: [support@zenve.com](mailto:support@zenve.com)\n"
                "• 🕒 **Operating Hours**: Monday to Sunday, 9:00 AM – 9:00 PM IST\n\n"
                "Our customer care team can assist you with order modifications, veterinary appointments, and returns."
            )

        if "support email" in q or "phone number" in q or "contact support" in q or "customer care" in q:
            return (
                "You can reach Zenve Support anytime via:\n\n"
                "• **Email**: [support@zenve.com](mailto:support@zenve.com)\n"
                "• **Phone**: **1800-ZENVE-PET** (Toll-Free, 9 AM – 9 PM IST daily)\n"
                "• **Help Center**: Visit our [Help & FAQs](/help) page."
            )

        if "operating hours" in q or "working hours" in q or "timing" in q or "hours" in q:
            return (
                "Zenve customer support is available **every day from 9:00 AM to 9:00 PM IST**.\n\n"
                "Our online store, shopping cart, and order placement are open 24/7!"
            )

        # 13. Follow-up resolution (e.g. "Explain that in simple words", "What about its advantages?")
        if any(w in q for w in ["in simple words", "simpler", "simplify", "explain simply"]):
            if history:
                prev_content = history[-1].get("content", "")
                return (
                    "In short and simple terms:\n\n"
                    "Zenve gives you everything your pet needs in one place — healthy food, verified medicines with prescription check, "
                    "home doctor visits, and personalized recommendations so your pet stays healthy and happy!"
                )

        if "advantage" in q or "benefit" in q or "why use" in q:
            return (
                "**Key Advantages of Zenve:**\n\n"
                "1. **Safety First**: Licensed vet verification on all prescription medicines.\n"
                "2. **Personalized Care**: AI tailored recommendations matching your pet's age, breed, and health condition.\n"
                "3. **Convenience**: Certified veterinary home visits and doorstep delivery.\n"
                "4. **Financial Perks**: Zenve VIP members receive exclusive savings and express free shipping.\n"
                "5. **Fast Refunds**: Instant wallet refunds without waiting days for bank clearing."
            )

        # 14. Factual Animal Care & Fundamental Features (Dogs, Cats, Poultry, Cows, Goats)
        # Dogs
        if any(w in q for w in ["dog", "puppy", "canine"]):
            return (
                "### 🐶 Standard Care & Fundamental Features for Dogs\n\n"
                "• **Fundamental Features:** Canines are social, intelligent, communicative companions with omnivorous dietary requirements, sharp senses, and strong pack loyalty.\n\n"
                "• **Nutrition & Hydration:**\n"
                "  - Complete, life-stage appropriate diet (puppy, adult, or senior) rich in quality animal protein.\n"
                "  - Continuous access to clean, fresh water at all times.\n\n"
                "• **Daily Care Practices:**\n"
                "  - **Physical Exercise:** 30–60 minutes of daily walks, running, and play to maintain cardiovascular health.\n"
                "  - **Grooming & Hygiene:** Regular coat brushing, periodic ear cleaning, and routine dental hygiene.\n"
                "  - **Mental Stimulation:** Training sessions and chew toys to prevent anxiety.\n\n"
                "• **Health & Veterinary Guidance:**\n"
                "  - Keep core vaccinations (Rabies, DHPP) and monthly parasite prevention up to date.\n"
                "  - Keep toxic human foods away (chocolate, grapes, onions, raisins).\n"
                "  - *Safety Guardrail:* For any illnesses or prescription medications, always consult a licensed veterinarian rather than self-administering drugs directly."
            )

        # Cats
        if any(w in q for w in ["cat", "kitten", "feline"]):
            return (
                "### 🐱 Standard Care & Fundamental Features for Cats\n\n"
                "• **Fundamental Features:** Agile, independent obligate carnivores that require animal-sourced protein and essential dietary taurine for cardiac, ocular, and metabolic health.\n\n"
                "• **Nutrition & Hydration:**\n"
                "  - High-protein wet and dry cat food. Wet food is strongly recommended to support feline urinary tract hydration.\n"
                "  - Clean drinking water placed away from the food bowl and litter area.\n\n"
                "• **Daily Care Practices:**\n"
                "  - **Litter Box Hygiene:** Daily scooping and keeping clean litter boxes in quiet locations.\n"
                "  - **Claw Maintenance:** Dedicated vertical scratching posts and gentle brushing to reduce hairballs.\n"
                "  - **Enrichment:** Window perches, climbing trees, and daily interactive laser/wand play.\n\n"
                "• **Health & Veterinary Guidance:**\n"
                "  - Routine FPV/FVRCP vaccinations and flea/tick control.\n"
                "  - *Safety Guardrail:* Cats are extremely sensitive to chemicals—never administer human pain relievers (like paracetamol, which is fatal to cats). Always consult a veterinarian for health issues."
            )

        # Poultry (Chickens, Ducks, Turkeys)
        if any(w in q for w in ["poultry", "chicken", "hen", "rooster", "duck", "turkey"]):
            return (
                "### 🐔 Standard Care & Fundamental Features for Poultry\n\n"
                "• **Fundamental Features:** Feathered flock animals with rapid metabolic rates, diurnal foraging habits, and a specialized gizzard for mechanical digestion.\n\n"
                "• **Nutrition & Feeding:**\n"
                "  - Age-appropriate commercial feed (starter, grower, or layer crumbles/pellets).\n"
                "  - Insoluble granite grit to assist gizzard digestion, plus oyster shell calcium for strong eggshells.\n"
                "  - Unrestricted, clean drinking water that is refreshed daily.\n\n"
                "• **Housing & Shelter:**\n"
                "  - Secure predator-proof coop (1/2\" hardware cloth) with latch locks.\n"
                "  - Dry, draft-free bedding (pine shavings or clean straw) with proper high-level ventilation to prevent ammonia buildup.\n"
                "  - Elevated roosting bars and clean, cushioned nesting boxes.\n\n"
                "• **Health & Biosecurity:**\n"
                "  - Keep housing dry to prevent coccidiosis, mites, and respiratory issues.\n"
                "  - *Safety Guardrail:* Consult an avian veterinarian for flock illnesses rather than self-administering unauthorized pharmaceuticals."
            )

        # Cows (Cattle)
        if any(w in q for w in ["cow", "cows", "cattle", "bovine", "calf", "bull"]):
            return (
                "### 🐄 Standard Care & Fundamental Features for Cows (Cattle)\n\n"
                "• **Fundamental Features:** Large four-compartment ruminants (rumen, reticulum, omasum, abomasum) that digest roughage through microbial fermentation. They are gentle herd animals sensitive to environmental stress.\n\n"
                "• **Nutrition & Feeding:**\n"
                "  - High-fiber roughage diet of quality pasture grass, dry hay, or legume silage.\n"
                "  - Essential livestock minerals and salt licks (especially calcium and phosphorus for lactating cows).\n"
                "  - Clean, fresh water—cows require **60 to 100 liters of water daily**.\n\n"
                "• **Housing & Shelter:**\n"
                "  - Dry, well-ventilated barn with clean bedding (straw or sand) to prevent mastitis.\n"
                "  - Non-slip flooring and adequate shade to prevent heat stress.\n"
                "  - Regular hoof inspection and trimming every 6 months to prevent lameness.\n\n"
                "• **Health & Veterinary Guidance:**\n"
                "  - Routine herd vaccinations (FMD, Blackleg) and deworming supervised by a livestock vet.\n"
                "  - *Safety Guardrail:* Do not self-administer prescription antibiotics or hormonal injections directly; always consult a licensed livestock veterinarian for illnesses."
            )

        # Goats
        if any(w in q for w in ["goat", "goats", "kid", "caprine"]):
            return (
                "### 🐐 Standard Care & Fundamental Features for Goats\n\n"
                "• **Fundamental Features:** Highly agile, curious, and social ruminants that are natural browsers—they naturally prefer leaves, shrubs, twigs, and roughage over ground grass.\n\n"
                "• **Nutrition & Feeding:**\n"
                "  - Varied roughage browse, quality grass hay, and fresh clean water daily.\n"
                "  - Species-specific loose goat mineral mix formulated with appropriate copper levels.\n\n"
                "• **Housing & Fencing:**\n"
                "  - Elevated, dry, draft-free shelter—goats dislike rain and are prone to foot rot and respiratory issues in damp conditions.\n"
                "  - Sturdy, climb-proof fencing at least 4 to 5 feet high with secure gate latches.\n"
                "  - Routine hoof inspection and trimming every 4 to 8 weeks.\n\n"
                "• **Health & Veterinary Guidance:**\n"
                "  - Implement rotational grazing and routine fecal egg count checks for internal parasites.\n"
                "  - *Safety Guardrail:* Consult an experienced caprine veterinarian for herd vaccination (CDT) and parasite treatments."
            )

        # 15. Knowledge Base Documents (Policies, Home Visits, Marketplace Info)
        if kb_docs:
            doc = kb_docs[0]
            link_md = f"\n\n👉 You can visit the [{doc['title']}]({doc.get('link', '#')}) page to learn more." if doc.get('link') else ""
            return f"**{doc['title']}**\n\n{doc['content']}{link_md}"

        # 16. Real-Time External Web Knowledge Synthesis (When query is outside internal catalog/policies)
        if web_results:
            web_summary = []
            for idx, w in enumerate(web_results[:3], 1):
                snippet = w.get("snippet", "").strip()
                if len(snippet) > 280:
                    snippet = snippet[:280] + "..."
                source_tag = w.get("source", "Web Search")
                web_summary.append(f"{idx}. **[{w['title']}]({w.get('url', '#')})** *({source_tag})*:\n   {snippet}")
            return (
                "Here is real-time information retrieved from external web search to assist you:\n\n"
                + "\n\n".join(web_summary) + "\n\n"
                "🐾 *Zenve Tip: If you need specific pet supplies, prescriptions, or veterinary home visits related to this, feel free to ask our assistant anytime!*"
            )

        # 17. Graceful degradation fallback with helpful menu instead of dead-end
        return (
            "I'm here to assist you with all things Zenve! 🐾\n\n"
            "While I check for more details on that specific topic, here are quick things I can help with:\n"
            "• 📦 **Track an Order**: Check live shipment status and delivery dates.\n"
            "• 🛍️ **Product Recommendations**: Breed-specific food, harnesses, toys, and supplements.\n"
            "• 🔄 **Returns & Refunds**: 7-day hassle-free return guidelines.\n"
            "• 👥 **Customer Care**: Reach our team at `support@zenve.com` or call **1800-ZENVE-PET** (9 AM – 9 PM IST).\n\n"
            "Could you clarify your question or choose one of the options above?"
        )

    @classmethod
    def _generate_followups(cls, query: str, retrieval_data: Dict[str, Any]) -> List[str]:
        """Generates contextual, smart follow-up pills for the user interface."""
        q = query.lower()
        if "order" in q or "track" in q:
            return ["Can I cancel my order?", "How do refunds work?", "Where do I track live status?"]
        if "prescription" in q or "medicine" in q:
            return ["Where do I upload prescriptions?", "What medicines require a prescription?", "How do vet approvals work?"]
        if "return" in q or "refund" in q:
            return ["When will my refund arrive?", "Can I return a damaged item?", "How does Zenve Wallet refund work?"]
        if "home visit" in q or "vet" in q:
            return ["How to book a vet home visit?", "What services are included?", "How do I add my pet profile?"]
        if retrieval_data.get("products"):
            return ["Tell me more about the first product", "Do you have options for puppies?", "How can I place an order?"]
        if "membership" in q or "vip" in q:
            return ["What are the Gold tier benefits?", "How do I upgrade membership?", "Do members get free shipping?"]

        return [
            "What products do you recommend for dogs?",
            "How do veterinary home visits work?",
            "How can I track my order?"
        ]

    @classmethod
    def _check_sidekick_actions(cls, clean_message: str, raw_message: str, pet_context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Shopify-Style Sidekick AI Coworker Action Engine.
        Executes autonomous store operations:
        - Creates & activates promo discount coupons directly in store database
        - Live inventory audit & low-stock warning detection
        - Executive sales, GMV, and order analytics briefing
        - Clinical prescription queue checks
        - Dynamic multi-category product discovery cards
        """
        q = clean_message.lower().strip()

        # 0. High-level intent classification
        is_view_coupons = any(w in q for w in ["active", "show", "list", "view", "current", "available"]) and any(w in q for w in ["coupon", "discount", "promo", "voucher"])
        is_create_coupon = not is_view_coupons and any(w in q for w in ["coupon", "discount", "promo", "voucher"]) and any(w in q for w in ["create", "make", "generate", "add", "new", "code", "off", "setup", "give me"])
        is_inventory = any(w in q for w in ["low stock", "out of stock", "reorder", "restock"]) or (("stock" in q or "inventory" in q) and any(w in q for w in ["check", "alert", "show", "status", "audit", "level", "left", "running", "low"]))
        is_sales = any(w in q for w in ["sales summary", "today's sales", "store performance", "revenue", "gmv", "best sellers", "top selling", "order summary"]) or (("sales" in q or "order" in q or "revenue" in q or "business" in q or "gmv" in q) and any(w in q for w in ["summary", "summarize", "report", "performance", "how is", "how are", "total", "briefing", "analytics", "snapshot", "metric"]))
        is_rx = "prescription" in q and any(w in q for w in ["queue", "pending", "review", "status", "audit", "check", "approve", "vet", "rx"])

        # 1. Action: Create / Generate Discount Coupon
        if is_create_coupon:
            try:
                from coupons.models import Coupon
                from decimal import Decimal
                from datetime import timedelta
                from django.utils import timezone

                # Extract Discount Value
                discount_val = 15
                discount_type = "Percentage"
                pct_match = re.search(r"(\d+)\s*(?:%|percent|pct)", q)
                if pct_match:
                    discount_val = int(pct_match.group(1))
                    discount_type = "Percentage"
                else:
                    flat_match = re.search(r"(?:₹|rs\.?|flat|inr)\s*(\d+)", q) or re.search(r"(\d+)\s*(?:₹|rs\.?|flat|rupees)", q)
                    if flat_match:
                        discount_val = int(flat_match.group(1))
                        discount_type = "Flat"
                    else:
                        num_match = re.search(r"(\d+)", q)
                        discount_val = int(num_match.group(1)) if num_match else 15
                        discount_type = "Percentage"

                # Extract Code Name
                code_match = re.search(r"(?:code|called|named|named as)\s+([A-Za-z0-9_-]+)", raw_message, re.IGNORECASE)
                if code_match:
                    code = code_match.group(1).upper()
                else:
                    # Look for standalone uppercase word like FESTIVE20 or DIWALI15
                    caps_matches = re.findall(r"\b[A-Z0-9]{4,15}\b", raw_message)
                    caps_candidates = [c for c in caps_matches if c not in ["CREATE", "COUPON", "DISCOUNT", "SHOP", "STORE", "ORDER", "ZENVE", "MAKE"]]
                    if caps_candidates:
                        code = caps_candidates[0]
                    else:
                        code = f"SIDEKICK{discount_val}"

                # Extract Minimum Order Value
                min_order = 0
                min_match = re.search(r"(?:min|minimum|above|over|orders over|orders above)\s*(?:of|order)?\s*(?:value)?\s*(?:₹|rs\.?|inr)?\s*(\d+)", q)
                if min_match:
                    min_order = int(min_match.group(1))

                expiry_days = 30
                expiry_date = timezone.now() + timedelta(days=expiry_days)

                coupon, created = Coupon.objects.update_or_create(
                    code=code,
                    defaults={
                        "discount_type": discount_type,
                        "discount_value": Decimal(discount_val),
                        "minimum_order_value": Decimal(min_order),
                        "expiry_date": expiry_date,
                        "is_active": True
                    }
                )

                discount_display = f"{coupon.discount_value}% Off" if coupon.discount_type == "Percentage" else f"₹{coupon.discount_value} Flat Off"
                status_text = "Created as new" if created else "Updated existing"

                return {
                    "response": (
                        f"### ⚡ Sidekick Action Executed: Coupon Activated!\n\n"
                        f"I have successfully {status_text.lower()} the promotional coupon code **{coupon.code}** directly in your store database.\n\n"
                        f"• **Promo Code:** `{coupon.code}`\n"
                        f"• **Discount Benefit:** **{discount_display}**\n"
                        f"• **Min Order Threshold:** ₹{coupon.minimum_order_value:.2f}\n"
                        f"• **Validity:** Active for 30 days (Expires on {coupon.expiry_date.strftime('%B %d, %Y')})\n"
                        f"• **Cart Applicability:** Live & ready for all customers at checkout.\n\n"
                        f"You can manage all coupons anytime in the [Coupon Management](/admin/coupons) portal."
                    ),
                    "sources": [
                        {"type": "admin", "title": "Coupon Manager", "url": "/admin/coupons"},
                        {"type": "action", "title": f"Code: {coupon.code}", "url": "/admin/coupons"}
                    ],
                    "action_card": {
                        "type": "coupon_created",
                        "code": coupon.code,
                        "discount": discount_display,
                        "discount_type": coupon.discount_type,
                        "min_order": float(coupon.minimum_order_value),
                        "expiry": coupon.expiry_date.strftime("%b %d, %Y"),
                        "status": "Active & Live",
                        "action_url": "/admin/coupons"
                    },
                    "suggested_followups": [
                        "View active coupons",
                        "Check low stock products",
                        "Summarize store sales",
                        f"Create another {discount_val}% code"
                    ],
                    "provider": "sidekick_action_engine"
                }
            except Exception as e:
                logger.error("Sidekick coupon creation error: %s", e)

        # 2. Action: View Active Coupons
        if is_view_coupons:
            try:
                from coupons.models import Coupon
                coupons = Coupon.objects.filter(is_active=True).order_by("-created_at")[:6]
                if coupons.exists():
                    c_list = "\n".join([
                        f"• **`{c.code}`**: {c.discount_value}% Off (Min Order: ₹{c.minimum_order_value}) — Expires {c.expiry_date.strftime('%b %d, %Y')}"
                        if c.discount_type == "Percentage" else
                        f"• **`{c.code}`**: ₹{c.discount_value} Flat Off (Min Order: ₹{c.minimum_order_value}) — Expires {c.expiry_date.strftime('%b %d, %Y')}"
                        for c in coupons
                    ])
                    return {
                        "response": (
                            f"### 🎟️ Active Store Coupons & Promotions\n\n"
                            f"Here are the active promo codes currently enabled for checkout in your store:\n\n"
                            f"{c_list}\n\n"
                            f"Would you like me to create a new promotional code or adjust an existing discount threshold?"
                        ),
                        "sources": [{"type": "admin", "title": "Manage Coupons", "url": "/admin/coupons"}],
                        "action_card": {
                            "type": "coupon_list",
                            "coupons": [
                                {
                                    "code": c.code,
                                    "discount": f"{c.discount_value}%" if c.discount_type == "Percentage" else f"₹{c.discount_value}",
                                    "min_order": float(c.minimum_order_value),
                                    "expiry": c.expiry_date.strftime("%b %d, %Y")
                                }
                                for c in coupons
                            ],
                            "action_url": "/admin/coupons"
                        },
                        "suggested_followups": ["Create 20% discount coupon", "Check low stock products", "Sales summary"],
                        "provider": "sidekick_action_engine"
                    }
            except Exception as e:
                logger.error("Sidekick active coupon query error: %s", e)

        # 3. Action: Low Stock & Inventory Audit
        if is_inventory:
            try:
                from products.models import Product
                low_stock = Product.objects.filter(stock__lte=20).select_related('category', 'brand').order_by('stock')[:6]
                total_low = Product.objects.filter(stock__lte=20).count()
                zero_stock = Product.objects.filter(stock=0).count()

                items_text = []
                for p in low_stock:
                    status_badge = "🔴 **OUT OF STOCK**" if p.stock == 0 else f"🟡 **Low ({p.stock} left)**"
                    items_text.append(f"• **{p.product_name}** ({p.sku}) — {status_badge} • Price: ₹{p.price:.2f}")

                list_md = "\n".join(items_text) if items_text else "All products currently maintain healthy stock levels!"

                return {
                    "response": (
                        f"### 📦 Sidekick Inventory Audit & Restock Queue\n\n"
                        f"I scanned your real-time catalog database. There are **{total_low} SKUs** currently running below the safety threshold of 20 units (with **{zero_stock} completely out of stock**).\n\n"
                        f"{list_md}\n\n"
                        f"**Sidekick Recommendation:** Prioritize restocking high-velocity food diets and flea/tick medicines first to avoid losing reorder customers."
                    ),
                    "sources": [
                        {"type": "admin", "title": "Manage Products & Inventory", "url": "/products/manage"}
                    ],
                    "action_card": {
                        "type": "inventory_alert",
                        "total_low_stock": total_low,
                        "out_of_stock_count": zero_stock,
                        "products": [
                            {
                                "id": p.id,
                                "name": p.product_name,
                                "sku": p.sku,
                                "stock": p.stock,
                                "price": float(p.price),
                                "category": p.category.category_name if p.category else "Pet Care",
                                "urgency": "Critical Out of Stock" if p.stock == 0 else "Low Stock Warning",
                                "action_url": f"/products/edit/{p.id}"
                            }
                            for p in low_stock
                        ],
                        "action_url": "/products/manage"
                    },
                    "suggested_followups": [
                        "Create 15% clearance coupon",
                        "Show store sales summary",
                        "View active coupons",
                        "Show dog food stock"
                    ],
                    "provider": "sidekick_action_engine"
                }
            except Exception as e:
                logger.error("Sidekick inventory query error: %s", e)

        # 4. Action: Sales Summary & Executive Store Briefing
        if is_sales:
            try:
                from orders.models import Order
                from products.models import Product
                from django.db.models import Sum, Avg, Count
                from decimal import Decimal

                order_count = Order.objects.count()
                gmv = Order.objects.aggregate(Sum('total_amount'))['total_amount__sum'] or Decimal("0.00")
                aov = Order.objects.aggregate(Avg('total_amount'))['total_amount__avg'] or Decimal("0.00")
                total_products = Product.objects.count()

                return {
                    "response": (
                        f"### 📊 Sidekick Executive Store Briefing\n\n"
                        f"Here is your store's live financial and operational snapshot:\n\n"
                        f"• **Total GMV (Gross Merchandise Value):** ₹{float(gmv):,.2f}\n"
                        f"• **Total Orders Processed:** {order_count} Orders\n"
                        f"• **Average Order Value (AOV):** ₹{float(aov):,.2f}\n"
                        f"• **Active Catalog SKUs:** {total_products} Products live\n\n"
                        f"**Growth Tip from Sidekick:** Introducing a 10% coupon with a ₹999 minimum basket size will systematically drive AOV higher on food & supplement bundles."
                    ),
                    "sources": [
                        {"type": "admin", "title": "Total Orders", "url": "/total-orders"},
                        {"type": "admin", "title": "BI & Analytics Dashboard", "url": "/admin/analytics"}
                    ],
                    "action_card": {
                        "type": "sales_summary",
                        "total_gmv": float(gmv),
                        "total_orders": order_count,
                        "aov": float(aov),
                        "total_products": total_products,
                        "action_url": "/admin/analytics"
                    },
                    "suggested_followups": [
                        "Check low stock products",
                        "Create 10% discount coupon",
                        "View active coupons",
                        "Check pending prescriptions"
                    ],
                    "provider": "sidekick_action_engine"
                }
            except Exception as e:
                logger.error("Sidekick sales query error: %s", e)

        # 5. Action: Clinical Prescription Queue Check
        if is_rx:
            try:
                from prescriptions.models import Prescription
                pending_rx = Prescription.objects.filter(status__in=["Uploaded", "Processing", "NeedsReview"])
                pending_count = pending_rx.count()

                return {
                    "response": (
                        f"### 🩺 Sidekick Clinical Prescription Operations\n\n"
                        f"You currently have **{pending_count} customer prescriptions** awaiting review or automated verification.\n\n"
                        f"• **Pending Review:** {pending_count} Rx files\n"
                        f"• **SLA Target:** < 15 minutes verification\n\n"
                        f"Expediting these verifications will allow pending pharmacy orders to ship immediately."
                    ),
                    "sources": [{"type": "admin", "title": "Prescription Uploads", "url": "/prescriptions"}],
                    "action_card": {
                        "type": "prescription_queue",
                        "pending_count": pending_count,
                        "action_url": "/prescriptions"
                    },
                    "suggested_followups": [
                        "Check low stock medicines",
                        "Summarize store sales",
                        "View active coupons"
                    ],
                    "provider": "sidekick_action_engine"
                }
            except Exception as e:
                logger.error("Sidekick rx queue error: %s", e)

        # 6. Action: Dynamic Product Discovery & Clinical Recommendations (Customer & Merchant)
        catalog_triggers = [
            "recommend", "dog food", "cat food", "joint", "supplement",
            "shampoo", "treat", "deworm", "flea", "tick", "bed", "leash",
            "dental", "skin", "coat", "puppy", "kitten"
        ]
        if any(tr in q for tr in catalog_triggers):
            try:
                from products.models import Product
                from django.db.models import Q

                terms = [w for w in q.split() if len(w) > 3 and w not in ["recommend", "show", "what", "have", "please", "some", "best", "good"]]
                filter_q = Q()
                for t in terms:
                    filter_q |= Q(product_name__icontains=t) | Q(description__icontains=t) | Q(product_type__icontains=t)

                matched_products = Product.objects.filter(filter_q).filter(is_available=True)[:4]
                if not matched_products.exists():
                    matched_products = Product.objects.filter(is_available=True)[:4]

                if matched_products.exists():
                    prod_cards = []
                    text_lines = []
                    for p in matched_products:
                        img_url = p.image.url if p.image else "/placeholder-product.png"
                        prod_cards.append({
                            "id": p.id,
                            "name": p.product_name,
                            "price": float(p.price),
                            "image": img_url,
                            "pet_type": p.pet_type,
                            "product_type": p.product_type,
                            "stock": p.stock,
                            "action_url": f"/products/{p.id}"
                        })
                        text_lines.append(f"• **{p.product_name}** — ₹{p.price:.2f} ({p.pet_type} • Stock: {p.stock})")

                    prod_md = "\n".join(text_lines)

                    return {
                        "response": (
                            f"### 🛍️ Sidekick Catalog Recommendations\n\n"
                            f"Here are the top matches from our verified veterinary and pet healthcare catalog:\n\n"
                            f"{prod_md}\n\n"
                            f"Click any product below to view full details or add to cart:"
                        ),
                        "sources": [{"type": "product", "title": p["name"], "url": p["action_url"]} for p in prod_cards],
                        "action_card": {
                            "type": "product_recommendations",
                            "products": prod_cards
                        },
                        "suggested_followups": [
                            "Check available coupons",
                            "Check low stock products",
                            "What is your return policy?"
                        ],
                        "provider": "sidekick_action_engine"
                    }
            except Exception as e:
                logger.error("Sidekick catalog search error: %s", e)

        return None

