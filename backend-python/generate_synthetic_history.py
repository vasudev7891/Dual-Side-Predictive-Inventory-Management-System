import os
import requests
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environmental variables from env.local or system environment
# Try loading from different locations
load_dotenv(dotenv_path="../backend-node/.env")
load_dotenv(dotenv_path="./.env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
  print("CRITICAL ERROR: Environment variables SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY are missing.")
  print("Ensure you have set them in a .env file.")
  exit(1)

# API Configurations
HEADERS = {
  "apikey": SUPABASE_SERVICE_ROLE_KEY,
  "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
  "Content-Type": "application/json",
  "Prefer": "return=representation"
}

def create_auth_user(email, password, full_name):
  """Creates a user in Supabase auth system using the Admin API"""
  url = f"{SUPABASE_URL}/auth/v1/admin/users"
  payload = {
    "email": email,
    "password": password,
    "email_confirm": True,
    "user_metadata": { "full_name": full_name }
  }
  
  # Check if user already exists by trying to fetch profiles first
  print(f"Checking if user '{email}' already exists...")
  profile_check_url = f"{SUPABASE_URL}/rest/v1/profiles?select=id&id=eq.auth_user"
  # Let's search auth users instead. We can list users or just try creating and check for 400.
  response = requests.post(url, headers=HEADERS, json=payload)
  
  if response.status_code in [200, 201]:
    user_id = response.json()["id"]
    print(f"Resolved Auth User: {email} with ID {user_id}")
    return user_id
  elif response.status_code == 400 or response.status_code == 422:
    # User might already exist, let's query the profiles table for that email prefix
    name_prefix = email.split('@')[0]
    profile_url = f"{SUPABASE_URL}/rest/v1/profiles?select=id&full_name=eq.{name_prefix}"
    p_resp = requests.get(profile_url, headers=HEADERS)
    if p_resp.status_code == 200 and p_resp.json():
      user_id = p_resp.json()[0]["id"]
      print(f"Auth User '{email}' already exists with profile ID: {user_id}")
      return user_id
    else:
      # If profile is missing but user exists in auth.users
      print(f"User '{email}' already exists in Auth, but profile was not resolved. Please verify tables.")
      # Let's try listing users to fetch the id
      users_url = f"{SUPABASE_URL}/auth/v1/admin/users?select=id&email=eq.{email}"
      # Wait, Postgrest endpoint for listing users:
      list_resp = requests.get(f"{SUPABASE_URL}/auth/v1/admin/users", headers=HEADERS)
      if list_resp.status_code == 200:
        for u in list_resp.json().get("users", []):
          if u["email"] == email:
            print(f"Resolved User ID from list: {u['id']}")
            return u["id"]
      raise Exception(f"Failed to resolve user ID for existing user: {response.text}")
  else:
    raise Exception(f"Failed to create Auth user {email}: {response.status_code} - {response.text}")

def create_profile(user_id, role, full_name):
  """Creates a database profile row"""
  url = f"{SUPABASE_URL}/rest/v1/profiles"
  
  # Check if exists
  check_resp = requests.get(f"{url}?id=eq.{user_id}", headers=HEADERS)
  if check_resp.status_code == 200 and len(check_resp.json()) > 0:
    print(f"Profile for {full_name} ({role}) already exists.")
    return
    
  payload = {
    "id": user_id,
    "role": role,
    "full_name": full_name
  }
  response = requests.post(url, headers=HEADERS, json=payload)
  if response.status_code == 201:
    print(f"Created Profile: {full_name} as {role}")
  else:
    print(f"Warning: Profile creation returned status {response.status_code}: {response.text}")

def insert_product(supplier_id, sku, name, price, stock):
  """Inserts a default catalog product"""
  url = f"{SUPABASE_URL}/rest/v1/products"
  
  # Check if SKU exists
  check_resp = requests.get(f"{url}?supplier_id=eq.{supplier_id}&sku=eq.{sku}", headers=HEADERS)
  if check_resp.status_code == 200 and len(check_resp.json()) > 0:
    print(f"Product {name} ({sku}) already exists. ID: {check_resp.json()[0]['id']}")
    return check_resp.json()[0]["id"]
    
  payload = {
    "supplier_id": supplier_id,
    "sku": sku,
    "name": name,
    "price": price,
    "stock_qty": stock
  }
  response = requests.post(url, headers=HEADERS, json=payload)
  if response.status_code == 201:
    prod_id = response.json()[0]["id"]
    print(f"Created Product {name} ({sku}) with ID {prod_id}")
    return prod_id
  else:
    raise Exception(f"Failed to insert product: {response.text}")

def seed_data():
  try:
    print("=== STARTING SYNTHETIC DATA SEEDING SYSTEM ===")
    
    # 1. Create Auth Users and Profiles
    supplier_id = create_auth_user("supplier@test.com", "Password123!", "Wholesale Supplier Inc")
    create_profile(supplier_id, "supplier", "Wholesale Supplier Inc")

    retailer_id = create_auth_user("retailer@test.com", "Password123!", "Corner Groceries")
    create_profile(retailer_id, "retailer", "Corner Groceries")

    # 2. Insert Products Catalog
    products_catalog = [
      {"sku": "APPL-001", "name": "Red Honeycrisp Apples", "price": 1.50, "stock": 420, "base_sales": 15, "peak_sales": 10},
      {"sku": "BANA-001", "name": "Organic Cavendish Bananas", "price": 0.80, "stock": 650, "base_sales": 25, "peak_sales": 15},
      {"sku": "MILK-001", "name": "Whole Organic Milk Gallon", "price": 3.49, "stock": 180, "base_sales": 12, "peak_sales": 6},
      {"sku": "BRED-001", "name": "Sourdough Bread Loaf", "price": 2.29, "stock": 240, "base_sales": 10, "peak_sales": 8},
      {"sku": "CHSE-001", "name": "Sharp Cheddar Block 500g", "price": 4.99, "stock": 110, "base_sales": 6, "peak_sales": 4}
    ]

    inserted_products = []
    for item in products_catalog:
      p_id = insert_product(supplier_id, item["sku"], item["name"], item["price"], item["stock"])
      inserted_products.append({
        "id": p_id,
        "sku": item["sku"],
        "base_sales": item["base_sales"],
        "peak_sales": item["peak_sales"]
      })

    # 3. Generate 90 Days of Sales History
    print("\nGenerating 90 days of daily sales logs history...")
    sales_logs = []
    start_date = datetime.utcnow() - timedelta(days=90)
    
    # Check if sales history already exists
    check_sales_url = f"{SUPABASE_URL}/rest/v1/sales_history?select=id&limit=1"
    sales_check_resp = requests.get(check_sales_url, headers=HEADERS)
    if sales_check_resp.status_code == 200 and len(sales_check_resp.json()) > 0:
      print("Database already contains sales logs history. Skipping generation.")
      print("=== SEEDING COMPLETED SUCCESSFULLY ===")
      return

    for day_offset in range(90):
      current_day = start_date + timedelta(days=day_offset)
      day_of_week = current_day.weekday() # 0 = Monday, 6 = Sunday
      is_weekend = day_of_week in [4, 5] # Friday and Saturday peak
      
      for p in inserted_products:
        base = p["base_sales"]
        peak = p["peak_sales"] if is_weekend else 0
        noise = random.randint(-3, 3)
        
        qty_sold = max(1, base + peak + noise)
        
        sales_logs.append({
          "retailer_id": retailer_id,
          "product_id": p["id"],
          "qty_sold": qty_sold,
          "sold_at": current_day.isoformat()
        })
        
    # Bulk insert sales logs in chunks of 100 rows to optimize Postgrest performance
    chunk_size = 100
    total_inserted = 0
    for i in range(0, len(sales_logs), chunk_size):
      chunk = sales_logs[i:i+chunk_size]
      resp = requests.post(f"{SUPABASE_URL}/rest/v1/sales_history", headers=HEADERS, json=chunk)
      if resp.status_code == 201:
        total_inserted += len(chunk)
      else:
        print(f"Failed to insert sales history chunk: {resp.text}")
        break

    print(f"Successfully seeded {total_inserted} historical daily sales records.")
    print("=== SEEDING COMPLETED SUCCESSFULLY ===")

  except Exception as e:
    print(f"CRITICAL SEEDING FAULT: {e}")

if __name__ == "__main__":
  seed_data()
