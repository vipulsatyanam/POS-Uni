using Microsoft.EntityFrameworkCore;
using ProductManager.Application.Interfaces;
using ProductManager.Domain.Entities;
using ProductManager.Infrastructure.Data;

namespace ProductManager.Infrastructure.Repositories;

public class ProductRepository : Repository<Product>, IProductRepository
{
    public ProductRepository(AppDbContext db) : base(db) { }

    private IQueryable<Product> WithDetails() =>
        _db.Products
           .Include(p => p.Category)
           .Include(p => p.Sizes)
           .Include(p => p.Colors)
           .Include(p => p.Variants)
           .AsSplitQuery();

    public async Task<IEnumerable<Product>> GetProductsWithDetailsAsync(string? search = null)
    {
        var q = WithDetails();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var t = search.Trim().ToLower();
            q = q.Where(p =>
                p.Name.ToLower().Contains(t) ||
                p.SKU.ToLower().Contains(t) ||
                (p.Category != null && p.Category.Name.ToLower().Contains(t)));
        }
        return await q.OrderByDescending(p => p.CreatedAt).ToListAsync();
    }

    public Task<Product?> GetProductWithDetailsAsync(int id) =>
        WithDetails().FirstOrDefaultAsync(p => p.Id == id);

    public Task<bool> SkuExistsAsync(string sku, int? excludeId = null)
    {
        var q = _db.Products.Where(p => p.SKU == sku.ToUpper());
        if (excludeId.HasValue) q = q.Where(p => p.Id != excludeId.Value);
        return q.AnyAsync();
    }

    // Override UpdateAsync to handle child collection replacement
    public async Task UpdateAsync(Product entity)
    {
        // 1. Snapshot new child data as fresh (untracked) objects before touching the change tracker
        var newSizes = entity.Sizes.Select(s => new ProductSize
        {
            Size      = s.Size,
            ProductId = entity.Id
        }).ToList();

        var newColors = entity.Colors.Select(c => new ProductColor
        {
            Color     = c.Color,
            ProductId = entity.Id
        }).ToList();

        var newVariants = entity.Variants.Select(v => new ProductVariant
        {
            Size            = v.Size,
            Color           = v.Color,
            SKU             = v.SKU,
            Barcode         = v.Barcode,
            Stock           = v.Stock,
            PriceAdjustment = v.PriceAdjustment,
            ProductId       = entity.Id
        }).ToList();

        // 2. Detach everything — clean slate so no temporary-Id conflicts
        foreach (var entry in _db.ChangeTracker.Entries().ToList())
            entry.State = EntityState.Detached;

        // 3. Bulk-delete old children directly via SQL (bypasses change tracker entirely)
        await _db.Set<ProductSize>()   .Where(s => s.ProductId == entity.Id).ExecuteDeleteAsync();
        await _db.Set<ProductColor>()  .Where(c => c.ProductId == entity.Id).ExecuteDeleteAsync();
        await _db.Set<ProductVariant>().Where(v => v.ProductId == entity.Id).ExecuteDeleteAsync();

        // 4. Clear nav collections before re-attaching so EF doesn't auto-insert them again
        entity.Sizes    = [];
        entity.Colors   = [];
        entity.Variants = [];

        // 5. Re-attach entity and mark scalar fields as modified
        _db.Entry(entity).State = EntityState.Modified;

        // 6. Add new children
        await _db.Set<ProductSize>()   .AddRangeAsync(newSizes);
        await _db.Set<ProductColor>()  .AddRangeAsync(newColors);
        await _db.Set<ProductVariant>().AddRangeAsync(newVariants);

        await _db.SaveChangesAsync();

        // Restore saved collections (with DB-assigned IDs) back onto entity
        // so callers can build DTOs without a second DB round-trip
        entity.Sizes    = newSizes;
        entity.Colors   = newColors;
        entity.Variants = newVariants;
    }
}
