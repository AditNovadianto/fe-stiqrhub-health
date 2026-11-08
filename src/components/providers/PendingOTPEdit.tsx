
import {
    useCallback,
    useEffect,
    useState,
    type ChangeEvent,
    type FormEvent,
} from "react";
import {
    ArrowLeft,
    FileText,
    Loader2,
    Save,
    ShieldCheck,
} from "lucide-react";
import type {
    ProviderFormData,
    RegistrationData,
} from "../../pages/providers/SignUp";
import Toast, { type ToastData } from "../Toast";

type DocumentKey =
    | "logo_provider"
    | "akta_pendirian_perusahaan"
    | "nomor_induk_berusaha"
    | "npwp"
    | "sertifikat_standard"
    | "persetujuan_lingkungan"
    | "surat_izin_apotek";

type ProviderRecord = Partial<ProviderFormData> &
    Partial<Record<DocumentKey, string | null>> & {
        email_provider?: string;
        status_provider?: string;
    };

type ProviderResponse = {
    success?: boolean;
    message?: string;
    data?: ProviderRecord | { provider?: ProviderRecord };
    provider?: ProviderRecord;
};

interface Props {
    registration: RegistrationData;
    onBack: () => void;
}

const API_URI = (
    import.meta.env.VITE_API_URI || ""
).replace(/\/$/, "");

const fields: {
    key: keyof ProviderFormData;
    label: string;
}[] = [
        { key: "name_provider", label: "Provider Name" },
        { key: "phone_number_provider", label: "Phone Number" },
        { key: "address_provider", label: "Address" },
        { key: "province_provider", label: "Province" },
        { key: "city_provider", label: "City" },
        { key: "district_provider", label: "District" },
        { key: "postal_code_provider", label: "Postal Code" },
        { key: "description_provider", label: "Description" },
        {
            key: "id_provider_category",
            label: "Provider Category ID",
        },
    ];

const documentFields: {
    key: DocumentKey;
    label: string;
    accept: string;
}[] = [
        {
            key: "logo_provider",
            label: "Provider Logo",
            accept: "image/png,image/jpeg,image/webp",
        },
        {
            key: "akta_pendirian_perusahaan",
            label: "Akta Pendirian Perusahaan",
            accept: ".pdf",
        },
        {
            key: "nomor_induk_berusaha",
            label: "Nomor Induk Berusaha",
            accept: ".pdf",
        },
        {
            key: "npwp",
            label: "NPWP",
            accept: ".pdf",
        },
        {
            key: "sertifikat_standard",
            label: "Sertifikat Standard",
            accept: ".pdf",
        },
        {
            key: "persetujuan_lingkungan",
            label: "Persetujuan Lingkungan",
            accept: ".pdf",
        },
        {
            key: "surat_izin_apotek",
            label: "Surat Izin Apotek",
            accept: ".pdf",
        },
    ];

const emptyForm: ProviderFormData = {
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

const unwrapProvider = (
    data: ProviderResponse
): ProviderRecord | undefined => {
    if (data.provider) return data.provider;

    if (
        data.data &&
        "provider" in data.data &&
        data.data.provider
    ) {
        return data.data.provider;
    }

    return data.data as ProviderRecord | undefined;
};

const PendingOTPEdit = ({
    registration,
    onBack,
}: Props) => {
    const [form, setForm] = useState<ProviderFormData>({
        ...emptyForm,
        email_provider: registration.email_provider,
    });

    const [existingDocs, setExistingDocs] = useState<
        Partial<Record<DocumentKey, string>>
    >({});

    const [files, setFiles] = useState<
        Partial<Record<DocumentKey, File>>
    >({});

    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [toast, setToast] = useState<ToastData>({
        show: false,
        type: "error",
        message: "",
    });

    const closeToast = useCallback(() => {
        setToast((prev) => ({
            ...prev,
            show: false,
        }));
    }, []);

    const notify = (
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

    const load = useCallback(
        async (signal?: AbortSignal) => {
            if (!API_URI) {
                throw new Error(
                    "VITE_API_URI is not configured."
                );
            }

            const response = await fetch(
                `${API_URI}/provider/${registration.id_provider}`,
                {
                    headers: {
                        Accept: "application/json",
                    },
                    signal,
                }
            );

            const result: ProviderResponse = await response
                .json()
                .catch(() => ({}));

            if (!response.ok || result.success === false) {
                throw new Error(
                    result.message || "Failed to load provider."
                );
            }

            const record = unwrapProvider(result);

            if (
                !record ||
                record.status_provider !== "PENDING_OTP" ||
                record.email_provider?.trim().toLowerCase() !==
                registration.email_provider.trim().toLowerCase()
            ) {
                throw new Error(
                    "Provider is no longer pending OTP, or the registration does not match."
                );
            }

            const updated: ProviderFormData = {
                ...emptyForm,
                email_provider: registration.email_provider,
            };

            for (const { key } of fields) {
                updated[key] =
                    record[key] == null
                        ? ""
                        : String(record[key]);
            }

            const previous: Partial<
                Record<DocumentKey, string>
            > = {};

            for (const { key } of documentFields) {
                if (
                    typeof record[key] === "string" &&
                    record[key]
                ) {
                    previous[key] = record[key];
                }
            }

            if (!signal?.aborted) {
                setForm(updated);
                setExistingDocs(previous);
                setFiles({});
            }
        },
        [
            registration.id_provider,
            registration.email_provider,
        ]
    );

    useEffect(() => {
        const controller = new AbortController();

        setLoading(true);

        load(controller.signal)
            .catch((e) => {
                if (!controller.signal.aborted) {
                    setError(
                        e instanceof Error
                            ? e.message
                            : "Failed to load provider."
                    );
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });

        return () => controller.abort();
    }, [load]);

    const handleFile = (
        event: ChangeEvent<HTMLInputElement>,
        key: DocumentKey
    ) => {
        const file = event.target.files?.[0];

        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            return notify(
                "error",
                "Maximum file size: 10 MB."
            );
        }

        if (
            key === "logo_provider"
                ? ![
                    "image/png",
                    "image/jpeg",
                    "image/webp",
                ].includes(file.type)
                : file.type !== "application/pdf"
        ) {
            return notify(
                "error",
                "Invalid document format."
            );
        }

        setFiles((prev) => ({
            ...prev,
            [key]: file,
        }));
    };

    const save = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (saving) return;

        if (!registration.otp_token) {
            return notify(
                "error",
                "OTP token is unavailable. Go back and request a new OTP."
            );
        }

        if (!/^\d{6}$/.test(otp)) {
            return notify(
                "error",
                "Enter the 6-digit OTP received by email."
            );
        }

        if (
            registration.otp_expires_at &&
            Date.now() >= registration.otp_expires_at
        ) {
            return notify(
                "error",
                "OTP has expired. Go back and request a new OTP."
            );
        }

        const body = new FormData();

        for (const { key } of fields) {
            body.append(key, form[key]);
        }

        for (const { key } of documentFields) {
            if (files[key]) {
                body.append(key, files[key]!);
            }
        }

        setSaving(true);

        try {
            const response = await fetch(
                `${API_URI}/provider/${registration.id_provider}`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${registration.otp_token}`,
                        "x-provider-otp": otp,
                    },
                    body,
                }
            );

            const result: ProviderResponse = await response
                .json()
                .catch(() => ({}));

            if (
                !response.ok ||
                result.success === false
            ) {
                throw new Error(
                    result.message ||
                    "Unable to save changes."
                );
            }

            // Status tetap PENDING_OTP setelah UPDATE.
            onBack();
        } catch (e) {
            notify(
                "error",
                e instanceof Error
                    ? e.message
                    : "Unable to update provider.",
                "Update Failed"
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Toast
                toast={toast}
                onClose={closeToast}
            />

            <div className="mx-auto w-full max-w-3xl rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                <div className="mb-6 flex items-center gap-3">
                    <ShieldCheck
                        className="text-blue-600"
                        size={24}
                    />

                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">
                            Edit Registration
                        </h1>

                        <p className="text-sm text-gray-500">
                            Status: PENDING_OTP · Provider #
                            {registration.id_provider}
                        </p>
                    </div>
                </div>

                {loading ? (
                    <p className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2
                            className="animate-spin"
                            size={18}
                        />
                        Loading registration...
                    </p>
                ) : error ? (
                    <div className="space-y-3">
                        <p className="text-sm text-red-600">
                            {error}
                        </p>

                        <button
                            type="button"
                            onClick={onBack}
                            className="text-blue-600 underline"
                        >
                            Back to verification
                        </button>
                    </div>
                ) : (
                    <form
                        onSubmit={(e) => void save(e)}
                        className="space-y-6"
                    >
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="text-sm font-medium text-gray-700 sm:col-span-2">
                                Registered Email

                                <input
                                    disabled
                                    value={
                                        registration.email_provider
                                    }
                                    className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-100 p-3 text-sm"
                                />
                            </label>

                            {fields.map(({ key, label }) => (
                                <label
                                    key={key}
                                    className={`text-sm font-medium text-gray-700 ${key === "address_provider" ||
                                            key === "description_provider"
                                            ? "sm:col-span-2"
                                            : ""
                                        }`}
                                >
                                    {label}

                                    {key === "address_provider" ||
                                        key === "description_provider" ? (
                                        <textarea
                                            className="mt-1 min-h-20 w-full rounded-lg border border-gray-300 p-3 text-sm"
                                            value={form[key]}
                                            onChange={(e) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    [key]: e.target.value,
                                                }))
                                            }
                                        />
                                    ) : (
                                        <input
                                            className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-sm"
                                            value={form[key]}
                                            onChange={(e) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    [key]: e.target.value,
                                                }))
                                            }
                                        />
                                    )}
                                </label>
                            ))}
                        </div>

                        <div>
                            <h2 className="mb-2 font-semibold text-gray-900">
                                Documents
                            </h2>

                            <p className="mb-3 text-xs text-gray-500">
                                Documents that are not replaced
                                stay unchanged.
                            </p>

                            <div className="grid gap-3 sm:grid-cols-2">
                                {documentFields.map(
                                    ({ key, label, accept }) => (
                                        <div
                                            key={key}
                                            className="rounded-xl border border-gray-200 p-4"
                                        >
                                            <p className="flex items-center gap-2 text-sm font-medium">
                                                <FileText size={16} />
                                                {label}
                                            </p>

                                            {existingDocs[key] &&
                                                /^https:\/\//i.test(
                                                    existingDocs[key]!
                                                ) && (
                                                    <a
                                                        href={existingDocs[key]}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="mt-2 block text-xs text-blue-600 underline"
                                                    >
                                                        View existing document
                                                    </a>
                                                )}

                                            <input
                                                className="mt-3 block w-full text-xs"
                                                type="file"
                                                accept={accept}
                                                onChange={(e) =>
                                                    handleFile(e, key)
                                                }
                                            />

                                            {files[key] && (
                                                <p className="mt-2 break-all text-xs text-green-700">
                                                    New: {files[key]!.name}
                                                </p>
                                            )}
                                        </div>
                                    )
                                )}
                            </div>
                        </div>

                        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                            <label
                                htmlFor="pending-update-otp"
                                className="block text-sm font-semibold text-blue-900"
                            >
                                Email OTP required to save changes
                            </label>

                            <p className="mb-2 mt-1 text-xs text-blue-700">
                                Use the 6-digit OTP issued
                                with your current registration token.
                            </p>

                            <input
                                id="pending-update-otp"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                value={otp}
                                onChange={(e) =>
                                    setOtp(
                                        e.target.value
                                            .replace(/\D/g, "")
                                            .slice(0, 6)
                                    )
                                }
                                placeholder="000000"
                                className="w-full rounded-lg border border-blue-200 bg-white p-3 text-center text-lg tracking-[0.3em]"
                            />
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <button
                                type="button"
                                onClick={onBack}
                                disabled={saving}
                                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold"
                            >
                                <ArrowLeft size={16} />
                                Back to OTP
                            </button>

                            <button
                                type="submit"
                                disabled={
                                    saving ||
                                    !registration.otp_token ||
                                    otp.length !== 6
                                }
                                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {saving ? (
                                    <Loader2
                                        className="animate-spin"
                                        size={16}
                                    />
                                ) : (
                                    <Save size={16} />
                                )}

                                {saving
                                    ? "Saving..."
                                    : "Save Changes"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </>
    );
};

export default PendingOTPEdit;
