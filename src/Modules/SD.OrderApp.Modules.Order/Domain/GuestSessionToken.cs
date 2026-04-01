namespace SD.OrderApp.Modules.Order.Domain;

public class GuestSessionToken
{
    public Guid Id { get; private set; }
    public Guid TableSessionId { get; private set; }
    public string Token { get; private set; } = default!;
    public DateTime CreatedAt { get; private set; }

    private GuestSessionToken() { }

    internal static GuestSessionToken Create(Guid tableSessionId)
    {
        return new GuestSessionToken
        {
            Id = Guid.NewGuid(),
            TableSessionId = tableSessionId,
            Token = GenerateToken(),
            CreatedAt = DateTime.UtcNow
        };
    }

    private static string GenerateToken()
    {
        var bytes = new byte[32];
        using var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes);
    }
}
