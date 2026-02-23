# 🏪 ShopManager - Multi-Tenant POS & Business Management System

A production-grade, full-stack Point of Sale (POS) and business management system built for the Lingo.dev hackathon. Built with Next.js 14, TypeScript, Supabase, and shadcn/ui.

## 🎯 Features

### 🔐 **Multi-Tenant Architecture**
- Each shop gets isolated, secure data
- Shop owner registration and management
- Role-based access control (Admin, Cashier, Inventory Manager)

### 🛒 **Point of Sale (POS)**
- Fast, intuitive billing interface
- Real-time product search (by name, SKU, or barcode)
- Shopping cart with quantity management
- Multiple payment methods (Cash, Card, UPI, Digital)
- Automatic stock deduction on sale
- Invoice generation

### 📦 **Inventory Management**
- Product CRUD operations with categories
- SKU and barcode support
- Stock tracking with low-stock alerts
- Stock adjustment history/audit logs
- Category management
- Bulk operations

### 📊 **Analytics & Reports**
- Real-time dashboard with key metrics
- Sales trends (daily, weekly, monthly)
- Revenue tracking and charts
- Top-selling products analysis  
- Low stock alerts
- Custom date range reports

### 🧾 **Sales Management**
- Complete sales history
- Invoice viewing and management
- Customer information tracking
- Payment method tracking
- Sale status management

### 🔒 **Security Features**
- Row Level Security (RLS) policies in Supabase
- Tenant isolation at database level
- Role-based permissions
- Secure authentication with Supabase Auth
- Protected API routes
- Middleware authentication

## 🛠️ Tech Stack

### **Frontend**
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS v4
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Charts**: Recharts
- **State Management**: Zustand
- **Date Handling**: date-fns

### **Backend**
- **BaaS**: Supabase
  - PostgreSQL Database
  - Authentication
  - Row Level Security
  - Real-time subscriptions
  - Storage (for future invoice PDFs)

### **Database**
- PostgreSQL with advanced features:
  - Triggers for automatic stock updates
  - Functions for invoice number generation
  - Comprehensive RLS policies
  - Indexes for performance
  - Audit trails

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account
- Git

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd business-management
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Supabase

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Create a new project
3. Go to **Project Settings** → **API**
4. Copy your:
   - **Project URL**
   - **anon/public key**

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Setup Database Schema

1. Go to Supabase Dashboard → **SQL Editor**
2. Create a new query
3. Copy the entire content from `supabase/schema.sql`
4. Paste and run the SQL

This will create:
- All tables (shops, products, sales, etc.)
- Row Level Security policies
- Database functions and triggers
- Indexes for performance

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 7. Create Your First Shop

1. Click **"Get Started"** or **"Register"**
2. Fill in:
   - Full Name
   - Shop Name
   - Email
   - Password
3. You'll be auto-logged in to your dashboard!

## 📁 Project Structure

```
business-management/
├── app/
│   ├── actions/          # Server actions
│   │   ├── auth.ts       # Authentication actions
│   │   ├── products.ts   # Inventory actions
│   │   ├── sales.ts      # Sales actions
│   │   └── analytics.ts  # Analytics actions
│   ├── dashboard/        # Dashboard page
│   ├── pos/              # Point of Sale page
│   ├── inventory/        # Inventory management page
│   ├── sales/            # Sales history page
│   ├── analytics/        # Analytics page
│   ├── login/            # Login page
│   ├── register/         # Registration page
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Landing page
│   └── globals.css       # Global styles
├── components/
│   ├── ui/               # shadcn/ui components
│   └── dashboard-layout.tsx  # Main dashboard layout
├── hooks/
│   └── use-auth.ts       # Authentication hooks
├── lib/
│   ├── supabase/         # Supabase clients
│   │   ├── client.ts     # Browser client
│   │   └── server.ts     # Server client
│   ├── store/            # Zustand stores
│   │   ├── cart-store.ts # POS cart state
│   │   └── shop-store.ts # Shop state
│   └── utils.ts          # Utility functions
├── types/
│   └── database.types.ts # TypeScript types
├── supabase/
│   └── schema.sql        # Database schema
├── middleware.ts         # Next.js middleware
└── package.json
```

## 🔑 Key Features Explained

### Multi-Tenancy

Each shop is completely isolated:
- Shop owners register and get their own space
- All data is filtered by `shop_id`
- RLS policies ensure data security
- Users can belong to multiple shops with different roles

### Role-Based Access Control

Three role types:
- **Admin**: Full access to everything
- **Cashier**: Can process sales, view inventory
- **Inventory Manager**: Can manage products and stock

### Database Triggers

Automatic processes:
- Stock deduction on sale creation
- Inventory logging for audit trails
- Negative stock prevention
- Auto-generated invoice numbers

### Performance Optimizations

- Database indexes on frequently queried columns
- Server-side rendering where applicable
- Optimized SQL queries
- Efficient state management with Zustand

## 📸 Screenshots

### Landing Page
Beautiful hero section with feature highlights

### Dashboard
Real-time metrics, charts, and recent sales

### POS System
Fast billing with product search and cart management

### Inventory Management
Product management with categories and stock tracking

### Analytics
Comprehensive business insights with interactive charts

## 🔐 Security

- ✅ Row Level Security (RLS) on all tables
- ✅ Server-side authentication checks
- ✅ Protected API routes
- ✅ Tenant isolation at database level
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ CSRF protection via Next.js

## 🚧 Future Enhancements

- [ ] PDF invoice generation and download
- [ ] Email invoice sending
- [ ] Multi-currency support
- [ ] Barcode scanner integration
- [ ] Customer loyalty program
- [ ] Supplier management
- [ ] Purchase orders
- [ ] Multi-location support
- [ ] Mobile app (React Native)
- [ ] Print receipt functionality
- [ ] Expense tracking
- [ ] Employee attendance
- [ ] Tax calculation automation

## 📝 License

This project was built for the Lingo.dev Hackathon (Feb 16-23, 2026)

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Powered by [Supabase](https://supabase.com/)
- UI by [shadcn/ui](https://ui.shadcn.com/)
- Icons by [Lucide](https://lucide.dev/)

## 📧 Contact

For questions or feedback, reach out via the hackathon platform.

---

**Built with ❤️ for the Lingo.dev Hackathon 🚀**
