
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// ============================================
// จุดเริ่มต้นของโปรแกรม (Entry Point)
// ============================================

// 1. ค้นหา Element ที่มี id="root" ในไฟล์ index.html
const rootElement = document.getElementById('root');

// ตรวจสอบว่าเจอหรือไม่ (กัน Error)
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// 2. สร้าง Root สำหรับ React และเริ่มการทำงาน (Render)
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {/* เรียกใช้ Component หลักชื่อ App ที่เป็นหัวใจของเว็บ */}
    <App />
  </React.StrictMode>
);

// ============================================
// Auto-reload เมื่อมี version ใหม่ (ไม่ต้องกด Ctrl+Shift+R)
// ============================================
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then((registration) => {
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          // เมื่อ SW ใหม่พร้อมใช้งาน → reload ทันที
          if (newWorker.state === 'activated') {
            window.location.reload();
          }
        });
      }
    });

    // เช็ค update เมื่อกลับมาเปิดหน้าเว็บ (ไม่กิน request ตอนไม่ใช้งาน)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        registration.update();
      }
    });
  });
}
