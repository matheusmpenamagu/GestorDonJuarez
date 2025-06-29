# Sistema de Controle de Chopes - Beer Control System

## Overview

This is a Brazilian craft beer monitoring system designed for real-time tracking of beer dispensation from taps connected to ESP32 flow sensors. The system provides a comprehensive dashboard for monitoring beer consumption, managing kegs, and exporting consumption data with full Brazilian Portuguese localization and São Paulo timezone support.

## System Architecture

### Frontend Architecture
- **Framework**: React 18+ with TypeScript
- **UI Library**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom theme variables
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for client-side routing
- **Real-time Updates**: WebSocket integration for live data streaming
- **Build Tool**: Vite with React plugin

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript (ESM modules)
- **Database ORM**: Drizzle with PostgreSQL
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Authentication**: Replit Auth (OIDC-based)
- **Session Management**: Express sessions with PostgreSQL store
- **Real-time Communication**: WebSocket server for live updates

### Project Structure
```
├── client/           # React frontend application
├── server/           # Express.js backend API
├── shared/           # Shared TypeScript schemas and types
├── migrations/       # Database migration files
└── attached_assets/  # Documentation and requirements
```

## Key Components

### Database Schema
- **Users**: Required for Replit Auth integration
- **Points of Sale**: Physical locations where taps are installed
- **Beer Styles**: Different types of beer served
- **Devices**: ESP32 hardware controllers with 5-digit alphanumeric codes
- **Taps**: Individual beer dispensing points with flow sensors
- **Pour Events**: Real-time consumption data from ESP32 sensors
- **Keg Change Events**: Barrel replacement tracking
- **Sessions**: Session management for authentication

### API Endpoints
- **Authentication Routes**: `/api/auth/*` for login/logout
- **Webhook Endpoints**: 
  - `/api/webhooks/pour` for ESP32 flow data
  - `/api/webhooks/keg-change` for barrel changes
- **Management APIs**: CRUD operations for taps, POS, beer styles
- **Reporting APIs**: Historical data and CSV export functionality
- **Dashboard APIs**: Real-time statistics and monitoring data

### Real-time Features
- WebSocket server for live data streaming
- Automatic dashboard updates when new pour events occur
- Real-time tap status monitoring with low-volume alerts
- Live consumption statistics with São Paulo timezone

## Data Flow

### Hardware Integration Flow
1. ESP32 + YF-S401 flow sensors detect beer dispensation
2. Sensors send webhook data: `{datetime, tap_id, total_volume_ml}`
3. System calculates volume consumed and updates available volume
4. WebSocket broadcasts updates to connected dashboard clients
5. Database stores all events with São Paulo timezone timestamps

### User Interaction Flow
1. User authenticates via Replit Auth (admin-managed accounts only)
2. Dashboard loads with real-time tap status and recent activity
3. WebSocket connection established for live updates
4. Users can export historical data as CSV files
5. Administrators manage taps, points of sale, and beer styles

### Keg Management Flow
1. Operator replaces keg and triggers webhook: `{datetime, tap_id}`
2. System resets available volume to keg capacity
3. Historical consumption data preserved
4. Dashboard updates to show new keg status

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL connection
- **drizzle-orm**: Type-safe database operations
- **express**: Web server framework
- **ws**: WebSocket implementation
- **date-fns-tz**: São Paulo timezone handling
- **@tanstack/react-query**: Server state management
- **@radix-ui/react-***: Accessible UI components

### Development Dependencies
- **vite**: Build tool and dev server
- **typescript**: Type checking and compilation
- **tailwindcss**: Utility-first CSS framework
- **drizzle-kit**: Database migration tool

### Authentication
- Uses Replit's built-in OIDC authentication
- No self-registration - admin-only user management
- Session-based authentication with PostgreSQL storage

### Hardware Integration
- Compatible with ESP32 microcontrollers
- YF-S401 flow sensors for beer measurement
- Webhook-based data transmission
- Supports multiple taps with unique identifiers

## Deployment Strategy

### Environment Configuration
- **DATABASE_URL**: Neon PostgreSQL connection string
- **SESSION_SECRET**: Session encryption secret
- **REPL_ID**: Replit environment identifier
- **ISSUER_URL**: OIDC authentication endpoint
- **REPLIT_DOMAINS**: Allowed domains for authentication

### Build Process
1. Frontend builds with Vite to `dist/public`
2. Backend compiles with ESBuild to `dist/index.js`
3. Database schema pushed with Drizzle migrations
4. Static assets served from build directory

### Production Considerations
- Database connection pooling for performance
- Session store cleanup for expired sessions
- WebSocket connection management and reconnection
- Error handling and logging for webhook endpoints
- CORS configuration for API access

### Monitoring and Maintenance
- Real-time status indicators for WebSocket connectivity
- Database query optimization for large datasets
- Automated CSV export functionality
- Timezone-aware data display and storage
- Multi-language support (Brazilian Portuguese)

## Changelog
- June 28, 2025. Initial setup
- June 29, 2025. Added device management system with ESP32 hardware tracking
- June 29, 2025. Implemented sensor-to-tap connection system
- June 29, 2025. Migrated tap IDs from strings to auto-incrementing integers

## Recent Changes
- ✓ Implemented device exclusivity validation (one device per tap)
- ✓ Backend validation prevents device assignment conflicts
- ✓ Frontend interface shows device availability status  
- ✓ Error messages explain when devices are already in use
- ✓ Available devices API endpoint for improved UX
- ✓ Select dropdown disables devices already assigned to other taps
- ✓ Complete device management system with proper constraints
- ✓ Implemented webhook storage system for ESP32 beer consumption data
- ✓ Created `/api/webhooks/pour` endpoint accepting device_id, datetime, and total_volume_ml
- ✓ Automatic volume calculation and real-time dashboard updates
- ✓ Support for device lookup by code (KE42H) or numeric ID
- ✓ Proper data validation and integer conversion for volume measurements
- ✓ WebSocket broadcasting for live consumption events
- ✓ Enhanced ESP32 webhook compatibility with CORS headers and timeout protection
- ✓ Comprehensive error handling and logging for webhook debugging
- ✓ Robust data validation preventing malformed requests from causing crashes
- ✓ Corrected webhook logic to treat each ESP32 reading as independent consumption
- ✓ Every volume reading now registers as consumption regardless of previous values
- ✓ Accurate cumulative volume tracking with proper event logging

## User Preferences

Preferred communication style: Simple, everyday language.