import {
    useEffect,
    useState,
    type ReactNode,
} from "react";

import { useNavigate } from "react-router-dom";

import {
    Activity,
    AlertCircle,
    Building2,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Hospital,
    LoaderCircle,
    PackageCheck,
    RefreshCw,
    ShoppingCart,
    Stethoscope,
    Users,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

interface User {
    id_user: number | string;
    name_user: string;
    email_user: string;
    status_user: string;
    id_user_role: number | string;
}

interface Provider {
    id_provider: number | string;
    name_provider: string;
    status_provider: string;
    email_provider?: string;
    city_provider?: string;
    id_provider_group?: number | null;
}

interface ProviderGroup {
    id_provider_group: number | string;
    name_provider_group: string;
}

interface Service {
    id_service: number | string;
    name_service: string;
    status_service: string;
}

interface Customer {
    id_customer: number | string;
    name_customer: string;
    status_customer?: string;
}

interface Order {
    id_order: number | string;
    order_status?: string;
    payment_status?: string;
    booking_at?: string | null;
    paid_at?: string | null;
    created_at?: string | null;
    createdAt?: string | null;
    total?: number | string | null;
    total_amount?: number | string | null;
    total_price?: number | string | null;
}

interface DashboardData {
    providerGroups: ProviderGroup[];
    providers: Provider[];
    services: Service[];
    customers: Customer[];
    orders: Order[];
}

type DataKey = keyof DashboardData;

type DashboardErrors = Partial<
    Record<DataKey, string>
>;

interface StatCardProps {
    title: string;
    value: number | null;
    description: string;
    icon: LucideIcon;
    loading: boolean;
    error?: string;
}

const ENDPOINTS: Record<DataKey, string> = {
    providerGroups: "/provider-group/get-all",
    providers: "/provider/get-all",
    services: "/service/get-all",
    customers: "/customer/get-all",
    orders: "/order/get-all",
};

const RESPONSE_KEYS: Record<DataKey, string[]> = {
    providerGroups: [
        "providerGroups",
        "provider_groups",
        "groups",
    ],

    providers: [
        "providers",
    ],

    services: [
        "services",
    ],

    customers: [
        "customers",
    ],

    orders: [
        "orders",
    ],
};

const createEmptyData = (): DashboardData => ({
    providerGroups: [],
    providers: [],
    services: [],
    customers: [],
    orders: [],
});

const getUserToken = (): string | null => {
    return (
        sessionStorage.getItem("admin_token") ??
        localStorage.getItem("admin_token")
    );
};

const getCurrentUser = (): User | null => {
    try {
        const stored =
            sessionStorage.getItem("admin_user") ??
            localStorage.getItem("admin_user");

        if (!stored) {
            return null;
        }

        return JSON.parse(stored) as User;
    } catch {
        return null;
    }
};

const clearUserSession = (): void => {
    const keys = [
        "admin_token",
        "admin_user",
        "admin_role",
    ];

    keys.forEach((key) => {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
    });
};

const normalizeStatus = (
    status: unknown
): string => {
    return String(status ?? "")
        .trim()
        .toUpperCase();
};

const formatNumber = (
    value: number | null
): string => {
    if (value === null) return "—";

    return value.toLocaleString("id-ID");
};

const formatDate = (
    value?: string | null
): string => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta",
    }).format(date);
};

const formatCurrency = (
    value?: number | string | null
): string | null => {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const amount = Number(value);

    if (!Number.isFinite(amount)) {
        return null;
    }

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(amount);
};

const getErrorMessage = (
    error: unknown
): string => {
    if (error instanceof Error) {
        return error.message;
    }

    return "Terjadi kesalahan saat mengambil data.";
};

const extractCollection = <T,>(
    payload: unknown,
    key: DataKey
): T[] => {
    if (Array.isArray(payload)) {
        return payload as T[];
    }

    if (
        !payload ||
        typeof payload !== "object" ||
        Array.isArray(payload)
    ) {
        throw new Error(
            `Format response ${key} tidak valid.`
        );
    }

    const response = payload as Record<
        string,
        unknown
    >;

    if (response.success === false) {
        throw new Error(
            typeof response.message === "string"
                ? response.message
                : `Gagal mengambil data ${key}.`
        );
    }

    const possibleKeys = [
        ...RESPONSE_KEYS[key],
        "data",
        "items",
        "rows",
        "results",
    ];

    for (const field of possibleKeys) {
        const value = response[field];

        // Example:
        // { providers: [...] }
        if (Array.isArray(value)) {
            return value as T[];
        }

        // Example:
        // { data: { providers: [...] } }
        if (
            value &&
            typeof value === "object" &&
            !Array.isArray(value)
        ) {
            try {
                return extractCollection<T>(value, key);
            } catch {
                // Coba kemungkinan key berikutnya.
            }
        }
    }

    throw new Error(
        `Array data ${key} tidak ditemukan dalam response API.`
    );
};

const fetchCollection = async <T,>(
    key: DataKey,
    token: string,
    signal: AbortSignal
): Promise<T[]> => {
    const endpoint = ENDPOINTS[key];

    const response = await fetch(
        `${import.meta.env.VITE_API_URI}${endpoint}`,
        {
            method: "GET",
            signal,
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
            },
        }
    );

    if (response.status === 401) {
        throw new Error("UNAUTHORIZED");
    }

    if (response.status === 403) {
        throw new Error(
            "Akun Anda tidak memiliki izin mengakses data ini."
        );
    }

    if (!response.ok) {
        throw new Error(
            `Gagal memuat data (HTTP ${response.status}).`
        );
    }

    const payload: unknown = await response.json();

    return extractCollection<T>(payload, key);
};

const StatusBadge = ({
    status,
}: {
    status?: string;
}) => {
    const normalized = normalizeStatus(status);

    const isSuccess = [
        "APPROVED",
        "ACTIVE",
        "SUCCESS",
        "PAID",
        "COMPLETED",
    ].includes(normalized);

    const isPending = [
        "PENDING",
        "WAITING",
        "SUBMITTED",
        "PENDING_APPROVAL",
    ].includes(normalized);

    const isFailed = [
        "REJECTED",
        "FAILED",
        "CANCELLED",
        "EXPIRED",
    ].includes(normalized);

    const color = isSuccess
        ? "bg-green-50 text-green-700"
        : isPending
            ? "bg-amber-50 text-amber-700"
            : isFailed
                ? "bg-red-50 text-red-700"
                : "bg-gray-100 text-gray-600";

    return (
        <span
            className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${color}`}
        >
            {normalized || "UNKNOWN"}
        </span>
    );
};

const StatCard = ({
    title,
    value,
    description,
    icon: Icon,
    loading,
    error,
}: StatCardProps) => {
    return (
        <div className="rounded-2xl border border-[#DBE4F0] bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
                <p className="text-xs font-semibold text-[#344F77]">
                    {title}
                </p>

                <div className="rounded-lg bg-[#EFF6FF] p-2 text-[#0866D8]">
                    <Icon size={19} />
                </div>
            </div>

            <h2 className="text-[30px] font-bold leading-none tracking-tight text-gray-950">
                {loading ? "—" : formatNumber(value)}
            </h2>

            <p
                className={`mt-3 text-xs ${error ? "text-red-500" : "text-[#526789]"
                    }`}
            >
                {loading
                    ? "Memuat data..."
                    : error || description}
            </p>
        </div>
    );
};

interface MetricProps {
    title: string;
    value: number | null;
    icon: LucideIcon;
    iconColor: string;
    iconBackground: string;
    loading: boolean;
    error?: string;
}

const MetricCard = ({
    title,
    value,
    icon: Icon,
    iconColor,
    iconBackground,
    loading,
    error,
}: MetricProps) => {
    return (
        <div className="flex items-center gap-4 rounded-xl border border-[#DBE4F0] bg-white p-4 shadow-sm">
            <div
                className={`rounded-xl p-3 ${iconColor} ${iconBackground}`}
            >
                <Icon size={22} />
            </div>

            <div className="min-w-0 flex-1">
                <p className="text-xs text-[#526789]">
                    {title}
                </p>

                <p className="mt-1 text-xl font-bold text-gray-950">
                    {loading ? "—" : formatNumber(value)}
                </p>

                {error && !loading && (
                    <p className="mt-1 text-xs text-red-500">
                        {error}
                    </p>
                )}
            </div>
        </div>
    );
};

const LoadingPanel = () => (
    <div className="flex min-h-60 items-center justify-center gap-3 text-sm text-[#526789]">
        <LoaderCircle
            size={20}
            className="animate-spin text-[#0866D8]"
        />
        Memuat data...
    </div>
);

const ErrorPanel = ({
    message,
}: {
    message: string;
}) => (
    <div
        role="alert"
        className="flex min-h-60 flex-col items-center justify-center gap-3 px-6 text-center"
    >
        <AlertCircle
            size={28}
            className="text-red-500"
        />

        <p className="text-sm text-red-600">
            {message}
        </p>
    </div>
);

const EmptyPanel = ({
    message,
}: {
    message: string;
}) => (
    <div className="flex min-h-60 items-center justify-center px-6 text-center">
        <p className="text-sm text-[#526789]">
            {message}
        </p>
    </div>
);

interface PanelProps {
    title: string;
    description: string;
    icon: LucideIcon;
    children: ReactNode;
}

const ContentPanel = ({
    title,
    description,
    icon: Icon,
    children,
}: PanelProps) => {
    return (
        <section className="overflow-hidden rounded-2xl border border-[#DBE4F0] bg-white shadow-sm">
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
                <div>
                    <h2 className="text-sm font-bold text-gray-950">
                        {title}
                    </h2>

                    <p className="mt-1 text-xs text-[#526789]">
                        {description}
                    </p>
                </div>

                <div className="rounded-lg bg-blue-50 p-2 text-[#0866D8]">
                    <Icon size={18} />
                </div>
            </div>

            {children}
        </section>
    );
};

const Home = () => {
    const navigate = useNavigate();

    const [user] = useState<User | null>(
        getCurrentUser
    );

    const [data, setData] = useState<DashboardData>(
        createEmptyData
    );

    const [errors, setErrors] =
        useState<DashboardErrors>({});

    const [loading, setLoading] = useState(true);

    const [refreshKey, setRefreshKey] = useState(0);

    const [lastUpdated, setLastUpdated] =
        useState<Date | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        const token = getUserToken();

        if (!token) {
            clearUserSession();

            navigate("/user/sign-in", {
                replace: true,
            });

            return () => controller.abort();
        }

        const loadData = async () => {
            setLoading(true);
            setErrors({});

            const keys: DataKey[] = [
                "providerGroups",
                "providers",
                "services",
                "customers",
                "orders",
            ];

            // Gunakan Promise.allSettled supaya apabila
            // satu API gagal, API lainnya tetap tampil.

            const results = await Promise.allSettled([
                fetchCollection<ProviderGroup>(
                    "providerGroups",
                    token,
                    controller.signal
                ),

                fetchCollection<Provider>(
                    "providers",
                    token,
                    controller.signal
                ),

                fetchCollection<Service>(
                    "services",
                    token,
                    controller.signal
                ),

                fetchCollection<Customer>(
                    "customers",
                    token,
                    controller.signal
                ),

                fetchCollection<Order>(
                    "orders",
                    token,
                    controller.signal
                ),
            ]);

            if (controller.signal.aborted) {
                return;
            }

            // Apabila backend menolak token dengan 401,
            // pengguna diarahkan ke halaman Sign In.
            const unauthorized = results.some(
                (result) =>
                    result.status === "rejected" &&
                    result.reason instanceof Error &&
                    result.reason.message === "UNAUTHORIZED"
            );

            if (unauthorized) {
                clearUserSession();

                navigate("/user/sign-in", {
                    replace: true,
                });

                return;
            }

            const nextData = createEmptyData();
            const nextErrors: DashboardErrors = {};

            results.forEach((result, index) => {
                const key = keys[index];

                if (result.status === "fulfilled") {
                    switch (key) {
                        case "providerGroups":
                            nextData.providerGroups =
                                result.value as ProviderGroup[];
                            break;

                        case "providers":
                            nextData.providers =
                                result.value as Provider[];
                            break;

                        case "services":
                            nextData.services =
                                result.value as Service[];
                            break;

                        case "customers":
                            nextData.customers =
                                result.value as Customer[];
                            break;

                        case "orders":
                            nextData.orders =
                                result.value as Order[];
                            break;
                    }
                } else {
                    nextErrors[key] = getErrorMessage(
                        result.reason
                    );
                }
            });

            setData(nextData);
            setErrors(nextErrors);
            setLastUpdated(new Date());
            setLoading(false);
        };

        void loadData();

        return () => {
            controller.abort();
        };
    }, [navigate, refreshKey]);

    const firstName =
        user?.name_user?.trim().split(/\s+/)[0] ||
        "User";

    const totalProviders = data.providers.length;

    const totalCustomers = data.customers.length;

    const PENDING_STATUSES = [
        "PENDING",
        "WAITING",
        "SUBMITTED",
        "PENDING_APPROVAL",
    ];

    const pendingProviders = data.providers.filter(
        (provider) =>
            PENDING_STATUSES.includes(
                normalizeStatus(provider.status_provider)
            )
    );

    const activeServices = data.services.filter(
        (service) =>
            normalizeStatus(service.status_service) === "ACTIVE"
    ).length;

    const getOrderTimestamp = (
        order: Order
    ): number | null => {
        const dateValue =
            order.created_at ??
            order.createdAt ??
            order.booking_at ??
            order.paid_at;

        if (!dateValue) {
            return null;
        }

        const timestamp = Date.parse(dateValue);

        return Number.isFinite(timestamp)
            ? timestamp
            : null;
    };

    const ordersWithDate = data.orders.filter(
        (order) => getOrderTimestamp(order) !== null
    );

    const recentOrders = [...ordersWithDate]
        .sort(
            (a, b) =>
                (getOrderTimestamp(b) ?? 0) -
                (getOrderTimestamp(a) ?? 0)
        )
        .slice(0, 5);

    const stats: StatCardProps[] = [
        {
            title: "Provider Group",
            value: errors.providerGroups
                ? null
                : data.providerGroups.length,
            description: "Total grup provider",
            icon: Building2,
            loading,
            error: errors.providerGroups,
        },

        {
            title: "Total Provider",
            value: errors.providers
                ? null
                : totalProviders,
            description: "Seluruh provider terdaftar",
            icon: Hospital,
            loading,
            error: errors.providers,
        },

        {
            title: "Layanan Aktif",
            value: errors.services
                ? null
                : activeServices,
            description: "Layanan dengan status ACTIVE",
            icon: Stethoscope,
            loading,
            error: errors.services,
        },

        {
            title: "Total Pasien",
            value: errors.customers
                ? null
                : totalCustomers,
            description: "Seluruh customer terdaftar",
            icon: Users,
            loading,
            error: errors.customers,
        },
    ];

    return (
        <div className="min-h-full p-4 sm:p-6 lg:p-8">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="mb-1 text-xs font-medium text-[#344F77]">
                        Beranda
                    </p>

                    <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-[28px]">
                        Halo, {firstName}
                    </h1>

                    <p className="mt-2 text-sm text-[#526789]">
                        Ringkasan operasional STIQR Hub Health.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() =>
                        setRefreshKey((prev) => prev + 1)
                    }
                    disabled={loading}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#DBE4F0] bg-white px-4 py-2.5 text-sm font-semibold text-[#00357A] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <RefreshCw
                        size={16}
                        className={loading ? "animate-spin" : ""}
                    />

                    Refresh Data
                </button>
            </div>

            <div className="mb-5 flex items-center gap-2 text-xs text-[#526789]">
                {loading ? (
                    <>
                        <LoaderCircle
                            size={15}
                            className="animate-spin text-[#0866D8]"
                        />

                        Mengambil data dari server...
                    </>
                ) : (
                    <>
                        <Clock3 size={15} />

                        {lastUpdated
                            ? `Terakhir diperbarui: ${lastUpdated.toLocaleTimeString(
                                "id-ID",
                                {
                                    timeZone: "Asia/Jakarta",
                                }
                            )} WIB`
                            : "Data belum dimuat."}
                    </>
                )}
            </div>

            <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                    <StatCard
                        key={stat.title}
                        {...stat}
                    />
                ))}
            </div>

            <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                <MetricCard
                    title="Total Pesanan"
                    value={
                        errors.orders
                            ? null
                            : data.orders.length
                    }
                    icon={ShoppingCart}
                    iconColor="text-[#0866D8]"
                    iconBackground="bg-blue-50"
                    loading={loading}
                    error={errors.orders}
                />

                <MetricCard
                    title="Provider Menunggu Persetujuan"
                    value={
                        errors.providers
                            ? null
                            : pendingProviders.length
                    }
                    icon={Clock3}
                    iconColor="text-amber-600"
                    iconBackground="bg-amber-50"
                    loading={loading}
                    error={errors.providers}
                />

                <MetricCard
                    title="Total Katalog Layanan"
                    value={
                        errors.services
                            ? null
                            : data.services.length
                    }
                    icon={CheckCircle2}
                    iconColor="text-green-600"
                    iconBackground="bg-green-50"
                    loading={loading}
                    error={errors.services}
                />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <ContentPanel
                    title="Persetujuan Provider"
                    description="Provider yang menunggu proses persetujuan"
                    icon={Hospital}
                >
                    {loading ? (
                        <LoadingPanel />
                    ) : errors.providers ? (
                        <ErrorPanel
                            message={errors.providers}
                        />
                    ) : pendingProviders.length === 0 ? (
                        <EmptyPanel
                            message="Tidak ada provider yang menunggu persetujuan."
                        />
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {pendingProviders
                                .slice(0, 5)
                                .map((provider) => (
                                    <div
                                        key={provider.id_provider}
                                        className="flex items-center gap-3 px-5 py-4"
                                    >
                                        <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                                            <Hospital size={18} />
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-gray-800">
                                                {provider.name_provider}
                                            </p>

                                            <p className="mt-1 text-xs text-gray-500">
                                                Provider ID: {provider.id_provider}
                                            </p>
                                        </div>

                                        <StatusBadge
                                            status={provider.status_provider}
                                        />
                                    </div>
                                ))}

                            {pendingProviders.length > 5 && (
                                <p className="px-5 py-3 text-xs text-[#526789]">
                                    Menampilkan 5 dari {pendingProviders.length} pengajuan.
                                </p>
                            )}
                        </div>
                    )}
                </ContentPanel>

                <ContentPanel
                    title="Pesanan Terbaru"
                    description="Lima pesanan terbaru berdasarkan tanggal yang tersedia"
                    icon={Activity}
                >
                    {loading ? (
                        <LoadingPanel />
                    ) : errors.orders ? (
                        <ErrorPanel
                            message={errors.orders}
                        />
                    ) : data.orders.length === 0 ? (
                        <EmptyPanel
                            message="Belum ada pesanan yang tersedia."
                        />
                    ) : recentOrders.length === 0 ? (
                        <EmptyPanel
                            message="Data pesanan tersedia, tetapi tidak memiliki tanggal yang dapat digunakan untuk menentukan urutan terbaru."
                        />
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {recentOrders.map((order) => {
                                const amount =
                                    order.total ??
                                    order.total_amount ??
                                    order.total_price;

                                const formattedAmount =
                                    formatCurrency(amount);

                                const date =
                                    order.created_at ??
                                    order.createdAt ??
                                    order.booking_at ??
                                    order.paid_at;

                                return (
                                    <div
                                        key={order.id_order}
                                        className="flex items-center gap-3 px-5 py-4"
                                    >
                                        <div className="rounded-lg bg-blue-50 p-2 text-[#0866D8]">
                                            <PackageCheck size={18} />
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <p
                                                className="truncate text-sm font-semibold text-gray-800"
                                                title={String(order.id_order)}
                                            >
                                                {order.id_order}
                                            </p>

                                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                                <CalendarDays size={12} />

                                                {formatDate(date)}
                                            </div>

                                            {formattedAmount && (
                                                <p className="mt-1 text-xs font-semibold text-[#00357A]">
                                                    {formattedAmount}
                                                </p>
                                            )}
                                        </div>

                                        <StatusBadge
                                            status={
                                                order.order_status ??
                                                order.payment_status
                                            }
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ContentPanel>
            </div>
        </div>
    );
};

export default Home;
