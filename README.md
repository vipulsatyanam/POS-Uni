# 🏪 ProductManager Pro — Full-Stack App

**.NET 8 Web API** (Clean Architecture) + **Angular 17** (Tailwind CSS + Preline UI)

---

## 📁 Project Structure

```
ProductManagerPro/
├── backend/
│   ├── ProductManager.sln
│   ├── ProductManager.API/                  ← Web API startup
│   │   ├── Controllers/
│   │   │   ├── ProductsController.cs
│   │   │   └── CategoriesController.cs
│   │   ├── Program.cs
│   │   └── app
│   ├── ProductManager.Application/          ← Business logic
│   │   ├── DTOs/Dtos.cs
│   │   ├── Interfaces/Interfaces.cs
│   │   └── Services/
│   │       ├── ProductService.cs            ← Variant generation logic
│   │       └── CategoryService.cs
│   ├── ProductManager.Domain/               ← Domain entities
│   │   ├── Common/BaseEntity.cs
│   │   └── Entities/
│   │       ├── Product.cs
│   │       ├── Category.cs
│   │       ├── ProductSize.cs
│   │       ├── ProductColor.cs
│   │       └── ProductVariant.cs
│   └── ProductManager.Infrastructure/       ← EF Core + repositories
│       ├── Data/AppDbContext.cs
│       ├── Migrations/
│       └── Repositories/
│           ├── Repository.cs
│           ├── ProductRepository.cs
│           └── CategoryRepository.cs
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   ├── models/product.model.ts
│   │   │   │   └── services/
│   │   │   │       ├── product.service.ts
│   │   │   │       ├── category.service.ts
│   │   │   │       └── toast.service.ts
│   │   │   ├── layout/
│   │   │   │   ├── shell/shell.component.ts
│   │   │   │   ├── sidebar/sidebar.component.ts
│   │   │   │   └── header/header.component.ts
│   │   │   └── features/
│   │   │       ├── pos/pos.component.ts
│   │   │       └── products/
│   │   │           ├── product-list/product-list.component.ts
│   │   │           └── product-dialog/product-dialog.component.ts
│   │   ├── environments/environment.ts
│   │   └── styles.css                       ← Tailwind + custom classes
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
│
└── database/
    └── setup.sql
```

---

## 🗄️ Database Schema

| Table | Columns | Notes |
|---|---|---|
| `Categories` | Id, Name, Description, CreatedAt | Seeded with 5 categories |
| `Products` | Id, Name, SKU (unique), Barcode, Price, ImageUrl, CategoryId, CreatedAt | FK → Categories |
| `ProductSizes` | Id, ProductId, Size | Cascade delete |
| `ProductColors` | Id, ProductId, Color | Cascade delete |
| `ProductVariants` | Id, ProductId, Size, Color, SKU, Stock, PriceAdjustment | Auto-generated |

### 🔀 Variant Generation Logic

```
Sizes:  [S, M]      Colors: [Red, Blue]
→ S-RED, S-BLUE, M-RED, M-BLUE

Sizes:  [S, M]      Colors: []
→ SKU-S, SKU-M

Sizes:  []          Colors: [Red, Blue]
→ SKU-RED, SKU-BLUE
```

---

## ⚙️ Prerequisites

| Tool | Version |
|---|---|
| .NET SDK | 8.0+ |
| Node.js | 18.0+ |
| npm | 9.0+ |
| SQL Server | 2019+ (Express/Developer OK) |
| VS Code | Latest |

### Recommended VS Code Extensions
```
ms-dotnettools.csdevkit          ← C# Dev Kit
angular.ng-template              ← Angular Language Service
bradlc.vscode-tailwindcss        ← Tailwind IntelliSense
ms-mssql.mssql                   ← SQL Server
```

---

## 🚀 Setup Instructions

### Step 1 — Database

**Option A: SQL Script (quick setup)**
```bash
# Open your SQL client (SSMS, Azure Data Studio, or sqlcmd)
# Run: database/setup.sql
```

**Option B: Let EF Core handle it**
The API auto-migrates on startup. Just configure the connection string.

### Step 2 — Backend

```bash
# Navigate to API project
cd backend/ProductManager.API

# Edit connection string in appsettings.json:
# "Server=localhost;Database=ProductManagerProDb;Trusted_Connection=True;TrustServerCertificate=True"

# Restore + run
cd ..
dotnet restore ProductManager.sln
cd ProductManager.API
dotnet run
# ✅ API starts at http://localhost:5000
# ✅ Swagger at http://localhost:5000/swagger
```

### Step 3 — Frontend

```bash
cd frontend

# Install dependencies (includes Tailwind + Preline)
npm install

# Start dev server
npm start
# ✅ App opens at http://localhost:4200
```

---

## 🔧 Connection String Options

**Windows Auth (trusted):**
```
Server=localhost;Database=ProductManagerProDb;Trusted_Connection=True;TrustServerCertificate=True
```

**SQL Server Auth:**
```
Server=localhost;Database=ProductManagerProDb;User Id=sa;Password=YourPass;TrustServerCertificate=True
```

**SQL Express:**
```
Server=localhost\SQLEXPRESS;Database=ProductManagerProDb;Trusted_Connection=True;TrustServerCertificate=True
```

---

## 🌐 API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/products` | List all (`?search=`) |
| GET | `/api/products/{id}` | Get by ID |
| POST | `/api/products` | Create + auto-generate variants |
| PUT | `/api/products/{id}` | Update product |
| DELETE | `/api/products/{id}` | Delete (cascades) |
| GET | `/api/categories` | List categories |
| POST | `/api/categories` | Create category |

### Create Product Body
```json
{
  "name": "Classic T-Shirt",
  "sku": "TEE-001",
  "barcode": "012345678901",
  "price": 29.99,
  "imageUrl": "https://example.com/img.jpg",
  "categoryId": 2,
  "sizes": ["S", "M", "L"],
  "colors": ["White", "Black"]
}
```

**Response includes 6 auto-generated variants:**
`TEE-001-S-WHITE`, `TEE-001-S-BLACK`, `TEE-001-M-WHITE`, `TEE-001-M-BLACK`, `TEE-001-L-WHITE`, `TEE-001-L-BLACK`

---

## 🎨 Frontend Features

| Feature | Detail |
|---|---|
| **Sidebar** | POS + Products navigation with active state |
| **Header** | Page title + "Add Product" button (Products page only) |
| **Products Table** | Image, SKU badge, Name, Category pill, Price, Variant chips |
| **Search** | Live debounced (350ms) across name, SKU, category |
| **Add/Edit Dialog** | Reactive form, dynamic size/color tags, live variant preview |
| **Toast System** | Success/error slide-up notifications |
| **Preline UI** | Form controls, selects |
| **Tailwind CSS** | Custom utility classes for layout, buttons, tags |

---

## 🏗️ EF Migrations (manual)

```bash
cd backend

# Add migration
dotnet ef migrations add YourMigrationName \
  --project ProductManager.Infrastructure \
  --startup-project ProductManager.API

# Apply to database
dotnet ef database update \
  --project ProductManager.Infrastructure \
  --startup-project ProductManager.API
```

---

## 🛠️ VS Code Tasks

Create `.vscode/launch.json` in `backend/` folder:
```json
{
  "version": "0.2.0",
  "configurations": [{
    "name": "Launch API",
    "type": "coreclr",
    "request": "launch",
    "preLaunchTask": "build",
    "program": "${workspaceFolder}/ProductManager.API/bin/Debug/net8.0/ProductManager.API.dll",
    "cwd": "${workspaceFolder}/ProductManager.API",
    "env": {
      "ASPNETCORE_ENVIRONMENT": "Development",
      "ASPNETCORE_URLS": "http://localhost:5000"
    }
  }]
}
```
