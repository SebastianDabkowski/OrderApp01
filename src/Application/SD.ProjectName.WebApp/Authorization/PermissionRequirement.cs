using Microsoft.AspNetCore.Authorization;

namespace SD.ProjectName.WebApp.Authorization
{
    /// <summary>
    /// Authorization requirement that checks if a user has a specific permission.
    /// </summary>
    public class PermissionRequirement : IAuthorizationRequirement
    {
        public string PermissionCode { get; }

        public PermissionRequirement(string permissionCode)
        {
            PermissionCode = permissionCode;
        }
    }
}
