using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using ProductManager.Application.Interfaces;

namespace ProductManager.Infrastructure.Data;

/// <summary>
/// Used by EF Core tooling (dotnet ef migrations add) at design time.
/// Provides a DbContext without requiring an HTTP request context.
/// </summary>
public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseSqlServer(
            "Server=DESKTOP-A3N43T6;Database=ProductManagerProDb_Dev;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True",
            sql => sql.MigrationsAssembly("ProductManager.Infrastructure"));

        return new AppDbContext(optionsBuilder.Options, new NoOpTenantContext());
    }
}

/// <summary>No-op tenant context for design-time migration generation.</summary>
internal class NoOpTenantContext : ITenantContext
{
    public int TenantId => 0;
    public bool HasTenant => false;
}
