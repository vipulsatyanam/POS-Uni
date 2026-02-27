using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814

namespace ProductManager.Infrastructure.Migrations
{
    public partial class InitialCreate : Migration
    {
        protected override void Up(MigrationBuilder mb)
        {
            mb.CreateTable("Categories",
                t => new
                {
                    Id          = t.Column<int>(nullable: false).Annotation("SqlServer:Identity", "1, 1"),
                    Name        = t.Column<string>(maxLength: 100, nullable: false),
                    Description = t.Column<string>(maxLength: 500, nullable: true),
                    CreatedAt   = t.Column<DateTime>(nullable: false),
                    UpdatedAt   = t.Column<DateTime>(nullable: true)
                },
                constraints: t => t.PrimaryKey("PK_Categories", x => x.Id));

            mb.CreateTable("Products",
                t => new
                {
                    Id         = t.Column<int>(nullable: false).Annotation("SqlServer:Identity", "1, 1"),
                    Name       = t.Column<string>(maxLength: 200, nullable: false),
                    SKU        = t.Column<string>(maxLength: 100, nullable: false),
                    Barcode    = t.Column<string>(maxLength: 100, nullable: true),
                    Price      = t.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    ImageUrl   = t.Column<string>(maxLength: 500, nullable: true),
                    CategoryId = t.Column<int>(nullable: true),
                    CreatedAt  = t.Column<DateTime>(nullable: false),
                    UpdatedAt  = t.Column<DateTime>(nullable: true)
                },
                constraints: t =>
                {
                    t.PrimaryKey("PK_Products", x => x.Id);
                    t.ForeignKey("FK_Products_Categories_CategoryId", x => x.CategoryId,
                        "Categories", "Id", onDelete: ReferentialAction.SetNull);
                });

            mb.CreateTable("ProductSizes",
                t => new
                {
                    Id        = t.Column<int>(nullable: false).Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = t.Column<int>(nullable: false),
                    Size      = t.Column<string>(maxLength: 50, nullable: false),
                    CreatedAt = t.Column<DateTime>(nullable: false),
                    UpdatedAt = t.Column<DateTime>(nullable: true)
                },
                constraints: t =>
                {
                    t.PrimaryKey("PK_ProductSizes", x => x.Id);
                    t.ForeignKey("FK_ProductSizes_Products_ProductId", x => x.ProductId,
                        "Products", "Id", onDelete: ReferentialAction.Cascade);
                });

            mb.CreateTable("ProductColors",
                t => new
                {
                    Id        = t.Column<int>(nullable: false).Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = t.Column<int>(nullable: false),
                    Color     = t.Column<string>(maxLength: 50, nullable: false),
                    CreatedAt = t.Column<DateTime>(nullable: false),
                    UpdatedAt = t.Column<DateTime>(nullable: true)
                },
                constraints: t =>
                {
                    t.PrimaryKey("PK_ProductColors", x => x.Id);
                    t.ForeignKey("FK_ProductColors_Products_ProductId", x => x.ProductId,
                        "Products", "Id", onDelete: ReferentialAction.Cascade);
                });

            mb.CreateTable("ProductVariants",
                t => new
                {
                    Id              = t.Column<int>(nullable: false).Annotation("SqlServer:Identity", "1, 1"),
                    ProductId       = t.Column<int>(nullable: false),
                    Size            = t.Column<string>(maxLength: 50, nullable: true),
                    Color           = t.Column<string>(maxLength: 50, nullable: true),
                    SKU             = t.Column<string>(maxLength: 150, nullable: false),
                    PriceAdjustment = t.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    Stock           = t.Column<int>(nullable: false),
                    CreatedAt       = t.Column<DateTime>(nullable: false),
                    UpdatedAt       = t.Column<DateTime>(nullable: true)
                },
                constraints: t =>
                {
                    t.PrimaryKey("PK_ProductVariants", x => x.Id);
                    t.ForeignKey("FK_ProductVariants_Products_ProductId", x => x.ProductId,
                        "Products", "Id", onDelete: ReferentialAction.Cascade);
                });

            // Indexes
            mb.CreateIndex("IX_Products_SKU", "Products", "SKU", unique: true);
            mb.CreateIndex("IX_Products_CategoryId", "Products", "CategoryId");
            mb.CreateIndex("IX_ProductSizes_ProductId", "ProductSizes", "ProductId");
            mb.CreateIndex("IX_ProductColors_ProductId", "ProductColors", "ProductId");
            mb.CreateIndex("IX_ProductVariants_ProductId", "ProductVariants", "ProductId");

            // Seed categories
            mb.InsertData("Categories",
                new[] { "Id", "Name", "Description", "CreatedAt" },
                new object[,]
                {
                    { 1, "Electronics",  "Gadgets and devices",      new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
                    { 2, "Clothing",     "Apparel and fashion",       new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
                    { 3, "Footwear",     "Shoes and boots",           new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
                    { 4, "Accessories",  "Bags, belts, and more",     new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
                    { 5, "Food & Bev",   "Food and beverage products",new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) }
                });

            // EF history
            mb.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM __EFMigrationsHistory WHERE MigrationId = '20240101000000_InitialCreate')
                INSERT INTO __EFMigrationsHistory (MigrationId, ProductVersion) VALUES ('20240101000000_InitialCreate','8.0.0');
            ");
        }

        protected override void Down(MigrationBuilder mb)
        {
            mb.DropTable("ProductVariants");
            mb.DropTable("ProductSizes");
            mb.DropTable("ProductColors");
            mb.DropTable("Products");
            mb.DropTable("Categories");
        }
    }
}
