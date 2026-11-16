# ⏱️ Worksite Punch Clock & Attendance Mobile App

A modern cross-platform mobile application (React Native / Expo) designed for companies to manage employee shift attendance, worksite photo verification, real-time live staff monitoring, and one-tap export of formatted Excel (`.xlsx`) and CSV sheets.

---

## 🌟 Key Features

### 👷 1. Employee Mobile Portal (BYOD / Personal Phone)
- **Quick 4-Digit PIN Access**: Secure and frictionless login for each worker.
- **Mandatory Worksite Photo Verification**: Employees must snap a quick site selfie / worksite proof photo when punching in and out.
- **GPS Coordinates & Timestamp Logging**: Records exact location coordinates and time of punch to verify employees are physically on site.
- **Live Active Shift Counter**: Displays real-time ticking duration (`04h : 22m : 15s`) while clocked in.
- **Personal Punch History**: View recent shifts, daily total hours, and photo thumbnails.
- **Optional Shift Notes**: Add notes when starting or ending shifts (e.g., "Arrived at Site B", "Taking lunch").

### 👔 2. Master Boss Dashboard
- **Live Staff Monitoring**: Real-time overview of who is currently working on site, who is clocked out, and when each worker clocked in.
- **Worksite Photo Inspection Audit**: Tap on any employee or punch log to inspect full-screen worksite proof photos with embedded timestamps and GPS coordinates.
- **Daily Hours & Overtime Aggregation**: Automatically calculates total shift hours and highlights overtime (>8 hours/day).
- **One-Tap Spreadsheet Export**:
  - **Excel (`.xlsx`)**: Generates a professional multi-sheet workbook including a **Daily Attendance Summary** sheet and a **Detailed Punch Audit Log** sheet.
  - **CSV Export**: Standard CSV file ready for import into payroll software.
  - **Native Sharing**: Directly share the file via WhatsApp, Email, or save to Google Drive/Files via the native device share sheet.
- **Staff Filter**: Filter punch records by date or individual employee.

---

## 🚀 Quickstart & Testing

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Test Suites
```bash
npm test
```
All unit test suites verify:
- Shift duration and overtime calculation engine
- Event-based multi-punch logic (morning shift, lunch break, afternoon shift)
- Excel (`.xlsx`) and CSV spreadsheet generation
- Local storage and offline queueing
- Role-based authentication

### 3. Start the Mobile App (Expo)
```bash
npx expo start
```
- **On Physical Mobile Devices (iOS & Android)**:
  1. Install the free **Expo Go** app from the App Store or Google Play.
  2. Scan the terminal's QR code with your phone camera (iOS) or inside the Expo Go app (Android).
- **On Web Browser**:
  Press `w` in the terminal to preview the app instantly in your web browser!

---

## 🔑 Demo Login Credentials

The app comes pre-seeded with instant demo accounts:

### Master Boss Account
- **Role**: Executive Boss / Administrator
- **Login Tab**: Master Boss Portal
- **Email**: `boss@company.com`
- **Master PIN / Password**: `9999` (or `admin123`)
- **Quick Action**: Tap the *"Tap to Sign In as Boss"* chip on the login screen for 1-tap instant access.

### Employee Accounts
- **Alice Johnson**: PIN `1001` (Site Engineering)
- **Bob Martinez**: PIN `1002` (Heavy Equipment)
- **Carlos Diaz**: PIN `1003` (Safety & Logistics)
- **Company Code**: `CORP100`

---

## 📊 Exported Spreadsheet Columns

When the Boss exports the attendance sheet, the resulting file contains:
| Column | Description |
| :--- | :--- |
| **Employee ID** | Unique staff identifier (e.g. `emp_1`) |
| **Employee Name** | Worker's full name |
| **Department** | Assigned business unit |
| **Date** | YYYY-MM-DD |
| **First In** | Initial punch-in time |
| **Last Out** | Final punch-out time |
| **Total Hours** | Net hours worked |
| **Overtime (Hrs)** | Hours exceeding 8 hours/day |
| **Photo Verified** | Confirmation of worksite photo capture |
| **Status** | Clocked In (Active) vs Completed |
| **Notes** | Worker shift comments / site notes |

---

## 🌐 Optional Multi-Device Sync Server

For synchronizing attendance data in real time between multiple physical phones across the internet:
```bash
npm run server
```
Runs a lightweight REST API at `http://localhost:4000` with `/api/punches` and `/api/employees` endpoints.
