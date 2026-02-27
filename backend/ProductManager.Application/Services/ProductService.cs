using ProductManager.Application.DTOs;
using ProductManager.Application.Interfaces;
using ProductManager.Domain.Entities;

namespace ProductManager.Application.Services;

public class ProductService : IProductService
{
    private readonly IProductRepository  _repo;
    private readonly ICategoryRepository _categoryRepo;

    public ProductService(IProductRepository repo, ICategoryRepository categoryRepo)
    {
        _repo = repo;
        _categoryRepo = categoryRepo;
    }

    public async Task<IEnumerable<ProductDto>> GetProductsAsync(string? search = null)
        => (await _repo.GetProductsWithDetailsAsync(search)).Select(ToDto);

    public async Task<ProductDto?> GetProductByIdAsync(int id)
    {
        var p = await _repo.GetProductWithDetailsAsync(id);
        return p is null ? null : ToDto(p);
    }

    public async Task<ProductDto> CreateProductAsync(CreateProductDto dto)
    {
        if (await _repo.SkuExistsAsync(dto.SKU))
            throw new InvalidOperationException($"SKU '{dto.SKU}' already exists.");

        // Load category once (single PK lookup) so DTO has CategoryName without a re-fetch
        var category = dto.CategoryId.HasValue
            ? await _categoryRepo.GetByIdAsync(dto.CategoryId.Value)
            : null;

        var product = new Product
        {
            Name       = dto.Name,
            SKU        = dto.SKU.ToUpper(),
            Barcode    = dto.Barcode,
            Price      = dto.Price,
            ImageUrl   = dto.ImageUrl,
            CategoryId = dto.CategoryId,
            Category   = category,
            Sizes      = dto.Sizes.Distinct().Select(s => new ProductSize { Size = s }).ToList(),
            Colors     = dto.Colors.Distinct().Select(c => new ProductColor { Color = c }).ToList(),
            Variants   = BuildVariants(dto.SKU, dto.Sizes, dto.Colors, dto.VariantBarcodes)
        };

        var created = await _repo.AddAsync(product); // EF sets all auto-generated IDs after save
        return ToDto(created);                       // map from memory — no second round-trip
    }

    public async Task<ProductDto> UpdateProductAsync(int id, UpdateProductDto dto)
    {
        var product = await _repo.GetProductWithDetailsAsync(id)
            ?? throw new KeyNotFoundException($"Product {id} not found.");

        if (await _repo.SkuExistsAsync(dto.SKU, id))
            throw new InvalidOperationException($"SKU '{dto.SKU}' already exists.");

        // Load category once for DTO (single PK lookup)
        var category = dto.CategoryId.HasValue
            ? await _categoryRepo.GetByIdAsync(dto.CategoryId.Value)
            : null;

        product.Name       = dto.Name;
        product.SKU        = dto.SKU.ToUpper();
        product.Barcode    = dto.Barcode;
        product.Price      = dto.Price;
        product.ImageUrl   = dto.ImageUrl;
        product.CategoryId = dto.CategoryId;
        product.Category   = category;
        product.UpdatedAt  = DateTime.UtcNow;
        product.Sizes      = dto.Sizes.Distinct().Select(s => new ProductSize { Size = s, ProductId = id }).ToList();
        product.Colors     = dto.Colors.Distinct().Select(c => new ProductColor { Color = c, ProductId = id }).ToList();
        product.Variants   = BuildVariants(dto.SKU, dto.Sizes, dto.Colors, dto.VariantBarcodes);

        await _repo.UpdateAsync(product); // UpdateAsync restores Sizes/Colors/Variants with DB IDs
        return ToDto(product);            // map from memory — no second round-trip
    }

    public async Task DeleteProductAsync(int id)
    {
        var product = await _repo.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"Product {id} not found.");
        await _repo.DeleteAsync(product);
    }

    // ─── Variant generation: cartesian product of Sizes × Colors ─────────────

    private static List<ProductVariant> BuildVariants(
        string baseSku, List<string> sizes, List<string> colors,
        List<VariantBarcodeDto> barcodes)
    {
        var variants = new List<ProductVariant>();
        var distinctSizes  = sizes.Distinct().Where(s => !string.IsNullOrWhiteSpace(s)).ToList();
        var distinctColors = colors.Distinct().Where(c => !string.IsNullOrWhiteSpace(c)).ToList();

        if (distinctSizes.Count > 0 && distinctColors.Count > 0)
        {
            foreach (var size in distinctSizes)
                foreach (var color in distinctColors)
                    variants.Add(NewVariant(baseSku, size, color, barcodes));
        }
        else if (distinctSizes.Count > 0)
        {
            foreach (var size in distinctSizes)
                variants.Add(NewVariant(baseSku, size, null, barcodes));
        }
        else if (distinctColors.Count > 0)
        {
            foreach (var color in distinctColors)
                variants.Add(NewVariant(baseSku, null, color, barcodes));
        }

        return variants;
    }

    private static ProductVariant NewVariant(
        string baseSku, string? size, string? color, List<VariantBarcodeDto> barcodes)
    {
        var parts = new[] { baseSku, size, color }
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .Select(p => p!.ToUpper().Replace(" ", "-"));

        var barcode = barcodes.FirstOrDefault(b =>
            string.Equals(b.Size, size, StringComparison.OrdinalIgnoreCase) &&
            string.Equals(b.Color, color, StringComparison.OrdinalIgnoreCase))?.Barcode;

        return new ProductVariant
        {
            Size    = size,
            Color   = color,
            SKU     = string.Join("-", parts),
            Barcode = barcode
        };
    }

    // ─── Mapping ──────────────────────────────────────────────────────────────

    private static ProductDto ToDto(Product p) => new()
    {
        Id           = p.Id,
        Name         = p.Name,
        SKU          = p.SKU,
        Barcode      = p.Barcode,
        Price        = p.Price,
        ImageUrl     = p.ImageUrl,
        CategoryId   = p.CategoryId,
        CategoryName = p.Category?.Name,
        Sizes        = p.Sizes.Select(s => s.Size).ToList(),
        Colors       = p.Colors.Select(c => c.Color).ToList(),
        Variants     = p.Variants.Select(v => new ProductVariantDto
        {
            Id              = v.Id,
            Size            = v.Size,
            Color           = v.Color,
            SKU             = v.SKU,
            Barcode         = v.Barcode,
            Stock           = v.Stock,
            PriceAdjustment = v.PriceAdjustment
        }).ToList(),
        CreatedAt = p.CreatedAt
    };
}
