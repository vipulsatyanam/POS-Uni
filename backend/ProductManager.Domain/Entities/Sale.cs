using ProductManager.Domain.Common;

namespace ProductManager.Domain.Entities;

public class Sale : BaseEntity
{
    public int TenantId { get; set; }
    public string SaleNumber { get; set; } = string.Empty;
    public decimal SubTotal { get; set; }
    public decimal DiscountTotal { get; set; }
    public decimal Total { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public decimal AmountTendered { get; set; }
    public decimal Change { get; set; }
    public string? Notes { get; set; }
    public string Status { get; set; } = "completed";
    public ICollection<SaleItem> Items { get; set; } = new List<SaleItem>();
}

public class SaleItem : BaseEntity
{
    public int SaleId { get; set; }
    public Sale? Sale { get; set; }
    public int ProductId { get; set; }
    public int? VariantId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string SKU { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public decimal Discount { get; set; }
    public decimal LineTotal { get; set; }
    public string? Note { get; set; }
}
