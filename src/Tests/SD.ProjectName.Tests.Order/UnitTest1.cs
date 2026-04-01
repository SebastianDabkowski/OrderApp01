using SD.OrderApp.Modules.Order.Domain;

namespace SD.ProjectName.Tests.Order;

public class TableSessionTests
{
    [Fact]
    public void Create_WithValidTableIdentifier_CreatesSession()
    {
        var session = TableSession.Create("table-1", TimeSpan.FromHours(4));

        Assert.NotEqual(Guid.Empty, session.Id);
        Assert.Equal("table-1", session.TableIdentifier);
        Assert.True(session.IsActive);
        Assert.Empty(session.GuestTokens);
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData(null)]
    public void Create_WithInvalidTableIdentifier_ThrowsArgumentException(string? tableIdentifier)
    {
        Assert.Throws<ArgumentException>(() =>
            TableSession.Create(tableIdentifier!, TimeSpan.FromHours(4)));
    }

    [Fact]
    public void AddGuest_ToActiveSession_ReturnsGuestToken()
    {
        var session = TableSession.Create("table-1", TimeSpan.FromHours(4));

        var token = session.AddGuest();

        Assert.NotNull(token);
        Assert.NotNull(token.Token);
        Assert.Equal(session.Id, token.TableSessionId);
        Assert.Single(session.GuestTokens);
    }

    [Fact]
    public void AddGuest_MultipleGuests_AllLinkedToSameSession()
    {
        var session = TableSession.Create("table-1", TimeSpan.FromHours(4));

        var token1 = session.AddGuest();
        var token2 = session.AddGuest();
        var token3 = session.AddGuest();

        Assert.Equal(3, session.GuestTokens.Count);
        Assert.All(session.GuestTokens, t => Assert.Equal(session.Id, t.TableSessionId));
        Assert.NotEqual(token1.Token, token2.Token);
        Assert.NotEqual(token2.Token, token3.Token);
    }

    [Fact]
    public void AddGuest_ToExpiredSession_ThrowsInvalidOperationException()
    {
        var session = TableSession.Create("table-1", TimeSpan.Zero);

        Assert.Throws<InvalidOperationException>(() => session.AddGuest());
    }

    [Fact]
    public void IsActive_WithFutureExpiry_ReturnsTrue()
    {
        var session = TableSession.Create("table-1", TimeSpan.FromHours(4));

        Assert.True(session.IsActive);
    }

    [Fact]
    public void IsActive_WithPastExpiry_ReturnsFalse()
    {
        var session = TableSession.Create("table-1", TimeSpan.Zero);

        Assert.False(session.IsActive);
    }
}

