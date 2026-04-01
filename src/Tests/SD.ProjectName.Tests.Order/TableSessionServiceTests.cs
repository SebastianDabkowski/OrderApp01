using Moq;
using SD.OrderApp.Modules.Order.Application;
using SD.OrderApp.Modules.Order.Domain;

namespace SD.ProjectName.Tests.Order;

public class TableSessionServiceTests
{
    private readonly Mock<ITableSessionRepository> _repositoryMock;
    private readonly TableSessionService _service;

    public TableSessionServiceTests()
    {
        _repositoryMock = new Mock<ITableSessionRepository>();
        _service = new TableSessionService(_repositoryMock.Object);
    }

    [Fact]
    public async Task StartOrJoinSession_NewTable_CreatesNewSession()
    {
        _repositoryMock
            .Setup(r => r.GetActiveSessionByTableAsync("table-5"))
            .ReturnsAsync((TableSession?)null);

        var result = await _service.StartOrJoinSessionAsync("table-5");

        Assert.NotEqual(Guid.Empty, result.SessionId);
        Assert.Equal("table-5", result.TableIdentifier);
        Assert.NotNull(result.GuestToken);
        Assert.True(result.ExpiresAt > DateTime.UtcNow);
        _repositoryMock.Verify(r => r.AddAsync(It.IsAny<TableSession>()), Times.Once);
    }

    [Fact]
    public async Task StartOrJoinSession_ExistingActiveSession_JoinsExistingSession()
    {
        var existingSession = TableSession.Create("table-5", TimeSpan.FromHours(4));
        _repositoryMock
            .Setup(r => r.GetActiveSessionByTableAsync("table-5"))
            .ReturnsAsync(existingSession);

        var result = await _service.StartOrJoinSessionAsync("table-5");

        Assert.Equal(existingSession.Id, result.SessionId);
        Assert.Equal("table-5", result.TableIdentifier);
        Assert.NotNull(result.GuestToken);
        _repositoryMock.Verify(r => r.AddAsync(It.IsAny<TableSession>()), Times.Never);
    }

    [Fact]
    public async Task StartOrJoinSession_MultipleGuests_SameSession()
    {
        var existingSession = TableSession.Create("table-5", TimeSpan.FromHours(4));
        _repositoryMock
            .Setup(r => r.GetActiveSessionByTableAsync("table-5"))
            .ReturnsAsync(existingSession);

        var result1 = await _service.StartOrJoinSessionAsync("table-5");
        var result2 = await _service.StartOrJoinSessionAsync("table-5");

        Assert.Equal(result1.SessionId, result2.SessionId);
        Assert.NotEqual(result1.GuestToken, result2.GuestToken);
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData(null)]
    public async Task StartOrJoinSession_InvalidTableIdentifier_ThrowsArgumentException(string? tableIdentifier)
    {
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.StartOrJoinSessionAsync(tableIdentifier!));
    }
}
