
import {
    useCallback,
    useEffect,
    useState,
    type FormEvent,
} from "react";

import { MailCheck, RefreshCw, Loader2 } from "lucide-react";

import type { RegistrationData } from "../../pages/providers/SignUp";
import Toast, { type ToastData } from "../Toast";

interface Props {
    registration: RegistrationData;
    onRegistrationChange: (data: RegistrationData) => void;
    onVerified: () => void;
}

interface OTPResponse {
    success?: boolean;
    message?: string;
    data?: {
        otp_token?: string;
        expires_in_seconds?: number;
        status_provider?: string;
    };
}

const API_URI = (import.meta.env.VITE_API_URI || "").replace(/\/$/, "");

const getRemainingSeconds = (expiresAt?: number) => {
    if (!expiresAt || !Number.isFinite(expiresAt)) {
        return null;
    }

    return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
};

const ProviderOTP = ({
    registration,
    onRegistrationChange,
    onVerified,
}: Props) => {
    const [otp, setOtp] = useState("");

    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);

    const [seconds, setSeconds] = useState<number | null>(() =>
        getRemainingSeconds(registration.otp_expires_at)
    );

    const [toast, setToast] = useState<ToastData>({
        show: false,
        type: "error",
        message: "",
    });

    const closeToast = useCallback(() => {
        setToast((prev) => ({ ...prev, show: false }));
    }, []);

    const showToast = (
        type: ToastData["type"],
        message: string,
        title?: string
    ) => {
        setToast({
            show: true,
            type,
            message,
            title,
        });
    };

    /*
     * Hitung sisa waktu dari timestamp absolut,
     * bukan dengan mengurangi state secara terus-menerus.
     */
    useEffect(() => {
        const updateCountdown = () => {
            setSeconds(
                getRemainingSeconds(registration.otp_expires_at)
            );
        };

        updateCountdown();

        const interval = window.setInterval(updateCountdown, 1000);

        return () => window.clearInterval(interval);
    }, [registration.otp_expires_at]);

    const isExpired = seconds !== null && seconds <= 0;

    const verifyOTP = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (loading || resending) return;

        if (otp.length !== 6) {
            showToast(
                "error",
                "Please enter the complete 6-digit OTP.",
                "Invalid OTP"
            );
            return;
        }

        if (!registration.otp_token) {
            showToast(
                "error",
                "The verification token is unavailable. Please request a new OTP.",
                "Verification Token Missing"
            );
            return;
        }

        if (isExpired) {
            showToast(
                "error",
                "The OTP has expired. Please request a new verification code.",
                "OTP Expired"
            );
            return;
        }

        try {
            setLoading(true);

            if (!API_URI) {
                throw new Error("VITE_API_URI is not configured.");
            }

            const response = await fetch(
                `${API_URI}/provider/${registration.id_provider}/verify-otp`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify({
                        email_provider: registration.email_provider,
                        otp: otp.trim(),
                        otp_token: registration.otp_token,
                    }),
                }
            );

            const result: OTPResponse = await response
                .json()
                .catch(() => ({}));

            if (!response.ok || result.success === false) {
                throw new Error(
                    result.message ||
                    "OTP verification failed. Please check your code."
                );
            }

            /*
             * Verifikasi berhasil berdasarkan respons API.
             * Parent akan memindahkan step ke PENDING_APPROVAL.
             */
            onVerified();
        } catch (error) {
            console.error("Verify OTP error:", error);

            showToast(
                "error",
                error instanceof Error
                    ? error.message
                    : "Unable to verify OTP.",
                "Verification Failed"
            );
        } finally {
            setLoading(false);
        }
    };

    const resendOTP = async () => {
        if (loading || resending) return;

        /*
         * Jika expiry diketahui dan belum habis,
         * tombol resend belum tersedia.
         */
        if (seconds !== null && seconds > 0) return;

        try {
            setResending(true);

            if (!API_URI) {
                throw new Error("VITE_API_URI is not configured.");
            }

            /*
             * Body ini mengikuti implementasi sebelumnya.
             * Cocokkan dengan kontrak resmi resend-otp
             * apabila backend membutuhkan field berbeda.
             */
            const response = await fetch(
                `${API_URI}/provider/${registration.id_provider}/resend-otp`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify({
                        email_provider: registration.email_provider,
                    }),
                }
            );

            const result: OTPResponse = await response
                .json()
                .catch(() => ({}));

            if (!response.ok || result.success === false) {
                throw new Error(
                    result.message || "Unable to resend OTP."
                );
            }

            const newToken = result.data?.otp_token;

            /*
             * Jangan diam-diam memakai token lama jika
             * backend diduga menerbitkan token baru.
             *
             * Flow ini mengharuskan response resend
             * menyediakan otp_token untuk verify-otp.
             */
            if (!newToken) {
                showToast(
                    "error",
                    "OTP resend request succeeded, but no verification token was returned. Please check the resend-otp API response.",
                    "Verification Token Unavailable"
                );
                return;
            }

            const expiresIn = result.data?.expires_in_seconds;

            const updated: RegistrationData = {
                ...registration,
                otp_token: newToken,
                expires_in_seconds:
                    typeof expiresIn === "number" ? expiresIn : undefined,
                otp_expires_at:
                    typeof expiresIn === "number" &&
                        Number.isFinite(expiresIn) &&
                        expiresIn > 0
                        ? Date.now() + expiresIn * 1000
                        : undefined,
            };

            onRegistrationChange(updated);

            setOtp("");
            setSeconds(getRemainingSeconds(updated.otp_expires_at));

            showToast(
                "success",
                result.message ||
                "A new OTP has been sent to your email.",
                "OTP Sent"
            );
        } catch (error) {
            console.error("Resend OTP error:", error);

            showToast(
                "error",
                error instanceof Error
                    ? error.message
                    : "Unable to resend OTP.",
                "Resend Failed"
            );
        } finally {
            setResending(false);
        }
    };

    const formattedTime =
        seconds === null
            ? null
            : `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
                seconds % 60
            ).padStart(2, "0")}`;

    return (
        <>
            <Toast toast={toast} onClose={closeToast} />

            <div className="mx-auto w-full max-w-lg rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm sm:p-8">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <MailCheck size={30} />
                </div>

                <h1 className="mt-5 text-2xl font-semibold text-gray-900">
                    Verify Your Email
                </h1>

                <p className="mt-3 text-sm leading-6 text-gray-500">
                    We've sent a 6-digit verification code to
                </p>

                <p className="mt-1 break-all text-sm font-semibold text-gray-900">
                    {registration.email_provider}
                </p>

                <form onSubmit={verifyOTP} className="mt-7">
                    <label htmlFor="provider_otp" className="sr-only">
                        Verification Code
                    </label>

                    <input
                        id="provider_otp"
                        type="text"
                        value={otp}
                        onChange={(e) => {
                            setOtp(
                                e.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, 6)
                            );
                        }}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        disabled={loading || resending}
                        placeholder="000000"
                        className="w-full rounded-xl border border-gray-300 px-4 py-4 text-center text-2xl font-semibold tracking-[0.4em] text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50"
                    />

                    {isExpired ? (
                        <p className="mt-4 text-xs font-medium text-red-600">
                            Verification code has expired.
                        </p>
                    ) : formattedTime ? (
                        <p className="mt-4 text-xs text-gray-500">
                            Code expires in{" "}
                            <span className="font-semibold text-gray-800">
                                {formattedTime}
                            </span>
                        </p>
                    ) : (
                        <p className="mt-4 text-xs text-amber-600">
                            Expiration time is unavailable. The server will
                            validate whether your OTP is still active.
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={
                            loading ||
                            resending ||
                            otp.length !== 6 ||
                            isExpired ||
                            !registration.otp_token
                        }
                        className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                    >
                        {loading && <Loader2 size={17} className="animate-spin" />}
                        {loading ? "Verifying..." : "Verify Email"}
                    </button>
                </form>

                <div className="mt-6 border-t border-gray-100 pt-5">
                    <p className="text-sm text-gray-500">
                        Didn't receive the code?
                    </p>

                    <button
                        type="button"
                        onClick={() => void resendOTP()}
                        disabled={
                            resending ||
                            loading ||
                            (seconds !== null && seconds > 0)
                        }
                        className="mt-3 inline-flex cursor-pointer items-center justify-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-700 disabled:cursor-not-allowed disabled:text-gray-400"
                    >
                        {resending && (
                            <RefreshCw size={16} className="animate-spin" />
                        )}

                        {resending
                            ? "Sending..."
                            : seconds !== null && seconds > 0
                                ? "Resend available after timer ends"
                                : "Resend OTP"}
                    </button>
                </div>
            </div>
        </>
    );
};

export default ProviderOTP;
