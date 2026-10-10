
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    useNavigate,
    useOutletContext,
} from "react-router-dom";

import {
    UserRound,
    Building2,
    Mail,
    Phone,
    ShieldCheck,
    BadgeCheck,
    Clock3,
    Hash,
    RefreshCw,
    LogOut,
    AlertCircle,
    Loader2,
    ChevronRight,
    Wallet,
    Package,
    LockKeyhole,
    X,
    Info,
    MapPin,
    BriefcaseMedical,
    FileText,
    ExternalLink,
    MapPinned,
    FileCheck2,
} from "lucide-react";
import { isTokenExpired } from "../../utils/auth";

interface ProviderUser {
    id_provider_user?: number | string;
    id_provider?: number | string;

    name_provider_user?: string;
    email_provider_user?: string;
    phone_number_provider_user?: string;

    name_user?: string;
    email?: string;
    role?: string;
    name_role?: string;
    id_provider_role?: number | string;

    provider?: {
        id_provider?: number | string;
    };

    [key: string]: unknown;
}

interface Provider {
    id_provider: number | string;
    name_provider: string;

    email_provider?: string | null;
    phone_number_provider?: string | null;
    address_provider?: string | null;

    province_provider?: string | null;
    city_provider?: string | null;
    district_provider?: string | null;
    postal_code_provider?: string | null;

    logo_provider?: string | null;
    description_provider?: string | null;
    status_provider?: string | null;

    akta_pendirian_perusahaan?: string | null;
    nomor_induk_berusaha?: string | null;
    npwp?: string | null;
    sertifikat_standard?: string | null;
    persetujuan_lingkungan?: string | null;
    surat_izin_apotek?: string | null;

    id_platform?: number | string | null;
    id_provider_category?: number | string | null;

    name_provider_category?: string | null;
}

interface ProviderContext {
    providerUser?: ProviderUser | null;
    providerName?: string;
    userName?: string;
}

interface ProviderResponse {
    success: boolean;
    message?: string;
    provider?: Provider | null;
}

const getProviderToken = (): string | null =>
    sessionStorage.getItem("provider_token") ||
    localStorage.getItem("provider_token");

const clearProviderSession = () => {
    sessionStorage.removeItem("provider_token");
    localStorage.removeItem("provider_token");

    sessionStorage.removeItem("provider_user_data");
    localStorage.removeItem("provider_user_data");
};

const getStoredProviderUser = (): ProviderUser | null => {
    try {
        const raw =
            localStorage.getItem("provider_user_data") ||
            sessionStorage.getItem("provider_user_data");

        if (!raw) return null;

        const parsed = JSON.parse(raw);

        return (
            parsed?.provider_user ??
            parsed?.data?.provider_user ??
            parsed?.data ??
            parsed
        ) as ProviderUser;
    } catch {
        return null;
    }
};

const getValidId = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const id = Number(value);

    return Number.isSafeInteger(id) && id > 0
        ? id
        : null;
};

const displayValue = (
    value: string | number | null | undefined
): string => {
    if (value === null || value === undefined) {
        return "-";
    }

    const text = String(value).trim();

    return text || "-";
};

const formatStatus = (status: string): string => {
    switch (status.toUpperCase()) {
        case "APPROVED":
            return "Disetujui";

        case "PENDING_APPROVAL":
            return "Menunggu Persetujuan";

        case "PENDING_OTP":
            return "Menunggu Verifikasi";

        case "REJECTED":
            return "Ditolak";

        case "ACTIVE":
            return "Aktif";

        case "INACTIVE":
            return "Tidak Aktif";

        default:
            return status === "-" ? "Belum Tersedia" : status;
    }
};

const getStatusClass = (status: string): string => {
    switch (status.toUpperCase()) {
        case "APPROVED":
        case "ACTIVE":
            return "border-blue-200 bg-blue-50 text-blue-700";

        case "PENDING_APPROVAL":
        case "PENDING_OTP":
            return "border-amber-200 bg-amber-50 text-amber-700";

        case "REJECTED":
        case "INACTIVE":
            return "border-red-200 bg-red-50 text-red-700";

        default:
            return "border-slate-200 bg-slate-100 text-slate-600";
    }
};

const formatDateTime = (date: Date): string =>
    new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Jakarta",
    }).format(date);

const isValidDocumentUrl = (value: string | null | undefined) => {
    if (!value) return false;

    try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:";
    } catch {
        return false;
    }
};

const SectionHeader = ({
    icon: Icon,
    title,
    description,
}: {
    icon: typeof UserRound;
    title: string;
    description: string;
}) => (
    <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Icon size={21} />
        </div>

        <div className="min-w-0">
            <h2 className="text-base font-extrabold text-slate-900">
                {title}
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
                {description}
            </p>
        </div>
    </div>
);

const ProfileField = ({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof UserRound;
    label: string;
    value: string;
}) => (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600">
            <Icon size={18} />
        </div>

        <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-400">
                {label}
            </p>

            <p className="mt-1 wrap-break-word text-sm font-semibold text-slate-800">
                {value}
            </p>
        </div>
    </div>
);

const DocumentCard = ({
    title,
    description,
    url,
}: {
    title: string;
    description: string;
    url?: string | null;
}) => {
    const available = isValidDocumentUrl(url);

    return (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-200">
            <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${available
                    ? "bg-blue-50 text-blue-600"
                    : "bg-slate-100 text-slate-400"
                    }`}
            >
                <FileText size={21} />
            </div>

            <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800">
                    {title}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                    {description}
                </p>
            </div>

            {available ? (
                <a
                    href={url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                >
                    Lihat
                    <ExternalLink size={14} />
                </a>
            ) : (
                <span className="shrink-0 text-[11px] text-slate-400">
                    Belum Ada
                </span>
            )}
        </div>
    );
};

const Profile = () => {
    const navigate = useNavigate();

    const context =
        useOutletContext<ProviderContext | undefined>();

    const storedUser = useMemo(
        () => getStoredProviderUser(),
        []
    );

    const providerUser =
        context?.providerUser ?? storedUser;

    const providerId = getValidId(
        providerUser?.id_provider ??
        providerUser?.provider?.id_provider ??
        storedUser?.id_provider ??
        storedUser?.provider?.id_provider
    );

    const [provider, setProvider] =
        useState<Provider | null>(null);

    const [loading, setLoading] = useState(true);

    const [errorMessage, setErrorMessage] =
        useState("");

    const [refreshKey, setRefreshKey] =
        useState(0);

    const [lastUpdated, setLastUpdated] =
        useState<Date | null>(null);

    const [logoutModal, setLogoutModal] =
        useState(false);

    const redirectToLogin = useCallback(() => {
        clearProviderSession();

        navigate("/provider/sign-in", {
            replace: true,
        });
    }, [navigate]);

    useEffect(() => {
        const controller = new AbortController();

        const fetchProvider = async () => {
            setLoading(true);
            setErrorMessage("");

            const token = getProviderToken();

            if (!token || isTokenExpired(token)) {
                redirectToLogin();
                return;
            }

            if (!providerId) {
                setProvider(null);
                setErrorMessage(
                    "ID provider tidak ditemukan. Silakan login kembali."
                );
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(
                    `${import.meta.env.VITE_API_URI}/provider/${providerId}`,
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

                if (controller.signal.aborted) return;

                if (response.status === 401) {
                    redirectToLogin();
                    return;
                }

                if (response.status === 403) {
                    throw new Error(
                        "Anda tidak memiliki akses ke profil fasilitas ini."
                    );
                }

                const result =
                    (await response.json()) as ProviderResponse;

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message ||
                        `Gagal mengambil profil (${response.status}).`
                    );
                }

                // IMPORTANT:
                // API returns "provider", NOT "data".
                const providerData = result.provider;

                if (
                    !providerData ||
                    typeof providerData !== "object" ||
                    Array.isArray(providerData)
                ) {
                    throw new Error(
                        "Format respons provider tidak valid."
                    );
                }

                if (
                    getValidId(providerData.id_provider) !== providerId
                ) {
                    throw new Error(
                        "Data fasilitas tidak sesuai dengan akun yang sedang login."
                    );
                }

                if (controller.signal.aborted) return;

                setProvider(providerData);
                setLastUpdated(new Date());
            } catch (error) {
                if (controller.signal.aborted) return;

                setProvider(null);

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Gagal memuat informasi fasilitas."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        void fetchProvider();

        return () => controller.abort();
    }, [
        providerId,
        refreshKey,
        redirectToLogin,
    ]);

    const profileData = useMemo(() => {
        const user = providerUser;

        return {
            userName: displayValue(
                user?.name_provider_user ??
                user?.name_user ??
                context?.userName
            ),

            userEmail: displayValue(
                user?.email_provider_user ??
                user?.email
            ),

            userPhone: displayValue(
                user?.phone_number_provider_user
            ),

            userRole: displayValue(
                user?.name_role ??
                user?.role ??
                user?.id_provider_role
            ),

            userId: displayValue(
                user?.id_provider_user
            ),

            providerName: displayValue(
                provider?.name_provider ??
                context?.providerName
            ),

            providerEmail: displayValue(
                provider?.email_provider
            ),

            providerPhone: displayValue(
                provider?.phone_number_provider
            ),

            providerAddress: displayValue(
                provider?.address_provider
            ),

            providerProvince: displayValue(
                provider?.province_provider
            ),

            providerCity: displayValue(
                provider?.city_provider
            ),

            providerDistrict: displayValue(
                provider?.district_provider
            ),

            providerPostalCode: displayValue(
                provider?.postal_code_provider
            ),

            providerDescription: displayValue(
                provider?.description_provider
            ),

            providerStatus: displayValue(
                provider?.status_provider
            ),

            providerCategory: displayValue(
                provider?.name_provider_category ??
                provider?.id_provider_category
            ),

            providerPlatform: displayValue(
                provider?.id_platform
            ),
        };
    }, [providerUser, provider, context]);

    const documents = useMemo(
        () => [
            {
                title: "Akta Pendirian Perusahaan",
                description: "Dokumen pendirian badan usaha",
                url: provider?.akta_pendirian_perusahaan,
            },
            {
                title: "Nomor Induk Berusaha (NIB)",
                description: "Dokumen identitas perizinan usaha",
                url: provider?.nomor_induk_berusaha,
            },
            {
                title: "NPWP",
                description: "Dokumen perpajakan fasilitas",
                url: provider?.npwp,
            },
            {
                title: "Sertifikat Standar",
                description: "Dokumen sertifikasi usaha",
                url: provider?.sertifikat_standard,
            },
            {
                title: "Persetujuan Lingkungan",
                description: "Dokumen persetujuan lingkungan",
                url: provider?.persetujuan_lingkungan,
            },
            {
                title: "Surat Izin Apotek",
                description: "Dokumen izin operasional apotek",
                url: provider?.surat_izin_apotek,
            },
        ],
        [provider]
    );

    const availableDocuments = documents.filter(
        (document) => isValidDocumentUrl(document.url)
    ).length;

    const handleRefresh = () => {
        if (loading) return;

        setRefreshKey((value) => value + 1);
    };

    const handleLogout = () => {
        clearProviderSession();
        setLogoutModal(false);

        navigate("/provider/sign-in", {
            replace: true,
        });
    };

    return (
        <div className="min-h-full bg-[#F8FAFF]">
            <div className="mx-auto max-w-360 space-y-6 p-5 md:p-7 lg:p-8">
                <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">
                            Provider Portal
                        </p>

                        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 lg:text-3xl">
                            My Profile
                        </h1>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Informasi akun dan fasilitas kesehatan Anda.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={loading || !providerId}
                        className="cursor-pointer flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-50"
                    >
                        <RefreshCw
                            size={17}
                            className={loading ? "animate-spin" : ""}
                        />
                        Refresh Data
                    </button>
                </section>

                {errorMessage && (
                    <div
                        role="alert"
                        className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
                    >
                        <AlertCircle
                            size={20}
                            className="mt-0.5 shrink-0 text-red-600"
                        />

                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-red-800">
                                Gagal Memuat Profil Fasilitas
                            </p>

                            <p className="mt-1 text-xs leading-6 text-red-700">
                                {errorMessage}
                            </p>
                        </div>
                    </div>
                )}

                <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-blue-700 via-blue-600 to-sky-500 p-6 text-white shadow-lg shadow-blue-100 md:p-8">
                    <div className="pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full bg-white/10" />
                    <div className="pointer-events-none absolute -bottom-24 right-28 h-48 w-48 rounded-full bg-white/10" />

                    <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">

                        {/* PROVIDER LOGO */}

                        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/30 bg-white p-2 shadow-sm">
                            {provider?.logo_provider &&
                                isValidDocumentUrl(provider.logo_provider) ? (
                                <img
                                    src={provider.logo_provider}
                                    alt={`Logo ${profileData.providerName}`}
                                    className="h-full w-full object-contain"
                                />
                            ) : (
                                <Building2
                                    size={39}
                                    className="text-blue-600"
                                />
                            )}
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold uppercase tracking-widest text-blue-100">
                                Healthcare Provider
                            </p>

                            <h2 className="mt-2 wrap-break-word text-2xl font-extrabold md:text-3xl">
                                {profileData.providerName}
                            </h2>

                            <p className="mt-2 text-sm text-blue-100">
                                {profileData.providerCity !== "-"
                                    ? profileData.providerCity
                                    : "STIQR Health Provider Portal"}
                            </p>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {provider && (
                                    <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold">
                                        <BadgeCheck size={15} />
                                        {formatStatus(profileData.providerStatus)}
                                    </span>
                                )}

                                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold">
                                    <UserRound size={15} />
                                    {profileData.userRole === "-"
                                        ? "Provider User"
                                        : profileData.userRole}
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-3">
                    {/* USER ACCOUNT */}
                    <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm md:p-6 xl:col-span-2">
                        <SectionHeader
                            icon={UserRound}
                            title="Informasi Akun"
                            description="Detail akun yang digunakan untuk mengakses Provider Portal."
                        />

                        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <ProfileField
                                icon={UserRound}
                                label="Nama Pengguna"
                                value={profileData.userName}
                            />

                            <ProfileField
                                icon={Mail}
                                label="Email Pengguna"
                                value={profileData.userEmail}
                            />

                            <ProfileField
                                icon={Phone}
                                label="Nomor Telepon"
                                value={profileData.userPhone}
                            />

                            <ProfileField
                                icon={ShieldCheck}
                                label="Role Pengguna"
                                value={profileData.userRole}
                            />

                            <ProfileField
                                icon={Hash}
                                label="ID Pengguna"
                                value={profileData.userId}
                            />
                        </div>
                    </section>

                    {/* ACCOUNT SECURITY */}
                    <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm md:p-6">
                        <SectionHeader
                            icon={LockKeyhole}
                            title="Keamanan Akun"
                            description="Informasi akses akun Anda."
                        />

                        <div className="mt-6 space-y-4">
                            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600">
                                        <ShieldCheck size={20} />
                                    </div>

                                    <div>
                                        <p className="text-sm font-bold text-slate-800">
                                            Provider Portal
                                        </p>

                                        <p className="mt-1 text-xs text-slate-500">
                                            Informasi akun pengguna.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl bg-slate-50 p-4">
                                <p className="text-xs font-semibold text-slate-600">
                                    Keamanan Password
                                </p>

                                <p className="mt-2 text-xs leading-6 text-slate-500">
                                    Jangan membagikan kata sandi atau akses akun
                                    kepada pihak lain.
                                </p>
                            </div>

                            <div className="flex items-start gap-3 rounded-xl bg-blue-50 p-4">
                                <Info
                                    size={18}
                                    className="mt-0.5 shrink-0 text-blue-600"
                                />

                                <p className="text-xs leading-6 text-blue-700">
                                    Jika lupa password, gunakan fitur Lupa Password
                                    pada halaman login Provider.
                                </p>
                            </div>
                        </div>
                    </section>
                </div>

                <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm md:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <SectionHeader
                            icon={Building2}
                            title="Informasi Fasilitas Kesehatan"
                            description="Detail fasilitas kesehatan yang terdaftar."
                        />

                        {loading && (
                            <Loader2
                                size={20}
                                className="animate-spin text-blue-600"
                            />
                        )}
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <ProfileField
                            icon={Building2}
                            label="Nama Fasilitas"
                            value={profileData.providerName}
                        />

                        <ProfileField
                            icon={Hash}
                            label="Provider ID"
                            value={providerId ? String(providerId) : "-"}
                        />

                        <ProfileField
                            icon={BriefcaseMedical}
                            label="Kategori Provider"
                            value={profileData.providerCategory}
                        />

                        <ProfileField
                            icon={Mail}
                            label="Email Fasilitas"
                            value={profileData.providerEmail}
                        />

                        <ProfileField
                            icon={Phone}
                            label="Nomor Telepon Fasilitas"
                            value={profileData.providerPhone}
                        />

                        <ProfileField
                            icon={MapPin}
                            label="Alamat Fasilitas"
                            value={profileData.providerAddress}
                        />

                        <ProfileField
                            icon={MapPinned}
                            label="Provinsi"
                            value={profileData.providerProvince}
                        />

                        <ProfileField
                            icon={MapPinned}
                            label="Kota / Kabupaten"
                            value={profileData.providerCity}
                        />

                        <ProfileField
                            icon={MapPin}
                            label="Kecamatan"
                            value={profileData.providerDistrict}
                        />

                        <ProfileField
                            icon={Hash}
                            label="Kode Pos"
                            value={profileData.providerPostalCode}
                        />
                    </div>

                    {/* PROVIDER DESCRIPTION */}
                    <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/40 p-5">
                        <div className="flex items-center gap-2">
                            <Info
                                size={18}
                                className="text-blue-600"
                            />

                            <p className="text-sm font-bold text-slate-800">
                                Deskripsi Fasilitas
                            </p>
                        </div>

                        <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">
                            {profileData.providerDescription}
                        </p>
                    </div>

                    {/* PROVIDER STATUS */}
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-100 bg-white p-4">
                        <div>
                            <p className="text-sm font-bold text-slate-800">
                                Status Fasilitas
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                                Status persetujuan pendaftaran fasilitas Anda.
                            </p>
                        </div>

                        <span
                            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold ${getStatusClass(
                                profileData.providerStatus
                            )}`}
                        >
                            <BadgeCheck size={16} />
                            {formatStatus(profileData.providerStatus)}
                        </span>
                    </div>

                    {lastUpdated && (
                        <p className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                            <Clock3 size={14} />
                            Terakhir diperbarui:{" "}
                            {formatDateTime(lastUpdated)}
                        </p>
                    )}
                </section>

                <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm md:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <SectionHeader
                            icon={FileCheck2}
                            title="Dokumen Legalitas"
                            description="Dokumen legalitas dan perizinan fasilitas kesehatan."
                        />

                        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
                            <FileText size={15} />
                            {loading
                                ? "Memuat..."
                                : `${availableDocuments} dari ${documents.length} dokumen`}
                        </span>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
                        {documents.map((document) => (
                            <DocumentCard
                                key={document.title}
                                title={document.title}
                                description={document.description}
                                url={document.url}
                            />
                        ))}
                    </div>

                    <div className="mt-5 flex items-start gap-3 rounded-xl bg-blue-50 p-4">
                        <ShieldCheck
                            size={19}
                            className="mt-0.5 shrink-0 text-blue-600"
                        />

                        <p className="text-xs leading-6 text-blue-700">
                            Dokumen yang ditampilkan merupakan dokumen yang
                            telah terdaftar pada akun fasilitas kesehatan Anda.
                            Jika terdapat informasi yang perlu diperbarui,
                            silakan hubungi tim STIQR Health.
                        </p>
                    </div>
                </section>

                <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm md:p-6">
                    <SectionHeader
                        icon={Package}
                        title="Akses Cepat"
                        description="Akses kebutuhan operasional fasilitas kesehatan."
                    />

                    <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <button
                            type="button"
                            onClick={() =>
                                navigate("/provider/services")
                            }
                            className="cursor-pointer flex items-center gap-4 rounded-xl border border-blue-100 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
                        >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <Package size={21} />
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-800">
                                    Kelola Layanan
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                    Tambah dan perbarui layanan kesehatan.
                                </p>
                            </div>

                            <ChevronRight
                                size={18}
                                className="text-slate-400"
                            />
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                navigate("/provider/settlement")
                            }
                            className="cursor-pointer flex items-center gap-4 rounded-xl border border-blue-100 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
                        >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <Wallet size={21} />
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-800">
                                    Informasi Settlement
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                    Pantau saldo dan informasi pencairan.
                                </p>
                            </div>

                            <ChevronRight
                                size={18}
                                className="text-slate-400"
                            />
                        </button>
                    </div>
                </section>

                <section className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm md:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                                <LogOut size={21} />
                            </div>

                            <div>
                                <p className="text-sm font-extrabold text-slate-900">
                                    Keluar dari Akun
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                    Akhiri sesi akun pada perangkat ini.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setLogoutModal(true)}
                            className="cursor-pointer flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-600 transition hover:bg-red-100"
                        >
                            <LogOut size={17} />
                            Logout
                        </button>
                    </div>
                </section>

                {/* FOOTER */}

                <div className="border-t border-blue-100 pt-5 text-xs text-slate-400">
                    STIQR Health — Provider Profile
                </div>
            </div>

            {logoutModal && (
                <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/60 p-4">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="logout-title"
                        className="w-full max-w-105 rounded-3xl bg-white p-6 shadow-2xl"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                                <LogOut size={26} />
                            </div>

                            <button
                                type="button"
                                aria-label="Tutup dialog"
                                onClick={() => setLogoutModal(false)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                            >
                                <X size={19} />
                            </button>
                        </div>

                        <h2
                            id="logout-title"
                            className="mt-5 text-xl font-extrabold text-slate-900"
                        >
                            Keluar dari Akun?
                        </h2>

                        <p className="mt-3 text-sm leading-6 text-slate-500">
                            Anda akan keluar dari Provider Portal dan
                            perlu login kembali untuk mengakses akun.
                        </p>

                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setLogoutModal(false)}
                                className="cursor-pointer flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600"
                            >
                                Batal
                            </button>

                            <button
                                type="button"
                                onClick={handleLogout}
                                className="cursor-pointer flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700"
                            >
                                <LogOut size={17} />
                                Ya, Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
