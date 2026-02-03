const lotList = document.getElementById('lot-list');
const lastUpdated = document.getElementById('last-updated');
const refreshBtn = document.getElementById('refresh');

const loginForm = document.getElementById('login-form');
const loginUsername = document.getElementById('login-username');
const loginPassword = document.getElementById('login-password');
const loginStatus = document.getElementById('login-status');
const logoutBtn = document.getElementById('logout');
const currentUserLabel = document.getElementById('current-user');

const adminPanel = document.getElementById('admin-panel');
const adminForm = document.getElementById('admin-form');
const adminSelect = document.getElementById('admin-lot');
const adminStatus = document.getElementById('admin-status');

const sensorPanel = document.getElementById('sensor-panel');
const sensorForm = document.getElementById('sensor-form');
const sensorSelect = document.getElementById('sensor-lot');
const sensorOccupancy = document.getElementById('sensor-occupancy');
const sensorStatus = document.getElementById('sensor-status');

const usersPanel = document.getElementById('users-panel');
const userForm = document.getElementById('user-form');
const userUsername = document.getElementById('user-username');
const userPassword = document.getElementById('user-password');
const userRole = document.getElementById('user-role');
const userLotRow = document.getElementById('user-lot-row');
const userLotSelect = document.getElementById('user-lot');
const userList = document.getElementById('user-list');
const userStatus = document.getElementById('user-status');

const state = {
  lots: [],
  users: [],
};

const auth = {
  token: localStorage.getItem('parking_token'),
  user: null,
};

const statusMessage = (element, message, isError = false) => {
  element.textContent = message;
  element.style.color = isError ? '#8a2b1f' : 'rgba(16, 21, 24, 0.65)';
};

const authFetch = (url, options = {}) => {
  const headers = new Headers(options.headers || {});
  if (auth.token) {
    headers.set('Authorization', `Bearer ${auth.token}`);
  }
  return fetch(url, { ...options, headers });
};

const formatTime = (iso) => {
  if (!iso) return '--';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString();
};

const isAdmin = () =>
  auth.user && (auth.user.is_root || auth.user.role === 'admin');

const isSensor = () =>
  auth.user && (auth.user.is_root || auth.user.role === 'sensor');

const setRoleVisibility = () => {
  adminPanel.hidden = !isAdmin();
  usersPanel.hidden = !isAdmin();
  sensorPanel.hidden = !isSensor();

  loginForm.hidden = Boolean(auth.user);
  logoutBtn.hidden = !auth.user;

  const label = auth.user
    ? `${auth.user.username} (${auth.user.is_root ? 'root' : auth.user.role})`
    : 'Guest';
  currentUserLabel.textContent = label;
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

const sensorLots = () => {
  if (!isSensor()) return [];
  if (auth.user.is_root) return state.lots;
  const assignedLotId = Number(auth.user.lot_id);
  return state.lots.filter((lot) => lot.id === assignedLotId);
};

const renderSelects = () => {
  const adminValue = adminSelect.value;
  const sensorValue = sensorSelect.value;
  const userLotValue = userLotSelect.value;

  adminSelect.innerHTML = '';
  sensorSelect.innerHTML = '';
  userLotSelect.innerHTML = '';

  state.lots.forEach((lot) => {
    const option = document.createElement('option');
    option.value = lot.id;
    option.textContent = lot.name;

    const adminOption = option.cloneNode(true);
    adminSelect.appendChild(adminOption);

    const userOption = option.cloneNode(true);
    userLotSelect.appendChild(userOption);
  });

  const sensorList = sensorLots();
  sensorList.forEach((lot) => {
    const option = document.createElement('option');
    option.value = lot.id;
    option.textContent = lot.name;
    sensorSelect.appendChild(option);
  });

  if (adminValue) adminSelect.value = adminValue;
  if (sensorValue) sensorSelect.value = sensorValue;
  if (userLotValue) userLotSelect.value = userLotValue;

  sensorSelect.disabled = sensorList.length <= 1;
  updateOccupancyHint();
};

const updateOccupancyHint = () => {
  const selectedId = Number(sensorSelect.value);
  const lot = state.lots.find((item) => item.id === selectedId);
  if (!lot) return;

  sensorOccupancy.max = String(lot.capacity);
  sensorOccupancy.value = String(lot.occupancy);
};

const renderUsers = () => {
  userList.innerHTML = '';

  state.users.forEach((user) => {
    const row = document.createElement('div');
    row.className = 'user-row';

    const lotLabel = user.lot_name ? `Lot: ${user.lot_name}` : 'Lot: -';
    const roleLabel = user.is_root ? 'root' : user.role;

    row.innerHTML = `
      <div class="user-meta">
        <strong>${user.username}</strong>
        <span>${lotLabel}</span>
        <span class="tag">${roleLabel}</span>
      </div>
      <button class="danger" data-id="${user.id}" ${
        user.is_root ? 'disabled' : ''
      }>Delete</button>
    `;

    userList.appendChild(row);
  });
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

const loadUsers = async () => {
  if (!isAdmin()) return;
  const response = await authFetch('/api/users');
  if (response.status === 401) {
    handleLogout();
    return;
  }
  if (!response.ok) {
    throw new Error('Failed to load users');
  }
  state.users = await response.json();
  renderUsers();
};

const handleAdminAction = async (action) => {
  adminStatus.textContent = 'Working...';
  const lotId = adminSelect.value;
  try {
    const response = await authFetch(`/api/lots/${lotId}/${action}`, {
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
    const response = await authFetch(`/api/lots/${lotId}/occupancy`, {
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

const handleLogin = async (event) => {
  event.preventDefault();
  loginStatus.textContent = 'Signing in...';
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: loginUsername.value.trim(),
        password: loginPassword.value,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }
    auth.token = data.token;
    auth.user = data.user;
    localStorage.setItem('parking_token', auth.token);
    statusMessage(loginStatus, 'Signed in.');
    loginPassword.value = '';
    setRoleVisibility();
    await loadLots();
    await loadUsers();
  } catch (err) {
    statusMessage(loginStatus, err.message, true);
  }
};

const handleLogout = () => {
  auth.token = null;
  auth.user = null;
  localStorage.removeItem('parking_token');
  statusMessage(loginStatus, 'Signed out.');
  setRoleVisibility();
  loadLots().catch(() => {});
};

const loadSession = async () => {
  if (!auth.token) {
    setRoleVisibility();
    return;
  }

  const response = await authFetch('/api/me');
  if (!response.ok) {
    handleLogout();
    return;
  }

  const data = await response.json();
  if (!data.user) {
    handleLogout();
    return;
  }
  auth.user = data.user;
  setRoleVisibility();
};

const handleUserRoleChange = () => {
  userLotRow.hidden = userRole.value !== 'sensor';
};

const handleUserCreate = async (event) => {
  event.preventDefault();
  userStatus.textContent = 'Creating...';
  try {
    const payload = {
      username: userUsername.value.trim(),
      password: userPassword.value,
      role: userRole.value,
      lot_id: userRole.value === 'sensor' ? Number(userLotSelect.value) : null,
    };

    const response = await authFetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Create failed');
    }
    statusMessage(userStatus, `Created ${data.username}.`);
    userUsername.value = '';
    userPassword.value = '';
    await loadUsers();
  } catch (err) {
    statusMessage(userStatus, err.message, true);
  }
};

const handleUserDelete = async (event) => {
  const id = event.target.dataset.id;
  if (!id) return;
  userStatus.textContent = 'Removing...';
  try {
    const response = await authFetch(`/api/users/${id}`, { method: 'DELETE' });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Delete failed');
    }
    statusMessage(userStatus, `Deleted ${data.username}.`);
    await loadUsers();
  } catch (err) {
    statusMessage(userStatus, err.message, true);
  }
};

refreshBtn.addEventListener('click', () => {
  loadLots().catch((err) => {
    statusMessage(adminStatus, err.message, true);
  });
});

loginForm.addEventListener('submit', handleLogin);
logoutBtn.addEventListener('click', handleLogout);

adminForm.addEventListener('click', (event) => {
  const action = event.target.dataset.action;
  if (action) {
    handleAdminAction(action);
  }
});

sensorForm.addEventListener('submit', handleSensorUpdate);

sensorSelect.addEventListener('change', updateOccupancyHint);
userRole.addEventListener('change', handleUserRoleChange);
userForm.addEventListener('submit', handleUserCreate);
userList.addEventListener('click', handleUserDelete);

handleUserRoleChange();

Promise.all([loadSession(), loadLots()])
  .then(loadUsers)
  .catch((err) => {
    statusMessage(adminStatus, err.message, true);
  });

setInterval(() => {
  loadLots().catch(() => {});
}, 5000);
