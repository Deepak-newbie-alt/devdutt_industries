// Response shapes, written from the backend's Prisma selects.

// GET /company-settings/public (publicCompanyInfoSelect in the backend).
export type PublicCompanyInfo = {
  companyName: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string | null;
  website: string | null;
  logoUrl: string | null;
};

export type ProductUnit = "Piece" | "Set" | "Machine";

export type CategorySummary = {
  id: number;
  name: string;
  slug: string;
};

export type ProductImage = {
  id: number;
  imageUrl: string;
};

export type ProductVideo = {
  id: number;
  youtubeUrl: string;
  title: string;
};

export type ProductBrochure = {
  id: number;
  fileName: string;
  fileUrl: string;
};

// GET /products and GET /products/:productId. Prices are decimal strings, e.g. "185000".
export type Product = {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: string;
  unit: ProductUnit;
  minimumOrderQuantity: number;
  specifications: Record<string, unknown>;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  categoryId: number;
  category: CategorySummary;
  images: ProductImage[];
  videos: ProductVideo[];
  brochure: ProductBrochure | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductList = {
  products: Product[];
  meta: {
    page: number;
    limit: number;
    totalPages: number;
    totalProducts: number;
  };
};

// GET /category. `products` holds only active products.
export type Category = CategorySummary & {
  description: string | null;
  displayOrder: number;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  products: { id: number; name: string; price: string }[];
};

export type CategoryList = {
  category: Category[];
  meta: {
    page: number;
    limit: number;
    totalPages: number;
    totalCategory: number;
  };
};

// POST /customer-otp/challenges (202). The same response is returned whether or not
// a code was actually sent, so it reveals nothing about the target.
export type OtpChallenge = {
  challengeId: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
};

// POST /inquiries (201). Only the fields the confirmation screen uses.
export type CreatedInquiry = {
  inquiry: {
    id: number;
    productId: number;
    status: "OPEN" | "IN_PROGRESS" | "CLOSED";
    createdAt: string;
  };
};

export type QuotationRevisionStatus =
  | "DRAFT"
  | "SENT"
  | "REVISION_REQUESTED"
  | "SUPERSEDED"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED";

// POST /quotations/customer/lookup. Deliberately minimal: no prices, buyer or employee details.
export type CustomerQuotation = {
  revisionId: number;
  quotationNumber: string;
  revisionNumber: number;
  quotationRevisionStatus: QuotationRevisionStatus;
  // Date-only value sent as midnight UTC, e.g. "2026-11-30T00:00:00.000Z".
  validUntil: string;
  canRespond: boolean;
};

// ---- Employee workspace ----

export type UserRole = "ADMIN" | "SALESPERSON";

// GET /users/me (userSelect in the backend; never includes credentials).
export type Employee = {
  id: number;
  clerkId: string | null;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
};

export type InquiryStatus = "OPEN" | "IN_PROGRESS" | "CLOSED";

// A staff member as shown next to records they're assigned to or acted on.
export type StaffName = { id: number; name: string };

// GET /inquiries and GET /inquiries/:id (product included in full, plus the quotation link).
export type StaffInquiry = {
  id: number;
  productId: number;
  salespersonId: number | null;
  salesperson: StaffName | null;
  requirement: string;
  phoneNumber: string;
  status: InquiryStatus;
  createdAt: string;
  updatedAt: string;
  product: Product;
  quotation: { id: number; quotationNumber: string } | null;
  // GET /inquiries/:id only: the pending closure request, if any (at most one).
  closureRequests?: PendingClosureRequest[];
};

export type PendingClosureRequest = { id: number; note: string; createdAt: string; requestedBy: StaffName };

export type InquiryActivityType =
  | "CREATED"
  | "CLAIMED"
  | "CUSTOMER_CONTACTED"
  | "NOTE_ADDED"
  | "STATUS_CHANGED"
  | "CLOSURE_REQUESTED"
  | "CLOSURE_APPROVED"
  | "CLOSURE_REJECTED";

export type ClosureRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

// GET /inquiry-closure-requests (admin).
export type ClosureRequest = {
  id: number;
  inquiryId: number;
  note: string;
  status: ClosureRequestStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  inquiry: { id: number; status: InquiryStatus; product: { id: number; name: string } };
  requestedBy: StaffName;
  reviewedBy: StaffName | null;
};

export type ClosureRequestList = {
  requests: ClosureRequest[];
  meta: { page: number; limit: number; totalPages: number; totalRequests: number };
};

export type InquiryClosureReason =
  | "DUPLICATE"
  | "CUSTOMER_UNREACHABLE"
  | "CUSTOMER_NOT_INTERESTED"
  | "NOT_OUR_PRODUCT"
  | "INVALID_INQUIRY"
  | "OTHER";

// GET /inquiries/:id/activities
export type InquiryActivity = {
  id: number;
  inquiryId: number;
  salespersonId: number | null;
  // Included by GET /inquiries/:id/activities; not in the response to adding an activity.
  salesperson?: StaffName | null;
  activityType: InquiryActivityType;
  // Set only when a salesperson closed the inquiry by hand.
  closureReason: InquiryClosureReason | null;
  note: string | null;
  createdAt: string;
};

export type QuotationItem = {
  id: number;
  quotationRevisionId: number;
  name: string;
  description: string | null;
  quantity: number;
  unit: ProductUnit;
  unitPrice: string;
  amount: string;
  displayOrder: number;
};

export type OrderStatus = "CONFIRMED" | "IN_PRODUCTION" | "READY" | "DISPATCHED" | "DELIVERED" | "CANCELLED";

// GET /quotations/:quotationId returns these, oldest first. Amounts are decimal strings.
export type QuotationRevision = {
  id: number;
  quotationId: number;
  revisionNumber: number;
  quotationRevisionStatus: QuotationRevisionStatus;
  buyerName: string;
  companyName: string | null;
  address: string;
  gstNumber: string;
  mobileNumber: string;
  email: string | null;
  productName: string;
  machineSpecifications: Record<string, unknown>;
  terms: Record<string, unknown>;
  validUntil: string;
  salespersonId: number;
  taxableAmount: string;
  cgstRate: string | null;
  cgstAmount: string | null;
  sgstRate: string | null;
  sgstAmount: string | null;
  igstRate: string | null;
  igstAmount: string | null;
  grandTotal: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
  items: QuotationItem[];
  quotation: { inquiryId: number; quotationNumber: string; salespersonId: number; inquiry: { status: InquiryStatus } };
  document: { id: number; fileName: string; sha256: string; sizeBytes: number; createdAt: string } | null;
  order: { id: number; orderNumber: string; status: OrderStatus } | null;
};

export type OrderItem = {
  id: number;
  orderId: number;
  name: string;
  description: string;
  quantity: number;
  unit: ProductUnit;
  unitPrice: string;
  amount: string;
  displayOrder: number;
};

// GET /orders and GET /orders/:orderId (revision included without its link-token hash).
export type Order = {
  id: number;
  orderNumber: string;
  quotationRevisionId: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  quotationRevision: Omit<QuotationRevision, "items" | "quotation" | "document" | "order">;
};

export type OrderList = {
  orders: Order[];
  metadata: { page: number; limit: number; total: number; totalPages: number };
};

export type OrderActivity = {
  id: number;
  orderId: number;
  userId: number | null;
  activityType: "CREATED" | "STATUS_CHANGED" | "NOTE_ADDED";
  previousStatus: OrderStatus | null;
  newStatus: OrderStatus | null;
  note: string | null;
  createdAt: string;
};

// ---- Admin ----

export type CatalogStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

// GET /products/admin and /products/admin/:id: every status, media with ids and order.
export type AdminProduct = Omit<Product, "category" | "images" | "videos"> & {
  category: CategorySummary & { status: CatalogStatus };
  images: (ProductImage & { displayOrder: number })[];
  videos: (ProductVideo & { displayOrder: number })[];
};

export type AdminProductList = {
  products: AdminProduct[];
  meta: ProductList["meta"];
};

// GET /category/admin and /category/admin/:id: every status, with a product count.
export type AdminCategory = CategorySummary & {
  description: string | null;
  displayOrder: number;
  status: CatalogStatus;
  createdAt: string;
  updatedAt: string;
  _count: { products: number };
};

export type AdminCategoryList = {
  category: AdminCategory[];
  meta: CategoryList["meta"];
};

// GET /users (admin).
export type UserList = {
  users: Employee[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

// GET /company-settings: the full record (the public endpoint returns a subset).
export type CompanySettings = PublicCompanyInfo & {
  id: number;
  gstin: string | null;
  defaultTermsAndConditions: string | null;
  createdAt: string;
  updatedAt: string;
};

// GET /analytics/summary: record counts by status. Every status is present (0 when none).
export type AdminSummary = {
  inquiries: Record<InquiryStatus, number>;
  quotations: { total: number; revisionsByStatus: Record<QuotationRevisionStatus, number> };
  orders: Record<OrderStatus, number>;
  users: { role: UserRole; byStatus: Record<Employee["status"], number> }[];
  products: Record<CatalogStatus, number>;
  categories: Record<CatalogStatus, number>;
};
