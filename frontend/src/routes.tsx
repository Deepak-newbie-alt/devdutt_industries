import { createBrowserRouter } from "react-router";
import { PublicLayout } from "./components/layout/PublicLayout";
import { CatalogPage } from "./pages/CatalogPage";
import { EnquiryPage } from "./pages/EnquiryPage";
import { HomePage } from "./pages/HomePage";
import { MyInquiriesLayout, MyInquiriesPage } from "./pages/MyInquiriesPage";
import { MyInquiryDetailPage } from "./pages/MyInquiryDetailPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { QuotationResponsePage } from "./pages/QuotationResponsePage";
import { RouteErrorPage } from "./pages/RouteErrorPage";

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "machines", element: <CatalogPage /> },
      { path: "machines/:productId", element: <ProductDetailPage /> },
      { path: "machines/:productId/enquire", element: <EnquiryPage /> },
      // Customer link from a salesperson: /quotation#token=...
      { path: "quotation", element: <QuotationResponsePage /> },
      // Customer's own enquiries, after verifying their phone number with a code.
      // The verified session is held by the layout, in memory, for the list and each enquiry.
      {
        path: "my-inquiries",
        element: <MyInquiriesLayout />,
        children: [
          { index: true, element: <MyInquiriesPage /> },
          { path: ":inquiryId", element: <MyInquiryDetailPage /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  {
    // Staff pages load on demand, so public visitors never download Clerk or workspace code.
    lazy: async () => ({ Component: (await import("./auth/ClerkLayout")).ClerkLayout }),
    errorElement: <RouteErrorPage />,
    children: [
      {
        path: "sign-in/*",
        lazy: async () => ({ Component: (await import("./pages/SignInPage")).SignInPage }),
      },
      {
        path: "app",
        lazy: async () => ({ Component: (await import("./components/layout/WorkspaceLayout")).WorkspaceLayout }),
        children: [
          {
            index: true,
            lazy: async () => ({ Component: (await import("./components/layout/WorkspaceLayout")).WorkspaceHome }),
          },
          {
            path: "inquiries",
            lazy: async () => ({ Component: (await import("./pages/staff/InquiryListPage")).InquiryListPage }),
          },
          {
            path: "inquiries/:inquiryId",
            lazy: async () => ({ Component: (await import("./pages/staff/InquiryDetailPage")).InquiryDetailPage }),
          },
          {
            path: "inquiries/:inquiryId/quotation/new",
            lazy: async () => ({ Component: (await import("./pages/staff/NewQuotationPage")).NewQuotationPage }),
          },
          {
            path: "quotations/:quotationId",
            lazy: async () => ({ Component: (await import("./pages/staff/QuotationPage")).QuotationPage }),
          },
          {
            path: "quotations/:quotationId/revisions/:revisionId/edit",
            lazy: async () => ({ Component: (await import("./pages/staff/EditRevisionPage")).EditRevisionPage }),
          },
          {
            path: "orders",
            lazy: async () => ({ Component: (await import("./pages/staff/OrderListPage")).OrderListPage }),
          },
          {
            path: "orders/:orderId",
            lazy: async () => ({ Component: (await import("./pages/staff/OrderDetailPage")).OrderDetailPage }),
          },
          {
            // Admin-only pages (the backend enforces the role on every request).
            lazy: async () => ({ Component: (await import("./features/admin/AdminRoute")).AdminRoute }),
            children: [
              {
                path: "overview",
                lazy: async () => ({ Component: (await import("./pages/admin/OverviewPage")).OverviewPage }),
              },
              {
                path: "staff",
                lazy: async () => ({ Component: (await import("./pages/admin/StaffListPage")).StaffListPage }),
              },
              {
                path: "staff/new",
                lazy: async () => ({ Component: (await import("./pages/admin/NewStaffPage")).NewStaffPage }),
              },
              {
                path: "staff/:userId",
                lazy: async () => ({ Component: (await import("./pages/admin/StaffDetailPage")).StaffDetailPage }),
              },
              {
                path: "products",
                lazy: async () => ({ Component: (await import("./pages/admin/ProductListPage")).ProductListPage }),
              },
              {
                path: "products/new",
                lazy: async () => ({ Component: (await import("./pages/admin/ProductEditPage")).ProductEditPage }),
              },
              {
                path: "products/:productId",
                lazy: async () => ({ Component: (await import("./pages/admin/ProductEditPage")).ProductEditPage }),
              },
              {
                path: "categories",
                lazy: async () => ({ Component: (await import("./pages/admin/CategoryListPage")).CategoryListPage }),
              },
              {
                path: "categories/new",
                lazy: async () => ({ Component: (await import("./pages/admin/CategoryEditPage")).CategoryEditPage }),
              },
              {
                path: "categories/:categoryId",
                lazy: async () => ({ Component: (await import("./pages/admin/CategoryEditPage")).CategoryEditPage }),
              },
              {
                path: "company",
                lazy: async () => ({ Component: (await import("./pages/admin/CompanySettingsPage")).CompanySettingsPage }),
              },
              {
                path: "closure-requests",
                lazy: async () => ({ Component: (await import("./pages/admin/ClosureRequestsPage")).ClosureRequestsPage }),
              },
            ],
          },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
