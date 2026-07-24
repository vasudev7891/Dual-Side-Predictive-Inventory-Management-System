# IMS Predictive — Wholesaler B2B Inventory & Demand Forecasting System

IMS Predictive is a dual-sided web application designed to optimize B2B supply chains using machine learning. It provides real-time catalog syncing, concurrent transactional checkout with stock protection, and predictive analytics for demand planning and wholesaler procurement.

---

## 📐 Diagrams & System Design

### 1. Block Diagram

```mermaid
graph LR
    subgraph Users [User Layer]
        Retailer[Retail Shop Owner]
        Supplier[Wholesale Supplier]
    end

    subgraph UIBlock [Presentation Block - React 19]
        Marketplace[Retail Marketplace UI]
        Dashboard[Supplier Inventory Portal]
        StateStore[Zustand Stores & Recharts]
    end

    subgraph GatewayBlock [API Gateway Block - Node.js Express]
        Router[REST Router]
        Security[JWT Auth & Zod Validator]
    end

    subgraph MLBlock [AI/ML Engine - Python FastAPI]
        Prophet[Meta Prophet B2C Forecasting]
        RandomForest[Random Forest B2B Procurement]
    end

    subgraph DataBlock [Database & Sync Block - Supabase]
        PostgreSQL[(PostgreSQL DB + RLS)]
        RPC[PL/pgSQL place_order Row Lock]
        RealtimeWS[Supabase Realtime WebSockets]
    end

    Retailer --> Marketplace
    Supplier --> Dashboard
    Marketplace --> StateStore
    Dashboard --> StateStore
    
    StateStore -->|REST Requests| Router
    Router --> Security
    Security -->|Proxied ML Requests| MLBlock
    Security -->|Transactions| RPC
    RPC --> PostgreSQL
    PostgreSQL <-->|Instant Stock Sync| RealtimeWS
    RealtimeWS -->|WebSocket Push| StateStore
```

---

### 2. System Architecture

```mermaid
graph TD
    subgraph PresentationLayer [Frontend Presentation Layer - React 19 + Vite]
        UI[Glassmorphic UI / Dashboard]
        Client[Centralized Axios API Client]
        Zustand[Zustand State Stores: Auth / Cart / Inventory]
        UI --> Client
        Client --> Zustand
    end

    subgraph GatewayLayer [Core Gateway API - Node.js + Express]
        Express[Express Gateway Server]
        AuthMW[JWT Auth & Role Middleware]
        ZodVal[Zod Payload Validator]
        Express --> AuthMW
        AuthMW --> ZodVal
    end

    subgraph MLLayer [AI / ML Microservice - Python + FastAPI]
        FastAPI[FastAPI Server]
        ProphetEngine[Meta Prophet Engine: B2C Time-Series]
        RFEngine[Random Forest Regressor: B2B Procurement]
        FastAPI --> ProphetEngine
        FastAPI --> RFEngine
    end

    subgraph DataLayer [Database & Real-time Layer - Supabase PostgreSQL]
        DB[(PostgreSQL Database)]
        RLS[Row Level Security Policies]
        RPC[Stored Procedure: place_order]
        Realtime[Supabase Realtime WebSockets]
        DB --- RLS
        DB --- RPC
        DB --- Realtime
    end

    Client -->|HTTP / REST Requests| Express
    Express -->|Authenticated Proxy ML Calls| FastAPI
    Zustand <-->|WebSocket Real-time Sync| Realtime
    Express -->|Knex / Supabase Admin Client| DB
```

---

### 3. System Processing Flowchart

```mermaid
flowchart TD
    Start([User Accesses IMS Predictive]) --> AuthCheck{Authenticated?}
    AuthCheck -- No --> Login[Enter Email & Password / Role Selection]
    Login --> Authenticate[Supabase Auth Issues JWT Token]
    Authenticate --> RoleSplit{User Role?}
    AuthCheck -- Yes --> RoleSplit

    RoleSplit -- Retailer --> RetailerHome[Retailer Marketplace Dashboard]
    RoleSplit -- Supplier --> SupplierHome[Supplier Inventory Management Portal]

    %% Retailer Flow
    RetailerHome --> ActionRetailer{Select Action}
    ActionRetailer -- Browse Catalog --> ViewProducts[View Live Products & Real-time Badges]
    ActionRetailer -- View Smart Restock --> TriggerForecast[Request B2C Demand Forecast]
    ActionRetailer -- Checkout Cart --> SubmitOrder[POST /api/orders]

    TriggerForecast --> CallNodeFC[Express Proxy to FastAPI /ml/forecast]
    CallNodeFC --> RunProphet[Execute Meta Prophet Model / Fallback]
    RunProphet --> DisplayForecast[Display Projected Out Date & Auto-Fill Cart]

    SubmitOrder --> ExecRPC[Execute PostgreSQL Stored Procedure: place_order]
    ExecRPC --> RowLock[Lock Product Rows: SELECT ... FOR UPDATE]
    VerifyStock{Stock Available?}
    RowLock --> VerifyStock
    VerifyStock -- No --> AbortOrder[Rollback Transaction & Return 400 Error]
    VerifyStock -- Yes --> DeductStock[Deduct stock_qty & Create Order Row]
    DeductStock --> CommitTx[Commit Transaction]

    %% Real-time Sync
    CommitTx --> Broadcast[Supabase Realtime Emits db_change Event]
    Broadcast --> WSUpdate[WebSockets Push Updated Stock to All Clients]

    %% Supplier Flow
    SupplierHome --> ActionSupplier{Select Action}
    ActionSupplier -- Bulk CSV Upload --> UploadCSV[POST /api/inventory/bulk]
    ActionSupplier -- Procurement Analytics --> TriggerProcurement[Request B2B Procurement Forecast]

    UploadCSV --> ParseCSV[Validate Headers & Upsert Products]
    ParseCSV --> Broadcast

    TriggerProcurement --> CallNodeProc[Express Proxy to FastAPI /ml/procurement]
    CallNodeProc --> RunRF[Execute Random Forest Regressor]
    RunRF --> DisplayProcurement[Display 14-Day Production Priorities & Recommendations]

    WSUpdate --> End([UI Dynamically Updated Without Page Refresh])
    DisplayForecast --> End
    DisplayProcurement --> End
    AbortOrder --> End
```

---

## 🛠️ Technology Stack

*   **Frontend**: React (v19) + TypeScript + TailwindCSS + Zustand State Management.
*   **Core Gateway API**: Node.js + Express + TypeScript + Zod Payload Hardening + Helmet Security.
*   **Machine Learning Microservice**: Python (v3.10+) + FastAPI + Facebook Prophet (B2C demand curve time-series) + Scikit-Learn Random Forest Regressor (B2B wholesaler supply forecasting).
*   **Database & Real-time Synchronization**: Supabase (PostgreSQL) with row-level security (RLS) policies, transactional database functions (RPC), and real-time WebSocket replication.

---

## 🚀 Local Setup & Configuration

### Prerequisites
Ensure you have the following installed on your machine:
*   [Node.js](https://nodejs.org/) (v18+)
*   [Python](https://www.python.org/) (v3.10+)
*   [Supabase CLI](https://supabase.com/docs/guides/cli) (optional, or a Supabase cloud project)

---

### Step 1: Database Setup (Supabase)
1. Create a new project on [Supabase](https://supabase.com/).
2. Run the SQL schema script located at `supabase/migrations/20260701_initial_schema.sql` inside the Supabase SQL Editor to initialize tables, row-level security (RLS) policies, indexes, and transactional RPC functions.
3. Enable real-time updates for the `products` table in the database replication settings.

---

### Step 2: Node.js Express Backend Setup
1. Navigate to the gateway directory:
    ```bash
    cd backend-node
    ```
2. Install dependencies:
    ```bash
    npm install
    ```
3. Create a `.env` file from the `.env.example` template:
    ```env
    PORT=5000
    SUPABASE_URL=https://your-supabase-project.supabase.co
    SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
    PYTHON_ML_SERVICE_URL=http://localhost:8000
    INTERNAL_SECRET_TOKEN=your-shared-secure-token
    FRONTEND_URL=http://localhost:5173
    ```
4. Start the development server:
    ```bash
    npm run dev
    ```

---

### Step 3: Python ML Microservice Setup
1. Navigate to the Python microservice directory:
    ```bash
    cd backend-python
    ```
2. Create and activate a Python virtual environment:
    ```bash
    python -m venv venv
    # Windows:
    .\venv\Scripts\activate
    # macOS/Linux:
    source venv/bin/activate
    ```
3. Install the dependencies listed in `requirements.txt`:
    ```bash
    pip install -r requirements.txt
    ```
4. Create a `.env` file based on `.env.example`:
    ```env
    INTERNAL_SECRET_TOKEN=your-shared-secure-token
    PORT=8000
    ```
5. Start the FastAPI server:
    ```bash
    python main.py
    ```

---

### Step 4: React Frontend Setup
1. Navigate to the frontend workspace:
    ```bash
    cd frontend
    ```
2. Install dependencies:
    ```bash
    npm install
    ```
3. Create a `.env` file based on `.env.example`:
    ```env
    VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
    VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
    VITE_API_URL=http://localhost:5000
    ```
4. Start the Vite React app:
    ```bash
    npm run dev
    ```

---

## 🧪 Running Unit Tests

Both the frontend and backend Node service contain fully integrated Unit Test suites via Vitest:

### Run Backend Validator Tests:
```bash
cd backend-node
npm test
```

### Run Frontend Store Tests:
```bash
cd frontend
npm test
```

---

## 📡 API Endpoint Reference

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| **POST** | `/api/inventory/bulk` | Bulk upsert CSV items into catalog | JWT (Wholesaler) |
| **POST** | `/api/orders` | Process transaction and order checkout | JWT (Retailer) |
| **GET** | `/api/analytics/forecast` | Retrieve Prophet time-series customer demand forecasts | JWT (Retailer) |
| **PATCH** | `/api/orders/:id/status` | Update status (complete/cancel) for an order | JWT (Wholesaler) |
| **GET** | `/api/analytics/procurement` | Retrieve Random Forest B2B procurement advisor predictions | JWT (Wholesaler) |
| **GET** | `/health` | Gateway service status check | None |
