# Restaurant Table Ordering System

## Overview
Restaurant Table Ordering System is a web-based application that enables guests to order food directly from their table using a QR code.
The system removes the need to wait for a waiter, improves customer experience, and increases order volume by making the menu always accessible.
The application is designed as a simple, fast, and mobile-first solution that runs in the browser without installation.

## Business Goal

The primary goals of the system are:

- Improve customer experience by eliminating waiting time
- Increase revenue by enabling faster and more frequent ordering
- Reduce communication errors between waiter and kitchen
- Streamline restaurant operations

The system is initially designed for a single restaurant but must be ready for future scaling to multiple locations.

## Users
The system supports the following roles:

- **Guest**
&#x20; - Scans QR code
&#x20; - Browses menu
&#x20; - Places orders
&#x20; - Sees estimated preparation time
&#x20; - Rates dishes

- **Kitchen Staff**
&#x20; - Receives orders
&#x20; - Manages preparation workflow
&#x20; - Sets preparation time

- **Waiter**
&#x20; - Marks orders as delivered

- **Admin / Manager**
&#x20; - Manages menu
&#x20; - Monitors orders and basic statistics

## MVP Scope

The MVP focuses on the core ordering flow:
- QR code-based table session
- Anonymous user flow (no login)
- Menu browsing with allergens (including daily variations)
- Order creation and submission
- Kitchen board with order queue
- Manual preparation time estimation
- Real-time order status updates
- Delivery confirmation by waiter

Out of scope for MVP:
- Online payments
- POS / ERP integrations
- Advanced analytics
- User accounts and history
- Offline mode

## Key Features

### Table Session \& Ordering
- QR code scanning
- Anonymous session per table
- Multiple users per table
- Order creation and submission
- No editing after submission

### Menu Management
- Menu CRUD
- Dynamic allergen handling (including daily changes)
- Dish availability management
- Real-time menu updates

### Kitchen Fulfilment
- Kitchen board (order queue)
- Routing (kitchen vs bar)
- Order statuses
- Manual preparation time setting
- Alerts for new orders

### Delivery
- Mark order as delivered
- Simple waiter interface (minimal UI)
- Status synchronization with guest

### Feedback
- Rating per order
- Average rating per dish

## Architecture
The system follows a **Modular Monolith** approach.
Core bounded contexts:
- Table Session \& Ordering
- Menu Management
- Kitchen Fulfilment
- Delivery
- Feedback

Key principles:
- Clear domain boundaries (DDD)
- API-first internal communication
- Event-driven communication between modules
- Read models for UI performance
- Prepared for future extraction to microservices

See architecture details in:
- `docs/architecture.md` :contentReference\[oaicite:0]{index=0}
- ADRs in `docs/adr/` :contentReference\[oaicite:1]{index=1}

## Technology Stack (Proposed)
- Frontend: Angular (mobile-first web app)
- Backend: .NET (C#)
- Database: SQL Server
- Hosting: Azure
- Realtime: WebSockets / SignalR

## Non-Functional Requirements

Key system characteristics:
- High responsiveness during peak hours
- Reliability during restaurant working hours
- Real-time updates for orders and statuses
- Simplicity of use (critical UX requirement)
- Scalability for future multi-location setup

Reference: system characteristics worksheet :contentReference\[oaicite:2]{index=2}

## Documentation Approach

The project uses structured documentation:
- PRD → business requirements :contentReference\[oaicite:3]{index=3}
- ADR → architectural decisions :contentReference\[oaicite:4]{index=4}
- Epics → delivery scope (JSON format) :contentReference\[oaicite:5]{index=5}
- Architecture → system design :contentReference\[oaicite:6]{index=6}

This ensures traceability from business goals to implementation.

## Project Status
- Discovery completed (client interviews, event storming)
- MVP scope defined
- Architecture defined (modular monolith)
- Ready for implementation phase

## Next Steps
- Finalize backlog (epics and user stories)
- Define API contracts between modules
- Prepare initial database model
- Start implementation of core modules:
&#x20; - Ordering
&#x20; - Kitchen
&#x20; - Menu

## Notes

The system is designed with simplicity as a key constraint.  
Any additional feature should be evaluated against its impact on usability and operational complexity.

Future evolution may include:
- Online payments
- POS integration
- Multi-restaurant support
- Advanced analytics

