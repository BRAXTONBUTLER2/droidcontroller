const SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb';
const CHARACTERISTIC_UUID = '0000ffe1-0000-1000-8000-00805f9b34fb';

const connectBtn = document.getElementById('connectBtn');
const statusText = document.getElementById('status');
const buttonsSection = document.getElementById('buttonsSection');
const toggleAddFormBtn = document.getElementById('toggleAddForm');
const addForm = document.getElementById('addForm');
const btnNameInput = document.getElementById('btnNameInput');
const btnCodeInput = document.getElementById('btnCodeInput');
const confirmAddBtn = document.getElementById('confirmAddBtn');

const deleteModeBtn = document.getElementById('deleteModeBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

let bluetoothDevice = null;
let characteristic = null;

let deleteModeActive = false;
const buttonsToDelete = new Set();

// Key for localStorage
const STORAGE_KEY = 'droidControllerCustomButtons';

// --- Load saved buttons on startup ---
function loadSavedButtons() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  let buttons;
  try {
    buttons = JSON.parse(saved);
  } catch {
    buttons = [];
  }

  buttons.forEach(({name, code}) => {
    addButtonToDOM(name, code);
  });
}

// --- Save current custom buttons ---
function saveButtons() {
  // We only save buttons user added, not the original 6
  // Assume originals have a fixed data-code, we filter them out

  const allButtons = [...buttonsSection.querySelectorAll('.control-btn')];
  // Original buttons' codes:
  const originals = ['wave', 'turn_head', 'dance', 'sentence1', 'sentence2', 'welcome_seq'];

  const customButtons = allButtons
    .filter(btn => !originals.includes(btn.getAttribute('data-code')))
    .map(btn => ({
      name: btn.textContent,
      code: btn.getAttribute('data-code')
    }));

  localStorage.setItem(STORAGE_KEY, JSON.stringify(customButtons));
}

// --- Add button helper (to DOM only) ---
function addButtonToDOM(name, code) {
  const newButton = document.createElement('button');
  newButton.className = 'btn control-btn';
  newButton.textContent = name;
  newButton.setAttribute('data-code', code);
  newButton.addEventListener('click', () => sendBluetoothCommand(code));
  buttonsSection.appendChild(newButton);
}

// Bluetooth connection
connectBtn.addEventListener('click', async () => {
  try {
    statusText.textContent = 'Requesting Bluetooth device...';
   bluetoothDevice = await navigator.bluetooth.requestDevice({
  acceptAllDevices: true,
  optionalServices: [SERVICE_UUID]
});

    statusText.textContent = 'Connecting to GATT server...';
    const server = await bluetoothDevice.gatt.connect();
    statusText.textContent = 'Getting service...';
    const service = await server.getPrimaryService(SERVICE_UUID);
    characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
    statusText.textContent = `Connected to ${bluetoothDevice.name}`;
  } catch (error) {
    console.error('Bluetooth connection failed:', error);
    statusText.textContent = 'Failed to connect. Try again.';
  }
});

// Send Bluetooth command helper
function sendBluetoothCommand(command) {
  if (!characteristic) {
    alert('Not connected to a Bluetooth device. Please connect first.');
    return;
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(command);
  characteristic.writeValue(data)
    .then(() => console.log(`Sent Bluetooth command: ${command}`))
    .catch(err => {
      console.error('Failed to send command:', err);
      alert('Failed to send Bluetooth command.');
    });
}

// Click on control buttons
buttonsSection.addEventListener('click', e => {
  if (!e.target.classList.contains('control-btn')) return;

  if (deleteModeActive) {
    // Toggle selection for deletion
    e.preventDefault();
    const btn = e.target;
    if (buttonsToDelete.has(btn)) {
      buttonsToDelete.delete(btn);
      btn.classList.remove('delete-selected');
    } else {
      buttonsToDelete.add(btn);
      btn.classList.add('delete-selected');
    }
  } else {
    // Normal mode: send Bluetooth command
    const cmd = e.target.getAttribute('data-code');
    if (cmd) sendBluetoothCommand(cmd);
  }
});

// Toggle Add Button form visibility
toggleAddFormBtn.addEventListener('click', () => {
  if (addForm.classList.contains('hidden')) {
    addForm.classList.remove('hidden');
    toggleAddFormBtn.setAttribute('aria-expanded', 'true');
    btnNameInput.focus();
  } else {
    addForm.classList.add('hidden');
    toggleAddFormBtn.setAttribute('aria-expanded', 'false');
  }
});

// Confirm adding new button
confirmAddBtn.addEventListener('click', () => {
  const name = btnNameInput.value.trim();
  const code = btnCodeInput.value.trim();

  if (!name || !code) {
    alert('Please enter both a button name and Bluetooth code.');
    return;
  }

  addButtonToDOM(name, code);

  // Save new state to localStorage
  saveButtons();

  btnNameInput.value = '';
  btnCodeInput.value = '';
  addForm.classList.add('hidden');
  toggleAddFormBtn.setAttribute('aria-expanded', 'false');
  toggleAddFormBtn.focus();
});

// Toggle Delete Mode on/off
deleteModeBtn.addEventListener('click', () => {
  deleteModeActive = !deleteModeActive;
  deleteModeBtn.setAttribute('aria-pressed', deleteModeActive);
  deleteModeBtn.textContent = deleteModeActive ? '❌ Cancel Delete' : '🗑️ Delete Mode';

  confirmDeleteBtn.classList.toggle('hidden', !deleteModeActive);

  // Clear any previous selections when toggling off
  if (!deleteModeActive) {
    buttonsToDelete.clear();
    document.querySelectorAll('.control-btn.delete-selected').forEach(btn => {
      btn.classList.remove('delete-selected');
    });
  }
});

// Confirm deletion
confirmDeleteBtn.addEventListener('click', () => {
  if (buttonsToDelete.size === 0) {
    alert('No buttons selected to delete.');
    return;
  }

  buttonsToDelete.forEach(btn => {
    buttonsSection.removeChild(btn);
  });

  buttonsToDelete.clear();

  // Save updated buttons after deletion
  saveButtons();

  // Exit delete mode
  deleteModeActive = false;
  deleteModeBtn.setAttribute('aria-pressed', 'false');
  deleteModeBtn.textContent = '🗑️ Delete Mode';
  confirmDeleteBtn.classList.add('hidden');
});

// Load saved buttons when page loads
window.addEventListener('DOMContentLoaded', loadSavedButtons);
