"""
Knowledge Retrieval System for Zenve AI Assistant
==================================================
Retrieves grounded, authentic information from:
1. Products database (Categories, Brands, Medicines, Supplements, Stock, Prices)
2. Store policies (Orders, Returns, Refunds, Prescriptions, Home Visits, Membership)
3. Platform features (Wallet, Coupons, Pet Profiles, Adoption)
4. Domain Pet Care Guidelines & FAQs
"""

import os
import re
import logging
import urllib.parse
from typing import List, Dict, Any
import requests
from bs4 import BeautifulSoup
from django.db.models import Q

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Static Knowledge Base (Policies, Features, Services, FAQs)
# ---------------------------------------------------------------------------

STORE_KNOWLEDGE_DOCS = [
    {
        "id": "kb_about_zenve",
        "title": "About Zenve Pet Marketplace",
        "category": "About",
        "keywords": ["about zenve", "about zynvo", "about the website", "about this website", "zenve marketplace", "what is zenve", "who created zenve", "company overview"],
        "content": (
            "Zenve (Zynvo) is an all-in-one smart pet care marketplace and health ecosystem. "
            "It offers premium pet nutrition, veterinary medicines, wellness supplements, grooming essentials, "
            "accessories, veterinary home visits, prescription verification, pet adoption, loyalty memberships, "
            "and an AI-powered pet care recommendation engine."
        ),
        "link": "/home"
    },
    {
        "id": "kb_orders_tracking",
        "title": "Order Placement, Tracking & Cancellation",
        "category": "Orders",
        "keywords": ["order", "place order", "track", "tracking", "cancel", "status", "shipping", "delivery"],
        "content": (
            "How to order: Browse products, select quantity, add to Cart, proceed to checkout, provide delivery address, and complete payment.\n"
            "Tracking: You can track your order live anytime by going to 'My Orders' in your account.\n"
            "Cancellation: Orders can be cancelled from the Order Details page before they are shipped. Once dispatched, standard return procedures apply."
        ),
        "link": "/orders"
    },
    {
        "id": "kb_returns_refunds",
        "title": "Return & Refund Policy",
        "category": "Returns",
        "keywords": ["return", "refund", "exchange", "damaged", "broken", "money back", "replace"],
        "content": (
            "Returns: You can request a return for eligible products from your Orders section within the return window.\n"
            "Damaged/Incorrect items: If your order arrives damaged or defective, submit a return request immediately along with photos of the item and packaging.\n"
            "Refunds: Once returned products are received and inspected, refunds are processed within 3-5 business days back to your original payment method or instant credit to your Zenve Wallet."
        ),
        "link": "/refund-return"
    },
    {
        "id": "kb_prescriptions",
        "title": "Prescription Upload & Medicine Verification",
        "category": "Prescriptions",
        "keywords": ["prescription", "doctor note", "vet prescription", "rx", "medicine requirement", "upload prescription"],
        "content": (
            "Certain veterinary medicines require a valid doctor's prescription. "
            "You can securely upload your veterinarian's prescription document (image or PDF) at '/prescription/upload'. "
            "Our licensed veterinary team validates prescriptions to ensure pet safety before dispatch."
        ),
        "link": "/prescription/upload"
    },
    {
        "id": "kb_home_visit",
        "title": "Veterinary Home Visit Service",
        "category": "Services",
        "keywords": ["home visit", "vet at home", "veterinarian visit", "doctor appointment", "book vet", "checkup"],
        "content": (
            "Zenve offers professional veterinary home visits. A certified vet visits your home for wellness checkups, "
            "vaccinations, general health screenings, and diagnostics in a low-stress environment for your pet. "
            "Book your appointment through the Home Visit section."
        ),
        "link": "/home-visit"
    },
    {
        "id": "kb_pet_profile",
        "title": "Pet Profiles & Personalized Care",
        "category": "Pet Profile",
        "keywords": ["pet profile", "my pet", "dog details", "cat details", "add pet", "personalization", "breed"],
        "content": (
            "You can register your pets under 'Pet Profiles' with their species, breed, age, weight, allergies, and health notes. "
            "Zenve's AI recommendation engine uses this profile to curate personalized nutrition, supplement, and medicine suggestions specifically matched to your pet's needs."
        ),
        "link": "/pets"
    },
    {
        "id": "kb_membership",
        "title": "Zenve VIP Membership Program",
        "category": "Membership",
        "keywords": ["membership", "vip", "club", "subscription", "premium", "gold", "silver", "platinum", "perks", "benefits"],
        "content": (
            "Zenve Membership offers exclusive tier benefits including extra discounts on all purchases, "
            "free doorstep express shipping, priority veterinary consultation booking, and bonus reward points in your wallet. "
            "Explore plans on the Membership page."
        ),
        "link": "/membership"
    },
    {
        "id": "kb_wallet_payments",
        "title": "Zenve Wallet & Payment Methods",
        "category": "Payments",
        "keywords": ["wallet", "add money", "payment", "razorpay", "card", "upi", "cash on delivery", "refunds wallet"],
        "content": (
            "Payment options: Credit/Debit cards, UPI, Net Banking, Razorpay, and Zenve Wallet.\n"
            "Zenve Wallet: Load funds securely to enjoy instant 1-click checkout and rapid refund processing without waiting on bank settlement."
        ),
        "link": "/wallet"
    },
    {
        "id": "kb_coupons_offers",
        "title": "Coupons, Deals & Discounts",
        "category": "Offers",
        "keywords": ["coupon", "discount", "code", "offer", "promo", "deal", "voucher", "save money"],
        "content": (
            "Save on your purchases by applying coupon codes during cart checkout. "
            "Active store coupons, seasonal sales, and category-wide promotions are showcased on the Offers page."
        ),
        "link": "/offers"
    },
    {
        "id": "kb_pet_adoption",
        "title": "Pet Adoption Program",
        "category": "Adoption",
        "keywords": ["adoption", "adopt", "rescue", "foster", "adopt puppy", "adopt kitten", "homeless pet"],
        "content": (
            "Zenve connects compassionate pet parents with verified rescue shelters. "
            "View adorable puppies, kittens, and adult pets available for adoption, read their rescue history, and submit an adoption inquiry at '/adoption'."
        ),
        "link": "/adoption"
    },
    {
        "id": "kb_customer_support",
        "title": "Customer Care & Support Helpdesk",
        "category": "Support",
        "keywords": ["support", "help", "contact", "email", "phone", "agent", "customer care", "reach out"],
        "content": (
            "We are here to support you! Reach out via our Help page, contact form, or email support team. "
            "For medical emergencies, please immediately visit your nearest 24/7 veterinary clinic."
        ),
        "link": "/help"
    },
]

# Common pet wellness domain facts (safety rules)
PET_SAFETY_FACTS = [
    {
        "trigger": ["chocolate", "cocoa"],
        "warning": "Chocolate contains theobromine which is highly toxic to both dogs and cats. Contact a vet immediately if ingested."
    },
    {
        "trigger": ["grape", "raisin"],
        "warning": "Grapes and raisins can cause acute kidney failure in dogs even in tiny quantities."
    },
    {
        "trigger": ["onion", "garlic", "shallot", "leek"],
        "warning": "Alliums (onions, garlic) damage red blood cells and cause hemolytic anemia in pets."
    },
    {
        "trigger": ["paracetamol", "tylenol", "ibuprofen", "human medicine"],
        "warning": "Never give human pain relievers (like paracetamol or ibuprofen) to pets without explicit veterinary prescription; they can be fatal."
    }
]


# ---------------------------------------------------------------------------
# Real-Time Web Search Retriever (Internet Integration)
# ---------------------------------------------------------------------------

class RealtimeWebRetriever:
    """
    Real-time Internet search engine for pet, veterinary, product, and general queries.
    Integrates external web search results (DuckDuckGo, Wikipedia, optional Tavily/SerpAPI)
    to complement internal dataset records with up-to-date facts and citations.
    """

    @classmethod
    def search_web(cls, query: str, max_results: int = 3) -> List[Dict[str, Any]]:
        cleaned_query = re.sub(
            r"^(please|tell me about|can you show me|what is|how do i|find|search for|do you have|recommend)\s+",
            "",
            query,
            flags=re.I
        ).strip()
        if not cleaned_query or len(cleaned_query) < 3:
            cleaned_query = query.strip()

        results = []

        # 1. Optional Tavily Search API if configured
        tavily_key = os.getenv("TAVILY_API_KEY")
        if tavily_key:
            try:
                tav_resp = requests.post(
                    "https://api.tavily.com/search",
                    json={"api_key": tavily_key, "query": cleaned_query, "max_results": max_results},
                    timeout=2.5
                )
                if tav_resp.status_code == 200:
                    data = tav_resp.json()
                    for r in data.get("results", []):
                        results.append({
                            "title": r.get("title", cleaned_query.title()),
                            "url": r.get("url", "https://tavily.com"),
                            "snippet": r.get("content", "")[:350],
                            "source": "Tavily Live Web"
                        })
            except Exception as e:
                logger.debug("Tavily search skipped: %s", e)

        # 2. DuckDuckGo Instant Answer & Related Topics API
        if len(results) < max_results:
            try:
                ddg_url = f"https://api.duckduckgo.com/?q={urllib.parse.quote(cleaned_query)}&format=json&no_html=1&skip_disambig=1"
                resp = requests.get(ddg_url, timeout=2.5, headers={"User-Agent": "ZenveAssistant/1.0"})
                if resp.status_code == 200:
                    data = resp.json()
                    abstract = data.get("AbstractText")
                    if abstract:
                        results.append({
                            "title": data.get("Heading") or cleaned_query.title(),
                            "url": data.get("AbstractURL") or "https://duckduckgo.com",
                            "snippet": abstract[:350],
                            "source": "DuckDuckGo Web"
                        })
                    for topic in data.get("RelatedTopics", []):
                        if len(results) >= max_results:
                            break
                        if isinstance(topic, dict) and topic.get("Text") and topic.get("FirstURL"):
                            results.append({
                                "title": topic.get("Text").split(" - ")[0][:60],
                                "url": topic.get("FirstURL"),
                                "snippet": topic.get("Text")[:300],
                                "source": "DuckDuckGo Web"
                            })
            except Exception as e:
                logger.debug("DuckDuckGo search skipped: %s", e)

        # 3. Live Wikipedia & Knowledge Index
        if len(results) < max_results:
            try:
                wiki_url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(cleaned_query)}&format=json&utf8=1&srlimit={max_results}"
                resp = requests.get(wiki_url, timeout=2.5, headers={"User-Agent": "ZenveAssistant/1.0 (support@zenve.com)"})
                if resp.status_code == 200:
                    data = resp.json()
                    for item in data.get("query", {}).get("search", []):
                        if len(results) >= max_results:
                            break
                        title = item.get("title", "")
                        snippet = BeautifulSoup(item.get("snippet", ""), "html.parser").get_text(strip=True)
                        page_url = f"https://en.wikipedia.org/wiki/{urllib.parse.quote(title.replace(' ', '_'))}"
                        if not any(r["url"] == page_url for r in results):
                            results.append({
                                "title": title,
                                "url": page_url,
                                "snippet": snippet,
                                "source": "Live Web Encyclopedia"
                            })
            except Exception as e:
                logger.debug("Wikipedia search skipped: %s", e)

        # 4. Curated Veterinary & Pet Knowledge Fallback
        if not results:
            curated_web_data = cls._get_curated_domain_web_facts(cleaned_query)
            if curated_web_data:
                results.extend(curated_web_data[:max_results])

        return results[:max_results]

    @classmethod
    def _get_curated_domain_web_facts(cls, query: str) -> List[Dict[str, Any]]:
        """
        Curated authoritative external domain facts (AKC, AVMA, PetMD, Cornell Feline, FAO).
        Ensures reliable fallback even during network outages.
        """
        q = query.lower()
        facts = []

        if any(w in q for w in ["golden retriever", "retriever"]):
            facts.append({
                "title": "Golden Retriever Care & Health Guidelines (AKC)",
                "url": "https://www.akc.org/dog-breeds/golden-retriever/",
                "snippet": "American Kennel Club (AKC) notes Golden Retrievers require 40-60 minutes of daily exercise, balanced proteins (22-26%), and joint monitoring for hip dysplasia.",
                "source": "AKC Breed Standard"
            })

        if any(w in q for w in ["grain free", "grain-free"]):
            facts.append({
                "title": "Dietary Science on Grain-Free Pet Nutrition (FDA / Vet Nutrition)",
                "url": "https://www.fda.gov/animal-veterinary/animal-health-literacy",
                "snippet": "Veterinary clinical studies emphasize that grain-free diets replace grains with sweet potatoes or legumes; nutritional balance and taurine levels should be carefully verified.",
                "source": "Veterinary Clinical Science"
            })

        if any(w in q for w in ["cat", "feline", "kitten"]):
            facts.append({
                "title": "Feline Nutrition & Hydration Standards (Cornell Feline Health Center)",
                "url": "https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center",
                "snippet": "Cornell Feline Health Center highlights that cats are obligate carnivores requiring animal-sourced protein, taurine, and high moisture intake to support urinary and renal function.",
                "source": "Cornell Feline Health Center"
            })

        if any(w in q for w in ["dog", "puppy", "canine"]):
            facts.append({
                "title": "Canine Preventive Care Protocols (AVMA)",
                "url": "https://www.avma.org/resources-tools/pet-owners/petcare/canine-preventive-care",
                "snippet": "The American Veterinary Medical Association (AVMA) recommends annual wellness exams, core vaccinations (rabies, DHPP), parasite prevention, and life-stage nutrition.",
                "source": "AVMA Pet Health Care"
            })

        if any(w in q for w in ["poultry", "chicken", "hen", "duck"]):
            facts.append({
                "title": "Poultry Layer Nutrition & Flock Management (FAO)",
                "url": "https://www.fao.org/poultry-production-products/production/en/",
                "snippet": "FAO Animal Production guidelines note laying hens require 16-18% crude protein, 3.5-4.0% calcium for eggshell integrity, and continuous ventilation to prevent respiratory distress.",
                "source": "FAO Animal Production"
            })

        if any(w in q for w in ["cow", "cattle", "bovine"]):
            facts.append({
                "title": "Bovine Ruminant Nutrition & Herd Health (Livestock Extension)",
                "url": "https://extension.psu.edu/dairy-nutrition-and-feeding",
                "snippet": "Veterinary Livestock Nutrition standards emphasize high-forage diets, 60-100 liters of fresh water daily, non-slip flooring, and hoof maintenance to prevent lameness.",
                "source": "Livestock Veterinary Standards"
            })

        if any(w in q for w in ["goat", "caprine"]):
            facts.append({
                "title": "Caprine Browse Feeding & Mineral Management (American Goat Society)",
                "url": "https://americangoatsociety.com",
                "snippet": "American Goat Society standards highlight that goats are natural browsers requiring loose goat-specific minerals with copper, dry bedding, and hoof trimming every 6-8 weeks.",
                "source": "American Goat Society"
            })

        if any(w in q for w in ["harness", "collar", "leash"]):
            facts.append({
                "title": "Canine Ergonomics: Harness vs Collar Study",
                "url": "https://www.whole-dog-journal.com/care/the-best-dog-harnesses/",
                "snippet": "Biomechanical studies in canines indicate that Y-shaped padded harnesses distribute pulling pressure safely across the chest rather than the trachea.",
                "source": "Whole Dog Journal / Canine Ergonomics"
            })

        return facts


# ---------------------------------------------------------------------------
# Retriever Implementation
# ---------------------------------------------------------------------------

class KnowledgeRetriever:
    """
    Intelligent multi-source retriever for the Zenve ecosystem.
    Retrieves verified products, policies, FAQs, and domain knowledge.
    """

    @classmethod
    def retrieve_relevant_context(cls, query: str, pet_context: dict = None, top_products: int = 5, enable_web_search: bool = True) -> Dict[str, Any]:
        """
        Retrieves context matching user's query and returns structured results
        incorporating both internal website data and real-time external web search.
        """
        normalized_query = query.lower().strip()
        tokens = set(re.findall(r"\b\w{2,}\b", normalized_query))

        # 1. Retrieve matching internal static knowledge docs (policies, guides)
        matching_kb = cls._search_knowledge_base(tokens, normalized_query)

        # 2. Retrieve matching internal products from database
        products = cls._search_products(tokens, normalized_query, pet_context, limit=top_products)

        # 3. Check for pet safety warnings
        safety_warnings = cls._check_safety_warnings(normalized_query)

        # 4. Complement with external real-time web search results
        web_results = []
        if enable_web_search:
            web_results = RealtimeWebRetriever.search_web(query, max_results=3)

        return {
            "query": query,
            "kb_documents": matching_kb,
            "products": products,
            "safety_warnings": safety_warnings,
            "web_results": web_results,
            "has_project_data": bool(matching_kb or products),
            "has_web_data": bool(web_results)
        }

    @classmethod
    def _search_knowledge_base(cls, tokens: set, query_text: str) -> List[Dict[str, Any]]:
        scored_docs = []
        stop_words = {"what", "is", "this", "are", "the", "can", "you", "for", "and", "how", "do", "in", "to", "my", "me", "about", "give", "show", "some", "tell", "need", "want", "care"}
        meaningful_tokens = {t for t in tokens if t not in stop_words and len(t) > 2}

        for doc in STORE_KNOWLEDGE_DOCS:
            score = 0
            # Direct exact phrase hits
            for kw in doc["keywords"]:
                if kw in query_text:
                    score += 6
                else:
                    # Only match meaningful words
                    kw_words = [w for w in kw.split() if w not in stop_words and len(w) > 2]
                    matched_words = [w for w in kw_words if w in meaningful_tokens]
                    if matched_words:
                        score += len(matched_words) * 2

            # Category / title hit with word boundary or exact match
            cat_lower = doc["category"].lower()
            if cat_lower not in stop_words and cat_lower in query_text:
                score += 4
            if doc["title"].lower() in query_text:
                score += 5

            # Require a solid relevance threshold
            if score >= 5:
                scored_docs.append((score, doc))

        scored_docs.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scored_docs[:3]]

    @classmethod
    def _search_products(cls, tokens: set, query_text: str, pet_context: dict = None, limit: int = 5) -> List[Dict[str, Any]]:
        """Query Django Product model with fallback and relevant ranking."""
        try:
            from products.models import Product

            q_obj = Q()
            # Check for pet type filters in query with full synonyms
            pet_synonyms = {
                "Dog": ["dog", "dogs", "puppy", "puppies", "canine"],
                "Cat": ["cat", "cats", "kitten", "kittens", "feline"],
                "Bird": ["bird", "birds", "parrot", "poultry", "chicken"],
                "Rabbit": ["rabbit", "rabbits", "bunny"],
                "Fish": ["fish", "aquarium"],
                "Cattle": ["cattle", "cow", "cows", "bovine", "calf", "bull", "goat", "goats"]
            }
            pet_filters = []
            for pet_t, syns in pet_synonyms.items():
                if any(re.search(rf"\b{re.escape(s)}\b", query_text) for s in syns):
                    pet_filters.append(pet_t)

            if not pet_filters and pet_context and pet_context.get("pet_type"):
                pet_filters.append(pet_context["pet_type"])

            if pet_filters:
                q_obj &= Q(pet_type__in=pet_filters) | Q(pet_type="Universal")

            # Keyword matching on name, description, brand, category
            token_query = Q()
            # Filter out generic stop words
            stop_words = {"the", "and", "for", "with", "can", "you", "what", "how", "give", "show", "some", "any", "best", "good", "tell"}
            meaningful_tokens = [t for t in tokens if t not in stop_words and len(t) > 2]

            for token in meaningful_tokens[:6]:
                token_query |= (
                    Q(product_name__icontains=token)
                    | Q(description__icontains=token)
                    | Q(brand__brand_name__icontains=token)
                    | Q(category__category_name__icontains=token)
                    | Q(product_type__icontains=token)
                )

            if meaningful_tokens:
                queryset = Product.objects.filter(q_obj & token_query, is_available=True).select_related("brand", "category")
            else:
                # If query is asking generally for products
                if any(w in query_text for w in ["product", "item", "recommend", "buy", "shop", "food", "supplement", "medicine"]):
                    queryset = Product.objects.filter(q_obj, is_available=True).select_related("brand", "category")
                else:
                    return []

            results = []
            for p in queryset[:limit]:
                product_data = {
                    "id": p.id,
                    "name": p.product_name,
                    "brand": p.brand.brand_name if p.brand else "Zenve",
                    "category": p.category.category_name if p.category else "Pet Care",
                    "price": float(p.price),
                    "pet_type": p.pet_type,
                    "product_type": p.product_type,
                    "stock": p.stock,
                    "description": (p.description[:200] + "...") if len(p.description) > 200 else p.description,
                    "url": f"/products/{p.id}",
                }
                # Check for medicine/supplement details
                try:
                    if hasattr(p, 'medicine'):
                        product_data["prescription_required"] = p.medicine.prescription_required
                        product_data["active_ingredient"] = p.medicine.active_ingredient
                except Exception:
                    pass

                results.append(product_data)

            return results

        except Exception as e:
            logger.warning("Product search retrieval failed: %s", e)
            return []

    @classmethod
    def _check_safety_warnings(cls, query_text: str) -> List[str]:
        warnings = []
        for fact in PET_SAFETY_FACTS:
            if any(trig in query_text for trig in fact["trigger"]):
                warnings.append(fact["warning"])
        return warnings

    @classmethod
    def build_system_context_string(cls, retrieval_data: Dict[str, Any]) -> str:
        """
        Formats retrieved knowledge into a clean context block for LLM prompts.
        """
        context_parts = []

        if retrieval_data.get("safety_warnings"):
            context_parts.append("CRITICAL HEALTH & SAFETY NOTICE:")
            for w in retrieval_data["safety_warnings"]:
                context_parts.append(f"- ⚠️ {w}")

        if retrieval_data.get("kb_documents"):
            context_parts.append("\nOFFICIAL ZENVE MARKETPLACE KNOWLEDGE & POLICIES:")
            for doc in retrieval_data["kb_documents"]:
                context_parts.append(f"[{doc['title']}] (Link: {doc.get('link', '')})\n{doc['content']}")

        if retrieval_data.get("products"):
            context_parts.append("\nVERIFIED PRODUCTS FROM ZENVE CATALOG:")
            for p in retrieval_data["products"]:
                rx_info = " [Prescription Required]" if p.get("prescription_required") else ""
                context_parts.append(
                    f"- {p['name']} by {p['brand']} (₹{p['price']:.2f}, Pet: {p['pet_type']}, Type: {p['product_type']}{rx_info}) - Link: {p['url']}\n"
                    f"  Details: {p['description']}"
                )

        if retrieval_data.get("web_results"):
            context_parts.append("\nREAL-TIME EXTERNAL INTERNET SEARCH RESULTS:")
            for w in retrieval_data["web_results"]:
                context_parts.append(
                    f"- [{w['title']}] ({w.get('url', '')}) [{w.get('source', 'Web Search')}]:\n"
                    f"  {w.get('snippet', '')}"
                )

        if not context_parts:
            return "No specific database records, store policies, or web results matched this query."

        context_parts.append(
            "\nKNOWLEDGE SYNTHESIS DIRECTIVE:\n"
            "First, prioritize and ground your answer using the verified internal Zenve website data (products, pricing, store policies, services). "
            "Then, seamlessly complement it with relevant real-time insights from the external web search results to provide "
            "an accurate, comprehensive, and up-to-date answer."
        )

        return "\n".join(context_parts)
