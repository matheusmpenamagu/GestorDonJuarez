# Gestor Don Juarez - Sistema de Gestão Operacional

## Overview
Gestor Don Juarez is a comprehensive operational management system for Don Juarez, a Brazilian craft brewery. Initially designed for real-time monitoring of beer taps and kegs connected to ESP32 sensors, it's expanding to integrate various administrative operations previously managed via spreadsheets. The system provides a dashboard, consumption monitoring, keg management, and data export, all localized in Brazilian Portuguese with São Paulo timezone support. The vision is to streamline all brewery operations, enhancing efficiency and data-driven decision-making.

## Recent Updates (2025-08-22)
- **UNIT ASSOCIATION TRACKING IMPLEMENTED**: Added unit_id field to labels table with foreign key reference to units table for complete multi-unit operations support
- **LABEL FORM ENHANCED**: Updated LabelForm component to include unit selection as first field in manager interface with default to Grão Pará unit
- **PUBLIC LABEL GENERATION UPDATED**: Modified PublicLabelPage to automatically save selected unit to database during label creation
- **SCHEMA VALIDATION ENHANCED**: Updated insertLabelSchema to require unitId for all new label creation operations
- **DATABASE MIGRATION COMPLETED**: Successfully added unit_id column to labels table using SQL ALTER TABLE command
- **LABEL PREVIEW IMPROVED**: Enhanced modal visualization with correct unit data display (CNPJ, address), real QR code generation, and optimized 60x60mm format
- **ZEBRA CLOUD API INTEGRATION**: Migrated from TCP port 9100 to Zebra Cloud API with multipart/form-data requests for reliable printing
- **COMPLETE UNIT TRACEABILITY**: All generated labels now track which unit created them, enabling proper multi-unit inventory management

## Previous Updates (2025-08-18)
- **QR SCANNER RACE CONDITION RESOLVED**: Fixed critical state management issue using isScanningRef instead of useState to eliminate timing conflicts between consecutive scans
- **WITHDRAWAL SYSTEM FULLY OPERATIONAL**: Complete QR-based inventory withdrawal tracking system implemented and tested with 7 successful withdrawals processed
- **PUBLIC HOME PAGE CREATED**: New /public/inicio route with Don Juarez logo and 4 navigation buttons to Vuca systems and label operations
- **AUTHENTICATION MIDDLEWARE ENHANCED**: Fixed session handling in requireAuth middleware with proper fallback mechanisms
- **SESSION VALIDATION**: Added session expiration validation to prevent invalid authentication attempts
- **MULTI-LAYER USER ID DETECTION**: Implemented multiple fallback methods to retrieve withdrawal responsible ID
- **TABLET TOUCH OPTIMIZATION**: All withdrawal interface elements optimized for touch interaction with large buttons (80px+ height)
- **QR SCANNER INTEGRATION**: Real-time camera-based QR code scanning using jsQR library with visual feedback overlay - now handling multiple consecutive scans correctly
- **PIN AUTHENTICATION**: Secure PIN-based access control for public withdrawal terminals working correctly
- **DATABASE ENHANCEMENT**: Added withdrawal_date and withdrawal_responsible_id columns to labels table
- **RESPONSIVE UI**: Touch-friendly interface with active states, shadows, and scale animations for tablet use
- **COMPLETE WORKFLOW VERIFIED**: PIN entry → QR scanning → Product confirmation → Withdrawal processing → Return to scanner - tested with codes 430K2A and NIO8AK

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
- **WEBHOOK ISSUE RESOLVED**: Fixed JSON parsing error in ESP32 datetime format (-03:0 → -03:00)
- **BEER TRACKING RESTORED**: Pour event webhook fully operational, ESP32 data now recording correctly
- **ESP32 COMPATIBILITY**: Enhanced webhook to handle malformed timezone formats automatically

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
- **Database Schema**: Includes Users, Points of Sale, Beer Styles, Devices (ESP32), Taps, Pour Events, Keg Change Events, Sessions, Labels with withdrawal tracking and unit association.
- **API Endpoints**: Authentication, webhook endpoints for hardware (pour, keg-change, heartbeat), management (CRUD for taps, POS, beer styles), reporting (historical data, CSV export), dashboard APIs, and label withdrawal tracking.
- **Real-time Features**: WebSocket server for live data streaming, automatic dashboard updates, real-time tap status monitoring with low-volume alerts, live consumption statistics, and QR code scanning for inventory management.
- **Data Flow**: Hardware (ESP32 + flow sensors) sends webhook data, system processes volume, broadcasts updates via WebSockets, and stores events. User authentication via employee credentials, dashboard displays real-time data, users can export historical data, and QR-based withdrawal tracking. Keg changes reset volume and update status.
- **UI/UX Decisions**: Orange theme, Montserrat font, simplified menu structure, visual timeline for history, EBC color integration for beer styles, compact dashboard layout, responsive design for various devices, tablet-optimized QR scanning interface.
- **Business Logic**: Rules for night shifts (5 AM cutoff), comprehensive employee and role management, CO2 efficiency calculation, robust data import/export mechanisms including intelligent CSV processing for products and historical data, inventory withdrawal tracking with responsible employee logging, and complete unit association tracking for multi-location operations.
- **Public Interfaces**: Dedicated public routes for label generation (/public/etiquetas), withdrawal tracking (/public/baixa-etiquetas), and navigation hub (/public/inicio) with PIN-based authentication for production operations.

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