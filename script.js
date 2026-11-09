const $ = (id) => document.getElementById(id);
const camera = $('camera'), stage = $('stage'), placeholder = $('placeholder');
const referenceWrap = $('referenceWrap'), reference = $('reference');
let stream = null, facingMode = 'environment', objectUrl = null;
let transform = { x: 0, y: 0, scale: 1, rotation: 0 }, drag = null;

function setStatus(text, active=false) {
  $('status').textContent = text;
  document.querySelector('.live-dot').classList.toggle('on', active);
}
async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus('Camera unavailable');
    alert('Camera access needs a modern browser and a secure connection (HTTPS or localhost).');
    return;
  }
  try {
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } }
    });
    camera.srcObject = stream;
    camera.style.display = 'block';
    placeholder.hidden = true;
    await camera.play();
    setStatus('Camera is live', true);
    $('freezeToggle').checked = false;
    camera.pause(); camera.play();
  } catch (err) {
    setStatus('Camera permission needed');
    alert('Could not start camera. Allow camera permission in your browser and try again. ' + (err.name || ''));
  }
}
function stopCamera() {
  if (stream) stream.getTracks().forEach(t => t.stop());
  stream = null; camera.srcObject = null; camera.style.display = 'none';
  placeholder.hidden = false; setStatus('Camera not started');
}
function updateTransform() {
  referenceWrap.style.transform =
    `translate(calc(-50% + ${transform.x}px), calc(-50% + ${transform.y}px)) scale(${transform.scale}) rotate(${transform.rotation}deg)`;
  reference.style.transform = $('mirrorToggle').checked ? 'scaleX(-1)' : '';
  $('size').value = Math.round(transform.scale * 100);
  $('sizeValue').textContent = `${Math.round(transform.scale * 100)}%`;
  $('rotation').value = transform.rotation;
  $('rotationValue').textContent = `${transform.rotation}°`;
}
function resetTransform() {
  transform = { x: 0, y: 0, scale: 1, rotation: 0 };
  $('opacity').value = 45; $('opacityValue').textContent = '45%';
  reference.style.opacity = .45; updateTransform();
}
$('startBtn').addEventListener('click', startCamera);
$('stopBtn').addEventListener('click', stopCamera);
$('switchCamera').addEventListener('click', async () => { facingMode = facingMode === 'environment' ? 'user' : 'environment'; if (stream) await startCamera(); });
$('imageInput').addEventListener('change', e => {
  const file = e.target.files?.[0]; if (!file) return;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file);
  reference.src = objectUrl; referenceWrap.style.display = 'block';
  $('fileName').textContent = file.name; $('fileRow').hidden = false;
  $('stageHint').textContent = 'Drag the image to position it over your paper';
  resetTransform();
});
$('removeImage').addEventListener('click', () => {
  referenceWrap.style.display = 'none'; reference.removeAttribute('src');
  $('fileRow').hidden = true; $('imageInput').value = '';
  if (objectUrl) URL.revokeObjectURL(objectUrl); objectUrl = null;
  $('stageHint').textContent = 'Upload a reference image to begin';
});
$('opacity').addEventListener('input', e => {
  const v = Number(e.target.value); reference.style.opacity = v / 100; $('opacityValue').textContent = `${v}%`;
});
$('size').addEventListener('input', e => { transform.scale = Number(e.target.value) / 100; updateTransform(); });
$('rotation').addEventListener('input', e => { transform.rotation = Number(e.target.value); updateTransform(); });
$('biggerBtn').addEventListener('click', () => { transform.scale = Math.min(2, transform.scale + .05); updateTransform(); });
$('smallerBtn').addEventListener('click', () => { transform.scale = Math.max(.25, transform.scale - .05); updateTransform(); });
$('centerBtn').addEventListener('click', () => { transform.x = 0; transform.y = 0; updateTransform(); });
$('rotateLeft').addEventListener('click', () => { transform.rotation = (transform.rotation - 15 + 360) % 360; if (transform.rotation > 180) transform.rotation -= 360; updateTransform(); });
$('resetBtn').addEventListener('click', resetTransform);
$('mirrorToggle').addEventListener('change', updateTransform);
$('flipBtn').addEventListener('click', () => { $('mirrorToggle').checked = !$('mirrorToggle').checked; updateTransform(); });
$('gridToggle').addEventListener('change', e => stage.classList.toggle('grid-on', e.target.checked));
$('freezeToggle').addEventListener('change', e => { if (!stream) { e.target.checked = false; return; } e.target.checked ? camera.pause() : camera.play(); setStatus(e.target.checked ? 'Camera paused' : 'Camera is live', !e.target.checked); });
referenceWrap.addEventListener('pointerdown', e => {
  if (!reference.src) return;
  drag = { x: e.clientX, y: e.clientY, startX: transform.x, startY: transform.y };
  referenceWrap.classList.add('dragging'); referenceWrap.setPointerCapture(e.pointerId);
});
referenceWrap.addEventListener('pointermove', e => {
  if (!drag) return;
  transform.x = drag.startX + e.clientX - drag.x;
  transform.y = drag.startY + e.clientY - drag.y;
  updateTransform();
});
function endDrag() { drag = null; referenceWrap.classList.remove('dragging'); }
referenceWrap.addEventListener('pointerup', endDrag);
referenceWrap.addEventListener('pointercancel', endDrag);
$('fullscreenBtn').addEventListener('click', () => {
  if (!document.fullscreenElement) stage.requestFullscreen?.(); else document.exitFullscreen?.();
});
function showHelp(show) { $('helpModal').hidden = !show; }
$('helpBtn').addEventListener('click', () => showHelp(true));
$('closeHelp').addEventListener('click', () => showHelp(false));
$('gotIt').addEventListener('click', () => showHelp(false));
$('helpModal').addEventListener('click', e => { if (e.target === $('helpModal')) showHelp(false); });
window.addEventListener('beforeunload', () => { if (stream) stream.getTracks().forEach(t => t.stop()); if (objectUrl) URL.revokeObjectURL(objectUrl); });
