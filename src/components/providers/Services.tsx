
import {
    useCallback,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type ComponentType,
    type FormEvent,
    type ReactNode,
} from "react";

import {
    useNavigate,
    useOutletContext,
} from "react-router-dom";

import {
    Plus,
    Search,
    RefreshCw,
    Pencil,
    Trash2,
    Package,
    CheckCircle2,
    Ban,
    X,
    Loader2,
    AlertCircle,
    Image as ImageIcon,
    FolderOpen,
    Check,
    ChevronLeft,
    ChevronRight,
    Save,
    UploadCloud,
    ClipboardList,
    Wallet,
    MapPin,
    Info,
    ImagePlus,
} from "lucide-react";

import { isTokenExpired } from "../../utils/auth";

type ServiceStatus = "ACTIVE" | "INACTIVE";
type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type ModalMode = "CREATE" | "EDIT";

interface ProviderUser {
    id_provider?: number | string;
    provider?: {
        id_provider?: number | string;
    };
}

interface ProviderContext {
    providerUser: ProviderUser | null;
    providerName: string;
    userName: string;
}

interface Service {
    id_service: number;
    id_provider: number | string;
    name_service: string;
    price_service: number | string;
    image_service?: string | null;
    description_service?: string | null;
    status_service: string;
    maps_service?: string | null;
    quota_service?: number | string | null;
    name_provider?: string;
}

interface ServiceForm {
    name_service: string;
    price_service: string;
    description_service: string;
    status_service: ServiceStatus;
    maps_service: string;
    quota_service: string;
    image_service: File | null;
}

interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
}

interface ServiceFormModalProps {
    mode: ModalMode;
    form: ServiceForm;
    existingImage?: string | null;
    processing: boolean;
    error: string;
    onChange: <K extends keyof ServiceForm>(
        key: K,
        value: ServiceForm[K]
    ) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onClose: () => void;
}

const PAGE_SIZE = 10;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white " +
    "px-4 py-3 text-sm text-slate-800 outline-none transition " +
    "placeholder:text-slate-400 focus:border-blue-500 " +
    "focus:ring-4 focus:ring-blue-100 " +
    "disabled:cursor-not-allowed disabled:bg-slate-50";

const getProviderToken = (): string | null =>
    sessionStorage.getItem("provider_token") ||
    localStorage.getItem("provider_token");

const clearProviderSession = () => {
    sessionStorage.removeItem("provider_token");
    localStorage.removeItem("provider_token");
    sessionStorage.removeItem("provider_user_data");
    localStorage.removeItem("provider_user_data");
};

const getStoredProviderId = (): number | null => {
    try {
        const stored =
            localStorage.getItem("provider_user_data") ||
            sessionStorage.getItem("provider_user_data");

        if (!stored) return null;

        const data = JSON.parse(stored);

        const rawId =
            data?.id_provider ??
            data?.provider?.id_provider ??
            data?.provider_user?.id_provider ??
            data?.provider_user?.provider?.id_provider ??
            data?.data?.id_provider ??
            data?.data?.provider?.id_provider ??
            data?.data?.provider_user?.id_provider;

        const id = Number(rawId);

        return rawId != null &&
            rawId !== "" &&
            Number.isSafeInteger(id) &&
            id > 0
            ? id
            : null;
    } catch {
        return null;
    }
};

const formatRupiah = (
    value: string | number
): string => {
    const amount = Number(value);

    if (!Number.isFinite(amount)) return "-";

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(amount);
};

const isActive = (status?: string): boolean =>
    status?.toUpperCase() === "ACTIVE";

const getEmptyForm = (): ServiceForm => ({
    name_service: "",
    price_service: "",
    description_service: "",
    status_service: "ACTIVE",
    maps_service: "",
    quota_service: "",
    image_service: null,
});

const parseApiResponse = async <T,>(
    response: Response
): Promise<ApiResponse<T>> => {
    const result = await response.json().catch(() => {
        throw new Error("Respons server tidak valid.");
    });

    if (!result || typeof result !== "object") {
        throw new Error("Format respons server tidak valid.");
    }

    return result as ApiResponse<T>;
};

const getApiError = (
    result: ApiResponse,
    status: number
): string => {
    if (status === 401) {
        return "Sesi login telah berakhir.";
    }

    if (status === 403) {
        return (
            result.message ||
            "Anda tidak memiliki izin mengelola layanan ini."
        );
    }

    return (
        result.message ||
        `Permintaan gagal (${status}).`
    );
};

interface FormFieldProps {
    id: string;
    label: string;
    required?: boolean;
    hint?: string;
    children: ReactNode;
}

const FormField = ({
    id,
    label,
    required = false,
    hint,
    children,
}: FormFieldProps) => (
    <div className="space-y-2">
        <label
            htmlFor={id}
            className="block text-sm font-semibold text-slate-700"
        >
            {label}
            {required && (
                <span className="ml-1 text-red-500">*</span>
            )}
        </label>

        {children}

        {hint && (
            <p className="text-xs leading-5 text-slate-400">
                {hint}
            </p>
        )}
    </div>
);

interface FormSectionProps {
    icon: ComponentType<{
        size?: number;
        className?: string;
    }>;
    title: string;
    description: string;
    children: ReactNode;
}

const FormSection = ({
    icon: Icon,
    title,
    description,
    children,
}: FormSectionProps) => (
    <section className="space-y-5">
        <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Icon size={21} />
            </div>

            <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-slate-900">
                    {title}
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                    {description}
                </p>
            </div>
        </div>

        {children}
    </section>
);

const ServiceFormModal = ({
    mode,
    form,
    existingImage,
    processing,
    error,
    onChange,
    onSubmit,
    onClose,
}: ServiceFormModalProps) => {
    const id = useId();

    const createId = (field: string) =>
        `${id}-${field}`;

    const fileInputRef = useRef<HTMLInputElement>(null);

    const [imageError, setImageError] = useState("");
    const [previewUrl, setPreviewUrl] =
        useState<string | null>(null);

    const isEdit = mode === "EDIT";

    // IMAGE PREVIEW
    useEffect(() => {
        if (!form.image_service) {
            setPreviewUrl(existingImage || null);
            return;
        }

        const url = URL.createObjectURL(
            form.image_service
        );

        setPreviewUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [form.image_service, existingImage]);

    // IMAGE VALIDATION
    const handleFileChange = (
        event: ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];

        event.target.value = "";

        if (!file) return;

        setImageError("");

        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
            setImageError(
                "Format gambar harus JPG, PNG, atau WEBP."
            );
            return;
        }

        if (file.size > MAX_IMAGE_SIZE) {
            setImageError(
                "Ukuran gambar maksimal 5 MB."
            );
            return;
        }

        onChange("image_service", file);
    };

    // PRICE FORMAT
    const formattedPrice = form.price_service
        ? new Intl.NumberFormat("id-ID").format(
            Number(form.price_service)
        )
        : "";

    const handlePriceChange = (value: string) => {
        const digits = value.replace(/\D/g, "");

        if (digits.length > 15) return;

        onChange("price_service", digits);
    };

    const handleQuotaChange = (value: string) => {
        if (value && !/^\d+$/.test(value)) return;

        onChange("quota_service", value);
    };

    const handleFormSubmit = (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (processing || imageError) return;

        onSubmit(event);
    };

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/60 p-3 sm:p-5">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={createId("title")}
                className="flex max-h-[94dvh] w-full max-w-180 flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
                {/* HEADER */}
                <div className="flex shrink-0 items-center justify-between gap-4 border-b border-blue-100 bg-blue-50/70 px-5 py-5 sm:px-7">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
                            {isEdit ? (
                                <Pencil size={22} />
                            ) : (
                                <Plus size={22} />
                            )}
                        </div>

                        <div className="min-w-0">
                            <h2
                                id={createId("title")}
                                className="text-lg font-extrabold text-slate-900 sm:text-xl"
                            >
                                {isEdit
                                    ? "Edit Layanan"
                                    : "Tambah Layanan Baru"}
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                                {isEdit
                                    ? "Perbarui informasi layanan kesehatan."
                                    : "Lengkapi informasi layanan yang ingin ditawarkan."}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={processing}
                        aria-label="Tutup form layanan"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                    >
                        <X size={19} />
                    </button>
                </div>

                {/* FORM */}
                <form
                    onSubmit={handleFormSubmit}
                    className="flex min-h-0 flex-1 flex-col"
                >
                    <div className="min-h-0 flex-1 space-y-8 overflow-x-hidden overflow-y-auto px-5 py-6 sm:px-7">
                        {(error || imageError) && (
                            <div
                                role="alert"
                                className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
                            >
                                <AlertCircle
                                    size={20}
                                    className="shrink-0 text-red-600"
                                />

                                <p className="text-sm text-red-700">
                                    {imageError || error}
                                </p>
                            </div>
                        )}

                        {/* INFORMATION */}
                        <FormSection
                            icon={ClipboardList}
                            title="Informasi Layanan"
                            description="Informasi utama yang akan dilihat customer."
                        >
                            <FormField
                                id={createId("name")}
                                label="Nama Layanan"
                                required
                            >
                                <input
                                    id={createId("name")}
                                    required
                                    maxLength={150}
                                    disabled={processing}
                                    value={form.name_service}
                                    onChange={(e) =>
                                        onChange(
                                            "name_service",
                                            e.target.value
                                        )
                                    }
                                    placeholder="Contoh: General Medical Check Up"
                                    className={inputClass}
                                />
                            </FormField>

                            <FormField
                                id={createId("description")}
                                label="Deskripsi Layanan"
                                hint="Jelaskan layanan secara singkat dan mudah dipahami."
                            >
                                <textarea
                                    id={createId("description")}
                                    rows={4}
                                    maxLength={1000}
                                    disabled={processing}
                                    value={form.description_service}
                                    onChange={(e) =>
                                        onChange(
                                            "description_service",
                                            e.target.value
                                        )
                                    }
                                    placeholder="Jelaskan pemeriksaan, manfaat, dan layanan yang diberikan..."
                                    className={`${inputClass} resize-none`}
                                />

                                <p className="mt-1 text-right text-[11px] text-slate-400">
                                    {form.description_service.length}/1000
                                </p>
                            </FormField>
                        </FormSection>

                        <div className="border-t border-slate-100" />

                        {/* PRICE & AVAILABILITY */}
                        <FormSection
                            icon={Wallet}
                            title="Harga & Ketersediaan"
                            description="Atur harga, kuota, dan status layanan."
                        >
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <FormField
                                    id={createId("price")}
                                    label="Harga Layanan"
                                    required
                                >
                                    <div className="relative">
                                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-blue-600">
                                            Rp
                                        </span>

                                        <input
                                            id={createId("price")}
                                            required
                                            type="text"
                                            inputMode="numeric"
                                            disabled={processing}
                                            value={formattedPrice}
                                            onChange={(e) =>
                                                handlePriceChange(e.target.value)
                                            }
                                            placeholder="200.000"
                                            className={`${inputClass} pl-12`}
                                        />
                                    </div>
                                </FormField>

                                <FormField
                                    id={createId("quota")}
                                    label="Kuota Layanan"
                                    required
                                    hint="Jumlah slot layanan yang tersedia."
                                >
                                    <input
                                        id={createId("quota")}
                                        required
                                        type="text"
                                        inputMode="numeric"
                                        disabled={processing}
                                        value={form.quota_service}
                                        onChange={(e) =>
                                            handleQuotaChange(e.target.value)
                                        }
                                        placeholder="10"
                                        className={inputClass}
                                    />
                                </FormField>
                            </div>

                            {/* STATUS */}
                            <div className="flex items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                                <div className="flex min-w-0 items-start gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600">
                                        <CheckCircle2 size={20} />
                                    </div>

                                    <div>
                                        <p className="text-sm font-bold text-slate-800">
                                            Status Layanan
                                        </p>

                                        <p className="mt-1 text-xs leading-5 text-slate-500">
                                            {form.status_service === "ACTIVE"
                                                ? "Layanan aktif dan dapat ditampilkan kepada customer."
                                                : "Layanan tidak tersedia untuk pemesanan baru."}
                                        </p>

                                        <span
                                            className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${form.status_service === "ACTIVE"
                                                ? "bg-blue-100 text-blue-700"
                                                : "bg-slate-200 text-slate-600"
                                                }`}
                                        >
                                            {form.status_service === "ACTIVE"
                                                ? "Active"
                                                : "Non Active"}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={
                                        form.status_service === "ACTIVE"
                                    }
                                    aria-label="Aktifkan atau nonaktifkan layanan"
                                    disabled={processing}
                                    onClick={() =>
                                        onChange(
                                            "status_service",
                                            form.status_service === "ACTIVE"
                                                ? "INACTIVE"
                                                : "ACTIVE"
                                        )
                                    }
                                    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:opacity-50 ${form.status_service === "ACTIVE"
                                        ? "bg-blue-600"
                                        : "bg-slate-300"
                                        }`}
                                >
                                    <span
                                        className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${form.status_service === "ACTIVE"
                                            ? "translate-x-6"
                                            : "translate-x-1"
                                            }`}
                                    />
                                </button>
                            </div>
                        </FormSection>

                        <div className="border-t border-slate-100" />

                        {/* MEDIA */}
                        <FormSection
                            icon={ImagePlus}
                            title="Media & Lokasi"
                            description="Tambahkan foto dan lokasi layanan."
                        >
                            <FormField
                                id={createId("image")}
                                label="Gambar Layanan"
                                required={!isEdit}
                                hint="JPG, PNG, atau WEBP. Maksimal 5 MB."
                            >
                                <input
                                    id={createId("image")}
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    disabled={processing}
                                    onChange={handleFileChange}
                                    className="sr-only"
                                    aria-label="Pilih gambar layanan"
                                />

                                <div className="overflow-hidden rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/30">
                                    {previewUrl ? (
                                        <div className="p-3">
                                            <img
                                                src={previewUrl}
                                                alt="Preview gambar layanan"
                                                className="h-44 w-full rounded-xl object-cover sm:h-52"
                                            />

                                            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                                                <p className="min-w-0 flex-1 truncate text-xs text-slate-500">
                                                    {form.image_service?.name ||
                                                        "Gambar layanan saat ini"}
                                                </p>

                                                <div className="flex gap-2">
                                                    {form.image_service && (
                                                        <button
                                                            type="button"
                                                            disabled={processing}
                                                            onClick={() => {
                                                                onChange(
                                                                    "image_service",
                                                                    null
                                                                );
                                                                setImageError("");
                                                            }}
                                                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"
                                                        >
                                                            Batalkan Ganti
                                                        </button>
                                                    )}

                                                    <button
                                                        type="button"
                                                        disabled={processing}
                                                        onClick={() =>
                                                            fileInputRef.current?.click()
                                                        }
                                                        className="rounded-lg bg-blue-100 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-200"
                                                    >
                                                        Ganti Gambar
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={processing}
                                            onClick={() =>
                                                fileInputRef.current?.click()
                                            }
                                            className="flex w-full flex-col items-center justify-center px-5 py-9 text-center hover:bg-blue-50"
                                        >
                                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                                                <UploadCloud size={28} />
                                            </div>

                                            <p className="mt-4 text-sm font-bold text-blue-700">
                                                Pilih Gambar Layanan
                                            </p>

                                            <p className="mt-1 text-xs text-slate-400">
                                                JPG, PNG, atau WEBP (maks. 5 MB)
                                            </p>
                                        </button>
                                    )}
                                </div>
                            </FormField>

                            <FormField
                                id={createId("maps")}
                                label="Lokasi / Google Maps"
                                hint="Opsional. Tambahkan tautan lokasi pelayanan."
                            >
                                <div className="relative">
                                    <MapPin
                                        size={19}
                                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-blue-500"
                                    />

                                    <input
                                        id={createId("maps")}
                                        type="text"
                                        disabled={processing}
                                        value={form.maps_service}
                                        onChange={(e) =>
                                            onChange(
                                                "maps_service",
                                                e.target.value
                                            )
                                        }
                                        placeholder="https://maps.google.com/..."
                                        className={`${inputClass} pl-12`}
                                    />
                                </div>
                            </FormField>
                        </FormSection>

                        <div className="flex items-start gap-3 rounded-xl bg-blue-50 p-4">
                            <Info
                                size={18}
                                className="mt-0.5 shrink-0 text-blue-600"
                            />

                            <p className="text-xs leading-6 text-blue-700">
                                Pastikan informasi layanan sudah benar
                                sebelum disimpan. Layanan aktif dapat
                                ditampilkan kepada customer.
                            </p>
                        </div>
                    </div>

                    {/* FOOTER */}
                    <div className="flex shrink-0 items-center justify-end gap-3 border-t border-blue-100 bg-white px-5 py-4 sm:px-7">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={processing}
                            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                            Batal
                        </button>

                        <button
                            type="submit"
                            disabled={processing || Boolean(imageError)}
                            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {processing ? (
                                <Loader2
                                    size={18}
                                    className="animate-spin"
                                />
                            ) : (
                                <Save size={18} />
                            )}

                            {processing
                                ? "Menyimpan..."
                                : isEdit
                                    ? "Simpan Perubahan"
                                    : "Tambah Layanan"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ServiceIdentity = ({
    service,
}: {
    service: Service;
}) => (
    <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-50">
            {service.image_service ? (
                <img
                    src={service.image_service}
                    alt={service.name_service}
                    className="h-full w-full object-cover"
                    loading="lazy"
                />
            ) : (
                <ImageIcon
                    size={23}
                    className="text-blue-300"
                />
            )}
        </div>

        <div className="min-w-0">
            <p className="max-w-55 truncate text-sm font-bold text-slate-900">
                {service.name_service}
            </p>

            <p className="mt-1 max-w-57.5 truncate text-xs text-slate-500">
                {service.description_service || "Tanpa deskripsi"}
            </p>

            <p className="mt-1 text-[11px] text-slate-400">
                ID: {service.id_service}
            </p>
        </div>
    </div>
);

const StatusBadge = ({
    active,
}: {
    active: boolean;
}) => (
    <span
        className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-bold ${active
            ? "bg-blue-50 text-blue-700"
            : "bg-slate-100 text-slate-500"
            }`}
    >
        {active ? "Active" : "Non Active"}
    </span>
);

interface StatusToggleProps {
    active: boolean;
    loading: boolean;
    disabled: boolean;
    name: string;
    onToggle: () => void;
}

const StatusToggle = ({
    active,
    loading,
    disabled,
    name,
    onToggle,
}: StatusToggleProps) => (
    <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label={`Ubah status layanan ${name}`}
        onClick={onToggle}
        disabled={disabled || loading}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:opacity-60 ${active ? "bg-blue-600" : "bg-slate-300"
            }`}
    >
        <span
            className={`flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform ${active ? "translate-x-6" : "translate-x-1"
                }`}
        >
            {loading ? (
                <Loader2
                    size={12}
                    className="animate-spin text-blue-600"
                />
            ) : active ? (
                <Check size={12} className="text-blue-600" />
            ) : null}
        </span>
    </button>
);

interface ActionButtonProps {
    title: string;
    icon: ComponentType<{
        size?: number;
        className?: string;
    }>;
    danger?: boolean;
    disabled?: boolean;
    onClick: () => void;
}

const ActionButton = ({
    title,
    icon: Icon,
    danger = false,
    disabled = false,
    onClick,
}: ActionButtonProps) => (
    <button
        type="button"
        title={title}
        aria-label={title}
        disabled={disabled}
        onClick={onClick}
        className={`rounded-lg border p-2.5 transition disabled:opacity-50 ${danger
            ? "border-red-100 text-red-600 hover:bg-red-50"
            : "border-blue-100 text-blue-600 hover:bg-blue-50"
            }`}
    >
        <Icon size={17} />
    </button>
);

const Services = () => {
    const navigate = useNavigate();

    const { providerUser, providerName } =
        useOutletContext<ProviderContext>();

    const contextId =
        providerUser?.id_provider ??
        providerUser?.provider?.id_provider;

    const parsedId = Number(contextId);

    const providerId =
        contextId != null &&
            contextId !== "" &&
            Number.isSafeInteger(parsedId) &&
            parsedId > 0
            ? parsedId
            : getStoredProviderId();

    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const [search, setSearch] = useState("");
    const [filter, setFilter] =
        useState<StatusFilter>("ALL");

    const [page, setPage] = useState(1);
    const [refreshKey, setRefreshKey] = useState(0);

    const [modalMode, setModalMode] =
        useState<ModalMode | null>(null);

    const [selectedService, setSelectedService] =
        useState<Service | null>(null);

    const [deleteService, setDeleteService] =
        useState<Service | null>(null);

    const [form, setForm] =
        useState<ServiceForm>(getEmptyForm);

    const [formError, setFormError] = useState("");
    const [togglingId, setTogglingId] =
        useState<number | null>(null);

    const redirectToLogin = useCallback(() => {
        clearProviderSession();

        navigate("/provider/sign-in", {
            replace: true,
        });
    }, [navigate]);

    const requireToken = (): string | null => {
        const token = getProviderToken();

        if (!token || isTokenExpired(token)) {
            redirectToLogin();
            return null;
        }

        return token;
    };

    const mutationRequest = async (
        endpoint: string,
        method: "POST" | "PATCH" | "DELETE",
        token: string,
        body?: FormData
    ): Promise<ApiResponse> => {
        const response = await fetch(
            `${import.meta.env.VITE_API_URI}${endpoint}`,
            {
                method,
                headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body,
            }
        );

        if (response.status === 401) {
            redirectToLogin();
            throw new Error("Sesi login telah berakhir.");
        }

        const result = await parseApiResponse(response);

        if (!response.ok || !result.success) {
            throw new Error(
                getApiError(result, response.status)
            );
        }

        return result;
    };

    useEffect(() => {
        const controller = new AbortController();

        const fetchServices = async () => {
            setLoading(true);
            setErrorMessage("");

            if (!providerId) {
                setServices([]);
                setErrorMessage(
                    "ID provider tidak ditemukan. Silakan login kembali."
                );
                setLoading(false);
                return;
            }

            const token = getProviderToken();

            if (!token || isTokenExpired(token)) {
                redirectToLogin();
                return;
            }

            try {
                const response = await fetch(
                    `${import.meta.env.VITE_API_URI}/service/provider/${providerId}`,
                    {
                        method: "GET",
                        headers: {
                            Accept: "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        cache: "no-store",
                        signal: controller.signal,
                    }
                );

                if (response.status === 401) {
                    redirectToLogin();
                    return;
                }

                const result =
                    await parseApiResponse<Service[]>(response);

                if (!response.ok || !result.success) {
                    throw new Error(
                        getApiError(result, response.status)
                    );
                }

                if (!Array.isArray(result.data)) {
                    throw new Error(
                        "Format daftar layanan tidak valid."
                    );
                }

                const scoped = result.data.filter(
                    (item) =>
                        Number(item.id_provider) === providerId
                );

                if (controller.signal.aborted) return;

                setServices(scoped);
            } catch (error) {
                if (controller.signal.aborted) return;

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Gagal mengambil daftar layanan."
                );
                setServices([]);
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        void fetchServices();

        return () => controller.abort();
    }, [providerId, refreshKey, redirectToLogin]);

    const summary = useMemo(() => {
        const active = services.filter((service) =>
            isActive(service.status_service)
        ).length;

        return {
            total: services.length,
            active,
            inactive: services.length - active,
        };
    }, [services]);

    const filteredServices = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return services
            .filter((service) => {
                const searchable = [
                    service.id_service,
                    service.name_service,
                    service.description_service,
                ]
                    .filter((value) => value != null)
                    .join(" ")
                    .toLowerCase();

                const matchSearch =
                    !keyword || searchable.includes(keyword);

                const matchStatus =
                    filter === "ALL" ||
                    (filter === "ACTIVE"
                        ? isActive(service.status_service)
                        : !isActive(service.status_service));

                return matchSearch && matchStatus;
            })
            .sort((a, b) => b.id_service - a.id_service);
    }, [services, search, filter]);

    useEffect(() => {
        setPage(1);
    }, [search, filter]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredServices.length / PAGE_SIZE)
    );

    const currentPage = Math.min(page, totalPages);

    const visibleServices = filteredServices.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    const updateForm = <K extends keyof ServiceForm>(
        key: K,
        value: ServiceForm[K]
    ) => {
        setForm((previous) => ({
            ...previous,
            [key]: value,
        }));

        setFormError("");
    };

    const openCreate = () => {
        setSelectedService(null);
        setDeleteService(null);
        setForm(getEmptyForm());
        setFormError("");
        setModalMode("CREATE");
    };

    const openEdit = (service: Service) => {
        setSelectedService(service);
        setDeleteService(null);
        setFormError("");

        setForm({
            name_service: service.name_service,
            price_service: String(service.price_service),
            description_service:
                service.description_service || "",
            status_service: isActive(
                service.status_service
            )
                ? "ACTIVE"
                : "INACTIVE",
            maps_service: service.maps_service || "",
            quota_service: String(
                service.quota_service ?? ""
            ),
            image_service: null,
        });

        setModalMode("EDIT");
    };

    const closeModal = () => {
        if (processing) return;

        setModalMode(null);
        setSelectedService(null);
        setForm(getEmptyForm());
        setFormError("");
    };

    const validateForm = (): boolean => {
        const name = form.name_service.trim();
        const price = Number(form.price_service);
        const quota = Number(form.quota_service);

        if (!name) {
            setFormError("Nama layanan wajib diisi.");
            return false;
        }

        if (name.length > 150) {
            setFormError("Nama layanan maksimal 150 karakter.");
            return false;
        }

        if (form.description_service.length > 1000) {
            setFormError("Deskripsi maksimal 1000 karakter.");
            return false;
        }

        if (
            !form.price_service ||
            !Number.isSafeInteger(price) ||
            price <= 0
        ) {
            setFormError(
                "Harga harus berupa bilangan bulat lebih dari Rp0."
            );
            return false;
        }

        if (
            form.quota_service.trim() === "" ||
            !Number.isSafeInteger(quota) ||
            quota < 0
        ) {
            setFormError(
                "Kuota harus berupa bilangan bulat minimal 0."
            );
            return false;
        }

        if (modalMode === "CREATE" && !form.image_service) {
            setFormError("Gambar layanan wajib diunggah.");
            return false;
        }

        return true;
    };

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (processing || !modalMode || !providerId) return;
        if (!validateForm()) return;

        const token = requireToken();
        if (!token) return;

        const editing = modalMode === "EDIT";

        if (editing && !selectedService) {
            setFormError("Layanan yang diedit tidak ditemukan.");
            return;
        }

        setProcessing(true);
        setFormError("");
        setSuccessMessage("");

        try {
            const formData = new FormData();

            formData.append(
                "name_service",
                form.name_service.trim()
            );
            formData.append(
                "price_service",
                form.price_service
            );
            formData.append(
                "description_service",
                form.description_service.trim()
            );
            formData.append(
                "status_service",
                form.status_service
            );
            formData.append(
                "maps_service",
                form.maps_service.trim()
            );
            formData.append(
                "quota_service",
                form.quota_service
            );
            formData.append(
                "id_provider",
                String(providerId)
            );

            if (form.image_service) {
                formData.append(
                    "image_service",
                    form.image_service
                );
            }

            const endpoint = editing
                ? `/service/${selectedService!.id_service}`
                : "/service/create";

            const result = await mutationRequest(
                endpoint,
                editing ? "PATCH" : "POST",
                token,
                formData
            );

            setSuccessMessage(
                result.message ||
                (editing
                    ? "Layanan berhasil diperbarui."
                    : "Layanan berhasil ditambahkan.")
            );

            closeModalAfterSave();
            setRefreshKey((value) => value + 1);
        } catch (error) {
            setFormError(
                error instanceof Error
                    ? error.message
                    : "Gagal menyimpan layanan."
            );
        } finally {
            setProcessing(false);
        }
    };

    const closeModalAfterSave = () => {
        setModalMode(null);
        setSelectedService(null);
        setForm(getEmptyForm());
        setFormError("");
    };

    const handleToggle = async (service: Service) => {
        if (processing || togglingId !== null) return;

        const token = requireToken();
        if (!token || !providerId) return;

        const nextStatus: ServiceStatus = isActive(
            service.status_service
        )
            ? "INACTIVE"
            : "ACTIVE";

        setTogglingId(service.id_service);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const formData = new FormData();

            formData.append("status_service", nextStatus);
            formData.append(
                "id_provider",
                String(providerId)
            );

            const result = await mutationRequest(
                `/service/${service.id_service}`,
                "PATCH",
                token,
                formData
            );

            setSuccessMessage(
                result.message ||
                `Layanan berhasil ${nextStatus === "ACTIVE"
                    ? "diaktifkan"
                    : "dinonaktifkan"
                }.`
            );

            setRefreshKey((value) => value + 1);
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Gagal mengubah status layanan."
            );
        } finally {
            setTogglingId(null);
        }
    };

    const handleDelete = async () => {
        if (!deleteService || processing) return;

        const token = requireToken();
        if (!token) return;

        setProcessing(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const result = await mutationRequest(
                `/service/${deleteService.id_service}`,
                "DELETE",
                token
            );

            setSuccessMessage(
                result.message || "Layanan berhasil dihapus."
            );

            setDeleteService(null);
            setRefreshKey((value) => value + 1);
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Gagal menghapus layanan."
            );
            setDeleteService(null);
        } finally {
            setProcessing(false);
        }
    };

    const refresh = () => {
        if (!loading) {
            setRefreshKey((value) => value + 1);
        }
    };

    return (
        <div className="min-h-full bg-[#F8FAFF]">
            <div className="mx-auto max-w-360 space-y-6 p-5 md:p-7 lg:p-8">
                {/* HEADER */}
                <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">
                            Provider Portal
                        </p>

                        <h1 className="mt-2 text-2xl font-extrabold text-slate-900 lg:text-3xl">
                            Services
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                            Kelola layanan kesehatan yang ditawarkan
                            oleh {providerName}.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={refresh}
                            disabled={loading}
                            className="flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                        >
                            <RefreshCw
                                size={17}
                                className={loading ? "animate-spin" : ""}
                            />
                            Refresh
                        </button>

                        <button
                            type="button"
                            onClick={openCreate}
                            disabled={!providerId || processing}
                            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            <Plus size={18} />
                            Tambah Layanan
                        </button>
                    </div>
                </section>

                {/* NOTIFICATIONS */}
                {successMessage && (
                    <div
                        role="status"
                        className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700"
                    >
                        <CheckCircle2 size={20} />
                        <span className="flex-1">
                            {successMessage}
                        </span>
                        <button
                            type="button"
                            aria-label="Tutup notifikasi"
                            onClick={() => setSuccessMessage("")}
                        >
                            <X size={17} />
                        </button>
                    </div>
                )}

                {errorMessage && (
                    <div
                        role="alert"
                        className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                    >
                        <AlertCircle size={20} />
                        <span className="flex-1">
                            {errorMessage}
                        </span>
                        <button
                            type="button"
                            aria-label="Tutup error"
                            onClick={() => setErrorMessage("")}
                        >
                            <X size={17} />
                        </button>
                    </div>
                )}

                {/* SUMMARY */}
                <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {[
                        {
                            label: "Total Services",
                            value: summary.total,
                            icon: Package,
                        },
                        {
                            label: "Active Services",
                            value: summary.active,
                            icon: CheckCircle2,
                        },
                        {
                            label: "Inactive Services",
                            value: summary.inactive,
                            icon: Ban,
                        },
                    ].map((item) => {
                        const Icon = item.icon;

                        return (
                            <div
                                key={item.label}
                                className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm text-slate-500">
                                            {item.label}
                                        </p>

                                        <h2 className="mt-3 text-3xl font-extrabold text-slate-900">
                                            {loading || errorMessage
                                                ? "—"
                                                : item.value}
                                        </h2>
                                    </div>

                                    <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                                        <Icon size={22} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </section>

                {/* SERVICE TABLE */}
                <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
                    <div className="border-b border-blue-100 p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-extrabold text-slate-900">
                                    Daftar Layanan
                                </h2>
                                <p className="mt-1 text-xs text-slate-500">
                                    Kelola informasi dan ketersediaan layanan.
                                </p>
                            </div>

                            <span className="text-xs font-semibold text-blue-600">
                                {filteredServices.length} layanan
                            </span>
                        </div>

                        <div className="mt-5 flex flex-col gap-3 lg:flex-row">
                            <div className="relative min-w-0 flex-1">
                                <Search
                                    size={18}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                />

                                <input
                                    type="search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Cari nama layanan atau ID..."
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <div className="flex gap-2 overflow-x-auto">
                                {(
                                    [
                                        ["ALL", "Semua"],
                                        ["ACTIVE", "Active"],
                                        ["INACTIVE", "Non Active"],
                                    ] as const
                                ).map(([value, label]) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setFilter(value)}
                                        className={`shrink-0 rounded-xl border px-4 py-2 text-xs font-bold ${filter === value
                                            ? "border-blue-600 bg-blue-600 text-white"
                                            : "border-slate-200 text-slate-500 hover:border-blue-300"
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center gap-3 py-20 text-sm text-slate-500">
                            <Loader2
                                size={24}
                                className="animate-spin text-blue-600"
                            />
                            Memuat layanan...
                        </div>
                    ) : errorMessage ? (
                        <div className="py-16 text-center">
                            <AlertCircle
                                size={36}
                                className="mx-auto text-red-400"
                            />
                            <p className="mt-3 text-sm text-slate-500">
                                Daftar layanan tidak dapat dimuat.
                            </p>
                        </div>
                    ) : filteredServices.length === 0 ? (
                        <div className="py-20 text-center">
                            <FolderOpen
                                size={42}
                                className="mx-auto text-blue-200"
                            />
                            <p className="mt-3 font-bold text-slate-800">
                                Belum Ada Layanan
                            </p>
                            <p className="mt-2 text-sm text-slate-500">
                                Tambahkan layanan atau ubah filter pencarian.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* DESKTOP */}
                            <div className="hidden overflow-x-auto lg:block">
                                <table className="w-full min-w-212.5 text-left">
                                    <thead className="bg-blue-50/70">
                                        <tr className="text-xs font-semibold text-slate-500">
                                            <th className="px-5 py-4">Layanan</th>
                                            <th className="px-4 py-4">Harga</th>
                                            <th className="px-4 py-4">Kuota</th>
                                            <th className="px-4 py-4">Status</th>
                                            <th className="px-4 py-4">Aktifkan</th>
                                            <th className="px-4 py-4 text-right">Aksi</th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100">
                                        {visibleServices.map((service) => (
                                            <tr
                                                key={service.id_service}
                                                className="hover:bg-blue-50/30"
                                            >
                                                <td className="px-5 py-4">
                                                    <ServiceIdentity service={service} />
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-4 text-sm font-bold">
                                                    {formatRupiah(service.price_service)}
                                                </td>
                                                <td className="px-4 py-4 text-sm">
                                                    {service.quota_service ?? "-"}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <StatusBadge
                                                        active={isActive(service.status_service)}
                                                    />
                                                </td>
                                                <td className="px-4 py-4">
                                                    <StatusToggle
                                                        active={isActive(service.status_service)}
                                                        loading={togglingId === service.id_service}
                                                        disabled={processing || togglingId !== null}
                                                        name={service.name_service}
                                                        onToggle={() => void handleToggle(service)}
                                                    />
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex justify-end gap-2">
                                                        <ActionButton
                                                            title="Edit"
                                                            icon={Pencil}
                                                            disabled={processing || togglingId !== null}
                                                            onClick={() => openEdit(service)}
                                                        />
                                                        <ActionButton
                                                            title="Hapus"
                                                            icon={Trash2}
                                                            danger
                                                            disabled={processing || togglingId !== null}
                                                            onClick={() => setDeleteService(service)}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* MOBILE */}
                            <div className="space-y-3 p-4 lg:hidden">
                                {visibleServices.map((service) => (
                                    <article
                                        key={service.id_service}
                                        className="rounded-xl border border-slate-200 p-4"
                                    >
                                        <ServiceIdentity service={service} />

                                        <div className="mt-4 grid grid-cols-2 gap-3">
                                            <div>
                                                <p className="text-xs text-slate-400">Harga</p>
                                                <p className="mt-1 text-sm font-bold">
                                                    {formatRupiah(service.price_service)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400">Kuota</p>
                                                <p className="mt-1 text-sm font-bold">
                                                    {service.quota_service ?? "-"}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex items-center justify-between border-t pt-4">
                                            <StatusBadge active={isActive(service.status_service)} />
                                            <StatusToggle
                                                active={isActive(service.status_service)}
                                                loading={togglingId === service.id_service}
                                                disabled={processing || togglingId !== null}
                                                name={service.name_service}
                                                onToggle={() => void handleToggle(service)}
                                            />
                                        </div>

                                        <div className="mt-4 flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openEdit(service)}
                                                disabled={processing || togglingId !== null}
                                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-xs font-bold text-blue-700 disabled:opacity-50"
                                            >
                                                <Pencil size={16} />
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDeleteService(service)}
                                                disabled={processing || togglingId !== null}
                                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-xs font-bold text-red-600 disabled:opacity-50"
                                            >
                                                <Trash2 size={16} />
                                                Hapus
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>

                            {/* PAGINATION */}
                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-blue-100 px-5 py-4">
                                {/* TOTAL DATA */}
                                <p className="text-xs text-slate-500">
                                    Menampilkan{" "}
                                    {(currentPage - 1) * PAGE_SIZE + 1}
                                    {" - "}
                                    {Math.min(
                                        currentPage * PAGE_SIZE,
                                        filteredServices.length
                                    )}{" "}
                                    dari {filteredServices.length}
                                </p>

                                {/* PAGE NAVIGATION */}
                                <div className="flex items-center gap-2">

                                    {/* PREVIOUS */}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPage((p) =>
                                                Math.max(1, p - 1)
                                            )
                                        }
                                        disabled={currentPage <= 1}
                                        aria-label="Halaman sebelumnya"
                                        className="cursor-pointer rounded-lg border border-slate-200 p-2 text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <ChevronLeft size={17} />
                                    </button>

                                    {/* CURRENT PAGE */}
                                    <span className="min-w-12 text-center text-xs font-semibold text-slate-700">
                                        {currentPage} / {totalPages}
                                    </span>

                                    {/* NEXT */}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPage((p) =>
                                                Math.min(
                                                    totalPages,
                                                    p + 1
                                                )
                                            )
                                        }
                                        disabled={currentPage >= totalPages}
                                        aria-label="Halaman berikutnya"
                                        className="cursor-pointer rounded-lg border border-slate-200 p-2 text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <ChevronRight size={17} />
                                    </button>

                                </div>
                            </div>
                        </>
                    )}
                </section>
            </div>

            {/* CREATE / EDIT MODAL */}
            {modalMode && (
                <ServiceFormModal
                    mode={modalMode}
                    form={form}
                    existingImage={
                        modalMode === "EDIT"
                            ? selectedService?.image_service
                            : null
                    }
                    processing={processing}
                    error={formError}
                    onChange={updateForm}
                    onSubmit={handleSubmit}
                    onClose={closeModal}
                />
            )}

            {/* DELETE MODAL */}
            {deleteService && (
                <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/60 p-4">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="delete-service-title"
                        className="w-full max-w-105 rounded-3xl bg-white p-6 shadow-2xl"
                    >
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                            <Trash2 size={26} />
                        </div>

                        <h2
                            id="delete-service-title"
                            className="mt-5 text-xl font-extrabold"
                        >
                            Hapus Layanan?
                        </h2>

                        <p className="mt-3 text-sm leading-6 text-slate-500">
                            Apakah Anda yakin ingin menghapus layanan{" "}
                            <strong>{deleteService.name_service}</strong>?
                        </p>

                        <p className="mt-3 text-xs leading-5 text-red-600">
                            Layanan dengan transaksi atau Health Pass
                            sebaiknya dinonaktifkan, bukan dihapus.
                        </p>

                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setDeleteService(null)}
                                disabled={processing}
                                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold"
                            >
                                Batal
                            </button>

                            <button
                                type="button"
                                onClick={() => void handleDelete()}
                                disabled={processing}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                            >
                                {processing && (
                                    <Loader2 size={17} className="animate-spin" />
                                )}
                                Ya, Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Services;
