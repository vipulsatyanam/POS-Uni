using System.ComponentModel.DataAnnotations;

namespace ProductManager.Application.DTOs;

// ─── Category ────────────────────────────────────────────────────────────────

public class CategoryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class CreateCategoryDto
{
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    [MaxLength(500)]
    public string? Description { get; set; }
}

// ─── Product ─────────────────────────────────────────────────────────────────

public class ProductVariantDto
{
    public int Id { get; set; }
    public string? Size { get; set; }
    public string? Color { get; set; }
    public string SKU { get; set; } = string.Empty;
    public int Stock { get; set; }
    public decimal? PriceAdjustment { get; set; }
}

public class ProductDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string SKU { get; set; } = string.Empty;
    public string? Barcode { get; set; }
    public decimal Price { get; set; }
    public string? ImageUrl { get; set; }
    public int? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public List<string> Sizes { get; set; } = new();
    public List<string> Colors { get; set; } = new();
    public List<ProductVariantDto> Variants { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}

public class CreateProductDto
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string SKU { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? Barcode { get; set; }

    [Required, Range(0, double.MaxValue, ErrorMessage = "Price must be >= 0")]
    public decimal Price { get; set; }

    public string? ImageUrl { get; set; }
    public int? CategoryId { get; set; }
    public List<string> Sizes { get; set; } = new();
    public List<string> Colors { get; set; } = new();
}

public class UpdateProductDto : CreateProductDto { }
