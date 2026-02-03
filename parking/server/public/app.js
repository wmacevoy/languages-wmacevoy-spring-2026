const lotList = document.getElementById('lot-list');
const lastUpdated = document.getElementById('last-updated');
const refreshBtn = document.getElementById('refresh');
const adminForm = document.getElementById('admin-form');
const adminSelect = document.getElementById('admin-lot');
const adminStatus = document.getElementById('admin-status');
const sensorForm = document.getElementById('sensor-form');
const sensorSelect = document.getElementById('sensor-lot');
const sensorOccupancy = document.getElementById('sensor-occupancy');
const sensorStatus = document.getElementById('sensor-status');

const state = {
  lots: [],
};

const statusMessage = (element, message, isError = false) => {
  element.textContent = message;
  element.style.color = isError ? '#8a2b1f' : 'rgba(16, 21, 24, 0.65)';
};

const formatTime = (iso) => {
  if (!iso) return '--';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString();
};

const renderLots = () => {
  lotList.innerHTML = '';

  state.lots.forEach((lot, index) => {
    const card = document.createElement('div');
    card.className = 'lot-card';
    card.style.animationDelay = `${index * 60}ms`;

    const badgeClass = lot.is_open ? 'open' : 'closed';
    const badgeLabel = lot.is_open ? 'Open' : 'Closed';

    card.innerHTML = `
      <div class="lot-top">
        <strong>${lot.name}</strong>
        <span class="badge ${badgeClass}">${badgeLabel}</span>
      </div>
      <div class="availability">
        <span>Available</span>
        <strong>${lot.available}</strong>
      </div>
      <div class="meta-row">
        <span>Capacity: ${lot.capacity}</span>
        <span>Occupied: ${lot.occupancy}</span>
      </div>
      <div class="meta-row">
        <span>Updated</span>
        <span>${formatTime(lot.updated_at)}</span>
      </div>
    `;

    lotList.appendChild(card);
  });
};

const renderSelects = () => {
  const adminValue = adminSelect.value;
  const sensorValue = sensorSelect.value;

  adminSelect.innerHTML = '';
  sensorSelect.innerHTML = '';

  state.lots.forEach((lot) => {
    const option = document.createElement('option');
    option.value = lot.id;
    option.textContent = lot.name;

    const optionClone = option.cloneNode(true);
    adminSelect.appendChild(option);
    sensorSelect.appendChild(optionClone);
  });

  if (adminValue) adminSelect.value = adminValue;
  if (sensorValue) sensorSelect.value = sensorValue;

  updateOccupancyHint();
};

const updateOccupancyHint = () => {
  const selectedId = Number(sensorSelect.value);
  const lot = state.lots.find((item) => item.id === selectedId);
  if (!lot) return;

  sensorOccupancy.max = String(lot.capacity);
  sensorOccupancy.value = String(lot.occupancy);
};

const loadLots = async () => {
  const response = await fetch('/api/lots');
  if (!response.ok) {
    throw new Error('Failed to load lots');
  }
  state.lots = await response.json();
  renderLots();
  renderSelects();
  lastUpdated.textContent = new Date().toLocaleString();
};

const handleAdminAction = async (action) => {
  adminStatus.textContent = 'Working...';
  const lotId = adminSelect.value;
  try {
    const response = await fetch(`/api/lots/${lotId}/${action}`, {
      method: 'POST',
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Action failed');
    }
    statusMessage(adminStatus, `${data.name} is now ${data.is_open ? 'open' : 'closed'}.`);
    await loadLots();
  } catch (err) {
    statusMessage(adminStatus, err.message, true);
  }
};

const handleSensorUpdate = async (event) => {
  event.preventDefault();
  sensorStatus.textContent = 'Sending...';

  const lotId = sensorSelect.value;
  const occupancy = Number(sensorOccupancy.value);

  try {
    const response = await fetch(`/api/lots/${lotId}/occupancy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ occupancy }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Update failed');
    }
    statusMessage(
      sensorStatus,
      `${data.name} occupancy updated to ${data.occupancy}.`
    );
    await loadLots();
  } catch (err) {
    statusMessage(sensorStatus, err.message, true);
  }
};

refreshBtn.addEventListener('click', () => {
  loadLots().catch((err) => {
    statusMessage(adminStatus, err.message, true);
  });
});

adminForm.addEventListener('click', (event) => {
  const action = event.target.dataset.action;
  if (action) {
    handleAdminAction(action);
  }
});

sensorForm.addEventListener('submit', handleSensorUpdate);

sensorSelect.addEventListener('change', updateOccupancyHint);

loadLots().catch((err) => {
  statusMessage(adminStatus, err.message, true);
});

setInterval(() => {
  loadLots().catch(() => {});
}, 5000);
