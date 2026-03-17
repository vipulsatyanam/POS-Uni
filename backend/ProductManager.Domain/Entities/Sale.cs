using ProductManager.Domain.Common;

namespace ProductManager.Domain.Entities;

public class Sale : BaseEntity
{
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
