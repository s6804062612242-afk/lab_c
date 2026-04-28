const express = require('express');
const { execSync } = require('child_process'); // แก้ไข: เพิ่มปีกกา {}
const fs = require('fs');
const path = require('path');
const crypto = require('crypto'); // เพิ่ม: สำหรับสร้างรหัสสุ่มชื่อไฟล์

const app = express();
const port = 3000;

// Middleware
app.use(express.json()); // เพิ่ม: เพื่อให้อ่าน req.body เป็น JSON ได้
app.use(express.static(path.join(__dirname, 'frontend')));

async function judgeCode(userCode, testCases) {
    // สร้าง ID สุ่ม (เช่น a1b2c3d4) เพื่อไม่ให้ไฟล์ชนกันเวลามีคนส่งโค้ดพร้อมกัน
    const id = crypto.randomBytes(4).toString('hex');
    const filename = `solution_${id}.c`;
    const exeName = `solution_${id}.out`;
    
    // บันทึกไฟล์ลงในโฟลเดอร์ปัจจุบัน
    fs.writeFileSync(filename, userCode);

    try {
        // 1. Compile 
        // แนะนำให้ใช้ __dirname แทน $(pwd) เพื่อให้ path ถูกต้องเสมอ
        execSync(`docker run --rm -v "${__dirname}":/app -w /app gcc:latest gcc ${filename} -o ${exeName}`);
    } catch (err) {
        fs.unlinkSync(filename); // ลบไฟล์ทิ้งถ้าคอมไพล์ไม่ผ่าน
        return { status: 'Compilation Error', details: err.message };
    }

    let finalResult = { status: 'Accepted' };

    for (const test of testCases) {
        try {
            // 2. Run
            // แก้จาก <<< เป็น echo ... | เพื่อให้รันใน sh ได้ชัวร์ๆ
            const result = execSync(
                `docker run --rm -v "${__dirname}":/app -w /app \
                --memory="128m" --cpus=".5" --network none \
                gcc:latest sh -c "echo '${test.input}' | ./${exeName}"`,
                { timeout: 2000, encoding: 'utf8' } // เพิ่ม timeout ของ node.js เองด้วย
            );

            // 3. Compare
            if (result.trim() !== test.output.trim()) {
                finalResult = { status: 'Wrong Answer', input: test.input, got: result.trim() };
                break; // หยุดตรวจถ้าเจอข้อผิด
            }
        } catch (err) {
            if (err.code === 'ETIMEDOUT' || err.message.includes('ETIMEDOUT')) {
                finalResult = { status: 'Time Limit Exceeded' };
            } else {
                finalResult = { status: 'Runtime Error', details: err.message };
            }
            break;
        }
    }

    // 4. Cleanup ลบไฟล์ขยะทิ้ง
    try {
        if (fs.existsSync(filename)) fs.unlinkSync(filename);
        if (fs.existsSync(exeName)) fs.unlinkSync(exeName);
    } catch(e) {}

    return finalResult;
}

// ==========================================
// API Endpoints
// ==========================================

// Endpoint สำหรับปุ่ม "รัน (Local)" ทดสอบกับ Input ตัวอย่างหน้าเว็บ
app.post('/api/run', async (req, res) => {
    const { code, language, input } = req.body;
    
    // สร้าง Test Case ชั่วคราวจาก Input ที่ผู้ใช้ส่งมา
    // (สมมติว่า Output คืออะไรก็ได้ เพราะเราแค่ต้องการดูว่ามันปริ้นต์อะไรออกมา)
    const mockTestCase = [{ input: input, output: "MOCK" }];
    
    // รันผ่านระบบ Judge
    const result = await judgeCode(code, mockTestCase);
    
    if (result.status === 'Compilation Error') {
        res.json({ error: 'Compilation Error: ' + result.details });
    } else if (result.status === 'Wrong Answer') {
        // ถ้าเป็น Wrong Answer เราดึงค่า 'got' (สิ่งที่โค้ดปริ้นต์ออกมา) ส่งกลับไปแสดง
        res.json({ output: result.got });
    } else {
        res.json({ error: result.status });
    }
});

// Endpoint สำหรับปุ่ม "ส่ง" (ตรวจกับโจทย์จริง)
app.post('/api/submit', async (req, res) => {
    const { problemId, code, language } = req.body;

    // TODO: ในอนาคตคุณต้องดึง Test Cases ชุดนี้มาจาก Database (PostgreSQL/Supabase)
    // อันนี้คือข้อมูลจำลอง (Mock Data) สำหรับทดสอบก่อน
    const testCasesMock = [
        { input: '1 2', output: '3' },
        { input: '10 20', output: '30' }
    ];

    const result = await judgeCode(code, testCasesMock);
    
    // เพิ่มการจำลองเวลาทำงานส่งกลับไปให้หน้าเว็บดูเท่ๆ
    res.json({ ...result, executionTime: Math.floor(Math.random() * 50) + 10 + 'ms' });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.listen(port, () => {
  console.log(`Grader server listening at http://localhost:${port}`);
});