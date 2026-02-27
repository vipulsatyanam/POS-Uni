-- ================================================================
-- ProductManagerPro Database Setup Script
-- Run against your SQL Server instance
-- ================================================================

USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'ProductManagerProDb')
    CREATE DATABASE ProductManagerProDb;
GO

USE ProductManagerProDb;
GO

-- ── __EFMigrationsHistory (so EF doesn't re-run migration) ──────────────────
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='__EFMigrationsHistory' AND xtype='U')
CREATE TABLE __EFMigrationsHistory (
    MigrationId    NVARCHAR(150) NOT NULL,
    ProductVersion NVARCHAR(32)  NOT NULL,
    CONSTRAINT PK___EFMigrationsHistory PRIMARY KEY (MigrationId)
);
GO

-- ── Categories ───────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Categories' AND xtype='U')
CREATE TABLE Categories (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    Name        NVARCHAR(100) NOT NULL,
    Description NVARCHAR(500) NULL,
    CreatedAt   DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt   DATETIME2 NULL
);
GO

-- ── Products ─────────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Products' AND xtype='U')
CREATE TABLE Products (
    Id         INT IDENTITY(1,1) PRIMARY KEY,
    Name       NVARCHAR(200) NOT NULL,
    SKU        NVARCHAR(100) NOT NULL,
    Barcode    NVARCHAR(100) NULL,
    Price      DECIMAL(18,2) NOT NULL DEFAULT 0,
    ImageUrl   NVARCHAR(500) NULL,
    CategoryId INT NULL,
    CreatedAt  DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt  DATETIME2 NULL,
    CONSTRAINT FK_Products_Categories FOREIGN KEY (CategoryId)
        REFERENCES Categories(Id) ON DELETE SET NULL
);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ_Products_SKU')
    ALTER TABLE Products ADD CONSTRAINT UQ_Products_SKU UNIQUE (SKU);
GO

-- ── ProductSizes ──────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ProductSizes' AND xtype='U')
CREATE TABLE ProductSizes (
    Id        INT IDENTITY(1,1) PRIMARY KEY,
    ProductId INT NOT NULL,
    Size      NVARCHAR(50) NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NULL,
    CONSTRAINT FK_ProductSizes_Products FOREIGN KEY (ProductId)
        REFERENCES Products(Id) ON DELETE CASCADE
);
GO

-- ── ProductColors ─────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ProductColors' AND xtype='U')
CREATE TABLE ProductColors (
    Id        INT IDENTITY(1,1) PRIMARY KEY,
    ProductId INT NOT NULL,
    Color     NVARCHAR(50) NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NULL,
    CONSTRAINT FK_ProductColors_Products FOREIGN KEY (ProductId)
        REFERENCES Products(Id) ON DELETE CASCADE
);
GO

-- ── ProductVariants ───────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ProductVariants' AND xtype='U')
CREATE TABLE ProductVariants (
    Id              INT IDENTITY(1,1) PRIMARY KEY,
    ProductId       INT NOT NULL,
    Size            NVARCHAR(50) NULL,
    Color           NVARCHAR(50) NULL,
    SKU             NVARCHAR(150) NOT NULL,
    PriceAdjustment DECIMAL(18,2) NULL,
    Stock           INT NOT NULL DEFAULT 0,
    CreatedAt       DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt       DATETIME2 NULL,
    CONSTRAINT FK_ProductVariants_Products FOREIGN KEY (ProductId)
        REFERENCES Products(Id) ON DELETE CASCADE
);
GO

-- ── Seed Data ─────────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM Categories)
BEGIN
    SET IDENTITY_INSERT Categories ON;
    INSERT INTO Categories (Id, Name, Description, CreatedAt) VALUES
        (1, 'Electronics',  'Gadgets and devices',       '2024-01-01T00:00:00Z'),
        (2, 'Clothing',     'Apparel and fashion',        '2024-01-01T00:00:00Z'),
        (3, 'Footwear',     'Shoes and boots',            '2024-01-01T00:00:00Z'),
        (4, 'Accessories',  'Bags, belts, and more',      '2024-01-01T00:00:00Z'),
        (5, 'Food & Bev',   'Food and beverage products', '2024-01-01T00:00:00Z');
    SET IDENTITY_INSERT Categories OFF;

    INSERT INTO __EFMigrationsHistory (MigrationId, ProductVersion)
    VALUES ('20240101000000_InitialCreate','8.0.0');
END
GO

PRINT '✅ ProductManagerProDb setup complete.';
GO
