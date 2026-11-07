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
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ClipboardCheck,
    ExternalLink,
    Eye,
    FileText,
    LoaderCircle,
    Mail,
    MapPin,
    Phone,
    RefreshCw,
    Search,
    X,
    XCircle,
} from "lucide-react";

const PAGE_SIZE = 10;

const DOCUMENT_FIELDS = [
    {
        key: "akta_pendirian_perusahaan",
        label: "Akta Pendirian Perusahaan",
    },
    {
        key: "nomor_induk_berusaha",
        label: "Nomor Induk Berusaha (NIB)",
    },
    {
        key: "npwp",
        label: "NPWP",
    },
    {
        key: "sertifikat_standard",
        label: "Sertifikat Standar",
    },
    {
        key: "persetujuan_lingkungan",
        label: "Persetujuan Lingkungan",
    },
    {
        key: "surat_izin_apotek",
        label: "Surat Izin Apotek",
    },
] as const;

type ApiRecord = Record<string, unknown>;

type ApprovalStatus =
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "UNKNOWN";

type ModalType =
    | "detail"
    | "approve"
    | "reject"
    | null;

interface ProviderData {
    id_provider: number;
    name_provider: string;
    email_provider: string;
    phone_number_provider: string;
    address_provider: string;
    province_provider: string;
    city_provider: string;
    district_provider: string;
    postal_code_provider: string;
    description_provider: string;
    id_provider_category: number | null;
    logo_provider: string;
    approval_status: ApprovalStatus;
    raw: ApiRecord;
}

interface ProviderCategory {
    id_provider_category: number;
    name_provider_category: string;
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

interface DetailFieldProps {
    label: string;
    value: string | number | null | undefined;
}

const secondaryButton =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#DBE4F0] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

const approveButton =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50";

const rejectButton =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50";

const filterClass =
    "rounded-lg border border-[#DBE4F0] bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#0866D8]";

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

const asId = (value: unknown): number | null => {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const number = Number(value);

    return Number.isSafeInteger(number) && number > 0
        ? number
        : null;
};

const firstValue = (
    row: ApiRecord,
    keys: readonly string[]
): unknown => {
    for (const key of keys) {
        const value = row[key];

        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {
            return value;
        }
    }

    return null;
};

const firstText = (
    row: ApiRecord,
    keys: readonly string[]
): string => asText(firstValue(row, keys));

const getErrorMessage = (error: unknown): string =>
    error instanceof Error
        ? error.message
        : "Terjadi kesalahan. Silakan coba kembali.";

const normalizeApprovalStatus = (
    value: unknown
): ApprovalStatus => {
    const status = asText(value).trim().toUpperCase();

    if (
        [
            "PENDING",
            "WAITING",
            "WAITING_APPROVAL",
            "PENDING_APPROVAL",
            "UNDER_REVIEW",
            "SUBMITTED",
        ].includes(status)
    ) {
        return "PENDING";
    }

    if (
        ["APPROVED", "ACCEPTED", "VERIFIED"].includes(status)
    ) {
        return "APPROVED";
    }

    if (
        ["REJECTED", "DECLINED"].includes(status)
    ) {
        return "REJECTED";
    }

    return "UNKNOWN";
};

const getApprovalStatus = (
    row: ApiRecord
): ApprovalStatus =>
    normalizeApprovalStatus(
        firstValue(row, [
            "approval_status",
            "status_approval",
            "approval_status_provider",
            "status_provider",
        ])
    );

const getToken = (): string | null =>
    sessionStorage.getItem("admin_token") ??
    localStorage.getItem("admin_token");

const getInitials = (name: string): string => {
    const words = name.trim().split(/\s+/).filter(Boolean);

    return (
        words
            .slice(0, 2)
            .map((word) => word[0].toUpperCase())
            .join("") || "P"
    );
};

// Mengubah path dokumen relatif menjadi URL backend.
// URL hanya diizinkan menggunakan HTTP/HTTPS.

const resolveAssetUrl = (
    value: unknown
): string | null => {
    let path = "";

    if (typeof value === "string") {
        path = value.trim();
    } else if (isRecord(value)) {
        path = firstText(value, [
            "url",
            "file_url",
            "path",
            "file_path",
        ]).trim();
    }

    if (!path) return null;

    try {
        const url = new URL(path, `${import.meta.env.VITE_API_URI}/`);

        if (!["http:", "https:"].includes(url.protocol)) {
            return null;
        }

        return url.href;
    } catch {
        return null;
    }
};

const extractArray = (
    payload: unknown,
    keys: string[],
    depth = 0
): ApiRecord[] => {
    if (Array.isArray(payload)) {
        if (!payload.every(isRecord)) {
            throw new Error("Format daftar provider tidak valid.");
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
                : "Gagal mengambil data provider."
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
                // Coba struktur lain.
            }
        }
    }

    throw new Error("Daftar provider tidak ditemukan.");
};

const extractObject = (
    payload: unknown,
    keys: string[],
    idKey: string,
    depth = 0
): ApiRecord => {
    if (!isRecord(payload) || depth > 6) {
        throw new Error("Format detail API tidak valid.");
    }

    if (payload.success === false) {
        throw new Error(
            typeof payload.message === "string"
                ? payload.message
                : "Gagal mengambil detail provider."
        );
    }

    if (asId(payload[idKey]) !== null) {
        return payload;
    }

    for (const key of [...keys, "data", "result"]) {
        if (isRecord(payload[key])) {
            try {
                return extractObject(
                    payload[key],
                    keys,
                    idKey,
                    depth + 1
                );
            } catch {
                // Coba field selanjutnya.
            }
        }
    }

    throw new Error("Detail provider tidak ditemukan.");
};

const normalizeProvider = (
    row: ApiRecord
): ProviderData | null => {
    const id = asId(row.id_provider);

    if (id === null) return null;

    const category = isRecord(row.provider_category)
        ? row.provider_category
        : null;

    return {
        id_provider: id,

        name_provider: asText(row.name_provider),

        email_provider: asText(row.email_provider),

        phone_number_provider: asText(
            row.phone_number_provider
        ),

        address_provider: asText(row.address_provider),

        province_provider: asText(row.province_provider),

        city_provider: asText(row.city_provider),

        district_provider: asText(row.district_provider),

        postal_code_provider: asText(
            row.postal_code_provider
        ),

        description_provider: asText(
            row.description_provider
        ),

        id_provider_category:
            asId(row.id_provider_category) ??
            asId(category?.id_provider_category),

        logo_provider: asText(row.logo_provider),

        approval_status: getApprovalStatus(row),

        raw: row,
    };
};

const normalizeCategory = (
    row: ApiRecord
): ProviderCategory | null => {
    const id = asId(row.id_provider_category);

    if (id === null) return null;

    return {
        id_provider_category: id,
        name_provider_category: asText(
            row.name_provider_category
        ),
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

    const response = await fetch(`${import.meta.env.VITE_API_URI}${endpoint}`, {
        ...options,
        headers,
    });

    const contentType =
        response.headers.get("content-type") ?? "";

    let payload: unknown = null;

    if (contentType.includes("application/json")) {
        payload = await response.json();
    } else {
        payload = (await response.text()) || null;
    }

    if (!response.ok) {
        const message =
            isRecord(payload) &&
                typeof payload.message === "string"
                ? payload.message
                : response.status === 403
                    ? "Anda tidak memiliki izin melakukan aksi ini."
                    : response.status === 401
                        ? "Token admin tidak diterima oleh endpoint."
                        : `Request gagal (HTTP ${response.status}).`;

        throw new ApiError(response.status, message);
    }

    if (isRecord(payload) && payload.success === false) {
        throw new Error(
            typeof payload.message === "string"
                ? payload.message
                : "Operasi API tidak berhasil."
        );
    }

    return payload;
};

const getAllProviders = async (
    signal?: AbortSignal
): Promise<ProviderData[]> => {
    const response = await apiRequest(
        "/provider/get-all",
        { signal }
    );

    return extractArray(response, [
        "providers",
        "provider",
    ])
        .map(normalizeProvider)
        .filter(
            (provider): provider is ProviderData =>
                provider !== null
        );
};

const getProviderDetail = async (
    id: number,
    signal?: AbortSignal
): Promise<ProviderData> => {
    const response = await apiRequest(
        `/provider/${id}`,
        { signal }
    );

    const provider = normalizeProvider(
        extractObject(response, ["provider"], "id_provider")
    );

    if (!provider) {
        throw new Error("Detail provider tidak valid.");
    }

    return provider;
};

const approveProvider = (id: number) =>
    apiRequest(`/provider/${id}/approve`, {
        method: "PATCH",
    });

const rejectProvider = (id: number) =>
    apiRequest(`/provider/${id}/reject`, {
        method: "PATCH",
    });

const getAllCategories = async (
    signal?: AbortSignal
): Promise<ProviderCategory[]> => {
    const response = await apiRequest(
        "/provider-categories/get-all",
        { signal }
    );

    return extractArray(response, [
        "provider_categories",
        "providerCategories",
        "categories",
    ])
        .map(normalizeCategory)
        .filter(
            (category): category is ProviderCategory =>
                category !== null
        );
};

const StatusBadge = ({
    status,
}: {
    status: ApprovalStatus;
}) => {
    const styles: Record<ApprovalStatus, string> = {
        PENDING: "bg-amber-50 text-amber-700",
        APPROVED: "bg-emerald-50 text-emerald-700",
        REJECTED: "bg-red-50 text-red-700",
        UNKNOWN: "bg-slate-100 text-slate-600",
    };

    const labels: Record<ApprovalStatus, string> = {
        PENDING: "Pending",
        APPROVED: "Approved",
        REJECTED: "Rejected",
        UNKNOWN: "Unknown",
    };

    return (
        <span
            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${styles[status]}`}
        >
            {labels[status]}
        </span>
    );
};

const DetailField = ({
    label,
    value,
}: DetailFieldProps) => (
    <div className="min-w-0">
        <p className="text-xs text-[#526789]">
            {label}
        </p>

        <p className="mt-1 wrap-break-word text-sm font-medium text-slate-900">
            {value === null ||
                value === undefined ||
                value === ""
                ? "—"
                : value}
        </p>
    </div>
);

const LoadingState = ({
    label = "Memuat data...",
}: {
    label?: string;
}) => (
    <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-500">
        <LoaderCircle
            size={18}
            className="animate-spin text-[#0866D8]"
        />
        {label}
    </div>
);

const EmptyState = ({
    message,
}: {
    message: string;
}) => (
    <div className="flex min-h-44 flex-col items-center justify-center gap-3 p-6 text-center">
        <ClipboardCheck
            size={29}
            className="text-slate-300"
        />

        <p className="text-sm text-slate-500">
            {message}
        </p>
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
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !busy) {
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
    }, [onClose, busy]);

    return (
        <div
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !busy) {
                    onClose();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={`flex w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${wide
                    ? "h-[min(740px,90dvh)] max-w-4xl"
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

                {/* BODY */}
                <div className="min-h-0 flex-1 overflow-y-auto p-5 scrollbar-gutter-stable">
                    {children}
                </div>

                {/* FOOTER */}
                {footer && (
                    <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

const ProviderApproval = () => {
    const [providers, setProviders] = useState<
        ProviderData[]
    >([]);

    const [categories, setCategories] = useState<
        ProviderCategory[]
    >([]);

    const [selectedProvider, setSelectedProvider] =
        useState<ProviderData | null>(null);

    const [detail, setDetail] =
        useState<ProviderData | null>(null);

    const [modal, setModal] = useState<ModalType>(null);

    const [saving, setSaving] = useState(false);

    const [detailLoading, setDetailLoading] =
        useState(false);

    const [detailError, setDetailError] = useState("");

    const [modalError, setModalError] = useState("");

    const [search, setSearch] = useState("");

    const [statusFilter, setStatusFilter] =
        useState("PENDING");

    const [categoryFilter, setCategoryFilter] =
        useState("ALL");

    const [page, setPage] = useState(1);

    const [loading, setLoading] = useState(true);

    const [listError, setListError] = useState("");

    const [notice, setNotice] = useState<Notice | null>(
        null
    );

    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const controller = new AbortController();

        const load = async () => {
            setLoading(true);
            setListError("");

            const results = await Promise.allSettled([
                getAllProviders(controller.signal),
                getAllCategories(controller.signal),
            ]);

            if (controller.signal.aborted) return;

            const [providerResult, categoryResult] = results;

            if (providerResult.status === "fulfilled") {
                setProviders(providerResult.value);
            } else {
                setProviders([]);
                setListError(
                    getErrorMessage(providerResult.reason)
                );
            }

            setCategories(
                categoryResult.status === "fulfilled"
                    ? categoryResult.value
                    : []
            );

            setLoading(false);
        };

        void load();

        return () => controller.abort();
    }, [refreshKey]);

    const categoryName = useCallback(
        (id: number | null): string => {
            if (id === null) return "—";

            return (
                categories.find(
                    (category) =>
                        category.id_provider_category === id
                )?.name_provider_category ||
                `Kategori #${id}`
            );
        },
        [categories]
    );

    const pendingCount = providers.filter(
        (provider) =>
            provider.approval_status === "PENDING"
    ).length;

    const approvedCount = providers.filter(
        (provider) =>
            provider.approval_status === "APPROVED"
    ).length;

    const rejectedCount = providers.filter(
        (provider) =>
            provider.approval_status === "REJECTED"
    ).length;

    const unknownCount = providers.filter(
        (provider) =>
            provider.approval_status === "UNKNOWN"
    ).length;

    const filteredProviders = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return providers.filter((provider) => {
            const values = [
                provider.name_provider,
                provider.email_provider,
                provider.phone_number_provider,
                provider.city_provider,
                provider.province_provider,
                categoryName(provider.id_provider_category),
                String(provider.id_provider),
            ];

            const matchesSearch = values.some(
                (value) =>
                    value.toLowerCase().includes(keyword)
            );

            const matchesStatus =
                statusFilter === "ALL" ||
                provider.approval_status === statusFilter;

            const matchesCategory =
                categoryFilter === "ALL" ||
                String(provider.id_provider_category) ===
                categoryFilter;

            return (
                matchesSearch &&
                matchesStatus &&
                matchesCategory
            );
        });
    }, [
        providers,
        search,
        statusFilter,
        categoryFilter,
        categoryName,
    ]);

    const categoryOptions = useMemo(() => {
        const ids = Array.from(
            new Set(
                providers
                    .map((provider) => provider.id_provider_category)
                    .filter(
                        (id): id is number => id !== null
                    )
            )
        );

        return ids
            .map((id) => ({
                id,
                name: categoryName(id),
            }))
            .sort((a, b) =>
                a.name.localeCompare(b.name)
            );
    }, [providers, categoryName]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredProviders.length / PAGE_SIZE)
    );

    const currentPage = Math.min(page, totalPages);

    const displayedProviders = filteredProviders.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    const activeProvider =
        detail?.id_provider === selectedProvider?.id_provider
            ? detail
            : selectedProvider;

    const closeModal = useCallback(() => {
        if (saving) return;

        setModal(null);
        setSelectedProvider(null);
        setDetail(null);
        setDetailError("");
        setModalError("");
    }, [saving]);

    const openDetail = (provider: ProviderData) => {
        setSelectedProvider(provider);
        setDetail(null);
        setDetailError("");
        setModalError("");
        setModal("detail");
    };

    const openApprove = (provider: ProviderData) => {
        setSelectedProvider(provider);
        setModalError("");
        setModal("approve");
    };

    const openReject = (provider: ProviderData) => {
        setSelectedProvider(provider);
        setModalError("");
        setModal("reject");
    };

    useEffect(() => {
        if (
            modal !== "detail" ||
            selectedProvider === null
        ) {
            return;
        }

        const controller = new AbortController();

        const loadDetail = async () => {
            setDetailLoading(true);
            setDetailError("");

            try {
                const response = await getProviderDetail(
                    selectedProvider.id_provider,
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
    }, [
        modal,
        selectedProvider?.id_provider,
    ]);

    const handleDecision = async (
        decision: "approve" | "reject"
    ) => {
        if (!selectedProvider || saving) return;

        const providerId = selectedProvider.id_provider;

        if (selectedProvider.approval_status !== "PENDING") {
            setModalError(
                "Hanya provider berstatus Pending yang dapat diproses."
            );
            return;
        }

        setSaving(true);
        setModalError("");

        try {
            if (decision === "approve") {
                await approveProvider(providerId);
            } else {
                await rejectProvider(providerId);
            }

            // Aksi berhasil di backend. Baca ulang daftar
            // untuk mendapatkan status terbaru dari server.
            let refreshFailed = false;

            try {
                const latest = await getAllProviders();
                setProviders(latest);
            } catch {
                refreshFailed = true;
            }

            setModal(null);
            setSelectedProvider(null);
            setDetail(null);

            setNotice({
                type: "success",
                message:
                    decision === "approve"
                        ? refreshFailed
                            ? "Permintaan persetujuan berhasil. Klik Refresh untuk memeriksa status terbaru."
                            : "Provider berhasil disetujui."
                        : refreshFailed
                            ? "Permintaan penolakan berhasil. Klik Refresh untuk memeriksa status terbaru."
                            : "Provider berhasil ditolak.",
            });
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
            <AlertCircle
                size={16}
                className="shrink-0"
            />

            <span>{modalError}</span>
        </div>
    ) : null;

    const renderDocuments = (provider: ProviderData) => {
        return (
            <div className="grid gap-3 sm:grid-cols-2">
                {DOCUMENT_FIELDS.map((document) => {
                    const value = firstValue(
                        provider.raw,
                        [document.key]
                    );

                    const url = resolveAssetUrl(value);

                    return (
                        <div
                            key={document.key}
                            className="flex items-center justify-between gap-3 rounded-xl border border-[#DBE4F0] p-3"
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0866D8]">
                                    <FileText size={19} />
                                </div>

                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-slate-800">
                                        {document.label}
                                    </p>

                                    <p className="mt-1 text-[11px] text-slate-500">
                                        {url ? "Dokumen tersedia" : "Belum tersedia"}
                                    </p>
                                </div>
                            </div>

                            {url ? (
                                <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={`Lihat ${document.label}`}
                                    aria-label={`Lihat ${document.label}`}
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0866D8] hover:bg-blue-100"
                                >
                                    <ExternalLink size={17} />
                                </a>
                            ) : (
                                <span className="text-xs text-slate-400">
                                    —
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderModal = () => {
        if (modal === "detail" && activeProvider) {
            const provider = activeProvider;

            const logo = resolveAssetUrl(
                provider.raw.logo_provider
            );

            return (
                <Modal
                    title="Detail Persetujuan Provider"
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

                            {provider.approval_status === "PENDING" && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => openReject(provider)}
                                        className={rejectButton}
                                    >
                                        <XCircle size={16} />
                                        Tolak
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => openApprove(provider)}
                                        className={approveButton}
                                    >
                                        <Check size={16} />
                                        Setujui
                                    </button>
                                </>
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
                            Memuat detail provider...
                        </div>
                    )}

                    {/* PROVIDER HEADER */}
                    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                            {logo ? (
                                <img
                                    src={logo}
                                    alt={`Logo ${provider.name_provider}`}
                                    className="h-14 w-14 rounded-xl border border-slate-100 object-contain"
                                />
                            ) : (
                                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-base font-bold text-[#0866D8]">
                                    {getInitials(provider.name_provider)}
                                </div>
                            )}

                            <div className="min-w-0">
                                <h3 className="wrap-break-word text-lg font-bold text-slate-950">
                                    {provider.name_provider}
                                </h3>

                                <p className="mt-1 text-xs text-slate-500">
                                    ID Provider: {provider.id_provider}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                    {categoryName(
                                        provider.id_provider_category
                                    )}
                                </p>
                            </div>
                        </div>

                        <StatusBadge
                            status={provider.approval_status}
                        />
                    </div>

                    {/* INFORMASI UMUM */}
                    <section className="border-t border-slate-100 pt-5">
                        <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#00357A]">
                            <Building2 size={17} />
                            Informasi Provider
                        </h4>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <DetailField
                                label="Nama Provider"
                                value={provider.name_provider}
                            />

                            <DetailField
                                label="Kategori"
                                value={categoryName(
                                    provider.id_provider_category
                                )}
                            />

                            <DetailField
                                label="ID Provider"
                                value={provider.id_provider}
                            />

                            <div>
                                <p className="mb-2 text-xs text-[#526789]">
                                    Status Persetujuan
                                </p>

                                <StatusBadge
                                    status={provider.approval_status}
                                />
                            </div>
                        </div>

                        <div className="mt-5">
                            <p className="mb-2 text-xs text-[#526789]">
                                Deskripsi Provider
                            </p>

                            <p className="whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-slate-700">
                                {provider.description_provider ||
                                    "Belum ada deskripsi."}
                            </p>
                        </div>
                    </section>

                    {/* KONTAK */}
                    <section className="mt-6 border-t border-slate-100 pt-5">
                        <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#00357A]">
                            <Mail size={17} />
                            Informasi Kontak
                        </h4>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <DetailField
                                label="Email Provider"
                                value={provider.email_provider}
                            />

                            <DetailField
                                label="Nomor Telepon"
                                value={provider.phone_number_provider}
                            />
                        </div>
                    </section>

                    {/* LOKASI */}
                    <section className="mt-6 border-t border-slate-100 pt-5">
                        <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#00357A]">
                            <MapPin size={17} />
                            Informasi Lokasi
                        </h4>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <DetailField
                                    label="Alamat"
                                    value={provider.address_provider}
                                />
                            </div>

                            <DetailField
                                label="Provinsi"
                                value={provider.province_provider}
                            />

                            <DetailField
                                label="Kota / Kabupaten"
                                value={provider.city_provider}
                            />

                            <DetailField
                                label="Kecamatan"
                                value={provider.district_provider}
                            />

                            <DetailField
                                label="Kode Pos"
                                value={provider.postal_code_provider}
                            />
                        </div>
                    </section>

                    {/* DOCUMENTS */}
                    <section className="mt-6 border-t border-slate-100 pt-5">
                        <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-[#00357A]">
                            <FileText size={17} />
                            Dokumen Legalitas
                        </h4>

                        <p className="mb-4 text-xs text-slate-500">
                            Periksa dokumen yang tersedia sebelum
                            memberikan keputusan persetujuan.
                        </p>

                        {renderDocuments(provider)}
                    </section>
                </Modal>
            );
        }

        if (modal === "approve" && selectedProvider) {
            return (
                <Modal
                    title="Setujui Provider?"
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
                                onClick={() => void handleDecision("approve")}
                                disabled={saving}
                                className={approveButton}
                            >
                                {saving ? (
                                    <LoaderCircle
                                        size={16}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Check size={16} />
                                )}

                                {saving ? "Memproses..." : "Ya, Setujui"}
                            </button>
                        </>
                    }
                >
                    {modalErrorView}

                    <p className="text-sm leading-relaxed text-slate-600">
                        Yakin ingin menyetujui provider{" "}
                        <strong className="text-slate-950">
                            {selectedProvider.name_provider}
                        </strong>
                        ?
                    </p>

                    <p className="mt-3 text-xs text-slate-500">
                        Pastikan data dan dokumen legalitas sudah
                        diverifikasi sebelum menyetujui.
                    </p>
                </Modal>
            );
        }

        if (modal === "reject" && selectedProvider) {
            return (
                <Modal
                    title="Tolak Provider?"
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
                                onClick={() => void handleDecision("reject")}
                                disabled={saving}
                                className={rejectButton}
                            >
                                {saving ? (
                                    <LoaderCircle
                                        size={16}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <XCircle size={16} />
                                )}

                                {saving ? "Memproses..." : "Ya, Tolak"}
                            </button>
                        </>
                    }
                >
                    {modalErrorView}

                    <p className="text-sm leading-relaxed text-slate-600">
                        Yakin ingin menolak provider{" "}
                        <strong className="text-slate-950">
                            {selectedProvider.name_provider}
                        </strong>
                        ?
                    </p>

                    <p className="mt-3 text-xs text-slate-500">
                        Keputusan ini akan dikirimkan langsung
                        ke backend.
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
                        Kontrol / Persetujuan Provider
                    </p>

                    <h1 className="text-2xl font-bold text-slate-950 sm:text-[28px]">
                        Persetujuan Provider
                    </h1>

                    <p className="mt-2 text-sm text-[#526789]">
                        Tinjau pendaftaran provider, periksa
                        dokumen, dan kelola keputusan persetujuan.
                    </p>
                </div>

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
            </div>

            {/* NOTIFICATION */}
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

            {/* SUMMARY CARDS */}
            <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
                {[
                    {
                        label: "Total Provider",
                        value: providers.length,
                        icon: <Building2 size={19} />,
                    },
                    {
                        label: "Menunggu Persetujuan",
                        value: pendingCount,
                        icon: <ClipboardCheck size={19} />,
                    },
                    {
                        label: "Disetujui",
                        value: approvedCount,
                        icon: <CheckCircle2 size={19} />,
                    },
                    {
                        label: "Ditolak",
                        value: rejectedCount,
                        icon: <XCircle size={19} />,
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

                        <p className="text-3xl font-bold text-slate-950">
                            {loading || listError ? "—" : stat.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* STATUS WARNING */}
            {!loading && !listError && unknownCount > 0 && (
                <div className="mb-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    <AlertCircle
                        size={16}
                        className="shrink-0"
                    />

                    <span>
                        {unknownCount} provider memiliki status
                        yang belum dikenali. Gunakan filter
                        "Semua Status" untuk memeriksanya.
                    </span>
                </div>
            )}

            {/* TABLE */}
            <section className="overflow-hidden rounded-2xl border border-[#DBE4F0] bg-white shadow-sm">
                {/* FILTER BAR */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
                    <div>
                        <h2 className="text-sm font-bold text-slate-950">
                            Daftar Persetujuan Provider
                        </h2>

                        <p className="mt-1 text-xs text-[#526789]">
                            {loading
                                ? "Memuat..."
                                : `${filteredProviders.length} provider`}
                        </p>
                    </div>

                    <div className="flex w-full flex-wrap gap-2 lg:w-auto">
                        {/* SEARCH */}
                        <div className="relative min-w-47.5 flex-1 lg:w-56">
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
                                placeholder="Cari provider..."
                                className="w-full rounded-lg border border-[#DBE4F0] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#0866D8]"
                            />
                        </div>

                        {/* STATUS FILTER */}
                        <select
                            value={statusFilter}
                            onChange={(event) => {
                                setStatusFilter(event.target.value);
                                setPage(1);
                            }}
                            aria-label="Filter status persetujuan"
                            className={filterClass}
                        >
                            <option value="PENDING">Pending</option>
                            <option value="ALL">Semua Status</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                            <option value="UNKNOWN">Unknown</option>
                        </select>

                        {/* CATEGORY FILTER */}
                        <select
                            value={categoryFilter}
                            onChange={(event) => {
                                setCategoryFilter(event.target.value);
                                setPage(1);
                            }}
                            aria-label="Filter kategori"
                            className={`${filterClass} max-w-48`}
                        >
                            <option value="ALL">Semua Kategori</option>

                            {categoryOptions.map((category) => (
                                <option
                                    key={category.id}
                                    value={category.id}
                                >
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* TABLE CONTENT */}
                {loading ? (
                    <LoadingState />
                ) : listError ? (
                    <div
                        role="alert"
                        className="flex items-start gap-2 p-5 text-sm text-red-600"
                    >
                        <AlertCircle
                            size={18}
                            className="shrink-0"
                        />

                        <span>{listError}</span>
                    </div>
                ) : filteredProviders.length === 0 ? (
                    <EmptyState message="Tidak ada provider dengan filter yang dipilih." />
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
                                        Kategori
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        Kontak
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        Lokasi
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
                                {displayedProviders.map(
                                    (provider, index) => (
                                        <tr
                                            key={provider.id_provider}
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
                                                <div className="flex min-w-45 items-center gap-3">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-[#0866D8]">
                                                        {getInitials(
                                                            provider.name_provider
                                                        )}
                                                    </div>

                                                    <div className="min-w-0">
                                                        <p className="max-w-52 truncate font-semibold text-slate-950">
                                                            {provider.name_provider ||
                                                                "Tanpa Nama"}
                                                        </p>

                                                        <p className="mt-1 text-xs text-slate-500">
                                                            ID: {provider.id_provider}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* CATEGORY */}
                                            <td className="px-5 py-4 text-slate-600">
                                                {categoryName(
                                                    provider.id_provider_category
                                                )}
                                            </td>

                                            {/* CONTACT */}
                                            <td className="px-5 py-4">
                                                <div className="min-w-40 space-y-1.5">
                                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                                        <Mail
                                                            size={14}
                                                            className="shrink-0 text-slate-400"
                                                        />

                                                        <span className="max-w-48 truncate">
                                                            {provider.email_provider ||
                                                                "—"}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                                        <Phone
                                                            size={14}
                                                            className="shrink-0 text-slate-400"
                                                        />

                                                        <span>
                                                            {provider.phone_number_provider ||
                                                                "—"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* LOCATION */}
                                            <td className="px-5 py-4 text-slate-600">
                                                <div className="flex min-w-32.5 items-center gap-2">
                                                    <MapPin
                                                        size={15}
                                                        className="shrink-0 text-slate-400"
                                                    />

                                                    <span>
                                                        {provider.city_provider ||
                                                            provider.province_provider ||
                                                            "—"}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* STATUS */}
                                            <td className="px-5 py-4 text-center">
                                                <StatusBadge
                                                    status={provider.approval_status}
                                                />
                                            </td>

                                            {/* ACTIONS */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openDetail(provider)
                                                        }
                                                        title="Detail Provider"
                                                        aria-label={`Detail ${provider.name_provider}`}
                                                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-blue-50 text-[#0866D8] hover:bg-blue-100"
                                                    >
                                                        <Eye size={18} />
                                                    </button>

                                                    {provider.approval_status ===
                                                        "PENDING" && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        openApprove(provider)
                                                                    }
                                                                    title="Setujui Provider"
                                                                    aria-label={`Setujui ${provider.name_provider}`}
                                                                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                                                >
                                                                    <Check size={18} />
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        openReject(provider)
                                                                    }
                                                                    title="Tolak Provider"
                                                                    aria-label={`Tolak ${provider.name_provider}`}
                                                                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                                                                >
                                                                    <X size={18} />
                                                                </button>
                                                            </>
                                                        )}
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
                    filteredProviders.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
                            <p className="text-xs text-[#526789]">
                                Menampilkan{" "}
                                {(currentPage - 1) * PAGE_SIZE + 1}–
                                {Math.min(
                                    currentPage * PAGE_SIZE,
                                    filteredProviders.length
                                )}{" "}
                                dari {filteredProviders.length}
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

export default ProviderApproval;
