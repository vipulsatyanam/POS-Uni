using Microsoft.AspNetCore.Mvc;
using ProductManager.Application.DTOs;
using ProductManager.Application.Interfaces;

namespace ProductManager.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly ICategoryService _svc;
    public CategoriesController(ICategoryService svc) => _svc = svc;

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await _svc.GetCategoriesAsync());

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCategoryDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        return Ok(await _svc.CreateCategoryAsync(dto));
    }
}
