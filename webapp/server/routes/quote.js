const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// ── Load encoding maps exported from Colab training ──
const encodingMaps = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../encoding_maps.json'), 'utf8')
);
const WORK_TYPE_ENC = encodingMaps.Work_Type_TargetEnc;
const PRODUCT_TYPE_ENC = encodingMaps.Product_Type_TargetEnc;
const GLOBAL_MEAN = encodingMaps.global_mean;

// Customer tier discount factors: 0=New, 1=Recurring, 2=Loyalty
const TIER_FACTOR = { 0: 1.0, 1: 0.95, 2: 0.90 };

// TODO: Replace mock formula with trained model inference
// Drop pricing_model.pkl into ml/ and start the FastAPI service on port 8000

router.post('/quote', async (req, res) => {
  try {
    const {
      customer_tier, is_lenworth,
      distance, quantity,
      dim_width, dim_height,
      work_type, product_type,
      firedoor, specialty_door, dock_seal,
      bumpers, drop_test, operator_opener,
      job_complexity,
      replace, remove, install,
    } = req.body;

    // ── Feature engineering ──
    const door_size = dim_width * dim_height * quantity;   // ft² × doors
    const door_size_squared = door_size ** 2;
    const log_quantity = Math.log10(quantity);
    const log_distance = Math.log10(distance);
    const qty_x_distance = quantity * distance;
    const qty_x_door_size = quantity * door_size;
    // 0=<50km, 1=<100km, 2=<200km, 3=200km+
    const distance_tier = distance < 50 ? 0 : distance < 100 ? 1 : distance < 200 ? 2 : 3;

    // Average encoded values for multi-select work types; fall back to global mean
    const work_type_target_enc = Array.isArray(work_type)
      ? work_type.reduce((sum, wt) => sum + (WORK_TYPE_ENC[wt] ?? GLOBAL_MEAN), 0) / work_type.length
      : (WORK_TYPE_ENC[work_type] ?? GLOBAL_MEAN);

    const product_type_target_enc = PRODUCT_TYPE_ENC[product_type] ?? GLOBAL_MEAN;

    // ── Enforce model feature column order ──
    const MODEL_FEATURES = [
      'Customer_Tier_Enc', 'Replace', 'Remove', 'Firedoor', 'Drop_Test',
      'Bumpers', 'Is_Lenworth', 'Specialty_Door', 'Dock_Seal', 'Door_General',
      'Hardware_Parts', 'Dim_Width', 'Dim_Height', 'Dim_SqFt', 'Door_Size',
      'Work_Type_Enc', 'Product_Type_Enc', 'Flat_Fee', 'Has_Flat_Service',
      'FS_Operator_Opener', 'FS_Dock_Seal', 'FS_Drop_Test', 'FS_Shelters',
      'FS_Extra_Work', 'FS_Bumper', 'FS_Telehandler', 'Install_Flag',
      'Distance', 'Distance_Tier', 'Job_complexity'
    ];

    const rawFeatures = {
      Door_Size: door_size,
      Job_complexity: job_complexity,
      FS_Drop_Test: drop_test,
      Product_Type_Enc: product_type_target_enc,
      Dim_Width: dim_width,
      Door_General: product_type === "Door General" ? 1 : 0,
      Customer_Tier_Enc: customer_tier,
      Distance: distance,
      Dim_Height: dim_height,
      Dim_SqFt: dim_width * dim_height,
      Flat_Fee: 0,
      Work_Type_Enc: work_type_target_enc,
      Replace: replace,
      Remove: remove,
      Distance_Tier: distance_tier,
      FS_Extra_Work: 0,
      FS_Operator_Opener: operator_opener,
      Hardware_Parts: product_type === "Hardware/Parts" ? 1 : 0,
      Install_Flag: install,
      FS_Bumper: bumpers,
      Has_Flat_Service: 0,
      FS_Dock_Seal: dock_seal,
      Specialty_Door: specialty_door,
      Is_Lenworth: is_lenworth,
      Dock_Seal: dock_seal,
      Bumpers: bumpers,
      Drop_Test: drop_test,
      Firedoor: firedoor,
      FS_Telehandler: 0,
      FS_Shelters: 0
    };

    const orderedFeatures = {};
    MODEL_FEATURES.forEach(col => {
      orderedFeatures[col] = rawFeatures[col] ?? 0;
    });

    // ── Try ML microservice (FastAPI + .pkl) ──
    let unit_price;
    let fallback_warning = null;
    try {
      const mlRes = await fetch(`${process.env.ML_SERVICE_URL || 'http://localhost:8000'}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderedFeatures),
        signal: AbortSignal.timeout(3000),
      });
      if (!mlRes.ok) throw new Error(`ML service error ${mlRes.status}`);
      const mlData = await mlRes.json();
      if (typeof mlData.unit_price !== 'number' || !isFinite(mlData.unit_price)) {
        throw new Error('ML returned invalid unit_price');
      }
      unit_price = mlData.unit_price;
    } catch (mlErr) {
      // ML service unavailable — fall back to mock formula for demos
      console.warn('ML service unreachable, using mock formula. Error:', mlErr.message || mlErr);
      fallback_warning = `ML service unreachable (${mlErr.message || 'unknown error'}), using mock price fallback.`;
      unit_price = mockPrice({
        work_type_target_enc, product_type_target_enc, distance_tier,
        firedoor, specialty_door, door_size,
        bumpers, operator_opener, drop_test, customer_tier,
      });
    }

    const total_price = unit_price * quantity;

    const responseBody = {
      unit_price: round2(unit_price),
      total_price: round2(total_price),
      lower_bound: round2(unit_price * 0.90),
      upper_bound: round2(unit_price * 1.10),
    };

    if (fallback_warning) {
      responseBody.warning = fallback_warning;
    }

    // ── Log the Model output vs Served output ──
    try {
      const logFilePath = path.join(__dirname, '../../ml/latest_prediction.log');
      const logContent = `\n--- OUTGOING RESPONSE ---\n` +
                         `Model Output: ${fallback_warning ? '[FALLBACK]' : JSON.stringify({ unit_price })}\n` +
                         `Served to User: ${JSON.stringify(responseBody, null, 2)}\n` +
                         `-------------------------\n`;
      fs.appendFileSync(logFilePath, logContent);
      console.log(logContent);
    } catch (logErr) {
      console.error('Failed to write to log file:', logErr);
    }

    res.json(responseBody);
  } catch (err) {
    console.error('Quote error:', err);
    res.status(500).json({ error: err.message || 'Failed to compute quote' });
  }
});

// ── Mock formula (used only when ML service is down) ──
// Encodes are normalized against global_mean so they act as relative multipliers
function mockPrice({
  work_type_target_enc, product_type_target_enc, distance_tier,
  firedoor, specialty_door, door_size,
  bumpers, operator_opener, drop_test, customer_tier,
}) {
  const wt_factor = work_type_target_enc / GLOBAL_MEAN;
  const pt_factor = product_type_target_enc / GLOBAL_MEAN;
  const baseline = door_size > 0 ? door_size / 21 : 1; // normalize to 3×7 single-door

  return GLOBAL_MEAN
    * wt_factor
    * pt_factor
    * (1 + 0.05 * distance_tier)
    * (firedoor ? 1.25 : 1)
    * (specialty_door ? 1.35 : 1)
    * baseline
    * (bumpers ? 1.05 : 1)
    * (operator_opener ? 1.15 : 1)
    * (drop_test ? 1.08 : 1)
    * (TIER_FACTOR[customer_tier] ?? 1.0);
}

function round2(n) { return Math.round(n * 100) / 100; }

module.exports = router;
