import { useEffect, useState } from "react";

import {
    NavLink,
    Outlet,
    useLocation,
    useNavigate,
} from "react-router-dom";

import {
    LayoutDashboard,
    Building2,
    Hospital,
    Stethoscope,
    Tags,
    Users,
    ShoppingCart,
    UserRoundCog,
    ClipboardCheck,
    CreditCard,
    Landmark,
    Wallet,
    ShieldCheck,
    Shield,
    LogOut,
    Menu,
    X,
    ChevronDown,
    LoaderCircle,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

import logo from "../../images/logo-stiqrhub-health.jpeg";

interface User {
    id_user: number | string;
    name_user: string;
    email_user: string;
    status_user: string;
    id_user_role: number | string;
}

interface UserRole {
    id_user_role: number | string;
    name_user_role: string;
}

interface MenuItem {
    label: string;
    path: string;
    icon: LucideIcon;
    enabled: boolean;
}

interface MenuGroup {
    title?: string;
    items: MenuItem[];
}

type AuthStatus = "checking" | "authenticated" | "unauthenticated";

const menuGroups: MenuGroup[] = [
    {
        items: [
            {
                label: "Beranda",
                path: "/user/dashboard",
                icon: LayoutDashboard,
                enabled: true,
            },
        ],
    },
    {
        title: "PROVIDER & KATALOG",
        items: [
            {
                label: "Provider Group",
                path: "/user/provider-groups",
                icon: Building2,
                enabled: true,
            },
            {
                label: "Provider",
                path: "/user/providers",
                icon: Hospital,
                enabled: true,
            },
            {
                label: "Katalog Layanan",
                path: "/user/services",
                icon: Stethoscope,
                enabled: true,
            },
            {
                label: "Kategori Provider",
                path: "/user/provider-categories",
                icon: Tags,
                enabled: true,
            },
        ],
    },
    {
        title: "APLIKASI PASIEN",
        items: [
            {
                label: "Akun Pasien",
                path: "/user/customers",
                icon: Users,
                enabled: true,
            },
            {
                label: "Pesanan",
                path: "/user/orders",
                icon: ShoppingCart,
                enabled: true,
            },
        ],
    },
    {
        title: "STIQR HEALTH PROVIDER",
        items: [
            {
                label: "Provider Users",
                path: "/user/provider-users",
                icon: UserRoundCog,
                enabled: true,
            },
        ],
    },
    {
        title: "KONTROL",
        items: [
            {
                label: "Persetujuan Provider",
                path: "/user/approvals",
                icon: ClipboardCheck,
                enabled: true,
            },
            {
                label: "Rekening Provider",
                path: "/user/bank-accounts",
                icon: CreditCard,
                enabled: true,
            },
            {
                label: "Settlement",
                path: "/user/settlements",
                icon: Landmark,
                enabled: true,
            },
            {
                label: "Saldo Provider",
                path: "/user/balances",
                icon: Wallet,
                enabled: true,
            },
        ],
    },
    {
        title: "PENGATURAN",
        items: [
            {
                label: "Akun Internal",
                path: "/user/users",
                icon: Users,
                enabled: true,
            },
            {
                label: "User Roles",
                path: "/user/user-roles",
                icon: ShieldCheck,
                enabled: true,
            },
            {
                label: "Provider Roles",
                path: "/user/provider-roles",
                icon: Shield,
                enabled: true,
            },
        ],
    },
];

const SESSION_KEYS = [
    "admin_token",
    "admin_user",
    "admin_role",
] as const;

const getStoredValue = (key: string): string | null => {
    return (
        sessionStorage.getItem(key) ??
        localStorage.getItem(key)
    );
};

const getUserToken = (): string | null => {
    return getStoredValue("admin_token");
};

const readSession = <T,>(key: string): T | null => {
    try {
        const stored = getStoredValue(key);

        if (!stored) {
            return null;
        }

        return JSON.parse(stored) as T;
    } catch {
        return null;
    }
};

const getUser = (): User | null => {
    const user = readSession<User>("admin_user");

    if (
        !user ||
        typeof user !== "object" ||
        !user.name_user ||
        !user.email_user ||
        !user.id_user
    ) {
        return null;
    }

    return user;
};

const getUserRole = (): UserRole | null => {
    return readSession<UserRole>("admin_role");
};

interface JwtPayload {
    exp?: number;
    iat?: number;
    sub?: string | number;
}

const decodeToken = (
    token: string
): JwtPayload | null => {
    try {
        const parts = token.split(".");

        if (parts.length !== 3) {
            return null;
        }

        const base64 = parts[1]
            .replace(/-/g, "+")
            .replace(/_/g, "/");

        const paddedBase64 = base64.padEnd(
            Math.ceil(base64.length / 4) * 4,
            "="
        );

        const payload: unknown = JSON.parse(
            atob(paddedBase64)
        );

        if (
            !payload ||
            typeof payload !== "object" ||
            Array.isArray(payload)
        ) {
            return null;
        }

        return payload as JwtPayload;
    } catch {
        return null;
    }
};

const getTokenExpiry = (
    token: string
): number | null => {
    const payload = decodeToken(token);

    if (
        !payload ||
        typeof payload.exp !== "number" ||
        !Number.isFinite(payload.exp)
    ) {
        return null;
    }

    // JWT exp menggunakan Unix timestamp (detik).
    return payload.exp * 1000;
};

const isTokenExpired = (token: string): boolean => {
    const expiry = getTokenExpiry(token);

    if (expiry === null) {
        return true;
    }

    return Date.now() >= expiry;
};

const clearUserSession = (): void => {
    SESSION_KEYS.forEach((key) => {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
    });
};

const getInitials = (name: string): string => {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("");
};

const Dashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [profileOpen, setProfileOpen] = useState(false);

    const [user, setUser] = useState<User | null>(null);

    const [role, setRole] = useState<UserRole | null>(null);

    const [authStatus, setAuthStatus] =
        useState<AuthStatus>("checking");

    const handleLogout = () => {
        clearUserSession();

        setUser(null);
        setRole(null);
        setAuthStatus("unauthenticated");

        navigate("/user/sign-in", {
            replace: true,
        });
    };

    useEffect(() => {
        let expiryTimeout: ReturnType<
            typeof setTimeout
        > | null = null;

        let active = true;

        const invalidateSession = () => {
            if (!active) return;

            clearUserSession();

            setUser(null);
            setRole(null);
            setAuthStatus("unauthenticated");

            navigate("/user/sign-in", {
                replace: true,
            });
        };

        const checkSession = () => {
            if (!active) return;

            const token = getUserToken();
            const storedUser = getUser();
            const storedRole = getUserRole();

            if (
                !token ||
                isTokenExpired(token) ||
                !storedUser ||
                storedUser.status_user !== "ACTIVE"
            ) {
                invalidateSession();
                return;
            }

            setUser(storedUser);
            setRole(storedRole);
            setAuthStatus("authenticated");

            if (expiryTimeout !== null) {
                clearTimeout(expiryTimeout);
            }

            const expiry = getTokenExpiry(token);

            if (expiry === null) {
                invalidateSession();
                return;
            }

            const remainingTime = expiry - Date.now();

            if (remainingTime <= 0) {
                invalidateSession();
                return;
            }

            const MAX_TIMEOUT = 2_147_483_647;

            expiryTimeout = setTimeout(() => {
                checkSession();
            }, Math.min(remainingTime, MAX_TIMEOUT));
        };

        checkSession();

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                checkSession();
            }
        };

        const handleFocus = () => {
            checkSession();
        };

        document.addEventListener(
            "visibilitychange",
            handleVisibilityChange
        );

        window.addEventListener("focus", handleFocus);

        return () => {
            active = false;

            if (expiryTimeout !== null) {
                clearTimeout(expiryTimeout);
            }

            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );

            window.removeEventListener("focus", handleFocus);
        };
    }, [navigate, location.pathname]);

    if (authStatus === "checking") {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F4F7FB]">
                <div className="flex flex-col items-center gap-4">
                    <LoaderCircle
                        size={32}
                        className="animate-spin text-[#0866D8]"
                    />

                    <p className="text-sm font-medium text-[#526789]">
                        Memeriksa sesi pengguna...
                    </p>
                </div>
            </div>
        );
    }

    if (
        authStatus !== "authenticated" ||
        !user
    ) {
        return null;
    }

    const renderSidebar = () => (
        <div className="flex h-full flex-col bg-[#0D2B52] text-white">
            <div className="flex h-19 shrink-0 items-center gap-3 px-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1">
                    <img
                        src={logo}
                        alt="STIQR Health"
                        className="h-full w-full object-contain"
                    />
                </div>

                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-[16px] font-bold leading-tight">
                        STIQR Health
                    </h1>

                    <p className="text-[11px] text-blue-200">
                        Web Management
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Close sidebar"
                    className="rounded-lg p-1 text-white/80 hover:bg-white/10 lg:hidden"
                >
                    <X size={20} />
                </button>
            </div>

            <nav className="sidebar-scroll flex-1 space-y-5 overflow-y-auto px-3 pb-6 pt-2">
                {menuGroups.map((group, groupIndex) => (
                    <div
                        key={group.title || `group-${groupIndex}`}
                        className="space-y-1"
                    >
                        {/* Group Title */}
                        {group.title && (
                            <p className="px-3 pb-2 pt-2 text-[10px] font-bold tracking-[0.12em] text-[#83A9DA]">
                                {group.title}
                            </p>
                        )}

                        {/* Group Items */}
                        {group.items.map((item) => {
                            const Icon = item.icon;

                            if (!item.enabled) {
                                return (
                                    <div
                                        key={item.path}
                                        title="Halaman sedang dalam pengembangan"
                                        aria-disabled="true"
                                        className="flex min-h-10.5 cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-blue-100/50"
                                    >

                                        <Icon
                                            size={17}
                                            strokeWidth={1.8}
                                            className="shrink-0"
                                        />

                                        <span className="flex-1">
                                            {item.label}
                                        </span>

                                    </div>
                                );
                            }

                            return (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    end={item.path === "/user/dashboard"}
                                    onClick={() => setSidebarOpen(false)}
                                    className={({ isActive }) =>
                                        [
                                            "flex min-h-10.5 items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-colors",
                                            isActive
                                                ? "bg-[#0866D8] text-white shadow-sm"
                                                : "text-blue-50 hover:bg-white/10",
                                        ].join(" ")
                                    }
                                >
                                    <Icon
                                        size={17}
                                        strokeWidth={1.8}
                                        className="shrink-0"
                                    />

                                    <span className="flex-1">
                                        {item.label}
                                    </span>
                                </NavLink>
                            );
                        })}
                    </div>
                ))}
            </nav>

            <div className="shrink-0 border-t border-white/10 p-3">
                <button
                    type="button"
                    onClick={() => setProfileOpen((prev) => !prev)}
                    aria-expanded={profileOpen}
                    className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/10"
                >
                    {/* Avatar */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0866D8] text-sm font-bold text-white">
                        {getInitials(user.name_user)}
                    </div>

                    {/* User Information */}
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                            {user.name_user}
                        </p>

                        <p className="truncate text-[11px] text-blue-200">
                            {role?.name_user_role || "User"}
                        </p>
                    </div>

                    <ChevronDown
                        size={16}
                        className={`shrink-0 text-blue-200 transition-transform ${profileOpen ? "rotate-180" : ""
                            }`}
                    />
                </button>

                {/* Profile Dropdown */}
                {profileOpen && (
                    <div className="mt-2 space-y-2 rounded-xl bg-white/10 p-3">
                        <div className="flex items-center gap-2 text-xs text-blue-100">
                            <ShieldCheck size={15} />

                            <span>
                                {role?.name_user_role || "User"}
                            </span>
                        </div>

                        <p className="break-all text-xs text-blue-200">
                            {user.email_user}
                        </p>

                        {/* Sign Out */}
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="flex w-full cursor-pointer items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-500/80"
                        >
                            <LogOut size={16} />

                            Sign Out
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="flex h-screen overflow-hidden bg-[#F4F7FB]">
            <aside className="hidden h-full w-60 shrink-0 lg:block">
                {renderSidebar()}
            </aside>

            {sidebarOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    {/* Overlay */}
                    <button
                        type="button"
                        aria-label="Close navigation"
                        onClick={() => setSidebarOpen(false)}
                        className="absolute inset-0 bg-black/50"
                    />

                    {/* Sidebar */}
                    <aside className="relative z-10 h-full w-65 max-w-[85vw] shadow-xl">
                        {renderSidebar()}
                    </aside>
                </div>
            )}

            <div className="flex min-w-0 flex-1 flex-col">
                {/* Mobile Header */}
                <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setSidebarOpen(true)}
                            aria-label="Open sidebar"
                            className="rounded-lg p-2 text-[#0D2B52] hover:bg-gray-100"
                        >
                            <Menu size={22} />
                        </button>

                        <span className="text-sm font-bold text-[#00357A]">
                            STIQR Health
                        </span>
                    </div>

                    {/* Mobile User Avatar */}
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0866D8] text-xs font-bold text-white">
                        {getInitials(user.name_user)}
                    </div>
                </header>

                <main className="min-h-0 flex-1 overflow-y-auto bg-[#F4F7FB]">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
