import {
    Home as HomeIcon,
    History,
    Ticket,
    User,
    Menu,
    ArrowLeft,
    Loader2,
    MapPin,
    ChevronDown,
} from "lucide-react";

import {
    Outlet,
    useLocation,
    useNavigate,
} from "react-router-dom";

import logo from "../../images/logo-stiqrhub-health.jpeg"

import { useState } from "react";

import { isTokenExpired } from "../../utils/auth";

const Dashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [menuOpen, setMenuOpen] = useState(false);

    const [userLocation, setUserLocation] = useState("Pilih lokasi");
    const [locationLoading, setLocationLoading] = useState(false);
    const [locationError, setLocationError] = useState("");

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            setLocationError("Browser tidak mendukung geolocation.");
            return;
        }

        setLocationLoading(true);
        setLocationError("");

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                try {
                    const baseUrl = String(
                        import.meta.env.VITE_API_URI || ""
                    ).replace(/\/+$/, "");

                    const params = new URLSearchParams({
                        latitude: String(latitude),
                        longitude: String(longitude),
                    });

                    const response = await fetch(
                        `${baseUrl}/location/reverse-geocode?${params}`,
                        {
                            method: "GET",
                            headers: {
                                Accept: "application/json",
                            },
                        }
                    );

                    if (!response.ok) {
                        throw new Error("Gagal mengambil lokasi.");
                    }

                    const result = await response.json();

                    if (!result.success || !result.data) {
                        throw new Error(
                            result.message || "Lokasi tidak ditemukan."
                        );
                    }

                    setUserLocation(
                        result.data.locality ||
                        result.data.city ||
                        result.data.formatted_address ||
                        "Lokasi ditemukan"
                    );
                } catch (error) {
                    console.error("[LOCATION ERROR]", error);
                    setLocationError("Gagal mengambil informasi lokasi.");
                } finally {
                    setLocationLoading(false);
                }
            },
            (error) => {
                setLocationLoading(false);

                setLocationError(
                    error.code === 1
                        ? "Izin akses lokasi ditolak."
                        : "Lokasi perangkat tidak tersedia."
                );
            },
            {
                enableHighAccuracy: false,
                timeout: 15000,
                maximumAge: 300000,
            }
        );
    };

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
                                <div className="flex items-center gap-2">
                                    <img className="w-14" src={logo} alt="logo" />

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
                                </div>

                                {/* USER LOCATION */}
                                <div className="mt-3">
                                    <button
                                        type="button"
                                        onClick={handleGetLocation}
                                        disabled={locationLoading}
                                        className="flex max-w-full cursor-pointer items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-white disabled:cursor-wait"
                                    >
                                        {locationLoading ? (
                                            <Loader2
                                                size={15}
                                                className="shrink-0 animate-spin text-blue-600"
                                            />
                                        ) : (
                                            <MapPin
                                                size={15}
                                                className="shrink-0 text-blue-600"
                                            />
                                        )}

                                        <span className="max-w-40 truncate">
                                            {locationLoading
                                                ? "Mendeteksi lokasi..."
                                                : userLocation}
                                        </span>

                                        <ChevronDown
                                            size={14}
                                            className="shrink-0 text-slate-500"
                                        />
                                    </button>
                                </div>

                                {locationError && (
                                    <p className="mt-2 max-w-xs text-xs text-red-600">
                                        {locationError}
                                    </p>
                                )}
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
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
