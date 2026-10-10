
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    CalendarDays,
    CheckCircle2,
    Clock3,
    CreditCard,
    History as HistoryIcon,
    Search,
    ChevronRight,
    AlertCircle,
    Loader2,
    RefreshCw,
    Package,
} from "lucide-react";

import { isTokenExpired } from "../../utils/auth";

interface Order {
    id_order: string;

    sub_total: string | number;
    total: string | number;

    payment_method: string | null;
    payment_status: string;
    order_status: string;

    paid_at: string | null;
    booking_at: string | null;

    dana_payment_id?: string | null;
    payment_expired_at?: string | null;
    payment_updated_at?: string | null;

    id_service: number;
    name_service: string;
    price_service: string | number;
    image_service: string | null;

    id_provider: number;
    name_provider: string;

    created_at?: string | null;
    updated_at?: string | null;
}

interface OrderResponse {
    success: boolean;
    data: Order[];
    message?: string;
}

interface CustomerData {
    id_customer?: number | string;
    customer?: {
        id_customer?: number | string;
    };
    data?: {
        id_customer?: number | string;
    };
}

type FilterStatus =
    | "ALL"
    | "PENDING"
    | "APPROVED"
    | "CANCELLED";

const formatRupiah = (
    value: string | number
): string => {
    const amount = Number(value);

    if (!Number.isFinite(amount)) return "Rp0";

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(amount);
};

const formatDate = (
    value?: string | null,
    includeTime = false
): string => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        ...(includeTime
            ? {
                hour: "2-digit" as const,
                minute: "2-digit" as const,
                hourCycle: "h23" as const,
            }
            : {}),
        timeZone: "Asia/Jakarta",
    }).format(date);
};

const getCustomerId = (): number | null => {
    try {
        const stored = localStorage.getItem("customer_data");

        if (!stored) return null;

        const customer = JSON.parse(stored) as CustomerData;

        const rawId =
            customer.id_customer ??
            customer.customer?.id_customer ??
            customer.data?.id_customer;

        const id = Number(rawId);

        return Number.isSafeInteger(id) && id > 0
            ? id
            : null;
    } catch {
        return null;
    }
};

const getStatusLabel = (status: string): string => {
    switch (status?.toUpperCase()) {
        case "APPROVED":
            return "Berhasil";

        case "PENDING":
            return "Menunggu";

        case "PAID":
            return "Dibayar";

        case "CANCELLED":
        case "CANCELED":
            return "Dibatalkan";

        case "FAILED":
        case "REJECTED":
        case "DENIED":
            return "Gagal";

        case "EXPIRED":
            return "Kedaluwarsa";

        default:
            return status || "-";
    }
};

const getStatusClass = (status: string): string => {
    switch (status?.toUpperCase()) {
        case "APPROVED":
        case "PAID":
            return "bg-emerald-50 text-emerald-700";

        case "PENDING":
            return "bg-amber-50 text-amber-700";

        case "CANCELLED":
        case "CANCELED":
        case "FAILED":
        case "REJECTED":
        case "DENIED":
        case "EXPIRED":
            return "bg-red-50 text-red-600";

        default:
            return "bg-slate-100 text-slate-600";
    }
};

const getOrderDate = (order: Order): string | null => {
    return (
        order.created_at ||
        order.booking_at ||
        order.paid_at ||
        null
    );
};

const getOrderSortTime = (order: Order): number => {
    const date = getOrderDate(order);

    if (!date) return 0;

    const timestamp = new Date(date).getTime();

    return Number.isFinite(timestamp) ? timestamp : 0;
};

const History = () => {
    const navigate = useNavigate();

    const [orders, setOrders] = useState<Order[]>([]);

    const [loading, setLoading] = useState(true);

    const [errorMessage, setErrorMessage] = useState("");

    const [searchKeyword, setSearchKeyword] = useState("");

    const [selectedFilter, setSelectedFilter] =
        useState<FilterStatus>("ALL");

    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const controller = new AbortController();

        const fetchOrders = async () => {
            setLoading(true);
            setErrorMessage("");

            const token =
                sessionStorage.getItem("customer_token");

            if (!token || isTokenExpired(token)) {
                sessionStorage.removeItem("customer_token");
                localStorage.removeItem("customer_data");

                navigate(
                    "/customer/sign-in?redirect=%2Fcustomer%2Fhistory",
                    { replace: true }
                );

                return;
            }

            const customerId = getCustomerId();

            if (!customerId) {
                setErrorMessage(
                    "ID customer tidak ditemukan. Silakan login kembali."
                );

                setLoading(false);
                return;
            }

            try {
                const response = await fetch(
                    `${import.meta.env.VITE_API_URI}/order/customer/${customerId}`,
                    {
                        method: "GET",
                        headers: {
                            Accept: "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        signal: controller.signal,
                    }
                );

                if (response.status === 401) {
                    sessionStorage.removeItem(
                        "customer_token"
                    );
                    localStorage.removeItem(
                        "customer_data"
                    );

                    navigate(
                        "/customer/sign-in?redirect=%2Fcustomer%2Fhistory",
                        { replace: true }
                    );

                    return;
                }

                const result =
                    (await response.json()) as OrderResponse;

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message ||
                        `Gagal mengambil riwayat (${response.status})`
                    );
                }

                if (!Array.isArray(result.data)) {
                    throw new Error(
                        "Format response order tidak valid."
                    );
                }

                if (controller.signal.aborted) return;

                setOrders(result.data);
            } catch (error) {
                if (controller.signal.aborted) return;

                console.error(
                    "[CUSTOMER ORDER HISTORY ERROR]",
                    error
                );

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Gagal mengambil riwayat pesanan."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        void fetchOrders();

        return () => controller.abort();
    }, [navigate, refreshKey]);

    const filters: {
        label: string;
        value: FilterStatus;
    }[] = [
            { label: "Semua", value: "ALL" },
            { label: "Menunggu", value: "PENDING" },
            { label: "Berhasil", value: "APPROVED" },
            { label: "Dibatalkan", value: "CANCELLED" },
        ];

    const filteredOrders = useMemo(() => {
        const keyword = searchKeyword.trim().toLowerCase();

        return orders
            .filter((order) => {
                const paymentStatus =
                    (order.payment_status || "").toUpperCase();

                const orderStatus =
                    (order.order_status || "").toUpperCase();

                let matchesStatus = true;

                if (selectedFilter === "PENDING") {
                    matchesStatus =
                        paymentStatus === "PENDING" ||
                        orderStatus === "PENDING";
                }

                if (selectedFilter === "APPROVED") {
                    matchesStatus =
                        paymentStatus === "APPROVED" &&
                        orderStatus === "APPROVED";
                }

                if (selectedFilter === "CANCELLED") {
                    matchesStatus = [
                        "CANCELLED",
                        "CANCELED",
                        "FAILED",
                        "REJECTED",
                        "DENIED",
                        "EXPIRED",
                    ].some(
                        (status) =>
                            paymentStatus === status ||
                            orderStatus === status
                    );
                }

                const searchContent = [
                    order.id_order,
                    order.name_service,
                    order.name_provider,
                    order.payment_method,
                ]
                    .join(" ")
                    .toLowerCase();

                const matchesSearch =
                    !keyword || searchContent.includes(keyword);

                return matchesStatus && matchesSearch;
            })
            .sort(
                (a, b) =>
                    getOrderSortTime(b) -
                    getOrderSortTime(a)
            );
    }, [orders, searchKeyword, selectedFilter]);

    const handleRefresh = () => {
        setRefreshKey((previous) => previous + 1);
    };

    return (
        <div className="min-h-[60vh] bg-slate-50 pb-8">
            <section className="bg-linear-to-br from-cyan-50 via-sky-50 to-blue-50 px-5 pb-6 pt-6">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                            STIQR Health
                        </p>

                        <h2 className="mt-2 text-xl font-extrabold text-slate-900">
                            Riwayat Pesanan
                        </h2>

                        <p className="mt-2 text-xs leading-5 text-slate-500">
                            Pantau pesanan dan status pembayaran
                            layanan kesehatan Anda.
                        </p>
                    </div>

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                        <HistoryIcon size={25} />
                    </div>
                </div>

                {/* TOTAL ORDERS */}
                <div className="mt-5 flex items-center justify-between rounded-2xl border border-blue-100 bg-white/90 p-4">
                    <div>
                        <p className="text-xs text-slate-500">
                            Total Pesanan
                        </p>

                        <p className="mt-1 text-2xl font-extrabold text-slate-900">
                            {loading ? "..." : orders.length}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={loading}
                        aria-label="Refresh riwayat"
                        className="cursor-pointer flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition hover:bg-blue-100 disabled:opacity-50"
                    >
                        <RefreshCw
                            size={18}
                            className={
                                loading ? "animate-spin" : ""
                            }
                        />
                    </button>
                </div>
            </section>

            <section className="bg-white px-5 py-5">
                {/* SEARCH */}
                <div className="relative">
                    <Search
                        size={19}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                        type="text"
                        value={searchKeyword}
                        onChange={(event) =>
                            setSearchKeyword(event.target.value)
                        }
                        placeholder="Cari layanan atau nomor order..."
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                </div>

                {/* FILTER TABS */}
                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                    {filters.map((filter) => {
                        const active =
                            selectedFilter === filter.value;

                        return (
                            <button
                                key={filter.value}
                                type="button"
                                onClick={() =>
                                    setSelectedFilter(filter.value)
                                }
                                aria-pressed={active}
                                className={`cursor-pointer shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${active
                                    ? "border-blue-600 bg-blue-600 text-white"
                                    : "border-slate-200 bg-white text-slate-500 hover:border-blue-300"
                                    }`}
                            >
                                {filter.label}
                            </button>
                        );
                    })}
                </div>
            </section>

            <section className="px-5 py-5">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-base font-extrabold text-slate-900">
                        Daftar Pesanan
                    </h3>

                    {!loading && (
                        <span className="text-xs font-semibold text-blue-600">
                            {filteredOrders.length} pesanan
                        </span>
                    )}
                </div>

                {/* LOADING */}
                {loading && (
                    <div className="flex flex-col items-center justify-center gap-3 py-20">
                        <Loader2
                            size={32}
                            className="animate-spin text-blue-600"
                        />

                        <p className="text-sm text-slate-500">
                            Memuat riwayat pesanan...
                        </p>
                    </div>
                )}

                {/* ERROR */}
                {!loading && errorMessage && (
                    <div className="rounded-2xl border border-red-100 bg-white p-6 text-center">
                        <AlertCircle
                            size={36}
                            className="mx-auto text-red-400"
                        />

                        <p className="mt-3 text-sm font-semibold text-slate-800">
                            Gagal memuat riwayat
                        </p>

                        <p className="mt-2 text-xs leading-5 text-slate-500">
                            {errorMessage}
                        </p>

                        <button
                            type="button"
                            onClick={handleRefresh}
                            className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-xs font-bold text-white"
                        >
                            Coba Lagi
                        </button>
                    </div>
                )}

                {/* EMPTY STATE */}
                {!loading &&
                    !errorMessage &&
                    filteredOrders.length === 0 && (
                        <div className="rounded-2xl border border-slate-100 bg-white px-6 py-14 text-center">
                            <Package
                                size={43}
                                className="mx-auto text-slate-300"
                            />

                            <h3 className="mt-4 text-base font-bold text-slate-800">
                                {orders.length === 0
                                    ? "Belum Ada Pesanan"
                                    : "Pesanan Tidak Ditemukan"}
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                {orders.length === 0
                                    ? "Anda belum memiliki riwayat pemesanan layanan kesehatan."
                                    : "Tidak ada pesanan yang sesuai dengan pencarian atau filter."}
                            </p>

                            {orders.length === 0 && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        navigate("/customer/home")
                                    }
                                    className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white"
                                >
                                    Jelajahi Layanan
                                </button>
                            )}
                        </div>
                    )}

                {/* ORDER CARDS */}
                {!loading &&
                    !errorMessage &&
                    filteredOrders.length > 0 && (
                        <div className="space-y-4">
                            {filteredOrders.map((order) => {
                                const isApproved =
                                    order.payment_status ===
                                    "APPROVED" &&
                                    order.order_status ===
                                    "APPROVED";

                                const paymentStatusClass =
                                    getStatusClass(
                                        order.payment_status
                                    );

                                return (
                                    <article
                                        key={order.id_order}
                                        className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
                                    >
                                        {/* ORDER HEADER */}
                                        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                                                    <CalendarDays
                                                        size={15}
                                                        className="text-blue-600"
                                                    />

                                                    {formatDate(
                                                        getOrderDate(order)
                                                    )}
                                                </div>

                                                <p className="mt-1 max-w-55 truncate text-[10px] text-slate-400">
                                                    Order: {order.id_order}
                                                </p>
                                            </div>

                                            <span
                                                className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold ${paymentStatusClass}`}
                                            >
                                                {getStatusLabel(
                                                    order.payment_status
                                                )}
                                            </span>
                                        </div>

                                        {/* SERVICE DETAIL */}
                                        <div className="p-4">
                                            <div className="flex gap-3">
                                                {/* IMAGE */}
                                                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                                                    {order.image_service ? (
                                                        <img
                                                            src={
                                                                order.image_service
                                                            }
                                                            alt={
                                                                order.name_service
                                                            }
                                                            className="h-full w-full object-cover"
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full items-center justify-center text-3xl">
                                                            🏥
                                                        </div>
                                                    )}
                                                </div>

                                                {/* CONTENT */}
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="line-clamp-2 text-sm font-extrabold text-slate-900">
                                                        {order.name_service}
                                                    </h3>

                                                    <p className="mt-1 line-clamp-1 text-xs font-medium text-blue-600">
                                                        {order.name_provider}
                                                    </p>

                                                    <p className="mt-2 text-base font-extrabold text-slate-900">
                                                        {formatRupiah(
                                                            order.total
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* PAYMENT INFORMATION */}
                                            <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-3">
                                                <div className="flex items-center justify-between gap-3">
                                                    <span className="flex items-center gap-2 text-xs text-slate-500">
                                                        <CreditCard
                                                            size={15}
                                                        />
                                                        Metode Pembayaran
                                                    </span>

                                                    <span className="text-xs font-semibold text-slate-800">
                                                        {order.payment_method ||
                                                            "-"}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between gap-3">
                                                    <span className="flex items-center gap-2 text-xs text-slate-500">
                                                        <Package
                                                            size={15}
                                                        />
                                                        Status Pesanan
                                                    </span>

                                                    <span
                                                        className={`rounded-full px-2 py-1 text-[10px] font-bold ${getStatusClass(
                                                            order.order_status
                                                        )}`}
                                                    >
                                                        {getStatusLabel(
                                                            order.order_status
                                                        )}
                                                    </span>
                                                </div>

                                                {order.booking_at && (
                                                    <div className="flex items-start justify-between gap-3">
                                                        <span className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                                                            <Clock3
                                                                size={15}
                                                            />
                                                            Jadwal Booking
                                                        </span>

                                                        <span className="text-right text-xs font-semibold text-slate-800">
                                                            {formatDate(
                                                                order.booking_at,
                                                                true
                                                            )}
                                                        </span>
                                                    </div>
                                                )}

                                                {order.paid_at && (
                                                    <div className="flex items-start justify-between gap-3">
                                                        <span className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                                                            <CheckCircle2
                                                                size={15}
                                                            />
                                                            Dibayar Pada
                                                        </span>

                                                        <span className="text-right text-xs font-semibold text-slate-800">
                                                            {formatDate(
                                                                order.paid_at,
                                                                true
                                                            )}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* ORDER FOOTER */}
                                            <div className="mt-4 flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-[11px] text-slate-400">
                                                        Total Pembayaran
                                                    </p>

                                                    <p className="mt-1 text-lg font-extrabold text-blue-600">
                                                        {formatRupiah(
                                                            order.total
                                                        )}
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        navigate(
                                                            `/customer/service/${order.id_service}`
                                                        )
                                                    }
                                                    className="cursor-pointer flex items-center gap-1 rounded-xl border border-blue-500 px-3 py-2.5 text-xs font-bold text-blue-600 transition hover:bg-blue-50"
                                                >
                                                    Lihat Layanan
                                                    <ChevronRight
                                                        size={15}
                                                    />
                                                </button>
                                            </div>

                                            {/* SUCCESS MESSAGE */}
                                            {isApproved && (
                                                <div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-3">
                                                    <CheckCircle2
                                                        size={17}
                                                        className="shrink-0 text-emerald-600"
                                                    />

                                                    <p className="text-xs leading-5 text-emerald-700">
                                                        Pembayaran berhasil
                                                        dan pesanan telah
                                                        disetujui.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
            </section>
        </div>
    );
};

export default History;
