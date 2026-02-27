using ProductManager.Application.DTOs;
using ProductManager.Application.Interfaces;
using ProductManager.Domain.Entities;

namespace ProductManager.Application.Services;

public class CategoryService : ICategoryService
{
    private readonly ICategoryRepository _repo;
    public CategoryService(ICategoryRepository repo) => _repo = repo;

    public async Task<IEnumerable<CategoryDto>> GetCategoriesAsync()
        => (await _repo.GetAllOrderedAsync()).Select(c => new CategoryDto
        {
            Id = c.Id, Name = c.Name, Description = c.Description
        });

    public async Task<CategoryDto> CreateCategoryAsync(CreateCategoryDto dto)
    {
        var cat = await _repo.AddAsync(new Category { Name = dto.Name, Description = dto.Description });
        return new CategoryDto { Id = cat.Id, Name = cat.Name, Description = cat.Description };
    }
}
