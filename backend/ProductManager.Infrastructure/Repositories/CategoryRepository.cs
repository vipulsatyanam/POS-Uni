using Microsoft.EntityFrameworkCore;
using ProductManager.Application.Interfaces;
using ProductManager.Domain.Entities;
using ProductManager.Infrastructure.Data;

namespace ProductManager.Infrastructure.Repositories;

public class CategoryRepository : Repository<Category>, ICategoryRepository
{
    public CategoryRepository(AppDbContext db) : base(db) { }

    public Task<IEnumerable<Category>> GetAllOrderedAsync() =>
        Task.FromResult<IEnumerable<Category>>(
            _db.Categories.OrderBy(c => c.Name).ToList());
}
