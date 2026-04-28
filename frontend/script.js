const editor = document.getElementById('editor');
const stdinEl = document.getElementById('stdin');
const consoleEl = document.getElementById('console');
const statusBadge = document.getElementById('statusBadge');
const runBtn = document.getElementById('runBtn');
const submitBtn = document.getElementById('submitBtn');
const sampleBtn = document.getElementById('sampleBtn');
const clearBtn = document.getElementById('clearBtn');
const themeToggle = document.getElementById('themeToggle');

const sampleCode = `#include <stdio.h>

int main() {
  int a, b;
  if (scanf("%d %d", &a, &b) == 2) {
    printf("%d\\n", a + b);
  }
  return 0;
}
`;

function setStatus(text, tone = 'neutral') {
  const tones = {
    neutral: 'bg-slate-100 text-slate-600',
    loading: 'bg-amber-100 text-amber-700',
    success: 'bg-emerald-100 text-emerald-700',
    error: 'bg-rose-100 text-rose-700',
  };
  statusBadge.className = `px-2.5 py-1 rounded-md text-sm ${tones[tone] || tones.neutral}`;
  statusBadge.textContent = text;
}

function fillSample() {
  editor.value = sampleCode;
  stdinEl.value = '1 2';
  consoleEl.textContent = '';
}

async function requestJSON(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.details || data.error || 'Request failed');
  }
  return data;
}

async function runCode() {
  const code = editor.value.trim();
  const input = stdinEl.value;

  if (!code) {
    setStatus('กรุณาใส่โค้ดก่อนรัน', 'error');
    consoleEl.textContent = 'ยังไม่มีโค้ด';
    return;
  }

  runBtn.disabled = true;
  submitBtn.disabled = true;
  setStatus('กำลังรัน...', 'loading');
  consoleEl.textContent = '';

  try {
    const result = await requestJSON('/api/run', { language: 'C', code, input });
    consoleEl.textContent = result.output || '(ไม่มี output)';
    setStatus('รันสำเร็จ', 'success');
  } catch (error) {
    consoleEl.textContent = String(error.message || error);
    setStatus('รันไม่สำเร็จ', 'error');
  } finally {
    runBtn.disabled = false;
    submitBtn.disabled = false;
  }
}

async function submitCode() {
  const code = editor.value.trim();

  if (!code) {
    setStatus('กรุณาใส่โค้ดก่อนส่ง', 'error');
    consoleEl.textContent = 'ยังไม่มีโค้ด';
    return;
  }

  runBtn.disabled = true;
  submitBtn.disabled = true;
  setStatus('กำลังตรวจคำตอบ...', 'loading');
  consoleEl.textContent = '';

  try {
    const result = await requestJSON('/api/submit', {
      language: 'C',
      problemId: 0,
      code,
    });

    if (result.status === 'Accepted') {
      consoleEl.textContent = `Accepted (${result.executionTime})`;
      setStatus('ผ่านทุกเคส', 'success');
    } else {
      const detail = result.details || `Expected: ${result.expected || '-'} | Got: ${result.got || '-'}`;
      consoleEl.textContent = `${result.status}\n${detail}`;
      setStatus('ไม่ผ่าน', 'error');
    }
  } catch (error) {
    consoleEl.textContent = String(error.message || error);
    setStatus('ส่งไม่สำเร็จ', 'error');
  } finally {
    runBtn.disabled = false;
    submitBtn.disabled = false;
  }
}

function clearAll() {
  editor.value = '';
  stdinEl.value = '';
  consoleEl.textContent = '';
  setStatus('พร้อมใช้งาน', 'neutral');
}

function toggleTheme() {
  const body = document.body;
  body.classList.toggle('bg-slate-950');
  body.classList.toggle('text-slate-100');
}

runBtn.addEventListener('click', runCode);
submitBtn.addEventListener('click', submitCode);
sampleBtn.addEventListener('click', fillSample);
clearBtn.addEventListener('click', clearAll);
themeToggle.addEventListener('click', toggleTheme);

fillSample();
setStatus('พร้อมใช้งาน', 'neutral');
