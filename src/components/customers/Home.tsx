
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock3, MapPin, Search } from "lucide-react";
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


const getCategoryIcon = (name: string): string => {
    const normalized = name.trim().toLowerCase();

    if (normalized === "dental") return "🦷";

    if (normalized === "optical") return "👁️";

    if (normalized === "preventive/screening") return "🩺";

    if (normalized === "selected consultation") return "👨‍⚕️";

    if (normalized === "skin") return "🧴";

    if (normalized === "wellness/nutrition") return "🥗";

    return "🏥";
};

const formatRupiah = (value: string | number): string => {
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
    const [selectedCategory, setSelectedCategory] = useState<
        number | null
    >(null);
    const [searchKeyword, setSearchKeyword] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadingCategories, setLoadingCategories] =
        useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [categoryError, setCategoryError] = useState("");

    useEffect(() => {
        const token = sessionStorage.getItem("customer_token");

        if (token && isTokenExpired(token)) {
            sessionStorage.removeItem("customer_token");
            localStorage.removeItem("customer_data");
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        const fetchCategories = async () => {
            try {
                setLoadingCategories(true);
                setCategoryError("");

                const response = await fetch(
                    `${import.meta.env.VITE_API_URI}/provider-categories/active`,
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

                if (controller.signal.aborted) return;

                const activeCategories = result.data.filter(
                    (category) =>
                        category.status_provider_category ===
                        "ACTIVE"
                );

                setCategories(activeCategories);
            } catch (error) {
                if (controller.signal.aborted) return;

                console.error("[HOME CATEGORY ERROR]", error);

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
                // Semua kategori mengambil seluruh layanan.
                // Kategori tertentu mengambil layanan berdasarkan ID.

                const endpoint =
                    selectedCategory === null
                        ? "/service/get-all"
                        : `/service/provider-category/${selectedCategory}`;

                const response = await fetch(
                    `${import.meta.env.VITE_API_URI}${endpoint}`,
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

                if (controller.signal.aborted) return;

                const activeServices = result.data.filter(
                    (service) =>
                        service.status_service === "ACTIVE"
                );

                setServices(activeServices);
            } catch (error) {
                if (controller.signal.aborted) return;

                console.error("[HOME SERVICE ERROR]", error);

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

    const filteredServices = useMemo(() => {
        const keyword = searchKeyword.trim().toLowerCase();

        if (!keyword) {
            return services;
        }

        return services.filter((service) =>
            [
                service.name_service,
                service.description_service,
                service.name_provider,
            ].some((value) =>
                String(value ?? "")
                    .toLowerCase()
                    .includes(keyword)
            )
        );
    }, [services, searchKeyword]);

    const handleServiceDetail = (serviceId: number) => {
        navigate(`/customer/service/${serviceId}`);
    };

    const handleBook = (serviceId: number) => {
        const token = sessionStorage.getItem("customer_token");

        if (!token || isTokenExpired(token)) {
            sessionStorage.removeItem("customer_token");
            localStorage.removeItem("customer_data");

            const redirectPath = `/customer/service/${serviceId}`;

            navigate(
                `/customer/sign-in?redirect=${encodeURIComponent(
                    redirectPath
                )}`
            );

            return;
        }

        navigate(`/customer/service/${serviceId}`);
    };

    const handleSeeServices = () => {
        document
            .getElementById("services")
            ?.scrollIntoView({
                behavior: "smooth",
            });
    };

    return (
        <div>
            <section className="bg-linear-to-br from-cyan-100 via-sky-100 to-blue-100 px-5 pb-6">
                {/* SEARCH */}
                <div className="relative">
                    <Search
                        size={21}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                        type="text"
                        value={searchKeyword}
                        onChange={(event) =>
                            setSearchKeyword(event.target.value)
                        }
                        placeholder="Cari layanan kesehatan..."
                        className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                </div>

                {/* HERO */}
                <div className="mt-5 overflow-hidden rounded-3xl bg-linear-to-r from-blue-600 via-blue-500 to-cyan-400 p-5 text-white shadow-lg">
                    <div className="flex items-center justify-between gap-4">
                        <div className="max-w-[65%]">
                            <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">
                                Promo Spesial
                            </p>

                            <h2 className="mt-2 text-2xl font-extrabold leading-tight">
                                Layanan Kesehatan
                                <br />
                                Praktis untuk Anda
                            </h2>

                            <p className="mt-2 text-xs leading-relaxed text-blue-50">
                                Booking klinik, pemeriksaan, dan
                                layanan kesehatan hanya dalam beberapa
                                langkah.
                            </p>

                            <button
                                type="button"
                                onClick={handleSeeServices}
                                className="cursor-pointer mt-4 rounded-xl bg-white px-4 py-2 text-xs font-bold text-blue-600 shadow-sm transition hover:bg-blue-50"
                            >
                                Lihat Layanan
                            </button>
                        </div>

                        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-white/15 text-5xl">
                            🏥
                        </div>
                    </div>
                </div>
            </section>

            <div className="px-5 py-5">
                <section>
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-xl font-extrabold">
                            Kategori
                        </h2>

                        <button
                            type="button"
                            className="text-xs font-semibold text-blue-600"
                            onClick={() =>
                                setSelectedCategory(null)
                            }
                        >
                            Lihat semua
                        </button>
                    </div>

                    {/* LOADING CATEGORY */}
                    {loadingCategories && (
                        <p className="py-4 text-center text-sm text-slate-500">
                            Memuat kategori...
                        </p>
                    )}

                    {/* ERROR CATEGORY */}
                    {!loadingCategories && categoryError && (
                        <p className="py-4 text-center text-sm text-red-500">
                            {categoryError}
                        </p>
                    )}

                    {/* CATEGORY LIST */}
                    {!loadingCategories && !categoryError && (
                        <>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {/* ALL CATEGORIES */}
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSelectedCategory(null)
                                    }
                                    aria-pressed={
                                        selectedCategory === null
                                    }
                                    className={`cursor-pointer rounded-2xl border p-3 text-center transition ${selectedCategory === null
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-slate-100 bg-white hover:border-blue-200"
                                        }`}
                                >
                                    <div className="text-3xl">
                                        🏥
                                    </div>

                                    <p
                                        className={`mt-2 text-xs font-semibold ${selectedCategory === null
                                            ? "text-blue-600"
                                            : "text-slate-600"
                                            }`}
                                    >
                                        Semua
                                    </p>
                                </button>

                                {/* DYNAMIC CATEGORIES FROM API */}
                                {categories.map((category) => {
                                    const active =
                                        selectedCategory ===
                                        category.id_provider_category;

                                    return (
                                        <button
                                            key={
                                                category.id_provider_category
                                            }
                                            type="button"
                                            onClick={() =>
                                                setSelectedCategory(
                                                    category.id_provider_category
                                                )
                                            }
                                            aria-pressed={active}
                                            className={`cursor-pointer rounded-2xl border p-3 text-center transition ${active
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-slate-100 bg-white hover:border-blue-200"
                                                }`}
                                        >
                                            <div className="text-3xl">
                                                {getCategoryIcon(
                                                    category.name_provider_category
                                                )}
                                            </div>

                                            <p
                                                className={`mt-2 wrap-break-word text-xs font-semibold ${active
                                                    ? "text-blue-600"
                                                    : "text-slate-600"
                                                    }`}
                                            >
                                                {
                                                    category.name_provider_category
                                                }
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>

                            {categories.length === 0 && (
                                <p className="mt-3 text-center text-sm text-slate-500">
                                    Belum ada kategori aktif.
                                </p>
                            )}
                        </>
                    )}
                </section>

                <section className="mt-7">
                    <h2 className="text-xl font-extrabold">
                        Spesial di STIQR
                    </h2>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                        {/* PROMO DENTAL */}
                        <div className="rounded-2xl bg-orange-50 p-4">
                            <div className="text-3xl">
                                🦷
                            </div>

                            <p className="mt-3 text-sm font-bold">
                                Promo Dental
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                                Perawatan gigi dengan harga terbaik
                            </p>
                        </div>

                        {/* MEDICAL CHECK-UP */}
                        <div className="rounded-2xl bg-cyan-50 p-4">
                            <div className="text-3xl">
                                🩺
                            </div>

                            <p className="mt-3 text-sm font-bold">
                                Medical Check-Up
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                                Cek kesehatan secara praktis
                            </p>
                        </div>

                        {/* OPTICAL */}
                        <div className="rounded-2xl bg-purple-50 p-4">
                            <div className="text-3xl">
                                👁️
                            </div>

                            <p className="mt-3 text-sm font-bold">
                                Pemeriksaan Mata
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                                Pemeriksaan mata terpercaya
                            </p>
                        </div>

                        {/* VACCINATION */}
                        <div className="rounded-2xl bg-green-50 p-4">
                            <div className="text-3xl">
                                💉
                            </div>

                            <p className="mt-3 text-sm font-bold">
                                Vaksinasi
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                                Berbagai pilihan vaksin tersedia
                            </p>
                        </div>
                    </div>
                </section>

                <section
                    id="services"
                    className="mt-8"
                >
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-extrabold">
                                Layanan Tersedia
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                                Temukan layanan kesehatan yang Anda
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
                    {!loading && errorMessage && (
                        <div className="mt-5 rounded-2xl bg-red-50 p-4 text-center text-sm text-red-500">
                            {errorMessage}
                        </div>
                    )}

                    {/* EMPTY SERVICES */}
                    {!loading &&
                        !errorMessage &&
                        filteredServices.length === 0 && (
                            <div className="py-14 text-center text-sm text-slate-500">
                                Tidak ada layanan yang ditemukan.
                            </div>
                        )}

                    {/* SERVICE LIST */}
                    {!loading &&
                        !errorMessage &&
                        filteredServices.length > 0 && (
                            <div className="mt-4 space-y-5">
                                {filteredServices.map((service) => (
                                    <article
                                        key={service.id_service}
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
                                            className="cursor-pointer relative block h-48 w-full overflow-hidden bg-slate-100 text-left"
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
                                                {service.quota_service}
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
                                                        className="text-left"
                                                    >
                                                        <h3 className="line-clamp-2 text-base font-extrabold text-slate-900">
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
                                                    <p className="text-sm font-extrabold text-blue-600">
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
                                                    className="cursor-pointer flex-1 rounded-xl border border-blue-500 px-4 py-3 text-sm font-bold text-blue-600 transition hover:bg-blue-50"
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
                                                    className="cursor-pointer flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                                                >
                                                    Book
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                </section>
            </div>
        </div>
    );
};

export default Home;
