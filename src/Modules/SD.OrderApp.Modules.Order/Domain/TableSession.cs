namespace SD.OrderApp.Modules.Order.Domain;

public class TableSession
{
    public Guid Id { get; private set; }
    public string TableIdentifier { get; private set; } = default!;
    public DateTime CreatedAt { get; private set; }
    public DateTime ExpiresAt { get; private set; }
    public bool IsActive => DateTime.UtcNow < ExpiresAt;

    private readonly List<GuestSessionToken> _guestTokens = new();
    public IReadOnlyCollection<GuestSessionToken> GuestTokens => _guestTokens.AsReadOnly();

    private TableSession() { }

    public static TableSession Create(string tableIdentifier, TimeSpan sessionDuration)
    {
        if (string.IsNullOrWhiteSpace(tableIdentifier))
            throw new ArgumentException("Table identifier cannot be empty.", nameof(tableIdentifier));

        var now = DateTime.UtcNow;
        return new TableSession
        {
            Id = Guid.NewGuid(),
            TableIdentifier = tableIdentifier,
            CreatedAt = now,
            ExpiresAt = now.Add(sessionDuration)
        };
    }

    public GuestSessionToken AddGuest()
    {
        if (!IsActive)
            throw new InvalidOperationException("Cannot add guest to an expired session.");

        var token = GuestSessionToken.Create(Id);
        _guestTokens.Add(token);
        return token;
    }
}
