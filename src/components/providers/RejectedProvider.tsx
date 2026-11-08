
import {
    useCallback,
    useEffect,
    useState,
    type ChangeEvent,
    type FormEvent,
} from "react";

import {
    CircleX,
    MailCheck,
    FileText,
    Loader2,
    RefreshCw,
    ShieldCheck,
} from "lucide-react";

import type {
    ProviderFormData,
    RegistrationData,
} from "../../pages/providers/SignUp";

import Toast, {
    type ToastData,
} from "../Toast";

interface Props {
    registration: RegistrationData;
    onStatusChange: (status: string) => void;
}

type RevisionStage =
    | "request"
    | "verify"
    | "edit";

type DocumentKey =
    | "logo_provider"
    | "akta_pendirian_perusahaan"
    | "nomor_induk_berusaha"
    | "npwp"
    | "sertifikat_standard"
    | "persetujuan_lingkungan"
    | "surat_izin_apotek";

type ProviderRecord =
    Partial<ProviderFormData> &
    Partial<
        Record<DocumentKey, string | null>
    > & {
        id_provider?: number;
        status_provider?: string;
        email_provider?: string;
    };

interface ApiResponse {
    success?: boolean;
    message?: string;
    provider?: ProviderRecord;
    data?: ProviderRecord & {
        otp_token?: string;
        revision_token?: string;
        expires_in_seconds?: number;
        status_provider?: string;
        missing_fields?: string[];
    };
}

const API_URI = (
    import.meta.env.VITE_API_URI || ""
).replace(/\/$/, "");

const fieldDefs: {
    key: keyof ProviderFormData;
    label: string;
}[] = [
        {
            key: "name_provider",
            label: "Provider Name",
        },
        {
            key: "phone_number_provider",
            label: "Phone Number",
        },
        {
            key: "address_provider",
            label: "Address",
        },
        {
            key: "province_provider",
            label: "Province",
        },
        {
            key: "city_provider",
            label: "City",
        },
        {
            key: "district_provider",
            label: "District",
        },
        {
            key: "postal_code_provider",
            label: "Postal Code",
        },
        {
            key: "id_provider_category",
            label: "Provider Category ID",
        },
        {
            key: "description_provider",
            label: "Description",
        },
    ];

const documentDefs: {
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

const readApi = async (
    response: Response
): Promise<ApiResponse> => {
    const result: ApiResponse = await response
        .json()
        .catch(() => ({}));

    if (
        !response.ok ||
        result.success === false
    ) {
        const missing =
            result.data?.missing_fields?.join(", ");

        throw new Error(
            `${result.message ||
            `Request failed (${response.status})`
            }${missing
                ? `: ${missing}`
                : ""
            }`
        );
    }

    return result;
};

const RejectedProvider = ({
    registration,
    onStatusChange,
}: Props) => {
    const [stage, setStage] =
        useState<RevisionStage>("request");

    const [busy, setBusy] = useState(false);

    const [
        hasUnsavedChanges,
        setHasUnsavedChanges,
    ] = useState(false);

    const [otp, setOtp] = useState("");
    const [otpToken, setOtpToken] = useState("");

    const [
        otpExpiresAt,
        setOtpExpiresAt,
    ] = useState<number | null>(null);

    const [
        revisionToken,
        setRevisionToken,
    ] = useState("");

    const [
        revisionExpiresAt,
        setRevisionExpiresAt,
    ] = useState<number | null>(null);

    const [now, setNow] = useState(Date.now());

    const [form, setForm] =
        useState<ProviderFormData>({
            ...emptyForm,
            email_provider:
                registration.email_provider,
        });

    const [
        storedFiles,
        setStoredFiles,
    ] = useState<
        Partial<Record<DocumentKey, string>>
    >({});

    const [
        newFiles,
        setNewFiles,
    ] = useState<
        Partial<Record<DocumentKey, File>>
    >({});

    const [toast, setToast] =
        useState<ToastData>({
            show: false,
            type: "error",
            message: "",
        });

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

    const closeToast = useCallback(() => {
        setToast((prev) => ({
            ...prev,
            show: false,
        }));
    }, []);

    useEffect(() => {
        const timer = window.setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => {
            window.clearInterval(timer);
        };
    }, []);

    const loadProvider = useCallback(
        async () => {
            if (!API_URI) {
                throw new Error(
                    "VITE_API_URI is not configured."
                );
            }

            const result = await readApi(
                await fetch(
                    `${API_URI}/provider/${registration.id_provider}`,
                    {
                        headers: {
                            Accept: "application/json",
                        },
                    }
                )
            );

            const record =
                result.provider ??
                result.data;

            if (
                !record ||
                record.status_provider !== "REJECTED" ||
                record.email_provider !==
                registration.email_provider
            ) {
                throw new Error(
                    "Provider registration data is unavailable or status has changed."
                );
            }

            const updated: ProviderFormData = {
                ...emptyForm,
                email_provider:
                    registration.email_provider,
            };

            for (const { key } of fieldDefs) {
                const raw = record[key];

                updated[key] =
                    raw == null
                        ? ""
                        : String(raw);
            }

            setForm(updated);

            const existing: Partial<
                Record<DocumentKey, string>
            > = {};

            for (const { key } of documentDefs) {
                const url = record[key];

                if (
                    typeof url === "string" &&
                    url
                ) {
                    existing[key] = url;
                }
            }

            setStoredFiles(existing);
            setNewFiles({});
            setHasUnsavedChanges(false);
        },
        [
            registration.email_provider,
            registration.id_provider,
        ]
    );

    const requestOTP = async () => {
        if (busy) return;

        setBusy(true);

        try {
            if (!API_URI) {
                throw new Error(
                    "VITE_API_URI is not configured."
                );
            }

            const result = await readApi(
                await fetch(
                    `${API_URI}/provider/${registration.id_provider}/request-revision-otp`,
                    {
                        method: "POST",
                        headers: {
                            Accept: "application/json",
                        },
                    }
                )
            );

            if (!result.data?.otp_token) {
                throw new Error(
                    "Verification token was not returned."
                );
            }

            setOtpToken(
                result.data.otp_token
            );

            setOtpExpiresAt(
                Date.now() +
                (
                    result.data
                        .expires_in_seconds ?? 300
                ) * 1000
            );

            setOtp("");
            setStage("verify");

            notify(
                "success",
                result.message ||
                "OTP sent to your registered email.",
                "OTP Sent"
            );
        } catch (e) {
            notify(
                "error",
                e instanceof Error
                    ? e.message
                    : "Unable to request OTP.",
                "Request Failed"
            );
        } finally {
            setBusy(false);
        }
    };

    const verifyOTP = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (busy) return;

        if (!/^\d{6}$/.test(otp)) {
            return notify(
                "error",
                "Enter your 6-digit verification code."
            );
        }

        if (
            !otpToken ||
            (
                otpExpiresAt !== null &&
                Date.now() >= otpExpiresAt
            )
        ) {
            return notify(
                "error",
                "OTP expired. Request a new one."
            );
        }

        setBusy(true);

        try {
            const result = await readApi(
                await fetch(
                    `${API_URI}/provider/${registration.id_provider}/verify-revision-otp`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json",
                            Accept: "application/json",
                        },
                        body: JSON.stringify({
                            email_provider:
                                registration.email_provider,
                            otp,
                            otp_token: otpToken,
                        }),
                    }
                )
            );

            if (
                !result.data?.revision_token
            ) {
                throw new Error(
                    "Revision token was not returned."
                );
            }

            await loadProvider();

            setRevisionToken(
                result.data.revision_token
            );

            setRevisionExpiresAt(
                Date.now() +
                (
                    result.data
                        .expires_in_seconds ?? 900
                ) * 1000
            );

            setOtpToken("");
            setOtp("");
            setStage("edit");

            notify(
                "success",
                "Email verified. You can now revise your registration."
            );
        } catch (e) {
            notify(
                "error",
                e instanceof Error
                    ? e.message
                    : "Could not verify OTP.",
                "Verification Failed"
            );
        } finally {
            setBusy(false);
        }
    };

    const handleFile = (
        event: ChangeEvent<HTMLInputElement>,
        key: DocumentKey
    ) => {
        const file = event.target.files?.[0];

        if (!file) return;

        if (
            file.size >
            10 * 1024 * 1024
        ) {
            return notify(
                "error",
                "Maximum file size is 10 MB."
            );
        }

        if (
            key === "logo_provider"
                ? ![
                    "image/jpeg",
                    "image/png",
                    "image/webp",
                ].includes(file.type)
                : file.type !==
                "application/pdf"
        ) {
            return notify(
                "error",
                "Invalid file format."
            );
        }

        setNewFiles((old) => ({
            ...old,
            [key]: file,
        }));

        setHasUnsavedChanges(true);
    };

    const ensureRevisionSession = () => {
        if (
            !revisionToken ||
            (
                revisionExpiresAt !== null &&
                Date.now() >=
                revisionExpiresAt
            )
        ) {
            setRevisionToken("");
            setStage("request");

            notify(
                "error",
                "Revision session expired. Verify your email again."
            );

            return false;
        }

        return true;
    };

    const saveChanges = async () => {
        if (
            busy ||
            !ensureRevisionSession()
        ) {
            return;
        }

        const body = new FormData();

        for (const { key } of fieldDefs) {
            body.append(
                key,
                form[key]
            );
        }

        for (
            const { key } of documentDefs
        ) {
            if (newFiles[key]) {
                body.append(
                    key,
                    newFiles[key]!
                );
            }
        }

        setBusy(true);

        try {
            const result = await readApi(
                await fetch(
                    `${API_URI}/provider/${registration.id_provider}`,
                    {
                        method: "PATCH",
                        headers: {
                            Authorization:
                                `Bearer ${revisionToken}`,
                        },
                        body,
                    }
                )
            );

            await loadProvider();

            notify(
                "success",
                result.message ||
                "Your changes were saved.",
                "Saved"
            );
        } catch (e) {
            notify(
                "error",
                e instanceof Error
                    ? e.message
                    : "Could not save changes.",
                "Save Failed"
            );
        } finally {
            setBusy(false);
        }
    };

    const resubmit = async () => {
        if (
            busy ||
            !ensureRevisionSession()
        ) {
            return;
        }

        if (hasUnsavedChanges) {
            return notify(
                "error",
                "Save your changes before resubmitting."
            );
        }

        setBusy(true);

        try {
            const result = await readApi(
                await fetch(
                    `${API_URI}/provider/${registration.id_provider}/resubmit`,
                    {
                        method: "PATCH",
                        headers: {
                            Authorization:
                                `Bearer ${revisionToken}`,
                            Accept:
                                "application/json",
                        },
                    }
                )
            );

            if (
                result.data
                    ?.status_provider !==
                "PENDING_APPROVAL"
            ) {
                throw new Error(
                    "Server did not confirm PENDING_APPROVAL status."
                );
            }

            setRevisionToken("");

            onStatusChange(
                "PENDING_APPROVAL"
            );
        } catch (e) {
            notify(
                "error",
                e instanceof Error
                    ? e.message
                    : "Resubmission failed.",
                "Resubmit Failed"
            );
        } finally {
            setBusy(false);
        }
    };

    const otpRemaining =
        otpExpiresAt === null
            ? 0
            : Math.max(
                0,
                Math.ceil(
                    (otpExpiresAt - now) /
                    1000
                )
            );

    const revisionRemaining =
        revisionExpiresAt === null
            ? 0
            : Math.max(
                0,
                Math.ceil(
                    (
                        revisionExpiresAt -
                        now
                    ) / 1000
                )
            );

    return (
        <>
            <Toast
                toast={toast}
                onClose={closeToast}
            />

            <div className="mx-auto w-full max-w-3xl rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-col items-center text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
                        <CircleX size={32} />
                    </div>

                    <h1 className="mt-5 text-2xl font-semibold text-gray-900">
                        Registration Rejected
                    </h1>

                    <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
                        Your provider registration was
                        not approved. Verify your email,
                        revise the submitted information
                        or documents, and resubmit for
                        review.
                    </p>
                </div>

                <div className="mt-6 grid gap-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-700 sm:grid-cols-2">
                    <p>
                        <span className="block text-xs text-gray-400">
                            Provider ID
                        </span>
                        #{registration.id_provider}
                    </p>

                    <p className="break-all">
                        <span className="block text-xs text-gray-400">
                            Registered Email
                        </span>
                        {
                            registration
                                .email_provider
                        }
                    </p>
                </div>

                {stage === "request" && (
                    <div className="mt-7 text-center">
                        <p className="text-sm text-gray-500">
                            We will send a 6-digit
                            verification code to your
                            registered email.
                        </p>

                        <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                                void requestOTP()
                            }
                            className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {busy ? (
                                <Loader2
                                    className="animate-spin"
                                    size={17}
                                />
                            ) : (
                                <MailCheck size={17} />
                            )}

                            Verify Email to Revise
                        </button>
                    </div>
                )}

                {stage === "verify" && (
                    <form
                        onSubmit={(e) =>
                            void verifyOTP(e)
                        }
                        className="mx-auto mt-7 max-w-sm space-y-4 text-center"
                    >
                        <label
                            htmlFor="revision-otp"
                            className="block text-sm font-medium text-gray-700"
                        >
                            Revision OTP
                        </label>

                        <input
                            id="revision-otp"
                            type="text"
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
                            className="w-full rounded-xl border border-gray-300 p-4 text-center text-2xl tracking-[0.3em] focus:outline-blue-500"
                            placeholder="000000"
                        />

                        <p className="text-xs text-gray-500">
                            Expires in{" "}
                            {
                                Math.floor(
                                    otpRemaining / 60
                                )
                            }
                            :
                            {
                                String(
                                    otpRemaining % 60
                                ).padStart(2, "0")
                            }
                        </p>

                        <button
                            disabled={
                                busy ||
                                otp.length !== 6 ||
                                otpRemaining === 0
                            }
                            type="submit"
                            className="w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            {busy
                                ? "Verifying..."
                                : "Verify OTP"}
                        </button>

                        <button
                            disabled={busy}
                            type="button"
                            onClick={() =>
                                void requestOTP()
                            }
                            className="flex w-full items-center justify-center gap-2 text-sm font-medium text-blue-600 disabled:opacity-50"
                        >
                            <RefreshCw size={15} />
                            Request New OTP
                        </button>
                    </form>
                )}

                {stage === "edit" && (
                    <div className="mt-7 space-y-7">
                        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                            <div className="flex items-center gap-2 font-semibold">
                                <ShieldCheck size={17} />
                                Email Verified
                            </div>

                            <p className="mt-1">
                                Revision session:{" "}
                                {
                                    Math.floor(
                                        revisionRemaining / 60
                                    )
                                }
                                :
                                {
                                    String(
                                        revisionRemaining % 60
                                    ).padStart(2, "0")
                                }
                                . Save changes before
                                resubmitting.
                            </p>

                            {revisionRemaining === 0 && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setStage("request")
                                    }
                                    className="mt-2 underline"
                                >
                                    Verify again
                                </button>
                            )}
                        </div>

                        <section>
                            <h2 className="mb-4 text-base font-semibold text-gray-900">
                                Provider Information
                            </h2>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
                                    Registered Email

                                    <input
                                        disabled
                                        value={
                                            registration
                                                .email_provider
                                        }
                                        className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-100 p-3 text-sm text-gray-500"
                                    />
                                </label>

                                {fieldDefs.map(
                                    ({ key, label }) => (
                                        <label
                                            key={key}
                                            className={`block text-sm font-medium text-gray-700 ${key ===
                                                    "address_provider" ||
                                                    key ===
                                                    "description_provider"
                                                    ? "sm:col-span-2"
                                                    : ""
                                                }`}
                                        >
                                            {label}

                                            {key ===
                                                "address_provider" ||
                                                key ===
                                                "description_provider" ? (
                                                <textarea
                                                    value={
                                                        form[key]
                                                    }
                                                    onChange={(e) => {
                                                        setForm(
                                                            (old) => ({
                                                                ...old,
                                                                [key]:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        );

                                                        setHasUnsavedChanges(
                                                            true
                                                        );
                                                    }}
                                                    className="mt-1 min-h-20 w-full rounded-lg border border-gray-300 p-3 text-sm"
                                                />
                                            ) : (
                                                <input
                                                    value={
                                                        form[key]
                                                    }
                                                    onChange={(e) => {
                                                        setForm(
                                                            (old) => ({
                                                                ...old,
                                                                [key]:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        );

                                                        setHasUnsavedChanges(
                                                            true
                                                        );
                                                    }}
                                                    className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-sm"
                                                />
                                            )}
                                        </label>
                                    )
                                )}
                            </div>

                            <p className="mt-2 text-xs text-gray-400">
                                Provider Category ID must
                                be an existing category ID.
                                Email cannot be changed in
                                this revision flow.
                            </p>
                        </section>

                        <section>
                            <h2 className="mb-4 text-base font-semibold text-gray-900">
                                Documents
                            </h2>

                            <p className="mb-3 text-xs text-gray-500">
                                Existing documents remain
                                stored unless you select
                                replacements.
                            </p>

                            <div className="grid gap-3 sm:grid-cols-2">
                                {documentDefs.map(
                                    ({
                                        key,
                                        label,
                                        accept,
                                    }) => (
                                        <div
                                            key={key}
                                            className="rounded-xl border border-gray-200 p-4"
                                        >
                                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                                                <FileText
                                                    size={16}
                                                />
                                                {label}
                                            </div>

                                            {storedFiles[key] &&
                                                /^https:\/\//i.test(
                                                    storedFiles[
                                                    key
                                                    ]!
                                                ) && (
                                                    <a
                                                        href={
                                                            storedFiles[
                                                            key
                                                            ]
                                                        }
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="mt-2 block text-xs text-blue-600 underline"
                                                    >
                                                        View current file
                                                    </a>
                                                )}

                                            <input
                                                type="file"
                                                accept={accept}
                                                onChange={(e) =>
                                                    handleFile(
                                                        e,
                                                        key
                                                    )
                                                }
                                                className="mt-3 block w-full text-xs text-gray-600"
                                            />

                                            {newFiles[key] && (
                                                <p className="mt-2 break-all text-xs text-green-700">
                                                    New:{" "}
                                                    {
                                                        newFiles[
                                                            key
                                                        ]!.name
                                                    }
                                                </p>
                                            )}
                                        </div>
                                    )
                                )}
                            </div>
                        </section>

                        <div className="flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row">
                            <button
                                disabled={
                                    busy ||
                                    revisionRemaining === 0
                                }
                                onClick={() =>
                                    void saveChanges()
                                }
                                type="button"
                                className="flex-1 rounded-lg border border-blue-600 px-5 py-3 text-sm font-semibold text-blue-600 disabled:opacity-50"
                            >
                                {busy
                                    ? "Processing..."
                                    : "Save Changes"}
                            </button>

                            <button
                                disabled={
                                    busy ||
                                    revisionRemaining === 0 ||
                                    hasUnsavedChanges
                                }
                                onClick={() =>
                                    void resubmit()
                                }
                                type="button"
                                className="flex-1 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {busy
                                    ? "Processing..."
                                    : "Resubmit for Approval"}
                            </button>
                        </div>

                        <p className="text-xs text-amber-700">
                            Click Save Changes first,
                            then Resubmit for Approval.
                            Resubmit does not automatically
                            save unsaved changes.
                        </p>
                    </div>
                )}
            </div>
        </>
    );
};

export default RejectedProvider;
