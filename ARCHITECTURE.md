# Architecture Overview

## 1. Purpose

This document describes the target architecture for the Restaurant Table Ordering System for Restauracja Cechowa. The system allows guests to scan a QR code at the table, browse the menu on their phone, place an order directly to the restaurant, track estimated waiting time, and rate delivered dishes. On the restaurant side, the solution provides operational panels for kitchen staff, waiters, and management.

The architecture is designed for a fast MVP delivery in 2 to 3 months, with a clear path for later extension to multiple restaurant locations, online payments, and integrations with POS systems. The main business goals are to improve guest experience, reduce waiting time before placing an order, reduce communication mistakes between waiter and kitchen, and create an opportunity to increase order value. The requirements come from the client email, the discovery conversation transcript, and the reconstructed bounded contexts from the event storming material.

## 2. Goals and Non-Goals

### 2.1 Primary Goals

1. Allow anonymous guests to start a table session by scanning a QR code.
2. Allow guests to browse current menu items, including allergens and daily variations.
3. Allow guests to submit orders directly from a mobile web application.
4. Provide kitchen and bar staff with an operational board for order fulfilment.
5. Show guests the estimated waiting time set by kitchen staff.
6. Allow waiters to mark orders as delivered.
7. Allow guests to rate ordered dishes after delivery.
8. Provide basic reporting for the owner or manager.
9. Keep the architecture simple enough for MVP, while ready for future growth.

### 2.2 Non-Goals for MVP

1. Online payment processing.
2. POS or fiscal printer integration.
3. ERP or inventory system integration.
4. Offline-first mode.
5. Advanced recommendation engine.
6. Customer accounts and order history.
7. Complex analytics or BI platform.
8. Comment-based reviews and moderation.

## 3. Business Context

### 3.1 Business Need

The restaurant currently depends on waiters to take orders. This creates waiting time before guests can order, increases the risk of communication mistakes, and makes additional orders harder during busy hours. The system should reduce this friction by moving ordering to the guest’s phone while keeping fulfilment simple for restaurant staff.

### 3.2 Users

#### Guest

The guest scans a QR code, opens the web app without registration, views menu items, checks allergens, places one or more orders during the session, sees the waiting time, and rates dishes after delivery.

#### Kitchen Staff

Kitchen staff receives submitted orders on a kitchen board, sees new items immediately, optionally with a sound notification, sets or updates preparation time, and moves items through preparation statuses.

#### Bar Staff

Bar staff handles the subset of ordered items routed to the bar.

#### Waiter

The waiter uses a simple restaurant panel on tablet or internal device to mark orders or dishes as delivered.

#### Owner / Manager

The owner or manager monitors orders, basic sales patterns, and average ratings.

### 3.3 Business Constraints

1. The first release should be available within 2 to 3 months.
2. The solution should work in a browser on mobile phones without installing an app.
3. The system should stay simple for staff to operate.
4. The system must work reliably during restaurant opening hours.
5. Personal data collection should be avoided in MVP.

## 4. Key Requirements

### 4.1 Functional Requirements

1. QR-based table session start.
2. Anonymous table-linked access.
3. Menu browsing.
4. Daily allergen handling.
5. Dish availability management.
6. Order creation and submission.
7. Multiple users at one table.
8. Multiple separate orders for one table.
9. Routing of ordered items to kitchen or bar.
10. Kitchen board and bar board.
11. Manual waiting time estimation.
12. Real-time status updates for guests and staff.
13. Waiter delivery confirmation.
14. Rating linked to a delivered order.
15. Average rating shown near dish in menu.
16. Basic audit trail.
17. Basic management view and operational statistics.
18. Multi-language support, at least Polish and English.

### 4.2 Non-Functional Requirements

1. High usability on mobile devices.
2. Fast screen response during peak hours.
3. Reliability during lunch and evening peaks.
4. Clear separation of business modules.
5. Simple deployment and operations.
6. Basic observability and auditability.
7. Security appropriate for anonymous public access and internal staff usage.
8. Readiness for future growth to more restaurants.

## 5. Architecture Drivers

The most important architecture characteristics for this system are simplicity, reliability, responsiveness, maintainability, and evolvability. The system does not require an advanced distributed architecture in the MVP phase, but it must support clean boundaries because menu, ordering, fulfilment, and feedback evolve at different speeds. This aligns with the characteristics worksheet, especially responsiveness, reliability, domain partitioning, maintainability, and simplicity.

## 6. Recommended Architecture Style

### 6.1 Architectural Decision

The recommended architecture for MVP is a **modular monolith** with clear bounded contexts and internal module boundaries.

### 6.2 Why Modular Monolith

This project has a moderate scale, limited initial scope, and a short timeline. A modular monolith gives the team faster delivery, simpler deployment, lower operational complexity, and easier local development than microservices. At the same time, it supports domain separation, so the system can later evolve toward service extraction if required.

### 6.3 Why Not Microservices Now

Microservices would add overhead in deployment, monitoring, integration, testing, and operational support without enough business value at the MVP stage. The projected load of around 150 to 200 orders per day and about 40 to 60 concurrent users does not justify that complexity.

## 7. System Context

### 7.1 External Actors and Systems

1. Guest mobile browser.
2. Restaurant staff tablet or desktop browser.
3. Optional future POS system.
4. Optional future payment provider.
5. Optional future reporting or BI tools.

### 7.2 High Level Interaction

1. Guest scans QR code.
2. System opens a table session and binds it to a table.
3. Guest browses current menu data.
4. Guest submits an order.
5. Order is routed to kitchen and or bar.
6. Kitchen sets estimated time and updates preparation status.
7. Guest sees status and estimated waiting time.
8. Waiter marks delivery.
9. Guest can submit a rating.
10. Manager reviews operational and rating data.

## 8. Bounded Contexts and Modules

The domain model should be split into the following bounded contexts.

### 8.1 Table Session & Ordering

Responsibilities:
1. QR code scanning entry.
2. Anonymous session management.
3. Linking guest to a table.
4. Basket or order building.
5. Order submission.
6. Order visibility for the guest.

Core entities:
1. TableSession
2. Order
3. OrderLine
4. GuestSessionToken

### 8.2 Menu Management

Responsibilities:
1. Menu definition.
2. Dish management.
3. Allergen definitions.
4. Daily allergen variations.
5. Dish availability.
6. Publication of current menu view.

Core entities:
1. Menu
2. Dish
3. DishVariant or DailyDishVersion
4. Allergen
5. AvailabilityStatus

### 8.3 Kitchen Fulfilment

Responsibilities:
1. Receiving submitted orders.
2. Routing items to kitchen or bar.
3. Kitchen board UI.
4. Preparation status management.
5. Manual estimation of preparation time.
6. Alerts for new orders.

Core entities:
1. KitchenOrder
2. KitchenOrderItem
3. PreparationTicket
4. PreparationEstimate

### 8.4 Delivery

Responsibilities:
1. Ready-for-delivery view.
2. Waiter marking dishes or orders as delivered.
3. Synchronization of guest-visible delivery status.

Core entities:
1. DeliveryTask
2. DeliveryStatus

### 8.5 Feedback

Responsibilities:
1. Rating eligibility validation.
2. Rating submission linked to delivered order items.
3. Average rating calculation.
4. Projection of ratings to menu view.

Core entities:
1. OrderRating
2. DishRatingAggregate

### 8.6 Management & Reporting

Responsibilities:
1. Dashboard for owner or manager.
2. Basic order statistics.
3. Best-selling dishes.
4. Average ratings.

Core entities:
1. SalesSnapshot
2. RatingSnapshot
3. OrderMetrics

### 8.7 Administration / Identity

Responsibilities:
1. Internal user login for staff and manager.
2. Role-based access for kitchen, waiter, admin, manager.
3. Audit logging of important actions.
4. Configuration of tables, QR codes, languages, and settings.

Core entities:
1. User
2. Role
3. AuditLogEntry
4. Table
5. QrCodeReference

## 9. Container View

### 9.1 Web Frontend

A responsive web application used by guests and restaurant staff.

Suggested approach:
1. Single frontend solution with role-based views.
2. Guest experience optimized for mobile browser.
3. Internal staff views optimized for tablet and desktop.

### 9.2 Backend Application

A single backend application organized as a modular monolith.

Responsibilities:
1. API endpoints.
2. Authentication and authorization.
3. Application workflows.
4. Domain logic.
5. Real-time event push.
6. Integration points for future external systems.

Suggested style:
1. Layered modular backend.
2. Domain-driven modules.
3. API-first contracts between frontend and backend.

### 9.3 Database

A relational database stores transactional data such as tables, sessions, menu items, orders, ratings, users, and audit logs.

Suggested approach:
1. One database for MVP.
2. Separate schemas per module if useful.
3. Strong transactional consistency for order submission and fulfilment.

### 9.4 Real-Time Communication Layer

Used to push updates such as order status changes, waiting time changes, and board refreshes.

Suggested usage:
1. Guest waiting time updates.
2. Kitchen board live updates.
3. Waiter and delivery status updates.

### 9.5 Storage and Assets

Used for menu images and static assets if needed.

## 10. Suggested Technology Direction

The final stack is not imposed by the client, but a pragmatic implementation could be:

### 10.1 Frontend

1. Angular or React for responsive web UI.
2. PWA-ready frontend, even if offline mode is postponed.
3. Internationalization support for Polish and English.

### 10.2 Backend

1. .NET for API and business modules.
2. REST API for standard operations.
3. SignalR or WebSocket-based mechanism for real-time updates.

### 10.3 Database

1. SQL Server, PostgreSQL, or another proven relational database.
2. Indexing for active orders, menu queries, and ratings.

### 10.4 Hosting

1. Cloud deployment on Azure is a good fit if preferred by the implementation team.
2. Simple production environment with staging.
3. Reverse proxy, TLS, logging, and monitoring enabled.

## 11. Application Layering

Each module should follow clear internal layers.

### 11.1 Presentation Layer

1. Guest UI.
2. Staff UI.
3. HTTP API.
4. Real-time hub endpoints.

### 11.2 Application Layer

1. Use cases.
2. Command handlers.
3. Query handlers.
4. Validation.
5. Transaction coordination.

### 11.3 Domain Layer

1. Aggregates.
2. Domain events.
3. Business rules.
4. Value objects.

### 11.4 Infrastructure Layer

1. Persistence.
2. Authentication provider integration.
3. Notification mechanisms.
4. Audit log persistence.
5. Real-time transport implementation.

## 12. Key Data Flows

### 12.1 Guest Ordering Flow

1. Guest scans QR code.
2. System validates table reference.
3. System creates or restores active table session.
4. Guest loads published menu.
5. Guest adds dishes to order.
6. Guest submits order.
7. System persists order and emits order submitted event.
8. Kitchen Fulfilment module creates operational tickets.
9. Guest sees current order status and waiting time.

### 12.2 Kitchen Estimation Flow

1. Kitchen receives new operational ticket.
2. Kitchen sets preparation estimate.
3. System stores estimate.
4. Real-time layer updates guest UI.

### 12.3 Delivery Flow

1. Kitchen marks dish ready or completed.
2. Delivery view shows item ready for waiter.
3. Waiter marks delivered.
4. Guest sees delivered status.
5. Feedback becomes available.

### 12.4 Rating Flow

1. Guest opens delivered order.
2. System checks rating eligibility.
3. Guest submits numeric rating.
4. Rating is stored.
5. Average dish rating is recalculated.
6. Menu projection is refreshed.

## 13. Integration Strategy

### 13.1 MVP Integrations

No mandatory external business integrations are required for MVP.

### 13.2 Planned Future Integrations

1. POS integration for order synchronization.
2. Online payment provider.
3. Inventory or ERP integration.
4. External analytics or BI platform.

### 13.3 Integration Principle

All external integration points should be implemented through dedicated interfaces or adapter components so the core business logic remains isolated from vendor-specific details.

## 14. Security and Privacy

### 14.1 Security Model

1. Anonymous access only for guest table session area.
2. Authenticated access for internal staff and managers.
3. Role-based authorization.
4. Secure QR tokens to avoid table spoofing.
5. Server-side validation of all submitted orders.

### 14.2 Privacy

The client does not want to collect personal data in MVP. This reduces GDPR complexity, but the system still processes operational data and should maintain proper security and retention practices.

### 14.3 Auditability

Basic audit logs should capture at least:
1. Internal login events.
2. Menu changes.
3. Availability changes.
4. Waiting time changes.
5. Delivery confirmations.
6. Administrative actions.

## 15. Performance and Scalability

### 15.1 Expected Scale

1. About 20 tables.
2. About 150 to 200 orders per day.
3. About 40 to 60 concurrent guest users in peak periods.

### 15.2 Performance Expectations

1. Menu pages should load quickly on mobile devices.
2. Order submission should complete in a few seconds.
3. Waiting time and status changes should appear nearly in real time.
4. Kitchen board should refresh without manual reloading.

### 15.3 Scalability Strategy

The MVP should scale vertically first. If the product expands to multiple venues or much higher throughput, the modular architecture allows extraction of selected modules, such as fulfilment or reporting, into separate services later.

## 16. Observability and Operations

### 16.1 Logging

1. Structured application logs.
2. Audit logs for business actions.
3. Error correlation for order workflows.

### 16.2 Monitoring

1. Application uptime.
2. API latency.
3. Failed order submissions.
4. Real-time connection health.
5. Database performance.

### 16.3 Alerts

1. Service unavailable during opening hours.
2. Repeated order submission failures.
3. Real-time channel failure.
4. Database connectivity issues.

## 17. Deployment and Environments

### 17.1 Environments

1. Development.
2. Test or staging.
3. Production.

### 17.2 Deployment Principles

1. Simple automated deployment pipeline.
2. Repeatable infrastructure setup.
3. Rollback capability.
4. Environment-specific configuration management.

## 18. Risks and Mitigations

### 18.1 Operational Change Risk

Risk:
Restaurant staff may not adapt smoothly to the new process.

Mitigation:
Keep kitchen and waiter UI minimal, test the flow with real staff early, and run pilot operation before full rollout.

### 18.2 Incorrect Waiting Time Estimates

Risk:
Manual estimates may be inconsistent.

Mitigation:
Start with manual input, log estimate changes, and later evaluate rules or automation.

### 18.3 Anonymous Misuse of Table Sessions

Risk:
Guests may access wrong table sessions if QR references are predictable.

Mitigation:
Use non-guessable QR tokens and short-lived session binding rules.

### 18.4 Peak Hour Reliability

Risk:
System may fail during lunch or evening rush.

Mitigation:
Load test core flows, keep architecture simple, monitor production health, and preserve fallback manual ordering process.

### 18.5 Future Integration Complexity

Risk:
Later POS or payment integration may force changes.

Mitigation:
Isolate integration adapters and keep core domain logic independent.

## 19. Open Questions

1. Should waiter mark delivery per dish or per full order?
2. Should kitchen estimate be set once per order or updated during preparation?
3. What is the exact internal role model for admin, manager, kitchen, and waiter?
4. How should daily allergen changes be managed operationally?
5. What is the required level of reporting in MVP?
6. Should the bar have a fully separate board from the kitchen from day one?
7. What fallback process is needed if real-time updates temporarily fail?

## 20. Recommended Next Steps

1. Confirm MVP scope and defer ratings or management reports if timeline becomes tight.
2. Create ADR for modular monolith architecture.
3. Prepare C4 System Context and Container diagrams.
4. Define API contracts for guest ordering, kitchen fulfilment, and delivery.
5. Model main aggregates and domain events.
6. Define key quality scenarios for responsiveness and reliability.
7. Prepare implementation backlog by bounded context.

## 21. Summary

The recommended target solution is a modular monolith web application with clear business modules for table session and ordering, menu management, kitchen fulfilment, delivery, feedback, and administration. This approach fits the project scale, delivery timeline, and business risk level. It keeps the system simple enough for a fast MVP while preserving a clean structure for later growth into multi-location usage, integrations, and richer analytics.
