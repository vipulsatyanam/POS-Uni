using ProductManager.Domain.Common;

namespace ProductManager.Domain.Entities;

public class Product : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string SKU { get; set; } = string.Empty;
    public string? Barcode { get; set; }
    public decimal Price { get; set; }
    public string? ImageUrl { get; set; }
    public int? CategoryId { get; set; }
    public Category? Category { get; set; }
    public ICollection<ProductSize> Sizes { get; set; } = new List<ProductSize>();
    public ICollection<ProductColor> Colors { get; set; } = new List<ProductColor>();
    public ICollection<ProductVariant> Variants { get; set; } = new List<ProductVariant>();
}
