// ==========================================
// DATA STORAGE & SAMPLE DATA
// ==========================================
// 🔗 วาง URL ของ Google Apps Script Web App ที่นี่ได้โดยตรง (หรือตั้งค่าผ่านหน้าเว็บปุ่ม "ตั้งค่า Google Sheet")
const DEFAULT_GOOGLE_SCRIPT_URL = ""; 

const STORAGE_KEY = 'sci_room_requests_v1';
const GOOGLE_API_KEY = 'google_sheet_api_url';
const ADMIN_PIN = '1234';

// Sample mock data for offline/initial view
const INITIAL_DATA = [
  {
    id: "REQ-202611-001",
    createdAt: "2026-10-20T10:15:00",
    requesterName: "ผศ.ดร.กานต์พิชชา รัตนวิเชียร",
    requesterPosition: "อาจารย์ประจำภาควิชาเคมี",
    requesterPhone: "089-123-4567",
    courseName: "วท.321 เคมีอินทรีย์ชั้นสูง",
    roomType: "ห้องปฏิบัติการ",
    buildingZone: "อาคารวิจัยและเรียนรู้เฉลิมพระเกียรติ 60 พรรษา เจ้าฟ้าจุฬาภรณ์ ชั้น 3 โซน A",
    roomNumber: "3F L-102 ห้องปฏิบัติการเคมี (ห้องส้ม)",
    dateOfUse: "2026-11-05",
    startTime: "17:00",
    endTime: "21:00",
    additionalDetails: "นักศึกษาร่วมทำวิจัย ป.โท 2 คน: นายธนกร สุขสวัสดิ์ (65050123), น.ส.ปวีณา ใจมั่น (65050145)",
    fileName: "โครงการวิจัยเคมีอินทรีย์_2569.pdf",
    fileSize: "1.2 MB",
    fileUrl: "",
    fileData: null,
    status: "ดำเนินการแล้ว",
    adminNote: "ทำบันทึกข้อความเลขที่ วท 88/2569 ส่งฝ่ายอาคารแล้ว"
  },
  {
    id: "REQ-202611-002",
    createdAt: "2026-10-22T14:30:00",
    requesterName: "อ.ดร.สรวิชญ์ พัฒนกิจ",
    requesterPosition: "อาจารย์ประจำภาควิชาชีววิทยา",
    requesterPhone: "081-987-6543",
    courseName: "วท.210 จุลชีววิทยาทั่วไป (แล็บตกค้าง)",
    roomType: "ห้องปฏิบัติการ",
    buildingZone: "อาคารวิจัยและเรียนรู้เฉลิมพระเกียรติ 60 พรรษา เจ้าฟ้าจุฬาภรณ์ ชั้น 3 โซน A",
    roomNumber: "3F L-101 ห้องปฏิบัติการจุลชีววิทยา (ห้องเขียว)",
    dateOfUse: "2026-11-12",
    startTime: "17:00",
    endTime: "20:00",
    additionalDetails: "สอนซ่อมเสริมแล็บเพาะเลี้ยงเชื้อแบคทีเรีย นศ. 15 คน",
    fileName: "รายชื่อนักศึกษา_วท210.pdf",
    fileSize: "450 KB",
    fileUrl: "",
    fileData: null,
    status: "อยู่ระหว่างดำเนินการ",
    adminNote: "กำลังรวบรวมเข้าบันทึกข้อความรอบเดือน พ.ย."
  },
  {
    id: "REQ-202611-003",
    createdAt: "2026-10-24T09:00:00",
    requesterName: "ผศ.มานพ แสงแก้ว",
    requesterPosition: "หัวหน้าสาขาวิชาวิทยาการคอมพิวเตอร์",
    requesterPhone: "086-555-1122",
    courseName: "อบรมเชิงปฏิบัติการ Python AI สำหรับโครงงานวิทย์",
    roomType: "ห้องปฏิบัติการ",
    buildingZone: "อาคารวิจัยและเรียนรู้เฉลิมพระเกียรติ 60 พรรษา เจ้าฟ้าจุฬาภรณ์ ชั้น 3 โซน A",
    roomNumber: "3F L-106 ห้องปฏิบัติการคอมพิวเตอร์",
    dateOfUse: "2026-11-14",
    startTime: "17:30",
    endTime: "20:30",
    additionalDetails: "มีนักศึกษาชั้นปีที่ 3-4 เข้าร่วมอบรม 35 คน",
    fileName: null,
    fileSize: null,
    fileUrl: "",
    fileData: null,
    status: "รอดำเนินการ",
    adminNote: ""
  }
];

// Helper to get Google Apps Script Web App URL
function getGoogleScriptUrl() {
  return localStorage.getItem(GOOGLE_API_KEY) || DEFAULT_GOOGLE_SCRIPT_URL || "";
}

// Load requests: first from cache/local, then sync from Google Sheet if connected
function getRequests() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
    return INITIAL_DATA;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return INITIAL_DATA;
  }
}

function saveRequestsLocal(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  updateBadgesAndStats();
}

// Global active file attachment in memory
let currentAttachment = {
  name: null,
  size: null,
  dataUrl: null
};

let currentModalRequestId = null;
let selectedRequestIds = new Set();
let isAdminLoggedIn = false;

// ==========================================
// APP INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById('dateOfUse');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    dateInput.value = today;
  }

  updateBadgesAndStats();
  populateMonthFilter();
  updateSyncIndicator();

  // If Google Script URL is configured, fetch remote data
  if (getGoogleScriptUrl()) {
    fetchFromGoogleSheet(false);
  }

  lucide.createIcons();
});

// ==========================================
// TAB SWITCHING
// ==========================================
function switchTab(tabId) {
  const viewForm = document.getElementById('viewForm');
  const viewTrack = document.getElementById('viewTrack');
  const viewAdmin = document.getElementById('viewAdmin');

  const navTabForm = document.getElementById('navTabForm');
  const navTabTrack = document.getElementById('navTabTrack');
  const navTabAdmin = document.getElementById('navTabAdmin');

  [navTabForm, navTabTrack, navTabAdmin].forEach(el => {
    el.className = "px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-1.5 text-teal-100 hover:text-white hover:bg-white/10";
  });

  viewForm.classList.add('hidden');
  viewTrack.classList.add('hidden');
  viewAdmin.classList.add('hidden');

  if (tabId === 'form') {
    viewForm.classList.remove('hidden');
    navTabForm.className = "px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-1.5 bg-white text-teal-900 shadow";
  } else if (tabId === 'track') {
    viewTrack.classList.remove('hidden');
    navTabTrack.className = "px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-1.5 bg-white text-teal-900 shadow";
    setTimeout(() => document.getElementById('trackSearchInput')?.focus(), 100);
  } else if (tabId === 'admin') {
    viewAdmin.classList.remove('hidden');
    navTabAdmin.className = "px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-1.5 bg-white text-teal-900 shadow";
    checkAdminLoginStatus();
  }

  lucide.createIcons();
}

// ==========================================
// FORM HANDLING
// ==========================================
function toggleCustomBuilding(value) {
  const customWrap = document.getElementById('customBuildingWrap');
  const customInput = document.getElementById('customBuildingInput');
  if (value === 'custom') {
    customWrap.classList.remove('hidden');
    customInput.required = true;
    customInput.focus();
  } else {
    customWrap.classList.add('hidden');
    customInput.required = false;
    customInput.value = '';
  }
}

function toggleCustomRoom(value) {
  const customWrap = document.getElementById('customRoomWrap');
  const customInput = document.getElementById('customRoomInput');
  if (value === 'custom') {
    customWrap.classList.remove('hidden');
    customInput.required = true;
    customInput.focus();
  } else {
    customWrap.classList.add('hidden');
    customInput.required = false;
    customInput.value = '';
  }
}

// File Attachment handling
function handleFileSelect(input) {
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];
  
  if (file.size > 10 * 1024 * 1024) {
    showToast('ขนาดไฟล์เกิน 10MB กรุณาเลือกไฟล์ใหม่', 'error');
    input.value = '';
    return;
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  currentAttachment.name = file.name;
  currentAttachment.size = formatSize(file.size);

  const reader = new FileReader();
  reader.onload = function(e) {
    currentAttachment.dataUrl = e.target.result;
  };
  reader.readAsDataURL(file);

  document.getElementById('fileName').innerText = currentAttachment.name;
  document.getElementById('fileSize').innerText = `(${currentAttachment.size})`;
  document.getElementById('filePreview').classList.remove('hidden');
  lucide.createIcons();
}

function clearFileAttachment() {
  currentAttachment = { name: null, size: null, dataUrl: null };
  const input = document.getElementById('attachmentFile');
  if (input) input.value = '';
  document.getElementById('filePreview').classList.add('hidden');
}

// SUBMIT FORM
async function handleFormSubmit(e) {
  e.preventDefault();

  const bSelect = document.getElementById('buildingZone').value;
  const finalBuilding = bSelect === 'custom' 
    ? document.getElementById('customBuildingInput').value.trim() 
    : bSelect;

  const rSelect = document.getElementById('roomNumber').value;
  const finalRoom = rSelect === 'custom'
    ? document.getElementById('customRoomInput').value.trim()
    : rSelect;

  if (!finalBuilding || !finalRoom) {
    showToast('กรุณาระบุสถานที่และหมายเลขห้องให้ครบถ้วน', 'error');
    return;
  }

  // Generate Request ID: REQ-YYYYMM-XXX
  const now = new Date();
  const yearMonth = now.getFullYear().toString() + String(now.getMonth() + 1).padStart(2, '0');
  const existingList = getRequests();
  const sequence = String(existingList.length + 1).padStart(3, '0');
  const requestId = `REQ-${yearMonth}-${sequence}`;

  const newRequest = {
    id: requestId,
    createdAt: now.toISOString(),
    requesterName: document.getElementById('requesterName').value.trim(),
    requesterPosition: document.getElementById('requesterPosition').value.trim(),
    requesterPhone: document.getElementById('requesterPhone').value.trim(),
    courseName: document.getElementById('courseName').value.trim(),
    roomType: document.getElementById('roomType').value,
    buildingZone: finalBuilding,
    roomNumber: finalRoom,
    dateOfUse: document.getElementById('dateOfUse').value,
    startTime: document.getElementById('startTime').value,
    endTime: document.getElementById('endTime').value,
    additionalDetails: document.getElementById('additionalDetails').value.trim(),
    fileName: currentAttachment.name || '',
    fileSize: currentAttachment.size || '',
    fileData: currentAttachment.dataUrl || null,
    fileUrl: '',
    status: 'รอดำเนินการ',
    adminNote: ''
  };

  // 1. Save locally first (fast user feedback)
  existingList.unshift(newRequest);
  saveRequestsLocal(existingList);

  // 2. If Google Sheet URL is set, send remotely in background
  const scriptUrl = getGoogleScriptUrl();
  if (scriptUrl) {
    showToast('กำลังส่งข้อมูลไปยัง Google Sheets...', 'info');
    try {
      fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'submit', ...newRequest })
      }).then(res => res.json()).then(result => {
        if (result.status === 'success') {
          showToast('บันทึกลง Google Sheets เรียบร้อยแล้ว', 'success');
          // If file was uploaded to Drive, save link
          if (result.fileUrl) {
            newRequest.fileUrl = result.fileUrl;
            saveRequestsLocal(existingList);
          }
        }
      }).catch(err => {
        console.warn('Google Sheet Sync Error (will remain local):', err);
      });
    } catch (e) {
      console.error(e);
    }
  }

  // Show Success Modal
  showSuccessModal(newRequest);

  // Reset form
  e.target.reset();
  clearFileAttachment();
  toggleCustomBuilding('');
  toggleCustomRoom('');
  lucide.createIcons();
}

// SUCCESS MODAL
function showSuccessModal(req) {
  document.getElementById('modalSuccessId').innerText = req.id;
  document.getElementById('modalSuccessName').innerText = `${req.requesterName} (${req.requesterPosition})`;
  document.getElementById('modalSuccessRoom').innerText = req.roomNumber;
  document.getElementById('modalSuccessDateTime').innerText = `${formatThaiDate(req.dateOfUse)} เวลา ${req.startTime} - ${req.endTime} น.`;

  const modal = document.getElementById('successModal');
  const card = document.getElementById('successModalCard');
  modal.classList.remove('hidden');
  setTimeout(() => {
    card.classList.remove('scale-95', 'opacity-0');
    card.classList.add('scale-100', 'opacity-100');
  }, 10);
  lucide.createIcons();
}

function closeSuccessModal() {
  const modal = document.getElementById('successModal');
  const card = document.getElementById('successModalCard');
  card.classList.add('scale-95', 'opacity-0');
  card.classList.remove('scale-100', 'opacity-100');
  setTimeout(() => {
    modal.classList.add('hidden');
  }, 200);
}

// ==========================================
// TRACK STATUS (PUBLIC)
// ==========================================
async function handleTrackSearch(e) {
  e.preventDefault();
  const query = document.getElementById('trackSearchInput').value.trim().toLowerCase();
  const container = document.getElementById('trackResultContainer');
  container.innerHTML = '';

  if (!query) return;

  // Refresh latest from Google Sheet first if online
  if (getGoogleScriptUrl()) {
    await fetchFromGoogleSheet(false);
  }

  const list = getRequests();
  const cleanStr = (s) => (s || '').replace(/[- \s]/g, '').toLowerCase();
  const cleanQuery = cleanStr(query);

  const matched = list.filter(item => {
    return cleanStr(item.requesterPhone).includes(cleanQuery) ||
           item.id.toLowerCase().includes(query) ||
           item.requesterName.toLowerCase().includes(query);
  });

  if (matched.length === 0) {
    container.innerHTML = `
      <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center text-slate-500 space-y-2">
        <i data-lucide="help-circle" class="w-10 h-10 mx-auto text-slate-400"></i>
        <h4 class="font-bold text-slate-700">ไม่พบข้อมูลคำขอ</h4>
        <p class="text-xs">กรุณาตรวจสอบเบอร์โทรศัพท์ หรือรหัสคำขอ (Request ID) ให้ถูกต้องอีกครั้งค่ะ</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  matched.forEach(req => {
    const card = document.createElement('div');
    card.className = "bg-white rounded-2xl shadow-md border border-slate-200 p-6 space-y-5 transition hover:shadow-lg";
    
    let badgeClass = "bg-amber-100 text-amber-800 border-amber-300";
    let step = 1;

    if (req.status === 'รอดำเนินการ') {
      badgeClass = "bg-amber-100 text-amber-800 border-amber-300";
      step = 1;
    } else if (req.status === 'อยู่ระหว่างดำเนินการ') {
      badgeClass = "bg-blue-100 text-blue-800 border-blue-300";
      step = 2;
    } else if (req.status === 'ดำเนินการแล้ว') {
      badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300";
      step = 3;
    } else if (req.status === 'ไม่อนุมัติ') {
      badgeClass = "bg-rose-100 text-rose-800 border-rose-300";
      step = 0;
    }

    card.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <span class="text-xs font-mono font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">${req.id}</span>
          <span class="text-xs text-slate-400 ml-2">ยื่นเมื่อ ${formatThaiDateTime(req.createdAt)}</span>
        </div>
        <div>
          <span class="px-3 py-1 rounded-full text-xs font-bold border inline-flex items-center space-x-1 ${badgeClass}">
            <span>${getStatusIcon(req.status)}</span>
            <span>สถานะ: ${req.status}</span>
          </span>
        </div>
      </div>

      ${step > 0 ? `
      <div class="py-2">
        <div class="relative flex items-center justify-between max-w-md mx-auto">
          <div class="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-slate-200 -z-0"></div>
          <div class="absolute left-6 top-1/2 -translate-y-1/2 h-1 bg-emerald-500 -z-0 transition-all duration-500" 
            style="width: ${step === 1 ? '0%' : (step === 2 ? '50%' : '100%')}"></div>

          <div class="flex flex-col items-center z-10">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-emerald-600 text-white ring-4 ring-emerald-100' : 'bg-slate-200 text-slate-600'}">
              ✓
            </div>
            <span class="text-[11px] font-medium text-slate-600 mt-1">ยื่นคำขอแล้ว</span>
          </div>

          <div class="flex flex-col items-center z-10">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-slate-200 text-slate-500'}">
              ${step >= 2 ? '✓' : '2'}
            </div>
            <span class="text-[11px] font-medium ${step >= 2 ? 'text-blue-700 font-semibold' : 'text-slate-400'} mt-1">กำลังทำบันทึกข้อความ</span>
          </div>

          <div class="flex flex-col items-center z-10">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= 3 ? 'bg-emerald-600 text-white ring-4 ring-emerald-100' : 'bg-slate-200 text-slate-500'}">
              ${step >= 3 ? '✓' : '3'}
            </div>
            <span class="text-[11px] font-medium ${step >= 3 ? 'text-emerald-700 font-semibold' : 'text-slate-400'} mt-1">ดำเนินการเสร็จสิ้น</span>
          </div>
        </div>
      </div>
      ` : `
      <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
        <strong>คำขอไม่ผ่านการอนุมัติ</strong>: โปรดติดต่อเจ้าหน้าที่คณะวิทยาศาสตร์เพื่อสอบถามเพิ่มเติม
      </div>
      `}

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div>
          <span class="text-slate-400 block">ผู้ขอใช้ห้อง:</span>
          <span class="font-semibold text-slate-700 text-sm">${req.requesterName} (${req.requesterPosition})</span>
        </div>
        <div>
          <span class="text-slate-400 block">เบอร์โทรศัพท์:</span>
          <span class="font-medium text-slate-700">${req.requesterPhone}</span>
        </div>
        <div>
          <span class="text-slate-400 block">ห้อง / พื้นที่:</span>
          <span class="font-semibold text-emerald-800 text-sm">${req.roomNumber}</span>
          <span class="text-slate-500 block text-[11px]">${req.buildingZone}</span>
        </div>
        <div>
          <span class="text-slate-400 block">วัน-เวลาที่ขอเปิดไฟ/แอร์:</span>
          <span class="font-semibold text-slate-700 text-sm">${formatThaiDate(req.dateOfUse)}</span>
          <span class="text-emerald-700 font-bold block">${req.startTime} - ${req.endTime} น.</span>
        </div>
        <div class="sm:col-span-2">
          <span class="text-slate-400 block">รายวิชา / กิจกรรม:</span>
          <span class="font-medium text-slate-700">${req.courseName} (${req.roomType})</span>
        </div>
        ${req.additionalDetails ? `
        <div class="sm:col-span-2">
          <span class="text-slate-400 block">รายละเอียดเพิ่มเติม / นศ. วิจัย:</span>
          <span class="font-normal text-slate-600">${req.additionalDetails}</span>
        </div>
        ` : ''}
        ${req.adminNote ? `
        <div class="sm:col-span-2 p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900">
          <span class="font-semibold block">ข้อความจากเจ้าหน้าที่:</span>
          <span>${req.adminNote}</span>
        </div>
        ` : ''}
      </div>
    `;

    container.appendChild(card);
  });

  lucide.createIcons();
}

// ==========================================
// ADMIN PORTAL LOGIC
// ==========================================
function checkAdminLoginStatus() {
  const gate = document.getElementById('adminLoginGate');
  const dashboard = document.getElementById('adminDashboard');
  if (isAdminLoggedIn) {
    gate.classList.add('hidden');
    dashboard.classList.remove('hidden');
    renderAdminTable();
    if (getGoogleScriptUrl()) {
      fetchFromGoogleSheet(false);
    }
  } else {
    gate.classList.remove('hidden');
    dashboard.classList.add('hidden');
    setTimeout(() => document.getElementById('adminPinInput')?.focus(), 100);
  }
}

function handleAdminLogin(e) {
  e.preventDefault();
  const pin = document.getElementById('adminPinInput').value.trim();
  if (pin === ADMIN_PIN || pin === 'admin') {
    isAdminLoggedIn = true;
    showToast('เข้าสู่ระบบสำเร็จ ยินดีต้อนรับค่ะ', 'success');
    checkAdminLoginStatus();
  } else {
    showToast('รหัสผ่านไม่ถูกต้อง (ค่าเริ่มต้นคือ 1234)', 'error');
  }
}

function lockAdmin() {
  isAdminLoggedIn = false;
  document.getElementById('adminPinInput').value = '';
  checkAdminLoginStatus();
  showToast('ออกจากระบบเรียบร้อย', 'info');
}

function renderAdminTable() {
  const list = getRequests();
  const tableBody = document.getElementById('adminTableBody');
  const emptyState = document.getElementById('adminEmptyState');
  const statusFilter = document.getElementById('filterStatus').value;
  const monthFilter = document.getElementById('filterMonth').value;
  const searchQuery = (document.getElementById('adminSearchQuery').value || '').trim().toLowerCase();

  tableBody.innerHTML = '';

  const filtered = list.filter(item => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;

    if (monthFilter !== 'all') {
      const itemMonth = item.dateOfUse.substring(0, 7);
      if (itemMonth !== monthFilter) return false;
    }

    if (searchQuery) {
      const match = item.id.toLowerCase().includes(searchQuery) ||
                    item.requesterName.toLowerCase().includes(searchQuery) ||
                    item.requesterPosition.toLowerCase().includes(searchQuery) ||
                    item.requesterPhone.toLowerCase().includes(searchQuery) ||
                    item.courseName.toLowerCase().includes(searchQuery) ||
                    item.roomNumber.toLowerCase().includes(searchQuery);
      if (!match) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
  }

  filtered.forEach(item => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50/80 transition group";

    let badgeClass = "bg-amber-100 text-amber-800 border-amber-200";
    if (item.status === 'อยู่ระหว่างดำเนินการ') badgeClass = "bg-blue-100 text-blue-800 border-blue-200";
    if (item.status === 'ดำเนินการแล้ว') badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (item.status === 'ไม่อนุมัติ') badgeClass = "bg-rose-100 text-rose-800 border-rose-200";

    const isChecked = selectedRequestIds.has(item.id) ? 'checked' : '';

    tr.innerHTML = `
      <td class="p-4 text-center">
        <input type="checkbox" ${isChecked} onchange="toggleSelectRequest('${item.id}', this.checked)" class="rounded text-teal-600 focus:ring-teal-500 w-4 h-4">
      </td>
      <td class="p-4">
        <span class="font-mono font-bold text-teal-800 text-xs block">${item.id}</span>
        <span class="text-[11px] text-slate-400">${formatThaiDate(item.createdAt.split('T')[0])}</span>
      </td>
      <td class="p-4">
        <div class="font-semibold text-slate-800">${item.requesterName}</div>
        <div class="text-xs text-slate-500">${item.requesterPosition}</div>
        <div class="text-xs text-slate-400 flex items-center space-x-1 mt-0.5">
          <i data-lucide="phone" class="w-3 h-3"></i>
          <span>${item.requesterPhone}</span>
        </div>
      </td>
      <td class="p-4">
        <div class="font-semibold text-emerald-800 text-xs">${item.roomNumber}</div>
        <div class="text-[11px] text-slate-400 truncate max-w-xs" title="${item.buildingZone}">${item.buildingZone}</div>
      </td>
      <td class="p-4">
        <div class="font-medium text-slate-800 text-xs">${formatThaiDate(item.dateOfUse)}</div>
        <div class="text-xs font-bold text-teal-700">${item.startTime} - ${item.endTime} น.</div>
      </td>
      <td class="p-4">
        <div class="font-medium text-slate-800 text-xs max-w-xs truncate" title="${item.courseName}">${item.courseName}</div>
        <span class="inline-block text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded mt-0.5">${item.roomType}</span>
      </td>
      <td class="p-4 text-center">
        <div class="relative inline-block">
          <select onchange="updateRequestStatus('${item.id}', this.value)" class="text-xs font-bold px-2.5 py-1.5 rounded-lg border cursor-pointer ${badgeClass} focus:outline-none">
            <option value="รอดำเนินการ" ${item.status === 'รอดำเนินการ' ? 'selected' : ''}>🟡 รอดำเนินการ</option>
            <option value="อยู่ระหว่างดำเนินการ" ${item.status === 'อยู่ระหว่างดำเนินการ' ? 'selected' : ''}>🔵 อยู่ระหว่างดำเนินการ</option>
            <option value="ดำเนินการแล้ว" ${item.status === 'ดำเนินการแล้ว' ? 'selected' : ''}>🟢 ดำเนินการแล้ว</option>
            <option value="ไม่อนุมัติ" ${item.status === 'ไม่อนุมัติ' ? 'selected' : ''}>🔴 ไม่อนุมัติ</option>
          </select>
        </div>
      </td>
      <td class="p-4 text-center">
        <div class="flex items-center justify-center space-x-1">
          <button onclick="openDetailsModal('${item.id}')" title="ดูรายละเอียด" class="p-1.5 text-teal-700 hover:bg-teal-50 rounded-lg transition">
            <i data-lucide="eye" class="w-4 h-4"></i>
          </button>
          <button onclick="deleteRequest('${item.id}')" title="ลบรายการ" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </td>
    `;

    tableBody.appendChild(tr);
  });

  updateBadgesAndStats();
  lucide.createIcons();
}

// Update Request Status
function updateRequestStatus(id, newStatus) {
  const list = getRequests();
  const target = list.find(r => r.id === id);
  if (target) {
    target.status = newStatus;
    saveRequestsLocal(list);
    showToast(`อัปเดตสถานะเป็น "${newStatus}" เรียบร้อย`, 'success');
    renderAdminTable();

    // Sync to Google Sheet
    const scriptUrl = getGoogleScriptUrl();
    if (scriptUrl) {
      fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateStatus', id: id, status: newStatus, adminNote: target.adminNote })
      }).catch(e => console.warn('Sync status error:', e));
    }
  }
}

// Delete Request
function deleteRequest(id) {
  if (confirm(`คุณต้องการลบคำขอรหัส ${id} ใช่หรือไม่?`)) {
    let list = getRequests();
    list = list.filter(r => r.id !== id);
    selectedRequestIds.delete(id);
    saveRequestsLocal(list);
    showToast('ลบรายการคำขอเรียบร้อย', 'info');
    renderAdminTable();

    // Sync to Google Sheet
    const scriptUrl = getGoogleScriptUrl();
    if (scriptUrl) {
      fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'delete', id: id })
      }).catch(e => console.warn('Sync delete error:', e));
    }
  }
}

// Multi-select logic
function toggleSelectRequest(id, checked) {
  if (checked) {
    selectedRequestIds.add(id);
  } else {
    selectedRequestIds.delete(id);
  }
}

function toggleSelectAll(checked) {
  const list = getRequests();
  if (checked) {
    list.forEach(item => selectedRequestIds.add(item.id));
  } else {
    selectedRequestIds.clear();
  }
  renderAdminTable();
}

function updateBadgesAndStats() {
  const list = getRequests();
  const total = list.length;
  const pending = list.filter(r => r.status === 'รอดำเนินการ').length;
  const progress = list.filter(r => r.status === 'อยู่ระหว่างดำเนินการ').length;
  const completed = list.filter(r => r.status === 'ดำเนินการแล้ว').length;

  const elTotal = document.getElementById('statTotal');
  const elPending = document.getElementById('statPending');
  const elProgress = document.getElementById('statProgress');
  const elCompleted = document.getElementById('statCompleted');

  if (elTotal) elTotal.innerText = total;
  if (elPending) elPending.innerText = pending;
  if (elProgress) elProgress.innerText = progress;
  if (elCompleted) elCompleted.innerText = completed;

  const badge = document.getElementById('badgePendingCount');
  if (badge) {
    if (pending > 0) {
      badge.innerText = pending;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

function populateMonthFilter() {
  const list = getRequests();
  const monthSelect = document.getElementById('filterMonth');
  const memoMonthSelect = document.getElementById('memoMonthSelect');
  if (!monthSelect || !memoMonthSelect) return;

  const months = new Set();
  list.forEach(r => {
    if (r.dateOfUse) {
      months.add(r.dateOfUse.substring(0, 7));
    }
  });

  const sortedMonths = Array.from(months).sort().reverse();
  monthSelect.innerHTML = '<option value="all">ทุกช่วงเดือน</option>';
  memoMonthSelect.innerHTML = '<option value="all">ทั้งหมดที่เลือก / ทุกเดือน</option>';

  sortedMonths.forEach(ym => {
    const [year, month] = ym.split('-');
    const thaiMonthName = getThaiMonthName(parseInt(month, 10));
    const thaiYear = parseInt(year, 10) + 543;
    const label = `${thaiMonthName} ${thaiYear}`;

    monthSelect.innerHTML += `<option value="${ym}">${label}</option>`;
    memoMonthSelect.innerHTML += `<option value="${ym}">รอบเดือน ${label}</option>`;
  });
}

// ==========================================
// DETAILS MODAL
// ==========================================
function openDetailsModal(id) {
  currentModalRequestId = id;
  const list = getRequests();
  const req = list.find(r => r.id === id);
  if (!req) return;

  document.getElementById('detailTrackingId').innerText = req.id;
  document.getElementById('adminNoteInput').value = req.adminNote || '';

  const body = document.getElementById('detailBody');
  body.innerHTML = `
    <div class="grid grid-cols-2 gap-3 pb-3 border-b border-slate-100">
      <div>
        <span class="text-slate-400 text-xs block">ชื่อ-นามสกุล:</span>
        <span class="font-bold text-slate-800">${req.requesterName}</span>
      </div>
      <div>
        <span class="text-slate-400 text-xs block">ตำแหน่ง:</span>
        <span class="font-medium text-slate-700">${req.requesterPosition}</span>
      </div>
      <div>
        <span class="text-slate-400 text-xs block">เบอร์โทรศัพท์:</span>
        <span class="font-medium text-slate-700">${req.requesterPhone}</span>
      </div>
      <div>
        <span class="text-slate-400 text-xs block">วันที่ยื่นคำขอ:</span>
        <span class="text-slate-600">${formatThaiDateTime(req.createdAt)}</span>
      </div>
    </div>

    <div class="space-y-2 pb-3 border-b border-slate-100">
      <div>
        <span class="text-slate-400 text-xs block">อาคาร / ชั้น / โซน:</span>
        <span class="font-medium text-slate-800">${req.buildingZone}</span>
      </div>
      <div>
        <span class="text-slate-400 text-xs block">หมายเลขห้อง / พื้นที่:</span>
        <span class="font-bold text-emerald-800">${req.roomNumber}</span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <span class="text-slate-400 text-xs block">วันที่ใช้ห้อง:</span>
          <span class="font-semibold text-slate-800">${formatThaiDate(req.dateOfUse)}</span>
        </div>
        <div>
          <span class="text-slate-400 text-xs block">เวลาที่ใช้:</span>
          <span class="font-bold text-teal-700">${req.startTime} - ${req.endTime} น.</span>
        </div>
      </div>
    </div>

    <div class="space-y-2 pb-3 border-b border-slate-100">
      <div>
        <span class="text-slate-400 text-xs block">รายวิชา / กิจกรรม:</span>
        <span class="font-medium text-slate-800">${req.courseName} (${req.roomType})</span>
      </div>
      <div>
        <span class="text-slate-400 text-xs block">รายละเอียดเพิ่มเติม / นศ. ร่วมวิจัย:</span>
        <p class="text-slate-700 whitespace-pre-wrap bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">${req.additionalDetails || '-'}</p>
      </div>
      ${req.fileName ? `
      <div>
        <span class="text-slate-400 text-xs block">เอกสารประกอบที่แนบมา:</span>
        <div class="mt-1 flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs">
          <div class="flex items-center space-x-2">
            <i data-lucide="file-text" class="w-4 h-4 text-emerald-600"></i>
            <span class="font-semibold">${req.fileName}</span>
            ${req.fileSize ? `<span class="text-[10px] text-emerald-600">(${req.fileSize})</span>` : ''}
          </div>
          ${req.fileUrl ? `
            <a href="${req.fileUrl}" target="_blank" class="px-2.5 py-1 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700">เปิดดูใน Drive</a>
          ` : (req.fileData ? `
            <a href="${req.fileData}" download="${req.fileName}" class="px-2.5 py-1 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700">ดาวน์โหลด</a>
          ` : '<span class="text-xs text-slate-400">ไฟล์แนบ</span>')}
        </div>
      </div>
      ` : ''}
    </div>
  `;

  document.getElementById('detailsModal').classList.remove('hidden');
  lucide.createIcons();
}

function updateRequestStatusFromModal(newStatus) {
  if (!currentModalRequestId) return;
  updateRequestStatus(currentModalRequestId, newStatus);
}

function saveAdminNote() {
  if (!currentModalRequestId) return;
  const note = document.getElementById('adminNoteInput').value.trim();
  const list = getRequests();
  const target = list.find(r => r.id === currentModalRequestId);
  if (target) {
    target.adminNote = note;
    saveRequestsLocal(list);
    showToast('บันทึกหมายเหตุเรียบร้อย', 'success');

    // Sync to Google Sheet
    const scriptUrl = getGoogleScriptUrl();
    if (scriptUrl) {
      fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateStatus', id: currentModalRequestId, status: target.status, adminNote: note })
      }).catch(e => console.warn(e));
    }

    closeDetailsModal();
    renderAdminTable();
  }
}

function closeDetailsModal() {
  document.getElementById('detailsModal').classList.add('hidden');
  currentModalRequestId = null;
}

// ==========================================
// ⭐ AUTO-MEMO GENERATOR
// ==========================================
function openMemoModal() {
  populateMonthFilter();
  generateMemoContent();
  document.getElementById('memoModal').classList.remove('hidden');
  lucide.createIcons();
}

function closeMemoModal() {
  document.getElementById('memoModal').classList.add('hidden');
}

function generateMemoContent() {
  const selectedMonth = document.getElementById('memoMonthSelect').value;
  let list = getRequests();

  if (selectedRequestIds.size > 0) {
    list = list.filter(r => selectedRequestIds.has(r.id));
  } else if (selectedMonth !== 'all') {
    list = list.filter(r => r.dateOfUse.startsWith(selectedMonth));
  }

  list = list.filter(r => r.status !== 'ไม่อนุมัติ');
  list.sort((a, b) => a.dateOfUse.localeCompare(b.dateOfUse));

  document.getElementById('memoCountBadge').innerText = `${list.length} รายการ`;

  const now = new Date();
  const thaiCurrentDate = formatThaiDateOfficial(now);
  
  let memoTitleMonth = "";
  if (selectedMonth !== 'all') {
    const [y, m] = selectedMonth.split('-');
    memoTitleMonth = ` ประจำเดือน ${getThaiMonthName(parseInt(m, 10))} พ.ศ. ${parseInt(y, 10) + 543}`;
  }

  const memoContainer = document.getElementById('memoContent');

  let tableRowsHtml = '';
  list.forEach((item, index) => {
    tableRowsHtml += `
      <tr class="border-b border-slate-300">
        <td class="p-2 text-center align-top">${index + 1}</td>
        <td class="p-2 align-top whitespace-nowrap">${formatThaiDate(item.dateOfUse)}</td>
        <td class="p-2 align-top whitespace-nowrap font-bold">${item.startTime} - ${item.endTime} น.</td>
        <td class="p-2 align-top">
          <div class="font-bold">${item.roomNumber}</div>
          <div class="text-xs text-slate-500">${item.buildingZone}</div>
        </td>
        <td class="p-2 align-top">
          <div>${item.courseName}</div>
          <div class="text-xs text-slate-500">(${item.roomType})</div>
          ${item.additionalDetails ? `<div class="text-xs text-slate-500 mt-1 italic">หมายเหตุ: ${item.additionalDetails}</div>` : ''}
        </td>
        <td class="p-2 align-top">
          <div class="font-bold">${item.requesterName}</div>
          <div class="text-xs text-slate-500">${item.requesterPosition}</div>
          <div class="text-xs text-slate-500">โทร. ${item.requesterPhone}</div>
        </td>
      </tr>
    `;
  });

  if (list.length === 0) {
    tableRowsHtml = `
      <tr>
        <td colspan="6" class="p-6 text-center text-slate-400">
          ไม่พบรายการคำขอใช้ห้องในรอบเดือนที่เลือก
        </td>
      </tr>
    `;
  }

  memoContainer.innerHTML = `
    <div class="border-b-2 border-black pb-4 mb-4">
      <div class="flex items-center space-x-4 mb-2">
        <div class="w-16 text-center font-bold text-2xl tracking-tighter">ตราครุฑ</div>
        <div class="flex-1 text-center font-bold text-2xl">บันทึกข้อความ</div>
      </div>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div><strong>ส่วนงาน:</strong> คณะวิทยาศาสตร์ มหาวิทยาลัย... โทร. 0-2xxx-xxxx</div>
        <div><strong>ที่:</strong> อว ...... / ............</div>
        <div><strong>วันที่:</strong> ${thaiCurrentDate}</div>
        <div><strong>เรื่อง:</strong> ขออนุมัติเปิดระบบไฟฟ้าและระบบปรับอากาศนอกเวลาทำการ${memoTitleMonth}</div>
      </div>
    </div>

    <div class="mb-4 text-sm font-bold">
      เรียน คณบดีคณะวิทยาศาสตร์ / หัวหน้างานอาคารสถานที่และยานพาหนะ
    </div>

    <div class="text-sm leading-relaxed mb-4 text-justify indent-8">
      ด้วย มีคณาจารย์ บุคลากร และนักศึกษา สังกัดคณะวิทยาศาสตร์ ได้แจ้งความประสงค์ขอใช้ห้องเรียน ห้องปฏิบัติการ และห้องประชุม นอกเวลาทำการ เพื่อใช้สำหรับการจัดการเรียนการสอน การทำโครงงานวิจัย และกิจกรรมทางวิชาการ${memoTitleMonth}
    </div>

    <div class="text-sm leading-relaxed mb-4 text-justify indent-8">
      ในการนี้ เพื่อให้การจัดการเรียนการสอนและการดำเนินการวิจัยเป็นไปด้วยความเรียบร้อย จึงใคร่ขอความอนุเคราะห์จากท่านโปรดพิจารณาอนุมัติเปิดระบบไฟฟ้าและระบบปรับอากาศ ตามวัน เวลา และสถานที่ ดังมีรายละเอียดปรากฏตามตารางต่อไปนี้:
    </div>

    <div class="overflow-x-auto my-4">
      <table class="w-full text-left text-xs border border-slate-300 border-collapse">
        <thead>
          <tr class="bg-slate-100 border-b border-slate-300 font-bold">
            <th class="p-2 border-r border-slate-300 text-center w-8">ลำดับ</th>
            <th class="p-2 border-r border-slate-300 w-28">วันที่ใช้ห้อง</th>
            <th class="p-2 border-r border-slate-300 w-24">เวลา</th>
            <th class="p-2 border-r border-slate-300">หมายเลขห้อง / อาคาร</th>
            <th class="p-2 border-r border-slate-300">รายวิชา / กิจกรรม</th>
            <th class="p-2">ผู้ขอใช้ห้อง / เบอร์ติดต่อ</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>
    </div>

    <div class="text-sm leading-relaxed mt-4 mb-8 text-justify indent-8">
      จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ และประสานงานเจ้าหน้าที่ผู้เกี่ยวข้องเปิดระบบไฟฟ้าและระบบปรับอากาศตามวันและเวลาดังกล่าวต่อไปด้วย จะเป็นพระคุณยิ่ง
    </div>

    <div class="flex justify-end text-sm text-center">
      <div class="space-y-1 w-64">
        <p class="mb-8">(ลงชื่อ)........................................................</p>
        <p class="font-bold">(ผู้ประสานงาน / เจ้าหน้าที่งานบริการการศึกษา)</p>
        <p class="text-xs text-slate-500">คณะวิทยาศาสตร์</p>
      </div>
    </div>
  `;
}

function copyMemoText() {
  const container = document.getElementById('memoContent');
  if (!container) return;
  const text = container.innerText;
  navigator.clipboard.writeText(text).then(() => {
    showToast('คัดลอกข้อความบันทึกข้อความแล้ว พร้อมนำไปวางใน Word ได้ทันที', 'success');
  }).catch(() => {
    copyToClipboard(text, 'คัดลอกข้อความบันทึกข้อความแล้ว');
  });
}

function printMemo() {
  const memoHtml = document.getElementById('memoContent').innerHTML;
  const printArea = document.getElementById('printArea');
  printArea.innerHTML = memoHtml;
  window.print();
}

// ==========================================
// GOOGLE SHEETS SYNC LOGIC
// ==========================================
function openSyncModal() {
  const currentUrl = getGoogleScriptUrl();
  document.getElementById('googleScriptUrlInput').value = currentUrl;
  document.getElementById('syncModal').classList.remove('hidden');
  lucide.createIcons();
}

function closeSyncModal() {
  document.getElementById('syncModal').classList.add('hidden');
}

function saveGoogleSheetSettings() {
  const url = document.getElementById('googleScriptUrlInput').value.trim();
  localStorage.setItem(GOOGLE_API_KEY, url);
  updateSyncIndicator();
  closeSyncModal();

  if (url) {
    showToast('บันทึกการตั้งค่า Google Sheets เรียบร้อย กำลังซิงค์ข้อมูล...', 'success');
    fetchFromGoogleSheet(true);
  } else {
    showToast('ปิดการเชื่อมต่อ Google Sheets (กลับสู่โหมดข้อมูลในเครื่อง)', 'info');
  }
}

function updateSyncIndicator() {
  const url = getGoogleScriptUrl();
  const indicator = document.getElementById('syncIndicator');
  const label = document.getElementById('syncStatusLabel');

  if (url) {
    indicator.className = "w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse";
    label.innerText = "ซิงค์กับ Google Sheet";
    label.className = "text-emerald-800 font-bold";
  } else {
    indicator.className = "w-2.5 h-2.5 rounded-full bg-slate-400";
    label.innerText = "เชื่อมต่อ Google Sheet";
    label.className = "text-slate-600 font-semibold";
  }
}

async function fetchFromGoogleSheet(notify = false) {
  const scriptUrl = getGoogleScriptUrl();
  if (!scriptUrl) return;

  try {
    const res = await fetch(scriptUrl);
    const json = await res.json();
    if (json.status === 'success' && Array.isArray(json.data)) {
      if (json.data.length > 0) {
        saveRequestsLocal(json.data);
        if (isAdminLoggedIn) renderAdminTable();
        populateMonthFilter();
        if (notify) showToast(`ซิงค์ข้อมูลสำเร็จ (${json.data.length} รายการ)`, 'success');
      } else {
        if (notify) showToast('Google Sheet ยังไม่มีข้อมูลคำขอใหม่', 'info');
      }
    }
  } catch (err) {
    console.warn('Error fetching from Google Sheet:', err);
    if (notify) showToast('ไม่สามารถเชื่อมต่อ Google Sheets ได้ ตรวจสอบ URL หรือสิทธิ์เข้าถึง', 'error');
  }
}

function refreshData() {
  const url = getGoogleScriptUrl();
  if (!url) {
    showToast('ยังไม่ได้ตั้งค่า Google Sheet URL', 'info');
    openSyncModal();
    return;
  }
  showToast('กำลังรีเฟรชข้อมูลจาก Google Sheets...', 'info');
  fetchFromGoogleSheet(true);
}

async function testGoogleSheetConnection() {
  const inputUrl = document.getElementById('googleScriptUrlInput').value.trim();
  if (!inputUrl) {
    showToast('กรุณากรอก URL ก่อนทดสอบ', 'error');
    return;
  }
  showToast('กำลังทดสอบเชื่อมต่อ...', 'info');
  try {
    const res = await fetch(inputUrl);
    const json = await res.json();
    if (json.status === 'success') {
      showToast('เชื่อมต่อกับ Google Sheets สำเร็จเรียบร้อย!', 'success');
    } else {
      showToast('การเชื่อมต่อตอบกลับ แต่มีข้อผิดพลาด: ' + (json.message || ''), 'error');
    }
  } catch (err) {
    showToast('เชื่อมต่อไม่สำเร็จ: โปรดตรวจสอบว่าได้ตั้งสิทธิ์เป็น Anyone (ทุกคน) หรือยัง', 'error');
  }
}

// ==========================================
// EXPORT CSV / EXCEL
// ==========================================
function exportToCSV() {
  const list = getRequests();
  if (list.length === 0) {
    showToast('ไม่มีข้อมูลสำหรับส่งออก', 'error');
    return;
  }

  const headers = [
    "รหัสคำขอ",
    "วันที่ยื่นคำขอ",
    "ชื่อ-นามสกุล ผู้ขอ",
    "ตำแหน่ง",
    "เบอร์โทรศัพท์",
    "รายวิชา/กิจกรรม",
    "ประเภทห้อง",
    "อาคาร/ชั้น/โซน",
    "หมายเลขห้อง/พื้นที่",
    "วันที่ใช้ห้อง",
    "เวลาเริ่ม",
    "เวลาสิ้นสุด",
    "รายละเอียดเพิ่มเติม",
    "สถานะ",
    "หมายเหตุเจ้าหน้าที่"
  ];

  const esc = (val) => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = list.map(item => [
    esc(item.id),
    esc(formatThaiDateTime(item.createdAt)),
    esc(item.requesterName),
    esc(item.requesterPosition),
    esc(item.requesterPhone),
    esc(item.courseName),
    esc(item.roomType),
    esc(item.buildingZone),
    esc(item.roomNumber),
    esc(item.dateOfUse),
    esc(item.startTime),
    esc(item.endTime),
    esc(item.additionalDetails),
    esc(item.status),
    esc(item.adminNote)
  ].join(','));

  const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const now = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `รายงานการขอใช้ห้องนอกเวลาทำการ_${now}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('ส่งออกไฟล์ Excel/CSV เรียบร้อย', 'success');
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================
function getStatusIcon(status) {
  if (status === 'รอดำเนินการ') return '🟡';
  if (status === 'อยู่ระหว่างดำเนินการ') return '🔵';
  if (status === 'ดำเนินการแล้ว') return '🟢';
  if (status === 'ไม่อนุมัติ') return '🔴';
  return '⚪';
}

function getThaiMonthName(m) {
  const months = [
    '', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  return months[m] || '';
}

function getThaiMonthShort(m) {
  const months = [
    '', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  return months[m] || '';
}

function formatThaiDate(dateStr) {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const d = parseInt(parts[2], 10);
  const m = parseInt(parts[1], 10);
  const y = parseInt(parts[0], 10) + 543;
  return `${d} ${getThaiMonthShort(m)} ${y}`;
}

function formatThaiDateOfficial(dateObj) {
  const d = dateObj.getDate();
  const m = dateObj.getMonth() + 1;
  const y = dateObj.getFullYear() + 543;
  return `${d} ${getThaiMonthName(m)} ${y}`;
}

function formatThaiDateTime(isoStr) {
  if (!isoStr) return '-';
  const [datePart, timePart] = isoStr.split('T');
  const dThai = formatThaiDate(datePart);
  const t = timePart ? timePart.substring(0, 5) : '';
  return `${dThai} เวลา ${t} น.`;
}

function copyToClipboard(text, msg) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(msg || 'คัดลอกเรียบร้อยแล้ว', 'info');
  }).catch(() => {
    const input = document.createElement('textarea');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    showToast(msg || 'คัดลอกเรียบร้อยแล้ว', 'info');
  });
}

let toastTimeout = null;
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMessage');
  const toastIcon = document.getElementById('toastIcon');
  if (!toast || !toastMsg) return;

  toastMsg.innerText = message;
  
  if (type === 'success') {
    toastIcon.innerHTML = `<i data-lucide="check-circle" class="w-5 h-5 text-emerald-400"></i>`;
  } else if (type === 'error') {
    toastIcon.innerHTML = `<i data-lucide="alert-triangle" class="w-5 h-5 text-rose-400"></i>`;
  } else {
    toastIcon.innerHTML = `<i data-lucide="info" class="w-5 h-5 text-sky-400"></i>`;
  }

  lucide.createIcons();

  toast.classList.remove('translate-y-20', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0');
    toast.classList.remove('translate-y-0', 'opacity-100');
  }, 3500);
}
