import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

import {
    AlertCircle,
    ArrowRightLeft,
    Building2,
    CalendarDays,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    CircleDollarSign,
    Clock3,
    Eye,
    FileCheck2,
    LoaderCircle,
    Plus,
    RefreshCw,
    Search,
    Wallet,
    X,
} from "lucide-react";

const PAGE_SIZE = 10;

type ApiRecord = Record<string, unknown>;
type ModalType = "detail" | "generate" | "reconcile" | null;

interface SettlementData {
    id_settlement: number;
    id_provider: number | null;
    id_bank_account: number | null;
    provider_name: string;
    settlement_number: string;
    status: string;
    total_amount: number | null;
    gross_amount: number | null;
    fee_amount: number | null;
    net_amount: number | null;
    total_orders: number | null;
    period_start: string;
    period_end: string;
    created_at: string;
    settled_at: string;
    reconciled_at: string;
    raw: ApiRecord;
}

interface ProviderData {
    id_provider: number;
    name_provider: string;
}

interface Notice {
    type: "success" | "error";
    message: string;
}

interface ModalProps {
    title: string;
    children: ReactNode;
    footer?: ReactNode;
    onClose: () => void;
    busy?: boolean;
    wide?: boolean;
}

interface InfoFieldProps {
    label: string;
    value: ReactNode;
}

const primaryButton =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#0866D8] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#DBE4F0] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

const successButton =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50";

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
    if (value === null || value === undefined) return "";
    return String(value);
};

const asId = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const number = Number(value);

    return Number.isSafeInteger(number) && number > 0
        ? number
        : null;
};

const asNumber = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    if (typeof value !== "string" && typeof value !== "number") {
        return null;
    }

    const number = Number(value);

    return Number.isFinite(number) ? number : null;
};

const firstValue = (
    row: ApiRecord,
    keys: readonly string[]
): unknown => {
    for (const key of keys) {
        const value = row[key];

        if (value !== null && value !== undefined && value !== "") {
            return value;
        }
    }

    return null;
};

const firstText = (
    row: ApiRecord,
    keys: readonly string[]
): string => asText(firstValue(row, keys));

const firstNumber = (
    row: ApiRecord,
    keys: readonly string[]
): number | null => asNumber(firstValue(row, keys));

const getErrorMessage = (error: unknown): string =>
    error instanceof Error
        ? error.message
        : "Terjadi kesalahan. Silakan coba kembali.";

const getToken = (): string | null =>
    sessionStorage.getItem("admin_token") ??
    localStorage.getItem("admin_token");

const formatCurrency = (value: number | null): string => {
    if (value === null) return "—";

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(value);
};

const formatDate = (value: string): string => {
    if (!value) return "—";

    // SQL DATETIME tanpa zona waktu ditampilkan apa adanya
    // supaya tidak bergeser tanggal/jam karena timezone.
    const sql = value.match(
        /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::\d{2})?)?$/
    );

    if (sql) {
        return `${sql[3]}/${sql[2]}/${sql[1]}${sql[4] ? ` ${sql[4]}:${sql[5]} WIB` : ""
            }`;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta",
    }).format(date);
};

const normalizeStatus = (value: unknown): string => {
    const status = asText(value).trim().toUpperCase();
    return status || "UNKNOWN";
};

const isReconciled = (settlement: SettlementData): boolean =>
    ["RECONCILED", "COMPLETED"].includes(settlement.status) ||
    Boolean(settlement.reconciled_at);

const extractArray = (
    payload: unknown,
    keys: string[],
    depth = 0
): ApiRecord[] => {
    if (Array.isArray(payload)) {
        if (!payload.every(isRecord)) {
            throw new Error("Format daftar API tidak valid.");
        }

        return payload;
    }

    if (!isRecord(payload) || depth > 6) {
        throw new Error("Format respons API tidak valid.");
    }

    if (payload.success === false) {
        throw new Error(
            typeof payload.message === "string"
                ? payload.message
                : "Request API gagal."
        );
    }

    for (const key of [
        ...keys,
        "data",
        "items",
        "rows",
        "results",
    ]) {
        const value = payload[key];

        if (Array.isArray(value)) {
            return extractArray(value, keys, depth + 1);
        }

        if (isRecord(value)) {
            try {
                return extractArray(value, keys, depth + 1);
            } catch {
                // Coba field lain.
            }
        }
    }

    throw new Error("Daftar data tidak ditemukan.");
};

const extractObject = (
    payload: unknown,
    depth = 0
): ApiRecord => {
    if (!isRecord(payload) || depth > 6) {
        throw new Error("Format detail API tidak valid.");
    }

    if (payload.success === false) {
        throw new Error(
            typeof payload.message === "string"
                ? payload.message
                : "Gagal mengambil detail settlement."
        );
    }

    if (
        asId(payload.id_provider_settlement) !== null ||
        asId(payload.id_settlement) !== null
    ) {
        return payload;
    }

    for (const key of [
        "settlement",
        "provider_settlement",
        "providerSettlement",
        "data",
        "result",
    ]) {
        if (isRecord(payload[key])) {
            try {
                return extractObject(payload[key], depth + 1);
            } catch {
                // Coba field lain.
            }
        }
    }

    throw new Error("Detail settlement tidak ditemukan.");
};

const normalizeSettlement = (
    row: ApiRecord
): SettlementData | null => {
    const id =
        asId(row.id_provider_settlement) ??
        asId(row.id_settlement);

    if (id === null) return null;

    const nestedProvider = isRecord(row.provider)
        ? row.provider
        : null;

    return {
        id_settlement: id,

        id_provider:
            asId(row.id_provider) ??
            asId(nestedProvider?.id_provider),

        id_bank_account:
            asId(row.id_provider_bank_account) ??
            asId(row.id_bank_account),

        provider_name:
            firstText(row, [
                "name_provider",
                "provider_name",
            ]) ||
            asText(nestedProvider?.name_provider),

        settlement_number: firstText(row, [
            "settlement_number",
            "settlement_code",
            "reference_number",
            "reference_no",
        ]),

        status: normalizeStatus(
            firstValue(row, [
                "settlement_status",
                "status_settlement",
                "status",
            ])
        ),

        total_amount: firstNumber(row, [
            "total_amount",
            "total_settlement",
            "amount_settlement",
        ]),

        gross_amount: firstNumber(row, [
            "gross_amount",
            "total_gross_amount",
        ]),

        fee_amount: firstNumber(row, [
            "fee_amount",
            "total_fee",
            "admin_fee",
        ]),

        net_amount: firstNumber(row, [
            "net_amount",
            "total_net_amount",
            "settlement_amount",
            "amount",
        ]),

        total_orders: firstNumber(row, [
            "total_orders",
            "total_order",
            "order_count",
            "transaction_count",
        ]),

        period_start: firstText(row, [
            "period_start",
            "start_date",
            "period_start_at",
        ]),

        period_end: firstText(row, [
            "period_end",
            "end_date",
            "period_end_at",
        ]),

        created_at: firstText(row, [
            "created_at",
            "generated_at",
            "createdAt",
        ]),

        settled_at: firstText(row, [
            "settled_at",
            "paid_at",
            "completed_at",
        ]),

        reconciled_at: firstText(row, [
            "reconciled_at",
            "reconcile_at",
        ]),

        raw: row,
    };
};

const normalizeProvider = (
    row: ApiRecord
): ProviderData | null => {
    const id = asId(row.id_provider);

    if (id === null) return null;

    return {
        id_provider: id,
        name_provider: asText(row.name_provider),
    };
};

class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
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
            "Token admin tidak tersedia. Silakan login kembali."
        );
    }

    const headers = new Headers(options.headers);

    headers.set("Accept", "application/json");
    headers.set("Authorization", `Bearer ${token}`);

    if (options.body && !(options.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${import.meta.env.VITE_API_URI}${endpoint}`, {
        ...options,
        headers,
    });

    const contentType =
        response.headers.get("content-type") ?? "";

    const payload: unknown = contentType.includes("application/json")
        ? await response.json()
        : (await response.text()) || null;

    if (!response.ok) {
        const message =
            isRecord(payload) &&
                typeof payload.message === "string"
                ? payload.message
                : response.status === 401
                    ? "Token tidak diterima oleh endpoint ini."
                    : response.status === 403
                        ? "Anda tidak memiliki izin melakukan aksi ini."
                        : `Request gagal (HTTP ${response.status}).`;

        throw new ApiError(response.status, message);
    }

    if (isRecord(payload) && payload.success === false) {
        throw new Error(
            typeof payload.message === "string"
                ? payload.message
                : "Operasi API gagal."
        );
    }

    return payload;
};

const getAllSettlements = async (
    signal?: AbortSignal
): Promise<SettlementData[]> => {
    const response = await apiRequest(
        "/provider-settlement/get-all",
        { signal }
    );

    const rows = extractArray(response, [
        "settlements",
        "provider_settlements",
        "providerSettlements",
    ]);

    return rows
        .map(normalizeSettlement)
        .filter(
            (item): item is SettlementData => item !== null
        );
};

const getSettlementDetail = async (
    id: number,
    signal?: AbortSignal
): Promise<SettlementData> => {
    const response = await apiRequest(
        `/provider-settlement/${id}`,
        { signal }
    );

    const settlement = normalizeSettlement(
        extractObject(response)
    );

    if (!settlement) {
        throw new Error("Data detail settlement tidak valid.");
    }

    return settlement;
};

const generateSettlement = async (): Promise<unknown> =>
    apiRequest("/provider-settlement/generate", {
        method: "POST",
    });

const reconcileSettlement = async (
    id: number
): Promise<unknown> =>
    apiRequest(`/provider-settlement/${id}/reconcile`, {
        method: "POST",
    });

const getAllProviders = async (
    signal?: AbortSignal
): Promise<ProviderData[]> => {
    const response = await apiRequest(
        "/provider/get-all",
        { signal }
    );

    return extractArray(response, ["providers", "provider"])
        .map(normalizeProvider)
        .filter(
            (item): item is ProviderData => item !== null
        );
};

const StatusBadge = ({ status }: { status: string }) => {
    const normalized = normalizeStatus(status);

    const styles =
        ["RECONCILED", "COMPLETED", "SUCCESS", "PAID"].includes(
            normalized
        )
            ? "bg-emerald-50 text-emerald-700"
            : ["PENDING", "GENERATED", "PROCESSING"].includes(
                normalized
            )
                ? "bg-amber-50 text-amber-700"
                : ["FAILED", "REJECTED", "CANCELLED"].includes(
                    normalized
                )
                    ? "bg-red-50 text-red-700"
                    : "bg-slate-100 text-slate-600";

    return (
        <span
            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${styles}`}
        >
            {normalized
                .split("_")
                .map(
                    (part) =>
                        part.charAt(0) + part.slice(1).toLowerCase()
                )
                .join(" ")}
        </span>
    );
};

const InfoField = ({
    label,
    value,
}: InfoFieldProps) => (
    <div className="min-w-0">
        <p className="text-xs text-[#526789]">{label}</p>
        <div className="mt-1 wrap-break-word text-sm font-medium text-slate-900">
            {value === null ||
                value === undefined ||
                value === ""
                ? "—"
                : value}
        </div>
    </div>
);

const Modal = ({
    title,
    children,
    footer,
    onClose,
    busy = false,
    wide = false,
}: ModalProps) => {
    useEffect(() => {
        const listener = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !busy) {
                onClose();
            }
        };

        document.addEventListener("keydown", listener);

        return () => document.removeEventListener("keydown", listener);
    }, [busy, onClose]);

    return (
        <div
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4"
            onMouseDown={(event) => {
                if (
                    event.target === event.currentTarget &&
                    !busy
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
                    ? "h-[min(730px,90dvh)] max-w-3xl"
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
                        disabled={busy}
                        aria-label="Tutup popup"
                        className="cursor-pointer rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
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

const Settlement = () => {
    const [settlements, setSettlements] = useState<
        SettlementData[]
    >([]);

    const [providers, setProviders] = useState<
        ProviderData[]
    >([]);

    const [selected, setSelected] = useState<
        SettlementData | null
    >(null);

    const [detail, setDetail] = useState<
        SettlementData | null
    >(null);

    const [modal, setModal] = useState<ModalType>(null);
    const [saving, setSaving] = useState(false);
    const [modalError, setModalError] = useState("");

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [providerFilter, setProviderFilter] = useState("ALL");
    const [page, setPage] = useState(1);

    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [listError, setListError] = useState("");
    const [detailError, setDetailError] = useState("");
    const [notice, setNotice] = useState<Notice | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const controller = new AbortController();

        const load = async () => {
            setLoading(true);
            setListError("");

            const results = await Promise.allSettled([
                getAllSettlements(controller.signal),
                getAllProviders(controller.signal),
            ]);

            if (controller.signal.aborted) return;

            const [settlementResult, providerResult] = results;

            if (settlementResult.status === "fulfilled") {
                setSettlements(settlementResult.value);
            } else {
                setSettlements([]);
                setListError(
                    getErrorMessage(settlementResult.reason)
                );
            }

            setProviders(
                providerResult.status === "fulfilled"
                    ? providerResult.value
                    : []
            );

            setLoading(false);
        };

        void load();

        return () => controller.abort();
    }, [refreshKey]);

    const providerName = useCallback(
        (settlement: SettlementData): string => {
            if (settlement.provider_name) {
                return settlement.provider_name;
            }

            if (settlement.id_provider === null) {
                return "—";
            }

            return (
                providers.find(
                    (provider) =>
                        provider.id_provider === settlement.id_provider
                )?.name_provider ||
                `Provider #${settlement.id_provider}`
            );
        },
        [providers]
    );

    const completedCount = settlements.filter(
        (item) => isReconciled(item)
    ).length;

    const pendingCount = settlements.filter(
        (item) =>
            ["PENDING", "GENERATED", "PROCESSING"].includes(
                item.status
            )
    ).length;

    const totalNetAmount = settlements.reduce(
        (sum, item) => sum + (item.net_amount ?? 0),
        0
    );

    const knownAmountCount = settlements.filter(
        (item) => item.net_amount !== null
    ).length;

    const statusOptions = useMemo(
        () =>
            Array.from(
                new Set(settlements.map((item) => item.status))
            ).sort(),
        [settlements]
    );

    const providerOptions = useMemo(
        () =>
            Array.from(
                new Set(
                    settlements
                        .map((item) => item.id_provider)
                        .filter(
                            (id): id is number => id !== null
                        )
                )
            )
                .map((id) => {
                    const settlement = settlements.find(
                        (item) => item.id_provider === id
                    );

                    return {
                        id,
                        name: settlement
                            ? providerName(settlement)
                            : `Provider #${id}`,
                    };
                })
                .sort((a, b) =>
                    a.name.localeCompare(b.name)
                ),
        [settlements, providerName]
    );

    const filteredSettlements = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return settlements.filter((item) => {
            const searchable = [
                String(item.id_settlement),
                item.settlement_number,
                providerName(item),
                item.status,
                item.created_at,
            ];

            const matchSearch = searchable.some(
                (value) =>
                    value.toLowerCase().includes(keyword)
            );

            const matchStatus =
                statusFilter === "ALL" ||
                item.status === statusFilter;

            const matchProvider =
                providerFilter === "ALL" ||
                String(item.id_provider) === providerFilter;

            return (
                matchSearch &&
                matchStatus &&
                matchProvider
            );
        });
    }, [
        settlements,
        search,
        statusFilter,
        providerFilter,
        providerName,
    ]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredSettlements.length / PAGE_SIZE)
    );

    const currentPage = Math.min(page, totalPages);

    const displayedSettlements = filteredSettlements.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    const selectedId = selected?.id_settlement ?? null;

    const activeSettlement =
        detail?.id_settlement === selectedId
            ? detail
            : selected;

    const closeModal = useCallback(() => {
        if (saving) return;

        setModal(null);
        setSelected(null);
        setDetail(null);
        setModalError("");
        setDetailError("");
    }, [saving]);

    const openDetail = (item: SettlementData) => {
        setSelected(item);
        setDetail(null);
        setModalError("");
        setDetailError("");
        setModal("detail");
    };

    const openGenerate = () => {
        setSelected(null);
        setDetail(null);
        setModalError("");
        setModal("generate");
    };

    const openReconcile = (item: SettlementData) => {
        setSelected(item);
        setModalError("");
        setModal("reconcile");
    };

    useEffect(() => {
        if (modal !== "detail" || selectedId === null) {
            return;
        }

        const controller = new AbortController();

        const loadDetail = async () => {
            setDetailLoading(true);
            setDetailError("");

            try {
                const response = await getSettlementDetail(
                    selectedId,
                    controller.signal
                );

                if (!controller.signal.aborted) {
                    setDetail(response);
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    setDetailError(getErrorMessage(error));
                }
            } finally {
                if (!controller.signal.aborted) {
                    setDetailLoading(false);
                }
            }
        };

        void loadDetail();

        return () => controller.abort();
    }, [modal, selectedId]);

    const reloadAfterMutation = async (): Promise<boolean> => {
        try {
            const latest = await getAllSettlements();
            setSettlements(latest);
            return true;
        } catch {
            return false;
        }
    };

    const completeMutation = (
        message: string,
        refreshed: boolean
    ) => {
        setModal(null);
        setSelected(null);
        setDetail(null);
        setModalError("");

        setNotice({
            type: "success",
            message: refreshed
                ? message
                : `${message} Daftar belum dapat diperbarui. Silakan klik Refresh.`,
        });
    };

    const handleGenerate = async () => {
        if (saving) return;

        setSaving(true);
        setModalError("");

        try {
            await generateSettlement();

            const refreshed = await reloadAfterMutation();

            completeMutation(
                "Permintaan generate settlement berhasil diproses.",
                refreshed
            );
        } catch (error) {
            setModalError(getErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const handleReconcile = async () => {
        if (!selected || saving) return;

        setSaving(true);
        setModalError("");

        try {
            await reconcileSettlement(selected.id_settlement);

            const refreshed = await reloadAfterMutation();

            completeMutation(
                "Permintaan rekonsiliasi settlement berhasil diproses.",
                refreshed
            );
        } catch (error) {
            setModalError(getErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const refreshData = () => {
        setNotice(null);
        setRefreshKey((value) => value + 1);
    };

    const modalErrorView = modalError ? (
        <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700"
        >
            <AlertCircle size={16} className="shrink-0" />
            <span>{modalError}</span>
        </div>
    ) : null;

    const renderModal = () => {
        // DETAIL MODAL
        if (modal === "detail" && activeSettlement) {
            const item = activeSettlement;

            return (
                <Modal
                    title="Detail Settlement"
                    onClose={closeModal}
                    wide
                    footer={
                        <>
                            <button
                                type="button"
                                onClick={closeModal}
                                className={secondaryButton}
                            >
                                Tutup
                            </button>

                            {!isReconciled(item) && (
                                <button
                                    type="button"
                                    onClick={() => openReconcile(item)}
                                    className={successButton}
                                >
                                    <ArrowRightLeft size={16} />
                                    Reconcile
                                </button>
                            )}
                        </>
                    }
                >
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
                                Detail tambahan tidak dapat dimuat:{" "}
                                {detailError}. Informasi dari daftar
                                tetap ditampilkan.
                            </span>
                        </div>
                    )}

                    {detailLoading && (
                        <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
                            <LoaderCircle
                                size={15}
                                className="animate-spin"
                            />
                            Memuat detail settlement...
                        </div>
                    )}

                    {/* HEADER */}
                    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-[#0866D8]">
                                <Wallet size={26} />
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-slate-950">
                                    Settlement #{item.id_settlement}
                                </h3>

                                <p className="mt-1 text-xs text-slate-500">
                                    {providerName(item)}
                                </p>

                                {item.settlement_number && (
                                    <p className="mt-1 text-xs text-slate-500">
                                        Ref: {item.settlement_number}
                                    </p>
                                )}
                            </div>
                        </div>

                        <StatusBadge status={item.status} />
                    </div>

                    {/* GENERAL INFORMATION */}
                    <section className="border-t border-slate-100 pt-5">
                        <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#00357A]">
                            <FileCheck2 size={17} />
                            Informasi Settlement
                        </h4>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <InfoField
                                label="ID Settlement"
                                value={item.id_settlement}
                            />

                            <InfoField
                                label="Nomor Referensi"
                                value={item.settlement_number || "—"}
                            />

                            <InfoField
                                label="Nama Provider"
                                value={providerName(item)}
                            />

                            <InfoField
                                label="ID Provider"
                                value={item.id_provider ?? "—"}
                            />

                            <InfoField
                                label="ID Rekening Provider"
                                value={item.id_bank_account ?? "—"}
                            />

                            <InfoField
                                label="Status"
                                value={<StatusBadge status={item.status} />}
                            />
                        </div>
                    </section>

                    {/* AMOUNT */}
                    <section className="mt-6 border-t border-slate-100 pt-5">
                        <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#00357A]">
                            <CircleDollarSign size={17} />
                            Rincian Nominal
                        </h4>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-xl bg-[#F5F8FC] p-4">
                                <InfoField
                                    label="Total Settlement"
                                    value={formatCurrency(item.total_amount)}
                                />
                            </div>

                            <div className="rounded-xl bg-[#F5F8FC] p-4">
                                <InfoField
                                    label="Net Amount"
                                    value={formatCurrency(item.net_amount)}
                                />
                            </div>

                            <InfoField
                                label="Gross Amount"
                                value={formatCurrency(item.gross_amount)}
                            />

                            <InfoField
                                label="Fee"
                                value={formatCurrency(item.fee_amount)}
                            />

                            <InfoField
                                label="Jumlah Order"
                                value={item.total_orders ?? "—"}
                            />
                        </div>
                    </section>

                    {/* PERIOD */}
                    <section className="mt-6 border-t border-slate-100 pt-5">
                        <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#00357A]">
                            <CalendarDays size={17} />
                            Periode dan Waktu
                        </h4>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <InfoField
                                label="Awal Periode"
                                value={formatDate(item.period_start)}
                            />

                            <InfoField
                                label="Akhir Periode"
                                value={formatDate(item.period_end)}
                            />

                            <InfoField
                                label="Dibuat Pada"
                                value={formatDate(item.created_at)}
                            />

                            <InfoField
                                label="Settlement Selesai"
                                value={formatDate(item.settled_at)}
                            />

                            <InfoField
                                label="Direkonsiliasi Pada"
                                value={formatDate(item.reconciled_at)}
                            />
                        </div>
                    </section>
                </Modal>
            );
        }

        // GENERATE MODAL
        if (modal === "generate") {
            return (
                <Modal
                    title="Generate Settlement?"
                    onClose={closeModal}
                    busy={saving}
                    footer={
                        <>
                            <button
                                type="button"
                                onClick={closeModal}
                                disabled={saving}
                                className={secondaryButton}
                            >
                                Batal
                            </button>

                            <button
                                type="button"
                                onClick={() => void handleGenerate()}
                                disabled={saving}
                                className={primaryButton}
                            >
                                {saving ? (
                                    <LoaderCircle
                                        size={16}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Plus size={16} />
                                )}

                                {saving
                                    ? "Memproses..."
                                    : "Ya, Generate"}
                            </button>
                        </>
                    }
                >
                    {modalErrorView}

                    <p className="text-sm leading-relaxed text-slate-600">
                        Apakah kamu yakin ingin menjalankan proses
                        generate settlement?
                    </p>

                    <div className="mt-4 rounded-lg bg-blue-50 p-3 text-xs leading-relaxed text-blue-800">
                        Sistem akan memanggil endpoint generate
                        settlement. Periode, provider, dan transaksi
                        yang diproses ditentukan oleh backend.
                    </div>
                </Modal>
            );
        }

        // RECONCILE MODAL
        if (modal === "reconcile" && selected) {
            return (
                <Modal
                    title="Reconcile Settlement?"
                    onClose={closeModal}
                    busy={saving}
                    footer={
                        <>
                            <button
                                type="button"
                                onClick={closeModal}
                                disabled={saving}
                                className={secondaryButton}
                            >
                                Batal
                            </button>

                            <button
                                type="button"
                                onClick={() => void handleReconcile()}
                                disabled={saving}
                                className={successButton}
                            >
                                {saving ? (
                                    <LoaderCircle
                                        size={16}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Check size={16} />
                                )}

                                {saving
                                    ? "Memproses..."
                                    : "Ya, Reconcile"}
                            </button>
                        </>
                    }
                >
                    {modalErrorView}

                    <p className="text-sm leading-relaxed text-slate-600">
                        Yakin ingin menjalankan rekonsiliasi untuk{" "}
                        <strong className="text-slate-950">
                            Settlement #{selected.id_settlement}
                        </strong>
                        ?
                    </p>

                    <div className="mt-4 space-y-3 rounded-lg bg-slate-50 p-4">
                        <InfoField
                            label="Provider"
                            value={providerName(selected)}
                        />

                        <InfoField
                            label="Status Saat Ini"
                            value={<StatusBadge status={selected.status} />}
                        />

                        <InfoField
                            label="Net Amount"
                            value={formatCurrency(selected.net_amount)}
                        />
                    </div>

                    <p className="mt-4 text-xs leading-relaxed text-amber-700">
                        Pastikan informasi settlement sudah diperiksa.
                        Rekonsiliasi akan diproses langsung oleh backend
                        dan mungkin mengubah status atau catatan
                        keuangan.
                    </p>
                </Modal>
            );
        }

        return null;
    };

    return (
        <div className="min-h-full p-4 sm:p-6 lg:p-8">
            {/* HEADER */}
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="mb-1 text-xs text-[#344F77]">
                        Provider & Keuangan / Settlement
                    </p>

                    <h1 className="text-2xl font-bold text-slate-950 sm:text-[28px]">
                        Settlement
                    </h1>

                    <p className="mt-2 text-sm text-[#526789]">
                        Monitoring settlement provider, generate,
                        dan rekonsiliasi transaksi.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={refreshData}
                        disabled={loading || saving}
                        className={secondaryButton}
                    >
                        <RefreshCw
                            size={16}
                            className={loading ? "animate-spin" : ""}
                        />
                        Refresh
                    </button>

                    <button
                        type="button"
                        onClick={openGenerate}
                        disabled={saving}
                        className={primaryButton}
                    >
                        <Plus size={17} />
                        Generate Settlement
                    </button>
                </div>
            </div>

            {/* NOTICE */}
            {notice && (
                <div
                    role="alert"
                    className={`mb-5 flex items-start gap-3 rounded-xl border p-3 ${notice.type === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-700"
                        }`}
                >
                    {notice.type === "success" ? (
                        <CheckCircle2 size={18} />
                    ) : (
                        <AlertCircle size={18} />
                    )}

                    <p className="flex-1 text-sm">
                        {notice.message}
                    </p>

                    <button
                        type="button"
                        onClick={() => setNotice(null)}
                        aria-label="Tutup notifikasi"
                        className="cursor-pointer"
                    >
                        <X size={17} />
                    </button>
                </div>
            )}

            {/* STATISTICS */}
            <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
                {[
                    {
                        label: "Total Settlement",
                        value: settlements.length.toLocaleString("id-ID"),
                        icon: <Wallet size={19} />,
                    },
                    {
                        label: "Pending",
                        value: pendingCount.toLocaleString("id-ID"),
                        icon: <Clock3 size={19} />,
                    },
                    {
                        label: "Reconciled / Completed",
                        value: completedCount.toLocaleString("id-ID"),
                        icon: <CheckCircle2 size={19} />,
                    },
                    {
                        label: "Total Net Amount",
                        value:
                            knownAmountCount > 0
                                ? formatCurrency(totalNetAmount)
                                : "—",
                        icon: <CircleDollarSign size={19} />,
                    },
                ].map((stat) => (
                    <div
                        key={stat.label}
                        className="rounded-2xl border border-[#DBE4F0] bg-white p-5 shadow-sm"
                    >
                        <div className="mb-3 flex items-center gap-2 text-[#526789]">
                            {stat.icon}
                            <span className="text-xs font-semibold">
                                {stat.label}
                            </span>
                        </div>

                        <p className="wrap-break-word text-2xl font-bold text-slate-950 xl:text-3xl">
                            {loading || listError ? "—" : stat.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* TABLE */}
            <section className="overflow-hidden rounded-2xl border border-[#DBE4F0] bg-white shadow-sm">
                {/* FILTERS */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
                    <div>
                        <h2 className="text-sm font-bold text-slate-950">
                            Daftar Settlement
                        </h2>

                        <p className="mt-1 text-xs text-[#526789]">
                            {loading
                                ? "Memuat..."
                                : `${filteredSettlements.length} settlement`}
                        </p>
                    </div>

                    <div className="flex w-full flex-wrap gap-2 xl:w-auto">
                        <div className="relative min-w-47.5 flex-1 xl:w-56">
                            <Search
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />

                            <input
                                value={search}
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setPage(1);
                                }}
                                placeholder="Cari settlement..."
                                className={`${inputClass} pl-10`}
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(event) => {
                                setStatusFilter(event.target.value);
                                setPage(1);
                            }}
                            aria-label="Filter status"
                            className={filterClass}
                        >
                            <option value="ALL">Semua Status</option>

                            {statusOptions.map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>

                        <select
                            value={providerFilter}
                            onChange={(event) => {
                                setProviderFilter(event.target.value);
                                setPage(1);
                            }}
                            aria-label="Filter provider"
                            className={`${filterClass} max-w-48`}
                        >
                            <option value="ALL">Semua Provider</option>

                            {providerOptions.map((provider) => (
                                <option
                                    key={provider.id}
                                    value={provider.id}
                                >
                                    {provider.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* TABLE CONTENT */}
                {loading ? (
                    <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-500">
                        <LoaderCircle
                            size={18}
                            className="animate-spin text-[#0866D8]"
                        />
                        Memuat data settlement...
                    </div>
                ) : listError ? (
                    <div
                        role="alert"
                        className="flex items-start gap-2 p-5 text-sm text-red-600"
                    >
                        <AlertCircle size={18} />
                        {listError}
                    </div>
                ) : filteredSettlements.length === 0 ? (
                    <div className="flex min-h-44 flex-col items-center justify-center gap-3 p-6 text-center">
                        <Wallet size={30} className="text-slate-300" />
                        <p className="text-sm text-slate-500">
                            Data settlement tidak ditemukan.
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
                                        Settlement
                                    </th>
                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        Provider
                                    </th>
                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        Jumlah Order
                                    </th>
                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        Net Amount
                                    </th>
                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        Tanggal
                                    </th>
                                    <th className="px-5 py-3 text-center text-xs font-semibold text-[#344F77]">
                                        Status
                                    </th>
                                    <th className="px-5 py-3 text-right text-xs font-semibold text-[#344F77]">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {displayedSettlements.map((item, index) => (
                                    <tr
                                        key={item.id_settlement}
                                        className="border-t border-slate-100 hover:bg-slate-50"
                                    >
                                        <td className="px-5 py-4 text-slate-500">
                                            {(currentPage - 1) * PAGE_SIZE +
                                                index +
                                                1}
                                        </td>

                                        {/* SETTLEMENT */}
                                        <td className="px-5 py-4">
                                            <div className="flex min-w-38.75 items-center gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0866D8]">
                                                    <Wallet size={19} />
                                                </div>

                                                <div>
                                                    <p className="font-semibold text-slate-950">
                                                        Settlement #{item.id_settlement}
                                                    </p>

                                                    <p className="mt-1 max-w-48 truncate text-xs text-slate-500">
                                                        {item.settlement_number || "—"}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* PROVIDER */}
                                        <td className="px-5 py-4">
                                            <div className="flex min-w-33.75 items-center gap-2">
                                                <Building2
                                                    size={16}
                                                    className="shrink-0 text-slate-400"
                                                />
                                                <span className="font-medium text-slate-700">
                                                    {providerName(item)}
                                                </span>
                                            </div>
                                        </td>

                                        {/* ORDERS */}
                                        <td className="px-5 py-4 text-slate-700">
                                            {item.total_orders ?? "—"}
                                        </td>

                                        {/* AMOUNT */}
                                        <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">
                                            {formatCurrency(item.net_amount)}
                                        </td>

                                        {/* DATE */}
                                        <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-600">
                                            {formatDate(item.created_at)}
                                        </td>

                                        {/* STATUS */}
                                        <td className="px-5 py-4 text-center">
                                            <StatusBadge status={item.status} />
                                        </td>

                                        {/* ACTIONS */}
                                        <td className="px-5 py-4">
                                            <div className="flex min-w-max items-center justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openDetail(item)}
                                                    title="Detail Settlement"
                                                    aria-label={`Detail settlement ${item.id_settlement}`}
                                                    className={`${iconButtonClass} bg-blue-50 text-[#0866D8] hover:bg-blue-100`}
                                                >
                                                    <Eye size={18} />
                                                </button>

                                                {!isReconciled(item) && (
                                                    <button
                                                        type="button"
                                                        onClick={() => openReconcile(item)}
                                                        title="Reconcile Settlement"
                                                        aria-label={`Reconcile settlement ${item.id_settlement}`}
                                                        className={`${iconButtonClass} bg-emerald-50 text-emerald-600 hover:bg-emerald-100`}
                                                    >
                                                        <ArrowRightLeft size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* PAGINATION */}
                {!loading &&
                    !listError &&
                    filteredSettlements.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
                            <p className="text-xs text-[#526789]">
                                Menampilkan{" "}
                                {(currentPage - 1) * PAGE_SIZE + 1}–
                                {Math.min(
                                    currentPage * PAGE_SIZE,
                                    filteredSettlements.length
                                )}{" "}
                                dari {filteredSettlements.length}
                            </p>

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    disabled={currentPage === 1}
                                    onClick={() =>
                                        setPage((value) =>
                                            Math.max(1, value - 1)
                                        )
                                    }
                                    aria-label="Halaman sebelumnya"
                                    className="cursor-pointer rounded-lg border border-[#DBE4F0] p-2 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <ChevronLeft size={17} />
                                </button>

                                <span className="text-xs font-semibold">
                                    {currentPage} / {totalPages}
                                </span>

                                <button
                                    type="button"
                                    disabled={currentPage >= totalPages}
                                    onClick={() =>
                                        setPage((value) =>
                                            Math.min(totalPages, value + 1)
                                        )
                                    }
                                    aria-label="Halaman berikutnya"
                                    className="cursor-pointer rounded-lg border border-[#DBE4F0] p-2 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <ChevronRight size={17} />
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

export default Settlement;
