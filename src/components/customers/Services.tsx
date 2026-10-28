import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    useNavigate,
    useSearchParams,
} from "react-router-dom";

import {
    ArrowLeft,
    Clock3,
    HeartPulse,
    MapPin,
    Search,
    X,
} from "lucide-react";

interface Service {
    id_service: number;
    name_service: string;
    price_service: string | number;
    image_service?: string | null;
    description_service?: string | null;
    status_service: string;
    maps_service?: string | null;
    quota_service?: string | number | null;
    id_provider: number;
    name_provider?: string | null;

    // Optional fields: hanya digunakan jika dikirim API.
    city_provider?: string | null;
    address_provider?: string | null;
    location_service?: string | null;
    name_location?: string | null;
    city_service?: string | null;
    address_service?: string | null;
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

const normalizeText = (
    value: unknown
): string => {
    return String(value ?? "")
        .toLowerCase()
        .normalize("NFKC")
        .trim();
};

const getSearchableText = (
    service: Service
): string => {
    return normalizeText(
        [
            service.name_service,
            service.description_service,
            service.name_provider,
            service.location_service,
            service.name_location,
            service.city_service,
            service.address_service,
            service.city_provider,
            service.address_provider,
        ].join(" ")
    );
};

const getServiceLocation = (
    service: Service
): string => {
    const values = [
        service.name_location,
        service.location_service,
        service.city_service,
        service.city_provider,
        service.address_service,
        service.address_provider,
    ];

    const found = values.find(
        (value) =>
            typeof value === "string" &&
            value.trim().length > 0
    );

    return found?.trim() || "";
};

const readCategoryParam = (
    params: URLSearchParams
): number | null => {
    const raw = params.get("category");

    if (!raw) return null;

    const categoryId = Number(raw);

    return Number.isSafeInteger(categoryId) &&
        categoryId > 0
        ? categoryId
        : null;
};

const Services = () => {
    const navigate = useNavigate();

    const [searchParams, setSearchParams] =
        useSearchParams();

    const selectedCategory =
        readCategoryParam(searchParams);

    const searchKeyword =
        searchParams.get("q") || "";

    const [services, setServices] = useState<
        Service[]
    >([]);

    const [categories, setCategories] = useState<
        ProviderCategory[]
    >([]);

    const [loading, setLoading] = useState(true);

    const [loadingCategories, setLoadingCategories] =
        useState(true);

    const [errorMessage, setErrorMessage] = useState("");

    const [categoryError, setCategoryError] =
        useState("");

    const updateQueryParams = (
        updates: {
            category?: number | null;
            q?: string;
        }
    ) => {
        const nextParams = new URLSearchParams(
            searchParams
        );

        if ("category" in updates) {
            if (
                updates.category !== null &&
                updates.category !== undefined
            ) {
                nextParams.set(
                    "category",
                    String(updates.category)
                );
            } else {
                nextParams.delete("category");
            }
        }

        if ("q" in updates) {
            const keyword =
                updates.q?.trim() || "";

            if (keyword) {
                nextParams.set("q", keyword);
            } else {
                nextParams.delete("q");
            }
        }

        setSearchParams(nextParams, {
            replace: true,
        });
    };

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

                if (controller.signal.aborted) {
                    return;
                }

                // Kategori benar-benar berasal dari API.
                // Tidak ada dummy category.
                // Tidak ada slice atau pembatasan jumlah.

                const activeCategories =
                    result.data.filter(
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
                    "[SERVICES CATEGORY ERROR]",
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

                if (controller.signal.aborted) {
                    return;
                }

                const activeServices =
                    result.data.filter(
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
                    "[SERVICES FETCH ERROR]",
                    error
                );

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Gagal mengambil layanan"
                );

                setServices([]);
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
        const keywords = normalizeText(
            searchKeyword
        )
            .split(/\s+/)
            .filter(Boolean);

        if (keywords.length === 0) {
            return services;
        }

        return services.filter((service) => {
            const searchableText =
                getSearchableText(service);

            // Semua kata yang diketik harus ditemukan,
            // tetapi boleh berada di field yang berbeda.

            return keywords.every((keyword) =>
                searchableText.includes(keyword)
            );
        });
    }, [services, searchKeyword]);

    const handleCategoryChange = (
        categoryId: number | null
    ) => {
        updateQueryParams({
            category: categoryId,
        });
    };

    const handleSearchChange = (
        keyword: string
    ) => {
        updateQueryParams({
            q: keyword,
        });
    };

    const handleClearSearch = () => {
        updateQueryParams({
            q: "",
        });
    };

    const handleServiceDetail = (
        serviceId: number
    ) => {
        navigate(
            `/customer/service/${serviceId}`
        );
    };

    const handleBack = () => {
        navigate("/customer/home");
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
                <div className="flex items-center gap-3 px-4 py-3">
                    {/* BACK */}
                    <button
                        type="button"
                        onClick={handleBack}
                        aria-label="Kembali ke Home"
                        className="flex h-10 w-8 shrink-0 cursor-pointer items-center justify-center text-slate-700 transition hover:text-blue-600"
                    >
                        <ArrowLeft size={22} />
                    </button>

                    {/* SEARCH INPUT */}
                    <div className="relative min-w-0 flex-1">
                        <Search
                            size={19}
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                            value={searchKeyword}
                            onChange={(event) =>
                                handleSearchChange(
                                    event.target.value
                                )
                            }
                            placeholder="Cari layanan, provider, atau lokasi"
                            aria-label="Cari layanan kesehatan"
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />

                        {/* CLEAR KEYWORD */}
                        {searchKeyword && (
                            <button
                                type="button"
                                onClick={handleClearSearch}
                                aria-label="Hapus pencarian"
                                className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="px-4 pb-3">
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
                        {/* ALL SERVICES */}

                        <button
                            type="button"
                            onClick={() =>
                                handleCategoryChange(null)
                            }
                            aria-pressed={
                                selectedCategory === null
                            }
                            className={`
                                shrink-0
                                cursor-pointer
                                rounded-full
                                border
                                px-4
                                py-2
                                text-sm
                                font-medium
                                transition
                                ${selectedCategory === null
                                    ? "border-blue-500 bg-blue-50 text-blue-600"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"
                                }
                            `}
                        >
                            Semua
                        </button>

                        {/* DYNAMIC CATEGORY FILTERS */}
                        {categories.map((category) => {
                            const isActive =
                                selectedCategory ===
                                Number(
                                    category.id_provider_category
                                );

                            return (
                                <button
                                    key={
                                        category.id_provider_category
                                    }
                                    type="button"
                                    onClick={() =>
                                        handleCategoryChange(
                                            Number(
                                                category.id_provider_category
                                            )
                                        )
                                    }
                                    aria-pressed={isActive}
                                    className={`
                                        shrink-0
                                        cursor-pointer
                                        whitespace-nowrap
                                        rounded-full
                                        border
                                        px-4
                                        py-2
                                        text-sm
                                        font-medium
                                        transition
                                        ${isActive
                                            ? "border-blue-500 bg-blue-50 text-blue-600"
                                            : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"
                                        }
                                    `}
                                >
                                    {
                                        category.name_provider_category
                                    }
                                </button>
                            );
                        })}
                    </div>

                    {/* CATEGORY LOADING */}
                    {loadingCategories && (
                        <p className="pt-2 text-xs text-slate-400">
                            Memuat kategori...
                        </p>
                    )}

                    {/* CATEGORY ERROR */}
                    {!loadingCategories &&
                        categoryError && (
                            <p className="pt-2 text-xs text-red-500">
                                {categoryError}
                            </p>
                        )}
                </div>
            </header>

            <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-5">
                {!loading && !errorMessage && (
                    <div className="mb-4 flex items-center justify-between gap-2">
                        <p className="text-sm text-slate-500">
                            {filteredServices.length} layanan
                        </p>

                        {searchKeyword.trim() && (
                            <span className="max-w-[65%] truncate text-xs text-slate-400">
                                Hasil untuk "{searchKeyword.trim()}"
                            </span>
                        )}
                    </div>
                )}

                {loading && (
                    <div className="space-y-4">
                        {[1, 2, 3].map((item) => (
                            <div
                                key={item}
                                className="flex animate-pulse gap-4 rounded-2xl border border-slate-200 bg-white p-4"
                            >
                                <div className="h-24 w-24 shrink-0 rounded-xl bg-slate-100" />

                                <div className="flex-1 space-y-3 py-1">
                                    <div className="h-4 w-4/5 rounded bg-slate-100" />
                                    <div className="h-3 w-2/3 rounded bg-slate-100" />
                                    <div className="h-5 w-1/2 rounded bg-slate-100" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && errorMessage && (
                    <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-center">
                        <p className="text-sm font-medium text-red-600">
                            Gagal memuat layanan
                        </p>

                        <p className="mt-2 text-xs text-red-500">
                            {errorMessage}
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                window.location.reload()
                            }
                            className="mt-4 cursor-pointer rounded-xl bg-white px-4 py-2 text-xs font-semibold text-red-600 shadow-sm"
                        >
                            Coba lagi
                        </button>
                    </div>
                )}

                {!loading &&
                    !errorMessage &&
                    filteredServices.length === 0 && (
                        <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                                <Search size={25} />
                            </div>

                            <h3 className="mt-4 text-sm font-bold text-slate-900">
                                Layanan tidak ditemukan
                            </h3>

                            <p className="mt-2 text-xs leading-relaxed text-slate-500">
                                Coba gunakan kata kunci lain
                                atau pilih kategori berbeda.
                            </p>

                            <button
                                type="button"
                                onClick={() =>
                                    updateQueryParams({
                                        category: null,
                                        q: "",
                                    })
                                }
                                className="mt-5 cursor-pointer rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700"
                            >
                                Lihat Semua Layanan
                            </button>
                        </div>
                    )}

                {!loading &&
                    !errorMessage &&
                    filteredServices.length > 0 && (
                        <div className="space-y-3">
                            {filteredServices.map((service) => {
                                const location =
                                    getServiceLocation(service);

                                return (
                                    <button
                                        key={service.id_service}
                                        type="button"
                                        onClick={() =>
                                            handleServiceDetail(
                                                service.id_service
                                            )
                                        }
                                        className="group flex w-full cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md sm:gap-4 sm:p-4"
                                    >
                                        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-50 text-blue-600 sm:h-28 sm:w-28">
                                            {service.image_service ? (
                                                <img
                                                    src={
                                                        service.image_service
                                                    }
                                                    alt={
                                                        service.name_service
                                                    }
                                                    loading="lazy"
                                                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                                />
                                            ) : (
                                                <HeartPulse
                                                    size={30}
                                                    strokeWidth={1.7}
                                                />
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            {/* SERVICE NAME */}
                                            <h3 className="line-clamp-2 text-sm font-bold leading-snug text-slate-900 sm:text-base">
                                                {
                                                    service.name_service
                                                }
                                            </h3>

                                            {/* PROVIDER + LOCATION */}
                                            <div className="mt-1.5 space-y-1">
                                                {service.name_provider && (
                                                    <p className="truncate text-xs text-slate-500 sm:text-sm">
                                                        {
                                                            service.name_provider
                                                        }
                                                    </p>
                                                )}

                                                {location && (
                                                    <p className="flex items-center gap-1 text-xs text-slate-500">
                                                        <MapPin
                                                            size={13}
                                                            className="shrink-0"
                                                        />

                                                        <span className="truncate">
                                                            {location}
                                                        </span>
                                                    </p>
                                                )}
                                            </div>

                                            {/* PRICE */}
                                            <p className="mt-2 text-base font-bold text-blue-700 sm:text-lg">
                                                {formatRupiah(
                                                    service.price_service
                                                )}
                                            </p>

                                            {/* DESCRIPTION */}
                                            {service.description_service && (
                                                <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-slate-500 sm:text-xs">
                                                    {
                                                        service.description_service
                                                    }
                                                </p>
                                            )}

                                            {/* INFORMATION */}
                                            <div className="mt-3 flex flex-wrap gap-1.5">
                                                <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
                                                    <Clock3 size={11} />
                                                    Lihat Detail
                                                </span>

                                                {service.quota_service !==
                                                    null &&
                                                    service.quota_service !==
                                                    undefined && (
                                                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                                                            Kuota{" "}
                                                            {
                                                                service.quota_service
                                                            }
                                                        </span>
                                                    )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
            </main>
        </div>
    );
};

export default Services;
