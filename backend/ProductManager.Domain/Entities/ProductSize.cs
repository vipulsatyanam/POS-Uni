using ProductManager.Domain.Common;

namespace ProductManager.Domain.Entities;

public class ProductSize : BaseEntity
{
    public int ProductId { get; set; }
    public string Size { get; set; } = string.Empty;
    public Product Product { get; set; } = null!;
}
