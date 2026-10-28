import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    ChevronRight,
    Info,
    RefreshCw,
    ShieldCheck,
    X,
} from "lucide-react";

import {
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type ClipboardEvent,
    type FormEvent,
    type KeyboardEvent,
} from "react";

import {
    useNavigate,
    useSearchParams,
} from "react-router-dom";

import logo from "../../images/logo-stiqrhub-health.jpeg";

interface Customer {
    id_customer: number;
    name_customer: string;
    email_customer: string;
    phone_number_customer: string;
    dob_customer: string;
    gender_customer: string;
    id_platform: number;
    status_customer?: string;
}

interface AuthResponse {
    success?: boolean;
    message?: string;

    // Temporary OTP session.
    otp_token?: string;
    expires_in_seconds?: number;

    // Customer session after OTP verification.
    token?: string;
    customer?: Customer;

    data?: {
        otp_token?: string;
        expires_in_seconds?: number;
        token?: string;
        customer?: Customer;
    };
}

type SignInStep = "EMAIL" | "OTP";

const OTP_LENGTH = 6;

async function postAuth(
    endpoint: string,
    payload: Record<string, string>
): Promise<AuthResponse> {
    const response = await fetch(
        `${import.meta.env.VITE_API_URI}${endpoint}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(payload),
        }
    );

    let result: AuthResponse;

    try {
        result = await response.json();
    } catch {
        throw new Error(
            "Server memberikan respons yang tidak valid."
        );
    }

    if (!response.ok || result.success === false) {
        throw new Error(
            result.message ||
            "Permintaan gagal diproses. Silakan coba lagi."
        );
    }

    return result;
}

const SignIn = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [email, setEmail] = useState("");

    const [otp, setOtp] = useState<string[]>(
        Array(OTP_LENGTH).fill("")
    );

    const [otpToken, setOtpToken] = useState("");

    const [step, setStep] = useState<SignInStep>("EMAIL");

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState("");

    const [message, setMessage] = useState("");

    const [expiresInSeconds, setExpiresInSeconds] =
        useState<number | null>(null);

    // Notification untuk fitur benefit kantor.
    const [showFeatureToast, setShowFeatureToast] =
        useState(false);

    const otpInputRefs = useRef<
        Array<HTMLInputElement | null>
    >([]);

    const normalizedEmail = email.trim().toLowerCase();

    const otpCode = otp.join("");

    const isValidEmail =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            normalizedEmail
        );

    // Redirect setelah login, misalnya dari Book.
    // Hanya mengizinkan path internal aplikasi.

    const requestedRedirect = searchParams.get("redirect");

    const redirectAfterLogin =
        requestedRedirect?.startsWith("/") &&
            !requestedRedirect.startsWith("//") &&
            !requestedRedirect.startsWith("/\\")
            ? requestedRedirect
            : "/customer/home";

    const clearNotifications = () => {
        setError("");
        setMessage("");
    };

    const handleFeatureUnavailable = () => {
        setShowFeatureToast(true);
    };

    useEffect(() => {
        if (!showFeatureToast) return;

        const timeout = window.setTimeout(() => {
            setShowFeatureToast(false);
        }, 3500);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [showFeatureToast]);

    const resetOtp = () => {
        setOtp(Array(OTP_LENGTH).fill(""));
    };

    const focusOtp = (index: number) => {
        otpInputRefs.current[index]?.focus();
    };

    const getOtpToken = (
        result: AuthResponse
    ): string => {
        return (
            result.otp_token ||
            result.data?.otp_token ||
            ""
        );
    };

    const getExpiry = (
        result: AuthResponse
    ): number | null => {
        return (
            result.expires_in_seconds ??
            result.data?.expires_in_seconds ??
            null
        );
    };

    const handleBack = () => {
        if (loading) return;

        if (step === "OTP") {
            setStep("EMAIL");
            resetOtp();
            setOtpToken("");
            setExpiresInSeconds(null);
            clearNotifications();
            return;
        }

        navigate("/customer/home");
    };

    const handleSignUp = () => {
        if (loading) return;

        const redirect = searchParams.get("redirect");

        if (redirect) {
            navigate(
                `/customer/sign-up?redirect=${encodeURIComponent(redirect)}`
            );
            return;
        }

        navigate("/customer/sign-up");
    };

    const handleChangeEmail = () => {
        if (loading) return;

        setStep("EMAIL");
        setOtpToken("");
        resetOtp();
        setExpiresInSeconds(null);
        clearNotifications();
    };

    const handleSendOtp = async (
        e: FormEvent
    ) => {
        e.preventDefault();

        if (loading) return;

        if (!isValidEmail) {
            setError(
                "Masukkan alamat email yang valid."
            );
            return;
        }

        try {
            setLoading(true);
            clearNotifications();

            const result = await postAuth(
                "/customer/sign-in",
                {
                    email_customer: normalizedEmail,
                }
            );

            const receivedOtpToken =
                getOtpToken(result);

            if (!receivedOtpToken) {
                throw new Error(
                    "OTP token tidak ditemukan pada respons server."
                );
            }

            setOtpToken(receivedOtpToken);

            setExpiresInSeconds(
                getExpiry(result)
            );

            resetOtp();

            setStep("OTP");

            setMessage(
                "Kode verifikasi telah dikirim ke email kamu."
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Gagal mengirim kode OTP."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (
        e: ChangeEvent<HTMLInputElement>,
        index: number
    ) => {
        const value = e.target.value.replace(
            /\D/g,
            ""
        );

        if (!value) {
            setOtp((prev) => {
                const next = [...prev];
                next[index] = "";
                return next;
            });

            setError("");
            return;
        }

        // Supports autofill containing multiple digits.

        if (value.length > 1) {
            const digits = value
                .slice(0, OTP_LENGTH - index)
                .split("");

            setOtp((prev) => {
                const next = [...prev];

                digits.forEach((digit, offset) => {
                    next[index + offset] = digit;
                });

                return next;
            });

            focusOtp(
                Math.min(
                    index + digits.length,
                    OTP_LENGTH - 1
                )
            );

            setError("");
            return;
        }

        setOtp((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
        });

        setError("");

        if (index < OTP_LENGTH - 1) {
            focusOtp(index + 1);
        }
    };

    const handleOtpKeyDown = (
        e: KeyboardEvent<HTMLInputElement>,
        index: number
    ) => {
        if (e.key === "Backspace") {
            e.preventDefault();

            if (otp[index]) {
                setOtp((prev) => {
                    const next = [...prev];
                    next[index] = "";
                    return next;
                });
            } else if (index > 0) {
                setOtp((prev) => {
                    const next = [...prev];
                    next[index - 1] = "";
                    return next;
                });

                focusOtp(index - 1);
            }

            setError("");
        }

        if (
            e.key === "ArrowLeft" &&
            index > 0
        ) {
            e.preventDefault();
            focusOtp(index - 1);
        }

        if (
            e.key === "ArrowRight" &&
            index < OTP_LENGTH - 1
        ) {
            e.preventDefault();
            focusOtp(index + 1);
        }
    };

    const handleOtpPaste = (
        e: ClipboardEvent<HTMLInputElement>,
        index: number
    ) => {
        e.preventDefault();

        const pastedCode = e.clipboardData
            .getData("text")
            .replace(/\D/g, "")
            .slice(0, OTP_LENGTH - index);

        if (!pastedCode) return;

        setOtp((prev) => {
            const next = [...prev];

            pastedCode
                .split("")
                .forEach((digit, offset) => {
                    next[index + offset] = digit;
                });

            return next;
        });

        setError("");

        focusOtp(
            Math.min(
                index + pastedCode.length,
                OTP_LENGTH - 1
            )
        );
    };

    const handleVerifyOtp = async (
        e: FormEvent
    ) => {
        e.preventDefault();

        if (loading) return;

        if (!/^\d{6}$/.test(otpCode)) {
            setError(
                "Masukkan kode verifikasi 6 digit secara lengkap."
            );
            return;
        }

        if (!otpToken) {
            setError(
                "Sesi OTP tidak ditemukan. Silakan kirim kode baru."
            );
            return;
        }

        try {
            setLoading(true);
            clearNotifications();

            const result = await postAuth(
                "/customer/verify-login-otp",
                {
                    email_customer: normalizedEmail,
                    otp: otpCode,
                    otp_token: otpToken,
                }
            );

            const token =
                result.token ||
                result.data?.token;

            const customer =
                result.customer ||
                result.data?.customer;

            if (!token || !customer) {
                throw new Error(
                    "Login berhasil, tetapi data session tidak lengkap."
                );
            }

            // Simpan customer session seperti sebelumnya.

            sessionStorage.setItem(
                "customer_token",
                token
            );

            localStorage.setItem(
                "customer_data",
                JSON.stringify(customer)
            );

            // Hapus token versi lama.

            localStorage.removeItem(
                "customer_token"
            );

            // Clear temporary OTP session.

            setOtpToken("");
            resetOtp();

            // Hormati redirect dari halaman sebelumnya.

            navigate(redirectAfterLogin, {
                replace: true,
            });
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Verifikasi OTP gagal. Silakan coba lagi."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (loading) return;

        try {
            setLoading(true);
            clearNotifications();

            const result = await postAuth(
                "/customer/resend-otp",
                {
                    email_customer: normalizedEmail,
                    purpose: "LOGIN",
                }
            );

            const newOtpToken =
                getOtpToken(result);

            if (newOtpToken) {
                setOtpToken(newOtpToken);
            }

            setExpiresInSeconds(
                getExpiry(result)
            );

            resetOtp();

            setMessage(
                "Kode OTP baru telah dikirim ke email kamu."
            );

            window.setTimeout(() => {
                focusOtp(0);
            }, 0);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Gagal mengirim ulang kode OTP."
            );
        } finally {
            setLoading(false);
        }
    };

    const renderError = () => {
        if (!error) return null;

        return (
            <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3"
            >
                <AlertCircle
                    size={19}
                    className="mt-0.5 shrink-0 text-red-600"
                />

                <p className="text-sm leading-relaxed text-red-700">
                    {error}
                </p>
            </div>
        );
    };

    const renderMessage = () => {
        if (!message) return null;

        return (
            <div
                role="status"
                className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3"
            >
                <CheckCircle2
                    size={19}
                    className="mt-0.5 shrink-0 text-emerald-600"
                />

                <p className="text-sm leading-relaxed text-emerald-700">
                    {message}
                </p>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-white text-slate-900">
            {showFeatureToast && (
                <div
                    role="status"
                    aria-live="polite"
                    className="fixed left-1/2 top-5 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2"
                >
                    <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-white px-4 py-3 shadow-xl">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                            <Info size={19} />
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900">
                                Fitur belum tersedia
                            </p>

                            <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                Pembayaran menggunakan asuransi atau
                                benefit kantor belum tersedia saat ini.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setShowFeatureToast(false)
                            }
                            aria-label="Tutup notifikasi"
                            className="shrink-0 cursor-pointer text-slate-400 hover:text-slate-700"
                        >
                            <X size={17} />
                        </button>
                    </div>
                </div>
            )}

            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex h-14 w-full max-w-lg items-center px-4">
                    <button
                        type="button"
                        onClick={handleBack}
                        disabled={loading}
                        aria-label="Kembali"
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <ArrowLeft
                            size={21}
                            strokeWidth={1.9}
                        />
                    </button>
                </div>
            </header>

            <main className="mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-lg flex-col px-6 pb-6 pt-4">
                <div>
                    <img
                        src={logo}
                        alt="STIQR Health"
                        className="h-18 w-18 object-contain"
                    />
                </div>

                <div className="mt-4">
                    <h1 className="text-[27px] font-bold leading-tight tracking-tight text-[#00357A]">
                        {step === "EMAIL"
                            ? "Masuk dengan email"
                            : "Cek email kamu"}
                    </h1>

                    {step === "EMAIL" ? (
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                            Tanpa password. Kami kirim kode OTP ke
                            email kamu untuk verifikasi.
                        </p>
                    ) : (
                        <div className="mt-2">
                            <p className="text-sm leading-relaxed text-slate-600">
                                Kami sudah mengirim kode verifikasi
                                6 digit ke email:
                            </p>

                            <p className="mt-1 break-all text-sm font-semibold text-slate-900">
                                {normalizedEmail}
                            </p>
                        </div>
                    )}
                </div>

                {step === "EMAIL" && (
                    <form
                        id="customer-sign-in-email-form"
                        onSubmit={handleSendOtp}
                        className="mt-6 flex flex-1 flex-col"
                    >
                        {/* EMAIL FIELD */}
                        <div>
                            <label
                                htmlFor="email_customer"
                                className="mb-2 block text-xs font-bold text-[#002E69]"
                            >
                                Email
                            </label>

                            <input
                                id="email_customer"
                                name="email_customer"
                                type="email"
                                autoComplete="email"
                                inputMode="email"
                                required
                                value={email}
                                onChange={(event) => {
                                    setEmail(event.target.value);
                                    clearNotifications();
                                }}
                                placeholder="nama@email.com"
                                disabled={loading}
                                className="h-12.5 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                            />
                        </div>

                        {/* ERROR MESSAGE */}
                        {error && (
                            <div className="mt-4">
                                {renderError()}
                            </div>
                        )}

                        {/* INFORMATION */}
                        <div className="mt-5 space-y-3">
                            <div className="flex items-start gap-3">
                                <CheckCircle2
                                    size={16}
                                    strokeWidth={2}
                                    className="mt-0.5 shrink-0 text-emerald-600"
                                />

                                <p className="text-xs leading-relaxed text-[#003168]">
                                    Satu email untuk satu akun. Health
                                    Pass dan bukti bayar dikirim ke email
                                    ini.
                                </p>
                            </div>

                            <div className="flex items-start gap-3">
                                <CheckCircle2
                                    size={16}
                                    strokeWidth={2}
                                    className="mt-0.5 shrink-0 text-emerald-600"
                                />

                                <p className="text-xs leading-relaxed text-[#003168]">
                                    Cukup sekali. Pembelian berikutnya
                                    tidak perlu OTP lagi di perangkat ini
                                    selama sesi login masih aktif.
                                </p>
                            </div>
                        </div>

                        {/* OR DIVIDER */}
                        <div className="my-7 flex items-center gap-3">
                            <div className="h-px flex-1 bg-slate-200" />

                            <span className="text-xs font-semibold text-slate-500">
                                atau
                            </span>

                            <div className="h-px flex-1 bg-slate-200" />
                        </div>

                        <button
                            type="button"
                            onClick={handleFeatureUnavailable}
                            aria-label="Pakai asuransi atau benefit kantor, fitur belum tersedia"
                            className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-blue-200 hover:bg-slate-50 active:scale-[0.99]"
                        >
                            {/* ICON */}
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-teal-600">
                                <ShieldCheck
                                    size={22}
                                    strokeWidth={1.9}
                                />
                            </div>

                            {/* TEXT */}
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-[#002E69]">
                                    Pakai asuransi / benefit kantor
                                </p>

                                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                                    Masuk sekaligus hubungkan kartu,
                                    bisa bayar Rp0
                                </p>
                            </div>

                            {/* ARROW */}
                            <ChevronRight
                                size={19}
                                className="shrink-0 text-[#002E69]"
                            />
                        </button>

                        {/* FLEX SPACER */}
                        <div className="min-h-12 flex-1" />

                        <div className="mt-8 space-y-3">
                            <button
                                type="submit"
                                disabled={
                                    loading || !isValidEmail
                                }
                                className="flex h-13 w-full cursor-pointer items-center justify-center rounded-xl bg-[#0866D8] px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-[#B7CAE4] disabled:text-white"
                            >
                                {loading ? (
                                    <>
                                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Mengirim kode OTP...
                                    </>
                                ) : (
                                    "Kirim kode OTP"
                                )}
                            </button>

                            <div className="mt-4 flex flex-wrap items-center justify-center gap-1 text-sm">
                                <span className="text-slate-500">
                                    Belum punya akun?
                                </span>

                                <button
                                    type="button"
                                    onClick={handleSignUp}
                                    disabled={loading}
                                    className="cursor-pointer font-semibold text-[#0866D8] transition hover:text-blue-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Daftar sekarang
                                </button>
                            </div>

                            <p className="text-center text-[11px] leading-relaxed text-slate-500">
                                Dengan melanjutkan, kamu menyetujui{" "}
                                <button
                                    type="button"
                                    onClick={() => navigate("/customer/terms-conditions")}
                                    className="cursor-pointer font-medium text-blue-600 underline underline-offset-2"
                                >
                                    Syarat & Ketentuan
                                </button>{" "}
                                dan{" "}
                                <button
                                    type="button"
                                    onClick={() => navigate("/customer/privacy-policy")}
                                    className="cursor-pointer font-medium text-blue-600 underline underline-offset-2"
                                >
                                    Kebijakan Privasi
                                </button>
                                .
                            </p>
                        </div>
                    </form>
                )}

                {step === "OTP" && (
                    <form
                        id="customer-sign-in-otp-form"
                        onSubmit={handleVerifyOtp}
                        className="mt-6 flex flex-1 flex-col"
                    >
                        {/* OTP LABEL */}
                        <label className="mt-6 block text-sm font-bold text-[#002E69]">
                            Kode verifikasi
                        </label>

                        {/* OTP INPUTS */}
                        <div
                            role="group"
                            aria-label="Kode verifikasi 6 digit"
                            className="mt-3 grid w-full grid-cols-6 gap-2"
                        >
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={(element) => {
                                        otpInputRefs.current[index] =
                                            element;
                                    }}
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={6}
                                    autoComplete={
                                        index === 0
                                            ? "one-time-code"
                                            : "off"
                                    }
                                    aria-label={`Digit OTP ${index + 1}`}
                                    value={digit}
                                    disabled={loading}
                                    onChange={(event) =>
                                        handleOtpChange(event, index)
                                    }
                                    onKeyDown={(event) =>
                                        handleOtpKeyDown(
                                            event,
                                            index
                                        )
                                    }
                                    onPaste={(event) =>
                                        handleOtpPaste(event, index)
                                    }
                                    onFocus={(event) =>
                                        event.target.select()
                                    }
                                    className="h-14 min-w-0 w-full rounded-xl border border-slate-300 bg-white text-center text-xl font-bold text-[#00357A] outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                                />
                            ))}
                        </div>

                        {/* OTP INFO */}
                        <p className="mt-4 text-xs leading-relaxed text-slate-500">
                            Masukkan kode 6 digit yang dikirim ke
                            email kamu. Jangan bagikan kode ini
                            kepada siapa pun.
                        </p>

                        {expiresInSeconds !== null && (
                            <p className="mt-2 text-xs text-slate-500">
                                Kode berlaku selama{" "}
                                <span className="font-semibold text-slate-700">
                                    {Math.ceil(
                                        expiresInSeconds / 60
                                    )}{" "}
                                    menit
                                </span>{" "}
                                sejak diterbitkan.
                            </p>
                        )}

                        {/* NOTIFICATIONS */}
                        {error && (
                            <div className="mt-5">
                                {renderError()}
                            </div>
                        )}

                        {message && (
                            <div className="mt-5">
                                {renderMessage()}
                            </div>
                        )}

                        {/* RESEND OTP */}
                        <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-center text-sm text-slate-600">
                                Belum menerima kode?
                            </p>

                            <button
                                type="button"
                                onClick={handleResendOtp}
                                disabled={loading}
                                className="mx-auto mt-3 flex cursor-pointer items-center justify-center gap-2 text-sm font-bold text-blue-600 transition hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <RefreshCw size={16} />
                                Kirim ulang kode OTP
                            </button>
                        </div>

                        {/* FLEX SPACER */}
                        <div className="min-h-12 flex-1" />

                        {/* BOTTOM ACTION */}
                        <div className="mt-8 space-y-3">
                            <button
                                type="submit"
                                disabled={
                                    loading ||
                                    otp.some((digit) => !digit)
                                }
                                className="flex h-13 w-full cursor-pointer items-center justify-center rounded-xl bg-[#0866D8] px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-[#B7CAE4]"
                            >
                                {loading ? (
                                    <>
                                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Memverifikasi...
                                    </>
                                ) : (
                                    "Verifikasi & Masuk"
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={handleChangeEmail}
                                disabled={loading}
                                className="w-full cursor-pointer py-2 text-center text-sm font-semibold text-slate-500 transition hover:text-blue-600 disabled:opacity-50"
                            >
                                Gunakan email lain
                            </button>
                        </div>
                    </form>
                )}
            </main>
        </div>
    );
};

export default SignIn;
