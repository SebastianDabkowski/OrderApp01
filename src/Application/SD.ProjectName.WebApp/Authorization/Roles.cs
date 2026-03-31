namespace SD.ProjectName.WebApp.Authorization
{
    public static class Roles
    {
        public const string Buyer = "Buyer";
        public const string Seller = "Seller";
        public const string Admin = "Admin";

        // Internal user roles for seller teams (Phase 2)
        public const string StoreOwner = "StoreOwner";
        public const string CatalogManager = "CatalogManager";
        public const string OrderManager = "OrderManager";
        public const string ReadOnly = "ReadOnly";
    }

    /// <summary>
    /// Internal user roles for seller team management
    /// </summary>
    public enum InternalUserRole
    {
        /// <summary>
        /// Full access to all store functions
        /// </summary>
        StoreOwner,

        /// <summary>
        /// Product and catalog management access
        /// </summary>
        CatalogManager,

        /// <summary>
        /// Order processing and fulfillment access
        /// </summary>
        OrderManager,

        /// <summary>
        /// Read-only access for reporting and accounting
        /// </summary>
        ReadOnly
    }
}
