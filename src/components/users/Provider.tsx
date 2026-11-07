import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ChangeEvent,
    type FormEvent,
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
    Pencil,
    RefreshCw,
    Search,
    ShieldCheck,
    ShieldX,
    Upload,
    X,
} from "lucide-react";

const PAGE_SIZE = 10;

type ApiRecord = Record<string, unknown>;

type ModalType =
    | "detail"
    | "edit"
    | "approve"
    | "reject"
    | null;

type DocumentKey =
    | "akta_pendirian_perusahaan"
    | "nomor_induk_berusaha"
    | "npwp"
    | "sertifikat_standard"
    | "persetujuan_lingkungan"
    | "surat_izin_apotek";

type UploadKey = DocumentKey | "logo_provider";

type ProviderFormKey =
    | "name_provider"
    | "email_provider"
    | "phone_number_provider"
    | "address_provider"
    | "province_provider"
    | "city_provider"
    | "district_provider"
    | "postal_code_provider"
    | "description_provider"
    | "id_provider_category";

type ProviderForm = Record<ProviderFormKey, string>;

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
    wide?: boolean;
    busy?: boolean;
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

const EMPTY_FORM: ProviderForm = {
    name_provider: "",
    email_provider: "",
    phone_number_provider: "",
    address_provider: "",
    province_provider: "",
    city_provider: "",
    district_provider: "",
    postal_code_provider: "",
    description_provider: "",
    id_provider_category: "",
};

const primaryButton =
    "cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg bg-[#0866D8] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton =
    "cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg border border-[#DBE4F0] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

const inputClass =
    "w-full rounded-lg border border-[#DBE4F0] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0866D8] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50";

const isRecord = (
    value: unknown
): value is ApiRecord => {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
};

const toNumber = (value: unknown): number | null => {
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

const toText = (value: unknown): string => {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value);
};

const normalizeStatus = (value: unknown): string => {
    return toText(value || "UNKNOWN")
        .trim()
        .toUpperCase();
};

const isPendingStatus = (status: string): boolean => {
    return [
        "PENDING",
        "WAITING",
        "SUBMITTED",
        "PENDING_APPROVAL",
    ].includes(normalizeStatus(status));
};

const getErrorMessage = (error: unknown): string => {
    return error instanceof Error
        ? error.message
        : "Terjadi kesalahan. Silakan coba kembali.";
};

const getFileUrl = (value: unknown): string | null => {
    if (typeof value !== "string" || !value.trim()) {
        return null;
    }

    const raw = value.trim();

    try {
        const url = new URL(raw, `${import.meta.env.VITE_API_URI}/`);

        if (
            url.protocol !== "http:" &&
            url.protocol !== "https:"
        ) {
            return null;
        }

        return url.href;
    } catch {
        return null;
    }
};

const getToken = (): string | null => {
    return (
        sessionStorage.getItem("admin_token") ??
        localStorage.getItem("admin_token")
    );
};

const clearSession = (): void => {
    [
        "admin_token",
        "admin_user",
        "admin_role",
    ].forEach((key) => {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
    });
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
                // Periksa properti berikutnya.
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
                return extractObject(
                    payload[key],
                    keys,
                    depth + 1
                );
            } catch {
                // Periksa field berikutnya.
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

        id_provider_group: toNumber(
            row.id_provider_group
        ),

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

const providerToForm = (
    provider: ProviderData
): ProviderForm => {
    return {
        name_provider: provider.name_provider,
        email_provider: provider.email_provider,
        phone_number_provider:
            provider.phone_number_provider,

        address_provider: provider.address_provider,
        province_provider: provider.province_provider,
        city_provider: provider.city_provider,
        district_provider: provider.district_provider,
        postal_code_provider: provider.postal_code_provider,

        description_provider:
            provider.description_provider,

        id_provider_category:
            provider.id_provider_category?.toString() ?? "",
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

    const response = await fetch(
        `${import.meta.env.VITE_API_URI}${endpoint}`,
        {
            ...options,
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
                ...options.headers,
            },
        }
    );

    if (response.status === 401) {
        throw new UnauthorizedError();
    }

    const contentType =
        response.headers.get("content-type") || "";

    let payload: unknown = null;

    if (contentType.includes("application/json")) {
        payload = await response.json();
    } else {
        const text = await response.text();
        payload = text || null;
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

    if (
        isRecord(payload) &&
        payload.success === false
    ) {
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
            id_provider_group: toNumber(
                row.id_provider_group
            ),
            name_provider_group: toText(
                row.name_provider_group
            ),
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

const approveProvider = (id: number) => {
    return apiRequest(`/provider/${id}/approve`, {
        method: "PATCH",
    });
};

const rejectProvider = (id: number) => {
    return apiRequest(`/provider/${id}/reject`, {
        method: "PATCH",
    });
};

const buildFormData = (
    form: ProviderForm,
    files: Partial<Record<UploadKey, File>>
): FormData => {
    const data = new FormData();

    (
        Object.keys(form) as ProviderFormKey[]
    ).forEach((key) => {
        data.append(key, form[key]);
    });

    (
        Object.entries(files) as [
            UploadKey,
            File | undefined,
        ][]
    ).forEach(([key, file]) => {
        if (file) {
            data.append(key, file);
        }
    });

    return data;
};

const updateProvider = (
    id: number,
    form: ProviderForm,
    files: Partial<Record<UploadKey, File>>
) => {
    return apiRequest(`/provider/${id}`, {
        method: "PATCH",
        body: buildFormData(form, files),
    });
};

const StatusBadge = ({
    status,
}: {
    status: string;
}) => {
    const value = normalizeStatus(status);

    const color =
        value === "APPROVED"
            ? "bg-emerald-50 text-emerald-700"
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
}) => {
    return (
        <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-500">
            <LoaderCircle
                size={18}
                className="animate-spin text-[#0866D8]"
            />
            {label}
        </div>
    );
};

const EmptyState = ({
    message,
}: {
    message: string;
}) => {
    return (
        <div className="flex min-h-40 flex-col items-center justify-center gap-2 p-5 text-center">
            <Hospital
                size={28}
                className="text-slate-300"
            />

            <p className="text-sm text-slate-500">
                {message}
            </p>
        </div>
    );
};

const DetailField = ({
    label,
    value,
}: {
    label: string;
    value?: string | number | null;
}) => {
    const display =
        value === null ||
            value === undefined ||
            value === ""
            ? "—"
            : value;

    return (
        <div className="min-w-0">
            <p className="text-xs text-[#526789]">
                {label}
            </p>

            <p className="mt-1 wrap-break-word text-sm font-medium text-slate-900">
                {display}
            </p>
        </div>
    );
};

const Modal = ({
    title,
    children,
    footer,
    onClose,
    wide = false,
    busy = false,
}: ModalProps) => {
    const onCloseRef = useState(() => onClose)[0];

    // onCloseRef is not needed for rendering.
    // The effect below is intentionally only used
    // for keyboard handling.

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !busy) {
                onClose();
            }
        };

        document.addEventListener(
            "keydown",
            onKeyDown
        );

        return () => {
            document.removeEventListener(
                "keydown",
                onKeyDown
            );
        };
    }, [busy, onClose]);

    void onCloseRef;

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
                {/* HEADER */}
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

                {/* BODY */}
                <div className="min-h-0 flex-1 overflow-y-auto p-5 scrollbar-gutter-stable">
                    {children}
                </div>

                {/* FOOTER */}
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

    const [providers, setProviders] =
        useState<ProviderData[]>([]);

    const [groups, setGroups] =
        useState<ProviderGroupData[]>([]);

    const [categories, setCategories] =
        useState<ProviderCategoryData[]>([]);

    const [selectedId, setSelectedId] =
        useState<number | null>(null);

    const [selectedSnapshot, setSelectedSnapshot] =
        useState<ProviderData | null>(null);

    const [detail, setDetail] =
        useState<ProviderData | null>(null);

    const [form, setForm] = useState<ProviderForm>({
        ...EMPTY_FORM,
    });

    const [files, setFiles] = useState<
        Partial<Record<UploadKey, File>>
    >({});

    const [modal, setModal] =
        useState<ModalType>(null);

    const [search, setSearch] =
        useState("");

    const [statusFilter, setStatusFilter] =
        useState("ALL");

    const [page, setPage] = useState(1);

    const [loading, setLoading] = useState(true);

    const [detailLoading, setDetailLoading] =
        useState(false);

    const [saving, setSaving] = useState(false);

    const [listError, setListError] =
        useState("");

    const [detailError, setDetailError] =
        useState("");

    const [modalError, setModalError] =
        useState("");

    const [notification, setNotification] =
        useState<NotificationData | null>(null);

    const [refreshKey, setRefreshKey] =
        useState(0);

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

            const [
                providerResult,
                groupResult,
                categoryResult,
            ] = results;

            // PROVIDERS
            if (providerResult.status === "fulfilled") {
                setProviders(providerResult.value);
            } else {
                setProviders([]);
                setListError(
                    getErrorMessage(providerResult.reason)
                );
            }

            // GROUPS
            if (groupResult.status === "fulfilled") {
                setGroups(groupResult.value);
            } else {
                setGroups([]);
            }

            // CATEGORIES
            if (categoryResult.status === "fulfilled") {
                setCategories(categoryResult.value);
            } else {
                setCategories([]);
            }

            setLoading(false);
        };

        void loadData();

        return () => controller.abort();
    }, [refreshKey, handleApiError]);

    const selectedProvider = useMemo(() => {
        if (selectedId === null) {
            return null;
        }

        const latest = providers.find(
            (provider) => provider.id_provider === selectedId
        );

        return latest ?? selectedSnapshot;
    }, [
        providers,
        selectedId,
        selectedSnapshot,
    ]);

    const displayedDetail =
        detail?.id_provider === selectedId
            ? detail
            : selectedProvider;

    const getGroupName = (id: number | null): string => {
        if (id === null) return "Belum memiliki group";

        const group = groups.find(
            (item) => item.id_provider_group === id
        );

        return group?.name_provider_group || `Group #${id}`;
    };

    const getCategoryName = (
        id: number | null
    ): string => {
        if (id === null) return "—";

        const category = categories.find(
            (item) => item.id_provider_category === id
        );

        return (
            category?.name_provider_category ||
            `Kategori #${id}`
        );
    };

    const totalProviders = providers.length;

    const approvedCount = providers.filter(
        (provider) =>
            provider.status_provider === "APPROVED"
    ).length;

    const pendingCount = providers.filter(
        (provider) =>
            isPendingStatus(provider.status_provider)
    ).length;

    const rejectedCount = providers.filter(
        (provider) =>
            provider.status_provider === "REJECTED"
    ).length;

    const filteredProviders = useMemo(() => {
        const keyword = search
            .trim()
            .toLowerCase();

        return providers.filter((provider) => {
            const searchFields = [
                provider.name_provider,
                provider.email_provider,
                provider.phone_number_provider,
                provider.city_provider,
                provider.province_provider,
                String(provider.id_provider),
            ];

            const matchSearch = searchFields.some(
                (value) =>
                    value.toLowerCase().includes(keyword)
            );

            const matchStatus =
                statusFilter === "ALL"
                    ? true
                    : statusFilter === "PENDING"
                        ? isPendingStatus(provider.status_provider)
                        : provider.status_provider === statusFilter;

            return matchSearch && matchStatus;
        });
    }, [
        providers,
        search,
        statusFilter,
    ]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredProviders.length / PAGE_SIZE)
    );

    const currentPage = Math.min(
        page,
        totalPages
    );

    const displayedProviders = filteredProviders.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    useEffect(() => {
        if (
            selectedId === null ||
            modal !== "detail"
        ) {
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

                if (controller.signal.aborted) return;

                setDetail(result);
            } catch (error) {
                if (controller.signal.aborted) return;

                if (!handleApiError(error)) {
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

        return () => controller.abort();
    }, [
        selectedId,
        modal,
        handleApiError,
    ]);

    const closeModal = useCallback(() => {
        if (saving) return;

        setModal(null);
        setSelectedId(null);
        setSelectedSnapshot(null);
        setDetail(null);

        setForm({ ...EMPTY_FORM });
        setFiles({});

        setModalError("");
        setDetailError("");
    }, [saving]);

    const openDetail = (provider: ProviderData) => {
        setSelectedId(provider.id_provider);
        setSelectedSnapshot(provider);
        setDetail(provider);

        setModalError("");
        setDetailError("");

        setModal("detail");
    };

    const openEdit = (provider: ProviderData) => {
        setSelectedId(provider.id_provider);
        setSelectedSnapshot(provider);

        setForm(providerToForm(provider));
        setFiles({});

        setModalError("");
        setModal("edit");
    };

    const openApproval = (
        provider: ProviderData,
        type: "approve" | "reject"
    ) => {
        setSelectedId(provider.id_provider);
        setSelectedSnapshot(provider);

        setModalError("");
        setModal(type);
    };

    const updateForm = (
        key: ProviderFormKey,
        value: string
    ) => {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
    };

    const handleFileChange = (
        key: UploadKey,
        event: ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];

        if (!file) return;

        const extension = file.name
            .split(".")
            .pop()
            ?.toLowerCase();

        const isLogo = key === "logo_provider";

        const allowed = isLogo
            ? ["jpg", "jpeg", "png", "webp"]
            : ["pdf"];

        if (
            !extension ||
            !allowed.includes(extension)
        ) {
            setModalError(
                isLogo
                    ? "Logo harus berupa JPG, PNG, atau WEBP."
                    : "Dokumen harus berupa PDF."
            );

            event.target.value = "";
            return;
        }

        const maxSize = isLogo
            ? 5 * 1024 * 1024
            : 10 * 1024 * 1024;

        if (file.size > maxSize) {
            setModalError(
                isLogo
                    ? "Ukuran logo maksimal 5 MB."
                    : "Ukuran dokumen maksimal 10 MB."
            );

            event.target.value = "";
            return;
        }

        setModalError("");

        setFiles((current) => ({
            ...current,
            [key]: file,
        }));
    };

    const handleSaveProvider = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (
            saving ||
            selectedId === null
        ) {
            return;
        }

        if (!form.name_provider.trim()) {
            setModalError("Nama provider wajib diisi.");
            return;
        }

        setSaving(true);
        setModalError("");

        try {
            await updateProvider(
                selectedId,
                form,
                files
            );

            // Sync data terbaru.
            const latest = await getAllProviders();

            setProviders(latest);

            setModal(null);
            setSelectedId(null);
            setSelectedSnapshot(null);
            setDetail(null);

            notify(
                "success",
                "Data provider berhasil diperbarui."
            );
        } catch (error) {
            if (!handleApiError(error)) {
                setModalError(
                    getErrorMessage(error)
                );
            }
        } finally {
            setSaving(false);
        }
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

        const action = modal;
        const providerId = selectedId;

        setSaving(true);
        setModalError("");

        try {
            if (action === "approve") {
                await approveProvider(providerId);
            } else {
                await rejectProvider(providerId);
            }

            const latest = await getAllProviders();

            setProviders(latest);

            const updated = latest.find(
                (provider) =>
                    provider.id_provider === providerId
            );

            const expectedStatus =
                action === "approve"
                    ? "APPROVED"
                    : "REJECTED";

            if (
                updated?.status_provider !== expectedStatus
            ) {
                throw new Error(
                    "Status provider belum berubah di backend."
                );
            }

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
                setModalError(
                    getErrorMessage(error)
                );
            }
        } finally {
            setSaving(false);
        }
    };

    const renderInput = (
        key: ProviderFormKey,
        label: string,
        type = "text"
    ) => {
        return (
            <div>
                <label
                    htmlFor={key}
                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                >
                    {label}
                </label>

                <input
                    id={key}
                    type={type}
                    value={form[key]}
                    onChange={(event) =>
                        updateForm(
                            key,
                            event.target.value
                        )
                    }
                    disabled={saving}
                    className={inputClass}
                />
            </div>
        );
    };

    const renderFileInput = (
        key: UploadKey,
        label: string
    ) => {
        const existingFile =
            selectedProvider?.[key] ?? null;

        return (
            <div>
                <label
                    htmlFor={`upload-${key}`}
                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                >
                    {label}
                </label>

                <label
                    htmlFor={`upload-${key}`}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#CBD8E8] bg-[#FAFCFF] px-3 py-3 text-xs text-slate-600 hover:border-[#0866D8]"
                >
                    <Upload
                        size={16}
                        className="shrink-0 text-[#0866D8]"
                    />

                    <span className="min-w-0 flex-1 truncate">
                        {files[key]?.name ||
                            "Pilih file"}
                    </span>
                </label>

                <input
                    id={`upload-${key}`}
                    type="file"
                    accept={
                        key === "logo_provider"
                            ? ".jpg,.jpeg,.png,.webp"
                            : ".pdf"
                    }
                    onChange={(event) =>
                        handleFileChange(key, event)
                    }
                    disabled={saving}
                    className="sr-only"
                />

                {existingFile && (
                    <a
                        href={existingFile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#0866D8] hover:underline"
                    >
                        <ExternalLink size={13} />
                        Lihat file saat ini
                    </a>
                )}
            </div>
        );
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

    const renderModal = () => {
        if (
            modal === "detail" &&
            displayedDetail
        ) {
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

                        {/* INFORMASI */}
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
                                    value={
                                        provider.phone_number_provider
                                    }
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
                                    value={
                                        provider.description_provider
                                    }
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

                        {/* LEGAL DOCUMENTS */}
                        <section className="border-t border-slate-100 pt-5">
                            <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#00357A]">
                                <FileText size={16} />
                                Dokumen Legalitas
                            </h4>

                            <div className="grid gap-3 sm:grid-cols-2">
                                {DOCUMENT_FIELDS.map((item) => {
                                    const fileUrl = provider[item.key];

                                    return (
                                        <div
                                            key={item.key}
                                            className="flex items-center gap-3 rounded-xl border border-[#DBE4F0] p-3"
                                        >
                                            <div className="rounded-lg bg-blue-50 p-2 text-[#0866D8]">
                                                <FileText size={18} />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-semibold text-slate-900">
                                                    {item.label}
                                                </p>

                                                <p className="mt-1 text-[11px] text-slate-500">
                                                    {fileUrl
                                                        ? "Tersedia"
                                                        : "Belum tersedia"}
                                                </p>
                                            </div>

                                            {fileUrl && (
                                                <a
                                                    href={fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    aria-label={`Buka ${item.label}`}
                                                    title={`Buka ${item.label}`}
                                                    className="rounded-lg p-2 text-[#0866D8] hover:bg-blue-50"
                                                >
                                                    <ExternalLink size={16} />
                                                </a>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>

                    {/* DETAIL ACTIONS */}
                    <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5">
                        {isPendingStatus(
                            provider.status_provider
                        ) && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            openApproval(
                                                provider,
                                                "reject"
                                            )
                                        }
                                        className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100"
                                    >
                                        <ShieldX size={16} />
                                        Tolak
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            openApproval(
                                                provider,
                                                "approve"
                                            )
                                        }
                                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                                    >
                                        <ShieldCheck size={16} />
                                        Setujui
                                    </button>
                                </>
                            )}

                        <button
                            type="button"
                            onClick={() =>
                                openEdit(provider)
                            }
                            className={secondaryButton}
                        >
                            <Pencil size={16} />
                            Edit
                        </button>
                    </div>
                </Modal>
            );
        }

        if (
            modal === "edit" &&
            selectedProvider
        ) {
            return (
                <Modal
                    title="Edit Provider"
                    wide
                    onClose={closeModal}
                    busy={saving}
                >
                    {modalErrorView}

                    <form
                        onSubmit={handleSaveProvider}
                        className="space-y-6"
                    >
                        {/* INFORMASI UMUM */}
                        <section>
                            <h3 className="mb-4 text-sm font-bold text-[#00357A]">
                                Informasi Provider
                            </h3>

                            <div className="grid gap-4 sm:grid-cols-2">
                                {renderInput(
                                    "name_provider",
                                    "Nama Provider"
                                )}

                                {renderInput(
                                    "email_provider",
                                    "Email",
                                    "email"
                                )}

                                {renderInput(
                                    "phone_number_provider",
                                    "Nomor Telepon",
                                    "tel"
                                )}

                                <div>
                                    <label
                                        htmlFor="id_provider_category"
                                        className="mb-1.5 block text-xs font-semibold text-slate-700"
                                    >
                                        Kategori Provider
                                    </label>

                                    <select
                                        id="id_provider_category"
                                        value={form.id_provider_category}
                                        onChange={(event) =>
                                            updateForm(
                                                "id_provider_category",
                                                event.target.value
                                            )
                                        }
                                        disabled={saving}
                                        className={inputClass}
                                    >
                                        <option value="">
                                            Pilih kategori
                                        </option>

                                        {categories.map((category) => (
                                            <option
                                                key={
                                                    category.id_provider_category
                                                }
                                                value={
                                                    category.id_provider_category
                                                }
                                            >
                                                {
                                                    category.name_provider_category
                                                }
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="mt-4">
                                <label
                                    htmlFor="description_provider"
                                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                                >
                                    Deskripsi
                                </label>

                                <textarea
                                    id="description_provider"
                                    value={form.description_provider}
                                    onChange={(event) =>
                                        updateForm(
                                            "description_provider",
                                            event.target.value
                                        )
                                    }
                                    rows={3}
                                    disabled={saving}
                                    className={inputClass}
                                />
                            </div>
                        </section>

                        {/* ALAMAT */}
                        <section className="border-t border-slate-100 pt-5">
                            <h3 className="mb-4 text-sm font-bold text-[#00357A]">
                                Alamat Provider
                            </h3>

                            <div className="grid gap-4 sm:grid-cols-2">
                                {renderInput(
                                    "province_provider",
                                    "Provinsi"
                                )}

                                {renderInput(
                                    "city_provider",
                                    "Kota / Kabupaten"
                                )}

                                {renderInput(
                                    "district_provider",
                                    "Kecamatan"
                                )}

                                {renderInput(
                                    "postal_code_provider",
                                    "Kode Pos"
                                )}
                            </div>

                            <div className="mt-4">
                                {renderInput(
                                    "address_provider",
                                    "Alamat Lengkap"
                                )}
                            </div>
                        </section>

                        {/* DOCUMENTS */}
                        <section className="border-t border-slate-100 pt-5">
                            <h3 className="mb-4 text-sm font-bold text-[#00357A]">
                                Logo & Dokumen
                            </h3>

                            <div className="grid gap-4 sm:grid-cols-2">
                                {renderFileInput(
                                    "logo_provider",
                                    "Logo Provider"
                                )}

                                {DOCUMENT_FIELDS.map((item) => (
                                    <div key={item.key}>
                                        {renderFileInput(
                                            item.key,
                                            item.label
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* BUTTONS */}
                        <div className="flex justify-end gap-2 border-t border-slate-100 pt-5">
                            <button
                                type="button"
                                onClick={closeModal}
                                disabled={saving}
                                className={secondaryButton}
                            >
                                Batal
                            </button>

                            <button
                                type="submit"
                                disabled={saving}
                                className={primaryButton}
                            >
                                {saving ? (
                                    <>
                                        <LoaderCircle
                                            size={16}
                                            className="animate-spin"
                                        />
                                        Menyimpan...
                                    </>
                                ) : (
                                    "Simpan Perubahan"
                                )}
                            </button>
                        </div>
                    </form>
                </Modal>
            );
        }

        if (
            (modal === "approve" ||
                modal === "reject") &&
            selectedProvider
        ) {
            const approving =
                modal === "approve";

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
                                onClick={handleApproval}
                                disabled={saving}
                                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${approving
                                    ? "bg-emerald-600 hover:bg-emerald-700"
                                    : "bg-red-600 hover:bg-red-700"
                                    }`}
                            >
                                {saving && (
                                    <LoaderCircle
                                        size={16}
                                        className="animate-spin"
                                    />
                                )}

                                {approving
                                    ? "Setujui"
                                    : "Tolak"}
                            </button>
                        </>
                    }
                >
                    {modalErrorView}

                    <p className="text-sm text-slate-600">
                        Yakin ingin{" "}
                        {approving
                            ? "menyetujui"
                            : "menolak"}{" "}
                        <strong>
                            {selectedProvider.name_provider}
                        </strong>
                        ?
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
                        Kelola data dan verifikasi provider.
                    </p>
                </div>

                {/* ONLY REFRESH */}
                <button
                    type="button"
                    onClick={refreshData}
                    disabled={loading || saving}
                    className={secondaryButton}
                >
                    <RefreshCw
                        size={16}
                        className={
                            loading ? "animate-spin" : ""
                        }
                    />
                    Refresh
                </button>
            </div>

            {/* NOTIFICATION */}
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
                        onClick={() =>
                            setNotification(null)
                        }
                        aria-label="Tutup notifikasi"
                        className="cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* SUMMARY */}
            <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
                {[
                    {
                        label: "Total Provider",
                        value: totalProviders,
                        icon: <Building2 size={19} />,
                    },
                    {
                        label: "Approved",
                        value: approvedCount,
                        icon: <ShieldCheck size={19} />,
                    },
                    {
                        label: "Pending",
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
                            {loading || listError
                                ? "—"
                                : stat.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* PROVIDER TABLE */}
            <section className="overflow-hidden rounded-2xl border border-[#DBE4F0] bg-white shadow-sm">
                {/* TABLE HEADER */}
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

                        {/* STATUS FILTER */}
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

                            <option value="PENDING">
                                Pending
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

                {/* TABLE BODY */}
                {loading ? (
                    <LoadingState />
                ) : listError ? (
                    <div className="p-5 text-sm text-red-600">
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
                                                <div className="flex min-w-47.5 items-center gap-3">
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
                                                            {
                                                                provider.name_provider
                                                            }
                                                        </p>

                                                        <p className="mt-1 max-w-55 truncate text-xs text-slate-500">
                                                            {provider.email_provider ||
                                                                `ID: ${provider.id_provider}`}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* LOCATION */}
                                            <td className="px-5 py-4 text-slate-600">
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin
                                                        size={14}
                                                        className="shrink-0 text-slate-400"
                                                    />

                                                    <span>
                                                        {provider.city_provider ||
                                                            "—"}
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
                                                    status={
                                                        provider.status_provider
                                                    }
                                                />
                                            </td>

                                            {/* ACTIONS */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* DETAIL */}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openDetail(provider)
                                                        }
                                                        title="Detail Provider"
                                                        aria-label={`Detail ${provider.name_provider}`}
                                                        className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-[#0866D8] hover:bg-blue-100"
                                                    >
                                                        <Eye size={18} />
                                                    </button>

                                                    {/* EDIT */}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openEdit(provider)
                                                        }
                                                        title="Edit Provider"
                                                        aria-label={`Edit ${provider.name_provider}`}
                                                        className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100"
                                                    >
                                                        <Pencil size={18} />
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
                                                                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                                                >
                                                                    <ShieldCheck
                                                                        size={18}
                                                                    />
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
                                                                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                                                                >
                                                                    <ShieldX size={18} />
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
                                {(currentPage - 1) *
                                    PAGE_SIZE +
                                    1}
                                –
                                {Math.min(
                                    currentPage * PAGE_SIZE,
                                    filteredProviders.length
                                )}{" "}
                                dari {filteredProviders.length}
                            </p>

                            <div className="flex items-center gap-3">
                                {/* PREVIOUS */}
                                <button
                                    type="button"
                                    disabled={currentPage === 1}
                                    onClick={() =>
                                        setPage((current) =>
                                            Math.max(
                                                1,
                                                current - 1
                                            )
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

                                {/* NEXT */}
                                <button
                                    type="button"
                                    disabled={
                                        currentPage >= totalPages
                                    }
                                    onClick={() =>
                                        setPage((current) =>
                                            Math.min(
                                                totalPages,
                                                current + 1
                                            )
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

            {/* ALL ACTION MODALS */}
            {renderModal()}
        </div>
    );
};

export default Provider;
