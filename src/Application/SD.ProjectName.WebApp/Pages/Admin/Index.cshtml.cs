using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SD.ProjectName.WebApp.Authorization;

namespace SD.ProjectName.WebApp.Pages.Admin
{
    [Authorize(Roles = Roles.Admin)]
    public class IndexModel : PageModel
    {
        private readonly ILogger<IndexModel> _logger;

        public IndexModel(ILogger<IndexModel> logger)
        {
            _logger = logger;
        }


      
    }
}
