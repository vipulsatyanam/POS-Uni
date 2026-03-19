using ProductManager.Domain.Common;

namespace ProductManager.Domain.Entities;

public class Tenant : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    /// <summary>URL-friendly unique identifier (e.g. "acme-corp")</summary>
    public string Slug { get; set; } = string.Empty;

    /// <summary>Subscription plan: free | starter | pro | enterprise</summary>
    public string Plan { get; set; } = "free";

    public bool IsActive { get; set; } = true;
}
