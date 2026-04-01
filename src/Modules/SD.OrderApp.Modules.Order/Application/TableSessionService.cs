using SD.OrderApp.Modules.Order.Domain;

namespace SD.OrderApp.Modules.Order.Application;

public class TableSessionService : ITableSessionService
{
    private static readonly TimeSpan DefaultSessionDuration = TimeSpan.FromHours(4);

    private readonly ITableSessionRepository _repository;

    public TableSessionService(ITableSessionRepository repository)
    {
        _repository = repository;
    }

    public async Task<TableSessionDto> StartOrJoinSessionAsync(string tableIdentifier)
    {
        if (string.IsNullOrWhiteSpace(tableIdentifier))
            throw new ArgumentException("Table identifier cannot be empty.", nameof(tableIdentifier));

        var session = await _repository.GetActiveSessionByTableAsync(tableIdentifier);

        if (session is null)
        {
            session = TableSession.Create(tableIdentifier, DefaultSessionDuration);
            await _repository.AddAsync(session);
        }

        var guestToken = session.AddGuest();

        return new TableSessionDto
        {
            SessionId = session.Id,
            TableIdentifier = session.TableIdentifier,
            GuestToken = guestToken.Token,
            ExpiresAt = session.ExpiresAt
        };
    }
}
