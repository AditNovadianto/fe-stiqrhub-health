
import { useCallback, useEffect, useState } from "react";

import ProviderInformation from "../../components/providers/ProviderInformation";
import ProviderDocuments from "../../components/providers/ProviderDocuments";
import ProviderOTP from "../../components/providers/ProviderOTP";
import PendingApproval from "../../components/providers/PendingApproval";
import CreateProviderUser from "../../components/providers/CreateProviderUser";
import RejectedProvider from "../../components/providers/RejectedProvider";
import ProviderProgress from "../../components/providers/ProviderProgress";

export interface ProviderFormData {
    name_provider: string;
    email_provider: string;
    phone_number_provider: string;
    address_provider: string;
    province_provider: string;
    city_provider: string;
    district_provider: string;
    postal_code_provider: string;
    description_provider: string;
    id_provider_category: string;
}

export interface ProviderDocumentsData {
    logo_provider: File | null;
    akta_pendirian_perusahaan: File | null;
    nomor_induk_berusaha: File | null;
    npwp: File | null;
    sertifikat_standard: File | null;
    persetujuan_lingkungan: File | null;
    surat_izin_apotek: File | null;
}

export type ProviderStatus =
    | "PENDING_OTP"
    | "PENDING_APPROVAL"
    | "APPROVED"
    | "REJECTED";

export type RegistrationStep =
    | "INFORMATION"
    | "DOCUMENTS"
    | ProviderStatus;

export interface RegistrationData {
    id_provider: number;
    email_provider: string;
    status_provider: ProviderStatus;
    otp_token?: string;
    expires_in_seconds?: number;
    otp_expires_at?: number;
}

const API_URI = (import.meta.env.VITE_API_URI || "").replace(/\/$/, "");

const REGISTRATION_KEY = "provider_registration";
const DRAFT_KEY = "provider_registration_draft";
const DRAFT_STEP_KEY = "provider_registration_draft_step";

const initialProviderData: ProviderFormData = {
    name_provider: "",
    email_provider: "",
    phone_number_provider: "",
    address_provider: "",
    province_provider: "",
    city_provider: "",
    district_provider: "",
    postal_code_provider: "",
    description_provider: "",
    id_provider_category: "",
};

const initialDocuments: ProviderDocumentsData = {
    logo_provider: null,
    akta_pendirian_perusahaan: null,
    nomor_induk_berusaha: null,
    npwp: null,
    sertifikat_standard: null,
    persetujuan_lingkungan: null,
    surat_izin_apotek: null,
};

const isProviderStatus = (status: unknown): status is ProviderStatus => {
    return (
        typeof status === "string" &&
        ["PENDING_OTP", "PENDING_APPROVAL", "APPROVED", "REJECTED"].includes(
            status
        )
    );
};

const isRegistrationData = (value: unknown): value is RegistrationData => {
    if (!value || typeof value !== "object") return false;

    const data = value as Partial<RegistrationData>;

    return (
        Number.isInteger(data.id_provider) &&
        Number(data.id_provider) > 0 &&
        typeof data.email_provider === "string" &&
        data.email_provider.length > 0 &&
        isProviderStatus(data.status_provider)
    );
};

interface ProviderDetailResponse {
    success?: boolean;
    message?: string;
    provider?: {
        id_provider?: number;
        email_provider?: string;
        status_provider?: string;
    };
    data?: {
        id_provider?: number;
        email_provider?: string;
        status_provider?: string;
    };
}

const SignUp = () => {
    const [step, setStep] = useState<RegistrationStep>("INFORMATION");

    const [providerData, setProviderData] =
        useState<ProviderFormData>(initialProviderData);

    const [documents, setDocuments] =
        useState<ProviderDocumentsData>(initialDocuments);

    const [registration, setRegistration] =
        useState<RegistrationData | null>(null);

    const [isInitializing, setIsInitializing] = useState(true);

    const [statusCheckError, setStatusCheckError] = useState<string | null>(
        null
    );

    const [isCheckingStatus, setIsCheckingStatus] = useState(false);

    const saveRegistration = useCallback((data: RegistrationData) => {
        setRegistration(data);
        setStep(data.status_provider);

        localStorage.setItem(REGISTRATION_KEY, JSON.stringify(data));
    }, []);

    const clearRegistration = useCallback(() => {
        localStorage.removeItem(REGISTRATION_KEY);
        localStorage.removeItem(DRAFT_KEY);
        localStorage.removeItem(DRAFT_STEP_KEY);

        setRegistration(null);
        setProviderData({ ...initialProviderData });
        setDocuments({ ...initialDocuments });
        setStatusCheckError(null);
        setStep("INFORMATION");
    }, []);

    const fetchProviderStatus = useCallback(
        async (saved: RegistrationData) => {
            setIsCheckingStatus(true);
            setStatusCheckError(null);

            try {
                if (!API_URI) {
                    throw new Error("VITE_API_URI is not configured.");
                }

                /*
                 * Endpoint GET /provider/:id pada Postman
                 * terlihat menggunakan Bearer Token.
                 *
                 * Token OTP bukan otomatis Bearer Token.
                 * Gunakan Authorization hanya jika backend
                 * menyediakan token onboarding yang sah.
                 */
                const response = await fetch(
                    `${API_URI}/provider/${saved.id_provider}`,
                    {
                        method: "GET",
                        headers: {
                            Accept: "application/json",
                        },
                    }
                );

                if (response.status === 401 || response.status === 403) {
                    throw new Error(
                        "Status terbaru belum dapat diverifikasi karena endpoint provider memerlukan otorisasi. Progress terakhir tetap disimpan."
                    );
                }

                if (!response.ok) {
                    throw new Error(
                        `Unable to check provider status (${response.status}).`
                    );
                }

                const result: ProviderDetailResponse = await response.json();

                const provider = result.provider ?? result.data;

                if (!provider || !isProviderStatus(provider.status_provider)) {
                    throw new Error(
                        "Provider status response is invalid."
                    );
                }

                const newStatus = provider.status_provider;

                const updated: RegistrationData = {
                    ...saved,
                    email_provider:
                        provider.email_provider ?? saved.email_provider,
                    status_provider: newStatus,
                };

                if (newStatus !== "PENDING_OTP") {
                    delete updated.otp_token;
                    delete updated.expires_in_seconds;
                    delete updated.otp_expires_at;
                }

                saveRegistration(updated);
            } catch (error) {
                console.error("Check provider status error:", error);

                setStatusCheckError(
                    error instanceof Error
                        ? error.message
                        : "Unable to check the latest registration status."
                );

                /*
                 * Jangan menganggap status cache sebagai
                 * status yang sudah berhasil diverifikasi.
                 *
                 * Tetap tampilkan progress terakhir agar
                 * pengguna tidak mengulang pendaftaran.
                 */
                setStep(saved.status_provider);
            } finally {
                setIsCheckingStatus(false);
            }
        },
        [saveRegistration]
    );

    useEffect(() => {
        let cancelled = false;

        const initialize = async () => {
            try {
                const stored = localStorage.getItem(REGISTRATION_KEY);

                if (stored) {
                    try {
                        const parsed = JSON.parse(stored);

                        if (isRegistrationData(parsed)) {
                            let registrationData: RegistrationData = parsed;

                            /*
                             * Migrasi data lama:
                             * expires_in_seconds saja tidak cukup
                             * untuk mengetahui kapan OTP berakhir.
                             *
                             * Jangan mengarang waktu expiry baru.
                             */
                            if (
                                registrationData.status_provider === "PENDING_OTP" &&
                                !registrationData.otp_expires_at
                            ) {
                                registrationData = {
                                    ...registrationData,
                                    expires_in_seconds: undefined,
                                };
                            }

                            if (cancelled) return;

                            setRegistration(registrationData);
                            setStep(registrationData.status_provider);

                            await fetchProviderStatus(registrationData);
                            return;
                        }

                        localStorage.removeItem(REGISTRATION_KEY);
                    } catch {
                        localStorage.removeItem(REGISTRATION_KEY);
                    }
                }

                const draft = localStorage.getItem(DRAFT_KEY);
                const draftStep = localStorage.getItem(DRAFT_STEP_KEY);

                if (draft) {
                    try {
                        const parsedDraft = JSON.parse(draft);

                        if (
                            parsedDraft &&
                            typeof parsedDraft === "object" &&
                            !Array.isArray(parsedDraft)
                        ) {
                            setProviderData({
                                ...initialProviderData,
                                ...parsedDraft,
                            });
                        }
                    } catch {
                        localStorage.removeItem(DRAFT_KEY);
                    }
                }

                /*
                 * Berkas File tidak bisa dipulihkan secara
                 * otomatis dari localStorage.
                 *
                 * Jika sebelumnya sudah Step Documents,
                 * pengguna kembali ke tahap tersebut untuk
                 * memilih dokumen lagi.
                 */
                setStep(
                    draftStep === "DOCUMENTS" ? "DOCUMENTS" : "INFORMATION"
                );
            } catch (error) {
                console.error("Registration initialization error:", error);

                if (!cancelled) {
                    setStatusCheckError(
                        "Unable to restore registration information."
                    );
                }
            } finally {
                if (!cancelled) {
                    setIsInitializing(false);
                }
            }
        };

        void initialize();

        return () => {
            cancelled = true;
        };
    }, [fetchProviderStatus]);

    /*
     * Simpan informasi provider secara lokal setelah
     * proses inisialisasi selesai.
     *
     * Jangan overwrite draft sebelum data lama dipulihkan.
     */
    useEffect(() => {
        if (isInitializing || registration) return;

        localStorage.setItem(DRAFT_KEY, JSON.stringify(providerData));
    }, [providerData, registration, isInitializing]);

    useEffect(() => {
        if (
            isInitializing ||
            registration ||
            (step !== "INFORMATION" && step !== "DOCUMENTS")
        ) {
            return;
        }

        localStorage.setItem(DRAFT_STEP_KEY, step);
    }, [step, registration, isInitializing]);

    const handleCreated = (data: RegistrationData) => {
        const expirySeconds = data.expires_in_seconds;

        const normalized: RegistrationData = {
            ...data,
            status_provider: "PENDING_OTP",
            otp_expires_at:
                typeof expirySeconds === "number" &&
                    Number.isFinite(expirySeconds) &&
                    expirySeconds > 0
                    ? Date.now() + expirySeconds * 1000
                    : undefined,
        };

        saveRegistration(normalized);

        localStorage.removeItem(DRAFT_KEY);
        localStorage.removeItem(DRAFT_STEP_KEY);

        setStatusCheckError(null);
    };

    const handleVerified = () => {
        if (!registration) return;

        const updated: RegistrationData = {
            ...registration,
            status_provider: "PENDING_APPROVAL",
            otp_token: undefined,
            expires_in_seconds: undefined,
            otp_expires_at: undefined,
        };

        saveRegistration(updated);
        setStatusCheckError(null);
    };

    const handleStatusChange = (status: string) => {
        if (!registration || !isProviderStatus(status)) return;

        const updated: RegistrationData = {
            ...registration,
            status_provider: status,
        };

        if (status !== "PENDING_OTP") {
            delete updated.otp_token;
            delete updated.expires_in_seconds;
            delete updated.otp_expires_at;
        }

        saveRegistration(updated);
        setStatusCheckError(null);
    };

    const handleProviderUserCreated = () => {
        /*
         * Hapus progress hanya setelah backend berhasil
         * membuat provider user.
         */
        localStorage.removeItem(REGISTRATION_KEY);
        localStorage.removeItem(DRAFT_KEY);
        localStorage.removeItem(DRAFT_STEP_KEY);
    };

    if (isInitializing) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
                    <p className="mt-4 text-sm text-gray-500">
                        Checking your registration...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-8">
            <div className="mx-auto w-full max-w-5xl">
                <ProviderProgress currentStep={step} />

                {statusCheckError && registration && (
                    <div
                        role="status"
                        className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-amber-800">
                                    Status check unavailable
                                </p>
                                <p className="mt-1 text-xs leading-5 text-amber-700">
                                    {statusCheckError}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => void fetchProviderStatus(registration)}
                                disabled={isCheckingStatus}
                                className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                            >
                                {isCheckingStatus ? "Checking..." : "Retry"}
                            </button>
                        </div>
                    </div>
                )}

                {step === "INFORMATION" && (
                    <ProviderInformation
                        data={providerData}
                        setData={setProviderData}
                        onNext={() => setStep("DOCUMENTS")}
                    />
                )}

                {step === "DOCUMENTS" && (
                    <ProviderDocuments
                        providerData={providerData}
                        documents={documents}
                        setDocuments={setDocuments}
                        onBack={() => setStep("INFORMATION")}
                        onCreated={handleCreated}
                    />
                )}

                {step === "PENDING_OTP" && registration && (
                    <ProviderOTP
                        registration={registration}
                        onRegistrationChange={saveRegistration}
                        onVerified={handleVerified}
                    />
                )}

                {step === "PENDING_APPROVAL" && registration && (
                    <PendingApproval
                        registration={registration}
                        onStatusChange={handleStatusChange}
                    />
                )}

                {step === "APPROVED" && registration && (
                    <CreateProviderUser
                        providerId={registration.id_provider}
                        providerEmail={registration.email_provider}
                        onSuccess={handleProviderUserCreated}
                    />
                )}

                {step === "REJECTED" && registration && (
                    <RejectedProvider
                        registration={registration}
                        onRestart={clearRegistration}
                    />
                )}
            </div>
        </div>
    );
};

export default SignUp;
