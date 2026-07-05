// ================================
// 🌐 API CONFIG
// ================================
const API_BASE_URL = 'https://gdfc-backend-1.onrender.com';
const FEATURES_URL = `${API_BASE_URL}/features`;
const PREDICT_URL = `${API_BASE_URL}/predict`;

// ================================
// 🔁 GLOBAL STATE
// ================================
const state = {
    isWarping: false,
    chart: null,
    featureNames: [],
    schemaReady: false
};

// ================================
// 📦 DOM ELEMENTS
// ================================
const dom = {
    form: document.getElementById('diagnostics-form'),
    inputsGrid: document.getElementById('inputs-grid'),
    btnSubmit: document.getElementById('btn-submit'),
    btnFillSample: document.getElementById('btn-fill-sample'),
    predictionResult: document.getElementById('prediction-result'),
    terminalLog: document.getElementById('terminal-log')
};

// ================================
// 🧠 UTILS
// ================================
function log(msg, type = 'cyan') {
    console.log(msg);
}

function setResult(msg, type = 'idle') {
    dom.predictionResult.textContent = msg;
    dom.predictionResult.dataset.status = type;
}

function setFormEnabled(enabled) {
    dom.btnSubmit.disabled = !enabled;
    dom.btnFillSample.disabled = !enabled;
}

// ================================
// 🔄 LOAD FEATURES (AUTO + RETRY)
// ================================
async function loadFeatureSchema(retries = 3) {
    setFormEnabled(false);
    setResult("Loading model schema...");

    try {
        const res = await fetch(FEATURES_URL);

        if (!res.ok) throw new Error("Backend waking up...");

        const data = await res.json();

        if (!data.features || !Array.isArray(data.features)) {
            throw new Error("Invalid feature schema");
        }

        state.featureNames = data.features;
        state.schemaReady = true;

        renderInputs(data.features);

        setFormEnabled(true);
        setResult(`Loaded ${data.features.length} features`, "ready");

        log("✅ Schema loaded");

    } catch (err) {
        if (retries > 0) {
            log("Retrying...");
            await new Promise(r => setTimeout(r, 2000));
            return loadFeatureSchema(retries - 1);
        }

        setResult(err.message, "error");
        log("❌ Failed to load schema");
    }
}

// ================================
// 🧩 RENDER INPUTS
// ================================
function renderInputs(features) {
    dom.inputsGrid.innerHTML = "";

    features.forEach((f, i) => {
        const input = document.createElement("input");
        input.type = "number";
        input.name = f;
        input.placeholder = f;
        input.required = true;

        dom.inputsGrid.appendChild(input);
    });
}

// ================================
// 🎲 SAMPLE DATA
// ================================
function fillSampleData() {
    const inputs = dom.form.querySelectorAll("input");

    inputs.forEach(input => {
        input.value = (Math.random() * 10).toFixed(2);
    });
}

// ================================
// 📡 REQUEST PREDICTION
// ================================
async function requestPrediction(payload) {
    const res = await fetch(PREDICT_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    let data = {};
    try {
        data = await res.json();
    } catch {
        throw new Error("Invalid JSON from backend");
    }

    if (!res.ok) {
        throw new Error(data.message || "Prediction failed");
    }

    return data;
}

// ================================
// 🚀 SUBMIT HANDLER
// ================================
async function handleSubmit(e) {
    e.preventDefault();

    if (!state.schemaReady) {
        setResult("Schema not loaded", "error");
        return;
    }

    const inputs = dom.form.querySelectorAll("input");

    const payload = {};

    for (let input of inputs) {
        if (input.value === "") {
            setResult(`${input.name} required`, "error");
            return;
        }
        payload[input.name] = Number(input.value);
    }

    setResult("Processing...", "pending");

    try {
        const res = await requestPrediction(payload);

        if (res && res.prediction !== undefined) {
            setResult(
                res.message || `Prediction: ${res.prediction}`,
                res.prediction === 1 ? "anomaly" : "normal"
            );
        }

    } catch (err) {
        setResult(err.message, "error");
    }
}

// ================================
// 🎯 INIT
// ================================
document.addEventListener("DOMContentLoaded", () => {

    loadFeatureSchema(); // 🔥 IMPORTANT

    dom.form.addEventListener("submit", handleSubmit);
    dom.btnFillSample.addEventListener("click", fillSampleData);

});