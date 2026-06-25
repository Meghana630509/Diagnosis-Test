/* -------------------------------------------------
   Constants – API endpoint & auth
   ------------------------------------------------- */
const API_URL = 'https://fedskillstest.coalitiontechnologies.workers.dev';
const USERNAME = 'coalition';
const PASSWORD = 'skills-test';

/* -------------------------------------------------
   Helper: Basic‑Auth header (generated at runtime)
   ------------------------------------------------- */
function makeAuthHeader() {
  const token = btoa(`${USERNAME}:${PASSWORD}`); // Base64‑encode on the fly
  return `Basic ${token}`;
}

/* -------------------------------------------------
   UI helpers
   ------------------------------------------------- */
const loadingOverlay = document.getElementById('loadingOverlay');
function showLoading() { loadingOverlay.classList.remove('hidden'); }
function hideLoading() { loadingOverlay.classList.add('hidden'); }

function el(id) { return document.getElementById(id); }

/* -------------------------------------------------
   Fetch all patients, then render Jessica Taylor
   ------------------------------------------------- */
async function fetchPatients() {
  const response = await fetch(API_URL, {
    headers: { Authorization: makeAuthHeader() },
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  return data.patients; // API returns { patients: [...] }
}

/* -------------------------------------------------
   Populate the UI with the selected patient
   ------------------------------------------------- */
function populatePatient(patient) {
  // ---- Sidebar patient list (highlight Jessica) ----
  const list = document.getElementById('patientList');
  list.innerHTML = '';
  patients.forEach(p => {
    const li = document.createElement('li');
    li.textContent = `${p.first_name} ${p.last_name}`;
    li.dataset.id = p.id;
    if (p.id === patient.id) li.classList.add('selected');
    list.appendChild(li);
  });

  // ---- Profile panel ----
  el('profileImg').src = patient.photo || 'assets/placeholder.png';
  el('patientName').textContent = `${patient.first_name} ${patient.last_name}`;
  el('patientGenderAge').textContent = `${patient.gender}, ${patient.age} y`;
  el('patientDOB').textContent = `DOB: ${patient.dob}`;
  el('patientPhone').textContent = `Phone: ${patient.phone}`;
  el('patientEmergency').textContent = `Emergency: ${patient.emergency_contact}`;
  el('patientInsurance').textContent = `Insurance: ${patient.insurance_type}`;

  // ---- Diagnosis history table ----
  const diagBody = el('diagnosisTable').querySelector('tbody');
  diagBody.innerHTML = '';
  patient.diagnosis_history.forEach(d => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${new Date(d.date).toLocaleDateString()}</td>
      <td>${d.diagnosis}</td>
      <td>${d.doctor}</td>`;
    diagBody.appendChild(tr);
  });

  // ---- Vitals cards ----
  el('respRate').textContent = patient.respiratory_rate + ' breaths/min';
  el('temperature').textContent = patient.temperature + ' °C';
  el('heartRate').textContent = patient.heart_rate + ' bpm';

  // ---- Lab results list ----
  const labUl = el('labResults');
  labUl.innerHTML = '';
  patient.lab_results.forEach(l => {
    const li = document.createElement('li');
    li.textContent = `${l.test}: ${l.result} (${l.unit})`;
    labUl.appendChild(li);
  });

  // ---- Blood‑Pressure chart ----
  renderBPChart(patient.diagnosis_history);
}

/* -------------------------------------------------
   Chart.js – Blood Pressure (systolic & diastolic)
   ------------------------------------------------- */
let bpChart; // keep reference to destroy on updates
function renderBPChart(diagnoses) {
  // Extract the last 6 months (or all if <6)
  const sorted = diagnoses
    .map(d => ({
      date: new Date(d.date),
      sys: d.blood_pressure?.systolic,
      dia: d.blood_pressure?.diastolic,
    }))
    .filter(d => d.sys && d.dia)
    .sort((a, b) => a.date - b.date)
    .slice(-6);

  const labels = sorted.map(d => d.date.toLocaleDateString(undefined, { month: 'short' }));
  const systolic = sorted.map(d => d.sys);
  const diastolic = sorted.map(d => d.dia);

  const ctx = el('bpChart').getContext('2d');

  if (bpChart) bpChart.destroy();

  bpChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Systolic',
          data: systolic,
          borderColor: '#ff6384',
          backgroundColor: 'rgba(255,99,132,0.1)',
          tension: 0.3,
          fill: true,
        },
        {
          label: 'Diastolic',
          data: diastolic,
          borderColor: '#36a2eb',
          backgroundColor: 'rgba(54,162,235,0.1)',
          tension: 0.3,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: {
        y: {
          beginAtZero: false,
          title: { display: true, text: 'mmHg' }
        }
      }
    }
  });
}

/* -------------------------------------------------
   Entry point
   ------------------------------------------------- */
let patients = []; // will hold full list for sidebar
async function init() {
  try {
    showLoading();
    patients = await fetchPatients();

    // Find Jessica Taylor (case‑insensitive)
    const jessica = patients.find(p =>
      `${p.first_name} ${p.last_name}`.toLowerCase() === 'jessica taylor');

    if (!jessica) throw new Error('Patient "Jessica Taylor" not found.');

    populatePatient(jessica);
  } catch (err) {
    console.error(err);
    alert('Failed to load patient data. See console for details.');
  } finally {
    hideLoading();
  }
}

/* -------------------------------------------------
   Run
   ------------------------------------------------- */
document.addEventListener('DOMContentLoaded', init);