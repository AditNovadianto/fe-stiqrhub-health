
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
    MapPin,
    Clock3,
    CheckCircle2,
    ShieldCheck,
    Building2,
    CalendarDays,
    Users,
    FileText,
    AlertCircle,
    Loader2,
    ChevronRight,
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
    name_service?: string;
    id_provider?: number;
}

interface ApiResponse<T> {
    success: boolean;
    data: T | T[];
    message?: string;
}

const formatRupiah = (
    value: string | number
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

// Mengubah string comma-separated menjadi array
const parseList = (
    value?: string | null
): string[] => {
    if (!value) return [];

    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
};

// Mendukung response object maupun array
const getFirstItem = <T,>(
    data: T | T[] | null | undefined
): T | null => {
    if (data == null) return null;

    if (Array.isArray(data)) {
        return data[0] ?? null;
    }

    return data;
};

// Generic API request
const fetchApi = async <T,>(
    endpoint: string,
    signal: AbortSignal
): Promise<T | T[]> => {
    const response = await fetch(
        `${import.meta.env.VITE_API_URI}${endpoint}`,
        {
            method: "GET",
            headers: {
                Accept: "application/json",
            },
            signal,
        }
    );

    const result =
        (await response.json()) as ApiResponse<T>;

    if (!response.ok || !result.success) {
        throw new Error(
            result.message ||
            `Request gagal (${response.status})`
        );
    }

    if (result.data == null) {
        throw new Error("Data tidak tersedia.");
    }

    return result.data;
};

const DetailService = () => {
    const navigate = useNavigate();

    const { id_service } = useParams<{
        id_service: string;
    }>();

    const serviceId = Number(id_service);

    const validServiceId =
        id_service !== undefined &&
        Number.isSafeInteger(serviceId) &&
        serviceId > 0;

    const [service, setService] =
        useState<Service | null>(null);

    const [detailServices, setDetailServices] =
        useState<DetailServiceData[]>([]);

    const [loading, setLoading] = useState(true);

    const [errorMessage, setErrorMessage] =
        useState("");

    const [detailError, setDetailError] =
        useState("");

    useEffect(() => {
        const controller = new AbortController();

        const fetchServiceDetail = async () => {
            setLoading(true);
            setErrorMessage("");
            setDetailError("");
            setService(null);
            setDetailServices([]);

            if (!validServiceId) {
                setErrorMessage(
                    "ID layanan tidak valid."
                );
                setLoading(false);
                return;
            }

            try {
                const serviceData =
                    await fetchApi<Service>(
                        `/service/${serviceId}`,
                        controller.signal
                    );

                if (controller.signal.aborted) return;

                const selectedService =
                    getFirstItem(serviceData);

                if (!selectedService) {
                    throw new Error(
                        "Layanan tidak ditemukan."
                    );
                }

                if (
                    Number(selectedService.id_service) !==
                    serviceId
                ) {
                    throw new Error(
                        "Data layanan tidak sesuai."
                    );
                }

                setService(selectedService);

                try {
                    const detailData =
                        await fetchApi<DetailServiceData>(
                            `/detail-service/service/${serviceId}`,
                            controller.signal
                        );

                    if (controller.signal.aborted) return;

                    const details =
                        Array.isArray(detailData)
                            ? detailData
                            : [detailData];

                    const matchingDetails =
                        details.filter(
                            (detail) =>
                                Number(detail.id_service) ===
                                serviceId
                        );

                    setDetailServices(matchingDetails);
                } catch (error) {
                    if (controller.signal.aborted) return;

                    console.error(
                        "[DETAIL SERVICE ERROR]",
                        error
                    );

                    setDetailError(
                        error instanceof Error
                            ? error.message
                            : "Informasi tambahan layanan belum tersedia."
                    );
                }
            } catch (error) {
                if (controller.signal.aborted) return;

                console.error(
                    "[SERVICE ERROR]",
                    error
                );

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Gagal mengambil layanan."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        void fetchServiceDetail();

        return () => {
            controller.abort();
        };
    }, [serviceId, validServiceId]);

    const benefits = [
        ...new Set(
            detailServices.flatMap((detail) =>
                parseList(detail.benefits)
            )
        ),
    ];

    const includedServices = [
        ...new Set(
            detailServices.flatMap((detail) =>
                parseList(detail.included_services)
            )
        ),
    ];

    const termsAndConditions = [
        ...new Set(
            detailServices.flatMap((detail) =>
                parseList(
                    detail.terms_and_conditions
                )
            )
        ),
    ];

    const locations = [
        ...new Set(
            detailServices
                .map((detail) =>
                    detail.location?.trim()
                )
                .filter(
                    (value): value is string =>
                        Boolean(value)
                )
        ),
    ];

    const hours = [
        ...new Set(
            detailServices
                .map((detail) =>
                    detail.hour?.trim()
                )
                .filter(
                    (value): value is string =>
                        Boolean(value)
                )
        ),
    ];

    const quota = Number(
        service?.quota_service ?? 0
    );

    const isActive =
        service?.status_service === "ACTIVE";

    const hasQuota =
        Number.isFinite(quota) &&
        quota > 0;

    const canBook =
        isActive && hasQuota;

    const handleBooking = () => {
        if (!service || !canBook) return;

        const token =
            sessionStorage.getItem(
                "customer_token"
            );

        // Route booking disiapkan untuk integrasi order.
        const bookingPath =
            `/customer/booking/${service.id_service}`;

        if (
            !token ||
            isTokenExpired(token)
        ) {
            sessionStorage.removeItem(
                "customer_token"
            );

            localStorage.removeItem(
                "customer_data"
            );

            navigate(
                `/customer/sign-in?redirect=${encodeURIComponent(
                    bookingPath
                )}`
            );

            return;
        }

        navigate(bookingPath);
    };

    if (loading) {
        return (
            <div className="flex min-h-[65vh] flex-col items-center justify-center gap-4 bg-white px-5">
                <Loader2
                    size={34}
                    className="animate-spin text-blue-600"
                />

                <p className="text-sm text-slate-500">
                    Memuat detail layanan...
                </p>
            </div>
        );
    }

    if (errorMessage || !service) {
        return (
            <div className="flex min-h-[65vh] flex-col items-center justify-center px-5 text-center">
                <AlertCircle
                    size={48}
                    className="text-red-400"
                />

                <h2 className="mt-4 text-lg font-bold text-slate-800">
                    Layanan Tidak Ditemukan
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                    {errorMessage ||
                        "Layanan yang Anda cari tidak tersedia."}
                </p>

                <button
                    type="button"
                    onClick={() =>
                        navigate("/customer/home")
                    }
                    className="cursor-pointer mt-6 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                    Kembali ke Beranda
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-[60vh] bg-slate-50 pb-40">
            <section className="bg-white">
                <div className="relative h-64 w-full overflow-hidden bg-slate-100 sm:h-80">
                    {service.image_service ? (
                        <img
                            src={
                                service.image_service
                            }
                            alt={
                                service.name_service
                            }
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center text-6xl">
                            🏥
                        </div>
                    )}

                    {/* STATUS BADGE */}
                    <div className="absolute bottom-4 left-5">
                        <span
                            className={`rounded-full px-4 py-2 text-xs font-bold shadow-sm ${isActive
                                ? "bg-emerald-500 text-white"
                                : "bg-red-500 text-white"
                                }`}
                        >
                            {isActive
                                ? "Layanan Aktif"
                                : "Tidak Tersedia"}
                        </span>
                    </div>
                </div>

                <div className="px-5 py-6">
                    <h2 className="text-2xl font-extrabold leading-tight text-slate-900">
                        {service.name_service}
                    </h2>

                    {/* PROVIDER */}
                    {service.name_provider && (
                        <div className="mt-3 flex items-center gap-2 text-sm font-medium text-blue-600">
                            <Building2 size={17} />

                            <span>
                                {
                                    service.name_provider
                                }
                            </span>
                        </div>
                    )}

                    {/* PRICE */}
                    <div className="mt-5 rounded-2xl bg-blue-50 p-4">
                        <p className="text-xs font-medium text-blue-500">
                            Harga Layanan
                        </p>

                        <p className="mt-1 text-2xl font-extrabold text-blue-700">
                            {formatRupiah(
                                service.price_service
                            )}
                        </p>
                    </div>

                    {/* SERVICE META */}
                    <div className="mt-5 grid grid-cols-2 gap-3">
                        {/* QUOTA */}
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                                <Users size={20} />
                            </div>

                            <div>
                                <p className="text-[11px] text-slate-500">
                                    Kuota
                                </p>

                                <p className="text-sm font-bold text-slate-800">
                                    {
                                        service.quota_service
                                    }
                                </p>
                            </div>
                        </div>

                        {/* STATUS */}
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <CalendarDays
                                    size={20}
                                />
                            </div>

                            <div>
                                <p className="text-[11px] text-slate-500">
                                    Status
                                </p>

                                <p className="text-sm font-bold text-slate-800">
                                    {isActive
                                        ? "Tersedia"
                                        : "Tidak Aktif"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mt-3 bg-white px-5 py-6">
                <h3 className="text-lg font-extrabold text-slate-900">
                    Tentang Layanan
                </h3>

                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">
                    {service.description_service ||
                        "Belum ada deskripsi untuk layanan ini."}
                </p>
            </section>

            {benefits.length > 0 && (
                <section className="mt-3 bg-white px-5 py-6">
                    <div className="flex items-center gap-2">
                        <ShieldCheck
                            size={21}
                            className="text-blue-600"
                        />

                        <h3 className="text-lg font-extrabold text-slate-900">
                            Manfaat Layanan
                        </h3>
                    </div>

                    <div className="mt-5 space-y-4">
                        {benefits.map(
                            (benefit, index) => (
                                <div
                                    key={`${benefit}-${index}`}
                                    className="flex items-start gap-3"
                                >
                                    <CheckCircle2
                                        size={19}
                                        className="mt-0.5 shrink-0 text-emerald-500"
                                    />

                                    <p className="text-sm leading-6 text-slate-600">
                                        {benefit}
                                    </p>
                                </div>
                            )
                        )}
                    </div>
                </section>
            )}

            {includedServices.length > 0 && (
                <section className="mt-3 bg-white px-5 py-6">
                    <div className="flex items-center gap-2">
                        <CheckCircle2
                            size={21}
                            className="text-blue-600"
                        />

                        <h3 className="text-lg font-extrabold text-slate-900">
                            Termasuk dalam Layanan
                        </h3>
                    </div>

                    <div className="mt-5 space-y-3">
                        {includedServices.map(
                            (included, index) => (
                                <div
                                    key={`${included}-${index}`}
                                    className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"
                                >
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                        <CheckCircle2
                                            size={17}
                                        />
                                    </div>

                                    <p className="text-sm font-medium text-slate-700">
                                        {included}
                                    </p>
                                </div>
                            )
                        )}
                    </div>
                </section>
            )}

            {(locations.length > 0 ||
                hours.length > 0 ||
                Boolean(service.maps_service)) && (
                    <section className="mt-3 bg-white px-5 py-6">
                        <h3 className="text-lg font-extrabold text-slate-900">
                            Lokasi & Jam Operasional
                        </h3>

                        <div className="mt-5 space-y-5">
                            {/* LOCATIONS */}
                            {locations.map(
                                (location, index) => (
                                    <div
                                        key={`${location}-${index}`}
                                        className="flex items-start gap-3"
                                    >
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                            <MapPin
                                                size={21}
                                            />
                                        </div>

                                        <div className="pt-1">
                                            <p className="text-xs font-medium text-slate-400">
                                                Lokasi Pelayanan
                                            </p>

                                            <p className="mt-1 text-sm font-semibold text-slate-800">
                                                {
                                                    location
                                                }
                                            </p>
                                        </div>
                                    </div>
                                )
                            )}

                            {/* OPERATIONAL HOURS */}
                            {hours.map(
                                (hour, index) => (
                                    <div
                                        key={`${hour}-${index}`}
                                        className="flex items-start gap-3"
                                    >
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                                            <Clock3
                                                size={21}
                                            />
                                        </div>

                                        <div className="pt-1">
                                            <p className="text-xs font-medium text-slate-400">
                                                Jam Operasional
                                            </p>

                                            <p className="mt-1 text-sm font-semibold text-slate-800">
                                                {
                                                    hour
                                                }
                                            </p>
                                        </div>
                                    </div>
                                )
                            )}

                            {/* GOOGLE MAPS */}
                            {service.maps_service &&
                                /^https?:\/\//i.test(
                                    service.maps_service
                                ) && (
                                    <a
                                        href={
                                            service.maps_service
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-600 transition hover:bg-blue-100"
                                    >
                                        <span className="flex items-center gap-2">
                                            <MapPin
                                                size={18}
                                            />

                                            Lihat Lokasi di Maps
                                        </span>

                                        <ChevronRight
                                            size={18}
                                        />
                                    </a>
                                )}
                        </div>
                    </section>
                )}

            {termsAndConditions.length > 0 && (
                <section className="mt-3 bg-white px-5 py-6">
                    <div className="flex items-center gap-2">
                        <FileText
                            size={21}
                            className="text-blue-600"
                        />

                        <h3 className="text-lg font-extrabold text-slate-900">
                            Syarat & Ketentuan
                        </h3>
                    </div>

                    <div className="mt-5 space-y-4">
                        {termsAndConditions.map(
                            (term, index) => (
                                <div
                                    key={`${term}-${index}`}
                                    className="flex items-start gap-3"
                                >
                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
                                        {index + 1}
                                    </div>

                                    <p className="text-sm leading-6 text-slate-600">
                                        {term}
                                    </p>
                                </div>
                            )
                        )}
                    </div>
                </section>
            )}

            {detailError && (
                <div className="mx-5 mt-4 flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
                    <AlertCircle
                        size={19}
                        className="shrink-0"
                    />

                    <p>
                        {detailError}
                    </p>
                </div>
            )}

            <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] left-1/2 z-40 w-full max-w-130 -translate-x-1/2 border-t border-slate-100 bg-white px-5 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <div className="flex items-center justify-between gap-4">
                    {/* PRICE SUMMARY */}
                    <div className="min-w-0">
                        <p className="text-xs text-slate-500">
                            Total Harga
                        </p>

                        <p className="text-lg font-extrabold text-blue-600 sm:text-xl">
                            {formatRupiah(
                                service.price_service
                            )}
                        </p>
                    </div>

                    {/* BOOKING BUTTON */}
                    <button
                        type="button"
                        onClick={handleBooking}
                        disabled={!canBook}
                        className={`cursor-pointer flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition sm:px-8 ${canBook
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700"
                            : "cursor-not-allowed bg-slate-200 text-slate-400"
                            }`}
                    >
                        <CalendarDays
                            size={18}
                        />

                        {canBook
                            ? "Booking Sekarang"
                            : "Tidak Tersedia"}

                        {canBook && (
                            <ChevronRight
                                size={17}
                            />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DetailService;
