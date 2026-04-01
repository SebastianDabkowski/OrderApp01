using Microsoft.AspNetCore.Mvc;
using SD.OrderApp.Modules.Order.Application;

namespace SD.OrderApp.WebApp.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TableSessionController : ControllerBase
{
    private readonly ITableSessionService _tableSessionService;

    public TableSessionController(ITableSessionService tableSessionService)
    {
        _tableSessionService = tableSessionService;
    }

    [HttpPost("start")]
    public async Task<IActionResult> StartSession([FromBody] StartSessionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.TableIdentifier))
            return BadRequest(new { error = "Table identifier is required." });

        var result = await _tableSessionService.StartOrJoinSessionAsync(request.TableIdentifier);
        return Ok(result);
    }
}

public class StartSessionRequest
{
    public string TableIdentifier { get; set; } = default!;
}
