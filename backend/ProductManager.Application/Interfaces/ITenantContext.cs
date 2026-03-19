namespace ProductManager.Application.Interfaces;

/// <summary>
/// Provides the current authenticated tenant's ID.
/// Resolved from JWT claims on every request.
/// </summary>
public interface ITenantContext
{
    int TenantId { get; }
    bool HasTenant { get; }
}
