
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
    Wallet,
    WalletCards,
    Landmark,
    RefreshCw,
    CalendarClock,
    CalendarDays,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Building2,
    ShieldCheck,
    Info,
    Clock3,
    ReceiptText,
    ArrowRight,
    Database,
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

interface ProviderBalance {
    id_balance: number | string;
    id_provider: number | string;

    name_provider?: string;
    status_provider?: string;

    total_amount: number | string;
    total_amount_dana: number | string;
    total_balance: number | string;
}

interface BalanceResponse {
    success: boolean;
    data: ProviderBalance | ProviderBalance[] | null;
    message?: string;
}

interface BalanceSummary {
    regular: number;
    dana: number;
    total: number;
}

interface BalanceCardProps {
    title: string;
    value: string;
    description: string;
    icon: ComponentType<{
        size?: number;
        className?: string;
    }>;
    variant?: "blue" | "sky";
}

const API_BASE_URL = String(
    import.meta.env.VITE_API_URI || ""
).replace(/\/+$/, "");

const TIME_ZONE = "Asia/Jakarta";

const getProviderToken = (): string | null => {
    return (
        sessionStorage.getItem("provider_token") ||
        localStorage.getItem("provider_token")
    );
};

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

        if (
            rawId === null ||
            rawId === undefined ||
            rawId === ""
        ) {
            return null;
        }

        const id = Number(rawId);

        return Number.isSafeInteger(id) && id > 0
            ? id
            : null;
    } catch (error) {
        console.error(
            "[PROVIDER STORAGE ERROR]",
            error
        );

        return null;
    }
};

const formatRupiah = (value: number): string => {
    if (!Number.isFinite(value)) return "-";

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(value);
};

const formatDateTime = (date: Date): string => {
    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone: TIME_ZONE,
    }).format(date);
};

const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: TIME_ZONE,
    }).format(date);
};

const getJakartaDateParts = (date: Date) => {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);

    const getPart = (type: string): number =>
        Number(
            parts.find((part) => part.type === type)?.value
        );

    return {
        year: getPart("year"),
        month: getPart("month"),
        day: getPart("day"),
    };
};

// H+1 calendar estimate (not a transfer confirmation).
const getNextSettlementDate = (now: Date): Date => {
    const { year, month, day } =
        getJakartaDateParts(now);

    return new Date(
        Date.UTC(year, month - 1, day + 1, 5, 0, 0)
    );
};

const isRecord = (
    value: unknown
): value is Record<string, unknown> => {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
    );
};

const isValidAmount = (value: unknown): boolean => {
    return (
        (typeof value === "number" ||
            (typeof value === "string" &&
                value.trim() !== "")) &&
        Number.isFinite(Number(value)) &&
        Number(value) >= 0
    );
};

const isProviderBalance = (
    value: unknown
): value is ProviderBalance => {
    if (!isRecord(value)) return false;

    const id = Number(value.id_provider);

    return (
        value.id_balance != null &&
        value.id_provider != null &&
        Number.isSafeInteger(id) &&
        id > 0 &&
        isValidAmount(value.total_amount) &&
        isValidAmount(value.total_amount_dana) &&
        isValidAmount(value.total_balance)
    );
};

const normalizeBalanceResponse = (
    data: BalanceResponse["data"]
): ProviderBalance[] => {
    if (data === null) return [];

    const records = Array.isArray(data)
        ? data
        : [data];

    if (!records.every(isProviderBalance)) {
        throw new Error(
            "Data balance dari server memiliki format yang tidak valid."
        );
    }

    return records;
};

const BalanceCard = ({
    title,
    value,
    description,
    icon: Icon,
    variant = "blue",
}: BalanceCardProps) => {
    const iconStyle =
        variant === "sky"
            ? "bg-sky-50 text-sky-600"
            : "bg-blue-50 text-blue-600";

    return (
        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-500">
                        {title}
                    </p>

                    <h3 className="mt-3 wrap-break-word text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
                        {value}
                    </h3>
                </div>

                <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconStyle}`}
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

const Settlement = () => {
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
            rawContextId !== "" &&
            Number.isSafeInteger(parsedContextId) &&
            parsedContextId > 0
            ? parsedContextId
            : getStoredProviderId();

    const [balances, setBalances] = useState<
        ProviderBalance[]
    >([]);

    const [loading, setLoading] = useState(true);

    const [errorMessage, setErrorMessage] =
        useState("");

    const [refreshKey, setRefreshKey] =
        useState(0);

    const [lastUpdated, setLastUpdated] =
        useState<Date | null>(null);

    const [now, setNow] = useState(
        () => new Date()
    );

    const redirectToLogin = useCallback(() => {
        clearProviderSession();

        navigate("/provider/sign-in", {
            replace: true,
        });
    }, [navigate]);

    useEffect(() => {
        const controller = new AbortController();

        const fetchBalances = async () => {
            setLoading(true);
            setErrorMessage("");

            const token = getProviderToken();

            if (
                !token ||
                isTokenExpired(token)
            ) {
                redirectToLogin();
                return;
            }

            if (!providerId) {
                setBalances([]);
                setLastUpdated(null);

                setErrorMessage(
                    "ID provider tidak ditemukan. Silakan login kembali."
                );

                setLoading(false);
                return;
            }

            try {
                const response = await fetch(
                    `${API_BASE_URL}/balances/provider/${providerId}`,
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

                if (response.status === 403) {
                    throw new Error(
                        "Anda tidak memiliki akses ke saldo provider ini."
                    );
                }

                const result =
                    (await response.json()) as BalanceResponse;

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message ||
                        `Gagal mengambil balance (${response.status})`
                    );
                }

                const normalizedBalances =
                    normalizeBalanceResponse(
                        result.data
                    );

                const providerBalances =
                    normalizedBalances.filter(
                        (balance) =>
                            Number(balance.id_provider) ===
                            providerId
                    );

                if (
                    normalizedBalances.length > 0 &&
                    providerBalances.length !==
                    normalizedBalances.length
                ) {
                    throw new Error(
                        "Respons saldo memuat data yang tidak sesuai dengan provider yang sedang login."
                    );
                }

                if (controller.signal.aborted) return;

                setBalances(providerBalances);
                setLastUpdated(new Date());
                setNow(new Date());
            } catch (error) {
                if (controller.signal.aborted) return;

                console.error(
                    "[SETTLEMENT FETCH ERROR]",
                    error
                );

                setBalances([]);
                setLastUpdated(null);

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Terjadi kesalahan saat mengambil saldo provider."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        void fetchBalances();

        return () => {
            controller.abort();
        };
    }, [
        providerId,
        refreshKey,
        redirectToLogin,
    ]);

    useEffect(() => {
        const interval = window.setInterval(() => {
            setNow(new Date());
        }, 60_000);

        return () => {
            window.clearInterval(interval);
        };
    }, []);

    const summary = useMemo<BalanceSummary>(() => {
        return balances.reduce(
            (accumulator, balance) => ({
                regular:
                    accumulator.regular +
                    Number(balance.total_amount),

                dana:
                    accumulator.dana +
                    Number(balance.total_amount_dana),

                total:
                    accumulator.total +
                    Number(balance.total_balance),
            }),
            {
                regular: 0,
                dana: 0,
                total: 0,
            }
        );
    }, [balances]);

    const calculatedTotal =
        summary.regular + summary.dana;

    const totalMismatch =
        balances.length > 0 &&
        Math.abs(
            calculatedTotal - summary.total
        ) > 0.01;

    const nextSettlementDate = useMemo(
        () => getNextSettlementDate(now),
        [now]
    );

    const actualProviderName =
        balances[0]?.name_provider ||
        providerName;

    const providerStatus =
        balances[0]?.status_provider ||
        "-";

    const hasBalanceRecords =
        balances.length > 0;

    const handleRefresh = () => {
        if (loading) return;

        setRefreshKey(
            (previous) => previous + 1
        );
    };

    return (
        <div className="min-h-full bg-[#F8FAFF]">
            <div className="mx-auto max-w-360 space-y-6 p-5 md:p-7 lg:p-8">
                <section className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">
                            Provider Finance
                        </p>

                        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 lg:text-3xl">
                            Settlement
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                            Pantau saldo reguler dan DANA serta
                            informasi settlement otomatis H+1.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <RefreshCw
                            size={18}
                            className={
                                loading ? "animate-spin" : ""
                            }
                        />

                        {loading
                            ? "Memuat..."
                            : "Refresh Data"}
                    </button>
                </section>

                {errorMessage && (
                    <div
                        role="alert"
                        className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4"
                    >
                        <AlertCircle
                            size={21}
                            className="shrink-0 text-red-600"
                        />

                        <div>
                            <p className="text-sm font-bold text-red-800">
                                Gagal Memuat Settlement
                            </p>

                            <p className="mt-1 text-xs leading-6 text-red-700">
                                {errorMessage}
                            </p>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex min-h-90 flex-col items-center justify-center gap-3 rounded-2xl border border-blue-100 bg-white">
                        <Loader2
                            size={32}
                            className="animate-spin text-blue-600"
                        />

                        <p className="text-sm text-slate-500">
                            Memuat informasi saldo provider...
                        </p>
                    </div>
                ) : errorMessage ? (
                    <div className="rounded-2xl border border-red-100 bg-white p-8 text-center">
                        <AlertCircle
                            size={36}
                            className="mx-auto text-red-400"
                        />

                        <h2 className="mt-3 text-base font-bold text-slate-800">
                            Data Tidak Dapat Ditampilkan
                        </h2>

                        <p className="mt-2 text-sm text-slate-500">
                            Silakan periksa koneksi atau coba lagi.
                        </p>

                        <button
                            type="button"
                            onClick={handleRefresh}
                            className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
                        >
                            Coba Lagi
                        </button>
                    </div>
                ) : !hasBalanceRecords ? (
                    <div className="rounded-2xl border border-blue-100 bg-white px-6 py-16 text-center">
                        <Database
                            size={42}
                            className="mx-auto text-blue-300"
                        />

                        <h2 className="mt-4 text-lg font-extrabold text-slate-900">
                            Belum Ada Data Saldo
                        </h2>

                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                            Belum terdapat record balance untuk
                            provider ini. Data saldo akan
                            ditampilkan setelah tersedia di backend.
                        </p>

                        <button
                            type="button"
                            onClick={handleRefresh}
                            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
                        >
                            <RefreshCw size={17} />
                            Refresh Data
                        </button>
                    </div>
                ) : (
                    <>
                        <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-blue-700 via-blue-600 to-sky-500 p-6 text-white shadow-lg shadow-blue-100 md:p-8">
                            {/* DECORATION */}
                            <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-white/10" />

                            <div className="pointer-events-none absolute -bottom-16 right-28 h-40 w-40 rounded-full bg-white/10" />

                            <div className="relative">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-blue-100">
                                            Total Saldo Provider
                                        </p>

                                        <h2 className="mt-3 wrap-break-word text-3xl font-extrabold tracking-tight md:text-4xl">
                                            {formatRupiah(summary.total)}
                                        </h2>

                                        <p className="mt-3 text-xs text-blue-100">
                                            Saldo gabungan berdasarkan data API
                                        </p>
                                    </div>

                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                                        <Wallet size={25} />
                                    </div>
                                </div>

                                <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-white/20 pt-5">
                                    <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-2 text-xs font-semibold">
                                        <CalendarClock size={16} />
                                        Skema H+1
                                    </span>

                                    <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-2 text-xs font-semibold">
                                        <ShieldCheck size={16} />
                                        Data dari API Provider
                                    </span>
                                </div>
                            </div>
                        </section>

                        <section>
                            <div className="mb-4">
                                <h2 className="text-lg font-extrabold text-slate-900">
                                    Rincian Saldo
                                </h2>

                                <p className="mt-1 text-xs text-slate-500">
                                    Pemisahan nominal berdasarkan jenis saldo.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <BalanceCard
                                    title="Saldo Reguler"
                                    value={formatRupiah(
                                        summary.regular
                                    )}
                                    description="Saldo berdasarkan field total_amount"
                                    icon={Landmark}
                                    variant="blue"
                                />

                                <BalanceCard
                                    title="Saldo DANA"
                                    value={formatRupiah(
                                        summary.dana
                                    )}
                                    description="Saldo berdasarkan field total_amount_dana"
                                    icon={WalletCards}
                                    variant="sky"
                                />
                            </div>
                        </section>

                        {totalMismatch && (
                            <div
                                role="alert"
                                className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4"
                            >
                                <AlertCircle
                                    size={20}
                                    className="shrink-0 text-amber-600"
                                />

                                <div>
                                    <p className="text-sm font-bold text-amber-800">
                                        Perbedaan Total Saldo
                                    </p>

                                    <p className="mt-1 text-xs leading-6 text-amber-700">
                                        Jumlah saldo reguler dan DANA
                                        tidak sama dengan total_balance
                                        dari backend.
                                    </p>

                                    <p className="mt-2 text-xs font-semibold text-amber-800">
                                        Hasil penjumlahan:{" "}
                                        {formatRupiah(calculatedTotal)}
                                    </p>
                                </div>
                            </div>
                        )}

                        <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                            {/* SETTLEMENT SCHEDULE */}
                            <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm xl:col-span-2">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h2 className="text-lg font-extrabold text-slate-900">
                                            Jadwal Settlement
                                        </h2>

                                        <p className="mt-1 text-xs text-slate-500">
                                            Informasi skema settlement harian.
                                        </p>
                                    </div>

                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                        <CalendarDays size={22} />
                                    </div>
                                </div>

                                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div className="rounded-xl bg-blue-50 p-4">
                                        <p className="text-xs font-semibold text-blue-700">
                                            Skema Settlement
                                        </p>

                                        <p className="mt-2 text-xl font-extrabold text-blue-900">
                                            Otomatis H+1
                                        </p>

                                        <p className="mt-2 text-xs leading-5 text-blue-700">
                                            Diproses oleh backend sesuai
                                            jadwal operasional.
                                        </p>
                                    </div>

                                    <div className="rounded-xl bg-slate-50 p-4">
                                        <p className="text-xs font-semibold text-slate-500">
                                            Estimasi Hari Berikutnya
                                        </p>

                                        <p className="mt-2 text-base font-extrabold text-slate-900">
                                            {formatDate(
                                                nextSettlementDate
                                            )}
                                        </p>

                                        <p className="mt-2 text-xs leading-5 text-slate-500">
                                            Perkiraan kalender H+1,
                                            bukan konfirmasi transfer.
                                        </p>
                                    </div>
                                </div>

                                {/* SETTLEMENT PROCESS */}
                                <div className="mt-6 space-y-5">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                            <ReceiptText size={19} />
                                        </div>

                                        <div>
                                            <p className="text-sm font-bold text-slate-800">
                                                1. Transaksi Berhasil
                                            </p>

                                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                                Transaksi customer yang
                                                memenuhi ketentuan
                                                dicatat pada sistem.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                            <Clock3 size={19} />
                                        </div>

                                        <div>
                                            <p className="text-sm font-bold text-slate-800">
                                                2. Proses Settlement H+1
                                            </p>

                                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                                Backend menjadwalkan
                                                settlement transaksi yang
                                                memenuhi syarat pada
                                                periode berikutnya.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                            <CheckCircle2 size={19} />
                                        </div>

                                        <div>
                                            <p className="text-sm font-bold text-slate-800">
                                                3. Konfirmasi Settlement
                                            </p>

                                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                                Settlement dinyatakan selesai
                                                setelah backend menerima
                                                konfirmasi transfer yang valid.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                        <Building2 size={22} />
                                    </div>

                                    <h2 className="text-lg font-extrabold text-slate-900">
                                        Informasi Provider
                                    </h2>
                                </div>

                                <div className="mt-6 space-y-5">
                                    {/* NAME */}
                                    <div>
                                        <p className="text-xs text-slate-400">
                                            Nama Provider
                                        </p>

                                        <p className="mt-1 wrap-break-word text-sm font-bold text-slate-800">
                                            {actualProviderName}
                                        </p>
                                    </div>

                                    {/* ID */}
                                    <div>
                                        <p className="text-xs text-slate-400">
                                            Provider ID
                                        </p>

                                        <p className="mt-1 text-sm font-bold text-slate-800">
                                            {providerId}
                                        </p>
                                    </div>

                                    {/* STATUS */}
                                    <div>
                                        <p className="text-xs text-slate-400">
                                            Status Provider
                                        </p>

                                        <span
                                            className={`mt-2 inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${providerStatus.toUpperCase() ===
                                                "APPROVED"
                                                ? "bg-blue-50 text-blue-700"
                                                : "bg-slate-100 text-slate-600"
                                                }`}
                                        >
                                            {providerStatus}
                                        </span>
                                    </div>

                                    {/* BALANCE RECORDS */}
                                    <div>
                                        <p className="text-xs text-slate-400">
                                            Balance Records
                                        </p>

                                        <p className="mt-1 text-sm font-bold text-slate-800">
                                            {balances.length}
                                        </p>
                                    </div>

                                    {/* LAST UPDATED */}
                                    <div className="border-t border-blue-100 pt-4">
                                        <p className="text-xs text-slate-400">
                                            Terakhir Diperbarui
                                        </p>

                                        <p className="mt-1 text-sm font-semibold text-slate-700">
                                            {lastUpdated
                                                ? formatDateTime(
                                                    lastUpdated
                                                )
                                                : "-"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-2xl border border-blue-100 bg-white p-5">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                    <Info size={21} />
                                </div>

                                <h2 className="text-base font-extrabold text-slate-900">
                                    Informasi Penting
                                </h2>
                            </div>

                            <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
                                <div className="flex items-start gap-3">
                                    <CheckCircle2
                                        size={18}
                                        className="mt-1 shrink-0 text-blue-600"
                                    />

                                    <p>
                                        Saldo yang ditampilkan merupakan ringkasan
                                        saldo transaksi layanan kesehatan di
                                        fasilitas Anda.
                                    </p>
                                </div>

                                <div className="flex items-start gap-3">
                                    <Wallet
                                        size={18}
                                        className="mt-1 shrink-0 text-blue-600"
                                    />

                                    <p>
                                        Saldo Reguler dan Saldo DANA ditampilkan
                                        secara terpisah agar Anda lebih mudah
                                        memantau masing-masing jenis saldo.
                                    </p>
                                </div>

                                <div className="flex items-start gap-3">
                                    <CalendarClock
                                        size={18}
                                        className="mt-1 shrink-0 text-blue-600"
                                    />

                                    <p>
                                        Pencairan dana dijadwalkan secara otomatis
                                        dengan skema H+1, yaitu satu hari setelah
                                        transaksi memenuhi ketentuan pencairan.
                                    </p>
                                </div>

                                <div className="flex items-start gap-3">
                                    <RefreshCw
                                        size={18}
                                        className="mt-1 shrink-0 text-blue-600"
                                    />

                                    <p>
                                        Anda dapat menekan tombol Refresh Data
                                        untuk melihat informasi saldo terbaru.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
                                <ShieldCheck
                                    size={20}
                                    className="mt-0.5 shrink-0 text-blue-600"
                                />

                                <p className="text-xs leading-6 text-blue-700">
                                    Proses pencairan dana dilakukan secara otomatis.
                                    Anda tidak perlu mengajukan pencairan secara
                                    manual. Jika terdapat kendala atau perbedaan
                                    informasi saldo, silakan menghubungi tim
                                    STIQR Health.
                                </p>
                            </div>
                        </section>
                    </>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-blue-100 pt-5 text-xs text-slate-400">
                    <p>
                        Settlement Overview — STIQR Health
                    </p>

                    <span className="flex items-center gap-2">
                        <Wallet size={14} />
                        Provider Balance
                        <ArrowRight size={13} />
                    </span>
                </div>
            </div>
        </div>
    );
};

export default Settlement;
