# ใช้ Alpine Linux เป็นฐาน เพราะเบาและบูตเร็วมาก เหมาะกับงาน Online Judge
FROM alpine:latest

# อัปเดตและติดตั้ง GCC (C Compiler) รวมถึง musl-dev (Standard C library)
RUN apk update && \
    apk add --no-cache gcc musl-dev

# [SECURITY] สร้าง User ใหม่ที่ไม่มีสิทธิ์ Root เพื่อป้องกัน Container Escape
# หาก User ส่ง Code อันตรายมา ก็จะไม่สามารถแก้ไขไฟล์ระบบภายใน Container ได้
RUN addgroup -S judgegroup && adduser -S judgeuser -G judgegroup

# กำหนดโฟลเดอร์หลักสำหรับทำงาน
WORKDIR /app

# เปลี่ยนเจ้าของโฟลเดอร์ /app ให้เป็นของ user ที่เราสร้าง
RUN chown -R judgeuser:judgegroup /app

# สลับไปใช้ user ใหม่แทน root
USER judgeuser

# กำหนดคำสั่งพื้นฐาน (สามารถ override ได้ตอนสั่ง docker run)
CMD ["/bin/sh"]