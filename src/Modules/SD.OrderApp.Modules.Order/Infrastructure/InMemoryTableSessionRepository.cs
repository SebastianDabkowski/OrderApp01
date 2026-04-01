using System.Collections.Concurrent;
using SD.OrderApp.Modules.Order.Application;
using SD.OrderApp.Modules.Order.Domain;

namespace SD.OrderApp.Modules.Order.Infrastructure;

public class InMemoryTableSessionRepository : ITableSessionRepository
{
    private readonly ConcurrentDictionary<Guid, TableSession> _sessions = new();

    public Task<TableSession?> GetActiveSessionByTableAsync(string tableIdentifier)
    {
        var session = _sessions.Values
            .FirstOrDefault(s => s.TableIdentifier == tableIdentifier && s.IsActive);
        return Task.FromResult(session);
    }

    public Task<TableSession?> GetByIdAsync(Guid sessionId)
    {
        _sessions.TryGetValue(sessionId, out var session);
        return Task.FromResult(session);
    }

    public Task AddAsync(TableSession session)
    {
        _sessions[session.Id] = session;
        return Task.CompletedTask;
    }
}
