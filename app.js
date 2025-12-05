/* ===============================
   STORAGE + BASE DATA
=================================*/
const STORAGE_KEY = "chamLuongMobile";
let data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
let editingIndex = null;
let calDate = new Date();
const OFF_KEY = "offDays";
let offDays = JSON.parse(localStorage.getItem(OFF_KEY) || "[]");

/* ===============================
   SAVE / LOAD
=================================*/
function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
// ===============================
// OFF DAY TOGGLE
// ===============================
function updateOffButton() {
    const date = document.getElementById("date").value;
    const btn = document.getElementById("toggleOffBtn");

    if (!btn) return;

    if (offDays.includes(date)) {
        btn.classList.add("active");
        btn.innerText = "Bỏ nghỉ";
    } else {
        btn.classList.remove("active");
        btn.innerText = "Đặt nghỉ";
    }
}
/* ===============================
   BLOCK ENTRIES ON OFF DAYS
=================================*/
// disable/enable form inputs when selected date is off
function updateFormStateByOff(date) {
    const isOff = offDays.includes(date);
    const inputs = [
        "donLoai", "deliver", "ot", "km", "soDon", "ghiChu"
    ].map(id => document.getElementById(id)).filter(Boolean);

    // disable inputs and save button if off
    inputs.forEach(inp => {
        if (isOff) {
            inp.setAttribute("disabled", "disabled");
            inp.classList.add("disabled-by-off");
        } else {
            inp.removeAttribute("disabled");
            inp.classList.remove("disabled-by-off");
        }
    });

    const saveBtn = document.getElementById("saveBtn");
    if (isOff) {
        saveBtn.setAttribute("disabled", "disabled");
        saveBtn.style.opacity = "0.6";
        saveBtn.title = "Không thể lưu vào ngày nghỉ";
    } else {
        saveBtn.removeAttribute("disabled");
        saveBtn.style.opacity = "";
        saveBtn.title = "";
    }

    // update the off-button text/class as well
    updateOffButton();
}

// ensure when user changes date in form we update state
document.getElementById("date").addEventListener("change", (e) => {
    updateFormStateByOff(e.target.value);
});

// block save if date is off (extra safety)
const origSaveHandler = document.getElementById("saveBtn").onclick;
document.getElementById("saveBtn").onclick = function (ev) {
    // if button is disabled natively, do nothing
    if (this.hasAttribute("disabled")) return;
    const date = document.getElementById("date").value;
    if (!date) return alert("Chọn ngày!");

    if (offDays.includes(date)) {
        return alert("Ngày này đã được đánh dấu là NGHỈ — không thể tạo hoặc sửa đơn.");
    }

    // call original handler logic (we preserved it above)
    if (typeof origSaveHandler === "function") {
        origSaveHandler.call(this, ev);
    }
};

// when editing an item, also update form state (so if that date is off, inputs locked)
const origEditItem = window.editItem;
window.editItem = function(idx) {
    if (typeof origEditItem === "function") origEditItem(idx);
    const selectedDate = document.getElementById("date").value;
    updateFormStateByOff(selectedDate);
};

// when resetting form, ensure inputs are enabled
const origResetForm = window.resetForm;
window.resetForm = function() {
    if (typeof origResetForm === "function") origResetForm();
    updateFormStateByOff(document.getElementById("date").value || "");
};

// also, when calendar modal opens, prevent opening the edit form directly for off days by
// making the "Sửa" button still visible but when clicked user will get alert (handled by save blocking).
// (No extra code needed because save is blocked and form inputs will be disabled.)

/* OPTIONAL: small CSS to show disabled inputs (paste into your CSS file)
.disabled-by-off {
    opacity: 0.6;
    pointer-events: none;
}
*/

document.getElementById("toggleOffBtn")?.addEventListener("click", () => {
    const date = document.getElementById("date").value;
    if (!date) return alert("Chọn ngày trước!");

    const idx = offDays.indexOf(date);

    if (idx === -1) {
        offDays.push(date);
        alert(`Đã đặt ${date} là ngày nghỉ`);
    } else {
        offDays.splice(idx, 1);
        alert(`Đã bỏ nghỉ ngày ${date}`);
    }

    localStorage.setItem(OFF_KEY, JSON.stringify(offDays));
    updateOffButton();
    renderCalendar();
});

// Khi đổi ngày → cập nhật trạng thái nút nghỉ
document.getElementById("date").addEventListener("change", updateOffButton);

/* ===============================
   CALC MONEY
=================================*/
function calcMoney(entry) {
    const setting = JSON.parse(localStorage.getItem(SALARY_KEY) || "{}");

    const luongNgay = setting.luongNgay || 250000;
    const otGia = setting.ot || 50000;
    const delGia = setting.deliver || 30000;
    const kmGia = setting.km || 1000;

    const thuong10 = setting.thuong10 || 100000;
    const thuong20 = setting.thuong20 || 200000;
    const thuong25 = setting.thuong25 || 250000;

    const deliver = Number(entry.deliver) || 0;
    const ot = Number(entry.ot) || 0;
    const km = Number(entry.km) || 0;
    const soDon = Number(entry.soDon) || 0;

    let thuong = 0;
    if (soDon >= 25) thuong = thuong25;
    else if (soDon >= 20) thuong = thuong20;
    else if (soDon >= 10) thuong = thuong10;

    return luongNgay + deliver * delGia + ot * otGia + km * kmGia + thuong;
}
function exportData() {
    // lấy dữ liệu và danh sách ngày nghỉ
    const allData = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const offDaysAll = JSON.parse(localStorage.getItem(OFF_KEY) || "[]");

    // dùng calDate (tháng đang hiển thị) để xuất theo tháng
    const year = calDate.getFullYear();
    const month = calDate.getMonth(); // 0-based

    // first / last day of that month (yyyy-mm-dd)
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const pad = n => String(n).padStart(2, "0");
    const formatDMY = d => `${pad(d.getDate())}-${pad(d.getMonth()+1)}`;

    const startStr = `${pad(firstDay.getDate())}-${pad(firstDay.getMonth()+1)}-${firstDay.getFullYear()}`;
    const endStr = `${pad(lastDay.getDate())}-${pad(lastDay.getMonth()+1)}-${lastDay.getFullYear()}`;

    // filter data trong tháng
    const monthData = allData.filter(d => {
        if (!d.date) return false;
        const dt = new Date(d.date);
        return dt.getFullYear() === year && dt.getMonth() === month;
    });

    // Off days trong tháng (lấy từ offDaysAll)
    const offDaysInMonth = offDaysAll
        .filter(s => {
            const dt = new Date(s);
            return dt.getFullYear() === year && dt.getMonth() === month;
        })
        .sort((a,b) => a.localeCompare(b));

    // Tổng các chỉ số
    let tongOT = 0;
    let tongGiao = 0;
    let tongThanhLy = 0;
    let tongBH = 0;
    let tongKM = 0;

    // để đếm số ngày làm: lấy set các ngày có entry (không tính ngày nghỉ)
    const workingDaysSet = new Set();

    monthData.forEach(d => {
        const date = d.date;
        const isOff = offDaysInMonth.includes(date);

        if (!isOff) {
            // ngày làm
            workingDaysSet.add(date);
        }

        tongOT += Number(d.ot || 0);
        tongKM += Number(d.km || 0);

        // Tổng soDon theo loại
        const so = Number(d.soDon || 0);
        if (d.donLoai === "Đơn giao") tongGiao += so;
        else if (d.donLoai === "Thanh lý") tongThanhLy += so;
        else if (d.donLoai === "Bảo hành") tongBH += so;
    });

    const ngayLam = workingDaysSet.size;

    // chuyển danh sách ngày nghỉ sang số ngày (ví dụ "21,25")
    const chiTietNghi = offDaysInMonth
        .map(s => {
            const parts = s.split("-");
            return String(Number(parts[2] || new Date(s).getDate())); // lấy ngày, loại bỏ leading zero
        })
        .join(",");

    // làm chuỗi theo mẫu
    let text = "";
    text += `Tổng chi tiết lương từ ngày ${startStr} đến ngày ${endStr}.\n`;
    text += `-Số giờ tăng ca: ${tongOT}\n`;
    text += `-Giao máy: ${tongGiao}\n`;
    text += `-Thanh lý: ${tongThanhLy}\n`;
    text += `-Bảo hành: ${tongBH}\n`;
    text += `-Số ngày làm việc: ${ngayLam} ngày\n`;
    // format KM với tối đa 1 chữ số thập phân nếu cần
    const kmFormatted = Number.isInteger(tongKM) ? `${tongKM}` : `${Math.round(tongKM * 10) / 10}`;
    text += `-Số KM: ${kmFormatted} km\n`;
    text += `-Chi tiết ngày nghỉ: ${chiTietNghi}`;

    // xuất file TXT
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bao_cao_luong.txt";
    a.click();
    URL.revokeObjectURL(url);
}


function setTheme(mode) {
    document.body.classList.remove("light", "dark");
    document.body.classList.add(mode);
}
const PASS_KEY = "appPassword";

function savePassword() {
    localStorage.setItem(PASS_KEY, setPass.value);
    alert("Đã đặt mật khẩu!");
}
function clearAllData() {
    if (!confirm("Bạn có chắc muốn xóa toàn bộ dữ liệu?")) return;

    localStorage.clear();
    data = [];
    renderList();
    renderCalendar();
    renderSummary();
    alert("Đã xóa sạch dữ liệu!");
}


/* ===============================
   RESET FORM
=================================*/
function resetForm() {
    editingIndex = null;
    document.getElementById("date").value = "";
    document.getElementById("donLoai").value = "Đơn giao";
    document.getElementById("deliver").value = "";
    document.getElementById("ot").value = "";
    document.getElementById("km").value = "";
    document.getElementById("soDon").value = "";
    document.getElementById("ghiChu").value = "";
}

/* ===============================
   SAVE ENTRY
=================================*/
/* SAVE ENTRY */
document.getElementById("saveBtn").onclick = function () {
    const date = document.getElementById("date").value;
    if (!date) return alert("Chọn ngày!");

    const entry = {
        date,
        donLoai: document.getElementById("donLoai").value, // giữ nguyên value ngắn
        deliver: Number(document.getElementById("deliver").value) || 0,
        ot: Number(document.getElementById("ot").value) || 0,
        km: Number(document.getElementById("km").value) || 0,
        soDon: Number(document.getElementById("soDon").value) || 0,
        ghiChu: document.getElementById("ghiChu").value.trim(),
    };

    if (editingIndex !== null) {
        data[editingIndex] = entry;
        editingIndex = null;
    } else {
        data.push(entry);
    }

    saveData();
    resetForm();
    renderList();
    renderSummary();
    renderCalendar();

    showPage("listSection");
};

/* BOTTOM NAVIGATION */
document.querySelectorAll(".nav-item").forEach(item => {
    item.onclick = () => {
        const page = item.dataset.page;
        showPage(page);
    };
});

/* SHOW PAGE duy nhất */
function showPage(pageId) {
    document.querySelectorAll("section").forEach(sec => sec.style.display = "none");

    document.getElementById(pageId).style.display = "block";

    document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));
    document.querySelector(`.nav-item[data-page="${pageId}"]`)?.classList.add("active");
}


/* ===============================
   RESET BUTTON
=================================*/
document.getElementById("resetBtn").onclick = resetForm;

/* ===============================
   RENDER SUMMARY CARDS
=================================*/
function renderSummary() {
    const year = calDate.getFullYear();
    const month = calDate.getMonth() + 1; // 1-based

    let totalMoney = 0;
    let totalGiao = 0;
    let totalBH = 0;
    let totalTL = 0;
    let totalSoDon = 0;
    let totalKM = 0;

    const workingDaysSet = new Set();

     data.forEach(r => {
        if (!r.date) return;
        const d = new Date(r.date);
        if (d.getFullYear() === year && d.getMonth() + 1 === month) {
            const so = Number(r.deliver || 0); // dùng deliver thay vì soDon

            const donLoai = r.donLoai?.trim().toLowerCase().replace(/\s/g,'');

            if (donLoai === "đơngiao") totalGiao += so;
else if (donLoai === "bảohành") totalBH += so;
else if (donLoai === "thanhly") totalTL += so;


            totalSoDon += so;
            totalMoney += calcMoney(r);
            totalKM += Number(r.km || 0);

            if (!offDays.includes(r.date)) workingDaysSet.add(r.date);
        }
    });


    const ngayLam = workingDaysSet.size;

    document.getElementById("cardTongTien").innerText =
        totalMoney.toLocaleString() + " VND";
    document.getElementById("cardGiao").innerText = totalGiao;
    document.getElementById("cardBaoHanh").innerText = totalBH;
    document.getElementById("cardThanhLy").innerText = totalTL;
    document.getElementById("cardSoDon").innerText = totalSoDon;
    document.getElementById("cardKM").innerText = totalKM + " km";
    document.getElementById("cardNgayLam").innerText = `${ngayLam} ngày`;
}




/* ===============================
   RENDER LIST (CARD MOBILE)
=================================*/
function renderList() {
    const container = document.getElementById("dayList");
    container.innerHTML = "";

    const groups = {};

    data.forEach((r, idx) => {
        if (!groups[r.date]) groups[r.date] = [];
        groups[r.date].push({ ...r, idx });
    });

    const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    sortedDates.forEach(date => {
        const items = groups[date];
        let total = 0;
        let note = "";

        items.forEach(it => {
            total += calcMoney(it);
            if (it.ghiChu) note += it.ghiChu + " • ";
        });

        const div = document.createElement("div");
        div.className = "day-card";
        div.onclick = () => openModal(date);

        div.innerHTML = `
            <div class="date">${date}</div>
            <b>${total.toLocaleString()} VND</b>
            <div class="notes">${note || "Không có ghi chú"}</div>
        `;

        container.appendChild(div);
    });
}

/* ===============================
   CALENDAR RENDER (APP STYLE)
=================================*/
function renderCalendar() {
    const year = calDate.getFullYear();
    const month = calDate.getMonth();

    const title = `Tháng ${month + 1} / ${year}`;
    document.getElementById("calendarTitle").innerText = title;

    const calendar = document.getElementById("calendar");
    calendar.innerHTML = "";

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

    dayNames.forEach(d => {
        const div = document.createElement("div");
        div.className = "day";
        div.style.fontWeight = "600";
        div.innerText = d;
        calendar.appendChild(div);
    });

    for (let i = 0; i < firstDay; i++) {
        const div = document.createElement("div");
        div.className = "day empty";
        calendar.appendChild(div);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

        const div = document.createElement("div");
        div.className = "day";
        div.innerText = d;
            // ★★★★★ ĐÁNH DẤU NGÀY NGHỈ ★★★★★
        if (offDays.includes(dateStr)) {
            div.classList.add("off-day");   // class css riêng
        }
        if (new Date().toDateString() === new Date(dateStr).toDateString()) {
            div.classList.add("today");
        }

        const hasData = data.some(r => r.date === dateStr);

        if (hasData) {
            div.style.background = "rgba(79,70,229,0.2)";
        }

        div.onclick = () => openModal(dateStr);

        calendar.appendChild(div);
    }
}

/* ===============================
   MONTH NAVIGATION
=================================*/
document.getElementById("prevMonth").onclick = () => {
    calDate.setMonth(calDate.getMonth() - 1);
    renderCalendar();
    renderSummary();  // <--- thêm
};

document.getElementById("nextMonth").onclick = () => {
    calDate.setMonth(calDate.getMonth() + 1);
    renderCalendar();
    renderSummary();  // <--- thêm
};


/* ===============================
   MODAL (SLIDE UP)
=================================*/
function openModal(date) {
    const modal = document.createElement("div");
    modal.className = "modal show";

    const items = data
        .map((r, idx) => ({ ...r, idx }))
        .filter(r => r.date === date);

    let html = `
    <button class="close-btn" onclick="this.parentElement.remove()">✖</button>
    <h3>Chi tiết ${date}</h3>
    <p style="color:red; font-weight:600;">
        ${offDays.includes(date) ? "➤ Đây là NGÀY NGHỈ" : ""}
    </p>
`;

    items.forEach(r => {
        html += `
            <div style="border-bottom:1px solid var(--border); padding:10px 0">
                <b>${r.donLoai}</b> — ${calcMoney(r).toLocaleString()} VND<br>
                Bộ: ${r.deliver} • OT: ${r.ot} • KM: ${r.km} • Đơn: ${r.soDon}<br>
                <i>${r.ghiChu || "Không ghi chú"}</i><br>
                <button onclick="editItem(${r.idx}); this.parentElement.parentElement.remove()" class="btn-primary" style="padding:8px;margin-top:8px;">Sửa</button>
                <button onclick="deleteItem(${r.idx}); this.parentElement.parentElement.remove()" class="btn-danger" style="padding:8px;margin-top:4px;">Xóa</button>
            </div>
        `;
    });

    modal.innerHTML = html;
    document.body.appendChild(modal);
}

function editItem(idx) {
    const r = data[idx];
    editingIndex = idx;

    document.getElementById("date").value = r.date;
    document.getElementById("donLoai").value = r.donLoai;
    document.getElementById("deliver").value = r.deliver;
    document.getElementById("ot").value = r.ot;
    document.getElementById("km").value = r.km;
    document.getElementById("soDon").value = r.soDon;
    document.getElementById("ghiChu").value = r.ghiChu;

    switchPage("formSection");
}

function deleteItem(idx) {
    if (!confirm("Xóa mục này?")) return;
    data.splice(idx, 1);
    saveData();
    renderList();
    renderCalendar();
    renderSummary();
}

/* ===============================
   BOTTOM NAVIGATION
=================================*/
document.querySelectorAll(".nav-item").forEach(item => {
    item.onclick = () => {
        const page = item.dataset.page;
        switchPage(page);

        document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
        item.classList.add("active");
    };
});

function switchPage(pageId) {
    document.getElementById("summaryCards").style.display = "none";
    document.getElementById("formSection").style.display = "none";
    document.getElementById("listSection").style.display = "none";
    document.getElementById("calendarSection").style.display = "none";

    document.getElementById(pageId).style.display = "block";
}

/* ===============================
   DARK/LIGHT MODE
=================================*/
document.getElementById("toggleMode").onclick = function () {
    if (document.body.classList.contains("light")) {
        document.body.classList.remove("light");
        document.body.classList.add("dark");
        this.innerText = "☀️";
    } else {
        document.body.classList.remove("dark");
        document.body.classList.add("light");
        this.innerText = "🌙";
    }
};

/* ===============================
   INIT
=================================*/
function init() {
    document.body.classList.add("light");
    renderSummary();
    renderList();
    renderCalendar();
}
const SALARY_KEY = "salarySetting";

function saveSalarySetting() {
    const setting = {
        luongNgay: Number(setLuongNgay.value),
        thuong10: Number(setThuong10.value),
        thuong20: Number(setThuong20.value),
        thuong25: Number(setThuong25.value),
        ot: Number(setOT.value),
        deliver: Number(setDeliver.value),
        km: Number(setKM.value),
    };

    localStorage.setItem(SALARY_KEY, JSON.stringify(setting));
    alert("Đã lưu!");
}
function showPage(pageId) {
    // Ẩn tất cả section
    document.querySelectorAll("section").forEach(sec => sec.style.display = "none");

    // Hiện section được chọn
    document.getElementById(pageId).style.display = "block";

    // Cập nhật trạng thái menu dưới
    document.querySelectorAll(".nav-item").forEach(btn => {
        btn.classList.remove("active");
    });

    document.querySelector(`.nav-item[data-page="${pageId}"]`)?.classList.add("active");
}
init();
