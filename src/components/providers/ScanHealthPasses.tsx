
import {
    useCallback,
    useEffect,
    useId,
    useRef,
    useState,
} from "react";

import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";

import {
    ScanLine,
    Keyboard,
    Camera,
    CameraOff,
    ShieldCheck,
    CheckCircle2,
    AlertCircle,
    Loader2,
    RefreshCw,
    UserRound,
    Building2,
    CalendarDays,
    Clock3,
    Ticket,
    CreditCard,
    X,
    ArrowRight,
    RotateCcw,
    Info,
} from "lucide-react";

import { isTokenExpired } from "../../utils/auth";

type ScanMode = "QR" | "ID";

type VerificationMethod = "qr" | "id";

type ProcessStatus =
    | "IDLE"
    | "VERIFYING"
    | "VERIFIED"
    | "REDEEMING"
    | "SUCCESS";

interface HealthPass {
    id_health_pass: string;

    status_health_pass: string;

    valid_from: string | null;
    valid_until: string | null;
    booking_at: string | null;

    redeemed_at: string | null;
    redeemed_by: number | string | null;

    id_order: string;
    id_customer: number;
    id_service: number;
    id_provider?: number;

    payment_status: string;
    order_status: string;

    name_customer?: string;
    email_customer?: string;
    phone_number_customer?: string;

    name_service?: string;
    price_service?: string | number;
    image_service?: string | null;

    name_provider?: string;
}

interface ApiResponse {
    success: boolean;
    message?: string;
    data?: HealthPass;
}

interface VerificationData {
    method: VerificationMethod;
    value: string;
    pass: HealthPass;
}

const getProviderToken = (): string | null => {
    return (
        sessionStorage.getItem("provider_token") ||
        localStorage.getItem("provider_token")
    );
};

const clearProviderSession = () => {
    sessionStorage.removeItem("provider_token");
    localStorage.removeItem("provider_token");

    sessionStorage.removeItem("provider_user_data");
    localStorage.removeItem("provider_user_data");
};

const formatRupiah = (
    value?: string | number
): string => {
    if (value === undefined || value === null) {
        return "-";
    }

    const number = Number(value);

    if (!Number.isFinite(number)) return "-";

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(number);
};

const formatDate = (
    value?: string | null,
    withTime = true
): string => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

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

const getErrorMessage = (
    status: number,
    message?: string
): string => {
    if (status === 401) {
        return "Sesi provider telah berakhir. Silakan login kembali.";
    }

    if (status === 403) {
        return (
            message ||
            "Health Pass bukan milik provider ini."
        );
    }

    if (status === 404) {
        return message || "Health Pass tidak ditemukan.";
    }

    if (status === 409) {
        return (
            message ||
            "Health Pass sudah digunakan atau tidak dapat diredeem."
        );
    }

    if (status === 400 || status === 422) {
        return message || "Data Health Pass tidak valid.";
    }

    return message || `Request gagal (${status}).`;
};

const postProviderApi = async (
    endpoint: string,
    body: Record<string, string | undefined>,
    token: string
): Promise<ApiResponse> => {
    const response = await fetch(
        `${import.meta.env.VITE_API_URI}${endpoint}`,
        {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
            cache: "no-store",
        }
    );

    let result: ApiResponse;

    try {
        result = (await response.json()) as ApiResponse;
    } catch {
        throw new Error(
            `Respons server tidak valid (${response.status}).`
        );
    }

    if (!response.ok || !result.success) {
        throw new Error(
            getErrorMessage(response.status, result.message)
        );
    }

    return result;
};

interface QRScannerProps {
    onDetected: (value: string) => void;
    onError: (message: string) => void;
}

const QRScanner = ({
    onDetected,
    onError,
}: QRScannerProps) => {
    const reactId = useId();

    const elementId = `health-qr-${reactId.replace(
        /[^a-zA-Z0-9_-]/g,
        ""
    )}`;

    const onDetectedRef = useRef(onDetected);
    const onErrorRef = useRef(onError);

    const [starting, setStarting] = useState(true);

    // Maintain callback without restarting the camera.
    useEffect(() => {
        onDetectedRef.current = onDetected;
        onErrorRef.current = onError;
    }, [onDetected, onError]);

    useEffect(() => {
        let disposed = false;
        let scanned = false;

        const scanner = new Html5Qrcode(elementId, {
            verbose: false,
        });

        const initialize = async () => {
            try {
                await scanner.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: (width, height) => {
                            const size = Math.min(
                                260,
                                Math.floor(
                                    Math.min(width, height) * 0.75
                                )
                            );

                            return {
                                width: size,
                                height: size,
                            };
                        },
                    },
                    (decodedText) => {
                        if (disposed || scanned) return;

                        const value = decodedText.trim();

                        if (!value) return;

                        scanned = true;
                        onDetectedRef.current(value);
                    },
                    () => {
                        // Normal when no QR is in camera frame.
                    }
                );

                if (!disposed) {
                    setStarting(false);
                } else {
                    await scanner.stop().catch(() => { });
                }
            } catch (error) {
                if (disposed) return;

                setStarting(false);

                onErrorRef.current(
                    error instanceof Error
                        ? `Kamera tidak dapat diakses: ${error.message}`
                        : "Kamera tidak dapat diakses."
                );
            }
        };

        void initialize();

        return () => {
            disposed = true;

            void (async () => {
                try {
                    if (scanner.isScanning) {
                        await scanner.stop();
                    }

                    scanner.clear();
                } catch {
                    // Scanner already stopped.
                }
            })();
        };
    }, [elementId]);

    return (
        <div className="relative overflow-hidden rounded-2xl bg-slate-950">
            <div
                id={elementId}
                className="w-full overflow-hidden rounded-2xl"
            />

            {starting && (
                <div className="flex min-h-62.5 flex-col items-center justify-center gap-3 text-white">
                    <Loader2
                        size={28}
                        className="animate-spin"
                    />

                    <p className="text-sm">
                        Mengaktifkan kamera...
                    </p>
                </div>
            )}

            <div className="bg-slate-900 px-4 py-3 text-center">
                <p className="text-xs text-white/80">
                    Arahkan kamera ke QR Code Health Pass customer.
                </p>
            </div>
        </div>
    );
};

interface DetailRowProps {
    label: string;
    value: string;
    icon: typeof UserRound;
}

const DetailRow = ({
    label,
    value,
    icon: Icon,
}: DetailRowProps) => {
    return (
        <div className="flex items-start gap-3 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Icon size={19} />
            </div>

            <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-400">
                    {label}
                </p>

                <p className="mt-1 wrap-break-word text-sm font-semibold text-slate-800">
                    {value || "-"}
                </p>
            </div>
        </div>
    );
};

const ScanHealthPasses = () => {
    const navigate = useNavigate();

    const [mode, setMode] = useState<ScanMode>("QR");

    const [cameraEnabled, setCameraEnabled] =
        useState(false);

    const [manualId, setManualId] = useState("");

    const [status, setStatus] =
        useState<ProcessStatus>("IDLE");

    const [verification, setVerification] =
        useState<VerificationData | null>(null);

    const [redeemedPass, setRedeemedPass] =
        useState<HealthPass | null>(null);

    const [errorMessage, setErrorMessage] =
        useState("");

    const [successMessage, setSuccessMessage] =
        useState("");

    const busyRef = useRef(false);

    const busy =
        status === "VERIFYING" ||
        status === "REDEEMING";

    const requireToken = (): string | null => {
        const token = getProviderToken();

        if (!token || isTokenExpired(token)) {
            clearProviderSession();

            navigate("/provider/sign-in", {
                replace: true,
            });

            return null;
        }

        return token;
    };

    const verifyPass = useCallback(
        async (
            method: VerificationMethod,
            value: string
        ) => {
            if (busyRef.current) return;

            const normalizedValue = value.trim();

            if (!normalizedValue) {
                setErrorMessage(
                    method === "qr"
                        ? "QR Code tidak memiliki data."
                        : "Masukkan ID Health Pass terlebih dahulu."
                );
                return;
            }

            const token = requireToken();

            if (!token) return;

            busyRef.current = true;

            setCameraEnabled(false);
            setErrorMessage("");
            setSuccessMessage("");
            setVerification(null);
            setRedeemedPass(null);
            setStatus("VERIFYING");

            try {
                const endpoint =
                    method === "qr"
                        ? "/health-passes/provider/verify/qr"
                        : "/health-passes/provider/verify/id";

                const body =
                    method === "qr"
                        ? { qr_token: normalizedValue }
                        : { id_health_pass: normalizedValue };

                const result = await postProviderApi(
                    endpoint,
                    body,
                    token
                );

                if (!result.data?.id_health_pass) {
                    throw new Error(
                        "Server tidak mengembalikan data Health Pass."
                    );
                }

                const pass = result.data;

                if (
                    pass.status_health_pass?.toUpperCase() !==
                    "ACTIVE" ||
                    pass.redeemed_at
                ) {
                    throw new Error(
                        "Health Pass tidak dalam status aktif dan belum digunakan."
                    );
                }

                setVerification({
                    method,
                    value: normalizedValue,
                    pass,
                });

                setStatus("VERIFIED");
            } catch (error) {
                setStatus("IDLE");

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Gagal melakukan verifikasi Health Pass."
                );
            } finally {
                busyRef.current = false;
            }
        },
        [navigate]
    );

    const handleQRDetected = (value: string) => {
        setCameraEnabled(false);
        void verifyPass("qr", value);
    };

    const handleVerifyManual = () => {
        void verifyPass("id", manualId);
    };

    const handleRedeem = async () => {
        if (!verification || busyRef.current) return;

        const token = requireToken();

        if (!token) return;

        busyRef.current = true;

        setStatus("REDEEMING");
        setErrorMessage("");

        try {
            const endpoint =
                verification.method === "qr"
                    ? "/health-passes/provider/redeem/qr"
                    : "/health-passes/provider/redeem/id";

            const body =
                verification.method === "qr"
                    ? { qr_token: verification.value }
                    : {
                        id_health_pass:
                            verification.pass.id_health_pass,
                    };

            const result = await postProviderApi(
                endpoint,
                body,
                token
            );

            if (!result.data) {
                throw new Error(
                    "Server tidak mengembalikan hasil redeem."
                );
            }

            if (
                result.data.status_health_pass?.toUpperCase() !==
                "REDEEMED"
            ) {
                throw new Error(
                    "Status redeem belum dikonfirmasi oleh server."
                );
            }

            setRedeemedPass(result.data);

            setVerification(null);

            setSuccessMessage(
                result.message ||
                "Health Pass berhasil diredeem."
            );

            setStatus("SUCCESS");
        } catch (error) {
            // Verification can be retried or checked again.
            setStatus("VERIFIED");

            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Gagal melakukan redeem Health Pass."
            );
        } finally {
            busyRef.current = false;
        }
    };

    const handleReset = () => {
        if (busyRef.current) return;

        setCameraEnabled(false);
        setManualId("");
        setVerification(null);
        setRedeemedPass(null);

        setErrorMessage("");
        setSuccessMessage("");

        setStatus("IDLE");
    };

    const handleChangeMode = (nextMode: ScanMode) => {
        if (busyRef.current) return;

        handleReset();
        setMode(nextMode);
    };

    return (
        <div className="min-h-full bg-[#F8FAFF]">
            <div className="mx-auto max-w-287.5 space-y-6 p-5 md:p-7 lg:p-8">
                <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
                            Health Pass Verification
                        </p>

                        <h1 className="mt-2 text-2xl font-extrabold text-slate-900 lg:text-3xl">
                            Scan Health Pass
                        </h1>

                        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                            Verifikasi Health Pass customer menggunakan
                            QR Code atau ID manual, kemudian selesaikan
                            proses redeem untuk layanan yang valid.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleReset}
                        disabled={busy}
                        className="cursor-pointer flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-50"
                    >
                        <RotateCcw size={17} />
                        Reset
                    </button>
                </section>

                <section className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <ShieldCheck
                        size={22}
                        className="mt-0.5 shrink-0 text-blue-600"
                    />

                    <div>
                        <p className="text-sm font-bold text-blue-800">
                            Verifikasi sebelum redeem
                        </p>

                        <p className="mt-1 text-xs leading-6 text-blue-700">
                            Health Pass yang berhasil diverifikasi
                            untuk provider ini harus diproses sesuai
                            ketentuan. Jika verifikasi gagal,
                            periksa kembali tiket atau hubungi
                            administrator untuk penanganan kendala.
                        </p>
                    </div>
                </section>

                {errorMessage && (
                    <div
                        role="alert"
                        className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4"
                    >
                        <AlertCircle
                            size={21}
                            className="shrink-0 text-red-600"
                        />

                        <p className="min-w-0 flex-1 text-sm leading-6 text-red-700">
                            {errorMessage}
                        </p>

                        <button
                            type="button"
                            onClick={() => setErrorMessage("")}
                            aria-label="Tutup pesan error"
                            className="cursor-pointer text-red-500"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}

                <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                    <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm lg:col-span-2">
                        {/* PANEL HEADER */}
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <ScanLine size={23} />
                            </div>

                            <div>
                                <h2 className="text-lg font-extrabold text-slate-900">
                                    Verifikasi Health Pass
                                </h2>

                                <p className="mt-1 text-xs text-slate-500">
                                    Pilih metode verifikasi yang tersedia
                                </p>
                            </div>
                        </div>

                        {/* MODE SELECTOR */}
                        <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl bg-slate-100 p-1.5">
                            <button
                                type="button"
                                onClick={() => handleChangeMode("QR")}
                                disabled={busy}
                                className={`cursor-pointer flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${mode === "QR"
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                                    }`}
                            >
                                <ScanLine size={18} />
                                Scan QR
                            </button>

                            <button
                                type="button"
                                onClick={() => handleChangeMode("ID")}
                                disabled={busy}
                                className={`cursor-pointer flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${mode === "ID"
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                                    }`}
                            >
                                <Keyboard size={18} />
                                Input ID
                            </button>
                        </div>

                        {mode === "QR" && (
                            <div className="mt-6">
                                {cameraEnabled &&
                                    status === "IDLE" ? (
                                    <>
                                        <QRScanner
                                            onDetected={handleQRDetected}
                                            onError={(message) => {
                                                setCameraEnabled(false);
                                                setErrorMessage(message);
                                            }}
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setCameraEnabled(false)
                                            }
                                            className="cursor-pointer mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                                        >
                                            <CameraOff size={18} />
                                            Matikan Kamera
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex min-h-77.5 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 px-5 py-10 text-center">
                                        {status === "VERIFYING" ? (
                                            <>
                                                <Loader2
                                                    size={45}
                                                    className="animate-spin text-blue-600"
                                                />

                                                <h3 className="mt-4 text-base font-bold text-slate-900">
                                                    Memverifikasi Health Pass
                                                </h3>

                                                <p className="mt-2 text-xs text-slate-500">
                                                    Mohon tunggu respons server.
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-100 text-blue-600">
                                                    <QrCodeIllustration />
                                                </div>

                                                <h3 className="mt-5 text-base font-extrabold text-slate-900">
                                                    Scan QR Code Customer
                                                </h3>

                                                <p className="mt-2 max-w-xs text-xs leading-6 text-slate-500">
                                                    Aktifkan kamera lalu arahkan
                                                    pada QR Code dari aplikasi
                                                    STIQR Health customer.
                                                </p>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        handleReset();
                                                        setCameraEnabled(true);
                                                    }}
                                                    disabled={busy}
                                                    className="cursor-pointer mt-6 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                                                >
                                                    <Camera size={18} />
                                                    Aktifkan Kamera
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {mode === "ID" && (
                            <div className="mt-6">
                                <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-5">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                                        <Keyboard size={27} />
                                    </div>

                                    <h3 className="mt-4 text-base font-extrabold text-slate-900">
                                        Input ID Health Pass
                                    </h3>

                                    <p className="mt-2 text-xs leading-6 text-slate-500">
                                        Gunakan ID Health Pass apabila
                                        QR Code customer tidak dapat
                                        dipindai.
                                    </p>

                                    <form
                                        className="mt-5"
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            handleVerifyManual();
                                        }}
                                    >
                                        <label
                                            htmlFor="manual-health-pass-id"
                                            className="text-xs font-semibold text-slate-700"
                                        >
                                            ID Health Pass
                                        </label>

                                        <input
                                            id="manual-health-pass-id"
                                            type="text"
                                            value={manualId}
                                            onChange={(event) =>
                                                setManualId(
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Masukkan ID Health Pass"
                                            autoComplete="off"
                                            disabled={busy}
                                            className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                        />

                                        <button
                                            type="submit"
                                            disabled={
                                                busy ||
                                                !manualId.trim()
                                            }
                                            className="cursor-pointer mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {status === "VERIFYING" ? (
                                                <Loader2
                                                    size={18}
                                                    className="animate-spin"
                                                />
                                            ) : (
                                                <ShieldCheck size={18} />
                                            )}

                                            {status === "VERIFYING"
                                                ? "Memverifikasi..."
                                                : "Verifikasi ID"}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-extrabold text-slate-900">
                            Cara Penggunaan
                        </h2>

                        <div className="mt-5 space-y-5">
                            {[
                                {
                                    number: "01",
                                    title: "Pindai atau input",
                                    description:
                                        "Scan QR Code customer atau masukkan ID Health Pass.",
                                },
                                {
                                    number: "02",
                                    title: "Verifikasi",
                                    description:
                                        "Server memeriksa validitas, status dan kesesuaian provider.",
                                },
                                {
                                    number: "03",
                                    title: "Konfirmasi redeem",
                                    description:
                                        "Periksa detail customer dan lakukan redeem.",
                                },
                                {
                                    number: "04",
                                    title: "Layani customer",
                                    description:
                                        "Setelah berhasil diredeem, lanjutkan pelayanan kepada customer.",
                                },
                            ].map((step) => (
                                <div
                                    key={step.number}
                                    className="flex items-start gap-3"
                                >
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-extrabold text-blue-600">
                                        {step.number}
                                    </div>

                                    <div>
                                        <p className="text-sm font-bold text-slate-800">
                                            {step.title}
                                        </p>

                                        <p className="mt-1 text-xs leading-5 text-slate-500">
                                            {step.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-7 flex items-start gap-2 rounded-xl bg-blue-50 p-4">
                            <Info
                                size={18}
                                className="shrink-0 text-blue-600"
                            />

                            <p className="text-xs leading-6 text-blue-700">
                                Setiap Health Pass harus diverifikasi
                                menggunakan akun provider yang berhak.
                                Tiket yang sudah digunakan tidak boleh
                                diredeem ulang.
                            </p>
                        </div>
                    </div>
                </section>
            </div>

            {verification &&
                (status === "VERIFIED" ||
                    status === "REDEEMING") && (
                    <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/60 p-4">
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="verify-pass-title"
                            className="max-h-[92dvh] w-full max-w-130 overflow-y-auto rounded-3xl bg-white shadow-2xl"
                        >
                            {/* MODAL HEADER */}
                            <div className="border-b border-blue-100 bg-blue-50 px-6 py-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
                                            <ShieldCheck size={25} />
                                        </div>

                                        <div>
                                            <h2
                                                id="verify-pass-title"
                                                className="text-lg font-extrabold text-slate-900"
                                            >
                                                Health Pass Valid
                                            </h2>

                                            <p className="mt-1 text-xs text-blue-700">
                                                Verifikasi berhasil
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        disabled={busy}
                                        aria-label="Tutup modal"
                                        className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 disabled:opacity-50"
                                    >
                                        <X size={19} />
                                    </button>
                                </div>
                            </div>

                            {/* DETAILS */}
                            <div className="p-6">
                                <div className="rounded-2xl border border-blue-100 bg-white p-4">
                                    <DetailRow
                                        icon={UserRound}
                                        label="Nama Customer"
                                        value={
                                            verification.pass.name_customer ||
                                            "-"
                                        }
                                    />

                                    <DetailRow
                                        icon={Ticket}
                                        label="Nama Layanan"
                                        value={
                                            verification.pass.name_service ||
                                            "-"
                                        }
                                    />

                                    <DetailRow
                                        icon={Building2}
                                        label="Provider"
                                        value={
                                            verification.pass.name_provider ||
                                            "-"
                                        }
                                    />

                                    <DetailRow
                                        icon={CreditCard}
                                        label="Harga Layanan"
                                        value={formatRupiah(
                                            verification.pass.price_service
                                        )}
                                    />

                                    <DetailRow
                                        icon={CalendarDays}
                                        label="Jadwal Booking"
                                        value={formatDate(
                                            verification.pass.booking_at
                                        )}
                                    />

                                    <DetailRow
                                        icon={Clock3}
                                        label="Masa Berlaku"
                                        value={`${formatDate(
                                            verification.pass.valid_from
                                        )} - ${formatDate(
                                            verification.pass.valid_until
                                        )}`}
                                    />
                                </div>

                                {/* STATUS */}
                                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-blue-50 px-4 py-3">
                                    <span className="text-xs font-semibold text-blue-700">
                                        Status Health Pass
                                    </span>

                                    <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                                        ACTIVE
                                    </span>
                                </div>

                                {/* IMPORTANT NOTICE */}
                                <div className="mt-4 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-4">
                                    <ShieldCheck
                                        size={18}
                                        className="shrink-0 text-blue-600"
                                    />

                                    <p className="text-xs leading-6 text-blue-700">
                                        Health Pass sudah terverifikasi.
                                        Sesuai kewajiban pelayanan dalam
                                        PKS, lanjutkan proses redeem
                                        setelah memastikan customer dan
                                        layanan telah sesuai.
                                    </p>
                                </div>

                                {/* ACTIONS */}
                                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        disabled={busy}
                                        className="cursor-pointer rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                                    >
                                        Periksa Ulang
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            void handleRedeem()
                                        }
                                        disabled={busy}
                                        className="cursor-pointer flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {status === "REDEEMING" ? (
                                            <>
                                                <Loader2
                                                    size={18}
                                                    className="animate-spin"
                                                />
                                                Memproses...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 size={18} />
                                                Konfirmasi Redeem
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            {status === "SUCCESS" && redeemedPass && (
                <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/60 p-4">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="redeem-success-title"
                        className="w-full max-w-110 rounded-3xl bg-white p-6 text-center shadow-2xl"
                    >
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                            <CheckCircle2 size={46} />
                        </div>

                        <h2
                            id="redeem-success-title"
                            className="mt-5 text-2xl font-extrabold text-slate-900"
                        >
                            Redeem Berhasil!
                        </h2>

                        <p className="mt-3 text-sm leading-6 text-slate-500">
                            {successMessage ||
                                "Health Pass berhasil digunakan."}
                        </p>

                        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-left">
                            <p className="text-xs text-slate-400">
                                Customer
                            </p>

                            <p className="mt-1 text-sm font-bold text-slate-900">
                                {redeemedPass.name_customer || "-"}
                            </p>

                            <p className="mt-4 text-xs text-slate-400">
                                Layanan
                            </p>

                            <p className="mt-1 text-sm font-bold text-slate-900">
                                {redeemedPass.name_service || "-"}
                            </p>

                            <p className="mt-4 text-xs text-slate-400">
                                Waktu Redeem
                            </p>

                            <p className="mt-1 text-sm font-bold text-slate-900">
                                {formatDate(redeemedPass.redeemed_at)}
                            </p>

                            <p className="mt-4 text-xs text-slate-400">
                                Status
                            </p>

                            <span className="mt-1 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                                REDEEMED
                            </span>
                        </div>

                        <div className="mt-6 space-y-3">
                            <button
                                type="button"
                                onClick={handleReset}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
                            >
                                <RefreshCw size={18} />
                                Scan Health Pass Berikutnya
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    navigate("/provider/redemptions")
                                }
                                className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 px-5 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50"
                            >
                                Lihat Riwayat Redemption
                                <ArrowRight size={17} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const QrCodeIllustration = () => (
    <ScanLine size={42} />
);

export default ScanHealthPasses;
