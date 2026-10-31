import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import { QRCodeSVG } from "qrcode.react";

import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    Clock3,
    Copy,
    Loader2,
    PartyPopper,
    QrCode,
    RefreshCw,
    ShieldCheck,
} from "lucide-react";

import { isTokenExpired } from "../../utils/auth";

type Recipient = "SELF" | "GUEST";

type PaymentView =
    | "GENERATING"
    | "PENDING"
    | "VERIFYING"
    | "EXPIRED"
    | "UNKNOWN"
    | "FAILED"
    | "SUCCESS";

interface GuestForm {
    name_guest: string;
    email_guest: string;
    gender_guest: string;
    phone_number_guest: string;
}

interface CheckoutData {
    id_service: number;
    service_name: string;
    provider_name: string;
    display_amount: number;
    booking_at: string;
    booking_display: string;
    recipient: Recipient;
    patient_name: string;
    patient_email: string;
    id_guest: number | null;
    guest_form: GuestForm | null;
}

interface PaymentRecord {
    id_order: string;
    partner_reference_no: string;
    payment_method: string;
    payment_status: string;
    amount: number;
    currency: string;
    qr_content: string;
    qr_url: string | null;
    merchant_name: string | null;
    expired_at: string | null;
    created_local_at: number;
}

interface PaymentStatusData {
    id_order: string;
    payment_status: string;
    middleware_status?: string | null;
    payment_confirmation?: string | null;
    paid_at?: string | null;
}

interface CancelResult {
    id_order: string;
    payment_status: string;
    cancellation_status: string;
    can_leave: boolean;
}

interface ApiResponse<T> {
    success?: boolean;
    message?: string;
    data?: T;
}

const API_BASE = String(
    import.meta.env.VITE_API_URI ?? ""
).replace(/\/+$/, "");

const CHECKOUT_KEY =
    "stiqr_health_qris_checkout";

const PAYMENT_KEY =
    "stiqr_health_qris_payment";

const ATTEMPT_KEY =
    "stiqr_health_qris_attempt";

const LAST_PENDING_KEY =
    "stiqr_health_last_pending_payment";

const PAYMENT_ESTIMATE_MS = 300000;
const POLL_INTERVAL_MS = 5000;

function readSession<T>(key: string): T | null {
    try {
        const value = sessionStorage.getItem(key);

        return value
            ? (JSON.parse(value) as T)
            : null;
    } catch {
        return null;
    }
}

function clearQrisSession() {
    sessionStorage.removeItem(CHECKOUT_KEY);
    sessionStorage.removeItem(PAYMENT_KEY);
    sessionStorage.removeItem(ATTEMPT_KEY);
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(value);
}

function formatTimer(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;

    return (
        `${String(minutes).padStart(2, "0")}:` +
        `${String(remainder).padStart(2, "0")}`
    );
}

function getDeadline(payment: PaymentRecord) {
    if (payment.expired_at) {
        const official = Date.parse(
            payment.expired_at
        );

        if (Number.isFinite(official)) {
            return official;
        }
    }

    return (
        payment.created_local_at +
        PAYMENT_ESTIMATE_MS
    );
}

async function apiRequest<T>(
    path: string,
    token: string,
    options: RequestInit = {}
): Promise<T> {
    const response = await fetch(
        `${API_BASE}${path}`,
        {
            ...options,
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
                ...(options.body
                    ? {
                        "Content-Type": "application/json",
                    }
                    : {}),
                ...options.headers,
            },
        }
    );

    let result: ApiResponse<T>;

    try {
        result =
            (await response.json()) as ApiResponse<T>;
    } catch {
        throw new Error(
            `Respons server tidak valid (HTTP ${response.status}).`
        );
    }

    if (
        !response.ok ||
        result.success === false ||
        result.data == null
    ) {
        const error = new Error(
            result.message ||
            `Permintaan gagal (HTTP ${response.status}).`
        ) as Error & {
            status?: number;
            data?: T;
        };

        error.status = response.status;
        error.data = result.data;

        throw error;
    }

    return result.data;
}

const Payment = () => {
    const navigate = useNavigate();

    const [checkout, setCheckout] =
        useState<CheckoutData | null>(() =>
            readSession<CheckoutData>(CHECKOUT_KEY)
        );

    const [payment, setPayment] =
        useState<PaymentRecord | null>(() =>
            readSession<PaymentRecord>(PAYMENT_KEY)
        );

    const [view, setView] =
        useState<PaymentView>(() => {
            const previous =
                readSession<PaymentRecord>(PAYMENT_KEY);

            if (previous?.payment_status === "APPROVED") {
                return "SUCCESS";
            }

            if (previous?.payment_status === "FAILED") {
                return "FAILED";
            }

            if (previous) {
                return "PENDING";
            }

            return sessionStorage.getItem(ATTEMPT_KEY)
                ? "UNKNOWN"
                : "GENERATING";
        });

    const [error, setError] = useState("");
    const [seconds, setSeconds] = useState(300);
    const [checking, setChecking] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [showCancelModal, setShowCancelModal] =
        useState(false);
    const [copied, setCopied] = useState(false);

    const createRef = useRef(false);
    const checkRef = useRef(false);
    const cancelRef = useRef(false);
    const finishedRef = useRef(false);
    const allowLeaveRef = useRef(false);

    const getToken = useCallback(() => {
        const token =
            sessionStorage.getItem("customer_token");

        if (!token || isTokenExpired(token)) {
            throw new Error(
                "Sesi login telah berakhir. Silakan login kembali."
            );
        }

        return token;
    }, []);

    const goHome = useCallback(() => {
        allowLeaveRef.current = true;

        navigate("/customer/home", {
            replace: true,
        });
    }, [navigate]);

    const goHealthPass = () => {
        allowLeaveRef.current = true;

        navigate("/customer/health-pass", {
            replace: true,
        });
    };

    const handleApproved = useCallback(() => {
        if (finishedRef.current) {
            return;
        }

        finishedRef.current = true;
        allowLeaveRef.current = true;

        // Hapus semua data checkout/transaksi QRIS.
        clearQrisSession();

        // Rekaman pending sebelumnya sudah selesai.
        localStorage.removeItem(LAST_PENDING_KEY);

        setError("");
        setShowCancelModal(false);
        setView("SUCCESS");

        console.info(
            "[QRIS] Payment approved and session cleared"
        );
    }, []);

    const checkPaymentStatus = useCallback(
        async () => {
            if (
                !payment?.id_order ||
                checkRef.current ||
                finishedRef.current
            ) {
                return;
            }

            checkRef.current = true;
            setChecking(true);

            try {
                const result =
                    await apiRequest<PaymentStatusData>(
                        `/api/nobu/qris/${encodeURIComponent(
                            payment.id_order
                        )}/status`,
                        getToken()
                    );

                const paymentStatus = String(
                    result.payment_status || ""
                ).toUpperCase();

                const middlewareStatus = String(
                    result.middleware_status || ""
                ).toLowerCase();

                if (paymentStatus === "APPROVED") {
                    handleApproved();
                    return;
                }

                if (paymentStatus === "FAILED") {
                    finishedRef.current = true;
                    allowLeaveRef.current = true;

                    clearQrisSession();
                    localStorage.removeItem(LAST_PENDING_KEY);

                    setView("FAILED");
                    setError("");

                    return;
                }

                if (
                    middlewareStatus === "success" ||
                    middlewareStatus === "paid"
                ) {
                    setView("VERIFYING");
                    setError("");
                    return;
                }

                if (
                    middlewareStatus === "expired" ||
                    middlewareStatus === "expire"
                ) {
                    setView("EXPIRED");
                    setError("");
                    return;
                }

                if (paymentStatus === "UNKNOWN") {
                    setView("UNKNOWN");
                    return;
                }

                setView("PENDING");
                setError("");
            } catch (reason) {
                setError(
                    reason instanceof Error
                        ? reason.message
                        : "Gagal memeriksa status pembayaran."
                );
            } finally {
                checkRef.current = false;
                setChecking(false);
            }
        },
        [
            payment?.id_order,
            getToken,
            handleApproved,
        ]
    );

    useEffect(() => {
        if (!payment?.id_order) return;

        if (
            view === "SUCCESS" ||
            view === "FAILED"
        ) {
            return;
        }

        void checkPaymentStatus();

        const interval = window.setInterval(
            () => {
                void checkPaymentStatus();
            },
            POLL_INTERVAL_MS
        );

        return () => {
            window.clearInterval(interval);
        };
    }, [
        payment?.id_order,
        view,
        checkPaymentStatus,
    ]);

    useEffect(() => {
        if (!payment) return;

        const update = () => {
            const remaining = Math.max(
                0,
                Math.ceil(
                    (getDeadline(payment) - Date.now()) /
                    1000
                )
            );

            setSeconds(remaining);
        };

        update();

        const timer = window.setInterval(
            update,
            1000
        );

        return () => {
            window.clearInterval(timer);
        };
    }, [payment]);

    useEffect(() => {
        if (
            !checkout ||
            payment ||
            view !== "GENERATING" ||
            createRef.current ||
            sessionStorage.getItem(ATTEMPT_KEY) ||
            sessionStorage.getItem(PAYMENT_KEY)
        ) {
            return;
        }

        createRef.current = true;

        const generate = async () => {
            try {
                const token = getToken();
                let guestId = checkout.id_guest;

                if (
                    checkout.recipient === "GUEST" &&
                    !guestId
                ) {
                    if (!checkout.guest_form) {
                        throw new Error(
                            "Data penerima layanan belum lengkap."
                        );
                    }

                    const guest = await apiRequest<{
                        id_guest: number;
                    }>(
                        "/guest/create",
                        token,
                        {
                            method: "POST",
                            body: JSON.stringify({
                                name_guest:
                                    checkout.guest_form.name_guest.trim(),

                                email_guest:
                                    checkout.guest_form.email_guest
                                        .trim()
                                        .toLowerCase(),

                                gender_guest:
                                    checkout.guest_form.gender_guest,

                                phone_number_guest:
                                    checkout.guest_form.phone_number_guest
                                        .trim() || null,
                            }),
                        }
                    );

                    guestId = Number(guest.id_guest);

                    if (
                        !Number.isSafeInteger(guestId) ||
                        guestId <= 0
                    ) {
                        throw new Error(
                            "ID penerima layanan tidak valid."
                        );
                    }

                    const updatedCheckout: CheckoutData = {
                        ...checkout,
                        id_guest: guestId,
                        guest_form: null,
                    };

                    sessionStorage.setItem(
                        CHECKOUT_KEY,
                        JSON.stringify(updatedCheckout)
                    );

                    setCheckout(updatedCheckout);
                }

                sessionStorage.setItem(
                    ATTEMPT_KEY,
                    JSON.stringify({
                        stage: "GENERATING",
                        started_at: Date.now(),
                        id_service: checkout.id_service,
                    })
                );

                const generated = await apiRequest<
                    Omit<PaymentRecord, "created_local_at">
                >(
                    "/api/nobu/qris/create",
                    token,
                    {
                        method: "POST",
                        body: JSON.stringify({
                            id_service: checkout.id_service,
                            booking_at: checkout.booking_at,
                            recipient: checkout.recipient,

                            ...(checkout.recipient === "GUEST"
                                ? { id_guest: guestId }
                                : {}),
                        }),
                    }
                );

                if (
                    !generated.id_order ||
                    !generated.qr_content
                ) {
                    throw new Error(
                        "QRIS mungkin telah dibuat tetapi respons tidak lengkap."
                    );
                }

                const record: PaymentRecord = {
                    ...generated,
                    created_local_at: Date.now(),
                };

                sessionStorage.setItem(
                    PAYMENT_KEY,
                    JSON.stringify(record)
                );

                sessionStorage.removeItem(ATTEMPT_KEY);

                setPayment(record);
                setView("PENDING");
                setError("");

                console.info(
                    "[QRIS] Generated",
                    {
                        orderId: record.id_order,
                        amount: record.amount,
                    }
                );
            } catch (reason) {
                const issue = reason as Error & {
                    data?: {
                        id_order?: string;
                    };
                };

                if (issue.data?.id_order) {
                    const unknown: PaymentRecord = {
                        id_order: issue.data.id_order,
                        partner_reference_no:
                            issue.data.id_order,
                        payment_method: "NOBU_QRIS",
                        payment_status: "UNKNOWN",
                        amount: checkout.display_amount,
                        currency: "IDR",
                        qr_content: "",
                        qr_url: null,
                        merchant_name: null,
                        expired_at: null,
                        created_local_at: Date.now(),
                    };

                    sessionStorage.setItem(
                        PAYMENT_KEY,
                        JSON.stringify(unknown)
                    );

                    sessionStorage.removeItem(
                        ATTEMPT_KEY
                    );

                    setPayment(unknown);
                }

                setView("UNKNOWN");

                setError(
                    (reason instanceof Error
                        ? reason.message
                        : "Gagal membuat QRIS.") +
                    " Status transaksi harus dipastikan sebelum membuat pembayaran baru."
                );
            }
        };

        void generate();
    }, [
        checkout,
        payment,
        view,
        getToken,
    ]);

    const askCancel = () => {
        if (
            view === "SUCCESS" ||
            view === "FAILED"
        ) {
            goHome();
            return;
        }

        setShowCancelModal(true);
    };

    const cancelPayment = async () => {
        if (cancelRef.current) return;

        cancelRef.current = true;
        setCancelling(true);
        setError("");

        try {
            if (!payment?.id_order) {
                if (
                    sessionStorage.getItem(ATTEMPT_KEY) ||
                    createRef.current
                ) {
                    throw new Error(
                        "Pembuatan QRIS masih berlangsung atau statusnya belum pasti. Pembatalan belum dapat dikonfirmasi."
                    );
                }

                clearQrisSession();
                setShowCancelModal(false);
                goHome();

                return;
            }

            const result =
                await apiRequest<CancelResult>(
                    `/api/nobu/qris/${encodeURIComponent(
                        payment.id_order
                    )}/cancel`,
                    getToken(),
                    { method: "POST" }
                );

            if (!result.can_leave) {
                throw new Error(
                    "Permintaan pembatalan belum berhasil."
                );
            }

            if (
                result.cancellation_status ===
                "REQUESTED"
            ) {
                // Transaksi masih bisa dibayar.
                // Simpan referensinya di luar session
                // untuk keperluan rekonsiliasi.
                localStorage.setItem(
                    LAST_PENDING_KEY,
                    JSON.stringify({
                        id_order: result.id_order,
                        payment_status: result.payment_status,
                        cancellation_status:
                            result.cancellation_status,
                        recorded_at:
                            new Date().toISOString(),
                    })
                );
            } else if (
                result.cancellation_status ===
                "CONFIRMED" &&
                result.payment_status === "FAILED"
            ) {
                localStorage.removeItem(
                    LAST_PENDING_KEY
                );
            } else {
                throw new Error(
                    "Respons pembatalan tidak dikenali."
                );
            }

            clearQrisSession();
            setShowCancelModal(false);

            console.info(
                "[QRIS] Customer cancellation",
                {
                    orderId: result.id_order,
                    cancellationStatus:
                        result.cancellation_status,
                }
            );

            goHome();
        } catch (reason) {
            const issue = reason as Error & {
                status?: number;
            };

            setShowCancelModal(false);

            setError(
                issue.status === 409
                    ? "Pembayaran sudah terdeteksi atau sedang diproses. Periksa status transaksi sebelum membatalkan."
                    : issue.message ||
                    "Gagal membatalkan pembayaran."
            );

            // Jika pembayaran masuk bersamaan dengan
            // cancel, cek ulang untuk melihat APPROVED.
            if (issue.status === 409) {
                void checkPaymentStatus();
            }
        } finally {
            cancelRef.current = false;
            setCancelling(false);
        }
    };

    useEffect(() => {
        const onBeforeUnload = (
            event: BeforeUnloadEvent
        ) => {
            if (
                allowLeaveRef.current ||
                view === "SUCCESS" ||
                view === "FAILED"
            ) {
                return;
            }

            event.preventDefault();
            event.returnValue = "";
        };

        window.addEventListener(
            "beforeunload",
            onBeforeUnload
        );

        return () => {
            window.removeEventListener(
                "beforeunload",
                onBeforeUnload
            );
        };
    }, [view]);

    const showQR =
        view === "PENDING" &&
        seconds > 0 &&
        Boolean(payment?.qr_content);

    const timeLabel = formatTimer(seconds);

    if (
        !checkout &&
        view !== "SUCCESS" &&
        view !== "FAILED"
    ) {
        return (
            <main className="flex min-h-[75vh] flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
                <AlertCircle
                    size={42}
                    className="text-amber-500"
                />

                <h1 className="text-xl font-bold text-slate-900">
                    Pembayaran Tidak Ditemukan
                </h1>

                <p className="text-sm text-slate-500">
                    Data checkout tidak tersedia.
                    Silakan memilih layanan terlebih dahulu.
                </p>

                <button
                    type="button"
                    onClick={goHome}
                    className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white"
                >
                    Kembali ke Beranda
                </button>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 px-4 pb-28 pt-5 text-slate-900">
            {/* SUCCESS ANIMATION */}
            <style>
                {`
          @keyframes payment-success-pop {
            0% {
              opacity: 0;
              transform: scale(.5);
            }
            75% {
              opacity: 1;
              transform: scale(1.12);
            }
            100% {
              opacity: 1;
              transform: scale(1);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .payment-success-animation {
              animation: none !important;
            }
          }
        `}
            </style>

            <div className="mx-auto max-w-md">
                {/* HEADER */}
                <header className="mb-6 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={askCancel}
                        className="cursor-pointer flex items-center gap-2 rounded-xl p-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                    >
                        <ArrowLeft size={19} />
                        Kembali
                    </button>
                </header>

                {/* ERROR */}
                {error && (
                    <div
                        role="alert"
                        className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
                    >
                        <AlertCircle
                            size={19}
                            className="mt-0.5 shrink-0"
                        />

                        <span>{error}</span>
                    </div>
                )}

                {view === "SUCCESS" ? (
                    <section className="rounded-3xl bg-white px-7 py-10 text-center shadow-sm">
                        <div
                            className="payment-success-animation mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-emerald-100"
                            style={{
                                animation:
                                    "payment-success-pop 600ms ease-out both",
                            }}
                        >
                            <CheckCircle2
                                size={65}
                                strokeWidth={1.7}
                                className="text-emerald-600"
                            />
                        </div>

                        <PartyPopper
                            size={29}
                            className="mx-auto mt-5 text-amber-500"
                        />

                        <h1 className="mt-4 text-2xl font-extrabold text-emerald-900">
                            Pembayaran Berhasil!
                        </h1>

                        <p className="mt-3 text-sm leading-6 text-slate-600">
                            Pembayaran berhasil dikonfirmasi.
                            Health Pass telah diproses oleh sistem.
                            Kamu dapat melihatnya melalui akunmu.
                        </p>

                        <button
                            type="button"
                            onClick={goHealthPass}
                            className="mt-7 w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
                        >
                            Lihat Health Pass
                        </button>

                        <button
                            type="button"
                            onClick={goHome}
                            className="mt-3 w-full px-5 py-3 text-sm font-semibold text-slate-500"
                        >
                            Kembali ke Beranda
                        </button>
                    </section>

                ) : view === "FAILED" ? (
                    <section className="rounded-3xl bg-white px-7 py-10 text-center shadow-sm">
                        <AlertCircle
                            size={55}
                            className="mx-auto text-rose-500"
                        />

                        <h1 className="mt-5 text-xl font-bold">
                            Pembayaran Dibatalkan
                        </h1>

                        <p className="mt-3 text-sm text-slate-500">
                            Transaksi telah ditutup.
                            Silakan buat pesanan baru jika diperlukan.
                        </p>

                        <button
                            type="button"
                            onClick={goHome}
                            className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white"
                        >
                            Kembali ke Beranda
                        </button>
                    </section>

                ) : (
                    <section className="rounded-3xl border border-slate-100 bg-white px-6 pb-8 pt-8 text-center shadow-sm">
                        {/* HEADER ICON */}
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                            <QrCode size={25} />
                        </div>

                        <h1 className="mt-3 text-xl font-extrabold">
                            Pembayaran QRIS
                        </h1>

                        <p className="mt-1 text-xs text-slate-500">
                            {checkout?.service_name ||
                                "STIQR Health"}
                        </p>

                        {/* TOTAL */}
                        <p className="mt-5 text-3xl font-extrabold text-blue-700">
                            {formatCurrency(
                                Number(
                                    payment?.amount ??
                                    checkout?.display_amount ??
                                    0
                                )
                            )}
                        </p>

                        {/* COUNTDOWN */}
                        <div className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-full bg-blue-50 px-5 py-2 font-mono text-lg font-bold text-blue-700">
                            <Clock3 size={17} />
                            {timeLabel}
                        </div>

                        {/* LOADING */}
                        {view === "GENERATING" && (
                            <div className="py-12">
                                <Loader2
                                    size={43}
                                    className="mx-auto animate-spin text-blue-600"
                                />

                                <p className="mt-4 text-sm text-slate-500">
                                    Menyiapkan kode QRIS...
                                </p>
                            </div>
                        )}

                        {/* QRIS */}
                        {showQR && payment && (
                            <>
                                <div className="mx-auto mt-7 w-fit rounded-2xl border border-slate-200 bg-white p-4">
                                    <QRCodeSVG
                                        value={payment.qr_content}
                                        size={240}
                                        level="M"
                                        marginSize={4}
                                    />
                                </div>

                                <h2 className="mt-5 font-bold text-slate-800">
                                    Menunggu Pembayaran
                                </h2>

                                <p className="mt-2 text-xs leading-5 text-slate-500">
                                    Buka aplikasi pembayaran yang
                                    mendukung QRIS, lalu pindai
                                    kode di atas.
                                </p>
                            </>
                        )}

                        {/* VERIFYING */}
                        {view === "VERIFYING" && (
                            <div className="mt-7 rounded-2xl bg-blue-50 p-7">
                                <Loader2
                                    size={38}
                                    className="mx-auto animate-spin text-blue-600"
                                />

                                <h2 className="mt-4 font-bold text-blue-900">
                                    Pembayaran Terdeteksi
                                </h2>

                                <p className="mt-2 text-sm leading-6 text-blue-700">
                                    Sedang menunggu konfirmasi
                                    dan proses penerbitan Health Pass.
                                </p>
                            </div>
                        )}

                        {/* EXPIRED */}
                        {view === "EXPIRED" && (
                            <div className="mt-7 rounded-2xl bg-amber-50 p-7">
                                <AlertCircle
                                    size={38}
                                    className="mx-auto text-amber-600"
                                />

                                <h2 className="mt-4 font-bold text-amber-900">
                                    QRIS Kedaluwarsa
                                </h2>

                                <p className="mt-2 text-sm text-amber-800">
                                    QRIS sudah tidak dapat digunakan.
                                    Kamu bisa membatalkan transaksi
                                    melalui tombol di bawah.
                                </p>
                            </div>
                        )}

                        {/* UNKNOWN */}
                        {view === "UNKNOWN" && (
                            <div className="mt-7 rounded-2xl bg-amber-50 p-7">
                                <AlertCircle
                                    size={38}
                                    className="mx-auto text-amber-600"
                                />

                                <h2 className="mt-4 font-bold text-amber-900">
                                    Status Belum Dapat Dipastikan
                                </h2>

                                <p className="mt-2 text-sm leading-6 text-amber-800">
                                    Sistem belum dapat memastikan
                                    kondisi pembayaran.
                                    Jangan membuat transaksi baru
                                    sebelum status diketahui.
                                </p>
                            </div>
                        )}

                        {/* LOCAL TIME ESTIMATE ENDED */}
                        {view === "PENDING" &&
                            seconds === 0 && (
                                <div className="mt-7 rounded-2xl bg-amber-50 p-6 text-sm text-amber-800">
                                    Estimasi waktu QRIS sudah habis.
                                    Status akhir masih mengikuti
                                    konfirmasi sistem pembayaran.
                                </div>
                            )}

                        {/* PAYMENT STATUS ACTION */}
                        {payment?.id_order && (
                            <div className="mt-7 flex flex-wrap justify-center gap-3">

                                <button
                                    type="button"
                                    disabled={checking}
                                    onClick={() =>
                                        void checkPaymentStatus()
                                    }
                                    className="cursor-pointer flex items-center gap-2 rounded-xl border border-blue-200 px-4 py-3 text-sm font-semibold text-blue-700 disabled:opacity-50"
                                >
                                    {checking ? (
                                        <Loader2
                                            size={17}
                                            className="animate-spin"
                                        />
                                    ) : (
                                        <RefreshCw size={17} />
                                    )}

                                    Cek Status
                                </button>

                                <button
                                    type="button"
                                    onClick={async () => {
                                        try {
                                            await navigator.clipboard.writeText(
                                                payment.id_order
                                            );

                                            setCopied(true);

                                            window.setTimeout(
                                                () => setCopied(false),
                                                2000
                                            );
                                        } catch {
                                            setError(
                                                "Gagal menyalin nomor pesanan."
                                            );
                                        }
                                    }}
                                    className="cursor-pointer flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600"
                                >
                                    <Copy size={17} />
                                    {copied ? "Tersalin" : "Salin ID"}
                                </button>
                            </div>
                        )}

                        {/* CANCEL BUTTON */}
                        <button
                            type="button"
                            onClick={askCancel}
                            className="cursor-pointer mt-7 w-full rounded-xl border border-rose-200 px-5 py-3 text-sm font-bold text-rose-600 transition hover:bg-rose-50"
                        >
                            Batalkan Pembayaran
                        </button>

                        <p className="mt-4 text-[11px] leading-5 text-slate-400">
                            Countdown 5 menit merupakan estimasi
                            jika backend belum menyediakan
                            expired_at. Status pembayaran diperiksa
                            otomatis setiap 5 detik.
                        </p>
                    </section>
                )}

                {/* SECURITY NOTE */}
                <div className="mt-5 flex items-start justify-center gap-2 text-center text-xs leading-5 text-slate-500">
                    <ShieldCheck
                        size={16}
                        className="mt-0.5 shrink-0 text-blue-600"
                    />

                    <span>
                        Status pembayaran hanya dinyatakan
                        berhasil setelah backend melakukan
                        verifikasi transaksi.
                    </span>
                </div>
            </div>

            {showCancelModal &&
                view !== "SUCCESS" &&
                view !== "FAILED" && (
                    <div
                        className="fixed inset-0 z-51 flex items-center justify-center bg-slate-950/60 p-5"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="cancel-payment-title"
                    >
                        <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                                <AlertCircle size={25} />
                            </div>

                            <h2
                                id="cancel-payment-title"
                                className="text-lg font-extrabold text-slate-900"
                            >
                                Batalkan Pembayaran?
                            </h2>

                            <p className="mt-3 text-sm leading-6 text-slate-600">
                                Yakin ingin membatalkan proses
                                pembayaran dan kembali ke beranda?
                            </p>

                            <p className="mt-2 text-xs leading-5 text-slate-500">
                                Jika QRIS masih aktif, permintaan
                                pembatalan akan dicatat.
                                Status transaksi akan tetap
                                diperiksa hingga final.
                            </p>

                            <div className="mt-6 grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowCancelModal(false)
                                    }
                                    disabled={cancelling}
                                    className="cursor-pointer rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold text-slate-700 disabled:opacity-50"
                                >
                                    Tetap di sini
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        void cancelPayment()
                                    }
                                    disabled={cancelling}
                                    className="cursor-pointer flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 py-3 text-sm font-bold text-white disabled:opacity-50"
                                >
                                    {cancelling && (
                                        <Loader2
                                            size={16}
                                            className="animate-spin"
                                        />
                                    )}

                                    Ya, Batalkan
                                </button>
                            </div>
                        </div>
                    </div>
                )}
        </main>
    );
}

export default Payment;