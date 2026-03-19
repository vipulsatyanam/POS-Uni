using ProductManager.Domain.Common;

namespace ProductManager.Domain.Entities;

public class Category : BaseEntity
{
    public int TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ICollection<Product> Products { get; set; } = new List<Product>();
}
