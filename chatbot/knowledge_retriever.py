"""
Knowledge Retrieval System for Zenve AI Assistant
==================================================
Retrieves grounded, authentic information from:
1. Products database (Categories, Brands, Medicines, Supplements, Stock, Prices)
2. Store policies (Orders, Returns, Refunds, Prescriptions, Home Visits, Membership)
3. Platform features (Wallet, Coupons, Pet Profiles, Adoption)
4. Domain Pet Care Guidelines & FAQs
"""

import re
import logging
from typing import List, Dict, Any
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
        "keywords": ["zenve", "zynvo", "website", "platform", "marketplace", "about", "company", "who are you", "what is this"],
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
# Retriever Implementation
# ---------------------------------------------------------------------------

class KnowledgeRetriever:
    """
    Intelligent multi-source retriever for the Zenve ecosystem.
    Retrieves verified products, policies, FAQs, and domain knowledge.
    """

    @classmethod
    def retrieve_relevant_context(cls, query: str, pet_context: dict = None, top_products: int = 5) -> Dict[str, Any]:
        """
        Retrieves context matching user's query and returns structured results.
        """
        normalized_query = query.lower().strip()
        tokens = set(re.findall(r"\b\w{2,}\b", normalized_query))

        # 1. Retrieve matching static knowledge docs (policies, guides)
        matching_kb = cls._search_knowledge_base(tokens, normalized_query)

        # 2. Retrieve matching products from database
        products = cls._search_products(tokens, normalized_query, pet_context, limit=top_products)

        # 3. Check for pet safety warnings
        safety_warnings = cls._check_safety_warnings(normalized_query)

        return {
            "query": query,
            "kb_documents": matching_kb,
            "products": products,
            "safety_warnings": safety_warnings,
            "has_project_data": bool(matching_kb or products)
        }

    @classmethod
    def _search_knowledge_base(cls, tokens: set, query_text: str) -> List[Dict[str, Any]]:
        scored_docs = []
        for doc in STORE_KNOWLEDGE_DOCS:
            score = 0
            # Direct keyword hits
            for kw in doc["keywords"]:
                if kw in query_text:
                    score += 5
                elif any(t in kw.split() for t in tokens):
                    score += 2

            # Category / title hit
            if doc["category"].lower() in query_text:
                score += 3
            if doc["title"].lower() in query_text:
                score += 4

            if score > 0:
                scored_docs.append((score, doc))

        scored_docs.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scored_docs[:3]]

    @classmethod
    def _search_products(cls, tokens: set, query_text: str, pet_context: dict = None, limit: int = 5) -> List[Dict[str, Any]]:
        """Query Django Product model with fallback and relevant ranking."""
        try:
            from products.models import Product

            q_obj = Q()
            # Check for pet type filters in query
            pet_filters = []
            for pet_t in ["Dog", "Cat", "Bird", "Rabbit", "Fish", "Cattle"]:
                if pet_t.lower() in query_text:
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

        if not context_parts:
            return "No specific database records or policies matched this query."

        return "\n".join(context_parts)
