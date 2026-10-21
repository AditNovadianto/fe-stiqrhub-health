import {
    AlertCircle,
    CheckCircle2,
    Mail,
    RefreshCw,
    ShieldCheck,
} from "lucide-react";

import {
    useRef,
    useState,
    type ChangeEvent,
    type ClipboardEvent,
    type FormEvent,
    type KeyboardEvent,
} from "react";

import { useNavigate } from "react-router-dom";
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

    // Token sementara untuk verifikasi OTP
    otp_token?: string;
    expires_in_seconds?: number;

    // Token JWT setelah login berhasil
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
    payload: Record<string, string>,
): Promise<AuthResponse> {
    const response = await fetch(`${import.meta.env.VITE_API_URI}${endpoint}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    let result: AuthResponse;

    try {
        result = await response.json();
    } catch {
        throw new Error(
            "Server memberikan response yang tidak valid.",
        );
    }

    if (!response.ok || result.success === false) {
        throw new Error(
            result.message ||
            "Permintaan gagal diproses. Silakan coba lagi.",
        );
    }

    return result;
}

const SignIn = () => {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");

    const [otp, setOtp] = useState<string[]>(
        Array(OTP_LENGTH).fill(""),
    );

    // OTP token dari backend /customer/sign-in
    const [otpToken, setOtpToken] = useState("");

    const [step, setStep] = useState<SignInStep>("EMAIL");

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState("");

    const [message, setMessage] = useState("");

    const [expiresInSeconds, setExpiresInSeconds] =
        useState<number | null>(null);

    const otpInputRefs = useRef<
        Array<HTMLInputElement | null>
    >([]);

    const normalizedEmail = email.trim().toLowerCase();

    const otpCode = otp.join("");

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

    const getOtpToken = (result: AuthResponse) => {
        return result.otp_token || result.data?.otp_token || "";
    };

    const getExpiry = (result: AuthResponse) => {
        return (
            result.expires_in_seconds ??
            result.data?.expires_in_seconds ??
            null
        );
    };

    const handleSendOtp = async (e: FormEvent) => {
        e.preventDefault();

        if (loading) return;

        if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                normalizedEmail,
            )
        ) {
            setError("Please enter a valid email address.");
            return;
        }

        try {
            setLoading(true);
            clearNotifications();

            const result = await postAuth(
                "/customer/sign-in",
                {
                    email_customer: normalizedEmail,
                },
            );

            // PENTING:
            // Simpan otp_token dari backend.
            const receivedOtpToken = getOtpToken(result);

            if (!receivedOtpToken) {
                throw new Error(
                    "OTP token tidak ditemukan pada response server.",
                );
            }

            setOtpToken(receivedOtpToken);

            setExpiresInSeconds(getExpiry(result));

            resetOtp();

            setStep("OTP");

            setMessage(
                "A verification code has been sent to your email.",
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to send verification code.",
            );
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (
        e: ChangeEvent<HTMLInputElement>,
        index: number,
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

        // Mendukung autofill beberapa digit sekaligus.
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
                    OTP_LENGTH - 1,
                ),
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
        index: number,
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
        index: number,
    ) => {
        e.preventDefault();

        const pastedCode = e.clipboardData
            .getData("text")
            .replace(/\D/g, "")
            .slice(0, OTP_LENGTH - index);

        if (!pastedCode) return;

        setOtp((prev) => {
            const next = [...prev];

            pastedCode.split("").forEach((digit, offset) => {
                next[index + offset] = digit;
            });

            return next;
        });

        setError("");

        focusOtp(
            Math.min(
                index + pastedCode.length,
                OTP_LENGTH - 1,
            ),
        );
    };

    const handleVerifyOtp = async (e: FormEvent) => {
        e.preventDefault();

        if (loading) return;

        if (!/^\d{6}$/.test(otpCode)) {
            setError(
                "Please enter the complete 6-digit verification code.",
            );
            return;
        }

        if (!otpToken) {
            setError(
                "OTP session is missing. Please request a new code.",
            );
            return;
        }

        try {
            setLoading(true);
            clearNotifications();

            // PENTING:
            // Backend memerlukan 3 field berikut:
            // email_customer, otp, otp_token.
            const result = await postAuth(
                "/customer/verify-login-otp",
                {
                    email_customer: normalizedEmail,
                    otp: otpCode,
                    otp_token: otpToken,
                },
            );

            const token =
                result.token || result.data?.token;

            const customer =
                result.customer || result.data?.customer;

            if (!token || !customer) {
                throw new Error(
                    "Login berhasil, tetapi data session tidak lengkap.",
                );
            }

            sessionStorage.setItem(
                "customer_token",
                token,
            );

            localStorage.setItem(
                "customer_data",
                JSON.stringify(customer),
            );

            // Hapus token lama dari mekanisme login sebelumnya.
            localStorage.removeItem("customer_token");

            // Bersihkan OTP sementara dari state.
            setOtpToken("");
            resetOtp();

            navigate("/customer/home", {
                replace: true,
            });
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "OTP verification failed. Please try again.",
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
                    purpose: "LOGIN"
                },
            );

            // Jika backend mengembalikan otp_token baru,
            // gunakan token tersebut untuk verifikasi berikutnya.
            const newOtpToken = getOtpToken(result);

            if (newOtpToken) {
                setOtpToken(newOtpToken);
            }

            setExpiresInSeconds(getExpiry(result));

            resetOtp();

            setMessage(
                "A new verification code has been sent to your email.",
            );

            focusOtp(0);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to resend verification code.",
            );
        } finally {
            setLoading(false);
        }
    };

    const inputClass =
        "w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100";

    const buttonClass =
        "flex w-full cursor-pointer items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400";

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
            <div className="w-full max-w-md">
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                    {/* LOGO */}
                    <img
                        src={logo}
                        alt="STIQR Hub Health"
                        className="mx-auto h-20 w-20 rounded-xl object-cover"
                    />

                    {/* HEADER */}
                    <div className="mb-7 mt-5 text-center">
                        <h1 className="text-2xl font-semibold text-gray-900">
                            {step === "EMAIL"
                                ? "Sign In"
                                : "Verify Your Email"}
                        </h1>

                        {step === "EMAIL" ? (
                            <p className="mt-2 text-sm leading-relaxed text-gray-500">
                                Sign in to your StiqrHub Health account
                                using your email address.
                            </p>
                        ) : (
                            <div className="mt-3 space-y-1">
                                <p className="text-sm text-gray-500">
                                    We've sent a 6-digit verification code to
                                </p>

                                <p className="break-all text-sm font-semibold text-gray-900">
                                    {normalizedEmail}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* ERROR MESSAGE */}
                    {error && (
                        <div
                            role="alert"
                            className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
                        >
                            <AlertCircle
                                size={19}
                                className="mt-0.5 shrink-0 text-red-600"
                            />

                            <div>
                                <p className="text-sm font-semibold text-red-700">
                                    {step === "EMAIL"
                                        ? "Sign In Failed"
                                        : "Verification Failed"}
                                </p>

                                <p className="mt-1 text-sm leading-relaxed text-red-600">
                                    {error}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* SUCCESS MESSAGE */}
                    {message && (
                        <div
                            role="status"
                            className="mb-5 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3"
                        >
                            <CheckCircle2
                                size={19}
                                className="mt-0.5 shrink-0 text-green-600"
                            />

                            <div>
                                <p className="text-sm font-semibold text-green-700">
                                    Verification Code Sent
                                </p>

                                <p className="mt-1 text-sm leading-relaxed text-green-700">
                                    {message}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* EMAIL STEP */}
                    {step === "EMAIL" && (
                        <form
                            onSubmit={handleSendOtp}
                            className="space-y-5"
                        >
                            <div>
                                <label
                                    htmlFor="email_customer"
                                    className="mb-2 block text-sm font-medium text-gray-700"
                                >
                                    Email Address
                                </label>

                                <div className="relative">
                                    <Mail
                                        size={18}
                                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                    />

                                    <input
                                        id="email_customer"
                                        name="email_customer"
                                        type="email"
                                        required
                                        autoComplete="email"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);

                                            clearNotifications();
                                        }}
                                        placeholder="Enter your email"
                                        disabled={loading}
                                        className={`${inputClass} pl-11`}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={buttonClass}
                            >
                                {loading ? (
                                    <>
                                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Sending OTP...
                                    </>
                                ) : (
                                    "Send Verification Code"
                                )}
                            </button>
                        </form>
                    )}

                    {/* OTP STEP */}
                    {step === "OTP" && (
                        <form
                            onSubmit={handleVerifyOtp}
                            className="space-y-6"
                        >
                            {/* ICON */}
                            <div className="flex justify-center">
                                <div className="rounded-full bg-blue-50 p-4">
                                    <ShieldCheck
                                        size={30}
                                        className="text-blue-600"
                                    />
                                </div>
                            </div>

                            {/* OTP INPUT */}
                            <div className="space-y-3">
                                <label className="block text-center text-sm font-medium text-gray-700">
                                    Verification Code
                                </label>

                                <div
                                    role="group"
                                    aria-label="6-digit verification code"
                                    className="flex w-full justify-center gap-2 sm:gap-3"
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
                                            aria-label={`OTP digit ${index + 1}`}
                                            autoFocus={index === 0}
                                            value={digit}
                                            disabled={loading}
                                            onChange={(e) =>
                                                handleOtpChange(e, index)
                                            }
                                            onKeyDown={(e) =>
                                                handleOtpKeyDown(e, index)
                                            }
                                            onPaste={(e) =>
                                                handleOtpPaste(e, index)
                                            }
                                            onFocus={(e) =>
                                                e.target.select()
                                            }
                                            className="
                        h-12 w-10 min-w-0 rounded-xl
                        border border-gray-300 bg-white
                        text-center text-xl font-semibold
                        text-gray-900 outline-none transition
                        focus:border-blue-500
                        focus:ring-2 focus:ring-blue-100
                        disabled:cursor-not-allowed
                        disabled:bg-gray-100
                        sm:h-14 sm:w-12
                      "
                                        />
                                    ))}
                                </div>

                                <p className="text-center text-xs leading-relaxed text-gray-500">
                                    Enter the verification code from your email.
                                    Do not share this code with anyone.
                                </p>

                                {expiresInSeconds !== null && (
                                    <p className="text-center text-xs text-gray-500">
                                        Code validity:{" "}
                                        <span className="font-medium text-gray-700">
                                            {Math.ceil(
                                                expiresInSeconds / 60,
                                            )}{" "}
                                            minutes
                                        </span>
                                        {" "}from the time it was issued.
                                    </p>
                                )}
                            </div>

                            {/* VERIFY BUTTON */}
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
                                        Verifying...
                                    </>
                                ) : (
                                    "Verify & Sign In"
                                )}
                            </button>

                            {/* RESEND OTP */}
                            <div className="text-center">
                                <p className="text-sm text-gray-500">
                                    Didn't receive the code?
                                </p>

                                <button
                                    type="button"
                                    onClick={handleResendOtp}
                                    disabled={loading}
                                    className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <RefreshCw size={15} />
                                    Resend Verification Code
                                </button>
                            </div>
                        </form>
                    )}

                    {/* SIGN UP LINK */}
                    <div className="mt-5 border-t border-gray-100 pt-6 text-center">
                        <p className="text-sm text-gray-500">
                            Don't have an account?{" "}
                            <button
                                type="button"
                                onClick={() =>
                                    navigate("/customer/sign-up")
                                }
                                className="cursor-pointer font-medium text-blue-600 hover:text-blue-700"
                            >
                                Sign Up
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignIn;
