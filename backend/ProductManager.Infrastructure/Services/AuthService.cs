using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using ProductManager.Application.DTOs;
using ProductManager.Application.Interfaces;
using ProductManager.Domain.Entities;
using ProductManager.Infrastructure.Data;
using ProductManager.Infrastructure.Identity;

namespace ProductManager.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public AuthService(
        UserManager<ApplicationUser> userManager,
        AppDbContext db,
        IConfiguration config)
    {
        _userManager = userManager;
        _db = db;
        _config = config;
    }

    public async Task<AuthResponseDto> RegisterTenantAsync(RegisterTenantDto dto)
    {
        // Check slug uniqueness (no global filter on Tenants)
        if (await _db.Tenants.AnyAsync(t => t.Slug == dto.TenantSlug))
            throw new InvalidOperationException($"The slug '{dto.TenantSlug}' is already taken.");

        if (await _userManager.FindByEmailAsync(dto.Email) != null)
            throw new InvalidOperationException("An account with this email already exists.");

        // 1. Create tenant
        var tenant = new Tenant
        {
            Name = dto.TenantName,
            Slug = dto.TenantSlug,
            Plan = "free",
            IsActive = true
        };
        _db.Tenants.Add(tenant);
        await _db.SaveChangesAsync();

        // 2. Create owner user
        var user = new ApplicationUser
        {
            Email = dto.Email,
            UserName = dto.Email,
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            TenantId = tenant.Id,
            TenantRole = "Owner",
            EmailConfirmed = true
        };
        var result = await _userManager.CreateAsync(user, dto.Password);
        if (!result.Succeeded)
        {
            // Roll back tenant
            _db.Tenants.Remove(tenant);
            await _db.SaveChangesAsync();
            throw new InvalidOperationException(
                string.Join(" ", result.Errors.Select(e => e.Description)));
        }

        // 3. Seed default categories for this tenant
        //    (direct DbSet access; global query filter doesn't block inserts)
        var defaultCategories = new[]
        {
            new Category { Name = "Electronics",  Description = "Gadgets and devices",        TenantId = tenant.Id },
            new Category { Name = "Clothing",     Description = "Apparel and fashion",         TenantId = tenant.Id },
            new Category { Name = "Footwear",     Description = "Shoes and boots",             TenantId = tenant.Id },
            new Category { Name = "Accessories",  Description = "Bags, belts, and more",       TenantId = tenant.Id },
            new Category { Name = "Food & Bev",   Description = "Food and beverage products",  TenantId = tenant.Id }
        };
        await _db.Categories.AddRangeAsync(defaultCategories);
        await _db.SaveChangesAsync();

        return BuildResponse(user, tenant);
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email)
            ?? throw new UnauthorizedAccessException("Invalid email or password.");

        if (!await _userManager.CheckPasswordAsync(user, dto.Password))
            throw new UnauthorizedAccessException("Invalid email or password.");

        var tenant = await _db.Tenants.FindAsync(user.TenantId)
            ?? throw new UnauthorizedAccessException("Tenant not found or has been deactivated.");

        if (!tenant.IsActive)
            throw new UnauthorizedAccessException("Your account has been suspended. Please contact support.");

        return BuildResponse(user, tenant);
    }

    public async Task<UserInfoDto> GetCurrentUserAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        var tenant = await _db.Tenants.FindAsync(user.TenantId)
            ?? throw new KeyNotFoundException("Tenant not found.");

        return new UserInfoDto
        {
            Id = user.Id,
            Email = user.Email ?? string.Empty,
            FullName = user.FullName,
            Role = user.TenantRole,
            TenantId = tenant.Id,
            TenantName = tenant.Name,
            TenantSlug = tenant.Slug,
            Plan = tenant.Plan
        };
    }

    // ─── JWT Generation ───────────────────────────────────────────────────────

    private AuthResponseDto BuildResponse(ApplicationUser user, Tenant tenant)
    {
        var jwt = _config.GetSection("JwtSettings");
        var secret = jwt["Secret"] ?? throw new InvalidOperationException("JWT Secret not configured.");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiryDays = int.TryParse(jwt["ExpirationInDays"], out var d) ? d : 7;
        var expiresAt = DateTime.UtcNow.AddDays(expiryDays);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim("TenantId", tenant.Id.ToString()),
            new Claim("TenantSlug", tenant.Slug),
            new Claim("Role", user.TenantRole),
            new Claim("FullName", user.FullName)
        };

        var token = new JwtSecurityToken(
            issuer: jwt["Issuer"],
            audience: jwt["Audience"],
            claims: claims,
            expires: expiresAt,
            signingCredentials: creds
        );

        return new AuthResponseDto
        {
            Token = new JwtSecurityTokenHandler().WriteToken(token),
            Email = user.Email ?? string.Empty,
            FullName = user.FullName,
            Role = user.TenantRole,
            TenantId = tenant.Id,
            TenantName = tenant.Name,
            TenantSlug = tenant.Slug,
            Plan = tenant.Plan,
            ExpiresAt = expiresAt
        };
    }
}
