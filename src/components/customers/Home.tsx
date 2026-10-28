import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import {
    CheckCircle2,
    Clock3,
    Droplets,
    Eye,
    Grid2X2,
    HeartPulse,
    Leaf,
    MapPin,
    MessageCircle,
    Search,
    ShieldCheck,
    Stethoscope,
    Ticket,
    Wallet,
} from "lucide-react";

import { isTokenExpired } from "../../utils/auth";

interface Service {
    id_service: number;
    name_service: string;
    price_service: string | number;
    image_service: string;
    description_service: string;
    status_service: string;
    maps_service: string | null;
    quota_service: string | number;
    id_provider: number;
    name_provider?: string;

    // Optional: hanya dipakai jika API mengembalikan field ini.
    city_provider?: string | null;
    address_provider?: string | null;
    location_service?: string | null;
}

interface ServiceResponse {
    success: boolean;
    data: Service[];
    message?: string;
}

interface ProviderCategory {
    id_provider_category: number;
    name_provider_category: string;
    description_provider_category: string;
    status_provider_category: string;
}

interface ProviderCategoryResponse {
    success: boolean;
    data: ProviderCategory[];
    message?: string;
}

const DentalIcon = ({ size = 26 }: { size?: number }) => {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path
                d="
          M12 4.6
          C9.9 3.5 7.8 2.7 5.8 4
          C3.5 5.5 3.8 8.6 4.6 11
          L6.6 17.9
          C7 19.5 7.9 20 8.7 19.3
          C9.5 18.6 9.6 16.6 10.2 14.5
          C10.5 13.5 11 12.8 12 12.8
          C13 12.8 13.5 13.5 13.8 14.5
          C14.4 16.6 14.5 18.6 15.3 19.3
          C16.1 20 17 19.5 17.4 17.9
          L19.4 11
          C20.2 8.6 20.5 5.5 18.2 4
          C16.2 2.7 14.1 3.5 12 4.6
          Z
        "
            />
        </svg>
    );
};

interface CategoryIconMeta {
    icon: ReactNode;
    backgroundClass: string;
    textClass: string;
}

const getCategoryIconMeta = (
    categoryName: string
): CategoryIconMeta => {
    const normalized = categoryName
        .trim()
        .toLowerCase();

    // Dental / gigi
    if (
        normalized.includes("dental") ||
        normalized.includes("gigi")
    ) {
        return {
            icon: <DentalIcon size={27} />,
            backgroundClass: "bg-blue-50",
            textClass: "text-blue-600",
        };
    }

    // Optical / mata
    if (
        normalized.includes("optical") ||
        normalized.includes("mata")
    ) {
        return {
            icon: <Eye size={27} strokeWidth={1.9} />,
            backgroundClass: "bg-emerald-50",
            textClass: "text-emerald-600",
        };
    }

    // Preventive / Screening
    if (
        normalized.includes("preventive") ||
        normalized.includes("screening")
    ) {
        return {
            icon: (
                <Stethoscope
                    size={26}
                    strokeWidth={1.9}
                />
            ),
            backgroundClass: "bg-purple-50",
            textClass: "text-purple-600",
        };
    }

    // Selected consultation
    if (
        normalized.includes("consultation") ||
        normalized.includes("konsultasi")
    ) {
        return {
            icon: (
                <MessageCircle
                    size={26}
                    strokeWidth={1.9}
                />
            ),
            backgroundClass: "bg-sky-50",
            textClass: "text-sky-600",
        };
    }

    // Skin
    if (
        normalized.includes("skin") ||
        normalized.includes("kulit")
    ) {
        return {
            icon: <Droplets size={26} strokeWidth={1.9} />,
            backgroundClass: "bg-pink-50",
            textClass: "text-pink-600",
        };
    }

    // Wellness / nutrition
    if (
        normalized.includes("wellness") ||
        normalized.includes("nutrition") ||
        normalized.includes("nutrisi")
    ) {
        return {
            icon: <Leaf size={26} strokeWidth={1.9} />,
            backgroundClass: "bg-green-50",
            textClass: "text-green-600",
        };
    }

    // Kategori lainnya yang berasal dari API.
    return {
        icon: <HeartPulse size={26} strokeWidth={1.9} />,
        backgroundClass: "bg-slate-100",
        textClass: "text-slate-600",
    };
};

const formatRupiah = (
    value: string | number
): string => {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
        return "Rp0";
    }

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(amount);
};

const Home = () => {
    const navigate = useNavigate();

    const [services, setServices] = useState<Service[]>([]);

    const [categories, setCategories] = useState<
        ProviderCategory[]
    >([]);

    // State lama tetap dipertahankan untuk fetch service.
    const [selectedCategory, setSelectedCategory] = useState<
        number | null
    >(null);

    const [searchKeyword, setSearchKeyword] = useState("");

    const [loading, setLoading] = useState(true);

    const [loadingCategories, setLoadingCategories] =
        useState(true);

    const [errorMessage, setErrorMessage] = useState("");

    const [categoryError, setCategoryError] = useState("");

    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const token = sessionStorage.getItem(
            "customer_token"
        );

        if (token && isTokenExpired(token)) {
            sessionStorage.removeItem("customer_token");
            localStorage.removeItem("customer_data");
        }
    }, []);

    useEffect(() => {
        const checkLogin = () => {
            const token = sessionStorage.getItem(
                "customer_token"
            );

            setIsLoggedIn(
                Boolean(token && !isTokenExpired(token))
            );
        };

        checkLogin();

        window.addEventListener("focus", checkLogin);
        window.addEventListener("pageshow", checkLogin);

        return () => {
            window.removeEventListener(
                "focus",
                checkLogin
            );

            window.removeEventListener(
                "pageshow",
                checkLogin
            );
        };
    }, []);

    const handleHealthPass = () => {
        const token = sessionStorage.getItem(
            "customer_token"
        );

        if (!token || isTokenExpired(token)) {
            navigate(
                "/customer/sign-in?redirect=" +
                encodeURIComponent(
                    "/customer/health-pass"
                )
            );

            return;
        }

        navigate("/customer/health-pass");
    };

    useEffect(() => {
        const controller = new AbortController();

        const fetchCategories = async () => {
            try {
                setLoadingCategories(true);
                setCategoryError("");

                const response = await fetch(
                    `${import.meta.env.VITE_API_URI
                    }/provider-categories/active`,
                    {
                        method: "GET",
                        headers: {
                            Accept: "application/json",
                        },
                        signal: controller.signal,
                    }
                );

                if (!response.ok) {
                    throw new Error(
                        `Gagal mengambil kategori (${response.status})`
                    );
                }

                const result =
                    (await response.json()) as ProviderCategoryResponse;

                if (
                    !result.success ||
                    !Array.isArray(result.data)
                ) {
                    throw new Error(
                        result.message ||
                        "Format response kategori tidak valid"
                    );
                }

                if (controller.signal.aborted) {
                    return;
                }

                // Hanya kategori ACTIVE.
                // Tidak menambahkan kategori baru.
                // Tidak mengubah nama atau ID kategori.
                // Tidak membatasi jumlah kategori.

                const activeCategories = result.data.filter(
                    (category) =>
                        String(
                            category.status_provider_category
                        )
                            .trim()
                            .toUpperCase() === "ACTIVE"
                );

                setCategories(activeCategories);
            } catch (error) {
                if (controller.signal.aborted) {
                    return;
                }

                console.error(
                    "[HOME CATEGORY ERROR]",
                    error
                );

                setCategoryError(
                    error instanceof Error
                        ? error.message
                        : "Gagal mengambil kategori"
                );

                setCategories([]);
            } finally {
                if (!controller.signal.aborted) {
                    setLoadingCategories(false);
                }
            }
        };

        void fetchCategories();

        return () => {
            controller.abort();
        };
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        const fetchServices = async () => {
            setLoading(true);
            setErrorMessage("");
            setServices([]);

            try {
                // Logic API dari Home sebelumnya
                // tetap dipertahankan.

                const endpoint =
                    selectedCategory === null
                        ? "/service/get-all"
                        : `/service/provider-category/${selectedCategory}`;

                const response = await fetch(
                    `${import.meta.env.VITE_API_URI
                    }${endpoint}`,
                    {
                        method: "GET",
                        headers: {
                            Accept: "application/json",
                        },
                        signal: controller.signal,
                    }
                );

                if (!response.ok) {
                    throw new Error(
                        `Gagal mengambil layanan (${response.status})`
                    );
                }

                const result =
                    (await response.json()) as ServiceResponse;

                if (
                    !result.success ||
                    !Array.isArray(result.data)
                ) {
                    throw new Error(
                        result.message ||
                        "Format response layanan tidak valid"
                    );
                }

                if (controller.signal.aborted) {
                    return;
                }

                const activeServices = result.data.filter(
                    (service) =>
                        String(service.status_service)
                            .trim()
                            .toUpperCase() === "ACTIVE"
                );

                setServices(activeServices);
            } catch (error) {
                if (controller.signal.aborted) {
                    return;
                }

                console.error(
                    "[HOME SERVICE ERROR]",
                    error
                );

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Gagal mengambil layanan"
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        void fetchServices();

        return () => {
            controller.abort();
        };
    }, [selectedCategory]);

    const featuredService = useMemo(() => {
        const availableServices = services.filter((service) => {
            const isActive =
                String(service.status_service).toUpperCase() === "ACTIVE";

            const quota = Number(service.quota_service);
            const price = Number(service.price_service);

            return (
                isActive &&
                Number.isFinite(quota) &&
                quota > 0 &&
                Number.isFinite(price) &&
                price >= 0
            );
        });

        return [...availableServices].sort((a, b) => {
            const priceDifference =
                Number(a.price_service) - Number(b.price_service);

            if (priceDifference !== 0) {
                return priceDifference;
            }

            const quotaDifference =
                Number(b.quota_service) - Number(a.quota_service);

            if (quotaDifference !== 0) {
                return quotaDifference;
            }

            return a.id_service - b.id_service;
        })[0] ?? null;
    }, [services]);

    const filteredServices = useMemo(() => {
        const keywords = searchKeyword
            .trim()
            .toLowerCase()
            .split(/\s+/)
            .filter(Boolean);

        if (keywords.length === 0) {
            return services;
        }

        return services.filter((service) => {
            const searchableText = [
                service.name_service,
                service.description_service,
                service.name_provider,
                service.maps_service,
                service.city_provider,
                service.address_provider,
                service.location_service,
            ]
                .map((value) =>
                    String(value ?? "")
                )
                .join(" ")
                .toLowerCase();

            return keywords.every((keyword) =>
                searchableText.includes(keyword)
            );
        });
    }, [services, searchKeyword]);

    const displayedCategories = categories;

    const handleServiceDetail = (
        serviceId: number
    ) => {
        navigate(
            `/customer/service/${serviceId}`
        );
    };

    const handleBook = (
        serviceId: number
    ) => {
        const token = sessionStorage.getItem(
            "customer_token"
        );

        if (!token || isTokenExpired(token)) {
            sessionStorage.removeItem(
                "customer_token"
            );

            localStorage.removeItem(
                "customer_data"
            );

            const redirectPath =
                `/customer/service/${serviceId}`;

            navigate(
                `/customer/sign-in?redirect=${encodeURIComponent(
                    redirectPath
                )}`
            );

            return;
        }

        navigate(
            `/customer/service/${serviceId}`
        );
    };

    const handleOpenAllServices = () => {
        navigate("/customer/services");
    };

    const handleOpenCategory = (
        categoryId: number
    ) => {
        setSelectedCategory(categoryId);

        navigate(
            `/customer/services?category=${encodeURIComponent(
                String(categoryId)
            )}`
        );
    };

    const handleSearchSubmit = () => {
        const keyword = searchKeyword.trim();

        if (!keyword) {
            navigate("/customer/services");
            return;
        }

        navigate(
            `/customer/services?q=${encodeURIComponent(
                keyword
            )}`
        );
    };

    return (
        <div className="min-h-screen bg-white">
            <section className="bg-linear-to-br from-cyan-100 via-sky-100 to-blue-100 px-5 pb-6">
                {/* SEARCH */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={handleSearchSubmit}
                        aria-label="Cari layanan"
                        className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center text-slate-400 transition hover:text-blue-600"
                    >
                        <Search size={21} />
                    </button>

                    <input
                        type="search"
                        value={searchKeyword}
                        onChange={(event) =>
                            setSearchKeyword(
                                event.target.value
                            )
                        }
                        onKeyDown={(event) => {
                            if (
                                event.key === "Enter"
                            ) {
                                handleSearchSubmit();
                            }
                        }}
                        placeholder="Cari layanan, provider, atau lokasi"
                        aria-label="Cari layanan kesehatan"
                        className="h-10 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                </div>

                {/* HEALTH PASS CTA */}
                <section className="mt-3">
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <Ticket size={19} />
                        </div>

                        <p className="min-w-0 flex-1 text-xs font-semibold leading-relaxed text-slate-800">
                            {isLoggedIn
                                ? "Lihat Health Pass terbaru kamu"
                                : "Sudah pernah beli? Masuk untuk melihat Health Pass"}
                        </p>

                        <button
                            type="button"
                            onClick={
                                handleHealthPass
                            }
                            className="shrink-0 cursor-pointer text-xs font-semibold text-blue-600"
                        >
                            {isLoggedIn
                                ? "Lihat"
                                : "Masuk"}
                        </button>
                    </div>
                </section>
            </section>

            <div className="px-5 py-5">
                <section>
                    {loading ? (
                        <div className="h-62.5 animate-pulse rounded-3xl bg-blue-100" />
                    ) : featuredService ? (
                        <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#075BC6] via-[#0872E5] to-[#2492F5] p-5 text-white shadow-lg">
                            {/* DECORATIVE ELEMENTS */}
                            <div className="pointer-events-none absolute -right-14 -top-12 h-44 w-44 rounded-full bg-white/10" />
                            <div className="pointer-events-none absolute -right-4 top-14 h-28 w-28 rounded-full bg-emerald-400/25" />

                            <div className="relative z-10">
                                {/* HEADER */}
                                <div className="flex items-center justify-between gap-3">
                                    <span className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-[#075BC6]">
                                        Pilihan STIQR Health
                                    </span>

                                    <span className="text-right text-[11px] font-semibold text-blue-50">
                                        Layanan tersedia
                                    </span>
                                </div>

                                {/* SERVICE INFORMATION */}
                                <h2 className="mt-5 line-clamp-2 max-w-[90%] text-[24px] font-bold leading-tight tracking-tight">
                                    {featuredService.name_service}
                                </h2>

                                {featuredService.name_provider && (
                                    <div className="mt-3 flex items-center gap-2">
                                        <MapPin size={15} className="shrink-0 text-blue-100" />

                                        <p className="line-clamp-2 text-xs leading-relaxed text-blue-50">
                                            {featuredService.name_provider}
                                        </p>
                                    </div>
                                )}

                                {/* SEPARATOR */}
                                <div className="my-2 h-px w-full bg-white/25" />

                                {/* PRICE AND ACTION */}
                                <p className="text-xs text-blue-100">
                                    Harga layanan
                                </p>

                                <div className="mt-2 flex items-end justify-between gap-3">
                                    <p className="min-w-0 wrap-break-word text-[25px] font-bold leading-tight tracking-tight sm:text-[29px]">
                                        {formatRupiah(featuredService.price_service)}
                                    </p>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleServiceDetail(featuredService.id_service)
                                        }
                                        className="shrink-0 cursor-pointer rounded-xl bg-white px-4 py-3 text-xs font-bold text-[#075BC6] shadow-sm transition hover:bg-blue-50 active:scale-[0.98]"
                                    >
                                        Lihat Detail
                                    </button>
                                </div>

                                {/* QUOTA INFORMATION */}
                                <div className="mt-5 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5">
                                    <Ticket size={16} className="shrink-0 text-emerald-200" />

                                    <p className="text-xs font-medium text-white">
                                        Tersedia{" "}
                                        <span className="font-bold">
                                            {Number(featuredService.quota_service)}
                                        </span>{" "}
                                        kuota layanan
                                    </p>
                                </div>
                            </div>
                        </section>
                    ) : (
                        <section className="overflow-hidden rounded-3xl bg-linear-to-br from-[#075BC6] to-[#2492F5] p-5 text-white">
                            <h2 className="text-xl font-bold">
                                Temukan layanan kesehatan untukmu
                            </h2>

                            <p className="mt-2 text-sm leading-relaxed text-blue-50">
                                Jelajahi layanan dan fasilitas kesehatan
                                yang tersedia di STIQR Health.
                            </p>

                            <button
                                type="button"
                                onClick={handleOpenAllServices}
                                className="mt-5 cursor-pointer rounded-xl bg-white px-4 py-3 text-xs font-bold text-[#075BC6]"
                            >
                                Jelajahi Layanan
                            </button>
                        </section>
                    )}

                    <div className="mb-3 mt-6 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900">
                            Kategori
                        </h2>

                        <button
                            type="button"
                            onClick={
                                handleOpenAllServices
                            }
                            className="cursor-pointer text-xs font-semibold text-blue-600 transition hover:text-blue-700"
                        >
                            Lihat semua
                        </button>
                    </div>

                    {/* CATEGORY LOADING */}
                    {loadingCategories && (
                        <p className="py-4 text-center text-sm text-slate-500">
                            Memuat kategori...
                        </p>
                    )}

                    {/* CATEGORY ERROR */}
                    {!loadingCategories &&
                        categoryError && (
                            <p className="py-4 text-center text-sm text-red-500">
                                {categoryError}
                            </p>
                        )}

                    {!loadingCategories &&
                        !categoryError && (
                            <>
                                <div className="grid grid-cols-4 gap-x-2 gap-y-5 sm:gap-x-4 sm:gap-y-6">
                                    {displayedCategories.map(
                                        (category) => {
                                            const meta =
                                                getCategoryIconMeta(
                                                    category.name_provider_category
                                                );

                                            return (
                                                <button
                                                    key={
                                                        category.id_provider_category
                                                    }
                                                    type="button"
                                                    onClick={() =>
                                                        handleOpenCategory(
                                                            category.id_provider_category
                                                        )
                                                    }
                                                    className="group flex min-w-0 cursor-pointer flex-col items-center text-center"
                                                >
                                                    {/* CATEGORY ICON */}

                                                    <div
                                                        className={`
                                                            flex
                                                            h-14
                                                            w-14
                                                            items-center
                                                            justify-center
                                                            rounded-2xl
                                                            transition
                                                            duration-200
                                                            group-hover:-translate-y-1
                                                            group-hover:shadow-sm
                                                            sm:h-16
                                                            sm:w-16
                                                            ${meta.backgroundClass}
                                                            ${meta.textClass}
                                                        `}
                                                    >
                                                        {meta.icon}
                                                    </div>

                                                    {/* ORIGINAL API CATEGORY NAME */}

                                                    <p className="mt-2 max-w-full wrap-break-word text-center text-xs font-semibold leading-tight text-slate-800 sm:text-sm">
                                                        {
                                                            category.name_provider_category
                                                        }
                                                    </p>
                                                </button>
                                            );
                                        }
                                    )}

                                    {/* SEMUA BUTTON */}
                                    <button
                                        type="button"
                                        onClick={
                                            handleOpenAllServices
                                        }
                                        className="group flex min-w-0 cursor-pointer flex-col items-center text-center"
                                    >
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition duration-200 group-hover:-translate-y-1 group-hover:border-blue-300 group-hover:shadow-sm sm:h-16 sm:w-16">
                                            <Grid2X2
                                                size={26}
                                                strokeWidth={1.9}
                                            />
                                        </div>

                                        <p className="mt-2 text-center text-xs font-semibold leading-tight text-slate-800 sm:text-sm">
                                            Semua
                                        </p>
                                    </button>
                                </div>

                                {displayedCategories.length ===
                                    0 && (
                                        <p className="mt-4 text-center text-sm text-slate-500">
                                            Belum ada kategori
                                            aktif.
                                        </p>
                                    )}
                            </>
                        )}
                </section>

                <section className="mt-8">
                    <h2 className="mb-3 text-xl font-bold">
                        Cara kerjanya
                    </h2>

                    <div className="grid grid-cols-3 gap-2">
                        {[
                            {
                                number: 1,
                                title: "Bayar di DANA",
                                description: "Harga sudah final",
                            },
                            {
                                number: 2,
                                title: "Dapat Health Pass",
                                description: "QR masuk ke emailmu",
                            },
                            {
                                number: 3,
                                title: "Datang langsung",
                                description: "Tunjukkan QR di klinik",
                            },
                        ].map((step) => (
                            <div
                                key={step.number}
                                className="rounded-2xl border border-slate-200 bg-white p-3"
                            >
                                <div
                                    className={`
                                        flex
                                        h-7
                                        w-7
                                        items-center
                                        justify-center
                                        rounded-full
                                        text-xs
                                        font-bold
                                        ${step.number === 3
                                            ? "bg-emerald-400 text-slate-900"
                                            : "bg-blue-600 text-white"
                                        }
                                    `}
                                >
                                    {step.number}
                                </div>

                                <h3 className="mt-3 text-sm font-semibold leading-tight">
                                    {step.title}
                                </h3>

                                <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
                                    {step.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                <section
                    id="services"
                    className="mt-8 scroll-mt-5"
                >
                    {/* SECTION HEADER */}
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold">
                                Layanan Tersedia
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                                Temukan layanan
                                kesehatan yang Anda
                                butuhkan
                            </p>
                        </div>

                        <span className="shrink-0 text-xs font-semibold text-blue-600">
                            {loading
                                ? "..."
                                : filteredServices.length}{" "}
                            layanan
                        </span>
                    </div>

                    {/* LOADING SERVICES */}
                    {loading && (
                        <div className="py-14 text-center text-sm text-slate-500">
                            Memuat layanan...
                        </div>
                    )}

                    {/* ERROR SERVICES */}
                    {!loading &&
                        errorMessage && (
                            <div className="mt-5 rounded-2xl bg-red-50 p-4 text-center text-sm text-red-500">
                                {errorMessage}
                            </div>
                        )}

                    {/* EMPTY SERVICES */}
                    {!loading &&
                        !errorMessage &&
                        filteredServices.length ===
                        0 && (
                            <div className="py-14 text-center text-sm text-slate-500">
                                Tidak ada layanan
                                yang ditemukan.
                            </div>
                        )}

                    {!loading &&
                        !errorMessage &&
                        filteredServices.length >
                        0 && (
                            <div className="mt-4 space-y-5">
                                {filteredServices.map(
                                    (service) => (
                                        <article
                                            key={
                                                service.id_service
                                            }
                                            className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                        >
                                            {/* SERVICE IMAGE */}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleServiceDetail(
                                                        service.id_service
                                                    )
                                                }
                                                className="relative block h-48 w-full cursor-pointer overflow-hidden bg-slate-100 text-left"
                                            >
                                                <img
                                                    src={
                                                        service.image_service
                                                    }
                                                    alt={
                                                        service.name_service
                                                    }
                                                    className="h-full w-full object-cover transition duration-300 hover:scale-105"
                                                />

                                                {/* STATUS */}
                                                <div className="absolute left-3 top-3 rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-bold text-white">
                                                    Tersedia
                                                </div>

                                                {/* QUOTA */}
                                                <div className="absolute bottom-3 left-3 rounded-full bg-black/55 px-3 py-1 text-[10px] font-semibold text-white backdrop-blur">
                                                    Quota{" "}
                                                    {
                                                        service.quota_service
                                                    }
                                                </div>
                                            </button>

                                            {/* SERVICE CONTENT */}
                                            <div className="p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        {/* NAME */}
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleServiceDetail(
                                                                    service.id_service
                                                                )
                                                            }
                                                            className="cursor-pointer text-left"
                                                        >
                                                            <h3 className="line-clamp-2 text-base font-bold text-slate-900">
                                                                {
                                                                    service.name_service
                                                                }
                                                            </h3>
                                                        </button>

                                                        {/* PROVIDER */}
                                                        {service.name_provider && (
                                                            <p className="mt-1 text-xs font-semibold text-blue-600">
                                                                {
                                                                    service.name_provider
                                                                }
                                                            </p>
                                                        )}

                                                        {/* DESCRIPTION */}
                                                        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">
                                                            {
                                                                service.description_service
                                                            }
                                                        </p>
                                                    </div>

                                                    {/* PRICE */}
                                                    <div className="shrink-0 rounded-xl bg-blue-50 px-3 py-2">
                                                        <p className="text-sm font-bold text-blue-600">
                                                            {formatRupiah(
                                                                service.price_service
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* INFORMATION */}
                                                <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                                                    {service.maps_service && (
                                                        <div className="flex items-center gap-1">
                                                            <MapPin
                                                                size={14}
                                                            />
                                                            Lokasi tersedia
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-1">
                                                        <Clock3
                                                            size={14}
                                                        />
                                                        Booking online
                                                    </div>
                                                </div>

                                                {/* ACTION BUTTONS */}
                                                <div className="mt-5 flex gap-3">
                                                    {/* DETAIL */}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleServiceDetail(
                                                                service.id_service
                                                            )
                                                        }
                                                        className="flex-1 cursor-pointer rounded-xl border border-blue-500 px-4 py-3 text-sm font-bold text-blue-600 transition hover:bg-blue-50"
                                                    >
                                                        Detail
                                                    </button>

                                                    {/* BOOK */}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleBook(
                                                                service.id_service
                                                            )
                                                        }
                                                        className="flex-1 cursor-pointer rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                                                    >
                                                        Book
                                                    </button>
                                                </div>
                                            </div>
                                        </article>
                                    )
                                )}
                            </div>
                        )}
                </section>

                <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-4">
                    <h2 className="text-sm font-bold">
                        Kenapa beli di STIQR Health
                    </h2>

                    <div className="mt-4 space-y-3">
                        <div className="flex items-start gap-3">
                            <ShieldCheck
                                size={17}
                                className="shrink-0 text-emerald-600"
                            />

                            <p className="text-xs text-slate-700">
                                Klinik berizin,
                                dokter bersertifikat
                            </p>
                        </div>

                        <div className="flex items-start gap-3">
                            <Wallet
                                size={17}
                                className="shrink-0 text-emerald-600"
                            />

                            <p className="text-xs text-slate-700">
                                Lihat harga layanan
                                sebelum melakukan
                                pembayaran
                            </p>
                        </div>

                        <div className="flex items-start gap-3">
                            <CheckCircle2
                                size={17}
                                className="shrink-0 text-emerald-600"
                            />

                            <p className="text-xs text-slate-700">
                                Kelola Health Pass
                                melalui akun kamu
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Home;
