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
        var existing = await WithDetails().FirstOrDefaultAsync(p => p.Id == entity.Id);
        if (existing is null) return;

        // Remove old children
        _db.Set<ProductSize>().RemoveRange(existing.Sizes);
        _db.Set<ProductColor>().RemoveRange(existing.Colors);
        _db.Set<ProductVariant>().RemoveRange(existing.Variants);

        // Apply scalar changes
        _db.Entry(existing).CurrentValues.SetValues(entity);

        // Add new children
        foreach (var s in entity.Sizes)   { s.ProductId = entity.Id; existing.Sizes.Add(s); }
        foreach (var c in entity.Colors)  { c.ProductId = entity.Id; existing.Colors.Add(c); }
        foreach (var v in entity.Variants) { v.ProductId = entity.Id; existing.Variants.Add(v); }

        await _db.SaveChangesAsync();
    }
}
