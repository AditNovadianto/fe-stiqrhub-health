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
import SignIn from './pages/providers/SignIn.tsx'
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
import Settlement from './components/providers/Settlement.tsx'
import Services from './components/providers/Services.tsx'
import ProfileProvider from './components/providers/Profile.tsx'
import Booking from './components/customers/Booking.tsx'

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
            path: "service/:id_service",
            element: <DetailService />,
          },
          {
            path: "booking/:id_service",
            element: <Booking />,
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
        ],
      },
    ]
  },
  {
    path: "/provider",
    children: [
      {
        path: "sign-in",
        element: <SignIn />,
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
            element: <Settlement />,
          },
          {
            path: "services",
            element: <Services />,
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
