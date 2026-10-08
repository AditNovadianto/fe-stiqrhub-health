
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type FormEvent,
} from "react";

import {
    CheckCircle2,
    Eye,
    EyeOff,
    LockKeyhole,
    Mail,
    Phone,
    UserRound,
    ShieldCheck,
    Loader2,
    RefreshCw,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import Toast, { type ToastData } from "../Toast";

// ============================================================
// INTERFACES
// ============================================================

interface CreateProviderUserProps {
    providerId: number;
    providerEmail?: string;
    onSuccess?: () => void;
}

interface ProviderUserForm {
    name_provider_user: string;
    email_provider_user: string;
    phone_number_provider_user: string;
    password_provider_user: string;
    confirm_password: string;
    id_provider_role: string;
}

interface ProviderRole {
    id_provider_role: number;
    name_provider_role: string;
}

interface ProviderRoleResponse {
    success: boolean;
    data: ProviderRole[];
    message?: string;
}

interface ProviderUserResponse {
    success?: boolean;
    message?: string;
    provider_user?: {
        id_provider_user: number;
        name_provider_user: string;
        email_provider_user: string;
        status_provider_user: string;
        id_provider: number;
        id_provider_role: number;
    };
    token?: string;
    errors?: Record<string, string | string[]>;
}

const API_URI = (import.meta.env.VITE_API_URI || "").replace(/\/$/, "");

// ============================================================
// COMPONENT
// ============================================================

const CreateProviderUser = ({
    providerId,
    providerEmail = "",
    onSuccess,
}: CreateProviderUserProps) => {
    const navigate = useNavigate();

    const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(
        null
    );

    // ========================================================
    // FORM STATES
    // ========================================================

    const [formData, setFormData] = useState<ProviderUserForm>({
        name_provider_user: "",
        email_provider_user: providerEmail,
        phone_number_provider_user: "",
        password_provider_user: "",
        confirm_password: "",
        id_provider_role: "",
    });

    const [loading, setLoading] = useState(false);
    const [created, setCreated] = useState(false);

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // ========================================================
    // PROVIDER ROLE STATES
    // ========================================================

    const [roles, setRoles] = useState<ProviderRole[]>([]);
    const [loadingRoles, setLoadingRoles] = useState(true);
    const [roleError, setRoleError] = useState<string | null>(null);

    // ========================================================
    // TOAST
    // ========================================================

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

    // ========================================================
    // FETCH PROVIDER ROLES
    // ========================================================

    const fetchProviderRoles = useCallback(
        async (signal?: AbortSignal) => {
            try {
                setLoadingRoles(true);
                setRoleError(null);

                if (!API_URI) {
                    throw new Error("VITE_API_URI is not configured.");
                }

                const response = await fetch(
                    `${API_URI}/provider-role/get-all`,
                    {
                        method: "GET",
                        headers: {
                            Accept: "application/json",
                        },
                        signal,
                    }
                );

                const result: ProviderRoleResponse = await response
                    .json()
                    .catch(() => ({
                        success: false,
                        data: [],
                    }));

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message || "Failed to load provider roles."
                    );
                }

                if (!Array.isArray(result.data)) {
                    throw new Error("Invalid provider role response.");
                }

                /*
                 * Tahap onboarding ini hanya untuk membuat
                 * administrator pertama.
                 *
                 * Jangan menawarkan role non-admin di
                 * proses registrasi publik.
                 */
                const adminRoles = result.data.filter(
                    (role) =>
                        role.name_provider_role?.toUpperCase() === "ADMIN" &&
                        Number.isInteger(role.id_provider_role) &&
                        role.id_provider_role > 0
                );

                if (!signal?.aborted) {
                    setRoles(adminRoles);

                    setFormData((prev) => ({
                        ...prev,
                        id_provider_role:
                            adminRoles.length === 1
                                ? String(adminRoles[0].id_provider_role)
                                : "",
                    }));
                }
            } catch (error) {
                if (signal?.aborted) return;

                setRoles([]);
                setRoleError(
                    error instanceof Error
                        ? error.message
                        : "Unable to load provider roles."
                );
            } finally {
                if (!signal?.aborted) {
                    setLoadingRoles(false);
                }
            }
        },
        []
    );

    useEffect(() => {
        const controller = new AbortController();

        void fetchProviderRoles(controller.signal);

        return () => controller.abort();
    }, [fetchProviderRoles]);

    useEffect(() => {
        return () => {
            if (redirectTimer.current) {
                clearTimeout(redirectTimer.current);
            }
        };
    }, []);

    // ========================================================
    // HANDLE FORM CHANGE
    // ========================================================

    const handleChange = (
        e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;

        const newValue =
            name === "phone_number_provider_user"
                ? value.replace(/\D/g, "")
                : value;

        setFormData((prev) => ({
            ...prev,
            [name]: newValue,
        }));
    };

    // ========================================================
    // FORM VALIDATION
    // ========================================================

    const validateForm = (): boolean => {
        if (!formData.name_provider_user.trim()) {
            showToast(
                "error",
                "Please enter the administrator's full name.",
                "Full Name Required"
            );
            return false;
        }

        if (!formData.email_provider_user.trim()) {
            showToast(
                "error",
                "Please enter an email address.",
                "Email Required"
            );
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(formData.email_provider_user.trim())) {
            showToast(
                "error",
                "Please enter a valid email address.",
                "Invalid Email"
            );
            return false;
        }

        const phone = formData.phone_number_provider_user.trim();

        if (!/^\d{10,15}$/.test(phone)) {
            showToast(
                "error",
                "Phone number must contain 10 to 15 digits.",
                "Invalid Phone Number"
            );
            return false;
        }

        if (formData.password_provider_user.length < 8) {
            showToast(
                "error",
                "Password must contain at least 8 characters.",
                "Invalid Password"
            );
            return false;
        }

        if (
            formData.password_provider_user !==
            formData.confirm_password
        ) {
            showToast(
                "error",
                "Password and confirmation password do not match.",
                "Password Mismatch"
            );
            return false;
        }

        if (loadingRoles || roleError) {
            showToast(
                "error",
                "Provider role is not ready. Please try again.",
                "Role Unavailable"
            );
            return false;
        }

        const selectedRole = roles.find(
            (role) =>
                String(role.id_provider_role) ===
                formData.id_provider_role
        );

        if (!selectedRole) {
            showToast(
                "error",
                "Please select a valid administrator role.",
                "Invalid Role"
            );
            return false;
        }

        if (!Number.isSafeInteger(providerId) || providerId <= 0) {
            showToast(
                "error",
                "Provider ID is invalid.",
                "Invalid Provider"
            );
            return false;
        }

        return true;
    };

    // ========================================================
    // SUBMIT PROVIDER USER
    // ========================================================

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (loading || created) return;
        if (!validateForm()) return;

        try {
            setLoading(true);

            const payload = {
                name_provider_user:
                    formData.name_provider_user.trim(),

                email_provider_user:
                    formData.email_provider_user.trim().toLowerCase(),

                password_provider_user:
                    formData.password_provider_user,

                phone_number_provider_user:
                    formData.phone_number_provider_user.trim(),

                status_provider_user: "ACTIVE",

                id_provider: providerId,

                id_provider_role: Number(formData.id_provider_role),
            };

            const response = await fetch(
                `${API_URI}/provider-user/sign-up`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            );

            const result: ProviderUserResponse = await response
                .json()
                .catch(() => ({}));

            if (!response.ok || result.success === false) {
                let errorMessage =
                    result.message ||
                    `Failed to create provider account (${response.status}).`;

                if (result.errors) {
                    const details = Object.entries(result.errors).flatMap(
                        ([field, messages]) => {
                            const values = Array.isArray(messages)
                                ? messages
                                : [messages];

                            return values.map(
                                (message) => `${field}: ${message}`
                            );
                        }
                    );

                    if (details.length > 0) {
                        errorMessage += ` ${details.join("; ")}`;
                    }
                }

                throw new Error(errorMessage);
            }

            setCreated(true);

            showToast(
                "success",
                result.message ||
                "Provider administrator account created successfully.",
                "Account Created"
            );

            /*
             * Bersihkan data registrasi di parent.
             * Jangan otomatis menyimpan token response
             * sign-up sebagai sesi login.
             */
            onSuccess?.();

            redirectTimer.current = setTimeout(() => {
                navigate("/provider/sign-in", {
                    replace: true,
                });
            }, 1500);
        } catch (error) {
            showToast(
                "error",
                error instanceof Error
                    ? error.message
                    : "Something went wrong. Please try again.",
                "Account Creation Failed"
            );
        } finally {
            setLoading(false);
        }
    };

    // ========================================================
    // INPUT STYLES
    // ========================================================

    const inputClass =
        "w-full rounded-xl border border-gray-300 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-50";

    const passwordInputClass =
        "w-full rounded-xl border border-gray-300 bg-white py-3 pl-11 pr-12 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-50";

    const labelClass =
        "mb-2 block text-sm font-medium text-gray-700";

    // ========================================================
    // RENDER
    // ========================================================

    return (
        <>
            <Toast toast={toast} onClose={closeToast} />

            <div className="mx-auto w-full max-w-xl">
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                    {/* HEADER */}
                    <div className="text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                            <CheckCircle2 size={32} />
                        </div>

                        <h1 className="mt-5 text-2xl font-semibold text-gray-900">
                            Provider Approved
                        </h1>

                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                            Your provider registration has been approved.
                            Create your administrator account to start
                            managing your provider.
                        </p>
                    </div>

                    {/* STATUS */}
                    <div className="mt-6 rounded-xl border border-green-100 bg-green-50 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-green-600">
                                    Registration Status
                                </p>

                                <p className="mt-1 text-sm font-semibold text-green-700">
                                    APPROVED
                                </p>
                            </div>

                            <CheckCircle2
                                size={22}
                                className="text-green-600"
                            />
                        </div>
                    </div>

                    {/* PROVIDER ID */}
                    <div className="mt-4 flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                        <span className="text-xs text-gray-500">
                            Provider ID
                        </span>

                        <span className="text-sm font-semibold text-gray-900">
                            #{providerId}
                        </span>
                    </div>

                    {/* FORM HEADER */}
                    <div className="mt-8 border-t border-gray-100 pt-7">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Create Administrator Account
                        </h2>

                        <p className="mt-1 text-sm leading-6 text-gray-500">
                            This account will be used to access and
                            manage your provider dashboard.
                        </p>
                    </div>

                    {/* FORM */}
                    <form
                        onSubmit={handleSubmit}
                        className="mt-6 space-y-5"
                        noValidate
                    >
                        {/* NAME */}
                        <div>
                            <label
                                htmlFor="name_provider_user"
                                className={labelClass}
                            >
                                Full Name <span className="text-red-500">*</span>
                            </label>

                            <div className="relative">
                                <UserRound
                                    size={18}
                                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                />

                                <input
                                    id="name_provider_user"
                                    type="text"
                                    name="name_provider_user"
                                    value={formData.name_provider_user}
                                    onChange={handleChange}
                                    disabled={loading || created}
                                    autoComplete="name"
                                    placeholder="Administrator name"
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        {/* EMAIL */}
                        <div>
                            <label
                                htmlFor="email_provider_user"
                                className={labelClass}
                            >
                                Email Address{" "}
                                <span className="text-red-500">*</span>
                            </label>

                            <div className="relative">
                                <Mail
                                    size={18}
                                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                />

                                <input
                                    id="email_provider_user"
                                    type="email"
                                    name="email_provider_user"
                                    value={formData.email_provider_user}
                                    onChange={handleChange}
                                    disabled={loading || created}
                                    autoComplete="email"
                                    placeholder="admin@example.com"
                                    className={inputClass}
                                />
                            </div>

                            {providerEmail && (
                                <p className="mt-2 text-xs text-gray-400">
                                    The registration email has been
                                    filled automatically. You may change
                                    it for the administrator account.
                                </p>
                            )}
                        </div>

                        {/* PHONE */}
                        <div>
                            <label
                                htmlFor="phone_number_provider_user"
                                className={labelClass}
                            >
                                Phone Number{" "}
                                <span className="text-red-500">*</span>
                            </label>

                            <div className="relative">
                                <Phone
                                    size={18}
                                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                />

                                <input
                                    id="phone_number_provider_user"
                                    type="tel"
                                    name="phone_number_provider_user"
                                    value={
                                        formData.phone_number_provider_user
                                    }
                                    onChange={handleChange}
                                    disabled={loading || created}
                                    inputMode="numeric"
                                    maxLength={15}
                                    autoComplete="tel"
                                    placeholder="08xxxxxxxxxx"
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        {/* PROVIDER ROLE */}
                        <div>
                            <label
                                htmlFor="id_provider_role"
                                className={labelClass}
                            >
                                Provider Role{" "}
                                <span className="text-red-500">*</span>
                            </label>

                            <div className="relative">
                                <ShieldCheck
                                    size={18}
                                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                />

                                <select
                                    id="id_provider_role"
                                    name="id_provider_role"
                                    value={formData.id_provider_role}
                                    onChange={handleChange}
                                    disabled={
                                        loading ||
                                        created ||
                                        loadingRoles ||
                                        roles.length === 0
                                    }
                                    className={`${inputClass} cursor-pointer pr-10`}
                                >
                                    <option value="">
                                        {loadingRoles
                                            ? "Loading provider roles..."
                                            : roles.length === 0
                                                ? "Administrator role unavailable"
                                                : "Select Provider Role"}
                                    </option>

                                    {roles.map((role) => (
                                        <option
                                            key={role.id_provider_role}
                                            value={String(role.id_provider_role)}
                                        >
                                            {role.name_provider_role}
                                        </option>
                                    ))}
                                </select>

                                {loadingRoles && (
                                    <Loader2
                                        size={17}
                                        className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 animate-spin text-blue-600"
                                    />
                                )}
                            </div>

                            {roleError && (
                                <div className="mt-2 flex items-center justify-between gap-3">
                                    <p className="text-xs text-red-500">
                                        {roleError}
                                    </p>

                                    <button
                                        type="button"
                                        onClick={() => void fetchProviderRoles()}
                                        disabled={loadingRoles}
                                        className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                                    >
                                        <RefreshCw size={13} />
                                        Retry
                                    </button>
                                </div>
                            )}

                            {!roleError && !loadingRoles && roles.length > 0 && (
                                <p className="mt-2 text-xs text-gray-400">
                                    The first provider account must have
                                    the Administrator role.
                                </p>
                            )}
                        </div>

                        {/* PASSWORD */}
                        <div>
                            <label
                                htmlFor="password_provider_user"
                                className={labelClass}
                            >
                                Password <span className="text-red-500">*</span>
                            </label>

                            <div className="relative">
                                <LockKeyhole
                                    size={18}
                                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                />

                                <input
                                    id="password_provider_user"
                                    type={showPassword ? "text" : "password"}
                                    name="password_provider_user"
                                    value={formData.password_provider_user}
                                    onChange={handleChange}
                                    disabled={loading || created}
                                    autoComplete="new-password"
                                    placeholder="Create password"
                                    className={passwordInputClass}
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword((prev) => !prev)
                                    }
                                    disabled={loading || created}
                                    aria-label={
                                        showPassword
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                    className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-700"
                                >
                                    {showPassword ? (
                                        <EyeOff size={18} />
                                    ) : (
                                        <Eye size={18} />
                                    )}
                                </button>
                            </div>

                            <p className="mt-2 text-xs text-gray-400">
                                Minimum 8 characters.
                            </p>
                        </div>

                        {/* CONFIRM PASSWORD */}
                        <div>
                            <label
                                htmlFor="confirm_password"
                                className={labelClass}
                            >
                                Confirm Password{" "}
                                <span className="text-red-500">*</span>
                            </label>

                            <div className="relative">
                                <LockKeyhole
                                    size={18}
                                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                />

                                <input
                                    id="confirm_password"
                                    type={
                                        showConfirmPassword
                                            ? "text"
                                            : "password"
                                    }
                                    name="confirm_password"
                                    value={formData.confirm_password}
                                    onChange={handleChange}
                                    disabled={loading || created}
                                    autoComplete="new-password"
                                    placeholder="Confirm password"
                                    className={passwordInputClass}
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowConfirmPassword((prev) => !prev)
                                    }
                                    disabled={loading || created}
                                    aria-label={
                                        showConfirmPassword
                                            ? "Hide confirm password"
                                            : "Show confirm password"
                                    }
                                    className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-700"
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff size={18} />
                                    ) : (
                                        <Eye size={18} />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* SUBMIT */}
                        <button
                            type="submit"
                            disabled={
                                loading ||
                                created ||
                                loadingRoles ||
                                !!roleError ||
                                roles.length === 0
                            }
                            className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                        >
                            {loading ? (
                                <>
                                    <Loader2
                                        size={18}
                                        className="animate-spin"
                                    />
                                    Creating Account...
                                </>
                            ) : created ? (
                                <>
                                    <CheckCircle2 size={18} />
                                    Account Created
                                </>
                            ) : (
                                "Create Provider Account"
                            )}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-xs leading-5 text-gray-400">
                        This administrator account will be associated
                        with Provider #{providerId}.
                    </p>
                </div>
            </div>
        </>
    );
};

export default CreateProviderUser;
