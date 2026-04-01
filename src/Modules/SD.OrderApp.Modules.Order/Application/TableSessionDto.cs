namespace SD.OrderApp.Modules.Order.Application;

public class TableSessionDto
{
    public Guid SessionId { get; set; }
    public string TableIdentifier { get; set; } = default!;
    public string GuestToken { get; set; } = default!;
    public DateTime ExpiresAt { get; set; }
}
