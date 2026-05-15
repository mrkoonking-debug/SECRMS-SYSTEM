# 💾 คู่มือ Git & GitHub — บันทึก ย้อนกลับ และสำรองโค้ด

**Git** คือระบบบันทึกประวัติโค้ด เหมือนกด "Save Checkpoint" ในเกม — ถ้าแก้แล้วพังสามารถย้อนกลับได้ทุกเมื่อ
**GitHub** คือ Cloud ที่เก็บโค้ดไว้อย่างปลอดภัย สามารถสลับทำงานหลายเครื่องได้

> ✅ **Repo นี้เป็น Private** — มีแค่เจ้าของ (คุณ) เท่านั้นที่เห็นและแก้ไขได้

---

## 🖥️ ตั้งค่าเครื่องใหม่ (ทำครั้งเดียวต่อเครื่อง)

เวลาย้ายเครื่อง หรือลงวินโดวส์ใหม่ ให้ทำตามนี้ทีละขั้นตอน:

### ขั้นที่ 1: ดาวน์โหลดและติดตั้งโปรแกรม 3 ตัว

| ลำดับ | โปรแกรม | ลิงก์ดาวน์โหลด | หมายเหตุ |
| :---: | :--- | :--- | :--- |
| 1 | **Node.js** | [nodejs.org](https://nodejs.org) | เลือก **LTS** (ปุ่มสีเขียว) → Next ไปเรื่อยๆ จนเสร็จ |
| 2 | **Git** | [git-scm.com](https://git-scm.com/download/win) | กด Download → Next ไปเรื่อยๆ ค่าเริ่มต้นใช้ได้เลย |
| 3 | **VS Code** | [code.visualstudio.com](https://code.visualstudio.com) | กด Download → ติดตั้งตามปกติ |

> 💡 ติดตั้ง **Node.js กับ Git ก่อน** แล้วค่อยเปิด VS Code

---

### ขั้นที่ 2: เปิด VS Code แล้ว Login GitHub

1. เปิด **VS Code**
2. กดที่ **ไอคอนคน** (มุมล่างซ้าย) → **Sign in to Sync Settings...**
3. เลือก **Sign in with GitHub**
4. เบราว์เซอร์จะเปิดขึ้น → กด **Authorize** → กลับมาที่ VS Code

> ⚠️ ต้อง Login ด้วย GitHub Account เดียวกับที่เป็นเจ้าของ repo (`mrkoonking-debug`) เพราะ repo เป็น Private

---

### ขั้นที่ 3: Clone โปรเจคลงเครื่อง

1. ใน VS Code กด `` Ctrl+` `` (backtick) เพื่อเปิด Terminal
2. พิมพ์คำสั่งนี้:

```bash
cd Desktop
git clone https://github.com/mrkoonking-debug/secrmssystem.git
```

3. **ครั้งแรก** จะมีหน้าต่างขึ้นมาถาม Login:
   - ถ้าขึ้นหน้าเบราว์เซอร์ → กด **Authorize Git Credential Manager**
   - ถ้าขึ้น popup → ใส่ Username (`mrkoonking-debug`) + Password (ใช้ **Personal Access Token** แทนรหัสผ่าน ดูวิธีสร้างด้านล่าง)

4. รอจนเสร็จ แล้วเปิดโฟลเดอร์:
   - ใน VS Code กด **File → Open Folder** → เลือกโฟลเดอร์ `secrmssystem` ที่อยู่บน Desktop

---

### ขั้นที่ 4: ติดตั้ง Dependencies แล้วทดสอบ

เปิด Terminal ใน VS Code แล้วรันทีละบรรทัด:

```bash
npm install
npm run dev
```

- ถ้าขึ้นลิงก์ `http://localhost:5173` แปลว่า **สำเร็จ!** 🎉
- กด `Ctrl+C` เพื่อหยุด dev server

---

### ขั้นที่ 5: ตั้งชื่อ Git (ครั้งแรกเท่านั้น)

```bash
git config --global user.name "mrkoonking-debug"
git config --global user.email "mrkoonking@gmail.com"
```

> ทำครั้งเดียวต่อเครื่อง ครั้งต่อไปไม่ต้องทำอีก

---

## 🔑 วิธีสร้าง Personal Access Token (PAT)

ถ้า GitHub ถามรหัสผ่านตอน clone/push แต่ใส่รหัสผ่านปกติแล้วไม่ผ่าน ให้สร้าง PAT:

1. เปิด [github.com/settings/tokens](https://github.com/settings/tokens)
2. กด **Generate new token** → เลือก **Classic**
3. ตั้งค่า:
   - **Note:** ใส่ชื่อเครื่อง เช่น `SEC-PC-Office`
   - **Expiration:** เลือก `No expiration` (ไม่หมดอายุ)
   - **Scopes:** ✅ ติ๊ก `repo` (อันแรกสุด)
4. กด **Generate token** → **Copy token เก็บไว้!** (จะเห็นแค่ครั้งเดียว)
5. ตอน push/clone ถามรหัสผ่าน → วาง token นี้แทน

> 💡 **เก็บ token ไว้ใน Notes มือถือ** เผื่อต้องใช้อีก

---

## 💡 แนวคิดสำคัญ

```
โค้ดในเครื่อง (Working Directory)
    ↓  git add -A          ← เลือกไฟล์ที่อยากบันทึก
Staging Area
    ↓  git commit -m "..."  ← บันทึก Checkpoint ในเครื่อง
Git History (ในเครื่อง)
    ↓  git push             ← ดันขึ้น GitHub (Cloud)
GitHub (Cloud)
```

---

## 🟢 1. บันทึก Checkpoint (ทำบ่อยๆ)

**ทำทุกครั้งก่อนให้ AI แก้โค้ด หรือหลังจากแก้เสร็จทดสอบว่า OK**

```bash
git add -A && git commit -m "ข้อความอธิบายสิ่งที่ทำ"
```

ตัวอย่าง:
```bash
git add -A && git commit -m "แก้หน้าค้นหา + เพิ่ม validation"
```

---

## 🔄 2. กฎทองสำหรับสลับเครื่อง

> จำง่ายๆ: **"ดึงก่อนเริ่ม ดันก่อนเลิก"**

### 🟢 ก่อนเริ่มงาน — ดึงโค้ดล่าสุด
```bash
git pull
```

### 🔴 เลิกงาน — เซฟและดันขึ้น
```bash
git add -A
git commit -m "อัปเดต: [สิ่งที่ทำ]"
git push
```

> 💡 **วัฏจักร:** เปิดคอม → `git pull` → ทำงาน → `git add -A && git commit -m "..." && git push` → ปิดคอม

---

## 🔍 3. ดูประวัติ Checkpoint

```bash
git log --oneline
```

ผลลัพธ์:
```
7fad46b (HEAD -> main) refactor: cleanup unused files
74d03c0 fix: แก้หน้า Dashboard
03b0581 feat: เพิ่มระบบ validation
```

---

## ⏪ 4. ย้อนกลับโค้ด

### แก้ไปแล้วแต่ยังไม่ commit — อยากยกเลิกทั้งหมด
```bash
git restore .
```
> ⚠️ อันตราย: ลบการแก้ไขทั้งหมดกลับเป็น commit ล่าสุด ไม่สามารถกู้คืนได้

### ย้อนกลับแค่ไฟล์เดียว
```bash
git checkout 74d03c0 -- pages/CustomerStatus.tsx
git add -A && git commit -m "revert: คืน CustomerStatus.tsx"
```

### ย้อนกลับทั้งโปรเจกต์ (ระวัง!)
```bash
git log --oneline            # ดู ID ก่อน
git reset --soft 74d03c0     # ย้อน เก็บไฟล์ไว้
git reset --hard 74d03c0     # ย้อน + ลบทิ้งหมดเลย ⛔
```

---

## 🏷️ 5. ตั้ง Tag (Bookmark version สำคัญ)

```bash
git tag v1.0 -m "Version แรกที่ใช้งานจริง"
git tag                      # ดู Tag ทั้งหมด
git checkout v1.0            # ย้อนกลับไปที่ Tag
```

---

## 📋 คำสั่งสรุป

| คำสั่ง | หน้าที่ |
| :--- | :--- |
| `git status` | ดูไฟล์ที่เปลี่ยนแปลง |
| `git log --oneline` | ดูประวัติ Checkpoint |
| `git add -A` | เพิ่มทุกไฟล์เข้า Staging |
| `git commit -m "..."` | บันทึก Checkpoint |
| `git push` | ดันขึ้น GitHub |
| `git pull` | ดึงล่าสุดจาก GitHub |
| `git restore .` | ยกเลิกการแก้ไข (ก่อน commit) |
| `git checkout ID -- file` | คืนไฟล์เดียวจาก checkpoint |
| `git reset --hard ID` | ย้อนทั้งโปรเจกต์ (อันตราย!) |
| `git tag v1.0` | ตั้ง bookmark version |

---

## ❓ แก้ปัญหาที่พบบ่อย

| ปัญหา | วิธีแก้ |
| :--- | :--- |
| `git clone` แล้ว error 404 หรือ not found | ต้อง Login GitHub ก่อน เพราะ repo เป็น Private |
| push แล้วถามรหัสผ่านแต่ใส่แล้วไม่ผ่าน | ใช้ **Personal Access Token** แทนรหัสผ่าน (ดูหัวข้อ PAT ด้านบน) |
| `npm install` error | ลบโฟลเดอร์ `node_modules` แล้วรัน `npm install` ใหม่ |
| `npm run dev` ไม่ขึ้น | ตรวจสอบว่าติดตั้ง Node.js แล้ว → รัน `node -v` ดู |
| `git push` ขึ้น rejected | รัน `git pull` ก่อน แล้ว `git push` อีกที |
| เปิด VS Code แล้วไม่เห็น Terminal | กด `` Ctrl+` `` หรือ ไปที่เมนู View → Terminal |

---

## 📝 เช็คลิสต์ย้ายเครื่อง (ปริ้นติดโต๊ะได้)

```
□ 1. ลง Node.js (nodejs.org → LTS)
□ 2. ลง Git (git-scm.com)
□ 3. ลง VS Code (code.visualstudio.com)
□ 4. เปิด VS Code → Login GitHub (ไอคอนคนมุมล่างซ้าย)
□ 5. เปิด Terminal → git clone https://github.com/mrkoonking-debug/secrmssystem.git
□ 6. File → Open Folder → เลือก secrmssystem
□ 7. Terminal → npm install
□ 8. Terminal → npm run dev → ทดสอบว่าเว็บขึ้น
□ 9. ตั้งชื่อ Git:
      git config --global user.name "mrkoonking-debug"
      git config --global user.email "mrkoonking@gmail.com"
□ 10. เสร็จ! พร้อมทำงาน ✅
```

---

*อัปเดตล่าสุด พฤษภาคม 2026*
