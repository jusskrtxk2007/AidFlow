# AidFlow — Smart Food Redistribution Platform

**Good Food Deserves a Destination.**

AidFlow is a food redistribution and last-mile coordination platform designed to connect surplus food donors, volunteer riders, and shelters. It aims to reduce food wastage by coordinating time-sensitive donations with shelter demand, delivery capacity, and safety requirements.

## Problem Statement

Restaurants, hostel messes, and other food providers often have surplus food that must be delivered within a limited time. At the same time, shelters and relief camps may face shortages of essential supplies.

Poor coordination, unresponsive volunteers, changing shelter requirements, and delivery delays can result in wasted food and failed deliveries.

AidFlow aims to address these challenges through centralized coordination and feasibility-aware dispatch planning.

## Our Solution

AidFlow brings donors, riders, shelters, and operations coordinators together through a unified platform.

The system is designed to help users register donations, identify shelters with unmet demand, coordinate deliveries, monitor delivery status, and respond to operational changes.

## Key Features

- **Donation Management:** Register surplus food with quantity, pickup details, and expiry deadlines.
- **Rider Coordination:** Organize delivery assignments according to rider availability and carrying capacity.
- **Shelter Demand Management:** Track shelter requirements, available supplies, and essential facility constraints.
- **Smart Dispatch Planning:** Evaluate delivery feasibility based on expiry time, capacity, demand, and compatibility.
- **Red–Yellow–Green Zones:** Categorize shelters according to their unmet demand and available or confirmed incoming supplies.
- **Failure Recovery:** Support reassessment when a volunteer becomes unresponsive or a destination can no longer accept a delivery.
- **Operational Dashboard:** Present important donation, shelter, rider, and delivery information in one interface.

*Feature availability depends on the current implementation. Simulated or planned functionality should be identified clearly during demonstrations.*

## Red–Yellow–Green Zone System

AidFlow uses a proposed demand-based zone model to help prioritize redistribution.

- 🔴 **Red Zone:** High unmet demand relative to available and confirmed incoming supplies.
- 🟡 **Yellow Zone:** Moderate demand or an uncertain supply situation.
- 🟢 **Green Zone:** Demand is largely fulfilled by available or confirmed incoming supplies.

Zone calculations should account for food category, incoming deliveries, completed deliveries, and changing shelter requirements. A zone recommendation does not override expiry, transport capacity, or safety constraints.

## Technical Architecture

The intended architecture separates the application into three layers:

### 1. Frontend
- React.js — component-based user interface.
- TypeScript — typed application logic.
- Vite — development server and production build tooling.
- HTML and CSS — page structure, styling, and responsive layouts.

### 2. Backend
- Node.js — JavaScript runtime for server-side execution.
- Express.js — API routes, request handling, validation, and business logic.
- REST APIs — communication between the frontend and backend using HTTP and JSON.

### 3. Database
- PostgreSQL — relational data storage for donations, riders, shelters, demand, and delivery assignments.

The backend and database components should be considered implemented only when their connections and operations have been verified in the running application.

## System Workflow

1. A donor registers a surplus food batch.
2. The system records its quantity, pickup details, and expiry deadline.
3. Shelter demand and supply availability are evaluated.
4. The dispatch process checks rider capacity, delivery feasibility, and relevant safety requirements.
5. Feasible deliveries are assigned and their status is tracked.
6. If a rider or destination becomes unavailable, the system reassesses the assignment.
7. The dashboard reflects updated operational information.

## Example Scenario

A donor has 180 meals that need to be delivered within 75 minutes. Each available rider can carry a maximum of 40 meals.

AidFlow's dispatch logic should consider rider capacity, estimated travel time, shelter demand, and food safety deadlines before creating assignments. It should avoid over-allocation and identify when no feasible delivery plan is available.

## Getting Started

### Prerequisites

Depending on the components enabled in your current version, you may need:

- Node.js and npm
- PostgreSQL
- Git

### Installation

Clone the repository:

```bash
git clone https://github.com/jusskrtxk2007/AidFlow.git
cd AidFlow
```

Install the project dependencies using the package manager indicated by the repository lockfile.

For an npm-based project:

```bash
npm install
```

Start the development server using the script configured in `package.json`. For a typical Vite frontend, this is:

```bash
npm run dev
```

If the application uses a separate Express backend, start it using the appropriate backend script and configure the database connection as documented in the project.

**Note:** The exact commands depend on the current project configuration. Check `package.json` for the available scripts before running them.

## Data and Safety Considerations

- Validate quantities, expiry deadlines, and destination requirements.
- Prevent duplicate or conflicting allocation of donations.
- Do not recommend deliveries that cannot meet the applicable safety deadline.
- Keep incoming, allocated, and delivered quantities distinct.
- Use clearly labelled sample data when demonstrating simulated operations.
- Do not treat a delivery as completed until its status is confirmed.

## Future Scope

- Live GPS tracking for delivery riders.
- Improved route and travel-time estimation.
- Automated recovery from failed reservations and destination changes.
- Integration with NGOs, restaurants, and shelter networks.
- Notifications for urgent donations and changing demand.
- Analytics for food saved, deliveries completed, and waste avoided.

## Impact

AidFlow aims to improve coordination between surplus food providers and communities in need by making redistribution more timely, transparent, and responsive to real-world operational failures.

## Repository

GitHub: https://github.com/jusskrtxk2007/AidFlow

---

**AidFlow — Good Food Deserves a Destination.**
