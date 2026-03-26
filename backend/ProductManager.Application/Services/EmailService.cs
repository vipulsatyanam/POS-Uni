using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using ProductManager.Application.Interfaces;

namespace ProductManager.Application.Services;

public class SmtpSettings
{
    public string Host      { get; set; } = string.Empty;
    public int    Port      { get; set; } = 587;
    public string Username  { get; set; } = string.Empty;
    public string Password  { get; set; } = string.Empty;
    public string FromEmail { get; set; } = string.Empty;
    public string FromName  { get; set; } = "POS Receipt";
}

public class EmailService : IEmailService
{
    private readonly SmtpSettings _smtp;

    public EmailService(SmtpSettings smtp)
    {
        _smtp = smtp;
    }

    public async Task SendAsync(string toEmail, string subject, string htmlBody)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_smtp.FromName, _smtp.FromEmail));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = subject;
        message.Body = new TextPart("html") { Text = htmlBody };

        using var client = new SmtpClient();
        client.AuthenticationMechanisms.Remove("XOAUTH2");
        await client.ConnectAsync(_smtp.Host, _smtp.Port, SecureSocketOptions.Auto);
        await client.AuthenticateAsync(_smtp.Username, _smtp.Password);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }
}
