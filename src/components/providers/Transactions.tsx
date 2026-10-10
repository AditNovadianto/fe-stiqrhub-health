
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
    Search,
    RefreshCw,
    ReceiptText,
    CheckCircle2,
    Clock3,
    Wallet,
    CreditCard,
    CalendarDays,
    UserRound,
    Building2,
    X,
    Loader2,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Eye,
    Package,
    Hash,
    Filter,
} from "lucide-react";

import { isTokenExpired } from "../../utils/auth";

interface ProviderUser {
    id_provider_user?: number | string;
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

interface Order {
    id_order: string;
    sub_total: string | number;
    total: string | number;

    payment_method: string | null;
    payment_status: string;
    order_status: string;

    paid_at: string | null;
    booking_at: string | null;
    payment_expired_at?: string | null;
    payment_updated_at?: string | null;
    dana_payment_id?: string | null;

    id_customer: number;
    name_customer: string;
    email_customer?: string | null;
    phone_number_customer?: string | null;

    id_service: number;
    name_service: string;
    price_service: string | number;
    image_service?: string | null;

    id_provider?: number;
    name_provider?: string;

    created_at?: string | null;
    updated_at?: string | null;
}

interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
}

type TransactionFilter =
    | "ALL"
    | "APPROVED"
    | "PENDING"
    | "FAILED";

type SortOption = "NEWEST" | "OLDEST" | "HIGHEST";

const PAGE_SIZE = 10;

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

        if (!stored) return null;

        const data = JSON.parse(stored);

        const rawId =
            data?.id_provider ??
            data?.provider?.id_provider ??
            data?.provider_user?.id_provider ??
            data?.provider_user?.provider?.id_provider ??
            data?.data?.id_provider ??
            data?.data?.provider?.id_provider ??
            data?.data?.provider_user?.id_provider;

        if (rawId == null || rawId === "") return null;

        const id = Number(rawId);

        return Number.isSafeInteger(id) && id > 0
            ? id
            : null;
    } catch {
        return null;
    }
};

const formatRupiah = (
    value: string | number | null | undefined
): string => {
    if (value == null) return "-";

    const number = Number(value);

    if (!Number.isFinite(number)) return "-";

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(number);
};

const formatDate = (
    value?: string | null,
    withTime = true
): string => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        ...(withTime
            ? {
                hour: "2-digit" as const,
                minute: "2-digit" as const,
                hourCycle: "h23" as const,
            }
            : {}),
        timeZone: "Asia/Jakarta",
    }).format(date);
};

const getOrderDate = (order: Order): string | null =>
    order.created_at ??
    order.paid_at ??
    order.booking_at ??
    null;

const getTimestamp = (value?: string | null): number => {
    if (!value) return 0;

    const timestamp = new Date(value).getTime();

    return Number.isFinite(timestamp) ? timestamp : 0;
};

const normalizeStatus = (value?: string): string =>
    (value || "").trim().toUpperCase();

const isSuccessfulPayment = (order: Order): boolean =>
    ["APPROVED", "PAID"].includes(
        normalizeStatus(order.payment_status)
    );

const isPendingOrder = (order: Order): boolean =>
    normalizeStatus(order.payment_status) === "PENDING" ||
    normalizeStatus(order.order_status) === "PENDING";

const isFailedOrder = (order: Order): boolean => {
    const failures = [
        "FAILED",
        "REJECTED",
        "CANCELLED",
        "CANCELED",
        "EXPIRED",
        "DENIED",
    ];

    return (
        failures.includes(normalizeStatus(order.payment_status)) ||
        failures.includes(normalizeStatus(order.order_status))
    );
};

const getStatusLabel = (status?: string): string => {
    switch (normalizeStatus(status)) {
        case "APPROVED":
        case "PAID":
            return "Berhasil";
        case "PENDING":
            return "Menunggu";
        case "FAILED":
        case "REJECTED":
        case "DENIED":
            return "Gagal";
        case "CANCELLED":
        case "CANCELED":
            return "Dibatalkan";
        case "EXPIRED":
            return "Kedaluwarsa";
        default:
            return status || "-";
    }
};

const getStatusClasses = (status?: string): string => {
    switch (normalizeStatus(status)) {
        case "APPROVED":
        case "PAID":
            return "bg-emerald-50 text-emerald-700 border-emerald-100";
        case "PENDING":
            return "bg-amber-50 text-amber-700 border-amber-100";
        case "FAILED":
        case "REJECTED":
        case "DENIED":
        case "CANCELLED":
        case "CANCELED":
        case "EXPIRED":
            return "bg-red-50 text-red-700 border-red-100";
        default:
            return "bg-slate-100 text-slate-600 border-slate-200";
    }
};

const StatusBadge = ({ status }: { status: string }) => (
    <span
        className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold ${getStatusClasses(
            status
        )}`}
    >
        {getStatusLabel(status)}
    </span>
);

interface SummaryCardProps {
    label: string;
    value: string;
    description: string;
    icon: typeof ReceiptText;
    loading: boolean;
}

const SummaryCard = ({
    label,
    value,
    description,
    icon: Icon,
    loading,
}: SummaryCardProps) => (
    <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-500">
                    {label}
                </p>

                {loading ? (
                    <div className="mt-4 h-8 w-24 animate-pulse rounded-lg bg-blue-50" />
                ) : (
                    <h3 className="mt-3 wrap-break-word text-2xl font-extrabold text-slate-900">
                        {value}
                    </h3>
                )}
            </div>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Icon size={21} />
            </div>
        </div>

        <p className="mt-3 text-xs leading-5 text-slate-400">
            {description}
        </p>
    </div>
);

const Transactions = () => {
    const navigate = useNavigate();

    const { providerUser, providerName } =
        useOutletContext<ProviderContext>();

    const contextId =
        providerUser?.id_provider ??
        providerUser?.provider?.id_provider;

    const parsedContextId = Number(contextId);

    const providerId =
        contextId != null &&
            Number.isSafeInteger(parsedContextId) &&
            parsedContextId > 0
            ? parsedContextId
            : getStoredProviderId();

    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const [searchKeyword, setSearchKeyword] = useState("");
    const [selectedFilter, setSelectedFilter] =
        useState<TransactionFilter>("ALL");
    const [sortOption, setSortOption] =
        useState<SortOption>("NEWEST");

    const [page, setPage] = useState(1);
    const [refreshKey, setRefreshKey] = useState(0);

    const [selectedOrderId, setSelectedOrderId] =
        useState<string | null>(null);

    const redirectToLogin = useCallback(() => {
        clearProviderSession();

        navigate("/provider/sign-in", {
            replace: true,
        });
    }, [navigate]);

    useEffect(() => {
        const controller = new AbortController();

        const fetchTransactions = async () => {
            setLoading(true);
            setErrorMessage("");

            const token = getProviderToken();

            if (!token || isTokenExpired(token)) {
                redirectToLogin();
                return;
            }

            if (!providerId) {
                setOrders([]);
                setErrorMessage(
                    "ID provider tidak ditemukan. Silakan login kembali."
                );
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(
                    `${import.meta.env.VITE_API_URI}/order/provider/${providerId}`,
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

                if (controller.signal.aborted) return;

                if (response.status === 401) {
                    redirectToLogin();
                    return;
                }

                const result =
                    (await response.json()) as ApiResponse<Order[]>;

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message ||
                        `Gagal memuat transaksi (${response.status})`
                    );
                }

                if (!Array.isArray(result.data)) {
                    throw new Error(
                        "Format respons transaksi tidak valid."
                    );
                }

                if (controller.signal.aborted) return;

                // Backend wajib membatasi akses sesuai token.
                // Tambahan filter defensif jika ID disertakan.
                const providerOrders = result.data.filter(
                    (order) =>
                        order.id_provider == null ||
                        Number(order.id_provider) === providerId
                );

                setOrders(providerOrders);
                setSelectedOrderId(null);
            } catch (error) {
                if (controller.signal.aborted) return;

                setOrders([]);

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Terjadi kesalahan saat memuat transaksi."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        void fetchTransactions();

        return () => controller.abort();
    }, [providerId, refreshKey, redirectToLogin]);

    const summary = useMemo(() => {
        const successful = orders.filter(isSuccessfulPayment);
        const pending = orders.filter(
            (order) => !isFailedOrder(order) && isPendingOrder(order)
        );

        const paidValue = successful.reduce((total, order) => {
            const amount = Number(order.total);

            return total +
                (Number.isFinite(amount) ? amount : 0);
        }, 0);

        return {
            total: orders.length,
            successful: successful.length,
            pending: pending.length,
            paidValue,
        };
    }, [orders]);

    const filteredOrders = useMemo(() => {
        const keyword = searchKeyword.trim().toLowerCase();

        return orders
            .filter((order) => {
                let matchesStatus = true;

                if (selectedFilter === "APPROVED") {
                    matchesStatus = isSuccessfulPayment(order);
                }

                if (selectedFilter === "PENDING") {
                    matchesStatus =
                        !isFailedOrder(order) &&
                        !isSuccessfulPayment(order) &&
                        isPendingOrder(order);
                }

                if (selectedFilter === "FAILED") {
                    matchesStatus = isFailedOrder(order);
                }

                const content = [
                    order.id_order,
                    order.name_customer,
                    order.email_customer,
                    order.name_service,
                    order.payment_method,
                    order.name_provider,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                return (
                    matchesStatus &&
                    (!keyword || content.includes(keyword))
                );
            })
            .sort((a, b) => {
                if (sortOption === "HIGHEST") {
                    return Number(b.total) - Number(a.total);
                }

                const difference =
                    getTimestamp(getOrderDate(b)) -
                    getTimestamp(getOrderDate(a));

                return sortOption === "NEWEST"
                    ? difference
                    : -difference;
            });
    }, [orders, searchKeyword, selectedFilter, sortOption]);

    // Reset pagination after search/filter changes
    useEffect(() => {
        setPage(1);
    }, [searchKeyword, selectedFilter, sortOption]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredOrders.length / PAGE_SIZE)
    );

    const currentPage = Math.min(page, totalPages);

    const paginatedOrders = filteredOrders.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    const selectedOrder =
        orders.find(
            (order) => order.id_order === selectedOrderId
        ) ?? null;

    const handleRefresh = () => {
        if (loading) return;

        setRefreshKey((value) => value + 1);
    };

    const filters: {
        label: string;
        value: TransactionFilter;
    }[] = [
            { label: "Semua", value: "ALL" },
            { label: "Berhasil", value: "APPROVED" },
            { label: "Menunggu", value: "PENDING" },
            { label: "Gagal / Batal", value: "FAILED" },
        ];

    return (
        <div className="min-h-full bg-[#F8FAFF]">
            <div className="mx-auto max-w-360 space-y-6 p-5 md:p-7 lg:p-8">

                {/* HEADER */}
                <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">
                            Provider Portal
                        </p>

                        <h1 className="mt-2 text-2xl font-extrabold text-slate-900 lg:text-3xl">
                            Transactions
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                            Kelola dan pantau transaksi customer
                            untuk {providerName}.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={loading}
                        className="cursor-pointer flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-50"
                    >
                        <RefreshCw
                            size={18}
                            className={loading ? "animate-spin" : ""}
                        />
                        Refresh Data
                    </button>
                </section>

                {/* SUMMARY */}
                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard
                        label="Total Transactions"
                        value={String(summary.total)}
                        description="Seluruh transaksi provider"
                        icon={ReceiptText}
                        loading={loading}
                    />

                    <SummaryCard
                        label="Successful Payments"
                        value={String(summary.successful)}
                        description="Pembayaran berstatus berhasil"
                        icon={CheckCircle2}
                        loading={loading}
                    />

                    <SummaryCard
                        label="Pending Transactions"
                        value={String(summary.pending)}
                        description="Menunggu pembayaran atau proses"
                        icon={Clock3}
                        loading={loading}
                    />

                    <SummaryCard
                        label="Total Paid Orders"
                        value={formatRupiah(summary.paidValue)}
                        description="Nilai bruto pembayaran berhasil, bukan settlement"
                        icon={Wallet}
                        loading={loading}
                    />
                </section>

                {/* FILTER AND TABLE */}
                <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
                    <div className="border-b border-blue-100 p-5">
                        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                            <div>
                                <h2 className="text-lg font-extrabold text-slate-900">
                                    Daftar Transaksi
                                </h2>
                                <p className="mt-1 text-xs text-slate-500">
                                    Cari dan periksa detail pembayaran customer.
                                </p>
                            </div>

                            <span className="text-xs font-semibold text-blue-600">
                                {loading
                                    ? "Memuat..."
                                    : `${filteredOrders.length} transaksi`}
                            </span>
                        </div>

                        {/* SEARCH */}
                        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                            <div className="relative min-w-0 flex-1">
                                <Search
                                    size={18}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                />

                                <input
                                    type="search"
                                    value={searchKeyword}
                                    onChange={(event) =>
                                        setSearchKeyword(event.target.value)
                                    }
                                    placeholder="Cari order, customer, atau layanan..."
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <div className="relative">
                                <Filter
                                    size={16}
                                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />

                                <select
                                    aria-label="Urutkan transaksi"
                                    value={sortOption}
                                    onChange={(event) =>
                                        setSortOption(
                                            event.target.value as SortOption
                                        )
                                    }
                                    className="cursor-pointer h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-700 outline-none focus:border-blue-400 sm:w-auto"
                                >
                                    <option value="NEWEST">Terbaru</option>
                                    <option value="OLDEST">Terlama</option>
                                    <option value="HIGHEST">Total Terbesar</option>
                                </select>
                            </div>
                        </div>

                        {/* STATUS FILTERS */}
                        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                            {filters.map((filter) => (
                                <button
                                    key={filter.value}
                                    type="button"
                                    onClick={() =>
                                        setSelectedFilter(filter.value)
                                    }
                                    aria-pressed={
                                        selectedFilter === filter.value
                                    }
                                    className={`cursor-pointer shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${selectedFilter === filter.value
                                        ? "border-blue-600 bg-blue-600 text-white"
                                        : "border-slate-200 bg-white text-slate-500 hover:border-blue-300"
                                        }`}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ERROR */}
                    {!loading && errorMessage && (
                        <div
                            role="alert"
                            className="m-5 rounded-xl border border-red-200 bg-red-50 p-5 text-center"
                        >
                            <AlertCircle
                                size={30}
                                className="mx-auto text-red-500"
                            />

                            <p className="mt-3 text-sm text-red-700">
                                {errorMessage}
                            </p>

                            <button
                                type="button"
                                onClick={handleRefresh}
                                className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
                            >
                                Coba Lagi
                            </button>
                        </div>
                    )}

                    {/* LOADING */}
                    {loading && (
                        <div className="flex items-center justify-center gap-3 py-20 text-sm text-slate-500">
                            <Loader2
                                size={25}
                                className="animate-spin text-blue-600"
                            />
                            Memuat transaksi...
                        </div>
                    )}

                    {/* EMPTY */}
                    {!loading &&
                        !errorMessage &&
                        filteredOrders.length === 0 && (
                            <div className="px-5 py-20 text-center">
                                <Package
                                    size={42}
                                    className="mx-auto text-blue-200"
                                />
                                <h3 className="mt-4 font-bold text-slate-800">
                                    {orders.length === 0
                                        ? "Belum Ada Transaksi"
                                        : "Transaksi Tidak Ditemukan"}
                                </h3>

                                <p className="mt-2 text-sm text-slate-500">
                                    {orders.length === 0
                                        ? "Belum ada order customer untuk provider ini."
                                        : "Coba ubah pencarian atau filter."}
                                </p>
                            </div>
                        )}

                    {/* TABLE */}
                    {!loading &&
                        !errorMessage &&
                        paginatedOrders.length > 0 && (
                            <>
                                <div className="hidden overflow-x-auto lg:block">
                                    <table className="w-full min-w-225 text-left">
                                        <thead className="bg-blue-50/70">
                                            <tr className="text-xs font-semibold text-slate-500">
                                                <th className="px-5 py-4">
                                                    Order
                                                </th>
                                                <th className="px-4 py-4">
                                                    Customer / Layanan
                                                </th>
                                                <th className="px-4 py-4">
                                                    Total
                                                </th>
                                                <th className="px-4 py-4">
                                                    Pembayaran
                                                </th>
                                                <th className="px-4 py-4">
                                                    Status Order
                                                </th>
                                                <th className="px-4 py-4 text-right">
                                                    Aksi
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody className="divide-y divide-slate-100">
                                            {paginatedOrders.map((order) => (
                                                <tr
                                                    key={order.id_order}
                                                    className="transition hover:bg-blue-50/30"
                                                >
                                                    <td className="px-5 py-4">
                                                        <p
                                                            title={order.id_order}
                                                            className="max-w-37.5 truncate text-xs font-bold text-slate-800"
                                                        >
                                                            {order.id_order}
                                                        </p>
                                                        <p className="mt-1 whitespace-nowrap text-[11px] text-slate-400">
                                                            {formatDate(
                                                                getOrderDate(order)
                                                            )}
                                                        </p>
                                                    </td>

                                                    <td className="px-4 py-4">
                                                        <p className="max-w-42.5 truncate text-sm font-semibold text-slate-800">
                                                            {order.name_customer || "-"}
                                                        </p>
                                                        <p className="mt-1 max-w-42.5 truncate text-xs text-slate-500">
                                                            {order.name_service || "-"}
                                                        </p>
                                                    </td>

                                                    <td className="px-4 py-4">
                                                        <p className="whitespace-nowrap text-sm font-extrabold text-slate-900">
                                                            {formatRupiah(order.total)}
                                                        </p>
                                                    </td>

                                                    <td className="px-4 py-4">
                                                        <p className="mb-2 text-xs text-slate-500">
                                                            {order.payment_method || "-"}
                                                        </p>
                                                        <StatusBadge status={order.payment_status} />
                                                    </td>

                                                    <td className="px-4 py-4">
                                                        <StatusBadge status={order.order_status} />
                                                    </td>

                                                    <td className="px-4 py-4 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setSelectedOrderId(order.id_order)
                                                            }
                                                            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-600 transition hover:bg-blue-50"
                                                        >
                                                            <Eye size={15} />
                                                            Detail
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* MOBILE CARDS */}
                                <div className="space-y-3 p-4 lg:hidden">
                                    {paginatedOrders.map((order) => (
                                        <article
                                            key={order.id_order}
                                            className="rounded-xl border border-slate-200 bg-white p-4"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-bold text-slate-900">
                                                        {order.name_service}
                                                    </p>
                                                    <p className="mt-1 truncate text-xs text-slate-500">
                                                        {order.name_customer}
                                                    </p>
                                                </div>

                                                <StatusBadge status={order.payment_status} />
                                            </div>

                                            <div className="mt-4 flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-xs text-slate-400">
                                                        Total
                                                    </p>
                                                    <p className="mt-1 text-base font-extrabold text-slate-900">
                                                        {formatRupiah(order.total)}
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedOrderId(order.id_order)
                                                    }
                                                    className="flex items-center gap-1 rounded-xl bg-blue-50 px-4 py-2.5 text-xs font-bold text-blue-700"
                                                >
                                                    Detail
                                                    <ChevronRight size={15} />
                                                </button>
                                            </div>

                                            <div className="mt-4 border-t border-slate-100 pt-3">
                                                <p className="truncate text-[11px] text-slate-400">
                                                    {order.id_order}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {formatDate(getOrderDate(order))}
                                                </p>
                                            </div>
                                        </article>
                                    ))}
                                </div>

                                {/* PAGINATION */}
                                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-blue-100 px-5 py-4">
                                    <p className="text-xs text-slate-500">
                                        Menampilkan{" "}
                                        {(currentPage - 1) * PAGE_SIZE + 1}–
                                        {Math.min(
                                            currentPage * PAGE_SIZE,
                                            filteredOrders.length
                                        )}{" "}
                                        dari {filteredOrders.length}
                                    </p>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setPage((p) => Math.max(1, p - 1))
                                            }
                                            disabled={currentPage <= 1}
                                            aria-label="Halaman sebelumnya"
                                            className="rounded-lg border border-slate-200 p-2 text-slate-700 disabled:opacity-40"
                                        >
                                            <ChevronLeft size={17} />
                                        </button>

                                        <span className="text-xs font-semibold text-slate-700">
                                            {currentPage} / {totalPages}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setPage((p) =>
                                                    Math.min(totalPages, p + 1)
                                                )
                                            }
                                            disabled={currentPage >= totalPages}
                                            aria-label="Halaman berikutnya"
                                            className="rounded-lg border border-slate-200 p-2 text-slate-700 disabled:opacity-40"
                                        >
                                            <ChevronRight size={17} />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                </section>
            </div>

            {selectedOrder && (
                <div
                    className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/60 p-4"
                    onClick={() => setSelectedOrderId(null)}
                    role="presentation"
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="transaction-detail-title"
                        onClick={(event) => event.stopPropagation()}
                        className="max-h-[90dvh] w-full max-w-140 overflow-y-auto rounded-3xl bg-white shadow-2xl"
                    >
                        {/* MODAL HEADER */}
                        <div className="flex items-start justify-between gap-3 border-b border-blue-100 bg-blue-50 p-5">
                            <div>
                                <h2
                                    id="transaction-detail-title"
                                    className="text-lg font-extrabold text-slate-900"
                                >
                                    Detail Transaksi
                                </h2>
                                <p className="mt-1 text-xs text-blue-700">
                                    Informasi order customer
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedOrderId(null)}
                                aria-label="Tutup detail"
                                className="cursor-pointer rounded-full bg-white p-2 text-slate-500"
                            >
                                <X size={19} />
                            </button>
                        </div>

                        <div className="space-y-5 p-5">
                            {/* SERVICE */}
                            <div className="flex gap-3 rounded-2xl border border-blue-100 p-4">
                                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-50">
                                    {selectedOrder.image_service ? (
                                        <img
                                            src={selectedOrder.image_service}
                                            alt={selectedOrder.name_service}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <Package
                                            size={26}
                                            className="text-blue-400"
                                        />
                                    )}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-extrabold text-slate-900">
                                        {selectedOrder.name_service}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {selectedOrder.name_provider || providerName}
                                    </p>
                                    <p className="mt-2 font-bold text-blue-600">
                                        {formatRupiah(selectedOrder.total)}
                                    </p>
                                </div>
                            </div>

                            {/* CUSTOMER */}
                            <div>
                                <h3 className="mb-3 text-sm font-extrabold text-slate-900">
                                    Informasi Customer
                                </h3>

                                <div className="space-y-3 rounded-xl bg-slate-50 p-4">
                                    <DetailLine
                                        icon={UserRound}
                                        label="Nama Customer"
                                        value={selectedOrder.name_customer}
                                    />
                                    <DetailLine
                                        icon={Hash}
                                        label="Customer ID"
                                        value={String(selectedOrder.id_customer)}
                                    />
                                    <DetailLine
                                        icon={Building2}
                                        label="Provider"
                                        value={selectedOrder.name_provider || providerName}
                                    />
                                    {selectedOrder.email_customer && (
                                        <DetailLine
                                            icon={UserRound}
                                            label="Email"
                                            value={selectedOrder.email_customer}
                                        />
                                    )}
                                    {selectedOrder.phone_number_customer && (
                                        <DetailLine
                                            icon={UserRound}
                                            label="Telepon"
                                            value={selectedOrder.phone_number_customer}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* TRANSACTION */}
                            <div>
                                <h3 className="mb-3 text-sm font-extrabold text-slate-900">
                                    Informasi Pembayaran
                                </h3>

                                <div className="space-y-3 rounded-xl bg-slate-50 p-4">
                                    <DetailLine
                                        icon={Hash}
                                        label="Order ID"
                                        value={selectedOrder.id_order}
                                    />
                                    <DetailLine
                                        icon={CreditCard}
                                        label="Metode Pembayaran"
                                        value={selectedOrder.payment_method || "-"}
                                    />
                                    <DetailLine
                                        icon={CalendarDays}
                                        label="Jadwal Booking"
                                        value={formatDate(selectedOrder.booking_at)}
                                    />
                                    <DetailLine
                                        icon={Clock3}
                                        label="Dibayar Pada"
                                        value={formatDate(selectedOrder.paid_at)}
                                    />

                                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
                                        <span className="text-xs text-slate-500">
                                            Status Pembayaran
                                        </span>
                                        <StatusBadge status={selectedOrder.payment_status} />
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <span className="text-xs text-slate-500">
                                            Status Order
                                        </span>
                                        <StatusBadge status={selectedOrder.order_status} />
                                    </div>
                                </div>
                            </div>

                            {/* PAYMENT TOTAL */}
                            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                                <div className="flex justify-between gap-3 text-xs text-blue-800">
                                    <span>Subtotal</span>
                                    <span>
                                        {formatRupiah(selectedOrder.sub_total)}
                                    </span>
                                </div>

                                <div className="mt-3 flex items-center justify-between gap-3 border-t border-blue-200 pt-3">
                                    <span className="text-sm font-bold text-blue-900">
                                        Total Pembayaran
                                    </span>
                                    <span className="text-xl font-extrabold text-blue-700">
                                        {formatRupiah(selectedOrder.total)}
                                    </span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedOrderId(null)}
                                className="cursor-pointer w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

interface DetailLineProps {
    icon: typeof UserRound;
    label: string;
    value?: string | null;
}

const DetailLine = ({
    icon: Icon,
    label,
    value,
}: DetailLineProps) => (
    <div className="flex items-start gap-3">
        <Icon
            size={17}
            className="mt-0.5 shrink-0 text-blue-600"
        />

        <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-400">{label}</p>
            <p className="mt-1 break-all text-sm font-semibold text-slate-800">
                {value || "-"}
            </p>
        </div>
    </div>
);

export default Transactions;
