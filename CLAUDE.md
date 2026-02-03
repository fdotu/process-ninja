# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev              # Start dev server at localhost:3000
npm run build            # Production build
npm run lint             # Run ESLint

# Database
npm run db:push          # Push Prisma schema to database
npm run db:migrate       # Run migrations
npm run db:seed          # Seed demo users (admin/approver/user @example.com)
npm run db:studio        # Open Prisma Studio GUI
npx prisma generate      # Regenerate Prisma client after schema changes
```

## Architecture

### Core Domain Model

The app is a workflow/approval system with this entity hierarchy:

1. **WorkflowTemplate** → defines a reusable workflow (DRAFT/ACTIVE/ARCHIVED)
2. **WorkflowStep** → ordered steps within a template (FORM/APPROVAL/NOTIFICATION types)
3. **FormSchema** → JSON field definitions for the workflow's form (1:1 with WorkflowTemplate)
4. **ProcessInstance** → a running instance of a workflow with form data
5. **ProcessStepInstance** → tracks status of each step for a process instance

### Authentication & Authorization

- NextAuth.js v5 (beta) with credentials provider in `lib/auth.ts`
- JWT sessions with custom `role` claim (ADMIN/APPROVER/USER)
- Session type extended in `types/next-auth.d.ts`
- Middleware (`middleware.ts`) protects all routes except `/auth/*` and `/api/auth/*`
- API routes check `session.user.role` for authorization

### Key Patterns

**API Routes** (`app/api/`):
- All use `auth()` from `lib/auth.ts` for session
- Zod schemas validate request bodies
- Return `NextResponse.json()` with appropriate status codes
- Use `Prisma.InputJsonValue` type cast for JSON fields

**Audit Logging** (`lib/audit.ts`):
- `createAuditLog()` is called after significant actions
- Non-blocking (errors are logged but don't break main flow)

**Notifications** (`lib/notifications.ts`):
- `createNotification()` for single user notifications
- `notifyApprovers()` notifies all ADMIN/APPROVER users
- `notifyProcessCreator()` for process status updates

**Dynamic Forms**:
- `FormBuilder` component for admin to define fields
- `DynamicForm` component renders form from JSON schema at runtime
- `validateFormData()` validates against field definitions

### Route Groups

- `app/(dashboard)/` - All authenticated pages share `layout.tsx` with Sidebar/Navbar
- `app/api/` - REST API endpoints
- `app/auth/` - Sign-in page (outside dashboard layout)

### Process Execution Flow

1. User selects active workflow, submits form → creates ProcessInstance + ProcessStepInstances
2. First FORM step auto-completes on submit
3. APPROVAL steps require ADMIN/APPROVER action via `/api/processes/[id]/steps/[stepId]/action`
4. Actions: approve (advance), reject (terminate), request_changes (pause)
5. NOTIFICATION steps auto-complete
6. Process completes when all steps done
