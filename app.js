'use strict';
const $ = id => document.getElementById(id);
let mode = 'demo', stream = null, imageUrl = null, checks = 0, notes = 0;
let cameraRequest = 0, uploadRequest = 0, demoTimer = null, demoStep = 0;
let demoElapsed = 0, demoLastFrame = null;
let personX = 250, personY = 0, litter = null, disposed = false;
const wasteTypes = [
  {id: 'paper', name: 'Giấy'},
  {id: 'bottle', name: 'Chai nhựa'},
  {id: 'bag', name: 'Bao ni lông'},
  {id: 'can', name: 'Lon'}
];
const randomWaste = () => wasteTypes[Math.floor(Math.random() * wasteTypes.length)];
let playerWaste = wasteTypes[0], heldWaste = [playerWaste];
let lastNpcDrop = -15000;
function showWaste(id, type) {
  const element = $(id);
  const href = `#waste-${type.id}`;
  if (element.getAttribute('href') !== href) element.setAttribute('href', href);
}
const movementKeys = new Set();
let npcs = [], npcLitter = [], npcDrops = 0;
function spawnNpc(i, previousSide) {
  const side = previousSide === undefined ? i % 2 : 1 - previousSide;
  const carrying = Math.random() < 0.5;
  const willDrop = carrying && Math.random() < 0.5;
  return {side, x: side ? 870 : -70, y: [-95, -20, 55][i],
    wait: previousSide === undefined ? i * 4500 : 1500 + Math.random() * 4000,
    speed: 40 + Math.random() * 18, waste: randomWaste(), carrying,
    willDrop, dropped: false, dropX: 200 + Math.random() * 380};
}
function resetNpcs() {
  npcs = [0, 1, 2].map(i => spawnNpc(i));
  npcLitter = [];
  npcDrops = 0;
  lastNpcDrop = -15000;
}
function advanceNpcs(delta) {
  npcs.forEach((npc, i) => {
    if (npc.wait > 0) { npc.wait -= delta; return; }
    const nextX = npc.x + (npc.side ? -1 : 1) * npc.speed * delta / 1000;
    const blocks = [{x: personX, y: personY}, ...npcs.filter(other => other !== npc)];
    const blocked = blocks.some(other => Math.abs(npc.y - other.y) < 40 && Math.abs(nextX - other.x) < 85 && Math.abs(nextX - other.x) < Math.abs(npc.x - other.x));
    npc.walking = !blocked;
    if (!blocked) npc.x = nextX;
    if (npc.carrying && npc.willDrop && demoElapsed - lastNpcDrop >= 15000 && npcLitter.length < 18 && (npc.side ? npc.x <= npc.dropX : npc.x >= npc.dropX)) {
      npc.carrying = false;
      npc.dropped = true;
      npcDrops++;
      lastNpcDrop = demoElapsed;
      npcLitter.push({x: npc.x + 24, y: npc.y + 345, type: npc.waste});
    }
    if (npc.side ? npc.x < -70 : npc.x > 870) npcs[i] = spawnNpc(i, npc.side);
  });
}
const demoHint = 'Bấm Chạy demo, dùng WASD hoặc phím mũi tên để di chuyển. Space: nhặt rác ở gần / thả một vật khi không có rác gần. O: bỏ rác đang cầm vào thùng khi đứng gần. Cầm tối đa 2 món, mỗi tay một món.';
let events = [];
const now = () => new Date().toLocaleString('vi-VN');
function toast(message) {
  $('toast').textContent = message;
  $('toast').hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { $('toast').hidden = true; }, 5000);
}
function result(title, description, status) {
  $('resultTitle').textContent = title;
  $('resultDescription').textContent = description;
  $('statusText').textContent = status;
  // Real camera and uploads have no connected model; demo states are labeled separately.
  document.querySelector('.result-card').classList.remove('is-alert');
  $('objectText').textContent = 'Chưa có dữ liệu';
  $('confidenceText').textContent = '—';
  $('timeText').textContent = '—';
}
function stopStream() {
  cameraRequest++;
  if (stream) stream.getTracks().forEach(track => track.stop());
  stream = null;
  $('video').pause();
  $('video').srcObject = null;
  $('video').hidden = true;
  $('stopCamera').disabled = true;
  $('startCamera').disabled = false;
}
function releaseImage() {
  if (imageUrl) URL.revokeObjectURL(imageUrl);
  imageUrl = null;
  $('uploadedImage').removeAttribute('src');
  $('uploadedImage').hidden = true;
}
function pauseDemo() {
  movementKeys.clear();
  cancelAnimationFrame(demoTimer);
  demoLastFrame = null;
  demoTimer = null;
  $('stopDemo').disabled = true;
  $('playDemo').disabled = false;
}
function resetDemo() {
  pauseDemo();
  demoStep = 0;
  demoElapsed = 0;
  personX = 250;
  personY = 0;
  litter = null;
  disposed = false;
  playerWaste = randomWaste();
  heldWaste = [playerWaste];
  resetNpcs();
  $('demoPerson').setAttribute('opacity', '1');
  $('demoPerson').setAttribute('transform', 'translate(250 0)');
  $('personBox').toggleAttribute('hidden', true);
  $('behaviorAlert').hidden = true;
  $('playDemo').textContent = '▶ Chạy demo';
  $('sampleObject').setAttribute('opacity', '0');
  $('demoBox').toggleAttribute('hidden', true);
  $('demoBox').removeAttribute('transform');
  renderDemo();
  document.querySelectorAll('.steps li').forEach(el => el.classList.remove('active'));
  if (mode === 'demo') result('Chưa có kết quả nhận diện', 'Chạy demo để xem quy trình dự kiến. Mọi bước trong demo đều là minh họa.', 'Sẵn sàng chạy minh họa');
}
function setMode(next) {
  if (mode === next) return;
  uploadRequest++;
  stopStream();
  releaseImage();
  resetDemo();
  mode = next;
  const demo = mode === 'demo';
  $('demoTab').classList.toggle('selected', demo);
  $('liveTab').classList.toggle('selected', !demo);
  $('demoTab').setAttribute('aria-pressed', String(demo));
  $('liveTab').setAttribute('aria-pressed', String(!demo));
  $('demoScene').hidden = !demo;
  $('npcSummary').hidden = !demo;
  $('placeholder').hidden = demo;
  $('demoControls').hidden = !demo;
  $('liveControls').hidden = demo;
  $('alertBtn').disabled = true;
  $('sourceLabel').textContent = demo ? 'DỮ LIỆU MINH HỌA' : 'XEM TRƯỚC · CHƯA PHÂN TÍCH AI';
  $('clock').textContent = demo ? 'SÂN TRƯỜNG · MÔ PHỎNG' : 'CHƯA KẾT NỐI CAMERA';
  $('feedNote').textContent = demo ? 'MINH HỌA QUY TRÌNH / KHÔNG NHẬN DIỆN THỰC TẾ' : 'HÌNH ẢNH CHỈ HIỂN THỊ TRÊN TRÌNH DUYỆT · CHƯA CÓ AI';
  $('controlHint').textContent = demo ? demoHint : 'Camera cần quyền truy cập và kết nối HTTPS. Ảnh không được gửi đến máy chủ.';
  $('resultKind').textContent = demo ? 'TRẠNG THÁI TRẢI NGHIỆM' : 'TRẠNG THÁI NGUỒN HÌNH ẢNH';
  result('Chưa có kết quả nhận diện', demo ? 'Chạy demo để xem quy trình dự kiến. Mọi bước trong demo đều là minh họa.' : 'Bật webcam hoặc tải ảnh để xem trước. Mô hình AI chưa được tích hợp.', demo ? 'Sẵn sàng chạy minh họa' : 'Camera chưa khởi động');
}
function renderDemo() {
  $('demoPerson').setAttribute('opacity', '1');
  $('demoPerson').setAttribute('transform', `translate(${personX} ${personY})`);
  $('personBox').toggleAttribute('hidden', false);
  const stride = movementKeys.size ? Math.sin(demoElapsed / 110) * 12 : 0;
  $('personLegs').setAttribute('d', `M-8 302L${-8 + stride} 341M8 302L${8 - stride} 341`);
  $('personArm').setAttribute('d', litter || disposed ? 'M12 263L25 290' : 'M12 263L30 277');
  $('sampleObject').setAttribute('opacity', disposed ? '0' : '1');
  if (heldWaste[0]) showWaste('playerWasteGraphic', heldWaste[0]);
  $('secondHeldObject').setAttribute('opacity', heldWaste[1] ? '1' : '0');
  if (heldWaste[1]) showWaste('secondHeldGraphic', heldWaste[1]);
  $('personLeftArm').setAttribute('d', heldWaste[1] ? 'M-12 264L-30 277' : 'M-12 264L-22 295');
  $('playerWasteLabel').textContent = playerWaste.name;
  $('sampleObject').setAttribute('transform', 'translate(30 277)');
  $('demoBox').toggleAttribute('hidden', !litter);
  if (litter) $('demoBox').setAttribute('transform', `translate(${litter.x - 460} ${litter.y - 345})`);
  $('behaviorAlert').hidden = !litter;
  $('binPrompt').setAttribute('opacity', !litter && !disposed && nearBin() ? '1' : '0');
  npcs.forEach((npc, i) => {
    const stride = npc.walking ? Math.sin(demoElapsed / 125 + i * 2) * 10 : 0;
    $(`npc${i}`).setAttribute('transform', `translate(${npc.x} ${npc.y})`);
    $(`npcLegs${i}`).setAttribute('d', `M-8 302L${-8 + stride} 341M8 302L${8 - stride} 341`);
    $(`npcHeld${i}`).setAttribute('opacity', npc.carrying ? '1' : '0');
    $(`npcLabel${i}`).textContent = `Người · 0${i + 2}`;
    showWaste(`npcHeldGraphic${i}`, npc.waste);
    $(`npcTracking${i}`).setAttribute('stroke', npc.dropped ? '#a55825' : '#23664a');
  });
  for (let i = 0; i < 18; i++) {
    const item = npcLitter[i];
    $(`npcWaste${i}`).setAttribute('opacity', item ? '1' : '0');
    if (item) {
      $(`npcWaste${i}`).setAttribute('transform', `translate(${item.x} ${item.y})`);
      $(`npcWasteLabel${i}`).textContent = item.type.name;
      showWaste(`npcWasteGraphic${i}`, item.type);
    }
  }
  const visible = npcs.filter(npc => npc.x >= 0 && npc.x <= 800).length;
  const summary = `Mô phỏng · Theo dõi ${visible} người trong sân · ${npcDrops} lượt xả rác · ${npcLitter.length} vật thể rác đang hiển thị`;
  if ($('npcSummary').textContent !== summary) $('npcSummary').textContent = summary;
  $('behaviorAlert').hidden = !npcLitter.length;
  const actors = npcs.map((npc, i) => ({id: `npc${i}`, y: npc.y}));
  actors.push({id: 'demoPerson', y: personY});
  const layer = $('peopleLayer');
  const ordered = actors.sort((a, b) => a.y - b.y).map(actor => $(actor.id));
  if (ordered.some((node, i) => layer.children[i] !== node)) ordered.forEach(node => layer.appendChild(node));
}

function nearBin() {
  return Math.hypot(personX - 666, personY + 345 - 350) <= 80;
}
function updateDemoResult(pickedUp = false) {
  demoStep = npcLitter.length ? 3 : 1;
  document.querySelectorAll('.steps li').forEach((el, i) => el.classList.toggle('active', npcLitter.length ? i > 0 : i === 0));
  result(pickedUp ? 'Đã nhặt rác' : disposed ? 'Đã bỏ rác vào thùng' : 'Đang điều khiển nhân vật',
    `Đang cầm ${heldWaste.length}/2 vật thể rác, mỗi tay một món. Space: nhặt rác gần nhất; nếu không có rác gần thì thả một vật đang cầm. O: bỏ toàn bộ rác đang cầm vào thùng khi đứng gần.`,
    pickedUp ? 'Mô phỏng · Đã nhặt rác' : disposed ? 'Mô phỏng · Không cầm rác' : 'Mô phỏng · Đang cầm rác');
  $('objectText').textContent = `Đang cầm: ${heldWaste.length}/2 · Trên sân: ${npcLitter.length}`;
  $('confidenceText').textContent = 'Không áp dụng (mô phỏng)';
  $('timeText').textContent = 'Thao tác bàn phím';
}
function syncHeldWaste() {
  disposed = heldWaste.length === 0;
  if (!disposed) playerWaste = heldWaste[heldWaste.length - 1];
}
function advanceDemo(timestamp) {
  const delta = demoLastFrame === null ? 0 : Math.min(timestamp - demoLastFrame, 100);
  demoElapsed += delta;
  demoLastFrame = timestamp;
  let dx = Number(movementKeys.has('KeyD') || movementKeys.has('ArrowRight')) - Number(movementKeys.has('KeyA') || movementKeys.has('ArrowLeft'));
  let dy = Number(movementKeys.has('KeyS') || movementKeys.has('ArrowDown')) - Number(movementKeys.has('KeyW') || movementKeys.has('ArrowUp'));
  const length = Math.hypot(dx, dy) || 1;
  const nextX = Math.max(35, Math.min(735, personX + dx / length * delta * 0.18));
  const nextY = Math.max(-110, Math.min(65, personY + dy / length * delta * 0.18));
  const blocked = npcs.some(npc => Math.abs(nextY - npc.y) < 40 && Math.abs(nextX - npc.x) < 65 &&
    Math.hypot(nextX - npc.x, (nextY - npc.y) * 2) < Math.hypot(personX - npc.x, (personY - npc.y) * 2));
  if (!blocked) { personX = nextX; personY = nextY; }
  advanceNpcs(delta);
  renderDemo();
  demoTimer = requestAnimationFrame(advanceDemo);
}
const directionCodes = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];
$('demoScene').addEventListener('keydown', event => {
  if (mode !== 'demo' || demoTimer === null || event.ctrlKey || event.altKey || event.metaKey) return;
  if (!directionCodes.includes(event.code) && event.code !== 'Space' && event.code !== 'KeyO') return;
  event.preventDefault();
  if (directionCodes.includes(event.code)) {
    movementKeys.add(event.code);
    return;
  }
  if (event.repeat) return;
  if (event.code === 'KeyO') {
    if (!heldWaste.length) {
      $('statusText').textContent = 'Mô phỏng · Chưa cầm rác; đến gần rác và nhấn Space để nhặt';
      return;
    }
    if (!nearBin()) {
      $('statusText').textContent = 'Mô phỏng · Đến gần thùng rác bên phải rồi nhấn O';
      return;
    }
    heldWaste = [];
    syncHeldWaste();
    updateDemoResult();
  } else {
    let nearest = -1, distance = 65;
    npcLitter.forEach((item, i) => {
      const d = Math.hypot(personX - item.x, personY + 345 - item.y);
      if (d <= distance) { nearest = i; distance = d; }
    });
    if (nearest >= 0) {
      if (heldWaste.length >= 2) {
        $('statusText').textContent = 'Mô phỏng · Hai tay đã đầy (2/2). Nhấn O gần thùng để bỏ rác, hoặc ra chỗ trống và nhấn Space để thả một món';
        return;
      }
      heldWaste.push(npcLitter.splice(nearest, 1)[0].type);
      syncHeldWaste();
      updateDemoResult(true);
    } else if (heldWaste.length && npcLitter.length < 18) {
      npcLitter.push({x: personX + 30, y: personY + 345, type: heldWaste.pop()});
      syncHeldWaste();
      updateDemoResult();
      $('statusText').textContent = 'Mô phỏng · Đã thả rác';
    } else {
      $('statusText').textContent = heldWaste.length ? 'Mô phỏng · Sân đã nhiều rác; hãy nhặt bớt hoặc bỏ rác vào thùng' : 'Mô phỏng · Đến gần rác rồi nhấn Space để nhặt';
    }
  }
  renderDemo();
});
window.addEventListener('keyup', event => movementKeys.delete(event.code));
$('demoScene').addEventListener('blur', () => movementKeys.clear());
window.addEventListener('blur', () => {
  if (demoTimer !== null) {
    pauseDemo();
    $('playDemo').textContent = '▶ Tiếp tục';
    $('statusText').textContent = 'Đã tạm dừng mô phỏng';
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && demoTimer !== null) {
    pauseDemo();
    $('playDemo').textContent = '▶ Tiếp tục';
    $('statusText').textContent = 'Đã tạm dừng mô phỏng';
  }
});
$('demoTab').addEventListener('click', () => setMode('demo'));
$('liveTab').addEventListener('click', () => setMode('live'));
$('playDemo').addEventListener('click', () => {
  $('playDemo').disabled = true;
  $('stopDemo').disabled = false;
  updateDemoResult();
  demoTimer = requestAnimationFrame(advanceDemo);
  $('demoScene').focus({preventScroll: true});
});
$('stopDemo').addEventListener('click', () => {
  pauseDemo();
  $('playDemo').textContent = '▶ Tiếp tục';
  $('statusText').textContent = `Đã dừng minh họa · Bước ${demoStep}/3`;
});
$('resetDemo').addEventListener('click', resetDemo);
async function refreshDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) return;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const selected = $('cameraSelect').value;
    $('cameraSelect').replaceChildren(new Option('Webcam mặc định', ''));
    devices.filter(d => d.kind === 'videoinput').forEach((device, i) => {
      if (device.deviceId) $('cameraSelect').add(new Option(device.label || `Webcam ${i + 1}`, device.deviceId));
    });
    if (Array.from($('cameraSelect').options).some(o => o.value === selected)) $('cameraSelect').value = selected;
  } catch { /* A default camera remains available if device enumeration is restricted. */ }
}
async function startCamera() {
  stopStream();
  uploadRequest++;
  releaseImage();
  $('placeholder').hidden = false;
  $('alertBtn').disabled = true;
  $('startCamera').disabled = true;
  result('Đang kết nối webcam', 'Cho phép trình duyệt truy cập camera để hiển thị hình ảnh.', 'Đang chờ quyền camera');
  $('clock').textContent = 'ĐANG KẾT NỐI';
  const request = ++cameraRequest;
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
    const deviceId = $('cameraSelect').value;
    const acquired = await navigator.mediaDevices.getUserMedia({video: deviceId ? {deviceId: {exact: deviceId}} : true, audio: false});
    if (request !== cameraRequest || mode !== 'live') {
      acquired.getTracks().forEach(track => track.stop());
      return;
    }
    stream = acquired;
    $('video').srcObject = stream;
    $('video').hidden = false;
    $('placeholder').hidden = true;
    $('stopCamera').disabled = false;
    $('alertBtn').disabled = false;
    $('startCamera').disabled = false;
    $('clock').textContent = now();
    result('Webcam đã kết nối', 'Bạn đang xem hình ảnh trực tiếp. Chưa có mô hình phân tích; ghi chú chỉ là quan sát thủ công.', 'Webcam đang hoạt động · Chưa có AI');
    acquired.getVideoTracks()[0].addEventListener('ended', () => {
      if (stream !== acquired) return;
      stopStream();
      $('placeholder').hidden = false;
      $('alertBtn').disabled = true;
      $('clock').textContent = 'CAMERA ĐÃ NGẮT';
      result('Camera đã ngắt kết nối', 'Kiểm tra thiết bị hoặc cấp lại quyền rồi bật webcam.', 'Không có nguồn hình ảnh');
    });
    await refreshDevices();
  } catch (error) {
    if (request !== cameraRequest) return;
    $('startCamera').disabled = false;
    const message = error.name === 'NotAllowedError' ? 'Camera chưa được cấp quyền. Cho phép camera trong cài đặt trình duyệt rồi thử lại.' : error.name === 'NotFoundError' ? 'Không tìm thấy webcam. Kết nối camera hoặc tải ảnh để trải nghiệm.' : error.name === 'NotReadableError' ? 'Camera đang bận hoặc không thể truy cập. Đóng ứng dụng đang sử dụng camera rồi thử lại.' : 'Không thể mở camera. Kiểm tra thiết bị, quyền truy cập và kết nối HTTPS.';
    $('clock').textContent = 'CAMERA CHƯA KẾT NỐI';
    result('Chưa mở được webcam', message, 'Camera chưa kết nối');
    toast(message);
  }
}
$('startCamera').addEventListener('click', startCamera);
$('cameraSelect').addEventListener('change', () => { if (stream) startCamera(); });
$('stopCamera').addEventListener('click', () => {
  stopStream();
  $('placeholder').hidden = false;
  $('alertBtn').disabled = true;
  $('clock').textContent = 'CAMERA ĐÃ DỪNG';
  result('Camera đã dừng', 'Bật lại webcam hoặc chọn ảnh để tiếp tục xem trước.', 'Không có nguồn hình ảnh');
});
$('uploadBtn').addEventListener('click', () => $('fileInput').click());
$('fileInput').addEventListener('change', async event => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  if (!file.type.startsWith('image/')) { toast('Vui lòng chọn một tệp hình ảnh.'); return; }
  if (file.size > 20 * 1024 * 1024) { toast('Vui lòng chọn ảnh nhỏ hơn 20 MB để xem trước mượt hơn.'); return; }
  const request = ++uploadRequest;
  const url = URL.createObjectURL(file);
  const preview = new Image();
  try {
    preview.src = url;
    await preview.decode();
    if (request !== uploadRequest || mode !== 'live') { URL.revokeObjectURL(url); return; }
    stopStream();
    releaseImage();
    imageUrl = url;
    $('uploadedImage').src = url;
    $('uploadedImage').hidden = false;
    $('placeholder').hidden = true;
    $('alertBtn').disabled = false;
    $('clock').textContent = 'ẢNH ĐÃ TẢI · ' + now();
    checks++;
    updateStats();
    result('Ảnh đã sẵn sàng xem trước', 'Ảnh được hiển thị trên thiết bị của bạn, chưa phân tích bằng AI. Không có kết quả nhận diện hay độ tin cậy.', 'Đã tải ảnh · Chưa có AI');
    addEvent('Đã tải ảnh để xem trước', 'Chưa phân tích AI; không phải phát hiện rác.');
    toast('Đã tải ảnh. Chưa chạy mô hình AI.');
  } catch {
    URL.revokeObjectURL(url);
    if (request === uploadRequest) toast('Không đọc được ảnh này. Hãy chọn ảnh JPG, PNG hoặc WebP hợp lệ.');
  }
});
function updateStats() {
  $('validCount').textContent = checks;
  $('alertCount').textContent = notes;
}
function addEvent(title, detail) {
  events.unshift({title, detail, time: now()});
  renderEvents();
}
function renderEvents() {
  const list = $('eventList');
  list.replaceChildren();
  $('clearEvents').disabled = events.length === 0;
  if (!events.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'Chưa có hoạt động trong nhật ký.';
    list.append(p);
    return;
  }
  events.forEach(event => {
    const row = document.createElement('div');
    row.className = 'event';
    const title = document.createElement('strong');
    title.textContent = event.title;
    const detail = document.createElement('small');
    detail.textContent = `${event.detail} · ${event.time}`;
    row.append(title, detail);
    list.append(row);
  });
}
$('alertBtn').addEventListener('click', () => {
  if (mode !== 'live' || (!stream && !imageUrl)) return;
  notes++;
  updateStats();
  addEvent('Ghi chú quan sát thủ công', `${stream ? 'Webcam' : 'Ảnh tải lên'} · Người dùng đánh dấu cần xem lại; chưa xác minh có rác.`);
  toast('Đã ghi chú quan sát trong phiên. Đây không phải cảnh báo AI.');
});
$('clearEvents').addEventListener('click', () => {
  events = [];
  renderEvents();
  toast('Đã xóa nhật ký. Các bộ đếm vẫn tính tổng thao tác trong phiên này.');
});
$('detailBtn').addEventListener('click', () => {
  const open = $('integration').hidden;
  $('integration').hidden = !open;
  $('detailBtn').setAttribute('aria-expanded', String(open));
});
setInterval(() => { if (stream) $('clock').textContent = now(); }, 1000);
window.addEventListener('pagehide', () => { pauseDemo(); stopStream(); releaseImage(); });
refreshDevices();

$('controlHint').textContent = demoHint;
resetDemo();
