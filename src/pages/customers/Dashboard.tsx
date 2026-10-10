
import {
    Home as HomeIcon,
    History,
    Ticket,
    User,
    MessageCircle,
    Menu,
    ArrowLeft,
} from "lucide-react";

import {
    Outlet,
    useLocation,
    useNavigate,
} from "react-router-dom";

import { useState } from "react";

import { isTokenExpired } from "../../utils/auth";

const Dashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [menuOpen, setMenuOpen] = useState(false);

    const isHomePage =
        location.pathname === "/customer/home";

    const isDetailPage =
        /^\/customer\/service\/\d+\/?$/.test(
            location.pathname
        );

    const handleProtectedNavigation = (path: string) => {
        const token = sessionStorage.getItem("customer_token");

        if (!token || isTokenExpired(token)) {
            sessionStorage.removeItem("customer_token");
            localStorage.removeItem("customer_data");

            navigate(
                `/customer/sign-in?redirect=${encodeURIComponent(
                    path
                )}`
            );

            return;
        }

        navigate(path);
    };

    const isActive = (path: string) => {
        if (path === "/customer/home" && isDetailPage) {
            return true;
        }

        return (
            location.pathname === path ||
            location.pathname.startsWith(`${path}/`)
        );
    };

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900">
            <div className="mx-auto min-h-screen w-full max-w-130 bg-white pb-24 shadow-sm">
                {isHomePage ? (
                    <header className="bg-linear-to-br from-cyan-100 via-sky-100 to-blue-100 px-5 pb-5 pt-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-medium text-slate-600">
                                    Layanan kesehatan cepat
                                </p>

                                <h1 className="mt-1 text-2xl font-extrabold leading-tight text-slate-900">
                                    STIQR Health
                                </h1>

                                <p className="mt-1 text-sm font-semibold text-slate-700">
                                    Booking layanan kesehatan lebih mudah
                                </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                                {/* CHAT CS */}
                                <button
                                    type="button"
                                    className="cursor-pointer flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                                >
                                    <MessageCircle size={16} />

                                    <span className="hidden sm:inline">
                                        Chat CS
                                    </span>
                                </button>

                                {/* MENU */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setMenuOpen((prev) => !prev)
                                        }
                                        aria-label="Toggle menu"
                                        aria-expanded={menuOpen}
                                        className="cursor-pointer flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                                    >
                                        <Menu size={20} />
                                    </button>

                                    {menuOpen && (
                                        <div className="absolute right-0 top-12 z-50 w-44 rounded-xl border border-slate-100 bg-white p-2 shadow-lg">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setMenuOpen(false);
                                                    handleProtectedNavigation(
                                                        "/customer/profile"
                                                    );
                                                }}
                                                className="cursor-pointer w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                            >
                                                Profile
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setMenuOpen(false);
                                                    handleProtectedNavigation(
                                                        "/customer/history"
                                                    );
                                                }}
                                                className="cursor-pointer w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                            >
                                                Riwayat
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </header>
                ) : (
                    <header className="sticky top-0 z-30 border-b border-slate-100 bg-white px-5 py-4">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                aria-label="Kembali"
                                className="cursor-pointer flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                            >
                                <ArrowLeft size={20} />
                            </button>

                            <div>
                                <h1 className="text-base font-extrabold text-slate-900">
                                    {isDetailPage
                                        ? "Detail Layanan"
                                        : location.pathname.startsWith(
                                            "/customer/history"
                                        )
                                            ? "Riwayat"
                                            : location.pathname.startsWith(
                                                "/customer/health-pass"
                                            )
                                                ? "Health Pass"
                                                : location.pathname.startsWith(
                                                    "/customer/profile"
                                                )
                                                    ? "Profile"
                                                    : "STIQR Health"}
                                </h1>

                                <p className="text-xs text-slate-500">
                                    STIQR Health
                                </p>
                            </div>
                        </div>
                    </header>
                )}

                <main className="min-h-[60vh]">
                    <Outlet />
                </main>

                <nav className="fixed bottom-0 left-1/2 z-50 flex w-full max-w-130 -translate-x-1/2 border-t border-slate-200 bg-white px-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_14px_rgba(0,0,0,0.04)]">
                    {/* HOME */}
                    <button
                        type="button"
                        onClick={() =>
                            navigate("/customer/home")
                        }
                        className={`cursor-pointer flex flex-1 flex-col items-center justify-center gap-1 py-1 transition ${isActive("/customer/home")
                            ? "text-blue-600"
                            : "text-slate-400 hover:text-slate-600"
                            }`}
                    >
                        <HomeIcon size={21} />

                        <span className="text-[10px] font-semibold">
                            Home
                        </span>
                    </button>

                    {/* HISTORY */}
                    <button
                        type="button"
                        onClick={() =>
                            handleProtectedNavigation(
                                "/customer/history"
                            )
                        }
                        className={`cursor-pointer flex flex-1 flex-col items-center justify-center gap-1 py-1 transition ${isActive("/customer/history")
                            ? "text-blue-600"
                            : "text-slate-400 hover:text-slate-600"
                            }`}
                    >
                        <History size={21} />

                        <span className="text-[10px] font-semibold">
                            Riwayat
                        </span>
                    </button>

                    {/* HEALTH PASS */}
                    <button
                        type="button"
                        onClick={() =>
                            handleProtectedNavigation(
                                "/customer/health-pass"
                            )
                        }
                        className={`cursor-pointer flex flex-1 flex-col items-center justify-center gap-1 py-1 transition ${isActive("/customer/health-pass")
                            ? "text-blue-600"
                            : "text-slate-400 hover:text-slate-600"
                            }`}
                    >
                        <Ticket size={21} />

                        <span className="text-[10px] font-semibold">
                            Health Pass
                        </span>
                    </button>

                    {/* PROFILE */}
                    <button
                        type="button"
                        onClick={() =>
                            handleProtectedNavigation(
                                "/customer/profile"
                            )
                        }
                        className={`cursor-pointer flex flex-1 flex-col items-center justify-center gap-1 py-1 transition ${isActive("/customer/profile")
                            ? "text-blue-600"
                            : "text-slate-400 hover:text-slate-600"
                            }`}
                    >
                        <User size={21} />

                        <span className="text-[10px] font-semibold">
                            Profile
                        </span>
                    </button>
                </nav>
            </div>
        </div>
    );
};

export default Dashboard;
