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
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Clock3,
    CreditCard,
    Eye,
    LoaderCircle,
    Package,
    RefreshCw,
    Search,
    ShoppingBag,
    UserRound,
    Users,
    X,
} from "lucide-react";

const PAGE_SIZE = 10;

type ApiRecord = Record<string, unknown>;

interface OrderData {
    id_order: string;

    id_customer: number | null;
    id_guest: number | null;
    id_service: number | null;
    id_provider: number | null;

    sub_total: number | null;
    total: number | null;

    payment_method: string;
    payment_status: string;
    order_status: string;

    booking_at: string;
    paid_at: string;
    payment_expired_at: string;
    payment_updated_at: string;
    created_at: string;

    dana_payment_id: string;

    name_customer: string;
    name_guest: string;
    name_service: string;
    name_provider: string;
}

interface CustomerData {
    id_customer: number;
    name_customer: string;
    email_customer: string;
    phone_number_customer: string;
    gender_customer: string;
    dob_customer: string;
}

interface GuestData {
    id_guest: number;
    id_customer: number | null;
    name_guest: string;
    email_guest: string;
    phone_number_guest: string;
    gender_guest: string;
}

interface ServiceData {
    id_service: number;
    id_provider: number | null;
    name_service: string;
}

interface ProviderData {
    id_provider: number;
    name_provider: string;
}

interface ModalProps {
    title: string;
    children: ReactNode;
    footer?: ReactNode;
    onClose: () => void;
}

interface DetailFieldProps {
    label: string;
    value: string | number | null | undefined;
}

const secondaryButton =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#DBE4F0] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

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

    const parsed = Number(value);

    return Number.isSafeInteger(parsed) && parsed > 0
        ? parsed
        : null;
};

const asMoney = (value: unknown): number | null => {
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

const firstText = (
    row: ApiRecord,
    keys: string[]
): string => {
    for (const key of keys) {
        const value = row[key];

        if (
            value !== null &&
            value !== undefined &&
            value !== ""
        ) {
            return asText(value);
        }
    }

    return "";
};

const firstId = (
    row: ApiRecord,
    keys: string[]
): number | null => {
    for (const key of keys) {
        const id = asId(row[key]);

        if (id !== null) {
            return id;
        }
    }

    return null;
};

const nestedRecord = (
    row: ApiRecord,
    keys: string[]
): ApiRecord | null => {
    for (const key of keys) {
        if (isRecord(row[key])) {
            return row[key];
        }
    }

    return null;
};

const normalizeStatus = (value: unknown): string =>
    asText(value || "UNKNOWN")
        .trim()
        .toUpperCase();

const getErrorMessage = (error: unknown): string =>
    error instanceof Error
        ? error.message
        : "Terjadi kesalahan. Silakan coba kembali.";

const formatCurrency = (
    amount: number | null
): string => {
    if (amount === null) {
        return "—";
    }

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(amount);
};

const parseDate = (value: string): Date | null => {
    if (!value) {
        return null;
    }

    const normalized = value.trim().replace(" ", "T");

    // Timestamp tanpa offset diasumsikan WIB.
    const hasTimezone =
        /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);

    const parsed = new Date(
        hasTimezone
            ? normalized
            : `${normalized}+07:00`
    );

    return Number.isNaN(parsed.getTime())
        ? null
        : parsed;
};

const formatDateTime = (value: string): string => {
    const date = parseDate(value);

    if (!date) {
        return value || "—";
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

const genderLabel = (value: string): string => {
    switch (value.trim().toUpperCase()) {
        case "MALE":
        case "M":
        case "L":
            return "Laki-laki";

        case "FEMALE":
        case "F":
        case "P":
            return "Perempuan";

        default:
            return value || "—";
    }
};

const isSuccess = (value: string): boolean =>
    [
        "APPROVED",
        "PAID",
        "SUCCESS",
        "COMPLETED",
        "SETTLEMENT",
    ].includes(normalizeStatus(value));

const isPending = (value: string): boolean =>
    [
        "PENDING",
        "WAITING",
        "UNPAID",
        "CREATED",
        "PROCESSING",
    ].includes(normalizeStatus(value));

const isFailed = (value: string): boolean =>
    [
        "FAILED",
        "CANCELLED",
        "CANCELED",
        "EXPIRED",
        "DENIED",
        "REJECTED",
    ].includes(normalizeStatus(value));

const getToken = (): string | null =>
    sessionStorage.getItem("admin_token") ??
    localStorage.getItem("admin_token");

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

    const contentType =
        response.headers.get("content-type") ?? "";

    let payload: unknown = null;

    if (contentType.includes("application/json")) {
        payload = await response.json();
    } else {
        const responseText = await response.text();
        payload = responseText || null;
    }

    if (!response.ok) {
        const serverMessage =
            isRecord(payload) &&
                typeof payload.message === "string"
                ? payload.message
                : "";

        throw new ApiError(
            response.status,
            serverMessage ||
            (response.status === 401
                ? "Token tidak diterima oleh endpoint ini."
                : response.status === 403
                    ? "Akses ke endpoint ini tidak diizinkan."
                    : `Request gagal (HTTP ${response.status}).`)
        );
    }

    if (
        isRecord(payload) &&
        payload.success === false
    ) {
        throw new Error(
            typeof payload.message === "string"
                ? payload.message
                : "Operasi API gagal."
        );
    }

    return payload;
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
                return extractArray(
                    value,
                    keys,
                    depth + 1
                );
            } catch {
                // Periksa field lainnya.
            }
        }
    }

    throw new Error("Daftar data tidak ditemukan.");
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

    if (
        payload[idKey] !== null &&
        payload[idKey] !== undefined &&
        payload[idKey] !== ""
    ) {
        return payload;
    }

    for (const key of [
        ...keys,
        "data",
        "result",
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
                // Periksa field lainnya.
            }
        }
    }

    throw new Error("Detail data tidak ditemukan.");
};

const normalizeOrder = (
    row: ApiRecord
): OrderData | null => {
    const idOrder = firstText(row, [
        "id_order",
        "order_id",
    ]).trim();

    if (!idOrder) {
        return null;
    }

    const customer = nestedRecord(row, [
        "customer",
        "customer_data",
    ]);

    const guest = nestedRecord(row, [
        "guest",
        "guest_data",
    ]);

    const service = nestedRecord(row, [
        "service",
        "service_data",
    ]);

    const provider = nestedRecord(row, [
        "provider",
        "provider_data",
    ]);

    return {
        id_order: idOrder,

        id_customer:
            firstId(row, ["id_customer"]) ??
            (customer
                ? asId(customer.id_customer)
                : null),

        id_guest:
            firstId(row, ["id_guest"]) ??
            (guest
                ? asId(guest.id_guest)
                : null),

        id_service:
            firstId(row, ["id_service"]) ??
            (service
                ? asId(service.id_service)
                : null),

        id_provider:
            firstId(row, ["id_provider"]) ??
            (provider
                ? asId(provider.id_provider)
                : null) ??
            (service
                ? asId(service.id_provider)
                : null),

        sub_total: asMoney(row.sub_total),

        total: asMoney(
            row.total ?? row.total_amount
        ),

        payment_method: asText(
            row.payment_method
        ),

        payment_status: normalizeStatus(
            row.payment_status
        ),

        order_status: normalizeStatus(
            row.order_status
        ),

        booking_at: firstText(row, [
            "booking_at",
            "booking_date",
        ]),

        paid_at: asText(row.paid_at),

        payment_expired_at: asText(
            row.payment_expired_at
        ),

        payment_updated_at: asText(
            row.payment_updated_at
        ),

        created_at: asText(row.created_at),

        dana_payment_id: asText(
            row.dana_payment_id
        ),

        name_customer:
            firstText(row, [
                "name_customer",
                "customer_name",
            ]) ||
            (customer
                ? firstText(customer, [
                    "name_customer",
                    "name",
                ])
                : ""),

        name_guest:
            firstText(row, [
                "name_guest",
                "guest_name",
            ]) ||
            (guest
                ? firstText(guest, [
                    "name_guest",
                    "name",
                ])
                : ""),

        name_service:
            firstText(row, [
                "name_service",
                "service_name",
            ]) ||
            (service
                ? firstText(service, [
                    "name_service",
                    "name",
                ])
                : ""),

        name_provider:
            firstText(row, [
                "name_provider",
                "provider_name",
            ]) ||
            (provider
                ? firstText(provider, [
                    "name_provider",
                    "name",
                ])
                : ""),
    };
};

const normalizeCustomer = (
    row: ApiRecord
): CustomerData | null => {
    const id = asId(row.id_customer);

    if (id === null) {
        return null;
    }

    return {
        id_customer: id,
        name_customer: asText(row.name_customer),
        email_customer: asText(row.email_customer),
        phone_number_customer: asText(
            row.phone_number_customer
        ),
        gender_customer: asText(
            row.gender_customer
        ),
        dob_customer: asText(row.dob_customer),
    };
};

const normalizeGuest = (
    row: ApiRecord
): GuestData | null => {
    const id = asId(row.id_guest);

    if (id === null) {
        return null;
    }

    return {
        id_guest: id,

        id_customer: asId(
            row.id_customer
        ),

        name_guest: asText(
            row.name_guest
        ),

        email_guest: asText(
            row.email_guest
        ),

        phone_number_guest: asText(
            row.phone_number_guest
        ),

        gender_guest: asText(
            row.gender_guest
        ),
    };
};

const getAllOrders = async (
    signal?: AbortSignal
): Promise<OrderData[]> => {
    const response = await apiRequest(
        "/order/get-all",
        { signal }
    );

    return extractArray(response, [
        "orders",
        "order",
    ])
        .map(normalizeOrder)
        .filter(
            (item): item is OrderData =>
                item !== null
        );
};

const getOrderDetail = async (
    orderId: string,
    signal?: AbortSignal
): Promise<Partial<OrderData>> => {
    const id = orderId.trim();

    if (!id) {
        throw new Error("ID pesanan kosong.");
    }

    // ID order harus tetap string / UUID.
    const response = await apiRequest(
        `/order/${encodeURIComponent(id)}`,
        { signal }
    );

    const raw = extractObject(
        response,
        ["order"],
        "id_order"
    );

    const normalized = normalizeOrder(raw);

    if (!normalized) {
        throw new Error(
            "Detail pesanan tidak valid."
        );
    }

    // Hanya field terisi yang ditimpa.
    // ID guest/customer dari daftar tetap dipertahankan
    // apabila endpoint detail mengembalikan data parsial.

    const result: Partial<OrderData> = {
        id_order: normalized.id_order,
    };

    const keys = Object.keys(
        normalized
    ) as Array<keyof OrderData>;

    for (const key of keys) {
        if (key === "id_order") {
            continue;
        }

        const value = normalized[key];

        if (
            value !== null &&
            value !== undefined &&
            value !== "" &&
            value !== "UNKNOWN"
        ) {
            Object.assign(result, {
                [key]: value,
            });
        }
    }

    return result;
};

const getAllCustomers = async (
    signal?: AbortSignal
): Promise<CustomerData[]> => {
    const response = await apiRequest(
        "/customer/get-all",
        { signal }
    );

    return extractArray(response, [
        "customers",
        "customer",
    ])
        .map(normalizeCustomer)
        .filter(
            (item): item is CustomerData =>
                item !== null
        );
};

const getAdminGuestDetail = async (
    guestId: number,
    signal?: AbortSignal
): Promise<GuestData> => {
    if (
        !Number.isSafeInteger(guestId) ||
        guestId <= 0
    ) {
        throw new Error(
            "ID guest tidak valid."
        );
    }

    const response = await apiRequest(
        `/admin/guest/${guestId}`,
        { signal }
    );

    const raw = extractObject(
        response,
        ["guest"],
        "id_guest"
    );

    const guest = normalizeGuest(raw);

    if (!guest) {
        throw new Error(
            "Data guest tidak valid."
        );
    }

    return guest;
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
        .map((row) => ({
            id_service: asId(
                row.id_service
            ),

            id_provider: asId(
                row.id_provider
            ),

            name_service: asText(
                row.name_service
            ),
        }))
        .filter(
            (item): item is ServiceData =>
                item.id_service !== null
        );
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
        .map((row) => ({
            id_provider: asId(
                row.id_provider
            ),

            name_provider: asText(
                row.name_provider
            ),
        }))
        .filter(
            (item): item is ProviderData =>
                item.id_provider !== null
        );
};

const StatusBadge = ({
    status,
}: {
    status: string;
}) => {
    const value = normalizeStatus(status);

    const color = isSuccess(value)
        ? "bg-emerald-50 text-emerald-700"
        : isFailed(value)
            ? "bg-red-50 text-red-700"
            : isPending(value)
                ? "bg-amber-50 text-amber-700"
                : "bg-slate-100 text-slate-600";

    return (
        <span
            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${color}`}
        >
            {value}
        </span>
    );
};

const RecipientBadge = ({
    isGuest,
}: {
    isGuest: boolean;
}) => (
    <span
        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${isGuest
            ? "bg-violet-50 text-violet-700"
            : "bg-blue-50 text-blue-700"
            }`}
    >
        {isGuest
            ? "Orang Lain"
            : "Diri Sendiri"}
    </span>
);

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
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 p-6 text-center">
        <ShoppingBag
            size={28}
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
                className="flex h-[min(720px,90dvh)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
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

                {/* SCROLLABLE BODY */}
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

const Order = () => {
    const navigate = useNavigate();

    const [orders, setOrders] =
        useState<OrderData[]>([]);

    const [customers, setCustomers] =
        useState<CustomerData[]>([]);

    const [services, setServices] =
        useState<ServiceData[]>([]);

    const [providers, setProviders] =
        useState<ProviderData[]>([]);

    // Cache guest yang sudah berhasil diambil.
    const [guestCache, setGuestCache] =
        useState<Record<number, GuestData>>({});

    const [selectedOrderId, setSelectedOrderId] =
        useState<string | null>(null);

    const [detail, setDetail] =
        useState<Partial<OrderData> | null>(null);

    const [detailGuest, setDetailGuest] =
        useState<GuestData | null>(null);

    const [detailOpen, setDetailOpen] =
        useState(false);

    const [detailLoading, setDetailLoading] =
        useState(false);

    const [guestLoading, setGuestLoading] =
        useState(false);

    const [detailError, setDetailError] =
        useState("");

    const [guestError, setGuestError] =
        useState("");

    const [search, setSearch] =
        useState("");

    const [orderFilter, setOrderFilter] =
        useState("ALL");

    const [paymentFilter, setPaymentFilter] =
        useState("ALL");

    const [providerFilter, setProviderFilter] =
        useState("ALL");

    const [recipientFilter, setRecipientFilter] =
        useState("ALL");

    const [page, setPage] =
        useState(1);

    const [loading, setLoading] =
        useState(true);

    const [listError, setListError] =
        useState("");

    const [refreshKey, setRefreshKey] =
        useState(0);

    const handleMainApiError = useCallback(
        (error: unknown) => {
            if (
                error instanceof ApiError &&
                error.status === 401 &&
                !getToken()
            ) {
                navigate("/user/sign-in", {
                    replace: true,
                });
            }
        },
        [navigate]
    );

    useEffect(() => {
        const controller =
            new AbortController();

        const loadData = async () => {
            setLoading(true);
            setListError("");

            const results =
                await Promise.allSettled([
                    getAllOrders(
                        controller.signal
                    ),

                    getAllCustomers(
                        controller.signal
                    ),

                    getAllServices(
                        controller.signal
                    ),

                    getAllProviders(
                        controller.signal
                    ),
                ]);

            if (controller.signal.aborted) {
                return;
            }

            const [
                orderResult,
                customerResult,
                serviceResult,
                providerResult,
            ] = results;

            if (
                orderResult.status ===
                "fulfilled"
            ) {
                setOrders(
                    orderResult.value
                );
            } else {
                setOrders([]);

                setListError(
                    getErrorMessage(
                        orderResult.reason
                    )
                );

                handleMainApiError(
                    orderResult.reason
                );
            }

            // Lookup lain tidak menggagalkan daftar.
            setCustomers(
                customerResult.status ===
                    "fulfilled"
                    ? customerResult.value
                    : []
            );

            setServices(
                serviceResult.status ===
                    "fulfilled"
                    ? serviceResult.value
                    : []
            );

            setProviders(
                providerResult.status ===
                    "fulfilled"
                    ? providerResult.value
                    : []
            );

            setLoading(false);
        };

        void loadData();

        return () => controller.abort();
    }, [
        refreshKey,
        handleMainApiError,
    ]);

    const getCustomer = useCallback(
        (id: number | null): CustomerData | null => {
            if (id === null) {
                return null;
            }

            return (
                customers.find(
                    (item) =>
                        item.id_customer === id
                ) ?? null
            );
        },
        [customers]
    );

    const getService = useCallback(
        (id: number | null): ServiceData | null => {
            if (id === null) {
                return null;
            }

            return (
                services.find(
                    (item) =>
                        item.id_service === id
                ) ?? null
            );
        },
        [services]
    );

    const getProvider = useCallback(
        (id: number | null): ProviderData | null => {
            if (id === null) {
                return null;
            }

            return (
                providers.find(
                    (item) =>
                        item.id_provider === id
                ) ?? null
            );
        },
        [providers]
    );

    const customerName = useCallback(
        (order: OrderData): string => {
            return (
                getCustomer(
                    order.id_customer
                )?.name_customer ||
                order.name_customer ||
                (
                    order.id_customer !== null
                        ? `Customer #${order.id_customer}`
                        : "—"
                )
            );
        },
        [getCustomer]
    );

    const recipientName = useCallback(
        (order: OrderData): string => {
            if (
                order.id_guest !== null
            ) {
                return (
                    guestCache[
                        order.id_guest
                    ]?.name_guest ||
                    order.name_guest ||
                    `Guest #${order.id_guest}`
                );
            }

            return customerName(order);
        },
        [
            guestCache,
            customerName,
        ]
    );

    const serviceName = useCallback(
        (order: OrderData): string => {
            return (
                getService(
                    order.id_service
                )?.name_service ||
                order.name_service ||
                (
                    order.id_service !== null
                        ? `Layanan #${order.id_service}`
                        : "—"
                )
            );
        },
        [getService]
    );

    const getProviderId = useCallback(
        (order: OrderData): number | null => {
            return (
                order.id_provider ??
                getService(
                    order.id_service
                )?.id_provider ??
                null
            );
        },
        [getService]
    );

    const providerName = useCallback(
        (order: OrderData): string => {
            const id =
                getProviderId(order);

            return (
                getProvider(
                    id
                )?.name_provider ||
                order.name_provider ||
                (
                    id !== null
                        ? `Provider #${id}`
                        : "—"
                )
            );
        },
        [
            getProvider,
            getProviderId,
        ]
    );

    const selectedOrder = useMemo(
        () =>
            orders.find(
                (order) =>
                    order.id_order ===
                    selectedOrderId
            ) ?? null,
        [
            orders,
            selectedOrderId,
        ]
    );

    const activeOrder = useMemo(() => {
        if (!selectedOrder) {
            return null;
        }

        if (
            !detail ||
            detail.id_order !==
            selectedOrder.id_order
        ) {
            return selectedOrder;
        }

        return {
            ...selectedOrder,
            ...detail,
        };
    }, [
        selectedOrder,
        detail,
    ]);

    const pendingCount = orders.filter(
        (order) =>
            isPending(
                order.order_status
            )
    ).length;

    const successCount = orders.filter(
        (order) =>
            isSuccess(
                order.order_status
            )
    ).length;

    const failedCount = orders.filter(
        (order) =>
            isFailed(
                order.order_status
            )
    ).length;

    const guestCount = orders.filter(
        (order) =>
            order.id_guest !== null
    ).length;

    const orderStatuses = useMemo(
        () =>
            [
                ...new Set(
                    orders.map(
                        (order) =>
                            order.order_status
                    )
                ),
            ]
                .filter(Boolean)
                .sort(),
        [orders]
    );

    const paymentStatuses = useMemo(
        () =>
            [
                ...new Set(
                    orders.map(
                        (order) =>
                            order.payment_status
                    )
                ),
            ]
                .filter(Boolean)
                .sort(),
        [orders]
    );

    const availableProviders = useMemo(() => {
        const ids = new Set(
            orders
                .map(
                    getProviderId
                )
                .filter(
                    (id): id is number =>
                        id !== null
                )
        );

        return [
            ...ids,
        ]
            .map((id) => ({
                id,
                name:
                    getProvider(id)
                        ?.name_provider ||
                    `Provider #${id}`,
            }))
            .sort((a, b) =>
                a.name.localeCompare(
                    b.name
                )
            );
    }, [
        orders,
        getProviderId,
        getProvider,
    ]);

    const filteredOrders = useMemo(() => {
        const keyword =
            search
                .trim()
                .toLowerCase();

        return orders
            .filter((order) => {
                const searchable = [
                    order.id_order,
                    customerName(order),
                    recipientName(order),
                    serviceName(order),
                    providerName(order),
                    order.payment_method,
                    order.dana_payment_id,
                ];

                const matchSearch =
                    searchable.some(
                        (value) =>
                            value
                                .toLowerCase()
                                .includes(keyword)
                    );

                const matchOrder =
                    orderFilter ===
                    "ALL" ||
                    order.order_status ===
                    orderFilter;

                const matchPayment =
                    paymentFilter ===
                    "ALL" ||
                    order.payment_status ===
                    paymentFilter;

                const matchProvider =
                    providerFilter ===
                    "ALL" ||
                    String(
                        getProviderId(order)
                    ) === providerFilter;

                const matchRecipient =
                    recipientFilter ===
                    "ALL" ||
                    (
                        recipientFilter ===
                            "GUEST"
                            ? order.id_guest !==
                            null
                            : order.id_guest ===
                            null
                    );

                return (
                    matchSearch &&
                    matchOrder &&
                    matchPayment &&
                    matchProvider &&
                    matchRecipient
                );
            })
            .sort((a, b) => {
                const dateA = parseDate(
                    a.created_at ||
                    a.booking_at
                );

                const dateB = parseDate(
                    b.created_at ||
                    b.booking_at
                );

                return (
                    (
                        dateB?.getTime() ??
                        0
                    ) -
                    (
                        dateA?.getTime() ??
                        0
                    )
                );
            });
    }, [
        orders,
        search,
        orderFilter,
        paymentFilter,
        providerFilter,
        recipientFilter,
        customerName,
        recipientName,
        serviceName,
        providerName,
        getProviderId,
    ]);

    const totalPages = Math.max(
        1,
        Math.ceil(
            filteredOrders.length /
            PAGE_SIZE
        )
    );

    const currentPage = Math.min(
        page,
        totalPages
    );

    const displayedOrders =
        filteredOrders.slice(
            (currentPage - 1) *
            PAGE_SIZE,

            currentPage *
            PAGE_SIZE
        );

    const closeModal = useCallback(() => {
        setDetailOpen(false);
        setSelectedOrderId(null);
        setDetail(null);
        setDetailGuest(null);
        setDetailError("");
        setGuestError("");
        setGuestLoading(false);
    }, []);

    const openDetail = (
        order: OrderData
    ) => {
        setSelectedOrderId(
            order.id_order
        );

        setDetail(null);
        setDetailGuest(null);
        setDetailError("");
        setGuestError("");
        setDetailOpen(true);
    };

    useEffect(() => {
        if (
            !detailOpen ||
            !selectedOrderId
        ) {
            return;
        }

        const controller =
            new AbortController();

        const loadDetail = async () => {
            setDetailLoading(true);
            setDetailError("");

            try {
                const response =
                    await getOrderDetail(
                        selectedOrderId,
                        controller.signal
                    );

                if (
                    !controller.signal.aborted
                ) {
                    setDetail(
                        response
                    );
                }
            } catch (error) {
                if (
                    !controller.signal.aborted
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

        void loadDetail();

        return () =>
            controller.abort();
    }, [
        detailOpen,
        selectedOrderId,
    ]);

    const selectedGuestId =
        activeOrder?.id_guest ??
        null;

    useEffect(() => {
        if (
            !detailOpen ||
            selectedGuestId === null
        ) {
            setDetailGuest(null);
            setGuestLoading(false);
            return;
        }

        const cached =
            guestCache[selectedGuestId];

        if (cached) {
            setDetailGuest(cached);
            setGuestError("");
            setGuestLoading(false);
            return;
        }

        const controller =
            new AbortController();

        const loadGuest = async () => {
            setGuestLoading(true);
            setGuestError("");
            setDetailGuest(null);

            try {
                const guest =
                    await getAdminGuestDetail(
                        selectedGuestId,
                        controller.signal
                    );

                if (
                    controller.signal.aborted
                ) {
                    return;
                }

                setDetailGuest(guest);

                // Cache guest untuk detail berikutnya.
                setGuestCache((current) => ({
                    ...current,
                    [guest.id_guest]: guest,
                }));
            } catch (error) {
                if (
                    controller.signal.aborted
                ) {
                    return;
                }

                const message =
                    getErrorMessage(error);

                if (
                    error instanceof ApiError &&
                    [401, 403].includes(
                        error.status
                    )
                ) {
                    setGuestError(
                        `Akses detail guest ditolak oleh backend (${error.status}): ${message}`
                    );
                } else {
                    setGuestError(
                        `Detail guest tidak dapat dimuat: ${message}`
                    );
                }
            } finally {
                if (
                    !controller.signal.aborted
                ) {
                    setGuestLoading(false);
                }
            }
        };

        void loadGuest();

        return () =>
            controller.abort();
    }, [
        detailOpen,
        selectedGuestId,
        guestCache,
    ]);

    const refreshData = () => {
        setGuestCache({});
        setRefreshKey(
            (value) => value + 1
        );
    };

    const renderDetailModal = () => {
        if (
            !detailOpen ||
            !activeOrder
        ) {
            return null;
        }

        const order =
            activeOrder;

        const customer =
            getCustomer(
                order.id_customer
            );

        const guest =
            order.id_guest !== null
                ? (
                    detailGuest?.id_guest ===
                        order.id_guest
                        ? detailGuest
                        : guestCache[
                        order.id_guest
                        ] ?? null
                )
                : null;

        const isGuestOrder =
            order.id_guest !== null;

        const bookerName =
            customerName(order);

        const receiverName =
            isGuestOrder
                ? (
                    guest?.name_guest ||
                    order.name_guest ||
                    `Guest #${order.id_guest}`
                )
                : bookerName;

        return (
            <Modal
                title="Detail Pesanan"
                onClose={closeModal}
                footer={
                    <button
                        type="button"
                        onClick={closeModal}
                        className={secondaryButton}
                    >
                        Tutup
                    </button>
                }
            >
                {/* ERRORS */}
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
                            Detail tambahan pesanan
                            tidak dapat dimuat:
                            {" "}
                            {detailError}.
                            Data dari daftar tetap
                            ditampilkan.
                        </span>
                    </div>
                )}

                {guestError && (
                    <div
                        role="alert"
                        className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700"
                    >
                        <AlertCircle
                            size={16}
                            className="shrink-0"
                        />

                        <span>
                            {guestError}
                        </span>
                    </div>
                )}

                <div className="space-y-6">
                    {/* ORDER HEADER */}
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0866D8]">
                                <ShoppingBag
                                    size={23}
                                />
                            </div>

                            <div className="min-w-0">
                                <h3 className="text-base font-bold text-slate-950">
                                    {serviceName(
                                        order
                                    )}
                                </h3>

                                <p className="mt-1 break-all text-xs text-slate-500">
                                    {
                                        order.id_order
                                    }
                                </p>

                                <div className="mt-2">
                                    <RecipientBadge
                                        isGuest={
                                            isGuestOrder
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        <StatusBadge
                            status={
                                order.order_status
                            }
                        />
                    </div>

                    {/* LOADING */}
                    {(detailLoading ||
                        guestLoading) && (
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <LoaderCircle
                                    size={14}
                                    className="animate-spin"
                                />

                                Memuat informasi tambahan...
                            </div>
                        )}

                    {/* INFORMASI PESANAN */}
                    <section className="border-t border-slate-100 pt-5">
                        <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#00357A]">
                            <Package size={17} />
                            Informasi Pesanan
                        </h4>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <DetailField
                                label="ID Pesanan"
                                value={
                                    order.id_order
                                }
                            />

                            <DetailField
                                label="Nama Layanan"
                                value={serviceName(
                                    order
                                )}
                            />

                            <DetailField
                                label="Provider"
                                value={providerName(
                                    order
                                )}
                            />

                            <DetailField
                                label="ID Layanan"
                                value={
                                    order.id_service
                                }
                            />

                            <DetailField
                                label="Status Pesanan"
                                value={
                                    order.order_status
                                }
                            />

                            <DetailField
                                label="Jenis Penerima"
                                value={
                                    isGuestOrder
                                        ? "Orang Lain / Guest"
                                        : "Diri Sendiri"
                                }
                            />
                        </div>
                    </section>

                    {/* INFORMASI PEMESAN */}
                    <section className="border-t border-slate-100 pt-5">
                        <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#00357A]">
                            <UserRound
                                size={17}
                            />

                            Informasi Pemesan
                        </h4>

                        <p className="mb-4 text-xs text-slate-500">
                            Akun customer yang melakukan
                            pemesanan layanan.
                        </p>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <DetailField
                                label="ID Customer"
                                value={
                                    order.id_customer
                                }
                            />

                            <DetailField
                                label="Nama Customer"
                                value={
                                    bookerName
                                }
                            />

                            <DetailField
                                label="Email"
                                value={
                                    customer?.email_customer
                                }
                            />

                            <DetailField
                                label="Nomor Telepon"
                                value={
                                    customer?.phone_number_customer
                                }
                            />
                        </div>
                    </section>

                    {/* INFORMASI PENERIMA */}
                    <section className="border-t border-slate-100 pt-5">
                        <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#00357A]">
                            <Users
                                size={17}
                            />

                            Informasi Penerima Layanan
                        </h4>

                        <div className="mb-4">
                            <RecipientBadge
                                isGuest={
                                    isGuestOrder
                                }
                            />
                        </div>

                        {isGuestOrder ? (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <DetailField
                                    label="ID Guest"
                                    value={
                                        order.id_guest
                                    }
                                />

                                <DetailField
                                    label="Nama Penerima"
                                    value={
                                        receiverName
                                    }
                                />

                                <DetailField
                                    label="Email Guest"
                                    value={
                                        guest?.email_guest
                                    }
                                />

                                <DetailField
                                    label="Nomor Telepon Guest"
                                    value={
                                        guest?.phone_number_guest
                                    }
                                />

                                <DetailField
                                    label="Jenis Kelamin"
                                    value={genderLabel(
                                        guest?.gender_guest ||
                                        ""
                                    )}
                                />

                                <DetailField
                                    label="ID Customer Pemilik Guest"
                                    value={
                                        guest?.id_customer
                                    }
                                />
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <DetailField
                                    label="Nama Penerima"
                                    value={
                                        receiverName
                                    }
                                />

                                <DetailField
                                    label="Email"
                                    value={
                                        customer?.email_customer
                                    }
                                />

                                <DetailField
                                    label="Nomor Telepon"
                                    value={
                                        customer?.phone_number_customer
                                    }
                                />

                                <DetailField
                                    label="Jenis Kelamin"
                                    value={genderLabel(
                                        customer?.gender_customer ||
                                        ""
                                    )}
                                />

                                <DetailField
                                    label="Tanggal Lahir"
                                    value={
                                        customer?.dob_customer ||
                                        "—"
                                    }
                                />
                            </div>
                        )}
                    </section>

                    {/* INFORMASI BOOKING */}
                    <section className="border-t border-slate-100 pt-5">
                        <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#00357A]">
                            <CalendarDays
                                size={17}
                            />

                            Informasi Booking
                        </h4>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <DetailField
                                label="Jadwal Booking"
                                value={formatDateTime(
                                    order.booking_at
                                )}
                            />

                            <DetailField
                                label="Jenis Booking"
                                value={
                                    isGuestOrder
                                        ? "Untuk Orang Lain"
                                        : "Untuk Diri Sendiri"
                                }
                            />

                            <DetailField
                                label="Nama Pemesan"
                                value={
                                    bookerName
                                }
                            />

                            <DetailField
                                label="Nama Penerima"
                                value={
                                    receiverName
                                }
                            />
                        </div>
                    </section>

                    {/* INFORMASI PEMBAYARAN */}
                    <section className="border-t border-slate-100 pt-5">
                        <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#00357A]">
                            <CreditCard
                                size={17}
                            />

                            Informasi Pembayaran
                        </h4>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <DetailField
                                label="Metode Pembayaran"
                                value={
                                    order.payment_method
                                }
                            />

                            <div>
                                <p className="mb-2 text-xs text-[#526789]">
                                    Status Pembayaran
                                </p>

                                <StatusBadge
                                    status={
                                        order.payment_status
                                    }
                                />
                            </div>

                            <DetailField
                                label="Subtotal"
                                value={formatCurrency(
                                    order.sub_total
                                )}
                            />

                            <DetailField
                                label="Total Pembayaran"
                                value={formatCurrency(
                                    order.total
                                )}
                            />

                            <DetailField
                                label="Waktu Pembayaran"
                                value={formatDateTime(
                                    order.paid_at
                                )}
                            />

                            <DetailField
                                label="Batas Pembayaran"
                                value={formatDateTime(
                                    order.payment_expired_at
                                )}
                            />

                            <DetailField
                                label="Pembaruan Pembayaran"
                                value={formatDateTime(
                                    order.payment_updated_at
                                )}
                            />

                            <DetailField
                                label="DANA Payment ID"
                                value={
                                    order.dana_payment_id
                                }
                            />
                        </div>
                    </section>
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
                        Transaksi / Pesanan
                    </p>

                    <h1 className="text-2xl font-bold text-slate-950 sm:text-[28px]">
                        Pesanan
                    </h1>

                    <p className="mt-2 text-sm text-[#526789]">
                        Pantau pesanan, penerima
                        layanan, dan status pembayaran.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={
                        refreshData
                    }
                    disabled={
                        loading
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
            </div>

            {/* SUMMARY */}
            <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-5">
                {[
                    {
                        label:
                            "Total Pesanan",
                        value:
                            orders.length,
                        icon: (
                            <ClipboardList
                                size={19}
                            />
                        ),
                    },
                    {
                        label:
                            "Pending",
                        value:
                            pendingCount,
                        icon: (
                            <Clock3
                                size={19}
                            />
                        ),
                    },
                    {
                        label:
                            "Berhasil",
                        value:
                            successCount,
                        icon: (
                            <CheckCircle2
                                size={19}
                            />
                        ),
                    },
                    {
                        label:
                            "Gagal / Batal",
                        value:
                            failedCount,
                        icon: (
                            <AlertCircle
                                size={19}
                            />
                        ),
                    },
                    {
                        label:
                            "Untuk Orang Lain",
                        value:
                            guestCount,
                        icon: (
                            <Users
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

            {/* ORDERS TABLE */}
            <section className="overflow-hidden rounded-2xl border border-[#DBE4F0] bg-white shadow-sm">
                {/* FILTER HEADER */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
                    <div>
                        <h2 className="text-sm font-bold text-slate-950">
                            Daftar Pesanan
                        </h2>

                        <p className="mt-1 text-xs text-[#526789]">
                            {loading
                                ? "Memuat..."
                                : `${filteredOrders.length} pesanan`}
                        </p>
                    </div>

                    <div className="flex w-full flex-wrap gap-2 xl:w-auto">
                        {/* SEARCH */}
                        <div className="relative min-w-47.5 flex-1 xl:w-52">
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
                                placeholder="Cari pesanan..."
                                className="w-full rounded-lg border border-[#DBE4F0] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#0866D8]"
                            />
                        </div>

                        {/* ORDER STATUS */}
                        <select
                            value={
                                orderFilter
                            }
                            onChange={
                                (event) => {
                                    setOrderFilter(
                                        event.target.value
                                    );

                                    setPage(1);
                                }
                            }
                            aria-label="Filter status pesanan"
                            className={
                                filterClass
                            }
                        >
                            <option value="ALL">
                                Semua Status Pesanan
                            </option>

                            {orderStatuses.map(
                                (status) => (
                                    <option
                                        key={
                                            status
                                        }
                                        value={
                                            status
                                        }
                                    >
                                        {
                                            status
                                        }
                                    </option>
                                )
                            )}
                        </select>

                        {/* PAYMENT STATUS */}
                        <select
                            value={
                                paymentFilter
                            }
                            onChange={
                                (event) => {
                                    setPaymentFilter(
                                        event.target.value
                                    );

                                    setPage(1);
                                }
                            }
                            aria-label="Filter status pembayaran"
                            className={
                                filterClass
                            }
                        >
                            <option value="ALL">
                                Semua Pembayaran
                            </option>

                            {paymentStatuses.map(
                                (status) => (
                                    <option
                                        key={
                                            status
                                        }
                                        value={
                                            status
                                        }
                                    >
                                        {
                                            status
                                        }
                                    </option>
                                )
                            )}
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
                            className={`${filterClass} max-w-44`}
                        >
                            <option value="ALL">
                                Semua Provider
                            </option>

                            {availableProviders.map(
                                (provider) => (
                                    <option
                                        key={
                                            provider.id
                                        }
                                        value={
                                            provider.id
                                        }
                                    >
                                        {
                                            provider.name
                                        }
                                    </option>
                                )
                            )}
                        </select>

                        {/* RECIPIENT */}
                        <select
                            value={
                                recipientFilter
                            }
                            onChange={
                                (event) => {
                                    setRecipientFilter(
                                        event.target.value
                                    );

                                    setPage(1);
                                }
                            }
                            aria-label="Filter penerima"
                            className={
                                filterClass
                            }
                        >
                            <option value="ALL">
                                Semua Penerima
                            </option>

                            <option value="SELF">
                                Diri Sendiri
                            </option>

                            <option value="GUEST">
                                Orang Lain
                            </option>
                        </select>
                    </div>
                </div>

                {/* TABLE BODY */}
                {loading ? (
                    <LoadingState />
                ) : listError ? (
                    <div
                        role="alert"
                        className="p-5 text-sm text-red-600"
                    >
                        {
                            listError
                        }
                    </div>
                ) : filteredOrders.length ===
                    0 ? (
                    <EmptyState message="Pesanan tidak ditemukan." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead className="bg-[#F5F8FC]">
                                <tr>
                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        No.
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        ID Pesanan
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        Pemesan
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        Penerima Layanan
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        Layanan / Provider
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        Booking
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        Total
                                    </th>

                                    <th className="px-5 py-3 text-center text-xs font-semibold text-[#344F77]">
                                        Pesanan
                                    </th>

                                    <th className="px-5 py-3 text-center text-xs font-semibold text-[#344F77]">
                                        Pembayaran
                                    </th>

                                    <th className="px-5 py-3 text-right text-xs font-semibold text-[#344F77]">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {displayedOrders.map(
                                    (
                                        order,
                                        index
                                    ) => (
                                        <tr
                                            key={
                                                order.id_order
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

                                            {/* ORDER ID */}
                                            <td className="px-5 py-4">
                                                <p
                                                    title={
                                                        order.id_order
                                                    }
                                                    className="max-w-37.5 truncate text-xs font-semibold text-slate-900"
                                                >
                                                    {
                                                        order.id_order
                                                    }
                                                </p>

                                                <p className="mt-1 text-xs text-slate-500">
                                                    {order.payment_method ||
                                                        "—"}
                                                </p>
                                            </td>

                                            {/* CUSTOMER */}
                                            <td className="px-5 py-4">
                                                <div className="min-w-35">
                                                    <p className="font-semibold text-slate-900">
                                                        {customerName(
                                                            order
                                                        )}
                                                    </p>

                                                    <p className="mt-1 text-xs text-slate-500">
                                                        Customer #
                                                        {order.id_customer ??
                                                            "—"}
                                                    </p>
                                                </div>
                                            </td>

                                            {/* RECIPIENT */}
                                            <td className="px-5 py-4">
                                                <div className="min-w-37.5 space-y-1.5">
                                                    <p className="font-semibold text-slate-900">
                                                        {recipientName(
                                                            order
                                                        )}
                                                    </p>

                                                    <RecipientBadge
                                                        isGuest={
                                                            order.id_guest !==
                                                            null
                                                        }
                                                    />
                                                </div>
                                            </td>

                                            {/* SERVICE */}
                                            <td className="px-5 py-4">
                                                <div className="min-w-40">
                                                    <p className="max-w-52 truncate font-semibold text-slate-900">
                                                        {serviceName(
                                                            order
                                                        )}
                                                    </p>

                                                    <p className="mt-1 max-w-52 truncate text-xs text-slate-500">
                                                        {providerName(
                                                            order
                                                        )}
                                                    </p>
                                                </div>
                                            </td>

                                            {/* BOOKING */}
                                            <td className="px-5 py-4 text-xs text-slate-600">
                                                <div className="flex min-w-32.5 items-center gap-2">
                                                    <CalendarDays
                                                        size={15}
                                                        className="shrink-0 text-slate-400"
                                                    />

                                                    <span>
                                                        {formatDateTime(
                                                            order.booking_at
                                                        )}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* TOTAL */}
                                            <td className="px-5 py-4 font-semibold text-slate-900">
                                                {formatCurrency(
                                                    order.total
                                                )}
                                            </td>

                                            {/* ORDER STATUS */}
                                            <td className="px-5 py-4 text-center">
                                                <StatusBadge
                                                    status={
                                                        order.order_status
                                                    }
                                                />
                                            </td>

                                            {/* PAYMENT STATUS */}
                                            <td className="px-5 py-4 text-center">
                                                <StatusBadge
                                                    status={
                                                        order.payment_status
                                                    }
                                                />
                                            </td>

                                            {/* ACTION */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openDetail(
                                                                order
                                                            )
                                                        }
                                                        title="Detail Pesanan"
                                                        aria-label={`Detail ${order.id_order}`}
                                                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-blue-50 text-[#0866D8] hover:bg-blue-100"
                                                    >
                                                        <Eye
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
                    filteredOrders.length >
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
                                    filteredOrders.length
                                )}{" "}
                                dari{" "}
                                {
                                    filteredOrders.length
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

            {/* DETAIL MODAL */}
            {renderDetailModal()}
        </div>
    );
};

export default Order;
