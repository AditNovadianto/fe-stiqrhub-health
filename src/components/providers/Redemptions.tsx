
import {
    useCallback,
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
    AlertCircle,
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Eye,
    Loader2,
    Package,
    RefreshCw,
    Search,
    ShieldCheck,
    Ticket,
    UserRound,
    X,
    ScanLine,
    Building2,
    Mail,
    Phone,
    Hash,
} from "lucide-react";

import { isTokenExpired } from "../../utils/auth";

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

interface HealthPass {
    id_health_pass: string;
    status_health_pass: string;

    valid_from: string | null;
    valid_until: string | null;
    booking_at: string | null;

    redeemed_at: string | null;
    redeemed_by: string | number | null;

    id_order: string;
    id_customer: number;
    id_service: number;
    id_provider?: number;

    payment_status: string;
    order_status: string;

    name_customer?: string;
    email_customer?: string;
    phone_number_customer?: string;

    name_service?: string;
    price_service?: string | number;
    image_service?: string | null;
    description_service?: string | null;
    name_provider?: string;
}

interface ApiResponse {
    success: boolean;
    message?: string;
    data: HealthPass[];
}

type StatusFilter =
    | "ALL"
    | "REDEEMED"
    | "ACTIVE"
    | "EXPIRED"
    | "OTHER";

type DateFilter =
    | "ALL"
    | "TODAY"
    | "7_DAYS"
    | "30_DAYS";

type DisplayStatus =
    | "REDEEMED"
    | "ACTIVE"
    | "UPCOMING"
    | "EXPIRED"
    | "OTHER";

const PAGE_SIZE = 10;

const API_BASE_URL = String(
    import.meta.env.VITE_API_URI || ""
).replace(/\/+$/, "");

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
    value?: string | number
): string => {
    if (value == null) return "-";

    const amount = Number(value);

    if (!Number.isFinite(amount)) return "-";

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(amount);
};

const formatNumber = (value: number): string =>
    new Intl.NumberFormat("id-ID").format(value);

const toTimestamp = (
    value?: string | null
): number | null => {
    if (!value) return null;

    const timestamp = new Date(value).getTime();

    return Number.isFinite(timestamp)
        ? timestamp
        : null;
};

const formatDate = (
    value?: string | null,
    withTime = true
): string => {
    const timestamp = toTimestamp(value);

    if (timestamp === null) return "-";

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
    }).format(new Date(timestamp));
};

const getJakartaDay = (timestamp: number): string => {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date(timestamp));

    const part = (type: string) =>
        parts.find((item) => item.type === type)?.value || "";

    return `${part("year")}-${part("month")}-${part("day")}`;
};

const normalizeStatus = (value?: string) =>
    (value || "").toUpperCase().trim();

const getDisplayStatus = (
    pass: HealthPass,
    now: number
): DisplayStatus => {
    const status = normalizeStatus(
        pass.status_health_pass
    );

    if (status === "REDEEMED" || pass.redeemed_at) {
        return "REDEEMED";
    }

    if (status === "EXPIRED") {
        return "EXPIRED";
    }

    if (status !== "ACTIVE") {
        return "OTHER";
    }

    const from = toTimestamp(pass.valid_from);
    const until = toTimestamp(pass.valid_until);

    if (
        from === null ||
        until === null ||
        until <= from
    ) {
        return "OTHER";
    }

    if (now >= until) return "EXPIRED";
    if (now < from) return "UPCOMING";

    return "ACTIVE";
};

const getStatusInfo = (status: DisplayStatus) => {
    switch (status) {
        case "REDEEMED":
            return {
                label: "Sudah Digunakan",
                className:
                    "border-blue-200 bg-blue-50 text-blue-700",
            };

        case "ACTIVE":
            return {
                label: "Aktif",
                className:
                    "border-emerald-200 bg-emerald-50 text-emerald-700",
            };

        case "UPCOMING":
            return {
                label: "Belum Berlaku",
                className:
                    "border-sky-200 bg-sky-50 text-sky-700",
            };

        case "EXPIRED":
            return {
                label: "Kedaluwarsa",
                className:
                    "border-red-200 bg-red-50 text-red-700",
            };

        default:
            return {
                label: "Tidak Aktif",
                className:
                    "border-slate-200 bg-slate-100 text-slate-600",
            };
    }
};

const StatusBadge = ({
    status,
}: {
    status: DisplayStatus;
}) => {
    const info = getStatusInfo(status);

    return (
        <span
            className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-bold ${info.className}`}
        >
            {info.label}
        </span>
    );
};

interface SummaryCardProps {
    label: string;
    value: string;
    description: string;
    icon: ComponentType<{
        size?: number;
        className?: string;
    }>;
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
                    <div className="mt-4 h-9 w-20 animate-pulse rounded-lg bg-blue-50" />
                ) : (
                    <h3 className="mt-3 wrap-break-word text-2xl font-extrabold text-slate-900">
                        {value}
                    </h3>
                )}
            </div>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Icon size={22} />
            </div>
        </div>

        <p className="mt-3 text-xs leading-5 text-slate-400">
            {description}
        </p>
    </div>
);

interface DetailRowProps {
    label: string;
    value: string;
    icon: ComponentType<{
        size?: number;
        className?: string;
    }>;
}

const DetailRow = ({
    label,
    value,
    icon: Icon,
}: DetailRowProps) => (
    <div className="flex items-start gap-3 py-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Icon size={17} />
        </div>

        <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-400">
                {label}
            </p>
            <p className="mt-1 break-all text-sm font-semibold text-slate-800">
                {value || "-"}
            </p>
        </div>
    </div>
);

const Redemptions = () => {
    const navigate = useNavigate();

    const {
        providerUser,
        providerName,
    } = useOutletContext<ProviderContext>();

    const rawContextId =
        providerUser?.id_provider ??
        providerUser?.provider?.id_provider;

    const parsedContextId = Number(rawContextId);

    const providerId =
        rawContextId != null &&
            Number.isSafeInteger(parsedContextId) &&
            parsedContextId > 0
            ? parsedContextId
            : getStoredProviderId();

    const [passes, setPasses] = useState<HealthPass[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const [searchKeyword, setSearchKeyword] =
        useState("");

    const [statusFilter, setStatusFilter] =
        useState<StatusFilter>("REDEEMED");

    const [dateFilter, setDateFilter] =
        useState<DateFilter>("ALL");

    const [page, setPage] = useState(1);
    const [refreshKey, setRefreshKey] = useState(0);
    const [now, setNow] = useState(() => Date.now());

    const [selectedPassId, setSelectedPassId] =
        useState<string | null>(null);

    const redirectToLogin = useCallback(() => {
        clearProviderSession();

        navigate("/provider/sign-in", {
            replace: true,
        });
    }, [navigate]);

    useEffect(() => {
        const controller = new AbortController();

        const fetchRedemptions = async () => {
            setLoading(true);
            setErrorMessage("");

            const token = getProviderToken();

            if (!token || isTokenExpired(token)) {
                redirectToLogin();
                return;
            }

            if (!providerId) {
                setPasses([]);
                setErrorMessage(
                    "ID provider tidak ditemukan. Silakan login kembali."
                );
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(
                    `${API_BASE_URL}/health-passes/provider`,
                    {
                        method: "GET",
                        headers: {
                            Accept: "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        signal: controller.signal,
                        cache: "no-store",
                    }
                );

                if (controller.signal.aborted) return;

                if (response.status === 401) {
                    redirectToLogin();
                    return;
                }

                const result =
                    (await response.json()) as ApiResponse;

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message ||
                        `Gagal memuat Health Pass (${response.status})`
                    );
                }

                if (!Array.isArray(result.data)) {
                    throw new Error(
                        "Format response Health Pass tidak valid."
                    );
                }

                if (controller.signal.aborted) return;

                // Endpoint wajib melakukan provider scoping.
                // Filter tambahan hanya untuk data dengan id_provider.
                const providerPasses = result.data.filter(
                    (pass) =>
                        pass.id_provider == null ||
                        Number(pass.id_provider) === providerId
                );

                setPasses(providerPasses);
                setNow(Date.now());
            } catch (error) {
                if (controller.signal.aborted) return;

                setPasses([]);

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Terjadi kesalahan saat mengambil data."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        void fetchRedemptions();

        return () => controller.abort();
    }, [providerId, refreshKey, redirectToLogin]);

    useEffect(() => {
        const interval = window.setInterval(
            () => setNow(Date.now()),
            60_000
        );

        return () => window.clearInterval(interval);
    }, []);

    const summary = useMemo(() => {
        const redeemed = passes.filter(
            (pass) =>
                getDisplayStatus(pass, now) === "REDEEMED"
        );

        const active = passes.filter(
            (pass) =>
                getDisplayStatus(pass, now) === "ACTIVE"
        );

        const todayKey = getJakartaDay(now);

        const todayRedeemed = redeemed.filter((pass) => {
            const timestamp = toTimestamp(pass.redeemed_at);

            return (
                timestamp !== null &&
                getJakartaDay(timestamp) === todayKey
            );
        });

        const redemptionRate =
            passes.length > 0
                ? (redeemed.length / passes.length) * 100
                : 0;

        return {
            total: passes.length,
            redeemed: redeemed.length,
            today: todayRedeemed.length,
            active: active.length,
            rate: redemptionRate,
        };
    }, [passes, now]);

    const filteredPasses = useMemo(() => {
        const keyword = searchKeyword.trim().toLowerCase();
        const todayKey = getJakartaDay(now);

        return passes
            .filter((pass) => {
                const displayStatus =
                    getDisplayStatus(pass, now);

                const matchesStatus =
                    statusFilter === "ALL" ||
                    (statusFilter === "OTHER"
                        ? displayStatus === "OTHER" ||
                        displayStatus === "UPCOMING"
                        : displayStatus === statusFilter);

                const content = [
                    pass.id_health_pass,
                    pass.id_order,
                    pass.name_customer,
                    pass.name_service,
                    pass.name_provider,
                    pass.email_customer,
                    pass.phone_number_customer,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                const matchesSearch =
                    !keyword || content.includes(keyword);

                let matchesDate = true;

                if (dateFilter !== "ALL") {
                    const redeemedTime =
                        toTimestamp(pass.redeemed_at);

                    if (redeemedTime === null) {
                        matchesDate = false;
                    } else if (dateFilter === "TODAY") {
                        matchesDate =
                            getJakartaDay(redeemedTime) ===
                            todayKey;
                    } else {
                        const days =
                            dateFilter === "7_DAYS" ? 7 : 30;

                        const earliest = new Date(
                            `${todayKey}T00:00:00+07:00`
                        ).getTime() - (days - 1) * 86_400_000;

                        matchesDate =
                            redeemedTime >= earliest &&
                            redeemedTime <= now;
                    }
                }

                return (
                    matchesStatus &&
                    matchesSearch &&
                    matchesDate
                );
            })
            .sort((a, b) => {
                const timeA =
                    toTimestamp(a.redeemed_at) ??
                    toTimestamp(a.booking_at) ??
                    toTimestamp(a.valid_from) ??
                    0;

                const timeB =
                    toTimestamp(b.redeemed_at) ??
                    toTimestamp(b.booking_at) ??
                    toTimestamp(b.valid_from) ??
                    0;

                return timeB - timeA;
            });
    }, [
        passes,
        statusFilter,
        dateFilter,
        searchKeyword,
        now,
    ]);

    useEffect(() => {
        setPage(1);
    }, [searchKeyword, statusFilter, dateFilter]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredPasses.length / PAGE_SIZE)
    );

    const currentPage = Math.min(page, totalPages);

    const paginatedPasses = filteredPasses.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    const selectedPass =
        passes.find(
            (pass) => pass.id_health_pass === selectedPassId
        ) ?? null;

    const handleRefresh = () => {
        if (loading) return;
        setRefreshKey((previous) => previous + 1);
    };

    const statusOptions: {
        label: string;
        value: StatusFilter;
    }[] = [
            { label: "Sudah Digunakan", value: "REDEEMED" },
            { label: "Semua", value: "ALL" },
            { label: "Aktif", value: "ACTIVE" },
            { label: "Kedaluwarsa", value: "EXPIRED" },
            { label: "Lainnya", value: "OTHER" },
        ];

    return (
        <div className="min-h-full bg-[#F8FAFF]">
            <div className="mx-auto max-w-360 space-y-6 p-5 md:p-7 lg:p-8">
                <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">
                            Provider Portal
                        </p>

                        <h1 className="mt-2 text-2xl font-extrabold text-slate-900 lg:text-3xl">
                            Redemptions
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                            Riwayat penggunaan Health Pass customer
                            untuk {providerName}.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={handleRefresh}
                            disabled={loading}
                            className="cursor-pointer flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
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
                            className="cursor-pointer flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
                        >
                            <ScanLine size={18} />
                            Scan Health Pass
                        </button>
                    </div>
                </section>

                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard
                        label="Total Redemptions"
                        value={formatNumber(summary.redeemed)}
                        description="Health Pass yang sudah digunakan"
                        icon={CheckCircle2}
                        loading={loading}
                    />

                    <SummaryCard
                        label="Today's Redemptions"
                        value={formatNumber(summary.today)}
                        description="Penggunaan Health Pass hari ini (WIB)"
                        icon={CalendarDays}
                        loading={loading}
                    />

                    <SummaryCard
                        label="Active Health Passes"
                        value={formatNumber(summary.active)}
                        description="Health Pass aktif dalam masa berlaku"
                        icon={Ticket}
                        loading={loading}
                    />

                    <SummaryCard
                        label="Redemption Rate"
                        value={`${summary.rate.toFixed(1)}%`}
                        description={`Dari ${formatNumber(summary.total)} Health Pass provider`}
                        icon={Activity}
                        loading={loading}
                    />
                </section>

                <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
                    {/* TABLE HEADER */}
                    <div className="border-b border-blue-100 p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-extrabold text-slate-900">
                                    Riwayat Redemption
                                </h2>

                                <p className="mt-1 text-xs text-slate-500">
                                    Data diambil dari Health Pass provider.
                                </p>
                            </div>

                            <span className="text-xs font-semibold text-blue-600">
                                {loading
                                    ? "Memuat..."
                                    : `${filteredPasses.length} Health Pass`}
                            </span>
                        </div>

                        {/* SEARCH + DATE FILTER */}
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
                                        setSearchKeyword(
                                            event.target.value
                                        )
                                    }
                                    placeholder="Cari customer, layanan, ID pass..."
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <select
                                aria-label="Filter tanggal redemption"
                                value={dateFilter}
                                onChange={(event) =>
                                    setDateFilter(
                                        event.target.value as DateFilter
                                    )
                                }
                                className="cursor-pointer h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-400"
                            >
                                <option value="ALL">
                                    Semua Waktu
                                </option>
                                <option value="TODAY">
                                    Hari Ini
                                </option>
                                <option value="7_DAYS">
                                    7 Hari Terakhir
                                </option>
                                <option value="30_DAYS">
                                    30 Hari Terakhir
                                </option>
                            </select>
                        </div>

                        {/* STATUS FILTER */}
                        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                            {statusOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() =>
                                        setStatusFilter(option.value)
                                    }
                                    aria-pressed={
                                        statusFilter === option.value
                                    }
                                    className={`cursor-pointer shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${statusFilter === option.value
                                        ? "border-blue-600 bg-blue-600 text-white"
                                        : "border-slate-200 bg-white text-slate-500 hover:border-blue-300"
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ERROR */}
                    {!loading && errorMessage && (
                        <div
                            role="alert"
                            className="m-5 rounded-xl border border-red-200 bg-red-50 p-6 text-center"
                        >
                            <AlertCircle
                                size={34}
                                className="mx-auto text-red-500"
                            />

                            <h3 className="mt-3 font-bold text-red-700">
                                Gagal Memuat Redemptions
                            </h3>

                            <p className="mt-2 text-sm text-red-600">
                                {errorMessage}
                            </p>

                            <button
                                type="button"
                                onClick={handleRefresh}
                                className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white"
                            >
                                Coba Lagi
                            </button>
                        </div>
                    )}

                    {/* LOADING */}
                    {loading && (
                        <div className="flex items-center justify-center gap-3 py-20">
                            <Loader2
                                size={26}
                                className="animate-spin text-blue-600"
                            />

                            <span className="text-sm text-slate-500">
                                Memuat data redemption...
                            </span>
                        </div>
                    )}

                    {/* EMPTY */}
                    {!loading &&
                        !errorMessage &&
                        filteredPasses.length === 0 && (
                            <div className="px-5 py-20 text-center">
                                <Package
                                    size={44}
                                    className="mx-auto text-blue-200"
                                />

                                <h3 className="mt-4 font-bold text-slate-800">
                                    Tidak Ada Data
                                </h3>

                                <p className="mt-2 text-sm text-slate-500">
                                    {passes.length === 0
                                        ? "Belum ada Health Pass untuk provider ini."
                                        : "Tidak ada Health Pass yang sesuai dengan filter."}
                                </p>
                            </div>
                        )}

                    {/* DATA */}
                    {!loading &&
                        !errorMessage &&
                        paginatedPasses.length > 0 && (
                            <>
                                {/* DESKTOP TABLE */}
                                <div className="hidden overflow-x-auto lg:block">
                                    <table className="w-full min-w-237.5 text-left">
                                        <thead className="bg-blue-50/70">
                                            <tr className="text-xs font-semibold text-slate-500">
                                                <th className="px-5 py-4">
                                                    Health Pass
                                                </th>
                                                <th className="px-4 py-4">
                                                    Customer
                                                </th>
                                                <th className="px-4 py-4">
                                                    Layanan
                                                </th>
                                                <th className="px-4 py-4">
                                                    Status
                                                </th>
                                                <th className="px-4 py-4">
                                                    Waktu Redeem
                                                </th>
                                                <th className="px-4 py-4">
                                                    Redeemed By
                                                </th>
                                                <th className="px-4 py-4 text-right">
                                                    Aksi
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody className="divide-y divide-slate-100">
                                            {paginatedPasses.map((pass) => {
                                                const displayStatus =
                                                    getDisplayStatus(
                                                        pass,
                                                        now
                                                    );

                                                return (
                                                    <tr
                                                        key={pass.id_health_pass}
                                                        className="hover:bg-blue-50/30"
                                                    >
                                                        <td className="px-5 py-4">
                                                            <p
                                                                title={pass.id_health_pass}
                                                                className="max-w-36.25 truncate text-xs font-bold text-slate-800"
                                                            >
                                                                {pass.id_health_pass}
                                                            </p>

                                                            <p className="mt-1 text-[11px] text-slate-400">
                                                                Order: {pass.id_order?.slice(0, 8)}...
                                                            </p>
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            <p className="max-w-37.5 truncate text-sm font-semibold text-slate-800">
                                                                {pass.name_customer || "-"}
                                                            </p>

                                                            <p className="mt-1 max-w-37.5 truncate text-xs text-slate-500">
                                                                {pass.email_customer || "-"}
                                                            </p>
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            <p className="max-w-40 truncate text-sm font-semibold text-slate-800">
                                                                {pass.name_service || "-"}
                                                            </p>

                                                            <p className="mt-1 text-xs text-slate-500">
                                                                {formatRupiah(pass.price_service)}
                                                            </p>
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            <StatusBadge
                                                                status={displayStatus}
                                                            />
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            <p className="whitespace-nowrap text-xs text-slate-700">
                                                                {formatDate(pass.redeemed_at)}
                                                            </p>
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            <p className="text-xs font-medium text-slate-700">
                                                                {pass.redeemed_by == null
                                                                    ? "-"
                                                                    : String(pass.redeemed_by)}
                                                            </p>
                                                        </td>

                                                        <td className="px-4 py-4 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setSelectedPassId(
                                                                        pass.id_health_pass
                                                                    )
                                                                }
                                                                className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50"
                                                            >
                                                                <Eye size={15} />
                                                                Detail
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* MOBILE CARDS */}
                                <div className="space-y-3 p-4 lg:hidden">
                                    {paginatedPasses.map((pass) => {
                                        const displayStatus =
                                            getDisplayStatus(
                                                pass,
                                                now
                                            );

                                        return (
                                            <article
                                                key={pass.id_health_pass}
                                                className="rounded-xl border border-slate-200 bg-white p-4"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-slate-900">
                                                            {pass.name_service || "-"}
                                                        </p>

                                                        <p className="mt-1 text-xs text-slate-500">
                                                            {pass.name_customer || "-"}
                                                        </p>
                                                    </div>

                                                    <StatusBadge
                                                        status={displayStatus}
                                                    />
                                                </div>

                                                <div className="mt-4 rounded-lg bg-slate-50 p-3">
                                                    <p className="text-xs text-slate-400">
                                                        Waktu Redemption
                                                    </p>

                                                    <p className="mt-1 text-sm font-semibold text-slate-800">
                                                        {formatDate(pass.redeemed_at)}
                                                    </p>

                                                    <p className="mt-3 text-xs text-slate-400">
                                                        Redeemed By
                                                    </p>

                                                    <p className="mt-1 text-sm font-semibold text-slate-800">
                                                        {pass.redeemed_by == null
                                                            ? "-"
                                                            : String(pass.redeemed_by)}
                                                    </p>
                                                </div>

                                                <div className="mt-4 flex items-center justify-between gap-3">
                                                    <p className="max-w-47.5 truncate text-[11px] text-slate-400">
                                                        {pass.id_health_pass}
                                                    </p>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setSelectedPassId(
                                                                pass.id_health_pass
                                                            )
                                                        }
                                                        className="flex items-center gap-1 rounded-xl bg-blue-50 px-4 py-2.5 text-xs font-bold text-blue-700"
                                                    >
                                                        Detail
                                                        <ChevronRight size={15} />
                                                    </button>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>

                                {/* PAGINATION */}
                                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-blue-100 px-5 py-4">
                                    <p className="text-xs text-slate-500">
                                        Menampilkan{" "}
                                        {(currentPage - 1) * PAGE_SIZE + 1}
                                        {" - "}
                                        {Math.min(
                                            currentPage * PAGE_SIZE,
                                            filteredPasses.length
                                        )}{" "}
                                        dari {filteredPasses.length}
                                    </p>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setPage((p) =>
                                                    Math.max(1, p - 1)
                                                )
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
                                                    Math.min(
                                                        totalPages,
                                                        p + 1
                                                    )
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

            {selectedPass && (
                <div
                    role="presentation"
                    className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/60 p-4"
                    onClick={() => setSelectedPassId(null)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="redemption-detail-title"
                        onClick={(event) => event.stopPropagation()}
                        className="max-h-[90dvh] w-full max-w-140 overflow-y-auto rounded-3xl bg-white shadow-2xl"
                    >
                        {/* MODAL HEADER */}
                        <div className="flex items-start justify-between gap-3 border-b border-blue-100 bg-blue-50 p-5">
                            <div>
                                <h2
                                    id="redemption-detail-title"
                                    className="text-lg font-extrabold text-slate-900"
                                >
                                    Detail Health Pass
                                </h2>

                                <p className="mt-1 text-xs text-blue-700">
                                    Informasi penggunaan layanan customer
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedPassId(null)}
                                aria-label="Tutup detail"
                                className="cursor-pointer rounded-full bg-white p-2 text-slate-500"
                            >
                                <X size={19} />
                            </button>
                        </div>

                        {/* MODAL CONTENT */}
                        <div className="space-y-5 p-5">
                            {/* SERVICE */}
                            <div className="flex gap-3 rounded-2xl border border-blue-100 p-4">
                                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-50">
                                    {selectedPass.image_service ? (
                                        <img
                                            src={selectedPass.image_service}
                                            alt={selectedPass.name_service || "Layanan"}
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
                                        {selectedPass.name_service || "-"}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                        {selectedPass.name_provider || providerName}
                                    </p>

                                    <p className="mt-2 font-bold text-blue-600">
                                        {formatRupiah(selectedPass.price_service)}
                                    </p>

                                    <div className="mt-2">
                                        <StatusBadge
                                            status={getDisplayStatus(
                                                selectedPass,
                                                now
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* CUSTOMER DETAILS */}
                            <section>
                                <h3 className="mb-3 text-sm font-extrabold text-slate-900">
                                    Informasi Customer
                                </h3>

                                <div className="rounded-xl bg-slate-50 p-4">
                                    <DetailRow
                                        icon={UserRound}
                                        label="Nama Customer"
                                        value={selectedPass.name_customer || "-"}
                                    />

                                    <DetailRow
                                        icon={Mail}
                                        label="Email"
                                        value={selectedPass.email_customer || "-"}
                                    />

                                    <DetailRow
                                        icon={Phone}
                                        label="Nomor Telepon"
                                        value={selectedPass.phone_number_customer || "-"}
                                    />
                                </div>
                            </section>

                            {/* HEALTH PASS DETAILS */}
                            <section>
                                <h3 className="mb-3 text-sm font-extrabold text-slate-900">
                                    Informasi Health Pass
                                </h3>

                                <div className="rounded-xl bg-slate-50 p-4">
                                    <DetailRow
                                        icon={Hash}
                                        label="ID Health Pass"
                                        value={selectedPass.id_health_pass}
                                    />

                                    <DetailRow
                                        icon={Ticket}
                                        label="ID Order"
                                        value={selectedPass.id_order}
                                    />

                                    <DetailRow
                                        icon={CalendarDays}
                                        label="Jadwal Booking"
                                        value={formatDate(selectedPass.booking_at)}
                                    />

                                    <DetailRow
                                        icon={Clock3}
                                        label="Berlaku Mulai"
                                        value={formatDate(selectedPass.valid_from)}
                                    />

                                    <DetailRow
                                        icon={Clock3}
                                        label="Berlaku Sampai"
                                        value={formatDate(selectedPass.valid_until)}
                                    />
                                </div>
                            </section>

                            {/* REDEMPTION DETAILS */}
                            <section>
                                <h3 className="mb-3 text-sm font-extrabold text-slate-900">
                                    Informasi Redemption
                                </h3>

                                <div className="rounded-xl bg-blue-50 p-4">
                                    <DetailRow
                                        icon={CheckCircle2}
                                        label="Waktu Redeem"
                                        value={formatDate(selectedPass.redeemed_at)}
                                    />

                                    <DetailRow
                                        icon={ShieldCheck}
                                        label="Redeemed By (ID Provider User)"
                                        value={
                                            selectedPass.redeemed_by == null
                                                ? "-"
                                                : String(selectedPass.redeemed_by)
                                        }
                                    />

                                    <DetailRow
                                        icon={Building2}
                                        label="Provider"
                                        value={selectedPass.name_provider || providerName}
                                    />
                                </div>
                            </section>

                            <button
                                type="button"
                                onClick={() => setSelectedPassId(null)}
                                className="cursor-pointer w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
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

export default Redemptions;
