using ProductManager.Domain.Common;

namespace ProductManager.Domain.Entities;

public class ProductVariant : BaseEntity
{
    public int ProductId { get; set; }
    public string? Size { get; set; }
    public string? Color { get; set; }
    public string SKU { get; set; } = string.Empty;
    public string? Barcode { get; set; }
    public decimal? PriceAdjustment { get; set; }
    public int Stock { get; set; } = 0;
    public Product Product { get; set; } = null!;
}
