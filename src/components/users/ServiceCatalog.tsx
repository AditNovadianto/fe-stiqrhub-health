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
    CircleDollarSign,
    ClipboardList,
    ExternalLink,
    Eye,
    ImageIcon,
    LoaderCircle,
    MapPin,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    Upload,
    X,
} from "lucide-react";

const PAGE_SIZE = 10;

type ApiRecord = Record<string, unknown>;

type ModalType =
    | "detail"
    | "create"
    | "edit"
    | "delete"
    | null;

interface ServiceData {
    id_service: number;
    name_service: string;
    price_service: number | null;
    description_service: string;
    status_service: string;
    maps_service: string;
    quota_service: number | null;
    id_provider: number | null;
    image_service: string | null;
}

interface ProviderData {
    id_provider: number;
    name_provider: string;
    id_provider_category: number | null;
}

interface CategoryData {
    id_provider_category: number;
    name_provider_category: string;
}

interface ServiceForm {
    name_service: string;
    price_service: string;
    description_service: string;
    status_service: string;
    maps_service: string;
    quota_service: string;
    id_provider: string;
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
    wide?: boolean;
    busy?: boolean;
}

const primaryButton =
    "cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg bg-[#0866D8] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton =
    "cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg border border-[#DBE4F0] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

const dangerButton =
    "cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50";

const inputClass =
    "w-full rounded-lg border border-[#DBE4F0] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0866D8] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50";

const emptyForm = (): ServiceForm => ({
    name_service: "",
    price_service: "",
    description_service: "",
    status_service: "ACTIVE",
    maps_service: "",
    quota_service: "",
    id_provider: "",
});

const isRecord = (
    value: unknown
): value is ApiRecord =>
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value);

const textValue = (value: unknown): string => {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value);
};

const numberValue = (
    value: unknown
): number | null => {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
};

const idValue = (
    value: unknown
): number | null => {
    const parsed = numberValue(value);

    return parsed !== null &&
        Number.isSafeInteger(parsed) &&
        parsed > 0
        ? parsed
        : null;
};

const statusValue = (
    value: unknown
): string =>
    textValue(value || "UNKNOWN")
        .trim()
        .toUpperCase();

const getErrorMessage = (
    error: unknown
): string =>
    error instanceof Error
        ? error.message
        : "Terjadi kesalahan. Silakan coba kembali.";

const formatPrice = (
    value: number | null
): string => {
    if (value === null) return "—";

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(value);
};

const getToken = (): string | null =>
    sessionStorage.getItem("admin_token") ??
    localStorage.getItem("admin_token");

const clearSession = () => {
    [
        "admin_token",
        "admin_user",
        "admin_role",
    ].forEach((key) => {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
    });
};

const resolveFileUrl = (
    value: unknown
): string | null => {
    if (
        typeof value !== "string" ||
        !value.trim()
    ) {
        return null;
    }

    try {
        const url = new URL(
            value.trim(),
            `${import.meta.env.VITE_API_URI}/`
        );

        if (
            !["http:", "https:"].includes(
                url.protocol
            )
        ) {
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
            throw new Error(
                "Format daftar API tidak valid."
            );
        }

        return payload;
    }

    if (
        !isRecord(payload) ||
        depth > 5
    ) {
        throw new Error(
            "Format response API tidak valid."
        );
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
            return extractArray(
                value,
                keys,
                depth + 1
            );
        }

        if (isRecord(value)) {
            try {
                return extractArray(
                    value,
                    keys,
                    depth + 1
                );
            } catch {
                // Periksa field berikutnya.
            }
        }
    }

    throw new Error(
        "Daftar data tidak ditemukan."
    );
};

const extractObject = (
    payload: unknown,
    keys: string[],
    idKey: string,
    depth = 0
): ApiRecord => {
    if (
        !isRecord(payload) ||
        depth > 5
    ) {
        throw new Error(
            "Format detail API tidak valid."
        );
    }

    if (payload.success === false) {
        throw new Error(
            typeof payload.message === "string"
                ? payload.message
                : "Request API gagal."
        );
    }

    if (
        idValue(payload[idKey]) !== null
    ) {
        return payload;
    }

    for (const key of [
        ...keys,
        "data",
    ]) {
        if (isRecord(payload[key])) {
            try {
                return extractObject(
                    payload[key],
                    keys,
                    idKey,
                    depth + 1
                );
            } catch {
                // Periksa field berikutnya.
            }
        }
    }

    throw new Error(
        "Data detail tidak ditemukan."
    );
};

const normalizeService = (
    row: ApiRecord
): ServiceData | null => {
    const id = idValue(
        row.id_service
    );

    if (id === null) return null;

    return {
        id_service: id,

        name_service: textValue(
            row.name_service
        ),

        price_service: numberValue(
            row.price_service
        ),

        description_service: textValue(
            row.description_service
        ),

        status_service: statusValue(
            row.status_service
        ),

        maps_service: textValue(
            row.maps_service
        ),

        quota_service: numberValue(
            row.quota_service
        ),

        id_provider: idValue(
            row.id_provider
        ),

        image_service: resolveFileUrl(
            row.image_service
        ),
    };
};

const toForm = (
    service: ServiceData
): ServiceForm => ({
    name_service:
        service.name_service,

    price_service:
        service.price_service?.toString() ??
        "",

    description_service:
        service.description_service,

    status_service:
        service.status_service,

    maps_service:
        service.maps_service,

    quota_service:
        service.quota_service?.toString() ??
        "",

    id_provider:
        service.id_provider?.toString() ??
        "",
});

class UnauthorizedError extends Error {
    constructor() {
        super(
            "Sesi berakhir. Silakan login kembali."
        );

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
        response.headers.get(
            "content-type"
        ) ?? "";

    let payload: unknown = null;

    if (
        contentType.includes(
            "application/json"
        )
    ) {
        payload = await response.json();
    } else {
        const content =
            await response.text();

        payload = content || null;
    }

    if (!response.ok) {
        throw new Error(
            isRecord(payload) &&
                typeof payload.message ===
                "string"
                ? payload.message
                : response.status === 403
                    ? "Anda tidak memiliki izin untuk aksi ini."
                    : `Request gagal (HTTP ${response.status}).`
        );
    }

    if (
        isRecord(payload) &&
        payload.success === false
    ) {
        throw new Error(
            typeof payload.message ===
                "string"
                ? payload.message
                : "Operasi tidak berhasil."
        );
    }

    return payload;
};

const getAllServices = async (
    signal?: AbortSignal
): Promise<ServiceData[]> => {
    const response = await apiRequest(
        "/service/get-all",
        { signal }
    );

    return extractArray(response, [
        "services",
        "service",
    ])
        .map(normalizeService)
        .filter(
            (
                item
            ): item is ServiceData =>
                item !== null
        );
};

const getServiceDetail = async (
    id: number,
    signal?: AbortSignal
): Promise<ServiceData> => {
    const response = await apiRequest(
        `/service/${id}`,
        { signal }
    );

    const item = normalizeService(
        extractObject(
            response,
            ["service"],
            "id_service"
        )
    );

    if (!item) {
        throw new Error(
            "Detail layanan tidak valid."
        );
    }

    return item;
};

const getAllProviders = async (
    signal?: AbortSignal
): Promise<ProviderData[]> => {
    const response = await apiRequest(
        "/provider/get-all",
        { signal }
    );

    return extractArray(
        response,
        ["providers"]
    )
        .map((row) => ({
            id_provider: idValue(
                row.id_provider
            ),

            name_provider: textValue(
                row.name_provider
            ),

            id_provider_category: idValue(
                row.id_provider_category
            ),
        }))
        .filter(
            (
                item
            ): item is ProviderData =>
                item.id_provider !== null
        );
};

const getAllCategories = async (
    signal?: AbortSignal
): Promise<CategoryData[]> => {
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
            id_provider_category: idValue(
                row.id_provider_category
            ),

            name_provider_category: textValue(
                row.name_provider_category
            ),
        }))
        .filter(
            (
                item
            ): item is CategoryData =>
                item.id_provider_category !== null
        );
};

const buildFormData = (
    form: ServiceForm,
    image: File | null
): FormData => {
    const data = new FormData();

    (
        Object.keys(
            form
        ) as Array<keyof ServiceForm>
    ).forEach((key) => {
        data.append(
            key,
            form[key]
        );
    });

    if (image) {
        data.append(
            "image_service",
            image
        );
    }

    return data;
};

const createService = (
    form: ServiceForm,
    image: File | null
) =>
    apiRequest("/service/create", {
        method: "POST",
        body: buildFormData(
            form,
            image
        ),
    });

const updateService = (
    id: number,
    form: ServiceForm,
    image: File | null
) =>
    apiRequest(
        `/service/${id}`,
        {
            method: "PATCH",
            body: buildFormData(
                form,
                image
            ),
        }
    );

// Sesuai Postman Collection,
// DELETE /service/:id membutuhkan
// id_provider di request body.

const deleteService = (
    serviceId: number,
    providerId: number
) =>
    apiRequest(
        `/service/${serviceId}`,
        {
            method: "DELETE",

            headers: {
                "Content-Type":
                    "application/json",
            },

            body: JSON.stringify({
                id_provider: providerId,
            }),
        }
    );

const StatusBadge = ({
    status,
}: {
    status: string;
}) => {
    const value =
        statusValue(status);

    const color =
        value === "ACTIVE"
            ? "bg-emerald-50 text-emerald-700"
            : value === "INACTIVE"
                ? "bg-slate-100 text-slate-600"
                : "bg-amber-50 text-amber-700";

    return (
        <span
            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${color}`}
        >
            {value === "ACTIVE"
                ? "Active"
                : value === "INACTIVE"
                    ? "Inactive"
                    : value}
        </span>
    );
};

const LoadingState = ({
    text = "Memuat data...",
}: {
    text?: string;
}) => (
    <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-500">
        <LoaderCircle
            size={18}
            className="animate-spin text-[#0866D8]"
        />

        {text}
    </div>
);

const EmptyState = ({
    message,
}: {
    message: string;
}) => (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 p-6 text-center">
        <ClipboardList
            size={28}
            className="text-slate-300"
        />

        <p className="text-sm text-slate-500">
            {message}
        </p>
    </div>
);

const InfoField = ({
    label,
    value,
}: {
    label: string;
    value:
    | string
    | number
    | null
    | undefined;
}) => (
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

const Modal = ({
    title,
    children,
    footer,
    onClose,
    wide = false,
    busy = false,
}: ModalProps) => {
    useEffect(() => {
        const handleEscape = (
            event: KeyboardEvent
        ) => {
            if (
                event.key === "Escape" &&
                !busy
            ) {
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
    }, [onClose, busy]);

    return (
        <div
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4"
            onMouseDown={(event) => {
                if (
                    event.target ===
                    event.currentTarget &&
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
                    ? "h-[min(680px,90dvh)] max-w-3xl"
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
                    <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-5 py-4">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

const ServiceCatalog = () => {
    const navigate = useNavigate();

    const [
        services,
        setServices,
    ] = useState<ServiceData[]>([]);

    const [
        providers,
        setProviders,
    ] = useState<ProviderData[]>([]);

    const [
        categories,
        setCategories,
    ] = useState<CategoryData[]>([]);

    const [
        selectedId,
        setSelectedId,
    ] = useState<number | null>(null);

    const [
        selectedSnapshot,
        setSelectedSnapshot,
    ] = useState<ServiceData | null>(
        null
    );

    const [
        detail,
        setDetail,
    ] = useState<ServiceData | null>(
        null
    );

    const [
        modal,
        setModal,
    ] = useState<ModalType>(null);

    const [
        form,
        setForm,
    ] = useState<ServiceForm>(
        emptyForm()
    );

    const [
        imageFile,
        setImageFile,
    ] = useState<File | null>(null);

    const [
        search,
        setSearch,
    ] = useState("");

    const [
        statusFilter,
        setStatusFilter,
    ] = useState("ALL");

    const [
        providerFilter,
        setProviderFilter,
    ] = useState("ALL");

    const [
        categoryFilter,
        setCategoryFilter,
    ] = useState("ALL");

    const [
        page,
        setPage,
    ] = useState(1);

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        detailLoading,
        setDetailLoading,
    ] = useState(false);

    const [
        saving,
        setSaving,
    ] = useState(false);

    const [
        listError,
        setListError,
    ] = useState("");

    const [
        detailError,
        setDetailError,
    ] = useState("");

    const [
        modalError,
        setModalError,
    ] = useState("");

    const [
        notice,
        setNotice,
    ] = useState<Notice | null>(
        null
    );

    const [
        refreshKey,
        setRefreshKey,
    ] = useState(0);

    const handleApiError = useCallback(
        (error: unknown): boolean => {
            if (
                error instanceof
                UnauthorizedError
            ) {
                clearSession();

                navigate(
                    "/user/sign-in",
                    {
                        replace: true,
                    }
                );

                return true;
            }

            return false;
        },
        [navigate]
    );

    const showNotice = (
        type: Notice["type"],
        message: string
    ) => {
        setNotice({
            type,
            message,
        });
    };

    const refreshData = () => {
        setRefreshKey(
            (value) => value + 1
        );
    };

    useEffect(() => {
        const controller =
            new AbortController();

        const load = async () => {
            setLoading(true);
            setListError("");

            const results =
                await Promise.allSettled([
                    getAllServices(
                        controller.signal
                    ),

                    getAllProviders(
                        controller.signal
                    ),

                    getAllCategories(
                        controller.signal
                    ),
                ]);

            if (
                controller.signal.aborted
            ) {
                return;
            }

            const unauthorized =
                results.some(
                    (result) =>
                        result.status ===
                        "rejected" &&
                        result.reason instanceof
                        UnauthorizedError
                );

            if (unauthorized) {
                handleApiError(
                    new UnauthorizedError()
                );

                return;
            }

            const [
                serviceResult,
                providerResult,
                categoryResult,
            ] = results;

            if (
                serviceResult.status ===
                "fulfilled"
            ) {
                setServices(
                    serviceResult.value
                );
            } else {
                setServices([]);

                setListError(
                    getErrorMessage(
                        serviceResult.reason
                    )
                );
            }

            if (
                providerResult.status ===
                "fulfilled"
            ) {
                setProviders(
                    providerResult.value
                );
            } else {
                setProviders([]);
            }

            if (
                categoryResult.status ===
                "fulfilled"
            ) {
                setCategories(
                    categoryResult.value
                );
            } else {
                setCategories([]);
            }

            setLoading(false);
        };

        void load();

        return () =>
            controller.abort();
    }, [
        refreshKey,
        handleApiError,
    ]);

    const providerName = useCallback(
        (
            id: number | null
        ): string => {
            if (id === null) {
                return "—";
            }

            return (
                providers.find(
                    (item) =>
                        item.id_provider === id
                )?.name_provider ||
                `Provider #${id}`
            );
        },
        [providers]
    );

    const providerCategory =
        useCallback(
            (
                providerId:
                    | number
                    | null
            ): number | null => {
                if (
                    providerId === null
                ) {
                    return null;
                }

                return (
                    providers.find(
                        (item) =>
                            item.id_provider ===
                            providerId
                    )?.id_provider_category ??
                    null
                );
            },
            [providers]
        );

    const categoryName = useCallback(
        (
            id: number | null
        ): string => {
            if (id === null) {
                return "—";
            }

            return (
                categories.find(
                    (item) =>
                        item.id_provider_category ===
                        id
                )?.name_provider_category ||
                `Kategori #${id}`
            );
        },
        [categories]
    );

    const selectedService = useMemo(
        () => {
            if (
                selectedId === null
            ) {
                return null;
            }

            return (
                services.find(
                    (service) =>
                        service.id_service ===
                        selectedId
                ) ??
                (
                    selectedSnapshot?.id_service ===
                        selectedId
                        ? selectedSnapshot
                        : null
                )
            );
        },
        [
            services,
            selectedId,
            selectedSnapshot,
        ]
    );

    const displayedDetail =
        detail?.id_service ===
            selectedId
            ? detail
            : selectedService;

    const activeCount =
        services.filter(
            (service) =>
                service.status_service ===
                "ACTIVE"
        ).length;

    const inactiveCount =
        services.filter(
            (service) =>
                service.status_service ===
                "INACTIVE"
        ).length;

    const providerCount =
        new Set(
            services
                .map(
                    (service) =>
                        service.id_provider
                )
                .filter(
                    (
                        id
                    ): id is number =>
                        id !== null
                )
        ).size;

    const filteredServices =
        useMemo(() => {
            const keyword =
                search
                    .trim()
                    .toLowerCase();

            return services.filter(
                (service) => {
                    const matchSearch = [
                        service.name_service,
                        service.description_service,
                        providerName(
                            service.id_provider
                        ),
                        String(
                            service.id_service
                        ),
                    ].some(
                        (value) =>
                            value
                                .toLowerCase()
                                .includes(keyword)
                    );

                    const matchStatus =
                        statusFilter ===
                        "ALL" ||
                        service.status_service ===
                        statusFilter;

                    const matchProvider =
                        providerFilter ===
                        "ALL" ||
                        String(
                            service.id_provider
                        ) ===
                        providerFilter;

                    const matchCategory =
                        categoryFilter ===
                        "ALL" ||
                        String(
                            providerCategory(
                                service.id_provider
                            )
                        ) ===
                        categoryFilter;

                    return (
                        matchSearch &&
                        matchStatus &&
                        matchProvider &&
                        matchCategory
                    );
                }
            );
        }, [
            services,
            search,
            statusFilter,
            providerFilter,
            categoryFilter,
            providerName,
            providerCategory,
        ]);

    const totalPages = Math.max(
        1,
        Math.ceil(
            filteredServices.length /
            PAGE_SIZE
        )
    );

    const currentPage =
        Math.min(
            page,
            totalPages
        );

    const displayedServices =
        filteredServices.slice(
            (currentPage - 1) *
            PAGE_SIZE,

            currentPage *
            PAGE_SIZE
        );

    useEffect(() => {
        if (
            modal !== "detail" ||
            selectedId === null
        ) {
            return;
        }

        const controller =
            new AbortController();

        const load = async () => {
            setDetailLoading(true);
            setDetailError("");

            try {
                const result =
                    await getServiceDetail(
                        selectedId,
                        controller.signal
                    );

                if (
                    !controller.signal.aborted
                ) {
                    setDetail(result);
                }
            } catch (error) {
                if (
                    !controller.signal.aborted &&
                    !handleApiError(error)
                ) {
                    setDetailError(
                        getErrorMessage(error)
                    );
                }
            } finally {
                if (
                    !controller.signal.aborted
                ) {
                    setDetailLoading(false);
                }
            }
        };

        void load();

        return () =>
            controller.abort();
    }, [
        selectedId,
        modal,
        handleApiError,
    ]);

    const closeModal = useCallback(
        () => {
            if (saving) return;

            setModal(null);
            setSelectedId(null);
            setSelectedSnapshot(null);
            setDetail(null);
            setForm(emptyForm());
            setImageFile(null);
            setModalError("");
            setDetailError("");
        },
        [saving]
    );

    const openCreate = () => {
        setSelectedId(null);
        setSelectedSnapshot(null);
        setDetail(null);
        setForm(emptyForm());
        setImageFile(null);
        setModalError("");
        setModal("create");
    };

    const openDetail = (
        service: ServiceData
    ) => {
        setSelectedId(
            service.id_service
        );

        setSelectedSnapshot(
            service
        );

        setDetail(service);
        setDetailError("");
        setModalError("");

        setModal("detail");
    };

    const openEdit = (
        service: ServiceData
    ) => {
        setSelectedId(
            service.id_service
        );

        setSelectedSnapshot(
            service
        );

        setForm(
            toForm(service)
        );

        setImageFile(null);
        setModalError("");

        setModal("edit");
    };

    const openDelete = (
        service: ServiceData
    ) => {
        setSelectedId(
            service.id_service
        );

        setSelectedSnapshot(
            service
        );

        setModalError("");

        setModal("delete");
    };

    const handleDeleteService =
        async () => {
            if (
                saving ||
                modal !== "delete" ||
                !selectedService
            ) {
                return;
            }

            const service =
                selectedService;

            if (
                service.id_provider ===
                null
            ) {
                setModalError(
                    "Provider layanan tidak ditemukan. Layanan tidak dapat dihapus."
                );

                return;
            }

            setSaving(true);
            setModalError("");

            try {
                // Kirim DELETE sesuai collection.
                await deleteService(
                    service.id_service,
                    service.id_provider
                );

                // Ambil data terbaru dari backend.
                const latest =
                    await getAllServices();

                setServices(latest);

                const updated =
                    latest.find(
                        (item) =>
                            item.id_service ===
                            service.id_service
                    );

                if (
                    !updated
                ) {
                    showNotice(
                        "success",
                        "Layanan berhasil dihapus."
                    );
                } else if (
                    updated.status_service ===
                    "INACTIVE" &&
                    service.status_service !==
                    "INACTIVE"
                ) {
                    showNotice(
                        "success",
                        "Layanan berhasil dinonaktifkan."
                    );
                } else {
                    throw new Error(
                        "Request DELETE telah dikirim, tetapi layanan masih muncul tanpa perubahan status. Periksa respons backend."
                    );
                }

                setModal(null);
                setSelectedId(null);
                setSelectedSnapshot(null);
                setDetail(null);
            } catch (error) {
                if (
                    !handleApiError(error)
                ) {
                    setModalError(
                        getErrorMessage(error)
                    );
                }
            } finally {
                setSaving(false);
            }
        };

    const updateForm = (
        key: keyof ServiceForm,
        value: string
    ) => {
        setForm(
            (current) => ({
                ...current,
                [key]: value,
            })
        );
    };

    const handleImageChange = (
        event: ChangeEvent<HTMLInputElement>
    ) => {
        const file =
            event.target.files?.[0];

        if (!file) return;

        const extension =
            file.name
                .split(".")
                .pop()
                ?.toLowerCase();

        if (
            !extension ||
            ![
                "jpg",
                "jpeg",
                "png",
                "webp",
            ].includes(extension)
        ) {
            setModalError(
                "Gambar harus berupa JPG, PNG, atau WEBP."
            );

            event.target.value = "";
            return;
        }

        if (
            file.size >
            5 * 1024 * 1024
        ) {
            setModalError(
                "Ukuran gambar maksimal 5 MB."
            );

            event.target.value = "";
            return;
        }

        setImageFile(file);
        setModalError("");
    };

    const handleSaveService =
        async (
            event: FormEvent<HTMLFormElement>
        ) => {
            event.preventDefault();

            if (saving) return;


            if (modal === "create" && !imageFile) {
                setModalError("Gambar Layanan wajib diunggah.");
                return;
            }


            if (
                !form.name_service.trim()
            ) {
                setModalError(
                    "Nama layanan wajib diisi."
                );

                return;
            }

            if (
                !form.id_provider
            ) {
                setModalError(
                    "Provider wajib dipilih."
                );

                return;
            }

            if (
                form.price_service.trim() ===
                "" ||
                !Number.isFinite(
                    Number(
                        form.price_service
                    )
                ) ||
                Number(
                    form.price_service
                ) < 0
            ) {
                setModalError(
                    "Harga layanan tidak valid."
                );

                return;
            }

            if (
                form.quota_service.trim() !==
                "" &&
                (
                    !Number.isSafeInteger(
                        Number(
                            form.quota_service
                        )
                    ) ||
                    Number(
                        form.quota_service
                    ) < 0
                )
            ) {
                setModalError(
                    "Kuota harus berupa bilangan bulat."
                );

                return;
            }

            setSaving(true);
            setModalError("");

            try {
                const action = modal;

                if (
                    action === "create"
                ) {
                    await createService(
                        form,
                        imageFile
                    );
                } else if (
                    action === "edit" &&
                    selectedId !== null
                ) {
                    await updateService(
                        selectedId,
                        form,
                        imageFile
                    );
                } else {
                    return;
                }

                const latest =
                    await getAllServices();

                setServices(latest);

                setModal(null);
                setSelectedId(null);
                setSelectedSnapshot(null);
                setDetail(null);
                setImageFile(null);

                showNotice(
                    "success",
                    action === "create"
                        ? "Layanan berhasil ditambahkan."
                        : "Layanan berhasil diperbarui."
                );
            } catch (error) {
                if (
                    !handleApiError(error)
                ) {
                    setModalError(
                        getErrorMessage(error)
                    );
                }
            } finally {
                setSaving(false);
            }
        };

    const renderInput = (
        key: keyof ServiceForm,
        label: string,
        type = "text",
        required = false
    ) => (
        <div>
            <label
                htmlFor={key}
                className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
                {label}
                {required ? " *" : ""}
            </label>

            <input
                id={key}
                type={type}
                value={form[key]}
                onChange={
                    (event) =>
                        updateForm(
                            key,
                            event.target.value
                        )
                }
                required={required}
                disabled={saving}
                className={inputClass}
            />
        </div>
    );

    const renderError = () =>
        modalError ? (
            <div
                role="alert"
                className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700"
            >
                <AlertCircle
                    size={16}
                    className="shrink-0"
                />

                <span>
                    {modalError}
                </span>
            </div>
        ) : null;

    const renderModal = () => {
        if (
            modal === "detail" &&
            displayedDetail
        ) {
            const service =
                displayedDetail;

            const mapUrl =
                resolveFileUrl(
                    service.maps_service
                );

            return (
                <Modal
                    title="Detail Layanan"
                    wide
                    onClose={closeModal}
                >
                    {detailError && (
                        <div className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                            {detailError}
                        </div>
                    )}

                    <div
                        aria-busy={
                            detailLoading
                        }
                        className="space-y-5"
                    >
                        {/* HEADER */}
                        <div className="flex flex-col gap-4 sm:flex-row">
                            <div className="flex h-32 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#F5F8FC] sm:w-44">
                                {service.image_service ? (
                                    <img
                                        src={
                                            service.image_service
                                        }
                                        alt={
                                            service.name_service
                                        }
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <ImageIcon
                                        size={34}
                                        className="text-slate-300"
                                    />
                                )}
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="mb-2">
                                    <StatusBadge
                                        status={
                                            service.status_service
                                        }
                                    />
                                </div>

                                <h3 className="text-lg font-bold text-slate-950">
                                    {
                                        service.name_service
                                    }
                                </h3>

                                <p className="mt-1 text-sm text-slate-500">
                                    {providerName(
                                        service.id_provider
                                    )}
                                </p>

                                <p className="mt-3 text-xl font-bold text-[#0866D8]">
                                    {formatPrice(
                                        service.price_service
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* INFORMATION */}
                        <section className="border-t border-slate-100 pt-5">
                            <h4 className="mb-4 text-sm font-bold text-[#00357A]">
                                Informasi Layanan
                            </h4>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <InfoField
                                    label="ID Layanan"
                                    value={
                                        service.id_service
                                    }
                                />

                                <InfoField
                                    label="Provider"
                                    value={providerName(
                                        service.id_provider
                                    )}
                                />

                                <InfoField
                                    label="Kategori Provider"
                                    value={categoryName(
                                        providerCategory(
                                            service.id_provider
                                        )
                                    )}
                                />

                                <InfoField
                                    label="Status"
                                    value={
                                        service.status_service
                                    }
                                />

                                <InfoField
                                    label="Harga"
                                    value={formatPrice(
                                        service.price_service
                                    )}
                                />

                                <InfoField
                                    label="Kuota"
                                    value={
                                        service.quota_service
                                    }
                                />
                            </div>
                        </section>

                        {/* DESCRIPTION */}
                        <section className="border-t border-slate-100 pt-5">
                            <h4 className="mb-2 text-sm font-bold text-[#00357A]">
                                Deskripsi Layanan
                            </h4>

                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                                {
                                    service.description_service ||
                                    "—"
                                }
                            </p>
                        </section>

                        {/* LOCATION */}
                        <section className="border-t border-slate-100 pt-5">
                            <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#00357A]">
                                <MapPin size={16} />
                                Lokasi
                            </h4>

                            {mapUrl ? (
                                <a
                                    href={mapUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-sm font-medium text-[#0866D8] hover:underline"
                                >
                                    Buka Lokasi
                                    <ExternalLink
                                        size={15}
                                    />
                                </a>
                            ) : (
                                <p className="wrap-break-word text-sm text-slate-600">
                                    {
                                        service.maps_service ||
                                        "—"
                                    }
                                </p>
                            )}
                        </section>
                    </div>

                    {/* DETAIL ACTIONS */}
                    <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5">
                        <button
                            type="button"
                            onClick={closeModal}
                            className={
                                secondaryButton
                            }
                        >
                            Tutup
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                openDelete(service)
                            }
                            className={
                                dangerButton
                            }
                        >
                            <Trash2 size={16} />
                            Hapus
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                openEdit(service)
                            }
                            className={
                                primaryButton
                            }
                        >
                            <Pencil size={16} />
                            Edit Layanan
                        </button>
                    </div>
                </Modal>
            );
        }

        if (
            modal === "create" ||
            modal === "edit"
        ) {
            const editing =
                modal === "edit";

            return (
                <Modal
                    title={
                        editing
                            ? "Edit Layanan"
                            : "Tambah Layanan"
                    }
                    wide
                    onClose={closeModal}
                    busy={saving}
                >
                    {renderError()}

                    <form
                        onSubmit={
                            handleSaveService
                        }
                        className="space-y-6"
                    >
                        {/* GENERAL INFO */}
                        <section>
                            <h3 className="mb-4 text-sm font-bold text-[#00357A]">
                                Informasi Layanan
                            </h3>

                            <div className="grid gap-4 sm:grid-cols-2">
                                {renderInput(
                                    "name_service",
                                    "Nama Layanan",
                                    "text",
                                    true
                                )}

                                <div>
                                    <label
                                        htmlFor="id_provider"
                                        className="mb-1.5 block text-xs font-semibold text-slate-700"
                                    >
                                        Provider *
                                    </label>

                                    <select
                                        id="id_provider"
                                        value={
                                            form.id_provider
                                        }
                                        onChange={
                                            (event) =>
                                                updateForm(
                                                    "id_provider",
                                                    event.target.value
                                                )
                                        }
                                        disabled={
                                            saving
                                        }
                                        required
                                        className={
                                            inputClass
                                        }
                                    >
                                        <option value="">
                                            Pilih Provider
                                        </option>

                                        {providers.map(
                                            (provider) => (
                                                <option
                                                    key={
                                                        provider.id_provider
                                                    }
                                                    value={
                                                        provider.id_provider
                                                    }
                                                >
                                                    {
                                                        provider.name_provider
                                                    }
                                                </option>
                                            )
                                        )}

                                        {form.id_provider &&
                                            !providers.some(
                                                (provider) =>
                                                    String(
                                                        provider.id_provider
                                                    ) ===
                                                    form.id_provider
                                            ) && (
                                                <option
                                                    value={
                                                        form.id_provider
                                                    }
                                                >
                                                    Provider #
                                                    {
                                                        form.id_provider
                                                    }
                                                </option>
                                            )}
                                    </select>
                                </div>

                                {renderInput(
                                    "price_service",
                                    "Harga (Rp)",
                                    "number",
                                    true
                                )}

                                {renderInput(
                                    "quota_service",
                                    "Kuota",
                                    "number"
                                )}

                                {/* STATUS */}
                                <div>
                                    <label
                                        htmlFor="status_service"
                                        className="mb-1.5 block text-xs font-semibold text-slate-700"
                                    >
                                        Status
                                    </label>

                                    <select
                                        id="status_service"
                                        value={
                                            form.status_service
                                        }
                                        onChange={
                                            (event) =>
                                                updateForm(
                                                    "status_service",
                                                    event.target.value
                                                )
                                        }
                                        disabled={
                                            saving
                                        }
                                        className={
                                            inputClass
                                        }
                                    >
                                        {form.status_service !==
                                            "ACTIVE" &&
                                            form.status_service !==
                                            "INACTIVE" && (
                                                <option
                                                    value={
                                                        form.status_service
                                                    }
                                                >
                                                    {
                                                        form.status_service
                                                    }
                                                </option>
                                            )}

                                        <option value="ACTIVE">
                                            Active
                                        </option>

                                        <option value="INACTIVE">
                                            Inactive
                                        </option>
                                    </select>
                                </div>

                                {renderInput(
                                    "maps_service",
                                    "Link / Informasi Lokasi"
                                )}
                            </div>

                            {/* DESCRIPTION */}
                            <div className="mt-4">
                                <label
                                    htmlFor="description_service"
                                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                                >
                                    Deskripsi
                                </label>

                                <textarea
                                    id="description_service"
                                    value={
                                        form.description_service
                                    }
                                    onChange={
                                        (event) =>
                                            updateForm(
                                                "description_service",
                                                event.target.value
                                            )
                                    }
                                    rows={4}
                                    disabled={
                                        saving
                                    }
                                    className={
                                        inputClass
                                    }
                                />
                            </div>
                        </section>

                        {/* SERVICE IMAGE */}
                        <section className="border-t border-slate-100 pt-5">
                            <h3 className="mb-4 text-sm font-bold text-[#00357A]">
                                Gambar Layanan
                                {!editing && (
                                    <span className="ml-1 text-red-500">*</span>
                                )}
                            </h3>

                            {editing &&
                                selectedService?.image_service && (
                                    <div className="mb-4 h-32 w-48 overflow-hidden rounded-xl border border-[#DBE4F0]">
                                        <img
                                            src={
                                                selectedService.image_service
                                            }
                                            alt="Gambar layanan saat ini"
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                )}

                            <label
                                htmlFor="image-service"
                                className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#CBD8E8] bg-[#FAFCFF] px-4 py-4 text-sm text-slate-600 hover:border-[#0866D8]"
                            >
                                <Upload
                                    size={19}
                                    className="text-[#0866D8]"
                                />

                                <span className="min-w-0 flex-1 truncate">
                                    {imageFile?.name ||
                                        "Pilih gambar layanan"}
                                </span>
                            </label>

                            <input
                                id="image-service"
                                type="file"
                                accept=".jpg,.jpeg,.png,.webp"
                                required={!editing}
                                disabled={saving}
                                onChange={handleImageChange}
                                className="sr-only"
                            />

                            <p className="mt-2 text-xs text-slate-500">
                                JPG, PNG, atau WEBP.
                                Maksimal 5 MB.
                            </p>
                        </section>

                        {/* FORM BUTTONS */}
                        <div className="flex justify-end gap-2 border-t border-slate-100 pt-5">
                            <button
                                type="button"
                                onClick={
                                    closeModal
                                }
                                disabled={
                                    saving
                                }
                                className={
                                    secondaryButton
                                }
                            >
                                Batal
                            </button>

                            <button
                                type="submit"
                                disabled={
                                    saving
                                }
                                className={
                                    primaryButton
                                }
                            >
                                {saving ? (
                                    <>
                                        <LoaderCircle
                                            size={16}
                                            className="animate-spin"
                                        />
                                        Menyimpan...
                                    </>
                                ) : editing ? (
                                    "Simpan Perubahan"
                                ) : (
                                    "Tambah Layanan"
                                )}
                            </button>
                        </div>
                    </form>
                </Modal>
            );
        }

        if (
            modal === "delete" &&
            selectedService
        ) {
            return (
                <Modal
                    title="Hapus Layanan?"
                    onClose={closeModal}
                    busy={saving}
                    footer={
                        <>
                            <button
                                type="button"
                                onClick={
                                    closeModal
                                }
                                disabled={
                                    saving
                                }
                                className={
                                    secondaryButton
                                }
                            >
                                Batal
                            </button>

                            <button
                                type="button"
                                onClick={
                                    handleDeleteService
                                }
                                disabled={
                                    saving ||
                                    selectedService.id_provider ===
                                    null
                                }
                                className={
                                    dangerButton
                                }
                            >
                                {saving ? (
                                    <LoaderCircle
                                        size={16}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Trash2
                                        size={16}
                                    />
                                )}

                                {saving
                                    ? "Menghapus..."
                                    : "Hapus Layanan"}
                            </button>
                        </>
                    }
                >
                    {renderError()}

                    <p className="text-sm leading-relaxed text-slate-600">
                        Yakin ingin menghapus{" "}
                        <strong className="text-slate-950">
                            {
                                selectedService.name_service
                            }
                        </strong>
                        ?
                    </p>

                    {selectedService.id_provider ===
                        null && (
                            <p className="mt-3 text-xs text-red-600">
                                ID provider tidak tersedia.
                                Layanan tidak dapat dihapus.
                            </p>
                        )}
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
                        Provider & Katalog /
                        Katalog Layanan
                    </p>

                    <h1 className="text-2xl font-bold text-slate-950 sm:text-[28px]">
                        Katalog Layanan
                    </h1>

                    <p className="mt-2 text-sm text-[#526789]">
                        Kelola daftar layanan dari
                        seluruh provider.
                    </p>
                </div>

                <div className="flex gap-2">
                    {/* REFRESH */}
                    <button
                        type="button"
                        onClick={
                            refreshData
                        }
                        disabled={
                            loading ||
                            saving
                        }
                        className={
                            secondaryButton
                        }
                    >
                        <RefreshCw
                            size={16}
                            className={
                                loading
                                    ? "animate-spin"
                                    : ""
                            }
                        />

                        Refresh
                    </button>

                    {/* CREATE */}
                    <button
                        type="button"
                        onClick={
                            openCreate
                        }
                        disabled={
                            saving
                        }
                        className={
                            primaryButton
                        }
                    >
                        <Plus size={17} />

                        Tambah Layanan
                    </button>
                </div>
            </div>

            {/* NOTIFICATION */}
            {notice && (
                <div
                    role="alert"
                    className={`mb-5 flex items-start gap-3 rounded-xl border p-3 ${notice.type ===
                        "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-700"
                        }`}
                >
                    {notice.type ===
                        "success" ? (
                        <CheckCircle2
                            size={18}
                        />
                    ) : (
                        <AlertCircle
                            size={18}
                        />
                    )}

                    <p className="flex-1 text-sm">
                        {
                            notice.message
                        }
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            setNotice(null)
                        }
                        aria-label="Tutup notifikasi"
                    >
                        <X size={17} />
                    </button>
                </div>
            )}

            {/* SUMMARY CARDS */}
            <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
                {[
                    {
                        label:
                            "Total Layanan",
                        value:
                            services.length,
                        icon: (
                            <ClipboardList
                                size={19}
                            />
                        ),
                    },

                    {
                        label: "Active",
                        value:
                            activeCount,
                        icon: (
                            <CheckCircle2
                                size={19}
                            />
                        ),
                    },

                    {
                        label:
                            "Inactive",
                        value:
                            inactiveCount,
                        icon: (
                            <CircleDollarSign
                                size={19}
                            />
                        ),
                    },

                    {
                        label:
                            "Provider Terkait",
                        value:
                            providerCount,
                        icon: (
                            <Building2
                                size={19}
                            />
                        ),
                    },
                ].map(
                    (stat) => (
                        <div
                            key={
                                stat.label
                            }
                            className="rounded-2xl border border-[#DBE4F0] bg-white p-5 shadow-sm"
                        >
                            <div className="mb-3 flex items-center gap-2 text-[#526789]">
                                {
                                    stat.icon
                                }

                                <span className="text-xs font-semibold">
                                    {
                                        stat.label
                                    }
                                </span>
                            </div>

                            <p className="text-3xl font-bold text-slate-950">
                                {loading ||
                                    listError
                                    ? "—"
                                    : stat.value}
                            </p>
                        </div>
                    )
                )}
            </div>

            {/* SERVICE TABLE */}
            <section className="overflow-hidden rounded-2xl border border-[#DBE4F0] bg-white shadow-sm">
                {/* FILTERS */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
                    <div>
                        <h2 className="text-sm font-bold text-slate-950">
                            Daftar Layanan
                        </h2>

                        <p className="mt-1 text-xs text-[#526789]">
                            {loading
                                ? "Memuat..."
                                : `${filteredServices.length} layanan`}
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
                                value={
                                    search
                                }
                                onChange={
                                    (event) => {
                                        setSearch(
                                            event.target.value
                                        );

                                        setPage(1);
                                    }
                                }
                                placeholder="Cari layanan..."
                                className="w-full rounded-lg border border-[#DBE4F0] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#0866D8]"
                            />
                        </div>

                        {/* STATUS */}
                        <select
                            value={
                                statusFilter
                            }
                            onChange={
                                (event) => {
                                    setStatusFilter(
                                        event.target.value
                                    );

                                    setPage(1);
                                }
                            }
                            aria-label="Filter status"
                            className="rounded-lg border border-[#DBE4F0] bg-white px-3 py-2.5 text-sm text-slate-700"
                        >
                            <option value="ALL">
                                Semua Status
                            </option>

                            <option value="ACTIVE">
                                Active
                            </option>

                            <option value="INACTIVE">
                                Inactive
                            </option>
                        </select>

                        {/* PROVIDER */}
                        <select
                            value={
                                providerFilter
                            }
                            onChange={
                                (event) => {
                                    setProviderFilter(
                                        event.target.value
                                    );

                                    setPage(1);
                                }
                            }
                            aria-label="Filter provider"
                            className="max-w-48 rounded-lg border border-[#DBE4F0] bg-white px-3 py-2.5 text-sm text-slate-700"
                        >
                            <option value="ALL">
                                Semua Provider
                            </option>

                            {providers.map(
                                (provider) => (
                                    <option
                                        key={
                                            provider.id_provider
                                        }
                                        value={
                                            provider.id_provider
                                        }
                                    >
                                        {
                                            provider.name_provider
                                        }
                                    </option>
                                )
                            )}
                        </select>

                        {/* CATEGORY */}
                        <select
                            value={
                                categoryFilter
                            }
                            onChange={
                                (event) => {
                                    setCategoryFilter(
                                        event.target.value
                                    );

                                    setPage(1);
                                }
                            }
                            aria-label="Filter kategori"
                            className="max-w-48 rounded-lg border border-[#DBE4F0] bg-white px-3 py-2.5 text-sm text-slate-700"
                        >
                            <option value="ALL">
                                Semua Kategori
                            </option>

                            {categories.map(
                                (category) => (
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
                                )
                            )}
                        </select>
                    </div>
                </div>

                {/* TABLE BODY */}
                {loading ? (
                    <LoadingState />
                ) : listError ? (
                    <div className="p-5 text-sm text-red-600">
                        {
                            listError
                        }
                    </div>
                ) : filteredServices.length ===
                    0 ? (
                    <EmptyState message="Layanan tidak ditemukan." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead className="bg-[#F5F8FC]">
                                <tr>
                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        No.
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        Layanan
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        Provider
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        Harga
                                    </th>

                                    <th className="px-5 py-3 text-center text-xs font-semibold text-[#344F77]">
                                        Kuota
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
                                {displayedServices.map(
                                    (
                                        service,
                                        index
                                    ) => (
                                        <tr
                                            key={
                                                service.id_service
                                            }
                                            className="border-t border-slate-100 hover:bg-slate-50"
                                        >
                                            {/* NUMBER */}
                                            <td className="px-5 py-4 text-slate-500">
                                                {(currentPage -
                                                    1) *
                                                    PAGE_SIZE +
                                                    index +
                                                    1}
                                            </td>

                                            {/* SERVICE */}
                                            <td className="px-5 py-4">
                                                <div className="flex min-w-47.5 items-center gap-3">
                                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#F5F8FC]">
                                                        {service.image_service ? (
                                                            <img
                                                                src={
                                                                    service.image_service
                                                                }
                                                                alt=""
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <ImageIcon
                                                                size={23}
                                                                className="text-slate-300"
                                                            />
                                                        )}
                                                    </div>

                                                    <div className="min-w-0">
                                                        <p className="max-w-52 truncate font-semibold text-slate-950">
                                                            {
                                                                service.name_service
                                                            }
                                                        </p>

                                                        <p className="mt-1 text-xs text-slate-500">
                                                            ID:{" "}
                                                            {
                                                                service.id_service
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* PROVIDER */}
                                            <td className="px-5 py-4 text-slate-600">
                                                {providerName(
                                                    service.id_provider
                                                )}
                                            </td>

                                            {/* PRICE */}
                                            <td className="px-5 py-4 font-semibold text-slate-800">
                                                {formatPrice(
                                                    service.price_service
                                                )}
                                            </td>

                                            {/* QUOTA */}
                                            <td className="px-5 py-4 text-center text-slate-600">
                                                {service.quota_service ??
                                                    "—"}
                                            </td>

                                            {/* STATUS */}
                                            <td className="px-5 py-4 text-center">
                                                <StatusBadge
                                                    status={
                                                        service.status_service
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
                                                            openDetail(
                                                                service
                                                            )
                                                        }
                                                        title="Detail Layanan"
                                                        aria-label={`Detail ${service.name_service}`}
                                                        className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-[#0866D8] hover:bg-blue-100"
                                                    >
                                                        <Eye
                                                            size={18}
                                                        />
                                                    </button>

                                                    {/* EDIT */}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openEdit(
                                                                service
                                                            )
                                                        }
                                                        title="Edit Layanan"
                                                        aria-label={`Edit ${service.name_service}`}
                                                        className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100"
                                                    >
                                                        <Pencil
                                                            size={18}
                                                        />
                                                    </button>

                                                    {/* DELETE */}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openDelete(
                                                                service
                                                            )
                                                        }
                                                        title="Hapus Layanan"
                                                        aria-label={`Hapus ${service.name_service}`}
                                                        className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                                                    >
                                                        <Trash2
                                                            size={18}
                                                        />
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
                    filteredServices.length >
                    0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
                            <p className="text-xs text-[#526789]">
                                Menampilkan{" "}
                                {(currentPage -
                                    1) *
                                    PAGE_SIZE +
                                    1}
                                –
                                {Math.min(
                                    currentPage *
                                    PAGE_SIZE,

                                    filteredServices.length
                                )}{" "}
                                dari{" "}
                                {
                                    filteredServices.length
                                }
                            </p>

                            <div className="flex items-center gap-3">
                                {/* PREVIOUS */}
                                <button
                                    type="button"
                                    disabled={
                                        currentPage ===
                                        1
                                    }
                                    onClick={() =>
                                        setPage(
                                            (value) =>
                                                Math.max(
                                                    1,
                                                    value -
                                                    1
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
                                    {
                                        currentPage
                                    }{" "}
                                    /{" "}
                                    {
                                        totalPages
                                    }
                                </span>

                                {/* NEXT */}
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
                                                    value +
                                                    1
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

export default ServiceCatalog;
