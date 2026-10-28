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

interface SignUpForm {
    name_customer: string;
    email_customer: string;
    phone_number_customer: string;
    dob_customer: string;
    gender_customer: string;
}

interface ApiResponse {
    success?: boolean;
    message?: string;
    otp_token?: string;
    expires_in_seconds?: number;
    data?: {
        otp_token?: string;
        expires_in_seconds?: number;
    };
}

type SignUpStep = "FORM" | "OTP";

const OTP_LENGTH = 6;

const API_BASE_URL = String(
    import.meta.env.VITE_API_URI || ""
).replace(/\/+$/, "");

async function postAuth(
    endpoint: string,
    payload: Record<string, string | number>
): Promise<ApiResponse> {
    const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(payload),
        }
    );

    let result: ApiResponse;

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

const SignUp = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [formData, setFormData] = useState<SignUpForm>({
        name_customer: "",
        email_customer: "",
        phone_number_customer: "",
        dob_customer: "",
        gender_customer: "",
    });

    const [otp, setOtp] = useState<string[]>(
        Array(OTP_LENGTH).fill("")
    );

    const [otpToken, setOtpToken] = useState("");

    const [step, setStep] = useState<SignUpStep>("FORM");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const [expiresInSeconds, setExpiresInSeconds] =
        useState<number | null>(null);

    const [showFeatureToast, setShowFeatureToast] =
        useState(false);

    const [showPolicyToast, setShowPolicyToast] =
        useState(false);

    const otpInputRefs = useRef<
        Array<HTMLInputElement | null>
    >([]);

    const normalizedEmail = formData.email_customer
        .trim()
        .toLowerCase();

    const otpCode = otp.join("");

    const isValidEmail =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            normalizedEmail
        );

    const requestedRedirect = searchParams.get("redirect");

    const safeRedirect =
        requestedRedirect?.startsWith("/") &&
            !requestedRedirect.startsWith("//") &&
            !requestedRedirect.startsWith("/\\")
            ? requestedRedirect
            : null;

    const signInPath = safeRedirect
        ? `/customer/sign-in?redirect=${encodeURIComponent(
            safeRedirect
        )}`
        : "/customer/sign-in";

    const clearNotifications = () => {
        setError("");
        setMessage("");
    };

    const resetOtp = () => {
        setOtp(Array(OTP_LENGTH).fill(""));
    };

    const focusOtp = (index: number) => {
        otpInputRefs.current[index]?.focus();
    };

    const getOtpToken = (result: ApiResponse): string => {
        return (
            result.otp_token ||
            result.data?.otp_token ||
            ""
        );
    };

    const getExpiry = (
        result: ApiResponse
    ): number | null => {
        return (
            result.expires_in_seconds ??
            result.data?.expires_in_seconds ??
            null
        );
    };

    useEffect(() => {
        if (!showFeatureToast) return;

        const timeout = window.setTimeout(() => {
            setShowFeatureToast(false);
        }, 3500);

        return () => window.clearTimeout(timeout);
    }, [showFeatureToast]);

    useEffect(() => {
        if (!showPolicyToast) return;

        const timeout = window.setTimeout(() => {
            setShowPolicyToast(false);
        }, 3500);

        return () => window.clearTimeout(timeout);
    }, [showPolicyToast]);

    const handleBack = () => {
        if (loading) return;

        if (step === "OTP") {
            setStep("FORM");
            resetOtp();
            setOtpToken("");
            setExpiresInSeconds(null);
            clearNotifications();
            return;
        }

        navigate(signInPath);
    };

    const handleSignIn = () => {
        if (loading) return;

        navigate(signInPath);
    };

    const handleChangeRegistrationData = () => {
        if (loading) return;

        setStep("FORM");
        resetOtp();
        setOtpToken("");
        setExpiresInSeconds(null);
        clearNotifications();
    };

    const handleChange = (
        e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        setError("");
    };

    const validateForm = (): string | null => {
        if (!formData.name_customer.trim()) {
            return "Nama lengkap wajib diisi.";
        }

        if (!isValidEmail) {
            return "Alamat email tidak valid.";
        }

        if (
            !/^\+?[0-9]{8,15}$/.test(
                formData.phone_number_customer.trim()
            )
        ) {
            return "Nomor telepon harus terdiri dari 8–15 digit.";
        }

        if (!formData.dob_customer) {
            return "Tanggal lahir wajib diisi.";
        }

        const dob = new Date(
            `${formData.dob_customer}T00:00:00`
        );

        if (
            Number.isNaN(dob.getTime()) ||
            dob > new Date()
        ) {
            return "Tanggal lahir tidak valid.";
        }

        if (!formData.gender_customer) {
            return "Jenis kelamin wajib dipilih.";
        }

        return null;
    };

    const handleSignUp = async (e: FormEvent) => {
        e.preventDefault();

        if (loading) return;

        const validationError = validateForm();

        if (validationError) {
            setError(validationError);
            return;
        }

        try {
            setLoading(true);
            clearNotifications();

            // Endpoint dan payload registrasi lama
            // tetap dipertahankan.

            const result = await postAuth(
                "/customer/sign-up",
                {
                    name_customer: formData.name_customer.trim(),
                    email_customer: normalizedEmail,
                    phone_number_customer:
                        formData.phone_number_customer.trim(),
                    dob_customer: formData.dob_customer,
                    gender_customer: formData.gender_customer,
                    id_platform: 1,
                }
            );

            const receivedOtpToken = getOtpToken(result);

            setOtpToken(receivedOtpToken);
            setExpiresInSeconds(getExpiry(result));

            resetOtp();
            setStep("OTP");

            setMessage(
                result.message ||
                "Pendaftaran berhasil. Kode verifikasi telah dikirim ke email kamu."
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Gagal melakukan pendaftaran."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (
        e: ChangeEvent<HTMLInputElement>,
        index: number
    ) => {
        const value = e.target.value.replace(/\D/g, "");

        if (!value) {
            setOtp((prev) => {
                const next = [...prev];
                next[index] = "";
                return next;
            });

            setError("");
            return;
        }

        // Mendukung autofill beberapa digit.

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

        if (e.key === "ArrowLeft" && index > 0) {
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

    const handleVerifyOtp = async (e: FormEvent) => {
        e.preventDefault();

        if (loading) return;

        if (!/^\d{6}$/.test(otpCode)) {
            setError(
                "Masukkan kode verifikasi 6 digit secara lengkap."
            );
            return;
        }

        try {
            setLoading(true);
            clearNotifications();

            // Endpoint verifikasi registrasi tetap sama.
            // OTP token dikirim apabila backend menyediakannya.

            await postAuth(
                "/customer/verify-otp",
                {
                    email_customer: normalizedEmail,
                    otp: otpCode,
                    ...(otpToken
                        ? { otp_token: otpToken }
                        : {}),
                }
            );

            setOtpToken("");
            resetOtp();

            // Setelah verifikasi registrasi,
            // customer login melalui Sign In seperti sebelumnya.
            // Parameter redirect tetap dipertahankan.

            navigate(signInPath, {
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
                    purpose: "REGISTER",
                }
            );

            const newOtpToken = getOtpToken(result);

            if (newOtpToken) {
                setOtpToken(newOtpToken);
            }

            setExpiresInSeconds(getExpiry(result));

            resetOtp();

            setMessage(
                result.message ||
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

    const inputClass =
        "h-[50px] w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50";

    const labelClass =
        "mb-2 block text-xs font-bold text-[#002E69]";

    const buttonClass =
        "flex h-[52px] w-full cursor-pointer items-center justify-center rounded-xl bg-[#0866D8] px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-[#B7CAE4] disabled:text-white";

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
            {(showFeatureToast || showPolicyToast) && (
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
                                {showFeatureToast
                                    ? "Pendaftaran melalui asuransi atau benefit kantor belum tersedia saat ini."
                                    : "Halaman Syarat & Ketentuan dan Kebijakan Privasi belum tersedia saat ini."}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setShowFeatureToast(false);
                                setShowPolicyToast(false);
                            }}
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
                {/* LOGO */}
                <div>
                    <img
                        src={logo}
                        alt="STIQR Health"
                        className="h-18 w-18 object-contain"
                    />
                </div>

                {/* PAGE TITLE */}
                <div className="mt-4">
                    <h1 className="text-[27px] font-bold leading-tight tracking-tight text-[#00357A]">
                        {step === "FORM"
                            ? "Buat akun STIQR Health"
                            : "Cek email kamu"}
                    </h1>

                    {step === "FORM" ? (
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                            Daftar tanpa password. Lengkapi data diri,
                            lalu verifikasi email kamu menggunakan kode OTP.
                        </p>
                    ) : (
                        <div className="mt-2">
                            <p className="text-sm leading-relaxed text-slate-600">
                                Kode verifikasi 6 digit telah dikirim ke:
                            </p>

                            <p className="mt-1 break-all text-sm font-semibold text-slate-900">
                                {normalizedEmail}
                            </p>
                        </div>
                    )}
                </div>

                {step === "FORM" && (
                    <form
                        id="customer-sign-up-form"
                        onSubmit={handleSignUp}
                        className="mt-6 flex flex-1 flex-col"
                    >
                        <div className="space-y-5">
                            {/* FULL NAME */}
                            <div>
                                <label
                                    htmlFor="name_customer"
                                    className={labelClass}
                                >
                                    Nama lengkap
                                </label>

                                <input
                                    id="name_customer"
                                    name="name_customer"
                                    type="text"
                                    autoComplete="name"
                                    required
                                    value={formData.name_customer}
                                    onChange={handleChange}
                                    placeholder="Masukkan nama lengkap kamu"
                                    disabled={loading}
                                    className={inputClass}
                                />
                            </div>

                            {/* EMAIL */}
                            <div>
                                <label
                                    htmlFor="email_customer"
                                    className={labelClass}
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
                                    value={formData.email_customer}
                                    onChange={handleChange}
                                    placeholder="nama@email.com"
                                    disabled={loading}
                                    className={inputClass}
                                />
                            </div>

                            {/* PHONE NUMBER */}
                            <div>
                                <label
                                    htmlFor="phone_number_customer"
                                    className={labelClass}
                                >
                                    Nomor telepon
                                </label>

                                <input
                                    id="phone_number_customer"
                                    name="phone_number_customer"
                                    type="tel"
                                    autoComplete="tel"
                                    inputMode="tel"
                                    required
                                    value={formData.phone_number_customer}
                                    onChange={handleChange}
                                    placeholder="08xxxxxxxxxx"
                                    disabled={loading}
                                    className={inputClass}
                                />
                            </div>

                            {/* DATE OF BIRTH */}
                            <div>
                                <label
                                    htmlFor="dob_customer"
                                    className={labelClass}
                                >
                                    Tanggal lahir
                                </label>

                                <div className="relative">
                                    <input
                                        id="dob_customer"
                                        name="dob_customer"
                                        type="date"
                                        required
                                        value={formData.dob_customer}
                                        onChange={handleChange}
                                        max={new Date().toLocaleDateString("en-CA")}
                                        disabled={loading}
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            {/* GENDER */}
                            <div>
                                <label
                                    htmlFor="gender_customer"
                                    className={labelClass}
                                >
                                    Jenis kelamin
                                </label>

                                <select
                                    id="gender_customer"
                                    name="gender_customer"
                                    required
                                    value={formData.gender_customer}
                                    onChange={handleChange}
                                    disabled={loading}
                                    className={inputClass}
                                >
                                    <option value="">
                                        Pilih jenis kelamin
                                    </option>

                                    {/* Values mengikuti API yang sudah ada. */}
                                    <option value="male">
                                        Laki-laki
                                    </option>

                                    <option value="female">
                                        Perempuan
                                    </option>
                                </select>
                            </div>
                        </div>

                        {/* ERROR */}
                        {error && (
                            <div className="mt-5">
                                {renderError()}
                            </div>
                        )}

                        {/* REGISTRATION INFORMATION */}
                        <div className="mt-6 space-y-3">
                            <div className="flex items-start gap-3">
                                <CheckCircle2
                                    size={16}
                                    className="mt-0.5 shrink-0 text-emerald-600"
                                />

                                <p className="text-xs leading-relaxed text-[#003168]">
                                    Satu email untuk satu akun.
                                    Health Pass dan bukti pembayaran
                                    akan dikirim ke email kamu.
                                </p>
                            </div>

                            <div className="flex items-start gap-3">
                                <CheckCircle2
                                    size={16}
                                    className="mt-0.5 shrink-0 text-emerald-600"
                                />

                                <p className="text-xs leading-relaxed text-[#003168]">
                                    Akun diverifikasi melalui kode OTP
                                    yang dikirim ke email, tanpa password.
                                </p>
                            </div>
                        </div>

                        {/* INSURANCE DIVIDER */}
                        <div className="my-7 flex items-center gap-3">
                            <div className="h-px flex-1 bg-slate-200" />

                            <span className="text-xs font-semibold text-slate-500">
                                atau
                            </span>

                            <div className="h-px flex-1 bg-slate-200" />
                        </div>

                        {/* INSURANCE / OFFICE BENEFIT */}
                        <button
                            type="button"
                            onClick={() => {
                                setShowFeatureToast(true);
                                setShowPolicyToast(false);
                            }}
                            className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-blue-200 hover:bg-slate-50 active:scale-[0.99]"
                        >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-teal-600">
                                <ShieldCheck
                                    size={22}
                                    strokeWidth={1.9}
                                />
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-[#002E69]">
                                    Pakai asuransi / benefit kantor
                                </p>

                                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                                    Hubungkan kartu untuk menggunakan benefit
                                </p>
                            </div>

                            <ChevronRight
                                size={19}
                                className="shrink-0 text-[#002E69]"
                            />
                        </button>

                        {/* BOTTOM SPACER */}
                        <div className="min-h-8 flex-1" />

                        {/* SUBMIT AND SIGN IN */}
                        <div className="mt-8 space-y-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className={buttonClass}
                            >
                                {loading ? (
                                    <>
                                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Mengirim kode OTP...
                                    </>
                                ) : (
                                    "Daftar & Kirim kode OTP"
                                )}
                            </button>

                            <div className="flex flex-wrap items-center justify-center gap-1 text-sm">
                                <span className="text-slate-500">
                                    Sudah punya akun?
                                </span>

                                <button
                                    type="button"
                                    onClick={handleSignIn}
                                    disabled={loading}
                                    className="cursor-pointer font-bold text-[#0866D8] hover:underline disabled:opacity-50"
                                >
                                    Masuk sekarang
                                </button>
                            </div>

                            <p className="text-center text-[11px] leading-relaxed text-slate-500">
                                Dengan mendaftar, kamu menyetujui{" "}
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
                        id="customer-sign-up-otp-form"
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
                                        otpInputRefs.current[index] = element;
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
                                        handleOtpKeyDown(event, index)
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

                        {/* OTP INFORMATION */}
                        <p className="mt-4 text-xs leading-relaxed text-slate-500">
                            Masukkan kode enam digit yang dikirim
                            ke email kamu. Jangan berikan kode ini
                            kepada siapa pun, termasuk pihak STIQR.
                        </p>

                        {/* SERVER OTP EXPIRY */}
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

                        {/* ERROR AND MESSAGE */}
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
                                className="mx-auto mt-3 flex cursor-pointer items-center justify-center gap-2 text-sm font-bold text-blue-600 transition hover:text-blue-700 disabled:opacity-50"
                            >
                                <RefreshCw size={16} />
                                Kirim ulang kode OTP
                            </button>
                        </div>

                        {/* BOTTOM SPACER */}
                        <div className="min-h-12 flex-1" />

                        {/* VERIFY BUTTON */}
                        <div className="mt-8 space-y-3">
                            <button
                                type="submit"
                                disabled={
                                    loading ||
                                    otp.some((digit) => !digit)
                                }
                                className={buttonClass}
                            >
                                {loading ? (
                                    <>
                                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Memverifikasi...
                                    </>
                                ) : (
                                    "Verifikasi & Selesaikan Pendaftaran"
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={handleChangeRegistrationData}
                                disabled={loading}
                                className="w-full cursor-pointer py-2 text-center text-sm font-semibold text-slate-500 hover:text-blue-600 disabled:opacity-50"
                            >
                                Ubah data pendaftaran
                            </button>
                        </div>
                    </form>
                )}
            </main>
        </div>
    );
};

export default SignUp;
