using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ProductManager.Application.Interfaces;
using ProductManager.Domain.Entities;
using ProductManager.Infrastructure.Identity;

namespace ProductManager.Infrastructure.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    private readonly ITenantContext _tenantContext;

    public AppDbContext(DbContextOptions<AppDbContext> options, ITenantContext tenantContext)
        : base(options)
    {
        _tenantContext = tenantContext;
    }

    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<ProductSize> ProductSizes => Set<ProductSize>();
    public DbSet<ProductColor> ProductColors => Set<ProductColor>();
    public DbSet<ProductVariant> ProductVariants => Set<ProductVariant>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        base.OnModelCreating(mb);

        // ── Tenant ───────────────────────────────────────────────────────────
        mb.Entity<Tenant>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).IsRequired().HasMaxLength(200);
            e.Property(x => x.Slug).IsRequired().HasMaxLength(100);
            e.HasIndex(x => x.Slug).IsUnique();
            e.Property(x => x.Plan).HasMaxLength(50).HasDefaultValue("free");
        });

        // ── ApplicationUser ──────────────────────────────────────────────────
        mb.Entity<ApplicationUser>(e =>
        {
            e.Property(x => x.FirstName).HasMaxLength(100);
            e.Property(x => x.LastName).HasMaxLength(100);
            e.Property(x => x.TenantRole).HasMaxLength(50).HasDefaultValue("Staff");
            e.HasIndex(x => x.TenantId);
        });

        // ── Category (tenant-scoped) ──────────────────────────────────────────
        mb.Entity<Category>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).IsRequired().HasMaxLength(100);
            e.Property(x => x.Description).HasMaxLength(500);
            e.HasIndex(x => x.TenantId);
            e.HasQueryFilter(c => c.TenantId == _tenantContext.TenantId);
        });

        // ── Product (tenant-scoped) ──────────────────────────────────────────
        mb.Entity<Product>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).IsRequired().HasMaxLength(200);
            e.Property(x => x.SKU).IsRequired().HasMaxLength(100);
            // Per-tenant SKU uniqueness (same SKU allowed across different tenants)
            e.HasIndex(x => new { x.TenantId, x.SKU }).IsUnique();
            e.Property(x => x.Barcode).HasMaxLength(100);
            e.Property(x => x.Price).HasColumnType("decimal(18,2)");
            e.Property(x => x.ImageUrl).HasMaxLength(500);

            e.HasOne(x => x.Category)
             .WithMany(c => c.Products)
             .HasForeignKey(x => x.CategoryId)
             .OnDelete(DeleteBehavior.SetNull);

            e.HasIndex(x => x.TenantId);
            e.HasQueryFilter(p => p.TenantId == _tenantContext.TenantId);
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
    }
}
