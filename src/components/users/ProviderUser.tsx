import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type FormEvent,
    type ReactNode,
} from "react";

import { useNavigate } from "react-router-dom";

import {
    AlertCircle,
    Building2,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Eye,
    EyeOff,
    LoaderCircle,
    Plus,
    RefreshCw,
    Search,
    ShieldCheck,
    UserRound,
    UserRoundPlus,
    Users,
    X,
} from "lucide-react";

const PAGE_SIZE = 10;

type ApiRecord = Record<string, unknown>;

type ModalType = "create" | "detail" | null;

interface ProviderUserData {
    id_provider_user: number;
    name_provider_user: string;
    email_provider_user: string;
    phone_number_provider_user: string;
    status_provider_user: string;
    id_provider: number | null;
    id_provider_role: number | null;
}

interface ProviderData {
    id_provider: number;
    name_provider: string;
}

interface ProviderRoleData {
    id_provider_role: number;
    name_provider_role: string;
}

interface ProviderUserForm {
    name_provider_user: string;
    email_provider_user: string;
    password_provider_user: string;
    phone_number_provider_user: string;
    status_provider_user: "ACTIVE" | "INACTIVE";
    id_provider: string;
    id_provider_role: string;
}

interface ModalProps {
    title: string;
    children: ReactNode;
    footer?: ReactNode;
    onClose: () => void;
    busy?: boolean;
    wide?: boolean;
}

interface InfoFieldProps {
    label: string;
    value: string | number | null | undefined;
}

interface Notice {
    type: "success" | "error";
    message: string;
}

const primaryButton =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#0866D8] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#DBE4F0] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

const inputClass =
    "w-full rounded-lg border border-[#DBE4F0] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-[#0866D8] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50";

const emptyForm = (): ProviderUserForm => ({
    name_provider_user: "",
    email_provider_user: "",
    password_provider_user: "",
    phone_number_provider_user: "",
    status_provider_user: "ACTIVE",
    id_provider: "",
    id_provider_role: "",
});

const isRecord = (
    value: unknown
): value is ApiRecord =>
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value);

const asText = (value: unknown): string => {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value);
};

const asId = (value: unknown): number | null => {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const parsed = Number(value);

    return Number.isSafeInteger(parsed) && parsed > 0
        ? parsed
        : null;
};

const normalizeStatus = (value: unknown): string =>
    asText(value || "UNKNOWN")
        .trim()
        .toUpperCase();

const getErrorMessage = (error: unknown): string =>
    error instanceof Error
        ? error.message
        : "Terjadi kesalahan. Silakan coba kembali.";

const getToken = (): string | null =>
    sessionStorage.getItem("admin_token") ??
    localStorage.getItem("admin_token");

const getInitials = (name: string): string => {
    const words = name.trim().split(/\s+/).filter(Boolean);

    if (words.length === 0) return "?";

    return words
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join("");
};

const extractArray = (
    payload: unknown,
    keys: string[],
    depth = 0
): ApiRecord[] => {
    if (Array.isArray(payload)) {
        if (!payload.every(isRecord)) {
            throw new Error("Format daftar API tidak valid.");
        }

        return payload;
    }

    if (!isRecord(payload) || depth > 6) {
        throw new Error("Format respons API tidak valid.");
    }

    if (payload.success === false) {
        throw new Error(
            typeof payload.message === "string"
                ? payload.message
                : "Request API gagal."
        );
    }

    for (const key of [
        ...keys,
        "data",
        "items",
        "rows",
        "results",
    ]) {
        const value = payload[key];

        if (Array.isArray(value)) {
            return extractArray(value, keys, depth + 1);
        }

        if (isRecord(value)) {
            try {
                return extractArray(value, keys, depth + 1);
            } catch {
                // Lanjut periksa field lain.
            }
        }
    }

    throw new Error("Daftar data tidak ditemukan.");
};

const normalizeProviderUser = (
    row: ApiRecord
): ProviderUserData | null => {
    const id = asId(row.id_provider_user);

    if (id === null) return null;

    const provider = isRecord(row.provider)
        ? row.provider
        : null;

    const role = isRecord(row.provider_role)
        ? row.provider_role
        : null;

    return {
        id_provider_user: id,

        name_provider_user: asText(
            row.name_provider_user
        ),

        email_provider_user: asText(
            row.email_provider_user
        ),

        phone_number_provider_user: asText(
            row.phone_number_provider_user
        ),

        status_provider_user: normalizeStatus(
            row.status_provider_user
        ),

        id_provider:
            asId(row.id_provider) ??
            asId(provider?.id_provider),

        id_provider_role:
            asId(row.id_provider_role) ??
            asId(role?.id_provider_role),
    };
};

const normalizeProvider = (
    row: ApiRecord
): ProviderData | null => {
    const id = asId(row.id_provider);

    if (id === null) return null;

    return {
        id_provider: id,
        name_provider: asText(row.name_provider),
    };
};

const normalizeProviderRole = (
    row: ApiRecord
): ProviderRoleData | null => {
    const id = asId(row.id_provider_role);

    if (id === null) return null;

    return {
        id_provider_role: id,
        name_provider_role: asText(
            row.name_provider_role
        ),
    };
};

class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);

        this.name = "ApiError";
        this.status = status;
    }
}

const apiRequest = async (
    endpoint: string,
    options: RequestInit = {},
    authenticated = true
): Promise<unknown> => {
    const token = getToken();

    if (authenticated && !token) {
        throw new ApiError(
            401,
            "Token admin tidak tersedia. Silakan login kembali."
        );
    }

    const headers = new Headers(options.headers);

    headers.set("Accept", "application/json");

    if (options.body && !(options.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }

    if (authenticated && token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(
        `${import.meta.env.VITE_API_URI}${endpoint}`,
        {
            ...options,
            headers,
        }
    );

    const contentType =
        response.headers.get("content-type") ?? "";

    let payload: unknown = null;

    if (contentType.includes("application/json")) {
        payload = await response.json();
    } else {
        const body = await response.text();
        payload = body || null;
    }

    if (!response.ok) {
        const message =
            isRecord(payload) &&
                typeof payload.message === "string"
                ? payload.message
                : response.status === 403
                    ? "Anda tidak memiliki akses ke endpoint ini."
                    : response.status === 401
                        ? "Token tidak diterima oleh endpoint ini."
                        : `Request gagal (HTTP ${response.status}).`;

        throw new ApiError(response.status, message);
    }

    if (
        isRecord(payload) &&
        payload.success === false
    ) {
        throw new Error(
            typeof payload.message === "string"
                ? payload.message
                : "Operasi API gagal."
        );
    }

    return payload;
};

const getAllProviderUsers = async (
    signal?: AbortSignal
): Promise<ProviderUserData[]> => {
    const response = await apiRequest(
        "/provider-user/get-all",
        { signal }
    );

    return extractArray(response, [
        "provider_users",
        "providerUsers",
        "users",
    ])
        .map(normalizeProviderUser)
        .filter(
            (item): item is ProviderUserData =>
                item !== null
        );
};

const createProviderUser = async (
    form: ProviderUserForm
): Promise<unknown> => {
    return apiRequest(
        "/provider-user/sign-up",
        {
            method: "POST",
            body: JSON.stringify({
                name_provider_user:
                    form.name_provider_user.trim(),

                email_provider_user:
                    form.email_provider_user.trim().toLowerCase(),

                password_provider_user:
                    form.password_provider_user,

                phone_number_provider_user:
                    form.phone_number_provider_user.trim(),

                status_provider_user:
                    form.status_provider_user,

                id_provider: Number(form.id_provider),

                id_provider_role: Number(
                    form.id_provider_role
                ),
            }),
        },
        false
    );
};

const getAllProviders = async (
    signal?: AbortSignal
): Promise<ProviderData[]> => {
    const response = await apiRequest(
        "/provider/get-all",
        { signal }
    );

    return extractArray(response, [
        "providers",
        "provider",
    ])
        .map(normalizeProvider)
        .filter(
            (item): item is ProviderData =>
                item !== null
        );
};

const getAllProviderRoles = async (
    signal?: AbortSignal
): Promise<ProviderRoleData[]> => {
    const response = await apiRequest(
        "/provider-role/get-all",
        { signal }
    );

    return extractArray(response, [
        "provider_roles",
        "providerRoles",
        "roles",
    ])
        .map(normalizeProviderRole)
        .filter(
            (item): item is ProviderRoleData =>
                item !== null
        );
};

const StatusBadge = ({
    status,
}: {
    status: string;
}) => {
    const normalized = normalizeStatus(status);

    const color =
        normalized === "ACTIVE"
            ? "bg-emerald-50 text-emerald-700"
            : normalized === "INACTIVE"
                ? "bg-slate-100 text-slate-600"
                : "bg-amber-50 text-amber-700";

    return (
        <span
            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${color}`}
        >
            {normalized === "ACTIVE"
                ? "Active"
                : normalized === "INACTIVE"
                    ? "Inactive"
                    : normalized}
        </span>
    );
};

const LoadingState = () => (
    <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-500">
        <LoaderCircle
            size={18}
            className="animate-spin text-[#0866D8]"
        />

        Memuat data...
    </div>
);

const EmptyState = ({
    message,
}: {
    message: string;
}) => (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 p-6 text-center">
        <Users size={28} className="text-slate-300" />

        <p className="text-sm text-slate-500">
            {message}
        </p>
    </div>
);

const InfoField = ({
    label,
    value,
}: InfoFieldProps) => (
    <div className="min-w-0">
        <p className="text-xs text-[#526789]">
            {label}
        </p>

        <p className="mt-1 wrap-break-word text-sm font-medium text-slate-900">
            {value === null ||
                value === undefined ||
                value === ""
                ? "—"
                : value}
        </p>
    </div>
);

const Modal = ({
    title,
    children,
    footer,
    onClose,
    busy = false,
    wide = false,
}: ModalProps) => {
    useEffect(() => {
        const onEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !busy) {
                onClose();
            }
        };

        document.addEventListener("keydown", onEscape);

        return () => {
            document.removeEventListener("keydown", onEscape);
        };
    }, [busy, onClose]);

    return (
        <div
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4"
            onMouseDown={(event) => {
                if (
                    event.target === event.currentTarget &&
                    !busy
                ) {
                    onClose();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={`flex w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${wide
                    ? "h-[min(650px,90dvh)] max-w-2xl"
                    : "h-[min(530px,90dvh)] max-w-lg"
                    }`}
            >
                {/* HEADER */}
                <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
                    <h2 className="text-lg font-bold text-slate-950">
                        {title}
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        aria-label="Tutup popup"
                        className="cursor-pointer rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                    >
                        <X size={19} />
                    </button>
                </div>

                {/* SCROLLABLE CONTENT */}
                <div className="min-h-0 flex-1 overflow-y-auto p-5 scrollbar-gutter-stable">
                    {children}
                </div>

                {/* FIXED FOOTER */}
                {footer && (
                    <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

const ProviderUser = () => {
    const navigate = useNavigate();

    const [providerUsers, setProviderUsers] = useState<
        ProviderUserData[]
    >([]);

    const [providers, setProviders] = useState<
        ProviderData[]
    >([]);

    const [roles, setRoles] = useState<
        ProviderRoleData[]
    >([]);

    const [selectedUser, setSelectedUser] = useState<
        ProviderUserData | null
    >(null);

    const [modal, setModal] = useState<ModalType>(null);

    const [form, setForm] = useState<ProviderUserForm>(
        emptyForm()
    );

    const [showPassword, setShowPassword] =
        useState(false);

    const [search, setSearch] = useState("");

    const [statusFilter, setStatusFilter] =
        useState("ALL");

    const [providerFilter, setProviderFilter] =
        useState("ALL");

    const [roleFilter, setRoleFilter] =
        useState("ALL");

    const [page, setPage] = useState(1);

    const [loading, setLoading] = useState(true);

    const [saving, setSaving] = useState(false);

    const [listError, setListError] = useState("");

    const [modalError, setModalError] = useState("");

    const [notice, setNotice] = useState<
        Notice | null
    >(null);

    const [refreshKey, setRefreshKey] = useState(0);

    const handleApiError = useCallback(
        (error: unknown): boolean => {
            if (
                error instanceof ApiError &&
                error.status === 401 &&
                !getToken()
            ) {
                navigate("/user/sign-in", {
                    replace: true,
                });

                return true;
            }

            return false;
        },
        [navigate]
    );

    useEffect(() => {
        const controller = new AbortController();

        const loadData = async () => {
            setLoading(true);
            setListError("");

            const results = await Promise.allSettled([
                getAllProviderUsers(controller.signal),
                getAllProviders(controller.signal),
                getAllProviderRoles(controller.signal),
            ]);

            if (controller.signal.aborted) return;

            const [
                usersResult,
                providersResult,
                rolesResult,
            ] = results;

            if (usersResult.status === "fulfilled") {
                setProviderUsers(usersResult.value);
            } else {
                setProviderUsers([]);

                setListError(
                    getErrorMessage(usersResult.reason)
                );

                handleApiError(usersResult.reason);
            }

            setProviders(
                providersResult.status === "fulfilled"
                    ? providersResult.value
                    : []
            );

            setRoles(
                rolesResult.status === "fulfilled"
                    ? rolesResult.value
                    : []
            );

            setLoading(false);
        };

        void loadData();

        return () => controller.abort();
    }, [refreshKey, handleApiError]);

    const providerName = useCallback(
        (providerId: number | null): string => {
            if (providerId === null) return "—";

            return (
                providers.find(
                    (provider) =>
                        provider.id_provider === providerId
                )?.name_provider ||
                `Provider #${providerId}`
            );
        },
        [providers]
    );

    const roleName = useCallback(
        (roleId: number | null): string => {
            if (roleId === null) return "—";

            return (
                roles.find(
                    (role) =>
                        role.id_provider_role === roleId
                )?.name_provider_role ||
                `Role #${roleId}`
            );
        },
        [roles]
    );

    const activeCount = providerUsers.filter(
        (user) => user.status_provider_user === "ACTIVE"
    ).length;

    const inactiveCount = providerUsers.filter(
        (user) => user.status_provider_user === "INACTIVE"
    ).length;

    const providerCount = new Set(
        providerUsers
            .map((user) => user.id_provider)
            .filter(
                (id): id is number => id !== null
            )
    ).size;

    const statusOptions = useMemo(
        () =>
            Array.from(
                new Set(
                    providerUsers.map(
                        (user) => user.status_provider_user
                    )
                )
            )
                .filter(Boolean)
                .sort(),
        [providerUsers]
    );

    const providerOptions = useMemo(() => {
        return Array.from(
            new Set(
                providerUsers
                    .map((user) => user.id_provider)
                    .filter(
                        (id): id is number => id !== null
                    )
            )
        )
            .map((id) => ({
                id,
                name: providerName(id),
            }))
            .sort((a, b) =>
                a.name.localeCompare(b.name)
            );
    }, [providerUsers, providerName]);

    const roleOptions = useMemo(() => {
        return Array.from(
            new Set(
                providerUsers
                    .map((user) => user.id_provider_role)
                    .filter(
                        (id): id is number => id !== null
                    )
            )
        )
            .map((id) => ({
                id,
                name: roleName(id),
            }))
            .sort((a, b) =>
                a.name.localeCompare(b.name)
            );
    }, [providerUsers, roleName]);

    const filteredUsers = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return providerUsers.filter((user) => {
            const searchable = [
                user.name_provider_user,
                user.email_provider_user,
                user.phone_number_provider_user,
                providerName(user.id_provider),
                roleName(user.id_provider_role),
                String(user.id_provider_user),
            ];

            const matchSearch = searchable.some(
                (value) =>
                    value.toLowerCase().includes(keyword)
            );

            const matchStatus =
                statusFilter === "ALL" ||
                user.status_provider_user === statusFilter;

            const matchProvider =
                providerFilter === "ALL" ||
                String(user.id_provider) === providerFilter;

            const matchRole =
                roleFilter === "ALL" ||
                String(user.id_provider_role) === roleFilter;

            return (
                matchSearch &&
                matchStatus &&
                matchProvider &&
                matchRole
            );
        });
    }, [
        providerUsers,
        search,
        statusFilter,
        providerFilter,
        roleFilter,
        providerName,
        roleName,
    ]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredUsers.length / PAGE_SIZE)
    );

    const currentPage = Math.min(page, totalPages);

    const displayedUsers = filteredUsers.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    const closeModal = useCallback(() => {
        if (saving) return;

        setModal(null);
        setSelectedUser(null);
        setForm(emptyForm());
        setModalError("");
        setShowPassword(false);
    }, [saving]);

    const openCreate = () => {
        setForm(emptyForm());
        setSelectedUser(null);
        setModalError("");
        setShowPassword(false);
        setModal("create");
    };

    const openDetail = (user: ProviderUserData) => {
        setSelectedUser(user);
        setModalError("");
        setModal("detail");
    };

    const updateForm = (
        key: keyof ProviderUserForm,
        value: string
    ) => {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
    };

    const handleCreate = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (saving) return;

        const name = form.name_provider_user.trim();
        const email = form.email_provider_user.trim();
        const password = form.password_provider_user;
        const phone = form.phone_number_provider_user.trim();

        if (!name) {
            setModalError("Nama pengguna wajib diisi.");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setModalError("Format email tidak valid.");
            return;
        }

        if (password.length < 8) {
            setModalError(
                "Password minimal 8 karakter."
            );
            return;
        }

        if (!/^\+?[0-9]{8,15}$/.test(phone)) {
            setModalError(
                "Nomor telepon harus 8–15 digit angka."
            );
            return;
        }

        if (
            asId(form.id_provider) === null ||
            asId(form.id_provider_role) === null
        ) {
            setModalError(
                "Provider dan role wajib dipilih."
            );
            return;
        }

        const emailExists = providerUsers.some(
            (user) =>
                user.email_provider_user.toLowerCase() ===
                email.toLowerCase()
        );

        if (emailExists) {
            setModalError(
                "Email sudah digunakan oleh Provider User lain."
            );
            return;
        }

        setSaving(true);
        setModalError("");

        try {
            await createProviderUser(form);

            // Pendaftaran sudah berhasil.
            // Ambil ulang daftar, tetapi kegagalan GET tidak
            // mengubah hasil registrasi menjadi seolah gagal.
            let refreshed = false;

            try {
                const latest = await getAllProviderUsers();
                setProviderUsers(latest);
                refreshed = true;
            } catch {
                setRefreshKey((value) => value + 1);
            }

            setModal(null);
            setForm(emptyForm());

            setNotice({
                type: "success",
                message: refreshed
                    ? "Akun Provider User berhasil ditambahkan."
                    : "Registrasi akun berhasil. Daftar belum dapat diperbarui; silakan Refresh.",
            });
        } catch (error) {
            setModalError(getErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const refreshData = () => {
        setNotice(null);
        setRefreshKey((value) => value + 1);
    };

    const modalErrorView = modalError ? (
        <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700"
        >
            <AlertCircle
                size={16}
                className="shrink-0"
            />

            <span>{modalError}</span>
        </div>
    ) : null;

    const renderModal = () => {
        if (modal === "create") {
            return (
                <Modal
                    title="Tambah Provider User"
                    onClose={closeModal}
                    busy={saving}
                    wide
                    footer={
                        <>
                            <button
                                type="button"
                                onClick={closeModal}
                                disabled={saving}
                                className={secondaryButton}
                            >
                                Batal
                            </button>

                            <button
                                type="submit"
                                form="provider-user-form"
                                disabled={
                                    saving ||
                                    !form.name_provider_user.trim() ||
                                    !form.email_provider_user.trim() ||
                                    !form.password_provider_user ||
                                    !form.id_provider ||
                                    !form.id_provider_role
                                }
                                className={primaryButton}
                            >
                                {saving ? (
                                    <>
                                        <LoaderCircle
                                            size={16}
                                            className="animate-spin"
                                        />

                                        Menyimpan...
                                    </>
                                ) : (
                                    <>
                                        <UserRoundPlus size={16} />
                                        Tambah Akun
                                    </>
                                )}
                            </button>
                        </>
                    }
                >
                    {modalErrorView}

                    <form
                        id="provider-user-form"
                        onSubmit={handleCreate}
                        className="space-y-5"
                    >
                        {/* NAME */}
                        <div>
                            <label
                                htmlFor="name_provider_user"
                                className="mb-2 block text-xs font-semibold text-slate-700"
                            >
                                Nama Lengkap *
                            </label>

                            <input
                                id="name_provider_user"
                                value={form.name_provider_user}
                                onChange={(event) =>
                                    updateForm(
                                        "name_provider_user",
                                        event.target.value
                                    )
                                }
                                placeholder="Masukkan nama pengguna"
                                disabled={saving}
                                required
                                autoFocus
                                maxLength={255}
                                className={inputClass}
                            />
                        </div>

                        {/* EMAIL / PHONE */}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="email_provider_user"
                                    className="mb-2 block text-xs font-semibold text-slate-700"
                                >
                                    Email *
                                </label>

                                <input
                                    id="email_provider_user"
                                    type="email"
                                    value={form.email_provider_user}
                                    onChange={(event) =>
                                        updateForm(
                                            "email_provider_user",
                                            event.target.value
                                        )
                                    }
                                    placeholder="nama@email.com"
                                    disabled={saving}
                                    required
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="phone_number_provider_user"
                                    className="mb-2 block text-xs font-semibold text-slate-700"
                                >
                                    Nomor Telepon *
                                </label>

                                <input
                                    id="phone_number_provider_user"
                                    type="tel"
                                    value={form.phone_number_provider_user}
                                    onChange={(event) =>
                                        updateForm(
                                            "phone_number_provider_user",
                                            event.target.value
                                        )
                                    }
                                    placeholder="081234567890"
                                    disabled={saving}
                                    required
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        {/* PASSWORD */}
                        <div>
                            <label
                                htmlFor="password_provider_user"
                                className="mb-2 block text-xs font-semibold text-slate-700"
                            >
                                Password *
                            </label>

                            <div className="relative">
                                <input
                                    id="password_provider_user"
                                    type={showPassword ? "text" : "password"}
                                    value={form.password_provider_user}
                                    onChange={(event) =>
                                        updateForm(
                                            "password_provider_user",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Minimal 8 karakter"
                                    disabled={saving}
                                    minLength={8}
                                    autoComplete="new-password"
                                    required
                                    className={`${inputClass} pr-11`}
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword((current) => !current)
                                    }
                                    aria-label={
                                        showPassword
                                            ? "Sembunyikan password"
                                            : "Tampilkan password"
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-700"
                                >
                                    {showPassword ? (
                                        <EyeOff size={18} />
                                    ) : (
                                        <Eye size={18} />
                                    )}
                                </button>
                            </div>

                            <p className="mt-1.5 text-xs text-slate-500">
                                Gunakan password yang kuat dan unik.
                            </p>
                        </div>

                        {/* PROVIDER / ROLE */}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="id_provider"
                                    className="mb-2 block text-xs font-semibold text-slate-700"
                                >
                                    Provider *
                                </label>

                                <select
                                    id="id_provider"
                                    value={form.id_provider}
                                    onChange={(event) =>
                                        updateForm(
                                            "id_provider",
                                            event.target.value
                                        )
                                    }
                                    disabled={saving}
                                    required
                                    className={inputClass}
                                >
                                    <option value="">
                                        Pilih Provider
                                    </option>

                                    {providers.map((provider) => (
                                        <option
                                            key={provider.id_provider}
                                            value={provider.id_provider}
                                        >
                                            {provider.name_provider}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label
                                    htmlFor="id_provider_role"
                                    className="mb-2 block text-xs font-semibold text-slate-700"
                                >
                                    Role Provider *
                                </label>

                                <select
                                    id="id_provider_role"
                                    value={form.id_provider_role}
                                    onChange={(event) =>
                                        updateForm(
                                            "id_provider_role",
                                            event.target.value
                                        )
                                    }
                                    disabled={saving}
                                    required
                                    className={inputClass}
                                >
                                    <option value="">
                                        Pilih Role
                                    </option>

                                    {roles.map((role) => (
                                        <option
                                            key={role.id_provider_role}
                                            value={role.id_provider_role}
                                        >
                                            {role.name_provider_role}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* STATUS */}
                        <div>
                            <label
                                htmlFor="status_provider_user"
                                className="mb-2 block text-xs font-semibold text-slate-700"
                            >
                                Status Akun
                            </label>

                            <select
                                id="status_provider_user"
                                value={form.status_provider_user}
                                onChange={(event) =>
                                    updateForm(
                                        "status_provider_user",
                                        event.target.value
                                    )
                                }
                                disabled={saving}
                                className={inputClass}
                            >
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                            </select>
                        </div>
                    </form>
                </Modal>
            );
        }

        if (modal === "detail" && selectedUser) {
            const user = selectedUser;

            return (
                <Modal
                    title="Detail Provider User"
                    onClose={closeModal}
                    wide
                    footer={
                        <button
                            type="button"
                            onClick={closeModal}
                            className={secondaryButton}
                        >
                            Tutup
                        </button>
                    }
                >
                    {/* USER HEADER */}
                    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg font-bold text-[#0866D8]">
                                {getInitials(user.name_provider_user)}
                            </div>

                            <div className="min-w-0">
                                <h3 className="wrap-break-word text-lg font-bold text-slate-950">
                                    {user.name_provider_user || "Tanpa Nama"}
                                </h3>

                                <p className="mt-1 text-xs text-slate-500">
                                    ID User: {user.id_provider_user}
                                </p>

                                <div className="mt-2">
                                    <StatusBadge
                                        status={user.status_provider_user}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ACCOUNT INFORMATION */}
                    <section className="border-t border-slate-100 pt-5">
                        <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#00357A]">
                            <UserRound size={17} />
                            Informasi Akun
                        </h4>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <InfoField
                                label="ID Provider User"
                                value={user.id_provider_user}
                            />

                            <InfoField
                                label="Nama Lengkap"
                                value={user.name_provider_user}
                            />

                            <InfoField
                                label="Email"
                                value={user.email_provider_user}
                            />

                            <InfoField
                                label="Nomor Telepon"
                                value={user.phone_number_provider_user}
                            />

                            <InfoField
                                label="Status Akun"
                                value={user.status_provider_user}
                            />
                        </div>
                    </section>

                    {/* PROVIDER INFORMATION */}
                    <section className="mt-6 border-t border-slate-100 pt-5">
                        <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#00357A]">
                            <Building2 size={17} />
                            Informasi Provider
                        </h4>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <InfoField
                                label="Provider"
                                value={providerName(user.id_provider)}
                            />

                            <InfoField
                                label="ID Provider"
                                value={user.id_provider}
                            />
                        </div>
                    </section>

                    {/* ROLE INFORMATION */}
                    <section className="mt-6 border-t border-slate-100 pt-5">
                        <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#00357A]">
                            <ShieldCheck size={17} />
                            Informasi Role
                        </h4>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <InfoField
                                label="Role Provider"
                                value={roleName(user.id_provider_role)}
                            />

                            <InfoField
                                label="ID Role"
                                value={user.id_provider_role}
                            />
                        </div>
                    </section>
                </Modal>
            );
        }

        return null;
    };

    return (
        <div className="min-h-full p-4 sm:p-6 lg:p-8">
            {/* HEADER */}
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="mb-1 text-xs text-[#344F77]">
                        STIQR Health Provider / Provider Users
                    </p>

                    <h1 className="text-2xl font-bold text-slate-950 sm:text-[28px]">
                        Provider Users
                    </h1>

                    <p className="mt-2 text-sm text-[#526789]">
                        Kelola akun pengguna yang terhubung dengan
                        masing-masing provider.
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={refreshData}
                        disabled={loading || saving}
                        className={secondaryButton}
                    >
                        <RefreshCw
                            size={16}
                            className={loading ? "animate-spin" : ""}
                        />
                        Refresh
                    </button>

                    <button
                        type="button"
                        onClick={openCreate}
                        disabled={saving}
                        className={primaryButton}
                    >
                        <Plus size={17} />
                        Tambah Akun
                    </button>
                </div>
            </div>

            {/* NOTICE */}
            {notice && (
                <div
                    role="alert"
                    className={`mb-5 flex items-start gap-3 rounded-xl border p-3 ${notice.type === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-700"
                        }`}
                >
                    {notice.type === "success" ? (
                        <CheckCircle2 size={18} />
                    ) : (
                        <AlertCircle size={18} />
                    )}

                    <p className="flex-1 text-sm">
                        {notice.message}
                    </p>

                    <button
                        type="button"
                        onClick={() => setNotice(null)}
                        aria-label="Tutup notifikasi"
                        className="cursor-pointer"
                    >
                        <X size={17} />
                    </button>
                </div>
            )}

            {/* STATISTICS */}
            <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
                {[
                    {
                        label: "Total Pengguna",
                        value: providerUsers.length,
                        icon: <Users size={19} />,
                    },
                    {
                        label: "Active",
                        value: activeCount,
                        icon: <CheckCircle2 size={19} />,
                    },
                    {
                        label: "Inactive",
                        value: inactiveCount,
                        icon: <UserRound size={19} />,
                    },
                    {
                        label: "Provider Terkait",
                        value: providerCount,
                        icon: <Building2 size={19} />,
                    },
                ].map((stat) => (
                    <div
                        key={stat.label}
                        className="rounded-2xl border border-[#DBE4F0] bg-white p-5 shadow-sm"
                    >
                        <div className="mb-3 flex items-center gap-2 text-[#526789]">
                            {stat.icon}

                            <span className="text-xs font-semibold">
                                {stat.label}
                            </span>
                        </div>

                        <p className="text-3xl font-bold text-slate-950">
                            {loading || listError ? "—" : stat.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* TABLE CONTAINER */}
            <section className="overflow-hidden rounded-2xl border border-[#DBE4F0] bg-white shadow-sm">
                {/* FILTER BAR */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
                    <div>
                        <h2 className="text-sm font-bold text-slate-950">
                            Daftar Provider Users
                        </h2>

                        <p className="mt-1 text-xs text-[#526789]">
                            {loading
                                ? "Memuat..."
                                : `${filteredUsers.length} pengguna`}
                        </p>
                    </div>

                    <div className="flex w-full flex-wrap gap-2 xl:w-auto">
                        {/* SEARCH */}
                        <div className="relative min-w-47.5 flex-1 xl:w-52">
                            <Search
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />

                            <input
                                value={search}
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setPage(1);
                                }}
                                placeholder="Cari pengguna..."
                                className={`${inputClass} pl-10`}
                            />
                        </div>

                        {/* STATUS FILTER */}
                        <select
                            value={statusFilter}
                            onChange={(event) => {
                                setStatusFilter(event.target.value);
                                setPage(1);
                            }}
                            aria-label="Filter status"
                            className={inputClass}
                        >
                            <option value="ALL">Semua Status</option>

                            {statusOptions.map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>

                        {/* PROVIDER FILTER */}
                        <select
                            value={providerFilter}
                            onChange={(event) => {
                                setProviderFilter(event.target.value);
                                setPage(1);
                            }}
                            aria-label="Filter provider"
                            className={`${inputClass} max-w-48`}
                        >
                            <option value="ALL">Semua Provider</option>

                            {providerOptions.map((provider) => (
                                <option
                                    key={provider.id}
                                    value={provider.id}
                                >
                                    {provider.name}
                                </option>
                            ))}
                        </select>

                        {/* ROLE FILTER */}
                        <select
                            value={roleFilter}
                            onChange={(event) => {
                                setRoleFilter(event.target.value);
                                setPage(1);
                            }}
                            aria-label="Filter role"
                            className={`${inputClass} max-w-44`}
                        >
                            <option value="ALL">Semua Role</option>

                            {roleOptions.map((role) => (
                                <option key={role.id} value={role.id}>
                                    {role.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* TABLE BODY */}
                {loading ? (
                    <LoadingState />
                ) : listError ? (
                    <div
                        role="alert"
                        className="flex items-start gap-2 p-5 text-sm text-red-600"
                    >
                        <AlertCircle size={18} />
                        <span>{listError}</span>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <EmptyState message="Provider User tidak ditemukan." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead className="bg-[#F5F8FC]">
                                <tr>
                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        No.
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        Pengguna
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        Nomor Telepon
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        Provider
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        Role
                                    </th>

                                    <th className="px-5 py-3 text-center text-xs font-semibold text-[#344F77]">
                                        Status
                                    </th>

                                    <th className="px-5 py-3 text-right text-xs font-semibold text-[#344F77]">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {displayedUsers.map((user, index) => (
                                    <tr
                                        key={user.id_provider_user}
                                        className="border-t border-slate-100 hover:bg-slate-50"
                                    >
                                        {/* NUMBER */}
                                        <td className="px-5 py-4 text-slate-500">
                                            {(currentPage - 1) * PAGE_SIZE +
                                                index +
                                                1}
                                        </td>

                                        {/* USER */}
                                        <td className="px-5 py-4">
                                            <div className="flex min-w-50 items-center gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-[#0866D8]">
                                                    {getInitials(
                                                        user.name_provider_user
                                                    )}
                                                </div>

                                                <div className="min-w-0">
                                                    <p className="max-w-52 truncate font-semibold text-slate-950">
                                                        {user.name_provider_user ||
                                                            "Tanpa Nama"}
                                                    </p>

                                                    <p className="mt-1 max-w-52 truncate text-xs text-slate-500">
                                                        {user.email_provider_user ||
                                                            `ID: ${user.id_provider_user}`}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* PHONE */}
                                        <td className="px-5 py-4 text-slate-600">
                                            {user.phone_number_provider_user ||
                                                "—"}
                                        </td>

                                        {/* PROVIDER */}
                                        <td className="px-5 py-4">
                                            <div className="flex min-w-33.75 items-center gap-2">
                                                <Building2
                                                    size={16}
                                                    className="shrink-0 text-slate-400"
                                                />

                                                <span className="font-medium text-slate-700">
                                                    {providerName(user.id_provider)}
                                                </span>
                                            </div>
                                        </td>

                                        {/* ROLE */}
                                        <td className="px-5 py-4">
                                            <span className="inline-flex rounded-lg bg-[#F1F5FB] px-2.5 py-1 text-xs font-semibold text-[#344F77]">
                                                {roleName(user.id_provider_role)}
                                            </span>
                                        </td>

                                        {/* STATUS */}
                                        <td className="px-5 py-4 text-center">
                                            <StatusBadge
                                                status={user.status_provider_user}
                                            />
                                        </td>

                                        {/* ACTION */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => openDetail(user)}
                                                    title="Detail Provider User"
                                                    aria-label={`Detail ${user.name_provider_user}`}
                                                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-blue-50 text-[#0866D8] hover:bg-blue-100"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* PAGINATION */}
                {!loading &&
                    !listError &&
                    filteredUsers.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
                            <p className="text-xs text-[#526789]">
                                Menampilkan{" "}
                                {(currentPage - 1) * PAGE_SIZE + 1}–
                                {Math.min(
                                    currentPage * PAGE_SIZE,
                                    filteredUsers.length
                                )}{" "}
                                dari {filteredUsers.length}
                            </p>

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    disabled={currentPage === 1}
                                    onClick={() =>
                                        setPage((value) =>
                                            Math.max(1, value - 1)
                                        )
                                    }
                                    aria-label="Halaman sebelumnya"
                                    className="cursor-pointer rounded-lg border border-[#DBE4F0] p-2 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <ChevronLeft size={17} />
                                </button>

                                <span className="text-xs font-semibold">
                                    {currentPage} / {totalPages}
                                </span>

                                <button
                                    type="button"
                                    disabled={currentPage >= totalPages}
                                    onClick={() =>
                                        setPage((value) =>
                                            Math.min(totalPages, value + 1)
                                        )
                                    }
                                    aria-label="Halaman berikutnya"
                                    className="cursor-pointer rounded-lg border border-[#DBE4F0] p-2 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <ChevronRight size={17} />
                                </button>
                            </div>
                        </div>
                    )}
            </section>

            {/* MODALS */}
            {renderModal()}
        </div>
    );
};

export default ProviderUser;
