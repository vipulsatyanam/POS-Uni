using System.ComponentModel.DataAnnotations;

namespace ProductManager.Application.DTOs;

// ─── Register ────────────────────────────────────────────────────────────────

public class RegisterTenantDto
{
    [Required, MaxLength(200)]
    public string TenantName { get; set; } = string.Empty;

    [Required, MaxLength(100), RegularExpression(@"^[a-z0-9-]+$",
        ErrorMessage = "Slug must be lowercase letters, numbers and hyphens only.")]
    public string TenantSlug { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(6)]
    public string Password { get; set; } = string.Empty;
}

// ─── Login ───────────────────────────────────────────────────────────────────

public class LoginDto
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

// ─── Responses ───────────────────────────────────────────────────────────────

public class AuthResponseDto
{
    public string Token { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public int TenantId { get; set; }
    public string TenantName { get; set; } = string.Empty;
    public string TenantSlug { get; set; } = string.Empty;
    public string Plan { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}

public class UserInfoDto
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public int TenantId { get; set; }
    public string TenantName { get; set; } = string.Empty;
    public string TenantSlug { get; set; } = string.Empty;
    public string Plan { get; set; } = string.Empty;
}
