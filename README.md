# K.H.M.System - Modern Hotel Management

K.H.M.System is a professional, high-performance hotel management platform built with Next.js, Firebase, and GenAI. It streamlines hotel operations from front-desk reservations to financial reporting and AI-powered insights.

## 🚀 Features

### 📊 Real-time Dashboard
- Live monitoring of occupancy rates and revenue.
- Quick view of recent reservations and active guest counts.
- Performance charts visualizing hotel health.

### 🛏️ Room Management
- Itemized room inventory with status tracking (Available, Occupied, Maintenance, Cleaning).
- Quick booking capabilities directly from the room view.
- Support for multiple room types (Standard, Deluxe, Suite, Penthouse).

### 📅 Reservation System
- Complete booking lifecycle: Pending → Confirmed → Checked In → Checked Out / Cancelled.
- **Contextual Notifications**: Automated, status-based confirmation messages for WhatsApp and Email.
- **Strict Validation**: Prevents overbooking and ensures room status integrity.

### 👥 Guest Registry
- Centralized guest database with contact details and preferences.
- **Loyalty Program**: Automatic categorization of guests (New, Silver, Gold, Diamond).
- Historical stay tracking.

### 🧾 Financials & Billing
- **Auto-Invoicing**: Invoices are generated automatically upon guest check-in.
- **Professional Layout**: Paper-style invoice previews optimized for high-quality printing.
- **Digital Billing**: One-click sharing of invoice summaries via WhatsApp.
- Revenue tracking with unpaid balance and total collection metrics.

### 🛡️ Staff Management
- Staff directory with role-based permissions (Manager, Receptionist, etc.).
- Shift scheduling and real-time status tracking (On Duty, On Break).
- Direct communication via WhatsApp integration.

### 🧠 AI Insights (Genkit)
- **Occupancy Forecasting**: Predicts future demand based on historical data and upcoming local events using Google's Gemini models via Genkit.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/)
- **Database & Auth**: [Firebase](https://firebase.google.com/) (Firestore, Auth)
- **AI**: [Genkit](https://github.com/firebase/genkit) (Google Gemini 2.5)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Recharts](https://recharts.org/)

## 🏁 Getting Started

### Prerequisites
- Node.js 20+
- A Firebase Project

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/maga1234-0/k.h.m.system.git
   cd k.h.m.system
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Environment Setup:
   Create a `.env` file with your Firebase and Google AI credentials:
   ```env
   GOOGLE_GENAI_API_KEY=your_api_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

## 📄 License

Proprietary system of K.H.M.System Group. All rights reserved.