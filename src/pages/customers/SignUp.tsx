import {
    AlertCircle,
    CheckCircle2,
    MailCheck,
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

async function postAuth(
    endpoint: string,
    payload: Record<string, string | number>,
): Promise<ApiResponse> {
    const response = await fetch(`${import.meta.env.VITE_API_URI}${endpoint}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    let result: ApiResponse;

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

const SignUp = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState<SignUpForm>({
        name_customer: "",
        email_customer: "",
        phone_number_customer: "",
        dob_customer: "",
        gender_customer: "",
    });

    const [otp, setOtp] = useState<string[]>(
        Array(OTP_LENGTH).fill(""),
    );

    const [otpToken, setOtpToken] = useState("");

    const [step, setStep] = useState<SignUpStep>("FORM");
    const [loading, setLoading] = useState(false);

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const [expiresInSeconds, setExpiresInSeconds] =
        useState<number | null>(null);

    const otpInputRefs = useRef<
        Array<HTMLInputElement | null>
    >([]);

    const normalizedEmail = formData.email_customer
        .trim()
        .toLowerCase();

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

    const getOtpToken = (result: ApiResponse) => {
        return (
            result.otp_token ||
            result.data?.otp_token ||
            ""
        );
    };

    const getExpiry = (result: ApiResponse) => {
        return (
            result.expires_in_seconds ??
            result.data?.expires_in_seconds ??
            null
        );
    };

    const handleChange = (
        e: ChangeEvent<
            HTMLInputElement | HTMLSelectElement
        >,
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
            return "Nama wajib diisi.";
        }

        if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                normalizedEmail,
            )
        ) {
            return "Alamat email tidak valid.";
        }

        if (
            !/^\+?[0-9]{8,15}$/.test(
                formData.phone_number_customer.trim(),
            )
        ) {
            return "Nomor telepon harus terdiri dari 8–15 digit.";
        }

        if (!formData.dob_customer) {
            return "Tanggal lahir wajib diisi.";
        }

        const dob = new Date(
            `${formData.dob_customer}T00:00:00`,
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

            const result = await postAuth(
                "/customer/sign-up",
                {
                    name_customer:
                        formData.name_customer.trim(),
                    email_customer: normalizedEmail,
                    phone_number_customer:
                        formData.phone_number_customer.trim(),
                    dob_customer: formData.dob_customer,
                    gender_customer: formData.gender_customer,
                    id_platform: 1,
                },
            );

            // Simpan otp_token bila dikembalikan backend.
            const receivedOtpToken = getOtpToken(result);

            setOtpToken(receivedOtpToken);
            setExpiresInSeconds(getExpiry(result));

            resetOtp();
            setStep("OTP");

            setMessage(
                result.message ||
                "Pendaftaran berhasil. Kode verifikasi telah dikirim ke email Anda.",
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Gagal melakukan pendaftaran.",
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

        try {
            setLoading(true);
            clearNotifications();

            // Mengikuti endpoint verifikasi registrasi.
            // otp_token disertakan jika backend mengembalikannya.
            await postAuth(
                "/customer/verify-otp",
                {
                    email_customer: normalizedEmail,
                    otp: otpCode,
                    ...(otpToken
                        ? { otp_token: otpToken }
                        : {}),
                },
            );

            setOtpToken("");
            resetOtp();

            // Registrasi selesai, customer login
            // menggunakan email + OTP.
            navigate("/customer/sign-in", {
                replace: true,
            });
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Verifikasi OTP gagal. Silakan coba lagi.",
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
                    purpose: "REGISTER"
                },
            );

            const newOtpToken = getOtpToken(result);

            if (newOtpToken) {
                setOtpToken(newOtpToken);
            }

            setExpiresInSeconds(getExpiry(result));
            resetOtp();

            setMessage(
                result.message ||
                "Kode OTP baru telah dikirim ke email Anda.",
            );

            focusOtp(0);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Gagal mengirim ulang kode OTP.",
            );
        } finally {
            setLoading(false);
        }
    };

    const inputClass =
        "w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100";

    const labelClass =
        "mb-2 block text-sm font-medium text-gray-700";

    const buttonClass =
        "flex w-full cursor-pointer items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400";

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
            <div
                className={`w-full ${step === "FORM"
                    ? "max-w-lg"
                    : "max-w-md"
                    }`}
            >
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                    {/* LOGO */}
                    <img
                        src={logo}
                        alt="STIQR Hub Health"
                        className="mx-auto h-20 w-20 rounded-xl object-cover"
                    />

                    {/* HEADER */}
                    <div className="mb-8 mt-5 text-center">
                        <h1 className="text-2xl font-semibold text-gray-900">
                            {step === "FORM"
                                ? "Create Account"
                                : "Verify Your Email"}
                        </h1>

                        {step === "FORM" ? (
                            <p className="mt-2 text-sm leading-relaxed text-gray-500">
                                Create your StiqrHub Health account
                                without a password.
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

                    {/* ERROR NOTIFICATION */}
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
                                    {step === "FORM"
                                        ? "Registration Failed"
                                        : "Verification Failed"}
                                </p>

                                <p className="mt-1 text-sm leading-relaxed text-red-600">
                                    {error}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* SUCCESS NOTIFICATION */}
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

                    {step === "FORM" && (
                        <form
                            onSubmit={handleSignUp}
                            className="space-y-5"
                        >
                            {/* FULL NAME */}
                            <div>
                                <label
                                    htmlFor="name_customer"
                                    className={labelClass}
                                >
                                    Full Name
                                </label>

                                <input
                                    id="name_customer"
                                    name="name_customer"
                                    type="text"
                                    autoComplete="name"
                                    required
                                    value={formData.name_customer}
                                    onChange={handleChange}
                                    placeholder="Enter your full name"
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
                                    required
                                    value={formData.email_customer}
                                    onChange={handleChange}
                                    placeholder="Enter your email"
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
                                    Phone Number
                                </label>

                                <input
                                    id="phone_number_customer"
                                    name="phone_number_customer"
                                    type="tel"
                                    autoComplete="tel"
                                    required
                                    value={formData.phone_number_customer}
                                    onChange={handleChange}
                                    placeholder="08xxxxxxxxxx"
                                    disabled={loading}
                                    className={inputClass}
                                />
                            </div>

                            {/* DATE OF BIRTH & GENDER */}
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <div>
                                    <label
                                        htmlFor="dob_customer"
                                        className={labelClass}
                                    >
                                        Date of Birth
                                    </label>

                                    <input
                                        id="dob_customer"
                                        name="dob_customer"
                                        type="date"
                                        required
                                        value={formData.dob_customer}
                                        onChange={handleChange}
                                        max={new Date()
                                            .toLocaleDateString("en-CA")}
                                        disabled={loading}
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="gender_customer"
                                        className={labelClass}
                                    >
                                        Gender
                                    </label>

                                    <select
                                        id="gender_customer"
                                        name="gender_customer"
                                        required
                                        value={formData.gender_customer}
                                        onChange={handleChange}
                                        disabled={loading}
                                        className={`${inputClass} bg-white`}
                                    >
                                        <option value="">
                                            Select gender
                                        </option>

                                        <option value="male">
                                            Male
                                        </option>

                                        <option value="female">
                                            Female
                                        </option>
                                    </select>
                                </div>
                            </div>

                            {/* REGISTRATION INFO */}
                            <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                                <ShieldCheck
                                    size={19}
                                    className="mt-0.5 shrink-0 text-blue-600"
                                />

                                <p className="text-sm leading-relaxed text-blue-700">
                                    Your account will be verified using a
                                    one-time password sent to your email.
                                </p>
                            </div>

                            {/* SUBMIT */}
                            <button
                                type="submit"
                                disabled={loading}
                                className={buttonClass}
                            >
                                {loading ? (
                                    <>
                                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Creating account...
                                    </>
                                ) : (
                                    "Create Account & Send OTP"
                                )}
                            </button>
                        </form>
                    )}

                    {step === "OTP" && (
                        <form
                            onSubmit={handleVerifyOtp}
                            className="space-y-6"
                        >
                            {/* VERIFICATION ICON */}
                            <div className="flex justify-center">
                                <div className="rounded-full bg-blue-50 p-4">
                                    <MailCheck
                                        size={30}
                                        className="text-blue-600"
                                    />
                                </div>
                            </div>

                            {/* OTP BOXES */}
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
                                    "Verify Email"
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

                    {/* SIGN IN LINK */}
                    <div className="mt-5 border-t border-gray-100 pt-6 text-center">
                        <p className="text-sm text-gray-500">
                            Already have an account?{" "}
                            <button
                                type="button"
                                onClick={() =>
                                    navigate("/customer/sign-in")
                                }
                                className="cursor-pointer font-medium text-blue-600 hover:text-blue-700"
                            >
                                Sign In
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignUp;
