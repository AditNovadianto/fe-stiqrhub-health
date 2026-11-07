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
    LoaderCircle,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Shield,
    ShieldCheck,
    Trash2,
    Users,
    X,
} from "lucide-react";

const PAGE_SIZE = 10;

type ApiRecord = Record<string, unknown>;

type ModalType =
    | "create"
    | "detail"
    | "edit"
    | "delete"
    | null;

interface ProviderRoleData {
    id_provider_role: number;
    name_provider_role: string;
}

interface ModalProps {
    title: string;
    children: ReactNode;
    footer?: ReactNode;
    onClose: () => void;
    busy?: boolean;
}

interface StatCardProps {
    title: string;
    value: number | string;
    description: string;
    icon: ReactNode;
}

interface Toast {
    type: "success" | "error";
    message: string;
}

const primaryButton =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#0866D8] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#DBE4F0] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

const dangerButton =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50";

const inputClass =
    "w-full rounded-lg border border-[#DBE4F0] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-[#0866D8] focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50";

const actionButton =
    "flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const isRecord = (
    value: unknown
): value is ApiRecord =>
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value);

const asId = (
    value: unknown
): number | null => {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const number = Number(value);

    return Number.isSafeInteger(number) &&
        number > 0
        ? number
        : null;
};

const getErrorMessage = (
    error: unknown
): string =>
    error instanceof Error
        ? error.message
        : "Terjadi kesalahan. Silakan coba kembali.";

const getToken = (): string | null =>
    sessionStorage.getItem("admin_token") ??
    localStorage.getItem("admin_token");

const normalizeRole = (
    row: ApiRecord
): ProviderRoleData | null => {
    const id = asId(
        row.id_provider_role
    );

    if (id === null) {
        return null;
    }

    return {
        id_provider_role: id,
        name_provider_role: String(
            row.name_provider_role ?? ""
        ),
    };
};

const apiRequest = async (
    endpoint: string,
    options: RequestInit = {},
    requireAuth = true
): Promise<unknown> => {
    const headers = new Headers(
        options.headers
    );

    headers.set(
        "Accept",
        "application/json"
    );

    if (options.body) {
        headers.set(
            "Content-Type",
            "application/json"
        );
    }

    if (requireAuth) {
        const token = getToken();

        if (!token) {
            throw new Error(
                "Token admin tidak ditemukan. Silakan login kembali."
            );
        }

        headers.set(
            "Authorization",
            `Bearer ${token}`
        );
    }

    const response = await fetch(
        `${import.meta.env.VITE_API_URI}${endpoint}`,
        {
            ...options,
            headers,
        }
    );

    const contentType =
        response.headers.get(
            "content-type"
        ) ?? "";

    let payload: unknown;

    if (
        contentType.includes(
            "application/json"
        )
    ) {
        payload = await response.json();
    } else {
        payload = await response.text();
    }

    if (!response.ok) {
        const serverMessage =
            isRecord(payload) &&
                typeof payload.message === "string"
                ? payload.message
                : "";

        throw new Error(
            serverMessage ||
            (
                response.status === 401
                    ? "Sesi login tidak valid atau telah berakhir."
                    : response.status === 403
                        ? "Anda tidak memiliki izin untuk melakukan tindakan ini."
                        : response.status === 404
                            ? "Endpoint atau provider role tidak ditemukan."
                            : response.status === 409
                                ? "Terjadi konflik data. Periksa penggunaan atau nama role."
                                : `Request gagal (HTTP ${response.status}).`
            )
        );
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

const unwrapData = (
    payload: unknown
): unknown => {
    if (!isRecord(payload)) {
        return payload;
    }

    return "data" in payload
        ? payload.data
        : payload;
};

const parseRoleList = (
    payload: unknown
): ProviderRoleData[] => {
    const data = unwrapData(
        payload
    );

    if (!Array.isArray(data)) {
        throw new Error(
            "Format respons daftar provider roles tidak valid."
        );
    }

    if (!data.every(isRecord)) {
        throw new Error(
            "Data provider roles memiliki format tidak valid."
        );
    }

    return data
        .map(normalizeRole)
        .filter(
            (
                role
            ): role is ProviderRoleData =>
                role !== null
        );
};

const parseRoleDetail = (
    payload: unknown
): ProviderRoleData => {
    const data = unwrapData(
        payload
    );

    if (!isRecord(data)) {
        throw new Error(
            "Format respons detail provider role tidak valid."
        );
    }

    const role = normalizeRole(
        data
    );

    if (!role) {
        throw new Error(
            "Data provider role tidak valid."
        );
    }

    return role;
};

// GET /provider-role/get-all
const getAllProviderRoles = async (
    signal?: AbortSignal
): Promise<ProviderRoleData[]> => {
    const result = await apiRequest(
        "/provider-role/get-all",
        { signal },
        false
    );

    return parseRoleList(
        result
    );
};

// GET /provider-role/:id
const getProviderRoleById = async (
    id: number,
    signal?: AbortSignal
): Promise<ProviderRoleData> => {
    const result = await apiRequest(
        `/provider-role/${id}`,
        { signal },
        false
    );

    return parseRoleDetail(
        result
    );
};

// POST /provider-role/create
const createProviderRole = async (
    name: string
): Promise<unknown> => {
    return apiRequest(
        "/provider-role/create",
        {
            method: "POST",
            body: JSON.stringify({
                name_provider_role:
                    name.trim(),
            }),
        }
    );
};

// PATCH /provider-role/:id
const updateProviderRole = async (
    id: number,
    name: string
): Promise<unknown> => {
    return apiRequest(
        `/provider-role/${id}`,
        {
            method: "PATCH",
            body: JSON.stringify({
                name_provider_role:
                    name.trim(),
            }),
        }
    );
};

// DELETE /provider-role/:id
const deleteProviderRole = async (
    id: number
): Promise<unknown> => {
    return apiRequest(
        `/provider-role/${id}`,
        {
            method: "DELETE",
        }
    );
};

const StatCard = ({
    title,
    value,
    description,
    icon,
}: StatCardProps) => {
    return (
        <div className="rounded-2xl border border-[#DBE4F0] bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-[#526789]">
                {icon}

                <span className="text-xs font-semibold">
                    {title}
                </span>
            </div>

            <p className="text-3xl font-bold text-slate-950">
                {value}
            </p>

            <p className="mt-2 text-xs text-[#526789]">
                {description}
            </p>
        </div>
    );
};

const Modal = ({
    title,
    children,
    footer,
    onClose,
    busy = false,
}: ModalProps) => {
    useEffect(() => {
        const handleEscape = (
            event: KeyboardEvent
        ) => {
            if (
                event.key === "Escape" &&
                !busy
            ) {
                onClose();
            }
        };

        document.addEventListener(
            "keydown",
            handleEscape
        );

        return () => {
            document.removeEventListener(
                "keydown",
                handleEscape
            );
        };
    }, [
        onClose,
        busy,
    ]);

    return (
        <div
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4"
            onMouseDown={(event) => {
                if (
                    event.target ===
                    event.currentTarget &&
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
                className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                style={{
                    maxHeight: "90dvh",
                }}
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

                {/* BODY */}
                <div className="min-h-0 flex-1 overflow-y-auto p-5">
                    {children}
                </div>

                {/* FOOTER */}
                {footer && (
                    <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

const ProviderRole = () => {
    const [roles, setRoles] =
        useState<ProviderRoleData[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [
        detailLoading,
        setDetailLoading,
    ] = useState(false);

    const [
        detailFailed,
        setDetailFailed,
    ] = useState(false);

    const [
        refreshKey,
        setRefreshKey,
    ] = useState(0);

    const [
        listError,
        setListError,
    ] = useState("");

    const [
        modalError,
        setModalError,
    ] = useState("");

    const [
        toast,
        setToast,
    ] = useState<Toast | null>(
        null
    );

    const [
        modal,
        setModal,
    ] = useState<ModalType>(
        null
    );

    const [
        selectedRole,
        setSelectedRole,
    ] = useState<ProviderRoleData | null>(
        null
    );

    const [
        roleName,
        setRoleName,
    ] = useState("");

    const [
        search,
        setSearch,
    ] = useState("");

    const [
        page,
        setPage,
    ] = useState(1);

    useEffect(() => {
        const controller =
            new AbortController();

        const loadData = async () => {
            setLoading(true);
            setListError("");

            try {
                const result =
                    await getAllProviderRoles(
                        controller.signal
                    );

                if (
                    controller.signal.aborted
                ) {
                    return;
                }

                setRoles(result);
            } catch (error) {
                if (
                    controller.signal.aborted
                ) {
                    return;
                }

                setRoles([]);

                setListError(
                    getErrorMessage(error)
                );
            } finally {
                if (
                    !controller.signal.aborted
                ) {
                    setLoading(false);
                }
            }
        };

        void loadData();

        return () => {
            controller.abort();
        };
    }, [refreshKey]);

    const filteredRoles = useMemo(() => {
        const keyword = search
            .trim()
            .toLowerCase();

        return roles.filter(
            (role) => {
                return [
                    role.name_provider_role,
                    String(
                        role.id_provider_role
                    ),
                ].some((value) =>
                    value
                        .toLowerCase()
                        .includes(keyword)
                );
            }
        );
    }, [
        roles,
        search,
    ]);

    const totalPages = Math.max(
        1,
        Math.ceil(
            filteredRoles.length /
            PAGE_SIZE
        )
    );

    const currentPage = Math.min(
        page,
        totalPages
    );

    const displayedRoles =
        filteredRoles.slice(
            (currentPage - 1) *
            PAGE_SIZE,

            currentPage *
            PAGE_SIZE
        );

    const closeModal =
        useCallback(() => {
            if (saving) {
                return;
            }

            setModal(null);
            setSelectedRole(null);
            setRoleName("");
            setModalError("");
            setDetailLoading(false);
            setDetailFailed(false);
        }, [saving]);

    const openCreate = () => {
        setSelectedRole(null);
        setRoleName("");
        setModalError("");
        setDetailFailed(false);
        setModal("create");
    };

    const openDetail = (
        role: ProviderRoleData
    ) => {
        setSelectedRole(role);
        setRoleName("");
        setModalError("");
        setDetailFailed(false);
        setModal("detail");
    };

    const openEdit = (
        role: ProviderRoleData
    ) => {
        setSelectedRole(role);

        setRoleName(
            role.name_provider_role
        );

        setModalError("");
        setDetailFailed(false);
        setModal("edit");
    };

    const openDelete = (
        role: ProviderRoleData
    ) => {
        setSelectedRole(role);
        setModalError("");
        setDetailFailed(false);
        setModal("delete");
    };

    const selectedRoleId =
        selectedRole?.id_provider_role ??
        null;

    useEffect(() => {
        if (
            modal !== "detail" &&
            modal !== "edit"
        ) {
            return;
        }

        if (
            selectedRoleId === null
        ) {
            return;
        }

        const controller =
            new AbortController();

        const loadDetail = async () => {
            setDetailLoading(true);
            setDetailFailed(false);
            setModalError("");

            try {
                const result =
                    await getProviderRoleById(
                        selectedRoleId,
                        controller.signal
                    );

                if (
                    controller.signal.aborted
                ) {
                    return;
                }

                setSelectedRole(result);

                if (
                    modal === "edit"
                ) {
                    setRoleName(
                        result.name_provider_role
                    );
                }
            } catch (error) {
                if (
                    controller.signal.aborted
                ) {
                    return;
                }

                setDetailFailed(true);
                setModalError(
                    getErrorMessage(error)
                );
            } finally {
                if (
                    !controller.signal.aborted
                ) {
                    setDetailLoading(false);
                }
            }
        };

        void loadDetail();

        return () => {
            controller.abort();
        };
    }, [
        modal,
        selectedRoleId,
    ]);

    const validateRoleName =
        (): string | null => {
            const name = roleName.trim();

            if (!name) {
                return "Nama provider role wajib diisi.";
            }

            const duplicate =
                roles.some((role) => {
                    const sameName =
                        role.name_provider_role
                            .trim()
                            .toLowerCase() ===
                        name.toLowerCase();

                    const differentRole =
                        modal !== "edit" ||
                        role.id_provider_role !==
                        selectedRole?.id_provider_role;

                    return (
                        sameName &&
                        differentRole
                    );
                });

            if (duplicate) {
                return "Nama provider role sudah digunakan.";
            }

            return null;
        };

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (
            saving ||
            detailLoading
        ) {
            return;
        }

        if (
            modal !== "create" &&
            modal !== "edit"
        ) {
            return;
        }

        const validationError =
            validateRoleName();

        if (
            validationError
        ) {
            setModalError(
                validationError
            );

            return;
        }

        if (
            modal === "edit" &&
            !selectedRole
        ) {
            setModalError(
                "Provider role tidak ditemukan."
            );

            return;
        }

        const isCreate =
            modal === "create";

        setSaving(true);
        setModalError("");

        try {
            if (isCreate) {
                await createProviderRole(
                    roleName
                );
            } else if (
                selectedRole
            ) {
                await updateProviderRole(
                    selectedRole.id_provider_role,
                    roleName
                );
            }

            setModal(null);
            setSelectedRole(null);
            setRoleName("");

            setToast({
                type: "success",
                message: isCreate
                    ? "Provider role berhasil ditambahkan."
                    : "Provider role berhasil diperbarui.",
            });

            setRefreshKey(
                (value) => value + 1
            );
        } catch (error) {
            setModalError(
                getErrorMessage(error)
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete =
        async () => {
            if (
                !selectedRole ||
                saving
            ) {
                return;
            }

            const deletedName =
                selectedRole.name_provider_role;

            setSaving(true);
            setModalError("");

            try {
                await deleteProviderRole(
                    selectedRole.id_provider_role
                );

                setModal(null);
                setSelectedRole(null);

                setToast({
                    type: "success",
                    message:
                        `Provider role "${deletedName}" berhasil dihapus.`,
                });

                setPage(1);

                setRefreshKey(
                    (value) => value + 1
                );
            } catch (error) {
                setModalError(
                    getErrorMessage(error)
                );
            } finally {
                setSaving(false);
            }
        };

    const refreshData = () => {
        setToast(null);

        setRefreshKey(
            (value) => value + 1
        );
    };

    const modalErrorView =
        modalError ? (
            <div
                role="alert"
                className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
            >
                <AlertCircle
                    size={16}
                    className="shrink-0"
                />

                <span>
                    {modalError}
                </span>
            </div>
        ) : null;

    const renderModal = () => {
        if (
            modal === "create" ||
            modal === "edit"
        ) {
            const isEdit =
                modal === "edit";

            return (
                <Modal
                    title={
                        isEdit
                            ? "Edit Provider Role"
                            : "Tambah Provider Role"
                    }
                    onClose={closeModal}
                    busy={
                        saving ||
                        detailLoading
                    }
                    footer={
                        <>
                            <button
                                type="button"
                                onClick={closeModal}
                                disabled={
                                    saving ||
                                    detailLoading
                                }
                                className={
                                    secondaryButton
                                }
                            >
                                Batal
                            </button>

                            <button
                                type="submit"
                                form="provider-role-form"
                                disabled={
                                    saving ||
                                    detailLoading ||
                                    detailFailed ||
                                    !roleName.trim()
                                }
                                className={
                                    primaryButton
                                }
                            >
                                {saving ? (
                                    <LoaderCircle
                                        size={16}
                                        className="animate-spin"
                                    />
                                ) : isEdit ? (
                                    <Pencil
                                        size={16}
                                    />
                                ) : (
                                    <Plus
                                        size={16}
                                    />
                                )}

                                {saving
                                    ? "Menyimpan..."
                                    : isEdit
                                        ? "Simpan Perubahan"
                                        : "Tambah Role"}
                            </button>
                        </>
                    }
                >
                    {modalErrorView}

                    {detailLoading && (
                        <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
                            <LoaderCircle
                                size={15}
                                className="animate-spin"
                            />

                            Memuat detail provider role...
                        </div>
                    )}

                    <form
                        id="provider-role-form"
                        onSubmit={
                            handleSubmit
                        }
                        className="space-y-5"
                    >
                        {isEdit &&
                            selectedRole && (
                                <div className="rounded-xl bg-blue-50 p-4">
                                    <p className="text-xs text-[#526789]">
                                        ID Provider Role
                                    </p>

                                    <p className="mt-1 text-sm font-semibold text-[#00357A]">
                                        {
                                            selectedRole.id_provider_role
                                        }
                                    </p>
                                </div>
                            )}

                        <div>
                            <label
                                htmlFor="name_provider_role"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                                Nama Provider Role
                                <span className="ml-1 text-red-500">
                                    *
                                </span>
                            </label>

                            <input
                                id="name_provider_role"
                                name="name_provider_role"
                                value={
                                    roleName
                                }
                                onChange={(
                                    event
                                ) => {
                                    setRoleName(
                                        event.target.value
                                    );

                                    if (modalError) {
                                        setModalError("");
                                    }
                                }}
                                placeholder="Contoh: ADMIN"
                                required
                                autoFocus
                                disabled={
                                    saving ||
                                    detailLoading ||
                                    detailFailed
                                }
                                className={
                                    inputClass
                                }
                            />

                            <p className="mt-2 text-xs text-slate-500">
                                Nama role akan digunakan
                                untuk mengelompokkan hak akses
                                pengguna provider.
                            </p>
                        </div>

                        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                            <div className="flex items-start gap-3">
                                <ShieldCheck
                                    size={19}
                                    className="mt-0.5 shrink-0 text-[#0866D8]"
                                />

                                <p className="text-xs leading-relaxed text-blue-800">
                                    {isEdit
                                        ? "Perubahan nama provider role dapat memengaruhi aturan akses yang menggunakan nama role. Pastikan perubahan sesuai dengan kebutuhan sistem."
                                        : "Provider role baru dapat digunakan pada akun provider user setelah role berhasil ditambahkan."}
                                </p>
                            </div>
                        </div>
                    </form>
                </Modal>
            );
        }

        if (
            modal === "detail" &&
            selectedRole
        ) {
            return (
                <Modal
                    title="Detail Provider Role"
                    onClose={closeModal}
                    busy={
                        detailLoading
                    }
                    footer={
                        <>
                            <button
                                type="button"
                                onClick={closeModal}
                                disabled={
                                    detailLoading
                                }
                                className={
                                    secondaryButton
                                }
                            >
                                Tutup
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    openEdit(
                                        selectedRole
                                    )
                                }
                                disabled={
                                    detailLoading ||
                                    detailFailed
                                }
                                className={
                                    primaryButton
                                }
                            >
                                <Pencil
                                    size={16}
                                />

                                Edit Role
                            </button>
                        </>
                    }
                >
                    {modalErrorView}

                    {detailLoading && (
                        <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
                            <LoaderCircle
                                size={15}
                                className="animate-spin"
                            />

                            Memuat detail provider role...
                        </div>
                    )}

                    <div className="mb-6 flex items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0866D8]">
                            <Shield
                                size={27}
                            />
                        </div>

                        <div>
                            <p className="text-xs text-slate-500">
                                Provider Role
                            </p>

                            <h3 className="mt-1 text-lg font-bold text-slate-950">
                                {
                                    selectedRole.name_provider_role
                                }
                            </h3>
                        </div>
                    </div>

                    <div className="space-y-5 border-t border-slate-100 pt-5">
                        <div>
                            <p className="text-xs text-[#526789]">
                                ID Provider Role
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-900">
                                {
                                    selectedRole.id_provider_role
                                }
                            </p>
                        </div>

                        <div>
                            <p className="text-xs text-[#526789]">
                                Nama Provider Role
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-900">
                                {
                                    selectedRole.name_provider_role
                                }
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 rounded-xl bg-blue-50 p-4">
                        <p className="text-xs leading-relaxed text-blue-800">
                            Role ini dapat digunakan untuk
                            menentukan jenis akun dan hak
                            akses pengguna provider.
                        </p>
                    </div>
                </Modal>
            );
        }

        if (
            modal === "delete" &&
            selectedRole
        ) {
            return (
                <Modal
                    title="Hapus Provider Role"
                    onClose={closeModal}
                    busy={saving}
                    footer={
                        <>
                            <button
                                type="button"
                                onClick={closeModal}
                                disabled={saving}
                                className={
                                    secondaryButton
                                }
                            >
                                Batal
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    void handleDelete()
                                }
                                disabled={saving}
                                className={
                                    dangerButton
                                }
                            >
                                {saving ? (
                                    <LoaderCircle
                                        size={16}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Trash2
                                        size={16}
                                    />
                                )}

                                {saving
                                    ? "Menghapus..."
                                    : "Ya, Hapus Role"}
                            </button>
                        </>
                    }
                >
                    {modalErrorView}

                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                        <Trash2
                            size={25}
                        />
                    </div>

                    <p className="text-sm leading-relaxed text-slate-600">
                        Apakah kamu yakin ingin
                        menghapus provider role berikut?
                    </p>

                    <div className="mt-4 rounded-xl bg-[#F5F8FC] p-4">
                        <p className="text-xs text-slate-500">
                            Provider Role
                        </p>

                        <p className="mt-2 text-base font-bold text-slate-950">
                            {
                                selectedRole.name_provider_role
                            }
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                            ID:{" "}
                            {
                                selectedRole.id_provider_role
                            }
                        </p>
                    </div>

                    <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <AlertCircle
                            size={17}
                            className="shrink-0 text-amber-600"
                        />

                        <p className="text-xs leading-relaxed text-amber-800">
                            Provider role tidak dapat
                            dihapus apabila masih
                            digunakan oleh provider user.
                            Backend akan menolak
                            penghapusan tersebut
                            dengan HTTP 409.
                        </p>
                    </div>
                </Modal>
            );
        }

        return null;
    };

    return (
        <div className="min-h-full p-4 sm:p-6 lg:p-8">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="mb-1 text-xs text-[#344F77]">
                        Manajemen Pengguna / Provider Roles
                    </p>

                    <h1 className="text-2xl font-bold text-slate-950 sm:text-[28px]">
                        Provider Roles
                    </h1>

                    <p className="mt-2 text-sm text-[#526789]">
                        Kelola daftar role yang
                        digunakan oleh akun provider
                        STIQR Hub Health.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {/* REFRESH */}
                    <button
                        type="button"
                        onClick={refreshData}
                        disabled={
                            loading ||
                            saving
                        }
                        className={
                            secondaryButton
                        }
                    >
                        <RefreshCw
                            size={16}
                            className={
                                loading
                                    ? "animate-spin"
                                    : ""
                            }
                        />

                        Refresh
                    </button>

                    {/* ADD ROLE */}
                    <button
                        type="button"
                        onClick={openCreate}
                        disabled={saving}
                        className={
                            primaryButton
                        }
                    >
                        <Plus
                            size={17}
                        />

                        Tambah Role
                    </button>
                </div>
            </div>

            {toast && (
                <div
                    role={
                        toast.type === "error"
                            ? "alert"
                            : "status"
                    }
                    className={`mb-5 flex items-start gap-3 rounded-xl border p-3 ${toast.type === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-700"
                        }`}
                >
                    {toast.type === "success" ? (
                        <CheckCircle2
                            size={18}
                            className="shrink-0"
                        />
                    ) : (
                        <AlertCircle
                            size={18}
                            className="shrink-0"
                        />
                    )}

                    <p className="flex-1 text-sm">
                        {toast.message}
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            setToast(null)
                        }
                        aria-label="Tutup notifikasi"
                        className="cursor-pointer"
                    >
                        <X
                            size={17}
                        />
                    </button>
                </div>
            )}

            <div className="mb-5 grid grid-cols-2 gap-4">
                <StatCard
                    title="Total Provider Roles"
                    value={
                        loading ||
                            listError
                            ? "—"
                            : roles.length
                    }
                    description="Jumlah provider role terdaftar"
                    icon={
                        <ShieldCheck
                            size={19}
                        />
                    }
                />

                <StatCard
                    title="Role Tampil"
                    value={
                        loading ||
                            listError
                            ? "—"
                            : filteredRoles.length
                    }
                    description="Jumlah role sesuai pencarian"
                    icon={
                        <Users
                            size={19}
                        />
                    }
                />
            </div>

            <section className="overflow-hidden rounded-2xl border border-[#DBE4F0] bg-white shadow-sm">
                {/* TABLE HEADER */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
                    <div>
                        <h2 className="text-sm font-bold text-slate-950">
                            Daftar Provider Roles
                        </h2>

                        <p className="mt-1 text-xs text-[#526789]">
                            {loading
                                ? "Memuat..."
                                : `${filteredRoles.length} data role`}
                        </p>
                    </div>

                    {/* SEARCH */}
                    <div className="relative w-full sm:w-72">
                        <Search
                            size={17}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                            type="text"
                            value={search}
                            onChange={(event) => {
                                setSearch(
                                    event.target.value
                                );

                                setPage(1);
                            }}
                            placeholder="Cari nama atau ID role..."
                            className={`${inputClass} pl-10`}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex min-h-44 items-center justify-center gap-2 text-sm text-slate-500">
                        <LoaderCircle
                            size={19}
                            className="animate-spin text-[#0866D8]"
                        />

                        Memuat data provider roles...
                    </div>
                ) : listError ? (
                    <div
                        role="alert"
                        className="flex flex-col items-center justify-center gap-3 p-8 text-center"
                    >
                        <AlertCircle
                            size={28}
                            className="text-red-500"
                        />

                        <p className="text-sm text-red-600">
                            {listError}
                        </p>

                        <button
                            type="button"
                            onClick={refreshData}
                            className={
                                secondaryButton
                            }
                        >
                            <RefreshCw
                                size={15}
                            />

                            Coba Lagi
                        </button>
                    </div>
                ) : filteredRoles.length === 0 ? (
                    <div className="flex min-h-44 flex-col items-center justify-center gap-3 p-6 text-center">
                        <Shield
                            size={30}
                            className="text-slate-300"
                        />

                        <p className="text-sm text-slate-500">
                            {search
                                ? "Provider role tidak ditemukan."
                                : "Belum ada provider role."}
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
                                        ID Role
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        Nama Provider Role
                                    </th>

                                    <th className="px-5 py-3 text-center text-xs font-semibold text-[#344F77]">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {displayedRoles.map(
                                    (
                                        role,
                                        index
                                    ) => (
                                        <tr
                                            key={
                                                role.id_provider_role
                                            }
                                            className="border-t border-slate-100 transition-colors hover:bg-slate-50"
                                        >
                                            {/* NUMBER */}
                                            <td className="px-5 py-4 text-slate-500">
                                                {(currentPage - 1) *
                                                    PAGE_SIZE +
                                                    index +
                                                    1}
                                            </td>

                                            {/* ROLE ID */}
                                            <td className="px-5 py-4">
                                                <span className="font-medium text-slate-700">
                                                    {
                                                        role.id_provider_role
                                                    }
                                                </span>
                                            </td>

                                            {/* ROLE NAME */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0866D8]">
                                                        <Shield
                                                            size={19}
                                                        />
                                                    </div>

                                                    <div>
                                                        <p className="font-semibold text-slate-950">
                                                            {
                                                                role.name_provider_role
                                                            }
                                                        </p>

                                                        <p className="mt-1 text-xs text-slate-500">
                                                            Provider User Role
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* ACTIONS */}
                                            <td className="px-5 py-4">
                                                <div className="flex min-w-max items-center justify-center gap-2">
                                                    {/* DETAIL */}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openDetail(
                                                                role
                                                            )
                                                        }
                                                        title="Detail Role"
                                                        aria-label={`Detail provider role ${role.name_provider_role}`}
                                                        className={`${actionButton} bg-blue-50 text-[#0866D8] hover:bg-blue-100`}
                                                    >
                                                        <Eye
                                                            size={18}
                                                        />
                                                    </button>

                                                    {/* EDIT */}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openEdit(
                                                                role
                                                            )
                                                        }
                                                        title="Edit Role"
                                                        aria-label={`Edit provider role ${role.name_provider_role}`}
                                                        className={`${actionButton} bg-amber-50 text-amber-600 hover:bg-amber-100`}
                                                    >
                                                        <Pencil
                                                            size={17}
                                                        />
                                                    </button>

                                                    {/* DELETE */}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openDelete(
                                                                role
                                                            )
                                                        }
                                                        title="Hapus Role"
                                                        aria-label={`Hapus provider role ${role.name_provider_role}`}
                                                        className={`${actionButton} bg-red-50 text-red-600 hover:bg-red-100`}
                                                    >
                                                        <Trash2
                                                            size={17}
                                                        />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading &&
                    !listError &&
                    filteredRoles.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
                            <p className="text-xs text-[#526789]">
                                Menampilkan{" "}
                                {(currentPage - 1) *
                                    PAGE_SIZE +
                                    1}
                                –
                                {Math.min(
                                    currentPage *
                                    PAGE_SIZE,
                                    filteredRoles.length
                                )}{" "}
                                dari{" "}
                                {
                                    filteredRoles.length
                                }
                            </p>

                            <div className="flex items-center gap-3">
                                {/* PREVIOUS */}
                                <button
                                    type="button"
                                    disabled={
                                        currentPage === 1
                                    }
                                    onClick={() =>
                                        setPage(
                                            (value) =>
                                                Math.max(
                                                    1,
                                                    value - 1
                                                )
                                        )
                                    }
                                    aria-label="Halaman sebelumnya"
                                    className="cursor-pointer rounded-lg border border-[#DBE4F0] p-2 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <ChevronLeft
                                        size={17}
                                    />
                                </button>

                                {/* PAGE */}
                                <span className="text-xs font-semibold text-slate-700">
                                    {currentPage}
                                    {" / "}
                                    {totalPages}
                                </span>

                                {/* NEXT */}
                                <button
                                    type="button"
                                    disabled={
                                        currentPage >=
                                        totalPages
                                    }
                                    onClick={() =>
                                        setPage(
                                            (value) =>
                                                Math.min(
                                                    totalPages,
                                                    value + 1
                                                )
                                        )
                                    }
                                    aria-label="Halaman berikutnya"
                                    className="cursor-pointer rounded-lg border border-[#DBE4F0] p-2 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <ChevronRight
                                        size={17}
                                    />
                                </button>
                            </div>
                        </div>
                    )}
            </section>

            {renderModal()}
        </div>
    );
};

export default ProviderRole;
