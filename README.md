# Process Ninja

A full-stack web application for creating and managing customizable workflows, dynamic forms, approval processes, and audit trails.

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript
- **UI:** Tailwind CSS + Shadcn UI
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth.js (credentials provider)

## Features

- **Workflow Builder:** Create custom workflows with multiple step types (Form, Approval, Notification)
- **Dynamic Forms:** Build forms with various field types (text, number, date, dropdown, textarea, currency, file)
- **Process Execution:** Start and track processes through workflow steps
- **Approval System:** Approve, reject, or request changes on pending items
- **Notifications:** Real-time notification system for process updates
- **Audit Log:** Complete audit trail of all system actions
- **Reports:** Generate and export CSV reports with filters
- **Role-based Access:** Admin, Approver, and User roles

## Prerequisites

- Node.js 18+
- PostgreSQL database

## Getting Started

### 1. Clone and Install

```bash
git clone <repository-url>
cd process-ninja
npm install
```

### 2. Environment Variables

Create a `.env` file based on `.env.example`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/process_ninja"
NEXTAUTH_SECRET="your-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
AUTH_SECRET="your-secret-key-change-in-production"
```

### 3. Database Setup

```bash
# Push schema to database
npm run db:push

# Seed with demo users
npm run db:seed
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | admin123 |
| Approver | approver@example.com | approver123 |
| User | user@example.com | user123 |

## Project Structure

```
├── app/
│   ├── (dashboard)/       # Dashboard layout group
│   │   ├── dashboard/     # Main dashboard
│   │   ├── workflows/     # Workflow management
│   │   ├── processes/     # Process execution
│   │   ├── notifications/ # Notifications
│   │   ├── audit/         # Audit logs
│   │   └── reports/       # Reports & exports
│   ├── api/               # API routes
│   └── auth/              # Auth pages
├── components/
│   ├── ui/                # Shadcn components
│   ├── layout/            # Navigation components
│   ├── workflow/          # Workflow builder
│   ├── form/              # Dynamic form components
│   ├── process/           # Process components
│   └── notifications/     # Notification components
├── lib/
│   ├── auth.ts            # NextAuth config
│   ├── db.ts              # Prisma client
│   ├── audit.ts           # Audit logging
│   └── notifications.ts   # Notification helpers
└── prisma/
    ├── schema.prisma      # Database schema
    └── seed.ts            # Seed script
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio |

## Usage Guide

### Creating a Workflow

1. Navigate to **Workflows** > **Create Workflow**
2. Enter workflow name and description
3. Add steps (Form, Approval, Notification)
4. Design the form fields in the Form Builder tab
5. Save and Activate the workflow

### Starting a Process

1. Go to **Processes** > **New Process**
2. Select an active workflow
3. Fill out the form
4. Submit the request

### Approving Requests

1. Admins and Approvers see pending items on the Dashboard
2. Click on a process to view details
3. Use Approve, Reject, or Request Changes buttons
4. Add optional comments

### Viewing Reports

1. Go to **Reports**
2. Apply filters (workflow, status, date range, approver)
3. Click **Export to CSV** to download

## License

MIT
