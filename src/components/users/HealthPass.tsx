import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

import {
    Activity,
    AlertCircle,
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Eye,
    LoaderCircle,
    RefreshCw,
    Search,
    ShieldCheck,
    Ticket,
    UserRound,
    X,
} from "lucide-react";

type ApiRecord = Record<string, unknown>;

interface HealthPassData {
    id_health_pass: string;
    id_order: string;

    id_customer: number | null;
    id_guest: number | null;
    id_service: number | null;
    id_provider: number | null;

    status_health_pass: string;
    payment_status: string;
    order_status: string;

    valid_from: string | null;
    valid_until: string | null;
    booking_at: string | null;

    redeemed_at: string | null;
    redeemed_by: string | null;

    finished_at: string | null;
    finished_by: string | null;

    recipient_type: string;
    recipient_name: string;
    recipient_email: string;
    recipient_phone: string;

    name_service: string;
    price_service: number | null;
    description_service: string;
    image_service: string;

    name_provider: string;
}

interface ProviderOption {
    id_provider: number;
    name_provider: string;
}

interface ProviderUserData {
    id_provider_user: number;
    id_provider: number;
    name_provider_user: string;
}

interface ModalProps {
    title: string;
    children: ReactNode;
    onClose: () => void;
}

const PAGE_SIZE = 10;

const secondaryButton =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#DBE4F0] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

const inputClass =
    "rounded-lg border border-[#DBE4F0] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0866D8]";

const isRecord = (
    value: unknown
): value is ApiRecord => {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
};

const toText = (value: unknown): string => {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value);
};

const toOptionalText = (
    value: unknown
): string | null => {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    return String(value);
};

const toId = (
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

    return Number.isSafeInteger(parsed) &&
        parsed > 0
        ? parsed
        : null;
};

const toMoney = (
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

    return Number.isFinite(parsed)
        ? parsed
        : null;
};

const normalizeStatus = (
    value: unknown
): string => {
    return (
        toText(value).trim().toUpperCase() ||
        "UNKNOWN"
    );
};

const formatMoney = (
    value: number | null
): string => {
    if (value === null) {
        return "—";
    }

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(value);
};

const formatDate = (
    value: string | null
): string => {
    if (!value) {
        return "—";
    }

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
        hourCycle: "h23",
        timeZone: "Asia/Jakarta",
    }).format(date);
};

const getImageUrl = (
    value: string
): string | null => {
    if (!value.trim()) {
        return null;
    }

    try {
        const url = new URL(
            value,
            `${import.meta.env.VITE_API_URI}/`
        );

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

const getAdminToken = (): string | null => {
    return (
        sessionStorage.getItem("admin_token") ||
        localStorage.getItem("admin_token")
    );
};

const normalizeHealthPass = (
    row: ApiRecord
): HealthPassData | null => {
    const healthPassId = toText(
        row.id_health_pass
    ).trim();

    if (!healthPassId) {
        return null;
    }

    const guestId = toId(row.id_guest);
    const customerId = toId(row.id_customer);

    const recipientType = normalizeStatus(
        row.recipient_type ??
        (guestId !== null
            ? "GUEST"
            : customerId !== null
                ? "CUSTOMER"
                : "UNKNOWN")
    );

    return {
        id_health_pass: healthPassId,
        id_order: toText(row.id_order),

        id_customer: customerId,
        id_guest: guestId,
        id_service: toId(row.id_service),
        id_provider: toId(row.id_provider),

        status_health_pass: normalizeStatus(
            row.status_health_pass
        ),

        payment_status: normalizeStatus(
            row.payment_status
        ),

        order_status: normalizeStatus(
            row.order_status
        ),

        valid_from: toOptionalText(
            row.valid_from
        ),

        valid_until: toOptionalText(
            row.valid_until
        ),

        booking_at: toOptionalText(
            row.booking_at
        ),

        redeemed_at: toOptionalText(
            row.redeemed_at
        ),

        redeemed_by: toOptionalText(
            row.redeemed_by
        ),

        finished_at: toOptionalText(
            row.finished_at
        ),

        finished_by: toOptionalText(
            row.finished_by
        ),

        recipient_type: recipientType,

        recipient_name:
            toText(row.recipient_name) ||
            toText(row.name_customer) ||
            toText(row.name_guest),

        recipient_email:
            toText(row.recipient_email) ||
            toText(row.email_customer) ||
            toText(row.email_guest),

        recipient_phone:
            toText(row.recipient_phone) ||
            toText(row.phone_number_customer) ||
            toText(row.phone_number_guest),

        name_service: toText(
            row.name_service
        ),

        price_service: toMoney(
            row.price_service
        ),

        description_service: toText(
            row.description_service
        ),

        image_service: toText(
            row.image_service
        ),

        name_provider: toText(
            row.name_provider
        ),
    };
};

const apiRequest = async (
    endpoint: string,
    signal?: AbortSignal
): Promise<unknown> => {
    const token = getAdminToken();

    if (!token) {
        throw new Error(
            "Token Admin tidak tersedia. Silakan login kembali."
        );
    }

    if (!import.meta.env.VITE_API_URI) {
        throw new Error(
            "VITE_API_URI belum dikonfigurasi."
        );
    }

    const response = await fetch(
        `${import.meta.env.VITE_API_URI}${endpoint}`,
        {
            method: "GET",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
            signal,
        }
    );

    const result: unknown = await response
        .json()
        .catch(() => null);

    if (
        !response.ok ||
        (isRecord(result) &&
            result.success === false)
    ) {
        const message =
            isRecord(result) &&
                typeof result.message === "string"
                ? result.message
                : `Request gagal (HTTP ${response.status}).`;

        throw new Error(message);
    }

    return result;
};

const getAllHealthPassesAdmin = async (
    signal?: AbortSignal
): Promise<HealthPassData[]> => {
    const response = await apiRequest(
        "/health-passes/admin/get-all",
        signal
    );

    if (
        !isRecord(response) ||
        !Array.isArray(response.data)
    ) {
        throw new Error(
            "Format response Health Pass tidak valid."
        );
    }

    return response.data
        .filter(isRecord)
        .map(normalizeHealthPass)
        .filter(
            (pass): pass is HealthPassData =>
                pass !== null
        );
};

const getProviderUsersByProvider = async (
    providerId: number,
    signal?: AbortSignal
): Promise<ProviderUserData[]> => {
    const response = await apiRequest(
        `/provider-user/provider/${providerId}`,
        signal
    );

    if (!isRecord(response)) {
        throw new Error(
            "Format response Provider User tidak valid."
        );
    }

    // Mengikuti response Provider Dashboard:
    // { provider_users: [...] }

    const usersData = Array.isArray(
        response.provider_users
    )
        ? response.provider_users
        : isRecord(response.data) &&
            Array.isArray(response.data.provider_users)
            ? response.data.provider_users
            : Array.isArray(response.data)
                ? response.data
                : null;

    if (!usersData) {
        throw new Error(
            "Daftar Provider User tidak ditemukan pada response."
        );
    }

    return usersData
        .filter(isRecord)
        .map((user): ProviderUserData | null => {
            const userId = toId(
                user.id_provider_user
            );

            const userName = toText(
                user.name_provider_user
            ).trim();

            // Menggunakan providerId dari endpoint
            // apabila response tidak memilikinya.

            const userProviderId = toId(
                user.id_provider
            ) ?? providerId;

            if (
                userId === null ||
                !userName ||
                userProviderId !== providerId
            ) {
                return null;
            }

            return {
                id_provider_user: userId,
                id_provider: userProviderId,
                name_provider_user: userName,
            };
        })
        .filter(
            (user): user is ProviderUserData =>
                user !== null
        );
};

const StatusBadge = ({
    status,
}: {
    status: string;
}) => {
    const normalized = normalizeStatus(status);

    const styles: Record<string, string> = {
        ACTIVE:
            "bg-blue-50 text-blue-700",

        REDEEMED:
            "bg-amber-50 text-amber-700",

        FINISHED:
            "bg-emerald-50 text-emerald-700",

        EXPIRED:
            "bg-orange-50 text-orange-700",

        CANCELLED:
            "bg-red-50 text-red-700",

        CANCELED:
            "bg-red-50 text-red-700",
    };

    const style =
        styles[normalized] ||
        "bg-slate-100 text-slate-600";

    return (
        <span
            className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold ${style}`}
        >
            {normalized}
        </span>
    );
};

const DetailField = ({
    label,
    value,
}: {
    label: string;
    value: ReactNode;
}) => {
    return (
        <div className="min-w-0">
            <p className="text-xs text-[#526789]">
                {label}
            </p>

            <div className="mt-1 wrap-break-word text-sm font-medium text-slate-900">
                {value === null ||
                    value === undefined ||
                    value === ""
                    ? "—"
                    : value}
            </div>
        </div>
    );
};

const Modal = ({
    title,
    children,
    onClose,
}: ModalProps) => {
    useEffect(() => {
        const onEscape = (
            event: KeyboardEvent
        ) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener(
            "keydown",
            onEscape
        );

        return () => {
            window.removeEventListener(
                "keydown",
                onEscape
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
                className="flex h-[min(720px,90dvh)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
                    <h2 className="text-lg font-bold text-slate-950">
                        {title}
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Tutup modal"
                        className="cursor-pointer rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                    >
                        <X size={19} />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-5">
                    {children}
                </div>

                <div className="flex shrink-0 justify-end border-t border-slate-100 p-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className={secondaryButton}
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
};

const HealthPass = () => {
    const [passes, setPasses] = useState<
        HealthPassData[]
    >([]);

    const [providerUsers, setProviderUsers] =
        useState<ProviderUserData[]>([]);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");

    const [refreshKey, setRefreshKey] = useState(0);

    const [search, setSearch] = useState("");

    const [statusFilter, setStatusFilter] =
        useState("ALL");

    const [providerFilter, setProviderFilter] =
        useState("ALL");

    const [page, setPage] = useState(1);

    const [selectedPassId, setSelectedPassId] =
        useState<string | null>(null);

    const closeModal = useCallback(() => {
        setSelectedPassId(null);
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        const loadData = async () => {
            setLoading(true);
            setError("");
            setProviderUsers([]);

            try {
                // STEP 1: GET ALL HEALTH PASSES

                const result =
                    await getAllHealthPassesAdmin(
                        controller.signal
                    );

                if (controller.signal.aborted) {
                    return;
                }

                // Remove duplicate Health Pass.

                const unique = new Map<
                    string,
                    HealthPassData
                >();

                result.forEach((pass) => {
                    unique.set(
                        pass.id_health_pass,
                        pass
                    );
                });

                const uniquePasses = Array.from(
                    unique.values()
                );

                setPasses(uniquePasses);

                // STEP 2: GET UNIQUE PROVIDER IDS

                const providerIds = Array.from(
                    new Set(
                        uniquePasses
                            .map((pass) => pass.id_provider)
                            .filter(
                                (id): id is number =>
                                    id !== null
                            )
                    )
                );

                // STEP 3: GET PROVIDER USERS
                // Satu request untuk setiap provider.
                // Jika salah satu request gagal,
                // Health Pass tetap ditampilkan.

                const userResults =
                    await Promise.allSettled(
                        providerIds.map((providerId) =>
                            getProviderUsersByProvider(
                                providerId,
                                controller.signal
                            )
                        )
                    );

                if (controller.signal.aborted) {
                    return;
                }

                const allUsers: ProviderUserData[] = [];

                userResults.forEach((result, index) => {
                    if (result.status === "fulfilled") {
                        allUsers.push(...result.value);
                    } else {
                        console.warn(
                            `[ADMIN HEALTH PASS] Gagal mengambil Provider User untuk provider ${providerIds[index]}`,
                            result.reason
                        );
                    }
                });

                // Remove duplicate users using
                // provider ID + provider user ID.

                const uniqueUsers = new Map<
                    string,
                    ProviderUserData
                >();

                allUsers.forEach((user) => {
                    const key =
                        `${user.id_provider}:${user.id_provider_user}`;

                    uniqueUsers.set(key, user);
                });

                setProviderUsers(
                    Array.from(uniqueUsers.values())
                );
            } catch (fetchError) {
                if (controller.signal.aborted) {
                    return;
                }

                console.error(
                    "[ADMIN HEALTH PASS ERROR]",
                    fetchError
                );

                setPasses([]);
                setProviderUsers([]);

                setError(
                    fetchError instanceof Error
                        ? fetchError.message
                        : "Gagal mengambil Health Pass."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        void loadData();

        return () => {
            controller.abort();
        };
    }, [refreshKey]);

    const getProviderUserName = useCallback(
        (
            providerId: number | null,
            providerUserId: string | null
        ): string => {
            if (
                !providerUserId ||
                providerUserId.trim() === ""
            ) {
                return "—";
            }

            if (providerId === null) {
                return `Provider User #${providerUserId}`;
            }

            const user = providerUsers.find(
                (item) =>
                    item.id_provider === providerId &&
                    String(item.id_provider_user) ===
                    String(providerUserId)
            );

            return (
                user?.name_provider_user ||
                `Provider User #${providerUserId}`
            );
        },
        [providerUsers]
    );

    const providers = useMemo<
        ProviderOption[]
    >(() => {
        const providerMap = new Map<
            number,
            ProviderOption
        >();

        passes.forEach((pass) => {
            if (pass.id_provider === null) {
                return;
            }

            providerMap.set(
                pass.id_provider,
                {
                    id_provider: pass.id_provider,
                    name_provider:
                        pass.name_provider ||
                        `Provider #${pass.id_provider}`,
                }
            );
        });

        return Array.from(
            providerMap.values()
        ).sort((a, b) =>
            a.name_provider.localeCompare(
                b.name_provider,
                "id"
            )
        );
    }, [passes]);

    const statusOptions = useMemo(() => {
        const statuses = new Set([
            "ACTIVE",
            "REDEEMED",
            "FINISHED",
            "EXPIRED",
            ...passes.map(
                (pass) => pass.status_health_pass
            ),
        ]);

        return Array.from(statuses).sort();
    }, [passes]);

    const filteredPasses = useMemo(() => {
        const keyword = search
            .trim()
            .toLowerCase();

        return passes.filter((pass) => {
            const redeemedByName =
                getProviderUserName(
                    pass.id_provider,
                    pass.redeemed_by
                );

            const finishedByName =
                getProviderUserName(
                    pass.id_provider,
                    pass.finished_by
                );

            const searchFields = [
                pass.id_health_pass,
                pass.id_order,
                pass.recipient_name,
                pass.recipient_email,
                pass.recipient_phone,
                pass.name_provider,
                pass.name_service,
                pass.status_health_pass,
                redeemedByName,
                finishedByName,
            ];

            const searchable = searchFields
                .join(" ")
                .toLowerCase();

            const matchesSearch =
                !keyword ||
                searchable.includes(keyword);

            const matchesStatus =
                statusFilter === "ALL" ||
                pass.status_health_pass ===
                statusFilter;

            const matchesProvider =
                providerFilter === "ALL" ||
                String(pass.id_provider) ===
                providerFilter;

            return (
                matchesSearch &&
                matchesStatus &&
                matchesProvider
            );
        });
    }, [
        passes,
        search,
        statusFilter,
        providerFilter,
        getProviderUserName,
    ]);

    const totalPages = Math.max(
        1,
        Math.ceil(
            filteredPasses.length / PAGE_SIZE
        )
    );

    const currentPage = Math.min(
        page,
        totalPages
    );

    const displayedPasses =
        filteredPasses.slice(
            (currentPage - 1) * PAGE_SIZE,
            currentPage * PAGE_SIZE
        );

    const selectedPass =
        passes.find(
            (pass) =>
                pass.id_health_pass ===
                selectedPassId
        ) || null;

    const countByStatus = (
        status: string
    ): number => {
        return passes.filter(
            (pass) =>
                pass.status_health_pass === status
        ).length;
    };

    const summaryCards = [
        {
            label: "Total Health Pass",
            value: passes.length,
            icon: Ticket,
        },
        {
            label: "Active",
            value: countByStatus("ACTIVE"),
            icon: ShieldCheck,
        },
        {
            label: "Redeemed",
            value: countByStatus("REDEEMED"),
            icon: Clock3,
        },
        {
            label: "Finished",
            value: countByStatus("FINISHED"),
            icon: CheckCircle2,
        },
        {
            label: "Expired",
            value: countByStatus("EXPIRED"),
            icon: Activity,
        },
    ];

    const handleRefresh = () => {
        setPage(1);
        setSelectedPassId(null);

        setRefreshKey(
            (previous) => previous + 1
        );
    };

    const handleSearchChange = (
        value: string
    ) => {
        setSearch(value);
        setPage(1);
    };

    const handleStatusChange = (
        value: string
    ) => {
        setStatusFilter(value);
        setPage(1);
    };

    const handleProviderChange = (
        value: string
    ) => {
        setProviderFilter(value);
        setPage(1);
    };

    return (
        <div className="min-h-full p-4 sm:p-6 lg:p-8">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="mb-1 text-xs text-[#344F77]">
                        Aplikasi Pasien / Health Pass
                    </p>

                    <h1 className="text-2xl font-bold text-slate-950 sm:text-[28px]">
                        Health Pass
                    </h1>

                    <p className="mt-2 text-sm text-[#526789]">
                        Monitoring Health Pass dan penyelesaian
                        treatment dari berbagai provider.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={loading}
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

            {error && (
                <div
                    role="alert"
                    className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                    <AlertCircle
                        size={18}
                        className="shrink-0"
                    />

                    <div>
                        <p className="font-semibold">
                            Gagal memuat Health Pass
                        </p>

                        <p className="mt-1">
                            {error}
                        </p>

                        <p className="mt-2 text-xs">
                            Periksa endpoint Admin, token,
                            dan hak akses akun internal.
                        </p>
                    </div>
                </div>
            )}

            <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
                {summaryCards.map((card) => {
                    const Icon = card.icon;

                    return (
                        <div
                            key={card.label}
                            className="rounded-2xl border border-[#DBE4F0] bg-white p-5 shadow-sm"
                        >
                            <div className="mb-3 flex items-center gap-2 text-[#526789]">
                                <Icon size={19} />

                                <span className="text-xs font-semibold">
                                    {card.label}
                                </span>
                            </div>

                            <p className="text-3xl font-bold text-slate-950">
                                {loading || error
                                    ? "—"
                                    : card.value}
                            </p>
                        </div>
                    );
                })}
            </div>

            <section className="overflow-hidden rounded-2xl border border-[#DBE4F0] bg-white shadow-sm">
                {/* FILTER HEADER */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
                    <div>
                        <h2 className="text-sm font-bold text-slate-950">
                            Daftar Health Pass
                        </h2>

                        <p className="mt-1 text-xs text-[#526789]">
                            {loading
                                ? "Memuat..."
                                : error
                                    ? "Data tidak tersedia"
                                    : `${filteredPasses.length} Health Pass`}
                        </p>
                    </div>

                    <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 xl:w-auto xl:grid-cols-[240px_170px_160px]">
                        {/* SEARCH */}
                        <div className="relative min-w-0">
                            <Search
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />

                            <input
                                type="search"
                                value={search}
                                onChange={(event) =>
                                    handleSearchChange(
                                        event.target.value
                                    )
                                }
                                placeholder="Cari Health Pass..."
                                className={`${inputClass} w-full pl-10`}
                            />
                        </div>

                        {/* PROVIDER FILTER */}
                        <select
                            aria-label="Filter provider"
                            className={`${inputClass} w-full min-w-0`}
                            value={providerFilter}
                            onChange={(event) =>
                                handleProviderChange(
                                    event.target.value
                                )
                            }
                        >
                            <option value="ALL">
                                Semua Provider
                            </option>

                            {providers.map((provider) => (
                                <option
                                    key={provider.id_provider}
                                    value={provider.id_provider}
                                >
                                    {provider.name_provider}
                                </option>
                            ))}
                        </select>

                        {/* STATUS FILTER */}
                        <select
                            aria-label="Filter status"
                            className={`${inputClass} w-full min-w-0`}
                            value={statusFilter}
                            onChange={(event) =>
                                handleStatusChange(
                                    event.target.value
                                )
                            }
                        >
                            <option value="ALL">
                                Semua Status
                            </option>

                            {statusOptions.map((status) => (
                                <option
                                    key={status}
                                    value={status}
                                >
                                    {status}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* LOADING */}
                {loading ? (
                    <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500">
                        <LoaderCircle
                            size={19}
                            className="animate-spin text-[#0866D8]"
                        />

                        Memuat seluruh Health Pass...
                    </div>
                ) : error ? (
                    /* ERROR STATE */
                    <div className="flex min-h-48 flex-col items-center justify-center gap-3 p-6 text-center">
                        <AlertCircle
                            size={28}
                            className="text-red-400"
                        />

                        <p className="text-sm text-red-600">
                            Data Health Pass tidak dapat ditampilkan.
                        </p>

                        <button
                            type="button"
                            onClick={handleRefresh}
                            className={secondaryButton}
                        >
                            <RefreshCw size={16} />
                            Coba Lagi
                        </button>
                    </div>
                ) : displayedPasses.length === 0 ? (
                    /* EMPTY STATE */
                    <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-slate-400">
                        <Activity size={30} />

                        <p className="text-sm">
                            Health Pass tidak ditemukan.
                        </p>
                    </div>
                ) : (
                    /* TABLE */
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead className="bg-[#F5F8FC]">
                                <tr>
                                    {[
                                        "No.",
                                        "Health Pass",
                                        "Penerima",
                                        "Provider",
                                        "Layanan",
                                        "Booking",
                                        "Status",
                                        "Aksi",
                                    ].map((header) => (
                                        <th
                                            key={header}
                                            className="px-5 py-3 text-xs font-semibold text-[#344F77]"
                                        >
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {displayedPasses.map(
                                    (pass, index) => (
                                        <tr
                                            key={pass.id_health_pass}
                                            className="border-t border-slate-100 hover:bg-slate-50"
                                        >
                                            {/* NUMBER */}
                                            <td className="px-5 py-4 text-slate-500">
                                                {(currentPage - 1) *
                                                    PAGE_SIZE +
                                                    index +
                                                    1}
                                            </td>

                                            {/* HEALTH PASS */}
                                            <td className="px-5 py-4">
                                                <p
                                                    title={pass.id_health_pass}
                                                    className="max-w-48 truncate font-semibold text-slate-900"
                                                >
                                                    {pass.id_health_pass}
                                                </p>

                                                <p
                                                    title={pass.id_order}
                                                    className="mt-1 max-w-48 truncate text-xs text-slate-500"
                                                >
                                                    Order: {pass.id_order}
                                                </p>
                                            </td>

                                            {/* RECIPIENT */}
                                            <td className="px-5 py-4">
                                                <p className="font-semibold text-slate-900">
                                                    {pass.recipient_name ||
                                                        "—"}
                                                </p>

                                                <p className="mt-1 text-[11px] text-slate-500">
                                                    {pass.recipient_type ===
                                                        "GUEST"
                                                        ? "Guest"
                                                        : pass.recipient_type ===
                                                            "CUSTOMER"
                                                            ? "Customer"
                                                            : "Penerima"}
                                                </p>
                                            </td>

                                            {/* PROVIDER */}
                                            <td className="px-5 py-4 text-slate-700">
                                                {pass.name_provider || "—"}
                                            </td>

                                            {/* SERVICE */}
                                            <td className="px-5 py-4 text-slate-700">
                                                <p className="max-w-48 truncate">
                                                    {pass.name_service || "—"}
                                                </p>
                                            </td>

                                            {/* BOOKING */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2 whitespace-nowrap text-xs text-slate-600">
                                                    <CalendarDays size={15} />

                                                    {formatDate(
                                                        pass.booking_at
                                                    )}
                                                </div>
                                            </td>

                                            {/* STATUS */}
                                            <td className="px-5 py-4">
                                                <StatusBadge
                                                    status={
                                                        pass.status_health_pass
                                                    }
                                                />
                                            </td>

                                            {/* ACTION */}
                                            <td className="px-5 py-4 text-right">
                                                <button
                                                    type="button"
                                                    title="Lihat Detail"
                                                    aria-label={`Detail Health Pass ${pass.id_health_pass}`}
                                                    onClick={() =>
                                                        setSelectedPassId(
                                                            pass.id_health_pass
                                                        )
                                                    }
                                                    className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-blue-50 text-[#0866D8] hover:bg-blue-100"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading &&
                    !error &&
                    filteredPasses.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
                            <p className="text-xs text-[#526789]">
                                Menampilkan{" "}
                                {(currentPage - 1) *
                                    PAGE_SIZE +
                                    1}
                                {" – "}
                                {Math.min(
                                    currentPage * PAGE_SIZE,
                                    filteredPasses.length
                                )}{" "}
                                dari {filteredPasses.length}
                            </p>

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    disabled={
                                        currentPage === 1
                                    }
                                    onClick={() =>
                                        setPage((previous) =>
                                            Math.max(
                                                1,
                                                previous - 1
                                            )
                                        )
                                    }
                                    className="cursor-pointer rounded-lg border border-[#DBE4F0] p-2 disabled:opacity-40"
                                    aria-label="Halaman sebelumnya"
                                >
                                    <ChevronLeft size={17} />
                                </button>

                                <span className="text-xs font-semibold">
                                    {currentPage} /{" "}
                                    {totalPages}
                                </span>

                                <button
                                    type="button"
                                    disabled={
                                        currentPage >=
                                        totalPages
                                    }
                                    onClick={() =>
                                        setPage((previous) =>
                                            Math.min(
                                                totalPages,
                                                previous + 1
                                            )
                                        )
                                    }
                                    className="cursor-pointer rounded-lg border border-[#DBE4F0] p-2 disabled:opacity-40"
                                    aria-label="Halaman berikutnya"
                                >
                                    <ChevronRight size={17} />
                                </button>
                            </div>
                        </div>
                    )}
            </section>

            {selectedPass && (
                <Modal
                    title="Detail Health Pass"
                    onClose={closeModal}
                >
                    <div className="space-y-6">
                        {/* DETAIL HEADER */}
                        <div className="rounded-xl bg-[#F5F8FC] p-4">
                            <p className="text-xs text-[#526789]">
                                Health Pass ID
                            </p>

                            <p className="mt-2 break-all text-sm font-bold text-[#00357A]">
                                {selectedPass.id_health_pass}
                            </p>

                            <div className="mt-3">
                                <StatusBadge
                                    status={
                                        selectedPass.status_health_pass
                                    }
                                />
                            </div>
                        </div>

                        <section>
                            <h3 className="mb-4 text-sm font-bold text-[#00357A]">
                                Informasi Health Pass
                            </h3>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <DetailField
                                    label="Order ID"
                                    value={selectedPass.id_order}
                                />

                                <DetailField
                                    label="Status"
                                    value={
                                        selectedPass.status_health_pass
                                    }
                                />

                                <DetailField
                                    label="Provider"
                                    value={
                                        selectedPass.name_provider
                                    }
                                />

                                <DetailField
                                    label="Layanan"
                                    value={
                                        selectedPass.name_service
                                    }
                                />

                                <DetailField
                                    label="Booking"
                                    value={formatDate(
                                        selectedPass.booking_at
                                    )}
                                />

                                <DetailField
                                    label="Berlaku Mulai"
                                    value={formatDate(
                                        selectedPass.valid_from
                                    )}
                                />

                                <DetailField
                                    label="Berlaku Sampai"
                                    value={formatDate(
                                        selectedPass.valid_until
                                    )}
                                />
                            </div>
                        </section>

                        {selectedPass.redeemed_at && (
                            <section className="border-t border-slate-100 pt-5">
                                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#00357A]">
                                    <ShieldCheck size={18} />
                                    Informasi Redemption
                                </h3>

                                <div className="grid gap-4 rounded-xl bg-blue-50 p-4 sm:grid-cols-2">
                                    <DetailField
                                        label="Waktu Redeem"
                                        value={formatDate(
                                            selectedPass.redeemed_at
                                        )}
                                    />

                                    <DetailField
                                        label="Redeemed By"
                                        value={
                                            getProviderUserName(
                                                selectedPass.id_provider,
                                                selectedPass.redeemed_by
                                            )
                                        }
                                    />
                                </div>
                            </section>
                        )}

                        {selectedPass.status_health_pass ===
                            "FINISHED" && (
                                <section className="border-t border-slate-100 pt-5">
                                    <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-emerald-700">
                                        <CheckCircle2 size={18} />
                                        Informasi Penyelesaian Treatment
                                    </h3>

                                    <div className="grid gap-4 rounded-xl bg-emerald-50 p-4 sm:grid-cols-2">
                                        <DetailField
                                            label="Waktu Selesai"
                                            value={formatDate(
                                                selectedPass.finished_at
                                            )}
                                        />

                                        <DetailField
                                            label="Finished By"
                                            value={
                                                getProviderUserName(
                                                    selectedPass.id_provider,
                                                    selectedPass.finished_by
                                                )
                                            }
                                        />
                                    </div>

                                    <p className="mt-3 text-xs text-slate-500">
                                        Treatment telah diselesaikan oleh
                                        Provider User yang terdaftar pada
                                        provider terkait.
                                    </p>
                                </section>
                            )}

                        <section className="border-t border-slate-100 pt-5">
                            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#00357A]">
                                <UserRound size={18} />
                                Informasi Penerima
                            </h3>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <DetailField
                                    label="Tipe Penerima"
                                    value={
                                        selectedPass.recipient_type
                                    }
                                />

                                <DetailField
                                    label={
                                        selectedPass.recipient_type ===
                                            "GUEST"
                                            ? "ID Guest"
                                            : "ID Customer"
                                    }
                                    value={
                                        selectedPass.recipient_type ===
                                            "GUEST"
                                            ? selectedPass.id_guest
                                            : selectedPass.id_customer
                                    }
                                />

                                <DetailField
                                    label="Nama Penerima"
                                    value={
                                        selectedPass.recipient_name
                                    }
                                />

                                <DetailField
                                    label="Email"
                                    value={
                                        selectedPass.recipient_email
                                    }
                                />

                                <DetailField
                                    label="Nomor Telepon"
                                    value={
                                        selectedPass.recipient_phone
                                    }
                                />
                            </div>
                        </section>

                        <section className="border-t border-slate-100 pt-5">
                            <h3 className="mb-4 text-sm font-bold text-[#00357A]">
                                Informasi Layanan
                            </h3>

                            {getImageUrl(
                                selectedPass.image_service
                            ) && (
                                    <div className="mb-4 h-32 w-48 overflow-hidden rounded-xl border border-[#DBE4F0]">
                                        <img
                                            src={
                                                getImageUrl(
                                                    selectedPass.image_service
                                                )!
                                            }
                                            alt={
                                                selectedPass.name_service ||
                                                "Layanan"
                                            }
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                )}

                            <div className="grid gap-4 sm:grid-cols-2">
                                <DetailField
                                    label="ID Layanan"
                                    value={
                                        selectedPass.id_service
                                    }
                                />

                                <DetailField
                                    label="Nama Layanan"
                                    value={
                                        selectedPass.name_service
                                    }
                                />

                                <DetailField
                                    label="Provider"
                                    value={
                                        selectedPass.name_provider
                                    }
                                />

                                <DetailField
                                    label="Harga Layanan"
                                    value={formatMoney(
                                        selectedPass.price_service
                                    )}
                                />

                                <div className="sm:col-span-2">
                                    <DetailField
                                        label="Deskripsi Layanan"
                                        value={
                                            selectedPass.description_service
                                        }
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="border-t border-slate-100 pt-5">
                            <h3 className="mb-4 text-sm font-bold text-[#00357A]">
                                Status Transaksi
                            </h3>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <DetailField
                                    label="Payment Status"
                                    value={
                                        selectedPass.payment_status
                                    }
                                />

                                <DetailField
                                    label="Order Status"
                                    value={
                                        selectedPass.order_status
                                    }
                                />
                            </div>
                        </section>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default HealthPass;
