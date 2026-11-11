import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import DashboardCustomer from './pages/customers/Dashboard.tsx'
import DashboardProvider from './pages/providers/Dashboard.tsx'
import SignUpCustomer from './pages/customers/SignUp.tsx'
import SignUpProvider from './pages/providers/SignUp.tsx'
import ForgotPasswordCustomer from './pages/customers/ForgotPassword.tsx'
import ResetPasswordCustomer from './pages/customers/ResetPassword.tsx'
import ForgotPasswordProvider from './pages/providers/ForgotPassword.tsx'
import ResetPasswordProvider from './pages/providers/ResetPassword.tsx'
import SignInProvider from './pages/providers/SignIn.tsx'
import DetailService from './components/customers/DetailService.tsx'
import HomeCustomer from './components/customers/Home.tsx'
import History from './components/customers/History.tsx'
import HealthPasses from './components/customers/HealthPasses.tsx'
import ProfileCustomer from './components/customers/Profile.tsx'
import NotFound from './pages/NotFound.tsx'
import HomeProvider from './components/providers/Home.tsx'
import ScanHealthPasses from './components/providers/ScanHealthPasses.tsx'
import Transactions from './components/providers/Transactions.tsx'
import Redemptions from './components/providers/Redemptions.tsx'
import SettlementProvider from './components/providers/Settlement.tsx'
import ServicesProvider from './components/providers/Services.tsx'
import ServicesCustomer from './components/customers/Services.tsx'
import ProfileProvider from './components/providers/Profile.tsx'
import Booking from './components/customers/Booking.tsx'
import PersonalData from './components/customers/PersonalData.tsx'
import PrivacyPolicy from './components/customers/PrivacyPolicy.tsx'
import TermsConditions from './components/customers/TermsConditions.tsx'
import UserConsent from './components/customers/UserConsent.tsx'
import Payment from './components/customers/Payment.tsx'
import SignInCustomer from './pages/users/SignIn.tsx'
import DashboardUser from './pages/users/Dashboard.tsx'
import HomeUser from './components/users/Home.tsx'
import ProviderGroup from './components/users/ProviderGroup.tsx'
import Provider from './components/users/Provider.tsx'
import ServiceCatalog from './components/users/ServiceCatalog.tsx'
import ProviderCategory from './components/users/ProviderCategory.tsx'
import CustomerAccount from './components/users/CustomerAccount.tsx'
import Order from './components/users/Order.tsx'
import ProviderUser from './components/users/ProviderUser.tsx'
import ProviderApproval from './components/users/ProviderApproval.tsx'
import ProviderBankAccount from './components/users/ProviderBankAccount.tsx'
import SettlementUser from './components/users/Settlement.tsx'
import ProviderBalance from './components/users/ProviderBalance.tsx'
import InternalAccount from './components/users/InternalAccount.tsx'
import ResetPasswordUser from './pages/users/ResetPassword.tsx'
import UserRole from './components/users/UserRole.tsx'
import ProviderRole from './components/users/ProviderRole.tsx'
import HealthPass from './components/users/HealthPass.tsx'

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/customer/home" replace />,
  },
  {
    path: "/customer",
    children: [
      {
        path: "sign-in",
        element: <App />,
      },
      {
        path: "sign-up",
        element: <SignUpCustomer />
      },
      {
        path: "forgot-password",
        element: <ForgotPasswordCustomer />,
      },
      {
        path: "reset-password/:token",
        element: <ResetPasswordCustomer />,
      },
      {
        element: <DashboardCustomer />,
        children: [
          {
            path: "home",
            element: <HomeCustomer />,
          },
          {
            path: "services",
            element: <ServicesCustomer />,
          },
          {
            path: "service/:id_service",
            element: <DetailService />,
          },
          {
            path: "booking/:id_service",
            element: <Booking />,
          },
          {
            path: "payment",
            element: <Payment />,
          },
          {
            path: "history",
            element: <History />,
          },
          {
            path: "health-pass",
            element: <HealthPasses />,
          },
          {
            path: "profile",
            element: <ProfileCustomer />,
          },
          {
            path: "personal-data",
            element: <PersonalData />,
          },
          {
            path: "privacy-policy",
            element: <PrivacyPolicy />,
          },
          {
            path: "terms-conditions",
            element: <TermsConditions />,
          },
          {
            path: "user-consent",
            element: <UserConsent />,
          },
        ],
      },
    ]
  },
  {
    path: "/provider",
    children: [
      {
        path: "sign-in",
        element: <SignInProvider />,
      },
      {
        path: "sign-up",
        element: <SignUpProvider />
      },
      {
        path: "forgot-password",
        element: <ForgotPasswordProvider />,
      },
      {
        path: "reset-password/:token",
        element: <ResetPasswordProvider />,
      },
      {
        element: <DashboardProvider />,
        children: [
          {
            path: "dashboard",
            element: <HomeProvider />,
          },
          {
            path: "scan-health-pass",
            element: <ScanHealthPasses />,
          },
          {
            path: "transactions",
            element: <Transactions />,
          },
          {
            path: "redemptions",
            element: <Redemptions />,
          },
          {
            path: "settlement",
            element: <SettlementProvider />,
          },
          {
            path: "services",
            element: <ServicesProvider />,
          },
          {
            path: "profile",
            element: <ProfileProvider />,
          }
        ]
      },
    ]
  },
  {
    path: "/user",
    children: [
      {
        path: "sign-in",
        element: <SignInCustomer />,
      },
      {
        path: "reset-password/:token",
        element: <ResetPasswordUser />,
      },
      {
        element: <DashboardUser />,
        children: [
          {
            path: "dashboard",
            element: <HomeUser />,
          },
          {
            path: "provider-groups",
            element: <ProviderGroup />,
          },
          {
            path: "providers",
            element: <Provider />,
          },
          {
            path: "services",
            element: <ServiceCatalog />,
          },
          {
            path: "provider-categories",
            element: <ProviderCategory />,
          },
          {
            path: "customers",
            element: <CustomerAccount />,
          },
          {
            path: "orders",
            element: <Order />,
          },
          {
            path: "health-pass",
            element: <HealthPass />,
          },
          {
            path: "provider-users",
            element: <ProviderUser />,
          },
          {
            path: "approvals",
            element: <ProviderApproval />,
          },
          {
            path: "bank-accounts",
            element: <ProviderBankAccount />,
          },
          {
            path: "settlements",
            element: <SettlementUser />,
          },
          {
            path: "balances",
            element: <ProviderBalance />,
          },
          {
            path: "users",
            element: <InternalAccount />,
          },
          {
            path: "user-roles",
            element: <UserRole />,
          },
          {
            path: "provider-roles",
            element: <ProviderRole />,
          },
        ]
      },
    ]
  },
  {
    path: "*",
    element: <NotFound />,
  },
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  } as any,
}
)

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
