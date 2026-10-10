
import {
    useEffect,
    useMemo,
    useState,
    type ComponentType,
} from "react";
import {
    useNavigate,
    useOutletContext,
} from "react-router-dom";
import {
    Activity,
    ArrowRight,
    CalendarCheck2,
    CheckCircle2,
    Clock3,
    CreditCard,
    FileCheck2,
    FolderOpen,
    Loader2,
    Package,
    RefreshCw,
    ScanLine,
    TrendingUp,
    Wallet,
    AlertCircle,
} from "lucide-react";

import { isTokenExpired } from "../../utils/auth";

// ==========================================================
// TYPES
// ==========================================================

interface ProviderUser {
    id_provider_user?: number | string;
    id_provider?: number | string;
    name_provider_user?: string;
    name_provider?: string;
}

interface ProviderContext {
    providerUser: ProviderUser | null;
    providerName: string;
    userName: string;
}

interface Order {
    id_order: string;
    id_provider?: number | string;
    id_service?: number;

    name_service?: string;
    name_customer?: string;

    total: string | number;
    sub_total?: string | number;

    payment_status: string;
    order_status: string;

    booking_at?: string | null;
    paid_at?: string | null;
    created_at?: string | null;
    payment_updated_at?: string | null;
}

interface HealthPass {
    id_health_pass: string;
    id_order: string;
    id_provider?: number | string;

    name_service?: string;
    name_customer?: string;

    status_health_pass: string;
    valid_from: string;
    valid_until: string;

    booking_at?: string | null;
    redeemed_at?: string | null;
}

interface Service {
    id_service: number;
    id_provider: number | string;

    name_service: string;
    price_service: string | number;
    status_service: string;
    quota_service?: string | number;
    image_service?: string | null;
}

interface ApiResponse<T> {
    success: boolean;
    data: T[];
    message?: string;
}

interface DashboardData {
    orders: Order[] | null;
    healthPasses: HealthPass[] | null;
    services: Service[] | null;
}

interface ActivityItem {
    id: string;
    title: string;
    description: string;
    date: string;
    type: "ORDER" | "PAYMENT" | "REDEMPTION";
}

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

const formatNumber = (value: number): string =>
    new Intl.NumberFormat("id-ID").format(value);

const formatDate = (
    value?: string | null,
    withTime = false
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

const getJakartaDateKey = (
    value: string | Date
): string => {
    const date =
        value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);

    const getPart = (type: string) =>
        parts.find((part) => part.type === type)?.value ?? "";

    return [
        getPart("year"),
        getPart("month"),
        getPart("day"),
    ].join("-");
};

const toTimestamp = (
    value?: string | null
): number => {
    if (!value) return 0;

    const timestamp = new Date(value).getTime();

    return Number.isFinite(timestamp) ? timestamp : 0;
};

const isApproved = (status?: string) =>
    status?.toUpperCase() === "APPROVED";

const isPending = (status?: string) =>
    status?.toUpperCase() === "PENDING";

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
            data?.provider_user?.id_provider ??
            data?.data?.id_provider ??
            data?.data?.provider_user?.id_provider ??
            data?.provider?.id_provider ??
            data?.provider_user?.provider?.id_provider;

        const id = Number(rawId);

        return Number.isSafeInteger(id) && id > 0
            ? id
            : null;
    } catch {
        return null;
    }
};

const fetchProviderApi = async <T,>(
    endpoint: string,
    token: string,
    signal: AbortSignal
): Promise<T[]> => {
    const response = await fetch(
        `${import.meta.env.VITE_API_URI}${endpoint}`,
        {
            method: "GET",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
            },
            signal,
            cache: "no-store",
        }
    );

    if (response.status === 401) {
        throw new Error("UNAUTHORIZED");
    }

    if (!response.ok) {
        throw new Error(
            `Request gagal (${response.status})`
        );
    }

    const result =
        (await response.json()) as ApiResponse<T>;

    if (!result.success) {
        throw new Error(
            result.message || "Gagal mengambil data."
        );
    }

    if (!Array.isArray(result.data)) {
        throw new Error(
            "Format response API tidak valid."
        );
    }

    return result.data;
};

interface MetricCardProps {
    title: string;
    value: string;
    description: string;
    icon: ComponentType<{
        size?: number;
        className?: string;
    }>;
    variant: "primary" | "sky" | "indigo" | "warning";
    loading: boolean;
}

const MetricCard = ({
    title,
    value,
    description,
    icon: Icon,
    variant,
    loading,
}: MetricCardProps) => {
    const themes = {
        primary: {
            background: "bg-blue-50",
            text: "text-blue-600",
        },
        sky: {
            background: "bg-sky-50",
            text: "text-sky-600",
        },
        indigo: {
            background: "bg-indigo-50",
            text: "text-indigo-600",
        },
        warning: {
            background: "bg-amber-50",
            text: "text-amber-600",
        },
    };

    const theme = themes[variant];

    return (
        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-500">
                        {title}
                    </p>

                    {loading ? (
                        <div className="mt-4 h-9 w-24 animate-pulse rounded-lg bg-blue-50" />
                    ) : (
                        <h3 className="mt-3 wrap-break-word text-3xl font-extrabold tracking-tight text-slate-900">
                            {value}
                        </h3>
                    )}
                </div>

                <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${theme.background} ${theme.text}`}
                >
                    <Icon size={23} />
                </div>
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-400">
                {description}
            </p>
        </div>
    );
};

const Home = () => {
    const navigate = useNavigate();

    const {
        providerUser,
        providerName,
        userName,
    } = useOutletContext<ProviderContext>();

    const contextProviderId = Number(
        providerUser?.id_provider
    );

    const providerId =
        Number.isSafeInteger(contextProviderId) &&
            contextProviderId > 0
            ? contextProviderId
            : getStoredProviderId();

    const [data, setData] = useState<DashboardData>({
        orders: null,
        healthPasses: null,
        services: null,
    });

    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [sectionErrors, setSectionErrors] =
        useState<string[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const controller = new AbortController();

        const fetchDashboardData = async () => {
            setLoading(true);
            setErrorMessage("");
            setSectionErrors([]);

            const token = getProviderToken();

            if (!token || isTokenExpired(token)) {
                clearProviderSession();

                navigate("/provider/sign-in", {
                    replace: true,
                });
                return;
            }

            if (!providerId) {
                setData({
                    orders: null,
                    healthPasses: null,
                    services: null,
                });

                setErrorMessage(
                    "ID provider tidak ditemukan. Silakan login kembali."
                );
                setLoading(false);
                return;
            }

            try {
                const [ordersResult, passesResult, servicesResult] =
                    await Promise.allSettled([
                        fetchProviderApi<Order>(
                            `/order/provider/${providerId}`,
                            token,
                            controller.signal
                        ),
                        fetchProviderApi<HealthPass>(
                            "/health-passes/provider",
                            token,
                            controller.signal
                        ),
                        fetchProviderApi<Service>(
                            `/service/provider/${providerId}`,
                            token,
                            controller.signal
                        ),
                    ]);

                if (controller.signal.aborted) return;

                const results = [
                    ordersResult,
                    passesResult,
                    servicesResult,
                ];

                const unauthorized = results.some(
                    (result) =>
                        result.status === "rejected" &&
                        result.reason instanceof Error &&
                        result.reason.message === "UNAUTHORIZED"
                );

                if (unauthorized) {
                    clearProviderSession();

                    navigate("/provider/sign-in", {
                        replace: true,
                    });
                    return;
                }

                const errors: string[] = [];

                let orders: Order[] | null = null;

                if (ordersResult.status === "fulfilled") {
                    orders = ordersResult.value.filter(
                        (order) =>
                            order.id_provider == null ||
                            Number(order.id_provider) === providerId
                    );
                } else {
                    errors.push(
                        "Transaksi: gagal mengambil data."
                    );
                }

                let healthPasses: HealthPass[] | null = null;

                if (passesResult.status === "fulfilled") {
                    healthPasses = passesResult.value.filter(
                        (pass) =>
                            pass.id_provider == null ||
                            Number(pass.id_provider) === providerId
                    );
                } else {
                    errors.push(
                        "Health Pass: gagal mengambil data."
                    );
                }

                let services: Service[] | null = null;

                if (servicesResult.status === "fulfilled") {
                    services = servicesResult.value.filter(
                        (service) =>
                            Number(service.id_provider) === providerId
                    );
                } else {
                    errors.push(
                        "Layanan: gagal mengambil data."
                    );
                }

                setData({
                    orders,
                    healthPasses,
                    services,
                });

                setSectionErrors(errors);
                setNow(Date.now());
            } catch (error) {
                if (controller.signal.aborted) return;

                console.error(
                    "[PROVIDER DASHBOARD ERROR]",
                    error
                );

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Gagal mengambil dashboard."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        void fetchDashboardData();

        return () => controller.abort();
    }, [navigate, providerId, refreshKey]);

    // Refresh today's indicators periodically
    useEffect(() => {
        const interval = window.setInterval(
            () => setNow(Date.now()),
            60_000
        );

        return () => window.clearInterval(interval);
    }, []);

    const summary = useMemo(() => {
        const orders = data.orders ?? [];
        const passes = data.healthPasses ?? [];
        const services = data.services ?? [];

        const today = getJakartaDateKey(new Date(now));

        const approvedOrders = orders.filter(
            (order) =>
                isApproved(order.payment_status) &&
                isApproved(order.order_status)
        );

        const pendingOrders = orders.filter(
            (order) =>
                isPending(order.payment_status) ||
                isPending(order.order_status)
        );

        const todayPaidOrders = approvedOrders.filter(
            (order) =>
                Boolean(order.paid_at) &&
                getJakartaDateKey(order.paid_at!) === today
        );

        const todayOrderValue = todayPaidOrders.reduce(
            (total, order) => {
                const amount = Number(order.total);

                return (
                    total +
                    (Number.isFinite(amount) ? amount : 0)
                );
            },
            0
        );

        const redeemedPasses = passes.filter(
            (pass) =>
                pass.status_health_pass?.toUpperCase() ===
                "REDEEMED" ||
                Boolean(pass.redeemed_at)
        );

        const todayRedemptions = redeemedPasses.filter(
            (pass) =>
                Boolean(pass.redeemed_at) &&
                getJakartaDateKey(pass.redeemed_at!) === today
        );

        const activePasses = passes.filter((pass) => {
            if (
                pass.status_health_pass?.toUpperCase() !==
                "ACTIVE" ||
                Boolean(pass.redeemed_at)
            ) {
                return false;
            }

            const from = toTimestamp(pass.valid_from);
            const until = toTimestamp(pass.valid_until);

            return (
                from > 0 &&
                until > from &&
                now >= from &&
                now < until
            );
        });

        const activeServices = services.filter(
            (service) =>
                service.status_service?.toUpperCase() ===
                "ACTIVE"
        );

        return {
            pendingOrders: pendingOrders.length,
            todayOrderValue,
            activePasses: activePasses.length,
            completedServices: redeemedPasses.length,
            todayRedemptions: todayRedemptions.length,
            totalServices: services.length,
            activeServices: activeServices.length,
        };
    }, [data, now]);

    const recentActivities = useMemo(() => {
        const activities: ActivityItem[] = [];

        (data.orders ?? []).forEach((order) => {
            if (order.created_at) {
                activities.push({
                    id: `order-${order.id_order}`,
                    title: "Pesanan dibuat",
                    description:
                        order.name_service ||
                        `Order ${order.id_order.slice(0, 8)}`,
                    date: order.created_at,
                    type: "ORDER",
                });
            }

            if (
                isApproved(order.payment_status) &&
                order.paid_at
            ) {
                activities.push({
                    id: `payment-${order.id_order}`,
                    title: "Pembayaran berhasil",
                    description: `${order.name_service || "Layanan"
                        } • ${formatRupiah(order.total)}`,
                    date: order.paid_at,
                    type: "PAYMENT",
                });
            }
        });

        (data.healthPasses ?? []).forEach((pass) => {
            if (!pass.redeemed_at) return;

            activities.push({
                id: `redeem-${pass.id_health_pass}`,
                title: "Health Pass digunakan",
                description:
                    pass.name_service ||
                    `Pass ${pass.id_health_pass.slice(0, 8)}`,
                date: pass.redeemed_at,
                type: "REDEMPTION",
            });
        });

        return activities
            .filter((item) => toTimestamp(item.date) > 0)
            .sort(
                (a, b) =>
                    toTimestamp(b.date) -
                    toTimestamp(a.date)
            )
            .slice(0, 6);
    }, [data.orders, data.healthPasses]);

    const servicePreview = useMemo(() => {
        return [...(data.services ?? [])]
            .sort(
                (a, b) =>
                    Number(b.id_service) -
                    Number(a.id_service)
            )
            .slice(0, 4);
    }, [data.services]);

    const handleRefresh = () => {
        if (loading) return;

        setRefreshKey((previous) => previous + 1);
    };

    return (
        <div className="min-h-full bg-[#F8FAFF]">
            <div className="mx-auto max-w-360 space-y-7 p-5 md:p-7 lg:p-8">
                <section className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">
                            Provider Overview
                        </p>

                        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 lg:text-3xl">
                            Selamat datang, {userName}
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                            {providerName}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                            Ringkasan aktivitas layanan dan transaksi provider.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={handleRefresh}
                            disabled={loading}
                            className="cursor-pointer flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-50"
                        >
                            <RefreshCw
                                size={17}
                                className={
                                    loading ? "animate-spin" : ""
                                }
                            />
                            Refresh
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                navigate(
                                    "/provider/scan-health-pass"
                                )
                            }
                            className="cursor-pointer flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
                        >
                            <ScanLine size={18} />
                            Scan Health Pass
                        </button>
                    </div>
                </section>

                {errorMessage && (
                    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                        <AlertCircle
                            size={20}
                            className="shrink-0 text-red-600"
                        />
                        <p className="text-sm text-red-700">
                            {errorMessage}
                        </p>
                    </div>
                )}

                {sectionErrors.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-center gap-2">
                            <AlertCircle
                                size={19}
                                className="text-amber-600"
                            />
                            <p className="text-sm font-bold text-amber-800">
                                Sebagian data belum berhasil dimuat
                            </p>
                        </div>

                        <div className="mt-2 space-y-1">
                            {sectionErrors.map((error) => (
                                <p
                                    key={error}
                                    className="text-xs text-amber-700"
                                >
                                    {error}
                                </p>
                            ))}
                        </div>
                    </div>
                )}

                <section>
                    <div className="mb-4">
                        <h2 className="text-lg font-extrabold text-slate-900">
                            Ringkasan Operasional
                        </h2>
                        <p className="mt-1 text-xs text-slate-500">
                            Statistik berdasarkan data provider Anda.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <MetricCard
                            title="Today's Redemptions"
                            value={
                                data.healthPasses
                                    ? formatNumber(
                                        summary.todayRedemptions
                                    )
                                    : "—"
                            }
                            description="Health Pass digunakan hari ini"
                            icon={CalendarCheck2}
                            variant="primary"
                            loading={loading}
                        />

                        <MetricCard
                            title="Active Health Passes"
                            value={
                                data.healthPasses
                                    ? formatNumber(
                                        summary.activePasses
                                    )
                                    : "—"
                            }
                            description="Health Pass yang sedang berlaku"
                            icon={FileCheck2}
                            variant="sky"
                            loading={loading}
                        />

                        <MetricCard
                            title="Completed Services"
                            value={
                                data.healthPasses
                                    ? formatNumber(
                                        summary.completedServices
                                    )
                                    : "—"
                            }
                            description="Health Pass yang sudah diredeem"
                            icon={CheckCircle2}
                            variant="indigo"
                            loading={loading}
                        />

                        <MetricCard
                            title="Pending Transactions"
                            value={
                                data.orders
                                    ? formatNumber(
                                        summary.pendingOrders
                                    )
                                    : "—"
                            }
                            description="Pesanan atau pembayaran masih pending"
                            icon={Clock3}
                            variant="warning"
                            loading={loading}
                        />

                        <MetricCard
                            title="Today's Paid Orders"
                            value={
                                data.orders
                                    ? formatRupiah(
                                        summary.todayOrderValue
                                    )
                                    : "—"
                            }
                            description="Nilai bruto pesanan dibayar hari ini"
                            icon={Wallet}
                            variant="primary"
                            loading={loading}
                        />

                        <MetricCard
                            title="Active Services"
                            value={
                                data.services
                                    ? formatNumber(
                                        summary.activeServices
                                    )
                                    : "—"
                            }
                            description={`Dari ${data.services
                                ? summary.totalServices
                                : "—"
                                } layanan terdaftar`}
                            icon={Package}
                            variant="sky"
                            loading={loading}
                        />
                    </div>
                </section>

                <section>
                    <h2 className="mb-4 text-lg font-extrabold text-slate-900">
                        Quick Actions
                    </h2>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <button
                            type="button"
                            onClick={() =>
                                navigate(
                                    "/provider/scan-health-pass"
                                )
                            }
                            className="cursor-pointer flex items-center gap-4 rounded-2xl border border-blue-100 bg-white p-4 text-left transition hover:border-blue-300 hover:shadow-sm"
                        >
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <ScanLine size={23} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-900">
                                    Scan Health Pass
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    Verifikasi tiket customer
                                </p>
                            </div>
                            <ArrowRight
                                size={17}
                                className="text-blue-600"
                            />
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                navigate("/provider/transactions")
                            }
                            className="cursor-pointer flex items-center gap-4 rounded-2xl border border-blue-100 bg-white p-4 text-left transition hover:border-blue-300 hover:shadow-sm"
                        >
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                                <CreditCard size={23} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-900">
                                    Transactions
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    Monitor pembayaran customer
                                </p>
                            </div>
                            <ArrowRight
                                size={17}
                                className="text-blue-600"
                            />
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                navigate("/provider/services")
                            }
                            className="cursor-pointer flex items-center gap-4 rounded-2xl border border-blue-100 bg-white p-4 text-left transition hover:border-blue-300 hover:shadow-sm"
                        >
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                <FolderOpen size={23} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-900">
                                    Services
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    Kelola layanan provider
                                </p>
                            </div>
                            <ArrowRight
                                size={17}
                                className="text-blue-600"
                            />
                        </button>
                    </div>
                </section>

                <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                    {/* RECENT ACTIVITY */}
                    <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm xl:col-span-2">
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-extrabold text-slate-900">
                                    Recent Activity
                                </h2>
                                <p className="mt-1 text-xs text-slate-500">
                                    Aktivitas terbaru transaksi dan layanan
                                </p>
                            </div>

                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <Activity size={20} />
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                                <Loader2
                                    size={19}
                                    className="animate-spin text-blue-600"
                                />
                                Memuat aktivitas...
                            </div>
                        ) : recentActivities.length === 0 ? (
                            <div className="py-12 text-center">
                                <Activity
                                    size={32}
                                    className="mx-auto text-blue-200"
                                />
                                <p className="mt-3 text-sm font-semibold text-slate-700">
                                    Belum ada aktivitas
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                    Aktivitas akan muncul ketika tersedia di API.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {recentActivities.map((activity) => {
                                    const Icon =
                                        activity.type === "ORDER"
                                            ? Package
                                            : activity.type === "PAYMENT"
                                                ? TrendingUp
                                                : CheckCircle2;

                                    return (
                                        <div
                                            key={activity.id}
                                            className="flex items-start gap-3 border-b border-blue-50 py-4 last:border-b-0"
                                        >
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                                <Icon size={19} />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold text-slate-800">
                                                    {activity.title}
                                                </p>
                                                <p className="mt-1 wrap-break-word text-xs text-slate-500">
                                                    {activity.description}
                                                </p>
                                            </div>

                                            <span className="shrink-0 text-right text-[11px] text-slate-400">
                                                {formatDate(
                                                    activity.date,
                                                    true
                                                )}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* SERVICES */}
                    <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-extrabold text-slate-900">
                                    Your Services
                                </h2>
                                <p className="mt-1 text-xs text-slate-500">
                                    Layanan terbaru provider
                                </p>
                            </div>

                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <FolderOpen size={20} />
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <Loader2
                                    size={23}
                                    className="animate-spin text-blue-600"
                                />
                            </div>
                        ) : servicePreview.length === 0 ? (
                            <div className="py-12 text-center">
                                <FolderOpen
                                    size={32}
                                    className="mx-auto text-blue-200"
                                />
                                <p className="mt-3 text-sm text-slate-500">
                                    Belum ada layanan tersedia.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {servicePreview.map((service) => {
                                    const active =
                                        service.status_service?.toUpperCase() ===
                                        "ACTIVE";

                                    return (
                                        <div
                                            key={service.id_service}
                                            className="flex items-center gap-3 rounded-xl border border-blue-100 p-3"
                                        >
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-blue-50">
                                                {service.image_service ? (
                                                    <img
                                                        src={service.image_service}
                                                        alt={service.name_service}
                                                        className="h-full w-full object-cover"
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <Package
                                                        size={22}
                                                        className="text-blue-300"
                                                    />
                                                )}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-bold text-slate-800">
                                                    {service.name_service}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {formatRupiah(
                                                        service.price_service
                                                    )}
                                                </p>
                                            </div>

                                            <span
                                                className={`rounded-full px-2 py-1 text-[10px] font-semibold ${active
                                                    ? "bg-blue-50 text-blue-700"
                                                    : "bg-slate-100 text-slate-500"
                                                    }`}
                                            >
                                                {active
                                                    ? "Active"
                                                    : "Inactive"}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() =>
                                navigate("/provider/services")
                            }
                            className="cursor-pointer mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                        >
                            View All Services
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </section>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-blue-100 pt-5 text-xs text-slate-400">
                    <p>
                        Dashboard provider menggunakan data dari API STIQR Health.
                    </p>

                    <p>
                        Diperbarui:{" "}
                        {new Intl.DateTimeFormat("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Asia/Jakarta",
                        }).format(new Date(now))}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Home;
