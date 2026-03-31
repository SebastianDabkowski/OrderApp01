# Architecture Overview

This solution uses a modular, layered architecture with a Razor Pages Web App and feature modules for Products and Identity & Access Management.

## Projects
- `Application/SD.ProjectName.WebApp`: Razor Pages UI, app startup, DI, EF Core Identity, IAM implementation.
- `Modules/SD.ProjectName.Modules.Products`: Feature module containing `Domain`, `Application`, `Infrastructure` for Products.
- `Tests/SD.ProjectName.Tests.Products`: Unit tests for module/application logic.

## Module Structure

### Products Module
- `Domain`: Core entities and repository interfaces.
  - `ProductModel`: Product entity with seller association, pricing, inventory, status tracking, images, shipping parameters, and moderation fields (ADR-068)
    - Core fields: SellerId (FK to ApplicationUser), Name, Description, Price, Category (string, transitioning to structured categories), SKU, Stock, Status
    - Image fields: ImageUrls (comma-separated URLs for product images)
    - Shipping fields: Weight (kg), Length/Width/Height (cm), ShippingMethods (comma-separated method codes)
    - Moderation fields: ModeratedBy (admin user ID), ModeratedAt (timestamp), ModerationReason (rejection reason or notes)
    - ProductStatus enum: Draft (default, not publicly visible), Active (live for purchase, approved), Suspended (rejected/hidden), Archived, Discontinued
    - Timestamps: CreatedAt, UpdatedAt for audit trail
  - `CategoryModel`: Hierarchical category entity for product organization
    - Fields: Id, Name, Description (max 500 chars, nullable), Slug (SEO-friendly URL slug, unique, max 150 chars), ParentCategoryId (self-reference), DisplayOrder, IsActive, CommissionRate (optional category-specific override, ADR-034)
    - Self-referential parent-child relationships for unlimited nesting
    - Slug generation: Auto-generated from name (lowercase, hyphenated, special chars removed) with uniqueness ensured by appending numbers
    - Timestamps: CreatedAt, UpdatedAt for audit trail
  - `CategoryAttributeModel`: Attribute template definition for categories (ADR-074)
    - Fields: Id, CategoryId (FK), Name (max 100 chars), Type (enum: Text/Number/List/Boolean/Date), IsRequired, DisplayOrder, Unit (max 50 chars, nullable), IsDeprecated, IsSearchable, HelpText (max 500 chars, nullable)
    - Attribute inheritance: Child categories inherit attributes from parent categories (e.g., Smartphones inherit from Electronics)
    - Deprecation support: IsDeprecated flag hides attribute from new products but keeps it visible for existing products and reports
    - Timestamps: CreatedAt, UpdatedAt for audit trail
  - `CategoryAttributeOptionModel`: Predefined options for list-type attributes (ADR-074)
    - Fields: Id, CategoryAttributeId (FK), Value (max 100 chars), DisplayOrder, IsActive
    - Used for dropdown selections in list-type attributes (e.g., Color: Red, Blue, Green)
    - Timestamps: CreatedAt, UpdatedAt for audit trail
  - `ProductAttributeValueModel`: Actual attribute values for products (ADR-074)
    - Fields: Id, ProductId (FK), CategoryAttributeId (FK), Value (max 500 chars for text/number/boolean/date), CategoryAttributeOptionId (FK, nullable for list-type)
    - Unique constraint: (ProductId, CategoryAttributeId) ensures each attribute is only set once per product
    - Cascade delete: Values deleted when product is deleted
    - Restrict delete: Prevents deletion of attribute/option if values exist
    - Timestamps: CreatedAt, UpdatedAt for audit trail
  - `ProductImageModel`: Product image entity for structured image management
    - Fields: Id, ProductId (FK), FileName, FilePath, ContentType, FileSize, Width, Height
    - Image features: IsMainImage, DisplayOrder, ThumbnailPath, MediumPath (optimized versions)
    - Relationship: One-to-many with Product, cascade delete
    - Audit column: CreatedAt
  - `ProductVariantModel`: Product variant entity for managing product configurations (Phase 2)
    - Fields: Id, ProductId (FK), SKU (variant-specific, optional), Price (variant-specific, optional), Stock (required), IsActive, DisplayOrder
    - Variants enable sellers to offer products in different configurations (e.g., size, color, material)
    - Price and SKU can override parent product values or inherit if null
    - Relationship: One-to-many with Product, cascade delete; one-to-many with VariantAttributes
    - Timestamps: CreatedAt, UpdatedAt
  - `ProductVariantOptionModel`: Available options for variant attributes (Phase 2)
    - Fields: Id, ProductId (FK), AttributeName (e.g., "Color", "Size"), Value (e.g., "Red", "Large"), DisplayOrder
    - Product-specific options - each product defines its own variant attributes
    - Relationship: One-to-many with Product, cascade delete; one-to-many with VariantAttributes, restrict delete
    - Timestamp: CreatedAt
  - `ProductVariantAttributeModel`: Junction table linking variants to selected options (Phase 2)
    - Fields: Id, ProductVariantId (FK), ProductVariantOptionId (FK)
    - Many-to-many relationship between variants and options
    - Unique constraint: Each option can only be assigned once per variant
    - Cascade delete when variant or option deleted
    - Timestamp: CreatedAt
  - `ProductFilterCriteria`: DTO for product search and filtering with pagination support
    - Filter fields: Keyword, Category, MinPrice, MaxPrice, Status, SellerId, InStockOnly
    - Sorting: SortBy field with ProductSortField enum (Relevance, CreatedAtDesc/Asc, PriceAsc/Desc, NameAsc/Desc)
    - Pagination: Page (1-based page number), PageSize (items per page, default 20)
    - Used by SearchWithFilters and SearchWithFiltersAndCount repository methods
  - `Interfaces/IProductRepository`: Repository pattern interface for data access
    - Methods: GetList, GetBySellerId, GetById, Add, Update, Delete, GetByIds, UpdateRange, SearchByKeyword, SearchWithFilters, SearchWithFiltersAndCount
    - SearchWithFiltersAndCount: Returns paginated results with total count for building pagination UI
  - `Interfaces/ICategoryRepository`: Repository pattern interface for category tree operations
    - Methods: GetAll, GetRootCategories, GetById, GetByIdWithChildren, GetByParentId, Add, Update, Delete, GetProductCountByCategoryId
    - CategoryModel: Hierarchical category tree with Name, Description, Slug, ParentCategoryId, DisplayOrder, IsActive, CommissionRate (ADR-034)
  - `Interfaces/ICategoryAttributeRepository`: Repository pattern interface for category attribute template operations (ADR-074)
    - Methods: GetByCategoryId, GetByCategoryIdWithInherited (walks category tree), GetById, GetByIdWithOptions, Add, Update, Delete
    - Option methods: AddOption, UpdateOption, DeleteOption, GetOptionById
    - Product value methods: GetProductAttributeValues, SaveProductAttributeValue, DeleteProductAttributeValue, GetProductCountByAttributeId
  - `Interfaces/IProductVariantRepository`: Repository pattern interface for variant management (Phase 2)
    - Methods: GetByProductId, GetById, GetByIdWithAttributes, Add, Update, Delete, GetActiveByProductId
  - `Interfaces/IProductVariantOptionRepository`: Repository pattern interface for variant options (Phase 2)
    - Methods: GetByProductId, GetById, Add, Update, Delete, GetByAttributeName
- `Application`: Use cases (application services) depending on `Domain` interfaces.
  - `GetProducts`: Query service for retrieving product lists
- `Infrastructure`: Implementations and persistence for the module.
  - `ProductDbContext` + `Migrations`: Separate database context for Products module
  - `ProductRepository` (implements `IProductRepository`): EF Core implementation with seller-based filtering
  - `CategoryRepository` (implements `ICategoryRepository`): EF Core implementation with hierarchical queries
  - `CategoryAttributeRepository` (implements `ICategoryAttributeRepository`): EF Core implementation with attribute template queries and inheritance logic (ADR-074)
  - `ProductVariantRepository` (implements `IProductVariantRepository`): EF Core implementation with variant queries (Phase 2)
  - `ProductVariantOptionRepository` (implements `IProductVariantOptionRepository`): EF Core implementation with option queries (Phase 2)

### Identity & Access Management Module
Located in `Application/SD.ProjectName.WebApp`:
- `Data`: Domain entities and enums
  - `ApplicationUser`: Extended ASP.NET Identity user with UserType, SellerType, KYC, 2FA fields
    - Company sellers: CompanyName, TaxId, RegistrationNumber, CompanyAddress, ContactPersonName
    - Individual sellers: PersonalIdNumber, PersonalAddress
  - `SellerProfile`: Store profile information for sellers
    - Includes StoreStatus enum (Draft, Active, LimitedActive, Suspended) to control public visibility
    - CommissionRate (nullable): Custom commission rate override for this seller (ADR-034)
    - Rating fields (ADR-052): AverageRating (decimal, 1.0-5.0), TotalRatings (count of ratings received)
  - `PayoutAccount`: Payment and payout account details for sellers
  - `SellerOnboardingProgress`: Tracks seller onboarding wizard progress
  - `SellerInternalUser`: Relationship between sellers and their internal team members (Phase 2)
  - `SellerInternalUserInvitation`: Team member invitation tracking with token validation (Phase 2)
  - `AuditLog`: Audit event tracking
  - `LoginHistory`: Login attempt tracking and anomaly detection
  - `CartItem`: Shopping cart item with product, seller, quantity, and price snapshot
  - `DeliveryAddress`: Delivery addresses for orders (supports multiple saved addresses per user)
  - `ShippingMethod`: Platform-wide shipping method definitions (e.g., Standard, Express, Economy) with base costs and delivery estimates
  - `SellerShippingMethod`: Seller-specific shipping method configuration linking sellers to platform methods (ADR-041)
    - Configuration fields: IsActive (enable/disable), AvailableRegions (comma-separated countries), DisplayOrder (checkout priority)
    - Soft delete: Inactive methods preserved for order history
    - One-to-many: SellerProfile has many SellerShippingMethods
  - `ShippingProvider`: Platform-level shipping provider registry for API integrations (ADR-044)
    - Provider details: Code (unique), Name, Description, ApiEndpoint, SandboxApiEndpoint
    - Capabilities: SupportsShipmentCreation, SupportsTrackingUpdates, RequiresSellerCredentials
    - Display control: IsActive, DisplayOrder
  - `SellerShippingProviderConfig`: Seller-specific shipping provider API credentials and configuration (ADR-044)
    - Encrypted credentials: EncryptedApiKey, EncryptedApiSecret, EncryptedAccountNumber
    - Configuration: IsEnabled, UseSandbox, ConfigurationJson (provider-specific settings)
    - Testing: LastTestedAt, LastTestResult (connection test tracking)
    - One config per seller per provider (unique constraint)
  - `ShipmentIntegration`: Tracks shipments created via provider APIs linking orders to external carriers (ADR-044, ADR-045)
    - Identifiers: ProviderShipmentId (external), TrackingNumber
    - Status tracking: ShipmentStatus enum (Created, InTransit, OutForDelivery, Delivered, Failed, Returned, Cancelled)
    - Delivery tracking: EstimatedDeliveryDate, ActualDeliveryDate, StatusMessage
    - Label management: LabelUrl (provider URL), PdfFilePath (local storage), PdfDownloadedAt (ADR-045)
    - Webhook tracking: LastWebhookReceivedAt, ProviderResponseJson (for debugging)
  - `Order`: Customer order with buyer, seller, delivery address, status, and totals
    - Financial fields: ItemsSubtotal, ShippingCost, CommissionAmount, CommissionRate, DiscountAmount, TotalAmount
    - Commission tracking: Stores both rate (e.g., 0.10) and amount (e.g., $10.00) for historical accuracy (ADR-034)
  - `OrderItem`: Individual line items in an order with product snapshots and item-level status tracking (ADR-031)
    - Item-level fields: Status (OrderItemStatus enum), ShippedAt, DeliveredAt, CancelledAt, RefundedAt
    - Fulfillment tracking: TrackingNumber, Carrier, QuantityShipped, QuantityCancelled
    - Refund tracking: RefundAmount, CancellationReason
  - `ReturnRequest`: Return and complaint request tracking for delivered orders (ADR-030, ADR-046, ADR-049)
    - Fields: CaseId (unique tracking ID), RequestType (Return/Complaint), OrderId, BuyerId, SellerId, Status (Requested/Approved/Rejected/Completed), Reason, SellerResponse, RefundAmount, ResolutionType (FullRefund/PartialRefund/Replacement/Repair/NoRefund)
    - Timestamps: CreatedAt, UpdatedAt, ApprovedAt, RejectedAt, CompletedAt
    - Resolution tracking: ResolutionType field links case outcome to refund processing (ADR-049)
    - Navigation: Items collection for item-level tracking, Messages collection for case messaging (ADR-048)
  - `ReturnRequestItem`: Join entity for item-level return/complaint tracking (ADR-046)
    - Fields: ReturnRequestId, OrderItemId, Quantity
    - Enables buyers to select specific items in multi-item orders
    - Prevents duplicate requests for same items
  - `CaseMessage`: Bidirectional messaging within return/complaint cases for buyer-seller communication (ADR-048)
    - Fields: ReturnRequestId (FK), SenderId, SenderRole (Buyer/Seller), MessageText (max 2000 chars), CreatedAt, IsRead
    - Authorization: Only buyer and seller associated with case can access messages
    - Features: Chronological display, unread tracking, audit logging
    - Navigation: ReturnRequest relationship for message threading
  - `PromoCode`: Promotional code entity with validation rules, usage limits, and scope (Platform or Seller)
  - `PromoCodeUsage`: Audit trail for promo code usage with order tracking
  - `EscrowTransaction`: Marketplace escrow transaction entity for holding buyer payments until order fulfillment (ADR-032)
    - Financial fields: AmountHeld (seller payout), CommissionAmount, AmountReleasedToSeller, AmountReleasedToBuyer
    - Status tracking: EscrowStatus enum (Held, ReleasedToSeller, ReleasedToBuyer, PartiallyReleased)
    - Payout eligibility: EligibleForPayout flag, EligibleForPayoutAt timestamp
    - Supports multi-seller escrow allocations (one entry per sub-order)
  - `PayoutSchedule`: Seller payout schedule configuration with frequency (Weekly/BiWeekly/Monthly) and minimum threshold (ADR-035)
  - `SellerPayout`: Individual seller payout batch tracking with status (Scheduled/Processing/Paid/Failed) and retry logic (ADR-035, ADR-036)
  - `PayoutEscrowTransaction`: Join table linking payouts to included escrow transactions (ADR-035, ADR-036)
  - `MonthlySettlement`: Monthly settlement report aggregating seller payouts for accounting reconciliation (ADR-037)
    - Financial totals: TotalPayoutAmount, TotalCommissionAmount, TotalGrossValue (GMV), TotalOrders
    - Adjustment tracking: AdjustmentCount, AdjustmentAmount for cross-period payouts
    - Regeneration support: RegeneratedAt, RegeneratedBy for audit trail
  - `SettlementPayout`: Junction table linking monthly settlements to seller payouts with adjustment flags (ADR-037)
  - `CommissionInvoice`: Commission invoice issued to sellers documenting commission charges for payouts (ADR-038)
    - Invoice details: InvoiceNumber (sequential), IssueDate, DueDate, PeriodStart, PeriodEnd
    - Financial fields: SubtotalAmount, TaxAmount, TotalAmount, TaxRate, Currency, OrderCount
    - Status tracking: InvoiceStatus enum (Draft, Issued, Paid, Cancelled, Corrected)
    - PDF generation: PdfFilePath, PdfGeneratedAt for downloadable invoice documents
    - Seller snapshot: SellerCompanyName, SellerTaxId, SellerAddress (captured at invoice time)
    - Correction support: OriginalInvoiceId, CorrectionInvoiceId for credit notes
  - `RefundError`: Tracks failed refund attempts for support agent visibility and resolution (ADR-039)
    - Fields: OrderId (FK), RefundAmount, PaymentTransactionId, ErrorCode, ErrorMessage, InitiatedByUserId, IsResolved
    - Timestamps: CreatedAt, ResolvedAt
    - Enables support team to monitor and resolve payment provider refund failures
  - `ProductReview`: Product review entity for buyer feedback on purchased products (ADR-053)
    - Fields: OrderItemId (FK to verified purchase), ProductId, BuyerId, SellerId, Rating (1-5), ReviewText (10-2000 chars)
    - Moderation: ModerationStatus (Pending/Approved/Rejected), IsPublished, ModeratedAt, ModeratedBy, ModerationNotes
    - Reviews linked to OrderItem ensure only verified buyers can review
    - Timestamps: CreatedAt, UpdatedAt, PublishedAt
  - `SellerRating`: Seller rating entity for buyer feedback on order experience (ADR-052)
    - Fields: OrderId (FK, unique constraint), SellerId, BuyerId, Rating (1-5), FeedbackText (optional, max 1000 chars)
    - One rating per order constraint enforced by database
    - Timestamps: CreatedAt, UpdatedAt
  - `ReviewReport`: User report of inappropriate product reviews (ADR-053)
    - Fields: ReviewId (FK), ReporterId, ReportReason (Abuse/Spam/FalseInformation/Other), ReportDetails, Status (Pending/Reviewed/Dismissed)
    - Admin review: ReviewedAt, ReviewedBy, ReviewNotes
    - Unique constraint on ReviewId+ReporterId prevents duplicate reports
  - `SellerReputation`: Aggregated reputation score for sellers based on multiple performance factors (ADR-054)
    - Score components (0-100): ReputationScore (overall), RatingScore, DisputeScore, OnTimeDeliveryScore, SlaComplianceScore
    - Metrics: TotalOrdersCount, TotalDisputesCount, OnTimeDeliveriesCount, SlaCompliantCasesCount, TotalCasesCount
    - Timestamps: LastCalculatedAt, CreatedAt, UpdatedAt
    - Recalculated daily via background service
  - `ProductQuestion`: Public Q&A on product pages for buyer-seller communication (ADR-057)
    - Fields: ProductId (FK), BuyerId, SellerId, QuestionText (max 1000 chars), AnswerText (max 2000 chars, optional)
    - Moderation: Status (Pending/Approved/Rejected/Hidden), IsVisible, ModeratedBy, ModeratedAt, ModerationReason
    - Notification tracking: BuyerNotified, SellerNotified (flags for notification delivery)
    - Requires admin approval before public visibility
    - Timestamps: CreatedAt, UpdatedAt, AnsweredAt
  - `OrderMessage`: Private messaging between buyer and seller for order-specific communication (ADR-057)
    - Fields: OrderId (FK), SenderId, SenderRole (Buyer/Seller/Admin), MessageText (max 2000 chars)
    - Dual read tracking: IsReadByBuyer, IsReadBySeller, ReadByBuyerAt, ReadBySellerAt
    - Authorization: Only order buyer, seller, and admins can access messages
    - Timestamp: CreatedAt
  - `PushSubscription`: Web push notification subscriptions for browser-based push delivery (ADR-058)
    - Fields: UserId (FK), Endpoint (unique push service endpoint), Auth (authentication secret), P256dh (client public key)
    - Metadata: UserAgent (browser identification), IsActive (subscription validity)
    - Tracking: LastSuccessfulPushAt, LastVerifiedAt
    - Multi-device support: Users can have multiple active subscriptions
    - Timestamps: CreatedAt
  - `NotificationPreference`: User preferences for notification channels (in-app, email, push) (ADR-058)
    - Fields: UserId (FK), NotificationType (enum), WebPushEnabled (push preference), EmailEnabled (email preference)
    - Granular control: Per-notification-type preferences (OrderEvent, CaseMessage, etc.)
    - Unique constraint: One preference per user per notification type
    - Timestamps: CreatedAt, UpdatedAt
  - `AnalyticsEvent`: User behavior event tracking for advanced analytics (ADR-065, Phase 2)
    - Fields: Id (bigint), UserOrSessionId (user ID or session ID), IsAuthenticatedUser, EventType (enum), CreatedAt (indexed)
    - Context fields: ProductId, SellerId, OrderId, CategoryId, SearchQuery, SearchResultCount, AdditionalData (JSON)
    - Tracking fields: IpAddress, UserAgent (for device/browser analysis)
    - Event types: ProductSearched, ProductViewed, CategoryViewed, AddedToCart, RemovedFromCart, CartViewed, CheckoutStarted, CheckoutCompleted, OrderCompleted, OrderCancelled, SellerProfileViewed, WishlistAdded, WishlistRemoved
    - Composite indexes: (EventType, CreatedAt), ProductId, UserOrSessionId for efficient queries
    - Storage: bigint ID to support high-volume tracking (billions of events)
  - `CommissionRule`: Commission rate rule configuration for dynamic marketplace commission management (ADR-071)
    - Fields: Rate (decimal, 0-1 for percentage), FixedFee (decimal, optional), Applicability (enum: Global/Category/Seller/SellerType)
    - Scope fields: CategoryId (FK, nullable), SellerId (FK, nullable), SellerType (string, nullable) - determines what the rule applies to
    - Temporal fields: EffectiveFrom (date when rule activates), EffectiveTo (date when rule expires, null = indefinite)
    - Control fields: IsActive (soft delete/activation toggle), Priority (int, for conflict resolution - higher wins)
    - Audit fields: CreatedBy (admin FK), ModifiedBy (admin FK, nullable), CreatedAt, UpdatedAt, Description (optional notes)
    - Priority hierarchy: Rules evaluated by Priority (descending), then Applicability specificity (Seller > Category > Global)
    - Date validation: EffectiveFrom < EffectiveTo, both checked against current UTC time during rate calculation
    - Indexes: Composite index on (IsActive, EffectiveFrom, EffectiveTo), (Applicability, CategoryId, SellerId)
  - `VatRule`: VAT/tax rate rule configuration for multi-jurisdiction tax compliance (ADR-072)
    - Fields: Rate (decimal, 0-1 for percentage), Applicability (enum: Global/Country/Category/CountryCategory)
    - Scope fields: CountryCode (ISO 3166-1 alpha-2, nullable, max 2 chars), CategoryId (FK, nullable) - determines what the rule applies to
    - Temporal fields: EffectiveFrom (date when rule activates), EffectiveTo (date when rule expires, null = indefinite)
    - Control fields: IsActive (soft delete/activation toggle), Priority (int, for conflict resolution - higher wins)
    - Audit fields: CreatedBy (admin FK), ModifiedBy (admin FK, nullable), CreatedAt, UpdatedAt, Description (optional notes)
    - Priority hierarchy: CountryCategory > Country > Category > Global > Configuration default
    - Date validation: EffectiveFrom < EffectiveTo, both checked against current UTC time during rate calculation
    - Country code validation: Must be exactly 2 characters (ISO 3166-1 alpha-2 standard)
    - Indexes: Composite index on (IsActive, EffectiveFrom, EffectiveTo), (Applicability, CountryCode, CategoryId), CountryCode
  - `Currency`: Currency configuration for platform currency management (ADR-073)
    - Fields: Code (3-char ISO 4217, unique), Name (display name), Symbol (currency symbol), ExchangeRate (decimal 18,6 relative to base), RateSource (string, e.g., "Manual", "ECB API")
    - Rate tracking: RateLastUpdatedAt (timestamp when rate was last updated)
    - Control fields: IsEnabled (enable/disable for new transactions), DecimalPlaces (0-4, e.g., 2 for PLN, 0 for JPY), DisplayOrder (sorting in lists)
    - Audit fields: CreatedBy (admin FK), ModifiedBy (admin FK, nullable), CreatedAt, UpdatedAt
    - Unique constraint: Currency Code is unique and normalized to uppercase
    - Indexes: Unique index on Code, composite index on (IsEnabled, DisplayOrder)
    - Business rules: Cannot disable or delete base currency; exchange rate must be positive
  - `PlatformSettings`: Platform-wide configuration settings (ADR-073, single-row table pattern)
    - Fields: Id (always 1), BaseCurrencyCode (3-char ISO 4217), BaseCurrencyModifiedBy (admin FK, nullable), BaseCurrencyModifiedAt (timestamp)
    - Control field: UpdatedAt (last settings update)
    - Business rule: Changing base currency requires enabled currency and triggers major impact warning
  - `IntegrationProvider`: External integration/service provider registry (ADR-075)
    - Fields: Code (unique, max 50 chars, e.g., "PRZELEWY24", "DHL_API"), Name (display name, max 200 chars), Description (max 1000 chars), Type (enum: Payment/Shipping/ERP/Marketing/Analytics/Other)
    - Endpoints: ProductionApiEndpoint (max 500 chars), SandboxApiEndpoint (max 500 chars), DocumentationUrl (max 500 chars)
    - Control fields: IsActive (available for configuration), SupportsHealthCheck (automated health check support), DisplayOrder (UI sorting)
    - Audit fields: CreatedAt, UpdatedAt
    - Unique constraint: Integration provider Code is unique and normalized to uppercase
    - Seeded providers: Przelewy24, Stripe (Payment), DHL, InPost (Shipping)
  - `IntegrationConfiguration`: Platform-level configuration for integration provider instances (ADR-075)
    - Fields: IntegrationProviderId (FK), ConfigurationName (max 200 chars), IsEnabled (active status), UseSandbox (environment toggle), Environment (label, max 50 chars)
    - Encrypted credentials: EncryptedApiKey, EncryptedApiSecret, EncryptedMerchantId, EncryptedAdditionalCredential (all max 1000 chars, encrypted via Data Protection API)
    - Integration fields: CallbackUrl (webhook endpoint, max 500 chars), ConfigurationJson (provider-specific settings)
    - Health monitoring: HealthStatus (enum: Unknown/Healthy/Degraded/Unhealthy/Disabled), LastHealthCheckAt, LastHealthCheckMessage (max 500 chars)
    - Audit fields: LastModifiedBy (admin username, max 256 chars), CreatedAt, UpdatedAt
    - Indexes: Composite index on (IntegrationProviderId, IsEnabled), FK index on IntegrationProviderId
    - Security: All credentials encrypted using "IntegrationConfigProtection" purpose, masked display (show last 4 chars)
  - `FeatureFlag`: Feature flag configuration for controlling feature visibility and rollout (ADR-078, Phase 2)
    - Fields: Key (unique with Environment, max 200 chars), Name (display name, max 200 chars), Description (max 1000 chars), IsEnabled (global on/off switch)
    - Environment management: Environment (max 50 chars, e.g., "Development", "Staging", "Production"), DefaultValue (fallback bool when no rules match)
    - Effective date range: EffectiveFrom (nullable datetime), EffectiveTo (nullable datetime)
    - Audit fields: CreatedBy, ModifiedBy, CreatedAt, UpdatedAt
    - Unique constraint: (Key, Environment) ensures same flag key can exist per environment independently
    - Indexes: Key index, composite (IsEnabled, Environment) index, composite (Key, Environment) unique index
  - `FeatureFlagTargetRule`: Targeting rules for feature flag user segmentation (ADR-078, Phase 2)
    - Fields: FeatureFlagId (FK), TargetScope (enum), TargetValue (string, nullable), ReturnValue (bool), Priority (int), Description (max 500 chars)
    - TargetScope enum: All (all users), Percentage (0-100% rollout), SpecificUsers (comma-separated IDs), UserRoles (comma-separated roles), Sellers (all sellers), InternalUsers (admin/staff)
    - Evaluation: Rules evaluated by Priority descending, first matching rule's ReturnValue returned
    - Percentage rollout: Consistent hashing (SHA256) ensures same user gets same result for a flag
    - Cascade delete: Rules deleted when parent FeatureFlag is deleted
    - Indexes: FeatureFlagId index, composite (FeatureFlagId, Priority) index for efficient evaluation
    - Timestamp: CreatedAt
  - `LegalDocument`: Legal document registry for platform legal content management (ADR-076)
    - Fields: DocumentType (enum: TermsOfService/PrivacyPolicy/CookiePolicy/SellerAgreement, unique), Title (display title, max 200 chars), Description (max 500 chars, nullable)
    - Navigation: Versions collection (one-to-many with LegalDocumentVersion)
    - Unique constraint: DocumentType ensures one document per type
    - Timestamps: CreatedAt, UpdatedAt
  - `LegalDocumentVersion`: Version instances for legal documents with version control (ADR-076)
    - Fields: LegalDocumentId (FK), VersionNumber (semantic version, max 50 chars), Content (HTML content), Status (enum: Draft/Published/Scheduled/Expired/Archived)
    - Effective dates: EffectiveDate (when version becomes active), ExpiryDate (when version expires, nullable)
    - Metadata: ChangesSummary (max 1000 chars), CreatedBy (admin FK), PublishedBy (admin FK, nullable), CreatedAt, PublishedAt (nullable)
    - Status lifecycle: Draft → Published/Scheduled → Expired/Archived
    - Business rules: Only one Published version per document, Draft versions editable/deletable, Published versions immutable
    - Indexes: Composite index on (LegalDocumentId, Status, EffectiveDate)
    - Navigation: Creator relationship via ApplicationUser
  - `UserConsent`: User consent tracking for legal document compliance (ADR-076)
    - Fields: UserId (FK), LegalDocumentVersionId (FK), DocumentType (enum, denormalized), VersionNumber (max 50 chars, denormalized)
    - Consent metadata: ConsentedAt (timestamp), IpAddress (max 50 chars), UserAgent (max 500 chars), ConsentMethod (max 100 chars, e.g., "Registration", "Checkout")
    - Indexes: Composite index on (UserId, DocumentType), LegalDocumentVersionId index
    - Navigation: User and LegalDocumentVersion relationships
    - Audit trail: Complete consent history retained for compliance
  - `ProcessingActivity`: GDPR Article 30 processing activity registry for compliance (ADR-079)
    - Fields: Name (max 200 chars), Description (max 2000 chars), Purpose (max 1000 chars), LegalBasis (enum), LegalBasisNotes (max 1000 chars, nullable)
    - Data subjects: DataSubjects (categories, max 1000 chars), DataCategories (types of personal data, max 2000 chars)
    - Recipients: Recipients (max 2000 chars, nullable), Processors (third-party processors, max 2000 chars, nullable)
    - International transfer: InternationalTransfer (bool), InternationalTransferDetails (max 1000 chars, nullable)
    - Retention & security: RetentionPeriod (max 500 chars), SecurityMeasures (max 2000 chars, nullable)
    - Metadata: IsActive (bool), CreatedBy (admin FK), CreatedAt, LastUpdatedBy (admin FK, nullable), LastUpdatedAt (nullable), InternalNotes (max 2000 chars, nullable)
    - Indexes: IsActive, CreatedAt, LegalBasis
    - Full audit trail via ProcessingActivityHistory
  - `ProcessingActivityHistory`: Version history for processing activities with complete audit trail (ADR-079)
    - Fields: ProcessingActivityId (FK), ChangeType (max 50 chars), ChangedBy (admin FK), ChangedAt, DataSnapshot (JSON), ChangeNotes (max 1000 chars, nullable)
    - Cascade delete: History deleted when parent ProcessingActivity is deleted
    - Indexes: ProcessingActivityId, ChangedAt
    - Complete snapshots: JSON DataSnapshot stores full activity state at time of change
  - `AuditLogArchive`: Long-term storage for archived audit logs with configurable retention policies (ADR-086)
    - Fields: OriginalId (original audit log ID), EventType (enum), EntityType (max 100 chars, nullable), EntityId (max 450 chars, nullable), AdminUserId (FK, nullable), Description (max 1000 chars, nullable), IpAddress (max 45 chars, nullable), UserAgent (max 500 chars, nullable), EventDate, ArchivedAt
    - Retention policies: 7 years for critical/financial events (failed logins, role changes, payments, refunds, etc.), 1 year for standard events
    - Archive process: Automated background service moves expired logs to archive before deletion
    - Indexes: EventType, EntityType, EntityId, EventDate, ArchivedAt
    - No foreign keys: Archive is independent of active data for retention compliance
  - `Permission`: Permission registry for role-based access control (RBAC) system (ADR-080)
    - Fields: Code (unique, max 100 chars, Module.Action pattern), Module (max 50 chars), Action (max 50 chars), Description (max 500 chars), IsActive (bool), DisplayOrder (int)
    - Permission pattern: Module.Action (e.g., "Products.Create", "Orders.View", "Users.Manage")
    - 38 default permissions across 13 modules: Products, Orders, Users, Store, Reviews, Returns, Cases, Payments, Settlements, Reports, Settings, Categories, Commissions, AuditLogs, Analytics
    - Unique constraint: Code ensures one permission per code
    - Indexes: Code (unique), Module, composite (Module, DisplayOrder), composite (IsActive, Module)
    - Timestamps: CreatedAt, UpdatedAt
  - `RolePermission`: Junction table linking roles to permissions for RBAC (ADR-080)
    - Fields: RoleId (FK to AspNetRoles), PermissionId (FK to Permissions), GrantedBy (admin FK), GrantedAt
    - Defines which permissions are granted to each role
    - Unique constraint: (RoleId, PermissionId) prevents duplicate permission assignments
    - Indexes: RoleId, PermissionId, composite (RoleId, PermissionId) unique, GrantedBy
    - Cascade delete: Automatically removed when role or permission is deleted
    - Audit trail: Tracks which admin granted the permission and when
  - `ConsentType`: Consent type definitions for GDPR consent management (ADR-082)
    - Fields: Code (unique, max 100 chars), Category (enum: Marketing/Profiling/ThirdPartySharing/Legal), Name (max 200 chars), Description (max 2000 chars)
    - Consent properties: IsRequired (bool), CanBePreselected (bool), CurrentVersion (max 50 chars), ConsentText (HTML), VersionEffectiveDate, IsActive (bool), SortOrder (int)
    - Categories: Marketing (newsletters, promotions), Profiling (personalization), ThirdPartySharing (data sharing with partners), Legal (required consents)
    - Unique constraint: Code ensures one consent type per code
    - Indexes: Code (unique), Category, IsActive, SortOrder
    - Timestamps: CreatedAt, UpdatedAt
  - `ConsentTypeVersion`: Version history for consent types to track consent text changes over time (ADR-082)
    - Fields: ConsentTypeId (FK), VersionNumber (max 50 chars), ConsentText (HTML), EffectiveDate, ExpiryDate (nullable), CreatedBy (admin FK), CreatedAt
    - Maintains full audit trail of consent text changes for compliance
    - Cascade delete: Versions deleted when parent ConsentType is deleted
    - Indexes: ConsentTypeId, EffectiveDate, composite (ConsentTypeId, EffectiveDate DESC)
  - `UserConsentRecord`: User consent records for GDPR audit trail (ADR-082)
    - Fields: UserId (FK), ConsentTypeId (FK), IsGranted (bool), ConsentVersion (max 50 chars), RecordedAt, IpAddress (max 50 chars), UserAgent (max 500 chars), ConsentMethod (max 100 chars)
    - Tracks when users grant or withdraw consent with full audit metadata
    - Indexes: Composite index on (UserId, ConsentTypeId, RecordedAt), ConsentTypeId index
    - Complete history: All consent changes retained for compliance
  - `DataExportRequest`: User data export requests for GDPR Right of Access compliance (ADR-083)
    - Fields: UserId (FK), Status (enum: Pending/Processing/Completed/Failed/Expired), Format (enum: JsonZip/CsvZip), RequestedAt, CompletedAt (nullable)
    - Export metadata: IpAddress (max 50 chars), UserAgent (max 500 chars), FilePath (max 500 chars, nullable), FileSizeBytes (bigint, nullable), ErrorMessage (max 2000 chars, nullable), ExpiresAt (nullable)
    - Status lifecycle: Pending → Processing → Completed/Failed, then Expired after 30 days
    - Export formats: JsonZip (single JSON file), CsvZip (multiple CSV files)
    - File retention: Export files available for 30 days after generation
    - Indexes: UserId, composite (UserId, Status), RequestedAt, composite (Status, RequestedAt)
    - Cascade delete: Requests deleted when user is deleted (or retained for audit depending on policy)
  - `AccountDeletionRequest`: User account deletion requests for GDPR Right to Erasure compliance (ADR-084)
    - Fields: UserId (FK), Status (enum: Pending/UnderReview/Approved/Rejected/Processing/Completed/Failed), RequestedAt, IpAddress (max 100 chars, nullable), UserAgent (max 500 chars, nullable), UserReason (max 1000 chars, nullable)
    - Review metadata: ReviewedAt (nullable), ReviewedBy (admin FK, nullable), ReviewNotes (max 1000 chars, nullable)
    - Execution tracking: ProcessingStartedAt (nullable), CompletedAt (nullable), ErrorMessage (max 2000 chars, nullable)
    - Validation data: BlockingConditions (JSON, max 4000 chars, nullable), AnonymizationSummary (JSON, nullable)
    - Status lifecycle: Pending → UnderReview → Approved → Processing → Completed (or Rejected/Failed at any stage)
    - Admin approval: Required before execution to prevent accidental deletions
    - Transaction-safe: Execution in database transaction with automatic rollback on failure
    - Indexes: UserId, Status, RequestedAt, ReviewedBy
    - Cascade delete: No cascade (retained for audit trail even after user deletion completes)
    - Blocking conditions: Open disputes, pending payouts, orders in transit, held escrow funds
  - `NotificationCenter`: In-app notification center for user notifications (ADR-058, Phase 2)
    - Fields: UserId (FK), NotificationType (enum: OrderEvent/ReturnEvent/PayoutEvent/MessageAlert/SystemUpdate), Title (max 200 chars), Description (max 1000 chars)
    - Related entity: RelatedEntityType (max 100 chars, nullable), RelatedEntityId (int, nullable), ActionUrl (max 500 chars, nullable)
    - Read tracking: IsRead (bool), ReadAt (timestamp, nullable)
    - Timestamps: CreatedAt
    - Indexes: Composite index on (UserId, IsRead, CreatedAt DESC) for efficient notification list queries
  - `SecurityIncident`: Security incident tracking for threat monitoring and response (ADR-087)
    - Fields: IncidentId (unique, max 50 chars, format: INC-YYYYMMDD-XXXXX), IncidentType (enum: 15 types), Severity (enum: Low/Medium/High/Critical), Status (enum: Detected/Triaged/InInvestigation/Resolved/Closed/FalsePositive)
    - Detection metadata: Description (max 2000 chars), DetectionRule (max 200 chars), Source (max 500 chars, nullable), DetectedAt, CreatedAt, UpdatedAt
    - Associated data: UserId (FK, nullable), IpAddress (max 45 chars, nullable), UserAgent (max 500 chars, nullable), AdditionalData (JSON, nullable)
    - Workflow tracking: TriagedAt (nullable), TriagedBy (user FK, nullable), InvestigationStartedAt (nullable), InvestigatedBy (user FK, nullable)
    - Resolution: ResolvedAt (nullable), ResolvedBy (user FK, nullable), ResolutionNotes (max 2000 chars, nullable)
    - Alerting: AlertsSent (bool), AlertsSentAt (nullable)
    - Indexes: IncidentId (unique), DetectedAt, composite (Status, DetectedAt), composite (Severity, Status), IncidentType, UserId, IpAddress
    - Navigation: User (optional), History collection
  - `SecurityIncidentHistory`: Audit trail for security incident status changes (ADR-087)
    - Fields: SecurityIncidentId (FK), PreviousStatus (enum, nullable), NewStatus (enum), PreviousSeverity (enum, nullable), NewSeverity (enum, nullable)
    - Change metadata: ChangedBy (user FK), ChangedAt, Notes (max 2000 chars, nullable)
    - Cascade delete: History deleted when parent SecurityIncident is deleted
    - Indexes: SecurityIncidentId, ChangedAt, ChangedBy
    - Navigation: SecurityIncident, ChangedByUser
    - Complete audit trail: Tracks all status and severity changes with actor and timestamp
  - `SellerType`, `KycStatus`, `StoreStatus`, `AuditEventType`, `AnalyticsEventType`, `OnboardingStep`, `PayoutMethod`, `InternalUserRole`, `OrderStatus`, `OrderItemStatus`, `ReturnStatus`, `PromoCodeType`, `PromoCodeScope`, `EscrowStatus`, `PayoutFrequency`, `PayoutStatus`, `InvoiceStatus`, `ReportReason`, `CommissionRuleApplicability`, `VatRuleApplicability`, `IntegrationType`, `IntegrationHealthStatus`, `FeatureFlagTargetScope`, `LegalDocumentType`, `LegalDocumentStatus`, `LegalBasis`, `NotificationType`, `SecurityIncidentType`, `SecurityIncidentSeverity`, `SecurityIncidentStatus`: Domain enums
- `Authorization`: Role definitions and policies
  - `Roles`: Buyer, Seller, Admin role constants
  - Internal user roles (Phase 2): StoreOwner, CatalogManager, OrderManager, ReadOnly
  - Authorization policies: BuyerOnly, SellerOnly, AdminOnly, BuyerOrSeller
  - RBAC system (ADR-080): Permission-based authorization with PermissionRequirement and PermissionAuthorizationHandler
  - Permission model: Module.Action pattern (e.g., "Products.Create", "Orders.View") with 38 default permissions across 13 modules
- `Services`: Application services
  - `AuditService`: Event logging for compliance
  - `LoginHistoryService`: Login tracking and suspicious activity detection
  - `SellerOnboardingService`: Manages seller onboarding wizard flow and progress
  - `SellerProfileService`: Manages seller store profiles including logo upload, profile updates, and public visibility checks
  - `PayoutAccountService`: Manages payout account configuration with encryption, validation, and default selection
  - `SellerInternalUserService`: Manages seller team members with invitation, role management, and access control (Phase 2)
  - `ProductManagementService`: Manages product CRUD operations with seller ownership validation, audit logging, and business rule enforcement
  - `ProductValidationService`: Enforces product data quality and state transition rules for product workflow management
  - `ProductImageService`: Handles product image upload, validation, optimization, and storage with thumbnail generation
  - `ProductImportService`: Implements CSV/Excel import with SKU-based matching, validation, and two-step preview/confirm workflow
  - `ProductExportService`: Provides CSV/Excel export functionality for seller product catalogs
  - `BulkProductUpdateService`: Enables bulk price and stock updates with preview, validation, and audit logging
  - `CategoryManagementService`: Manages global category tree with hierarchy validation, circular reference prevention, and product assignment checks
  - `CategoryAttributeManagementService`: Manages attribute templates for categories with CRUD operations, attribute inheritance from parent categories, deprecation support, and validation (ADR-074)
  - `ProductVariantService`: Manages product variants and variant options with validation and business logic (Phase 2)
  - `AdminProductManagementService`: Provides admin override capabilities for product state transitions, workflow enforcement, and product moderation (ADR-068)
    - Status management: UpdateProductStatus, SuspendProduct, UnsuspendProduct
    - Product moderation: ApproveProductAsync (sets Active status), RejectProductAsync (sets Suspended status)
    - Moderation queries: GetProductsForModerationAsync (with status/category filters), GetProductForModerationAsync
    - Bulk operations: BulkApproveProductsAsync, BulkRejectProductsAsync
    - Audit logging: All moderation actions logged with ProductApproved/ProductRejected event types
    - Seller notifications: In-app notifications sent via NotificationCenterService for approval/rejection
    - Moderation tracking: Updates ModeratedBy, ModeratedAt, ModerationReason fields on ProductModel
  - `AdminPhotoModerationService`: Provides admin moderation of product photos to prevent inappropriate or illegal images (ADR-069)
    - Moderation queue: GetPhotosForModerationAsync (with status/flagged filters, pagination) - returns photos ordered by flagged first, then by upload date
    - Photo review: GetPhotoForModerationAsync (with product/seller context), GetPhotoModerationHistoryAsync (audit trail)
    - Approval: ApprovePhotoAsync (sets Approved status, clears flags) - only approved photos visible on product pages
    - Removal: RemovePhotoAsync (sets Removed status, requires reason) - handles main image reassignment, soft delete for legal compliance
    - Flagging: FlagPhotoAsync (marks for review) - supports automated checks or user reports
    - Gallery integrity: Automatically promotes next approved image to main when main image removed
    - Audit logging: All actions logged with ProductImageApproved/ProductImageRemoved/ProductImageFlagged event types
    - Seller notifications: In-app notifications for photo removal with reason, conditional notification for approval
  - `CartService`: Shopping cart management (add, remove, update, clear) with stock validation
  - `CartCalculationService`: Calculates cart totals, shipping costs, and platform commissions
  - `GuestCartIdentifierService`: Manages guest cart identification via cookies
  - `CartMergeService`: Merges guest cart into user cart after login/registration
  - `AddressService`: Delivery address management (CRUD, validation, default address) with EU country support
  - `ShippingService`: Platform shipping method management with active method retrieval and cost calculation
  - `SellerShippingMethodService`: Seller shipping method configuration with CRUD operations, duplicate prevention, and soft delete (ADR-041)
  - `ShippingProviderService`: Orchestrates shipping provider integrations with credential encryption, shipment creation, and status updates (ADR-044, ADR-045)
    - Provider management: GetActiveProvidersAsync, GetProviderByIdAsync, GetProviderByCodeAsync
    - Seller configuration: SaveConfigurationAsync (with credential encryption), ToggleProviderAsync, TestProviderConnectionAsync
    - Shipment operations: CreateShipmentAsync, GetShipmentForOrderAsync, UpdateShipmentStatusAsync
    - Label integration: Automatically downloads labels after shipment creation using ShippingLabelService (ADR-045)
    - Security: Uses Data Protection API for credential encryption (protection scope: "ShippingProviderProtection")
  - `ShippingLabelService`: Manages shipping label PDF download, storage, and retrieval with automatic retry (ADR-045)
    - Label operations: DownloadAndStoreLabelAsync, GetLabelPdfBytesAsync, HasLocalLabelAsync, DeleteLocalLabelAsync
    - Storage: Local file system in wwwroot/shippinglabels/ directory with {orderId}_{shipmentId}.pdf naming
    - Auto-download: Downloads label if not stored locally when GetLabelPdfBytesAsync called
    - Error handling: Graceful degradation - label download failure doesn't break shipment creation
  - `OrderService`: Order creation from cart with multi-seller order splitting, order retrieval, status updates, and item-level fulfillment operations (ADR-029, ADR-031)
    - Fulfillment operations: MarkOrderItemsAsShippedAsync, CancelOrderItemsAsync, RecalculateOrderFinancialsAsync
    - Status management: UpdateOrderStatusAsync with carrier and tracking support, UpdateTrackingInfoAsync
  - `OrderExportService`: Exports seller orders to CSV/Excel with financial details (ADR-027)
  - `ReturnRequestService`: Manages return and complaint requests with buyer submission, item-level selection, seller approval/rejection, duplicate prevention, unique case ID generation, resolution type tracking with conditional refund processing, and SLA tracking with automatic deadline calculation and breach detection (ADR-030, ADR-046, ADR-049, ADR-051)
  - `CaseMessageService`: Manages bidirectional messaging within return/complaint cases with authorization checks, read tracking, and unread counters (ADR-048)
    - Message operations: SendMessageAsync, GetMessagesAsync, MarkMessagesAsReadAsync
    - Unread tracking: GetUnreadMessageCountAsync (single case), GetUnreadMessageCountsByUserAsync (all cases)
    - Authorization: Validates buyer/seller access, throws UnauthorizedAccessException for invalid access
    - Audit: Logs all message sends via AuditService with CaseMessageSent event type
  - `SlaMetricsService`: Calculates SLA compliance metrics and performance statistics for return/complaint cases over specified date ranges, supporting per-seller and platform-wide aggregation (ADR-051)
  - `OrderConfirmationEmailService`: Sends order confirmation emails to buyers and sellers with idempotency
  - `OrderStatusNotificationService`: Sends email notifications for shipping status changes (shipped, delivered) with tracking information and actionable links (ADR-042)
  - `PromoCodeService`: Manages promotional code validation, discount calculation, and usage tracking
  - `CommissionCalculationService`: Calculates marketplace commission rates and amounts with seller/category overrides (ADR-034)
    - Priority hierarchy: Seller-specific rate > Category-specific rate > Default rate
    - Operations: CalculateCommissionRateAsync, CalculateCommissionAmountAsync, RecalculateCommissionForRefund
    - Stores both commission rate and amount on orders for historical accuracy
  - `IPaymentService` / `Przelewy24PaymentService`: Payment provider abstraction for initiating payments, verifying status, and processing webhooks (ADR-002, ADR-033)
  - `PaymentStatusMapper`: Centralized utility for mapping external payment provider status codes to internal statuses and sanitizing failure messages (ADR-033)
  - `EscrowService`: Manages marketplace escrow transactions for holding buyer payments until fulfillment (ADR-032)
    - Operations: CreateEscrowForOrdersAsync, ReleaseEscrowToBuyerAsync, ReleaseEscrowToSellerAsync, PartiallyReleaseEscrowToBuyerAsync
    - Queries: GetEscrowForOrderAsync, GetBuyerEscrowTransactionsAsync, GetSellerEscrowTransactionsAsync, GetEscrowTransactionsEligibleForPayoutAsync
    - Payout: MarkEscrowEligibleForPayoutAsync, CalculateSellerPayoutAmount
    - Supports multi-seller order escrow allocation (one entry per sub-order)
    - Idempotent operations with full audit logging
  - `PayoutService`: Manages seller payout schedules and automated payout batch processing (ADR-035, ADR-036)
    - Schedule management: GetOrCreatePayoutScheduleAsync, UpdatePayoutScheduleAsync, CalculateNextPayoutDate
    - Payout processing: ProcessScheduledPayoutsAsync, CreatePayoutAsync, ExecutePayoutAsync, RetryFailedPayoutAsync
    - Queries: GetSellerPayoutsAsync (with status/date filtering), GetPayoutDetailsAsync (with eager loading), CalculateSellerAvailableBalanceAsync
    - Below-threshold rollover, retry logic (3 attempts), full audit trail
  - `SettlementService`: Generates monthly settlement reports aggregating seller payouts for accounting reconciliation (ADR-037)
    - Generation: GenerateMonthlySettlementAsync, RegenerateSettlementAsync (with audit trail preservation)
    - Queries: GetSettlementDetailsAsync (with eager loading), GetSettlementsAsync (with year filtering), SettlementExistsAsync
    - Export: ExportSettlementToCsvAsync, ExportSettlementToExcelAsync
    - Tracks adjustments for cross-period payouts, calculates platform revenue (total commission)
  - `CommissionInvoiceService`: Manages commission invoice generation and PDF creation for seller payouts (ADR-038)
    - Invoice generation: GenerateInvoiceForPayoutAsync (automatic on payout completion), CreateCorrectionInvoiceAsync (credit notes)
    - Queries: GetSellerInvoicesAsync (with status/date filtering), GetInvoiceByIdAsync (with eager loading)
    - PDF operations: GenerateInvoicePdfAsync (QuestPDF), GetInvoicePdfBytesAsync (with lazy generation)
    - Operations: CancelInvoiceAsync, sequential invoice numbering (INV-YYYY-MM-NNNN)
    - Captures seller information snapshot at invoice time for historical accuracy
  - `RefundService`: Orchestrates full and partial refund processing with payment provider integration (ADR-039)
    - Operations: ProcessFullRefundAsync, ProcessPartialRefundAsync
    - Integrations: Coordinates payment provider refunds, escrow releases, and commission adjustments
    - Validation: Refund eligibility checks, amount validation, duplicate prevention
    - Error handling: Logs payment provider failures to RefundError table for support visibility
    - Audit trail: Complete refund lifecycle tracking (RefundInitiated, RefundProcessed, RefundFailed events)
  - `ProductReviewService`: Manages product reviews with moderation workflow (ADR-053)
    - Review operations: SubmitReviewAsync, GetReviewsByProductAsync, GetBuyerReviewForOrderItemAsync
    - Moderation: ApproveReviewAsync, RejectReviewAsync, UpdateReviewVisibilityAsync, GetAllReviewsForModerationAsync
    - Eligibility: CheckReviewEligibilityAsync (delivered order, verified purchase, one review per item, 90-day window)
    - Aggregates: CalculateProductRatingAggregatesAsync (average rating, review count)
    - Default status: Reviews start as "Pending" and require admin approval before public display
  - `SellerRatingService`: Manages seller ratings with eligibility checks and aggregate calculations (ADR-052)
    - Rating operations: SubmitRatingAsync, GetSellerRatingsAsync, HasRatedOrderAsync
    - Eligibility: CheckRatingEligibilityAsync (delivered order, 90-day window, one rating per order)
    - Rate limiting: One rating per hour per buyer to prevent abuse
    - Aggregates: UpdateSellerRatingAggregatesAsync (updates SellerProfile.AverageRating and TotalRatings)
    - Configuration: AllowedDaysAfterDelivery (90), RateLimitHours (1)
  - `ReviewReportService`: Manages user reports of inappropriate reviews (ADR-053)
    - Report operations: SubmitReportAsync, GetReportsByReviewAsync, GetAllReportsAsync
    - Admin actions: ReviewReportAsync, DismissReportAsync
    - Duplicate prevention: Unique constraint on ReviewId+ReporterId
    - Audit logging: All report actions logged with ReportSubmitted, ReportReviewed, ReportDismissed events
  - `ReputationScoreService`: Calculates seller reputation scores based on multiple performance factors (ADR-054)
    - Score calculation: CalculateReputationScoreAsync (multi-factor algorithm with volume adjustment)
    - Component weights: Ratings 35%, Disputes 25%, On-time Delivery 25%, SLA Compliance 15%
    - Volume adjustment: Low-volume sellers penalized, scores stabilize with more data
    - Lookback period: Last 90 days for all metrics
    - Returns SellerReputation entity with component scores and supporting metrics
  - `ReputationScoreBackgroundService`: Background service for automated daily reputation score recalculation (ADR-054)
    - Runs daily at 02:00 UTC via IHostedService
    - Recalculates scores for all active sellers with KYC approved status
    - Updates SellerReputation table with latest scores and metrics
    - Audit logging: ReputationScoreCalculated events for each seller
  - `ProductQuestionService`: Manages product Q&A system with moderation workflow (ADR-057)
    - Question operations: SubmitQuestionAsync, AnswerQuestionAsync, GetVisibleQuestionsAsync
    - Seller queries: GetUnansweredQuestionsForSellerAsync
    - Moderation: ApproveQuestionAsync, RejectQuestionAsync, HideQuestionAsync
    - Notification integration: Creates in-app notifications on question submit and answer
    - Questions require admin approval before public visibility
  - `OrderMessageService`: Manages private order messaging between buyers and sellers (ADR-057)
    - Message operations: SendMessageAsync, GetMessagesAsync
    - Read tracking: MarkMessagesAsReadByBuyerAsync, MarkMessagesAsReadBySellerAsync
    - Unread counters: GetUnreadCountsByBuyerAsync, GetUnreadCountsBySellerAsync
    - Authorization: Validates buyer/seller/admin access, throws UnauthorizedAccessException for invalid access
    - Notification integration: Creates in-app notifications on new messages
    - Audit logging: Logs all message sends with CaseMessageSent event type
  - `PushSubscriptionService`: Manages web push notification subscriptions (ADR-058)
    - Subscription management: CreateOrUpdateSubscriptionAsync, GetUserSubscriptionsAsync
    - Status tracking: DeactivateSubscriptionAsync, UpdateLastSuccessfulPushAsync, VerifySubscriptionAsync
    - Cleanup: DeleteStaleSubscriptionsAsync for removing old subscriptions
    - Multi-device support: Users can have multiple active subscriptions
  - `NotificationPreferenceService`: Manages user notification preferences for email, push, and in-app channels (ADR-058)
    - Preference queries: GetUserPreferencesAsync, GetPreferenceAsync (with default creation)
    - Preference updates: UpdateWebPushPreferenceAsync, UpdateEmailPreferenceAsync, UpdatePreferenceAsync
    - Initialization: InitializeDefaultPreferencesAsync for new users
    - Preference checks: IsWebPushEnabledAsync, IsEmailEnabledAsync
    - Per-notification-type preferences with granular control
  - `WebPushNotificationService`: Sends web push notifications using Web Push Protocol and VAPID authentication (ADR-058)
    - Push operations: SendNotificationToUserAsync (all subscriptions), SendNotificationToEndpointAsync (specific subscription)
    - Preference integration: SendNotificationWithPreferenceCheckAsync (respects user preferences)
    - VAPID key management: GetVapidPublicKey for client subscription
    - Integration: Fire-and-forget pattern in OrderStatusNotificationService and other notification services
  - `SellerSalesMetricsService`: Calculates seller-specific sales performance metrics (ADR-060)
    - Metrics calculation: GetMetricsAsync (seller GMV, orders, products, ratings, commission, net revenue)
    - Time series data: GetDailySalesDataAsync (daily aggregation for charts)
    - Filter support: GetSellerCategoriesAsync (distinct categories for filtering)
    - Security: Enforces seller data isolation, only returns data for specified seller
  - `AdminOrderRevenueReportService`: Provides admin order and revenue reporting with comprehensive filtering (ADR-061)
    - Report generation: GetOrdersAsync (filtered, paginated order report data)
    - Filter support: Date range, seller, order status, payment status with pagination
    - Seller lookup: GetSellersWithOrdersAsync (distinct sellers for filter dropdown)
    - Security: Admin-only access, returns sub-orders only (ParentOrderId != null)
  - `AdminOrderRevenueExportService`: Exports admin order and revenue reports to CSV/Excel with admin-specific fields (ADR-061)
    - Export formats: CSV (UTF-8) and Excel (XLSX) with auto-fit columns and formatted numbers
    - Admin fields: Seller ID/Name, Commission Rate/Amount, Payout Amount, Payment Transaction ID
    - Financial calculations: Payout Amount = Items Subtotal - Commission Amount
    - Security: Resolves seller names from User table (CompanyName preferred over FullName)
    - Filtering: Supports date range, product ID, and category filters
  - `AdminCommissionSummaryService`: Provides admin commission revenue summaries aggregated by seller (ADR-063)
    - Summary generation: GetCommissionSummaryAsync (aggregated seller commission data with pagination)
    - Aggregations: Total GMV, Commission Amount, Net Payout, Order Count, Weighted Avg Commission Rate per seller
    - Filtering: Date range, optional seller ID filter
    - Exclusions: Cancelled and refunded orders (commission not earned)
    - Historical data: Uses stored Order.CommissionRate and CommissionAmount (no recalculation)
    - Seller lookup: GetSellersWithCommissionsAsync (distinct sellers with valid commission orders)
  - `AdminCommissionExportService`: Exports admin commission summaries to CSV/Excel formats (ADR-063)
    - Export formats: CSV (UTF-8) and Excel (XLSX) with formatted percentages and currency
    - Summary fields: Seller ID/Name, Total GMV, Commission Amount, Net Payout, Order Count, Avg Commission Rate, Avg Order Value
    - One row per seller with aggregated metrics for the selected period
  - `AdminCommissionConfigService`: Manages commission rate rules for dynamic marketplace revenue configuration (ADR-071)
    - Rule management: CreateCommissionRuleAsync, UpdateCommissionRuleAsync, DeleteCommissionRuleAsync (soft delete)
    - Rule queries: GetCommissionRulesAsync (filtered, paginated), GetCommissionRuleByIdAsync, GetAllActiveRulesAsync
    - Activation control: ActivateCommissionRuleAsync, DeactivateCommissionRuleAsync
    - Validation: ValidateCommissionRuleAsync (rate range, date range, applicability requirements, overlap detection)
    - Conflict detection: Identifies overlapping rules (same applicability + scope + date range) and warns admins
    - Audit logging: All rule changes logged with CommissionRuleCreated/Updated/Deleted/Activated/Deactivated events
    - Configuration access: GetDefaultCommissionRate (retrieves default from appsettings.json)
  - `VatConfigService`: Manages VAT/tax rate rules for multi-jurisdiction tax compliance (ADR-072)
    - Rule management: CreateVatRuleAsync, UpdateVatRuleAsync, DeleteVatRuleAsync (soft delete)
    - Rule queries: GetVatRulesAsync (filtered, paginated), GetVatRuleByIdAsync, GetAllActiveRulesAsync
    - Activation control: ActivateVatRuleAsync, DeactivateVatRuleAsync
    - Validation: ValidateVatRuleAsync (rate range 0-1, date range, applicability requirements, country code validation, overlap detection)
    - Conflict detection: Identifies overlapping rules (same applicability + scope + date range) and warns admins
    - Rate calculation: CalculateVatRateAsync (priority hierarchy: CountryCategory > Country > Category > Global > config default)
    - Audit logging: All rule changes logged with VatRuleCreated/Updated/Deleted/Activated/Deactivated events
    - Configuration access: GetDefaultVatRate (retrieves default 23% from CommissionInvoice:TaxRate)
    - Country validation: Enforces ISO 3166-1 alpha-2 country code standard (exactly 2 characters)
  - `CurrencyConfigService`: Manages platform currency configuration and base currency settings (ADR-073)
    - Currency management: CreateCurrencyAsync, UpdateCurrencyAsync, DeleteCurrencyAsync (hard delete)
    - Currency queries: GetCurrenciesAsync (filtered, paginated), GetCurrencyByIdAsync, GetCurrencyByCodeAsync, GetAllEnabledCurrenciesAsync
    - Status control: EnableCurrencyAsync, DisableCurrencyAsync
    - Validation: ValidateCurrencyAsync (3-char ISO 4217 code, positive exchange rate, decimal places 0-4, unique code check)
    - Base currency: GetPlatformSettingsAsync, ChangeBaseCurrencyAsync (requires enabled currency, triggers audit logging)
    - Protection: Cannot disable or delete base currency (requires base currency change first)
    - Audit logging: All currency changes logged with CurrencyCreated/Updated/Deleted/Enabled/Disabled/BaseCurrencyChanged events
    - Code normalization: Currency codes automatically uppercase normalized
  - `IntegrationConfigService`: Manages external integration configurations for payment, shipping, and other services (ADR-075)
    - Provider management: GetIntegrationProvidersAsync (filtered by type/status, paginated), GetProviderByIdAsync, GetProviderByCodeAsync, GetActiveProvidersAsync
    - Provider CRUD: CreateProviderAsync, UpdateProviderAsync, DeleteProviderAsync (prevents deletion if configurations exist)
    - Configuration management: GetProviderConfigurationsAsync, GetConfigurationByIdAsync, GetActiveConfigurationAsync (gets enabled config for provider)
    - Configuration CRUD: CreateConfigurationAsync, UpdateConfigurationAsync (credentials optional - empty keeps existing), DeleteConfigurationAsync
    - Credential encryption: Uses Data Protection API with "IntegrationConfigProtection" purpose for all sensitive fields
    - Status control: EnableConfigurationAsync, DisableConfigurationAsync (sets health status to Disabled)
    - Health check: UpdateHealthStatusAsync (updates health status, timestamp, message)
    - Security: Credentials encrypted at rest, masked display (last 4 chars), validation on create/update
    - Admin pages: /Admin/Settings/Integrations/Index (provider list), /Admin/Settings/Integrations/Configure (config form)
  - `FeatureFlagService`: CRUD operations for feature flag configuration with audit logging (ADR-078, Phase 2)
    - Flag management: GetFeatureFlagsAsync (filtered by key, status, environment, paginated), GetFeatureFlagByIdAsync, GetFeatureFlagByKeyAsync (by key + environment)
    - Flag CRUD: CreateFeatureFlagAsync, UpdateFeatureFlagAsync, DeleteFeatureFlagAsync (hard delete)
    - Status control: EnableFeatureFlagAsync, DisableFeatureFlagAsync (instant enable/disable without deployment)
    - Validation: ValidateFeatureFlagAsync (checks for duplicates, invalid dates, required fields)
    - Target rule management: AddTargetRuleAsync, UpdateTargetRuleAsync, DeleteTargetRuleAsync, GetTargetRulesAsync (by flag ID)
    - Audit logging: All operations logged with FeatureFlagCreated/Updated/Enabled/Disabled/Deleted/TargetRuleAdded/Updated/Deleted events
    - Admin pages: /Admin/FeatureFlags/Index (list with filters), /Admin/FeatureFlags/Create, /Admin/FeatureFlags/Edit, /Admin/FeatureFlags/Detail (with rule management)
  - `FeatureFlagEvaluationService`: Runtime evaluation of feature flags with targeting rules (ADR-078, Phase 2)
    - Evaluation: IsEnabledAsync(flagKey, userId?, userRoles?, environment?) - Returns true if feature is enabled for the user
    - Batch evaluation: EvaluateMultipleFlagsAsync(flagKeys, userId?, userRoles?, environment?) - Returns dictionary of flag statuses
    - Evaluation logic: (1) Check flag exists and IsEnabled, (2) Check effective date range, (3) Evaluate targeting rules by priority descending, (4) Return first matching rule's ReturnValue, (5) Return DefaultValue if no rules match
    - Targeting support: All users, percentage rollout (consistent hashing with SHA256), specific users, user roles, sellers, internal users
    - Consistency: Same user always gets same result for percentage rollout (deterministic hashing)
    - Performance: Direct database queries, can be optimized with caching in future
    - Usage: Call from application code to check if features should be shown/enabled
  - `AdminLegalDocumentService`: Manages legal document versions and user consent tracking for GDPR compliance (ADR-076)
    - Document management: GetDocumentsAsync (list all with active versions), GetDocumentByIdAsync, GetDocumentByTypeAsync, CreateDocumentAsync, UpdateDocumentAsync, DeleteDocumentAsync
    - Version management: CreateVersionAsync (starts as Draft), UpdateVersionAsync (draft only), GetVersionByIdAsync, GetVersionsByDocumentIdAsync, GetActiveVersionByDocumentTypeAsync
    - Publishing: PublishVersionAsync (publish immediately, expires current), ScheduleVersionAsync (schedule for future effective date), ArchiveVersionAsync, DeleteVersionAsync (draft only)
    - Consent tracking: RecordUserConsentAsync (records with IP/user agent), GetUserConsentsAsync, GetUserConsentForDocumentTypeAsync, GetConsentCountForVersionAsync
    - Background operations: ProcessScheduledPublicationsAsync (auto-publish scheduled versions)
    - Audit logging: All actions logged with LegalDocumentCreated/Updated/Deleted/VersionCreated/Published/Scheduled/Expired/Archived/UserConsentRecorded events
    - Version lifecycle: Draft → Published/Scheduled → Expired/Archived
    - Admin pages: /Admin/LegalDocuments/Index (all documents), /Admin/LegalDocuments/Detail (versions list), /Admin/LegalDocuments/CreateVersion, /Admin/LegalDocuments/EditVersion, /Admin/LegalDocuments/ViewVersion
  - `AuditLogViewerService`: Views and filters audit logs across the system (ADR-077)
    - Credential access: GetDecryptedCredentialsAsync (admin use only), GetMaskedCredentials (displays last 4 chars only: ****1234)
    - Validation: ValidateConfigurationAsync (required fields, provider existence, configuration name length)
    - Audit logging: All changes logged with SettingsUpdated event type (provider/configuration changes)
    - Security: All credentials encrypted at rest, never exposed in logs or UI unmasked
  - `CommissionCalculationService`: Calculates marketplace commission rates and amounts (ADR-034, ADR-071)
    - Rate calculation: CalculateCommissionRateAsync (four-tier hierarchy: rules > seller override > category override > default)
    - Amount calculation: CalculateCommissionAmountAsync (applies rate to subtotal, rounds to 2 decimals)
    - Refund recalculation: RecalculateCommissionForRefund (proportional commission adjustment for partial refunds)
    - Rule evaluation: Active rules filtered by date range (EffectiveFrom <= now <= EffectiveTo), sorted by Priority (descending) then Applicability (Seller > Category > Global)
    - Backward compatibility: Legacy SellerProfile.CommissionRate and CategoryModel.CommissionRate still work if no rules match
  - `UserAnalyticsService`: Calculates user registration and activity analytics for admin reporting (ADR-064)
    - Registration metrics: New buyer accounts, new seller accounts (by UserType and DateJoined)
    - Activity metrics: Users who placed orders (distinct BuyerId), users who logged in (LoginSuccess audit events)
    - Active user calculation: Union of login users and order users (captures both browsing and transactional activity)
    - Privacy-compliant: All metrics aggregated and anonymized, no personal data exposure
    - Data sources: ApplicationUser (registration), Orders (purchase activity), AuditLog (login activity)
  - `AdminUserManagementService`: Provides admin user account management with filtering, search, and blocking (ADR-066, ADR-067)
    - User listing: GetUsersAsync (filtered, paginated user list with roles)
    - Search: By email, name, user ID, or company name
    - Filtering: User type (Buyer/Seller), account status (Active/Blocked/PendingVerification), KYC status
    - Account blocking: BlockUserAsync (block account with reason, audit logging, store suspension for sellers)
    - Account unblocking: UnblockUserAsync (unblock account with audit logging)
    - Statistics: GetUserStatisticsAsync (total users, buyers, sellers, admins, pending verification, pending KYC, blocked)
    - User details: GetUserByIdAsync (full user information for detail view)
    - Privacy-compliant: Only shows necessary personal data for admin operations
  - `AuditLogViewerService`: Provides comprehensive audit log viewing with advanced filtering for investigation and compliance (ADR-077)
    - Log retrieval: GetAuditLogsAsync (paginated audit logs with comprehensive filtering)
    - Search: By description, IP address, entity ID, or user email
    - Filtering: Date range, admin user, entity type, entity ID (resource-specific), event type
    - Resource history: Filter by entity ID to view complete change history for specific resources
    - Metadata: GetEntityTypesAsync (distinct entity types), GetEventTypesAsync (all event types from enum)
    - Authorization: Access restricted to Admin role only
    - Pagination: Supports 25/50/100 items per page (default 50)
    - Ordering: Most recent logs first (CreatedAt descending)
  - `AuditLogRetentionService`: Manages audit log retention policies and automated archival for compliance (ADR-086)
    - Retention enforcement: EnforceRetentionPolicyAsync (archives and deletes expired logs based on event criticality)
    - Policy configuration: 7-year retention for critical/financial events, 1-year for standard events
    - Archive management: Archives logs to AuditLogArchive before deletion for compliance
    - Critical events: 56+ event types including failed logins, role changes, payments, refunds, account operations
    - Background execution: AuditLogRetentionBackgroundService runs daily at 2 AM
    - Batch processing: Handles large volumes efficiently with transaction safety
  - `AnalyticsService`: Records user behavior events for advanced analytics (ADR-065, Phase 2)
    - Event recording: TrackEventAsync (generic), TrackProductViewAsync, TrackSearchAsync, TrackAddToCartAsync, TrackCheckoutStartedAsync, TrackOrderCompletedAsync
    - Fire-and-forget pattern: All tracking operations non-blocking to avoid impacting main application flow
    - Configurable: Respects Analytics:Enabled setting, graceful degradation on failure
    - Context capture: User/session ID, authentication status, IP address, user agent, additional JSON data
    - Privacy features: Supports anonymous session tracking, IP can be anonymized
    - Integration: Integrated into Search, Product Detail, Checkout, and Order Confirmation pages
  - `AnalyticsQueryService`: Retrieves and analyzes tracked analytics events (ADR-065, Phase 2)
    - Time-range queries: GetEventsByDateRangeAsync (with optional event type filter)
    - Entity queries: GetEventsByUserAsync, GetEventsByProductAsync
    - Aggregations: GetEventCountAsync, GetEventCountsByTypeAsync
    - Rankings: GetTopViewedProductsAsync, GetTopSearchQueriesAsync
    - Use cases: Funnel analysis, product analytics, search effectiveness, user journey reconstruction
    - Performance: Utilizes composite indexes for efficient time-range and product queries
  - `OrderExportService`: Exports seller orders to CSV/Excel with comprehensive order and financial details (ADR-062)
    - Export formats: CSV (RFC 4180 compliant) and Excel (XLSX) with formatting and auto-fit columns
    - Financial fields: Items Subtotal, Shipping Cost, Total Amount, Commission Amount, Commission Rate, Net Payout
    - Order details: 26 columns including buyer info, delivery address, shipping tracking, item details
    - Security: Used exclusively for seller exports via GetSellerOrdersAsync (data isolation)
    - Filter support: Exports ALL orders matching current filter state (no pagination)
  - `PayoutBackgroundService`: Background service for automated payout processing (ADR-035)
    - Runs hourly to create and execute scheduled payouts
    - Integrates with EscrowService to release funds on successful payout
    - Automatically triggers invoice generation via CommissionInvoiceService
  - `BuyerRegistrationEmailService`: Sends welcome emails to newly registered buyer accounts
    - Email content: Welcome message, account activation, getting started guide
    - Triggered: During buyer registration flow
  - `BuyerRefundNotificationService`: Sends refund status notifications to buyers
    - Notifications: Refund initiated, processing, completed, failed
    - Triggered: During refund processing flow
  - `SellerPayoutNotificationService`: Sends payout status notifications to sellers
    - Notifications: Payout scheduled, processing, completed, failed
    - Triggered: During payout processing flow
  - `SellerReturnNotificationService`: Sends return/complaint notifications to sellers
    - Notifications: New return request, buyer message, resolution required
    - Triggered: During return/complaint processing flow
  - `NotificationCenterService`: Manages in-app notification center for users
    - Notification creation: CreateNotificationAsync (creates notification with title, description, related entity, action URL)
    - Notification management: GetUserNotificationsAsync (paginated), MarkAsReadAsync, MarkAllAsReadAsync, DeleteNotificationAsync
    - Filtering: Support for notification type filtering (OrderEvent, ReturnEvent, PayoutEvent, MessageAlert, SystemUpdate)
    - Read tracking: IsRead flag and ReadAt timestamp for notification management
  - `ProcessingActivityService`: GDPR Article 30 processing activity registry management (ADR-079)
    - CRUD operations: CreateAsync, UpdateAsync, DeleteAsync (soft delete), GetByIdAsync, GetActivitiesAsync with filtering
    - Status management: SetActiveStatusAsync for activating/deactivating activities
    - History tracking: GetWithHistoryAsync returns activity with complete change history and admin user resolution
    - Filtering: Search term, legal basis, active status with pagination
    - Statistics: GetStatisticsAsync provides dashboard metrics (total, active, by legal basis, international transfers)
    - Export support: GetAllForExportAsync for CSV/Excel export
    - Version history: Automatic snapshot creation on all changes with user tracking and change notes
  - `ProcessingActivityExportService`: Export processing activities to CSV/Excel formats (ADR-079)
    - CSV export: RFC 4180 compliant with proper escaping, UTF-8 encoding, all 20 fields included
    - Excel export: Professional formatting with bold headers, colored backgrounds, auto-fit columns, text wrapping
    - Content types: text/csv and application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
    - Legal basis mapping: Human-readable GDPR Article 6 references in exports
  - `PermissionService`: RBAC permission management for fine-grained access control (ADR-080)
    - Permission queries: GetPermissionsGroupedByModuleAsync (UI display), GetRolePermissionsAsync (role permissions), GetPermissionsWithRoleStatusAsync (admin UI)
    - User permission checks: UserHasPermissionAsync (single permission), GetUserPermissionsAsync (all permissions across roles)
    - Role permission management: GrantPermissionToRoleAsync, RevokePermissionFromRoleAsync with audit logging
    - Bulk operations: GrantPermissionsToRoleAsync, RevokePermissionsFromRoleAsync, SyncRolePermissionsAsync
    - Permission model: Module.Action pattern (e.g., "Products.Create", "Orders.View")
    - Authorization: Used by PermissionAuthorizationHandler for policy-based authorization
    - Audit trail: All permission changes logged with admin attribution
  - `ConsentManagementService`: GDPR consent management for user privacy preferences (ADR-082)
    - Consent operations: GrantConsentAsync, WithdrawConsentAsync, HasActiveConsentAsync, GetUserConsentStatusAsync
    - Consent types: Manages consent types by category (Marketing, Profiling, ThirdPartySharing, Legal)
    - Version tracking: Links consents to specific consent text versions for audit compliance
    - Consent history: GetUserConsentHistoryAsync provides complete audit trail with IP/user agent
    - Audit logging: Records all consent grants/withdrawals with UserConsentRecorded events
  - `UserDataExportService`: User personal data export for GDPR Right of Access compliance (ADR-083)
    - Export request management: CreateExportRequestAsync, GenerateExportAsync, GetUserExportRequestsAsync, GetExportRequestAsync, DownloadExportAsync
    - Data collection: Collects personal data from 14 categories: user profile, seller profile, payout accounts, orders (buyer/seller), delivery addresses, product reviews, seller ratings, product questions, order messages, case messages, login history, user consents, notification preferences
    - Export formats: JsonZip (single formatted JSON file), CsvZip (14 separate CSV files + README)
    - File generation: Creates ZIP archive with data and README explaining export contents
    - File storage: Configurable via DataExport:StoragePath setting, default to temp folder
    - File retention: Export files available for 30 days, automatic expiration tracking
    - Authorization: Users can only create and download their own exports
    - Status tracking: Pending → Processing → Completed/Failed lifecycle with error logging
    - Audit logging: Logs UserDataExportRequested, UserDataExportCompleted, UserDataExportFailed, UserDataExportDownloaded events
  - `UserDeletionService`: User account deletion with anonymization for GDPR Right to Erasure compliance (ADR-084)
    - Request management: CreateDeletionRequestAsync, GetDeletionRequestsAsync, GetDeletionRequestAsync, GetUserDeletionRequestsAsync
    - Validation: ValidateDeletionEligibilityAsync (checks blocking conditions: open disputes, pending payouts, orders in transit, held escrow funds)
    - Workflow: ApproveDeletionRequestAsync, RejectDeletionRequestAsync, ExecuteDeletionAsync (admin-controlled)
    - Impact preview: GetDeletionImpactPreviewAsync (shows what will be anonymized/deleted/retained)
    - Anonymization strategy: Pseudonymizes personal data in user profile, seller profile, payout accounts, delivery addresses, reviews, ratings, questions, messages
    - Data deletion: Removes login history, consent records, notification preferences, cart items, Identity system user record
    - Data retention: Preserves orders, transactions, financial records with anonymized personal fields for legal compliance (configurable retention period, default 7 years)
    - Blocking conditions: Rejects requests with open disputes, pending payouts, recent orders in transit, held escrow funds
    - Transaction-safe: Executes in database transaction with automatic rollback on failure
    - Status lifecycle: Pending → UnderReview → Approved → Processing → Completed/Failed
    - Admin oversight: Requires manual approval before execution to prevent accidental deletions
    - Audit logging: Logs AccountDeletionRequested, AccountDeletionApproved, AccountDeletionRejected, AccountDeletionCompleted, AccountDeletionFailed, AccountDataAnonymized events
  - `ResourceOwnershipService`: Multi-tenant access control and resource ownership validation (ADR-081)
    - Ownership checks: CheckResourceAccessAsync (generic), CanAccessProductAsync, CanAccessOrderAsync, CanAccessReturnRequestAsync, CanAccessPayoutAsync, CanAccessCaseAsync
    - Multi-tenant isolation: Validates SellerId and BuyerId fields to prevent cross-tenant data access
    - Resource types: Product, Order, ReturnRequest, Payout, Case, UserProfile
    - Access rules: Products (seller only), Orders (buyer or seller), Payouts (seller only), Returns/Cases (buyer and seller)
    - Security logging: Records access denial reasons for monitoring
    - Authorization: Used by ResourceOwnershipAuthorizationHandler for resource-based authorization
  - `SecurityIncidentService`: Security incident management for threat tracking and response (ADR-087)
    - Incident creation: CreateIncidentAsync (auto-generates unique INC-YYYYMMDD-XXXXX identifier)
    - Query and filtering: GetIncidentsAsync (supports date range, severity, status, type, user, IP, search term filtering with pagination)
    - Detail retrieval: GetIncidentDetailAsync (returns complete incident with history and actor details)
    - Workflow management: TriageIncidentAsync, StartInvestigationAsync, ResolveIncidentAsync, MarkAsFalsePositiveAsync
    - Status updates: UpdateIncidentStatusAsync (generic status/severity update with history tracking)
    - Alerting support: GetIncidentsRequiringAlertsAsync (finds high/critical unalerted incidents), MarkAlertsAsSentAsync
    - Statistics: GetIncidentStatisticsAsync (aggregated counts by severity, status, type for reporting)
    - History tracking: Automatic history recording on all status changes with actor, timestamp, and notes
    - 15 incident types: MultipleFailedLogins, SuspiciousApiUsage, DataAccessAnomaly, UnauthorizedAccessAttempt, AccountTakeover, BruteForceAttack, SqlInjectionAttempt, XssAttempt, CsrfAttempt, SuspiciousFileUpload, PrivilegeEscalation, DataExfiltration, MaliciousPayload, RateLimitExceeded, Other
    - 4 severity levels: Critical, High, Medium, Low
    - 6 status states: Detected, Triaged, InInvestigation, Resolved, Closed, FalsePositive
  - `SecurityIncidentExportService`: Export security incidents to CSV/Excel formats (ADR-087)
    - Export formats: CSV (text/csv), Excel (XLSX with formatting)
    - Export fields: IncidentId, Type, Severity, Status, Description, DetectionRule, Source, UserId, IpAddress, Detected/Triaged/Investigation/Resolved timestamps, ResolutionNotes, AlertsSent
    - CSV features: Proper escaping for commas, quotes, newlines; ISO 8601 date formatting
    - Excel features: Styled headers with background color, auto-fit columns, formatted cells
    - Utility methods: GetContentType, GetFileExtension for proper HTTP response headers
  - `SecurityIncidentAlertBackgroundService`: Automated email alerting for high-severity security incidents (ADR-087)
    - Background service: Runs every 5 minutes checking for incidents requiring alerts
    - Configurable alerting: AlertingEnabled (on/off), AlertSeverityThreshold (default: High), AlertRecipients (email list)
    - Alert criteria: High or Critical severity incidents that haven't been alerted yet
    - Email delivery: HTML-formatted emails with color-coded severity, complete incident details, direct link to admin portal
    - Delivery tracking: Marks incidents as alerted after successful email send
    - Graceful degradation: Logs alerts if SMTP not configured, continues on individual failures
  - `SensitiveDataProtectionService`: Application-level encryption for sensitive personal data (ADR-085)
    - Field encryption: EncryptData (general sensitive data), EncryptIdNumber (national IDs, tax IDs)
    - Field decryption: DecryptData, DecryptIdNumber (returns null on failure for security)
    - Protection scopes: Separate data protectors for different data types (defense in depth)
    - Key management: Integrates with ASP.NET Core Data Protection API
    - Use cases: PersonalIdNumber, TaxId encryption for GDPR compliance
    - Error handling: Graceful decryption failure handling for key rotation scenarios
  - `EmailSender`: SMTP-based email delivery
  - `RoleSeeder`: Automatic role initialization (includes internal user roles)
- `Middleware`: Cross-cutting concerns
  - `AuthorizationLoggingMiddleware`: Logs unauthorized access attempts
  - `SellerKycMiddleware`: Enforces KYC requirements for sellers (exempt: onboarding wizard)
  - `SecurityHeadersMiddleware`: Applies comprehensive security headers for encryption in transit (ADR-085)
    - HSTS: Strict-Transport-Security with 1-year max-age, includeSubDomains, preload
    - Content Security Policy: Restricts resource loading to prevent XSS
    - X-Content-Type-Options: Prevents MIME type sniffing
    - X-Frame-Options: Prevents clickjacking (DENY)
    - X-XSS-Protection: Browser XSS protection for legacy browsers
    - Referrer-Policy: Controls referrer information leakage
    - Permissions-Policy: Disables sensitive browser features
- `Extensions`: Service configuration extensions
  - `EncryptionServiceExtensions`: Configures Data Protection with Azure Key Vault or AWS KMS integration (ADR-085)
    - Key management providers: FileSystem (dev), AzureKeyVault (production), AwsKms (production)
    - Key storage: Azure Blob Storage or AWS Parameter Store for persistence
    - Key protection: Azure Key Vault KEK or AWS KMS for key encryption
    - Configuration: Reads from Encryption section in appsettings
- `Configuration`: Configuration classes
  - `EncryptionConfiguration`: Encryption and key management settings (ADR-085)
    - KeyManagementProvider: FileSystem, AzureKeyVault, or AwsKms
    - AzureKeyVaultConfig: Vault URI, key identifier, blob storage URI, authentication
    - AwsKmsConfig: Key ID, Parameter Store path, region, credentials
    - DatabaseEncryptionConfig: TDE settings, connection encryption
    - FileStorageEncryptionConfig: File and backup encryption settings
- `Areas/Identity/Pages`: Razor Pages for authentication flows
  - Account: Login, Register, Email Confirmation, Password Reset, External Login, Accept Team Invitation (Phase 2)
  - Manage: Password Change, Security Settings
- `Pages/Seller/Onboarding`: Multi-step seller onboarding wizard
  - Index: Routes to appropriate step
  - StoreProfile: Store basics (name, description, category, seller type selection)
  - VerificationData: Business verification information (adapts based on seller type)
    - Company: company name, registration number, tax ID, address, contact person
    - Individual: personal ID number, residential address
  - PayoutBasics: Payout account setup
  - Complete: Completion and next steps

## Data
- Web App has `ApplicationDbContext` for Identity, AuditLog, LoginHistory, SellerProfile, PayoutAccount, SellerOnboardingProgress, SellerInternalUser, SellerInternalUserInvitation, CartItem, DeliveryAddress, ShippingMethod, SellerShippingMethod, ShippingProvider, SellerShippingProviderConfig, ShipmentIntegration, Order, OrderItem, ReturnRequest, ReturnRequestItem, CaseMessage, PromoCode, PromoCodeUsage, EscrowTransaction, PayoutSchedule, SellerPayout, PayoutEscrowTransaction, MonthlySettlement, SettlementPayout, CommissionInvoice, RefundError, ProductReview, SellerRating, ReviewReport, SellerReputation, ProductQuestion, OrderMessage, PushSubscription, NotificationPreference, NotificationCenter, AnalyticsEvent, CommissionRule, VatRule, Currency, PlatformSettings, IntegrationProvider, IntegrationConfiguration, FeatureFlag, FeatureFlagTargetRule, LegalDocument, LegalDocumentVersion, UserConsent, ProcessingActivity, ProcessingActivityHistory, Permission, and RolePermission.
- Products module has its own `ProductDbContext` with separate migrations.

## Dependency Flow
- WebApp -> Application (use cases) -> Domain (interfaces)
- Infrastructure implements Domain interfaces and is registered in DI at startup.
- Tests reference Application and Domain, mocking `IProductRepository`.

## DI and Startup
- `Program.cs` configures:
  - Razor Pages with authorization policies
  - ASP.NET Core Identity with ApplicationDbContext
    - Password policy: 8+ chars, uppercase, lowercase, digit, special character
    - Account lockout: 5 attempts, 5-minute lockout
    - Secure cookie settings: HttpOnly, Secure, SameSite=Strict
    - 14-day sliding session expiration
  - External authentication (Google, Facebook) for buyers
  - Products module `ProductDbContext`
  - Registers `IProductRepository` with `ProductRepository`
  - Registers application services (GetProducts, AuditService, LoginHistoryService, SellerOnboardingService, SellerProfileService, PayoutAccountService, SellerInternalUserService, ProductManagementService, ProductValidationService, ProductImageService, ProductImportService, ProductExportService, BulkProductUpdateService, CategoryManagementService, ProductVariantService, AdminProductManagementService, AdminPhotoModerationService, CartService, CartCalculationService, GuestCartIdentifierService, CartMergeService, AddressService, ShippingService, SellerShippingMethodService, ShippingProviderService, ShippingLabelService, OrderService, OrderExportService, ReturnRequestService, CaseMessageService, SlaMetricsService, OrderConfirmationEmailService, OrderStatusNotificationService, PromoCodeService, CommissionCalculationService, Przelewy24PaymentService, PaymentStatusMapper, EscrowService, PayoutService, SettlementService, CommissionInvoiceService, RefundService, ProductReviewService, SellerRatingService, ReviewReportService, ReputationScoreService, PayoutBackgroundService, ReputationScoreBackgroundService, ProductQuestionService, OrderMessageService, PushSubscriptionService, NotificationPreferenceService, WebPushNotificationService, MarketplaceMetricsService, SellerSalesMetricsService, AdminOrderRevenueReportService, AdminOrderRevenueExportService, AdminCommissionSummaryService, AdminCommissionExportService, UserAnalyticsService, AnalyticsService, AnalyticsQueryService, EmailSender)
  - Middleware pipeline: Authentication → Authorization → AuthorizationLogging → SellerKyc
  - Role seeding on startup (Buyer, Seller, Admin, StoreOwner, CatalogManager, OrderManager, ReadOnly)

## UI Pages (Razor Pages)
- Pages in `Application/SD.ProjectName.WebApp/Pages/*`
- Example: `Pages/Products/List.cshtml` + `List.cshtml.cs` consumes `GetProducts` via DI.
- Identity pages in `Areas/Identity/Pages/Account/*` for authentication flows
- Seller-specific pages in `Pages/Seller/*`:
  - `Kyc/Status`: KYC verification status
  - `Onboarding/*`: Multi-step onboarding wizard (Index, StoreProfile, VerificationData, PayoutBasics, Complete)
  - `Dashboard/Index`: Sales performance dashboard with KPI cards, date/product/category filters, and Chart.js time series visualization (ADR-060)
  - `Settings/Profile`: Store profile management (name, logo, description, contact details, policies)
  - `Settings/Payout`: Payout account configuration (bank accounts, PayPal, default selection)
  - `Settings/ShippingMethods`: Shipping method configuration (enable/disable methods, regions, display order) (ADR-041)
  - `Team/*`: Internal user management (Index, Invite, Edit) for managing seller team members (Phase 2)
  - `Products/*`: Product catalog management
    - `Index`: List all seller's products with status, stock, and quick actions
    - `Create`: Add new product form with validation (defaults to Draft status)
    - `Edit/{id}`: Update existing product with ownership validation
  - `Orders/*`: Seller order management (ADR-027, ADR-028, ADR-029)
    - `Index`: List seller's orders with filtering (status, date range), pagination, and CSV/Excel export
    - `Detail/{id}`: Order detail with buyer information, fulfillment controls, item-level actions, and activity log
  - `Cases/*`: Return and complaint case management (ADR-047)
    - `Index`: List all incoming return/complaint requests with case info, buyer names, status badges, and review links
    - `Detail/{id}`: Case detail with buyer request, order context, action forms (approve/reject/complete), and status timeline
  - `Payouts/*`: Seller payout management (ADR-035, ADR-036)
    - `Index`: Payout history with schedule display, available balance, status/date filtering, and payout links
    - `Detail/{id}`: Payout detail with complete financial breakdown, order list, failed reasons, reconciliation data, and invoice download link
  - `Invoices/*`: Commission invoice management (ADR-038)
    - `Index`: Invoice list with status/date filtering, PDF download, and financial summary totals
    - `Download`: PDF download handler for commission invoices (validates seller ownership)
- Public pages in `Pages/*`:
  - `Products/List`: Public product catalog with card-based layout, showing images, prices, and stock status
  - `Products/Detail/{id}`: Product detail page with image carousel, complete information, shipping details, and product reviews (ADR-053)
    - Review display: Average rating with stars, review count, sorting options (newest/highest/lowest), pagination (10 per page)
    - Review content: Buyer first names (privacy), rating, review text, submission date
    - Report functionality: Users can report inappropriate reviews at `/Products/Reviews/Report`
  - `Store/Index`: Public-facing store profile page displaying seller information (accessible via /Store/{slug}) (ADR-052)
    - Seller rating display: AverageRating and TotalRatings with star visualization
    - Store visibility rules: Only shows stores with Active or LimitedActive status AND KYC Approved
    - Draft and Suspended stores return 404 with appropriate message
  - `Cart/Index`: Shopping cart page with items grouped by seller, shipping costs, and totals
  - `Checkout/Index`: Checkout page with delivery address selection (saved addresses for authenticated users), shipping method selection, payment method selection, and order summary (integrates with buyer address management from ADR-040)
  - `Checkout/Payment`: Payment method selection page with Przelewy24 integration
  - `Checkout/PaymentReturn`: Payment return page handling provider redirects and status verification (ADR-033)
  - `Checkout/Confirmation`: Order confirmation page showing order details and delivery information
  - `Orders/Index`: Buyer order history with list of all orders, statuses, and totals
  - `Orders/Detail/{id}`: Detailed order view with items, delivery address, status tracking, payment status display (ADR-033), and links to rate seller and review products
  - `Orders/Review/Submit`: Product review submission form for delivered order items (ADR-053)
    - Verified purchase validation: Reviews linked to OrderItem ensure only actual buyers can review
    - Eligibility checks: Order delivered, within 90-day window, one review per item
    - Moderation workflow: Reviews default to "Pending" status and require admin approval
  - `Orders/RateSeller/Index`: Seller rating form for delivered orders (ADR-052)
    - Eligibility checks: Order delivered, within 90-day window, one rating per order
    - Rate limiting: One rating per hour per buyer to prevent abuse
    - Updates SellerProfile aggregates (AverageRating, TotalRatings)
- Buyer-specific pages in `Pages/Buyer/*` (ADR-040):
  - `Addresses/Index`: List all saved shipping addresses with empty state, edit/delete/set default actions
  - `Addresses/Add`: Create new shipping address with validation and default option
  - `Addresses/Edit/{id}`: Update existing address with ownership verification
- `Controllers/PaymentWebhookController`: API endpoint at `/Api/PaymentWebhook` for receiving payment provider webhooks (ADR-033)
- Admin pages in `Pages/Admin/*`:
  - `Index`: Dashboard with user statistics
  - `Dashboard/*`: Marketplace performance dashboard (ADR-059)
    - `Index`: Performance metrics dashboard with GMV, orders, active sellers, products, and new users KPIs with date range filtering (today, last 7/30 days, this/last month, custom range)
  - `Categories/*`: Category management (create, edit, delete, reorder)
  - `Reviews/*`: Product review moderation (ADR-053, ADR-070)
    - `Index`: List all reviews with moderation status filters (Pending/Approved/Rejected), visibility filters, and statistics dashboard
    - `Detail/{id}`: Review detail with full context (buyer info, product, order), moderation actions (approve/reject with buyer notifications), and visibility toggle
  - `ReviewReports/*`: Review report management (ADR-053)
    - `Index`: List all user-submitted review reports with status filters and report reason display
    - `Detail/{id}`: Report detail with review context and admin actions (review report, dismiss report)
  - `SellerRatings/*`: Seller rating moderation (ADR-070)
    - `Index`: List all seller ratings with moderation status filters (Pending/Approved/Rejected), visibility filters, buyer/seller names, and rating display
    - `Detail/{id}`: Rating detail with full context (buyer info, seller info, order), moderation actions (approve/reject with buyer notifications), and visibility toggle
  - `Cases/*`: Return and complaint case management (ADR-047, ADR-050)
    - `Index`: List all return/complaint requests with case info, buyer names, status badges, and review links
    - `Detail/{id}`: Case detail with buyer request, order context, escalation/decision forms, and status timeline
    - `Sla`: SLA metrics dashboard with compliance statistics and breach tracking (ADR-051)
  - `Settlements/Index`: Monthly settlements list with generation form and year filtering (ADR-037)
  - `Settlements/Detail/{id}`: Settlement detail view with payout breakdown, export buttons (CSV/Excel), and adjustment indicators (ADR-037)
  - `Reports/Orders`: Order and revenue report page with comprehensive filtering and CSV/Excel export (ADR-061)
    - Filter controls: Date range (presets + custom), seller dropdown, order status (multi-select), payment status (multi-select)
    - Report table: Order details with seller info, buyer, financial metrics (order value, commission, payout amount)
    - Export functionality: CSV/Excel export with all matching orders (not paginated), includes admin-specific fields
    - Pagination: Configurable page size (20/50/100), page navigation, total count display
  - `Commissions/*`: Commission revenue summaries and seller breakdown (ADR-063)
    - `Summary`: Commission summary dashboard with aggregated seller commission data, KPI cards (Total GMV, Commission Revenue, Net Payout, Orders/Sellers), date range filtering, and CSV/Excel export
    - `SellerOrders`: Drill-down view showing individual orders for a specific seller with commission details, date range filtering, and export capability
  - `Analytics/*`: User analytics and reporting (ADR-064)
    - `Users`: User registration and activity analytics with KPI cards showing new buyer/seller accounts, total active users, order placement activity, and login activity with date range filtering (today, last 7/30 days, this/last month, custom range) and privacy-compliant aggregated metrics
  - `Users/*`: User account management (ADR-066)
    - `Index`: User management dashboard with statistics cards (total users, buyers, sellers, admins, pending verification, pending KYC, blocked users), filters (search, user type, account status, KYC status), and paginated user table with key attributes
    - `Detail/{id}`: User detail view with basic information, account status, seller-specific info (business details, KYC status), statistics (orders, spent/revenue, products, pending returns), recent login history, and recent activity audit logs
  - `AuditLogs/*`: Audit log viewer for investigation and compliance (ADR-077)
    - `Index`: Comprehensive audit log viewer with advanced filtering (date range, admin user, entity type, entity ID, event type), search (description, IP, email), paginated log table with timestamp, admin user, event type badge, description, entity info, and IP address, and additional data modal for detailed JSON context
  - `FeatureFlags/*`: Feature flag management for controlling feature rollout (ADR-078, Phase 2)
    - `Index`: Feature flag list with filters (search key/name, environment, status), environment/status badges, targeting rule count, effective dates, enable/disable/delete actions
    - `Create`: Form to create new feature flags with key, name, description, environment, IsEnabled toggle, DefaultValue, effective date range
    - `Edit`: Form to modify existing flags with metadata panel (created/modified by info)
    - `Detail`: Comprehensive detail view with flag status, targeting rules table (priority, scope, target value, return value), add targeting rule form with dynamic fields based on scope (All/Percentage/SpecificUsers/UserRoles/Sellers/InternalUsers), JavaScript helper for target value placeholder/help text
  - `Products/*`: Product moderation (ADR-068)
    - `Index`: Product moderation queue with status/category filters, bulk approve/reject actions, and seller information
    - `Detail/{id}`: Product detail for moderation with full product information, images, seller details, approve/reject actions, and moderation history
  - `Photos/*`: Product photo moderation (ADR-069)
    - `Index`: Photo moderation queue with thumbnail grid display, status filters (PendingReview/Approved/Removed), flagged-only filter, pagination (20 per page), visual badges (Flagged/Main), and links to product/seller detail pages
    - `Detail/{id}`: Photo review page with large photo preview, dimensions/file size display, flagged alert banner, photo details sidebar, product/seller information cards, approve/remove actions with modal confirmation, and moderation history timeline
  - `Settings/Currencies/*`: Currency configuration and base currency management (ADR-073)
    - `Index`: Currency list with base currency display, status filters (Enabled/Disabled), enable/disable/delete actions, exchange rate and source display, and last update timestamps
    - `Create`: Add new currency form with ISO 4217 code validation, exchange rate input, rate source specification, decimal places configuration, and display order setting
    - `Edit/{id}`: Update currency details including exchange rates, rate sources, decimal places, and status with audit trail display
  - `Settings/Integrations/*`: External integration configuration and management (ADR-075)
    - `Index`: Integration provider list with type filters (Payment/Shipping/ERP/Marketing/Analytics), status filters (Active/Inactive), expandable configuration tables per provider, health status badges (Healthy/Degraded/Unhealthy/Disabled/Unknown), last health check timestamps, and quick actions (Configure/Test Connection/Enable/Disable)
    - `Configure?providerId={id}&configId={id}`: Create or edit integration configuration with basic settings (name, environment, sandbox toggle), encrypted credential fields (API key, secret, merchant ID, additional credential) with masked display (****1234), endpoint information display, callback URL configuration, test connection button, and save/test functionality
  - `DataProcessing/*`: GDPR Article 30 processing activity registry (ADR-079)
    - `Index`: Processing activities list with statistics dashboard (total, active, by legal basis, international transfers), search/filter form (search term, legal basis, active status), paginated table with key attributes, CSV/Excel export buttons, and visual indicators for international transfers
    - `Create`: Comprehensive form for new processing activities with sections for basic info, legal basis (Art. 6), data subjects/categories, recipients/processors, international transfers, retention/security, and internal notes with inline help text and GDPR guidance
    - `Edit/{id}`: Update processing activity with all fields from Create plus status toggle, change notes field for audit trail, and pre-populated data
    - `Detail/{id}`: Read-only detailed view with status indicator, activate/deactivate actions, all processing activity information displayed in sections, highlighted international transfer warnings, and complete change history table with admin user names
  - `Permissions/*`: Role and permission management (ADR-080)
    - `Index`: RBAC management interface with role list (left panel showing permission counts), permission management panel (right panel) with permissions grouped by module, checkbox-based assignment, and bulk save functionality

### UI Features (No Dedicated ADR)

**Recently Viewed Products**:
- Client-side localStorage tracking of viewed products (max 10)
- JavaScript module in `wwwroot/js/site.js` stores product IDs
- `GetProducts.GetRecentlyViewed()` fetches active products preserving view order
- Displayed via `_RecentlyViewedProducts.cshtml` partial on home page and product detail page
- Automatically maintains product history across sessions

**Search Autocomplete Suggestions**:
- Real-time search suggestions with debouncing (300ms, 2 character minimum)
- Returns both categories and products (max 10 results)
- API endpoint: `GET /api/search/suggestions?q={query}`
- JavaScript dropdown with visual indicators and keyboard support
- Graceful degradation if suggestions fail
- See ADR-003 for full implementation details

**Navigation State Preservation**:
- `returnUrl` query parameter preserves search/filter state
- Product detail page shows "Back to Results" when returnUrl present
- Enables seamless back navigation from product details to search results
- Filter parameters preserved: category, minPrice, maxPrice, inStockOnly, sortBy, page

**Filter Persistence**:
- Product filters persist across page refreshes via GET query parameters
- Compatible with browser back/forward navigation
- Clear All button resets filters and reloads page
- Applied to both `/Search/Results` and `/Categories/Browse` pages

---

## Shopping Cart & Checkout Flow

### Multi-Seller Shopping Cart (ADR-018)
- **Database-backed persistence**: CartItem entity stores user carts across sessions
- **Multi-seller support**: Items grouped by seller for future order splitting
- **Price snapshotting**: `PriceAtAdd` field captures price when item added; UI highlights price changes
- **Stock validation**: Quantity updates validate against current product stock
- **Cart editing**: Real-time quantity validation, zero-quantity removal, debounced JavaScript updates
- **Cart page**: Items grouped by seller with store links, subtotals, order summary, and checkout button

### Guest Cart Persistence (ADR-023)
- **Cookie-based identification**: 30-day expiry with guest:{guid} format
- **Cross-session persistence**: Cart survives browser close and device switches
- **Cart merge on login**: Guest cart automatically merged into user cart after login/registration
- **Duplicate handling**: Quantities summed when merging duplicate products

### Cart Totals & Shipping (ADR-019)
- **Per-seller shipping**: Flat rate (15 PLN) with free shipping threshold (200 PLN)
- **Commission tracking**: 10% platform commission calculated internally (not shown to buyer)
- **Configurable rules**: All values defined in appsettings.json
- **Service-based calculation**: CartCalculationService provides consistent totals across cart and checkout

### Checkout Flow (ADR-020)
**Delivery Address Management**:
- Authenticated users can save multiple addresses with labels ("Home", "Work", etc.)
- Guest checkout creates anonymous addresses (UserId = null)
- Default address support for quick checkout
- Address validation with EU country whitelist (23 countries)
- Required fields: FullName, PhoneNumber, Street, City, PostalCode, Country

**Order Creation**:
- One order created per seller (multi-seller cart splits automatically)
- Order includes: OrderNumber (ORD-YYYYMMDD-XXXXXX), items, delivery address, totals
- Product details snapshotted (name, SKU, price) for historical accuracy
- Cart cleared automatically after successful order creation
- Orders created in `Pending` status (ready for Phase 3 payment integration)

**Order Confirmation Emails (ADR-022)**:
- HTML emails sent to both buyer and seller after order confirmation
- Idempotent delivery using ConfirmationEmailSentAt timestamp
- Buyer email: Order details, pricing, delivery info, next steps
- Seller email: Customer info, items to ship, payout calculation
- Prevents duplicate emails on page refresh

**Promo Code System (ADR-021)**:
- Platform-wide and seller-specific promotional codes
- Percentage-based and fixed-amount discounts
- Comprehensive validation: validity period, usage limits, minimum order amounts
- Proportional discount distribution across multi-seller orders
- Real-time AJAX validation for better UX
- Complete audit trail with PromoCodeUsage entity

**Order Status Lifecycle**:
```
Pending → PaymentConfirmed → Processing → Shipped → Delivered
         ↓
    Cancelled / Refunded
```

**Supported Countries**: Poland, Germany, France, Italy, Spain, Netherlands, Belgium, Austria, Czech Republic, Slovakia, Hungary, Romania, Bulgaria, Lithuania, Latvia, Estonia, Slovenia, Croatia, Greece, Portugal, Denmark, Sweden, Finland

---

## Security & Compliance Architecture

### Authentication
- **Primary**: Email/password with ASP.NET Core Identity
- **Social Login**: Google and Facebook OAuth (buyers only)
- **Email Verification**: Required before account access
- **Password Policy**: Strong requirements enforced (8+ chars, complexity)
- **Account Lockout**: Brute force protection (5 attempts → 5-minute lockout)
- **2FA Infrastructure**: Database fields and login flow ready; full implementation pending

### Authorization
- **Role-Based Access Control**: Three roles (Buyer, Seller, Admin)
- **Authorization Policies**: BuyerOnly, SellerOnly, AdminOnly, BuyerOrSeller
- **KYC Enforcement**: Middleware blocks seller features until KYC approved
- **Page-Level Authorization**: `[Authorize(Roles = "...")]` attributes on pages

### Audit & Monitoring
- **Audit Logging**: All security events tracked in AuditLogs table
  - Account lifecycle: Registration, email verification, role changes
  - Authentication: Login success/failure, logout
  - Password: Reset requests, completions, failures, changes
  - Authorization: Unauthorized access attempts (403 responses)
  - KYC: Status changes (submitted, approved, rejected)
  - Product management: Product created, updated, deleted, published, unpublished
  - Order fulfillment (ADR-029): OrderStatusChanged, OrderShipped, OrderTrackingUpdated, OrderCancelled, OrderRefunded
  - Item-level operations (ADR-031): OrderItemStatusChanged, OrderItemShipped, OrderItemTrackingUpdated, OrderItemCancelled, OrderItemRefunded
  - Escrow operations (ADR-032): EscrowCreated, EscrowReleasedToBuyer, EscrowReleasedToSeller, EscrowPartiallyReleased, EscrowMarkedEligible
  - Refund operations (ADR-039): RefundInitiated, RefundProcessed, RefundFailed, RefundValidationFailed
  - Product review operations (ADR-053): ProductReviewSubmitted, ProductReviewApproved, ProductReviewRejected, ProductReviewModerationChanged, ReviewReportSubmitted, ReportReviewed, ReportDismissed
  - Seller rating operations (ADR-052): SellerRatingSubmitted
  - Reputation score operations (ADR-054): ReputationScoreCalculated
- **Login History**: Every login attempt recorded with IP, user agent, timestamp
  - Suspicious activity detection: Flags logins from unusual IP addresses
  - 90-day lookback for anomaly detection (requires 3+ previous logins)
  - Supports future geolocation enrichment (City, Country fields)

### Session Management
- **Secure Cookies**: HttpOnly, Secure (HTTPS-only), SameSite=Strict
- **Sliding Expiration**: 14-day session with activity-based renewal
- **Security Stamp**: Invalidates all sessions on password change/reset
- **Session Invalidation**: Automatic on security events (password reset, suspicious activity)

### KYC (Know Your Customer)
- **Lifecycle States**: NotRequired (Buyer) → Pending → Submitted → UnderReview → Approved/Rejected
- **Middleware Enforcement**: `SellerKycMiddleware` restricts seller access based on KYC status
- **Audit Trail**: All KYC status changes logged with timestamp and reason
- **Status Page**: Displays current KYC state and next steps for sellers

### Store Visibility & Public Access
- **Store Status Lifecycle**: Draft → Active/LimitedActive → Suspended (if needed)
  - **Draft**: Store is being set up, not publicly visible (default for new stores)
  - **Active**: Store is fully active and publicly visible
  - **LimitedActive**: Store is visible but with limited functionality (e.g., during grace period)
  - **Suspended**: Store is suspended and not publicly visible
- **Public Visibility Rules**: A store is publicly accessible at `/Store/{slug}` when:
  - Store status is Active OR LimitedActive
  - AND Seller's KYC status is Approved
- **Inaccessible Stores**: Draft, Suspended, or non-KYC-approved stores return 404 with appropriate message
- **Implementation**: `SellerProfileService.IsStorePubliclyVisible()` enforces visibility rules

### Data Protection
- **Sensitive Data**: No PII in application logs (IP address captured for audit only)
- **Password Security**: Hashed with ASP.NET Core Identity default (PBKDF2)
- **Token Expiration**: Password reset tokens expire after 3 hours
- **Email Enumeration Prevention**: Generic error messages on password reset
- **Payout Account Encryption**: Bank account details, IBAN, routing numbers, and payment credentials encrypted at rest using ASP.NET Data Protection API
  - Encryption keys managed by framework with automatic key rotation
  - Sensitive fields decrypted only when needed for display or processing
  - Protection scope: "PayoutAccountProtection" for payout-specific isolation

---

# Working With This Architecture (Agent Guide)

## General Rules
- Keep business rules in `Domain`.
- Add application behavior in `Application` as small, testable services/use-cases.
- Keep EF Core and external integrations in `Infrastructure`.
- UI (Razor Pages) calls Application services via DI.

## Common Tasks
- Update `Program.cs` only for DI, DbContexts, and minimal web configuration.
- Put migrations under the correct DbContext project (WebApp vs Products module).
- Write unit tests in `Tests/*` using Moq for interfaces.

---

# Adding a New Feature (Example: Create Product)

1) Domain
- Add entity changes if needed (e.g., validations).
- Add interface method to `Interfaces/IProductRepository` (e.g., `Task Add(ProductModel product)`).

2) Infrastructure
- Implement the new method in `ProductRepository`.
- Update `ProductDbContext` entity configuration if needed.
- Add EF Core migration in the Products module if schema changes:
  - Run from solution directory: `dotnet ef migrations add <Name> -p Modules/SD.ProjectName.Modules.Products -s Application/SD.ProjectName.WebApp -c ProductDbContext`
  - Update database: `dotnet ef database update -p Modules/SD.ProjectName.Modules.Products -s Application/SD.ProjectName.WebApp -c ProductDbContext`

3) Application
- Create a new use case (e.g., `CreateProduct`) that depends on `IProductRepository`.
- Keep logic small and testable; avoid EF specifics here.

4) Web UI (Razor Pages)
- Add page model (e.g., `Pages/Products/Create.cshtml.cs`) injecting `CreateProduct`.
- Add view `Create.cshtml` with form binding.

5) DI Registration (Program.cs)
- Ensure `IProductRepository` and new use case (`CreateProduct`) are registered.

6) Tests
- Add unit tests in `Tests/SD.ProjectName.Tests.Products`:
  - Mock `IProductRepository` to verify interactions.
  - Test success, validation, and edge cases.

---

# Conventions
- Application services: simple classes with clear method names (`GetList`, `Create`, `Update`).
- Avoid coupling Application to EF Core�use interfaces.
- Keep Razor Pages lean; delegate work to Application.
- One DbContext per bounded context (Identity vs Products).

# Performance & Maintainability
- Query shaping is in repository implementations.
- Use async everywhere (`Task`, `await`).
- Prefer small, composable services.

# Checklist When Modifying
- Domain API changes require Infrastructure updates and tests.
- Schema changes require migrations in the correct project and DbContext.
- Update DI registrations in `Program.cs`.
- Add/adjust Razor Pages if the UI changes.
- Ensure unit tests cover new paths.

# Useful Paths
- WebApp: `Application/SD.ProjectName.WebApp`.
- Products Module: `Modules/SD.ProjectName.Modules.Products`.
- Tests: `Tests/SD.ProjectName.Tests.Products`.

# Notes
- Target: .NET 9, C# 13.
- Prefer minimal changes that follow existing patterns.

---

# Architecture Decision Records (ADRs)

All architectural decisions are documented in `/docs/adr/`. Current ADRs:

1. [ADR-001: Modular Monolith Architecture](docs/adr/adr-001-architecture-modular-monolith.md)
2. [ADR-002: Przelewy24 Integration and Marketplace Escrow Flow](docs/adr/adr-002-payments-przelewy24-escrow-flow.md)
3. [ADR-003: Database Search for MVP](docs/adr/adr-003-search-database-first.md)
4. [ADR-004: Multi-language Support with PLN-only Currency](docs/adr/adr-004-internationalization-multi-language-pln-only.md)
5. [ADR-005: Identity & Access Management Architecture](docs/adr/adr-005-identity-access-management-implementation.md)
6. [ADR-006: Seller Onboarding Wizard Implementation](docs/adr/adr-006-seller-onboarding-wizard.md)
7. [ADR-007: Payout Account Configuration and Management](docs/adr/adr-007-payout-account-configuration.md)
8. [ADR-008: Seller Internal User Management (Phase 2)](docs/adr/adr-008-seller-internal-user-management.md)
9. [ADR-009: Store Profile Management System](docs/adr/adr-009-store-profile-management-system.md)
10. [ADR-010: Product Attribute Management](docs/adr/adr-010-product-attribute-management.md)
11. [ADR-011: Category Tree Management System](docs/adr/adr-011-category-tree-management.md)
12. [ADR-012: Product Workflow State Management](docs/adr/adr-012-product-workflow-state-management.md)
13. [ADR-013: Product Import via CSV/XLS](docs/adr/adr-013-product-import-csv-xls.md)
14. [ADR-014: Product Export for Reporting (CSV/Excel)](docs/adr/adr-014-product-export-csv-excel.md)
15. [ADR-015: Product Image Upload and Management](docs/adr/adr-015-product-image-upload-management.md)
16. [ADR-016: Product Variants System (Phase 2)](docs/adr/adr-016-product-variants-system.md)
17. [ADR-017: Bulk Product Update Operations](docs/adr/adr-017-bulk-product-update-operations.md)
18. [ADR-018: Multi-Seller Shopping Cart](docs/adr/adr-018-multi-seller-shopping-cart.md)
19. [ADR-019: Cart Totals with Shipping and Commission Calculation](docs/adr/adr-019-cart-totals-with-shipping-and-commissions.md)
20. [ADR-020: Checkout Flow with Delivery Address Management](docs/adr/adr-020-checkout-flow-with-delivery-address.md)
21. [ADR-021: Promo Code System at Checkout](docs/adr/adr-021-promo-code-system.md)
22. [ADR-022: Order Confirmation Email System](docs/adr/adr-022-order-confirmation-email-system.md)
23. [ADR-023: Guest Cart Persistence and Merge on Login](docs/adr/adr-023-guest-cart-persistence-and-merge.md)
24. [ADR-024: Parent Order with Seller Sub-Orders](docs/adr/adr-024-parent-order-with-seller-sub-orders.md)
25. [ADR-025: Order Status Lifecycle and Visibility](docs/adr/adr-025-order-status-lifecycle-and-visibility.md)
26. [ADR-026: Order List Filtering and Pagination](docs/adr/adr-026-order-list-filtering-and-pagination.md)
27. [ADR-027: Seller Order List with Filtering and Export](docs/adr/adr-027-seller-order-list-filtering-and-export.md)
28. [ADR-028: Seller Order Detail View and Buyer Information](docs/adr/adr-028-seller-order-detail-view-and-buyer-information.md)
29. [ADR-029: Seller Fulfillment Status Management](docs/adr/adr-029-seller-fulfillment-status-management.md)
30. [ADR-030: Basic Return Request System](docs/adr/adr-030-basic-return-request-system.md)
31. [ADR-031: Partial Fulfillment of Sub-Orders (Phase 2)](docs/adr/adr-031-partial-fulfillment-of-sub-orders.md)
32. [ADR-032: Marketplace Escrow Payment Model](docs/adr/adr-032-marketplace-escrow-payment-model.md)
33. [ADR-033: Payment Status Tracking and Display](docs/adr/adr-033-payment-status-tracking-and-display.md)
34. [ADR-034: Commission Calculation Per Transaction](docs/adr/adr-034-commission-calculation-per-transaction.md)
35. [ADR-035: Seller Payout Scheduling System](docs/adr/adr-035-seller-payout-scheduling-system.md)
36. [ADR-036: Seller Payout History and Details View](docs/adr/adr-036-seller-payout-history-and-details-view.md)
37. [ADR-037: Monthly Settlement Reports per Seller](docs/adr/adr-037-monthly-settlement-reports.md)
38. [ADR-038: Automatic Commission Invoice Generation](docs/adr/adr-038-automatic-commission-invoice-generation.md)
39. [ADR-039: Refund Processing System](docs/adr/adr-039-refund-processing-system.md)
40. [ADR-040: Buyer Shipping Address Management](docs/adr/adr-040-buyer-shipping-address-management.md)
41. [ADR-041: Seller Shipping Method Configuration](docs/adr/adr-041-seller-shipping-method-configuration.md)
42. [ADR-042: Shipping Status Email Notifications](docs/adr/adr-042-shipping-status-email-notifications.md)
43. [ADR-043: Logistics CSV Export Enhancement](docs/adr/adr-043-logistics-csv-export-enhancement.md)
44. [ADR-044: Shipping Provider Integration (Phase 2)](docs/adr/adr-044-shipping-provider-integration.md)
45. [ADR-045: Shipping Label Generation and Storage (Phase 2)](docs/adr/adr-045-shipping-label-generation.md)
46. [ADR-046: Unified Return and Complaint Request Submission](docs/adr/adr-046-unified-return-complaint-submission.md)
47. [ADR-047: Seller Review of Incoming Cases](docs/adr/adr-047-seller-review-incoming-cases.md)
48. [ADR-048: Case Messaging Thread](docs/adr/adr-048-case-messaging-thread.md)
49. [ADR-049: Case Resolution and Refund Linkage](docs/adr/adr-049-case-resolution-refund-linkage.md)
50. [ADR-050: Admin View and Escalation of Cases](docs/adr/adr-050-admin-view-escalate-cases.md)
51. [ADR-051: SLA Tracking for Case Handling](docs/adr/adr-051-sla-tracking-case-handling.md)
52. [ADR-052: Seller Rating System](docs/adr/adr-052-seller-rating-system.md)
53. [ADR-053: Product Review Moderation System](docs/adr/adr-053-product-review-moderation.md)
54. [ADR-054: Seller Reputation Score System (Phase 2)](docs/adr/adr-054-seller-reputation-scoring.md)
55. [ADR-055: Buyer Email Notification System](docs/adr/adr-055-buyer-email-notifications.md)
56. [ADR-056: Seller Email Alert System](docs/adr/adr-056-seller-email-alerts.md)
57. [ADR-057: Internal Messaging System (Phase 1.5)](docs/adr/adr-057-internal-messaging-system.md)
58. [ADR-058: Web Push Notifications (Phase 2)](docs/adr/adr-058-web-push-notifications.md)
59. [ADR-059: Admin Marketplace Performance Dashboard](docs/adr/adr-059-admin-marketplace-dashboard.md)
60. [ADR-060: Seller Sales Dashboard](docs/adr/adr-060-seller-sales-dashboard.md)
61. [ADR-061: Admin Order and Revenue Reports with CSV Export](docs/adr/adr-061-admin-order-revenue-reports.md)
62. [ADR-062: Seller Order and Revenue Reports with CSV Export](docs/adr/adr-062-seller-order-reports-csv-export.md)
63. [ADR-063: Admin Commission Summaries with Seller Breakdown](docs/adr/adr-063-admin-commission-summaries.md)
64. [ADR-064: User Registration and Activity Analytics](docs/adr/adr-064-user-registration-activity-analytics.md)
65. [ADR-065: Advanced Analytics Instrumentation (Phase 2)](docs/adr/adr-065-advanced-analytics-instrumentation.md)
66. [ADR-066: Admin User Management](docs/adr/adr-066-admin-user-management.md)
67. [ADR-067: Admin User Account Blocking](docs/adr/adr-067-admin-user-account-blocking.md)
68. [ADR-068: Admin Product Moderation](docs/adr/adr-068-admin-product-moderation.md)
69. [ADR-069: Admin Product Photo Moderation](docs/adr/adr-069-admin-product-photo-moderation.md)
70. [ADR-070: Admin Review and Rating Moderation](docs/adr/adr-070-admin-review-moderation.md)
71. [ADR-071: Admin Commission Rate and Fee Management](docs/adr/adr-071-admin-commission-rules.md)
72. [ADR-072: Admin VAT and Tax Rate Management](docs/adr/adr-072-admin-vat-tax-management.md)
73. [ADR-073: Admin Currency Management and Platform Currency Settings](docs/adr/adr-073-admin-currency-management.md)
74. [ADR-074: Admin Manages Attribute Templates for Categories](docs/adr/adr-074-category-attribute-templates.md)
75. [ADR-075: Admin Integration Management](docs/adr/adr-075-admin-integration-management.md)
76. [ADR-076: Admin Legal Document Management](docs/adr/adr-076-admin-legal-document-management.md)
77. [ADR-077: Admin Audit Log Viewer](docs/adr/adr-077-admin-audit-log-viewer.md)
78. [ADR-078: Admin Feature Flag Management System (Phase 2)](docs/adr/adr-078-admin-feature-flag-management.md)
79. [ADR-079: GDPR Data Processing Registry (Article 30)](docs/adr/adr-079-gdpr-processing-registry.md)
80. [ADR-080: Role-Based Access Control (RBAC) System](docs/adr/adr-080-role-based-access-control.md)
81. [ADR-081: Enforce Access Control Across Modules](docs/adr/adr-081-enforce-access-control-modules.md)
82. [ADR-082: User Consent Management](docs/adr/adr-082-user-consent-management.md)
83. [ADR-083: User Data Export (GDPR Right of Access)](docs/adr/adr-083-user-data-export.md)
84. [ADR-084: User Account Deletion with Anonymization (GDPR Right to Erasure)](docs/adr/adr-084-user-account-deletion.md)
85. [ADR-085: Encrypt Data at Rest and in Transit](docs/adr/adr-085-encrypt-data-rest-transit.md)
86. [ADR-086: Audit Logging of Critical Actions](docs/adr/adr-086-audit-logging-critical-actions.md)
87. [ADR-087: Security Incident Logging and Management](docs/adr/adr-087-security-incident-management.md)

**Note**: When making architectural changes, always create or update ADRs following the template in existing ADRs. See AGENT.md for documentation requirements.
