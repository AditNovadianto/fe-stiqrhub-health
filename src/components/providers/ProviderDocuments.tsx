import {
    useCallback,
    useState,
    type Dispatch,
    type SetStateAction,
} from "react";

import {
    FileText,
    Image,
    Upload,
} from "lucide-react";

import type {
    ProviderDocumentsData,
    ProviderFormData,
    RegistrationData,
} from "../../pages/providers/SignUp";

import Toast, {
    type ToastData,
} from "../Toast";

interface Props {
    providerData: ProviderFormData;
    documents: ProviderDocumentsData;

    setDocuments: Dispatch<
        SetStateAction<ProviderDocumentsData>
    >;

    onBack: () => void;

    onCreated: (
        data: RegistrationData
    ) => void;
}

const API_URI =
    import.meta.env.VITE_API_URI;

const ProviderDocuments = ({
    providerData,
    documents,
    setDocuments,
    onBack,
    onCreated,
}: Props) => {
    const [loading, setLoading] =
        useState(false);

    const [toast, setToast] =
        useState<ToastData>({
            show: false,
            type: "error",
            message: "",
        });

    const closeToast =
        useCallback(() => {
            setToast((prev) => ({
                ...prev,
                show: false,
            }));
        }, []);

    const showError = (
        message: string
    ) => {
        setToast({
            show: true,
            type: "error",
            message,
        });
    };

    const handleFile = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const { name, files } =
            e.target;

        if (!files?.[0]) return;

        const file = files[0];

        const maxSize =
            10 * 1024 * 1024;

        if (file.size > maxSize) {
            showError(
                `${file.name} exceeds the 10 MB file size limit.`
            );

            e.target.value = "";

            return;
        }

        setDocuments((prev) => ({
            ...prev,
            [name]: file,
        }));
    };

    const handleSubmit = async (
        e: React.FormEvent
    ) => {
        e.preventDefault();

        const requiredDocuments = [
            {
                file:
                    documents.logo_provider,
                label:
                    "Provider Logo",
            },
            {
                file:
                    documents.akta_pendirian_perusahaan,
                label:
                    "Akta Pendirian Perusahaan",
            },
            {
                file:
                    documents.nomor_induk_berusaha,
                label:
                    "Nomor Induk Berusaha",
            },
            {
                file: documents.npwp,
                label: "NPWP",
            },
            {
                file:
                    documents.sertifikat_standard,
                label:
                    "Sertifikat Standard",
            },
            {
                file:
                    documents.persetujuan_lingkungan,
                label:
                    "Persetujuan Lingkungan",
            },
            {
                file:
                    documents.surat_izin_apotek,
                label:
                    "Surat Izin Apotek",
            },
        ];

        const missing =
            requiredDocuments.filter(
                (document) =>
                    !document.file
            );

        if (missing.length > 0) {
            showError(
                `Please upload: ${missing
                    .map(
                        (document) =>
                            document.label
                    )
                    .join(", ")}.`
            );

            return;
        }

        try {
            setLoading(true);

            const body =
                new FormData();

            Object.entries(
                providerData
            ).forEach(
                ([key, value]) => {
                    body.append(
                        key,
                        value
                    );
                }
            );

            body.append(
                "logo_provider",
                documents.logo_provider!
            );

            body.append(
                "akta_pendirian_perusahaan",
                documents.akta_pendirian_perusahaan!
            );

            body.append(
                "nomor_induk_berusaha",
                documents.nomor_induk_berusaha!
            );

            body.append(
                "npwp",
                documents.npwp!
            );

            body.append(
                "sertifikat_standard",
                documents.sertifikat_standard!
            );

            body.append(
                "persetujuan_lingkungan",
                documents.persetujuan_lingkungan!
            );

            body.append(
                "surat_izin_apotek",
                documents.surat_izin_apotek!
            );

            const response =
                await fetch(
                    `${API_URI}/provider/create`,
                    {
                        method: "POST",
                        body,
                    }
                );

            const result =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message ||
                    "Failed to register provider."
                );
            }

            onCreated({
                id_provider:
                    result.data
                        .id_provider,

                email_provider:
                    result.data
                        .email_provider,

                status_provider:
                    result.data
                        .status_provider,

                otp_token:
                    result.data
                        .otp_token,

                expires_in_seconds:
                    result.data
                        .expires_in_seconds,
            });
        } catch (error) {
            showError(
                error instanceof Error
                    ? error.message
                    : "Something went wrong while submitting your registration."
            );
        } finally {
            setLoading(false);
        }
    };

    const fields = [
        {
            name: "logo_provider",
            label: "Provider Logo",
            accept:
                "image/png,image/jpeg,image/webp",
            icon: Image,
        },
        {
            name:
                "akta_pendirian_perusahaan",
            label:
                "Akta Pendirian Perusahaan",
            accept: ".pdf",
            icon: FileText,
        },
        {
            name:
                "nomor_induk_berusaha",
            label:
                "Nomor Induk Berusaha (NIB)",
            accept: ".pdf",
            icon: FileText,
        },
        {
            name: "npwp",
            label: "NPWP",
            accept: ".pdf",
            icon: FileText,
        },
        {
            name:
                "sertifikat_standard",
            label:
                "Sertifikat Standard",
            accept: ".pdf",
            icon: FileText,
        },
        {
            name:
                "persetujuan_lingkungan",
            label:
                "Persetujuan Lingkungan",
            accept: ".pdf",
            icon: FileText,
        },
        {
            name:
                "surat_izin_apotek",
            label:
                "Surat Izin Apotek",
            accept: ".pdf",
            icon: FileText,
        },
    ];

    return (
        <>
            <Toast
                toast={toast}
                onClose={closeToast}
            />

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Provider
                        Documents
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-gray-500">
                        Upload the
                        documents required
                        to verify your
                        provider.
                    </p>
                </div>

                <form
                    onSubmit={
                        handleSubmit
                    }
                    className="mt-8 space-y-4"
                >
                    {fields.map(
                        (field) => {
                            const Icon =
                                field.icon;

                            const file =
                                documents[
                                field.name as keyof ProviderDocumentsData
                                ];

                            return (
                                <label
                                    key={
                                        field.name
                                    }
                                    className="block cursor-pointer rounded-xl border border-dashed border-gray-300 p-4 transition hover:border-blue-400 hover:bg-blue-50/30"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                                            <Icon
                                                size={
                                                    20
                                                }
                                            />
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-gray-800">
                                                {
                                                    field.label
                                                }
                                            </p>

                                            <p className="mt-1 truncate text-xs text-gray-400">
                                                {file
                                                    ? file.name
                                                    : "Click to upload"}
                                            </p>
                                        </div>

                                        <Upload
                                            size={
                                                18
                                            }
                                            className="text-gray-400"
                                        />
                                    </div>

                                    <input
                                        type="file"
                                        name={
                                            field.name
                                        }
                                        accept={
                                            field.accept
                                        }
                                        onChange={
                                            handleFile
                                        }
                                        disabled={
                                            loading
                                        }
                                        className="hidden"
                                    />
                                </label>
                            );
                        }
                    )}

                    <p className="text-xs text-gray-400">
                        Maximum file size:
                        10 MB per document.
                    </p>

                    <div className="flex gap-3 pt-5">
                        <button
                            type="button"
                            onClick={
                                onBack
                            }
                            disabled={
                                loading
                            }
                            className="w-full cursor-pointer rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Back
                        </button>

                        <button
                            type="submit"
                            disabled={
                                loading
                            }
                            className="flex w-full cursor-pointer items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                        >
                            {loading ? (
                                <>
                                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Submitting...
                                </>
                            ) : (
                                "Submit Registration"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};

export default ProviderDocuments;