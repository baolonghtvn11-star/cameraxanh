'use strict';
const $ = id => document.getElementById(id);
let mode = 'demo', stream = null, imageUrl = null, checks = 0, notes = 0;
let cameraRequest = 0, uploadRequest = 0, demoTimer = null, demoStep = 0;
let demoElapsed = 0, demoLastFrame = null;
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
  $('demoPerson').setAttribute('opacity', '0');
  $('demoPerson').setAttribute('transform', 'translate(250 0)');
  $('personBox').toggleAttribute('hidden', true);
  $('behaviorAlert').hidden = true;
  $('playDemo').textContent = '▶ Chạy demo';
  $('sampleObject').setAttribute('opacity', '0');
  $('demoBox').toggleAttribute('hidden', true);
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
  $('placeholder').hidden = demo;
  $('demoControls').hidden = !demo;
  $('liveControls').hidden = demo;
  $('alertBtn').disabled = true;
  $('sourceLabel').textContent = demo ? 'DỮ LIỆU MINH HỌA' : 'XEM TRƯỚC · CHƯA PHÂN TÍCH AI';
  $('clock').textContent = demo ? 'SÂN TRƯỜNG · MÔ PHỎNG' : 'CHƯA KẾT NỐI CAMERA';
  $('feedNote').textContent = demo ? 'MINH HỌA QUY TRÌNH / KHÔNG NHẬN DIỆN THỰC TẾ' : 'HÌNH ẢNH CHỈ HIỂN THỊ TRÊN TRÌNH DUYỆT · CHƯA CÓ AI';
  $('controlHint').textContent = demo ? 'Một người đi qua → thả rác → phát hiện hành vi xả rác (mô phỏng).' : 'Camera cần quyền truy cập và kết nối HTTPS. Ảnh không được gửi đến máy chủ.';
  $('resultKind').textContent = demo ? 'TRẠNG THÁI TRẢI NGHIỆM' : 'TRẠNG THÁI NGUỒN HÌNH ẢNH';
  result('Chưa có kết quả nhận diện', demo ? 'Chạy demo để xem quy trình dự kiến. Mọi bước trong demo đều là minh họa.' : 'Bật webcam hoặc tải ảnh để xem trước. Mô hình AI chưa được tích hợp.', demo ? 'Sẵn sàng chạy minh họa' : 'Camera chưa khởi động');
}
function renderDemo() {
  const t = demoElapsed / 1000;
  const x = t < 4 ? 250 + t * 45 : t < 6 ? 430 : 430 + Math.min(t - 6, 4) * 37;
  $('demoPerson').setAttribute('opacity', '1');
  $('demoPerson').setAttribute('transform', `translate(${x} 0)`);
  $('personBox').toggleAttribute('hidden', false);
  const walking = t < 4 || t > 6;
  const stride = walking ? Math.sin(t * 9) * 12 : 0;
  $('personLegs').setAttribute('d', `M-8 302L${-8 + stride} 341M8 302L${8 - stride} 341`);
  $('personArm').setAttribute('d', t >= 4 && t < 6 ? 'M12 263L34 277' : 'M12 263L25 290');
  $('sampleObject').setAttribute('opacity', '1');
  // The litter stays in the person's hand, then falls to the ground.
  const fall = Math.max(0, Math.min(1, (t - 4.5) / 1.1));
  $('sampleObject').setAttribute('transform', t < 4.5 ? `translate(${x + 30} 277)` : `translate(460 ${277 + fall * 68}) rotate(${fall * 25})`);
  $('demoBox').toggleAttribute('hidden', t < 5.6);
  $('behaviorAlert').hidden = t < 6.2;
  const step = t < 4.5 ? 1 : t < 6.2 ? 2 : 3;
  if (step !== demoStep) {
    demoStep = step;
    document.querySelectorAll('.steps li').forEach((el, i) => el.classList.toggle('active', i === step - 1));
    if (step === 1) result('01 / Nhận diện người', 'Một người đang đi qua sân trường, cầm rác trên tay. Khung xanh theo dõi người trong demo.', 'Mô phỏng · Đang theo dõi người');
    if (step === 2) result('02 / Người thả rác', 'Rác rơi khỏi tay và nằm trên sân. Camera minh họa đồng thời theo dõi người và vị trí rác.', 'Mô phỏng · Người đang thả rác');
    if (step === 3) result('03 / Phát hiện hành vi xả rác', 'Người rời đi, rác còn trên sân. Demo liên kết chuyển động thả rác với người đang được theo dõi.', 'Mô phỏng · Phát hiện xả rác');
    $('objectText').textContent = step === 1 ? '1 người · cầm rác' : '1 người + 1 vật thể rác';
    $('confidenceText').textContent = 'Không áp dụng (mô phỏng)';
    $('timeText').textContent = 'Kịch bản minh họa';
    document.querySelector('.result-card').classList.toggle('is-alert', step === 3);
  }
}
function advanceDemo(timestamp) {
  if (demoLastFrame !== null) demoElapsed += Math.min(timestamp - demoLastFrame, 100);
  demoLastFrame = timestamp;
  renderDemo();
  if (demoElapsed >= 10000) {
    pauseDemo();
    $('playDemo').textContent = '↻ Chạy lại demo';
    $('statusText').textContent = 'Hoàn tất mô phỏng · Phát hiện xả rác';
    return;
  }
  demoTimer = requestAnimationFrame(advanceDemo);
}
$('demoTab').addEventListener('click', () => setMode('demo'));
$('liveTab').addEventListener('click', () => setMode('live'));
$('playDemo').addEventListener('click', () => {
  if (demoElapsed >= 10000) resetDemo();
  $('playDemo').disabled = true;
  $('stopDemo').disabled = false;
  demoTimer = requestAnimationFrame(advanceDemo);
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
