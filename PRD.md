# Product Requirements Document (PRD)

## 1. Product Overview
System umożliwia klientom restauracji składanie zamówień przy stoliku poprzez QR code i aplikację webową.

Cel:
- skrócenie czasu oczekiwania
- zwiększenie sprzedaży
- redukcja błędów komunikacyjnych

## 2. Project Scope

### In scope (MVP)
- QR code i sesja stolika
- menu + alergeny
- zamówienia
- kitchen board + ETA
- delivery status
- rating

### Out of scope
- płatności online
- integracje POS
- logowanie
- offline

## 3. Users

Guest – zamawia  
Waiter – oznacza dostarczenie  
Kitchen – realizuje zamówienia  
Manager – podgląd danych  

## 4. Core Flow

1. Scan QR
2. Browse menu
3. Submit order
4. Kitchen processes
5. Delivery
6. Rating

## 5. Functional Requirements

- Table session
- Order management
- Menu management
- Kitchen fulfilment
- Delivery
- Feedback

## 6. Non-Functional Requirements

- Performance < 2s
- High availability in opening hours
- Scalability (future multi-restaurant)
- Audit log

## 7. Data Model

- TableSession
- Order
- Dish
- Rating

## 8. MVP

QR → Menu → Order → Kitchen → ETA

## 9. Future

- Payments
- POS integration
- Analytics
