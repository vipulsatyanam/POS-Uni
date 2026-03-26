using Microsoft.AspNetCore.Mvc;
using ProductManager.Application.DTOs;
using ProductManager.Application.Interfaces;

namespace ProductManager.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EmailController : ControllerBase
{
    private readonly IEmailService _emailService;

    public EmailController(IEmailService emailService)
    {
        _emailService = emailService;
    }

    [HttpPost("send-receipt")]
    public async Task<IActionResult> SendReceipt([FromBody] SendReceiptEmailDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            await _emailService.SendAsync(dto.ToEmail, dto.Subject, dto.HtmlBody);
            return Ok(new { message = "Receipt sent successfully." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to send email.", error = ex.Message });
        }
    }
}
