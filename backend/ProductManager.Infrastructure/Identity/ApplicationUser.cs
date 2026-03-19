using Microsoft.AspNetCore.Identity;

namespace ProductManager.Infrastructure.Identity;

public class ApplicationUser : IdentityUser
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public int TenantId { get; set; }

    /// <summary>Role within the tenant: Owner | Manager | Staff</summary>
    public string TenantRole { get; set; } = "Staff";

    public string FullName => $"{FirstName} {LastName}".Trim();
}
