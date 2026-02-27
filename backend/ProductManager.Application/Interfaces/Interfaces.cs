using System.Linq.Expressions;
using ProductManager.Application.DTOs;
using ProductManager.Domain.Common;
using ProductManager.Domain.Entities;

namespace ProductManager.Application.Interfaces;

// ─── Generic Repository ───────────────────────────────────────────────────────

public interface IRepository<T> where T : BaseEntity
{
    Task<T?> GetByIdAsync(int id);
    Task<IEnumerable<T>> GetAllAsync();
    Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate);
    Task<T> AddAsync(T entity);
    Task UpdateAsync(T entity);
    Task DeleteAsync(T entity);
    Task<bool> ExistsAsync(Expression<Func<T, bool>> predicate);
}

// ─── Product Repository ───────────────────────────────────────────────────────

public interface IProductRepository : IRepository<Product>
{
    Task<IEnumerable<Product>> GetProductsWithDetailsAsync(string? search = null);
    Task<Product?> GetProductWithDetailsAsync(int id);
    Task<bool> SkuExistsAsync(string sku, int? excludeId = null);
}

// ─── Category Repository ──────────────────────────────────────────────────────

public interface ICategoryRepository : IRepository<Category>
{
    Task<IEnumerable<Category>> GetAllOrderedAsync();
}

// ─── Services ─────────────────────────────────────────────────────────────────

public interface IProductService
{
    Task<IEnumerable<ProductDto>> GetProductsAsync(string? search = null);
    Task<ProductDto?> GetProductByIdAsync(int id);
    Task<ProductDto> CreateProductAsync(CreateProductDto dto);
    Task<ProductDto> UpdateProductAsync(int id, UpdateProductDto dto);
    Task DeleteProductAsync(int id);
}

public interface ICategoryService
{
    Task<IEnumerable<CategoryDto>> GetCategoriesAsync();
    Task<CategoryDto> CreateCategoryAsync(CreateCategoryDto dto);
}
