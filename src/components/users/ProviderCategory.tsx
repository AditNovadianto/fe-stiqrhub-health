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
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Eye,
    Layers3,
    LoaderCircle,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Tag,
    Trash2,
    X,
} from "lucide-react";

const PAGE_SIZE = 10;

type ApiRecord = Record<string, unknown>;
type CategoryStatus = "ACTIVE" | "INACTIVE" | "UNKNOWN";

type ModalType =
    | "create"
    | "detail"
    | "edit"
    | "delete"
    | null;

interface ProviderCategoryData {
    id_provider_category: number;
    name_provider_category: string;
    description_provider_category: string;
    status_provider_category: CategoryStatus;
}

interface CategoryForm {
    name_provider_category: string;
    description_provider_category: string;
    status_provider_category: "ACTIVE" | "INACTIVE";
}

interface Notice {
    type: "success" | "error";
    message: string;
}

interface ModalProps {
    title: string;
    children: ReactNode;
    footer?: ReactNode;
    onClose: () => void;
    busy?: boolean;
    wide?: boolean;
}

const primaryButton =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#0866D8] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#DBE4F0] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

const dangerButton =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50";

const inputClass =
    "w-full rounded-lg border border-[#DBE4F0] bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-[#0866D8] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50";

const emptyForm = (): CategoryForm => ({
    name_provider_category: "",
    description_provider_category: "",
    status_provider_category: "ACTIVE",
});

const isRecord = (value: unknown): value is ApiRecord =>
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value);

const textValue = (value: unknown): string =>
    value === null || value === undefined
        ? ""
        : String(value);

const idValue = (value: unknown): number | null => {
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

const statusValue = (value: unknown): CategoryStatus => {
    const status = textValue(value).trim().toUpperCase();

    if (status === "ACTIVE") return "ACTIVE";
    if (status === "INACTIVE") return "INACTIVE";

    return "UNKNOWN";
};

const getErrorMessage = (error: unknown): string =>
    error instanceof Error
        ? error.message
        : "Terjadi kesalahan. Silakan coba kembali.";

const getToken = (): string | null =>
    sessionStorage.getItem("admin_token") ??
    localStorage.getItem("admin_token");

const clearSession = () => {
    ["admin_token", "admin_user", "admin_role"].forEach(
        (key) => {
            sessionStorage.removeItem(key);
            localStorage.removeItem(key);
        }
    );
};

const extractArray = (
    payload: unknown,
    keys: string[],
    depth = 0
): ApiRecord[] => {
    if (Array.isArray(payload)) {
        if (!payload.every(isRecord)) {
            throw new Error("Format daftar kategori tidak valid.");
        }

        return payload;
    }

    if (!isRecord(payload) || depth > 5) {
        throw new Error("Format response API tidak valid.");
    }

    if (payload.success === false) {
        throw new Error(
            typeof payload.message === "string"
                ? payload.message
                : "Gagal mengambil data kategori."
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
                // Coba struktur response berikutnya.
            }
        }
    }

    throw new Error("Daftar kategori tidak ditemukan.");
};

const extractObject = (
    payload: unknown,
    depth = 0
): ApiRecord => {
    if (!isRecord(payload) || depth > 5) {
        throw new Error("Format detail kategori tidak valid.");
    }

    if (payload.success === false) {
        throw new Error(
            typeof payload.message === "string"
                ? payload.message
                : "Gagal mengambil detail kategori."
        );
    }

    if (idValue(payload.id_provider_category) !== null) {
        return payload;
    }

    for (const key of [
        "provider_category",
        "providerCategory",
        "category",
        "data",
    ]) {
        if (isRecord(payload[key])) {
            try {
                return extractObject(payload[key], depth + 1);
            } catch {
                // Coba field berikutnya.
            }
        }
    }

    throw new Error("Detail kategori tidak ditemukan.");
};

const normalizeCategory = (
    row: ApiRecord
): ProviderCategoryData | null => {
    const id = idValue(row.id_provider_category);

    if (id === null) return null;

    return {
        id_provider_category: id,
        name_provider_category: textValue(
            row.name_provider_category
        ),
        description_provider_category: textValue(
            row.description_provider_category
        ),
        status_provider_category: statusValue(
            row.status_provider_category
        ),
    };
};

const categoryToForm = (
    category: ProviderCategoryData
): CategoryForm => ({
    name_provider_category:
        category.name_provider_category,
    description_provider_category:
        category.description_provider_category,
    status_provider_category:
        category.status_provider_category === "INACTIVE"
            ? "INACTIVE"
            : "ACTIVE",
});

class UnauthorizedError extends Error {
    constructor() {
        super("Sesi berakhir. Silakan login kembali.");
        this.name = "UnauthorizedError";
    }
}

const apiRequest = async (
    endpoint: string,
    options: RequestInit = {}
): Promise<unknown> => {
    const token = getToken();

    if (!token) throw new UnauthorizedError();

    const response = await fetch(`${import.meta.env.VITE_API_URI}${endpoint}`, {
        ...options,
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            ...(options.body
                ? { "Content-Type": "application/json" }
                : {}),
            ...options.headers,
        },
    });

    if (response.status === 401) {
        throw new UnauthorizedError();
    }

    const contentType =
        response.headers.get("content-type") ?? "";

    let payload: unknown = null;

    if (contentType.includes("application/json")) {
        payload = await response.json();
    } else {
        const responseText = await response.text();
        payload = responseText || null;
    }

    if (!response.ok) {
        throw new Error(
            isRecord(payload) &&
                typeof payload.message === "string"
                ? payload.message
                : response.status === 403
                    ? "Anda tidak memiliki izin melakukan aksi ini."
                    : `Request gagal (HTTP ${response.status}).`
        );
    }

    if (isRecord(payload) && payload.success === false) {
        throw new Error(
            typeof payload.message === "string"
                ? payload.message
                : "Operasi tidak berhasil."
        );
    }

    return payload;
};

const getAllCategories = async (
    signal?: AbortSignal
): Promise<ProviderCategoryData[]> => {
    const response = await apiRequest(
        "/provider-categories/get-all",
        { signal }
    );

    return extractArray(response, [
        "provider_categories",
        "providerCategories",
        "categories",
    ])
        .map(normalizeCategory)
        .filter(
            (category): category is ProviderCategoryData =>
                category !== null
        );
};

const getCategoryDetail = async (
    id: number,
    signal?: AbortSignal
): Promise<ProviderCategoryData> => {
    const response = await apiRequest(
        `/provider-categories/${id}`,
        { signal }
    );

    const category = normalizeCategory(
        extractObject(response)
    );

    if (!category) {
        throw new Error("Detail kategori tidak valid.");
    }

    return category;
};

const createCategory = (form: CategoryForm) =>
    apiRequest("/provider-categories/create", {
        method: "POST",
        body: JSON.stringify(form),
    });

const updateCategory = (
    id: number,
    form: CategoryForm
) =>
    apiRequest(`/provider-categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify(form),
    });

const deleteCategory = (id: number) =>
    apiRequest(`/provider-categories/${id}`, {
        method: "DELETE",
    });

const StatusBadge = ({
    status,
}: {
    status: CategoryStatus;
}) => {
    const color =
        status === "ACTIVE"
            ? "bg-emerald-50 text-emerald-700"
            : status === "INACTIVE"
                ? "bg-slate-100 text-slate-600"
                : "bg-amber-50 text-amber-700";

    return (
        <span
            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${color}`}
        >
            {status === "ACTIVE"
                ? "Active"
                : status === "INACTIVE"
                    ? "Inactive"
                    : "Unknown"}
        </span>
    );
};

const LoadingState = ({
    label = "Memuat data...",
}: {
    label?: string;
}) => (
    <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-500">
        <LoaderCircle
            size={18}
            className="animate-spin text-[#0866D8]"
        />
        {label}
    </div>
);

const EmptyState = ({
    message,
}: {
    message: string;
}) => (
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 p-6 text-center">
        <Layers3 size={28} className="text-slate-300" />
        <p className="text-sm text-slate-500">{message}</p>
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
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !busy) {
                onClose();
            }
        };

        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener(
                "keydown",
                handleEscape
            );
        };
    }, [onClose, busy]);

    return (
        <div
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !busy) {
                    onClose();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={`flex w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${wide
                    ? "h-[min(580px,90dvh)] max-w-xl"
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
                    <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

const ProviderCategory = () => {
    const navigate = useNavigate();

    const [categories, setCategories] = useState<
        ProviderCategoryData[]
    >([]);

    const [selectedId, setSelectedId] = useState<
        number | null
    >(null);

    const [detail, setDetail] = useState<
        ProviderCategoryData | null
    >(null);

    const [modal, setModal] = useState<ModalType>(null);

    const [form, setForm] = useState<CategoryForm>(
        emptyForm()
    );

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [page, setPage] = useState(1);

    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [listError, setListError] = useState("");
    const [detailError, setDetailError] = useState("");
    const [modalError, setModalError] = useState("");

    const [notice, setNotice] = useState<Notice | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleApiError = useCallback(
        (error: unknown): boolean => {
            if (error instanceof UnauthorizedError) {
                clearSession();

                navigate("/user/sign-in", {
                    replace: true,
                });

                return true;
            }

            return false;
        },
        [navigate]
    );

    const notify = (
        type: Notice["type"],
        message: string
    ) => {
        setNotice({ type, message });
    };

    const refreshData = () => {
        setRefreshKey((value) => value + 1);
    };

    useEffect(() => {
        const controller = new AbortController();

        const load = async () => {
            setLoading(true);
            setListError("");

            try {
                const result = await getAllCategories(
                    controller.signal
                );

                if (controller.signal.aborted) return;

                setCategories(result);
            } catch (error) {
                if (controller.signal.aborted) return;

                if (!handleApiError(error)) {
                    setListError(getErrorMessage(error));
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        void load();

        return () => controller.abort();
    }, [refreshKey, handleApiError]);

    const selectedCategory = useMemo(
        () =>
            categories.find(
                (category) =>
                    category.id_provider_category === selectedId
            ) ?? null,
        [categories, selectedId]
    );

    const displayedDetail =
        detail?.id_provider_category === selectedId
            ? detail
            : selectedCategory;

    const activeCount = categories.filter(
        (category) =>
            category.status_provider_category === "ACTIVE"
    ).length;

    const inactiveCount = categories.filter(
        (category) =>
            category.status_provider_category === "INACTIVE"
    ).length;

    const filteredCategories = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return categories.filter((category) => {
            const matchSearch = [
                category.name_provider_category,
                category.description_provider_category,
                String(category.id_provider_category),
            ].some((value) =>
                value.toLowerCase().includes(keyword)
            );

            const matchStatus =
                statusFilter === "ALL" ||
                category.status_provider_category === statusFilter;

            return matchSearch && matchStatus;
        });
    }, [categories, search, statusFilter]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredCategories.length / PAGE_SIZE)
    );

    const currentPage = Math.min(page, totalPages);

    const displayedCategories = filteredCategories.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    useEffect(() => {
        if (modal !== "detail" || selectedId === null) {
            return;
        }

        const controller = new AbortController();

        const loadDetail = async () => {
            setDetailLoading(true);
            setDetailError("");

            try {
                const result = await getCategoryDetail(
                    selectedId,
                    controller.signal
                );

                if (!controller.signal.aborted) {
                    setDetail(result);
                }
            } catch (error) {
                if (
                    !controller.signal.aborted &&
                    !handleApiError(error)
                ) {
                    setDetailError(getErrorMessage(error));
                }
            } finally {
                if (!controller.signal.aborted) {
                    setDetailLoading(false);
                }
            }
        };

        void loadDetail();

        return () => controller.abort();
    }, [selectedId, modal, handleApiError]);

    const closeModal = useCallback(() => {
        if (saving) return;

        setModal(null);
        setSelectedId(null);
        setDetail(null);
        setForm(emptyForm());
        setModalError("");
        setDetailError("");
    }, [saving]);

    const openCreate = () => {
        setSelectedId(null);
        setDetail(null);
        setForm(emptyForm());
        setModalError("");
        setModal("create");
    };

    const openDetail = (category: ProviderCategoryData) => {
        setSelectedId(category.id_provider_category);
        setDetail(category);
        setDetailError("");
        setModalError("");
        setModal("detail");
    };

    const openEdit = (category: ProviderCategoryData) => {
        setSelectedId(category.id_provider_category);
        setDetail(category);
        setForm(categoryToForm(category));
        setModalError("");
        setModal("edit");
    };

    const openDelete = (category: ProviderCategoryData) => {
        setSelectedId(category.id_provider_category);
        setDetail(category);
        setModalError("");
        setModal("delete");
    };

    const updateForm = (
        key: keyof CategoryForm,
        value: string
    ) => {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
    };

    const handleSaveCategory = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (saving) return;

        const name = form.name_provider_category.trim();
        const description =
            form.description_provider_category.trim();

        if (!name) {
            setModalError("Nama kategori wajib diisi.");
            return;
        }

        const duplicate = categories.some(
            (category) =>
                category.name_provider_category.toLowerCase() ===
                name.toLowerCase() &&
                (modal !== "edit" ||
                    category.id_provider_category !== selectedId)
        );

        if (duplicate) {
            setModalError("Nama kategori sudah digunakan.");
            return;
        }

        if (modal !== "create" && modal !== "edit") {
            return;
        }

        const action = modal;

        const payload: CategoryForm = {
            name_provider_category: name,
            description_provider_category: description,
            status_provider_category: form.status_provider_category,
        };

        setSaving(true);
        setModalError("");

        try {
            if (action === "create") {
                await createCategory(payload);
            } else {
                if (selectedId === null) return;

                await updateCategory(selectedId, payload);
            }

            const latest = await getAllCategories();
            setCategories(latest);

            setModal(null);
            setSelectedId(null);
            setDetail(null);

            notify(
                "success",
                action === "create"
                    ? "Kategori berhasil ditambahkan."
                    : "Kategori berhasil diperbarui."
            );
        } catch (error) {
            if (!handleApiError(error)) {
                setModalError(getErrorMessage(error));
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteCategory = async () => {
        if (
            saving ||
            modal !== "delete" ||
            !selectedCategory
        ) {
            return;
        }

        const category = selectedCategory;

        setSaving(true);
        setModalError("");

        try {
            await deleteCategory(category.id_provider_category);

            const latest = await getAllCategories();
            setCategories(latest);

            const updated = latest.find(
                (item) =>
                    item.id_provider_category ===
                    category.id_provider_category
            );

            if (!updated) {
                notify("success", "Kategori berhasil dihapus.");
            } else if (
                category.status_provider_category !== "INACTIVE" &&
                updated.status_provider_category === "INACTIVE"
            ) {
                notify(
                    "success",
                    "Kategori berhasil dinonaktifkan."
                );
            } else {
                throw new Error(
                    "Kategori masih dikembalikan API tanpa perubahan status. Periksa proses Delete di backend."
                );
            }

            setModal(null);
            setSelectedId(null);
            setDetail(null);
        } catch (error) {
            if (!handleApiError(error)) {
                setModalError(getErrorMessage(error));
            }
        } finally {
            setSaving(false);
        }
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
        if (modal === "create" || modal === "edit") {
            const editing = modal === "edit";

            return (
                <Modal
                    title={
                        editing
                            ? "Edit Kategori Provider"
                            : "Tambah Kategori Provider"
                    }
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
                                form="provider-category-form"
                                disabled={
                                    saving ||
                                    !form.name_provider_category.trim()
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
                                ) : editing ? (
                                    "Simpan Perubahan"
                                ) : (
                                    "Tambah Kategori"
                                )}
                            </button>
                        </>
                    }
                >
                    {modalErrorView}

                    <form
                        id="provider-category-form"
                        onSubmit={handleSaveCategory}
                        className="space-y-5"
                    >
                        {/* NAMA KATEGORI */}
                        <div>
                            <label
                                htmlFor="name_provider_category"
                                className="mb-2 block text-xs font-semibold text-slate-700"
                            >
                                Nama Kategori *
                            </label>

                            <input
                                id="name_provider_category"
                                value={form.name_provider_category}
                                onChange={(event) =>
                                    updateForm(
                                        "name_provider_category",
                                        event.target.value
                                    )
                                }
                                disabled={saving}
                                required
                                autoFocus
                                placeholder="Masukkan nama kategori"
                                className={inputClass}
                            />
                        </div>

                        {/* DESKRIPSI KATEGORI */}
                        <div>
                            <label
                                htmlFor="description_provider_category"
                                className="mb-2 block text-xs font-semibold text-slate-700"
                            >
                                Deskripsi
                            </label>

                            <textarea
                                id="description_provider_category"
                                value={form.description_provider_category}
                                onChange={(event) =>
                                    updateForm(
                                        "description_provider_category",
                                        event.target.value
                                    )
                                }
                                rows={4}
                                disabled={saving}
                                placeholder="Masukkan deskripsi kategori"
                                className={`${inputClass} resize-none`}
                            />
                        </div>

                        {/* STATUS KATEGORI */}
                        <div>
                            <label
                                htmlFor="status_provider_category"
                                className="mb-2 block text-xs font-semibold text-slate-700"
                            >
                                Status
                            </label>

                            <select
                                id="status_provider_category"
                                value={form.status_provider_category}
                                onChange={(event) =>
                                    updateForm(
                                        "status_provider_category",
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
                    </form>
                </Modal>
            );
        }

        if (modal === "detail" && displayedDetail) {
            const category = displayedDetail;

            return (
                <Modal
                    title="Detail Kategori Provider"
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
                                onClick={() => openEdit(category)}
                                className={primaryButton}
                            >
                                <Pencil size={16} />
                                Edit Kategori
                            </button>
                        </>
                    }
                >
                    {detailError && (
                        <div className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                            {detailError}
                        </div>
                    )}

                    <div aria-busy={detailLoading} className="space-y-5">
                        {/* INFORMASI KATEGORI */}
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0866D8]">
                                <Layers3 size={24} />
                            </div>

                            <div className="min-w-0 flex-1">
                                <h3 className="wrap-break-word text-base font-bold text-slate-950">
                                    {category.name_provider_category}
                                </h3>

                                <p className="mt-1 text-xs text-slate-500">
                                    ID: {category.id_provider_category}
                                </p>
                            </div>

                            <StatusBadge
                                status={category.status_provider_category}
                            />
                        </div>

                        {/* DESKRIPSI KATEGORI */}
                        <div className="border-t border-slate-100 pt-5">
                            <p className="mb-2 text-xs font-semibold text-slate-500">
                                Deskripsi Kategori
                            </p>

                            <p className="whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-slate-700">
                                {category.description_provider_category ||
                                    "Belum ada deskripsi."}
                            </p>
                        </div>
                    </div>
                </Modal>
            );
        }

        if (modal === "delete" && selectedCategory) {
            return (
                <Modal
                    title="Hapus Kategori?"
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
                                onClick={handleDeleteCategory}
                                disabled={saving}
                                className={dangerButton}
                            >
                                {saving ? (
                                    <LoaderCircle
                                        size={16}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Trash2 size={16} />
                                )}

                                {saving ? "Memproses..." : "Hapus Kategori"}
                            </button>
                        </>
                    }
                >
                    {modalErrorView}

                    <p className="text-sm leading-relaxed text-slate-600">
                        Yakin ingin menghapus{" "}
                        <strong className="text-slate-950">
                            {selectedCategory.name_provider_category}
                        </strong>
                        ?
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
                        Provider & Katalog / Kategori Provider
                    </p>

                    <h1 className="text-2xl font-bold text-slate-950 sm:text-[28px]">
                        Kategori Provider
                    </h1>

                    <p className="mt-2 text-sm text-[#526789]">
                        Kelola kategori untuk pengelompokan provider.
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
                        Tambah Kategori
                    </button>
                </div>
            </div>

            {/* NOTIFICATION */}
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

                    <p className="flex-1 text-sm">{notice.message}</p>

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

            {/* SUMMARY CARDS */}
            <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                    {
                        label: "Total Kategori",
                        value: categories.length,
                        icon: <Layers3 size={19} />,
                    },
                    {
                        label: "Active",
                        value: activeCount,
                        icon: <CheckCircle2 size={19} />,
                    },
                    {
                        label: "Inactive",
                        value: inactiveCount,
                        icon: <Tag size={19} />,
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

            {/* TABLE */}
            <section className="overflow-hidden rounded-2xl border border-[#DBE4F0] bg-white shadow-sm">
                {/* FILTERS */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
                    <div>
                        <h2 className="text-sm font-bold text-slate-950">
                            Daftar Kategori Provider
                        </h2>

                        <p className="mt-1 text-xs text-[#526789]">
                            {loading
                                ? "Memuat..."
                                : `${filteredCategories.length} kategori`}
                        </p>
                    </div>

                    <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                        <div className="relative min-w-47.5 flex-1 sm:w-64">
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
                                placeholder="Cari kategori..."
                                className="w-full rounded-lg border border-[#DBE4F0] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#0866D8]"
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(event) => {
                                setStatusFilter(event.target.value);
                                setPage(1);
                            }}
                            aria-label="Filter status kategori"
                            className="rounded-lg border border-[#DBE4F0] bg-white px-3 py-2.5 text-sm text-slate-700"
                        >
                            <option value="ALL">Semua Status</option>
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                        </select>
                    </div>
                </div>

                {/* TABLE CONTENT */}
                {loading ? (
                    <LoadingState />
                ) : listError ? (
                    <div className="p-5 text-sm text-red-600">
                        {listError}
                    </div>
                ) : filteredCategories.length === 0 ? (
                    <EmptyState message="Kategori tidak ditemukan." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead className="bg-[#F5F8FC]">
                                <tr>
                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        No.
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        Nama Kategori
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        Deskripsi
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
                                {displayedCategories.map(
                                    (category, index) => (
                                        <tr
                                            key={category.id_provider_category}
                                            className="border-t border-slate-100 hover:bg-slate-50"
                                        >
                                            {/* NUMBER */}
                                            <td className="px-5 py-4 text-slate-500">
                                                {(currentPage - 1) *
                                                    PAGE_SIZE +
                                                    index +
                                                    1}
                                            </td>

                                            {/* CATEGORY NAME */}
                                            <td className="px-5 py-4">
                                                <div className="flex min-w-45 items-center gap-3">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0866D8]">
                                                        <Layers3 size={20} />
                                                    </div>

                                                    <div className="min-w-0">
                                                        <p className="max-w-56 truncate font-semibold text-slate-950">
                                                            {category.name_provider_category}
                                                        </p>

                                                        <p className="mt-1 text-xs text-slate-500">
                                                            ID: {category.id_provider_category}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* DESCRIPTION */}
                                            <td className="px-5 py-4">
                                                <p
                                                    className="max-w-90 truncate text-slate-600"
                                                    title={
                                                        category.description_provider_category
                                                    }
                                                >
                                                    {category.description_provider_category ||
                                                        "—"}
                                                </p>
                                            </td>

                                            {/* STATUS */}
                                            <td className="px-5 py-4 text-center">
                                                <StatusBadge
                                                    status={
                                                        category.status_provider_category
                                                    }
                                                />
                                            </td>

                                            {/* ACTIONS */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => openDetail(category)}
                                                        title="Detail Kategori"
                                                        aria-label={`Detail ${category.name_provider_category}`}
                                                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-blue-50 text-[#0866D8] hover:bg-blue-100"
                                                    >
                                                        <Eye size={18} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => openEdit(category)}
                                                        title="Edit Kategori"
                                                        aria-label={`Edit ${category.name_provider_category}`}
                                                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100"
                                                    >
                                                        <Pencil size={18} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => openDelete(category)}
                                                        title="Hapus Kategori"
                                                        aria-label={`Hapus ${category.name_provider_category}`}
                                                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                                                    >
                                                        <Trash2 size={18} />
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

                {/* PAGINATION */}
                {!loading &&
                    !listError &&
                    filteredCategories.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
                            <p className="text-xs text-[#526789]">
                                Menampilkan{" "}
                                {(currentPage - 1) * PAGE_SIZE + 1}–
                                {Math.min(
                                    currentPage * PAGE_SIZE,
                                    filteredCategories.length
                                )}{" "}
                                dari {filteredCategories.length}
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

export default ProviderCategory;
