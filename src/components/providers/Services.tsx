import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    useNavigate,
    useOutletContext,
} from "react-router-dom";

import {
    AlertCircle,
    Ban,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Eye,
    FolderOpen,
    Image as ImageIcon,
    Info,
    Loader2,
    MapPin,
    Package,
    RefreshCw,
    Search,
    Wallet,
    X,
} from "lucide-react";

import { isTokenExpired } from "../../utils/auth";

const PAGE_SIZE = 10;

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

interface ProviderUser {
    id_provider?: number | string;

    provider?: {
        id_provider?: number | string;
    };
}

interface ProviderContext {
    providerUser: ProviderUser | null;
    providerName: string;
    userName: string;
}

interface Service {
    id_service: number;
    id_provider: number | string;
    name_service: string;
    price_service: number | string;
    image_service?: string | null;
    description_service?: string | null;
    status_service: string;
    maps_service?: string | null;
    quota_service?: number | string | null;
    name_provider?: string;
}

interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
}

const getProviderToken = (): string | null =>
    sessionStorage.getItem("provider_token") ||
    localStorage.getItem("provider_token");

const clearProviderSession = () => {
    sessionStorage.removeItem("provider_token");
    localStorage.removeItem("provider_token");

    sessionStorage.removeItem("provider_user_data");
    localStorage.removeItem("provider_user_data");
};

const getStoredProviderId = (): number | null => {
    try {
        const stored =
            localStorage.getItem("provider_user_data") ||
            sessionStorage.getItem("provider_user_data");

        if (!stored) {
            return null;
        }

        const data = JSON.parse(stored);

        const rawId =
            data?.id_provider ??
            data?.provider?.id_provider ??
            data?.provider_user?.id_provider ??
            data?.provider_user?.provider?.id_provider ??
            data?.data?.id_provider ??
            data?.data?.provider?.id_provider ??
            data?.data?.provider_user?.id_provider;

        const id = Number(rawId);

        return rawId != null &&
            rawId !== "" &&
            Number.isSafeInteger(id) &&
            id > 0
            ? id
            : null;
    } catch {
        return null;
    }
};

const formatRupiah = (
    value: string | number
): string => {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
        return "—";
    }

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(amount);
};

const isActive = (status?: string): boolean =>
    status?.toUpperCase() === "ACTIVE";

const formatQuota = (
    value?: number | string | null
): string => {
    if (value === null || value === undefined || value === "") {
        return "—";
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return String(value);
    }

    return new Intl.NumberFormat("id-ID").format(number);
};

const parseApiResponse = async <T,>(
    response: Response
): Promise<ApiResponse<T>> => {
    const result: unknown = await response.json().catch(() => {
        throw new Error("Respons server tidak valid.");
    });

    if (
        result === null ||
        typeof result !== "object" ||
        Array.isArray(result)
    ) {
        throw new Error("Format respons server tidak valid.");
    }

    return result as ApiResponse<T>;
};

const getApiError = (
    result: ApiResponse,
    status: number
): string => {
    if (status === 401) {
        return "Sesi login telah berakhir. Silakan login kembali.";
    }

    if (status === 403) {
        return (
            result.message ||
            "Anda tidak memiliki izin melihat layanan ini."
        );
    }

    if (status === 404) {
        return (
            result.message ||
            "Daftar layanan provider tidak ditemukan."
        );
    }

    return (
        result.message ||
        `Gagal mengambil data layanan (HTTP ${status}).`
    );
};

const ServiceImage = ({
    service,
    size = "normal",
}: {
    service: Service;
    size?: "normal" | "large";
}) => {
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        setImageError(false);
    }, [service.id_service, service.image_service]);

    const containerClass =
        size === "large"
            ? "h-52 w-full rounded-2xl sm:h-64"
            : "h-14 w-14 shrink-0 rounded-xl";

    return (
        <div
            className={`flex items-center justify-center overflow-hidden bg-blue-50 ${containerClass}`}
        >
            {service.image_service && !imageError ? (
                <img
                    src={service.image_service}
                    alt={service.name_service}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={() => setImageError(true)}
                />
            ) : (
                <ImageIcon
                    size={size === "large" ? 42 : 23}
                    className="text-blue-300"
                />
            )}
        </div>
    );
};

const ServiceIdentity = ({
    service,
}: {
    service: Service;
}) => (
    <div className="flex min-w-0 items-center gap-3">
        <ServiceImage service={service} />

        <div className="min-w-0">
            <p
                className="max-w-55 truncate text-sm font-bold text-slate-900"
                title={service.name_service}
            >
                {service.name_service}
            </p>

            <p className="mt-1 max-w-57.5 truncate text-xs text-slate-500">
                {service.description_service || "Tanpa deskripsi"}
            </p>

            <p className="mt-1 text-[11px] text-slate-400">
                ID: {service.id_service}
            </p>
        </div>
    </div>
);

const StatusBadge = ({
    active,
}: {
    active: boolean;
}) => (
    <span
        className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-bold ${active
            ? "bg-blue-50 text-blue-700"
            : "bg-slate-100 text-slate-500"
            }`}
    >
        {active ? "Active" : "Non Active"}
    </span>
);

const SummaryCard = ({
    title,
    value,
    icon,
    loading,
}: {
    title: string;
    value: number;
    icon: React.ReactNode;
    loading: boolean;
}) => (
    <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
            <div>
                <p className="text-sm text-slate-500">
                    {title}
                </p>

                <h2 className="mt-3 text-3xl font-bold text-slate-900">
                    {loading ? "—" : value}
                </h2>
            </div>

            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                {icon}
            </div>
        </div>
    </div>
);

const ServiceDetailModal = ({
    service,
    providerName,
    onClose,
}: {
    service: Service;
    providerName: string;
    onClose: () => void;
}) => {
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener(
                "keydown",
                handleEscape
            );
        };
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/60 p-3 sm:p-5"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="service-detail-title"
                className="flex max-h-[92dvh] w-full max-w-180 flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
                {/* MODAL HEADER */}
                <div className="flex shrink-0 items-center justify-between gap-4 border-b border-blue-100 bg-blue-50/70 px-5 py-5 sm:px-7">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
                            <Eye size={22} />
                        </div>

                        <div className="min-w-0">
                            <h2
                                id="service-detail-title"
                                className="text-lg font-bold text-slate-900 sm:text-xl"
                            >
                                Detail Layanan
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                                Informasi lengkap layanan kesehatan.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Tutup detail layanan"
                        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-white text-slate-500 hover:bg-slate-100"
                    >
                        <X size={19} />
                    </button>
                </div>

                {/* MODAL BODY */}
                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5 sm:p-7">
                    {/* SERVICE IMAGE */}
                    <ServiceImage service={service} size="large" />

                    {/* TITLE */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                                Service #{service.id_service}
                            </p>

                            <h3 className="mt-2 text-xl font-bold text-slate-900">
                                {service.name_service}
                            </h3>

                            <p className="mt-2 text-sm text-slate-500">
                                {service.name_provider || providerName}
                            </p>
                        </div>

                        <StatusBadge
                            active={isActive(service.status_service)}
                        />
                    </div>

                    {/* PRICE AND QUOTA */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                            <div className="flex items-center gap-2 text-blue-600">
                                <Wallet size={18} />

                                <p className="text-xs font-semibold">
                                    Harga Layanan
                                </p>
                            </div>

                            <p className="mt-3 text-xl font-bold text-slate-900">
                                {formatRupiah(service.price_service)}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                            <div className="flex items-center gap-2 text-blue-600">
                                <Package size={18} />

                                <p className="text-xs font-semibold">
                                    Kuota Layanan
                                </p>
                            </div>

                            <p className="mt-3 text-xl font-bold text-slate-900">
                                {formatQuota(service.quota_service)}
                            </p>
                        </div>
                    </div>

                    {/* DESCRIPTION */}
                    <section className="border-t border-slate-100 pt-5">
                        <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                            <Info size={18} className="text-blue-600" />
                            Deskripsi Layanan
                        </h4>

                        <p className="whitespace-pre-wrap wrap-break-word text-sm leading-7 text-slate-600">
                            {service.description_service?.trim() ||
                                "Belum ada deskripsi layanan."}
                        </p>
                    </section>

                    {/* MAPS */}
                    <section className="border-t border-slate-100 pt-5">
                        <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                            <MapPin size={18} className="text-blue-600" />
                            Lokasi Layanan
                        </h4>

                        {service.maps_service?.trim() ? (
                            /^https?:\/\//i.test(service.maps_service) ? (
                                <a
                                    href={service.maps_service}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="break-all text-sm font-semibold text-blue-600 hover:underline"
                                >
                                    Lihat lokasi layanan
                                </a>
                            ) : (
                                <p className="wrap-break-word text-sm text-slate-600">
                                    {service.maps_service}
                                </p>
                            )
                        ) : (
                            <p className="text-sm text-slate-500">
                                Lokasi belum tersedia.
                            </p>
                        )}
                    </section>

                    {/* READ ONLY INFORMATION */}
                    <div className="flex items-start gap-3 rounded-xl bg-blue-50 p-4">
                        <Info
                            size={18}
                            className="mt-0.5 shrink-0 text-blue-600"
                        />

                        <p className="text-xs leading-6 text-blue-700">
                            Informasi layanan ini hanya dapat dilihat
                            melalui Provider Portal. Penambahan dan
                            perubahan layanan dilakukan oleh admin
                            yang memiliki kewenangan.
                        </p>
                    </div>
                </div>

                {/* MODAL FOOTER */}
                <div className="flex shrink-0 items-center justify-end border-t border-blue-100 bg-white px-5 py-4 sm:px-7">
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
};

const Services = () => {
    const navigate = useNavigate();

    const { providerUser, providerName } =
        useOutletContext<ProviderContext>();

    const contextId =
        providerUser?.id_provider ??
        providerUser?.provider?.id_provider;

    const parsedId = Number(contextId);

    const providerId =
        contextId != null &&
            contextId !== "" &&
            Number.isSafeInteger(parsedId) &&
            parsedId > 0
            ? parsedId
            : getStoredProviderId();

    const [services, setServices] =
        useState<Service[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [errorMessage, setErrorMessage] =
        useState("");

    const [search, setSearch] =
        useState("");

    const [filter, setFilter] =
        useState<StatusFilter>("ALL");

    const [page, setPage] =
        useState(1);

    const [refreshKey, setRefreshKey] =
        useState(0);

    const [selectedService, setSelectedService] =
        useState<Service | null>(null);

    const redirectToLogin = useCallback(() => {
        clearProviderSession();

        navigate("/provider/sign-in", {
            replace: true,
        });
    }, [navigate]);

    useEffect(() => {
        const controller = new AbortController();

        const fetchServices = async () => {
            setLoading(true);
            setErrorMessage("");

            if (!providerId) {
                setServices([]);

                setErrorMessage(
                    "ID provider tidak ditemukan. Silakan login kembali."
                );

                setLoading(false);
                return;
            }

            const token = getProviderToken();

            if (!token || isTokenExpired(token)) {
                redirectToLogin();
                return;
            }

            try {
                const response = await fetch(
                    `${import.meta.env.VITE_API_URI}/service/provider/${providerId}`,
                    {
                        method: "GET",
                        headers: {
                            Accept: "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        cache: "no-store",
                        signal: controller.signal,
                    }
                );

                if (response.status === 401) {
                    redirectToLogin();
                    return;
                }

                const result =
                    await parseApiResponse<Service[]>(response);

                if (!response.ok || !result.success) {
                    throw new Error(
                        getApiError(result, response.status)
                    );
                }

                if (!Array.isArray(result.data)) {
                    throw new Error(
                        "Format daftar layanan tidak valid."
                    );
                }

                // Only display services belonging
                // to the currently selected provider.
                const scoped = result.data.filter(
                    (item) =>
                        Number(item.id_provider) === providerId
                );

                if (controller.signal.aborted) return;

                setServices(scoped);
            } catch (error) {
                if (controller.signal.aborted) return;

                setServices([]);

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Gagal mengambil daftar layanan."
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
    }, [providerId, refreshKey, redirectToLogin]);

    const summary = useMemo(() => {
        const active = services.filter(
            (service) => isActive(service.status_service)
        ).length;

        return {
            total: services.length,
            active,
            inactive: services.length - active,
        };
    }, [services]);

    const filteredServices = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return services
            .filter((service) => {
                const searchable = [
                    service.id_service,
                    service.name_service,
                    service.description_service,
                ]
                    .filter((value) => value != null)
                    .join(" ")
                    .toLowerCase();

                const matchSearch =
                    !keyword ||
                    searchable.includes(keyword);

                const matchStatus =
                    filter === "ALL" ||
                    (filter === "ACTIVE"
                        ? isActive(service.status_service)
                        : !isActive(service.status_service));

                return matchSearch && matchStatus;
            })
            .sort(
                (a, b) =>
                    Number(b.id_service) - Number(a.id_service)
            );
    }, [services, search, filter]);

    useEffect(() => {
        setPage(1);
    }, [search, filter]);

    const totalPages = Math.max(
        1,
        Math.ceil(
            filteredServices.length / PAGE_SIZE
        )
    );

    const currentPage = Math.min(
        page,
        totalPages
    );

    const visibleServices = filteredServices.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    const refresh = () => {
        if (!loading) {
            setRefreshKey((value) => value + 1);
        }
    };

    const openDetail = (service: Service) => {
        setSelectedService(service);
    };

    const closeDetail = useCallback(() => {
        setSelectedService(null);
    }, []);

    return (
        <div className="min-h-full bg-[#F8FAFF]">
            <div className="mx-auto max-w-360 space-y-6 p-5 md:p-7 lg:p-8">
                <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">
                            Provider Portal
                        </p>

                        <h1 className="mt-2 text-2xl font-bold text-slate-900 lg:text-3xl">
                            Services
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                            Lihat informasi dan ketersediaan layanan
                            kesehatan yang tersedia di{" "}
                            <span className="font-semibold text-slate-700">
                                {providerName || "provider Anda"}
                            </span>
                            .
                        </p>
                    </div>

                    {/* REFRESH ONLY — NO CREATE BUTTON */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={refresh}
                            disabled={loading}
                            className="flex cursor-pointer items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <RefreshCw
                                size={17}
                                className={
                                    loading ? "animate-spin" : ""
                                }
                            />

                            Refresh
                        </button>
                    </div>
                </section>

                {errorMessage && (
                    <div
                        role="alert"
                        className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                    >
                        <AlertCircle
                            size={20}
                            className="mt-0.5 shrink-0"
                        />

                        <span className="flex-1">
                            {errorMessage}
                        </span>

                        <button
                            type="button"
                            onClick={() => setErrorMessage("")}
                            aria-label="Tutup pesan error"
                            className="cursor-pointer"
                        >
                            <X size={17} />
                        </button>
                    </div>
                )}

                <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <SummaryCard
                        title="Total Services"
                        value={summary.total}
                        icon={<Package size={22} />}
                        loading={loading || Boolean(errorMessage)}
                    />

                    <SummaryCard
                        title="Active Services"
                        value={summary.active}
                        icon={<CheckCircle2 size={22} />}
                        loading={loading || Boolean(errorMessage)}
                    />

                    <SummaryCard
                        title="Inactive Services"
                        value={summary.inactive}
                        icon={<Ban size={22} />}
                        loading={loading || Boolean(errorMessage)}
                    />
                </section>

                <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
                    {/* TABLE HEADER */}
                    <div className="border-b border-blue-100 p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">
                                    Daftar Layanan
                                </h2>

                                <p className="mt-1 text-xs text-slate-500">
                                    Informasi layanan dapat dilihat,
                                    tetapi tidak dapat diubah oleh provider.
                                </p>
                            </div>

                            <span className="text-xs font-semibold text-blue-600">
                                {filteredServices.length} layanan
                            </span>
                        </div>

                        {/* SEARCH AND FILTER */}
                        <div className="mt-5 flex flex-col gap-3 lg:flex-row">
                            {/* SEARCH */}
                            <div className="relative min-w-0 flex-1">
                                <Search
                                    size={18}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                />

                                <input
                                    type="search"
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Cari nama layanan atau ID..."
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            {/* STATUS FILTER */}
                            <div className="flex gap-2 overflow-x-auto">
                                {(
                                    [
                                        ["ALL", "Semua"],
                                        ["ACTIVE", "Active"],
                                        ["INACTIVE", "Non Active"],
                                    ] as const
                                ).map(([value, label]) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setFilter(value)}
                                        className={`shrink-0 cursor-pointer rounded-xl border px-4 py-2 text-xs font-bold transition-colors ${filter === value
                                            ? "border-blue-600 bg-blue-600 text-white"
                                            : "border-slate-200 text-slate-500 hover:border-blue-300"
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center gap-3 py-20 text-sm text-slate-500">
                            <Loader2
                                size={24}
                                className="animate-spin text-blue-600"
                            />

                            Memuat layanan...
                        </div>
                    ) : errorMessage ? (
                        <div className="py-16 text-center">
                            <AlertCircle
                                size={36}
                                className="mx-auto text-red-400"
                            />

                            <p className="mt-3 text-sm text-slate-500">
                                Daftar layanan tidak dapat dimuat.
                            </p>

                            <button
                                type="button"
                                onClick={refresh}
                                className="mt-4 cursor-pointer rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                            >
                                Coba Lagi
                            </button>
                        </div>
                    ) : filteredServices.length === 0 ? (
                        <div className="py-20 text-center">
                            <FolderOpen
                                size={42}
                                className="mx-auto text-blue-200"
                            />

                            <p className="mt-3 font-bold text-slate-800">
                                {services.length === 0
                                    ? "Belum Ada Layanan"
                                    : "Layanan Tidak Ditemukan"}
                            </p>

                            <p className="mt-2 text-sm text-slate-500">
                                {services.length === 0
                                    ? "Belum ada layanan yang tersedia untuk provider ini."
                                    : "Coba gunakan kata kunci atau filter lainnya."}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="hidden overflow-x-auto lg:block">
                                <table className="w-full min-w-200 text-left">
                                    <thead className="bg-blue-50/70">
                                        <tr className="text-xs font-semibold text-slate-500">
                                            <th className="px-5 py-4">
                                                Layanan
                                            </th>

                                            <th className="px-4 py-4">
                                                Harga
                                            </th>

                                            <th className="px-4 py-4">
                                                Kuota
                                            </th>

                                            <th className="px-4 py-4">
                                                Status
                                            </th>

                                            <th className="px-4 py-4 text-right">
                                                Aksi
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100">
                                        {visibleServices.map((service) => (
                                            <tr
                                                key={service.id_service}
                                                className="hover:bg-blue-50/30"
                                            >
                                                {/* SERVICE */}
                                                <td className="px-5 py-4">
                                                    <ServiceIdentity
                                                        service={service}
                                                    />
                                                </td>

                                                {/* PRICE */}
                                                <td className="whitespace-nowrap px-4 py-4 text-sm font-bold text-slate-900">
                                                    {formatRupiah(
                                                        service.price_service
                                                    )}
                                                </td>

                                                {/* QUOTA */}
                                                <td className="px-4 py-4 text-sm text-slate-700">
                                                    {formatQuota(
                                                        service.quota_service
                                                    )}
                                                </td>

                                                {/* STATUS BADGE ONLY */}
                                                <td className="px-4 py-4">
                                                    <StatusBadge
                                                        active={isActive(
                                                            service.status_service
                                                        )}
                                                    />
                                                </td>

                                                {/* VIEW DETAIL ONLY */}
                                                <td className="px-4 py-4">
                                                    <div className="flex justify-end">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openDetail(service)
                                                            }
                                                            title="Lihat Detail Layanan"
                                                            aria-label={`Lihat detail ${service.name_service}`}
                                                            className="flex cursor-pointer items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                                                        >
                                                            <Eye size={17} />
                                                            Detail
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="space-y-3 p-4 lg:hidden">
                                {visibleServices.map((service) => (
                                    <article
                                        key={service.id_service}
                                        className="rounded-xl border border-slate-200 bg-white p-4"
                                    >
                                        {/* SERVICE IDENTITY */}
                                        <ServiceIdentity service={service} />

                                        {/* PRICE / QUOTA */}
                                        <div className="mt-4 grid grid-cols-2 gap-3">
                                            <div>
                                                <p className="text-xs text-slate-400">
                                                    Harga
                                                </p>

                                                <p className="mt-1 text-sm font-bold text-slate-900">
                                                    {formatRupiah(
                                                        service.price_service
                                                    )}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-xs text-slate-400">
                                                    Kuota
                                                </p>

                                                <p className="mt-1 text-sm font-bold text-slate-900">
                                                    {formatQuota(
                                                        service.quota_service
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        {/* STATUS */}
                                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                                            <span className="text-xs font-medium text-slate-500">
                                                Status Layanan
                                            </span>

                                            <StatusBadge
                                                active={isActive(
                                                    service.status_service
                                                )}
                                            />
                                        </div>

                                        {/* VIEW DETAIL */}
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openDetail(service)
                                            }
                                            className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-xs font-bold text-blue-700 hover:bg-blue-100"
                                        >
                                            <Eye size={17} />
                                            Lihat Detail Layanan
                                        </button>
                                    </article>
                                ))}
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-blue-100 px-5 py-4">
                                <p className="text-xs text-slate-500">
                                    Menampilkan{" "}
                                    {(currentPage - 1) * PAGE_SIZE + 1}
                                    {" - "}
                                    {Math.min(
                                        currentPage * PAGE_SIZE,
                                        filteredServices.length
                                    )}{" "}
                                    dari {filteredServices.length}
                                </p>

                                <div className="flex items-center gap-2">
                                    {/* PREVIOUS */}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPage((previous) =>
                                                Math.max(1, previous - 1)
                                            )
                                        }
                                        disabled={currentPage <= 1}
                                        aria-label="Halaman sebelumnya"
                                        className="cursor-pointer rounded-lg border border-slate-200 p-2 text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <ChevronLeft size={17} />
                                    </button>

                                    {/* CURRENT PAGE */}
                                    <span className="min-w-12 text-center text-xs font-semibold text-slate-700">
                                        {currentPage} / {totalPages}
                                    </span>

                                    {/* NEXT */}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPage((previous) =>
                                                Math.min(
                                                    totalPages,
                                                    previous + 1
                                                )
                                            )
                                        }
                                        disabled={currentPage >= totalPages}
                                        aria-label="Halaman berikutnya"
                                        className="cursor-pointer rounded-lg border border-slate-200 p-2 text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <ChevronRight size={17} />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </section>
            </div>

            {selectedService && (
                <ServiceDetailModal
                    service={selectedService}
                    providerName={providerName}
                    onClose={closeDetail}
                />
            )}
        </div>
    );
};

export default Services;
