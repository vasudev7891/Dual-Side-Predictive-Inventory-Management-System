import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authenticateToken, requireRole } from './middleware/authMiddleware';
import { bulkUploadInventory } from './controllers/inventoryController';
import { placeOrder, updateOrderStatus } from './controllers/orderController';
import { getRetailerForecast } from './controllers/analyticsController';
import { getSupplierProcurement } from './controllers/procurementController';

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Apply security headers
app.use(helmet());
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Enable CORS for frontend interaction
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' })); // Allow larger payloads for bulk CSV text strings
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ==========================================
// Application Core Endpoints
// ==========================================

// 1. Supplier Inventory Bulk Upload (CSV)
app.post(
  '/api/inventory/bulk',
  authenticateToken as any,
  requireRole('supplier') as any,
  bulkUploadInventory as any
);

// 2. Retailer Checkout Order (Concurrent Row Locked)
app.post(
  '/api/orders',
  authenticateToken as any,
  requireRole('retailer') as any,
  placeOrder as any
);

// 3. Retailer B2C Demand Forecasting
app.get(
  '/api/analytics/forecast',
  authenticateToken as any,
  requireRole('retailer') as any,
  getRetailerForecast as any
);

// 4. Supplier Update Order Status
app.patch(
  '/api/orders/:id/status',
  authenticateToken as any,
  requireRole('supplier') as any,
  updateOrderStatus as any
);

// 5. Supplier B2B Procurement Forecasting
app.get(
  '/api/analytics/procurement',
  authenticateToken as any,
  requireRole('supplier') as any,
  getSupplierProcurement as any
);

// Start server listening
app.listen(PORT, () => {
  console.log(`[IMS Server] Node.js Express server running on port ${PORT}`);
});
