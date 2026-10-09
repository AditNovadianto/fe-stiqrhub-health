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
import Home from './components/customers/Home.tsx'
import History from './components/customers/History.tsx'
import HealthPasses from './components/customers/HealthPasses.tsx'
import Profile from './components/customers/Profile.tsx'

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
            element: <Home />,
          },
          {
            path: "service/:id_service",
            element: <DetailService />,
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
            element: <Profile />,
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
        path: "dashboard",
        element: <DashboardProvider />,
      },
    ]
  }
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
