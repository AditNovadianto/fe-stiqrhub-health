import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type FormEvent,
    type ReactNode,
} from "react";

import {
    AlertCircle,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Eye,
    EyeOff,
    KeyRound,
    LoaderCircle,
    Mail,
    Plus,
    RefreshCw,
    Search,
    ShieldCheck,
    UserRound,
    UserRoundCheck,
    Users,
    X,
} from "lucide-react";

const PAGE_SIZE = 10;

type ApiRecord = Record<string, unknown>;
type ModalType = "create" | "detail" | "reset" | null;
type AccountStatus = "ACTIVE" | "INACTIVE" | "OTHER";

interface InternalUser {
    id_user: number;
    name_user: string;
    email_user: string;
    status_user: string;
    id_user_role: number | null;
}

interface UserRole {
    id_user_role: number;
    name_user_role: string;
}

interface UserForm {
    name_user: string;
    email_user: string;
    password_user: string;
    confirm_password: string;
    status_user: "ACTIVE" | "INACTIVE";
    id_user_role: string;
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
    value: ReactNode;
}

const primaryButton =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#0866D8] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#DBE4F0] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

const inputClass =
    "w-full rounded-lg border border-[#DBE4F0] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-[#0866D8] focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50";

const filterClass =
    "rounded-lg border border-[#DBE4F0] bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-colors focus:border-[#0866D8]";

const iconButtonClass =
    "flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const emptyForm = (): UserForm => ({
    name_user: "",
    email_user: "",
    password_user: "",
    confirm_password: "",
    status_user: "ACTIVE",
    id_user_role: "",
});

const isRecord = (
    value: unknown
): value is ApiRecord =>
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value);

const asText = (value: unknown): string =>
    value === null || value === undefined
        ? ""
        : String(value);

const asId = (value: unknown): number | null => {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const number = Number(value);

    return Number.isSafeInteger(number) && number > 0
        ? number
        : null;
};

const getErrorMessage = (error: unknown): string =>
    error instanceof Error
        ? error.message
        : "Terjadi kesalahan. Silakan coba kembali.";

const getToken = (): string | null =>
    sessionStorage.getItem("admin_token") ??
    localStorage.getItem("admin_token");

const getStatusCategory = (
    status: string
): AccountStatus => {
    const value = status.trim().toUpperCase();

    if (value === "ACTIVE") return "ACTIVE";
    if (value === "INACTIVE") return "INACTIVE";

    return "OTHER";
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
    const headers = new Headers(options.headers);

    headers.set("Accept", "application/json");

    if (options.body) {
        headers.set("Content-Type", "application/json");
    }

    if (authenticated) {
        const token = getToken();

        if (!token) {
            throw new ApiError(
                401,
                "Token admin tidak tersedia. Silakan login kembali."
            );
        }

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

    const payload: unknown = contentType.includes(
        "application/json"
    )
        ? await response.json()
        : (await response.text()) || null;

    if (!response.ok) {
        const serverMessage =
            isRecord(payload) &&
                typeof payload.message === "string"
                ? payload.message
                : isRecord(payload) &&
                    typeof payload.error === "string"
                    ? payload.error
                    : "";

        throw new ApiError(
            response.status,
            serverMessage ||
            (response.status === 401
                ? "Sesi tidak valid atau kedaluwarsa."
                : response.status === 403
                    ? "Akses ditolak."
                    : `Request gagal (HTTP ${response.status}).`)
        );
    }

    if (isRecord(payload) && payload.success === false) {
        throw new Error(
            typeof payload.message === "string"
                ? payload.message
                : "Operasi API gagal."
        );
    }

    return payload;
};

const extractList = (
    payload: unknown,
    keys: string[],
    depth = 0
): ApiRecord[] => {
    if (Array.isArray(payload)) {
        if (!payload.every(isRecord)) {
            throw new Error("Format daftar tidak valid.");
        }

        return payload;
    }

    if (!isRecord(payload) || depth > 5) {
        throw new Error("Format respons tidak valid.");
    }

    for (const key of [
        ...keys,
        "data",
        "items",
        "results",
        "rows",
    ]) {
        const value = payload[key];

        if (Array.isArray(value)) {
            return extractList(value, keys, depth + 1);
        }

        if (isRecord(value)) {
            try {
                return extractList(value, keys, depth + 1);
            } catch {
                // Coba struktur berikutnya.
            }
        }
    }

    throw new Error(
        "Daftar data tidak ditemukan dalam respons API."
    );
};

const normalizeUser = (
    row: ApiRecord
): InternalUser | null => {
    const id = asId(row.id_user);

    if (id === null) {
        return null;
    }

    return {
        id_user: id,
        name_user: asText(row.name_user),
        email_user: asText(row.email_user),
        status_user: asText(row.status_user).toUpperCase(),
        id_user_role: asId(row.id_user_role),
    };
};

const normalizeRole = (
    row: ApiRecord
): UserRole | null => {
    const id = asId(row.id_user_role);

    if (id === null) return null;

    return {
        id_user_role: id,
        name_user_role: asText(row.name_user_role),
    };
};

// GET /user/get-all
const getAllUsers = async (
    signal?: AbortSignal
): Promise<InternalUser[]> => {
    const response = await apiRequest(
        "/user/get-all",
        { signal }
    );

    return extractList(response, ["users"])
        .map(normalizeUser)
        .filter(
            (user): user is InternalUser =>
                user !== null
        );
};

// POST /user/sign-up
// Backend saat ini tidak memasang middleware admin
// pada endpoint sign-up. Pembatasan role harus
// diterapkan di backend sebelum production.
const createInternalUser = async (
    form: UserForm
): Promise<unknown> =>
    apiRequest(
        "/user/sign-up",
        {
            method: "POST",
            body: JSON.stringify({
                name_user: form.name_user.trim(),
                email_user: form.email_user.trim().toLowerCase(),
                password_user: form.password_user,
                status_user: form.status_user,
                id_user_role: Number(form.id_user_role),
            }),
        },
        false
    );

// POST /user/forgot-password
const requestPasswordReset = async (
    email: string
): Promise<unknown> =>
    apiRequest(
        "/user/forgot-password",
        {
            method: "POST",
            body: JSON.stringify({
                email_user: email.trim().toLowerCase(),
            }),
        },
        false
    );

// GET /user-role/get-all
// Opsional: endpoint ini tercantum pada collection,
// tetapi belum terpasang pada ZIP backend.
const getAllRoles = async (
    signal?: AbortSignal
): Promise<UserRole[]> => {
    const response = await apiRequest(
        "/user-role/get-all",
        { signal },
        false
    );

    return extractList(response, [
        "user_roles",
        "roles",
    ])
        .map(normalizeRole)
        .filter(
            (role): role is UserRole =>
                role !== null
        );
};

const StatusBadge = ({
    status,
}: {
    status: string;
}) => {
    const category = getStatusCategory(status);

    const styles =
        category === "ACTIVE"
            ? "bg-emerald-50 text-emerald-700"
            : category === "INACTIVE"
                ? "bg-slate-100 text-slate-600"
                : "bg-amber-50 text-amber-700";

    return (
        <span
            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${styles}`}
        >
            {category === "OTHER"
                ? status || "Unknown"
                : category === "ACTIVE"
                    ? "Active"
                    : "Inactive"}
        </span>
    );
};

const InfoField = ({
    label,
    value,
}: InfoFieldProps) => (
    <div className="min-w-0">
        <p className="text-xs text-[#526789]">
            {label}
        </p>

        <div className="mt-1 wrap-break-word text-sm font-medium text-slate-900">
            {value === null ||
                value === undefined ||
                value === ""
                ? "—"
                : value}
        </div>
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
            document.removeEventListener(
                "keydown",
                onEscape
            );
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
                    ? "h-[min(620px,90dvh)] max-w-2xl"
                    : "max-h-[90dvh] max-w-md"
                    }`}
            >
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

                <div className="min-h-0 flex-1 overflow-y-auto p-5 scrollbar-gutter-stable">
                    {children}
                </div>

                {footer && (
                    <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

const InternalAccount = () => {
    const [users, setUsers] = useState<InternalUser[]>([]);
    const [roles, setRoles] = useState<UserRole[]>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const [listError, setListError] = useState("");
    const [modalError, setModalError] = useState("");
    const [notice, setNotice] = useState("");

    const [modal, setModal] = useState<ModalType>(null);

    const [selectedUser, setSelectedUser] =
        useState<InternalUser | null>(null);

    const [form, setForm] = useState<UserForm>(
        emptyForm()
    );

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [roleFilter, setRoleFilter] = useState("ALL");
    const [page, setPage] = useState(1);

    useEffect(() => {
        const controller = new AbortController();

        const loadData = async () => {
            setLoading(true);
            setListError("");

            const [usersResult, rolesResult] =
                await Promise.allSettled([
                    getAllUsers(controller.signal),
                    getAllRoles(controller.signal),
                ]);

            if (controller.signal.aborted) return;

            if (usersResult.status === "fulfilled") {
                setUsers(usersResult.value);
            } else {
                setUsers([]);
                setListError(
                    getErrorMessage(usersResult.reason)
                );
            }

            setRoles(
                rolesResult.status === "fulfilled"
                    ? rolesResult.value
                    : []
            );

            setLoading(false);
        };

        void loadData();

        return () => controller.abort();
    }, [refreshKey]);

    const roleName = useCallback(
        (roleId: number | null): string => {
            if (roleId === null) return "—";

            return (
                roles.find(
                    (role) =>
                        role.id_user_role === roleId
                )?.name_user_role ||
                `Role #${roleId}`
            );
        },
        [roles]
    );

    const activeCount = users.filter(
        (user) =>
            getStatusCategory(user.status_user) === "ACTIVE"
    ).length;

    const inactiveCount = users.filter(
        (user) =>
            getStatusCategory(user.status_user) === "INACTIVE"
    ).length;

    const uniqueRoleCount = new Set(
        users
            .map((user) => user.id_user_role)
            .filter((id) => id !== null)
    ).size;

    const roleOptions = useMemo(
        () =>
            Array.from(
                new Set(
                    users
                        .map((user) => user.id_user_role)
                        .filter(
                            (id): id is number =>
                                id !== null
                        )
                )
            ).sort((a, b) => a - b),
        [users]
    );

    const filteredUsers = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return users.filter((user) => {
            const matchSearch = [
                user.name_user,
                user.email_user,
                String(user.id_user),
                roleName(user.id_user_role),
            ].some(
                (value) =>
                    value.toLowerCase().includes(keyword)
            );

            const matchStatus =
                statusFilter === "ALL" ||
                getStatusCategory(user.status_user) ===
                statusFilter;

            const matchRole =
                roleFilter === "ALL" ||
                String(user.id_user_role) === roleFilter;

            return matchSearch && matchStatus && matchRole;
        });
    }, [
        users,
        search,
        statusFilter,
        roleFilter,
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
        setModalError("");
        setForm(emptyForm());
        setShowPassword(false);
        setShowConfirm(false);
    }, [saving]);

    const openCreate = () => {
        setSelectedUser(null);
        setForm(emptyForm());
        setModalError("");
        setShowPassword(false);
        setShowConfirm(false);
        setModal("create");
    };

    const openDetail = (user: InternalUser) => {
        setSelectedUser(user);
        setModalError("");
        setModal("detail");
    };

    const openReset = (user: InternalUser) => {
        setSelectedUser(user);
        setModalError("");
        setModal("reset");
    };

    const updateForm = (
        key: keyof UserForm,
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

        if (!form.name_user.trim()) {
            setModalError("Nama pengguna wajib diisi.");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            form.email_user.trim()
        )) {
            setModalError("Format email tidak valid.");
            return;
        }

        if (form.password_user.length < 8) {
            setModalError(
                "Password minimal 8 karakter."
            );
            return;
        }

        if (
            form.password_user !== form.confirm_password
        ) {
            setModalError(
                "Konfirmasi password tidak cocok."
            );
            return;
        }

        if (asId(form.id_user_role) === null) {
            setModalError("Role pengguna wajib dipilih.");
            return;
        }

        setSaving(true);
        setModalError("");

        try {
            await createInternalUser(form);

            let refreshSucceeded = true;

            try {
                const latest = await getAllUsers();
                setUsers(latest);
            } catch {
                refreshSucceeded = false;
            }

            setModal(null);
            setForm(emptyForm());

            setNotice(
                refreshSucceeded
                    ? "Akun internal berhasil ditambahkan."
                    : "Akun berhasil dibuat, tetapi daftar belum dapat diperbarui. Silakan klik Refresh."
            );
        } catch (error) {
            setModalError(getErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!selectedUser || saving) return;

        setSaving(true);
        setModalError("");

        try {
            await requestPasswordReset(
                selectedUser.email_user
            );

            setModal(null);
            setSelectedUser(null);

            setNotice(
                "Permintaan reset password berhasil diproses. Jika email terdaftar dan layanan email tersedia, pengguna akan menerima tautan reset."
            );
        } catch (error) {
            setModalError(getErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const refreshData = () => {
        setNotice("");
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
            {modalError}
        </div>
    ) : null;

    const renderModal = () => {
        // CREATE
        if (modal === "create") {
            return (
                <Modal
                    title="Tambah Akun Internal"
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
                                form="internal-account-form"
                                disabled={saving}
                                className={primaryButton}
                            >
                                {saving ? (
                                    <LoaderCircle
                                        size={16}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Plus size={16} />
                                )}

                                {saving
                                    ? "Menyimpan..."
                                    : "Tambah Akun"}
                            </button>
                        </>
                    }
                >
                    {modalErrorView}

                    <form
                        id="internal-account-form"
                        onSubmit={handleCreate}
                        className="space-y-5"
                    >
                        <div>
                            <label
                                htmlFor="name-user"
                                className="mb-2 block text-xs font-semibold text-slate-700"
                            >
                                Nama Lengkap *
                            </label>

                            <input
                                id="name-user"
                                value={form.name_user}
                                onChange={(event) =>
                                    updateForm(
                                        "name_user",
                                        event.target.value
                                    )
                                }
                                placeholder="Masukkan nama lengkap"
                                required
                                disabled={saving}
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="email-user"
                                className="mb-2 block text-xs font-semibold text-slate-700"
                            >
                                Email *
                            </label>

                            <input
                                id="email-user"
                                type="email"
                                autoComplete="off"
                                value={form.email_user}
                                onChange={(event) =>
                                    updateForm(
                                        "email_user",
                                        event.target.value
                                    )
                                }
                                placeholder="nama@perusahaan.com"
                                required
                                disabled={saving}
                                className={inputClass}
                            />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="role-user"
                                    className="mb-2 block text-xs font-semibold text-slate-700"
                                >
                                    Role Pengguna *
                                </label>

                                {roles.length > 0 ? (
                                    <select
                                        id="role-user"
                                        value={form.id_user_role}
                                        onChange={(event) =>
                                            updateForm(
                                                "id_user_role",
                                                event.target.value
                                            )
                                        }
                                        required
                                        disabled={saving}
                                        className={inputClass}
                                    >
                                        <option value="">
                                            Pilih Role
                                        </option>

                                        {roles.map((role) => (
                                            <option
                                                key={role.id_user_role}
                                                value={role.id_user_role}
                                            >
                                                {role.name_user_role}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        id="role-user"
                                        type="number"
                                        min={1}
                                        step={1}
                                        value={form.id_user_role}
                                        onChange={(event) =>
                                            updateForm(
                                                "id_user_role",
                                                event.target.value
                                            )
                                        }
                                        placeholder="ID role"
                                        required
                                        disabled={saving}
                                        className={inputClass}
                                    />
                                )}

                                {roles.length === 0 && (
                                    <p className="mt-1 text-xs text-amber-700">
                                        Daftar role belum tersedia.
                                        Gunakan ID role yang valid
                                        dari database.
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="status-user"
                                    className="mb-2 block text-xs font-semibold text-slate-700"
                                >
                                    Status Akun *
                                </label>

                                <select
                                    id="status-user"
                                    value={form.status_user}
                                    onChange={(event) =>
                                        updateForm(
                                            "status_user",
                                            event.target.value
                                        )
                                    }
                                    disabled={saving}
                                    className={inputClass}
                                >
                                    <option value="ACTIVE">
                                        Active
                                    </option>

                                    <option value="INACTIVE">
                                        Inactive
                                    </option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="password-user"
                                className="mb-2 block text-xs font-semibold text-slate-700"
                            >
                                Password *
                            </label>

                            <div className="relative">
                                <input
                                    id="password-user"
                                    type={
                                        showPassword
                                            ? "text"
                                            : "password"
                                    }
                                    autoComplete="new-password"
                                    value={form.password_user}
                                    onChange={(event) =>
                                        updateForm(
                                            "password_user",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Minimal 8 karakter"
                                    minLength={8}
                                    required
                                    disabled={saving}
                                    className={`${inputClass} pr-12`}
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword((value) => !value)
                                    }
                                    aria-label={
                                        showPassword
                                            ? "Sembunyikan password"
                                            : "Tampilkan password"
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400"
                                >
                                    {showPassword ? (
                                        <EyeOff size={18} />
                                    ) : (
                                        <Eye size={18} />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="confirm-password"
                                className="mb-2 block text-xs font-semibold text-slate-700"
                            >
                                Konfirmasi Password *
                            </label>

                            <div className="relative">
                                <input
                                    id="confirm-password"
                                    type={
                                        showConfirm
                                            ? "text"
                                            : "password"
                                    }
                                    autoComplete="new-password"
                                    value={form.confirm_password}
                                    onChange={(event) =>
                                        updateForm(
                                            "confirm_password",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Ulangi password"
                                    minLength={8}
                                    required
                                    disabled={saving}
                                    className={`${inputClass} pr-12`}
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowConfirm((value) => !value)
                                    }
                                    aria-label={
                                        showConfirm
                                            ? "Sembunyikan konfirmasi password"
                                            : "Tampilkan konfirmasi password"
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400"
                                >
                                    {showConfirm ? (
                                        <EyeOff size={18} />
                                    ) : (
                                        <Eye size={18} />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="rounded-lg bg-blue-50 p-3 text-xs leading-relaxed text-blue-800">
                            Akun yang dibuat akan menggunakan
                            role dan status yang dipilih.
                            Pastikan role sesuai kewenangan
                            pengguna internal.
                        </div>
                    </form>
                </Modal>
            );
        }

        // DETAIL
        if (modal === "detail" && selectedUser) {
            return (
                <Modal
                    title="Detail Akun Internal"
                    onClose={closeModal}
                    wide
                    footer={
                        <>
                            <button
                                type="button"
                                onClick={closeModal}
                                className={secondaryButton}
                            >
                                Tutup
                            </button>

                            <button
                                type="button"
                                onClick={() => openReset(selectedUser)}
                                className={primaryButton}
                            >
                                <KeyRound size={16} />
                                Reset Password
                            </button>
                        </>
                    }
                >
                    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-[#0866D8]">
                                <UserRound size={27} />
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-slate-950">
                                    {selectedUser.name_user}
                                </h3>

                                <p className="mt-1 break-all text-xs text-slate-500">
                                    {selectedUser.email_user}
                                </p>
                            </div>
                        </div>

                        <StatusBadge
                            status={selectedUser.status_user}
                        />
                    </div>

                    <section className="border-t border-slate-100 pt-5">
                        <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#00357A]">
                            <Users size={17} />
                            Informasi Akun
                        </h4>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <InfoField
                                label="ID User"
                                value={selectedUser.id_user}
                            />

                            <InfoField
                                label="Nama Lengkap"
                                value={selectedUser.name_user}
                            />

                            <InfoField
                                label="Email"
                                value={selectedUser.email_user}
                            />

                            <InfoField
                                label="Role"
                                value={roleName(
                                    selectedUser.id_user_role
                                )}
                            />

                            <InfoField
                                label="ID Role"
                                value={selectedUser.id_user_role}
                            />

                            <InfoField
                                label="Status Akun"
                                value={
                                    <StatusBadge
                                        status={selectedUser.status_user}
                                    />
                                }
                            />
                        </div>
                    </section>

                    <div className="mt-6 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
                        Password tidak ditampilkan.
                        Untuk mengatur ulang password,
                        gunakan fitur Reset Password.
                    </div>
                </Modal>
            );
        }

        // RESET PASSWORD
        if (modal === "reset" && selectedUser) {
            return (
                <Modal
                    title="Reset Password Akun?"
                    onClose={closeModal}
                    busy={saving}
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
                                type="button"
                                onClick={() => void handleReset()}
                                disabled={saving}
                                className={primaryButton}
                            >
                                {saving ? (
                                    <LoaderCircle
                                        size={16}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Mail size={16} />
                                )}

                                {saving
                                    ? "Mengirim..."
                                    : "Kirim Reset Password"}
                            </button>
                        </>
                    }
                >
                    {modalErrorView}

                    <p className="text-sm leading-relaxed text-slate-600">
                        Kirim permintaan reset password
                        untuk akun:
                    </p>

                    <div className="mt-4 rounded-lg bg-[#F5F8FC] p-4">
                        <p className="font-semibold text-slate-900">
                            {selectedUser.name_user}
                        </p>

                        <p className="mt-1 break-all text-sm text-slate-600">
                            {selectedUser.email_user}
                        </p>
                    </div>

                    <p className="mt-4 text-xs leading-relaxed text-slate-500">
                        Backend akan memproses pengiriman
                        tautan reset password ke email
                        yang terdaftar. Fitur ini tidak
                        langsung mengganti password pengguna.
                    </p>
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
                        Manajemen Pengguna / Akun Internal
                    </p>

                    <h1 className="text-2xl font-bold text-slate-950 sm:text-[28px]">
                        Akun Internal
                    </h1>

                    <p className="mt-2 text-sm text-[#526789]">
                        Kelola pendaftaran dan informasi
                        pengguna internal STIQR Hub Health.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={refreshData}
                        disabled={loading || saving}
                        className={secondaryButton}
                    >
                        <RefreshCw
                            size={16}
                            className={
                                loading ? "animate-spin" : ""
                            }
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

            {/* SUCCESS NOTICE */}
            {notice && (
                <div
                    role="status"
                    className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-700"
                >
                    <CheckCircle2 size={18} />

                    <p className="flex-1 text-sm">
                        {notice}
                    </p>

                    <button
                        type="button"
                        onClick={() => setNotice("")}
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
                        label: "Total Akun",
                        value: users.length,
                        icon: <Users size={19} />,
                    },
                    {
                        label: "Akun Active",
                        value: activeCount,
                        icon: <UserRoundCheck size={19} />,
                    },
                    {
                        label: "Akun Inactive",
                        value: inactiveCount,
                        icon: <UserRound size={19} />,
                    },
                    {
                        label: "Role Digunakan",
                        value: uniqueRoleCount,
                        icon: <ShieldCheck size={19} />,
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
                            {loading || listError
                                ? "—"
                                : stat.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* TABLE */}
            <section className="overflow-hidden rounded-2xl border border-[#DBE4F0] bg-white shadow-sm">
                {/* FILTER BAR */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
                    <div>
                        <h2 className="text-sm font-bold text-slate-950">
                            Daftar Akun Internal
                        </h2>

                        <p className="mt-1 text-xs text-[#526789]">
                            {loading
                                ? "Memuat..."
                                : `${filteredUsers.length} akun`}
                        </p>
                    </div>

                    <div className="flex w-full flex-wrap gap-2 xl:w-auto">
                        {/* SEARCH */}
                        <div className="relative min-w-47.5 flex-1 xl:w-56">
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
                                placeholder="Cari nama atau email..."
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
                            aria-label="Filter status akun"
                            className={filterClass}
                        >
                            <option value="ALL">
                                Semua Status
                            </option>

                            <option value="ACTIVE">
                                Active
                            </option>

                            <option value="INACTIVE">
                                Inactive
                            </option>

                            <option value="OTHER">
                                Lainnya
                            </option>
                        </select>

                        {/* ROLE FILTER */}
                        <select
                            value={roleFilter}
                            onChange={(event) => {
                                setRoleFilter(event.target.value);
                                setPage(1);
                            }}
                            aria-label="Filter role"
                            className={filterClass}
                        >
                            <option value="ALL">
                                Semua Role
                            </option>

                            {roleOptions.map((roleId) => (
                                <option
                                    key={roleId}
                                    value={roleId}
                                >
                                    {roleName(roleId)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* TABLE CONTENT */}
                {loading ? (
                    <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-500">
                        <LoaderCircle
                            size={18}
                            className="animate-spin text-[#0866D8]"
                        />
                        Memuat data akun...
                    </div>
                ) : listError ? (
                    <div
                        role="alert"
                        className="flex items-start gap-2 p-5 text-sm text-red-600"
                    >
                        <AlertCircle
                            size={18}
                            className="shrink-0"
                        />
                        {listError}
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="flex min-h-40 flex-col items-center justify-center gap-3 p-6 text-center">
                        <Users
                            size={30}
                            className="text-slate-300"
                        />
                        <p className="text-sm text-slate-500">
                            Akun internal tidak ditemukan.
                        </p>
                    </div>
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
                                        Email
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        Role
                                    </th>

                                    <th className="px-5 py-3 text-center text-xs font-semibold text-[#344F77]">
                                        Status
                                    </th>

                                    <th className="px-5 py-3 text-center text-xs font-semibold text-[#344F77]">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {displayedUsers.map((user, index) => (
                                    <tr
                                        key={user.id_user}
                                        className="border-t border-slate-100 hover:bg-slate-50"
                                    >
                                        {/* NUMBER */}
                                        <td className="px-5 py-4 text-slate-500">
                                            {(currentPage - 1) *
                                                PAGE_SIZE +
                                                index +
                                                1}
                                        </td>

                                        {/* USER */}
                                        <td className="px-5 py-4">
                                            <div className="flex min-w-43.75 items-center gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0866D8]">
                                                    <UserRound size={19} />
                                                </div>

                                                <div>
                                                    <p className="font-semibold text-slate-950">
                                                        {user.name_user || "—"}
                                                    </p>

                                                    <p className="mt-1 text-xs text-slate-500">
                                                        ID: {user.id_user}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* EMAIL */}
                                        <td className="px-5 py-4">
                                            <span className="break-all text-slate-600">
                                                {user.email_user || "—"}
                                            </span>
                                        </td>

                                        {/* ROLE */}
                                        <td className="px-5 py-4 text-slate-700">
                                            {roleName(user.id_user_role)}
                                        </td>

                                        {/* STATUS */}
                                        <td className="px-5 py-4 text-center">
                                            <StatusBadge
                                                status={user.status_user}
                                            />
                                        </td>

                                        {/* ACTIONS */}
                                        <td className="px-5 py-4">
                                            <div className="flex min-w-max items-center justify-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openDetail(user)}
                                                    title="Detail Akun"
                                                    aria-label={`Detail akun ${user.name_user}`}
                                                    className={`${iconButtonClass} bg-blue-50 text-[#0866D8] hover:bg-blue-100`}
                                                >
                                                    <Eye size={18} />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => openReset(user)}
                                                    title="Reset Password"
                                                    aria-label={`Reset password akun ${user.name_user}`}
                                                    className={`${iconButtonClass} bg-amber-50 text-amber-600 hover:bg-amber-100`}
                                                >
                                                    <KeyRound size={18} />
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

export default InternalAccount;
