# ADR-001: Modular Monolith as Initial Architecture

Status: Proposed  
Date: 2026-03-31  
Author: Sebastian Dąbkowski  

## Context

System is a restaurant table ordering platform where guests scan a QR code, browse menu, place orders, and kitchen processes them in real time.

Key business drivers:
- fast MVP delivery (2–3 months)
- low operational complexity at start
- possibility to expand to multiple restaurants
- need for real-time interaction between ordering and kitchen  

Domain is structured into bounded contexts:
- Table Session & Ordering  
- Menu Management  
- Kitchen Fulfilment  
- Delivery  
- Feedback  

Expected scale:
- ~150–200 orders/day  
- ~40–60 concurrent users  

Key concerns:
- maintainability and clear domain boundaries  
- evolvability  
- simplicity of deployment  

## Decision

We will implement the system as a Modular Monolith.

- single deployable application  
- internal modules aligned with bounded contexts  
- strict module boundaries  
- communication via domain events and application services  

Each module:
- own domain model  
- own application layer  
- controlled data access  

## Alternatives Considered

### Microservices

Rejected due to:
- high operational complexity  
- premature scaling  

### Layered Monolith

Rejected due to:
- tight coupling  
- weak domain separation  

## Consequences

### Positive

- fast MVP delivery  
- simple deployment  
- strong domain alignment  
- easier development and debugging  
- ready for future extraction  

### Negative

- limited independent scaling  
- risk of boundary erosion  
- requires discipline  
- future refactoring possible  

## Notes

Implementation:
- enforce module boundaries  
- use domain events  
- define clear contracts  

Next ADRs:
- Module boundaries  
- Communication style  
- Data ownership  

## Summary

Modular monolith gives speed, control, and future flexibility.

## Next Step

Define module boundaries and dependencies.
