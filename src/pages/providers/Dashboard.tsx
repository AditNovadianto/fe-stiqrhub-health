
import { useEffect, useState } from "react";
import {
    Outlet,
    useLocation,
    useNavigate,
} from "react-router-dom";
import {
    LayoutDashboard,
    ScanLine,
    ReceiptText,
    BadgeCheck,
    Wallet,
    FolderOpen,
    UserRound,
    LogOut,
    Menu,
    X,
    ChevronRight,
    HeartPulse,
} from "lucide-react";

import { isTokenExpired } from "../../utils/auth";

import logo from "../../images/logo-stiqrhub-health.jpeg"

interface ProviderUser {
    id_provider_user?: number | string;
    id_provider?: number | string;
    name_provider_user?: string;
    name_provider?: string;
    full_name?: string;
    name?: string;
    email_provider_user?: string;
    provider?: {
        id_provider?: number | string;
        name_provider?: string;
    };
}

interface StoredProviderData extends ProviderUser {
    provider_user?: ProviderUser;
    data?: ProviderUser & {
        provider_user?: ProviderUser;
    };
}

interface NavItem {
    label: string;
    path: string;
    icon: typeof LayoutDashboard;
}

interface ProviderOutletContext {
    providerUser: ProviderUser | null;
    providerName: string;
    userName: string;
}

const getProviderToken = (): string | null =>
    sessionStorage.getItem("provider_token") ||
    localStorage.getItem("provider_token");

const getProviderUser = (): ProviderUser | null => {
    try {
        const stored =
            localStorage.getItem("provider_user_data") ||
            sessionStorage.getItem("provider_user_data");

        if (!stored) return null;

        const parsed = JSON.parse(stored) as StoredProviderData;

        if (!parsed || typeof parsed !== "object") {
            return null;
        }

        const user =
            parsed.provider_user ||
            parsed.data?.provider_user ||
            parsed.data ||
            parsed;

        // Preserve provider metadata from the wrapper when
        // the stored object is nested.
        return {
            ...user,
            id_provider:
                user.id_provider ??
                user.provider?.id_provider ??
                parsed.id_provider ??
                parsed.data?.id_provider,
            name_provider:
                user.name_provider ??
                user.provider?.name_provider ??
                parsed.name_provider ??
                parsed.data?.name_provider,
        };
    } catch (error) {
        console.error("[PROVIDER STORAGE ERROR]", error);
        return null;
    }
};

const clearProviderSession = () => {
    sessionStorage.removeItem("provider_token");
    localStorage.removeItem("provider_token");
    sessionStorage.removeItem("provider_user_data");
    localStorage.removeItem("provider_user_data");
};

const navigationItems: NavItem[] = [
    {
        label: "Dashboard",
        path: "/provider/dashboard",
        icon: LayoutDashboard,
    },
    {
        label: "Scan Health Pass",
        path: "/provider/scan-health-pass",
        icon: ScanLine,
    },
    {
        label: "Transactions",
        path: "/provider/transactions",
        icon: ReceiptText,
    },
    {
        label: "Redemptions",
        path: "/provider/redemptions",
        icon: BadgeCheck,
    },
    {
        label: "Settlement",
        path: "/provider/settlement",
        icon: Wallet,
    },
    {
        label: "Services",
        path: "/provider/services",
        icon: FolderOpen,
    },
    {
        label: "Profile",
        path: "/provider/profile",
        icon: UserRound,
    },
];

const Dashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [providerUser, setProviderUser] =
        useState<ProviderUser | null>(null);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [showLogoutModal, setShowLogoutModal] =
        useState(false);

    useEffect(() => {
        const token = getProviderToken();

        if (!token || isTokenExpired(token)) {
            clearProviderSession();
            navigate("/provider/sign-in", {
                replace: true,
            });
            return;
        }

        setProviderUser(getProviderUser());
        setCheckingAuth(false);
    }, [navigate]);

    // Close sidebar on navigation
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    // Prevent background scrolling while mobile menu opens
    useEffect(() => {
        if (!sidebarOpen) return;

        const previousOverflow =
            document.body.style.overflow;

        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow =
                previousOverflow;
        };
    }, [sidebarOpen]);

    // Close overlays on Escape
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setSidebarOpen(false);
                setShowLogoutModal(false);
            }
        };

        window.addEventListener("keydown", handleEscape);

        return () =>
            window.removeEventListener(
                "keydown",
                handleEscape
            );
    }, []);

    const isActive = (path: string): boolean =>
        location.pathname === path ||
        location.pathname.startsWith(`${path}/`);

    const handleNavigation = (path: string) => {
        setSidebarOpen(false);

        if (location.pathname !== path) {
            navigate(path);
        }
    };

    const handleLogout = () => {
        clearProviderSession();
        setProviderUser(null);
        setShowLogoutModal(false);
        setSidebarOpen(false);

        navigate("/provider/sign-in", {
            replace: true,
        });
    };

    const providerName =
        providerUser?.name_provider ||
        providerUser?.provider?.name_provider ||
        "Provider STIQR Health";

    const userName =
        providerUser?.name_provider_user ||
        providerUser?.full_name ||
        providerUser?.name ||
        "Provider User";

    const outletContext: ProviderOutletContext = {
        providerUser,
        providerName,
        userName,
    };

    if (checkingAuth) {
        return (
            <div className="flex h-dvh items-center justify-center bg-blue-50">
                <div className="text-center">
                    <HeartPulse
                        size={40}
                        className="mx-auto animate-pulse text-blue-600"
                    />
                    <p className="mt-4 text-sm text-slate-500">
                        Memeriksa sesi provider...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-dvh overflow-hidden bg-[#EFF6FF] text-slate-900">
            <div className="mx-auto flex h-full min-h-0 w-full max-w-[1600px] overflow-hidden bg-white shadow-sm">
                {/* MOBILE OVERLAY */}
                {sidebarOpen && (
                    <button
                        type="button"
                        aria-label="Tutup navigasi"
                        onClick={() => setSidebarOpen(false)}
                        className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
                    />
                )}

                <aside
                    className={`fixed inset-y-0 left-0 z-50 flex w-62.5 flex-col overflow-hidden bg-[#1D4ED8] text-white transition-transform duration-300 lg:relative lg:inset-auto lg:h-full lg:w-57.5 lg:shrink-0 lg:translate-x-0 ${sidebarOpen
                        ? "translate-x-0"
                        : "-translate-x-full"
                        }`}
                >
                    {/* BRAND */}
                    <div className="shrink-0 border-b border-white/15 px-5 pb-6 pt-7">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-3">
                                <img src={logo} className="w-10 h-10" alt="STIQR Health Logo" />

                                <div className="min-w-0">
                                    <h1 className="truncate text-lg font-extrabold tracking-wide">
                                        STIQR Health
                                    </h1>
                                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-100">
                                        Provider Portal
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                aria-label="Tutup sidebar"
                                onClick={() => setSidebarOpen(false)}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 lg:hidden"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* PROVIDER ACCOUNT */}
                    <div className="shrink-0 px-4 py-5">
                        <div className="rounded-xl border border-white/20 bg-white/10 p-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-300/25 text-white">
                                    <UserRound size={20} />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-bold text-white">
                                        {userName}
                                    </p>
                                    <p className="mt-1 truncate text-[11px] text-blue-100">
                                        {providerName}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* NAVIGATION */}
                    <nav
                        aria-label="Navigasi provider"
                        className="min-h-0 flex-1 space-y-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 pb-5"
                    >
                        {navigationItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.path);

                            return (
                                <button
                                    key={item.path}
                                    type="button"
                                    onClick={() =>
                                        handleNavigation(item.path)
                                    }
                                    aria-current={
                                        active ? "page" : undefined
                                    }
                                    className={`cursor-pointer group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${active
                                        ? "bg-blue-400/50 text-white shadow-sm"
                                        : "text-blue-100 hover:bg-white/10 hover:text-white"
                                        }`}
                                >
                                    <Icon
                                        size={19}
                                        className={`shrink-0 ${active
                                            ? "text-white"
                                            : "text-blue-100/80 group-hover:text-white"
                                            }`}
                                    />

                                    <span className="min-w-0 flex-1 truncate">
                                        {item.label}
                                    </span>

                                    {active && (
                                        <ChevronRight
                                            size={16}
                                            className="shrink-0 text-white"
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    {/* SIDEBAR FOOTER */}
                    <div className="shrink-0 border-t border-white/15 px-3 py-4">
                        <button
                            type="button"
                            onClick={() => setShowLogoutModal(true)}
                            className="cursor-pointer flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-red-100 transition hover:bg-red-500/20"
                        >
                            <LogOut size={18} />
                            Keluar dari Akun
                        </button>

                        <p className="mt-5 text-center text-[10px] text-blue-100/70">
                            STIQR Health Provider Portal
                        </p>
                    </div>
                </aside>

                <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-white">
                    {/* MOBILE HEADER */}
                    <header className="z-30 flex shrink-0 items-center justify-between border-b border-blue-100 bg-white px-4 py-4 lg:hidden">
                        <button
                            type="button"
                            aria-label="Buka navigasi"
                            onClick={() => setSidebarOpen(true)}
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition hover:bg-blue-100"
                        >
                            <Menu size={22} />
                        </button>

                        <div className="flex items-center gap-2">
                            <HeartPulse
                                size={20}
                                className="text-blue-600"
                            />
                            <span className="text-sm font-extrabold text-slate-900">
                                STIQR Health
                            </span>
                        </div>

                        <button
                            type="button"
                            aria-label="Buka profil provider"
                            onClick={() =>
                                handleNavigation("/provider/profile")
                            }
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700 transition hover:bg-blue-100"
                        >
                            <UserRound size={20} />
                        </button>
                    </header>

                    {/* SCROLLABLE OUTLET */}
                    <main
                        id="provider-main-content"
                        className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
                    >
                        <Outlet context={outletContext} />
                    </main>

                    {/* FOOTER */}
                    <footer className="shrink-0 border-t border-blue-100 bg-white px-6 py-4 text-center text-[11px] text-slate-400">
                        © {new Date().getFullYear()} STIQR Health.
                        Provider Portal.
                    </footer>
                </div>
            </div>

            {showLogoutModal && (
                <div
                    role="presentation"
                    onClick={() => setShowLogoutModal(false)}
                    className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/60 p-5"
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="provider-logout-title"
                        onClick={(event) => event.stopPropagation()}
                        className="w-full max-w-95 rounded-3xl bg-white p-6 shadow-xl"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                                <LogOut size={26} />
                            </div>

                            <button
                                type="button"
                                aria-label="Tutup konfirmasi logout"
                                onClick={() =>
                                    setShowLogoutModal(false)
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                            >
                                <X size={19} />
                            </button>
                        </div>

                        <h2
                            id="provider-logout-title"
                            className="mt-5 text-xl font-extrabold text-slate-900"
                        >
                            Keluar dari Akun?
                        </h2>

                        <p className="mt-3 text-sm leading-6 text-slate-500">
                            Anda akan keluar dari Provider Portal.
                            Silakan login kembali untuk mengakses
                            layanan provider.
                        </p>

                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                onClick={() =>
                                    setShowLogoutModal(false)
                                }
                                className="cursor-pointer flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                            >
                                Batal
                            </button>

                            <button
                                type="button"
                                onClick={handleLogout}
                                className="cursor-pointer flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700"
                            >
                                Ya, Keluar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
