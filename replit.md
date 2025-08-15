# Gestor Don Juarez - Sistema de Gestão Operacional

## Overview
Gestor Don Juarez is a comprehensive operational management system for Don Juarez, a Brazilian craft brewery. Initially designed for real-time monitoring of beer taps and kegs connected to ESP32 sensors, it's expanding to integrate various administrative operations previously managed via spreadsheets. The system provides a dashboard, consumption monitoring, keg management, and data export, all localized in Brazilian Portuguese with São Paulo timezone support. The vision is to streamline all brewery operations, enhancing efficiency and data-driven decision-making.

## Recent Security Updates (2025-08-12)
- **CRITICAL SECURITY FIX**: Removed insecure localStorage-based authentication that accepted any email/password combination
- **SECURE AUTHENTICATION**: Implemented proper employee-only authentication with bcrypt password hashing
- **PASSWORD ENCRYPTION**: All passwords now properly encrypted using bcrypt with salt rounds of 12
- **ACCESS CONTROL**: All API endpoints now protected with real authentication middleware
- **USER VERIFICATION**: Only employees with valid credentials can access the system
- **EMPLOYEE MANAGEMENT**: Added proper password hashing for create/update operations
- **SORTING IMPLEMENTATION**: Active employees displayed first, inactive employees shown with disabled styling

## Performance & Stability Updates (2025-08-15)
- **DOMEXCEPTION IDENTIFIED**: DOMException traced to Replit's Eruda devtools, not application code
- **SESSION MANAGEMENT**: Corrected async/await pattern in requireAuth middleware and /api/auth/user endpoint
- **WEBSOCKET OPTIMIZATION**: Implemented singleton WebSocket manager to prevent multiple connections
- **REDUCED REQUEST FREQUENCY**: Increased polling intervals (2-5s → 8-15s) to reduce browser load
- **BACKGROUND FETCH DISABLED**: Disabled refetchIntervalInBackground to prevent excessive requests
- **ROUTE ORDER FIX**: Fixed /api/products/clear-all endpoint routing conflict with /:id parameter
- **APPLICATION STABILITY**: Dashboard real-time functionality working correctly with optimized performance

## User Preferences
Preferred communication style: Simple, everyday language.
Company branding: Don Juarez (cervejaria artesanal brasileira)
Theme color: Orange (hsl(20, 90%, 48%))
Typography: Montserrat font family
Interface language: Portuguese (Brazil)
Menu structure: Simplified categorization with expandable modules
Testing contact: 33988286293 (número principal para testes de webhook WhatsApp)

## System Architecture
The system employs a client-server architecture with a React 18+ TypeScript frontend and a Node.js Express.js TypeScript backend.

### Frontend Architecture
- **Framework**: React 18+ with TypeScript
- **UI Library**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom theme variables
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Real-time Updates**: WebSocket integration
- **Build Tool**: Vite

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (ESM modules)
- **Database ORM**: Drizzle with PostgreSQL
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Authentication**: Replit Auth (OIDC-based), admin-only user management
- **Session Management**: Express sessions with PostgreSQL store
- **Real-time Communication**: WebSocket server

### Project Structure
- `client/`: React frontend application
- `server/`: Express.js backend API
- `shared/`: Shared TypeScript schemas and types
- `migrations/`: Database migration files
- `attached_assets/`: Documentation and requirements

### Key Features and Design Patterns
- **Database Schema**: Includes Users, Points of Sale, Beer Styles, Devices (ESP32), Taps, Pour Events, Keg Change Events, Sessions.
- **API Endpoints**: Authentication, webhook endpoints for hardware (pour, keg-change, heartbeat), management (CRUD for taps, POS, beer styles), reporting (historical data, CSV export), and dashboard APIs.
- **Real-time Features**: WebSocket server for live data streaming, automatic dashboard updates, real-time tap status monitoring with low-volume alerts, and live consumption statistics.
- **Data Flow**: Hardware (ESP32 + flow sensors) sends webhook data, system processes volume, broadcasts updates via WebSockets, and stores events. User authentication via Replit Auth, dashboard displays real-time data, and users can export historical data. Keg changes reset volume and update status.
- **UI/UX Decisions**: Orange theme, Montserrat font, simplified menu structure, visual timeline for history, EBC color integration for beer styles, compact dashboard layout, responsive design for various devices.
- **Business Logic**: Rules for night shifts (5 AM cutoff), comprehensive employee and role management, CO2 efficiency calculation, and robust data import/export mechanisms including intelligent CSV processing for products and historical data.

## External Dependencies

### Core Technologies
- **@neondatabase/serverless**: Serverless PostgreSQL connection
- **drizzle-orm**: Type-safe database operations
- **express**: Web server framework
- **ws**: WebSocket implementation
- **date-fns-tz**: São Paulo timezone handling
- **@tanstack/react-query**: Server state management
- **@radix-ui/react-***: Accessible UI components

### Authentication
- Employee-only authentication system using bcrypt password hashing
- Session-based authentication with in-memory storage
- Password encryption implemented for all create/update operations
- Secure login verification with proper password comparison

### Hardware Integration
- ESP32 microcontrollers with YF-S401 flow sensors.
- Webhook-based data transmission with security token validation (`x-webhook-token`).
- Supports multiple taps with unique identifiers.
- Public API for active tap numbers per unit (requires webhook token).

### Communication & Messaging
- **WhatsApp Business Cloud API (Meta/Facebook)**: Official integration for sending messages (e.g., stock count links, freelancer time tracking).
- **Evolution API (Legacy/Freelancer Time Tracking)**: Used for processing incoming WhatsApp messages (e.g., "Cheguei", "Fui") for freelancer time tracking. No token validation required for this specific webhook.

### Development Tools
- **vite**: Build tool and dev server
- **typescript**: Type checking and compilation
- **tailwindcss**: Utility-first CSS framework
- **drizzle-kit**: Database migration tool