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
    Activity,
    AlertCircle,
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Eye,
    Loader2,
    Package,
    RefreshCw,
    Search,
    ShieldCheck,
    Ticket,
    UserRound,
    X,
    ScanLine,
    Building2,
    Mail,
    Phone,
    Hash,
    ClipboardCheck,
    FileText,
    KeyRound,
    Send,
    RotateCw,
    LockKeyhole,
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

interface ProviderUserLookup {
    id_provider_user: number;
    name_provider_user: string;
}

interface HealthPass {
    id_health_pass: string;
    status_health_pass: string;

    valid_from: string | null;
    valid_until: string | null;
    booking_at: string | null;

    redeemed_at: string | null;
    redeemed_by: string | number | null;

    finished_at?: string | null;
    finished_by?: string | number | null;
    doctor_notes?: string | null;

    id_order: string;
    id_customer: number | null;
    id_guest?: number | null;
    id_service: number;
    id_provider?: number;

    payment_status: string;
    order_status: string;

    recipient_type?: "CUSTOMER" | "GUEST" | "UNKNOWN";

    name_customer?: string | null;
    email_customer?: string | null;
    phone_number_customer?: string | null;
    dob_customer?: string | null;

    name_service?: string;
    price_service?: string | number;
    image_service?: string | null;
    description_service?: string | null;
    name_provider?: string;
}

interface ApiResponse {
    success: boolean;
    message?: string;
    data: HealthPass[];
}

interface FinishOtpResponse {
    success: boolean;
    message?: string;
    data?: {
        otp_token: string;
        expires_in_seconds: number;
        recipient_email_masked: string;
    };
}

interface FinishResponse {
    success: boolean;
    message?: string;
    data?: Partial<HealthPass>;
}

type StatusFilter =
    | "ALL"
    | "REDEEMED"
    | "FINISHED"
    | "ACTIVE"
    | "EXPIRED"
    | "OTHER";

type DateFilter =
    | "ALL"
    | "TODAY"
    | "7_DAYS"
    | "30_DAYS";

type DisplayStatus =
    | "REDEEMED"
    | "FINISHED"
    | "ACTIVE"
    | "UPCOMING"
    | "EXPIRED"
    | "OTHER";

const PAGE_SIZE = 10;

const getProviderToken = (): string | null =>
    sessionStorage.getItem("provider_token") ||
    localStorage.getItem("provider_token");

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

        if (rawId == null || rawId === "") return null;

        const id = Number(rawId);

        return Number.isSafeInteger(id) && id > 0
            ? id
            : null;
    } catch {
        return null;
    }
};

const formatRupiah = (
    value?: string | number
): string => {
    if (value == null) return "-";

    const amount = Number(value);

    if (!Number.isFinite(amount)) return "-";

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(amount);
};

const formatNumber = (value: number): string =>
    new Intl.NumberFormat("id-ID").format(value);

const toTimestamp = (
    value?: string | null
): number | null => {
    if (!value) return null;

    const timestamp = new Date(value).getTime();

    return Number.isFinite(timestamp)
        ? timestamp
        : null;
};

const formatDate = (
    value?: string | null,
    withTime = true
): string => {
    const timestamp = toTimestamp(value);

    if (timestamp === null) return "-";

    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        ...(withTime
            ? {
                hour: "2-digit" as const,
                minute: "2-digit" as const,
                hourCycle: "h23" as const,
            }
            : {}),
        timeZone: "Asia/Jakarta",
    }).format(new Date(timestamp));
};

const formatDateOfBirth = (
    value?: string | null
): string => {
    if (!value) return "-";

    const dateOnly = value.slice(0, 10);

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
        dateOnly
    );

    if (!match) return "-";

    const [, year, month, day] = match;

    const date = new Date(
        Date.UTC(
            Number(year),
            Number(month) - 1,
            Number(day)
        )
    );

    if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== dateOnly
    ) {
        return "-";
    }

    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);
};

const getJakartaDay = (timestamp: number): string => {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date(timestamp));

    const part = (type: string) =>
        parts.find((item) => item.type === type)?.value || "";

    return `${part("year")}-${part("month")}-${part("day")}`;
};

const normalizeStatus = (value?: string) =>
    (value || "").toUpperCase().trim();

const getDisplayStatus = (
    pass: HealthPass,
    now: number
): DisplayStatus => {
    const status = normalizeStatus(
        pass.status_health_pass
    );

    if (status === "FINISHED") return "FINISHED";
    if (status === "REDEEMED") return "REDEEMED";

    if (status === "EXPIRED") return "EXPIRED";
    if (status !== "ACTIVE") return "OTHER";

    const from = toTimestamp(pass.valid_from);
    const until = toTimestamp(pass.valid_until);

    if (
        from === null ||
        until === null ||
        until <= from
    ) {
        return "OTHER";
    }

    if (now >= until) return "EXPIRED";
    if (now < from) return "UPCOMING";

    return "ACTIVE";
};

const getStatusInfo = (status: DisplayStatus) => {
    switch (status) {
        case "FINISHED":
            return {
                label: "Selesai Treatment",
                className:
                    "border-emerald-200 bg-emerald-50 text-emerald-700",
            };

        case "REDEEMED":
            return {
                label: "Dalam Pelayanan",
                className:
                    "border-blue-200 bg-blue-50 text-blue-700",
            };

        case "ACTIVE":
            return {
                label: "Aktif",
                className:
                    "border-emerald-200 bg-emerald-50 text-emerald-700",
            };

        case "UPCOMING":
            return {
                label: "Belum Berlaku",
                className:
                    "border-sky-200 bg-sky-50 text-sky-700",
            };

        case "EXPIRED":
            return {
                label: "Kedaluwarsa",
                className:
                    "border-red-200 bg-red-50 text-red-700",
            };

        default:
            return {
                label: "Tidak Aktif",
                className:
                    "border-slate-200 bg-slate-100 text-slate-600",
            };
    }
};

async function readApiResponse<T>(
    response: Response
): Promise<T> {
    const contentType =
        response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
        throw new Error(
            `Response server tidak valid (${response.status}).`
        );
    }

    return (await response.json()) as T;
}

const StatusBadge = ({
    status,
}: {
    status: DisplayStatus;
}) => {
    const info = getStatusInfo(status);

    return (
        <span
            className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-bold ${info.className}`}
        >
            {info.label}
        </span>
    );
};

interface SummaryCardProps {
    label: string;
    value: string;
    description: string;
    icon: ComponentType<{
        size?: number;
        className?: string;
    }>;
    loading: boolean;
}

const SummaryCard = ({
    label,
    value,
    description,
    icon: Icon,
    loading,
}: SummaryCardProps) => (
    <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-500">
                    {label}
                </p>

                {loading ? (
                    <div className="mt-4 h-9 w-20 animate-pulse rounded-lg bg-blue-50" />
                ) : (
                    <h3 className="mt-3 wrap-break-word text-2xl font-bold text-slate-900">
                        {value}
                    </h3>
                )}
            </div>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Icon size={22} />
            </div>
        </div>

        <p className="mt-3 text-xs leading-5 text-slate-400">
            {description}
        </p>
    </div>
);

interface DetailRowProps {
    label: string;
    value: string;
    icon: ComponentType<{
        size?: number;
        className?: string;
    }>;
}

const DetailRow = ({
    label,
    value,
    icon: Icon,
}: DetailRowProps) => (
    <div className="flex items-start gap-3 py-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Icon size={17} />
        </div>

        <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-400">
                {label}
            </p>
            <p className="mt-1 break-all text-sm font-semibold text-slate-800">
                {value || "-"}
            </p>
        </div>
    </div>
);

const Redemptions = () => {
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
            Number.isSafeInteger(parsedContextId) &&
            parsedContextId > 0
            ? parsedContextId
            : getStoredProviderId();

    const [passes, setPasses] = useState<HealthPass[]>([]);
    const [providerUsers, setProviderUsers] =
        useState<ProviderUserLookup[]>([]);

    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const [searchKeyword, setSearchKeyword] = useState("");

    const [statusFilter, setStatusFilter] =
        useState<StatusFilter>("REDEEMED");

    const [dateFilter, setDateFilter] =
        useState<DateFilter>("ALL");

    const [page, setPage] = useState(1);
    const [refreshKey, setRefreshKey] = useState(0);
    const [now, setNow] = useState(() => Date.now());

    const [selectedPassId, setSelectedPassId] =
        useState<string | null>(null);

    const [finishPassId, setFinishPassId] =
        useState<string | null>(null);

    const [doctorNotes, setDoctorNotes] = useState("");

    const [finishing, setFinishing] = useState(false);
    const [finishError, setFinishError] = useState("");
    const [finishSuccess, setFinishSuccess] = useState("");

    const [otpToken, setOtpToken] = useState("");
    const [otpCode, setOtpCode] = useState("");

    const [otpSending, setOtpSending] = useState(false);
    const [otpSent, setOtpSent] = useState(false);

    const [otpRecipient, setOtpRecipient] = useState("");

    const [otpExpiresAt, setOtpExpiresAt] = useState<
        number | null
    >(null);

    // Countdown dikendalikan oleh state `now` yang
    // diperbarui setiap detik ketika modal terbuka.
    const otpSecondsLeft = otpExpiresAt
        ? Math.max(0, Math.ceil((otpExpiresAt - now) / 1000))
        : 0;

    const otpExpired =
        otpSent && otpSecondsLeft <= 0;

    const otpValid =
        /^\d{6}$/.test(otpCode) &&
        Boolean(otpToken) &&
        otpSent &&
        !otpExpired;

    const redirectToLogin = useCallback(() => {
        clearProviderSession();

        navigate("/provider/sign-in", {
            replace: true,
        });
    }, [navigate]);

    useEffect(() => {
        const controller = new AbortController();

        const fetchRedemptions = async () => {
            setLoading(true);
            setErrorMessage("");

            const token = getProviderToken();

            if (!token || isTokenExpired(token)) {
                redirectToLogin();
                return;
            }

            if (!providerId) {
                setPasses([]);
                setErrorMessage(
                    "ID provider tidak ditemukan. Silakan login kembali."
                );
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(
                    `${import.meta.env.VITE_API_URI}/health-passes/provider`,
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

                const result =
                    await readApiResponse<ApiResponse>(response);

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message ||
                        `Gagal memuat Health Pass (${response.status})`
                    );
                }

                if (!Array.isArray(result.data)) {
                    throw new Error(
                        "Format response Health Pass tidak valid."
                    );
                }

                if (controller.signal.aborted) return;

                const providerPasses = result.data.filter(
                    (pass) =>
                        pass.id_provider == null ||
                        Number(pass.id_provider) === providerId
                );

                setPasses(providerPasses);
                setNow(Date.now());
            } catch (error) {
                if (controller.signal.aborted) return;

                setPasses([]);

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Terjadi kesalahan saat mengambil data."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        void fetchRedemptions();

        return () => controller.abort();
    }, [providerId, refreshKey, redirectToLogin]);

    useEffect(() => {
        if (!providerId) {
            setProviderUsers([]);
            return;
        }

        const controller = new AbortController();

        const fetchProviderUsers = async () => {
            try {
                const token = getProviderToken();

                if (!token || isTokenExpired(token)) {
                    return;
                }

                const response = await fetch(
                    `${import.meta.env.VITE_API_URI}/provider-user/provider/${providerId}`,
                    {
                        method: "GET",
                        headers: {
                            Accept: "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        signal: controller.signal,
                    }
                );

                if (!response.ok) {
                    throw new Error(
                        `Gagal mengambil Provider Users (${response.status})`
                    );
                }

                const result = await response.json();

                if (!Array.isArray(result.provider_users)) {
                    throw new Error(
                        "Format data Provider Users tidak valid."
                    );
                }

                const users: ProviderUserLookup[] =
                    result.provider_users
                        .map((user: ProviderUserLookup) => ({
                            id_provider_user: Number(
                                user.id_provider_user
                            ),
                            name_provider_user:
                                user.name_provider_user,
                        }))
                        .filter(
                            (user: ProviderUserLookup) =>
                                Number.isSafeInteger(user.id_provider_user) &&
                                user.id_provider_user > 0 &&
                                typeof user.name_provider_user === "string"
                        );

                if (!controller.signal.aborted) {
                    setProviderUsers(users);
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    console.error(
                        "Gagal mengambil Provider Users:",
                        error
                    );
                    setProviderUsers([]);
                }
            }
        };

        void fetchProviderUsers();

        return () => controller.abort();
    }, [providerId, refreshKey]);

    const getRedeemedByName = useCallback(
        (
            redeemedBy: string | number | null
        ): string => {
            if (
                redeemedBy === null ||
                redeemedBy === undefined ||
                redeemedBy === ""
            ) {
                return "-";
            }

            const user = providerUsers.find(
                (item) =>
                    String(item.id_provider_user) ===
                    String(redeemedBy)
            );

            return (
                user?.name_provider_user ||
                `Provider User #${redeemedBy}`
            );
        },
        [providerUsers]
    );

    useEffect(() => {
        // Perbarui countdown OTP setiap detik ketika modal aktif.
        const interval = window.setInterval(
            () => setNow(Date.now()),
            finishPassId ? 1000 : 60_000
        );

        return () => window.clearInterval(interval);
    }, [finishPassId]);

    const summary = useMemo(() => {
        const redeemed = passes.filter((pass) =>
            ["REDEEMED", "FINISHED"].includes(
                normalizeStatus(pass.status_health_pass)
            )
        );

        const active = passes.filter(
            (pass) => getDisplayStatus(pass, now) === "ACTIVE"
        );

        const todayKey = getJakartaDay(now);

        const todayRedeemed = redeemed.filter((pass) => {
            const timestamp = toTimestamp(pass.redeemed_at);

            return (
                timestamp !== null &&
                getJakartaDay(timestamp) === todayKey
            );
        });

        const redemptionRate =
            passes.length > 0
                ? (redeemed.length / passes.length) * 100
                : 0;

        return {
            total: passes.length,
            redeemed: redeemed.length,
            today: todayRedeemed.length,
            active: active.length,
            rate: redemptionRate,
        };
    }, [passes, now]);

    const filteredPasses = useMemo(() => {
        const keyword = searchKeyword.trim().toLowerCase();
        const todayKey = getJakartaDay(now);

        return passes
            .filter((pass) => {
                const displayStatus =
                    getDisplayStatus(pass, now);

                const matchesStatus =
                    statusFilter === "ALL" ||
                    (statusFilter === "OTHER"
                        ? displayStatus === "OTHER" ||
                        displayStatus === "UPCOMING"
                        : displayStatus === statusFilter);

                const content = [
                    pass.id_health_pass,
                    pass.id_order,
                    pass.name_customer,
                    pass.name_service,
                    pass.name_provider,
                    pass.email_customer,
                    pass.phone_number_customer,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                const matchesSearch =
                    !keyword || content.includes(keyword);

                let matchesDate = true;

                if (dateFilter !== "ALL") {
                    const redeemedTime =
                        toTimestamp(pass.redeemed_at);

                    if (redeemedTime === null) {
                        matchesDate = false;
                    } else if (dateFilter === "TODAY") {
                        matchesDate =
                            getJakartaDay(redeemedTime) === todayKey;
                    } else {
                        const days =
                            dateFilter === "7_DAYS" ? 7 : 30;

                        const earliest =
                            new Date(
                                `${todayKey}T00:00:00+07:00`
                            ).getTime() -
                            (days - 1) * 86_400_000;

                        matchesDate =
                            redeemedTime >= earliest &&
                            redeemedTime <= now;
                    }
                }

                return (
                    matchesStatus &&
                    matchesSearch &&
                    matchesDate
                );
            })
            .sort((a, b) => {
                const timeA =
                    toTimestamp(a.redeemed_at) ??
                    toTimestamp(a.booking_at) ??
                    toTimestamp(a.valid_from) ??
                    0;

                const timeB =
                    toTimestamp(b.redeemed_at) ??
                    toTimestamp(b.booking_at) ??
                    toTimestamp(b.valid_from) ??
                    0;

                return timeB - timeA;
            });
    }, [
        passes,
        statusFilter,
        dateFilter,
        searchKeyword,
        now,
    ]);

    useEffect(() => {
        setPage(1);
    }, [searchKeyword, statusFilter, dateFilter]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredPasses.length / PAGE_SIZE)
    );

    const currentPage = Math.min(page, totalPages);

    const paginatedPasses = filteredPasses.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    const selectedPass =
        passes.find(
            (pass) => pass.id_health_pass === selectedPassId
        ) ?? null;

    const finishPass =
        passes.find(
            (pass) => pass.id_health_pass === finishPassId
        ) ?? null;

    const resetOtpState = () => {
        setOtpToken("");
        setOtpCode("");
        setOtpSent(false);
        setOtpRecipient("");
        setOtpExpiresAt(null);
        setOtpSending(false);
    };

    const closeDetail = () => {
        setSelectedPassId(null);
    };

    const openFinish = (pass: HealthPass) => {
        if (
            normalizeStatus(pass.status_health_pass) !==
            "REDEEMED"
        ) {
            return;
        }

        setSelectedPassId(null);
        setFinishPassId(pass.id_health_pass);

        setDoctorNotes("");
        setFinishError("");
        setFinishSuccess("");

        resetOtpState();
        setNow(Date.now());
    };

    const closeFinish = () => {
        if (finishing || otpSending) return;

        setFinishPassId(null);
        setDoctorNotes("");
        setFinishError("");

        resetOtpState();
    };

    const requestFinishOtp = async () => {
        if (!finishPass || otpSending || finishing) {
            return;
        }

        if (
            normalizeStatus(finishPass.status_health_pass) !==
            "REDEEMED"
        ) {
            setFinishError(
                "Health Pass harus berstatus REDEEMED."
            );
            return;
        }

        const token = getProviderToken();

        if (!token || isTokenExpired(token)) {
            redirectToLogin();
            return;
        }

        setOtpSending(true);
        setFinishError("");

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URI}/health-passes/provider/finish/${encodeURIComponent(
                    finishPass.id_health_pass
                )}/request-otp`,
                {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const result =
                await readApiResponse<FinishOtpResponse>(
                    response
                );

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                    "Gagal mengirim kode OTP ke email pasien."
                );
            }

            if (
                !result.data ||
                typeof result.data.otp_token !== "string" ||
                !result.data.otp_token
            ) {
                throw new Error(
                    "Response OTP tidak memiliki otp_token yang valid."
                );
            }

            const expiresIn = Number(
                result.data.expires_in_seconds
            );

            if (
                !Number.isFinite(expiresIn) ||
                expiresIn <= 0
            ) {
                throw new Error(
                    "Masa berlaku OTP dari server tidak valid."
                );
            }

            const timestamp = Date.now();

            // Simpan JWT challenge hanya pada React state.
            // Tidak menyimpan OTP asli atau token ke storage.
            setOtpToken(result.data.otp_token);
            setOtpCode("");
            setOtpSent(true);

            setOtpRecipient(
                result.data.recipient_email_masked ||
                finishPass.email_customer ||
                "email pasien"
            );

            setOtpExpiresAt(
                timestamp + expiresIn * 1000
            );

            setNow(timestamp);
        } catch (error) {
            setFinishError(
                error instanceof Error
                    ? error.message
                    : "Gagal mengirim OTP."
            );
        } finally {
            setOtpSending(false);
        }
    };

    const finishTreatment = async () => {
        if (!finishPass || finishing || otpSending) {
            return;
        }

        if (
            normalizeStatus(finishPass.status_health_pass) !==
            "REDEEMED"
        ) {
            setFinishError(
                "Health Pass harus berstatus REDEEMED."
            );
            return;
        }

        const notes = doctorNotes.trim();

        if (!notes) {
            setFinishError(
                "Catatan treatment wajib diisi."
            );
            return;
        }

        if (notes.length > 10000) {
            setFinishError(
                "Catatan treatment maksimal 10.000 karakter."
            );
            return;
        }

        if (!otpSent || !otpToken) {
            setFinishError(
                "Kirim OTP ke email pasien terlebih dahulu."
            );
            return;
        }

        if (otpExpired || otpSecondsLeft <= 0) {
            setFinishError(
                "OTP sudah kedaluwarsa. Silakan kirim OTP baru."
            );
            return;
        }

        if (!/^\d{6}$/.test(otpCode)) {
            setFinishError(
                "Masukkan kode OTP 6 digit yang diterima pasien."
            );
            return;
        }

        const token = getProviderToken();

        if (!token || isTokenExpired(token)) {
            redirectToLogin();
            return;
        }

        setFinishing(true);
        setFinishError("");
        setFinishSuccess("");

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URI}/health-passes/provider/finish/${encodeURIComponent(
                    finishPass.id_health_pass
                )}`,
                {
                    method: "PATCH",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        doctor_notes: notes,
                        otp: otpCode,
                        otp_token: otpToken,
                    }),
                }
            );

            const result =
                await readApiResponse<FinishResponse>(
                    response
                );

            // Response 401 dapat berarti OTP tidak valid,
            // bukan selalu access token provider expired.
            if (
                response.status === 401 &&
                (!getProviderToken() ||
                    isTokenExpired(getProviderToken() || ""))
            ) {
                redirectToLogin();
                return;
            }

            if (
                !response.ok ||
                !result.success ||
                normalizeStatus(
                    result.data?.status_health_pass
                ) !== "FINISHED"
            ) {
                throw new Error(
                    result.message ||
                    "Gagal menyelesaikan treatment."
                );
            }

            setPasses((previous) =>
                previous.map((pass) =>
                    pass.id_health_pass ===
                        finishPass.id_health_pass
                        ? {
                            ...pass,
                            ...result.data,
                            status_health_pass: "FINISHED",
                        }
                        : pass
                )
            );

            setFinishSuccess(
                `Treatment ${finishPass.id_health_pass} berhasil diselesaikan.`
            );

            setFinishPassId(null);
            setDoctorNotes("");

            resetOtpState();

            setRefreshKey(
                (previous) => previous + 1
            );
        } catch (error) {
            setFinishError(
                error instanceof Error
                    ? error.message
                    : "Gagal menyelesaikan treatment."
            );
        } finally {
            setFinishing(false);
        }
    };

    const handleRefresh = () => {
        if (loading) return;

        setRefreshKey(
            (previous) => previous + 1
        );
    };

    const statusOptions: {
        label: string;
        value: StatusFilter;
    }[] = [
            {
                label: "Dalam Pelayanan",
                value: "REDEEMED",
            },
            {
                label: "Selesai Treatment",
                value: "FINISHED",
            },
            {
                label: "Semua",
                value: "ALL",
            },
            {
                label: "Aktif",
                value: "ACTIVE",
            },
            {
                label: "Kedaluwarsa",
                value: "EXPIRED",
            },
            {
                label: "Lainnya",
                value: "OTHER",
            },
        ];

    return (
        <div className="min-h-full bg-[#F8FAFF]">
            <div className="mx-auto max-w-360 space-y-6 p-5 md:p-7 lg:p-8">
                <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">
                            Provider Portal
                        </p>

                        <h1 className="mt-2 text-2xl font-bold text-slate-900 lg:text-3xl">
                            Redemptions
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                            Riwayat penggunaan dan penyelesaian treatment
                            Health Pass untuk {providerName}.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={handleRefresh}
                            disabled={loading}
                            className="flex cursor-pointer items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                        >
                            <RefreshCw
                                size={17}
                                className={
                                    loading ? "animate-spin" : ""
                                }
                            />
                            Refresh
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                navigate(
                                    "/provider/scan-health-pass"
                                )
                            }
                            className="flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
                        >
                            <ScanLine size={18} />
                            Scan Health Pass
                        </button>
                    </div>
                </section>

                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard
                        label="Total Redemptions"
                        value={formatNumber(summary.redeemed)}
                        description="Termasuk treatment selesai"
                        icon={CheckCircle2}
                        loading={loading}
                    />

                    <SummaryCard
                        label="Today's Redemptions"
                        value={formatNumber(summary.today)}
                        description="Penggunaan Health Pass hari ini (WIB)"
                        icon={CalendarDays}
                        loading={loading}
                    />

                    <SummaryCard
                        label="Active Health Passes"
                        value={formatNumber(summary.active)}
                        description="Health Pass aktif dalam masa berlaku"
                        icon={Ticket}
                        loading={loading}
                    />

                    <SummaryCard
                        label="Redemption Rate"
                        value={`${summary.rate.toFixed(1)}%`}
                        description={`Dari ${formatNumber(
                            summary.total
                        )} Health Pass provider`}
                        icon={Activity}
                        loading={loading}
                    />
                </section>

                <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
                    <div className="border-b border-blue-100 p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">
                                    Riwayat Redemption
                                </h2>

                                <p className="mt-1 text-xs text-slate-500">
                                    Data diambil dari Health Pass provider.
                                </p>
                            </div>

                            <span className="text-xs font-semibold text-blue-600">
                                {loading
                                    ? "Memuat..."
                                    : `${filteredPasses.length} Health Pass`}
                            </span>
                        </div>

                        {/* SEARCH + DATE FILTER */}
                        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                            <div className="relative min-w-0 flex-1">
                                <Search
                                    size={18}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                />

                                <input
                                    type="search"
                                    value={searchKeyword}
                                    onChange={(event) =>
                                        setSearchKeyword(
                                            event.target.value
                                        )
                                    }
                                    placeholder="Cari customer, guest, layanan, ID pass..."
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <select
                                aria-label="Filter tanggal redemption"
                                value={dateFilter}
                                onChange={(event) =>
                                    setDateFilter(
                                        event.target.value as DateFilter
                                    )
                                }
                                className="h-11 cursor-pointer rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-400"
                            >
                                <option value="ALL">
                                    Semua Waktu
                                </option>

                                <option value="TODAY">
                                    Hari Ini
                                </option>

                                <option value="7_DAYS">
                                    7 Hari Terakhir
                                </option>

                                <option value="30_DAYS">
                                    30 Hari Terakhir
                                </option>
                            </select>
                        </div>

                        {/* STATUS FILTER */}
                        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                            {statusOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() =>
                                        setStatusFilter(option.value)
                                    }
                                    aria-pressed={
                                        statusFilter === option.value
                                    }
                                    className={`shrink-0 cursor-pointer rounded-full border px-4 py-2 text-xs font-semibold transition ${statusFilter === option.value
                                        ? "border-blue-600 bg-blue-600 text-white"
                                        : "border-slate-200 bg-white text-slate-500 hover:border-blue-300"
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ERROR */}
                    {!loading && errorMessage && (
                        <div
                            role="alert"
                            className="m-5 rounded-xl border border-red-200 bg-red-50 p-6 text-center"
                        >
                            <AlertCircle
                                size={34}
                                className="mx-auto text-red-500"
                            />

                            <h3 className="mt-3 font-bold text-red-700">
                                Gagal Memuat Redemptions
                            </h3>

                            <p className="mt-2 text-sm text-red-600">
                                {errorMessage}
                            </p>

                            <button
                                type="button"
                                onClick={handleRefresh}
                                className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white"
                            >
                                Coba Lagi
                            </button>
                        </div>
                    )}

                    {/* LOADING */}
                    {loading && (
                        <div className="flex items-center justify-center gap-3 py-20">
                            <Loader2
                                size={26}
                                className="animate-spin text-blue-600"
                            />

                            <span className="text-sm text-slate-500">
                                Memuat data redemption...
                            </span>
                        </div>
                    )}

                    {/* EMPTY */}
                    {!loading &&
                        !errorMessage &&
                        filteredPasses.length === 0 && (
                            <div className="px-5 py-20 text-center">
                                <Package
                                    size={44}
                                    className="mx-auto text-blue-200"
                                />

                                <h3 className="mt-4 font-bold text-slate-800">
                                    Tidak Ada Data
                                </h3>

                                <p className="mt-2 text-sm text-slate-500">
                                    {passes.length === 0
                                        ? "Belum ada Health Pass untuk provider ini."
                                        : "Tidak ada Health Pass yang sesuai dengan filter."}
                                </p>
                            </div>
                        )}

                    {/* DATA */}
                    {!loading &&
                        !errorMessage &&
                        paginatedPasses.length > 0 && (
                            <>
                                {/* DESKTOP TABLE */}
                                <div className="hidden overflow-x-auto lg:block">
                                    <table className="w-full min-w-237.5 text-left">
                                        <thead className="bg-blue-50/70">
                                            <tr className="text-xs font-semibold text-slate-500">
                                                <th className="px-5 py-4">
                                                    Health Pass
                                                </th>

                                                <th className="px-4 py-4">
                                                    Customer / Guest
                                                </th>

                                                <th className="px-4 py-4">
                                                    Layanan
                                                </th>

                                                <th className="px-4 py-4">
                                                    Status
                                                </th>

                                                <th className="px-4 py-4">
                                                    Waktu Redeem
                                                </th>

                                                <th className="px-4 py-4">
                                                    Redeemed By
                                                </th>

                                                <th className="px-4 py-4 text-right">
                                                    Aksi
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody className="divide-y divide-slate-100">
                                            {paginatedPasses.map((pass) => {
                                                const displayStatus =
                                                    getDisplayStatus(pass, now);

                                                return (
                                                    <tr
                                                        key={pass.id_health_pass}
                                                        className="hover:bg-blue-50/30"
                                                    >
                                                        <td className="px-5 py-4">
                                                            <p
                                                                title={pass.id_health_pass}
                                                                className="max-w-36.25 truncate text-xs font-bold text-slate-800"
                                                            >
                                                                {pass.id_health_pass}
                                                            </p>

                                                            <p className="mt-1 text-[11px] text-slate-400">
                                                                Order:{" "}
                                                                {String(
                                                                    pass.id_order
                                                                ).slice(0, 8)}
                                                                ...
                                                            </p>
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            <p className="max-w-37.5 truncate text-sm font-semibold text-slate-800">
                                                                {pass.name_customer || "-"}
                                                            </p>

                                                            <p className="mt-1 max-w-37.5 truncate text-xs text-slate-500">
                                                                {pass.email_customer || "-"}
                                                            </p>

                                                            {pass.recipient_type ===
                                                                "GUEST" && (
                                                                    <span className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                                                        Guest
                                                                    </span>
                                                                )}
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            <p className="max-w-40 truncate text-sm font-semibold text-slate-800">
                                                                {pass.name_service || "-"}
                                                            </p>

                                                            <p className="mt-1 text-xs text-slate-500">
                                                                {formatRupiah(
                                                                    pass.price_service
                                                                )}
                                                            </p>
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            <StatusBadge
                                                                status={displayStatus}
                                                            />
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            <p className="whitespace-nowrap text-xs text-slate-700">
                                                                {formatDate(
                                                                    pass.redeemed_at
                                                                )}
                                                            </p>
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            <p className="text-xs font-medium text-slate-700">
                                                                {getRedeemedByName(
                                                                    pass.redeemed_by
                                                                )}
                                                            </p>
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setSelectedPassId(
                                                                            pass.id_health_pass
                                                                        )
                                                                    }
                                                                    className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50"
                                                                >
                                                                    <Eye size={15} />
                                                                    Detail
                                                                </button>

                                                                {displayStatus ===
                                                                    "REDEEMED" && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                openFinish(pass)
                                                                            }
                                                                            className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
                                                                        >
                                                                            <ClipboardCheck
                                                                                size={15}
                                                                            />
                                                                            Finish Treatment
                                                                        </button>
                                                                    )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* MOBILE CARDS */}
                                <div className="space-y-3 p-4 lg:hidden">
                                    {paginatedPasses.map((pass) => {
                                        const displayStatus =
                                            getDisplayStatus(pass, now);

                                        return (
                                            <article
                                                key={pass.id_health_pass}
                                                className="rounded-xl border border-slate-200 bg-white p-4"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-slate-900">
                                                            {pass.name_service || "-"}
                                                        </p>

                                                        <p className="mt-1 text-xs text-slate-500">
                                                            {pass.name_customer || "-"}
                                                        </p>
                                                    </div>

                                                    <StatusBadge
                                                        status={displayStatus}
                                                    />
                                                </div>

                                                <div className="mt-4 rounded-lg bg-slate-50 p-3">
                                                    <p className="text-xs text-slate-400">
                                                        Waktu Redemption
                                                    </p>

                                                    <p className="mt-1 text-sm font-semibold text-slate-800">
                                                        {formatDate(pass.redeemed_at)}
                                                    </p>

                                                    <p className="mt-3 text-xs text-slate-400">
                                                        Redeemed By
                                                    </p>

                                                    <p className="mt-1 text-sm font-semibold text-slate-800">
                                                        {getRedeemedByName(
                                                            pass.redeemed_by
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="mt-4 flex items-center justify-between gap-3">
                                                    <p className="max-w-47.5 truncate text-[11px] text-slate-400">
                                                        {pass.id_health_pass}
                                                    </p>

                                                    <div className="flex flex-wrap justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setSelectedPassId(
                                                                    pass.id_health_pass
                                                                )
                                                            }
                                                            className="flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-2.5 text-xs font-bold text-blue-700"
                                                        >
                                                            Detail
                                                            <ChevronRight size={15} />
                                                        </button>

                                                        {displayStatus ===
                                                            "REDEEMED" && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        openFinish(pass)
                                                                    }
                                                                    className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-bold text-white"
                                                                >
                                                                    <ClipboardCheck
                                                                        size={15}
                                                                    />
                                                                    Finish Treatment
                                                                </button>
                                                            )}
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>

                                {/* PAGINATION */}
                                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-blue-100 px-5 py-4">
                                    <p className="text-xs text-slate-500">
                                        Menampilkan{" "}
                                        {(currentPage - 1) * PAGE_SIZE + 1}
                                        {" - "}
                                        {Math.min(
                                            currentPage * PAGE_SIZE,
                                            filteredPasses.length
                                        )}{" "}
                                        dari {filteredPasses.length}
                                    </p>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setPage((p) =>
                                                    Math.max(1, p - 1)
                                                )
                                            }
                                            disabled={currentPage <= 1}
                                            aria-label="Halaman sebelumnya"
                                            className="rounded-lg border border-slate-200 p-2 text-slate-700 disabled:opacity-40"
                                        >
                                            <ChevronLeft size={17} />
                                        </button>

                                        <span className="text-xs font-semibold text-slate-700">
                                            {currentPage} / {totalPages}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setPage((p) =>
                                                    Math.min(
                                                        totalPages,
                                                        p + 1
                                                    )
                                                )
                                            }
                                            disabled={
                                                currentPage >= totalPages
                                            }
                                            aria-label="Halaman berikutnya"
                                            className="rounded-lg border border-slate-200 p-2 text-slate-700 disabled:opacity-40"
                                        >
                                            <ChevronRight size={17} />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                </section>
            </div>

            {finishSuccess && !finishPass && (
                <div
                    role="status"
                    className="fixed bottom-5 right-5 z-110 max-w-sm rounded-xl border border-emerald-200 bg-white p-4 text-sm font-semibold text-emerald-700 shadow-xl"
                >
                    <div className="flex items-start gap-3">
                        <CheckCircle2
                            size={19}
                            className="shrink-0"
                        />

                        <span>{finishSuccess}</span>

                        <button
                            type="button"
                            onClick={() =>
                                setFinishSuccess("")
                            }
                            aria-label="Tutup notifikasi"
                        >
                            <X size={17} />
                        </button>
                    </div>
                </div>
            )}

            {selectedPass && (
                <div
                    role="presentation"
                    className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/60 p-4"
                    onClick={closeDetail}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="redemption-detail-title"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                        className="max-h-[90dvh] w-full max-w-140 overflow-y-auto rounded-3xl bg-white shadow-2xl"
                    >
                        {/* HEADER */}
                        <div className="flex items-start justify-between gap-3 border-b border-blue-100 bg-blue-50 p-5">
                            <div>
                                <h2
                                    id="redemption-detail-title"
                                    className="text-lg font-bold text-slate-900"
                                >
                                    Detail Health Pass
                                </h2>

                                <p className="mt-1 text-xs text-blue-700">
                                    Informasi penggunaan layanan
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeDetail}
                                aria-label="Tutup detail"
                                className="cursor-pointer rounded-full bg-white p-2 text-slate-500"
                            >
                                <X size={19} />
                            </button>
                        </div>

                        {/* CONTENT */}
                        <div className="space-y-5 p-5">
                            {/* SERVICE */}
                            <div className="flex gap-3 rounded-2xl border border-blue-100 p-4">
                                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-50">
                                    {selectedPass.image_service ? (
                                        <img
                                            src={selectedPass.image_service}
                                            alt={
                                                selectedPass.name_service ||
                                                "Layanan"
                                            }
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <Package
                                            size={26}
                                            className="text-blue-400"
                                        />
                                    )}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-slate-900">
                                        {selectedPass.name_service || "-"}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                        {selectedPass.name_provider ||
                                            providerName}
                                    </p>

                                    <p className="mt-2 font-bold text-blue-600">
                                        {formatRupiah(
                                            selectedPass.price_service
                                        )}
                                    </p>

                                    <div className="mt-2">
                                        <StatusBadge
                                            status={getDisplayStatus(
                                                selectedPass,
                                                now
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* RECIPIENT */}
                            <section>
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                    <h3 className="text-sm font-bold text-slate-900">
                                        Informasi Penerima Layanan
                                    </h3>

                                    <span
                                        className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-bold ${selectedPass.recipient_type ===
                                            "GUEST"
                                            ? "bg-amber-50 text-amber-700"
                                            : "bg-blue-50 text-blue-700"
                                            }`}
                                    >
                                        {selectedPass.recipient_type ===
                                            "GUEST"
                                            ? "Guest / Orang Lain"
                                            : selectedPass.recipient_type ===
                                                "CUSTOMER"
                                                ? "Customer / Diri Sendiri"
                                                : "Penerima Layanan"}
                                    </span>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-4">
                                    <DetailRow
                                        icon={UserRound}
                                        label={
                                            selectedPass.recipient_type ===
                                                "GUEST"
                                                ? "Nama Guest"
                                                : "Nama Customer"
                                        }
                                        value={
                                            selectedPass.name_customer || "-"
                                        }
                                    />

                                    <DetailRow
                                        icon={Mail}
                                        label="Email"
                                        value={
                                            selectedPass.email_customer || "-"
                                        }
                                    />

                                    <DetailRow
                                        icon={Phone}
                                        label="Nomor Telepon"
                                        value={
                                            selectedPass.phone_number_customer ||
                                            "-"
                                        }
                                    />

                                    {selectedPass.recipient_type ===
                                        "CUSTOMER" && (
                                            <DetailRow
                                                icon={CalendarDays}
                                                label="Tanggal Lahir (DOB)"
                                                value={formatDateOfBirth(
                                                    selectedPass.dob_customer
                                                )}
                                            />
                                        )}
                                </div>

                                {selectedPass.recipient_type ===
                                    "GUEST" && (
                                        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3">
                                            <UserRound
                                                size={17}
                                                className="mt-0.5 shrink-0 text-amber-600"
                                            />

                                            <p className="text-xs leading-5 text-amber-700">
                                                Health Pass ini digunakan oleh
                                                guest atau orang lain yang
                                                didaftarkan oleh customer.
                                            </p>
                                        </div>
                                    )}
                            </section>

                            {/* HEALTH PASS */}
                            <section>
                                <h3 className="mb-3 text-sm font-bold text-slate-900">
                                    Informasi Health Pass
                                </h3>

                                <div className="rounded-xl bg-slate-50 p-4">
                                    <DetailRow
                                        icon={Hash}
                                        label="ID Health Pass"
                                        value={selectedPass.id_health_pass}
                                    />

                                    <DetailRow
                                        icon={Ticket}
                                        label="ID Order"
                                        value={String(
                                            selectedPass.id_order
                                        )}
                                    />

                                    <DetailRow
                                        icon={CalendarDays}
                                        label="Jadwal Booking"
                                        value={formatDate(
                                            selectedPass.booking_at
                                        )}
                                    />

                                    <DetailRow
                                        icon={Clock3}
                                        label="Berlaku Mulai"
                                        value={formatDate(
                                            selectedPass.valid_from
                                        )}
                                    />

                                    <DetailRow
                                        icon={Clock3}
                                        label="Berlaku Sampai"
                                        value={formatDate(
                                            selectedPass.valid_until
                                        )}
                                    />
                                </div>
                            </section>

                            {/* REDEMPTION */}
                            <section>
                                <h3 className="mb-3 text-sm font-bold text-slate-900">
                                    Informasi Redemption
                                </h3>

                                <div className="rounded-xl bg-blue-50 p-4">
                                    <DetailRow
                                        icon={CheckCircle2}
                                        label="Waktu Redeem"
                                        value={formatDate(
                                            selectedPass.redeemed_at
                                        )}
                                    />

                                    <DetailRow
                                        icon={ShieldCheck}
                                        label="Redeemed By"
                                        value={getRedeemedByName(
                                            selectedPass.redeemed_by
                                        )}
                                    />

                                    <DetailRow
                                        icon={Building2}
                                        label="Provider"
                                        value={
                                            selectedPass.name_provider ||
                                            providerName
                                        }
                                    />
                                </div>
                            </section>

                            {/* FINISHED DETAILS */}
                            {selectedPass.finished_at && (
                                <section>
                                    <h3 className="mb-3 text-sm font-bold text-slate-900">
                                        Penyelesaian Treatment
                                    </h3>

                                    <div className="rounded-xl bg-emerald-50 p-4">
                                        <DetailRow
                                            icon={CalendarDays}
                                            label="Waktu Selesai"
                                            value={formatDate(
                                                selectedPass.finished_at
                                            )}
                                        />

                                        <DetailRow
                                            icon={ShieldCheck}
                                            label="Diselesaikan Oleh"
                                            value={getRedeemedByName(
                                                selectedPass.finished_by ??
                                                null
                                            )}
                                        />
                                    </div>

                                    {selectedPass.doctor_notes && (
                                        <div className="mt-3 rounded-xl border border-slate-200 p-4">
                                            <p className="text-xs font-semibold text-slate-500">
                                                Catatan Treatment
                                            </p>

                                            <p className="mt-2 whitespace-pre-wrap wrap-break-word text-sm text-slate-800">
                                                {selectedPass.doctor_notes}
                                            </p>
                                        </div>
                                    )}
                                </section>
                            )}

                            {/* ACTION */}
                            {normalizeStatus(
                                selectedPass.status_health_pass
                            ) === "REDEEMED" && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            openFinish(selectedPass)
                                        }
                                        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
                                    >
                                        <ClipboardCheck size={18} />
                                        Finish Treatment
                                    </button>
                                )}

                            <button
                                type="button"
                                onClick={closeDetail}
                                className="w-full cursor-pointer rounded-xl border border-blue-200 bg-white px-5 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {finishPass && (
                <div
                    role="presentation"
                    className="fixed inset-0 z-110 flex items-center justify-center bg-slate-950/60 p-4"
                    onClick={closeFinish}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="finish-treatment-title"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl"
                    >
                        {/* MODAL HEADER */}
                        <div className="flex items-start justify-between gap-3 border-b border-blue-100 bg-blue-50 px-6 py-5">
                            <div>
                                <h2
                                    id="finish-treatment-title"
                                    className="flex items-center gap-2 text-lg font-bold text-slate-900"
                                >
                                    <ClipboardCheck
                                        size={22}
                                        className="text-blue-600"
                                    />
                                    Selesaikan Treatment
                                </h2>

                                <p className="mt-1 text-xs text-blue-700">
                                    Verifikasi OTP pasien sebelum
                                    mengubah status menjadi FINISHED
                                </p>
                            </div>

                            <button
                                type="button"
                                disabled={finishing || otpSending}
                                onClick={closeFinish}
                                aria-label="Tutup modal"
                                className="cursor-pointer rounded-full bg-white p-2 text-slate-500 disabled:opacity-50"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* MODAL CONTENT */}
                        <div className="space-y-5 p-6">
                            {/* HEALTH PASS INFO */}
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="break-all text-xs font-semibold text-blue-700">
                                    {finishPass.id_health_pass}
                                </p>

                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-bold text-slate-900">
                                        {finishPass.name_customer || "-"}
                                    </p>

                                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                        {finishPass.recipient_type ===
                                            "GUEST"
                                            ? "GUEST"
                                            : "CUSTOMER"}
                                    </span>
                                </div>

                                <p className="mt-1 text-sm text-slate-600">
                                    {finishPass.name_service || "-"}
                                </p>

                                <p className="mt-2 text-xs text-slate-500">
                                    Redeemed:{" "}
                                    {formatDate(
                                        finishPass.redeemed_at
                                    )}
                                </p>
                            </div>

                            {/* OTP SECTION */}
                            <section className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                                        <LockKeyhole size={21} />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-sm font-bold text-slate-900">
                                            Verifikasi OTP Pasien
                                        </h3>

                                        <p className="mt-1 text-xs leading-5 text-slate-600">
                                            Untuk mencegah penyelesaian
                                            treatment tanpa persetujuan
                                            pasien, sistem akan mengirim
                                            kode OTP ke email penerima
                                            layanan.
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 rounded-xl border border-blue-100 bg-white p-3">
                                    <p className="text-xs text-slate-500">
                                        Email tujuan OTP
                                    </p>

                                    <div className="mt-1 flex items-center gap-2">
                                        <Mail
                                            size={16}
                                            className="shrink-0 text-blue-600"
                                        />

                                        <p className="min-w-0 break-all text-sm font-semibold text-slate-800">
                                            {finishPass.email_customer ||
                                                "Email tidak tersedia"}
                                        </p>
                                    </div>
                                </div>

                                {/* STEP 1: REQUEST OTP */}
                                {!otpSent && (
                                    <div className="mt-4">
                                        <button
                                            type="button"
                                            disabled={
                                                otpSending ||
                                                finishing ||
                                                !finishPass.email_customer
                                            }
                                            onClick={() =>
                                                void requestFinishOtp()
                                            }
                                            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {otpSending ? (
                                                <Loader2
                                                    size={17}
                                                    className="animate-spin"
                                                />
                                            ) : (
                                                <Send size={17} />
                                            )}

                                            {otpSending
                                                ? "Mengirim OTP..."
                                                : "Kirim OTP ke Email Pasien"}
                                        </button>

                                        <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                                            Pastikan treatment sudah selesai
                                            sebelum meminta pasien
                                            memberikan kode OTP.
                                        </p>
                                    </div>
                                )}

                                {/* STEP 2: VERIFY OTP */}
                                {otpSent && (
                                    <div className="mt-4 space-y-4">
                                        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                                            <CheckCircle2
                                                size={18}
                                                className="mt-0.5 shrink-0 text-emerald-600"
                                            />

                                            <div>
                                                <p className="text-sm font-bold text-emerald-800">
                                                    OTP Berhasil Dikirim
                                                </p>

                                                <p className="mt-1 break-all text-xs text-emerald-700">
                                                    Kode telah dikirim ke{" "}
                                                    {otpRecipient}.
                                                </p>
                                            </div>
                                        </div>

                                        <div>
                                            <label
                                                htmlFor="finish-otp-code"
                                                className="flex items-center gap-2 text-sm font-bold text-slate-800"
                                            >
                                                <KeyRound size={17} />
                                                Kode OTP
                                                <span className="text-red-600">
                                                    *
                                                </span>
                                            </label>

                                            <p className="mt-1 text-xs text-slate-500">
                                                Minta pasien memberikan kode
                                                enam digit setelah memastikan
                                                treatment selesai.
                                            </p>

                                            <input
                                                id="finish-otp-code"
                                                type="text"
                                                inputMode="numeric"
                                                autoComplete="one-time-code"
                                                maxLength={6}
                                                value={otpCode}
                                                disabled={
                                                    finishing || otpExpired
                                                }
                                                onChange={(event) => {
                                                    const value =
                                                        event.target.value
                                                            .replace(/\D/g, "")
                                                            .slice(0, 6);

                                                    setOtpCode(value);
                                                    setFinishError("");
                                                }}
                                                placeholder="000000"
                                                className="mt-3 h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-center text-2xl font-bold tracking-[0.35em] text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between gap-3">
                                            <div
                                                className={`flex items-center gap-2 text-xs font-semibold ${otpExpired
                                                    ? "text-red-600"
                                                    : "text-blue-700"
                                                    }`}
                                            >
                                                <Clock3 size={15} />

                                                {otpExpired
                                                    ? "OTP kedaluwarsa"
                                                    : `Berlaku ${String(
                                                        Math.floor(
                                                            otpSecondsLeft / 60
                                                        )
                                                    ).padStart(2, "0")}:${String(
                                                        otpSecondsLeft % 60
                                                    ).padStart(2, "0")}`}
                                            </div>

                                            <button
                                                type="button"
                                                disabled={
                                                    otpSending || finishing
                                                }
                                                onClick={() =>
                                                    void requestFinishOtp()
                                                }
                                                className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 disabled:opacity-50"
                                            >
                                                {otpSending ? (
                                                    <Loader2
                                                        size={14}
                                                        className="animate-spin"
                                                    />
                                                ) : (
                                                    <RotateCw size={14} />
                                                )}
                                                Kirim Ulang OTP
                                            </button>
                                        </div>

                                        {otpExpired && (
                                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                                                Kode OTP telah melewati batas
                                                waktu lima menit. Silakan
                                                kirim OTP baru untuk
                                                melanjutkan.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </section>

                            {/* DOCTOR NOTES */}
                            <section>
                                <label
                                    htmlFor="finish-doctor-notes"
                                    className="flex items-center gap-2 text-sm font-bold text-slate-800"
                                >
                                    <FileText size={17} />
                                    Catatan Treatment
                                    <span className="text-red-600">
                                        *
                                    </span>
                                </label>

                                <p className="mt-1 text-xs text-slate-500">
                                    Isi catatan penyelesaian pelayanan
                                    (maksimal 10.000 karakter).
                                </p>

                                <textarea
                                    id="finish-doctor-notes"
                                    rows={5}
                                    maxLength={10000}
                                    value={doctorNotes}
                                    disabled={finishing}
                                    onChange={(event) => {
                                        setDoctorNotes(
                                            event.target.value
                                        );
                                        setFinishError("");
                                    }}
                                    placeholder="Tuliskan tindakan dan informasi penyelesaian treatment..."
                                    className="mt-3 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                                />

                                <p className="mt-1 text-right text-xs text-slate-400">
                                    {doctorNotes.length.toLocaleString(
                                        "id-ID"
                                    )}
                                    /10.000
                                </p>
                            </section>

                            {/* INFORMATION */}
                            <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3">
                                <ShieldCheck
                                    size={17}
                                    className="mt-0.5 shrink-0 text-amber-600"
                                />

                                <p className="text-xs leading-5 text-amber-800">
                                    Konfirmasi FINISHED hanya dapat
                                    dilakukan setelah OTP pasien valid
                                    dan catatan treatment sudah diisi.
                                    Pastikan tindakan memang telah
                                    selesai sebelum meminta OTP.
                                </p>
                            </div>

                            {/* ERROR */}
                            {finishError && (
                                <div
                                    role="alert"
                                    className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                                >
                                    <AlertCircle
                                        size={17}
                                        className="mt-0.5 shrink-0"
                                    />

                                    <p>{finishError}</p>
                                </div>
                            )}

                            {/* ACTIONS */}
                            <div className="flex flex-col-reverse gap-2 sm:flex-row">
                                <button
                                    type="button"
                                    disabled={
                                        finishing || otpSending
                                    }
                                    onClick={closeFinish}
                                    className="flex-1 cursor-pointer rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Batal
                                </button>

                                <button
                                    type="button"
                                    disabled={
                                        finishing ||
                                        otpSending ||
                                        !doctorNotes.trim() ||
                                        !otpValid
                                    }
                                    onClick={() =>
                                        void finishTreatment()
                                    }
                                    className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {finishing ? (
                                        <Loader2
                                            size={17}
                                            className="animate-spin"
                                        />
                                    ) : (
                                        <CheckCircle2 size={17} />
                                    )}

                                    {finishing
                                        ? "Memverifikasi..."
                                        : "Konfirmasi FINISHED"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Redemptions;
