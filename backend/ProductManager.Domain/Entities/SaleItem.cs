using ProductManager.Domain.Common;

namespace ProductManager.Domain.Entities;

public class SaleItem : BaseEntity
{
    public int SaleId { get; set; }
    public int ProductId { get; set; }
    public int? ProductVariantId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string? VariantSku { get; set; }
    public string? VariantSize { get; set; }
    public string? VariantColor { get; set; }
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal LineTotal { get; set; }
    public Sale Sale { get; set; } = null!;
}
