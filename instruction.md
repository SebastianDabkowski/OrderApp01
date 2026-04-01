\# Project Instructions



\## 1. Project Overview



This project is a web-based Restaurant Table Ordering System.



The system allows guests to:

\- scan a QR code at the table

\- browse menu with allergens (including daily variations)

\- place orders directly to kitchen/bar

\- see estimated preparation time

\- rate dishes after delivery



The system supports restaurant staff:

\- kitchen panel for order handling

\- waiter panel for marking delivery

\- admin panel for menu and basic analytics



The system is designed as MVP for a single restaurant with future scalability to multiple locations.



Business goal:

\- improve customer experience

\- increase order volume

\- reduce ordering friction and communication errors



Source context: :contentReference\[oaicite:0]{index=0}, :contentReference\[oaicite:1]{index=1}



\---



\## 2. Architecture Principles



\- Modular Monolith as default architecture

\- Clear bounded contexts (DDD)

\- API-first communication between modules

\- Event-driven communication inside system (domain events)

\- Separation of write (commands) and read models (CQRS-lite)

\- Cloud-ready (Azure)



Key rule:

Do not break module boundaries.



\---



\## 3. Bounded Contexts



System is divided into:



1\. Table Session \& Ordering  

2\. Menu Management  

3\. Kitchen Fulfilment  

4\. Delivery  

5\. Feedback  



Each context:

\- owns its data

\- exposes clear API

\- communicates via events



Reference: :contentReference\[oaicite:2]{index=2}



\---



\## 4. Core Domain Rules



\- User is anonymous (no login)

\- QR code binds user to table session

\- One table can have multiple users and orders

\- Order cannot be edited after submission

\- Rating must be linked to order

\- Kitchen sets preparation time manually (MVP)

\- Menu availability and allergens can change dynamically



\---



\## 5. Repository Structure



Follow this structure:



\- src/

&#x20; - Backend (.NET)

&#x20;   - Domain

&#x20;   - Application

&#x20;   - Infrastructure

&#x20;   - API

&#x20; - Frontend (Angular or React)



\- tests/

\- docs/

&#x20; - architecture.md

&#x20; - adr/

\- scripts/

\- config/



Reference: :contentReference\[oaicite:3]{index=3}



\---



\## 6. Development Rules



Before each commit:

\- build passes

\- tests pass

\- code formatted



Commands:

\- dotnet restore

\- dotnet build

\- dotnet test



General rules:

\- small, focused methods

\- explicit naming

\- no hidden logic

\- no unnecessary abstractions

\- avoid premature optimization



\---



\## 7. Documentation Rules



Every change that affects architecture must include:



1\. ADR (Architecture Decision Record)  

2\. Update of architecture.md  

3\. Update README if needed  



ADR template: :contentReference\[oaicite:4]{index=4}



Architecture template: :contentReference\[oaicite:5]{index=5}



\---



\## 8. AI Agent Responsibilities



Agents operate on this project:



Architect Agent:

\- defines architecture

\- creates ADRs

\- validates boundaries



Dev Agent:

\- implements features

\- writes tests



Refactor Agent:

\- improves code quality

\- reduces coupling



Docs Agent:

\- updates documentation



QA Agent:

\- creates test scenarios



Rules:

\- do not introduce new frameworks without justification

\- do not change architecture without ADR

\- ask for clarification if unclear



Reference: :contentReference\[oaicite:6]{index=6}



\---



\## 9. Quality Attributes (Priority)



Top priorities:



1\. Simplicity  

2\. Reliability  

3\. Responsiveness  



Important:

\- system must work during peak hours

\- minimal latency for ordering flow

\- clear and predictable behavior



Reference: :contentReference\[oaicite:7]{index=7}



\---



\## 10. MVP Scope



Included:

\- QR session

\- menu browsing

\- order creation and submission

\- kitchen board

\- manual preparation time

\- delivery marking



Optional (later):

\- ratings

\- integrations (POS, payments)

\- analytics

\- multi-restaurant



\---



\## 11. Constraints



\- No login (anonymous usage)

\- Web mobile first

\- No POS integration (MVP)

\- No online payments (MVP)

\- Basic audit log required



\---



\## 12. Risks



\- kitchen overload during peak

\- lack of internet connectivity

\- unclear menu management ownership

\- scaling to multi-restaurant



Mitigation:

\- simple UI

\- manual overrides

\- clear module boundaries



\---



\## 13. Next Steps



1\. Finalize PRD

2\. Define API contracts between contexts

3\. Create initial ADRs:

&#x20;  - Modular Monolith

&#x20;  - Communication (events vs sync)

4\. Prepare backlog (epics + features)

5\. Start implementation of Ordering context

