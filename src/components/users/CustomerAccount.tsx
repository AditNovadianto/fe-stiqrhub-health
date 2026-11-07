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
    Eye,
    LoaderCircle,
    Mail,
    Phone,
    RefreshCw,
    Search,
    ShoppingBag,
    UserRound,
    Users,
    X,
} from "lucide-react";

const PAGE_SIZE = 10;

type ApiRecord = Record<string, unknown>;

interface CustomerData {
    id_customer: number;
    name_customer: string;
    email_customer: string;
    phone_number_customer: string;
    dob_customer: string;
    gender_customer: string;
    status_customer: string;
    id_platform: number | null;
}

interface CustomerOrder {
    id_order: string;
    id_customer: number | null;
    id_service: number | null;
    total: number | null;
    payment_method: string;
    payment_status: string;
    order_status: string;
    booking_at: string;
    paid_at: string;
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
}

type OrderState =
    | "idle"
    | "loading"
    | "success"
    | "error";

const secondaryButton =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#DBE4F0] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

const inputClass =
    "w-full rounded-lg border border-[#DBE4F0] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0866D8] focus:ring-2 focus:ring-blue-100";

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

const asMoney = (value: unknown): number | null => {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const number = Number(value);

    return Number.isFinite(number) ? number : null;
};

const normalizeStatus = (value: unknown): string =>
    asText(value || "UNKNOWN").trim().toUpperCase();

const getErrorMessage = (error: unknown): string =>
    error instanceof Error
        ? error.message
        : "Terjadi kesalahan. Silakan coba kembali.";

const formatCurrency = (
    value: number | null
): string => {
    if (value === null) return "—";

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(value);
};

const formatDate = (value: string): string => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Jakarta",
    }).format(date);
};

const formatDateTime = (value: string): string => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
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
    switch (value.trim().toLowerCase()) {
        case "male":
        case "m":
        case "l":
        case "laki-laki":
            return "Laki-laki";

        case "female":
        case "f":
        case "p":
        case "perempuan":
            return "Perempuan";

        default:
            return value || "—";
    }
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

const extractArray = (
    payload: unknown,
    keys: string[],
    depth = 0
): ApiRecord[] => {
    if (Array.isArray(payload)) {
        if (!payload.every(isRecord)) {
            throw new Error("Format data API tidak valid.");
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
                // Lanjut periksa field lainnya.
            }
        }
    }

    throw new Error("Daftar data tidak ditemukan.");
};

const normalizeCustomer = (
    row: ApiRecord
): CustomerData | null => {
    const id = asId(row.id_customer);

    if (id === null) return null;

    return {
        id_customer: id,
        name_customer: asText(row.name_customer),
        email_customer: asText(row.email_customer),
        phone_number_customer: asText(
            row.phone_number_customer
        ),
        dob_customer: asText(row.dob_customer),
        gender_customer: asText(row.gender_customer),
        status_customer: normalizeStatus(
            row.status_customer
        ),
        id_platform: asId(row.id_platform),
    };
};

const normalizeOrder = (
    row: ApiRecord
): CustomerOrder | null => {
    const id = asText(row.id_order);

    if (!id) return null;

    return {
        id_order: id,
        id_customer: asId(row.id_customer),
        id_service: asId(row.id_service),
        total: asMoney(row.total),
        payment_method: asText(row.payment_method),
        payment_status: normalizeStatus(
            row.payment_status
        ),
        order_status: normalizeStatus(
            row.order_status
        ),
        booking_at: asText(row.booking_at),
        paid_at: asText(row.paid_at),
    };
};

class UnauthorizedError extends Error {
    constructor() {
        super("Sesi berakhir. Silakan login kembali.");
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
        response.headers.get("content-type") ?? "";

    let payload: unknown = null;

    if (contentType.includes("application/json")) {
        payload = await response.json();
    } else {
        const responseText = await response.text();
        payload = responseText || null;
    }

    if (!response.ok) {
        throw new Error(
            isRecord(payload) &&
                typeof payload.message === "string"
                ? payload.message
                : response.status === 403
                    ? "Anda tidak memiliki akses untuk melihat data ini."
                    : `Request gagal (HTTP ${response.status}).`
        );
    }

    if (isRecord(payload) && payload.success === false) {
        throw new Error(
            typeof payload.message === "string"
                ? payload.message
                : "Operasi gagal."
        );
    }

    return payload;
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
            (customer): customer is CustomerData =>
                customer !== null
        );
};

const getCustomerOrders = async (
    customerId: number,
    signal?: AbortSignal
): Promise<CustomerOrder[]> => {
    const response = await apiRequest(
        `/order/customer/${customerId}`,
        { signal }
    );

    return extractArray(response, [
        "orders",
        "order",
    ])
        .map(normalizeOrder)
        .filter(
            (order): order is CustomerOrder =>
                order !== null
        );
};

const CustomerStatusBadge = ({
    status,
}: {
    status: string;
}) => {
    const value = normalizeStatus(status);

    const active = value === "ACTIVE";

    const color = active
        ? "bg-emerald-50 text-emerald-700"
        : value === "NOT_ACTIVE" || value === "INACTIVE"
            ? "bg-slate-100 text-slate-600"
            : "bg-amber-50 text-amber-700";

    return (
        <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${color}`}
        >
            {value === "ACTIVE"
                ? "Active"
                : value === "NOT_ACTIVE"
                    ? "Not Active"
                    : value === "INACTIVE"
                        ? "Inactive"
                        : value}
        </span>
    );
};

const OrderStatusBadge = ({
    status,
}: {
    status: string;
}) => {
    const value = normalizeStatus(status);

    const color =
        [
            "PAID",
            "SUCCESS",
            "COMPLETED",
            "REDEEMED",
        ].includes(value)
            ? "bg-emerald-50 text-emerald-700"
            : [
                "FAILED",
                "CANCELLED",
                "CANCELED",
                "EXPIRED",
            ].includes(value)
                ? "bg-red-50 text-red-700"
                : "bg-amber-50 text-amber-700";

    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${color}`}
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
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 p-6 text-center">
        <Users size={28} className="text-slate-300" />

        <p className="text-sm text-slate-500">
            {message}
        </p>
    </div>
);

const DetailField = ({
    label,
    value,
}: {
    label: string;
    value: string | number | null | undefined;
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
    busy = false,
}: ModalProps) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !busy) {
                onClose();
            }
        };

        document.addEventListener(
            "keydown",
            handleKeyDown
        );

        return () => {
            document.removeEventListener(
                "keydown",
                handleKeyDown
            );
        };
    }, [busy, onClose]);

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
                className="flex h-[min(680px,90dvh)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
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

const CustomerAccount = () => {
    const navigate = useNavigate();

    const [customers, setCustomers] = useState<
        CustomerData[]
    >([]);

    const [selectedCustomer, setSelectedCustomer] =
        useState<CustomerData | null>(null);

    const [orders, setOrders] = useState<
        CustomerOrder[]
    >([]);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [genderFilter, setGenderFilter] = useState("ALL");

    const [page, setPage] = useState(1);

    const [detailOpen, setDetailOpen] = useState(false);

    const [detailTab, setDetailTab] = useState<
        "profile" | "orders"
    >("profile");

    const [orderState, setOrderState] =
        useState<OrderState>("idle");

    const [orderError, setOrderError] = useState("");

    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState("");

    const [notice, setNotice] = useState<Notice | null>(
        null
    );

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

    useEffect(() => {
        const controller = new AbortController();

        const loadCustomers = async () => {
            setLoading(true);
            setListError("");

            try {
                const result = await getAllCustomers(
                    controller.signal
                );

                if (controller.signal.aborted) return;

                setCustomers(result);
            } catch (error) {
                if (controller.signal.aborted) return;

                if (!handleApiError(error)) {
                    setListError(getErrorMessage(error));
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        void loadCustomers();

        return () => controller.abort();
    }, [refreshKey, handleApiError]);

    const totalCustomers = customers.length;

    const activeCount = customers.filter(
        (customer) =>
            customer.status_customer === "ACTIVE"
    ).length;

    const inactiveCount = customers.filter(
        (customer) =>
            customer.status_customer === "NOT_ACTIVE" ||
            customer.status_customer === "INACTIVE"
    ).length;

    const platformCount = new Set(
        customers
            .map((customer) => customer.id_platform)
            .filter((id): id is number => id !== null)
    ).size;

    const filteredCustomers = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return customers.filter((customer) => {
            const searchFields = [
                customer.name_customer,
                customer.email_customer,
                customer.phone_number_customer,
                String(customer.id_customer),
            ];

            const matchSearch = searchFields.some(
                (value) =>
                    value.toLowerCase().includes(keyword)
            );

            const matchStatus =
                statusFilter === "ALL" ||
                (statusFilter === "NOT_ACTIVE"
                    ? ["NOT_ACTIVE", "INACTIVE"].includes(
                        customer.status_customer
                    )
                    : customer.status_customer === statusFilter);

            const matchGender =
                genderFilter === "ALL" ||
                customer.gender_customer.toLowerCase() ===
                genderFilter;

            return (
                matchSearch &&
                matchStatus &&
                matchGender
            );
        });
    }, [
        customers,
        search,
        statusFilter,
        genderFilter,
    ]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredCustomers.length / PAGE_SIZE)
    );

    const currentPage = Math.min(page, totalPages);

    const displayedCustomers = filteredCustomers.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    const closeModal = useCallback(() => {
        setDetailOpen(false);
        setSelectedCustomer(null);
        setDetailTab("profile");
        setOrders([]);
        setOrderState("idle");
        setOrderError("");
    }, []);

    const openDetail = (customer: CustomerData) => {
        setSelectedCustomer(customer);
        setDetailTab("profile");
        setOrders([]);
        setOrderState("idle");
        setOrderError("");
        setDetailOpen(true);
    };

    useEffect(() => {
        if (
            !detailOpen ||
            !selectedCustomer ||
            detailTab !== "orders"
        ) {
            return;
        }

        const controller = new AbortController();

        const loadOrders = async () => {
            setOrderState("loading");
            setOrderError("");

            try {
                const result = await getCustomerOrders(
                    selectedCustomer.id_customer,
                    controller.signal
                );

                if (controller.signal.aborted) return;

                setOrders(result);
                setOrderState("success");
            } catch (error) {
                if (controller.signal.aborted) return;

                if (!handleApiError(error)) {
                    setOrderError(getErrorMessage(error));
                    setOrderState("error");
                }
            }
        };

        void loadOrders();

        return () => controller.abort();
    }, [
        detailOpen,
        selectedCustomer,
        detailTab,
        handleApiError,
    ]);

    const refreshData = () => {
        setRefreshKey((value) => value + 1);
        setNotice(null);
    };

    const renderDetailModal = () => {
        if (!detailOpen || !selectedCustomer) {
            return null;
        }

        const customer = selectedCustomer;

        const sortedOrders = [...orders].sort(
            (a, b) =>
                new Date(b.booking_at).getTime() -
                new Date(a.booking_at).getTime()
        );

        return (
            <Modal
                title="Detail Akun Pasien"
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
                {/* CUSTOMER HEADER */}
                <div className="mb-5 flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0866D8]">
                        <UserRound size={29} />
                    </div>

                    <div className="min-w-0 flex-1">
                        <h3 className="wrap-break-word text-lg font-bold text-slate-950">
                            {customer.name_customer || "Tanpa Nama"}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                            ID Pasien: {customer.id_customer}
                        </p>

                        <div className="mt-2">
                            <CustomerStatusBadge
                                status={customer.status_customer}
                            />
                        </div>
                    </div>
                </div>

                {/* TABS */}
                <div className="mb-5 flex gap-2 border-b border-slate-100">
                    <button
                        type="button"
                        onClick={() => setDetailTab("profile")}
                        className={`cursor-pointer border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${detailTab === "profile"
                            ? "border-[#0866D8] text-[#0866D8]"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                            }`}
                    >
                        Profil Pasien
                    </button>

                    <button
                        type="button"
                        onClick={() => setDetailTab("orders")}
                        className={`cursor-pointer border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${detailTab === "orders"
                            ? "border-[#0866D8] text-[#0866D8]"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                            }`}
                    >
                        Riwayat Pesanan
                    </button>
                </div>

                {/* PROFILE TAB */}
                {detailTab === "profile" && (
                    <div className="space-y-6">
                        <section>
                            <h4 className="mb-4 text-sm font-bold text-[#00357A]">
                                Informasi Pribadi
                            </h4>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <DetailField
                                    label="Nama Lengkap"
                                    value={customer.name_customer}
                                />

                                <DetailField
                                    label="Jenis Kelamin"
                                    value={genderLabel(
                                        customer.gender_customer
                                    )}
                                />

                                <DetailField
                                    label="Tanggal Lahir"
                                    value={formatDate(
                                        customer.dob_customer
                                    )}
                                />

                                <DetailField
                                    label="Status Akun"
                                    value={customer.status_customer}
                                />
                            </div>
                        </section>

                        <section className="border-t border-slate-100 pt-5">
                            <h4 className="mb-4 text-sm font-bold text-[#00357A]">
                                Informasi Kontak
                            </h4>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <div>
                                    <div className="mb-1 flex items-center gap-1.5 text-xs text-[#526789]">
                                        <Mail size={14} />
                                        Email
                                    </div>

                                    <p className="break-all text-sm font-medium text-slate-900">
                                        {customer.email_customer || "—"}
                                    </p>
                                </div>

                                <div>
                                    <div className="mb-1 flex items-center gap-1.5 text-xs text-[#526789]">
                                        <Phone size={14} />
                                        Nomor Telepon
                                    </div>

                                    <p className="wrap-break-word text-sm font-medium text-slate-900">
                                        {customer.phone_number_customer || "—"}
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section className="border-t border-slate-100 pt-5">
                            <h4 className="mb-4 text-sm font-bold text-[#00357A]">
                                Informasi Akun
                            </h4>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <DetailField
                                    label="ID Customer"
                                    value={customer.id_customer}
                                />

                                <DetailField
                                    label="ID Platform"
                                    value={customer.id_platform}
                                />
                            </div>
                        </section>
                    </div>
                )}

                {/* ORDERS TAB */}
                {detailTab === "orders" && (
                    <section>
                        {orderState === "loading" ? (
                            <LoadingState label="Memuat riwayat pesanan..." />
                        ) : orderState === "error" ? (
                            <div
                                role="alert"
                                className="flex items-start gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700"
                            >
                                <AlertCircle
                                    size={18}
                                    className="shrink-0"
                                />

                                <span>{orderError}</span>
                            </div>
                        ) : sortedOrders.length === 0 ? (
                            <div className="flex min-h-44 flex-col items-center justify-center gap-2 text-center">
                                <ShoppingBag
                                    size={30}
                                    className="text-slate-300"
                                />

                                <p className="text-sm text-slate-500">
                                    Belum ada riwayat pesanan.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                    <ClipboardList size={17} />
                                    {sortedOrders.length} Pesanan
                                </div>

                                {sortedOrders.map((order) => (
                                    <div
                                        key={order.id_order}
                                        className="rounded-xl border border-[#DBE4F0] p-4"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-xs text-slate-500">
                                                    ID Pesanan
                                                </p>

                                                <p className="mt-1 break-all text-xs font-semibold text-slate-900">
                                                    {order.id_order}
                                                </p>
                                            </div>

                                            <OrderStatusBadge
                                                status={order.order_status}
                                            />
                                        </div>

                                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                            <DetailField
                                                label="ID Layanan"
                                                value={order.id_service}
                                            />

                                            <DetailField
                                                label="Total Pembayaran"
                                                value={formatCurrency(order.total)}
                                            />

                                            <DetailField
                                                label="Metode Pembayaran"
                                                value={order.payment_method}
                                            />

                                            <div>
                                                <p className="mb-1 text-xs text-[#526789]">
                                                    Status Pembayaran
                                                </p>

                                                <OrderStatusBadge
                                                    status={order.payment_status}
                                                />
                                            </div>

                                            <DetailField
                                                label="Jadwal Booking"
                                                value={formatDateTime(
                                                    order.booking_at
                                                )}
                                            />

                                            <DetailField
                                                label="Tanggal Pembayaran"
                                                value={formatDateTime(
                                                    order.paid_at
                                                )}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}
            </Modal>
        );
    };

    return (
        <div className="min-h-full p-4 sm:p-6 lg:p-8">
            {/* HEADER */}
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="mb-1 text-xs text-[#344F77]">
                        Manajemen Pasien / Akun Pasien
                    </p>

                    <h1 className="text-2xl font-bold text-slate-950 sm:text-[28px]">
                        Akun Pasien
                    </h1>

                    <p className="mt-2 text-sm text-[#526789]">
                        Pantau akun pasien dan riwayat pesanan.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={refreshData}
                    disabled={loading}
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
                    >
                        <X size={17} />
                    </button>
                </div>
            )}

            {/* SUMMARY CARDS */}
            <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
                {[
                    {
                        label: "Total Pasien",
                        value: totalCustomers,
                        icon: <Users size={19} />,
                    },
                    {
                        label: "Active",
                        value: activeCount,
                        icon: <CheckCircle2 size={19} />,
                    },
                    {
                        label: "Not Active",
                        value: inactiveCount,
                        icon: <Clock3 size={19} />,
                    },
                    {
                        label: "Platform Terkait",
                        value: platformCount,
                        icon: <ClipboardList size={19} />,
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

            {/* CUSTOMER TABLE */}
            <section className="overflow-hidden rounded-2xl border border-[#DBE4F0] bg-white shadow-sm">
                {/* TABLE FILTERS */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
                    <div>
                        <h2 className="text-sm font-bold text-slate-950">
                            Daftar Akun Pasien
                        </h2>

                        <p className="mt-1 text-xs text-[#526789]">
                            {loading
                                ? "Memuat..."
                                : `${filteredCustomers.length} pasien`}
                        </p>
                    </div>

                    <div className="flex w-full flex-wrap gap-2 lg:w-auto">
                        {/* SEARCH */}
                        <div className="relative min-w-47.5 flex-1 lg:w-60">
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
                                placeholder="Cari pasien..."
                                className={`${inputClass} pl-10`}
                            />
                        </div>

                        {/* STATUS FILTER */}
                        <select
                            value={statusFilter}
                            onChange={(event) => {
                                setStatusFilter(event.target.value);
                                setPage(1);
                            }}
                            aria-label="Filter status akun"
                            className="rounded-lg border border-[#DBE4F0] bg-white px-3 py-2.5 text-sm text-slate-700"
                        >
                            <option value="ALL">Semua Status</option>
                            <option value="ACTIVE">Active</option>
                            <option value="NOT_ACTIVE">Not Active</option>
                        </select>

                        {/* GENDER FILTER */}
                        <select
                            value={genderFilter}
                            onChange={(event) => {
                                setGenderFilter(event.target.value);
                                setPage(1);
                            }}
                            aria-label="Filter jenis kelamin"
                            className="rounded-lg border border-[#DBE4F0] bg-white px-3 py-2.5 text-sm text-slate-700"
                        >
                            <option value="ALL">Semua Gender</option>
                            <option value="male">Laki-laki</option>
                            <option value="female">Perempuan</option>
                        </select>
                    </div>
                </div>

                {/* TABLE CONTENT */}
                {loading ? (
                    <LoadingState />
                ) : listError ? (
                    <div className="p-5 text-sm text-red-600">
                        {listError}
                    </div>
                ) : filteredCustomers.length === 0 ? (
                    <EmptyState message="Akun pasien tidak ditemukan." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead className="bg-[#F5F8FC]">
                                <tr>
                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        No.
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        Pasien
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        Nomor Telepon
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        Jenis Kelamin
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        Tanggal Lahir
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
                                {displayedCustomers.map(
                                    (customer, index) => (
                                        <tr
                                            key={customer.id_customer}
                                            className="border-t border-slate-100 hover:bg-slate-50"
                                        >
                                            {/* NUMBER */}
                                            <td className="px-5 py-4 text-slate-500">
                                                {(currentPage - 1) *
                                                    PAGE_SIZE +
                                                    index +
                                                    1}
                                            </td>

                                            {/* CUSTOMER */}
                                            <td className="px-5 py-4">
                                                <div className="flex min-w-50 items-center gap-3">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#0866D8]">
                                                        <UserRound size={20} />
                                                    </div>

                                                    <div className="min-w-0">
                                                        <p className="max-w-56 truncate font-semibold text-slate-950">
                                                            {customer.name_customer ||
                                                                "Tanpa Nama"}
                                                        </p>

                                                        <p className="mt-1 max-w-56 truncate text-xs text-slate-500">
                                                            {customer.email_customer ||
                                                                `ID: ${customer.id_customer}`}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* PHONE */}
                                            <td className="px-5 py-4 text-slate-600">
                                                {customer.phone_number_customer ||
                                                    "—"}
                                            </td>

                                            {/* GENDER */}
                                            <td className="px-5 py-4 text-slate-600">
                                                {genderLabel(
                                                    customer.gender_customer
                                                )}
                                            </td>

                                            {/* DOB */}
                                            <td className="px-5 py-4 text-slate-600">
                                                <div className="flex items-center gap-2">
                                                    <CalendarDays
                                                        size={15}
                                                        className="shrink-0 text-slate-400"
                                                    />

                                                    {formatDate(
                                                        customer.dob_customer
                                                    )}
                                                </div>
                                            </td>

                                            {/* STATUS */}
                                            <td className="px-5 py-4 text-center">
                                                <CustomerStatusBadge
                                                    status={
                                                        customer.status_customer
                                                    }
                                                />
                                            </td>

                                            {/* ACTION */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openDetail(customer)
                                                        }
                                                        title="Detail Akun Pasien"
                                                        aria-label={`Detail ${customer.name_customer}`}
                                                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-blue-50 text-[#0866D8] hover:bg-blue-100"
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
                    filteredCustomers.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
                            <p className="text-xs text-[#526789]">
                                Menampilkan{" "}
                                {(currentPage - 1) * PAGE_SIZE + 1}–
                                {Math.min(
                                    currentPage * PAGE_SIZE,
                                    filteredCustomers.length
                                )}{" "}
                                dari {filteredCustomers.length}
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

            {/* DETAIL MODAL */}
            {renderDetailModal()}
        </div>
    );
};

export default CustomerAccount;
