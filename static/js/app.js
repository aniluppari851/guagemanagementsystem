// ==========================================
// Gauge Management System (GMS) - Frontend Logic
// ==========================================

let allGaugesCache = [];
let trendChartInstance = null;
let categoryChartInstance = null;
let deptChartInstance = null;
let selectedDispatchIds = new Set();
let debounceTimer = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initClock();
  initAddFormDates();
  loadDashboardStats();
  loadGauges();
  loadDrawings();
  loadGaugeStatusMatrix();

  // Set default dispatch date
  const now = new Date();
  const isoLocal = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const dispatchDateEl = document.getElementById('dispatchSentDate');
  if (dispatchDateEl) dispatchDateEl.value = isoLocal;

  const compDateEl = document.getElementById('comp_date');
  if (compDateEl) compDateEl.value = isoLocal;
});

// ==================== NAVIGATION ROUTER ====================

function showSection(sectionId, param = null) {
  const sections = [
    'home', 'addGauge', 'viewGauges', 'maintenance',
    'gaugeReport', 'bulkUpload', 'calPlan', 'sendCal',
    'receiveCal', 'completedCal', 'dailyReports',
    'drawingView', 'gaugeStatus', 'trendView'
  ];

  sections.forEach(id => {
    const el = document.getElementById(id + 'Section');
    if (el) el.classList.add('d-none');
  });

  const activeEl = document.getElementById(sectionId + 'Section');
  if (activeEl) {
    activeEl.classList.remove('d-none');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Update sidebar active link
  document.querySelectorAll('.sidebar .nav-link').forEach(link => {
    link.classList.remove('active');
    const onclickAttr = link.getAttribute('onclick') || '';
    if (onclickAttr.includes(`'${sectionId}'`)) {
      link.classList.add('active');
    }
  });

  // Section-specific loader triggers
  if (sectionId === 'home') {
    loadDashboardStats();
  } else if (sectionId === 'viewGauges') {
    loadGauges();
  } else if (sectionId === 'maintenance') {
    populateMaintenanceDropdown();
  } else if (sectionId === 'calPlan') {
    if (param === 'overdue') {
      const urgencyEl = document.getElementById('gaugeCalUrgencyFilter');
      if (urgencyEl) urgencyEl.value = 'overdue';
    }
    loadCalibrationPlan();
  } else if (sectionId === 'sendCal') {
    loadSendCalibrationList();
  } else if (sectionId === 'receiveCal') {
    loadReceivedGauges();
  } else if (sectionId === 'completedCal') {
    loadCompletedGauges();
  } else if (sectionId === 'dailyReports') {
    loadDailyReports();
  } else if (sectionId === 'drawingView') {
    loadDrawings();
  } else if (sectionId === 'gaugeStatus') {
    loadGaugeStatusMatrix();
  } else if (sectionId === 'trendView') {
    loadTrendCharts();
  }
}

// ==================== LIVE CLOCK ====================

function initClock() {
  function updateTime() {
    const now = new Date();
    const clockEl = document.getElementById('liveClock');
    if (clockEl) {
      clockEl.textContent = now.toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
      }) + ' ' + now.toLocaleTimeString();
    }
  }
  updateTime();
  setInterval(updateTime, 1000);
}

// ==================== TOAST NOTIFICATIONS ====================

function showToast(message, isSuccess = true) {
  const toastEl = document.getElementById('appToast');
  const msgEl = document.getElementById('toastMessage');
  if (!toastEl || !msgEl) return;

  msgEl.textContent = message;
  toastEl.className = `toast align-items-center text-white border-0 ${isSuccess ? 'bg-success' : 'bg-danger'}`;
  const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
  toast.show();
}

// ==================== DASHBOARD & HOME ====================

async function loadDashboardStats() {
  try {
    const res = await fetch('/api/dashboard/stats');
    const data = await res.json();

    document.getElementById('statTotalGauges').textContent = data.total_gauges || 0;
    document.getElementById('statDueThisMonth').textContent = data.due_this_month || 0;
    document.getElementById('statOverdue').textContent = data.overdue || 0;
    document.getElementById('statInLab').textContent = data.in_calibration || 0;

    const overdueBadge = document.getElementById('headerOverdueBadge');
    if (overdueBadge) {
      overdueBadge.textContent = data.overdue || 0;
      overdueBadge.style.display = data.overdue > 0 ? 'inline-block' : 'none';
    }

    // Populate recent activities in home
    const tbody = document.getElementById('homeRecentActivityBody');
    if (tbody && data.recent_activities) {
      if (data.recent_activities.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No recent calibration records.</td></tr>`;
      } else {
        tbody.innerHTML = data.recent_activities.map(act => {
          let badgeColor = 'secondary';
          if (act.status === 'Completed') badgeColor = 'success';
          else if (act.status === 'Sent') badgeColor = 'primary';
          else if (act.status === 'Received') badgeColor = 'info';
          else if (act.status === 'Rejected') badgeColor = 'danger';

          return `
            <tr>
              <td><strong class="font-mono text-dark">${act.nws_gauge_no}</strong></td>
              <td>${act.description || 'Measuring Gauge'}</td>
              <td><span class="badge bg-${badgeColor}">${act.status}</span></td>
              <td><i class="bi bi-person me-1"></i>${act.calibrated_by || 'Jaya Gopal'}</td>
              <td>${act.time_diff_hours ? act.time_diff_hours + ' hrs' : (act.status === 'Completed' ? '4.0 hrs' : 'In-Progress')}</td>
              <td><span class="badge bg-light text-dark border font-mono">${act.certificate_no || 'N/A'}</span></td>
            </tr>
          `;
        }).join('');
      }
    }
  } catch (err) {
    console.error('Error loading dashboard stats:', err);
  }
}

// ==================== GAUGES VIEW & MASTER LIST ====================

function debounceLoadGauges() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(loadGauges, 300);
}

async function loadGauges() {
  const search = document.getElementById('gaugeSearchInput')?.value || '';
  const category = document.getElementById('gaugeCategoryFilter')?.value || '';
  const dept = document.getElementById('gaugeDeptFilter')?.value || '';
  const status = document.getElementById('gaugeStatusFilter')?.value || '';
  const calFilter = document.getElementById('gaugeCalUrgencyFilter')?.value || '';

  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (category) params.append('category', category);
  if (dept) params.append('dept', dept);
  if (status) params.append('status', status);
  if (calFilter) params.append('cal_filter', calFilter);

  const tbody = document.getElementById('gaugeMasterTableBody');
  tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-success me-2"></div>Loading master gauge register...</td></tr>`;

  try {
    const res = await fetch(`/api/gauges?${params.toString()}`);
    const data = await res.json();
    allGaugesCache = data;

    document.getElementById('gaugeCountSummary').textContent = `Showing ${data.length} registered gauge(s)`;

    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" class="text-center py-5 text-muted"><i class="bi bi-inbox fs-3 d-block mb-2"></i>No gauges found matching the criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map((g, idx) => {
      let statusBadge = 'success';
      if (g.status === 'Under Repair') statusBadge = 'warning text-dark';
      else if (g.status === 'Scrap') statusBadge = 'danger';

      let urgencyBadge = 'success';
      let urgencyText = 'In-Date';
      if (g.cal_status === 'Overdue') {
        urgencyBadge = 'danger';
        urgencyText = `Overdue (${Math.abs(g.days_left)}d)`;
      } else if (g.cal_status === 'Due Soon') {
        urgencyBadge = 'warning text-dark';
        urgencyText = `Due in ${g.days_left}d`;
      }

      return `
        <tr>
          <td class="text-center text-muted small">${idx + 1}</td>
          <td><strong class="font-mono text-dark">${g.nws_gauge_no}</strong></td>
          <td><span class="font-mono text-secondary small">${g.gauge_no || g.nws_gauge_no}</span></td>
          <td>
            <div class="fw-semibold text-dark">${g.description || 'N/A'}</div>
            <div class="small text-muted">${g.specification || '-'} &bull; LC: ${g.least_count || '-'}</div>
          </td>
          <td>
            <div class="small fw-semibold">${g.keeping_dept || '-'}</div>
            <div class="small text-muted"><i class="bi bi-geo-alt"></i> ${g.location || '-'} ${g.placement ? `(${g.placement})` : ''}</div>
          </td>
          <td class="text-center">${g.cal_cycle_months || 12}m</td>
          <td class="small text-muted font-mono">${g.last_cal_date || '-'}</td>
          <td>
            <div class="font-mono fw-semibold">${g.next_due_date || '-'}</div>
            <span class="badge bg-${urgencyBadge} small">${urgencyText}</span>
          </td>
          <td><span class="badge bg-${statusBadge}">${g.status}</span></td>
          <td class="text-center">
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-secondary" title="View Details" onclick="viewGaugeDetails(${g.id})">
                <i class="bi bi-eye"></i>
              </button>
              <button class="btn btn-outline-success" title="Maintain / Edit" onclick="editGaugeFromTable(${g.id})">
                <i class="bi bi-pencil-square"></i>
              </button>
              <button class="btn btn-outline-primary" title="Send to Cal" onclick="quickSendSingle(${g.id})">
                <i class="bi bi-send"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('Error fetching gauges:', err);
    tbody.innerHTML = `<tr><td colspan="10" class="text-center text-danger py-4">Failed to load gauges: ${err.message}</td></tr>`;
  }
}

function exportGaugesToCSV() {
  if (!allGaugesCache || allGaugesCache.length === 0) {
    alert("No gauges available to export.");
    return;
  }
  const headers = ["NWS Gauge No", "Gauge No", "Description", "Specification", "Least Count", "Dept", "Location", "Cycle (Months)", "Last Cal", "Next Due", "Status"];
  const rows = allGaugesCache.map(g => [
    `"${g.nws_gauge_no}"`,
    `"${g.gauge_no || ''}"`,
    `"${g.description || ''}"`,
    `"${g.specification || ''}"`,
    `"${g.least_count || ''}"`,
    `"${g.keeping_dept || ''}"`,
    `"${g.location || ''}"`,
    g.cal_cycle_months || 12,
    `"${g.last_cal_date || ''}"`,
    `"${g.next_due_date || ''}"`,
    `"${g.status || ''}"`
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `GMS_Master_Gauges_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ==================== ADD GAUGE ====================

function initAddFormDates() {
  const today = new Date().toISOString().slice(0, 10);
  const lastCalInput = document.getElementById('add_last_cal');
  const receivedInput = document.getElementById('add_received_date');

  if (lastCalInput) lastCalInput.value = today;
  if (receivedInput) receivedInput.value = today;

  calculateNextDueDate();
}

function calculateNextDueDate() {
  const cycleInput = document.getElementById('add_cal_cycle');
  const lastCalInput = document.getElementById('add_last_cal');
  const nextDueInput = document.getElementById('add_next_due');

  if (!cycleInput || !lastCalInput || !nextDueInput) return;

  const cycle = parseInt(cycleInput.value) || 12;
  const lastCal = lastCalInput.value;

  if (lastCal) {
    const dt = new Date(lastCal);
    dt.setDate(dt.getDate() + (cycle * 30));
    nextDueInput.value = dt.toISOString().slice(0, 10);
  }
}

// Sync Gauge No with NWS Gauge No as user types
document.getElementById('add_nws_gauge_no')?.addEventListener('input', (e) => {
  const gNo = document.getElementById('add_gauge_no');
  if (gNo && !gNo.value) {
    gNo.value = e.target.value;
  }
});

async function submitAddGauge(e) {
  e.preventDefault();
  const form = document.getElementById('addGaugeForm');
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  try {
    const res = await fetch('/api/gauges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();

    if (result.success) {
      showToast(result.message || 'Gauge added successfully!');
      form.reset();
      initAddFormDates();
      showSection('viewGauges');
    } else {
      alert(`Error: ${result.error || 'Failed to add gauge'}`);
    }
  } catch (err) {
    console.error('Error adding gauge:', err);
    alert('Failed to submit gauge. Please verify network.');
  }
}

// ==================== GAUGE DETAILS MODAL ====================

async function viewGaugeDetails(gaugeId) {
  try {
    const res = await fetch(`/api/gauges/${gaugeId}`);
    const g = await res.json();

    document.getElementById('gModalTitle').textContent = `${g.nws_gauge_no} - ${g.description}`;
    const modalBody = document.getElementById('gModalBody');

    let logsHtml = '<p class="text-muted small">No calibration logs found.</p>';
    if (g.logs && g.logs.length > 0) {
      logsHtml = `
        <div class="table-responsive mt-2">
          <table class="table table-sm table-bordered small">
            <thead class="table-light">
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Inspector</th>
                <th>Certificate</th>
                <th>Turnaround</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${g.logs.map(l => `
                <tr>
                  <td>${l.completed_date || l.sent_date || l.plan_date || '-'}</td>
                  <td><span class="badge bg-${l.status === 'Completed' ? 'success' : (l.status === 'Sent' ? 'primary' : 'warning')}">${l.status}</span></td>
                  <td>${l.calibrated_by || '-'}</td>
                  <td class="font-mono">${l.certificate_no || '-'}</td>
                  <td>${l.time_diff_hours ? l.time_diff_hours + 'h' : '-'}</td>
                  <td>${l.remarks || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    modalBody.innerHTML = `
      <div class="row g-3">
        <div class="col-md-6">
          <div class="p-3 bg-light rounded border">
            <h6 class="fw-bold text-success border-bottom pb-1">Instrument Specs</h6>
            <table class="table table-sm table-borderless small mb-0">
              <tr><td class="fw-semibold">NWS Gauge No:</td><td class="font-mono">${g.nws_gauge_no}</td></tr>
              <tr><td class="fw-semibold">Gauge / Tool No:</td><td class="font-mono">${g.gauge_no || g.nws_gauge_no}</td></tr>
              <tr><td class="fw-semibold">Description:</td><td>${g.description || '-'}</td></tr>
              <tr><td class="fw-semibold">Specification:</td><td>${g.specification || '-'}</td></tr>
              <tr><td class="fw-semibold">Least Count:</td><td>${g.least_count || '-'}</td></tr>
              <tr><td class="fw-semibold">Category:</td><td>${g.category || '-'}</td></tr>
              <tr><td class="fw-semibold">Measurement:</td><td>${g.measurement || '-'}</td></tr>
              <tr><td class="fw-semibold">Display / Method:</td><td>${g.display || '-'} / ${g.method || '-'}</td></tr>
            </table>
          </div>
        </div>

        <div class="col-md-6">
          <div class="p-3 bg-light rounded border">
            <h6 class="fw-bold text-success border-bottom pb-1">Location & Schedule</h6>
            <table class="table table-sm table-borderless small mb-0">
              <tr><td class="fw-semibold">Department:</td><td>${g.keeping_dept || '-'}</td></tr>
              <tr><td class="fw-semibold">Location / Room:</td><td>${g.location || '-'}</td></tr>
              <tr><td class="fw-semibold">Placement:</td><td>${g.placement || '-'}</td></tr>
              <tr><td class="fw-semibold">Cycle:</td><td>${g.cal_cycle_months || 12} Months</td></tr>
              <tr><td class="fw-semibold">Last Calibration:</td><td class="font-mono">${g.last_cal_date || '-'}</td></tr>
              <tr><td class="fw-semibold">Next Due Date:</td><td class="font-mono fw-bold text-success">${g.next_due_date || '-'}</td></tr>
              <tr><td class="fw-semibold">Status:</td><td><span class="badge bg-success">${g.status || 'Accept'}</span></td></tr>
              <tr><td class="fw-semibold">Drawing Spec:</td><td>${g.drawing_title || 'None'}</td></tr>
            </table>
          </div>
        </div>

        <div class="col-12">
          <h6 class="fw-bold text-dark mt-2"><i class="bi bi-clock-history text-success me-1"></i> Calibration History</h6>
          ${logsHtml}
        </div>
      </div>
    `;

    const modal = new bootstrap.Modal(document.getElementById('gaugeDetailsModal'));
    modal.show();
  } catch (err) {
    console.error('Error viewing gauge details:', err);
  }
}

// ==================== MAINTENANCE & EDIT ====================

function populateMaintenanceDropdown() {
  const select = document.getElementById('maintenanceSelectGauge');
  if (!select) return;

  select.innerHTML = '<option value="">-- Choose a gauge --</option>' +
    allGaugesCache.map(g => `<option value="${g.id}">${g.nws_gauge_no} - ${g.description} (${g.location})</option>`).join('');
}

function onSelectMaintenanceGauge() {
  const select = document.getElementById('maintenanceSelectGauge');
  const gaugeId = select.value;
  if (!gaugeId) {
    document.getElementById('maintenanceGaugeQuickCard').classList.add('d-none');
    document.getElementById('btnSaveMaintenance').disabled = true;
    return;
  }

  const g = allGaugesCache.find(x => x.id == gaugeId);
  if (!g) return;

  // Show quick card
  document.getElementById('mQuickNws').textContent = g.nws_gauge_no;
  document.getElementById('mQuickDesc').textContent = `${g.description} (${g.specification || ''})`;
  document.getElementById('mQuickLoc').textContent = g.location || '-';
  document.getElementById('mQuickDept').textContent = g.keeping_dept || '-';
  document.getElementById('mQuickStatus').textContent = g.status || 'Accept';
  document.getElementById('mQuickDue').textContent = g.next_due_date || '-';
  document.getElementById('maintenanceGaugeQuickCard').classList.remove('d-none');

  // Populate form
  document.getElementById('edit_gauge_id').value = g.id;
  document.getElementById('edit_status').value = g.status || 'Accept';
  document.getElementById('edit_location').value = g.location || '';
  document.getElementById('edit_placement').value = g.placement || '';
  document.getElementById('edit_keeping_dept').value = g.keeping_dept || 'Quality Assurance';
  document.getElementById('edit_cycle').value = g.cal_cycle_months || 12;
  document.getElementById('edit_next_due').value = g.next_due_date || '';
  document.getElementById('edit_note').value = g.note || '';

  document.getElementById('btnSaveMaintenance').disabled = false;
}

function editGaugeFromTable(gaugeId) {
  showSection('maintenance');
  setTimeout(() => {
    const select = document.getElementById('maintenanceSelectGauge');
    if (select) {
      select.value = gaugeId;
      onSelectMaintenanceGauge();
    }
  }, 100);
}

async function submitMaintenanceUpdate(e) {
  e.preventDefault();
  const form = document.getElementById('maintenanceEditForm');
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  const gaugeId = data.gauge_id;

  try {
    const res = await fetch(`/api/gauges/${gaugeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (result.success) {
      showToast('Gauge maintenance record updated successfully!');
      loadGauges();
      loadDashboardStats();
    } else {
      alert(`Error: ${result.error || 'Failed to update'}`);
    }
  } catch (err) {
    console.error('Error updating gauge maintenance:', err);
  }
}

// ==================== GAUGE HISTORY & CERTIFICATE SEARCH ====================

function quickReportSearch(nwsNo) {
  const input = document.getElementById('reportSearchInput');
  if (input) {
    input.value = nwsNo;
    searchGaugeHistory();
  }
}

async function searchGaugeHistory() {
  const query = document.getElementById('reportSearchInput').value.trim();
  if (!query) {
    alert("Please enter a valid NWS Gauge No.");
    return;
  }

  // Find gauge
  let g = allGaugesCache.find(x => x.nws_gauge_no.toLowerCase() === query.toLowerCase() || (x.gauge_no && x.gauge_no.toLowerCase() === query.toLowerCase()));
  if (!g) {
    // Try API search
    const res = await fetch(`/api/gauges?search=${encodeURIComponent(query)}`);
    const list = await res.json();
    if (list && list.length > 0) g = list[0];
  }

  if (!g) {
    alert(`No gauge matching '${query}' found.`);
    return;
  }

  // Fetch full details
  const detailRes = await fetch(`/api/gauges/${g.id}`);
  const data = await detailRes.json();

  document.getElementById('reportGaugeTitle').textContent = `${data.nws_gauge_no} - ${data.description}`;
  document.getElementById('reportGaugeSpec').textContent = `${data.specification || ''} | Least Count: ${data.least_count || 'N/A'}`;
  document.getElementById('reportGaugeLoc').textContent = data.location || '-';
  document.getElementById('reportGaugeDept').textContent = data.keeping_dept || '-';
  document.getElementById('reportGaugeCycle').textContent = `${data.cal_cycle_months || 12} Months`;
  document.getElementById('reportGaugeNextDue').textContent = data.next_due_date || '-';
  document.getElementById('reportGaugeStatusBadge').textContent = data.status || 'Accept';
  document.getElementById('reportGaugeCategoryBadge').textContent = data.category || 'Precision';

  const tbody = document.getElementById('reportLogsTableBody');
  if (!data.logs || data.logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" class="text-center text-muted py-3">No calibration history records logged yet.</td></tr>`;
  } else {
    tbody.innerHTML = data.logs.map(l => `
      <tr>
        <td class="text-center font-mono small">${l.id}</td>
        <td class="small">${l.plan_date || '-'}</td>
        <td class="small">${l.sent_date ? l.sent_date.slice(0, 16) : '-'}</td>
        <td class="small">${l.received_date ? l.received_date.slice(0, 16) : '-'}</td>
        <td class="small fw-semibold">${l.completed_date ? l.completed_date.slice(0, 16) : '-'}</td>
        <td><span class="badge bg-${l.status === 'Completed' ? 'success' : (l.status === 'Sent' ? 'primary' : 'warning')}">${l.status}</span></td>
        <td class="text-center fw-bold">${l.time_diff_hours ? l.time_diff_hours + 'h' : '-'}</td>
        <td>${l.calibrated_by || '-'}</td>
        <td class="font-mono text-dark fw-semibold">${l.certificate_no || '-'}</td>
        <td><span class="badge bg-${l.result === 'Pass' ? 'success' : 'danger'}">${l.result || 'Pass'}</span></td>
        <td class="text-center">
          ${l.certificate_no ? `<button class="btn btn-sm btn-outline-dark" onclick="openCertificateModal(${l.id})"><i class="bi bi-patch-check"></i> Certificate</button>` : '-'}
        </td>
      </tr>
    `).join('');
  }

  document.getElementById('reportResultContainer').classList.remove('d-none');
}

// ==================== CALIBRATION CERTIFICATE MODAL ====================

async function openCertificateModal(logId) {
  try {
    const res = await fetch(`/api/calibration/certificate/${logId}`);
    const cert = await res.json();

    const body = document.getElementById('certificateModalBody');
    body.innerHTML = `
      <div class="certificate-box p-4" id="printableCertificate">
        <div class="text-center border-bottom pb-3 mb-4">
          <h4 class="fw-bold text-success mb-1">PLANT QUALITY ENGINEERING & METROLOGY</h4>
          <h6 class="text-dark fw-bold mb-0">CALIBRATION CERTIFICATE & TEST REPORT</h6>
          <div class="small text-muted">ISO/IEC 17025 Accredited Metrology Laboratory &bull; Lab Code: NABL-CAL-1049</div>
        </div>

        <div class="row g-3 mb-4">
          <div class="col-6">
            <table class="table table-sm table-borderless small mb-0">
              <tr><td class="fw-bold">Certificate No:</td><td class="font-mono fw-bold text-primary">${cert.certificate_no || 'PQE/CAL/26/0411'}</td></tr>
              <tr><td class="fw-bold">Calibration Date:</td><td>${cert.completed_date ? cert.completed_date.slice(0, 10) : '2026-10-28'}</td></tr>
              <tr><td class="fw-bold">Next Due Date:</td><td class="fw-bold text-success">${cert.next_due_date || '2027-10-28'}</td></tr>
              <tr><td class="fw-bold">Calibrated Agency:</td><td>${cert.agency || 'Internal Plant Gauge Room'}</td></tr>
            </table>
          </div>
          <div class="col-6">
            <table class="table table-sm table-borderless small mb-0">
              <tr><td class="fw-bold">NWS Gauge No:</td><td class="font-mono fw-bold">${cert.nws_gauge_no}</td></tr>
              <tr><td class="fw-bold">Description:</td><td>${cert.description}</td></tr>
              <tr><td class="fw-bold">Specification:</td><td>${cert.specification || '-'}</td></tr>
              <tr><td class="fw-bold">Least Count:</td><td>${cert.least_count || '-'}</td></tr>
            </table>
          </div>
        </div>

        <div class="p-3 bg-light rounded border mb-4">
          <h6 class="fw-bold mb-2">Environmental Conditions & Standards:</h6>
          <div class="row small">
            <div class="col-4"><strong>Temperature:</strong> 20.0 &deg;C &plusmn; 0.5 &deg;C</div>
            <div class="col-4"><strong>Humidity:</strong> 50% &plusmn; 5% RH</div>
            <div class="col-4"><strong>Master Standard:</strong> Slip Gauge M88 (Grade 0)</div>
          </div>
        </div>

        <div class="table-responsive mb-4">
          <table class="table table-sm table-bordered text-center small">
            <thead class="table-light">
              <tr>
                <th>Test Parameter</th>
                <th>Nominal Value</th>
                <th>Observed Value</th>
                <th>Permissible Error</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Zero Setting / Datum</td><td>0.000 mm</td><td>0.000 mm</td><td>&plusmn; 0.001 mm</td><td><span class="badge bg-success">PASS</span></td></tr>
              <tr><td>Span / Linearity 25%</td><td>6.250 mm</td><td>6.2505 mm</td><td>&plusmn; 0.002 mm</td><td><span class="badge bg-success">PASS</span></td></tr>
              <tr><td>Span / Linearity 50%</td><td>12.500 mm</td><td>12.501 mm</td><td>&plusmn; 0.002 mm</td><td><span class="badge bg-success">PASS</span></td></tr>
              <tr><td>Repeatability (5 cycles)</td><td>10.000 mm</td><td>10.0002 mm</td><td>&plusmn; 0.001 mm</td><td><span class="badge bg-success">PASS</span></td></tr>
            </tbody>
          </table>
        </div>

        <div class="p-3 bg-light rounded border mb-4">
          <div class="small fw-semibold text-secondary mb-1">Inspector Verification Remarks:</div>
          <div class="small text-dark">${cert.remarks || 'Instrument inspected and calibrated within manufacturer specifications. Suitable for production quality acceptance.'}</div>
        </div>

        <div class="row pt-4 text-center mt-3 border-top">
          <div class="col-4">
            <div class="fw-bold text-dark mb-4">Jaya Gopal</div>
            <div class="border-top pt-1 small text-muted">Calibrated By (Sr. Engineer)</div>
          </div>
          <div class="col-4">
            <div class="fw-bold text-dark mb-4"><span class="badge bg-success px-3 py-2">ACCEPT / FIT FOR USE</span></div>
            <div class="border-top pt-1 small text-muted">Quality Compliance</div>
          </div>
          <div class="col-4">
            <div class="fw-bold text-dark mb-4">Dr. K. S. Sharma</div>
            <div class="border-top pt-1 small text-muted">Approved Quality Head</div>
          </div>
        </div>
      </div>
    `;

    const modal = new bootstrap.Modal(document.getElementById('certificateModal'));
    modal.show();
  } catch (err) {
    console.error('Error opening certificate modal:', err);
  }
}

function printCertificate() {
  window.print();
}

// ==================== BULK UPLOAD ====================

function switchBulkType(type) {
  document.getElementById('bulkUploadTypeInput').value = type;
  const titleEl = document.getElementById('bulkUploadTitle');
  const descEl = document.getElementById('bulkUploadDesc');
  const linkEl = document.getElementById('btnDownloadTemplate');

  linkEl.href = `/api/gauges/template/${type}`;

  if (type === 'master') {
    titleEl.textContent = 'Tool / Instrument Master Upload';
    descEl.textContent = 'Import multiple gauges at once with NWS number, description, specifications, department, calibration cycles, and locations.';
  } else if (type === 'tasklist') {
    titleEl.textContent = 'Calibration Tasklist Upload';
    descEl.textContent = 'Schedule calibration batches by uploading scheduled task dates linked to existing NWS gauge numbers.';
  } else {
    titleEl.textContent = 'Scrap / Decommission List Upload';
    descEl.textContent = 'Decommission defective or damaged tools in bulk by uploading scrap reasons and authorization.';
  }

  // Clear preview
  document.getElementById('csvPreviewBody').innerHTML = '<tr><td class="text-center text-muted py-5">Select a CSV file to preview columns and data before uploading.</td></tr>';
  document.getElementById('bulkCsvFile').value = '';
}

function previewCsvFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    const text = evt.target.result;
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) return;

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    let html = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>`;

    for (let i = 1; i < Math.min(lines.length, 6); i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      html += `<tr>${cols.map(c => `<td>${c}</td>`).join('')}</tr>`;
    }
    html += '</tbody>';
    document.getElementById('csvPreviewTable').innerHTML = html;
  };
  reader.readAsText(file);
}

async function submitBulkUpload(e) {
  e.preventDefault();
  const fileInput = document.getElementById('bulkCsvFile');
  if (!fileInput.files || fileInput.files.length === 0) {
    alert("Please select a CSV file.");
    return;
  }

  const formData = new FormData();
  formData.append('file', fileInput.files[0]);
  formData.append('upload_type', document.getElementById('bulkUploadTypeInput').value);

  const btn = document.getElementById('btnUploadSubmit');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Processing...';

  try {
    const res = await fetch('/api/gauges/bulk-upload', {
      method: 'POST',
      body: formData
    });
    const result = await res.json();

    if (result.success) {
      showToast(result.message);
      fileInput.value = '';
      loadGauges();
      loadDashboardStats();
    } else {
      alert(`Bulk upload error: ${result.error}`);
    }
  } catch (err) {
    console.error('Bulk upload failed:', err);
    alert('Upload request failed. Check server connection.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-upload me-1"></i> Process & Import to Database';
  }
}

// ==================== CALIBRATION PLAN ====================

async function loadCalibrationPlan() {
  const start = document.getElementById('calPlanStartDate')?.value;
  const end = document.getElementById('calPlanEndDate')?.value;

  const params = new URLSearchParams();
  if (start && end) {
    params.append('start_date', start);
    params.append('end_date', end);
  }

  const tbody = document.getElementById('calPlanTableBody');
  tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-success me-2"></div>Loading schedule...</td></tr>`;

  try {
    const res = await fetch(`/api/calibration/plan?${params.toString()}`);
    const data = await res.json();

    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">No scheduled calibrations for selected period.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map((g, idx) => {
      let badge = 'success';
      let text = 'On Schedule';
      if (g.days_left < 0) {
        badge = 'danger';
        text = `Overdue (${Math.abs(g.days_left)} days)`;
      } else if (g.days_left <= 30) {
        badge = 'warning text-dark';
        text = `Due in ${g.days_left} days`;
      }

      return `
        <tr>
          <td class="text-center text-muted small">${idx + 1}</td>
          <td><strong class="font-mono text-dark">${g.nws_gauge_no}</strong></td>
          <td><div class="fw-semibold text-dark">${g.description}</div></td>
          <td>${g.specification || '-'}</td>
          <td><i class="bi bi-geo-alt"></i> ${g.location || '-'}</td>
          <td class="font-mono small">${g.last_cal_date || '-'}</td>
          <td class="font-mono fw-bold">${g.next_due_date || '-'}</td>
          <td><span class="badge bg-${badge}">${text}</span></td>
          <td class="text-center">
            <button class="btn btn-sm btn-outline-success" onclick="quickSendSingle(${g.id})">
              <i class="bi bi-send me-1"></i> Dispatch
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading calibration plan:', err);
  }
}

function resetCalPlanFilter() {
  document.getElementById('calPlanStartDate').value = '';
  document.getElementById('calPlanEndDate').value = '';
  loadCalibrationPlan();
}

// ==================== SEND TO CALIBRATION ====================

async function loadSendCalibrationList() {
  const tbody = document.getElementById('dispatchGaugesTableBody');
  tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-success me-2"></div>Loading gauges...</td></tr>`;

  try {
    const res = await fetch('/api/gauges?status=Accept');
    const data = await res.json();

    selectedDispatchIds.clear();
    updateDispatchCounter();

    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No gauges available to dispatch.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(g => {
      let urgencyBadge = 'success';
      if (g.cal_status === 'Overdue') urgencyBadge = 'danger';
      else if (g.cal_status === 'Due Soon') urgencyBadge = 'warning text-dark';

      return `
        <tr>
          <td class="text-center">
            <input class="form-check-input dispatch-check" type="checkbox" value="${g.id}" onchange="toggleDispatchItem(${g.id}, this.checked)">
          </td>
          <td><strong class="font-mono">${g.nws_gauge_no}</strong></td>
          <td class="fw-semibold">${g.description}</td>
          <td>${g.specification || '-'}</td>
          <td>${g.keeping_dept}</td>
          <td>${g.location}</td>
          <td class="font-mono">${g.next_due_date}</td>
          <td><span class="badge bg-${urgencyBadge}">${g.cal_status}</span></td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading send calibration list:', err);
  }
}

function toggleDispatchItem(id, isChecked) {
  if (isChecked) selectedDispatchIds.add(id);
  else selectedDispatchIds.delete(id);
  updateDispatchCounter();
}

function toggleSelectAllDispatch(masterCheckbox) {
  const checkboxes = document.querySelectorAll('.dispatch-check');
  checkboxes.forEach(cb => {
    cb.checked = masterCheckbox.checked;
    const id = parseInt(cb.value);
    if (masterCheckbox.checked) selectedDispatchIds.add(id);
    else selectedDispatchIds.delete(id);
  });
  updateDispatchCounter();
}

function updateDispatchCounter() {
  const count = selectedDispatchIds.size;
  document.getElementById('selectedDispatchCountText').textContent = `${count} gauge(s) selected for dispatch`;
  document.getElementById('btnDispatchBatch').disabled = (count === 0);
}

function quickSendSingle(gaugeId) {
  showSection('sendCal');
  setTimeout(() => {
    selectedDispatchIds.clear();
    selectedDispatchIds.add(gaugeId);
    document.querySelectorAll('.dispatch-check').forEach(cb => {
      cb.checked = (cb.value == gaugeId);
    });
    updateDispatchCounter();
  }, 150);
}

async function submitDispatchBatch() {
  if (selectedDispatchIds.size === 0) return;

  const payload = {
    gauge_ids: Array.from(selectedDispatchIds),
    agency: document.getElementById('dispatchAgency').value,
    sent_date: document.getElementById('dispatchSentDate').value || new Date().toISOString().slice(0, 19).replace('T', ' '),
    dispatched_by: document.getElementById('dispatchDispatchedBy').value,
    remarks: document.getElementById('dispatchRemarks').value
  };

  try {
    const res = await fetch('/api/calibration/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (result.success) {
      showToast(result.message);
      showSection('receiveCal');
    } else {
      alert(`Dispatch error: ${result.error}`);
    }
  } catch (err) {
    console.error('Dispatch failed:', err);
  }
}

// ==================== RECEIVED GAUGES CHECK-IN ====================

async function loadReceivedGauges() {
  const tbody = document.getElementById('receivedGaugesTableBody');
  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-success me-2"></div>Loading in-transit gauges...</td></tr>`;

  try {
    const res = await fetch('/api/calibration/received');
    const data = await res.json();

    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><i class="bi bi-check-all fs-3 text-success d-block mb-1"></i>All sent gauges have been checked in or calibrated.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(item => `
      <tr>
        <td><strong class="font-mono">${item.nws_gauge_no}</strong></td>
        <td>
          <div class="fw-semibold">${item.description}</div>
          <div class="small text-muted">${item.specification || ''}</div>
        </td>
        <td>${item.agency || 'Internal Lab'}</td>
        <td class="font-mono small">${item.sent_date ? item.sent_date.slice(0, 16) : '-'}</td>
        <td><span class="badge bg-${item.status === 'Received' ? 'info' : 'primary'}">${item.status}</span></td>
        <td class="small text-muted">${item.remarks || '-'}</td>
        <td class="text-center">
          ${item.status === 'Sent' ? `
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-success" onclick="checkInGauge(${item.id}, 'Accept')">
                <i class="bi bi-check-circle me-1"></i> Accept
              </button>
              <button class="btn btn-outline-danger" onclick="checkInGauge(${item.id}, 'Reject')">
                <i class="bi bi-x-circle me-1"></i> Reject
              </button>
            </div>
          ` : `
            <button class="btn btn-sm btn-success" onclick="openCompleteCalibrationModal(${item.id}, ${item.gauge_id}, '${item.nws_gauge_no} - ${item.description}')">
              <i class="bi bi-check2-all me-1"></i> Log Completion
            </button>
          `}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading received gauges:', err);
  }
}

async function checkInGauge(logId, decision) {
  const inspector = prompt(`Enter inspector name for ${decision}:`, "Jaya Gopal");
  if (!inspector) return;

  const remarks = prompt(`Enter verification check-in remarks:`, decision === 'Accept' ? "Visual check and zero reading verified OK." : "Visual damage observed / out of alignment.");
  if (remarks === null) return;

  try {
    const res = await fetch('/api/calibration/receive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        log_id: logId,
        decision: decision,
        inspector: inspector,
        remarks: remarks
      })
    });
    const result = await res.json();
    if (result.success) {
      showToast(result.message);
      loadReceivedGauges();
    }
  } catch (err) {
    console.error('Check-in error:', err);
  }
}

// ==================== COMPLETED GAUGES ====================

async function loadCompletedGauges() {
  const tbody = document.getElementById('completedGaugesTableBody');
  tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-success me-2"></div>Loading completed logs...</td></tr>`;

  try {
    const res = await fetch('/api/calibration/completed-list');
    const data = await res.json();

    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">No completed calibrations logged yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(item => `
      <tr>
        <td><strong class="font-mono text-primary">${item.certificate_no || 'N/A'}</strong></td>
        <td><strong class="font-mono">${item.nws_gauge_no}</strong></td>
        <td>
          <div class="fw-semibold">${item.description}</div>
          <div class="small text-muted">${item.specification || ''}</div>
        </td>
        <td class="font-mono small">${item.completed_date ? item.completed_date.slice(0, 16) : '-'}</td>
        <td class="text-center fw-bold">${item.time_diff_hours ? item.time_diff_hours + ' hrs' : '3.5 hrs'}</td>
        <td>${item.calibrated_by || '-'}</td>
        <td><span class="small">${item.agency || 'Internal Lab'}</span></td>
        <td><span class="badge bg-${item.result === 'Pass' ? 'success' : 'danger'}">${item.result || 'Pass'}</span></td>
        <td class="text-center">
          <button class="btn btn-sm btn-outline-dark" onclick="openCertificateModal(${item.id})">
            <i class="bi bi-printer me-1"></i> View Cert
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading completed gauges:', err);
  }
}

function openCompleteCalibrationModal(logId, gaugeId, gaugeDesc) {
  document.getElementById('comp_log_id').value = logId || '';
  document.getElementById('comp_gauge_id').value = gaugeId || '';
  document.getElementById('comp_gauge_info').value = gaugeDesc || '';

  const certNo = `PQE/CAL/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;
  document.getElementById('comp_cert_no').value = certNo;

  const modal = new bootstrap.Modal(document.getElementById('completeCalibrationModal'));
  modal.show();
}

function openDirectCompleteModal() {
  if (allGaugesCache.length === 0) return;
  const first = allGaugesCache[0];
  openCompleteCalibrationModal(null, first.id, `${first.nws_gauge_no} - ${first.description}`);
}

async function submitCompleteCalibration(e) {
  e.preventDefault();
  const form = document.getElementById('completeCalForm');
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  try {
    const res = await fetch('/api/calibration/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();

    if (result.success) {
      bootstrap.Modal.getInstance(document.getElementById('completeCalibrationModal')).hide();
      showToast(result.message);
      loadCompletedGauges();
      loadGauges();
      loadDashboardStats();
    } else {
      alert(`Error: ${result.error}`);
    }
  } catch (err) {
    console.error('Error completing calibration:', err);
  }
}

// ==================== DAILY REPORTS ====================

function debounceLoadDailyReports() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(loadDailyReports, 300);
}

async function loadDailyReports() {
  const dateVal = document.getElementById('reportFilterDate')?.value || '';
  const personVal = document.getElementById('reportFilterPerson')?.value || '';

  const params = new URLSearchParams();
  if (dateVal) params.append('date', dateVal);
  if (personVal) params.append('calibrated_by', personVal);

  const tbody = document.getElementById('dailyReportsTableBody');
  tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-success me-2"></div>Loading reports...</td></tr>`;

  try {
    const res = await fetch(`/api/calibration/reports?${params.toString()}`);
    const data = await res.json();

    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">No calibration records found for the filter criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map((item, idx) => `
      <tr>
        <td class="text-center text-muted small">${idx + 1}</td>
        <td class="font-mono small">${item.completed_date ? item.completed_date.slice(0, 10) : (item.sent_date ? item.sent_date.slice(0, 10) : item.plan_date)}</td>
        <td><strong class="font-mono">${item.nws_gauge_no}</strong></td>
        <td>${item.description}</td>
        <td>${item.keeping_dept}</td>
        <td><i class="bi bi-person me-1"></i>${item.calibrated_by || '-'}</td>
        <td class="text-center">${item.time_diff_hours ? item.time_diff_hours + ' hrs' : '-'}</td>
        <td class="font-mono small text-primary">${item.certificate_no || 'Pending'}</td>
        <td><span class="badge bg-${item.result === 'Pass' ? 'success' : (item.result === 'Fail' ? 'danger' : 'warning')}">${item.result || item.status}</span></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading daily reports:', err);
  }
}

function resetReportFilters() {
  document.getElementById('reportFilterDate').value = '';
  document.getElementById('reportFilterPerson').value = '';
  loadDailyReports();
}

function exportReportsToCSV() {
  window.print();
}

// ==================== TECHNICAL DRAWINGS ====================

async function loadDrawings() {
  const grid = document.getElementById('drawingsGrid');
  if (!grid) return;

  grid.innerHTML = '<div class="col-12 text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-success me-2"></div>Loading drawings...</div>';

  try {
    const res = await fetch('/api/drawings');
    const data = await res.json();

    if (data.length === 0) {
      grid.innerHTML = '<div class="col-12 text-center py-4 text-muted">No technical drawings or blueprints linked yet.</div>';
      return;
    }

    grid.innerHTML = data.map(d => `
      <div class="col-md-6 col-lg-4">
        <div class="card h-100 border shadow-sm">
          <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center py-2">
            <span class="font-mono small text-info">${d.doc_number || 'DWG-001'}</span>
            <span class="badge bg-secondary">${d.revision || 'Rev 1.0'}</span>
          </div>
          <div class="card-body p-3">
            <h6 class="fw-bold text-dark mb-1">${d.title}</h6>
            <div class="small text-muted mb-2 font-mono">Linked Gauge: <strong>${d.nws_gauge_no}</strong> (${d.description})</div>
            <p class="small text-secondary mb-3">${d.spec_notes || 'Specification sheet and allowable measurement deviation tolerance.'}</p>
            
            <!-- Blueprint Mini Thumbnail -->
            <div class="blueprint-canvas blueprint-grid p-3 text-center mb-3 rounded" style="height: 120px; display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="viewBlueprintModal(${d.id}, '${d.title}', '${d.doc_number}', '${d.nws_gauge_no}')">
              <div>
                <i class="bi bi-bezier2 fs-1 text-info opacity-75"></i>
                <div class="small text-info mt-1 font-mono">CLICK TO INSPECT CAD BLUEPRINT</div>
              </div>
            </div>

            <button class="btn btn-sm btn-outline-success w-100" onclick="viewBlueprintModal(${d.id}, '${d.title}', '${d.doc_number}', '${d.nws_gauge_no}')">
              <i class="bi bi-arrows-fullscreen me-1"></i> View Full Blueprint & Tolerances
            </button>
          </div>
          <div class="card-footer bg-white text-muted small py-2 d-flex justify-content-between">
            <span>By: ${d.uploaded_by || 'Jaya Gopal'}</span>
            <span>${d.uploaded_at ? d.uploaded_at.slice(0, 10) : ''}</span>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading drawings:', err);
  }
}

function viewBlueprintModal(id, title, docNo, nwsNo) {
  document.getElementById('drawModalTitle').textContent = `${title} (${nwsNo})`;
  document.getElementById('drawModalDocNo').textContent = docNo;

  const body = document.getElementById('drawModalBody');
  body.innerHTML = `
    <div class="row g-4">
      <div class="col-lg-8">
        <div class="blueprint-canvas blueprint-grid p-4 text-center rounded-3">
          
          <!-- High-tech SVG Blueprint Rendering -->
          <svg viewBox="0 0 700 360" width="100%" height="340" style="background: transparent;">
            <!-- Outer border & corner targets -->
            <rect x="10" y="10" width="680" height="340" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="4,4"/>
            <circle cx="20" cy="20" r="4" fill="#38bdf8"/>
            <circle cx="680" cy="20" r="4" fill="#38bdf8"/>
            <circle cx="20" cy="340" r="4" fill="#38bdf8"/>
            <circle cx="680" cy="340" r="4" fill="#38bdf8"/>

            <!-- Centerline -->
            <line x1="30" y1="180" x2="670" y2="180" stroke="#0284c7" stroke-width="1" stroke-dasharray="8,4,2,4"/>
            <line x1="350" y1="30" x2="350" y2="330" stroke="#0284c7" stroke-width="1" stroke-dasharray="8,4,2,4"/>

            <!-- Instrument Outline (CAD schematic) -->
            <!-- Anvil left -->
            <rect x="180" y="140" width="30" height="80" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
            <!-- Spindle right -->
            <rect x="290" y="160" width="160" height="40" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
            <!-- Thimble barrel -->
            <rect x="450" y="150" width="110" height="60" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
            <!-- Ratchet stop -->
            <rect x="560" y="165" width="40" height="30" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
            <!-- Micrometer U-Frame -->
            <path d="M 180,180 C 130,180 130,280 250,280 C 370,280 370,180 330,180" fill="none" stroke="#38bdf8" stroke-width="4"/>

            <!-- Measurement Dimension Arrows -->
            <line x1="210" y1="120" x2="290" y2="120" stroke="#f59e0b" stroke-width="2"/>
            <polygon points="210,116 200,120 210,124" fill="#f59e0b"/>
            <polygon points="290,116 300,120 290,124" fill="#f59e0b"/>
            <text x="215" y="112" fill="#f59e0b" font-size="12" font-family="monospace">MEASUREMENT RANGE 0 - 25.000mm</text>

            <!-- Tolerance notes -->
            <text x="50" y="50" fill="#38bdf8" font-size="14" font-weight="bold" font-family="monospace">CAD SPECIFICATION SCHEMATIC</text>
            <text x="50" y="70" fill="#94a3b8" font-size="11" font-family="monospace">PARALLELISM: &le; 1.0 &mu;m &bull; FLATNESS: &le; 0.3 &mu;m &bull; ANVIL CARBIDE TIPPED</text>
            
            <!-- Measuring points -->
            <circle cx="210" cy="180" r="5" fill="#22c55e"/>
            <circle cx="290" cy="180" r="5" fill="#22c55e"/>
            <text x="180" y="210" fill="#22c55e" font-size="10" font-family="monospace">Pt A (Anvil)</text>
            <text x="290" y="210" fill="#22c55e" font-size="10" font-family="monospace">Pt B (Spindle)</text>
          </svg>

        </div>
      </div>

      <div class="col-lg-4">
        <h6 class="fw-bold text-dark border-bottom pb-2">Technical Dimension Parameters</h6>
        <table class="table table-sm table-bordered small">
          <tbody>
            <tr><td class="fw-semibold">Document:</td><td class="font-mono">${docNo}</td></tr>
            <tr><td class="fw-semibold">Target Gauge:</td><td class="font-mono text-success">${nwsNo}</td></tr>
            <tr><td class="fw-semibold">Nominal Range:</td><td>0 - 25.000 mm</td></tr>
            <tr><td class="fw-semibold">Resolution:</td><td>0.001 mm (1 Micron)</td></tr>
            <tr><td class="fw-semibold">Permissible Error:</td><td>&plusmn; 0.002 mm</td></tr>
            <tr><td class="fw-semibold">Contact Face:</td><td>Tungsten Carbide (HRA 90)</td></tr>
            <tr><td class="fw-semibold">Standards Body:</td><td>DIN 863-1 / IS 2967</td></tr>
          </tbody>
        </table>

        <div class="alert alert-info small py-2 mb-0">
          <i class="bi bi-info-circle me-1"></i>
          Drawing approved by Quality Engineering for plant metrology inspection.
        </div>
      </div>
    </div>
  `;

  const modal = new bootstrap.Modal(document.getElementById('drawingModal'));
  modal.show();
}

function openAddDrawingModal() {
  const select = document.getElementById('draw_gauge_id');
  select.innerHTML = allGaugesCache.map(g => `<option value="${g.id}">${g.nws_gauge_no} - ${g.description}</option>`).join('');

  const modal = new bootstrap.Modal(document.getElementById('addDrawingModal'));
  modal.show();
}

async function submitAddDrawing(e) {
  e.preventDefault();
  const form = document.getElementById('addDrawingForm');
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  try {
    const res = await fetch('/api/drawings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();

    if (result.success) {
      bootstrap.Modal.getInstance(document.getElementById('addDrawingModal')).hide();
      showToast(result.message);
      form.reset();
      loadDrawings();
    } else {
      alert(`Error: ${result.error}`);
    }
  } catch (err) {
    console.error('Error adding drawing:', err);
  }
}

// ==================== GAUGE STATUS MATRIX ====================

async function loadGaugeStatusMatrix() {
  try {
    const res = await fetch('/api/gauge-status/matrix');
    const data = await res.json();

    document.getElementById('matrixTotal').textContent = data.summary.total_gauges || 0;
    document.getElementById('matrixAccept').textContent = data.summary.accept || 0;
    document.getElementById('matrixRepair').textContent = data.summary.under_repair || 0;
    document.getElementById('matrixScrap').textContent = data.summary.scrap || 0;
    document.getElementById('matrixInCal').textContent = data.summary.in_calibration || 0;
    document.getElementById('matrixCompleted').textContent = data.summary.completed_logs || 0;

    const tbody = document.getElementById('departmentMatrixBody');
    if (tbody && data.department_matrix) {
      tbody.innerHTML = data.department_matrix.map(dm => {
        let barColor = 'success';
        if (dm.compliance_pct < 80) barColor = 'warning';
        if (dm.compliance_pct < 60) barColor = 'danger';

        return `
          <tr>
            <td class="fw-semibold text-dark"><i class="bi bi-diagram-2 me-1 text-muted"></i> ${dm.dept}</td>
            <td class="text-center fw-bold">${dm.total}</td>
            <td class="text-center text-success fw-bold">${dm.accept}</td>
            <td class="text-center text-warning fw-bold">${dm.under_repair}</td>
            <td class="text-center text-danger fw-bold">${dm.scrap}</td>
            <td class="text-center fw-bold">${dm.compliance_pct}%</td>
            <td style="width: 200px;">
              <div class="progress" style="height: 10px;">
                <div class="progress-bar bg-${barColor}" style="width: ${dm.compliance_pct}%"></div>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Error loading gauge status matrix:', err);
  }
}

// ==================== MONTHLY GAUGE TREND CHARTS ====================

async function loadTrendCharts() {
  try {
    const res = await fetch('/api/dashboard/trend');
    const data = await res.json();

    // 1. Grouped Bar Chart: Monthly Trend
    const ctxTrend = document.getElementById('trendChart')?.getContext('2d');
    if (ctxTrend) {
      if (trendChartInstance) trendChartInstance.destroy();

      trendChartInstance = new Chart(ctxTrend, {
        type: 'bar',
        data: {
          labels: data.monthly_trend.labels,
          datasets: [
            {
              label: 'Planned Calibrations',
              data: data.monthly_trend.plan,
              backgroundColor: '#0284c7',
              borderRadius: 4
            },
            {
              label: 'Completed Calibrations',
              data: data.monthly_trend.completed,
              backgroundColor: '#16a34a',
              borderRadius: 4
            },
            {
              label: 'Pending Calibrations',
              data: data.monthly_trend.pending,
              backgroundColor: '#f59e0b',
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' },
            tooltip: { mode: 'index', intersect: false }
          },
          scales: {
            y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // 2. Category Breakdown Doughnut Chart
    const ctxCat = document.getElementById('categoryChart')?.getContext('2d');
    if (ctxCat && data.categories) {
      if (categoryChartInstance) categoryChartInstance.destroy();

      const catLabels = Object.keys(data.categories);
      const catCounts = Object.values(data.categories);

      categoryChartInstance = new Chart(ctxCat, {
        type: 'doughnut',
        data: {
          labels: catLabels,
          datasets: [{
            data: catCounts,
            backgroundColor: [
              '#16a34a', '#0284c7', '#f59e0b', '#8b5cf6',
              '#ec4899', '#14b8a6', '#64748b', '#e11d48'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { boxWidth: 12 } }
          }
        }
      });
    }

    // 3. Department Allocation Horizontal Bar Chart
    const ctxDept = document.getElementById('deptChart')?.getContext('2d');
    if (ctxDept && data.departments) {
      if (deptChartInstance) deptChartInstance.destroy();

      const deptLabels = Object.keys(data.departments);
      const deptCounts = Object.values(data.departments);

      deptChartInstance = new Chart(ctxDept, {
        type: 'bar',
        data: {
          labels: deptLabels,
          datasets: [{
            label: 'Total Gauges Allocated',
            data: deptCounts,
            backgroundColor: '#1f6b3b',
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { beginAtZero: true, grid: { color: '#f1f5f9' } },
            y: { grid: { display: false } }
          }
        }
      });
    }

  } catch (err) {
    console.error('Error loading trend charts:', err);
  }
}
