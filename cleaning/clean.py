# ============================================================
# DOOR SIZE EXTRACTION PIPELINE
# Runs Options 1 → 3 in sequence per row
# Mapped to actual invoice column names
# ============================================================
import pandas as pd
import numpy as np
import json

# ── COLUMN NAME MAP ─────────────────────
COL = {
    'customer_tier':    'Customer Tier',
    'date':             'Transaction date',
    'replace':          'Replace',
    'remove':           'Remove',
    'firedoor':         'Firedoor',
    'drop_test':        'Drop Test',
    'bumpers':          'Bumpers',
    'is_lenworth':      'Is_customer_Lenworth',
    'specialty_door':   'Specialty Door',
    'dock_seal':        'Dock Seal',
    'service_type':     'service',             # Updated: now maps to 'service' column
    'hardware_parts':   'Hardware/Parts',
    'description':      'Dimensions',
    'work_type':        'Work_type',
    'flat_services':    'Flat_Services',
    'operator_opener':  'Operator/Opener',
    'install':          'Install',
    'quantity':         'Quantity',
    'unit_price':       'Sales price',         
    'amount':           'Amount',              
    'totals':           'Totals',
    'distance':         'Distance',
    'distance_tier':    'Distance Tier',
}

def col(key):
    """Return the actual column name for an internal key."""
    return COL[key]

def get(row, key):
    """Safely get a value from a row using internal key."""
    return row.get(COL[key])

def get_clean_service(row):
    """Retrieves, strips whitespace, and returns cleaned service name."""
    val = row.get(COL['service_type'])
    if pd.isna(val):
        return None
    return str(val).strip()

# ── PRICING CONFIG ──────────────────────

SERVICES = {
    'Door (General) Install':           {'rate': 5.50, 'min_sqft': 100,  'min_price': None},
    'Door (General) Supply & Install':  {'rate': 5.50, 'min_sqft': 100,  'min_price': None},
    'Install':                          {'rate': 5.50, 'min_sqft': 100,  'min_price': None},
    'High Speed Door Install':          {'rate': 6.00, 'min_sqft': 150,  'min_price': None},
    'High Speed Door Supply & Install': {'rate': 6.00, 'min_sqft': 150,  'min_price': None},
    'Other/Misc Install':               {'rate': 5.50, 'min_sqft': 100,  'min_price': None},
    'Fire Door Install':                {'rate': 5.50, 'min_sqft': None, 'min_price': 800},
    'Traffic/Crash Door Install':       {'rate': 5.50, 'min_sqft': 100,  'min_price': None},
    'Remote/Photo Eye Install':         {'rate': 2.00, 'min_sqft': None, 'min_price': None},
    'Hardware/Parts Install':           {'rate': 2.00, 'min_sqft': None, 'min_price': None},
    'Hardware/Parts Supply & Install':  {'rate': 2.00, 'min_sqft': None, 'min_price': None},
}

STANDARD_SIZES = {
    'Door (General) Install':           [(3,7,21),(4,8,32),(6,7,42),(8,8,64),(10,10,100),(12,12,144)],
    'Door (General) Supply & Install':  [(3,7,21),(4,8,32),(6,7,42),(8,8,64),(10,10,100),(12,12,144)],
    'Install':                          [(3,7,21),(4,8,32),(6,7,42),(8,8,64),(10,10,100)],
    'Fire Door Install':                [(3,7,21),(4,8,32),(6,7,42),(8,8,64)],
    'High Speed Door Install':          [(8,8,64),(10,10,100),(12,12,144),(14,14,196)],
    'High Speed Door Supply & Install': [(8,8,64),(10,10,100),(12,12,144),(14,14,196)],
}

def get_modifier(row):
    if get(row, 'is_lenworth') in [1, True, '1', 'Yes', 'yes', 'TRUE', 'true']:
        return 0.80
    if get(row, 'remove') in [1, True, '1', 'Yes', 'yes', 'TRUE', 'true']:
        return 0.50
    return 1.10

# ── CORE FUNCTIONS ──────────────────────

def back_calculate_sqft(row):
    service  = get_clean_service(row)
    price    = get(row, 'unit_price')
    modifier = get_modifier(row)

    if service not in SERVICES:
        return None, None, None, None, f'flat_rate_or_unknown_service: {service}'

    cfg   = SERVICES[service]
    base  = price / modifier
    sq_ft = base / cfg['rate']

    if cfg.get('min_price') and price < cfg['min_price']:
        return None, None, None, None, 'below_minimum_price'
    if cfg.get('min_sqft') and sq_ft < cfg['min_sqft']:
        return None, None, None, None, 'minimum_charge_floor'

    # Simple rounding for standard snap
    snapped = round(sq_ft / 5) * 5
    confidence = 'high' if abs(snapped - sq_ft) < 5 else 'medium'
    note       = f'back_calculated | raw={sq_ft:.1f} snapped={snapped}'
    return snapped, None, None, confidence, note

def assign_standard_size(service):
    sizes = STANDARD_SIZES.get(service, [])
    if not sizes:
        return None, None, None, 'no_size_applicable'
    width, height, sq_ft = sizes[0]
    return width, height, sq_ft, 'standard_size_default'

# ── PIPELINE ──────────────────────

def run_pipeline(df: pd.DataFrame) -> pd.DataFrame:
    df     = df.copy()
    results = []

    for i, row in df.iterrows():
        service = get_clean_service(row) or 'Unknown'
        price   = get(row, 'unit_price') or 0
        
        # Option 1
        sq_ft, width, height, confidence, note = back_calculate_sqft(row)
        if sq_ft is not None:
            results.append({'door_width': width, 'door_height': height, 'door_sqft': sq_ft, 'size_source': 'back_calculated', 'size_confidence': confidence, 'size_note': note})
        else:
            # Option 3
            width, height, sq_ft, note = assign_standard_size(service)
            results.append({'door_width': width, 'door_height': height, 'door_sqft': sq_ft, 'size_source': 'standard_default', 'size_confidence': 'low', 'size_note': note})

    result_df = pd.DataFrame(results, index=df.index)
    return pd.concat([df, result_df], axis=1)

# ── RUN ──────────────────────
df = pd.read_excel('Ml2.xlsx')
df_enriched = run_pipeline(df)

# Summary and export logic remains same as previous version...
print("✅ Pipeline complete. Service types cleaned and mapped.")
df_enriched.to_csv('invoices_with_door_size.csv', index=False)