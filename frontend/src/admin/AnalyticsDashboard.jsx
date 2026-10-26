import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  Users,
  Target,
  Layers,
  Filter,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  BarChart3,
  Search,
  ChevronRight,
  ShieldCheck,
  Zap,
  Repeat,
  Compass
} from "lucide-react";
import "./AnalyticsDashboard.css";

// ----------------------------------------------------
// MASTER ARCHITECTURAL DATA MAPPING
// ----------------------------------------------------
const MASTER_DASHBOARDS = [
  {
    id: "executive",
    name: "Executive Overview",
    icon: "🏛️",
    targetAudience: "C-Suite (CEO, CFO, COO), Board of Directors",
    assignedArchetypes: [
      "Total Macro Units",
      "High-Margin Flagships",
      "Volume Consumables",
      "Subscriptions & Memberships",
      "Digital Wallet Float"
    ],
    primaryRationale:
      "Provides high-level strategic health, top-line GMV, cash efficiency, and overall margin portfolio distribution. Tracks shift from low-margin transactional goods to high-margin recurring MRR.",
    recommendedKpis: [
      "Blended Gross Margin %",
      "Subscription MRR / ARR",
      "Portfolio LTV:CAC Ratio",
      "Days of Inventory on Hand (DOH)",
      "Pareto 80/20 Revenue Curve"
    ],
    sampleSkus: [
      { id: "SKU-EXE-01", name: "Zenve Annual VIP Membership", type: "Subscription", margin: "88%", velocity: "Fast", stock: "Unlimited" },
      { id: "SKU-EXE-02", name: "Royal Canin Breed Specific Diet", type: "Volume Consumable", margin: "22%", velocity: "Fast", stock: 1420 },
      { id: "SKU-EXE-03", name: "NutriMax Joint Advanced Supplement", type: "High-Margin Flagship", margin: "64%", velocity: "Medium", stock: 850 },
      { id: "SKU-EXE-04", name: "Zenve Digital Wallet Float", type: "Digital Service", margin: "95%", velocity: "High", stock: "N/A" }
    ]
  },
  {
    id: "inventory",
    name: "Inventory & Supply Chain",
    icon: "📦",
    targetAudience: "Supply Chain VP, Procurement, Warehouse Leads",
    assignedArchetypes: [
      "High-Velocity Consumables",
      "Slow-Moving / High-Ticket Durables",
      "Batch-Tracked & Perishable Goods"
    ],
    primaryRationale:
      "Balances working capital by preventing costly overstock of expensive durables while avoiding stockouts on critical fast-moving consumables and batch-expiry items (FEFO).",
    recommendedKpis: [
      "Days of Inventory on Hand (DOH)",
      "Stockout Rate & Lost Sales ($)",
      "Inventory Turnover Ratio (ITR)",
      "Aging Inventory (<30d to >90d)",
      "Supplier OTIF %"
    ],
    sampleSkus: [
      { id: "SKU-INV-01", name: "Simparica Trio Flea & Tick 3-Pack", type: "Perishable / Rx", margin: "45%", velocity: "Fast", stock: 84 },
      { id: "SKU-INV-02", name: "Drools Adult Dog Food 20kg", type: "Volume Consumable", margin: "18%", velocity: "Fast", stock: 320 },
      { id: "SKU-INV-03", name: "Veterinary Ultrasound Scanner Pro", type: "Slow-Moving Durable", margin: "42%", velocity: "Slow", stock: 8 },
      { id: "SKU-INV-04", name: "Himalaya Liv.52 Herbal Drops", type: "High-Velocity Consumable", margin: "38%", velocity: "Fast", stock: 650 }
    ]
  },
  {
    id: "conversion",
    name: "Conversion & Sales Funnel",
    icon: "⚡",
    targetAudience: "Category Managers, E-Commerce PMs, Merchandising Leads",
    assignedArchetypes: [
      "Full Product Catalog",
      "High-Consideration Friction SKUs",
      "Basket Add-ons & Checkout Digital Services"
    ],
    primaryRationale:
      "Identifies friction points in the purchasing funnel, monitors add-to-cart velocity, optimizes cross-selling at checkout, and tests pricing elasticity.",
    recommendedKpis: [
      "Funnel Conversion Rate by Step",
      "Cross-Sell / Attach Rate %",
      "Average Order Value (AOV)",
      "Units Per Transaction (UPT)",
      "Cart Abandonment by Product Type"
    ],
    sampleSkus: [
      { id: "SKU-CNV-01", name: "Dentastix Oral Care Dental Chews", type: "Impulse Add-on", margin: "52%", velocity: "Fast", stock: 1120 },
      { id: "SKU-CNV-02", name: "Express Prescription AI Verification", type: "Digital Add-on", margin: "92%", velocity: "Fast", stock: "Digital" },
      { id: "SKU-CNV-03", name: "Ergonomic Orthopedic Pet Bed XL", type: "High-Consideration", margin: "48%", velocity: "Medium", stock: 140 }
    ]
  },
  {
    id: "retention",
    name: "Customer Retention & LTV",
    icon: "🔄",
    targetAudience: "Retention Leads, CRM Team, Loyalty Product Managers",
    assignedArchetypes: [
      "Recurring Subscriptions / Memberships",
      "Replenishment Consumables",
      "Post-Purchase Services"
    ],
    primaryRationale:
      "Maximizes lifetime customer value by identifying predictable replenishment cycles, reducing subscription churn, and increasing multi-category adoption.",
    recommendedKpis: [
      "Monthly Cohort Retention Heatmap",
      "Net Subscription Churn Rate",
      "Days Between Orders (Cycle Time)",
      "12-Month Cumulative LTV",
      "Repeat Purchase Rate (RPR) %"
    ],
    sampleSkus: [
      { id: "SKU-RET-01", name: "Zenve Care 6-Month Wellness Plan", type: "Subscription", margin: "84%", velocity: "Fast", stock: "Active" },
      { id: "SKU-RET-02", name: "Pedigree Daily Meal Box Auto-Ship", type: "Replenishment", margin: "24%", velocity: "Fast", stock: 450 },
      { id: "SKU-RET-03", name: "Omega 3-6 Coat Care Chews", type: "Replenishment", margin: "58%", velocity: "Medium", stock: 720 }
    ]
  },
  {
    id: "marketing",
    name: "Marketing ROI & Growth",
    icon: "🎯",
    targetAudience: "Performance Marketers, Media Buyers, Growth VP",
    assignedArchetypes: [
      "High-Margin Flagships (Hero Ads)",
      "Gateway Intro Bundles",
      "Promotional & Seasonal SKUs"
    ],
    primaryRationale:
      "Directs paid ad spend toward products capable of absorbing acquisition costs (CAC) and monitors capital recovery speed (Payback Period).",
    recommendedKpis: [
      "Return on Ad Spend (ROAS) by SKU",
      "Blended MER (Marketing Efficiency)",
      "First-Order CAC vs. Day-1 AOV",
      "CAC Payback Period (Months)",
      "Channel Contribution Margin"
    ],
    sampleSkus: [
      { id: "SKU-MKT-01", name: "Complete Puppy Starter Bundle", type: "Gateway Intro", margin: "38%", velocity: "Fast", stock: 620 },
      { id: "SKU-MKT-02", name: "Probiotic Immunity Powder 200g", type: "High-Margin Hero", margin: "71%", velocity: "Medium", stock: 940 },
      { id: "SKU-MKT-03", name: "De-Shedding Grooming Pro Kit", type: "High-Margin Hero", margin: "65%", velocity: "Fast", stock: 510 }
    ]
  }
];

export default function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState("executive");
  const [dateRange, setDateRange] = useState("30d");
  const [rolePerspective, setRolePerspective] = useState("all");
  const [archetypeFilter, setArchetypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDrawerItem, setSelectedDrawerItem] = useState(null);

  // Filtered Master Table items based on search and filters
  const filteredDashboards = useMemo(() => {
    return MASTER_DASHBOARDS.filter((dash) => {
      const matchesSearch =
        dash.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dash.targetAudience.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dash.assignedArchetypes.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase())) ||
        dash.recommendedKpis.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesAudience =
        rolePerspective === "all" ||
        dash.targetAudience.toLowerCase().includes(rolePerspective.toLowerCase());

      return matchesSearch && matchesAudience;
    });
  }, [searchQuery, rolePerspective]);

  const currentDashboard = useMemo(() => {
    return MASTER_DASHBOARDS.find((d) => d.id === activeTab) || MASTER_DASHBOARDS[0];
  }, [activeTab]);

  return (
    <div className="bi-dashboard-container">
      {/* ---------------- HEADER ---------------- */}
      <header className="bi-header">
        <div className="bi-title-group">
          <h1>
            <span>{currentDashboard.icon}</span> Business Intelligence & Analytics Suite
            <span className="bi-title-badge">BI Architecture v2.4</span>
          </h1>
          <p className="bi-subtitle">
            Cross-functional analytical mapping, portfolio KPI tracking, and product allocation hub
          </p>
        </div>

        <div className="bi-header-controls">
          <div className="bi-pulse-badge">
            <span className="bi-pulse-dot"></span> Live Stream • 99.8% Sync
          </div>

          <select
            className="bi-select-box"
            value={rolePerspective}
            onChange={(e) => setRolePerspective(e.target.value)}
          >
            <option value="all">Role: All Stakeholders</option>
            <option value="C-Suite">Role: C-Suite / Executive</option>
            <option value="Supply Chain">Role: Supply Chain & Procurement</option>
            <option value="Category">Role: Category Managers & PMs</option>
            <option value="Retention">Role: Retention & CRM</option>
            <option value="Marketers">Role: Performance Marketing</option>
          </select>

          <select
            className="bi-select-box"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Quarter to Date (Q3)</option>
            <option value="ytd">Year to Date (YTD)</option>
          </select>

          <button
            className="bi-btn-secondary"
            onClick={() => alert("Exporting BI Executive Report (PDF/Excel)...")}
          >
            <Download size={14} /> Export Report
          </button>
        </div>
      </header>

      {/* ---------------- TABS NAVIGATION ---------------- */}
      <nav className="bi-tabs-nav">
        {MASTER_DASHBOARDS.map((dash) => (
          <button
            key={dash.id}
            className={`bi-tab-btn ${activeTab === dash.id ? "active" : ""}`}
            onClick={() => setActiveTab(dash.id)}
          >
            <span>{dash.icon}</span> {dash.name}
            <span className="bi-tab-tag">{dash.sampleSkus.length} SKUs</span>
          </button>
        ))}
        <button
          className={`bi-tab-btn ${activeTab === "matrix" ? "active" : ""}`}
          onClick={() => setActiveTab("matrix")}
        >
          <Compass size={15} /> Master Mapping Table
          <span className="bi-tab-tag">Overview</span>
        </button>
      </nav>

      {/* ---------------- AUDIENCE & RATIONALE CONTEXT BANNER ---------------- */}
      {activeTab !== "matrix" && (
        <section className="bi-context-banner">
          <div className="bi-context-info">
            <h3>
              {currentDashboard.icon} {currentDashboard.name}
            </h3>
            <p>{currentDashboard.primaryRationale}</p>
          </div>
          <div className="bi-pill-group">
            <span className="bi-context-pill">
              <strong>Audience:</strong> {currentDashboard.targetAudience}
            </span>
            <button
              className="bi-btn-secondary"
              style={{ background: "rgba(255,255,255,0.2)", color: "#fff", border: "none" }}
              onClick={() => setSelectedDrawerItem(currentDashboard)}
            >
              <Package size={14} /> View Mapped Products ({currentDashboard.sampleSkus.length})
            </button>
          </div>
        </section>
      )}

      {/* ---------------- TAB 1: EXECUTIVE OVERVIEW ---------------- */}
      {activeTab === "executive" && (
        <div className="bi-tab-content">
          <div className="bi-kpi-grid">
            <div className="bi-kpi-card" style={{ "--card-accent": "#3b82f6" }}>
              <div className="bi-kpi-top">
                <span className="bi-kpi-label">Ecosystem GMV</span>
                <div className="bi-kpi-icon"><DollarSign size={16} /></div>
              </div>
              <div className="bi-kpi-value">$1,842,500</div>
              <div className="bi-kpi-bottom">
                <span className="bi-kpi-delta positive"><TrendingUp size={12} /> +18.4%</span>
                <span className="bi-kpi-benchmark">vs. Prev Month</span>
              </div>
            </div>

            <div className="bi-kpi-card" style={{ "--card-accent": "#10b981" }}>
              <div className="bi-kpi-top">
                <span className="bi-kpi-label">Blended Gross Margin</span>
                <div className="bi-kpi-icon"><Target size={16} /></div>
              </div>
              <div className="bi-kpi-value">44.6%</div>
              <div className="bi-kpi-bottom">
                <span className="bi-kpi-delta positive"><TrendingUp size={12} /> +3.2%</span>
                <span className="bi-kpi-benchmark">Target: 42.0%</span>
              </div>
            </div>

            <div className="bi-kpi-card" style={{ "--card-accent": "#8b5cf6" }}>
              <div className="bi-kpi-top">
                <span className="bi-kpi-label">Subscription ARR</span>
                <div className="bi-kpi-icon"><Repeat size={16} /></div>
              </div>
              <div className="bi-kpi-value">$485,200</div>
              <div className="bi-kpi-bottom">
                <span className="bi-kpi-delta positive"><TrendingUp size={12} /> +34.2%</span>
                <span className="bi-kpi-benchmark">MRR: $40,433</span>
              </div>
            </div>

            <div className="bi-kpi-card" style={{ "--card-accent": "#f59e0b" }}>
              <div className="bi-kpi-top">
                <span className="bi-kpi-label">Portfolio LTV : CAC</span>
                <div className="bi-kpi-icon"><Users size={16} /></div>
              </div>
              <div className="bi-kpi-value">4.8x</div>
              <div className="bi-kpi-bottom">
                <span className="bi-kpi-delta positive"><TrendingUp size={12} /> Healthy</span>
                <span className="bi-kpi-benchmark">Min Target: 3.0x</span>
              </div>
            </div>

            <div className="bi-kpi-card" style={{ "--card-accent": "#06b6d4" }}>
              <div className="bi-kpi-top">
                <span className="bi-kpi-label">Working Capital in Stock</span>
                <div className="bi-kpi-icon"><Package size={16} /></div>
              </div>
              <div className="bi-kpi-value">$218,400</div>
              <div className="bi-kpi-bottom">
                <span className="bi-kpi-delta positive"><TrendingDown size={12} /> -8.2%</span>
                <span className="bi-kpi-benchmark">DOH: 38 Days</span>
              </div>
            </div>
          </div>

          <div className="bi-charts-row">
            {/* Chart 1: Recurring MRR & Active Member Trend (SVG) */}
            <div className="bi-chart-card">
              <div className="bi-chart-header">
                <div>
                  <h4 className="bi-chart-title">Subscription ARR Growth & Recurring Trajectory</h4>
                  <p className="bi-chart-sub">Monthly expansion of recurring plans vs. one-time physical goods</p>
                </div>
                <div className="bi-chart-legend">
                  <div className="bi-legend-item"><span className="bi-legend-dot" style={{ background: "#8b5cf6" }}></span> Recurring MRR ($)</div>
                  <div className="bi-legend-item"><span className="bi-legend-dot" style={{ background: "#3b82f6" }}></span> Active Subscribers</div>
                </div>
              </div>

              <div className="bi-svg-container">
                <svg viewBox="0 0 600 240">
                  <defs>
                    <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Grid lines */}
                  <line x1="40" y1="30" x2="580" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="40" y1="80" x2="580" y2="80" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="40" y1="130" x2="580" y2="130" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="40" y1="180" x2="580" y2="180" stroke="#f1f5f9" strokeWidth="1" />

                  {/* Area fill */}
                  <path
                    d="M 50 180 Q 150 150, 250 135 T 450 70 T 570 40 L 570 190 L 50 190 Z"
                    fill="url(#mrrGrad)"
                  />
                  {/* Line MRR */}
                  <path
                    d="M 50 180 Q 150 150, 250 135 T 450 70 T 570 40"
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  {/* Line Subscribers */}
                  <path
                    d="M 50 170 Q 150 160, 250 145 T 450 110 T 570 75"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2.5"
                    strokeDasharray="5,5"
                    strokeLinecap="round"
                  />

                  {/* Data Points */}
                  <circle cx="50" cy="180" r="4" fill="#8b5cf6" />
                  <circle cx="150" cy="155" r="4" fill="#8b5cf6" />
                  <circle cx="250" cy="135" r="4" fill="#8b5cf6" />
                  <circle cx="350" cy="110" r="4" fill="#8b5cf6" />
                  <circle cx="450" cy="70" r="5" fill="#8b5cf6" stroke="#fff" strokeWidth="2" />
                  <circle cx="570" cy="40" r="6" fill="#8b5cf6" stroke="#fff" strokeWidth="2" />

                  {/* Labels */}
                  <text x="50" y="210" fill="#94a3b8" fontSize="11" textAnchor="middle">May</text>
                  <text x="150" y="210" fill="#94a3b8" fontSize="11" textAnchor="middle">Jun</text>
                  <text x="250" y="210" fill="#94a3b8" fontSize="11" textAnchor="middle">Jul</text>
                  <text x="350" y="210" fill="#94a3b8" fontSize="11" textAnchor="middle">Aug</text>
                  <text x="450" y="210" fill="#94a3b8" fontSize="11" textAnchor="middle">Sep</text>
                  <text x="570" y="210" fill="#94a3b8" fontSize="11" textAnchor="middle">Oct (Now)</text>
                </svg>
              </div>
            </div>

            {/* Breakdown: Revenue & Margin by Archetype */}
            <div className="bi-chart-card">
              <div className="bi-chart-header">
                <div>
                  <h4 className="bi-chart-title">Portfolio Margin & Volume Mix</h4>
                  <p className="bi-chart-sub">Blended contribution by product archetype</p>
                </div>
              </div>

              <div className="bi-breakdown-list">
                <div className="bi-breakdown-item">
                  <div className="bi-breakdown-top">
                    <span className="bi-breakdown-name">💎 High-Margin Flagships</span>
                    <span className="bi-breakdown-meta">64% Margin • $580k</span>
                  </div>
                  <div className="bi-bar-track">
                    <div className="bi-bar-fill" style={{ width: "64%", background: "#10b981" }}></div>
                  </div>
                </div>

                <div className="bi-breakdown-item">
                  <div className="bi-breakdown-top">
                    <span className="bi-breakdown-name">🔄 Subscriptions & Membership</span>
                    <span className="bi-breakdown-meta">86% Margin • $485k</span>
                  </div>
                  <div className="bi-bar-track">
                    <div className="bi-bar-fill" style={{ width: "86%", background: "#8b5cf6" }}></div>
                  </div>
                </div>

                <div className="bi-breakdown-item">
                  <div className="bi-breakdown-top">
                    <span className="bi-breakdown-name">⚡ High-Velocity Consumables</span>
                    <span className="bi-breakdown-meta">22% Margin • $540k</span>
                  </div>
                  <div className="bi-bar-track">
                    <div className="bi-bar-fill" style={{ width: "22%", background: "#3b82f6" }}></div>
                  </div>
                </div>

                <div className="bi-breakdown-item">
                  <div className="bi-breakdown-top">
                    <span className="bi-breakdown-name">🏗️ Slow-Moving Durables</span>
                    <span className="bi-breakdown-meta">42% Margin • $140k</span>
                  </div>
                  <div className="bi-bar-track">
                    <div className="bi-bar-fill" style={{ width: "42%", background: "#f59e0b" }}></div>
                  </div>
                </div>

                <div className="bi-breakdown-item">
                  <div className="bi-breakdown-top">
                    <span className="bi-breakdown-name">🌐 Digital Services & Wallet</span>
                    <span className="bi-breakdown-meta">94% Margin • $97k</span>
                  </div>
                  <div className="bi-bar-track">
                    <div className="bi-bar-fill" style={{ width: "94%", background: "#06b6d4" }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TAB 2: INVENTORY & SUPPLY CHAIN ---------------- */}
      {activeTab === "inventory" && (
        <div className="bi-tab-content">
          <div className="bi-kpi-grid">
            <div className="bi-kpi-card" style={{ "--card-accent": "#06b6d4" }}>
              <div className="bi-kpi-top">
                <span className="bi-kpi-label">Days of Inventory (DOH)</span>
                <div className="bi-kpi-icon"><Clock size={16} /></div>
              </div>
              <div className="bi-kpi-value">38.2 Days</div>
              <div className="bi-kpi-bottom">
                <span className="bi-kpi-delta positive"><CheckCircle2 size={12} /> Optimum</span>
                <span className="bi-kpi-benchmark">Target: 40 Days</span>
              </div>
            </div>

            <div className="bi-kpi-card" style={{ "--card-accent": "#ef4444" }}>
              <div className="bi-kpi-top">
                <span className="bi-kpi-label">Stockout Lost Sales Risk</span>
                <div className="bi-kpi-icon"><AlertTriangle size={16} /></div>
              </div>
              <div className="bi-kpi-value">$12,450</div>
              <div className="bi-kpi-bottom">
                <span className="bi-kpi-delta negative"><AlertTriangle size={12} /> 4 SKUs At Risk</span>
                <span className="bi-kpi-benchmark">Action Required</span>
              </div>
            </div>

            <div className="bi-kpi-card" style={{ "--card-accent": "#10b981" }}>
              <div className="bi-kpi-top">
                <span className="bi-kpi-label">Inventory Turnover (ITR)</span>
                <div className="bi-kpi-icon"><RefreshCw size={16} /></div>
              </div>
              <div className="bi-kpi-value">6.8x</div>
              <div className="bi-kpi-bottom">
                <span className="bi-kpi-delta positive"><TrendingUp size={12} /> +0.6x</span>
                <span className="bi-kpi-benchmark">Annual Velocity</span>
              </div>
            </div>

            <div className="bi-kpi-card" style={{ "--card-accent": "#f59e0b" }}>
              <div className="bi-kpi-top">
                <span className="bi-kpi-label">Expiring in &lt;90 Days</span>
                <div className="bi-kpi-icon"><AlertTriangle size={16} /></div>
              </div>
              <div className="bi-kpi-value">$14,200</div>
              <div className="bi-kpi-bottom">
                <span className="bi-kpi-delta neutral">FEFO Active</span>
                <span className="bi-kpi-benchmark">12 Batches</span>
              </div>
            </div>

            <div className="bi-kpi-card" style={{ "--card-accent": "#3b82f6" }}>
              <div className="bi-kpi-top">
                <span className="bi-kpi-label">Supplier OTIF %</span>
                <div className="bi-kpi-icon"><CheckCircle2 size={16} /></div>
              </div>
              <div className="bi-kpi-value">94.8%</div>
              <div className="bi-kpi-bottom">
                <span className="bi-kpi-delta positive">+2.1% MoM</span>
                <span className="bi-kpi-benchmark">Target: 95%</span>
              </div>
            </div>
          </div>

          <div className="bi-charts-row">
            {/* Urgent Reorder Trigger Table */}
            <div className="bi-chart-card">
              <div className="bi-chart-header">
                <div>
                  <h4 className="bi-chart-title">Critical Reorder & Replenishment Triggers</h4>
                  <p className="bi-chart-sub">Fast-moving consumables reaching safety threshold</p>
                </div>
              </div>

              <table className="bi-data-table">
                <thead>
                  <tr>
                    <th>SKU Name</th>
                    <th>Category</th>
                    <th>Stock Left</th>
                    <th>Runout Est.</th>
                    <th>Urgency</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Simparica Trio Chewables (20-40kg)</strong></td>
                    <td>Pharma & Rx</td>
                    <td><span style={{ color: "#ef4444", fontWeight: 700 }}>18 Units</span></td>
                    <td>3 Days</td>
                    <td><span className="bi-velocity-badge velocity-slow" style={{ background: "#fee2e2", color: "#b91c1c" }}>Critical</span></td>
                    <td><button className="bi-btn-action" onClick={() => alert("PO Drafted for 200 units")}>Create PO</button></td>
                  </tr>
                  <tr>
                    <td><strong>Royal Canin Maxi Adult 15kg</strong></td>
                    <td>Food & Nutrition</td>
                    <td><span style={{ color: "#f59e0b", fontWeight: 700 }}>42 Bags</span></td>
                    <td>5 Days</td>
                    <td><span className="bi-velocity-badge velocity-slow" style={{ background: "#fef3c7", color: "#b45309" }}>High</span></td>
                    <td><button className="bi-btn-action" onClick={() => alert("PO Drafted for 100 units")}>Create PO</button></td>
                  </tr>
                  <tr>
                    <td><strong>Himalaya Liv.52 Herbal Drops 30ml</strong></td>
                    <td>Supplements</td>
                    <td>68 Units</td>
                    <td>8 Days</td>
                    <td><span className="bi-velocity-badge velocity-medium">Medium</span></td>
                    <td><button className="bi-btn-action" onClick={() => alert("PO Drafted for 150 units")}>Create PO</button></td>
                  </tr>
                  <tr>
                    <td><strong>Pedigree Chicken & Vegetables 10kg</strong></td>
                    <td>Food & Nutrition</td>
                    <td>95 Bags</td>
                    <td>11 Days</td>
                    <td><span className="bi-velocity-badge velocity-fast">Adequate</span></td>
                    <td><button className="bi-btn-action" onClick={() => alert("Reorder scheduled")}>Auto-Schedule</button></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Inventory Aging Breakdown */}
            <div className="bi-chart-card">
              <div className="bi-chart-header">
                <div>
                  <h4 className="bi-chart-title">Stock Aging & Holding Capital</h4>
                  <p className="bi-chart-sub">Distribution of inventory capital by age band</p>
                </div>
              </div>

              <div className="bi-breakdown-list">
                <div className="bi-breakdown-item">
                  <div className="bi-breakdown-top">
                    <span className="bi-breakdown-name">Fresh Stock (&lt;30 Days)</span>
                    <span className="bi-breakdown-meta">62% • $135,400</span>
                  </div>
                  <div className="bi-bar-track">
                    <div className="bi-bar-fill" style={{ width: "62%", background: "#10b981" }}></div>
                  </div>
                </div>

                <div className="bi-breakdown-item">
                  <div className="bi-breakdown-top">
                    <span className="bi-breakdown-name">Active Stock (31–60 Days)</span>
                    <span className="bi-breakdown-meta">24% • $52,400</span>
                  </div>
                  <div className="bi-bar-track">
                    <div className="bi-bar-fill" style={{ width: "24%", background: "#3b82f6" }}></div>
                  </div>
                </div>

                <div className="bi-breakdown-item">
                  <div className="bi-breakdown-top">
                    <span className="bi-breakdown-name">Slow-Moving (61–90 Days)</span>
                    <span className="bi-breakdown-meta">9% • $19,650</span>
                  </div>
                  <div className="bi-bar-track">
                    <div className="bi-bar-fill" style={{ width: "9%", background: "#f59e0b" }}></div>
                  </div>
                </div>

                <div className="bi-breakdown-item">
                  <div className="bi-breakdown-top">
                    <span className="bi-breakdown-name">Stagnant / At Risk (&gt;90 Days)</span>
                    <span className="bi-breakdown-meta">5% • $10,950</span>
                  </div>
                  <div className="bi-bar-track">
                    <div className="bi-bar-fill" style={{ width: "5%", background: "#ef4444" }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TAB 3: CONVERSION & SALES FUNNEL ---------------- */}
      {activeTab === "conversion" && (
        <div className="bi-tab-content">
          <div className="bi-kpi-grid">
            <div className="bi-kpi-card" style={{ "--card-accent": "#3b82f6" }}>
              <div className="bi-kpi-top">
                <span className="bi-kpi-label">Funnel Conversion Rate</span>
                <div className="bi-kpi-icon"><Zap size={16} /></div>
              </div>
              <div className="bi-kpi-value">3.82%</div>
              <div className="bi-kpi-bottom">
                <span className="bi-kpi-delta positive"><TrendingUp size={12} /> +0.4%</span>
                <span className="bi-kpi-benchmark">E-com Benchmark: 2.5%</span>
              </div>
            </div>

            <div className="bi-kpi-card" style={{ "--card-accent": "#10b981" }}>
              <div className="bi-kpi-top">
                <span className="bi-kpi-label">Average Order Value (AOV)</span>
                <div className="bi-kpi-icon"><DollarSign size={16} /></div>
              </div>
              <div className="bi-kpi-value">$68.50</div>
              <div className="bi-kpi-bottom">
                <span className="bi-kpi-delta positive">+ $4.20 Lift</span>
                <span className="bi-kpi-benchmark">UPT: 2.8 items</span>
              </div>
            </div>

            <div className="bi-kpi-card" style={{ "--card-accent": "#8b5cf6" }}>
              <div className="bi-kpi-top">
                <span className="bi-kpi-label">Cross-Sell Attach Rate</span>
                <div className="bi-kpi-icon"><ShoppingCart size={16} /></div>
              </div>
              <div className="bi-kpi-value">28.4%</div>
              <div className="bi-kpi-bottom">
                <span className="bi-kpi-delta positive"><TrendingUp size={12} /> +5.2%</span>
                <span className="bi-kpi-benchmark">Add-on chews & treats</span>
              </div>
            </div>

            <div className="bi-kpi-card" style={{ "--card-accent": "#ef4444" }}>
              <div className="bi-kpi-top">
                <span className="bi-kpi-label">Checkout Abandonment</span>
                <div className="bi-kpi-icon"><AlertTriangle size={16} /></div>
              </div>
              <div className="bi-kpi-value">21.4%</div>
              <div className="bi-kpi-bottom">
                <span className="bi-kpi-delta negative">- 2.8% Drop</span>
                <span className="bi-kpi-benchmark">Highest on Rx upload</span>
              </div>
            </div>
          </div>

          <div className="bi-charts-row">
            {/* Funnel Step Visualization */}
            <div className="bi-chart-card">
              <div className="bi-chart-header">
                <div>
                  <h4 className="bi-chart-title">End-to-End E-Commerce Funnel</h4>
                  <p className="bi-chart-sub">Step conversion velocity and friction drop-offs</p>
                </div>
              </div>

              <div className="bi-funnel-container">
                <div className="bi-funnel-step">
                  <span className="bi-funnel-label">1. Site Sessions</span>
                  <div className="bi-funnel-bar-box">
                    <div className="bi-funnel-bar-active" style={{ width: "100%" }}></div>
                  </div>
                  <span className="bi-funnel-count">148,200</span>
                  <span className="bi-funnel-rate">100%</span>
                </div>

                <div className="bi-funnel-step">
                  <span className="bi-funnel-label">2. Product Views (PDP)</span>
                  <div className="bi-funnel-bar-box">
                    <div className="bi-funnel-bar-active" style={{ width: "62%" }}></div>
                  </div>
                  <span className="bi-funnel-count">91,884</span>
                  <span className="bi-funnel-rate">62.0%</span>
                </div>

                <div className="bi-funnel-step">
                  <span className="bi-funnel-label">3. Add-to-Cart</span>
                  <div className="bi-funnel-bar-box">
                    <div className="bi-funnel-bar-active" style={{ width: "23%" }}></div>
                  </div>
                  <span className="bi-funnel-count">21,630</span>
                  <span className="bi-funnel-rate">14.6%</span>
                </div>

                <div className="bi-funnel-step">
                  <span className="bi-funnel-label">4. Checkout Started</span>
                  <div className="bi-funnel-bar-box">
                    <div className="bi-funnel-bar-active" style={{ width: "11%" }}></div>
                  </div>
                  <span className="bi-funnel-count">9,480</span>
                  <span className="bi-funnel-rate">6.4%</span>
                </div>

                <div className="bi-funnel-step">
                  <span className="bi-funnel-label">5. Order Completed</span>
                  <div className="bi-funnel-bar-box">
                    <div className="bi-funnel-bar-active" style={{ width: "6%" }}></div>
                  </div>
                  <span className="bi-funnel-count">5,661</span>
                  <span className="bi-funnel-rate">3.82%</span>
                </div>
              </div>
            </div>

            {/* Co-Purchase Attach Heatmap */}
            <div className="bi-chart-card">
              <div className="bi-chart-header">
                <div>
                  <h4 className="bi-chart-title">Cross-Sell Association Matrix</h4>
                  <p className="bi-chart-sub">Category basket affinity and co-purchase rate</p>
                </div>
              </div>

              <div className="bi-breakdown-list">
                <div className="bi-breakdown-item">
                  <div className="bi-breakdown-top">
                    <span className="bi-breakdown-name">Pet Food + Dental Treats</span>
                    <span className="bi-breakdown-meta">48.2% Attach Rate</span>
                  </div>
                  <div className="bi-bar-track">
                    <div className="bi-bar-fill" style={{ width: "48.2%", background: "#10b981" }}></div>
                  </div>
                </div>

                <div className="bi-breakdown-item">
                  <div className="bi-breakdown-top">
                    <span className="bi-breakdown-name">Healthcare + VIP Membership</span>
                    <span className="bi-breakdown-meta">32.6% Attach Rate</span>
                  </div>
                  <div className="bi-bar-track">
                    <div className="bi-bar-fill" style={{ width: "32.6%", background: "#8b5cf6" }}></div>
                  </div>
                </div>

                <div className="bi-breakdown-item">
                  <div className="bi-breakdown-top">
                    <span className="bi-breakdown-name">Food + Joint Supplements</span>
                    <span className="bi-breakdown-meta">27.4% Attach Rate</span>
                  </div>
                  <div className="bi-bar-track">
                    <div className="bi-bar-fill" style={{ width: "27.4%", background: "#3b82f6" }}></div>
                  </div>
                </div>

                <div className="bi-breakdown-item">
                  <div className="bi-breakdown-top">
                    <span className="bi-breakdown-name">Grooming + Flea/Tick Prevention</span>
                    <span className="bi-breakdown-meta">22.8% Attach Rate</span>
                  </div>
                  <div className="bi-bar-track">
                    <div className="bi-bar-fill" style={{ width: "22.8%", background: "#f59e0b" }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TAB 4: CUSTOMER RETENTION & LTV ---------------- */}
      {activeTab === "retention" && (
        <div className="bi-tab-content">
          <div className="bi-kpi-grid">
            <div className="bi-kpi-card" style={{ "--card-accent": "#10b981" }}>
              <div className="bi-kpi-top">
                <span className="bi-kpi-label">30-Day Repeat Rate</span>
                <div className="bi-kpi-icon"><Repeat size={16} /></div>
              </div>
              <div className="bi-kpi-value">44.2%</div>
              <div className="bi-kpi-bottom">
                <span className="bi-kpi-delta positive">+ 3.8% MoM</span>
                <span className="bi-kpi-benchmark">Replenishment Drivers</span>
              </div>
            </div>

            <div className="bi-kpi-card" style={{ "--card-accent": "#8b5cf6" }}>
              <div className="bi-kpi-top">
                <span className="bi-kpi-label">Net Subscription Churn</span>
                <div className="bi-kpi-icon"><Users size={16} /></div>
              </div>
              <div className="bi-kpi-value">2.1%</div>
              <div className="bi-kpi-bottom">
                <span className="bi-kpi-delta positive"><TrendingDown size={12} /> Low Churn</span>
                <span className="bi-kpi-benchmark">Target: &lt; 3.0%</span>
              </div>
            </div>

            <div className="bi-kpi-card" style={{ "--card-accent": "#3b82f6" }}>
              <div className="bi-kpi-top">
                <span className="bi-kpi-label">Average Order Cycle</span>
                <div className="bi-kpi-icon"><Clock size={16} /></div>
              </div>
              <div className="bi-kpi-value">34 Days</div>
              <div className="bi-kpi-bottom">
                <span className="bi-kpi-delta neutral">Predictable Cadence</span>
                <span className="bi-kpi-benchmark">Food &amp; Meds</span>
              </div>
            </div>

            <div className="bi-kpi-card" style={{ "--card-accent": "#f59e0b" }}>
              <div className="bi-kpi-top">
                <span className="bi-kpi-label">12-Month Cumulative LTV</span>
                <div className="bi-kpi-icon"><DollarSign size={16} /></div>
              </div>
              <div className="bi-kpi-value">$384.20</div>
              <div className="bi-kpi-bottom">
                <span className="bi-kpi-delta positive">+ $28.00 vs LY</span>
                <span className="bi-kpi-benchmark">LTV:CAC = 4.8x</span>
              </div>
            </div>
          </div>

          <div className="bi-charts-row">
            {/* Triangular Cohort Retention Heatmap */}
            <div className="bi-chart-card">
              <div className="bi-chart-header">
                <div>
                  <h4 className="bi-chart-title">Monthly Cohort Repurchase Heatmap</h4>
                  <p className="bi-chart-sub">% of customers repurchasing in consecutive months post-acquisition</p>
                </div>
              </div>

              <div className="bi-cohort-table-wrapper">
                <table className="bi-cohort-table">
                  <thead>
                    <tr>
                      <th>Cohort</th>
                      <th>Users</th>
                      <th>M0</th>
                      <th>M1</th>
                      <th>M2</th>
                      <th>M3</th>
                      <th>M4</th>
                      <th>M5</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>May 2026</td>
                      <td>2,450</td>
                      <td style={{ background: "#2563eb", color: "#fff" }}>100%</td>
                      <td style={{ background: "#60a5fa", color: "#fff" }}>46%</td>
                      <td style={{ background: "#93c5fd" }}>38%</td>
                      <td style={{ background: "#bfdbfe" }}>34%</td>
                      <td style={{ background: "#dbeafe" }}>32%</td>
                      <td style={{ background: "#eff6ff" }}>30%</td>
                    </tr>
                    <tr>
                      <td>Jun 2026</td>
                      <td>2,810</td>
                      <td style={{ background: "#2563eb", color: "#fff" }}>100%</td>
                      <td style={{ background: "#60a5fa", color: "#fff" }}>48%</td>
                      <td style={{ background: "#93c5fd" }}>41%</td>
                      <td style={{ background: "#bfdbfe" }}>36%</td>
                      <td style={{ background: "#dbeafe" }}>34%</td>
                      <td style={{ background: "#f8fafc" }}>-</td>
                    </tr>
                    <tr>
                      <td>Jul 2026</td>
                      <td>3,140</td>
                      <td style={{ background: "#2563eb", color: "#fff" }}>100%</td>
                      <td style={{ background: "#60a5fa", color: "#fff" }}>49%</td>
                      <td style={{ background: "#93c5fd" }}>42%</td>
                      <td style={{ background: "#bfdbfe" }}>38%</td>
                      <td style={{ background: "#f8fafc" }}>-</td>
                      <td style={{ background: "#f8fafc" }}>-</td>
                    </tr>
                    <tr>
                      <td>Aug 2026</td>
                      <td>3,620</td>
                      <td style={{ background: "#2563eb", color: "#fff" }}>100%</td>
                      <td style={{ background: "#60a5fa", color: "#fff" }}>51%</td>
                      <td style={{ background: "#93c5fd" }}>45%</td>
                      <td style={{ background: "#f8fafc" }}>-</td>
                      <td style={{ background: "#f8fafc" }}>-</td>
                      <td style={{ background: "#f8fafc" }}>-</td>
                    </tr>
                    <tr>
                      <td>Sep 2026</td>
                      <td>4,180</td>
                      <td style={{ background: "#2563eb", color: "#fff" }}>100%</td>
                      <td style={{ background: "#60a5fa", color: "#fff" }}>54%</td>
                      <td style={{ background: "#f8fafc" }}>-</td>
                      <td style={{ background: "#f8fafc" }}>-</td>
                      <td style={{ background: "#f8fafc" }}>-</td>
                      <td style={{ background: "#f8fafc" }}>-</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Subscription MRR Waterfall */}
            <div className="bi-chart-card">
              <div className="bi-chart-header">
                <div>
                  <h4 className="bi-chart-title">MRR Net Expansion Waterfall</h4>
                  <p className="bi-chart-sub">Monthly changes in active recurring revenue</p>
                </div>
              </div>

              <div className="bi-breakdown-list">
                <div className="bi-breakdown-item">
                  <div className="bi-breakdown-top">
                    <span className="bi-breakdown-name">Starting MRR</span>
                    <span className="bi-breakdown-meta">$34,200</span>
                  </div>
                  <div className="bi-bar-track">
                    <div className="bi-bar-fill" style={{ width: "70%", background: "#64748b" }}></div>
                  </div>
                </div>

                <div className="bi-breakdown-item">
                  <div className="bi-breakdown-top">
                    <span className="bi-breakdown-name">+ New Subscription Sales</span>
                    <span className="bi-breakdown-meta" style={{ color: "#10b981", fontWeight: 700 }}>+$7,800</span>
                  </div>
                  <div className="bi-bar-track">
                    <div className="bi-bar-fill" style={{ width: "35%", background: "#10b981" }}></div>
                  </div>
                </div>

                <div className="bi-breakdown-item">
                  <div className="bi-breakdown-top">
                    <span className="bi-breakdown-name">+ Tier Upgrades (Expansion)</span>
                    <span className="bi-breakdown-meta" style={{ color: "#10b981", fontWeight: 700 }}>+$1,450</span>
                  </div>
                  <div className="bi-bar-track">
                    <div className="bi-bar-fill" style={{ width: "15%", background: "#10b981" }}></div>
                  </div>
                </div>

                <div className="bi-breakdown-item">
                  <div className="bi-breakdown-top">
                    <span className="bi-breakdown-name">- Churned Subscriptions</span>
                    <span className="bi-breakdown-meta" style={{ color: "#ef4444", fontWeight: 700 }}>-$820</span>
                  </div>
                  <div className="bi-bar-track">
                    <div className="bi-bar-fill" style={{ width: "8%", background: "#ef4444" }}></div>
                  </div>
                </div>

                <div className="bi-breakdown-item" style={{ marginTop: "10px", borderTop: "1px dashed #cbd5e1", paddingTop: "8px" }}>
                  <div className="bi-breakdown-top">
                    <span className="bi-breakdown-name" style={{ fontWeight: 800 }}>= Ending MRR</span>
                    <span className="bi-breakdown-meta" style={{ color: "#8b5cf6", fontWeight: 800 }}>$42,630 (+24.6%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TAB 5: MARKETING ROI & GROWTH ---------------- */}
      {activeTab === "marketing" && (
        <div className="bi-tab-content">
          <div className="bi-kpi-grid">
            <div className="bi-kpi-card" style={{ "--card-accent": "#10b981" }}>
              <div className="bi-kpi-top">
                <span className="bi-kpi-label">Blended MER</span>
                <div className="bi-kpi-icon"><Target size={16} /></div>
              </div>
              <div className="bi-kpi-value">4.62x</div>
              <div className="bi-kpi-bottom">
                <span className="bi-kpi-delta positive"><TrendingUp size={12} /> +0.5x</span>
                <span className="bi-kpi-benchmark">Ecosystem Revenue / Spend</span>
              </div>
            </div>

            <div className="bi-kpi-card" style={{ "--card-accent": "#3b82f6" }}>
              <div className="bi-kpi-top">
                <span className="bi-kpi-label">Paid ROAS (Blended)</span>
                <div className="bi-kpi-icon"><DollarSign size={16} /></div>
              </div>
              <div className="bi-kpi-value">3.42x</div>
              <div className="bi-kpi-bottom">
                <span className="bi-kpi-delta positive">+ 0.32x</span>
                <span className="bi-kpi-benchmark">Direct Attributed</span>
              </div>
            </div>

            <div className="bi-kpi-card" style={{ "--card-accent": "#8b5cf6" }}>
              <div className="bi-kpi-top">
                <span className="bi-kpi-label">Blended CAC</span>
                <div className="bi-kpi-icon"><Users size={16} /></div>
              </div>
              <div className="bi-kpi-value">$24.80</div>
              <div className="bi-kpi-bottom">
                <span className="bi-kpi-delta positive"><TrendingDown size={12} /> - $2.40</span>
                <span className="bi-kpi-benchmark">Day-1 AOV: $58.20</span>
              </div>
            </div>

            <div className="bi-kpi-card" style={{ "--card-accent": "#f59e0b" }}>
              <div className="bi-kpi-top">
                <span className="bi-kpi-label">CAC Payback Velocity</span>
                <div className="bi-kpi-icon"><Clock size={16} /></div>
              </div>
              <div className="bi-kpi-value">42 Days</div>
              <div className="bi-kpi-bottom">
                <span className="bi-kpi-delta positive">Fast Breakeven</span>
                <span className="bi-kpi-benchmark">Benchmark: 60 Days</span>
              </div>
            </div>
          </div>

          <div className="bi-charts-row">
            {/* Channel Performance Table */}
            <div className="bi-chart-card">
              <div className="bi-chart-header">
                <div>
                  <h4 className="bi-chart-title">Acquisition Channel Economics & ROAS</h4>
                  <p className="bi-chart-sub">Capital efficiency and day-1 profitability by paid channel</p>
                </div>
              </div>

              <table className="bi-data-table">
                <thead>
                  <tr>
                    <th>Channel</th>
                    <th>Spend ($)</th>
                    <th>New Buyers</th>
                    <th>CAC</th>
                    <th>ROAS</th>
                    <th>Payback</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Google Performance Max (Search)</strong></td>
                    <td>$18,400</td>
                    <td>820</td>
                    <td>$22.40</td>
                    <td><span style={{ color: "#10b981", fontWeight: 700 }}>4.1x</span></td>
                    <td>32 Days</td>
                  </tr>
                  <tr>
                    <td><strong>Meta Ads (Hero Supplements/Kits)</strong></td>
                    <td>$24,600</td>
                    <td>980</td>
                    <td>$25.10</td>
                    <td><span style={{ color: "#10b981", fontWeight: 700 }}>3.4x</span></td>
                    <td>44 Days</td>
                  </tr>
                  <tr>
                    <td><strong>Influencer &amp; Veterinary Referrals</strong></td>
                    <td>$6,200</td>
                    <td>390</td>
                    <td>$15.80</td>
                    <td><span style={{ color: "#10b981", fontWeight: 700 }}>5.2x</span></td>
                    <td>18 Days</td>
                  </tr>
                  <tr>
                    <td><strong>TikTok Top-of-Funnel Video</strong></td>
                    <td>$8,400</td>
                    <td>260</td>
                    <td>$32.30</td>
                    <td><span style={{ color: "#f59e0b", fontWeight: 700 }}>2.1x</span></td>
                    <td>78 Days</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* High-Margin Hero Allocation Breakdown */}
            <div className="bi-chart-card">
              <div className="bi-chart-header">
                <div>
                  <h4 className="bi-chart-title">Ad Spend Absorption Capacity</h4>
                  <p className="bi-chart-sub">Category margin threshold vs allowable acquisition cost</p>
                </div>
              </div>

              <div className="bi-breakdown-list">
                <div className="bi-breakdown-item">
                  <div className="bi-breakdown-top">
                    <span className="bi-breakdown-name">Nutritional Supplements (Hero)</span>
                    <span className="bi-breakdown-meta">Max Allowable CAC: $34</span>
                  </div>
                  <div className="bi-bar-track">
                    <div className="bi-bar-fill" style={{ width: "85%", background: "#10b981" }}></div>
                  </div>
                </div>

                <div className="bi-breakdown-item">
                  <div className="bi-breakdown-top">
                    <span className="bi-breakdown-name">Grooming &amp; Dental Kits</span>
                    <span className="bi-breakdown-meta">Max Allowable CAC: $28</span>
                  </div>
                  <div className="bi-bar-track">
                    <div className="bi-bar-fill" style={{ width: "70%", background: "#3b82f6" }}></div>
                  </div>
                </div>

                <div className="bi-breakdown-item">
                  <div className="bi-breakdown-top">
                    <span className="bi-breakdown-name">Branded Dry Food (Traffic Driver)</span>
                    <span className="bi-breakdown-meta">Max Allowable CAC: $12</span>
                  </div>
                  <div className="bi-bar-track">
                    <div className="bi-bar-fill" style={{ width: "30%", background: "#f59e0b" }}></div>
                  </div>
                </div>

                <div className="bi-breakdown-item">
                  <div className="bi-breakdown-top">
                    <span className="bi-breakdown-name">Membership Starter Pack</span>
                    <span className="bi-breakdown-meta">Max Allowable CAC: $45</span>
                  </div>
                  <div className="bi-bar-track">
                    <div className="bi-bar-fill" style={{ width: "95%", background: "#8b5cf6" }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TAB 6: MASTER MAPPING MATRIX (INTERACTIVE TABLE) ---------------- */}
      {activeTab === "matrix" && (
        <div className="bi-tab-content">
          <div className="bi-table-card">
            <div className="bi-table-toolbar">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Search size={16} color="#64748b" />
                <input
                  type="text"
                  className="bi-search-input"
                  placeholder="Search dashboard, audience, product archetype, or KPI..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <span className="bi-role-badge">
                  Showing {filteredDashboards.length} of {MASTER_DASHBOARDS.length} Dashboards
                </span>
              </div>
            </div>

            <table className="bi-data-table">
              <thead>
                <tr>
                  <th style={{ width: "18%" }}>Dashboard Name</th>
                  <th style={{ width: "20%" }}>Target Audience</th>
                  <th style={{ width: "24%" }}>Assigned Products / Archetypes</th>
                  <th style={{ width: "24%" }}>Primary Rationale</th>
                  <th style={{ width: "14%" }}>Recommended KPIs</th>
                </tr>
              </thead>
              <tbody>
                {filteredDashboards.map((dash) => (
                  <tr key={dash.id}>
                    <td>
                      <div className="bi-dash-tag">
                        <span>{dash.icon}</span> {dash.name}
                      </div>
                      <div style={{ marginTop: "6px" }}>
                        <button
                          className="bi-btn-action"
                          onClick={() => setSelectedDrawerItem(dash)}
                        >
                          Explore SKUs ({dash.sampleSkus.length})
                        </button>
                      </div>
                    </td>
                    <td>
                      <span className="bi-role-badge">{dash.targetAudience}</span>
                    </td>
                    <td>
                      {dash.assignedArchetypes.map((arch, i) => (
                        <span key={i} className="bi-product-tag">
                          {arch}
                        </span>
                      ))}
                    </td>
                    <td style={{ fontSize: "12px", color: "#475569", lineHeight: "1.5" }}>
                      {dash.primaryRationale}
                    </td>
                    <td>
                      {dash.recommendedKpis.map((kpi, j) => (
                        <span key={j} className="bi-kpi-chip">
                          {kpi}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------- SKU DETAIL DRILLDOWN DRAWER ---------------- */}
      {selectedDrawerItem && (
        <div className="bi-drawer-backdrop" onClick={() => setSelectedDrawerItem(null)}>
          <div className="bi-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="bi-drawer-header">
              <h3>
                {selectedDrawerItem.icon} {selectedDrawerItem.name} — Product Drilldown
              </h3>
              <button
                className="bi-btn-close"
                onClick={() => setSelectedDrawerItem(null)}
              >
                ✕
              </button>
            </div>

            <div className="bi-drawer-body">
              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ margin: "0 0 6px 0", fontSize: "14px", color: "#1e293b" }}>
                  Stakeholder Rationale
                </h4>
                <p style={{ margin: 0, fontSize: "13px", color: "#64748b", lineHeight: "1.5" }}>
                  {selectedDrawerItem.primaryRationale}
                </p>
              </div>

              <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#1e293b" }}>
                Mapped Sample Products &amp; SKU Economics ({selectedDrawerItem.sampleSkus.length})
              </h4>

              {selectedDrawerItem.sampleSkus.map((sku) => (
                <div key={sku.id} className="bi-drawer-sku-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div className="bi-drawer-sku-title">{sku.name}</div>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>{sku.id} • {sku.type}</span>
                    </div>
                    <span
                      className={`bi-velocity-badge ${
                        sku.velocity === "Fast" || sku.velocity === "High"
                          ? "velocity-fast"
                          : sku.velocity === "Medium"
                          ? "velocity-medium"
                          : "velocity-slow"
                      }`}
                    >
                      {sku.velocity} Velocity
                    </span>
                  </div>

                  <div className="bi-drawer-sku-metrics">
                    <span><strong>Margin:</strong> {sku.margin}</span>
                    <span><strong>Live Stock:</strong> {sku.stock}</span>
                  </div>
                </div>
              ))}

              <div style={{ marginTop: "24px", padding: "16px", background: "#f1f5f9", borderRadius: "8px" }}>
                <h5 style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#334155" }}>
                  Assigned Key Performance Indicators (KPIs)
                </h5>
                <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "#475569" }}>
                  {selectedDrawerItem.recommendedKpis.map((kpi, idx) => (
                    <li key={idx} style={{ marginBottom: "4px" }}>{kpi}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
