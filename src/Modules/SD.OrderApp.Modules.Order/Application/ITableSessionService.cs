namespace SD.OrderApp.Modules.Order.Application;

public interface ITableSessionService
{
    Task<TableSessionDto> StartOrJoinSessionAsync(string tableIdentifier);
}
