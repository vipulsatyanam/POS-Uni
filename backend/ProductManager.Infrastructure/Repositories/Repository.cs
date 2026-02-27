using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using ProductManager.Application.Interfaces;
using ProductManager.Domain.Common;
using ProductManager.Infrastructure.Data;

namespace ProductManager.Infrastructure.Repositories;

public class Repository<T> : IRepository<T> where T : BaseEntity
{
    protected readonly AppDbContext _db;
    protected readonly DbSet<T> _set;

    public Repository(AppDbContext db) { _db = db; _set = db.Set<T>(); }

    public Task<T?> GetByIdAsync(int id)                                   => _set.FindAsync(id).AsTask();
    public async Task<IEnumerable<T>> GetAllAsync()                        => await _set.ToListAsync();
    public async Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> p) => await _set.Where(p).ToListAsync();
    public Task<bool> ExistsAsync(Expression<Func<T, bool>> p)             => _set.AnyAsync(p);

    public async Task<T> AddAsync(T entity)
    {
        await _set.AddAsync(entity);
        await _db.SaveChangesAsync();
        return entity;
    }

    public async Task UpdateAsync(T entity)
    {
        _db.Entry(entity).State = EntityState.Modified;
        await _db.SaveChangesAsync();
    }

    public async Task DeleteAsync(T entity)
    {
        _set.Remove(entity);
        await _db.SaveChangesAsync();
    }
}
