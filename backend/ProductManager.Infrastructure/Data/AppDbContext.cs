using Microsoft.EntityFrameworkCore;
using ProductManager.Domain.Entities;

namespace ProductManager.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Product> Products => Set<Product>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<ProductSize> ProductSizes => Set<ProductSize>();
    public DbSet<ProductColor> ProductColors => Set<ProductColor>();
    public DbSet<ProductVariant> ProductVariants => Set<ProductVariant>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        base.OnModelCreating(mb);

        // ── Category ─────────────────────────────────────────────────────────
        mb.Entity<Category>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).IsRequired().HasMaxLength(100);
            e.Property(x => x.Description).HasMaxLength(500);
        });

        // ── Product ──────────────────────────────────────────────────────────
        mb.Entity<Product>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).IsRequired().HasMaxLength(200);
            e.Property(x => x.SKU).IsRequired().HasMaxLength(100);
            e.HasIndex(x => x.SKU).IsUnique();
            e.Property(x => x.Barcode).HasMaxLength(100);
            e.Property(x => x.Price).HasColumnType("decimal(18,2)");
            e.Property(x => x.ImageUrl).HasMaxLength(500);

            e.HasOne(x => x.Category)
             .WithMany(c => c.Products)
             .HasForeignKey(x => x.CategoryId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        // ── ProductSize ───────────────────────────────────────────────────────
        mb.Entity<ProductSize>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Size).IsRequired().HasMaxLength(50);
            e.HasOne(x => x.Product)
             .WithMany(p => p.Sizes)
             .HasForeignKey(x => x.ProductId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── ProductColor ──────────────────────────────────────────────────────
        mb.Entity<ProductColor>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Color).IsRequired().HasMaxLength(50);
            e.HasOne(x => x.Product)
             .WithMany(p => p.Colors)
             .HasForeignKey(x => x.ProductId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── ProductVariant ────────────────────────────────────────────────────
        mb.Entity<ProductVariant>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.SKU).IsRequired().HasMaxLength(150);
            e.Property(x => x.Barcode).HasMaxLength(100);
            e.Property(x => x.Size).HasMaxLength(50);
            e.Property(x => x.Color).HasMaxLength(50);
            e.Property(x => x.PriceAdjustment).HasColumnType("decimal(18,2)");
            e.HasOne(x => x.Product)
             .WithMany(p => p.Variants)
             .HasForeignKey(x => x.ProductId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Seed Categories ───────────────────────────────────────────────────
        mb.Entity<Category>().HasData(
            new Category { Id = 1, Name = "Electronics",  Description = "Gadgets and devices",         CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Category { Id = 2, Name = "Clothing",     Description = "Apparel and fashion",          CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Category { Id = 3, Name = "Footwear",     Description = "Shoes and boots",              CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Category { Id = 4, Name = "Accessories",  Description = "Bags, belts, and more",        CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Category { Id = 5, Name = "Food & Bev",   Description = "Food and beverage products",   CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) }
        );
    }
}
