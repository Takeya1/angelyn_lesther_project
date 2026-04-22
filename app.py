import streamlit as st
import json
import pickle
import numpy as np
import pandas as pd
from pathlib import Path

# ── Page config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Kornelsen Door Pricing Calculator",
    page_icon="🚪",
    layout="centered",
)

st.markdown("""
<style>
    .main { max-width: 700px; margin: auto; }
    h1 { font-size: 2rem !important; }
    h2 { font-size: 1.3rem !important; color: #444; }
    .stButton > button {
        width: 100%;
        font-size: 1.1rem;
        padding: 0.6rem;
        border-radius: 8px;
    }
    .price-box {
        background: #1a7a3e;
        color: white;
        border-radius: 12px;
        padding: 1.5rem 2rem;
        text-align: center;
        font-size: 2.2rem;
        font-weight: bold;
        margin: 1.5rem 0;
    }
    .breakdown-box {
        background: #f0f4f0;
        border-left: 4px solid #1a7a3e;
        border-radius: 6px;
        padding: 1rem 1.2rem;
        margin-top: 0.5rem;
        font-size: 0.95rem;
    }
    .section-header {
        background: #e8f0e8;
        border-radius: 6px;
        padding: 0.4rem 0.8rem;
        margin: 1.2rem 0 0.6rem 0;
        font-weight: 600;
        font-size: 1.05rem;
    }
</style>
""", unsafe_allow_html=True)

# ── Load model & feature columns ─────────────────────────────────────────────
MODEL_PATH = Path(__file__).parent / "pricing_model.pkl"
FEATURES_PATH = Path(__file__).parent / "feature_columns.json"

@st.cache_resource
def load_model():
    with open(MODEL_PATH, "rb") as f:
        return pickle.load(f)

@st.cache_data
def load_feature_columns():
    with open(FEATURES_PATH) as f:
        return json.load(f)

model_loaded = MODEL_PATH.exists() and FEATURES_PATH.exists()
if model_loaded:
    model = load_model()
    feature_columns = load_feature_columns()
else:
    st.warning(
        "⚠️ **Model files not found.** Place `pricing_model.pkl` and "
        "`feature_columns.json` in the same folder as this app, then refresh."
    )
    model = None
    feature_columns = []

# ── Constants ─────────────────────────────────────────────────────────────────
WORK_TYPES = [
    "Install", "Labor", "Modify", "Other/Misc", "Relocate", "Remove",
    "Remove and Replace", "Rental", "Repair", "Replace", "Service Call",
    "Supply & Install", "Supply Only",
]

PRODUCT_TYPES = [
    "Dock Bumper", "Dock Door", "Dock Leveler", "Dock Seal/Shelter",
    "Door (General)", "Drive-In Door", "Fire Door/Shutter",
    "Fire Door/Shutter Drop Test", "Hardware/Parts",
    "Hardware/Parts; Door (General)", "High Speed Door", "Impact Door",
    "Labor", "Operator/Opener", "Operator/Opener; Door (General)",
    "Other/Misc", "Remote/Photo Eye", "Residential Door", "Rolling Steel Door",
    "Rolling Steel Door; Operator/Opener", "Rytec Door", "Screen/Bug Door",
    "Shutter", "Specialty Door", "TNR Door", "Telehandler",
    "Traffic/Crash Door", "Weather Seal", "telehandler4",
]

ADDONS = [
    ("Bumpers", "Bumpers2"),
    ("Dock Seal", "Dock Seal2"),
    ("Fire Door", "Firedoor2"),
    ("Drop Test", "Drop Test2"),
    ("Operator / Opener", "Operator/Opener2"),
    ("Hardware / Parts", "Hardware/Parts2"),
    ("Specialty Door", "Specialty Door2"),
    ("Door (General)", "Door(general)2"),
]

def distance_to_tier(km: float) -> tuple[int, str]:
    """Return (tier_int, tier_label) from distance in km."""
    if km <= 50:
        return 1, "Short (≤ 50 km)"
    elif km <= 150:
        return 2, "Medium (51–150 km)"
    else:
        return 3, "Long (> 150 km)"

def build_feature_row(inputs: dict, feature_columns: list) -> pd.DataFrame:
    row = {col: 0 for col in feature_columns}

    # Customer tier
    tier = inputs["customer_tier"]
    row["Customer Tier_Loyalty"]   = 1 if tier == "Loyalty"   else 0
    row["Customer Tier_New"]       = 1 if tier == "New"        else 0
    row["Customer Tier_Recurring"] = 1 if tier == "Recurring"  else 0

    # Lenworth
    row["Is_customer_Lenworth2"] = 1 if inputs["is_lenworth"] else 0

    # Distance
    row["Distance"] = inputs["distance"]
    row["distance3"] = inputs["distance"]
    row["Distance Tier"] = inputs["distance_tier"]

    # Work type — one-hot
    wt_col = "Work_type_" + inputs["work_type"]
    if wt_col in row:
        row[wt_col] = 1

    # Product type — one-hot
    pt_col = "Product_type_" + inputs["product_type"]
    if pt_col in row:
        row[pt_col] = 1

    # Job details
    row["Quantity"]  = inputs["quantity"]
    row["Door_Size2"] = inputs["door_size"]
    row["Install2"]  = 1 if inputs["has_install"] else 0
    row["Remove2"]   = 1 if inputs["has_removal"] else 0
    row["Replace2"]  = 1 if inputs["has_replace"] else 0

    # Add-ons
    for label, col in ADDONS:
        row[col] = 1 if inputs["addons"].get(label, False) else 0

    # Residual2: simple proxy — use door_size × quantity as base indicator
    base = inputs["door_size"] * inputs["quantity"]
    flat_mods = sum(1 for label, _ in ADDONS if inputs["addons"].get(label))
    row["Residual2"] = max(0, base - flat_mods * 10)

    return pd.DataFrame([row])[feature_columns]

# ── Session state helpers ─────────────────────────────────────────────────────
def reset_state():
    for key in list(st.session_state.keys()):
        if key.startswith("calc_"):
            del st.session_state[key]

# ── UI ────────────────────────────────────────────────────────────────────────
st.title("🚪 Kornelsen Door Pricing Calculator")
st.caption("Enter job details below and press **Calculate Price** to get an estimate.")

# ── Section 1: Customer Info ──────────────────────────────────────────────────
st.markdown('<div class="section-header">👤 Customer Info</div>', unsafe_allow_html=True)

col1, col2 = st.columns(2)
with col1:
    customer_tier = st.selectbox(
        "Customer Type", ["Loyalty", "New", "Recurring"],
        key="calc_customer_tier"
    )
with col2:
    is_lenworth = st.toggle("Lenworth Customer?", key="calc_is_lenworth")

col3, col4 = st.columns(2)
with col3:
    distance = st.number_input(
        "Distance (km)", min_value=0.0, value=0.0, step=5.0,
        key="calc_distance"
    )
with col4:
    dist_tier, dist_label = distance_to_tier(distance)
    st.metric("Distance Tier", dist_label)

# ── Section 2: Work Type ──────────────────────────────────────────────────────
st.markdown('<div class="section-header">🔧 Work Type</div>', unsafe_allow_html=True)
work_type = st.selectbox("Select Work Type", WORK_TYPES, key="calc_work_type")

# ── Section 3: Product Type ───────────────────────────────────────────────────
st.markdown('<div class="section-header">📦 Product Type</div>', unsafe_allow_html=True)
product_type = st.selectbox("Select Product Type", PRODUCT_TYPES, key="calc_product_type")

# ── Section 4: Job Details ────────────────────────────────────────────────────
st.markdown('<div class="section-header">📋 Job Details</div>', unsafe_allow_html=True)

col5, col6 = st.columns(2)
with col5:
    quantity  = st.number_input("Quantity", min_value=1, value=1, step=1, key="calc_quantity")
    has_install = st.toggle("Has Install?", key="calc_has_install")
with col6:
    door_size = st.number_input("Door Size (sq ft)", min_value=0.0, value=0.0, step=10.0, key="calc_door_size")
    has_removal = st.toggle("Has Removal?", key="calc_has_removal")

has_replace = st.toggle("Has Replacement?", key="calc_has_replace")

# ── Section 5: Add-ons ────────────────────────────────────────────────────────
st.markdown('<div class="section-header">➕ Add-ons</div>', unsafe_allow_html=True)

addon_cols = st.columns(2)
addon_values = {}
for i, (label, _) in enumerate(ADDONS):
    with addon_cols[i % 2]:
        addon_values[label] = st.checkbox(label, key=f"calc_addon_{label}")

# ── Buttons ───────────────────────────────────────────────────────────────────
st.markdown("---")
btn_col1, btn_col2 = st.columns([3, 1])
with btn_col1:
    calculate = st.button("💰 Calculate Price", type="primary")
with btn_col2:
    if st.button("↺ Reset"):
        reset_state()
        st.rerun()

# ── Prediction ────────────────────────────────────────────────────────────────
if calculate:
    if not model_loaded:
        st.error("Cannot calculate: model files are missing.")
    else:
        inputs = {
            "customer_tier": customer_tier,
            "is_lenworth":   is_lenworth,
            "distance":      distance,
            "distance_tier": dist_tier,
            "work_type":     work_type,
            "product_type":  product_type,
            "quantity":      quantity,
            "door_size":     door_size,
            "has_install":   has_install,
            "has_removal":   has_removal,
            "has_replace":   has_replace,
            "addons":        addon_values,
        }

        X = build_feature_row(inputs, feature_columns)
        prediction = float(model.predict(X)[0])

        st.markdown(
            f'<div class="price-box">Estimated Price: ${prediction:,.2f}</div>',
            unsafe_allow_html=True,
        )

        # Breakdown
        active_addons = [label for label, val in addon_values.items() if val]
        breakdown_lines = [
            f"• Customer type: **{customer_tier}**"
            + (" · Lenworth account" if is_lenworth else ""),
            f"• Work: **{work_type}** — Product: **{product_type}**",
            f"• Qty: **{quantity}** · Door size: **{door_size} sq ft** · Distance: **{distance} km** ({dist_label})",
        ]
        if has_install:
            breakdown_lines.append("• ✔ Install included")
        if has_removal:
            breakdown_lines.append("• ✔ Removal included")
        if has_replace:
            breakdown_lines.append("• ✔ Replacement included")
        if active_addons:
            breakdown_lines.append("• Add-ons: **" + ", ".join(active_addons) + "**")

        breakdown_html = "<br>".join(breakdown_lines)
        st.markdown(
            f'<div class="breakdown-box">{breakdown_html}</div>',
            unsafe_allow_html=True,
        )
