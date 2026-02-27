using ProductManager.Domain.Common;

namespace ProductManager.Domain.Entities;

public class ProductColor : BaseEntity
{
    public int ProductId { get; set; }
    public string Color { get; set; } = string.Empty;
    public Product Product { get; set; } = null!;
}
