import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

import {
    AlertCircle,
    Building2,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    CircleDollarSign,
    CreditCard,
    Eye,
    Landmark,
    LoaderCircle,
    RefreshCw,
    Search,
    Wallet,
    X,
} from "lucide-react";

const PAGE_SIZE = 10;

type ApiRecord = Record<string, unknown>;

type ModalType = "detail" | "provider" | null;

type SortType =
    | "newest"
    | "highest"
    | "lowest"
    | "name";

interface ProviderBalanceData {
    id_balance: number | null;
    id_provider: number;
    name_provider: string;
    status_provider: string;
    total_amount: number;
    total_amount_dana: number;
    total_balance: number;
}

interface BalanceSummary {
    total_provider_balances: number;
    total_amount: number;
    total_amount_dana: number;
    total_balance: number;
}

interface ModalProps {
    title: string;
    children: ReactNode;
    footer?: ReactNode;
    onClose: () => void;
    wide?: boolean;
}

interface InfoFieldProps {
    label: string;
    value: ReactNode;
}

interface StatCardProps {
    title: string;
    value: string;
    description: string;
    icon: ReactNode;
    loading?: boolean;
}

interface Notice {
    type: "success" | "error";
    message: string;
}

const primaryButton =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#0866D8] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#DBE4F0] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

const inputClass =
    "w-full rounded-lg border border-[#DBE4F0] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-[#0866D8] focus:ring-2 focus:ring-blue-100";

const filterClass =
    "rounded-lg border border-[#DBE4F0] bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-colors focus:border-[#0866D8]";

const iconButtonClass =
    "flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const isRecord = (
    value: unknown
): value is ApiRecord =>
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value);

const asText = (value: unknown): string => {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value);
};

const asNumber = (value: unknown): number => {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return 0;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
};

const asId = (value: unknown): number | null => {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const parsed = Number(value);

    return Number.isSafeInteger(parsed) && parsed > 0
        ? parsed
        : null;
};

const getErrorMessage = (error: unknown): string =>
    error instanceof Error
        ? error.message
        : "Terjadi kesalahan. Silakan coba kembali.";

const getToken = (): string | null =>
    sessionStorage.getItem("admin_token") ??
    localStorage.getItem("admin_token");

const formatCurrency = (value: number): string =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 2,
    }).format(value);

const formatNumber = (value: number): string =>
    new Intl.NumberFormat("id-ID").format(value);

class ApiError extends Error {
    status: number;

    constructor(
        status: number,
        message: string
    ) {
        super(message);

        this.name = "ApiError";
        this.status = status;
    }
}

const apiRequest = async (
    endpoint: string,
    options: RequestInit = {}
): Promise<unknown> => {
    const token = getToken();

    if (!token) {
        throw new ApiError(
            401,
            "Token admin tidak ditemukan. Silakan login kembali."
        );
    }

    const headers = new Headers(options.headers);

    headers.set("Accept", "application/json");
    headers.set("Authorization", `Bearer ${token}`);

    const response = await fetch(
        `${import.meta.env.VITE_API_URI}${endpoint}`,
        {
            ...options,
            headers,
        }
    );

    const contentType =
        response.headers.get("content-type") ?? "";

    const payload: unknown = contentType.includes(
        "application/json"
    )
        ? await response.json()
        : (await response.text()) || null;

    if (!response.ok) {
        const serverMessage =
            isRecord(payload) &&
                typeof payload.message === "string"
                ? payload.message
                : "";

        throw new ApiError(
            response.status,
            serverMessage ||
            (
                response.status === 401
                    ? "Token tidak valid atau telah kedaluwarsa."
                    : response.status === 403
                        ? "Anda tidak memiliki izin untuk mengakses saldo provider."
                        : `Request gagal (HTTP ${response.status}).`
            )
        );
    }

    if (
        isRecord(payload) &&
        payload.success === false
    ) {
        throw new Error(
            typeof payload.message === "string"
                ? payload.message
                : "Request API gagal."
        );
    }

    return payload;
};

const unwrapData = (
    payload: unknown
): unknown => {
    if (!isRecord(payload)) return payload;

    if (payload.success === false) {
        throw new Error(
            typeof payload.message === "string"
                ? payload.message
                : "Request API gagal."
        );
    }

    return "data" in payload
        ? payload.data
        : payload;
};

const extractArray = (
    payload: unknown
): ApiRecord[] => {
    const data = unwrapData(payload);

    if (!Array.isArray(data)) {
        throw new Error(
            "Format respons daftar saldo provider tidak valid."
        );
    }

    if (!data.every(isRecord)) {
        throw new Error(
            "Data saldo provider memiliki format tidak valid."
        );
    }

    return data;
};

const extractObject = (
    payload: unknown
): ApiRecord => {
    const data = unwrapData(payload);

    if (!isRecord(data)) {
        throw new Error(
            "Format respons detail saldo tidak valid."
        );
    }

    return data;
};

const normalizeBalance = (
    row: ApiRecord
): ProviderBalanceData | null => {
    const idProvider = asId(row.id_provider);

    if (idProvider === null) {
        return null;
    }

    const totalAmount = asNumber(
        row.total_amount
    );

    const totalAmountDana = asNumber(
        row.total_amount_dana
    );

    return {
        id_balance: asId(row.id_balance),

        id_provider: idProvider,

        name_provider: asText(
            row.name_provider
        ),

        status_provider: asText(
            row.status_provider
        ).toUpperCase(),

        total_amount: totalAmount,

        total_amount_dana: totalAmountDana,

        total_balance:
            totalAmount + totalAmountDana,
    };
};

const normalizeSummary = (
    row: ApiRecord
): BalanceSummary => {
    const totalAmount = asNumber(
        row.total_amount
    );

    const totalAmountDana = asNumber(
        row.total_amount_dana
    );

    return {
        total_provider_balances: asNumber(
            row.total_provider_balances
        ),

        total_amount: totalAmount,

        total_amount_dana: totalAmountDana,

        total_balance:
            totalAmount + totalAmountDana,
    };
};

// GET /balances
const getAllBalances = async (
    signal?: AbortSignal
): Promise<ProviderBalanceData[]> => {
    const response = await apiRequest(
        "/balances",
        { signal }
    );

    return extractArray(response)
        .map(normalizeBalance)
        .filter(
            (item): item is ProviderBalanceData =>
                item !== null
        );
};

// GET /balances/summary
const getBalanceSummary = async (
    signal?: AbortSignal
): Promise<BalanceSummary> => {
    const response = await apiRequest(
        "/balances/summary",
        { signal }
    );

    return normalizeSummary(
        extractObject(response)
    );
};

// GET /balances/:id
const getBalanceById = async (
    id: number,
    signal?: AbortSignal
): Promise<ProviderBalanceData> => {
    const response = await apiRequest(
        `/balances/${id}`,
        { signal }
    );

    const balance = normalizeBalance(
        extractObject(response)
    );

    if (!balance) {
        throw new Error(
            "Data detail saldo tidak valid."
        );
    }

    return balance;
};

// GET /balances/provider/:id_provider
const getBalanceByProvider = async (
    idProvider: number,
    signal?: AbortSignal
): Promise<ProviderBalanceData> => {
    const response = await apiRequest(
        `/balances/provider/${idProvider}`,
        { signal }
    );

    const balance = normalizeBalance(
        extractObject(response)
    );

    if (!balance) {
        throw new Error(
            "Data saldo provider tidak valid."
        );
    }

    return balance;
};

const ProviderStatusBadge = ({
    status,
}: {
    status: string;
}) => {
    const normalized =
        status.trim().toUpperCase();

    const isActive =
        ["APPROVED", "ACTIVE", "TRUE"].includes(
            normalized
        );

    const isRejected =
        ["REJECTED", "INACTIVE", "FALSE"].includes(
            normalized
        );

    const className = isActive
        ? "bg-emerald-50 text-emerald-700"
        : isRejected
            ? "bg-red-50 text-red-700"
            : normalized === "PENDING"
                ? "bg-amber-50 text-amber-700"
                : "bg-slate-100 text-slate-600";

    const label =
        normalized.length > 0
            ? normalized.charAt(0) +
            normalized.slice(1).toLowerCase()
            : "Unknown";

    return (
        <span
            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${className}`}
        >
            {label}
        </span>
    );
};

const StatCard = ({
    title,
    value,
    description,
    icon,
    loading = false,
}: StatCardProps) => (
    <div className="rounded-2xl border border-[#DBE4F0] bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-[#526789]">
            {icon}

            <span className="text-xs font-semibold">
                {title}
            </span>
        </div>

        <p className="wrap-break-word text-2xl font-bold text-slate-950 xl:text-[27px]">
            {loading ? "—" : value}
        </p>

        <p className="mt-2 text-xs text-[#526789]">
            {description}
        </p>
    </div>
);

const InfoField = ({
    label,
    value,
}: InfoFieldProps) => (
    <div className="min-w-0">
        <p className="text-xs text-[#526789]">
            {label}
        </p>

        <div className="mt-1 wrap-break-word text-sm font-medium text-slate-900">
            {value}
        </div>
    </div>
);

const Modal = ({
    title,
    children,
    footer,
    onClose,
    wide = false,
}: ModalProps) => {
    useEffect(() => {
        const handleEscape = (
            event: KeyboardEvent
        ) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener(
            "keydown",
            handleEscape
        );

        return () => {
            document.removeEventListener(
                "keydown",
                handleEscape
            );
        };
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4"
            onMouseDown={(event) => {
                if (
                    event.target ===
                    event.currentTarget
                ) {
                    onClose();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={`flex w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${wide
                    ? "h-[min(680px,90dvh)] max-w-2xl"
                    : "max-h-[90dvh] max-w-md"
                    }`}
            >
                {/* HEADER */}
                <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
                    <h2 className="text-lg font-bold text-slate-950">
                        {title}
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Tutup popup"
                        className="cursor-pointer rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                    >
                        <X size={19} />
                    </button>
                </div>

                {/* SCROLLABLE CONTENT */}
                <div className="min-h-0 flex-1 overflow-y-auto p-5 scrollbar-gutter-stable">
                    {children}
                </div>

                {/* FIXED FOOTER */}
                {footer && (
                    <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

const ProviderBalance = () => {
    const [balances, setBalances] =
        useState<ProviderBalanceData[]>([]);

    const [summary, setSummary] =
        useState<BalanceSummary | null>(
            null
        );

    const [selectedBalance, setSelectedBalance] =
        useState<ProviderBalanceData | null>(
            null
        );

    const [detail, setDetail] =
        useState<ProviderBalanceData | null>(
            null
        );

    const [search, setSearch] =
        useState("");

    const [statusFilter, setStatusFilter] =
        useState("ALL");

    const [sort, setSort] =
        useState<SortType>("newest");

    const [page, setPage] =
        useState(1);

    const [modal, setModal] =
        useState<ModalType>(null);

    const [detailLoading, setDetailLoading] =
        useState(false);

    const [detailError, setDetailError] =
        useState("");

    const [loading, setLoading] =
        useState(true);

    const [summaryLoading, setSummaryLoading] =
        useState(true);

    const [listError, setListError] =
        useState("");

    const [summaryError, setSummaryError] =
        useState("");

    const [notice, setNotice] =
        useState<Notice | null>(null);

    const [refreshKey, setRefreshKey] =
        useState(0);

    useEffect(() => {
        const controller = new AbortController();

        const loadData = async () => {
            setLoading(true);
            setSummaryLoading(true);

            setListError("");
            setSummaryError("");

            const results = await Promise.allSettled([
                getAllBalances(controller.signal),
                getBalanceSummary(controller.signal),
            ]);

            if (controller.signal.aborted) {
                return;
            }

            const [
                balancesResult,
                summaryResult,
            ] = results;

            // LIST
            if (
                balancesResult.status ===
                "fulfilled"
            ) {
                setBalances(
                    balancesResult.value
                );
            } else {
                setBalances([]);

                setListError(
                    getErrorMessage(
                        balancesResult.reason
                    )
                );
            }

            // GLOBAL SUMMARY
            if (
                summaryResult.status ===
                "fulfilled"
            ) {
                setSummary(
                    summaryResult.value
                );
            } else {
                setSummary(null);

                setSummaryError(
                    getErrorMessage(
                        summaryResult.reason
                    )
                );
            }

            setLoading(false);
            setSummaryLoading(false);
        };

        void loadData();

        return () => {
            controller.abort();
        };
    }, [refreshKey]);

    const statusOptions = useMemo(
        () =>
            Array.from(
                new Set(
                    balances.map(
                        (balance) =>
                            balance.status_provider ||
                            "UNKNOWN"
                    )
                )
            ).sort(),
        [balances]
    );

    const filteredBalances = useMemo(() => {
        const keyword = search
            .trim()
            .toLowerCase();

        const result = balances.filter(
            (balance) => {
                const fields = [
                    balance.name_provider,
                    String(
                        balance.id_provider
                    ),
                    String(
                        balance.id_balance ?? ""
                    ),
                    balance.status_provider,
                ];

                const matchSearch =
                    fields.some((field) =>
                        field
                            .toLowerCase()
                            .includes(keyword)
                    );

                const status =
                    balance.status_provider ||
                    "UNKNOWN";

                const matchStatus =
                    statusFilter === "ALL" ||
                    status === statusFilter;

                return (
                    matchSearch &&
                    matchStatus
                );
            }
        );

        result.sort((a, b) => {
            if (sort === "highest") {
                return (
                    b.total_balance -
                    a.total_balance
                );
            }

            if (sort === "lowest") {
                return (
                    a.total_balance -
                    b.total_balance
                );
            }

            if (sort === "name") {
                return a.name_provider.localeCompare(
                    b.name_provider
                );
            }

            return (
                (b.id_balance ?? 0) -
                (a.id_balance ?? 0)
            );
        });

        return result;
    }, [
        balances,
        search,
        statusFilter,
        sort,
    ]);

    const totalPages = Math.max(
        1,
        Math.ceil(
            filteredBalances.length /
            PAGE_SIZE
        )
    );

    const currentPage = Math.min(
        page,
        totalPages
    );

    const displayedBalances =
        filteredBalances.slice(
            (currentPage - 1) *
            PAGE_SIZE,

            currentPage *
            PAGE_SIZE
        );

    const closeModal = useCallback(
        () => {
            setModal(null);
            setSelectedBalance(null);
            setDetail(null);
            setDetailError("");
            setDetailLoading(false);
        },
        []
    );

    const openDetail = (
        balance: ProviderBalanceData
    ) => {
        setSelectedBalance(balance);
        setDetail(null);
        setDetailError("");

        setModal("detail");
    };

    const openProviderBalance = (
        balance: ProviderBalanceData
    ) => {
        setSelectedBalance(balance);
        setDetail(null);
        setDetailError("");

        setModal("provider");
    };

    const selectedBalanceId =
        selectedBalance?.id_balance ??
        null;

    const selectedProviderId =
        selectedBalance?.id_provider ??
        null;

    useEffect(() => {
        if (
            modal === null ||
            selectedProviderId === null
        ) {
            return;
        }

        const controller =
            new AbortController();

        const loadDetail = async () => {
            setDetailLoading(true);
            setDetailError("");

            try {
                let result: ProviderBalanceData;

                if (
                    modal === "detail" &&
                    selectedBalanceId !== null
                ) {
                    result = await getBalanceById(
                        selectedBalanceId,
                        controller.signal
                    );
                } else {
                    result = await getBalanceByProvider(
                        selectedProviderId,
                        controller.signal
                    );
                }

                if (!controller.signal.aborted) {
                    setDetail(result);
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    setDetailError(
                        getErrorMessage(error)
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setDetailLoading(false);
                }
            }
        };

        void loadDetail();

        return () => {
            controller.abort();
        };
    }, [
        modal,
        selectedBalanceId,
        selectedProviderId,
    ]);

    const refreshData = () => {
        setNotice(null);
        setRefreshKey(
            (value) => value + 1
        );
    };

    const activeBalance =
        detail?.id_provider ===
            selectedBalance?.id_provider
            ? detail
            : selectedBalance;

    const renderModal = () => {
        if (
            !modal ||
            !activeBalance
        ) {
            return null;
        }

        const balance = activeBalance;

        return (
            <Modal
                title={
                    modal === "provider"
                        ? "Saldo Provider"
                        : "Detail Saldo Provider"
                }
                onClose={closeModal}
                wide
                footer={
                    <>
                        <button
                            type="button"
                            onClick={closeModal}
                            className={
                                secondaryButton
                            }
                        >
                            Tutup
                        </button>

                        {modal === "detail" && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (selectedBalance) {
                                        openProviderBalance(
                                            selectedBalance
                                        );
                                    }
                                }}
                                className={
                                    primaryButton
                                }
                            >
                                <Building2
                                    size={16}
                                />

                                Cek Saldo Provider
                            </button>
                        )}
                    </>
                }
            >
                {/* DETAIL ERROR */}
                {detailError && (
                    <div
                        role="alert"
                        className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700"
                    >
                        <AlertCircle
                            size={16}
                            className="shrink-0"
                        />

                        <span>
                            Detail terbaru belum dapat dimuat:
                            {" "}
                            {detailError}.
                            {" "}
                            Data dari daftar tetap ditampilkan.
                        </span>
                    </div>
                )}

                {/* DETAIL LOADING */}
                {detailLoading && (
                    <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
                        <LoaderCircle
                            size={15}
                            className="animate-spin"
                        />

                        Memuat detail saldo...
                    </div>
                )}

                {/* HEADER */}
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0866D8]">
                            <Building2 size={27} />
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-slate-950">
                                {balance.name_provider ||
                                    `Provider #${balance.id_provider}`}
                            </h3>

                            <p className="mt-1 text-xs text-slate-500">
                                Provider ID:
                                {" "}
                                {balance.id_provider}
                            </p>
                        </div>
                    </div>

                    {balance.status_provider && (
                        <ProviderStatusBadge
                            status={
                                balance.status_provider
                            }
                        />
                    )}
                </div>

                {/* TOTAL BALANCE */}
                <div className="mb-5 rounded-xl bg-[#0866D8] p-5 text-white">
                    <div className="flex items-center gap-2 text-blue-100">
                        <Wallet size={17} />

                        <span className="text-xs font-medium">
                            Total Saldo Provider
                        </span>
                    </div>

                    <p className="mt-3 wrap-break-word text-3xl font-bold">
                        {formatCurrency(
                            balance.total_balance
                        )}
                    </p>

                    <p className="mt-2 text-xs text-blue-100">
                        Total Amount + Total Amount DANA
                    </p>
                </div>

                {/* BALANCE BREAKDOWN */}
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-[#DBE4F0] bg-white p-4">
                        <div className="flex items-center gap-2 text-[#526789]">
                            <CreditCard
                                size={17}
                            />

                            <span className="text-xs font-semibold">
                                Saldo Non-DANA
                            </span>
                        </div>

                        <p className="mt-3 wrap-break-word text-xl font-bold text-slate-900">
                            {formatCurrency(
                                balance.total_amount
                            )}
                        </p>

                        <p className="mt-2 text-xs text-slate-500">
                            Field: total_amount
                        </p>
                    </div>

                    <div className="rounded-xl border border-[#DBE4F0] bg-white p-4">
                        <div className="flex items-center gap-2 text-[#526789]">
                            <Landmark
                                size={17}
                            />

                            <span className="text-xs font-semibold">
                                Saldo DANA
                            </span>
                        </div>

                        <p className="mt-3 wrap-break-word text-xl font-bold text-slate-900">
                            {formatCurrency(
                                balance.total_amount_dana
                            )}
                        </p>

                        <p className="mt-2 text-xs text-slate-500">
                            Field: total_amount_dana
                        </p>
                    </div>
                </div>

                {/* PROVIDER INFORMATION */}
                <section className="mt-6 border-t border-slate-100 pt-5">
                    <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#00357A]">
                        <Building2 size={17} />

                        Informasi Provider
                    </h4>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <InfoField
                            label="ID Balance"
                            value={
                                balance.id_balance ??
                                "Belum tersedia"
                            }
                        />

                        <InfoField
                            label="ID Provider"
                            value={
                                balance.id_provider
                            }
                        />

                        <InfoField
                            label="Nama Provider"
                            value={
                                balance.name_provider ||
                                "—"
                            }
                        />

                        <InfoField
                            label="Status Provider"
                            value={
                                balance.status_provider
                                    ? (
                                        <ProviderStatusBadge
                                            status={
                                                balance.status_provider
                                            }
                                        />
                                    )
                                    : "—"
                            }
                        />
                    </div>
                </section>

                {/* AMOUNT SUMMARY */}
                <section className="mt-6 border-t border-slate-100 pt-5">
                    <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#00357A]">
                        <CircleDollarSign
                            size={17}
                        />

                        Ringkasan Saldo
                    </h4>

                    <div className="space-y-3 rounded-xl bg-[#F5F8FC] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs text-[#526789]">
                                Total Amount
                            </span>

                            <span className="text-sm font-semibold text-slate-800">
                                {formatCurrency(
                                    balance.total_amount
                                )}
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs text-[#526789]">
                                Total Amount DANA
                            </span>

                            <span className="text-sm font-semibold text-slate-800">
                                {formatCurrency(
                                    balance.total_amount_dana
                                )}
                            </span>
                        </div>

                        <div className="border-t border-[#DBE4F0] pt-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-sm font-bold text-slate-900">
                                    Total Balance
                                </span>

                                <span className="text-base font-bold text-[#0866D8]">
                                    {formatCurrency(
                                        balance.total_balance
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* READ ONLY NOTICE */}
                <div className="mt-5 rounded-lg bg-blue-50 p-3 text-xs leading-relaxed text-blue-800">
                    Informasi saldo ditampilkan langsung
                    berdasarkan API backend. Perubahan saldo
                    dilakukan oleh proses transaksi dan
                    settlement, bukan melalui halaman ini.
                </div>
            </Modal>
        );
    };

    return (
        <div className="min-h-full p-4 sm:p-6 lg:p-8">
            {/* HEADER */}
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="mb-1 text-xs text-[#344F77]">
                        Provider & Keuangan / Saldo Provider
                    </p>

                    <h1 className="text-2xl font-bold text-slate-950 sm:text-[28px]">
                        Saldo Provider
                    </h1>

                    <p className="mt-2 text-sm text-[#526789]">
                        Monitoring total saldo, saldo DANA,
                        dan saldo lainnya untuk seluruh provider.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={refreshData}
                    disabled={
                        loading ||
                        summaryLoading
                    }
                    className={
                        secondaryButton
                    }
                >
                    <RefreshCw
                        size={16}
                        className={
                            loading ||
                                summaryLoading
                                ? "animate-spin"
                                : ""
                        }
                    />

                    Refresh
                </button>
            </div>

            {/* GLOBAL SUMMARY ERROR */}
            {summaryError && (
                <div
                    role="alert"
                    className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3"
                >
                    <AlertCircle
                        size={18}
                        className="shrink-0 text-amber-600"
                    />

                    <p className="text-sm text-amber-800">
                        Ringkasan saldo tidak dapat dimuat:
                        {" "}
                        {summaryError}
                    </p>
                </div>
            )}

            {/* NOTICE */}
            {notice && (
                <div
                    role="alert"
                    className={`mb-5 flex items-start gap-3 rounded-xl border p-3 ${notice.type === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-700"
                        }`}
                >
                    <CheckCircle2
                        size={18}
                    />

                    <p className="flex-1 text-sm">
                        {notice.message}
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            setNotice(null)
                        }
                        aria-label="Tutup notifikasi"
                        className="cursor-pointer"
                    >
                        <X size={17} />
                    </button>
                </div>
            )}

            {/* STATISTICS */}
            <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
                <StatCard
                    title="Total Provider Balance"
                    value={
                        summary
                            ? formatNumber(
                                summary.total_provider_balances
                            )
                            : "—"
                    }
                    description="Provider yang memiliki record balance"
                    icon={
                        <Building2 size={19} />
                    }
                    loading={summaryLoading}
                />

                <StatCard
                    title="Total Saldo"
                    value={
                        summary
                            ? formatCurrency(
                                summary.total_balance
                            )
                            : "—"
                    }
                    description="Gabungan saldo seluruh provider"
                    icon={
                        <Wallet size={19} />
                    }
                    loading={summaryLoading}
                />

                <StatCard
                    title="Total Saldo Non-DANA"
                    value={
                        summary
                            ? formatCurrency(
                                summary.total_amount
                            )
                            : "—"
                    }
                    description="Akumulasi total saldo Non DANA"
                    icon={
                        <CreditCard size={19} />
                    }
                    loading={summaryLoading}
                />

                <StatCard
                    title="Total Saldo DANA"
                    value={
                        summary
                            ? formatCurrency(
                                summary.total_amount_dana
                            )
                            : "—"
                    }
                    description="Akumulasi total saldo DANA"
                    icon={
                        <Landmark size={19} />
                    }
                    loading={summaryLoading}
                />
            </div>

            {/* TABLE CONTAINER */}
            <section className="overflow-hidden rounded-2xl border border-[#DBE4F0] bg-white shadow-sm">
                {/* TABLE HEADER + FILTERS */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
                    <div>
                        <h2 className="text-sm font-bold text-slate-950">
                            Daftar Saldo Provider
                        </h2>

                        <p className="mt-1 text-xs text-[#526789]">
                            {loading
                                ? "Memuat..."
                                : `${filteredBalances.length} data saldo`}
                        </p>
                    </div>

                    <div className="flex w-full flex-wrap gap-2 xl:w-auto">
                        {/* SEARCH */}
                        <div className="relative min-w-47.5 flex-1 xl:w-56">
                            <Search
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />

                            <input
                                value={search}
                                onChange={(event) => {
                                    setSearch(
                                        event.target.value
                                    );

                                    setPage(1);
                                }}
                                placeholder="Cari provider..."
                                className={`${inputClass} pl-10`}
                            />
                        </div>

                        {/* STATUS FILTER */}
                        <select
                            value={statusFilter}
                            onChange={(event) => {
                                setStatusFilter(
                                    event.target.value
                                );

                                setPage(1);
                            }}
                            aria-label="Filter status provider"
                            className={filterClass}
                        >
                            <option value="ALL">
                                Semua Status
                            </option>

                            {statusOptions.map(
                                (status) => (
                                    <option
                                        key={status}
                                        value={status}
                                    >
                                        {status}
                                    </option>
                                )
                            )}
                        </select>

                        {/* SORT */}
                        <select
                            value={sort}
                            onChange={(event) => {
                                setSort(
                                    event.target.value as SortType
                                );

                                setPage(1);
                            }}
                            aria-label="Urutkan saldo provider"
                            className={filterClass}
                        >
                            <option value="newest">
                                ID Balance Terbaru
                            </option>

                            <option value="highest">
                                Saldo Tertinggi
                            </option>

                            <option value="lowest">
                                Saldo Terendah
                            </option>

                            <option value="name">
                                Nama Provider A–Z
                            </option>
                        </select>
                    </div>
                </div>

                {/* TABLE BODY */}
                {loading ? (
                    <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-500">
                        <LoaderCircle
                            size={18}
                            className="animate-spin text-[#0866D8]"
                        />

                        Memuat data saldo provider...
                    </div>
                ) : listError ? (
                    <div
                        role="alert"
                        className="flex items-start gap-2 p-5 text-sm text-red-600"
                    >
                        <AlertCircle
                            size={18}
                            className="shrink-0"
                        />

                        <span>
                            {listError}
                        </span>
                    </div>
                ) : filteredBalances.length === 0 ? (
                    <div className="flex min-h-44 flex-col items-center justify-center gap-3 p-6 text-center">
                        <Wallet
                            size={30}
                            className="text-slate-300"
                        />

                        <p className="text-sm text-slate-500">
                            Data saldo provider tidak ditemukan.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead className="bg-[#F5F8FC]">
                                <tr>
                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        No.
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        Provider
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        ID Balance
                                    </th>

                                    <th className="px-5 py-3 text-right text-xs font-semibold text-[#344F77]">
                                        Saldo Non-DANA
                                    </th>

                                    <th className="px-5 py-3 text-right text-xs font-semibold text-[#344F77]">
                                        Saldo DANA
                                    </th>

                                    <th className="px-5 py-3 text-right text-xs font-semibold text-[#344F77]">
                                        Total Saldo
                                    </th>

                                    <th className="px-5 py-3 text-center text-xs font-semibold text-[#344F77]">
                                        Status
                                    </th>

                                    <th className="px-5 py-3 text-center text-xs font-semibold text-[#344F77]">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {displayedBalances.map(
                                    (
                                        balance,
                                        index
                                    ) => (
                                        <tr
                                            key={
                                                balance.id_balance ??
                                                `provider-${balance.id_provider}`
                                            }
                                            className="border-t border-slate-100 hover:bg-slate-50"
                                        >
                                            {/* NUMBER */}
                                            <td className="px-5 py-4 text-slate-500">
                                                {(currentPage - 1) *
                                                    PAGE_SIZE +
                                                    index +
                                                    1}
                                            </td>

                                            {/* PROVIDER */}
                                            <td className="px-5 py-4">
                                                <div className="flex min-w-43.75 items-center gap-3">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0866D8]">
                                                        <Building2
                                                            size={19}
                                                        />
                                                    </div>

                                                    <div>
                                                        <p className="font-semibold text-slate-950">
                                                            {balance.name_provider ||
                                                                `Provider #${balance.id_provider}`}
                                                        </p>

                                                        <p className="mt-1 text-xs text-slate-500">
                                                            Provider ID:
                                                            {" "}
                                                            {balance.id_provider}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* BALANCE ID */}
                                            <td className="px-5 py-4 text-slate-600">
                                                {balance.id_balance ??
                                                    "—"}
                                            </td>

                                            {/* NON-DANA */}
                                            <td className="whitespace-nowrap px-5 py-4 text-right font-medium text-slate-700">
                                                {formatCurrency(
                                                    balance.total_amount
                                                )}
                                            </td>

                                            {/* DANA */}
                                            <td className="whitespace-nowrap px-5 py-4 text-right font-medium text-slate-700">
                                                {formatCurrency(
                                                    balance.total_amount_dana
                                                )}
                                            </td>

                                            {/* TOTAL */}
                                            <td className="whitespace-nowrap px-5 py-4 text-right font-bold text-[#0866D8]">
                                                {formatCurrency(
                                                    balance.total_balance
                                                )}
                                            </td>

                                            {/* STATUS */}
                                            <td className="px-5 py-4 text-center">
                                                <ProviderStatusBadge
                                                    status={
                                                        balance.status_provider
                                                    }
                                                />
                                            </td>

                                            {/* ACTIONS */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => openDetail(balance)}
                                                        title="Detail Saldo"
                                                        aria-label={`Detail saldo provider ${balance.id_provider}`}
                                                        className={`${iconButtonClass} bg-blue-50 text-[#0866D8] hover:bg-blue-100`}
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* PAGINATION */}
                {!loading &&
                    !listError &&
                    filteredBalances.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
                            <p className="text-xs text-[#526789]">
                                Menampilkan{" "}
                                {(currentPage - 1) *
                                    PAGE_SIZE +
                                    1}
                                –
                                {Math.min(
                                    currentPage *
                                    PAGE_SIZE,
                                    filteredBalances.length
                                )}{" "}
                                dari{" "}
                                {filteredBalances.length}
                            </p>

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    disabled={
                                        currentPage === 1
                                    }
                                    onClick={() =>
                                        setPage(
                                            (value) =>
                                                Math.max(
                                                    1,
                                                    value - 1
                                                )
                                        )
                                    }
                                    aria-label="Halaman sebelumnya"
                                    className="cursor-pointer rounded-lg border border-[#DBE4F0] p-2 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <ChevronLeft
                                        size={17}
                                    />
                                </button>

                                <span className="text-xs font-semibold">
                                    {currentPage}
                                    {" / "}
                                    {totalPages}
                                </span>

                                <button
                                    type="button"
                                    disabled={
                                        currentPage >=
                                        totalPages
                                    }
                                    onClick={() =>
                                        setPage(
                                            (value) =>
                                                Math.min(
                                                    totalPages,
                                                    value + 1
                                                )
                                        )
                                    }
                                    aria-label="Halaman berikutnya"
                                    className="cursor-pointer rounded-lg border border-[#DBE4F0] p-2 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <ChevronRight
                                        size={17}
                                    />
                                </button>
                            </div>
                        </div>
                    )}
            </section>

            {/* MODALS */}
            {renderModal()}
        </div>
    );
};

export default ProviderBalance;
