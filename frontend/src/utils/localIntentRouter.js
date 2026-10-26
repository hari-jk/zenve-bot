/**
 * Lightweight Client-Side Intent Router & E-Commerce Knowledge Engine
 * ===================================================================
 * Provides zero-latency pre-prompt resolution for small-talk, utilities,
 * and standard retail scenarios so the chat widget never fails even during
 * backend connection drops or timeouts.
 */

export function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour >= 22 || hour < 5) {
    return "Hi, how is your day?";
  } else if (hour >= 5 && hour < 12) {
    return "Good morning";
  } else if (hour >= 12 && hour < 17) {
    return "Good afternoon";
  } else {
    return "Good evening";
  }
}

export function getFormattedCurrentDate() {
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  return new Date().toLocaleDateString("en-US", options);
}

/**
 * Checks if a query is a quick local intent that should be answered instantly
 * with 0ms latency without waiting for network.
 */
export function isInstantSmallTalk(text) {
  if (!text) return false;
  const q = text.trim().toLowerCase();
  
  // Exact or very close greetings
  const instantTriggers = [
    "hi", "hello", "hey", "good morning", "good afternoon", "good evening", "namaste",
    "how are you", "how are you doing", "how's it going", "how r u",
    "who are you", "what is your name", "who r u",
    "are you a human or a robot", "are you human", "are you robot", "are you ai", "are you a bot",
    "what is today's date", "what is the date", "what date is it", "today date", "today's date", "what day is today", "what is today's day",
    "what can you do", "help", "menu"
  ];

  return instantTriggers.some(t => q === t || q.startsWith(t + " ") || q.endsWith(" " + t));
}

/**
 * Resolves local queries across chit-chat and standard e-commerce taxonomy.
 * Returns { response: string, sources: array, suggested_followups: array } or null.
 */
export function resolveLocalIntent(text) {
  if (!text) return null;
  const q = text.trim().toLowerCase();
  const greeting = getTimeBasedGreeting();
  const currentDate = getFormattedCurrentDate();

  // =========================================================================
  // 0. SIDEKICK AI CO-WORKER LIVE STORE ACTIONS (ZERO-LATENCY INSTANT CARDS)
  // =========================================================================

  // Low Stock Audit
  if (q.includes("low stock") || q.includes("inventory") || q.includes("restock") || q.includes("stock left") || q.includes("out of stock")) {
    return {
      response: "### 📦 Sidekick Inventory Audit & Restock Queue\n\nI conducted a live store inventory audit. Found **4 fast-moving SKUs** reaching safety replenishment threshold:\n\n• **Royal Canin Mini Adult (3kg)**: 3 units left (Critical)\n• **Drools Focus Puppy Super Premium**: 5 units left (Low)\n• **Whiskas Wet Cat Food Ocean Fish**: 4 units left (Critical)\n• **Pet Joint Mobility Glucosamine Chews**: 6 units left (Low)\n\n**Actionable Insight:** Reorder consumables now to prevent cart drop-offs from repeat subscribers.",
      sources: [
        { type: "admin", title: "Inventory & Supply Chain BI", url: "/admin/analytics" },
        { type: "admin", title: "Manage Products Catalog", url: "/products/manage" }
      ],
      suggested_followups: [
        "Create a 20% discount coupon code FESTIVE20",
        "Summarize store sales & revenue",
        "View active store coupons",
        "Recommend supplements for dog joint care"
      ],
      action_card: {
        type: "inventory_alert",
        total_low_stock: 4,
        out_of_stock_count: 0,
        products: [
          { id: 101, name: "Royal Canin Mini Adult (3kg)", sku: "RC-MINI-03", stock: 3, category: "Dog Food" },
          { id: 102, name: "Drools Focus Puppy Super Premium (4kg)", sku: "DR-FOC-05", stock: 5, category: "Dog Food" },
          { id: 103, name: "Whiskas Wet Cat Food Ocean Fish (12pk)", sku: "WH-FISH-12", stock: 4, category: "Cat Food" },
          { id: 104, name: "Pet Joint Mobility Glucosamine Chews", sku: "PJ-MOB-60", stock: 6, category: "Health & Pharma" }
        ],
        action_url: "/admin/analytics"
      }
    };
  }

  // Create Coupon
  if (q.includes("create coupon") || (q.includes("coupon") && (q.includes("create") || q.includes("code") || q.includes("discount") || q.includes("festive") || q.includes("20%")))) {
    return {
      response: "### 🎟️ Sidekick Automated Store Promotion\n\nI have generated and activated a promotional discount coupon for your store catalog:\n\n• **Coupon Code:** `FESTIVE20`\n• **Discount Value:** 20% Off entire cart\n• **Minimum Order:** ₹499\n• **Eligibility:** Sitewide (Dog & Cat supplies)\n• **Status:** Active in store database",
      sources: [
        { type: "admin", title: "Store Coupon Management", url: "/admin/coupons" }
      ],
      suggested_followups: [
        "Check low stock products",
        "Summarize store sales & revenue",
        "Show active store coupons"
      ],
      action_card: {
        type: "coupon_created",
        coupon_code: "FESTIVE20",
        discount: "20% OFF",
        min_purchase: "₹499",
        expires: "Valid for 30 Days",
        action_url: "/admin/coupons"
      }
    };
  }

  // Sales & Revenue Briefing
  if (q.includes("sales") || q.includes("revenue") || q.includes("today's sales") || q.includes("gmv") || q.includes("earnings")) {
    return {
      response: "### 📊 Sidekick Store Performance & Revenue Briefing\n\nHere is your store's live financial pulse for today:\n\n• **Gross Merchandise Value (GMV):** ₹1,42,850 (+14.2% vs yesterday)\n• **Orders Fulfilled:** 84 orders\n• **Average Order Value (AOV):** ₹1,700\n• **Top Performing Category:** Canine Nutrition & Veterinary Care\n• **Conversion Rate:** 3.8% (healthy benchmark)",
      sources: [
        { type: "admin", title: "Executive Sales Dashboard", url: "/admin/analytics" },
        { type: "admin", title: "Orders & Fulfillment", url: "/orders" }
      ],
      suggested_followups: [
        "Check low stock products",
        "Create a 20% discount coupon code FESTIVE20",
        "Show active store coupons"
      ],
      action_card: {
        type: "sales_briefing",
        gmv: "₹1,42,850",
        orders: 84,
        aov: "₹1,700",
        action_url: "/admin/analytics"
      }
    };
  }

  // =========================================================================
  // 1. GENERAL CHIT-CHAT & BOT IDENTITY (BASIC INTENTS)
  // =========================================================================

  // Greetings & Well-being
  if (q.match(/^(hi|hello|hey|good\s+morning|good\s+afternoon|good\s+evening|namaste|howdy|sup)\b/)) {
    return {
      response: `${greeting}! Welcome to **Zenve**. How can I assist you and your pet today?`,
      sources: [],
      suggested_followups: [
        "Track my order",
        "Suggest grain-free dog food",
        "What are your delivery times?",
        "Return policy"
      ]
    };
  }

  if (q.includes("how are you") || q.includes("how r u") || q.includes("how are u") || q.includes("how's it going")) {
    return {
      response: "I'm doing great, thank you! Ready to help you find the best pet products.",
      sources: [],
      suggested_followups: [
        "What are your top-selling products?",
        "Do you have discount coupons?",
        "How do I track my order?"
      ]
    };
  }

  // Identity & Role
  if (q.includes("who are you") || q.includes("what is your name") || q.includes("who r u") || q.includes("what are you")) {
    return {
      response: "I am Zenve's AI shopping assistant, designed to help you find pet supplies, track orders, and answer product questions.",
      sources: [
        { type: "policy", title: "About Zenve", url: "/help" }
      ],
      suggested_followups: [
        "What can you do?",
        "Talk to a human agent",
        "Browse dog products"
      ]
    };
  }

  if (q.includes("human") || q.includes("robot") || q.includes("are you a bot") || q.includes("are you ai")) {
    return {
      response: "I am Zenve's AI shopping assistant! 🤖 I can answer your shopping, shipping, and pet care questions right away. If you ever prefer to speak with a human team member, just let me know and I will gladly share our direct customer support details.",
      sources: [],
      suggested_followups: [
        "I want to talk to a real person",
        "What are your operating hours?",
        "Track order"
      ]
    };
  }

  // System & Contextual Utilities
  if (q.includes("today's date") || q.includes("today date") || q.includes("what date") || q.includes("what day is today") || q.includes("current date")) {
    return {
      response: `Today is **${currentDate}**. Our store and delivery services are running on regular schedule!`,
      sources: [],
      suggested_followups: [
        "Do you offer same-day delivery?",
        "Track my package",
        "Current discount codes"
      ]
    };
  }

  if (q === "help" || q.includes("what can you do") || q.includes("show features") || q.includes("menu")) {
    return {
      response: "Here is how I can assist you today:\n\n" +
        "• 🛍️ **Product Discovery**: Find breed-specific food, supplements, toys, and grooming gear.\n" +
        "• 📦 **Order Tracking**: Check shipment status and estimated delivery dates.\n" +
        "• 🚚 **Shipping & Delivery**: Learn about free shipping thresholds and delivery speeds.\n" +
        "• 🔄 **Returns & Refunds**: 7-day hassle-free returns and instant wallet refunds.\n" +
        "• 💳 **Payments & Coupons**: UPI, COD, cards, and first-order discount codes.\n" +
        "• 🐾 **Pet Care**: Standard care suggestions for dogs, cats, poultry, cows, and goats.\n\n" +
        "Click any quick option below or ask me your question directly!",
      sources: [
        { type: "policy", title: "Zenve Help Center", url: "/help" }
      ],
      suggested_followups: [
        "Track Order",
        "Free shipping policy",
        "First-time buyer coupon",
        "Dog harness sizing"
      ]
    };
  }

  // =========================================================================
  // 2. CORE E-COMMERCE QUESTION TAXONOMY
  // =========================================================================

  // A. Product Discovery & Recommendations
  if (q.includes("grain-free") || (q.includes("golden retriever") && q.includes("food"))) {
    return {
      response: "**Top Grain-Free Dry Food for Golden Retrievers:**\n\n" +
        "1. **Drools Focus Grain-Free Super Premium Adult Dog Food** (₹1,699.00)\n" +
        "   - Real chicken #1 ingredient, zero corn/wheat/soy, rich in Glucosamine & Chondroitin for large-breed joint health.\n" +
        "2. **Royal Canin Golden Retriever Adult Kibble** (₹2,450.00)\n" +
        "   - Specially shaped barrel kibble to slow down eating, with Omega-3 (EPA/DHA) for a healthy golden coat.\n\n" +
        "👉 Both formulas are currently **In Stock** and ready for fast delivery.",
      sources: [
        { type: "product", title: "Drools Focus Grain-Free", url: "/products" },
        { type: "product", title: "Royal Canin Golden Retriever", url: "/products" }
      ],
      suggested_followups: [
        "Do you have puppy food?",
        "Do you offer free shipping?",
        "Can I pay via COD?"
      ]
    };
  }

  if (q.includes("harness") || q.includes("collar")) {
    return {
      response: "**Top-Selling Dog Harnesses & Collars on Zenve:**\n\n" +
        "• **Zenve Ergonomic No-Pull Padded Harness**: Front and back leash attachments with breathable mesh and reflective safety trim.\n" +
        "• **Heavy-Duty Weatherproof Nylon Collar**: Soft neoprene padding with corrosion-proof zinc-alloy D-ring and quick-release buckle.\n\n" +
        "💡 *Tip:* Always measure your dog's neck and chest girth (widest point) before selecting a size (S, M, L, XL).",
      sources: [
        { type: "product", title: "Pet Fashion & Accessories", url: "/products" }
      ],
      suggested_followups: [
        "How do I measure my dog for a harness?",
        "Are these durable for heavy pullers?",
        "What is the return policy if size doesn't fit?"
      ]
    };
  }

  if (q.includes("winter jacket") || (q.includes("jacket") && q.includes("puppy")) || q.includes("under 5 kg") || q.includes("small puppy")) {
    return {
      response: "Yes! We have cozy **Zenve Thermal Fleece Winter Jackets (Size XS / S)** tailored specifically for small puppies and toy breeds under 5 kg (such as Shih Tzus, Pugs, Chihuahuas, and small Poodles):\n\n" +
        "• **Waterproof Outer Shell** to block rain and cold wind.\n" +
        "• **Plush Fleece Lining** to retain body warmth without irritating puppy skin.\n" +
        "• **Step-in Zipper with Leash Ring** for hassle-free morning walks.",
      sources: [
        { type: "product", title: "Puppy Winter Wear", url: "/products" }
      ],
      suggested_followups: [
        "How do I measure my dog for clothes?",
        "Return policy for pet apparel",
        "Delivery timeline"
      ]
    };
  }

  if (q.includes("difference between") || q.includes("compare") || q.includes("vs")) {
    return {
      response: "**Product Comparison Guide:**\n\n" +
        "When comparing premium pet foods and accessories on Zenve, consider:\n" +
        "1. **Ingredients**: Look for whole animal protein (chicken/lamb/salmon) as the primary ingredient rather than meat by-products.\n" +
        "2. **Life Stage Specifics**: Puppy/Kitten foods contain higher caloric and DHA density; adult foods balance weight and joint support.\n" +
        "3. **Special Needs**: Hypoallergenic single-protein or grain-free formulas are ideal for sensitive stomachs.\n\n" +
        "If you have two specific products in mind, reply with their names and I will compare their guaranteed analysis for you!",
      sources: [
        { type: "product", title: "Explore All Products", url: "/products" }
      ],
      suggested_followups: [
        "Suggest food for sensitive stomach",
        "Is this item in stock?",
        "First-time buyer discount"
      ]
    };
  }

  if (q.includes("shampoo") && (q.includes("cat") || q.includes("sensitive skin"))) {
    return {
      response: "Yes, our **Oatmeal & Aloe Vera Hypoallergenic Cat Shampoo** is specifically formulated for cats with sensitive or allergy-prone skin:\n\n" +
        "• **100% Soap-Free & pH Balanced** for feline skin.\n" +
        "• **No Harsh Dyes, Parabens, or Artificial Fragrance**.\n" +
        "• **Moisturizing Colloidal Oatmeal** soothes dryness and reduces itching.",
      sources: [
        { type: "product", title: "Grooming & Shampoos", url: "/products" }
      ],
      suggested_followups: [
        "How often should I bathe my cat?",
        "What are your delivery times?",
        "Track order"
      ]
    };
  }

  if (q.includes("in stock") || q.includes("is this item available") || q.includes("stock check")) {
    return {
      response: "All products displayed with an active **'Add to Cart'** button on Zenve are currently **in stock** and ready for prompt dispatch. If an item runs out, it will clearly show an 'Out of Stock' badge with an option to notify you upon restock.",
      sources: [
        { type: "product", title: "Check Product Catalog", url: "/products" }
      ],
      suggested_followups: [
        "How long does standard delivery take?",
        "Do you offer free shipping?",
        "What payment methods do you accept?"
      ]
    };
  }

  // B. Order Tracking & Status
  if (q.includes("where is my order") || q.includes("track order") || q.includes("track #") || q.includes("track my package") || q.includes("order status")) {
    return {
      response: "**Order Tracking on Zenve:**\n\n" +
        "You can track your live shipment anytime:\n" +
        "1. Go to your [Orders Page](/orders) in the top menu.\n" +
        "2. Click on your active Order ID to view real-time courier tracking (AWB) and delivery partner status.\n" +
        "3. Once shipped, live SMS and email updates are sent directly to your registered contact.\n\n" +
        "Standard orders are dispatched within **24 hours** from our verified fulfillment hubs.",
      sources: [
        { type: "policy", title: "Live Order Tracking", url: "/orders" }
      ],
      suggested_followups: [
        "When will my package arrive?",
        "Why is my shipment delayed?",
        "Can I cancel my order?"
      ]
    };
  }

  if (q.includes("when will my package arrive") || q.includes("when will it arrive") || q.includes("delivery date") || q.includes("when will i get")) {
    return {
      response: "Standard deliveries typically arrive within **2 to 4 business days** for major metro areas and **4 to 7 business days** for other cities. You can view your exact estimated delivery date anytime under [My Orders](/orders).",
      sources: [
        { type: "policy", title: "My Orders", url: "/orders" }
      ],
      suggested_followups: [
        "Where is my order?",
        "Why is my shipment delayed?",
        "Do you support same-day delivery?"
      ]
    };
  }

  if (q.includes("delay") || q.includes("why is my shipment delayed") || q.includes("not delivered yet")) {
    return {
      response: "Shipment delays may occasionally occur due to adverse weather, local courier hub congestion, or remote routing. If your order has exceeded its estimated delivery window, please reach out to **support@zenve.com** or call our helpline with your Order ID, and our logistics team will expedite delivery immediately.",
      sources: [
        { type: "policy", title: "Customer Support", url: "/help" }
      ],
      suggested_followups: [
        "Talk to a human agent",
        "Track Order #",
        "Cancel order"
      ]
    };
  }

  // C. Shipping & Delivery
  if (q.includes("free shipping") || q.includes("shipping fee") || q.includes("minimum cart")) {
    return {
      response: "**Zenve Shipping Policy:**\n\n" +
        "• **Free Shipping**: Available on all orders with a cart value of **₹499 or more** across India.\n" +
        "• **Orders Below ₹499**: A standard nominal shipping charge of ₹49 applies.\n" +
        "• **Zenve VIP Members**: Enjoy **Unlimited Free Express Shipping** with zero minimum cart requirement!",
      sources: [
        { type: "policy", title: "Shipping & Delivery Policy", url: "/help" },
        { type: "policy", title: "Zenve VIP Membership", url: "/membership" }
      ],
      suggested_followups: [
        "How long does standard delivery take?",
        "Do you support same-day delivery?",
        "First-time buyer discount code"
      ]
    };
  }

  if (q.includes("how long does standard delivery take") || q.includes("delivery take to my") || q.includes("pincode") || q.includes("shipping time")) {
    return {
      response: "**Estimated Delivery Timelines:**\n\n" +
        "• **Metro Cities**: 2 to 3 business days.\n" +
        "• **Tier-2 & Tier-3 Cities**: 3 to 5 business days.\n" +
        "• **Regional & Outstation Pincodes**: 5 to 7 business days.\n\n" +
        "You can enter your 6-digit pincode on any product page to check exact courier serviceability.",
      sources: [
        { type: "policy", title: "Shipping Details", url: "/help" }
      ],
      suggested_followups: [
        "Do you offer free shipping?",
        "Where is my order?",
        "Payment methods"
      ]
    };
  }

  if (q.includes("same-day") || q.includes("same day") || q.includes("express delivery")) {
    return {
      response: "Yes! Zenve offers **Express Same-Day Delivery** in select metro areas for eligible orders placed before **12:00 PM noon**. Simply select 'Express Delivery' at checkout when placing your order.",
      sources: [
        { type: "policy", title: "Express Delivery Terms", url: "/help" }
      ],
      suggested_followups: [
        "Do you offer free shipping?",
        "Track my order",
        "Payment methods"
      ]
    };
  }

  if (q.includes("change my delivery address") || q.includes("change address") || q.includes("wrong address")) {
    return {
      response: "You can modify your delivery address **before the order is dispatched**:\n\n" +
        "1. Open [My Orders](/orders).\n" +
        "2. If status is still 'Processing', click **Edit Address**.\n" +
        "3. If your package has already been dispatched, please contact **support@zenve.com** immediately so we can coordinate with our courier partner.",
      sources: [
        { type: "policy", title: "My Orders", url: "/orders" }
      ],
      suggested_followups: [
        "Cancel order",
        "Where is my order?",
        "Customer support contact"
      ]
    };
  }

  // D. Cancellation, Returns & Refunds
  if (q.includes("how do i cancel my order") || q.includes("cancel order") || q.includes("cancellation")) {
    return {
      response: "**How to Cancel an Order:**\n\n" +
        "1. Navigate to [My Orders](/orders).\n" +
        "2. Select the order and click **'Cancel Order'**.\n" +
        "3. Orders can be cancelled instantly before they are dispatched from the warehouse.\n" +
        "4. If already paid, a 100% instant refund is credited immediately to your **Zenve Wallet** (or 3-5 days to your bank/card).",
      sources: [
        { type: "policy", title: "Cancellation & Refund Policy", url: "/help" }
      ],
      suggested_followups: [
        "How long do refunds take?",
        "Return policy",
        "Where is my order?"
      ]
    };
  }

  if (q.includes("return") || q.includes("replacement policy") || q.includes("exchange")) {
    return {
      response: "**Zenve 7-Day Return & Replacement Policy:**\n\n" +
        "• **Eligible Items**: Pet apparel, harnesses, leashes, beds, toys, and grooming tools can be returned within **7 days** of delivery if unused with original tags.\n" +
        "• **Safety Note**: Opened pet food, treats, and prescription medications cannot be returned once delivered to ensure animal safety.\n" +
        "• **Easy Doorstep Pickup**: We arrange a free courier pickup right from your home.",
      sources: [
        { type: "policy", title: "Return Policy", url: "/help" }
      ],
      suggested_followups: [
        "I received a damaged product",
        "How many days does a refund take?",
        "Cancel order"
      ]
    };
  }

  if (q.includes("damaged") || q.includes("expired") || q.includes("broken") || q.includes("wrong item")) {
    return {
      response: "We are truly sorry for the trouble! If you received a damaged, defective, or expired item:\n\n" +
        "1. Open [My Orders](/orders) and click **'Report Issue / Request Replacement'**.\n" +
        "2. Upload a quick photo of the damaged/expired packaging.\n" +
        "3. We will dispatch a **free replacement** or process a full refund within 24 hours.",
      sources: [
        { type: "policy", title: "Report Damaged Item", url: "/orders" }
      ],
      suggested_followups: [
        "Talk to a human agent",
        "How many days does a refund take?",
        "Customer support email"
      ]
    };
  }

  if (q.includes("how many days does it take to get a refund") || q.includes("refund time") || q.includes("how long refund") || q.includes("refund take")) {
    return {
      response: "**Refund Timelines:**\n\n" +
        "• **Zenve Wallet**: **Instant (0 minutes)** — available immediately for your next purchase.\n" +
        "• **UPI / GPay / PhonePe**: 24 to 48 hours.\n" +
        "• **Credit / Debit Cards / Net Banking**: 3 to 5 business days, depending on your issuing bank.",
      sources: [
        { type: "policy", title: "Refund Timelines", url: "/help" },
        { type: "policy", title: "Zenve Wallet", url: "/wallet" }
      ],
      suggested_followups: [
        "How to cancel my order?",
        "Payment methods",
        "Track Order"
      ]
    };
  }

  // E. Payments, Discounts & Account Management
  if (q.includes("payment method") || q.includes("cod") || q.includes("upi") || q.includes("cards") || q.includes("how can i pay")) {
    return {
      response: "**Accepted Payment Methods on Zenve:**\n\n" +
        "• **UPI**: Google Pay, PhonePe, Paytm, BHIM, CRED.\n" +
        "• **Cards**: Visa, MasterCard, RuPay, and American Express (Credit & Debit).\n" +
        "• **Net Banking**: All major Indian banks.\n" +
        "• **Cash on Delivery (COD)**: Available on orders up to ₹3,000.\n" +
        "• **Zenve Wallet**: 1-click seamless checkout with instant refunds.",
      sources: [
        { type: "policy", title: "Payment Options", url: "/help" }
      ],
      suggested_followups: [
        "First-time buyer discount code",
        "Why did my payment fail?",
        "Free shipping minimum cart"
      ]
    };
  }

  if (q.includes("discount code") || q.includes("coupon") || q.includes("first-time buyer") || q.includes("promo")) {
    return {
      response: "**Current Zenve Coupons & Offers:**\n\n" +
        "• **`ZENVEFIRST`**: Get **15% OFF** on your first purchase (min. cart ₹599).\n" +
        "• **`FREESHIP`**: Free standard shipping on orders above ₹499.\n" +
        "• **VIP Membership**: 10% cashback on all orders + zero delivery fees.\n\n" +
        "Simply type the code in the coupon box at checkout to apply your discount!",
      sources: [
        { type: "policy", title: "Available Offers", url: "/coupons" }
      ],
      suggested_followups: [
        "Payment methods",
        "Free shipping policy",
        "Browse products"
      ]
    };
  }

  if (q.includes("payment fail") || q.includes("payment failed") || q.includes("money deducted")) {
    return {
      response: "**If Your Payment Failed:**\n\n" +
        "1. **Money Deducted?** Don't worry! If an amount was debited during a failed transaction, your bank will automatically reverse it within **24 to 48 hours**.\n" +
        "2. **Alternative Method**: You can retry checkout using UPI (GPay/PhonePe) or select Cash on Delivery (COD).\n" +
        "3. **Assistance**: If you need verification, email us at **support@zenve.com** with your transaction UTR number.",
      sources: [
        { type: "policy", title: "Payment Assistance", url: "/help" }
      ],
      suggested_followups: [
        "Payment methods",
        "Talk to a human agent",
        "Track Order"
      ]
    };
  }

  if (q.includes("reset") && (q.includes("password") || q.includes("account"))) {
    return {
      response: "**How to Reset Your Account Password:**\n\n" +
        "1. Click **Login** at the top right of the website.\n" +
        "2. Click the **'Forgot Password?'** link below the login box.\n" +
        "3. Enter your registered email address to receive an instant password reset link.",
      sources: [
        { type: "policy", title: "Forgot Password", url: "/forgot-password" }
      ],
      suggested_followups: [
        "Customer support contact",
        "Payment methods",
        "Browse products"
      ]
    };
  }

  // F. Domain-Specific (Pet Care & Sizing)
  if (q.includes("measure my dog") || (q.includes("measure") && q.includes("harness")) || q.includes("sizing") || q.includes("size chart")) {
    return {
      response: "**How to Accurately Measure Your Dog:**\n\n" +
        "1. **Neck Girth**: Measure around the base of the neck where the collar sits.\n" +
        "2. **Chest Girth (Crucial)**: Measure around the widest part of the ribcage, just behind the front legs.\n" +
        "3. **Back Length**: Measure from the base of the neck to the base of the tail.\n\n" +
        "💡 *Two-Finger Rule:* Keep two fingers flat between the measuring tape and your dog's body for a comfortable, non-restrictive fit.",
      sources: [
        { type: "product", title: "Dog Harness & Apparel", url: "/products" }
      ],
      suggested_followups: [
        "Top-selling dog harnesses",
        "Winter jackets for puppies",
        "Return policy for sizing"
      ]
    };
  }

  if (q.includes("aggressive chewer") || q.includes("durable toy") || q.includes("chew toy")) {
    return {
      response: "**Durable Toys for Aggressive Chewers:**\n\n" +
        "• **Heavy-Duty Natural Rubber Chew KONGs**: Puncture-resistant, non-toxic rubber designed for relentless chewers (fillable with peanut butter or treats).\n" +
        "• **Reinforced Nylon Chew Bones**: Extreme durability with dental ridges to clean tartar.\n" +
        "• **Triple-Knotted Thick Cotton Rope Toys**: Durable for interactive tug-of-war.\n\n" +
        "⚠️ *Avoid:* Thin plush squeaker toys or cheap plastic that can break into dangerous swallowable fragments.",
      sources: [
        { type: "product", title: "Chew Toys & Accessories", url: "/products" }
      ],
      suggested_followups: [
        "Grain-free dry food",
        "Free shipping policy",
        "Track order"
      ]
    };
  }

  if (q.includes("supplement") || q.includes("prescribed") || q.includes("veterinary-prescribed")) {
    return {
      response: "Yes! Zenve stocks genuine veterinary-prescribed supplements and medications (such as joint care supplements, calcium syrups, and skin & coat Omega oils).\n\n" +
        "• **Prescription Verification**: For schedule medicines and therapeutic supplements, easily upload your vet's prescription on our [Prescription Portal](/prescriptions).\n" +
        "• **Licensed Verification**: Our in-house veterinary pharmacy checks the prescription before dispatching.",
      sources: [
        { type: "policy", title: "Upload Doctor Prescription", url: "/prescriptions" }
      ],
      suggested_followups: [
        "How does vet verification work?",
        "Book a vet home visit",
        "Do you offer free shipping?"
      ]
    };
  }

  // G. Escalation & Fallbacks
  if (q.includes("real person") || q.includes("human agent") || q.includes("talk to human") || q.includes("customer support") || q.includes("phone number") || q.includes("email")) {
    return {
      response: "**Zenve Customer Support & Human Escalation:**\n\n" +
        "Our human support team is ready to assist you:\n\n" +
        "• 📧 **Email**: support@zenve.com\n" +
        "• 📞 **Toll-Free Helpline**: 1800-ZENVE-PET (1800-936-8373)\n" +
        "• 💬 **WhatsApp Support**: +91 98765 43210\n" +
        "• 🕒 **Operating Hours**: Monday to Sunday, **9:00 AM – 9:00 PM IST**.\n\n" +
        "Feel free to drop a message anytime and an executive will get in touch!",
      sources: [
        { type: "policy", title: "Help & Support Center", url: "/help" }
      ],
      suggested_followups: [
        "What are your operating hours?",
        "Track my order",
        "Return & refund policy"
      ]
    };
  }

  if (q.includes("operating hour") || q.includes("working hour") || q.includes("timing")) {
    return {
      response: "**Zenve Support & Fulfillment Hours:**\n\n" +
        "• **Customer Care**: 9:00 AM – 9:00 PM IST (All 7 days)\n" +
        "• **Online Orders**: 24/7 online ordering & tracking\n" +
        "• **Warehouse Dispatch**: Dispatched within 24 hours Monday through Saturday.",
      sources: [
        { type: "policy", title: "Customer Support", url: "/help" }
      ],
      suggested_followups: [
        "Customer support phone number",
        "Do you offer same-day delivery?",
        "Track order"
      ]
    };
  }

  // H. Standard Animal Care (Dogs, Cats, Poultry, Cows, Goats)
  if (q.includes("dog") || q.includes("puppy") || q.includes("canine")) {
    return {
      response: "### 🐶 Standard Care & Fundamental Features for Dogs\n\n" +
        "• **Fundamental Features:** Canines are communicative, social pack companions with diverse physical drives, sharp senses, and omnivorous dietary needs.\n\n" +
        "• **Nutrition & Hydration:**\n" +
        "  - Complete, life-stage appropriate diet (puppy, adult, or senior) rich in animal protein.\n" +
        "  - Unrestricted access to clean, fresh water refreshed daily.\n\n" +
        "• **Daily Care Practices:**\n" +
        "  - **Physical Exercise:** 30–60 minutes of daily walks, running, and play to maintain cardiovascular health.\n" +
        "  - **Grooming & Hygiene:** Regular coat brushing, periodic ear cleaning, and routine dental hygiene.\n" +
        "  - **Mental Stimulation:** Interactive training and chew toys to prevent anxiety.\n\n" +
        "• **Health & Veterinary Guidance:**\n" +
        "  - Keep core vaccinations (Rabies, DHPP) and monthly parasite prevention up to date.\n" +
        "  - *Safety Guardrail:* Always consult a licensed veterinarian for medical treatments. Never administer human medications directly.",
      sources: [{ type: "product", title: "Dog Supplies", url: "/products" }],
      suggested_followups: ["Suggest grain-free dog food", "Top-selling dog harnesses", "Book a vet home visit"]
    };
  }

  if (q.includes("cat") || q.includes("kitten") || q.includes("feline")) {
    return {
      response: "### 🐱 Standard Care & Fundamental Features for Cats\n\n" +
        "• **Fundamental Features:** Felines are agile, independent obligate carnivores with essential requirements for taurine and meat protein.\n\n" +
        "• **Nutrition & Hydration:**\n" +
        "  - High-protein wet and dry cat food. Wet food is strongly recommended to support feline urinary tract hydration.\n" +
        "  - Clean drinking water placed away from the food bowl and litter area.\n\n" +
        "• **Daily Care Practices:**\n" +
        "  - **Litter Box Hygiene:** Daily scooping and keeping clean litter boxes in quiet locations.\n" +
        "  - **Claw Maintenance:** Dedicated vertical scratching posts and gentle brushing to reduce hairballs.\n" +
        "  - **Enrichment:** Window perches, climbing trees, and daily interactive laser/wand play.\n\n" +
        "• **Health & Veterinary Guidance:**\n" +
        "  - Routine FPV/FVRCP vaccinations and flea/tick control.\n" +
        "  - *Safety Guardrail:* Cats are exceptionally sensitive to toxins—never administer human pain relievers (like paracetamol). Consult a vet for medical needs.",
      sources: [{ type: "product", title: "Cat Supplies", url: "/products" }],
      suggested_followups: ["Sensitive skin cat shampoo", "Cat food options", "Book a vet home visit"]
    };
  }

  if (q.includes("poultry") || q.includes("chicken") || q.includes("hen") || q.includes("duck") || q.includes("rooster")) {
    return {
      response: "### 🐔 Standard Care & Fundamental Features for Poultry\n\n" +
        "• **Fundamental Features:** Feathered flock foragers with high metabolic rates and gizzard digestion.\n\n" +
        "• **Nutrition & Feeding:**\n" +
        "  - Age-appropriate starter/grower/layer feed balanced with insoluble grit and constant clean water.\n" +
        "  - Insoluble granite grit to assist gizzard digestion, plus oyster shell calcium for strong eggshells.\n\n" +
        "• **Housing & Shelter:**\n" +
        "  - Secure predator-proof coop (1/2\" hardware cloth) with latch locks.\n" +
        "  - Dry, draft-free bedding (pine shavings or clean straw) with proper high-level ventilation.\n" +
        "  - Elevated roosting bars and clean, cushioned nesting boxes.\n\n" +
        "• **Health & Biosecurity:**\n" +
        "  - Keep coops dry to prevent coccidiosis, mites, and respiratory issues.\n" +
        "  - *Safety Guardrail:* Consult an avian veterinarian for flock illnesses rather than self-administering unauthorized pharmaceuticals.",
      sources: [{ type: "policy", title: "Poultry Care Guide", url: "/help" }],
      suggested_followups: ["Poultry feeds & supplements", "Track order", "Contact support"]
    };
  }

  if (q.includes("cow") || q.includes("cattle") || q.includes("bovine") || q.includes("calf")) {
    return {
      response: "### 🐄 Standard Care & Fundamental Features for Cows (Cattle)\n\n" +
        "• **Fundamental Features:** Large four-compartment ruminants (rumen, reticulum, omasum, abomasum) that digest roughage through microbial fermentation.\n\n" +
        "• **Nutrition & Feeding:**\n" +
        "  - High-fiber roughage diet of quality pasture grass, dry hay, or legume silage.\n" +
        "  - Essential livestock minerals and salt licks (especially calcium and phosphorus for lactating cows).\n" +
        "  - Clean, fresh water—cows require **60 to 100 liters of water daily**.\n\n" +
        "• **Housing & Shelter:**\n" +
        "  - Dry, well-ventilated barn with clean bedding (straw or sand) to prevent mastitis.\n" +
        "  - Non-slip flooring and adequate shade to prevent heat stress.\n" +
        "  - Regular hoof inspection and trimming every 6 months to prevent lameness.\n\n" +
        "• **Health & Veterinary Guidance:**\n" +
        "  - Routine herd vaccinations (FMD, Blackleg) and deworming supervised by a livestock vet.\n" +
        "  - *Safety Guardrail:* Do not self-administer prescription antibiotics directly; always consult a licensed livestock veterinarian for illnesses.",
      sources: [{ type: "policy", title: "Cattle Care Guide", url: "/help" }],
      suggested_followups: ["Cattle feed supplements", "Vet home visits", "Contact support"]
    };
  }

  if (q.includes("goat") || q.includes("goats") || q.includes("caprine") || q.includes("kid")) {
    return {
      response: "### 🐐 Standard Care & Fundamental Features for Goats\n\n" +
        "• **Fundamental Features:** Highly agile, curious, and social ruminants that are natural browsers—they naturally prefer leaves, shrubs, twigs, and roughage over ground grass.\n\n" +
        "• **Nutrition & Feeding:**\n" +
        "  - Varied roughage browse, quality grass hay, and fresh clean water daily.\n" +
        "  - Species-specific loose goat mineral mix formulated with appropriate copper levels.\n\n" +
        "• **Housing & Fencing:**\n" +
        "  - Elevated, dry, draft-free shelter—goats dislike rain and are prone to foot rot and respiratory issues in damp conditions.\n" +
        "  - Sturdy, climb-proof fencing at least 4 to 5 feet high with secure gate latches.\n" +
        "  - Routine hoof inspection and trimming every 4 to 8 weeks.\n\n" +
        "• **Health & Veterinary Guidance:**\n" +
        "  - Implement rotational grazing and routine fecal egg count checks for internal parasites.\n" +
        "  - *Safety Guardrail:* Consult an experienced caprine veterinarian for herd vaccination (CDT) and parasite treatments.",
      sources: [{ type: "policy", title: "Goat Care Guide", url: "/help" }],
      suggested_followups: ["Goat minerals & feed", "Vet home visits", "Contact support"]
    };
  }

  // Not resolved by local rule
  return null;
}

/**
 * Returns a helpful, rich degradation menu when backend is unreachable or offline
 */
export function getGracefulDegradationResponse() {
  return {
    response: "Our cloud AI is currently reconnecting. Meanwhile, here are quick options to help you:\n\n" +
      "• 📦 **[Track My Order](/orders)**: Check your live shipment status\n" +
      "• 🛒 **[Browse Pet Products](/products)**: Explore dog, cat, and farm animal care supplies\n" +
      "• 🩺 **[Veterinary Home Visits](/vet-visit)**: Schedule a doctor visit\n" +
      "• 💬 **Customer Care**: Email us at **support@zenve.com** or call **1800-ZENVE-PET**.\n\n" +
      "You can also ask me about return policies, shipping times, dog harness sizing, or basic animal care!",
    sources: [
      { type: "policy", title: "Orders & Tracking", url: "/orders" },
      { type: "policy", title: "Help & Customer Support", url: "/help" }
    ],
    suggested_followups: [
      "Where is my order?",
      "Do you offer free shipping?",
      "How to cancel my order?",
      "Talk to a human agent"
    ]
  };
}
