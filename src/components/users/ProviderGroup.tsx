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
    LoaderCircle,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    UserMinus,
    UserPlus,
    Users,
    X,
} from "lucide-react";

const PAGE_SIZE = 10;

type GroupStatus = "ACTIVE" | "INACTIVE" | "UNKNOWN";

type ModalType =
    | "create"
    | "detail"
    | "edit"
    | "add-provider"
    | "remove-provider"
    | "status"
    | null;

interface ProviderGroupData {
    id_provider_group: number;
    name_provider_group: string;
    status_provider_group: GroupStatus;
}

interface ProviderData {
    id_provider: number;
    name_provider: string;
    email_provider?: string;
    city_provider?: string;
    status_provider?: string;
    id_provider_group: number | null;
}

interface Notice {
    type: "success" | "error";
    message: string;
}

type ApiRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is ApiRecord =>
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value);

const getId = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const id = Number(value);

    return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const getStatus = (value: unknown): GroupStatus => {
    const status = String(value ?? "").trim().toUpperCase();

    if (status === "ACTIVE") return "ACTIVE";
    if (status === "INACTIVE") return "INACTIVE";

    return "UNKNOWN";
};

const getError = (error: unknown): string =>
    error instanceof Error
        ? error.message
        : "Terjadi kesalahan. Coba kembali.";

const getToken = () =>
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
            throw new Error("Format daftar API tidak valid.");
        }

        return payload;
    }

    if (!isRecord(payload) || depth > 5) {
        throw new Error("Format respons API tidak valid.");
    }

    if (payload.success === false) {
        throw new Error(
            typeof payload.message === "string"
                ? payload.message
                : "Request gagal."
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
                // Periksa field berikutnya.
            }
        }
    }

    throw new Error("Daftar data tidak ditemukan.");
};

const normalizeGroup = (
    row: ApiRecord
): ProviderGroupData | null => {
    const id = getId(row.id_provider_group);

    if (id === null) return null;

    return {
        id_provider_group: id,
        name_provider_group: String(
            row.name_provider_group ?? ""
        ),
        status_provider_group: getStatus(
            row.status_provider_group
        ),
    };
};

const normalizeProvider = (
    row: ApiRecord
): ProviderData | null => {
    const id = getId(row.id_provider);

    if (id === null) return null;

    return {
        id_provider: id,
        name_provider: String(row.name_provider ?? ""),
        email_provider:
            typeof row.email_provider === "string"
                ? row.email_provider
                : undefined,
        city_provider:
            typeof row.city_provider === "string"
                ? row.city_provider
                : undefined,
        status_provider:
            typeof row.status_provider === "string"
                ? row.status_provider
                : undefined,
        id_provider_group: getId(row.id_provider_group),
    };
};

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
        const text = await response.text();
        payload = text || null;
    }

    if (!response.ok) {
        throw new Error(
            isRecord(payload) &&
                typeof payload.message === "string"
                ? payload.message
                : response.status === 403
                    ? "Anda tidak memiliki izin untuk aksi ini."
                    : `Request gagal (HTTP ${response.status}).`
        );
    }

    if (isRecord(payload) && payload.success === false) {
        throw new Error(
            typeof payload.message === "string"
                ? payload.message
                : "Operasi gagal."
        );
    }

    return payload;
};

const getAllGroups = async (signal?: AbortSignal) => {
    const result = await apiRequest(
        "/provider-group/get-all",
        { signal }
    );

    return extractArray(result, [
        "provider_groups",
        "providerGroups",
        "groups",
    ])
        .map(normalizeGroup)
        .filter(
            (group): group is ProviderGroupData =>
                group !== null
        );
};

const getAllProviders = async (signal?: AbortSignal) => {
    const result = await apiRequest(
        "/provider/get-all",
        { signal }
    );

    return extractArray(result, ["providers"])
        .map(normalizeProvider)
        .filter(
            (provider): provider is ProviderData =>
                provider !== null
        );
};

const getEligibleProviders = async (
    groupId: number,
    signal?: AbortSignal
) => {
    const result = await apiRequest(
        `/provider-group/${groupId}/eligible-providers`,
        { signal }
    );

    return extractArray(result, [
        "eligible_providers",
        "eligibleProviders",
        "providers",
    ])
        .map(normalizeProvider)
        .filter(
            (provider): provider is ProviderData =>
                provider !== null
        );
};

const createGroup = (name: string) =>
    apiRequest("/provider-group/create", {
        method: "POST",
        body: JSON.stringify({
            name_provider_group: name,
        }),
    });

const updateGroup = (id: number, name: string) =>
    apiRequest(`/provider-group/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
            name_provider_group: name,
        }),
    });

const addProviders = (
    groupId: number,
    ids: number[]
) =>
    apiRequest(`/provider-group/${groupId}/providers`, {
        method: "POST",
        body: JSON.stringify({
            provider_ids: ids,
        }),
    });

const removeProvider = (
    groupId: number,
    providerId: number
) =>
    apiRequest(
        `/provider-group/${groupId}/providers/${providerId}`,
        { method: "DELETE" }
    );

const changeStatus = (
    group: ProviderGroupData,
    next: "ACTIVE" | "INACTIVE"
) => {
    if (next === "INACTIVE") {
        return apiRequest(
            `/provider-group/${group.id_provider_group}`,
            { method: "DELETE" }
        );
    }

    return apiRequest(
        `/provider-group/${group.id_provider_group}`,
        {
            method: "PATCH",
            body: JSON.stringify({
                name_provider_group: group.name_provider_group,
                status_provider_group: "ACTIVE",
            }),
        }
    );
};

const StatusBadge = ({
    status,
}: {
    status: GroupStatus;
}) => {
    const styles =
        status === "ACTIVE"
            ? "bg-emerald-50 text-emerald-700"
            : status === "INACTIVE"
                ? "bg-slate-100 text-slate-600"
                : "bg-amber-50 text-amber-700";

    return (
        <span
            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${styles}`}
        >
            {status === "ACTIVE"
                ? "Active"
                : status === "INACTIVE"
                    ? "Inactive"
                    : "Unknown"}
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
    <div className="flex min-h-36 flex-col items-center justify-center gap-2 p-5 text-center">
        <Building2 size={26} className="text-slate-300" />
        <p className="text-sm text-slate-500">{message}</p>
    </div>
);

interface ModalProps {
    title: string;
    children: ReactNode;
    footer?: ReactNode;
    onClose: () => void;
    wide?: boolean;
    busy?: boolean;
}

const Modal = ({
    title,
    children,
    footer,
    onClose,
    wide = false,
    busy = false,
}: ModalProps) => {
    // Escape menutup modal, tanpa animasi layout.
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !busy) {
                onClose();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener(
                "keydown",
                handleKeyDown
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
                className={`flex w-full flex-col overflow-hidden rounded-2xl bg-white shadow-xl ${wide
                    ? "h-[min(650px,90dvh)] max-w-3xl"
                    : "max-h-[90dvh] max-w-md"
                    }`}
            >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                    <h2 className="text-lg font-bold text-slate-900">
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
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

const primaryButton =
    "cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg bg-[#0866D8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton =
    "cursor-pointer inline-flex items-center justify-center rounded-lg border border-[#DBE4F0] bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50";

const ProviderGroup = () => {
    const navigate = useNavigate();

    const [groups, setGroups] =
        useState<ProviderGroupData[]>([]);

    const [providers, setProviders] =
        useState<ProviderData[]>([]);

    const [eligible, setEligible] =
        useState<ProviderData[]>([]);

    const [selectedGroupId, setSelectedGroupId] =
        useState<number | null>(null);

    const [selectedProvider, setSelectedProvider] =
        useState<ProviderData | null>(null);

    const [selectedIds, setSelectedIds] =
        useState<number[]>([]);

    const [modal, setModal] = useState<ModalType>(null);

    const [groupName, setGroupName] = useState("");

    const [search, setSearch] = useState("");
    const [providerSearch, setProviderSearch] = useState("");

    const [page, setPage] = useState(1);

    const [loading, setLoading] = useState(true);
    const [providersLoaded, setProvidersLoaded] =
        useState(false);
    const [eligibleLoading, setEligibleLoading] =
        useState(false);
    const [saving, setSaving] = useState(false);

    const [listError, setListError] = useState("");
    const [eligibleError, setEligibleError] = useState("");
    const [modalError, setModalError] = useState("");

    const [notice, setNotice] = useState<Notice | null>(
        null
    );

    const [refreshKey, setRefreshKey] = useState(0);

    const handleApiError = useCallback(
        (error: unknown) => {
            if (error instanceof UnauthorizedError) {
                clearSession();
                navigate("/user/sign-in", { replace: true });
                return true;
            }

            return false;
        },
        [navigate]
    );

    const showNotice = (
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
            setProvidersLoaded(false);

            const results = await Promise.allSettled([
                getAllGroups(controller.signal),
                getAllProviders(controller.signal),
            ]);

            if (controller.signal.aborted) return;

            if (
                results.some(
                    (result) =>
                        result.status === "rejected" &&
                        result.reason instanceof UnauthorizedError
                )
            ) {
                handleApiError(new UnauthorizedError());
                return;
            }

            const [groupResult, providerResult] = results;

            if (groupResult.status === "fulfilled") {
                setGroups(groupResult.value);
            } else {
                setGroups([]);
                setListError(getError(groupResult.reason));
            }

            if (providerResult.status === "fulfilled") {
                setProviders(providerResult.value);
                setProvidersLoaded(true);
            } else {
                setProviders([]);
                setProvidersLoaded(false);
            }

            setLoading(false);
        };

        void load();

        return () => controller.abort();
    }, [refreshKey, handleApiError]);

    const selectedGroup = useMemo(
        () =>
            groups.find(
                (group) =>
                    group.id_provider_group === selectedGroupId
            ) ?? null,
        [groups, selectedGroupId]
    );

    const members = useMemo(
        () =>
            providers.filter(
                (provider) =>
                    provider.id_provider_group === selectedGroupId
            ),
        [providers, selectedGroupId]
    );

    const getMemberCount = (groupId: number) =>
        providers.filter(
            (provider) =>
                provider.id_provider_group === groupId
        ).length;

    const activeCount = groups.filter(
        (group) => group.status_provider_group === "ACTIVE"
    ).length;

    const inactiveCount = groups.filter(
        (group) => group.status_provider_group === "INACTIVE"
    ).length;

    const filteredGroups = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return groups.filter(
            (group) =>
                group.name_provider_group
                    .toLowerCase()
                    .includes(keyword) ||
                String(group.id_provider_group).includes(keyword)
        );
    }, [groups, search]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredGroups.length / PAGE_SIZE)
    );

    const currentPage = Math.min(page, totalPages);

    const displayedGroups = filteredGroups.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    useEffect(() => {
        if (
            modal !== "add-provider" ||
            selectedGroupId === null
        ) {
            return;
        }

        const controller = new AbortController();

        const load = async () => {
            setEligibleLoading(true);
            setEligibleError("");
            setSelectedIds([]);
            setEligible([]);

            try {
                const result = await getEligibleProviders(
                    selectedGroupId,
                    controller.signal
                );

                if (!controller.signal.aborted) {
                    setEligible(result);
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    if (!handleApiError(error)) {
                        setEligibleError(getError(error));
                    }
                }
            } finally {
                if (!controller.signal.aborted) {
                    setEligibleLoading(false);
                }
            }
        };

        void load();

        return () => controller.abort();
    }, [modal, selectedGroupId, handleApiError]);

    const selectableProviders = useMemo(() => {
        const keyword = providerSearch.trim().toLowerCase();

        return eligible.filter((provider) => {
            const known = providers.find(
                (item) => item.id_provider === provider.id_provider
            );

            const assignedGroup =
                known?.id_provider_group ??
                provider.id_provider_group;

            if (assignedGroup !== null) return false;

            return (
                provider.name_provider
                    .toLowerCase()
                    .includes(keyword) ||
                (provider.email_provider || "")
                    .toLowerCase()
                    .includes(keyword)
            );
        });
    }, [eligible, providers, providerSearch]);

    const closeModal = useCallback(() => {
        if (saving) return;

        setModal(null);
        setSelectedGroupId(null);
        setSelectedProvider(null);
        setSelectedIds([]);
        setGroupName("");
        setProviderSearch("");
        setModalError("");
    }, [saving]);

    const backToDetail = () => {
        if (saving) return;

        setSelectedProvider(null);
        setSelectedIds([]);
        setModalError("");
        setModal("detail");
    };

    const openCreate = () => {
        setSelectedGroupId(null);
        setGroupName("");
        setModalError("");
        setModal("create");
    };

    const openDetail = (group: ProviderGroupData) => {
        setSelectedGroupId(group.id_provider_group);
        setModalError("");
        setModal("detail");
    };

    const openEdit = (group: ProviderGroupData) => {
        setSelectedGroupId(group.id_provider_group);
        setGroupName(group.name_provider_group);
        setModalError("");
        setModal("edit");
    };

    const openStatus = (group: ProviderGroupData) => {
        setSelectedGroupId(group.id_provider_group);
        setModalError("");
        setModal("status");
    };

    const openAddProvider = () => {
        setProviderSearch("");
        setSelectedIds([]);
        setModalError("");
        setModal("add-provider");
    };

    const openRemoveProvider = (provider: ProviderData) => {
        setSelectedProvider(provider);
        setModalError("");
        setModal("remove-provider");
    };

    const handleSaveGroup = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (saving) return;

        const name = groupName.trim();

        if (!name) {
            setModalError("Nama group wajib diisi.");
            return;
        }

        if (
            groups.some(
                (group) =>
                    group.name_provider_group.toLowerCase() ===
                    name.toLowerCase() &&
                    (modal !== "edit" ||
                        group.id_provider_group !== selectedGroupId)
            )
        ) {
            setModalError("Nama group sudah digunakan.");
            return;
        }

        setSaving(true);
        setModalError("");

        try {
            if (modal === "create") {
                await createGroup(name);
            } else if (
                modal === "edit" &&
                selectedGroupId !== null
            ) {
                await updateGroup(selectedGroupId, name);
            }

            const latestGroups = await getAllGroups();
            setGroups(latestGroups);

            setModal(null);
            showNotice(
                "success",
                modal === "create"
                    ? "Group berhasil dibuat."
                    : "Group berhasil diperbarui."
            );
        } catch (error) {
            if (!handleApiError(error)) {
                setModalError(getError(error));
            }
        } finally {
            setSaving(false);
        }
    };

    const toggleProvider = (id: number) => {
        setSelectedIds((current) =>
            current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id]
        );
    };

    const handleAddProviders = async () => {
        if (
            saving ||
            selectedGroupId === null ||
            selectedIds.length === 0 ||
            selectedGroup?.status_provider_group !== "ACTIVE"
        ) {
            return;
        }

        setSaving(true);
        setModalError("");

        try {
            const freshEligible = await getEligibleProviders(
                selectedGroupId
            );

            const freshIds = new Set(
                freshEligible
                    .filter((item) => item.id_provider_group === null)
                    .map((item) => item.id_provider)
            );

            if (!selectedIds.every((id) => freshIds.has(id))) {
                setEligible(freshEligible);
                setSelectedIds([]);

                throw new Error(
                    "Daftar provider berubah. Silakan pilih lagi."
                );
            }

            await addProviders(selectedGroupId, selectedIds);

            const latestProviders = await getAllProviders();
            setProviders(latestProviders);
            setProvidersLoaded(true);

            showNotice("success", "Provider berhasil ditambahkan.");
            setSelectedIds([]);
            setModal("detail");
        } catch (error) {
            if (!handleApiError(error)) {
                setModalError(getError(error));
            }
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveProvider = async () => {
        if (
            saving ||
            selectedGroupId === null ||
            !selectedProvider
        ) {
            return;
        }

        setSaving(true);
        setModalError("");

        try {
            await removeProvider(
                selectedGroupId,
                selectedProvider.id_provider
            );

            const latestProviders = await getAllProviders();
            setProviders(latestProviders);
            setProvidersLoaded(true);

            setSelectedProvider(null);
            setModal("detail");

            showNotice("success", "Provider berhasil dikeluarkan.");
        } catch (error) {
            if (!handleApiError(error)) {
                setModalError(getError(error));
            }
        } finally {
            setSaving(false);
        }
    };

    const handleChangeStatus = async () => {
        if (
            saving ||
            !selectedGroup ||
            selectedGroup.status_provider_group === "UNKNOWN"
        ) {
            return;
        }

        const group = selectedGroup;

        const nextStatus =
            group.status_provider_group === "ACTIVE"
                ? "INACTIVE"
                : "ACTIVE";

        setSaving(true);
        setModalError("");

        try {
            await changeStatus(group, nextStatus);

            // Baca ulang status dari backend.
            const latestGroups = await getAllGroups();
            setGroups(latestGroups);

            const updated = latestGroups.find(
                (item) =>
                    item.id_provider_group === group.id_provider_group
            );

            if (!updated) {
                throw new Error(
                    "Group tidak dikembalikan oleh API. Pastikan get-all menampilkan group inactive."
                );
            }

            if (updated.status_provider_group !== nextStatus) {
                throw new Error(
                    `Status masih ${updated.status_provider_group}. Perubahan belum tersimpan di backend.`
                );
            }

            setModal(null);
            showNotice(
                "success",
                `Group berhasil ${nextStatus === "ACTIVE"
                    ? "diaktifkan"
                    : "dinonaktifkan"
                }.`
            );
        } catch (error) {
            if (!handleApiError(error)) {
                setModalError(getError(error));
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
            <AlertCircle size={16} className="shrink-0" />
            {modalError}
        </div>
    ) : null;

    const modalFooter = (
        actionLabel: string,
        onAction: () => void,
        disabled = false,
        back = false,
        danger = false
    ) => (
        <>
            <button
                type="button"
                onClick={back ? backToDetail : closeModal}
                disabled={saving}
                className={secondaryButton}
            >
                Batal
            </button>

            <button
                type="button"
                onClick={onAction}
                disabled={saving || disabled}
                className={
                    danger
                        ? "rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                        : primaryButton
                }
            >
                {saving ? (
                    <>
                        <LoaderCircle
                            size={15}
                            className="animate-spin"
                        />
                        Menyimpan...
                    </>
                ) : (
                    actionLabel
                )}
            </button>
        </>
    );

    const renderModal = () => {
        if (modal === "create" || modal === "edit") {
            const editing = modal === "edit";

            return (
                <Modal
                    title={editing ? "Edit Group" : "Buat Group"}
                    onClose={
                        editing ? backToDetail : closeModal
                    }
                    busy={saving}
                >
                    {modalErrorView}

                    <form
                        id="provider-group-form"
                        onSubmit={handleSaveGroup}
                    >
                        <label
                            htmlFor="name-provider-group"
                            className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                            Nama Provider Group
                        </label>

                        <input
                            id="name-provider-group"
                            value={groupName}
                            onChange={(event) =>
                                setGroupName(event.target.value)
                            }
                            maxLength={150}
                            required
                            autoFocus
                            disabled={saving}
                            placeholder="Masukkan nama group"
                            className="w-full rounded-lg border border-[#DBE4F0] px-4 py-3 text-sm outline-none focus:border-[#0866D8]"
                        />

                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={
                                    editing ? backToDetail : closeModal
                                }
                                disabled={saving}
                                className={secondaryButton}
                            >
                                Batal
                            </button>

                            <button
                                type="submit"
                                disabled={saving || !groupName.trim()}
                                className={primaryButton}
                            >
                                {saving ? "Menyimpan..." : "Simpan"}
                            </button>
                        </div>
                    </form>
                </Modal>
            );
        }

        if (modal === "detail") {
            return (
                <Modal
                    title="Detail Provider Group"
                    onClose={closeModal}
                    wide
                >
                    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-lg bg-[#F5F8FC] p-3 sm:col-span-2">
                            <p className="text-xs text-slate-500">
                                Nama Group
                            </p>
                            <p className="mt-1 text-sm font-semibold">
                                {selectedGroup?.name_provider_group || "—"}
                            </p>
                        </div>

                        <div className="rounded-lg bg-[#F5F8FC] p-3">
                            <p className="text-xs text-slate-500">
                                Status
                            </p>
                            <div className="mt-1">
                                <StatusBadge
                                    status={
                                        selectedGroup?.status_provider_group ||
                                        "UNKNOWN"
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-sm font-bold text-slate-900">
                            Anggota Provider{" "}
                            {providersLoaded ? `(${members.length})` : ""}
                        </h3>

                        <button
                            type="button"
                            onClick={openAddProvider}
                            disabled={
                                !providersLoaded ||
                                selectedGroup?.status_provider_group !==
                                "ACTIVE"
                            }
                            className={`${primaryButton} px-3! py-2! text-xs!`}
                        >
                            <UserPlus size={15} />
                            Tambah Provider
                        </button>
                    </div>

                    {!providersLoaded ? (
                        <EmptyState message="Data provider tidak tersedia." />
                    ) : members.length === 0 ? (
                        <EmptyState message="Belum ada anggota provider." />
                    ) : (
                        <div className="overflow-x-auto rounded-lg border border-[#DBE4F0]">
                            <table className="min-w-full text-sm">
                                <thead className="bg-[#F5F8FC] text-left">
                                    <tr>
                                        <th className="px-4 py-3">Provider</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-right">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {members.map((provider) => (
                                        <tr
                                            key={provider.id_provider}
                                            className="border-t border-slate-100"
                                        >
                                            <td className="px-4 py-3">
                                                <p className="font-semibold">
                                                    {provider.name_provider}
                                                </p>

                                                <p className="text-xs text-slate-500">
                                                    {provider.city_provider ||
                                                        provider.email_provider ||
                                                        `ID ${provider.id_provider}`}
                                                </p>
                                            </td>

                                            <td className="px-4 py-3 text-xs">
                                                {provider.status_provider || "—"}
                                            </td>

                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    type="button"
                                                    title="Keluarkan provider"
                                                    onClick={() =>
                                                        openRemoveProvider(provider)
                                                    }
                                                    className="cursor-pointer rounded-lg p-2 text-red-500 hover:bg-red-50"
                                                >
                                                    <UserMinus size={17} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="mt-5 flex justify-end">
                        <button
                            type="button"
                            onClick={closeModal}
                            className={secondaryButton}
                        >
                            Tutup
                        </button>
                    </div>
                </Modal>
            );
        }

        if (modal === "add-provider") {
            return (
                <Modal
                    title="Tambah Provider"
                    onClose={backToDetail}
                    wide
                    busy={saving}
                    footer={modalFooter(
                        "Tambah",
                        handleAddProviders,
                        selectedIds.length === 0 ||
                        eligibleLoading ||
                        !!eligibleError,
                        true
                    )}
                >
                    <p className="mb-4 text-sm text-slate-500">
                        {selectedGroup?.name_provider_group}
                    </p>

                    {modalErrorView}

                    <div className="relative mb-4">
                        <Search
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                            value={providerSearch}
                            onChange={(event) =>
                                setProviderSearch(event.target.value)
                            }
                            placeholder="Cari provider..."
                            className="w-full rounded-lg border border-[#DBE4F0] py-3 pl-10 pr-3 text-sm outline-none focus:border-[#0866D8]"
                        />
                    </div>

                    {eligibleLoading ? (
                        <LoadingState />
                    ) : eligibleError ? (
                        <p className="text-sm text-red-600">
                            {eligibleError}
                        </p>
                    ) : selectableProviders.length === 0 ? (
                        <EmptyState message="Tidak ada provider tersedia." />
                    ) : (
                        <div className="space-y-2">
                            {selectableProviders.map((provider) => {
                                const checked = selectedIds.includes(
                                    provider.id_provider
                                );

                                return (
                                    <label
                                        key={provider.id_provider}
                                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${checked
                                            ? "border-blue-300 bg-blue-50"
                                            : "border-[#DBE4F0] hover:bg-slate-50"
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() =>
                                                toggleProvider(provider.id_provider)
                                            }
                                            className="h-4 w-4 accent-[#0866D8]"
                                        />

                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold">
                                                {provider.name_provider}
                                            </p>

                                            <p className="truncate text-xs text-slate-500">
                                                {provider.email_provider ||
                                                    provider.city_provider ||
                                                    `ID ${provider.id_provider}`}
                                            </p>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    )}

                    <p className="mt-4 text-xs text-slate-500">
                        {selectedIds.length} provider dipilih
                    </p>
                </Modal>
            );
        }

        if (modal === "remove-provider") {
            return (
                <Modal
                    title="Keluarkan Provider?"
                    onClose={backToDetail}
                    busy={saving}
                    footer={modalFooter(
                        "Keluarkan",
                        handleRemoveProvider,
                        false,
                        true,
                        true
                    )}
                >
                    {modalErrorView}

                    <p className="text-sm text-slate-600">
                        Keluarkan{" "}
                        <strong>{selectedProvider?.name_provider}</strong>{" "}
                        dari group ini?
                    </p>
                </Modal>
            );
        }

        if (modal === "status" && selectedGroup) {
            const next =
                selectedGroup.status_provider_group === "ACTIVE"
                    ? "INACTIVE"
                    : "ACTIVE";

            const activating = next === "ACTIVE";

            return (
                <Modal
                    title={
                        activating
                            ? "Aktifkan Group?"
                            : "Nonaktifkan Group?"
                    }
                    onClose={closeModal}
                    busy={saving}
                    footer={modalFooter(
                        activating ? "Aktifkan" : "Nonaktifkan",
                        handleChangeStatus,
                        false,
                        false,
                        !activating
                    )}
                >
                    {modalErrorView}

                    <p className="text-sm text-slate-600">
                        Yakin ingin {activating ? "mengaktifkan" : "menonaktifkan"}{" "}
                        <strong>{selectedGroup.name_provider_group}</strong>?
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
                        Provider & Katalog / Provider Group
                    </p>

                    <h1 className="text-2xl font-bold text-slate-950 sm:text-[28px]">
                        Provider Group
                    </h1>

                    <p className="mt-2 text-sm text-[#526789]">
                        Kelola group dan anggota provider.
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
                        className={primaryButton}
                    >
                        <Plus size={17} />
                        Buat Group
                    </button>
                </div>
            </div>

            {/* NOTIFICATION */}
            {notice && (
                <div
                    role="alert"
                    className={`mb-5 flex items-center gap-3 rounded-xl border p-3 ${notice.type === "success"
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
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* SUMMARY */}
            <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                    {
                        label: "Total Group",
                        value: groups.length,
                        icon: <Building2 size={18} />,
                    },
                    {
                        label: "Active",
                        value: activeCount,
                        icon: <CheckCircle2 size={18} />,
                    },
                    {
                        label: "Inactive",
                        value: inactiveCount,
                        icon: <Users size={18} />,
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
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
                    <div>
                        <h2 className="text-sm font-bold">
                            Daftar Provider Group
                        </h2>
                        <p className="mt-1 text-xs text-[#526789]">
                            {filteredGroups.length} group
                        </p>
                    </div>

                    <div className="relative w-full sm:w-72">
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
                            placeholder="Cari group..."
                            className="w-full rounded-lg border border-[#DBE4F0] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#0866D8]"
                        />
                    </div>
                </div>

                {loading ? (
                    <LoadingState />
                ) : listError ? (
                    <p className="p-5 text-sm text-red-600">
                        {listError}
                    </p>
                ) : filteredGroups.length === 0 ? (
                    <EmptyState message="Provider Group tidak ditemukan." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead className="bg-[#F5F8FC]">
                                <tr>
                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        No.
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        Nama Provider Group
                                    </th>

                                    <th className="px-5 py-3 text-center text-xs font-semibold text-[#344F77]">
                                        Provider
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
                                {displayedGroups.map((group, index) => {
                                    const active =
                                        group.status_provider_group === "ACTIVE";

                                    const unknown =
                                        group.status_provider_group === "UNKNOWN";

                                    return (
                                        <tr
                                            key={group.id_provider_group}
                                            className="border-t border-slate-100 hover:bg-slate-50"
                                        >
                                            <td className="px-5 py-4 text-slate-500">
                                                {(currentPage - 1) * PAGE_SIZE +
                                                    index +
                                                    1}
                                            </td>

                                            <td className="px-5 py-4">
                                                <p className="font-semibold text-slate-900">
                                                    {group.name_provider_group}
                                                </p>

                                                <p className="mt-1 text-xs text-slate-400">
                                                    ID: {group.id_provider_group}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4 text-center">
                                                {providersLoaded
                                                    ? getMemberCount(group.id_provider_group)
                                                    : "—"}
                                            </td>

                                            {/* STATUS: DI TENGAH */}
                                            <td className="px-5 py-4 text-center">
                                                <StatusBadge
                                                    status={group.status_provider_group}
                                                />
                                            </td>

                                            {/* ACTION: DETAIL, EDIT, SWITCH */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-end gap-3">

                                                    {/* DETAIL */}
                                                    <button
                                                        type="button"
                                                        onClick={() => openDetail(group)}
                                                        title="Detail Group"
                                                        aria-label={`Detail ${group.name_provider_group}`}
                                                        className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-[#0866D8] transition-colors hover:bg-blue-100"
                                                    >
                                                        <Eye size={18} />
                                                    </button>

                                                    {/* EDIT */}
                                                    <button
                                                        type="button"
                                                        onClick={() => openEdit(group)}
                                                        title="Edit Group"
                                                        aria-label={`Edit ${group.name_provider_group}`}
                                                        className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 transition-colors hover:bg-amber-100"
                                                    >
                                                        <Pencil size={18} />
                                                    </button>

                                                    {/* STATUS SWITCH */}
                                                    <button
                                                        type="button"
                                                        role="switch"
                                                        aria-checked={active}
                                                        aria-label={`${active ? "Nonaktifkan" : "Aktifkan"
                                                            } ${group.name_provider_group}`}
                                                        title={
                                                            unknown
                                                                ? "Status tidak dikenali"
                                                                : active
                                                                    ? "Nonaktifkan Group"
                                                                    : "Aktifkan Group"
                                                        }
                                                        onClick={() => openStatus(group)}
                                                        disabled={unknown}
                                                        className={`cursor-pointer relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#0866D8]/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${active
                                                            ? "bg-[#0866D8]"
                                                            : "bg-slate-300"
                                                            }`}
                                                    >
                                                        <span
                                                            className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ${active ? "left-6" : "left-1"
                                                                }`}
                                                        />
                                                    </button>

                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && !listError && filteredGroups.length > 0 && (
                    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
                        <p className="text-xs text-[#526789]">
                            {(currentPage - 1) * PAGE_SIZE + 1}–
                            {Math.min(
                                currentPage * PAGE_SIZE,
                                filteredGroups.length
                            )}{" "}
                            dari {filteredGroups.length}
                        </p>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                disabled={currentPage === 1}
                                onClick={() =>
                                    setPage((value) => Math.max(1, value - 1))
                                }
                                aria-label="Halaman sebelumnya"
                                className="rounded-lg border p-2 disabled:opacity-40"
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
                                className="rounded-lg border p-2 disabled:opacity-40"
                            >
                                <ChevronRight size={17} />
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {renderModal()}
        </div>
    );
};

export default ProviderGroup;
