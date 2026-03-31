using Microsoft.AspNetCore.Authorization;

namespace SD.ProjectName.WebApp.Authorization
{
    /// <summary>
    /// Authorization requirement for resource-based authorization (ownership checks).
    /// Used to verify that users can only access resources they own or are authorized to access.
    /// </summary>
    public class ResourceAuthorizationRequirement : IAuthorizationRequirement
    {
        public string ResourceType { get; }
        public string Operation { get; }

        public ResourceAuthorizationRequirement(string resourceType, string operation)
        {
            ResourceType = resourceType;
            Operation = operation;
        }
    }

    /// <summary>
    /// Resource types supported by the authorization system.
    /// </summary>
    public static class ResourceTypes
    {
        public const string Product = "Product";
        public const string Order = "Order";
        public const string ReturnRequest = "ReturnRequest";
        public const string ProductReview = "ProductReview";
        public const string SellerRating = "SellerRating";
        public const string ProductQuestion = "ProductQuestion";
        public const string Payout = "Payout";
        public const string Invoice = "Invoice";
        public const string Case = "Case";
        public const string UserProfile = "UserProfile";
    }

    /// <summary>
    /// Operations that can be performed on resources.
    /// </summary>
    public static class Operations
    {
        public const string Read = "Read";
        public const string Create = "Create";
        public const string Update = "Update";
        public const string Delete = "Delete";
        public const string Manage = "Manage";
    }
}
