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
    Building2,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    CreditCard,
    Eye,
    EyeOff,
    Landmark,
    LoaderCircle,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    ShieldCheck,
    Wallet,
    X,
} from "lucide-react";

const PAGE_SIZE = 10;

type ApiRecord = Record<string, unknown>;

type ModalType =
    | "create"
    | "edit"
    | "detail"
    | "status"
    | "verification"
    | null;

type VerificationStatus =
    | "VERIFIED"
    | "PENDING"
    | "REJECTED"
    | "UNKNOWN";

interface BankAccount {
    id_provider_bank_account: number;
    id_provider: number | null;
    bank_code: string;
    bank_name: string;
    account_number: string;
    account_holder_name: string;
    is_active: boolean | null;
    verification_status: VerificationStatus;
}

interface Provider {
    id_provider: number;
    name_provider: string;
}

interface CatalogBank {
    id: number;
    bank_code: string;
    bank_name: string;
    swift_code: string | null;
}

interface BankForm {
    id_provider: string;
    bank_code: string;
    bank_name: string;
    account_number: string;
    account_holder_name: string;
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

interface DetailFieldProps {
    label: string;
    value: string | number | null | undefined;
}

interface ToggleSwitchProps {
    checked: boolean;
    onClick: () => void;
    disabled?: boolean;
    label: string;
}

const primaryButton =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#0866D8] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#DBE4F0] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

const successButton =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50";

const warningButton =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50";

const inputClass =
    "w-full rounded-lg border border-[#DBE4F0] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-[#0866D8] focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50";

const filterClass =
    "rounded-lg border border-[#DBE4F0] bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-colors focus:border-[#0866D8]";

const iconButtonClass =
    "flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const emptyForm = (): BankForm => ({
    id_provider: "",
    bank_code: "",
    bank_name: "",
    account_number: "",
    account_holder_name: "",
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

const asBoolean = (
    value: unknown
): boolean | null => {
    if (
        value === true ||
        value === 1 ||
        value === "1"
    ) {
        return true;
    }

    if (
        value === false ||
        value === 0 ||
        value === "0"
    ) {
        return false;
    }

    if (typeof value === "string") {
        const normalized = value.trim().toUpperCase();

        if (
            ["TRUE", "ACTIVE", "YES"].includes(normalized)
        ) {
            return true;
        }

        if (
            ["FALSE", "INACTIVE", "NO"].includes(normalized)
        ) {
            return false;
        }
    }

    return null;
};

const normalizeVerificationStatus = (
    value: unknown
): VerificationStatus => {
    const status = asText(value).trim().toUpperCase();

    if (status === "VERIFIED") return "VERIFIED";
    if (status === "PENDING") return "PENDING";
    if (status === "REJECTED") return "REJECTED";

    return "UNKNOWN";
};

const maskAccountNumber = (
    accountNumber: string
): string => {
    if (!accountNumber) return "—";

    if (accountNumber.length <= 4) {
        return "••••";
    }

    return `•••• •••• ${accountNumber.slice(-4)}`;
};

const getErrorMessage = (error: unknown): string =>
    error instanceof Error
        ? error.message
        : "Terjadi kesalahan. Silakan coba kembali.";

const getToken = (): string | null =>
    sessionStorage.getItem("admin_token") ??
    localStorage.getItem("admin_token");

class ApiError extends Error {
    status: number;

    constructor(
        status: number,
        message: string
    ) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
}

const apiRequest = async (
    endpoint: string,
    options: RequestInit = {}
): Promise<unknown> => {
    const token = getToken();

    if (!token) {
        throw new ApiError(
            401,
            "Token admin tidak ditemukan. Silakan login kembali."
        );
    }

    const headers = new Headers(options.headers);

    headers.set("Accept", "application/json");
    headers.set("Authorization", `Bearer ${token}`);

    if (
        options.body &&
        !(options.body instanceof FormData)
    ) {
        headers.set("Content-Type", "application/json");
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
                : "";

        throw new ApiError(
            response.status,
            serverMessage ||
            (response.status === 401
                ? "Token tidak valid atau sudah kedaluwarsa."
                : response.status === 403
                    ? "Anda tidak memiliki izin untuk melakukan aksi ini."
                    : response.status === 404
                        ? "Endpoint atau data tidak ditemukan."
                        : `Request gagal (HTTP ${response.status}).`)
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
                // Coba field berikutnya.
            }
        }
    }

    throw new Error(
        "Daftar data tidak ditemukan pada respons API."
    );
};

const extractObject = (
    payload: unknown,
    keys: string[] = [],
    depth = 0
): ApiRecord => {
    if (!isRecord(payload) || depth > 6) {
        throw new Error(
            "Format detail API tidak valid."
        );
    }

    for (const key of [...keys, "data", "result"]) {
        const nested = payload[key];

        if (isRecord(nested)) {
            return extractObject(nested, keys, depth + 1);
        }
    }

    return payload;
};

const normalizeAccount = (
    row: ApiRecord
): BankAccount | null => {
    const id =
        asId(row.id_provider_bank_account) ??
        asId(row.id_bank_account);

    if (id === null) return null;

    return {
        id_provider_bank_account: id,
        id_provider: asId(row.id_provider),
        bank_code: asText(row.bank_code),
        bank_name: asText(row.bank_name),
        account_number: asText(row.account_number),
        account_holder_name: asText(
            row.account_holder_name
        ),
        is_active: asBoolean(row.is_active),
        verification_status: normalizeVerificationStatus(
            row.verification_status
        ),
    };
};

const normalizeProvider = (
    row: ApiRecord
): Provider | null => {
    const id = asId(row.id_provider);

    if (id === null) return null;

    return {
        id_provider: id,
        name_provider: asText(row.name_provider),
    };
};

const normalizeCatalogBank = (
    row: ApiRecord
): CatalogBank | null => {
    const id = asId(row.id);

    if (id === null) return null;

    const bankCode = asText(row.bank_code);
    const bankName = asText(row.bank_name);

    if (!bankCode || !bankName) return null;

    return {
        id,
        bank_code: bankCode,
        bank_name: bankName,
        swift_code: row.swift_code == null
            ? null
            : asText(row.swift_code),
    };
};

const toForm = (
    account: BankAccount
): BankForm => ({
    id_provider: String(
        account.id_provider ?? ""
    ),
    bank_code: account.bank_code,
    bank_name: account.bank_name,
    account_number: account.account_number,
    account_holder_name: account.account_holder_name,
});

// GET /provider-bank-account/get-all
const getAllBankAccounts = async (
    signal?: AbortSignal
): Promise<BankAccount[]> => {
    const response = await apiRequest(
        "/provider-bank-account/get-all",
        { signal }
    );

    return extractArray(response, [
        "provider_bank_accounts",
        "providerBankAccounts",
        "bank_accounts",
        "accounts",
    ])
        .map(normalizeAccount)
        .filter(
            (item): item is BankAccount =>
                item !== null
        );
};

// GET /provider-bank-account/:id
const getBankAccountDetail = async (
    id: number,
    signal?: AbortSignal
): Promise<BankAccount> => {
    const response = await apiRequest(
        `/provider-bank-account/${id}`,
        { signal }
    );

    const account = normalizeAccount(
        extractObject(response, [
            "provider_bank_account",
            "bank_account",
            "account",
        ])
    );

    if (!account) {
        throw new Error(
            "Data detail rekening tidak valid."
        );
    }

    return account;
};

// POST /provider-bank-account/create
const createBankAccount = async (
    form: BankForm
): Promise<unknown> => {
    return apiRequest(
        "/provider-bank-account/create",
        {
            method: "POST",
            body: JSON.stringify({
                id_provider: Number(form.id_provider),
                bank_code: form.bank_code,
                bank_name: form.bank_name,
                account_number:
                    form.account_number.trim(),
                account_holder_name:
                    form.account_holder_name.trim(),
            }),
        }
    );
};

// PUT /provider-bank-account/:id
const updateBankAccount = async (
    id: number,
    form: BankForm
): Promise<unknown> => {
    return apiRequest(
        `/provider-bank-account/${id}`,
        {
            method: "PUT",
            body: JSON.stringify({
                id_provider: Number(form.id_provider),
                bank_code: form.bank_code,
                bank_name: form.bank_name,
                account_number:
                    form.account_number.trim(),
                account_holder_name:
                    form.account_holder_name.trim(),
            }),
        }
    );
};

// PATCH /provider-bank-account/:id/status
const updateBankAccountStatus = async (
    id: number,
    active: boolean
): Promise<unknown> => {
    return apiRequest(
        `/provider-bank-account/${id}/status`,
        {
            method: "PATCH",
            body: JSON.stringify({
                is_active: active ? "TRUE" : "FALSE",
            }),
        }
    );
};

// PATCH /provider-bank-account/:id/verification
const verifyBankAccount = async (
    id: number
): Promise<unknown> => {
    return apiRequest(
        `/provider-bank-account/${id}/verification`,
        {
            method: "PATCH",
            body: JSON.stringify({
                verification_status: "VERIFIED",
            }),
        }
    );
};

// GET /provider/get-all
const getAllProviders = async (
    signal?: AbortSignal
): Promise<Provider[]> => {
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
            (item): item is Provider =>
                item !== null
        );
};

// GET /bank-catalog/get-all
const getBankCatalog = async (
    signal?: AbortSignal
): Promise<CatalogBank[]> => {
    const response = await apiRequest(
        "/bank-catalog/get-all",
        { signal }
    );

    return extractArray(response, [
        "banks",
        "bank_catalog",
    ])
        .map(normalizeCatalogBank)
        .filter(
            (item): item is CatalogBank =>
                item !== null
        );
};

const ToggleSwitch = ({
    checked,
    onClick,
    disabled = false,
    label,
}: ToggleSwitchProps) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        title={label}
        onClick={onClick}
        disabled={disabled}
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full p-1 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${checked
            ? "bg-emerald-500 hover:bg-emerald-600"
            : "bg-slate-300 hover:bg-slate-400"
            }`}
    >
        <span
            className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"
                }`}
        />
    </button>
);

const ActiveBadge = ({
    active,
}: {
    active: boolean | null;
}) => {
    const style =
        active === true
            ? "bg-emerald-50 text-emerald-700"
            : active === false
                ? "bg-slate-100 text-slate-600"
                : "bg-amber-50 text-amber-700";

    return (
        <span
            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${style}`}
        >
            {active === true
                ? "Active"
                : active === false
                    ? "Inactive"
                    : "Unknown"}
        </span>
    );
};

const VerificationBadge = ({
    status,
}: {
    status: VerificationStatus;
}) => {
    const colors: Record<
        VerificationStatus,
        string
    > = {
        VERIFIED:
            "bg-emerald-50 text-emerald-700",
        PENDING:
            "bg-amber-50 text-amber-700",
        REJECTED:
            "bg-red-50 text-red-700",
        UNKNOWN:
            "bg-slate-100 text-slate-600",
    };

    return (
        <span
            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${colors[status]}`}
        >
            {status === "UNKNOWN"
                ? "Unknown"
                : status.charAt(0) +
                status.slice(1).toLowerCase()}
        </span>
    );
};

const DetailField = ({
    label,
    value,
}: DetailFieldProps) => (
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
                    ? "h-[min(690px,90dvh)] max-w-2xl"
                    : "max-h-[90dvh] max-w-md"
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

                {/* SCROLLABLE BODY */}
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

const ProviderBankAccount = () => {
    const [accounts, setAccounts] =
        useState<BankAccount[]>([]);

    const [providers, setProviders] =
        useState<Provider[]>([]);

    const [bankCatalog, setBankCatalog] =
        useState<CatalogBank[]>([]);

    const [selectedAccount, setSelectedAccount] =
        useState<BankAccount | null>(null);

    const [detail, setDetail] =
        useState<BankAccount | null>(null);

    const [modal, setModal] =
        useState<ModalType>(null);

    const [form, setForm] =
        useState<BankForm>(emptyForm());

    const [selectedBankId, setSelectedBankId] =
        useState("");

    const [bankSearch, setBankSearch] =
        useState("");

    const [bankCatalogError, setBankCatalogError] =
        useState("");

    const [showAccountNumber, setShowAccountNumber] =
        useState(false);

    const [
        showFormAccountNumber,
        setShowFormAccountNumber,
    ] = useState(false);

    const [search, setSearch] =
        useState("");

    const [providerFilter, setProviderFilter] =
        useState("ALL");

    const [activeFilter, setActiveFilter] =
        useState("ALL");

    const [
        verificationFilter,
        setVerificationFilter,
    ] = useState("ALL");

    const [page, setPage] =
        useState(1);

    const [loading, setLoading] =
        useState(true);

    const [detailLoading, setDetailLoading] =
        useState(false);

    const [saving, setSaving] =
        useState(false);

    const [listError, setListError] =
        useState("");

    const [detailError, setDetailError] =
        useState("");

    const [modalError, setModalError] =
        useState("");

    const [notice, setNotice] =
        useState<Notice | null>(null);

    const [refreshKey, setRefreshKey] =
        useState(0);

    useEffect(() => {
        const controller =
            new AbortController();

        const loadData = async () => {
            setLoading(true);
            setListError("");
            setBankCatalogError("");

            const results = await Promise.allSettled([
                getAllBankAccounts(controller.signal),
                getAllProviders(controller.signal),
                getBankCatalog(controller.signal),
            ]);

            if (controller.signal.aborted) return;

            const [
                accountResult,
                providerResult,
                catalogResult,
            ] = results;

            // ACCOUNT LIST
            if (accountResult.status === "fulfilled") {
                setAccounts(accountResult.value);
            } else {
                setAccounts([]);

                setListError(
                    getErrorMessage(accountResult.reason)
                );
            }

            // PROVIDER LIST
            if (providerResult.status === "fulfilled") {
                setProviders(providerResult.value);
            } else {
                setProviders([]);
            }

            // BANK CATALOG
            if (catalogResult.status === "fulfilled") {
                setBankCatalog(catalogResult.value);
            } else {
                setBankCatalog([]);

                setBankCatalogError(
                    getErrorMessage(catalogResult.reason)
                );
            }

            setLoading(false);
        };

        void loadData();

        return () => {
            controller.abort();
        };
    }, [refreshKey]);

    const providerName = useCallback(
        (id: number | null): string => {
            if (id === null) return "—";

            return (
                providers.find(
                    (provider) =>
                        provider.id_provider === id
                )?.name_provider ||
                `Provider #${id}`
            );
        },
        [providers]
    );

    const selectedBank = useMemo(
        () =>
            bankCatalog.find(
                (bank) =>
                    String(bank.id) === selectedBankId
            ) ?? null,
        [bankCatalog, selectedBankId]
    );

    const filteredCatalogBanks = useMemo(() => {
        const keyword = bankSearch
            .trim()
            .toLowerCase();

        if (!keyword) return bankCatalog;

        return bankCatalog.filter((bank) =>
            [
                bank.bank_name,
                bank.bank_code,
                bank.swift_code ?? "",
            ].some((value) =>
                value.toLowerCase().includes(keyword)
            )
        );
    }, [bankCatalog, bankSearch]);

    const selectCatalogBank = (
        bankId: string
    ) => {
        setSelectedBankId(bankId);

        const bank = bankCatalog.find(
            (item) =>
                String(item.id) === bankId
        );

        setForm((current) => ({
            ...current,
            bank_code: bank?.bank_code ?? "",
            bank_name: bank?.bank_name ?? "",
        }));

        if (modalError) {
            setModalError("");
        }
    };

    const activeCount = accounts.filter(
        (account) =>
            account.is_active === true
    ).length;

    const inactiveCount = accounts.filter(
        (account) =>
            account.is_active === false
    ).length;

    const verifiedCount = accounts.filter(
        (account) =>
            account.verification_status === "VERIFIED"
    ).length;

    const pendingCount = accounts.filter(
        (account) =>
            account.verification_status === "PENDING"
    ).length;

    const providerOptions = useMemo(() => {
        const ids = Array.from(
            new Set(
                accounts
                    .map((account) => account.id_provider)
                    .filter(
                        (id): id is number =>
                            id !== null
                    )
            )
        );

        return ids
            .map((id) => ({
                id,
                name: providerName(id),
            }))
            .sort((a, b) =>
                a.name.localeCompare(b.name)
            );
    }, [accounts, providerName]);

    const filteredAccounts = useMemo(() => {
        const keyword = search
            .trim()
            .toLowerCase();

        return accounts.filter((account) => {
            const searchable = [
                account.bank_name,
                account.bank_code,
                account.account_holder_name,
                account.account_number,
                providerName(account.id_provider),
                String(account.id_provider_bank_account),
            ];

            const matchSearch = searchable.some(
                (value) =>
                    value.toLowerCase().includes(keyword)
            );

            const matchProvider =
                providerFilter === "ALL" ||
                String(account.id_provider) ===
                providerFilter;

            const matchActive =
                activeFilter === "ALL" ||
                (activeFilter === "ACTIVE"
                    ? account.is_active === true
                    : activeFilter === "INACTIVE"
                        ? account.is_active === false
                        : account.is_active === null);

            const matchVerification =
                verificationFilter === "ALL" ||
                account.verification_status ===
                verificationFilter;

            return (
                matchSearch &&
                matchProvider &&
                matchActive &&
                matchVerification
            );
        });
    }, [
        accounts,
        search,
        providerFilter,
        activeFilter,
        verificationFilter,
        providerName,
    ]);

    const totalPages = Math.max(
        1,
        Math.ceil(
            filteredAccounts.length /
            PAGE_SIZE
        )
    );

    const currentPage = Math.min(
        page,
        totalPages
    );

    const displayedAccounts =
        filteredAccounts.slice(
            (currentPage - 1) * PAGE_SIZE,
            currentPage * PAGE_SIZE
        );

    const activeAccount =
        detail?.id_provider_bank_account ===
            selectedAccount?.id_provider_bank_account
            ? detail
            : selectedAccount;

    const closeModal = useCallback(() => {
        if (saving) return;

        setModal(null);
        setSelectedAccount(null);
        setDetail(null);
        setDetailError("");
        setModalError("");
        setForm(emptyForm());
        setSelectedBankId("");
        setBankSearch("");
        setShowAccountNumber(false);
        setShowFormAccountNumber(false);
    }, [saving]);

    const openCreate = () => {
        setForm(emptyForm());
        setSelectedBankId("");
        setBankSearch("");
        setSelectedAccount(null);
        setDetail(null);
        setModalError("");
        setShowFormAccountNumber(false);
        setModal("create");
    };

    const openEdit = (
        account: BankAccount
    ) => {
        setSelectedAccount(account);
        setDetail(null);
        setForm(toForm(account));

        // Find exact bank name AND code.
        // Do not match only by code because
        // some banks share the same code.
        const catalogMatch = bankCatalog.find(
            (bank) =>
                bank.bank_code === account.bank_code &&
                bank.bank_name.trim().toLowerCase() ===
                account.bank_name.trim().toLowerCase()
        );

        setSelectedBankId(
            catalogMatch
                ? String(catalogMatch.id)
                : ""
        );

        setBankSearch("");
        setModalError("");
        setShowFormAccountNumber(false);
        setModal("edit");
    };

    const openDetail = (
        account: BankAccount
    ) => {
        setSelectedAccount(account);
        setDetail(null);
        setModalError("");
        setDetailError("");
        setShowAccountNumber(false);
        setModal("detail");
    };

    const openStatus = (
        account: BankAccount
    ) => {
        setSelectedAccount(account);
        setDetail(null);
        setModalError("");
        setModal("status");
    };

    const openVerification = (
        account: BankAccount
    ) => {
        setSelectedAccount(account);
        setDetail(null);
        setModalError("");
        setModal("verification");
    };

    const updateForm = (
        key: keyof BankForm,
        value: string
    ) => {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));

        if (modalError) {
            setModalError("");
        }
    };

    const selectedAccountId =
        selectedAccount?.id_provider_bank_account ??
        null;

    useEffect(() => {
        if (
            modal !== "detail" ||
            selectedAccountId === null
        ) {
            return;
        }

        const controller =
            new AbortController();

        const loadDetail = async () => {
            setDetailLoading(true);
            setDetailError("");

            try {
                const result =
                    await getBankAccountDetail(
                        selectedAccountId,
                        controller.signal
                    );

                if (!controller.signal.aborted) {
                    setDetail(result);
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    setDetailError(
                        getErrorMessage(error)
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setDetailLoading(false);
                }
            }
        };

        void loadDetail();

        return () => {
            controller.abort();
        };
    }, [modal, selectedAccountId]);

    const reloadAfterMutation =
        async (): Promise<boolean> => {
            try {
                const latest =
                    await getAllBankAccounts();

                setAccounts(latest);

                return true;
            } catch {
                return false;
            }
        };

    const completeMutation = (
        message: string,
        refreshed: boolean
    ) => {
        setModal(null);
        setSelectedAccount(null);
        setDetail(null);
        setForm(emptyForm());
        setSelectedBankId("");
        setBankSearch("");
        setModalError("");
        setDetailError("");

        setNotice({
            type: "success",
            message: refreshed
                ? message
                : `${message} Daftar belum dapat diperbarui. Silakan klik Refresh.`,
        });
    };

    const handleSave = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (saving) return;

        const editing = modal === "edit";

        if (
            modal !== "create" &&
            !editing
        ) {
            return;
        }

        // Provider validation
        if (asId(form.id_provider) === null) {
            setModalError(
                "Provider wajib dipilih."
            );
            return;
        }

        // Catalog validation
        if (bankCatalogError) {
            setModalError(
                "Bank Catalog belum berhasil dimuat. Silakan refresh halaman."
            );
            return;
        }

        if (!selectedBank) {
            setModalError(
                "Silakan pilih bank dari Bank Catalog."
            );
            return;
        }

        // Account number validation
        if (
            !/^[0-9]+$/.test(
                form.account_number.trim()
            )
        ) {
            setModalError(
                "Nomor rekening harus berupa angka."
            );
            return;
        }

        // Account holder validation
        if (
            !form.account_holder_name.trim()
        ) {
            setModalError(
                "Nama pemilik rekening wajib diisi."
            );
            return;
        }

        if (
            editing &&
            !selectedAccount
        ) {
            setModalError(
                "Rekening yang akan diedit tidak ditemukan."
            );
            return;
        }

        // Always get bank name and code
        // from selected Bank Catalog item.
        const payload: BankForm = {
            ...form,
            bank_code: selectedBank.bank_code,
            bank_name: selectedBank.bank_name,
        };

        setSaving(true);
        setModalError("");

        try {
            if (
                editing &&
                selectedAccount
            ) {
                await updateBankAccount(
                    selectedAccount.id_provider_bank_account,
                    payload
                );
            } else {
                await createBankAccount(
                    payload
                );
            }

            const refreshed =
                await reloadAfterMutation();

            completeMutation(
                editing
                    ? "Rekening provider berhasil diperbarui."
                    : "Rekening provider berhasil ditambahkan.",
                refreshed
            );
        } catch (error) {
            setModalError(
                getErrorMessage(error)
            );
        } finally {
            setSaving(false);
        }
    };

    const handleChangeStatus =
        async () => {
            if (
                !selectedAccount ||
                saving
            ) {
                return;
            }

            if (
                selectedAccount.is_active === null
            ) {
                setModalError(
                    "Status rekening tidak diketahui."
                );
                return;
            }

            const nextStatus =
                !selectedAccount.is_active;

            setSaving(true);
            setModalError("");

            try {
                await updateBankAccountStatus(
                    selectedAccount.id_provider_bank_account,
                    nextStatus
                );

                const refreshed =
                    await reloadAfterMutation();

                completeMutation(
                    nextStatus
                        ? "Rekening berhasil diaktifkan."
                        : "Rekening berhasil dinonaktifkan.",
                    refreshed
                );
            } catch (error) {
                setModalError(
                    getErrorMessage(error)
                );
            } finally {
                setSaving(false);
            }
        };

    const handleVerification =
        async () => {
            if (
                !selectedAccount ||
                saving
            ) {
                return;
            }

            if (
                selectedAccount.verification_status ===
                "VERIFIED"
            ) {
                setModalError(
                    "Rekening sudah terverifikasi."
                );
                return;
            }

            setSaving(true);
            setModalError("");

            try {
                await verifyBankAccount(
                    selectedAccount.id_provider_bank_account
                );

                const refreshed =
                    await reloadAfterMutation();

                completeMutation(
                    "Rekening berhasil diverifikasi.",
                    refreshed
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
        setNotice(null);

        setRefreshKey(
            (value) => value + 1
        );
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
            const editing =
                modal === "edit";

            return (
                <Modal
                    title={
                        editing
                            ? "Edit Rekening Provider"
                            : "Tambah Rekening Provider"
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
                                form="provider-bank-account-form"
                                disabled={
                                    saving ||
                                    loading ||
                                    !selectedBank ||
                                    !!bankCatalogError
                                }
                                className={primaryButton}
                            >
                                {saving ? (
                                    <LoaderCircle
                                        size={16}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Check size={16} />
                                )}

                                {saving
                                    ? "Menyimpan..."
                                    : editing
                                        ? "Simpan Perubahan"
                                        : "Tambah Rekening"}
                            </button>
                        </>
                    }
                >
                    {modalErrorView}

                    <form
                        id="provider-bank-account-form"
                        onSubmit={handleSave}
                        className="space-y-5"
                    >
                        {/* PROVIDER */}
                        <div>
                            <label
                                htmlFor="bank-provider"
                                className="mb-2 block text-xs font-semibold text-slate-700"
                            >
                                Provider *
                            </label>

                            <select
                                id="bank-provider"
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

                                {providers.map(
                                    (provider) => (
                                        <option
                                            key={provider.id_provider}
                                            value={provider.id_provider}
                                        >
                                            {provider.name_provider}
                                        </option>
                                    )
                                )}
                            </select>

                            {providers.length === 0 && (
                                <p className="mt-2 text-xs text-amber-700">
                                    Daftar provider belum tersedia.
                                    Periksa API /provider/get-all.
                                </p>
                            )}
                        </div>

                        {/* BANK CATALOG */}
                        <div className="rounded-xl border border-[#DBE4F0] bg-[#F8FAFD] p-4">
                            <div className="mb-4 flex items-center gap-2">
                                <Landmark
                                    size={18}
                                    className="text-[#0866D8]"
                                />

                                <h3 className="text-sm font-bold text-[#00357A]">
                                    Informasi Bank
                                </h3>
                            </div>

                            {bankCatalogError ? (
                                <div
                                    role="alert"
                                    className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3"
                                >
                                    <p className="text-xs text-red-700">
                                        Gagal memuat Bank Catalog:
                                        {" "}
                                        {bankCatalogError}
                                    </p>

                                    <button
                                        type="button"
                                        onClick={refreshData}
                                        className="mt-2 cursor-pointer text-xs font-semibold text-[#0866D8] hover:underline"
                                    >
                                        Coba Refresh
                                    </button>
                                </div>
                            ) : null}

                            {/* SEARCH BANK */}
                            <div className="mb-4">
                                <label
                                    htmlFor="bank-search"
                                    className="mb-2 block text-xs font-semibold text-slate-700"
                                >
                                    Cari Bank
                                </label>

                                <div className="relative">
                                    <Search
                                        size={16}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                    />

                                    <input
                                        id="bank-search"
                                        type="text"
                                        value={bankSearch}
                                        onChange={(event) =>
                                            setBankSearch(
                                                event.target.value
                                            )
                                        }
                                        placeholder="Cari nama, kode, atau SWIFT bank..."
                                        disabled={
                                            saving ||
                                            !!bankCatalogError
                                        }
                                        className={`${inputClass} pl-10`}
                                    />
                                </div>
                            </div>

                            {/* SELECT BANK */}
                            <div>
                                <label
                                    htmlFor="bank-catalog-select"
                                    className="mb-2 block text-xs font-semibold text-slate-700"
                                >
                                    Pilih Bank *
                                </label>

                                <select
                                    id="bank-catalog-select"
                                    value={selectedBankId}
                                    onChange={(event) =>
                                        selectCatalogBank(
                                            event.target.value
                                        )
                                    }
                                    disabled={
                                        saving ||
                                        !!bankCatalogError ||
                                        bankCatalog.length === 0
                                    }
                                    required
                                    className={inputClass}
                                >
                                    <option value="">
                                        Pilih Bank Tujuan
                                    </option>

                                    {filteredCatalogBanks.map(
                                        (bank) => (
                                            <option
                                                key={bank.id}
                                                value={bank.id}
                                            >
                                                {bank.bank_name} ({bank.bank_code})
                                                {bank.swift_code
                                                    ? ` - ${bank.swift_code}`
                                                    : ""}
                                            </option>
                                        )
                                    )}

                                    {/* Keep the selected bank visible even when search filters it out. */}
                                    {selectedBank &&
                                        !filteredCatalogBanks.some(
                                            (bank) =>
                                                bank.id === selectedBank.id
                                        ) && (
                                            <option
                                                value={selectedBank.id}
                                            >
                                                {selectedBank.bank_name}
                                                {" "}({selectedBank.bank_code})
                                            </option>
                                        )}
                                </select>

                                {bankCatalog.length > 0 && (
                                    <p className="mt-2 text-xs text-slate-500">
                                        {filteredCatalogBanks.length}
                                        {" "}dari{" "}
                                        {bankCatalog.length}
                                        {" "}bank tersedia.
                                    </p>
                                )}

                                {bankSearch &&
                                    filteredCatalogBanks.length === 0 && (
                                        <p className="mt-2 text-xs text-amber-700">
                                            Tidak ada bank yang cocok
                                            dengan pencarian.
                                        </p>
                                    )}

                                {editing &&
                                    form.bank_code &&
                                    form.bank_name &&
                                    !selectedBank &&
                                    !bankCatalogError && (
                                        <p className="mt-2 text-xs text-amber-700">
                                            Bank rekening sebelumnya:
                                            {" "}
                                            <strong>
                                                {form.bank_name}
                                                {" "}({form.bank_code})
                                            </strong>
                                            . Pilih bank dari katalog
                                            sebelum menyimpan perubahan.
                                        </p>
                                    )}
                            </div>

                            {/* AUTO-FILLED BANK DATA */}
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label
                                        htmlFor="bank-code"
                                        className="mb-2 block text-xs font-semibold text-slate-700"
                                    >
                                        Kode Bank
                                    </label>

                                    <input
                                        id="bank-code"
                                        type="text"
                                        value={selectedBank?.bank_code ?? ""}
                                        readOnly
                                        placeholder="Otomatis dari katalog"
                                        className={`${inputClass} bg-slate-100`}
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="bank-name"
                                        className="mb-2 block text-xs font-semibold text-slate-700"
                                    >
                                        Nama Bank
                                    </label>

                                    <input
                                        id="bank-name"
                                        type="text"
                                        value={selectedBank?.bank_name ?? ""}
                                        readOnly
                                        placeholder="Otomatis dari katalog"
                                        className={`${inputClass} bg-slate-100`}
                                    />
                                </div>
                            </div>

                            {selectedBank && (
                                <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3">
                                    <p className="text-xs text-blue-800">
                                        SWIFT Code:
                                        {" "}
                                        <strong>
                                            {selectedBank.swift_code ||
                                                "Tidak tercantum"}
                                        </strong>
                                    </p>

                                    <p className="mt-1 text-xs text-blue-700">
                                        Data bank dipilih dari
                                        DANA Beneficiary Bank Catalog.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* ACCOUNT NUMBER */}
                        <div>
                            <label
                                htmlFor="account-number"
                                className="mb-2 block text-xs font-semibold text-slate-700"
                            >
                                Nomor Rekening *
                            </label>

                            <div className="relative">
                                <input
                                    id="account-number"
                                    type={
                                        showFormAccountNumber
                                            ? "text"
                                            : "password"
                                    }
                                    inputMode="numeric"
                                    autoComplete="off"
                                    value={form.account_number}
                                    onChange={(event) =>
                                        updateForm(
                                            "account_number",
                                            event.target.value.replace(
                                                /\D/g,
                                                ""
                                            )
                                        )
                                    }
                                    placeholder="Masukkan nomor rekening"
                                    disabled={saving}
                                    required
                                    className={`${inputClass} pr-11`}
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowFormAccountNumber(
                                            (value) => !value
                                        )
                                    }
                                    aria-label={
                                        showFormAccountNumber
                                            ? "Sembunyikan nomor rekening"
                                            : "Tampilkan nomor rekening"
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400"
                                >
                                    {showFormAccountNumber ? (
                                        <EyeOff size={18} />
                                    ) : (
                                        <Eye size={18} />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* ACCOUNT HOLDER */}
                        <div>
                            <label
                                htmlFor="account-holder"
                                className="mb-2 block text-xs font-semibold text-slate-700"
                            >
                                Nama Pemilik Rekening *
                            </label>

                            <input
                                id="account-holder"
                                type="text"
                                value={form.account_holder_name}
                                onChange={(event) =>
                                    updateForm(
                                        "account_holder_name",
                                        event.target.value
                                    )
                                }
                                placeholder="Nama sesuai rekening bank"
                                disabled={saving}
                                required
                                className={inputClass}
                            />
                        </div>

                        {/* INFORMATION */}
                        <div className="rounded-lg bg-blue-50 p-3 text-xs leading-relaxed text-blue-800">
                            Pastikan bank, kode bank, nomor rekening,
                            dan nama pemilik sudah benar.
                            Perubahan data rekening dapat
                            memengaruhi proses settlement provider.
                            Pemilihan bank dari katalog tidak
                            otomatis memverifikasi nomor rekening.
                        </div>
                    </form>
                </Modal>
            );
        }

        if (
            modal === "detail" &&
            activeAccount
        ) {
            const account = activeAccount;

            return (
                <Modal
                    title="Detail Rekening Provider"
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
                                onClick={() =>
                                    openEdit(account)
                                }
                                className={primaryButton}
                            >
                                <Pencil size={16} />
                                Edit Rekening
                            </button>
                        </>
                    }
                >
                    {detailError && (
                        <div
                            role="alert"
                            className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700"
                        >
                            <AlertCircle
                                size={16}
                                className="shrink-0"
                            />

                            <span>
                                Detail tambahan tidak dapat dimuat:
                                {" "}
                                {detailError}.
                                Data dari daftar tetap ditampilkan.
                            </span>
                        </div>
                    )}

                    {detailLoading && (
                        <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
                            <LoaderCircle
                                size={15}
                                className="animate-spin"
                            />

                            Memuat detail rekening...
                        </div>
                    )}

                    {/* DETAIL HEADER */}
                    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0866D8]">
                                <Landmark size={27} />
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-slate-950">
                                    {account.bank_name || "Bank"}
                                </h3>

                                <p className="mt-1 text-xs text-slate-500">
                                    ID Rekening:
                                    {" "}
                                    {account.id_provider_bank_account}
                                </p>
                            </div>
                        </div>

                        <VerificationBadge
                            status={
                                account.verification_status
                            }
                        />
                    </div>

                    {/* BANK INFORMATION */}
                    <section className="border-t border-slate-100 pt-5">
                        <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#00357A]">
                            <CreditCard size={17} />
                            Informasi Rekening
                        </h4>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <DetailField
                                label="Nama Bank"
                                value={account.bank_name}
                            />

                            <DetailField
                                label="Kode Bank"
                                value={account.bank_code}
                            />

                            <DetailField
                                label="Nama Pemilik Rekening"
                                value={account.account_holder_name}
                            />

                            <div>
                                <p className="mb-2 text-xs text-[#526789]">
                                    Nomor Rekening
                                </p>

                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="break-all text-sm font-semibold text-slate-900">
                                        {showAccountNumber
                                            ? account.account_number || "—"
                                            : maskAccountNumber(
                                                account.account_number
                                            )}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowAccountNumber(
                                                (value) => !value
                                            )
                                        }
                                        aria-label={
                                            showAccountNumber
                                                ? "Sembunyikan nomor rekening"
                                                : "Tampilkan nomor rekening"
                                        }
                                        className={`${iconButtonClass} bg-slate-100 text-slate-600 hover:bg-slate-200`}
                                    >
                                        {showAccountNumber ? (
                                            <EyeOff size={17} />
                                        ) : (
                                            <Eye size={17} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* PROVIDER INFORMATION */}
                    <section className="mt-6 border-t border-slate-100 pt-5">
                        <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#00357A]">
                            <Building2 size={17} />
                            Informasi Provider
                        </h4>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <DetailField
                                label="Nama Provider"
                                value={providerName(
                                    account.id_provider
                                )}
                            />

                            <DetailField
                                label="ID Provider"
                                value={account.id_provider}
                            />
                        </div>
                    </section>

                    {/* ACCOUNT STATUS */}
                    <section className="mt-6 border-t border-slate-100 pt-5">
                        <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#00357A]">
                            <ShieldCheck size={17} />
                            Status Rekening
                        </h4>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <div>
                                <p className="mb-2 text-xs text-[#526789]">
                                    Status Aktivasi
                                </p>

                                <ActiveBadge
                                    active={account.is_active}
                                />
                            </div>

                            <div>
                                <p className="mb-2 text-xs text-[#526789]">
                                    Status Verifikasi
                                </p>

                                <VerificationBadge
                                    status={
                                        account.verification_status
                                    }
                                />
                            </div>
                        </div>
                    </section>
                </Modal>
            );
        }

        if (
            modal === "status" &&
            selectedAccount
        ) {
            const activating =
                selectedAccount.is_active === false;

            return (
                <Modal
                    title={
                        activating
                            ? "Aktifkan Rekening?"
                            : "Nonaktifkan Rekening?"
                    }
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
                                onClick={() =>
                                    void handleChangeStatus()
                                }
                                disabled={saving}
                                className={
                                    activating
                                        ? successButton
                                        : warningButton
                                }
                            >
                                {saving ? (
                                    <LoaderCircle
                                        size={16}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Check size={16} />
                                )}

                                {saving
                                    ? "Memproses..."
                                    : activating
                                        ? "Ya, Aktifkan"
                                        : "Ya, Nonaktifkan"}
                            </button>
                        </>
                    }
                >
                    {modalErrorView}

                    <p className="text-sm leading-relaxed text-slate-600">
                        Yakin ingin{" "}
                        <strong>
                            {activating
                                ? "mengaktifkan"
                                : "menonaktifkan"}
                        </strong>{" "}
                        rekening{" "}
                        <strong className="text-slate-950">
                            {selectedAccount.bank_name}
                            {" "}(
                            {maskAccountNumber(
                                selectedAccount.account_number
                            )}
                            )
                        </strong>
                        ?
                    </p>

                    <p className="mt-3 text-xs text-slate-500">
                        Perubahan status aktivasi dapat
                        memengaruhi penggunaan rekening
                        untuk settlement provider.
                    </p>
                </Modal>
            );
        }

        if (
            modal === "verification" &&
            selectedAccount
        ) {
            return (
                <Modal
                    title="Verifikasi Rekening?"
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
                                onClick={() =>
                                    void handleVerification()
                                }
                                disabled={saving}
                                className={successButton}
                            >
                                {saving ? (
                                    <LoaderCircle
                                        size={16}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <ShieldCheck size={16} />
                                )}

                                {saving
                                    ? "Memproses..."
                                    : "Ya, Verifikasi"}
                            </button>
                        </>
                    }
                >
                    {modalErrorView}

                    <p className="text-sm leading-relaxed text-slate-600">
                        Yakin ingin memverifikasi rekening{" "}
                        <strong className="text-slate-950">
                            {selectedAccount.bank_name}
                            {" "}(
                            {maskAccountNumber(
                                selectedAccount.account_number
                            )}
                            )
                        </strong>
                        ?
                    </p>

                    <p className="mt-3 text-xs text-slate-500">
                        Pastikan nomor rekening dan nama pemilik
                        sudah diperiksa sebelum menyetujui
                        verifikasi. Status VERIFIED digunakan
                        dalam proses pemilihan rekening settlement.
                    </p>
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
                        Provider & Keuangan / Rekening Provider
                    </p>

                    <h1 className="text-2xl font-bold text-slate-950 sm:text-[28px]">
                        Rekening Provider
                    </h1>

                    <p className="mt-2 text-sm text-[#526789]">
                        Kelola rekening bank, aktivasi,
                        dan verifikasi rekening provider.
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
                                loading
                                    ? "animate-spin"
                                    : ""
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
                        Tambah Rekening
                    </button>
                </div>
            </div>

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
                        onClick={() =>
                            setNotice(null)
                        }
                        aria-label="Tutup notifikasi"
                        className="cursor-pointer"
                    >
                        <X size={17} />
                    </button>
                </div>
            )}

            <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
                {[
                    {
                        label: "Total Rekening",
                        value: accounts.length,
                        icon: <Wallet size={19} />,
                    },
                    {
                        label: "Rekening Active",
                        value: activeCount,
                        icon: <CheckCircle2 size={19} />,
                    },
                    {
                        label: "Rekening Inactive",
                        value: inactiveCount,
                        icon: <Building2 size={19} />,
                    },
                    {
                        label: "Verified",
                        value: verifiedCount,
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

            {!loading &&
                !listError &&
                pendingCount > 0 && (
                    <div className="mb-5 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <AlertCircle
                            size={17}
                            className="shrink-0 text-amber-600"
                        />

                        <p className="text-xs text-amber-800">
                            Ada {pendingCount} rekening
                            berstatus Pending yang perlu ditinjau.
                        </p>
                    </div>
                )}

            <section className="overflow-hidden rounded-2xl border border-[#DBE4F0] bg-white shadow-sm">
                {/* FILTER BAR */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
                    <div>
                        <h2 className="text-sm font-bold text-slate-950">
                            Daftar Rekening Provider
                        </h2>

                        <p className="mt-1 text-xs text-[#526789]">
                            {loading
                                ? "Memuat..."
                                : `${filteredAccounts.length} rekening`}
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
                                placeholder="Cari rekening..."
                                className={`${inputClass} pl-10`}
                            />
                        </div>

                        {/* PROVIDER FILTER */}
                        <select
                            value={providerFilter}
                            onChange={(event) => {
                                setProviderFilter(
                                    event.target.value
                                );
                                setPage(1);
                            }}
                            aria-label="Filter provider"
                            className={`${filterClass} max-w-48`}
                        >
                            <option value="ALL">
                                Semua Provider
                            </option>

                            {providerOptions.map(
                                (provider) => (
                                    <option
                                        key={provider.id}
                                        value={provider.id}
                                    >
                                        {provider.name}
                                    </option>
                                )
                            )}
                        </select>

                        {/* ACTIVE FILTER */}
                        <select
                            value={activeFilter}
                            onChange={(event) => {
                                setActiveFilter(
                                    event.target.value
                                );
                                setPage(1);
                            }}
                            aria-label="Filter status aktivasi"
                            className={filterClass}
                        >
                            <option value="ALL">
                                Semua Aktivasi
                            </option>

                            <option value="ACTIVE">
                                Active
                            </option>

                            <option value="INACTIVE">
                                Inactive
                            </option>

                            <option value="UNKNOWN">
                                Unknown
                            </option>
                        </select>

                        {/* VERIFICATION FILTER */}
                        <select
                            value={verificationFilter}
                            onChange={(event) => {
                                setVerificationFilter(
                                    event.target.value
                                );
                                setPage(1);
                            }}
                            aria-label="Filter verifikasi"
                            className={filterClass}
                        >
                            <option value="ALL">
                                Semua Verifikasi
                            </option>

                            <option value="PENDING">
                                Pending
                            </option>

                            <option value="VERIFIED">
                                Verified
                            </option>

                            <option value="REJECTED">
                                Rejected
                            </option>

                            <option value="UNKNOWN">
                                Unknown
                            </option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-500">
                        <LoaderCircle
                            size={18}
                            className="animate-spin text-[#0866D8]"
                        />

                        Memuat data rekening...
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
                        <span>{listError}</span>
                    </div>
                ) : filteredAccounts.length === 0 ? (
                    <div className="flex min-h-40 flex-col items-center justify-center gap-3 p-6 text-center">
                        <Wallet
                            size={28}
                            className="text-slate-300"
                        />

                        <p className="text-sm text-slate-500">
                            Rekening provider tidak ditemukan.
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
                                        Bank
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        Provider
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        Nomor Rekening
                                    </th>

                                    <th className="px-5 py-3 text-xs font-semibold text-[#344F77]">
                                        Pemilik Rekening
                                    </th>

                                    <th className="px-5 py-3 text-center text-xs font-semibold text-[#344F77]">
                                        Aktivasi
                                    </th>

                                    <th className="px-5 py-3 text-center text-xs font-semibold text-[#344F77]">
                                        Verifikasi
                                    </th>

                                    <th className="px-5 py-3 text-center text-xs font-semibold text-[#344F77]">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {displayedAccounts.map(
                                    (account, index) => (
                                        <tr
                                            key={
                                                account.id_provider_bank_account
                                            }
                                            className="border-t border-slate-100 hover:bg-slate-50"
                                        >
                                            {/* NO. */}
                                            <td className="px-5 py-4 text-slate-500">
                                                {(currentPage - 1) *
                                                    PAGE_SIZE +
                                                    index +
                                                    1}
                                            </td>

                                            {/* BANK */}
                                            <td className="px-5 py-4">
                                                <div className="flex min-w-33.75 items-center gap-3">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0866D8]">
                                                        <Landmark size={19} />
                                                    </div>

                                                    <div>
                                                        <p className="font-semibold text-slate-950">
                                                            {account.bank_name || "—"}
                                                        </p>

                                                        <p className="mt-1 text-xs text-slate-500">
                                                            Kode:
                                                            {" "}
                                                            {account.bank_code || "—"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* PROVIDER */}
                                            <td className="px-5 py-4">
                                                <div className="min-w-33.75">
                                                    <p className="font-medium text-slate-800">
                                                        {providerName(
                                                            account.id_provider
                                                        )}
                                                    </p>

                                                    <p className="mt-1 text-xs text-slate-500">
                                                        ID:
                                                        {" "}
                                                        {account.id_provider ?? "—"}
                                                    </p>
                                                </div>
                                            </td>

                                            {/* ACCOUNT NUMBER */}
                                            <td className="px-5 py-4 font-medium text-slate-700">
                                                <span className="whitespace-nowrap">
                                                    {maskAccountNumber(
                                                        account.account_number
                                                    )}
                                                </span>
                                            </td>

                                            {/* HOLDER */}
                                            <td className="px-5 py-4 text-slate-600">
                                                <p className="max-w-50 truncate">
                                                    {account.account_holder_name ||
                                                        "—"}
                                                </p>
                                            </td>

                                            {/* ACTIVATION BADGE ONLY */}
                                            <td className="px-5 py-4 text-center">
                                                <ActiveBadge
                                                    active={account.is_active}
                                                />
                                            </td>

                                            {/* VERIFICATION */}
                                            <td className="px-5 py-4 text-center">
                                                <VerificationBadge
                                                    status={
                                                        account.verification_status
                                                    }
                                                />
                                            </td>

                                            {/* ACTIONS */}
                                            <td className="px-5 py-4">
                                                <div className="flex min-w-max items-center justify-center gap-2">
                                                    {/* DETAIL */}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openDetail(account)
                                                        }
                                                        title="Detail Rekening"
                                                        aria-label={`Detail rekening ${account.id_provider_bank_account}`}
                                                        className={`${iconButtonClass} bg-blue-50 text-[#0866D8] hover:bg-blue-100`}
                                                    >
                                                        <Eye size={18} />
                                                    </button>

                                                    {/* EDIT */}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openEdit(account)
                                                        }
                                                        title="Edit Rekening"
                                                        aria-label={`Edit rekening ${account.id_provider_bank_account}`}
                                                        className={`${iconButtonClass} bg-amber-50 text-amber-600 hover:bg-amber-100`}
                                                    >
                                                        <Pencil size={18} />
                                                    </button>

                                                    {/* SWITCH IN ACTION COLUMN */}
                                                    {account.is_active !== null ? (
                                                        <ToggleSwitch
                                                            checked={account.is_active}
                                                            onClick={() =>
                                                                openStatus(account)
                                                            }
                                                            label={
                                                                account.is_active
                                                                    ? `Nonaktifkan rekening ${account.bank_name}`
                                                                    : `Aktifkan rekening ${account.bank_name}`
                                                            }
                                                        />
                                                    ) : (
                                                        <span
                                                            title="Status aktivasi tidak diketahui"
                                                            className="flex h-9 w-12 items-center justify-center text-xs text-slate-400"
                                                        >
                                                            —
                                                        </span>
                                                    )}

                                                    {/* VERIFY */}
                                                    {account.verification_status !==
                                                        "VERIFIED" && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    openVerification(account)
                                                                }
                                                                title="Verifikasi Rekening"
                                                                aria-label={`Verifikasi rekening ${account.id_provider_bank_account}`}
                                                                className={`${iconButtonClass} bg-emerald-50 text-emerald-600 hover:bg-emerald-100`}
                                                            >
                                                                <ShieldCheck size={18} />
                                                            </button>
                                                        )}
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
                    filteredAccounts.length > 0 && (
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
                                    filteredAccounts.length
                                )}{" "}
                                dari{" "}
                                {filteredAccounts.length}
                            </p>

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    disabled={currentPage === 1}
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
                                    <ChevronLeft size={17} />
                                </button>

                                <span className="text-xs font-semibold">
                                    {currentPage}
                                    {" / "}
                                    {totalPages}
                                </span>

                                <button
                                    type="button"
                                    disabled={
                                        currentPage >= totalPages
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

export default ProviderBankAccount;
