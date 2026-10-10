
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";

import {
    Ticket,
    Search,
    CalendarDays,
    Clock3,
    Building2,
    CheckCircle2,
    AlertCircle,
    Loader2,
    RefreshCw,
    QrCode,
    X,
    ShieldCheck,
    Package,
    ChevronRight,
} from "lucide-react";

import { isTokenExpired } from "../../utils/auth";

interface HealthPass {
    id_health_pass: string;
    status_health_pass: string;

    valid_from: string;
    valid_until: string;
    booking_at: string | null;

    redeemed_at: string | null;
    redeemed_by: string | number | null;

    id_order: string;
    id_customer: number;
    id_service: number;

    payment_status: string;
    order_status: string;

    name_customer: string;
    name_service: string;
    price_service: string | number;
    image_service: string | null;
    description_service?: string | null;

    id_provider: number;
    name_provider: string;

    qr_token: string | null;
}

interface HealthPassResponse {
    success: boolean;
    data: HealthPass[];
    message?: string;
}

type PassFilter =
    | "ALL"
    | "ACTIVE"
    | "REDEEMED"
    | "EXPIRED";

type DisplayStatus =
    | "ACTIVE"
    | "UPCOMING"
    | "REDEEMED"
    | "EXPIRED"
    | "INACTIVE";

const API_BASE_URL = String(
    import.meta.env.VITE_API_URI || ""
).replace(/\/+$/, "");

const formatRupiah = (
    value: string | number
): string => {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
        return "Rp0";
    }

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(amount);
};

const formatDate = (
    value: string | null | undefined,
    withTime = false
): string => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

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
    }).format(date);
};

const getDisplayStatus = (
    pass: HealthPass,
    now: number
): DisplayStatus => {
    const status = (
        pass.status_health_pass || ""
    ).toUpperCase();

    if (
        status === "REDEEMED" ||
        Boolean(pass.redeemed_at)
    ) {
        return "REDEEMED";
    }

    if (status === "EXPIRED") {
        return "EXPIRED";
    }

    if (status !== "ACTIVE") {
        return "INACTIVE";
    }

    const validFrom = new Date(
        pass.valid_from
    ).getTime();

    const validUntil = new Date(
        pass.valid_until
    ).getTime();

    if (
        !Number.isFinite(validFrom) ||
        !Number.isFinite(validUntil) ||
        validUntil <= validFrom
    ) {
        return "INACTIVE";
    }

    if (now >= validUntil) {
        return "EXPIRED";
    }

    if (now < validFrom) {
        return "UPCOMING";
    }

    return "ACTIVE";
};

const getStatusInfo = (
    status: DisplayStatus
) => {
    switch (status) {
        case "ACTIVE":
            return {
                label: "Aktif",
                className:
                    "bg-emerald-50 text-emerald-700",
            };

        case "UPCOMING":
            return {
                label: "Belum Berlaku",
                className:
                    "bg-blue-50 text-blue-700",
            };

        case "REDEEMED":
            return {
                label: "Sudah Digunakan",
                className:
                    "bg-slate-100 text-slate-600",
            };

        case "EXPIRED":
            return {
                label: "Kedaluwarsa",
                className:
                    "bg-red-50 text-red-600",
            };

        default:
            return {
                label: "Tidak Aktif",
                className:
                    "bg-amber-50 text-amber-700",
            };
    }
};

const canOpenPass = (
    pass: HealthPass,
    now: number
): boolean => {
    return (
        getDisplayStatus(pass, now) === "ACTIVE" &&
        pass.payment_status === "APPROVED" &&
        pass.order_status === "APPROVED"
    );
};

const canShowPassQR = (
    pass: HealthPass,
    now: number
): boolean => {
    return (
        canOpenPass(pass, now) &&
        Boolean(pass.qr_token?.trim())
    );
};

const HealthPasses = () => {
    const navigate = useNavigate();

    const [passes, setPasses] = useState<
        HealthPass[]
    >([]);

    const [loading, setLoading] = useState(true);

    const [errorMessage, setErrorMessage] =
        useState("");

    const [searchKeyword, setSearchKeyword] =
        useState("");

    const [selectedFilter, setSelectedFilter] =
        useState<PassFilter>("ALL");

    const [selectedPassId, setSelectedPassId] =
        useState<string | null>(null);

    const [refreshKey, setRefreshKey] =
        useState(0);

    const [refreshingQR, setRefreshingQR] =
        useState(false);

    const [refreshQRError, setRefreshQRError] =
        useState("");

    const [refreshQRSuccess, setRefreshQRSuccess] =
        useState("");

    const [now, setNow] = useState(
        () => Date.now()
    );

    const redirectToLogin = () => {
        sessionStorage.removeItem(
            "customer_token"
        );

        localStorage.removeItem(
            "customer_data"
        );

        navigate(
            "/customer/sign-in?redirect=%2Fcustomer%2Fhealth-pass",
            { replace: true }
        );
    };

    useEffect(() => {
        const controller = new AbortController();

        const fetchHealthPasses = async () => {
            setLoading(true);
            setErrorMessage("");
            setNow(Date.now());

            const token = sessionStorage.getItem(
                "customer_token"
            );

            if (
                !token ||
                isTokenExpired(token)
            ) {
                redirectToLogin();
                return;
            }

            try {
                const response = await fetch(
                    `${API_BASE_URL}/health-passes/my`,
                    {
                        method: "GET",
                        headers: {
                            Accept: "application/json",
                            Authorization:
                                `Bearer ${token}`,
                        },
                        signal: controller.signal,
                        cache: "no-store",
                    }
                );

                if (controller.signal.aborted) {
                    return;
                }

                if (response.status === 401) {
                    redirectToLogin();
                    return;
                }

                const result =
                    (await response.json()) as HealthPassResponse;

                if (
                    !response.ok ||
                    !result.success
                ) {
                    throw new Error(
                        result.message ||
                        `Gagal mengambil Health Pass (${response.status})`
                    );
                }

                if (!Array.isArray(result.data)) {
                    throw new Error(
                        "Format response Health Pass tidak valid."
                    );
                }

                if (controller.signal.aborted) {
                    return;
                }

                setPasses(result.data);
                setNow(Date.now());
            } catch (error) {
                if (controller.signal.aborted) {
                    return;
                }

                console.error(
                    "[HEALTH PASSES ERROR]",
                    error
                );

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Gagal mengambil Health Pass."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        void fetchHealthPasses();

        return () => {
            controller.abort();
        };
    }, [navigate, refreshKey]);

    useEffect(() => {
        const interval = window.setInterval(
            () => {
                setNow(Date.now());
            },
            60_000
        );

        return () => {
            window.clearInterval(interval);
        };
    }, []);

    const filters: {
        label: string;
        value: PassFilter;
    }[] = [
            {
                label: "Semua",
                value: "ALL",
            },
            {
                label: "Aktif",
                value: "ACTIVE",
            },
            {
                label: "Digunakan",
                value: "REDEEMED",
            },
            {
                label: "Kedaluwarsa",
                value: "EXPIRED",
            },
        ];

    const filteredPasses = useMemo(() => {
        const keyword = searchKeyword
            .trim()
            .toLowerCase();

        return passes
            .filter((pass) => {
                const status =
                    getDisplayStatus(pass, now);

                let matchesStatus = true;

                if (
                    selectedFilter === "ACTIVE"
                ) {
                    matchesStatus =
                        status === "ACTIVE";
                } else if (
                    selectedFilter === "REDEEMED"
                ) {
                    matchesStatus =
                        status === "REDEEMED";
                } else if (
                    selectedFilter === "EXPIRED"
                ) {
                    matchesStatus =
                        status === "EXPIRED";
                }

                const content = [
                    pass.id_health_pass,
                    pass.id_order,
                    pass.name_service,
                    pass.name_provider,
                ]
                    .join(" ")
                    .toLowerCase();

                const matchesSearch =
                    !keyword ||
                    content.includes(keyword);

                return (
                    matchesStatus &&
                    matchesSearch
                );
            })
            .sort((a, b) => {
                const timeA = new Date(
                    a.booking_at ||
                    a.valid_from
                ).getTime();

                const timeB = new Date(
                    b.booking_at ||
                    b.valid_from
                ).getTime();

                return (
                    (Number.isFinite(timeB)
                        ? timeB
                        : 0) -
                    (Number.isFinite(timeA)
                        ? timeA
                        : 0)
                );
            });
    }, [
        passes,
        selectedFilter,
        searchKeyword,
        now,
    ]);

    const activeCount = passes.filter(
        (pass) =>
            getDisplayStatus(
                pass,
                now
            ) === "ACTIVE"
    ).length;

    const selectedPass =
        passes.find(
            (pass) =>
                pass.id_health_pass ===
                selectedPassId
        ) ?? null;

    const selectedCanShowQR =
        selectedPass
            ? canShowPassQR(
                selectedPass,
                now
            )
            : false;

    const handleShowQR = (
        pass: HealthPass
    ) => {
        const currentTime = Date.now();

        setNow(currentTime);

        if (
            !canOpenPass(
                pass,
                currentTime
            )
        ) {
            return;
        }

        setRefreshQRError("");
        setRefreshQRSuccess("");

        setSelectedPassId(
            pass.id_health_pass
        );
    };

    const handleCloseQR = () => {
        if (refreshingQR) return;

        setSelectedPassId(null);
        setRefreshQRError("");
        setRefreshQRSuccess("");
    };

    const handleRefresh = () => {
        if (loading || refreshingQR) {
            return;
        }

        setRefreshKey(
            (previous) => previous + 1
        );
    };

    const handleRefreshQR = async () => {
        if (
            !selectedPassId ||
            refreshingQR
        ) {
            return;
        }

        const token =
            sessionStorage.getItem(
                "customer_token"
            );

        if (
            !token ||
            isTokenExpired(token)
        ) {
            redirectToLogin();
            return;
        }

        setRefreshingQR(true);
        setRefreshQRError("");
        setRefreshQRSuccess("");

        try {
            const response = await fetch(
                `${API_BASE_URL}/health-passes/my`,
                {
                    method: "GET",
                    headers: {
                        Accept:
                            "application/json",
                        Authorization:
                            `Bearer ${token}`,
                    },
                    cache: "no-store",
                }
            );

            if (
                response.status === 401
            ) {
                redirectToLogin();
                return;
            }

            const result =
                (await response.json()) as HealthPassResponse;

            if (
                !response.ok ||
                !result.success
            ) {
                throw new Error(
                    result.message ||
                    `Gagal memperbarui QR Code (${response.status})`
                );
            }

            if (
                !Array.isArray(
                    result.data
                )
            ) {
                throw new Error(
                    "Format response Health Pass tidak valid."
                );
            }

            // Update seluruh data dari backend
            setPasses(result.data);

            const currentTime =
                Date.now();

            setNow(currentTime);

            // Cari Health Pass yang modalnya sedang dibuka
            const updatedPass =
                result.data.find(
                    (pass) =>
                        pass.id_health_pass ===
                        selectedPassId
                );

            if (!updatedPass) {
                setSelectedPassId(null);

                setErrorMessage(
                    "Health Pass tidak ditemukan setelah pembaruan."
                );

                return;
            }

            if (
                !canOpenPass(
                    updatedPass,
                    currentTime
                )
            ) {
                setRefreshQRError(
                    "Health Pass sudah tidak dapat digunakan. Periksa status terbarunya."
                );

                return;
            }

            if (
                !updatedPass.qr_token?.trim()
            ) {
                setRefreshQRError(
                    "QR Code masih belum tersedia dari server. Silakan coba beberapa saat lagi."
                );

                return;
            }

            setRefreshQRSuccess(
                "Data Health Pass berhasil diperbarui."
            );
        } catch (error) {
            console.error(
                "[REFRESH HEALTH PASS ERROR]",
                error
            );

            setRefreshQRError(
                error instanceof Error
                    ? error.message
                    : "Gagal memperbarui QR Code."
            );
        } finally {
            setRefreshingQR(false);
        }
    };

    return (
        <div className="min-h-[60vh] bg-slate-50 pb-8">
            <section className="bg-linear-to-br from-cyan-50 via-sky-50 to-blue-50 px-5 pb-6 pt-6">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                            STIQR Health
                        </p>

                        <h2 className="mt-2 text-xl font-extrabold text-slate-900">
                            Health Pass Saya
                        </h2>

                        <p className="mt-2 text-xs leading-5 text-slate-500">
                            Akses tiket digital layanan
                            kesehatan yang telah Anda pesan.
                        </p>
                    </div>

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                        <Ticket size={25} />
                    </div>
                </div>

                {/* SUMMARY */}
                <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-blue-100 bg-white p-4">
                        <p className="text-xs text-slate-500">
                            Total Health Pass
                        </p>

                        <p className="mt-1 text-2xl font-extrabold text-slate-900">
                            {loading
                                ? "..."
                                : passes.length}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-emerald-100 bg-white p-4">
                        <p className="text-xs text-slate-500">
                            Sedang Aktif
                        </p>

                        <p className="mt-1 text-2xl font-extrabold text-emerald-600">
                            {loading
                                ? "..."
                                : activeCount}
                        </p>
                    </div>
                </div>
            </section>

            <section className="bg-white px-5 py-5">
                <div className="flex items-center gap-3">
                    {/* SEARCH */}
                    <div className="relative min-w-0 flex-1">
                        <Search
                            size={18}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                            type="text"
                            value={
                                searchKeyword
                            }
                            onChange={(
                                event
                            ) =>
                                setSearchKeyword(
                                    event.target.value
                                )
                            }
                            placeholder="Cari Health Pass..."
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    {/* REFRESH ALL */}
                    <button
                        type="button"
                        onClick={
                            handleRefresh
                        }
                        disabled={
                            loading ||
                            refreshingQR
                        }
                        aria-label="Refresh Health Pass"
                        title="Refresh Health Pass"
                        className="cursor-pointer flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <RefreshCw
                            size={19}
                            className={
                                loading
                                    ? "animate-spin"
                                    : ""
                            }
                        />
                    </button>
                </div>

                {/* FILTER */}
                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                    {filters.map(
                        (filter) => {
                            const active =
                                selectedFilter ===
                                filter.value;

                            return (
                                <button
                                    key={
                                        filter.value
                                    }
                                    type="button"
                                    onClick={() =>
                                        setSelectedFilter(
                                            filter.value
                                        )
                                    }
                                    aria-pressed={
                                        active
                                    }
                                    className={`cursor-pointer shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${active
                                        ? "border-blue-600 bg-blue-600 text-white"
                                        : "border-slate-200 bg-white text-slate-500 hover:border-blue-300"
                                        }`}
                                >
                                    {
                                        filter.label
                                    }
                                </button>
                            );
                        }
                    )}
                </div>
            </section>

            <section className="px-5 py-5">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-base font-extrabold text-slate-900">
                        Daftar Health Pass
                    </h3>

                    {!loading && (
                        <span className="text-xs font-semibold text-blue-600">
                            {
                                filteredPasses.length
                            }{" "}
                            pass
                        </span>
                    )}
                </div>

                {/* LOADING */}
                {loading && (
                    <div className="flex flex-col items-center justify-center gap-3 py-20">
                        <Loader2
                            size={32}
                            className="animate-spin text-blue-600"
                        />

                        <p className="text-sm text-slate-500">
                            Memuat Health Pass...
                        </p>
                    </div>
                )}

                {/* ERROR */}
                {!loading &&
                    errorMessage && (
                        <div className="rounded-2xl border border-red-100 bg-white p-6 text-center">
                            <AlertCircle
                                size={36}
                                className="mx-auto text-red-400"
                            />

                            <h4 className="mt-3 text-sm font-bold text-slate-800">
                                Gagal memuat Health Pass
                            </h4>

                            <p className="mt-2 text-xs leading-5 text-slate-500">
                                {
                                    errorMessage
                                }
                            </p>

                            <button
                                type="button"
                                onClick={
                                    handleRefresh
                                }
                                className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-xs font-bold text-white"
                            >
                                Coba Lagi
                            </button>
                        </div>
                    )}

                {/* EMPTY STATE */}
                {!loading &&
                    !errorMessage &&
                    filteredPasses.length ===
                    0 && (
                        <div className="rounded-2xl border border-slate-100 bg-white px-6 py-14 text-center">
                            <Package
                                size={42}
                                className="mx-auto text-slate-300"
                            />

                            <h3 className="mt-4 text-base font-bold text-slate-800">
                                {passes.length ===
                                    0
                                    ? "Belum Ada Health Pass"
                                    : "Health Pass Tidak Ditemukan"}
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                {passes.length ===
                                    0
                                    ? "Health Pass akan tersedia setelah pesanan berhasil diproses."
                                    : "Tidak ada Health Pass sesuai filter atau pencarian."}
                            </p>

                            {passes.length ===
                                0 && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            navigate(
                                                "/customer/home"
                                            )
                                        }
                                        className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white"
                                    >
                                        Jelajahi Layanan
                                    </button>
                                )}
                        </div>
                    )}

                {!loading &&
                    !errorMessage &&
                    filteredPasses.length >
                    0 && (
                        <div className="space-y-4">
                            {filteredPasses.map(
                                (pass) => {
                                    const status =
                                        getDisplayStatus(
                                            pass,
                                            now
                                        );

                                    const statusInfo =
                                        getStatusInfo(
                                            status
                                        );

                                    const canOpen =
                                        canOpenPass(
                                            pass,
                                            now
                                        );

                                    const hasQR =
                                        Boolean(
                                            pass.qr_token?.trim()
                                        );

                                    return (
                                        <article
                                            key={
                                                pass.id_health_pass
                                            }
                                            className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
                                        >
                                            {/* HEADER */}
                                            <div className="flex items-center justify-between gap-3 border-b border-dashed border-slate-200 bg-blue-50/50 px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <Ticket
                                                        size={
                                                            18
                                                        }
                                                        className="text-blue-600"
                                                    />

                                                    <span className="text-xs font-extrabold text-blue-700">
                                                        HEALTH
                                                        PASS
                                                    </span>
                                                </div>

                                                <span
                                                    className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${statusInfo.className}`}
                                                >
                                                    {
                                                        statusInfo.label
                                                    }
                                                </span>
                                            </div>

                                            {/* BODY */}
                                            <div className="p-4">
                                                {/* SERVICE */}
                                                <div className="flex gap-3">
                                                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                                                        {pass.image_service ? (
                                                            <img
                                                                src={
                                                                    pass.image_service
                                                                }
                                                                alt={
                                                                    pass.name_service
                                                                }
                                                                className="h-full w-full object-cover"
                                                                loading="lazy"
                                                            />
                                                        ) : (
                                                            <div className="flex h-full items-center justify-center text-3xl">
                                                                🏥
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="line-clamp-2 text-sm font-extrabold text-slate-900">
                                                            {
                                                                pass.name_service
                                                            }
                                                        </h4>

                                                        <div className="mt-2 flex items-start gap-1 text-xs text-blue-600">
                                                            <Building2
                                                                size={
                                                                    14
                                                                }
                                                                className="shrink-0"
                                                            />

                                                            <span className="line-clamp-2">
                                                                {
                                                                    pass.name_provider
                                                                }
                                                            </span>
                                                        </div>

                                                        <p className="mt-2 text-sm font-extrabold text-slate-900">
                                                            {formatRupiah(
                                                                pass.price_service
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* INFORMATION */}
                                                <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-3">
                                                    {/* BOOKING */}
                                                    <div className="flex items-start justify-between gap-3">
                                                        <span className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                                                            <CalendarDays
                                                                size={
                                                                    15
                                                                }
                                                            />
                                                            Booking
                                                        </span>

                                                        <span className="text-right text-xs font-semibold text-slate-800">
                                                            {formatDate(
                                                                pass.booking_at,
                                                                true
                                                            )}
                                                        </span>
                                                    </div>

                                                    {/* VALIDITY */}
                                                    <div className="flex items-start justify-between gap-3">
                                                        <span className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                                                            <Clock3
                                                                size={
                                                                    15
                                                                }
                                                            />
                                                            Berlaku
                                                        </span>

                                                        <span className="text-right text-xs font-semibold text-slate-800">
                                                            {formatDate(
                                                                pass.valid_from
                                                            )}
                                                            {
                                                                " - "
                                                            }
                                                            {formatDate(
                                                                pass.valid_until
                                                            )}
                                                        </span>
                                                    </div>

                                                    {/* REDEEM */}
                                                    {pass.redeemed_at && (
                                                        <div className="flex items-start justify-between gap-3">
                                                            <span className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                                                                <CheckCircle2
                                                                    size={
                                                                        15
                                                                    }
                                                                />
                                                                Digunakan
                                                            </span>

                                                            <span className="text-right text-xs font-semibold text-slate-800">
                                                                {formatDate(
                                                                    pass.redeemed_at,
                                                                    true
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* ID */}
                                                <p className="mt-4 truncate text-[10px] text-slate-400">
                                                    ID Pass:{" "}
                                                    {
                                                        pass.id_health_pass
                                                    }
                                                </p>

                                                {/* QR BUTTON */}
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleShowQR(
                                                            pass
                                                        )
                                                    }
                                                    disabled={
                                                        !canOpen
                                                    }
                                                    className={`cursor-pointer mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${canOpen
                                                        ? "bg-blue-600 text-white hover:bg-blue-700"
                                                        : "cursor-not-allowed bg-slate-100 text-slate-400"
                                                        }`}
                                                >
                                                    {canOpen ? (
                                                        <>
                                                            <QrCode
                                                                size={
                                                                    18
                                                                }
                                                            />

                                                            {hasQR
                                                                ? "Tampilkan QR Code"
                                                                : "Periksa QR Code"}

                                                            <ChevronRight
                                                                size={
                                                                    16
                                                                }
                                                            />
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Ticket
                                                                size={
                                                                    18
                                                                }
                                                            />

                                                            {status ===
                                                                "REDEEMED"
                                                                ? "Sudah Digunakan"
                                                                : status ===
                                                                    "EXPIRED"
                                                                    ? "Masa Berlaku Habis"
                                                                    : status ===
                                                                        "UPCOMING"
                                                                        ? "Belum Berlaku"
                                                                        : "QR Tidak Tersedia"}
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </article>
                                    );
                                }
                            )}
                        </div>
                    )}
            </section>

            {selectedPass && (
                <div
                    className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4"
                    role="presentation"
                    onClick={
                        handleCloseQR
                    }
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="health-pass-modal-title"
                        className="max-h-[90vh] w-full max-w-105 overflow-y-auto rounded-3xl bg-white p-5 shadow-xl"
                        onClick={(
                            event
                        ) =>
                            event.stopPropagation()
                        }
                    >
                        {/* MODAL HEADER */}
                        <div className="flex items-center justify-between gap-3">
                            <h3
                                id="health-pass-modal-title"
                                className="text-lg font-extrabold text-slate-900"
                            >
                                Health Pass Digital
                            </h3>

                            <button
                                type="button"
                                onClick={
                                    handleCloseQR
                                }
                                disabled={
                                    refreshingQR
                                }
                                aria-label="Tutup QR Code"
                                className="cursor-pointer flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 disabled:opacity-50"
                            >
                                <X
                                    size={20}
                                />
                            </button>
                        </div>

                        {/* SERVICE */}
                        <div className="mt-5 text-center">
                            <h4 className="text-base font-extrabold text-slate-900">
                                {
                                    selectedPass.name_service
                                }
                            </h4>

                            <p className="mt-1 text-xs text-slate-500">
                                {
                                    selectedPass.name_provider
                                }
                            </p>
                        </div>

                        {selectedCanShowQR &&
                            selectedPass.qr_token ? (
                            <>
                                <div className="mx-auto mt-6 flex w-fit items-center justify-center rounded-2xl border border-slate-200 bg-white p-4">
                                    <QRCodeSVG
                                        value={
                                            selectedPass.qr_token
                                        }
                                        size={
                                            220
                                        }
                                        level="M"
                                        marginSize={
                                            1
                                        }
                                        title="QR Health Pass"
                                    />
                                </div>

                                <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                                    Tunjukkan QR
                                    Code ini
                                    kepada petugas
                                    provider saat
                                    menggunakan
                                    layanan.
                                </p>
                            </>
                        ) : (
                            <div className="mt-6 rounded-xl bg-amber-50 p-4 text-center">
                                <AlertCircle
                                    size={
                                        30
                                    }
                                    className="mx-auto text-amber-500"
                                />

                                <p className="mt-3 text-sm font-semibold text-amber-800">
                                    QR Code Tidak Tersedia
                                </p>

                                <p className="mt-2 text-xs leading-5 text-amber-700">
                                    QR Code belum
                                    tersedia atau
                                    Health Pass
                                    tidak dapat
                                    digunakan.
                                    Coba perbarui
                                    data terlebih
                                    dahulu.
                                </p>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={
                                handleRefreshQR
                            }
                            disabled={
                                refreshingQR
                            }
                            className="cursor-pointer mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-600 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <RefreshCw
                                size={18}
                                className={
                                    refreshingQR
                                        ? "animate-spin"
                                        : ""
                                }
                            />

                            {refreshingQR
                                ? "Memperbarui QR Code..."
                                : "Refresh QR Code"}
                        </button>

                        {/* REFRESH ERROR */}
                        {refreshQRError && (
                            <div
                                role="alert"
                                className="mt-3 rounded-xl bg-red-50 p-3 text-center text-xs leading-5 text-red-600"
                            >
                                {
                                    refreshQRError
                                }
                            </div>
                        )}

                        {/* REFRESH SUCCESS */}
                        {refreshQRSuccess && (
                            <div
                                role="status"
                                className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700"
                            >
                                <CheckCircle2
                                    size={16}
                                />

                                {
                                    refreshQRSuccess
                                }
                            </div>
                        )}

                        <div className="mt-6 space-y-3 rounded-2xl bg-slate-50 p-4">
                            {/* CUSTOMER */}
                            <div className="flex justify-between gap-3">
                                <span className="text-xs text-slate-500">
                                    Nama Customer
                                </span>

                                <span className="text-right text-xs font-bold text-slate-800">
                                    {
                                        selectedPass.name_customer
                                    }
                                </span>
                            </div>

                            {/* BOOKING */}
                            <div className="flex justify-between gap-3">
                                <span className="text-xs text-slate-500">
                                    Jadwal Booking
                                </span>

                                <span className="text-right text-xs font-bold text-slate-800">
                                    {formatDate(
                                        selectedPass.booking_at,
                                        true
                                    )}
                                </span>
                            </div>

                            {/* VALID UNTIL */}
                            <div className="flex justify-between gap-3">
                                <span className="text-xs text-slate-500">
                                    Berlaku Sampai
                                </span>

                                <span className="text-right text-xs font-bold text-slate-800">
                                    {formatDate(
                                        selectedPass.valid_until,
                                        true
                                    )}
                                </span>
                            </div>
                        </div>

                        {/* SECURITY INFO */}
                        <div className="mt-4 flex items-start gap-2 rounded-xl bg-blue-50 p-3">
                            <ShieldCheck
                                size={18}
                                className="shrink-0 text-blue-600"
                            />

                            <p className="text-xs leading-5 text-blue-700">
                                QR Code digunakan
                                untuk verifikasi
                                oleh provider.
                                Jangan membagikan
                                QR Code kepada
                                orang lain.
                            </p>
                        </div>

                        {/* CLOSE */}
                        <button
                            type="button"
                            onClick={
                                handleCloseQR
                            }
                            disabled={
                                refreshingQR
                            }
                            className="cursor-pointer mt-5 w-full rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HealthPasses;
