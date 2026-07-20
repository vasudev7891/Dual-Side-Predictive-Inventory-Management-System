import os
import logging
from dotenv import load_dotenv

# Load local environment variables from .env file
load_dotenv()

import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestRegressor

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ims-ai-backend")

app = FastAPI(
    title="IMS AI microservice",
    description="Meta Prophet predictive forecasting microservice for B2B inventory analytics",
    version="1.0.0"
)

# Enable CORS for communication
ALLOWED_NODE_ORIGIN = os.getenv("NODE_BACKEND_URL", "http://localhost:5000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOWED_NODE_ORIGIN],
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["Authorization", "Content-Type"],
)

INTERNAL_SECRET_TOKEN = os.getenv("INTERNAL_SECRET_TOKEN")
if not INTERNAL_SECRET_TOKEN:
    logger.critical("INTERNAL_SECRET_TOKEN environment variable is not set. Exiting.")
    import sys
    sys.exit(1)

# Check Prophet availability
try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
    logger.info("Prophet engine loaded successfully.")
except ImportError:
    PROPHET_AVAILABLE = False
    logger.warning("Prophet package is not imported. Utilizing Heuristic fallback models.")

# Models definitions
class SalesLog(BaseModel):
    ds: str  # Timestamp
    y: float  # Quantity sold

class ForecastRequest(BaseModel):
    sku: str
    current_stock: int
    sales_history: List[SalesLog]

class ForecastPoint(BaseModel):
    date: str
    predicted_demand: float

class ForecastResponse(BaseModel):
    model_config = {
        "protected_namespaces": ()
    }
    sku: str
    current_stock: int
    projected_out_date: str
    suggested_restock_qty: int
    confidence_score: float
    trend: str  # "rising" | "falling" | "stable"
    model_used: str
    forecast_points: List[ForecastPoint]

def verify_token(authorization: Optional[str] = Header(None)):
    """Validates secret token shared between Express and FastAPI"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Internal authorization header is missing.")
    try:
        parts = authorization.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            raise HTTPException(status_code=401, detail="Invalid token scheme.")
        if parts[1] != INTERNAL_SECRET_TOKEN:
            raise HTTPException(status_code=403, detail="Forbidden: Shared secrets do not match.")
    except Exception:
        raise HTTPException(status_code=401, detail="Malformed authorization header.")

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "prophet_available": PROPHET_AVAILABLE,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/ml/forecast", response_model=ForecastResponse, dependencies=[Depends(verify_token)])
async def get_forecast(payload: ForecastRequest):
    try:
        sku = payload.sku
        current_stock = payload.current_stock
        sales = payload.sales_history

        if not sales:
            raise HTTPException(status_code=400, detail="Sales history is empty.")

        # 1. Parse into Pandas DataFrame
        data_list = [{"ds": log.ds, "y": log.y} for log in sales]
        df = pd.DataFrame(data_list)
        
        # Format dates, remove timezones to keep Prophet happy
        df['ds'] = pd.to_datetime(df['ds']).dt.tz_localize(None)
        
        # Group sales by day (normalize dates to calendar day)
        df['ds'] = df['ds'].dt.normalize()
        df_daily = df.groupby('ds', as_index=False)['y'].sum()

        # Sort chronologically
        df_daily = df_daily.sort_values('ds').reset_index(drop=True)
        
        # Safety Check: Prophet needs at least 2 data points, recommend >= 5 for meaningful trends
        use_prophet = PROPHET_AVAILABLE and len(df_daily) >= 5

        if use_prophet:
            try:
                # 2. Run Meta Prophet Model
                m = Prophet(
                    yearly_seasonality=False,
                    weekly_seasonality=True,
                    daily_seasonality=False,
                    interval_width=0.90 # 90% confidence bands
                )
                m.fit(df_daily)
                
                # Project next 14 days
                future = m.make_future_dataframe(periods=14, freq='D')
                forecast = m.predict(future)
                
                # Fetch future predictions (post historical range)
                future_forecast = forecast.iloc[-14:].reset_index(drop=True)
                
                # 3. Calculate Projected Out Date
                # Walk forward through predictions, subtracting from stock
                temp_stock = float(current_stock)
                out_days = 14
                out_date = None
                
                for idx, row in future_forecast.iterrows():
                    daily_demand = max(0.0, float(row['yhat']))
                    temp_stock -= daily_demand
                    if temp_stock <= 0:
                        out_days = idx + 1
                        # Map to correct calendar date
                        target_dt = future_forecast.loc[idx, 'ds']
                        out_date = target_dt.strftime('%Y-%m-%d')
                        break
                
                if not out_date:
                    # Stock lasts past 14 days, extrapolate
                    avg_future_demand = future_forecast['yhat'].mean()
                    if avg_future_demand > 0:
                        remaining_days = max(1, int(temp_stock / avg_future_demand))
                        target_dt = future_forecast.loc[13, 'ds'] + timedelta(days=remaining_days)
                        out_date = target_dt.strftime('%Y-%m-%d')
                    else:
                        out_date = (datetime.utcnow() + timedelta(days=90)).strftime('%Y-%m-%d')
                
                # 4. Calculate suggested restock quantity (2-week supply target)
                avg_demand = future_forecast['yhat'].mean()
                suggested_restock = math_round(avg_demand * 14)
                
                # Calculate Trend direction (Comparing last 7 days vs previous 7 days)
                recent_avg = future_forecast.iloc[7:14]['yhat'].mean()
                prior_avg = future_forecast.iloc[0:7]['yhat'].mean()
                
                trend = "stable"
                if recent_avg > prior_avg * 1.05:
                    trend = "rising"
                elif recent_avg < prior_avg * 0.95:
                    trend = "falling"
                
                points = []
                for _, row in future_forecast.iterrows():
                    points.append(ForecastPoint(
                        date=row['ds'].strftime('%Y-%m-%d'),
                        predicted_demand=max(0.0, float(row['yhat']))
                    ))

                return ForecastResponse(
                    sku=sku,
                    current_stock=current_stock,
                    projected_out_date=out_date,
                    suggested_restock_qty=max(10, suggested_restock),
                    confidence_score=0.92,
                    trend=trend,
                    model_used="Meta Prophet",
                    forecast_points=points
                )
            except Exception as fit_err:
                logger.error(f"Prophet fit failed for SKU {sku}: {fit_err}. Falling back to Heuristics.")
                use_prophet = False

        if not use_prophet:
            # Heuristic Moving Average Fallback Model
            # Calculate average daily sales from history
            total_sales = float(df_daily['y'].sum())
            unique_days = len(df_daily)
            
            # Daily rate
            avg_daily_demand = total_sales / max(1, unique_days)
            
            # Extrapolate depletion
            days_to_out = float(current_stock) / max(0.1, avg_daily_demand)
            out_date = (datetime.utcnow() + timedelta(days=max(1, int(days_to_out)))).strftime('%Y-%m-%d')
            
            # Suggest 14-day restock buffer
            suggested_restock = math_round(avg_daily_demand * 14)
            
            # Basic Trend Heuristic
            trend = "stable"
            if unique_days >= 3:
                recent_run = df_daily.iloc[-2:]['y'].mean()
                older_run = df_daily.iloc[:-2]['y'].mean()
                if recent_run > older_run * 1.05:
                    trend = "rising"
                elif recent_run < older_run * 0.95:
                    trend = "falling"

            points = []
            for day_offset in range(14):
                future_date = datetime.utcnow() + timedelta(days=day_offset)
                points.append(ForecastPoint(
                    date=future_date.strftime('%Y-%m-%d'),
                    predicted_demand=max(0.0, float(avg_daily_demand))
                ))

            return ForecastResponse(
                sku=sku,
                current_stock=current_stock,
                projected_out_date=out_date,
                suggested_restock_qty=max(10, suggested_restock),
                confidence_score=0.60, # Moderate confidence indicator
                trend=trend,
                model_used="Simple Moving Average (Heuristic Fallback)",
                forecast_points=points
            )
            
    except Exception as err:
        logger.error(f"Forecast process crashed: {err}")
        raise HTTPException(status_code=500, detail=f"Inference Engine Crash: {str(err)}")

# B2B Procurement Models
class ProcurementLog(BaseModel):
    sku: str
    date: str
    qty_ordered: int

class ProcurementRequest(BaseModel):
    order_history: List[ProcurementLog]

class SKUProcurementForecast(BaseModel):
    sku: str
    projected_14d_demand: int
    production_priority: str  # 'critical' | 'stable' | 'surplus'
    recommendation: str

class ProcurementResponse(BaseModel):
    model_config = {
        "protected_namespaces": ()
    }
    forecasts: List[SKUProcurementForecast]
    model_used: str

@app.post("/ml/procurement", response_model=ProcurementResponse, dependencies=[Depends(verify_token)])
async def get_procurement_forecast(payload: ProcurementRequest):
    try:
        logs = payload.order_history
        if not logs:
            return ProcurementResponse(forecasts=[], model_used="None (Empty Input)")

        # 1. Load into DataFrame
        df = pd.DataFrame([{"sku": log.sku, "date": log.date, "qty": log.qty_ordered} for log in logs])
        df['date'] = pd.to_datetime(df['date'])

        forecasts = []
        model_used = "Random Forest Regressor"

        # 2. Process per SKU
        for sku, group in df.groupby('sku'):
            # Group daily
            daily = group.groupby(df['date'].dt.normalize())['qty'].sum().reset_index()
            daily = daily.sort_values('date').reset_index(drop=True)

            if len(daily) < 5:
                # Fallback to simple average if data is sparse
                avg_val = daily['qty'].mean() if len(daily) > 0 else 5.0
                projected_14d = int(avg_val * 14)
                avg_daily = avg_val
                model_used = "Simple Average Fallback"
            else:
                # Train a RandomForestRegressor
                daily['day_of_week'] = daily['date'].dt.dayofweek
                daily['day_of_month'] = daily['date'].dt.day
                daily['t'] = np.arange(len(daily))

                X = daily[['day_of_week', 'day_of_month', 't']]
                y = daily['qty']

                rf = RandomForestRegressor(n_estimators=50, random_state=42)
                rf.fit(X, y)

                # Predict next 14 days
                last_date = daily['date'].max()
                future_dates = [last_date + timedelta(days=i) for i in range(1, 15)]
                future_df = pd.DataFrame({
                    'date': future_dates,
                    'day_of_week': [d.dayofweek for d in future_dates],
                    'day_of_month': [d.day for d in future_dates],
                    't': np.arange(len(daily), len(daily) + 14)
                })

                preds = rf.predict(future_df[['day_of_week', 'day_of_month', 't']])
                preds = np.clip(preds, 0, None)  # demand cannot be negative
                projected_14d = int(np.sum(preds))
                avg_daily = np.mean(preds)

            # Determine recommendation
            if avg_daily > 15:
                status = 'critical'
                recommendation = f"HIGH VELOCITY: ML predicts sustained high demand of ~{avg_daily:.1f} units/day. Increase output by 20%."
            elif avg_daily < 3:
                status = 'surplus'
                recommendation = f"LOW VELOCITY: ML predicts low demand of ~{avg_daily:.1f} units/day. Scale down production by 15%."
            else:
                status = 'stable'
                recommendation = f"STABLE DEMAND: ML predicts stable sales of ~{avg_daily:.1f} units/day. Maintain current baseline."

            forecasts.append(SKUProcurementForecast(
                sku=str(sku),
                projected_14d_demand=max(10, projected_14d),
                production_priority=status,
                recommendation=recommendation
            ))

        return ProcurementResponse(forecasts=forecasts, model_used=model_used)

    except Exception as err:
        logger.error(f"Procurement forecast crashed: {err}")
        raise HTTPException(status_code=500, detail=f"Procurement ML Engine Crash: {str(err)}")

def math_round(val: float) -> int:
    return int(val + 0.5)
