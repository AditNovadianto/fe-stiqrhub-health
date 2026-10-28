import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    AlertCircle,
    ArrowLeft,
    Building2,
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    Clock3,
    FileText,
    Loader2,
    MapPin,
    ShieldCheck,
} from "lucide-react";

import { isTokenExpired } from "../../utils/auth";

interface Service {
    id_service: number;
    name_service: string;
    price_service: string | number;
    image_service: string | null;
    description_service: string | null;
    status_service: string;
    maps_service: string | null;
    quota_service: string | number;
    id_provider: number;
    name_provider?: string;
}

interface DetailServiceData {
    id_detail_service: number;
    benefits: string | null;
    location: string | null;
    hour: string | null;
    terms_and_conditions: string | null;
    included_services: string | null;
    id_service: number;
}

interface BranchService {
    id_service: number;
    name_service: string;
    price_service?: string | number;
    quota_service?: string | number;
    status_service?: string;
    id_provider: number;
    name_provider: string;
    address_provider?: string;
    district_provider?: string;
    city_provider?: string;
    province_provider?: string;
    id_provider_group?: number | null;
    name_provider_group?: string;
}

interface BranchOrigin {
    id_service: number;
    name_service: string;
    id_provider: number;
    name_provider: string;
    id_provider_group: number | null;
}

interface BranchResponseData {
    origin: BranchOrigin;
    branches: BranchService[];
}

interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
}

// Sesuai endpoint Postman yang sudah berhasil diuji.
const getBranchEndpoint = (serviceId: number) =>
    `/service/${serviceId}/branches`;

const formatRupiah = (
    value: string | number,
): string => {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
        return "Rp0";
    }

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(amount);
};

const parseList = (
    value?: string | null,
): string[] => {
    if (!value) return [];

    return value
        .split(/[,\n]+/)
        .map((item) => item.trim())
        .filter(Boolean);
};

const getFirstItem = <T,>(
    data: T | T[] | null | undefined,
): T | null => {
    if (data == null) return null;

    return Array.isArray(data)
        ? data[0] ?? null
        : data;
};

const fetchApi = async <T,>(
    endpoint: string,
    signal: AbortSignal,
): Promise<T> => {
    const response = await fetch(
        `${import.meta.env.VITE_API_URI}${endpoint}`,
        {
            method: "GET",
            headers: {
                Accept: "application/json",
            },
            signal,
        },
    );

    let result: ApiResponse<T>;

    try {
        result = (await response.json()) as ApiResponse<T>;
    } catch {
        throw new Error(
            "Respons server tidak valid.",
        );
    }

    if (!response.ok || result.success === false) {
        throw new Error(
            result.message ||
            `Request gagal (${response.status})`,
        );
    }

    if (result.data == null) {
        throw new Error("Data tidak tersedia.");
    }

    return result.data;
};

const formatBranchAddress = (
    branch: BranchService,
): string => {
    const parts = [
        branch.address_provider,
        branch.district_provider,
        branch.city_provider,
    ]
        .map((value) => value?.trim())
        .filter(Boolean);

    return [...new Set(parts)].join(", ");
};

const DetailService = () => {
    const navigate = useNavigate();

    const { id_service } = useParams<{
        id_service: string;
    }>();

    const originalServiceId = Number(id_service);

    const validServiceId =
        id_service !== undefined &&
        Number.isSafeInteger(originalServiceId) &&
        originalServiceId > 0;

    const [selectedServiceId, setSelectedServiceId] =
        useState(originalServiceId);

    const [service, setService] =
        useState<Service | null>(null);

    const [detailServices, setDetailServices] =
        useState<DetailServiceData[]>([]);

    const [branchData, setBranchData] =
        useState<BranchResponseData | null>(null);

    const [loading, setLoading] = useState(true);
    const [branchLoading, setBranchLoading] = useState(true);

    const [errorMessage, setErrorMessage] = useState("");
    const [detailError, setDetailError] = useState("");
    const [branchError, setBranchError] = useState("");

    useEffect(() => {
        setSelectedServiceId(originalServiceId);
        setBranchData(null);
    }, [originalServiceId]);

    useEffect(() => {
        const controller = new AbortController();

        const loadBranches = async () => {
            setBranchLoading(true);
            setBranchError("");
            setBranchData(null);

            if (!validServiceId) {
                setBranchLoading(false);
                return;
            }

            try {
                const result = await fetchApi<BranchResponseData>(
                    getBranchEndpoint(originalServiceId),
                    controller.signal,
                );

                if (controller.signal.aborted) return;

                if (
                    !result.origin ||
                    Number(result.origin.id_service) !==
                    originalServiceId
                ) {
                    throw new Error(
                        "Data cabang tidak sesuai dengan layanan.",
                    );
                }

                setBranchData({
                    origin: result.origin,
                    branches: Array.isArray(result.branches)
                        ? result.branches.filter(
                            (branch) =>
                                Number(branch.id_service) > 0 &&
                                Number(branch.id_service) !==
                                originalServiceId,
                        )
                        : [],
                });
            } catch (error) {
                if (controller.signal.aborted) return;

                setBranchError(
                    error instanceof Error
                        ? error.message
                        : "Gagal mengambil daftar cabang.",
                );
            } finally {
                if (!controller.signal.aborted) {
                    setBranchLoading(false);
                }
            }
        };

        void loadBranches();

        return () => controller.abort();
    }, [originalServiceId, validServiceId]);

    useEffect(() => {
        const controller = new AbortController();

        const loadSelectedService = async () => {
            setLoading(true);
            setErrorMessage("");
            setDetailError("");
            setService(null);
            setDetailServices([]);

            if (
                !validServiceId ||
                !Number.isSafeInteger(selectedServiceId) ||
                selectedServiceId <= 0
            ) {
                setErrorMessage("ID layanan tidak valid.");
                setLoading(false);
                return;
            }

            try {
                const serviceData = await fetchApi<
                    Service | Service[]
                >(
                    `/service/${selectedServiceId}`,
                    controller.signal,
                );

                if (controller.signal.aborted) return;

                const selected = getFirstItem(serviceData);

                if (
                    !selected ||
                    Number(selected.id_service) !==
                    selectedServiceId
                ) {
                    throw new Error(
                        "Layanan dari cabang yang dipilih tidak ditemukan.",
                    );
                }

                setService(selected);

                // Detail tambahan tidak menggagalkan
                // keseluruhan halaman.
                try {
                    const detailData = await fetchApi<
                        DetailServiceData | DetailServiceData[]
                    >(
                        `/detail-service/service/${selectedServiceId}`,
                        controller.signal,
                    );

                    if (controller.signal.aborted) return;

                    const details = Array.isArray(detailData)
                        ? detailData
                        : [detailData];

                    setDetailServices(
                        details.filter(
                            (detail) =>
                                Number(detail.id_service) ===
                                selectedServiceId,
                        ),
                    );
                } catch (error) {
                    if (controller.signal.aborted) return;

                    setDetailError(
                        error instanceof Error
                            ? error.message
                            : "Informasi tambahan belum tersedia.",
                    );
                }
            } catch (error) {
                if (controller.signal.aborted) return;

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Gagal memuat layanan.",
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        void loadSelectedService();

        return () => controller.abort();
    }, [selectedServiceId, validServiceId]);

    const branches: BranchService[] = branchData
        ? [
            {
                id_service: branchData.origin.id_service,
                name_service: branchData.origin.name_service,
                id_provider: branchData.origin.id_provider,
                name_provider:
                    branchData.origin.name_provider,
                id_provider_group:
                    branchData.origin.id_provider_group,
            },
            ...branchData.branches,
        ]
        : [];

    // Deduplicate branch services by ID.
    const uniqueBranches = branches.filter(
        (branch, index, array) =>
            array.findIndex(
                (item) =>
                    Number(item.id_service) ===
                    Number(branch.id_service),
            ) === index,
    );

    const selectedBranch = uniqueBranches.find(
        (branch) =>
            Number(branch.id_service) === selectedServiceId,
    );

    // Provider information is obtained from the
    // selected service and branch metadata.
    const currentProviderName =
        selectedBranch?.name_provider ||
        service?.name_provider ||
        "Provider kesehatan";

    const currentBranchAddress = selectedBranch
        ? formatBranchAddress(selectedBranch)
        : "";

    const getUniqueItems = (
        field:
            | "benefits"
            | "included_services"
            | "terms_and_conditions",
    ): string[] => [
            ...new Set(
                detailServices.flatMap((detail) =>
                    parseList(detail[field]),
                ),
            ),
        ];

    const benefits = getUniqueItems("benefits");

    const includedServices =
        getUniqueItems("included_services");

    const termsAndConditions =
        getUniqueItems("terms_and_conditions");

    const locations = [
        ...new Set(
            detailServices.flatMap((detail) =>
                parseList(detail.location),
            ),
        ),
    ];

    const hours = [
        ...new Set(
            detailServices.flatMap((detail) =>
                parseList(detail.hour),
            ),
        ),
    ];

    const quota = Number(service?.quota_service ?? 0);

    const isActive =
        service?.status_service === "ACTIVE";

    const hasQuota =
        Number.isFinite(quota) && quota > 0;

    const canBook =
        Boolean(service) &&
        isActive &&
        hasQuota &&
        !loading;

    const handleSelectBranch = (branch: BranchService) => {
        const branchServiceId = Number(branch.id_service);

        if (
            !Number.isSafeInteger(branchServiceId) ||
            branchServiceId <= 0 ||
            branchServiceId === selectedServiceId
        ) {
            return;
        }

        setSelectedServiceId(branchServiceId);
        setErrorMessage("");
        setDetailError("");
    };

    const handleBooking = () => {
        if (!service || !canBook) return;

        const bookingPath =
            `/customer/booking/${service.id_service}`;

        const token = sessionStorage.getItem(
            "customer_token",
        );

        if (!token || isTokenExpired(token)) {
            sessionStorage.removeItem("customer_token");
            localStorage.removeItem("customer_data");

            navigate(
                `/customer/sign-in?redirect=${encodeURIComponent(
                    bookingPath,
                )}`,
            );

            return;
        }

        navigate(bookingPath);
    };

    if (!validServiceId) {
        return (
            <div className="flex min-h-[65vh] flex-col items-center justify-center bg-slate-50 px-5 text-center">
                <AlertCircle
                    size={44}
                    className="text-red-400"
                />
                <p className="mt-4 font-semibold text-slate-800">
                    ID layanan tidak valid.
                </p>
                <button
                    type="button"
                    onClick={() => navigate("/customer/home")}
                    className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
                >
                    Kembali ke Beranda
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-44 text-slate-900">
            <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
                {/* BACK BUTTON */}
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="mb-5 flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-600"
                >
                    <ArrowLeft size={18} />
                    Kembali
                </button>

                <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
                    {/* IMAGE */}
                    <div className="relative h-56 overflow-hidden bg-blue-50 sm:h-80">
                        {service?.image_service ? (
                            <img
                                src={service.image_service}
                                alt={service.name_service}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm font-medium text-blue-500">
                                Foto layanan dari provider
                            </div>
                        )}

                        {service && !loading && (
                            <div className="absolute bottom-4 left-4">
                                <span
                                    className={`rounded-full px-4 py-2 text-xs font-bold shadow-sm ${canBook
                                        ? "bg-emerald-500 text-white"
                                        : "bg-red-500 text-white"
                                        }`}
                                >
                                    {canBook
                                        ? "Layanan Tersedia"
                                        : "Tidak Tersedia"}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* MAIN INFORMATION */}
                    <div className="p-5 sm:p-8">
                        {loading ? (
                            <div className="flex items-center gap-3 py-7">
                                <Loader2
                                    size={24}
                                    className="animate-spin text-blue-600"
                                />
                                <p className="text-sm text-slate-500">
                                    Memuat layanan cabang...
                                </p>
                            </div>
                        ) : errorMessage || !service ? (
                            <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                                <p className="text-sm text-red-700">
                                    {errorMessage ||
                                        "Data layanan tidak tersedia."}
                                </p>

                                {selectedServiceId !==
                                    originalServiceId && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSelectedServiceId(
                                                    originalServiceId,
                                                )
                                            }
                                            className="mt-3 cursor-pointer text-sm font-semibold text-blue-600 underline"
                                        >
                                            Kembali ke cabang awal
                                        </button>
                                    )}
                            </div>
                        ) : (
                            <>
                                {/* PROVIDER */}
                                <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                                    <Building2 size={17} />

                                    <span>{currentProviderName}</span>
                                </div>

                                {/* SERVICE NAME */}
                                <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
                                    {service.name_service}
                                </h1>

                                {/* PRICE UNDER TITLE, AS IN REFERENCE */}
                                <div className="mt-3 flex flex-wrap items-center gap-3">
                                    <p className="text-2xl font-bold text-blue-700">
                                        {formatRupiah(
                                            service.price_service,
                                        )}
                                    </p>

                                    {hasQuota && (
                                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                            Kuota tersedia: {quota}
                                        </span>
                                    )}
                                </div>

                                {/* CURRENT BRANCH ADDRESS */}
                                {currentBranchAddress && (
                                    <div className="mt-3 flex items-start gap-2 text-xs text-slate-500">
                                        <MapPin
                                            size={15}
                                            className="mt-0.5 shrink-0 text-blue-600"
                                        />
                                        <span>{currentBranchAddress}</span>
                                    </div>
                                )}

                                {/* DESCRIPTION */}
                                <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-600">
                                    {service.description_service ||
                                        "Deskripsi layanan belum tersedia."}
                                </p>
                            </>
                        )}
                    </div>
                </section>

                <section className="mt-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-4">
                        <h2 className="text-lg font-bold text-slate-900">
                            Pilih Cabang
                        </h2>

                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                            Pilih lokasi provider yang menyediakan
                            layanan yang sama.
                        </p>
                    </div>

                    {branchLoading ? (
                        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
                            <Loader2
                                size={18}
                                className="animate-spin text-blue-600"
                            />

                            <span className="text-sm text-slate-500">
                                Memuat daftar cabang...
                            </span>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {uniqueBranches.length > 0 ? (
                                uniqueBranches.map((branch) => {
                                    const selected =
                                        Number(branch.id_service) ===
                                        selectedServiceId;

                                    const address =
                                        formatBranchAddress(branch);

                                    return (
                                        <button
                                            key={branch.id_service}
                                            type="button"
                                            onClick={() =>
                                                handleSelectBranch(branch)
                                            }
                                            aria-pressed={selected}
                                            className={`flex w-full cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-4 text-left transition ${selected
                                                ? "border-blue-600 bg-blue-50"
                                                : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
                                                }`}
                                        >
                                            {/* RADIO */}
                                            <span
                                                className={`mt-1 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border-2 ${selected
                                                    ? "border-blue-600"
                                                    : "border-slate-300"
                                                    }`}
                                            >
                                                {selected && (
                                                    <span className="h-2 w-2 rounded-full bg-blue-600" />
                                                )}
                                            </span>

                                            {/* BRANCH INFO */}
                                            <div className="min-w-0 flex-1">
                                                <p
                                                    className={`text-sm font-bold ${selected
                                                        ? "text-blue-800"
                                                        : "text-slate-800"
                                                        }`}
                                                >
                                                    {branch.name_provider}
                                                </p>

                                                {address && (
                                                    <p className="mt-1 flex items-start gap-1 text-xs leading-5 text-slate-500">
                                                        <MapPin
                                                            size={13}
                                                            className="mt-0.5 shrink-0"
                                                        />
                                                        <span>{address}</span>
                                                    </p>
                                                )}

                                                {branch.price_service !==
                                                    undefined && (
                                                        <p className="mt-2 text-xs font-semibold text-blue-600">
                                                            {formatRupiah(
                                                                branch.price_service,
                                                            )}
                                                        </p>
                                                    )}
                                            </div>

                                            {selected && (
                                                <CheckCircle2
                                                    size={18}
                                                    className="mt-0.5 shrink-0 text-blue-600"
                                                />
                                            )}
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                                    {service
                                        ? currentProviderName
                                        : "Cabang belum tersedia."}
                                    <p className="mt-1 text-xs">
                                        Belum ada cabang alternatif untuk
                                        layanan ini.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {branchError && (
                        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3">
                            <AlertCircle
                                size={16}
                                className="mt-0.5 shrink-0 text-amber-600"
                            />
                            <p className="text-xs text-amber-800">
                                Daftar cabang belum dapat dimuat:{" "}
                                {branchError}
                            </p>
                        </div>
                    )}

                    {uniqueBranches.length > 1 && (
                        <div className="mt-4 flex items-start gap-2 rounded-xl bg-blue-50 p-3">
                            <InfoIcon />
                            <p className="text-xs leading-5 text-blue-800">
                                Harga dan kuota dapat berbeda pada
                                setiap cabang. Pilihan cabang akan
                                menentukan layanan yang dipesan.
                            </p>
                        </div>
                    )}
                </section>

                {!loading && service && (
                    <div className="mt-5 grid gap-5 lg:grid-cols-2">
                        {/* BENEFITS */}
                        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                                <ShieldCheck
                                    size={20}
                                    className="text-blue-600"
                                />
                                Manfaat Layanan
                            </h2>

                            {benefits.length > 0 ? (
                                <ul className="mt-4 space-y-3">
                                    {benefits.map((benefit) => (
                                        <li
                                            key={benefit}
                                            className="flex items-start gap-3 text-sm text-slate-600"
                                        >
                                            <CheckCircle2
                                                size={18}
                                                className="mt-0.5 shrink-0 text-emerald-500"
                                            />
                                            <span>{benefit}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="mt-3 text-sm text-slate-500">
                                    Informasi manfaat belum tersedia.
                                </p>
                            )}
                        </section>

                        {/* INCLUDED SERVICES */}
                        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                                <CheckCircle2
                                    size={20}
                                    className="text-blue-600"
                                />
                                Termasuk dalam Layanan
                            </h2>

                            {includedServices.length > 0 ? (
                                <ul className="mt-4 space-y-3">
                                    {includedServices.map((item) => (
                                        <li
                                            key={item}
                                            className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"
                                        >
                                            <CheckCircle2
                                                size={18}
                                                className="shrink-0 text-emerald-500"
                                            />
                                            <span className="text-sm text-slate-700">
                                                {item}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="mt-3 text-sm text-slate-500">
                                    Rincian layanan belum tersedia.
                                </p>
                            )}
                        </section>

                        {/* LOCATION & HOURS */}
                        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                                <MapPin
                                    size={20}
                                    className="text-blue-600"
                                />
                                Lokasi & Jam Operasional
                            </h2>

                            <div className="mt-4 space-y-4">
                                {currentBranchAddress && (
                                    <div className="flex items-start gap-3">
                                        <MapPin
                                            size={18}
                                            className="mt-0.5 shrink-0 text-blue-600"
                                        />
                                        <div>
                                            <p className="text-xs text-slate-400">
                                                Alamat Provider
                                            </p>
                                            <p className="mt-1 text-sm font-medium text-slate-700">
                                                {currentBranchAddress}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {locations.map((location) => (
                                    <div
                                        key={location}
                                        className="flex items-start gap-3"
                                    >
                                        <MapPin
                                            size={18}
                                            className="mt-0.5 shrink-0 text-blue-600"
                                        />
                                        <div>
                                            <p className="text-xs text-slate-400">
                                                Lokasi Pelayanan
                                            </p>
                                            <p className="mt-1 text-sm font-medium text-slate-700">
                                                {location}
                                            </p>
                                        </div>
                                    </div>
                                ))}

                                {hours.map((hour) => (
                                    <div
                                        key={hour}
                                        className="flex items-start gap-3"
                                    >
                                        <Clock3
                                            size={18}
                                            className="mt-0.5 shrink-0 text-blue-600"
                                        />
                                        <div>
                                            <p className="text-xs text-slate-400">
                                                Jam Operasional
                                            </p>
                                            <p className="mt-1 text-sm font-medium text-slate-700">
                                                {hour}
                                            </p>
                                        </div>
                                    </div>
                                ))}

                                {!currentBranchAddress &&
                                    locations.length === 0 &&
                                    hours.length === 0 && (
                                        <p className="text-sm text-slate-500">
                                            Informasi lokasi dan jam operasional
                                            belum tersedia.
                                        </p>
                                    )}

                                {service.maps_service &&
                                    /^https?:\/\//i.test(
                                        service.maps_service,
                                    ) && (
                                        <a
                                            href={service.maps_service}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-600 transition hover:bg-blue-100"
                                        >
                                            Lihat Lokasi di Maps
                                            <ChevronRight size={18} />
                                        </a>
                                    )}
                            </div>
                        </section>

                        {/* TERMS */}
                        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                                <FileText
                                    size={20}
                                    className="text-blue-600"
                                />
                                Syarat & Ketentuan
                            </h2>

                            {termsAndConditions.length > 0 ? (
                                <ol className="mt-4 space-y-3">
                                    {termsAndConditions.map(
                                        (term, index) => (
                                            <li
                                                key={`${term}-${index}`}
                                                className="flex items-start gap-3 text-sm text-slate-600"
                                            >
                                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
                                                    {index + 1}
                                                </span>
                                                <span>{term}</span>
                                            </li>
                                        ),
                                    )}
                                </ol>
                            ) : (
                                <p className="mt-3 text-sm text-slate-500">
                                    Belum ada ketentuan tambahan.
                                </p>
                            )}
                        </section>

                        {detailError && (
                            <div className="lg:col-span-2 flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
                                <AlertCircle
                                    size={18}
                                    className="shrink-0 text-amber-600"
                                />
                                <p className="text-sm text-amber-800">
                                    Informasi tambahan: {detailError}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] left-1/2 z-40 w-full max-w-130 -translate-x-1/2 border-t border-slate-100 bg-white px-5 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <div className="flex items-center justify-between gap-3">
                    {/* PRICE */}
                    <div className="min-w-0">
                        <p className="text-xs text-slate-500">
                            Total Harga
                        </p>

                        <p className="text-lg font-bold text-blue-600 sm:text-xl">
                            {service
                                ? formatRupiah(
                                    service.price_service,
                                )
                                : "-"}
                        </p>
                    </div>

                    {/* BOOKING BUTTON */}
                    <button
                        type="button"
                        onClick={handleBooking}
                        disabled={!canBook}
                        className={`flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition sm:px-7 ${canBook
                            ? "cursor-pointer bg-blue-600 text-white shadow-md shadow-blue-100 hover:bg-blue-700"
                            : "cursor-not-allowed bg-slate-200 text-slate-400"
                            }`}
                    >
                        <CalendarDays size={17} />
                        {canBook
                            ? "Booking Sekarang"
                            : loading
                                ? "Memuat..."
                                : "Tidak Tersedia"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Small internal icon to avoid extra dependencies.
const InfoIcon = () => (
    <AlertCircle
        size={17}
        className="mt-0.5 shrink-0 text-blue-600"
    />
);

export default DetailService;
