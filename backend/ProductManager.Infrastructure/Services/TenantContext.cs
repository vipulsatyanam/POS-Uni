using Microsoft.AspNetCore.Http;
using ProductManager.Application.Interfaces;

namespace ProductManager.Infrastructure.Services;

/// <summary>
/// Reads the current tenant ID from the authenticated user's JWT claims.
/// Registered as Scoped — one instance per HTTP request.
/// </summary>
public class TenantContext : ITenantContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public TenantContext(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public int TenantId
    {
        get
        {
            var claim = _httpContextAccessor.HttpContext?.User.FindFirst("TenantId");
            return claim != null && int.TryParse(claim.Value, out var id) ? id : 0;
        }
    }

    public bool HasTenant => TenantId > 0;
}
