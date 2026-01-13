
# API CONTRACT v1

Base URL: /api/v1

## Auth
POST /auth/login
GET /me

## Leads
GET /leads
POST /leads
POST /leads/{id}/handover
POST /leads/{id}/convert-to-client

## Workers
GET /workers
POST /workers
PUT /workers/{id}
DELETE /workers/{id}
POST /workers/{id}/upload

## Clients
POST /clients

## Placement
POST /matchings
POST /placements

## Payment
POST /invoices
POST /payments

## Tasks
GET /tasks
POST /tasks
PUT /tasks/{id}

## Files
GET /files/{id}/download
