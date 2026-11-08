import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

import { useNavigate } from "react-router-dom";

import {
    AlertCircle,
    Building2,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock3,
    ExternalLink,
    Eye,
    FileText,
    Hospital,
    LoaderCircle,
    MapPin,
    RefreshCw,
    Search,
    ShieldCheck,
    ShieldX,
    X,
} from "lucide-react";

const PAGE_SIZE = 10;

type ApiRecord = Record<string, unknown>;

type ModalType = "detail" | "approve" | "reject" | null;

type DocumentKey =
    | "akta_pendirian_perusahaan"
    | "nomor_induk_berusaha"
    | "npwp"
    | "sertifikat_standard"
    | "persetujuan_lingkungan"
    | "surat_izin_apotek";

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
    status_provider: string;
    logo_provider: string | null;
    id_platform: number | null;
    id_provider_category: number | null;
    id_provider_group: number | null;
    akta_pendirian_perusahaan: string | null;
    nomor_induk_berusaha: string | null;
    npwp: string | null;
    sertifikat_standard: string | null;
    persetujuan_lingkungan: string | null;
    surat_izin_apotek: string | null;
}

interface ProviderGroupData {
    id_provider_group: number;
    name_provider_group: string;
}

interface ProviderCategoryData {
    id_provider_category: number;
    name_provider_category: string;
}

interface NotificationData {
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

const DOCUMENT_FIELDS: {
    key: DocumentKey;
    label: string;
}[] = [
        {
            key: "akta_pendirian_perusahaan",
            label: "Akta Pendirian Perusahaan",
        },
        {
            key: "nomor_induk_berusaha",
            label: "Nomor Induk Berusaha",
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
    ];

const secondaryButton =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#DBE4F0] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

const approveButton =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50";

const rejectButton =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50";

const isRecord = (value: unknown): value is ApiRecord =>
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value);

const toText = (value: unknown): string =>
    value === null || value === undefined
        ? ""
        : String(value);

const toNumber = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const number = Number(value);

    return Number.isSafeInteger(number) && number > 0
        ? number
        : null;
};

const normalizeStatus = (value: unknown): string =>
    toText(value || "UNKNOWN").trim().toUpperCase();

// Hanya PENDING_APPROVAL yang boleh disetujui/ditolak.
const isPendingStatus = (status: string): boolean =>
    normalizeStatus(status) === "PENDING_APPROVAL";

const getErrorMessage = (error: unknown): string =>
    error instanceof Error
        ? error.message
        : "Terjadi kesalahan. Silakan coba kembali.";

const getFileUrl = (value: unknown): string | null => {
    if (typeof value !== "string" || !value.trim()) {
        return null;
    }

    try {
        const url = new URL(value.trim(), `${import.meta.env.VITE_API_URI}/`);

        return ["http:", "https:"].includes(url.protocol)
            ? url.href
            : null;
    } catch {
        return null;
    }
};

const getToken = (): string | null =>
    sessionStorage.getItem("admin_token") ??
    localStorage.getItem("admin_token");

const clearSession = (): void => {
    ["admin_token", "admin_user", "admin_role"].forEach(
        (key) => {
            sessionStorage.removeItem(key);
            localStorage.removeItem(key);
        }
    );
};

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

    if (!isRecord(payload) || depth > 5) {
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
                // Coba properti berikutnya.
            }
        }
    }

    throw new Error(
        "Array data tidak ditemukan dalam response API."
    );
};

const extractObject = (
    payload: unknown,
    keys: string[],
    depth = 0
): ApiRecord => {
    if (!isRecord(payload) || depth > 5) {
        throw new Error("Format detail API tidak valid.");
    }

    if (payload.success === false) {
        throw new Error(
            typeof payload.message === "string"
                ? payload.message
                : "Gagal mengambil detail."
        );
    }

    if (toNumber(payload.id_provider) !== null) {
        return payload;
    }

    for (const key of [...keys, "data"]) {
        if (isRecord(payload[key])) {
            try {
                return extractObject(payload[key], keys, depth + 1);
            } catch {
                // Coba properti berikutnya.
            }
        }
    }

    throw new Error("Detail provider tidak ditemukan.");
};

const normalizeProvider = (
    row: ApiRecord
): ProviderData | null => {
    const id = toNumber(row.id_provider);

    if (id === null) return null;

    return {
        id_provider: id,
        name_provider: toText(row.name_provider),
        email_provider: toText(row.email_provider),
        phone_number_provider: toText(
            row.phone_number_provider
        ),
        address_provider: toText(row.address_provider),
        province_provider: toText(row.province_provider),
        city_provider: toText(row.city_provider),
        district_provider: toText(row.district_provider),
        postal_code_provider: toText(
            row.postal_code_provider
        ),
        description_provider: toText(
            row.description_provider
        ),
        status_provider: normalizeStatus(
            row.status_provider
        ),
        logo_provider: getFileUrl(row.logo_provider),
        id_platform: toNumber(row.id_platform),
        id_provider_category: toNumber(
            row.id_provider_category
        ),
        id_provider_group: toNumber(row.id_provider_group),
        akta_pendirian_perusahaan: getFileUrl(
            row.akta_pendirian_perusahaan
        ),
        nomor_induk_berusaha: getFileUrl(
            row.nomor_induk_berusaha
        ),
        npwp: getFileUrl(row.npwp),
        sertifikat_standard: getFileUrl(
            row.sertifikat_standard
        ),
        persetujuan_lingkungan: getFileUrl(
            row.persetujuan_lingkungan
        ),
        surat_izin_apotek: getFileUrl(
            row.surat_izin_apotek
        ),
    };
};

class UnauthorizedError extends Error {
    constructor() {
        super("Sesi telah berakhir. Silakan login kembali.");
        this.name = "UnauthorizedError";
    }
}

const apiRequest = async (
    endpoint: string,
    options: RequestInit = {}
): Promise<unknown> => {
    const token = getToken();

    if (!token) {
        throw new UnauthorizedError();
    }

    if (!import.meta.env.VITE_API_URI) {
        throw new Error("VITE_API_URI belum dikonfigurasi.");
    }

    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");
    headers.set("Authorization", `Bearer ${token}`);

    const response = await fetch(`${import.meta.env.VITE_API_URI}${endpoint}`, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        throw new UnauthorizedError();
    }

    const contentType =
        response.headers.get("content-type") || "";

    let payload: unknown = null;

    if (contentType.includes("application/json")) {
        payload = await response.json();
    } else {
        payload = (await response.text()) || null;
    }

    if (!response.ok) {
        throw new Error(
            isRecord(payload) &&
                typeof payload.message === "string"
                ? payload.message
                : response.status === 403
                    ? "Anda tidak memiliki akses untuk aksi ini."
                    : `Request gagal (HTTP ${response.status}).`
        );
    }

    if (isRecord(payload) && payload.success === false) {
        throw new Error(
            typeof payload.message === "string"
                ? payload.message
                : "Operasi tidak berhasil."
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

    return extractArray(response, ["providers"])
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
        extractObject(response, ["provider"])
    );

    if (!provider) {
        throw new Error("Detail provider tidak valid.");
    }

    return provider;
};

const getAllGroups = async (
    signal?: AbortSignal
): Promise<ProviderGroupData[]> => {
    const response = await apiRequest(
        "/provider-group/get-all",
        { signal }
    );

    return extractArray(response, [
        "provider_groups",
        "providerGroups",
        "groups",
    ])
        .map((row) => ({
            id_provider_group: toNumber(row.id_provider_group),
            name_provider_group: toText(row.name_provider_group),
        }))
        .filter(
            (
                group
            ): group is ProviderGroupData =>
                group.id_provider_group !== null
        );
};

const getAllCategories = async (
    signal?: AbortSignal
): Promise<ProviderCategoryData[]> => {
    const response = await apiRequest(
        "/provider-categories/get-all",
        { signal }
    );

    return extractArray(response, [
        "provider_categories",
        "providerCategories",
        "categories",
    ])
        .map((row) => ({
            id_provider_category: toNumber(
                row.id_provider_category
            ),
            name_provider_category: toText(
                row.name_provider_category
            ),
        }))
        .filter(
            (
                category
            ): category is ProviderCategoryData =>
                category.id_provider_category !== null
        );
};

// Keputusan approval tetap tersedia untuk PENDING_APPROVAL.
const approveProvider = (id: number) =>
    apiRequest(`/provider/${id}/approve`, {
        method: "PATCH",
    });

const rejectProvider = (id: number) =>
    apiRequest(`/provider/${id}/reject`, {
        method: "PATCH",
    });

// Tidak ada fungsi UPDATE profil provider.

const StatusBadge = ({
    status,
}: {
    status: string;
}) => {
    const value = normalizeStatus(status);

    const color =
        value === "APPROVED"
            ? "bg-emerald-50 text-emerald-700"
            : value === "PENDING_OTP"
                ? "bg-blue-50 text-blue-700"
                : isPendingStatus(value)
                    ? "bg-amber-50 text-amber-700"
                    : value === "REJECTED"
                        ? "bg-red-50 text-red-700"
                        : "bg-slate-100 text-slate-600";

    return (
        <span
            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${color}`}
        >
            {value}
        </span>
    );
};

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
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 p-5 text-center">
        <Hospital size={28} className="text-slate-300" />
        <p className="text-sm text-slate-500">{message}</p>
    </div>
);

const DetailField = ({
    label,
    value,
}: {
    label: string;
    value?: string | number | null;
}) => (
    <div className="min-w-0">
        <p className="text-xs text-[#526789]">{label}</p>
        <p className="mt-1 wrap-break-word text-sm font-medium text-slate-900">
            {value === null || value === undefined || value === ""
                ? "—"
                : value}
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
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !busy) {
                onClose();
            }
        };

        document.addEventListener("keydown", onKeyDown);

        return () => {
            document.removeEventListener(
                "keydown",
                onKeyDown
            );
        };
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
                    ? "h-[min(700px,90dvh)] max-w-4xl"
                    : "max-h-[90dvh] max-w-md"
                    }`}
            >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
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

                <div className="min-h-0 flex-1 overflow-y-auto p-5">
                    {children}
                </div>

                {footer && (
                    <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-5 py-4">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

const Provider = () => {
    const navigate = useNavigate();

    const [providers, setProviders] = useState<ProviderData[]>([]);
    const [groups, setGroups] = useState<ProviderGroupData[]>([]);
    const [categories, setCategories] =
        useState<ProviderCategoryData[]>([]);

    const [selectedId, setSelectedId] =
        useState<number | null>(null);

    const [selectedSnapshot, setSelectedSnapshot] =
        useState<ProviderData | null>(null);

    const [detail, setDetail] =
        useState<ProviderData | null>(null);

    const [modal, setModal] = useState<ModalType>(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [page, setPage] = useState(1);

    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [listError, setListError] = useState("");
    const [detailError, setDetailError] = useState("");
    const [modalError, setModalError] = useState("");

    const [notification, setNotification] =
        useState<NotificationData | null>(null);

    const [refreshKey, setRefreshKey] = useState(0);

    const handleApiError = useCallback(
        (error: unknown): boolean => {
            if (error instanceof UnauthorizedError) {
                clearSession();

                navigate("/user/sign-in", {
                    replace: true,
                });

                return true;
            }

            return false;
        },
        [navigate]
    );

    const notify = (
        type: NotificationData["type"],
        message: string
    ) => {
        setNotification({ type, message });
    };

    const refreshData = () => {
        setNotification(null);
        setRefreshKey((current) => current + 1);
    };

    useEffect(() => {
        const controller = new AbortController();

        const loadData = async () => {
            setLoading(true);
            setListError("");

            const results = await Promise.allSettled([
                getAllProviders(controller.signal),
                getAllGroups(controller.signal),
                getAllCategories(controller.signal),
            ]);

            if (controller.signal.aborted) return;

            const unauthorized = results.some(
                (result) =>
                    result.status === "rejected" &&
                    result.reason instanceof UnauthorizedError
            );

            if (unauthorized) {
                handleApiError(new UnauthorizedError());
                return;
            }

            const [providerResult, groupResult, categoryResult] =
                results;

            if (providerResult.status === "fulfilled") {
                setProviders(providerResult.value);
            } else {
                setProviders([]);
                setListError(
                    getErrorMessage(providerResult.reason)
                );
            }

            setGroups(
                groupResult.status === "fulfilled"
                    ? groupResult.value
                    : []
            );

            setCategories(
                categoryResult.status === "fulfilled"
                    ? categoryResult.value
                    : []
            );

            setLoading(false);
        };

        void loadData();

        return () => controller.abort();
    }, [refreshKey, handleApiError]);

    const selectedProvider = useMemo(() => {
        if (selectedId === null) return null;

        return (
            providers.find(
                (provider) => provider.id_provider === selectedId
            ) ?? selectedSnapshot
        );
    }, [providers, selectedId, selectedSnapshot]);

    const displayedDetail =
        detail?.id_provider === selectedId
            ? detail
            : selectedProvider;

    const getGroupName = (id: number | null): string => {
        if (id === null) return "Belum memiliki group";

        return (
            groups.find(
                (group) => group.id_provider_group === id
            )?.name_provider_group || `Group #${id}`
        );
    };

    const getCategoryName = (id: number | null): string => {
        if (id === null) return "—";

        return (
            categories.find(
                (category) => category.id_provider_category === id
            )?.name_provider_category || `Kategori #${id}`
        );
    };

    const approvedCount = providers.filter(
        (provider) => provider.status_provider === "APPROVED"
    ).length;

    const pendingCount = providers.filter(
        (provider) => isPendingStatus(provider.status_provider)
    ).length;

    const rejectedCount = providers.filter(
        (provider) => provider.status_provider === "REJECTED"
    ).length;

    const filteredProviders = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return providers.filter((provider) => {
            const searchFields = [
                provider.name_provider,
                provider.email_provider,
                provider.phone_number_provider,
                provider.city_provider,
                provider.province_provider,
                String(provider.id_provider),
            ];

            const matchesSearch = searchFields.some((value) =>
                value.toLowerCase().includes(keyword)
            );

            const matchesStatus =
                statusFilter === "ALL" ||
                (statusFilter === "PENDING" &&
                    isPendingStatus(provider.status_provider)) ||
                provider.status_provider === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [providers, search, statusFilter]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredProviders.length / PAGE_SIZE)
    );

    const currentPage = Math.min(page, totalPages);

    const displayedProviders = filteredProviders.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    useEffect(() => {
        if (selectedId === null || modal !== "detail") {
            return;
        }

        const controller = new AbortController();

        const loadDetail = async () => {
            setDetailLoading(true);
            setDetailError("");

            try {
                const result = await getProviderDetail(
                    selectedId,
                    controller.signal
                );

                if (!controller.signal.aborted) {
                    setDetail(result);
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    if (!handleApiError(error)) {
                        setDetailError(getErrorMessage(error));
                    }
                }
            } finally {
                if (!controller.signal.aborted) {
                    setDetailLoading(false);
                }
            }
        };

        void loadDetail();

        return () => controller.abort();
    }, [selectedId, modal, handleApiError]);

    const closeModal = useCallback(() => {
        if (saving) return;

        setModal(null);
        setSelectedId(null);
        setSelectedSnapshot(null);
        setDetail(null);
        setDetailError("");
        setModalError("");
    }, [saving]);

    const openDetail = (provider: ProviderData) => {
        setSelectedId(provider.id_provider);
        setSelectedSnapshot(provider);
        setDetail(provider);
        setDetailError("");
        setModalError("");
        setModal("detail");
    };

    const openApproval = (
        provider: ProviderData,
        type: "approve" | "reject"
    ) => {
        if (!isPendingStatus(provider.status_provider)) {
            notify(
                "error",
                "Hanya provider dengan status PENDING_APPROVAL yang dapat diproses."
            );
            return;
        }

        setSelectedId(provider.id_provider);
        setSelectedSnapshot(provider);
        setModalError("");
        setModal(type);
    };

    const handleApproval = async () => {
        if (
            saving ||
            selectedId === null ||
            !selectedProvider ||
            (modal !== "approve" && modal !== "reject")
        ) {
            return;
        }

        if (!isPendingStatus(selectedProvider.status_provider)) {
            setModalError(
                "Hanya provider PENDING_APPROVAL yang dapat diproses."
            );
            return;
        }

        const action = modal;
        const providerId = selectedId;

        setSaving(true);
        setModalError("");

        try {
            // Periksa status terkini sebelum mengirim keputusan.
            const freshProvider = await getProviderDetail(providerId);

            if (!isPendingStatus(freshProvider.status_provider)) {
                throw new Error(
                    "Status provider sudah berubah. Silakan refresh data."
                );
            }

            if (action === "approve") {
                await approveProvider(providerId);
            } else {
                await rejectProvider(providerId);
            }

            const latest = await getAllProviders();
            setProviders(latest);

            setModal(null);
            setSelectedId(null);
            setSelectedSnapshot(null);
            setDetail(null);

            notify(
                "success",
                action === "approve"
                    ? "Provider berhasil disetujui."
                    : "Provider berhasil ditolak."
            );
        } catch (error) {
            if (!handleApiError(error)) {
                setModalError(getErrorMessage(error));
            }
        } finally {
            setSaving(false);
        }
    };

    const renderDocuments = (provider: ProviderData) => (
        <div className="grid gap-3 sm:grid-cols-2">
            {DOCUMENT_FIELDS.map(({ key, label }) => {
                const url = provider[key];

                return (
                    <div
                        key={key}
                        className="flex items-center gap-3 rounded-xl border border-[#DBE4F0] p-3"
                    >
                        <div className="rounded-lg bg-blue-50 p-2 text-[#0866D8]">
                            <FileText size={18} />
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-900">
                                {label}
                            </p>

                            <p className="mt-1 text-[11px] text-slate-500">
                                {url ? "Tersedia" : "Belum tersedia"}
                            </p>
                        </div>

                        {url && (
                            <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`Buka ${label}`}
                                aria-label={`Buka ${label}`}
                                className="rounded-lg p-2 text-[#0866D8] hover:bg-blue-50"
                            >
                                <ExternalLink size={16} />
                            </a>
                        )}
                    </div>
                );
            })}
        </div>
    );

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
        if (modal === "detail" && displayedDetail) {
            const provider = displayedDetail;

            return (
                <Modal
                    title="Detail Provider"
                    wide
                    onClose={closeModal}
                >
                    {detailError && (
                        <div className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                            {detailError}
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

                    <div
                        className="space-y-6"
                        aria-busy={detailLoading}
                    >
                        {/* HEADER */}
                        <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                                {provider.logo_provider ? (
                                    <img
                                        src={provider.logo_provider}
                                        alt={provider.name_provider}
                                        className="h-full w-full object-contain"
                                    />
                                ) : (
                                    <Hospital
                                        size={28}
                                        className="text-[#0866D8]"
                                    />
                                )}
                            </div>

                            <div className="min-w-0 flex-1">
                                <h3 className="text-lg font-bold text-slate-950">
                                    {provider.name_provider}
                                </h3>

                                <p className="mt-1 text-xs text-slate-500">
                                    ID: {provider.id_provider}
                                </p>

                                <div className="mt-2">
                                    <StatusBadge
                                        status={provider.status_provider}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* INFORMASI PROVIDER */}
                        <section className="border-t border-slate-100 pt-5">
                            <h4 className="mb-4 text-sm font-bold text-[#00357A]">
                                Informasi Provider
                            </h4>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <DetailField
                                    label="Email"
                                    value={provider.email_provider}
                                />

                                <DetailField
                                    label="Nomor Telepon"
                                    value={provider.phone_number_provider}
                                />

                                <DetailField
                                    label="Kategori"
                                    value={getCategoryName(
                                        provider.id_provider_category
                                    )}
                                />

                                <DetailField
                                    label="Provider Group"
                                    value={getGroupName(
                                        provider.id_provider_group
                                    )}
                                />

                                <DetailField
                                    label="Platform ID"
                                    value={provider.id_platform}
                                />

                                <DetailField
                                    label="Deskripsi"
                                    value={provider.description_provider}
                                />
                            </div>
                        </section>

                        {/* LOKASI */}
                        <section className="border-t border-slate-100 pt-5">
                            <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#00357A]">
                                <MapPin size={16} />
                                Alamat Provider
                            </h4>

                            <div className="grid gap-4 sm:grid-cols-2">
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

                                <div className="sm:col-span-2">
                                    <DetailField
                                        label="Alamat Lengkap"
                                        value={provider.address_provider}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* DOKUMEN LEGALITAS */}
                        <section className="border-t border-slate-100 pt-5">
                            <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#00357A]">
                                <FileText size={16} />
                                Dokumen Legalitas
                            </h4>

                            {renderDocuments(provider)}
                        </section>
                    </div>

                    {/* AKSI DETAIL */}
                    <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5">
                        <button
                            type="button"
                            onClick={closeModal}
                            className={secondaryButton}
                        >
                            Tutup
                        </button>

                        {isPendingStatus(provider.status_provider) && (
                            <>
                                <button
                                    type="button"
                                    onClick={() =>
                                        openApproval(provider, "reject")
                                    }
                                    className={rejectButton}
                                >
                                    <ShieldX size={16} />
                                    Tolak
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        openApproval(provider, "approve")
                                    }
                                    className={approveButton}
                                >
                                    <ShieldCheck size={16} />
                                    Setujui
                                </button>
                            </>
                        )}
                    </div>
                </Modal>
            );
        }

        if (
            (modal === "approve" || modal === "reject") &&
            selectedProvider
        ) {
            const approving = modal === "approve";

            return (
                <Modal
                    title={
                        approving
                            ? "Setujui Provider?"
                            : "Tolak Provider?"
                    }
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
                                onClick={() => void handleApproval()}
                                disabled={saving}
                                className={
                                    approving ? approveButton : rejectButton
                                }
                            >
                                {saving && (
                                    <LoaderCircle
                                        size={16}
                                        className="animate-spin"
                                    />
                                )}

                                {saving
                                    ? "Memproses..."
                                    : approving
                                        ? "Ya, Setujui"
                                        : "Ya, Tolak"}
                            </button>
                        </>
                    }
                >
                    {modalErrorView}

                    <p className="text-sm leading-relaxed text-slate-600">
                        Yakin ingin{" "}
                        {approving ? "menyetujui" : "menolak"} provider{" "}
                        <strong className="text-slate-950">
                            {selectedProvider.name_provider}
                        </strong>
                        ?
                    </p>

                    <p className="mt-3 text-xs text-slate-500">
                        Keputusan ini hanya dapat dilakukan untuk
                        provider dengan status PENDING_APPROVAL.
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
                        Provider & Katalog / Provider
                    </p>

                    <h1 className="text-2xl font-bold text-slate-950 sm:text-[28px]">
                        Provider
                    </h1>

                    <p className="mt-2 text-sm text-[#526789]">
                        Lihat informasi, status, dan dokumen provider.
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

            {/* NOTIFIKASI */}
            {notification && (
                <div
                    role="alert"
                    className={`mb-5 flex items-center gap-3 rounded-xl border p-3 ${notification.type === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-700"
                        }`}
                >
                    {notification.type === "success" ? (
                        <CheckCircle2 size={18} />
                    ) : (
                        <AlertCircle size={18} />
                    )}

                    <p className="flex-1 text-sm">
                        {notification.message}
                    </p>

                    <button
                        type="button"
                        onClick={() => setNotification(null)}
                        aria-label="Tutup notifikasi"
                        className="cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* RINGKASAN */}
            <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
                {[
                    {
                        label: "Total Provider",
                        value: providers.length,
                        icon: <Building2 size={19} />,
                    },
                    {
                        label: "Approved",
                        value: approvedCount,
                        icon: <ShieldCheck size={19} />,
                    },
                    {
                        label: "Pending Approval",
                        value: pendingCount,
                        icon: <Clock3 size={19} />,
                    },
                    {
                        label: "Rejected",
                        value: rejectedCount,
                        icon: <ShieldX size={19} />,
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

            {/* DAFTAR PROVIDER */}
            <section className="overflow-hidden rounded-2xl border border-[#DBE4F0] bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
                    <div>
                        <h2 className="text-sm font-bold text-slate-950">
                            Daftar Provider
                        </h2>

                        <p className="mt-1 text-xs text-[#526789]">
                            {loading
                                ? "Memuat..."
                                : `${filteredProviders.length} provider`}
                        </p>
                    </div>

                    <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                        {/* SEARCH */}
                        <div className="relative min-w-50 flex-1 sm:w-64">
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

                        {/* FILTER STATUS */}
                        <select
                            value={statusFilter}
                            onChange={(event) => {
                                setStatusFilter(event.target.value);
                                setPage(1);
                            }}
                            aria-label="Filter status provider"
                            className="cursor-pointer rounded-lg border border-[#DBE4F0] bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#0866D8]"
                        >
                            <option value="ALL">
                                Semua Status
                            </option>

                            <option value="PENDING_OTP">
                                Pending OTP
                            </option>

                            <option value="PENDING_APPROVAL">
                                Pending Approval
                            </option>

                            <option value="APPROVED">
                                Approved
                            </option>

                            <option value="REJECTED">
                                Rejected
                            </option>
                        </select>
                    </div>
                </div>

                {/* TABEL */}
                {loading ? (
                    <LoadingState />
                ) : listError ? (
                    <div className="flex items-center gap-2 p-5 text-sm text-red-600">
                        <AlertCircle size={18} />
                        {listError}
                    </div>
                ) : filteredProviders.length === 0 ? (
                    <EmptyState message="Provider tidak ditemukan." />
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
                                        Lokasi
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        Group
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
                                {displayedProviders.map((provider, index) => (
                                    <tr
                                        key={provider.id_provider}
                                        className="border-t border-slate-100 hover:bg-slate-50"
                                    >
                                        {/* NO */}
                                        <td className="px-5 py-4 text-slate-500">
                                            {(currentPage - 1) * PAGE_SIZE +
                                                index +
                                                1}
                                        </td>

                                        {/* PROVIDER */}
                                        <td className="px-5 py-4">
                                            <div className="flex min-w-47 items-center gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-blue-50 text-[#0866D8]">
                                                    {provider.logo_provider ? (
                                                        <img
                                                            src={provider.logo_provider}
                                                            alt=""
                                                            className="h-full w-full object-contain"
                                                        />
                                                    ) : (
                                                        <Hospital size={21} />
                                                    )}
                                                </div>

                                                <div className="min-w-0">
                                                    <p className="max-w-55 truncate font-semibold text-slate-950">
                                                        {provider.name_provider ||
                                                            "Tanpa Nama"}
                                                    </p>

                                                    <p className="mt-1 max-w-55 truncate text-xs text-slate-500">
                                                        {provider.email_provider ||
                                                            `ID: ${provider.id_provider}`}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* LOKASI */}
                                        <td className="px-5 py-4 text-slate-600">
                                            <div className="flex items-center gap-1.5">
                                                <MapPin
                                                    size={14}
                                                    className="shrink-0 text-slate-400"
                                                />

                                                <span>
                                                    {provider.city_provider || "—"}
                                                </span>
                                            </div>
                                        </td>

                                        {/* GROUP */}
                                        <td className="px-5 py-4 text-slate-600">
                                            {getGroupName(
                                                provider.id_provider_group
                                            )}
                                        </td>

                                        {/* STATUS */}
                                        <td className="px-5 py-4 text-center">
                                            <StatusBadge
                                                status={provider.status_provider}
                                            />
                                        </td>

                                        {/* AKSI */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                {/* DETAIL - SEMUA STATUS */}
                                                <button
                                                    type="button"
                                                    onClick={() => openDetail(provider)}
                                                    title="Detail Provider"
                                                    aria-label={`Detail ${provider.name_provider}`}
                                                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-blue-50 text-[#0866D8] hover:bg-blue-100"
                                                >
                                                    <Eye size={18} />
                                                </button>

                                                {/* APPROVE / REJECT */}
                                                {isPendingStatus(
                                                    provider.status_provider
                                                ) && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    openApproval(
                                                                        provider,
                                                                        "approve"
                                                                    )
                                                                }
                                                                title="Setujui Provider"
                                                                aria-label={`Setujui ${provider.name_provider}`}
                                                                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                                            >
                                                                <ShieldCheck size={18} />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    openApproval(
                                                                        provider,
                                                                        "reject"
                                                                    )
                                                                }
                                                                title="Tolak Provider"
                                                                aria-label={`Tolak ${provider.name_provider}`}
                                                                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                                                            >
                                                                <ShieldX size={18} />
                                                            </button>
                                                        </>
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
                                        setPage((current) =>
                                            Math.max(1, current - 1)
                                        )
                                    }
                                    aria-label="Halaman sebelumnya"
                                    className="rounded-lg border border-[#DBE4F0] p-2 disabled:opacity-40"
                                >
                                    <ChevronLeft size={17} />
                                </button>

                                <span className="text-xs font-semibold text-slate-700">
                                    {currentPage} / {totalPages}
                                </span>

                                <button
                                    type="button"
                                    disabled={currentPage >= totalPages}
                                    onClick={() =>
                                        setPage((current) =>
                                            Math.min(totalPages, current + 1)
                                        )
                                    }
                                    aria-label="Halaman berikutnya"
                                    className="rounded-lg border border-[#DBE4F0] p-2 disabled:opacity-40"
                                >
                                    <ChevronRight size={17} />
                                </button>
                            </div>
                        </div>
                    )}
            </section>

            {/* MODAL DETAIL DAN PERSETUJUAN */}
            {renderModal()}
        </div>
    );
};

export default Provider;
