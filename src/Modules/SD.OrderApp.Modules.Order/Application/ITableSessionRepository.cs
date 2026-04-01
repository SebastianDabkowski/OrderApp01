using SD.OrderApp.Modules.Order.Domain;

namespace SD.OrderApp.Modules.Order.Application;

public interface ITableSessionRepository
{
    Task<TableSession?> GetActiveSessionByTableAsync(string tableIdentifier);
    Task<TableSession?> GetByIdAsync(Guid sessionId);
    Task AddAsync(TableSession session);
}
