
import { useCallback, useState } from "react";
import { Clock3, RefreshCw } from "lucide-react";

import type { RegistrationData } from "../../pages/providers/SignUp";
import Toast, { type ToastData } from "../Toast";

interface Props {
    registration: RegistrationData;
    onStatusChange: (status: string) => void;
}

interface ProviderDetailResponse {
    success?: boolean;
    message?: string;
    provider?: {
        status_provider?: string;
    };
    data?: {
        status_provider?: string;
    };
}

const API_URI = (import.meta.env.VITE_API_URI || "").replace(/\/$/, "");

const validStatuses = [
    "PENDING_OTP",
    "PENDING_APPROVAL",
    "APPROVED",
    "REJECTED",
];

const PendingApproval = ({ registration, onStatusChange }: Props) => {
    const [loading, setLoading] = useState(false);

    const [toast, setToast] = useState<ToastData>({
        show: false,
        type: "success",
        message: "",
    });

    const closeToast = useCallback(() => {
        setToast((prev) => ({
            ...prev,
            show: false,
        }));
    }, []);

    const showToast = (
        type: ToastData["type"],
        message: string,
        title?: string
    ) => {
        setToast({
            show: true,
            type,
            title,
            message,
        });
    };

    const checkStatus = async () => {
        if (loading) return;

        try {
            setLoading(true);

            if (!API_URI) {
                throw new Error("VITE_API_URI is not configured.");
            }

            /*
             * Jika GET /provider/:id membutuhkan token,
             * backend harus menyediakan mekanisme
             * autentikasi yang sesuai untuk onboarding.
             */
            const response = await fetch(
                `${API_URI}/provider/${registration.id_provider}`,
                {
                    method: "GET",
                    headers: {
                        Accept: "application/json",
                    },
                }
            );

            const result: ProviderDetailResponse = await response
                .json()
                .catch(() => ({}));

            if (response.status === 401 || response.status === 403) {
                throw new Error(
                    "Unable to check status because this endpoint requires authorization."
                );
            }

            if (!response.ok || result.success === false) {
                throw new Error(
                    result.message ||
                    "Failed to check provider registration status."
                );
            }

            const provider = result.provider ?? result.data;
            const status = provider?.status_provider;

            if (!status || !validStatuses.includes(status)) {
                throw new Error(
                    "The server returned an unknown provider status."
                );
            }

            if (status === "PENDING_APPROVAL") {
                showToast(
                    "success",
                    "Your registration is still being reviewed by our team.",
                    "Still Under Review"
                );
                return;
            }

            /*
             * State baru hanya diterapkan jika API
             * benar-benar mengembalikan status valid.
             */
            onStatusChange(status);
        } catch (error) {
            console.error("Check provider status error:", error);

            showToast(
                "error",
                error instanceof Error
                    ? error.message
                    : "Unable to check registration status.",
                "Status Check Failed"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Toast toast={toast} onClose={closeToast} />

            <div className="mx-auto w-full max-w-lg rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm sm:p-8">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                    <Clock3 size={30} />
                </div>

                <h1 className="mt-5 text-2xl font-semibold text-gray-900">
                    Registration Under Review
                </h1>

                <p className="mt-3 text-sm leading-6 text-gray-500">
                    Your email has been successfully verified. Our team
                    is now reviewing your provider information and documents.
                </p>

                <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-amber-600">
                        Current Registration Status
                    </p>

                    <p className="mt-1 text-sm font-semibold text-amber-700">
                        PENDING APPROVAL
                    </p>
                </div>

                <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-left">
                    <p className="text-xs text-gray-500">
                        Provider ID
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                        #{registration.id_provider}
                    </p>

                    <p className="mt-3 text-xs text-gray-500">
                        Registration Email
                    </p>
                    <p className="mt-1 break-all text-sm font-semibold text-gray-900">
                        {registration.email_provider}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => void checkStatus()}
                    disabled={loading}
                    className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                    <RefreshCw
                        size={17}
                        className={loading ? "animate-spin" : ""}
                    />

                    {loading ? "Checking Status..." : "Check Status"}
                </button>

                <p className="mt-4 text-xs leading-5 text-gray-400">
                    You can safely close this page. Your registration
                    progress will be restored when you return.
                </p>
            </div>
        </>
    );
};

export default PendingApproval;
