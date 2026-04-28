// เก็บค่า id ของโจทย์ปัจจุบันไว้ เพื่อส่งไปให้ backend ตรวจถูกข้อ
let currentProblemIndex = 0;

const problems = [
  {
    title: 'ตัดเกรดstruct pro',
    statement: 'เเจกF',
    input: '1 2',
    output: '3'
  },

];

function loadProblem(i) {
  currentProblemIndex = i;
  const p = problems[i];
  document.getElementById('probTitle').textContent = p.title;
  document.getElementById('probStatement').textContent = p.statement;
  document.getElementById('probInput').textContent = p.input;
  document.getElementById('probOutput').textContent = p.output;
  document.getElementById('editor').value = sampleStarter(document.getElementById('lang').value);
  document.getElementById('console').textContent = '';
}

function sampleStarter(lang) {
  if (lang === 'Python') return 'a,b = map(int, input().split())\nprint(a+b)';
  if (lang === 'JavaScript') return 'const fs = require("fs");\nconst data = "1 2".trim().split(/\\s+/).map(Number);\nconsole.log(data[0] + data[1]);';
  return '// ใส่โค้ด C/C++ ที่นี่\n#include <stdio.h>\n\nint main() {\n    return 0;\n}';
}

// ---------------------------------------------------------
// 1. ปุ่มรัน (ทดสอบกับ Input ตัวอย่าง)
// ---------------------------------------------------------
document.getElementById('runBtn').addEventListener('click', async () => {
  const lang = document.getElementById('lang').value;
  const code = document.getElementById('editor').value;
  const consoleEl = document.getElementById('console');
  
  // ดึง Input จากหน้าเว็บส่งไปเทสต์
  const sampleInput = document.getElementById('probInput').textContent; 

  consoleEl.textContent = 'กำลังรันโค้ด... (รอสักครู่)';

  try {
    // แก้ URL เป็น Backend ของคุณ (เช่น http://localhost:3000/api/run)
    const response = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code, language: lang, input: sampleInput })
    });
    
    const result = await response.json();
    consoleEl.textContent = `ผลลัพธ์ที่ได้:\n${result.output || result.error}`;
  } catch (err) {
    consoleEl.textContent = '❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้';
  }
});

// ---------------------------------------------------------
// 2. ปุ่มส่ง (ส่งไปตรวจกับ Test Cases ลับทั้งหมด)
// ---------------------------------------------------------
document.getElementById('submitBtn').addEventListener('click', async () => {
  const lang = document.getElementById('lang').value;
  const code = document.getElementById('editor').value;
  const consoleEl = document.getElementById('console');
  
  consoleEl.textContent = 'กำลังส่งโค้ดไปตรวจ...';

  try {
    // แก้ URL เป็น Backend ของคุณ
    const response = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        problemId: currentProblemIndex, // ส่ง ID ไปให้ Backend รู้ว่าต้องตรวจข้อไหน
        code: code, 
        language: lang 
      })
    });
    
    const result = await response.json();
    
    // สมมติว่า Backend ตอบกลับมาเป็น { status: 'Accepted', executionTime: '12ms' }
    if (result.status === 'Accepted') {
      consoleEl.textContent = `✅ ผ่าน! สถานะ: ${result.status} (เวลา: ${result.executionTime})`;
    } else {
      consoleEl.textContent = `❌ ไม่ผ่าน! สถานะ: ${result.status}\nรายละเอียด: ${result.details || ''}`;
    }
  } catch (err) {
    consoleEl.textContent = '❌ เกิดข้อผิดพลาดในการส่งข้อมูล';
  }
});

document.getElementById('resetBtn').addEventListener('click', () => {
  document.getElementById('editor').value = sampleStarter(document.getElementById('lang').value);
  document.getElementById('console').textContent = '';
});

document.getElementById('lang').addEventListener('change', (e) => {
  document.getElementById('editor').value = sampleStarter(e.target.value);
});

function copyLink() {
  navigator.clipboard.writeText(location.href).then(() => alert('ลิงก์คัดลอกแล้ว'));
}

loadProblem(0);

// Dark mode toggle
const darkToggle = document.getElementById('darkToggle');
darkToggle.addEventListener('click', () => {
  document.documentElement.classList.toggle('dark');
  document.body.classList.toggle('bg-gray-900');
  document.body.classList.toggle('text-white');
});

// ---------------------------------------------------------
// 3. Login Section
// ---------------------------------------------------------
// สำหรับระบบ Authentication แนะนำให้ใช้เครื่องมืออย่าง Supabase
// เพราะจัดการเรื่อง Auth และ Session บน Client-side ได้ง่ายมาก
/*
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'
const supabase = createClient(supabaseUrl, supabaseKey)

async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  })
  if (error) console.error("Login failed:", error)
  else console.log("Logged in!", data)
}
*/