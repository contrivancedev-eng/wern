// ===== Auth Guard =====
(function() {
  var a = localStorage.getItem('wern_admin_auth');
  if (!a) { location.href = 'login.html'; return; }
  var d = JSON.parse(a);
  if (!d.loggedIn || Date.now() - d.timestamp > 86400000) {
    localStorage.removeItem('wern_admin_auth');
    location.href = 'login.html';
  }
})();

function logout() { localStorage.removeItem('wern_admin_auth'); location.href = 'login.html'; }

// ===== Init =====
document.addEventListener('DOMContentLoaded', function() {
  initSidebar();
  initSkeletons();
  initTabs();
  initModals();
  initFilters();
  initSearch();
});

// ===== Sidebar =====
function initSidebar() {
  var toggle = document.querySelector('.menu-toggle');
  var sidebar = document.querySelector('.sidebar');
  if (!toggle || !sidebar) return;
  var ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.15);z-index:99;display:none;';
  document.body.appendChild(ov);
  toggle.onclick = function() { sidebar.classList.toggle('open'); ov.style.display = sidebar.classList.contains('open') ? 'block' : 'none'; };
  ov.onclick = function() { sidebar.classList.remove('open'); ov.style.display = 'none'; };
}

// ===== Skeletons =====
function initSkeletons() {
  document.querySelectorAll('[data-loading]').forEach(function(el) {
    var ms = parseInt(el.getAttribute('data-loading')) || 1000;
    setTimeout(function() { el.removeAttribute('data-loading'); }, ms);
  });
}

// ===== Tabs =====
function initTabs() {
  document.querySelectorAll('.tabs').forEach(function(bar) {
    var tabs = bar.querySelectorAll('.tab');
    var parent = bar.closest('.card') || bar.parentElement;
    var panes = parent.querySelectorAll('.tab-pane');
    tabs.forEach(function(t) {
      t.onclick = function() {
        tabs.forEach(function(x) { x.classList.remove('active'); });
        panes.forEach(function(x) { x.classList.remove('active'); });
        t.classList.add('active');
        var p = parent.querySelector('#' + t.dataset.tab);
        if (p) p.classList.add('active');
      };
    });
  });
}

// ===== Modals =====
function initModals() {
  document.querySelectorAll('[data-modal]').forEach(function(tr) {
    tr.addEventListener('click', function(e) { e.preventDefault(); openModal(tr.dataset.modal); });
  });
  document.querySelectorAll('.modal-bg').forEach(function(bg) {
    bg.onclick = function(e) { if (e.target === bg) closeModal(bg); };
  });
  document.querySelectorAll('.modal-close, [data-dismiss]').forEach(function(b) {
    b.onclick = function() { var m = b.closest('.modal-bg'); if (m) closeModal(m); };
  });
}
function openModal(id) { var m = document.getElementById(id); if (m) { m.classList.add('show'); document.body.style.overflow = 'hidden'; } }
function closeModal(m) { m.classList.remove('show'); document.body.style.overflow = ''; }

// ===== Filters =====
function initFilters() {
  document.querySelectorAll('.filter-grp').forEach(function(grp) {
    var btns = grp.querySelectorAll('.filter-btn');
    btns.forEach(function(b) {
      b.onclick = function() {
        btns.forEach(function(x) { x.classList.remove('active'); });
        b.classList.add('active');
        var f = b.dataset.filter, card = grp.closest('.card') || grp.closest('.content');
        if (!card) return;
        card.querySelectorAll('tbody tr[data-cat]').forEach(function(r) {
          r.style.display = (f === 'all' || r.dataset.cat === f) ? '' : 'none';
        });
      };
    });
  });
}

// ===== Search =====
function initSearch() {
  document.querySelectorAll('.search-box input, .tbl-search').forEach(function(inp) {
    inp.oninput = function() {
      var q = inp.value.toLowerCase(), card = inp.closest('.card') || inp.closest('.content');
      if (!card) return;
      card.querySelectorAll('tbody tr').forEach(function(r) { r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none'; });
    };
  });
}

// ===== Toast =====
function showToast(msg, type) {
  var box = document.querySelector('.toast-box');
  if (!box) { box = document.createElement('div'); box.className = 'toast-box'; document.body.appendChild(box); }
  var t = document.createElement('div'); t.className = 'toast ' + (type || 'info'); t.textContent = msg; box.appendChild(t);
  setTimeout(function() { t.style.opacity = '0'; t.style.transition = '.2s'; setTimeout(function() { t.remove(); }, 200); }, 3000);
}

// ===== Notification =====
function updateNotifPreview() {
  var t = document.getElementById('notif-title'), b = document.getElementById('notif-body');
  var pt = document.getElementById('preview-title'), pb = document.getElementById('preview-body');
  if (t && pt) pt.textContent = t.value || 'Notification Title';
  if (b && pb) pb.textContent = b.value || 'Message preview...';
}
function sendNotification() {
  var t = document.getElementById('notif-title'), b = document.getElementById('notif-body');
  if (!t.value || !b.value) { showToast('Fill in title and message', 'error'); return; }
  var tgt = document.getElementById('notif-target');
  showToast('Sent to ' + (tgt.value === 'all' ? 'all users' : tgt.value), 'success');
  t.value = ''; b.value = ''; updateNotifPreview();
}

// ===== Actions =====
function viewUser(id) { openModal('user-detail-modal'); }
function editUser(id) { openModal('user-edit-modal'); }
function deleteUser(id) { if (confirm('Delete this user?')) showToast('User deleted', 'success'); }
function exportData() { showToast('Exporting...', 'info'); setTimeout(function() { showToast('Export complete', 'success'); }, 1500); }
function editBanner(id) { openModal('banner-modal'); }
function deleteBanner(id) { if (confirm('Delete banner?')) showToast('Banner deleted', 'success'); }
function editReward(d) { openModal('reward-modal'); }
function saveSettings() { showToast('Settings saved', 'success'); }

// ===== Charts =====
function initCharts() {
  if (typeof Chart === 'undefined') return;
  var opts = function() { return { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.04)' }, ticks: { font: { size: 10 }, color: '#9CA3AF' } }, x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#9CA3AF' } } } }; };

  var el = document.getElementById('stepsChart');
  if (el) new Chart(el, { type: 'line', data: { labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], datasets: [{ data: [245000,312000,289000,356000,401000,378000,290000], borderColor: '#003B4C', backgroundColor: 'rgba(0,59,76,.06)', fill: true, tension: .4, borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#fff', pointBorderColor: '#003B4C', pointBorderWidth: 2 }] }, options: opts() });

  el = document.getElementById('usersChart');
  if (el) new Chart(el, { type: 'bar', data: { labels: ['Jan','Feb','Mar','Apr','May','Jun'], datasets: [{ data: [120,190,230,310,420,380], backgroundColor: ['rgba(0,59,76,.5)','rgba(34,197,94,.5)','rgba(245,158,11,.5)','rgba(14,116,144,.5)','rgba(13,148,136,.5)','rgba(0,59,76,.3)'], borderRadius: 4, borderSkipped: false, barThickness: 22 }] }, options: opts() });

  el = document.getElementById('causesChart');
  if (el) new Chart(el, { type: 'doughnut', data: { labels: ['Forest','Water','Food','Women','Kids'], datasets: [{ data: [35,25,18,14,8], backgroundColor: ['#22C55E','#0E7490','#F59E0B','#EC4899','#003B4C'], borderWidth: 0, spacing: 2, borderRadius: 3 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } } } } });

  el = document.getElementById('txChart');
  if (el) new Chart(el, { type: 'line', data: { labels: ['W1','W2','W3','W4'], datasets: [ { label: 'Steps', data: [12400,18200,15800,22100], borderColor: '#0D9488', backgroundColor: 'rgba(13,148,136,.04)', fill: true, tension: .4, borderWidth: 2 }, { label: 'Claims', data: [5200,6800,7200,8900], borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,.04)', fill: true, tension: .4, borderWidth: 2 }, { label: 'Signup', data: [3000,4500,5500,4200], borderColor: '#003B4C', backgroundColor: 'rgba(0,59,76,.04)', fill: true, tension: .4, borderWidth: 2 } ] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.04)' }, ticks: { font: { size: 10 }, color: '#9CA3AF' } }, x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#9CA3AF' } } } } });
}

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(initCharts, 600);
  initAvatarMenu();
});

// ===== Avatar Dropdown =====
function initAvatarMenu() {
  document.querySelectorAll('.avatar-wrap').forEach(function(wrap) {
    var menu = wrap.querySelector('.avatar-menu');
    var avatar = wrap.querySelector('.avatar');
    if (!avatar || !menu) return;
    avatar.addEventListener('click', function(e) {
      e.stopPropagation();
      menu.classList.toggle('show');
    });
  });
  document.addEventListener('click', function() {
    document.querySelectorAll('.avatar-menu.show').forEach(function(m) { m.classList.remove('show'); });
  });
}
